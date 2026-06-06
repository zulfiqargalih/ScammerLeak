// utils/firestore.ts
import { db } from "../firebase/client";
import { collection, addDoc, getDocs, query, where, updateDoc, doc, DocumentData } from "firebase/firestore";

export interface ReportData {
  title: string;
  chronology: string;
  ewalletDetails?: string;
  evidenceUrls: string[]; // signed URLs
  userId: string; // uid of reporting user
  userName: string;
  userEmail: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
}

/** Create a new report document (status = pending) */
export async function createReport(data: Omit<ReportData, "status" | "createdAt">): Promise<string> {
  const docRef = await addDoc(collection(db, "reports"), {
    ...data,
    status: "pending",
    createdAt: new Date(),
  } as DocumentData);
  return docRef.id;
}

/** Get all reports with status pending (admin view) */
export async function getPendingReports() {
  const q = query(collection(db, "reports"), where("status", "==", "pending"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Update report status (admin action) */
export async function updateReportStatus(reportId: string, newStatus: "approved" | "rejected") {
  const reportRef = doc(db, "reports", reportId);
  await updateDoc(reportRef, { status: newStatus });
}
