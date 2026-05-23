// Shared auth gate for /api/cron/* endpoints. We require the caller
// to send `Authorization: Bearer <CRON_SECRET>` so random internet
// visitors can't trigger our crons (which send emails!).
//
// Vercel Cron sends the secret automatically when configured.
// External schedulers (cron-job.org) put it in the request headers.

import { NextResponse } from "next/server";

export function checkCronAuth(req: Request): NextResponse | null {
  const auth = req.headers.get("authorization") || "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json(
      { error: { code: "AUTH", message: "Unauthorized" } },
      { status: 401 },
    );
  }
  return null;
}
