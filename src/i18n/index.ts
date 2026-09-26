import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import ne from './locales/ne.json';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            ne: { translation: ne },
        },
        fallbackLng: 'en',
        interpolation: { escapeValue: false },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
            lookupLocalStorage: 'ebs-lang',
        },
    });

// Keep <html lang> in step with the UI language: screen readers pick their
// voice from it, and the design tokens give Devanagari taller line heights.
const syncDocumentLang = (lng: string) => {
    document.documentElement.lang = lng?.startsWith('ne') ? 'ne' : 'en';
};
syncDocumentLang(i18n.language);
i18n.on('languageChanged', syncDocumentLang);

export default i18n;
