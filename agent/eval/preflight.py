"""Preflight checks for AWS credentials and Amazon Bedrock model access (llm-agent-eval)."""

from __future__ import annotations

import os
import sys
from typing import Any


class PreflightError(RuntimeError):
    """Structured setup error with actionable recovery instruction."""

    def __init__(self, code: str, instruction: str) -> None:
        super().__init__(f"{code}: {instruction}")
        self.code = code
        self.instruction = instruction


_MESSAGES = {
    "PROFILE_MISSING": (
        "ProfileNotFound: Create profile `haunted-audit` in ~/.aws/config "
        "(SSO: `aws configure sso --profile haunted-audit`, then `aws sso login --profile haunted-audit`; "
        "or access keys: `aws configure --profile haunted-audit`, region `us-east-1`)."
    ),
    "TOKEN_EXPIRED": (
        "ExpiredToken / UnauthorizedSSOTokenError: Run `aws sso login --profile haunted-audit`."
    ),
    "NO_INVOKE_PERMISSION": (
        "AccessDeniedException on Converse: Attach an IAM policy allowing `bedrock:InvokeModel` "
        "and `bedrock:InvokeModelWithResponseStream` on the inference profile and the foundation model "
        "in `us-east-1`, `us-east-2`, `us-west-2` (the US cross-region profile routes across them)."
    ),
    "MARKETPLACE_SUBSCRIPTION": (
        "AccessDeniedException (AWS Marketplace): Let the identity create the Marketplace subscription "
        "on first call (`aws-marketplace:ViewSubscriptions`, `aws-marketplace:Subscribe`), "
        "or have an administrator invoke the model once in the console to activate it."
    ),
    "ANTHROPIC_USE_CASE": (
        "AccessDeniedException (Anthropic use case details): In the Bedrock console (`us-east-1`) "
        "submit the Anthropic first-time use case form, then wait for access to show as granted."
    ),
    "BAD_MODEL_ID": (
        "ValidationException / ResourceNotFoundException: Confirm `BEDROCK_MODEL_ID` in the model catalog "
        "or run `aws bedrock list-inference-profiles --region us-east-1`."
    ),
    "THROTTLED": (
        "ThrottlingException during preflight: Retry later; do not score."
    ),
}


def _boto_session(profile: str | None, region: str):
    import boto3
    from botocore.exceptions import ProfileNotFound

    try:
        return boto3.Session(profile_name=profile, region_name=region) if profile else boto3.Session(region_name=region)
    except ProfileNotFound as exc:
        raise PreflightError("PROFILE_MISSING", _MESSAGES["PROFILE_MISSING"]) from exc


def _classify_botocore_error(exc: Exception) -> PreflightError:
    err_code = ""
    response = getattr(exc, "response", None)
    if isinstance(response, dict):
        err_code = str((response.get("Error") or {}).get("Code") or "")
    msg = str(exc)
    low = msg.lower()
    code_low = err_code.lower()

    if "profilenotfound" in type(exc).__name__.lower() or "could not be found" in low:
        return PreflightError("PROFILE_MISSING", _MESSAGES["PROFILE_MISSING"])
    if (
        "expiredtoken" in code_low
        or "unauthorizedssotoken" in type(exc).__name__.lower()
        or "token" in low and ("expired" in low or "sso" in low)
    ):
        return PreflightError("TOKEN_EXPIRED", _MESSAGES["TOKEN_EXPIRED"])
    if "throttling" in code_low or "throttl" in low:
        return PreflightError("THROTTLED", _MESSAGES["THROTTLED"])
    if "validationexception" in code_low or "resourcenotfoundexception" in code_low or "model" in low and "invalid" in low:
        return PreflightError("BAD_MODEL_ID", _MESSAGES["BAD_MODEL_ID"])
    if "accessdenied" in code_low or "accessdenied" in low:
        if "marketplace" in low:
            return PreflightError("MARKETPLACE_SUBSCRIPTION", _MESSAGES["MARKETPLACE_SUBSCRIPTION"])
        if "use case" in low or "usecase" in low or "anthropic" in low:
            return PreflightError("ANTHROPIC_USE_CASE", _MESSAGES["ANTHROPIC_USE_CASE"])
        return PreflightError("NO_INVOKE_PERMISSION", _MESSAGES["NO_INVOKE_PERMISSION"])
    if "nocredentials" in type(exc).__name__.lower() or "unable to locate credentials" in low:
        return PreflightError("PROFILE_MISSING", _MESSAGES["PROFILE_MISSING"])
    return PreflightError("PREFLIGHT_ERROR", msg or "AWS Bedrock preflight failed.")


def _principal_type_from_arn(arn: str) -> str:
    if ":assumed-role/" in arn:
        return "assumed-role"
    if ":user/" in arn:
        return "iam-user"
    if ":root" in arn:
        return "root"
    return "iam-principal"


def check_credentials(
    profile: str | None = None,
    region: str | None = None,
    *,
    session: Any = None,
) -> dict[str, str]:
    """Verify AWS credentials via sts.get_caller_identity() and return account_id + principal_type."""
    resolved_region = region or os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION") or "us-east-1"
    resolved_profile = profile if profile is not None else (os.getenv("AWS_PROFILE") or None)
    try:
        sess = session if session is not None else _boto_session(resolved_profile, resolved_region)
        sts = sess.client("sts", region_name=resolved_region)
        ident = sts.get_caller_identity()
    except PreflightError:
        raise
    except Exception as exc:
        raise _classify_botocore_error(exc) from exc

    arn = str(ident.get("Arn") or "")
    return {
        "account_id": str(ident.get("Account") or ""),
        "principal_type": _principal_type_from_arn(arn),
        "arn": arn,
    }


def check_model_access(
    profile: str | None = None,
    region: str | None = None,
    model_id: str | None = None,
    *,
    session: Any = None,
) -> dict[str, Any]:
    """Run one tiny bedrock-runtime.converse check (maxTokens=5) and return measured usage."""
    resolved_region = region or os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION") or "us-east-1"
    resolved_profile = profile if profile is not None else (os.getenv("AWS_PROFILE") or None)
    resolved_model = model_id or os.getenv("BEDROCK_MODEL_ID") or "us.anthropic.claude-sonnet-4-6"
    sess = session if session is not None else _boto_session(resolved_profile, resolved_region)
    try:
        br = sess.client("bedrock-runtime", region_name=resolved_region)
        resp = br.converse(
            modelId=resolved_model,
            messages=[{"role": "user", "content": [{"text": "Reply ok."}]}],
            inferenceConfig={"maxTokens": 5, "temperature": 0.0},
        )
    except PreflightError:
        raise
    except Exception as exc:
        raise _classify_botocore_error(exc) from exc

    usage = resp.get("usage") or {}
    in_tok = int(usage.get("inputTokens") or 0)
    out_tok = int(usage.get("outputTokens") or 0)
    tot_tok = int(usage.get("totalTokens") or (in_tok + out_tok))
    in_rate = float(os.getenv("BEDROCK_INPUT_USD_PER_MTOK", "3.0"))
    out_rate = float(os.getenv("BEDROCK_OUTPUT_USD_PER_MTOK", "15.0"))
    cost = round((in_tok * in_rate + out_tok * out_rate) / 1_000_000, 8)
    return {
        "model_id": resolved_model,
        "region": resolved_region,
        "input_tokens": in_tok,
        "output_tokens": out_tok,
        "total_tokens": tot_tok,
        "cost_usd": cost,
    }


def run_preflight(
    profile: str | None = None,
    region: str | None = None,
    model_id: str | None = None,
    *,
    session: Any = None,
) -> dict[str, Any]:
    if session is None:
        from agent.keyboard_agent.groq_client import chat_completion, groq_config, resolved_provider

        api_key, base_url, groq_model = groq_config()
        if resolved_provider() == "groq" and api_key:
            try:
                resp = chat_completion(
                    [{"role": "user", "content": "Reply ok."}],
                    api_key=api_key,
                    base_url=base_url,
                    model_id=model_id or groq_model,
                    temperature=0.0,
                    max_tokens=5,
                )
            except Exception as exc:
                raise PreflightError("GROQ_PREFLIGHT_ERROR", str(exc)) from exc
            usage = resp.get("usage") or {}
            return {
                "account_id": "groq-free-tier",
                "principal_type": "api-key",
                "model_id": model_id or groq_model,
                "region": "groq-cloud",
                "input_tokens": int(usage.get("prompt_tokens") or 0),
                "output_tokens": int(usage.get("completion_tokens") or 0),
                "total_tokens": int(usage.get("total_tokens") or 0),
                "cost_usd": 0.0,
            }

    ident = check_credentials(profile, region, session=session)
    model = check_model_access(profile, region, model_id, session=session)
    return {**ident, **model}


def main() -> int:
    try:
        out = run_preflight()
    except PreflightError as exc:
        print(exc.instruction, file=sys.stderr)
        return 2
    print(
        f"Preflight OK: account={out['account_id']} principal={out['principal_type']} "
        f"model={out['model_id']} tokens={out['total_tokens']} cost_usd={out['cost_usd']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
