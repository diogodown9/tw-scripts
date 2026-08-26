(function() {
    'use strict';

    const PANEL_ID = 'tw-left-villages-panel';
    const CACHE_PREFIX = 'tw-villages-cache-v15_';
    const CACHE_TIME = 60 * 60 * 1000; // 1 hora de memória
    
    // Chave de ordenação única por mundo e jogador
    const worldId = (window.game_data && window.game_data.world) ? window.game_data.world : 'tw';
    const playerId = (window.game_data && window.game_data.player) ? String(window.game_data.player.id) : '0';
    const ORDER_STORAGE_KEY = `tw-village-order-conquer_${worldId}_${playerId}`;

    // EFEITO LIGA/DESLIGA
    const existingPanel = document.getElementById(PANEL_ID);
    if (existingPanel) {
        existingPanel.style.display = existingPanel.style.display === 'none' ? 'flex' : 'none';
        return;
    }

    // LER POSIÇÃO GUARDADA
    const savedTop = localStorage.getItem('tw-villages-pos-top');
    const savedLeft = localStorage.getItem('tw-villages-pos-left');
    const savedSide = localStorage.getItem('tw-villages-panel-side') || 'left';

    // ESTILOS 
    const style = document.createElement('style');
    style.textContent = `
        #tw-left-villages-panel * { font-family: Verdana, Arial, sans-serif; box-sizing: border-box; }
        #tw-villages-list::-webkit-scrollbar { width: 6px; }
        #tw-villages-list::-webkit-scrollbar-track { background: #e3d5b3; border-left: 1px solid #8c5f0d; }
        #tw-villages-list::-webkit-scrollbar-thumb { background: #8c5f0d; }
        
        .tw-village-container { border-bottom: 1px solid #c4a475; }
        .tw-village-row { display: flex; align-items: center; justify-content: space-between; padding: 3px 6px; cursor: pointer; transition: background-color 0.2s; }
        
        .tw-village-row.row_a { background-color: #fff5da; }
        .tw-village-row.row_b { background-color: #f0e2be; }
        .tw-village-row:hover { background-color: #dcb588 !important; }
        .tw-village-row.current-village { border-left: 3px solid #8c0000; padding-left: 3px; }
        
        .tw-village-atk { background-color: #f7d7d7 !important; } 
        .tw-village-def { background-color: #d7e8f7 !important; } 
        .tw-village-both { background-color: #e8d7f7 !important; } 
        
        .tw-village-atk:hover { background-color: #eebfbf !important; }
        .tw-village-def:hover { background-color: #bfd9ee !important; }
        .tw-village-both:hover { background-color: #d9bfee !important; }
        
        .tw-village-info { display: flex; align-items: center; overflow: hidden; flex-grow: 1; min-width: 0; }
        .tw-village-pos { font-size: 10px; font-weight: bold; color: #735018; margin-right: 4px; min-width: 24px; flex-shrink: 0; }
        .tw-village-cb { margin: 0 4px 0 0 !important; width: 12px; height: 12px; cursor: pointer; flex-shrink: 0; }
        
        .tw-village-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #004600; font-weight: 700; font-size: 11px; flex-grow: 1; }
        
        .tw-village-actions { display: flex; gap: 2px; align-items: center; margin-left: 4px; flex-shrink: 0; }
        
        .tw-btn-arrow { background: #f4e4bc; border: 1px solid #8c5f0d; border-radius: 2px; padding: 1px 3px; font-size: 9px; cursor: pointer; line-height: 10px; }
        .tw-btn-arrow:hover { background: #deb887; }
        
        .tw-btn-eye, .tw-btn-troops { background: #f4e4bc; border: 1px solid #8c5f0d; border-radius: 2px; padding: 2px 4px; font-size: 10px; cursor: pointer; text-decoration: none; color: #333; margin-right: 2px; }
        .tw-btn-eye:hover, .tw-btn-troops:hover { background: #deb887; }
        .tw-btn-troops.active { background: #8c5f0d; color: #fff; }
        
        .tw-btn-copy { background: linear-gradient(to bottom, #3498db 0%, #2980b9 100%); color: #fff; border: 1px solid #1c5982; border-radius: 3px; padding: 2px 5px; font-size: 10px; cursor: pointer; font-weight: bold; }
        .tw-btn-copy:hover { background: linear-gradient(to bottom, #2980b9 0%, #1c5982 100%); }

        /* Painel expansível de tropas */
        .tw-troops-panel { display: none; background: #222426; color: #fff; padding: 5px; font-size: 10px; border-top: 1px dashed #555; }
        .tw-troops-table { width: 100%; border-collapse: collapse; text-align: center; }
        .tw-troops-table th, .tw-troops-table td { padding: 2px; white-space: nowrap; }
        .tw-troops-table th { border-bottom: 1px solid #444; }
        .tw-troops-table td { font-size: 9.5px; }
        .tw-troops-lbl { font-weight: bold; text-align: left !important; color: #deb887; padding-right: 4px !important; font-size: 9px !important; }
        .tw-troops-zero { color: #666; }
        .tw-troops-val { color: #fff; font-weight: bold; }
    `;
    document.head.appendChild(style);

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.style.position = 'fixed';
    
    // APLICA POSIÇÃO ARRASTADA OU O LADO GUARDADO
    if (savedTop && savedLeft) {
        panel.style.top = savedTop;
        panel.style.left = savedLeft;
    } else {
        panel.style.top = '55px';
        if (savedSide === 'right') panel.style.right = '10px';
        else panel.style.left = '10px';
    }
    
    panel.style.width = '350px'; 
    panel.style.maxHeight = 'calc(100vh - 170px)'; 
    panel.style.backgroundColor = '#e3d5b3';
    panel.style.border = '2px solid #8c5f0d';
    panel.style.borderRadius = '3px';
    panel.style.boxShadow = '2px 4px 8px rgba(0,0,0,0.6)';
    panel.style.zIndex = '9999';
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';

    panel.innerHTML = `
        <div id="tw-drag-header" style="cursor: move; background: url('https://dspt.innogamescdn.com/asset/876c6ddb/graphic/index/main_bg.jpg') repeat; padding: 6px; border-bottom: 2px solid #8c5f0d; font-weight: bold; text-align: center; color: #603000; position: relative; font-size: 12px; font-family: Verdana, Arial; user-select: none;">
            🏰 Gestor de Aldeias
            <div style="position: absolute; right: 5px; top: 4px; display: flex; gap: 4px; align-items: center;">
                <span id="tw-refresh-data" title="Atualizar Dados (Forçar Servidor)" style="cursor: pointer; color: #000; font-size: 11px; border: 1px solid #8c5f0d; border-radius: 2px; background: #e3d5b3; padding: 0 4px; line-height: 12px;">🔄</span>
                <span id="close-left-panel" title="Fechar" style="cursor: pointer; color: #a02c2c; font-size: 10px; border: 1px solid #a02c2c; border-radius: 2px; width: 14px; height: 14px; line-height: 12px; background: #e3d5b3;">✖</span>
            </div>
        </div>
        
        <div style="padding: 6px; background: #deb887; border-bottom: 1px solid #8c5f0d; display: flex; flex-direction: column; gap: 5px;">
            <select id="tw-group-select" style="display: none; width: 100%; padding: 3px; border: 1px solid #8c5f0d; border-radius: 2px; font-size: 11px; cursor: pointer; background: #fff;"></select>
            
            <input type="text" id="tw-village-search" placeholder="Procurar nome ou coord..." style="width: 100%; box-sizing: border-box; padding: 4px; border: 1px solid #8c5f0d; border-radius: 2px; font-size: 11px; outline: none;">
            
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; margin-top: 2px;">
                <label style="cursor: pointer; display: flex; align-items: center; font-weight: bold; color: #603000;">
                    <input type="checkbox" id="tw-select-all" style="margin: 0 4px 0 0; width: 12px; height: 12px;"> Todas
                </label>
                <div style="display: flex; gap: 4px;">
                    <button id="tw-reset-order" title="Sincronizar com /map/conquer.txt (Ordem real de conquista)" style="background: linear-gradient(to bottom, #d9534f 0%, #c9302c 100%); color: white; border: 1px solid #ac2925; border-radius: 3px; padding: 2px 5px; font-size: 10px; cursor: pointer; font-weight: bold;">↺ Conquista</button>
                    <button id="tw-copy-selected" style="background: linear-gradient(to bottom, #5cb85c 0%, #449d44 100%); color: white; border: 1px solid #398439; border-radius: 3px; padding: 2px 6px; font-size: 10px; cursor: pointer; font-weight: bold;">Copiar</button>
                </div>
            </div>
        </div>

        <div id="tw-villages-list" style="overflow-y: auto; overflow-x: hidden; flex-grow: 1; padding-bottom: 5px; background: url('https://dspt.innogamescdn.com/asset/876c6ddb/graphic/index/main_bg.jpg');">
            <div style="text-align: center; margin-top: 20px; font-size: 11px; font-weight: bold; color: #603000;"><img src="https://dspt.innogamescdn.com/asset/876c6ddb/graphic/throbber.gif"><br>A analisar...</div>
        </div>
    `;
    document.body.appendChild(panel);

    let allVillages = [];
    let unitHeaders = []; // Guarda imagens dos tipos de unidades disponíveis no mundo
    let openTroopPanels = new Set(); // Mantém abertos os painéis ao filtrar ou mover

    const urlParams = new URLSearchParams(window.location.search);
    let currentGroupId = urlParams.get('group') || '0'; 
    const listContainer = document.getElementById('tw-villages-list');
    const groupSelect = document.getElementById('tw-group-select');
    
    const currentVillageId = (window.game_data && window.game_data.village) ? String(window.game_data.village.id) : urlParams.get('village');

    // ARMAZENAMENTO E ORDENAÇÃO MANUAL
    function persistCurrentOrder(list = allVillages) {
        const orderIds = list.map(v => String(v.id));
        localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orderIds));
    }

    function moveVillage(index, direction) {
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= allVillages.length) return;

        const temp = allVillages[index];
        allVillages[index] = allVillages[targetIndex];
        allVillages[targetIndex] = temp;

        persistCurrentOrder();
        renderVillages();
    }

    // MÉTODO /map/conquer.txt PARA OBTER A CRONOLOGIA EXATA
    async function fetchConquerMapData() {
        try {
            const pId = parseInt(playerId, 10);
            const response = await fetch('/map/conquer.txt');
            const cText = await response.text();

            const latestConquests = new Map();
            cText.trim().split('\n').forEach(line => {
                const parts = line.split(',');
                if (parts.length >= 4) {
                    const vId = String(parts[0]);
                    const timestamp = parseInt(parts[1], 10);
                    const newOwner = parseInt(parts[2], 10);
                    
                    if (newOwner === pId) {
                        const currentMax = latestConquests.get(vId) || 0;
                        if (timestamp > currentMax) {
                            latestConquests.set(vId, timestamp);
                        }
                    }
                }
            });

            return latestConquests;
        } catch (e) {
            return null;
        }
    }

    async function applyConquestSorting(villagesList, forceFetch = false) {
        let savedOrder = null;
        if (!forceFetch) {
            try {
                const raw = localStorage.getItem(ORDER_STORAGE_KEY);
                if (raw) savedOrder = JSON.parse(raw);
            } catch(e) {}
        }

        if (Array.isArray(savedOrder) && savedOrder.length > 0 && !forceFetch) {
            villagesList.sort((a, b) => {
                let idxA = savedOrder.indexOf(String(a.id));
                let idxB = savedOrder.indexOf(String(b.id));

                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                if (idxA !== -1) return -1;
                if (idxB !== -1) return 1;
                return 0;
            });
            return villagesList;
        }

        const latestConquests = await fetchConquerMapData();

        if (latestConquests) {
            const initialList = [];
            const conqueredList = [];

            villagesList.forEach(v => {
                const strId = String(v.id);
                if (latestConquests.has(strId)) {
                    conqueredList.push({ ...v, conquerTime: latestConquests.get(strId) });
                } else {
                    initialList.push({ ...v, conquerTime: 0 });
                }
            });

            conqueredList.sort((a, b) => a.conquerTime - b.conquerTime);

            const finalSorted = [...initialList, ...conqueredList];
            persistCurrentOrder(finalSorted);
            return finalSorted;
        }

        persistCurrentOrder(villagesList);
        return villagesList;
    }

    // DRAG & DROP DO PAINEL
    const dragHeader = document.getElementById('tw-drag-header');
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    dragHeader.onmousedown = function(e) {
        if(e.target.id === 'close-left-panel' || e.target.id === 'tw-refresh-data') return; 
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    };

    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        panel.style.top = (panel.offsetTop - pos2) + "px";
        panel.style.left = (panel.offsetLeft - pos1) + "px";
        panel.style.right = 'auto'; 
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        localStorage.setItem('tw-villages-pos-top', panel.style.top);
        localStorage.setItem('tw-villages-pos-left', panel.style.left);
    }

    // EVENTOS DOS CONTROLOS
    document.getElementById('close-left-panel').addEventListener('click', () => panel.style.display = 'none');
    document.getElementById('tw-refresh-data').addEventListener('click', () => {
        loadSafeData(groupSelect.value || currentGroupId, true); 
    });

    document.getElementById('tw-reset-order').addEventListener('click', async () => {
        if (!confirm('Desejas repor a ordem real de conquista a partir do /map/conquer.txt?')) return;
        showNotification('A carregar histórico de conquistas...', 'success');
        allVillages = await applyConquestSorting(allVillages, true);
        renderVillages();
        showNotification('Ordem de conquista recalculada!');
    });

    function showNotification(msg, type = "success") {
        if(!document.getElementById('twNotifBox')) {
            const c = document.createElement('div'); c.id = 'twNotifBox';
            c.style.position = 'fixed'; c.style.bottom = '30px'; c.style.left = '15px';
            c.style.zIndex = '10000'; c.style.display = 'flex'; c.style.flexDirection = 'column'; c.style.gap = '5px';
            document.body.appendChild(c);
        }
        const n = document.createElement('div'); n.innerHTML = msg;
        n.style.padding = '8px 12px'; n.style.background = type === "success" ? '#4CAF50' : '#f44336';
        n.style.color = '#fff'; n.style.borderRadius = '3px'; n.style.fontSize = '12px'; n.style.fontWeight = 'bold';
        n.style.boxShadow = '0 2px 4px rgba(0,0,0,0.5)';
        n.style.opacity = '0'; n.style.transition = 'opacity 0.2s';
        document.getElementById('twNotifBox').appendChild(n);
        setTimeout(() => n.style.opacity = '1', 10);
        setTimeout(() => { n.style.opacity = '0'; setTimeout(() => n.remove(), 200); }, 1500);
    }

    function copyText(text) {
        const el = document.createElement('textarea');
        el.value = text; document.body.appendChild(el); el.select();
        try { document.execCommand('copy'); showNotification("Copiado com sucesso!"); } catch (err) { showNotification("Erro ao copiar.", "error"); }
        document.body.removeChild(el);
    }

    function renderVillages() {
        const filterText = document.getElementById('tw-village-search').value.toLowerCase();
        listContainer.innerHTML = '';
        
        let count = 0;
        let visibleCount = 0;
        let activeGroup = groupSelect.value || '0'; 
        
        const currentScreen = urlParams.get('screen') || 'overview';
        const currentMode = urlParams.get('mode');
        
        allVillages.forEach((v, index) => {
            if (filterText && !v.label.toLowerCase().includes(filterText)) return;
            
            count++;
            visibleCount++;
            
            const container = document.createElement('div');
            container.className = 'tw-village-container';

            const row = document.createElement('div');
            const rowClass = (visibleCount % 2 === 0) ? 'row_b' : 'row_a';
            
            let colorClass = '';
            if (activeGroup === '0') {
                if (v.isAtk && v.isDef) colorClass = 'tw-village-both';
                else if (v.isAtk) colorClass = 'tw-village-atk';
                else if (v.isDef) colorClass = 'tw-village-def';
            }

            row.className = `tw-village-row ${rowClass} ${colorClass} ${String(v.id) === currentVillageId ? 'current-village' : ''}`;
            
            let goUrl = `/game.php?village=${v.id}&screen=${currentScreen}&group=${activeGroup}`;
            if (currentMode) {
                goUrl += `&mode=${currentMode}`;
            }

            const posNumber = `#${index + 1}`;
            const isTroopOpen = openTroopPanels.has(String(v.id));

            row.innerHTML = `
                <div class="tw-village-info" title="${v.label}">
                    <span class="tw-village-pos">${posNumber}</span>
                    <a href="${goUrl}" class="tw-btn-eye" title="Ir para a aldeia">👁️</a>
                    <button class="tw-btn-troops ${isTroopOpen ? 'active' : ''}" title="Ver Tropas">⚔️</button>
                    <input type="checkbox" class="tw-village-cb" data-coord="${v.coord}">
                    <span class="tw-village-name">${v.label}</span>
                </div>
                <div class="tw-village-actions">
                    <button class="tw-btn-arrow tw-btn-up" title="Mover para cima" ${index === 0 ? 'disabled style="opacity:0.4;cursor:default;"' : ''}>▲</button>
                    <button class="tw-btn-arrow tw-btn-down" title="Mover para baixo" ${index === allVillages.length - 1 ? 'disabled style="opacity:0.4;cursor:default;"' : ''}>▼</button>
                    <button class="tw-btn-copy" data-coord="${v.coord}">Copiar</button>
                </div>
            `;

            // Construção do painel retrátil de tropas
            const troopPanel = document.createElement('div');
            troopPanel.className = 'tw-troops-panel';
            troopPanel.style.display = isTroopOpen ? 'block' : 'none';

            if (unitHeaders.length > 0 && v.troops) {
                let ths = unitHeaders.map(u => `<th><img src="${u.src}" width="14" height="14"></th>`).join('');
                
                let hereTds = v.troops.here.map(count => {
                    const cClass = count === 0 ? 'tw-troops-zero' : 'tw-troops-val';
                    return `<td class="${cClass}">${count}</td>`;
                }).join('');

                let totalTds = v.troops.total.map(count => {
                    const cClass = count === 0 ? 'tw-troops-zero' : 'tw-troops-val';
                    return `<td class="${cClass}">${count}</td>`;
                }).join('');

                troopPanel.innerHTML = `
                    <table class="tw-troops-table">
                        <thead>
                            <tr>
                                <th class="tw-troops-lbl">Tipo</th>
                                ${ths}
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="tw-troops-lbl" title="Tropas presentes na aldeia (próprias + apoios)">Na Aldeia:</td>
                                ${hereTds}
                            </tr>
                            <tr>
                                <td class="tw-troops-lbl" title="Total de tropas pertencentes a esta aldeia">Total:</td>
                                ${totalTds}
                            </tr>
                        </tbody>
                    </table>
                `;
            } else {
                troopPanel.innerHTML = `<div style="text-align:center; color:#aaa; font-size:10px;">Sem dados de tropas disponíveis.</div>`;
            }

            // Ações de clique
            row.querySelector('.tw-village-info').addEventListener('click', (e) => {
                if(e.target.closest('a') || e.target.closest('.tw-btn-troops')) return;
                if(e.target.type !== 'checkbox') {
                    const cb = row.querySelector('.tw-village-cb'); cb.checked = !cb.checked;
                }
            });

            const btnTroops = row.querySelector('.tw-btn-troops');
            btnTroops.addEventListener('click', (e) => {
                e.stopPropagation();
                const willOpen = troopPanel.style.display === 'none';
                troopPanel.style.display = willOpen ? 'block' : 'none';
                btnTroops.classList.toggle('active', willOpen);
                if (willOpen) openTroopPanels.add(String(v.id));
                else openTroopPanels.delete(String(v.id));
            });

            row.querySelector('.tw-btn-up').addEventListener('click', (e) => {
                e.stopPropagation();
                moveVillage(index, -1);
            });

            row.querySelector('.tw-btn-down').addEventListener('click', (e) => {
                e.stopPropagation();
                moveVillage(index, 1);
            });

            row.querySelector('.tw-btn-copy').addEventListener('click', (e) => {
                e.stopPropagation(); copyText(e.currentTarget.getAttribute('data-coord'));
            });

            container.appendChild(row);
            container.appendChild(troopPanel);
            listContainer.appendChild(container);
        });
        
        if(count === 0) listContainer.innerHTML = '<div style="color:#a02c2c; text-align:center; padding: 20px 10px; font-weight: bold; font-size: 11px;">Nenhuma aldeia encontrada.</div>';
    }

    function saveToCache(groupId, groupsHTML) {
        const cacheData = {
            timestamp: Date.now(),
            villages: allVillages,
            groupsHTML: groupsHTML,
            unitHeaders: unitHeaders
        };
        localStorage.setItem(CACHE_PREFIX + groupId, JSON.stringify(cacheData));
    }

    async function loadSafeData(groupId = '0', forceReload = false) {
        if (!forceReload) {
            const cachedString = localStorage.getItem(CACHE_PREFIX + groupId);
            if (cachedString) {
                try {
                    const parsed = JSON.parse(cachedString);
                    if (Date.now() - parsed.timestamp < CACHE_TIME) {
                        unitHeaders = parsed.unitHeaders || [];
                        allVillages = await applyConquestSorting(parsed.villages);
                        if (parsed.groupsHTML) {
                            groupSelect.innerHTML = parsed.groupsHTML;
                            groupSelect.style.display = 'block';
                            groupSelect.value = groupId; 
                        }
                        renderVillages();
                        showNotification("Carregado da memória!");
                        return; 
                    }
                } catch (e) { }
            }
        }

        listContainer.innerHTML = '<div style="text-align: center; margin-top: 20px; font-size: 11px; font-weight: bold; color: #603000;"><img src="https://dspt.innogamescdn.com/asset/876c6ddb/graphic/throbber.gif"><br>A analisar dados e tropas...</div>';
        
        try {
            // 1. Obter Produção e Tropas Totais em paralelo
            const [prodHtml, unitsHtml] = await Promise.all([
                $.ajax({ url: `/game.php?screen=overview_villages&mode=prod&group=${groupId}&page=-1`, type: 'GET', cache: false }),
                $.ajax({ url: `/game.php?screen=overview_villages&mode=units&type=complete&group=${groupId}&page=-1`, type: 'GET', cache: false })
            ]);

            const doc = new DOMParser().parseFromString(prodHtml, 'text/html');
            const dUnits = new DOMParser().parseFromString(unitsHtml, 'text/html');
            
            // Leitura de Grupos
            let groupsFound = new Map();
            groupsFound.set('0', 'Todos os grupos');
            
            doc.querySelectorAll('select[name="group_id"] option').forEach(opt => {
                let id = opt.value;
                let name = opt.textContent.trim().replace(/^\[|\]$/g, '');
                if(id && id !== '0' && name) groupsFound.set(id, name);
            });
            
            doc.querySelectorAll('.group-menu-item').forEach(link => {
                let id = link.getAttribute('data-group-id');
                let name = link.textContent.trim().replace(/^\[|\]$/g, '');
                if(id && id !== '0' && name) groupsFound.set(id, name);
            });

            let savedGroupsHTML = '';
            if (groupsFound.size > 1) {
                groupSelect.style.display = 'block';
                groupSelect.innerHTML = '';
                groupsFound.forEach((name, id) => {
                    let sel = (id === groupId) ? 'selected' : '';
                    savedGroupsHTML += `<option value="${id}" ${sel}>${name}</option>`;
                });
                groupSelect.innerHTML = savedGroupsHTML;
            }

            // Parser de Tropas (Cabeçalhos e Contagens)
            const unitsTable = dUnits.querySelector('#units_table');
            const troopsMap = {};

            if (unitsTable) {
                const headerThs = Array.from(unitsTable.querySelectorAll('thead th')).filter(th => th.querySelector('img[src*="unit_"]'));
                
                unitHeaders = headerThs.map(th => {
                    const img = th.querySelector('img');
                    const isMilitia = img.src.includes('militia');
                    const isHidden = th.classList.contains('hidden') || th.style.display === 'none' || isMilitia;
                    return { src: img.src, isHidden: isHidden };
                }).filter(u => !u.isHidden);

                Array.from(unitsTable.querySelectorAll('tbody')).forEach(tb => {
                    const anchor = tb.querySelector('a[href*="village="]');
                    if (!anchor) return;
                    const match = anchor.href.match(/village=(\d+)/);
                    if (!match) return;
                    const vId = match[1];

                    const rows = Array.from(tb.querySelectorAll('tr'));
                    
                    // Linha 1: Na Aldeia (próprias + apoio)
                    let hereRow = rows.find(tr => {
                        const td = tr.querySelector('td');
                        return td && /(na aldeia|im dorf|in the village|no próprio|en la aldea)/i.test(td.textContent);
                    }) || rows[0];

                    // Linha Total: Tropas totais
                    let totalRow = rows.find(tr => {
                        const td = tr.querySelector('td');
                        return td && /(total|gesamt)/i.test(td.textContent);
                    }) || rows[rows.length - 1];

                    const hereCells = Array.from(hereRow.querySelectorAll('td.unit-item'));
                    const totalCells = Array.from(totalRow.querySelectorAll('td.unit-item'));

                    const hereUnits = [];
                    const totalUnits = [];

                    headerThs.forEach((th, i) => {
                        const img = th.querySelector('img');
                        if (img.src.includes('militia') || th.classList.contains('hidden') || th.style.display === 'none') return;

                        const hCell = hereCells[i];
                        const tCell = totalCells[i];

                        hereUnits.push(hCell ? (parseInt(hCell.textContent.replace(/\./g, '').trim(), 10) || 0) : 0);
                        totalUnits.push(tCell ? (parseInt(tCell.textContent.replace(/\./g, '').trim(), 10) || 0) : 0);
                    });

                    troopsMap[vId] = { here: hereUnits, total: totalUnits };
                });
            }

            allVillages = [];
            doc.querySelectorAll('span.quickedit-vn').forEach(row => {
                const id = row.getAttribute('data-id');
                const label = row.querySelector('.quickedit-label').textContent.trim();
                const cMatch = label.match(/\d{3}\|\d{3}/);
                allVillages.push({ 
                    id, 
                    label, 
                    coord: cMatch ? cMatch[0] : '', 
                    isAtk: false, 
                    isDef: false,
                    troops: troopsMap[id] || { here: [], total: [] }
                });
            });
            
            // Ordenar via /map/conquer.txt
            allVillages = await applyConquestSorting(allVillages, forceReload);
            renderVillages(); 

            // Grupos dinâmicos de Atk / Def para colorir
            if (groupId === '0' && groupsFound.size > 1) {
                let atkIds = [];
                let defIds = [];
                
                groupsFound.forEach((name, id) => {
                    if (/\b(ataque|off|atk|ataq|limpeza)\b/i.test(name)) atkIds.push(id);
                    if (/\b(defesa|def|apoio|blind)\b/i.test(name)) defIds.push(id);
                });

                let fetchPromises = [];

                atkIds.forEach(id => {
                    fetchPromises.push($.ajax({
                        url: `/game.php?screen=overview_villages&mode=prod&group=${id}&page=-1`,
                        cache: false 
                    }).then(html => {
                        let tempDoc = new DOMParser().parseFromString(html, 'text/html');
                        tempDoc.querySelectorAll('span.quickedit-vn').forEach(row => {
                            let v = allVillages.find(village => village.id === row.getAttribute('data-id'));
                            if (v) v.isAtk = true;
                        });
                    }));
                });

                defIds.forEach(id => {
                    fetchPromises.push($.ajax({
                        url: `/game.php?screen=overview_villages&mode=prod&group=${id}&page=-1`,
                        cache: false 
                    }).then(html => {
                        let tempDoc = new DOMParser().parseFromString(html, 'text/html');
                        tempDoc.querySelectorAll('span.quickedit-vn').forEach(row => {
                            let v = allVillages.find(village => village.id === row.getAttribute('data-id'));
                            if (v) v.isDef = true;
                        });
                    }));
                });

                if (fetchPromises.length > 0) {
                    Promise.all(fetchPromises).then(() => {
                        renderVillages(); 
                        saveToCache(groupId, savedGroupsHTML); 
                        showNotification("Dados e tropas carregados com sucesso!");
                    });
                } else {
                    saveToCache(groupId, savedGroupsHTML);
                }
            } else {
                saveToCache(groupId, savedGroupsHTML);
                if(forceReload) showNotification("Dados e tropas atualizados!");
            }

        } catch(err) {
            listContainer.innerHTML = '<div style="color:#a02c2c; text-align:center; padding: 20px; font-weight: bold; font-size: 11px;">Erro ao processar dados de tropas.</div>';
        }
    }

    document.getElementById('tw-select-all').addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        document.querySelectorAll('.tw-village-cb').forEach(cb => {
            if(cb.closest('.tw-village-container').style.display !== 'none') cb.checked = isChecked;
        });
    });

    document.getElementById('tw-copy-selected').addEventListener('click', () => {
        const checked = document.querySelectorAll('.tw-village-cb:checked');
        if(checked.length === 0) return showNotification('Nenhuma aldeia selecionada!', 'error');
        
        let coords = [];
        checked.forEach(cb => {
            const c = cb.getAttribute('data-coord');
            if (c) coords.push(c);
        });
        copyText(coords.join(' '));
    });

    document.getElementById('tw-village-search').addEventListener('input', () => {
        renderVillages(); document.getElementById('tw-select-all').checked = false;
    });
    
    groupSelect.addEventListener('change', (e) => {
        loadSafeData(e.target.value, false); 
        document.getElementById('tw-select-all').checked = false;
    });

    loadSafeData(currentGroupId, false);
})();
