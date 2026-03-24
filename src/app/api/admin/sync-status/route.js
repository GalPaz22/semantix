import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import clientPromise from '/lib/mongodb.js';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.email !== 'galpaz2210@gmail.com') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dbName = searchParams.get('dbName');

    if (!dbName) {
      return NextResponse.json({ error: 'dbName is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const statusDoc = await client
      .db("users")
      .collection("sync_status")
      .findOne({ dbName });

    if (!statusDoc) {
      return NextResponse.json({ state: 'idle', logs: [] });
    }

    return NextResponse.json({
      state: statusDoc.state || 'idle',
      logs: statusDoc.logs || [],
      startedAt: statusDoc.startedAt || statusDoc.updatedAt,
      finishedAt: statusDoc.finishedAt,
      done: statusDoc.done,
      total: statusDoc.total,
      progress: statusDoc.progress
    });

  } catch (err) {
    console.error("[sync-status error]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

