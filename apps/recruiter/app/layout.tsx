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
// Satellite domain: shares its Clerk session with app.krackit.in (the primary domain) so an
// approved recruiter who logs in once via the unified krackit.in "Login" button lands here
// already signed in — see apps/web/app/route-after-login/page.tsx. Only enabled in production;
// local dev keeps recruiter as a standalone Clerk instance so it's testable without app.krackit.in.
const isSatellite = process.env.NODE_ENV === "production";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider
      isSatellite={isSatellite}
      domain="recruiter.krackit.in"
      signInUrl={isSatellite ? `${APP_URL}/sign-in` : "/sign-in"}
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
