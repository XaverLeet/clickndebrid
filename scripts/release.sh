#!/bin/bash

# ClickNDebrid Release Script
# A fancy, NPM-style release script with SemVer 2.0 compliance

# Set colors and styles
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# UTF-8 Icons
ROCKET="🚀"
PACKAGE="📦"
CHECK="✅"
WARN="⚠️"
ERROR="❌"
GEAR="⚙️"
CLOCK="🕒"
SPARKLES="✨"
HAMMER="🔨"
MAG="🔍"
LABEL="🏷️"
LINK="🔗"
PENCIL="✏️"

# Ensure we're in the project root
cd "$(dirname "$0")/.." || exit 1

# Initialize variables
RELEASE_TYPE="patch"
DRY_RUN=false
SKIP_TESTS=false
SKIP_GIT_SYNC=false
MANUAL_VERSION=""
AUTO_CONFIRM=false

# Function to print a section header
print_header() {
  echo -e "\n${BOLD}${BLUE}== $1 ==${RESET}\n"
}

# Function to print a success message
print_success() {
  echo -e "${GREEN}${CHECK} $1${RESET}"
}

# Function to print a warning message
print_warning() {
  echo -e "${YELLOW}${WARN} $1${RESET}"
}

# Function to print an error message
print_error() {
  echo -e "${RED}${ERROR} $1${RESET}"
}

# Function to print an info message
print_info() {
  echo -e "${CYAN}${GEAR} $1${RESET}"
}

# Function to exit with error
exit_with_error() {
  print_error "$1"
  exit 1
}

# Parse arguments
for arg in "$@"; do
  if [[ "$arg" =~ ^(auto|patch|minor|major|premajor|preminor|prepatch|prerelease)$ ]]; then
    RELEASE_TYPE="$arg"
  elif [[ "$arg" == "--dry-run" ]]; then
    DRY_RUN=true
  elif [[ "$arg" == "--skip-tests" ]]; then
    SKIP_TESTS=true
  elif [[ "$arg" == "--skip-git-sync" ]]; then
    SKIP_GIT_SYNC=true
  elif [[ "$arg" == "--yes" ]]; then
    AUTO_CONFIRM=true
  elif [[ "$arg" =~ ^--set-version=(.+)$ ]]; then
    MANUAL_VERSION="${BASH_REMATCH[1]}"
  elif [[ "$arg" == "--help" ]]; then
    echo -e "${BOLD}${PACKAGE} ClickNDebrid Release Script${RESET}"
    echo -e "Usage: $0 [options]"
    echo -e ""
    echo -e "Options:"
    echo -e "  auto                        Automatically determine version based on commits (SemVer compliant)"
    echo -e "  patch|minor|major           Specify the release type (default: patch)"
    echo -e "  premajor|preminor|prepatch  Create a pre-release version"
    echo -e "  prerelease                  Increment prerelease version"
    echo -e "  --dry-run                   Simulate release without making changes"
    echo -e "  --skip-tests                Skip running tests"
    echo -e "  --skip-git-sync             Skip git pull/push operations"
    echo -e "  --set-version=X.Y.Z         Set a specific version"
    echo -e "  --yes                       Auto-confirm (non-interactive mode)"
    echo -e "  --help                      Show this help message"
    echo -e ""
    echo -e "Examples:"
    echo -e "  $0 auto                     Determine version automatically from commit history"
    echo -e "  $0 minor                    Create a minor release"
    echo -e "  $0 --dry-run                Simulate a patch release"
    echo -e "  $0 major --yes              Create a major release without prompting"
    echo -e "  $0 auto --dry-run           Preview auto-determined version"
    exit 0
  fi
done

# Validate release type
if [[ ! "$RELEASE_TYPE" =~ ^(auto|patch|minor|major|premajor|preminor|prepatch|prerelease)$ ]]; then
  exit_with_error "Invalid release type. Use 'auto', 'patch', 'minor', 'major', 'premajor', 'preminor', 'prepatch', or 'prerelease'."
fi

# Print script header
echo -e "\n${BOLD}${PURPLE}${ROCKET} ClickNDebrid Release Tool ${RESET}"
echo -e "${CYAN}Following SemVer 2.0 - https://semver.org ${RESET}\n"

if [ "$DRY_RUN" = true ]; then
  print_warning "DRY RUN MODE - No changes will be committed"
fi

# Load GitHub token from .env.release file if it exists
ENV_FILE=".env.release"
if [ -f "$ENV_FILE" ]; then
  print_info "Loading environment variables from $ENV_FILE..."
  export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

# Check if there are uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
  if [ "$DRY_RUN" = true ]; then
    print_warning "You have uncommitted changes (ignoring in dry run mode)"
  else
    exit_with_error "You have uncommitted changes. Please commit or stash them before releasing."
  fi
fi

# Pull latest changes
if [ "$SKIP_GIT_SYNC" = false ] && [ "$DRY_RUN" = false ]; then
  print_info "Pulling latest changes from remote..."
  git pull || exit_with_error "Failed to pull latest changes"
fi

# Skip husky setup in dry run or if the script doesn't exist
if [ "$DRY_RUN" = false ]; then
  # Only try to run setup:husky if the script exists in package.json
  if grep -q "\"setup:husky\":" package.json && npm run -s setup:husky &>/dev/null; then
    print_info "Git hooks have been set up"
  else
    print_warning "Skipping husky setup. Continuing without Git hooks..."
  fi
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
print_info "Current version: ${BOLD}$CURRENT_VERSION${RESET}"

# List recent versions and tags
print_header "Recent Versions"
git tag -l "v*" --sort=-v:refname | head -5 | while read -r tag; do
  echo -e "${LABEL} ${CYAN}$tag${RESET} - $(git log -1 --format=%cd --date=short $tag)"
done

# Calculate the next version based on the release type or commit messages
if [ -z "$MANUAL_VERSION" ]; then
  if [ "$RELEASE_TYPE" = "auto" ]; then
    # Auto-determine version bump based on conventional commits
    print_info "Analyzing commits for automatic version determination..."
    
    # Check for breaking changes (BREAKING CHANGE in commit body or ! after type)
    if git log --pretty=format:"%B" "v$CURRENT_VERSION"..HEAD | grep -q -E "BREAKING CHANGE|feat!|fix!|refactor!"; then
      AUTO_BUMP="major"
      print_info "Found breaking changes - suggesting ${BOLD}major${RESET} version bump"
    # Check for features
    elif git log --pretty=format:"%s" "v$CURRENT_VERSION"..HEAD | grep -q -E "^feat(\([^)]*\))?:"; then
      AUTO_BUMP="minor"
      print_info "Found new features - suggesting ${BOLD}minor${RESET} version bump"
    # Default to patch
    else
      AUTO_BUMP="patch"
      print_info "Found bug fixes or other changes - suggesting ${BOLD}patch${RESET} version bump"
    fi
    
    # Use the auto-determined version type
    RELEASE_TYPE=$AUTO_BUMP
    
    # Use npm to calculate the next version based on semver rules
    VERSION_JSON=$(npm --no-git-tag-version version $RELEASE_TYPE --json)
    # Handle potential error in json output
    if [ $? -ne 0 ] || [ -z "$VERSION_JSON" ]; then
      print_error "Failed to determine next version"
      NEXT_VERSION=""
    else
      NEXT_VERSION=$(echo "$VERSION_JSON" | jq -r '.[] | values')
    fi
    # Revert the change made by npm version
    git checkout -- package.json
    
    print_info "Automatically determined release type: ${BOLD}$RELEASE_TYPE${RESET}"
    echo -e "${SPARKLES} Proposed version: ${BOLD}${GREEN}$NEXT_VERSION${RESET}"
  else
    # Use npm to calculate the next version based on specified release type
    VERSION_JSON=$(npm --no-git-tag-version version $RELEASE_TYPE --json)
    # Handle potential error in json output
    if [ $? -ne 0 ] || [ -z "$VERSION_JSON" ]; then
      print_error "Failed to determine next version"
      NEXT_VERSION=""
    else
      NEXT_VERSION=$(echo "$VERSION_JSON" | jq -r '.[] | values')
    fi
    # Revert the change made by npm version
    git checkout -- package.json

    print_info "Release type: ${BOLD}$RELEASE_TYPE${RESET}"
    echo -e "${SPARKLES} Proposed version: ${BOLD}${GREEN}$NEXT_VERSION${RESET}"
  fi
else
  NEXT_VERSION=$MANUAL_VERSION
  print_info "Manual version specified: ${BOLD}$NEXT_VERSION${RESET}"
fi

# Check if the version is valid according to SemVer
if ! [[ $NEXT_VERSION =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?(\+[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$ ]]; then
  exit_with_error "Invalid version format. Must follow SemVer 2.0 (X.Y.Z[-prerelease][+build])"
fi

# Check if tag already exists for the target version
if git tag | grep -q "v$NEXT_VERSION"; then
  exit_with_error "Tag v$NEXT_VERSION already exists! Choose a different version or delete the existing tag."
fi

# Run checks if not skipping tests and not in dry run
if [ "$SKIP_TESTS" = false ] && [ "$DRY_RUN" = false ]; then
  print_header "Running Pre-release Checks"
  
  # Run tests
  echo -e "${MAG} Running tests..."
  npm test || exit_with_error "Tests failed. Please fix the issues before releasing."

  # Run type checking
  echo -e "${MAG} Running type checking..."
  npx tsc --noEmit || exit_with_error "Type checking failed. Please fix the issues before releasing."

  # Run linting
  echo -e "${MAG} Running linting..."
  npm run lint || exit_with_error "Linting failed. Please fix the issues before releasing."
  
  print_success "All checks passed!"
fi

# Check if GITHUB_TOKEN is available
if [ -z "$GITHUB_TOKEN" ] && [ "$DRY_RUN" = false ]; then
  print_warning "GITHUB_TOKEN not found in environment. GitHub releases may require manual browser authentication."
  echo -e "Consider adding your token to ${BOLD}.env.release${RESET} file for automated releases."
fi

# Ask for confirmation unless auto-confirm is set
if [ "$AUTO_CONFIRM" = false ] && [ "$DRY_RUN" = false ]; then
  print_header "Release Confirmation"
  echo -e "${BOLD}About to release version ${GREEN}$NEXT_VERSION${RESET} (${RELEASE_TYPE})"
  echo -e "This will:"
  echo -e "1. Update version in package.json"
  echo -e "2. Update CHANGELOG.md"
  echo -e "3. Create git tag v$NEXT_VERSION"
  if [ "$SKIP_GIT_SYNC" = false ]; then
    echo -e "4. Push changes and tags to remote"
  fi
  echo -e "\nDo you want to continue? (y/N)"
  read -r confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    print_info "Release cancelled by user."
    exit 0
  fi
fi

if [ "$DRY_RUN" = true ]; then
  print_header "Dry Run Summary"
  echo -e "${ROCKET} Would create ${BOLD}$RELEASE_TYPE${RESET} release: ${BOLD}$CURRENT_VERSION${RESET} → ${BOLD}${GREEN}$NEXT_VERSION${RESET}"
  echo -e "${PACKAGE} Would update package.json"
  echo -e "${PENCIL} Would update CHANGELOG.md"
  echo -e "${LABEL} Would create git tag v$NEXT_VERSION"
  if [ "$SKIP_GIT_SYNC" = false ]; then
    echo -e "${LINK} Would push changes to remote"
  fi
  print_success "Dry run completed successfully!"
  exit 0
fi

print_header "Creating Release"

# Update package.json version
print_info "Updating version in package.json..."
npm --no-git-tag-version version "$NEXT_VERSION" || exit_with_error "Failed to update version in package.json"

# Update changelog if it exists
CHANGELOG_FILE="CHANGELOG.md"
if [ -f "$CHANGELOG_FILE" ]; then
  print_info "Updating CHANGELOG.md..."
  TODAY=$(date +"%Y-%m-%d")
  # Create a new changelog entry at the top, preserving existing content
  TEMP_CHANGELOG=$(mktemp)
  echo "# Changelog" > "$TEMP_CHANGELOG"
  echo "" >> "$TEMP_CHANGELOG"
  echo "## $NEXT_VERSION ($TODAY)" >> "$TEMP_CHANGELOG"
  echo "" >> "$TEMP_CHANGELOG"
  
  # Get commit messages since last tag, grouped by type
  echo "### 🚀 Features" >> "$TEMP_CHANGELOG"
  git log --pretty=format:"- %s (%h)" "v$CURRENT_VERSION"..HEAD | grep -E "^- feat(\([^)]*\))?: " >> "$TEMP_CHANGELOG" || echo "- No new features" >> "$TEMP_CHANGELOG"
  echo "" >> "$TEMP_CHANGELOG"
  
  echo "### 🐛 Bug Fixes" >> "$TEMP_CHANGELOG"
  git log --pretty=format:"- %s (%h)" "v$CURRENT_VERSION"..HEAD | grep -E "^- fix(\([^)]*\))?: " >> "$TEMP_CHANGELOG" || echo "- No bug fixes" >> "$TEMP_CHANGELOG"
  echo "" >> "$TEMP_CHANGELOG"
  
  echo "### 📚 Documentation" >> "$TEMP_CHANGELOG"
  git log --pretty=format:"- %s (%h)" "v$CURRENT_VERSION"..HEAD | grep -E "^- docs(\([^)]*\))?: " >> "$TEMP_CHANGELOG" || echo "- No documentation changes" >> "$TEMP_CHANGELOG"
  echo "" >> "$TEMP_CHANGELOG"
  
  echo "### 🔧 Other Changes" >> "$TEMP_CHANGELOG"
  git log --pretty=format:"- %s (%h)" "v$CURRENT_VERSION"..HEAD | grep -v -E "^- (feat|fix|docs)(\([^)]*\))?: " | grep -v "chore: release" >> "$TEMP_CHANGELOG" || echo "- No other changes" >> "$TEMP_CHANGELOG"
  echo "" >> "$TEMP_CHANGELOG"
  echo "" >> "$TEMP_CHANGELOG"
  
  # Append the rest of the original changelog, skipping the first line (# Changelog)
  tail -n +2 "$CHANGELOG_FILE" >> "$TEMP_CHANGELOG"
  
  # Replace the original changelog
  mv "$TEMP_CHANGELOG" "$CHANGELOG_FILE"
fi

# Commit the version bump
print_info "Committing changes..."
git add package.json
git add "$CHANGELOG_FILE" 2>/dev/null || true
git commit -m "chore: release v$NEXT_VERSION" || exit_with_error "Failed to commit changes"

# Create tag
print_info "Creating git tag v$NEXT_VERSION..."
git tag -a "v$NEXT_VERSION" -m "Version $NEXT_VERSION" || exit_with_error "Failed to create tag"

# Push changes and tags
if [ "$SKIP_GIT_SYNC" = false ]; then
  print_info "Pushing changes and tags..."
  git push --follow-tags origin HEAD || exit_with_error "Failed to push changes"
fi

print_header "Release Summary"
echo -e "${PACKAGE} Package version: ${BOLD}${GREEN}$NEXT_VERSION${RESET}"
echo -e "${LABEL} Git tag: ${BOLD}v$NEXT_VERSION${RESET}"
echo -e "${CLOCK} Released on: $(date '+%Y-%m-%d %H:%M:%S')"

print_success "Release v$NEXT_VERSION created successfully!"
if [ "$SKIP_GIT_SYNC" = false ]; then
  echo -e "${ROCKET} GitHub Actions will now build and publish the release."
fi