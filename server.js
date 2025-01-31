const path = require("path");
const Piscina = require("piscina");
const express = require("express");
const cors = require("cors");
const http = require("http");

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Use an absolute path to reference the worker file
const pool = new Piscina({
    filename: path.resolve(__dirname, "compiler-worker.js"), 
    maxThreads: Math.max(2, require("os").cpus().length - 1), // Optimize worker usage
    idleTimeout: 30000, // Auto-close idle workers
    errorHandler: (err) => console.error("Worker Error:", err) // Capture worker errors
});

// POST endpoint for compilation & execution
app.post("/", async (req, res) => {
    const { code, input } = req.body;

    if (!code) {
        return res.status(400).json({ error: { fullError: "Error: No code provided!" } });
    }

    try {
        // Execute the worker with Piscina
        const result = await pool.run({ code, input }, { timeout: 5000 });
        res.json(result);
    } catch (error) {
        console.error("Piscina Error:", error);
        res.status(500).json({ error: { fullError: `Worker error: ${error.message}` } });
    }
});

// Health check
app.get("/health", (_, res) => res.json({ status: "Server is running" }));

// Reduce self-ping frequency
setInterval(() => http.get(`http://localhost:${port}/health`), 15 * 60 * 1000);

app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
