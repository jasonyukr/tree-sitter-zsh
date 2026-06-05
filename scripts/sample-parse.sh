#!/bin/sh

set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repo_root=$(CDPATH= cd -- "$script_dir/.." && pwd)
sample_dir=${SAMPLE_DIR:-"$repo_root/test/samples"}

if ! command -v zsh >/dev/null 2>&1; then
  echo "zsh is required for sample parse tests" >&2
  exit 1
fi

if [ -x "$repo_root/node_modules/.bin/tree-sitter" ]; then
  tree_sitter="$repo_root/node_modules/.bin/tree-sitter"
elif command -v tree-sitter >/dev/null 2>&1; then
  tree_sitter=$(command -v tree-sitter)
else
  echo "tree-sitter is required for sample parse tests" >&2
  exit 1
fi

set -- "$sample_dir"/*.zsh
if [ ! -f "$1" ]; then
  echo "no zsh samples found in $sample_dir" >&2
  exit 1
fi

cd "$repo_root"

zsh -n "$@"

output_file="${TMPDIR:-/tmp}/tree-sitter-zsh-samples.$$"
trap 'rm -f "$output_file"' EXIT HUP INT TERM

if ! "$tree_sitter" parse -q "$@" >"$output_file" 2>&1; then
  cat "$output_file" >&2
  exit 1
fi

if grep "ERROR" "$output_file" >/dev/null 2>&1; then
  cat "$output_file" >&2
  echo "tree-sitter sample parse output contains ERROR" >&2
  exit 1
fi
