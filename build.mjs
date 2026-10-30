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

// Freshness for crawlers: stamp today's date into the sitemap and the ProfilePage schema.
const today = new Date().toISOString().slice(0, 10);
writeFileSync(`${OUT}/sitemap.xml`, readFileSync('sitemap.xml', 'utf8').replace(/<lastmod>[^<]*<\/lastmod>/g, `<lastmod>${today}</lastmod>`));
const page = readFileSync(`${OUT}/index.html`, 'utf8').replace(/"dateModified": "[^"]*"/, `"dateModified": "${today}"`);
writeFileSync(`${OUT}/index.html`, page);

// llms.txt: a plain-text profile for AI assistants and answer engines (https://llmstxt.org).
const c = JSON.parse(readFileSync('content.json', 'utf8'));
const line = (s) => String(s).replace(/\s+/g, ' ').trim();
writeFileSync(`${OUT}/llms.txt`, [
    '# R Sai Pranav',
    '',
    '> Software engineer from Bangalore, India (B.Tech CSE, REVA University, 2023-2027). Major Contributor at mnemosyne systems, working on PostgreSQL tooling in C (pgmoneta, pgagroal, pgexporter, pgvictoria). Hackathon winner and patent holder.',
    '',
    'Website: https://saipranav.me/ · GitHub: https://github.com/Pranav-error · LinkedIn: https://www.linkedin.com/in/rsaipranav · Writing: https://dev.to/pranav-error',
    'Team page: https://mnemosyne-systems.ai/about/team/ · Email: rajasaipranav0@gmail.com',
    '',
    '## Now',
    ...c.now.map((n) => `- ${line(n)}`),
    '',
    '## Experience',
    ...c.experience.map((x) => `- ${line(x.role)} — ${line(x.company)} (${line(x.period)}): ${line((x.points || [])[0] || '')}`),
    '',
    '## Selected projects',
    ...c.projects.filter((p) => p.featured).map((p) => `- [${line(p.title)}](${p.link || 'https://github.com/Pranav-error'}): ${line(p.description)}`),
    '',
    '## Achievements',
    ...c.achievements.map((a) => `- ${line(a.title)} (${line(a.date)}): ${line(a.description)}`),
    '',
].join('\n'));
console.log('built dist/');
