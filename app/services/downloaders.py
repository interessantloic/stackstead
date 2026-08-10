from __future__ import annotations

import asyncio
import base64
import math
import time
from datetime import UTC, date, datetime, time as datetime_time, timedelta
from typing import Any, Awaitable, Callable
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import httpx

from app.database import Database, utc_now
from app.security import SecretBox


NotifyCallback = Callable[[str, str, str], Awaitable[list[dict[str, Any]]]]


class DownloaderMonitor:
    retention_days = 90

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
        self._last_poll_at: float | None = None
        self._pending_bytes: dict[int, dict[str, float]] = {}
        self._transmission_sessions: dict[int, str] = {}
        self._ensure_daily_rollups()

    def start(self) -> None:
        if not self._task:
            self._last_sample = time.monotonic()
            self._last_poll_at = None
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
        today = datetime.now(self._timezone()).date()
        today_key = today.isoformat()
        daily_rows = self.database.fetchall(
            """
            SELECT downloader_id,download_bytes,upload_bytes
            FROM traffic_daily_totals WHERE date_key=?
            """,
            (today_key,),
        )
        totals_by_id = {row["downloader_id"]: row for row in daily_rows}
        configured = self.database.fetchall("SELECT * FROM downloaders ORDER BY id")
        public_items = []
        for config in configured:
            item = self.states.get(config["id"])
            if item is None:
                item = {
                    "id": config["id"], "name": config["name"], "kind": config["kind"],
                    "baseUrl": config["base_url"],
                    "imageUrl": f"/uploads/{config['image_name']}" if config["image_name"] else None,
                    "color": config["color"], "updatedAt": None,
                    "status": "disabled" if not config["enabled"] else "waiting",
                    "downloadSpeed": 0, "uploadSpeed": 0, "error": "",
                }
            daily = totals_by_id.get(config["id"], {})
            pending = self._pending_bytes.get(config["id"], {})
            public_items.append(
                {
                    **item,
                    "enabled": bool(config["enabled"]),
                    "todayDownloadBytes": int(daily.get("download_bytes") or 0) + int(pending.get("download") or 0),
                    "todayUploadBytes": int(daily.get("upload_bytes") or 0) + int(pending.get("upload") or 0),
                }
            )
        retained = self.database.fetchone(
            """
            SELECT COALESCE(SUM(download_bytes),0) download_bytes,
                   COALESCE(SUM(upload_bytes),0) upload_bytes,
                   MIN(date_key) range_start,MAX(date_key) range_end
            FROM traffic_daily_totals
            """
        ) or {}
        pending_download = sum(int(item.get("download") or 0) for item in self._pending_bytes.values())
        pending_upload = sum(int(item.get("upload") or 0) for item in self._pending_bytes.values())
        peak = self.database.fetchone("SELECT * FROM traffic_daily_peaks WHERE date_key=?", (today_key,)) or {}
        return {
            "lastPolledAt": max((item.get("updatedAt") or "" for item in public_items), default=None),
            "retentionDays": self.retention_days,
            "totals": {
                "downloadSpeed": sum(item.get("downloadSpeed", 0) for item in public_items),
                "uploadSpeed": sum(item.get("uploadSpeed", 0) for item in public_items),
                "todayDownloadBytes": sum(item["todayDownloadBytes"] for item in public_items),
                "todayUploadBytes": sum(item["todayUploadBytes"] for item in public_items),
                "historyDownloadBytes": int(retained.get("download_bytes") or 0) + pending_download,
                "historyUploadBytes": int(retained.get("upload_bytes") or 0) + pending_upload,
            },
            "history": {
                "rangeStart": retained.get("range_start") or today_key,
                "rangeEnd": retained.get("range_end") or today_key,
            },
            "todayPeak": {
                "downloadSpeed": int(peak.get("peak_download_speed") or 0),
                "downloadAt": peak.get("peak_download_at"),
                "uploadSpeed": int(peak.get("peak_upload_speed") or 0),
                "uploadAt": peak.get("peak_upload_at"),
            },
            "downloaders": public_items,
        }

    def history(self, seconds: int = 86400, downloader_id: int | None = None) -> list[dict[str, Any]]:
        seconds = max(60, min(self.retention_days * 86400, seconds))
        end = datetime.now(UTC)
        start = end - timedelta(seconds=seconds)
        return self._history_between(start, end, seconds, downloader_id)

    def daily_history(self, limit: int = 90) -> list[dict[str, Any]]:
        limit = max(1, min(self.retention_days, limit))
        rows = self.database.fetchall(
            """
            SELECT t.date_key,
                   SUM(t.download_bytes) download_bytes,
                   SUM(t.upload_bytes) upload_bytes,
                   COUNT(*) downloader_count,
                   p.peak_download_speed,p.peak_download_at,
                   p.peak_upload_speed,p.peak_upload_at
            FROM traffic_daily_totals t
            LEFT JOIN traffic_daily_peaks p ON p.date_key=t.date_key
            GROUP BY t.date_key ORDER BY t.date_key DESC LIMIT ?
            """,
            (limit,),
        )
        today_key = datetime.now(self._timezone()).date().isoformat()
        if not any(row["date_key"] == today_key for row in rows) and (
            self.states or self._pending_bytes
        ):
            peak = self.database.fetchone(
                "SELECT * FROM traffic_daily_peaks WHERE date_key=?", (today_key,)
            ) or {}
            rows.insert(
                0,
                {
                    "date_key": today_key,
                    "download_bytes": 0,
                    "upload_bytes": 0,
                    "downloader_count": len(self.states),
                    **peak,
                },
            )
            rows = rows[:limit]
        for row in rows:
            if row["date_key"] == today_key:
                row["download_bytes"] += sum(int(item.get("download") or 0) for item in self._pending_bytes.values())
                row["upload_bytes"] += sum(int(item.get("upload") or 0) for item in self._pending_bytes.values())
        return [self._camel_daily_row(row) for row in rows]

    def daily_detail(self, date_key: str, downloader_id: int | None = None) -> dict[str, Any]:
        try:
            selected_day = date.fromisoformat(date_key)
        except ValueError as exc:
            raise ValueError("Invalid date") from exc
        today = datetime.now(self._timezone()).date()
        if selected_day > today or selected_day < today - timedelta(days=self.retention_days - 1):
            raise LookupError("Daily traffic history is outside the retention window")
        start, end = self._day_bounds(selected_day)
        rows = self.database.fetchall(
            """
            SELECT t.downloader_id,d.name,d.color,d.image_name,
                   t.download_bytes,t.upload_bytes
            FROM traffic_daily_totals t
            JOIN downloaders d ON d.id=t.downloader_id
            WHERE t.date_key=? ORDER BY t.upload_bytes DESC,t.download_bytes DESC
            """,
            (date_key,),
        )
        if selected_day == today:
            by_id = {row["downloader_id"]: row for row in rows}
            for configured in self.database.fetchall("SELECT id,name,color,image_name FROM downloaders ORDER BY id"):
                pending = self._pending_bytes.get(configured["id"], {})
                if configured["id"] not in by_id and (pending.get("download") or pending.get("upload")):
                    row = {**configured, "downloader_id": configured["id"], "download_bytes": 0, "upload_bytes": 0}
                    rows.append(row)
                    by_id[configured["id"]] = row
                if configured["id"] in by_id:
                    by_id[configured["id"]]["download_bytes"] += int(pending.get("download") or 0)
                    by_id[configured["id"]]["upload_bytes"] += int(pending.get("upload") or 0)
        selected_rows = [row for row in rows if downloader_id is None or row["downloader_id"] == downloader_id]
        return {
            "dateKey": date_key,
            "startAt": start.isoformat(),
            "endAt": end.isoformat(),
            "selectedDownloaderId": downloader_id,
            "downloadBytes": sum(int(row["download_bytes"] or 0) for row in selected_rows),
            "uploadBytes": sum(int(row["upload_bytes"] or 0) for row in selected_rows),
            "downloaders": [
                {
                    "id": row["downloader_id"], "name": row["name"], "color": row["color"],
                    "imageUrl": f"/uploads/{row['image_name']}" if row.get("image_name") else None,
                    "downloadBytes": int(row["download_bytes"] or 0),
                    "uploadBytes": int(row["upload_bytes"] or 0),
                }
                for row in rows
            ],
            "items": self._history_between(start, end, 86400, downloader_id),
        }

    def rebuild_daily_rollups(self) -> None:
        timezone = self._timezone()
        totals: dict[tuple[str, int], list[int]] = {}
        speed_points: dict[tuple[str, str], list[int]] = {}
        cutoff = (datetime.now(UTC) - timedelta(days=self.retention_days)).isoformat()
        samples = self.database.fetchall(
            """
            SELECT downloader_id,sampled_at,download_speed,upload_speed,download_bytes,upload_bytes
            FROM traffic_samples WHERE sampled_at>=? ORDER BY sampled_at
            """,
            (cutoff,),
        )
        for sample in samples:
            try:
                date_key = datetime.fromisoformat(sample["sampled_at"]).astimezone(timezone).date().isoformat()
            except (TypeError, ValueError):
                continue
            values = totals.setdefault((date_key, sample["downloader_id"]), [0, 0])
            values[0] += int(sample["download_bytes"] or 0)
            values[1] += int(sample["upload_bytes"] or 0)
            speeds = speed_points.setdefault((date_key, sample["sampled_at"]), [0, 0])
            speeds[0] += int(sample["download_speed"] or 0)
            speeds[1] += int(sample["upload_speed"] or 0)
        peaks: dict[str, dict[str, Any]] = {}
        for (date_key, sampled_at), (download_speed, upload_speed) in speed_points.items():
            peak = peaks.setdefault(
                date_key,
                {
                    "download_speed": 0,
                    "download_at": None,
                    "upload_speed": 0,
                    "upload_at": None,
                },
            )
            if download_speed > peak["download_speed"]:
                peak["download_speed"] = download_speed
                peak["download_at"] = sampled_at
            if upload_speed > peak["upload_speed"]:
                peak["upload_speed"] = upload_speed
                peak["upload_at"] = sampled_at
        with self.database.connect() as connection:
            connection.execute("BEGIN IMMEDIATE")
            connection.execute("DELETE FROM traffic_daily_totals")
            connection.execute("DELETE FROM traffic_daily_peaks")
            connection.executemany(
                "INSERT INTO traffic_daily_totals(date_key,downloader_id,download_bytes,upload_bytes) VALUES(?,?,?,?)",
                [(key[0], key[1], value[0], value[1]) for key, value in totals.items()],
            )
            connection.executemany(
                """
                INSERT INTO traffic_daily_peaks(
                  date_key,peak_download_speed,peak_download_at,peak_upload_speed,peak_upload_at
                ) VALUES(?,?,?,?,?)
                """,
                [
                    (
                        date_key,
                        peak["download_speed"],
                        peak["download_at"],
                        peak["upload_speed"],
                        peak["upload_at"],
                    )
                    for date_key, peak in peaks.items()
                ],
            )
            connection.execute("COMMIT")
        self.database.set_setting("traffic_rollup_timezone", str(timezone))

    def _history_between(
        self, start: datetime, end: datetime, span_seconds: int, downloader_id: int | None
    ) -> list[dict[str, Any]]:
        bucket_seconds = max(self.sample_seconds, math.ceil(span_seconds / 360))
        params: list[Any] = [start.isoformat(), end.isoformat()]
        downloader_filter = ""
        if downloader_id is not None:
            downloader_filter = " AND downloader_id=?"
            params.append(downloader_id)
        params.append(bucket_seconds)
        return self.database.fetchall(
            f"""
            WITH points AS (
              SELECT sampled_at,SUM(download_speed) download_speed,SUM(upload_speed) upload_speed
              FROM traffic_samples
              WHERE sampled_at>=? AND sampled_at<?{downloader_filter}
              GROUP BY sampled_at
            )
            SELECT MIN(sampled_at) sampled_at,
                   CAST(AVG(download_speed) AS INTEGER) download_speed,
                   CAST(AVG(upload_speed) AS INTEGER) upload_speed
            FROM points
            GROUP BY CAST(strftime('%s',sampled_at) AS INTEGER)/?
            ORDER BY sampled_at
            """,
            tuple(params),
        )

    def _camel_daily_row(self, row: dict[str, Any]) -> dict[str, Any]:
        return {
            "dateKey": row["date_key"], "downloadBytes": int(row["download_bytes"] or 0),
            "uploadBytes": int(row["upload_bytes"] or 0),
            "downloaderCount": int(row["downloader_count"] or 0),
            "peakDownloadSpeed": int(row.get("peak_download_speed") or 0),
            "peakDownloadAt": row.get("peak_download_at"),
            "peakUploadSpeed": int(row.get("peak_upload_speed") or 0),
            "peakUploadAt": row.get("peak_upload_at"),
        }

    def _ensure_daily_rollups(self) -> None:
        timezone = str(self._timezone())
        stored_timezone = self.database.setting("traffic_rollup_timezone", None)
        has_samples = bool(self.database.fetchone("SELECT id FROM traffic_samples LIMIT 1"))
        has_rollups = bool(self.database.fetchone("SELECT date_key FROM traffic_daily_totals LIMIT 1"))
        if has_samples and (not has_rollups or stored_timezone != timezone):
            self.rebuild_daily_rollups()
        elif stored_timezone != timezone:
            self.database.set_setting("traffic_rollup_timezone", timezone)

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
            pending = self._pending_bytes.get(stale_id, {})
            if not pending.get("download") and not pending.get("upload"):
                self._pending_bytes.pop(stale_id, None)
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
        if self._last_poll_at is not None:
            elapsed = min(monotonic_now - self._last_poll_at, max(30.0, self.poll_seconds * 3.0))
            for item in self.states.values():
                pending = self._pending_bytes.setdefault(item["id"], {"download": 0.0, "upload": 0.0})
                pending["download"] += max(0, int(item.get("downloadSpeed") or 0)) * elapsed
                pending["upload"] += max(0, int(item.get("uploadSpeed") or 0)) * elapsed
        self._last_poll_at = monotonic_now
        self._update_daily_peaks(now)

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
        date_key = datetime.fromisoformat(sampled_at).astimezone(self._timezone()).date().isoformat()
        stored_ids: list[int] = []
        configured_ids = {
            row["id"] for row in self.database.fetchall("SELECT id FROM downloaders")
        }
        sample_ids = set(self.states) | {
            downloader_id
            for downloader_id, pending in self._pending_bytes.items()
            if pending.get("download") or pending.get("upload")
        }
        with self.database.connect() as connection:
            connection.execute("BEGIN")
            for downloader_id in sample_ids & configured_ids:
                item = self.states.get(downloader_id, {})
                download_speed = int(item.get("downloadSpeed") or 0)
                upload_speed = int(item.get("uploadSpeed") or 0)
                pending = self._pending_bytes.get(downloader_id, {})
                download_bytes = max(0, int(pending.get("download") or 0))
                upload_bytes = max(0, int(pending.get("upload") or 0))
                connection.execute(
                    """
                    INSERT INTO traffic_samples(
                        downloader_id,sampled_at,download_speed,upload_speed,download_bytes,upload_bytes
                    ) VALUES(?,?,?,?,?,?)
                    """,
                    (
                        downloader_id, sampled_at, download_speed, upload_speed,
                        download_bytes,
                        upload_bytes,
                    ),
                )
                connection.execute(
                    """
                    INSERT INTO traffic_daily_totals(date_key,downloader_id,download_bytes,upload_bytes)
                    VALUES(?,?,?,?)
                    ON CONFLICT(date_key,downloader_id) DO UPDATE SET
                      download_bytes=download_bytes+excluded.download_bytes,
                      upload_bytes=upload_bytes+excluded.upload_bytes
                    """,
                    (date_key, downloader_id, download_bytes, upload_bytes),
                )
                stored_ids.append(downloader_id)
            cutoff = (datetime.now(UTC) - timedelta(days=90)).isoformat()
            connection.execute("DELETE FROM traffic_samples WHERE sampled_at < ?", (cutoff,))
            cutoff_key = (datetime.now(self._timezone()).date() - timedelta(days=self.retention_days - 1)).isoformat()
            connection.execute("DELETE FROM traffic_daily_totals WHERE date_key < ?", (cutoff_key,))
            connection.execute("DELETE FROM traffic_daily_peaks WHERE date_key < ?", (cutoff_key,))
            connection.execute("COMMIT")
        for downloader_id in stored_ids:
            self._pending_bytes[downloader_id] = {"download": 0.0, "upload": 0.0}
        for downloader_id in set(self._pending_bytes) - configured_ids:
            self._pending_bytes.pop(downloader_id, None)

    def _update_daily_peaks(self, sampled_at: str) -> None:
        date_key = datetime.fromisoformat(sampled_at).astimezone(self._timezone()).date().isoformat()
        download_speed = sum(max(0, int(item.get("downloadSpeed") or 0)) for item in self.states.values())
        upload_speed = sum(max(0, int(item.get("uploadSpeed") or 0)) for item in self.states.values())
        self.database.execute(
            """
            INSERT INTO traffic_daily_peaks(
              date_key,peak_download_speed,peak_download_at,peak_upload_speed,peak_upload_at
            ) VALUES(?,?,?,?,?)
            ON CONFLICT(date_key) DO UPDATE SET
              peak_download_at=CASE WHEN excluded.peak_download_speed>peak_download_speed THEN excluded.peak_download_at ELSE peak_download_at END,
              peak_download_speed=MAX(peak_download_speed,excluded.peak_download_speed),
              peak_upload_at=CASE WHEN excluded.peak_upload_speed>peak_upload_speed THEN excluded.peak_upload_at ELSE peak_upload_at END,
              peak_upload_speed=MAX(peak_upload_speed,excluded.peak_upload_speed)
            """,
            (date_key, download_speed, sampled_at if download_speed else None, upload_speed, sampled_at if upload_speed else None),
        )

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
