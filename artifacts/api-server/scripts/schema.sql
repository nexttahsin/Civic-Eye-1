-- Urban Eye Authority Dashboard — Supabase Schema
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- =============================================
-- 1. DEPARTMENTS
-- =============================================
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  jurisdiction_area TEXT NOT NULL DEFAULT '',
  issue_categories TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO departments (slug, name, name_bn, jurisdiction_area, issue_categories) VALUES
  ('dncc', 'Dhaka North City Corporation', 'ঢাকা উত্তর সিটি কর্পোরেশন', 'Dhaka North', ARRAY['pothole','garbage','waterlogging','street_light','electrical_failure','illegal_structure']),
  ('dscc', 'Dhaka South City Corporation', 'ঢাকা দক্ষিণ সিটি কর্পোরেশন', 'Dhaka South', ARRAY['pothole','garbage','waterlogging','street_light','illegal_structure']),
  ('wasa', 'Dhaka WASA', 'ঢাকা ওয়াসা', 'Dhaka', ARRAY['water_supply','sewage','waterlogging']),
  ('desco', 'DESCO', 'ডেসকো', 'Dhaka North', ARRAY['electrical_failure','street_light']),
  ('dpdc', 'DPDC', 'ডিপিডিসি', 'Dhaka South', ARRAY['electrical_failure','street_light']),
  ('rajuk', 'RAJUK', 'রাজউক', 'Dhaka', ARRAY['illegal_structure','road_damage'])
ON CONFLICT (slug) DO NOTHING;

-- =============================================
-- 2. CITIZENS (mirrors auth.users)
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  reputation_score NUMERIC NOT NULL DEFAULT 0,
  total_reports INT NOT NULL DEFAULT 0,
  verified_reports INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 3. AUTHORITY USERS
-- =============================================
CREATE TABLE IF NOT EXISTS authority_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  department_id UUID NOT NULL REFERENCES departments(id),
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'officer' CHECK (role IN ('admin','supervisor','officer')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 4. REPORTS
-- =============================================
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  department_id UUID NOT NULL REFERENCES departments(id),
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','under_review','in_progress','resolved','rejected')),
  urgency_score NUMERIC NOT NULL DEFAULT 5,
  address TEXT NOT NULL DEFAULT '',
  ward_name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  ai_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_flagged_fake BOOLEAN NOT NULL DEFAULT FALSE,
  image_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 5. REPORT IMAGES
-- =============================================
CREATE TABLE IF NOT EXISTS report_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  public_url TEXT NOT NULL,
  upload_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 6. AI ANALYSIS
-- =============================================
CREATE TABLE IF NOT EXISTS ai_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  is_aggregate BOOLEAN NOT NULL DEFAULT FALSE,
  summary TEXT NOT NULL DEFAULT '',
  severity TEXT,
  confidence NUMERIC,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 7. ACTIVITY LOGS
-- =============================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('citizen','authority','system')),
  actor_id TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 8. ROW LEVEL SECURITY
-- =============================================
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE authority_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Departments: public read
CREATE POLICY departments_public_read ON departments FOR SELECT USING (TRUE);

-- Authority users: can read own record
CREATE POLICY authority_users_self_read ON authority_users FOR SELECT
  USING (auth_user_id = auth.uid());

-- Reports: authority reads dept reports
CREATE POLICY reports_authority_read ON reports FOR SELECT
  USING (department_id IN (
    SELECT department_id FROM authority_users
    WHERE auth_user_id = auth.uid() AND is_active = TRUE
  ));

-- Reports: authority updates dept reports
CREATE POLICY reports_authority_update ON reports FOR UPDATE
  USING (department_id IN (
    SELECT department_id FROM authority_users
    WHERE auth_user_id = auth.uid() AND is_active = TRUE
  ));

-- Report images: authority reads via dept
CREATE POLICY report_images_authority_read ON report_images FOR SELECT
  USING (report_id IN (
    SELECT id FROM reports WHERE department_id IN (
      SELECT department_id FROM authority_users
      WHERE auth_user_id = auth.uid() AND is_active = TRUE
    )
  ));

-- AI analysis: authority reads via dept
CREATE POLICY ai_analysis_authority_read ON ai_analysis FOR SELECT
  USING (report_id IN (
    SELECT id FROM reports WHERE department_id IN (
      SELECT department_id FROM authority_users
      WHERE auth_user_id = auth.uid() AND is_active = TRUE
    )
  ));

-- Activity logs: authority reads via dept
CREATE POLICY activity_logs_authority_read ON activity_logs FOR SELECT
  USING (report_id IN (
    SELECT id FROM reports WHERE department_id IN (
      SELECT department_id FROM authority_users
      WHERE auth_user_id = auth.uid() AND is_active = TRUE
    )
  ));

-- Activity logs: authority inserts via dept
CREATE POLICY activity_logs_authority_insert ON activity_logs FOR INSERT
  WITH CHECK (report_id IN (
    SELECT id FROM reports WHERE department_id IN (
      SELECT department_id FROM authority_users
      WHERE auth_user_id = auth.uid() AND is_active = TRUE
    )
  ));

-- Citizens: authority can read profiles
CREATE POLICY users_authority_read ON users FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM authority_users
    WHERE auth_user_id = auth.uid() AND is_active = TRUE
  ));
