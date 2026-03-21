import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "brianXolivia – Exclusive Couples Content",
    template: "%s | brianXolivia",
  },
  description:
    "Exclusive digital content from Brian & Olivia, available by subscription.",
  keywords: ["creator", "content", "subscription", "exclusive"],
  openGraph: {
    title: "brianXolivia – Exclusive Couples Content",
    description: "Connect with your favorite creators. Exclusive content, direct messaging.",
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_APP_URL ?? "https://brianxolivia.com",
    siteName: "brianXolivia",
  },
  twitter: {
    card: "summary_large_image",
    title: "brianXolivia – Exclusive Couples Content",
    description: "Connect with your favorite creators.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FF1493",
};

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
const hasClerk = clerkKey.startsWith("pk_test_") && clerkKey.length > 20 && !clerkKey.endsWith("...");

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">
        {hasClerk ? (
          <ClerkProvider
            appearance={{
              variables: {
                colorPrimary: "#FF1493",
                colorBackground: "#0a0a0a",
                colorText: "#fafafa",
                colorInputBackground: "#111111",
                colorInputText: "#fafafa",
                borderRadius: "0.75rem",
              },
              elements: {
                card: "bg-card border border-border shadow-2xl",
                headerTitle: "text-foreground",
                socialButtonsBlockButton:
                  "bg-secondary border-border text-foreground hover:bg-muted",
                formButtonPrimary:
                  "gradient-bg text-white hover:opacity-90 transition-opacity",
              },
            }}
          >
            <Providers>{children}</Providers>
          </ClerkProvider>
        ) : (
          <Providers>{children}</Providers>
        )}
      </body>
    </html>
  );
}
