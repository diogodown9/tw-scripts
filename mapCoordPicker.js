/**
 * Script Name: Enhanced Map Coord Picker v3.0 (Coletor Avançado por Jogador, Tribo e Pontos)
 * Autor Original: RedAlert | Versão Aprimorada
 * Compatível com Tribal Wars / Tribos PT/BR
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
                width: 380px;
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
        `;

        $('#tw-ecp-styles').remove();
        $('head').append(`<style id="tw-ecp-styles">${customCss}</style>`);

        const html = `
            <div id="tw-enhanced-coord-picker">
                <div class="ecp-header" id="ecpHeader">
                    <span class="ecp-title">📍 Coletor Avançado de Coordenadas</span>
                    <div class="ecp-header-btns">
                        <span id="ecpToggleCollapse" title="Minimizar / Expandir">_</span>
                        <span id="ecpClose" title="Fechar">✕</span>
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

                    <!-- Seção 4: Lista de Coordenadas e Contadores -->
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

                    <!-- Seção 5: Formato de Saída e Ordenação -->
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
                        <a class="ecp-btn ecp-btn-primary" id="ecpCopyBtn" style="font-size:12px; padding:6px;">📋 Copiar para Área de Transferência</a>
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
            const v = (window.TWMap && TWMap.villages) ? TWMap.villages[key] : null;

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
        }

        function updateMapHighlights() {
            if (selectedList.length === 0) {
                $('[id^="map_village_"]').css('filter', 'none');
                return;
            }

            const selectedCoords = new Set(selectedList.map(v => v.coord));
            for (const coord of selectedCoords) {
                const [x, y] = coord.split('|');
                const key = parseInt(x, 10) * 1000 + parseInt(y, 10);
                const v = (window.TWMap && TWMap.villages) ? TWMap.villages[key] : null;
                if (v && v.id) {
                    $(`#map_village_${v.id}`).css({
                        filter: 'drop-shadow(0 0 5px #00ff00) brightness(140%)'
                    });
                }
            }
        }

        function toggleVillage(coord) {
            saveState();
            const [x, y] = coord.split('|').map(n => parseInt(n, 10));
            const existingIdx = selectedList.findIndex(v => v.coord === coord);

            if (existingIdx >= 0) {
                selectedList.splice(existingIdx, 1);
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
                    const v = (TWMap.villages) ? TWMap.villages[key] : null;

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

        if (window.TWMap && TWMap.mapHandler) {
            if (!TWMap.mapHandler._ecpSpawnSector) {
                TWMap.mapHandler._ecpSpawnSector = TWMap.mapHandler.spawnSector;
                TWMap.mapHandler.spawnSector = function (data, sector) {
                    TWMap.mapHandler._ecpSpawnSector(data, sector);
                    setTimeout(updateMapHighlights, 15);
                };
            }
        }

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
            $('[id^="map_village_"]').css('filter', 'none');
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

        if (window.UI && UI.SuccessMessage) {
            UI.SuccessMessage('📍 Coletor Avançado v3.0 pronto a usar!', 2500);
        }
    } catch (err) {
        console.error('Erro crítico no Coletor de Coordenadas:', err);
        alert('Erro ao iniciar o script: ' + err.message);
    }
})();
