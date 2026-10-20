import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function responseError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
async function getClients(req: NextRequest) {
  if (!url || !anon || !serviceKey) throw new Error("Staff accounts need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and server-only SUPABASE_SERVICE_ROLE_KEY configured.");
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Please sign in again.");
  const userClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data.user) throw new Error("Your session is invalid. Please sign in again.");
  const user = data.user;
  if (user.app_metadata?.role === "staff") throw new Error("Only the shop owner can manage staff accounts.");
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return { user, admin };
}

export async function GET(req: NextRequest) {
  try {
    const { user, admin } = await getClients(req);
    const staff: any[] = [];
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
      if (error) throw error;
      for (const u of data.users) {
        if (u.app_metadata?.role === "staff" && u.app_metadata?.owner_id === user.id) {
          staff.push({ id: u.id, name: u.user_metadata?.name || "Staff member", email: u.email || "", permission: u.app_metadata?.permission || "cashier", active: !(u.banned_until && new Date(u.banned_until) > new Date()) });
        }
      }
      if (data.users.length < 100) break;
    }
    return NextResponse.json({ staff });
  } catch (e: any) { return responseError(e.message || "Could not list staff accounts.", /session|sign in|owner/i.test(e.message || "") ? 403 : 500); }
}

export async function POST(req: NextRequest) {
  try {
    const { user, admin } = await getClients(req);
    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const permission = body.permission === "manager" ? "manager" : "cashier";
    if (!name || !email || password.length < 8) return responseError("Enter a name, valid email, and password with at least 8 characters.");
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name }, app_metadata: { role: "staff", owner_id: user.id, permission } });
    if (error) return responseError(error.message, 400);
    return NextResponse.json({ id: data.user.id, message: "Staff account created." }, { status: 201 });
  } catch (e: any) { return responseError(e.message || "Could not create staff account.", /session|sign in|owner/i.test(e.message || "") ? 403 : 500); }
}

export async function PATCH(req: NextRequest) {
  try {
    const { user, admin } = await getClients(req);
    const body = await req.json();
    const id = String(body.id || "");
    if (!id || id === user.id) return responseError("Choose a valid staff account.");
    const { data, error } = await admin.auth.admin.getUserById(id);
    if (error || !data.user || data.user.app_metadata?.role !== "staff" || data.user.app_metadata?.owner_id !== user.id) return responseError("Staff account not found for this shop.", 404);
    const active = Boolean(body.active);
    const { error: updateError } = await admin.auth.admin.updateUserById(id, { ban_duration: active ? "none" : "876000h" });
    if (updateError) throw updateError;
    return NextResponse.json({ success: true });
  } catch (e: any) { return responseError(e.message || "Could not update staff account.", /session|sign in|owner/i.test(e.message || "") ? 403 : 500); }
}
