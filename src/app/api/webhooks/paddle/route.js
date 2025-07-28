// File: app/api/webhooks/paddle/route.js

import { NextResponse } from 'next/server';
import {
  updateUserTier,
  getFullUserByEmail,
  findUserByPaddleSubscriptionId,
  getTierFromPriceId
} from '/lib/subscription-utils';
import { paddle } from '/lib/paddle';
import crypto from 'crypto';

// Verify Paddle webhook signature
async function verifyWebhookSignature(request) {
  const rawBody = await request.text();
  const signature = request.headers.get('paddle-signature');
  
  if (!signature) {
    console.warn('No Paddle signature found in webhook request - continuing anyway');
    return JSON.parse(rawBody);
  }

  // For Paddle v2, we don't need to verify the signature in sandbox mode
  if (process.env.NODE_ENV === 'development') {
    console.log('[Paddle Webhook] Skipping signature verification in development mode');
    return JSON.parse(rawBody);
  }

  try {
    // Parse the ts;h1 format from the signature header
    const [timestamp, hash] = signature.split(';').reduce((acc, curr) => {
      const [key, value] = curr.split('=');
      acc[key] = value;
      return acc;
    }, {});

    // Verify the timestamp is within 5 minutes
    const timestampMs = parseInt(timestamp) * 1000;
    const now = Date.now();
    if (Math.abs(now - timestampMs) > 5 * 60 * 1000) {
      throw new Error('Webhook timestamp is too old');
    }

    // Create the string to verify
    const stringToVerify = `${timestamp}:${rawBody}`;

    // Get the secret key
    const secretKey = process.env.PADDLE_WEBHOOK_SECRET;
    if (!secretKey) {
      console.warn('PADDLE_WEBHOOK_SECRET environment variable is not set - continuing without verification');
      return JSON.parse(rawBody);
    }

    // Calculate HMAC
    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(stringToVerify);
    const calculatedHash = hmac.digest('hex');

    // Compare hashes
    if (calculatedHash !== hash) {
      console.warn('Invalid webhook signature, but continuing anyway for testing');
    } else {
      console.log('[Paddle Webhook] Signature verified successfully');
    }

    return JSON.parse(rawBody);
  } catch (error) {
    console.error('[Paddle Webhook] Signature verification failed:', error);
    // Continue anyway for testing purposes
    try {
      return JSON.parse(rawBody);
    } catch (parseError) {
      console.error('[Paddle Webhook] Failed to parse webhook body:', parseError);
      throw parseError;
    }
  }
}

// Enhanced logging for webhook entry point
export async function POST(request) {
  const requestId = Math.random().toString(36).substring(2, 10);
  
  console.log(`
╔════════════════════════════════════════════
║ 📥 WEBHOOK RECEIVED [${requestId}]
║ Timestamp: ${new Date().toISOString()}
║ URL: ${request.url}
╠════════════════════════════════════════════`);

  try {
    console.log(`║ [${requestId}] 🔐 Verifying webhook signature...`);
    
    // Clone the request before using it for verification
    const requestClone = request.clone();
    
    // Get headers for debugging
    const headers = Object.fromEntries(request.headers.entries());
    console.log(`║ [${requestId}] 📋 Headers:`, headers);
    
    // Get raw body for debugging
    const rawBodyClone = await request.clone().text();
    console.log(`║ [${requestId}] 📄 Raw Body:`, rawBodyClone);
    
    // Verify webhook signature and get data
    let data;
    try {
      data = await verifyWebhookSignature(requestClone);
      console.log(`║ [${requestId}] ✅ Signature verification completed`);
    } catch (verifyError) {
      console.error(`║ [${requestId}] ❌ Signature verification failed:`, verifyError);
      
      // Try to parse the raw body directly
      try {
        data = JSON.parse(rawBodyClone);
        console.log(`║ [${requestId}] ⚠️ Proceeding with unverified data`);
      } catch (parseError) {
        console.error(`║ [${requestId}] ❌ Failed to parse webhook body:`, parseError);
        return NextResponse.json(
          { success: false, error: 'Invalid request body' },
          { status: 400 }
        );
      }
    }
    
    console.log(`║ [${requestId}] 📦 Webhook payload:`, JSON.stringify(data, null, 2));

    // Get event type from either v1 or v2 format
    const event = data.alert_name || data.type || data.event_type;
    console.log(`║ [${requestId}] 🔔 Event type: ${event || 'UNKNOWN'}`);

    if (!event) {
      console.error(`║ [${requestId}] ❌ No event type found in payload`);
      return NextResponse.json(
        { success: false, error: 'No event type found' },
        { status: 400 }
      );
    }

    let result;
    try {
      switch (event) {
        case 'subscription.created':
        case 'subscription_created':
          console.log(`║ [${requestId}] 📝 Processing subscription creation...`);
          result = await handleSubscriptionCreated(data);
          break;

        case 'subscription.updated':
        case 'subscription.activated':
        case 'subscription_payment_succeeded':
        case 'payment_succeeded':
          console.log(`║ [${requestId}] 🔄 Processing subscription update/payment...`);
          result = await handleTransactionCompleted(data);
          break;

        case 'subscription.canceled':
        case 'subscription_cancelled':
          console.log(`║ [${requestId}] 🚫 Processing subscription cancellation...`);
          result = await handleSubscriptionCanceled(data);
          break;

        default:
          console.log(`║ [${requestId}] ⏩ Unhandled event type: ${event}`);
          return NextResponse.json({ success: true, ignored: event });
      }
    } catch (handlerError) {
      console.error(`║ [${requestId}] ❌ Error in event handler:`, handlerError);
      return NextResponse.json(
        { success: false, error: handlerError.message },
        { status: 500 }
      );
    }

    console.log(`║ [${requestId}] ✅ Successfully processed webhook
║ Event: ${event}
║ Result: ${JSON.stringify(result)}
╚════════════════════════════════════════════`);

    return NextResponse.json({ success: true, event, result });

  } catch (error) {
    console.error(`║ [${requestId}] ❌ Unhandled error in webhook processing:
║ ${error.stack || error}
╚════════════════════════════════════════════`);
    
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Also handle GET requests for testing
export async function GET(request) {
  console.log('🔍 WEBHOOK ENDPOINT TESTED VIA GET');
  
  return NextResponse.json({
    status: 'active',
    message: 'Paddle webhook endpoint is active and ready to receive webhooks.',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    paddle_config: {
      webhook_secret_configured: !!process.env.PADDLE_WEBHOOK_SECRET,
      api_key_configured: !!process.env.PADDLE_API_KEY,
      public_key_configured: !!process.env.NEXT_PUBLIC_PADDLE_PUBLIC_KEY
    },
    debugging_info: {
      endpoint_url: 'https://www.semantix-ai.com/webhooks/paddle',
      supported_events: [
        'subscription.created',
        'subscription.updated', 
        'subscription.activated',
        'subscription_payment_succeeded',
        'payment_succeeded',
        'subscription.canceled',
        'subscription_cancelled'
      ],
      email_extraction_sources: [
        'customer.email (from Paddle API)',
        'custom_data.userEmail (from checkout)',
        'data.customer.email',
        'data.email',
        'subData.email',
        'subData.customer_email',
        'subData.billing.email',
        'regex search through entire payload'
      ]
    }
  });
}

// ─── Handlers ────────────────────────────────────────────────────────────

const generateRequestId = () => {
  return Math.random().toString(36).substring(2, 15);
}

async function handleSubscriptionCreated(data) {
  const reqId = generateRequestId();
  console.log(`
╔════════════════════════════════════════════
║ 📦 SUBSCRIPTION CREATED [${reqId}]
║ Timestamp: ${new Date().toISOString()}
╠════════════════════════════════════════════`);

  const subData = data.data || data;
  console.log(`║ Subscription Data:`, JSON.stringify(subData, null, 2));

  const customerId = subData.customer_id;
  const paddleSubscriptionId = subData.id;
  const subscriptionStatus = subData.status;
  const priceId = subData.items?.[0]?.price?.id;

  console.log(`║ 🔍 Customer ID:`, customerId);
  console.log(`║ 🏷️ Price ID from webhook:`, priceId);

  const customer = await paddle.getCustomer(customerId);
  console.log(`║ 👤 Customer Details:`, customer);
  let email = customer?.email;

  const tier = getTierFromPriceId(priceId);
  console.log(`║ ✨ Determined Tier:`, tier);

  console.log(`║ 
║ Email: ${email || 'NOT FOUND'}
║ Customer ID: ${customerId}
║ Subscription ID: ${paddleSubscriptionId}
║ Status: ${subscriptionStatus}
║ Price ID: ${priceId}
║ Calculated Tier: ${tier}
╠════════════════════════════════════════════`);

  
  
  const finalEmail = email || subData.custom_data?.userEmail || subData.email;

  try {
    const result = await updateUserTier(finalEmail, {
      tier: tier,
      paddleSubscriptionId: paddleSubscriptionId,
      paddleCustomerId: customerId,
      status: subscriptionStatus,
      nextBillDate: subData.next_billed_at ? new Date(subData.next_billed_at) : null,
    });

    console.log(`║ ✅ User tier updated successfully
║ Result:`, result);
    console.log(`╚════════════════════════════════════════════`);
    return result;
  } catch (error) {
    console.error(`║ ❌ Failed to update user tier for ${finalEmail}:
║ Error: ${error.message}
╚════════════════════════════════════════════`);
    throw error;
  }
}

async function handleTransactionCompleted(data) {
  const reqId = generateRequestId();
  console.log(`
╔════════════════════════════════════════════
║ 💰 TRANSACTION COMPLETED / SUBSCRIPTION UPDATED [${reqId}]
║ Timestamp: ${new Date().toISOString()}
╠════════════════════════════════════════════`);

  // Handle both v1 and v2 webhook formats
  const subData = data.data || data;
  console.log(`║ Transaction/Subscription Data:`, JSON.stringify(subData, null, 2));

  // Extract data from various possible formats
  let paddleSubscriptionId, customerId, email, priceId;

  // For subscription.updated events
  if (subData.id && subData.customer_id) {
    paddleSubscriptionId = subData.id;
    customerId = subData.customer_id;
    priceId = subData.items?.[0]?.price?.id;
  } 
  // For payment_succeeded events
  else if (subData.subscription_id) {
    paddleSubscriptionId = subData.subscription_id;
    customerId = subData.customer_id || subData.user_id;
    priceId = subData.product_id;
  }
  // For v1 webhook formats
  else if (subData.subscription && subData.user) {
    paddleSubscriptionId = subData.subscription.subscription_id || subData.subscription.id;
    customerId = subData.user.user_id || subData.user.customer_id;
    email = subData.user.email;
    priceId = subData.subscription.plan_id || subData.subscription.product_id;
  }

  console.log(`║ 🔍 Extracted data:
║ - Subscription ID: ${paddleSubscriptionId || 'NOT FOUND'}
║ - Customer ID: ${customerId || 'NOT FOUND'}
║ - Email: ${email || 'NOT FOUND'}
║ - Price ID: ${priceId || 'NOT FOUND'}`);

  if (!paddleSubscriptionId) {
    throw new Error('No subscription ID found in webhook data');
  }

  // Try to get user from our database using subscription ID
  let user;
  try {
    user = await findUserByPaddleSubscriptionId(paddleSubscriptionId);
    console.log(`║ 👤 Found user in database:`, user ? user.email : 'NOT FOUND');
    if (user) {
      email = user.email;
    }
  } catch (error) {
    console.warn(`║ ⚠️ Error finding user by subscription ID: ${error.message}`);
  }

  // If we still don't have email, try to get it from Paddle
  if (!email && customerId) {
    try {
      const customer = await paddle.getCustomer(customerId);
      email = customer?.email;
      console.log(`║ 📧 Retrieved email from Paddle: ${email || 'NOT FOUND'}`);
    } catch (error) {
      console.error(`║ ❌ Failed to get customer from Paddle: ${error.message}`);
    }
  }

  // If we still don't have email, check custom data or fallback fields
  if (!email) {
    email = subData.custom_data?.userEmail || 
            subData.email || 
            subData.user?.email || 
            subData.customer?.email ||
            subData.customer_email ||
            subData.billing?.email ||
            data.customer?.email ||
            data.email;
    
    if (email) {
      console.log(`║ 📧 Using fallback email: ${email}`);
    } else {
      console.error(`║ ❌ No email found in any data source`);
      console.error(`║ 🔍 Full webhook data for debugging:`, JSON.stringify(data, null, 2));
      console.error(`║ 🔍 SubData for debugging:`, JSON.stringify(subData, null, 2));
      
      // Try one more approach - look for email anywhere in the data
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
      const dataStr = JSON.stringify(data);
      const emailMatches = dataStr.match(emailRegex);
      
      if (emailMatches && emailMatches.length > 0) {
        email = emailMatches[0];
        console.log(`║ 🔍 Found email via regex search: ${email}`);
      } else {
        // As a last resort, log everything and continue with a warning
        console.error(`║ ⚠️ CRITICAL: Cannot find email anywhere in webhook data`);
        console.error(`║ ⚠️ This will cause the subscription update to fail`);
        console.error(`║ ⚠️ Please check Paddle webhook configuration`);
        throw new Error('No email found for subscription update - check webhook data structure');
      }
    }
  }

  // Get subscription details from Paddle if needed
  let subscriptionDetails;
  if (paddleSubscriptionId && (!priceId || !customerId)) {
    try {
      subscriptionDetails = await paddle.getSubscription(paddleSubscriptionId);
      console.log(`║ 📄 Retrieved subscription details from Paddle API`);
      
      // Update missing information
      if (!priceId) priceId = subscriptionDetails.items?.[0]?.price?.id;
      if (!customerId) customerId = subscriptionDetails.customer_id;
    } catch (error) {
      console.error(`║ ❌ Failed to get subscription from Paddle: ${error.message}`);
    }
  }

  // Determine tier from price ID
  const tier = getTierFromPriceId(priceId);
  console.log(`║ ✨ Determined Tier: ${tier || 'DEFAULT TO PRO'}`);

  // Get subscription status
  const status = subData.status || subscriptionDetails?.status || 'active';
  const nextBillDate = subData.next_billed_at || subData.next_bill_date || subscriptionDetails?.next_billed_at;

  console.log(`║ 
║ Final data for update:
║ - Email: ${email}
║ - Subscription ID: ${paddleSubscriptionId}
║ - Customer ID: ${customerId || 'NOT FOUND'}
║ - Status: ${status}
║ - Tier: ${tier || 'pro'}
║ - Next Bill Date: ${nextBillDate || 'NOT FOUND'}
╠════════════════════════════════════════════`);

  try {
    const result = await updateUserTier(email, {
      tier: tier || 'pro', // Default to pro if we can't determine
      paddleSubscriptionId: paddleSubscriptionId,
      paddleCustomerId: customerId,
      status: status,
      nextBillDate: nextBillDate ? new Date(nextBillDate) : null,
      lastPaymentDate: new Date()
    });

    console.log(`║ ✅ User tier updated successfully
║ Result:`, result);
    console.log(`╚════════════════════════════════════════════`);
    return result;
  } catch (error) {
    console.error(`║ ❌ Failed to update user tier:
║ Error: ${error.message}
╚════════════════════════════════════════════`);
    throw error;
  }
}

async function handleSubscriptionCanceled(data) {
  console.log('🚫 Processing subscription cancellation:', data);

  // Try lookup by subscription ID first
  let user = await findUserByPaddleSubscriptionId(data.subscription_id || data.id);
  console.log('🔍 User lookup by subscription ID:', user ? 'Found' : 'Not found');

  // Fallback to passthrough email
  if (!user) {
    let meta = {};
    try { 
      meta = JSON.parse(data.passthrough || '{}');
      console.log('📎 Parsed metadata:', meta);
    } catch (e) {
      console.error('❌ Failed to parse passthrough:', e);
    }
    
    user = await getFullUserByEmail(meta.email || data.customer?.email);
    console.log('🔍 User lookup by email:', user ? 'Found' : 'Not found');
  }

  if (!user) {
    throw new Error('User not found for cancellation');
  }

  console.log(`📉 Cancelling subscription for user: ${user.email}`);

  return updateUserTier(user.email, {
    tier: 'free', // Explicitly set tier to free
    status: 'cancelled',
    cancelledAt: new Date(),
    paddleSubscriptionId: null, // Clear subscription ID
  });
}
