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

Our release process uses GitVersion to automatically determine the appropriate version bump based on git history and branch patterns:

```bash
# Preview version calculation (via GitHub Actions)
npm run version:preview

# Show current versioning approach
npm run version:show
```

GitVersion calculates versions based on:

- Branch patterns (main, develop, feature/*, hotfix/*, release/*)
- Conventional commit messages
- Git history and merge patterns

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
- Body lines can be up to 250 characters (warning only, not error)
- Footer lines can be up to 200 characters (warning only, not error)

Long detailed explanations are encouraged in multi-paragraph commit message bodies, particularly for complex changes or security-related updates. While we follow conventional commits, we prioritize clarity and thoroughness over strict length limitations.

#### When to Use Verbose Commits

Verbose commit messages are especially valuable for:

1. **Security updates**: Explaining vulnerabilities fixed, their impact, and mitigation steps
2. **Major features**: Describing implementation details, design decisions, and usage examples
3. **Breaking changes**: Documenting what changed, why it was necessary, and migration paths
4. **Complex bug fixes**: Explaining root causes, investigation process, and verification steps
5. **Architectural changes**: Detailing motivations, alternatives considered, and performance impacts

Format longer commits with clear paragraph breaks, bullet points, and structured sections to improve readability.

#### Creating Verbose Commits

For verbose commits with multiple paragraphs or special formatting, use a commit message file instead of command-line arguments:

```bash
# Create a temporary commit message file
cat > /tmp/commit_message.txt << 'EOF'
feat: implement new authentication system

This commit adds a comprehensive authentication system with the following features:
- OAuth2 integration with multiple providers
- Two-factor authentication support
- Role-based access control
- Session management

The implementation follows security best practices and includes thorough
documentation in the code. It has been tested with various identity providers
including Google, GitHub, and Microsoft.

BREAKING CHANGE: The previous auth endpoints have been deprecated and will be
removed in the next major version. Please update your clients accordingly.
EOF

# Use the file for your commit
git commit -F /tmp/commit_message.txt
```

This approach avoids shell escaping issues and allows for proper formatting of multi-paragraph commit messages.

## Tooling

Our SemVer compliance is enforced and automated through:

1. **GitVersion** - Automatic semantic version calculation based on git history
2. **Commitlint** - Enforces conventional commits format
3. **GitHub Actions** - Automated workflows for version calculation and releases
4. **GitFlow Branching** - Branch-based version patterns and release management

## GitVersion Branch Patterns

GitVersion calculates different version patterns based on the branch:

| Branch Pattern | Version Format | Example | When Used |
|---------------|----------------|---------|-----------|
| `main` | `X.Y.Z` | `1.2.0` | Production releases |
| `develop` | `X.Y.Z-alpha.N` | `1.2.0-alpha.5` | Development builds |
| `feature/*` | `X.Y.Z-feature.N` | `1.2.0-feature.3` | Feature development |
| `hotfix/*` | `X.Y.Z-beta.N` | `1.1.43-beta.1` | Hotfix testing |
| `release/*` | `X.Y.Z-beta.N` | `1.2.0-beta.2` | Release candidates |

## Examples

- `fix: resolve login issue on Safari` → PATCH increment
- `feat: add dark mode support` → MINOR increment
- `feat!: change authentication API` → MAJOR increment
- `refactor: improve code organization` → PATCH increment
- `docs: update installation instructions` → PATCH increment

## Release Process

1. **Development**: Work on feature branches, merge to `develop`
2. **Version Preview**: GitVersion shows calculated version in PR comments
3. **Release**: Use GitHub Actions "Release" workflow with manual approval
4. **Automation**: GitVersion updates package.json and creates tags automatically

For detailed migration information, see [GitVersion Migration Guide](gitversion-migration.md).

## Release History

You can see our release history and how we've applied SemVer in the [CHANGELOG.md](../CHANGELOG.md) file.
