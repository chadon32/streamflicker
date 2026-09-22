import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { resolveDeleteAccountCors } from '../_shared/deleteAccountCors.ts';

function jsonResponse(body: Record<string, string>, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request) => {
  const cors = resolveDeleteAccountCors(
    request,
    Deno.env.get('SUPABASE_DELETE_ACCOUNT_ALLOWED_ORIGINS'),
  );
  if (!cors.allowed) {
    if (cors.reason === 'configuration') {
      console.error('Supabase deletion function has no valid allowed-origin configuration.');
      return jsonResponse({ error: 'Account deletion is temporarily unavailable.' }, cors.status, cors.headers);
    }
    return jsonResponse({ error: 'This origin is not allowed.' }, cors.status, cors.headers);
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors.headers });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405, cors.headers);
  }

  const authorization = request.headers.get('Authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!authorization?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Authentication is required.' }, 401, cors.headers);
  }

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('Supabase deletion function is missing required server configuration.');
    return jsonResponse({ error: 'Account deletion is temporarily unavailable.' }, 500, cors.headers);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();

  if (userError || !userData.user) {
    return jsonResponse({ error: 'Your session is no longer valid. Please sign in again.' }, 401, cors.headers);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userData.user.id);

  if (deleteError) {
    console.error('Supabase account deletion failed.', {
      errorName: typeof deleteError === 'object' && deleteError && 'name' in deleteError
        ? String(deleteError.name)
        : 'SupabaseError',
    });
    return jsonResponse({ error: 'We could not delete your account. Please try again.' }, 500, cors.headers);
  }

  return new Response(null, { status: 204, headers: cors.headers });
});
