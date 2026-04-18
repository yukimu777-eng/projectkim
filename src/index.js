const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_ECHO_LENGTH = 100;

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

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
