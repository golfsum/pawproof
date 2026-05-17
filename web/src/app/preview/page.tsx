"use client";

import { useState } from "react";
import {
  Bell,
  ChevronRight,
  Folder,
  Heart,
  Home,
  PawPrint,
  Settings,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Sun,
  Moon,
  ChevronLeft,
  Bone,
  Cookie,
  Pill,
  Footprints,
  AlertTriangle,
  Calendar,
} from "lucide-react";

// iOS-style preview of the PawProof mobile app. Lives at /preview so
// it can be linked from the landing page as a "tap through the app"
// demo and used by the design team as a reference shell.
//
// Layout decisions:
//  - Phone frame on >= md screens (clamped 390x844, matches iPhone 14
//    Pro logical viewport) so the page reads as a device mockup; on
//    smaller screens the frame disappears and the UI takes the full
//    viewport, becoming a real installable-PWA-style shell.
//  - System font stack via inline <style jsx global> so we don't have
//    to load anything; iOS users see actual SF Pro.
//  - Light/Dark toggle is local state so the demo can show both
//    palettes without depending on OS preference.
//  - All interactivity is client-side React: tab clicks swap the
//    main content with a brief fade transition.

type TabId = "home" | "pets" | "records" | "settings";
type Mode = "light" | "dark";

interface TabSpec {
  id: TabId;
  label: string;
  icon: typeof Home;
  title: string;
}

const TABS: TabSpec[] = [
  { id: "home", label: "Home", icon: Home, title: "PawProof" },
  { id: "pets", label: "Pets", icon: PawPrint, title: "My Pets" },
  { id: "records", label: "Records", icon: Folder, title: "Records" },
  { id: "settings", label: "Settings", icon: Settings, title: "Settings" },
];

export default function PreviewPage() {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [mode, setMode] = useState<Mode>("light");

  const isDark = mode === "dark";
  const tab = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className={`preview-shell ${isDark ? "dark" : ""}`}>
      {/* Stage: centers a phone-shaped frame on desktop. On mobile,
          the frame styles collapse and the whole viewport is the
          phone. */}
      <div className="stage">
        <div className="phone">
          {/* Top frosted-glass nav bar. Tracks the active tab title
              and exposes a trailing accent action (the demo's mode
              toggle sits here). */}
          <header className="nav">
            <div className="nav-inner">
              <button
                type="button"
                aria-label="Toggle dark mode"
                onClick={() => setMode(isDark ? "light" : "dark")}
                className="nav-leading"
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <h1 className="nav-title">{tab.title}</h1>
              <button type="button" aria-label="Notifications" className="nav-trailing">
                <Bell size={20} />
              </button>
            </div>
          </header>

          {/* Scrolling content. Each tab renders its own block; the
              outer container handles momentum scroll + safe-area
              padding so notched devices breathe correctly. */}
          <main className="content" key={activeTab}>
            {activeTab === "home" && <HomeTab onJump={setActiveTab} />}
            {activeTab === "pets" && <PetsTab />}
            {activeTab === "records" && <RecordsTab />}
            {activeTab === "settings" && <SettingsTab onToggleMode={() => setMode(isDark ? "light" : "dark")} mode={mode} />}
          </main>

          {/* Bottom tab bar — frosted glass, hairline top border. */}
          <nav className="tabbar" role="tablist">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = t.id === activeTab;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(t.id)}
                  className={`tab ${active ? "tab-active" : ""}`}
                >
                  <Icon size={24} strokeWidth={active ? 2.2 : 1.6} />
                  <span className="tab-label">{t.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <style jsx global>{`
        /* ── iOS-style system font stack + tap polish ─────────────── */
        .preview-shell {
          /* iOS uses SF Pro automatically when -apple-system is the
             first family. Other platforms fall back gracefully. */
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text",
            "SF Pro Display", "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell,
            sans-serif;
          font-feature-settings: "ss01", "cv11";
          -webkit-font-smoothing: antialiased;
          /* Kill the gray flash iOS adds when you tap an interactive
             element. We provide our own press states. */
          -webkit-tap-highlight-color: transparent;
          /* The shell itself sits inside whatever route layout it's
             rendered under; force a clean background on its own
             stage so the iOS frame reads as separate. */
          min-height: 100vh;
          min-height: 100dvh;
          background: var(--stage-bg, #e5e5ea);
          color: var(--text, #000);
          transition: background 200ms ease, color 200ms ease;
        }
        .preview-shell.dark {
          --stage-bg: #050505;
        }

        /* iOS palette tokens. Mirrors UIKit semantic colors. */
        .preview-shell {
          --page-bg: #f2f2f7;
          --card-bg: #ffffff;
          --card-elevated: #ffffff;
          --text: #000;
          --text-secondary: rgba(60, 60, 67, 0.6);
          --text-tertiary: rgba(60, 60, 67, 0.3);
          --separator: rgba(60, 60, 67, 0.18);
          --nav-bg: rgba(248, 248, 248, 0.78);
          --tabbar-bg: rgba(248, 248, 248, 0.84);
          --accent: #2a8fa8;
          --accent-soft: rgba(42, 143, 168, 0.12);
          --danger: #ff3b30;
          --danger-soft: rgba(255, 59, 48, 0.12);
          --warning: #ff9500;
          --warning-soft: rgba(255, 149, 0, 0.12);
          --success: #34c759;
        }
        .preview-shell.dark {
          --page-bg: #000;
          --card-bg: #1c1c1e;
          --card-elevated: #2c2c2e;
          --text: #fff;
          --text-secondary: rgba(235, 235, 245, 0.6);
          --text-tertiary: rgba(235, 235, 245, 0.3);
          --separator: rgba(84, 84, 88, 0.65);
          --nav-bg: rgba(28, 28, 30, 0.78);
          --tabbar-bg: rgba(22, 22, 22, 0.86);
          --accent: #4cb7dc;
          --accent-soft: rgba(76, 183, 220, 0.16);
          --danger: #ff453a;
          --danger-soft: rgba(255, 69, 58, 0.16);
          --warning: #ff9f0a;
          --warning-soft: rgba(255, 159, 10, 0.16);
          --success: #30d158;
        }

        /* ── Stage / phone frame ──────────────────────────────────── */
        .stage {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100dvh;
          padding: 0;
        }
        @media (min-width: 768px) {
          .stage {
            padding: 32px 16px;
          }
        }

        .phone {
          position: relative;
          width: 100%;
          height: 100dvh;
          background: var(--page-bg);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: background 200ms ease;
        }
        @media (min-width: 768px) {
          .phone {
            width: 390px;
            height: 844px;
            border-radius: 48px;
            box-shadow:
              0 0 0 12px #1c1c1e,
              0 0 0 14px #2c2c2e,
              0 40px 80px rgba(0, 0, 0, 0.35);
          }
        }

        /* ── Top nav (frosted glass) ──────────────────────────────── */
        .nav {
          position: sticky;
          top: 0;
          z-index: 20;
          background: var(--nav-bg);
          backdrop-filter: saturate(180%) blur(20px);
          -webkit-backdrop-filter: saturate(180%) blur(20px);
          border-bottom: 0.5px solid var(--separator);
        }
        .nav-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          /* Respect the notch / status bar on real phones. The
             phone-frame variant tucks 8px of breathing room above
             instead since the notch is faked. */
          padding-top: max(env(safe-area-inset-top), 12px);
        }
        @media (min-width: 768px) {
          .nav-inner {
            padding-top: 20px;
          }
        }
        .nav-title {
          font-size: 17px;
          font-weight: 600;
          letter-spacing: -0.2px;
          color: var(--text);
          margin: 0;
          flex: 1;
          text-align: center;
        }
        .nav-leading,
        .nav-trailing {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 999px;
          color: var(--accent);
          background: transparent;
          border: none;
          cursor: pointer;
          transition: background 120ms ease, transform 120ms ease;
        }
        .nav-leading:active,
        .nav-trailing:active {
          background: var(--accent-soft);
          transform: scale(0.94);
        }

        /* ── Scrolling content area ───────────────────────────────── */
        .content {
          flex: 1;
          overflow-y: auto;
          /* Momentum scroll on iOS Safari. */
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-y: contain;
          padding: 16px 16px 96px;
          animation: fade 240ms ease both;
        }
        @keyframes fade {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* ── Bottom tab bar ───────────────────────────────────────── */
        .tabbar {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 30;
          display: flex;
          background: var(--tabbar-bg);
          backdrop-filter: saturate(180%) blur(20px);
          -webkit-backdrop-filter: saturate(180%) blur(20px);
          border-top: 0.5px solid var(--separator);
          padding: 8px 0;
          padding-bottom: max(env(safe-area-inset-bottom), 8px);
        }
        @media (min-width: 768px) {
          .tabbar {
            padding-bottom: 20px;
          }
        }
        .tab {
          flex: 1;
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          padding: 4px 0;
          color: var(--text-secondary);
          background: transparent;
          border: none;
          cursor: pointer;
          transition: color 120ms ease, transform 120ms ease;
        }
        .tab:active {
          transform: scale(0.96);
        }
        .tab-active {
          color: var(--accent);
        }
        .tab-label {
          font-size: 10px;
          letter-spacing: 0.1px;
          font-weight: 500;
        }

        /* ── Shared card / typography primitives ──────────────────── */
        .card {
          background: var(--card-bg);
          border-radius: 14px;
          padding: 16px;
          transition: background 200ms ease;
        }
        .card-inset {
          background: var(--card-elevated);
          border-radius: 12px;
          padding: 14px;
        }
        .section-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.6px;
          margin: 24px 4px 8px;
        }
        .row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .row + .row {
          border-top: 0.5px solid var(--separator);
        }
        .row-title {
          color: var(--text);
          font-size: 16px;
          font-weight: 500;
        }
        .row-sub {
          color: var(--text-secondary);
          font-size: 13px;
          margin-top: 2px;
        }
        .pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.4px;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
}

/* ───────────────────────── Tab contents ───────────────────────── */

function HomeTab({ onJump }: { onJump: (t: TabId) => void }) {
  const today = new Date();
  const dateLabel = today.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  return (
    <>
      <div style={{ padding: "8px 4px 16px" }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-secondary)",
            letterSpacing: "0.6px",
            textTransform: "uppercase",
          }}
        >
          {dateLabel}
        </div>
        <h2
          style={{
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: "-0.5px",
            margin: "4px 0 0",
            color: "var(--text)",
          }}
        >
          Good morning
        </h2>
      </div>

      {/* Status row: Today / Overdue / Expiring Soon */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        <StatusCard label="Due today" count={3} tone="accent" />
        <StatusCard label="Overdue" count={1} tone="danger" />
        <StatusCard label="Expiring" count={2} tone="warning" />
      </div>

      <SectionLabel>Today</SectionLabel>
      <div className="card" style={{ padding: 0 }}>
        <TodayRow
          icon={<Footprints size={18} />}
          tone="danger"
          title="Morning walk"
          sub="Yahzi · Overdue · 7:00 AM"
        />
        <TodayRow
          icon={<Cookie size={18} />}
          tone="warning"
          title="Dinner"
          sub="Moqui · Due today · 6:00 PM"
        />
        <TodayRow
          icon={<Pill size={18} />}
          tone="warning"
          title="Flea medication"
          sub="Lovie · Due today · 8:00 PM"
        />
        <TodayRow
          icon={<ShieldCheck size={18} />}
          tone="danger"
          title="Bordetella vaccine"
          sub="Moqui · Expired"
        />
      </div>

      <SectionLabel>Quick Log</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
        }}
      >
        <QuickAction icon={<Cookie size={20} />} label="Fed" tint="#FF9500" />
        <QuickAction icon={<Footprints size={20} />} label="Walk" tint="#2A8FA8" />
        <QuickAction icon={<Pill size={20} />} label="Meds" tint="#FF3B30" />
        <QuickAction icon={<Bone size={20} />} label="Training" tint="#AF52DE" />
        <QuickAction icon={<Heart size={20} />} label="Health" tint="#FF9500" />
        <QuickAction icon={<Sparkles size={20} />} label="Grooming" tint="#5856D6" />
      </div>

      <SectionLabel>Your Pets</SectionLabel>
      <button type="button" className="card" onClick={() => onJump("pets")} style={cardButtonStyle()}>
        <div className="row" style={{ borderTop: "none" }}>
          <PetAvatar emoji="🐕" name="Yahzi" tone="#FFE2C7" />
          <div style={{ flex: 1 }}>
            <div className="row-title">Yahzi</div>
            <div className="row-sub">Golden retriever · 4 yr</div>
          </div>
          <ChevronRight size={18} color="var(--text-tertiary)" />
        </div>
      </button>
      <div style={{ height: 8 }} />
      <button type="button" className="card" onClick={() => onJump("pets")} style={cardButtonStyle()}>
        <div className="row" style={{ borderTop: "none" }}>
          <PetAvatar emoji="🐈" name="Moqui" tone="#D4E9F4" />
          <div style={{ flex: 1 }}>
            <div className="row-title">Moqui</div>
            <div className="row-sub">Tabby · 6 yr</div>
          </div>
          <ChevronRight size={18} color="var(--text-tertiary)" />
        </div>
      </button>
    </>
  );
}

function PetsTab() {
  const pets = [
    {
      name: "Yahzi",
      breed: "Golden retriever · 4 yr",
      emoji: "🐕",
      tone: "#FFE2C7",
      preview: { label: "Overdue", text: "Morning walk · Yesterday", tone: "danger" as const },
    },
    {
      name: "Moqui",
      breed: "Tabby · 6 yr",
      emoji: "🐈",
      tone: "#D4E9F4",
      preview: { label: "Expired", text: "Bordetella vaccine · Oct 10", tone: "danger" as const },
    },
    {
      name: "Lovie",
      breed: "Cockatiel · 2 yr",
      emoji: "🦜",
      tone: "#F6E0F4",
      preview: { label: "Next", text: "Cage cleaning · Tomorrow, 9 AM", tone: "muted" as const },
    },
  ];

  return (
    <>
      <div style={{ padding: "8px 4px 16px" }}>
        <h2
          style={{
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: "-0.5px",
            margin: 0,
            color: "var(--text)",
          }}
        >
          My Pets
        </h2>
        <div className="row-sub" style={{ marginTop: 4 }}>
          3 pets on file
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {pets.map((p) => (
          <PetCard key={p.name} {...p} />
        ))}

        <button type="button" className="card" style={{ ...cardButtonStyle(), borderStyle: "dashed", borderWidth: 1.5, borderColor: "var(--separator)" }}>
          <div className="row" style={{ borderTop: "none" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                background: "var(--accent-soft)",
                color: "var(--accent)",
                fontSize: 24,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              +
            </div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div className="row-title">Add another pet</div>
              <div className="row-sub">Track records, reminders, and care</div>
            </div>
          </div>
        </button>
      </div>
    </>
  );
}

function RecordsTab() {
  return (
    <>
      <div style={{ padding: "8px 4px 16px" }}>
        <h2
          style={{
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: "-0.5px",
            margin: 0,
            color: "var(--text)",
          }}
        >
          Records
        </h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <QuickTile
          icon={<Sparkles size={20} />}
          label="Scan Document"
          badge="1 free scan"
          tint="var(--accent)"
        />
        <QuickTile
          icon={<ShieldCheck size={20} />}
          label="Add vaccine record"
          tint="var(--success)"
        />
      </div>

      <SectionLabel>Expiring soon · 2</SectionLabel>
      <div className="card" style={{ padding: 0 }}>
        <VaccineRow
          name="Rabies"
          sub="Moqui · Given Jan 10, 2024 · Expires Jan 10, 2026"
          chip={{ label: "20d left", tone: "warning" }}
        />
        <VaccineRow
          name="Bordetella"
          sub="Moqui · Given Oct 10, 2024 · Expired Oct 10, 2025"
          chip={{ label: "Expired", tone: "danger" }}
        />
      </div>

      <SectionLabel>Yahzi · 4 vaccines</SectionLabel>
      <div className="card" style={{ padding: 0 }}>
        <VaccineRow
          name="DHPP"
          sub="Given May 9, 2025 · Current until May 9, 2026"
          chip={{ label: "Current", tone: "success" }}
        />
        <VaccineRow
          name="Rabies"
          sub="Given May 9, 2024 · Expires May 9, 2027"
          chip={{ label: "Current", tone: "success" }}
        />
        <VaccineRow
          name="Lyme"
          sub="Given Aug 12, 2025 · Expires Aug 12, 2026"
          chip={{ label: "Current", tone: "success" }}
        />
      </div>
    </>
  );
}

function SettingsTab({ mode, onToggleMode }: { mode: Mode; onToggleMode: () => void }) {
  return (
    <>
      <div style={{ padding: "8px 4px 16px" }}>
        <h2
          style={{
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: "-0.5px",
            margin: 0,
            color: "var(--text)",
          }}
        >
          Settings
        </h2>
      </div>

      {/* Account card */}
      <div className="card">
        <div className="row" style={{ borderTop: "none" }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 999,
              background: "var(--accent-soft)",
              color: "var(--accent)",
              fontSize: 18,
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            N
          </div>
          <div style={{ flex: 1 }}>
            <div className="row-title">nd82soft@gmail.com</div>
            <div className="row-sub">3 pets · 8 documents</div>
          </div>
          <span
            className="pill"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Plus
          </span>
        </div>
      </div>

      <SectionLabel>Subscription</SectionLabel>
      <div className="card" style={{ padding: 0 }}>
        <SettingRow icon={<Sparkles size={20} />} label="PawProof Plus" sub="You're a Plus member" />
        <SettingRow icon={<Calendar size={20} />} label="Restore purchases" sub="If you've subscribed before" />
      </div>

      <SectionLabel>Care</SectionLabel>
      <div className="card" style={{ padding: 0 }}>
        <SettingRow icon={<Bell size={20} />} label="Notifications" sub="Grouping, vaccine warnings" />
        <SettingRow icon={<AlertTriangle size={20} />} label="Emergency cards" sub="Share with sitters and vets" />
        <SettingRow icon={<Stethoscope size={20} />} label="Care instructions" sub="Per-pet feeding, walks, behavior" />
      </div>

      <SectionLabel>Appearance (demo)</SectionLabel>
      <button type="button" className="card" onClick={onToggleMode} style={cardButtonStyle()}>
        <div className="row" style={{ borderTop: "none" }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              background: "var(--accent-soft)",
              color: "var(--accent)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {mode === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </div>
          <div style={{ flex: 1, textAlign: "left" }}>
            <div className="row-title">{mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}</div>
            <div className="row-sub">Preview the iOS palette in both</div>
          </div>
          <ChevronRight size={18} color="var(--text-tertiary)" />
        </div>
      </button>

      <p
        style={{
          textAlign: "center",
          fontSize: 11,
          color: "var(--text-tertiary)",
          margin: "24px 0 8px",
        }}
      >
        PawProof preview · iOS shell mockup
      </p>
    </>
  );
}

/* ───────────────────────── Reusable bits ───────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="section-label">{children}</div>;
}

function StatusCard({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: "accent" | "danger" | "warning";
}) {
  const bg =
    tone === "accent" ? "var(--accent-soft)" : tone === "danger" ? "var(--danger-soft)" : "var(--warning-soft)";
  const fg =
    tone === "accent" ? "var(--accent)" : tone === "danger" ? "var(--danger)" : "var(--warning)";
  return (
    <div style={{ background: bg, color: fg, borderRadius: 14, padding: 12 }}>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.5px" }}>{count}</div>
      <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function TodayRow({
  icon,
  tone,
  title,
  sub,
}: {
  icon: React.ReactNode;
  tone: "danger" | "warning" | "muted";
  title: string;
  sub: string;
}) {
  const iconBg =
    tone === "danger" ? "var(--danger-soft)" : tone === "warning" ? "var(--warning-soft)" : "var(--accent-soft)";
  const iconFg =
    tone === "danger" ? "var(--danger)" : tone === "warning" ? "var(--warning)" : "var(--accent)";
  return (
    <div className="row" style={{ padding: 14 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: iconBg,
          color: iconFg,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div className="row-title">{title}</div>
        <div className="row-sub">{sub}</div>
      </div>
      <ChevronRight size={16} color="var(--text-tertiary)" />
    </div>
  );
}

function QuickAction({
  icon,
  label,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  tint: string;
}) {
  return (
    <button type="button" className="card" style={{ ...cardButtonStyle(), padding: 12, gap: 8, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: `${tint}22`,
          color: tint,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{label}</div>
    </button>
  );
}

function QuickTile({
  icon,
  label,
  badge,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: string;
  tint: string;
}) {
  return (
    <button type="button" className="card" style={{ ...cardButtonStyle(), position: "relative", padding: 14, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: `${tint}22`,
          color: tint,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", textAlign: "left" }}>{label}</div>
      {badge ? (
        <span
          className="pill"
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            background: "var(--success)",
            color: "#fff",
          }}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function PetAvatar({ emoji, name, tone }: { emoji: string; name: string; tone: string }) {
  return (
    <div
      aria-label={name}
      style={{
        width: 48,
        height: 48,
        borderRadius: 999,
        background: tone,
        fontSize: 24,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {emoji}
    </div>
  );
}

function PetCard({
  name,
  breed,
  emoji,
  tone,
  preview,
}: {
  name: string;
  breed: string;
  emoji: string;
  tone: string;
  preview: { label: string; text: string; tone: "danger" | "warning" | "muted" };
}) {
  const labelColor =
    preview.tone === "danger" ? "var(--danger)" : preview.tone === "warning" ? "var(--warning)" : "var(--text-secondary)";
  return (
    <button type="button" className="card" style={{ ...cardButtonStyle(), padding: 14 }}>
      <div className="row" style={{ borderTop: "none" }}>
        <PetAvatar emoji={emoji} name={name} tone={tone} />
        <div style={{ flex: 1, textAlign: "left" }}>
          <div className="row-title">{name}</div>
          <div className="row-sub">{breed}</div>
        </div>
        <ChevronRight size={18} color="var(--text-tertiary)" />
      </div>
      <div
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: "0.5px solid var(--separator)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          textAlign: "left",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: labelColor }}>{preview.label}:</span>
        <span style={{ fontSize: 13, color: "var(--text)", flex: 1 }}>{preview.text}</span>
      </div>
    </button>
  );
}

function VaccineRow({
  name,
  sub,
  chip,
}: {
  name: string;
  sub: string;
  chip: { label: string; tone: "success" | "warning" | "danger" };
}) {
  const bg =
    chip.tone === "success"
      ? "var(--accent-soft)"
      : chip.tone === "warning"
        ? "var(--warning-soft)"
        : "var(--danger-soft)";
  const fg =
    chip.tone === "success"
      ? "var(--accent)"
      : chip.tone === "warning"
        ? "var(--warning)"
        : "var(--danger)";
  return (
    <div className="row" style={{ padding: 14 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "var(--accent-soft)",
          color: "var(--accent)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ShieldCheck size={18} />
      </div>
      <div style={{ flex: 1 }}>
        <div className="row-title">{name}</div>
        <div className="row-sub">{sub}</div>
      </div>
      <span
        className="pill"
        style={{ background: bg, color: fg }}
      >
        {chip.label}
      </span>
    </div>
  );
}

function SettingRow({
  icon,
  label,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <div className="row" style={{ padding: 14 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "var(--accent-soft)",
          color: "var(--accent)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div className="row-title">{label}</div>
        <div className="row-sub">{sub}</div>
      </div>
      <ChevronRight size={18} color="var(--text-tertiary)" />
    </div>
  );
}

function cardButtonStyle(): React.CSSProperties {
  return {
    width: "100%",
    appearance: "none",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    transition: "transform 100ms ease",
  };
}
