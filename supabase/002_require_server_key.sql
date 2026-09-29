-- Locks the ai_outreach_* functions to this app's server.
--
-- Before this, the functions were callable with the project's public anon key, which is also shipped in the
-- portfolio and Agbada Luxe frontends, so anyone could list leads or edit the do-not-contact list directly.
-- Now each function first calls ai_outreach_require_key(), which checks the x-ai-outreach-key request header
-- (PostgREST exposes request headers to SQL) against a SHA-256 hash stored in ai_outreach_config. Only the server
-- holds the key (AI_OUTREACH_DB_KEY). Function signatures are unchanged.
--
-- After applying, store the hash of your key:
--   insert into ai_outreach_config (key, value)
--   values ('server_key_sha256', encode(sha256(convert_to('<your key>', 'UTF8')), 'hex'))
--   on conflict (key) do update set value = excluded.value;

create table if not exists ai_outreach_config (
  key text primary key,
  value text not null
);
alter table ai_outreach_config enable row level security;
revoke all on ai_outreach_config from anon, authenticated;

create or replace function ai_outreach_require_key()
returns void
language plpgsql stable security definer set search_path = public
as $$
declare
  v_headers json;
  v_given text;
  v_expected text;
begin
  begin
    v_headers := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    v_headers := null;
  end;
  v_given := v_headers ->> 'x-ai-outreach-key';
  select value into v_expected from ai_outreach_config where key = 'server_key_sha256';
  if v_expected is null or v_given is null or encode(sha256(convert_to(v_given, 'UTF8')), 'hex') <> v_expected then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
end $$;

revoke all on function ai_outreach_require_key() from public, anon, authenticated;

-- Add the guard as the first statement of every ai_outreach_* RPC (idempotent: skips functions that have it).
do $$
declare
  f record;
  def text;
begin
  for f in
    select p.oid, p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'ai\_outreach\_%'
      and p.proname not in ('ai_outreach_require_key', 'ai_outreach_status_rank')
      and p.prosecdef
  loop
    def := pg_get_functiondef(f.oid);
    if position('ai_outreach_require_key()' in def) > 0 then
      continue;
    end if;
    -- The body of each function starts at the first BEGIN after AS $function$
    def := regexp_replace(def, '(\$function\$.*?\mBEGIN\M)', E'\\1\n  PERFORM ai_outreach_require_key();', 'is');
    execute def;
  end loop;
end $$;
