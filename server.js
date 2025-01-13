const express = require("express");
const bodyParser = require("body-parser");
const { Worker } = require("worker_threads");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
app.use(cors());
app.use(bodyParser.json());

// Endpoint to handle code execution
app.post("/", (req, res) => {
    const { code, input, language } = req.body;

    console.log("Code received:", code);
    console.log("Input received:", input);
    console.log("Language selected:", language);

    if (!code) {
        return res.status(400).json({ error: { fullError: "Error: No code provided!" } });
    }

    const worker = new Worker("./compiler-worker.js", {
        workerData: { code, input, language },
    });

    worker.on("message", (result) => {
        console.log("Worker result:", result);
        res.json(result);
    });

    worker.on("error", (err) => {
        console.error("Worker error:", err.message);
        res.status(500).json({ error: { fullError: `Worker error: ${err.message}` } });
    });

    worker.on("exit", (code) => {
        console.log(`Worker exited with code: ${code}`);
        if (code !== 0) {
            console.error("Worker stopped unexpectedly.");
        }
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
