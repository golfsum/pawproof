"use client";

import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import {
  Bell,
  FileText,
  LogOut,
  MessageSquare,
  Shield,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { auth } from "@/lib/firebase";
import {
  Card,
  Chip,
  ListRow,
  PageTitle,
  SectionLabel,
} from "@/components/app-ui";

// Settings — matches the iOS Settings tab structure: profile card,
// then grouped lists with thin hairline separators.

export default function SettingsPage() {
  const router = useRouter();
  const { user, profile } = useAuth();

  return (
    <>
      <PageTitle title="Settings" />

      <Card>
        <div className="profile-row">
          <div className="profile-avatar">
            {(profile?.displayName ?? user?.email ?? "?")[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="profile-name">{profile?.displayName ?? user?.email ?? "You"}</div>
            <div className="profile-sub">{user?.email}</div>
          </div>
          {profile?.isPremium ? <Chip label="Plus" tone="success" /> : null}
        </div>
      </Card>

      <SectionLabel>Subscription</SectionLabel>
      <Card noPadding>
        <ListRow
          icon={<Sparkles size={18} />}
          iconTint="primary"
          title={profile?.isPremium ? "PawProof Plus" : "Upgrade to PawProof Plus"}
          subtitle={
            profile?.isPremium
              ? "You're a Plus member."
              : "Unlimited pets, OCR, PDF export, and more."
          }
        />
      </Card>

      <SectionLabel>Support</SectionLabel>
      <Card noPadding>
        <ListRow
          icon={<MessageSquare size={18} />}
          iconTint="primary"
          title="My tickets"
          subtitle="View admin replies and submit new tickets"
          href="/dashboard/support"
        />
      </Card>

      <SectionLabel>Notifications</SectionLabel>
      <Card noPadding>
        <ListRow
          icon={<Bell size={18} />}
          iconTint="primary"
          title="Manage in iOS app"
          subtitle="Notification grouping and vaccine warning windows live in the mobile Settings tab."
        />
      </Card>

      <SectionLabel>Account</SectionLabel>
      <Card noPadding>
        <ListRow
          icon={<Shield size={18} />}
          iconTint="primary"
          title="Privacy"
          subtitle="How we store and use your data"
          href="/privacy"
        />
        <ListRow
          icon={<FileText size={18} />}
          iconTint="primary"
          title="Terms of Service"
          href="/terms"
        />
        <ListRow
          icon={<LogOut size={18} />}
          iconTint="danger"
          title="Sign out"
          subtitle="Sign back in anytime"
          onClick={() => {
            if (auth) void signOut(auth).then(() => router.replace("/"));
          }}
        />
      </Card>

      <p className="fineprint">PawProof web · v1.0</p>

      <style jsx>{`
        .profile-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .profile-avatar {
          width: 56px;
          height: 56px;
          border-radius: 999px;
          background: #e1f1f5;
          color: #2a8fa8;
          font-weight: 700;
          font-size: 22px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .profile-name {
          font-size: 17px;
          font-weight: 700;
          color: #16252e;
          letter-spacing: -0.2px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .profile-sub {
          font-size: 13px;
          color: rgba(60, 60, 67, 0.6);
          margin-top: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .fineprint {
          text-align: center;
          color: rgba(60, 60, 67, 0.3);
          font-size: 11px;
          margin-top: 24px;
        }
      `}</style>
    </>
  );
}
