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
            // Ignore cleanup errors
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

    // Path to Clang++ compiler
    const clangPath = "/usr/bin/clang++";

    try {
        // Write the code to the source file
        fs.writeFileSync(sourceFile, code);

        // Compile the code using Clang++
        const compileProcess = spawnSync(clangPath, [
            sourceFile,
            "-o", executable,
            "-std=c++17", // Use C++17 standard
            "-Wall",      // Enable all common warnings
            "-Wextra",    // Enable extra warnings for better debugging
            "-Wpedantic", // Enable strict language compliance warnings
        ], {
            encoding: "utf-8",
            timeout: 10000, // Compilation timeout of 10 seconds
        });

        // If there is a compilation error, return the detailed error message
        if (compileProcess.error || compileProcess.stderr) {
            const errorTrace = compileProcess.stderr || compileProcess.error.message;
            cleanupFiles(sourceFile, executable);
            return parentPort.postMessage({
                error: {
                    fullError: `Compilation Error:\n${errorTrace}`, // Detailed error with line numbers
                    traceback: errorTrace, // Traceback from the compiler output
                },
            });
        }

        // Execute the compiled binary
        const runProcess = spawnSync(executable, [], {
            input,
            encoding: "utf-8",
            timeout: 5000, // Execution timeout of 5 seconds
        });

        cleanupFiles(sourceFile, executable);

        // If there is a runtime error, return the detailed runtime error
        if (runProcess.error || runProcess.stderr) {
            const errorTrace = runProcess.stderr || runProcess.error.message;
            return parentPort.postMessage({
                error: {
                    fullError: `Runtime Error:\n${errorTrace}`, // Detailed runtime error
                    traceback: errorTrace, // Traceback from the runtime output
                },
            });
        }

        // Send the program output back to the main thread
        return parentPort.postMessage({
            output: runProcess.stdout || "No output received!",
        });
    } catch (err) {
        // Handle any unexpected server errors
        cleanupFiles(sourceFile, executable);
        return parentPort.postMessage({
            error: {
                fullError: `Server Error:\n${err.message}`,
                traceback: err.stack, // Detailed server-side error traceback
            },
        });
    }
})();
