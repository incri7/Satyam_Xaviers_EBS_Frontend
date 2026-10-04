import { useParams } from 'react-router-dom';
import type { Lang } from './content';

export const LANGS: Lang[] = ['en', 'ne'];

/** The page language comes from the address: /en/... or /ne/... */
export function useLang(): Lang {
  const { lang } = useParams();
  return lang === 'ne' ? 'ne' : 'en';
}

export const otherLang = (l: Lang): Lang => (l === 'en' ? 'ne' : 'en');
