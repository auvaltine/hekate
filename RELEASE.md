# Release

Hekate keeps release notes in two places:

- `CHANGELOG.md` is the running project log, with `Unreleased` at the top.
- Git release tags are annotated tags. The tag name stays short, such as `v1.0.8`, and the tag message mirrors the matching changelog entry.

GitHub receives the pushed Git tag, but Hekate does not currently create or track
GitHub Releases. If a release should appear under GitHub's Releases page, that
needs to be created separately from the tag.

## Workflow

1. Move the `Unreleased` notes in `CHANGELOG.md` into a new `## x.y.z - YYYY-MM-DD` section.
2. Update `package.json` to the same version.
3. Commit the release changes.
4. Create an annotated tag:

```bash
git tag -a v1.0.8
```

Use this shape for the tag message:

```text
v1.0.8

* Added ...
* Changed ...
* Fixed ...
```

Check the result with:

```bash
git show v1.0.8
```

Push the commit and tag:

```bash
git push origin main
git push origin v1.0.8
```
