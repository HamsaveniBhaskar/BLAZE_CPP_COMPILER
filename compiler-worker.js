const { parentPort, workerData } = require("worker_threads");
const { spawn, spawnSync } = require("child_process");
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

        // Compile the code
        const compileProcess = spawnSync(clangPath, [
            sourceFile,
            "-o", executable,
            "-O3",        // Maximum optimization
            "-std=c++17", // Use C++17 standard
            "-march=native",
            "-flto",
        ], {
            encoding: "utf-8",
            timeout: 10000, // Timeout after 10 seconds
        });

        if (compileProcess.error || compileProcess.stderr) {
            cleanupFiles(sourceFile, executable);
            return { error: `Compilation Error:\n${compileProcess.stderr}` };
        }

        // Execute the compiled binary asynchronously
        return new Promise((resolve, reject) => {
            const executeProcess = spawn(executable);

            // Provide input
            executeProcess.stdin.write(input);
            executeProcess.stdin.end();

            let output = "";
            let error = "";

            executeProcess.stdout.on("data", (data) => {
                output += data.toString();
            });

            executeProcess.stderr.on("data", (data) => {
                error += data.toString();
            });

            executeProcess.on("close", (code) => {
                cleanupFiles(sourceFile, executable);
                if (code === 0) {
                    resolve({ output });
                } else {
                    reject({ error: `Runtime Error:\n${error}` });
                }
            });
        });
    } catch (err) {
        cleanupFiles(sourceFile, executable);
        return { error: `Server error: ${err.message}` };
    }
}

// Export the function for the worker pool
module.exports = { compileAndRun };
