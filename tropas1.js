(async function () {
    // --- 1. CONFIGURAÇÃO DA UI (Fluid & Dark Mode) ---
    const uiId = 'tw-dark-ui-v2';
    if (document.getElementById(uiId)) {
        document.getElementById(uiId).remove();
        return;
    }

    // Injetar CSS Moderno
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

    // Construir o esqueleto da janela
    const ui = document.createElement('div');
    ui.id = uiId;
    ui.innerHTML = `
        <div class="tw-ui-header">
            <span id="tw-ui-title"><div class="tw-spinner"></div> A sincronizar...</span>
            <span class="tw-ui-close" onclick="document.getElementById('${uiId}').remove()">&times;</span>
        </div>
        <div id="tw-ui-content" style="text-align:center; font-size:14px; color:#a8a095;">A extrair dados do servidor...</div>
    `;
    document.body.appendChild(ui);
    
    // Animação de entrada suave e fecho com tecla ESC
    setTimeout(() => ui.classList.add('show'), 10);
    document.addEventListener('keydown', function(e) { if(e.key === 'Escape' && document.getElementById(uiId)) document.getElementById(uiId).remove(); }, {once:true});

    // --- 2. EXTRAÇÃO DE DADOS OTIMIZADA ---
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

        // Pedidos simultâneos com async/await (muito mais rápido e fiável)
        const [resOverview, resUnits] = await Promise.all([
            fetch(urlOverview).then(r => r.text()),
            fetch(urlUnits).then(r => r.text())
        ]);

        const parser = new DOMParser();
        const dO = parser.parseFromString(resOverview, 'text/html');
        const dU = parser.parseFromString(resUnits, 'text/html');

        // --- CORREÇÃO 1: GRUPOS ---
        // Agora procura EXCLUSIVAMENTE dentro do quadro principal (#content_value), ignorando a tua Barra Rápida.
        let grps = [];
        const groupLinks = dO.querySelectorAll('#content_value .vis a[href*="mode=groups&group="]');
        groupLinks.forEach(a => {
            const t = a.textContent.replace(/[\[\]]/g, '').trim();
            if (t && !['+', '>', 'editar', 'edit', 'adicionar'].includes(t.toLowerCase())) {
                if (!grps.includes(t)) grps.push(t);
            }
        });
        const grpTxt = grps.length > 0 ? grps.join(', ') : 'Sem grupo';

        // --- CORREÇÃO 2: TROPAS TOTAIS ---
        let tHtml = '';
        const $t = $(dU).find('#units_table');
        
        if ($t.length === 0) {
            tHtml = '<div style="grid-column:1/-1;color:#ffaaaa;padding:10px;text-align:center;">Tabela não encontrada. Tens a Conta Premium ativa?</div>';
        } else {
            // Mapear cabeçalhos (que tropas existem no mundo atual)
            const hdrs = [];
            $t.find('thead th img[src*="unit"]').each((_, img) => {
                const src = $(img).attr('src');
                const match = src.match(/unit_([a-z_]+)\.png/);
                if (match) hdrs.push({ name: match[1], src: src });
            });

            // Encontrar a linha exata que contém a hiperligação da tua aldeia atual
            let $vRow = null;
            $t.find('a[href*="village="]').each(function() {
                const href = $(this).attr('href');
                if (href && (href.includes('village=' + vId + '&') || href.endsWith('village=' + vId))) {
                    $vRow = $(this).closest('tr');
                    return false; // Quebra o loop assim que encontra
                }
            });

            if (!$vRow || $vRow.length === 0) {
                tHtml = '<div style="grid-column:1/-1;color:#ffaaaa;text-align:center;">Aldeia não encontrada na tabela de tropas.</div>';
            } else {
                // Navegar dinamicamente por todas as linhas seguintes até encontrar a próxima aldeia.
                // A última linha desse bloco é SEMPRE a do "Total", independentemente do texto ou de quantas tropas estão em trânsito.
                const $villageBlock = $vRow.nextUntil('tr:has(a[href*="village="])');
                let $totalRow = null;

                // Procurar por segurança a palavra "Total" (caso o layout mude), senão assume a última linha.
                $villageBlock.each(function() {
                    if ($(this).text().toLowerCase().includes('total')) {
                        $totalRow = $(this);
                    }
                });
                
                if (!$totalRow) $totalRow = $villageBlock.last();

                if ($totalRow && $totalRow.length) {
                    let foundUnits = false;
                    $totalRow.find('td.unit-item, td[class*="unit"]').each((i, td) => {
                        const c = parseInt($(td).text().replace(/\./g, '').trim()) || 0;
                        if (hdrs[i]) {
                            foundUnits = true;
                            // UX Optimization: Tropas a zeros ficam mais escuras para facilitar a leitura visual das que realmente existem
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
                    if (!foundUnits) tHtml = '<div style="grid-column:1/-1;color:#ffaaaa;text-align:center;">Erro estrutural ao ler colunas.</div>';
                } else {
                    tHtml = '<div style="grid-column:1/-1;color:#ffaaaa;text-align:center;">Linha de tropas não encontrada para esta aldeia.</div>';
                }
            }
        }

        // --- 3. RENDERIZAR RESULTADO FINAL ---
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
