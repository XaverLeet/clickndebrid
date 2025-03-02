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

# Create release
echo "Creating $RELEASE_TYPE release..."
npm run "release:$RELEASE_TYPE"

# Get the new version
NEW_VERSION=$(node -p "require('./package.json').version")

# Push changes and tags
echo "Pushing changes and tags..."
git push --follow-tags origin main

echo "Release v$NEW_VERSION created and pushed successfully!"
echo "GitHub Actions will now build and publish the release."
