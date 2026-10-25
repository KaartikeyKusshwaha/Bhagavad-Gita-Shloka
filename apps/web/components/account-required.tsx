'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { BookOpen, ArrowRight } from 'lucide-react';
import { useAccount } from './account-provider';
export function AccountRequired() {
  const { user } = useAccount();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (user) {
      location.replace('/study');
      return;
    }
    const modal = dialog.current;
    if (modal && !modal.open) modal.showModal();
    return () => {
      if (modal?.open) modal.close();
    };
  }, [user]);
  return (
    <div className="member-landing">
      <span className="eyebrow">OPEN SCRIPTURE</span>
      <h1>
        A quiet place
        <br />
        for deeper reading.
      </h1>
      <p>Explore traditions, keep the words that matter, and build your own reading practice.</p>
      <Link className="button primary" href="/account/signup">
        Create a free account <ArrowRight size={16} />
      </Link>
      <Link href="/account/signin">Already have an account? Sign in</Link>
      <dialog
        className="member-dialog"
        ref={dialog}
        aria-labelledby="member-dialog-title"
        aria-describedby="member-dialog-description"
        onCancel={(event) => {
          event.preventDefault();
          location.href = '/account/signup';
        }}
      >
        <span className="member-dialog-icon">
          <BookOpen size={27} />
        </span>
        <span className="eyebrow">YOUR READING ROOM</span>
        <h2 id="member-dialog-title">Make this space yours.</h2>
        <p id="member-dialog-description">
          Create a free account or sign in to open Explore, Read and Study. Your bookmarks, reading
          progress and conversations will stay together.
        </p>
        <Link className="button primary" href="/account/signup">
          Sign up <ArrowRight size={16} />
        </Link>
        <Link className="button" href="/account/signin">
          Sign in
        </Link>
        <small>Free to join. No subscription.</small>
      </dialog>
    </div>
  );
}
