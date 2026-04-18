const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_ECHO_LENGTH = 100;
const MAX_NOTE_LENGTH = 200;
const MAX_TODO_TEXT_LENGTH = 120;
let note = "sample note";
let todos = [];
let nextTodoId = 1;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Node.js API server is running",
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
  });
});

app.get("/api/hello", (req, res) => {
  const name = req.query.name || "world";
  res.json({
    message: `Hello, ${name}!`,
  });
});

app.get("/api/time", (req, res) => {
  res.json({
    now: new Date().toISOString(),
  });
});

app.post("/api/echo", (req, res) => {
  const { message } = req.body || {};

  if (typeof message !== "string") {
    return res.status(400).json({
      error: "message is required",
    });
  }

  const normalizedMessage = message.trim();

  if (!normalizedMessage) {
    return res.status(400).json({
      error: "message is required",
    });
  }

  if (normalizedMessage.length > MAX_ECHO_LENGTH) {
    return res.status(400).json({
      error: `message must be ${MAX_ECHO_LENGTH} characters or fewer`,
    });
  }

  res.json({
    echo: normalizedMessage,
  });
});

app.get("/api/note", (req, res) => {
  res.json({
    note,
  });
});

app.put("/api/note", (req, res) => {
  const { note: nextNote } = req.body || {};

  if (typeof nextNote !== "string") {
    return res.status(400).json({
      error: "note is required",
    });
  }

  const normalizedNote = nextNote.trim();

  if (!normalizedNote) {
    return res.status(400).json({
      error: "note is required",
    });
  }

  if (normalizedNote.length > MAX_NOTE_LENGTH) {
    return res.status(400).json({
      error: `note must be ${MAX_NOTE_LENGTH} characters or fewer`,
    });
  }

  note = normalizedNote;

  res.json({
    message: "note updated",
    note,
  });
});

app.delete("/api/note", (req, res) => {
  note = "";
  res.json({
    message: "note deleted",
    note,
  });
});

app.get("/api/todos", (req, res) => {
  res.json({
    todos,
  });
});

app.post("/api/todos", (req, res) => {
  const { text } = req.body || {};

  if (typeof text !== "string" || !text.trim()) {
    return res.status(400).json({
      error: "text is required",
    });
  }

  const normalizedText = text.trim();

  if (normalizedText.length > MAX_TODO_TEXT_LENGTH) {
    return res.status(400).json({
      error: `text must be ${MAX_TODO_TEXT_LENGTH} characters or fewer`,
    });
  }

  const todo = {
    id: nextTodoId,
    text: normalizedText,
    done: false,
  };

  nextTodoId += 1;
  todos.push(todo);

  res.status(201).json({
    message: "todo created",
    todo,
  });
});

app.put("/api/todos/:id", (req, res) => {
  const id = Number(req.params.id);
  const { text, done } = req.body || {};
  const todo = todos.find((item) => item.id === id);

  if (!todo) {
    return res.status(404).json({
      error: "todo not found",
    });
  }

  if (text !== undefined) {
    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({
        error: "text must be a non-empty string",
      });
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
      return res.status(400).json({
        error: "done must be true or false",
      });
    }
    todo.done = done;
  }

  res.json({
    message: "todo updated",
    todo,
  });
});

app.delete("/api/todos/:id", (req, res) => {
  const id = Number(req.params.id);
  const index = todos.findIndex((item) => item.id === id);

  if (index === -1) {
    return res.status(404).json({
      error: "todo not found",
    });
  }

  const [deletedTodo] = todos.splice(index, 1);
  res.json({
    message: "todo deleted",
    todo: deletedTodo,
  });
});

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
