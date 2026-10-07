'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

function loadExtension({ enabled = true, failRead = false, extension = 'md', originalExtension = extension, modifiedScheme = 'file', dirty = false } = {}) {
  class Uri {
    constructor(scheme, fsPath) { this.scheme = scheme; this.fsPath = fsPath; }
    toString() { return `${this.scheme}:${this.fsPath}`; }
    static file(filePath) { return new Uri('file', filePath); }
    static joinPath(uri, relative) { return Uri.file(path.join(uri.fsPath, relative)); }
  }
  class TabInputTextDiff {
    constructor(original, modified) { this.original = original; this.modified = modified; }
  }
  const original = new Uri('git', `C:/repo/example.${originalExtension}`);
  const modified = new Uri(modifiedScheme, `C:/repo/example.${extension}`);
  const tab = { input: new TabInputTextDiff(original, modified), isActive: true, isDirty: dirty };
  const group = { activeTab: tab, tabs: [tab], viewColumn: 2 };
  const panels = [];
  const reads = [];
  const closed = [];
  const warnings = [];
  const commands = new Map();
  const gitCalls = [];
  let onTabs;
  const vscode = {
    Uri, TabInputTextDiff,
    ViewColumn: { Beside: -2, Active: -1 },
    EventEmitter: class { constructor() { this.event = () => {}; } fire() {} dispose() {} },
    workspace: {
      textDocuments: [],
      fs: { readFile: async () => Buffer.from('# Working tree') },
      getWorkspaceFolder: () => undefined,
      registerTextDocumentContentProvider: () => ({ dispose() {} }),
      getConfiguration: () => ({ get: (key, fallback) => key === 'renderSourceControlDiff' ? enabled : fallback }),
      openTextDocument: async (uri) => {
        reads.push(uri);
        if (failRead) { throw new Error('Git revision unavailable'); }
        return { getText: () => uri === original ? '# Before\n\n[link][ref]\n\n[ref]: https://example.com' : '# After\n\n![image](image.png)' };
      }
    },
    commands: { registerCommand: (name, handler) => { commands.set(name, handler); return { dispose() {} }; } },
    window: {
      tabGroups: {
        all: [group],
        onDidChangeTabs: (listener) => { onTabs = listener; return { dispose() {} }; },
        close: async (item) => { closed.push(item); return true; }
      },
      showWarningMessage: (message) => warnings.push(message),
      createWebviewPanel: (type, title, column, options) => {
        const panel = { type, title, column, options, webview: {
          cspSource: 'https://webview.example',
          asWebviewUri: (uri) => ({ toString: () => `https://webview.example/${path.basename(uri.fsPath)}` })
        } };
        panels.push(panel);
        return panel;
      }
    }
  };
  const sandbox = {
    require: (name) => {
      if (name === 'vscode') { return vscode; }
      if (name === 'child_process') {
        return { execFile(command, args, options, callback) {
          gitCalls.push(args);
          callback(null, args.includes('rev-parse') ? 'C:/repo' : '# HEAD');
        } };
      }
      return require(name);
    },
    module: { exports: {} }, Buffer
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'extension.js'), 'utf8'), sandbox);
  return { api: sandbox.module.exports, vscode, commands, gitCalls, tab, original, modified, panels, reads, closed, warnings,
    activate() { sandbox.module.exports.activate({ subscriptions: [] }); },
    notify() { onTabs({ opened: [tab], changed: [tab], closed: [] }); }
  };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

test('automatically renders the exact Git diff revisions in the original editor group', async () => {
  const state = loadExtension();
  state.activate();
  state.notify();
  await settle();
  assert.deepEqual(state.reads, [state.original, state.modified]);
  assert.equal(state.panels.length, 1);
  assert.equal(state.panels[0].column, 2);
  assert.deepEqual(state.closed, [state.tab]);
  const html = state.panels[0].webview.html;
  assert.match(html, /<h1>Before<\/h1>/);
  assert.match(html, /<h1>After<\/h1>/);
  assert.match(html, /href="https:\/\/example.com"/);
  assert.match(html, /src="https:\/\/webview.example\/image.png"/);
  assert.match(html, /Content-Security-Policy/);
  assert.equal(state.panels[0].options.enableScripts, false);
});

test('staged changes read both Git URIs rather than the working tree', async () => {
  const state = loadExtension({ modifiedScheme: 'git', extension: 'markdown' });
  state.activate();
  await settle();
  assert.deepEqual(state.reads, [state.original, state.modified]);
  assert.equal(state.panels.length, 1);
});

test('opening a Markdown diff after activation triggers a rendered preview', async () => {
  const state = loadExtension({ extension: 'mdown' });
  state.tab.isActive = false;
  state.activate();
  assert.equal(state.reads.length, 0);
  state.tab.isActive = true;
  state.notify();
  await settle();
  assert.equal(state.panels.length, 1);
  assert.deepEqual(state.closed, [state.tab]);
});

test('setting disabled, non-Markdown, and dirty tabs retain the standard diff', async () => {
  for (const options of [{ enabled: false }, { extension: 'txt' }, { extension: 'png' },
    { originalExtension: 'txt' }, { dirty: true }]) {
    const state = loadExtension(options);
    state.activate();
    await settle();
    assert.equal(state.reads.length, 0);
    assert.equal(state.panels.length, 0);
    assert.equal(state.closed.length, 0);
    assert.equal(state.warnings.length, 0);
  }
});

test('explicit unsupported selections never fall back to the active Markdown editor', async () => {
  const state = loadExtension({ enabled: false });
  state.vscode.window.activeTextEditor = { document: { languageId: 'markdown', uri: state.modified } };
  state.activate();
  const txt = state.vscode.Uri.file('C:/repo/notes.txt');
  const png = state.vscode.Uri.file('C:/repo/image.png');
  const unsupported = [txt, { resourceUri: png }, { uri: txt }, [txt],
    [state.modified, txt], {}, null, new state.vscode.Uri('untitled', 'example.md')];
  for (const handler of state.commands.values()) {
    for (const selection of unsupported) {
      await handler(selection);
    }
  }
  assert.equal(state.gitCalls.length, 0);
  assert.equal(state.reads.length, 0);
  assert.equal(state.panels.length, 0);
  assert.equal(state.closed.length, 0);
  assert.equal(state.warnings.length, 0);
});

test('a non-Markdown filename in Markdown language mode does not start a Git diff', async () => {
  const state = loadExtension({ enabled: false, extension: 'txt' });
  state.vscode.window.activeTextEditor = { document: { languageId: 'markdown', uri: state.modified } };
  state.activate();
  for (const handler of state.commands.values()) { await handler(); }
  assert.equal(state.gitCalls.length, 0);
  assert.equal(state.panels.length, 0);
});

test('explicit Markdown preview commands still accept URIs and resource wrappers', async () => {
  for (const extension of ['md', 'markdown', 'mdown', 'MD']) {
    const state = loadExtension({ enabled: false, extension });
    state.activate();
    for (const selection of [state.modified, { resourceUri: state.modified },
      { uri: state.modified }, [{ resourceUri: state.modified }]]) {
      await state.commands.get('markdownFormatDiff.showFormattedPreviewDiff')(selection);
    }
    assert.equal(state.panels.length, 4);
    assert.equal(state.gitCalls.length, 8);
    assert.equal(state.warnings.length, 0);
  }
});

test('an unreadable revision keeps the source diff open', async () => {
  const state = loadExtension({ failRead: true });
  state.activate();
  await settle();
  assert.equal(state.panels.length, 0);
  assert.equal(state.closed.length, 0);
  assert.match(state.warnings[0], /Git revision unavailable/);
});

test('a diff closed while loading does not reopen a preview', async () => {
  const state = loadExtension();
  state.activate();
  state.tab.isActive = false;
  await settle();
  assert.equal(state.panels.length, 0);
  assert.equal(state.closed.length, 0);
  state.tab.isActive = true;
  state.notify();
  await settle();
  assert.equal(state.panels.length, 1);
});

test('fenced code with blank lines and nested list paragraphs stay intact', () => {
  const { api } = loadExtension();
  const code = '```js\nconst x = 1;\n\nconsole.log(x);\n```';
  const rows = api.buildPreviewRows(code, code);
  assert.equal(rows.length, 1);
  assert.match(rows[0].left, /const x = 1;\n\nconsole.log\(x\);/);
  const list = '- First\n\n  Paragraph inside first item\n\n- Second';
  const listRows = api.buildPreviewRows(list, list);
  assert.equal(listRows.length, 1);
  assert.match(listRows[0].left, /<ul>/);
  assert.match(listRows[0].left, /Paragraph inside first item/);
  const table = '| Name | Value |\n| --- | --- |\n| Item | **Bold** |';
  const tableRows = api.buildPreviewRows(table, table);
  assert.equal(tableRows.length, 1);
  assert.match(tableRows[0].left, /<table>/);
  assert.match(tableRows[0].left, /<strong>Bold<\/strong>/);
});

test('rendered equality ignores equivalent Markdown syntax but preserves code whitespace', () => {
  const { api } = loadExtension();
  assert.equal(api.buildPreviewRows('**bold**', '__bold__')[0].leftKind, 'unchanged');
  assert.equal(api.buildPreviewRows('```\na  b\n```', '```\na b\n```')[0].leftKind, 'changed');
  assert.equal(api.buildPreviewRows('a  \nb', 'a\nb')[0].leftKind, 'changed');
});

test('added, removed, and changed blocks receive the correct highlights', () => {
  const { api } = loadExtension();
  assert.equal(api.buildPreviewRows('', '# Added')[0].rightKind, 'added');
  assert.equal(api.buildPreviewRows('# Removed', '')[0].leftKind, 'removed');
  const rows = api.buildPreviewRows('# Same\n\nOld\n\nEnd', '# Same\n\nNew\n\nEnd');
  assert.deepEqual(Array.from(rows, (row) => row.leftKind), ['unchanged', 'changed', 'unchanged']);
  assert.match(api.buildPreviewRows('<script>alert(1)</script>', '')[0].left, /&lt;script&gt;/);
});
