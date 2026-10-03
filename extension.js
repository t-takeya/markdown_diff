'use strict';

const vscode = require('vscode');
const MarkdownIt = require('markdown-it');

const SCHEME = 'markdown-format-diff';
const formattedDocuments = new Map();
const markdownRenderer = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: false
});
let changeEmitter;

function activate(context) {
  changeEmitter = new vscode.EventEmitter();

  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(SCHEME, {
      onDidChange: changeEmitter.event,
      provideTextDocumentContent(uri) {
        return formattedDocuments.get(uri.toString()) || '';
      }
    }),
    vscode.commands.registerCommand('markdownFormatDiff.showFormattedDiff', showFormattedDiff),
    vscode.commands.registerCommand('markdownFormatDiff.showFormattedDiffFromSourceControl', showFormattedDiffFromSourceControl),
    vscode.commands.registerCommand('markdownFormatDiff.showFormattedPreviewDiff', showFormattedPreviewDiff),
    vscode.commands.registerCommand('markdownFormatDiff.showFormattedPreviewDiffFromSourceControl', showFormattedPreviewDiffFromSourceControl)
  );
}

function deactivate() {
  formattedDocuments.clear();
}

async function showFormattedDiff(resource) {
  const uri = getResourceUri(resource) || getActiveMarkdownUri();
  if (!uri) {
    vscode.window.showWarningMessage('Open a Markdown file to preview formatting changes.');
    return;
  }

  await showDiffForUri(uri);
}

async function showFormattedDiffFromSourceControl(resource) {
  const uri = getResourceUri(resource) || getActiveMarkdownUri();
  if (!uri) {
    vscode.window.showWarningMessage('Select a Markdown file in Source Control or open one in the editor.');
    return;
  }

  await showDiffForUri(uri);
}

async function showFormattedPreviewDiff(resource) {
  const uri = getResourceUri(resource) || getActiveMarkdownUri();
  if (!uri) {
    vscode.window.showWarningMessage('Open or select a Markdown file to preview rendered formatting changes.');
    return;
  }

  await showPreviewDiffForUri(uri);
}

async function showFormattedPreviewDiffFromSourceControl(resource) {
  const uri = getResourceUri(resource) || getActiveMarkdownUri();
  if (!uri) {
    vscode.window.showWarningMessage('Select a Markdown file in Source Control or open one in the editor.');
    return;
  }

  await showPreviewDiffForUri(uri);
}

async function showDiffForUri(uri) {
  if (!(await validateMarkdownTarget(uri))) {
    return;
  }

  const document = await vscode.workspace.openTextDocument(uri);
  const formattedText = await formatDocumentToText(document);

  if (formattedText === document.getText()) {
    vscode.window.showInformationMessage('Markdown formatting would not change this file.');
    return;
  }

  const previewUri = createPreviewUri(uri);
  formattedDocuments.set(previewUri.toString(), formattedText);
  changeEmitter.fire(previewUri);

  const config = vscode.workspace.getConfiguration('markdownFormatDiff');
  const title = `${basename(uri.fsPath)}: Current vs Formatted`;
  const options = {
    preview: false,
    viewColumn: config.get('openBeside', true) ? vscode.ViewColumn.Beside : vscode.ViewColumn.Active
  };

  await vscode.commands.executeCommand('vscode.diff', uri, previewUri, title, options);
}

async function showPreviewDiffForUri(uri) {
  if (!(await validateMarkdownTarget(uri))) {
    return;
  }

  const document = await vscode.workspace.openTextDocument(uri);
  const currentText = document.getText();
  const formattedText = await formatDocumentToText(document);

  if (formattedText === currentText) {
    vscode.window.showInformationMessage('Markdown formatting would not change this file.');
    return;
  }

  const title = `${basename(uri.fsPath)} Preview Diff`;
  const panel = vscode.window.createWebviewPanel(
    'markdownFormatDiff.previewDiff',
    title,
    vscode.ViewColumn.Beside,
    {
      enableScripts: false,
      retainContextWhenHidden: true
    }
  );

  panel.webview.html = buildPreviewDiffHtml(title, currentText, formattedText);
}

async function validateMarkdownTarget(uri) {
  if (!isMarkdownUri(uri)) {
    vscode.window.showWarningMessage('Markdown Format Diff only supports Markdown files.');
    return false;
  }

  const config = vscode.workspace.getConfiguration('markdownFormatDiff');
  if (config.get('requireGitRepository', true) && !(await isInsideGitRepository(uri))) {
    vscode.window.showWarningMessage('This file is not inside a Git repository. Disable markdownFormatDiff.requireGitRepository to preview it anyway.');
    return false;
  }

  return true;
}

async function formatDocumentToText(document) {
  const options = getFormattingOptions();
  const edits = await vscode.commands.executeCommand('vscode.executeFormatDocumentProvider', document.uri, options);

  if (!edits || edits.length === 0) {
    return document.getText();
  }

  return applyTextEdits(document, edits);
}

function applyTextEdits(document, edits) {
  const text = document.getText();
  const sorted = [...edits].sort((a, b) => {
    const startDelta = document.offsetAt(b.range.start) - document.offsetAt(a.range.start);
    if (startDelta !== 0) {
      return startDelta;
    }
    return document.offsetAt(b.range.end) - document.offsetAt(a.range.end);
  });

  let result = text;
  for (const edit of sorted) {
    const start = document.offsetAt(edit.range.start);
    const end = document.offsetAt(edit.range.end);
    result = result.slice(0, start) + edit.newText + result.slice(end);
  }

  return result;
}

function buildPreviewDiffHtml(title, currentText, formattedText) {
  const rows = buildPreviewRows(currentText, formattedText);
  const body = rows.map((row) => {
    const left = row.left ? renderPreviewCell(row.left, row.leftKind) : '<div class="empty">No matching preview block</div>';
    const right = row.right ? renderPreviewCell(row.right, row.rightKind) : '<div class="empty">No matching preview block</div>';
    return `<section class="row"><article class="cell">${left}</article><article class="cell">${right}</article></section>`;
  }).join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
:root {
  color-scheme: light dark;
  --border: var(--vscode-panel-border, #c8c8c8);
  --muted: var(--vscode-descriptionForeground, #666);
  --added-bg: rgba(46, 160, 67, 0.14);
  --added-border: rgba(46, 160, 67, 0.65);
  --removed-bg: rgba(248, 81, 73, 0.14);
  --removed-border: rgba(248, 81, 73, 0.65);
  --changed-bg: rgba(210, 153, 34, 0.16);
  --changed-border: rgba(210, 153, 34, 0.72);
}
body {
  margin: 0;
  color: var(--vscode-editor-foreground);
  background: var(--vscode-editor-background);
  font-family: var(--vscode-font-family);
}
header {
  position: sticky;
  top: 0;
  z-index: 2;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  border-bottom: 1px solid var(--border);
  background: var(--vscode-editor-background);
}
header div {
  padding: 10px 14px;
  font-weight: 600;
  background: var(--vscode-sideBar-background, transparent);
}
main {
  display: grid;
  gap: 1px;
  background: var(--border);
}
.row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1px;
}
.cell {
  min-width: 0;
  padding: 10px 14px;
  background: var(--vscode-editor-background);
}
.block {
  min-height: 24px;
  padding: 10px 12px;
  border-left: 3px solid transparent;
  border-radius: 4px;
  overflow-wrap: anywhere;
}
.block.unchanged {
  opacity: 0.78;
}
.block.added {
  background: var(--added-bg);
  border-left-color: var(--added-border);
}
.block.removed {
  background: var(--removed-bg);
  border-left-color: var(--removed-border);
}
.block.changed {
  background: var(--changed-bg);
  border-left-color: var(--changed-border);
}
.empty {
  min-height: 24px;
  padding: 10px 12px;
  color: var(--muted);
  font-style: italic;
}
h1, h2, h3, h4, h5, h6 {
  margin-top: 0.35em;
}
pre {
  overflow-x: auto;
  padding: 10px;
  border-radius: 4px;
  background: var(--vscode-textCodeBlock-background, rgba(127, 127, 127, 0.15));
}
code {
  font-family: var(--vscode-editor-font-family);
}
blockquote {
  margin-left: 0;
  padding-left: 12px;
  border-left: 3px solid var(--border);
  color: var(--muted);
}
table {
  border-collapse: collapse;
}
th, td {
  border: 1px solid var(--border);
  padding: 4px 8px;
}
img {
  max-width: 100%;
}
</style>
</head>
<body>
<header><div>Current Preview</div><div>Formatted Preview</div></header>
<main>${body}</main>
</body>
</html>`;
}

function buildPreviewRows(currentText, formattedText) {
  const leftBlocks = splitMarkdownBlocks(currentText);
  const rightBlocks = splitMarkdownBlocks(formattedText);
  const table = buildLcsTable(leftBlocks, rightBlocks);
  const rows = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < leftBlocks.length || rightIndex < rightBlocks.length) {
    const left = leftBlocks[leftIndex];
    const right = rightBlocks[rightIndex];

    if (left && right && normalizeBlock(left) === normalizeBlock(right)) {
      rows.push({ left, right, leftKind: 'unchanged', rightKind: 'unchanged' });
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }

    if (left && right && table[leftIndex + 1][rightIndex] === table[leftIndex][rightIndex + 1]) {
      rows.push({ left, right, leftKind: 'changed', rightKind: 'changed' });
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }

    if (right && (!left || table[leftIndex][rightIndex + 1] >= table[leftIndex + 1][rightIndex])) {
      rows.push({ left: '', right, leftKind: 'unchanged', rightKind: 'added' });
      rightIndex += 1;
      continue;
    }

    rows.push({ left, right: '', leftKind: 'removed', rightKind: 'unchanged' });
    leftIndex += 1;
  }

  return rows;
}

function splitMarkdownBlocks(text) {
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function buildLcsTable(leftBlocks, rightBlocks) {
  const table = Array.from({ length: leftBlocks.length + 1 }, () => Array(rightBlocks.length + 1).fill(0));

  for (let leftIndex = leftBlocks.length - 1; leftIndex >= 0; leftIndex -= 1) {
    for (let rightIndex = rightBlocks.length - 1; rightIndex >= 0; rightIndex -= 1) {
      if (normalizeBlock(leftBlocks[leftIndex]) === normalizeBlock(rightBlocks[rightIndex])) {
        table[leftIndex][rightIndex] = table[leftIndex + 1][rightIndex + 1] + 1;
      } else {
        table[leftIndex][rightIndex] = Math.max(table[leftIndex + 1][rightIndex], table[leftIndex][rightIndex + 1]);
      }
    }
  }

  return table;
}

function normalizeBlock(block) {
  return block.replace(/\s+/g, ' ').trim();
}

function renderPreviewCell(markdown, kind) {
  return `<div class="block ${kind}">${markdownRenderer.render(markdown)}</div>`;
}

function getFormattingOptions() {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    return {
      tabSize: editor.options.tabSize || 2,
      insertSpaces: editor.options.insertSpaces !== false
    };
  }

  return {
    tabSize: 2,
    insertSpaces: true
  };
}

async function isInsideGitRepository(uri) {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  const cwd = workspaceFolder ? workspaceFolder.uri.fsPath : dirname(uri.fsPath);

  try {
    const result = await execFile('git', ['-C', cwd, 'rev-parse', '--is-inside-work-tree']);
    return result.trim() === 'true';
  } catch {
    return false;
  }
}

function execFile(command, args) {
  const childProcess = require('child_process');

  return new Promise((resolve, reject) => {
    childProcess.execFile(command, args, { windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout || stderr || '');
    });
  });
}

function getResourceUri(resource) {
  if (!resource) {
    return undefined;
  }

  if (resource instanceof vscode.Uri) {
    return resource;
  }

  if (resource.resourceUri instanceof vscode.Uri) {
    return resource.resourceUri;
  }

  if (resource.uri instanceof vscode.Uri) {
    return resource.uri;
  }

  return undefined;
}

function getActiveMarkdownUri() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'markdown') {
    return undefined;
  }

  return editor.document.uri;
}

function isMarkdownUri(uri) {
  return /\.md(?:own)?$/i.test(uri.fsPath || uri.path);
}

function createPreviewUri(sourceUri) {
  const encodedName = encodeURIComponent(basename(sourceUri.fsPath));
  const encodedSource = encodeURIComponent(sourceUri.toString());
  return vscode.Uri.parse(`${SCHEME}:/formatted/${encodedName}?source=${encodedSource}`);
}

function basename(filePath) {
  return filePath.replace(/\\/g, '/').split('/').pop() || 'markdown.md';
}

function dirname(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const index = normalized.lastIndexOf('/');
  return index === -1 ? '.' : normalized.slice(0, index);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = {
  activate,
  deactivate,
  applyTextEdits,
  buildPreviewRows
};