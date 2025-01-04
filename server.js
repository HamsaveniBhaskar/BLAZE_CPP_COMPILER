const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const cors = require("cors");

const app = express(); // Initialize app first

// Enable CORS
app.use(cors());

const port = 3000;

// Middleware
app.use(bodyParser.json());

// Utility function to clean up files
function cleanupFiles(...files) {
    files.forEach((file) => {
        if (fs.existsSync(file)) {
            fs.unlinkSync(file);
        }
    });
}

// POST endpoint to compile and execute C++ code
app.post("/", (req, res) => {
    const { code, input } = req.body;

    // Check if code is provided
    if (!code) {
        return res.status(400).json({ error: { fullError: "Error: No code provided!" } });
    }

    // File paths for temporary source and executable files
    const sourceFile = path.join(__dirname, "main.cpp");
    const executable = path.join(__dirname, "main.exe");

    // Write the code to the source file
    fs.writeFileSync(sourceFile, code);

    try {
        // Compile the code
        const compileProcess = spawn("g++", [sourceFile, "-o", executable]);

        let compileError = "";
        compileProcess.stderr.on("data", (data) => {
            compileError += data.toString();
        });

        compileProcess.on("close", (compileCode) => {
            if (compileCode !== 0) {
                // Parse error message for structured response
                const errorLines = compileError.split("\n").map((line) =>
                    line.replace(__dirname, "").replace(/\\/g, "/")
                ); // Remove directory path and normalize slashes

                const errorDetails = errorLines.find((line) =>
                    line.includes("error:") && line.match(/(\d+):(\d+)/)
                );

                let line = 0,
                    column = 0,
                    message = "Compilation Error";
                if (errorDetails) {
                    const match = errorDetails.match(/:(\d+):(\d+): error: (.*)/);
                    if (match) {
                        line = parseInt(match[1]);
                        column = parseInt(match[2]);
                        message = match[3].trim();
                    }
                }

                // Clean up files and send error response
                cleanupFiles(sourceFile, executable);
                return res.json({
                    error: {
                        fullError: `Compilation Error:\n${errorLines.join("\n")}`,
                        line,
                        column,
                        message,
                    },
                });
            }

            // If compilation succeeds, execute the code
            const runProcess = spawn(executable, [], { stdio: ["pipe", "pipe", "pipe"] });

            let processOutput = "";
            let executionError = "";

            // Handle standard output
            runProcess.stdout.on("data", (data) => {
                processOutput += data.toString();
            });

            // Handle standard error
            runProcess.stderr.on("data", (data) => {
                executionError += data.toString();
            });

            // Handle user input if provided
            if (input) {
                runProcess.stdin.write(input + "\n");
                runProcess.stdin.end();
            }

            runProcess.on("close", (runCode) => {
                cleanupFiles(sourceFile, executable);

                if (runCode !== 0) {
                    // Runtime error occurred
                    return res.json({
                        error: {
                            fullError: `Runtime Error:\n${executionError || "An error occurred during execution."}`,
                        },
                    });
                }

                // Return the program output
                res.json({
                    output: processOutput || "No output received!",
                });
            });
        });
    } catch (error) {
        cleanupFiles(sourceFile, executable);
        res.json({
            error: { fullError: `Server error: ${error.message}` },
        });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
