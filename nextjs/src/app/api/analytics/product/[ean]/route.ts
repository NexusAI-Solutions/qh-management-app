import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { executeQuery, testConnection } from '@/lib/mysql';
import type {
  AnalyticsResponse,
  AnalyticsError,
  WeeklySalesResult,
  YearSummaryResult,
  WeeklySalesData
} from '@/app/types/analytics';
import { ProductVariant } from '@/app/types/product';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ean: string }> }
): Promise<NextResponse<AnalyticsResponse | AnalyticsError>> {
  const timestamp = new Date().toISOString();

  try {
    const { ean } = await params;

    if (!ean) {
      return NextResponse.json({
        success: false,
        error: 'EAN parameter is required',
        timestamp
      }, { status: 400 });
    }

    console.log(`Analytics request for EAN: ${ean}`);

    // Step 1: Get product_id from Supabase variant table
    const supabase = await createSSRClient();
    const { data: variant, error: supabaseError } = await supabase
      .from('variant')
      .select('picqer_idproduct')
      .eq('ean', ean)
      .single<ProductVariant>();

    if (supabaseError || !variant) {
      console.log(`No variant found for EAN: ${ean}`);
      return NextResponse.json({
        success: false,
        error: `No product found for EAN: ${ean}`,
        timestamp
      }, { status: 404 });
    }

    const productId = variant.picqer_idproduct;

    if (!productId) {
      console.log(`No Picqer product ID found for EAN: ${ean}`);
      return NextResponse.json({
        success: false,
        error: `No Picqer product ID found for EAN: ${ean}`,
        timestamp
      }, { status: 404 });
    }

    console.log(`Found product_id ${productId} for EAN: ${ean}`);

    // Step 2: Test MySQL connection first
    const isConnected = await testConnection();
    if (!isConnected) {
      return NextResponse.json({
        success: false,
        error: 'Unable to connect to analytics database',
        timestamp
      }, { status: 503 });
    }

    // Step 3: Query MySQL analytics database
    try {
      // Query 1: Get weekly sales data for previous 52 weeks
      const weeklyQuery = `
        SELECT
          week_number,
          year,
          total_sales,
          total_quantity
        FROM weekly_product_sales
        WHERE idproduct = ?
          AND STR_TO_DATE(CONCAT(year, '-', week_number, '-1'), '%Y-%u-%w')
          BETWEEN DATE_SUB(NOW(), INTERVAL 52 WEEK) AND NOW()
        ORDER BY year ASC, week_number ASC
      `;

      // Query 2: Get period summary for previous 52 weeks
      const summaryQuery = `
        SELECT
          SUM(total_sales) as total_sales,
          COUNT(*) as total_weeks,
          SUM(order_count) as total_orders,
          SUM(total_quantity) as total_quantity
        FROM weekly_product_sales
        WHERE idproduct = ?
          AND STR_TO_DATE(CONCAT(year, '-', week_number, '-1'), '%Y-%u-%w')
          BETWEEN DATE_SUB(NOW(), INTERVAL 52 WEEK) AND NOW()
      `;

      // Execute both queries
      const [weeklyRows] = await executeQuery<WeeklySalesResult>(weeklyQuery, [productId]);
      const [summaryRows] = await executeQuery<YearSummaryResult>(summaryQuery, [productId]);

      // Calculate period dates
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - (52 * 7));

      // Create a map of existing data keyed by year-week
      const salesMap = new Map(
        weeklyRows.map(row => [
          `${row.year}-${row.week_number}`,
          { sales: row.total_sales || 0, quantity: row.total_quantity || 0 }
        ])
      );

      // Generate complete 52 weeks array with zero-fill for missing weeks
      const completeWeeklyData: WeeklySalesData[] = [];
      const currentDate = new Date();

      for (let i = 51; i >= 0; i--) {
        const weekDate = new Date(currentDate);
        weekDate.setDate(currentDate.getDate() - (i * 7));

        // Calculate week number and year for this date
        const yearWeekDate = new Date(weekDate);
        const startOfYear = new Date(yearWeekDate.getFullYear(), 0, 1);
        const weekNumber = Math.ceil(((yearWeekDate.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
        const year = yearWeekDate.getFullYear();

        const weekKey = `${year}-${weekNumber}`;
        const weekData = salesMap.get(weekKey) || { sales: 0, quantity: 0 };

        completeWeeklyData.push({
          week: weekNumber,
          year: year,
          sales: weekData.sales,
          quantity: weekData.quantity
        });
      }

      // Process period summary (handle case where no data exists)
      const periodSummary = summaryRows[0] || {
        total_sales: 0,
        total_weeks: 0,
        total_orders: 0,
        total_quantity: 0
      };

      // Ensure summary values are not null
      const totalSales = periodSummary.total_sales || 0;
      const totalWeeksWithSales = periodSummary.total_weeks || 0;
      const totalOrders = periodSummary.total_orders || 0;
      const totalQuantity = periodSummary.total_quantity || 0;

      const analyticsData = {
        product_id: productId,
        ean: ean,
        period_start: startDate.toISOString().split('T')[0],
        period_end: endDate.toISOString().split('T')[0],
        weekly_sales: completeWeeklyData,
        period_summary: {
          total_sales: totalSales,
          total_weeks_with_sales: totalWeeksWithSales,
          total_orders: totalOrders,
          total_quantity: totalQuantity,
          average_weekly_sales: totalWeeksWithSales > 0 ? totalSales / totalWeeksWithSales : 0
        }
      };

      return NextResponse.json({
        success: true,
        data: {
          ean,
          product_id: productId,
          analytics: analyticsData
        },
        timestamp
      });

    } catch (mysqlError) {
      console.error('MySQL query error:', mysqlError);
      return NextResponse.json({
        success: false,
        error: 'Analytics database query failed',
        timestamp
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      timestamp
    }, { status: 500 });
  }
}