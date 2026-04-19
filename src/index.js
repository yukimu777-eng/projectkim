const fs = require("fs");
const path = require("path");
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const app = express();
const PORT = process.env.PORT || 3000;

// ===== Redis セットアップ =====
let redis = null;
try {
  const { Redis } = require("@upstash/redis");
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
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

// ===== ファイルストレージ（ローカル用フォールバック） =====
function loadJSON(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
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

// ===== ユーザー別ストレージ =====
async function loadUserData(redisKey, userId, fileBase, fallback) {
  if (redis) {
    const data = await redis.get(`${redisKey}:${userId}`);
    return Array.isArray(data) ? data : fallback;
  }
  return loadJSON(path.join(DATA_DIR, `${fileBase}_${userId}.json`), fallback);
}

async function saveUserData(redisKey, userId, fileBase, data) {
  if (redis) {
    await redis.set(`${redisKey}:${userId}`, data);
  } else {
    saveJSON(path.join(DATA_DIR, `${fileBase}_${userId}.json`), data);
  }
}

function getNextId(arr) {
  if (arr.length === 0) return 1;
  return arr.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

// ===== Redis バックドセッションストア =====
let sessionStore;
if (redis) {
  class RedisSessionStore extends session.Store {
    get(sid, cb) {
      redis.get("sess:" + sid).then(d => cb(null, d)).catch(cb);
    }
    set(sid, sess, cb) {
      const ttl = sess.cookie?.maxAge ? Math.ceil(sess.cookie.maxAge / 1000) : 86400;
      redis.set("sess:" + sid, sess, { ex: ttl }).then(() => cb(null)).catch(cb);
    }
    destroy(sid, cb) {
      redis.del("sess:" + sid).then(() => cb(null)).catch(cb);
    }
  }
  sessionStore = new RedisSessionStore();
}

const isProd = !!process.env.VERCEL || process.env.NODE_ENV === "production";
const BASE_URL = process.env.APP_URL || `http://localhost:${PORT}`;

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || "dev-secret-change-me",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProd,
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: isProd ? "none" : "lax",
  },
}));

app.use(passport.initialize());
app.use(passport.session());

// ===== Passport 設定 =====
passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    if (redis) {
      const user = await redis.get("user:" + id);
      return done(null, user || false);
    }
    done(null, { id: "local", displayName: "Local Dev User", email: "", photo: "" });
  } catch (e) {
    done(e);
  }
});

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: BASE_URL + "/auth/google/callback",
  }, async (accessToken, refreshToken, profile, done) => {
    const user = {
      id: profile.id,
      displayName: profile.displayName,
      email: profile.emails?.[0]?.value || "",
      photo: profile.photos?.[0]?.value || "",
    };
    if (redis) await redis.set("user:" + user.id, user, { ex: 30 * 86400 });
    done(null, user);
  }));
}

// ===== 認証ミドルウェア =====
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  // Google OAuth未設定のローカル開発: 認証スキップ
  if (!process.env.GOOGLE_CLIENT_ID) {
    req.user = { id: "local", displayName: "Local Dev User", email: "", photo: "" };
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

// ===== 認証ルート =====
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/?auth=failed" }),
  (req, res) => res.redirect("/")
);

app.get("/auth/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => res.redirect("/"));
  });
});

app.get("/api/user", (req, res) => {
  if (req.isAuthenticated()) return res.json({ user: req.user });
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.json({ user: { id: "local", displayName: "Local Dev User", email: "", photo: "" } });
  }
  res.status(401).json({ user: null });
});

// ===== 基本ルート =====
app.get("/health", (req, res) => res.json({ status: "ok" }));
app.get("/api/hello", (req, res) => res.json({ message: `Hello, ${req.query.name || "world"}!` }));
app.get("/api/time", (req, res) => res.json({ now: new Date().toISOString() }));

app.post("/api/echo", (req, res) => {
  const { message } = req.body || {};
  if (typeof message !== "string" || !message.trim()) return res.status(400).json({ error: "message is required" });
  const m = message.trim();
  if (m.length > MAX_ECHO_LENGTH) return res.status(400).json({ error: `message must be ${MAX_ECHO_LENGTH} characters or fewer` });
  res.json({ echo: m });
});

let note = "sample note";
app.get("/api/note", (req, res) => res.json({ note }));
app.put("/api/note", (req, res) => {
  const { note: n } = req.body || {};
  if (typeof n !== "string" || !n.trim()) return res.status(400).json({ error: "note is required" });
  const norm = n.trim();
  if (norm.length > MAX_NOTE_LENGTH) return res.status(400).json({ error: `note must be ${MAX_NOTE_LENGTH} chars or fewer` });
  note = norm; res.json({ message: "note updated", note });
});
app.delete("/api/note", (req, res) => { note = ""; res.json({ message: "note deleted", note }); });

// ===== メモAPI =====
app.get("/api/memos", requireAuth, async (req, res) => {
  const memos = await loadUserData("memos", req.user.id, "memos", []);
  res.json({ memos });
});

app.post("/api/memos", requireAuth, async (req, res) => {
  const { title, content } = req.body || {};
  if (typeof content !== "string" || !content.trim()) return res.status(400).json({ error: "content is required" });
  const c = content.trim();
  if (c.length > MAX_MEMO_CONTENT_LENGTH) return res.status(400).json({ error: `content must be ${MAX_MEMO_CONTENT_LENGTH} chars or fewer` });
  const t = typeof title === "string" ? title.trim().slice(0, MAX_MEMO_TITLE_LENGTH) : "";
  const memos = await loadUserData("memos", req.user.id, "memos", []);
  const memo = { id: getNextId(memos), title: t || null, content: c, createdAt: new Date().toISOString() };
  memos.unshift(memo);
  await saveUserData("memos", req.user.id, "memos", memos);
  res.status(201).json({ message: "memo created", memo });
});

app.put("/api/memos/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const memos = await loadUserData("memos", req.user.id, "memos", []);
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
  await saveUserData("memos", req.user.id, "memos", memos);
  res.json({ message: "memo updated", memo });
});

app.delete("/api/memos/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const memos = await loadUserData("memos", req.user.id, "memos", []);
  const index = memos.findIndex(m => m.id === id);
  if (index === -1) return res.status(404).json({ error: "memo not found" });
  const [deleted] = memos.splice(index, 1);
  await saveUserData("memos", req.user.id, "memos", memos);
  res.json({ message: "memo deleted", memo: deleted });
});

// ===== 活動ログAPI =====
app.get("/api/activity-log", requireAuth, async (req, res) => {
  const activityLog = await loadUserData("activity_log", req.user.id, "activity_log", []);
  res.json({ activityLog });
});

// ===== Todo API =====
app.get("/api/todos", requireAuth, async (req, res) => {
  const todos = await loadUserData("todos", req.user.id, "todos", []);
  res.json({ todos });
});

app.post("/api/todos", requireAuth, async (req, res) => {
  const { text, dueDate, priority, category } = req.body || {};
  if (typeof text !== "string" || !text.trim()) return res.status(400).json({ error: "text is required" });
  const t = text.trim();
  if (t.length > MAX_TODO_TEXT_LENGTH) return res.status(400).json({ error: "text too long" });
  if (priority && !VALID_PRIORITIES.includes(priority)) return res.status(400).json({ error: "invalid priority" });
  if (category && !VALID_CATEGORIES.includes(category)) return res.status(400).json({ error: "invalid category" });
  const todos = await loadUserData("todos", req.user.id, "todos", []);
  const todo = {
    id: getNextId(todos), text: t, done: false,
    dueDate: dueDate || null, priority: priority || "medium",
    category: category || null, order: todos.length,
    createdAt: new Date().toISOString(), completedAt: null,
  };
  todos.push(todo);
  await saveUserData("todos", req.user.id, "todos", todos);
  res.status(201).json({ message: "todo created", todo });
});

app.put("/api/todos/reorder", requireAuth, async (req, res) => {
  const { orderedIds } = req.body || {};
  if (!Array.isArray(orderedIds)) return res.status(400).json({ error: "orderedIds must be an array" });
  const todos = await loadUserData("todos", req.user.id, "todos", []);
  const reordered = [];
  for (let i = 0; i < orderedIds.length; i++) {
    const id = Number(orderedIds[i]);
    const todo = todos.find(t => t.id === id);
    if (!todo) return res.status(404).json({ error: `todo id ${id} not found` });
    reordered.push({ ...todo, order: i });
  }
  await saveUserData("todos", req.user.id, "todos", reordered);
  res.json({ message: "todos reordered", todos: reordered });
});

app.put("/api/todos/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { text, done, dueDate, priority, category } = req.body || {};
  const todos = await loadUserData("todos", req.user.id, "todos", []);
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
      const activityLog = await loadUserData("activity_log", req.user.id, "activity_log", []);
      activityLog.push({ id: getNextId(activityLog), todoId: todo.id, todoText: todo.text, completedAt: new Date().toISOString() });
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 90);
      await saveUserData("activity_log", req.user.id, "activity_log",
        activityLog.filter(e => new Date(e.completedAt) >= cutoff));
    }
    if (wasDone && !done) todo.completedAt = null;
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
  await saveUserData("todos", req.user.id, "todos", todos);
  res.json({ message: "todo updated", todo });
});

app.delete("/api/todos/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const todos = await loadUserData("todos", req.user.id, "todos", []);
  const index = todos.findIndex(item => item.id === id);
  if (index === -1) return res.status(404).json({ error: "todo not found" });
  const [deleted] = todos.splice(index, 1);
  await saveUserData("todos", req.user.id, "todos", todos);
  res.json({ message: "todo deleted", todo: deleted });
});

app.listen(PORT, () => console.log(`API server listening on http://localhost:${PORT}`));
