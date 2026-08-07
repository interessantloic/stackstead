import tempfile
import unittest
from pathlib import Path

from app.database import Database


class DatabaseTests(unittest.TestCase):
    def test_schema_and_settings(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_dir:
            database = Database(Path(temporary_dir) / "stackstead.db")
            database.initialize()
            database.set_setting("language", "zh-CN")
            database.set_setting("ipv6_enabled", False)
            self.assertEqual(database.setting("language"), "zh-CN")
            self.assertFalse(database.setting("ipv6_enabled", True))
            self.assertEqual(database.setting("missing", "fallback"), "fallback")

    def test_foreign_keys_delete_downloader_samples(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_dir:
            database = Database(Path(temporary_dir) / "stackstead.db")
            database.initialize()
            with database.connect() as connection:
                downloader_id = connection.execute(
                    """
                    INSERT INTO downloaders(name,kind,base_url,created_at,updated_at)
                    VALUES('qB','qbittorrent','http://qb','now','now')
                    """
                ).lastrowid
                connection.execute(
                    """
                    INSERT INTO traffic_samples(
                      downloader_id,sampled_at,download_speed,upload_speed,download_bytes,upload_bytes
                    ) VALUES(?, 'now', 1, 2, 3, 4)
                    """,
                    (downloader_id,),
                )
                connection.execute("DELETE FROM downloaders WHERE id=?", (downloader_id,))
            self.assertIsNone(database.fetchone("SELECT id FROM traffic_samples LIMIT 1"))


if __name__ == "__main__":
    unittest.main()
