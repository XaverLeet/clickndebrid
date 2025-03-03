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

# Save current version before running release-it
PRE_RELEASE_VERSION=$(jq -r ".version" package.json)

# Try running release-it
echo "Creating $RELEASE_TYPE release..."
RELEASE_SUCCESS=0

# Check if tag already exists - this is the most common issue
NEXT_VERSION=""

# Calculate the next version based on the release type
IFS='.' read -r -a version_parts <<< "$CURRENT_VERSION"
MAJOR="${version_parts[0]}"
MINOR="${version_parts[1]}"
PATCH="${version_parts[2]}"

if [ "$RELEASE_TYPE" = "major" ]; then
  MAJOR=$((MAJOR + 1))
  MINOR=0
  PATCH=0
elif [ "$RELEASE_TYPE" = "minor" ]; then
  MINOR=$((MINOR + 1))
  PATCH=0
else
  # Default is patch
  PATCH=$((PATCH + 1))
fi

NEXT_VERSION="$MAJOR.$MINOR.$PATCH"

# Check if tag already exists for the target version
if git tag | grep -q "v$NEXT_VERSION"; then
  echo "Warning: Tag v$NEXT_VERSION already exists!"
  echo "Would you like to force create the release anyway? This might cause issues. (y/N)"
  read -r force_create
  if [[ ! "$force_create" =~ ^[Yy]$ ]]; then
    echo "Release creation cancelled by user."
    exit 1
  fi
fi

# Force a change to ensure release-it has something to commit
# Update version in package.json to force a change
npm version "$RELEASE_TYPE" --no-git-tag-version --allow-same-version

# Try release-it
npm run "release:$RELEASE_TYPE" -- --no-npm || {
  RELEASE_SUCCESS=1
  echo "Release process failed with release-it. Performing manual version update..."

  # We already calculated the next version above
  NEW_VERSION=$NEXT_VERSION
  echo "Using version: $NEW_VERSION"
  
  # Update package.json with the new version
  jq ".version = \"$NEW_VERSION\"" package.json > package.json.tmp
  mv package.json.tmp package.json
  
  # Update changelog if it exists
  CHANGELOG_FILE="CHANGELOG.md"
  if [ -f "$CHANGELOG_FILE" ]; then
    TODAY=$(date +"%Y-%m-%d")
    # Create a new changelog entry at the top, preserving existing content
    TEMP_CHANGELOG=$(mktemp)
    echo "# Changelog" > "$TEMP_CHANGELOG"
    echo "" >> "$TEMP_CHANGELOG"
    echo "## $NEW_VERSION ($TODAY)" >> "$TEMP_CHANGELOG"
    echo "" >> "$TEMP_CHANGELOG"
    echo "### Changes" >> "$TEMP_CHANGELOG"
    echo "" >> "$TEMP_CHANGELOG"
    
    # Get commit messages since last tag
    git log --pretty=format:"- %s (%h)" "v$PRE_RELEASE_VERSION"..HEAD | grep -v "chore: release" >> "$TEMP_CHANGELOG"
    echo "" >> "$TEMP_CHANGELOG"
    echo "" >> "$TEMP_CHANGELOG"
    
    # Append the rest of the original changelog, skipping the first line (# Changelog)
    tail -n +2 "$CHANGELOG_FILE" >> "$TEMP_CHANGELOG"
    
    # Replace the original changelog
    mv "$TEMP_CHANGELOG" "$CHANGELOG_FILE"
  fi
  
  # Commit the version bump
  git add package.json
  git add "$CHANGELOG_FILE" 2>/dev/null || true
  
  # Attempt to commit - don't fail if nothing to commit
  git commit -m "chore: release v$NEW_VERSION" || true
  
  # Create and push tag - but only if it doesn't exist
  if ! git tag | grep -q "v$NEW_VERSION"; then
    git tag -a "v$NEW_VERSION" -m "Version $NEW_VERSION" || true
  fi
}

# Get the new version if it wasn't set by our manual process
if [ -z "$NEW_VERSION" ]; then
  # Read the current version from package.json
  NEW_VERSION=$(jq -r ".version" package.json)
fi

# Clean up temporary files
rm -f .version
rm -f .version.tmp
rm -f package.json.tmp

# Push changes and tags
if [ "$SKIP_GIT_SYNC" = false ]; then
  echo "Pushing changes and tags..."
  git push --follow-tags origin main
fi

# Add a summary section to show what actually happened
echo ""
echo "=== Release Summary ==="
echo "Package.json version: $NEW_VERSION"
echo "Latest git tag: $(git describe --tags --abbrev=0 2>/dev/null || echo 'No tags')"
echo "Release type requested: $RELEASE_TYPE"
echo ""

echo "Release v$NEW_VERSION created and pushed successfully!"
if [ "$SKIP_GIT_SYNC" = false ]; then
  echo "GitHub Actions will now build and publish the release."
fi
