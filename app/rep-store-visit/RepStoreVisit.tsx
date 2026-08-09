"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import css from "./RepStoreVisit.module.css";

const KEY_VISITS = "fieldrep_visits";
const KEY_REP = "fieldrep_rep";

const VISIT_TYPES = [
  "Sales Call",
  "Support Visit",
  "Shelf Audit",
  "Delivery Check",
  "Promo Setup",
] as const;

type Fix = {
  lat: number;
  lng: number;
  alt: number | null;
  acc: number;
  ts: number;
};

type Visit = {
  ts: number;
  rep: string;
  store: string;
  type: string;
  contact: string;
  notes: string;
  gps: Fix | null;
};

type GpsState = "idle" | "acquiring" | "locked" | "error";
type Toast = { id: number; msg: string; kind: "ok" | "error" | "info" };

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ~200 m viewport around the pin
function mapUrl(lat: number, lng: number): string {
  const d = 0.002;
  return (
    "https://www.openstreetmap.org/export/embed.html?bbox=" +
    `${(lng - d).toFixed(6)}%2C${(lat - d).toFixed(6)}%2C` +
    `${(lng + d).toFixed(6)}%2C${(lat + d).toFixed(6)}` +
    `&layer=mapnik&marker=${lat.toFixed(6)}%2C${lng.toFixed(6)}`
  );
}

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function RepStoreVisit({ defaultRep }: { defaultRep: string }) {
  const [rep, setRep] = useState(defaultRep);
  const [store, setStore] = useState("");
  const [type, setType] = useState<string>(VISIT_TYPES[0]);
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");

  const [visits, setVisits] = useState<Visit[]>([]);
  const [fix, setFix] = useState<Fix | null>(null);
  const [gps, setGps] = useState<GpsState>("idle");
  const [gpsDetail, setGpsDetail] = useState("No location captured");
  const [hint, setHint] = useState(
    "High-accuracy fix, no cached positions. Allow location access when prompted.",
  );
  const [hintErr, setHintErr] = useState(false);
  const [invalid, setInvalid] = useState<{ rep?: boolean; store?: boolean }>({});
  const [armed, setArmed] = useState(false);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((msg: string, kind: Toast["kind"] = "ok") => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }, []);

  // Restore from localStorage after mount (never during render — SSR has no localStorage)
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY_VISITS) || "[]");
      if (Array.isArray(raw)) setVisits(raw as Visit[]);
    } catch {
      /* corrupt payload — start clean rather than trapping the rep on a broken page */
    }
    try {
      const saved = localStorage.getItem(KEY_REP);
      if (saved) setRep(saved);
    } catch {
      /* storage blocked (Safari Private Mode) — session name stands in */
    }
  }, []);

  const persist = useCallback(
    (next: Visit[]) => {
      setVisits(next);
      try {
        localStorage.setItem(KEY_VISITS, JSON.stringify(next));
      } catch {
        toast("Could not save — device storage is full or blocked.", "error");
      }
    },
    [toast],
  );

  const captureGPS = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setGps("error");
      setGpsDetail("Geolocation not supported");
      setHintErr(true);
      setHint("This browser has no Geolocation API. Visits can still be logged without GPS.");
      toast("Geolocation is not supported on this device.", "error");
      return;
    }

    setGps("acquiring");
    setGpsDetail("Waiting for satellite fix…");
    setHintErr(false);
    setHint("Hold still — a cold fix can take up to 15 seconds.");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = pos.coords;
        const next: Fix = {
          lat: c.latitude,
          lng: c.longitude,
          alt: c.altitude === null || Number.isNaN(c.altitude) ? null : c.altitude,
          acc: c.accuracy,
          ts: pos.timestamp,
        };
        setFix(next);
        setGps("locked");
        setGpsDetail(`±${Math.round(next.acc)} m accuracy`);
        setHintErr(false);
        setHint("Location will be attached to the next logged visit.");
        toast(`Location captured — ±${Math.round(next.acc)} m`);
      },
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? "Permission denied. Enable location for this site in your browser settings, then try again."
            : err.code === err.POSITION_UNAVAILABLE
              ? "Position unavailable. Move outdoors or away from metal roofing and retry."
              : err.code === err.TIMEOUT
                ? "Timed out after 15 seconds. Retry, or log the visit without GPS."
                : "Could not get a location fix.";
        setGps("error");
        setGpsDetail(
          err.code === err.PERMISSION_DENIED
            ? "Permission denied"
            : err.code === err.POSITION_UNAVAILABLE
              ? "Position unavailable"
              : "Request timed out",
        );
        setHintErr(true);
        setHint(msg);
        toast(msg, "error");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }, [toast]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = rep.trim();
    const s = store.trim();
    setInvalid({ rep: !r, store: !s });
    if (!r) {
      toast("Rep name is required.", "error");
      return;
    }
    if (!s) {
      toast("Store name is required.", "error");
      return;
    }

    persist([
      ...visits,
      {
        ts: Date.now(),
        rep: r,
        store: s,
        type,
        contact: contact.trim(),
        notes: notes.trim(),
        gps: fix,
      },
    ]);
    try {
      localStorage.setItem(KEY_REP, r);
    } catch {
      /* non-fatal */
    }

    setStore("");
    setContact("");
    setNotes("");
    toast(fix ? "Visit logged with GPS." : "Visit logged without GPS.", fix ? "ok" : "info");
  }

  function exportCSV() {
    if (!visits.length) {
      toast("Nothing to export yet.", "error");
      return;
    }
    const rows: unknown[][] = [
      [
        "Date",
        "Time",
        "Rep",
        "Store",
        "Visit Type",
        "Contact",
        "GPS Lat",
        "GPS Lng",
        "Accuracy (m)",
        "Notes",
      ],
    ];
    for (const v of visits) {
      const d = new Date(v.ts);
      rows.push([
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        d.toTimeString().slice(0, 8),
        v.rep,
        v.store,
        v.type,
        v.contact,
        v.gps ? v.gps.lat.toFixed(6) : "",
        v.gps ? v.gps.lng.toFixed(6) : "",
        v.gps ? Math.round(v.gps.acc) : "",
        v.notes,
      ]);
    }
    // BOM so Excel on Windows decodes UTF-8 instead of ANSI
    const csv = "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `store-visits-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`Export complete — ${visits.length} visit${visits.length === 1 ? "" : "s"}.`);
  }

  function clearLog() {
    if (!armed) {
      setArmed(true);
      toast(`Tap again within 4s to erase all ${visits.length} visits.`, "info");
      armTimer.current = setTimeout(() => setArmed(false), 4000);
      return;
    }
    if (armTimer.current) clearTimeout(armTimer.current);
    setArmed(false);
    persist([]);
    toast("Visit log cleared.", "info");
  }

  useEffect(() => () => {
    if (armTimer.current) clearTimeout(armTimer.current);
  }, []);

  return (
    <div className={css.wrap}>
      <section className={css.hero}>
        <div className={`${css.beacon} ${css[gps]}`} aria-hidden="true" />
        <div>
          <h1>Rep Store Visit</h1>
          <p>Field logging · GPS verified</p>
        </div>
      </section>

      <form className={css.card} onSubmit={submit} noValidate>
        <h2>Visit Details</h2>

        <div className={css.field}>
          <label htmlFor="rsv-rep">Rep name</label>
          <input
            id="rsv-rep"
            value={rep}
            onChange={(e) => {
              setRep(e.target.value);
              setInvalid((v) => ({ ...v, rep: false }));
            }}
            className={invalid.rep ? css.invalid : undefined}
            placeholder="e.g. Byron Minnie"
            autoComplete="name"
          />
        </div>

        <div className={css.field}>
          <label htmlFor="rsv-store">Store name</label>
          <input
            id="rsv-store"
            value={store}
            onChange={(e) => {
              setStore(e.target.value);
              setInvalid((v) => ({ ...v, store: false }));
            }}
            className={invalid.store ? css.invalid : undefined}
            placeholder="e.g. Build It Polokwane"
          />
        </div>

        <div className={css.field}>
          <label htmlFor="rsv-type">Visit type</label>
          <select id="rsv-type" value={type} onChange={(e) => setType(e.target.value)}>
            {VISIT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className={css.field}>
          <label htmlFor="rsv-contact">
            Contact person <span className={css.opt}>(optional)</span>
          </label>
          <input
            id="rsv-contact"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Who did you see?"
          />
        </div>

        <div className={css.field}>
          <label htmlFor="rsv-notes">Visit notes</label>
          <textarea
            id="rsv-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What happened on this visit?"
          />
        </div>

        <button type="submit" className={css.primary}>
          Log Visit
        </button>
      </form>

      <section className={css.card}>
        <h2>GPS Location</h2>

        <div className={css.gpsStatus}>
          <span className={`${css.beacon} ${css[gps]}`} />
          <strong>
            {gps === "idle"
              ? "Idle"
              : gps === "acquiring"
                ? "Acquiring"
                : gps === "locked"
                  ? "Locked"
                  : "Error"}
          </strong>
          <span>{gpsDetail}</span>
        </div>

        <button
          type="button"
          className={css.gpsBtn}
          onClick={captureGPS}
          disabled={gps === "acquiring"}
        >
          {gps === "acquiring"
            ? "Acquiring…"
            : fix
              ? "Re-capture GPS Location"
              : "Capture GPS Location"}
        </button>

        {fix && (
          <>
            <dl className={css.coords}>
              <div>
                <dt>Latitude</dt>
                <dd>{fix.lat.toFixed(6)}°</dd>
              </div>
              <div>
                <dt>Longitude</dt>
                <dd>{fix.lng.toFixed(6)}°</dd>
              </div>
              <div>
                <dt>Altitude</dt>
                <dd>{fix.alt === null ? "unavailable" : `${fix.alt.toFixed(1)} m`}</dd>
              </div>
              <div>
                <dt>Accuracy</dt>
                <dd>±{Math.round(fix.acc)} m</dd>
              </div>
              <div className={css.wide}>
                <dt>Timestamp</dt>
                <dd>{fmtTime(fix.ts)}</dd>
              </div>
            </dl>
            <div className={css.map}>
              <iframe
                title="Captured location map"
                src={mapUrl(fix.lat, fix.lng)}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </>
        )}

        <p className={`${css.hint} ${hintErr ? css.hintErr : ""}`}>{hint}</p>
      </section>

      <section className={css.card}>
        <h2>
          Visit Log <span className={css.count}>{visits.length}</span>
        </h2>

        {visits.length === 0 ? (
          <p className={css.empty}>No visits logged yet.</p>
        ) : (
          [...visits].reverse().map((v) => (
            <article key={v.ts} className={css.visit}>
              <div className={css.visitTop}>
                <span className={css.storeName}>{v.store}</span>
                <span className={css.visitTime}>{fmtTime(v.ts)}</span>
              </div>
              <div className={css.meta}>
                <span className={css.tag}>{v.type}</span> · {v.rep}
                {v.contact ? ` · ${v.contact}` : ""}
              </div>
              <div className={v.gps ? css.gpsLine : `${css.gpsLine} ${css.gpsNone}`}>
                {v.gps
                  ? `◉ ${v.gps.lat.toFixed(6)}, ${v.gps.lng.toFixed(6)}  ±${Math.round(v.gps.acc)}m`
                  : "○ No GPS"}
              </div>
              {v.notes && <div className={css.notes}>{v.notes}</div>}
            </article>
          ))
        )}

        <div className={css.btnRow}>
          <button type="button" className={css.ghost} onClick={exportCSV}>
            Export CSV
          </button>
          <button type="button" className={css.ghost} onClick={clearLog}>
            {armed ? "Tap again to clear" : "Clear Log"}
          </button>
        </div>
      </section>

      <div className={css.toasts} role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`${css.toast} ${css[t.kind]}`}>
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
