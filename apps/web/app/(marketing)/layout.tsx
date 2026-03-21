import Link from "next/link";

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
const hasClerk = clerkKey.startsWith("pk_test_") && clerkKey.length > 20 && !clerkKey.endsWith("...");

async function NavAuth() {
  if (!hasClerk) {
    return (
      <>
        <Link href="/sign-in" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Sign In
        </Link>
        <Link href="/sign-up" className="gradient-bg text-white text-sm px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity">
          Get Started
        </Link>
      </>
    );
  }
  const { SignedIn, SignedOut, UserButton } = await import("@clerk/nextjs");
  return (
    <>
      <SignedOut>
        <Link href="/sign-in" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Sign In
        </Link>
        <Link href="/sign-up" className="gradient-bg text-white text-sm px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity">
          Get Started
        </Link>
      </SignedOut>
      <SignedIn>
        <Link href="/feed" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Dashboard
        </Link>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </>
  );
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-dark border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="px-2 h-8 rounded-lg gradient-bg flex items-center justify-center">
                <span className="text-white font-bold text-xs tracking-tight">BxO</span>
              </div>
              <span className="text-xl font-bold gradient-text">brianXolivia</span>
            </Link>

            {/* Nav links */}
            <div className="hidden md:flex items-center gap-6">
              <Link href="#features" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                Content
              </Link>
              <Link href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                Pricing
              </Link>
            </div>

            {/* Auth buttons */}
            <div className="flex items-center gap-3">
              <NavAuth />
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-16">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="px-1.5 h-7 rounded-lg gradient-bg flex items-center justify-center">
                  <span className="text-white font-bold text-xs tracking-tight">BxO</span>
                </div>
                <span className="font-bold gradient-text">brianXolivia</span>
              </div>
              <p className="text-muted-foreground text-sm">
                Exclusive digital content from Brian &amp; Olivia.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Subscribe</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/sign-up" className="hover:text-foreground transition-colors">
                    Create Account
                  </Link>
                </li>
                <li>
                  <Link href="/sign-in" className="hover:text-foreground transition-colors">
                    Sign In
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/help" className="hover:text-foreground transition-colors">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="/safety" className="hover:text-foreground transition-colors">
                    Safety
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/terms" className="hover:text-foreground transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-foreground transition-colors">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-muted-foreground text-xs">
              © {new Date().getFullYear()} brianXolivia. All rights reserved. 18+ only.
            </p>
            <p className="text-muted-foreground text-xs">
              All content creators are verified adults 18+.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
