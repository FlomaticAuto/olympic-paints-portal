import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Cloudflare R2 (S3-compatible) — file management dashboard file browser.
// Same bucket as the rep weekly/monthly KPI reports (olympic-paints-rep-reports),
// under top-level area-name prefixes (Sales/, Operations/, Colour Cafe/, etc).
export const R2_BUCKET = "olympic-paints-rep-reports";

export const AREAS = [
  "Sales",
  "Reps",
  "Merchandising",
  "Resin",
  "Supply Chain",
  "HR",
  "Health and Safety",
  "Marketing",
  "Colour Cafe",
  "Operations",
  "Admin and Filing",
] as const;

// "Reps" is a virtual area: the automated weekly/monthly KPI report pipeline
// (build_rep_weekly_kpi.py / build_rep_monthly_kpi.py) writes real report
// PDFs to flat {rep_code}/{period}.pdf keys at the bucket root, not under a
// Reps/ prefix. Rather than duplicate those files (which would go stale the
// next time the pipeline runs), Reps/ transparently maps onto those
// rep-code prefixes so the dashboard always shows the live reports.
export const REP_CODES = ["BV", "AP", "AC", "NP"] as const;
const REP_FULL_NAME: Record<string, string> = {
  BV: "Bhadresh Vallabh",
  AP: "Amit Patel",
  AC: "Aboo Cassim",
  NP: "Nikhil Panchal",
};

function r2Client() {
  const endpoint = process.env.R2_ENDPOINT_URL;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2_ENDPOINT_URL, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY must be set for the File Management dashboard.",
    );
  }
  return new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export type R2Entry = {
  name: string;
  key: string;
  isFolder: boolean;
  size: number | null;
  lastModified: string | null;
};

// Lists the immediate children of `prefix` (folders + files), one level deep —
// mirrors a normal file browser rather than returning every nested key at once.
export async function listChildren(prefix: string): Promise<R2Entry[]> {
  // Reps/ virtual area: list the rep-code prefixes instead of a real Reps/ key.
  if (prefix === "Reps/") {
    return REP_CODES.map((code) => ({
      name: REP_FULL_NAME[code],
      key: `Reps/${code}/`,
      isFolder: true,
      size: null,
      lastModified: null,
    }));
  }

  // Reps/<CODE>/ virtual sub-area: list that rep's real {code}/ prefix, but
  // report entries back under the virtual Reps/<CODE>/ key so breadcrumbs
  // and downloads stay within the virtual namespace.
  const repMatch = prefix.match(/^Reps\/([A-Z]+)\/$/);
  const realPrefix = repMatch ? `${repMatch[1]}/` : prefix;
  const displayPrefix = repMatch ? prefix : realPrefix;

  const client = r2Client();
  const normalizedPrefix = realPrefix && !realPrefix.endsWith("/") ? `${realPrefix}/` : realPrefix;

  const entries: R2Entry[] = [];
  let continuationToken: string | undefined;

  do {
    const resp = await client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        Prefix: normalizedPrefix,
        Delimiter: "/",
        ContinuationToken: continuationToken,
      }),
    );

    for (const cp of resp.CommonPrefixes ?? []) {
      if (!cp.Prefix) continue;
      const name = cp.Prefix.replace(normalizedPrefix, "").replace(/\/$/, "");
      entries.push({ name, key: `${displayPrefix}${name}/`, isFolder: true, size: null, lastModified: null });
    }

    for (const obj of resp.Contents ?? []) {
      if (!obj.Key || obj.Key === normalizedPrefix) continue;
      const name = obj.Key.replace(normalizedPrefix, "");
      if (!name || name === ".keep") continue; // hide folder placeholder markers
      entries.push({
        name,
        key: `${displayPrefix}${name}`,
        isFolder: false,
        size: obj.Size ?? null,
        lastModified: obj.LastModified?.toISOString() ?? null,
      });
    }

    continuationToken = resp.IsTruncated ? resp.NextContinuationToken : undefined;
  } while (continuationToken);

  entries.sort((a, b) => {
    if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return entries;
}

// Resolves a dashboard-facing key to the real R2 key. Reps/<CODE>/<file> is
// virtual (see listChildren) and maps to the real <CODE>/<file> key that the
// weekly/monthly KPI report pipeline actually writes.
function resolveRealKey(key: string): string {
  const repMatch = key.match(/^Reps\/([A-Z]+)\/(.+)$/);
  return repMatch ? `${repMatch[1]}/${repMatch[2]}` : key;
}

export async function presignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  const client = r2Client();
  const realKey = resolveRealKey(key);
  return getSignedUrl(client, new GetObjectCommand({ Bucket: R2_BUCKET, Key: realKey }), { expiresIn });
}
