(async function () {
    const uiId = 'tw-dark-ui-v5';
    
    // Se a interface já estiver aberta, fecha-a
    if (document.getElementById(uiId)) {
        closeUI();
        return;
    }

    // --- 1. INJETAR CSS PREMIUM ---
    const style = document.createElement('style');
    style.id = `${uiId}-style`;
    style.innerHTML = `
        #${uiId}-backdrop {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.65); z-index: 99998;
            backdrop-filter: blur(3px); animation: fadeIn 0.2s ease;
        }
        #${uiId} {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #181a1b; color: #e8e6e3; border: 1px solid #3a3e41;
            border-radius: 12px; z-index: 99999; padding: 24px;
            box-shadow: 0 15px 40px rgba(0,0,0,0.9); width: 92%; max-width: 440px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            opacity: 0; transition: opacity 0.2s ease-out;
        }
        #${uiId}.show { opacity: 1; }
        .tw-ui-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #3a3e41; padding-bottom: 15px; margin-bottom: 20px; }
        .tw-ui-title { font-size: 18px; font-weight: bold; color: #fff; display: flex; align-items: center; gap: 10px;}
        .tw-ui-close { cursor: pointer; color: #888; font-size: 28px; line-height: 20px; transition: all 0.2s; padding: 4px; border-radius: 6px; }
        .tw-ui-close:hover { color: #ff5555; background: rgba(255,85,85,0.1); transform: scale(1.15); }
        .tw-ui-info-card { background: #222426; border: 1px solid #3a3e41; border-radius: 8px; padding: 14px; margin-bottom: 22px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.2); }
        .tw-ui-row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px; }
        .tw-ui-row:last-child { margin-bottom: 0; }
        .tw-ui-label { color: #a8a095; font-weight: bold; }
        .tw-ui-val { color: #e8e6e3; font-weight: bold; }
        .tw-ui-progress-bg { background: #111; height: 10px; border-radius: 5px; margin-top: 10px; overflow: hidden; border: 1px solid #333; }
        .tw-ui-progress-bar { height: 100%; transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1); }
        .tw-ui-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(48px, 1fr)); gap: 10px; }
        .tw-ui-unit { background: #222426; border: 1px solid #3a3e41; border-radius: 8px; padding: 10px 4px; text-align: center; transition: all 0.2s ease; display: flex; flex-direction: column; align-items: center; gap: 6px;}
        .tw-ui-unit:hover { background: #2a2d30; transform: translateY(-3px); border-color: #666; box-shadow: 0 4px 10px rgba(0,0,0,0.4); }
        .tw-ui-unit img { max-width: 100%; height: auto; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.5)); }
        .tw-ui-unit div { font-weight: bold; font-size: 14px; }
        .tw-spinner { display: inline-block; width: 18px; height: 18px; border: 2px solid rgba(255,255,255,.3); border-radius: 50%; border-top-color: #fff; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    `;
    document.head.appendChild(style);

    // --- 2. CRIAR O BACKDROP (Fundo Escuro) E A JANELA ---
    const backdrop = document.createElement('div');
    backdrop.id = `${uiId}-backdrop`;
    backdrop.onclick = closeUI; // Clicar fora fecha a janela
    document.body.appendChild(backdrop);

    const ui = document.createElement('div');
    ui.id = uiId;
    ui.innerHTML = `
        <div class="tw-ui-header">
            <div class="tw-ui-title" id="tw-ui-title"><div class="tw-spinner"></div> A carregar dados...</div>
            <span class="tw-ui-close" onclick="closeUI()" title="Fechar (ESC)">&times;</span>
        </div>
        <div id="tw-ui-content" style="text-align:center; font-size:14px; color:#a8a095; padding: 20px 0;">A extrair tropas em trânsito...</div>
    `;
    document.body.appendChild(ui);
    
    // Animação de entrada
    setTimeout(() => ui.classList.add('show'), 10);
    
    // Função global de fecho (limpa tudo incluindo o CSS e eventos)
    function closeUI() {
        if(document.getElementById(uiId)) document.getElementById(uiId).remove();
        if(document.getElementById(`${uiId}-backdrop`)) document.getElementById(`${uiId}-backdrop`).remove();
        if(document.getElementById(`${uiId}-style`)) document.getElementById(`${uiId}-style`).remove();
        document.removeEventListener('keydown', escListener);
    }
    
    // Fechar com a tecla ESC
    function escListener(e) { if(e.key === 'Escape') closeUI(); }
    document.addEventListener('keydown', escListener);

    // --- 3. EXTRAÇÃO DE DADOS OTIMIZADA ---
    try {
        // Dados locais (não precisam de fetch)
        const vId = game_data.village.id;
        const vName = game_data.village.name;
        const fLvl = game_data.village.buildings.farm;
        const p = game_data.village.pop;
        const pMax = game_data.village.pop_max;
        const pPerc = ((p / pMax) * 100).toFixed(1);
        let pColor = '#55ff55';
        if (pPerc >= 95) pColor = '#ff5555';
        else if (pPerc >= 80) pColor = '#ffa500';

        // Fetch APENAS das tropas (dobro da velocidade do script)
        const urlUnits = game_data.link_base_pure + 'overview_villages&mode=units&type=complete';
        const resUnits = await fetch(urlUnits).then(r => r.text());
        
        const parser = new DOMParser();
        const dU = parser.parseFromString(resUnits, 'text/html');

        const unitsTable = dU.querySelector('#units_table');
        if (!unitsTable) throw new Error("Tabela de tropas não encontrada (Requer Conta Premium ativa).");

        const headers = Array.from(unitsTable.querySelectorAll('thead th')).filter(th => th.querySelector('img[src*="unit_"]'));
        
        const tbodys = Array.from(unitsTable.querySelectorAll('tbody'));
        const villageTbody = tbodys.find(tb => tb.querySelector(`a[href*="village=${vId}"]`) || tb.querySelector(`[data-id="${vId}"]`));

        if (!villageTbody) throw new Error("Aldeia não encontrada na tabela de tropas.");

        const rows = Array.from(villageTbody.querySelectorAll('tr'));
        let totalRow = rows.find(tr => {
            const td = tr.querySelector('td');
            return td && td.textContent.trim().toLowerCase() === 'total';
        });
        if (!totalRow) totalRow = rows[rows.length - 1];

        const unitCells = Array.from(totalRow.querySelectorAll('td.unit-item'));
        if (unitCells.length === 0) throw new Error("Células de tropas não encontradas na linha da aldeia.");

        let tHtml = '';
        let foundUnits = false;

        headers.forEach((th, i) => {
            const imgNode = th.querySelector('img[src*="unit_"]');
            if (!imgNode) return;

            const cell = unitCells[i];
            if (cell) {
                // Ignorar tropas que não existem no mundo
                if (th.classList.contains('hidden') || cell.classList.contains('hidden') || th.style.display === 'none') return;

                foundUnits = true;
                const src = imgNode.src;
                const nameMatch = src.match(/unit_([a-z_]+)\.png/);
                const name = nameMatch ? nameMatch[1] : 'unidade';
                
                const count = parseInt(cell.textContent.replace(/\./g, '').trim()) || 0;
                
                // Melhor contraste para tropas a zeros
                const opacity = count === 0 ? '0.25' : '1';
                const color = count === 0 ? '#555' : '#fff';
                
                tHtml += `
                    <div class="tw-ui-unit" style="opacity: ${opacity};">
                        <img src="${src}" alt="${name}">
                        <div style="color: ${color};">${count}</div>
                    </div>
                `;
            }
        });

        if (!foundUnits) throw new Error("Falha a alinhar as colunas. Nenhuma tropa lida.");

        // --- 4. RENDERIZAÇÃO DA UI COM DASHBOARD ---
        document.getElementById('tw-ui-title').innerHTML = `📊 ${vName}`;
        document.getElementById('tw-ui-content').innerHTML = `
            <div class="tw-ui-info-card">
                <div class="tw-ui-row">
                    <span class="tw-ui-label">🌾 Fazenda (Nível ${fLvl})</span>
                    <span class="tw-ui-val">${p} / ${pMax} (<span style="color:${pColor};">${pPerc}%</span>)</span>
                </div>
                <div class="tw-ui-progress-bg">
                    <div class="tw-ui-progress-bar" style="width: ${pPerc}%; background-color: ${pColor};"></div>
                </div>
            </div>
            <div style="text-align: left; margin-bottom: 12px; color: #a8a095; font-size: 13px; font-weight: bold; padding-left: 4px; text-transform: uppercase; letter-spacing: 0.5px;">⚔️ Total da Aldeia (Incl. em trânsito)</div>
            <div class="tw-ui-grid">
                ${tHtml}
            </div>
        `;
    } catch (err) {
        document.getElementById('tw-ui-title').innerHTML = '❌ Erro de Leitura';
        document.getElementById('tw-ui-content').innerHTML = `
            <div style="background: rgba(255,85,85,0.1); border: 1px solid #ff5555; border-radius: 8px; padding: 15px; color:#ffaaaa; text-align:center; font-size:14px; margin-top:10px;">
                ${err.message}
            </div>
        `;
        console.error('[Script Tropas]', err);
    }
})();
