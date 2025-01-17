const express = require("express");
const { Worker } = require("worker_threads");
const http = require("http");

const app = express();
const port = 3000;

// Enable CORS and use express.json() for built-in JSON parsing
app.use(require("cors")());
app.use(express.json());

// POST endpoint for code compilation and execution
app.post("/", (req, res) => {
    const { code, input } = req.body;

    // Validate input
    if (!code) {
        return res.status(400).json({ error: { fullError: "Error: No code provided!" } });
    }

    // Create a worker thread for fast, isolated execution
    const worker = new Worker("./compiler-worker.js", {
        workerData: { code, input },
    });

    // Handle worker response
    worker.once("message", (result) => res.json(result));
    worker.once("error", (err) => {
        res.status(500).json({ error: { fullError: `Worker error: ${err.message}` } });
    });
    worker.once("exit", (code) => {
        if (code !== 0) {
            console.error(`Worker stopped with exit code ${code}`);
        }
    });
});

// Health check endpoint
app.get("/health", (req, res) => {
    res.json({ status: "Server is running" });
});

// Self-pinging mechanism to keep the server alive
setInterval(() => {
    http.get(`http://localhost:${port}/health`, () => {
        console.log("Health check pinged!");
    });
}, 5 * 60 * 1000); // Ping every 5 minutes

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
