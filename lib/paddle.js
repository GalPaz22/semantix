import crypto from 'crypto';

export class PaddleAPI {
  constructor() {
    this.apiKey = process.env.PADDLE_API_KEY;
    this.vendorId = process.env.NEXT_PUBLIC_PADDLE_VENDOR_ID;
    this.baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://api.paddle.com'
      : 'https://sandbox-api.paddle.com';
    
    console.log(`🛠️ PaddleAPI initialized:
- Environment: ${process.env.NODE_ENV}
- Base URL: ${this.baseUrl}
- API Key: ${this.apiKey ? '✅ Present' : '❌ Missing'}
- Vendor ID: ${this.vendorId ? '✅ Present' : '❌ Missing'}`);
    
    if (!this.apiKey) {
      console.error('❌ CRITICAL ERROR: Missing PADDLE_API_KEY environment variable');
      throw new Error('Missing PADDLE_API_KEY environment variable. Please set this in your environment or .env file.');
    }
  }

  async makeRequest(endpoint, data = {}, method = 'POST') {
    console.log(`🚀 Making Paddle API request to: ${endpoint}`);
    
    const fullUrl = `${this.baseUrl}${endpoint}`;
    
    const requestOptions = {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    };

    if (method !== 'GET' && Object.keys(data).length > 0) {
      requestOptions.body = JSON.stringify(data);
    }

    try {
      console.log(`📤 Request to ${fullUrl}:`, { 
        method, 
        headers: { ...requestOptions.headers, 'Authorization': 'Bearer [REDACTED]' },
        body: method !== 'GET' ? data : undefined 
      });
      
      const response = await fetch(fullUrl, requestOptions);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          message: response.statusText 
        }));
        
        console.error('❌ Paddle API Error:', {
          status: response.status,
          url: fullUrl,
          error: errorData
        });
        
        throw new Error(`Paddle API error: ${response.status} - ${errorData.message || response.statusText}`);
      }

      const result = await response.json();
      console.log(`📥 Response from ${endpoint}:`, result);
      return result.data || result; // Handle both v1 and v2 response formats
    } catch (error) {
      console.error(`❌ Request to ${endpoint} failed:`, error);
      throw error;
    }
  }

  // Customer methods
  async getCustomer(customerId) {
    if (!customerId) {
      throw new Error('Customer ID is required');
    }
    return this.makeRequest(`/customers/${customerId}`, {}, 'GET');
  }

  async updateCustomer(customerId, data) {
    if (!customerId) {
      throw new Error('Customer ID is required');
    }
    return this.makeRequest(`/customers/${customerId}`, data, 'PATCH');
  }

  // Transaction methods
  async createTransaction(priceId, customerEmail, customData = {}) {
    console.log('🛒 Creating transaction:', { priceId, customerEmail });

    const transactionData = {
      items: [{
        price_id: priceId,
        quantity: 1
      }],
      customer_email: customerEmail,
      custom_data: customData,
      return_url: `${process.env.NEXTAUTH_URL}/subscription/success`,
      cancel_url: `${process.env.NEXTAUTH_URL}/subscription/cancel`
    };

    try {
      const result = await this.makeRequest('/transactions', transactionData);
      console.log('✅ Transaction created:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to create transaction:', error);
      throw error;
    }
  }

  // Subscription methods
  async getSubscription(subscriptionId) {
    if (!subscriptionId) {
      throw new Error('Subscription ID is required');
    }
    return this.makeRequest(`/subscriptions/${subscriptionId}`, {}, 'GET');
  }

  async cancelSubscription(subscriptionId, effectiveFrom = 'next_billing_period') {
    if (!subscriptionId) {
      throw new Error('Subscription ID is required');
    }
    
    try {
      console.log(`🔄 Cancelling subscription ${subscriptionId}`);
      const result = await this.makeRequest(
        `/subscriptions/${subscriptionId}/cancel`, 
        { effective_from: effectiveFrom }
      );
      console.log('✅ Subscription cancelled:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to cancel subscription:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
export const paddle = new PaddleAPI();