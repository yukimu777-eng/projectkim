const fs = require("fs");
const path = require("path");
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

const MAX_ECHO_LENGTH = 100;
const MAX_NOTE_LENGTH = 200;
const MAX_TODO_TEXT_LENGTH = 120;

const VALID_PRIORITIES = ["high", "medium", "low"];
const VALID_CATEGORIES = ["仕事", "プライベート", "学習", "その他"];

const DATA_DIR = path.join(__dirname, "..", "data");
const TODOS_FILE_PATH = path.join(DATA_DIR, "todos.json");

let note = "sample note";
let todos = loadTodos();
let nextTodoId = getNextTodoId(todos);

function loadTodos() {
  try {
    if (!fs.existsSync(TODOS_FILE_PATH)) return [];
    const raw = fs.readFileSync(TODOS_FILE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (error) {
    console.warn("Failed to load todos from file. Starting with empty list.");
    return [];
  }
}

function saveTodos() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(TODOS_FILE_PATH, JSON.stringify(todos, null, 2), "utf8");
  } catch (error) {
    console.error("Failed to save todos:", error.message);
  }
}

function getNextTodoId(currentTodos) {
  if (currentTodos.length === 0) return 1;
  const maxId = currentTodos.reduce(
    (max, item) => Math.max(max, Number(item.id) || 0), 0
  );
  return maxId + 1;
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/", (req, res) => {
  res.json({ message: "Node.js API server is running" });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/hello", (req, res) => {
  const name = req.query.name || "world";
  res.json({ message: `Hello, ${name}!` });
});

app.get("/api/time", (req, res) => {
  res.json({ now: new Date().toISOString() });
});

app.post("/api/echo", (req, res) => {
  const { message } = req.body || {};
  if (typeof message !== "string") {
    return res.status(400).json({ error: "message is required" });
  }
  const normalizedMessage = message.trim();
  if (!normalizedMessage) {
    return res.status(400).json({ error: "message is required" });
  }
  if (normalizedMessage.length > MAX_ECHO_LENGTH) {
    return res.status(400).json({
      error: `message must be ${MAX_ECHO_LENGTH} characters or fewer`,
    });
  }
  res.json({ echo: normalizedMessage });
});

app.get("/api/note", (req, res) => {
  res.json({ note });
});

app.put("/api/note", (req, res) => {
  const { note: nextNote } = req.body || {};
  if (typeof nextNote !== "string") {
    return res.status(400).json({ error: "note is required" });
  }
  const normalizedNote = nextNote.trim();
  if (!normalizedNote) {
    return res.status(400).json({ error: "note is required" });
  }
  if (normalizedNote.length > MAX_NOTE_LENGTH) {
    return res.status(400).json({
      error: `note must be ${MAX_NOTE_LENGTH} characters or fewer`,
    });
  }
  note = normalizedNote;
  res.json({ message: "note updated", note });
});

app.delete("/api/note", (req, res) => {
  note = "";
  res.json({ message: "note deleted", note });
});

app.get("/api/todos", (req, res) => {
  res.json({ todos });
});

app.post("/api/todos", (req, res) => {
  const { text, dueDate, priority, category } = req.body || {};
  if (typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "text is required" });
  }
  const normalizedText = text.trim();
  if (normalizedText.length > MAX_TODO_TEXT_LENGTH) {
    return res.status(400).json({
      error: `text must be ${MAX_TODO_TEXT_LENGTH} characters or fewer`,
    });
  }
  if (priority && !VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: "invalid priority" });
  }
  if (category && !VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: "invalid category" });
  }
  const todo = {
    id: nextTodoId,
    text: normalizedText,
    done: false,
    dueDate: dueDate || null,
    priority: priority || "medium",
    category: category || null,
    order: todos.length,
  };
  nextTodoId += 1;
  todos.push(todo);
  saveTodos();
  res.status(201).json({ message: "todo created", todo });
});

app.put("/api/todos/reorder", (req, res) => {
  const { orderedIds } = req.body || {};
  if (!Array.isArray(orderedIds)) {
    return res.status(400).json({ error: "orderedIds must be an array" });
  }
  const reordered = [];
  for (let i = 0; i < orderedIds.length; i++) {
    const id = Number(orderedIds[i]);
    const todo = todos.find((t) => t.id === id);
    if (!todo) {
      return res.status(404).json({ error: `todo id ${id} not found` });
    }
    reordered.push({ ...todo, order: i });
  }
  todos = reordered;
  saveTodos();
  res.json({ message: "todos reordered", todos });
});

app.put("/api/todos/:id", (req, res) => {
  const id = Number(req.params.id);
  const { text, done, dueDate, priority, category } = req.body || {};
  const todo = todos.find((item) => item.id === id);
  if (!todo) {
    return res.status(404).json({ error: "todo not found" });
  }
  if (text !== undefined) {
    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "text must be a non-empty string" });
    }
    const normalizedText = text.trim();
    if (normalizedText.length > MAX_TODO_TEXT_LENGTH) {
      return res.status(400).json({
        error: `text must be ${MAX_TODO_TEXT_LENGTH} characters or fewer`,
      });
    }
    todo.text = normalizedText;
  }
  if (done !== undefined) {
    if (typeof done !== "boolean") {
      return res.status(400).json({ error: "done must be true or false" });
    }
    todo.done = done;
  }
  if (dueDate !== undefined) {
    todo.dueDate = dueDate || null;
  }
  if (priority !== undefined) {
    if (!VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: "invalid priority" });
    }
    todo.priority = priority;
  }
  if (category !== undefined) {
    if (category !== null && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: "invalid category" });
    }
    todo.category = category;
  }
  saveTodos();
  res.json({ message: "todo updated", todo });
});

app.delete("/api/todos/:id", (req, res) => {
  const id = Number(req.params.id);
  const index = todos.findIndex((item) => item.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "todo not found" });
  }
  const [deletedTodo] = todos.splice(index, 1);
  saveTodos();
  res.json({ message: "todo deleted", todo: deletedTodo });
});

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
