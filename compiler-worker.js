const { parentPort, workerData } = require("worker_threads");
const { spawnSync } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs");

// Utility function for cleanup
const cleanupFiles = (...files) => files.forEach((file) => fs.unlinkSync(file, () => {}));

(async () => {
    const { code, input } = workerData;

    // Generate unique file names with timestamp
    const tmpDir = os.tmpdir();
    const timestamp = Date.now();
    const sourceFile = path.join(tmpDir, `temp_${timestamp}.cpp`);
    const executable = path.join(tmpDir, `temp_${timestamp}.out`);
    const clangPath = "/usr/bin/clang++"; // Ensure Clang++ is correctly installed

    try {
        fs.writeFileSync(sourceFile, code);

        // Fastest possible compilation settings
        const compile = spawnSync(clangPath, [
            sourceFile, "-o", executable,
            "-O2", "-std=c++17", "-Wextra", "-lstdc++"
        ], { encoding: "utf-8", timeout: 3000 }); // Faster timeout

        if (compile.error || compile.stderr) {
            cleanupFiles(sourceFile, executable);
            return parentPort.postMessage({ error: { fullError: `Compilation Error:\n${compile.stderr || compile.error.message}` } });
        }

        // Execute binary
        const run = spawnSync(executable, [], { input, encoding: "utf-8", timeout: 3000 });

        cleanupFiles(sourceFile, executable);

        if (run.error || run.stderr) {
            return parentPort.postMessage({ error: { fullError: `Runtime Error:\n${run.stderr || run.error.message}` } });
        }

        parentPort.postMessage({ output: run.stdout || "No output received!" });
    } catch (err) {
        cleanupFiles(sourceFile, executable);
        parentPort.postMessage({ error: { fullError: `Server error: ${err.message}` } });
    }
})();
