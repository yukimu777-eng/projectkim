const fs = require("fs");
const path = require("path");
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

// ===== Redis セットアップ =====
let redis = null;
try {
  const { Redis } = require("@upstash/redis");
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
    console.log("Redis storage enabled");
  } else {
    console.log("Redis env vars not set — using file storage fallback");
  }
} catch (e) {
  console.warn("@upstash/redis not available — using file storage fallback");
}

const MAX_ECHO_LENGTH = 100;
const MAX_NOTE_LENGTH = 200;
const MAX_TODO_TEXT_LENGTH = 120;
const MAX_MEMO_CONTENT_LENGTH = 500;
const MAX_MEMO_TITLE_LENGTH = 60;

const VALID_PRIORITIES = ["high", "medium", "low"];
const VALID_CATEGORIES = ["仕事", "プライベート", "学習", "その他"];

const DATA_DIR = path.join(__dirname, "..", "data");
const TODOS_FILE_PATH = path.join(DATA_DIR, "todos.json");
const MEMOS_FILE_PATH = path.join(DATA_DIR, "memos.json");
const ACTIVITY_LOG_PATH = path.join(DATA_DIR, "activity_log.json");

// ===== ファイルストレージ（ローカル用フォールバック） =====
function loadJSON(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Failed to load " + filePath);
    return fallback;
  }
}

function saveJSON(filePath, data) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.error("Failed to save " + filePath, e.message);
  }
}

// ===== 汎用ストレージ（Redis優先、なければファイル） =====
async function loadData(redisKey, filePath, fallback) {
  if (redis) {
    const data = await redis.get(redisKey);
    return Array.isArray(data) ? data : fallback;
  }
  return loadJSON(filePath, fallback);
}

async function saveData(redisKey, filePath, data) {
  if (redis) {
    await redis.set(redisKey, data);
  } else {
    saveJSON(filePath, data);
  }
}

// ===== インメモリ状態 =====
let note = "sample note";
let todos = [];
let nextTodoId = 1;
let memos = [];
let nextMemoId = 1;
let activityLog = [];

function getNextId(arr) {
  if (arr.length === 0) return 1;
  return arr.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

// ===== 非同期初期化 =====
const initPromise = (async () => {
  [todos, memos, activityLog] = await Promise.all([
    loadData("todos", TODOS_FILE_PATH, []),
    loadData("memos", MEMOS_FILE_PATH, []),
    loadData("activity_log", ACTIVITY_LOG_PATH, []),
  ]);
  nextTodoId = getNextId(todos);
  nextMemoId = getNextId(memos);
})();

// ===== 保存関数（非同期） =====
async function saveTodos()       { await saveData("todos", TODOS_FILE_PATH, todos); }
async function saveMemos()       { await saveData("memos", MEMOS_FILE_PATH, memos); }
async function saveActivityLog() { await saveData("activity_log", ACTIVITY_LOG_PATH, activityLog); }

async function recordCompletion(todoId, todoText) {
  activityLog.push({
    id: getNextId(activityLog),
    todoId,
    todoText,
    completedAt: new Date().toISOString(),
  });
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  activityLog = activityLog.filter(e => new Date(e.completedAt) >= cutoff);
  await saveActivityLog();
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// 初期化完了を待ってからリクエストを処理
app.use(async (req, res, next) => {
  try { await initPromise; next(); } catch (e) { next(e); }
});

app.get("/", (req, res) => { res.json({ message: "Node.js API server is running" }); });
app.get("/health", (req, res) => { res.json({ status: "ok" }); });
app.get("/api/hello", (req, res) => { res.json({ message: `Hello, ${req.query.name || "world"}!` }); });
app.get("/api/time",  (req, res) => { res.json({ now: new Date().toISOString() }); });

app.post("/api/echo", (req, res) => {
  const { message } = req.body || {};
  if (typeof message !== "string" || !message.trim()) return res.status(400).json({ error: "message is required" });
  const m = message.trim();
  if (m.length > MAX_ECHO_LENGTH) return res.status(400).json({ error: `message must be ${MAX_ECHO_LENGTH} characters or fewer` });
  res.json({ echo: m });
});

app.get("/api/note",    (req, res) => { res.json({ note }); });
app.put("/api/note",    (req, res) => {
  const { note: n } = req.body || {};
  if (typeof n !== "string" || !n.trim()) return res.status(400).json({ error: "note is required" });
  const norm = n.trim();
  if (norm.length > MAX_NOTE_LENGTH) return res.status(400).json({ error: `note must be ${MAX_NOTE_LENGTH} chars or fewer` });
  note = norm; res.json({ message: "note updated", note });
});
app.delete("/api/note", (req, res) => { note = ""; res.json({ message: "note deleted", note }); });

// ===== メモAPI =====
app.get("/api/memos", (req, res) => { res.json({ memos }); });

app.post("/api/memos", async (req, res) => {
  const { title, content } = req.body || {};
  if (typeof content !== "string" || !content.trim()) return res.status(400).json({ error: "content is required" });
  const c = content.trim();
  if (c.length > MAX_MEMO_CONTENT_LENGTH) return res.status(400).json({ error: `content must be ${MAX_MEMO_CONTENT_LENGTH} chars or fewer` });
  const t = typeof title === "string" ? title.trim().slice(0, MAX_MEMO_TITLE_LENGTH) : "";
  const memo = { id: nextMemoId++, title: t || null, content: c, createdAt: new Date().toISOString() };
  memos.unshift(memo);
  await saveMemos();
  res.status(201).json({ message: "memo created", memo });
});

app.put("/api/memos/:id", async (req, res) => {
  const id = Number(req.params.id);
  const memo = memos.find(m => m.id === id);
  if (!memo) return res.status(404).json({ error: "memo not found" });
  const { title, content } = req.body || {};
  if (content !== undefined) {
    const c = typeof content === "string" ? content.trim() : "";
    if (!c) return res.status(400).json({ error: "content must be non-empty" });
    if (c.length > MAX_MEMO_CONTENT_LENGTH) return res.status(400).json({ error: "content too long" });
    memo.content = c;
  }
  if (title !== undefined) memo.title = typeof title === "string" ? title.trim().slice(0, MAX_MEMO_TITLE_LENGTH) || null : null;
  memo.updatedAt = new Date().toISOString();
  await saveMemos();
  res.json({ message: "memo updated", memo });
});

app.delete("/api/memos/:id", async (req, res) => {
  const id = Number(req.params.id);
  const index = memos.findIndex(m => m.id === id);
  if (index === -1) return res.status(404).json({ error: "memo not found" });
  const [deleted] = memos.splice(index, 1);
  await saveMemos();
  res.json({ message: "memo deleted", memo: deleted });
});

// ===== 活動ログAPI =====
app.get("/api/activity-log", (req, res) => { res.json({ activityLog }); });

// ===== Todo API =====
app.get("/api/todos", (req, res) => { res.json({ todos }); });

app.post("/api/todos", async (req, res) => {
  const { text, dueDate, priority, category } = req.body || {};
  if (typeof text !== "string" || !text.trim()) return res.status(400).json({ error: "text is required" });
  const t = text.trim();
  if (t.length > MAX_TODO_TEXT_LENGTH) return res.status(400).json({ error: "text too long" });
  if (priority && !VALID_PRIORITIES.includes(priority)) return res.status(400).json({ error: "invalid priority" });
  if (category && !VALID_CATEGORIES.includes(category)) return res.status(400).json({ error: "invalid category" });
  const todo = {
    id: nextTodoId++, text: t, done: false,
    dueDate: dueDate || null, priority: priority || "medium",
    category: category || null, order: todos.length,
    createdAt: new Date().toISOString(), completedAt: null,
  };
  todos.push(todo);
  await saveTodos();
  res.status(201).json({ message: "todo created", todo });
});

app.put("/api/todos/reorder", async (req, res) => {
  const { orderedIds } = req.body || {};
  if (!Array.isArray(orderedIds)) return res.status(400).json({ error: "orderedIds must be an array" });
  const reordered = [];
  for (let i = 0; i < orderedIds.length; i++) {
    const id = Number(orderedIds[i]);
    const todo = todos.find(t => t.id === id);
    if (!todo) return res.status(404).json({ error: `todo id ${id} not found` });
    reordered.push({ ...todo, order: i });
  }
  todos = reordered;
  await saveTodos();
  res.json({ message: "todos reordered", todos });
});

app.put("/api/todos/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { text, done, dueDate, priority, category } = req.body || {};
  const todo = todos.find(item => item.id === id);
  if (!todo) return res.status(404).json({ error: "todo not found" });

  const wasDone = todo.done;

  if (text !== undefined) {
    if (typeof text !== "string" || !text.trim()) return res.status(400).json({ error: "text must be non-empty" });
    const t = text.trim();
    if (t.length > MAX_TODO_TEXT_LENGTH) return res.status(400).json({ error: "text too long" });
    todo.text = t;
  }
  if (done !== undefined) {
    if (typeof done !== "boolean") return res.status(400).json({ error: "done must be boolean" });
    todo.done = done;
    if (!wasDone && done) {
      todo.completedAt = new Date().toISOString();
      await recordCompletion(todo.id, todo.text);
    }
    if (wasDone && !done) {
      todo.completedAt = null;
    }
  }
  if (dueDate !== undefined) todo.dueDate = dueDate || null;
  if (priority !== undefined) {
    if (!VALID_PRIORITIES.includes(priority)) return res.status(400).json({ error: "invalid priority" });
    todo.priority = priority;
  }
  if (category !== undefined) {
    if (category !== null && !VALID_CATEGORIES.includes(category)) return res.status(400).json({ error: "invalid category" });
    todo.category = category;
  }
  await saveTodos();
  res.json({ message: "todo updated", todo });
});

app.delete("/api/todos/:id", async (req, res) => {
  const id = Number(req.params.id);
  const index = todos.findIndex(item => item.id === id);
  if (index === -1) return res.status(404).json({ error: "todo not found" });
  const [deleted] = todos.splice(index, 1);
  await saveTodos();
  res.json({ message: "todo deleted", todo: deleted });
});

app.listen(PORT, () => { console.log(`API server listening on http://localhost:${PORT}`); });
