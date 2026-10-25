import { NextRequest, NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/actions/password-reset-actions";
import { checkPasswordResetRateLimit, getClientIpFromHeaders } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const clientIp = getClientIpFromHeaders(req.headers);

  try {
    const body = await req.json();
    const { email } = body || {};

    const rateCheck = checkPasswordResetRateLimit(clientIp, email);
    if (!rateCheck.success) {
      return NextResponse.json(
        {
          error: `Too many password reset requests. Please wait ${Math.ceil(
            rateCheck.resetInSeconds / 60
          )} minutes before trying again.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": rateCheck.resetInSeconds.toString(),
          },
        }
      );
    }

    const result = await requestPasswordReset(email);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
