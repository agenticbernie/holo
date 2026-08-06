PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS products (
  sku_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  brand TEXT NOT NULL,
  selling_price REAL NOT NULL CHECK (selling_price > 0),
  stock INTEGER NOT NULL CHECK (stock >= 0),
  style_tags_json TEXT NOT NULL,
  target_audience_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS kocs (
  koc_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  bio TEXT NOT NULL,
  followers INTEGER NOT NULL CHECK (followers >= 0),
  average_views INTEGER NOT NULL CHECK (average_views >= 0),
  engagement_rate REAL NOT NULL CHECK (engagement_rate BETWEEN 0 AND 1),
  historical_conversion_rate REAL NOT NULL CHECK (historical_conversion_rate BETWEEN 0 AND 1),
  audience_profile_json TEXT NOT NULL,
  style_tags_json TEXT NOT NULL,
  is_cold_start INTEGER NOT NULL CHECK (is_cold_start IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS campaigns (
  campaign_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  objective TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  promotion_rate REAL NOT NULL CHECK (promotion_rate BETWEEN 0 AND 1),
  season TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'scheduled', 'running', 'completed', 'cancelled')),
  budget REAL NOT NULL CHECK (budget >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS campaign_results (
  result_id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
  sku_id TEXT NOT NULL REFERENCES products(sku_id) ON DELETE RESTRICT,
  koc_id TEXT NOT NULL REFERENCES kocs(koc_id) ON DELETE RESTRICT,
  views INTEGER NOT NULL CHECK (views >= 0),
  clicks INTEGER NOT NULL CHECK (clicks >= 0 AND clicks <= views),
  orders INTEGER NOT NULL CHECK (orders >= 0 AND orders <= clicks),
  returns INTEGER NOT NULL CHECK (returns >= 0 AND returns <= orders),
  revenue REAL NOT NULL CHECK (revenue >= 0),
  selling_price REAL NOT NULL CHECK (selling_price > 0),
  stock_before INTEGER NOT NULL CHECK (stock_before >= 0),
  stock_after INTEGER NOT NULL CHECK (stock_after >= 0 AND stock_after <= stock_before),
  spend REAL NOT NULL CHECK (spend >= 0),
  roi REAL NOT NULL,
  scenario TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dataset_jobs (
  job_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  parameters_json TEXT NOT NULL,
  fallback_used INTEGER NOT NULL CHECK (fallback_used IN (0, 1)),
  warnings_json TEXT NOT NULL,
  artifact_key TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_campaign_results_campaign_id ON campaign_results(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_results_sku_koc ON campaign_results(sku_id, koc_id);
CREATE INDEX IF NOT EXISTS idx_dataset_jobs_status ON dataset_jobs(status);
