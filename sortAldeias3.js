// ==UserScript==
// @name         TW - Renomear Aldeias por Ordem de Conquista
// @namespace    https://github.com/
// @version      3.2.0
// @description  Renomeação rápida e garantida de aldeias por ordem cronológica
// @author       d0wn
// @match        https://*.tribalwars.com.pt/game.php*
// @match        https://*.tribos.com.pt/game.php*
// @grant        none
// ==/UserScript==

(async function() {
    'use strict';

    const CONFIG = {
        format: "#{nr} - {coords}", // Tags: {nr}, {coords}, {name}
        delayMs: 35,                // Delay mínimo e seguro entre pedidos
        autoReload: true
    };

    if (typeof game_data === 'undefined' || !game_data.player.id) return;

    try {
        const playerId = parseInt(game_data.player.id);
        const csrfToken = game_data.csrf;

        console.log('[TW-Rename] A descarregar base de dados...');

        // 1. Download paralelo dos ficheiros de aldeias e conquistas
        const [vRes, cRes] = await Promise.all([
            fetch('/map/village.txt'),
            fetch('/map/conquer.txt')
        ]);

        const [vText, cText] = await Promise.all([vRes.text(), cRes.text()]);

        // 2. Mapear todas as aldeias do jogador
        const myVillages = [];
        vText.trim().split('\n').forEach(line => {
            const parts = line.split(',');
            if (parts.length >= 5 && parseInt(parts[4]) === playerId) {
                myVillages.push({
                    id: parseInt(parts[0]),
                    name: decodeURIComponent(parts[1].replace(/\+/g, ' ')),
                    coords: `${parts[2]}|${parts[3]}`
                });
            }
        });

        if (myVillages.length === 0) {
            UI.ErrorMessage('Nenhuma aldeia encontrada para este jogador.');
            return;
        }

        // 3. Mapear última conquista registada de cada aldeia
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

        // 4. Ordenar aldeias cronologicamente
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

        // 5. Montar lista de renomeação
        const padLen = Math.max(3, String(fullOrderedList.length).length);
        const queue = [];

        fullOrderedList.forEach((v, idx) => {
            const nr = String(idx + 1).padStart(padLen, '0');
            const targetName = CONFIG.format
                .replace('{nr}', nr)
                .replace('{coords}', v.coords)
                .replace('{name}', v.name);

            if (v.name !== targetName) {
                queue.push({ id: v.id, targetName });
            }
        });

        if (queue.length === 0) {
            UI.SuccessMessage('Todas as aldeias já se encontram ordenadas.');
            return;
        }

        if (!confirm(`Total de aldeias: ${fullOrderedList.length}\nAldeias a renomear: ${queue.length}\n\nAvançar?`)) {
            return;
        }

        // 6. Envio com o endpoint correto e delay ultra-baixo
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
            setTimeout(() => location.reload(), 500);
        }

    } catch (err) {
        console.error('[TW-Rename] Erro:', err);
        UI.ErrorMessage('Erro ao renomear as aldeias.');
    }
})();
