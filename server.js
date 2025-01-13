const express = require("express");
const bodyParser = require("body-parser");
const WorkerPool = require("workerpool");
const crypto = require("crypto");
const os = require("os");

const app = express();
const port = 3000;

// Worker pool for parallel processing
const pool = WorkerPool.pool("./compiler-worker.js", { maxWorkers: os.cpus().length });

// In-memory cache for compiled results
const cache = new Map();
const CACHE_EXPIRATION_TIME = 60 * 60 * 1000; // 1 hour

// Clean cache periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, { timestamp }] of cache.entries()) {
        if (now - timestamp > CACHE_EXPIRATION_TIME) {
            cache.delete(key);
        }
    }
}, 60000);

// Middleware
app.use(bodyParser.json());

// Health check endpoint
app.get("/health", (req, res) => {
    res.json({ status: "Server is running" });
});

// Code compilation and execution endpoint
app.post("/", (req, res) => {
    const { code, input } = req.body;

    if (!code) {
        return res.status(400).json({ error: "No code provided!" });
    }

    // Generate a unique hash for the code
    const codeHash = crypto.createHash("md5").update(code).digest("hex");

    // Serve from cache if available
    if (cache.has(codeHash)) {
        return res.json({ output: cache.get(codeHash).result });
    }

    // Compile and execute the code
    pool.exec("compileAndRun", [code, input])
        .then((result) => {
            // Cache the result if successful
            cache.set(codeHash, { result, timestamp: Date.now() });
            res.json(result);
        })
        .catch((err) => {
            res.status(500).json({ error: `Server error: ${err.message}` });
        });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
