from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Iterator


SCHEMA = """
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS downloaders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    kind TEXT NOT NULL CHECK(kind IN ('qbittorrent', 'transmission')),
    base_url TEXT NOT NULL,
    username TEXT NOT NULL DEFAULT '',
    password_encrypted TEXT NOT NULL DEFAULT '',
    rpc_path TEXT NOT NULL DEFAULT '/transmission/rpc',
    image_name TEXT,
    color TEXT NOT NULL DEFAULT '#2563eb',
    verify_tls INTEGER NOT NULL DEFAULT 1,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS traffic_samples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    downloader_id INTEGER REFERENCES downloaders(id) ON DELETE CASCADE,
    sampled_at TEXT NOT NULL,
    download_speed INTEGER NOT NULL,
    upload_speed INTEGER NOT NULL,
    download_bytes INTEGER NOT NULL,
    upload_bytes INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS traffic_samples_time_idx ON traffic_samples(sampled_at);
CREATE INDEX IF NOT EXISTS traffic_samples_downloader_time_idx ON traffic_samples(downloader_id, sampled_at);
CREATE TABLE IF NOT EXISTS traffic_daily_totals (
    date_key TEXT NOT NULL,
    downloader_id INTEGER NOT NULL REFERENCES downloaders(id) ON DELETE CASCADE,
    download_bytes INTEGER NOT NULL DEFAULT 0,
    upload_bytes INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY(date_key, downloader_id)
);
CREATE INDEX IF NOT EXISTS traffic_daily_totals_date_idx ON traffic_daily_totals(date_key DESC);
CREATE TABLE IF NOT EXISTS traffic_daily_peaks (
    date_key TEXT PRIMARY KEY,
    peak_download_speed INTEGER NOT NULL DEFAULT 0,
    peak_download_at TEXT,
    peak_upload_speed INTEGER NOT NULL DEFAULT 0,
    peak_upload_at TEXT
);
CREATE TABLE IF NOT EXISTS ipv6_devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    token_hash TEXT NOT NULL UNIQUE,
    current_ipv6 TEXT,
    current_prefix64 TEXT,
    current_ipv6_list TEXT NOT NULL DEFAULT '[]',
    last_reported_at TEXT,
    stale_after_minutes INTEGER NOT NULL DEFAULT 150,
    stale_notified_at TEXT,
    enabled INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ipv6_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL REFERENCES ipv6_devices(id) ON DELETE CASCADE,
    recorded_at TEXT NOT NULL,
    source_timestamp TEXT,
    ipv6 TEXT,
    prefix64 TEXT,
    ipv6_list TEXT NOT NULL DEFAULT '[]',
    old_ipv6 TEXT,
    old_prefix64 TEXT,
    changed INTEGER NOT NULL DEFAULT 0,
    should_notify INTEGER NOT NULL DEFAULT 0,
    raw_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS ipv6_history_device_time_idx ON ipv6_history(device_id, recorded_at DESC);
CREATE TABLE IF NOT EXISTS bark_targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    server_url TEXT NOT NULL,
    device_key_encrypted TEXT NOT NULL,
    verify_tls INTEGER NOT NULL DEFAULT 1,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS notification_preferences (
    target_id INTEGER NOT NULL REFERENCES bark_targets(id) ON DELETE CASCADE,
    event_key TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY(target_id, event_key)
);
CREATE TABLE IF NOT EXISTS notification_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_id INTEGER REFERENCES bark_targets(id) ON DELETE SET NULL,
    event_key TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL,
    detail TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS notification_log_time_idx ON notification_log(created_at DESC);
"""


def utc_now() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")


class Database:
    def __init__(self, path: Path):
        self.path = path

    def initialize(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as connection:
            connection.executescript(SCHEMA)
            connection.execute("PRAGMA user_version = 2")

    @contextmanager
    def connect(self) -> Iterator[sqlite3.Connection]:
        connection = sqlite3.connect(self.path, timeout=10, isolation_level=None)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA journal_mode = WAL")
        connection.execute("PRAGMA busy_timeout = 10000")
        try:
            yield connection
        finally:
            connection.close()

    def execute(self, query: str, params: tuple[Any, ...] = ()) -> int:
        with self.connect() as connection:
            cursor = connection.execute(query, params)
            return int(cursor.lastrowid or 0)

    def fetchone(self, query: str, params: tuple[Any, ...] = ()) -> dict[str, Any] | None:
        with self.connect() as connection:
            row = connection.execute(query, params).fetchone()
            return dict(row) if row else None

    def fetchall(self, query: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
        with self.connect() as connection:
            return [dict(row) for row in connection.execute(query, params).fetchall()]

    def setting(self, key: str, default: Any = None) -> Any:
        row = self.fetchone("SELECT value FROM app_settings WHERE key = ?", (key,))
        if not row:
            return default
        try:
            return json.loads(row["value"])
        except json.JSONDecodeError:
            return default

    def set_setting(self, key: str, value: Any) -> None:
        self.execute(
            """
            INSERT INTO app_settings(key, value, updated_at) VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
            """,
            (key, json.dumps(value, ensure_ascii=False), utc_now()),
        )
