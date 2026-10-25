import test from 'node:test';
import assert from 'node:assert/strict';
import { campaignFeedback, isActiveCampaign, hasCampaignHistory } from '../lib/campaign-feedback.js';

const measured = { complete: true, mode: 'randomized', arms: [{ exposures: 200, sessions: 150 }], comparison: { sufficient: true, signal: 'positive' } };

test('campaign lists distinguish live changes from pending decisions and past campaigns', () => {
  for (const status of ['running', 'applied', 'paused', 'scheduled']) assert.equal(isActiveCampaign({ status }), true);
  for (const status of ['pending', 'rejected', 'expired', 'completed', 'stopped']) assert.equal(isActiveCampaign({ status }), false);
  for (const status of ['completed', 'stopped']) assert.equal(hasCampaignHistory({ status }), true);
  assert.equal(hasCampaignHistory({ status: 'pending' }), false);
});

test('missing tracking and immature visits take precedence over comparison claims', () => {
  assert.equal(campaignFeedback(null).tone, 'neutral');
  assert.equal(campaignFeedback({ ...measured, complete: false }).tone, 'warning');
  assert.equal(campaignFeedback({ ...measured, arms: [{ exposures: 0, sessions: 0 }] }).title, 'ממתינים לתנועה');
  assert.equal(campaignFeedback({ ...measured, arms: [{ exposures: 30, sessions: 0, pending: 30 }] }).title, 'הנתונים עדיין מבשילים');
});

test('full rollout never claims a controlled improvement', () => {
  assert.equal(campaignFeedback({ ...measured, mode: 'observational' }).tone, 'neutral');
  assert.match(campaignFeedback({ ...measured, mode: 'observational' }).detail, /ללא קבוצת ביקורת/);
});

test('directional feedback requires sufficient data and a clear signal', () => {
  assert.equal(campaignFeedback(measured).tone, 'positive');
  assert.equal(campaignFeedback({ ...measured, comparison: { sufficient: true, signal: 'negative' } }).tone, 'negative');
  assert.equal(campaignFeedback({ ...measured, comparison: { sufficient: false, signal: 'positive' } }).tone, 'neutral');
  assert.equal(campaignFeedback({ ...measured, comparison: { sufficient: true, signal: 'inconclusive' } }).tone, 'neutral');
  assert.equal(campaignFeedback({ ...measured, comparison: null }).tone, 'neutral');
});
