'use strict';

const vscode = require('vscode');

const SCHEME = 'markdown-format-diff';
const formattedDocuments = new Map();
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
    vscode.commands.registerCommand('markdownFormatDiff.showFormattedDiffFromSourceControl', showFormattedDiffFromSourceControl)
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

async function showDiffForUri(uri) {
  if (!isMarkdownUri(uri)) {
    vscode.window.showWarningMessage('Markdown Format Diff only supports Markdown files.');
    return;
  }

  const config = vscode.workspace.getConfiguration('markdownFormatDiff');
  if (config.get('requireGitRepository', true) && !(await isInsideGitRepository(uri))) {
    vscode.window.showWarningMessage('This file is not inside a Git repository. Disable markdownFormatDiff.requireGitRepository to preview it anyway.');
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

  const title = `${basename(uri.fsPath)}: Current vs Formatted`;
  const options = {
    preview: false,
    viewColumn: config.get('openBeside', true) ? vscode.ViewColumn.Beside : vscode.ViewColumn.Active
  };

  await vscode.commands.executeCommand('vscode.diff', uri, previewUri, title, options);
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

module.exports = {
  activate,
  deactivate,
  applyTextEdits
};


