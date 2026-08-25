(async function() {
    'use strict';

    // 1. Redirecionar para o Combinado se não estiver na página correta
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('screen') !== 'overview_villages') {
        const villageId = (window.game_data && window.game_data.village) ? window.game_data.village.id : '';
        window.location.href = `/game.php?village=${villageId}&screen=overview_villages&mode=combined`;
        return;
    }

    const existingContainer = document.getElementById('rename-container');
    if (existingContainer) {
        existingContainer.style.display = existingContainer.style.display === 'none' ? 'block' : 'none';
        return;
    }

    const modemenuElement = document.querySelector('.vis.modemenu') || document.querySelector('#paged_view_content');
    if (!modemenuElement) {
        alert("Erro: Não foi possível carregar a interface do script nesta página.");
        return;
    }

    const translations = {
        en: {
            heading: "Renaming Options",
            tableHeaders: { option: "Option", configuration: "Configuration" },
            options: { textOption: "Text", numberOption: "Number", kOption: "By K", randomCoordOption: "Random Coordinates", distanceOption: "Distance (in fields)", randomNameOption: "Random Name" },
            placeholders: { textInput: "Enter text", digitInput: "Total digits", startNumberInput: "Starting number", targetCoordInput: "Target (XXX|YYY)", result: "Example result" },
            renameButton: "Rename All",
            fixButton: "Auto-Fix New"
        },
        pt: {
            heading: "Opções de Renomeação",
            tableHeaders: { option: "Opção", configuration: "Configuração" },
            options: { textOption: "Texto", numberOption: "Número", kOption: "Por K", randomCoordOption: "Coordenada Aleatória", distanceOption: "Distância (em campos)", randomNameOption: "Nome Aleatório" },
            placeholders: { textInput: "Digite o texto", digitInput: "Total dígitos", startNumberInput: "Nº inicial", targetCoordInput: "Alvo (XXX|YYY)", result: "Exemplo de resultado" },
            renameButton: "Renomear Todas",
            fixButton: "Auto-Corrigir Novas"
        }
    };

    const contentRename = `
    <div id="rename-container" style="display: block; font-family: Verdana, Arial, sans-serif; padding: 20px; background: #f4e4bc; border: 2px solid #8c5f0d; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #c1a264; padding-bottom: 10px; margin-bottom: 15px;">
            <h3 id="rename-title" style="margin: 0; color: #603000; font-size: 18px;">🛠️ Opções de Renomeação</h3>
            <div>
                <select id="language-select" style="padding: 4px; border: 1px solid #8c5f0d; border-radius: 4px; font-size: 12px; cursor: pointer; background: #fff;">
                    <option value="pt">Português</option>
                    <option value="en">English</option>
                </select>
                <button id="btn-close-renamer" style="margin-left: 10px; background: #a02c2c; color: #fff; border: 1px solid #601010; border-radius: 4px; padding: 4px 10px; cursor: pointer; font-weight: bold;">X</button>
            </div>
        </div>

        <table id="rename-options-table" style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
            <thead>
                <tr style="background: #deb887; border-bottom: 2px solid #8c5f0d;">
                    <th style="text-align: left; padding: 10px; color: #4a2a00;">Opção</th>
                    <th style="text-align: left; padding: 10px; color: #4a2a00;">Configuração</th>
                </tr>
            </thead>
            <tbody id="rename-options-list">
                <tr class="rename-option-container" style="border-bottom: 1px solid #dcb588; background: rgba(255,255,255,0.3);">
                    <td style="padding: 10px;">
                        <input type="checkbox" id="textOption" class="rename-option" style="cursor: pointer; transform: scale(1.2);">
                        <label for="textOption" style="margin-left: 8px; cursor: pointer; font-weight: bold; color: #333; font-size: 13px;">Texto</label>
                    </td>
                    <td style="padding: 10px;"><input type="text" id="textInput" placeholder="Digite o texto" style="width: 100%; padding: 6px; border: 1px solid #a37c44; border-radius: 3px;"></td>
                </tr>
                <tr class="rename-option-container" style="border-bottom: 1px solid #dcb588;">
                    <td style="padding: 10px;">
                        <input type="checkbox" id="numberOption" class="rename-option" style="cursor: pointer; transform: scale(1.2);">
                        <label for="numberOption" style="margin-left: 8px; cursor: pointer; font-weight: bold; color: #333; font-size: 13px;">Número</label>
                    </td>
                    <td style="padding: 10px; display: flex; gap: 10px;">
                        <input type="number" id="digitInput" placeholder="Total dígitos" style="flex: 1; padding: 6px; border: 1px solid #a37c44; border-radius: 3px;">
                        <input type="number" id="startNumberInput" placeholder="Nº inicial" style="flex: 1; padding: 6px; border: 1px solid #a37c44; border-radius: 3px;">
                    </td>
                </tr>
                <tr class="rename-option-container" style="border-bottom: 1px solid #dcb588; background: rgba(255,255,255,0.3);">
                    <td style="padding: 10px;">
                        <input type="checkbox" id="kOption" class="rename-option" style="cursor: pointer; transform: scale(1.2);">
                        <label for="kOption" style="margin-left: 8px; cursor: pointer; font-weight: bold; color: #333; font-size: 13px;">Por K</label>
                    </td>
                    <td style="padding: 10px;"><span style="font-size: 11px; color: #555; font-style: italic;">Adiciona automaticamente o continente</span></td>
                </tr>
                <tr class="rename-option-container" style="border-bottom: 1px solid #dcb588;">
                    <td style="padding: 10px;">
                        <input type="checkbox" id="randomCoordOption" class="rename-option" style="cursor: pointer; transform: scale(1.2);">
                        <label for="randomCoordOption" style="margin-left: 8px; cursor: pointer; font-weight: bold; color: #333; font-size: 13px;">Coordenada Aleatória</label>
                    </td>
                    <td style="padding: 10px;"></td>
                </tr>
                <tr class="rename-option-container" style="border-bottom: 1px solid #dcb588; background: rgba(255,255,255,0.3);">
                    <td style="padding: 10px;">
                        <input type="checkbox" id="distanceOption" class="rename-option" style="cursor: pointer; transform: scale(1.2);">
                        <label for="distanceOption" style="margin-left: 8px; cursor: pointer; font-weight: bold; color: #333; font-size: 13px;">Distância (campos)</label>
                    </td>
                    <td style="padding: 10px;"><input type="text" id="targetCoordInput" placeholder="Alvo (XXX|YYY)" style="width: 100%; padding: 6px; border: 1px solid #a37c44; border-radius: 3px;"></td>
                </tr>
                <tr class="rename-option-container">
                    <td style="padding: 10px;">
                        <input type="checkbox" id="randomNameOption" class="rename-option" style="cursor: pointer; transform: scale(1.2);">
                        <label for="randomNameOption" style="margin-left: 8px; cursor: pointer; font-weight: bold; color: #333; font-size: 13px;">Nome Aleatório</label>
                    </td>
                    <td style="padding: 10px;"><span style="font-size: 11px; color: #555; font-style: italic;">Gera um nome de fantasia único</span></td>
                </tr>
            </tbody>
        </table>

        <div style="background: #fff; padding: 12px; border: 1px solid #c1a264; border-radius: 4px; margin-bottom: 20px;">
            <strong style="color: #603000; font-size: 12px; display: block; margin-bottom: 5px; text-transform: uppercase;">Pré-visualização:</strong>
            <input type="text" id="result" placeholder="Exemplo de resultado" style="width: 100%; border: none; background: transparent; font-size: 15px; font-weight: bold; color: #000; outline: none;" readonly="">
        </div>
        
        <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button id="fix-outliers" class="btn" style="padding: 10px 15px; font-size: 13px; cursor: pointer; border-radius: 4px; background: #f0ad4e; color: white; border: 1px solid #d58512; font-weight: bold;">Auto-Corrigir Novas</button>
            <button id="combine-options" class="btn" style="padding: 10px 20px; font-size: 13px; cursor: pointer; border-radius: 4px; background: #5cb85c; color: white; border: 1px solid #398439; font-weight: bold;">Renomear Todas</button>
        </div>
    </div>`;

    const container = document.createElement('div');
    container.innerHTML = contentRename;
    modemenuElement.parentNode.insertBefore(container, modemenuElement);

    let currentOptions = [];
    let isProcessing = false;

    document.getElementById('btn-close-renamer').addEventListener('click', () => {
        document.getElementById('rename-container').style.display = 'none';
    });

    function setLanguage(lang) {
        const t = translations[lang];
        document.getElementById('rename-title').innerHTML = `🛠️ ${t.heading}`;
        ['option', 'configuration'].forEach((key, i) => document.querySelector(`#rename-options-table th:nth-child(${i + 1})`).textContent = t.tableHeaders[key]);
        ['textOption', 'numberOption', 'kOption', 'randomCoordOption', 'distanceOption', 'randomNameOption'].forEach(opt => document.querySelector(`#${opt} + label`).textContent = t.options[opt]);
        ['textInput', 'digitInput', 'startNumberInput', 'targetCoordInput', 'result'].forEach(input => document.querySelector(`#${input}`).placeholder = t.placeholders[input]);
        document.querySelector('#combine-options').textContent = t.renameButton;
        document.querySelector('#fix-outliers').textContent = t.fixButton;
        saveSettings();
    }

    function saveSettings() {
        const settings = { language: document.getElementById('language-select').value };
        document.querySelectorAll('.rename-option-container').forEach(container => {
            const checkbox = container.querySelector('.rename-option');
            const inputs = [...container.querySelectorAll('input[type="text"], input[type="number"]')].reduce((acc, input) => {
                acc[input.id] = input.value;
                return acc;
            }, {});
            settings[checkbox.id] = { checked: checkbox.checked, inputs };
        });
        localStorage.setItem('renameSettingsTW', JSON.stringify(settings));
    }

    function loadSettings() {
        const settings = JSON.parse(localStorage.getItem('renameSettingsTW'));
        if (!settings) return;

        const selectedLanguage = settings.language || 'pt';
        document.getElementById('language-select').value = selectedLanguage;
        setLanguage(selectedLanguage);

        Object.keys(settings).forEach(key => {
            if (key === 'language') return;
            const setting = settings[key];
            const checkbox = document.getElementById(key);
            if (checkbox) {
                checkbox.checked = setting.checked;
                Object.keys(setting.inputs).forEach(inputId => {
                    const inputElement = document.getElementById(inputId);
                    if (inputElement) inputElement.value = setting.inputs[inputId];
                });
            }
        });
    }

    function combineOptions() {
        currentOptions = [...document.querySelectorAll('.rename-option-container')].map(container => {
            const checkbox = container.querySelector('.rename-option');
            if (!checkbox.checked) return null;
            const inputs = [...container.querySelectorAll('input[type="text"], input[type="number"]')].reduce((acc, input) => {
                acc[input.id] = input.value;
                return acc;
            }, {});
            return { type: checkbox.id.replace('Option', '').toLowerCase(), ...inputs };
        }).filter(Boolean);

        const exampleVillage = document.querySelector('.nowrap.row_a, .nowrap.row_b');
        let coords = [0, 0];
        
        if (exampleVillage) {
            const quickeditLabel = exampleVillage.querySelector('.quickedit-label');
            if (quickeditLabel) {
                const coordsMatches = quickeditLabel.textContent.match(/(\d{3}\|\d{3})/g);
                if (coordsMatches && coordsMatches.length > 0) {
                    coords = coordsMatches[coordsMatches.length - 1].split('|').map(Number);
                }
            }
        }

        const startNumber = parseInt(currentOptions.find(opt => opt.type === 'number')?.startNumberInput) || 1;
        document.getElementById('result').value = generateVillageName(currentOptions, startNumber, coords);
        saveSettings();
    }

    function generateRandomName() {
        const prefixes = ["Al", "Bar", "Car", "Del", "Eld", "Fal", "Gar", "Hal", "Il", "Jar", "Kal", "Lor"];
        const middles = ["dorn", "fell", "gorn", "hil", "mir", "nar", "pel", "quil", "rak", "sor", "tur"];
        const suffixes = ["dor", "mar", "rin", "ton", "vin", "wyn", "zar", "thur", "lak", "dil", "ros"];
        return `${prefixes[Math.floor(Math.random() * prefixes.length)]}${middles[Math.floor(Math.random() * middles.length)]}${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
    }

    function generateVillageName(optionsArray, numberCounter, coords) {
        return optionsArray.map(opt => {
            switch (opt.type) {
                case 'text': return opt.textInput || '';
                case 'number': return String(numberCounter).padStart(parseInt(opt.digitInput) || 1, '0');
                case 'k': 
                    if (coords && coords.length === 2) return `K${Math.floor(coords[1] / 100)}${Math.floor(coords[0] / 100)}`; 
                    return '';
                case 'randomcoord': return `${Math.floor(Math.random() * 800).toString().padStart(3, '0')}|${Math.floor(Math.random() * 800).toString().padStart(3, '0')}`;
                case 'distance':
                    if (coords && opt.targetCoordInput && opt.targetCoordInput.includes('|')) {
                        const target = opt.targetCoordInput.split('|').map(Number);
                        if (target.length === 2) return `${Math.round(Math.sqrt((target[0] - coords[0]) ** 2 + (target[1] - coords[1]) ** 2) * 10) / 10}`;
                    }
                    return '';
                case 'randomname': return generateRandomName();
                default: return '';
            }
        }).join(' ').trim();
    }

    // Obter todas as aldeias da conta (ignora a paginação da tabela)
    async function getAllPlayerVillages() {
        const playerId = parseInt(window.game_data.player.id);
        const res = await fetch('/map/village.txt');
        const text = await res.text();
        const villages = [];
        
        text.trim().split('\n').forEach(line => {
            const parts = line.split(',');
            if (parts.length >= 5 && parseInt(parts[4]) === playerId) {
                villages.push({
                    id: parseInt(parts[0]),
                    name: decodeURIComponent(parts[1].replace(/\+/g, ' ')),
                    coords: [parseInt(parts[2]), parseInt(parts[3])]
                });
            }
        });
        return villages;
    }

    // Execução sequencial direta sem perder requisições
    async function processRenamingList(queue) {
        if (isProcessing || queue.length === 0) return;
        isProcessing = true;

        const csrfToken = window.game_data ? window.game_data.csrf : '';
        const total = queue.length;
        showCustomNotification(`A processar ${total} aldeias...`, "success");

        for (let i = 0; i < total; i++) {
            const item = queue[i];
            
            try {
                await fetch(`/game.php?village=${item.id}&screen=main&action=change_name`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ name: item.finalName, h: csrfToken })
                });

                // Atualizar texto no ecrã se a aldeia estiver visível na página atual
                const domRow = document.querySelector(`.quickedit-vn[data-id="${item.id}"]`);
                if (domRow) {
                    const label = domRow.closest('tr').querySelector('.quickedit-label');
                    if (label) {
                        label.innerHTML = `${item.finalName} <span class="grey">(${item.coords.join('|')}) K${Math.floor(item.coords[1] / 100)}${Math.floor(item.coords[0] / 100)}</span>`;
                    }
                }
            } catch (err) {
                console.error(`Erro ao renomear ${item.id}:`, err);
            }

            // Intervalo estável entre requisições
            await new Promise(r => setTimeout(r, 120));
        }

        isProcessing = false;
        showCustomNotification(`Concluído! ${total} aldeias renomeadas.`, "success");
    }

    document.getElementById('fix-outliers').addEventListener('click', async function() {
        if (currentOptions.length === 0) {
            showCustomNotification("Atenção: Seleciona pelo menos uma opção.", "error");
            return;
        }

        const textOpt = currentOptions.find(opt => opt.type === 'text');
        if (!textOpt || !textOpt.textInput) {
            showCustomNotification("Ativa e preenche a opção 'Texto' primeiro.", "error");
            return;
        }

        const baseText = textOpt.textInput.trim();
        const allVillages = await getAllPlayerVillages();
        
        let maxFoundNumber = 0;
        let outliers = [];

        allVillages.forEach(v => {
            let cleanName = v.name.replace(/\(\d{3}\|\d{3}\)\sK\d{2}/g, '').trim();
            if (cleanName.includes(baseText)) {
                const remaining = cleanName.replace(baseText, '');
                const numMatch = remaining.match(/\d+/);
                if (numMatch) {
                    const num = parseInt(numMatch[0]);
                    if (num > maxFoundNumber) maxFoundNumber = num;
                }
            } else {
                outliers.push(v);
            }
        });

        if (outliers.length === 0) {
            showCustomNotification("Todas as aldeias já estão no teu padrão!", "success");
            return;
        }

        let currentNum = maxFoundNumber + 1;
        const queue = outliers.map(v => ({
            id: v.id,
            coords: v.coords,
            finalName: generateVillageName(currentOptions, currentNum++, v.coords).slice(0, 32).replace(/[´^]/g, '')
        }));

        await processRenamingList(queue);
    });

    document.getElementById('combine-options').addEventListener('click', async function() {
        if (currentOptions.length === 0) {
            showCustomNotification("Atenção: Seleciona pelo menos uma opção.", "error");
            return;
        }

        const allVillages = await getAllPlayerVillages();
        let startingNumber = parseInt(currentOptions.find(opt => opt.type === 'number')?.startNumberInput) || 1;
        
        const queue = allVillages.map((v, idx) => ({
            id: v.id,
            coords: v.coords,
            finalName: generateVillageName(currentOptions, startingNumber + idx, v.coords).slice(0, 32).replace(/[´^]/g, '')
        }));

        await processRenamingList(queue);
    });

    document.getElementById('language-select').addEventListener('change', function () { setLanguage(this.value); });
    document.querySelectorAll('.rename-option, #textInput, #digitInput, #startNumberInput, #targetCoordInput').forEach(input => input.addEventListener('input', combineOptions));
    
    function showCustomNotification(message, type = "success") {
        let container = document.getElementById('customNotificationContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'customNotificationContainer';
            container.style.position = 'fixed';
            container.style.bottom = '30px';
            container.style.left = '15px';
            container.style.zIndex = '10000';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.gap = '5px';
            document.body.appendChild(container);
        }
        
        const notification = document.createElement('div');
        notification.innerHTML = message;
        notification.style.padding = '8px 15px';
        notification.style.backgroundColor = type === "success" ? '#4CAF50' : '#f44336';
        notification.style.color = '#fff';
        notification.style.borderRadius = '3px';
        notification.style.boxShadow = '0 3px 6px rgba(0,0,0,0.3)';
        notification.style.fontSize = '12px';
        notification.style.fontWeight = 'bold';
        
        container.appendChild(notification);
        setTimeout(() => notification.remove(), 2500);
    }

    loadSettings();
    combineOptions(); 
})();
