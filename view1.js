(async function () {
    const uiId = 'tw-master-ui';
    
    // Limpeza rigorosa caso já esteja aberto
    function closeUI() {
        if(document.getElementById(uiId)) document.getElementById(uiId).remove();
        if(document.getElementById(`${uiId}-backdrop`)) document.getElementById(`${uiId}-backdrop`).remove();
        if(document.getElementById(`${uiId}-style`)) document.getElementById(`${uiId}-style`).remove();
        document.removeEventListener('keydown', escListener);
    }
    function escListener(e) { if(e.key === 'Escape') closeUI(); }
    if (document.getElementById(uiId)) { closeUI(); return; }

    // --- 1. CSS PREMIUM (Dark Mode Profissional) ---
    const style = document.createElement('style');
    style.id = `${uiId}-style`;
    style.innerHTML = `
        #${uiId}-backdrop {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.75); z-index: 99998;
            backdrop-filter: blur(4px); animation: fadeIn 0.2s ease;
        }
        #${uiId} {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #181a1b; color: #e8e6e3; border: 1px solid #3a3e41;
            border-radius: 12px; z-index: 99999; padding: 25px;
            box-shadow: 0 15px 50px rgba(0,0,0,0.9); 
            width: max-content; min-width: 440px; max-width: 95vw; max-height: 90vh;
            display: flex; flex-direction: column;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            opacity: 0; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        #${uiId}.show { opacity: 1; }
        
        /* Cabeçalho */
        .tw-ui-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #3a3e41; padding-bottom: 15px; margin-bottom: 20px; flex-shrink: 0; }
        .tw-ui-title { font-size: 18px; font-weight: bold; color: #fff; display: flex; align-items: center; gap: 10px; }
        .tw-ui-controls { display: flex; align-items: center; gap: 15px; }
        .tw-btn-empire { background: #26292c; border: 1px solid #444; color: #7fbfff; padding: 6px 12px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; font-size: 13px; }
        .tw-btn-empire:hover { background: #303438; border-color: #7fbfff; box-shadow: 0 0 8px rgba(127,191,255,0.2); }
        .tw-ui-close { cursor: pointer; color: #888; font-size: 28px; line-height: 20px; transition: 0.2s; user-select: none; }
        .tw-ui-close:hover { color: #ff5555; transform: scale(1.15); }

        /* Estilos da Vista Individual (Fazenda e Grid) */
        .tw-ui-info-card { background: #222426; border: 1px solid #3a3e41; border-radius: 8px; padding: 14px; margin-bottom: 22px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.2); }
        .tw-ui-row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px; }
        .tw-ui-row:last-child { margin-bottom: 0; }
        .tw-ui-progress-bg { background: #111; height: 10px; border-radius: 5px; margin-top: 10px; overflow: hidden; border: 1px solid #333; }
        .tw-ui-progress-bar { height: 100%; transition: width 0.6s; }
        .tw-ui-grid { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
        .tw-ui-unit { flex: 1; min-width: 48px; max-width: 70px; background: #222426; border: 1px solid #3a3e41; border-radius: 8px; padding: 10px 4px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 6px; transition: 0.2s; }
        .tw-ui-unit:hover { background: #2a2d30; transform: translateY(-3px); border-color: #666; box-shadow: 0 4px 10px rgba(0,0,0,0.4); }
        .tw-ui-unit img { max-width: 100%; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.5)); }

        /* Estilos da Tabela Global (Dashboard) */
        .tw-ov-container { overflow-y: auto; flex-grow: 1; padding-right: 5px; }
        .tw-ov-container::-webkit-scrollbar { width: 6px; }
        .tw-ov-container::-webkit-scrollbar-track { background: #1a1a1a; }
        .tw-ov-container::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
        .tw-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .tw-table th, .tw-table td { padding: 10px 8px; border-bottom: 1px solid #2a2d30; text-align: center; }
        .tw-table th { background: #222426; position: sticky; top: 0; z-index: 2; color: #a8a095; }
        .tw-table tbody tr { transition: background 0.1s; }
        .tw-table tbody tr:hover { background: #1e2023; }
        
        /* Badges e Cores Profissionais */
        .tw-badge { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
        .tw-badge.ataque { background: rgba(255, 85, 85, 0.1); color: #ff6b6b; border: 1px solid rgba(255,85,85,0.3); }
        .tw-badge.defesa { background: rgba(85, 255, 85, 0.1); color: #6bff6b; border: 1px solid rgba(85,255,85,0.3); }
        .tw-badge.nenhum { background: rgba(136, 136, 136, 0.1); color: #888; border: 1px solid rgba(136,136,136,0.3); }
        
        .tw-zero { color: #666; opacity: 0.25; font-weight: normal; }
        .tw-val { color: #fff; font-weight: bold; }
        
        /* Paginação */
        .tw-pagination { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; border-top: 1px solid #3a3e41; padding-top: 15px; flex-shrink: 0; }
        .tw-btn-page { background: #2a2d30; color: #e8e6e3; border: 1px solid #444; padding: 6px 14px; border-radius: 6px; cursor: pointer; transition: 0.2s; font-weight: bold; }
        .tw-btn-page:hover:not(:disabled) { background: #3a3e41; border-color: #7fbfff; color: #fff; }
        .tw-btn-page:disabled { opacity: 0.3; cursor: not-allowed; }
        
        .tw-spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.3); border-radius: 50%; border-top-color: #fff; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    `;
    document.head.appendChild(style);

    // --- 2. CRIAR INTERFACE BASE ---
    const backdrop = document.createElement('div');
    backdrop.id = `${uiId}-backdrop`;
    document.body.appendChild(backdrop);

    const ui = document.createElement('div');
    ui.id = uiId;
    ui.innerHTML = `
        <div class="tw-ui-header">
            <div class="tw-ui-title" id="tw-ui-title"><div class="tw-spinner"></div> A analisar aldeia...</div>
            <div class="tw-ui-controls">
                <button class="tw-btn-empire" id="tw-btn-empire" style="display:none;">🌍 Ver Império</button>
                <span class="tw-ui-close" id="tw-ui-close-btn">&times;</span>
            </div>
        </div>
        <div id="tw-ui-content"></div>
    `;
    document.body.appendChild(ui);
    
    document.getElementById('tw-ui-close-btn').addEventListener('click', closeUI);
    backdrop.addEventListener('click', closeUI);
    document.addEventListener('keydown', escListener);

    setTimeout(() => ui.classList.add('show'), 10);

    // --- VARIÁVEIS GLOBAIS DE ESTADO ---
    let globalDataLoaded = false;
    let allVillages = [];
    let unitConfigs = [];
    let currentPage = 1;
    const itemsPerPage = 10;

    // --- 3. LÓGICA 1: CARREGAR ALDEIA INDIVIDUAL ---
    async function loadSingleVillage() {
        try {
            const vId = game_data.village.id;
            const vName = game_data.village.name;
            const fLvl = game_data.village.buildings.farm;
            const p = game_data.village.pop;
            const pMax = game_data.village.pop_max;
            const pPerc = ((p / pMax) * 100).toFixed(1);
            let pColor = pPerc >= 95 ? '#ff5555' : (pPerc >= 80 ? '#ffa500' : '#55ff55');

            // Fetch das tropas com page=-1 para garantir que a aldeia é encontrada
            const urlUnits = game_data.link_base_pure + 'overview_villages&mode=units&type=complete&page=-1';
            const resUnits = await fetch(urlUnits).then(r => r.text());
            
            const parser = new DOMParser();
            const dU = parser.parseFromString(resUnits, 'text/html');

            const unitsTable = dU.querySelector('#units_table');
            if (!unitsTable) throw new Error("Tabela de tropas não encontrada.");

            const headers = Array.from(unitsTable.querySelectorAll('thead th')).filter(th => th.querySelector('img[src*="unit_"]'));
            const tbodys = Array.from(unitsTable.querySelectorAll('tbody'));
            const villageTbody = tbodys.find(tb => tb.querySelector(`[data-id="${vId}"]`));

            if (!villageTbody) throw new Error("A tua aldeia não foi encontrada na lista de tropas.");

            const rows = Array.from(villageTbody.querySelectorAll('tr'));
            let totalRow = rows.find(tr => tr.querySelector('td') && tr.querySelector('td').textContent.trim().toLowerCase() === 'total');
            if (!totalRow) totalRow = rows[rows.length - 1];

            const unitCells = Array.from(totalRow.querySelectorAll('td.unit-item'));
            let tHtml = '';

            headers.forEach((th, i) => {
                const imgNode = th.querySelector('img');
                const cell = unitCells[i];
                if (imgNode && cell && !th.classList.contains('hidden') && !cell.classList.contains('hidden')) {
                    const count = parseInt(cell.textContent.replace(/\./g, '').trim()) || 0;
                    const opacity = count === 0 ? '0.25' : '1';
                    const color = count === 0 ? '#666' : '#fff';
                    
                    tHtml += `
                        <div class="tw-ui-unit" style="opacity: ${opacity};">
                            <img src="${imgNode.src}" alt="unidade">
                            <div style="color: ${color}; font-weight:bold; font-size:14px;">${count}</div>
                        </div>`;
                }
            });

            document.getElementById('tw-ui-title').innerHTML = `📊 ${vName}`;
            document.getElementById('tw-ui-content').innerHTML = `
                <div class="tw-ui-info-card">
                    <div class="tw-ui-row">
                        <span style="color:#a8a095; font-weight:bold;">🌾 Fazenda (Nível ${fLvl})</span>
                        <span style="color:#e8e6e3; font-weight:bold;">${p} / ${pMax} (<span style="color:${pColor};">${pPerc}%</span>)</span>
                    </div>
                    <div class="tw-ui-progress-bg">
                        <div class="tw-ui-progress-bar" style="width: ${pPerc}%; background-color: ${pColor};"></div>
                    </div>
                </div>
                <div style="color:#a8a095; font-size:12px; font-weight:bold; margin-bottom:10px; text-transform:uppercase;">⚔️ Total da Aldeia</div>
                <div class="tw-ui-grid">${tHtml}</div>
            `;
            
            // Mostrar o botão de ver o império
            const btnEmpire = document.getElementById('tw-btn-empire');
            btnEmpire.style.display = 'block';
            btnEmpire.onclick = loadGlobalOverview;

        } catch (err) {
            document.getElementById('tw-ui-title').innerHTML = '❌ Erro';
            document.getElementById('tw-ui-content').innerHTML = `<div style="color:#ff5555; text-align:center;">${err.message}</div>`;
        }
    }

    // --- 4. LÓGICA 2: CARREGAR DASHBOARD GLOBAL ---
    async function loadGlobalOverview() {
        const btnEmpire = document.getElementById('tw-btn-empire');
        btnEmpire.style.display = 'none';
        document.getElementById('tw-ui-title').innerHTML = `<div class="tw-spinner"></div> A compilar tropas...`;
        document.getElementById('tw-ui-content').innerHTML = `<div style="text-align:center; padding: 40px; color:#888;">A carregar dados dos grupos Ataque/Defesa e a cruzar tropas de todas as aldeias...</div>`;
        
        try {
            const baseUrl = game_data.link_base_pure;
            // Fetch em paralelo: Tropas Gerais, Grupo Ataque e Grupo Defesa
            const [resUnits, resAtaque, resDefesa] = await Promise.all([
                fetch(baseUrl + 'overview_villages&mode=units&type=complete&page=-1').then(r => r.text()),
                fetch(baseUrl + 'overview_villages&mode=groups&type=dynamic&group=67279&page=-1').then(r => r.text()),
                fetch(baseUrl + 'overview_villages&mode=groups&type=dynamic&group=67280&page=-1').then(r => r.text())
            ]);

            const parser = new DOMParser();
            const dU = parser.parseFromString(resUnits, 'text/html');
            const dAtq = parser.parseFromString(resAtaque, 'text/html');
            const dDef = parser.parseFromString(resDefesa, 'text/html');

            // Mapear IDs dos Grupos (Usando a classe exata que forneceste)
            const ataqueIds = new Set();
            dAtq.querySelectorAll('.quickedit-vn[data-id]').forEach(el => ataqueIds.add(el.dataset.id));

            const defesaIds = new Set();
            dDef.querySelectorAll('.quickedit-vn[data-id]').forEach(el => defesaIds.add(el.dataset.id));

            // Preparar Leitura das Tropas
            const unitsTable = dU.querySelector('#units_table');
            if (!unitsTable) throw new Error("Tabela geral de tropas não encontrada.");

            const headers = Array.from(unitsTable.querySelectorAll('thead th')).filter(th => th.querySelector('img[src*="unit_"]'));
            unitConfigs = headers.map(th => {
                const img = th.querySelector('img');
                return { src: img.src, isHidden: th.classList.contains('hidden') || th.style.display === 'none' };
            });

            allVillages = [];
            Array.from(unitsTable.querySelectorAll('tbody')).forEach(tb => {
                const anchor = tb.querySelector('.quickedit-vn[data-id]') || tb.querySelector('.village_anchor[data-id]');
                if (!anchor) return;
                
                const vId = anchor.dataset.id;
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

                let badge = '<span class="tw-badge nenhum">-</span>';
                if (ataqueIds.has(vId)) badge = '<span class="tw-badge ataque">Ataque</span>';
                else if (defesaIds.has(vId)) badge = '<span class="tw-badge defesa">Defesa</span>';

                allVillages.push({ name: vName, badge, troops });
            });

            globalDataLoaded = true;
            renderPage(1);

        } catch (err) {
            document.getElementById('tw-ui-title').innerHTML = '❌ Erro no Império';
            document.getElementById('tw-ui-content').innerHTML = `<div style="color:#ff5555; text-align:center;">${err.message}</div>`;
        }
    }

    // --- 5. RENDERIZAÇÃO DA TABELA E PAGINAÇÃO ---
    function renderPage(page) {
        currentPage = page;
        const totalPages = Math.ceil(allVillages.length / itemsPerPage);
        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const currentVillages = allVillages.slice(start, end);

        let html = `
            <div class="tw-ov-container">
                <table class="tw-table">
                    <thead>
                        <tr>
                            <th style="text-align:left; min-width: 220px;">Aldeia</th>
                            <th>Grupo</th>`;
        unitConfigs.forEach(u => {
            if (!u.isHidden) html += `<th><img src="${u.src}" style="filter: drop-shadow(0 2px 2px rgba(0,0,0,0.5));"></th>`;
        });
        html += `       </tr>
                    </thead>
                    <tbody>`;

        currentVillages.forEach(v => {
            html += `<tr>
                <td style="text-align:left; font-weight:bold; color:#7fbfff;">${v.name}</td>
                <td>${v.badge}</td>`;
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
                <button class="tw-btn-page" id="tw-btn-prev" ${currentPage === 1 ? 'disabled' : ''}>&#8592; Anterior</button>
                <span style="font-weight:bold; color:#a8a095; font-size:13px;">Página ${currentPage} de ${totalPages}</span>
                <button class="tw-btn-page" id="tw-btn-next" ${currentPage === totalPages ? 'disabled' : ''}>Próxima &#8594;</button>
            </div>
        `;

        document.getElementById('tw-ui-title').innerHTML = '🌍 Overview Geral do Império';
        document.getElementById('tw-ui-content').innerHTML = html;
        document.getElementById('tw-ui').style.minWidth = '850px'; // Expande a janela horizontalmente

        // Ligar botões de navegação
        const btnPrev = document.getElementById('tw-btn-prev');
        const btnNext = document.getElementById('tw-btn-next');
        if(btnPrev) btnPrev.onclick = () => { if (currentPage > 1) renderPage(currentPage - 1); };
        if(btnNext) btnNext.onclick = () => { if (currentPage < totalPages) renderPage(currentPage + 1); };
    }

    // --- 6. INICIAR SCRIPT ---
    loadSingleVillage();

})();
