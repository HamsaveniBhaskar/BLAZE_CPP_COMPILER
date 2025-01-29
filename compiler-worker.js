const { parentPort, workerData } = require("worker_threads");
const { spawnSync } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs");

// Fast cleanup utility
const cleanupFiles = (...files) => files.forEach((file) => fs.unlink(file, () => {}));

(async () => {
    const { code, input } = workerData;

    // Use RAM-based filesystem (if available) for near-zero I/O latency
    const tmpDir = fs.existsSync("/dev/shm") ? "/dev/shm" : os.tmpdir();
    const timestamp = Date.now();
    const sourceFile = path.join(tmpDir, `temp_${timestamp}.cpp`);
    const executable = path.join(tmpDir, `temp_${timestamp}.out`);
    const clangPath = "/usr/bin/clang++"; 

    try {
        fs.writeFileSync(sourceFile, code);

        // Ultra-fast compilation flags
        const compile = spawnSync(clangPath, [
            sourceFile, "-o", executable,
            "-Ofast", "-march=native", "-flto", "-std=c++17", "-pipe", "-Wextra"
        ], { encoding: "utf-8", timeout: 1000 }); // Max 1s timeout

        if (compile.error || compile.stderr) {
            cleanupFiles(sourceFile, executable);
            return parentPort.postMessage({ error: { fullError: `Compilation Error:\n${compile.stderr || compile.error.message}` } });
        }

        // Execute in parallel for maximum speed
        const run = spawnSync(executable, [], { input, encoding: "utf-8", timeout: 2000 });

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
