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
- `http://localhost:3000/api/note`
- `http://localhost:3000/api/todos`

### POST API確認（echo）

PowerShellで以下を実行すると、`POST /api/echo` の動作を確認できます。

```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/echo" -ContentType "application/json" -Body '{"message":"hello"}'
```

`message` を空で送ると、`400` エラー（`message is required`）になります。
`message` が101文字以上でも、`400` エラーになります。

長すぎる入力の確認例:

```powershell
$body = @{ message = ("a" * 101) } | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/echo" -ContentType "application/json" -Body $body
```

### PUT/DELETE API確認（note）

現在のノート取得:

```powershell
Invoke-RestMethod -Method GET -Uri "http://localhost:3000/api/note"
```

ノート更新:

```powershell
Invoke-RestMethod -Method PUT -Uri "http://localhost:3000/api/note" -ContentType "application/json" -Body '{"note":"my first updated note"}'
```

ノート削除:

```powershell
Invoke-RestMethod -Method DELETE -Uri "http://localhost:3000/api/note"
```

### Todo API確認（複数件データ）

Todo一覧取得:

```powershell
Invoke-RestMethod -Method GET -Uri "http://localhost:3000/api/todos"
```

Todo作成:

```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/todos" -ContentType "application/json" -Body '{"text":"buy milk"}'
```

Todo更新（id=1を完了にする例）:

```powershell
Invoke-RestMethod -Method PUT -Uri "http://localhost:3000/api/todos/1" -ContentType "application/json" -Body '{"done":true}'
```

Todo削除（id=1を削除する例）:

```powershell
Invoke-RestMethod -Method DELETE -Uri "http://localhost:3000/api/todos/1"
```

## コマンド早見表

- `COMMANDS.md` に、初心者向けのコマンド一覧と実行順をまとめています。
- `CLAUDE.md` に、このプロジェクトでのAI作業ルールをまとめています。
- `COWORK_PROMPTS.md` に、Cowork機能で使える定型プロンプトをまとめています。

## 次のステップ

- APIエンドポイントを増やす（POST/PUT/DELETE）
- 環境変数（PORTなど）を整理する
- GitHubへ接続してpushする
