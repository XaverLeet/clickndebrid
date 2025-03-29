# CLAUDE.md - Guidelines for ClickNDebrid

## Development Commands

- Build: `npm run build`
- Development server: `npm run dev`
- Test: `npm test`
- Single test: `npx jest src/path/to/file.test.ts` or `npx jest -t "test name pattern"`
- Lint: `npm run lint`
- Format: `npm run format`
- Debug: `npm run debug` or `npm run debug-brk`
- Release: `npm run release:auto` (auto-determine version) or `npm run release:dry-run` (simulation)

## Testing Guidelines

- Use Jest testing framework
- Follow the pattern in existing tests (see `src/routes/flash.test.ts` for example)
- Use mock utilities from `src/utils/jest-mock.ts` for ESM modules
- Test files should use `.test.ts` suffix
- Use `describe` and `it` blocks for test organization
- Set environment with `/**@jest-environment node */` if needed

## Code Style Guidelines

- **TypeScript**: Strict mode, ES2020, ESM modules
- **Naming**:
  - Variables/Functions: lowerCamelCase
  - Classes/Interfaces: PascalCase
  - Constants: UPPER_SNAKE_CASE
  - Files/Directories: kebab-case
  - Test files: .test.ts suffix
  - Private members: \_prefix or private keyword
- **Error Handling**: Try/catch for async, consistent API response format
- **Imports**: Group by external, internal, relative paths
- **Commits**: Follow [conventional commits](https://www.conventionalcommits.org/) (feat, fix, docs, style, refactor, security, deps, etc.) as defined in [docs/semver.md](./docs/semver.md)

Customize service functionality through the configuration in src/config/index.ts.

## Docker Guidelines

- Docker images are built automatically for both AMD64 and ARM64 architectures on release
- Docker Compose is the recommended way to run the application
- The official image is available at `ghcr.io/xaverleet/clickndebrid:latest`
- Always use the latest image tag which includes multi-architecture support
