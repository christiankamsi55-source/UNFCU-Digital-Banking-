import { EN_TRANSLATIONS } from './en';
import { Translations } from './types';

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<U>
    : T[P] extends object
    ? DeepPartial<T[P]>
    : T[P];
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function deepMerge<T extends Record<string, any>>(base: T, override: DeepPartial<T>): T {
  const result: Record<string, any> = { ...base };
  for (const key of Object.keys(override) as (keyof T)[]) {
    const val = override[key];
    if (val === undefined) continue;
    if (isPlainObject(val) && isPlainObject(base[key])) {
      result[key as string] = deepMerge(base[key], val as any);
    } else {
      result[key as string] = val;
    }
  }
  return result as T;
}

export function createTranslations(override: DeepPartial<Translations>): Translations {
  return deepMerge(EN_TRANSLATIONS, override);
}
