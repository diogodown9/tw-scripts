// ==UserScript==
// @name         TW - Gestor Total de Renomeação (Ordem Conquistas + Custom UI)
// @namespace    https://github.com/
// @version      4.3.0
// @description  Menu completo de opções customizáveis com fecho automático do painel e suporte robusto a aldeias sob ataque
// @author       d0wn
// @match        https://*.tribalwars.com.pt/game.php*
// @match        https://*.tribos.com.pt/game.php*
// @grant        none
// ==/UserScript==

(async function() {
    'use strict';

    const CONFIG = {
        delayMs: 65,
        autoReload: true
    };

    if (typeof game_data === 'undefined' || !game_data.player.id) return;

    // 1. Redireciona para o Combinado se não estiver no ecrã correto
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
    if (!modemenuElement) return;

    const translations = {
        en: {
            heading: "Renaming Options",
            tableHeaders: { option: "Option", configuration: "Configuration" },
            options: { 
                textOption: "Text", 
                numberOption: "Number", 
                conquerOrderOption: "Chronological Order (Conquests)", 
                kOption: "By K", 
                randomCoordOption: "Random Coordinates", 
                distanceOption: "Distance (fields)", 
                randomNameOption: "Random Name" 
            },
            placeholders: { 
                textInput: "Enter text", 
                digitInput: "Total digits", 
                startNumberInput: "Starting number", 
                targetCoordInput: "Target (XXX|YYY)", 
                result: "Example result" 
            },
            renameButton: "Rename All",
            renameAttackedButton: "Rename Attacked",
            fixButton: "Auto-Fix New"
        },
        pt: {
            heading: "Opções de Renomeação",
            tableHeaders: { option: "Opção", configuration: "Configuração" },
            options: { 
                textOption: "Texto", 
                numberOption: "Número", 
                conquerOrderOption: "Ordem Conquistas (Histórico)", 
                kOption: "Por K", 
                randomCoordOption: "Coordenada Aleatória", 
                distanceOption: "Distância (campos)", 
                randomNameOption: "Nome Aleatório" 
            },
            placeholders: { 
                textInput: "Digite o texto", 
                digitInput: "Total dígitos", 
                startNumberInput: "Nº inicial", 
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
                        <input type="checkbox" id="numberOption" class="rename-option" style="cursor: pointer; transform: scale(1.2);" checked>
                        <label for="numberOption" style="margin-left: 8px; cursor: pointer; font-weight: bold; color: #333; font-size: 13px;">Número</label>
                    </td>
                    <td style="padding: 10px; display: flex; gap: 10px;">
                        <input type="number" id="digitInput" placeholder="Total dígitos" value="3" style="flex: 1; padding: 6px; border: 1px solid #a37c44; border-radius: 3px;">
                        <input type="number" id="startNumberInput" placeholder="Nº inicial" value="1" style="flex: 1; padding: 6px; border: 1px solid #a37c44; border-radius: 3px;">
                    </td>
                </tr>
                <tr class="rename-option-container" style="border-bottom: 1px solid #dcb588; background: rgba(255,255,255,0.3);">
                    <td style="padding: 10px;">
                        <input type="checkbox" id="conquerOrderOption" class="rename-option" style="cursor: pointer; transform: scale(1.2);" checked>
                        <label for="conquerOrderOption" style="margin-left: 8px; cursor: pointer; font-weight: bold; color: #333; font-size: 13px;">Ordem Conquistas (Histórico)</label>
                    </td>
                    <td style="padding: 10px;"><span style="font-size: 11px; color: #555; font-style: italic;">Ordena da 1ª aldeia conquistada até à mais recente</span></td>
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
                        <input type="checkbox" id="distanceOption" class="rename-option" style="cursor: pointer; transform: scale(1.2);">
                        <label for="distanceOption" style="margin-left: 8px; cursor: pointer; font-weight: bold; color: #333; font-size: 13px;">Distância (campos)</label>
                    </td>
                    <td style="padding: 10px;"><input type="text" id="targetCoordInput" placeholder="Alvo (XXX|YYY)" style="width: 100%; padding: 6px; border: 1px solid #a37c44; border-radius: 3px;"></td>
                </tr>
                <tr class="rename-option-container" style="border-bottom: 1px solid #dcb588;">
                    <td style="padding: 10px;">
                        <input type="checkbox" id="randomCoordOption" class="rename-option" style="cursor: pointer; transform: scale(1.2);">
                        <label for="randomCoordOption" style="margin-left: 8px; cursor: pointer; font-weight: bold; color: #333; font-size: 13px;">Coordenada Aleatória</label>
                    </td>
                    <td style="padding: 10px;"></td>
                </tr>
                <tr class="rename-option-container">
                    <td style="padding: 10px;">
                        <input type="checkbox" id="randomNameOption" class="rename-option" style="cursor: pointer; transform: scale(1.2);">
                        <label for="randomNameOption" style="margin-left: 8px; cursor: pointer; font-weight: bold; color: #333; font-size: 13px;">Nome Aleatório</label>
                    </td>
                    <td style="padding: 10px;"><span style="font-size: 11px; color: #555; font-style: italic;">Gera um nome de fantasia medieval</span></td>
                </tr>
            </tbody>
        </table>

        <div style="background: #fff; padding: 12px; border: 1px solid #c1a264; border-radius: 4px; margin-bottom: 20px;">
            <strong style="color: #603000; font-size: 12px; display: block; margin-bottom: 5px; text-transform: uppercase;">Pré-visualização:</strong>
            <input type="text" id="result" placeholder="Exemplo de resultado" style="width: 100%; border: none; background: transparent; font-size: 15px; font-weight: bold; color: #000; outline: none;" readonly="">
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
    let isProcessing = false;

    document.getElementById('btn-close-renamer').addEventListener('click', () => {
        document.getElementById('rename-container').style.display = 'none';
    });

    function setLanguage(lang) {
        const t = translations[lang];
        document.getElementById('rename-title').innerHTML = `🛠️ ${t.heading}`;
        ['option', 'configuration'].forEach((key, i) => document.querySelector(`#rename-options-table th:nth-child(${i + 1})`).textContent = t.tableHeaders[key]);
        ['textOption', 'numberOption', 'conquerOrderOption', 'kOption', 'randomCoordOption', 'distanceOption', 'randomNameOption'].forEach(opt => {
            const el = document.querySelector(`#${opt} + label`);
            if (el) el.textContent = t.options[opt];
        });
        ['textInput', 'digitInput', 'startNumberInput', 'targetCoordInput', 'result'].forEach(input => {
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
        document.querySelectorAll('.rename-option-container').forEach(cont => {
            const checkbox = cont.querySelector('.rename-option');
            const inputs = [...cont.querySelectorAll('input[type="text"], input[type="number"]')].reduce((acc, input) => {
                acc[input.id] = input.value;
                return acc;
            }, {});
            settings[checkbox.id] = { checked: checkbox.checked, inputs };
        });
        localStorage.setItem('renameSettingsTW_Merged', JSON.stringify(settings));
    }

    function loadSettings() {
        const settings = JSON.parse(localStorage.getItem('renameSettingsTW_Merged'));
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
        currentOptions = [...document.querySelectorAll('.rename-option-container')].map(cont => {
            const checkbox = cont.querySelector('.rename-option');
            if (!checkbox.checked) return null;
            const inputs = [...cont.querySelectorAll('input[type="text"], input[type="number"]')].reduce((acc, input) => {
                acc[input.id] = input.value;
                return acc;
            }, {});
            return { type: checkbox.id.replace('Option', '').toLowerCase(), ...inputs };
        }).filter(Boolean);

        const coords = [500, 500];
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
                case 'attacktag': return 'ATAQUE A CHEGAR - NOBRE';
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
        }).filter(Boolean).join(' ').trim();
    }

    function checkRowForAttacks(row) {
        if (!row) return false;
        
        // Verifica ícones visíveis diretos
        const hasAttackImg = !!(
            row.querySelector('img[src*="attack"]') ||
            row.querySelector('img[src*="graphic/command/attack"]') ||
            row.querySelector('a[href*="command_tx"] img') ||
            row.querySelector('.command-icon[src*="attack"]')
        );
        if (hasAttackImg) return true;

        // Verifica sprites e contadores de comandos do TW
        const commandIcons = row.querySelectorAll('.command-icon, [class*="command_"]');
        for (const icon of commandIcons) {
            const style = window.getComputedStyle(icon);
            if (icon.className.includes('attack') || style.backgroundImage.includes('attack')) {
                return true;
            }
        }

        // Verifica indicador textual de comandos a chegar no próprio label
        const fullHtml = row.innerHTML;
        return fullHtml.includes('command/attack') || fullHtml.includes('type=attack') || fullHtml.includes('mode=incomings');
    }

    function extractVillagesFromDocument(targetDoc) {
        const rows = targetDoc.querySelectorAll('#combined_table tr[class*="nowrap"]');
        const list = [];

        rows.forEach(row => {
            const link = row.querySelector('.quickedit-vn');
            if (link) {
                const id = parseInt(link.getAttribute('data-id'));
                const label = row.querySelector('.quickedit-label');
                const fullText = label ? label.textContent.trim() : link.innerText.trim();
                const coordsMatch = fullText.match(/\((\d{3}\|\d{3})\)/) || fullText.match(/(\d{3}\|\d{3})/);
                const coords = coordsMatch ? coordsMatch[1].split('|').map(Number) : [0, 0];
                const cleanName = fullText.replace(/\(\d{3}\|\d{3}\)\s*K\d{2}/gi, '').trim();
                const isAttacked = checkRowForAttacks(row);

                list.push({ id, name: cleanName, fullText, coords, isAttacked });
            }
        });

        return list;
    }

    async function loadAccountData() {
        const playerId = parseInt(game_data.player.id);
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('page', '-1');

        const [overviewRes, cRes] = await Promise.all([
            fetch(currentUrl.toString()),
            fetch('/map/conquer.txt')
        ]);

        const [overviewHtml, cText] = await Promise.all([overviewRes.text(), cRes.text()]);
        const parser = new DOMParser();
        const doc = parser.parseFromString(overviewHtml, 'text/html');

        let villages = extractVillagesFromDocument(doc);

        // Fallback para o DOM ativo se o fetch overview não trouxer linhas (ex: restrição de sessão ou paginação)
        if (villages.length === 0) {
            villages = extractVillagesFromDocument(document);
        } else {
            // Sincroniza flag isAttacked do DOM da página atual caso o endpoint page=-1 omita render de comandos dinâmicos
            const domVillages = extractVillagesFromDocument(document);
            domVillages.forEach(dv => {
                if (dv.isAttacked) {
                    const match = villages.find(v => v.id === dv.id);
                    if (match) match.isAttacked = true;
                }
            });
        }

        const latestConquests = new Map();
        cText.trim().split('\n').forEach(line => {
            const parts = line.split(',');
            if (parts.length >= 4) {
                const vId = parseInt(parts[0]);
                const timestamp = parseInt(parts[1]);
                const newOwner = parseInt(parts[2]);
                if (newOwner === playerId) {
                    const currentMax = latestConquests.get(vId) || 0;
                    if (timestamp > currentMax) latestConquests.set(vId, timestamp);
                }
            }
        });

        return { villages, latestConquests };
    }

    async function executeRenaming(queue) {
        if (isProcessing || queue.length === 0) return;
        isProcessing = true;

        const uiPanel = document.getElementById('rename-container');
        if (uiPanel) uiPanel.style.display = 'none';

        const csrfToken = game_data.csrf;
        const total = queue.length;

        const progressBox = document.createElement('div');
        progressBox.style.cssText = 'position:fixed; top:20px; left:50%; transform:translateX(-50%); z-index:99999; background:#f4e4bc; border:2px solid #8c5f0d; padding:15px 25px; border-radius:6px; box-shadow:0 4px 15px rgba(0,0,0,0.5); font-family:Verdana,Arial,sans-serif; text-align:center; width:360px;';
        progressBox.innerHTML = `
            <div id="tw-progress-text" style="font-weight:bold; color:#603000; margin-bottom:8px; font-size:13px;">A renomear 0/${total}...</div>
            <div style="background:#e0c997; border:1px solid #a37c44; border-radius:4px; height:18px; width:100%; overflow:hidden;">
                <div id="tw-progress-bar" style="background:linear-gradient(to bottom, #5cb85c 0%, #449d44 100%); width:0%; height:100%; transition:width 0.1s ease;"></div>
            </div>
        `;
        document.body.appendChild(progressBox);

        for (let i = 0; i < total; i++) {
            const item = queue[i];

            await fetch(`/game.php?village=${item.id}&screen=main&action=change_name`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ name: item.targetName, h: csrfToken })
            });

            const domRow = document.querySelector(`.quickedit-vn[data-id="${item.id}"]`);
            if (domRow) {
                const label = domRow.closest('tr').querySelector('.quickedit-label');
                if (label) {
                    label.innerHTML = `${item.targetName} <span class="grey">(${item.coords.join('|')}) K${Math.floor(item.coords[1] / 100)}${Math.floor(item.coords[0] / 100)}</span>`;
                }
            }

            const percent = Math.round(((i + 1) / total) * 100);
            document.getElementById('tw-progress-text').innerText = `A renomear ${i + 1}/${total} (${percent}%)...`;
            document.getElementById('tw-progress-bar').style.width = `${percent}%`;

            if (CONFIG.delayMs > 0 && i < total - 1) {
                await new Promise(r => setTimeout(r, CONFIG.delayMs));
            }
        }

        progressBox.remove();
        isProcessing = false;
        UI.SuccessMessage(`Sucesso! ${total} aldeias renomeadas.`);

        if (CONFIG.autoReload) {
            setTimeout(() => location.reload(), 600);
        }
    }

    // Botão Renomear Apenas Aldeias Sob Ataque
    document.getElementById('rename-attacked').addEventListener('click', async function() {
        const { villages } = await loadAccountData();
        const attackedVillages = villages.filter(v => v.isAttacked);

        if (attackedVillages.length === 0) {
            UI.ErrorMessage("Nenhuma aldeia a sofrer ataques detetada neste grupo!");
            return;
        }

        // Monta padrão com tag de ataque em substituição de texto fixo
        let optionsToApply = currentOptions.filter(opt => opt.type !== 'text');
        optionsToApply.unshift({ type: 'attacktag' });

        const startNumber = parseInt(optionsToApply.find(opt => opt.type === 'number')?.startNumberInput) || 1;
        const queue = [];

        attackedVillages.forEach((v, idx) => {
            const targetName = generateVillageName(optionsToApply, startNumber + idx, v.coords).slice(0, 32).replace(/[´^]/g, '');
            if (v.name !== targetName) {
                queue.push({ id: v.id, targetName, coords: v.coords });
            }
        });

        if (queue.length === 0) {
            UI.SuccessMessage("Todas as aldeias sob ataque já contêm a tag aplicada.");
            return;
        }

        if (!confirm(`Total de aldeias sob ataque: ${attackedVillages.length}\nAldeias a alterar: ${queue.length}\n\nAvançar?`)) return;

        await executeRenaming(queue);
    });

    // Botão Renomear Todas
    document.getElementById('combine-options').addEventListener('click', async function() {
        if (currentOptions.length === 0) {
            UI.ErrorMessage("Seleciona pelo menos uma opção.");
            return;
        }

        const { villages, latestConquests } = await loadAccountData();
        const useConquerOrder = document.getElementById('conquerOrderOption').checked;

        let orderedList = [...villages];
        if (useConquerOrder) {
            const initialList = [];
            const conqueredList = [];
            villages.forEach(v => {
                if (latestConquests.has(v.id)) {
                    conqueredList.push({ ...v, conquerTime: latestConquests.get(v.id) });
                } else {
                    initialList.push({ ...v, conquerTime: 0 });
                }
            });
            conqueredList.sort((a, b) => a.conquerTime - b.conquerTime);
            orderedList = [...initialList, ...conqueredList];
        }

        const startNumber = parseInt(currentOptions.find(opt => opt.type === 'number')?.startNumberInput) || 1;
        const queue = [];

        orderedList.forEach((v, idx) => {
            const targetName = generateVillageName(currentOptions, startNumber + idx, v.coords).slice(0, 32).replace(/[´^]/g, '');
            if (v.name !== targetName) {
                queue.push({ id: v.id, targetName, coords: v.coords });
            }
        });

        if (queue.length === 0) {
            UI.SuccessMessage("Todas as aldeias já estão no padrão configurado.");
            return;
        }

        if (!confirm(`Total de aldeias: ${orderedList.length}\nAldeias a alterar: ${queue.length}\n\nAvançar?`)) return;

        await executeRenaming(queue);
    });

    // Botão Auto-Corrigir Novas
    document.getElementById('fix-outliers').addEventListener('click', async function() {
        const textOpt = currentOptions.find(opt => opt.type === 'text');
        const baseText = (textOpt?.textInput || '').trim();

        if (!baseText) {
            UI.ErrorMessage("Ativa e preenche a opção 'Texto' primeiro.");
            return;
        }

        const { villages, latestConquests } = await loadAccountData();

        let maxFoundNumber = 0;
        let outliers = [];

        villages.forEach(v => {
            if (v.name.includes(baseText)) {
                const numMatch = v.name.replace(baseText, '').match(/\d+/);
                if (numMatch) {
                    const num = parseInt(numMatch[0]);
                    if (num > maxFoundNumber) maxFoundNumber = num;
                }
            } else {
                outliers.push(v);
            }
        });

        if (outliers.length === 0) {
            UI.SuccessMessage("Todas as aldeias já seguem o padrão!");
            return;
        }

        outliers.sort((a, b) => (latestConquests.get(a.id) || 0) - (latestConquests.get(b.id) || 0));

        let currentNum = maxFoundNumber + 1;
        const queue = outliers.map(v => ({
            id: v.id,
            coords: v.coords,
            targetName: generateVillageName(currentOptions, currentNum++, v.coords).slice(0, 32).replace(/[´^]/g, '')
        }));

        if (!confirm(`Foram detetadas ${outliers.length} novas aldeias fora do padrão.\n\nAvançar com a auto-correção?`)) return;

        await executeRenaming(queue);
    });

    document.getElementById('language-select').addEventListener('change', function() { setLanguage(this.value); });
    document.querySelectorAll('.rename-option, #textInput, #digitInput, #startNumberInput, #targetCoordInput').forEach(input => input.addEventListener('input', combineOptions));

    loadSettings();
    combineOptions();
})();
