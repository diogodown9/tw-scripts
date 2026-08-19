(async function () {
    const uiId = 'tw-dark-ui-v4';
    if (document.getElementById(uiId)) {
        document.getElementById(uiId).remove();
        return;
    }

    // Injetar CSS
    const style = document.createElement('style');
    style.innerHTML = `
        #${uiId} {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #181a1b; color: #e8e6e3; border: 1px solid #3a3e41;
            border-radius: 12px; z-index: 99999; padding: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.8); width: 90%; max-width: 420px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            opacity: 0; transition: opacity 0.3s ease-out;
        }
        #${uiId}.show { opacity: 1; }
        .tw-ui-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #3a3e41; padding-bottom: 12px; margin-bottom: 16px; font-size: 16px; font-weight: bold; }
        .tw-ui-close { cursor: pointer; color: #ff5555; font-size: 20px; transition: 0.2s; line-height: 1; }
        .tw-ui-close:hover { color: #ff2222; transform: scale(1.2); }
        .tw-ui-row { margin-bottom: 8px; font-size: 14px; display: flex; justify-content: space-between; }
        .tw-ui-label { color: #a8a095; font-weight: bold; }
        .tw-ui-val { color: #e8e6e3; text-align: right; }
        .tw-ui-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(45px, 1fr)); gap: 8px; margin-top: 15px; border-top: 1px solid #3a3e41; padding-top: 15px; }
        .tw-ui-unit { background: #222426; border: 1px solid #3a3e41; border-radius: 8px; padding: 8px 4px; text-align: center; transition: 0.2s; }
        .tw-ui-unit:hover { background: #2a2d30; transform: translateY(-2px); border-color: #555; }
        .tw-ui-unit img { margin-bottom: 6px; }
        .tw-ui-unit div { font-weight: bold; font-size: 13px; }
        .tw-spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.3); border-radius: 50%; border-top-color: #fff; animation: spin 0.8s linear infinite; margin-right: 8px; vertical-align: middle; }
        @keyframes spin { to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);

    const ui = document.createElement('div');
    ui.id = uiId;
    ui.innerHTML = `
        <div class="tw-ui-header">
            <span id="tw-ui-title"><div class="tw-spinner"></div> A sincronizar...</span>
            <span class="tw-ui-close" onclick="document.getElementById('${uiId}').remove()">&times;</span>
        </div>
        <div id="tw-ui-content" style="text-align:center; font-size:14px; color:#a8a095;">A extrair os dados da aldeia...</div>
    `;
    document.body.appendChild(ui);
    
    setTimeout(() => ui.classList.add('show'), 10);
    document.addEventListener('keydown', function(e) { if(e.key === 'Escape' && document.getElementById(uiId)) document.getElementById(uiId).remove(); }, {once:true});

    try {
        const vId = game_data.village.id;
        const vName = game_data.village.name;
        const fLvl = game_data.village.buildings.farm;
        const p = game_data.village.pop;
        const pMax = game_data.village.pop_max;
        const pPerc = ((p / pMax) * 100).toFixed(1);
        let pColor = '#55ff55';
        if (pPerc >= 95) pColor = '#ff5555';
        else if (pPerc >= 80) pColor = '#ffa500';

        const urlOverview = game_data.link_base_pure + 'overview';
        const urlUnits = game_data.link_base_pure + 'overview_villages&mode=units&type=complete';

        const [resOverview, resUnits] = await Promise.all([
            fetch(urlOverview).then(r => r.text()),
            fetch(urlUnits).then(r => r.text())
        ]);

        const parser = new DOMParser();
        const dO = parser.parseFromString(resOverview, 'text/html');
        const dU = parser.parseFromString(resUnits, 'text/html');

        // --- 1. GRUPOS (Lógica de Procura Inteligente Baseada em Sets) ---
        let grps = new Set();
        let widget = Array.from(dO.querySelectorAll('.widget_container, table.vis')).find(el => {
            const txt = el.textContent.toLowerCase();
            return txt.includes('afiliação por grupos') || txt.includes('grupos') || txt.includes('groups');
        });
        
        const searchArea = widget || dO.querySelector('#content_value') || dO.body;
        
        searchArea.querySelectorAll('a[href*="group="]').forEach(a => {
            // Ignorar os atalhos da quickbar ou menus padrão
            if (a.closest('.quickbar_item') || a.closest('#quickbar_outer') || a.closest('#header_info') || a.closest('#menu_row') || a.closest('.menu_column')) return;
            
            let t = a.textContent.replace(/[\[\]]/g, '').trim();
            let tLower = t.toLowerCase();
            // Ignorar texto de botões de configuração
            if (t && t.length > 0 && !['+', '>', 'editar', 'edit', 'adicionar', 'gerir', '» editar'].includes(tLower) && !tLower.includes('editar')) {
                grps.add(t);
            }
        });
        const grpTxt = grps.size > 0 ? Array.from(grps).join(', ') : 'Sem grupo';

        // --- 2. TROPAS TOTAIS (Estrutura Exata do HTML que enviaste) ---
        const unitsTable = dU.querySelector('#units_table');
        if (!unitsTable) throw new Error("Tabela de tropas não encontrada (Verifica Conta Premium).");

        // Guardar a referência do cabeçalho
        const headers = Array.from(unitsTable.querySelectorAll('thead th')).filter(th => th.querySelector('img[src*="unit_"]'));
        
        // Encontrar o tbody do block desta aldeia
        const tbodys = Array.from(unitsTable.querySelectorAll('tbody'));
        const villageTbody = tbodys.find(tb => tb.querySelector(`a[href*="village=${vId}"]`) || tb.querySelector(`[data-id="${vId}"]`));

        if (!villageTbody) throw new Error("Aldeia não encontrada na tabela de tropas.");

        // Encontrar a linha Total
        const rows = Array.from(villageTbody.querySelectorAll('tr'));
        let totalRow = rows.find(tr => {
            const td = tr.querySelector('td');
            return td && td.textContent.trim().toLowerCase() === 'total';
        });
        if (!totalRow) totalRow = rows[rows.length - 1];

        // Mapear apenas pelas células "unit-item" que o teu HTML revelou!
        const unitCells = Array.from(totalRow.querySelectorAll('td.unit-item'));
        if (unitCells.length === 0) throw new Error("Células 'unit-item' não encontradas na linha da aldeia.");

        let tHtml = '';
        let foundUnits = false;

        // Fazer correspondência rigorosa índice-a-índice
        headers.forEach((th, i) => {
            const imgNode = th.querySelector('img[src*="unit_"]');
            if (!imgNode) return;

            const cell = unitCells[i];
            if (cell) {
                // IGNORA as células invisíveis/inexistentes (milícias, etc.) graças à classe 'hidden'
                if (th.classList.contains('hidden') || cell.classList.contains('hidden') || th.style.display === 'none') return;

                foundUnits = true;
                const src = imgNode.src;
                const nameMatch = src.match(/unit_([a-z_]+)\.png/);
                const name = nameMatch ? nameMatch[1] : 'unidade';
                
                const count = parseInt(cell.textContent.replace(/\./g, '').trim()) || 0;
                const opacity = count === 0 ? '0.35' : '1';
                const color = count === 0 ? '#666' : '#fff';
                
                tHtml += `
                    <div class="tw-ui-unit" style="opacity: ${opacity};">
                        <img src="${src}" alt="${name}">
                        <div style="color: ${color};">${count}</div>
                    </div>
                `;
            }
        });

        if (!foundUnits) throw new Error("Falha no alinhamento. Nenhuma tropa válida lida.");

        // --- 3. RENDERIZAR INTERFACE ---
        document.getElementById('tw-ui-title').innerHTML = `📊 ${vName}`;
        document.getElementById('tw-ui-content').innerHTML = `
            <div style="text-align:left;">
                <div class="tw-ui-row">
                    <span class="tw-ui-label">📁 Grupos:</span>
                    <span class="tw-ui-val" style="color:#7fbfff;">${grpTxt}</span>
                </div>
                <div class="tw-ui-row">
                    <span class="tw-ui-label">🌾 Fazenda:</span>
                    <span class="tw-ui-val">Nível ${fLvl}</span>
                </div>
                <div class="tw-ui-row">
                    <span class="tw-ui-label">👥 Ocupação:</span>
                    <span class="tw-ui-val">${p} / ${pMax} (<span style="color:${pColor};">${pPerc}%</span>)</span>
                </div>
            </div>
            <div class="tw-ui-grid">
                ${tHtml}
            </div>
        `;
    } catch (err) {
        document.getElementById('tw-ui-title').innerText = '❌ Erro de Leitura';
        document.getElementById('tw-ui-content').innerHTML = `<div style="color:#ff5555; text-align:center; font-size:13px; padding-top:10px;">${err.message}</div>`;
        console.error('[Script Tropas]', err);
    }
})();
