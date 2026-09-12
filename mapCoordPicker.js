/**
 * Script Name: Enhanced Map Coord Picker v3.5 (com BetterMap Integrado)
 * Autor: RedAlert & Comunidade TW | Aprimorado por Diogo
 * Compatível com Tribal Wars / Tribos PT/BR
 * Funcionalidades:
 * - Coletor de Coordenadas com filtros por Jogador, Tribo, Pontos e Raio
 * - Múltiplos formatos de exportação (Espaço, Linha, [coord], [claim], Tabela BBCode, com ID)
 * - Ordenação por proximidade da aldeia atual, pontos ou aleatório
 * - BetterMap Integrado:
 *   * Etiquetas flutuantes no mapa com Pontos das Bárbaras e Nomes dos Jogadores
 *   * Exibição de TAG da Tribo
 *   * Colorir Tribos Inimigas (Vermelho), Aliadas (Azul) e Jogadores Marcados (Roxo)
 *   * Destaque em Verde Neon com borda luminosa para aldeias selecionadas no Coletor
 *   * Configuração interativa no painel e persistência automática no navegador
 */
(function () {
    'use strict';

    try {
        const gameData = window.game_data || (typeof game_data !== 'undefined' ? game_data : null);

        if (!gameData) {
            alert('Erro: game_data não encontrado. O script deve ser executado dentro do Tribal Wars.');
            return;
        }

        if (gameData.screen !== 'map') {
            if (window.UI && UI.InfoMessage) {
                UI.InfoMessage('A redirecionar para o mapa...', 2500, 'info');
            }
            sessionStorage.setItem('tw_open_coord_picker', '1');
            window.location.assign(gameData.link_base_pure + 'map');
            return;
        }

        if ($('#tw-enhanced-coord-picker').length > 0) {
            $('#tw-enhanced-coord-picker').show();
            $('#ecpBody').show();
            $('#ecpToggleCollapse').text('_');
            if (window.UI && UI.InfoMessage) {
                UI.InfoMessage('O Coletor de Coordenadas já está aberto!', 2000, 'info');
            }
            return;
        }

        // Coordenadas seguras da aldeia de origem
        let origX = 500, origY = 500, origCoord = '500|500';
        if (gameData.village) {
            if (gameData.village.coord) {
                origCoord = gameData.village.coord;
                const p = origCoord.split('|');
                origX = parseInt(p[0], 10) || 500;
                origY = parseInt(p[1], 10) || 500;
            } else if (gameData.village.x && gameData.village.y) {
                origX = parseInt(gameData.village.x, 10);
                origY = parseInt(gameData.village.y, 10);
                origCoord = `${origX}|${origY}`;
            }
        }

        const currentOrigin = { x: origX, y: origY, coord: origCoord };
        let selectedList = [];
        let historyStack = [];

        // Configuração do BetterMap Integrado (com persistência em localStorage)
        let savedBmConfig = {};
        try {
            savedBmConfig = JSON.parse(localStorage.getItem('tw_ecp_bm_config') || '{}');
        } catch (e) {}

        const betterMapConfig = {
            enabled: savedBmConfig.enabled !== undefined ? savedBmConfig.enabled : true,
            showBarbs: savedBmConfig.showBarbs !== undefined ? savedBmConfig.showBarbs : true,
            minBarbPoints: savedBmConfig.minBarbPoints !== undefined ? savedBmConfig.minBarbPoints : 26,
            barbColor: savedBmConfig.barbColor || '#7b1113',
            showPlayers: savedBmConfig.showPlayers !== undefined ? savedBmConfig.showPlayers : true,
            showTribes: savedBmConfig.showTribes !== undefined ? savedBmConfig.showTribes : false,
            showMyself: savedBmConfig.showMyself !== undefined ? savedBmConfig.showMyself : false,
            redTribes: savedBmConfig.redTribes || '',
            blueTribes: savedBmConfig.blueTribes || '',
            customPlayers: savedBmConfig.customPlayers || ''
        };

        function saveBmConfig() {
            try {
                localStorage.setItem('tw_ecp_bm_config', JSON.stringify(betterMapConfig));
            } catch (e) {}
        }

        const worldCache = {
            players: null,
            tribes: null,
            villages: null,
            loading: false
        };

        const customCss = `
            #tw-enhanced-coord-picker {
                position: fixed;
                top: 65px;
                right: 20px;
                width: 385px;
                background-color: #f4e4c1;
                border: 2px solid #7d510f;
                border-radius: 6px;
                box-shadow: 0 6px 22px rgba(0,0,0,0.5);
                z-index: 99999;
                font-family: Verdana, Arial, sans-serif;
                font-size: 11px;
                color: #402000;
            }
            #tw-enhanced-coord-picker * { box-sizing: border-box; }
            .ecp-header {
                background: linear-gradient(to bottom, #8f5c22, #6c3f0c);
                color: #fff;
                padding: 8px 10px;
                cursor: move;
                font-weight: bold;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-top-left-radius: 4px;
                border-top-right-radius: 4px;
                user-select: none;
            }
            .ecp-header .ecp-title { font-size: 12px; }
            .ecp-header-btns span {
                cursor: pointer;
                margin-left: 6px;
                padding: 2px 7px;
                background: rgba(0,0,0,0.25);
                border-radius: 3px;
                font-size: 11px;
            }
            .ecp-header-btns span:hover { background: rgba(0,0,0,0.55); }
            .ecp-body { padding: 9px; max-height: 82vh; overflow-y: auto; }
            .ecp-section {
                margin-bottom: 8px;
                padding: 7px;
                background: #fff5da;
                border: 1px solid #d2b48c;
                border-radius: 4px;
            }
            .ecp-section-title {
                font-weight: bold;
                margin-bottom: 5px;
                color: #5c2e00;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 11px;
            }
            .ecp-btn-row { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 4px; }
            .ecp-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 4px 7px;
                background: #e2c079;
                border: 1px solid #8f5c22;
                color: #3b1e04 !important;
                border-radius: 3px;
                text-decoration: none !important;
                font-weight: bold;
                cursor: pointer;
                text-align: center;
                font-size: 10.5px;
                flex: 1 1 auto;
                user-select: none;
            }
            .ecp-btn:hover { background: #f3d79b; }
            .ecp-btn.ecp-btn-primary { background: #64992c; border-color: #3d6314; color: #fff !important; }
            .ecp-btn.ecp-btn-primary:hover { background: #7ab838; }
            .ecp-btn.ecp-btn-action { background: #4a75a0; border-color: #2e4d6d; color: #fff !important; }
            .ecp-btn.ecp-btn-action:hover { background: #5c8fc2; }
            .ecp-btn.ecp-btn-danger { background: #c2433e; border-color: #912723; color: #fff !important; }
            .ecp-btn.ecp-btn-danger:hover { background: #d95853; }
            .ecp-input-text {
                width: 100%;
                padding: 4px 6px;
                border: 1px solid #9e7a46;
                border-radius: 3px;
                font-size: 11px;
                background: #fffdf8;
            }
            .ecp-input-inline {
                width: 65px;
                padding: 3px 4px;
                border: 1px solid #9e7a46;
                border-radius: 3px;
                font-size: 10.5px;
                background: #fffdf8;
            }
            .ecp-textarea {
                width: 100%;
                height: 85px;
                resize: vertical;
                border: 1px solid #9e7a46;
                background: #fffdf8;
                padding: 5px;
                font-family: monospace;
                font-size: 11px;
                border-radius: 3px;
            }
            .ecp-select {
                width: 100%;
                padding: 3px 5px;
                border: 1px solid #9e7a46;
                border-radius: 3px;
                background: #fff;
                margin-bottom: 5px;
                font-size: 10.5px;
            }
            .ecp-stats-bar {
                font-size: 10px;
                color: #444;
                display: flex;
                justify-content: space-between;
                margin-top: 3px;
                padding: 3px 6px;
                background: #ead2a8;
                border-radius: 3px;
                font-weight: 500;
            }
            .ecp-badge {
                background: #7d510f;
                color: #fff;
                padding: 1px 4px;
                border-radius: 3px;
                font-size: 9.5px;
            }
            .ecp-filter-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 6px;
                align-items: center;
                margin-top: 4px;
            }
            .ecp-filter-item {
                display: flex;
                align-items: center;
                gap: 4px;
            }
            /* Estilo dos Rótulos do BetterMap no Mapa */
            .tw-ecp-map-label {
                position: absolute;
                height: auto;
                line-height: 12px;
                font-size: 9px;
                font-weight: bold;
                z-index: 14;
                display: block;
                color: #ffffff !important;
                text-align: center;
                border-radius: 3px;
                padding: 0 2px;
                text-shadow: 0 0 2px #000, 0 0 2px #000, 0 1px 2px #000;
                pointer-events: none;
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
                box-sizing: border-box;
            }
        `;

        $('#tw-ecp-styles').remove();
        $('head').append(`<style id="tw-ecp-styles">${customCss}</style>`);

        const html = `
            <div id="tw-enhanced-coord-picker">
                <div class="ecp-header" id="ecpHeader">
                    <span class="ecp-title">📍 Coletor de Coordenadas + BetterMap</span>
                    <div class="ecp-header-btns">
                        <span id="ecpToggleCollapse" title="Minimizar / Expandir">_</span>
                        <span id="ecpClose" title="Fechar (ESC)">✕</span>
                    </div>
                </div>
                <div class="ecp-body" id="ecpBody">
                    <!-- Seção 1: Busca por Jogador ou Tribo -->
                    <div class="ecp-section">
                        <div class="ecp-section-title">
                            <span>🎯 Buscar por Jogador / Tribo</span>
                            <span class="ecp-badge" id="ecpScopeIndicator">Mundo Todo</span>
                        </div>
                        <div style="display:flex; gap:4px; margin-bottom:5px;">
                            <select id="ecpSearchType" style="width:90px; padding:3px; border:1px solid #9e7a46; border-radius:3px;">
                                <option value="player">👤 Jogador</option>
                                <option value="ally">🛡️ Tribo</option>
                            </select>
                            <input type="text" id="ecpSearchInput" class="ecp-input-text" placeholder="Nome exato ou parcial..." />
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; font-size:10px;">
                            <label style="cursor:pointer;"><input type="checkbox" id="ecpWorldScope" checked /> Buscar no mundo todo</label>
                            <label style="cursor:pointer;"><input type="checkbox" id="ecpAppendMode" /> Manter seleção anterior</label>
                        </div>
                        <a class="ecp-btn ecp-btn-action" id="ecpSearchBtn" style="width:100%; font-size:11px; padding:5px;">
                            🔍 Extrair Todas as Aldeias
                        </a>
                    </div>

                    <!-- Seção 2: Filtros de Pontos e Raio -->
                    <div class="ecp-section">
                        <div class="ecp-section-title">
                            <span>⚙️ Filtros (Pontos & Distância)</span>
                            <a href="javascript:void(0);" id="ecpApplyFilterToList" style="font-size:10px; color:#6c3f0c; text-decoration:underline;">Aplicar à lista atual</a>
                        </div>
                        <div class="ecp-filter-grid">
                            <div class="ecp-filter-item">
                                <span>Mín:</span>
                                <input type="number" id="ecpMinPoints" class="ecp-input-inline" placeholder="ex: 3000" />
                                <span>pts</span>
                            </div>
                            <div class="ecp-filter-item">
                                <span>Máx:</span>
                                <input type="number" id="ecpMaxPoints" class="ecp-input-inline" placeholder="ex: 12000" />
                                <span>pts</span>
                            </div>
                            <div class="ecp-filter-item" style="grid-column: span 2;">
                                <span>Raio máx da sua aldeia:</span>
                                <input type="number" id="ecpRadius" class="ecp-input-inline" placeholder="Sem limite" />
                                <span>campos</span>
                            </div>
                        </div>
                    </div>

                    <!-- Seção 3: Seleção Rápida no Mapa Visível -->
                    <div class="ecp-section">
                        <div class="ecp-section-title"><span>⚡ Seleção Rápida (Tela Atual)</span></div>
                        <div class="ecp-btn-row">
                            <a class="ecp-btn" id="ecpSelectBarbs" title="Seleciona todas as aldeias bárbaras visíveis com os filtros de pontos">🏴 Bárbaras Visíveis</a>
                            <a class="ecp-btn" id="ecpSelectPlayers" title="Seleciona todas as aldeias de jogadores visíveis com os filtros de pontos">⚔️ Inimigos Visíveis</a>
                        </div>
                    </div>

                    <!-- Seção 4: Etiquetas no Mapa (BetterMap) -->
                    <div class="ecp-section">
                        <div class="ecp-section-title">
                            <span>🏷️ Etiquetas no Mapa (BetterMap)</span>
                            <label style="cursor:pointer; font-weight:normal; font-size:10px;">
                                <input type="checkbox" id="ecpBmEnable" ${betterMapConfig.enabled ? 'checked' : ''} /> <b>Ativar</b>
                            </label>
                        </div>
                        <div id="ecpBmControls" style="${betterMapConfig.enabled ? '' : 'display:none;'}">
                            <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:5px; font-size:10px;">
                                <label style="cursor:pointer;"><input type="checkbox" id="ecpBmShowBarbs" ${betterMapConfig.showBarbs ? 'checked' : ''} /> Pontos Bárbaras</label>
                                <label style="cursor:pointer;"><input type="checkbox" id="ecpBmShowPlayers" ${betterMapConfig.showPlayers ? 'checked' : ''} /> Jogadores</label>
                                <label style="cursor:pointer;"><input type="checkbox" id="ecpBmShowTribes" ${betterMapConfig.showTribes ? 'checked' : ''} /> Tag Tribo</label>
                            </div>
                            <div style="display:flex; align-items:center; gap:5px; font-size:10px;">
                                <span>Bárbaras mín:</span>
                                <input type="number" id="ecpBmMinBarbPts" class="ecp-input-inline" value="${betterMapConfig.minBarbPoints}" style="width:48px;" />
                                <span>pts</span>
                                <span style="margin-left:auto; cursor:pointer; color:#8f5c22; text-decoration:underline;" id="ecpToggleColorRules">🎨 Cores</span>
                            </div>
                            <div id="ecpBmColorRules" style="display:none; padding:5px; background:#f5e5c9; border:1px dashed #c49a6c; border-radius:3px; margin-top:5px; font-size:10px;">
                                <div style="margin-bottom:3px;">
                                    <span style="color:#b71c1c; font-weight:bold;">🔴 Tribos Inimigas:</span>
                                    <input type="text" id="ecpBmRedTribes" class="ecp-input-text" placeholder="Tags ex: WAR, FOE" value="${betterMapConfig.redTribes}" style="margin-top:2px; height:22px;" />
                                </div>
                                <div style="margin-bottom:3px;">
                                    <span style="color:#0d47a1; font-weight:bold;">🔵 Tribos Aliadas:</span>
                                    <input type="text" id="ecpBmBlueTribes" class="ecp-input-text" placeholder="Tags ex: ALLY, PNA" value="${betterMapConfig.blueTribes}" style="margin-top:2px; height:22px;" />
                                </div>
                                <div>
                                    <span style="color:#4a148c; font-weight:bold;">🟣 Jogadores Marcados:</span>
                                    <input type="text" id="ecpBmCustomPlayers" class="ecp-input-text" placeholder="Nomes ex: Alvo1, Alvo2" value="${betterMapConfig.customPlayers}" style="margin-top:2px; height:22px;" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Seção 5: Lista de Coordenadas e Contadores -->
                    <div class="ecp-section">
                        <div class="ecp-section-title">
                            <span>📋 Coordenadas Selecionadas</span>
                            <div>
                                <a href="javascript:void(0);" id="ecpUndoBtn" style="font-size:10px; color:#8f5c22; text-decoration:underline; margin-right:5px;">↺ Desfazer</a>
                                <a href="javascript:void(0);" id="ecpSyncBtn" style="font-size:10px; color:#8f5c22; text-decoration:underline;">🔄 Sincronizar</a>
                            </div>
                        </div>
                        <textarea id="ecpTextarea" class="ecp-textarea" placeholder="Clique no mapa ou use a busca acima..."></textarea>
                        <div class="ecp-stats-bar">
                            <span>Total: <b id="ecpStatTotal">0</b></span>
                            <span>Bárbaras: <b id="ecpStatBarbs">0</b></span>
                            <span>Jogadores: <b id="ecpStatPlayers">0</b></span>
                        </div>
                    </div>

                    <!-- Seção 6: Formato de Saída e Ordenação -->
                    <div class="ecp-section">
                        <div class="ecp-section-title"><span>📤 Formato & Ordenação</span></div>
                        <select id="ecpFormat" class="ecp-select">
                            <option value="space">Espaço (500|500 501|501)</option>
                            <option value="line">Quebra de Linha (1 por linha)</option>
                            <option value="bb_coord">BBCode [coord]500|500[/coord]</option>
                            <option value="bb_claim">BBCode Reserva [claim]500|500[/claim]</option>
                            <option value="bb_table">Tabela BBCode (Coord, Jogador, Pontos, Dist.)</option>
                            <option value="coord_id">Com ID (500|500:12345)</option>
                        </select>
                        <div class="ecp-btn-row">
                            <a class="ecp-btn" id="ecpSortDistAsc" title="Mais próximas da sua aldeia">📏 + Perto</a>
                            <a class="ecp-btn" id="ecpSortDistDesc" title="Mais distantes">📏 + Longe</a>
                            <a class="ecp-btn" id="ecpSortPoints" title="Maior pontuação primeiro">⭐ Pontos</a>
                            <a class="ecp-btn" id="ecpShuffle" title="Embaralhar alvos (ótimo para fakes)">🔀 Aleatório</a>
                        </div>
                    </div>

                    <div class="ecp-btn-row" style="margin-top: 6px;">
                        <a class="ecp-btn ecp-btn-primary" id="ecpCopyBtn" style="font-size:12px; padding:6px;">📋 Copiar para Área de Transferência (C)</a>
                        <a class="ecp-btn ecp-btn-danger" id="ecpClearBtn" style="flex: 0 0 auto;">🗑️ Limpar</a>
                    </div>
                </div>
            </div>
        `;

        $('#tw-enhanced-coord-picker').remove();
        $('body').append(html);
        makeDraggable($('#tw-enhanced-coord-picker'), $('#ecpHeader'));

        function cleanStr(str) {
            if (!str) return '';
            try {
                return decodeURIComponent(str.replace(/\+/g, ' '));
            } catch (e) {
                return str.replace(/\+/g, ' ');
            }
        }

        function calcDistance(x1, y1, x2, y2) {
            return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
        }

        async function ensureWorldDataLoaded() {
            if (worldCache.villages && worldCache.players && worldCache.tribes) return true;
            if (worldCache.loading) {
                while (worldCache.loading) {
                    await new Promise(r => setTimeout(r, 100));
                }
                return true;
            }

            worldCache.loading = true;
            if (window.UI && UI.InfoMessage) {
                UI.InfoMessage('A descarregar dados do mundo (jogadores e aldeias)...', 3000);
            }

            try {
                const [playersCsv, tribesCsv, villagesCsv] = await Promise.all([
                    $.ajax({ url: '/map/player.txt', dataType: 'text' }),
                    $.ajax({ url: '/map/ally.txt', dataType: 'text' }),
                    $.ajax({ url: '/map/village.txt', dataType: 'text' })
                ]);

                worldCache.players = playersCsv.trim().split('\n').filter(Boolean).map(line => {
                    const parts = line.split(',');
                    return {
                        id: parseInt(parts[0], 10),
                        name: cleanStr(parts[1]),
                        allyId: parseInt(parts[2], 10),
                        villages: parseInt(parts[3], 10),
                        points: parseInt(parts[4], 10),
                        rank: parseInt(parts[5], 10)
                    };
                });

                worldCache.tribes = tribesCsv.trim().split('\n').filter(Boolean).map(line => {
                    const parts = line.split(',');
                    return {
                        id: parseInt(parts[0], 10),
                        name: cleanStr(parts[1]),
                        tag: cleanStr(parts[2]),
                        members: parseInt(parts[3], 10),
                        villages: parseInt(parts[4], 10),
                        points: parseInt(parts[5], 10),
                        rank: parseInt(parts[7], 10)
                    };
                });

                worldCache.villages = villagesCsv.trim().split('\n').filter(Boolean).map(line => {
                    const parts = line.split(',');
                    return {
                        id: parseInt(parts[0], 10),
                        name: cleanStr(parts[1]),
                        x: parseInt(parts[2], 10),
                        y: parseInt(parts[3], 10),
                        coord: `${parts[2]}|${parts[3]}`,
                        playerId: parseInt(parts[4], 10),
                        points: parseInt(parts[5], 10)
                    };
                });

                worldCache.loading = false;
                if (window.UI && UI.SuccessMessage) {
                    UI.SuccessMessage('Dados do mundo carregados!', 2000);
                }
                return true;
            } catch (err) {
                worldCache.loading = false;
                console.error('Erro ao carregar dados do mundo:', err);
                if (window.UI && UI.ErrorMessage) {
                    UI.ErrorMessage('Erro ao carregar dados do mundo!');
                }
                return false;
            }
        }

        function getVillageDataByCoord(x, y) {
            const key = parseInt(x, 10) * 1000 + parseInt(y, 10);
            const v = (window.TWMap && TWMap.villages) ? (TWMap.villages[key] || TWMap.villages[`${x}${y}`]) : null;

            let name = 'Aldeia';
            let ownerId = 0;
            let ownerName = 'Bárbara';
            let allyTag = '---';
            let points = 0;
            let id = 0;

            if (v) {
                id = v.id || 0;
                name = v.name || 'Aldeia';
                ownerId = (!v.owner || v.owner === '0' || v.owner === 0) ? 0 : parseInt(v.owner, 10);
                const rawPoints = v.points ? v.points.toString().replace(/\./g, '') : '0';
                points = parseInt(rawPoints, 10) || 0;

                if (ownerId !== 0 && window.TWMap && TWMap.players && TWMap.players[ownerId]) {
                    ownerName = TWMap.players[ownerId].name;
                    const allyId = TWMap.players[ownerId].ally;
                    if (allyId && TWMap.allies && TWMap.allies[allyId]) {
                        allyTag = TWMap.allies[allyId].tag;
                    }
                }
            } else if (worldCache.villages) {
                const worldV = worldCache.villages.find(wv => wv.x === x && wv.y === y);
                if (worldV) {
                    id = worldV.id;
                    name = worldV.name;
                    ownerId = worldV.playerId;
                    points = worldV.points;

                    if (ownerId !== 0 && worldCache.players) {
                        const pl = worldCache.players.find(p => p.id === ownerId);
                        if (pl) {
                            ownerName = pl.name;
                            const al = worldCache.tribes ? worldCache.tribes.find(t => t.id === pl.allyId) : null;
                            if (al) allyTag = al.tag;
                        }
                    }
                }
            }

            return {
                id: id,
                coord: `${x}|${y}`,
                x: parseInt(x, 10),
                y: parseInt(y, 10),
                name: name,
                owner: ownerId,
                ownerName: ownerName,
                allyTag: allyTag,
                points: points,
                dist: calcDistance(currentOrigin.x, currentOrigin.y, x, y)
            };
        }

        function checkFilters(points, dist, minPts, maxPts, maxRadius) {
            if (!isNaN(minPts) && points < minPts) return false;
            if (!isNaN(maxPts) && points > maxPts) return false;
            if (!isNaN(maxRadius) && dist > maxRadius) return false;
            return true;
        }

        function saveState() {
            historyStack.push(JSON.parse(JSON.stringify(selectedList)));
            if (historyStack.length > 25) historyStack.shift();
        }

        function formatVillages(list, formatType) {
            if (!list || list.length === 0) return '';
            switch (formatType) {
                case 'line':
                    return list.map(v => v.coord).join('\n');
                case 'bb_coord':
                    return list.map(v => `[coord]${v.coord}[/coord]`).join(' ');
                case 'bb_claim':
                    return list.map(v => `[claim]${v.coord}[/claim]`).join(' ');
                case 'coord_id':
                    return list.map(v => `${v.coord}:${v.id}`).join(' ');
                case 'bb_table': {
                    let table = '[table]\n[**]Coord[||]Aldeia[||]Jogador[||]Tribo[||]Pontos[||]Distância[/**]\n';
                    list.forEach(v => {
                        const distStr = v.dist.toFixed(1);
                        const ownerStr = v.owner === 0 ? 'Bárbara' : `[player]${v.ownerName}[/player]`;
                        const allyStr = v.allyTag !== '---' ? `[ally]${v.allyTag}[/ally]` : '---';
                        table += `[*][coord]${v.coord}[/coord][|]${v.name}[|]${ownerStr}[|]${allyStr}[|]${v.points.toLocaleString()}[|]${distStr} c\n`;
                    });
                    table += '[/table]';
                    return table;
                }
                case 'space':
                default:
                    return list.map(v => v.coord).join(' ');
            }
        }

        function refreshView() {
            const format = $('#ecpFormat').val();
            $('#ecpTextarea').val(formatVillages(selectedList, format));

            const barbsCount = selectedList.filter(v => v.owner === 0).length;
            const playersCount = selectedList.length - barbsCount;

            $('#ecpStatTotal').text(selectedList.length);
            $('#ecpStatBarbs').text(barbsCount);
            $('#ecpStatPlayers').text(playersCount);

            updateMapHighlights();
            if (betterMapConfig.enabled) {
                renderBetterMapLabels();
            }
        }

        function updateMapHighlights() {
            const selectedVillageIds = new Set();
            if (window.TWMap && TWMap.villages) {
                for (const v of selectedList) {
                    const [x, y] = v.coord.split('|');
                    const key = parseInt(x, 10) * 1000 + parseInt(y, 10);
                    const mapV = TWMap.villages[key] || TWMap.villages[`${x}${y}`];
                    if (mapV && mapV.id) {
                        selectedVillageIds.add(mapV.id.toString());
                    }
                }
            }

            $('[id^="map_village_"]').each(function () {
                const elId = this.id.replace('map_village_', '');
                if (selectedVillageIds.has(elId)) {
                    $(this).css('filter', 'drop-shadow(0 0 6px #00ff00) brightness(140%)');
                } else {
                    if (this.style.filter && this.style.filter !== 'none') {
                        $(this).css('filter', 'none');
                    }
                }
            });
        }

        // --- RENDERIZADOR DO BETTERMAP ---
        function renderBetterMapLabels() {
            $('.tw-ecp-map-label').remove();
            $('div[id*="dalesmckay_map_hilight_"]').remove();

            if (!betterMapConfig.enabled || typeof TWMap === 'undefined' || !TWMap.villages || !TWMap.map) {
                return;
            }

            const doc = document;
            const myself = (window.game_data && game_data.player) ? game_data.player.name : '';
            const selectedCoordsSet = new Set(selectedList.map(v => v.coord));

            const redTribes = new Set((betterMapConfig.redTribes || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
            const blueTribes = new Set((betterMapConfig.blueTribes || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
            const customPlayers = new Set((betterMapConfig.customPlayers || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean));

            const tileSize = TWMap.tileSize || [53, 38];
            const size = TWMap.size || [20, 20];
            const mapPos = (TWMap.map && TWMap.map.pos) ? TWMap.map.pos : [0, 0];

            for (let row = 0; row < size[1]; row++) {
                for (let col = 0; col < size[0]; col++) {
                    let coord = null;
                    if (TWMap.map.coordByPixel) {
                        coord = TWMap.map.coordByPixel(
                            mapPos[0] + (tileSize[0] * col),
                            mapPos[1] + (tileSize[1] * row)
                        );
                    }
                    if (!coord) continue;

                    const coordStr = `${coord[0]}|${coord[1]}`;
                    const key = coord[0] * 1000 + coord[1];
                    const village = TWMap.villages[key] || TWMap.villages[coord.join('')];
                    if (!village || !village.id) continue;

                    const tox = doc.getElementById('map_village_' + village.id);
                    if (!tox) continue;

                    const isBarb = (!village.owner || village.owner === '0' || village.owner === 0);
                    const player = (!isBarb && TWMap.players) ? TWMap.players[village.owner] : null;
                    const tribe = (player && player.ally && TWMap.allies) ? TWMap.allies[player.ally] : null;

                    const rawPts = village.points ? village.points.toString().replace(/\./g, '') : '0';
                    const points = parseInt(rawPts, 10) || 0;

                    if (isBarb) {
                        if (!betterMapConfig.showBarbs || points < betterMapConfig.minBarbPoints) continue;
                    } else {
                        if (!betterMapConfig.showPlayers) continue;
                        if (!betterMapConfig.showMyself && player && player.name === myself) continue;
                    }

                    let labelText = '';
                    if (isBarb) {
                        labelText = points >= 1000 ? `${(points / 1000).toFixed(1)}k pts` : `${points} pts`;
                    } else if (player) {
                        if (betterMapConfig.showTribes && tribe && tribe.tag) {
                            labelText = `[${tribe.tag}] ${player.name}`;
                        } else {
                            labelText = player.name;
                        }
                    }

                    let bkColor = 'rgba(0, 0, 0, 0.65)';
                    if (isBarb) {
                        bkColor = betterMapConfig.barbColor || '#7b1113';
                    } else if (player) {
                        const pNameLower = player.name.toLowerCase();
                        const tTagLower = (tribe && tribe.tag) ? tribe.tag.toLowerCase() : '';

                        if (customPlayers.has(pNameLower)) {
                            bkColor = '#6a1b9a'; // Roxo
                        } else if (redTribes.has(tTagLower)) {
                            bkColor = '#c62828'; // Vermelho
                        } else if (blueTribes.has(tTagLower)) {
                            bkColor = '#1565c0'; // Azul
                        } else if (player.name === myself) {
                            bkColor = '#2e7d32'; // Verde próprio
                        }
                    }

                    const isSelected = selectedCoordsSet.has(coordStr);
                    if (isSelected) {
                        bkColor = '#2e7d32'; // Verde destaque
                    }

                    const cssval = tox.style;
                    const div = doc.createElement('div');
                    div.id = 'tw_ecp_label_' + village.id;
                    div.className = 'tw-ecp-map-label';
                    div.style.position = cssval.position || 'absolute';
                    div.style.left = cssval.left;
                    div.style.top = (parseInt(cssval.top, 10) + Math.max(16, tileSize[1] - 14)) + 'px';
                    div.style.width = (tileSize[0] - 2) + 'px';
                    div.style.backgroundColor = bkColor;
                    div.style.opacity = '0.88';
                    div.style.border = isSelected ? '1.5px solid #00ff00' : '1px solid rgba(0,0,0,0.85)';
                    div.textContent = labelText;

                    $(tox).after(div);
                }
            }
        }

        function toggleVillage(coord) {
            saveState();
            const [x, y] = coord.split('|').map(n => parseInt(n, 10));
            const existingIdx = selectedList.findIndex(v => v.coord === coord);

            if (existingIdx >= 0) {
                selectedList.splice(existingIdx, 1);
                const key = x * 1000 + y;
                if (window.TWMap && TWMap.villages) {
                    const mapV = TWMap.villages[key] || TWMap.villages[`${x}${y}`];
                    if (mapV && mapV.id) {
                        $(`#map_village_${mapV.id}`).css('filter', 'none');
                    }
                }
            } else {
                const vData = getVillageDataByCoord(x, y);
                selectedList.push(vData);
            }
            refreshView();
        }

        // Interceptar clique no mapa com segurança
        let originalHandleClick = null;
        if (window.TWMap && TWMap.map && TWMap.map._handleClick) {
            originalHandleClick = TWMap.map._handleClick;
            TWMap.map._handleClick = function (e) {
                try {
                    const pos = this.coordByEvent(e);
                    if (!pos) return originalHandleClick.call(this, e);

                    const coord = pos.join('|');
                    const key = pos[0] * 1000 + pos[1];
                    const v = (TWMap.villages) ? (TWMap.villages[key] || TWMap.villages[`${pos[0]}${pos[1]}`]) : null;

                    if (v && v.id) {
                        toggleVillage(coord);
                        return false;
                    }
                    return originalHandleClick.call(this, e);
                } catch (err) {
                    return originalHandleClick ? originalHandleClick.call(this, e) : true;
                }
            };
        }

        // Chaining de onMove e spawnSector do TWMap
        let chainedOnMove = null;
        if (window.TWMap && TWMap.mapHandler) {
            if (TWMap.mapHandler.onMove) {
                chainedOnMove = TWMap.mapHandler.onMove;
            }
            TWMap.mapHandler.onMove = function (x, y) {
                if (chainedOnMove) chainedOnMove(x, y);
                if (betterMapConfig.enabled) {
                    setTimeout(renderBetterMapLabels, 15);
                }
            };

            if (!TWMap.mapHandler._ecpSpawnSector) {
                TWMap.mapHandler._ecpSpawnSector = TWMap.mapHandler.spawnSector;
                TWMap.mapHandler.spawnSector = function (data, sector) {
                    TWMap.mapHandler._ecpSpawnSector(data, sector);
                    setTimeout(function () {
                        updateMapHighlights();
                        if (betterMapConfig.enabled) {
                            renderBetterMapLabels();
                        }
                    }, 15);
                };
            }
        }

        // Eventos dos Controles do BetterMap no Painel
        $('#ecpBmEnable').on('change', function () {
            betterMapConfig.enabled = this.checked;
            $('#ecpBmControls').toggle(this.checked);
            saveBmConfig();
            if (this.checked) {
                renderBetterMapLabels();
            } else {
                $('.tw-ecp-map-label').remove();
            }
        });

        $('#ecpBmShowBarbs').on('change', function () {
            betterMapConfig.showBarbs = this.checked;
            saveBmConfig();
            renderBetterMapLabels();
        });

        $('#ecpBmShowPlayers').on('change', function () {
            betterMapConfig.showPlayers = this.checked;
            saveBmConfig();
            renderBetterMapLabels();
        });

        $('#ecpBmShowTribes').on('change', function () {
            betterMapConfig.showTribes = this.checked;
            saveBmConfig();
            renderBetterMapLabels();
        });

        $('#ecpBmMinBarbPts').on('input change', function () {
            betterMapConfig.minBarbPoints = parseInt($(this).val(), 10) || 0;
            saveBmConfig();
            renderBetterMapLabels();
        });

        $('#ecpToggleColorRules').on('click', function () {
            $('#ecpBmColorRules').slideToggle(150);
        });

        $('#ecpBmRedTribes').on('input change', function () {
            betterMapConfig.redTribes = $(this).val();
            saveBmConfig();
            renderBetterMapLabels();
        });

        $('#ecpBmBlueTribes').on('input change', function () {
            betterMapConfig.blueTribes = $(this).val();
            saveBmConfig();
            renderBetterMapLabels();
        });

        $('#ecpBmCustomPlayers').on('input change', function () {
            betterMapConfig.customPlayers = $(this).val();
            saveBmConfig();
            renderBetterMapLabels();
        });

        // BUSCA POR JOGADOR OU TRIBO
        $('#ecpSearchBtn').on('click', async function () {
            const query = $('#ecpSearchInput').val().trim();
            if (!query) {
                if (window.UI && UI.ErrorMessage) UI.ErrorMessage('Digite o nome do jogador ou a tag da tribo!', 3000);
                return;
            }

            const searchType = $('#ecpSearchType').val();
            const isWorldScope = $('#ecpWorldScope').is(':checked');
            const appendMode = $('#ecpAppendMode').is(':checked');

            const minPts = parseInt($('#ecpMinPoints').val(), 10);
            const maxPts = parseInt($('#ecpMaxPoints').val(), 10);
            const maxRadius = parseFloat($('#ecpRadius').val());

            saveState();
            if (!appendMode) {
                selectedList = [];
            }

            if (isWorldScope) {
                const loaded = await ensureWorldDataLoaded();
                if (!loaded) return;

                let targetPlayerIds = [];
                let targetEntityName = '';

                if (searchType === 'player') {
                    let player = worldCache.players.find(p => p.name.toLowerCase() === query.toLowerCase());
                    if (!player) {
                        player = worldCache.players.find(p => p.name.toLowerCase().includes(query.toLowerCase()));
                    }
                    if (!player) {
                        if (window.UI && UI.ErrorMessage) UI.ErrorMessage(`Jogador "${query}" não encontrado no mundo!`, 3500);
                        return;
                    }
                    targetPlayerIds = [player.id];
                    targetEntityName = `Jogador "${player.name}"`;
                } else {
                    let tribe = worldCache.tribes.find(t => t.tag.toLowerCase() === query.toLowerCase() || t.name.toLowerCase() === query.toLowerCase());
                    if (!tribe) {
                        tribe = worldCache.tribes.find(t => t.tag.toLowerCase().includes(query.toLowerCase()) || t.name.toLowerCase().includes(query.toLowerCase()));
                    }
                    if (!tribe) {
                        if (window.UI && UI.ErrorMessage) UI.ErrorMessage(`Tribo "${query}" não encontrada no mundo!`, 3500);
                        return;
                    }
                    const tribePlayers = worldCache.players.filter(p => p.allyId === tribe.id);
                    targetPlayerIds = tribePlayers.map(p => p.id);
                    targetEntityName = `Tribo [${tribe.tag}] (${tribePlayers.length} membros)`;
                }

                let countAdded = 0;
                const targetSet = new Set(targetPlayerIds);

                worldCache.villages.forEach(wv => {
                    if (targetSet.has(wv.playerId)) {
                        const dist = calcDistance(currentOrigin.x, currentOrigin.y, wv.x, wv.y);
                        if (checkFilters(wv.points, dist, minPts, maxPts, maxRadius)) {
                            if (!selectedList.some(s => s.coord === wv.coord)) {
                                selectedList.push(getVillageDataByCoord(wv.x, wv.y));
                                countAdded++;
                            }
                        }
                    }
                });

                refreshView();
                if (window.UI && UI.SuccessMessage) {
                    UI.SuccessMessage(`✅ ${countAdded} aldeias de ${targetEntityName} selecionadas!`, 4000);
                }

            } else {
                let countAdded = 0;
                if (window.TWMap && TWMap.villages) {
                    for (const key in TWMap.villages) {
                        const v = TWMap.villages[key];
                        if (!v || !v.xy || !v.owner || v.owner === '0') continue;

                        const ownerData = TWMap.players ? TWMap.players[v.owner] : null;
                        if (!ownerData) continue;

                        let matches = false;
                        if (searchType === 'player') {
                            matches = ownerData.name.toLowerCase().includes(query.toLowerCase());
                        } else {
                            const allyData = (ownerData.ally && TWMap.allies) ? TWMap.allies[ownerData.ally] : null;
                            if (allyData) {
                                matches = allyData.tag.toLowerCase().includes(query.toLowerCase()) || allyData.name.toLowerCase().includes(query.toLowerCase());
                            }
                        }

                        if (matches) {
                            const xyStr = v.xy.toString();
                            const x = parseInt(xyStr.slice(0, 3), 10);
                            const y = parseInt(xyStr.slice(3, 6), 10);
                            const coord = `${x}|${y}`;
                            const rawPoints = v.points ? v.points.toString().replace(/\./g, '') : '0';
                            const points = parseInt(rawPoints, 10) || 0;
                            const dist = calcDistance(currentOrigin.x, currentOrigin.y, x, y);

                            if (checkFilters(points, dist, minPts, maxPts, maxRadius)) {
                                if (!selectedList.some(s => s.coord === coord)) {
                                    selectedList.push(getVillageDataByCoord(x, y));
                                    countAdded++;
                                }
                            }
                        }
                    }
                }

                refreshView();
                if (window.UI && UI.SuccessMessage) {
                    UI.SuccessMessage(`✅ ${countAdded} aldeias encontradas no mapa visível!`, 3500);
                }
            }
        });

        $('#ecpSearchInput').on('keypress', function (e) {
            if (e.which === 13) $('#ecpSearchBtn').click();
        });

        $('#ecpWorldScope').on('change', function () {
            $('#ecpScopeIndicator').text(this.checked ? 'Mundo Todo' : 'Mapa Visível');
        });

        $('#ecpApplyFilterToList').on('click', function () {
            saveState();
            const minPts = parseInt($('#ecpMinPoints').val(), 10);
            const maxPts = parseInt($('#ecpMaxPoints').val(), 10);
            const maxRadius = parseFloat($('#ecpRadius').val());

            const before = selectedList.length;
            selectedList = selectedList.filter(v => checkFilters(v.points, v.dist, minPts, maxPts, maxRadius));
            refreshView();
            if (window.UI && UI.InfoMessage) {
                UI.InfoMessage(`Filtro aplicado: ${selectedList.length} mantidas (${before - selectedList.length} removidas).`, 3000);
            }
        });

        $('#ecpSelectBarbs').on('click', function () {
            saveState();
            const minPts = parseInt($('#ecpMinPoints').val(), 10);
            const maxPts = parseInt($('#ecpMaxPoints').val(), 10);
            const maxRadius = parseFloat($('#ecpRadius').val());

            let added = 0;
            if (window.TWMap && TWMap.villages) {
                for (const key in TWMap.villages) {
                    const v = TWMap.villages[key];
                    if (!v || !v.xy) continue;

                    const isBarb = (!v.owner || v.owner === '0' || v.owner === 0);
                    if (!isBarb) continue;

                    const xyStr = v.xy.toString();
                    const x = parseInt(xyStr.slice(0, 3), 10);
                    const y = parseInt(xyStr.slice(3, 6), 10);
                    const coord = `${x}|${y}`;
                    const rawPoints = v.points ? v.points.toString().replace(/\./g, '') : '0';
                    const points = parseInt(rawPoints, 10) || 0;
                    const dist = calcDistance(currentOrigin.x, currentOrigin.y, x, y);

                    if (checkFilters(points, dist, minPts, maxPts, maxRadius)) {
                        if (!selectedList.some(s => s.coord === coord)) {
                            selectedList.push(getVillageDataByCoord(x, y));
                            added++;
                        }
                    }
                }
            }
            refreshView();
            if (window.UI && UI.SuccessMessage) {
                UI.SuccessMessage(`${added} aldeias bárbaras selecionadas!`, 2500);
            }
        });

        $('#ecpSelectPlayers').on('click', function () {
            saveState();
            const minPts = parseInt($('#ecpMinPoints').val(), 10);
            const maxPts = parseInt($('#ecpMaxPoints').val(), 10);
            const maxRadius = parseFloat($('#ecpRadius').val());

            let added = 0;
            if (window.TWMap && TWMap.villages) {
                for (const key in TWMap.villages) {
                    const v = TWMap.villages[key];
                    if (!v || !v.xy) continue;

                    const isPlayer = (v.owner && v.owner !== '0' && v.owner !== 0 && parseInt(v.owner, 10) !== parseInt(gameData.player.id, 10));
                    if (!isPlayer) continue;

                    const xyStr = v.xy.toString();
                    const x = parseInt(xyStr.slice(0, 3), 10);
                    const y = parseInt(xyStr.slice(3, 6), 10);
                    const coord = `${x}|${y}`;
                    const rawPoints = v.points ? v.points.toString().replace(/\./g, '') : '0';
                    const points = parseInt(rawPoints, 10) || 0;
                    const dist = calcDistance(currentOrigin.x, currentOrigin.y, x, y);

                    if (checkFilters(points, dist, minPts, maxPts, maxRadius)) {
                        if (!selectedList.some(s => s.coord === coord)) {
                            selectedList.push(getVillageDataByCoord(x, y));
                            added++;
                        }
                    }
                }
            }
            refreshView();
            if (window.UI && UI.SuccessMessage) {
                UI.SuccessMessage(`${added} aldeias de jogadores selecionadas!`, 2500);
            }
        });

        $('#ecpSyncBtn').on('click', function () {
            saveState();
            const text = $('#ecpTextarea').val();
            const matches = text.match(/\d{1,3}\|\d{1,3}/g);

            if (!matches || matches.length === 0) {
                if (window.UI && UI.ErrorMessage) UI.ErrorMessage('Nenhuma coordenada válida encontrada no texto!', 3000);
                return;
            }

            const uniqueCoords = Array.from(new Set(matches));
            selectedList = uniqueCoords.map(coord => {
                const [x, y] = coord.split('|').map(n => parseInt(n, 10));
                return getVillageDataByCoord(x, y);
            });

            refreshView();
            if (window.UI && UI.SuccessMessage) {
                UI.SuccessMessage(`${selectedList.length} coordenadas sincronizadas e marcadas!`, 2500);
            }
        });

        $('#ecpSortDistAsc').on('click', function () {
            saveState();
            selectedList.sort((a, b) => a.dist - b.dist);
            refreshView();
            if (window.UI && UI.SuccessMessage) UI.SuccessMessage('Ordenado por proximidade (crescente)!', 1500);
        });

        $('#ecpSortDistDesc').on('click', function () {
            saveState();
            selectedList.sort((a, b) => b.dist - a.dist);
            refreshView();
            if (window.UI && UI.SuccessMessage) UI.SuccessMessage('Ordenado por distância (decrescente)!', 1500);
        });

        $('#ecpSortPoints').on('click', function () {
            saveState();
            selectedList.sort((a, b) => b.points - a.points);
            refreshView();
            if (window.UI && UI.SuccessMessage) UI.SuccessMessage('Ordenado por pontos (maior primeiro)!', 1500);
        });

        $('#ecpShuffle').on('click', function () {
            saveState();
            for (let i = selectedList.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [selectedList[i], selectedList[j]] = [selectedList[j], selectedList[i]];
            }
            refreshView();
            if (window.UI && UI.SuccessMessage) UI.SuccessMessage('Lista embaralhada!', 1500);
        });

        $('#ecpUndoBtn').on('click', function () {
            if (historyStack.length > 0) {
                selectedList = historyStack.pop();
                refreshView();
                if (window.UI && UI.InfoMessage) UI.InfoMessage('Ação desfeita!', 1500);
            } else {
                if (window.UI && UI.InfoMessage) UI.InfoMessage('Nada para desfazer!', 1500);
            }
        });

        $('#ecpFormat').on('change', refreshView);

        $('#ecpCopyBtn').on('click', function () {
            const text = $('#ecpTextarea').val().trim();
            if (!text) {
                if (window.UI && UI.ErrorMessage) UI.ErrorMessage('Nada para copiar!', 2000);
                return;
            }

            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(() => {
                    if (window.UI && UI.SuccessMessage) UI.SuccessMessage('Copiado para a área de transferência!', 2500);
                }).catch(() => fallbackCopy());
            } else {
                fallbackCopy();
            }

            function fallbackCopy() {
                $('#ecpTextarea').select();
                document.execCommand('copy');
                if (window.UI && UI.SuccessMessage) UI.SuccessMessage('Copiado com sucesso!', 2500);
            }
        });

        // Atalhos de Teclado: Tecla 'C' para copiar | Tecla 'ESC' para fechar
        $(document).off('keydown.ecpHotkeys').on('keydown.ecpHotkeys', function (e) {
            // Tecla ESC para fechar o script
            if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) {
                e.preventDefault();
                $('#ecpClose').trigger('click');
                return;
            }

            const activeEl = document.activeElement;
            const activeTag = activeEl ? activeEl.tagName.toLowerCase() : '';
            const isEditable = activeEl ? activeEl.isContentEditable : false;

            // Não acionar cópia quando o utilizador estiver a digitar em campos de texto
            if (activeTag === 'input' || activeTag === 'textarea' || isEditable) {
                return;
            }

            // Tecla 'C' ou 'c' isolada (sem Ctrl, Alt ou Meta)
            if ((e.key === 'c' || e.key === 'C' || e.code === 'KeyC') && !e.ctrlKey && !e.altKey && !e.metaKey) {
                e.preventDefault();
                $('#ecpCopyBtn').trigger('click');
            }
        });

        $('#ecpClearBtn').on('click', function () {
            if (selectedList.length === 0) return;
            saveState();
            selectedList = [];
            $('[id^="map_village_"]').css('filter', 'none');
            refreshView();
            if (window.UI && UI.SuccessMessage) UI.SuccessMessage('Seleção limpa!', 2000);
        });

        $('#ecpToggleCollapse').on('click', function () {
            const body = $('#ecpBody');
            if (body.is(':visible')) {
                body.hide();
                $(this).text('+');
            } else {
                body.show();
                $(this).text('_');
            }
        });

        $('#ecpClose').on('click', function () {
            if (window.TWMap && TWMap.map && originalHandleClick) {
                TWMap.map._handleClick = originalHandleClick;
            }
            if (window.TWMap && TWMap.mapHandler && TWMap.mapHandler._ecpSpawnSector) {
                TWMap.mapHandler.spawnSector = TWMap.mapHandler._ecpSpawnSector;
                delete TWMap.mapHandler._ecpSpawnSector;
            }
            if (window.TWMap && TWMap.mapHandler && chainedOnMove) {
                TWMap.mapHandler.onMove = chainedOnMove;
            }
            $(document).off('keydown.ecpHotkeys');
            $('[id^="map_village_"]').css('filter', 'none');
            $('.tw-ecp-map-label').remove();
            $('div[id*="dalesmckay_map_hilight_"]').remove();
            $('#tw-enhanced-coord-picker').remove();
            $('#tw-ecp-styles').remove();
            if (window.UI && UI.InfoMessage) UI.InfoMessage('Coletor de Coordenadas encerrado.', 2000);
        });

        function makeDraggable(element, handle) {
            let isDragging = false;
            let startX, startY, origLeft, origTop;

            handle.on('mousedown', function (e) {
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                const offset = element.offset();
                origLeft = offset.left;
                origTop = offset.top;

                $(document).on('mousemove.ecpDrag', function (e) {
                    if (!isDragging) return;
                    element.css({
                        left: origLeft + (e.clientX - startX) + 'px',
                        top: origTop + (e.clientY - startY) + 'px',
                        right: 'auto'
                    });
                });

                $(document).on('mouseup.ecpDrag', function () {
                    isDragging = false;
                    $(document).off('.ecpDrag');
                });
                e.preventDefault();
            });
        }

        // Execução inicial dos rótulos
        if (betterMapConfig.enabled) {
            setTimeout(renderBetterMapLabels, 100);
        }

        if (window.UI && UI.SuccessMessage) {
            UI.SuccessMessage('📍 Coletor + BetterMap v3.5 pronto a usar!', 2500);
        }
    } catch (err) {
        console.error('Erro crítico no Coletor de Coordenadas:', err);
        alert('Erro ao iniciar o script: ' + err.message);
    }
})();
