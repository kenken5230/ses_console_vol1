import { NextResponse } from "next/server";
import { clearSessionCookie } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ message: "ログアウトしました" });
  clearSessionCookie(response);
  return response;
}

