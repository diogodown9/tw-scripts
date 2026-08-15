(function() {
    'use strict';

    // 1. REDIRECIONA SE NÃO ESTIVER NA PÁGINA CORRETA
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('screen') !== 'overview' && urlParams.get('screen') !== 'overview_villages') {
        const villageId = (window.game_data && window.game_data.village) ? window.game_data.village.id : '';
        window.location.href = `/game.php?village=${villageId}&screen=overview`;
        return; 
    }

    const PANEL_ID = 'tw-left-villages-panel';
    
    // 2. EFEITO LIGA/DESLIGA: Se o painel já existir, o clique na barra apenas o esconde ou mostra
    const existingPanel = document.getElementById(PANEL_ID);
    if (existingPanel) {
        existingPanel.style.display = existingPanel.style.display === 'none' ? 'flex' : 'none';
        return;
    }

    const savedSide = localStorage.getItem('tw-villages-panel-side') || 'left';

    // ESTILOS 
    const style = document.createElement('style');
    style.textContent = `
        #tw-left-villages-panel * { font-family: Verdana, Arial, sans-serif; }
        #tw-villages-list::-webkit-scrollbar { width: 6px; }
        #tw-villages-list::-webkit-scrollbar-track { background: #e3d5b3; border-left: 1px solid #8c5f0d; }
        #tw-villages-list::-webkit-scrollbar-thumb { background: #8c5f0d; }
        
        .tw-village-row { display: flex; align-items: center; justify-content: space-between; padding: 4px 6px; border-bottom: 1px solid #e3d5b3; cursor: pointer; transition: background-color 0.2s; }
        
        /* Cores Nativas do TW */
        .tw-village-row.row_a { background-color: #fff5da; }
        .tw-village-row.row_b { background-color: #f0e2be; }
        .tw-village-row:hover { background-color: #dcb588 !important; }
        .tw-village-row.current-village { border-left: 3px solid #8c0000; padding-left: 3px; }
        
        /* Cores de Ataque e Defesa (Suaves) */
        .tw-village-atk { background-color: #f7d7d7 !important; } 
        .tw-village-def { background-color: #d7e8f7 !important; } 
        .tw-village-both { background-color: #e8d7f7 !important; } 
        
        .tw-village-atk:hover { background-color: #eebfbf !important; }
        .tw-village-def:hover { background-color: #bfd9ee !important; }
        .tw-village-both:hover { background-color: #d9bfee !important; }
        
        .tw-village-info { display: flex; align-items: center; overflow: hidden; flex-grow: 1; }
        .tw-village-cb { margin: 0 5px 0 0 !important; width: 12px; height: 12px; cursor: pointer; }
        
        .tw-village-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #004600; font-weight: 700; font-size: 11px; max-width: 200px; }
        
        .tw-village-actions { display: flex; gap: 3px; margin-left: 5px; }
        
        .tw-btn-eye { background: #f4e4bc; border: 1px solid #8c5f0d; border-radius: 2px; padding: 2px 4px; font-size: 10px; cursor: pointer; text-decoration: none; color: #333; margin-right: 5px; }
        .tw-btn-eye:hover { background: #deb887; }
        
        .tw-btn-copy { background: linear-gradient(to bottom, #3498db 0%, #2980b9 100%); color: #fff; border: 1px solid #1c5982; border-radius: 3px; padding: 2px 6px; font-size: 10px; cursor: pointer; font-weight: bold; }
        .tw-btn-copy:hover { background: linear-gradient(to bottom, #2980b9 0%, #1c5982 100%); }
    `;
    document.head.appendChild(style);

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.style.position = 'fixed';
    
    if (savedSide === 'right') panel.style.right = '10px';
    else panel.style.left = '10px';
    
    panel.style.top = '55px';
    panel.style.width = '310px'; 
    panel.style.maxHeight = 'calc(100vh - 170px)'; 
    panel.style.backgroundColor = '#e3d5b3';
    panel.style.border = '2px solid #8c5f0d';
    panel.style.borderRadius = '3px';
    panel.style.boxShadow = '2px 4px 8px rgba(0,0,0,0.6)';
    panel.style.zIndex = '9999';
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';

    panel.innerHTML = `
        <div style="background: url('https://dspt.innogamescdn.com/asset/876c6ddb/graphic/index/main_bg.jpg') repeat; padding: 6px; border-bottom: 2px solid #8c5f0d; font-weight: bold; text-align: center; color: #603000; position: relative; font-size: 12px; font-family: Verdana, Arial;">
            🏰 Gestor de Aldeias
            <div style="position: absolute; right: 5px; top: 4px; display: flex; gap: 4px; align-items: center;">
                <span id="tw-toggle-side" title="Mudar Lado" style="cursor: pointer; color: #000; font-size: 11px; border: 1px solid #8c5f0d; border-radius: 2px; background: #e3d5b3; padding: 0 4px; line-height: 12px;">⇄</span>
                <span id="close-left-panel" title="Fechar" style="cursor: pointer; color: #a02c2c; font-size: 10px; border: 1px solid #a02c2c; border-radius: 2px; width: 14px; height: 14px; line-height: 12px; background: #e3d5b3;">✖</span>
            </div>
        </div>
        
        <div style="padding: 6px; background: #deb887; border-bottom: 1px solid #8c5f0d; display: flex; flex-direction: column; gap: 5px;">
            <select id="tw-group-select" style="display: none; width: 100%; padding: 3px; border: 1px solid #8c5f0d; border-radius: 2px; font-size: 11px; cursor: pointer; background: #fff;"></select>
            
            <input type="text" id="tw-village-search" placeholder="Procurar nome ou coord..." style="width: 100%; box-sizing: border-box; padding: 4px; border: 1px solid #8c5f0d; border-radius: 2px; font-size: 11px; outline: none;">
            
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; margin-top: 2px;">
                <label style="cursor: pointer; display: flex; align-items: center; font-weight: bold; color: #603000;">
                    <input type="checkbox" id="tw-select-all" style="margin: 0 4px 0 0; width: 12px; height: 12px;"> Selecionar Todas
                </label>
                <button id="tw-copy-selected" style="background: linear-gradient(to bottom, #5cb85c 0%, #449d44 100%); color: white; border: 1px solid #398439; border-radius: 3px; padding: 3px 6px; font-size: 10px; cursor: pointer; font-weight: bold;">Copiar Seleção</button>
            </div>
        </div>

        <div id="tw-villages-list" style="overflow-y: auto; overflow-x: hidden; flex-grow: 1; padding-bottom: 5px; background: url('https://dspt.innogamescdn.com/asset/876c6ddb/graphic/index/main_bg.jpg');">
            <div style="text-align: center; margin-top: 20px; font-size: 11px; font-weight: bold; color: #603000;"><img src="https://dspt.innogamescdn.com/asset/876c6ddb/graphic/throbber.gif"><br>A carregar...</div>
        </div>
    `;
    document.body.appendChild(panel);

    let allVillages = [];
    let currentGroupId = urlParams.get('group') || '0'; 
    const listContainer = document.getElementById('tw-villages-list');
    const groupSelect = document.getElementById('tw-group-select');
    const currentVillageId = urlParams.get('village');

    document.getElementById('close-left-panel').addEventListener('click', () => panel.style.display = 'none');
    document.getElementById('tw-toggle-side').addEventListener('click', () => {
        if (panel.style.left === '10px') {
            panel.style.left = ''; panel.style.right = '10px'; localStorage.setItem('tw-villages-panel-side', 'right');
        } else {
            panel.style.right = ''; panel.style.left = '10px'; localStorage.setItem('tw-villages-panel-side', 'left');
        }
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
        
        allVillages.forEach(v => {
            if (filterText && !v.label.toLowerCase().includes(filterText)) return;
            
            count++;
            visibleCount++;
            
            const row = document.createElement('div');
            const rowClass = (visibleCount % 2 === 0) ? 'row_b' : 'row_a';
            
            let colorClass = '';
            if (groupSelect.value === '0' || groupSelect.value === '') {
                if (v.isAtk && v.isDef) colorClass = 'tw-village-both';
                else if (v.isAtk) colorClass = 'tw-village-atk';
                else if (v.isDef) colorClass = 'tw-village-def';
            }

            row.className = `tw-village-row ${rowClass} ${colorClass} ${v.id === currentVillageId ? 'current-village' : ''}`;
            
            const goUrl = window.location.pathname + '?village=' + v.id + '&screen=overview';

            row.innerHTML = `
                <div class="tw-village-info" title="${v.label}">
                    <a href="${goUrl}" class="tw-btn-eye" title="Ir para a aldeia">👁️</a>
                    <input type="checkbox" class="tw-village-cb" data-coord="${v.coord}">
                    <span class="tw-village-name">${v.label}</span>
                </div>
                <div class="tw-village-actions">
                    <button class="tw-btn-copy" data-coord="${v.coord}">Copiar</button>
                </div>
            `;

            row.querySelector('.tw-village-info').addEventListener('click', (e) => {
                if(e.target.closest('a')) return;
                if(e.target.type !== 'checkbox') {
                    const cb = row.querySelector('.tw-village-cb'); cb.checked = !cb.checked;
                }
            });

            row.querySelector('.tw-btn-copy').addEventListener('click', (e) => {
                e.stopPropagation(); copyText(e.currentTarget.getAttribute('data-coord'));
            });

            listContainer.appendChild(row);
        });
        
        if(count === 0) listContainer.innerHTML = '<div style="color:#a02c2c; text-align:center; padding: 20px 10px; font-weight: bold; font-size: 11px;">Nenhuma aldeia encontrada.</div>';
    }

    function loadSafeData(groupId = '0') {
        listContainer.innerHTML = '<div style="text-align: center; margin-top: 20px; font-size: 11px; font-weight: bold; color: #603000;"><img src="https://dspt.innogamescdn.com/asset/876c6ddb/graphic/throbber.gif"><br>A carregar do servidor...</div>';
        
        $.ajax({
            url: `/game.php?screen=overview_villages&mode=prod&group=${groupId}&page=-1`,
            type: 'GET',
            success: function(data) {
                try {
                    const doc = new DOMParser().parseFromString(data, 'text/html');
                    
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

                    if (groupsFound.size > 1) {
                        groupSelect.style.display = 'block';
                        groupSelect.innerHTML = '';
                        groupsFound.forEach((name, id) => {
                            let sel = (id === groupId) ? 'selected' : '';
                            groupSelect.innerHTML += `<option value="${id}" ${sel}>${name}</option>`;
                        });
                    }

                    allVillages = [];
                    doc.querySelectorAll('span.quickedit-vn').forEach(row => {
                        const id = row.getAttribute('data-id');
                        const label = row.querySelector('.quickedit-label').textContent.trim();
                        const cMatch = label.match(/\d{3}\|\d{3}/);
                        allVillages.push({ id, label, coord: cMatch ? cMatch[0] : '', isAtk: false, isDef: false });
                    });
                    
                    renderVillages(); 

                    if (groupId === '0' && groupsFound.size > 1) {
                        let atkIds = [];
                        let defIds = [];
                        
                        groupsFound.forEach((name, id) => {
                            if (/\b(ataque|off|atk|ataq|limpeza)\b/i.test(name)) atkIds.push(id);
                            if (/\b(defesa|def|apoio|blind)\b/i.test(name)) defIds.push(id);
                        });

                        let fetchPromises = [];

                        atkIds.forEach(id => {
                            fetchPromises.push($.get(`/game.php?screen=overview_villages&mode=prod&group=${id}&page=-1`).then(html => {
                                let tempDoc = new DOMParser().parseFromString(html, 'text/html');
                                tempDoc.querySelectorAll('span.quickedit-vn').forEach(row => {
                                    let v = allVillages.find(village => village.id === row.getAttribute('data-id'));
                                    if (v) v.isAtk = true;
                                });
                            }));
                        });

                        defIds.forEach(id => {
                            fetchPromises.push($.get(`/game.php?screen=overview_villages&mode=prod&group=${id}&page=-1`).then(html => {
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
                            });
                        }
                    }

                } catch(err) {
                    listContainer.innerHTML = '<div style="color:#a02c2c; text-align:center; padding: 20px; font-weight: bold; font-size: 11px;">Erro ao processar dados.</div>';
                }
            },
            error: function() {
                listContainer.innerHTML = '<div style="color:#a02c2c; text-align:center; padding: 20px; font-weight: bold; font-size: 11px;">Erro de ligação.</div>';
            }
        });
    }

    document.getElementById('tw-select-all').addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        document.querySelectorAll('.tw-village-cb').forEach(cb => {
            if(cb.closest('.tw-village-row').style.display !== 'none') cb.checked = isChecked;
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
        loadSafeData(e.target.value);
        document.getElementById('tw-select-all').checked = false;
    });

    loadSafeData(currentGroupId);
})();
