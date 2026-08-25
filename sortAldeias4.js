// ==UserScript==
// @name         TW - Renomear Aldeias por Ordem de Conquista
// @namespace    https://github.com/
// @version      3.3.0
// @description  Renomeia todas as aldeias por ordem cronológica sem erros de cache
// @author       d0wn
// @match        https://*.tribalwars.com.pt/game.php*
// @match        https://*.tribos.com.pt/game.php*
// @grant        none
// ==/UserScript==

(async function() {
    'use strict';

    const CONFIG = {
        format: "#{nr} - {coords}", // Tags: {nr}, {coords}, {name}
        delayMs: 60,                // Intervalo estável entre requisições
        autoReload: true
    };

    if (typeof game_data === 'undefined' || !game_data.player.id) return;

    try {
        const playerId = parseInt(game_data.player.id);
        const csrfToken = game_data.csrf;

        console.log('[TW-Rename] A carregar dados...');

        // 1. Obter a lista REAL e ATUALIZADA de todas as tuas aldeias via página do jogador
        const [overviewRes, cRes] = await Promise.all([
            fetch(`/game.php?screen=overview_villages&mode=combined&page=-1`),
            fetch('/map/conquer.txt')
        ]);

        const [overviewHtml, cText] = await Promise.all([overviewRes.text(), cRes.text()]);

        const parser = new DOMParser();
        const doc = parser.parseFromString(overviewHtml, 'text/html');
        const rows = doc.querySelectorAll('#combined_table tr[class*="nowrap"]');

        const myVillages = [];
        rows.forEach(row => {
            const link = row.querySelector('.quickedit-vn');
            if (link) {
                const id = parseInt(link.getAttribute('data-id'));
                const label = row.querySelector('.quickedit-label');
                const fullText = label ? label.textContent.trim() : link.innerText.trim();
                const coordsMatch = fullText.match(/\((\d{3}\|\d{3})\)/) || fullText.match(/(\d{3}\|\d{3})/);
                const coords = coordsMatch ? coordsMatch[1] : '000|000';
                
                // Nome limpo (sem coordenadas/continente)
                const cleanName = fullText.replace(/\(\d{3}\|\d{3}\)\s*K\d{2}/gi, '').trim();

                myVillages.push({ id, name: cleanName, coords });
            }
        });

        if (myVillages.length === 0) {
            UI.ErrorMessage('Nenhuma aldeia encontrada na visualização combinada.');
            return;
        }

        // 2. Mapear última conquista registada de cada aldeia
        const latestConquests = new Map();
        cText.trim().split('\n').forEach(line => {
            const parts = line.split(',');
            if (parts.length >= 4) {
                const vId = parseInt(parts[0]);
                const timestamp = parseInt(parts[1]);
                const newOwner = parseInt(parts[2]);

                if (newOwner === playerId) {
                    const currentMax = latestConquests.get(vId) || 0;
                    if (timestamp > currentMax) {
                        latestConquests.set(vId, timestamp);
                    }
                }
            }
        });

        // 3. Ordenação cronológica (aldeia inicial primeiro, restantes por timestamp)
        const initialList = [];
        const conqueredList = [];

        myVillages.forEach(v => {
            if (latestConquests.has(v.id)) {
                conqueredList.push({ ...v, conquerTime: latestConquests.get(v.id) });
            } else {
                initialList.push({ ...v, conquerTime: 0 });
            }
        });

        conqueredList.sort((a, b) => a.conquerTime - b.conquerTime);
        const fullOrderedList = [...initialList, ...conqueredList];

        // 4. Montar lista com nomes alvo
        const padLen = Math.max(3, String(fullOrderedList.length).length);
        const queue = [];

        fullOrderedList.forEach((v, idx) => {
            const nr = String(idx + 1).padStart(padLen, '0');
            const targetName = CONFIG.format
                .replace('{nr}', nr)
                .replace('{coords}', v.coords)
                .replace('{name}', v.name);

            // Verifica se o nome precisa de ser alterado
            if (v.name !== targetName && !v.name.startsWith(`#${nr}`)) {
                queue.push({ id: v.id, targetName });
            }
        });

        if (queue.length === 0) {
            UI.SuccessMessage('Todas as aldeias já se encontram com o nome correto.');
            return;
        }

        if (!confirm(`Total de aldeias: ${fullOrderedList.length}\nAldeias a renomear: ${queue.length}\n\nAvançar?`)) {
            return;
        }

        // 5. Envio sequencial seguro
        for (let i = 0; i < queue.length; i++) {
            const item = queue[i];

            await fetch(`/game.php?village=${item.id}&screen=main&action=change_name`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    name: item.targetName,
                    h: csrfToken
                })
            });

            console.log(`[TW-Rename] (${i + 1}/${queue.length}) -> ${item.targetName}`);

            if (CONFIG.delayMs > 0 && i < queue.length - 1) {
                await new Promise(r => setTimeout(r, CONFIG.delayMs));
            }
        }

        UI.SuccessMessage(`Concluído! ${queue.length} aldeias renomeadas.`);

        if (CONFIG.autoReload) {
            setTimeout(() => location.reload(), 600);
        }

    } catch (err) {
        console.error('[TW-Rename] Erro:', err);
        UI.ErrorMessage('Erro ao renomear as aldeias.');
    }
})();
