// ==UserScript==
// @name         TW - Renomear Aldeias por Ordem de Conquista
// @namespace    https://github.com/
// @version      3.0.0
// @description  Renomeia todas as aldeias do jogador por ordem cronológica sem limite de paginação
// @author       d0wn
// @match        https://*.tribalwars.com.pt/game.php*
// @match        https://*.tribos.com.pt/game.php*
// @grant        none
// ==/UserScript==

(async function() {
    'use strict';

    const CONFIG = {
        format: "#{nr} - {coords}", // Tags: {nr}, {coords}, {name}
        delayMs: 120,
        autoReload: true
    };

    if (typeof game_data === 'undefined' || !game_data.player.id) return;

    try {
        const playerId = parseInt(game_data.player.id);
        const csrfToken = game_data.csrf;

        console.log('[TW-Rename] A descarregar base de dados...');

        // 1. Obter ficheiros de dados do mundo em paralelo
        const [vRes, cRes] = await Promise.all([
            fetch('/map/village.txt'),
            fetch('/map/conquer.txt')
        ]);

        const [vText, cText] = await Promise.all([vRes.text(), cRes.text()]);

        // 2. Extrair TODAS as aldeias que pertencem ao jogador
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

        // 3. Mapear a ÚLTIMA conquista registada de cada aldeia tua
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

        // 4. Ordenar aldeias: iniciais primeiro (sem registo de conquista), restantes por timestamp
        const initialList = [];
        const conqueredList = [];

        myVillages.forEach(v => {
            if (latestConquests.has(v.id)) {
                conqueredList.push({ ...v, conquerTime: latestConquests.get(v.id) });
            } else {
                initialList.push({ ...v, conquerTime: 0 });
            }
        });

        // Ordenação cronológica crescente
        conqueredList.sort((a, b) => a.conquerTime - b.conquerTime);
        const fullOrderedList = [...initialList, ...conqueredList];

        // 5. Determinar quais aldeias precisam de novo nome
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
            UI.SuccessMessage('Todas as aldeias já estão ordenadas.');
            return;
        }

        if (!confirm(`Total de aldeias detidas: ${fullOrderedList.length}\nAldeias a renomear: ${queue.length}\n\nDesejas continuar?`)) {
            return;
        }

        // 6. Enviar pedidos de renomeação sequenciais
        for (let i = 0; i < queue.length; i++) {
            const item = queue[i];

            await fetch(`/game.php?village=${item.id}&screen=main&action=change_name`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ name: item.targetName, h: csrfToken })
            });

            console.log(`[TW-Rename] (${i + 1}/${queue.length}) Aldeia ${item.id} -> ${item.targetName}`);
            await new Promise(r => setTimeout(r, CONFIG.delayMs));
        }

        UI.SuccessMessage(`Concluído! ${queue.length} aldeias atualizadas com sucesso.`);
        
        if (CONFIG.autoReload) {
            setTimeout(() => location.reload(), 800);
        }

    } catch (err) {
        console.error('[TW-Rename] Erro fatal:', err);
        UI.ErrorMessage('Erro ao processar as aldeias.');
    }
})();
