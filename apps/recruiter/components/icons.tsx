import type { SVGProps } from "react";

/** Small stroke-icon set for the recruiter marketing surfaces — mirrors apps/web's
 *  components/icons.tsx (same Base-wrapper convention) since apps/recruiter is a separate
 *  Next.js app and can't import across apps directly. */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 18, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export const BadgeCheckIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 2l2.2 1.3 2.6-.3 1.1 2.3 2.3 1.1-.3 2.6L21.2 11l-1.3 2.2.3 2.6-2.3 1.1-1.1 2.3-2.6-.3L12 20.2l-2.2-1.3-2.6.3-1.1-2.3-2.3-1.1.3-2.6L2.8 11l1.3-2.2-.3-2.6 2.3-1.1L7.2 3l2.6.3z" />
    <path d="M8.5 12l2.5 2.5 4.5-5" />
  </Base>
);

export const BarChartIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </Base>
);

export const VideoIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="2" y="6" width="14" height="12" rx="2" />
    <path d="M16 10.5l6-3.5v10l-6-3.5" />
  </Base>
);

export const ChatIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
  </Base>
);

export const GraduationCapIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M22 10L12 5 2 10l10 5 10-5z" />
    <path d="M6 12.5V17c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5" />
    <path d="M22 10v6" />
  </Base>
);

export const BriefcaseIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16M2 13h20" />
  </Base>
);
