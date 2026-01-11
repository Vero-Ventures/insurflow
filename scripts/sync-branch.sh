#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/sync-branch.sh [--merge] [--check] [-b branch]

BASE_BRANCH="main"
USE_MERGE=false
CHECK_ONLY=false

while [[ $# -gt 0 ]]; do
  case $1 in
    -b|--base) BASE_BRANCH="$2"; shift 2 ;;
    -m|--merge) USE_MERGE=true; shift ;;
    -c|--check) CHECK_ONLY=true; shift ;;
    -h|--help)
      echo "Usage: ./scripts/sync-branch.sh [options]"
      echo ""
      echo "Options:"
      echo "  -b, --base <branch>  Base branch (default: main)"
      echo "  -m, --merge          Use merge instead of rebase"
      echo "  -c, --check          Check only, don't sync"
      echo ""
      echo "Examples:"
      echo "  ./scripts/sync-branch.sh           # Rebase onto main"
      echo "  ./scripts/sync-branch.sh --merge   # Merge main instead"
      exit 0
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

CURRENT_BRANCH=$(git branch --show-current)

if [ -z "$CURRENT_BRANCH" ]; then
  echo "Error: Not on a branch (detached HEAD)"
  exit 1
fi

if [ "$CURRENT_BRANCH" = "$BASE_BRANCH" ]; then
  echo "Already on $BASE_BRANCH."
  exit 0
fi

# Fetch and check status
git fetch origin "$BASE_BRANCH" 2>/dev/null || { echo "Could not fetch origin/$BASE_BRANCH"; exit 1; }

BEHIND=$(git rev-list --count HEAD..origin/"$BASE_BRANCH" 2>/dev/null || echo "0")
AHEAD=$(git rev-list --count origin/"$BASE_BRANCH"..HEAD 2>/dev/null || echo "0")

echo ""
echo "Branch: $CURRENT_BRANCH"
echo "Behind: $BEHIND commits | Ahead: $AHEAD commits"
echo ""

if [ "$BEHIND" -eq 0 ]; then
  echo "Already up-to-date with origin/$BASE_BRANCH."
  exit 0
fi

if [ "$CHECK_ONLY" = true ]; then
  echo "Run './scripts/sync-branch.sh' to sync."
  exit 1
fi

# Check for uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Uncommitted changes detected. Commit or stash first."
  exit 1
fi

# Sync
if [ "$USE_MERGE" = true ]; then
  echo "Merging origin/$BASE_BRANCH..."
  git merge origin/"$BASE_BRANCH" --no-edit || { echo "Merge conflict. Resolve and run: git commit"; exit 1; }
else
  echo "Rebasing onto origin/$BASE_BRANCH..."
  git rebase origin/"$BASE_BRANCH" || { echo "Rebase conflict. Resolve and run: git rebase --continue"; exit 1; }
fi

echo ""
echo "Sync complete."

# Remind about force push after rebase
if [ "$USE_MERGE" = false ] && [ "$AHEAD" -gt 0 ]; then
  if git rev-parse --verify origin/"$CURRENT_BRANCH" >/dev/null 2>&1; then
    echo ""
    echo "You'll need to force push: git push --force-with-lease"
  fi
fi
