from __future__ import annotations

from ipaddress import IPv6Address, IPv6Network


PUBLIC_IPV6_NETWORK = IPv6Network("2000::/3")


def normalize_public_ipv6(value: str | None) -> str | None:
    if not value:
        return None
    raw_address = value.strip().split("%", 1)[0].split("/", 1)[0]
    try:
        address = IPv6Address(raw_address)
    except ValueError:
        return None
    return address.compressed if address in PUBLIC_IPV6_NETWORK else None


def select_public_ipv6(
    primary_ipv6: str | None,
    legacy_ipv6: str | None,
    ipv6_list: list[str],
) -> tuple[str | None, str | None, list[str]]:
    candidates = [primary_ipv6, legacy_ipv6, *ipv6_list]
    normalized_list: list[str] = []
    for candidate in candidates:
        normalized = normalize_public_ipv6(candidate)
        if normalized and normalized not in normalized_list:
            normalized_list.append(normalized)
    preferred = normalize_public_ipv6(primary_ipv6 or legacy_ipv6)
    selected = preferred if preferred in normalized_list else (normalized_list[0] if normalized_list else None)
    prefix64 = str(IPv6Network((IPv6Address(selected), 64), strict=False)) if selected else None
    return selected, prefix64, normalized_list
