#!/bin/bash

# Verbose Commit Helper Script
# This script helps create multi-paragraph conventional commits
# with proper formatting while avoiding shell escaping issues

# Set colors and styles
GREEN='\033[0;32m'
BLUE='\033[0;34m'
BOLD='\033[1m'
RESET='\033[0m'

# Help text
show_help() {
  echo -e "${BOLD}ClickNDebrid Verbose Commit Helper${RESET}"
  echo
  echo -e "Usage: ${BLUE}$0${RESET}"
  echo
  echo "This interactive script helps create well-formatted conventional commits"
  echo "with support for detailed multi-paragraph descriptions."
  echo
  echo -e "Commit types: ${GREEN}feat, fix, docs, style, refactor, perf, test, build, ci, chore, security, deps${RESET}"
  echo
  echo "Example of a scope: feat(auth): add OAuth2 support"
  echo
  echo "Press Ctrl+D on an empty line to finish each section"
  echo
}

# Check for help flag
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
  show_help
  exit 0
fi

# Create a temporary file
COMMIT_MSG_FILE=$(mktemp)

# Cleanup on exit
trap 'rm -f "$COMMIT_MSG_FILE"' EXIT

# Get commit type
echo -e "${BOLD}Select commit type (${GREEN}feat, fix, docs, style, refactor, perf, test, build, ci, chore, security, deps${RESET}${BOLD}):${RESET}"
read -r TYPE

# Validate commit type
VALID_TYPES=("feat" "fix" "docs" "style" "refactor" "perf" "test" "build" "ci" "chore" "security" "deps")
VALID=false
for VALID_TYPE in "${VALID_TYPES[@]}"; do
  if [ "$TYPE" == "$VALID_TYPE" ]; then
    VALID=true
    break
  fi
done

if [ "$VALID" != true ]; then
  echo "Invalid commit type. Please use one of: ${GREEN}${VALID_TYPES[*]}${RESET}"
  exit 1
fi

# Check if this is a breaking change
echo -e "${BOLD}Is this a breaking change? (y/N):${RESET}"
read -r BREAKING
if [[ "$BREAKING" =~ ^[Yy]$ ]]; then
  TYPE="$TYPE!"
fi

# Optional scope
echo -e "${BOLD}Enter scope (optional, press enter to skip):${RESET}"
read -r SCOPE
if [ -n "$SCOPE" ]; then
  TYPE="$TYPE($SCOPE)"
fi

# Get commit subject
echo -e "${BOLD}Enter commit subject (max 150 chars):${RESET}"
read -r SUBJECT

# Validate subject
if [ -z "$SUBJECT" ]; then
  echo "Subject cannot be empty"
  exit 1
fi

# Create header
HEADER="$TYPE: $SUBJECT"
echo "$HEADER" > "$COMMIT_MSG_FILE"
echo "" >> "$COMMIT_MSG_FILE"  # Blank line after header

# Get commit body
echo -e "${BOLD}Enter commit body (press Ctrl+D on empty line to finish):${RESET}"
while IFS= read -r LINE; do
  echo "$LINE" >> "$COMMIT_MSG_FILE"
done

# Add a blank line before footer if body is not empty
echo "" >> "$COMMIT_MSG_FILE"

# Get breaking change description if this is a breaking change
if [[ "$BREAKING" =~ ^[Yy]$ ]]; then
  echo -e "${BOLD}Enter breaking change description (press Ctrl+D on empty line to finish):${RESET}"
  echo "BREAKING CHANGE:" >> "$COMMIT_MSG_FILE"
  while IFS= read -r LINE; do
    echo "$LINE" >> "$COMMIT_MSG_FILE"
  done
  echo "" >> "$COMMIT_MSG_FILE"
fi

# Optional footer
echo -e "${BOLD}Enter any footer information like 'Fixes #123' (press Ctrl+D on empty line to finish):${RESET}"
while IFS= read -r LINE; do
  echo "$LINE" >> "$COMMIT_MSG_FILE"
done

# Show the composed commit message
echo -e "\n${BOLD}Preview of commit message:${RESET}"
echo "----------------------------------------"
cat "$COMMIT_MSG_FILE"
echo "----------------------------------------"

# Confirm commit
echo -e "${BOLD}Commit this message? (Y/n):${RESET}"
read -r CONFIRM
if [[ "$CONFIRM" =~ ^[Nn]$ ]]; then
  echo "Commit cancelled"
  exit 0
fi

# Commit the changes
git commit -F "$COMMIT_MSG_FILE"
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}Commit successful!${RESET}"
else
  echo -e "Commit failed with exit code $EXIT_CODE"
  exit $EXIT_CODE
fi