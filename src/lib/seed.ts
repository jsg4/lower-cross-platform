import type { Client, DailyMetric, CreativeAsset, MERSnapshot } from '@/types/database'
import { subDays, format, eachDayOfInterval } from 'date-fns'

// Demo client data
export const demoClients: Omit<Client, 'created_at' | 'updated_at'>[] = [
  {
    id: 'c1a2b3c4-d5e6-7890-abcd-ef1234567890',
    name: 'Elevate Wellness Co.',
    meta_account_id: 'act_123456789',
    google_account_id: '1234567890',
    northbeam_api_key: 'nb_demo_key_1',
    northbeam_client_id: null,
    shopify_store_url: 'https://elevate-wellness.myshopify.com',
    target_mer: 3.5,
    target_contribution_margin_pct: 35,
    monthly_spend_target: null,
    monthly_revenue_target: null,
    cogs_pct: null,
  },
  {
    id: 'c2b3c4d5-e6f7-8901-bcde-f23456789012',
    name: 'Peak Performance Gear',
    meta_account_id: 'act_987654321',
    google_account_id: '9876543210',
    northbeam_api_key: 'nb_demo_key_2',
    northbeam_client_id: null,
    shopify_store_url: 'https://peak-performance.myshopify.com',
    target_mer: 4.0,
    target_contribution_margin_pct: 40,
    monthly_spend_target: null,
    monthly_revenue_target: null,
    cogs_pct: null,
  },
  {
    id: 'c3c4d5e6-f789-0123-cdef-345678901234',
    name: 'Luxe Home Essentials',
    meta_account_id: 'act_111222333',
    google_account_id: '1112223330',
    northbeam_api_key: 'nb_demo_key_3',
    northbeam_client_id: null,
    shopify_store_url: 'https://luxe-home.myshopify.com',
    target_mer: 3.2,
    target_contribution_margin_pct: 32,
    monthly_spend_target: null,
    monthly_revenue_target: null,
    cogs_pct: null,
  },
]

// Campaign names for realistic data
const metaCampaigns = [
  { id: 'mc_001', name: 'TOF - Prospecting - Broad', adsets: ['Interest Stack - Wellness', 'LAL - Purchasers 1%', 'LAL - High LTV 2%'] },
  { id: 'mc_002', name: 'TOF - Prospecting - Interest', adsets: ['Fitness Enthusiasts', 'Health & Wellness', 'Yoga & Meditation'] },
  { id: 'mc_003', name: 'MOF - Retargeting - Engaged', adsets: ['VC 180d', 'ATC 30d', 'Page View 14d'] },
  { id: 'mc_004', name: 'BOF - Retargeting - Hot', adsets: ['ATC 7d', 'IC 7d', 'VC 7d'] },
  { id: 'mc_005', name: 'Evergreen - Best Sellers', adsets: ['Broad - US', 'LAL - Purchasers', 'Interest - Core'] },
]

const googleCampaigns = [
  { id: 'gc_001', name: 'Search - Brand', adgroups: ['Brand Exact', 'Brand + Product', 'Brand Broad'] },
  { id: 'gc_002', name: 'Search - Non-Brand', adgroups: ['Generic Terms', 'Competitor', 'Long-tail'] },
  { id: 'gc_003', name: 'Performance Max - All Products', adgroups: ['Auto - All'] },
  { id: 'gc_004', name: 'Shopping - Feed', adgroups: ['Best Sellers', 'New Arrivals', 'Sale Items'] },
  { id: 'gc_005', name: 'Display - Retargeting', adgroups: ['Site Visitors', 'Cart Abandoners'] },
]

const adCreatives = [
  { name: 'UGC - Problem/Solution v1', type: 'ugc', hook: 'problem-agitate' },
  { name: 'UGC - Testimonial Sarah', type: 'ugc', hook: 'testimonial' },
  { name: 'Static - Product Hero v2', type: 'static', hook: 'product-focus' },
  { name: 'Video - Founder Story', type: 'video', hook: 'founder' },
  { name: 'Carousel - Benefits', type: 'carousel', hook: 'benefits' },
  { name: 'UGC - Unboxing Experience', type: 'ugc', hook: 'unboxing' },
  { name: 'Static - Limited Offer', type: 'static', hook: 'urgency' },
  { name: 'Video - How To Use', type: 'video', hook: 'educational' },
]

// Generate random variance
function randomVariance(base: number, variance: number): number {
  return base * (1 + (Math.random() - 0.5) * 2 * variance)
}

// Generate daily metrics
export function generateDailyMetrics(clientId: string, days: number = 90): Omit<DailyMetric, 'id' | 'created_at'>[] {
  const metrics: Omit<DailyMetric, 'id' | 'created_at'>[] = []
  const today = new Date()
  const startDate = subDays(today, days)
  
  const dateRange = eachDayOfInterval({ start: startDate, end: today })
  
  // Base metrics vary by client
  const clientMultiplier = clientId === demoClients[0].id ? 1.0 : 
                          clientId === demoClients[1].id ? 1.3 : 0.8
  
  for (const date of dateRange) {
    const dateStr = format(date, 'yyyy-MM-dd')
    const dayOfWeek = date.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const weekendMultiplier = isWeekend ? 1.15 : 1.0
    
    // Meta campaigns
    for (const campaign of metaCampaigns) {
      for (const adset of campaign.adsets) {
        const baseSpend = campaign.name.includes('TOF') ? 800 : 
                         campaign.name.includes('MOF') ? 400 : 
                         campaign.name.includes('BOF') ? 200 : 300
        
        const spend = randomVariance(baseSpend * clientMultiplier * weekendMultiplier, 0.25)
        const cpm = randomVariance(25, 0.3)
        const ctr = randomVariance(campaign.name.includes('BOF') ? 2.5 : 1.2, 0.3)
        const cvr = randomVariance(campaign.name.includes('BOF') ? 8 : campaign.name.includes('MOF') ? 4 : 2, 0.3)
        
        const impressions = Math.round((spend / cpm) * 1000)
        const clicks = Math.round(impressions * (ctr / 100))
        const conversions = Math.round(clicks * (cvr / 100))
        const aov = randomVariance(85, 0.2)
        const revenue = conversions * aov
        const roas = spend > 0 ? revenue / spend : 0
        const cpa = conversions > 0 ? spend / conversions : 0
        
        metrics.push({
          client_id: clientId,
          date: dateStr,
          channel: 'meta',
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          adset_id: `${campaign.id}_as_${adset.replace(/\s+/g, '_').toLowerCase().slice(0, 10)}`,
          adset_name: adset,
          ad_id: null,
          ad_name: null,
          spend: Math.round(spend * 100) / 100,
          revenue: Math.round(revenue * 100) / 100,
          impressions,
          clicks,
          conversions,
          roas: Math.round(roas * 100) / 100,
          cpa: Math.round(cpa * 100) / 100,
          cpm: Math.round(cpm * 100) / 100,
          ctr: Math.round(ctr * 100) / 100,
          cvr: Math.round(cvr * 100) / 100,
          aov: Math.round(aov * 100) / 100,
        })
      }
    }
    
    // Google campaigns
    for (const campaign of googleCampaigns) {
      for (const adgroup of campaign.adgroups) {
        const baseSpend = campaign.name.includes('Brand') ? 300 : 
                         campaign.name.includes('Performance') ? 600 : 
                         campaign.name.includes('Shopping') ? 400 : 200
        
        const spend = randomVariance(baseSpend * clientMultiplier * weekendMultiplier * 0.6, 0.25)
        const cpm = randomVariance(campaign.name.includes('Search') ? 45 : 15, 0.3)
        const ctr = randomVariance(campaign.name.includes('Brand') ? 8 : 2, 0.3)
        const cvr = randomVariance(campaign.name.includes('Brand') ? 12 : 4, 0.3)
        
        const impressions = Math.round((spend / cpm) * 1000)
        const clicks = Math.round(impressions * (ctr / 100))
        const conversions = Math.round(clicks * (cvr / 100))
        const aov = randomVariance(90, 0.2)
        const revenue = conversions * aov
        const roas = spend > 0 ? revenue / spend : 0
        const cpa = conversions > 0 ? spend / conversions : 0
        
        metrics.push({
          client_id: clientId,
          date: dateStr,
          channel: 'google',
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          adset_id: `${campaign.id}_ag_${adgroup.replace(/\s+/g, '_').toLowerCase().slice(0, 10)}`,
          adset_name: adgroup,
          ad_id: null,
          ad_name: null,
          spend: Math.round(spend * 100) / 100,
          revenue: Math.round(revenue * 100) / 100,
          impressions,
          clicks,
          conversions,
          roas: Math.round(roas * 100) / 100,
          cpa: Math.round(cpa * 100) / 100,
          cpm: Math.round(cpm * 100) / 100,
          ctr: Math.round(ctr * 100) / 100,
          cvr: Math.round(cvr * 100) / 100,
          aov: Math.round(aov * 100) / 100,
        })
      }
    }
  }
  
  return metrics
}

// Generate creative assets
export function generateCreativeAssets(clientId: string): Omit<CreativeAsset, 'id' | 'created_at'>[] {
  const assets: Omit<CreativeAsset, 'id' | 'created_at'>[] = []
  
  for (let i = 0; i < adCreatives.length; i++) {
    const creative = adCreatives[i]
    const baseSpend = randomVariance(5000 + i * 2000, 0.5)
    const roas = randomVariance(3.2, 0.4)
    const revenue = baseSpend * roas
    const ctr = randomVariance(1.5, 0.4)
    const impressions = Math.round(baseSpend / 25 * 1000)
    const clicks = Math.round(impressions * ctr / 100)
    
    // Determine fatigue status based on performance
    const status = roas < 2 ? 'fatigued' : roas < 2.5 ? 'active' : 'active'
    
    assets.push({
      client_id: clientId,
      ad_id: `ad_${clientId.slice(0, 8)}_${String(i + 1).padStart(3, '0')}`,
      channel: 'meta',
      thumbnail_url: `https://placehold.co/400x400/1a1a2e/ffffff?text=${encodeURIComponent(creative.type.toUpperCase())}`,
      creative_type: creative.type,
      hook_type: creative.hook,
      offer_type: Math.random() > 0.5 ? 'discount' : 'value-prop',
      first_seen: format(subDays(new Date(), Math.floor(Math.random() * 60) + 30), 'yyyy-MM-dd'),
      last_seen: format(new Date(), 'yyyy-MM-dd'),
      total_spend: Math.round(baseSpend * 100) / 100,
      total_revenue: Math.round(revenue * 100) / 100,
      total_impressions: impressions,
      total_clicks: clicks,
      status,
    })
  }
  
  return assets
}

// Generate MER snapshots
export function generateMERSnapshots(clientId: string, days: number = 90): Omit<MERSnapshot, 'id'>[] {
  const snapshots: Omit<MERSnapshot, 'id'>[] = []
  const today = new Date()
  const startDate = subDays(today, days)
  const dateRange = eachDayOfInterval({ start: startDate, end: today })
  
  const client = demoClients.find(c => c.id === clientId)
  const targetMer = client?.target_mer || 3.5
  const marginPct = client?.target_contribution_margin_pct || 35
  
  for (const date of dateRange) {
    const dateStr = format(date, 'yyyy-MM-dd')
    const dayOfWeek = date.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    
    // Calculate base values with some variance
    const baseSpend = randomVariance(8000, 0.15) * (isWeekend ? 1.1 : 1.0)
    const baseMer = randomVariance(targetMer, 0.12)
    const revenue = baseSpend * baseMer
    const contributionMargin = (revenue * marginPct / 100) - baseSpend
    const amer = baseMer * 0.85 // Adjusted MER (removing estimated organic)
    
    snapshots.push({
      client_id: clientId,
      date: dateStr,
      total_spend: Math.round(baseSpend * 100) / 100,
      total_revenue: Math.round(revenue * 100) / 100,
      mer: Math.round(baseMer * 100) / 100,
      amer: Math.round(amer * 100) / 100,
      contribution_margin: Math.round(contributionMargin * 100) / 100,
    })
  }
  
  return snapshots
}

// Aggregate helpers for in-memory data
export function aggregateDailyMetrics(metrics: Omit<DailyMetric, 'id' | 'created_at'>[], dateRange?: { start: Date; end: Date }) {
  let filtered = metrics
  
  if (dateRange) {
    const startStr = format(dateRange.start, 'yyyy-MM-dd')
    const endStr = format(dateRange.end, 'yyyy-MM-dd')
    filtered = metrics.filter(m => m.date >= startStr && m.date <= endStr)
  }
  
  const totalSpend = filtered.reduce((sum, m) => sum + m.spend, 0)
  const totalRevenue = filtered.reduce((sum, m) => sum + m.revenue, 0)
  const totalImpressions = filtered.reduce((sum, m) => sum + m.impressions, 0)
  const totalClicks = filtered.reduce((sum, m) => sum + m.clicks, 0)
  const totalConversions = filtered.reduce((sum, m) => sum + m.conversions, 0)
  
  return {
    spend: totalSpend,
    revenue: totalRevenue,
    impressions: totalImpressions,
    clicks: totalClicks,
    conversions: totalConversions,
    roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
    cpa: totalConversions > 0 ? totalSpend / totalConversions : 0,
    cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
    ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
    cvr: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
    aov: totalConversions > 0 ? totalRevenue / totalConversions : 0,
  }
}

export function groupByChannel(metrics: Omit<DailyMetric, 'id' | 'created_at'>[]) {
  const channels: Record<string, typeof metrics> = {}
  
  for (const metric of metrics) {
    if (!channels[metric.channel]) {
      channels[metric.channel] = []
    }
    channels[metric.channel].push(metric)
  }
  
  return Object.entries(channels).map(([channel, data]) => ({
    channel,
    ...aggregateDailyMetrics(data),
  }))
}

export function groupByCampaign(metrics: Omit<DailyMetric, 'id' | 'created_at'>[]) {
  const campaigns: Record<string, typeof metrics> = {}
  
  for (const metric of metrics) {
    const key = `${metric.channel}:${metric.campaign_id}`
    if (!campaigns[key]) {
      campaigns[key] = []
    }
    campaigns[key].push(metric)
  }
  
  return Object.entries(campaigns).map(([key, data]) => {
    const [channel, campaignId] = key.split(':')
    return {
      channel,
      campaignId,
      campaignName: data[0].campaign_name,
      ...aggregateDailyMetrics(data),
    }
  })
}

export function groupByDate(metrics: Omit<DailyMetric, 'id' | 'created_at'>[]) {
  const dates: Record<string, typeof metrics> = {}
  
  for (const metric of metrics) {
    if (!dates[metric.date]) {
      dates[metric.date] = []
    }
    dates[metric.date].push(metric)
  }
  
  return Object.entries(dates)
    .map(([date, data]) => ({
      date,
      ...aggregateDailyMetrics(data),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
