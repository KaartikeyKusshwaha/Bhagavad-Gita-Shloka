'use client';
import { useState } from 'react';
import { Share2 } from 'lucide-react';
import type { Passage } from '@core/shared/src/index';

export function SharePassage({ passage }: { passage: Passage }) {
  const [message, setMessage] = useState(''),
    [pending, setPending] = useState(false);
  const href = () =>
    `${location.origin}/read/${passage.work}/${encodeURIComponent(passage.ref.replace(' ', '-'))}`;
  async function card() {
    setPending(true);
    setMessage('');
    try {
      await document.fonts.ready;
      const canvas = document.createElement('canvas'),
        ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');
      const width = 1000,
        margin = 70,
        lines: {
          text: string;
          size: number;
          font: string;
          rtl: boolean;
          color: string;
          gap: number;
        }[] = [];
      function block(
        text: string,
        size: number,
        font: string,
        rtl = false,
        color = '#203c2b',
        gap = 22,
      ) {
        ctx!.font = `${size}px ${font}`;
        for (const paragraph of text.split('\n')) {
          let line = '';
          for (const word of paragraph.split(' ')) {
            const next = line ? `${line} ${word}` : word;
            if (line && ctx!.measureText(next).width > width - 2 * margin) {
              lines.push({ text: line, size, font, rtl, color, gap: 0 });
              line = word;
            } else line = next;
          }
          lines.push({ text: line, size, font, rtl, color, gap: 0 });
        }
        lines[lines.length - 1].gap = gap;
      }
      block('OPEN SCRIPTURE · A SHARED READING ROOM', 16, 'Arial', false, '#526856', 25);
      block(`${passage.work_title} · ${passage.ref}`, 36, 'Georgia', false, '#203c2b', 28);
      block(
        passage.original_text,
        passage.original_script === 'Arabic' ? 38 : 30,
        passage.original_script === 'Arabic'
          ? "'Traditional Arabic', 'Nirmala UI', serif"
          : passage.original_script === 'Devanagari'
            ? "'Nirmala UI', serif"
            : 'Georgia',
        passage.original_script === 'Arabic',
      );
      const translation = passage.translations[0];
      if (translation) {
        block(translation.text, 27, 'Georgia');
        block(
          `${translation.translator} · ${String(translation.source_ref ?? passage.ref)}`,
          17,
          'Arial',
          false,
          '#526856',
        );
      }
      block(`${passage.source.name} · ${passage.source.license}`, 16, 'Arial', false, '#526856', 8);
      block(passage.source.attribution, 15, 'Arial', false, '#526856', 8);
      block(passage.source.url, 14, 'Arial', false, '#526856', 15);
      if (translation) {
        block(
          `${translation.source.name} · ${translation.source.license}`,
          15,
          'Arial',
          false,
          '#526856',
          8,
        );
        block(translation.source.url, 14, 'Arial', false, '#526856', 18);
      }
      if (typeof passage.source.display_rules.copyright_notice === 'string')
        block(passage.source.display_rules.copyright_notice, 13, 'monospace', false, '#526856', 20);
      block(href(), 15, 'Arial', false, '#526856', 0);
      canvas.width = width;
      canvas.height = Math.ceil(
        2 * margin + lines.reduce((sum, line) => sum + line.size * 1.6 + line.gap, 0),
      );
      if (canvas.height > 16000) throw new Error('Passage too long for a card');
      ctx.fillStyle = '#f7f8f2';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      let y = margin;
      for (const line of lines) {
        ctx.font = `${line.size}px ${line.font}`;
        ctx.fillStyle = line.color;
        ctx.direction = line.rtl ? 'rtl' : 'ltr';
        ctx.textAlign = line.rtl ? 'right' : 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(line.text, line.rtl ? width - margin : margin, y, width - 2 * margin);
        y += line.size * 1.6 + line.gap;
      }
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Image unavailable'))),
          'image/png',
        ),
      );
      const url = URL.createObjectURL(blob),
        a = document.createElement('a');
      a.href = url;
      a.download = `${passage.ref.replace(/[^a-z0-9.-]/gi, '-')}-attributed.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('Passage card downloaded with source credits.');
    } catch {
      setMessage(
        'The card could not be created. You can copy the attributed text or share the passage link.',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <details className="passage-share">
      <summary aria-label="Share passage">
        <Share2 size={17} />
      </summary>
      <div className="share-menu">
        <button
          onClick={() =>
            navigator.clipboard
              .writeText(href())
              .then(() => setMessage('Passage link copied.'))
              .catch(() => setMessage('Copy the page address from your browser.'))
          }
        >
          Copy passage link
        </button>
        <button disabled={pending} onClick={card}>
          {pending ? 'Creating card…' : 'Download passage card'}
        </button>
        {message && <p role="status">{message}</p>}
      </div>
    </details>
  );
}
