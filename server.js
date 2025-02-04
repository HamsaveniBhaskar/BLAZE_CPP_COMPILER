const express = require("express");
const bodyParser = require("body-parser");
const { Worker } = require("worker_threads");
const cors = require("cors");
const http = require("http");

const app = express();
const port = 3000;

// Enable CORS
app.use(cors());

// Middleware for JSON parsing
app.use(bodyParser.json());

// POST endpoint for C++ code execution
app.post("/", (req, res) => {
    const { code, input } = req.body;

    // Validate input
    if (!code) {
        return res.status(400).json({ error: { fullError: "Error: No code provided!" } });
    }

    // Create a worker thread for C++ code execution
    const worker = new Worker("./cpp-worker.js", {
        workerData: { code, input },
    });

    worker.on("message", (result) => {
        res.json(result);
    });

    worker.on("error", (err) => {
        res.status(500).json({ error: { fullError: `Worker error: ${err.message}` } });
    });

    worker.on("exit", (code) => {
        if (code !== 0) {
            console.error(`Worker stopped with exit code ${code}`);
        }
    });
});

// Health check endpoint
app.get("/health", (req, res) => {
    res.status(200).json({ status: "Server is healthy!" });
});

// Self-pinging mechanism to keep the server alive
setInterval(() => {
    http.get(`http://localhost:${port}/health`, (res) => {
        console.log("Health check pinged!");
    });
}, 1 * 60 * 1000); // Ping every minute

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
