import { spawn } from "node:child_process";
import process from "node:process";
import { setTimeout as wait } from "node:timers/promises";

const run = (command, args, { capture = false } = {}) =>
  new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });

    let output = "";
    if (capture) {
      child.stdout.on("data", (chunk) => {
        const text = chunk.toString();
        output += text;
        process.stdout.write(text);
      });
      child.stderr.on("data", (chunk) => {
        const text = chunk.toString();
        output += text;
        process.stderr.write(text);
      });
    }

    child.on("error", (error) => {
      output += error.message;
      resolve({ code: 1, output });
    });
    child.on("close", (code) => resolve({ code: code ?? 1, output }));
  });

const reset = await run("supabase", ["db", "reset", "--local"], {
  capture: true,
});

if (reset.code !== 0) {
  const isKnownRestartRace = reset.output.includes(
    "Error status 502: An invalid response was received from the upstream server",
  );
  const migrationApplied = reset.output.includes(
    "Applying migration 20260728220000_core_exam_foundation.sql",
  );

  if (!isKnownRestartRace || !migrationApplied) {
    process.exit(reset.code);
  }

  console.warn(
    "Local Supabase returned its known post-reset 502; waiting for service health.",
  );

  let healthy = false;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await wait(2_000);
    const status = await run("supabase", ["status"], { capture: true });
    if (
      status.code === 0 &&
      status.output.includes("supabase local development setup is running")
    ) {
      healthy = true;
      break;
    }
  }

  if (!healthy) {
    console.error("Local Supabase did not become healthy after reset.");
    process.exit(1);
  }
}

const lint = await run("supabase", ["db", "lint", "--local"]);
if (lint.code !== 0) process.exit(lint.code);

const tests = await run("supabase", ["test", "db"]);
process.exit(tests.code);
