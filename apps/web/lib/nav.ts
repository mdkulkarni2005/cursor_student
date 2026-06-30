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
  LayersIcon,
  HelpIcon,
} from "@/components/icons";

export type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;
  /** Shown on the mobile bottom bar (max 5 items there). */
  mobile?: boolean;
};

export const WORKSPACE_NAV: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: Home, mobile: true },
  { label: "Semester Hub", href: "/semester", icon: LayersIcon, mobile: true },
  { label: "Vault", href: "/vault", icon: ArchiveIcon, mobile: true },
  { label: "Assignments", href: "/assignments", icon: PencilIcon, mobile: true },
  { label: "Reports & PPT", href: "/reports", icon: SlidesIcon, mobile: true },
  { label: "Viva Prep", href: "/viva", icon: HelpIcon },
  { label: "Resume Builder", href: "/resume", icon: ResumeIcon },
  { label: "Interview Prep", href: "/interview", icon: MicIcon },
  { label: "DSA Practice", href: "/dsa", icon: CodeIcon },
  { label: "Project Ideas", href: "/projects", icon: StarIcon },
];

export const YOU_NAV: NavItem[] = [
  { label: "Profile Link", href: "/profile", icon: LinkIcon },
  { label: "Settings", href: "/settings", icon: GearIcon },
];

export const ALL_NAV = [...WORKSPACE_NAV, ...YOU_NAV];
