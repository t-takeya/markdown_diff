# Changelog

## 0.3.1

- Updated the Japanese README link in README.md.

## 0.3.0

- Changed source and preview diff commands to compare Git HEAD content against the current working tree instead of comparing local formatted output.
- Updated Source Control commands to show Git file changes for selected Markdown resources.
- Updated command titles and documentation for Git source and rendered preview diff workflows.

## 0.2.2

- Fixed Markdown Format Diff: Show Formatted Preview Diff From Source Control so it is registered during extension activation.
- Kept contributed command titles concise to avoid duplicated category text in VS Code error messages and menus.

## 0.2.1

- Registered `Markdown Format Diff: Show Formatted Preview Diff From Source Control` at activation time so the Source Control command can run.
- Removed duplicated command category text from contributed command titles.
- Updated package metadata and lockfile for the 0.2.1 VSIX release.
- Kept package validation clean by preserving audit and install-script warning fixes.

## 0.2.0

- Added rendered Markdown preview diff for comparing current and formatted preview output side by side.
- Added `Markdown Format Diff: Show Formatted Preview Diff` to the Command Palette, editor context menu, and Git Source Control resource menu.
- Added Markdown Format Diff: Show Formatted Preview Diff From Source Control for rendered preview diffs from Git Source Control resources.
- Added `markdown-it` as a runtime dependency for preview rendering.

## 0.1.1

- Added Japanese README documentation.
- Added cross-links between the English and Japanese README files.
- Excluded development-only Git ignore metadata from the packaged VSIX.

## 0.1.0

- Initial Marketplace-ready release.
- Added Markdown formatted diff preview command.
- Added Source Control resource menu integration for Markdown files in Git repositories.