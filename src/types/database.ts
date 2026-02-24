export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string
          name: string
          meta_account_id: string | null
          google_account_id: string | null
          northbeam_api_key: string | null
          northbeam_client_id: string | null
          shopify_store_url: string | null
          target_mer: number | null
          target_contribution_margin_pct: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          meta_account_id?: string | null
          google_account_id?: string | null
          northbeam_api_key?: string | null
          northbeam_client_id?: string | null
          shopify_store_url?: string | null
          target_mer?: number | null
          target_contribution_margin_pct?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          meta_account_id?: string | null
          google_account_id?: string | null
          northbeam_api_key?: string | null
          northbeam_client_id?: string | null
          shopify_store_url?: string | null
          target_mer?: number | null
          target_contribution_margin_pct?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      daily_metrics: {
        Row: {
          id: string
          client_id: string
          date: string
          channel: string
          campaign_id: string | null
          campaign_name: string | null
          adset_id: string | null
          adset_name: string | null
          ad_id: string | null
          ad_name: string | null
          spend: number
          revenue: number
          impressions: number
          clicks: number
          conversions: number
          roas: number | null
          cpa: number | null
          cpm: number | null
          ctr: number | null
          cvr: number | null
          aov: number | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          date: string
          channel: string
          campaign_id?: string | null
          campaign_name?: string | null
          adset_id?: string | null
          adset_name?: string | null
          ad_id?: string | null
          ad_name?: string | null
          spend?: number
          revenue?: number
          impressions?: number
          clicks?: number
          conversions?: number
          roas?: number | null
          cpa?: number | null
          cpm?: number | null
          ctr?: number | null
          cvr?: number | null
          aov?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          date?: string
          channel?: string
          campaign_id?: string | null
          campaign_name?: string | null
          adset_id?: string | null
          adset_name?: string | null
          ad_id?: string | null
          ad_name?: string | null
          spend?: number
          revenue?: number
          impressions?: number
          clicks?: number
          conversions?: number
          roas?: number | null
          cpa?: number | null
          cpm?: number | null
          ctr?: number | null
          cvr?: number | null
          aov?: number | null
          created_at?: string
        }
      }
      creative_assets: {
        Row: {
          id: string
          client_id: string
          ad_id: string
          channel: string
          thumbnail_url: string | null
          creative_type: string | null
          hook_type: string | null
          offer_type: string | null
          first_seen: string | null
          last_seen: string | null
          total_spend: number
          total_revenue: number
          total_impressions: number
          total_clicks: number
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          ad_id: string
          channel: string
          thumbnail_url?: string | null
          creative_type?: string | null
          hook_type?: string | null
          offer_type?: string | null
          first_seen?: string | null
          last_seen?: string | null
          total_spend?: number
          total_revenue?: number
          total_impressions?: number
          total_clicks?: number
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          ad_id?: string
          channel?: string
          thumbnail_url?: string | null
          creative_type?: string | null
          hook_type?: string | null
          offer_type?: string | null
          first_seen?: string | null
          last_seen?: string | null
          total_spend?: number
          total_revenue?: number
          total_impressions?: number
          total_clicks?: number
          status?: string
          created_at?: string
        }
      }
      mer_snapshots: {
        Row: {
          id: string
          client_id: string
          date: string
          total_spend: number | null
          total_revenue: number | null
          mer: number | null
          amer: number | null
          contribution_margin: number | null
        }
        Insert: {
          id?: string
          client_id: string
          date: string
          total_spend?: number | null
          total_revenue?: number | null
          mer?: number | null
          amer?: number | null
          contribution_margin?: number | null
        }
        Update: {
          id?: string
          client_id?: string
          date?: string
          total_spend?: number | null
          total_revenue?: number | null
          mer?: number | null
          amer?: number | null
          contribution_margin?: number | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Convenience types
export type Client = Database['public']['Tables']['clients']['Row']
export type DailyMetric = Database['public']['Tables']['daily_metrics']['Row']
export type CreativeAsset = Database['public']['Tables']['creative_assets']['Row']
export type MERSnapshot = Database['public']['Tables']['mer_snapshots']['Row']

// Insert types
export type ClientInsert = Database['public']['Tables']['clients']['Insert']
export type DailyMetricInsert = Database['public']['Tables']['daily_metrics']['Insert']
export type CreativeAssetInsert = Database['public']['Tables']['creative_assets']['Insert']
export type MERSnapshotInsert = Database['public']['Tables']['mer_snapshots']['Insert']
