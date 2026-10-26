// For hosting panels that can only start a JS file: runs scripts/server/start.sh and passes signals through.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const child = spawn("bash", [fileURLToPath(new URL("./start.sh", import.meta.url))], { stdio: "inherit" });
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
child.on("exit", (code) => process.exit(code ?? 0));
