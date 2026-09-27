-- AI Outreach — Supabase schema + RPC layer
--
-- Security model (matches the pattern already used for AGBADA-LUXE in this
-- same project): every table has Row Level Security ENABLED with NO
-- policies defined on it at all. With RLS on and zero policies, Postgres
-- denies every row to every role that is subject to RLS — including
-- `anon` and `authenticated` — by default, full stop. There is deliberately
-- no "anon can read/write with condition X" policy anywhere in this file.
--
-- The only way in is through the SECURITY DEFINER functions below, each of
-- which is owned by the role that runs this migration (in Supabase, that's
-- the `postgres` role via the SQL editor/migration runner, which has
-- BYPASSRLS) and each of which does exactly one narrow, named thing. EXECUTE
-- on those specific functions is granted to `anon`. Direct table access via
-- anon (SELECT/INSERT/UPDATE/DELETE straight against the table) is both
-- blocked by RLS and explicitly revoked below for defense in depth.
--
-- Practically: this app's server holds only SUPABASE_ANON_KEY, never the
-- service-role key. If that anon key ever leaked (logged, committed,
-- exposed by a hosting misconfiguration), the blast radius is limited to
-- calling these specific functions — never an arbitrary SQL query against
-- the tables.
--
-- IMPORTANT for whoever applies this: run it as a role that owns/creates
-- these functions with BYPASSRLS (the Supabase SQL editor / migration
-- runner does this by default via the `postgres` role). If a function ever
-- ends up owned by a non-bypassing role, RLS-with-no-policies will make it
-- return zero rows even to itself, since SECURITY DEFINER only helps if the
-- definer can actually see the rows.

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ai_outreach_businesses (
  id BIGSERIAL PRIMARY KEY,
  domain TEXT NOT NULL UNIQUE,
  name TEXT,
  website TEXT NOT NULL,
  city TEXT,
  country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_outreach_leads (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT NOT NULL REFERENCES ai_outreach_businesses(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('manual_url', 'csv', 'auto_search')),
  status TEXT NOT NULL,
  error TEXT,
  evidence JSONB,
  draft_subject TEXT,
  draft_body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_outreach_leads_business ON ai_outreach_leads(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_outreach_leads_status ON ai_outreach_leads(status);

-- The permanent, cross-search, cross-city, cross-country coverage record.
-- One row per business domain, forever. This is what makes duplicate
-- detection work as the user expands across many markets over time.
CREATE TABLE IF NOT EXISTS ai_outreach_registry (
  domain TEXT PRIMARY KEY,
  business_name TEXT,
  status TEXT NOT NULL,
  city TEXT,
  country TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_action_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_outreach_searches (
  id BIGSERIAL PRIMARY KEY,
  city TEXT NOT NULL,
  category TEXT NOT NULL,
  normalized_key TEXT NOT NULL,
  result_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_outreach_searches_key ON ai_outreach_searches(normalized_key);

-- The permanent do-not-contact list. On purpose, there is no RPC anywhere
-- in this file that removes a row from this table — an opt-out, once
-- recorded, cannot be undone through the app's API surface.
CREATE TABLE IF NOT EXISTS ai_outreach_optouts (
  email TEXT PRIMARY KEY,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- RLS: enabled, zero policies, on every table.
-- ---------------------------------------------------------------------

ALTER TABLE ai_outreach_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_outreach_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_outreach_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_outreach_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_outreach_optouts ENABLE ROW LEVEL SECURITY;

-- Belt-and-suspenders: explicitly revoke direct table privileges from the
-- roles a hosted app's connection could plausibly use, even though RLS
-- with no policies already blocks every row.
REVOKE ALL ON ai_outreach_businesses FROM anon, authenticated;
REVOKE ALL ON ai_outreach_leads FROM anon, authenticated;
REVOKE ALL ON ai_outreach_registry FROM anon, authenticated;
REVOKE ALL ON ai_outreach_searches FROM anon, authenticated;
REVOKE ALL ON ai_outreach_optouts FROM anon, authenticated;

-- ---------------------------------------------------------------------
-- Helper: status rank, used to decide the registry's "most advanced
-- action" so a lead that was already 'sent' never gets silently
-- downgraded back to 'seen' just because the domain got crawled again
-- from a later search.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION ai_outreach_status_rank(p_status TEXT)
RETURNS INT
LANGUAGE SQL IMMUTABLE
AS $$
  SELECT CASE p_status
    WHEN 'crawling' THEN 0
    WHEN 'crawl_error' THEN 1
    WHEN 'drafting' THEN 1
    WHEN 'draft_error' THEN 1
    WHEN 'duplicate' THEN 1
    WHEN 'opted_out' THEN 2
    WHEN 'drafted' THEN 3
    WHEN 'rejected' THEN 4
    WHEN 'approved' THEN 5
    WHEN 'sent' THEN 6
    ELSE 0
  END;
$$;

-- ---------------------------------------------------------------------
-- RPC functions. Every one is SECURITY DEFINER with a pinned search_path
-- (standard Supabase hardening against search_path hijacking), validates
-- its own inputs, and is granted to `anon` individually and by name —
-- nothing broader is ever granted.
-- ---------------------------------------------------------------------

-- Businesses ------------------------------------------------------------

CREATE OR REPLACE FUNCTION ai_outreach_upsert_business(
  p_domain TEXT,
  p_website TEXT,
  p_name TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_domain TEXT := lower(trim(p_domain));
  v_row ai_outreach_businesses;
BEGIN
  IF v_domain IS NULL OR v_domain = '' THEN
    RAISE EXCEPTION 'domain is required';
  END IF;
  IF p_website IS NULL OR trim(p_website) = '' THEN
    RAISE EXCEPTION 'website is required';
  END IF;

  INSERT INTO ai_outreach_businesses (domain, website, name, city, country)
  VALUES (v_domain, p_website, NULLIF(trim(p_name), ''), NULLIF(trim(p_city), ''), NULLIF(trim(p_country), ''))
  ON CONFLICT (domain) DO UPDATE SET
    name = COALESCE(ai_outreach_businesses.name, EXCLUDED.name),
    city = COALESCE(ai_outreach_businesses.city, EXCLUDED.city),
    country = COALESCE(ai_outreach_businesses.country, EXCLUDED.country)
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'domain', v_row.domain,
    'website', v_row.website,
    'name', v_row.name,
    'city', v_row.city,
    'country', v_row.country,
    'createdAt', v_row.created_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION ai_outreach_upsert_business(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;

-- Leads -------------------------------------------------------------------

CREATE OR REPLACE FUNCTION ai_outreach_create_lead(
  p_business_id BIGINT,
  p_source TEXT,
  p_status TEXT
) RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id BIGINT;
BEGIN
  IF p_source NOT IN ('manual_url', 'csv', 'auto_search') THEN
    RAISE EXCEPTION 'invalid source: %', p_source;
  END IF;
  INSERT INTO ai_outreach_leads (business_id, source, status)
  VALUES (p_business_id, p_source, p_status)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION ai_outreach_create_lead(BIGINT, TEXT, TEXT) TO anon;

-- p_patch is a JSON object; only keys actually present are changed, mirroring
-- the app's "partial patch" semantics (so a field can be explicitly set to
-- null, e.g. clearing `error`, without touching fields the caller omitted).
-- Recognized keys: status, error, evidence, draftSubject, draftBody.
CREATE OR REPLACE FUNCTION ai_outreach_update_lead(
  p_lead_id BIGINT,
  p_patch JSONB
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  IF p_patch ? 'status' THEN
    v_status := p_patch->>'status';
    IF v_status NOT IN ('crawling','crawl_error','drafting','draft_error','drafted','duplicate','opted_out','approved','rejected','sent') THEN
      RAISE EXCEPTION 'invalid status: %', v_status;
    END IF;
  END IF;

  UPDATE ai_outreach_leads SET
    status = CASE WHEN p_patch ? 'status' THEN p_patch->>'status' ELSE status END,
    error = CASE WHEN p_patch ? 'error' THEN p_patch->>'error' ELSE error END,
    evidence = CASE WHEN p_patch ? 'evidence' THEN p_patch->'evidence' ELSE evidence END,
    draft_subject = CASE WHEN p_patch ? 'draftSubject' THEN p_patch->>'draftSubject' ELSE draft_subject END,
    draft_body = CASE WHEN p_patch ? 'draftBody' THEN p_patch->>'draftBody' ELSE draft_body END,
    updated_at = now()
  WHERE id = p_lead_id;

  RETURN ai_outreach_get_lead(p_lead_id);
END;
$$;

GRANT EXECUTE ON FUNCTION ai_outreach_update_lead(BIGINT, JSONB) TO anon;

CREATE OR REPLACE FUNCTION ai_outreach_get_lead(p_lead_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', l.id,
    'businessId', l.business_id,
    'domain', b.domain,
    'website', b.website,
    'businessName', b.name,
    'city', b.city,
    'country', b.country,
    'source', l.source,
    'status', l.status,
    'error', l.error,
    'evidence', l.evidence,
    'draftSubject', l.draft_subject,
    'draftBody', l.draft_body,
    'createdAt', l.created_at,
    'updatedAt', l.updated_at
  ) INTO v_result
  FROM ai_outreach_leads l
  JOIN ai_outreach_businesses b ON b.id = l.business_id
  WHERE l.id = p_lead_id;

  RETURN v_result; -- NULL if not found
END;
$$;

GRANT EXECUTE ON FUNCTION ai_outreach_get_lead(BIGINT) TO anon;

CREATE OR REPLACE FUNCTION ai_outreach_list_leads(p_status TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(row_data ORDER BY (row_data->>'id')::BIGINT DESC), '[]'::JSONB)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'id', l.id,
      'businessId', l.business_id,
      'domain', b.domain,
      'website', b.website,
      'businessName', b.name,
      'city', b.city,
      'country', b.country,
      'source', l.source,
      'status', l.status,
      'error', l.error,
      'evidence', l.evidence,
      'draftSubject', l.draft_subject,
      'draftBody', l.draft_body,
      'createdAt', l.created_at,
      'updatedAt', l.updated_at
    ) AS row_data
    FROM ai_outreach_leads l
    JOIN ai_outreach_businesses b ON b.id = l.business_id
    WHERE p_status IS NULL OR l.status = p_status
  ) t;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION ai_outreach_list_leads(TEXT) TO anon;

-- Registry (permanent coverage record) ------------------------------------

CREATE OR REPLACE FUNCTION ai_outreach_check_registry(p_domain TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_row ai_outreach_registry;
BEGIN
  SELECT * INTO v_row FROM ai_outreach_registry WHERE domain = lower(trim(p_domain));
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object(
    'domain', v_row.domain,
    'businessName', v_row.business_name,
    'status', v_row.status,
    'city', v_row.city,
    'country', v_row.country,
    'firstSeenAt', v_row.first_seen_at,
    'lastActionAt', v_row.last_action_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION ai_outreach_check_registry(TEXT) TO anon;

-- Records an action against a domain, only ever moving the status FORWARD
-- (by ai_outreach_status_rank) — a business already 'sent' cannot be
-- downgraded back to 'crawling' just because it was crawled again from a
-- different search later.
CREATE OR REPLACE FUNCTION ai_outreach_record_action(
  p_domain TEXT,
  p_status TEXT,
  p_business_name TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_domain TEXT := lower(trim(p_domain));
  v_existing ai_outreach_registry;
  v_new_status TEXT;
  v_row ai_outreach_registry;
BEGIN
  IF v_domain IS NULL OR v_domain = '' THEN
    RAISE EXCEPTION 'domain is required';
  END IF;
  IF p_status NOT IN ('crawling','crawl_error','drafting','draft_error','drafted','duplicate','opted_out','approved','rejected','sent') THEN
    RAISE EXCEPTION 'invalid status: %', p_status;
  END IF;

  SELECT * INTO v_existing FROM ai_outreach_registry WHERE domain = v_domain;

  IF NOT FOUND THEN
    INSERT INTO ai_outreach_registry (domain, business_name, status, city, country)
    VALUES (v_domain, NULLIF(trim(p_business_name), ''), p_status, NULLIF(trim(p_city), ''), NULLIF(trim(p_country), ''))
    RETURNING * INTO v_row;
  ELSE
    v_new_status := CASE
      WHEN ai_outreach_status_rank(p_status) >= ai_outreach_status_rank(v_existing.status) THEN p_status
      ELSE v_existing.status
    END;
    UPDATE ai_outreach_registry SET
      status = v_new_status,
      business_name = COALESCE(NULLIF(trim(p_business_name), ''), business_name),
      city = COALESCE(NULLIF(trim(p_city), ''), city),
      country = COALESCE(NULLIF(trim(p_country), ''), country),
      last_action_at = now()
    WHERE domain = v_domain
    RETURNING * INTO v_row;
  END IF;

  RETURN jsonb_build_object(
    'domain', v_row.domain,
    'businessName', v_row.business_name,
    'status', v_row.status,
    'city', v_row.city,
    'country', v_row.country,
    'firstSeenAt', v_row.first_seen_at,
    'lastActionAt', v_row.last_action_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION ai_outreach_record_action(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;

-- Searches (auto-search coverage) ------------------------------------------

CREATE OR REPLACE FUNCTION ai_outreach_find_prior_search(p_city TEXT, p_category TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_key TEXT := lower(trim(p_city)) || '::' || lower(trim(p_category));
  v_row ai_outreach_searches;
BEGIN
  SELECT * INTO v_row FROM ai_outreach_searches
  WHERE normalized_key = v_key
  ORDER BY id DESC LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object(
    'id', v_row.id, 'city', v_row.city, 'category', v_row.category,
    'createdAt', v_row.created_at, 'resultCount', v_row.result_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION ai_outreach_find_prior_search(TEXT, TEXT) TO anon;

CREATE OR REPLACE FUNCTION ai_outreach_record_search(
  p_city TEXT,
  p_category TEXT,
  p_result_count INT
) RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id BIGINT;
BEGIN
  INSERT INTO ai_outreach_searches (city, category, normalized_key, result_count)
  VALUES (p_city, p_category, lower(trim(p_city)) || '::' || lower(trim(p_category)), COALESCE(p_result_count, 0))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION ai_outreach_record_search(TEXT, TEXT, INT) TO anon;

CREATE OR REPLACE FUNCTION ai_outreach_list_searches()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(row_data ORDER BY (row_data->>'id')::BIGINT DESC), '[]'::JSONB)
  INTO v_result
  FROM (
    SELECT jsonb_build_object('id', id, 'city', city, 'category', category, 'createdAt', created_at, 'resultCount', result_count) AS row_data
    FROM ai_outreach_searches
  ) t;
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION ai_outreach_list_searches() TO anon;

-- Opt-outs (permanent do-not-contact list) ---------------------------------
--
-- SECURITY NOTE for whoever reviews this before applying: there is
-- intentionally no "remove opt-out" RPC. Once an email is added here via
-- ai_outreach_add_optout, nothing in this file's API surface can take it
-- back out — that's the point (an opt-out must actually stick). If a
-- correction is ever needed (e.g. someone added the wrong address), it has
-- to be done directly in the Supabase dashboard/SQL editor with elevated
-- access, not through the app.

CREATE OR REPLACE FUNCTION ai_outreach_add_optout(p_email TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_email TEXT := lower(trim(p_email));
BEGIN
  IF v_email IS NULL OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'invalid email';
  END IF;
  INSERT INTO ai_outreach_optouts (email) VALUES (v_email)
  ON CONFLICT (email) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION ai_outreach_add_optout(TEXT) TO anon;

CREATE OR REPLACE FUNCTION ai_outreach_check_optout(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM ai_outreach_optouts WHERE email = lower(trim(p_email)));
END;
$$;

GRANT EXECUTE ON FUNCTION ai_outreach_check_optout(TEXT) TO anon;

CREATE OR REPLACE FUNCTION ai_outreach_list_optouts()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(row_data ORDER BY row_data->>'requestedAt' DESC), '[]'::JSONB)
  INTO v_result
  FROM (
    SELECT jsonb_build_object('email', email, 'requestedAt', requested_at) AS row_data
    FROM ai_outreach_optouts
  ) t;
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION ai_outreach_list_optouts() TO anon;

-- Coverage stats ------------------------------------------------------------

CREATE OR REPLACE FUNCTION ai_outreach_coverage_stats()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_total INT;
  v_sent INT;
  v_drafted INT;
  v_rejected INT;
  v_searches JSONB;
  v_searches_run INT;
  v_cities INT;
BEGIN
  SELECT count(*) INTO v_total FROM ai_outreach_registry;
  SELECT count(*) INTO v_sent FROM ai_outreach_registry WHERE status = 'sent';
  SELECT count(*) INTO v_drafted FROM ai_outreach_registry WHERE status = 'drafted';
  SELECT count(*) INTO v_rejected FROM ai_outreach_registry WHERE status = 'rejected';
  v_searches := ai_outreach_list_searches();
  SELECT count(*) INTO v_searches_run FROM ai_outreach_searches;
  SELECT count(DISTINCT lower(city)) INTO v_cities FROM ai_outreach_searches;

  RETURN jsonb_build_object(
    'totalBusinesses', v_total,
    'sent', v_sent,
    'drafted', v_drafted,
    'rejected', v_rejected,
    'searchesRun', v_searches_run,
    'citiesCovered', v_cities,
    'searches', v_searches
  );
END;
$$;

GRANT EXECUTE ON FUNCTION ai_outreach_coverage_stats() TO anon;
