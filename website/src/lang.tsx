import { useLocation } from 'react-router-dom';
import type { Lang } from './content';

export const LANGS: Lang[] = ['en', 'ne'];

const NE = /^\/ne(?=\/|$)/;

/** The page language comes from the address: English at the root (/, /about ...), Nepali under /ne. */
export function useLang(): Lang {
  const { pathname } = useLocation();
  return NE.test(pathname) ? 'ne' : 'en';
}

export const otherLang = (l: Lang): Lang => (l === 'en' ? 'ne' : 'en');

/** A page's address in a language: '' is the home page. */
export const pagePath = (lang: Lang, page = '') => (lang === 'en' ? `/${page}` : `/ne${page ? '/' + page : ''}`);

/** The same address in the other language. */
export function switchPath(pathname: string, to: Lang) {
  const bare = pathname.replace(NE, '') || '/';
  if (to === 'en') return bare;
  return bare === '/' ? '/ne' : '/ne' + bare;
}
