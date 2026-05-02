"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { compatibility, type NumerologySnapshot } from "@/lib/numerology";
import { Empty } from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import type { CombinedProfile } from "@/lib/numerology/filters";

type SortKey =
  | "numId"
  | "fullName"
  | "relationship"
  | "dob"
  | "lifePath"
  | "destiny"
  | "soulUrge"
  | "personality"
  | "birthday"
  | "western"
  | "chinese"
  | "personalYear"
  | "compatibility"
  | "createdAt";

type SortDir = "asc" | "desc";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function compareStrings(a: string, b: string): number {
  return a.localeCompare(b);
}

export function NumDatabase({
  rows,
  selfSnap
}: {
  rows: CombinedProfile[];
  selfSnap: NumerologySnapshot | null;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("numId");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const enriched = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        compatibilityWithMe:
          selfSnap && r.source === "other"
            ? compatibility(selfSnap, r.snap).overall
            : null
      })),
    [rows, selfSnap]
  );

  const sorted = useMemo(() => {
    const arr = [...enriched];
    arr.sort((a, b) => {
      let diff = 0;
      switch (sortKey) {
        case "numId": {
          const an = Number(a.numId.replace("NUM", "")) || 0;
          const bn = Number(b.numId.replace("NUM", "")) || 0;
          diff = an - bn;
          break;
        }
        case "fullName":
          diff = compareStrings(a.fullName, b.fullName);
          break;
        case "relationship":
          diff = compareStrings(a.relationship, b.relationship);
          break;
        case "dob":
          diff = compareStrings(a.dob, b.dob);
          break;
        case "lifePath":
          diff = a.snap.lifePath - b.snap.lifePath;
          break;
        case "destiny":
          diff = a.snap.destiny - b.snap.destiny;
          break;
        case "soulUrge":
          diff = a.snap.soulUrge - b.snap.soulUrge;
          break;
        case "personality":
          diff = a.snap.personality - b.snap.personality;
          break;
        case "birthday":
          diff = a.snap.birthday - b.snap.birthday;
          break;
        case "western":
          diff = compareStrings(a.snap.western, b.snap.western);
          break;
        case "chinese":
          diff = compareStrings(a.snap.chinese, b.snap.chinese);
          break;
        case "personalYear":
          diff = a.snap.personalYear - b.snap.personalYear;
          break;
        case "compatibility":
          diff = (a.compatibilityWithMe ?? -1) - (b.compatibilityWithMe ?? -1);
          break;
        case "createdAt":
          diff = compareStrings(a.createdAt, b.createdAt);
          break;
      }
      return sortDir === "asc" ? diff : -diff;
    });
    return arr;
  }, [enriched, sortKey, sortDir]);

  function setSort(k: SortKey) {
    if (k === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      setSortDir(k === "createdAt" || k === "compatibility" ? "desc" : "asc");
    }
  }

  if (!enriched.length) {
    return (
      <Empty
        title="No people in the database"
        description="Add yourself in My Profile and people in Calculate For Others. Filters at the top of the page narrow what shows up here."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-bg-elevated">
      <table className="min-w-full text-xs">
        <thead className="bg-bg-soft/60 text-fg-muted">
          <tr>
            <SortHeader col="numId" label="ID" sortKey={sortKey} sortDir={sortDir} onClick={setSort} />
            <SortHeader col="fullName" label="Name" sortKey={sortKey} sortDir={sortDir} onClick={setSort} />
            <th className="px-3 py-2 text-left font-medium">Nicknames</th>
            <SortHeader col="relationship" label="Relationship" sortKey={sortKey} sortDir={sortDir} onClick={setSort} />
            <SortHeader col="dob" label="DOB" sortKey={sortKey} sortDir={sortDir} onClick={setSort} />
            <SortHeader col="lifePath" label="LP" sortKey={sortKey} sortDir={sortDir} onClick={setSort} align="right" />
            <SortHeader col="destiny" label="Dest" sortKey={sortKey} sortDir={sortDir} onClick={setSort} align="right" />
            <SortHeader col="soulUrge" label="SU" sortKey={sortKey} sortDir={sortDir} onClick={setSort} align="right" />
            <SortHeader col="personality" label="Per" sortKey={sortKey} sortDir={sortDir} onClick={setSort} align="right" />
            <SortHeader col="birthday" label="Bday#" sortKey={sortKey} sortDir={sortDir} onClick={setSort} align="right" />
            <SortHeader col="western" label="Western" sortKey={sortKey} sortDir={sortDir} onClick={setSort} />
            <SortHeader col="chinese" label="Chinese" sortKey={sortKey} sortDir={sortDir} onClick={setSort} />
            <SortHeader col="personalYear" label="PY" sortKey={sortKey} sortDir={sortDir} onClick={setSort} align="right" />
            <SortHeader col="compatibility" label="vs You" sortKey={sortKey} sortDir={sortDir} onClick={setSort} align="right" />
            <SortHeader col="createdAt" label="Added" sortKey={sortKey} sortDir={sortDir} onClick={setSort} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr
              key={r.rowId}
              className={cn(
                "border-t border-line",
                r.source === "self" && "bg-brand-500/5"
              )}
            >
              <td className="px-3 py-2 font-mono text-[11px] font-semibold text-brand-200">
                {r.numId}
                {r.source === "self" && (
                  <span className="ml-1 text-[9px] uppercase text-brand-300">you</span>
                )}
              </td>
              <td className="px-3 py-2 font-medium text-fg">{r.fullName}</td>
              <td className="px-3 py-2 text-fg-muted">
                {r.nicknames.length === 0 ? "—" : r.nicknames.join(", ")}
              </td>
              <td className="px-3 py-2 text-fg-muted">{r.relationship || "—"}</td>
              <td className="px-3 py-2 text-fg-muted">{formatDate(r.dob)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{r.snap.lifePath}</td>
              <td className="px-3 py-2 text-right tabular-nums">{r.snap.destiny}</td>
              <td className="px-3 py-2 text-right tabular-nums">{r.snap.soulUrge}</td>
              <td className="px-3 py-2 text-right tabular-nums">{r.snap.personality}</td>
              <td className="px-3 py-2 text-right tabular-nums">{r.snap.birthday}</td>
              <td className="px-3 py-2">{r.snap.western}</td>
              <td className="px-3 py-2">{r.snap.chinese}</td>
              <td className="px-3 py-2 text-right tabular-nums">{r.snap.personalYear}</td>
              <td
                className={cn(
                  "px-3 py-2 text-right tabular-nums font-semibold",
                  r.compatibilityWithMe == null
                    ? "text-fg-subtle"
                    : r.compatibilityWithMe >= 70
                      ? "text-success"
                      : r.compatibilityWithMe >= 50
                        ? "text-fg"
                        : "text-warn"
                )}
              >
                {r.compatibilityWithMe == null ? "—" : `${r.compatibilityWithMe}/100`}
              </td>
              <td className="px-3 py-2 text-fg-muted">{formatDate(r.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SortHeader({
  col,
  label,
  sortKey,
  sortDir,
  onClick,
  align = "left"
}: {
  col: SortKey;
  label: string;
  sortKey: SortKey;
  sortDir: SortDir;
  onClick: (k: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = sortKey === col;
  return (
    <th className={cn("px-3 py-2 font-medium", align === "right" ? "text-right" : "text-left")}>
      <button
        type="button"
        onClick={() => onClick(col)}
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-xs transition hover:bg-bg-soft hover:text-fg",
          active && "text-fg"
        )}
      >
        {label}
        {active ? (
          sortDir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </th>
  );
}
