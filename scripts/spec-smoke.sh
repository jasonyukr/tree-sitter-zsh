#!/bin/sh

set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repo_root=$(CDPATH= cd -- "$script_dir/.." && pwd)
fixture="$repo_root/test/spec-smoke.zsh"

if ! command -v zsh >/dev/null 2>&1; then
  echo "zsh is required for spec smoke tests" >&2
  exit 1
fi

if [ -x "$repo_root/node_modules/.bin/tree-sitter" ]; then
  tree_sitter="$repo_root/node_modules/.bin/tree-sitter"
elif command -v tree-sitter >/dev/null 2>&1; then
  tree_sitter=$(command -v tree-sitter)
else
  echo "tree-sitter is required for spec smoke tests" >&2
  exit 1
fi

cd "$repo_root"

zsh -n "$fixture"

output_file="${TMPDIR:-/tmp}/tree-sitter-zsh-spec-smoke.$$"
trap 'rm -f "$output_file"' EXIT HUP INT TERM

if ! "$tree_sitter" parse -q "$fixture" >"$output_file" 2>&1; then
  cat "$output_file" >&2
  exit 1
fi

if grep "ERROR" "$output_file" >/dev/null 2>&1; then
  cat "$output_file" >&2
  echo "tree-sitter parse output contains ERROR" >&2
  exit 1
fi
