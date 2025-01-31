const { parentPort, workerData } = require("worker_threads");
const { spawn } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs");

const tmpDir = path.join(os.tmpdir(), "blaze_code_temp");
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

const cleanupFiles = (...files) => {
    files.forEach((file) => fs.unlink(file, () => {}));
};

(async () => {
    try {
        if (!workerData || !workerData.code) {
            throw new Error("Worker received invalid data.");
        }

        const { code, input } = workerData;
        const timestamp = Date.now();
        const sourceFile = path.join(tmpDir, `temp_${timestamp}.cpp`);
        const executable = path.join(tmpDir, `temp_${timestamp}.out`);
        const clangPath = "/usr/bin/clang++";

        fs.writeFileSync(sourceFile, code);

        const compile = spawn(clangPath, [sourceFile, "-o", executable, "-O2", "-std=c++17"]);
        let compileError = "";

        compile.stderr.on("data", (data) => compileError += data.toString());

        compile.on("close", (code) => {
            if (code !== 0 || compileError) {
                cleanupFiles(sourceFile, executable);
                return parentPort.postMessage({ error: { fullError: `Compilation Error:\n${compileError}` } });
            }

            const run = spawn(executable);
            let output = "", runtimeError = "";

            run.stdin.write(input);
            run.stdin.end();

            run.stdout.on("data", (data) => output += data.toString());
            run.stderr.on("data", (data) => runtimeError += data.toString());

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
        parentPort.postMessage({ error: { fullError: `Worker crashed: ${err.message}` } });
    }
})();
