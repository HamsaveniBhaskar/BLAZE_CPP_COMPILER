const { parentPort, workerData } = require("worker_threads");
const { spawnSync, spawn } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs");

(async () => {
    const { code, input, language } = workerData;

    const tmpDir = os.tmpdir();
    const sourceFile = path.join(tmpDir, `temp_${Date.now()}.cpp`);  // Change the file extension based on the language
    const executable = path.join(tmpDir, `temp_${Date.now()}.out`);

    try {
        // Write the code to a temporary file
        fs.writeFileSync(sourceFile, code);

        // Compile the code
        let compileProcess;
        if (language === "cpp") {
            compileProcess = spawnSync("clang++", [sourceFile, "-o", executable, "-std=c++17", "-O2"], { encoding: "utf-8", timeout: 10000 });
        } else if (language === "python") {
            // No compilation needed for Python
            compileProcess = { error: null, stderr: null };
        }

        if (compileProcess.error || compileProcess.stderr) {
            return parentPort.postMessage({
                error: `Compilation Error: ${compileProcess.stderr || compileProcess.error.message}`,
            });
        }

        // Execute the compiled binary or interpreted script
        const executeProcess = language === "python" ? spawn("python3", [sourceFile]) : spawn(executable);

        let output = "";
        let error = "";

        executeProcess.stdout.on("data", (data) => {
            output += data.toString();
        });

        executeProcess.stderr.on("data", (data) => {
            error += data.toString();
        });

        executeProcess.on("close", (code) => {
            fs.unlinkSync(sourceFile);
            fs.unlinkSync(executable);

            if (code === 0) {
                parentPort.postMessage({ output });
            } else {
                parentPort.postMessage({ error: `Runtime Error: ${error}` });
            }
        });
    } catch (err) {
        parentPort.postMessage({
            error: `Server Error: ${err.message}`,
        });
    }
})();
