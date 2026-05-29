"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail, Sparkles, UserCheck, Users } from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";
import { useUserData } from "@/lib/use-user-data";
import { db } from "@/lib/firebase";
import { fmtDate } from "@/lib/utils";
import {
  Card,
  Chip,
  EmptyCard,
  ListRow,
  PageTitle,
  PetAvatar,
  SectionLabel,
} from "@/components/app-ui";

// Manage People — web companion to the mobile Manage People screen.
// Read-only on the web for now: invite creation, role changes, and
// revoke actions live in the mobile app so the share-code handoff
// stays one canonical flow. The web view shows who has access to each
// pet so a desktop user can audit without pulling out their phone.

type ShareStatus = "pending" | "accepted" | "revoked";
type ShareRole = "caregiver" | "view_only";

interface PetShare {
  id: string;
  petId: string;
  petName: string;
  ownerUid: string;
  ownerEmail: string | null;
  ownerName: string | null;
  inviteeEmail: string;
  inviteeUid: string | null;
  role: ShareRole;
  status: ShareStatus;
  inviteCode: string;
  createdAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
}

const ROLE_LABEL: Record<ShareRole, string> = {
  caregiver: "Caregiver",
  view_only: "View only",
};

function normalizeShare(id: string, raw: Record<string, unknown>): PetShare {
  const stringify = (v: unknown): string | null => {
    if (v == null) return null;
    if (typeof v === "string") return v;
    if (typeof v === "object" && v && "toDate" in v && typeof (v as { toDate: () => Date }).toDate === "function") {
      return (v as { toDate: () => Date }).toDate().toISOString();
    }
    return String(v);
  };
  return {
    id,
    petId: (raw.petId as string) ?? "",
    petName: (raw.petName as string) ?? "Pet",
    ownerUid: (raw.ownerUid as string) ?? "",
    ownerEmail: (raw.ownerEmail as string | null) ?? null,
    ownerName: (raw.ownerName as string | null) ?? null,
    inviteeEmail: (raw.inviteeEmail as string) ?? "",
    inviteeUid: (raw.inviteeUid as string | null) ?? null,
    role: (raw.role as ShareRole) ?? "caregiver",
    status: (raw.status as ShareStatus) ?? "pending",
    inviteCode: (raw.inviteeCode as string) ?? (raw.inviteCode as string) ?? "",
    createdAt: stringify(raw.createdAt) ?? "",
    acceptedAt: stringify(raw.acceptedAt),
    revokedAt: stringify(raw.revokedAt),
  };
}

export default function ManagePeoplePage() {
  const { user, profile } = useAuth();
  const { pets } = useUserData();
  const [outgoing, setOutgoing] = useState<PetShare[]>([]);
  const [incoming, setIncoming] = useState<PetShare[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) return;
    let received = 0;
    const tick = () => {
      received += 1;
      if (received >= 2) setLoading(false);
    };

    const outQ = query(
      collection(db, "pet_shares"),
      where("ownerUid", "==", user.uid),
    );
    const inQ = query(
      collection(db, "pet_shares"),
      where("inviteeUid", "==", user.uid),
    );

    const unsubOut = onSnapshot(
      outQ,
      (snap) => {
        setOutgoing(snap.docs.map((d) => normalizeShare(d.id, d.data())));
        tick();
      },
      () => tick(),
    );
    const unsubIn = onSnapshot(
      inQ,
      (snap) => {
        setIncoming(snap.docs.map((d) => normalizeShare(d.id, d.data())));
        tick();
      },
      () => tick(),
    );
    return () => {
      unsubOut();
      unsubIn();
    };
  }, [user?.uid]);

  const activeOutgoing = useMemo(
    () => outgoing.filter((s) => s.status !== "revoked"),
    [outgoing],
  );

  // Group active outgoing shares by pet so the page reads "who has
  // access to each pet" not "list of invites by date".
  const sharesByPet = useMemo(() => {
    const map: Record<string, PetShare[]> = {};
    for (const s of activeOutgoing) {
      (map[s.petId] ??= []).push(s);
    }
    return map;
  }, [activeOutgoing]);

  if (!profile?.isPremium) {
    return (
      <>
        <PageTitle
          title="Manage people"
          subtitle="Invite caregivers and family to help with your pets."
        />
        <Card>
          <div className="paywall">
            <div className="paywall-icon">
              <Sparkles size={20} />
            </div>
            <div className="paywall-text">
              <div className="paywall-title">Caregiver sharing is a Plus feature</div>
              <p>
                Invite family, roommates, or pet sitters to log care and view
                selected pet records. Upgrade to PawProof Plus in the mobile
                app to send your first invite.
              </p>
            </div>
          </div>
        </Card>
        <p className="helper">
          Already a Plus member? Open the PawProof iOS app → Settings → Manage
          people to send and revoke invites.
        </p>
        <style jsx>{`
          .paywall {
            display: flex;
            gap: 14px;
            align-items: flex-start;
          }
          .paywall-icon {
            width: 40px;
            height: 40px;
            border-radius: 12px;
            background: rgba(42, 143, 168, 0.12);
            color: #2a8fa8;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .paywall-title {
            font-size: 15px;
            font-weight: 700;
            color: #16252e;
          }
          .paywall p {
            margin: 4px 0 0;
            font-size: 13px;
            color: rgba(60, 60, 67, 0.7);
            line-height: 1.55;
          }
          .helper {
            margin-top: 16px;
            padding: 14px 16px;
            background: rgba(42, 143, 168, 0.08);
            border-radius: 14px;
            color: rgba(60, 60, 67, 0.75);
            font-size: 12px;
            line-height: 1.5;
          }
        `}</style>
      </>
    );
  }

  return (
    <>
      <PageTitle
        title="Manage people"
        subtitle="See who has access to each pet. Send and revoke invites from the iOS app."
      />

      <SectionLabel>
        People you&apos;ve invited ({activeOutgoing.length})
      </SectionLabel>
      {loading ? (
        <EmptyCard title="Loading…" body="Fetching share invites." />
      ) : activeOutgoing.length === 0 ? (
        <EmptyCard
          title="No invites yet"
          body="Open the PawProof iOS app → Settings → Manage people to invite a caregiver."
        />
      ) : (
        Object.entries(sharesByPet).map(([petId, shares]) => {
          const pet = pets.find((p) => p.id === petId) ?? null;
          return (
            <div key={petId} className="pet-block">
              <div className="pet-block-header">
                {pet ? <PetAvatar pet={pet} size={28} /> : null}
                <div className="pet-block-name">{pet?.name ?? shares[0].petName}</div>
              </div>
              <Card noPadding>
                {shares.map((s) => (
                  <ListRow
                    key={s.id}
                    icon={
                      s.status === "accepted" ? (
                        <UserCheck size={18} />
                      ) : (
                        <Mail size={18} />
                      )
                    }
                    iconTint={s.status === "accepted" ? "primary" : "warning"}
                    title={s.inviteeEmail}
                    subtitle={
                      <>
                        {ROLE_LABEL[s.role]} ·{" "}
                        {s.status === "accepted"
                          ? `Accepted ${fmtDate(s.acceptedAt ?? s.createdAt)}`
                          : `Invited ${fmtDate(s.createdAt)} · ${s.inviteCode.toUpperCase()}`}
                      </>
                    }
                    trailing={
                      <Chip
                        label={s.status === "accepted" ? "Accepted" : "Pending"}
                        tone={s.status === "accepted" ? "success" : "warning"}
                      />
                    }
                  />
                ))}
              </Card>
            </div>
          );
        })
      )}

      {incoming.length > 0 ? (
        <>
          <SectionLabel>Pets shared with you ({incoming.length})</SectionLabel>
          <Card noPadding>
            {incoming.map((s) => (
              <ListRow
                key={s.id}
                icon={<Users size={18} />}
                iconTint="primary"
                title={s.petName}
                subtitle={
                  <>
                    Shared by {s.ownerName ?? s.ownerEmail ?? "an owner"} ·{" "}
                    {ROLE_LABEL[s.role]}
                  </>
                }
              />
            ))}
          </Card>
        </>
      ) : null}

      <p className="helper">
        Sending and revoking invites lives in the PawProof iOS app so the
        share-code handoff stays one canonical flow. The web is best for
        seeing who has access at a glance.
      </p>

      <style jsx>{`
        .pet-block {
          margin-bottom: 12px;
        }
        .pet-block-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 4px 4px 8px;
        }
        .pet-block-name {
          font-size: 14px;
          font-weight: 700;
          color: #16252e;
        }
        .helper {
          margin-top: 16px;
          padding: 14px 16px;
          background: rgba(42, 143, 168, 0.08);
          border-radius: 14px;
          color: rgba(60, 60, 67, 0.75);
          font-size: 12px;
          line-height: 1.5;
        }
      `}</style>
    </>
  );
}
