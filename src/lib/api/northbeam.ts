/**
 * Northbeam API Integration
 * 
 * This module provides functions for fetching attribution data from Northbeam.
 * For the MVP, we use seed data instead of live API calls.
 */

export interface NorthbeamAttributionData {
  date: string
  channel: string
  platform: string
  campaign_id: string | null
  campaign_name: string | null
  spend: number
  revenue: number
  orders: number
  new_customer_revenue: number
  returning_customer_revenue: number
  first_click_revenue: number
  last_click_revenue: number
  linear_revenue: number
  position_based_revenue: number
  time_decay_revenue: number
  roas: number
  mer: number
  cac: number
  cpa: number
  aov: number
  new_customer_rate: number
}

export interface NorthbeamMERData {
  date: string
  total_spend: number
  total_revenue: number
  mer: number
  amer: number // adjusted MER
  contribution_margin: number
  contribution_margin_percent: number
  new_customer_spend: number
  new_customer_revenue: number
  new_customer_mer: number
  returning_customer_spend: number
  returning_customer_revenue: number
  returning_customer_mer: number
}

export interface NorthbeamChannelData {
  channel: string
  platform: string
  spend: number
  revenue: number
  orders: number
  roas: number
  contribution_percent: number
  trend_7d: number // percentage change vs 7 days ago
  trend_30d: number // percentage change vs 30 days ago
}

export interface NorthbeamApiConfig {
  apiKey: string
  brandId?: string
}

/**
 * Fetch attribution data from Northbeam
 */
export async function fetchAttributionData(
  config: NorthbeamApiConfig,
  options: {
    dateRange: { startDate: string; endDate: string }
    groupBy?: 'day' | 'week' | 'month'
    channels?: string[]
    attributionModel?: 'first_click' | 'last_click' | 'linear' | 'position_based' | 'time_decay'
  }
): Promise<NorthbeamAttributionData[]> {
  // In production, this would make an API call:
  // const response = await fetch('https://api.northbeam.io/v1/attribution', {
  //   headers: { 'Authorization': `Bearer ${config.apiKey}` },
  //   body: JSON.stringify(options)
  // })
  
  console.log('Northbeam API: fetchAttributionData called with options:', options)
  return []
}

/**
 * Fetch MER (Marketing Efficiency Ratio) data
 */
export async function fetchMERData(
  config: NorthbeamApiConfig,
  options: {
    dateRange: { startDate: string; endDate: string }
    groupBy?: 'day' | 'week' | 'month'
    contributionMarginPercent?: number
  }
): Promise<NorthbeamMERData[]> {
  console.log('Northbeam API: fetchMERData called with options:', options)
  return []
}

/**
 * Fetch channel-level performance data
 */
export async function fetchChannelData(
  config: NorthbeamApiConfig,
  options: {
    dateRange: { startDate: string; endDate: string }
    includeBlended?: boolean
  }
): Promise<NorthbeamChannelData[]> {
  console.log('Northbeam API: fetchChannelData called with options:', options)
  return []
}

/**
 * Get available channels for the account
 */
export async function getAvailableChannels(
  config: NorthbeamApiConfig
): Promise<string[]> {
  console.log('Northbeam API: getAvailableChannels called')
  return ['meta', 'google', 'tiktok', 'email', 'sms', 'organic', 'direct']
}

/**
 * Calculate blended metrics across all channels
 */
export function calculateBlendedMetrics(
  data: NorthbeamAttributionData[]
): {
  totalSpend: number
  totalRevenue: number
  blendedRoas: number
  blendedMer: number
  totalOrders: number
  blendedCpa: number
  blendedAov: number
} {
  const totalSpend = data.reduce((sum, d) => sum + d.spend, 0)
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0)
  const totalOrders = data.reduce((sum, d) => sum + d.orders, 0)
  
  return {
    totalSpend,
    totalRevenue,
    blendedRoas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
    blendedMer: totalSpend > 0 ? totalRevenue / totalSpend : 0,
    totalOrders,
    blendedCpa: totalOrders > 0 ? totalSpend / totalOrders : 0,
    blendedAov: totalOrders > 0 ? totalRevenue / totalOrders : 0,
  }
}

/**
 * Helper to check API connection
 */
export async function testConnection(config: NorthbeamApiConfig): Promise<boolean> {
  try {
    console.log('Northbeam API: Testing connection')
    return true
  } catch {
    return false
  }
}
