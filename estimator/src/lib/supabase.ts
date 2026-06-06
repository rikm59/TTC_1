import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(url, key)

export type Client = {
  id: string
  user_id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  status: 'prospect' | 'active' | 'completed' | 'on-hold' | 'declined'
  source: string | null
  tags: string[] | null
  notes: string | null
  total_value: number
  created_at: string
  updated_at: string
}

export type ClientNote = {
  id: string
  client_id: string
  user_id: string
  body: string
  created_at: string
}

export type EstimateRecord = {
  id: string
  user_id: string
  client_id: string | null
  estimate_number: string | null
  project_type: string | null
  status: 'draft' | 'sent' | 'accepted' | 'declined'
  total_quote: number
  data: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export type Profile = {
  id: string
  full_name: string | null
  company_name: string | null
  plan: 'free' | 'pro' | 'enterprise'
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_status: string
  created_at: string
}
