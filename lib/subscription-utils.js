// 1. Updated subscription-utils.js (add missing exports and fix naming)
import clientPromise from "/lib/mongodb";
import { SUBSCRIPTION_TIERS } from './paddle-config';

export async function updateUserTier(userEmail, subscriptionData) {
  console.log(`🎯 updateUserTier called for email: ${userEmail}`);
  console.log(`📝 Subscription Data:`, subscriptionData);
  
  try {
    const client = await clientPromise;
    const db = client.db("users");
    const users = db.collection('users');

    // First, get existing user
    const existingUser = await users.findOne({ email: userEmail });
    console.log(`👤 Current user state:`, existingUser);

    if (!existingUser) {
      throw new Error(`User with email ${userEmail} not found`);
    }

    // Prepare update data
    const updateData = {
      updatedAt: new Date(),
    };

    // Handle tier update
    if (subscriptionData.tier) {
      updateData.tier = subscriptionData.tier;
    } else if (subscriptionData.paddleSubscriptionId && !existingUser.tier) {
      // If no tier specified but subscription ID exists, default to 'pro'
      updateData.tier = 'pro';
    }

    // Update other Paddle fields
    if (subscriptionData.paddleSubscriptionId) {
      updateData.paddleSubscriptionId = subscriptionData.paddleSubscriptionId;
    }
    if (subscriptionData.paddleCustomerId) {
      updateData.paddleCustomerId = subscriptionData.paddleCustomerId;
    }
    if (subscriptionData.status) {
      updateData.subscriptionStatus = subscriptionData.status;
      // Reset tier to 'free' if subscription is cancelled
      if (subscriptionData.status === 'cancelled' || subscriptionData.status === 'canceled') {
        updateData.tier = 'free';
      }
    }
    if (subscriptionData.nextBillDate) {
      updateData.subscriptionNextBillDate = subscriptionData.nextBillDate;
    }
    if (subscriptionData.lastPaymentDate) {
      updateData.lastPaymentDate = subscriptionData.lastPaymentDate;
    }
    if (subscriptionData.cancelledAt) {
      updateData.cancelledAt = subscriptionData.cancelledAt;
      updateData.tier = 'free'; // Reset tier on cancellation
    }

    console.log(`📝 Final update data:`, updateData);

    // Perform the update
    const result = await users.updateOne(
      { email: userEmail },
      { $set: updateData }
    );

    console.log(`📊 MongoDB update result:`, {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      acknowledged: result.acknowledged,
      newTier: updateData.tier
    });

    // Verify the update
    const updatedUser = await users.findOne({ email: userEmail });
    console.log(`✅ Updated user state:`, {
      email: updatedUser.email,
      tier: updatedUser.tier,
      subscriptionStatus: updatedUser.subscriptionStatus
    });

    return result;
  } catch (error) {
    console.error('❌ Error updating user tier:', error);
    throw error;
  }
}
export async function findUserByPaddleCustomerId(customerId) {
  try {
    const client = await clientPromise;
    const db = client.db("users");
    const users = db.collection('users');

    const user = await users.findOne({ paddleCustomerId: customerId });
    return user;
  } catch (error) {
    console.error('Error finding user by Paddle customer ID:', error);
    return null;
  }
}

export async function findUserByPaddleSubscriptionId(subscriptionId) {
  try {
    const client = await clientPromise;
    const db = client.db("users");
    const users = db.collection('users');

    const user = await users.findOne({ paddleSubscriptionId: subscriptionId });
    return user;
  } catch (error) {
    console.error('Error finding user by Paddle subscription ID:', error);
    return null;
  }
}

export async function getUserByEmail(email) {
  try {
    const client = await clientPromise;
    const db = client.db("users");
    const users = db.collection('users');

    const user = await users.findOne({ email: email });
    return user;
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
}

// Alias for consistency with other code
export const findUserByEmail = getUserByEmail;

export function hasFeatureAccess(userTier, feature) {
  const tierConfig = Object.values(SUBSCRIPTION_TIERS).find(t => t.tier === userTier);
  if (!tierConfig) return false;

  switch (feature) {
    case 'unlimited_products':
      return tierConfig.limits?.products === -1;
    case 'multiple_stores':
      return tierConfig.limits?.stores > 1;
    case 'api_access':
      return userTier === 'pro';
    default:
      return true;
  }
}

// Export this function for webhook handler
export function getTierFromPaddlePlanId(planId) {
  for (const [key, config] of Object.entries(SUBSCRIPTION_TIERS)) {
    if (config.paddlePlanId === planId) {
      return config.tier;
    }
  }
  return 'free';
}

// New function to get tier from Paddle Price ID
export function getTierFromPriceId(priceId) {
  if (!priceId) {
    console.warn('[getTierFromPriceId] No priceId provided, defaulting to pro tier.');
    return 'pro'; // Default to pro if no price ID is provided
  }
  
  // First check main price IDs
  for (const [tierKey, config] of Object.entries(SUBSCRIPTION_TIERS)) {
    if (config.priceId === priceId) {
      return tierKey;
    }
  }
  
  // Then check additional price IDs
  for (const [tierKey, config] of Object.entries(SUBSCRIPTION_TIERS)) {
    if (config.additionalPriceIds && Array.isArray(config.additionalPriceIds)) {
      if (config.additionalPriceIds.includes(priceId)) {
        return tierKey;
      }
    }
  }
  
  // If we get here and don't have a match, default to pro tier
  console.log(`[getTierFromPriceId] Unknown Price ID: ${priceId}. Defaulting to pro tier.`);
  return 'pro'; // Default to pro for unknown price IDs
}

// New function to get full user details by email
export async function getFullUserByEmail(email) {
  try {
    const client = await clientPromise;
    const db = client.db("users");
    const users = db.collection('users');

    const user = await users.findOne({ email: email });
    
    if (!user) {
      console.warn(`User not found for email: ${email}`);
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Error getting full user by email:', error);
    return null;
  }
}