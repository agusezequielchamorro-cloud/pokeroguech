# Testing notes

This source archive came from GitHub's **Download ZIP**, so the `assets/` and `locales/` Git submodules are empty in both the original upload and this modified copy.

That means the source changes can be inspected and applied safely, but a full local browser build requires the repository to be cloned with its submodules (or for CI/deployment to fetch them):

```bash
git submodule update --init --recursive
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

The modified TypeScript files were syntax-transpiled successfully in this workspace. A complete project build was not possible here because the uploaded ZIP does not contain the submodule assets/locales or installed npm dependencies.
