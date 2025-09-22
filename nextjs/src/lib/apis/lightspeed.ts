// Types
export interface LightspeedProduct {
  id: number;
  title: string;
  description: string;
  content?: string;
  url?: string;
  isVisible?: boolean;
  visibility?: string;
  createdAt?: string;
  updatedAt?: string;
  brand?: {
    resource: {
      id: number;
      url: string;
      link: string;
    };
  };
  supplier?: {
    resource: {
      id: number;
      url: string;
      link: string;
    };
  };
  images?: {
    resource: {
      url: string;
      link: string;
    };
  };
  variants?: {
    resource: {
      url: string;
      link: string;
    };
  };
}

export interface LightspeedBrand {
  id: number;
  title: string;
  url?: string;
}

export interface LightspeedImage {
  id: number;
  src: string;
  title: string;
  thumb: string;
  sortOrder: number;
  extension?: string;
  size?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface LightspeedVariant {
  id: number;
  createdAt: string;
  updatedAt: string;
  isDefault: boolean;
  sortOrder: number;
  articleCode: string;
  ean: string;
  sku: string;
  hs?: string;
  tax?: number;
  priceExcl: number;
  priceIncl: number;
  priceCost?: number;
  oldPriceExcl?: number;
  oldPriceIncl?: number;
  stockTracking: string;
  stockLevel?: number;
  weight?: number;
  volume?: number;
  title: string;
  product?: {
    resource: {
      id: number;
      url: string;
      link: string;
    };
  };
}

export interface LightspeedProductsResponse {
  products: LightspeedProduct[];
}

export interface LightspeedBrandResponse {
  brand: LightspeedBrand;
}

export interface LightspeedImagesResponse {
  productImages?: LightspeedImage[];  // Note: it's productImages, not images!
}

export interface LightspeedVariantsResponse {
  variants?: LightspeedVariant[];  // or variants
}

// Main Lightspeed API Class
export class LightspeedAPI {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;
  private rateLimitBuffer = 10;
  private requestCount = 0;

  constructor(config: {
    apiKey: string;
    apiSecret: string;
    language?: string;
  }) {
    // Required parameters - no defaults
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    const language = config.language || 'nl';
    this.baseUrl = `https://api.webshopapp.com/${language}`;
  }

  private getAuthHeader(): string {
    const credentials = `${this.apiKey}:${this.apiSecret}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
  }

  private async handleRateLimit(response: Response, retryCount: number = 0): Promise<number> {
    const resetHeader = response.headers.get('x-ratelimit-reset');
    let delay = 5000;
    
    if (resetHeader) {
      const resetTimes = resetHeader.split('/');
      const fiveMinReset = parseInt(resetTimes[0]) * 1000;
      delay = Math.max(fiveMinReset, 5000);
    } else {
      delay = Math.min(60000, (retryCount + 1) * 5000);
    }
    
    return delay;
  }

  private checkRemainingCalls(response: Response): boolean {
    const remaining = response.headers.get('x-ratelimit-remaining');
    if (remaining) {
      const remainingCalls = remaining.split('/').map(n => parseInt(n));
      const fiveMinRemaining = remainingCalls[0];
      
      if (fiveMinRemaining < this.rateLimitBuffer) {
        console.log(`Low rate limit warning: ${fiveMinRemaining} calls remaining`);
        return true;
      }
    }
    return false;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit,
    maxRetries: number = 3
  ): Promise<T> {
    // Handle both full URLs and endpoint paths
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    let retries = 0;

    // Log every 10 requests
    this.requestCount++;
    if (this.requestCount % 10 === 0) {
      console.log(`Made ${this.requestCount} API requests...`);
    }

    while (retries < maxRetries) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Authorization': this.getAuthHeader(),
            'Content-Type': 'application/json',
            ...options?.headers,
          },
        });

        if (response.status === 429) {
          const delay = await this.handleRateLimit(response, retries);
          console.log(`Rate limited. Waiting ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retries++;
          continue;
        }

        if (!response.ok) {
          throw new Error(`API error: ${response.status} for ${url}`);
        }

        if (this.checkRemainingCalls(response)) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        return await response.json();
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          console.error(`Failed to fetch ${url}:`, error);
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    throw new Error(`Failed after ${maxRetries} retries`);
  }

  // Product Methods
  async getProducts(options?: {
    page?: number;
    limit?: number;
    sinceId?: number;
  }): Promise<{
    products: LightspeedProduct[];
    hasMore: boolean;
  }> {
    const limit = options?.limit || 250;
    const page = options?.page || 1;
    
    let endpoint = `/products.json?limit=${limit}&page=${page}`;
    if (options?.sinceId) {
      endpoint += `&since_id=${options.sinceId}`;
    }

    const data = await this.request<LightspeedProductsResponse>(endpoint);
    
    return {
      products: data.products || [],
      hasMore: data.products.length === limit,
    };
  }

  async getProduct(productId: number): Promise<LightspeedProduct> {
    const data = await this.request<{ product: LightspeedProduct }>(
      `/products/${productId}.json`
    );
    return data.product;
  }

  // Brand Methods
  async getBrand(brandId: number): Promise<LightspeedBrand | null> {
    try {
      const data = await this.request<LightspeedBrandResponse>(
        `/brands/${brandId}.json`
      );
      return data.brand;
    } catch (error) {
      console.error(`Failed to fetch brand ${brandId}:`, error);
      return null;
    }
  }

  async getBrandByUrl(url: string): Promise<LightspeedBrand | null> {
    try {
      const data = await this.request<LightspeedBrandResponse>(url);
      return data.brand;
    } catch (error) {
      console.error(`Failed to fetch brand from ${url}:`, error);
      return null;
    }
  }

  // Image Methods
  async getProductImages(productId: number): Promise<LightspeedImage[]> {
    try {
      const data = await this.request<LightspeedImagesResponse>(
        `/products/${productId}/images.json`
      );
      // API returns productImages, not images
      return data.productImages || [];
    } catch (error) {
      console.error(`Failed to fetch images for product ${productId}:`, error);
      return [];
    }
  }

  async getProductImagesByUrl(url: string): Promise<LightspeedImage[]> {
    try {
      console.log(`Fetching images from: ${url}`);
      const data = await this.request<LightspeedImagesResponse>(url);
      console.log(`Images response keys:`, Object.keys(data));
      // API returns productImages, not images
      const images = data.productImages || [];
      console.log(`Found ${images.length} images`);
      return images;
    } catch (error) {
      console.error(`Failed to fetch images from ${url}:`, error);
      return [];
    }
  }

  // Variant Methods
  async getProductVariants(productId: number): Promise<LightspeedVariant[]> {
    try {
      const data = await this.request<LightspeedVariantsResponse>(
        `/products/${productId}/variants.json`
      );
      // Could be productVariants or variants
      return data.variants || [];
    } catch (error) {
      console.error(`Failed to fetch variants for product ${productId}:`, error);
      return [];
    }
  }

  async getProductVariantsByEAN(ean: string): Promise<LightspeedVariant[]> {
    try {
      const data = await this.request<LightspeedVariantsResponse>(
        `/variants.json?ean=${encodeURIComponent(ean)}`
      );
      // Could be productVariants or variants
      return data.variants || [];
    } catch (error) {
      console.error(`Failed to fetch variant for EAN:${ean}:`, error);
      return [];
    }
  }

  async getProductVariantsByUrl(url: string): Promise<LightspeedVariant[]> {
    try {
      console.log(`Fetching variants from: ${url}`);
      const data = await this.request<LightspeedVariantsResponse>(url);
      console.log(`Variants response keys:`, Object.keys(data));
      // Could be productVariants or variants
      const variants = data.variants || [];
      console.log(`Found ${variants.length} variants`);
      return variants;
    } catch (error) {
      console.error(`Failed to fetch variants from ${url}:`, error);
      return [];
    }
  }

  // Helper: Iterate through all products with built-in pagination
  async *iterateProducts(options?: {
    limit?: number;
    delayMs?: number;
  }): AsyncGenerator<LightspeedProduct[]> {
    let page = 1;
    let hasMore = true;
    const delayMs = options?.delayMs || 300;

    while (hasMore) {
      const { products, hasMore: more } = await this.getProducts({
        page,
        limit: options?.limit,
      });

      if (products.length > 0) {
        yield products;
      }

      hasMore = more;
      page++;

      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
}

// Singleton instance - removed default initialization
let instance: LightspeedAPI | undefined;

export function getLightspeedAPI(config?: {
  apiKey: string;
  apiSecret: string;
  language?: string;
}): LightspeedAPI {
  if (!instance) {
    if (!config) {
      throw new Error('LightspeedAPI configuration required for first initialization');
    }
    instance = new LightspeedAPI(config);
  }
  return instance;
}