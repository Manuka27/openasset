import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { createDatabase } from "../src/lib/db";
import { OperationError } from "../src/lib/permissions";
import { bootstrapAdministrator } from "../src/lib/users";
import { userInput } from "../src/lib/validation";

async function bootstrap() {
  if (!stdin.isTTY || !stdout.isTTY) throw new OperationError("Run this command in a private interactive terminal.");
  const url = URL.parse(process.env.DATABASE_URL ?? "");
  if (!url || url.protocol !== "postgresql:" || !url.hostname.endsWith(".railway.internal") ||
    !url.username || !url.password || url.hash || !/^\/[\w-]+$/.test(url.pathname) ||
    [...url.searchParams.keys()].some(key => key !== "sslmode")) {
    throw new OperationError("Set DATABASE_URL to the direct private Railway PostgreSQL connection.");
  }

  const target = url.host + url.pathname;
  const terminal = createInterface({ input: stdin, output: stdout });
  const disconnect = new AbortController();
  terminal.on("close", () => disconnect.abort());
  let name: string;
  let email: string;
  try {
    if (await terminal.question(`Type ${target} to confirm the target database: `, { signal: disconnect.signal }) !== target) {
      throw new OperationError("Database confirmation did not match.");
    }
    name = await terminal.question("Administrator name: ", { signal: disconnect.signal });
    email = await terminal.question("Administrator email: ", { signal: disconnect.signal });
  } finally {
    terminal.close();
  }

  const hidden = createInterface({ input: stdin, output: new Writable({ write(_chunk, _encoding, done) { done(); } }), terminal: true, historySize: 0 });
  const interrupt = new AbortController();
  hidden.on("SIGINT", () => interrupt.abort());
  hidden.on("close", () => interrupt.abort());
  let password: string;
  try {
    stdout.write("Administrator password (hidden): ");
    password = await hidden.question("", { signal: interrupt.signal });
    stdout.write("\nConfirm password (hidden): ");
    if (await hidden.question("", { signal: interrupt.signal }) !== password) {
      throw new OperationError("Passwords did not match.");
    }
  } finally {
    hidden.close();
    stdout.write("\n");
  }

  const result = userInput.safeParse({ name, email, password, role: "admin" });
  if (!result.success) throw new OperationError("Enter a valid name and email and a password of 14 to 128 characters.");
  const db = createDatabase(url.href);
  try {
    await bootstrapAdministrator(db, result.data);
    console.log("Initial administrator created.");
  } finally {
    await db.$disconnect();
  }
}

bootstrap().catch(error => {
  console.error(error instanceof OperationError ? error.message : "Administrator setup failed. Check the private database connection and migration status.");
  process.exitCode = 1;
});
