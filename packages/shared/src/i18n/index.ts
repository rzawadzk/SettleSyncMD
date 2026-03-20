import { pl } from './pl.js';
import { en } from './en.js';

export const translations = { pl, en } as const;
export type Locale = keyof typeof translations;
export type TranslationKeys = typeof pl;

export { pl, en };
