const express = require("express");
const { Worker } = require("worker_threads");
const cors = require("cors");
const http = require("http");

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// POST endpoint for compilation & execution
app.post("/", (req, res) => {
    const { code, input } = req.body;

    if (!code) {
        return res.status(400).json({ error: { fullError: "Error: No code provided!" } });
    }

    const worker = new Worker("./compiler-worker.js", { workerData: { code, input } });

    worker.on("message", (result) => res.json(result));
    worker.on("error", (err) => res.status(500).json({ error: { fullError: `Worker error: ${err.message}` } }));
    worker.on("exit", (exitCode) => {
        if (exitCode !== 0) console.error(`Worker exited with code ${exitCode}`);
    });
});

// Health check (optimized)
app.get("/health", (_, res) => res.json({ status: "Server is running" }));

// Reduce self-ping frequency to reduce CPU overhead
setInterval(() => http.get(`http://localhost:${port}/health`), 15 * 60 * 1000); // Every 15 minutes

app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
