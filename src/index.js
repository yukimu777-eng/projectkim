const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

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

  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({
      error: "message is required",
    });
  }

  res.json({
    echo: message.trim(),
  });
});

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
