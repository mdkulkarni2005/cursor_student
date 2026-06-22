import type { Metadata, Viewport } from "next";
import { Space_Grotesk, DM_Sans, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "StudentOS — your academic operating system",
  description:
    "Assignments, reports, PPTs, projects and viva prep — generated in your college's format. The Cursor for students.",
};

export const viewport: Viewport = {
  themeColor: "#070a12",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
      appearance={{
        variables: {
          colorPrimary: "#22d3ee",
          colorBackground: "#0a0e1a",
          colorInputBackground: "#131a2b",
          colorText: "#f1f5f9",
          colorTextSecondary: "#94a3b8",
          colorInputText: "#f1f5f9",
          borderRadius: "0.75rem",
        },
      }}
    >
      <html
        lang="en"
        className={`${spaceGrotesk.variable} ${dmSans.variable} ${jetBrainsMono.variable} h-full antialiased`}
      >
        <body className="min-h-full font-sans text-soft">{children}</body>
      </html>
    </ClerkProvider>
  );
}
