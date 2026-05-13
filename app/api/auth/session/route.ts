import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, publicAuthUser } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserFromRequest(request);
    return NextResponse.json({ authenticated: Boolean(user), user: user ? publicAuthUser(user) : null });
  } catch {
    return NextResponse.json({ authenticated: false, user: null });
  }
}

