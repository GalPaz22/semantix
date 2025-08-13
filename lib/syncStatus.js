import clientPromise from "./mongodb.js";

export async function setJobState(dbName, state, progressData = {}) {
  const client = await clientPromise;
  const updateData = {
    state,
    updatedAt: new Date(),
    ...progressData
  };

  await client
    .db("users")
    .collection("sync_status")
    .updateOne(
      { dbName },
      { $set: updateData },
      { upsert: true }
    );
}

export async function appendLogs(dbName, newLogs) {
    if (!newLogs || newLogs.length === 0) return;
    
    const client = await clientPromise;
    await client
      .db("users")
      .collection("sync_status")
      .updateOne(
        { dbName },
        { $push: { logs: { $each: newLogs } } }
      );
  }
