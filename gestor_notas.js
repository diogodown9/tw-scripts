(() => {
    'use strict';

    const gameData = window.game_data;
    const urlParams = new URLSearchParams(window.location.search);
    const currentScreen = urlParams.get('screen');
    const currentView = urlParams.get('view');

    // ==========================================
    // 0. REDIRECIONAMENTO INTELIGENTE (ACESSO RÁPIDO)
    // ==========================================
    if (currentScreen !== 'report' && currentScreen !== 'info_command') {
        if (typeof window.UI !== 'undefined') {
            window.UI.InfoMessage('A redirecionar para a página de relatórios...', 2000, 'success');
        }
        setTimeout(() => { window.location.href = gameData.link_base_pure + 'report'; }, 800);
        return;
    }

    if (currentScreen === 'report' && !currentView) {
        const firstReport = document.querySelector('a[href*="screen=report"][href*="&view="]');
        if (firstReport) {
            if (typeof window.UI !== 'undefined') {
                window.UI.InfoMessage('A abrir o relatório mais recente... Clica no script novamente quando abrir!', 3000, 'success');
            }
            setTimeout(() => { window.location.href = firstReport.href; }, 1000);
        } else {
            if (typeof window.UI !== 'undefined') {
                window.UI.ErrorMessage('Nenhum relatório encontrado nesta página.', 3000);
            }
        }
        return;
    }

    // ==========================================
    // 1. CONFIGURAÇÕES BASE
    // ==========================================
    const CFG = {
        FAKE_LIMIT: 250,
        HIGH_THREAT_POP: 18000,
        FARM_CAPACITY: 24000,
        DELAYS: { MIN: 50, MAX: 150 }, 
        STORAGE: {
            HISTORY: `tw_notas_history_${gameData.world}`,
            STATE: `tw_notas_running_${gameData.world}`,
            DB: `tw_notas_db_${gameData.world}`,
            OWNED: `tw_notas_owned_${gameData.world}`,
            ENEMIES: `tw_notas_enemies_${gameData.world}`,
            CLEANED: `tw_notas_cleaned_${gameData.world}`,
            LIMIT_HOURS: `tw_notas_limit_hours_${gameData.world}`
        },
        UNITS: {
            POP: { spear: 1, sword: 1, axe: 1, archer: 1, spy: 2, light: 4, marcher: 5, heavy: 6, ram: 5, catapult: 8, knight: 10, snob: 100 },
            OFF: ['axe', 'light', 'marcher', 'ram', 'catapult'],
            DEF: ['spear', 'sword', 'archer', 'heavy']
        }
    };

    // ==========================================
    // 2. MÓDULO DE BASE DE DADOS
    // ==========================================
    const DB = {
        getHistory: () => JSON.parse(localStorage.getItem(CFG.STORAGE.HISTORY) || '[]'),
        saveHistory: (id) => {
            const h = DB.getHistory();
            if (!h.includes(id)) { h.push(id); if (h.length > 3000) h.shift(); localStorage.setItem(CFG.STORAGE.HISTORY, JSON.stringify(h)); }
        },
        clearHistory: () => { localStorage.removeItem(CFG.STORAGE.HISTORY); location.reload(); },
        
        getOwned: () => JSON.parse(localStorage.getItem(CFG.STORAGE.OWNED) || '[]'),
        addOwned: (id) => {
            const list = DB.getOwned();
            if (!list.includes(id)) { list.push(id); if (list.length > 1500) list.shift(); localStorage.setItem(CFG.STORAGE.OWNED, JSON.stringify(list)); }
        },
        isOwned: (id) => DB.getOwned().includes(id),

        getKnownEnemies: () => JSON.parse(localStorage.getItem(CFG.STORAGE.ENEMIES) || '[]'),
        addKnownEnemy: (id) => {
            const list = DB.getKnownEnemies();
            if (!list.includes(id)) { list.push(id); if (list.length > 3000) list.shift(); localStorage.setItem(CFG.STORAGE.ENEMIES, JSON.stringify(list)); }
        },

        getCleaned: () => JSON.parse(localStorage.getItem(CFG.STORAGE.CLEANED) || '[]'),
        markCleaned: (id) => {
            const list = DB.getCleaned();
            if (!list.includes(id)) { list.push(id); if (list.length > 1500) list.shift(); localStorage.setItem(CFG.STORAGE.CLEANED, JSON.stringify(list)); }
        },
        isCleaned: (id) => DB.getCleaned().includes(id),

        getSessionCache: () => JSON.parse(sessionStorage.getItem('tw_notas_session_cache') || '[]'),
        addToSession: (id) => {
            const cache = DB.getSessionCache();
            if(!cache.includes(id)) { cache.push(id); sessionStorage.setItem('tw_notas_session_cache', JSON.stringify(cache)); }
        },
        clearSession: () => sessionStorage.removeItem('tw_notas_session_cache'),

        getVillage: (id) => {
            const vData = JSON.parse(localStorage.getItem(CFG.STORAGE.DB))?.[id] || { spy: null, attacks: [], outgoing: [], tags: [] };
            if (typeof vData.spy === 'string') vData.spy = { id: 0, text: vData.spy };
            if (vData.attacks && vData.attacks.length > 0 && typeof vData.attacks[0] === 'string') {
                vData.attacks = vData.attacks.map((text, idx) => ({ id: idx, text }));
            }
            if (vData.outgoing && vData.outgoing.length > 0 && typeof vData.outgoing[0] === 'string') {
                vData.outgoing = vData.outgoing.map((text, idx) => ({ id: idx, text }));
            }
            return vData;
        },
        saveVillage: (id, data) => {
            const db = JSON.parse(localStorage.getItem(CFG.STORAGE.DB) || '{}');
            db[id] = data; localStorage.setItem(CFG.STORAGE.DB, JSON.stringify(db));
        },
        deleteVillage: (id) => {
            const db = JSON.parse(localStorage.getItem(CFG.STORAGE.DB) || '{}');
            delete db[id]; localStorage.setItem(CFG.STORAGE.DB, JSON.stringify(db));
        },
        isRunning: () => localStorage.getItem(CFG.STORAGE.STATE) === 'true',
        setState: (state) => localStorage.setItem(CFG.STORAGE.STATE, state ? 'true' : 'false')
    };

    // ==========================================
    // 3. EXTRATOR DE DADOS E HELPERS
    // ==========================================
    const Utils = {
        formatNum: (num) => parseInt(num).toLocaleString('de'),
        delay: (min, max) => new Promise(res => setTimeout(res, Math.floor(Math.random() * (max - min + 1)) + min)),
        wrapBB: (text, type) => `[${type}]${text}[/${type}]`,

        parseTWDate: (dateStr) => {
            const now = new Date();
            let d = now.getDate(), mo = now.getMonth(), y = now.getFullYear();
            
            const timeMatch = dateStr.match(/(\d{2}):(\d{2}):(\d{2})/);
            if (!timeMatch) return Date.now();
            const hr = parseInt(timeMatch[1], 10), min = parseInt(timeMatch[2], 10), sec = parseInt(timeMatch[3], 10);

            if (dateStr.toLowerCase().includes('hoje')) {
                // Mantém hoje
            } else if (dateStr.toLowerCase().includes('ontem')) {
                const yesterday = new Date(now.getTime() - 86400000);
                d = yesterday.getDate(); mo = yesterday.getMonth(); y = yesterday.getFullYear();
            } else {
                const dateMatch = dateStr.match(/(\d{2})\.(\d{2})\./); 
                if (dateMatch) {
                    d = parseInt(dateMatch[1], 10);
                    mo = parseInt(dateMatch[2], 10) - 1;
                    const yearMatch = dateStr.match(/\d{2}\.\d{2}\.(\d{2})/);
                    if (yearMatch) y = 2000 + parseInt(yearMatch[1], 10);
                }
            }
            return new Date(y, mo, d, hr, min, sec).getTime();
        },

        parseVillageFromTable: (tableId) => {
            const tbl = document.getElementById(tableId);
            if (!tbl) return null;
            const text = tbl.rows[1]?.cells[1]?.textContent.trim() || '';
            const match = text.match(/(.+?)\s*\((\d{3}\|\d{3})\)\s*K\d{2}/);
            return { name: match ? match[1].trim() : text, raw: text, coord: match ? match[2] : '---' };
        },

        extractBuildings: () => {
            let wall = '?', farm = '?', tower = '?', hq = '?';
            const html = document.getElementById('content_value').innerHTML;
            const text = document.getElementById('content_value').innerText;

            const wallMatch = html.match(/building wall.*?(\d+)/i) || text.match(/Muralha\s*(?:Nível\s*)?(\d+)/i);
            const farmMatch = html.match(/building farm.*?(\d+)/i) || text.match(/Fazenda\s*(?:Nível\s*)?(\d+)/i);
            const towerMatch = html.match(/building watchtower.*?(\d+)/i) || text.match(/Torre de vigia\s*(?:Nível\s*)?(\d+)/i);
            const hqMatch = html.match(/building main.*?(\d+)/i) || text.match(/Edifício Principal\s*(?:Nível\s*)?(\d+)/i);

            if (wallMatch) wall = wallMatch[1];
            if (farmMatch) farm = farmMatch[1];
            if (towerMatch) tower = towerMatch[1];
            if (hqMatch) hq = hqMatch[1];

            let loyalty = null;
            const loyaltyMatch = text.match(/Lealdade desceu de \d+ para (-?\d+)/i);
            if (loyaltyMatch) loyalty = parseInt(loyaltyMatch[1]);

            let troopsOutside = false;
            const $awayTable = jQuery('#attack_spy_away');
            if ($awayTable.length) {
                $awayTable.find('tr').eq(1).find('td').each(function() {
                    const count = parseInt(jQuery(this).text().trim().replace(/\./g, '')) || 0;
                    if (count > 0) { troopsOutside = true; return false; }
                });
            }

            const hasInfo = html.includes('Espionagem') || html.includes('attack_spy');
            return { wall, farm, tower, hq, loyalty, troopsOutside, hasInfo };
        },

        buildFinalNote: (vData) => {
            let finalNote = '';
            if (vData.tags && vData.tags.length > 0) finalNote += `[b][u]TIPO DE ALDEIA[/u][/b]\n${vData.tags.join('\n')}\n\n`;
            if (vData.spy && vData.spy.text) finalNote += `[b][u]ÚLTIMA ESPIONAGEM[/u][/b]\n${vData.spy.text}\n\n`;
            
            if (vData.attacks && vData.attacks.length > 0) {
                finalNote += `[b][u]HISTÓRICO DE ATAQUES (NOSSOS)[/u][/b]\n` + vData.attacks.map(a => a.text || a).join('\n\n---\n\n') + '\n\n';
            }
            if (vData.outgoing && vData.outgoing.length > 0) {
                finalNote += `[b][u]ATAQUES LANÇADOS CONTRA NÓS[/u][/b]\n` + vData.outgoing.map(a => a.text || a).join('\n\n---\n\n') + '\n\n';
            }
            return finalNote.trim();
        }
    };

    // ==========================================
    // 4. CLASSIFICADOR DE ALDEIAS
    // ==========================================
    const TacticalEngine = {
        analyzeDefense: () => {
            let offPop = 0, defPop = 0, totalPop = 0, hasSnob = false;

            const countPop = (idx, countText) => {
                const count = parseInt(countText.replace(/\./g, '')) || 0;
                const unit = gameData.units[idx];
                if (unit && count > 0) {
                    const pop = count * (CFG.UNITS.POP[unit] || 1);
                    if (CFG.UNITS.OFF.includes(unit)) offPop += pop;
                    if (CFG.UNITS.DEF.includes(unit)) defPop += pop;
                    if (unit === 'snob') hasSnob = true;
                    totalPop += pop;
                }
            };

            jQuery('#attack_info_def tr').each(function() {
                const $row = jQuery(this);
                if ($row.find('td').eq(0).text().toLowerCase().includes('quantidade')) {
                    $row.find('td').each(function(idx) {
                        if (idx === 0) return;
                        countPop(idx - 1, jQuery(this).text().trim());
                    });
                }
            });

            const $spyTbl = jQuery('#attack_spy_def_troops');
            if ($spyTbl.length) {
                $spyTbl.find('tr').eq(1).find('td').each(function(idx) { countPop(idx, jQuery(this).text().trim()); });
            }

            const tags = [];
            if (hasSnob) tags.push('🔴 [ALVO - CONTÉM NOBRES]');
            if (offPop > CFG.HIGH_THREAT_POP) tags.push('💥 [FULL ATAQUE INIMIGO]');
            else if (defPop > CFG.HIGH_THREAT_POP) tags.push('🛡️ [BUNKER / FULL DEFESA]');
            else if (offPop > defPop * 1.5) tags.push('⚔️ [Aldeia Ofensiva]');
            else if (defPop > offPop * 1.5) tags.push('🛡️ [Aldeia Defensiva]');
            else if (offPop > 0 || defPop > 0) tags.push('⚖️ [Aldeia Mista]');

            return { tags, totalDefPop: totalPop };
        }
    };

    // ==========================================
    // 5. INTERFACE DO UTILIZADOR
    // ==========================================
    const UI = {
        setupSidebarLayout: () => {
            if (document.getElementById('ra-sidebar-wrapper')) return document.getElementById('ra-sidebar-wrapper');
            const contentValue = document.getElementById('content_value');
            if (!contentValue) return null;

            contentValue.style.display = 'flex';
            contentValue.style.alignItems = 'flex-start';
            contentValue.style.gap = '15px';

            const leftWrapper = document.createElement('div');
            leftWrapper.style.flex = '1';
            leftWrapper.style.minWidth = '0';

            while (contentValue.firstChild) leftWrapper.appendChild(contentValue.firstChild);

            const rightWrapper = document.createElement('div');
            rightWrapper.id = 'ra-sidebar-wrapper';
            rightWrapper.style.width = '320px';
            rightWrapper.style.flexShrink = '0';
            rightWrapper.style.marginTop = '65px';

            contentValue.appendChild(leftWrapper);
            contentValue.appendChild(rightWrapper);

            return rightWrapper;
        },

        renderDashboard: (reportId, isSaved) => {
            if (document.getElementById('ra-notas-dashboard')) return;

            const sidebar = UI.setupSidebarLayout();
            if (!sidebar) return;

            const statusBadge = isSaved
                ? `<span style="color: green; font-weight: bold;">✔ Processado</span>`
                : `<button id="btn-manual" class="btn" style="width:100%;">Extrair Nota</button>`;
                
            const savedLimit = localStorage.getItem(CFG.STORAGE.LIMIT_HOURS) || '36';

            const html = `
                <table id="ra-notas-dashboard" class="vis" style="width: 100%; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <tbody>
                        <tr>
                            <th>
                                <div style="display: flex; justify-content: space-between;">
                                    <span>Gestor de Notas TW</span>
                                </div>
                            </th>
                        </tr>
                        <tr>
                            <td style="text-align: center; padding: 10px;">
                                <strong>Estado da Leitura:</strong><br>
                                <div id="action-container" style="margin-top: 5px;">${statusBadge}</div>
                            </td>
                        </tr>
                        <tr>
                            <th style="text-align: center;">Navegação Automática</th>
                        </tr>
                        <tr>
                            <td style="padding: 10px; display: flex; flex-direction: column; gap: 8px;">
                                <div style="display: flex; justify-content: center; align-items: center; gap: 5px;">
                                    <label for="ra-hour-limit" style="font-size: 11px;">Parar após relatórios mais antigos que (Horas):</label>
                                    <input type="number" id="ra-hour-limit" value="${savedLimit}" style="width: 45px; padding: 2px; text-align: center;">
                                </div>
                                <button id="btn-auto-start" class="btn">▶ Iniciar Leitura Automática</button>
                                <button id="btn-auto-stop" class="btn btn-cancel" style="display: none;">⏹ Parar Bot</button>
                            </td>
                        </tr>
                        <tr>
                            <td style="text-align: center; padding: 8px;">
                                <a href="#" id="btn-clear" style="font-size: 10px; color: #a52a2a;">🗑️ Limpar Memória de Leitura</a>
                            </td>
                        </tr>
                    </tbody>
                </table>
            `;

            sidebar.innerHTML = html;

            document.getElementById('ra-hour-limit')?.addEventListener('change', (e) => {
                localStorage.setItem(CFG.STORAGE.LIMIT_HOURS, e.target.value);
            });

            document.getElementById('btn-manual')?.addEventListener('click', async (e) => {
                e.target.disabled = true; e.target.textContent = 'A processar...'; await Engine.process(false);
            });
            
            document.getElementById('btn-auto-start')?.addEventListener('click', async () => {
                DB.clearSession();
                DB.setState(true); 
                UI.toggleAuto(true); 
                await Engine.process(true);
            });
            
            document.getElementById('btn-auto-stop')?.addEventListener('click', () => {
                DB.setState(false); UI.toggleAuto(false);
            });
            
            document.getElementById('btn-clear')?.addEventListener('click', (e) => {
                e.preventDefault(); if (confirm("Redefinir memória de relatórios lidos?")) DB.clearHistory();
            });

            if (DB.isRunning()) UI.toggleAuto(true);
        },

        toggleAuto: (isRunning) => {
            const startBtn = document.getElementById('btn-auto-start');
            const stopBtn = document.getElementById('btn-auto-stop');
            if(startBtn) startBtn.style.display = isRunning ? 'none' : 'block';
            if(stopBtn) stopBtn.style.display = isRunning ? 'block' : 'none';
        }
    };

    // ==========================================
    // 6. MOTOR DE PROCESSAMENTO
    // ==========================================
    const Engine = {
        next: async () => {
            const nextBtn = document.getElementById('report-previous') || document.getElementById('report-prev');
            if (nextBtn) {
                await Utils.delay(CFG.DELAYS.MIN, CFG.DELAYS.MAX);
                nextBtn.click();
            } else {
                DB.setState(false);
                UI.toggleAuto(false);
                if (window.UI) window.UI.SuccessMessage('Leitura da pasta concluída.');
            }
        },

        process: async (isAuto) => {
            const reportId = currentView;
            const reportIdNum = parseInt(reportId, 10);

            if (isAuto && DB.getHistory().includes(reportId)) {
                DB.setState(false); return;
            }

            const $attTable = jQuery('table#attack_info_att');
            const $defTable = jQuery('table#attack_info_def');
            if (!$defTable.length || !$attTable.length) {
                if (isAuto) return Engine.next();
                if (window.UI) window.UI.ErrorMessage("Sem informações de batalha válidas.");
                return;
            }

            const reportTimeText = $defTable.closest('table').find('tr:eq(1) td:eq(1)').text().trim();
            const reportTimestamp = Utils.parseTWDate(reportTimeText);
            const limitHours = parseFloat(localStorage.getItem(CFG.STORAGE.LIMIT_HOURS) || '36');
            const elapsedHours = (Date.now() - reportTimestamp) / 3600000;

            if (isAuto && elapsedHours > limitHours) {
                DB.setState(false);
                UI.toggleAuto(false);
                document.getElementById('action-container').innerHTML = `<span style="color: #a52a2a; font-weight: bold;">⏹ Parado (Limite de Horas Atingido)</span>`;
                if (window.UI) window.UI.SuccessMessage(`Leitura parada automaticamente: Encontrado relatório com mais de ${limitHours}h.`);
                return;
            }

            const attVillageId = $attTable.find('span[data-id]').first().attr('data-id');
            const defVillageId = $defTable.find('span[data-id]').first().attr('data-id');
            
            const attackerName = $attTable[0].rows[0].cells[1].textContent.trim();
            const defenderName = $defTable[0].rows[0].cells[1].textContent.trim();
            const isSelfAttack = (attackerName === gameData.player.name && defenderName === gameData.player.name);

            let focusVillageId = null;
            let isCounterIntel = false;

            if (attackerName === gameData.player.name) {
                focusVillageId = defVillageId;
            } else if (defenderName === gameData.player.name) {
                focusVillageId = attVillageId;
                isCounterIntel = true;
            } else {
                focusVillageId = defVillageId;
            }

            if (!focusVillageId) {
                if (isAuto) return Engine.next();
                return;
            }

            if (isAuto && DB.getSessionCache().includes(focusVillageId)) {
                DB.saveHistory(reportId);
                document.getElementById('action-container').innerHTML = `<span style="color: gray; font-weight: bold;">⏩ Pulo Rápido (Já tratada nesta sessão)</span>`;
                return Engine.next();
            }

            if (isSelfAttack) {
                if (attVillageId) DB.addOwned(attVillageId);
                if (defVillageId) DB.addOwned(defVillageId);
                
                DB.saveHistory(reportId);
                if (isAuto) return Engine.next();
                document.getElementById('action-container').innerHTML = `<span style="color: gray; font-weight: bold;">Ignorado (Auto-Ataque)</span>`;
                return;
            }

            const dataExt = Utils.extractBuildings();
            const isConquest = (attackerName === gameData.player.name && dataExt.loyalty !== null && dataExt.loyalty <= 0);
            let focusIsOurs = false;

            if (isConquest) {
                DB.addOwned(focusVillageId);
                focusIsOurs = true;
            } else if (DB.isOwned(focusVillageId)) {
                focusIsOurs = true;
            } else if (DB.getKnownEnemies().includes(focusVillageId)) {
                focusIsOurs = false;
            } else {
                focusIsOurs = await new Promise(resolve => {
                    jQuery.get(`/game.php?screen=info_village&id=${focusVillageId}`, (html) => {
                        const $html = jQuery(html);
                        const ownerLink = $html.find('#content_value table.vis:first tr:contains("Jogador:") a').attr('href');
                        if (ownerLink && ownerLink.includes(`id=${gameData.player.id}`)) {
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    }).fail(() => resolve(false));
                });
                
                if (focusIsOurs) DB.addOwned(focusVillageId);
                else DB.addKnownEnemy(focusVillageId);
            }

            if (focusIsOurs) {
                if (!DB.isCleaned(focusVillageId)) {
                    await new Promise((resolve) => {
                        jQuery.get(`/game.php?screen=info_village&id=${focusVillageId}`, (html) => {
                            DB.markCleaned(focusVillageId);
                            if (html.includes('TIPO DE ALDEIA') || html.includes('HISTÓRICO DE ATAQUES') || html.includes('ATAQUES LANÇADOS') || html.includes('ÚLTIMA ESPIONAGEM')) {
                                DB.deleteVillage(focusVillageId);
                                TribalWars.post('info_village', { ajaxaction: 'edit_notes', id: focusVillageId }, { note: "" }, () => resolve());
                            } else {
                                resolve();
                            }
                        }).fail(() => resolve());
                    });
                }
                
                DB.saveHistory(reportId);
                DB.addToSession(focusVillageId);
                if (isAuto) return Engine.next();
                document.getElementById('action-container').innerHTML = `<span style="color: #005eb2; font-weight: bold;">🏰 Aldeia Nossa (Limpa e Ignorada)</span>`;
                return; 
            }

            let nonSpyPopAtt = 0, offPopAtt = 0, defPopAtt = 0;
            jQuery('#attack_info_att_units tr:eq(1) td.unit-item').each(function(idx) {
                const count = parseInt(this.textContent.trim().replace(/\./g, '')) || 0;
                const unit = gameData.units[idx];
                if (!unit || count === 0) return;

                const pop = count * CFG.UNITS.POP[unit];
                if (unit !== 'spy') nonSpyPopAtt += pop;
                if (CFG.UNITS.OFF.includes(unit)) offPopAtt += pop;
                if (CFG.UNITS.DEF.includes(unit)) defPopAtt += pop;
            });
            const isFake = nonSpyPopAtt < CFG.FAKE_LIMIT;

            if (isCounterIntel) {
                const defData = Utils.parseVillageFromTable('attack_info_def');
                let block = `[b]Data:[/b] ${reportTimeText} | [b]Alvo:[/b] [coord]${defData ? defData.coord : '---'}[/coord]\n`;

                if (isFake) {
                    block += `[i]🤡 Fake enviado contra nós[/i]\n`;
                } else {
                    let inferredType = '⚖️ Mista';
                    if (offPopAtt > defPopAtt * 1.5) inferredType = '⚔️ Ofensiva';
                    else if (defPopAtt > offPopAtt * 1.5) inferredType = '🛡️ Defensiva';

                    if (offPopAtt > 0) block += `[b]Off recebida:[/b] ${Utils.formatNum(offPopAtt)} | `;
                    if (defPopAtt > 0) block += `[b]Def recebida:[/b] ${Utils.formatNum(defPopAtt)}\n`;
                    block += `[b]Classificação Detetada:[/b] ${inferredType}\n`;
                }
                block += `[url="${window.location.origin}/game.php?screen=report&mode=all&view=${reportId}"]Link do Relatório[/url]`;

                const vData = DB.getVillage(focusVillageId);
                vData.outgoing = vData.outgoing || [];
                
                vData.outgoing.push({ id: reportIdNum, text: block });
                vData.outgoing = vData.outgoing
                    .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
                    .sort((a, b) => a.id - b.id)
                    .slice(-4);

                const finalNote = Utils.buildFinalNote(vData);
                DB.saveVillage(focusVillageId, vData);

                TribalWars.post('info_village', { ajaxaction: 'edit_notes', id: focusVillageId }, { note: finalNote }, () => {
                    DB.saveHistory(reportId);
                    DB.addToSession(focusVillageId);
                    if (isAuto) Engine.next();
                    else document.getElementById('action-container').innerHTML = `<span style="color: green; font-weight: bold;">✔ Counter-Intel Guardada</span>`;
                });
            } else {
                const hasSpyInfo = dataExt.hasInfo;
                const tacticalData = TacticalEngine.analyzeDefense();
                const playerBB = Utils.wrapBB(defenderName, 'player');

                let block = `[b]Data:[/b] ${reportTimeText} | [b]Dono:[/b] ${playerBB}\n`;
                if (isFake) block += `[i]Ataque Falso / Espionagem[/i]\n`;
                else {
                    if (offPopAtt > 0) block += `[b]Off enviada:[/b] ${Utils.formatNum(offPopAtt)} | `;
                    if (defPopAtt > 0) block += `[b]Def enviada:[/b] ${Utils.formatNum(defPopAtt)}\n`;
                    if (offPopAtt > 0 && defPopAtt === 0) block += `\n`;
                }

                if (hasSpyInfo) {
                    block += `[b]Muralha:[/b] ${dataExt.wall} | [b]Fazenda:[/b] ${dataExt.farm}`;
                    if (dataExt.tower !== '?') block += ` | [b]Torre:[/b] ${dataExt.tower}`;
                    if (dataExt.hq !== '?') block += ` | [b]EP:[/b] ${dataExt.hq}`;
                    block += `\n`;
                    if (dataExt.troopsOutside) block += `[b]⚠️ Contém tropas fora da aldeia[/b]\n`;
                }
                if (dataExt.loyalty !== null) {
                    block += `[b]📉 Lealdade:[/b] ${dataExt.loyalty}\n`;
                }

                const $export = $('#report_export_code');
                if ($export.length) block += '\n' + $export.html().trim() + '\n';
                block += `[url="${window.location.origin}/game.php?screen=report&mode=all&view=${reportId}"]Link do Relatório[/url]`;

                const vData = DB.getVillage(focusVillageId);
                
                if (tacticalData.tags.length > 0) vData.tags = tacticalData.tags;

                if (!isFake) {
                    vData.attacks = vData.attacks || [];
                    
                    vData.attacks.push({ id: reportIdNum, text: block });
                    vData.attacks = vData.attacks
                        .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
                        .sort((a, b) => a.id - b.id)
                        .slice(-4);
                    
                    if (hasSpyInfo) {
                        if (!vData.spy || reportIdNum > vData.spy.id) {
                            vData.spy = { id: reportIdNum, text: block };
                        }
                    }
                } else if (hasSpyInfo) {
                    if (!vData.spy || reportIdNum > vData.spy.id) {
                        vData.spy = { id: reportIdNum, text: block };
                    }
                }

                const finalNote = Utils.buildFinalNote(vData);

                if (!finalNote.trim() || (isFake && !hasSpyInfo)) {
                    DB.saveHistory(reportId);
                    if (isAuto) return Engine.next();
                    document.getElementById('action-container').innerHTML = `<span style="color: gray; font-weight: bold;">Lido (Sem info relevante)</span>`;
                    return;
                }

                DB.saveVillage(focusVillageId, vData);

                TribalWars.post('info_village', { ajaxaction: 'edit_notes', id: focusVillageId }, { note: finalNote }, () => {
                    DB.saveHistory(reportId);
                    DB.addToSession(focusVillageId);
                    if (isAuto) Engine.next();
                    else document.getElementById('action-container').innerHTML = `<span style="color: green; font-weight: bold;">✔ Nota Guardada</span>`;
                });
            }
        }
    };

    // ==========================================
    // 7. RENDERIZAR NOTAS (Ecrã de Comando)
    // ==========================================
    const renderVillageNotes = () => {
        const anchor = document.querySelector('.village_anchor a');
        if (!anchor) return;

        jQuery.get(anchor.getAttribute('href'), (html) => {
            const noteHtml = jQuery(html).find('#own_village_note .village-note');
            if (noteHtml.length) {
                const container = `
                    <table class="vis" style="width: 100%; margin-top: 15px;">
                        <tbody>
                            <tr><th>Dados Registados (Gestor de Notas)</th></tr>
                            <tr><td style="padding: 10px;">${noteHtml[0].children[1].innerHTML}</td></tr>
                        </tbody>
                    </table>
                `;
                document.querySelector('#content_value table').insertAdjacentHTML('afterend', container);
            }
        });
    };

    // ==========================================
    // 8. INICIALIZAÇÃO
    // ==========================================
    if (currentScreen === 'report' && currentView) {
        UI.renderDashboard(currentView, DB.getHistory().includes(currentView));
        if (DB.isRunning()) setTimeout(() => Engine.process(true), Math.floor(Math.random() * 100) + 50);
    } else if (currentScreen === 'info_command' && urlParams.get('id')) {
        renderVillageNotes();
    }

})();
