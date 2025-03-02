#!/bin/bash

# Test Release Script
# This script simulates a release process without actually creating a release
# It's useful for testing the release process before actually running it

set -e

# Check if git is installed
if ! command -v git &> /dev/null; then
  echo "Error: git is not installed. Please install git and try again."
  exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --is-inside-work-tree &> /dev/null; then
  echo "Error: Not in a git repository. Please run this script from within a git repository."
  exit 1
fi

# Check if the working directory is clean
if ! git diff-index --quiet HEAD --; then
  echo "Warning: You have uncommitted changes. It's recommended to commit or stash them before testing a release."
else
  echo "✅ Git working directory is clean."
fi

# Run linting
echo "Running linting..."
npm run lint
if [ $? -ne 0 ]; then
  echo "Error: Linting failed. Please fix the issues before releasing."
  exit 1
fi

# Run tests
echo "Running tests..."
npm test
if [ $? -ne 0 ]; then
  echo "Error: Tests failed. Please fix the issues before releasing."
  exit 1
fi

# Build the project
echo "Building project..."
npm run build
if [ $? -ne 0 ]; then
  echo "Error: Build failed. Please fix the issues before releasing."
  exit 1
fi

echo "✅ Test release process completed successfully!"
echo "All checks passed. You can now run a real release with one of these commands:"
echo "  npm run release:auto    # Automatic versioning based on conventional commits"
echo "  npm run release:patch   # Patch version bump (1.0.0 -> 1.0.1)"
echo "  npm run release:minor   # Minor version bump (1.0.0 -> 1.1.0)"
echo "  npm run release:major   # Major version bump (1.0.0 -> 2.0.0)"
