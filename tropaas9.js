(async function () {
    const uiId = 'tw-master-ui';
    
    function closeUI() {
        if (document.getElementById(uiId)) document.getElementById(uiId).remove();
        if (document.getElementById(`${uiId}-backdrop`)) document.getElementById(`${uiId}-backdrop`).remove();
        if (document.getElementById(`${uiId}-style`)) document.getElementById(`${uiId}-style`).remove();
        if (document.getElementById(`${uiId}-tooltip`)) document.getElementById(`${uiId}-tooltip`).remove();
        document.removeEventListener('keydown', globalKeyHandler, true);
    }
    
    if (document.getElementById(uiId)) { closeUI(); return; }

    const style = document.createElement('style');
    style.id = `${uiId}-style`;
    style.innerHTML = `
        #${uiId}-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.75); z-index: 99998; backdrop-filter: blur(4px); animation: fadeIn 0.2s ease; }
        #${uiId} { 
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
            background: #181a1b; color: #e8e6e3; border: 1px solid #3a3e41; 
            border-radius: 12px; z-index: 99999; padding: 20px 25px; 
            box-shadow: 0 15px 50px rgba(0,0,0,0.9); 
            width: 95vw; max-width: 1150px; height: 88vh; max-height: 800px;
            display: flex; flex-direction: column; 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
            opacity: 0; transition: all 0.2s ease-out; 
        }
        #${uiId}.show { opacity: 1; }
        .tw-ui-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #3a3e41; padding-bottom: 12px; margin-bottom: 15px; flex-shrink: 0; }
        .tw-ui-title { font-size: 17px; font-weight: bold; color: #fff; display: flex; align-items: center; gap: 10px; }
        .tw-ui-close { cursor: pointer; color: #888; font-size: 28px; line-height: 20px; transition: 0.2s; user-select: none; }
        .tw-ui-close:hover { color: #ff5555; transform: scale(1.15); }
        
        .tw-tabs { display: flex; gap: 10px; margin-bottom: 15px; border-bottom: 1px solid #2a2d30; padding-bottom: 8px; flex-shrink: 0; }
        .tw-tab-btn { background: #222426; border: 1px solid #3a3e41; color: #a8a095; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px; transition: 0.2s; }
        .tw-tab-btn.active { background: #3a3e41; color: #7fbfff; border-color: #7fbfff; }
        .tw-tab-btn:hover:not(.active) { background: #2a2d30; color: #fff; }

        .tw-tab-content { display: none; flex-direction: column; flex-grow: 1; overflow: hidden; }
        .tw-tab-content.active { display: flex; }

        .tw-ov-container { overflow-y: auto; overflow-x: auto; flex-grow: 1; padding-right: 5px; }
        .tw-ov-container::-webkit-scrollbar { width: 6px; height: 6px; }
        .tw-ov-container::-webkit-scrollbar-track { background: #1a1a1a; }
        .tw-ov-container::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
        
        .tw-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .tw-table th, .tw-table td { padding: 8px 6px; border-bottom: 1px solid #2a2d30; text-align: center; vertical-align: middle; white-space: nowrap; }
        .tw-table th { background-color: #222426 !important; position: sticky; top: 0; z-index: 2; color: #a8a095 !important; border-bottom: 2px solid #111 !important; }
        .tw-table tbody tr { transition: background 0.1s; }
        .tw-table tbody tr:hover { background: #26292c !important; }
        
        .tw-row-ataque { background-color: rgba(255, 60, 60, 0.18) !important; }
        .tw-row-defesa { background-color: rgba(60, 140, 255, 0.18) !important; }

        .tw-zero { color: #666; opacity: 0.25; font-weight: normal; }
        .tw-val { color: #fff; font-weight: bold; }
        .tw-farm-bar-bg { background: #111; height: 4px; border-radius: 2px; margin-top: 4px; overflow: hidden; width: 100%; }
        .tw-farm-bar { height: 100%; }
        
        .tw-pagination { display: flex; justify-content: space-between; align-items: center; margin-top: 15px; border-top: 1px solid #3a3e41; padding-top: 12px; flex-shrink: 0; }
        .tw-btn-page { background: #2a2d30; color: #e8e6e3; border: 1px solid #444; padding: 6px 14px; border-radius: 6px; cursor: pointer; transition: 0.2s; font-weight: bold; }
        .tw-btn-page:hover:not(:disabled) { background: #3a3e41; border-color: #7fbfff; color: #fff; }
        .tw-btn-page:disabled { opacity: 0.3; cursor: not-allowed; }
        
        .tw-counter-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; height: 100%; overflow-y: auto; padding-right:5px; }
        .tw-counter-grid::-webkit-scrollbar { width: 6px; }
        .tw-counter-grid::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
        
        .tw-card { background: #1c1f21; border: 1px solid #2e3235; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px; }
        .tw-card-title { font-weight: bold; color: #e5c07b; margin-bottom: 8px; font-size: 13px; border-bottom: 1px solid #2e3235; padding-bottom: 4px; display: flex; justify-content: space-between; align-items: center; }
        .tw-category-link { color: #7fbfff; text-decoration: none; cursor: pointer; font-weight: 500; }
        .tw-category-link:hover { text-decoration: underline; color: #fff; }
        .tw-coords-box { width: 100%; height: 70px; background: #111; border: 1px solid #3a3e41; color: #98c379; font-family: monospace; font-size: 12px; padding: 8px; border-radius: 6px; box-sizing: border-box; resize: none; }
        
        .tw-target-input { background: #111; border: 1px solid #444; color: #fff; padding: 4px 8px; border-radius: 4px; width: 90px; font-size: 12px; text-align: center; }
        .tw-target-select { background: #111; border: 1px solid #444; color: #fff; padding: 3px 6px; border-radius: 4px; font-size: 12px; }
        .tw-btn-copy { background: #2a2d30; color: #7fbfff; border: 1px solid #444; padding: 3px 8px; border-radius: 4px; font-size: 11px; cursor: pointer; font-weight: bold; transition: 0.2s; }
        .tw-btn-copy:hover { background: #7fbfff; color: #111; }

        /* Lista Dinâmica de Aldeias */
        .tw-v-list { max-height: 190px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; padding-right: 4px; }
        .tw-v-list::-webkit-scrollbar { width: 4px; }
        .tw-v-list::-webkit-scrollbar-thumb { background: #444; border-radius: 2px; }
        .tw-v-item { display: flex; justify-content: space-between; align-items: center; background: #222528; padding: 5px 10px; border-radius: 5px; font-size: 12px; border: 1px solid #2f3438; transition: 0.15s; }
        .tw-v-item:hover { background: #2d3136; border-color: #7fbfff; }
        .tw-v-item a { color: #7fbfff; text-decoration: none; font-weight: bold; }
        .tw-v-item a:hover { text-decoration: underline; color: #fff; }

        /* Tooltip Flutuante de Tropas */
        #tw-tooltip-card {
            position: fixed; z-index: 1000000; background: #121415; border: 1px solid #7fbfff;
            border-radius: 8px; padding: 10px 14px; pointer-events: none; opacity: 0;
            box-shadow: 0 10px 30px rgba(0,0,0,0.8); transition: opacity 0.15s ease-out; font-size: 12px; min-width: 180px;
        }
        #tw-tooltip-card.show { opacity: 1; }
        .tw-tip-title { font-weight: bold; color: #fff; margin-bottom: 6px; border-bottom: 1px solid #333; padding-bottom: 4px; }
        .tw-tip-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px 10px; }
        .tw-tip-item { display: flex; align-items: center; justify-content: space-between; gap: 6px; }

        .tw-spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.3); border-radius: 50%; border-top-color: #fff; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    `;
    document.head.appendChild(style);

    const backdrop = document.createElement('div');
    backdrop.id = `${uiId}-backdrop`;
    document.body.appendChild(backdrop);

    const ui = document.createElement('div');
    ui.id = uiId;
    ui.innerHTML = `
        <div class="tw-ui-header">
            <div class="tw-ui-title" id="tw-ui-title"><div class="tw-spinner"></div> A compilar império e tropas...</div>
            <span class="tw-ui-close" id="tw-ui-close-btn">&times;</span>
        </div>
        <div class="tw-tabs" id="tw-tabs-bar" style="display:none;">
            <button class="tw-tab-btn active" id="btn-tab-overview">📊 Visão Geral por Aldeia</button>
            <button class="tw-tab-btn" id="btn-tab-counter">⚔️ Contador & Planeador Tático</button>
        </div>
        <div id="tw-ui-content" style="flex-grow:1; display:flex; flex-direction:column; overflow:hidden;">
            <div style="text-align:center; padding: 40px; color:#888;">A carregar dados do mundo e aldeias...</div>
        </div>
    `;
    document.body.appendChild(ui);

    const tooltip = document.createElement('div');
    tooltip.id = 'tw-tooltip-card';
    document.body.appendChild(tooltip);
    
    document.getElementById('tw-ui-close-btn').addEventListener('click', closeUI);
    backdrop.addEventListener('click', closeUI);
    
    function globalKeyHandler(e) {
        if (e.key === 'Escape') { closeUI(); return; }
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
        const key = e.key.toLowerCase();
        if (activeTab === 'overview') {
            if (e.key === 'ArrowRight' || key === 'd') {
                e.preventDefault(); e.stopPropagation();
                if (currentPage < totalPages) renderOverviewPage(currentPage + 1);
            } else if (e.key === 'ArrowLeft' || key === 'a') {
                e.preventDefault(); e.stopPropagation();
                if (currentPage > 1) renderOverviewPage(currentPage - 1);
            }
        }
    }
    document.addEventListener('keydown', globalKeyHandler, true);

    setTimeout(() => ui.classList.add('show'), 10);

    let allVillages = [];
    let villagesById = {};
    let unitConfigs = [];
    let currentPage = 1;
    let totalPages = 1;
    let activeTab = 'overview';
    const itemsPerPage = 10;
    let counterSummaryData = null;
    let selectedCatKey = null;

    const unitSpeedMinutes = {
        spy: 9, light: 10, heavy: 11, axe: 18, sword: 22,
        spear: 18, archer: 18, marcher: 10, ram: 30, catapult: 30,
        knight: 10, snob: 35
    };

    const defaultUnitPop = {
        spear: 1, sword: 1, axe: 1, archer: 1, spy: 2,
        light: 4, marcher: 5, heavy: 6, ram: 5, catapult: 8,
        knight: 10, snob: 100, militia: 0
    };

    const unitNamesPt = {
        spear: 'Lanceiros', sword: 'Espadachins', axe: 'Víkings',
        archer: 'Arqueiros', spy: 'Batedores', light: 'Cavalaria Leve',
        marcher: 'Arq. a Cavalo', heavy: 'Cavalaria Pesada',
        ram: 'Aríetes', catapult: 'Catapultas', knight: 'Paladino',
        snob: 'Nobres', militia: 'Milícia'
    };

    const farmCapacities = [
        240, 281, 329, 386, 452, 530, 622, 729, 854, 1002, 1174, 1376, 1613, 
        1891, 2216, 2598, 3045, 3569, 4183, 4904, 5748, 6737, 7896, 9255, 
        10848, 12715, 14904, 17469, 20476, 24000
    ];

    function getFarmLevel(maxPop) {
        if (maxPop >= 24000) return 30;
        let closestLvl = 1, minDiff = Infinity;
        for (let i = 0; i < farmCapacities.length; i++) {
            let diff = Math.abs(farmCapacities[i] - maxPop);
            if (diff < minDiff) { minDiff = diff; closestLvl = i + 1; }
        }
        return closestLvl;
    }

    const outputCategories = {
        'Full Train Nuke': { group: 'Nobres', desc: 'Full Train Nukes', criteria: [{ unit: 'snob', minpop: 400 }, { unit: 'offense', minpop: 19600 }] },
        'Full Defense Train': { group: 'Nobres', desc: 'Full Defense Trains', criteria: [{ unit: 'snob', minpop: 400 }, { unit: 'defense', minpop: 19600 }] },
        'Other Nobles': { group: 'Nobres', desc: 'Outros c/ Nobres', criteria: [{ unit: 'snob', minpop: 100 }, { unit: 'defense', maxpop: 19600 }, { unit: 'offense', maxpop: 19600 }] },
        
        'Full Nuke': { group: 'Ataque', desc: 'Full Nukes (20k+)', criteria: [{ unit: 'snob', maxpop: 100 }, { unit: 'offense', minpop: 20000 }] },
        'Semi Nuke': { group: 'Ataque', desc: '3/4 Nukes (15k-20k)', criteria: [{ unit: 'snob', maxpop: 100 }, { unit: 'offense', minpop: 15000, maxpop: 20000 }] },
        'Half Nuke': { group: 'Ataque', desc: '1/2 Nukes (10k-15k)', criteria: [{ unit: 'snob', maxpop: 100 }, { unit: 'offense', minpop: 10000, maxpop: 15000 }] },
        'Quarter Nuke': { group: 'Ataque', desc: '1/4 Nukes (5k-10k)', criteria: [{ unit: 'snob', maxpop: 100 }, { unit: 'offense', minpop: 5000, maxpop: 10000 }] },
        'Cat Nuke': { group: 'Ataque', desc: 'Catapult Nukes', criteria: [{ unit: 'snob', maxpop: 100 }, { unit: 'catapult', minpop: 800 }, { unit: 'offense', minpop: 20000 }] },
        
        'Full Defense': { group: 'Defesa', desc: 'Full Defesa (20k+)', criteria: [{ unit: 'snob', maxpop: 100 }, { unit: 'defense', minpop: 20000 }] },
        'Semi Defense': { group: 'Defesa', desc: '3/4 Defesa (15k-20k)', criteria: [{ unit: 'snob', maxpop: 100 }, { unit: 'defense', minpop: 15000, maxpop: 20000 }] },
        'Half Defense': { group: 'Defesa', desc: '1/2 Defesa (10k-15k)', criteria: [{ unit: 'snob', maxpop: 100 }, { unit: 'defense', minpop: 10000, maxpop: 15000 }] },
        'Quarter Defense': { group: 'Defesa', desc: '1/4 Defesa (5k-10k)', criteria: [{ unit: 'snob', maxpop: 100 }, { unit: 'defense', minpop: 5000, maxpop: 10000 }] },
        
        'Full Scout': { group: 'Exploração', desc: 'Full Scouts (20k+)', criteria: [{ unit: 'snob', maxpop: 100 }, { unit: 'spy', minpop: 20000 }] },
        'Semi Scout': { group: 'Exploração', desc: '3/4 Scouts (15k-20k)', criteria: [{ unit: 'snob', maxpop: 100 }, { unit: 'spy', minpop: 15000, maxpop: 20000 }] },
        'Half Scout': { group: 'Exploração', desc: '1/2 Scouts (10k-15k)', criteria: [{ unit: 'snob', maxpop: 100 }, { unit: 'spy', minpop: 10000, maxpop: 15000 }] },
        'Quarter Scout': { group: 'Exploração', desc: '1/4 Scouts (5k-10k)', criteria: [{ unit: 'snob', maxpop: 100 }, { unit: 'spy', minpop: 5000, maxpop: 10000 }] },
        
        'Other': { group: 'Outras', desc: 'Em Desenvolvimento (<5k)', criteria: [{ unit: 'snob', maxpop: 100 }, { unit: 'spy', maxpop: 5000 }, { unit: 'defense', maxpop: 5000 }, { unit: 'offense', maxpop: 5000 }] }
    };

    const defUnits = ['spear', 'sword', 'heavy', 'catapult', 'archer', 'militia'];
    const offUnits = ['axe', 'light', 'ram', 'catapult', 'marcher'];

    function calcDistance(coordA, coordB) {
        const [x1, y1] = coordA.split('|').map(Number);
        const [x2, y2] = coordB.split('|').map(Number);
        return Math.hypot(x2 - x1, y2 - y1);
    }

    function formatDuration(totalSeconds) {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = Math.floor(totalSeconds % 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    async function loadGlobalData() {
        try {
            const baseUrl = game_data.link_base_pure;
            
            const [resUnits, resProd, resAtaque, resDefesa] = await Promise.all([
                fetch(baseUrl + 'overview_villages&mode=units&type=complete&group=0&page=-1').then(r => r.text()),
                fetch(baseUrl + 'overview_villages&mode=prod&group=0&page=-1').then(r => r.text()),
                fetch(baseUrl + 'overview_villages&mode=units&type=complete&group=67279&page=-1').then(r => r.text()).catch(() => ''),
                fetch(baseUrl + 'overview_villages&mode=units&type=complete&group=67280&page=-1').then(r => r.text()).catch(() => '')
            ]);

            const parser = new DOMParser();
            const dU = parser.parseFromString(resUnits, 'text/html');
            const dP = parser.parseFromString(resProd, 'text/html');

            const extractIds = (html) => {
                const ids = new Set();
                const doc = parser.parseFromString(html, 'text/html');
                doc.querySelectorAll('a[href*="village="]').forEach(a => {
                    const match = a.href.match(/village=(\d+)/);
                    if (match) ids.add(match[1]);
                });
                return ids;
            };

            const ataqueIds = extractIds(resAtaque);
            const defesaIds = extractIds(resDefesa);

            const farmMap = {};
            dP.querySelectorAll('#production_table tbody tr').forEach(tr => {
                const anchor = tr.querySelector('a[href*="village="]');
                if (!anchor) return;
                const vId = anchor.href.match(/village=(\d+)/)[1];
                
                tr.querySelectorAll('td').forEach(td => {
                    const txt = td.textContent.trim();
                    if (/^\d+\/\d+$/.test(txt) && !td.querySelector('a')) {
                        const [pop, max] = txt.split('/').map(n => parseInt(n, 10));
                        const perc = ((pop / max) * 100).toFixed(1);
                        farmMap[vId] = { txt, perc, lvl: getFarmLevel(max), color: perc >= 95 ? '#ff5555' : perc >= 80 ? '#ffa500' : '#55ff55' };
                    }
                });
            });

            const unitsTable = dU.querySelector('#units_table');
            if (!unitsTable) throw new Error("A tabela de tropas não foi encontrada.");

            const headers = Array.from(unitsTable.querySelectorAll('thead th')).filter(th => th.querySelector('img[src*="unit_"]'));
            
            unitConfigs = headers.map(th => {
                const img = th.querySelector('img');
                let uName = '';
                const match = img.src.match(/unit_([a-z0-9_]+)/i);
                if (match) uName = match[1];

                const isMilitia = img.src.includes('militia');
                const isHidden = th.classList.contains('hidden') || th.style.display === 'none' || isMilitia;
                return { name: uName, src: img.src, isHidden: isHidden };
            });

            allVillages = [];
            villagesById = {};
            const summary = { totalPop: 0, totalCount: 0, units: {}, categories: {} };
            
            unitConfigs.forEach(u => { if (u.name) summary.units[u.name] = { count: 0, pop: 0, src: u.src }; });
            Object.keys(outputCategories).forEach(cat => summary.categories[cat] = { count: 0, coords: [], villageIds: [] });

            Array.from(unitsTable.querySelectorAll('tbody')).forEach(tb => {
                const anchor = tb.querySelector('a[href*="village="]');
                if (!anchor) return;
                
                const vId = anchor.href.match(/village=(\d+)/)[1];
                const vName = (tb.querySelector('.quickedit-label') || anchor).textContent.trim();
                const coordsMatch = vName.match(/(\d+\|\d+)/);
                const coords = coordsMatch ? coordsMatch[1] : '';

                const rows = Array.from(tb.querySelectorAll('tr'));
                let totalRow = rows.find(tr => tr.querySelector('td') && tr.querySelector('td').textContent.trim().toLowerCase() === 'total');
                if (!totalRow) totalRow = rows[rows.length - 1];

                const unitCells = Array.from(totalRow.querySelectorAll('td.unit-item'));
                if (unitCells.length === 0) return;

                const villageTroops = [];
                const troopsDict = {};
                const vTotals = { defense: 0, offense: 0, spy: 0, snob: 0, catapult: 0 };

                headers.forEach((th, i) => {
                    const u = unitConfigs[i];
                    const cell = unitCells[i];
                    let count = 0;

                    if (cell && !cell.classList.contains('hidden')) {
                        count = parseInt(cell.textContent.replace(/\./g, '').trim(), 10) || 0;
                    }

                    if (!u.isHidden) villageTroops.push(count);
                    troopsDict[u.name] = count;

                    if (u.name && summary.units[u.name]) {
                        const popTotal = count * (defaultUnitPop[u.name] || 1);
                        summary.units[u.name].count += count;
                        summary.units[u.name].pop += popTotal;
                        summary.totalCount += count;
                        summary.totalPop += popTotal;

                        if (defUnits.includes(u.name)) vTotals.defense += popTotal;
                        if (offUnits.includes(u.name)) vTotals.offense += popTotal;
                        if (u.name === 'spy') vTotals.spy += popTotal;
                        if (u.name === 'snob') vTotals.snob += popTotal;
                        if (u.name === 'catapult') vTotals.catapult += popTotal;
                    }
                });

                for (const [catName, catData] of Object.entries(outputCategories)) {
                    let valid = true;
                    for (const crit of catData.criteria) {
                        const val = vTotals[crit.unit] || 0;
                        if (crit.minpop !== undefined && val < crit.minpop) valid = false;
                        if (crit.maxpop !== undefined && val >= crit.maxpop) valid = false;
                    }
                    if (valid) {
                        summary.categories[catName].count++;
                        summary.categories[catName].villageIds.push(vId);
                        if (coords) summary.categories[catName].coords.push(coords);
                    }
                }

                const rowClass = ataqueIds.has(vId) ? 'tw-row-ataque' : (defesaIds.has(vId) ? 'tw-row-defesa' : '');
                const vObj = { 
                    id: vId, name: vName, coords, troops: villageTroops, troopsDict, rowClass,
                    farm: farmMap[vId] || { txt: 'N/A', perc: 0, color: '#888', lvl: '?' } 
                };
                allVillages.push(vObj);
                villagesById[vId] = vObj;
            });

            counterSummaryData = summary;
            totalPages = Math.ceil(allVillages.length / itemsPerPage);

            document.getElementById('tw-tabs-bar').style.display = 'flex';
            document.getElementById('btn-tab-overview').onclick = () => switchTab('overview');
            document.getElementById('btn-tab-counter').onclick = () => switchTab('counter');

            switchTab('overview');

        } catch (err) {
            document.getElementById('tw-ui-title').innerHTML = '❌ Erro Crítico';
            document.getElementById('tw-ui-content').innerHTML = `<div style="color:#ff5555; text-align:center; padding:30px;">${err.message}</div>`;
        }
    }

    function switchTab(tab) {
        activeTab = tab;
        document.getElementById('btn-tab-overview').classList.toggle('active', tab === 'overview');
        document.getElementById('btn-tab-counter').classList.toggle('active', tab === 'counter');
        
        if (tab === 'overview') {
            document.getElementById('tw-ui-title').innerHTML = `📊 Visão Geral (${allVillages.length} aldeias)`;
            renderOverviewPage(currentPage);
        } else {
            document.getElementById('tw-ui-title').innerHTML = '⚔️ Contador & Planeador Tático';
            renderCounterTab();
        }
    }

    function renderOverviewPage(page) {
        currentPage = page;
        totalPages = Math.ceil(allVillages.length / itemsPerPage) || 1;
        const start = (page - 1) * itemsPerPage;
        const currentVillages = allVillages.slice(start, start + itemsPerPage);

        let html = `
            <div class="tw-tab-content active">
                <div class="tw-ov-container">
                    <table class="tw-table">
                        <thead>
                            <tr>
                                <th style="text-align:left; min-width: 220px;">Aldeia</th>
                                <th style="min-width: 150px;">Fazenda</th>`;
        unitConfigs.forEach(u => {
            if (!u.isHidden) html += `<th><img src="${u.src}" style="filter: drop-shadow(0 2px 2px rgba(0,0,0,0.5));"></th>`;
        });
        html += `           </tr>
                        </thead>
                        <tbody>`;

        currentVillages.forEach(v => {
            html += `<tr class="${v.rowClass}">
                <td style="text-align:left; font-weight:bold; color:#7fbfff;">
                    <a href="/game.php?village=${v.id}&screen=overview" target="_blank" style="color:#7fbfff; text-decoration:none;">${v.name}</a>
                </td>
                <td>
                    <div style="font-weight:bold; color:${v.farm.color}; font-size:12px;">
                        <span style="color:#aaa; font-weight:normal; margin-right:4px;">Nv. ${v.farm.lvl} •</span>${v.farm.txt} (${v.farm.perc}%)
                    </div>
                    <div class="tw-farm-bar-bg"><div class="tw-farm-bar" style="width:${v.farm.perc}%; background-color:${v.farm.color};"></div></div>
                </td>`;
            v.troops.forEach(t => {
                const styleClass = t === 0 ? 'tw-zero' : 'tw-val';
                html += `<td class="${styleClass}">${t.toLocaleString('pt-PT')}</td>`;
            });
            html += '</tr>';
        });
        
        html += `       </tbody>
                    </table>
                </div>
                <div class="tw-pagination">
                    <button class="tw-btn-page" id="tw-btn-prev" ${currentPage === 1 ? 'disabled' : ''}>&#8592; Anterior (A / ◄)</button>
                    <span style="font-weight:bold; color:#a8a095; font-size:13px;">Página ${currentPage} de ${totalPages}</span>
                    <button class="tw-btn-page" id="tw-btn-next" ${currentPage === totalPages ? 'disabled' : ''}>Próxima (D / ►) &#8594;</button>
                </div>
            </div>
        `;
        document.getElementById('tw-ui-content').innerHTML = html;
        if (document.getElementById('tw-btn-prev')) document.getElementById('tw-btn-prev').onclick = () => { if (currentPage > 1) renderOverviewPage(currentPage - 1); };
        if (document.getElementById('tw-btn-next')) document.getElementById('tw-btn-next').onclick = () => { if (currentPage < totalPages) renderOverviewPage(currentPage + 1); };
    }

    function updateTargetCalculations() {
        if (!selectedCatKey) return;
        const catObj = counterSummaryData.categories[selectedCatKey];
        const targetInput = document.getElementById('tw-target-coord');
        const unitSelect = document.getElementById('tw-target-unit');
        const box = document.getElementById('tw-coords-output');
        const label = document.getElementById('tw-coords-label');
        
        const target = targetInput ? targetInput.value.trim() : '';
        const unit = unitSelect ? unitSelect.value : 'ram';
        const isTargetValid = /^\d{3}\|\d{3}$/.test(target);

        let lines = [];
        let listWithDist = [];

        if (isTargetValid) {
            listWithDist = catObj.villageIds.map(vId => {
                const v = villagesById[vId];
                const dist = v.coords ? calcDistance(v.coords, target) : 999;
                const baseMin = unitSpeedMinutes[unit] || 30;
                const totalSeconds = dist * baseMin * 60;
                return { v, dist, timeStr: formatDuration(totalSeconds) };
            });

            listWithDist.sort((a, b) => a.dist - b.dist);
            lines = listWithDist.map(item => `${item.v.coords} - ${item.dist.toFixed(1)} campos (${item.timeStr})`);
            label.innerHTML = `Alvo: <b style="color:#7fbfff;">${target}</b> | ${outputCategories[selectedCatKey].desc} (${catObj.coords.length})`;
        } else {
            lines = [catObj.coords.join(' ')];
            listWithDist = catObj.villageIds.map(vId => ({ v: villagesById[vId], dist: null, timeStr: '' }));
            label.innerHTML = `Coordenadas: <b style="color:#fff;">${outputCategories[selectedCatKey].desc}</b> (${catObj.coords.length})`;
        }

        box.value = lines.join('\n');
        renderVillageCards(listWithDist);
    }

    function renderVillageCards(villageItems) {
        const container = document.getElementById('tw-villages-card-container');
        if (!container) return;

        if (!villageItems || villageItems.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        const countSpan = document.getElementById('tw-vlist-count');
        if (countSpan) countSpan.innerText = `(${villageItems.length})`;

        const listDiv = document.getElementById('tw-vlist-items');
        let html = '';

        villageItems.forEach(item => {
            const v = item.v;
            const distInfo = item.dist !== null ? `<span style="color:#aaa; font-size:11px;">${item.dist.toFixed(1)}c • ${item.timeStr}</span>` : `<span style="color:${v.farm.color}; font-size:11px;">Nv.${v.farm.lvl} (${v.farm.perc}%)</span>`;
            
            html += `
                <div class="tw-v-item" data-vid="${v.id}">
                    <a href="/game.php?village=${v.id}&screen=overview" target="_blank">${v.name}</a>
                    ${distInfo}
                </div>
            `;
        });

        listDiv.innerHTML = html;

        listDiv.querySelectorAll('.tw-v-item').forEach(el => {
            el.addEventListener('mouseenter', (e) => {
                const vid = el.getAttribute('data-vid');
                const v = villagesById[vid];
                if (!v) return;

                let tipHtml = `
                    <div class="tw-tip-title">${v.name}</div>
                    <div style="font-size:11px; margin-bottom:6px; color:${v.farm.color}; font-weight:bold;">
                        Fazenda: Nv. ${v.farm.lvl} • ${v.farm.txt} (${v.farm.perc}%)
                    </div>
                    <div class="tw-tip-grid">
                `;

                unitConfigs.forEach(u => {
                    if (u.name && !u.isHidden) {
                        const qtd = v.troopsDict[u.name] || 0;
                        const qtdColor = qtd > 0 ? '#fff' : '#555';
                        tipHtml += `
                            <div class="tw-tip-item">
                                <span style="display:flex; align-items:center; gap:4px; color:#aaa;">
                                    <img src="${u.src}" style="width:14px; height:14px;"> ${unitNamesPt[u.name] || u.name}:
                                </span>
                                <b style="color:${qtdColor};">${qtd.toLocaleString('pt-PT')}</b>
                            </div>
                        `;
                    }
                });

                tipHtml += `</div>`;
                tooltip.innerHTML = tipHtml;
                tooltip.classList.add('show');
            });

            el.addEventListener('mousemove', (e) => {
                const x = e.clientX + 15;
                const y = e.clientY + 15;
                
                const maxX = window.innerWidth - 240;
                const maxY = window.innerHeight - tooltip.offsetHeight - 20;

                tooltip.style.left = `${Math.min(x, maxX)}px`;
                tooltip.style.top = `${Math.min(y, maxY)}px`;
            });

            el.addEventListener('mouseleave', () => {
                tooltip.classList.remove('show');
            });
        });
    }

    function renderCounterTab() {
        const s = counterSummaryData;
        const playerPts = parseInt(game_data.player.points.replace(/\./g, ''), 10) || 1;
        const ratio = (s.totalPop / playerPts).toFixed(2);

        const groups = { 'Nobres': [], 'Ataque': [], 'Defesa': [], 'Exploração': [], 'Outras': [] };
        for (const [key, val] of Object.entries(outputCategories)) {
            groups[val.group].push({ key, desc: val.desc, count: s.categories[key].count, coords: s.categories[key].coords });
        }

        let html = `
            <div class="tw-tab-content active">
                <div class="tw-counter-grid">
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        <div class="tw-card" style="margin-bottom:0;">
                            <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:8px;">
                                <span>Jogador: <b style="color:#fff;">${game_data.player.name}</b></span>
                                <span>Rácio Tropas/Pontos: <b style="color:#7fbfff;">${ratio}</b></span>
                            </div>
                            <div style="font-size:12px; color:#aaa;">
                                População Total em Tropas: <b style="color:#55ff55;">${s.totalPop.toLocaleString('pt-PT')}</b>
                            </div>
                        </div>

                        <div class="tw-card" style="margin-bottom:0; background:#181b1d;">
                            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
                                <div style="display:flex; align-items:center; gap:6px;">
                                    <span style="font-size:12px; font-weight:bold; color:#e5c07b;">🎯 Alvo Inimigo:</span>
                                    <input type="text" id="tw-target-coord" class="tw-target-input" placeholder="xxx|yyy" maxlength="7">
                                </div>
                                <div style="display:flex; align-items:center; gap:6px;">
                                    <span style="font-size:12px; color:#aaa;">Unidade:</span>
                                    <select id="tw-target-unit" class="tw-target-select">
                                        <option value="ram" selected>Aríete / Catapulta (30m)</option>
                                        <option value="snob">Nobre (35m)</option>
                                        <option value="axe">Viking / Lanceiro (18m)</option>
                                        <option value="sword">Espadachim (22m)</option>
                                        <option value="light">Cav. Leve (10m)</option>
                                        <option value="heavy">Cav. Pesada (11m)</option>
                                        <option value="spy">Batedor (9m)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div class="tw-card" style="flex-grow:1; margin-bottom:0; overflow-y:auto;">`;

        for (const [grpTitle, items] of Object.entries(groups)) {
            html += `<div class="tw-card-title">${grpTitle}</div>
                     <table style="width:100%; font-size:13px; margin-bottom:12px;">`;
            items.forEach(it => {
                const countStyle = it.count > 0 ? 'color:#55ff55; font-weight:bold;' : 'color:#555;';
                html += `<tr>
                    <td style="padding:3px 0;">
                        <a href="javascript:void(0);" class="tw-category-link" data-cat="${it.key}">» ${it.desc}</a>
                    </td>
                    <td style="text-align:right; ${countStyle}">${it.count}</td>
                </tr>`;
            });
            html += `</table>`;
        }

        html += `       </div>
                        <div class="tw-card" style="margin-bottom:0;">
                            <div class="tw-card-title">
                                <span id="tw-coords-label">Coordenadas: (Clica numa categoria acima)</span>
                                <button class="tw-btn-copy" id="tw-btn-copy-coords">Copiar</button>
                            </div>
                            <textarea id="tw-coords-output" class="tw-coords-box" readonly placeholder="Clica numa categoria para calcular as distâncias e exportar..."></textarea>
                        </div>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:10px; overflow-y:auto; padding-right:5px;">
                        <div class="tw-card" style="margin-bottom:0;">
                            <div class="tw-card-title">Contagem Total por Unidade</div>
                            <table style="width:100%; font-size:13px; border-collapse: collapse;">
                                <thead>
                                    <tr style="color:#888; border-bottom:1px solid #333;">
                                        <th style="text-align:left; padding-bottom:6px;">Unidade</th>
                                        <th style="text-align:right; padding-bottom:6px;">Quantidade</th>
                                        <th style="text-align:right; padding-bottom:6px;">População</th>
                                    </tr>
                                </thead>
                                <tbody>`;
        
        unitConfigs.forEach(u => {
            const uData = s.units[u.name];
            if (!uData) return;
            const countClass = uData.count > 0 ? 'color:#fff; font-weight:bold;' : 'color:#555;';
            const label = unitNamesPt[u.name] || u.name;
            html += `<tr style="border-bottom:1px solid #2a2d30;">
                <td style="padding:6px 0; text-align:left; display:flex; align-items:center; gap:8px;">
                    <img src="${u.src}" style="filter: drop-shadow(0 1px 1px rgba(0,0,0,0.5));"> <span>${label}</span>
                </td>
                <td style="text-align:right; ${countClass}">${uData.count.toLocaleString('pt-PT')}</td>
                <td style="text-align:right; color:#a8a095;">${uData.pop.toLocaleString('pt-PT')}</td>
            </tr>`;
        });

        html += `               </tbody>
                            </table>
                        </div>

                        <div class="tw-card" id="tw-villages-card-container" style="display:none; margin-bottom:0; flex-grow:1;">
                            <div class="tw-card-title">
                                <span>🏰 Aldeias do Grupo Selecionado <span id="tw-vlist-count" style="color:#7fbfff; font-weight:normal;"></span></span>
                                <small style="color:#888; font-weight:normal; font-size:11px;">Pousa o rato para ver tropas</small>
                            </div>
                            <div class="tw-v-list" id="tw-vlist-items"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('tw-ui-content').innerHTML = html;

        document.querySelectorAll('.tw-category-link').forEach(link => {
            link.onclick = (e) => {
                selectedCatKey = e.currentTarget.getAttribute('data-cat');
                updateTargetCalculations();
            };
        });

        document.getElementById('tw-target-coord').oninput = updateTargetCalculations;
        document.getElementById('tw-target-unit').onchange = updateTargetCalculations;

        document.getElementById('tw-btn-copy-coords').onclick = () => {
            const box = document.getElementById('tw-coords-output');
            if (!box.value) return;
            
            const rawText = box.value;
            const matchedCoords = rawText.match(/\d{3}\|\d{3}/g);
            if (!matchedCoords || matchedCoords.length === 0) return;

            const targetInput = document.getElementById('tw-target-coord');
            const targetVal = targetInput ? targetInput.value.trim() : '';

            let finalCoords = matchedCoords;
            if (rawText.includes(' - ') && /^\d{3}\|\d{3}$/.test(targetVal)) {
                finalCoords = matchedCoords.filter(c => c !== targetVal || rawText.startsWith(c));
            }

            const cleanCoordsStr = finalCoords.join(' ');

            navigator.clipboard.writeText(cleanCoordsStr).then(() => {
                const btn = document.getElementById('tw-btn-copy-coords');
                btn.innerText = 'Copiado!';
                btn.style.color = '#55ff55';
                setTimeout(() => {
                    btn.innerText = 'Copiar';
                    btn.style.color = '#7fbfff';
                }, 1500);
            });
        };
    }

    loadGlobalData();
})();
