export function getSocialLink(value: string, kind: 'twitter' | 'pixiv' | 'discord'): string | undefined {
  const text = value.trim();
  let candidate = text;
  if (!/^https?:\/\//i.test(candidate)) {
    if (/^(www\.)?(x\.com|twitter\.com|pixiv\.net|discord\.gg|discord\.com)\//i.test(text)) candidate = `https://${text}`;
    else if (kind === 'twitter' && /^@?\w{1,15}$/.test(text)) candidate = `https://x.com/${text.replace(/^@/, '')}`;
    else if (kind === 'pixiv' && /^\d+$/.test(text)) candidate = `https://www.pixiv.net/users/${text}`;
    else return undefined;
  }
  try {
    const url = new URL(candidate);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined;
  } catch { return undefined; }
}
