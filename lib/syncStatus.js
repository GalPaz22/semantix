import clientPromise from "./mongodb";

export async function setSyncState(email, state) {
  const client = await clientPromise;
  await client
    .db()
    .collection("sync_status")
    .updateOne(
      { email },
      { $set: { state, updatedAt: new Date() } },
      { upsert: true }
    );
}
