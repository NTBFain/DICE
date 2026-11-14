/** Match the six-digit hex format used by native color pickers. */
export function validateCustomTheme(name: string, nameTh: string, colors: readonly string[]): 'name' | 'color' | null {
  if (![name, nameTh].every(value => value.trim().length > 0 && value.trim().length <= 80)) return 'name';
  if (!colors.every(value => /^#[0-9a-f]{6}$/i.test(value))) return 'color';
  return null;
}
