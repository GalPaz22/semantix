import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { authorizeTenantDb } from "/lib/tenant";

const LOCK_DIR = os.tmpdir(); // Use OS temp directory instead of hardcoded /tmp
const getLockFilePath = (dbName) => path.join(LOCK_DIR, `reprocessing_${dbName}.lock`);

export async function POST(request) {
  console.log("STOP API: Received request.");
  try {
    const session = await getServerSession(authOptions);
    const { dbName: requestedDbName } = await request.json();
    const tenant = await authorizeTenantDb(session, requestedDbName);
    if (tenant.error) return tenant.error;
    const dbName = tenant.dbName;
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