'use strict';

const path = require('path');
const vscode = require('vscode');
const MarkdownIt = require('markdown-it');

const SCHEME = 'markdown-format-diff';
const virtualDocuments = new Map();
const markdownRenderer = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: false
});
let changeEmitter;
const handledDiffTabs = new WeakSet();

function activate(context) {
  changeEmitter = new vscode.EventEmitter();

  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(SCHEME, {
      onDidChange: changeEmitter.event,
      provideTextDocumentContent(uri) {
        return virtualDocuments.get(uri.toString()) || '';
      }
    }),
    vscode.commands.registerCommand('markdownFormatDiff.showFormattedDiff', showGitSourceDiff),
    vscode.commands.registerCommand('markdownFormatDiff.showFormattedDiffFromSourceControl', showGitSourceDiffFromSourceControl),
    vscode.commands.registerCommand('markdownFormatDiff.showFormattedPreviewDiff', showGitPreviewDiff),
    vscode.commands.registerCommand('markdownFormatDiff.showFormattedPreviewDiffFromSourceControl', showGitPreviewDiffFromSourceControl),
    vscode.window.tabGroups.onDidChangeTabs((event) => {
      for (const tab of [...event.opened, ...event.changed]) {
        void showRenderedSourceControlDiff(tab);
      }
    })
  );

  for (const group of vscode.window.tabGroups.all) {
    if (group.activeTab) {
      void showRenderedSourceControlDiff(group.activeTab);
    }
  }
}

async function showRenderedSourceControlDiff(tab) {
  const input = tab.input;
  if (!(input instanceof vscode.TabInputTextDiff)
      || input.original.scheme !== 'git'
      || !['file', 'git'].includes(input.modified.scheme)
      || !isMarkdownUri(input.modified)
      || !tab.isActive || tab.isDirty || handledDiffTabs.has(tab)
      || !vscode.workspace.getConfiguration('markdownFormatDiff', input.modified)
        .get('renderSourceControlDiff', true)) {
    return;
  }

  handledDiffTabs.add(tab);
  try {
    // Use the exact revisions chosen by Git (HEAD/index/working tree, including renames).
    const [original, modified] = await Promise.all([
      vscode.workspace.openTextDocument(input.original),
      vscode.workspace.openTextDocument(input.modified)
    ]);
    const group = vscode.window.tabGroups.all.find((candidate) => candidate.tabs.includes(tab));
    if (!group || !tab.isActive || tab.isDirty || tab.input !== input
        || !vscode.workspace.getConfiguration('markdownFormatDiff', input.modified)
          .get('renderSourceControlDiff', true)) {
      handledDiffTabs.delete(tab);
      return;
    }
    const title = `${basename(input.modified.fsPath)} Git Preview Diff`;
    createPreviewPanel(title, original.getText(), modified.getText(), group.viewColumn,
      input.original, input.modified, 'Before', 'After');
    await vscode.window.tabGroups.close(tab, true);
  } catch (error) {
    vscode.window.showWarningMessage(`Could not render the Markdown Git diff: ${error.message}`);
  }
}

function deactivate() {
  virtualDocuments.clear();
}

async function showGitSourceDiff(resource) {
  const uri = getResourceUri(resource) || getActiveMarkdownUri();
  if (!uri) {
    vscode.window.showWarningMessage('Open a Markdown file to preview Git changes.');
    return;
  }

  await showGitSourceDiffForUri(uri);
}

async function showGitSourceDiffFromSourceControl(resource) {
  const uri = getResourceUri(resource) || getActiveMarkdownUri();
  if (!uri) {
    vscode.window.showWarningMessage('Select a Markdown file in Source Control or open one in the editor.');
    return;
  }

  await showGitSourceDiffForUri(uri);
}

async function showGitPreviewDiff(resource) {
  const uri = getResourceUri(resource) || getActiveMarkdownUri();
  if (!uri) {
    vscode.window.showWarningMessage('Open or select a Markdown file to preview rendered Git changes.');
    return;
  }

  await showGitPreviewDiffForUri(uri);
}

async function showGitPreviewDiffFromSourceControl(resource) {
  const uri = getResourceUri(resource) || getActiveMarkdownUri();
  if (!uri) {
    vscode.window.showWarningMessage('Select a Markdown file in Source Control or open one in the editor.');
    return;
  }

  await showGitPreviewDiffForUri(uri);
}

async function showGitSourceDiffForUri(uri) {
  const change = await getGitMarkdownChange(uri);
  if (!change) {
    return;
  }

  if (change.baseText === change.workingText) {
    vscode.window.showInformationMessage('Git has no Markdown changes for this file.');
    return;
  }

  const baseUri = createVirtualUri(uri, 'git-base');
  const workingUri = createVirtualUri(uri, 'git-working');
  setVirtualDocument(baseUri, change.baseText);
  setVirtualDocument(workingUri, change.workingText);

  const config = vscode.workspace.getConfiguration('markdownFormatDiff');
  const title = `${basename(uri.fsPath)}: Git Base vs Working Tree`;
  const options = {
    preview: false,
    viewColumn: config.get('openBeside', true) ? vscode.ViewColumn.Beside : vscode.ViewColumn.Active
  };

  await vscode.commands.executeCommand('vscode.diff', baseUri, workingUri, title, options);
}

async function showGitPreviewDiffForUri(uri) {
  const change = await getGitMarkdownChange(uri);
  if (!change) {
    return;
  }

  if (change.baseText === change.workingText) {
    vscode.window.showInformationMessage('Git has no Markdown changes for this file.');
    return;
  }

  const title = `${basename(uri.fsPath)} Git Preview Diff`;
  const config = vscode.workspace.getConfiguration('markdownFormatDiff', uri);
  createPreviewPanel(title, change.baseText, change.workingText,
    config.get('openBeside', true) ? vscode.ViewColumn.Beside : vscode.ViewColumn.Active, uri, uri);
}

function createPreviewPanel(title, baseText, workingText, viewColumn, baseUri, workingUri,
  leftLabel = 'Git Base Preview', rightLabel = 'Working Tree Preview') {
  const panel = vscode.window.createWebviewPanel(
    'markdownFormatDiff.previewDiff',
    title,
    viewColumn,
    {
      enableScripts: false,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.file(dirname(baseUri.fsPath)), vscode.Uri.file(dirname(workingUri.fsPath))]
    }
  );

  panel.webview.html = buildPreviewDiffHtml(title, baseText, workingText, {
    webview: panel.webview, baseUri, workingUri, leftLabel, rightLabel
  });
  return panel;
}

async function getGitMarkdownChange(uri) {
  if (!isMarkdownUri(uri)) {
    vscode.window.showWarningMessage('Markdown Format Diff only supports Markdown files.');
    return undefined;
  }

  const gitInfo = await getGitInfo(uri);
  if (!gitInfo) {
    vscode.window.showWarningMessage('This file is not inside a Git repository.');
    return undefined;
  }

  const baseText = await readGitHeadText(gitInfo.root, gitInfo.relativePath);
  const workingText = await readWorkingTreeText(uri);

  return {
    baseText,
    workingText,
    relativePath: gitInfo.relativePath
  };
}

async function getGitInfo(uri) {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  const cwd = workspaceFolder ? workspaceFolder.uri.fsPath : dirname(uri.fsPath);

  try {
    const root = (await execFile('git', ['-C', cwd, 'rev-parse', '--show-toplevel'])).trim();
    const relativePath = path.relative(root, uri.fsPath).replace(/\\/g, '/');
    if (!relativePath || relativePath.startsWith('..')) {
      return undefined;
    }

    return { root, relativePath };
  } catch {
    return undefined;
  }
}

async function readGitHeadText(root, relativePath) {
  try {
    return await execFile('git', ['-C', root, 'show', `HEAD:${relativePath}`]);
  } catch {
    return '';
  }
}

async function readWorkingTreeText(uri) {
  const openDocument = vscode.workspace.textDocuments.find((document) => document.uri.toString() === uri.toString());
  if (openDocument) {
    return openDocument.getText();
  }

  try {
    const bytes = await vscode.workspace.fs.readFile(uri);
    return Buffer.from(bytes).toString('utf8');
  } catch {
    return '';
  }
}

function setVirtualDocument(uri, text) {
  virtualDocuments.set(uri.toString(), text);
  changeEmitter.fire(uri);
}

function buildPreviewDiffHtml(title, baseText, workingText, options = {}) {
  const rows = buildPreviewRows(baseText, workingText);
  const body = rows.map((row) => {
    const left = row.left ? renderPreviewCell(row.left, row.leftKind, options.webview, options.baseUri) : '<div class="empty">No matching preview block</div>';
    const right = row.right ? renderPreviewCell(row.right, row.rightKind, options.webview, options.workingUri) : '<div class="empty">No matching preview block</div>';
    return `<section class="row"><article class="cell">${left}</article><article class="cell">${right}</article></section>`;
  }).join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${options.webview ? options.webview.cspSource : ''} https: data:; style-src 'unsafe-inline';">
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
<header><div>${escapeHtml(options.leftLabel || 'Git Base Preview')}</div><div>${escapeHtml(options.rightLabel || 'Working Tree Preview')}</div></header>
<main>${body}</main>
</body>
</html>`;
}

function buildPreviewRows(baseText, workingText) {
  const leftBlocks = splitMarkdownBlocks(baseText);
  const rightBlocks = splitMarkdownBlocks(workingText);
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
  const env = {};
  const tokens = markdownRenderer.parse(text, env);
  const blocks = [];
  let start = 0;
  // Split only at complete top-level elements, preserving lists, tables and fenced code.
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.level === 0 && token.nesting !== 1) {
      blocks.push(markdownRenderer.renderer.render(tokens.slice(start, index + 1), markdownRenderer.options, env));
      start = index + 1;
    }
  }
  return blocks;
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
  // Whitespace inside code and hard line breaks affect the rendered result.
  return block;
}

function renderPreviewCell(html, kind, webview, sourceUri) {
  if (webview && sourceUri) {
    html = html.replace(/(<img\b[^>]*\bsrc=")([^"]*)(")/g, (match, prefix, src, suffix) => {
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(src)) {
        return match;
      }
      const decoded = src.replace(/&amp;/g, '&');
      const resource = vscode.Uri.joinPath(vscode.Uri.file(dirname(sourceUri.fsPath)), decoded);
      return `${prefix}${escapeHtml(webview.asWebviewUri(resource).toString())}${suffix}`;
    });
  }
  return `<div class="block ${kind}">${html}</div>`;
}

function execFile(command, args) {
  const childProcess = require('child_process');

  return new Promise((resolve, reject) => {
    childProcess.execFile(command, args, { windowsHide: true, maxBuffer: 1024 * 1024 * 20 }, (error, stdout, stderr) => {
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
  return /\.(?:md|markdown|mdown)$/i.test(uri.fsPath || uri.path);
}

function createVirtualUri(sourceUri, variant) {
  const encodedName = encodeURIComponent(basename(sourceUri.fsPath));
  const encodedSource = encodeURIComponent(sourceUri.toString());
  return vscode.Uri.parse(`${SCHEME}:/${variant}/${encodedName}?source=${encodedSource}`);
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
  buildPreviewRows
};
