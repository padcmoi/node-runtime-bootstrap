# Changelog

## [Unreleased] - yyyy-mm-dd

- fix(registry): restore npm package visibility

## [1.0.1] - 2026-04-21

- Fix CI: align npm publish workflow with `node-hmac-auth` (tag-driven GitHub Actions publish path).
- Fix CI: synchronize `package-lock.json` for deterministic `npm ci`.

## [1.0.0] - 2026-04-20

- Refactor: remove PM2-specific helper from runtime API; `isMaster` is now fully user-defined at instantiation.
- Docs: make core documentation framework-agnostic and add dedicated guides for Express and NestJS.
- Initial release of the runtime bootstrap service for ordered initializer loading (`once` + `everyProcess`).
- Add dynamic `require` loader for `initializers` directory with PM2 master-aware execution strategy.
- Add unit tests and POC Express app (`poc/`) for dev/prod validation.

## 0.1.0

- Initial release of the framework-agnostic cron scheduler.
