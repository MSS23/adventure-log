#!/bin/bash

# Usage: ./scripts/version-bump.sh [major|minor|patch]

set -e

VERSION_TYPE=${1:-patch}

echo "Bumping $VERSION_TYPE version..."

# Update package.json
npm version $VERSION_TYPE --no-git-tag-version

# Get new version
NEW_VERSION=$(node -p "require('./package.json').version")

echo "New version: $NEW_VERSION"

# Update CHANGELOG.md
DATE=$(date +%Y-%m-%d)
sed -i.bak "s/## \[Unreleased\]/## [Unreleased]\n\n## [$NEW_VERSION] - $DATE/" CHANGELOG.md
rm CHANGELOG.md.bak 2>/dev/null || true

# Commit changes
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore: bump version to $NEW_VERSION"

# Create git tag
git tag -a "v$NEW_VERSION" -m "Release version $NEW_VERSION"

echo "Version bumped to $NEW_VERSION"
echo "Push changes with: git push && git push --tags"
