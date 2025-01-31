const { parentPort, workerData } = require("worker_threads");
const { spawn } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs");

const cleanupFiles = (...files) => {
    files.forEach((file) => fs.unlink(file, () => {}));
};

(async () => {
    const { code, input } = workerData;
    const tmpDir = os.tmpdir();
    const timestamp = Date.now();
    const sourceFile = path.join(tmpDir, `temp_${timestamp}.cpp`);
    const executable = path.join(tmpDir, `temp_${timestamp}.out`);
    const clangPath = "/usr/bin/clang++"; // Ensure Clang++ is correctly installed

    try {
        fs.writeFileSync(sourceFile, code);

        // Compile the C++ code asynchronously
        const compile = spawn(clangPath, [
            sourceFile, "-o", executable,
            "-O2", "-std=c++17", "-Wextra", "-lstdc++"
        ]);

        let compileError = "";
        compile.stderr.on("data", (data) => compileError += data.toString());

        compile.on("close", (code) => {
            if (code !== 0 || compileError) {
                cleanupFiles(sourceFile, executable);
                return parentPort.postMessage({ error: { fullError: `Compilation Error:\n${compileError}` } });
            }

            // Run the compiled program asynchronously
            const run = spawn(executable);
            let output = "", runtimeError = "";

            run.stdin.write(input);
            run.stdin.end();

            run.stdout.on("data", (data) => output += data.toString());
            run.stderr.on("data", (data) => runtimeError += data.toString());

            // Kill the process if it exceeds 3 seconds
            const timeout = setTimeout(() => {
                run.kill();
                cleanupFiles(sourceFile, executable);
                parentPort.postMessage({ error: { fullError: "Runtime Error: Execution timed out!" } });
            }, 3000);

            run.on("close", (exitCode) => {
                clearTimeout(timeout);
                cleanupFiles(sourceFile, executable);

                if (exitCode !== 0 || runtimeError) {
                    return parentPort.postMessage({ error: { fullError: `Runtime Error:\n${runtimeError}` } });
                }

                parentPort.postMessage({ output: output.trim() || "No output received!" });
            });
        });
    } catch (err) {
        cleanupFiles(sourceFile, executable);
        parentPort.postMessage({ error: { fullError: `Server error: ${err.message}` } });
    }
})();
