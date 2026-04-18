# projectkim

このリポジトリは開発準備中のプロジェクトです。

## できること

- Gitで変更履歴を管理する
- Claude Codeで開発を進める

## 現在の状態

- Git初期化済み
- Claude Codeログイン済み
- Node.js + Express のAPI雛形を追加済み

## 使い方

1. このフォルダをCursorで開く
2. ターミナルで `claude` を実行する
3. 作りたいものを決めて実装を開始する

## APIの起動方法

1. 依存関係をインストールする
   - `npm install`
2. 開発起動する
   - `npm run dev`
3. 本番起動する
   - `npm start`

### 動作確認URL

- `http://localhost:3000/`
- `http://localhost:3000/health`
- `http://localhost:3000/api/hello`
- `http://localhost:3000/api/hello?name=Yuta`
- `http://localhost:3000/api/time`

## コマンド早見表

- `COMMANDS.md` に、初心者向けのコマンド一覧と実行順をまとめています。
- `CLAUDE.md` に、このプロジェクトでのAI作業ルールをまとめています。
- `COWORK_PROMPTS.md` に、Cowork機能で使える定型プロンプトをまとめています。

## 次のステップ

- APIエンドポイントを増やす（POST/PUT/DELETE）
- 環境変数（PORTなど）を整理する
- GitHubへ接続してpushする
