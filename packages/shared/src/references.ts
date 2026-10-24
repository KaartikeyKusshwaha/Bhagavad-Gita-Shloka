export function parsePassageReference(input: string, selectedWork?: string) {
  const text = input.trim();
  const dhp = text.match(/^(?:dhp|dhammapada)\s*[:.-]?\s*(\d{1,3})$/i);
  if (dhp) return { work: 'dhammapada', ref: `Dhp ${Number(dhp[1])}` };
  const quran = text.match(/^(?:quran|qur['’]?an|koran)\s*(\d{1,3})[.:](\d{1,3})$/i);
  if (quran) return { work: 'quran', ref: `Quran ${Number(quran[1])}:${Number(quran[2])}` };
  const gita = text.match(/^(?:(?:bg|gita|bhagavad[ -]gita)\s*[-:]?\s*)?(\d{1,3})[.:](\d{1,3})$/i);
  if (!gita) return null;
  const explicitGita = /^(?:bg|gita|bhagavad)/i.test(text);
  if (!explicitGita && selectedWork === 'quran')
    return { work: 'quran', ref: `Quran ${Number(gita[1])}:${Number(gita[2])}` };
  return { work: 'bhagavad-gita', ref: `BG ${Number(gita[1])}.${Number(gita[2])}` };
}
