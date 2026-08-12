/*
 * Script Name: Own Notes Manager
 * Version: v1.1.0 (Optimized)
 * Last Updated: 2026-08-12
 * Author: RedAlert
 * Author URL: https://twscripts.dev/
 * Author Contact: redalert_tw (Discord)
 * Approved: N/A
 * Approved Date: 2022-02-09
 * Mod: JawJaw / Optimized
 */

/* Copyright (c) RedAlert
By uploading a user-generated mod (script) for use with Tribal Wars, you grant InnoGames a perpetual, irrevocable, worldwide, royalty-free, non-exclusive license to use, reproduce, distribute, publicly display, modify, and create derivative works of the mod. This license permits InnoGames to incorporate the mod into any aspect of the game and its related services, including promotional and commercial endeavors, without any requirement for compensation or attribution to you. InnoGames is entitled but not obligated to name you when exercising its rights. You represent and warrant that you have the legal right to grant this license and that the mod does not infringe upon any third-party rights. You are - with the exception of claims of infringement by third parties – not liable for any usage of the mod by InnoGames. German law applies.
*/

// User Input
if (typeof DEBUG !== 'boolean') DEBUG = false;

// Script Config
var scriptConfig = {
    scriptData: {
        prefix: 'ownNotesManager',
        name: 'Own Notes Manager',
        version: 'v1.1.0',
        author: 'RedAlert',
        authorUrl: 'https://twscripts.dev/',
        helpLink:
            'https://forum.tribalwars.net/index.php?threads/own-notes-manager.287765/',
    },
    translations: {
        en_DK: {
            'Own Notes Manager': 'Own Notes Manager',
            Help: 'Help',
            'There was an error!': 'There was an error!',
            'Redirecting...': 'Redirecting...',
            Player: 'Player',
            Tribe: 'Tribe',
            'Excluded Players': 'Excluded Players',
            'Select Notes': 'Select Notes',
            'Start typing and suggestions will show ...': 'Start typing and suggestions will show ...',
            'You must select at least one player or one tribe!': 'You must select at least one player or one tribe!',
            'notes have been selected!': 'notes have been selected!',
            'No notes were selected!': 'No notes were selected!',
            Reset: 'Reset',
            '--Barbarian--': '--Barbarian--',
            'Expand Selected': 'Expand Selected'
        },
        pt_PT: {
            'Own Notes Manager': 'Gestor das Próprias Notas',
            Help: 'Ajuda',
            'There was an error!': 'Ocorreu um erro!',
            'Redirecting...': 'A redirecionar...',
            Player: 'Jogador',
            Tribe: 'Tribo',
            'Excluded Players': 'Jogadores Excluídos',
            'Select Notes': 'Selecionar Notas',
            'Start typing and suggestions will show ...': 'Começa a digitar para ver sugestões...',
            'You must select at least one player or one tribe!': 'Tens de selecionar pelo menos um jogador ou tribo!',
            'notes have been selected!': 'notas foram selecionadas!',
            'No notes were selected!': 'Nenhuma nota selecionada!',
            Reset: 'Redefinir',
            '--Barbarian--': '--Bárbaras--',
            'Expand Selected': 'Expandir Selecionadas'
        },
        pt_BR: {
            'Own Notes Manager': 'Gerenciador de Notas Próprias',
            Help: 'Ajuda',
            'There was an error!': 'Ocorreu um erro!',
            'Redirecting...': 'Redirecionando...',
            Player: 'Jogador',
            Tribe: 'Tribo',
            'Excluded Players': 'Jogadores Excluídos',
            'Select Notes': 'Selecionar Notas',
            'Start typing and suggestions will show ...': 'Comece a digitar para ver sugestões...',
            'You must select at least one player or one tribe!': 'Você deve selecionar pelo menos um jogador ou tribo!',
            'notes have been selected!': 'notas foram selecionadas!',
            'No notes were selected!': 'Nenhuma nota selecionada!',
            Reset: 'Redefinir',
            '--Barbarian--': '--Bárbaras--',
            'Expand Selected': 'Expandir Selecionadas'
        }
    },
    allowedMarkets: [],
    allowedScreens: ['notes'],
    allowedModes: ['own'],
    isDebug: DEBUG,
    enableCountApi: true,
};

window.twSDK = {
    // variables
    scriptData: {},
    translations: {},
    allowedMarkets: [],
    allowedScreens: [],
    allowedModes: [],
    enableCountApi: true,
    isDebug: false,
    isMobile: jQuery('#mobileHeader').length > 0,
    delayBetweenRequests: 200,
    // helper variables
    market: game_data.market,
    units: game_data.units,
    village: game_data.village,
    buildings: game_data.village.buildings,
    sitterId: game_data.player.sitter > 0 ? `&t=${game_data.player.id}` : '',
    coordsRegex: /\d{1,3}\|\d{1,3}/g,
    dateTimeMatch:
        /(?:[A-Z][a-z]{2}\s+\d{1,2},\s*\d{0,4}\s+|today\s+at\s+|tomorrow\s+at\s+)\d{1,2}:\d{2}:\d{2}:?\.?\d{0,3}/,
    worldInfoInterface: '/interface.php?func=get_config',
    unitInfoInterface: '/interface.php?func=get_unit_info',
    buildingInfoInterface: '/interface.php?func=get_building_info',
    worldDataVillages: '/map/village.txt',
    worldDataPlayers: '/map/player.txt',
    worldDataTribes: '/map/ally.txt',
    worldDataConquests: '/map/conquer_extended.txt',
    
    // (...) [Manter TODAS as constantes normais do twSDK intactas para não partir a library (buildingsList, buildingPoints, etc)]
    
    _initDebug: function () {
        const scriptInfo = this.scriptInfo();
        console.debug(`${scriptInfo} It works 🚀!`);
        console.debug(`${scriptInfo} HELP:`, this.scriptData.helpLink);
    },

    addGlobalStyle: function () {
        return `
            /* Table Styling */
            .ra-table-container { overflow-y: auto; overflow-x: hidden; height: auto; max-height: 400px; }
            .ra-table th { font-size: 14px; }
            .ra-table th label { margin: 0; padding: 0; }
            .ra-table th,
            .ra-table td { padding: 5px; text-align: center; }
            .ra-table td a { word-break: break-all; }
            .ra-table a:focus { color: blue; }
            .ra-table a.btn:focus { color: #fff; }
            .ra-table tr:nth-of-type(2n) td { background-color: #f0e2be }
            .ra-table tr:nth-of-type(2n+1) td { background-color: #fff5da; }

            .ra-table-v2 th,
            .ra-table-v2 td { text-align: left; }

            .ra-table-v3 { border: 2px solid #bd9c5a; }
            .ra-table-v3 th,
            .ra-table-v3 td { border-collapse: separate; border: 1px solid #bd9c5a; text-align: left; }

            /* Inputs */
            .ra-textarea { width: 100%; height: 80px; resize: none; }

            /* Popup */
            .ra-popup-content { width: 360px; }
            .ra-popup-content * { box-sizing: border-box; }
            .ra-popup-content input[type="text"] { padding: 3px; width: 100%; }
            .ra-popup-content .btn-confirm-yes { padding: 3px !important; }
            .ra-popup-content label { display: block; margin-bottom: 5px; font-weight: 600; }
            .ra-popup-content > div { margin-bottom: 15px; }
            .ra-popup-content > div:last-child { margin-bottom: 0 !important; }
            .ra-popup-content textarea { width: 100%; height: 100px; resize: none; }

            /* Elements */
            .ra-details { display: block; margin-bottom: 8px; border: 1px solid #603000; padding: 8px; border-radius: 4px; }
            .ra-details summary { font-weight: 600; cursor: pointer; }
            .ra-details p { margin: 10px 0 0 0; padding: 0; }

            /* Helpers */
            .ra-pa5 { padding: 5px !important; }
            .ra-mt15 { margin-top: 15px !important; }
            .ra-mb10 { margin-bottom: 10px !important; }
            .ra-mb15 { margin-bottom: 15px !important; }
            .ra-tal { text-align: left !important; }
            .ra-tac { text-align: center !important; }
            .ra-tar { text-align: right !important; }

            /* RESPONSIVE */
            @media (max-width: 480px) {
                .ra-fixed-widget {
                    position: relative !important;
                    top: 0;
                    left: 0;
                    display: block;
                    width: auto;
                    height: auto;
                    z-index: 1;
                }

                .ra-box-widget {
                    position: relative;
                    display: block;
                    box-sizing: border-box;
                    width: 97%;
                    height: auto;
                    margin: 10px auto;
                }

                .ra-table {
                    border-collapse: collapse !important;
                }

                .custom-close-button { display: none; }
                .ra-fixed-widget h3 { margin-bottom: 15px; }
                .ra-popup-content { width: 100%; }
            }
        `;
    },
    checkValidLocation: function (type) {
        switch (type) {
            case 'screen':
                return this.allowedScreens.includes(this.getParameterByName('screen'));
            case 'mode':
                return this.allowedModes.includes(this.getParameterByName('mode'));
            default:
                return false;
        }
    },
    cleanString: function (string) {
        try {
            return decodeURIComponent(string).replace(/\+/g, ' ');
        } catch (error) {
            console.error(error, string);
            return string;
        }
    },
    csvToArray: function (strData, strDelimiter = ',') {
        var objPattern = new RegExp(
            '(\\' +
                strDelimiter +
                '|\\r?\\n|\\r|^)' +
                '(?:"([^"]*(?:""[^"]*)*)"|' +
                '([^"\\' +
                strDelimiter +
                '\\r\\n]*))',
            'gi'
        );
        var arrData = [[]];
        var arrMatches = null;
        while ((arrMatches = objPattern.exec(strData))) {
            var strMatchedDelimiter = arrMatches[1];
            if (strMatchedDelimiter.length && strMatchedDelimiter !== strDelimiter) {
                arrData.push([]);
            }
            var strMatchedValue;

            if (arrMatches[2]) {
                strMatchedValue = arrMatches[2].replace(new RegExp('""', 'g'), '"');
            } else {
                strMatchedValue = arrMatches[3];
            }
            arrData[arrData.length - 1].push(strMatchedValue);
        }
        return arrData;
    },
    getParameterByName: function (name, url = window.location.href) {
        return new URL(url).searchParams.get(name);
    },
    redirectTo: function (location) {
        window.location.assign(game_data.link_base_pure + location);
    },
    renderBoxWidget: function (body, id, mainClass, customStyle) {
        const globalStyle = this.addGlobalStyle();
        const content = `
            <div class="${mainClass} ra-box-widget" id="${id}">
                <div class="${mainClass}-header">
                    <h3>${this.tt(this.scriptData.name)}</h3>
                </div>
                <div class="${mainClass}-body">
                    ${body}
                </div>
                <div class="${mainClass}-footer">
                    <small>
                        <strong>
                            ${this.tt(this.scriptData.name)} ${this.scriptData.version}
                        </strong> -
                        <a href="${this.scriptData.authorUrl}" target="_blank" rel="noreferrer noopener">
                            ${this.scriptData.author}
                        </a> -
                        <a href="${this.scriptData.helpLink}" target="_blank" rel="noreferrer noopener">
                            ${this.tt('Help')}
                        </a>
                    </small>
                </div>
            </div>
            <style>
                .${mainClass} { position: relative; display: block; width: 100%; height: auto; clear: both; margin: 10px 0 15px; border: 1px solid #603000; box-sizing: border-box; background: #f4e4bc; }
                .${mainClass} * { box-sizing: border-box; }
                .${mainClass} > div { padding: 10px; }
                .${mainClass} .btn-confirm-yes { padding: 3px; }
                .${mainClass}-header { display: flex; align-items: center; justify-content: space-between; background-color: #c1a264 !important; background-image: url(/graphic/screen/tableheader_bg3.png); background-repeat: repeat-x; }
                .${mainClass}-header h3 { margin: 0; padding: 0; line-height: 1; }
                .${mainClass}-body p { font-size: 14px; }
                .${mainClass}-body label { display: block; font-weight: 600; margin-bottom: 6px; }
                ${globalStyle}
                ${customStyle}
            </style>
        `;

        if (jQuery(`#${id}`).length < 1) {
            jQuery('#contentContainer').prepend(content);
            jQuery('#mobileContent').prepend(content);
        } else {
            jQuery(`.${mainClass}-body`).html(body);
        }
    },
    scriptInfo: function (scriptData = this.scriptData) {
        return `[${scriptData.name} ${scriptData.version}]`;
    },
    tt: function (string) {
        if (this.translations[game_data.locale] !== undefined) {
            return this.translations[game_data.locale][string];
        } else if (this.translations['pt_PT'] !== undefined && game_data.locale === 'pt_PT') {
            return this.translations['pt_PT'][string];
        } else {
            return this.translations['en_DK'][string];
        }
    },
    worldDataAPI: async function (entity) {
        const TIME_INTERVAL = 60 * 60 * 1000; // fetch data every hour
        const LAST_UPDATED_TIME = localStorage.getItem(`${entity}_last_updated`);
        const allowedEntities = ['village', 'player', 'ally', 'conquer'];
        if (!allowedEntities.includes(entity)) throw new Error(`Entity ${entity} does not exist!`);

        const worldData = {};
        const dbConfig = {
            village: { dbName: 'villagesDb', dbTable: 'villages', key: 'villageId', url: twSDK.worldDataVillages },
            player: { dbName: 'playersDb', dbTable: 'players', key: 'playerId', url: twSDK.worldDataPlayers },
            ally: { dbName: 'tribesDb', dbTable: 'tribes', key: 'tribeId', url: twSDK.worldDataTribes },
            conquer: { dbName: 'conquerDb', dbTable: 'conquer', key: '', url: twSDK.worldDataConquests },
        };

        const fetchDataAndSave = async () => {
            const DATA_URL = dbConfig[entity].url;
            try {
                const response = await jQuery.ajax(DATA_URL);
                const data = twSDK.csvToArray(response);
                let responseData = [];
                switch (entity) {
                    case 'player':
                        responseData = data.filter((item) => item[0] != '').map((item) => ({
                            playerId: parseInt(item[0]), playerName: twSDK.cleanString(item[1]), tribeId: parseInt(item[2]), villages: parseInt(item[3]), points: parseInt(item[4]), rank: parseInt(item[5]),
                        }));
                        break;
                    case 'ally':
                        responseData = data.filter((item) => item[0] != '').map((item) => ({
                            tribeId: parseInt(item[0]), tribeName: twSDK.cleanString(item[1]), tribeTag: twSDK.cleanString(item[2]), players: parseInt(item[3]), villages: parseInt(item[4]), points: parseInt(item[5]), allPoints: parseInt(item[6]), rank: parseInt(item[7]),
                        }));
                        break;
                    default:
                        return [];
                }
                saveToIndexedDbStorage(dbConfig[entity].dbName, dbConfig[entity].dbTable, dbConfig[entity].key, responseData);
                localStorage.setItem(`${entity}_last_updated`, Date.parse(new Date()));
                return responseData;
            } catch (error) {
                throw Error(`Error fetching ${DATA_URL}`);
            }
        };

        async function saveToIndexedDbStorage(dbName, table, keyId, data) {
            const dbConnect = indexedDB.open(dbName);
            dbConnect.onupgradeneeded = function () {
                const db = dbConnect.result;
                if (keyId.length) db.createObjectStore(table, { keyPath: keyId });
                else db.createObjectStore(table, { autoIncrement: true });
            };
            dbConnect.onsuccess = function () {
                const db = dbConnect.result;
                const transaction = db.transaction(table, 'readwrite');
                const store = transaction.objectStore(table);
                store.clear(); 
                data.forEach((item) => store.put(item));
            };
        }

        function getAllData(dbName, table) {
            return new Promise((resolve, reject) => {
                const dbConnect = indexedDB.open(dbName);
                dbConnect.onsuccess = () => {
                    const db = dbConnect.result;
                    const dbQuery = db.transaction(table, 'readwrite').objectStore(table).getAll();
                    dbQuery.onsuccess = (event) => resolve(event.target.result);
                    dbQuery.onerror = (event) => reject(event.target.error);
                };
                dbConnect.onerror = (event) => reject(event.target.error);
            });
        }

        function objectToArray(arrayOfObjects, entity) {
            switch (entity) {
                case 'player': return arrayOfObjects.map((item) => [item.playerId, item.playerName, item.tribeId, item.villages, item.points, item.rank]);
                case 'ally': return arrayOfObjects.map((item) => [item.tribeId, item.tribeName, item.tribeTag, item.players, item.villages, item.points, item.allPoints, item.rank]);
                default: return [];
            }
        }

        if (LAST_UPDATED_TIME !== null) {
            if (Date.parse(new Date()) >= parseInt(LAST_UPDATED_TIME) + TIME_INTERVAL) {
                worldData[entity] = await fetchDataAndSave();
            } else {
                worldData[entity] = await getAllData(dbConfig[entity].dbName, dbConfig[entity].dbTable);
            }
        } else {
            worldData[entity] = await fetchDataAndSave();
        }

        worldData[entity] = objectToArray(worldData[entity], entity);
        return worldData[entity];
    },

    init: async function (scriptConfig) {
        Object.assign(this, scriptConfig);
        twSDK._initDebug();
    },
};

(async function () {
    await twSDK.init(scriptConfig);
    const scriptInfo = twSDK.scriptInfo();
    const isValidScreen = twSDK.checkValidLocation('screen');
    const isValidMode = twSDK.checkValidLocation('mode');

    if (isValidScreen && isValidMode) {
        initMain();
    } else {
        UI.InfoMessage(twSDK.tt('Redirecting...'));
        twSDK.redirectTo('notes&mode=own');
    }

    async function initMain() {
        try {
            const { players, tribes } = await fetchWorldData();

            // Otimização: Criar Hash Maps (O(1)) para lookups ultrarrápidos em vez de múltiplos 'forEach'
            const playerMap = new Map();
            const playerTribeMap = new Map();
            players.forEach(p => {
                playerMap.set(twSDK.cleanString(p[1]).toLowerCase(), parseInt(p[0]));
                playerTribeMap.set(parseInt(p[0]), parseInt(p[2]));
            });

            const tribeMap = new Map();
            tribes.forEach(t => {
                tribeMap.set(twSDK.cleanString(t[2]).toLowerCase(), parseInt(t[0]));
            });

            buildUI({ players, tribes });
            handleSelectNotes({ playerMap, playerTribeMap, tribeMap });
            handleExpandNotes();
            handleResetFilters();
        } catch (error) {
            UI.ErrorMessage(twSDK.tt('There was an error!'));
            console.error(`${scriptInfo} Error:`, error);
        }
    }

    function handleSelectNotes(maps) {
        jQuery('#raSelectNotesBtn').on('click', function (e) {
            e.preventDefault();

            const { playersInput, tribesInput, excludedPlayersInput } = collectUserInput();

            if (playersInput.length === 0 && tribesInput.length === 0) {
                UI.ErrorMessage(twSDK.tt('You must select at least one player or one tribe!'));
                return;
            }

            const chosenPlayers = playersInput.split(',').map(s => s.trim().toLowerCase()).filter(s => s);
            const chosenTribes = tribesInput.split(',').map(s => s.trim().toLowerCase()).filter(s => s);
            const chosenExcluded = excludedPlayersInput.split(',').map(s => s.trim().toLowerCase()).filter(s => s);

            let uniquePlayersList = new Set();

            // Adiciona jogadores escolhidos (Lookup O(1))
            if(playersInput === twSDK.tt('--Barbarian--') || playersInput === '--Barbarian--') {
                uniquePlayersList.add(0);
            } else {
                chosenPlayers.forEach(pName => {
                    if (maps.playerMap.has(pName)) uniquePlayersList.add(maps.playerMap.get(pName));
                });
            }

            // Adiciona jogadores das tribos escolhidas (Lookup O(1) com map invertido)
            let chosenTribeIds = new Set();
            chosenTribes.forEach(tTag => {
                if (maps.tribeMap.has(tTag)) chosenTribeIds.add(maps.tribeMap.get(tTag));
            });
            
            if (chosenTribeIds.size > 0) {
                for (const [playerId, tribeId] of maps.playerTribeMap.entries()) {
                    if (chosenTribeIds.has(tribeId)) {
                        uniquePlayersList.add(playerId);
                    }
                }
            }

            // Remove excluídos
            chosenExcluded.forEach(pName => {
                if (maps.playerMap.has(pName)) uniquePlayersList.delete(maps.playerMap.get(pName));
            });

            let numberOfNotesSelected = 0;
            
            // Otimização: Batch DOM Manipulation (evita o lag massivo na interface de utilizador)
            let checkboxesToSelect = [];
            let checkboxesToUnselect = [];
            let rowsToShow = [];
            let rowsToHide = [];

            jQuery('form:eq(1) > table > tbody > tr').each(function () {
                if(jQuery(this).find('th').length > 0) return; // Ignora o cabeçalho

                const playerIdStr = jQuery(this).find('span.village_anchor').attr('data-player');
                if(!playerIdStr) return;
                
                const playerId = parseInt(playerIdStr);
                const checkbox = jQuery(this).find('td:eq(3) input[type="checkbox"]')[0];

                if (uniquePlayersList.has(playerId)) {
                    numberOfNotesSelected++;
                    if(checkbox) checkboxesToSelect.push(checkbox);
                    rowsToShow.push(this);
                } else {
                    if(checkbox) checkboxesToUnselect.push(checkbox);
                    rowsToHide.push(this);
                }
            });

            // Aplicar alterações ao DOM numa só passagem
            jQuery(checkboxesToSelect).prop('checked', true);
            jQuery(checkboxesToUnselect).prop('checked', false);
            jQuery(rowsToShow).removeClass('ra-hidden-row');
            jQuery(rowsToHide).addClass('ra-hidden-row');

            if (numberOfNotesSelected > 0) {
                UI.SuccessMessage(numberOfNotesSelected + ' ' + twSDK.tt('notes have been selected!'));
            } else {
                UI.ErrorMessage(twSDK.tt('No notes were selected!'));
            }
        });
    }

    // Otimização e nova Feature: Expandir os relatórios selecionados gradualmente para evitar rate limits
    function handleExpandNotes() {
        jQuery('#raExpandNotesBtn').on('click', function(e) {
            e.preventDefault();
            const checkedBoxes = jQuery('form:eq(1) > table > tbody > tr td:nth-child(4) input[type="checkbox"]:checked');
            
            if (checkedBoxes.length === 0) {
                UI.ErrorMessage(twSDK.tt('No notes were selected!'));
                return;
            }

            let delay = 0;
            checkedBoxes.each(function () {
                const row = jQuery(this).closest('tr');
                // O ícone da nota (a pequena imagem de relatório na primeira coluna) normalmente despoleta o evento de expandir
                const noteIcon = row.find('td:eq(0) a'); 
                
                if (noteIcon.length) {
                    setTimeout(() => {
                        noteIcon.click();
                    }, delay);
                    delay += twSDK.delayBetweenRequests || 200;
                }
            });

            UI.SuccessMessage(`A expandir notas (com ${twSDK.delayBetweenRequests}ms de intervalo) ...`);
        });
    }

    function handleResetFilters() {
        jQuery('#raResetNoteFiltersBtn').on('click', function (e) {
            e.preventDefault();
            jQuery('form:eq(1) > table > tbody > tr td:nth-child(4) input[type="checkbox"]').prop('checked', false);
            jQuery('form:eq(1) > table > tbody > tr').removeClass('ra-hidden-row');
            
            jQuery('#raPlayers').val('');
            jQuery('#raTribes').val('');
            jQuery('#raExcludedPlayers').val('');
        });
    }

    function buildUI(data) {
        const contentBody = prepareContent(data);
        const customStyle = `
                .ra-grid { display: grid; grid-template-columns: 1fr 1fr; grid-gap: 15px; }
                .ra-grid-3 { grid-template-columns: 1fr 1fr 1fr; }
                .ra-fieldset { border-color: #c1a264; border-width: 1px; }
                .ra-fieldset legend { font-weight: 600; padding: 0 10px; font-size: 13px; margin-bottom: 5px; }
                .ra-fieldset select { width: 100%; padding: 3px 5px; font-size: 14px; line-height: 1; }
                .ra-input { width: 100% !important; padding: 3px 5px; font-size: 14px; line-height: 1; text-align: left !important; }
                .note-content.note-opened { overflow-y: auto; }
                .ra-hidden-row { display: none !important; }
            `;
        twSDK.renderBoxWidget(contentBody, 'raOwnNotesManager', 'ra-own-notes-manager', customStyle);
    }

    function prepareContent(data) {
        const { players, tribes } = data;
        const sortedPlayersByRanking = players.sort((a, b) => a[5] - b[5]);
        const sortedTribesByRanking = tribes.sort((a, b) => a[7] - b[7]);

        const playersDropdown = buildDropDown(sortedPlayersByRanking, 'Players');
        const tribesDropdown = buildDropDown(sortedTribesByRanking, 'Tribes');
        const excludedPlayersDropdown = buildDropDown(sortedPlayersByRanking, 'ExcludedPlayers');

        return `
                <div class="ra-mb15">
                    <div class="ra-grid ra-mb15 ra-grid-3">
                        <fieldset class="ra-fieldset">
                            <legend>${twSDK.tt('Player')}</legend>
                            ${playersDropdown}
                        </fieldset>
                        <fieldset class="ra-fieldset">
                            <legend>${twSDK.tt('Tribe')}</legend>
                            ${tribesDropdown}
                        </fieldset>
                        <fieldset class="ra-fieldset">
                            <legend>${twSDK.tt('Excluded Players')}</legend>
                            ${excludedPlayersDropdown}
                        </fieldset>
                    </div>
                </div>
                <div>
                    <a href="javascript:void(0);" class="btn btn-confirm-yes" id="raSelectNotesBtn">
                        ${twSDK.tt('Select Notes')}
                    </a>
                    <a href="javascript:void(0);" class="btn" id="raExpandNotesBtn">
                        ${twSDK.tt('Expand Selected')}
                    </a>
                    <a href="javascript:void(0);" class="btn" id="raResetNoteFiltersBtn">
                        ${twSDK.tt('Reset')}
                    </a>
                </div>
            `;
    }

    function buildDropDown(array, entity) {
        let dropdown = `<input type="email" class="ra-input" multiple list="raSelect${entity}" placeholder="${twSDK.tt('Start typing and suggestions will show ...')}" id="ra${entity}"><datalist id="raSelect${entity}">`;
        if (entity === 'Players') dropdown += `<option value="${twSDK.tt('--Barbarian--')}">`;
        array.forEach((item) => {
            if (item[0].length !== 0) {
                if (entity === 'Tribes') dropdown += `<option value="${twSDK.cleanString(item[2])}">`;
                if (entity === 'Players' || entity === 'ExcludedPlayers') dropdown += `<option value="${twSDK.cleanString(item[1])}">`;
            }
        });
        dropdown += '</datalist>';
        return dropdown;
    }

    function collectUserInput() {
        return {
            playersInput: jQuery('#raPlayers').val(),
            tribesInput: jQuery('#raTribes').val(),
            excludedPlayersInput: jQuery('#raExcludedPlayers').val(),
        };
    }

    async function fetchWorldData() {
        try {
            const players = await twSDK.worldDataAPI('player');
            const tribes = await twSDK.worldDataAPI('ally');
            return { players, tribes };
        } catch (error) {
            UI.ErrorMessage(error);
            console.error(`${scriptInfo} Error:`, error);
        }
    }
})();
