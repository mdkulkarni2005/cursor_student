import type { ComponentType, SVGProps } from "react";
import {
  Home,
  ResumeIcon,
  MicIcon,
  CodeIcon,
  GearIcon,
  PencilIcon,
  SlidesIcon,
  StarIcon,
  ArchiveIcon,
  HelpIcon,
  ChatIcon,
  VideoIcon,
  LayersIcon,
} from "@/components/icons";

export type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;
  /** Shown on the mobile bottom bar (max 5 items there). */
  mobile?: boolean;
  /** Hidden for PROFESSIONAL users — the student-only self-serve toolkit. */
  studentOnly?: boolean;
  /** Branch-specific tool — hidden unless hasBranchFeature(user.department, this) is true. */
  branchFeature?: string;
};

export const WORKSPACE_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home, mobile: true },
  { label: "Vault", href: "/vault", icon: ArchiveIcon, mobile: true, studentOnly: true },
  { label: "Assignments", href: "/assignments", icon: PencilIcon, mobile: true, studentOnly: true },
  { label: "Reports & PPT", href: "/reports", icon: SlidesIcon, mobile: true, studentOnly: true },
  { label: "Lab Reports", href: "/lab-reports", icon: LayersIcon, studentOnly: true },
  { label: "Mechanical Solver", href: "/solve/mech-solver", icon: CodeIcon, studentOnly: true, branchFeature: "mech-solver" },
  { label: "Drawing Viva Prep", href: "/drawing-viva", icon: HelpIcon, studentOnly: true, branchFeature: "drawing-viva" },
  { label: "Structural Checker", href: "/solve/structural-checker", icon: CodeIcon, studentOnly: true, branchFeature: "structural-checker" },
  { label: "BOQ Estimator", href: "/boq-estimator", icon: LayersIcon, studentOnly: true, branchFeature: "boq-estimator" },
  { label: "Electrical Solver", href: "/solve/ee-solver", icon: CodeIcon, studentOnly: true, branchFeature: "ee-solver" },
  { label: "ECE Solver", href: "/solve/ece-solver", icon: CodeIcon, studentOnly: true, branchFeature: "ece-solver" },
  { label: "Chemical Solver", href: "/solve/chem-solver", icon: CodeIcon, studentOnly: true, branchFeature: "chem-solver" },
  { label: "Viva Prep", href: "/viva", icon: HelpIcon, studentOnly: true },
  { label: "Resume Builder", href: "/resume", icon: ResumeIcon, studentOnly: true },
  { label: "Interview Prep", href: "/interview", icon: MicIcon },
  { label: "DSA Practice", href: "/dsa", icon: CodeIcon },
  { label: "Project Ideas", href: "/projects", icon: StarIcon, studentOnly: true },
  // Hidden unless the student has an ACCEPTED InterviewSchedule inside the join window — see
  // hasJoinableRealInterview() and its filter in app-shell.tsx. Not visible by default.
  { label: "Real Interview", href: "/real-interview", icon: VideoIcon },
];

export const YOU_NAV: NavItem[] = [
  { label: "Messages", href: "/messages", icon: ChatIcon },
  { label: "Settings", href: "/settings", icon: GearIcon },
];

export const ALL_NAV = [...WORKSPACE_NAV, ...YOU_NAV];
