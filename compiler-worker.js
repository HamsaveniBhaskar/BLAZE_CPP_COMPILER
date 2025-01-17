const { parentPort, workerData } = require("worker_threads");
const { spawnSync } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs");

// Function to clean up temporary file paths from error messages
function cleanErrorMessage(message, filePath) {
    const fileRegex = new RegExp(filePath, "g");
    return message.replace(fileRegex, "code");
}

(async () => {
    const { code, input } = workerData;

    // Paths for temporary source file and executable
    const tmpDir = os.tmpdir();
    const timestamp = Date.now();
    const sourceFile = path.join(tmpDir, `temp_${timestamp}.cpp`);
    const executable = path.join(tmpDir, `temp_${timestamp}.out`);

    try {
        // Write the source code to a temporary file
        fs.writeFileSync(sourceFile, code);

        // Compile the code using Clang++
        const compileProcess = spawnSync("/usr/bin/clang++", [
            sourceFile,
            "-o", executable,
            "-O2",
            "-std=c++17",
        ], { encoding: "utf-8" });

        // Check for compilation errors
        if (compileProcess.error || compileProcess.status !== 0) {
            const errorMessage = cleanErrorMessage(
                compileProcess.stderr || compileProcess.error.message,
                sourceFile
            );
            fs.unlinkSync(sourceFile); // Cleanup source file
            return parentPort.postMessage({
                error: { fullError: `Compilation Error:\n${errorMessage}` },
            });
        }

        // Execute the compiled binary
        const runProcess = spawnSync(executable, [], {
            input,
            encoding: "utf-8",
            timeout: 3000, // 3-second timeout for execution
        });

        // Cleanup files
        fs.unlinkSync(sourceFile);
        fs.unlinkSync(executable);

        // Check for runtime errors
        if (runProcess.error || runProcess.status !== 0) {
            return parentPort.postMessage({
                error: { fullError: `Runtime Error:\n${runProcess.stderr || runProcess.error.message}` },
            });
        }

        // Send the execution output back
        return parentPort.postMessage({
            output: runProcess.stdout || "No output received!",
        });
    } catch (err) {
        // Handle unexpected errors
        try {
            fs.unlinkSync(sourceFile);
            fs.unlinkSync(executable);
        } catch (cleanupErr) {
            // Ignore cleanup errors
        }
        return parentPort.postMessage({
            error: { fullError: `Server error: ${err.message}` },
        });
    }
})();
