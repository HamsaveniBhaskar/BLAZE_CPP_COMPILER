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
            // Ignore errors (for files that may not exist)
        }
    });
}

(async () => {
    const { code, input } = workerData;
    const tmpDir = os.tmpdir();
    const sourceFile = path.join(tmpDir, `temp_${Date.now()}.cpp`);
    const outputFile = path.join(tmpDir, `temp_${Date.now()}`);

    try {
        // Write code to the source file
        fs.writeFileSync(sourceFile, code);

        // Compile the C++ code using Clang
        try {
            execSync(`clang++ -std=c++17 -o ${outputFile} ${sourceFile}`, { encoding: "utf-8", stdio: "pipe" });
        } catch (error) {
            cleanupFiles(sourceFile, outputFile);
            return parentPort.postMessage({
                error: {
                    fullError: `Compilation Error:\n${error.stderr || error.message}`
                },
            });
        }

        // Execute the compiled code
        let output = "";
        try {
            output = execFileSync(outputFile, { input, encoding: "utf-8", stdio: "pipe" });
        } catch (error) {
            cleanupFiles(sourceFile, outputFile);
            return parentPort.postMessage({
                error: {
                    fullError: `Runtime Error:\n${error.stderr || error.message}`
                },
            });
        }

        // Clean up
        cleanupFiles(sourceFile, outputFile);

        // Send the output back to the main thread
        parentPort.postMessage({
            output: output || "No output received!",
        });
    } catch (err) {
        cleanupFiles(sourceFile, outputFile);
        return parentPort.postMessage({
            error: { fullError: `Server error: ${err.stack}` },
        });
    }
})();
