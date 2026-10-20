import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// One-time local setup utility. Never import this into browser/client code.
const env = { ...process.env };
if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && !match[1].startsWith('#') && env[match[1]] === undefined) {
      env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.');
  process.exit(1);
}

const email = 'doraemonpakistani0318@gmail.com';
const password = '03186337654';
const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: listed, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listError) throw listError;
const existing = listed.users.find(user => user.email?.toLowerCase() === email);
if (existing) {
  const { error } = await supabase.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
    user_metadata: { ...(existing.user_metadata ?? {}), username: 'Doraemon', role: 'owner' },
  });
  if (error) throw error;
  console.log('Default owner account password reset successfully.');
} else {
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username: 'Doraemon', role: 'owner' },
  });
  if (error) throw error;
  console.log('Default owner account created successfully.');
}
console.log('Sign in with username Doraemon and the configured default password.');
console.log('Security: change the default password after first sign-in. This script resets it whenever you run it.');
