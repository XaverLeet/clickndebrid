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

# Initialize variables
RELEASE_TYPE="patch"
SKIP_TESTS=false
SKIP_GIT_SYNC=false
MANUAL_VERSION=""

# Parse arguments
for arg in "$@"; do
  if [[ "$arg" =~ ^(patch|minor|major)$ ]]; then
    RELEASE_TYPE="$arg"
  elif [[ "$arg" == "--skip-tests" ]]; then
    SKIP_TESTS=true
  elif [[ "$arg" == "--skip-git-sync" ]]; then
    SKIP_GIT_SYNC=true
  elif [[ "$arg" =~ ^--set-version=(.+)$ ]]; then
    MANUAL_VERSION="${BASH_REMATCH[1]}"
  fi
done

# Validate release type
if [[ ! "$RELEASE_TYPE" =~ ^(patch|minor|major)$ ]]; then
  echo "Error: Invalid release type. Use 'patch', 'minor', or 'major'."
  exit 1
fi

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

# Ensure package.json version is up to date for the release-it tool
echo "Ensuring package.json version is up to date..."
jq -r ".version" package.json > .version.tmp
CURRENT_VERSION=$(cat .version.tmp)
rm .version.tmp

# Manually update version if specified
if [ "$MANUAL_VERSION" != "" ]; then
  echo "Manually setting version to $MANUAL_VERSION..."
  # Update package.json version using jq
  jq ".version = \"$MANUAL_VERSION\"" package.json > package.json.tmp
  mv package.json.tmp package.json
  CURRENT_VERSION=$MANUAL_VERSION
fi

# Create or update package.json version file to help release-it
echo "Creating .version file for release-it..."
echo "$CURRENT_VERSION" > .version

# Create release
echo "Creating $RELEASE_TYPE release..."
npm run "release:$RELEASE_TYPE" -- --no-npm || {
  echo "Release process failed. Checking if package.json was updated..."
  
  # Check if package.json was updated but commit failed
  NEW_VERSION=$(jq -r ".version" package.json)
  if [ "$NEW_VERSION" != "$CURRENT_VERSION" ]; then
    echo "Package.json was updated to version $NEW_VERSION but commit failed."
    echo "Manually creating git tag and commit..."
    
    # Stage package.json and other modified files
    git add package.json
    git add CHANGELOG.md || true
    
    # Commit changes
    git commit -m "chore: release v$NEW_VERSION" || echo "No changes to commit"
    
    # Create tag
    git tag -a "v$NEW_VERSION" -m "Version $NEW_VERSION"
  else
    echo "No version change detected. Using current version: $CURRENT_VERSION"
    NEW_VERSION=$CURRENT_VERSION
  fi
}

# Get the new version (either from successful release-it run or our manual update)
if [ -z "$NEW_VERSION" ]; then
  NEW_VERSION=$(jq -r ".version" package.json)
fi

# Clean up .version file
rm -f .version

# Push changes and tags
if [ "$SKIP_GIT_SYNC" = false ]; then
  echo "Pushing changes and tags..."
  git push --follow-tags origin main
fi

echo "Release v$NEW_VERSION created and pushed successfully!"
if [ "$SKIP_GIT_SYNC" = false ]; then
  echo "GitHub Actions will now build and publish the release."
fi
