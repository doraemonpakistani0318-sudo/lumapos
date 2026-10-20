import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// The app works locally if these are not configured. Never put a service-role key in the browser.
export const supabase = url && key ? createClient(url, key) : null;
