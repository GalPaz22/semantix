import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";

const LOCK_DIR = os.tmpdir(); // Use OS temp directory instead of hardcoded /tmp
const getLockFilePath = (dbName) => path.join(LOCK_DIR, `reprocessing_${dbName}.lock`);

export async function POST(request) {
  console.log("STOP API: Received request.");
  try {
    const { dbName } = await request.json();
    if (!dbName) {
      console.log("STOP API: dbName is required.");
      return NextResponse.json({ error: "dbName is required" }, { status: 400 });
    }
    const lockFilePath = getLockFilePath(dbName);
    console.log(`STOP API: Attempting to delete lock file at ${lockFilePath}`);
    await fs.unlink(lockFilePath);
    console.log("STOP API: Stop signal sent successfully.");
    return NextResponse.json({ message: "Stop signal sent." });
  } catch (error) {
    console.error("STOP API ERROR:", error);
    if (error.code === "ENOENT") {
      console.log("STOP API: Lock file not found, process likely already stopped.");
      return NextResponse.json({ message: "Process already stopped or finished." });
    }
    return NextResponse.json({ error: `Server error: ${error.message}` }, { status: 500 });
  }
} 