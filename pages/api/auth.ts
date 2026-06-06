// pages/api/auth.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { adminAuth, adminFirestore } from "../../firebase/admin";
import { hashSecret } from "../../utils/crypto";
import { setCookie } from "nookies"; // lightweight cookie helper

/**
 * POST   /api/auth   – exchange Google ID token for a session cookie.
 * DELETE /api/auth   – clear the session cookie (logout).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Missing token" });
    try {
      // Verify token with Firebase Admin SDK
      const decoded = await adminAuth.verifyIdToken(token);
      const { uid, email, name } = decoded;

      // Hash the raw token so we never store it in plain text
      const hashed = await hashSecret(token);

      // Store minimal user data + hashed token in a dedicated collection
      await adminFirestore.collection("users").doc(uid).set({
        email: email || null,
        displayName: name || null,
        tokenHash: hashed,
        updatedAt: new Date(),
      }, { merge: true });

      // Create a signed, HttpOnly cookie (valid 7 days)
      setCookie({ res }, "session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
        sameSite: "lax",
      });

      return res.status(200).json({ message: "Authenticated" });
    } catch (e) {
      console.error(e);
      return res.status(401).json({ error: "Invalid token" });
    }
  } else if (req.method === "DELETE") {
    // Clear the cookie
    setCookie({ res }, "session", "", { maxAge: -1, path: "/" });
    return res.status(200).json({ message: "Logged out" });
  } else {
    res.setHeader("Allow", ["POST", "DELETE"]);
    return res.status(405).end("Method Not Allowed");
  }
}
