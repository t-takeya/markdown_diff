# Markdown Format Diff

Markdown Format Diff は、Markdown ファイルを整形したときの変更内容を事前に確認できる VS Code 拡張機能です。現在のファイルを左側、整形後の仮想ドキュメントを右側に表示する通常の VS Code diff エディターを開くため、保存や編集を適用する前に差分を確認できます。

English README: [README.md](./README.md)

## 機能

- ファイルを変更せずに、Markdown の整形後差分をプレビューできます。
- コマンドパレット、エディターのコンテキストメニュー、Git Source Control のリソースメニューから実行できます。
- VS Code で利用可能な Markdown フォーマッターを使用します。フォーマッター拡張機能やエディターの整形設定も反映されます。
- 対象ファイルが Git リポジトリ内にあることを必須にできます。

## コマンド

| コマンド | 説明 |
| --- | --- |
| `Markdown Format Diff: Show Formatted Diff` | アクティブな Markdown ファイルの整形後差分をプレビューします。 |
| `Markdown Format Diff: Show Formatted Diff From Source Control` | Source Control で選択した Markdown ファイルの整形後差分をプレビューします。 |

## 設定

| 設定 | 既定値 | 説明 |
| --- | --- | --- |
| `markdownFormatDiff.openBeside` | `true` | 現在のエディターの横に diff エディターを開きます。 |
| `markdownFormatDiff.requireGitRepository` | `true` | Markdown ファイルが Git リポジトリ内にあることを必須にします。 |

## パッケージ作成

依存関係をインストールし、VSIX パッケージを作成します。

```bash
npm install
npm run package
```

公開前に、`package.json` の `publisher` フィールドが Visual Studio Marketplace の publisher ID と一致していることを確認してください。リポジトリ URL が異なる場合は、`repository`、`bugs`、`homepage` も更新してください。

公開する場合は次を実行します。

```bash
vsce publish
```

## 要件

- VS Code 1.90.0 以降。
- `markdownFormatDiff.requireGitRepository` が有効な場合は、`PATH` 上で Git を利用できる必要があります。

## ライセンス

MIT