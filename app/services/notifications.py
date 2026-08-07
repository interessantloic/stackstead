from __future__ import annotations

import asyncio
from typing import Any

import httpx

from app.database import Database, utc_now
from app.security import SecretBox


EVENT_KEYS = (
    "ipv6_changed",
    "ipv6_missing",
    "ipv6_recovered",
    "ipv6_stale",
    "downloader_offline",
    "downloader_recovered",
    "daily_traffic",
)


class NotificationService:
    def __init__(self, database: Database, secrets: SecretBox):
        self.database = database
        self.secrets = secrets

    async def send_event(self, event_key: str, title: str, body: str) -> list[dict[str, Any]]:
        if event_key not in EVENT_KEYS:
            raise ValueError("Unknown notification event")
        targets = self.database.fetchall(
            """
            SELECT t.* FROM bark_targets t
            JOIN notification_preferences p ON p.target_id=t.id
            WHERE t.enabled=1 AND p.event_key=? AND p.enabled=1
            ORDER BY t.id
            """,
            (event_key,),
        )
        return await asyncio.gather(
            *(self._send(target, event_key, title, body) for target in targets)
        ) if targets else []

    async def test_target(self, target_id: int) -> dict[str, Any]:
        target = self.database.fetchone("SELECT * FROM bark_targets WHERE id=?", (target_id,))
        if not target:
            raise LookupError("Notification target not found")
        return await self._send(
            target,
            "test",
            "Stackstead",
            "Bark notification test succeeded.",
        )

    async def _send(
        self, target: dict[str, Any], event_key: str, title: str, body: str
    ) -> dict[str, Any]:
        server_url = target["server_url"].rstrip("/")
        device_key = self.secrets.decrypt(target["device_key_encrypted"])
        status = "sent"
        detail = ""
        try:
            async with httpx.AsyncClient(
                timeout=10, follow_redirects=False, verify=bool(target["verify_tls"])
            ) as client:
                response = await client.post(
                    f"{server_url}/push",
                    json={
                        "device_key": device_key,
                        "title": title,
                        "body": body,
                        "group": "Stackstead",
                    },
                )
                response.raise_for_status()
        except Exception as exc:
            status = "failed"
            detail = str(exc)[:500]

        self.database.execute(
            """
            INSERT INTO notification_log(target_id,event_key,title,status,detail,created_at)
            VALUES(?,?,?,?,?,?)
            """,
            (target["id"], event_key, title, status, detail, utc_now()),
        )
        return {"targetId": target["id"], "status": status, "detail": detail}
