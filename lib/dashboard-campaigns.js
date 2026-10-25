import { publicOptimizerData } from './optimizer-access.js';

const activeExperimentStatuses = ['running', 'promoted', 'paused', 'approved'];

export function legacyCampaign(record, kind, snapshot = null) {
  const statuses = kind === 'rule' ? { active: 'applied', disabled: 'stopped' } : { promoted: 'applied', killed: 'stopped', approved: 'scheduled' };
  return {
    _id: `${kind}-${record._id}`,
    source: kind,
    title: record.name,
    status: statuses[record.status] || record.status,
    queries: (kind === 'rule' ? record.condition : record.targeting)?.patterns || [],
    description: record.hypothesis || record.naturalLanguageText || '',
    createdAt: record.createdAt,
    trafficPct: record.trafficPct,
    // A promoted experiment's snapshot describes its earlier test, not its rollout.
    previousTest: record.status === 'promoted',
    snapshot: snapshot ? { asOf: snapshot.asOf, arms: (snapshot.arms || []).map(arm => ({ arm: arm.arm, sessions: arm.sessions, clickRate: arm.clickRate, atcRate: arm.atcRate })) } : null,
  };
}

export async function getDashboardCampaigns(client, dbName) {
  const db = client.db('control_plane');
  // Fetch all live proposals independently of the history limit so long-running
  // campaigns cannot disappear when newer weekly reports are generated.
  const [live, history, experiments, rules] = await Promise.all([
    db.collection('proposals').find({ dbName, kind: 'weeklyOptimization', status: { $in: ['running', 'applied'] } }).sort({ createdAt: -1 }).toArray(),
    db.collection('proposals').find({ dbName, kind: 'weeklyOptimization', status: { $in: ['completed', 'stopped'] } }).sort({ createdAt: -1 }).limit(30).toArray(),
    db.collection('experiments').find({ dbName, layer: { $ne: 'weekly' }, status: { $in: [...activeExperimentStatuses, 'completed', 'killed'] } }, { projection: { name: 1, status: 1, targeting: 1, hypothesis: 1, createdAt: 1, trafficPct: 1 } }).sort({ createdAt: -1 }).toArray(),
    db.collection('rules').find({ dbName, status: { $in: ['active', 'disabled'] } }, { projection: { name: 1, status: 1, condition: 1, naturalLanguageText: 1, createdAt: 1 } }).sort({ createdAt: -1 }).toArray(),
  ]);
  const experimentIds = experiments.map(e => String(e._id));
  // Only snapshots belonging to experiments already scoped to this store.
  const snapshots = experimentIds.length ? await db.collection('experiment_metrics').aggregate([
    { $match: { experimentId: { $in: experimentIds } } },
    { $sort: { asOf: -1 } },
    { $group: { _id: '$experimentId', latest: { $first: '$$ROOT' } } },
    { $project: { _id: 1, 'latest.asOf': 1, 'latest.arms.arm': 1, 'latest.arms.sessions': 1, 'latest.arms.clickRate': 1, 'latest.arms.atcRate': 1 } },
  ]).toArray() : [];
  const byExperiment = new Map(snapshots.map(s => [s._id, s.latest]));
  const result = { proposals: [
    ...live, ...history,
    ...experiments.map(e => legacyCampaign(e, 'experiment', byExperiment.get(String(e._id)))),
    ...rules.map(r => legacyCampaign(r, 'rule')),
  ].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)) };
  return publicOptimizerData(JSON.parse(JSON.stringify(result)));
}
