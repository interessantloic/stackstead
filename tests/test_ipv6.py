import unittest

from app.ipv6 import normalize_public_ipv6, select_public_ipv6


class IPv6SelectionTests(unittest.TestCase):
    def test_normalizes_public_address_and_scope(self) -> None:
        self.assertEqual(normalize_public_ipv6("240E:0000::0001%eth0"), "240e::1")

    def test_rejects_non_public_ranges_and_invalid_input(self) -> None:
        self.assertIsNone(normalize_public_ipv6("fe80::1"))
        self.assertIsNone(normalize_public_ipv6("fd00::1"))
        self.assertIsNone(normalize_public_ipv6("not-an-address"))

    def test_prefers_reported_primary_and_computes_real_prefix(self) -> None:
        selected, prefix, addresses = select_public_ipv6(
            "240e:12::8", None, ["240e:99::1", "240e:12::8", "fe80::1"]
        )
        self.assertEqual(selected, "240e:12::8")
        self.assertEqual(prefix, "240e:12::/64")
        self.assertEqual(addresses, ["240e:12::8", "240e:99::1"])

    def test_empty_report_is_valid(self) -> None:
        self.assertEqual(select_public_ipv6(None, None, []), (None, None, []))


if __name__ == "__main__":
    unittest.main()
