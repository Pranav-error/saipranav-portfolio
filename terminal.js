(() => {
    const modal = document.getElementById('terminal-modal');
    const win = document.getElementById('terminal-modal-inner');
    const out = document.getElementById('terminal-output');
    const form = document.getElementById('terminal-form');
    const input = document.getElementById('terminal-input');
    const fab = document.getElementById('terminal-fab');
    if (!modal || !out) return;

    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const wait = (ms) => new Promise(r => setTimeout(r, calm ? 0 : ms));
    const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const pad = (t, n) => String(t).padEnd(n);
    const PROMPT = '<span class="c-g b">pranav@portfolio</span><span class="c-d">:</span><span class="c-b b">~</span><span class="c-d">$</span>';
    document.querySelector('.term-prompt').innerHTML = PROMPT;

    const site = async () => window.SITE || (window.SITE = await (await fetch('content.json')).json());
    const projects = async () => (await site()).projects.map(p => ({ ...p, slug: slug(p.title) }));
    const commitTotal = async () => {
        try { const j = await contributions; return j.total.lastYear ?? Object.values(j.total)[0]; } catch { return null; }
    };

    // ---------- output ----------
    const line = (html = '', cls = '') => {
        const d = document.createElement('div');
        if (cls) d.className = cls;
        d.innerHTML = html;
        out.appendChild(d);
        out.scrollTop = out.scrollHeight;
        return d;
    };
    const stream = async (lines, gap = 22) => { for (const l of lines) { line(l); await wait(gap); } };
    const echo = (cmd) => line(`${PROMPT} <span style="color:#fff">${esc(cmd)}</span>`);
    const typeCmd = async (cmd) => {
        const d = line(`${PROMPT} <span style="color:#fff"></span>`), span = d.lastChild;
        for (let i = 1; i <= cmd.length; i++) { span.textContent = cmd.slice(0, i); await wait(55); }
        await wait(180);
    };

    const BANNER = [
        ['c-y', '██████╗ ██████╗  █████╗ ███╗   ██╗ █████╗ ██╗   ██╗'],
        ['c-y', '██╔══██╗██╔══██╗██╔══██╗████╗  ██║██╔══██╗██║   ██║'],
        ['c-p', '██████╔╝██████╔╝███████║██╔██╗ ██║███████║██║   ██║'],
        ['c-p', '██╔═══╝ ██╔══██╗██╔══██║██║╚██╗██║██╔══██║╚██╗ ██╔╝'],
        ['c-b', '██║     ██║  ██║██║  ██║██║ ╚████║██║  ██║ ╚████╔╝ '],
        ['c-b', '╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝  ╚═══╝  '],
    ];
    const banner = () => line(BANNER.map(([c, t]) => `<span class="${c}">${t}</span>`).join('\n'), 'term-banner');

    // ---------- commands ----------
    const SECTIONS = { top: 'body', about: '#about', skills: '#skills', experience: '#experience', logs: '#experience', github: '#coding-stats',
        work: '#projects', projects: '#projects', achievements: '#achievements', battles: '#hackathons', hackathons: '#hackathons',
        clients: '#freelance', freelance: '#freelance', contact: '#contact' };

    const C = {
        async help() {
            const rows = [
                ['about', 'who I am, in one screen'], ['ls', 'list the filesystem (try: ls projects)'], ['cat <project>', 'details for one project'],
                ['open <project>', 'open a project in a new tab'], ['experience', 'work history'], ['oss', 'open-source contributions, charted'],
                ['hackathons', 'every hackathon and the result'], ['skills', 'tech stack'], ['contact', 'ways to reach me'],
                ['resume sde|aiml', 'download a CV'], ['blog', 'things I\'ve written'], ['neofetch', 'system info, except the system is me'], ['cd <section>', 'jump to a part of the page'],
                ['theme dark|light', 'switch the site theme'], ['clear · history · exit', ''],
            ];
            await stream([...rows.map(([c, d]) => `  <span class="c-g">${esc(pad(c, 24))}</span><span class="c-d">${d}</span>`), '',
                '<span class="c-d">  tab completes · ↑/↓ walks history · there may be easter eggs</span>']);
        },
        async whoami() {
            const s = await site(), e = s.experience[0];
            line(`<span class="b" style="color:#fff">R Sai Pranav</span> — Software Engineer &amp; AI/ML Engineer`);
            line(`<span class="c-d">currently:</span> ${esc(e.role)} @ ${esc(e.company)}`);
        },
        async about() {
            await C.whoami();
            await stream(['', `<span class="c-y">edu   </span> REVA University · B.Tech CSE (2023–2027) · GPA 8.54`,
                `<span class="c-y">where </span> Bangalore, Karnataka`, `<span class="c-y">known </span> 65+ upstream patches · patent filed · national hackathon winner`,
                `<span class="c-y">status</span> <span class="c-g">● ${esc((await site()).meta?.availability?.toLowerCase() || 'available')}</span>`]);
        },
        async ls(arg) {
            if (!arg) return line('<span class="c-b b">projects/</span>  <span class="c-b b">experience/</span>  <span class="c-b b">hackathons/</span>  <span class="c-b b">oss/</span>  <span class="c-b b">resume/</span>  about.txt  contact.txt');
            if (/^projects\/?$/.test(arg)) {
                const ps = await projects(), cats = [...new Set(ps.map(p => p.category))];
                for (const c of cats) {
                    line(`<span class="c-y b">${esc(c)}/</span>`);
                    await stream(ps.filter(p => p.category === c).map(p => `  <span class="c-b">${esc(p.slug)}</span>${p.featured ? ' <span class="c-p">★</span>' : ''}`), 12);
                }
                return line(`<span class="c-d">${ps.length} projects · cat &lt;name&gt; for details · ★ = featured</span>`);
            }
            const map = { 'experience': C.experience, 'hackathons': C.hackathons, 'oss': C.oss, 'resume': () => line('sde.pdf  aiml.pdf   <span class="c-d">(resume sde | resume aiml)</span>') };
            const fn = map[arg.replace(/\/$/, '')];
            return fn ? fn() : line(`<span class="c-r">ls: cannot access '${esc(arg)}': No such file or directory</span>`);
        },
        async cat(arg) {
            if (!arg) return line('<span class="c-r">cat: missing operand</span> — try <span class="c-g">ls projects</span>');
            if (arg === 'about.txt') return C.about();
            if (arg === 'contact.txt') return C.contact();
            const p = (await projects()).find(p => p.slug === slug(arg) || p.slug.startsWith(slug(arg)));
            if (!p) return line(`<span class="c-r">cat: ${esc(arg)}: No such project</span> — try <span class="c-g">ls projects</span>`);
            await stream([`<span class="b" style="color:#fff">${esc(p.title)}</span>  <span class="c-p">[ ${esc(p.tag)} ]</span>`, esc(p.description),
                `<span class="c-d">stack:</span> <span class="c-b">${esc((p.tech || []).join(' · '))}</span>`,
                p.link ? `<span class="c-d">link: </span> <a href="${esc(p.link)}" target="_blank" rel="noopener">${esc(p.link)}</a>` : '<span class="c-d">link:  private repo</span>']);
        },
        async open(arg) {
            const p = (await projects()).find(p => p.slug === slug(arg || '') || p.slug.startsWith(slug(arg || '-')));
            if (!p?.link) return line(`<span class="c-r">open: ${esc(arg || '')}: nothing to open</span>`);
            line(`<span class="c-d">opening</span> ${esc(p.link)} …`);
            window.open(p.link, '_blank', 'noopener');
        },
        async experience() {
            for (const e of (await site()).experience) {
                line(`<span class="c-g b">${esc(e.role)}</span> <span class="c-d">@</span> ${esc(e.company)}  <span class="c-y">${esc(e.period)}</span>`);
                await stream(e.points.map((p, i) => `<span class="c-d">  ${i === e.points.length - 1 ? '└─' : '├─'}</span> ${esc(p)}`), 30);
                line('');
            }
        },
        async oss() {
            const oss = (await site()).experience.find(e => /open source/i.test(e.role));
            const counts = [...(oss?.points[0] || '').matchAll(/([A-Za-z][\w ./-]*?) \((\d+)\)/g)].map(m => [m[1].replace(/^.*— /, ''), +m[2]]);
            if (!counts.length) return line('<span class="c-d">no data</span>');
            const max = Math.max(...counts.map(c => c[1])), colors = ['c-g', 'c-y', 'c-p', 'c-b', 'c-o', 'c-v', 'c-g'];
            line(`<span class="b" style="color:#fff">merged upstream patches</span>  <span class="c-d">(${counts.reduce((n, c) => n + c[1], 0)} total)</span>`);
            const bars = counts.map(([name, n], i) => {
                const d = line(`<span class="term-name">${esc(name)}</span><span class="term-track"><span class="term-bar ${colors[i % colors.length]}" data-w="${(n / max) * 100}"></span></span><span class="c-d">${n}</span>`, 'term-row');
                return d.querySelector('.term-bar');
            });
            await wait(30);
            bars.forEach((b, i) => setTimeout(() => { b.style.width = b.dataset.w + '%'; }, calm ? 0 : i * 90));
            await wait(counts.length * 90 + 300);
            line(`<span class="c-d">${esc(oss.points[1] || '')}</span>`);
        },
        async hackathons() {
            const hs = (await site()).hackathons;
            const col = (r) => /WIN|1ST/.test(r) ? 'c-y' : /2ND|3RD|FINALIST|TOP|PLACE/.test(r) ? 'c-g' : /PROGRESS/.test(r) ? 'c-b' : 'c-d';
            await stream(hs.map(h => `<span class="c-d">${h.year}</span>  ${pad(esc(h.name), 32)}<span class="${col(h.result)}">${pad(esc(h.result), 12)}</span><span class="c-d">${esc(h.project)}</span>`), 25);
        },
        async skills() {
            const groups = {};
            document.querySelectorAll('#skills .group').forEach(t => {
                const [k, v] = [...t.children].map(c => c.textContent.replace('>_', '').trim());
                (groups[k] ||= []).push(v);
            });
            await stream(Object.entries(groups).map(([k, v]) => `<span class="c-y">${pad(k.toLowerCase(), 11)}</span>${v.map(x => `<span class="c-b">${esc(x.toLowerCase())}</span>`).join('  ')}`));
        },
        async contact() {
            await stream([`<span class="c-y">email   </span> <a href="mailto:rajasaipranav0@gmail.com">rajasaipranav0@gmail.com</a>`,
                `<span class="c-y">github  </span> <a href="https://github.com/Pranav-error" target="_blank" rel="noopener">github.com/Pranav-error</a>`,
                `<span class="c-y">linkedin</span> <a href="https://www.linkedin.com/in/rsaipranav" target="_blank" rel="noopener">linkedin.com/in/rsaipranav</a>`,
                `<span class="c-d">or run</span> <span class="c-g">sudo hire-me</span>`]);
        },
        async resume(arg) {
            const files = { sde: ['Assets/Resume/Sai Pranav Resume.pdf', 'R Sai Pranav Resume - SDE.pdf'], aiml: ['Assets/Resume/Sai Pranav Resume - AIML.pdf', 'R Sai Pranav Resume - AI ML.pdf'] };
            const f = files[(arg || '').replace(/[^a-z]/g, '')];
            if (!f) return line('usage: <span class="c-g">resume sde</span> | <span class="c-g">resume aiml</span>');
            const a = Object.assign(document.createElement('a'), { href: f[0], download: f[1] });
            document.body.appendChild(a); a.click(); a.remove();
            line(`<span class="c-g">✓</span> downloading ${esc(f[1])}`);
        },
        async blog() {
            await stream([`<span class="c-y">2026-10</span>  <a href="https://dev.to/pranav-error/two-stack-overflows-hiding-in-plain-sight-1on2" target="_blank" rel="noopener">Two stack overflows hiding in plain sight</a>`,
                '<span class="c-d">          strcat into 512 bytes (pgagroal) and "%.8f" into 30 bytes (GRASS GIS)</span>']);
        },
        async neofetch() {
            const s = await site(), commits = await commitTotal(), years = new Date().getFullYear() - 2023;
            const art = ['      .-"""""""-.     ', '    .\'           \'.   ', '   /   _       _   \\  ', '  |  (o)-----(o)   | ', '  |       ^        | ',
                '   \\    \'---\'     /  ', '    \'.           .\'   ', '      \'-._____.-\'     ', '        |  |  |       ', '       /___|___\\      ', '                      '];
            const info = [`<span class="c-g b">pranav</span>@<span class="c-g b">portfolio</span>`, '<span class="c-d">----------------</span>',
                `<span class="c-y">os</span>        neo-brutalist 2026`, `<span class="c-y">host</span>      REVA University · B.Tech CSE`,
                `<span class="c-y">kernel</span>    ${esc(s.experience[0].role)} @ Cepheid`, `<span class="c-y">uptime</span>    ${years} years of shipping`,
                `<span class="c-y">packages</span>  ${s.projects.length} projects · 65+ upstream patches`, `<span class="c-y">commits</span>   ${commits ? commits.toLocaleString('en-US') + ' in the last year' : 'a lot'}`,
                `<span class="c-y">shell</span>     pranav-sh 2.0`, `<span class="c-y">langs</span>     python · c · c++ · java · typescript`,
                ['c-y', 'c-p', 'c-b', 'c-g', 'c-v', 'c-o'].map(c => `<span class="${c}">███</span>`).join('')];
            await stream(art.map((a, i) => `<span class="c-g">${esc(a)}</span>  ${info[i] || ''}`), 35);
        },
        async cd(arg) {
            const sel = SECTIONS[(arg || 'top').replace(/[^a-z]/g, '')];
            if (!sel) return line(`<span class="c-r">cd: no such section: ${esc(arg)}</span>  <span class="c-d">(${Object.keys(SECTIONS).join(' ')})</span>`);
            line(`<span class="c-d">→</span> ${esc(arg || 'top')}`);
            await wait(250);
            closeTerminal();
            document.querySelector(sel).scrollIntoView({ behavior: calm ? 'auto' : 'smooth' });
        },
        theme(arg) {
            const dark = document.documentElement.classList.contains('dark');
            if (!['dark', 'light'].includes(arg)) return line(`usage: theme dark | theme light   <span class="c-d">(now: ${dark ? 'dark' : 'light'})</span>`);
            if ((arg === 'dark') !== dark) window.toggleTheme?.();
            line(`<span class="c-g">✓</span> theme set to ${arg}`);
        },
        history() { hist.forEach((h, i) => line(`<span class="c-d">${String(i + 1).padStart(4)}</span>  ${esc(h)}`)); },
        clear() { out.innerHTML = ''; },
        exit() { closeTerminal(); },
        // ---- easter eggs ----
        async sudo(arg) {
            if (!/^hire-?me$/.test(arg || '')) return line('<span class="c-r">nice try. this incident will be reported.</span>');
            line('[sudo] password for recruiter: ');
            const d = out.lastChild;
            for (let i = 0; i < 8; i++) { d.textContent += '*'; await wait(70); }
            await wait(250);
            await stream(['<span class="c-g">✓ access granted</span>', '<span class="c-d">drafting an email to pranav…</span>']);
            await wait(500);
            location.href = 'mailto:rajasaipranav0@gmail.com?subject=' + encodeURIComponent("Let's work together");
        },
        async rm(arg) { line(/-rf/.test(arg || '') ? '<span class="c-r">rm: permission denied — this portfolio is load-bearing</span>' : '<span class="c-r">rm: no.</span>'); },
        async coffee() {
            await stream(['<span class="c-o">      ( (</span>', '<span class="c-o">       ) )</span>', '<span class="c-y">    ........</span>',
                '<span class="c-y">    |      |]</span>', '<span class="c-y">    \\      /</span>', '<span class="c-y">     `----\'</span>', '<span class="c-d">brewed. back to shipping.</span>'], 60);
        },
        hi() { line('hey 👋 — type <span class="c-g">help</span> to look around'); },
        ping() { line('pong <span class="c-d">(0.4 ms — it\'s all local)</span>'); },
        async matrix() {
            const screen = document.getElementById('terminal-screen');
            const cv = Object.assign(document.createElement('canvas'), { className: 'term-matrix' });
            screen.appendChild(cv);
            cv.width = screen.clientWidth; cv.height = screen.clientHeight;
            const g = cv.getContext('2d'), size = 14, cols = Math.floor(cv.width / size), drops = Array(cols).fill(0).map(() => Math.random() * -40);
            const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789PRANAV';
            let stop = false;
            const end = () => { stop = true; };
            addEventListener('keydown', end, { once: true }); cv.addEventListener('click', end, { once: true });
            const t0 = performance.now();
            await new Promise((done) => {
                const frame = (now) => {
                    g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(0, 0, cv.width, cv.height);
                    g.font = `${size}px monospace`;
                    drops.forEach((y, i) => {
                        g.fillStyle = Math.random() > 0.96 ? '#fff' : '#33FF57';
                        g.fillText(chars[Math.floor(Math.random() * chars.length)], i * size, y * size);
                        drops[i] = y * size > cv.height && Math.random() > 0.97 ? 0 : y + 1;
                    });
                    if (stop || now - t0 > 7000) return done();
                    setTimeout(() => requestAnimationFrame(frame), 45);
                };
                requestAnimationFrame(frame);
            });
            removeEventListener('keydown', end);
            cv.remove();
            line('<span class="c-d">wake up, recruiter…</span>');
        },
    };
    const ALIASES = { writing: () => C.blog(), posts: () => C.blog(), projects: () => C.ls('projects'), exp: C.experience, work: () => C.ls('projects'), cv: C.resume, hello: C.hi, '?': C.help, man: C.help };

    // ---------- input ----------
    const hist = [];
    let hi = 0, booted = false, running = false;

    const closest = (cmd) => {
        const names = Object.keys(C).filter(n => !['rm', 'coffee', 'matrix', 'sudo', 'hi', 'ping'].includes(n));
        const dist = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
            for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] !== b[j - 1]));
            return d[a.length][b.length]; };
        const best = names.map(n => [n, dist(cmd, n)]).sort((a, b) => a[1] - b[1])[0];
        return best && best[1] <= 2 ? best[0] : null;
    };

    const run = async (raw, typed = false) => {
        const cmdline = raw.trim();
        if (!cmdline) return line(PROMPT);
        typed ? await typeCmd(cmdline) : echo(cmdline);
        hist.push(cmdline); hi = hist.length;
        const [cmd, ...rest] = cmdline.split(/\s+/);
        const fn = C[cmd.toLowerCase()] || ALIASES[cmd.toLowerCase()];
        running = true;
        try {
            if (fn) await fn(rest.join(' ').toLowerCase());
            else {
                const guess = closest(cmd.toLowerCase());
                line(`<span class="c-r">pranav-sh: command not found: ${esc(cmd)}</span>${guess ? `  <span class="c-d">did you mean</span> <span class="c-g">${guess}</span><span class="c-d">?</span>` : '  <span class="c-d">try</span> <span class="c-g">help</span>'}`);
            }
        } catch (e) { line(`<span class="c-r">error: ${esc(e.message)}</span>`); }
        running = false;
        if (out.lastChild && cmd !== 'clear') line('');
    };

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (running) return;
        const v = input.value;
        input.value = '';
        run(v);
    });

    input.addEventListener('keydown', async (e) => {
        if (e.key === 'ArrowUp' && hist.length) { e.preventDefault(); hi = Math.max(0, hi - 1); input.value = hist[hi]; }
        else if (e.key === 'ArrowDown') { e.preventDefault(); hi = Math.min(hist.length, hi + 1); input.value = hist[hi] || ''; }
        else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); C.clear(); }
        else if (e.key === 'Tab') {
            e.preventDefault();
            const parts = input.value.split(/\s+/);
            let pool;
            if (parts.length === 1) pool = [...Object.keys(C), 'projects'].filter(n => !['rm', 'coffee', 'matrix', 'hi', 'ping'].includes(n));
            else if (['cat', 'open'].includes(parts[0])) pool = (await projects()).map(p => p.slug);
            else if (parts[0] === 'cd') pool = Object.keys(SECTIONS);
            else if (parts[0] === 'resume') pool = ['sde', 'aiml'];
            else if (parts[0] === 'theme') pool = ['dark', 'light'];
            else if (parts[0] === 'ls') pool = ['projects', 'experience', 'hackathons', 'oss', 'resume'];
            const cur = parts[parts.length - 1].toLowerCase(), hits = (pool || []).filter(n => n.startsWith(cur));
            if (hits.length === 1) { parts[parts.length - 1] = hits[0]; input.value = parts.join(' ') + ' '; }
            else if (hits.length > 1) {
                echo(input.value);
                line(hits.map(h => `<span class="c-b">${esc(h)}</span>`).join('  '));
                const common = hits.reduce((a, b) => { let i = 0; while (i < a.length && a[i] === b[i]) i++; return a.slice(0, i); });
                parts[parts.length - 1] = common; input.value = parts.join(' ');
            }
        }
    });
    document.getElementById('terminal-screen').addEventListener('click', () => { if (!getSelection().toString()) input.focus(); });

    // ---------- open / close ----------
    const boot = async () => {
        booted = true;
        running = true;
        const s = await site(), commits = await commitTotal();
        await stream([`<span class="c-d">[ 0.000] booting pranav-sh 2.0 …</span>`,
            `<span class="c-g">[  OK  ]</span> mounted /projects <span class="c-d">(${s.projects.length} entries)</span>`,
            `<span class="c-g">[  OK  ]</span> linked upstream: pgmoneta, pgagroal, pgvictoria <span class="c-d">+4</span>`,
            `<span class="c-g">[  OK  ]</span> loaded contributions <span class="c-d">(${commits ? commits.toLocaleString('en-US') + ' this year' : 'cached'})</span>`,
            `<span class="c-g">[  OK  ]</span> caffeine levels nominal`], 140);
        await wait(200);
        banner();
        line('welcome. type <span class="c-g">help</span> to look around, or try <span class="c-g">neofetch</span>.');
        line('');
        running = false;
        await run('whoami', true);
    };

    window.openTerminal = () => {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden';
        win.style.animation = 'none'; void win.offsetWidth; win.style.animation = '';
        input.focus();
        if (!booted) boot();
    };
    window.closeTerminal = () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = '';
        fab?.focus({ preventScroll: true });
    };
    window.termClear = () => { C.clear(); input.focus(); };
    window.termMaximize = () => {
        win.classList.toggle('max');
        modal.classList.toggle('term-max');
        input.focus();
    };

    document.addEventListener('keydown', (e) => {
        const open = !modal.classList.contains('hidden');
        if (e.key === 'Escape' && open) return closeTerminal();
        const typing = e.target.closest?.('input, textarea, [contenteditable]') && e.target !== input;
        if (typing) return;
        if ((e.key === '`' && !open) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
            e.preventDefault();
            open ? closeTerminal() : openTerminal();
        }
    });
})();
