// Analytics API response types

export interface WeeklySalesData {
  week: number;
  year: number;
  sales: number;
  quantity: number;
}

export interface WeeklySalesResult {
  week_number: number;
  year: number;
  total_sales: number;
  total_quantity: number;
}

export interface YearSummaryResult {
  total_sales: number;
  total_weeks: number;
  total_orders: number;
  total_quantity: number;
}

export interface ProductAnalyticsData {
  product_id: number;
  ean: string;
  period_start: string;
  period_end: string;
  weekly_sales: WeeklySalesData[];
  period_summary: {
    total_sales: number;
    total_weeks_with_sales: number;
    total_orders: number;
    total_quantity: number;
    average_weekly_sales: number;
  };
}

export interface AnalyticsResponse {
  success: boolean;
  data?: {
    ean: string;
    product_id?: number;
    analytics?: ProductAnalyticsData;
  };
  error?: string;
  timestamp: string;
}

export interface AnalyticsError {
  success: false;
  error: string;
  timestamp: string;
}


export interface MySQLAnalyticsResult {
  product_id: number;
  [key: string]: unknown; // Flexible for different analytics tables
}