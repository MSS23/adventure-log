#!/bin/bash

# Get the current branch name
BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Only build on main branch
if [[ "$BRANCH" == "main" ]]; then
  # Proceed with the build
  exit 1
else
  # Don't build
  echo "Build cancelled - not on main branch"
  exit 0
fi
