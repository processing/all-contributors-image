# all-contributors-image

Generates a contributors image (`contributors.png`) from the `.all-contributorsrc` file and opens a pull request with the updated image.

## What it does

- Fetches `.all-contributorsrc` from the repository
- Extracts contributor avatars
- Generates a grid image (`contributors.png`)
- Creates/updates a branch
- Commits the image
- Opens a pull request

## Usage

```yaml
name: Generate Contributors Image

on:
  push:
    paths:
      - .all-contributorsrc

jobs:
  generate:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
          token: ${{ secrets.GITHUB_TOKEN }}
          base-branch: my-branch
```

## Inputs

| name | type | required | description |
|---|---|---:|---|
| `token` | `string` | yes | token used for api calls |
| `base-branch` | `string` | no | branch used as the base/reference branch (default: main) |

PRs opened with the default `GITHUB_TOKEN` won't trigger other workflows (e.g. CI checks) on that PR. If you want checks to run on the generated PR, pass a personal access token instead (e.g. `secrets.ACCESS_TOKEN`) with the same permissions.

## Requirements

Repository must have:

- A valid `.all-contributorsrc` file
- The workflow must grant `contents: write` and `pull-requests: write` permissions (see usage example above)
- "Allow GitHub Actions to create and approve pull requests" must be enabled in repo settings.
