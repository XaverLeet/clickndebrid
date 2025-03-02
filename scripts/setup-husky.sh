#!/bin/bash

# Ensure we're in the project root
cd "$(dirname "$0")/.." || exit 1

# Remove old husky if it exists
rm -rf .husky

# Initialize husky
npx husky init

# Create pre-commit hook
cat > .husky/pre-commit << 'EOF'
#!/usr/bin/env bash

npx --no -- lint-staged
EOF

# Create commit-msg hook
cat > .husky/commit-msg << 'EOF'
#!/usr/bin/env bash

npx --no -- commitlint --edit ${1}
EOF

# Make hooks executable
chmod +x .husky/pre-commit .husky/commit-msg

echo "Husky hooks have been set up successfully!"
