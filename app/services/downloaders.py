from __future__ import annotations

import asyncio
import base64
import time
from datetime import UTC, date, datetime, time as datetime_time, timedelta
from typing import Any, Awaitable, Callable
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import httpx

from app.database import Database, utc_now
from app.security import SecretBox


NotifyCallback = Callable[[str, str, str], Awaitable[list[dict[str, Any]]]]


class DownloaderMonitor:
    def __init__(
        self,
        database: Database,
        secrets: SecretBox,
        poll_seconds: int,
        sample_seconds: int,
        notify: NotifyCallback,
    ):
        self.database = database
        self.secrets = secrets
        self.poll_seconds = poll_seconds
        self.sample_seconds = sample_seconds
        self.notify = notify
        self.states: dict[int, dict[str, Any]] = {}
        self._task: asyncio.Task[None] | None = None
        self._last_sample = 0.0
        self._transmission_sessions: dict[int, str] = {}

    def start(self) -> None:
        if not self._task:
            self._task = asyncio.create_task(self._loop())

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

    def snapshot(self) -> dict[str, Any]:
        items = list(self.states.values())
        today_start, _ = self._day_bounds(datetime.now(self._timezone()).date())
        daily_rows = self.database.fetchall(
            """
            SELECT downloader_id, SUM(download_bytes) download_bytes, SUM(upload_bytes) upload_bytes
            FROM traffic_samples WHERE sampled_at >= ? GROUP BY downloader_id
            """,
            (today_start.isoformat(),),
        )
        totals_by_id = {row["downloader_id"]: row for row in daily_rows}
        public_items = []
        for item in items:
            daily = totals_by_id.get(item["id"], {})
            public_items.append(
                {
                    **item,
                    "todayDownloadBytes": int(daily.get("download_bytes") or 0),
                    "todayUploadBytes": int(daily.get("upload_bytes") or 0),
                }
            )
        return {
            "lastPolledAt": max((item.get("updatedAt") or "" for item in items), default=None),
            "totals": {
                "downloadSpeed": sum(item.get("downloadSpeed", 0) for item in items),
                "uploadSpeed": sum(item.get("uploadSpeed", 0) for item in items),
                "todayDownloadBytes": sum(item["todayDownloadBytes"] for item in public_items),
                "todayUploadBytes": sum(item["todayUploadBytes"] for item in public_items),
            },
            "downloaders": public_items,
        }

    def history(self, hours: int = 24) -> list[dict[str, Any]]:
        hours = max(1, min(24 * 90, hours))
        since = (datetime.now(UTC) - timedelta(hours=hours)).isoformat()
        return self.database.fetchall(
            """
            SELECT sampled_at,
                   SUM(download_speed) download_speed,
                   SUM(upload_speed) upload_speed
            FROM traffic_samples WHERE sampled_at >= ?
            GROUP BY sampled_at ORDER BY sampled_at
            """,
            (since,),
        )

    async def test_downloader(self, downloader_id: int) -> dict[str, int]:
        configured = self.database.fetchone(
            "SELECT * FROM downloaders WHERE id=?", (downloader_id,)
        )
        if not configured:
            raise LookupError("Downloader not found")
        result = await self._poll_one(configured)
        if isinstance(result, Exception):
            raise RuntimeError(str(result)) from result
        return result

    async def _loop(self) -> None:
        while True:
            started = time.monotonic()
            try:
                await self.poll_once()
            except Exception as exc:
                print(f"downloader poll cycle failed: {exc}", flush=True)
            elapsed = time.monotonic() - started
            await asyncio.sleep(max(0.5, self.poll_seconds - elapsed))

    async def poll_once(self) -> None:
        configured = self.database.fetchall("SELECT * FROM downloaders WHERE enabled=1 ORDER BY id")
        active_ids = {item["id"] for item in configured}
        for stale_id in set(self.states) - active_ids:
            del self.states[stale_id]
        results = await asyncio.gather(*(self._poll_one(item) for item in configured))
        now = utc_now()
        for config, result in zip(configured, results, strict=True):
            previous = self.states.get(config["id"])
            base = {
                "id": config["id"],
                "name": config["name"],
                "kind": config["kind"],
                "baseUrl": config["base_url"],
                "imageUrl": f"/uploads/{config['image_name']}" if config["image_name"] else None,
                "color": config["color"],
                "updatedAt": now,
            }
            if isinstance(result, Exception):
                state = {
                    **base,
                    "status": "offline",
                    "downloadSpeed": 0,
                    "uploadSpeed": 0,
                    "error": str(result)[:200],
                }
            else:
                state = {**base, "status": "online", "error": "", **result}
            self.states[config["id"]] = state
            if previous and previous["status"] != state["status"]:
                if state["status"] == "offline":
                    asyncio.create_task(
                        self.notify("downloader_offline", "Downloader offline", config["name"])
                    )
                else:
                    asyncio.create_task(
                        self.notify("downloader_recovered", "Downloader recovered", config["name"])
                    )

        monotonic_now = time.monotonic()
        if monotonic_now - self._last_sample >= self.sample_seconds:
            self._store_samples(now)
            self._last_sample = monotonic_now
        await self._maybe_send_daily_summary()

    async def _poll_one(self, config: dict[str, Any]) -> dict[str, int] | Exception:
        try:
            if config["kind"] == "qbittorrent":
                return await self._poll_qbittorrent(config)
            return await self._poll_transmission(config)
        except Exception as exc:
            return exc

    async def _poll_qbittorrent(self, config: dict[str, Any]) -> dict[str, int]:
        password = self.secrets.decrypt(config["password_encrypted"])
        async with httpx.AsyncClient(
            timeout=8, follow_redirects=False, verify=bool(config["verify_tls"])
        ) as client:
            if config["username"] or password:
                login = await client.post(
                    f"{config['base_url'].rstrip('/')}/api/v2/auth/login",
                    data={"username": config["username"], "password": password},
                )
                login.raise_for_status()
                if login.text.strip().lower() != "ok.":
                    raise RuntimeError("qBittorrent authentication failed")
            response = await client.get(f"{config['base_url'].rstrip('/')}/api/v2/transfer/info")
            response.raise_for_status()
            payload = response.json()
        return {
            "downloadSpeed": max(0, int(payload.get("dl_info_speed") or 0)),
            "uploadSpeed": max(0, int(payload.get("up_info_speed") or 0)),
        }

    async def _poll_transmission(self, config: dict[str, Any]) -> dict[str, int]:
        password = self.secrets.decrypt(config["password_encrypted"])
        credentials = base64.b64encode(f"{config['username']}:{password}".encode()).decode()
        headers = {"Authorization": f"Basic {credentials}"} if config["username"] or password else {}
        session_id = self._transmission_sessions.get(config["id"])
        if session_id:
            headers["X-Transmission-Session-Id"] = session_id
        endpoint = f"{config['base_url'].rstrip('/')}/{config['rpc_path'].lstrip('/')}"
        payload = {"method": "session-stats"}
        async with httpx.AsyncClient(
            timeout=8, follow_redirects=False, verify=bool(config["verify_tls"])
        ) as client:
            response = await client.post(endpoint, headers=headers, json=payload)
            if response.status_code == 409:
                session_id = response.headers.get("X-Transmission-Session-Id", "")
                if not session_id:
                    raise RuntimeError("Transmission session negotiation failed")
                self._transmission_sessions[config["id"]] = session_id
                headers["X-Transmission-Session-Id"] = session_id
                response = await client.post(endpoint, headers=headers, json=payload)
            response.raise_for_status()
            arguments = response.json().get("arguments", {})
        return {
            "downloadSpeed": max(0, int(arguments.get("downloadSpeed") or 0)),
            "uploadSpeed": max(0, int(arguments.get("uploadSpeed") or 0)),
        }

    def _store_samples(self, sampled_at: str) -> None:
        with self.database.connect() as connection:
            connection.execute("BEGIN")
            for item in self.states.values():
                download_speed = int(item.get("downloadSpeed") or 0)
                upload_speed = int(item.get("uploadSpeed") or 0)
                connection.execute(
                    """
                    INSERT INTO traffic_samples(
                        downloader_id,sampled_at,download_speed,upload_speed,download_bytes,upload_bytes
                    ) VALUES(?,?,?,?,?,?)
                    """,
                    (
                        item["id"], sampled_at, download_speed, upload_speed,
                        download_speed * self.sample_seconds,
                        upload_speed * self.sample_seconds,
                    ),
                )
            cutoff = (datetime.now(UTC) - timedelta(days=90)).isoformat()
            connection.execute("DELETE FROM traffic_samples WHERE sampled_at < ?", (cutoff,))
            connection.execute("COMMIT")

    async def _maybe_send_daily_summary(self) -> None:
        current_day = datetime.now(self._timezone()).date()
        previous_key = self.database.setting("traffic_active_date")
        if not previous_key:
            self.database.set_setting("traffic_active_date", current_day.isoformat())
            return
        if previous_key == current_day.isoformat():
            return
        self.database.set_setting("traffic_active_date", current_day.isoformat())
        try:
            previous_day = date.fromisoformat(previous_key)
        except ValueError:
            return
        start, end = self._day_bounds(previous_day)
        totals = self.database.fetchone(
            """
            SELECT COALESCE(SUM(download_bytes),0) download_bytes,
                   COALESCE(SUM(upload_bytes),0) upload_bytes
            FROM traffic_samples WHERE sampled_at >= ? AND sampled_at < ?
            """,
            (start.isoformat(), end.isoformat()),
        ) or {}
        await self.notify(
            "daily_traffic",
            f"Traffic summary · {previous_key}",
            f"Downloaded {_format_bytes(totals.get('download_bytes', 0))}, "
            f"uploaded {_format_bytes(totals.get('upload_bytes', 0))}",
        )

    def _timezone(self) -> ZoneInfo:
        try:
            return ZoneInfo(self.database.setting("timezone", "Asia/Shanghai"))
        except ZoneInfoNotFoundError:
            return ZoneInfo("UTC")

    def _day_bounds(self, day: date) -> tuple[datetime, datetime]:
        start = datetime.combine(day, datetime_time.min, self._timezone()).astimezone(UTC)
        end = datetime.combine(day + timedelta(days=1), datetime_time.min, self._timezone()).astimezone(UTC)
        return start, end


def _format_bytes(value: Any) -> str:
    amount = max(0.0, float(value or 0))
    units = ("B", "KB", "MB", "GB", "TB", "PB")
    index = 0
    while amount >= 1024 and index < len(units) - 1:
        amount /= 1024
        index += 1
    return f"{amount:.2f} {units[index]}"
