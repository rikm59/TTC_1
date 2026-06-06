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
  first_name: string | null
  last_name: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  business_type: string | null
  business_name: string | null
  company_name: string | null
  business_address: string | null
  business_city: string | null
  business_state: string | null
  business_zip: string | null
  business_phone: string | null
  business_email: string | null
  website: string | null
  business_logo_url: string | null
  business_details: string | null
  license_number: string | null
  insurance: string | null
  onboarding_complete: boolean
  plan: 'free' | 'pro' | 'enterprise'
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_status: string
  role: 'user' | 'admin'
  created_at: string
}

export type WebInterest = {
  id: string
  user_id: string
  business_name: string | null
  business_email: string | null
  business_phone: string | null
  business_address: string | null
  use_existing: boolean
  logo_url: string | null
  photo_urls: string[]
  style: string | null
  colors: string[]
  budget: string | null
  timeline: string | null
  details: string | null
  status: 'new' | 'contacted' | 'in_progress' | 'completed' | 'declined'
  created_at: string
}

export type AdminUser = {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  email_confirmed_at: string | null
  banned_until: string | null
  profile: Profile | null
}

export type AuditLog = {
  id: string
  admin_id: string
  admin_email: string
  action: string
  target_user_id: string | null
  target_email: string | null
  details: Record<string, unknown>
  created_at: string
}
