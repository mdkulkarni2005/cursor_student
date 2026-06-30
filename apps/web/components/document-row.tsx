import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { SlidesIcon, PencilIcon, GearIcon, MicIcon, ResumeIcon } from "@/components/icons";
import { NavSpinner } from "@/components/ui/button";
import { DeleteDocButton } from "@/components/delete-doc-button";

type DocType = "REPORT" | "PPT" | "ASSIGNMENT" | "PROJECT" | "VIVA" | "RESUME";

type TypeMeta = {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;
  bg: string;
  text: string;
  href: (id: string) => string;
};

const TYPE_META: Record<DocType, TypeMeta> = {
  REPORT: { label: "Report", icon: SlidesIcon, bg: "bg-cyan/12", text: "text-cyan", href: (id) => `/reports/${id}` },
  PPT: { label: "PPT", icon: SlidesIcon, bg: "bg-indigo/12", text: "text-indigo", href: (id) => `/ppt/${id}` },
  ASSIGNMENT: { label: "Assignment", icon: PencilIcon, bg: "bg-danger/12", text: "text-danger", href: (id) => `/assignments/${id}` },
  PROJECT: { label: "Project", icon: GearIcon, bg: "bg-warning/12", text: "text-warning", href: (id) => `/projects/${id}` },
  VIVA: { label: "Viva", icon: MicIcon, bg: "bg-indigo/12", text: "text-indigo", href: () => "#" },
  RESUME: { label: "Resume", icon: ResumeIcon, bg: "bg-cyan/12", text: "text-cyan", href: (id) => `/resume/${id}` },
};

const STATUS_STYLE: Record<string, string> = {
  READY: "text-success bg-success/12",
  GENERATING: "text-cyan bg-cyan/12",
  QUEUED: "text-muted bg-surface",
  FAILED: "text-danger bg-danger/12",
  DRAFT: "text-muted bg-surface",
};

export type DocumentRowData = {
  id: string;
  type: string;
  title: string;
  status: string;
  createdAt: Date;
};

export function DocumentRow({ doc }: { doc: DocumentRowData }) {
  const m = TYPE_META[(doc.type as DocType) in TYPE_META ? (doc.type as DocType) : "REPORT"];
  const Icon = m.icon;
  return (
    <div className="group relative">
      <Link
        href={m.href(doc.id)}
        className="flex items-center gap-3.5 rounded-xl border border-line bg-card p-3.5 pr-12 transition-colors hover:border-cyan/30"
      >
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${m.bg}`}>
          <Icon size={19} className={m.text} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-ink">{doc.title}</p>
          <p className="text-[12px] text-faint">
            {m.label} ·{" "}
            {new Date(doc.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <NavSpinner className="text-cyan" />
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-opacity group-hover:opacity-0 ${STATUS_STYLE[doc.status] ?? "text-muted bg-surface"}`}
        >
          {doc.status.toLowerCase()}
        </span>
      </Link>
      {/* Delete sits outside the <Link> (no nested anchor) and reveals on hover. */}
      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <DeleteDocButton docId={doc.id} kind={m.label.toLowerCase()} compact />
      </div>
    </div>
  );
}
