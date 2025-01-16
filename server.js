const express = require("express");
const { Worker } = require("worker_threads");
const crypto = require("crypto");
const http = require("http");
const path = require("path");

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

    // Generate a unique hash for the code and input to handle dynamic responses
    const uniqueHash = crypto
        .createHash("md5")
        .update(code + input)
        .digest("hex");

    // Create a new worker thread for dynamic compilation and execution
    const worker = new Worker(path.join(__dirname, "compiler-worker.js"), {
        workerData: { code, input },
    });

    worker.on("message", (result) => {
        // Respond with the result (output or error) dynamically
        if (result.output) {
            return res.json({ output: result.output });
        }
        if (result.error) {
            return res.status(500).json({ error: result.error });
        }
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
    res.json({ status: "Server is running" });
});

// Self-pinging mechanism to keep the server alive (optimized)
setInterval(() => {
    http.get(`http://localhost:${port}/health`, (res) => {
        console.log("Health check pinged!");
    }).on("error", (err) => {
        console.error("Health check failed:", err.message);
    });
}, 10 * 60 * 1000); // Ping every 10 minutes

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
