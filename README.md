# Markdown Format Diff

Japanese README: [README.ja.md](https://github.com/t-takeya/markdown_diff/blob/main/README.ja.md)

Markdown Format Diff is a VS Code extension that previews Markdown changes recorded by Git. It can show a source diff between the Git `HEAD` version and the current working tree, or a rendered preview diff that compares both Markdown versions side by side.

## Features

- Click a Markdown change in Git Source Control to automatically open a rendered side-by-side diff in the same editor group. Staged changes compare HEAD with the index; unstaged changes compare the index with the working tree, using the exact revisions selected by VS Code.
- Highlight added, removed, and changed rendered blocks while preserving code blocks, lists, tables, and reference links.
- Compare Git `HEAD` content with the current working tree for Markdown files.
- Preview Markdown changes without modifying files.
- Compare Git changes as source text or rendered preview blocks.
- Run from the Command Palette or editor context menu for local `.md`, `.markdown`, and `.mdown` files.
- Source Control automatically previews Markdown diffs. Other file types keep the standard Git diff. Source Control menu buttons are omitted because VS Code does not expose the selected file extension to those menus.
- Supports added and deleted Markdown files by comparing against an empty side when no `HEAD` content or working-tree file exists.
- Optionally require files to be inside a Git repository.

## Commands

| Command | Description |
| --- | --- |
| `Markdown Format Diff: Show Git Source Diff` | Show a source diff between Git `HEAD` and the working tree for the active Markdown file. |
| `Markdown Format Diff: Show Git Preview Diff` | Show rendered Markdown Git changes side by side, with changed preview blocks highlighted. |

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `markdownFormatDiff.renderSourceControlDiff` | `true` | Automatically replace Git Markdown text diffs with rendered previews. Set to `false` to keep the standard text diff. This also applies to Git diffs opened outside Source Control. |
| `markdownFormatDiff.openBeside` | `true` | Open source and preview commands beside the current editor. Automatic previews use the original diff editor group. |
| `markdownFormatDiff.requireGitRepository` | `true` | Require the Markdown file to be inside a Git repository. |

## Packaging

Automatic previews are snapshots when opened. Reopen the change after editing or staging to refresh the comparison. Explicit source diff commands still open a text diff; explicit preview commands compare HEAD with the working tree. If loading a Git revision fails, the original text diff stays open.

Install dependencies and create a VSIX package:

```bash
npm install
npm run package
```

Before publishing, make sure the `publisher` field in `package.json` matches your Visual Studio Marketplace publisher ID. Update the `repository`, `bugs`, and `homepage` fields if your repository URL is different.

Publish with:

```bash
vsce publish
```

## Requirements

- VS Code 1.90.0 or newer.
- Git must be available on `PATH`.

## License

MIT
