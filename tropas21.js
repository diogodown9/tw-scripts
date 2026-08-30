(async function () {
    const modalId = 'tw-master-suite';
    
    // Limpeza de instâncias anteriores
    if (document.getElementById(modalId)) document.getElementById(modalId).remove();
    if (document.getElementById(`${modalId}-backdrop`)) document.getElementById(`${modalId}-backdrop`).remove();
    if (document.getElementById(`${modalId}-style`)) document.getElementById(`${modalId}-style`).remove();
    if (document.getElementById(`${modalId}-tooltip`)) document.getElementById(`${modalId}-tooltip`).remove();
    if (document.getElementById(`${modalId}-toast`)) document.getElementById(`${modalId}-toast`).remove();
    if (document.getElementById('tw-map-iframe-modal')) document.getElementById('tw-map-iframe-modal').remove();

    const style = document.createElement('style');
    style.id = `${modalId}-style`;
    style.innerHTML = `
        /* THEME: OBSIDIAN MILITARY COMMAND CENTER */
        #${modalId}-backdrop { position: fixed; inset: 0; background: rgba(2, 6, 23, 0.88); z-index: 99998; backdrop-filter: blur(8px); }
        #${modalId} {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 96vw; max-width: 1380px; height: 94vh; max-height: 940px;
            background: linear-gradient(180deg, #0b1120 0%, #030712 100%);
            color: #f8fafc; border: 1px solid #1e293b; border-radius: 14px;
            z-index: 99999; padding: 16px 20px;
            box-shadow: 0 25px 70px -10px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(56, 189, 248, 0.15);
            display: flex; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            box-sizing: border-box;
        }
        
        .tw-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 10px; margin-bottom: 10px; }
        .tw-title { font-size: 15px; font-weight: 800; color: #38bdf8; display: flex; align-items: center; gap: 8px; letter-spacing: -0.01em; }
        .tw-close { cursor: pointer; color: #64748b; font-size: 24px; line-height: 1; border-radius: 6px; padding: 2px 8px; transition: 0.15s; }
        .tw-close:hover { color: #f43f5e; background: rgba(244, 63, 94, 0.15); }

        .tw-tabs { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 8px; margin-bottom: 10px; }
        .tw-tab-group { display: flex; gap: 6px; background: #020617; padding: 4px; border-radius: 8px; border: 1px solid #1e293b; }
        .tw-tab { background: transparent; border: none; color: #94a3b8; padding: 6px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px; transition: 0.15s; }
        .tw-tab.active { background: #1e293b; color: #38bdf8; box-shadow: 0 2px 4px rgba(0,0,0,0.5); }
        .tw-tab-special.active { background: #451a03; color: #fbbf24; border: 1px solid #d97706; }
        .tw-tab:hover:not(.active) { color: #f8fafc; background: rgba(255,255,255,0.04); }

        .tw-pane { display: none; flex-direction: column; flex-grow: 1; overflow: hidden; }
        .tw-pane.active { display: flex; }

        /* KPI HUD CARDS */
        .tw-kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 10px; }
        .tw-kpi-card { background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 8px 12px; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden; }
        .tw-kpi-card::after { content: ''; position: absolute; top: 0; left: 0; width: 3px; height: 100%; }
        .tw-kpi-blue::after { background: #38bdf8; }
        .tw-kpi-red::after { background: #f43f5e; }
        .tw-kpi-green::after { background: #10b981; }
        .tw-kpi-gold::after { background: #f59e0b; }
        .tw-kpi-purple::after { background: #a855f7; }
        .tw-kpi-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; display: flex; justify-content: space-between; }
        .tw-kpi-value { font-size: 18px; font-weight: 800; color: #f8fafc; margin-top: 2px; }
        .tw-kpi-sub { font-size: 11px; color: #64748b; margin-top: 2px; }

        /* PILLS & CONTROLS */
        .tw-pill-group { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
        .tw-pill { background: #0f172a; border: 1px solid #1e293b; color: #94a3b8; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; cursor: pointer; transition: 0.15s; }
        .tw-pill:hover { color: #f8fafc; border-color: #38bdf8; }
        .tw-pill.active { background: #0284c7; border-color: #38bdf8; color: #fff; box-shadow: 0 0 10px rgba(56, 189, 248, 0.3); }

        /* CARDS & INPUTS */
        .tw-card { background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; }
        .tw-card-title { font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; display: flex; justify-content: space-between; align-items: center; }
        
        .tw-input, .tw-select { background: #020617; border: 1px solid #334155; color: #f8fafc; padding: 6px 8px; border-radius: 5px; font-size: 12px; outline: none; transition: 0.15s; box-sizing: border-box; }
        .tw-input:focus, .tw-select:focus { border-color: #38bdf8; box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.15); }
        .tw-textarea { width: 100%; background: #020617; border: 1px solid #334155; color: #38bdf8; font-family: ui-monospace, monospace; font-size: 11px; padding: 8px; border-radius: 6px; box-sizing: border-box; resize: none; outline: none; }

        /* BUTTONS */
        .tw-btn { background: #1e293b; color: #f8fafc; border: 1px solid #334155; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; transition: 0.15s; display: inline-flex; align-items: center; gap: 6px; }
        .tw-btn:hover { background: #334155; border-color: #475569; }
        .tw-btn-blue { background: #0284c7; border-color: #0369a1; color: #fff; }
        .tw-btn-blue:hover { background: #0369a1; }
        .tw-btn-gold { background: #b45309; border-color: #d97706; color: #fff; font-weight: bold; }
        .tw-btn-gold:hover { background: #d97706; }
        .tw-btn-green { background: #059669; border-color: #10b981; color: #fff; }
        .tw-btn-green:hover { background: #10b981; }

        /* TABLE & PANEL */
        .tw-panel { overflow-y: auto; flex-grow: 1; border: 1px solid #1e293b; border-radius: 8px; background: #020617; }
        .tw-panel::-webkit-scrollbar { width: 6px; height: 6px; }
        .tw-panel::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }

        .tw-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .tw-table th, .tw-table td { padding: 6px 8px; border-bottom: 1px solid #1e293b; text-align: center; white-space: nowrap; }
        .tw-table th { background: #0f172a !important; position: sticky; top: 0; color: #94a3b8 !important; font-size: 11px; text-transform: uppercase; font-weight: 700; cursor: pointer; user-select: none; }
        .tw-table th:hover { color: #38bdf8 !important; background: #1e293b !important; }
        .tw-table tbody tr:hover { background: rgba(56, 189, 248, 0.04); }
        .tw-row-off { background: rgba(244, 63, 94, 0.06) !important; }
        .tw-row-def { background: rgba(56, 189, 248, 0.06) !important; }

        /* PROGRESS BAR IN TABLE */
        .tw-farm-bar-bg { width: 100%; height: 5px; background: #1e293b; border-radius: 3px; overflow: hidden; margin-top: 3px; }
        .tw-farm-bar-fill { height: 100%; border-radius: 3px; }

        /* BADGES */
        .tw-tag-train4 { background: #78350f; color: #fde68a; border: 1px solid #f59e0b; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; box-shadow: 0 0 6px rgba(245, 158, 11, 0.4); }
        .tw-tag-train4-rec { background: #451a03; color: #fed7aa; border: 1px dashed #f59e0b; padding: 2px 6px; border-radius: 4px; font-size: 10px; }
        .tw-tag-train2 { background: #451a03; color: #fed7aa; border: 1px solid #d97706; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
        .tw-tag-snob1 { background: #292524; color: #fef08a; border: 1px solid #a8a29e; padding: 2px 6px; border-radius: 4px; font-size: 10px; }
        .tw-tag-nuke-full { background: #7f1d1d; color: #fca5a5; border: 1px solid #ef4444; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; box-shadow: 0 0 6px rgba(239, 68, 68, 0.4); }
        .tw-tag-nuke-semi { background: #431407; color: #fdba74; border: 1px solid #f97316; padding: 2px 6px; border-radius: 4px; font-size: 10px; }
        .tw-tag-bunk-full { background: #064e3b; color: #a7f3d0; border: 1px solid #10b981; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; box-shadow: 0 0 6px rgba(16, 185, 129, 0.4); }
        .tw-tag-bunk-semi { background: #082f49; color: #bae6fd; border: 1px solid #0ea5e9; padding: 2px 6px; border-radius: 4px; font-size: 10px; }
        .tw-tag-growth { background: #1e293b; color: #94a3b8; border: 1px solid #334155; padding: 2px 6px; border-radius: 4px; font-size: 10px; }

        .tw-badge-muralha { background: #831843; color: #fbcfe8; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; border: 1px solid #db2777; }
        .tw-badge-praca { background: #581c87; color: #e9d5ff; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; border: 1px solid #a855f7; }
        .tw-badge-nuke { background: #7f1d1d; color: #fca5a5; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; border: 1px solid #ef4444; }
        .tw-badge-snob { background: #78350f; color: #fde68a; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; border: 1px solid #f59e0b; }
        .tw-badge-anti { background: #1e3a8a; color: #93c5fd; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; border: 1px solid #3b82f6; }
        .tw-badge-bunker { background: #065f46; color: #a7f3d0; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; border: 1px solid #10b981; }
        .tw-badge-paladino { background: #134e4a; color: #5eead4; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; border: 1px solid #14b8a6; box-shadow: 0 0 6px rgba(20, 184, 166, 0.4); }

        #${modalId}-tooltip {
            position: fixed; z-index: 10000000; background: #020617; border: 1px solid #38bdf8;
            border-radius: 8px; padding: 10px 14px; pointer-events: none; opacity: 0;
            box-shadow: 0 12px 35px rgba(0,0,0,0.9); transition: opacity 0.12s ease; font-size: 12px; min-width: 220px;
            color: #f8fafc; display: none;
        }
        #${modalId}-tooltip.show { opacity: 1; display: block; }
        
        #${modalId}-toast {
            position: fixed; bottom: 24px; right: 24px; z-index: 100000000;
            background: #0f172a; border: 1px solid #34d399; color: #34d399;
            padding: 8px 14px; border-radius: 6px; font-size: 12px; font-weight: bold;
            box-shadow: 0 10px 30px rgba(0,0,0,0.8); display: none; opacity: 0; transition: opacity 0.2s ease;
        }
        #${modalId}-toast.show { display: block; opacity: 1; }

        .tw-spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.2); border-radius: 50%; border-top-color: #38bdf8; animation: twSpin 0.7s linear infinite; }
        @keyframes twSpin { to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);

    const backdrop = document.createElement('div');
    backdrop.id = `${modalId}-backdrop`;
    document.body.appendChild(backdrop);

    const ui = document.createElement('div');
    ui.id = modalId;
    ui.innerHTML = `
        <div class="tw-header">
            <div class="tw-title" id="tw-title-text"><div class="tw-spinner"></div> A calibrar dados táticos do império...</div>
            <span class="tw-close" id="tw-btn-close">&times;</span>
        </div>
        <div class="tw-tabs" id="tw-tabs-container" style="display:none;">
            <div class="tw-tab-group">
                <button class="tw-tab active" id="tab-btn-overview">📊 Visão Geral</button>
                <button class="tw-tab" id="tab-btn-counter">⚔️ Contador Tático</button>
                <button class="tw-tab" id="tab-btn-fakes">🤖 Fakes & Mascaramento</button>
                <button class="tw-tab tw-tab-special" id="tab-btn-nt">👑 Planeador NT, Anti-Snipe & Bunker</button>
            </div>
        </div>
        <div id="tw-main-body" style="flex-grow:1; display:flex; flex-direction:column; overflow:hidden;"></div>
    `;
    document.body.appendChild(ui);

    const tooltip = document.createElement('div');
    tooltip.id = `${modalId}-tooltip`;
    document.body.appendChild(tooltip);

    const toast = document.createElement('div');
    toast.id = `${modalId}-toast`;
    document.body.appendChild(toast);

    function showToast(msg) {
        toast.innerText = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
    }

    let allVillages = [], villagesById = {}, unitConfigs = [];
    let currentPage = 1, totalPages = 1, itemsPerPage = 15;
    let activeTab = 'overview';
    let counterSummaryData = null;
    let overviewSearch = '';
    let overviewFilter = 'all';
    let sortColumn = null, sortAsc = false;
    let grabbedTargets = new Set();
    let mapInterval = null;

    const PT114_TIME_MODIFIER = 58.8227 / 60;
    const unitSpeedMinutes = { 
        spy: 9 * PT114_TIME_MODIFIER, 
        light: 10 * PT114_TIME_MODIFIER, 
        heavy: 11 * PT114_TIME_MODIFIER, 
        axe: 18 * PT114_TIME_MODIFIER, 
        sword: 22 * PT114_TIME_MODIFIER, 
        spear: 18 * PT114_TIME_MODIFIER, 
        archer: 18 * PT114_TIME_MODIFIER, 
        marcher: 10 * PT114_TIME_MODIFIER, 
        ram: 30 * PT114_TIME_MODIFIER, 
        catapult: 30 * PT114_TIME_MODIFIER, 
        knight: 10 * PT114_TIME_MODIFIER, 
        snob: 35 * PT114_TIME_MODIFIER 
    };
    const defaultUnitPop = { spear: 1, sword: 1, axe: 1, archer: 1, spy: 2, light: 4, marcher: 5, heavy: 6, ram: 5, catapult: 8, knight: 10, snob: 100, militia: 0 };

    const outputCategories = {
        'Full Train (4N ≥22k)': { group: 'Nobres', desc: '👑 Full Train (4N + Faz. ≥22k)', test: (v) => v.snobsAvailable >= 4 && v.farm.used >= 22000 },
        'Train 4N (Recrut. <22k)': { group: 'Nobres', desc: '👑 Train 4N (Faz. <22k)', test: (v) => v.snobsAvailable >= 4 && v.farm.used < 22000 },
        'Split Train (2-3 Nobres)': { group: 'Nobres', desc: '👑 Split Train (2-3 Nobres)', test: (v) => v.snobsAvailable >= 2 && v.snobsAvailable < 4 },
        'Nobre Solitário': { group: 'Nobres', desc: '👑 1 Nobre Solitário', test: (v) => v.snobsAvailable === 1 },
        'Full Nuke (OFF ≥22k)': { group: 'Ataque', desc: '⚔️ Full Nukes (Faz. ≥22k)', test: (v) => v.rowClass === 'tw-row-off' && v.farm.used >= 22000 },
        'Semi Nuke (OFF <22k)': { group: 'Ataque', desc: '⚔️ Semi Nukes (Faz. <22k)', test: (v) => v.rowClass === 'tw-row-off' && v.farm.used < 22000 },
        'Full Bunker (DEF ≥22k)': { group: 'Defesa', desc: '🛡️ Full Bunkers (Faz. ≥22k)', test: (v) => v.rowClass === 'tw-row-def' && v.farm.used >= 22000 },
        'Semi Bunker (DEF <22k)': { group: 'Defesa', desc: '🛡️ Semi Bunkers (Faz. <22k)', test: (v) => v.rowClass === 'tw-row-def' && v.farm.used < 22000 }
    };

    function calcDistance(coordA, coordB) {
        const [x1, y1] = coordA.split('|').map(Number);
        const [x2, y2] = coordB.split('|').map(Number);
        return Math.hypot(x2 - x1, y2 - y1);
    }
    function formatDuration(sec) {
        return `${String(Math.floor(sec/3600)).padStart(2,'0')}:${String(Math.floor((sec%3600)/60)).padStart(2,'0')}:${String(Math.floor(sec%60)).padStart(2,'0')}`;
    }
    function formatRussianDateTime(d) {
        const ms = String(d.getMilliseconds()).padStart(3, '0');
        return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}:${ms} ${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
    }

    async function loadData() {
        try {
            const baseUrl = (typeof game_data !== 'undefined' && game_data.link_base_pure) ? game_data.link_base_pure : '/game.php?';
            const [rU, rP] = await Promise.all([
                fetch(baseUrl + 'overview_villages&mode=units&type=complete&group=0&page=-1').then(r => r.text()),
                fetch(baseUrl + 'overview_villages&mode=prod&group=0&page=-1').then(r => r.text())
            ]);

            const parser = new DOMParser();
            const dU = parser.parseFromString(rU, 'text/html');
            const dP = parser.parseFromString(rP, 'text/html');

            const farmMap = {};
            dP.querySelectorAll('#production_table tbody tr').forEach(tr => {
                const a = tr.querySelector('a[href*="village="]');
                if (!a) return;
                const vId = (a.href.match(/village=(\d+)/) || [])[1];
                if (!vId) return;
                tr.querySelectorAll('td').forEach(td => {
                    const txt = td.textContent.trim();
                    if (/^\d+\/\d+$/.test(txt) && !td.querySelector('a')) {
                        const [p, m] = txt.split('/').map(Number);
                        const perc = parseFloat(((p / m) * 100).toFixed(1));
                        farmMap[vId] = { txt, used: p, max: m, perc, lvl: Math.ceil(m/800), color: p >= 22000 ? '#f43f5e' : p >= 18000 ? '#f59e0b' : '#10b981' };
                    }
                });
            });

            const uTable = dU.querySelector('#units_table');
            if (!uTable) throw new Error("Tabela de tropas não encontrada (requer Conta Premium).");

            const headers = Array.from(uTable.querySelectorAll('thead th')).filter(th => th.querySelector('img[src*="unit_"]'));
            unitConfigs = headers.map(th => {
                const img = th.querySelector('img');
                return { name: (img.src.match(/unit_([a-z0-9_]+)/i)||[])[1]||'', src: img.src, isHidden: th.classList.contains('hidden') || img.src.includes('militia') };
            });

            const summary = { totalPop: 0, units: {}, categories: {}, offCount: 0, defCount: 0, snobCount: 0, fullTrain22kCount: 0, semiTrainCount: 0, fullNuke22kCount: 0, fullBunk22kCount: 0 };
            unitConfigs.forEach(u => { if(u.name) summary.units[u.name] = { count: 0, pop: 0, src: u.src }; });
            Object.keys(outputCategories).forEach(cat => summary.categories[cat] = { count: 0, coords: [], villageIds: [] });

            Array.from(uTable.querySelectorAll('tbody')).forEach(tb => {
                const a = tb.querySelector('a[href*="village="]');
                if (!a) return;
                const vId = (a.href.match(/village=(\d+)/)||[])[1];
                if (!vId) return;
                const vName = (tb.querySelector('.quickedit-label') || a).textContent.trim();
                const coords = (vName.match(/(\d{3}\|\d{3})/)||[])[1]||'';

                const rows = Array.from(tb.querySelectorAll('tr'));
                let tRow = rows.find(tr => tr.querySelector('td') && tr.querySelector('td').textContent.trim().toLowerCase() === 'total') || rows[rows.length-1];
                const cells = Array.from(tRow.querySelectorAll('td.unit-item'));
                if (cells.length === 0) return;

                const vTroops = [], dict = {}, vTot = { defense: 0, offense: 0, spy: 0, snob: 0, catapult: 0, ram: 0, knight: 0 };
                headers.forEach((th, i) => {
                    const u = unitConfigs[i], cell = cells[i];
                    const c = (cell && !cell.classList.contains('hidden')) ? parseInt(cell.textContent.replace(/\./g,''),10)||0 : 0;
                    if (!u.isHidden) vTroops.push(c);
                    dict[u.name] = c;

                    if (u.name && summary.units[u.name]) {
                        const pop = c * (defaultUnitPop[u.name] || 1);
                        summary.units[u.name].count += c; summary.units[u.name].pop += pop; summary.totalPop += pop;
                        if (['spear','sword','heavy','catapult','archer','militia','knight'].includes(u.name)) vTot.defense += pop;
                        if (['axe','light','ram','catapult','marcher'].includes(u.name)) vTot.offense += pop;
                        if (u.name === 'spy') vTot.spy += pop;
                        if (u.name === 'snob') { vTot.snob += c; summary.snobCount += c; }
                        if (u.name === 'catapult') vTot.catapult += c;
                        if (u.name === 'ram') vTot.ram += c;
                        if (u.name === 'knight') vTot.knight += c;
                    }
                });

                let rowClass = '';
                if (vTot.offense > vTot.defense && vTot.offense >= 4000) {
                    rowClass = 'tw-row-off';
                    summary.offCount++;
                } else if (vTot.defense > vTot.offense && vTot.defense >= 4000) {
                    rowClass = 'tw-row-def';
                    summary.defCount++;
                }

                const farmInfo = farmMap[vId] || { txt:'N/A', used: 0, max: 24000, perc: 0, color:'#8b949e', lvl:'?' };
                const is22kFull = farmInfo.used >= 22000;
                const snobCount = dict.snob || 0;

                let roleTag = { label: 'Em Recrutamento', css: 'tw-tag-growth' };
                if (snobCount >= 4) {
                    if (is22kFull) {
                        roleTag = { label: `👑 Full Train (${snobCount}N)`, css: 'tw-tag-train4' };
                        summary.fullTrain22kCount++;
                    } else {
                        roleTag = { label: `👑 Train (${snobCount}N) <22k`, css: 'tw-tag-train4-rec' };
                    }
                } else if (snobCount >= 2) {
                    roleTag = { label: `👑 Train (${snobCount}N)`, css: 'tw-tag-train2' };
                    summary.semiTrainCount++;
                } else if (snobCount === 1) {
                    roleTag = { label: `👑 Nobre (1N)`, css: 'tw-tag-snob1' };
                } else if (rowClass === 'tw-row-off') {
                    if (is22kFull) {
                        roleTag = { label: '⚔️ Full Nuke', css: 'tw-tag-nuke-full' };
                        summary.fullNuke22kCount++;
                    } else {
                        roleTag = { label: '⚔️ Semi Nuke', css: 'tw-tag-nuke-semi' };
                    }
                } else if (rowClass === 'tw-row-def') {
                    if (is22kFull) {
                        roleTag = { label: '🛡️ Full Bunker', css: 'tw-tag-bunk-full' };
                        summary.fullBunk22kCount++;
                    } else {
                        roleTag = { label: '🛡️ Semi Bunker', css: 'tw-tag-bunk-semi' };
                    }
                }

                const vObj = {
                    id: vId, name: vName, coords, troops: vTroops, troopsDict: dict, rowClass, roleTag,
                    farm: farmInfo,
                    snobsAvailable: snobCount,
                    totalOffPop: vTot.offense,
                    totalDefPop: vTot.defense
                };

                for (const [catName, catData] of Object.entries(outputCategories)) {
                    if (catData.test(vObj)) {
                        summary.categories[catName].count++;
                        summary.categories[catName].villageIds.push(vId);
                        if (coords) summary.categories[catName].coords.push(coords);
                    }
                }

                allVillages.push(vObj);
                villagesById[vId] = vObj;
            });

            counterSummaryData = summary;
            document.getElementById('tw-tabs-container').style.display = 'flex';
            document.getElementById('tw-title-text').innerHTML = `⚡ TW Tactical Command Suite (${allVillages.length} Aldeias Conectadas)`;
            
            document.getElementById('tab-btn-overview').onclick = () => switchTab('overview');
            document.getElementById('tab-btn-counter').onclick = () => switchTab('counter');
            document.getElementById('tab-btn-fakes').onclick = () => switchTab('fakes');
            document.getElementById('tab-btn-nt').onclick = () => switchTab('nt');
            
            switchTab('overview');
        } catch (e) {
            document.getElementById('tw-main-body').innerHTML = `<div style="padding:40px; color:#f85149; text-align:center;">Erro: ${e.message}</div>`;
        }
    }

    function switchTab(tab) {
        activeTab = tab;
        document.getElementById('tab-btn-overview').classList.toggle('active', tab === 'overview');
        document.getElementById('tab-btn-counter').classList.toggle('active', tab === 'counter');
        document.getElementById('tab-btn-fakes').classList.toggle('active', tab === 'fakes');
        document.getElementById('tab-btn-nt').classList.toggle('active', tab === 'nt');
        
        if (tab === 'overview') renderOverview();
        else if (tab === 'counter') renderCounter();
        else if (tab === 'fakes') renderFakes();
        else if (tab === 'nt') renderAntiBotNT();
    }

    function renderOverview() {
        const s = counterSummaryData;
        
        let filtered = [...allVillages];
        if (overviewSearch) {
            filtered = filtered.filter(v => v.name.toLowerCase().includes(overviewSearch) || v.coords.includes(overviewSearch));
        }
        if (overviewFilter === 'off22k') filtered = filtered.filter(v => v.rowClass === 'tw-row-off' && v.farm.used >= 22000);
        else if (overviewFilter === 'def22k') filtered = filtered.filter(v => v.rowClass === 'tw-row-def' && v.farm.used >= 22000);
        else if (overviewFilter === 'snob') filtered = filtered.filter(v => v.snobsAvailable > 0);
        else if (overviewFilter === 'farm22k') filtered = filtered.filter(v => v.farm.used >= 22000);

        if (sortColumn) {
            filtered.sort((a, b) => {
                let valA, valB;
                if (sortColumn === 'name') { valA = a.name; valB = b.name; }
                else if (sortColumn === 'farm') { valA = a.farm.used; valB = b.farm.used; }
                else if (sortColumn === 'role') { valA = a.roleTag.label; valB = b.roleTag.label; }
                else if (sortColumn === 'snob') { valA = a.snobsAvailable; valB = b.snobsAvailable; }
                else { valA = a.troopsDict[sortColumn] || 0; valB = b.troopsDict[sortColumn] || 0; }
                
                if (typeof valA === 'string') return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
                return sortAsc ? valA - valB : valB - valA;
            });
        }

        totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
        if (currentPage > totalPages) currentPage = totalPages;
        const start = (currentPage - 1) * itemsPerPage;
        const list = itemsPerPage === 9999 ? filtered : filtered.slice(start, start + itemsPerPage);

        let ths = '';
        unitConfigs.forEach(u => {
            if (!u.isHidden && u.name) {
                const isCurrentSort = sortColumn === u.name;
                const arrow = isCurrentSort ? (sortAsc ? ' ▲' : ' ▼') : '';
                ths += `<th data-sort="${u.name}" style="width:45px;" title="Ordenar por ${u.name}"><img src="${u.src}">${arrow}</th>`;
            }
        });

        let rows = '';
        list.forEach(v => {
            let tds = '';
            unitConfigs.forEach(u => {
                if (!u.isHidden && u.name) {
                    const q = v.troopsDict[u.name] || 0;
                    const isNoble = u.name === 'snob';
                    const isPaladin = u.name === 'knight';
                    let col = q > 0 ? '#f8fafc' : '#334155';
                    let bgBadge = '';
                    if (isNoble && q > 0) { col = '#fbbf24'; bgBadge = 'background:rgba(245, 158, 11, 0.2); border-radius:4px; padding:1px 4px; font-weight:bold;'; }
                    if (isPaladin && q > 0) { col = '#34d399'; bgBadge = 'background:rgba(16, 185, 129, 0.2); border-radius:4px; padding:1px 4px; font-weight:bold;'; }
                    tds += `<td><span style="${bgBadge} color:${col}; font-weight:${q>0?'600':'normal'};">${q.toLocaleString('pt-PT')}</span></td>`;
                }
            });

            rows += `
                <tr class="${v.rowClass}" data-vid="${v.id}">
                    <td style="text-align:left; padding-left:10px; font-weight:bold;">
                        <a href="javascript:void(0);" class="tw-v-coord" data-coord="${v.coords}" style="color:#38bdf8; text-decoration:none;" title="Clica para copiar as coordenadas">${v.name}</a>
                    </td>
                    <td><span class="${v.roleTag.css}">${v.roleTag.label}</span></td>
                    <td style="width:130px; text-align:left; padding-right:10px;">
                        <div style="display:flex; justify-content:space-between; font-size:11px;">
                            <span style="color:#94a3b8;">${v.farm.used.toLocaleString('pt-PT')} / ${v.farm.max.toLocaleString('pt-PT')}</span>
                            <b style="color:${v.farm.color};">${v.farm.perc}%</b>
                        </div>
                        <div class="tw-farm-bar-bg">
                            <div class="tw-farm-bar-fill" style="width:${Math.min(v.farm.perc, 100)}%; background:${v.farm.color};"></div>
                        </div>
                    </td>
                    ${tds}
                </tr>
            `;
        });

        const axeCount = s.units.axe ? s.units.axe.count : 0;
        const lightCount = s.units.light ? s.units.light.count : 0;
        const spearCount = s.units.spear ? s.units.spear.count : 0;
        const swordCount = s.units.sword ? s.units.sword.count : 0;

        document.getElementById('tw-main-body').innerHTML = `
            <div class="tw-pane active" style="padding: 4px; gap:8px;">
                <div class="tw-kpi-grid">
                    <div class="tw-kpi-card tw-kpi-blue">
                        <div class="tw-kpi-label"><span>🏰 Império</span><span>TOTAL</span></div>
                        <div class="tw-kpi-value">${allVillages.length} <span style="font-size:12px; color:#94a3b8; font-weight:normal;">Aldeias</span></div>
                        <div class="tw-kpi-sub">População Total: <b style="color:#38bdf8;">${s.totalPop.toLocaleString('pt-PT')}</b></div>
                    </div>
                    <div class="tw-kpi-card tw-kpi-red">
                        <div class="tw-kpi-label"><span>⚔️ Poder de Fogo (OFF)</span><span>FAZ. ≥22k</span></div>
                        <div class="tw-kpi-value" style="color:#f87171;">${s.fullNuke22kCount} <span style="font-size:12px; color:#94a3b8; font-weight:normal;">Full Nukes (≥22k)</span></div>
                        <div class="tw-kpi-sub">🪓 ${axeCount.toLocaleString('pt-PT')} • 🐴 ${lightCount.toLocaleString('pt-PT')}</div>
                    </div>
                    <div class="tw-kpi-card tw-kpi-green">
                        <div class="tw-kpi-label"><span>🛡️ Capacidade Defesa</span><span>FAZ. ≥22k</span></div>
                        <div class="tw-kpi-value" style="color:#34d399;">${s.fullBunk22kCount} <span style="font-size:12px; color:#94a3b8; font-weight:normal;">Full Bunkers (≥22k)</span></div>
                        <div class="tw-kpi-sub">🗡️ ${spearCount.toLocaleString('pt-PT')} • 🛡️ ${swordCount.toLocaleString('pt-PT')}</div>
                    </div>
                    <div class="tw-kpi-card tw-kpi-gold">
                        <div class="tw-kpi-label"><span>👑 Academia & Conquista</span><span>NOBRES</span></div>
                        <div class="tw-kpi-value" style="color:#fbbf24;">${s.snobCount} <span style="font-size:12px; color:#94a3b8; font-weight:normal;">Nobres</span></div>
                        <div class="tw-kpi-sub"><b style="color:#f59e0b;">${s.fullTrain22kCount}</b> Full Trains (4N ≥22k) • ${s.semiTrainCount} Split Trains (2-3N)</div>
                    </div>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; background:#0f172a; border:1px solid #1e293b; border-radius:8px; padding:6px 10px;">
                    <div class="tw-pill-group">
                        <span style="font-size:11px; font-weight:bold; color:#64748b; margin-right:4px;">FILTRO:</span>
                        <div class="tw-pill ${overviewFilter==='all'?'active':''}" data-f="all">🌍 Todas (${allVillages.length})</div>
                        <div class="tw-pill ${overviewFilter==='off22k'?'active':''}" data-f="off22k">⚔️ Full Nukes ≥22k (${s.fullNuke22kCount})</div>
                        <div class="tw-pill ${overviewFilter==='def22k'?'active':''}" data-f="def22k">🛡️ Full Bunkers ≥22k (${s.fullBunk22kCount})</div>
                        <div class="tw-pill ${overviewFilter==='snob'?'active':''}" data-f="snob">👑 Com Nobres (${allVillages.filter(v=>v.snobsAvailable>0).length})</div>
                        <div class="tw-pill ${overviewFilter==='farm22k'?'active':''}" data-f="farm22k">🌾 Fazenda ≥22.000</div>
                    </div>

                    <div style="display:flex; gap:8px; align-items:center;">
                        <input type="text" id="tw-ov-search" class="tw-input" style="width:220px;" placeholder="🔍 Filtrar aldeia ou coord..." value="${overviewSearch}">
                        <select id="tw-ov-pp" class="tw-select">
                            <option value="12" ${itemsPerPage === 12 ? 'selected' : ''}>12 por pág</option>
                            <option value="15" ${itemsPerPage === 15 ? 'selected' : ''}>15 por pág</option>
                            <option value="25" ${itemsPerPage === 25 ? 'selected' : ''}>25 por pág</option>
                            <option value="50" ${itemsPerPage === 50 ? 'selected' : ''}>50 por pág</option>
                            <option value="9999" ${itemsPerPage === 9999 ? 'selected' : ''}>Todas</option>
                        </select>
                    </div>
                </div>

                <div class="tw-panel">
                    <table class="tw-table">
                        <thead>
                            <tr>
                                <th data-sort="name" style="text-align:left; width:200px; padding-left:10px;">Aldeia ${sortColumn==='name'?(sortAsc?'▲':'▼'):''}</th>
                                <th data-sort="role" style="width:130px;">Função Tática ${sortColumn==='role'?(sortAsc?'▲':'▼'):''}</th>
                                <th data-sort="farm" style="width:130px; text-align:left;">Fazenda (Pop) ${sortColumn==='farm'?(sortAsc?'▲':'▼'):''}</th>
                                ${ths}
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; padding:2px 4px;">
                    <button class="tw-btn" id="tw-ov-prev" ${currentPage===1?'disabled':''}>&#8592; Anterior</button>
                    <span style="font-size:12px; color:#94a3b8; font-weight:600;">Página <b style="color:#38bdf8;">${currentPage}</b> de <b>${totalPages}</b> (${filtered.length} aldeias filtradas)</span>
                    <button class="tw-btn" id="tw-ov-next" ${currentPage===totalPages?'disabled':''}>Próxima &#8594;</button>
                </div>
            </div>
        `;

        document.getElementById('tw-ov-search').oninput = (e) => { overviewSearch = e.target.value.toLowerCase(); currentPage = 1; renderOverview(); };
        document.getElementById('tw-ov-pp').onchange = (e) => { itemsPerPage = parseInt(e.target.value, 10); currentPage = 1; renderOverview(); };
        document.getElementById('tw-ov-prev').onclick = () => { if (currentPage > 1) { currentPage--; renderOverview(); } };
        document.getElementById('tw-ov-next').onclick = () => { if (currentPage < totalPages) { currentPage++; renderOverview(); } };

        document.querySelectorAll('.tw-pill').forEach(pill => pill.onclick = function() {
            overviewFilter = this.getAttribute('data-f');
            currentPage = 1;
            renderOverview();
        });

        document.querySelectorAll('.tw-table th[data-sort]').forEach(th => th.onclick = function() {
            const col = this.getAttribute('data-sort');
            if (sortColumn === col) sortAsc = !sortAsc;
            else { sortColumn = col; sortAsc = false; }
            renderOverview();
        });

        document.querySelectorAll('.tw-v-coord').forEach(el => el.onclick = function() {
            const c = this.getAttribute('data-coord');
            navigator.clipboard.writeText(c);
            showToast(`📋 Coordenadas ${c} copiadas!`);
        });
    }

    function renderCounter() {
        const s = counterSummaryData;
        let catHtml = '';
        for (const [catName, catData] of Object.entries(outputCategories)) {
            const count = s.categories[catName].count;
            catHtml += `<tr>
                <td style="padding:5px 0; text-align:left;"><a href="javascript:void(0);" class="tw-cat-link" data-cat="${catName}" style="color:#38bdf8; text-decoration:none; font-weight:600;">» ${catData.desc}</a></td>
                <td style="text-align:right; font-weight:bold; color:${count > 0 ? '#34d399' : '#475569'};">${count}</td>
            </tr>`;
        }

        document.getElementById('tw-main-body').innerHTML = `
            <div class="tw-pane active" style="padding: 6px;">
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; height:100%;">
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <div class="tw-card">
                            <div class="tw-card-title" style="color:#38bdf8;">👤 ${game_data.player.name}</div>
                            <div style="font-size:12px; color:#94a3b8; margin-top:3px;">População Total do Império: <b style="color:#34d399; font-size:14px;">${s.totalPop.toLocaleString('pt-PT')}</b></div>
                        </div>
                        <div class="tw-panel" style="padding:10px;"><table style="width:100%; font-size:12px;">${catHtml}</table></div>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <div class="tw-card" style="display:flex; flex-direction:row; gap:8px; align-items:center;">
                            <span>🎯 Alvo:</span>
                            <input type="text" id="tw-c-target" class="tw-input" style="width:80px; text-align:center;" placeholder="xxx|yyy" maxlength="7">
                            <span>Unidade:</span>
                            <select id="tw-c-unit" class="tw-select">
                                <option value="ram">Aríete (30m)</option><option value="snob">Nobre (35m)</option><option value="axe">Viking (18m)</option><option value="spy">Batedor (9m)</option>
                            </select>
                        </div>
                        <textarea id="tw-c-output" class="tw-textarea" style="flex-grow:1;" readonly placeholder="Clica numa categoria à esquerda para listar as coordenadas prontas..."></textarea>
                    </div>
                </div>
            </div>
        `;

        document.querySelectorAll('.tw-cat-link').forEach(el => el.addEventListener('click', function() {
            const cat = this.getAttribute('data-cat');
            const target = document.getElementById('tw-c-target').value.trim();
            const unit = document.getElementById('tw-c-unit').value;
            const list = s.categories[cat].villageIds.map(vId => {
                const v = villagesById[vId];
                const dist = (v && /^\d{3}\|\d{3}$/.test(target)) ? calcDistance(v.coords, target) : null;
                const time = dist ? formatDuration(dist * (unitSpeedMinutes[unit] || (30 * PT114_TIME_MODIFIER)) * 60) : '';
                return dist !== null ? `${v.coords} - ${dist.toFixed(1)}c (${time})` : (v ? v.coords : '');
            });
            document.getElementById('tw-c-output').value = list.join('\n');
            showToast(`📋 ${list.length} coordenadas listadas!`);
        }));
    }

    // --- ABA 3: FAKES & MASCARAMENTO TÁTICO AVANÇADO ---
    function renderFakes() {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 14 * 3600 * 1000);
        const tomorrowEnd = new Date(now.getTime() + 26 * 3600 * 1000);
        const exactDefaultStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}T20:00:00`;
        const dStart = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}T10:00`;
        const dEnd = `${tomorrowEnd.getFullYear()}-${String(tomorrowEnd.getMonth()+1).padStart(2,'0')}-${String(tomorrowEnd.getDate()).padStart(2,'0')}T22:00`;

        const targetCount = grabbedTargets.size || (document.getElementById('tw-f-targets') ? (document.getElementById('tw-f-targets').value.match(/\d{3}\|\d{3}/g)||[]).length : 0);

        document.getElementById('tw-main-body').innerHTML = `
            <div class="tw-pane active" style="padding: 4px; gap:8px;">
                <div class="tw-kpi-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom:4px;">
                    <div class="tw-kpi-card tw-kpi-purple">
                        <div class="tw-kpi-label"><span>🎯 ALVOS ATIVOS</span><span id="tw-f-hud-target-badge">LISTADOS</span></div>
                        <div class="tw-kpi-value" id="tw-f-hud-targets" style="color:#c084fc;">${targetCount} <span style="font-size:12px; color:#94a3b8; font-weight:normal;">Alvos</span></div>
                        <div class="tw-kpi-sub">Adiciona alvos via mapa ou texto</div>
                    </div>
                    <div class="tw-kpi-card tw-kpi-blue">
                        <div class="tw-kpi-label"><span>🏰 ORIGENS DISPONÍVEIS</span><span id="tw-f-hud-orig-badge">TOTAL</span></div>
                        <div class="tw-kpi-value" id="tw-f-hud-origins" style="color:#38bdf8;">${allVillages.length} <span style="font-size:12px; color:#94a3b8; font-weight:normal;">Aldeias</span></div>
                        <div class="tw-kpi-sub">Filtrado pelo grupo de origem</div>
                    </div>
                    <div class="tw-kpi-card tw-kpi-gold">
                        <div class="tw-kpi-label"><span>⏱️ VELOCIDADE BASE</span><span>PT114</span></div>
                        <div class="tw-kpi-value" id="tw-f-hud-speed" style="color:#fbbf24;">Aríete / Cata <span style="font-size:12px; color:#94a3b8; font-weight:normal;">(30m/c)</span></div>
                        <div class="tw-kpi-sub">Velocidade selecionada para a viagem</div>
                    </div>
                    <div class="tw-kpi-card tw-kpi-green">
                        <div class="tw-kpi-label"><span>🚀 CAPACIDADE ESTIMADA</span><span>TOTAL</span></div>
                        <div class="tw-kpi-value" id="tw-f-hud-capacity" style="color:#34d399;">${targetCount * 4} <span style="font-size:12px; color:#94a3b8; font-weight:normal;">Comandos</span></div>
                        <div class="tw-kpi-sub">Baseado em Fakes / Alvo</div>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns: 1.2fr 1.1fr 1.1fr; gap:8px;">
                    <div class="tw-card">
                        <div class="tw-card-title" style="color:#c084fc;">
                            <span>🎯 1. Alvos & Unidade Fake</span>
                            <button class="tw-btn tw-btn-blue" id="tw-btn-open-map-modal" style="font-size:10px; padding:2px 8px;">🗺️ Seleção no Mapa</button>
                        </div>
                        <textarea id="tw-f-targets" class="tw-textarea" style="height:48px;" placeholder="Clica no botão de seleção no mapa ou cola coordenadas (ex: 500|500 501|501)...">${Array.from(grabbedTargets).join(' ')}</textarea>
                        
                        <div style="display:grid; grid-template-columns: 1.1fr 1fr; gap:6px; margin-top:2px;">
                            <div style="display:flex; flex-direction:column; gap:2px;">
                                <span style="font-size:10px; color:#94a3b8;">Unidade do Fake:</span>
                                <select id="tw-f-unit" class="tw-select" style="font-weight:bold; color:#fbbf24;">
                                    <option value="ram" selected>🪵 Aríete / Catapulta (30m)</option>
                                    <option value="snob">👑 Nobre / NT Fake (35m)</option>
                                    <option value="sword">🛡️ Espada (22m)</option>
                                    <option value="axe">🪓 Machado / Lança (18m)</option>
                                    <option value="heavy">🐴 Cavalaria Pesada (11m)</option>
                                    <option value="light">🐎 Cavalaria Leve (10m)</option>
                                    <option value="spy">🔭 Batedor (9m)</option>
                                </select>
                            </div>
                            <div style="display:flex; flex-direction:column; gap:2px;">
                                <span style="font-size:10px; color:#94a3b8;">Grupo de Origem:</span>
                                <select id="tw-f-group" class="tw-select">
                                    <option value="def" selected>🛡️ Apenas Defesa</option>
                                    <option value="all">🌍 Todas as Aldeias</option>
                                    <option value="off">⚔️ Apenas Ataque</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="tw-card">
                        <div class="tw-card-title" style="color:#38bdf8;">⏰ 2. Estratégia & Hora de Impacto</div>
                        <div style="display:flex; flex-direction:column; gap:2px;">
                            <span style="font-size:10px; color:#94a3b8;">Estratégia de Dispersão:</span>
                            <select id="tw-f-ai" class="tw-select" style="font-weight:bold; color:#38bdf8;">
                                <option value="sync" selected>🎯 Sincronização em Bloco (Hora Exata)</option>
                                <option value="fake_train">👑 Simulação de NT Fake (Hora Exata + 200ms)</option>
                                <option value="spam">🚨 Dispersão Contínua (Janela de Tempo)</option>
                                <option value="chaos">🌪️ Rotação Caótica de Origens (Janela de Tempo)</option>
                            </select>
                        </div>
                        
                        <div id="tw-f-box-exact" style="display:flex; flex-direction:column; gap:2px; margin-top:2px;">
                            <span style="font-size:10px; color:#38bdf8; font-weight:bold;">🎯 Hora Exata de Chegada (Impacto):</span>
                            <input type="datetime-local" id="tw-f-exact-time" class="tw-input" step="1" value="${exactDefaultStr}" style="font-weight:bold; color:#38bdf8;">
                        </div>

                        <div id="tw-f-box-window" style="display:none; grid-template-columns: 1fr 1fr; gap:6px; margin-top:2px;">
                            <div style="display:flex; flex-direction:column; gap:2px;">
                                <span style="font-size:10px; color:#94a3b8;">Impacto Inicial:</span>
                                <input type="datetime-local" id="tw-f-start" class="tw-input" value="${dStart}">
                            </div>
                            <div style="display:flex; flex-direction:column; gap:2px;">
                                <span style="font-size:10px; color:#94a3b8;">Impacto Limite:</span>
                                <input type="datetime-local" id="tw-f-end" class="tw-input" value="${dEnd}">
                            </div>
                        </div>
                    </div>

                    <div class="tw-card">
                        <div class="tw-card-title" style="color:#34d399;">🔢 3. Volume & Modelo Bot</div>
                        <div style="display:grid; grid-template-columns: 1.2fr 1fr; gap:6px;">
                            <div style="display:flex; flex-direction:column; gap:2px;">
                                <span style="font-size:10px; color:#94a3b8;">Modelo no Bot:</span>
                                <input type="text" id="tw-f-model" class="tw-input" value="Fake" style="font-weight:bold; color:#38bdf8;">
                            </div>
                            <div style="display:flex; flex-direction:column; gap:2px;">
                                <span style="font-size:10px; color:#94a3b8;">Fakes / Alvo:</span>
                                <input type="number" id="tw-f-pertarget" class="tw-input" value="4" min="1" max="30" style="text-align:center; font-weight:bold; color:#34d399;">
                            </div>
                        </div>
                        <div style="display:grid; grid-template-columns: 1fr 1.2fr; gap:6px; margin-top:2px; align-items:center;">
                            <div style="display:flex; flex-direction:column; gap:2px;">
                                <span style="font-size:10px; color:#94a3b8;">Max / Aldeia:</span>
                                <input type="number" id="tw-f-maxorigin" class="tw-input" value="4" min="1" max="100" style="text-align:center;">
                            </div>
                            <div style="display:flex; align-items:center; gap:6px; margin-top:12px;">
                                <input type="checkbox" id="tw-f-allow-multi" checked style="cursor:pointer; width:15px; height:15px;">
                                <label for="tw-f-allow-multi" style="font-size:10px; color:#f8fafc; cursor:pointer;" title="Permite enviar múltiplos fakes da mesma aldeia para o mesmo alvo se necessário">Repetir p/ Alvo</label>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; padding:2px 0;">
                    <button class="tw-btn tw-btn-gold" id="tw-btn-gen-russo" style="padding:7px 20px;">
                        ⚡ Gerar Plano PSEvolution (Copiar para a Área de Transferência)
                    </button>
                    <span id="tw-f-status" style="font-size:12px; font-weight:bold;"></span>
                </div>

                <div style="display:flex; flex-direction:column; flex-grow:1; overflow:hidden;">
                    <textarea id="tw-f-preview" class="tw-textarea" style="height:48px; margin-bottom:6px;" placeholder="Configura os parâmetros e clica em 'Gerar Plano PSEvolution'..."></textarea>
                    <div class="tw-panel">
                        <table class="tw-table">
                            <thead>
                                <tr>
                                    <th style="width:35px;">#</th>
                                    <th style="text-align:left; width:200px; padding-left:10px;">Aldeia Origem</th>
                                    <th style="width:80px;">Alvo</th>
                                    <th style="width:75px;">Distância</th>
                                    <th style="width:140px;">Hora de Envio</th>
                                    <th style="width:140px;">Hora de Impacto</th>
                                    <th style="width:90px;">Modelo Bot</th>
                                </tr>
                            </thead>
                            <tbody id="tw-f-tbody">
                                <tr><td colspan="7" style="padding:25px; color:#94a3b8;">Define os alvos e clica em 'Gerar Plano PSEvolution'.</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        const aiSelect = document.getElementById('tw-f-ai');
        aiSelect.onchange = (e) => {
            const isExact = e.target.value === 'sync' || e.target.value === 'fake_train';
            document.getElementById('tw-f-box-exact').style.display = isExact ? 'flex' : 'none';
            document.getElementById('tw-f-box-window').style.display = isExact ? 'none' : 'grid';
        };

        document.getElementById('tw-btn-open-map-modal').onclick = openMapIframeModal;
        document.getElementById('tw-btn-gen-russo').onclick = () => buildBotPlan('russo');

        const updateFakesHUD = () => {
            const raw = document.getElementById('tw-f-targets').value;
            const tList = Array.from(new Set(raw.match(/\d{3}\|\d{3}/g) || []));
            const perTarget = parseInt(document.getElementById('tw-f-pertarget').value, 10) || 1;
            const unit = document.getElementById('tw-f-unit').value;
            
            document.getElementById('tw-f-hud-targets').innerHTML = `${tList.length} <span style="font-size:12px; color:#94a3b8; font-weight:normal;">Alvos</span>`;
            document.getElementById('tw-f-hud-capacity').innerHTML = `${tList.length * perTarget} <span style="font-size:12px; color:#94a3b8; font-weight:normal;">Comandos</span>`;
            
            const uNames = { ram: 'Aríete / Cata (30m)', snob: 'Nobre (35m)', sword: 'Espada (22m)', axe: 'Machado (18m)', heavy: 'CP (11m)', light: 'CL (10m)', spy: 'Batedor (9m)' };
            document.getElementById('tw-f-hud-speed').innerText = uNames[unit] || 'Aríete (30m)';
        };

        document.getElementById('tw-f-targets').oninput = updateFakesHUD;
        document.getElementById('tw-f-pertarget').oninput = updateFakesHUD;
        document.getElementById('tw-f-unit').onchange = updateFakesHUD;
        document.getElementById('tw-f-group').onchange = updateFakesHUD;
    }

    // --- MOTOR DE GERAÇÃO DE FAKES ---
    async function buildBotPlan(format = 'russo') {
        const raw = document.getElementById('tw-f-targets').value;
        const targets = Array.from(new Set(raw.match(/\d{3}\|\d{3}/g) || []));
        if (targets.length === 0) {
            alert('Por favor insere ou seleciona no mapa pelo menos uma coordenada alvo válida (ex: 500|500).');
            return;
        }

        const strategy = document.getElementById('tw-f-ai').value;
        const group = document.getElementById('tw-f-group').value;
        const unit = document.getElementById('tw-f-unit').value;
        const modelName = document.getElementById('tw-f-model').value.trim() || 'Fake';
        const fakesPerTarget = parseInt(document.getElementById('tw-f-pertarget').value, 10) || 1;
        const maxPerOrigin = parseInt(document.getElementById('tw-f-maxorigin').value, 10) || 4;
        const allowMultiSameTarget = document.getElementById('tw-f-allow-multi').checked;

        let startMs, endMs;
        if (strategy === 'sync' || strategy === 'fake_train') {
            startMs = new Date(document.getElementById('tw-f-exact-time').value).getTime();
            endMs = startMs + 1000;
        } else {
            startMs = new Date(document.getElementById('tw-f-start').value).getTime();
            endMs = new Date(document.getElementById('tw-f-end').value).getTime();
        }

        if (isNaN(startMs) || (strategy !== 'sync' && strategy !== 'fake_train' && (isNaN(endMs) || endMs < startMs))) {
            alert('A hora de chegada/janela é inválida.');
            return;
        }

        let pool = [...allVillages];
        if (group === 'def') pool = pool.filter(v => v.rowClass === 'tw-row-def');
        else if (group === 'off') pool = pool.filter(v => v.rowClass === 'tw-row-off');

        if (pool.length === 0) {
            alert('Nenhuma aldeia encontrada para o grupo selecionado.');
            return;
        }

        const now = Date.now();
        const minLaunchMs = now + 45000;
        const originUsage = {};
        pool.forEach(v => originUsage[v.id] = 0);

        const commands = [];
        const speedMin = unitSpeedMinutes[unit] || unitSpeedMinutes.ram;

        targets.forEach((targetCoord, tIdx) => {
            const targetPool = pool.map(v => {
                const dist = calcDistance(v.coords, targetCoord);
                const travelSec = dist * speedMin * 60;
                return { village: v, dist, travelSec };
            }).filter(item => {
                const minPossibleLand = minLaunchMs + (item.travelSec * 1000);
                return minPossibleLand <= endMs;
            }).sort((a, b) => a.dist - b.dist);

            if (targetPool.length === 0) return;

            let assigned = 0;
            let round = 0;

            while (assigned < fakesPerTarget && round < 30) {
                let candidateFoundInRound = false;

                for (let i = 0; i < targetPool.length && assigned < fakesPerTarget; i++) {
                    const cand = targetPool[i];
                    if (originUsage[cand.village.id] >= maxPerOrigin) continue;

                    let landMs;
                    if (strategy === 'sync') {
                        landMs = startMs;
                    } else if (strategy === 'fake_train') {
                        landMs = startMs + (assigned * 200);
                    } else if (strategy === 'spam' || strategy === 'chaos') {
                        const ratio = (tIdx * fakesPerTarget + assigned) / (targets.length * fakesPerTarget);
                        landMs = startMs + (ratio * (endMs - startMs));
                    } else {
                        landMs = startMs + Math.random() * (endMs - startMs);
                    }

                    const launchMs = landMs - (cand.travelSec * 1000);
                    if (launchMs < minLaunchMs) continue;

                    originUsage[cand.village.id]++;
                    assigned++;
                    candidateFoundInRound = true;

                    commands.push({
                        originId: cand.village.id,
                        originName: cand.village.name,
                        originCoords: cand.village.coords,
                        targetCoords: targetCoord,
                        dist: cand.dist.toFixed(2),
                        sec: cand.travelSec,
                        launchTime: new Date(launchMs),
                        landTime: new Date(landMs),
                        model: modelName
                    });

                    if (!allowMultiSameTarget) {
                        // Passa para a próxima
                    }
                }

                round++;
                if (!candidateFoundInRound) break;
            }
        });

        if (commands.length === 0) {
            const timeDiffHours = ((startMs - now) / 3600000).toFixed(1);
            const maxReachFields = ((startMs - now) / 1000 / 60 / speedMin).toFixed(1);
            alert(`❌ Não foi possível agendar fakes para a hora definida.\n\nMotivo: A hora de impacto é daqui a ${timeDiffHours}h, o que permite um alcance máximo de ${maxReachFields} campos para a unidade selecionada.\n\nSoluções:\n1. Aumenta a hora de impacto para mais tarde.\n2. Escolhe uma unidade mais rápida (ex: Cavalaria ou Batedor).\n3. Seleciona o grupo 'Todas as Aldeias'.`);
            return;
        }

        commands.sort((a, b) => a.launchTime - b.launchTime);

        let rows = '', output = '';
        commands.forEach((cmd, i) => {
            rows += `<tr data-vid="${cmd.originId}">
                <td style="color:#94a3b8;">${i+1}</td>
                <td style="text-align:left; padding-left:10px; font-weight:bold; color:#38bdf8;">${cmd.originName}</td>
                <td style="font-weight:bold; color:#fbbf24;">${cmd.targetCoords}</td>
                <td>${cmd.dist}c</td>
                <td><b style="color:#f8fafc;">${cmd.launchTime.toLocaleTimeString('pt-PT')}:${String(cmd.launchTime.getMilliseconds()).padStart(3,'0')}</b></td>
                <td><b style="color:#38bdf8;">${cmd.landTime.toLocaleTimeString('pt-PT')}:${String(cmd.landTime.getMilliseconds()).padStart(3,'0')}</b></td>
                <td><b style="color:#f43f5e;">${cmd.model}</b></td>
            </tr>`;

            const u = `https://${location.host}/game.php?village=${cmd.originId}&screen=place&target_coord=${cmd.targetCoords}`;
            output += `[*]${i+1}. ${formatRussianDateTime(cmd.launchTime)} --- ${cmd.model}[|]${formatRussianDateTime(cmd.landTime)}[|] ${cmd.originCoords} --> ${cmd.targetCoords} [|][url=${u}]Link[/url]\n`;
        });

        document.getElementById('tw-f-tbody').innerHTML = rows;
        document.getElementById('tw-f-preview').value = output.trim();
        await navigator.clipboard.writeText(output.trim());
        document.getElementById('tw-f-status').innerHTML = `<span style="color:#34d399;">✅ ${commands.length} fakes gerados e copiados com sucesso!</span>`;
        showToast(`⚡ ${commands.length} Fakes copiados para a Área de Transferência!`);
    }

    // --- ABA 4: 👑 PLANEADOR NT, ANTI-SNIPE & BUNKER MILIMÉTRICO ---
    function renderAntiBotNT() {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 18 * 3600 * 1000);
        const landDefaultStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}T20:00:00`;

        const nobleVillages = allVillages.filter(v => v.snobsAvailable > 0);
        let nobleOptions = nobleVillages.map(v => `<option value="${v.id}">${v.name} (${v.snobsAvailable} Nobres)</option>`).join('');
        if (!nobleOptions) nobleOptions = `<option value="">❌ Nenhuma aldeia com nobres</option>`;

        document.getElementById('tw-main-body').innerHTML = `
            <div class="tw-pane active" style="padding: 4px; gap:8px;">
                <div style="display:grid; grid-template-columns: 1.1fr 1.1fr 1.2fr; gap:8px;">
                    
                    <!-- CARD 1: ALVO & NOBRES -->
                    <div class="tw-card">
                        <div class="tw-card-title" style="color:#fbbf24;">🎯 1. Alvo & Arquitetura NT</div>
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
                            <div style="display:flex; flex-direction:column; gap:2px;">
                                <span style="font-size:10px; color:#94a3b8;">Coordenada Alvo:</span>
                                <input type="text" id="tw-nt-target" class="tw-input" placeholder="xxx|yyy" maxlength="7" style="font-weight:bold; color:#fbbf24; text-align:center;">
                            </div>
                            <div style="display:flex; flex-direction:column; gap:2px;">
                                <span style="font-size:10px; color:#94a3b8;">Impacto Nobre 1:</span>
                                <input type="datetime-local" id="tw-nt-landtime" class="tw-input" step="1" value="${landDefaultStr}">
                            </div>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:2px;">
                            <span style="font-size:10px; color:#94a3b8;">Arquitetura do NT:</span>
                            <select id="tw-nt-architecture" class="tw-select">
                                <option value="single_4" selected>Origem Única: 4 Nobres (Modelo NT 25%)</option>
                                <option value="split_2x2">Origem Dividida: 2 Aldeias x 2 Nobres (Modelo NT - 2 - 50%)</option>
                            </select>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:2px;" id="tw-box-noble-primary">
                            <span style="font-size:10px; color:#94a3b8;" id="tw-lbl-noble-primary">Aldeia Nobres (4 Nobres):</span>
                            <select id="tw-nt-noble-village" class="tw-select">${nobleOptions}</select>
                        </div>
                        <div style="display:none; flex-direction:column; gap:2px;" id="tw-box-noble-secondary">
                            <span style="font-size:10px; color:#94a3b8;">Aldeia Nobres (Secundária):</span>
                            <select id="tw-nt-noble-village-2" class="tw-select">${nobleOptions}</select>
                        </div>
                    </div>

                    <!-- CARD 2: SEQUÊNCIA DE COMBATE & NUKES -->
                    <div class="tw-card">
                        <div class="tw-card-title" style="color:#f87171;">⚔️ 2. Sequência de Combate</div>
                        <div style="display:flex; flex-direction:column; gap:2px;">
                            <span style="font-size:10px; color:#94a3b8;">Modo de Ataque:</span>
                            <select id="tw-nt-op-level" class="tw-select">
                                <option value="standard_anti" selected>Apenas NT + Escolta Anti-Snipe Intercalada</option>
                                <option value="full_storm">Completa: Muralha (-20m) + Praça (-14m a -2m) + NT + Anti-Snipes</option>
                                <option value="praca_only">Demolição de Praça (-14m a -2m) + NT + Anti-Snipes</option>
                            </select>
                        </div>
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
                            <div style="display:flex; flex-direction:column; gap:2px;">
                                <span style="font-size:10px; color:#94a3b8;">Nukes Limpeza:</span>
                                <input type="number" id="tw-nt-lead-nukes" class="tw-input" value="1" min="0" max="5">
                            </div>
                            <div style="display:flex; flex-direction:column; gap:2px;">
                                <span style="font-size:10px; color:#94a3b8;">Gap Bot (ms):</span>
                                <input type="number" id="tw-nt-ms-interval" class="tw-input" value="200" min="50" max="1000">
                            </div>
                        </div>
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
                            <div style="display:flex; flex-direction:column; gap:2px;">
                                <span style="font-size:10px; color:#94a3b8;">Modelo Nuke/Anti-Snipe:</span>
                                <input type="text" id="tw-nt-model-nuke" class="tw-input" value="Ataque Full" style="font-weight:bold; color:#f87171;">
                            </div>
                            <div style="display:flex; flex-direction:column; gap:2px;">
                                <span style="font-size:10px; color:#94a3b8;">Modelo NT:</span>
                                <input type="text" id="tw-nt-model-snob" class="tw-input" value="NT 25%" style="font-weight:bold; color:#fbbf24;">
                            </div>
                        </div>
                    </div>

                    <!-- CARD 3: BUNKER CIRÚRGICO C/ PALADINO -->
                    <div class="tw-card" style="border-color:#059669; background:rgba(6, 78, 59, 0.2);">
                        <div class="tw-card-title" style="color:#34d399;">
                            <span>🛡️ 3. Bunker Pós-Conquista (Paladino)</span>
                            <select id="tw-nt-bunker-count" class="tw-select" style="font-weight:bold; color:#34d399; padding:2px 6px; font-size:11px;">
                                <option value="0">0 Apoios</option>
                                <option value="1">1 Apoio</option>
                                <option value="2" selected>2 Apoios</option>
                                <option value="3">3 Apoios</option>
                                <option value="4">4 Apoios</option>
                            </select>
                        </div>
                        
                        <div style="display:grid; grid-template-columns: 1.2fr 1fr; gap:6px; margin-top:2px;">
                            <div style="display:flex; flex-direction:column; gap:2px;">
                                <span style="font-size:10px; color:#a7f3d0;">Gap Pós-Nobre (ms):</span>
                                <input type="number" id="tw-nt-bunker-gap" class="tw-input" value="200" min="50" max="2000" step="50" style="font-weight:bold; color:#34d399; text-align:center;" title="Milissegundos a seguir ao 4º nobre. Ex: 200ms entra aos 01:000!">
                            </div>
                            <div style="display:flex; flex-direction:column; gap:2px;">
                                <span style="font-size:10px; color:#a7f3d0;">Degrau / Apoio:</span>
                                <input type="number" id="tw-nt-bunker-step" class="tw-input" value="50" min="10" max="500" step="10" style="font-weight:bold; color:#34d399; text-align:center;" title="Espaço entre o 1º e 2º bunker. Ex: 50ms entra aos 01:050!">
                            </div>
                        </div>

                        <div style="display:flex; flex-direction:column; gap:4px; margin-top:4px;">
                            <div style="display:grid; grid-template-columns: 1.4fr 1fr; gap:4px; align-items:center;">
                                <span style="font-size:10px; color:#a7f3d0;">Preset 1 (Full Def):</span>
                                <span style="font-size:10px; color:#a7f3d0; text-align:right;">Pop Mínima:</span>
                            </div>
                            <div style="display:grid; grid-template-columns: 1.4fr 1fr; gap:4px;">
                                <input type="text" id="tw-nt-model-bunker-1" class="tw-input" value="BUNK" placeholder="Modelo Bot" style="font-weight:bold; color:#34d399;">
                                <input type="number" id="tw-nt-pop-bunker-1" class="tw-input" value="12000" style="text-align:center;">
                            </div>

                            <div style="display:grid; grid-template-columns: 1.4fr 1fr; gap:4px; align-items:center; margin-top:2px;">
                                <span style="font-size:10px; color:#a7f3d0;">Preset 2 (Fallback):</span>
                                <span style="font-size:10px; color:#a7f3d0; text-align:right;">Pop Mínima:</span>
                            </div>
                            <div style="display:grid; grid-template-columns: 1.4fr 1fr; gap:4px;">
                                <input type="text" id="tw-nt-model-bunker-2" class="tw-input" value="BUNK" placeholder="Modelo Bot" style="font-weight:bold; color:#34d399;">
                                <input type="number" id="tw-nt-pop-bunker-2" class="tw-input" value="4000" style="text-align:center;">
                            </div>
                        </div>
                    </div>

                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; padding:2px 0;">
                    <button class="tw-btn tw-btn-gold" id="tw-btn-gen-nt-russo" style="padding:7px 18px;">
                        ⚡ Gerar Plano PSEvolution (Copiar para a Área de Transferência)
                    </button>
                    <span id="tw-nt-status" style="font-size:12px; font-weight:bold;"></span>
                </div>

                <div style="display:flex; flex-direction:column; flex-grow:1; overflow:hidden;">
                    <textarea id="tw-nt-preview" class="tw-textarea" style="height:48px; margin-bottom:6px;" placeholder="Configura os parâmetros e clica em Gerar..."></textarea>
                    <div class="tw-panel">
                        <table class="tw-table">
                            <thead>
                                <tr>
                                    <th style="width:30px;">#</th>
                                    <th style="width:150px;">Fase do Comando</th>
                                    <th style="text-align:left; width:180px; padding-left:10px;">Origem</th>
                                    <th style="width:75px;">Alvo</th>
                                    <th style="width:65px;">Distância</th>
                                    <th style="width:140px;">Hora de Envio</th>
                                    <th style="width:140px;">Hora de Impacto</th>
                                    <th style="width:120px;">Modelo & Pop</th>
                                </tr>
                            </thead>
                            <tbody id="tw-nt-tbody">
                                <tr><td colspan="8" style="padding:25px; color:#94a3b8;">Define o alvo e clica em 'Gerar Plano PSEvolution'.</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        const archSelect = document.getElementById('tw-nt-architecture');
        archSelect.onchange = (e) => {
            const isSplit = e.target.value === 'split_2x2';
            document.getElementById('tw-box-noble-secondary').style.display = isSplit ? 'flex' : 'none';
            document.getElementById('tw-nt-model-snob').value = isSplit ? 'NT - 2 - 50%' : 'NT 25%';
            document.getElementById('tw-lbl-noble-primary').innerText = isSplit ? 'Aldeia Nobres (Parte 1):' : 'Aldeia Nobres (4 Nobres):';
        };

        document.getElementById('tw-btn-gen-nt-russo').onclick = () => buildMasterOPPlan();
    }

    async function buildMasterOPPlan() {
        const target = document.getElementById('tw-nt-target').value.trim();
        if (!/^\d{3}\|\d{3}$/.test(target)) {
            alert('Por favor insere uma coordenada alvo válida (ex: 500|500).');
            return;
        }

        const architecture = document.getElementById('tw-nt-architecture').value;
        const nobleVillageId1 = document.getElementById('tw-nt-noble-village').value;
        const nobleVillage1 = villagesById[nobleVillageId1];
        if (!nobleVillage1) {
            alert('Por favor seleciona a aldeia de nobres.');
            return;
        }

        let nobleVillage2 = null;
        if (architecture === 'split_2x2') {
            const nobleVillageId2 = document.getElementById('tw-nt-noble-village-2').value;
            nobleVillage2 = villagesById[nobleVillageId2];
            if (!nobleVillage2 || nobleVillage2.id === nobleVillage1.id) {
                alert('Para a divisão 2x2, seleciona duas aldeias de nobres distintas.');
                return;
            }
        }

        const baseLandTime = new Date(document.getElementById('tw-nt-landtime').value).getTime();
        const opLevel = document.getElementById('tw-nt-op-level').value;
        const bunkerCount = parseInt(document.getElementById('tw-nt-bunker-count').value, 10) || 0;
        const bunkerGapMs = parseInt(document.getElementById('tw-nt-bunker-gap').value, 10) || 200;
        const bunkerStepMs = parseInt(document.getElementById('tw-nt-bunker-step').value, 10) || 50;

        const modelBunker1 = document.getElementById('tw-nt-model-bunker-1').value.trim() || 'BUNK';
        const popBunker1 = parseInt(document.getElementById('tw-nt-pop-bunker-1').value, 10) || 12000;
        const modelBunker2 = document.getElementById('tw-nt-model-bunker-2').value.trim() || 'BUNK';
        const popBunker2 = parseInt(document.getElementById('tw-nt-pop-bunker-2').value, 10) || 4000;

        const leadNukesCount = parseInt(document.getElementById('tw-nt-lead-nukes').value, 10) || 1;
        const msStep = parseInt(document.getElementById('tw-nt-ms-interval').value, 10) || 200;
        const halfStep = Math.floor(msStep / 2);
        
        const modelNuke = document.getElementById('tw-nt-model-nuke').value.trim() || 'Ataque Full';
        const modelSnob = document.getElementById('tw-nt-model-snob').value.trim() || (architecture === 'split_2x2' ? 'NT - 2 - 50%' : 'NT 25%');

        const now = Date.now();
        const minLaunchMs = now + 60000;

        const snobDist1 = calcDistance(nobleVillage1.coords, target);
        const snobSec1 = snobDist1 * unitSpeedMinutes.snob * 60;
        const nobleLaunchMs1 = baseLandTime - (snobSec1 * 1000);

        if (nobleLaunchMs1 < minLaunchMs) {
            const earliestLand1 = new Date(now + (snobSec1 + 120) * 1000);
            alert(`❌ A aldeia ${nobleVillage1.name} fica a ${snobDist1.toFixed(1)}c (${formatDuration(snobSec1)}) do alvo.\nA hora de envio já passou.\nHora mínima de impacto para esta aldeia: ${earliestLand1.toLocaleDateString('pt-PT')} ${earliestLand1.toLocaleTimeString('pt-PT')}`);
            return;
        }

        let snobDist2 = 0, snobSec2 = 0, nobleLaunchMs2 = 0, nobleLandMs2 = 0;
        if (architecture === 'split_2x2') {
            snobDist2 = calcDistance(nobleVillage2.coords, target);
            snobSec2 = snobDist2 * unitSpeedMinutes.snob * 60;
            nobleLandMs2 = baseLandTime + (2 * msStep);
            nobleLaunchMs2 = nobleLandMs2 - (snobSec2 * 1000);

            if (nobleLaunchMs2 < minLaunchMs) {
                const earliestLand2 = new Date(now + (snobSec2 + 120) * 1000);
                alert(`❌ A aldeia secundária ${nobleVillage2.name} fica a ${snobDist2.toFixed(1)}c (${formatDuration(snobSec2)}) do alvo.\nA hora de envio já passou.\nHora mínima de impacto para esta aldeia: ${earliestLand2.toLocaleDateString('pt-PT')} ${earliestLand2.toLocaleTimeString('pt-PT')}`);
                return;
            }
        }

        const excludedIds = [nobleVillage1.id];
        if (nobleVillage2) excludedIds.push(nobleVillage2.id);

        const sortedOff = allVillages.filter(v => v.rowClass === 'tw-row-off' && !excludedIds.includes(v.id)).map(v => {
            const dist = calcDistance(v.coords, target);
            return { village: v, dist, sec: dist * unitSpeedMinutes.ram * 60 };
        }).sort((a,b) => a.dist - b.dist);

        const sortedDef = allVillages.filter(v => v.rowClass === 'tw-row-def' && !excludedIds.includes(v.id)).map(v => {
            const dist = calcDistance(v.coords, target);
            return { village: v, dist };
        }).sort((a,b) => a.dist - b.dist);

        const sequence = [];
        const usedOffVillages = new Set();
        const usedDefVillages = new Set();

        function assignOffNuke(targetLandMs, typeLabel, badgeClass, modelStr) {
            for (let i = 0; i < sortedOff.length; i++) {
                const cand = sortedOff[i];
                if (usedOffVillages.has(cand.village.id)) continue;
                
                const travelSec = cand.sec;
                const launchMs = targetLandMs - (travelSec * 1000);
                
                if (launchMs >= minLaunchMs) {
                    usedOffVillages.add(cand.village.id);
                    sequence.push({
                        type: typeLabel,
                        badge: badgeClass,
                        actionType: 'Attack',
                        originId: cand.village.id,
                        originName: cand.village.name,
                        originCoords: cand.village.coords,
                        targetCoords: target,
                        dist: cand.dist.toFixed(2),
                        sec: travelSec,
                        launchTime: new Date(launchMs),
                        landTime: new Date(targetLandMs),
                        model: modelStr,
                        info: 'Full Off'
                    });
                    return true;
                }
            }
            return false;
        }

        function assignDefBunker(targetLandMs, typeLabel, badgeClass, requirePaladin = false) {
            for (let i = 0; i < sortedDef.length; i++) {
                const cand = sortedDef[i];
                if (usedDefVillages.has(cand.village.id)) continue;
                
                const v = cand.village;
                const d = v.troopsDict;
                const defPop = (d.spear||0)*1 + (d.sword||0)*1 + (d.archer||0)*1 + (d.heavy||0)*6;
                const hasKnight = (d.knight || 0) >= 1;

                if (requirePaladin && !hasKnight) continue;
                
                let chosenModel = null, presetLabel = '';
                if (defPop >= popBunker1) {
                    chosenModel = modelBunker1;
                    presetLabel = `Preset 1 (${(defPop/1000).toFixed(1)}k)`;
                } else if (defPop >= popBunker2) {
                    chosenModel = modelBunker2;
                    presetLabel = `Preset 2 (${(defPop/1000).toFixed(1)}k)`;
                } else {
                    continue;
                }

                const speedMin = (requirePaladin || hasKnight) ? unitSpeedMinutes.knight : unitSpeedMinutes.sword;
                const travelSec = cand.dist * speedMin * 60;
                const launchMs = targetLandMs - (travelSec * 1000);
                
                if (launchMs >= minLaunchMs) {
                    usedDefVillages.add(v.id);
                    const finalBadge = (requirePaladin || hasKnight) ? 'tw-badge-paladino' : badgeClass;
                    const finalType = (requirePaladin || hasKnight) ? `${typeLabel} (Paladino)` : typeLabel;
                    const extraInfo = (requirePaladin || hasKnight) ? `Paladino (${formatDuration(travelSec)}) • ${presetLabel}` : presetLabel;

                    sequence.push({
                        type: finalType,
                        badge: finalBadge,
                        actionType: 'Support',
                        originId: v.id,
                        originName: v.name,
                        originCoords: v.coords,
                        targetCoords: target,
                        dist: cand.dist.toFixed(2),
                        sec: travelSec,
                        launchTime: new Date(launchMs),
                        landTime: new Date(targetLandMs),
                        model: chosenModel,
                        info: extraInfo
                    });
                    return true;
                }
            }
            return false;
        }

        // 1. Limpeza Principal
        for (let i = 0; i < leadNukesCount; i++) {
            assignOffNuke(baseLandTime - ((leadNukesCount - i) * 100), 'Limpeza Principal', 'tw-badge-nuke', modelNuke);
        }

        // 2. Escoltas Anti-Snipe
        const antiSnipeOffsets = [halfStep, msStep + halfStep, (2 * msStep) + halfStep];
        antiSnipeOffsets.forEach(offset => {
            const slotNum = (offset === halfStep) ? '1 (pós N1)' : (offset === msStep + halfStep) ? '2 (pós N2)' : '3 (pós N3)';
            assignOffNuke(baseLandTime + offset, `Anti-Snipe ${slotNum}`, 'tw-badge-anti', modelNuke);
        });

        if (opLevel === 'full_storm') {
            assignOffNuke(baseLandTime - (20 * 60 * 1000), 'Muralha (-20m)', 'tw-badge-muralha', modelNuke);
        }

        if (architecture === 'single_4') {
            sequence.push({
                type: 'Combo NT (4 Nobres)',
                badge: 'tw-badge-snob',
                actionType: 'Attack',
                originId: nobleVillage1.id,
                originName: nobleVillage1.name,
                originCoords: nobleVillage1.coords,
                targetCoords: target,
                dist: snobDist1.toFixed(2),
                sec: snobSec1,
                launchTime: new Date(nobleLaunchMs1),
                landTime: new Date(baseLandTime),
                model: modelSnob,
                info: '4 Nobres'
            });
        } else {
            sequence.push({
                type: 'Combo NT 1/2 (2 Nobres)',
                badge: 'tw-badge-snob',
                actionType: 'Attack',
                originId: nobleVillage1.id,
                originName: nobleVillage1.name,
                originCoords: nobleVillage1.coords,
                targetCoords: target,
                dist: snobDist1.toFixed(2),
                sec: snobSec1,
                launchTime: new Date(nobleLaunchMs1),
                landTime: new Date(baseLandTime),
                model: modelSnob,
                info: '2 Nobres'
            });

            sequence.push({
                type: 'Combo NT 2/2 (2 Nobres)',
                badge: 'tw-badge-snob',
                actionType: 'Attack',
                originId: nobleVillage2.id,
                originName: nobleVillage2.name,
                originCoords: nobleVillage2.coords,
                targetCoords: target,
                dist: snobDist2.toFixed(2),
                sec: snobSec2,
                launchTime: new Date(nobleLaunchMs2),
                landTime: new Date(nobleLandMs2),
                model: modelSnob,
                info: '2 Nobres'
            });
        }

        if (opLevel === 'full_storm' || opLevel === 'praca_only') {
            const pracaOffsetsMin = [14, 12, 10, 8, 6, 4, 2];
            pracaOffsetsMin.forEach(minBefore => {
                assignDefBunker(baseLandTime - (minBefore * 60 * 1000), `Praça (-${minBefore}m)`, 'tw-badge-praca', false);
            });
        }

        // CÁLCULO CIRÚRGICO DE BUNKER MILISSEGUNDO
        // 4º Nobre bate a baseLandTime + (3 * msStep) -> ex: 20:30:00:800 (se baseLandTime é :200)
        const finalNobleImpactMs = baseLandTime + (3 * msStep);

        for (let b = 1; b <= bunkerCount; b++) {
            const bunkerLandMs = finalNobleImpactMs + bunkerGapMs + ((b - 1) * bunkerStepMs);
            if (b === 1) {
                const paladinFound = assignDefBunker(bunkerLandMs, `🛡️ Bunker Apoio 1`, 'tw-badge-bunker', true);
                if (!paladinFound) {
                    assignDefBunker(bunkerLandMs, `🛡️ Bunker Apoio 1`, 'tw-badge-bunker', false);
                }
            } else {
                assignDefBunker(bunkerLandMs, `🛡️ Bunker Apoio ${b}`, 'tw-badge-bunker', false);
            }
        }

        sequence.sort((a,b) => a.launchTime - b.launchTime);

        let rows = '', output = '';
        sequence.forEach((cmd, i) => {
            rows += `<tr data-vid="${cmd.originId}">
                <td style="color:#94a3b8;">${i+1}</td>
                <td><span class="${cmd.badge}">${cmd.type}</span></td>
                <td style="text-align:left; padding-left:10px; font-weight:bold; color:#38bdf8;">${cmd.originName}</td>
                <td style="font-weight:bold; color:#fbbf24;">${cmd.targetCoords}</td>
                <td>${cmd.dist}c</td>
                <td><b style="color:#f8fafc;">${cmd.launchTime.toLocaleTimeString('pt-PT')}:${String(cmd.launchTime.getMilliseconds()).padStart(3,'0')}</b></td>
                <td><b style="color:#38bdf8;">${cmd.landTime.toLocaleTimeString('pt-PT')}:${String(cmd.landTime.getMilliseconds()).padStart(3,'0')}</b></td>
                <td><b style="color:${cmd.actionType==='Support'?'#34d399':'#3fb950'};">${cmd.model}</b> <span style="font-size:10px; color:#94a3b8;">(${cmd.info})</span></td>
            </tr>`;

            const u = `https://${location.host}/game.php?village=${cmd.originId}&screen=place&target_coord=${cmd.targetCoords}`;
            output += `[*]${i+1}. ${formatRussianDateTime(cmd.launchTime)} --- ${cmd.model}[|]${formatRussianDateTime(cmd.landTime)}[|] ${cmd.originCoords} --> ${cmd.targetCoords} [|][url=${u}]Link[/url]\n`;
        });

        document.getElementById('tw-nt-tbody').innerHTML = rows;
        document.getElementById('tw-nt-preview').value = output.trim();
        await navigator.clipboard.writeText(output.trim());
        document.getElementById('tw-nt-status').innerHTML = `<span style="color:#34d399;">✅ ${sequence.length} comandos sincronizados com precisão militar!</span>`;
        showToast(`⚡ Plano copiado para a Área de Transferência!`);
    }

    // --- JANELA DO MAPA (SEM RELOAD) ---
    function openMapIframeModal() {
        if (document.getElementById('tw-map-iframe-modal')) return;

        const mapModal = document.createElement('div');
        mapModal.id = 'tw-map-iframe-modal';
        mapModal.style.cssText = `
            position: fixed; inset: 2vh 2vw; z-index: 1000000;
            background: #090d16; border: 2px solid #38bdf8; border-radius: 12px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.95);
            display: flex; flex-direction: column; overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        `;
        
        mapModal.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 16px; background:#0f172a; border-bottom:1px solid #1e293b;">
                <div style="font-weight:bold; color:#38bdf8; font-size:14px;">🗺️ SELEÇÃO NO MAPA (SEM RELOAD)</div>
                <div style="display:flex; gap:10px; align-items:center;">
                    <span style="color:#94a3b8; font-size:12px; font-weight:bold;">Alvos: <span id="tw-hud-count" style="color:#34d399; font-size:14px;">${grabbedTargets.size}</span></span>
                    <button class="tw-btn" id="tw-hud-clear" style="color:#f43f5e; padding:4px 10px;">Limpar</button>
                    <button class="tw-btn tw-btn-green" id="tw-hud-done" style="padding:4px 12px;">✅ Concluir & Fechar</button>
                </div>
            </div>
            <div style="flex-grow:1; position:relative; background:#000;">
                <div id="tw-map-loader" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:#94a3b8; z-index:10;"><div class="tw-spinner"></div> A carregar o mapa...</div>
                <iframe id="tw-map-frame" src="/game.php?screen=map" style="width:100%; height:100%; border:none; opacity:0; transition:opacity 0.3s;"></iframe>
            </div>
        `;
        document.body.appendChild(mapModal);

        const iframe = document.getElementById('tw-map-frame');
        iframe.onload = () => {
            document.getElementById('tw-map-loader').style.display = 'none';
            iframe.style.opacity = '1';
            
            try {
                const iWin = iframe.contentWindow, iDoc = iframe.contentDocument;
                const style = iDoc.createElement('style');
                style.innerHTML = `
                    #topContainer, #header_info, #footer, #side_bar, #minimap_container, .principal, .server_info { display: none !important; }
                    body { background: #000 !important; overflow: hidden !important; margin:0; padding:0; }
                    #map_container { margin: 0 auto !important; position: relative !important; }
                    .tw-shadow-box {
                        position: absolute !important;
                        background: rgba(239, 68, 68, 0.45) !important;
                        border: 2px solid #ef4444 !important;
                        box-shadow: 0 0 12px rgba(239, 68, 68, 0.9), inset 0 0 8px rgba(239, 68, 68, 0.6) !important;
                        border-radius: 4px !important;
                        pointer-events: none !important;
                        display: flex !important; align-items: center !important; justify-content: center !important;
                        font-size: 14px !important; font-weight: bold !important; color: #fff !important;
                        z-index: 1000 !important;
                    }
                `;
                iDoc.head.appendChild(style);

                const checkTWMap = setInterval(() => {
                    if (iWin.TWMap && iWin.TWMap.mapHandler && iWin.TWMap.mapHandler.onClick) {
                        clearInterval(checkTWMap);
                        const origClick = iWin.TWMap.mapHandler.onClick;
                        iWin.TWMap.mapHandler.onClick = function (x, y, event) {
                            const coord = `${x}|${y}`;
                            const v = iWin.TWMap.villages[x * 1000 + y];
                            if (v) {
                                if (grabbedTargets.has(coord)) grabbedTargets.delete(coord);
                                else grabbedTargets.add(coord);
                                
                                document.getElementById('tw-hud-count').innerText = grabbedTargets.size;
                                const tb = document.getElementById('tw-f-targets');
                                if (tb) {
                                    tb.value = Array.from(grabbedTargets).join(' ');
                                    tb.dispatchEvent(new Event('input'));
                                }
                                
                                renderShadowsInIframe(iWin, iDoc);
                                return false;
                            }
                            return origClick.call(this, x, y, event);
                        };

                        if (mapInterval) clearInterval(mapInterval);
                        mapInterval = setInterval(() => renderShadowsInIframe(iWin, iDoc), 100);
                        renderShadowsInIframe(iWin, iDoc);
                    }
                }, 100);
            } catch (e) { console.error(e); }
        };

        document.getElementById('tw-hud-clear').onclick = () => {
            grabbedTargets.clear();
            document.getElementById('tw-hud-count').innerText = '0';
            const tb = document.getElementById('tw-f-targets');
            if (tb) {
                tb.value = '';
                tb.dispatchEvent(new Event('input'));
            }
            const iframe = document.getElementById('tw-map-frame');
            if (iframe && iframe.contentWindow) renderShadowsInIframe(iframe.contentWindow, iframe.contentDocument);
        };
        document.getElementById('tw-hud-done').onclick = () => {
            if (mapInterval) { clearInterval(mapInterval); mapInterval = null; }
            mapModal.remove();
        };
    }

    function renderShadowsInIframe(iWin, iDoc) {
        if (!iWin.TWMap || !iWin.TWMap.map) return;
        const mapContainer = iDoc.getElementById('map_container') || iDoc.getElementById('map');
        if (!mapContainer) return;
        mapContainer.querySelectorAll('.tw-shadow-box').forEach(el => el.remove());

        const size = iWin.TWMap.tileSize || [53, 38];
        grabbedTargets.forEach(coord => {
            const [x, y] = coord.split('|').map(Number);
            const pos = iWin.TWMap.map.pixelByCoord(x, y);
            if (pos && typeof pos[0] === 'number') {
                const mark = iDoc.createElement('div');
                mark.className = 'tw-shadow-box';
                mark.style.left = `${pos[0]}px`;
                mark.style.top = `${pos[1]}px`;
                mark.style.width = `${size[0]}px`;
                mark.style.height = `${size[1]}px`;
                mark.innerHTML = '🎯';
                mapContainer.appendChild(mark);
            }
        });
    }

    // Tooltips
    document.addEventListener('mouseover', e => {
        const tr = e.target.closest('[data-vid]');
        if (!tr) return;
        const v = villagesById[tr.getAttribute('data-vid')];
        if (!v) return;
        let t = `<div style="font-weight:bold; color:#fff; margin-bottom:4px;">${v.name}</div>
                 <div style="font-size:11px; margin-bottom:4px; color:#38bdf8;">Função: <span class="${v.roleTag.css}">${v.roleTag.label}</span></div>
                 <div style="font-size:11px; margin-bottom:6px; color:${v.farm.color};">Fazenda: ${v.farm.used.toLocaleString('pt-PT')} / ${v.farm.max.toLocaleString('pt-PT')} (${v.farm.perc}%)</div>
                 <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px 8px;">`;
        unitConfigs.forEach(u => {
            if (!u.isHidden && u.name) {
                const q = v.troopsDict[u.name] || 0;
                t += `<div style="display:flex; justify-content:space-between; gap:4px; color:#94a3b8;"><img src="${u.src}" style="width:14px; height:14px;"> <b style="color:${q>0?'#fff':'#475569'};">${q}</b></div>`;
            }
        });
        const tt = document.getElementById(`${modalId}-tooltip`);
        tt.innerHTML = t + '</div>'; tt.classList.add('show');
    });
    document.addEventListener('mousemove', e => {
        if (!e.target.closest('[data-vid]')) return;
        const tt = document.getElementById(`${modalId}-tooltip`);
        tt.style.left = Math.min(e.clientX + 15, window.innerWidth - 220) + 'px';
        tt.style.top = Math.min(e.clientY + 15, window.innerHeight - 180) + 'px';
    });
    document.addEventListener('mouseout', e => {
        if (e.target.closest('[data-vid]')) document.getElementById(`${modalId}-tooltip`).classList.remove('show');
    });

    document.getElementById('tw-btn-close').onclick = () => {
        if (mapInterval) clearInterval(mapInterval);
        ui.remove(); backdrop.remove(); tooltip.remove(); toast.remove();
        if (document.getElementById('tw-map-iframe-modal')) document.getElementById('tw-map-iframe-modal').remove();
    };

    await loadData();
})();
