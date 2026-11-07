import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const SESSION_COOKIE = "im_session";
const SESSION_VALUE = "authenticated";

// Validate the plain-text password against env
export function isValidPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error("ADMIN_PASSWORD env variable is not set.");
  }
  return password === adminPassword;
}

// Set the session cookie (call from API route handler)
export async function setSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, SESSION_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7 // 7 days
  });
}

// Clear the session cookie (logout)
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// Check session from server component or route handler
export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value === SESSION_VALUE;
}

// Check session from middleware (uses NextRequest directly)
export function isAuthenticatedFromRequest(req: NextRequest): boolean {
  return req.cookies.get(SESSION_COOKIE)?.value === SESSION_VALUE;
}
