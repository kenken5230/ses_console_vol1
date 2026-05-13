import { NextResponse } from "next/server";
import { AuthError, authErrorResponse, consumePasswordResetToken } from "../../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = String(body?.token || "");
    const password = String(body?.password || "");

    if (!token || !password) {
      return NextResponse.json({ message: "再設定tokenと新しいパスワードを入力してください" }, { status: 400 });
    }

    await consumePasswordResetToken(token, password);

    return NextResponse.json({ message: "パスワードを再設定しました" });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    return NextResponse.json({ message: "パスワード再設定に失敗しました" }, { status: 500 });
  }
}

