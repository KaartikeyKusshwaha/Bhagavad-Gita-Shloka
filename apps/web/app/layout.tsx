import { AccountProvider, AccountLink, AccountWelcome } from '../components/account-provider';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, ArrowUpRight } from 'lucide-react';
import { Preferences } from '../components/preferences';
import { MainNavigation } from '../components/main-navigation';
import './globals.css';
import './experience.css';
export const metadata: Metadata = {
  title: { default: 'Open Scripture · Read. Search. Verify.', template: '%s · Open Scripture' },
  description:
    'A free, open-source reading room for scripture. Read original texts, trace translations, and check quotations against an attributed collection.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg' },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <AccountProvider>
          <a className="skip" href="#main">
            Skip to content
          </a>
          <header className="site-header">
            <Link className="brand" href="/">
              <span className="brand-mark">
                <BookOpen size={22} />
              </span>
              <span>
                Open Scripture<small>A shared reading room</small>
              </span>
            </Link>
            <MainNavigation />
            <div className="header-actions">
              <AccountLink />
              <Preferences />
            </div>
          </header>
          <main id="main">
            <AccountWelcome />
            {children}
          </main>
          <footer className="site-footer">
            <div>
              <Link className="footer-brand" href="/">
                Open Scripture<span>Free to read. Open to everyone.</span>
              </Link>
              <p>Free accounts. No ads. No third-party tracking.</p>
            </div>
            <div className="footer-links">
              <Link href="/sources">Sources & licenses</Link>
              <Link href="/corrections">Corrections</Link>
              <Link href="/about">About & roadmap</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/api">API</Link>
              <a
                href="https://github.com/KaartikeyKusshwaha/Bhagavad-Gita-Shloka"
                target="_blank"
                rel="noreferrer"
              >
                Source code <ArrowUpRight size={13} />
              </a>
            </div>
            <p className="footer-note">
              Primary text and human translations retain their source licenses. Code: AGPL-3.0.
              Original interface and notes: CC BY-SA 4.0.{' '}
              <Link href="/sources">Attribution & report an error →</Link>
            </p>
          </footer>
        </AccountProvider>
      </body>
    </html>
  );
}
