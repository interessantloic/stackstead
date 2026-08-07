# Changelog

All notable changes to Stackstead will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- Reporter one-command installation and remote deployment testing are planned.

## [0.1.0] - 2026-08-07

### Added

- First-run setup with language, site, timezone, administrator, and optional IPv6 configuration.
- qBittorrent and Transmission multi-instance traffic monitoring with SQLite history.
- Per-device IPv6 reporting, `/64` prefix history, stale detection, and Bark events.
- Runtime-configurable IPv6 feature switch with disabled-module isolation.
- Multiple Bark-compatible notification targets with per-event preferences.
- Custom downloader artwork uploads and responsive Chinese/English interface.
- Docker Compose deployment using a non-root, read-only container and persistent `/data` boundary.

### Fixed

- Added a clipboard fallback for browsers that block the Clipboard API on local HTTP origins.

[Unreleased]: https://github.com/interessantloic/stackstead/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/interessantloic/stackstead/releases/tag/v0.1.0
