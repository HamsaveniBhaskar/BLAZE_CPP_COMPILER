const path = require("path");
const Piscina = require("piscina");
const express = require("express");
const cors = require("cors");
const http = require("http");
const os = require("os");

const app = express();
const port = 3000;

// Allow all CORS origins
app.use(cors({ origin: "*" }));
app.use(express.json());

// Piscina worker pool
const pool = new Piscina({
    filename: path.resolve(__dirname, "compiler-worker.js"),
    maxThreads: Math.max(2, os.cpus().length),
    idleTimeout: 60000,
    minThreads: Math.max(2, os.cpus().length / 2),
    concurrentTasksPerWorker: 2
});

// POST endpoint for execution
app.post("/", async (req, res) => {
    try {
        const { code, input } = req.body;

        if (!code) {
            return res.status(400).json({ error: { fullError: "Error: No code provided!" } });
        }

        // Run code execution in Piscina worker with a timeout
        const result = await pool.run({ code, input }, { timeout: 5000 });
        res.json(result);

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ 
            error: { 
                fullError: `Server Error: ${error.message}`, 
                traceback: error.stack 
            } 
        });
    }
});

// Health check
app.get("/health", (_, res) => res.json({ status: "Server is running" }));

// Keep server active
setInterval(() => http.get(`http://localhost:${port}/health`), 15 * 60 * 1000);

app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
