// Tribal Wars - Pedido de Recursos Final
// Distribui recursos (Painel de transportes compacto e alinhado - Fix Topo)

(function() {
    'use strict';

    // Garante que só corre no Edifício Principal
    if (!window.location.href.includes('&screen=main')) {
        UI.ErrorMessage('Este script só pode ser executado no Edifício Principal.');
        return;
    }

    // ============================================================
    // CONFIGURAÇÃO E CACHE
    // ============================================================
    const MERCHANT_SPEED_TOTAL = 3.529;
    let ownTransportsHTML = '';
    let originalDialogClose = null;
    let isVillagesLoaded = false;
    let sources = [];
    let resourcesNeeded = [];

    const escapeHTML = (str) => str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));

    function iconSpan(type, size = 16) {
        const colors = { wood: '#8B5A2B', stone: '#E67E22', iron: '#7F8C8D' };
        const color = colors[type] || '#888';
        return `<span style="display:inline-block;width:${size}px;height:${size}px;border-radius:50%;background:${color};vertical-align:middle;margin-right:2px;"></span>`;
    }

    let attempts = 0;
    const initInterval = setInterval(() => {
        attempts++;
        if (window.game_data?.village && window.$) {
            clearInterval(initInterval);
            startScript();
        } else if (attempts >= 10) {
            clearInterval(initInterval);
        }
    }, 1000);

    function startScript() {
        const WHCap = game_data.village.storage_max || 1000;
        const formatNumber = num => (num || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        const getResourceHTML = (w, s, i) => `${iconSpan('wood')} ${formatNumber(w)} <span style="margin-left: 4px;">${iconSpan('stone')} ${formatNumber(s)}</span> <span style="margin-left: 4px;">${iconSpan('iron')} ${formatNumber(i)}</span>`;

        // ============================================================
        // 1. CSS ORIGINAL + FIX POPUP TRIBAL WARS + NOVO PAINEL TRANSPORTES
        // ============================================================
        const css = `
        <style>
        #popup_box_Content { width: 1150px !important; max-width: 95vw !important; }

        .tw-script-wrapper * { box-sizing: border-box; font-family: 'Segoe UI', Arial, sans-serif; }
        .tw-topbar { background: linear-gradient(135deg, #1a1a2e, #16213e); color: #e0e0e0; padding: 6px 16px; border-radius: 6px; margin-bottom: 10px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 13px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 1px solid #2a3a5e; }
        .tw-topbar .status { font-weight: 600; font-size: 13px; }
        .tw-topbar .status.active { color: #4caf50; }
        .tw-topbar .status.inactive { color: #f44336; }
        .tw-topbar .btn { background: linear-gradient(135deg, #4caf50, #2e7d32); color: white; border: none; padding: 4px 14px; border-radius: 16px; cursor: pointer; font-weight: 600; font-size: 12px; transition: 0.2s; box-shadow: 0 2px 6px rgba(76,175,80,0.3); }
        .tw-topbar .btn:hover { transform: scale(1.02); }
        .tw-topbar .resource-total { background: #0f1a2f; padding: 2px 10px; border-radius: 12px; border: 1px solid #2a3a5e; font-size: 12px; white-space: nowrap; display: inline-flex; align-items: center; gap: 4px; }
        .tw-topbar .resource-total span.value { font-weight: 700; color: #ffd54f; }
        .tw-topbar .spacer { flex: 1; }
        
        .tw-table { width: 100%; border-collapse: collapse; border-radius: 6px; overflow: hidden; background: #1a2433; color: #e0e0e0; font-size: 12px; margin: 0; }
        .tw-table th { background: #0f1a2f; color: #ffd54f; font-weight: 600; padding: 5px 8px; text-align: center; border-bottom: 1px solid #2a3a5e; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; position: sticky; top: 0; z-index: 2; }
        .tw-table td { padding: 4px 8px; text-align: center; border-bottom: 1px solid #1e2a3a; background: #1a2433; vertical-align: middle; }
        .tw-table tr:hover td { background: #24334a; }
        .tw-table .no-merchants td { background-color: #3d1a1a !important; color: #ff6b6b; }
        .tw-table .village-checkbox { accent-color: #4caf50; transform: scale(0.9); margin: 0; }
        .tw-table .time-cell { color: #81d4fa; font-weight: 500; font-size: 11px; white-space: nowrap; }
        .tw-table .total-row td, .tw-table .total-row th { background: #0f1a2f; font-weight: 600; border-top: 1px solid #4caf50; color: #ffd54f; position: sticky; bottom: 0; }
        .tw-table .merch-cell.available { color: #4caf50; }
        .tw-table .merch-cell.none { color: #ff6b6b; }
        .tw-table .name-cell { font-size: 11px; text-align: left; padding-left: 6px; white-space: nowrap; }
        .tw-table .res-cell { white-space: nowrap; } 
        
        .tw-btn-primary { background: linear-gradient(135deg, #4caf50, #2e7d32); color: white; border: none; padding: 6px 16px; border-radius: 16px; cursor: pointer; font-weight: 600; font-size: 12px; transition: 0.2s; box-shadow: 0 2px 6px rgba(76,175,80,0.3); }
        .tw-btn-primary:hover:not(:disabled) { transform: scale(1.02); }
        .tw-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .tw-btn-secondary { background: #3a4a5e; color: white; border: none; padding: 6px 16px; border-radius: 16px; cursor: pointer; font-weight: 600; font-size: 12px; transition: 0.2s; }
        .tw-btn-secondary:hover:not(:disabled) { background: #4a5a6e; }
        .tw-btn-success { background: #2e7d32 !important; color: white !important; }
        
        .tw-dialog { background: #1a2433; border-radius: 8px; padding: 16px 20px; color: #e0e0e0; box-shadow: 0 4px 20px rgba(0,0,0,0.6); max-width: 100%; margin: 0 auto; font-size: 13px; } 
        .tw-dialog h2 { color: #ffd54f; margin: 0 0 10px 0; font-size: 18px; border-bottom: 1px solid #2a3a5e; padding-bottom: 6px; }
        .tw-dialog .res-icons { display: inline-flex; align-items: center; gap: 10px; }
        .tw-dialog .res-item { display: inline-flex; align-items: center; gap: 4px; }
        .tw-dialog .res-value { font-weight: 700; color: #ffd54f; }
        
        .tw-layout { display: flex; gap: 15px; align-items: stretch; margin-top: 15px; width: 100%; }
        .tw-col-left { flex: 1.25; display: flex; flex-direction: column; min-width: 0; }
        .tw-col-right { flex: 1; background: #0f1a2f; padding: 15px; border-radius: 8px; border: 1px solid #2a3a5e; display: flex; flex-direction: column; min-width: 0; overflow-x: auto; }
        
        .tw-table-wrap { max-height: 55vh; overflow-y: auto; overflow-x: auto; padding-right: 4px; border-radius: 6px; border: 1px solid #2a3a5e; }
        .tw-table-wrap::-webkit-scrollbar { width: 6px; height: 6px; }
        .tw-table-wrap::-webkit-scrollbar-track { background: #1a2433; }
        .tw-table-wrap::-webkit-scrollbar-thumb { background: #4a5a6e; border-radius: 4px; }
        
        .tw-bottom-actions { display: flex; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid #2a3a5e; }
        
        .tw-transport-panel { position: fixed; width: 270px; max-height: 65vh; background: #1a2433; border-radius: 8px; border: 1px solid #2a3a5e; box-shadow: 0 4px 20px rgba(0,0,0,0.6); padding: 8px 10px; color: #e0e0e0; font-size: 11px; overflow-y: auto; z-index: 99999 !important; display: none; }
        .tw-transport-panel::-webkit-scrollbar { width: 4px; }
        .tw-transport-panel::-webkit-scrollbar-track { background: #1a2433; }
        .tw-transport-panel::-webkit-scrollbar-thumb { background: #4a5a6e; border-radius: 4px; }
        
        .tw-transport-panel h3 { color: #ffd54f; margin: 0 0 6px 0; font-size: 13px; border-bottom: 1px solid #2a3a5e; padding-bottom: 4px; }
        .tw-transport-panel .close-btn { float: right; background: none; border: none; color: #ff6b6b; cursor: pointer; font-size: 15px; font-weight: bold; margin-top:-2px; }
        .tw-transport-panel .refresh-btn { background: none; border: 1px solid #2a3a5e; color: #81d4fa; cursor: pointer; font-size: 10px; padding: 1px 6px; border-radius: 10px; float: right; margin-right: 25px; margin-top:-1px;}
        .tw-transport-panel table { width: 100%; border-collapse: collapse; font-size: 10px; }
        .tw-transport-panel table th { background: #0f1a2f; color: #ffd54f; padding: 3px 2px; border-bottom: 1px solid #2a3a5e; }
        .tw-transport-panel table td { padding: 3px 2px; border-bottom: 1px solid #1e2a3a; text-align: center; }
        .tw-transport-panel .transport-arrival { color: #81d4fa; font-weight: 500; }
        .tw-transport-panel .transport-return { color: #aed581; font-weight: 500; }
        </style>`;
        $('head').append(css);

        // ============================================================
        // 2. BARRA SUPERIOR
        // ============================================================
        if ($('#activateBtn').length === 0) {
            $('#building_wrapper').prepend(`
                <div class="tw-topbar tw-script-wrapper">
                    <span class="status inactive" id="scriptStatus">🔴 Inativo</span>
                    <button class="btn" id="activateBtn">Ativar</button>
                    <span class="spacer"></span>
                    <span class="resource-total">${iconSpan('wood', 14)}<span class="value" id="totalWood">0</span></span>
                    <span class="resource-total">${iconSpan('stone', 14)}<span class="value" id="totalStone">0</span></span>
                    <span class="resource-total">${iconSpan('iron', 14)}<span class="value" id="totalIron">0</span></span>
                    <span class="resource-total">🛒 <span class="value" id="totalMerchants">0</span></span>
                </div>
            `);
        }

        function formatTime(minutes) {
            if (minutes < 1) return '< 1 min';
            const h = Math.floor(minutes / 60);
            const m = Math.round(minutes % 60);
            return h > 0 ? `${h}h ${m}min` : `${m} min`;
        }

        // ============================================================
        // 3. CARREGAR TRANSPORTES
        // ============================================================
        function loadOwnTransports(callback) {
            const villageId = game_data.village.id;
            const url = `${location.origin}/game.php?village=${villageId}&screen=overview_villages&mode=trader&type=own`;

            $.get(url, page => {
                const $page = $(page);
                let $table = $page.find('#transport_table');
                if (!$table.length) $table = $page.find('table:has(th:contains("Origem")):has(th:contains("Aldeia"))');
                if (!$table.length) $table = $page.find('table.vis:has(td)');

                if (!$table.length) {
                    ownTransportsHTML = '<div class="no-data" style="text-align:center;padding:15px;">Nenhum transporte ativo encontrado.</div>';
                    if(callback) callback(ownTransportsHTML);
                    return;
                }

                const $headerRow = $table.find('tr:has(th)').first() || $table.find('tr').filter((_, el) => $(el).find('th').length).first();
                const headers = $headerRow.find('th').map((_, el) => $(el).text().trim().toLowerCase()).get();

                const idx = { origem: -1, aldeia: -1, duracao: -1, chegada: -1, chegaEm: -1, mercadores: -1, recursos: -1 };
                headers.forEach((text, i) => {
                    if (text.includes('origem')) idx.origem = i;
                    else if (text.includes('aldeia')) idx.aldeia = i;
                    else if (text.includes('dura')) idx.duracao = i;
                    else if (text.includes('chegada') && !text.includes('chega em')) idx.chegada = i;
                    else if (text.includes('chega em')) idx.chegaEm = i;
                    else if (text.includes('mercadores') || text.includes('mercad')) idx.mercadores = i;
                    else if (text.includes('recursos') || text.includes('recurs')) idx.recursos = i;
                });

                if (idx.aldeia === -1) idx.aldeia = 1;
                if (idx.recursos === -1) idx.recursos = 6;
                if (idx.mercadores === -1) idx.mercadores = 5;
                if (idx.chegaEm === -1) idx.chegaEm = 4;

                let hasData = false;
                let rowsHtml = '';
                $table.find('tr:has(td)').each((_, tr) => {
                    const cells = $(tr).find('td');
                    if (cells.length < 5) return;

                    let destino = cells.eq(idx.aldeia !== -1 ? idx.aldeia : idx.origem).text().trim() || '';
                    let recursos = cells.eq(idx.recursos !== -1 ? idx.recursos : cells.length - 1).text().trim() || '';
                    let mercadores = cells.eq(idx.mercadores !== -1 ? idx.mercadores : cells.length - 2).text().trim() || '';
                    let chegaEm = cells.eq(idx.chegaEm !== -1 ? idx.chegaEm : 4).text().trim() || '';

                    if (!destino || destino.length < 3 || (/origem|aldeia/i.test(destino))) return;
                    if (!recursos.match(/\d/) && !mercadores.match(/\d/)) return;

                    hasData = true;
                    const isReturn = /retorno de|return from/i.test(destino);
                    const destinoShort = escapeHTML(destino.replace(/transporte para |retorno de /i, '').replace(/\(.*\)/, '').trim() || destino);

                    rowsHtml += `<tr>
                        <td style="text-align:left;max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${destinoShort}">${destinoShort}</td>
                        <td>${recursos}</td>
                        <td>${mercadores}</td>
                        <td class="${isReturn ? 'transport-return' : 'transport-arrival'}">${chegaEm}</td>
                    </tr>`;
                });

                ownTransportsHTML = hasData
                    ? `<table><thead><tr><th>Destino</th><th>Rec.</th><th>M.</th><th>Chega em</th></tr></thead><tbody>${rowsHtml}</tbody></table>`
                    : '<div class="no-data" style="text-align:center;padding:15px;">Nenhum transporte ativo.</div>';

                if(callback) callback(ownTransportsHTML);
            });
        }

        // ============================================================
        // 4. GESTÃO DO PAINEL DE TRANSPORTES
        // ============================================================
        function closeTransportsPanel() {
            $('#tw-transport-panel').hide();
        }
        
        function alignTransportPanel() {
            const $popup = $('#popup_box_Content').closest('.popup_box');
            const $panel = $('#tw-transport-panel');
            if ($popup.length && $panel.is(':visible')) {
                const rect = $popup[0].getBoundingClientRect();
                const topPos = rect.top;
                const popupLeft = rect.left;
                const panelWidth = $panel.outerWidth();
                
                let leftPos = popupLeft - panelWidth - 10;
                if (leftPos < 5) leftPos = 5; 
                
                $panel.css({
                    top: topPos + 'px',
                    left: leftPos + 'px'
                });
            }
        }

        function showTransportsPanel() {
            let panel = $('#tw-transport-panel');
            if (!panel.length) {
                panel = $(`<div id="tw-transport-panel" class="tw-transport-panel">
                    <h3>📦 Transportes <button class="close-btn" id="tw-close-transport">×</button> <button class="refresh-btn" id="tw-refresh-transport">↻</button></h3>
                    <div id="tw-transport-content">Carregando...</div>
                </div>`);
                $('body').append(panel);
                $('#tw-close-transport').off('click').on('click', closeTransportsPanel);
                $('#tw-refresh-transport').off('click').on('click', () => {
                    $('#tw-transport-content').html('Carregando...');
                    loadOwnTransports(html => {
                        $('#tw-transport-content').html(html);
                        alignTransportPanel();
                    });
                });
                
                $(window).on('resize scroll', alignTransportPanel);
            }
            panel.show();
            
            if (!ownTransportsHTML) {
                loadOwnTransports(html => {
                    $('#tw-transport-content').html(html);
                    alignTransportPanel(); 
                });
            } else {
                $('#tw-transport-content').html(ownTransportsHTML);
            }

            if (window.Dialog?.close && !originalDialogClose) {
                originalDialogClose = window.Dialog.close;
                window.Dialog.close = function() {
                    closeTransportsPanel();
                    originalDialogClose.apply(this, arguments);
                };
            }
            $(document).off('click', '.popup_box_close').on('click', '.popup_box_close', closeTransportsPanel);
            setTimeout(alignTransportPanel, 50);
        }

        // ============================================================
        // 5. CARREGAR ALDEIAS
        // ============================================================
        function loadVillages(callback) {
            $.get(`${location.origin}/game.php?screen=overview_villages&mode=prod&group=0&page=-1`, page => {
                const rows = $(page).find('#production_table tr').not(':first');
                sources = [];
                let tw = 0, ts = 0, ti = 0, tm = 0;

                rows.each((_, row) => {
                    const $row = $(row);
                    const coord = $row.find('span.quickedit-vn').text().trim().match(/(\d+)\|(\d+)/);
                    if (!coord) return;

                    const x = parseInt(coord[1]), y = parseInt(coord[2]);
                    const dist = Math.round(Math.hypot(x - game_data.village.x, y - game_data.village.y));

                    const $res = $row.children().eq(3);
                    const wood = parseInt($res.find('.wood').text().replace(/\./g, '')) || 0;
                    const stone = parseInt($res.find('.stone').text().replace(/\./g, '')) || 0;
                    const iron = parseInt($res.find('.iron').text().replace(/\./g, '')) || 0;

                    const merchText = $row.children().eq(5).text().trim();
                    const avail = parseInt(merchText.match(/\d+/) ? merchText.match(/\d+/)[0] : 0);

                    const id = parseInt($row.find('span[data-id]').attr('data-id'));
                    const name = escapeHTML($row.find('.quickedit-label').text().trim());

                    if (id !== game_data.village.id) {
                        sources.push({ id, name, distance: dist, wood, stone, iron, merchants: avail, usedMerchants: 0 });
                        tw += wood; ts += stone; ti += iron; tm += avail;
                    }
                });

                sources.sort((a, b) => a.distance - b.distance);
                isVillagesLoaded = true;

                $('#totalWood').text(formatNumber(tw));
                $('#totalStone').text(formatNumber(ts));
                $('#totalIron').text(formatNumber(ti));
                $('#totalMerchants').text(formatNumber(tm));

                if (callback) callback();
            });
        }

        // ============================================================
        // 6. GESTÃO DE BOTÕES NOS EDIFÍCIOS
        // ============================================================
        $('#activateBtn').off('click').on('click', function() {
            $('#scriptStatus').html('🟢 Ativo').removeClass('inactive').addClass('active');
            $(this).prop('disabled', true).text('A sincronizar...');

            let loaded = 0;
            const checkDone = () => {
                loaded++;
                if (loaded === 2) {
                    checkBuildings();
                    $('#activateBtn').text('↻ Atualizar').prop('disabled', false).off('click').on('click', () => {
                        isVillagesLoaded = false;
                        $('#activateBtn').click();
                    });
                    UI.SuccessMessage('Script ativado!');
                }
            };

            loadOwnTransports(checkDone);
            loadVillages(checkDone);
        });

        function checkBuildings() {
            resourcesNeeded = [];
            $('#buildings tr .build_options .inactive').each((i, el) => {
                const parent = $(el).parents().eq(1);
                const wood = parseInt(parent.find('[data-cost]').eq(0).text().trim().replace(/\./g, '')) || 0;
                const stone = parseInt(parent.find('[data-cost]').eq(1).text().trim().replace(/\./g, '')) || 0;
                const iron = parseInt(parent.find('[data-cost]').eq(2).text().trim().replace(/\./g, '')) || 0;
                resourcesNeeded[i] = { wood, stone, iron };

                if (parent.find('.tw-req-btn-container').length === 0) {
                    const msg = $(el).text();
                    const html = (msg !== 'The Warehouse is too small' && msg !== 'O Armazém é muito pequeno')
                        ? `<td class="tw-req-btn-container"><button class="tw-btn-primary tw-req-btn" data-idx="${i}">Request</button></td>`
                        : `<td class="tw-req-btn-container"><button class="tw-btn-secondary" disabled>Cap. Máx.</button></td>`;
                    parent.append(html);
                }
            });
        }

        $(document).off('click', '.tw-req-btn').on('click', '.tw-req-btn', function() {
            const idx = $(this).data('idx');
            window.openMultiSelect(idx, this);
        });

        // ============================================================
        // 7. CÁLCULO E DIALOG (LADO A LADO)
        // ============================================================
        function calculateDistribution(demand, villages) {
            const allocations = villages.map(v => ({ id: v.id, wood: 0, stone: 0, iron: 0 }));
            const remaining = villages.map(v => ({ ...v, usedMerchants: 0 }));
            const need = { ...demand };

            const allocate = (res, amount) => {
                let loops = 100;
                while (amount > 0 && loops-- > 0) {
                    let any = false;
                    for (const v of remaining) {
                        if (v.merchants - v.usedMerchants <= 0 || v[res] <= 0) continue;
                        const maxByMerch = (v.merchants - v.usedMerchants) * 1000;
                        let take = Math.min(1000, amount, v[res], maxByMerch);

                        if (take > 0) {
                            const alloc = allocations.find(a => a.id === v.id);
                            alloc[res] += take;
                            v[res] -= take;
                            v.usedMerchants = Math.ceil((alloc.wood + alloc.stone + alloc.iron) / 1000);
                            amount -= take;
                            any = true;
                        }
                    }
                    if (!any) break;
                }
                return amount;
            };

            need.wood = allocate('wood', need.wood);
            need.stone = allocate('stone', need.stone);
            need.iron = allocate('iron', need.iron);

            return (need.wood > 0 || need.stone > 0 || need.iron > 0) ? null : allocations.filter(a => a.wood > 0 || a.stone > 0 || a.iron > 0);
        }

        window.openMultiSelect = (buildingIdx, btnElement) => {
            const $btn = $(btnElement);
            $btn.text('A calcular...').prop('disabled', true);

            const totalCost = resourcesNeeded[buildingIdx];
            if (!totalCost) { $btn.text('Request').prop('disabled', false); return; }

            const cur = game_data.village;
            const demand = {
                wood: Math.max(0, totalCost.wood - cur.wood),
                stone: Math.max(0, totalCost.stone - cur.stone),
                iron: Math.max(0, totalCost.iron - cur.iron)
            };

            if (!demand.wood && !demand.stone && !demand.iron) {
                $btn.text('Request').prop('disabled', false);
                return UI.SuccessMessage('Já tens todos os recursos necessários!');
            }
            if (cur.wood + demand.wood > WHCap || cur.stone + demand.stone > WHCap || cur.iron + demand.iron > WHCap) {
                $btn.text('Request').prop('disabled', false);
                return UI.ErrorMessage('Não há espaço no armazém!');
            }

            const proceed = () => {
                $btn.text('Request').prop('disabled', false);
                let html = `<div class="tw-dialog">
                    <h2>📦 Selecionar aldeias fonte</h2>
                    <p><strong>Recursos necessários:</strong> <span class="res-icons">
                        <span class="res-item">${iconSpan('wood', 18)}<span class="res-value">${formatNumber(demand.wood)}</span></span>
                        <span class="res-item">${iconSpan('stone', 18)}<span class="res-value">${formatNumber(demand.stone)}</span></span>
                        <span class="res-item">${iconSpan('iron', 18)}<span class="res-value">${formatNumber(demand.iron)}</span></span>
                    </span></p>
                    
                    <div class="tw-layout">
                        <div class="tw-col-left">
                            <div class="tw-table-wrap">
                                <table class="tw-table">
                                    <thead><tr><th style="width:30px;">Sel.</th><th>Nome</th><th style="min-width: 210px;">Recursos</th><th>Dist.</th><th style="width:55px;">Merc.</th></tr></thead>
                                    <tbody>`; 

                let selCount = 0;
                sources.forEach(v => {
                    const checked = (v.merchants > 0 && selCount < 5) ? 'checked' : '';
                    if (checked) selCount++;
                    html += `<tr class="${v.merchants === 0 ? 'no-merchants' : ''}">
                        <td><input type="checkbox" class="village-checkbox" data-id="${v.id}" ${checked}></td>
                        <td class="name-cell">${v.name.replace(' K43', '')}</td>
                        <td class="res-cell">${getResourceHTML(v.wood, v.stone, v.iron)}</td>
                        <td class="dist-cell">${v.distance}</td>
                        <td class="merch-cell ${v.merchants > 0 ? 'available' : 'none'}">${v.merchants}</td>
                    </tr>`;
                });

                html += `           </tbody>
                                </table>
                            </div>
                            <div class="tw-bottom-actions">
                                <button class="tw-btn-primary" id="calcDistribBtn">⚡ Calcular</button>
                                <button class="tw-btn-secondary" onclick="Dialog.close();">Cancelar</button>
                            </div>
                        </div>
                        
                        <div class="tw-col-right" id="distribResult">
                            <h3 style="margin:0 0 10px; font-size:16px; color:#ffd54f; border-bottom:1px solid #2a3a5e; padding-bottom:6px;">📊 Distribuição</h3>
                            <div style="flex:1; display:flex; align-items:center; justify-content:center; text-align:center; color:#7F8C8D; font-style:italic;">
                                Clica em "Calcular" para gerar a distribuição de recursos aqui.
                            </div>
                        </div>
                    </div>
                </div>`;

                Dialog.show('Content', html);
                showTransportsPanel();
                setTimeout(alignTransportPanel, 50);

                $('#calcDistribBtn').off('click').on('click', () => {
                    const selectedIds = $('.village-checkbox:checked').map((_, el) => $(el).data('id')).get();
                    if (!selectedIds.length) return UI.WarningMessage('Seleciona pelo menos uma aldeia.');

                    const result = calculateDistribution(demand, sources.filter(v => selectedIds.includes(v.id)));
                    if (!result) return UI.ErrorMessage('Recursos ou mercadores insuficientes!');

                    let preview = '<h3 style="margin:0 0 10px; font-size:16px; color:#ffd54f; border-bottom:1px solid #2a3a5e; padding-bottom:6px;">📊 Distribuição Calculada</h3><div class="tw-table-wrap" style="flex:1; max-height:none;"><table class="tw-table" style="margin-bottom: auto;"><thead><tr><th>Aldeia</th><th>Madeira</th><th>Pedra</th><th>Ferro</th><th>Merc.</th><th>Chegada</th></tr></thead><tbody>';
                    let tw = 0, ts = 0, ti = 0, tm = 0, maxIda = 0;

                    result.forEach(item => {
                        const v = sources.find(s => s.id === item.id);
                        const merc = Math.ceil((item.wood + item.stone + item.iron) / 1000);
                        tw += item.wood; ts += item.stone; ti += item.iron; tm += merc;
                        const idaMin = (v.distance * MERCHANT_SPEED_TOTAL) / 2;
                        if (idaMin > maxIda) maxIda = idaMin;

                        preview += `<tr>
                            <td class="name-cell">${v.name.replace(' K43', '')}</td>
                            <td>${formatNumber(item.wood)}</td><td>${formatNumber(item.stone)}</td><td>${formatNumber(item.iron)}</td>
                            <td>${merc}</td><td class="time-cell">${formatTime(idaMin)}</td>
                        </tr>`;
                    });

                    preview += `<tr class="total-row"><th>Total</th><th>${formatNumber(tw)}</th><th>${formatNumber(ts)}</th><th>${formatNumber(ti)}</th><th>${tm}</th><th>${formatTime(maxIda)}</th></tr></tbody></table></div>
                        <div style="margin-top:15px; border-top: 1px solid #2a3a5e; padding-top:12px;">
                            <button class="tw-btn-primary" id="confirmSendBtn" style="width: 100%; font-size: 13px; padding: 8px;">✅ Confirmar e Enviar</button>
                        </div>`;

                    $('#distribResult').html(preview);

                    $('#confirmSendBtn').off('click').on('click', function() {
                        $(this).prop('disabled', true).text('A Enviar...');
                        sendRequests(result, () => {
                            UI.SuccessMessage('Todos os pedidos foram enviados!');
                            $btn.removeClass('tw-btn-primary').addClass('tw-btn-success').text('✔ Enviado').prop('disabled', true);
                            Dialog.close();
                        });
                    });
                });
            };

            if (isVillagesLoaded) proceed(); else loadVillages(proceed);
        };

        function sendRequests(allocations, onComplete) {
            if (!allocations.length) return onComplete?.();
            let idx = 0;
            const next = () => {
                if (idx >= allocations.length) return onComplete?.();
                const item = allocations[idx];
                TribalWars.post('market',
                    { ajaxaction: 'call', village: game_data.village.id },
                    { 'select-village': item.id, 'target_id': 0, 'resource': { [item.id]: { wood: item.wood, stone: item.stone, iron: item.iron } } },
                    () => { idx++; setTimeout(next, 400); },
                    err => { console.error(err); idx++; setTimeout(next, 400); }
                );
            };
            next();
        }
    }
})();
