// Real Supabase client factory. Imported ONLY from server/index.ts (the
// production entry point) — never from store.ts, which takes an
// RpcClient as a constructor argument instead so it can be unit-tested
// with an in-memory stand-in and never needs @supabase/supabase-js
// installed just to run the test suite.
//
// Only the public anon key is ever used here — never the service-role
// key. See supabase/migration.sql for why that's safe: every table has
// RLS enabled with no policies, so anon can't touch a table directly no
// matter what; it can only call the specific SECURITY DEFINER functions
// this app is written against.

import type { RpcClient } from './store.ts';

export async function createSupabaseRpcClient(): Promise<RpcClient> {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_ANON_KEY must both be set (see .env.example). ' +
        'This app has no other storage backend.',
    );
  }

  // Dynamically imported (this project is ESM) so a missing/failed install
  // of @supabase/supabase-js produces one clear error here, at the one
  // place that needs it, rather than crashing at module-load time
  // everywhere that transitively imports this file.
  let createClient: any;
  try {
    ({ createClient } = await import('@supabase/supabase-js'));
  } catch (e: any) {
    throw new Error(`@supabase/supabase-js is not installed. Run "npm install" first. (${e.message || e})`);
  }

  const client = createClient(url, anonKey, {
    auth: { persistSession: false },
  });

  return {
    async rpc(fn: string, params?: Record<string, any>) {
      const { data, error } = await client.rpc(fn, params ?? {});
      return { data: data ?? null, error: error ? { message: error.message } : null };
    },
  };
}
