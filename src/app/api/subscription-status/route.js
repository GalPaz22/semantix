import { getServerSession } from 'next-auth/next';
import { authOptions } from "../auth/[...nextauth]/route";
import { getUserByEmail } from '/lib/subscription-utils';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserByEmail(session.user.email);
    
    return NextResponse.json({
      tier: user?.tier || 'free',
      subscriptionStatus: user?.subscriptionStatus,
      paddleSubscriptionId: user?.paddleSubscriptionId,
      nextBillDate: user?.subscriptionNextBillDate,
      lastPaymentDate: user?.lastPaymentDate,
      cancelledAt: user?.cancelledAt
    });

  } catch (error) {
    console.error('Error fetching subscription status:', error);
    return NextResponse.json(
      { message: 'Failed to fetch subscription status' },
      { status: 500 }
    );
  }
}