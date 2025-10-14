#!/bin/bash

# Get the current branch name
BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Only build on master branch
if [[ "$BRANCH" == "master" ]]; then
  # Proceed with the build
  exit 1
else
  # Don't build
  echo "🛑 Build cancelled - not on master branch"
  exit 0
fi
