"""Decide whether a public URL may be scanned.

Nothing in the API calls this yet because no scan route exists. Any future scan
route must call `check_url` first (agent/tests/test_scan_routes_use_guard.py).

On Fargate the task credential endpoint (169.254.170.2) is reachable from the
container, so an unguarded fetch could leak the task role's temporary keys.
"""

from __future__ import annotations

import ipaddress
import socket
from dataclasses import dataclass
from urllib.parse import urlsplit

ALLOWED_SCHEMES = {"http", "https"}
DEFAULT_PORTS = {"http": 80, "https": 443}
ALLOWED_PORTS = {80, 443}
BLOCKED_SUFFIXES = (".local", ".localhost", ".internal", ".lan", ".home", ".corp")
_CGNAT = ipaddress.ip_network("100.64.0.0/10")
EXPLICIT_DENY = {
    ipaddress.ip_address("169.254.169.254"),  # instance metadata
    ipaddress.ip_address("169.254.170.2"),  # ECS task credentials
}

MAX_REDIRECTS = 3
MAX_BODY_BYTES = 2_000_000
MAX_SECONDS = 20


class BlockedTarget(ValueError):
    """The URL is not allowed. `code` is stable; the message is for people."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass(frozen=True)
class ResolvedTarget:
    url: str
    scheme: str
    host: str
    port: int
    ip: str  # connect to this address, keep `host` for Host header and TLS name


def is_blocked_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped is not None:
        ip = ip.ipv4_mapped
    if ip in EXPLICIT_DENY:
        return True
    return bool(
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
        or (isinstance(ip, ipaddress.IPv4Address) and ip in _CGNAT)
    )


def _parse_numeric_host(host: str) -> ipaddress.IPv4Address | ipaddress.IPv6Address | None:
    """Understand tricky IPv4 spellings: 2130706433, 0x7f000001, 0177.0.0.1, 127.1."""
    try:
        return ipaddress.ip_address(host)
    except ValueError:
        pass
    try:
        packed = socket.inet_aton(host)  # accepts decimal, hex, octal and short forms
    except OSError:
        return None
    return ipaddress.IPv4Address(packed)


def check_url(url: str, *, resolve=socket.getaddrinfo) -> ResolvedTarget:
    """Raise BlockedTarget unless `url` is a public http(s) address."""
    if not isinstance(url, str) or not url.strip() or len(url) > 2048:
        raise BlockedTarget("bad_url", "Enter a full web address, like https://example.com.")
    try:
        parts = urlsplit(url.strip())
        port = parts.port
    except ValueError:
        raise BlockedTarget("bad_url", "That web address is not valid.") from None

    scheme = (parts.scheme or "").lower()
    if scheme not in ALLOWED_SCHEMES:
        raise BlockedTarget("bad_scheme", "Only http and https addresses can be scanned.")
    if parts.username is not None or parts.password is not None or "@" in (parts.netloc or ""):
        raise BlockedTarget("credentials_in_url", "Web addresses with a user name or password are not allowed.")
    host = (parts.hostname or "").strip().rstrip(".").lower()
    if not host:
        raise BlockedTarget("bad_url", "That web address has no site name.")
    if host == "localhost" or host.endswith(BLOCKED_SUFFIXES):
        raise BlockedTarget("private_name", "Local and internal site names cannot be scanned.")
    port = port or DEFAULT_PORTS[scheme]
    if port not in ALLOWED_PORTS:
        raise BlockedTarget("bad_port", "Only the standard web ports (80 and 443) can be scanned.")

    literal = _parse_numeric_host(host)
    if literal is not None:
        if is_blocked_ip(literal):
            raise BlockedTarget("private_address", "Private and local addresses cannot be scanned.")
        addresses = [literal]
    else:
        try:
            infos = resolve(host, port, type=socket.SOCK_STREAM)
        except OSError:
            raise BlockedTarget("unresolvable", "That site name could not be found.") from None
        addresses = []
        for info in infos:
            try:
                addresses.append(ipaddress.ip_address(info[4][0].split("%")[0]))
            except ValueError:
                continue
        if not addresses:
            raise BlockedTarget("unresolvable", "That site name could not be found.")
        # One private answer is enough to refuse: the fetcher could be handed that one.
        if any(is_blocked_ip(a) for a in addresses):
            raise BlockedTarget("private_address", "Private and local addresses cannot be scanned.")

    return ResolvedTarget(
        url=url.strip(), scheme=scheme, host=host, port=port, ip=str(addresses[0])
    )
