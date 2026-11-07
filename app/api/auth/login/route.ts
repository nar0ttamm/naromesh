import { NextRequest, NextResponse } from "next/server";
import { isValidPassword, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { password?: string };
    const password = body.password?.trim() ?? "";

    if (!password) {
      return NextResponse.json(
        { error: "Password is required." },
        { status: 400 }
      );
    }

    if (!isValidPassword(password)) {
      return NextResponse.json(
        { error: "Invalid password." },
        { status: 401 }
      );
    }

    await setSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[auth/login]", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
