import { NextResponse } from "next/server";
import { timingSafeEqual, createHash } from "node:crypto";
import { ObjectId } from "mongodb";
import clientPromise from "../../../../../lib/mongodb.js";
import reprocessProducts from "../../../../../lib/reprocess-products.js";

export const runtime = "nodejs";
function authorized(request) {
  const token = process.env.OPTIMIZER_REPROCESS_TOKEN;
  const provided = request.headers.get("authorization") || "";
  const expected = `Bearer ${token}`;
  return Boolean(token && Buffer.byteLength(provided) === Buffer.byteLength(expected) && timingSafeEqual(Buffer.from(provided), Buffer.from(expected)));
}
const tags = value => Array.isArray(value) ? value : typeof value === "string" ? value.split(",").map(v => v.trim()).filter(Boolean) : [];
const error = (message, status) => NextResponse.json({ error: message }, { status });

export async function GET(request) {
  if (!authorized(request)) return error("Unauthorized", 401);
  const jobId = new URL(request.url).searchParams.get("jobId");
  const db = (await clientPromise).db("control_plane");
  const job = await db.collection("optimizer_reprocess_jobs").findOne({ _id: jobId });
  if (!job) return error("Job not found", 404);
  if (job.status === "running" && Date.now() - new Date(job.startedAt).getTime() > 2 * 3600000) return NextResponse.json({ jobId, status: "interrupted" });
  return NextResponse.json({ jobId, status: job.status, requested: job.productIds.length, verified: job.verified, error: job.error });
}

export async function POST(request) {
  if (!authorized(request)) return error("Unauthorized", 401);
  const body = await request.json();
  const { jobId, tenantApiKey, productIds, options } = body;
  if (!/^[a-f\d]{24}$/i.test(jobId || "") || typeof tenantApiKey !== "string" || !Array.isArray(productIds) || !productIds.length || productIds.length > 100 || productIds.some(id => typeof id !== "string" || !/^[a-f\d]{24}$/i.test(id)) || !options || typeof options.softCategories !== "boolean" || typeof options.embeddings !== "boolean" || !(options.softCategories || options.embeddings)) return error("Invalid bounded reprocess request", 400);
  const client = await clientPromise;
  const user = await client.db("users").collection("users").findOne({ apiKey: tenantApiKey });
  if (!user?.dbName) return error("Unknown tenant", 404);
  const ids = [...new Set(productIds)].sort();
  const requestHash = createHash("sha256").update(JSON.stringify({ dbName: user.dbName, ids, options: { softCategories: options.softCategories, embeddings: options.embeddings } })).digest("hex");
  const jobs = client.db("control_plane").collection("optimizer_reprocess_jobs");
  const old = await jobs.findOne({ _id: jobId });
  if (old) return old.requestHash === requestHash ? NextResponse.json({ jobId, status: old.status }) : error("Job id already used for a different request", 409);
  const products = client.db(user.dbName).collection("products");
  const targets = await products.find({ _id: { $in: ids.map(id => new ObjectId(id)) }, hidden: { $ne: true }, $or: [{ stockStatus: "instock" }, { stock_status: "instock" }] }).project({ _id: 1 }).toArray();
  if (targets.length !== ids.length) return error("All targets must be visible in-stock products in this store", 409);
  const locks = client.db("control_plane").collection("optimizer_reprocess_locks");
  try { await locks.insertOne({ _id: user.dbName, jobId, createdAt: new Date() }); }
  catch (e) { if (e.code === 11000) return error("Store already has a reprocess job; inspect its status", 409); throw e; }
  try { await jobs.insertOne({ _id: jobId, requestHash, dbName: user.dbName, productIds: ids, status: "running", startedAt: new Date() }); }
  catch (e) { await locks.deleteOne({ _id: user.dbName, jobId }); if (e.code === 11000) return error("Concurrent job request; retry with same id", 409); throw e; }
  // Durable identity + product checkpoints let the optimizer distinguish interrupted jobs from success.
  // Deploy on the existing long-lived Node server, not a serverless request-only runtime.
  const credentials = user.credentials || {};
  void (async () => {
    try {
      await reprocessProducts({ dbName: user.dbName, productIds: ids, optimizerJobId: jobId,
        categories: tags(credentials.categories), userTypes: tags(credentials.type), softCategories: tags(credentials.softCategories),
        options: { reprocessSoftCategories: options.softCategories, reprocessEmbeddings: options.embeddings, reprocessAll: false, reprocessHardCategories: false, reprocessTypes: false, reprocessColors: false, reprocessVariants: false, reprocessDescriptions: false, translateBeforeEmbedding: false },
      });
      const verified = await products.countDocuments({ _id: { $in: ids.map(id => new ObjectId(id)) }, optimizerReprocessJobId: jobId });
      await jobs.updateOne({ _id: jobId }, { $set: { status: verified === ids.length ? "completed" : "failed", verified, finishedAt: new Date(), ...(verified !== ids.length ? { error: "Not every target completed the requested fields" } : {}) } });
    } catch (e) { await jobs.updateOne({ _id: jobId }, { $set: { status: "failed", error: e.message, finishedAt: new Date() } }); }
    finally { await locks.deleteOne({ _id: user.dbName, jobId }); }
  })();
  return NextResponse.json({ jobId, status: "running" }, { status: 202 });
}
