const express = require("express");
const { Worker } = require("worker_threads");
const cors = require("cors");
const http = require("http");
const Piscina = require("piscina");

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Create a worker pool (limit max concurrency to optimize CPU usage)
const pool = new Piscina({
    filename: require.resolve("./compiler-worker.js"),
    maxThreads: Math.max(2, require("os").cpus().length - 1), // Efficient CPU allocation
    idleTimeout: 30000, // Auto-close idle workers
});

// POST endpoint for compilation & execution
app.post("/", async (req, res) => {
    const { code, input } = req.body;

    if (!code) {
        return res.status(400).json({ error: { fullError: "Error: No code provided!" } });
    }

    try {
        // Send task to worker pool
        const result = await pool.run({ code, input }, { timeout: 5000 }); // 5s timeout for safety
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: { fullError: `Worker error: ${error.message}` } });
    }
});

// Health check (optimized)
app.get("/health", (_, res) => res.json({ status: "Server is running" }));

// Reduce self-ping frequency to reduce CPU overhead
setInterval(() => http.get(`http://localhost:${port}/health`), 15 * 60 * 1000); // Every 15 minutes

app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
