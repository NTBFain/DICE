import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root = process.env.DICE_FRONTEND_RUNTIME || path.resolve(import.meta.dirname, '../../frontend');
const {THEMES, themeVariables, resolveTheme, contrastRatio, isLightTheme} = await import(pathToFileURL(path.join(root, 'src/lib/themePalettes.ts')));

test('contrast calculation uses linear luminance, including known endpoints', () => {
  assert.equal(contrastRatio('#000000','#ffffff'),21);
  assert.equal(contrastRatio('#ffffff','#ffffff'),1);
  assert.ok(Math.abs(contrastRatio('#777777','#ffffff')-4.478)<0.01);
});

for (const theme of THEMES) {
  test(`${theme.id}: text, controls, focus, buttons and status remain readable`, () => {
    const vars = themeVariables(theme);
    const surfaces = ['--bg-primary','--bg-surface','--bg-surface-hover','--accent-soft'];
    for (const text of ['--text-primary','--text-muted','--accent-primary']) {
      for (const surface of surfaces) assert.ok(contrastRatio(vars[text],vars[surface])>=4.5, `${text} on ${surface}: ${contrastRatio(vars[text],vars[surface])}`);
    }
    for (const control of ['--border-control','--focus-ring']) {
      for (const surface of surfaces) assert.ok(contrastRatio(vars[control],vars[surface])>=3, `${control} on ${surface}`);
    }
    for (const background of ['--accent-solid','--accent-solid-hover']) assert.ok(contrastRatio(vars['--accent-contrast'],vars[background])>=4.5, `${background} button label`);
    for (const state of ['success','warning','danger']) assert.ok(contrastRatio(vars[`--status-${state}`],vars[`--status-${state}-soft`])>=4.5, `${state} status`);
    assert.equal(theme.previewBg,vars['--bg-primary']);
    assert.equal(theme.previewAccent,vars['--accent-primary']);
    assert.equal(isLightTheme(theme),!!theme.isLight);
  });
}

test('all fifteen saved theme IDs are retained and remain visually distinct', () => {
  assert.deepEqual(THEMES.map(t=>t.id),['obsidian','cyberpunk','canvas','emerald','nordic','sakura','sunset','coffee','dracula','ocean','monochrome','matcha','retro','paper','rose']);
  assert.equal(new Set(THEMES.map(t=>t.previewBg)).size,15);
  assert.equal(resolveTheme('unknown').id,'obsidian');
});

test('existing custom colors survive resolution without altering saved records', () => {
  const custom = {id:'custom_qa',name:'QA',nameTh:'ทดสอบ',isCustom:true,previewBg:'#14283b',previewAccent:'#82b0cc',bgPrimary:'#14283b',bgSurface:'#22394b',textPrimary:'#e8eef4',textMuted:'#afbbca',accentPrimary:'#82b0cc',accentHover:'#6f9fbb',borderSubtle:'#3e5062',borderHover:'#75889c'};
  const original = JSON.stringify(custom);
  const vars = themeVariables(resolveTheme('custom_qa',[custom]));
  for (const [key,field] of Object.entries({'--bg-primary':'bgPrimary','--bg-surface':'bgSurface','--text-primary':'textPrimary','--text-muted':'textMuted','--accent-primary':'accentPrimary','--accent-hover':'accentHover','--border-subtle':'borderSubtle','--border-hover':'borderHover'})) assert.equal(vars[key],custom[field]);
  assert.equal(JSON.stringify(custom),original);
  assert.equal(isLightTheme(custom),false);
  assert.equal(isLightTheme({...custom,bgPrimary:'#faf8f2'}),true);
  assert.ok(vars['--accent-solid'] && vars['--focus-ring'] && vars['--overlay-bg']);
});
