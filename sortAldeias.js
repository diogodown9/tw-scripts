// ==UserScript==
// @name         TW - Renomear Aldeias por Ordem de Conquista
// @namespace    https://github.com/
// @version      2.0.0
// @description  Renomeia todas as aldeias por ordem cronológica com batching paralelo rápido
// @author       d0wn
// @match        https://*.tribalwars.com.pt/game.php*
// @match        https://*.tribos.com.pt/game.php*
// @grant        none
// ==/UserScript==

(async function() {
    'use strict';

    const CONFIG = {
        format: "#{nr} - {coords}", // Tags: {nr}, {coords}, {name}
        batchSize: 5,               // Número de aldeias renomeadas em paralelo
        batchDelayMs: 150,          // Intervalo entre cada lote
        autoReload: true
    };

    if (typeof game_data === 'undefined' || !game_data.player.id) return;

    try {
        const playerId = parseInt(game_data.player.id);
        const csrfToken = game_data.csrf;

        console.log('[TW-Rename] A carregar dados do mundo...');

        // 1. Download paralelo dos ficheiros de aldeias e conquistas
        const [vRes, cRes] = await Promise.all([
            fetch('/map/village.txt'),
            fetch('/map/conquer.txt')
        ]);

        const [vText, cText] = await Promise.all([vRes.text(), cRes.text()]);

        // 2. Mapear aldeias atuais do jogador
        const myVillages = new Map();
        vText.trim().split('\n').forEach(line => {
            const [vId, name, x, y, ownerId] = line.split(',');
            if (parseInt(ownerId) === playerId) {
                myVillages.set(parseInt(vId), {
                    id: parseInt(vId),
                    name: decodeURIComponent(name.replace(/\+/g, ' ')),
                    coords: `${x}|${y}`
                });
            }
        });

        if (myVillages.size === 0) return;

        // 3. Mapear data da última conquista por aldeia
        const latestConquest = new Map();
        cText.trim().split('\n').forEach(line => {
            const [vId, timestamp, newOwner] = line.split(',');
            if (parseInt(newOwner) === playerId) {
                latestConquest.set(parseInt(vId), parseInt(timestamp));
            }
        });

        // 4. Separar aldeia inicial e ordenar conquistas cronologicamente
        const initialVillages = [];
        const conqueredVillages = [];

        myVillages.forEach((data, id) => {
            if (latestConquest.has(id)) {
                conqueredVillages.push({ ...data, time: latestConquest.get(id) });
            } else {
                initialVillages.push({ ...data, time: 0 });
            }
        });

        conqueredVillages.sort((a, b) => a.time - b.time);
        const orderedList = [...initialVillages, ...conqueredVillages];

        // 5. Filtrar apenas aldeias com nome desatualizado
        const padLen = Math.max(3, String(orderedList.length).length);
        const queue = [];

        orderedList.forEach((v, idx) => {
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
            UI.SuccessMessage('Todas as aldeias já se encontram com o nome correto.');
            return;
        }

        if (!confirm(`Aldeias a renomear: ${queue.length}/${orderedList.length}\nDeseja avançar?`)) {
            return;
        }

        // 6. Execução por lotes em paralelo
        for (let i = 0; i < queue.length; i += CONFIG.batchSize) {
            const batch = queue.slice(i, i + CONFIG.batchSize);

            await Promise.all(batch.map(item => 
                fetch(`/game.php?village=${item.id}&screen=main&action=change_name`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ name: item.targetName, h: csrfToken })
                })
            ));

            console.log(`[TW-Rename] Concluídas ${Math.min(i + CONFIG.batchSize, queue.length)}/${queue.length}`);

            if (i + CONFIG.batchSize < queue.length) {
                await new Promise(r => setTimeout(r, CONFIG.batchDelayMs));
            }
        }

        UI.SuccessMessage(`Concluído! ${queue.length} aldeias renomeadas.`);

        if (CONFIG.autoReload) {
            setTimeout(() => location.reload(), 1000);
        }

    } catch (err) {
        console.error('[TW-Rename] Erro:', err);
        UI.ErrorMessage('Erro ao renomear as aldeias.');
    }
})();
