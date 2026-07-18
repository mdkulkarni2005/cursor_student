import Svg, { Circle, Path, Rect } from "react-native-svg";

export type IconProps = { size?: number; color?: string };

/** Ported 1:1 from apps/web/components/icons.tsx path data, so mobile icons match web exactly. */
function Base({ size = 18, color = "currentColor", children }: IconProps & { children: React.ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </Svg>
  );
}

export function PencilIcon(p: IconProps) {
  return (
    <Base {...p}>
      <Path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
    </Base>
  );
}

export function SlidesIcon(p: IconProps) {
  return (
    <Base {...p}>
      <Rect x="3" y="3" width="18" height="18" rx="2" />
      <Path d="M3 9h18M9 21V9" />
    </Base>
  );
}

export function ResumeIcon(p: IconProps) {
  return (
    <Base {...p}>
      <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <Path d="M14 2v6h6M8 13h8M8 17h8" />
    </Base>
  );
}

export function LayersIcon(p: IconProps) {
  return (
    <Base {...p}>
      <Path d="M12 2l9 5-9 5-9-5 9-5z" />
      <Path d="M3 12l9 5 9-5M3 17l9 5 9-5" />
    </Base>
  );
}

export function StarIcon(p: IconProps) {
  return (
    <Base {...p}>
      <Path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L3.8 7.7l5.4-.8z" />
    </Base>
  );
}

export function SearchIcon(p: IconProps) {
  return (
    <Base {...p}>
      <Circle cx="11" cy="11" r="7" />
      <Path d="M21 21l-4-4" />
    </Base>
  );
}

export function ArchiveIcon(p: IconProps) {
  return (
    <Base {...p}>
      <Rect x="3" y="4" width="18" height="4" rx="1" />
      <Path d="M5 8v11a1 1 0 001 1h12a1 1 0 001-1V8M10 12h4" />
    </Base>
  );
}

export function GearIcon(p: IconProps) {
  return (
    <Base {...p}>
      <Path d="M9.6 3.5a2 2 0 014.8 0l.3 1.3 1.3.5 1.2-.7a2 2 0 012.4 2.4l-.7 1.2.5 1.3 1.3.3a2 2 0 010 4.8l-1.3.3-.5 1.3.7 1.2a2 2 0 01-2.4 2.4l-1.2-.7-1.3.5-.3 1.3a2 2 0 01-4.8 0l-.3-1.3-1.3-.5-1.2.7a2 2 0 01-2.4-2.4l.7-1.2-.5-1.3-1.3-.3a2 2 0 010-4.8l1.3-.3.5-1.3-.7-1.2a2 2 0 012.4-2.4l1.2.7 1.3-.5z" />
      <Circle cx="12" cy="12" r="3" />
    </Base>
  );
}

export function ChatIcon(p: IconProps) {
  return (
    <Base {...p}>
      <Path d="M21 11.5a8.4 8.4 0 01-9 8.4 8.4 8.4 0 01-3.8-.9L3 20l1.3-3.9A8.4 8.4 0 1121 11.5z" />
    </Base>
  );
}

export function HomeIcon(p: IconProps) {
  return (
    <Base {...p}>
      <Path d="M3 10l9-7 9 7v9a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <Path d="M9 21V12h6v9" />
    </Base>
  );
}

export function LogOutIcon(p: IconProps) {
  return (
    <Base {...p}>
      <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <Path d="M16 17l5-5-5-5" />
      <Path d="M21 12H9" />
    </Base>
  );
}

export function LinkIcon(p: IconProps) {
  return (
    <Base {...p}>
      <Path d="M10 13a5 5 0 007 0l2-2a5 5 0 00-7-7l-1 1" />
      <Path d="M14 11a5 5 0 00-7 0l-2 2a5 5 0 007 7l1-1" />
    </Base>
  );
}

export function MenuIcon(p: IconProps) {
  return (
    <Base {...p}>
      <Path d="M3 6h18M3 12h18M3 18h18" />
    </Base>
  );
}

export function XIcon(p: IconProps) {
  return (
    <Base {...p}>
      <Path d="M18 6L6 18M6 6l12 12" />
    </Base>
  );
}

export function InboxIcon(p: IconProps) {
  return (
    <Base {...p}>
      <Path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <Path d="M5.5 5h13l3.5 7v7a2 2 0 01-2 2H4a2 2 0 01-2-2v-7z" />
    </Base>
  );
}

export function CreditCardIcon(p: IconProps) {
  return (
    <Base {...p}>
      <Rect x="2" y="5" width="20" height="14" rx="2" />
      <Path d="M2 10h20" />
    </Base>
  );
}

export function ToolIcon(p: IconProps) {
  return (
    <Base {...p}>
      <Path d="M14.7 6.3a4 4 0 10-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 005.4-5.4l-2.8 2.8-2-2z" />
    </Base>
  );
}

export function LifeBuoyIcon(p: IconProps) {
  return (
    <Base {...p}>
      <Circle cx="12" cy="12" r="10" />
      <Circle cx="12" cy="12" r="4" />
      <Path d="M4.9 4.9l4.2 4.2M14.9 14.9l4.2 4.2M19.1 4.9l-4.2 4.2M9.1 14.9l-4.2 4.2" />
    </Base>
  );
}

export function UserCircleIcon(p: IconProps) {
  return (
    <Base {...p}>
      <Circle cx="12" cy="12" r="10" />
      <Circle cx="12" cy="10" r="3" />
      <Path d="M6.5 19a5.5 5.5 0 0111 0" />
    </Base>
  );
}

export function GridIcon(p: IconProps) {
  return (
    <Base {...p}>
      <Rect x="3" y="3" width="8" height="8" rx="1" />
      <Rect x="13" y="3" width="8" height="8" rx="1" />
      <Rect x="3" y="13" width="8" height="8" rx="1" />
      <Rect x="13" y="13" width="8" height="8" rx="1" />
    </Base>
  );
}
