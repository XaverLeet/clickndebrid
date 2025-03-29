#!/bin/bash

# Check if package.json is staged but package-lock.json is not
if git diff --cached --name-only | grep -q "package.json" && ! git diff --cached --name-only | grep -q "package-lock.json"; then
    if git diff --name-only | grep -q "package-lock.json"; then
        echo ">>> Detected package.json changes. Auto-staging package-lock.json"
        git add package-lock.json
    fi
fi

exit 0