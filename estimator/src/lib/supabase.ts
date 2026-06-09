import { createClient } from '@supabase/supabase-js'

// Credentials hardcoded directly — the anon key is a public browser credential
// designed for client-side use and scoped by Row Level Security. Using hardcoded
// values avoids any risk of Vercel env vars being misconfigured or missing.
const SUPABASE_URL = 'https://kvcaurciegkqqpytmgur.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2Y2F1cmNpZWdrcXFweXRtZ3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NTczMjksImV4cCI6MjA5NjMzMzMyOX0.GbMO4N0BypzdrO4Rv2aPhoHL2ZbOuKPMq6lhJuIn57w'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const SUPABASE_CONFIGURED = true

export type Client = {
  id: string
  user_id: string
  name: string
  company: string | null
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
  deposit_amount: number
  deposit_paid: boolean
  deposit_paid_at: string | null
  deposit_method: string | null
  balance_paid: boolean
  balance_paid_at: string | null
  balance_method: string | null
  created_at: string
  updated_at: string
}

export type ChangeOrder = {
  id: string
  user_id: string
  client_id: string | null
  estimate_id: string | null
  change_number: string | null
  title: string
  description: string | null
  reason: string | null
  amount_change: number
  timeline_impact: string | null
  status: 'pending' | 'approved' | 'declined' | 'completed'
  approved_at: string | null
  approved_by: string | null
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
  trial_expires_at: string | null
  trial_reminder_sent: boolean
  role: 'user' | 'admin'
  active_session_id: string | null
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
