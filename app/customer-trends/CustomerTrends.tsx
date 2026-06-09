"use client";

import { useState } from "react";

const TABS = [
  {
    id: "store-health",
    label: "Store Health",
    url: "https://flomaticauto.github.io/olympic-paints-store-health/",
    description: "Account-level visit cadence and risk scores",
  },
  {
    id: "velocity",
    label: "Revenue Velocity",
    url: "https://flomaticauto.github.io/olympic-paints-velocity/",
    description: "Sales momentum and trend analysis by rep and product",
  },
] as const;

export default function CustomerTrends() {
  const [active, setActive] = useState<string>("store-health");
  const tab = TABS.find((t) => t.id === active)!;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100dvh - 45px)" }}>
      {/* Header */}
      <div
        style={{
          padding: "16px 24px 0",
          background: "var(--color-surface-page)",
          borderBottom: "1px solid var(--color-border-default)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 22,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: "var(--color-text-primary)",
              margin: 0,
            }}
          >
            Customer Trends
          </h1>
          <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
            {tab.description}
          </span>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4 }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              style={{
                padding: "8px 20px",
                border: "none",
                borderBottom: active === t.id
                  ? "2px solid var(--color-brand-primary)"
                  : "2px solid transparent",
                background: "none",
                color: active === t.id
                  ? "var(--color-text-primary)"
                  : "var(--color-text-secondary)",
                fontFamily: "var(--font-body)",
                fontSize: 13,
                fontWeight: active === t.id ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.15s",
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Iframe — fills remaining height */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {TABS.map((t) => (
          <iframe
            key={t.id}
            src={t.url}
            title={t.label}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              border: "none",
              display: active === t.id ? "block" : "none",
            }}
          />
        ))}
      </div>
    </div>
  );
}
