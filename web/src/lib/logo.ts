// LIVORA "LI + roof" mark, redrawn as vector shapes (no fonts) so it renders
// crisply in the PDF (pdfmake `svg`) and in the browser. Swap for the
// designer's master file when one is available.
export const LOGO_INK = '#141414';
export const LOGO_BRONZE = '#8b5e34';

export const LOGO_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <path fill="${LOGO_INK}" d="M1 10H23V12.5Q19 13 18.5 16V77H33Q36 76.5 36.5 72H38.5V84H1V81.5Q5.5 81 6 78V16Q5.5 13 1 12.5Z"/>
  <path fill="${LOGO_INK}" d="M45 37H67V39.5Q62.5 40 62 43V92Q62.5 95 67 95.5V98H45V95.5Q49.5 95 50 92V43Q49.5 40 45 39.5Z"/>
  <path fill="${LOGO_BRONZE}" d="M28 21 56 0l44 39H89L56 10 28 31z"/>
</svg>`;
