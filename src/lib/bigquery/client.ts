import { BigQuery } from '@google-cloud/bigquery'

let client: BigQuery | null = null

export function getBigQueryClient(): BigQuery {
  if (client) return client

  const projectId = process.env.GOOGLE_CLOUD_PROJECT
  if (!projectId) {
    throw new Error('GOOGLE_CLOUD_PROJECT environment variable is required for BigQuery mode')
  }

  // Support inline JSON credentials (for Vercel deployment)
  const credentialsJson = process.env.BIGQUERY_CREDENTIALS_JSON
  if (credentialsJson) {
    const credentials = JSON.parse(credentialsJson)
    client = new BigQuery({ projectId, credentials })
  } else {
    // Falls back to GOOGLE_APPLICATION_CREDENTIALS env var or ADC
    client = new BigQuery({ projectId })
  }

  return client
}

export const DATASET_ANALYTICS = process.env.BIGQUERY_DATASET_ANALYTICS || 'analytics'
export const DATASET_CONFIG = process.env.BIGQUERY_DATASET_CONFIG || 'config'
