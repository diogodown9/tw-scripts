nao e para o tamper, usa este como base para isso que te pedi

(function() {
    'use strict';

    const gameData = window.game_data;
    
    // 1. Verificação de Ecrã com Aviso
    if (gameData.screen !== 'place') {
        if (typeof window.UI !== 'undefined' && window.UI.InfoMessage) {
             window.UI.InfoMessage('Por favor, vai para a Praça de Reuniões antes de executar este script.', 3000, 'error');
        } else {
             alert('Este script tem de ser executado na Praça de Reuniões.');
        }
        return;
    }

    // 2. Prevenção de Duplicação
    if (document.getElementById('gemini-tactical-results')) {
        if (typeof window.UI !== 'undefined' && window.UI.InfoMessage) {
            window.UI.InfoMessage('O script já está aberto nesta página.', 2000, 'error');
       }
        return;
    }

    const domParser = new DOMParser();

    // --- INTERFACE DE UTILIZADOR ---
    const uiContainer = document.createElement('div');
    uiContainer.className = 'vis';
    uiContainer.style.padding = '12px';
    uiContainer.style.marginBottom = '15px';
    uiContainer.style.border = '1px solid #7d510f';
    uiContainer.style.borderRadius = '3px';

    uiContainer.innerHTML = `
        <h4 style="margin-top:0; border-bottom: 1px solid #7d510f; padding-bottom: 6px; background-color: #c1a264; background-image: url(https://dspt.innogamescdn.com/asset/1057e93c/graphic/screen/tableheader_bg3.png); padding: 5px; border-radius: 2px 2px 0 0;">Analisador de Comandos</h4>
        <p style="font-size: 11px; margin: 10px 0;">Insere o nome do jogador alvo e prime <b>Enter</b> para extrair a informação.</p>
        <div style="display: flex; align-items: center; gap: 10px;">
            <input type="text" id="gemini-player-name" placeholder="Nome do Jogador" style="padding: 6px; width: 220px; border: 1px solid #ccc; border-radius: 3px; outline: none;">
            <a id="gemini-start-btn" class="btn" style="cursor: pointer; font-weight:bold; padding: 6px 12px;">Iniciar Análise</a>
        </div>
        <div id="gemini-status" style="margin-top: 12px; font-weight: bold; font-size: 11px; color: #008200;"></div>
    `;

    const resultsContainer = document.createElement('div');
    resultsContainer.id = 'gemini-tactical-results';

    const placeForm = document.getElementById('command-data-form');
    const contentVal = document.getElementById('content_value');
    if (placeForm) {
        placeForm.parentNode.insertBefore(uiContainer, placeForm);
        placeForm.parentNode.insertBefore(resultsContainer, placeForm);
    } else if (contentVal) {
        contentVal.prepend(resultsContainer);
        contentVal.prepend(uiContainer);
    }

    const startBtn = document.getElementById('gemini-start-btn');
    const statusDiv = document.getElementById('gemini-status');
    const inputName = document.getElementById('gemini-player-name');

    inputName.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            startBtn.click();
        }
    });

    startBtn.addEventListener('click', async function() {
        const playerName = inputName.value.trim();
        if (!playerName) {
            alert('Por favor, insere o nome do jogador.');
            inputName.focus();
            return;
        }

        startBtn.classList.add('btn-disabled');
        resultsContainer.innerHTML = '';
        statusDiv.style.color = 'black';

        try {
            statusDiv.innerHTML = `A pesquisar jogador...`;
            const playerId = await getPlayerIdByName(playerName);

            if (!playerId) {
                statusDiv.innerHTML = `<span style="color:red;">Jogador não encontrado.</span>`;
                startBtn.classList.remove('btn-disabled');
                return;
            }

            statusDiv.innerHTML = `A identificar aldeias...`;
            const villageIds = await fetchPlayerVillages(playerId);

            if (villageIds.length === 0) {
                statusDiv.innerHTML = `<span style="color:red;">Nenhuma aldeia encontrada.</span>`;
                startBtn.classList.remove('btn-disabled');
                return;
            }

            const partialCommands = await scanVillagesAndTooltips(villageIds);

            if (partialCommands.length === 0) {
                statusDiv.innerHTML = `<span style="color:blue;">Sem comandos ativos.</span>`;
                startBtn.classList.remove('btn-disabled');
                return;
            }

            const allCommands = await processInBatches(partialCommands, 5, deepScanForOrigins);

            statusDiv.innerHTML = `<span style="color:#008200;">Processo concluído. ${allCommands.length} comando(s) extraído(s).</span>`;

            const groupedCommands = groupAndSortCommands(allCommands);
            renderResults(groupedCommands);
            startCustomTimer();

        } catch (error) {
            statusDiv.innerHTML = `<span style="color:red;">Erro: ${error.message}</span>`;
        } finally {
            startBtn.classList.remove('btn-disabled');
        }
    });

    const unitsMap = { spear:1, sword:1, axe:1, archer:1, spy:2, light:4, marcher:5, heavy:6, ram:5, catapult:8, knight:10, snob:100 };

    async function getPlayerIdByName(playerName) {
        const url = `${gameData.link_base_pure}ranking&mode=player&name=${encodeURIComponent(playerName)}`;
        const response = await fetch(url);
        const text = await response.text();
        const doc = domParser.parseFromString(text, 'text/html');
        const links = doc.querySelectorAll('a[href*="screen=info_player"]');
        for (const link of links) {
            if (link.textContent.trim().toLowerCase() === playerName.toLowerCase()) {
                const match = link.href.match(/id=(\d+)/);
                if (match) return match[1];
            }
        }
        return null;
    }

    async function fetchPlayerVillages(playerId) {
        const url = `${gameData.link_base_pure}info_player&id=${playerId}`;
        const response = await fetch(url);
        const text = await response.text();
        const doc = domParser.parseFromString(text, 'text/html');
        const vIds = [];
        doc.querySelectorAll('#villages_list tbody tr td a[href*="screen=info_village"]').forEach(l => {
            const m = l.href.match(/id=(\d+)/);
            if (m) vIds.push(m[1]);
        });
        return [...new Set(vIds)];
    }

    function getVillageInfoFromDoc(doc) {
        let coord = null;
        let points = "0";
        const tds = doc.querySelectorAll('table.vis td');
        for (let i = 0; i < tds.length; i++) {
            const text = tds[i].textContent.trim();
            if (text === 'Coordenadas:') {
                const nextTd = tds[i+1];
                if (nextTd) {
                    const match = nextTd.textContent.match(/(\d{1,3}\|\d{1,3})/);
                    if (match) coord = match[1];
                }
            }
            if (text === 'Pontos:') {
                const nextTd = tds[i+1];
                if (nextTd) {
                    points = nextTd.textContent.trim();
                }
            }
        }
        return { coord, points };
    }

    function parseTroopsFromHtml(htmlContent) {
        let found = false, noble = false, pop = 0, spyOnly = true;
        const doc = domParser.parseFromString(htmlContent, 'text/html');

        const tables = doc.querySelectorAll('table.vis');
        for (let t = 0; t < tables.length; t++) {
            const table = tables[t];
            const headerRow = Array.from(table.rows).find(row => row.querySelector('img[src*="unit_"]'));

            if (headerRow) {
                const dataRow = headerRow.nextElementSibling;
                if (dataRow) {
                    const headers = Array.from(headerRow.cells);
                    const dataCells = Array.from(dataRow.cells);

                    headers.forEach((th, i) => {
                        const img = th.querySelector('img[src*="unit_"]');
                        if (img && dataCells[i]) {
                            const m = img.src.match(/unit_([a-z]+)\.png/);
                            if (m) {
                                const unit = m[1];
                                const valStr = dataCells[i].textContent.replace(/\./g, '').trim();
                                const val = parseInt(valStr);

                                if (!isNaN(val) && val > 0) {
                                    found = true;
                                    if (unit !== 'spy') spyOnly = false;
                                    if (unit === 'snob') noble = true;
                                    pop += val * (unitsMap[unit] || 0);
                                }
                            }
                        }
                    });
                    if (found) break;
                }
            }
        }
        return { found, noble, pop, spyOnly };
    }

    async function scanVillagesAndTooltips(villageIds) {
        const cmds = [];
        for (let i = 0; i < villageIds.length; i++) {
            statusDiv.innerHTML = `A extrair aldeia ${i + 1} de ${villageIds.length}...`;

            try {
                const res = await fetch(`${gameData.link_base_pure}info_village&id=${villageIds[i]}`);
                const html = await res.text();
                const doc = domParser.parseFromString(html, 'text/html');

                let baseName = doc.querySelector('#content_value h2') ? doc.querySelector('#content_value h2').textContent.trim() : `Aldeia ID ${villageIds[i]}`;
                baseName = baseName.split('(')[0].trim();

                const info = getVillageInfoFromDoc(doc);
                let destName = baseName;
                if (info.coord) destName += ` (${info.coord})`;
                if (info.points) destName += ` - ${info.points} pts`;

                const links = doc.querySelectorAll('a[href*="screen=info_command"]');
                links.forEach(l => {
                    const row = l.closest('tr');
                    if (!row) return;

                    const isReturn = !!row.querySelector('img[src*="command/return"]') || !!row.querySelector('img[src*="command/cancel"]');
                    if (isReturn) return;

                    const m = l.href.match(/id=(\d+)/);
                    if (!m) return;
                    const cmdId = m[1];

                    if (cmds.find(c => c.id === cmdId)) return;

                    let tooltipHtml = "";
                    const iconImg = row.querySelector('img[src*="command/"]');
                    if (iconImg) {
                        tooltipHtml += (iconImg.getAttribute('data-title') || iconImg.getAttribute('title') || "") + " ";
                    }
                    tooltipHtml += (row.getAttribute('data-title') || row.innerHTML) + " ";

                    const troopsFromTooltip = parseTroopsFromHtml(tooltipHtml);

                    cmds.push({
                        id: cmdId,
                        destName: destName,
                        villageId: villageIds[i],
                        tooltipHtml: tooltipHtml,
                        tooltipTroops: troopsFromTooltip
                    });
                });
            } catch (e) {}
            await new Promise(r => setTimeout(r, 100));
        }
        return cmds;
    }

    async function processInBatches(items, batchSize, processor) {
        const results = [];
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(processor));
            results.push(...batchResults.filter(r => r !== null));

            const current = Math.min(i + batchSize, items.length);
            statusDiv.innerHTML = `A analisar dados... (${current}/${items.length}) <br><progress value="${current}" max="${items.length}" style="width:100%; height:12px; margin-top:6px;"></progress>`;

            await new Promise(r => setTimeout(r, 200));
        }
        return results;
    }

    function getBadgeHtml(text, bgColor, pop = null) {
        let popText = pop ? ` <span style="opacity:0.85;">(${pop})</span>` : '';
        return `<span style="background-color:${bgColor}; color:#fff; font-weight:bold; font-size:10px; padding:3px 6px; border-radius:4px; display:inline-block; line-height:1;">${text}${popText}</span>`;
    }

    async function deepScanForOrigins(partialCmd) {
        const serverTimeSeconds = Math.floor((window.Timing ? window.Timing.getCurrentServerTime() : Date.now()) / 1000);

        try {
            const res = await fetch(`${gameData.link_base_pure}info_command&id=${partialCmd.id}`);
            const html = await res.text();
            const doc = domParser.parseFromString(html, 'text/html');

            let origin = "-------", player = "-------", arrivalStr = "-", commandName = "Comando Oculto";

            const h2 = doc.querySelector('#content_value h2');
            if (h2) commandName = h2.textContent.replace('Renomear', '').trim();
            const h2Html = h2 ? h2.innerHTML : "";

            const isAttack = h2Html.includes('attack') || commandName.toLowerCase().includes('ataque');
            const cmdType = isAttack ? 'Ataque' : 'Apoio';

            let originFound = false, playerFound = false, arrivalFound = false;

            const tds = doc.querySelectorAll('#content_value table.vis td');
            for (let j = 0; j < tds.length; j++) {
                const text = tds[j].textContent.trim();
                if (text === 'Jogador:' && !playerFound) {
                    player = tds[j+1] ? tds[j+1].textContent.trim() : "-------";
                    playerFound = true;
                }
                if ((text === 'Aldeia:' || text === 'Origem:') && !originFound) {
                    const originCell = tds[j+1];
                    if (originCell) {
                        const matchCoord = originCell.textContent.match(/(\d{1,3}\|\d{1,3})/);
                        origin = matchCoord ? matchCoord[1] : originCell.textContent.trim();
                    }
                    originFound = true;
                }
                if (text === 'Chegada:' && !arrivalFound) {
                    arrivalStr = tds[j+1] ? tds[j+1].textContent.trim() : "-";
                    arrivalFound = true;
                }
            }

            let finalTroops = parseTroopsFromHtml(html);
            if (!finalTroops.found && partialCmd.tooltipTroops.found) {
                finalTroops = partialCmd.tooltipTroops;
            }

            let scaleHtml = getBadgeHtml("❓ OCULTO", "#666666");
            let isPriority = false;

            if (cmdType === 'Ataque') {
                if (finalTroops.found) {
                    if (finalTroops.noble) {
                        scaleHtml = getBadgeHtml("👑 NOBRE", "#800080", finalTroops.pop);
                        isPriority = true;
                    } else if (finalTroops.spyOnly) {
                        scaleHtml = getBadgeHtml("👁️ ESPIONAGEM", "#0000FF", finalTroops.pop);
                    } else if (finalTroops.pop > 200) {
                        scaleHtml = getBadgeHtml("⚔️ GRANDE ESCALA", "#990000", finalTroops.pop);
                        isPriority = true;
                    } else {
                        scaleHtml = getBadgeHtml("🗡️ FAKE", "#d87b00", finalTroops.pop);
                    }
                } else {
                    const combinedHtml = h2Html + partialCmd.tooltipHtml;
                    if (combinedHtml.includes('snob')) {
                        scaleHtml = getBadgeHtml("👑 NOBRE", "#800080");
                        isPriority = true;
                    } else if (combinedHtml.includes('attack_large') || combinedHtml.includes('attack_medium') || combinedHtml.includes('5000+')) {
                        scaleHtml = getBadgeHtml("⚔️ GRANDE ESCALA", "#990000");
                        isPriority = true;
                    } else if (combinedHtml.includes('attack_small')) {
                        scaleHtml = getBadgeHtml("🗡️ FAKE", "#d87b00");
                    } else if (combinedHtml.includes('spy')) {
                        scaleHtml = getBadgeHtml("👁️ ESPIONAGEM", "#0000FF");
                    } else if (/(viking|machado|cl|leve|nobre|ariete|catapulta|full|snip)/i.test(commandName)) {
                        scaleHtml = getBadgeHtml("⚔️ ALVO DETETADO", "#990000");
                        isPriority = true;
                    }
                }
            } else {
                scaleHtml = getBadgeHtml("🛡️ APOIO", "#008200", finalTroops.found ? finalTroops.pop : null);
            }

            let endTime = 0;
            const now = new Date(serverTimeSeconds * 1000);
            let targetDate = new Date(now.getTime());
            const timeMatch = arrivalStr.match(/(\d{2}):(\d{2}):(\d{2})/);
            if (timeMatch) {
                targetDate.setHours(parseInt(timeMatch[1], 10));
                targetDate.setMinutes(parseInt(timeMatch[2], 10));
                targetDate.setSeconds(parseInt(timeMatch[3], 10));
                if (arrivalStr.includes('amanhã')) {
                    targetDate.setDate(targetDate.getDate() + 1);
                } else if (!arrivalStr.includes('hoje')) {
                    const dateMatch = arrivalStr.match(/(\d{2})\.(\d{2})\./);
                    if (dateMatch) {
                        targetDate.setDate(parseInt(dateMatch[1], 10));
                        targetDate.setMonth(parseInt(dateMatch[2], 10) - 1);
                    }
                }
                endTime = Math.floor(targetDate.getTime() / 1000);
            }

            return {
                id: partialCmd.id,
                text: commandName,
                type: cmdType,
                scaleHtml: scaleHtml,
                isPriority: isPriority,
                destination: partialCmd.destName,
                villageId: partialCmd.villageId,
                origin: origin,
                player: player,
                endTime: endTime,
                arrivalStr: arrivalStr
            };
        } catch (e) {
            return null;
        }
    }

    function groupAndSortCommands(commands) {
        const grouped = {};
        commands.forEach(cmd => {
            if (!grouped[cmd.destination]) grouped[cmd.destination] = [];
            grouped[cmd.destination].push(cmd);
        });

        Object.keys(grouped).forEach(dest => {
            grouped[dest].sort((a, b) => {
                if (a.isPriority && !b.isPriority) return -1;
                if (!a.isPriority && b.isPriority) return 1;
                return (a.endTime || 9999999999) - (b.endTime || 9999999999);
            });
        });

        return grouped;
    }

    function renderResults(groupedCommands) {
        const destinations = Object.keys(groupedCommands);
        const fragment = document.createDocumentFragment();

        destinations.forEach(destCoord => {
            const tableWrapper = document.createElement('div');
            tableWrapper.style.marginBottom = '6px';
            tableWrapper.style.borderRadius = '3px';
            tableWrapper.style.overflow = 'hidden';

            const totalCmds = groupedCommands[destCoord].length;
            const priorCount = groupedCommands[destCoord].filter(c => c.isPriority).length;
            const villageId = groupedCommands[destCoord][0].villageId;

            let headerAlert = `<span style="color:#555; font-size:11px;">(${totalCmds} comandos)</span>`;
            if (priorCount > 0) {
                headerAlert = `<span style="color:#900; font-weight:bold; background-color:#ffcccc; padding:2px 6px; border-radius:3px;">⚠️ ${priorCount} Alerta(s)</span> <span style="color:#555; font-size:11px; margin-left:5px;">| ${totalCmds} totais</span>`;
            }

            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';
            header.style.backgroundColor = '#c1a264';
            header.style.backgroundImage = 'url(https://dspt.innogamescdn.com/asset/1057e93c/graphic/screen/tableheader_bg3.png)';
            header.style.padding = '8px 10px';
            header.style.border = '1px solid #7d510f';
            header.style.cursor = 'pointer';
            header.style.fontSize = '12px';
            header.style.userSelect = 'none';

            const leftContent = document.createElement('div');
            leftContent.innerHTML = `<span class="toggle-icon" style="font-size:14px; font-weight:bold; margin-right:6px; color:#555;">►</span> <span style="margin-right:6px;">Destino:</span> <b style="font-size:13px;">${destCoord}</b> <span style="margin-left: 10px;">${headerAlert}</span>`;
            
            const rightContent = document.createElement('a');
            rightContent.href = `${gameData.link_base_pure}info_village&id=${villageId}`;
            rightContent.target = '_blank';
            rightContent.className = 'btn';
            rightContent.style.padding = '3px 10px';
            rightContent.style.fontSize = '11px';
            rightContent.style.textDecoration = 'none';
            rightContent.textContent = 'Ver In-game';

            header.appendChild(leftContent);
            header.appendChild(rightContent);

            const tableContainer = document.createElement('div');
            tableContainer.style.display = 'none';
            tableContainer.style.border = '1px solid #7d510f';
            tableContainer.style.borderTop = 'none';
            tableContainer.style.backgroundColor = '#f4e4bc';

            const table = document.createElement('table');
            table.className = 'vis';
            table.style.width = '100%';
            table.style.fontSize = '11px';
            table.style.margin = '0';
            table.style.borderCollapse = 'collapse';

            table.innerHTML = `
                <tr>
                    <th style="padding:6px;">Comando</th>
                    <th style="text-align:center; padding:6px;">Classificação</th>
                    <th style="text-align:center; padding:6px;">Origem</th>
                    <th style="text-align:center; padding:6px;">Jogador</th>
                    <th style="text-align:center; padding:6px;">Chegada</th>
                    <th style="text-align:right; padding:6px;">Tempo Restante</th>
                </tr>
            `;

            groupedCommands[destCoord].forEach((cmd, index) => {
                const tr = document.createElement('tr');
                tr.className = index % 2 === 0 ? 'row_a' : 'row_b';

                if (cmd.isPriority) {
                    tr.style.backgroundColor = '#fde8e8'; 
                }

                const icon = cmd.type === 'Apoio' ? 'support.png' : 'attack.png';
                const iconHtml = `<img src="https://dspt.innogamescdn.com/asset/1057e93c/graphic/command/${icon}" style="vertical-align:-3px; margin-right:3px;">`;
                
                const cmdUrl = `${gameData.link_base_pure}info_command&id=${cmd.id}`;
                const btnHtml = `<a href="${cmdUrl}" target="_blank" style="margin-left: 6px; font-size: 9px; background: #e3d5b3; border: 1px solid #c9a565; padding: 2px 4px; border-radius: 2px; text-decoration: none; color: #000;" title="Ver Comando In-game">🔍</a>`;

                tr.innerHTML = `
                    <td style="padding:5px;">${iconHtml} <b style="color:#000;">${cmd.text}</b>${btnHtml}</td>
                    <td style="text-align:center; padding:5px;">${cmd.scaleHtml}</td>
                    <td style="text-align:center; padding:5px;">${cmd.origin}</td>
                    <td style="text-align:center; padding:5px;">${cmd.player}</td>
                    <td style="text-align:center; padding:5px; color:#555;">${cmd.arrivalStr}</td>
                    <td style="text-align:right; padding:5px;">
                        <span class="gemini-custom-timer" data-endtime="${cmd.endTime}" style="font-family: monospace; font-size:13px; font-weight:bold; background:#fff; padding:2px 4px; border:1px solid #d4c29c; border-radius:2px;">0:00:00</span>
                    </td>
                `;
                table.appendChild(tr);
            });

            header.addEventListener('click', (e) => {
                if (e.target.tagName.toLowerCase() === 'a') return;
                
                const iconSpan = leftContent.querySelector('.toggle-icon');
                if (tableContainer.style.display === 'none') {
                    tableContainer.style.display = 'block';
                    iconSpan.textContent = '▼';
                } else {
                    tableContainer.style.display = 'none';
                    iconSpan.textContent = '►';
                }
            });

            tableContainer.appendChild(table);
            tableWrapper.appendChild(header);
            tableWrapper.appendChild(tableContainer);
            fragment.appendChild(tableWrapper);
        });

        resultsContainer.appendChild(fragment);
    }

    function startCustomTimer() {
        if (window.geminiTimerInterval) clearInterval(window.geminiTimerInterval);

        window.geminiTimerInterval = setInterval(() => {
            const timers = document.querySelectorAll('.gemini-custom-timer');
            if (timers.length === 0) return;

            const serverTimeSeconds = Math.floor((window.Timing ? window.Timing.getCurrentServerTime() : Date.now()) / 1000);

            timers.forEach(timer => {
                const endTime = parseInt(timer.getAttribute('data-endtime'));
                if (!endTime || endTime <= 0) return;

                let remaining = endTime - serverTimeSeconds;

                if (remaining <= 0) {
                    timer.textContent = "0:00:00";
                    timer.style.color = '#c00';
                    timer.style.borderColor = '#c00';
                } else {
                    const h = Math.floor(remaining / 3600);
                    const m = Math.floor((remaining % 3600) / 60);
                    const s = remaining % 60;
                    timer.textContent = `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                }
            });
        }, 1000);
    }
})();
