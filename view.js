(async function () {
    const uiId = 'tw-dark-ui-overview';
    
    // Função global de fecho limpa
    function closeUI() {
        if(document.getElementById(uiId)) document.getElementById(uiId).remove();
        if(document.getElementById(`${uiId}-backdrop`)) document.getElementById(`${uiId}-backdrop`).remove();
        if(document.getElementById(`${uiId}-style`)) document.getElementById(`${uiId}-style`).remove();
        document.removeEventListener('keydown', escListener);
        delete window.twRenderPage;
        delete window.twChangePage;
    }
    
    function escListener(e) { if(e.key === 'Escape') closeUI(); }

    if (document.getElementById(uiId)) {
        closeUI();
        return;
    }

    // --- 1. INJETAR CSS DO DASHBOARD ---
    const style = document.createElement('style');
    style.id = `${uiId}-style`;
    style.innerHTML = `
        #${uiId}-backdrop {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.75); z-index: 99998;
            backdrop-filter: blur(4px); animation: fadeIn 0.2s ease;
        }
        #${uiId} {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #181a1b; color: #e8e6e3; border: 1px solid #3a3e41;
            border-radius: 12px; z-index: 99999; padding: 25px;
            box-shadow: 0 15px 50px rgba(0,0,0,0.9); 
            width: max-content; 
            min-width: 800px; 
            max-width: 95vw; 
            max-height: 90vh;
            display: flex; flex-direction: column;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            opacity: 0; transition: opacity 0.2s ease-out;
        }
        #${uiId}.show { opacity: 1; }
        .tw-ui-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #3a3e41; padding-bottom: 15px; margin-bottom: 20px; flex-shrink: 0; }
        .tw-ui-title { font-size: 20px; font-weight: bold; color: #fff; display: flex; align-items: center; gap: 10px;}
        .tw-ui-close { cursor: pointer; color: #888; font-size: 32px; line-height: 20px; transition: all 0.2s; padding: 4px; border-radius: 6px; user-select: none; }
        .tw-ui-close:hover { color: #ff5555; background: rgba(255,85,85,0.1); transform: scale(1.15); }
        
        .tw-ov-container { overflow-y: auto; flex-grow: 1; padding-right: 5px; }
        .tw-ov-container::-webkit-scrollbar { width: 8px; }
        .tw-ov-container::-webkit-scrollbar-track { background: #1a1a1a; border-radius: 4px; }
        .tw-ov-container::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; }
        .tw-ov-container::-webkit-scrollbar-thumb:hover { background: #555; }

        .tw-ov-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .tw-ov-table th, .tw-ov-table td { padding: 10px 8px; border-bottom: 1px solid #2a2d30; text-align: center; }
        .tw-ov-table th { background: #222426; position: sticky; top: 0; z-index: 2; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        .tw-ov-table tbody tr { transition: background 0.1s; }
        .tw-ov-table tbody tr:hover { background: #222426; }
        
        .tw-ov-badge { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
        .tw-ov-badge.ataque { background: rgba(255, 85, 85, 0.15); color: #ff5555; border: 1px solid rgba(255,85,85,0.3); }
        .tw-ov-badge.defesa { background: rgba(85, 255, 85, 0.15); color: #55ff55; border: 1px solid rgba(85,255,85,0.3); }
        .tw-ov-badge.nenhum { background: rgba(136, 136, 136, 0.15); color: #888; border: 1px solid rgba(136,136,136,0.3); }
        
        .tw-ov-pagination { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; border-top: 1px solid #3a3e41; padding-top: 15px; flex-shrink: 0; }
        .tw-ov-btn { background: #2a2d30; color: #e8e6e3; border: 1px solid #444; padding: 8px 16px; border-radius: 6px; cursor: pointer; transition: 0.2s; font-weight: bold; }
        .tw-ov-btn:hover:not(:disabled) { background: #3a3e41; border-color: #7fbfff; color: #fff; }
        .tw-ov-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        
        .tw-spinner { display: inline-block; width: 20px; height: 20px; border: 2px solid rgba(255,255,255,.3); border-radius: 50%; border-top-color: #fff; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    `;
    document.head.appendChild(style);

    // --- 2. CRIAR ESTRUTURA BASE ---
    const backdrop = document.createElement('div');
    backdrop.id = `${uiId}-backdrop`;
    document.body.appendChild(backdrop);

    const ui = document.createElement('div');
    ui.id = uiId;
    ui.innerHTML = `
        <div class="tw-ui-header">
            <div class="tw-ui-title" id="tw-ui-title"><div class="tw-spinner"></div> A compilar o império...</div>
            <span class="tw-ui-close" id="tw-ui-close-btn" title="Fechar (ESC)">&times;</span>
        </div>
        <div class="tw-ov-container" id="tw-ov-container">
            <div style="text-align:center; color:#a8a095; padding: 40px 0;">A extrair as tropas e grupos de todas as aldeias...</div>
        </div>
        <div class="tw-ov-pagination" id="tw-ov-pagination" style="display:none;">
            <button class="tw-ov-btn" id="tw-btn-prev" onclick="window.twChangePage(-1)">&#8592; Anterior</button>
            <span id="tw-page-info" style="font-weight:bold; color:#aaa;">Página 1 de 1</span>
            <button class="tw-ov-btn" id="tw-btn-next" onclick="window.twChangePage(1)">Próxima &#8594;</button>
        </div>
    `;
    document.body.appendChild(ui);
    
    document.getElementById('tw-ui-close-btn').addEventListener('click', closeUI);
    backdrop.addEventListener('click', closeUI);
    document.addEventListener('keydown', escListener);

    setTimeout(() => ui.classList.add('show'), 10);

    // --- 3. LÓGICA DE EXTRAÇÃO GLOBAL ---
    try {
        const baseUrl = game_data.link_base_pure;
        
        // Extrai as 3 páginas simultaneamente (Adicionando page=-1 para carregar todas as aldeias sem limite)
        const [resUnits, resAtaque, resDefesa] = await Promise.all([
            fetch(baseUrl + 'overview_villages&mode=units&type=complete&page=-1').then(r => r.text()),
            fetch(baseUrl + 'overview_villages&mode=groups&type=dynamic&group=67279&page=-1').then(r => r.text()),
            fetch(baseUrl + 'overview_villages&mode=groups&type=dynamic&group=67280&page=-1').then(r => r.text())
        ]);

        const parser = new DOMParser();
        const dU = parser.parseFromString(resUnits, 'text/html');
        const dAtq = parser.parseFromString(resAtaque, 'text/html');
        const dDef = parser.parseFromString(resDefesa, 'text/html');

        // Mapear Grupos
        const ataqueIds = new Set();
        dAtq.querySelectorAll('.quickedit-vn, .village_anchor').forEach(el => {
            if (el.dataset.id) ataqueIds.add(el.dataset.id);
        });

        const defesaIds = new Set();
        dDef.querySelectorAll('.quickedit-vn, .village_anchor').forEach(el => {
            if (el.dataset.id) defesaIds.add(el.dataset.id);
        });

        // Mapear Tropas
        const unitsTable = dU.querySelector('#units_table');
        if (!unitsTable) throw new Error("Tabela geral de tropas não encontrada.");

        const headers = Array.from(unitsTable.querySelectorAll('thead th')).filter(th => th.querySelector('img[src*="unit_"]'));
        const unitConfigs = headers.map(th => {
            const img = th.querySelector('img');
            const match = img.src.match(/unit_([a-z_]+)\.png/);
            return { 
                name: match ? match[1] : '?', 
                src: img.src, 
                isHidden: th.classList.contains('hidden') || th.style.display === 'none' 
            };
        });

        const allVillages = [];
        Array.from(unitsTable.querySelectorAll('tbody')).forEach(tb => {
            const anchor = tb.querySelector('.village_anchor') || tb.querySelector('.quickedit-vn');
            if (!anchor || !anchor.dataset.id) return;
            
            const vId = anchor.dataset.id;
            const nameEl = tb.querySelector('.quickedit-label');
            const vName = nameEl ? nameEl.textContent.trim() : 'Aldeia';

            const rows = Array.from(tb.querySelectorAll('tr'));
            let totalRow = rows.find(tr => {
                const td = tr.querySelector('td');
                return td && td.textContent.trim().toLowerCase() === 'total';
            });
            if (!totalRow) totalRow = rows[rows.length - 1];

            const unitCells = Array.from(totalRow.querySelectorAll('td.unit-item'));
            if (unitCells.length === 0) return;

            const troops = [];
            
            headers.forEach((th, i) => {
                if (unitConfigs[i].isHidden) return;
                const cell = unitCells[i];
                if (cell && !cell.classList.contains('hidden') && cell.style.display !== 'none') {
                    const count = parseInt(cell.textContent.replace(/\./g, '').trim()) || 0;
                    troops.push(count);
                } else {
                    troops.push(0);
                }
            });

            // Determinar o Grupo
            let groupBadge = '<span class="tw-ov-badge nenhum">-</span>';
            if (ataqueIds.has(vId)) {
                groupBadge = '<span class="tw-ov-badge ataque">Ataque</span>';
            } else if (defesaIds.has(vId)) {
                groupBadge = '<span class="tw-ov-badge defesa">Defesa</span>';
            }

            allVillages.push({ id: vId, name: vName, groupBadge, troops });
        });

        if (allVillages.length === 0) throw new Error("Nenhuma aldeia extraída com sucesso.");

        // --- 4. PAGINAÇÃO E RENDERIZAÇÃO ---
        let currentPage = 1;
        const itemsPerPage = 10; // <- Podes alterar este número no futuro se quiseres ver 20 ou 30
        const totalPages = Math.ceil(allVillages.length / itemsPerPage);

        window.twRenderPage = function(page) {
            currentPage = page;
            const start = (page - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            const currentVillages = allVillages.slice(start, end);

            let html = '<table class="tw-ov-table"><thead><tr><th style="text-align:left; min-width: 200px;">Aldeia</th><th>Grupo</th>';
            unitConfigs.forEach(u => {
                if (!u.isHidden) html += `<th><img src="${u.src}" alt="${u.name}" style="filter: drop-shadow(0 2px 2px rgba(0,0,0,0.5));"></th>`;
            });
            html += '</tr></thead><tbody>';

            currentVillages.forEach(v => {
                html += `<tr>
                    <td style="text-align:left; font-weight:bold; color:#7fbfff;">${v.name}</td>
                    <td>${v.groupBadge}</td>`;
                v.troops.forEach(t => {
                    const opacity = t === 0 ? '0.2' : '1';
                    const color = t === 0 ? '#555' : '#fff';
                    html += `<td style="color:${color}; opacity:${opacity}; font-weight:bold;">${t}</td>`;
                });
                html += '</tr>';
            });
            html += '</tbody></table>';

            document.getElementById('tw-ov-container').innerHTML = html;
            document.getElementById('tw-page-info').textContent = `Página ${currentPage} de ${totalPages}`;
            
            document.getElementById('tw-btn-prev').disabled = (currentPage === 1);
            document.getElementById('tw-btn-next').disabled = (currentPage === totalPages);
        };

        window.twChangePage = function(dir) {
            let newPage = currentPage + dir;
            if (newPage >= 1 && newPage <= totalPages) {
                window.twRenderPage(newPage);
            }
        };

        document.getElementById('tw-ui-title').innerHTML = '🌍 Overview Geral do Império';
        document.getElementById('tw-ov-pagination').style.display = 'flex';
        
        // Renderizar a 1ª página
        window.twRenderPage(1);

    } catch (err) {
        document.getElementById('tw-ui-title').innerHTML = '❌ Erro no Overview';
        document.getElementById('tw-ov-container').innerHTML = `
            <div style="background: rgba(255,85,85,0.1); border: 1px solid #ff5555; border-radius: 8px; padding: 20px; color:#ffaaaa; text-align:center; font-size:15px; margin-top:20px;">
                ${err.message}
            </div>
        `;
        console.error('[Overview Script]', err);
    }
})();
