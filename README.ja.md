# Markdown Format Diff

Markdown Format Diff は、Markdown ファイルを整形したときの変更内容を事前に確認できる VS Code 拡張機能です。通常の VS Code diff エディターでソース差分を確認できるほか、現在の Markdown preview と整形後の Markdown preview を並べて表示し、保存や編集を適用する前に見た目の差分を確認できます。

English README: [README.md](./README.md)

## 機能

- ファイルを変更せずに、Markdown の整形後差分をプレビューできます。
- 現在の Markdown と整形後の Markdown を、ソース差分またはレンダリング済み preview ブロックとして比較できます。
- コマンドパレット、エディターのコンテキストメニュー、Git Source Control のリソースメニューから実行できます。
- VS Code で利用可能な Markdown フォーマッターを使用します。フォーマッター拡張機能やエディターの整形設定も反映されます。
- 対象ファイルが Git リポジトリ内にあることを必須にできます。

## コマンド

| コマンド | 説明 |
| --- | --- |
| `Markdown Format Diff: Show Formatted Diff` | アクティブな Markdown ファイルのソース整形差分をプレビューします。 |
| `Markdown Format Diff: Show Formatted Diff From Source Control` | Source Control で選択した Markdown ファイルのソース整形差分をプレビューします。 |
| `Markdown Format Diff: Show Formatted Preview Diff` | レンダリング済み Markdown の差分を左右に並べて表示し、変更された preview ブロックを強調します。 |
| `Markdown Format Diff: Show Formatted Preview Diff From Source Control` | Source Control で選択した Markdown ファイルのレンダリング済み preview 差分を表示します。 |

## 設定

| 設定 | 既定値 | 説明 |
| --- | --- | --- |
| `markdownFormatDiff.openBeside` | `true` | 現在のエディターの横にソース diff エディターを開きます。 |
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