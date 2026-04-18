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

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
