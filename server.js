const path = require("path");
const Piscina = require("piscina");
const express = require("express");
const cors = require("cors");
const http = require("http");
const os = require("os");

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Optimize worker pool for high concurrency
const pool = new Piscina({
    filename: path.resolve(__dirname, "compiler-worker.js"), 
    maxThreads: Math.max(2, os.cpus().length),
    idleTimeout: 60000,
    minThreads: Math.max(2, os.cpus().length / 2),
    concurrentTasksPerWorker: 2,
    errorHandler: (err) => console.error("Piscina Worker Error:", err)
});

// POST endpoint for compilation & execution
app.post("/", async (req, res) => {
    const { code, input } = req.body;

    if (!code) {
        return res.status(400).json({ error: { fullError: "Error: No code provided!" } });
    }

    try {
        // Run code execution in Piscina worker with a 5-second timeout
        const result = await pool.run({ code, input }, { timeout: 5000 });
        res.json(result);
    } catch (error) {
        console.error("Piscina Error:", error);

        if (error.error) {
            return res.status(500).json(error.error);
        }

        res.status(500).json({ 
            error: { 
                fullError: `Worker error: ${error.message}`, 
                traceback: error.stack 
            } 
        });
    }
});

// Health check
app.get("/health", (_, res) => res.json({ status: "Server is running" }));

// Reduce self-ping frequency
setInterval(() => http.get(`http://localhost:${port}/health`), 15 * 60 * 1000);

app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
