"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AiSettingsTab } from "./AiSettingsTab";
import { ApiTab } from "./ApiTab";
import { ApplicationTab } from "./ApplicationTab";

const TABS = [
  {
    id: "ai",
    label: "AI settings",
    icon: "auto_awesome",
    sub: "Your provider, model and generation controls. These persist across the whole workspace.",
  },
  {
    id: "api",
    label: "API",
    icon: "api",
    sub: "Programmatic access to your projects, and publishing to InstaGuru Marketplace.",
  },
  {
    id: "application",
    label: "Application",
    icon: "tune",
    sub: "Appearance, editor behaviour and the writing rules every project inherits.",
  },
] as const;

type TabId = (typeof TABS)[number]["id"];

const isTabId = (value: string | null): value is TabId => TABS.some((tab) => tab.id === value);

function SettingsTabs() {
  // ?tab=api is how the publish flow deep-links here when the API is not set up
  // yet. Only the initial tab comes from the URL; after that the buttons own it.
  const requested = useSearchParams().get("tab");
  const [tab, setTab] = useState<TabId>(isTabId(requested) ? requested : "ai");

  const select = (next: TabId) => {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  };

  const active = TABS.find((item) => item.id === tab) ?? TABS[0];

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">{active.sub}</p>
        </div>
      </div>

      <div className="tabs !mb-4" role="tablist" aria-label="Settings sections">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            className="tab"
            data-active={tab === item.id}
            aria-selected={tab === item.id}
            onClick={() => select(item.id)}
          >
            <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      {tab === "ai" && <AiSettingsTab />}
      {tab === "api" && <ApiTab />}
      {tab === "application" && <ApplicationTab />}
    </>
  );
}

export default function SettingsPage() {
  return (
    <div className="page">
      {/* useSearchParams opts this subtree into client rendering, so the
          boundary keeps the shell prerenderable. */}
      <Suspense
        fallback={
          <div className="page-head">
            <h1 className="page-title">Settings</h1>
          </div>
        }
      >
        <SettingsTabs />
      </Suspense>
    </div>
  );
}
