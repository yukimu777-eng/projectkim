const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_ECHO_LENGTH = 100;
const MAX_NOTE_LENGTH = 200;
let note = "sample note";

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

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
