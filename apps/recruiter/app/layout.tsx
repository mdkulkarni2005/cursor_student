import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "krackit — Recruiter",
  description: "Discover verified student talent — browse profiles, message candidates.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#f7f7f7",
  width: "device-width",
  initialScale: 1,
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const isProd = process.env.NODE_ENV === "production";
// No isSatellite here — Clerk's primary domain is krackit.in (the shared root), so its session
// cookie is already scoped to *.krackit.in and shared with app.krackit.in automatically. The
// Satellites feature (isSatellite/domain) is for sharing sessions across UNRELATED root domains
// and needs a paid Clerk plan we don't have — not needed for same-root subdomains like this.
// Still point sign-in at the unified app.krackit.in login in production, for one entry point.

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider
      signInUrl={isProd ? `${APP_URL}/sign-in` : "/sign-in"}
      signInFallbackRedirectUrl="/"
      afterSignOutUrl="/sign-in"
      appearance={{
        variables: {
          colorPrimary: "#f6921e",
          colorBackground: "#ffffff",
          colorInputBackground: "#f2f4f6",
          colorText: "#152241",
          colorTextSecondary: "#5c5555",
          colorInputText: "#152241",
          borderRadius: "0.75rem",
        },
      }}
    >
      <html lang="en" suppressHydrationWarning className={`${inter.variable} h-full antialiased`}>
        <body className="min-h-full font-sans text-soft">
          <ThemeProvider>
            {children}
            <Toaster position="top-right" richColors duration={3000} />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
