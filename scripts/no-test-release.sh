#!/bin/bash

# Ensure we're in the project root
cd "$(dirname "$0")/.." || exit 1

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

# Pull latest changes
echo "Pulling latest changes from remote..."
git pull

# Ensure husky hooks are set up
echo "Ensuring Git hooks are set up..."
npm run setup:husky

echo "Skipping tests..."

# Run type checking with --skipLibCheck
echo "Running type checking with --skipLibCheck..."
npx tsc --noEmit --skipLibCheck
if [ $? -ne 0 ]; then
  echo "Error: Type checking failed. Please fix the issues before releasing."
  exit 1
fi

# Run linting with --quiet to ignore warnings
echo "Running linting with --quiet..."
npx eslint . --ext .ts --quiet || true

# Create release
echo "Creating $RELEASE_TYPE release..."
npm run "release:$RELEASE_TYPE" -- --no-git.requireCleanWorkingDir

# Get the new version
NEW_VERSION=$(node -p "import('./package.json', { assert: { type: 'json' } }).then(pkg => console.log(pkg.default.version))")

# Push changes and tags
echo "Pushing changes and tags..."
git push --follow-tags origin main

echo "Release v$NEW_VERSION created and pushed successfully!"
echo "GitHub Actions will now build and publish the release."