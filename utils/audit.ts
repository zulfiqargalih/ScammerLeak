// utils/audit.ts
// Simple audit logging helper for admin actions.
// Stores entries in Firestore collection "auditLogs".
// Each entry includes: action, adminId, reportId, timestamp, details.

import { adminFirestore } from "../firebase/admin";

export async function logDeletion(adminId: string, reportId: string) {
  const entry = {
    action: "deleteReport",
    adminId,
    reportId,
    timestamp: new Date().toISOString(),
    details: `Report ${reportId} deleted by admin ${adminId}`,
  };
  await adminFirestore.collection("auditLogs").add(entry);
}
