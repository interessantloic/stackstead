# Changelog

All notable changes to Stackstead will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-08-10

### Added

- Added manually generated offline deployment bundles containing per-architecture Docker image archives and pull-free Compose configuration.
- Added configurable four-band upload and download gauges with persisted daily peaks.
- Added global traffic colors for gauges, gradient area charts, tooltips, and ranking bars.
- Added 30-minute, 1-hour, 6-hour, and 24-hour traffic chart ranges with adaptive axes and hover details.
- Added daily and live downloader share charts, daily traffic rankings, and 90-day daily history drill-downs with per-downloader 24-hour curves.

### Changed

- Moved downloader management and all traffic presentation settings into the Settings page.
- Changed traffic accumulation to integrate actual polling intervals and retain samples, daily totals, and peaks for 90 days.

### Planned

- Reporter one-command installation and remote deployment testing.

## [0.1.1] - 2026-08-10

### Added

- Added automated GHCR publishing for versioned `linux/amd64` and `linux/arm64` images with provenance and SBOM attestations.
- Added an explicit Compose override for developers who need to build from source.

### Changed

- Changed the default Compose deployment to pull the fixed public `ghcr.io/interessantloic/stackstead:0.1.1` image instead of building on the target NAS.
- Documented the Docker registry mirror failure mode encountered during remote FNOS deployment testing.

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

[Unreleased]: https://github.com/interessantloic/stackstead/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/interessantloic/stackstead/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/interessantloic/stackstead/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/interessantloic/stackstead/releases/tag/v0.1.0
