/**
 * Meta Marketing API Integration
 * 
 * This module provides functions for fetching data from the Meta Marketing API.
 * For the MVP, we use seed data instead of live API calls.
 */

export interface MetaCampaign {
  id: string
  name: string
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED'
  objective: string
  daily_budget: number
  lifetime_budget: number | null
  created_time: string
  updated_time: string
}

export interface MetaAdset {
  id: string
  campaign_id: string
  name: string
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED'
  targeting: {
    age_min: number
    age_max: number
    genders: number[]
    geo_locations: {
      countries: string[]
      cities: string[]
    }
    custom_audiences: Array<{ id: string; name: string }>
  }
  optimization_goal: string
  billing_event: string
  bid_amount: number | null
  daily_budget: number
  lifetime_budget: number | null
}

export interface MetaAd {
  id: string
  adset_id: string
  name: string
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED'
  creative: {
    id: string
    name: string
    thumbnail_url: string
    body: string
    title: string
    call_to_action_type: string
    image_url: string | null
    video_id: string | null
  }
}

export interface MetaInsights {
  campaign_id?: string
  adset_id?: string
  ad_id?: string
  date_start: string
  date_stop: string
  spend: number
  impressions: number
  clicks: number
  reach: number
  frequency: number
  cpm: number
  cpc: number
  ctr: number
  actions: Array<{
    action_type: string
    value: number
  }>
  conversions: number
  conversion_values: number
  cost_per_action_type: Array<{
    action_type: string
    value: number
  }>
}

export interface MetaApiConfig {
  accessToken: string
  accountId: string
  apiVersion: string
}

// Rate limiting helper
class RateLimiter {
  private requests: number[] = []
  private readonly limit: number
  private readonly windowMs: number

  constructor(limit: number = 200, windowMs: number = 3600000) {
    this.limit = limit
    this.windowMs = windowMs
  }

  canRequest(): boolean {
    const now = Date.now()
    this.requests = this.requests.filter(t => now - t < this.windowMs)
    return this.requests.length < this.limit
  }

  recordRequest(): void {
    this.requests.push(Date.now())
  }
}

const rateLimiter = new RateLimiter()

/**
 * Fetch campaigns from Meta Marketing API
 */
export async function fetchCampaigns(
  config: MetaApiConfig,
  options?: { status?: string[] }
): Promise<MetaCampaign[]> {
  // In production, this would make an API call:
  // const url = `https://graph.facebook.com/${config.apiVersion}/${config.accountId}/campaigns`
  // const response = await fetch(url, { headers: { Authorization: `Bearer ${config.accessToken}` } })
  
  console.log('Meta API: fetchCampaigns called with config:', { accountId: config.accountId })
  
  // Return empty array for MVP - use seed data instead
  return []
}

/**
 * Fetch adsets for a campaign
 */
export async function fetchAdsets(
  config: MetaApiConfig,
  campaignId: string
): Promise<MetaAdset[]> {
  console.log('Meta API: fetchAdsets called for campaign:', campaignId)
  return []
}

/**
 * Fetch ads for an adset
 */
export async function fetchAds(
  config: MetaApiConfig,
  adsetId: string
): Promise<MetaAd[]> {
  console.log('Meta API: fetchAds called for adset:', adsetId)
  return []
}

/**
 * Fetch insights (metrics) for campaigns, adsets, or ads
 */
export async function fetchInsights(
  config: MetaApiConfig,
  options: {
    level: 'campaign' | 'adset' | 'ad'
    datePreset?: string
    timeRange?: { since: string; until: string }
    fields?: string[]
  }
): Promise<MetaInsights[]> {
  if (!rateLimiter.canRequest()) {
    throw new Error('Rate limit exceeded')
  }
  
  rateLimiter.recordRequest()
  
  console.log('Meta API: fetchInsights called with options:', options)
  return []
}

/**
 * Get creative thumbnail URL
 */
export async function getCreativeThumbnail(
  config: MetaApiConfig,
  creativeId: string
): Promise<string | null> {
  console.log('Meta API: getCreativeThumbnail called for creative:', creativeId)
  return null
}

/**
 * Helper to check API connection
 */
export async function testConnection(config: MetaApiConfig): Promise<boolean> {
  try {
    // In production, make a simple API call to verify credentials
    console.log('Meta API: Testing connection for account:', config.accountId)
    return true
  } catch {
    return false
  }
}
