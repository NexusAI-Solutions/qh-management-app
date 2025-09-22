// Picqer API Integration
// Based on Picqer API documentation: https://picqer.com/en/api/products

// Types
export interface PicqerProduct {
  idproduct: number;
  productcode: string;
  name: string;
  price: number;
  fixedstockprice: number | null;
  vatgroup: number;
  stock: number;
  reserved: number;
  ordered: number;
  barcode?: string;
  ean?: string;
  sku?: string;
  created: string;
  modified: string;
}

export interface PicqerProductsResponse {
  data: PicqerProduct[];
  success: boolean;
}

export interface PicqerSearchResult {
  product: PicqerProduct | null;
  multipleResults: boolean;
  totalResults: number;
}

// Main Picqer API Class
export class PicqerAPI {
  private apiKey: string;
  private baseUrl: string;
  private requestCount = 0;

  // Rate limiting properties
  private rateLimit: number = 500; // Default: 500 requests per minute
  private rateLimitRemaining: number = 500;
  private rateLimitReset: number = 0;
  private lastRequestTime: number = 0;

  constructor(config: {
    apiKey: string;
    baseUrl?: string;
  }) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://quality-heating.picqer.com/api/v1';
  }

  private getAuthHeader(): Record<string, string> {
    // Picqer uses HTTP Basic Auth with API Key as username, password is ignored
    const credentials = `${this.apiKey}:`;
    const base64Credentials = Buffer.from(credentials).toString('base64');

    return {
      'Authorization': `Basic ${base64Credentials}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  /**
   * Calculate dynamic delay based on rate limit status
   */
  private calculateDelay(): number {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    // If we have plenty of requests remaining, use minimal delay
    if (this.rateLimitRemaining > 100) {
      return Math.max(0, 120 - timeSinceLastRequest); // ~500 requests/minute max
    }

    // If we're running low on requests, be more conservative
    if (this.rateLimitRemaining > 10) {
      return Math.max(0, 300 - timeSinceLastRequest); // ~200 requests/minute
    }

    // If we're very low, be very conservative
    return Math.max(0, 1000 - timeSinceLastRequest); // ~60 requests/minute
  }

  /**
   * Handle rate limiting with dynamic delays
   */
  private async handleRateLimit(): Promise<void> {
    const delay = this.calculateDelay();

    if (delay > 0) {
      console.log(`Picqer API: Waiting ${delay}ms for rate limiting (${this.rateLimitRemaining} requests remaining)`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  /**
   * Parse rate limit headers from response
   */
  private updateRateLimitFromHeaders(response: Response): void {
    const rateLimitHeader = response.headers.get('X-RateLimit-Limit');
    const rateLimitRemainingHeader = response.headers.get('X-RateLimit-Remaining');

    if (rateLimitHeader) {
      this.rateLimit = parseInt(rateLimitHeader, 10) || this.rateLimit;
    }

    if (rateLimitRemainingHeader) {
      this.rateLimitRemaining = parseInt(rateLimitRemainingHeader, 10) || this.rateLimitRemaining;
    }
  }

  /**
   * Make request with retry logic for rate limiting
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<T> {
    const maxRetries = 5;

    await this.handleRateLimit();

    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getAuthHeader(),
          ...options.headers,
        },
      });

      // Update rate limit tracking from response headers
      this.updateRateLimitFromHeaders(response);

      // Handle rate limiting with exponential backoff
      if (response.status === 429) {
        if (retryCount >= maxRetries) {
          throw new Error(`Picqer API rate limit exceeded after ${maxRetries} retries`);
        }

        // Exponential backoff: 1s, 2s, 4s, 8s, 16s
        const backoffDelay = Math.pow(2, retryCount) * 1000;
        console.log(`Picqer API rate limited (429). Retrying in ${backoffDelay}ms... (attempt ${retryCount + 1}/${maxRetries})`);

        await new Promise(resolve => setTimeout(resolve, backoffDelay));

        // Reset rate limit remaining to be conservative
        this.rateLimitRemaining = Math.min(this.rateLimitRemaining, 10);

        return this.makeRequest<T>(endpoint, options, retryCount + 1);
      }

      // Handle other HTTP errors
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Picqer API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      return response.json();

    } catch (error) {
      // If it's a network error and we haven't exceeded retries, try again
      if (retryCount < maxRetries && error instanceof TypeError) {
        const backoffDelay = Math.pow(2, retryCount) * 1000;
        console.log(`Picqer API network error. Retrying in ${backoffDelay}ms... (attempt ${retryCount + 1}/${maxRetries})`);

        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        return this.makeRequest<T>(endpoint, options, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Search for products by EAN
   * Always returns the first product if multiple results are found
   */
  async searchProductByEAN(ean: string): Promise<PicqerSearchResult> {
    try {
      const response = await this.makeRequest<PicqerProduct[]>(
        `/products?search=${encodeURIComponent(ean)}`
      );

      // Handle response - could be array or object with data property
      const products = Array.isArray(response)
        ? response
        : (response as { data?: PicqerProduct[] }).data || [];

      if (!Array.isArray(products) || products.length === 0) {
        return {
          product: null,
          multipleResults: false,
          totalResults: 0
        };
      }

      // Always take the first product if multiple results
      const firstProduct = products[0];
      const multipleResults = products.length > 1;

      return {
        product: firstProduct,
        multipleResults,
        totalResults: products.length
      };

    } catch (error) {
      console.error(`Error searching Picqer for EAN ${ean}:`, error);
      throw error;
    }
  }

  /**
   * Get product by ID (for future use)
   */
  async getProduct(productId: number): Promise<PicqerProduct> {
    return this.makeRequest<PicqerProduct>(`/products/${productId}`);
  }

  /**
   * Reset request counter (for testing/debugging)
   */
  resetRequestCounter(): void {
    this.requestCount = 0;
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): {
    limit: number;
    remaining: number;
    requestCount: number;
  } {
    return {
      limit: this.rateLimit,
      remaining: this.rateLimitRemaining,
      requestCount: this.requestCount
    };
  }
}

// Singleton instance
let instance: PicqerAPI | undefined;

export function getPicqerAPI(config?: {
  apiKey: string;
  baseUrl?: string;
}): PicqerAPI {
  if (!instance) {
    if (!config) {
      throw new Error('PicqerAPI configuration required for first initialization');
    }
    instance = new PicqerAPI(config);
  }
  return instance;
}

// Helper function to create API instance from environment variables
export function createPicqerAPIFromEnv(): PicqerAPI {
  const apiKey = process.env.PICQER_API_KEY;
  const baseUrl = process.env.PICQER_BASE_URL;

  if (!apiKey) {
    throw new Error('PICQER_API_KEY environment variable is required');
  }

  return getPicqerAPI({
    apiKey,
    baseUrl
  });
}