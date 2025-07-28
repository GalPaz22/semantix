import { paddle } from '/lib/paddle';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { getUserByEmail } from '/lib/subscription-utils';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Find user's subscription
    const user = await getUserByEmail(session.user.email);
    if (!user?.paddleSubscriptionId) {
      return NextResponse.json({ message: 'No active subscription found' }, { status: 404 });
    }

    // Get current subscription from Paddle
    const subscription = await paddle.getSubscription(user.paddleSubscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found in Paddle');
    }

    // Create a payment method update transaction
    const updateTransaction = await paddle.createTransaction({
      items: [{
        price_id: subscription.items[0].price.id,
        quantity: 1
      }],
      customer_id: user.paddleCustomerId,
      custom_data: {
        action: 'update_payment_method',
        subscription_id: user.paddleSubscriptionId
      },
      is_update_payment_method: true,
      success_url: `${process.env.NEXTAUTH_URL}/subscription/payment-updated`,
      cancel_url: `${process.env.NEXTAUTH_URL}/subscription/payment-cancelled`
    });

    return NextResponse.json({ 
      success: true,
      checkoutUrl: updateTransaction.url
    });

  } catch (error) {
    console.error('Error updating payment method:', error);
    return NextResponse.json(
      { message: 'Failed to update payment method', error: error.message },
      { status: 500 }
    );
  }
} 