const { parentPort, workerData } = require("worker_threads");
const { spawnSync } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs");

// Utility function to clean up temporary files
function cleanupFiles(...files) {
    files.forEach((file) => {
        try {
            fs.unlinkSync(file);
        } catch (err) {
            // Ignore errors
        }
    });
}

// Worker logic
(async () => {
    const { code, input } = workerData;

    // Paths for temporary source file and executable
    const tmpDir = os.tmpdir();
    const sourceFile = path.join(tmpDir, `temp_${Date.now()}.cpp`);
    const executable = path.join(tmpDir, `temp_${Date.now()}.out`);

    const clangPath = "/usr/bin/clang++"; // Full path to clang++ binary

    try {
        // Write the code to the source file
        fs.writeFileSync(sourceFile, code);

        // Compile the code using Clang++
        const compileProcess = spawnSync(clangPath, [
            sourceFile,
            "-o", executable,
            "-std=c++17",
            "-O2",
            "-Wall",
        ], {
            encoding: "utf-8",
            timeout: 10000, // 10 seconds timeout for compilation
        });

        if (compileProcess.error || compileProcess.stderr) {
            cleanupFiles(sourceFile, executable);
            const errorTrace = compileProcess.stderr || compileProcess.error.message;
            return parentPort.postMessage({
                error: {
                    fullError: `Compilation Error:\n${errorTrace}`,
                    traceback: errorTrace, // Provide detailed traceback
                },
            });
        }

        // Execute the compiled binary
        const runProcess = spawnSync(executable, [], {
            input,
            encoding: "utf-8",
            timeout: 5000, // Timeout after 5 seconds for execution
        });

        cleanupFiles(sourceFile, executable);

        if (runProcess.error || runProcess.stderr) {
            const errorTrace = runProcess.stderr || runProcess.error.message;
            return parentPort.postMessage({
                error: {
                    fullError: `Runtime Error:\n${errorTrace}`,
                    traceback: errorTrace, // Provide detailed traceback
                },
            });
        }

        // Send the output back to the main thread
        return parentPort.postMessage({
            output: runProcess.stdout || "No output received!",
        });
    } catch (err) {
        cleanupFiles(sourceFile, executable);
        return parentPort.postMessage({
            error: {
                fullError: `Server Error:\n${err.message}`,
                traceback: err.stack, // Provide full traceback for server errors
            },
        });
    }
})();
