"use client";

import { useState } from "react";
import styles from "./WhatsAppBlast.module.css";

const REPS = [
  { code: "AC", name: "Aboo Cassim" },
  { code: "AP", name: "Amit Patel" },
  { code: "BV", name: "Bhadresh Vallabh" },
  { code: "NP", name: "Nikhil Panchal" },
  { code: "BM", name: "Byron Minnie" },
];

type Result = { code: string; name: string; ok: boolean; error?: string };

export default function WhatsAppBlast() {
  const [selected, setSelected] = useState<Set<string>>(new Set(REPS.map((r) => r.code)));
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);

  const allSelected = selected.size === REPS.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(REPS.map((r) => r.code)));
  }

  function toggleRep(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  }

  async function handleSend() {
    if (!message.trim()) return;
    if (selected.size === 0) return;

    const names = REPS.filter((r) => selected.has(r.code)).map((r) => r.name).join(", ");
    if (!confirm(`Send to ${names}?`)) return;

    setSending(true);
    setResults(null);
    setFatalError(null);

    try {
      const res = await fetch("/api/admin/whatsapp-blast", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: message.trim(), reps: Array.from(selected) }),
      });

      if (!res.ok) {
        setFatalError(await res.text());
        return;
      }

      const data: Result[] = await res.json();
      setResults(data);
    } catch (err) {
      setFatalError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSending(false);
    }
  }

  const sentOk  = results?.filter((r) => r.ok).length ?? 0;
  const sentFail = results?.filter((r) => !r.ok).length ?? 0;

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h2 className={styles.sectionHead}>Recipients</h2>
        <p className={styles.hint}>Select which reps will receive this message via WhatsApp.</p>

        <label className={styles.repRow}>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className={styles.check}
          />
          <span className={styles.repName} style={{ fontWeight: 700 }}>
            Select all
          </span>
          <span className={styles.repCount}>{selected.size} / {REPS.length}</span>
        </label>

        <div className={styles.divider} />

        {REPS.map((rep) => (
          <label key={rep.code} className={styles.repRow}>
            <input
              type="checkbox"
              checked={selected.has(rep.code)}
              onChange={() => toggleRep(rep.code)}
              className={styles.check}
            />
            <span className={styles.repCode}>{rep.code}</span>
            <span className={styles.repName}>{rep.name}</span>
          </label>
        ))}
      </div>

      <div className={styles.card}>
        <h2 className={styles.sectionHead}>Message</h2>
        <p className={styles.hint}>Sent as a plain WhatsApp text message from the Olympic Paints number.</p>
        <textarea
          className={styles.textarea}
          rows={6}
          placeholder="Type your message here…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={sending}
        />
        <div className={styles.charCount}>{message.length} chars</div>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.sendBtn}
          onClick={handleSend}
          disabled={sending || selected.size === 0 || !message.trim()}
        >
          {sending ? "Sending…" : `Send to ${selected.size} rep${selected.size !== 1 ? "s" : ""}`}
        </button>
      </div>

      {fatalError && (
        <div className={styles.errorBox}>{fatalError}</div>
      )}

      {results && (
        <div className={styles.card}>
          <h2 className={styles.sectionHead}>
            Results &mdash;{" "}
            <span style={{ color: "var(--_teal)" }}>{sentOk} sent</span>
            {sentFail > 0 && <span style={{ color: "var(--_coral)" }}>, {sentFail} failed</span>}
          </h2>
          <div className={styles.resultList}>
            {results.map((r) => (
              <div key={r.code} className={r.ok ? styles.resultOk : styles.resultFail}>
                <span className={styles.resultCode}>{r.code}</span>
                <span className={styles.resultName}>{r.name}</span>
                <span className={styles.resultStatus}>
                  {r.ok ? "✓ Sent" : `✗ ${r.error ?? "Failed"}`}
                </span>
              </div>
            ))}
          </div>
          {sentOk === results.length && (
            <p className={styles.allGood}>All messages delivered successfully.</p>
          )}
        </div>
      )}
    </div>
  );
}
