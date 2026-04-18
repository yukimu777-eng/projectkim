# コマンドメモ（初心者向け）

困ったときは、この表の「呼び出しキーワード」をそのまま私に送ってください。
例: `メモ: 開発起動`

| 呼び出しキーワード | コマンド | 何をするか |
| --- | --- | --- |
| メモ: フォルダ移動 | `cd c:\Users\yukim\Desktop\projectkim` | プロジェクトフォルダに移動する |
| メモ: 依存インストール | `npm install` | 必要なパッケージを入れる |
| メモ: 開発起動 | `npm run dev` | 開発用サーバーを起動する |
| メモ: 通常起動 | `npm start` | 通常モードでサーバーを起動する |
| メモ: 動作確認 | `http://localhost:3000/health` | ブラウザでヘルスチェックを確認する |
| メモ: hello確認 | `http://localhost:3000/api/hello?name=Yuta` | 名前付きの挨拶APIを確認する |
| メモ: time確認 | `http://localhost:3000/api/time` | 現在時刻APIを確認する |
| メモ: echo確認 | `Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/echo" -ContentType "application/json" -Body '{"message":"hello"}'` | POSTで送った文字を返すAPIを確認する |
| メモ: echo長文エラー確認 | `$body = @{ message = ("a" * 101) } | ConvertTo-Json` + `Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/echo" -ContentType "application/json" -Body $body` | 101文字以上で400エラーになることを確認する |
| メモ: note取得 | `Invoke-RestMethod -Method GET -Uri "http://localhost:3000/api/note"` | 現在のノートを取得する |
| メモ: note更新 | `Invoke-RestMethod -Method PUT -Uri "http://localhost:3000/api/note" -ContentType "application/json" -Body '{"note":"my first updated note"}'` | ノートを更新する |
| メモ: note削除 | `Invoke-RestMethod -Method DELETE -Uri "http://localhost:3000/api/note"` | ノートを空にする |
| メモ: todo一覧 | `Invoke-RestMethod -Method GET -Uri "http://localhost:3000/api/todos"` | Todo一覧を取得する |
| メモ: todo追加 | `Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/todos" -ContentType "application/json" -Body '{"text":"buy milk"}'` | Todoを1件追加する |
| メモ: todo完了 | `Invoke-RestMethod -Method PUT -Uri "http://localhost:3000/api/todos/1" -ContentType "application/json" -Body '{"done":true}'` | Todoを完了状態に更新する |
| メモ: todo削除 | `Invoke-RestMethod -Method DELETE -Uri "http://localhost:3000/api/todos/1"` | Todoを削除する |
| メモ: 変更確認 | `git status` | 変更されたファイルを確認する |
| メモ: 差分確認 | `git diff` | 変更内容の詳細を見る |
| メモ: 追加（全体） | `git add .` | 変更ファイルをコミット対象にする |
| メモ: コミット | `git commit -m "メッセージ"` | 変更履歴として保存する |
| メモ: ログ確認 | `git log --oneline` | 過去のコミット履歴を一覧で見る |
| メモ: Cowork開始 | `COWORK_PROMPTS.md` を開く | Cowork用の定型プロンプトを選ぶ |

## よく使う流れ

1. `cd c:\Users\yukim\Desktop\projectkim`
2. `npm run dev`
3. 実装したら `git status`
4. `git add .`
5. `git commit -m "作業内容"`

## 私に送るだけでOKの例

- `メモ: 開発起動`
- `メモ: hello確認`
- `メモ: echo確認`
- `メモ: echo長文エラー確認`
- `メモ: note更新`
- `メモ: todo追加`
- `メモ: 変更確認`
- `メモ: Cowork開始`
