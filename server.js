const path = require("path");
const Piscina = require("piscina");
const express = require("express");
const cors = require("cors");
const http = require("http");
const os = require("os");

const app = express();
const port = 3000;

app.use(cors({ origin: "*" }));
app.use(express.json());

const pool = new Piscina({
    filename: path.resolve(__dirname, "compiler-worker.js"),
    maxThreads: Math.max(2, os.cpus().length),
    idleTimeout: 60000,
    minThreads: Math.max(2, os.cpus().length / 2),
    concurrentTasksPerWorker: 2
});

app.post("/", async (req, res) => {
    try {
        const { code, input } = req.body;

        if (!code) {
            return res.status(400).json({ error: { fullError: "Error: No code provided!" } });
        }

        // Ensure we are passing the correct data structure to the worker
        const result = await pool.run({ code, input }, { timeout: 5000 });
        res.json(result);

    } catch (error) {
        console.error("Server Error:", error);

        res.status(500).json({
            error: {
                fullError: error.error?.fullError || "Unknown server error",
                traceback: error.error?.traceback || "No traceback available",
            },
        });
    }
});


app.get("/health", (_, res) => res.json({ status: "Server is running" }));

setInterval(() => http.get(`http://localhost:${port}/health`), 15 * 60 * 1000);

app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
