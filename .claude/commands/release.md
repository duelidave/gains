# Release a new version

The user wants to create a new release. The version number is: $ARGUMENTS

## Steps

1. Validate the version argument. It should be a semantic version like `0.4.0` (without `v` prefix). If missing or invalid, ask the user for a valid version number.

2. Run format + lint + typecheck on both sides before committing anything. All must pass (0 errors; pre-existing warnings are OK):
   ```
   docker run --rm -v $PWD/backend:/app -w /app node:22-alpine sh -c 'npm install --silent && npm run format && npm run lint && npx tsc'
   docker run --rm -v $PWD/frontend:/app -w /app node:22-alpine sh -c 'npm install --silent && npm run format && npm run lint && npx tsc -b'
   ```
   If prettier changed files, review the diff and fold those changes into the appropriate logical commit — do not commit them separately unless they really are a pure format pass.

3. Update the `"version"` field in both:
   - `backend/package.json`
   - `frontend/package.json`

4. Update `CHANGELOG.md` (Keep a Changelog format) with a new section for this version. Use `### Added / Changed / Removed / Fixed / Deprecated / Security` as applicable. Pull the content from the commits since the last tag.

5. Commit the bump:
   ```
   git add backend/package.json frontend/package.json CHANGELOG.md
   git commit -m "chore: bump version to <version>"
   ```

6. Create a git tag:
   ```
   git tag v<version>
   ```

7. Push commit and tag to trigger the GitHub Actions release pipeline:
   ```
   git push && git push origin v<version>
   ```

8. Show the user the GitHub Actions run status with `gh run list --limit 1`.

## Notes

- This repo has a phantom-filemode artefact on many files. Always use `git -c core.filemode=false` for status/diff/add/commit so mode changes don't pollute the diff.
- Feature work before the bump should be split into logical commits (not one monster commit). The bump + CHANGELOG is the final commit before the tag.
