// ==UserScript==
// @name         TW - Renomear Aldeias por Ordem de Conquista (com barra de progresso)
// @namespace    https://github.com/
// @version      3.4.0
// @description  Renomeia todas as aldeias por ordem cronológica com barra de progresso visual
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

        // 1. Obter a lista REAL e ATUALIZADA de todas as tuas aldeias
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
                const cleanName = fullText.replace(/\(\d{3}\|\d{3}\)\s*K\d{2}/gi, '').trim();

                myVillages.push({ id, name: cleanName, coords });
            }
        });

        if (myVillages.length === 0) {
            UI.ErrorMessage('Nenhuma aldeia encontrada na visualização combinada.');
            return;
        }

        // 2. Mapear última conquista registada
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

        // 3. Ordenação cronológica
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

        // Criar elemento visual da barra de progresso no ecrã
        const progressBox = document.createElement('div');
        progressBox.style.cssText = 'position:fixed; top:20px; left:50%; transform:translateX(-50%); z-index:99999; background:#f4e4bc; border:2px solid #8c5f0d; padding:15px 25px; border-radius:6px; box-shadow:0 4px 15px rgba(0,0,0,0.5); font-family:Verdana,Arial,sans-serif; text-align:center; width:350px;';
        progressBox.innerHTML = `
            <div id="tw-progress-text" style="font-weight:bold; color:#603000; margin-bottom:8px; font-size:13px;">A renomear 0/${queue.length}...</div>
            <div style="background:#e0c997; border:1px solid #a37c44; border-radius:4px; height:18px; width:100%; overflow:hidden;">
                <div id="tw-progress-bar" style="background:linear-gradient(to bottom, #5cb85c 0%, #449d44 100%); width:0%; height:100%; transition:width 0.1s ease;"></div>
            </div>
        `;
        document.body.appendChild(progressBox);

        // 5. Envio sequencial com atualização da barra de progresso
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

            // Atualizar valores da barra
            const percent = Math.round(((i + 1) / queue.length) * 100);
            document.getElementById('tw-progress-text').innerText = `A renomear ${i + 1}/${queue.length} (${percent}%)...`;
            document.getElementById('tw-progress-bar').style.width = `${percent}%`;

            if (CONFIG.delayMs > 0 && i < queue.length - 1) {
                await new Promise(r => setTimeout(r, CONFIG.delayMs));
            }
        }

        progressBox.remove();
        UI.SuccessMessage(`Concluído! ${queue.length} aldeias renomeadas.`);

        if (CONFIG.autoReload) {
            setTimeout(() => location.reload(), 600);
        }

    } catch (err) {
        console.error('[TW-Rename] Erro:', err);
        UI.ErrorMessage('Erro ao renomear as aldeias.');
    }
})();
