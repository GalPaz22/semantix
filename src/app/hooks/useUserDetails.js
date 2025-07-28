import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export function useUserDetails() {
  const { data: session } = useSession();
  const [userDetails, setUserDetails] = useState({
    tier: 'free',
    subscriptionStatus: null,
    nextBillDate: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    if (!session?.user?.email) {
      setUserDetails(prev => ({ ...prev, loading: false }));
      return;
    }

    fetchUserDetails();
  }, [session]);

  const fetchUserDetails = async () => {
    try {
      console.log('🔍 Fetching user details...');
      
      const response = await fetch('/api/subscription-status');
      if (response.ok) {
        const data = await response.json();
        console.log('✅ User details fetched:', data);
        
        setUserDetails({
          tier: data.tier || 'free',
          subscriptionStatus: data.subscriptionStatus,
          paddleSubscriptionId: data.paddleSubscriptionId,
          nextBillDate: data.nextBillDate,
          lastPaymentDate: data.lastPaymentDate,
          loading: false,
          error: null
        });
      } else {
        console.log('⚠️ Failed to fetch user details:', response.status);
        setUserDetails(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to fetch user details'
        }));
      }
    } catch (error) {
      console.error('❌ Error fetching user details:', error);
      setUserDetails(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  };

  const refreshUserDetails = () => {
    console.log('🔄 Manually refreshing user details...');
    setUserDetails(prev => ({ ...prev, loading: true }));
    fetchUserDetails();
  };

  return {
    ...userDetails,
    refreshUserDetails
  };
}