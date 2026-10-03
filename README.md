# Markdown Format Diff

Japanese README: [README.ja.md](https://github.com/t-takeya/markdown_diff/blob/main/README.ja.md)

Markdown Format Diff is a VS Code extension that previews Markdown changes recorded by Git. It can show a source diff between the Git `HEAD` version and the current working tree, or a rendered preview diff that compares both Markdown versions side by side.

## Features

- Compare Git `HEAD` content with the current working tree for Markdown files.
- Preview Markdown changes without modifying files.
- Compare Git changes as source text or rendered preview blocks.
- Run from the Command Palette, editor context menu, or Git Source Control resource menu.
- Supports added and deleted Markdown files by comparing against an empty side when no `HEAD` content or working-tree file exists.
- Optionally require files to be inside a Git repository.

## Commands

| Command | Description |
| --- | --- |
| `Markdown Format Diff: Show Git Source Diff` | Show a source diff between Git `HEAD` and the working tree for the active Markdown file. |
| `Markdown Format Diff: Show Git Source Diff From Source Control` | Show a source diff for a Markdown file selected from Source Control. |
| `Markdown Format Diff: Show Git Preview Diff` | Show rendered Markdown Git changes side by side, with changed preview blocks highlighted. |
| `Markdown Format Diff: Show Git Preview Diff From Source Control` | Show rendered Markdown Git changes for a Markdown file selected from Source Control. |

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `markdownFormatDiff.openBeside` | `true` | Open the Git source diff beside the current editor. |
| `markdownFormatDiff.requireGitRepository` | `true` | Require the Markdown file to be inside a Git repository. |

## Packaging

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