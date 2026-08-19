(async function () {
    const uiId = 'tw-dark-ui-v3';
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

    // Criar UI base
    const ui = document.createElement('div');
    ui.id = uiId;
    ui.innerHTML = `
        <div class="tw-ui-header">
            <span id="tw-ui-title"><div class="tw-spinner"></div> A sincronizar...</span>
            <span class="tw-ui-close" onclick="document.getElementById('${uiId}').remove()">&times;</span>
        </div>
        <div id="tw-ui-content" style="text-align:center; font-size:14px; color:#a8a095;">A analisar HTML estrutural...</div>
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

        // --- 1. GRUPOS (Procura direcionada ao Widget) ---
        let grps = [];
        let groupWidget = null;
        
        // Encontra especificamente a tabela que diz "Afiliação por grupos"
        dO.querySelectorAll('table.vis').forEach(tbl => {
            if (tbl.textContent.toLowerCase().includes('grupos') || tbl.textContent.toLowerCase().includes('groups')) {
                groupWidget = tbl;
            }
        });

        if (groupWidget) {
            groupWidget.querySelectorAll('a[href*="group="]').forEach(a => {
                let t = a.textContent.replace(/[\[\]]/g, '').trim();
                let tLower = t.toLowerCase();
                // Ignora links de edição e gestão
                if (t && !['+', '>', 'editar', 'edit', 'adicionar', 'gerir', '» editar'].includes(tLower) && !tLower.includes('editar')) {
                    if (!grps.includes(t)) grps.push(t);
                }
            });
        }
        const grpTxt = grps.length > 0 ? grps.join(', ') : 'Sem grupo';

        // --- 2. TROPAS TOTAIS (Índice Cego) ---
        const unitsTable = dU.querySelector('#units_table');
        if (!unitsTable) {
            throw new Error("Tabela de tropas não encontrada (Verifica Conta Premium).");
        }

        // Mapear quantas tropas o mundo tem
        const hdrs = [];
        unitsTable.querySelectorAll('thead th img[src*="unit_"]').forEach(img => {
            const match = img.src.match(/unit_([a-z_]+)\.png/);
            if (match) hdrs.push({ name: match[1], src: img.src });
        });

        const rows = Array.from(unitsTable.querySelectorAll('tbody tr'));
        let startIdx = -1;
        
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].querySelector(`a[href*="village=${vId}"]`)) {
                startIdx = i;
                break;
            }
        }

        if (startIdx === -1) {
            throw new Error("Aldeia não encontrada na tabela de tropas.");
        }

        // Determinar o fim do bloco desta aldeia
        let endIdx = startIdx + 1;
        while (endIdx < rows.length && !rows[endIdx].querySelector('a[href*="village="]')) {
            endIdx++;
        }

        // O Total é infalivelmente a última linha
        const totalRow = rows[endIdx - 1];
        let tHtml = '';

        if (totalRow) {
            const tds = Array.from(totalRow.querySelectorAll('td'));
            
            // Ignorar a 1ª coluna (texto "Total") e alinhar o resto matematicamente aos headers
            let startIndex = 1;
            if (tds[0] && !tds[0].textContent.toLowerCase().includes('total')) {
                startIndex = tds.length - hdrs.length; // Fallback extremo
                if (startIndex < 0) startIndex = 0;
            }

            const unitCells = tds.slice(startIndex, startIndex + hdrs.length);
            
            let foundUnits = false;
            for (let i = 0; i < hdrs.length; i++) {
                if (unitCells[i]) {
                    foundUnits = true;
                    // Limpar todos os pontos nos milhares e garantir que é um número
                    const count = parseInt(unitCells[i].textContent.replace(/\./g, '').trim()) || 0;
                    
                    const opacity = count === 0 ? '0.35' : '1';
                    const color = count === 0 ? '#666' : '#fff';
                    
                    tHtml += `
                        <div class="tw-ui-unit" style="opacity: ${opacity};">
                            <img src="${hdrs[i].src}" alt="${hdrs[i].name}">
                            <div style="color: ${color};">${count}</div>
                        </div>
                    `;
                }
            }

            if (!foundUnits || tHtml === '') {
                throw new Error("Ocorreu um erro no alinhamento das colunas.");
            }
        } else {
            throw new Error("Linha 'Total' não detetada.");
        }

        // --- 3. FINALIZAR UI ---
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
        document.getElementById('tw-ui-title').innerText = '❌ Erro na Leitura';
        document.getElementById('tw-ui-content').innerHTML = `<div style="color:#ff5555; text-align:center; font-size:13px; padding-top:10px;">${err.message}</div>`;
        console.error('[Script Tropas]', err);
    }
})();
