# Stackstead 离线部署

这个压缩包用于无法访问 Docker Hub 或 GHCR 的 Docker 主机。它包含已经构建好的 Stackstead 镜像，不需要也不应该再次构建 Dockerfile。

## FNOS 图形界面

1. 解压整个 ZIP 文件。
2. 在 FNOS Docker 的镜像管理页面导入 `stackstead-版本-linux-架构.tar`。
3. 确认本地镜像列表中出现 `stackstead:版本`。
4. 将解压后的整个目录复制到 NAS；目录中的 `.env` 必须与 `compose.yaml` 放在一起。
5. 从该目录创建 Compose 项目。不要选择“重新构建镜像”，也不要添加 `--build`。
6. 启动后打开配置的 Web 端口，完成首次设置。

离线 `compose.yaml` 和 `.env` 都已经固定为本地 `stackstead:版本` 镜像并禁止拉取，因此 Compose 只会使用刚导入的本地镜像，不会访问远程镜像仓库。

如果日志仍然出现 `load build definition from Dockerfile` 或 `FROM python:...`，说明 FNOS 使用的不是压缩包内的 `compose.yaml` 和 `.env`，或者旧 Compose 项目的构建配置仍在缓存。请新建一个 Compose 项目，并确认项目目录中没有 `Dockerfile`、`compose.build.yaml` 或旧版 `compose.override.yaml`。

## 命令行方式

```bash
docker load -i stackstead-版本-linux-架构.tar
docker compose up -d
```

`docker load` 完成后应显示已经载入 `stackstead:版本`。压缩包中的 `SHA256SUMS` 可用于核对镜像 tar 文件在复制过程中是否损坏。

## 选择架构

- Intel/AMD x86_64 NAS：使用 `linux-amd64` 压缩包。
- ARM NAS：使用 `linux-arm64` 压缩包。

可在 NAS SSH 中运行 `uname -m` 查看：`x86_64` 对应 `amd64`，`aarch64` 或 `arm64` 对应 `arm64`。
