import type { Metadata, Viewport } from "next";
import { Space_Grotesk, DM_Sans } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Vidyas OS — Admin",
  description: "Internal admin console — users, plans, and usage.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#f8fafc",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signInFallbackRedirectUrl="/"
      afterSignOutUrl="/sign-in"
      appearance={{
        variables: {
          colorPrimary: "#4f46e5",
          colorBackground: "#ffffff",
          colorInputBackground: "#f2f4f6",
          colorText: "#191c1e",
          colorTextSecondary: "#464555",
          colorInputText: "#191c1e",
          borderRadius: "0.75rem",
        },
      }}
    >
      <html lang="en" className={`${spaceGrotesk.variable} ${dmSans.variable} h-full antialiased`}>
        <body className="min-h-full font-sans text-soft">{children}</body>
      </html>
    </ClerkProvider>
  );
}
