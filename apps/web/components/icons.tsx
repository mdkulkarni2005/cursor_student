import type { SVGProps } from "react";

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

/** Polaris mark — a four-point star/sparkle. Rendered filled. */
export function Sparkle({ size = 18, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2l2.4 6.5L21 11l-6.6 2.5L12 20l-2.4-6.5L3 11l6.6-2.5L12 2z" />
    </svg>
  );
}

export const Home = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 10l9-7 9 7v9a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <path d="M9 21V12h6v9" />
  </Base>
);

export const ResumeIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <path d="M14 2v6h6M8 13h8M8 17h8" />
  </Base>
);

export const MicIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 2a3 3 0 00-3 3v6a3 3 0 006 0V5a3 3 0 00-3-3z" />
    <path d="M19 10v1a7 7 0 01-14 0v-1M12 18v4" />
  </Base>
);

export const CodeIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
  </Base>
);

export const VideoIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="2" y="6" width="14" height="12" rx="2" />
    <path d="M16 10.5l6-3.5v10l-6-3.5" />
  </Base>
);

export const GearIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M9.6 3.5a2 2 0 014.8 0l.3 1.3 1.3.5 1.2-.7a2 2 0 012.4 2.4l-.7 1.2.5 1.3 1.3.3a2 2 0 010 4.8l-1.3.3-.5 1.3.7 1.2a2 2 0 01-2.4 2.4l-1.2-.7-1.3.5-.3 1.3a2 2 0 01-4.8 0l-.3-1.3-1.3-.5-1.2.7a2 2 0 01-2.4-2.4l.7-1.2-.5-1.3-1.3-.3a2 2 0 010-4.8l1.3-.3.5-1.3-.7-1.2a2 2 0 012.4-2.4l1.2.7 1.3-.5z" />
    <circle cx="12" cy="12" r="3" />
  </Base>
);

export const PencilIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
  </Base>
);

export const SlidesIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M9 21V9" />
  </Base>
);

export const LinkIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M10 13a5 5 0 007 0l2-2a5 5 0 00-7-7l-1 1" />
    <path d="M14 11a5 5 0 00-7 0l-2 2a5 5 0 007 7l1-1" />
  </Base>
);

export const StarIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L3.8 7.7l5.4-.8z" />
  </Base>
);

export const SearchIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4-4" />
  </Base>
);

export const BellIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 01-3.4 0" />
  </Base>
);

export const PlusIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);

export const ChevronDown = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 9l6 6 6-6" />
  </Base>
);

export const ChatIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M21 11.5a8.4 8.4 0 01-9 8.4 8.4 8.4 0 01-3.8-.9L3 20l1.3-3.9A8.4 8.4 0 1121 11.5z" />
  </Base>
);

/** AI mentor glyph — a small robot/spark used on the assistant bubble. */
export const BotIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 8V4M8 12H4m16 0h-4m-4 4v4" />
    <rect x="8" y="8" width="8" height="8" rx="2" />
  </Base>
);

export const ArchiveIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="4" width="18" height="4" rx="1" />
    <path d="M5 8v11a1 1 0 001 1h12a1 1 0 001-1V8M10 12h4" />
  </Base>
);

export const LayersIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 2l9 5-9 5-9-5 9-5z" />
    <path d="M3 12l9 5 9-5M3 17l9 5 9-5" />
  </Base>
);

export const TrashIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7v12a1 1 0 001 1h10a1 1 0 001-1V7M10 11v5M14 11v5" />
  </Base>
);

export const HelpIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9a2.5 2.5 0 015 0c0 1.7-2.5 2-2.5 3.5" />
    <path d="M12 17h.01" />
  </Base>
);
