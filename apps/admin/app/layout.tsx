import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import Script from "next/script";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "krackit — Admin",
  description: "Internal admin console — users, plans, and usage.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#f7f7f7",
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
          {/* Applies the dark class before first paint, synchronously, so dark-mode/system-dark
              users don't see a flash of the light theme while React hydrates. ThemeProvider's
              own state still starts at "light" (see theme-provider.tsx) to keep server/client
              markup identical — this script only touches the class, not any rendered content. */}
          <Script id="theme-init" strategy="beforeInteractive">
            {`(function(){try{var t=localStorage.getItem("vidyos-admin-theme");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark");}catch(e){}})();`}
          </Script>
          <ThemeProvider>
            {children}
            <Toaster position="top-right" richColors duration={3000} />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
