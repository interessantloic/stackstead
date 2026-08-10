import tempfile
import unittest
from pathlib import Path

from app.database import Database, utc_now
from app.security import SecretBox
from app.services.downloaders import DownloaderMonitor


async def _notify(*_args):
    return []


class TrafficMonitorTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary_dir = tempfile.TemporaryDirectory()
        root = Path(self.temporary_dir.name)
        self.database = Database(root / "stackstead.db")
        self.database.initialize()
        self.database.set_setting("timezone", "Asia/Shanghai")
        self.downloader_id = self.database.execute(
            """
            INSERT INTO downloaders(name,kind,base_url,color,created_at,updated_at)
            VALUES('NAS qB','qbittorrent','http://qb','#654321','now','now')
            """
        )
        self.monitor = DownloaderMonitor(
            self.database, SecretBox(root / ".secret_key"), 5, 60, _notify
        )

    def tearDown(self) -> None:
        self.temporary_dir.cleanup()

    def test_snapshot_rollups_peaks_and_daily_detail(self) -> None:
        sampled_at = utc_now()
        self.monitor.states[self.downloader_id] = {
            "id": self.downloader_id,
            "name": "NAS qB",
            "kind": "qbittorrent",
            "baseUrl": "http://qb",
            "imageUrl": None,
            "color": "#654321",
            "updatedAt": sampled_at,
            "status": "online",
            "downloadSpeed": 8 * 1024 * 1024,
            "uploadSpeed": 2 * 1024 * 1024,
            "error": "",
        }
        self.monitor._pending_bytes[self.downloader_id] = {
            "download": 480 * 1024 * 1024,
            "upload": 120 * 1024 * 1024,
        }
        self.monitor._update_daily_peaks(sampled_at)
        self.monitor._store_samples(sampled_at)

        snapshot = self.monitor.snapshot()
        self.assertEqual(snapshot["totals"]["todayDownloadBytes"], 480 * 1024 * 1024)
        self.assertEqual(snapshot["totals"]["historyUploadBytes"], 120 * 1024 * 1024)
        self.assertEqual(snapshot["todayPeak"]["downloadSpeed"], 8 * 1024 * 1024)
        self.assertEqual(snapshot["downloaders"][0]["color"], "#654321")

        date_key = snapshot["history"]["rangeEnd"]
        detail = self.monitor.daily_detail(date_key, self.downloader_id)
        self.assertEqual(detail["downloadBytes"], 480 * 1024 * 1024)
        self.assertTrue(detail["startAt"].endswith("+00:00"))
        self.assertTrue(detail["endAt"].endswith("+00:00"))
        self.assertEqual(len(detail["downloaders"]), 1)
        self.assertEqual(len(detail["items"]), 1)

        self.monitor.rebuild_daily_rollups()
        rebuilt = self.monitor.snapshot()
        self.assertEqual(rebuilt["totals"]["historyDownloadBytes"], 480 * 1024 * 1024)
        self.assertEqual(rebuilt["todayPeak"]["uploadSpeed"], 2 * 1024 * 1024)

    def test_pending_traffic_is_flushed_after_downloader_is_disabled(self) -> None:
        sampled_at = utc_now()
        self.monitor._pending_bytes[self.downloader_id] = {
            "download": 30 * 1024 * 1024,
            "upload": 15 * 1024 * 1024,
        }

        self.monitor._store_samples(sampled_at)

        snapshot = self.monitor.snapshot()
        self.assertEqual(snapshot["totals"]["todayDownloadBytes"], 30 * 1024 * 1024)
        self.assertEqual(snapshot["totals"]["todayUploadBytes"], 15 * 1024 * 1024)

    def test_history_is_bucketed_and_retention_is_reported(self) -> None:
        self.assertEqual(self.monitor.retention_days, 90)
        self.assertEqual(self.monitor.history(1800), [])


if __name__ == "__main__":
    unittest.main()
