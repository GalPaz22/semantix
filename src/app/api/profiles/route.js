import { getServerSession } from "next-auth";
import clientPromise from "/lib/mongodb";
import { authOptions } from "../auth/[...nextauth]/route";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { dbName } = await request.json();
    if (!dbName) {
      return Response.json({ error: "Missing dbName" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(dbName);

    // Fetch profiles from the profiles collection
    const profiles = await db
      .collection("profiles")
      .find({})
      .sort({ lastSeen: -1, updatedAt: -1, createdAt: -1 })
      .limit(200)
      .toArray();

    // Get the most recent query to determine the "active" profile
    const lastQuery = await db
      .collection("queries")
      .findOne({}, { sort: { timestamp: -1 }, projection: { profileId: 1, sessionId: 1, userId: 1 } });

    // Get query count per profile for stats
    const profileIds = profiles.map(p => p._id?.toString()).filter(Boolean);

    // Get search activity per profile (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Build activity stats
    const activityPipeline = [
      {
        $match: {
          timestamp: { $gte: thirtyDaysAgo.toISOString() }
        }
      },
      {
        $group: {
          _id: "$profileId",
          searchCount: { $sum: 1 },
          lastSearch: { $max: "$timestamp" },
          queries: { $push: "$query" }
        }
      }
    ];

    let activityByProfile = [];
    try {
      activityByProfile = await db.collection("queries").aggregate(activityPipeline).toArray();
    } catch (e) {
      // Fallback if aggregation fails
      activityByProfile = [];
    }

    const activityMap = {};
    activityByProfile.forEach(a => {
      if (a._id) activityMap[a._id] = a;
    });

    // Enrich profiles with activity data
    const enrichedProfiles = profiles.map(profile => ({
      ...profile,
      _id: profile._id?.toString(),
      activity: activityMap[profile._id?.toString()] || null,
      isActive: lastQuery?.profileId === profile._id?.toString() ||
                lastQuery?.sessionId === profile.sessionId ||
                lastQuery?.userId === profile.userId
    }));

    // Also get total query counts by various identifiers to help match profiles
    const totalQueries = await db.collection("queries").countDocuments({});

    return Response.json({
      profiles: enrichedProfiles,
      meta: {
        total: profiles.length,
        totalQueries,
        lastActiveId: lastQuery?.profileId || lastQuery?.sessionId || null
      }
    });

  } catch (error) {
    console.error("[API Profiles] Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
