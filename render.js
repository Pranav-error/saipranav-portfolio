// Shared by the browser and build.mjs (pre-rendering), so keep it DOM-API only.
// ===== Content Renderer (content.json) =====
const NEO = { yellow: 'neo-yellow', pink: 'neo-pink', blue: 'neo-blue', green: 'neo-green', purple: 'neo-purple', orange: 'neo-orange', red: 'neo-red' };
const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const neo = (c) => NEO[c] || 'neo-yellow';

function renderContent(data) {
    // NOW ticker
    const ticker = document.getElementById('now-ticker');
    if (ticker && data.now?.length) {
        const items = data.now.map(t => `<span class="px-6">⚡ NOW_BUILDING: ${esc(t)}</span>`).join('<span class="text-white">///</span>');
        ticker.innerHTML = items + '<span class="text-white">///</span>' + items + '<span class="text-white">///</span>';
    }

    // Projects
    const projects = document.getElementById('projects-grid');
    if (projects && data.projects) {
        const featured = data.projects.filter(p => p.featured);
        projects.innerHTML = (featured.length ? featured : data.projects).map((p, i) => `
        <article class="reveal tilt-card group bg-white border-4 border-black p-4 shadow-hard relative ${i % 2 ? 'mt-0 md:mt-20' : ''}">
            <span class="stamp -top-3 left-4 rotate-[-2deg]">WORK_0${i + 1}</span>
            <div class="bg-${neo(p.color)} border-2 border-black aspect-video relative overflow-hidden mb-6 flex items-center justify-center p-4 group-hover:bg-neo-black transition-colors duration-300">
                <div class="absolute inset-0 opacity-10" style="background-image: radial-gradient(#000 1.5px, transparent 1.5px); background-size: 14px 14px;"></div>
                <span class="font-mono text-black group-hover:text-${neo(p.color)} text-base font-black text-center uppercase tracking-tight border-2 border-black group-hover:border-${neo(p.color)} bg-white/60 group-hover:bg-transparent px-3 py-2 transition-colors duration-300 relative z-10">[ ${esc(p.tag)} ]</span>
            </div>
            <div class="flex justify-between items-start gap-4">
                <div>
                    <h3 class="text-4xl font-black uppercase mb-2 group-hover:text-neo-red transition-colors glitch-hover">${esc(p.title)}</h3>
                    <p class="font-mono text-sm mb-4">${esc(p.description)}</p>
                    <div class="flex gap-2 font-mono text-xs font-bold flex-wrap">
                        ${(p.tech || []).map(t => `<span class="bg-neo-black text-white px-2 py-1">${esc(t)}</span>`).join('')}
                    </div>
                </div>
                <a href="${esc(p.link || 'https://github.com/Pranav-error')}" target="_blank" rel="noopener" aria-label="Open ${esc(p.title)}"
                    class="shrink-0 w-12 h-12 border-2 border-black bg-neo-green flex items-center justify-center hover:bg-black hover:text-white transition-all cursor-hover shadow-hard-sm">
                    <i class="ri-arrow-right-up-line text-2xl"></i>
                </a>
            </div>
        </article>`).join('');
    }

    // All projects, filterable by category
    const allGrid = document.getElementById('all-projects-grid');
    const filters = document.getElementById('project-filters');
    if (allGrid && filters && data.projects) {
        const cats = [...new Set([...data.projects.filter(p => !p.featured), ...data.projects].map(p => p.category || 'OTHER'))];
        const chip = 'font-mono text-xs font-black uppercase px-3 py-2 border-2 border-black shadow-hard-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all cursor-hover';
        const card = (p, i) => `
            <a href="${esc(p.link || 'https://github.com/Pranav-error')}" target="_blank" rel="noopener"
                style="--i:${Math.min(i, 12)}" class="tilt-card group bg-white border-4 border-black p-5 shadow-hard hover:shadow-hard-xl transition-all relative flex flex-col cursor-hover">
                <div class="absolute top-0 left-0 w-full h-2 bg-${neo(p.color)}"></div>
                <div class="font-mono text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1 mb-2">${esc(p.category || 'OTHER')}</div>
                <h3 class="text-2xl font-black uppercase leading-tight mb-1 group-hover:text-neo-red transition-colors">${esc(p.title)}</h3>
                <div class="font-mono text-[10px] font-bold bg-black text-${neo(p.color)} inline-block self-start px-2 py-0.5 mb-3">${esc(p.tag)}</div>
                <p class="font-mono text-xs text-gray-700 leading-relaxed mb-4 flex-1">${esc(p.description)}</p>
                <div class="flex gap-1.5 flex-wrap font-mono text-[10px] font-bold">
                    ${(p.tech || []).map(t => `<span class="border-2 border-black px-1.5 py-0.5">${esc(t)}</span>`).join('')}
                </div>
            </a>`;
        const show = (cat) => {
            const list = cat === 'ALL' ? data.projects : data.projects.filter(p => (p.category || 'OTHER') === cat);
            allGrid.innerHTML = list.map(card).join('');
            document.getElementById('all-projects-count').textContent = `${list.length} PROJECTS`;
            filters.querySelectorAll('button').forEach(b => {
                const on = b.dataset.cat === cat;
                b.setAttribute('aria-pressed', on);
                b.classList.toggle('bg-neo-green', on); b.classList.toggle('text-black', on); b.classList.toggle('bg-white', !on);
            });
        };
        filters.innerHTML = ['ALL', ...cats].map(c => `<button type="button" data-cat="${esc(c)}" class="${chip}">${esc(c)}</button>`).join('');
        filters.onclick = (e) => { const b = e.target.closest('button'); if (b) show(b.dataset.cat); };
        show('ALL');
    }

    // Experience
    const exp = document.getElementById('experience-timeline');
    if (exp && data.experience) {
        exp.innerHTML = data.experience.map(x => `
        <div class="reveal relative pl-8 md:pl-16">
            <div class="absolute -left-[14px] top-2 w-6 h-6 bg-${neo(x.color)} border-4 border-black"></div>
            <div class="bg-white border-4 border-black p-6 shadow-hard hover:shadow-hard-xl transition-all">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center border-b-2 border-dashed border-gray-300 pb-4 mb-4 gap-2">
                    <h3 class="text-2xl md:text-3xl font-black uppercase">${esc(x.role)}</h3>
                    <span class="font-mono font-bold bg-neo-black text-white px-2 py-1 whitespace-nowrap">${esc(x.period)}</span>
                </div>
                <p class="font-mono text-xl mb-2 text-${neo(x.color)} font-bold">@ ${esc(x.company)}</p>
                <ul class="list-disc list-inside font-mono text-gray-700 space-y-1">
                    ${(x.points || []).map(pt => `<li>${esc(pt)}</li>`).join('')}
                </ul>
            </div>
        </div>`).join('');
    }

    // Achievements
    const ach = document.getElementById('achievements-grid');
    if (ach && data.achievements) {
        ach.innerHTML = data.achievements.map(a => `
        <div class="reveal tilt-card group bg-white border-4 border-black p-6 shadow-hard hover:shadow-hard-xl transition-all relative overflow-hidden">
            <div class="absolute top-0 left-0 w-full h-1 bg-${neo(a.color)}"></div>
            <div class="text-5xl mb-4">${a.emoji || '🏆'}</div>
            <div class="font-mono text-[10px] text-${neo(a.color)} font-bold uppercase tracking-widest mb-2 bg-black inline-block px-2 py-0.5">${esc(a.category)}</div>
            <h3 class="text-2xl font-black uppercase mb-3 leading-tight">${esc(a.title)}</h3>
            <p class="font-mono text-sm text-gray-600 leading-relaxed">${esc(a.description)}</p>
            <div class="mt-4 font-mono text-xs text-gray-400 border-t border-gray-200 pt-3">📅 ${esc(a.date)}</div>
        </div>`).join('');
    }

    // Hackathon wall
    const hack = document.getElementById('hackathons-grid');
    if (hack && data.hackathons) {
        const resultStyle = (r) => /WIN|1ST/.test(r) ? 'bg-neo-yellow' : /2ND|3RD|FINALIST|TOP|PLACE/.test(r) ? 'bg-neo-green' : 'bg-white';
        hack.innerHTML = data.hackathons.map((h, i) => `
        <div class="reveal tilt-card bg-white border-4 border-black p-5 shadow-hard relative ${i % 3 === 1 ? 'rotate-1' : i % 3 === 2 ? 'rotate-[-1deg]' : ''}">
            <div class="flex justify-between items-start mb-3">
                <span class="font-mono text-[10px] font-bold text-gray-400">#${String(i + 1).padStart(2, '0')} / ${esc(h.year)}</span>
                <span class="font-mono text-[10px] font-black px-2 py-0.5 border-2 border-black ${resultStyle(h.result)}">${esc(h.result)}</span>
            </div>
            <h3 class="text-xl font-black uppercase leading-tight mb-2">${esc(h.name)}</h3>
            <p class="font-mono text-xs text-gray-600 border-l-2 border-${neo(h.color)} pl-2">${esc(h.project)}</p>
        </div>`).join('');
    }

    // Freelance
    const fIntro = document.getElementById('freelance-intro');
    if (fIntro && data.freelance?.intro) fIntro.textContent = data.freelance.intro;
    const fProjects = document.getElementById('freelance-projects');
    if (fProjects && data.freelance?.projects) {
        fProjects.innerHTML = data.freelance.projects.map(f => `
        <div class="reveal bg-neo-black border-4 border-white/20 p-6 hover:border-neo-pink transition-colors shadow-[6px_6px_0_rgba(255,112,166,0.2)] relative">
            <div class="font-mono text-[10px] text-neo-pink uppercase tracking-widest mb-2">CLIENT: ${esc(f.client)}</div>
            <h3 class="text-3xl font-black uppercase mb-3 text-white">${esc(f.name)}</h3>
            <p class="font-mono text-sm text-gray-400 mb-4">${esc(f.description)}</p>
            <div class="flex gap-2 font-mono text-[10px] font-bold flex-wrap mb-5">
                ${(f.tech || []).map(t => `<span class="border border-neo-pink/50 text-neo-pink px-2 py-1">${esc(t)}</span>`).join('')}
            </div>
            <div class="flex gap-3 flex-wrap font-mono text-xs font-black uppercase">
                ${f.live ? `<a href="${esc(f.live)}" target="_blank" rel="noopener" class="bg-neo-green text-black border-2 border-black px-4 py-2 shadow-[3px_3px_0_#fff] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all cursor-hover"><i class="ri-global-line mr-1"></i>LIVE SITE</a>` : ''}
                ${f.playstore ? `<a href="${esc(f.playstore)}" target="_blank" rel="noopener" class="bg-neo-yellow text-black border-2 border-black px-4 py-2 shadow-[3px_3px_0_#fff] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all cursor-hover"><i class="ri-google-play-fill mr-1"></i>PLAY STORE</a>` : ''}
                ${f.link ? `<a href="${esc(f.link)}" target="_blank" rel="noopener" class="text-neo-pink border-2 border-neo-pink px-4 py-2 hover:bg-neo-pink hover:text-black transition-all cursor-hover"><i class="ri-code-s-slash-line mr-1"></i>CODE</a>` : ''}
            </div>
        </div>`).join('');
    }
    const reviews = document.getElementById('reviews-marquee');
    if (reviews && data.freelance?.reviews?.length) {
        const card = (r, i) => `
        <div class="flex-shrink-0 w-[340px] md:w-[450px] bg-neo-black border-4 border-white/10 p-8 hover:border-${neo(r.color)}/50 hover:-translate-y-2 transition-all duration-500 relative overflow-hidden text-left whitespace-normal">
            <div class="absolute top-0 left-0 w-full h-1 bg-${neo(r.color)}"></div>
            <div class="flex justify-between items-start mb-6">
                <div class="font-mono text-${neo(r.color)} text-xs font-bold tracking-widest uppercase">REPORT_00${i + 1}.log</div>
            </div>
            <div class="font-mono text-gray-400 text-[10px] mb-2 uppercase tracking-tight">FROM: ${esc(r.from)}</div>
            <p class="font-bold text-xl leading-snug mb-6 text-white/90">"${esc(r.text)}"</p>
            <div class="flex text-${neo(r.color)}/60 gap-1 text-lg">${'<i class="ri-star-fill"></i>'.repeat(5)}</div>
        </div>`;
        const set = data.freelance.reviews.map(card).join('');
        reviews.innerHTML = set + set; // duplicate for seamless loop
    }

    // Availability
    if (data.meta?.availability) {
        document.querySelectorAll('[data-availability]').forEach(el => el.textContent = data.meta.availability);
    }

    // Browser only: stagger and observe the freshly rendered reveal elements
    if (typeof revealObserver === 'undefined') return;
    document.querySelectorAll('#projects-grid, #achievements-grid, #hackathons-grid, #freelance-projects, #experience-timeline').forEach(grid => {
        [...grid.children].forEach((el, i) => { el.style.transitionDelay = (i % 4) * 90 + 'ms'; });
    });
    document.querySelectorAll('.reveal:not(.active)').forEach(el => revealObserver.observe(el));
}
