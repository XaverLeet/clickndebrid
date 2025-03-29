# Changelog

## 1.1.10 (2025-03-29)

### 🚀 Features

- No new features

### 🐛 Bug Fixes

- fix: update @release-it/conventional-changelog to v7.0.2 (d3c8446)

### 📚 Documentation

- No documentation changes

### 🔧 Other Changes

- No other changes

## 1.1.9 (2025-03-29)

### 🚀 Features

- No new features

### 🐛 Bug Fixes

- fix: improve version parsing in release script (6943c5c)
- fix: resolve Docker manifest issues in GitHub Actions workflow (e3ea566)
- fix: suppress deprecation warnings in release-it commands (d111ead)
- fix: resolve dependency conflicts with conventional changelog plugin (e51e2a9)
- fix: improve version parsing in release script (7c7e6b6)

### 📚 Documentation

- docs: update installation instructions to use legacy-peer-deps (bbb1b08)
- docs: add guidance on creating verbose commits with message files (160fead)
- docs: add comprehensive explanation of verbose commit handling (eec7cae)
- docs: enhance guidance on verbose commit messages with detailed usage examples (b75cfce)
- docs: add semver.md references to README and CLAUDE.md (74b430d)

### 🔧 Other Changes

- build: add Git SSH key configuration and push script (23e1201)
- build: enhance Git workflow to automatically handle package-lock.json (73bfe0a)
- build: synchronize package-lock.json version with package.json (5ab199d)
- build: simplify release process by disabling GitHub release creation (01f5f3b)
- build: update package-lock.json with legacy-peer-deps resolution (2e25b5b)
- build: clean up redundant files for improved repository structure (e61f9d3)
- deps: update dependencies to ensure compatibility with enhanced release process (1718b88)
- build: allow verbose conventional commits (121c86e)
- build: improve semantic versioning compliance (fa88509)
- ci: improve Docker build and release workflows with case handling (69fdc24)

## 1.1.8 (2025-03-29)

### Changes

- chore: update package-lock.json to latest (5e420e3)
- ci: add multi-architecture Docker build workflow and package configuration (48fb7f8)
- docs: update CLAUDE.md with Docker multi-architecture information (88d2ced)
- feat: add native ARM64 and AMD64 builds using GitHub's new ARM runners (5663e3a)

## 1.1.7 (2025-03-29)

### Changes

- chore: update package-lock.json to match v1.1.6 (f9f9158)

## 1.1.6 (2025-03-29)

### Changes

- build: remove setup-husky.sh script (ef50db1)
- fix: resolve TypeScript errors in test files (77b6125)
- docs: update CLAUDE.md with testing guidelines (848b1a7)
- build: improve testing and Docker infrastructure (ef4e4ef)
- build: prebuilt docker image available (2a50de0)

## 1.1.5 (2025-03-03)

### Changes

- build: don't use husky in production (b4fd900)

## 1.1.4 (2025-03-03)

### Changes

- build: more resilience (5ca38b9)
- build: better reliability (984a552)
- fix: add write permissions for GitHub release action (e0ae395)

## 1.1.3 (2025-03-03)

### Changes

- build: better reliability (984a552)
- fix: add write permissions for GitHub release action (e0ae395)
- build: automatic versioning updated (248da4a)
- build: fixed (72235ae)
- build: another fix (192a553)
- build: added GITHUB token (ee6b96b)
- docs: update build process (0222e66)
- build: added .env.release (eec78d5)

## 1.1.3 (2025-03-03)

### Changes

- fix: add write permissions for GitHub release action (e0ae395)
- build: automatic versioning updated (248da4a)
- build: fixed (72235ae)
- build: another fix (192a553)
- build: added GITHUB token (ee6b96b)
- docs: update build process (0222e66)
- build: added .env.release (eec78d5)

## 1.1.3 (2025-03-03)

### Changes

- build: automatic versioning updated (248da4a)
- build: fixed (72235ae)
- build: another fix (192a553)
- build: added GITHUB token (ee6b96b)
- docs: update build process (0222e66)
- build: added .env.release (eec78d5)

## 1.1.1 (2025-03-03)

### Fixed

- Release script now uses CommonJS require instead of ESM imports for compatibility

## 1.1.0

### Added

- Initial public release
