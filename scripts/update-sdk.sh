#!/bin/bash
set -e

PACKAGE=$(node -p "require('./package.json').name")
PARENT=$(cd .. && pwd)

echo "Fetching latest version of ${PACKAGE} from NPM..."
LATEST=$(curl -s "https://registry.npmjs.org/${PACKAGE}/latest" | node -p "JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).version")

if [ -z "$LATEST" ]; then
    echo "Error: Could not fetch latest version from NPM."
    exit 1
fi

echo "Latest version: ${LATEST}"
echo ""

for dir in "${PARENT}"/*/; do
    repo=$(basename "$dir")
    pkg_file="${dir}src/package.json"

    if [ ! -f "$pkg_file" ]; then
        continue
    fi

    has_dep=$(node -p "
        const p = require('${pkg_file}');
        const dep = (p.dependencies || {})['${PACKAGE}'];
        const dev = (p.devDependencies || {})['${PACKAGE}'];
        dep || dev || ''
    " 2>/dev/null)

    if [ -z "$has_dep" ]; then
        echo "  ${repo}: skipped (${PACKAGE} not listed)"
        continue
    fi

    echo "  ${repo}: updating ${PACKAGE} to ^${LATEST}..."
    (cd "${dir}src" && npm install "${PACKAGE}@^${LATEST}" --save 2>/dev/null)
    echo "  ${repo}: done"
done

echo ""
echo "Update complete."
