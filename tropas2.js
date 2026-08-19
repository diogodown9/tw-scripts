(async function () {
    const uiId = 'tw-dark-ui-v2';
    if (document.getElementById(uiId)) {
        document.getElementById(uiId).remove();
        return;
    }

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
        <div id="tw-ui-content" style="text-align:center; font-size:14px; color:#a8a095;">A extrair HTML da aldeia...</div>
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

        // --- 1. GRUPOS (Totalmente blindado) ---
        let grps = [];
        const mainContent = dO.querySelector('#content_value') || dO.body;
        mainContent.querySelectorAll('a[href*="mode=groups"]').forEach(a => {
            // Rejeita TUDO o que for barra rápida, menus ou barras de navegação superior
            if (a.closest('.quickbar_item') || a.closest('#quickbar_outer') || a.closest('#quickbar_inner') || a.closest('#header_info') || a.closest('#menu_row')) return;
            
            const t = a.textContent.replace(/[\[\]]/g, '').trim();
            if (t && !['+', '>', 'editar', 'edit', 'adicionar', 'gerir'].includes(t.toLowerCase())) {
                if (!grps.includes(t)) grps.push(t);
            }
        });
        const grpTxt = grps.length > 0 ? grps.join(', ') : 'Sem grupo';

        // --- 2. TROPAS TOTAIS (Mapeamento Matemático por Índice) ---
        let tHtml = '';
        const $t = $(dU).find('#units_table');
        
        if ($t.length === 0) {
            tHtml = '<div style="grid-column:1/-1;color:#ffaaaa;text-align:center;">Tabela não encontrada. Confirmas a Conta Premium ativa?</div>';
        } else {
            const hdrs = [];
            $t.find('thead th img[src*="unit"]').each((_, img) => {
                const src = $(img).attr('src');
                const match = src.match(/unit_([a-z_]+)\.png/);
                if (match) hdrs.push({ name: match[1], src: src });
            });

            // Encontrar o bloco de linhas EXATO da aldeia atual
            let $tb = null;
            $t.find('tbody').each(function() {
                // Procura a tag data-id (a mais fiável de todo o TW)
                if ($(this).find(`.village_anchor[data-id="${vId}"]`).length > 0) {
                    $tb = $(this); return false;
                }
                // Fallback 1: Link URL
                let hrefMatch = false;
                $(this).find('a').each(function() {
                    let href = $(this).attr('href');
                    if (href && href.match(new RegExp('village=' + vId + '(&|$)'))) hrefMatch = true;
                });
                if (hrefMatch) { $tb = $(this); return false; }
            });

            if (!$tb || $tb.length === 0) {
                tHtml = '<div style="grid-column:1/-1;color:#ffaaaa;text-align:center;">Aldeia não encontrada na tabela de tropas.</div>';
            } else {
                // A linha Total é sempre a última linha do bloco (tbody)
                let $totalRow = $tb.find('tr').filter(function() { return $(this).text().toLowerCase().includes('total'); }).last();
                if (!$totalRow.length) $totalRow = $tb.find('tr').last();

                if ($totalRow && $totalRow.length) {
                    let foundUnits = false;
                    let tds = $totalRow.find('td');
                    let startIndex = 0;
                    
                    // Se o texto "Total" estiver dentro do primeiro TD em vez de um TH, avançamos 1 índice.
                    if ($totalRow.find('th').length === 0 && tds.eq(0).text().toLowerCase().includes('total')) {
                        startIndex = 1;
                    }

                    // Apanhar apenas as células com números, correspondentes aos cabeçalhos
                    let uCells = tds.slice(startIndex);
                    uCells.each((i, td) => {
                        if (i < hdrs.length) {
                            const c = parseInt($(td).text().replace(/\./g, '').trim()) || 0;
                            foundUnits = true;
                            // Design Upgrade: Tropas que tens a 0 ficam semitransparentes para leres a tabela muito mais depressa
                            const isZero = c === 0;
                            const opacity = isZero ? '0.35' : '1';
                            const color = isZero ? '#666' : '#fff';
                            tHtml += `
                                <div class="tw-ui-unit" style="opacity: ${opacity};">
                                    <img src="${hdrs[i].src}" alt="${hdrs[i].name}">
                                    <div style="color: ${color};">${c}</div>
                                </div>
                            `;
                        }
                    });

                    if (!foundUnits) tHtml = '<div style="grid-column:1/-1;color:#ffaaaa;text-align:center;">As células de tropas estão com um formato irreconhecível.</div>';
                } else {
                    tHtml = '<div style="grid-column:1/-1;color:#ffaaaa;text-align:center;">Linha Total não encontrada.</div>';
                }
            }
        }

        // --- 3. INJETAR HTML NA JANELA ---
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
        document.getElementById('tw-ui-title').innerText = '❌ Erro de Execução';
        document.getElementById('tw-ui-content').innerHTML = `<div style="color:#ff5555; text-align:left; font-size:12px;">${err.message}</div>`;
        console.error('[Script Tropas]', err);
    }
})();
