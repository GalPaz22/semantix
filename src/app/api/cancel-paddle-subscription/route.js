import { paddle } from '/lib/paddle';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { getUserByEmail, updateUserTier } from '/lib/subscription-utils';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Get request data first
    const { immediate = false, feedback = {} } = await request.json();

    // Find user's subscription
    const user = await getUserByEmail(session.user.email);
    if (!user?.paddleSubscriptionId) {
      return NextResponse.json({ message: 'No active subscription found' }, { status: 404 });
    }

    console.log(`🎯 Cancelling subscription ${user.paddleSubscriptionId} for user ${session.user.email}`);

    // Cancel subscription in Paddle
    const effectiveFrom = immediate ? 'immediately' : 'next_billing_period';
    const cancelResult = await paddle.cancelSubscription(user.paddleSubscriptionId, effectiveFrom);

    if (!cancelResult?.id) {
      throw new Error('Failed to cancel subscription in Paddle');
    }

    // Update user tier in database
    const updateResult = await updateUserTier(session.user.email, {
      tier: immediate ? 'free' : user.tier, // Only change tier immediately if requested
      status: 'cancelled',
      cancelledAt: new Date(),
      paddleSubscriptionId: immediate ? null : user.paddleSubscriptionId,
      cancellationFeedback: feedback
    });

    console.log(`✅ Successfully cancelled subscription for ${session.user.email}`);
    console.log('Paddle result:', cancelResult);
    console.log('Database update:', updateResult);

    return NextResponse.json({ 
      message: immediate ? 
        'Subscription cancelled immediately' : 
        'Subscription will be cancelled at the end of the billing period',
      success: true,
      status: 'cancelled',
      effectiveFrom
    });

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json(
      { message: 'Failed to cancel subscription', error: error.message },
      { status: 500 }
    );
  }
}