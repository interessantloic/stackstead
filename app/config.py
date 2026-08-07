from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Config:
    data_dir: Path
    database_path: Path
    uploads_dir: Path
    secret_key_path: Path
    host: str
    port: int
    poll_interval_seconds: int
    sample_interval_seconds: int
    session_days: int
    max_upload_bytes: int
    secure_cookies: bool

    @classmethod
    def from_env(cls) -> "Config":
        data_dir = Path(os.getenv("STACKSTEAD_DATA_DIR", "/data")).resolve()
        return cls(
            data_dir=data_dir,
            database_path=data_dir / "stackstead.db",
            uploads_dir=data_dir / "uploads",
            secret_key_path=data_dir / ".secret_key",
            host=os.getenv("STACKSTEAD_HOST", "0.0.0.0"),
            port=_bounded_int("STACKSTEAD_PORT", 8080, 1, 65535),
            poll_interval_seconds=_bounded_int("STACKSTEAD_POLL_SECONDS", 5, 2, 300),
            sample_interval_seconds=_bounded_int("STACKSTEAD_SAMPLE_SECONDS", 60, 10, 3600),
            session_days=_bounded_int("STACKSTEAD_SESSION_DAYS", 30, 1, 365),
            max_upload_bytes=_bounded_int("STACKSTEAD_MAX_UPLOAD_BYTES", 2 * 1024 * 1024, 1024, 10 * 1024 * 1024),
            secure_cookies=os.getenv("STACKSTEAD_SECURE_COOKIES", "0").lower() in {"1", "true", "yes", "on"},
        )


def _bounded_int(name: str, default: int, minimum: int, maximum: int) -> int:
    try:
        value = int(os.getenv(name, str(default)))
    except ValueError:
        value = default
    return max(minimum, min(maximum, value))
