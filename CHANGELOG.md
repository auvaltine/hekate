# Changelog

## Unreleased

### Added
- Added support for module exports as classes, instantiating `export default class` modules during load.
- Added support for async function modules returning a module object from `export default async function`.
- Added client socket `error` and `close` events.
- Added `socket.connect` emission when a WebSocket client connects.

### Fixed
- Fixed parent configuration reads so `app.get(<key>)` returns a plain object when only nested options are set.
- Fixed class module loading so constructors are not invoked without `new`.
- Fixed WebSocket secure redirects for upgrade requests.
- Fixed WebSocket listeners to access the current session from the socket.
- Fixed WebSocket handshake headers, frame length parsing, FIN checks, heartbeat cleanup, and missing socket listener fallback.
- Fixed socket message targeting across worker processes.
- Preserved WebSocket URL query strings in the client socket helper.
- Fixed module client asset compilation to avoid duplicate scripts when multiple `@client/*` entries share the same module root.

### Changed
- Changed module client asset lookup to fall back through dotted namespace prefixes.
- Changed module client JavaScript ordering so module-local client files are compiled before explicitly requested entries.

## 1.0.8 - 2026-05-31

### Added
- Added release note workflow documentation for mirrored changelog and annotated tag messages.
- Backfilled changelog entries from existing annotated tags.
- Added module config loading through `app.module()`.
- Added `template.favicon` with a default empty favicon.
- Added docblocks for client prototype methods.

### Fixed
- Fixed CLI domain path mapping so `hekate.app` resolves to `apps/app/hekate`.
- Prevented prompt flags such as `-y` from being treated as module names during builds.
- Fixed successful app scaffolding being reported as an undefined CLI error.
- Improved CLI error fallback text for empty errors.
- Fixed client `.style(name, value)` setter chaining.
- Fixed gzipped static file responses ending before compressed assets finished streaming.

### Changed
- Changed module paths to prefer `content/modules/<name>/<client|server>/`.
- Updated `@client/*` template resolution to use the module-first layout.
- Updated the default static allow-list for module-first client assets.
- Changed server modules to prefer `content/modules/<name>/index.js`.
- Changed module CSS handling to link `.css` directly unless production SCSS is available.
- Refactored domain and module asset compilation through a shared template asset builder.
- Changed client `.ajax()` to return ordered multi-URL responses to `complete()`.
- Updated client compilation to preserve leading prototype docblocks.

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

## 1.0.5 - 2023-04-26

### Changed
- Added static `.List` method to consolidate `watch` methods across types.

### Fixed
- Fixed `template.js` sub-directory control.

### Removed
- Removed legacy comments from `core/css.js`.

## 1.0.4 - 2023-01-15

### Changed
- Changed global `module` to `app.module`.
- Changed anonymous module function to load on start instead of page request.
- Added `viewport` to list of supported meta tags.
- Added `app.meta` to automatically print immediately after a template's `<head>` tag.

### Fixed
- Fixed watching nested template Sass directories for changes.

## 1.0.3 - 2023-01-01

### Added
- Added `app.meta()` method to include meta data in headers.

### Changed
- Changed options `allowed` to `allow` and `restricted` to `deny`.

### Fixed
- Fixed fallback for missing `content-type`.
- Fixed method `HEAD` always returning 200 status.

### Removed
- Removed unnecessary code from `client/socket.js`.

## 1.0.2 - 2022-12-24

### Added
- Added `sitemap.xml` to default allowed files.

### Fixed
- Fixed log cycle killing the server.

## 1.0.1 - 2022-12-21

### Fixed
- Fixed log cycle killing the server.
- Fixed `String.prototype.fromMarkdown` multiline strong, em, and span.

## 1.0.0 - 2022-12-19

### Changed
- Changed template loader to path location instead of named map to avoid collisions.
- Changed client.js AJAX static file loader.

### Fixed
- Fixed module loader.
- Fixed various typos and grammar.

## 1.0.0-beta+3 - 2022-12-05

### Added
- Added importing client modules to `app.set('template.js', '@client/[module-name]')`.
- Added optional `config.js` to template directories.
- Added option to not include a date in log files, if the last argument is `false`.

### Changed
- Changed HTTP to HTTPS redirect to `308 Permanent Redirect`.

### Fixed
- Fixed creating a new log file that does not exist.
- Fixed socket event handler referencing incorrect array.
- Fixed `Hekate.socket` to trigger `open` instead of `connection`.

## 1.0.0-beta+2 - 2022-11-30

### Added
- Added `%d` to request logs, which contains POST data.
- Added `config.log.trim` and `config.log.trimText` to set a size limit for `%d` log content.
- Added `app.log.to()` method to allow for named log files.
- Added `-- -y` and `-- -n` options to `npm run` to automatically choose yes or no for prompts.

### Changed
- Changed `script.min.js` to include relative files from `<config.template.js>`.
- Changed unknown user agent from `undefined` to `-`.

### Fixed
- Fixed `index.mjs` error printing.

## 1.0.0-beta+1 - 2022-10-31

### Added
- Initial beta release.
