import { describe, it, expect } from 'vitest';
import { dictionaries, initialLocale, translate } from '../src/i18n';
describe('WatDesk languages',()=>{
 it('translates navigation and keeps matching dictionary keys',()=>{
  expect(translate('zh-CN','exams')).toBe('考试');
  expect(translate('en','exams')).toBe('Exams');
  expect(Object.keys(dictionaries['zh-CN']).sort()).toEqual(Object.keys(dictionaries.en).sort());
 });
 it('follows Chinese browsers and defaults to English otherwise',()=>{
  expect(initialLocale('zh-TW')).toBe('zh-CN');
  expect(initialLocale('fr')).toBe('en');
 });
});
