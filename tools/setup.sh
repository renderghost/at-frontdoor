#!/usr/bin/env bash
# Fetches the fonts and icons the tools render with into tools/.cache
# (git-ignored). The prototype loads the same fonts from Google Fonts and the
# same Lucide build from unpkg; the tools serve local copies so every capture
# renders identically and offline.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p .cache/fonts2
cd .cache

fetch() { # <package@version> <folder>
  local pkg="$1" dest="$2" tgz
  [ -d "$dest/package" ] && return
  mkdir -p "$dest"
  tgz=$(npm pack "$pkg" --silent)
  tar -xzf "$tgz" -C "$dest"
  rm -f "$tgz"
}

fetch @fontsource/inter@5.1.0 inter
fetch lucide@0.469.0 lucide
fetch @fontsource-variable/fraunces@5.1.0 fonts2/fontsource-variable-fraunces-5.1.0
fetch @fontsource-variable/newsreader@5.1.0 fonts2/fontsource-variable-newsreader-5.1.0
fetch @fontsource/comic-neue@5.1.0 fonts2/fontsource-comic-neue-5.1.0
echo "Fonts and icons are ready in $(pwd)"
