/**
 * Typefaces for the version 3 design system, self-hosted so the PWA works
 * offline and no request leaves for a font CDN.
 *
 * - Geist: everything people read and tap.
 * - Bricolage Grotesque: headings and large figures.
 * - Mukta: Nepali. It sits second in every font stack, so the browser picks
 *   it glyph by glyph wherever Devanagari appears.
 */
import '@fontsource-variable/geist';
// opsz file: carries the optical-size axis too, so large headings get the
// tighter display cut, as in Figma.
import '@fontsource-variable/bricolage-grotesque/opsz.css';
import '@fontsource/mukta/400.css';
import '@fontsource/mukta/500.css';
import '@fontsource/mukta/600.css';
import '@fontsource/mukta/700.css';
