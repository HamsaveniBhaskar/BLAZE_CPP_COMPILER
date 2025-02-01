const { parentPort, workerData } = require("worker_threads");
const { execSync } = require("child_process");
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

// Worker logic
(async () => {
    const { code, input } = workerData;

    // Paths for temporary C++ source and executable files
    const tmpDir = os.tmpdir();
    const timestamp = Date.now();
    const sourceFile = path.join(tmpDir, `temp_${timestamp}.cpp`);
    const executableFile = path.join(tmpDir, `temp_${timestamp}.out`);

    try {
        // Write the C++ code to the source file
        fs.writeFileSync(sourceFile, code);

        // Compile the C++ code using Clang++
        const clangCommand = "/usr/bin/clang++";
        try {
            execSync(`${clangCommand} ${sourceFile} -o ${executableFile} -O2 -std=c++17`, {
                encoding: "utf-8",
            });
        } catch (compileError) {
            // Clean up files before sending a compilation error message
            cleanupFiles(sourceFile);
            return parentPort.postMessage({
                error: { fullError: `Compilation Error:\n${compileError.message}` },
            });
        }

        // Run the compiled executable
        let output = "";
        try {
            output = execSync(executableFile, {
                input, // Pass input to the executable
                encoding: "utf-8",
            });
        } catch (runtimeError) {
            cleanupFiles(sourceFile, executableFile);
            return parentPort.postMessage({
                error: { fullError: `Runtime Error:\n${runtimeError.message}` },
            });
        }

        // Clean up temporary files after execution
        cleanupFiles(sourceFile, executableFile);

        // Send the output back to the main thread
        parentPort.postMessage({
            output: output || "No output received!",
        });
    } catch (err) {
        // Clean up files and send server error if anything goes wrong
        cleanupFiles(sourceFile, executableFile);
        return parentPort.postMessage({
            error: { fullError: `Server Error:\n${err.message}` },
        });
    }
})();
