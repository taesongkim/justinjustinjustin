import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "app/data/notifications.json");

type Notification = {
  id: string;
  category: string;
  message: string;
  timestamp: string;
};

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD;
}

function authError() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

async function readNotifications(): Promise<Notification[]> {
  const raw = await fs.readFile(DATA_PATH, "utf-8");
  return JSON.parse(raw);
}

async function writeNotifications(data: Notification[]) {
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2), "utf-8");
}

// GET — return all notifications (requires password header)
export async function GET(req: NextRequest) {
  const pw = req.headers.get("x-admin-password");
  if (!getAdminPassword() || pw !== getAdminPassword()) return authError();
  const notifications = await readNotifications();
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

  const notifications = await readNotifications();
  const maxId = notifications.reduce((max, n) => Math.max(max, parseInt(n.id, 10)), 0);
  const ts = new Date(timestamp).toISOString();

  const newEntry: Notification = {
    id: String(maxId + 1),
    category,
    message,
    timestamp: ts,
  };

  notifications.unshift(newEntry);
  await writeNotifications(notifications);
  return NextResponse.json({ ok: true, entry: newEntry });
}

// DELETE — remove a notification by id
export async function DELETE(req: NextRequest) {
  const pw = req.headers.get("x-admin-password");
  if (!getAdminPassword() || pw !== getAdminPassword()) return authError();

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const notifications = await readNotifications();
  const filtered = notifications.filter((n) => n.id !== String(id));

  if (filtered.length === notifications.length) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await writeNotifications(filtered);
  return NextResponse.json({ ok: true });
}
