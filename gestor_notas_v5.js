(() => {
    'use strict';

    const gameData = window.game_data;
    const urlParams = new URLSearchParams(window.location.search);
    const currentScreen = urlParams.get('screen');
    const currentView = urlParams.get('view');

    // ==========================================
    // 0. REDIRECIONAMENTO INTELIGENTE
    // ==========================================
    if (currentScreen !== 'report' || currentView) {
        if (currentScreen === 'info_command' && urlParams.get('id')) {
            renderVillageNotes(); 
            return;
        }
        
        if (typeof window.UI !== 'undefined') {
            window.UI.InfoMessage('A redirecionar para a lista de relatórios...', 1500, 'success');
        }
        setTimeout(() => { window.location.href = gameData.link_base_pure + 'report'; }, 600);
        return;
    }

    const domParser = new DOMParser();

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
            if (!h.includes(id)) { h.push(id); if (h.length > 5000) h.shift(); localStorage.setItem(CFG.STORAGE.HISTORY, JSON.stringify(h)); }
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
            
            const timeMatch = dateStr.match(/(\d{2}):(\d{2})(?::(\d{2}))?/);
            if (!timeMatch) return Date.now();
            const hr = parseInt(timeMatch[1], 10), min = parseInt(timeMatch[2], 10), sec = parseInt(timeMatch[3] || '0', 10);

            const strLower = dateStr.toLowerCase();
            if (strLower.includes('hoje')) {
                // Mantém hoje
            } else if (strLower.includes('ontem')) {
                const yesterday = new Date(now.getTime() - 86400000);
                d = yesterday.getDate(); mo = yesterday.getMonth(); y = yesterday.getFullYear();
            } else {
                const ptMonths = {'jan':0, 'fev':1, 'mar':2, 'abr':3, 'mai':4, 'jun':5, 'jul':6, 'ago':7, 'set':8, 'out':9, 'nov':10, 'dez':11};
                
                const textMatch = strLower.match(/(\d{1,2})\/([a-z]{3})\.?\/(\d{2,4})/);
                const numMatch = strLower.match(/(\d{1,2})[\.\/](\d{1,2})[\.\/]?(\d{2,4})?/);

                if (textMatch) {
                    d = parseInt(textMatch[1], 10);
                    if (ptMonths[textMatch[2]] !== undefined) mo = ptMonths[textMatch[2]];
                    if (textMatch[3]) y = textMatch[3].length === 2 ? 2000 + parseInt(textMatch[3], 10) : parseInt(textMatch[3], 10);
                } else if (numMatch) {
                    d = parseInt(numMatch[1], 10);
                    mo = parseInt(numMatch[2], 10) - 1;
                    if (numMatch[3]) y = numMatch[3].length === 2 ? 2000 + parseInt(numMatch[3], 10) : parseInt(numMatch[3], 10);
                }
            }
            return new Date(y, mo, d, hr, min, sec).getTime();
        },

        extractBuildings: (doc) => {
            let wall = '?', farm = '?', tower = '?', hq = '?';
            const content = doc.getElementById('content_value');
            if (!content) return { wall, farm, tower, hq, loyalty: null, troopsOutside: false, hasInfo: false };
            
            const html = content.innerHTML;
            const text = content.innerText;

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
            const awayTable = doc.getElementById('attack_spy_away');
            if (awayTable) {
                const cells = awayTable.rows[1]?.cells;
                if (cells) {
                    Array.from(cells).forEach(td => {
                        const count = parseInt(td.textContent.trim().replace(/\./g, '')) || 0;
                        if (count > 0) troopsOutside = true;
                    });
                }
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
        },

        saveNoteRequest: (villageId, noteStr) => {
            return new Promise(resolve => {
                TribalWars.post('info_village', { ajaxaction: 'edit_notes', id: villageId }, { note: noteStr }, () => {
                    resolve();
                });
            });
        }
    };

    // ==========================================
    // 4. CLASSIFICADOR DE ALDEIAS
    // ==========================================
    const TacticalEngine = {
        analyzeDefense: (doc) => {
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

            const defRows = doc.querySelectorAll('#attack_info_def tr');
            defRows.forEach(row => {
                if (row.cells[0]?.textContent.toLowerCase().includes('quantidade')) {
                    Array.from(row.cells).forEach((td, idx) => {
                        if (idx === 0) return;
                        countPop(idx - 1, td.textContent.trim());
                    });
                }
            });

            const spyTbl = doc.getElementById('attack_spy_def_troops');
            if (spyTbl && spyTbl.rows[1]) {
                Array.from(spyTbl.rows[1].cells).forEach((td, idx) => countPop(idx, td.textContent.trim()));
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
    // 5. MOTOR DE PROCESSAMENTO EM BACKGROUND
    // ==========================================
    const Engine = {
        processList: async () => {
            const reportTable = document.getElementById('report_list');
            if (!reportTable) {
                DB.setState(false);
                if(window.UI) window.UI.ErrorMessage('Tabela de relatórios não encontrada.');
                return;
            }

            const rows = Array.from(reportTable.querySelectorAll('tr')).filter(tr => tr.querySelector('a[href*="view="]'));
            const limitHours = parseFloat(localStorage.getItem(CFG.STORAGE.LIMIT_HOURS) || '36');

            for (let i = 0; i < rows.length; i++) {
                if (!DB.isRunning()) break;

                const row = rows[i];
                const linkElem = row.querySelector('a[href*="view="]');
                const dateElem = row.cells[2] ? row.cells[2].textContent.trim() : row.cells[1].textContent.trim();
                const reportIdMatch = linkElem.href.match(/view=(\d+)/);
                
                if (!reportIdMatch) continue;
                const reportId = reportIdMatch[1];

                const progressText = document.getElementById('ra-progress-text');
                if(progressText) progressText.innerHTML = `A analisar relatório <b>${i + 1}</b> de ${rows.length}...`;

                const reportTimestamp = Utils.parseTWDate(dateElem);
                const elapsedHours = (Date.now() - reportTimestamp) / 3600000;

                if (elapsedHours > limitHours) {
                    DB.setState(false);
                    UI.toggleAuto(false);
                    if(progressText) progressText.innerHTML = `<span style="color:#a52a2a;">Concluído. Relatórios ultrapassaram limite de antiguidade (${limitHours}h).</span>`;
                    return;
                }

                if (DB.getHistory().includes(reportId)) {
                    row.style.opacity = '0.5';
                    continue;
                }

                try {
                    const res = await fetch(linkElem.href);
                    if (!res.ok) throw new Error('Falha de rede');
                    const html = await res.text();
                    const doc = domParser.parseFromString(html, 'text/html');

                    await Engine.analyzeReportHTML(doc, reportId, dateElem);
                    
                    row.style.backgroundColor = '#e8f4e8'; 
                } catch (e) {
                    console.warn(`Erro no relatório ${reportId}:`, e);
                }

                await Utils.delay(CFG.DELAYS.MIN, CFG.DELAYS.MAX);
            }

            if (DB.isRunning()) {
                let nextUrl = null;
                const activePageNode = document.querySelector('.vis td[align="center"] strong');
                
                if (activePageNode && activePageNode.nextElementSibling && activePageNode.nextElementSibling.classList.contains('paged-nav-item')) {
                    nextUrl = activePageNode.nextElementSibling.href;
                }

                if (nextUrl) {
                    const progressText = document.getElementById('ra-progress-text');
                    if(progressText) progressText.textContent = `A carregar a próxima página...`;
                    setTimeout(() => { window.location.href = nextUrl; }, 500);
                } else {
                    DB.setState(false);
                    UI.toggleAuto(false);
                    const progressText = document.getElementById('ra-progress-text');
                    if(progressText) progressText.innerHTML = `<span style="color:#008200;">Leitura concluída. Todas as páginas analisadas.</span>`;
                }
            }
        },

        analyzeReportHTML: async (doc, reportId, reportTimeText) => {
            const reportIdNum = parseInt(reportId, 10);
            
            const attTable = doc.getElementById('attack_info_att');
            const defTable = doc.getElementById('attack_info_def');
            if (!attTable || !defTable) {
                DB.saveHistory(reportId);
                return;
            }

            const attVillageId = attTable.querySelector('span[data-id]')?.getAttribute('data-id');
            const defVillageId = defTable.querySelector('span[data-id]')?.getAttribute('data-id');
            const attackerName = attTable.rows[0].cells[1].textContent.trim();
            const defenderName = defTable.rows[0].cells[1].textContent.trim();
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

            if (!focusVillageId) return;

            if (DB.getSessionCache().includes(focusVillageId)) {
                DB.saveHistory(reportId);
                return;
            }

            if (isSelfAttack) {
                if (attVillageId) DB.addOwned(attVillageId);
                if (defVillageId) DB.addOwned(defVillageId);
                DB.saveHistory(reportId);
                return;
            }

            const dataExt = Utils.extractBuildings(doc);
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
                    fetch(`/game.php?screen=info_village&id=${focusVillageId}`)
                        .then(r => r.text())
                        .then(html => {
                            const vDoc = domParser.parseFromString(html, 'text/html');
                            const trs = vDoc.querySelectorAll('#content_value table.vis tr');
                            let isMine = false;
                            Array.from(trs).forEach(tr => {
                                if (tr.textContent.includes('Jogador:')) {
                                    const a = tr.querySelector('a');
                                    if (a && a.href.includes(`id=${gameData.player.id}`)) isMine = true;
                                }
                            });
                            resolve(isMine);
                        }).catch(() => resolve(false));
                });
                
                if (focusIsOurs) DB.addOwned(focusVillageId);
                else DB.addKnownEnemy(focusVillageId);
            }

            if (focusIsOurs) {
                if (!DB.isCleaned(focusVillageId)) {
                    await new Promise(resolve => {
                        fetch(`/game.php?screen=info_village&id=${focusVillageId}`)
                            .then(r => r.text())
                            .then(async html => {
                                DB.markCleaned(focusVillageId);
                                if (html.includes('TIPO DE ALDEIA') || html.includes('HISTÓRICO DE ATAQUES') || html.includes('ATAQUES LANÇADOS') || html.includes('ÚLTIMA ESPIONAGEM')) {
                                    DB.deleteVillage(focusVillageId);
                                    await Utils.saveNoteRequest(focusVillageId, "");
                                }
                                resolve();
                            }).catch(() => resolve());
                    });
                }
                DB.saveHistory(reportId);
                DB.addToSession(focusVillageId);
                return; 
            }

            let nonSpyPopAtt = 0, offPopAtt = 0, defPopAtt = 0;
            const attUnitsRow = doc.querySelector('#attack_info_att_units')?.rows[1];
            if (attUnitsRow) {
                Array.from(attUnitsRow.querySelectorAll('td.unit-item')).forEach((td, idx) => {
                    const count = parseInt(td.textContent.trim().replace(/\./g, '')) || 0;
                    const unit = gameData.units[idx];
                    if (!unit || count === 0) return;

                    const pop = count * CFG.UNITS.POP[unit];
                    if (unit !== 'spy') nonSpyPopAtt += pop;
                    if (CFG.UNITS.OFF.includes(unit)) offPopAtt += pop;
                    if (CFG.UNITS.DEF.includes(unit)) defPopAtt += pop;
                });
            }
            
            const isFake = nonSpyPopAtt < CFG.FAKE_LIMIT;

            if (isCounterIntel) {
                const defData = { coord: defTable.rows[1]?.cells[1]?.textContent.match(/(\d{3}\|\d{3})/) ? defTable.rows[1].cells[1].textContent.match(/(\d{3}\|\d{3})/)[1] : '---' };
                let block = `[b]Data:[/b] ${reportTimeText} | [b]Alvo:[/b] [coord]${defData.coord}[/coord]\n`;

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

                await Utils.saveNoteRequest(focusVillageId, finalNote);
                DB.saveHistory(reportId);
                DB.addToSession(focusVillageId);

            } else {
                const hasSpyInfo = dataExt.hasInfo;
                const tacticalData = TacticalEngine.analyzeDefense(doc);
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

                const exportElem = doc.getElementById('report_export_code');
                if (exportElem) block += '\n' + exportElem.innerHTML.trim() + '\n';
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
                    return;
                }

                DB.saveVillage(focusVillageId, vData);
                await Utils.saveNoteRequest(focusVillageId, finalNote);
                DB.saveHistory(reportId);
                DB.addToSession(focusVillageId);
            }
        }
    };

    // ==========================================
    // 6. INTERFACE DO UTILIZADOR
    // ==========================================
    const UI = {
        renderDashboard: () => {
            if (document.getElementById('ra-notas-dashboard')) return;

            const header = document.querySelector('h2');
            if (!header) return;

            const savedLimit = localStorage.getItem(CFG.STORAGE.LIMIT_HOURS) || '36';

            const html = `
                <table id="ra-notas-dashboard" class="vis" style="width: 100%; margin-bottom: 15px;">
                    <tbody>
                        <tr>
                            <th colspan="2">Gestor de Notas TW</th>
                        </tr>
                        <tr>
                            <td style="width: 50%; text-align: center; padding: 10px;">
                                <label style="font-weight: bold; margin-right: 5px;">Limite (Horas):</label>
                                <input type="number" id="ra-hour-limit" value="${savedLimit}" style="width: 50px; text-align: center; padding: 2px;">
                            </td>
                            <td style="width: 50%; text-align: center; padding: 10px;">
                                <button id="btn-auto-start" class="btn">Iniciar Leitura</button>
                                <button id="btn-auto-stop" class="btn btn-cancel" style="display: none;">Parar</button>
                            </td>
                        </tr>
                        <tr>
                            <td colspan="2" style="text-align: center; padding: 8px; font-weight: bold; color: #555;" id="ra-progress-text">
                                Pronto a iniciar.
                            </td>
                        </tr>
                        <tr>
                            <td colspan="2" style="text-align: center; padding: 4px;">
                                <a href="#" id="btn-clear" style="font-size: 10px; color: #a52a2a;">[Redefinir Memória de Relatórios]</a>
                            </td>
                        </tr>
                    </tbody>
                </table>
            `;

            header.insertAdjacentHTML('afterend', html);

            document.getElementById('ra-hour-limit')?.addEventListener('change', (e) => {
                localStorage.setItem(CFG.STORAGE.LIMIT_HOURS, e.target.value);
            });
            
            document.getElementById('btn-auto-start')?.addEventListener('click', () => {
                DB.clearSession();
                DB.setState(true); 
                UI.toggleAuto(true); 
                Engine.processList();
            });
            
            document.getElementById('btn-auto-stop')?.addEventListener('click', () => {
                DB.setState(false); 
                UI.toggleAuto(false);
                document.getElementById('ra-progress-text').textContent = 'Extração interrompida manualmente.';
            });

            document.getElementById('btn-clear')?.addEventListener('click', (e) => {
                e.preventDefault(); 
                if (confirm("Isto vai forçar o script a ler todos os relatórios novamente. Tens a certeza?")) {
                    DB.clearHistory();
                }
            });

            if (DB.isRunning()) {
                UI.toggleAuto(true);
                Engine.processList();
            }
        },

        toggleAuto: (isRunning) => {
            const startBtn = document.getElementById('btn-auto-start');
            const stopBtn = document.getElementById('btn-auto-stop');
            if(startBtn) startBtn.style.display = isRunning ? 'none' : 'inline-block';
            if(stopBtn) stopBtn.style.display = isRunning ? 'inline-block' : 'none';
        }
    };

    // ==========================================
    // 7. INICIALIZAÇÃO E NOTAS (COMANDOS)
    // ==========================================
    const renderVillageNotes = () => {
        const anchor = document.querySelector('.village_anchor a');
        if (!anchor) return;

        fetch(anchor.getAttribute('href'))
            .then(res => res.text())
            .then(html => {
                const doc = domParser.parseFromString(html, 'text/html');
                const noteHtml = doc.querySelector('#own_village_note .village-note');
                if (noteHtml && noteHtml.children.length > 1) {
                    const container = `
                        <table class="vis" style="width: 100%; margin-top: 15px;">
                            <tbody>
                                <tr><th>Gestor de Notas TW</th></tr>
                                <tr><td style="padding: 10px;">${noteHtml.children[1].innerHTML}</td></tr>
                            </tbody>
                        </table>
                    `;
                    const tbl = document.querySelector('#content_value table');
                    if (tbl) tbl.insertAdjacentHTML('afterend', container);
                }
            });
    };

    if (currentScreen === 'report' && !currentView) {
        UI.renderDashboard();
    }

})();
