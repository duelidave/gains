# Release a new version

The user wants to create a new release. The version number is: $ARGUMENTS

## Steps

1. Validate the version argument. It should be a semantic version like `0.4.0` (without `v` prefix). If missing or invalid, ask the user for a valid version number.

2. Update the `"version"` field in both:
   - `backend/package.json`
   - `frontend/package.json`

3. Commit the version bump:
   ```
   git add backend/package.json frontend/package.json
   git commit -m "chore: bump version to <version>"
   ```

4. Create a git tag:
   ```
   git tag v<version>
   ```

5. Push commit and tag to trigger the GitHub Actions release pipeline:
   ```
   git push && git push origin v<version>
   ```

6. Show the user the GitHub Actions run status with `gh run list --limit 1`.
