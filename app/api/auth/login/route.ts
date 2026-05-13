import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import {
  AuthError,
  authErrorResponse,
  createSessionToken,
  normalizeEmail,
  publicAuthUser,
  setSessionCookie,
  verifyPassword,
  type AppRole
} from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(String(body?.email || ""));
    const password = String(body?.password || "");

    if (!email || !password) {
      return NextResponse.json({ message: "メールアドレスとパスワードを入力してください" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        passwordHash: true
      }
    });

    if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ message: "メールアドレスまたはパスワードが正しくありません" }, { status: 401 });
    }

    const authUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as AppRole
    };
    const response = NextResponse.json({ user: publicAuthUser(authUser) });
    setSessionCookie(response, createSessionToken(authUser));
    return response;
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    return NextResponse.json({ message: "ログインに失敗しました" }, { status: 500 });
  }
}
