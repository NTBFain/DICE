/** Built-in palettes are shared by previews, initial rendering and the theme picker. */
export type ThemeId = 'obsidian' | 'cyberpunk' | 'canvas' | 'emerald' | 'nordic' | 'sakura' | 'sunset' | 'coffee' | 'dracula' | 'ocean' | 'monochrome' | 'matcha' | 'retro' | 'paper' | 'rose';

export interface ThemeOption {
  id: ThemeId | string; name: string; nameTh: string; isLight?: boolean; isCustom?: boolean;
  previewBg: string; previewAccent: string;
  accentPrimary?: string; accentHover?: string; bgPrimary?: string; bgSurface?: string;
  borderSubtle?: string; borderHover?: string; textPrimary?: string; textMuted?: string;
  surfaceHover?: string; accentSolid?: string; accentSolidHover?: string;
}

function channels(hex: string): number[] {
  return [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16));
}
export function mixColors(first: string, second: string, amount: number): string {
  const a = channels(first); const b = channels(second);
  return '#' + a.map((channel, index) => Math.round(channel * (1 - amount) + b[index] * amount).toString(16).padStart(2, '0')).join('');
}
export function contrastRatio(first: string, second: string): number {
  const luminance = (hex: string) => channels(hex).map(value => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }).reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0);
  const a = luminance(first); const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
function readable(color: string, surfaces: string[], target: number, light: boolean): string {
  const endpoint = light ? '#17202b' : '#edf1f6';
  for (let step = 0; step <= 100; step++) {
    const candidate = mixColors(color, endpoint, step / 100);
    if (surfaces.every(surface => contrastRatio(candidate, surface) >= target)) return candidate;
  }
  return endpoint;
}

type Seed = [ThemeId, string, string, string, string, string, boolean?];
const seeds: Seed[] = [
  ['obsidian', 'Obsidian Studio', 'โอเบซิเดียน สตูติโอ', '#131e2c', '#1e2c3d', '#92b2d5'],
  ['cyberpunk', 'Neo-Tokyo Neon', 'นีโอ-โตเกียว ไซเบอร์', '#211d2b', '#302b3c', '#c79ab6'],
  ['canvas', 'Editorial Canvas', 'แคนวาส คลาสสิก', '#f5f1e9', '#fcfaf5', '#986044', true],
  ['emerald', 'Emerald Atelier', 'เอ็มเมอรัลด์ สตูติโอ', '#17251f', '#23362e', '#8abca6'],
  ['nordic', 'Nordic Ice Slate', 'นอร์ดิก ไอซ์ สเลท', '#1b2835', '#2a3a49', '#a0bccd'],
  ['sakura', 'Sakura Moonlight', 'ซากุระ มูนไลท์', '#291f29', '#3a2e3a', '#d0a7ba'],
  ['sunset', 'Cyber Sunset', 'ไซเบอร์ ซันเซ็ต', '#29212d', '#3a303d', '#d1ab93'],
  ['coffee', 'Warm Espresso', 'เอสเพรสโซ อุ่น', '#28221e', '#3a312b', '#c5ad92'],
  ['dracula', 'Midnight Violet', 'มิดไนท์ ไวโอเล็ต', '#231f30', '#322e43', '#b5a8d0'],
  ['ocean', 'Abyssal Ocean', 'แอไบสซอล โอเชียน', '#17292e', '#243a41', '#94bdbb'],
  ['monochrome', 'Noir Monochrome', 'นัวร์ โมโนโครม', '#202226', '#2f3237', '#babfc7'],
  ['matcha', 'Kyoto Matcha', 'เกียวโต มัทฉะ', '#24291f', '#343c2e', '#b5c39b'],
  ['retro', '80s Arcade Neon', 'อาเคด 80s', '#28252e', '#393540', '#c9bd94'],
  ['paper', 'Blueprint Draft', 'บลูพริ้นต์ ดราฟต์', '#edf1f5', '#f7f9fb', '#536f91', true],
  ['rose', 'Rose Quartz Light', 'โรสควอตซ์ สว่าง', '#f5ecef', '#fcf7f8', '#986178', true],
];

export const THEMES: ThemeOption[] = seeds.map(([id, name, nameTh, bg, surface, accent, isLight = false]) => {
  const hover = mixColors(surface, isLight ? '#17202b' : '#edf1f6', 0.045);
  // Reserve contrast headroom for tinted selection backgrounds as well as plain panels.
  const surfaces = [bg, surface, hover, mixColors(surface, isLight ? '#17202b' : '#edf1f6', isLight ? 0.08 : 0.12)];
  const text = isLight ? '#29323d' : '#e3e9f0';
  const solid = mixColors(accent, '#17202b', isLight ? 0.12 : 0.49);
  return {id, name, nameTh, isLight, bgPrimary: bg, bgSurface: surface, surfaceHover: hover,
    previewBg: bg, previewAccent: readable(accent, surfaces, 4.5, isLight),
    accentPrimary: readable(accent, surfaces, 4.5, isLight),
    accentHover: readable(accent, surfaces, 5, isLight),
    accentSolid: readable(solid, ['#f6f8fb'], 4.5, true),
    accentSolidHover: readable(mixColors(solid, isLight ? '#17202b' : accent, 0.12), ['#f6f8fb'], 4.5, true),
    borderSubtle: mixColors(surface, text, isLight ? 0.16 : 0.14),
    borderHover: readable(mixColors(surface, text, 0.32), surfaces, 3, isLight),
    textPrimary: text, textMuted: readable(isLight ? '#626b76' : '#a5b0bf', surfaces, 4.5, isLight)};
});

export function resolveTheme(id: string, customThemes: ThemeOption[] = []): ThemeOption {
  return customThemes.find(theme => theme.id === id && theme.isCustom) || THEMES.find(theme => theme.id === id) || THEMES[0];
}

export function themeVariables(theme: ThemeOption): Record<string, string> {
  const bg = theme.bgPrimary || '#131e2c'; const surface = theme.bgSurface || '#1e2c3d';
  const custom = !!theme.isCustom;
  const light = custom ? contrastRatio(bg, '#17202b') > contrastRatio(bg, '#edf1f6') : !!theme.isLight;
  const primary = theme.textPrimary || (light ? '#29323d' : '#e3e9f0');
  const muted = theme.textMuted || (light ? '#626b76' : '#a5b0bf');
  const hover = theme.surfaceHover || (custom ? surface : mixColors(surface, primary, 0.045));
  const accent = theme.accentPrimary || '#92b2d5';
  const fill = theme.accentSolid || accent;
  const onFill = contrastRatio(fill, '#17202b') > contrastRatio(fill, '#f6f8fb') ? '#17202b' : '#f6f8fb';
  const selected = mixColors(surface, accent, light ? 0.08 : 0.12);
  const panel = [bg, surface, hover, selected];
  const control = custom ? (theme.borderHover || '#50647d') : readable(theme.borderHover!, panel, 3, light);
  const focus = readable(accent, panel, 3, light);
  const success = readable(light ? '#35634f' : '#99bda7', panel, 4.8, light);
  const warning = readable(light ? '#805a2d' : '#d0b58a', panel, 4.8, light);
  const danger = readable(light ? '#9b484b' : '#d6a0a5', panel, 4.8, light);
  const dangerSolid = readable(danger, ['#f6f8fb'], 4.5, true);
  return {
    '--bg-primary': bg, '--bg-surface': surface, '--bg-surface-hover': hover,
    '--border-subtle': theme.borderSubtle || '#34455b', '--border-hover': theme.borderHover || '#50647d',
    '--border-control': control, '--text-primary': primary, '--text-muted': muted,
    '--accent-primary': accent, '--accent-hover': theme.accentHover || accent,
    '--accent-secondary': accent, '--accent-solid': fill,
    '--accent-solid-hover': theme.accentSolidHover || theme.accentHover || fill,
    '--accent-contrast': custom ? onFill : '#f6f8fb', '--accent-soft': selected, '--focus-ring': focus,
    '--status-success': success, '--status-warning': warning, '--status-danger': danger,
    '--status-success-soft': mixColors(surface, success, 0.1),
    '--status-warning-soft': mixColors(surface, warning, 0.1),
    '--status-danger-soft': mixColors(surface, danger, 0.1),
    '--status-danger-solid': dangerSolid, '--status-on-solid': '#f6f8fb',
    '--shadow-soft': light ? '0 6px 20px rgb(35 45 60 / 0.08)' : '0 6px 20px rgb(5 12 22 / 0.18)',
    '--overlay-bg': light ? 'rgb(23 32 43 / 0.38)' : 'rgb(8 15 25 / 0.56)',
  };
}

export function isLightTheme(theme: ThemeOption): boolean {
  if (!theme.isCustom) return !!theme.isLight;
  const bg = theme.bgPrimary || '#131e2c';
  return contrastRatio(bg, '#17202b') > contrastRatio(bg, '#edf1f6');
}
