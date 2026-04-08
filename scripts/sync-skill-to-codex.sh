#!/bin/sh

set -eu

REPO_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
SKILL_NAME=${1:-frontend-structure-optimizer}
SOURCE_DIR="$REPO_ROOT/skills/$SKILL_NAME"
TARGET_DIR="$HOME/.codex/skills/$SKILL_NAME"

if [ ! -d "$SOURCE_DIR" ]; then
  echo "Source skill not found: $SOURCE_DIR" >&2
  exit 1
fi

mkdir -p "$HOME/.codex/skills"
mkdir -p "$TARGET_DIR"
rsync -a --delete "$SOURCE_DIR/" "$TARGET_DIR/"

echo "Synced $SKILL_NAME to $TARGET_DIR"
