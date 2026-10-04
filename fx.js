(() => {
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = matchMedia('(pointer: fine)').matches;
    const onceVisible = (el, fn, threshold = 0.35) => {
        if (!el) return;
        new IntersectionObserver((entries, obs) => {
            if (entries[0].isIntersecting) { obs.disconnect(); fn(); }
        }, { threshold }).observe(el);
    };

    // ---- Avatar panel: tilt with the pointer, speech bubble types real headlines ----
    const panel = document.getElementById('avatar-panel');
    const say = document.getElementById('avatar-say');
    const LINES = [
        "hi, i'm pranav",
        'shipping MES APIs at Cepheid',
        '50+ patches merged upstream',
        'ask me about pgagroal',
        '20+ hackathons and counting',
    ];

    if (panel && !calm) {
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
            // Touch: a tap plays the glasses glint that hover shows on desktop
            panel.addEventListener('click', () => {
                panel.classList.add('glint');
                setTimeout(() => panel.classList.remove('glint'), 900);
            });
        }

        // Pixel-in: the portrait resolves from chunky blocks to full detail, like a sprite loading
        const img = panel.querySelector('.avatar-img'), label = panel.querySelector('.avatar-label');
        const canvas = document.createElement('canvas');
        canvas.className = 'avatar-pix';
        canvas.width = canvas.height = 368;
        img.after(canvas);
        panel.classList.add('pixelating');
        const pixelIn = async () => {
            try { await img.decode(); } catch { return panel.classList.remove('pixelating'); }
            const ctx = canvas.getContext('2d'), small = document.createElement('canvas'), sctx = small.getContext('2d');
            const STEPS = [46, 30, 20, 13, 8, 5, 3];
            for (const [i, block] of STEPS.entries()) {
                const n = Math.ceil(canvas.width / block);
                small.width = small.height = n;
                sctx.drawImage(img, 0, 0, n, n);
                ctx.imageSmoothingEnabled = false;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(small, 0, 0, n, n, 0, 0, canvas.width, canvas.height);
                label.textContent = `AVATAR.JPG ${Math.round(((i + 1) / (STEPS.length + 1)) * 100)}%`;
                await new Promise(r => setTimeout(r, i < 2 ? 190 : 120));
            }
            label.textContent = 'AVATAR.JPG';
            panel.classList.remove('pixelating');
            canvas.remove();
            panel.classList.add('glint');
            setTimeout(() => panel.classList.remove('glint'), 1100);
        };

        onceVisible(panel, () => {
            pixelIn();
            let line = 0;
            const type = (text, i = 0) => {
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

    // ---- Stat tiles count up when they scroll into view ----
    document.querySelectorAll('[data-count]').forEach((el) => {
        const [, num, suffix] = el.dataset.count.match(/^([\d.]+)(.*)$/);
        const target = parseFloat(num), decimals = (num.split('.')[1] || '').length;
        if (calm) return;
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

    // ---- Experience timeline line fills with scroll progress ----
    const timeline = document.getElementById('experience-timeline');
    if (timeline && !calm) {
        let queued = false;
        const update = () => {
            queued = false;
            const r = timeline.getBoundingClientRect(), mid = innerHeight * 0.6;
            timeline.style.setProperty('--p', Math.min(Math.max((mid - r.top) / r.height, 0), 1).toFixed(3));
        };
        addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
        update();
    }

    // ---- Click burst of brutalist confetti ----
    if (!calm && finePointer) {
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
    }
})();
