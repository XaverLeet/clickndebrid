#!/bin/bash

# Script to push to GitHub with the correct SSH key
# Usage: ./scripts/git-push.sh [branch] [remote]

BRANCH="${1:-main}"
REMOTE="${2:-origin}"
SSH_KEY="~/.ssh/id_xaverleet_github"

# Check if the repository is clean
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️  Warning: You have uncommitted changes."
  echo "   Consider committing or stashing them before pushing."
  echo ""
  echo "   git status:"
  git status --short
  echo ""
  read -p "Continue anyway? (y/N): " CONTINUE
  if [[ ! "$CONTINUE" =~ ^[Yy]$ ]]; then
    echo "Push canceled."
    exit 1
  fi
fi

echo "🚀 Pushing to $REMOTE/$BRANCH using SSH key: $SSH_KEY"
GIT_SSH_COMMAND="ssh -i $SSH_KEY" git push "$REMOTE" "$BRANCH"
STATUS=$?

if [ $STATUS -eq 0 ]; then
  echo "✅ Push successful!"
else
  echo "❌ Push failed with status $STATUS"
  echo ""
  echo "Try running manually with:"
  echo "GIT_SSH_COMMAND=\"ssh -i $SSH_KEY\" git push $REMOTE $BRANCH"
fi

exit $STATUS