import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
import { parseHTML } from 'linkedom';

const OUT = 'dist';
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);
for (const f of ['admin.html', 'content.json', 'render.js', 'fx.js', 'terminal.js', 'robots.txt', 'sitemap.xml', 'Assets']) cpSync(f, `${OUT}/${f}`, { recursive: true });

execFileSync('npx', ['tailwindcss', '-i', 'tailwind.css', '-o', `${OUT}/styles.css`, '--minify'], { stdio: 'inherit' });

// Pre-render content.json into the page so crawlers that don't run JS still see projects, experience, etc.
const { document } = parseHTML(readFileSync('index.html', 'utf8'));
const ctx = vm.createContext({ document });
vm.runInContext(readFileSync('render.js', 'utf8') + '\nrenderContent(data);', Object.assign(ctx, { data: JSON.parse(readFileSync('content.json', 'utf8')) }));
writeFileSync(`${OUT}/index.html`, '<!DOCTYPE html>\n' + document.documentElement.outerHTML);
console.log('built dist/');
