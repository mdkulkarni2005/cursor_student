import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "krackit — your academic operating system",
  description:
    "Assignments, reports, PPTs, projects and viva prep — generated in your college's format. The Cursor for students.",
};

export const viewport: Viewport = {
  themeColor: "#f7f7f7",
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
      <html
        lang="en"
        suppressHydrationWarning
        className={`${inter.variable} ${jetBrainsMono.variable} h-full antialiased`}
      >
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
