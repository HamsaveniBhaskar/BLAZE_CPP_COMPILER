const { parentPort, workerData } = require("worker_threads");
const { spawnSync } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs");

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

        // Compile the code using Clang++ with optimized flags
        const compileStart = Date.now();
        const compileProcess = spawnSync("/usr/bin/clang++", [
            sourceFile,
            "-o", executable,
            "-O2",        // Increased optimization level for better runtime performance
            "-std=c++17", // Use the C++17 standard
        ], { encoding: "utf-8" });
        console.log(`Compilation took ${Date.now() - compileStart} ms`);

        // Check for compilation errors
        if (compileProcess.error || compileProcess.status !== 0) {
            const error = compileProcess.stderr || compileProcess.error.message;
            fs.unlinkSync(sourceFile); // Cleanup source file
            return parentPort.postMessage({
                error: { fullError: `Compilation Error:\n${error}` },
            });
        }

        // Execute the compiled binary
        const runStart = Date.now();
        const runProcess = spawnSync(executable, [], {
            input,
            encoding: "utf-8",
            timeout: 3000, // 3-second timeout for execution
        });
        console.log(`Execution took ${Date.now() - runStart} ms`);

        // Cleanup files
        fs.unlinkSync(sourceFile);
        fs.unlinkSync(executable);

        // Check for runtime errors
        if (runProcess.error || runProcess.status !== 0) {
            const error = runProcess.stderr || runProcess.error.message;
            return parentPort.postMessage({
                error: { fullError: `Runtime Error:\n${error}` },
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
