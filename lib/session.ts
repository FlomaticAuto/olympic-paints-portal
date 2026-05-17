import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";

export type SessionData = {
  userId?: string;
  username?: string;
  fullName?: string;
  isAdmin?: boolean;
  mustChangePw?: boolean;
};

const password = process.env.SESSION_PASSWORD;
if (!password) {
  throw new Error("SESSION_PASSWORD must be set in the environment.");
}

export const sessionOptions: SessionOptions = {
  password,
  cookieName: "oly_portal_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 hours
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}
