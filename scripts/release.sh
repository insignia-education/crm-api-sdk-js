#!/bin/bash
set -e

if [ -z "${GITHUB_TOKEN}" ]; then
    echo "Error: GITHUB_TOKEN is not set."
    exit 1
fi

VERSION=$(node -p "require('./package.json').version")
TAG="v${VERSION}"

REMOTE=$(git remote get-url origin)
REPO=$(echo "${REMOTE}" | sed 's/.*github\.com[:/]\(.*\)\.git/\1/' | sed 's/.*github\.com[:/]\(.*\)/\1/')

echo "Releasing ${TAG} for ${REPO}..."

read -rp "Commit message (leave empty to use 'Release ${TAG}'): " COMMIT_MSG
COMMIT_MSG="${COMMIT_MSG:-Release ${TAG}}"

git add .
git commit -m "${COMMIT_MSG}"
git push origin master

curl -s -X POST \
    -H "Authorization: token ${GITHUB_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"tag_name\":\"${TAG}\",\"name\":\"${TAG}\",\"body\":\"Release ${TAG}\"}" \
    "https://api.github.com/repos/${REPO}/releases"

echo "Done. Workflow triggered for ${TAG}."

# Update dependent repos
PACKAGE=$(node -p "require('./package.json').name")
PARENT=$(cd .. && pwd)

echo ""
echo "Waiting for ${PACKAGE}@${VERSION} to appear on NPM..."
LATEST=""
for i in $(seq 1 30); do
    LATEST=$(curl -s "https://registry.npmjs.org/${PACKAGE}/${VERSION}" | node -p "try { JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).version } catch(e) { '' }" 2>/dev/null)
    if [ "$LATEST" = "$VERSION" ]; then
        break
    fi
    echo "  ($i/30) not yet available, retrying in 1s..."
    sleep 1
    LATEST=""
done

if [ -z "$LATEST" ]; then
    echo "Warning: ${PACKAGE}@${VERSION} not found on NPM after 30 seconds. Skipping dependency updates."
    exit 0
fi

echo "Package ${PACKAGE}@${LATEST} is live."
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
