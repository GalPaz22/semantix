import { cache } from "react";

import { MongoClient } from "mongodb";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/options";

declare global {
  // eslint-disable-next-line no-var
  var __semantixDashboardMongoClientPromise__: Promise<MongoClient> | undefined;
}

function getPathValue(record: Record<string, unknown>, path: string) {
  return path.split(".").reduce<unknown>((current, part) => {
    if (typeof current !== "object" || current === null) {
      return undefined;
    }

    return (current as Record<string, unknown>)[part];
  }, record);
}

function asString(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

function getMongoUri() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not configured for the operational Semantix dashboard.");
  }

  return uri;
}

export function resolveUserDbName(userDoc: Record<string, unknown>) {
  const candidates = [
    "onboarding.credentials.dbName",
    "credentials.dbName",
    "onboarding.dbName",
    "dbName"
  ];

  for (const path of candidates) {
    const value = asString(getPathValue(userDoc, path));
    if (value) {
      return value;
    }
  }

  return undefined;
}

export async function getDashboardMongoClient() {
  if (!global.__semantixDashboardMongoClientPromise__) {
    const client = new MongoClient(getMongoUri(), { appName: "semantix-dashboard" });
    global.__semantixDashboardMongoClientPromise__ = client.connect();
  }

  return global.__semantixDashboardMongoClientPromise__;
}

export const getCurrentDashboardContext = cache(async () => {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { email?: string };
  } | null;
  const email = session?.user?.email;

  if (!email) {
    throw new Error("No authenticated user session was found for the Semantix dashboard.");
  }

  const client = await getDashboardMongoClient();
  const userDoc = await client.db("users").collection("users").findOne({ email });

  if (!userDoc) {
    throw new Error(`No user record was found in users.users for ${email}.`);
  }

  const dbName = resolveUserDbName(userDoc as Record<string, unknown>);
  if (!dbName) {
    throw new Error(`No dbName is configured for ${email} in users.users.`);
  }

  return {
    session,
    email,
    dbName,
    userDoc: userDoc as Record<string, unknown>,
    client,
    db: client.db(dbName)
  };
});
