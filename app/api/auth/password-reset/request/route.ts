import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { AuthError, authErrorResponse, createPasswordResetToken, normalizeEmail } from "../../../../../lib/auth";
import { getSafeMailErrorDetails, sendPasswordResetEmail } from "../../../../../lib/mailer";

export const dynamic = "force-dynamic";

function buildResetUrl(request: Request, token: string) {
  const baseUrl = process.env.APP_URL || process.env.APP_BASE_URL || new URL(request.url).origin;
  const url = new URL("/", baseUrl);
  url.searchParams.set("resetToken", token);
  return url.toString();
}

function successResponse(message = "登録されている場合は、パスワード再設定メールを送信します") {
  return NextResponse.json({ message }, { status: 202 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(String(body?.email || ""));
    if (!email) return successResponse();

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, isActive: true }
    });

    if (!user || !user.isActive) return successResponse();

    const token = await createPasswordResetToken(user.id);
    const resetUrl = buildResetUrl(request, token);
    const sendResult = await sendPasswordResetEmail(user.email, resetUrl);

    if (!sendResult.sent) {
      console.error("Reset email was not sent", {
        reason: sendResult.reason,
        message: sendResult.missing?.length
          ? `Missing ${sendResult.missing.join(" / ")}`
          : "SMTP mailer returned without sending"
      });
    }

    if (!sendResult.sent && process.env.NODE_ENV !== "production") {
      return successResponse("パスワード再設定を受け付けました。SMTP設定が未完了のためメールは送信されていません。");
    }

    return successResponse();
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    console.error("Reset email request failed", getSafeMailErrorDetails(error));

    return NextResponse.json({ message: "パスワード再設定の受付に失敗しました" }, { status: 500 });
  }
}
