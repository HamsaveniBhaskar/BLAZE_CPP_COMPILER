const { parentPort, workerData } = require("worker_threads");
const { spawn } = require("child_process");
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

// Compile and run the code
async function compileAndRun(code, input) {
    const tmpDir = os.tmpdir();
    const sourceFile = path.join(tmpDir, `temp_${Date.now()}.cpp`);
    const executable = path.join(tmpDir, `temp_${Date.now()}.out`);

    // Define the path to Clang++
    const clangPath = "/usr/bin/clang++";

    try {
        // Write the code to a temporary file
        fs.writeFileSync(sourceFile, code);

        // Compile the code asynchronously
        const compileProcess = spawn(clangPath, [
            sourceFile,
            "-o", executable,
            "-O3",        // Maximum optimization
            "-std=c++17", // Use C++17 standard
            "-march=native",
            "-flto",
        ]);

        let compileError = "";

        compileProcess.stderr.on("data", (data) => {
            compileError += data.toString();
        });

        compileProcess.on("close", (code) => {
            if (code !== 0 || compileError) {
                cleanupFiles(sourceFile, executable);
                parentPort.postMessage({ error: `Compilation Error:\n${compileError}` });
                return;
            }

            // Execute the compiled binary asynchronously
            const executeProcess = spawn(executable);

            // Provide input
            executeProcess.stdin.write(input);
            executeProcess.stdin.end();

            let output = "";
            let runtimeError = "";

            executeProcess.stdout.on("data", (data) => {
                output += data.toString();
            });

            executeProcess.stderr.on("data", (data) => {
                runtimeError += data.toString();
            });

            executeProcess.on("close", (code) => {
                cleanupFiles(sourceFile, executable);
                if (code === 0) {
                    parentPort.postMessage({ output });
                } else {
                    parentPort.postMessage({ error: `Runtime Error:\n${runtimeError}` });
                }
            });
        });

    } catch (err) {
        cleanupFiles(sourceFile, executable);
        parentPort.postMessage({ error: `Server error: ${err.message}` });
    }
}

// Export the function for the worker pool
module.exports = { compileAndRun };
