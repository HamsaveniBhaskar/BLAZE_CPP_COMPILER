const { spawn } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs");

// Ensure temporary directory exists
const tmpDir = path.join(os.tmpdir(), "blaze_code_temp");
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

// Utility function for cleanup
const cleanupFiles = (...files) => {
    files.forEach((file) => {
        fs.unlink(file, () => {});
    });
};

// **Exported function for Piscina**
module.exports = async function ({ code, input }) {
    if (!code) {
        throw new Error("Worker received invalid data: No code provided.");
    }

    const timestamp = Date.now();
    const sourceFile = path.join(tmpDir, `temp_${timestamp}.cpp`);
    const executable = path.join(tmpDir, `temp_${timestamp}.exe`);
    const clangPath = "/usr/bin/clang++";

    try {
        fs.writeFileSync(sourceFile, code);

        // Compile code
        const compile = spawn(clangPath, [
            sourceFile, "-o", executable, "-O2", "-std=c++17"
        ]);

        let compileError = "";
        compile.stderr.on("data", (data) => compileError += data.toString());

        return new Promise((resolve, reject) => {
            compile.on("close", (code) => {
                if (code !== 0 || compileError) {
                    cleanupFiles(sourceFile, executable);
                    return reject({ error: { fullError: `Compilation Error:\n${compileError}` } });
                }

                // Run compiled binary
                const run = spawn(executable);
                let output = "", runtimeError = "";

                run.stdin.write(input);
                run.stdin.end();

                run.stdout.on("data", (data) => output += data.toString());
                run.stderr.on("data", (data) => runtimeError += data.toString());

                // Set execution timeout
                const timeout = setTimeout(() => {
                    run.kill();
                    cleanupFiles(sourceFile, executable);
                    reject({ error: { fullError: "Runtime Error: Execution timed out!" } });
                }, 3000);

                run.on("close", (exitCode) => {
                    clearTimeout(timeout);
                    cleanupFiles(sourceFile, executable);

                    if (exitCode !== 0 || runtimeError) {
                        return reject({ error: { fullError: `Runtime Error:\n${runtimeError}` } });
                    }

                    resolve({ output: output.trim() || "No output received!" });
                });
            });
        });

    } catch (err) {
        cleanupFiles(sourceFile, executable);
        throw new Error(`Worker crashed: ${err.message}`);
    }
};
