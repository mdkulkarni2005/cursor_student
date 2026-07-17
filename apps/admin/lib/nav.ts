import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  ShieldCheck,
  CreditCard,
  Tag,
  Wallet,
  Settings,
  ListChecks,
  FileText,
  Code2,
  LifeBuoy,
  MessageSquare,
  ScrollText,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  superAdminOnly?: boolean;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

/** Single source of truth for admin nav — sidebar, breadcrumb labels, and the command palette
 * all read from this so a new section only needs to be added in one place. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/", label: "Overview", icon: LayoutDashboard }],
  },
  {
    label: "Users & Access",
    items: [
      { href: "/users", label: "Users", icon: Users },
      { href: "/institutions", label: "Institutions", icon: Building2 },
      { href: "/recruiters", label: "Recruiters", icon: Briefcase },
      { href: "/admins", label: "Admins", icon: ShieldCheck, superAdminOnly: true },
    ],
  },
  {
    label: "Monetization",
    items: [
      { href: "/plans", label: "Plans", icon: CreditCard },
      { href: "/promo-codes", label: "Promo Codes", icon: Tag },
      { href: "/payments", label: "Payments", icon: Wallet },
      { href: "/platform", label: "Platform", icon: Settings },
    ],
  },
  {
    label: "Content & Jobs",
    items: [
      { href: "/jobs", label: "Jobs", icon: ListChecks },
      { href: "/templates", label: "Templates", icon: FileText },
      { href: "/dsa-problems", label: "DSA Problems", icon: Code2 },
    ],
  },
  {
    label: "Support",
    items: [
      { href: "/support", label: "Support", icon: LifeBuoy },
      { href: "/feedback", label: "Feedback", icon: MessageSquare },
      { href: "/audit", label: "Audit", icon: ScrollText },
    ],
  },
];

/** Flat href -> label map for breadcrumbs (top-level routes only; dynamic segments are supplied
 * by the page itself via the `items` override on <Breadcrumbs>). */
export const NAV_LABELS: Record<string, string> = Object.fromEntries(
  NAV_GROUPS.flatMap((g) => g.items).map((i) => [i.href, i.label])
);

export const NAV_ITEMS_FLAT: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

/** href -> NavItem (incl. icon component). Client components look items up here by href instead
 * of receiving them as props from a server component — passing an icon component reference
 * across the server/client boundary isn't serializable and throws at runtime. */
export const NAV_ITEMS_BY_HREF: Record<string, NavItem> = Object.fromEntries(
  NAV_ITEMS_FLAT.map((i) => [i.href, i])
);
