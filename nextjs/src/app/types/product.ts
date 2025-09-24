import { Json } from '@/lib/supabase/types';

// Type definitions
export interface ProductData {
  id: number;
  brand: string | null;
  title: string | null;
  active_channel_ids: string[] | null;
  product_image: ProductImage[];
  variant: ProductVariant[];
  content: ProductContent[];
}

export interface ProductImage {
  id: number;
  url: string;
  position: number;
}

export interface ProductVariant {
  id: number;
  title: string | null;
  price?: ProductPrice[] | null;
  ean: string | null;
  position: number | null;
  buyprice?: number | null;
  picqer_idproduct?: number | null;
  repricer?: RepricerData | null;
}

export interface ProductPrice {
  country_code: string | null;
  price: number | null;
  ean_reference: string | null;
}

export interface RepricerData {
  id: number;
  ean_reference: string | null;
  is_active: boolean | null;
  minimum_price: number | null;
  urls: Json;
  created_at: string;
}


export interface ProductContent {
  title: string | null;
  description: string | null;
  content: string | null;
  locale: string | null;
}

export interface UpdateProductDetailsBody {
  title?: string;
  brand?: string;
  description?: string;
  content?: string;
  locale?: string; // Optional locale, defaults to 'NL'
}

// API response type
export interface ApiProduct {
  id: number;
  title: string;
  brand: string | null;
  description: string;
  mainImage: string | false;
  images: ProductImage[];
  content: ProductContent[];
  active_channel_ids: string[];
  variants: ProductVariant[];
}