"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./FileManagement.module.css";

type Entry = {
  name: string;
  key: string;
  isFolder: boolean;
  size: number | null;
  lastModified: string | null;
};

function formatSize(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
}

function fileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "📄";
  if (["xlsx", "xls", "csv"].includes(ext)) return "📊";
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "🖼️";
  if (["doc", "docx"].includes(ext)) return "📝";
  if (["html", "htm"].includes(ext)) return "🌐";
  if (["zip", "rar", "7z"].includes(ext)) return "🗜️";
  return "📁";
}

export default function FileManagementBrowser() {
  const [prefix, setPrefix] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/file-management/browse?prefix=${encodeURIComponent(p)}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setEntries(data.entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(prefix);
  }, [prefix, load]);

  async function openFile(key: string) {
    const res = await fetch(`/api/file-management/download?key=${encodeURIComponent(key)}`);
    if (!res.ok) {
      alert(`Could not open file: ${await res.text()}`);
      return;
    }
    const { url } = await res.json();
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const crumbs = prefix.split("/").filter(Boolean);

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <h1 className={styles.title}>File Management</h1>
        <p className={styles.subtitle}>Browse company files stored in Cloudflare R2, by area</p>
      </div>

      <div className={styles.breadcrumbs}>
        <button className={styles.crumb} onClick={() => setPrefix("")}>
          Areas
        </button>
        {crumbs.map((c, i) => {
          const path = crumbs.slice(0, i + 1).join("/") + "/";
          return (
            <span key={path} className={styles.crumbGroup}>
              <span className={styles.crumbSep}>/</span>
              <button className={styles.crumb} onClick={() => setPrefix(path)}>
                {c}
              </button>
            </span>
          );
        })}
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}

      {loading ? (
        <div className={styles.empty}>Loading…</div>
      ) : entries.length === 0 ? (
        <div className={styles.empty}>No files here yet.</div>
      ) : (
        <div className={styles.list}>
          {entries.map((e) => (
            <div
              key={e.key}
              className={styles.row}
              onClick={() => (e.isFolder ? setPrefix(e.key) : openFile(e.key))}
              role="button"
              tabIndex={0}
            >
              <span className={styles.icon}>{e.isFolder ? "📂" : fileIcon(e.name)}</span>
              <span className={styles.name}>{e.name}</span>
              {!e.isFolder && (
                <>
                  <span className={styles.meta}>{formatSize(e.size)}</span>
                  <span className={styles.meta}>{formatDate(e.lastModified)}</span>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
