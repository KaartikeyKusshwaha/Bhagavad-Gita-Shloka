/** Editorial navigation keywords, not doctrinal equivalences or reviewed theme assignments. */
export const readingThemes = [
  {
    slug: 'compassion',
    name: 'Compassion & kindness',
    queries: ['compassion', 'kindness', 'merciful', 'الرحمن', 'رحمة'],
  },
  { slug: 'action', name: 'Action & duty', queries: ['action', 'duty', 'اعملوا', 'عمل'] },
  { slug: 'peace', name: 'Peace & conflict', queries: ['peace', 'hatred', 'سلام', 'السلم'] },
  {
    slug: 'patience',
    name: 'Patience & steadiness',
    queries: ['patience', 'steadfast', 'صبر', 'الصابرين'],
  },
  {
    slug: 'knowledge',
    name: 'Knowledge & understanding',
    queries: ['knowledge', 'understanding', 'العلم', 'تعلمون'],
  },
] as const;
