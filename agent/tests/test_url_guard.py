"""The scan guard blocks private, local and tricky addresses. No test touches real DNS."""
from __future__ import annotations

import pytest

from agent.api.url_guard import BlockedTarget, check_url, is_blocked_ip
import ipaddress


def fake_dns(mapping):
    def resolve(host, port, type=None):
        if host not in mapping:
            raise OSError("not found")
        return [(2, 1, 6, "", (ip, port)) for ip in mapping[host]]
    return resolve


PUBLIC = fake_dns({"example.com": ["93.184.216.34"], "www.example.com": ["93.184.216.34"]})


def test_public_site_passes_and_returns_the_address_to_connect_to() -> None:
    target = check_url("https://example.com/page?x=1", resolve=PUBLIC)
    assert target.ip == "93.184.216.34" and target.host == "example.com" and target.port == 443
    assert check_url("http://example.com", resolve=PUBLIC).port == 80
    assert check_url("https://example.com:443/", resolve=PUBLIC).port == 443


@pytest.mark.parametrize(
    "url",
    [
        "http://127.0.0.1/", "http://localhost/", "http://LOCALHOST./", "http://10.0.0.1/",
        "http://172.16.0.1/", "http://192.168.1.1/", "http://169.254.169.254/latest/meta-data/",
        "http://169.254.170.2/v2/credentials", "http://100.64.0.1/", "http://0.0.0.0/",
        "http://[::1]/", "http://[fe80::1]/", "http://[fc00::1]/", "http://[::ffff:127.0.0.1]/",
        "http://[::ffff:169.254.169.254]/", "http://224.0.0.1/", "http://240.0.0.1/",
        "http://2130706433/", "http://0x7f000001/", "http://0177.0.0.1/", "http://127.1/",
        "http://metadata.internal/", "http://printer.local/", "http://a.localhost/",
    ],
)
def test_private_and_local_targets_are_blocked(url) -> None:
    with pytest.raises(BlockedTarget) as err:
        check_url(url, resolve=PUBLIC)
    assert err.value.message  # plain-English reason for the visitor


@pytest.mark.parametrize(
    "url,code",
    [
        ("file:///etc/passwd", "bad_scheme"), ("ftp://example.com/", "bad_scheme"),
        ("gopher://example.com/", "bad_scheme"), ("javascript:alert(1)", "bad_scheme"),
        ("http://user:pw@example.com/", "credentials_in_url"),
        ("http://example.com@evil.example/", "credentials_in_url"),
        ("https://example.com:6379/", "bad_port"), ("http://example.com:22/", "bad_port"),
        ("", "bad_url"), ("   ", "bad_url"), ("http://", "bad_url"), ("https://" + "a" * 3000, "bad_url"),
    ],
)
def test_bad_shapes_are_blocked(url, code) -> None:
    with pytest.raises(BlockedTarget) as err:
        check_url(url, resolve=PUBLIC)
    assert err.value.code == code


def test_name_that_resolves_to_a_private_address_is_blocked() -> None:
    resolve = fake_dns({"sneaky.example": ["10.1.2.3"]})
    with pytest.raises(BlockedTarget) as err:
        check_url("https://sneaky.example/", resolve=resolve)
    assert err.value.code == "private_address"


def test_one_private_answer_among_public_ones_blocks_the_name() -> None:
    resolve = fake_dns({"mixed.example": ["93.184.216.34", "169.254.169.254"]})
    with pytest.raises(BlockedTarget):
        check_url("https://mixed.example/", resolve=resolve)


def test_ipv6_answers_are_checked() -> None:
    with pytest.raises(BlockedTarget):
        check_url("https://v6.example/", resolve=fake_dns({"v6.example": ["::1"]}))
    ok = check_url("https://v6.example/", resolve=fake_dns({"v6.example": ["2606:2800:220:1:248:1893:25c8:1946"]}))
    assert ok.ip.startswith("2606")


def test_unknown_name_is_a_plain_error() -> None:
    with pytest.raises(BlockedTarget) as err:
        check_url("https://nope.invalid/", resolve=PUBLIC)
    assert err.value.code == "unresolvable"


def test_redirect_to_a_private_address_is_blocked_by_rechecking_each_hop() -> None:
    first = check_url("https://example.com/", resolve=PUBLIC)
    assert first.ip == "93.184.216.34"
    with pytest.raises(BlockedTarget):
        check_url("http://169.254.169.254/latest/meta-data/", resolve=PUBLIC)  # the Location header


def test_is_blocked_ip_directly() -> None:
    assert is_blocked_ip(ipaddress.ip_address("169.254.170.2"))
    assert is_blocked_ip(ipaddress.ip_address("::ffff:10.0.0.1"))
    assert not is_blocked_ip(ipaddress.ip_address("8.8.8.8"))
