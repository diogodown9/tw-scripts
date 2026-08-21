(async function () {
    const uiId = 'tw-master-ui';
    
    function closeUI() {
        if(document.getElementById(uiId)) document.getElementById(uiId).remove();
        if(document.getElementById(`${uiId}-backdrop`)) document.getElementById(`${uiId}-backdrop`).remove();
        if(document.getElementById(`${uiId}-style`)) document.getElementById(`${uiId}-style`).remove();
        document.removeEventListener('keydown', globalKeyHandler, true);
    }
    
    if (document.getElementById(uiId)) { closeUI(); return; }

    const style = document.createElement('style');
    style.id = `${uiId}-style`;
    style.innerHTML = `
        #${uiId}-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.75); z-index: 99998; backdrop-filter: blur(4px); animation: fadeIn 0.2s ease; }
        #${uiId} { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #181a1b; color: #e8e6e3; border: 1px solid #3a3e41; border-radius: 12px; z-index: 99999; padding: 25px; box-shadow: 0 15px 50px rgba(0,0,0,0.9); width: max-content; min-width: 800px; max-width: 95vw; max-height: 90vh; display: flex; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; opacity: 0; transition: all 0.2s ease-out; }
        #${uiId}.show { opacity: 1; }
        .tw-ui-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #3a3e41; padding-bottom: 15px; margin-bottom: 20px; flex-shrink: 0; }
        .tw-ui-title { font-size: 18px; font-weight: bold; color: #fff; display: flex; align-items: center; gap: 10px; }
        .tw-ui-close { cursor: pointer; color: #888; font-size: 28px; line-height: 20px; transition: 0.2s; user-select: none; }
        .tw-ui-close:hover { color: #ff5555; transform: scale(1.15); }
        .tw-ov-container { overflow-y: auto; flex-grow: 1; padding-right: 5px; }
        .tw-ov-container::-webkit-scrollbar { width: 6px; }
        .tw-ov-container::-webkit-scrollbar-track { background: #1a1a1a; }
        .tw-ov-container::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
        
        .tw-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .tw-table th, .tw-table td { padding: 10px 8px; border-bottom: 1px solid #2a2d30; text-align: center; vertical-align: middle; }
        .tw-table th { 
            background-color: #222426 !important; 
            background-image: none !important; 
            position: sticky; top: 0; z-index: 2; 
            color: #a8a095 !important; 
            border: none !important;
            border-bottom: 2px solid #111 !important;
        }
        .tw-table tbody tr { transition: background 0.1s; }
        .tw-table tbody tr:hover { background: #26292c !important; }
        
        /* Marcações de Grupos Fortes */
        .tw-row-ataque { background-color: rgba(255, 60, 60, 0.18) !important; }
        .tw-row-defesa { background-color: rgba(60, 255, 60, 0.18) !important; }

        .tw-zero { color: #666; opacity: 0.25; font-weight: normal; }
        .tw-val { color: #fff; font-weight: bold; }
        .tw-farm-bar-bg { background: #111; height: 4px; border-radius: 2px; margin-top: 4px; overflow: hidden; width: 100%; }
        .tw-farm-bar { height: 100%; }
        
        .tw-pagination { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; border-top: 1px solid #3a3e41; padding-top: 15px; flex-shrink: 0; }
        .tw-btn-page { background: #2a2d30; color: #e8e6e3; border: 1px solid #444; padding: 6px 14px; border-radius: 6px; cursor: pointer; transition: 0.2s; font-weight: bold; }
        .tw-btn-page:hover:not(:disabled) { background: #3a3e41; border-color: #7fbfff; color: #fff; }
        .tw-btn-page:disabled { opacity: 0.3; cursor: not-allowed; }
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
            <div class="tw-ui-title" id="tw-ui-title"><div class="tw-spinner"></div> A compilar império e grupos...</div>
            <span class="tw-ui-close" id="tw-ui-close-btn">&times;</span>
        </div>
        <div id="tw-ui-content"><div style="text-align:center; padding: 40px; color:#888;">A carregar dados de tropas, fazenda e grupos...</div></div>
    `;
    document.body.appendChild(ui);
    
    document.getElementById('tw-ui-close-btn').addEventListener('click', closeUI);
    backdrop.addEventListener('click', closeUI);
    
    // Gestor de Teclado com captura estrita (fase de captura = true) para anular o TW
    function globalKeyHandler(e) {
        if (e.key === 'Escape') {
            closeUI();
            return;
        }
        
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

        const key = e.key.toLowerCase();
        if (e.key === 'ArrowRight' || key === 'd') {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            if (currentPage < totalPages) renderPage(currentPage + 1);
        } else if (e.key === 'ArrowLeft' || key === 'a') {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            if (currentPage > 1) renderPage(currentPage - 1);
        }
    }
    document.addEventListener('keydown', globalKeyHandler, true);

    setTimeout(() => ui.classList.add('show'), 10);

    let allVillages = [];
    let unitConfigs = [];
    let currentPage = 1;
    let totalPages = 1;
    const itemsPerPage = 10;

    // Função auxiliar para extrair IDs de qualquer página do TW de forma infalível por URL
    function extractVillageIds(doc) {
        const ids = new Set();
        doc.querySelectorAll('a[href*="village="]').forEach(a => {
            const match = a.href.match(/village=(\d+)/);
            if (match) ids.add(match[1]);
        });
        return ids;
    }

    async function loadGlobalOverview() {
        try {
            const baseUrl = game_data.link_base_pure;
            
            const [resUnits, resProd, resAtaque, resDefesa] = await Promise.all([
                fetch(baseUrl + 'overview_villages&mode=units&type=complete&group=0&page=-1').then(r => r.text()),
                fetch(baseUrl + 'overview_villages&mode=prod&group=0&page=-1').then(r => r.text()),
                fetch(baseUrl + 'overview_villages&mode=groups&type=dynamic&group=67279&page=-1').then(r => r.text()),
                fetch(baseUrl + 'overview_villages&mode=groups&type=dynamic&group=67280&page=-1').then(r => r.text())
            ]);
            
            const parser = new DOMParser();
            const dU = parser.parseFromString(resUnits, 'text/html');
            const dP = parser.parseFromString(resProd, 'text/html');
            const dAtq = parser.parseFromString(resAtaque, 'text/html');
            const dDef = parser.parseFromString(resDefesa, 'text/html');

            const ataqueIds = extractVillageIds(dAtq);
            const defesaIds = extractVillageIds(dDef);

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
                        let color = '#55ff55';
                        if (perc >= 95) color = '#ff5555';
                        else if (perc >= 80) color = '#ffa500';
                        
                        farmMap[vId] = { txt, perc, color };
                    }
                });
            });

            const unitsTable = dU.querySelector('#units_table');
            if (!unitsTable) throw new Error("Tabela geral de tropas não encontrada.");

            const headers = Array.from(unitsTable.querySelectorAll('thead th')).filter(th => th.querySelector('img[src*="unit_"]'));
            
            unitConfigs = headers.map(th => {
                const img = th.querySelector('img');
                const isMilitia = img.src.includes('militia');
                const isHidden = th.classList.contains('hidden') || th.style.display === 'none' || isMilitia;
                return { src: img.src, isHidden: isHidden };
            });

            allVillages = [];
            Array.from(unitsTable.querySelectorAll('tbody')).forEach(tb => {
                const anchor = tb.querySelector('a[href*="village="]');
                if (!anchor) return;
                const match = anchor.href.match(/village=(\d+)/);
                if (!match) return;
                const vId = match[1];
                
                const nameEl = tb.querySelector('.quickedit-label');
                const vName = nameEl ? nameEl.textContent.trim() : 'Aldeia';

                const rows = Array.from(tb.querySelectorAll('tr'));
                let totalRow = rows.find(tr => tr.querySelector('td') && tr.querySelector('td').textContent.trim().toLowerCase() === 'total');
                if (!totalRow) totalRow = rows[rows.length - 1];

                const unitCells = Array.from(totalRow.querySelectorAll('td.unit-item'));
                if (unitCells.length === 0) return;

                const troops = [];
                headers.forEach((th, i) => {
                    if (unitConfigs[i].isHidden) return;
                    const cell = unitCells[i];
                    if (cell && !cell.classList.contains('hidden')) {
                        troops.push(parseInt(cell.textContent.replace(/\./g, '').trim()) || 0);
                    } else {
                        troops.push(0);
                    }
                });

                const farm = farmMap[vId] || { txt: 'N/A', perc: 0, color: '#888' };
                
                let rowClass = '';
                if (ataqueIds.has(vId)) rowClass = 'tw-row-ataque';
                else if (defesaIds.has(vId)) rowClass = 'tw-row-defesa';

                allVillages.push({ name: vName, farm, troops, rowClass });
            });

            totalPages = Math.ceil(allVillages.length / itemsPerPage);
            renderPage(1);

        } catch (err) {
            document.getElementById('tw-ui-title').innerHTML = '❌ Erro de Leitura';
            document.getElementById('tw-ui-content').innerHTML = `<div style="color:#ff5555; text-align:center;">${err.message}</div>`;
        }
    }

    function renderPage(page) {
        currentPage = page;
        totalPages = Math.ceil(allVillages.length / itemsPerPage);
        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const currentVillages = allVillages.slice(start, end);

        let html = `
            <div class="tw-ov-container">
                <table class="tw-table">
                    <thead>
                        <tr>
                            <th style="text-align:left; min-width: 220px;">Aldeia</th>
                            <th style="min-width: 120px;">Fazenda</th>`;
        unitConfigs.forEach(u => {
            if (!u.isHidden) html += `<th><img src="${u.src}" style="filter: drop-shadow(0 2px 2px rgba(0,0,0,0.5));"></th>`;
        });
        html += `       </tr>
                    </thead>
                    <tbody>`;

        currentVillages.forEach(v => {
            html += `<tr class="${v.rowClass}">
                <td style="text-align:left; font-weight:bold; color:#7fbfff;">${v.name}</td>
                <td>
                    <div style="font-weight:bold; color:${v.farm.color}; font-size:12px;">${v.farm.txt} (${v.farm.perc}%)</div>
                    <div class="tw-farm-bar-bg"><div class="tw-farm-bar" style="width:${v.farm.perc}%; background-color:${v.farm.color};"></div></div>
                </td>`;
            v.troops.forEach(t => {
                const styleClass = t === 0 ? 'tw-zero' : 'tw-val';
                html += `<td class="${styleClass}">${t}</td>`;
            });
            html += '</tr>';
        });
        
        html += `   </tbody>
                </table>
            </div>
            <div class="tw-pagination">
                <button class="tw-btn-page" id="tw-btn-prev" ${currentPage === 1 ? 'disabled' : ''}>&#8592; Anterior (A / ◄)</button>
                <span style="font-weight:bold; color:#a8a095; font-size:13px;">Página ${currentPage} de ${totalPages}</span>
                <button class="tw-btn-page" id="tw-btn-next" ${currentPage === totalPages ? 'disabled' : ''}>Próxima (D / ►) &#8594;</button>
            </div>
        `;

        document.getElementById('tw-ui-title').innerHTML = '🌍 Overview Geral do Império';
        document.getElementById('tw-ui-content').innerHTML = html;

        const btnPrev = document.getElementById('tw-btn-prev');
        const btnNext = document.getElementById('tw-btn-next');
        if(btnPrev) btnPrev.onclick = () => { if (currentPage > 1) renderPage(currentPage - 1); };
        if(btnNext) btnNext.onclick = () => { if (currentPage < totalPages) renderPage(currentPage + 1); };
    }

    loadGlobalOverview();

})();
