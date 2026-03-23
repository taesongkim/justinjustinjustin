import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD;
}

function authError() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

// GET — return all notifications (requires password header)
export async function GET(req: NextRequest) {
  const pw = req.headers.get("x-admin-password");
  if (!getAdminPassword() || pw !== getAdminPassword()) return authError();

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("timestamp", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Map id to string for backward compat with admin page
  const notifications = (data ?? []).map((n) => ({
    ...n,
    id: String(n.id),
  }));

  return NextResponse.json(notifications);
}

// POST — add a new notification
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { password, verify, category, message, timestamp } = body;

  const adminPassword = getAdminPassword();
  if (!adminPassword) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD not configured in environment." },
      { status: 500 }
    );
  }
  if (password !== adminPassword) return authError();

  // Password-only check (login gate)
  if (verify) return NextResponse.json({ ok: true });

  if (!category || !message || !timestamp) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const ts = new Date(timestamp).toISOString();

  const { data, error } = await supabase
    .from("notifications")
    .insert({ category, message, timestamp: ts })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const entry = { ...data, id: String(data.id) };
  return NextResponse.json({ ok: true, entry });
}

// DELETE — remove a notification by id
export async function DELETE(req: NextRequest) {
  const pw = req.headers.get("x-admin-password");
  if (!getAdminPassword() || pw !== getAdminPassword()) return authError();

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const { error, count } = await supabase
    .from("notifications")
    .delete()
    .eq("id", Number(id))
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // count may be undefined with .select(), check data length instead
  return NextResponse.json({ ok: true });
}
