# Markdown Format Diff

Markdown Format Diff は、Git で管理されている Markdown の変更内容を確認できる VS Code 拡張機能です。Git `HEAD` の内容と現在の作業ツリーを通常のソース diff で比較できるほか、両方の Markdown をレンダリング済み preview として左右に並べて確認できます。

English README: [README.md](./README.md)

## 機能

- ソース管理で Markdown の変更をクリックすると、見出し・表・リストなどを整形したプレビュー差分に自動で切り替わります。元の差分と同じエディターグループで、変更前と変更後を左右に表示します。
- ステージ済みの変更は HEAD とインデックス、未ステージの変更はインデックスと作業ツリーを比較します。VS Code が選んだ比較対象をそのまま使います。
- 追加・削除・変更をブロック単位で強調表示し、コード内の空行、リスト、表、参照リンクの構造を保ちます。
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
| `markdownFormatDiff.renderSourceControlDiff` | `true` | Git の Markdown 差分を自動で整形済みプレビューに切り替えます。`false` にすると通常のテキスト差分を表示します。ソース管理以外から開く Git 差分にも適用されます。 |
| `markdownFormatDiff.openBeside` | `true` | ソース差分・プレビュー差分のコマンドを現在のエディターの横に開きます。自動プレビューは元の差分と同じグループに開きます。 |
| `markdownFormatDiff.requireGitRepository` | `true` | Markdown ファイルが Git リポジトリ内にあることを必須にします。 |

## パッケージ作成

自動プレビューは開いた時点の内容を表示します。編集やステージ操作の後は、ソース管理から変更を開き直して更新してください。ソース差分の専用コマンドでは引き続きテキスト差分を表示でき、プレビューの専用コマンドでは HEAD と作業ツリーを比較します。Git の内容を読み込めない場合は、元のテキスト差分を残します。

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
