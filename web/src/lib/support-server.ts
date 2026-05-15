import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";
import {
  approxJsonBytes,
  MAX_CONTEXT_BYTES,
  MAX_THREAD_MESSAGES,
  type CreateIssueInput,
  type IssueStatus,
  type SupportIssue,
  type ReportThreadMessage,
} from "./support";

const COLLECTION = "support_issues";

function nowIso(): string {
  return new Date().toISOString();
}

function toIso(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object" && v !== null && "toDate" in v) {
    try {
      return (v as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return null;
    }
  }
  return null;
}

// Map a Firestore doc to the SupportIssue public type, normalizing
// Timestamp values to ISO strings so the same shape works on the
// client without pulling in firebase-admin.
function shapeIssue(id: string, data: Record<string, unknown>): SupportIssue {
  const thread = Array.isArray(data.thread)
    ? (data.thread as Record<string, unknown>[]).map<ReportThreadMessage>((m) => ({
        from: m.from === "admin" ? "admin" : "user",
        message: typeof m.message === "string" ? m.message : "",
        createdAt: toIso(m.createdAt) ?? nowIso(),
        byUid: typeof m.byUid === "string" ? m.byUid : undefined,
        byEmail: typeof m.byEmail === "string" ? m.byEmail : undefined,
      }))
    : [];
  return {
    id,
    uid: typeof data.uid === "string" ? data.uid : "",
    email: typeof data.email === "string" ? data.email : null,
    displayName: typeof data.displayName === "string" ? data.displayName : null,
    status:
      data.status === "completed" || data.status === "in_review"
        ? data.status
        : "open",
    category: typeof data.category === "string" ? data.category : "other",
    source: typeof data.source === "string" ? data.source : "settings",
    message: typeof data.message === "string" ? data.message : "",
    adminNote: typeof data.adminNote === "string" ? data.adminNote : null,
    thread,
    context:
      data.context && typeof data.context === "object"
        ? (data.context as Record<string, unknown>)
        : null,
    platform: typeof data.platform === "string" ? data.platform : null,
    appVersion: typeof data.appVersion === "string" ? data.appVersion : null,
    buildNumber:
      typeof data.buildNumber === "string" || typeof data.buildNumber === "number"
        ? data.buildNumber
        : null,
    deviceModel: typeof data.deviceModel === "string" ? data.deviceModel : null,
    lastLoginAt: toIso(data.lastLoginAt),
    lastError:
      data.lastError && typeof data.lastError === "object"
        ? (data.lastError as SupportIssue["lastError"])
        : null,
    createdAt: toIso(data.createdAt) ?? nowIso(),
    updatedAt: toIso(data.updatedAt) ?? nowIso(),
    completedAt: toIso(data.completedAt),
    completedBy: typeof data.completedBy === "string" ? data.completedBy : null,
    completedByEmail:
      typeof data.completedByEmail === "string" ? data.completedByEmail : null,
    lastAdminUpdateAt: toIso(data.lastAdminUpdateAt),
  };
}

export async function createIssue(input: {
  uid: string;
  email: string | null;
  displayName: string | null;
  data: CreateIssueInput;
}): Promise<SupportIssue> {
  const db = adminDb();
  if (input.data.context && approxJsonBytes(input.data.context) > MAX_CONTEXT_BYTES) {
    throw new Error("Context payload too large.");
  }
  const ref = db.collection(COLLECTION).doc();
  const now = FieldValue.serverTimestamp();
  const payload = {
    uid: input.uid,
    email: input.email,
    displayName: input.displayName,
    status: "open" as IssueStatus,
    category: input.data.category,
    source: input.data.source,
    message: input.data.message,
    adminNote: null,
    thread: [],
    context: input.data.context ?? null,
    platform: input.data.platform ?? null,
    appVersion: input.data.appVersion ?? null,
    buildNumber: input.data.buildNumber ?? null,
    deviceModel: input.data.deviceModel ?? null,
    lastLoginAt: null,
    lastError: input.data.lastError ?? null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    completedBy: null,
    completedByEmail: null,
    lastAdminUpdateAt: null,
  };
  await ref.set(payload);
  const fresh = await ref.get();
  return shapeIssue(ref.id, fresh.data() ?? {});
}

export async function getIssueForUser(uid: string, issueId: string): Promise<SupportIssue | null> {
  const snap = await adminDb().collection(COLLECTION).doc(issueId).get();
  if (!snap.exists) return null;
  const data = snap.data() ?? {};
  if (data.uid !== uid) return null;
  return shapeIssue(snap.id, data);
}

export async function getIssueAsAdmin(issueId: string): Promise<SupportIssue | null> {
  const snap = await adminDb().collection(COLLECTION).doc(issueId).get();
  if (!snap.exists) return null;
  return shapeIssue(snap.id, snap.data() ?? {});
}

export async function listIssuesForUser(uid: string, limit = 50): Promise<SupportIssue[]> {
  const snap = await adminDb()
    .collection(COLLECTION)
    .where("uid", "==", uid)
    .orderBy("updatedAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => shapeIssue(d.id, d.data() ?? {}));
}

export async function listAllIssues(opts: { status?: IssueStatus; limit?: number } = {}): Promise<
  SupportIssue[]
> {
  let q: FirebaseFirestore.Query = adminDb()
    .collection(COLLECTION)
    .orderBy("updatedAt", "desc");
  if (opts.status) q = q.where("status", "==", opts.status);
  q = q.limit(opts.limit ?? 200);
  const snap = await q.get();
  return snap.docs.map((d) => shapeIssue(d.id, d.data() ?? {}));
}

export async function appendUserReply(
  uid: string,
  issueId: string,
  message: string,
  authorEmail: string | null,
): Promise<SupportIssue> {
  const db = adminDb();
  const ref = db.collection(COLLECTION).doc(issueId);
  await db.runTransaction(async (tx) => {
    const fresh = await tx.get(ref);
    if (!fresh.exists) throw new Error("Issue not found.");
    const data = fresh.data() ?? {};
    if (data.uid !== uid) throw new Error("Forbidden");
    const thread = Array.isArray(data.thread) ? data.thread : [];
    if (thread.length >= MAX_THREAD_MESSAGES) {
      throw new Error("This conversation has reached the message limit.");
    }
    const next: ReportThreadMessage = {
      from: "user",
      message,
      createdAt: nowIso(),
      byUid: uid,
      byEmail: authorEmail ?? undefined,
    };
    const update: Record<string, unknown> = {
      thread: [...thread, next],
      updatedAt: FieldValue.serverTimestamp(),
    };
    // Reopen completed issues when the user replies. They're saying
    // "actually it's not done."
    if (data.status === "completed") {
      update.status = "open";
      update.completedAt = null;
      update.completedBy = null;
      update.completedByEmail = null;
    }
    tx.update(ref, update);
  });
  const after = await ref.get();
  return shapeIssue(after.id, after.data() ?? {});
}

export async function appendAdminReply(
  issueId: string,
  message: string,
  adminUid: string,
  adminEmail: string | null,
): Promise<SupportIssue> {
  const db = adminDb();
  const ref = db.collection(COLLECTION).doc(issueId);
  await db.runTransaction(async (tx) => {
    const fresh = await tx.get(ref);
    if (!fresh.exists) throw new Error("Issue not found.");
    const data = fresh.data() ?? {};
    const thread = Array.isArray(data.thread) ? data.thread : [];
    if (thread.length >= MAX_THREAD_MESSAGES) {
      throw new Error("This conversation has reached the message limit.");
    }
    const next: ReportThreadMessage = {
      from: "admin",
      message,
      createdAt: nowIso(),
      byUid: adminUid,
      byEmail: adminEmail ?? undefined,
    };
    tx.update(ref, {
      thread: [...thread, next],
      updatedAt: FieldValue.serverTimestamp(),
      lastAdminUpdateAt: FieldValue.serverTimestamp(),
      // Open → in_review when admin engages. Don't reopen a completed ticket.
      ...(data.status === "open" ? { status: "in_review" } : {}),
    });
  });
  const after = await ref.get();
  return shapeIssue(after.id, after.data() ?? {});
}

export async function setAdminNote(
  issueId: string,
  note: string,
  adminUid: string,
  adminEmail: string | null,
): Promise<SupportIssue> {
  const ref = adminDb().collection(COLLECTION).doc(issueId);
  await ref.update({
    adminNote: note,
    updatedAt: FieldValue.serverTimestamp(),
    lastAdminUpdateAt: FieldValue.serverTimestamp(),
    lastAdminEditByUid: adminUid,
    lastAdminEditByEmail: adminEmail,
  });
  const after = await ref.get();
  return shapeIssue(after.id, after.data() ?? {});
}

export async function setIssueStatus(
  issueId: string,
  status: IssueStatus,
  adminUid: string,
  adminEmail: string | null,
): Promise<SupportIssue> {
  const ref = adminDb().collection(COLLECTION).doc(issueId);
  const update: Record<string, unknown> = {
    status,
    updatedAt: FieldValue.serverTimestamp(),
    lastAdminUpdateAt: FieldValue.serverTimestamp(),
  };
  if (status === "completed") {
    update.completedAt = FieldValue.serverTimestamp();
    update.completedBy = adminUid;
    update.completedByEmail = adminEmail;
  } else {
    update.completedAt = null;
    update.completedBy = null;
    update.completedByEmail = null;
  }
  await ref.update(update);
  const after = await ref.get();
  return shapeIssue(after.id, after.data() ?? {});
}
