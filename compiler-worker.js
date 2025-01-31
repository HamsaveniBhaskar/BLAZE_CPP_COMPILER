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
                    return reject({ error: { fullError: `Compilation Error:\n${compileError}` } });
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
                    return reject({ error: { fullError: `Runtime Error:\n${runtimeError}` } });
                }

                resolve({ output: output.trim() || "No output received!" });
            });

            runProcess.on("error", (err) => {
                cleanupFiles(sourceFile, executable);
                reject({ error: { fullError: `Execution Error: ${err.message}` } });
            });
        });

    } catch (err) {
        cleanupFiles(sourceFile, executable);
        throw new Error(`Worker crashed: ${err.message}`);
    }
};
