#!/bin/bash

# Ensure we're in the project root
cd "$(dirname "$0")/.." || exit 1

# Load GitHub token from .env.release file if it exists
ENV_FILE=".env.release"
if [ -f "$ENV_FILE" ]; then
  echo "Loading environment variables from $ENV_FILE..."
  export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

# Check if there are uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
  echo "Error: You have uncommitted changes. Please commit or stash them before releasing."
  exit 1
fi

# Determine release type from argument
RELEASE_TYPE=${1:-patch}

# Validate release type
if [[ ! "$RELEASE_TYPE" =~ ^(patch|minor|major)$ ]]; then
  echo "Error: Invalid release type. Use 'patch', 'minor', or 'major'."
  exit 1
fi

# Check for a --skip-tests flag
SKIP_TESTS=false
SKIP_GIT_SYNC=false
for arg in "$@"; do
  if [ "$arg" == "--skip-tests" ]; then
    SKIP_TESTS=true
  fi
  if [ "$arg" == "--skip-git-sync" ]; then
    SKIP_GIT_SYNC=true
  fi
done

# Pull latest changes
if [ "$SKIP_GIT_SYNC" = false ]; then
  echo "Pulling latest changes from remote..."
  git pull
fi

# Ensure husky hooks are set up
echo "Ensuring Git hooks are set up..."
npm run setup:husky

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "Current version: $CURRENT_VERSION"

# Check if the current version tag exists, if not create it
if ! git tag | grep -q "v$CURRENT_VERSION"; then
  echo "Tag v$CURRENT_VERSION does not exist. Creating it..."
  git tag -a "v$CURRENT_VERSION" -m "Version $CURRENT_VERSION"
  if [ "$SKIP_GIT_SYNC" = false ]; then
    git push origin "v$CURRENT_VERSION"
  fi
fi

if [ "$SKIP_TESTS" = false ]; then
  # Run tests
  echo "Running tests..."
  npm test
  if [ $? -ne 0 ]; then
    echo "Error: Tests failed. Please fix the issues before releasing."
    exit 1
  fi

  # Run type checking
  echo "Running type checking..."
  npx tsc --noEmit
  if [ $? -ne 0 ]; then
    echo "Error: Type checking failed. Please fix the issues before releasing."
    exit 1
  fi

  # Run linting
  echo "Running linting..."
  npm run lint
  if [ $? -ne 0 ]; then
    echo "Error: Linting failed. Please fix the issues before releasing."
    exit 1
  fi
fi

# Check if GITHUB_TOKEN is available
if [ -z "$GITHUB_TOKEN" ]; then
  echo "WARNING: GITHUB_TOKEN not found in environment. GitHub releases may require manual browser authentication."
  echo "Consider adding your token to .env.release file for automated releases."
fi

# Create release
echo "Creating $RELEASE_TYPE release..."
npm run "release:$RELEASE_TYPE" -- --no-npm

# Get the new version
NEW_VERSION=$(node -p "require('./package.json').version")

# Push changes and tags
if [ "$SKIP_GIT_SYNC" = false ]; then
  echo "Pushing changes and tags..."
  git push --follow-tags origin main
fi

echo "Release v$NEW_VERSION created and pushed successfully!"
if [ "$SKIP_GIT_SYNC" = false ]; then
  echo "GitHub Actions will now build and publish the release."
fi
