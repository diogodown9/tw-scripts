(function() {
    'use strict';

    // 1. Redireciona para o Combinado se necessário
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
            options: { 
                textOption: "Text", 
                numberOption: "Number", 
                incomingAttackOption: "Incoming Attack Tag",
                kOption: "By K", 
                randomCoordOption: "Random Coordinates", 
                distanceOption: "Distance (in fields)", 
                randomNameOption: "Random Name" 
            },
            placeholders: { 
                textInput: "Enter text", 
                digitInput: "Total digits", 
                startNumberInput: "Starting number", 
                incomingAttackInput: "e.g. INCOMING ATTACK - NOBLE",
                targetCoordInput: "Target (XXX|YYY)", 
                result: "Example result" 
            },
            renameButton: "Rename All",
            renameAttackedButton: "Rename Attacked Only",
            fixButton: "Auto-Fix New"
        },
        pt: {
            heading: "Opções de Renomeação",
            tableHeaders: { option: "Opção", configuration: "Configuração" },
            options: { 
                textOption: "Texto", 
                numberOption: "Número", 
                incomingAttackOption: "Tag de Ataque",
                kOption: "Por K", 
                randomCoordOption: "Coordenada Aleatória", 
                distanceOption: "Distância (em campos)", 
                randomNameOption: "Nome Aleatório" 
            },
            placeholders: { 
                textInput: "Digite o texto", 
                digitInput: "Total dígitos", 
                startNumberInput: "Nº inicial", 
                incomingAttackInput: "Ex: ATAQUE A CHEGAR - NOBRE",
                targetCoordInput: "Alvo (XXX|YYY)", 
                result: "Exemplo de resultado" 
            },
            renameButton: "Renomear Todas",
            renameAttackedButton: "Renomear Sob Ataque",
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
                        <input type="checkbox" id="incomingAttackOption" class="rename-option" style="cursor: pointer; transform: scale(1.2);">
                        <label for="incomingAttackOption" style="margin-left: 8px; cursor: pointer; font-weight: bold; color: #b71c1c; font-size: 13px;">Tag de Ataque</label>
                    </td>
                    <td style="padding: 10px;"><input type="text" id="incomingAttackInput" value="ATAQUE A CHEGAR - NOBRE" placeholder="Ex: ATAQUE A CHEGAR - NOBRE" style="width: 100%; padding: 6px; border: 1px solid #a37c44; border-radius: 3px;"></td>
                </tr>
                <tr class="rename-option-container" style="border-bottom: 1px solid #dcb588; background: rgba(255,255,255,0.3);">
                    <td style="padding: 10px;">
                        <input type="checkbox" id="numberOption" class="rename-option" style="cursor: pointer; transform: scale(1.2);">
                        <label for="numberOption" style="margin-left: 8px; cursor: pointer; font-weight: bold; color: #333; font-size: 13px;">Número</label>
                    </td>
                    <td style="padding: 10px; display: flex; gap: 10px;">
                        <input type="number" id="digitInput" placeholder="Total dígitos" style="flex: 1; padding: 6px; border: 1px solid #a37c44; border-radius: 3px;">
                        <input type="number" id="startNumberInput" placeholder="Nº inicial" style="flex: 1; padding: 6px; border: 1px solid #a37c44; border-radius: 3px;">
                    </td>
                </tr>
                <tr class="rename-option-container" style="border-bottom: 1px solid #dcb588;">
                    <td style="padding: 10px;">
                        <input type="checkbox" id="kOption" class="rename-option" style="cursor: pointer; transform: scale(1.2);">
                        <label for="kOption" style="margin-left: 8px; cursor: pointer; font-weight: bold; color: #333; font-size: 13px;">Por K</label>
                    </td>
                    <td style="padding: 10px;"><span style="font-size: 11px; color: #555; font-style: italic;">Adiciona automaticamente o continente</span></td>
                </tr>
                <tr class="rename-option-container" style="border-bottom: 1px solid #dcb588; background: rgba(255,255,255,0.3);">
                    <td style="padding: 10px;">
                        <input type="checkbox" id="randomCoordOption" class="rename-option" style="cursor: pointer; transform: scale(1.2);">
                        <label for="randomCoordOption" style="margin-left: 8px; cursor: pointer; font-weight: bold; color: #333; font-size: 13px;">Coordenada Aleatória</label>
                    </td>
                    <td style="padding: 10px;"></td>
                </tr>
                <tr class="rename-option-container" style="border-bottom: 1px solid #dcb588;">
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

        <div style="background: #fff; padding: 12px; border: 1px solid #c1a264; border-radius: 4px; margin-bottom: 15px;">
            <strong style="color: #603000; font-size: 12px; display: block; margin-bottom: 5px; text-transform: uppercase;">Pré-visualização:</strong>
            <input type="text" id="result" placeholder="Exemplo de resultado" style="width: 100%; border: none; background: transparent; font-size: 15px; font-weight: bold; color: #000; outline: none;" readonly="">
        </div>

        <div id="progress-container" style="display: none; margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; color: #603000; margin-bottom: 4px;">
                <span id="progress-text">A renomear... [0/0]</span>
                <span id="progress-percent">0%</span>
            </div>
            <div style="width: 100%; background: #e0d0b0; border: 1px solid #8c5f0d; border-radius: 4px; height: 16px; overflow: hidden;">
                <div id="progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #5cb85c, #4cae4c); transition: width 0.15s ease;"></div>
            </div>
        </div>
        
        <div style="display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap;">
            <button id="rename-attacked" class="btn" style="padding: 10px 15px; font-size: 13px; cursor: pointer; border-radius: 4px; background: #c9302c; color: white; border: 1px solid #ac2925; font-weight: bold;">Renomear Sob Ataque</button>
            <button id="fix-outliers" class="btn" style="padding: 10px 15px; font-size: 13px; cursor: pointer; border-radius: 4px; background: #f0ad4e; color: white; border: 1px solid #d58512; font-weight: bold;">Auto-Corrigir Novas</button>
            <button id="combine-options" class="btn" style="padding: 10px 20px; font-size: 13px; cursor: pointer; border-radius: 4px; background: #5cb85c; color: white; border: 1px solid #398439; font-weight: bold;">Renomear Todas</button>
        </div>
    </div>`;

    const container = document.createElement('div');
    container.innerHTML = contentRename;
    modemenuElement.parentNode.insertBefore(container, modemenuElement);

    let currentOptions = []; 

    document.getElementById('btn-close-renamer').addEventListener('click', () => {
        document.getElementById('rename-container').style.display = 'none';
    });

    function setLanguage(lang) {
        const t = translations[lang];
        document.getElementById('rename-title').innerHTML = `🛠️ ${t.heading}`;
        ['option', 'configuration'].forEach((key, i) => document.querySelector(`#rename-options-table th:nth-child(${i + 1})`).textContent = t.tableHeaders[key]);
        ['textOption', 'numberOption', 'incomingAttackOption', 'kOption', 'randomCoordOption', 'distanceOption', 'randomNameOption'].forEach(opt => {
            const label = document.querySelector(`#${opt} + label`);
            if (label) label.textContent = t.options[opt];
        });
        ['textInput', 'incomingAttackInput', 'digitInput', 'startNumberInput', 'targetCoordInput', 'result'].forEach(input => {
            const el = document.querySelector(`#${input}`);
            if (el) el.placeholder = t.placeholders[input];
        });
        document.querySelector('#combine-options').textContent = t.renameButton;
        document.querySelector('#rename-attacked').textContent = t.renameAttackedButton;
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

    const prefixes = ["Al", "Bar", "Car", "Del", "Eld", "Fal", "Gar", "Hal", "Il", "Jar", "Kal", "Lor"];
    const middles = ["dorn", "fell", "gorn", "hil", "mir", "nar", "pel", "quil", "rak", "sor", "tur"];
    const suffixes = ["dor", "mar", "rin", "ton", "vin", "wyn", "zar", "thur", "lak", "dil", "ros"];

    function generateRandomName() {
        return `${prefixes[Math.floor(Math.random() * prefixes.length)]}${middles[Math.floor(Math.random() * middles.length)]}${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
    }

    function generateVillageName(optionsArray, numberCounter, coords) {
        return optionsArray.map(opt => {
            switch (opt.type) {
                case 'text': return opt.textInput || '';
                case 'incomingattack': return opt.incomingAttackInput || 'ATAQUE A CHEGAR - NOBRE';
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

    function renameSingleVillage(element, finalName) {
        return new Promise((resolve) => {
            const labelNode = element.querySelector('.quickedit-vn');
            if (!labelNode) return resolve(false);

            const renameIcon = labelNode.querySelector('.rename-icon');
            if (renameIcon) renameIcon.click();

            let checkAttempts = 0;
            const interval = setInterval(() => {
                checkAttempts++;
                const quickEditSpan = labelNode.querySelector('.quickedit-edit');
                if (quickEditSpan) {
                    const textInput = quickEditSpan.querySelector('input[type="text"]');
                    const submitBtn = quickEditSpan.querySelector('.btn') || quickEditSpan.querySelector('input[type="button"], input[type="submit"]');

                    if (textInput && submitBtn) {
                        clearInterval(interval);
                        textInput.value = finalName;
                        submitBtn.click();
                        return resolve(true);
                    }
                }

                if (checkAttempts > 12) {
                    clearInterval(interval);
                    resolve(false);
                }
            }, 25);
        });
    }

    function isVillageUnderAttack(element) {
        return !!(
            element.querySelector('.command-icon[src*="attack"]') ||
            element.querySelector('img[src*="graphic/command/attack.png"]') ||
            element.querySelector('img[src*="attack.png"]') ||
            element.querySelector('a[href*="command_tx"] img[src*="attack"]')
        );
    }

    async function processRenaming(villagesNodeList, startingNumber, activeOptions = currentOptions) {
        const list = Array.from(villagesNodeList);
        const total = list.length;
        if (total === 0) return;

        let numberCounter = startingNumber;
        const BATCH_SIZE = 3;
        const BATCH_DELAY = 160;

        const btnCombine = document.getElementById('combine-options');
        const btnFix = document.getElementById('fix-outliers');
        const btnAttacked = document.getElementById('rename-attacked');
        const progressContainer = document.getElementById('progress-container');
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        const progressPercent = document.getElementById('progress-percent');

        btnCombine.disabled = true;
        btnFix.disabled = true;
        btnAttacked.disabled = true;
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressText.textContent = `A renomear... [0/${total}]`;
        progressPercent.textContent = `0%`;

        let processed = 0;

        for (let i = 0; i < total; i += BATCH_SIZE) {
            const chunk = list.slice(i, i + BATCH_SIZE);

            await Promise.all(chunk.map((element, chunkIdx) => {
                const textContent = element.querySelector('.quickedit-label')?.textContent || '';
                const coordsMatches = textContent.match(/(\d{3}\|\d{3})/g);
                const coords = (coordsMatches && coordsMatches.length > 0 ? coordsMatches[coordsMatches.length - 1] : "000|000").split('|').map(Number);
                const finalName = generateVillageName(activeOptions, numberCounter++, coords).slice(0, 32).replace(/[´^]/g, '');

                return new Promise((res) => {
                    setTimeout(() => {
                        renameSingleVillage(element, finalName).then(res);
                    }, chunkIdx * 25);
                });
            }));

            processed += chunk.length;
            const currentDone = Math.min(processed, total);
            const pct = Math.round((currentDone / total) * 100);
            progressBar.style.width = `${pct}%`;
            progressText.textContent = `A renomear... [${currentDone}/${total}]`;
            progressPercent.textContent = `${pct}%`;

            if (i + BATCH_SIZE < total) {
                await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
            }
        }

        btnCombine.disabled = false;
        btnFix.disabled = false;
        btnAttacked.disabled = false;
        showCustomNotification(`Concluído! ${total} aldeias renomeadas com sucesso!`, "success");

        setTimeout(() => {
            progressContainer.style.display = 'none';
        }, 3000);
    }

    // Botão Renomear Apenas Aldeias Sob Ataque
    document.getElementById('rename-attacked').addEventListener('click', function() {
        const lineVillages = Array.from(document.querySelectorAll('.nowrap.row_a, .nowrap.row_b'));
        const attackedVillages = lineVillages.filter(isVillageUnderAttack);

        if (attackedVillages.length === 0) {
            showCustomNotification("Nenhuma aldeia está a sofrer ataques neste grupo!", "error");
            return;
        }

        // Garante que a opção de tag de ataque é aplicada mesmo que não esteja selecionada globalmente
        let optionsToApply = [...currentOptions];
        const attackInputVal = document.getElementById('incomingAttackInput').value.trim() || 'ATAQUE A CHEGAR - NOBRE';

        if (!optionsToApply.some(opt => opt.type === 'incomingattack')) {
            optionsToApply = optionsToApply.filter(opt => opt.type !== 'text');
            optionsToApply.unshift({ type: 'incomingattack', incomingAttackInput: attackInputVal });
        }

        let startingNumber = parseInt(optionsToApply.find(opt => opt.type === 'number')?.startNumberInput) || 1;
        processRenaming(attackedVillages, startingNumber, optionsToApply);
    });

    document.getElementById('fix-outliers').addEventListener('click', function() {
        if (currentOptions.length === 0) {
            showCustomNotification("Atenção: Seleciona pelo menos uma opção de renomeação.", "error");
            return;
        }

        const textOpt = currentOptions.find(opt => opt.type === 'text' || opt.type === 'incomingattack');
        const baseText = (textOpt?.textInput || textOpt?.incomingAttackInput || '').trim();

        if (!baseText) {
            showCustomNotification("Para esta função, ativa e preenche a opção 'Texto' ou 'Tag de Ataque'.", "error");
            return;
        }

        const lineVillages = document.querySelectorAll('.nowrap.row_a, .nowrap.row_b');
        let maxFoundNumber = 0;
        let villagesToRename = [];

        lineVillages.forEach((element) => {
            const labelNode = element.querySelector('.quickedit-vn');
            if (!labelNode) return;
            
            let currentName = element.querySelector('.quickedit-label').textContent;
            currentName = currentName.replace(/\(\d{3}\|\d{3}\)\sK\d{2}/g, '').trim(); 
            
            if (currentName.includes(baseText)) {
                const remainingPart = currentName.replace(baseText, '');
                const numMatch = remainingPart.match(/\d+/);
                if (numMatch) {
                    const num = parseInt(numMatch[0]);
                    if (num > maxFoundNumber) maxFoundNumber = num;
                }
            } else {
                villagesToRename.push(element);
            }
        });

        if (villagesToRename.length === 0) {
            showCustomNotification("Todas as aldeias já estão dentro do teu padrão!", "success");
            return;
        }

        processRenaming(villagesToRename, maxFoundNumber + 1);
    });

    document.getElementById('combine-options').addEventListener('click', function() {
        if (currentOptions.length === 0) {
            showCustomNotification("Atenção: Seleciona pelo menos uma opção de renomeação.", "error");
            return;
        }
        const lineVillages = document.querySelectorAll('.nowrap.row_a, .nowrap.row_b');
        let startingNumber = parseInt(currentOptions.find(opt => opt.type === 'number')?.startNumberInput) || 1;
        processRenaming(lineVillages, startingNumber);
    });

    document.getElementById('language-select').addEventListener('change', function () { setLanguage(this.value); });
    document.querySelectorAll('.rename-option, #textInput, #incomingAttackInput, #digitInput, #startNumberInput, #targetCoordInput').forEach(input => input.addEventListener('input', combineOptions));
    
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

        container.innerHTML = '';
        
        const notification = document.createElement('div');
        notification.innerHTML = message;
        notification.style.padding = '8px 15px';
        notification.style.backgroundColor = type === "success" ? '#4CAF50' : '#f44336';
        notification.style.color = '#fff';
        notification.style.borderRadius = '4px';
        notification.style.boxShadow = '0 3px 6px rgba(0,0,0,0.3)';
        notification.style.fontSize = '12px';
        notification.style.fontWeight = 'bold';
        
        container.appendChild(notification);
        setTimeout(() => {
            if (notification.parentNode) notification.remove();
        }, 2500);
    }

    loadSettings();
    combineOptions(); 
})();
