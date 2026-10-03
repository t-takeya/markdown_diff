# Markdown Format Diff

Japanese README: [README.ja.md](./README.ja.md)

Markdown Format Diff is a VS Code extension that previews how a Markdown file will change after formatting. It can show a source diff in the normal VS Code diff editor, or a rendered preview diff that compares the current Markdown preview with the formatted Markdown preview before you save or apply edits.

## Features

- Preview formatted Markdown without modifying the file.
- Compare current and formatted Markdown as source text or rendered preview blocks.
- Run from the Command Palette, editor context menu, or Git Source Control resource menu.
- Uses the Markdown formatter already available in VS Code, including your formatter extensions and editor formatting settings.
- Optionally require files to be inside a Git repository.

## Commands

| Command | Description |
| --- | --- |
| `Markdown Format Diff: Show Formatted Diff` | Preview source formatting changes for the active Markdown file. |
| `Markdown Format Diff: Show Formatted Diff From Source Control` | Preview source formatting changes for a Markdown file selected from Source Control. |
| `Markdown Format Diff: Show Formatted Preview Diff` | Preview rendered Markdown changes side by side, with changed preview blocks highlighted. |
| `Markdown Format Diff: Show Formatted Preview Diff From Source Control` | Preview rendered Markdown changes for a Markdown file selected from Source Control. |

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `markdownFormatDiff.openBeside` | `true` | Open the source diff editor beside the current editor. |
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
- Git must be available on `PATH` when `markdownFormatDiff.requireGitRepository` is enabled.

## License

MIT