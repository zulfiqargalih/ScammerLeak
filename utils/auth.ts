// utils/auth.ts
import { signInWithGoogle, auth } from "../firebase/client";
import { hashSecret } from "./crypto";

/**
 * Handles client‑side Google sign‑in. Returns the Firebase user object.
 */
export const loginWithGoogle = async () => {
  const user = await signInWithGoogle();
  // Get ID token (JWT) to send to our backend for verification & hashing
  const idToken = await user.getIdToken();
  return { idToken, displayName: user.displayName, email: user.email, uid: user.uid };
};

/**
 * Sends the ID token to our server‑side /api/auth endpoint.
 * The server will verify the token with Firebase Admin, hash it and set a HttpOnly cookie.
 */
export const sendTokenToServer = async (idToken: string) => {
  const res = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: idToken }),
  });
  if (!res.ok) throw new Error("Authentication failed");
  return await res.json();
};

/**
 * Wrapper to log out the user both client‑side and server‑side.
 */
export const logout = async () => {
  await auth.signOut();
  await fetch("/api/auth", { method: "DELETE" });
};
