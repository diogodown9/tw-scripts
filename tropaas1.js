(async function () {
    const uiId = 'tw-master-ui';
    
    function closeUI() {
        if (document.getElementById(uiId)) document.getElementById(uiId).remove();
        if (document.getElementById(`${uiId}-backdrop`)) document.getElementById(`${uiId}-backdrop`).remove();
        if (document.getElementById(`${uiId}-style`)) document.getElementById(`${uiId}-style`).remove();
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
        .tw-table th { 
            background-color: #222426 !important; 
            position: sticky; top: 0; z-index: 2; 
            color: #a8a095 !important; 
            border-bottom: 2px solid #111 !important;
        }
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
        
        .tw-counter-grid { display: grid; grid-template-columns: 1.15fr 1fr; gap: 20px; height: 100%; overflow-y: auto; }
        .tw-card { background: #1c1f21; border: 1px solid #2e3235; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px; }
        .tw-card-title { font-weight: bold; color: #e5c07b; margin-bottom: 8px; font-size: 13px; border-bottom: 1px solid #2e3235; padding-bottom: 4px; }
        .tw-category-link { color: #7fbfff; text-decoration: none; cursor: pointer; font-weight: 500; }
        .tw-category-link:hover { text-decoration: underline; color: #fff; }
        .tw-coords-box { width: 100%; height: 65px; background: #111; border: 1px solid #3a3e41; color: #98c379; font-family: monospace; font-size: 12px; padding: 8px; border-radius: 6px; box-sizing: border-box; resize: none; }
        
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
            <button class="tw-tab-btn" id="btn-tab-counter">⚔️ Contador & Grupos de Tropas</button>
        </div>
        <div id="tw-ui-content" style="flex-grow:1; display:flex; flex-direction:column; overflow:hidden;">
            <div style="text-align:center; padding: 40px; color:#888;">A carregar dados do mundo e aldeias...</div>
        </div>
    `;
    document.body.appendChild(ui);
    
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
    let unitConfigs = [];
    let currentPage = 1;
    let totalPages = 1;
    let activeTab = 'overview';
    const itemsPerPage = 10;
    let counterSummaryData = null;

    // População oficial por unidade no TW
    const defaultUnitPop = {
        spear: 1, sword: 1, axe: 1, archer: 1, spy: 2,
        light: 4, marcher: 5, heavy: 6, ram: 5, catapult: 8,
        knight: 10, snob: 100, militia: 0
    };

    const unitNamesPt = {
        spear: 'Lanceiros', sword: 'Espadachins', axe: 'Víkings',
        archer: 'Arqueiros', spy: 'Batedores', light: 'Cavalaria Leve',
        marcher: 'Arqueiros a Cavalo', heavy: 'Cavalaria Pesada',
        ram: 'Aríetes', catapult: 'Catapultas', knight: 'Paladino',
        snob: 'Nobres', militia: 'Milícia'
    };

    const farmCapacities = [
        240, 281, 329, 386, 452, 530, 622, 729, 854, 1002,
        1174, 1376, 1613, 1891, 2216, 2598, 3045, 3569, 4183, 4904,
        5748, 6737, 7896, 9255, 10848, 12715, 14904, 17469, 20476, 24000
    ];

    function getFarmLevel(maxPop) {
        let baseMax = maxPop;
        if (baseMax === 26400 || baseMax > 24000) return 30;
        let closestLvl = 1, minDiff = Infinity;
        for (let i = 0; i < farmCapacities.length; i++) {
            let diff = Math.abs(farmCapacities[i] - baseMax);
            if (diff < minDiff) { minDiff = diff; closestLvl = i + 1; }
        }
        return closestLvl;
    }

    function extractIds(htmlText) {
        const ids = new Set();
        const doc = new DOMParser().parseFromString(htmlText, 'text/html');
        doc.querySelectorAll('a[href*="village="]').forEach(a => {
            const match = a.href.match(/village=(\d+)/);
            if (match) ids.add(match[1]);
        });
        return ids;
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

    function parseUnitType(src) {
        const m = src.match(/unit_([a-z_]+)\.png/i);
        return m ? m[1].toLowerCase() : '';
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

            const ataqueIds = extractIds(resAtaque);
            const defesaIds = extractIds(resDefesa);

            const farmMap = {};
            dP.querySelectorAll('#production_table tbody tr').forEach(tr => {
                const anchor = tr.querySelector('a[href*="village="]');
                if (!anchor) return;
                const match = anchor.href.match(/village=(\d+)/);
                if (!match) return;
                const vId = match[1];
                
                tr.querySelectorAll('td').forEach(td => {
                    const txt = td.textContent.trim();
                    if (/^\d+\/\d+$/.test(txt) && !td.querySelector('a')) {
                        const parts = txt.split('/');
                        const pop = parseInt(parts[0], 10);
                        const max = parseInt(parts[1], 10);
                        const perc = ((pop / max) * 100).toFixed(1);
                        const lvl = getFarmLevel(max);
                        
                        let color = '#55ff55';
                        if (perc >= 95) color = '#ff5555';
                        else if (perc >= 80) color = '#ffa500';
                        
                        farmMap[vId] = { txt, perc, color, lvl };
                    }
                });
            });

            const unitsTable = dU.querySelector('#units_table');
            if (!unitsTable) throw new Error("Tabela de tropas não encontrada.");

            const rawHeaders = Array.from(unitsTable.querySelectorAll('thead th')).filter(th => th.querySelector('img[src*="unit_"]'));
            
            unitConfigs = [];
            rawHeaders.forEach(th => {
                const img = th.querySelector('img');
                const src = img.src;
                const uName = parseUnitType(src);
                const isMilitia = uName === 'militia';
                const isHidden = th.classList.contains('hidden') || th.style.display === 'none' || isMilitia;
                
                unitConfigs.push({ name: uName, src: src, isHidden: isHidden });
            });

            allVillages = [];
            
            const summary = {
                totalPop: 0,
                totalCount: 0,
                units: {},
                categories: {}
            };
            
            unitConfigs.forEach(u => {
                if (u.name) summary.units[u.name] = { count: 0, pop: 0, src: u.src };
            });

            Object.keys(outputCategories).forEach(cat => {
                summary.categories[cat] = { count: 0, coords: [] };
            });

            Array.from(unitsTable.querySelectorAll('tbody')).forEach(tb => {
                const anchor = tb.querySelector('a[href*="village="]');
                if (!anchor) return;
                const match = anchor.href.match(/village=(\d+)/);
                if (!match) return;
                const vId = match[1];
                
                const nameEl = tb.querySelector('.quickedit-label');
                const vName = nameEl ? nameEl.textContent.trim() : 'Aldeia';

                const coordMatch = vName.match(/(\d+\|\d+)/);
                const coords = coordMatch ? coordMatch[1] : '';

                const rows = Array.from(tb.querySelectorAll('tr'));
                let totalRow = rows.find(tr => tr.querySelector('td') && tr.querySelector('td').textContent.trim().toLowerCase() === 'total');
                if (!totalRow) totalRow = rows[rows.length - 1];

                const unitCells = Array.from(totalRow.querySelectorAll('td.unit-item'));
                if (unitCells.length === 0) return;

                const villageTroops = [];
                const vTotals = { defense: 0, offense: 0, spy: 0, snob: 0, catapult: 0 };

                unitConfigs.forEach((u, i) => {
                    const uName = u.name;
                    const cell = unitCells[i];
                    const count = (cell && !cell.classList.contains('hidden')) ? (parseInt(cell.textContent.replace(/\./g, '').trim(), 10) || 0) : 0;
                    
                    if (!u.isHidden) villageTroops.push(count);

                    if (uName && summary.units[uName]) {
                        const popCost = defaultUnitPop[uName] || 1;
                        const popTotal = count * popCost;

                        summary.units[uName].count += count;
                        summary.units[uName].pop += popTotal;

                        summary.totalCount += count;
                        summary.totalPop += popTotal;

                        if (defUnits.includes(uName)) vTotals.defense += popTotal;
                        if (offUnits.includes(uName)) vTotals.offense += popTotal;
                        if (uName === 'spy') vTotals.spy += popTotal;
                        if (uName === 'snob') vTotals.snob += popTotal;
                        if (uName === 'catapult') vTotals.catapult += popTotal;
                    }
                });

                // Classificação da aldeia
                for (const [catName, catData] of Object.entries(outputCategories)) {
                    let valid = true;
                    for (const crit of catData.criteria) {
                        const val = vTotals[crit.unit] || 0;
                        if (crit.minpop !== undefined && val < crit.minpop) valid = false;
                        if (crit.maxpop !== undefined && val >= crit.maxpop) valid = false;
                    }
                    if (valid) {
                        summary.categories[catName].count++;
                        if (coords) summary.categories[catName].coords.push(coords);
                    }
                }

                const farm = farmMap[vId] || { txt: 'N/A', perc: 0, color: '#888', lvl: '?' };
                
                let rowClass = '';
                if (ataqueIds.has(vId)) rowClass = 'tw-row-ataque';
                else if (defesaIds.has(vId)) rowClass = 'tw-row-defesa';

                allVillages.push({ id: vId, name: vName, coords, farm, troops: villageTroops, rowClass });
            });

            counterSummaryData = summary;
            totalPages = Math.ceil(allVillages.length / itemsPerPage);

            document.getElementById('tw-tabs-bar').style.display = 'flex';
            document.getElementById('btn-tab-overview').onclick = () => switchTab('overview');
            document.getElementById('btn-tab-counter').onclick = () => switchTab('counter');

            switchTab('overview');

        } catch (err) {
            document.getElementById('tw-ui-title').innerHTML = '❌ Erro de Leitura';
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
            document.getElementById('tw-ui-title').innerHTML = '⚔️ Contador de Tropas & Grupos';
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
                <td style="text-align:left; font-weight:bold; color:#7fbfff;">${v.name}</td>
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

        const btnPrev = document.getElementById('tw-btn-prev');
        const btnNext = document.getElementById('tw-btn-next');
        if (btnPrev) btnPrev.onclick = () => { if (currentPage > 1) renderOverviewPage(currentPage - 1); };
        if (btnNext) btnNext.onclick = () => { if (currentPage < totalPages) renderOverviewPage(currentPage + 1); };
    }

    function renderCounterTab() {
        const s = counterSummaryData;
        const playerPts = parseInt(game_data.player.points, 10) || 1;
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
                            <div class="tw-card-title" id="tw-coords-label">Coordenadas: (Clica numa categoria acima)</div>
                            <textarea id="tw-coords-output" class="tw-coords-box" readonly placeholder="Clica numa categoria para exportar as coordenadas..."></textarea>
                        </div>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:10px; overflow-y:auto;">
                        <div class="tw-card">
                            <div class="tw-card-title">Contagem Total por Unidade</div>
                            <table style="width:100%; font-size:13px;">
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
            html += `<tr>
                <td style="padding:4px 0; text-align:left; display:flex; align-items:center; gap:8px;">
                    <img src="${u.src}"> <span>${label}</span>
                </td>
                <td style="text-align:right; ${countClass}">${uData.count.toLocaleString('pt-PT')}</td>
                <td style="text-align:right; color:#a8a095;">${uData.pop.toLocaleString('pt-PT')}</td>
            </tr>`;
        });

        html += `               </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('tw-ui-content').innerHTML = html;

        document.querySelectorAll('.tw-category-link').forEach(link => {
            link.onclick = (e) => {
                const catKey = e.currentTarget.getAttribute('data-cat');
                const catObj = s.categories[catKey];
                const desc = outputCategories[catKey].desc;
                
                const label = document.getElementById('tw-coords-label');
                const box = document.getElementById('tw-coords-output');
                
                label.innerHTML = `Coordenadas: <b>${desc}</b> (${catObj.coords.length})`;
                box.value = catObj.coords.join(' ');
                box.focus();
                box.select();
            };
        });
    }

    loadGlobalData();

})();
