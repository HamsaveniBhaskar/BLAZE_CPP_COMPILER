const { spawn } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs").promises;

// Ensure temporary directory exists
const tmpDir = path.join(os.tmpdir(), "blaze_code_temp");
fs.mkdir(tmpDir, { recursive: true }).catch(() => {});

// Utility function for cleanup
const cleanupFiles = async (...files) => {
    for (const file of files) {
        try {
            await fs.unlink(file);
        } catch (err) {}
    }
};

// Function to parse compilation errors and extract useful info
const parseCompileError = (errorMsg) => {
    const errorLines = errorMsg.split("\n");
    const errors = [];

    for (const line of errorLines) {
        const match = line.match(/(.+?):(\d+):(\d+): (error|warning): (.+)/);
        if (match) {
            errors.push({
                file: match[1],
                line: parseInt(match[2], 10),
                column: parseInt(match[3], 10),
                message: match[5]
            });
        }
    }

    return errors.length > 0 ? errors : [{ message: errorMsg }];
};

// Exported function for Piscina
module.exports = async function ({ code, input }) {
    if (!code) {
        throw new Error("Worker received invalid data: No code provided.");
    }

    const timestamp = Date.now();
    const sourceFile = path.join(tmpDir, `temp_${timestamp}.cpp`);
    const executable = path.join(tmpDir, `temp_${timestamp}.out`);
    const clangPath = "/usr/bin/clang++";

    try {
        // Write source file
        await fs.writeFile(sourceFile, code);

        // Compile code
        const compileProcess = spawn(clangPath, [
            sourceFile, "-o", executable, "-O2", "-std=c++17"
        ]);

        let compileError = "";

        compileProcess.stderr.on("data", (data) => {
            compileError += data.toString();
        });

        await new Promise((resolve, reject) => {
            compileProcess.on("close", (code) => {
                if (code !== 0) {
                    cleanupFiles(sourceFile, executable);
                    return reject({
                        error: {
                            fullError: `=== COMPILATION ERROR ===\n${compileError}`,
                            traceback: compileError,
                            details: parseCompileError(compileError)
                        }
                    });
                }
                resolve();
            });
        });

        // Execute compiled binary
        return new Promise((resolve, reject) => {
            const runProcess = spawn(executable, []);

            let output = "";
            let runtimeError = "";

            runProcess.stdout.on("data", (data) => {
                output += data.toString();
            });

            runProcess.stderr.on("data", (data) => {
                runtimeError += data.toString();
            });

            // Only send input if provided and not empty
            if (input && input.trim()) {
                runProcess.stdin.write(input + "\n");
                runProcess.stdin.end();
            }

            runProcess.on("close", (code) => {
                cleanupFiles(sourceFile, executable);

                if (code !== 0 || runtimeError) {
                    return reject({
                        error: {
                            fullError: `=== RUNTIME ERROR ===\n${runtimeError}`,
                            traceback: runtimeError
                        }
                    });
                }

                resolve({ output: output.trim() || "No output received!" });
            });

            runProcess.on("error", (err) => {
                cleanupFiles(sourceFile, executable);
                reject({
                    error: {
                        fullError: `=== EXECUTION ERROR === ${err.message}`,
                        traceback: err.stack
                    }
                });
            });
        });

    } catch (err) {
        cleanupFiles(sourceFile, executable);
        throw {
            error: {
                fullError: `=== WORKER CRASHED ===\n${err.message}`,
                traceback: err.stack
            }
        };
    }
};
