from __future__ import annotations

import asyncio
import json
import mimetypes
import os
import re
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Annotated, Any, Literal
from urllib.parse import urlparse
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import Cookie, Depends, FastAPI, File, Header, HTTPException, Request, Response, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator

from app.config import Config
from app.database import Database, utc_now
from app.ipv6 import select_public_ipv6
from app.security import SecretBox, hash_password, new_token, token_hash, verify_password
from app.services.downloaders import DownloaderMonitor
from app.services.notifications import EVENT_KEYS, NotificationService


config = Config.from_env()
config.data_dir.mkdir(parents=True, exist_ok=True)
config.uploads_dir.mkdir(parents=True, exist_ok=True)
database = Database(config.database_path)
database.initialize()
secrets = SecretBox(config.secret_key_path)
notifications = NotificationService(database, secrets)
monitor = DownloaderMonitor(
    database,
    secrets,
    config.poll_interval_seconds,
    config.sample_interval_seconds,
    notifications.send_event,
)
static_dir = Path(__file__).resolve().parent / "static"
reporter_path = Path(__file__).resolve().parent.parent / "reporters" / "ipv6_report.sh"
ipv6_stale_task: asyncio.Task[None] | None = None


@asynccontextmanager
async def lifespan(_: FastAPI):
    monitor.start()
    await _sync_ipv6_worker(ipv6_feature_enabled())
    yield
    await _sync_ipv6_worker(False)
    await monitor.stop()


app = FastAPI(title="Stackstead", docs_url=None, redoc_url=None, lifespan=lifespan)
app.mount("/uploads", StaticFiles(directory=config.uploads_dir), name="uploads")


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "same-origin"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; "
        "base-uri 'self'; form-action 'self'"
    )
    if request.url.path.startswith("/api/") or request.url.path in {"/", "/index.html"}:
        response.headers["Cache-Control"] = "no-store"
    return response


class SetupPayload(BaseModel):
    username: str = Field(min_length=3, max_length=64, pattern=r"^[^\s]+$")
    password: str = Field(min_length=10, max_length=256)
    language: Literal["zh-CN", "en"] = "zh-CN"
    timezone: str = Field(default="Asia/Shanghai", min_length=1, max_length=64)
    app_name: str = Field(default="Stackstead", min_length=1, max_length=80)
    enable_ipv6: bool = False
    first_device_name: str | None = Field(default=None, max_length=100)

    @field_validator("timezone")
    @classmethod
    def valid_timezone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError as exc:
            raise ValueError("Unknown timezone") from exc
        return value


class LoginPayload(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=256)


class DownloaderPayload(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    kind: Literal["qbittorrent", "transmission"]
    base_url: str = Field(min_length=8, max_length=500)
    username: str = Field(default="", max_length=256)
    password: str | None = Field(default=None, max_length=512)
    rpc_path: str = Field(default="/transmission/rpc", max_length=200)
    color: str = Field(default="#2563eb", pattern=r"^#[0-9a-fA-F]{6}$")
    enabled: bool = True
    verify_tls: bool = True

    @field_validator("base_url")
    @classmethod
    def valid_url(cls, value: str) -> str:
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            raise ValueError("Only absolute HTTP(S) URLs are accepted")
        if parsed.username or parsed.password:
            raise ValueError("Put credentials in the username/password fields")
        return value.rstrip("/")


class BarkPayload(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    server_url: str = Field(min_length=8, max_length=500)
    device_key: str | None = Field(default=None, max_length=512)
    enabled: bool = True
    verify_tls: bool = True
    events: dict[str, bool] = Field(default_factory=dict)

    @field_validator("server_url")
    @classmethod
    def valid_server_url(cls, value: str) -> str:
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            raise ValueError("Only absolute HTTP(S) URLs are accepted")
        return value.rstrip("/")


class IPv6Report(BaseModel):
    device: str | None = Field(default=None, max_length=100)
    device_name: str | None = Field(default=None, max_length=100)
    ipv6: str | None = Field(default=None, max_length=100)
    primary_ipv6: str | None = Field(default=None, max_length=100)
    prefix64: str | None = Field(default=None, max_length=100)
    ipv6_list: list[str] = Field(default_factory=list, max_length=64)
    timestamp: str | None = Field(default=None, max_length=80)


class IPv6DevicePayload(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    stale_after_minutes: int = Field(default=150, ge=60, le=10080)
    enabled: bool = True


class GeneralSettings(BaseModel):
    app_name: str = Field(min_length=1, max_length=80)
    language: Literal["zh-CN", "en"]
    timezone: str = Field(min_length=1, max_length=64)

    @field_validator("timezone")
    @classmethod
    def valid_timezone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError as exc:
            raise ValueError("Unknown timezone") from exc
        return value


class FeatureSettings(BaseModel):
    ipv6_enabled: bool


class TrafficSettings(BaseModel):
    upload_color: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    download_color: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    upload_max_mbps: float = Field(gt=0, le=100000)
    download_max_mbps: float = Field(gt=0, le=100000)


def initialized() -> bool:
    return bool(database.fetchone("SELECT id FROM users LIMIT 1"))


def ipv6_feature_enabled() -> bool:
    configured = database.setting("ipv6_enabled", None)
    if configured is None:
        return initialized()
    return bool(configured)


def require_ipv6_feature() -> None:
    if not ipv6_feature_enabled():
        raise HTTPException(status_code=404, detail="IPv6 monitoring is disabled")


def app_settings() -> dict[str, Any]:
    return {
        "appName": database.setting("app_name", "Stackstead"),
        "language": database.setting("language", "zh-CN"),
        "timezone": database.setting("timezone", "Asia/Shanghai"),
        "ipv6Enabled": ipv6_feature_enabled(),
        "pollSeconds": config.poll_interval_seconds,
        "sampleSeconds": config.sample_interval_seconds,
        "trafficUploadColor": database.setting("traffic_upload_color", "#205DA6"),
        "trafficDownloadColor": database.setting("traffic_download_color", "#0E8E3F"),
        "trafficUploadMaxMbps": database.setting("traffic_upload_max_mbps", 12.5),
        "trafficDownloadMaxMbps": database.setting("traffic_download_max_mbps", 125),
    }


def current_user(
    session: Annotated[str | None, Cookie(alias="stackstead_session")] = None,
) -> dict[str, Any]:
    if not session:
        raise HTTPException(status_code=401, detail="Authentication required")
    row = database.fetchone(
        """
        SELECT u.id,u.username,s.expires_at FROM sessions s
        JOIN users u ON u.id=s.user_id WHERE s.token_hash=?
        """,
        (token_hash(session),),
    )
    if not row or row["expires_at"] <= utc_now():
        raise HTTPException(status_code=401, detail="Session expired")
    return row


def require_csrf(
    request: Request,
    csrf_cookie: Annotated[str | None, Cookie(alias="stackstead_csrf")] = None,
    csrf_header: Annotated[str | None, Header(alias="X-CSRF-Token")] = None,
) -> None:
    if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
            raise HTTPException(status_code=403, detail="CSRF validation failed")


def admin_write(
    request: Request,
    user: Annotated[dict[str, Any], Depends(current_user)],
    _: Annotated[None, Depends(require_csrf)],
) -> dict[str, Any]:
    return user


def set_auth_cookies(response: Response, user_id: int) -> None:
    raw_session = new_token()
    csrf = new_token(18)
    expires = datetime.now(UTC) + timedelta(days=config.session_days)
    database.execute(
        "INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)",
        (token_hash(raw_session), user_id, expires.isoformat(timespec="seconds"), utc_now()),
    )
    response.set_cookie(
        "stackstead_session", raw_session, max_age=config.session_days * 86400,
        httponly=True, samesite="lax", secure=config.secure_cookies, path="/",
    )
    response.set_cookie(
        "stackstead_csrf", csrf, max_age=config.session_days * 86400,
        httponly=False, samesite="lax", secure=config.secure_cookies, path="/",
    )


@app.get("/health")
def health() -> dict[str, Any]:
    database.fetchone("SELECT 1 ok")
    return {"ok": True, "initialized": initialized()}


@app.get("/api/bootstrap")
def bootstrap() -> dict[str, Any]:
    return {"initialized": initialized(), "settings": app_settings()}


@app.post("/api/setup", status_code=201)
async def setup(payload: SetupPayload, response: Response) -> dict[str, Any]:
    with database.connect() as connection:
        connection.execute("BEGIN IMMEDIATE")
        if connection.execute("SELECT id FROM users LIMIT 1").fetchone():
            connection.execute("ROLLBACK")
            raise HTTPException(status_code=409, detail="Setup is already complete")
        cursor = connection.execute(
            "INSERT INTO users(username,password_hash,created_at) VALUES(?,?,?)",
            (payload.username, hash_password(payload.password), utc_now()),
        )
        user_id = int(cursor.lastrowid)
        report_token = None
        now = utc_now()
        for key, value in (
            ("app_name", payload.app_name), ("language", payload.language),
            ("timezone", payload.timezone), ("ipv6_enabled", payload.enable_ipv6),
        ):
            connection.execute(
                "INSERT INTO app_settings(key,value,updated_at) VALUES(?,?,?)",
                (key, _json(value), now),
            )
        if payload.enable_ipv6 and payload.first_device_name and payload.first_device_name.strip():
            report_token = new_token()
            connection.execute(
                """
                INSERT INTO ipv6_devices(
                    name,token_hash,stale_after_minutes,enabled,updated_at,created_at
                ) VALUES(?,?,?,?,?,?)
                """,
                (payload.first_device_name.strip(), token_hash(report_token), 150, 1, now, now),
            )
        connection.execute("COMMIT")
    await _sync_ipv6_worker(payload.enable_ipv6)
    set_auth_cookies(response, user_id)
    return {"ok": True, "ipv6ReportToken": report_token, "settings": app_settings()}


@app.post("/api/login")
def login(payload: LoginPayload, response: Response) -> dict[str, Any]:
    row = database.fetchone("SELECT * FROM users WHERE username=?", (payload.username,))
    if not row or not verify_password(payload.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    database.execute("DELETE FROM sessions WHERE expires_at <= ?", (utc_now(),))
    set_auth_cookies(response, row["id"])
    return {"ok": True, "user": {"username": row["username"]}}


@app.post("/api/logout")
def logout(
    response: Response,
    session: Annotated[str | None, Cookie(alias="stackstead_session")] = None,
    _: Annotated[dict[str, Any], Depends(admin_write)] = None,
) -> dict[str, bool]:
    if session:
        database.execute("DELETE FROM sessions WHERE token_hash=?", (token_hash(session),))
    response.delete_cookie("stackstead_session", path="/")
    response.delete_cookie("stackstead_csrf", path="/")
    return {"ok": True}


@app.get("/api/me")
def me(user: Annotated[dict[str, Any], Depends(current_user)]) -> dict[str, Any]:
    return {"username": user["username"], "settings": app_settings()}


@app.get("/api/dashboard")
def dashboard(_: Annotated[dict[str, Any], Depends(current_user)]) -> dict[str, Any]:
    traffic = monitor.snapshot()
    ipv6 = None
    if ipv6_feature_enabled():
        ipv6_summary = database.fetchone(
            """
            SELECT COUNT(*) device_count,
            COALESCE(SUM(CASE WHEN last_reported_at >= ? THEN 1 ELSE 0 END),0) active_24h
            FROM ipv6_devices
            """,
            ((datetime.now(UTC) - timedelta(hours=24)).isoformat(),),
        )
        latest_change = database.fetchone(
            "SELECT recorded_at FROM ipv6_history WHERE changed=1 ORDER BY recorded_at DESC LIMIT 1"
        )
        ipv6 = {
            **(ipv6_summary or {}),
            "lastChangeAt": latest_change["recorded_at"] if latest_change else None,
        }
    return {
        "traffic": traffic,
        "ipv6": ipv6,
        "settings": app_settings(),
    }


@app.get("/api/traffic/history")
def traffic_history(
    range: str = "24h",
    hours: int | None = None,
    downloader_id: int | None = None,
    _: Annotated[dict[str, Any], Depends(current_user)] = None,
) -> dict[str, Any]:
    ranges = {"30m": 1800, "1h": 3600, "6h": 21600, "24h": 86400}
    seconds = max(3600, min(hours * 3600, monitor.retention_days * 86400)) if hours is not None else ranges.get(range)
    if seconds is None:
        raise HTTPException(status_code=422, detail="Unsupported traffic history range")
    if downloader_id is not None and not database.fetchone("SELECT id FROM downloaders WHERE id=?", (downloader_id,)):
        raise HTTPException(status_code=404, detail="Downloader not found")
    return {"range": range, "items": monitor.history(seconds, downloader_id)}


@app.get("/api/traffic/daily")
def traffic_daily_history(
    limit: int = 90,
    _: Annotated[dict[str, Any], Depends(current_user)] = None,
) -> dict[str, Any]:
    return {"retentionDays": monitor.retention_days, "items": monitor.daily_history(limit)}


@app.get("/api/traffic/daily/{date_key}")
def traffic_daily_detail(
    date_key: str,
    downloader_id: int | None = None,
    _: Annotated[dict[str, Any], Depends(current_user)] = None,
) -> dict[str, Any]:
    if downloader_id is not None and not database.fetchone("SELECT id FROM downloaders WHERE id=?", (downloader_id,)):
        raise HTTPException(status_code=404, detail="Downloader not found")
    try:
        return monitor.daily_detail(date_key, downloader_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/api/downloaders")
def list_downloaders(_: Annotated[dict[str, Any], Depends(current_user)]) -> dict[str, Any]:
    rows = database.fetchall("SELECT * FROM downloaders ORDER BY id")
    return {"items": [_public_downloader(row) for row in rows]}


@app.post("/api/downloaders", status_code=201)
def create_downloader(
    payload: DownloaderPayload,
    _: Annotated[dict[str, Any], Depends(admin_write)],
) -> dict[str, Any]:
    now = utc_now()
    item_id = database.execute(
        """
        INSERT INTO downloaders(name,kind,base_url,username,password_encrypted,rpc_path,color,verify_tls,enabled,created_at,updated_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?)
        """,
        (
            payload.name, payload.kind, payload.base_url, payload.username,
            secrets.encrypt(payload.password), payload.rpc_path, payload.color,
            int(payload.verify_tls), int(payload.enabled), now, now,
        ),
    )
    return {"item": _public_downloader(database.fetchone("SELECT * FROM downloaders WHERE id=?", (item_id,)))}


@app.put("/api/downloaders/{item_id}")
def update_downloader(
    item_id: int,
    payload: DownloaderPayload,
    _: Annotated[dict[str, Any], Depends(admin_write)],
) -> dict[str, Any]:
    existing = database.fetchone("SELECT * FROM downloaders WHERE id=?", (item_id,))
    if not existing:
        raise HTTPException(status_code=404, detail="Downloader not found")
    encrypted = existing["password_encrypted"] if payload.password is None else secrets.encrypt(payload.password)
    database.execute(
        """
        UPDATE downloaders SET name=?,kind=?,base_url=?,username=?,password_encrypted=?,rpc_path=?,
        color=?,verify_tls=?,enabled=?,updated_at=? WHERE id=?
        """,
        (
            payload.name, payload.kind, payload.base_url, payload.username, encrypted,
            payload.rpc_path, payload.color, int(payload.verify_tls), int(payload.enabled),
            utc_now(), item_id,
        ),
    )
    return {"item": _public_downloader(database.fetchone("SELECT * FROM downloaders WHERE id=?", (item_id,)))}


@app.delete("/api/downloaders/{item_id}")
def delete_downloader(
    item_id: int,
    _: Annotated[dict[str, Any], Depends(admin_write)],
) -> dict[str, bool]:
    if not database.fetchone("SELECT id FROM downloaders WHERE id=?", (item_id,)):
        raise HTTPException(status_code=404, detail="Downloader not found")
    database.execute("DELETE FROM downloaders WHERE id=?", (item_id,))
    return {"ok": True}


@app.post("/api/downloaders/{item_id}/test")
async def test_downloader(
    item_id: int,
    _: Annotated[dict[str, Any], Depends(admin_write)],
) -> dict[str, Any]:
    try:
        result = await monitor.test_downloader(item_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {"ok": True, **result}


@app.post("/api/downloaders/{item_id}/image")
async def upload_downloader_image(
    item_id: int,
    image: Annotated[UploadFile, File()],
    _: Annotated[dict[str, Any], Depends(admin_write)],
) -> dict[str, Any]:
    existing = database.fetchone("SELECT * FROM downloaders WHERE id=?", (item_id,))
    if not existing:
        raise HTTPException(status_code=404, detail="Downloader not found")
    content = await image.read(config.max_upload_bytes + 1)
    if len(content) > config.max_upload_bytes:
        raise HTTPException(status_code=413, detail="Image is too large")
    extension = _image_extension(content)
    if not extension:
        raise HTTPException(status_code=415, detail="Only PNG, JPEG, WebP and GIF images are accepted")
    filename = f"downloader-{item_id}-{new_token(8)}.{extension}"
    target = config.uploads_dir / filename
    target.write_bytes(content)
    try:
        os.chmod(target, 0o600)
    except PermissionError:
        pass
    previous = existing["image_name"]
    database.execute("UPDATE downloaders SET image_name=?,updated_at=? WHERE id=?", (filename, utc_now(), item_id))
    if previous and re.fullmatch(r"downloader-[0-9]+-[A-Za-z0-9_-]+\.(png|jpg|webp|gif)", previous):
        (config.uploads_dir / previous).unlink(missing_ok=True)
    return {"imageUrl": f"/uploads/{filename}"}


@app.get("/api/ipv6/devices")
def ipv6_devices(_: Annotated[dict[str, Any], Depends(current_user)]) -> dict[str, Any]:
    require_ipv6_feature()
    rows = database.fetchall(
        """
        SELECT d.*,
          (SELECT COUNT(*) FROM ipv6_history h WHERE h.device_id=d.id AND h.changed=1) change_count
        FROM ipv6_devices d ORDER BY d.name
        """
    )
    return {"items": [_camel_ipv6(row) for row in rows]}


@app.get("/api/ipv6/reporter")
def download_ipv6_reporter(
    _: Annotated[dict[str, Any], Depends(current_user)],
) -> FileResponse:
    require_ipv6_feature()
    return FileResponse(
        reporter_path,
        media_type="text/x-shellscript",
        filename="stackstead-ipv6-reporter.sh",
    )


@app.post("/api/ipv6/devices", status_code=201)
def create_ipv6_device(
    payload: IPv6DevicePayload,
    _: Annotated[dict[str, Any], Depends(admin_write)],
) -> dict[str, Any]:
    require_ipv6_feature()
    report_token = new_token()
    now = utc_now()
    try:
        device_id = database.execute(
            """
            INSERT INTO ipv6_devices(name,token_hash,stale_after_minutes,enabled,updated_at,created_at)
            VALUES(?,?,?,?,?,?)
            """,
            (
                payload.name.strip(), token_hash(report_token), payload.stale_after_minutes,
                int(payload.enabled), now, now,
            ),
        )
    except Exception as exc:
        if "UNIQUE constraint failed" in str(exc):
            raise HTTPException(status_code=409, detail="Device name already exists") from exc
        raise
    return {"id": device_id, "token": report_token}


@app.put("/api/ipv6/devices/{device_id}")
def update_ipv6_device(
    device_id: int,
    payload: IPv6DevicePayload,
    _: Annotated[dict[str, Any], Depends(admin_write)],
) -> dict[str, bool]:
    require_ipv6_feature()
    if not database.fetchone("SELECT id FROM ipv6_devices WHERE id=?", (device_id,)):
        raise HTTPException(status_code=404, detail="IPv6 device not found")
    try:
        database.execute(
            "UPDATE ipv6_devices SET name=?,stale_after_minutes=?,enabled=?,updated_at=? WHERE id=?",
            (payload.name.strip(), payload.stale_after_minutes, int(payload.enabled), utc_now(), device_id),
        )
    except Exception as exc:
        if "UNIQUE constraint failed" in str(exc):
            raise HTTPException(status_code=409, detail="Device name already exists") from exc
        raise
    return {"ok": True}


@app.delete("/api/ipv6/devices/{device_id}")
def delete_ipv6_device(
    device_id: int,
    _: Annotated[dict[str, Any], Depends(admin_write)],
) -> dict[str, bool]:
    require_ipv6_feature()
    if not database.fetchone("SELECT id FROM ipv6_devices WHERE id=?", (device_id,)):
        raise HTTPException(status_code=404, detail="IPv6 device not found")
    database.execute("DELETE FROM ipv6_devices WHERE id=?", (device_id,))
    return {"ok": True}


@app.get("/api/ipv6/devices/{device_id}/history")
def ipv6_device_history(
    device_id: int,
    limit: int = 100,
    _: Annotated[dict[str, Any], Depends(current_user)] = None,
) -> dict[str, Any]:
    require_ipv6_feature()
    limit = max(1, min(1000, limit))
    rows = database.fetchall(
        "SELECT * FROM ipv6_history WHERE device_id=? ORDER BY recorded_at DESC LIMIT ?",
        (device_id, limit),
    )
    return {
        "items": [
            {**row, "ipv6_list": _json_loads(row.get("ipv6_list"), [])}
            for row in rows
        ]
    }


@app.post("/api/ipv6/report", status_code=201)
async def ipv6_report(
    payload: IPv6Report,
    authorization: Annotated[str | None, Header()] = None,
) -> dict[str, Any]:
    require_ipv6_feature()
    scheme, _, supplied = authorization.partition(" ") if authorization else ("", "", "")
    if scheme.lower() != "bearer" or not supplied:
        raise HTTPException(status_code=401, detail="Invalid report token")
    device = database.fetchone(
        "SELECT * FROM ipv6_devices WHERE token_hash=? AND enabled=1",
        (token_hash(supplied.strip()),),
    )
    if not device:
        raise HTTPException(status_code=401, detail="Invalid report token")
    primary_ipv6, prefix64, normalized_list = select_public_ipv6(
        payload.primary_ipv6, payload.ipv6, payload.ipv6_list
    )
    now = utc_now()
    with database.connect() as connection:
        connection.execute("BEGIN IMMEDIATE")
        current = connection.execute("SELECT * FROM ipv6_devices WHERE id=?", (device["id"],)).fetchone()
        old_ipv6 = current["current_ipv6"]
        old_prefix = current["current_prefix64"]
        has_old_state = bool(current["last_reported_at"])
        changed = has_old_state and (old_ipv6 != primary_ipv6 or old_prefix != prefix64)
        was_stale = bool(current["stale_notified_at"])
        connection.execute(
            """
            UPDATE ipv6_devices SET current_ipv6=?,current_prefix64=?,current_ipv6_list=?,
            last_reported_at=?,stale_notified_at=NULL,updated_at=? WHERE id=?
            """,
            (primary_ipv6, prefix64, _json(normalized_list), now, now, device["id"]),
        )
        connection.execute(
            """
            INSERT INTO ipv6_history(
                device_id,recorded_at,source_timestamp,ipv6,prefix64,ipv6_list,
                old_ipv6,old_prefix64,changed,should_notify,raw_json
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                device["id"], now, payload.timestamp, primary_ipv6, prefix64,
                _json(normalized_list), old_ipv6, old_prefix, int(changed), int(changed),
                _json(payload.model_dump()),
            ),
        )
        connection.execute("COMMIT")
    if changed:
        event_key = "ipv6_missing" if not primary_ipv6 else ("ipv6_recovered" if not old_ipv6 else "ipv6_changed")
        asyncio.create_task(_notify_ipv6_change(event_key, device["name"], old_ipv6, primary_ipv6, old_prefix, prefix64))
    elif was_stale:
        asyncio.create_task(
            notifications.send_event(
                "ipv6_recovered", "IPv6 reporting recovered", f"{device['name']} is reporting again."
            )
        )
    return {
        "ok": True, "device": device["name"], "changed": changed,
        "primary_ipv6": primary_ipv6, "prefix64": prefix64, "ipv6_list": normalized_list,
    }


@app.post("/api/ipv6/devices/{device_id}/token/rotate")
def rotate_ipv6_token(
    device_id: int,
    _: Annotated[dict[str, Any], Depends(admin_write)],
) -> dict[str, str]:
    require_ipv6_feature()
    if not database.fetchone("SELECT id FROM ipv6_devices WHERE id=?", (device_id,)):
        raise HTTPException(status_code=404, detail="IPv6 device not found")
    token = new_token()
    database.execute(
        "UPDATE ipv6_devices SET token_hash=?,updated_at=? WHERE id=?",
        (token_hash(token), utc_now(), device_id),
    )
    return {"token": token}


@app.get("/api/notifications")
def list_notifications(_: Annotated[dict[str, Any], Depends(current_user)]) -> dict[str, Any]:
    targets = database.fetchall("SELECT * FROM bark_targets ORDER BY id")
    preferences = database.fetchall("SELECT * FROM notification_preferences")
    by_target: dict[int, dict[str, bool]] = {}
    for item in preferences:
        by_target.setdefault(item["target_id"], {})[item["event_key"]] = bool(item["enabled"])
    items = [
        {
            "id": row["id"], "name": row["name"], "serverUrl": row["server_url"],
            "enabled": bool(row["enabled"]), "verifyTls": bool(row["verify_tls"]),
            "hasDeviceKey": bool(row["device_key_encrypted"]),
            "events": {key: by_target.get(row["id"], {}).get(key, False) for key in EVENT_KEYS},
        }
        for row in targets
    ]
    return {"items": items, "eventKeys": EVENT_KEYS}


@app.post("/api/notifications", status_code=201)
def create_notification(
    payload: BarkPayload,
    _: Annotated[dict[str, Any], Depends(admin_write)],
) -> dict[str, Any]:
    if not payload.device_key:
        raise HTTPException(status_code=422, detail="Device key is required")
    now = utc_now()
    target_id = database.execute(
        "INSERT INTO bark_targets(name,server_url,device_key_encrypted,verify_tls,enabled,created_at,updated_at) VALUES(?,?,?,?,?,?,?)",
        (
            payload.name, payload.server_url, secrets.encrypt(payload.device_key),
            int(payload.verify_tls), int(payload.enabled), now, now,
        ),
    )
    _save_preferences(target_id, payload.events)
    return {"id": target_id}


@app.put("/api/notifications/{target_id}")
def update_notification(
    target_id: int,
    payload: BarkPayload,
    _: Annotated[dict[str, Any], Depends(admin_write)],
) -> dict[str, bool]:
    existing = database.fetchone("SELECT * FROM bark_targets WHERE id=?", (target_id,))
    if not existing:
        raise HTTPException(status_code=404, detail="Notification target not found")
    device_key = existing["device_key_encrypted"] if payload.device_key is None else secrets.encrypt(payload.device_key)
    database.execute(
        "UPDATE bark_targets SET name=?,server_url=?,device_key_encrypted=?,verify_tls=?,enabled=?,updated_at=? WHERE id=?",
        (
            payload.name, payload.server_url, device_key, int(payload.verify_tls),
            int(payload.enabled), utc_now(), target_id,
        ),
    )
    _save_preferences(target_id, payload.events)
    return {"ok": True}


@app.delete("/api/notifications/{target_id}")
def delete_notification(
    target_id: int,
    _: Annotated[dict[str, Any], Depends(admin_write)],
) -> dict[str, bool]:
    database.execute("DELETE FROM bark_targets WHERE id=?", (target_id,))
    return {"ok": True}


@app.post("/api/notifications/{target_id}/test")
async def test_notification(
    target_id: int,
    _: Annotated[dict[str, Any], Depends(admin_write)],
) -> dict[str, Any]:
    try:
        result = await notifications.test_target(target_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    if result["status"] != "sent":
        raise HTTPException(status_code=502, detail=result["detail"] or "Bark rejected the request")
    return {"ok": True}


@app.put("/api/settings/general")
def update_general(
    payload: GeneralSettings,
    _: Annotated[dict[str, Any], Depends(admin_write)],
) -> dict[str, Any]:
    timezone_changed = payload.timezone != database.setting("timezone", "Asia/Shanghai")
    database.set_setting("app_name", payload.app_name)
    database.set_setting("language", payload.language)
    database.set_setting("timezone", payload.timezone)
    if timezone_changed:
        monitor.rebuild_daily_rollups()
    return app_settings()


@app.put("/api/settings/traffic")
def update_traffic_settings(
    payload: TrafficSettings,
    _: Annotated[dict[str, Any], Depends(admin_write)],
) -> dict[str, Any]:
    database.set_setting("traffic_upload_color", payload.upload_color.upper())
    database.set_setting("traffic_download_color", payload.download_color.upper())
    database.set_setting("traffic_upload_max_mbps", payload.upload_max_mbps)
    database.set_setting("traffic_download_max_mbps", payload.download_max_mbps)
    return app_settings()


@app.put("/api/settings/features")
async def update_features(
    payload: FeatureSettings,
    _: Annotated[dict[str, Any], Depends(admin_write)],
) -> dict[str, Any]:
    database.set_setting("ipv6_enabled", payload.ipv6_enabled)
    await _sync_ipv6_worker(payload.ipv6_enabled)
    return app_settings()


def _save_preferences(target_id: int, events: dict[str, bool]) -> None:
    with database.connect() as connection:
        connection.execute("BEGIN")
        for key in EVENT_KEYS:
            connection.execute(
                """
                INSERT INTO notification_preferences(target_id,event_key,enabled) VALUES(?,?,?)
                ON CONFLICT(target_id,event_key) DO UPDATE SET enabled=excluded.enabled
                """,
                (target_id, key, int(bool(events.get(key, False)))),
            )
        connection.execute("COMMIT")


def _public_downloader(row: dict[str, Any] | None) -> dict[str, Any]:
    if not row:
        return {}
    return {
        "id": row["id"], "name": row["name"], "kind": row["kind"],
        "baseUrl": row["base_url"], "username": row["username"],
        "hasPassword": bool(row["password_encrypted"]), "rpcPath": row["rpc_path"],
        "imageUrl": f"/uploads/{row['image_name']}" if row["image_name"] else None,
        "color": row["color"], "verifyTls": bool(row["verify_tls"]),
        "enabled": bool(row["enabled"]),
    }


def _camel_ipv6(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"], "name": row["name"], "currentIpv6": row["current_ipv6"],
        "currentPrefix64": row["current_prefix64"], "lastReportedAt": row["last_reported_at"],
        "ipv6List": _json_loads(row.get("current_ipv6_list"), []),
        "changeCount": row["change_count"], "staleAfterMinutes": row["stale_after_minutes"],
        "stale": bool(row["stale_notified_at"]), "enabled": bool(row["enabled"]),
    }


async def _notify_ipv6_change(
    event_key: str,
    device_name: str,
    old_ipv6: str | None,
    new_ipv6: str | None,
    old_prefix: str | None,
    new_prefix: str | None,
) -> None:
    language = database.setting("language", "zh-CN")
    if language == "zh-CN":
        title = {
            "ipv6_missing": f"IPv6 地址丢失：{device_name}",
            "ipv6_recovered": f"IPv6 地址恢复：{device_name}",
        }.get(event_key, f"IPv6 发生变化：{device_name}")
        body = (
            f"设备：{device_name}\n旧 IPv6：{old_ipv6 or '-'}\n新 IPv6：{new_ipv6 or '-'}\n"
            f"旧前缀：{old_prefix or '-'}\n新前缀：{new_prefix or '-'}\n记录时间：{utc_now()}"
        )
    else:
        title = {
            "ipv6_missing": f"IPv6 address missing: {device_name}",
            "ipv6_recovered": f"IPv6 address recovered: {device_name}",
        }.get(event_key, f"IPv6 address changed: {device_name}")
        body = (
            f"Device: {device_name}\nOld IPv6: {old_ipv6 or '-'}\nNew IPv6: {new_ipv6 or '-'}\n"
            f"Old prefix: {old_prefix or '-'}\nNew prefix: {new_prefix or '-'}\nRecorded: {utc_now()}"
        )
    await notifications.send_event(event_key, title, body)


async def _stale_device_loop() -> None:
    while True:
        try:
            now = datetime.now(UTC)
            devices = database.fetchall(
                """
                SELECT * FROM ipv6_devices
                WHERE enabled=1 AND last_reported_at IS NOT NULL AND stale_notified_at IS NULL
                """
            )
            for device in devices:
                try:
                    last_reported = datetime.fromisoformat(device["last_reported_at"])
                except (TypeError, ValueError):
                    continue
                if now - last_reported < timedelta(minutes=device["stale_after_minutes"]):
                    continue
                database.execute(
                    "UPDATE ipv6_devices SET stale_notified_at=?,updated_at=? WHERE id=? AND stale_notified_at IS NULL",
                    (utc_now(), utc_now(), device["id"]),
                )
                title = (
                    f"IPv6 上报中断：{device['name']}"
                    if database.setting("language", "zh-CN") == "zh-CN"
                    else f"IPv6 reporting stale: {device['name']}"
                )
                await notifications.send_event(
                    "ipv6_stale", title,
                    f"No report received for {device['stale_after_minutes']} minutes.",
                )
        except Exception as exc:
            print(f"IPv6 stale-device check failed: {exc}", flush=True)
        await asyncio.sleep(300)


async def _sync_ipv6_worker(enabled: bool) -> None:
    global ipv6_stale_task
    if enabled:
        if ipv6_stale_task is None or ipv6_stale_task.done():
            ipv6_stale_task = asyncio.create_task(_stale_device_loop())
        return
    if ipv6_stale_task is None:
        return
    ipv6_stale_task.cancel()
    try:
        await ipv6_stale_task
    except asyncio.CancelledError:
        pass
    ipv6_stale_task = None


def _image_extension(content: bytes) -> str | None:
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if content.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if content.startswith((b"GIF87a", b"GIF89a")):
        return "gif"
    if len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return "webp"
    return None


def _json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False)


def _json_loads(value: str | None, default: Any) -> Any:
    if not value:
        return default
    try:
        return json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return default


@app.get("/{path:path}", include_in_schema=False)
def spa(path: str) -> FileResponse:
    candidate = (static_dir / path).resolve()
    if path and candidate.is_relative_to(static_dir) and candidate.is_file():
        content_type, _ = mimetypes.guess_type(path)
        return FileResponse(candidate, media_type=content_type)
    return FileResponse(static_dir / "index.html", media_type="text/html")
