'use client';
import { useEffect, useState } from 'react';
import { SlidersHorizontal, Check } from 'lucide-react';
export function Preferences() {
  const [settings, setSettings] = useState({ dark: false, large: false, plain: false }),
    [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('scripture-preferences');
      if (saved) setSettings(JSON.parse(saved));
    } catch {
      /* optional device preferences */
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.theme = settings.dark ? 'dark' : 'light';
    document.documentElement.dataset.large = String(settings.large);
    document.documentElement.dataset.plain = String(settings.plain);
    try {
      localStorage.setItem('scripture-preferences', JSON.stringify(settings));
    } catch {
      /* storage unavailable */
    }
  }, [settings, ready]);
  return (
    <details className="preferences">
      <summary aria-label="Reading settings">
        <SlidersHorizontal size={19} />
        <span>Reading settings</span>
      </summary>
      <div className="preferences-menu">
        <strong>Make yourself comfortable</strong>
        {(['dark', 'large', 'plain'] as const).map((key, i) => (
          <button
            key={key}
            aria-pressed={settings[key]}
            onClick={() => setSettings({ ...settings, [key]: !settings[key] })}
          >
            <span>{['Dark appearance', 'Larger text', 'Simple reading font'][i]}</span>
            {settings[key] && <Check size={16} />}
          </button>
        ))}
        <small>Saved only on this device.</small>
      </div>
    </details>
  );
}
