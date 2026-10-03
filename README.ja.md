# Markdown Format Diff

Markdown Format Diff は、Git で管理されている Markdown の変更内容を確認できる VS Code 拡張機能です。Git `HEAD` の内容と現在の作業ツリーを通常のソース diff で比較できるほか、両方の Markdown をレンダリング済み preview として左右に並べて確認できます。

English README: [README.md](./README.md)

## 機能

- Markdown ファイルについて、Git `HEAD` の内容と現在の作業ツリーを比較できます。
- ファイルを変更せずに、Markdown の Git 差分をプレビューできます。
- Git 差分をソース差分またはレンダリング済み preview ブロックとして比較できます。
- コマンドパレット、エディターのコンテキストメニュー、Git Source Control のリソースメニューから実行できます。
- 追加ファイルや削除ファイルは、存在しない側を空として比較します。
- 対象ファイルが Git リポジトリ内にあることを必須にできます。

## コマンド

| コマンド | 説明 |
| --- | --- |
| `Markdown Format Diff: Show Git Source Diff` | アクティブな Markdown ファイルについて、Git `HEAD` と作業ツリーのソース差分を表示します。 |
| `Markdown Format Diff: Show Git Source Diff From Source Control` | Source Control で選択した Markdown ファイルのソース差分を表示します。 |
| `Markdown Format Diff: Show Git Preview Diff` | Markdown の Git 差分をレンダリング済み preview として左右に並べ、変更されたブロックを強調表示します。 |
| `Markdown Format Diff: Show Git Preview Diff From Source Control` | Source Control で選択した Markdown ファイルのレンダリング済み preview 差分を表示します。 |

## 設定

| 設定 | 既定値 | 説明 |
| --- | --- | --- |
| `markdownFormatDiff.openBeside` | `true` | 現在のエディターの横に Git ソース diff を開きます。 |
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
- `PATH` 上で Git を利用できる必要があります。

## ライセンス

MIT