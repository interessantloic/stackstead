# Stackstead

面向 PT、NAS 与家庭网络的单容器自托管中控台。Stackstead 当前整合了下载器流量、动态 IPv6 地址记录和 Bark 通知。全部由Codex开发，名字都是他起的，本人是无代码能力的文科生，由于玩PT后的确有这种多个下载器流量监控等需求，所以开发了此项目。望各位大佬不吝赐教。

> Your homelab, in one place.

## 功能

- qBittorrent 与 Transmission 多实例实时上下行速率监控
- SQLite 本地流量采样、今日累计和 90 天趋势数据
- 可在首次向导或设置中完整开关的 IPv6 模块
- 每设备独立令牌的 IPv6 上报 API，记录完整地址列表及 `/64` 前缀变化
- 兼容原 n8n 逻辑的 Reporter：优先稳定 global 地址，并排除 temporary、deprecated、mngtmpaddr
- IPv6 上报失联检测、地址丢失与恢复通知
- 多 Bark Server / 设备码目标，按事件分别开关通知
- 管理员自行上传下载器展示图（PNG、JPEG、WebP、GIF）
- 简体中文 / English 响应式界面
- 首次启动向导、管理员登录和一次性 IPv6 上报令牌

本项目不包含 bark-server，也不会自动部署它。请连接你已有的 bark-server 或其他兼容 Bark API V2 的服务。

## 支持范围

- Docker Engine 与 Docker Compose v2
- GHCR 镜像提供 `linux/amd64` 与 `linux/arm64`；已在 x86_64 FNOS 主机运行，`arm64` 尚未实机验证
- 下载器：qBittorrent、Transmission
- IPv6 Reporter：具备 `sh`、`ip`、`awk`、`cut`、`sort` 和 `curl` 的 Linux 设备

## 数据与安全

所有持久数据都位于容器的 `/data`：

- `stackstead.db`：SQLite 数据库
- `.secret_key`：用于加密下载器密码和 Bark 设备码的本地密钥
- `uploads/`：管理员上传的图片

管理员密码使用 scrypt 单向哈希。`.secret_key` 和数据库必须一起备份；丢失密钥后，已保存的下载器密码和 Bark 设备码无法恢复。建议只通过可信局域网访问，或在反向代理上启用 HTTPS。

镜像默认以非 root 的 `1000:1000` 运行；构建参数 `APP_UID` / `APP_GID` 可调整为宿主机项目目录的属主。在 HTTPS 反向代理后部署时，将 `STACKSTEAD_SECURE_COOKIES` 设为 `1`。

## 首次部署

1. 复制 `.env.example` 为 `.env`，按需调整端口、时区、UID/GID 和刷新间隔。
2. 运行 `docker compose pull` 拉取固定版本镜像，再运行 `docker compose up -d` 启动容器。
3. 打开 Web 地址，选择语言、站点名称和时区，创建管理员。
4. 选择是否启用 IPv6 监控；如启用，可创建第一台设备并保存只显示一次的设备令牌。
5. 登录后在“流量面板”添加下载器，在“通知服务”添加 Bark 目标。

默认 Compose 使用 Docker 命名卷 `stackstead-data`。NAS 用户若希望直接备份宿主机目录，可复制 `compose.bind.example.yaml` 为 `compose.override.yaml`，然后在 `.env` 中设置 `STACKSTEAD_DATA_PATH`。本地 `.env`、覆盖文件和数据目录均不会加入版本控制。

停止服务使用 `docker compose down`，数据会保留。不要在不准备清空数据时添加 `-v`。升级或迁移前应同时备份数据库和 `.secret_key`。

### 无法访问镜像仓库时

GitHub Release 同时提供 `amd64` 和 `arm64` 离线部署压缩包。压缩包内包含已经构建好的 Docker 镜像、专用 `.env`、Compose 文件和导入说明；导入镜像后不会访问 Docker Hub 或 GHCR，也不需要在 NAS 上构建 Python 基础镜像。请根据 NAS 架构下载名称中包含 `offline-linux-amd64` 或 `offline-linux-arm64` 的 ZIP 文件，具体步骤见[离线部署说明](docs/offline-deployment.md)。

## 配置

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `COMPOSE_PROJECT_NAME` | `stackstead` | Compose 项目名 |
| `STACKSTEAD_IMAGE` | `ghcr.io/interessantloic/stackstead:0.1.1` | 默认使用的固定版本公开镜像 |
| `STACKSTEAD_PULL_POLICY` | `missing` | 本地缺少镜像时才从仓库拉取 |
| `STACKSTEAD_BUILD_IMAGE` | `stackstead:dev` | 仅在源码构建覆盖配置中使用的本地镜像名 |
| `STACKSTEAD_BIND_ADDRESS` | `0.0.0.0` | 宿主机监听地址 |
| `STACKSTEAD_HTTP_PORT` | `8080` | Web 发布端口，范围 `1-65535` |
| `STACKSTEAD_RESTART_POLICY` | `unless-stopped` | 容器重启策略 |
| `PUID` / `PGID` | `1000` | 容器运行用户与组的数字 ID |
| `TZ` | `UTC` | IANA 时区，例如 `Asia/Shanghai` |
| `STACKSTEAD_DATA_PATH` | `./data` | 仅用于 bind mount 覆盖配置 |
| `STACKSTEAD_POLL_SECONDS` | `5` | 下载器实时轮询间隔，范围 `2-300` 秒 |
| `STACKSTEAD_SAMPLE_SECONDS` | `60` | 流量历史采样间隔，范围 `10-3600` 秒 |
| `STACKSTEAD_SESSION_DAYS` | `30` | 管理员会话有效期，范围 `1-365` 天 |
| `STACKSTEAD_MAX_UPLOAD_BYTES` | `2097152` | 下载器图片上限，范围 1 KiB-10 MiB |
| `STACKSTEAD_SECURE_COOKIES` | `0` | HTTPS 反向代理后设为 `1` |
| `STACKSTEAD_LOG_MAX_SIZE` | `10m` | 单个容器日志文件上限 |
| `STACKSTEAD_LOG_MAX_FILES` | `3` | 保留的容器日志文件数 |

下载器密码、Bark 设备码和 IPv6 上报令牌不通过环境变量配置：前两者在管理界面录入并加密保存，令牌只在创建或轮换时显示一次。

## IPv6 上报

IPv6 监控默认是可选功能。关闭后，Stackstead 会隐藏相关导航与总览数据、停止失联检查任务并拒绝新的设备上报；数据库中的设备及历史不会被删除，重新启用后可以继续使用。

Stackstead 容器采用安全、可移植的桥接网络，不能可靠读取宿主机或其他 NAS 的公网 IPv6。地址检测因此由轻量 Reporter 在每台目标设备上完成，不需要 `host` 网络、特权容器、Docker Socket、n8n、PostgreSQL 或第三方公网 IP 查询服务。

把 `reporters/ipv6_report.sh` 复制到 NAS、路由器或其他 Linux 设备，然后每小时定时运行：

```bash
STACKSTEAD_REPORT_URL='https://stackstead.example/api/ipv6/report' \
STACKSTEAD_DEVICE_TOKEN='YOUR_DEVICE_TOKEN' \
sh /path/to/ipv6_report.sh
```

每台设备使用独立令牌，服务端以令牌确定设备身份。令牌不是 IPv6 地址，也不能用于登录。首次上报用于建立基准，不触发变更通知；之后完整地址或 `/64` 前缀变化都会记录并可触发 Bark 通知。令牌可在 IPv6 设备列表中单独轮换或撤销。

设备当前没有公网 IPv6 时，Reporter 仍会成功上报空地址。Stackstead 会记录设备仍在线但 IPv6 为空；以后获得 IPv6 会被识别为恢复，已有 IPv6 消失则会被识别为丢失。若设备连上报都停止，才会触发“上报中断”。

Reporter 与原 n8n 工作流保持相同的主要选址行为：过滤临时、已弃用和 `mngtmpaddr` 地址，过滤结果为空时退回全部 global 地址。服务端再严格限制 `2000::/3` 公网单播范围，并使用标准 IPv6 解析计算 `/64`，避免压缩地址导致字符串切段错误。

## 健康检查、升级与恢复

- 健康检查地址为 `GET /health`，正常响应包含 `ok: true`。
- 升级发布版本时先更新 `.env` 中的固定镜像标签，再运行 `docker compose pull` 和 `docker compose up -d`；仅重启不会下载新镜像。
- 备份前建议停止服务，然后完整复制 `/data`，至少同时保存 `stackstead.db`、SQLite WAL 文件（若存在）、`.secret_key` 和 `uploads/`。
- 恢复时使用兼容版本镜像，将完整备份放回 `/data` 并保持容器运行用户可读写。

## 从源码构建

普通部署不需要在 NAS 上构建镜像。开发者若需要验证本地源码，可以显式叠加构建配置：

```bash
docker compose -f compose.yaml -f compose.build.yaml up -d --build
```

源码构建需要从 Docker Hub 获取 Python 基础镜像。如果日志中的请求被重定向到某个第三方镜像源并返回 `401 Unauthorized`，应检查 Docker 守护进程的 registry mirror 配置；这不是 Stackstead 应用代码或 Python 标签错误。FNOS 的 Docker 设置属于宿主机全局配置，修改前应确认其实际管理方式和对其他容器的影响。

如果日志仍然显示 `load build definition from Dockerfile`，则当前部署仍在使用源码构建配置，而不是默认的成品镜像 Compose。离线测试时请使用 Release 压缩包中不含 Dockerfile 的独立目录，避免 FNOS 继续复用旧项目配置。

## 已知限制

- IPv6 监控需要在每台目标设备上部署并定时运行 Reporter；当前尚未提供自动安装器。
- 当前仅支持一个初始化管理员，尚未提供多用户管理界面。
- 尚未完成 `arm64` 实机与浏览器矩阵验证；`arm64` 镜像由 GitHub Actions 交叉构建。

## 开发检查

```bash
python -m compileall app tests
node --check app/static/app.js
python -m unittest discover -s tests
```

## 来源整理说明

该项目从两个内部原型整合而来，但不包含原型中的真实 `.env`、PostgreSQL 连接信息、历史数据库、离线镜像包、Figma 预览文件或 `coco*.png`。运行时使用的图形均为 HTML/CSS/内联 SVG，下载器图片由管理员上传。

## License

Stackstead is licensed under the GNU Affero General Public License v3.0 only (`AGPL-3.0-only`). See `LICENSE`.
