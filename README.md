# 新NISAシミュレーター

新NISAの毎月積立、想定利回り、運用期間から、将来の評価額・投資元本・運用益を試算する静的サイトです。

## 公開URL

https://take-takashi.github.io/site-new-nisa-sim/

## 開発

このリポジトリではツールとタスク実行を `mise` に集約しています。

```bash
mise run install
mise run dev
```

## コマンド

```bash
mise run check
mise run build
mise run preview
mise run format
```

## GitHub Pages

`main` ブランチへ push すると、GitHub Actions が `mise` と `pnpm` でビルドし、`dist` を GitHub Pages へデプロイします。
