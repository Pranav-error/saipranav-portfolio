(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const finePointer = matchMedia('(pointer: fine)').matches;
    const $ = (s, root = document) => root.querySelector(s);
    const $$ = (s, root = document) => [...root.querySelectorAll(s)];
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    const onceVisible = (el, fn, threshold = 0.35) => {
        if (!el) return;
        new IntersectionObserver((entries, obs) => {
            if (entries[0].isIntersecting) { obs.disconnect(); fn(); }
        }, { threshold }).observe(el);
    };
    // Runs fn every `ms` only while el is on screen and the tab is visible
    const whileVisible = (el, ms, fn) => {
        if (!el) return;
        let seen = false;
        new IntersectionObserver(([e]) => { seen = e.isIntersecting; }, { threshold: 0.15 }).observe(el);
        setInterval(() => { if (seen && !document.hidden) fn(); }, ms);
    };

    // ---- Decode: text resolves from scrambled glyphs, terminal style ----
    const GLYPHS = 'ABCDEFGHJKLMNOPQRSTUVWXYZ0123456789#%&@$';
    const decode = (el, dur = 650) => {
        if (!el || el.dataset.decoding) return;
        el.dataset.decoding = '1';
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) if (walker.currentNode.nodeValue.trim()) nodes.push([walker.currentNode, walker.currentNode.nodeValue]);
        const total = nodes.reduce((n, [, t]) => n + t.length, 0);
        const start = performance.now();
        const frame = (now) => {
            const reveal = Math.min((now - start) / dur, 1) * total;
            let idx = 0;
            for (const [node, text] of nodes) {
                let out = '';
                for (const ch of text) out += (idx++ < reveal || ch === ' ') ? ch : pick(GLYPHS);
                node.nodeValue = out;
            }
            if (reveal < total) requestAnimationFrame(frame);
            else { nodes.forEach(([n, t]) => { n.nodeValue = t; }); delete el.dataset.decoding; }
        };
        requestAnimationFrame(frame);
    };

    $$('section h2').forEach((h) => {
        onceVisible(h, () => decode(h, 800), 0.5);
        h.addEventListener('mouseenter', () => decode(h, 500));
    });
    $$('nav a').forEach((a) => a.addEventListener('mouseenter', () => decode(a, 300)));

    // ---- Avatar panel ----
    const panel = $('#avatar-panel');
    if (panel) {
        const img = $('.avatar-img', panel), label = $('.avatar-label', panel), say = $('#avatar-say'), bubble = $('.avatar-bubble', panel);
        const canvas = document.createElement('canvas');
        canvas.className = 'avatar-pix';
        canvas.width = canvas.height = 368;
        const ctx = canvas.getContext('2d'), small = document.createElement('canvas'), sctx = small.getContext('2d');
        let busy = false;

        const drawBlocks = (block) => {
            const n = Math.ceil(canvas.width / block);
            small.width = small.height = n;
            sctx.drawImage(img, 0, 0, n, n);
            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(small, 0, 0, n, n, 0, 0, canvas.width, canvas.height);
        };
        const glint = () => { panel.classList.add('glint'); setTimeout(() => panel.classList.remove('glint'), 1100); };
        // Plays a sequence of block sizes over the portrait, then hands back to the real image
        const pixelate = async (steps, delay, onStep) => {
            busy = true;
            img.after(canvas);
            panel.classList.add('pixelating');
            for (const [i, block] of steps.entries()) {
                drawBlocks(block);
                onStep?.(i);
                await wait(typeof delay === 'function' ? delay(i) : delay);
            }
            panel.classList.remove('pixelating');
            canvas.remove();
            busy = false;
            glint();
        };

        panel.classList.add('pixelating');
        onceVisible(panel, async () => {
            try { await img.decode(); } catch { panel.classList.remove('pixelating'); return; }
            const STEPS = [46, 30, 20, 13, 8, 5, 3];
            await pixelate(STEPS, (i) => (i < 2 ? 190 : 120),
                (i) => { label.textContent = `AVATAR.JPG ${Math.round(((i + 1) / (STEPS.length + 1)) * 100)}%`; });
            label.textContent = 'AVATAR.JPG';
        });
        // Keeps going: every few seconds the portrait glitches out to blocks and back
        whileVisible(panel, 7500, () => {
            if (!busy && !panel.matches(':hover') && img.complete) pixelate([4, 9, 18, 28, 18, 9, 4], 70);
        });

        if (finePointer) {
            panel.addEventListener('pointermove', (e) => {
                const r = panel.getBoundingClientRect();
                const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
                panel.style.setProperty('--ry', `${x * 14}deg`);
                panel.style.setProperty('--rx', `${-y * 14}deg`);
                panel.style.setProperty('--mx', x * 2);
                panel.style.setProperty('--my', y * 2);
            });
            panel.addEventListener('pointerleave', () => {
                ['--rx', '--ry'].forEach(p => panel.style.setProperty(p, '0deg'));
                ['--mx', '--my'].forEach(p => panel.style.setProperty(p, 0));
            });
        } else {
            panel.addEventListener('click', glint);
        }

        const LINES = ["hi, i'm pranav", 'shipping MES APIs at Cepheid', '50+ patches merged upstream', 'ask me about pgagroal', '20+ hackathons and counting'];
        onceVisible(panel, () => {
            let line = 0;
            const type = (text, i = 0) => {
                if (i === 0) { bubble.classList.remove('bump'); void bubble.offsetWidth; bubble.classList.add('bump'); }
                say.textContent = text.slice(0, i);
                if (i < text.length) return setTimeout(() => type(text, i + 1), 45);
                setTimeout(erase, 2400);
            };
            const erase = () => {
                const t = say.textContent;
                if (t.length) { say.textContent = t.slice(0, -1); return setTimeout(erase, 20); }
                line = (line + 1) % LINES.length;
                setTimeout(() => type(LINES[line]), 250);
            };
            setTimeout(() => type(LINES[0]), 1300);
        });
    }

    // ---- Hero: letters lean away from the cursor, one flips now and then ----
    const h1 = $('h1');
    const hero = h1?.closest('section');
    if (h1) {
        h1.setAttribute('aria-label', h1.textContent.replace(/\s+/g, ' ').trim());
        const letters = [];
        const walker = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT);
        const textNodes = [];
        while (walker.nextNode()) if (walker.currentNode.nodeValue.trim() && !walker.currentNode.parentElement.closest('.sr-only')) textNodes.push(walker.currentNode);
        textNodes.forEach((node) => {
            const frag = document.createDocumentFragment();
            for (const ch of node.nodeValue.trim()) {
                const s = document.createElement('span');
                s.className = 'fx-l';
                s.setAttribute('aria-hidden', 'true');
                s.textContent = ch;
                frag.appendChild(s);
                letters.push(s);
            }
            node.replaceWith(frag);
        });

        if (finePointer) {
            let rects = [], queued = false, mx = 0, my = 0;
            const measure = () => { rects = letters.map(l => { const r = l.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); };
            const apply = () => {
                queued = false;
                letters.forEach((l, i) => {
                    const [cx, cy] = rects[i], dx = cx - mx, dy = cy - my, d = Math.hypot(dx, dy);
                    const f = Math.max(0, 1 - d / 220);
                    l.style.transform = f ? `translate(${(dx / (d || 1)) * f * 14}px, ${-f * 26}px) rotate(${(dx / (d || 1)) * f * 10}deg)` : '';
                });
            };
            hero.addEventListener('pointerenter', measure);
            addEventListener('resize', measure);
            hero.addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; if (!rects.length) measure(); if (!queued) { queued = true; requestAnimationFrame(apply); } });
            hero.addEventListener('pointerleave', () => letters.forEach(l => { l.style.transform = ''; }));
            addEventListener('scroll', () => { rects = []; }, { passive: true });

            // Floating shapes drift toward the cursor at different depths
            const shapes = $$('.animate-bounce, .animate-pulse', hero);
            hero.addEventListener('pointermove', (e) => {
                const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
                shapes.forEach((s, i) => { s.style.translate = `${x * (i ? -50 : 35)}px ${y * (i ? -40 : 30)}px`; });
            });
        }
        whileVisible(hero, 2600, () => {
            const l = pick(letters);
            l.classList.remove('flip'); void l.offsetWidth; l.classList.add('flip');
        });
    }

    // ---- Tech stack: tiles decode in sequence, then one glitches every so often ----
    const skills = $('#skills');
    if (skills) {
        const tiles = $$('.group', skills);
        onceVisible(skills, () => tiles.forEach((t, i) => setTimeout(() => decode($('.font-display', t), 500), i * 45)), 0.25);
        whileVisible(skills, 1400, () => {
            const t = pick(tiles);
            if (t.matches(':hover')) return;
            t.classList.add('fx-glitch');
            decode($('.font-display', t), 450);
            setTimeout(() => t.classList.remove('fx-glitch'), 500);
        });
    }

    // ---- Project cards: tag decodes on hover ----
    document.addEventListener('mouseover', (e) => {
        const card = e.target.closest('#projects-grid article, #all-projects-grid > a');
        if (!card || card.contains(e.relatedTarget)) return;
        decode(card.querySelector('#projects-grid span.font-mono, #all-projects-grid div.bg-black'), 400);
    });

    // ---- Stat tiles count up ----
    $$('[data-count]').forEach((el) => {
        const [, num, suffix] = el.dataset.count.match(/^([\d.]+)(.*)$/);
        const target = parseFloat(num), decimals = (num.split('.')[1] || '').length;
        el.textContent = (0).toFixed(decimals) + suffix;
        onceVisible(el, () => {
            const start = performance.now(), dur = 1100;
            const tick = (now) => {
                const t = Math.min((now - start) / dur, 1), eased = 1 - Math.pow(1 - t, 3);
                el.textContent = (target * eased).toFixed(decimals) + suffix;
                if (t < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }, 0.6);
    });

    // ---- Experience: line fills with scroll, nodes light up as it reaches them ----
    const timeline = $('#experience-timeline');
    if (timeline) {
        let queued = false;
        const update = () => {
            queued = false;
            const r = timeline.getBoundingClientRect(), mid = innerHeight * 0.6;
            const p = Math.min(Math.max((mid - r.top) / r.height, 0), 1);
            timeline.style.setProperty('--p', p.toFixed(3));
            for (const item of timeline.children) item.classList.toggle('lit', item.offsetTop + 12 <= p * r.height);
        };
        addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
        update();
    }

    if (!finePointer) return;

    // ---- Spotlight that follows the cursor across the background grid ----
    const spot = document.createElement('div');
    spot.id = 'fx-spot';
    document.body.prepend(spot);
    let sx = 0, sy = 0, spotQueued = false;
    addEventListener('pointermove', (e) => {
        sx = e.clientX; sy = e.clientY;
        if (!spotQueued) { spotQueued = true; requestAnimationFrame(() => { spotQueued = false; spot.style.transform = `translate(${sx}px, ${sy}px)`; }); }
    }, { passive: true });

    // ---- Click burst ----
    const COLORS = ['#FBFF48', '#FF70A6', '#3B82F6', '#33FF57', '#A855F7', '#FF9F1C'];
    addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || e.target.closest('input, textarea, select')) return;
        for (let i = 0; i < 7; i++) {
            const bit = document.createElement('i');
            const a = (Math.PI * 2 * i) / 7 + Math.random() * 0.6, d = 30 + Math.random() * 40;
            bit.className = 'fx-bit';
            bit.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;background:${COLORS[i % COLORS.length]};` +
                `--x:${Math.cos(a) * d}px;--y:${Math.sin(a) * d}px;--r:${Math.random() * 360}deg`;
            document.body.appendChild(bit);
            bit.addEventListener('animationend', () => bit.remove());
        }
    });
})();
