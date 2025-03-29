# Semantic Versioning in ClickNDebrid

This document explains how we follow [Semantic Versioning 2.0.0](https://semver.org/) (SemVer) in the ClickNDebrid project.

## SemVer Overview

SemVer uses a three-part version number format: `MAJOR.MINOR.PATCH` (e.g., `1.2.3`).

- **MAJOR** version increases for incompatible API changes
- **MINOR** version increases for backward-compatible new features
- **PATCH** version increases for backward-compatible bug fixes

## Versioning Rules

We follow these specific rules:

1. **MAJOR version bump** when:

   - There are breaking changes to the API or configuration
   - The application's behavior changes in a way that requires user intervention
   - Any commit message contains `BREAKING CHANGE:` or has a `!` after the type (e.g., `feat!:`)

2. **MINOR version bump** when:

   - New features are added (`feat:` commits)
   - Substantial refactoring that doesn't break anything but adds capability

3. **PATCH version bump** when:
   - Bug fixes are made (`fix:` commits)
   - Documentation, build process or internal changes that don't affect end users
   - Small code refactorings or dependency updates

## Automatic Version Determination

Our release process can automatically determine the appropriate version bump based on commit history:

```bash
# Automatically determine version bump based on commit messages
npm run release:auto

# See what would happen with a dry run
npm run release:auto -- --dry-run
```

## Commit Message Convention

We use the [Conventional Commits](https://www.conventionalcommits.org/) standard for commit messages, with the following types:

- `feat:` - A new feature
- `fix:` - A bug fix
- `docs:` - Documentation only changes
- `style:` - Changes that don't affect the meaning of the code (formatting)
- `refactor:` - Code changes that neither fix a bug nor add a feature
- `perf:` - Changes that improve performance
- `test:` - Adding or correcting tests
- `build:` - Changes to the build system or dependencies
- `ci:` - Changes to CI configuration files and scripts
- `chore:` - Other changes that don't modify src or test files
- `security:` - Security-related changes
- `deps:` - Dependency updates

Breaking changes are indicated by appending a `!` after the type or including `BREAKING CHANGE:` in the commit message body.

### Verbose Commit Messages

Our project allows for verbose, detailed commit messages with relaxed constraints:

- Header line can be up to 150 characters (format: `type: subject`)
- Body lines can be up to 250 characters
- Footer lines can be up to 200 characters

Long detailed explanations are encouraged in multi-paragraph commit message bodies, particularly for complex changes or security-related updates. While we follow conventional commits, we prioritize clarity and thoroughness over strict length limitations.

## Tooling

Our SemVer compliance is enforced and automated through:

1. **Commitlint** - Enforces conventional commits format
2. **release.sh** - Smart release script with auto version determination
3. **release-it** - Release automation tool integrated with conventional changelog

## Examples

- `fix: resolve login issue on Safari` → PATCH increment
- `feat: add dark mode support` → MINOR increment
- `feat!: change authentication API` → MAJOR increment
- `refactor: improve code organization` → PATCH increment
- `docs: update installation instructions` → PATCH increment

## Release History

You can see our release history and how we've applied SemVer in the [CHANGELOG.md](../CHANGELOG.md) file.
