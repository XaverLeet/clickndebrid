# CLAUDE.md - Guidelines for ClickNDebrid

## Development Commands
- Build: `npm run build`
- Development server: `npm run dev`
- Test: `npm test`
- Single test: `npx jest src/path/to/file.test.ts` or `npx jest -t "test name pattern"`
- Lint: `npm run lint`
- Format: `npm run format`
- Debug: `npm run debug` or `npm run debug-brk`

## Code Style Guidelines
- **TypeScript**: Strict mode, ES2020, CommonJS modules
- **Naming**: 
  - Variables/Functions: lowerCamelCase
  - Classes/Interfaces: PascalCase
  - Constants: UPPER_SNAKE_CASE
  - Files/Directories: kebab-case
  - Test files: .test.ts suffix
  - Private members: _prefix or private keyword
- **Error Handling**: Try/catch for async, consistent API response format
- **Imports**: Group by external, internal, relative paths
- **Testing**: Jest with describe/it blocks
- **Commits**: Follow conventional commits (feat, fix, docs, style, refactor, etc.)

Customize service functionality through the configuration in src/config/index.ts.