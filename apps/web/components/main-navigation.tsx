'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Compass, CalendarDays } from 'lucide-react';
const destinations = [
  { href: '/', label: 'Explore', Icon: Compass },
  { href: '/library', label: 'Read', Icon: BookOpen },
  { href: '/study', label: 'Study', Icon: CalendarDays },
];
export function MainNavigation() {
  const path = usePathname();
  return (
    <>
      <nav className="primary-navigation" aria-label="Main navigation">
        {destinations.map(({ href, label, Icon }) => {
          const active =
            href === '/'
              ? path === '/' || path === '/search' || path === '/verify'
              : href === '/library'
                ? path === '/library' || path.startsWith('/read/')
                : path.startsWith('/study');
          return (
            <Link key={href} href={href} aria-current={active ? 'page' : undefined}>
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </nav>
      <nav className="mobile-navigation" aria-label="Mobile navigation">
        {destinations.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={
              (
                href === '/'
                  ? path === '/'
                  : href === '/library'
                    ? path === '/library' || path.startsWith('/read/')
                    : path.startsWith('/study')
              )
                ? 'page'
                : undefined
            }
          >
            <Icon size={19} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
