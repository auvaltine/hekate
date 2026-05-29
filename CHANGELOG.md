# Changelog

## 1.0.7 - 2026-05-29

### Changed
- Raised the minimum supported Node.js version to 18.
- Added package exports for extension-less `hekate/*` server imports.
- Updated internal server imports to use extension-less `hekate/*` paths.
- Updated postinstall linking so `node_modules/hekate` points to the project root.
- Normalized import spacing across JavaScript and MJS files.
- Replaced single PID lookup with app-directory process matching.
- Updated start/stop commands to use multi-process PID detection.
- Hardened HTTPS certificate and key validation.
- Changed config storage to the `$value` tree setting model.
- Updated `app.get()` and `app.set()` for tree/value config access.
- Rebuilt `Object.prototype.walk()` for clearer tree traversal and creation.

### Fixed
- Preserved the opening `<head>` tag when injecting app metadata into templates.
- Updated generated app config to use the full host name for `app.set('domain')`.

### Removed
- Removed the fragile `cli/helpers/pid.mjs` helper.

## 1.0.6 - 2026-05-28

### Changed
- Split the root CLI file into command, helper, and constant modules.
- Added CLI command files for build, help, postinstall, restart, start, stop, and update.
- Added CLI helper files for domain parsing, downloads, file checks, loading status,
  module handling, prompts, scaffolding, shell commands, and version checks.
- Changed the default cluster setting to `1`.
- Allowed `cluster` to use `auto` for all available CPU cores.
- Ignored generated apps, node modules, and package lock files for library use.

### Removed
- Removed `package-lock.json` from version control.
