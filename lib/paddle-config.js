export const SUBSCRIPTION_TIERS = {
  free: {
    tier: 'free',
    name: 'Free',
    price: 0,
    priceId: null, // Free tier doesn't need a price ID
    features: [
      'Basic features',
      'Limited usage', 
      'Community support'
    ]
  },
  pro: {
    tier: 'pro',
    name: 'Pro',
    price: 19,
    priceId: 'pri_01jw1ec6avbnxq701j8dpkm4m6', // Main price ID for Pro tier
    // Additional price IDs that should map to Pro tier
   
    features: [
      'All Free features',
      'Advanced features',
      'Priority support',
      'Higher usage limits'
    ]
  },
  premium: {
    tier: 'premium',
    name: 'Premium',
    price: 49,
    priceId: 'pri_your_premium_price_id_here', // Replace with your premium price ID
    additionalPriceIds: [],
    features: [
      'All Pro features',
      'Enterprise features',
      'Unlimited usage',
      'Dedicated support'
    ]
  }
};

// Helper function to get all price IDs for a given tier
export function getAllPriceIdsForTier(tier) {
  const tierConfig = SUBSCRIPTION_TIERS[tier];
  if (!tierConfig) return [];
  
  const allIds = [tierConfig.priceId];
  if (tierConfig.additionalPriceIds && Array.isArray(tierConfig.additionalPriceIds)) {
    allIds.push(...tierConfig.additionalPriceIds);
  }
  
  return allIds.filter(id => id !== null);
}
