const { parentPort, workerData } = require("worker_threads");
const { execSync, execFileSync } = require("child_process");
const os = require("os");
const fs = require("fs");
const path = require("path");

// Utility function to clean up temporary files
function cleanupFiles(...files) {
    files.forEach((file) => {
        try {
            fs.unlinkSync(file);
        } catch (err) {
            // Ignore errors for non-existent files
        }
    });
}

(async () => {
    const { code, input } = workerData;

    if (!code) {
        return parentPort.postMessage({
            error: { fullError: "No code provided for compilation." }
        });
    }

    const tmpDir = os.tmpdir();
    const sourceFile = path.join(tmpDir, `temp_${Date.now()}.cpp`);
    const executableFile = path.join(tmpDir, `temp_${Date.now()}`);

    try {
        // Write the C++ code to a temporary source file
        fs.writeFileSync(sourceFile, code);

        // Compile the C++ code
        try {
            execSync(`g++ ${sourceFile} -o ${executableFile}`, {
                stdio: 'pipe'
            });
        } catch (compileError) {
            cleanupFiles(sourceFile);
            return parentPort.postMessage({
                error: { fullError: `Compilation Error:\n${compileError.stderr.toString() || compileError.message}` }
            });
        }

        // Run the compiled executable
        let output = "";
        try {
            output = execFileSync(executableFile, {
                input,
                encoding: "utf-8",
                timeout: 5000 // Prevent infinite loops
            });
        } catch (runtimeError) {
            cleanupFiles(sourceFile, executableFile);
            return parentPort.postMessage({
                error: { fullError: `Runtime Error:\n${runtimeError.stderr ? runtimeError.stderr.toString() : runtimeError.message}` }
            });
        }

        // Clean up files after execution
        cleanupFiles(sourceFile, executableFile);

        // Send the output back to the main thread
        parentPort.postMessage({
            output: output || "No output received!"
        });
    } catch (err) {
        cleanupFiles(sourceFile, executableFile);
        parentPort.postMessage({
            error: { fullError: `Server Error: ${err.message}` }
        });
    }
})();
