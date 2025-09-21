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
  private rateLimitBuffer = 100; // ms between requests
  private requestCount = 0;

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

  private async handleRateLimit(): Promise<void> {
    // Simple rate limiting - wait between requests
    if (this.requestCount > 0) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitBuffer));
    }
    this.requestCount++;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    await this.handleRateLimit();

    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeader(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Picqer API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response.json();
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