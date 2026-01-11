#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# sync-branch.sh - Sync your feature branch with the base branch
# =============================================================================
#
# USAGE
#     ./scripts/sync-branch.sh [options]
#
# OPTIONS
#     -b, --base <branch>    Base branch to sync with (default: main)
#     -m, --merge            Use merge instead of rebase
#     -c, --check            Check only, don't sync (exit 1 if behind)
#     -h, --help             Show this help message
#
# DESCRIPTION
#     This script helps keep your feature branch up-to-date with the base
#     branch (main by default) to prevent merge conflicts in pull requests.
#
#     By default, it uses rebase to maintain a clean, linear history.
#     Use --merge if you prefer merge commits.
#
# EXAMPLES
#     ./scripts/sync-branch.sh              # Rebase onto main
#     ./scripts/sync-branch.sh -b dev       # Rebase onto dev
#     ./scripts/sync-branch.sh --merge      # Merge main into current branch
#     ./scripts/sync-branch.sh --check      # Just check if behind (for CI)
#
# =============================================================================

BASE_BRANCH="main"
USE_MERGE=false
CHECK_ONLY=false

print_help() {
  sed -n '4,30p' "$0" | sed 's/^# \?//'
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -b|--base)
      BASE_BRANCH="$2"
      shift 2
      ;;
    -m|--merge)
      USE_MERGE=true
      shift
      ;;
    -c|--check)
      CHECK_ONLY=true
      shift
      ;;
    -h|--help)
      print_help
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      echo "Run with --help for usage information" >&2
      exit 1
      ;;
  esac
done

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)

if [ -z "$CURRENT_BRANCH" ]; then
  echo "Error: Not on a branch (detached HEAD state)" >&2
  exit 1
fi

if [ "$CURRENT_BRANCH" = "$BASE_BRANCH" ]; then
  echo "You're already on $BASE_BRANCH, nothing to sync."
  exit 0
fi

# Fetch latest from remote
echo "Fetching latest from origin/$BASE_BRANCH..."
if ! git fetch origin "$BASE_BRANCH" 2>/dev/null; then
  echo "Error: Could not fetch origin/$BASE_BRANCH" >&2
  echo "Make sure the branch exists and you have network access." >&2
  exit 1
fi

# Check how far behind we are
BEHIND=$(git rev-list --count HEAD..origin/"$BASE_BRANCH" 2>/dev/null || echo "0")
AHEAD=$(git rev-list --count origin/"$BASE_BRANCH"..HEAD 2>/dev/null || echo "0")

# Display status
echo ""
echo "================================================================================"
echo "BRANCH STATUS"
echo "================================================================================"
echo ""
echo "  Current branch:  $CURRENT_BRANCH"
echo "  Base branch:     origin/$BASE_BRANCH"
echo ""
echo "  Commits ahead:   $AHEAD"
echo "  Commits behind:  $BEHIND"
echo ""

if [ "$BEHIND" -eq 0 ]; then
  echo "Your branch is up-to-date with origin/$BASE_BRANCH."
  echo ""
  exit 0
fi

# Check only mode - exit with status
if [ "$CHECK_ONLY" = true ]; then
  echo "Your branch is $BEHIND commit(s) behind origin/$BASE_BRANCH."
  echo ""
  echo "Run './scripts/sync-branch.sh' to sync your branch."
  echo ""
  exit 1
fi

# Check for uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "================================================================================"
  echo "UNCOMMITTED CHANGES DETECTED"
  echo "================================================================================"
  echo ""
  echo "You have uncommitted changes. Please commit or stash them first:"
  echo ""
  echo "  git stash                    # Stash changes temporarily"
  echo "  ./scripts/sync-branch.sh     # Run sync"
  echo "  git stash pop                # Restore changes"
  echo ""
  echo "Or commit your changes:"
  echo ""
  echo "  git add -A && git commit -m 'wip: save progress'"
  echo ""
  exit 1
fi

# Perform sync
echo "================================================================================"
if [ "$USE_MERGE" = true ]; then
  echo "MERGING origin/$BASE_BRANCH INTO $CURRENT_BRANCH"
else
  echo "REBASING $CURRENT_BRANCH ONTO origin/$BASE_BRANCH"
fi
echo "================================================================================"
echo ""

if [ "$USE_MERGE" = true ]; then
  if git merge origin/"$BASE_BRANCH" --no-edit; then
    echo ""
    echo "Merge successful."
  else
    echo ""
    echo "================================================================================"
    echo "MERGE CONFLICT"
    echo "================================================================================"
    echo ""
    echo "Conflicts occurred during merge. To resolve:"
    echo ""
    echo "  1. Fix conflicts in the listed files"
    echo "  2. git add <resolved-files>"
    echo "  3. git commit"
    echo ""
    echo "To abort the merge:"
    echo ""
    echo "  git merge --abort"
    echo ""
    exit 1
  fi
else
  if git rebase origin/"$BASE_BRANCH"; then
    echo ""
    echo "Rebase successful."
  else
    echo ""
    echo "================================================================================"
    echo "REBASE CONFLICT"
    echo "================================================================================"
    echo ""
    echo "Conflicts occurred during rebase. To resolve:"
    echo ""
    echo "  1. Fix conflicts in the listed files"
    echo "  2. git add <resolved-files>"
    echo "  3. git rebase --continue"
    echo ""
    echo "To abort the rebase:"
    echo ""
    echo "  git rebase --abort"
    echo ""
    exit 1
  fi
fi

echo ""
echo "================================================================================"
echo "SYNC COMPLETE"
echo "================================================================================"
echo ""
echo "Your branch is now up-to-date with origin/$BASE_BRANCH."
echo ""

# Check if we need to force push after rebase
if [ "$USE_MERGE" = false ] && [ "$AHEAD" -gt 0 ]; then
  # Check if branch has been pushed before
  if git rev-parse --verify origin/"$CURRENT_BRANCH" >/dev/null 2>&1; then
    echo "Since you rebased and have previously pushed this branch, you'll need to"
    echo "force push to update the remote:"
    echo ""
    echo "  git push --force-with-lease"
    echo ""
    echo "Note: --force-with-lease is safer than --force as it will fail if someone"
    echo "else has pushed to your branch."
    echo ""
  fi
fi
