(function() {
    'use strict';

    const PANEL_ID = 'tw-left-villages-panel';

    // Se o painel já existir, o botão funciona como um interruptor (Liga/Desliga)
    if (document.getElementById(PANEL_ID)) {
        let p = document.getElementById(PANEL_ID);
        p.style.display = p.style.display === 'none' ? 'flex' : 'none';
        return;
    }

    // Criar o contentor do painel esquerdo
    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.style.position = 'fixed';
    panel.style.left = '10px';
    panel.style.top = '60px'; // Fica logo abaixo da barra do topo
    panel.style.width = '260px';
    panel.style.maxHeight = 'calc(100vh - 80px)'; // Adapta-se à altura do ecrã
    panel.style.backgroundColor = '#e3d5b3';
    panel.style.border = '2px solid #8c5f0d';
    panel.style.borderRadius = '5px';
    panel.style.boxShadow = '2px 4px 10px rgba(0,0,0,0.5)';
    panel.style.zIndex = '9999';
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';

    panel.innerHTML = `
        <div style="background-color: #c1a264; padding: 10px; border-bottom: 2px solid #8c5f0d; font-weight: bold; text-align: center; color: #603000; position: relative;">
            🏰 Lista de Aldeias
            <span id="close-left-panel" style="position: absolute; right: 10px; top: 10px; cursor: pointer; color: #a02c2c; font-size: 14px;">✖</span>
        </div>
        <div style="padding: 5px; background: #deb887; border-bottom: 1px solid #8c5f0d;">
            <input type="text" id="tw-village-search" placeholder="Procurar aldeia ou coord..." style="width: 100%; box-sizing: border-box; padding: 5px; border: 1px solid #8c5f0d; border-radius: 3px; outline: none;">
        </div>
        <div id="tw-villages-list" style="overflow-y: auto; padding: 5px 10px; flex-grow: 1; font-size: 12px; line-height: 1.5em; background-image: url('https://dspt.innogamescdn.com/asset/876c6ddb/graphic/index/main_bg.jpg');">
            <div style="text-align: center; color: #333; margin-top: 20px; font-weight: bold;">
                <img src="https://dspt.innogamescdn.com/asset/876c6ddb/graphic/throbber.gif" alt="A carregar"><br>A carregar aldeias...
            </div>
        </div>
    `;
    document.body.appendChild(panel);

    // Botão de fechar
    document.getElementById('close-left-panel').addEventListener('click', () => panel.style.display = 'none');

    // Pesquisar as aldeias no servidor (Modo Produção lê as aldeias todas)
    $.get('/game.php?screen=overview_villages&mode=prod&page=-1', function(data) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(data, 'text/html');
        // Extrai todas as etiquetas de aldeias da tabela
        const rows = doc.querySelectorAll('span.quickedit-vn');

        let villages = [];
        rows.forEach(row => {
            const id = row.getAttribute('data-id');
            const label = row.querySelector('.quickedit-label').textContent.trim();
            villages.push({ id: id, label: label });
        });

        const listContainer = document.getElementById('tw-villages-list');
        listContainer.innerHTML = '';

        // Função para desenhar a lista (com filtro de pesquisa)
        function renderVillages(filterText = '') {
            listContainer.innerHTML = '';
            
            villages.forEach(v => {
                if (filterText && !v.label.toLowerCase().includes(filterText.toLowerCase())) return;
                
                const a = document.createElement('a');
                
                // Mantém a aba onde estás e muda apenas o ID da aldeia!
                const urlParams = new URLSearchParams(window.location.search);
                urlParams.set('village', v.id);
                a.href = window.location.pathname + '?' + urlParams.toString();
                
                a.textContent = v.label;
                a.style.display = 'block';
                a.style.color = '#005f00';
                a.style.textDecoration = 'none';
                a.style.borderBottom = '1px solid #dcb588';
                a.style.padding = '6px 2px';
                a.style.fontWeight = 'bold';
                a.style.transition = 'background-color 0.2s';
                
                // Efeito Hover
                a.onmouseover = () => { a.style.backgroundColor = 'rgba(255, 255, 255, 0.4)'; a.style.color = '#603000'; };
                a.onmouseout = () => { a.style.backgroundColor = 'transparent'; a.style.color = '#005f00'; };
                
                listContainer.appendChild(a);
            });
            
            if(listContainer.innerHTML === '') {
                listContainer.innerHTML = '<div style="color:#a02c2c; text-align:center; margin-top: 10px; font-weight: bold;">Nenhuma aldeia encontrada.</div>';
            }
        }

        if (villages.length === 0) {
            listContainer.innerHTML = '<div style="color:#a02c2c; text-align:center; font-weight: bold;">Erro a carregar as aldeias.</div>';
        } else {
            renderVillages();
        }

        // Evento da barra de pesquisa em tempo real
        document.getElementById('tw-village-search').addEventListener('input', function(e) {
            renderVillages(e.target.value);
        });
    });
})();
