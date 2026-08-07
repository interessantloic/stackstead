import tempfile
import unittest
from pathlib import Path

from app.security import SecretBox, hash_password, token_hash, verify_password


class SecurityTests(unittest.TestCase):
    def test_password_hash_round_trip(self) -> None:
        encoded = hash_password("correct horse battery staple")
        self.assertNotEqual(encoded, "correct horse battery staple")
        self.assertTrue(verify_password("correct horse battery staple", encoded))
        self.assertFalse(verify_password("wrong", encoded))

    def test_secret_box_round_trip(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_dir:
            key_path = Path(temporary_dir) / ".secret_key"
            box = SecretBox(key_path)
            encrypted = box.encrypt("sensitive-value")
            self.assertNotIn("sensitive-value", encrypted)
            self.assertEqual(box.decrypt(encrypted), "sensitive-value")
            self.assertEqual(key_path.stat().st_mode & 0o777, 0o600)

    def test_token_hash_is_deterministic(self) -> None:
        self.assertEqual(token_hash("one"), token_hash("one"))
        self.assertNotEqual(token_hash("one"), token_hash("two"))


if __name__ == "__main__":
    unittest.main()
