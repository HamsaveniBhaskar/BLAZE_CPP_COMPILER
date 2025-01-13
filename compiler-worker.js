const { parentPort, workerData } = require("worker_threads");
const { spawnSync } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs");
const { vol } = require("memfs"); // In-memory file system

// Utility function to clean up temporary files (no longer needed for in-memory files)
function cleanupFiles() {
    // Nothing to clean up as files are in memory
}

// Worker logic
(async () => {
    const { code, input } = workerData;

    // Paths for temporary source file and executable (in-memory)
    const sourceFile = '/temp.cpp';
    const executable = '/temp.out';

    // Define the path to Clang++
    const clangPath = "/usr/bin/clang++"; // Full path to clang++ binary

    try {
        // Write the code to the in-memory source file
        vol.writeFileSync(sourceFile, code);

        // Compile the code using Clang++ with appropriate flags
        const compileProcess = spawnSync(clangPath, [
            sourceFile,
            "-o", executable,
            "-O0",          // Faster compilation, less optimization
            "-std=c++17",   // Use C++17 standard
            "-Wall",        // Enable all warnings
            "-flto",        // Link Time Optimization (if applicable)
            "-lstdc++",     // Link the GNU C++ standard library
        ], {
            encoding: "utf-8",
            timeout: 5000,  // Timeout in 5 seconds for faster feedback
        });

        if (compileProcess.error || compileProcess.stderr) {
            cleanupFiles();
            const error = compileProcess.stderr || compileProcess.error.message;
            return parentPort.postMessage({
                error: { fullError: `Compilation Error:\n${error}` },
            });
        }

        // Execute the compiled binary
        const runProcess = spawnSync(executable, [], {
            input,
            encoding: "utf-8",
            timeout: 5000, // Timeout after 5 seconds
        });

        cleanupFiles();

        if (runProcess.error || runProcess.stderr) {
            const error = runProcess.stderr || runProcess.error.message;
            return parentPort.postMessage({
                error: { fullError: `Runtime Error:\n${error}` },
            });
        }

        // Send the output back to the main thread
        return parentPort.postMessage({
            output: runProcess.stdout || "No output received!",
        });
    } catch (err) {
        cleanupFiles();
        return parentPort.postMessage({
            error: { fullError: `Server error: ${err.message}` },
        });
    }
})();
