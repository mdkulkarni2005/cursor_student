import type { ComponentType, SVGProps } from "react";
import {
  Home,
  ResumeIcon,
  MicIcon,
  CodeIcon,
  GearIcon,
  PencilIcon,
  SlidesIcon,
  LinkIcon,
  StarIcon,
  ArchiveIcon,
  HelpIcon,
  ChatIcon,
  VideoIcon,
} from "@/components/icons";

export type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;
  /** Shown on the mobile bottom bar (max 5 items there). */
  mobile?: boolean;
  /** Hidden for PROFESSIONAL users — the student-only self-serve toolkit. */
  studentOnly?: boolean;
};

export const WORKSPACE_NAV: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: Home, mobile: true },
  { label: "Vault", href: "/vault", icon: ArchiveIcon, mobile: true, studentOnly: true },
  { label: "Assignments", href: "/assignments", icon: PencilIcon, mobile: true, studentOnly: true },
  { label: "Reports & PPT", href: "/reports", icon: SlidesIcon, mobile: true, studentOnly: true },
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
  { label: "Profile Link", href: "/profile", icon: LinkIcon },
  { label: "Messages", href: "/messages", icon: ChatIcon },
  { label: "Settings", href: "/settings", icon: GearIcon },
];

export const ALL_NAV = [...WORKSPACE_NAV, ...YOU_NAV];
