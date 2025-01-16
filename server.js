const express = require("express");
const { Worker } = require("worker_threads");
const crypto = require("crypto");
const http = require("http");
const path = require("path");

const app = express();
const port = 3000;

app.use(require("cors")());
app.use(express.json());

app.post("/", (req, res) => {
    const { code, input } = req.body;

    if (!code) {
        return res.status(400).json({ error: { fullError: "Error: No code provided!" } });
    }

    const worker = new Worker(path.join(__dirname, "compiler-worker.js"), {
        workerData: { code, input },
    });

    worker.on("message", (result) => {
        if (result.output) {
            return res.json({ output: result.output });
        }

        if (result.error) {
            // Include the full traceback in the response
            return res.status(500).json({
                error: {
                    fullError: result.error.fullError,
                    traceback: result.error.traceback,
                },
            });
        }
    });

    worker.on("error", (err) => {
        res.status(500).json({ error: { fullError: `Worker error: ${err.message}`, traceback: err.stack } });
    });

    worker.on("exit", (code) => {
        if (code !== 0) {
            console.error(`Worker stopped with exit code ${code}`);
        }
    });
});

app.get("/health", (req, res) => {
    res.json({ status: "Server is running" });
});

setInterval(() => {
    http.get(`http://localhost:${port}/health`, (res) => {
        console.log("Health check pinged!");
    }).on("error", (err) => {
        console.error("Health check failed:", err.message);
    });
}, 10 * 60 * 1000);

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
