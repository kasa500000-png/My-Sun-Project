import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outputDir = join(process.cwd(), "public", "images", "muscle-focus-cards");
mkdirSync(outputDir, { recursive: true });

const grayFill = "#f8f8f8";
const grayStroke = "#9b9da0";
const redFill = "#d7352f";
const redStroke = "#9b1d1a";

function fibers(lines) {
  return lines.map(line => `<path d="${line}" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity=".42"/>`).join("\n");
}

function muscle(paths) {
  return paths.map(item => `
    <path d="${item.d}" fill="${item.fill || redFill}" stroke="${item.stroke || redStroke}" stroke-width="${item.strokeWidth || 1.2}" opacity="${item.opacity || 0.94}"/>
    ${fibers(item.fibers || [])}
  `).join("\n");
}

function baseTorso(extra = "") {
  return `
    <g opacity=".98">
      <path d="M62 16 C53 24 46 38 44 55 L43 95 C49 108 79 108 85 95 L84 55 C82 38 75 24 66 16 Z" fill="${grayFill}" stroke="${grayStroke}" stroke-width="1.6"/>
      <path d="M45 30 C33 35 27 45 25 62 L22 93 C27 98 36 96 39 88 L43 57" fill="#f3f3f3" stroke="${grayStroke}" stroke-width="1.4"/>
      <path d="M83 57 L89 88 C92 96 101 98 106 93 L103 62 C101 45 95 35 83 30" fill="#f3f3f3" stroke="${grayStroke}" stroke-width="1.4"/>
      <path d="M48 47 C58 42 70 42 80 47" fill="none" stroke="#b7b9bc" stroke-width="1.2"/>
      <path d="M50 56 C59 53 69 53 78 56" fill="none" stroke="#c7c9cb" stroke-width="1.1"/>
      <path d="M51 66 C60 63 68 63 77 66" fill="none" stroke="#d0d2d4" stroke-width="1.1"/>
      <path d="M52 76 C60 73 68 73 76 76" fill="none" stroke="#d0d2d4" stroke-width="1.1"/>
      <path d="M64 32 L64 96" fill="none" stroke="#d1d3d5" stroke-width="1.2"/>
      ${extra}
    </g>
  `;
}

function armSide(side, extra = "") {
  const mirror = side === "right" ? `transform="translate(128 0) scale(-1 1)"` : "";
  return `
    <g ${mirror}>
      <path d="M57 12 C38 16 25 32 23 51 C22 69 28 87 35 105 C42 113 51 110 54 101 C48 80 47 65 50 50 C53 36 62 25 76 18 Z" fill="${grayFill}" stroke="${grayStroke}" stroke-width="1.6"/>
      <path d="M55 23 C47 31 43 43 42 56 C48 57 54 52 57 43 C60 35 62 28 55 23 Z" fill="#efefef" stroke="#babcc0" stroke-width="1.1"/>
      <path d="M39 60 C33 72 35 90 42 103" fill="none" stroke="#babcc0" stroke-width="1.2"/>
      <path d="M48 58 C44 74 45 88 50 100" fill="none" stroke="#c4c6c8" stroke-width="1.1"/>
      ${extra}
    </g>
  `;
}

function legs(extra = "") {
  return `
    <g>
      <path d="M50 33 C40 47 38 70 43 105 C48 112 56 109 58 101 C55 76 56 54 63 36 Z" fill="${grayFill}" stroke="${grayStroke}" stroke-width="1.6"/>
      <path d="M78 33 C88 47 90 70 85 105 C80 112 72 109 70 101 C73 76 72 54 65 36 Z" fill="${grayFill}" stroke="${grayStroke}" stroke-width="1.6"/>
      <path d="M49 55 C54 66 55 84 52 101" fill="none" stroke="#babcc0" stroke-width="1.2"/>
      <path d="M79 55 C74 66 73 84 76 101" fill="none" stroke="#babcc0" stroke-width="1.2"/>
      <path d="M59 36 C62 55 62 76 58 100" fill="none" stroke="#c4c6c8" stroke-width="1"/>
      <path d="M69 36 C66 55 66 76 70 100" fill="none" stroke="#c4c6c8" stroke-width="1"/>
      ${extra}
    </g>
  `;
}

function cardioBase(extra = "") {
  return `
    <g>
      <path d="M64 26 C51 11 28 22 30 44 C32 65 51 80 64 91 C77 80 96 65 98 44 C100 22 77 11 64 26 Z" fill="#f6f6f6" stroke="${grayStroke}" stroke-width="1.8"/>
      <path d="M35 67 C49 81 58 88 64 94 C70 88 79 81 93 67" fill="none" stroke="#c9cbce" stroke-width="1.2"/>
      ${extra}
    </g>
  `;
}

const cards = {
  biceps: armSide("left", muscle([
    { d: "M41 28 C52 33 55 54 48 70 C43 82 34 83 30 72 C29 55 31 38 41 28 Z", fibers: ["M39 34 C44 42 46 55 43 68", "M34 43 C39 51 40 62 37 73", "M47 39 C50 49 50 58 47 66"] },
    { d: "M34 71 C43 73 47 88 43 104 C39 110 32 108 29 101 C29 90 30 79 34 71 Z", opacity: 0.86, fibers: ["M35 77 C38 85 38 94 35 102"] },
  ])),
  triceps: armSide("right", muscle([
    { d: "M30 33 C40 30 48 42 49 58 C49 75 43 86 34 84 C27 72 24 47 30 33 Z", fibers: ["M32 39 C36 50 37 65 34 78", "M40 42 C44 53 44 67 39 80"] },
    { d: "M45 60 C52 68 55 89 50 103 C45 111 38 107 38 97 C41 83 42 70 45 60 Z", opacity: 0.84, fibers: ["M46 68 C49 79 48 91 45 101"] },
  ])),
  rectusAbs: baseTorso(muscle([
    { d: "M51 40 C55 37 61 37 63 40 L62 50 C58 52 54 52 51 50 Z", fibers: ["M57 39 L57 51"] },
    { d: "M65 40 C67 37 73 37 77 40 L77 50 C74 52 70 52 66 50 Z", fibers: ["M71 39 L71 51"] },
    { d: "M51 53 C55 51 61 51 63 53 L62 64 C58 66 54 66 51 64 Z" },
    { d: "M66 53 C70 51 74 51 77 53 L77 64 C74 66 70 66 66 64 Z" },
    { d: "M52 67 C56 65 60 65 62 67 L61 80 C58 82 55 82 52 80 Z" },
    { d: "M67 67 C70 65 74 65 76 67 L76 80 C73 82 70 82 67 80 Z" },
    { d: "M55 83 C59 81 69 81 73 83 L70 98 C66 101 62 101 58 98 Z", opacity: 0.9 },
  ])),
  obliques: baseTorso(muscle([
    { d: "M42 45 C51 53 54 68 51 87 C43 77 38 61 42 45 Z", opacity: 0.86, fibers: ["M43 53 C47 58 49 66 49 77", "M41 63 C44 68 46 75 46 82"] },
    { d: "M86 45 C77 53 74 68 77 87 C85 77 90 61 86 45 Z", opacity: 0.86, fibers: ["M85 53 C81 58 79 66 79 77", "M87 63 C84 68 82 75 82 82"] },
    { d: "M48 38 C53 42 55 48 54 55 C48 51 45 45 48 38 Z", opacity: 0.72 },
    { d: "M80 38 C75 42 73 48 74 55 C80 51 83 45 80 38 Z", opacity: 0.72 },
  ])),
  transverseAbs: baseTorso(muscle([
    { d: "M45 55 C57 49 71 49 83 55 L82 70 C70 76 58 76 46 70 Z", opacity: 0.88, fibers: ["M49 57 C58 61 70 61 79 57", "M48 65 C58 69 70 69 80 65"] },
    { d: "M44 71 C57 77 72 77 84 71 L80 88 C70 94 58 94 48 88 Z", opacity: 0.78, fibers: ["M50 79 C59 83 69 83 78 79"] },
  ])),
  lowerAbs: baseTorso(muscle([
    { d: "M50 62 C55 59 61 59 64 62 L63 75 C59 78 54 78 50 75 Z", opacity: 0.78 },
    { d: "M65 62 C68 59 74 59 78 62 L78 75 C74 78 69 78 65 75 Z", opacity: 0.78 },
    { d: "M52 76 C58 73 70 73 76 76 L72 98 C68 102 60 102 56 98 Z", fibers: ["M64 76 L64 99", "M57 84 C62 88 67 88 72 84", "M58 93 C62 96 67 96 70 93"] },
  ])),
  hipFlexors: legs(muscle([
    { d: "M49 34 C57 40 59 55 55 70 C48 62 44 47 49 34 Z", fibers: ["M50 40 C53 48 53 58 52 66"] },
    { d: "M79 34 C71 40 69 55 73 70 C80 62 84 47 79 34 Z", fibers: ["M78 40 C75 48 75 58 76 66"] },
    { d: "M58 37 C63 45 64 59 61 75 C55 66 54 50 58 37 Z", opacity: 0.8 },
    { d: "M70 37 C65 45 64 59 67 75 C73 66 74 50 70 37 Z", opacity: 0.8 },
  ])),
  erectors: baseTorso(`
    <path d="M54 19 C51 38 50 62 51 95" fill="none" stroke="#b8babd" stroke-width="4" stroke-linecap="round"/>
    <path d="M74 19 C77 38 78 62 77 95" fill="none" stroke="#b8babd" stroke-width="4" stroke-linecap="round"/>
    ${muscle([
      { d: "M55 23 C61 38 60 69 56 96 C51 79 50 43 55 23 Z", fibers: ["M56 31 C57 49 57 72 55 90"] },
      { d: "M73 23 C67 38 68 69 72 96 C77 79 78 43 73 23 Z", fibers: ["M72 31 C71 49 71 72 73 90"] },
    ])}
  `),
  recovery: cardioBase(`
    <path d="M42 58 C50 64 58 65 64 58 C70 65 78 64 86 58" fill="none" stroke="#007d48" stroke-width="5" stroke-linecap="round" opacity=".9"/>
    <path d="M45 42 C55 32 73 32 83 42" fill="none" stroke="#007d48" stroke-width="4" stroke-linecap="round" opacity=".72"/>
    <path d="M39 79 C51 89 77 89 89 79" fill="none" stroke="#007d48" stroke-width="4" stroke-linecap="round" opacity=".68"/>
    <circle cx="64" cy="58" r="10" fill="#007d48" opacity=".18"/>
  `),
};

function svg(content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 128 128">
  <defs>
    <clipPath id="clip"><circle cx="64" cy="64" r="58"/></clipPath>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#111111" flood-opacity=".12"/></filter>
  </defs>
  <rect width="128" height="128" fill="#ffffff"/>
  <circle cx="64" cy="64" r="58" fill="#ffffff" stroke="#6f819b" stroke-width="1.8" filter="url(#shadow)"/>
  <g clip-path="url(#clip)">${content}</g>
  <circle cx="64" cy="64" r="58" fill="none" stroke="#6f819b" stroke-width="1.8"/>
</svg>
`;
}

for (const [name, content] of Object.entries(cards)) {
  writeFileSync(join(outputDir, `${name}.svg`), svg(content));
}

console.log(`Generated ${Object.keys(cards).length} muscle focus cards.`);
