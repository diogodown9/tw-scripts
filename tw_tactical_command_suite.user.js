// ==UserScript==
// @name         TW Tactical Command Suite
// @namespace    https://tribalwars.com.pt/
// @version      2.8.7
// @description  Suite militar avançada para Tribal Wars PT: Rastreio de Nobres a Caminho & em Retorno de Comandos + Treino na Academia, Calculadora de Horário Mínimo de Ataque (⚡ com 5m folga e seleção do Nuke Full mais perto), Suporte Automático a Modelos NT (NT 33% para 3 nobres, NT 25% para 4 nobres), Fakes Inteligentes 1% Dinâmico, Arsenal Tático de Fakes, UI de Limpezas/Nobres/Demolição, e Planeador Tático.
// @author       Diogo & Antigravity
// @match        https://*.tribalwars.com.pt/game.php*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tribalwars.com.pt
// @updateURL    https://raw.githubusercontent.com/diogodown9/tw-scripts/main/tw_tactical_command_suite.user.js
// @downloadURL  https://raw.githubusercontent.com/diogodown9/tw-scripts/main/tw_tactical_command_suite.user.js
// @grant        none
// ==/UserScript==

(async function () {
    const SCRIPT_VERSION = '2.8.7';

    // Auto-selecionar alvo de catapulta na confirmação de ataque na Praça de Reunião se especificado no URL
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const targetBld = urlParams.get('target_building');
        if (targetBld && targetBld !== 'none') {
            const applyCatSelect = () => {
                const sel = document.querySelector('select[name="building"]');
                if (sel && sel.value !== targetBld) {
                    sel.value = targetBld;
                    sel.dispatchEvent(new Event('change', { bubbles: true }));
                }
            };
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', applyCatSelect);
            } else {
                applyCatSelect();
            }
            setTimeout(applyCatSelect, 250);
        }
    } catch (_) {}

    function formatBuildingName(b) {
        if (!b || b === 'none') return '';
        const map = {
            place: 'Praça',
            wall: 'Muralha',
            farm: 'Fazenda',
            smith: 'Ferreiro',
            main: 'Ed. Principal',
            barracks: 'Quartel',
            stable: 'Estábulo',
            garage: 'Oficina',
            snob: 'Academia',
            storage: 'Armazém',
            market: 'Mercado'
        };
        return map[b] || b;
    }
    const modalId = 'tw-master-suite';
    
    // Limpeza de instâncias anteriores
    if (document.getElementById(modalId)) document.getElementById(modalId).remove();
    if (document.getElementById(`${modalId}-backdrop`)) document.getElementById(`${modalId}-backdrop`).remove();
    if (document.getElementById(`${modalId}-style`)) document.getElementById(`${modalId}-style`).remove();
    if (document.getElementById(`${modalId}-tooltip`)) document.getElementById(`${modalId}-tooltip`).remove();
    if (document.getElementById(`${modalId}-toast`)) document.getElementById(`${modalId}-toast`).remove();
    if (document.getElementById('tw-map-iframe-modal')) document.getElementById('tw-map-iframe-modal').remove();
    if (document.getElementById('tw-memory-modal')) document.getElementById('tw-memory-modal').remove();

    const style = document.createElement('style');
    style.id = `${modalId}-style`;
    style.innerHTML = `
        /* THEME: OBSIDIAN MILITARY COMMAND CENTER */
        #${modalId}-backdrop { position: fixed; inset: 0; background: rgba(2, 6, 23, 0.88); z-index: 99998; backdrop-filter: blur(8px); }
        #${modalId} {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 98vw; max-width: 1580px; height: 95vh; max-height: 980px;
            background: linear-gradient(180deg, #0b1120 0%, #030712 100%);
            color: #f8fafc; border: 1px solid #1e293b; border-radius: 14px;
            z-index: 99999; padding: 12px 16px;
            box-shadow: 0 25px 70px -10px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(56, 189, 248, 0.15);
            display: flex; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            box-sizing: border-box;
        }
        
        .tw-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 10px; margin-bottom: 8px; }
        .tw-title { font-size: 15px; font-weight: 800; color: #38bdf8; display: flex; align-items: center; gap: 8px; letter-spacing: -0.01em; }
        .tw-header-actions { display: flex; align-items: center; gap: 10px; }
        .tw-close { cursor: pointer; color: #64748b; font-size: 24px; line-height: 1; border-radius: 6px; padding: 2px 8px; transition: 0.15s; }
        .tw-close:hover { color: #f43f5e; background: rgba(244, 63, 94, 0.15); }

        .tw-tabs { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 8px; margin-bottom: 10px; }
        .tw-tab-group { display: flex; gap: 6px; background: #020617; padding: 4px; border-radius: 8px; border: 1px solid #1e293b; }
        .tw-tab { background: transparent; border: none; color: #94a3b8; padding: 6px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px; transition: 0.15s; }
        .tw-tab.active { background: #1e293b; color: #38bdf8; box-shadow: 0 2px 4px rgba(0,0,0,0.5); }
        .tw-tab-special.active { background: #451a03; color: #fbbf24; border: 1px solid #d97706; }
        .tw-tab:hover:not(.active) { color: #f8fafc; background: rgba(255,255,255,0.04); }

        .tw-pane { display: none; flex-direction: column; flex-grow: 1; overflow: hidden; }
        .tw-pane.active { display: flex; }

        /* KPI HUD CARDS */
        .tw-kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 8px; }
        .tw-kpi-card { background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 8px 12px; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden; }
        .tw-kpi-card::after { content: ''; position: absolute; top: 0; left: 0; width: 3px; height: 100%; }
        .tw-kpi-blue::after { background: #38bdf8; }
        .tw-kpi-red::after { background: #f43f5e; }
        .tw-kpi-green::after { background: #10b981; }
        .tw-kpi-gold::after { background: #f59e0b; }
        .tw-kpi-purple::after { background: #a855f7; }
        .tw-kpi-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; display: flex; justify-content: space-between; }
        .tw-kpi-value { font-size: 18px; font-weight: 800; color: #f8fafc; margin-top: 2px; }
        .tw-kpi-sub { font-size: 11px; color: #64748b; margin-top: 2px; }

        /* PILLS & CONTROLS */
        .tw-pill-group { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
        .tw-pill { background: #0f172a; border: 1px solid #1e293b; color: #94a3b8; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; cursor: pointer; transition: 0.15s; }
        .tw-pill:hover { color: #f8fafc; border-color: #38bdf8; }
        .tw-pill.active { background: #0284c7; border-color: #38bdf8; color: #fff; box-shadow: 0 0 10px rgba(56, 189, 248, 0.3); }

        /* CARDS & INPUTS */
        .tw-card { background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; }
        .tw-card-title { font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; display: flex; justify-content: space-between; align-items: center; }
        
        .tw-input, .tw-select { background: #020617; border: 1px solid #334155; color: #f8fafc; padding: 6px 8px; border-radius: 5px; font-size: 12px; outline: none; transition: 0.15s; box-sizing: border-box; }
        .tw-input:focus, .tw-select:focus { border-color: #38bdf8; box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.15); }
        .tw-textarea { width: 100%; background: #020617; border: 1px solid #334155; color: #38bdf8; font-family: ui-monospace, monospace; font-size: 11px; padding: 8px; border-radius: 6px; box-sizing: border-box; resize: none; outline: none; }

        /* BUTTONS */
        .tw-btn { background: #1e293b; color: #f8fafc; border: 1px solid #334155; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; transition: 0.15s; display: inline-flex; align-items: center; gap: 6px; }
        .tw-btn:hover { background: #334155; border-color: #475569; }
        .tw-btn-blue { background: #0284c7; border-color: #0369a1; color: #fff; }
        .tw-btn-blue:hover { background: #0369a1; }
        .tw-btn-gold { background: #b45309; border-color: #d97706; color: #fff; font-weight: bold; }
        .tw-btn-gold:hover { background: #d97706; }
        .tw-btn-green { background: #059669; border-color: #10b981; color: #fff; }
        .tw-btn-green:hover { background: #10b981; }
        .tw-btn-purple { background: #6b21a8; border-color: #7e22ce; color: #fff; }
        .tw-btn-purple:hover { background: #7e22ce; }
        .tw-btn-danger { background: #991b1b; border-color: #b91c1c; color: #fff; }
        .tw-btn-danger:hover { background: #b91c1c; }

        /* TABLE & PANEL */
        .tw-panel { overflow-y: auto; flex-grow: 1; border: 1px solid #1e293b; border-radius: 8px; background: #020617; }
        .tw-panel::-webkit-scrollbar { width: 8px; height: 8px; }
        .tw-panel::-webkit-scrollbar-track { background: #0f172a; border-radius: 4px; }
        .tw-panel::-webkit-scrollbar-thumb { background: #0284c7; border-radius: 4px; }
        .tw-panel::-webkit-scrollbar-thumb:hover { background: #38bdf8; }

        .tw-pane::-webkit-scrollbar { width: 8px; }
        .tw-pane::-webkit-scrollbar-track { background: #0f172a; border-radius: 4px; }
        .tw-pane::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; }
        .tw-pane::-webkit-scrollbar-thumb:hover { background: #38bdf8; }

        .tw-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .tw-table th, .tw-table td { padding: 6px 8px; border-bottom: 1px solid #1e293b; text-align: center; white-space: nowrap; }
        .tw-table th { background: #0f172a !important; position: sticky; top: 0; color: #94a3b8 !important; font-size: 11px; text-transform: uppercase; font-weight: 700; cursor: pointer; user-select: none; z-index: 10; }
        .tw-table th:hover { color: #38bdf8 !important; background: #1e293b !important; }
        .tw-table tbody tr:hover { background: rgba(56, 189, 248, 0.04); }
        .tw-row-off { background: rgba(244, 63, 94, 0.06) !important; }
        .tw-row-def { background: rgba(56, 189, 248, 0.06) !important; }

        /* PROGRESS BAR IN TABLE */
        .tw-farm-bar-bg { width: 100%; height: 5px; background: #1e293b; border-radius: 3px; overflow: hidden; margin-top: 3px; }
        .tw-farm-bar-fill { height: 100%; border-radius: 3px; }

        /* BADGES */
        .tw-tag-train4 { background: #78350f; color: #fde68a; border: 1px solid #f59e0b; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; box-shadow: 0 0 6px rgba(245, 158, 11, 0.4); }
        .tw-tag-train4-rec { background: #451a03; color: #fed7aa; border: 1px dashed #f59e0b; padding: 2px 6px; border-radius: 4px; font-size: 10px; }
        .tw-tag-train2 { background: #451a03; color: #fed7aa; border: 1px solid #d97706; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
        .tw-tag-snob1 { background: #292524; color: #fef08a; border: 1px solid #a8a29e; padding: 2px 6px; border-radius: 4px; font-size: 10px; }
        .tw-tag-nuke-full { background: #7f1d1d; color: #fca5a5; border: 1px solid #ef4444; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; box-shadow: 0 0 6px rgba(239, 68, 68, 0.4); }
        .tw-tag-nuke-semi { background: #431407; color: #fdba74; border: 1px solid #f97316; padding: 2px 6px; border-radius: 4px; font-size: 10px; }
        .tw-tag-bunk-full { background: #064e3b; color: #a7f3d0; border: 1px solid #10b981; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; box-shadow: 0 0 6px rgba(16, 185, 129, 0.4); }
        .tw-tag-bunk-semi { background: #082f49; color: #bae6fd; border: 1px solid #0ea5e9; padding: 2px 6px; border-radius: 4px; font-size: 10px; }
        .tw-tag-growth { background: #1e293b; color: #94a3b8; border: 1px solid #334155; padding: 2px 6px; border-radius: 4px; font-size: 10px; }

        .tw-badge-muralha { background: #831843; color: #fbcfe8; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; border: 1px solid #db2777; }
        .tw-badge-praca { background: #581c87; color: #e9d5ff; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; border: 1px solid #a855f7; }
        .tw-badge-nuke { background: #7f1d1d; color: #fca5a5; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; border: 1px solid #ef4444; }
        .tw-badge-snob { background: #78350f; color: #fde68a; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; border: 1px solid #f59e0b; }
        .tw-badge-anti { background: #1e3a8a; color: #93c5fd; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; border: 1px solid #3b82f6; }
        .tw-badge-bunker { background: #065f46; color: #a7f3d0; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; border: 1px solid #10b981; }
        .tw-badge-paladino { background: #134e4a; color: #5eead4; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; border: 1px solid #14b8a6; box-shadow: 0 0 6px rgba(20, 184, 166, 0.4); }
        .tw-badge-warn { background: #78350f; color: #fed7aa; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; border: 1px solid #f97316; }
        .tw-badge-reserved { background: #312e81; color: #c7d2fe; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; border: 1px solid #6366f1; }

        #${modalId}-tooltip {
            position: fixed; z-index: 10000000; background: #020617; border: 1px solid #38bdf8;
            border-radius: 8px; padding: 10px 14px; pointer-events: none; opacity: 0;
            box-shadow: 0 12px 35px rgba(0,0,0,0.9); transition: opacity 0.12s ease; font-size: 12px; min-width: 220px;
            color: #f8fafc; display: none;
        }
        #${modalId}-tooltip.show { opacity: 1; display: block; }
        
        #${modalId}-toast {
            position: fixed; bottom: 24px; right: 24px; z-index: 100000000;
            background: #0f172a; border: 1px solid #34d399; color: #34d399;
            padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: bold;
            box-shadow: 0 10px 30px rgba(0,0,0,0.8); display: none; opacity: 0; transition: opacity 0.2s ease;
        }
        #${modalId}-toast.show { display: block; opacity: 1; }

        .tw-spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.2); border-radius: 50%; border-top-color: #38bdf8; animation: twSpin 0.7s linear infinite; }
        @keyframes twSpin { to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);

    const backdrop = document.createElement('div');
    backdrop.id = `${modalId}-backdrop`;
    document.body.appendChild(backdrop);

    const ui = document.createElement('div');
    ui.id = modalId;
    ui.innerHTML = `
        <div class="tw-header">
            <div class="tw-title" id="tw-title-text"><div class="tw-spinner"></div> A calibrar dados táticos do império...</div>
            <div class="tw-header-actions">
                <button class="tw-btn tw-btn-purple" id="tw-btn-memory-mgmt" style="padding:4px 10px; font-size:11px;" title="Ver e gerir aldeias com agendamentos reservados">
                    🔒 Reservadas: <span id="tw-mem-count-badge" style="font-weight:bold; color:#fde047;">0</span>
                </button>
                <span class="tw-close" id="tw-btn-close">&times;</span>
            </div>
        </div>
        <div class="tw-tabs" id="tw-tabs-container" style="display:none;">
            <div class="tw-tab-group">
                <button class="tw-tab active" id="tab-btn-overview">📊 Visão Geral</button>
                <button class="tw-tab" id="tab-btn-counter">⚔️ Contador Tático</button>
                <button class="tw-tab" id="tab-btn-fakes">🎭 Fakes & Mascaramento</button>
                <button class="tw-tab tw-tab-special" id="tab-btn-nt">👑 Planeador de Ataques</button>
            </div>
        </div>
        <div id="tw-main-body" style="flex-grow:1; display:flex; flex-direction:column; overflow:hidden;"></div>
    `;
    document.body.appendChild(ui);
    const closeBtn = document.getElementById('tw-btn-close');
    if (closeBtn) closeBtn.onclick = closeSuite;
    if (backdrop) backdrop.onclick = closeSuite;

    const tooltip = document.createElement('div');
    tooltip.id = `${modalId}-tooltip`;
    document.body.appendChild(tooltip);

    const toast = document.createElement('div');
    toast.id = `${modalId}-toast`;
    document.body.appendChild(toast);

    function showToast(msg) {
        toast.innerText = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
    }

    // ==========================================
    // SISTEMA DE MEMÓRIA & RESERVAS INTELIGENTES
    // ==========================================
    const MEMORY_STORAGE_KEY = 'tw_committed_schedules_v2';

    function getCommittedSchedules() {
        try {
            const raw = localStorage.getItem(MEMORY_STORAGE_KEY);
            if (!raw) return {};
            const list = JSON.parse(raw);
            const now = Date.now();
            const clean = {};
            for (const [vId, entry] of Object.entries(list)) {
                if (entry.expiresAt && entry.expiresAt > now) {
                    clean[vId] = entry;
                }
            }
            return clean;
        } catch (e) {
            return {};
        }
    }

    function saveCommittedSchedules(data) {
        try {
            localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(data));
            updateMemoryHUD();
        } catch (e) {}
    }

    function commitVillages(commands, durationMs = 3600000, targetCoord = '') {
        const current = getCommittedSchedules();
        const now = Date.now();
        const expiresAt = now + durationMs;
        let count = 0;

        commands.forEach(cmd => {
            if (!cmd.originId) return;
            const existing = current[cmd.originId];
            
            let snobsInCmd = 0;
            if (cmd.type.includes('Bate e Volta')) {
                snobsInCmd = (existing && existing.snobsCommitted) ? 0 : 1;
            } else {
                const match = cmd.type.match(/(\d+)\s*Nobres?/i) || (cmd.info && cmd.info.match(/(\d+)\s*Nobres?/i)) || cmd.type.match(/\((\d+)N\)/i);
                if (match) {
                    snobsInCmd = parseInt(match[1], 10) || 1;
                } else if (cmd.type.includes('Nobre') || cmd.type.includes('NT')) {
                    snobsInCmd = 1;
                }
            }

            current[cmd.originId] = {
                villageId: cmd.originId,
                name: cmd.originName || (villagesById[cmd.originId] ? villagesById[cmd.originId].name : 'Aldeia'),
                coords: cmd.originCoords || (villagesById[cmd.originId] ? villagesById[cmd.originId].coords : ''),
                targetCoords: cmd.targetCoords || targetCoord,
                model: cmd.model,
                type: cmd.type,
                actionType: cmd.actionType,
                committedAt: now,
                expiresAt: Math.max(expiresAt, (existing ? existing.expiresAt : 0), (cmd.landTime ? cmd.landTime.getTime() : expiresAt)),
                isOffenseCommitted: cmd.actionType === 'Attack' || cmd.type.includes('Nuke') || cmd.type.includes('Anti') || cmd.type.includes('NT'),
                isDefenseCommitted: cmd.actionType === 'Support' || cmd.type.includes('Bunker'),
                snobsCommitted: snobsInCmd + (existing ? (existing.snobsCommitted || 0) : 0)
            };
            count++;
        });

        saveCommittedSchedules(current);
        return count;
    }

    function releaseVillageCommitment(vId) {
        const current = getCommittedSchedules();
        if (current[vId]) {
            delete current[vId];
            saveCommittedSchedules(current);
            showToast('Aldeia libertada da memória!');
            if (activeTab === 'overview') renderOverview();
            else if (activeTab === 'counter') renderCounter();
        }
    }

    function clearAllCommitments() {
        localStorage.removeItem(MEMORY_STORAGE_KEY);
        updateMemoryHUD();
        showToast('Todas as reservas de aldeias foram limpas!');
        if (activeTab === 'overview') renderOverview();
        else if (activeTab === 'counter') renderCounter();
    }

    function updateMemoryHUD() {
        const comm = getCommittedSchedules();
        const count = Object.keys(comm).length;
        const badge = document.getElementById('tw-mem-count-badge');
        if (badge) badge.innerText = count;
    }

    function openMemoryModal() {
        if (document.getElementById('tw-memory-modal')) {
            document.getElementById('tw-memory-modal').remove();
            return;
        }

        const comm = getCommittedSchedules();
        const entries = Object.values(comm);

        const memModal = document.createElement('div');
        memModal.id = 'tw-memory-modal';
        memModal.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 750px; max-width: 95vw; max-height: 80vh;
            background: #090d16; border: 2px solid #7e22ce; border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.95);
            z-index: 100001; display: flex; flex-direction: column; overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #f8fafc;
        `;

        let rows = '';
        if (entries.length === 0) {
            rows = `<tr><td colspan="7" style="padding:30px; text-align:center; color:#64748b;">Nenhuma aldeia reservada no momento. Os agendamentos expiram automaticamente ou são limpos aqui.</td></tr>`;
        } else {
            entries.forEach((e, idx) => {
                const minLeft = Math.max(0, Math.ceil((e.expiresAt - Date.now()) / 60000));
                rows += `
                    <tr>
                        <td style="color:#94a3b8;">${idx+1}</td>
                        <td style="text-align:left; font-weight:bold; color:#38bdf8;">${e.name}</td>
                        <td style="font-weight:bold; color:#fbbf24;">${e.coords}</td>
                        <td style="color:#c084fc;">🎯 ${e.targetCoords}</td>
                        <td><span class="tw-badge-reserved">${e.type}</span></td>
                        <td><b style="color:#34d399;">${minLeft} min rest.</b></td>
                        <td><button class="tw-btn tw-btn-danger tw-btn-release-village" data-vid="${e.villageId}" style="padding:2px 6px; font-size:10px;">❌ Libertar</button></td>
                    </tr>
                `;
            });
        }

        memModal.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 16px; background:#0f172a; border-bottom:1px solid #1e293b;">
                <div style="font-weight:bold; color:#c084fc; font-size:13px; display:flex; align-items:center; gap:6px;">
                    🔒 Gestor de Memória de Agendamentos (${entries.length} Aldeias Reservadas)
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                    <button class="tw-btn tw-btn-danger" id="tw-btn-clear-all-mem" style="padding:4px 10px; font-size:11px;">🗑️ Limpar Todas</button>
                    <span class="tw-close" id="tw-btn-close-mem" style="font-size:20px; cursor:pointer;">&times;</span>
                </div>
            </div>
            <div style="padding:10px; background:rgba(126, 34, 206, 0.1); font-size:11px; color:#e9d5ff; border-bottom:1px solid #1e293b;">
                💡 <b>Como funciona:</b> Aldeias reservadas não são recomendadas para novos ataques enquanto estiverem ativas, evitando gastar o mesmo nuke ou nobre em dois alvos ao mesmo tempo.
            </div>
            <div class="tw-panel" style="flex-grow:1; max-height:450px;">
                <table class="tw-table">
                    <thead>
                        <tr>
                            <th style="width:30px;">#</th>
                            <th style="text-align:left; padding-left:10px;">Aldeia</th>
                            <th style="width:80px;">Coord</th>
                            <th style="width:90px;">Alvo</th>
                            <th style="width:140px;">Comando</th>
                            <th style="width:100px;">Expiração</th>
                            <th style="width:70px;">Ação</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
        document.body.appendChild(memModal);

        document.getElementById('tw-btn-close-mem').onclick = () => memModal.remove();
        document.getElementById('tw-btn-clear-all-mem').onclick = () => {
            clearAllCommitments();
            memModal.remove();
        };

        memModal.querySelectorAll('.tw-btn-release-village').forEach(btn => {
            btn.onclick = function() {
                const vid = this.getAttribute('data-vid');
                releaseVillageCommitment(vid);
                memModal.remove();
                openMemoryModal();
            };
        });
    }

    const memMgmtBtn = document.getElementById('tw-btn-memory-mgmt');
    if (memMgmtBtn) memMgmtBtn.onclick = openMemoryModal;

    // ==========================================
    // VARIÁVEIS DE ESTADO E VELOCIDADES
    // ==========================================
    let allVillages = [], villagesById = {}, unitConfigs = [];
    let currentPage = 1, totalPages = 1, itemsPerPage = 15;
    let activeTab = 'overview';
    let counterSummaryData = null;
    let overviewSearch = '';
    let overviewFilter = 'all';
    let sortColumn = null, sortAsc = false;
    let grabbedTargets = new Set();
    let mapInterval = null;
    let activeCounterCategory = null;
    let savedCounterTarget = '';
    let savedCounterUnit = 'ram';
    let lastGeneratedCommands = [];
    let lastGeneratedTarget = '';
    let plannerMode = 'single'; // 'single' ou 'multi'
    let allAccountPaladins = [];

    const STANDARD_RELOCATE_MS = (3 * 3600 + 31 * 60 + 45) * 1000;

    function parseKnightsFromHtml(html) {
        if (!html) return [];
        const match = html.match(/BuildingStatue\.receiveKnightsData\(\s*(?:\[\]|null|\{\})\s*,\s*(\{[\s\S]*?\})\s*,\s*\d+\s*\);/);
        if (!match) return [];
        try {
            const rawJson = match[1];
            const data = JSON.parse(rawJson);
            const result = [];
            for (const kId in data) {
                const k = data[kId];
                if (!k || !k.id) continue;
                const offPts = (k.branch_investments || []).find(b => b.branch_name === 'Ofensivo')?.points || 0;
                const defPts = (k.branch_investments || []).find(b => b.branch_name === 'Defesa')?.points || 0;
                const isOff = offPts > defPts;
                result.push({
                    id: k.id,
                    name: k.name,
                    level: k.level,
                    homeVillageId: k.home_village ? String(k.home_village.id) : null,
                    homeCoords: k.home_village ? k.home_village.coord : null,
                    homeName: k.home_village ? k.home_village.name : null,
                    isOffense: isOff,
                    offPoints: offPts,
                    defPoints: defPts,
                    skills: k.skills || {},
                    activity: k.activity ? k.activity.type : 'home',
                    isHome: k.activity ? k.activity.type === 'home' : true
                });
            }
            return result;
        } catch (e) {
            console.warn('[TW Suite] Erro ao analisar dados do Paladino:', e);
            return [];
        }
    }

    const PT114_TIME_MODIFIER = 58.8227 / 60;
    const unitSpeedMinutes = { 
        spy: 9 * PT114_TIME_MODIFIER, 
        light: 10 * PT114_TIME_MODIFIER, 
        heavy: 11 * PT114_TIME_MODIFIER, 
        axe: 18 * PT114_TIME_MODIFIER, 
        sword: 22 * PT114_TIME_MODIFIER, 
        spear: 18 * PT114_TIME_MODIFIER, 
        archer: 18 * PT114_TIME_MODIFIER, 
        marcher: 10 * PT114_TIME_MODIFIER, 
        ram: 30 * PT114_TIME_MODIFIER, 
        catapult: 30 * PT114_TIME_MODIFIER, 
        knight: 10 * PT114_TIME_MODIFIER, 
        snob: 35 * PT114_TIME_MODIFIER 
    };
    const defaultUnitPop = { spear: 1, sword: 1, axe: 1, archer: 1, spy: 2, light: 4, marcher: 5, heavy: 6, ram: 5, catapult: 8, knight: 10, snob: 100, militia: 0 };

    const outputCategories = {
        'Full Train (4N ≥22k)': { group: 'Nobres', desc: '👑 Full Train (4N + Faz. ≥22k)', test: (v) => (v.snobsTotal >= 4 || v.snobsHome >= 4) && v.farm.used >= 22000 },
        'Train 4N (Recrut. <22k)': { group: 'Nobres', desc: '👑 Train 4N (Faz. <22k)', test: (v) => (v.snobsTotal >= 4 || v.snobsHome >= 4) && v.farm.used < 22000 },
        'Split Train (2-3 Nobres)': { group: 'Nobres', desc: '👑 Split Train (2-3 Nobres)', test: (v) => { const n = Math.max(v.snobsTotal || 0, v.snobsHome || 0); return n >= 2 && n < 4; } },
        'Nobre Solitário': { group: 'Nobres', desc: '👑 1 Nobre Solitário', test: (v) => Math.max(v.snobsTotal || 0, v.snobsHome || 0) === 1 },
        'Full Nuke (OFF ≥22k)': { group: 'Ataque', desc: '⚔️ Full Nukes (Faz. ≥22k)', test: (v) => v.rowClass === 'tw-row-off' && v.farm.used >= 22000 },
        'Semi Nuke (OFF <22k)': { group: 'Ataque', desc: '⚔️ Semi Nukes (Faz. <22k)', test: (v) => v.rowClass === 'tw-row-off' && v.farm.used < 22000 },
        'Full Bunker (DEF ≥22k)': { group: 'Defesa', desc: '🛡️ Full Bunkers (Faz. ≥22k)', test: (v) => v.rowClass === 'tw-row-def' && v.farm.used >= 22000 },
        'Semi Bunker (DEF <22k)': { group: 'Defesa', desc: '🛡️ Semi Bunkers (Faz. <22k)', test: (v) => v.rowClass === 'tw-row-def' && v.farm.used < 22000 }
    };

    function calcDistance(coordA, coordB) {
        const [x1, y1] = coordA.split('|').map(Number);
        const [x2, y2] = coordB.split('|').map(Number);
        return Math.hypot(x2 - x1, y2 - y1);
    }
    function formatDuration(sec) {
        return `${String(Math.floor(sec/3600)).padStart(2,'0')}:${String(Math.floor((sec%3600)/60)).padStart(2,'0')}:${String(Math.floor(sec%60)).padStart(2,'0')}`;
    }
    function formatRussianDateTime(d) {
        const ms = String(d.getMilliseconds()).padStart(3, '0');
        return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}:${ms} ${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
    }

    function cleanVillageDisplayName(v) {
        if (!v) return '';
        const name = v.name || '';
        const coords = v.coords || '';
        if (coords && name.includes(coords)) return name;
        return coords ? `${name} (${coords})` : name;
    }

    // Resolução inteligente de modelos de fakes por escalões de 1%
    function resolveFakeModel(village, baseModelName, isSmartEnabled) {
        const base = (baseModelName || 'Fake').trim() || 'Fake';
        if (!isSmartEnabled) {
            return { model: base, tier: '', pts: (village && village.points) ? village.points : 0 };
        }
        let pts = (village && village.points) ? village.points : 0;
        if (!pts && village && worldVillages.length > 0) {
            const wv = worldVillages.find(v => v.id === village.id || v.coord === village.coords);
            if (wv && wv.points) pts = wv.points;
        }
        pts = pts || 10000;

        let tierSuffix = '115';
        if (pts <= 6000) tierSuffix = '60';
        else if (pts <= 9000) tierSuffix = '90';
        else if (pts <= 11500) tierSuffix = '115';
        else tierSuffix = '135';

        return {
            model: `${base}_${tierSuffix}`,
            tier: tierSuffix,
            pts
        };
    }

    let worldVillages = [];
    let worldVillagesLoaded = false;

    async function fetchWorldVillages() {
        if (worldVillagesLoaded) return;
        try {
            const res = await fetch('/map/village.txt');
            if (res.ok) {
                const text = await res.text();
                const lines = text.trim().split('\n');
                worldVillages = lines.map(line => {
                    const parts = line.split(',');
                    if (parts.length >= 6) {
                        return {
                            id: parts[0],
                            name: decodeURIComponent(parts[1] || '').replace(/\+/g, ' '),
                            x: parseInt(parts[2], 10),
                            y: parseInt(parts[3], 10),
                            playerId: parts[4] || '0',
                            points: parseInt(parts[5], 10) || 0,
                            coord: `${parts[2]}|${parts[3]}`
                        };
                    } else if (parts.length >= 4) {
                        return {
                            id: parts[0],
                            name: decodeURIComponent(parts[1] || '').replace(/\+/g, ' '),
                            x: parseInt(parts[2], 10),
                            y: parseInt(parts[3], 10),
                            playerId: parts[4] || '0',
                            points: 0,
                            coord: `${parts[2]}|${parts[3]}`
                        };
                    }
                    return null;
                }).filter(Boolean);
                worldVillagesLoaded = true;
            }
        } catch (e) {
            console.warn('[TW] Não foi possível carregar map/village.txt', e);
        }
    }

    function parseTimerSeconds(timerStr) {
        if (!timerStr) return 0;
        const parts = timerStr.trim().split(':').map(Number);
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        if (parts.length === 4) return parts[0] * 86400 + parts[1] * 3600 + parts[2] * 60 + parts[3];
        return 0;
    }

    function parseTwDateTime(str, serverTimeObj = new Date()) {
        if (!str) return null;
        str = str.trim().toLowerCase();
        const timeMatch = str.match(/(\d{1,2}):(\d{2}):(\d{2})/);
        if (!timeMatch) return null;
        const [, h, m, s] = timeMatch.map(Number);
        
        const d = new Date(serverTimeObj.getTime());
        d.setHours(h, m, s, 0);

        if (str.includes('amanhã') || str.includes('tomorrow')) {
            d.setDate(d.getDate() + 1);
        } else {
            const dateMatch = str.match(/(\d{1,2})\.(\d{1,2})\./) || str.match(/(\d{1,2})\/(\d{1,2})\//);
            if (dateMatch) {
                const day = parseInt(dateMatch[1], 10);
                const month = parseInt(dateMatch[2], 10) - 1;
                d.setDate(day);
                d.setMonth(month);
                if (d.getTime() < serverTimeObj.getTime() - 86400000) {
                    d.setFullYear(d.getFullYear() + 1);
                }
            }
        }
        return d.getTime();
    }

    function parseAcademyProduction(data, currentVillageId = null) {
        if (!data) return [];
        let html = data;
        if (typeof data === 'object') {
            html = data.dialog || data.response || data.html || JSON.stringify(data);
        } else if (typeof data === 'string' && data.trim().startsWith('{')) {
            try {
                const parsed = JSON.parse(data);
                html = parsed.dialog || parsed.response || parsed.html || data;
            } catch (e) {}
        }

        const prods = [];
        const rowMatches = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
        
        rowMatches.forEach(row => {
            // Ignorar cabeçalhos, ofertas premium, menus e linhas inactivas
            if (/<th/i.test(row)) return;
            if (/premium|oferta|modemenu|train_snob_cell|auto-minting/i.test(row)) return;
            if (!/nobre|snob|academia/i.test(row)) return;

            const vMatch = row.match(/village=(\d+)/);
            const vId = vMatch ? String(vMatch[1]) : (currentVillageId ? String(currentVillageId) : null);
            
            const coordsMatch = row.match(/(\d{3}\|\d{3})/);
            const coords = coordsMatch ? coordsMatch[1] : '';

            const timerMatch = row.match(/class="timer"[^>]*>([^<]+)<\/span>/i) || row.match(/timer">([^<]+)<\/span>/i);
            const timerStr = timerMatch ? timerMatch[1].trim() : '';
            const remainingSec = timerStr ? parseTimerSeconds(timerStr) : 0;

            const timeMatch = row.match(/(hoje|amanhã|[0-9\.]+)\s*às\s*(\d{1,2}:\d{2}:\d{2})/i);
            const completionStr = timeMatch ? timeMatch[0] : '';

            // Se não tiver temporizador nem hora de conclusão, não é uma fila ativa de treino
            if (!timerStr && !completionStr) return;

            const countMatch = row.match(/(\d+)\s*(?:x\s*)?Nobre/i) || row.match(/(\d+)\s*snob/i);
            const count = countMatch ? parseInt(countMatch[1], 10) : 1;

            const now = Date.now();
            // Priorizar a hora de conclusão do jogo (evita desvios por latência ou relógio local)
            const readyAtMs = completionStr ? (parseTwDateTime(completionStr) || (now + remainingSec * 1000)) : (now + remainingSec * 1000);

            for (let i = 0; i < count; i++) {
                prods.push({
                    villageId: vId,
                    coords,
                    type: 'production',
                    timerStr,
                    remainingSec,
                    completionStr,
                    readyAtMs
                });
            }
        });

        return prods;
    }

    function parseCommandsNobleReturns(html, fallbackVillageId = null, fallbackCoords = null) {
        if (!html) return [];
        const returns = [];
        const rowMatches = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];

        rowMatches.forEach(row => {
            const hasSnob = /snob/i.test(row) || /nobre/i.test(row);
            if (!hasSnob) return;
            if (/<th/i.test(row)) return;

            // Apenas comandos de regresso/retorno representam tropas que vão chegar a casa
            const isReturn = /return|retorno|regresso|cancel|cancelar/i.test(row) || /data-command-type="return"/i.test(row);
            if (!isReturn) return;

            const cmdIdMatch = row.match(/data-id="(\d+)"/) || row.match(/data-command-id="(\d+)"/) || row.match(/id=(\d+)/);
            const commandId = cmdIdMatch ? cmdIdMatch[1] : null;

            const vMatch = row.match(/village=(\d+)/);
            const vId = vMatch ? vMatch[1] : (fallbackVillageId ? String(fallbackVillageId) : null);

            const allCoords = Array.from(row.matchAll(/(\d{3}\|\d{3})/g)).map(m => m[1]);
            let homeCoords = fallbackCoords || '';
            let remoteCoords = '';

            if (allCoords.length === 1) {
                // Em #commands_outgoings na visão geral da aldeia, a linha diz p.ex. "Retorno de BARROCA CITY (337|453)"
                // A única coordenada listada é a aldeia remota atacada. O regresso é para a aldeia atual (fallbackCoords)!
                remoteCoords = allCoords[0];
                if (!homeCoords && fallbackCoords) homeCoords = fallbackCoords;
            } else if (allCoords.length >= 2) {
                // Na tabela de comandos globais: origem (col 2) é a aldeia de onde saíram as tropas e para onde voltam
                homeCoords = allCoords[0] || fallbackCoords || '';
                remoteCoords = allCoords[1] || '';
            }

            // Deteção do timestamp de chegada
            let readyAtMs = 0;
            const endtimeMatch = row.match(/data-endtime="(\d+)"/);
            if (endtimeMatch) {
                readyAtMs = parseInt(endtimeMatch[1], 10) * 1000;
            }

            const timerMatch = row.match(/class="(?:widget-command-)?timer"[^>]*>([^<]+)<\/span>/i) || row.match(/timer">([^<]+)<\/span>/i);
            const timerStr = timerMatch ? timerMatch[1].trim() : '';
            const remainingSec = timerStr ? parseTimerSeconds(timerStr) : 0;

            const timeMatch = row.match(/(hoje|amanhã|[0-9\.]+)\s*às\s*(\d{1,2}:\d{2}:\d{2})/i);
            const completionStr = timeMatch ? timeMatch[0] : '';

            if (!readyAtMs) {
                const now = Date.now();
                readyAtMs = remainingSec > 0 ? (now + remainingSec * 1000) : (parseTwDateTime(completionStr) || now);
            }

            if (readyAtMs > 0) {
                returns.push({
                    commandId,
                    villageId: vId,
                    coords: homeCoords,
                    remoteCoords,
                    type: 'return',
                    isReturn: true,
                    timerStr,
                    remainingSec,
                    completionStr: completionStr || (readyAtMs ? new Date(readyAtMs).toLocaleTimeString('pt-PT') : ''),
                    readyAtMs
                });
            }
        });

        return returns;
    }

    function calculateEarliestViableNobleTime(village, neededNobles) {
        if (!village) return { readyAtMs: Date.now(), isFullyReadyNow: true, hasShortage: false, summary: 'Nenhuma aldeia selecionada' };
        const readyNow = village.snobsHome || 0;
        const events = (village.noblePendingEvents || []).slice().sort((a, b) => a.readyAtMs - b.readyAtMs);
        const inProdCount = events.filter(e => e.type === 'production').length;
        const inReturnCount = events.filter(e => e.type === 'return').length;
        const availableTotal = readyNow + events.length;

        if (readyNow >= neededNobles) {
            return {
                readyAtMs: Date.now(),
                neededNobles,
                readyNow,
                availableTotal,
                isFullyReadyNow: true,
                hasShortage: false,
                summary: `${readyNow} Nobre(s) prontos na aldeia`
            };
        }

        const missing = neededNobles - readyNow;

        if (events.length >= missing) {
            const targetEvent = events[missing - 1];
            const timeLabel = targetEvent.completionStr || (targetEvent.timerStr ? `em ${targetEvent.timerStr}` : new Date(targetEvent.readyAtMs).toLocaleTimeString('pt-PT'));
            return {
                readyAtMs: targetEvent.readyAtMs,
                neededNobles,
                readyNow,
                availableTotal,
                isFullyReadyNow: false,
                hasShortage: false,
                waitingForCount: missing,
                targetEvent,
                inProdCount,
                inReturnCount,
                summary: `${readyNow} na aldeia, ${inProdCount > 0 ? inProdCount + ' em treino' : ''}${inProdCount > 0 && inReturnCount > 0 ? ', ' : ''}${inReturnCount > 0 ? inReturnCount + ' em viagem' : ''} (${neededNobles}º nobre disponível às ${timeLabel})`
            };
        }

        // Falta de nobres mesmo considerando todos os eventos em treino e viagem
        const lastMs = events.length > 0 ? events[events.length - 1].readyAtMs : Date.now();
        const missingTotal = neededNobles - availableTotal;
        return {
            readyAtMs: lastMs,
            neededNobles,
            readyNow,
            availableTotal,
            isFullyReadyNow: false,
            hasShortage: true,
            waitingForCount: missing,
            missingTotal,
            inProdCount,
            inReturnCount,
            summary: `Apenas ${availableTotal}/${neededNobles} nobres possíveis (${readyNow} em casa, ${inProdCount} em treino, ${inReturnCount} a caminho). Faltam ${missingTotal} nobres!`
        };
    }

    function getSortedOffVillages(target, excludedIds = []) {
        if (!/^\d{3}\|\d{3}$/.test(target)) return [];

        const excludeCommitted = document.getElementById('tw-nt-exclude-committed') ? document.getElementById('tw-nt-exclude-committed').checked : true;
        const committedMap = (typeof getCommittedSchedules === 'function') ? getCommittedSchedules() : {};

        let offPool = allVillages.filter(v => v.rowClass === 'tw-row-off' && !excludedIds.includes(v.id));
        if (excludeCommitted) {
            offPool = offPool.filter(v => !committedMap[v.id]);
        }

        const chkPreferFull = document.getElementById('tw-nt-prefer-full-nukes');
        const preferFull = chkPreferFull ? chkPreferFull.checked : true;
        const reqPaladinNuke = document.getElementById('tw-nt-req-paladin-nuke') ? document.getElementById('tw-nt-req-paladin-nuke').checked : true;
        const palChoice = document.getElementById('tw-nt-paladin-choice') ? document.getElementById('tw-nt-paladin-choice').value : 'auto';
        const ramSpeedMin = unitSpeedMinutes.ram || 30;

        return offPool.map(v => {
            const dist = calcDistance(v.coords, target);
            const sec = dist * ramSpeedMin * 60;
            const isComm = !!committedMap[v.id];
            const isFull = (v.farm && v.farm.used >= 20000) || (v.roleTag && v.roleTag.label && v.roleTag.label.includes('Full Nuke'));
            const pal = v.paladin;
            const hasKnight = pal ? pal.isHome : ((v.knightAvailable || (v.homeTroopsDict && v.homeTroopsDict.knight) || 0) >= 1);
            let hasMatchingPaladin = false;
            if (palChoice === 'auto') {
                hasMatchingPaladin = pal ? (pal.isOffense && pal.isHome) : hasKnight;
            } else {
                hasMatchingPaladin = pal ? (String(pal.id) === String(palChoice) && pal.isHome) : false;
            }
            const hasOffPaladin = pal ? (pal.isOffense && pal.isHome) : hasKnight;
            return {
                village: v,
                dist,
                sec,
                timeStr: formatDuration(sec),
                isComm,
                isFull,
                isFullNuke: isFull,
                hasKnight,
                hasOffPaladin,
                hasMatchingPaladin,
                paladin: pal,
                hasTroopsAway: v.hasTroopsAway
            };
        }).sort((a, b) => {
            // 1. Priorizar Full Nukes reais (Fazenda >= 20k) sobre Semi Nukes
            if (preferFull) {
                if (a.isFull && !b.isFull) return -1;
                if (!a.isFull && b.isFull) return 1;
            }
            // 2. Se a opção "Priorizar Paladino" estiver ativa, dar preferência ao Paladino
            // apenas se a diferença de distância for pequena (até 3 campos), para nunca escolher uma aldeia a 31c se houver a 5c!
            if (reqPaladinNuke) {
                const distDiff = Math.abs(a.dist - b.dist);
                if (distDiff <= 3) {
                    if (a.hasMatchingPaladin && !b.hasMatchingPaladin) return -1;
                    if (!a.hasMatchingPaladin && b.hasMatchingPaladin) return 1;
                }
            }
            // 3. Aldeias com tropas em casa sobre tropas fora (se distância muito próxima <= 1 campo)
            const distDiffReady = Math.abs(a.dist - b.dist);
            if (distDiffReady <= 1) {
                const aReady = !a.village.hasTroopsAway;
                const bReady = !b.village.hasTroopsAway;
                if (aReady && !bReady) return -1;
                if (!aReady && bReady) return 1;
            }
            // 4. Distância absoluta mais curta
            return a.dist - b.dist;
        });
    }

    function calculateEarliestViableLandTime() {
        const targetInput = (plannerMode === 'single') ? document.getElementById('tw-nt-target') : document.getElementById('tw-nt-targets-multi');
        let target = '';
        if (targetInput) {
            const matches = targetInput.value.match(/\d{3}\|\d{3}/g);
            if (matches && matches.length > 0) target = matches[0];
        }
        if (!/^\d{3}\|\d{3}$/.test(target)) {
            return null;
        }

        const selNoble = document.getElementById('tw-nt-noble-village');
        const nobleV = selNoble && villagesById[selNoble.value] ? villagesById[selNoble.value] : null;

        const rawNobleCount = document.getElementById('tw-nt-noble-count') ? document.getElementById('tw-nt-noble-count').value : '4';
        const neededNobles = parseInt(rawNobleCount, 10) || 4;

        const now = Date.now();
        const MARGIN_MS = 5 * 60 * 1000; // 5 minutos de margem de segurança para envio confortável
        let minViableLandMs = now + MARGIN_MS;
        const reasons = [];
        let hasShortage = false;
        const shortageReasons = [];

        const attackMode = document.getElementById('tw-nt-attack-mode') ? document.getElementById('tw-nt-attack-mode').value : 'standard_anti';
        const architecture = document.getElementById('tw-nt-architecture') ? document.getElementById('tw-nt-architecture').value : '';
        const bvAnchor = document.getElementById('tw-nt-bv-anchor') ? document.getElementById('tw-nt-bv-anchor').value : 'first';

        // 1. Aldeia de Nobres Principal
        if (nobleV && neededNobles > 0) {
            const dist = calcDistance(nobleV.coords, target);
            let travelSec = dist * unitSpeedMinutes.snob * 60;
            if (attackMode === 'snob_solo' && bvAnchor === 'final') {
                const numTrips = Math.max(1, neededNobles);
                travelSec = travelSec + (numTrips - 1) * (2 * travelSec + 2);
            }

            const needed1 = (architecture === 'split_2x2' && attackMode === 'split_2x2') ? 2 : (attackMode === 'snob_solo' ? 1 : neededNobles);
            const readiness = calculateEarliestViableNobleTime(nobleV, needed1);
            if (readiness.hasShortage) {
                hasShortage = true;
                shortageReasons.push(`${cleanVillageDisplayName(nobleV)}: ${readiness.summary}`);
            }
            const nobleReadyMs = (!readiness.isFullyReadyNow) ? readiness.readyAtMs : now;
            const minLaunchMs1 = Math.max(now, nobleReadyMs) + MARGIN_MS;
            const minLandMs1 = minLaunchMs1 + Math.round(travelSec * 1000);

            if (minLandMs1 > minViableLandMs) {
                minViableLandMs = minLandMs1;
                if (readiness.hasShortage) {
                    reasons.push(`❌ ${readiness.summary}`);
                } else if (!readiness.isFullyReadyNow) {
                    reasons.push(`Nobres: ${readiness.summary} (+5m folga)`);
                } else {
                    reasons.push(`Nobres: ${cleanVillageDisplayName(nobleV)} (${formatDuration(travelSec)} viagem + 5m folga)`);
                }
            }
        }

        // 2. Aldeia de Nobres Secundária (Split 2x2)
        const selNoble2 = document.getElementById('tw-nt-noble-village-2');
        if (architecture === 'split_2x2' && attackMode === 'split_2x2' && selNoble2 && villagesById[selNoble2.value]) {
            const nobleV2 = villagesById[selNoble2.value];
            const dist2 = calcDistance(nobleV2.coords, target);
            const travelSec2 = dist2 * unitSpeedMinutes.snob * 60;

            const readiness2 = calculateEarliestViableNobleTime(nobleV2, 2);
            if (readiness2.hasShortage) {
                hasShortage = true;
                shortageReasons.push(`${cleanVillageDisplayName(nobleV2)}: ${readiness2.summary}`);
            }
            const nobleReadyMs2 = (!readiness2.isFullyReadyNow) ? readiness2.readyAtMs : now;
            const minLaunchMs2 = Math.max(now, nobleReadyMs2) + MARGIN_MS;
            const minLandMs2 = minLaunchMs2 + Math.round(travelSec2 * 1000);

            if (minLandMs2 > minViableLandMs) {
                minViableLandMs = minLandMs2;
                if (readiness2.hasShortage) {
                    reasons.push(`❌ 2ª Aldeia: ${readiness2.summary}`);
                } else if (!readiness2.isFullyReadyNow) {
                    reasons.push(`2ª Aldeia Nobres: ${readiness2.summary} (+5m folga)`);
                } else {
                    reasons.push(`2ª Aldeia Nobres: ${cleanVillageDisplayName(nobleV2)} (${formatDuration(travelSec2)} viagem + 5m folga)`);
                }
            }
        }

        // 3. Nuke(s) de Limpeza Principal
        const selNuke = document.getElementById('tw-nt-lead-nuke-village');
        const leadNukesCount = parseInt(document.getElementById('tw-nt-lead-nukes')?.value || '0', 10);
        if (leadNukesCount > 0 && selNuke) {
            const excludedIds = [];
            if (nobleV) excludedIds.push(nobleV.id);
            if (selNoble2 && selNoble2.value) excludedIds.push(selNoble2.value);

            const sortedOff = getSortedOffVillages(target, excludedIds);
            let nukeItems = [];

            if (selNuke.value && selNuke.value !== 'auto' && villagesById[selNuke.value]) {
                const found = sortedOff.find(i => i.village.id === selNuke.value);
                if (found) {
                    nukeItems.push(found);
                } else {
                    const v = villagesById[selNuke.value];
                    const dist = calcDistance(v.coords, target);
                    nukeItems.push({ village: v, dist, sec: dist * (unitSpeedMinutes.ram || 30) * 60 });
                }
            } else if (sortedOff.length > 0) {
                nukeItems = sortedOff.slice(0, Math.min(leadNukesCount, sortedOff.length));
            }

            for (const item of nukeItems) {
                const nukeTravelSec = item.sec;
                const minLaunchNuke = now + MARGIN_MS;
                const minLandNuke = minLaunchNuke + Math.round(nukeTravelSec * 1000);

                if (minLandNuke > minViableLandMs) {
                    minViableLandMs = minLandNuke;
                    reasons.push(`Limpeza: ${cleanVillageDisplayName(item.village)} (${formatDuration(nukeTravelSec)} viagem + 5m folga)`);
                }
            }
        }

        const earliestLandMs = Math.ceil(minViableLandMs / 1000) * 1000;
        return {
            earliestLandDate: new Date(earliestLandMs),
            earliestLandMs,
            hasShortage,
            shortageReasons,
            reasons
        };
    }

    function applyMinimumViableLandTime() {
        const targetInput = (plannerMode === 'single') ? document.getElementById('tw-nt-target') : document.getElementById('tw-nt-targets-multi');
        let target = '';
        if (targetInput) {
            const matches = targetInput.value.match(/\d{3}\|\d{3}/g);
            if (matches && matches.length > 0) target = matches[0];
        }
        if (!/^\d{3}\|\d{3}$/.test(target)) {
            alert('Por favor insere primeiro uma coordenada de alvo válida (ex: 500|500).');
            return null;
        }

        const calc = calculateEarliestViableLandTime();
        if (!calc) return null;

        if (calc.hasShortage) {
            const shortMsg = calc.shortageReasons.length > 0 ? calc.shortageReasons.join('\n') : 'Não há nobres suficientes disponíveis nesta aldeia!';
            alert(`⚠️ ATENÇÃO: NOBRES INSUFICIENTES!\n\n${shortMsg}\n\nNão é possível agendar o ataque com essa quantidade de nobres sem recrutar novos nobres ou aguardar pelo regresso de tropas.`);
            return null;
        }

        const d = calc.earliestLandDate;
        const yr = d.getFullYear();
        const mo = String(d.getMonth() + 1).padStart(2, '0');
        const da = String(d.getDate()).padStart(2, '0');
        const ho = String(d.getHours()).padStart(2, '0');
        const mi = String(d.getMinutes()).padStart(2, '0');
        const se = String(d.getSeconds()).padStart(2, '0');

        const landInput = (plannerMode === 'single') ? document.getElementById('tw-nt-landtime') : document.getElementById('tw-nt-landtime-multi');
        if (landInput) {
            landInput.value = `${yr}-${mo}-${da}T${ho}:${mi}:${se}`;
        }

        const reasonTxt = calc.reasons.length > 0 ? ` (${calc.reasons.join('; ')})` : '';
        showToast(`⚡ Horário Mínimo ajustado: ${ho}:${mi}:${se} (${da}/${mo})${reasonTxt}`);
        return calc;
    }

    async function loadData() {
        fetchWorldVillages();
        try {
            const baseUrl = (typeof game_data !== 'undefined' && game_data.link_base_pure) ? game_data.link_base_pure : '/game.php?';
            const currentVId = (typeof game_data !== 'undefined' && game_data.village) ? game_data.village.id : null;
            const currentVCoords = (typeof game_data !== 'undefined' && game_data.village && game_data.village.coord) ? game_data.village.coord : '';
            const currentDocHtml = (typeof document !== 'undefined' && document.body) ? document.body.innerHTML : '';
            const currentHasCommands = currentDocHtml.includes('id="commands_outgoings"') || currentDocHtml.includes('class="command-row"');
            const villageOverviewUrl = (currentVId && !currentHasCommands)
                ? `/game.php?village=${currentVId}&screen=overview`
                : '';
            const statueUrl = currentVId
                ? `/game.php?village=${currentVId}&screen=statue&mode=overview`
                : (baseUrl.includes('screen=') ? baseUrl + 'statue&mode=overview' : baseUrl + 'screen=statue&mode=overview');

            const snobScreenUrl = currentVId
                ? `/game.php?village=${currentVId}&screen=snob`
                : (baseUrl.includes('screen=') ? baseUrl + 'snob' : baseUrl + 'screen=snob');
            const snobPopupUrl = currentVId
                ? `/game.php?village=${currentVId}&screen=snob&ajax=production_popup`
                : (baseUrl.includes('screen=') ? baseUrl + 'snob&ajax=production_popup' : baseUrl + 'screen=snob&ajax=production_popup');
            const snobTrainUrl = baseUrl.includes('screen=') ? baseUrl + 'snob&mode=train' : baseUrl + 'screen=snob&mode=train';
            const commandsUrl = baseUrl + 'overview_villages&mode=commands&type=all&group=0&page=-1';

            const [rU, rP, rS, rSnobDirect, rSnobPopup, rSnobTrain, rCommands, rVillageOverview] = await Promise.all([
                fetch(baseUrl + 'overview_villages&mode=units&type=complete&group=0&page=-1').then(r => r.text()),
                fetch(baseUrl + 'overview_villages&mode=prod&group=0&page=-1').then(r => r.text()),
                fetch(statueUrl).then(r => r.text()).catch(() => ''),
                fetch(snobScreenUrl).then(r => r.text()).catch(() => ''),
                fetch(snobPopupUrl, { headers: { 'X-Requested-With': 'XMLHttpRequest' } }).then(r => r.text()).catch(() => ''),
                fetch(snobTrainUrl).then(r => r.text()).catch(() => ''),
                fetch(commandsUrl).then(r => r.text()).catch(() => ''),
                villageOverviewUrl ? fetch(villageOverviewUrl).then(r => r.text()).catch(() => '') : Promise.resolve('')
            ]);

            // Deteção de Nobres em Treino na Academia (DOM da página atual + página snob direta + popup + train)
            const allSnobProductions = [];
            const addSnobProds = (list) => {
                list.forEach(p => {
                    const pVId = String(p.villageId || '');
                    if (!allSnobProductions.some(existing => {
                        const exVId = String(existing.villageId || '');
                        const matchVillage = (exVId && pVId && exVId === pVId) || (existing.coords && p.coords && existing.coords === p.coords);
                        return matchVillage && Math.abs(existing.readyAtMs - p.readyAtMs) < 30000;
                    })) {
                        allSnobProductions.push(p);
                    }
                });
            };

            addSnobProds(parseAcademyProduction(rSnobDirect, currentVId));
            addSnobProds(parseAcademyProduction(rSnobPopup, currentVId));
            addSnobProds(parseAcademyProduction(rSnobTrain, currentVId));
            // Apenas recorre ao DOM do documento atual se ainda não encontramos produção direta para a aldeia atual
            if (currentVId && !allSnobProductions.some(p => String(p.villageId) === String(currentVId))) {
                addSnobProds(parseAcademyProduction(currentDocHtml, currentVId));
            }

            // Deteção de Nobres em Viagem / Comandos de Retorno
            const allNobleReturns = [];
            const addNobleReturns = (list) => {
                list.forEach(ret => {
                    const isDup = allNobleReturns.some(e => {
                        if (e.commandId && ret.commandId) {
                            return String(e.commandId) === String(ret.commandId);
                        }
                        const matchV = (e.villageId && ret.villageId && String(e.villageId) === String(ret.villageId)) || (e.coords && ret.coords && e.coords === ret.coords);
                        return matchV && Math.abs(e.readyAtMs - ret.readyAtMs) < 2000 && e.remoteCoords === ret.remoteCoords;
                    });
                    if (!isDup) {
                        allNobleReturns.push(ret);
                    }
                });
            };

            // 1. Deteção na página atual (se for overview ou place tem os comandos da aldeia)
            addNobleReturns(parseCommandsNobleReturns(currentDocHtml, currentVId, currentVCoords));

            // 2. Deteção na visão geral da aldeia obtida em background (se carregada)
            if (rVillageOverview) {
                addNobleReturns(parseCommandsNobleReturns(rVillageOverview, currentVId, currentVCoords));
            }

            // 3. Deteção na visão global de comandos
            if (rCommands) {
                addNobleReturns(parseCommandsNobleReturns(rCommands, currentVId, currentVCoords));
            }

            const allPendingNobleEvents = [...allSnobProductions, ...allNobleReturns];

            allAccountPaladins = parseKnightsFromHtml(rS);
            const paladinByVillage = {};
            allAccountPaladins.forEach(p => {
                if (p.homeVillageId) {
                    paladinByVillage[p.homeVillageId] = p;
                }
            });

            const parser = new DOMParser();
            const dU = parser.parseFromString(rU, 'text/html');
            const dP = parser.parseFromString(rP, 'text/html');

            const farmMap = {};
            const villagePointsMap = {};
            const prodThs = Array.from(dP.querySelectorAll('#production_table thead th'));
            const ptsHeaderIndex = prodThs.findIndex(th => /ponto|point|punkt/i.test(th.textContent.trim()));

            dP.querySelectorAll('#production_table tbody tr').forEach(tr => {
                const a = tr.querySelector('a[href*="village="]');
                if (!a) return;
                const vId = (a.href.match(/village=(\d+)/) || [])[1];
                if (!vId) return;

                const tds = Array.from(tr.querySelectorAll('td'));
                if (ptsHeaderIndex !== -1 && tds[ptsHeaderIndex]) {
                    const pts = parseInt(tds[ptsHeaderIndex].textContent.replace(/\./g, '').trim(), 10);
                    if (!isNaN(pts) && pts > 0) villagePointsMap[vId] = pts;
                }

                tds.forEach(td => {
                    const txt = td.textContent.trim();
                    if (/^\d+\/\d+$/.test(txt) && !td.querySelector('a')) {
                        const [p, m] = txt.split('/').map(Number);
                        const perc = parseFloat(((p / m) * 100).toFixed(1));
                        farmMap[vId] = { txt, used: p, max: m, perc, lvl: Math.ceil(m/800), color: p >= 22000 ? '#f43f5e' : p >= 18000 ? '#f59e0b' : '#10b981' };
                    } else if (!villagePointsMap[vId] && /^\d{1,2}\.?\d{3}$/.test(txt) && !td.querySelector('a') && !td.querySelector('span')) {
                        const pts = parseInt(txt.replace(/\./g, ''), 10);
                        if (!isNaN(pts) && pts > 100 && pts < 20000) {
                            villagePointsMap[vId] = pts;
                        }
                    }
                });
            });

            const uTable = dU.querySelector('#units_table');
            if (!uTable) throw new Error("Tabela de tropas não encontrada (requer Conta Premium).");

            const headers = Array.from(uTable.querySelectorAll('thead th')).filter(th => th.querySelector('img[src*="unit_"]'));
            unitConfigs = headers.map(th => {
                const img = th.querySelector('img');
                return { name: (img.src.match(/unit_([a-z0-9_]+)/i)||[])[1]||'', src: img.src, isHidden: th.classList.contains('hidden') || img.src.includes('militia') };
            });

            const summary = { totalPop: 0, units: {}, categories: {}, offCount: 0, defCount: 0, snobCount: 0, fullTrain22kCount: 0, semiTrainCount: 0, fullNuke22kCount: 0, fullBunk22kCount: 0 };
            unitConfigs.forEach(u => { if(u.name) summary.units[u.name] = { count: 0, pop: 0, src: u.src }; });
            Object.keys(outputCategories).forEach(cat => summary.categories[cat] = { count: 0, coords: [], villageIds: [] });

            Array.from(uTable.querySelectorAll('tbody')).forEach(tb => {
                const a = tb.querySelector('a[href*="village="]');
                if (!a) return;
                const vId = (a.href.match(/village=(\d+)/)||[])[1];
                if (!vId) return;
                const vName = (tb.querySelector('.quickedit-label') || a).textContent.trim();
                const coords = (vName.match(/(\d{3}\|\d{3})/)||[])[1]||'';

                const rows = Array.from(tb.querySelectorAll('tr'));
                let ownHomeRow = rows.find((tr, idx) => {
                    if (rows.length > 1 && idx === rows.length - 1) return false;
                    const txt = tr.textContent.trim().toLowerCase();
                    return txt.includes('próprias') || txt.includes('own') || txt.includes('suas') || txt.includes('na aldeia') || txt.includes('da aldeia');
                }) || rows[0];

                let totalRow = rows.find((tr, idx) => {
                    if (rows.length > 1 && idx === 0) return false;
                    const firstCellText = (tr.querySelector('td, th')?.textContent || '').trim().toLowerCase();
                    return firstCellText.includes('total') || tr.textContent.trim().toLowerCase().startsWith('total');
                }) || rows[rows.length - 1];

                if (rows.length > 1 && ownHomeRow === totalRow) {
                    ownHomeRow = rows[0];
                }

                let movingRow = rows.find(tr => {
                    const txt = tr.textContent.trim().toLowerCase();
                    return txt.includes('trânsito') || txt.includes('transito') || txt.includes('transit') || txt.includes('a caminho') || txt.includes('em viagem');
                });

                let awayRow = rows.find(tr => {
                    const txt = tr.textContent.trim().toLowerCase();
                    return txt.includes('exterior') || txt.includes('away') || txt.includes('fora') || txt.includes('outras aldeias');
                });
                
                const ownCells = Array.from(ownHomeRow.querySelectorAll('td.unit-item'));
                const totalCells = Array.from(totalRow.querySelectorAll('td.unit-item'));
                const movingCells = movingRow ? Array.from(movingRow.querySelectorAll('td.unit-item')) : [];
                const awayCells = awayRow ? Array.from(awayRow.querySelectorAll('td.unit-item')) : [];
                if (ownCells.length === 0 && totalCells.length === 0) return;

                const vTroops = [], dict = {}, homeDict = {}, movingDict = {}, awayDict = {};
                let homePopTotal = 0, totalPopTotal = 0, movingPopTotal = 0, awayPopTotal = 0;
                let homeOffPop = 0, totalOffPop = 0;
                const vTot = { defense: 0, offense: 0, spy: 0, snob: 0, catapult: 0, ram: 0, knight: 0 };
                const isSingleRowTable = (rows.length === 1);

                headers.forEach((th, i) => {
                    const u = unitConfigs[i];
                    const pop = defaultUnitPop[u.name] || 1;

                    const totCell = totalCells[i];
                    const tc = (totCell && !totCell.classList.contains('hidden')) ? parseInt(totCell.textContent.replace(/\./g,''),10)||0 : 0;

                    const ownCell = ownCells[i];
                    const hc = (ownCell && !ownCell.classList.contains('hidden')) ? parseInt(ownCell.textContent.replace(/\./g,''),10)||0 : (isSingleRowTable ? tc : 0);

                    const movCell = movingCells[i];
                    const mc = (movCell && !movCell.classList.contains('hidden')) ? parseInt(movCell.textContent.replace(/\./g,''),10)||0 : 0;

                    const awCell = awayCells[i];
                    const ac = (awCell && !awCell.classList.contains('hidden')) ? parseInt(awCell.textContent.replace(/\./g,''),10)||0 : 0;

                    const finalTotal = tc > 0 ? tc : (hc + mc + ac);
                    if (!u.isHidden) vTroops.push(finalTotal);
                    dict[u.name] = finalTotal;
                    homeDict[u.name] = hc;
                    movingDict[u.name] = mc;
                    awayDict[u.name] = ac;

                    homePopTotal += hc * pop;
                    totalPopTotal += finalTotal * pop;
                    movingPopTotal += mc * pop;
                    awayPopTotal += ac * pop;

                    if (u.name && summary.units[u.name]) {
                        summary.units[u.name].count += finalTotal;
                        summary.units[u.name].pop += finalTotal * pop;
                        summary.totalPop += finalTotal * pop;

                        if (['spear','sword','heavy','catapult','archer','militia','knight'].includes(u.name)) {
                            vTot.defense += finalTotal * pop;
                        }
                        if (['axe','light','ram','catapult','marcher'].includes(u.name)) {
                            vTot.offense += finalTotal * pop;
                            totalOffPop += finalTotal * pop;
                            homeOffPop += hc * pop;
                        }
                        if (u.name === 'spy') vTot.spy += finalTotal * pop;
                        if (u.name === 'snob') { vTot.snob += finalTotal; summary.snobCount += finalTotal; }
                        if (u.name === 'catapult') vTot.catapult += finalTotal;
                        if (u.name === 'ram') vTot.ram += finalTotal;
                        if (u.name === 'knight') vTot.knight += hc;
                    }
                });

                let rowClass = '';
                if (vTot.offense > vTot.defense && vTot.offense >= 4000) {
                    rowClass = 'tw-row-off';
                    summary.offCount++;
                } else if (vTot.defense > vTot.offense && vTot.defense >= 4000) {
                    rowClass = 'tw-row-def';
                    summary.defCount++;
                }

                const farmInfo = farmMap[vId] || { txt:'N/A', used: 0, max: 24000, perc: 0, color:'#8b949e', lvl:'?' };

                // Deteção inteligente de Tropas Fora / A Farmar
                let outsidePop = Math.max(0, totalPopTotal - homePopTotal);
                if (outsidePop === 0 && (movingPopTotal > 0 || awayPopTotal > 0)) {
                    outsidePop = movingPopTotal + awayPopTotal;
                }
                // Deteção secundária baseada na Fazenda (se fazenda >= 15k mas homePop estiver muito abaixo)
                if (outsidePop < 1000 && farmInfo.used >= 15000 && homePopTotal > 0) {
                    const estimatedPop = Math.max(0, farmInfo.used - 3500);
                    if (estimatedPop - homePopTotal > 1500) {
                        outsidePop = estimatedPop - homePopTotal;
                    }
                }

                const outsideOffPop = Math.max(0, totalOffPop - homeOffPop);
                const isFarming = movingPopTotal >= 300;
                const hasTroopsAway = (movingPopTotal >= 300) || (outsidePop >= 1000) || (outsideOffPop >= 1000);
                const troopsAwayPop = outsidePop;
                const totalTroopsArmyPop = totalPopTotal > 0 ? totalPopTotal : Math.max(1, (farmInfo.used - 3500));
                const troopsAwayPerc = Math.min(100, Math.max(0, Math.round((troopsAwayPop / totalTroopsArmyPop) * 100)));

                const is22kFull = farmInfo.used >= 22000;
                const snobsTotal = dict.snob || 0;
                const snobsHome = homeDict.snob || 0;
                const snobsMoving = movingDict.snob || 0;
                const snobsAway = awayDict.snob || 0;
                const snobsOutside = Math.max(snobsMoving + snobsAway, Math.max(0, snobsTotal - snobsHome));
                const snobHome = snobsHome;
                const snobTotal = snobsTotal;
                const snobOutside = snobsOutside;

                let roleTag = { label: 'Em Recrutamento', css: 'tw-tag-growth' };
                if (snobsTotal >= 4) {
                    const awayBadge = snobsOutside > 0 ? ` ⚠️ ${snobsHome}/${snobsTotal}` : ` (${snobsTotal}N)`;
                    if (is22kFull) {
                        roleTag = { label: `👑 Full Train${awayBadge}`, css: 'tw-tag-train4' };
                        summary.fullTrain22kCount++;
                    } else {
                        roleTag = { label: `👑 Train${awayBadge} <22k`, css: 'tw-tag-train4-rec' };
                    }
                } else if (snobsTotal >= 2) {
                    const awayBadge = snobsOutside > 0 ? ` ⚠️ ${snobsHome}/${snobsTotal}` : ` (${snobsTotal}N)`;
                    roleTag = { label: `👑 Train${awayBadge}`, css: 'tw-tag-train2' };
                    summary.semiTrainCount++;
                } else if (snobsTotal === 1) {
                    const awayBadge = snobsOutside > 0 ? ` ⚠️ 0/1` : ` (1N)`;
                    roleTag = { label: `👑 Nobre${awayBadge}`, css: 'tw-tag-snob1' };
                } else if (rowClass === 'tw-row-off') {
                    if (is22kFull) {
                        roleTag = { label: '⚔️ Full Nuke', css: 'tw-tag-nuke-full' };
                        summary.fullNuke22kCount++;
                    } else {
                        roleTag = { label: '⚔️ Semi Nuke', css: 'tw-tag-nuke-semi' };
                    }
                } else if (rowClass === 'tw-row-def') {
                    if (is22kFull) {
                        roleTag = { label: '🛡️ Full Bunker', css: 'tw-tag-bunk-full' };
                        summary.fullBunk22kCount++;
                    } else {
                        roleTag = { label: '🛡️ Semi Bunker', css: 'tw-tag-bunk-semi' };
                    }
                }

                const paladinInfo = paladinByVillage[vId] || null;
                const knightAvailable = paladinInfo ? (paladinInfo.isHome ? 1 : 0) : (homeDict.knight || 0);

                const vPoints = villagePointsMap[vId]
                    || (worldVillages.find(wv => wv.id === vId || wv.coord === coords)?.points)
                    || (typeof game_data !== 'undefined' && game_data.village && game_data.village.id == vId ? (game_data.village.points || 0) : 0)
                    || 0;

                const vEvents = allPendingNobleEvents.filter(e => (e.villageId && String(e.villageId) === String(vId)) || (e.coords && e.coords === coords));
                vEvents.sort((a, b) => a.readyAtMs - b.readyAtMs);
                const snobsInProd = vEvents.filter(e => e.type === 'production').length;
                const snobsReturning = vEvents.filter(e => e.type === 'return').length;

                const vObj = {
                    id: vId, name: vName, coords, points: vPoints, troops: vTroops, troopsDict: dict, homeTroopsDict: homeDict,
                    movingTroopsDict: movingDict, awayTroopsDict: awayDict,
                    knightAvailable, rowClass, roleTag,
                    farm: farmInfo,
                    snobsAvailable: snobsHome,
                    snobsHome: snobsHome,
                    snobsTotal: snobsTotal,
                    snobsOutside: snobsOutside,
                    snobsInProd,
                    snobsReturning,
                    noblePendingEvents: vEvents,
                    hasSnobsAway: snobsOutside > 0 || snobsInProd > 0,
                    totalOffPop: vTot.offense,
                    totalDefPop: vTot.defense,
                    homeOffPop,
                    paladin: paladinInfo,
                    homePopTotal,
                    totalPopTotal,
                    movingPopTotal,
                    awayPopTotal,
                    hasTroopsAway,
                    isFarming,
                    troopsAwayPop,
                    troopsAwayPerc
                };

                for (const [catName, catData] of Object.entries(outputCategories)) {
                    if (catData.test(vObj)) {
                        summary.categories[catName].count++;
                        summary.categories[catName].villageIds.push(vId);
                        if (coords) summary.categories[catName].coords.push(coords);
                    }
                }

                allVillages.push(vObj);
                villagesById[vId] = vObj;
            });

            counterSummaryData = summary;
            updateMemoryHUD();
            document.getElementById('tw-tabs-container').style.display = 'flex';
            document.getElementById('tw-title-text').innerHTML = `⚡ TW Tactical Command Suite <span style="font-size:10px; font-weight:600; background:rgba(56,189,248,0.15); color:#38bdf8; padding:2px 7px; border-radius:4px; border:1px solid rgba(56,189,248,0.25); margin-left:6px; vertical-align:middle;">v${SCRIPT_VERSION}</span> <span style="font-size:11px; font-weight:normal; color:#94a3b8; margin-left:6px; vertical-align:middle;">(${allVillages.length} Aldeias Conectadas)</span>`;
            
            document.getElementById('tab-btn-overview').onclick = () => switchTab('overview');
            document.getElementById('tab-btn-counter').onclick = () => switchTab('counter');
            document.getElementById('tab-btn-fakes').onclick = () => switchTab('fakes');
            document.getElementById('tab-btn-nt').onclick = () => switchTab('nt');
            document.getElementById('tw-btn-close').onclick = closeSuite;
            
            switchTab('overview');
        } catch (e) {
            document.getElementById('tw-main-body').innerHTML = `<div style="padding:40px; color:#f85149; text-align:center;">Erro: ${e.message}</div>`;
        }
    }

    async function switchTab(tab) {
        activeTab = tab;
        document.getElementById('tab-btn-overview').classList.toggle('active', tab === 'overview');
        document.getElementById('tab-btn-counter').classList.toggle('active', tab === 'counter');
        document.getElementById('tab-btn-fakes').classList.toggle('active', tab === 'fakes');
        document.getElementById('tab-btn-nt').classList.toggle('active', tab === 'nt');
        
        if (tab === 'overview') renderOverview();
        else if (tab === 'counter') renderCounter();
        else if (tab === 'fakes') renderFakes();
        else if (tab === 'nt') renderAttackPlanner();
    }

    // ==========================================
    // ABA 1: VISÃO GERAL
    // ==========================================
    function renderOverview() {
        const s = counterSummaryData;
        const committedMap = getCommittedSchedules();
        
        let filtered = [...allVillages];
        if (overviewSearch) {
            filtered = filtered.filter(v => v.name.toLowerCase().includes(overviewSearch) || v.coords.includes(overviewSearch));
        }
        if (overviewFilter === 'off22k') filtered = filtered.filter(v => v.rowClass === 'tw-row-off' && v.farm.used >= 22000);
        else if (overviewFilter === 'def22k') filtered = filtered.filter(v => v.rowClass === 'tw-row-def' && v.farm.used >= 22000);
        else if (overviewFilter === 'snob') filtered = filtered.filter(v => (v.snobsTotal > 0 || v.snobsHome > 0));
        else if (overviewFilter === 'knight') filtered = filtered.filter(v => (v.knightAvailable || (v.homeTroopsDict && v.homeTroopsDict.knight) || (v.paladin && v.paladin.isHome) || 0) > 0);
        else if (overviewFilter === 'farm22k') filtered = filtered.filter(v => v.farm.used >= 22000);
        else if (overviewFilter === 'committed') filtered = filtered.filter(v => !!committedMap[v.id]);

        if (sortColumn) {
            filtered.sort((a, b) => {
                let valA, valB;
                if (sortColumn === 'name') { valA = a.name; valB = b.name; }
                else if (sortColumn === 'farm') { valA = a.farm.used; valB = b.farm.used; }
                else if (sortColumn === 'role') { valA = a.roleTag.label; valB = b.roleTag.label; }
                else if (sortColumn === 'snob') { valA = (a.snobsHome * 100) + a.snobsTotal; valB = (b.snobsHome * 100) + b.snobsTotal; }
                else { valA = a.troopsDict[sortColumn] || 0; valB = b.troopsDict[sortColumn] || 0; }
                
                if (typeof valA === 'string') return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
                return sortAsc ? valA - valB : valB - valA;
            });
        }

        totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
        if (currentPage > totalPages) currentPage = totalPages;
        const start = (currentPage - 1) * itemsPerPage;
        const list = itemsPerPage === 9999 ? filtered : filtered.slice(start, start + itemsPerPage);

        let ths = '';
        unitConfigs.forEach(u => {
            if (!u.isHidden && u.name) {
                const isCurrentSort = sortColumn === u.name;
                const arrow = isCurrentSort ? (sortAsc ? ' ▲' : ' ▼') : '';
                ths += `<th data-sort="${u.name}" style="width:45px;" title="Ordenar por ${u.name}"><img src="${u.src}">${arrow}</th>`;
            }
        });

        let rows = '';
        list.forEach(v => {
            let tds = '';
            unitConfigs.forEach(u => {
                if (!u.isHidden && u.name) {
                    const q = v.troopsDict[u.name] || 0;
                    const isNoble = u.name === 'snob';
                    const isPaladin = u.name === 'knight';
                    let col = q > 0 ? '#f8fafc' : '#334155';
                    let bgBadge = '';
                    let cellDisplay = q.toLocaleString('pt-PT');
                    if (isNoble && (q > 0 || (v.snobsInProd || 0) > 0)) { 
                        col = '#fbbf24'; 
                        bgBadge = 'background:rgba(245, 158, 11, 0.2); border-radius:4px; padding:1px 4px; font-weight:bold;'; 
                        let badges = '';
                        if (v.snobsOutside > 0) {
                            badges += ` <span title="${v.snobsOutside} nobre(s) fora / em comandos" style="color:#ef4444; font-size:9.5px; font-weight:bold;">⚠️</span>`;
                        }
                        if (v.snobsInProd > 0) {
                            badges += ` <span title="${v.snobsInProd} nobre(s) em treino na academia" style="color:#38bdf8; font-size:9.5px; font-weight:bold;">🔨+${v.snobsInProd}</span>`;
                        }
                        cellDisplay = `${v.snobsHome}/${q}${badges}`;
                    }
                    if (isPaladin && q > 0) { col = '#34d399'; bgBadge = 'background:rgba(16, 185, 129, 0.2); border-radius:4px; padding:1px 4px; font-weight:bold;'; }
                    tds += `<td><span style="${bgBadge} color:${col}; font-weight:${q>0?'600':'normal'};">${cellDisplay}</span></td>`;
                }
            });

            const commInfo = committedMap[v.id];
            const commBadge = commInfo ? `<span class="tw-badge-reserved" title="Agendado para ${commInfo.targetCoords}">🔒 Reservada (${Math.max(0, Math.ceil((commInfo.expiresAt - Date.now())/60000))}m)</span>` : '';

            rows += `
                <tr class="${v.rowClass}" data-vid="${v.id}">
                    <td style="text-align:left; padding-left:10px; font-weight:bold;">
                        <a href="javascript:void(0);" class="tw-v-coord" data-coord="${v.coords}" style="color:#38bdf8; text-decoration:none;" title="Clica para copiar as coordenadas">${v.name}</a>
                        ${v.hasTroopsAway ? `<span class="tw-pill" style="font-size:9.5px; padding:1px 5px; margin-left:5px; background:rgba(245,158,11,0.15); border:1px solid #f59e0b; color:#fbbf24; vertical-align:middle;" title="Tropas fora de casa / a farmar: ${v.troopsAwayPerc}% (~${(v.troopsAwayPop/1000).toFixed(1)}k pop de ${(v.totalPopTotal/1000).toFixed(1)}k)">⚠️ ${v.troopsAwayPerc}% tropas fora</span>` : ''}
                        ${v.paladin ? `<span class="tw-pill" style="font-size:9.5px; padding:1px 5px; margin-left:6px; background:rgba(124,58,237,0.25); border:1px solid #c084fc; color:#e9d5ff; vertical-align:middle;" title="Paladino: ${v.paladin.name} (Lvl ${v.paladin.level} • ${v.paladin.isOffense ? 'Ofensivo ⚔️' : 'Defensivo 🛡️'})">${v.paladin.name} ${v.paladin.isOffense ? '⚔️' : '🛡️'}</span>` : ''}
                        ${commBadge ? `<div style="margin-top:2px;">${commBadge}</div>` : ''}
                    </td>
                    <td><span class="${v.roleTag.css}">${v.roleTag.label}</span></td>
                    <td style="width:130px; text-align:left; padding-right:10px;">
                        <div style="display:flex; justify-content:space-between; font-size:11px;">
                            <span style="color:#94a3b8;">${v.farm.used.toLocaleString('pt-PT')} / ${v.farm.max.toLocaleString('pt-PT')}</span>
                            <b style="color:${v.farm.color};">${v.farm.perc}%</b>
                        </div>
                        <div class="tw-farm-bar-bg">
                            <div class="tw-farm-bar-fill" style="width:${Math.min(v.farm.perc, 100)}%; background:${v.farm.color};"></div>
                        </div>
                    </td>
                    ${tds}
                </tr>
            `;
        });

        const axeCount = s.units.axe ? s.units.axe.count : 0;
        const lightCount = s.units.light ? s.units.light.count : 0;
        const spearCount = s.units.spear ? s.units.spear.count : 0;
        const swordCount = s.units.sword ? s.units.sword.count : 0;
        const committedCount = Object.keys(committedMap).length;

        document.getElementById('tw-main-body').innerHTML = `
            <div class="tw-pane active" style="padding: 4px; gap:8px;">
                <div class="tw-kpi-grid">
                    <div class="tw-kpi-card tw-kpi-blue">
                        <div class="tw-kpi-label"><span>🏰 Império</span><span>TOTAL</span></div>
                        <div class="tw-kpi-value">${allVillages.length} <span style="font-size:12px; color:#94a3b8; font-weight:normal;">Aldeias</span></div>
                        <div class="tw-kpi-sub">População Total: <b style="color:#38bdf8;">${s.totalPop.toLocaleString('pt-PT')}</b></div>
                    </div>
                    <div class="tw-kpi-card tw-kpi-red">
                        <div class="tw-kpi-label"><span>⚔️ Poder de Fogo (OFF)</span><span>FAZ. ≥22k</span></div>
                        <div class="tw-kpi-value" style="color:#f87171;">${s.fullNuke22kCount} <span style="font-size:12px; color:#94a3b8; font-weight:normal;">Full Nukes (≥22k)</span></div>
                        <div class="tw-kpi-sub">🪓 ${axeCount.toLocaleString('pt-PT')} • 🐴 ${lightCount.toLocaleString('pt-PT')}</div>
                    </div>
                    <div class="tw-kpi-card tw-kpi-green">
                        <div class="tw-kpi-label"><span>🛡️ Capacidade Defesa</span><span>FAZ. ≥22k</span></div>
                        <div class="tw-kpi-value" style="color:#34d399;">${s.fullBunk22kCount} <span style="font-size:12px; color:#94a3b8; font-weight:normal;">Full Bunkers (≥22k)</span></div>
                        <div class="tw-kpi-sub">🗡️ ${spearCount.toLocaleString('pt-PT')} • 🛡️ ${swordCount.toLocaleString('pt-PT')}</div>
                    </div>
                    <div class="tw-kpi-card tw-kpi-gold">
                        <div class="tw-kpi-label"><span>👑 Academia & Conquista</span><span>NOBRES</span></div>
                        <div class="tw-kpi-value" style="color:#fbbf24;">${s.snobCount} <span style="font-size:12px; color:#94a3b8; font-weight:normal;">Nobres</span></div>
                        <div class="tw-kpi-sub"><b style="color:#f59e0b;">${s.fullTrain22kCount}</b> Full Trains (4N ≥22k) • ${s.semiTrainCount} Split Trains (2-3N)</div>
                    </div>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; background:#0f172a; border:1px solid #1e293b; border-radius:8px; padding:6px 10px;">
                    <div class="tw-pill-group">
                        <span style="font-size:11px; font-weight:bold; color:#64748b; margin-right:4px;">FILTRO:</span>
                        <div class="tw-pill ${overviewFilter==='all'?'active':''}" data-f="all">🌍 Todas (${allVillages.length})</div>
                        <div class="tw-pill ${overviewFilter==='off22k'?'active':''}" data-f="off22k">⚔️ Full Nukes ≥22k (${s.fullNuke22kCount})</div>
                        <div class="tw-pill ${overviewFilter==='def22k'?'active':''}" data-f="def22k">🛡️ Full Bunkers ≥22k (${s.fullBunk22kCount})</div>
                        <div class="tw-pill ${overviewFilter==='snob'?'active':''}" data-f="snob">👑 Com Nobres (${allVillages.filter(v=>(v.snobsTotal||0)>0 || (v.snobsHome||0)>0).length})</div>
                        <div class="tw-pill ${overviewFilter==='knight'?'active':''}" data-f="knight">🛡️ Paladino em Casa (${allVillages.filter(v=>v.knightAvailable>0 || (v.paladin && v.paladin.isHome)).length})</div>
                        <div class="tw-pill ${overviewFilter==='committed'?'active':''}" data-f="committed">🔒 Reservadas (${committedCount})</div>
                        <div class="tw-pill ${overviewFilter==='farm22k'?'active':''}" data-f="farm22k">🌾 Fazenda ≥22.000</div>
                    </div>

                    <div style="display:flex; gap:6px; align-items:center;">
                        <input type="text" id="tw-ov-search" class="tw-input" style="width:180px;" placeholder="🔍 Filtrar aldeia/coord..." value="${overviewSearch}">
                        <button class="tw-btn tw-btn-blue" id="tw-btn-copy-filtered-coords" style="padding:4px 8px; font-size:11px;" title="Copia todas as coordenadas da lista atual para o clipboard">📋 Copiar Coords</button>
                        <select id="tw-ov-pp" class="tw-select" style="padding:4px 6px; font-size:11px;">
                            <option value="12" ${itemsPerPage === 12 ? 'selected' : ''}>12/pág</option>
                            <option value="15" ${itemsPerPage === 15 ? 'selected' : ''}>15/pág</option>
                            <option value="25" ${itemsPerPage === 25 ? 'selected' : ''}>25/pág</option>
                            <option value="50" ${itemsPerPage === 50 ? 'selected' : ''}>50/pág</option>
                            <option value="9999" ${itemsPerPage === 9999 ? 'selected' : ''}>Todas</option>
                        </select>
                    </div>
                </div>

                <div class="tw-panel">
                    <table class="tw-table">
                        <thead>
                            <tr>
                                <th data-sort="name" style="text-align:left; width:200px; padding-left:10px;">Aldeia ${sortColumn==='name'?(sortAsc?'▲':'▼'):''}</th>
                                <th data-sort="role" style="width:130px;">Função Tática ${sortColumn==='role'?(sortAsc?'▲':'▼'):''}</th>
                                <th data-sort="farm" style="width:130px; text-align:left;">Fazenda (Pop) ${sortColumn==='farm'?(sortAsc?'▲':'▼'):''}</th>
                                ${ths}
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; padding:2px 4px;">
                    <button class="tw-btn" id="tw-ov-prev" ${currentPage===1?'disabled':''}>&#8592; Anterior</button>
                    <span style="font-size:12px; color:#94a3b8; font-weight:600;">Página <b style="color:#38bdf8;">${currentPage}</b> de <b>${totalPages}</b> (${filtered.length} aldeias filtradas)</span>
                    <button class="tw-btn" id="tw-ov-next" ${currentPage===totalPages?'disabled':''}>Próxima &#8594;</button>
                </div>
            </div>
        `;

        document.getElementById('tw-ov-search').oninput = (e) => { overviewSearch = e.target.value.toLowerCase(); currentPage = 1; renderOverview(); };
        document.getElementById('tw-ov-pp').onchange = (e) => { itemsPerPage = parseInt(e.target.value, 10); currentPage = 1; renderOverview(); };
        document.getElementById('tw-ov-prev').onclick = () => { if (currentPage > 1) { currentPage--; renderOverview(); } };
        document.getElementById('tw-ov-next').onclick = () => { if (currentPage < totalPages) { currentPage++; renderOverview(); } };

        document.querySelectorAll('.tw-pill').forEach(pill => pill.onclick = function() {
            overviewFilter = this.getAttribute('data-f');
            currentPage = 1;
            renderOverview();
        });

        document.querySelectorAll('.tw-table th[data-sort]').forEach(th => th.onclick = function() {
            const col = this.getAttribute('data-sort');
            if (sortColumn === col) sortAsc = !sortAsc;
            else { sortColumn = col; sortAsc = false; }
            renderOverview();
        });

        document.getElementById('tw-btn-copy-filtered-coords').onclick = async () => {
            if (filtered.length === 0) {
                alert('Nenhuma aldeia corresponde ao filtro atual.');
                return;
            }
            const coordsList = filtered.map(v => v.coords).join(' ');
            await navigator.clipboard.writeText(coordsList);
            showToast(`📋 ${filtered.length} coordenadas copiadas!`);
        };

        document.querySelectorAll('.tw-v-coord').forEach(el => el.onclick = function() {
            const c = this.getAttribute('data-coord');
            navigator.clipboard.writeText(c);
            showToast(`📋 Coordenadas ${c} copiadas!`);
        });
    }

    // ==========================================
    // ABA 2: CONTADOR TÁTICO
    // ==========================================
    function renderCounter() {
        const s = counterSummaryData;
        const committedMap = getCommittedSchedules();
        let selectedCategory = activeCounterCategory || Object.keys(outputCategories)[0];

        function renderCounterContent() {
            let catButtonsHtml = '';
            for (const [catName, catData] of Object.entries(outputCategories)) {
                const count = s.categories[catName].count;
                const isSelected = catName === selectedCategory;
                const activeStyle = isSelected ? 'border-color:#38bdf8; background:rgba(56, 189, 248, 0.15); box-shadow:0 0 12px rgba(56,189,248,0.2);' : 'background:#0f172a; border-color:#1e293b;';
                
                catButtonsHtml += `
                    <div class="tw-cat-btn" data-cat="${catName}" style="display:flex; justify-content:space-between; align-items:center; padding:9px 12px; border-radius:8px; border:1px solid; ${activeStyle} cursor:pointer; transition:0.15s; margin-bottom:5px;">
                        <span style="font-size:12px; font-weight:600; color:${isSelected?'#38bdf8':'#e2e8f0'};">» ${catData.desc}</span>
                        <span style="font-size:12px; font-weight:bold; padding:2px 8px; border-radius:12px; background:${count>0?(isSelected?'#0284c7':'#1e293b'):'#090d16'}; color:${count>0?'#fff':'#64748b'};">${count}</span>
                    </div>
                `;
            }

            const targetVal = document.getElementById('tw-c-target') ? document.getElementById('tw-c-target').value.trim() : (savedCounterTarget || '');
            const unitVal = document.getElementById('tw-c-unit') ? document.getElementById('tw-c-unit').value : (savedCounterUnit || 'ram');

            const currentVillages = (s.categories[selectedCategory] ? s.categories[selectedCategory].villageIds : []).map(vId => {
                const v = villagesById[vId];
                if (!v) return null;
                const hasTarget = /^\d{3}\|\d{3}$/.test(targetVal);
                const dist = hasTarget ? calcDistance(v.coords, targetVal) : null;
                const travelSec = dist !== null ? dist * (unitSpeedMinutes[unitVal] || (30 * PT114_TIME_MODIFIER)) * 60 : null;
                return {
                    village: v,
                    dist: dist !== null ? dist.toFixed(1) : null,
                    travelStr: travelSec !== null ? formatDuration(travelSec) : null
                };
            }).filter(Boolean);

            if (currentVillages.length > 0 && currentVillages[0].dist !== null) {
                currentVillages.sort((a, b) => parseFloat(a.dist) - parseFloat(b.dist));
            }

            let rowsHtml = '';
            if (currentVillages.length === 0) {
                rowsHtml = `<tr><td colspan="6" style="padding:40px; text-align:center; color:#64748b;">Nenhuma aldeia encontrada nesta categoria.</td></tr>`;
            } else {
                currentVillages.forEach((item, idx) => {
                    const v = item.village;
                    const isComm = !!committedMap[v.id];
                    const distCol = item.dist !== null ? `<b style="color:#fbbf24;">${item.dist}c</b>` : `<span style="color:#64748b;">-</span>`;
                    const timeCol = item.travelStr !== null ? `<b style="color:#38bdf8;">${item.travelStr}</b>` : `<span style="color:#64748b;">-</span>`;
                    const statusBadge = isComm ? `<span class="tw-badge-reserved">🔒 Agendada</span>` : `<span style="color:#10b981; font-weight:bold;">Disponível</span>`;
                    
                    rowsHtml += `
                        <tr data-vid="${v.id}">
                            <td style="color:#64748b; width:30px;">${idx+1}</td>
                            <td style="text-align:left; font-weight:bold; color:#38bdf8;">
                                <a href="javascript:void(0);" class="tw-v-coord" data-coord="${v.coords}" style="color:#38bdf8; text-decoration:none;">${v.name}</a>
                            </td>
                            <td style="font-weight:bold; color:#fbbf24;">${v.coords}</td>
                            <td>${distCol}</td>
                            <td>${timeCol}</td>
                            <td>${statusBadge}</td>
                        </tr>
                    `;
                });
            }

            document.getElementById('tw-main-body').innerHTML = `
                <div class="tw-pane active" style="padding: 4px; gap:8px;">
                    <div style="display:grid; grid-template-columns: 360px 1fr; gap:10px; height:100%;">
                        
                        <div style="display:flex; flex-direction:column; gap:8px;">
                            <div class="tw-card" style="padding:10px 12px; background:linear-gradient(135deg, rgba(15,23,42,0.8) 0%, rgba(2,6,23,0.9) 100%);">
                                <div class="tw-card-title" style="color:#38bdf8; font-size:12px;">👤 ${game_data.player.name}</div>
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
                                    <span style="font-size:11px; color:#94a3b8;">População Total:</span>
                                    <b style="color:#34d399; font-size:14px;">${s.totalPop.toLocaleString('pt-PT')}</b>
                                </div>
                            </div>
                            
                            <div class="tw-panel" style="padding:8px; display:flex; flex-direction:column; flex-grow:1; background:#0b1120;">
                                <span style="font-size:10px; font-weight:bold; text-transform:uppercase; color:#64748b; margin-bottom:6px; letter-spacing:0.05em; padding-left:4px;">Categorias Estratégicas</span>
                                <div style="overflow-y:auto; flex-grow:1; padding-right:2px;">
                                    ${catButtonsHtml}
                                </div>
                            </div>
                        </div>

                        <div style="display:flex; flex-direction:column; gap:8px;">
                            <div class="tw-card" style="display:flex; flex-direction:row; gap:10px; align-items:center; justify-content:space-between; padding:8px 12px;">
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <span style="font-weight:700; color:#38bdf8; font-size:12px;">🎯 Alvo:</span>
                                    <input type="text" id="tw-c-target" class="tw-input" style="width:95px; text-align:center; font-weight:bold; color:#fbbf24; font-size:13px; padding:4px 6px;" placeholder="xxx|yyy" maxlength="7" value="${targetVal}">
                                    
                                    <span style="font-weight:700; color:#94a3b8; font-size:12px; margin-left:6px;">Velocidade:</span>
                                    <select id="tw-c-unit" class="tw-select" style="font-weight:600; padding:4px 8px; font-size:12px;">
                                        <option value="ram" ${unitVal==='ram'?'selected':''}>🪵 Aríete (30m)</option>
                                        <option value="snob" ${unitVal==='snob'?'selected':''}>👑 Nobre (35m)</option>
                                        <option value="sword" ${unitVal==='sword'?'selected':''}>🛡️ Espada (22m)</option>
                                        <option value="axe" ${unitVal==='axe'?'selected':''}>🪓 Viking (18m)</option>
                                        <option value="heavy" ${unitVal==='heavy'?'selected':''}>🐴 CP (11m)</option>
                                        <option value="light" ${unitVal==='light'?'selected':''}>🐎 CL (10m)</option>
                                        <option value="spy" ${unitVal==='spy'?'selected':''}>🔭 Batedor (9m)</option>
                                    </select>
                                </div>
                                <div style="display:flex; gap:6px;">
                                    <button class="tw-btn tw-btn-blue" id="tw-c-btn-copy" style="padding:6px 14px; font-size:12px; font-weight:bold;">📋 Copiar Coordenadas (${currentVillages.length})</button>
                                </div>
                            </div>

                            <div class="tw-panel" style="flex-grow:1;">
                                <table class="tw-table">
                                    <thead>
                                        <tr>
                                            <th style="width:35px;">#</th>
                                            <th style="text-align:left; padding-left:10px;">Aldeia</th>
                                            <th style="width:100px;">Coordenada</th>
                                            <th style="width:90px;">Distância</th>
                                            <th style="width:110px;">Tempo Viagem</th>
                                            <th style="width:100px;">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${rowsHtml}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                </div>
            `;

            const cTargetInput = document.getElementById('tw-c-target');
            cTargetInput.addEventListener('input', (e) => {
                let val = e.target.value;
                if (/^\d{3}$/.test(val) && !val.includes('|')) {
                    e.target.value = val + '|';
                }
                savedCounterTarget = e.target.value.trim();
                renderCounterContent();
            });

            document.getElementById('tw-c-unit').onchange = (e) => {
                savedCounterUnit = e.target.value;
                renderCounterContent();
            };

            document.querySelectorAll('.tw-cat-btn').forEach(btn => btn.onclick = function() {
                selectedCategory = this.getAttribute('data-cat');
                activeCounterCategory = selectedCategory;
                renderCounterContent();
            });

            document.getElementById('tw-c-btn-copy').onclick = async () => {
                if (currentVillages.length === 0) {
                    alert('Nenhuma aldeia nesta categoria para copiar.');
                    return;
                }
                const coordsList = currentVillages.map(item => item.village.coords).join(' ');
                await navigator.clipboard.writeText(coordsList);
                showToast(`📋 ${currentVillages.length} coordenadas copiadas!`);
            };

            document.querySelectorAll('.tw-v-coord').forEach(el => el.onclick = function() {
                const c = this.getAttribute('data-coord');
                navigator.clipboard.writeText(c);
                showToast(`📋 Coordenadas ${c} copiadas!`);
            });
        }

        renderCounterContent();
    }

    // ==========================================
    // ABA 3: FAKES & MASCARAMENTO
    // ==========================================
    function renderFakes() {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 14 * 3600 * 1000);
        const tomorrowEnd = new Date(now.getTime() + 26 * 3600 * 1000);
        const exactDefaultStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}T20:00:00`;
        const dStart = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}T10:00`;
        const dEnd = `${tomorrowEnd.getFullYear()}-${String(tomorrowEnd.getMonth()+1).padStart(2,'0')}-${String(tomorrowEnd.getDate()).padStart(2,'0')}T22:00`;

        const targetCount = grabbedTargets.size || (document.getElementById('tw-f-targets') ? (document.getElementById('tw-f-targets').value.match(/\d{3}\|\d{3}/g)||[]).length : 0);

        document.getElementById('tw-main-body').innerHTML = `
            <div class="tw-pane active" style="padding: 4px; gap:8px;">
                <div class="tw-kpi-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom:4px;">
                    <div class="tw-kpi-card tw-kpi-purple">
                        <div class="tw-kpi-label"><span>🎯 ALVOS ATIVOS</span><span id="tw-f-hud-target-badge">LISTADOS</span></div>
                        <div class="tw-kpi-value" id="tw-f-hud-targets" style="color:#c084fc;">${targetCount} <span style="font-size:12px; color:#94a3b8; font-weight:normal;">Alvos</span></div>
                        <div class="tw-kpi-sub">Adiciona alvos via mapa ou texto</div>
                    </div>
                    <div class="tw-kpi-card tw-kpi-blue">
                        <div class="tw-kpi-label"><span>🏰 ORIGENS DISPONÍVEIS</span><span id="tw-f-hud-orig-badge">TOTAL</span></div>
                        <div class="tw-kpi-value" id="tw-f-hud-origins" style="color:#38bdf8;">${allVillages.length} <span style="font-size:12px; color:#94a3b8; font-weight:normal;">Aldeias</span></div>
                        <div class="tw-kpi-sub">Filtrado pelo grupo de origem</div>
                    </div>
                    <div class="tw-kpi-card tw-kpi-gold">
                        <div class="tw-kpi-label"><span>⏱️ VELOCIDADE BASE</span><span>PT114</span></div>
                        <div class="tw-kpi-value" id="tw-f-hud-speed" style="color:#fbbf24;">Aríete / Cata <span style="font-size:12px; color:#94a3b8; font-weight:normal;">(30m/c)</span></div>
                        <div class="tw-kpi-sub">Velocidade selecionada para a viagem</div>
                    </div>
                    <div class="tw-kpi-card tw-kpi-green">
                        <div class="tw-kpi-label"><span>🚀 CAPACIDADE ESTIMADA</span><span>TOTAL</span></div>
                        <div class="tw-kpi-value" id="tw-f-hud-capacity" style="color:#34d399;">${targetCount * 4} <span style="font-size:12px; color:#94a3b8; font-weight:normal;">Comandos</span></div>
                        <div class="tw-kpi-sub">Baseado em Fakes / Alvo</div>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns: 1.2fr 1.1fr 1.1fr; gap:8px;">
                    <div class="tw-card">
                        <div class="tw-card-title" style="color:#c084fc;">
                            <span>🎯 1. Alvos & Unidade Fake</span>
                            <button class="tw-btn tw-btn-blue" id="tw-btn-open-map-modal" style="font-size:10px; padding:2px 8px;">🗺️ Seleção no Mapa</button>
                        </div>
                        <textarea id="tw-f-targets" class="tw-textarea" style="height:48px;" placeholder="Clica no botão de seleção no mapa ou cola coordenadas (ex: 500|500 501|501)...">${Array.from(grabbedTargets).join(' ')}</textarea>
                        
                        <div style="display:grid; grid-template-columns: 1.1fr 1fr; gap:6px; margin-top:2px;">
                            <div style="display:flex; flex-direction:column; gap:2px;">
                                <span style="font-size:10px; color:#94a3b8;">Unidade do Fake:</span>
                                <select id="tw-f-unit" class="tw-select" style="font-weight:bold; color:#fbbf24;">
                                    <option value="ram" selected>🪵 Aríete / Catapulta (30m)</option>
                                    <option value="snob">👑 Nobre / NT Fake (35m)</option>
                                    <option value="sword">🛡️ Espada (22m)</option>
                                    <option value="axe">🪓 Machado / Lança (18m)</option>
                                    <option value="heavy">🐴 Cavalaria Pesada (11m)</option>
                                    <option value="light">🐎 Cavalaria Leve (10m)</option>
                                    <option value="spy">🔭 Batedor (9m)</option>
                                </select>
                            </div>
                            <div style="display:flex; flex-direction:column; gap:2px;">
                                <span style="font-size:10px; color:#94a3b8;">Grupo de Origem:</span>
                                <select id="tw-f-group" class="tw-select">
                                    <option value="def" selected>🛡️ Apenas Defesa</option>
                                    <option value="all">🌍 Todas as Aldeias</option>
                                    <option value="off">⚔️ Apenas Ataque</option>
                                </select>
                            </div>
                        </div>

                        <!-- OPÇÃO DE EXCLUIR RESERVADAS -->
                        <div style="display:flex; align-items:center; gap:6px; margin-top:4px;">
                            <input type="checkbox" id="tw-f-exclude-committed" checked style="cursor:pointer; width:13px; height:13px;">
                            <label for="tw-f-exclude-committed" style="font-size:10px; color:#94a3b8; cursor:pointer;">🔒 Ignorar aldeias já reservadas na memória</label>
                        </div>
                    </div>

                    <div class="tw-card">
                        <div class="tw-card-title" style="color:#38bdf8;">⏰ 2. Estratégia & Hora de Impacto</div>
                        <div style="display:flex; flex-direction:column; gap:2px;">
                            <span style="font-size:10px; color:#94a3b8;">Estratégia de Dispersão:</span>
                            <select id="tw-f-ai" class="tw-select" style="font-weight:bold; color:#38bdf8;">
                                <option value="sync" selected>🎯 Sincronização em Bloco (Hora Exata)</option>
                                <option value="fake_train">👑 Simulação de NT Fake (Hora Exata + 200ms)</option>
                                <option value="spam">🚨 Dispersão Contínua (Janela de Tempo)</option>
                                <option value="chaos">🌪️ Rotação Caótica de Origens (Janela de Tempo)</option>
                            </select>
                        </div>
                        
                        <div id="tw-f-box-exact" style="display:flex; flex-direction:column; gap:2px; margin-top:2px;">
                            <span style="font-size:10px; color:#38bdf8; font-weight:bold;">🎯 Hora Exata de Chegada (Impacto):</span>
                            <input type="datetime-local" id="tw-f-exact-time" class="tw-input" step="1" value="${exactDefaultStr}" style="font-weight:bold; color:#38bdf8;">
                            
                            <div style="display:flex; gap:3px; justify-content:space-between; margin-top:3px;">
                                <button class="tw-pill tw-fake-time-shortcut" data-add-h="2" style="padding:2px 6px; font-size:9px;">+2h</button>
                                <button class="tw-pill tw-fake-time-shortcut" data-add-h="6" style="padding:2px 6px; font-size:9px;">+6h</button>
                                <button class="tw-pill tw-fake-time-shortcut" data-add-h="12" style="padding:2px 6px; font-size:9px;">+12h</button>
                                <button class="tw-pill tw-fake-time-shortcut" data-set-h="20" style="padding:2px 6px; font-size:9px;">20:00</button>
                                <button class="tw-pill tw-fake-time-shortcut" data-set-h="08" style="padding:2px 6px; font-size:9px;">08:00</button>
                            </div>
                        </div>

                        <div id="tw-f-box-window" style="display:none; grid-template-columns: 1fr 1fr; gap:6px; margin-top:2px;">
                            <div style="display:flex; flex-direction:column; gap:2px;">
                                <span style="font-size:10px; color:#94a3b8;">Impacto Inicial:</span>
                                <input type="datetime-local" id="tw-f-start" class="tw-input" value="${dStart}">
                            </div>
                            <div style="display:flex; flex-direction:column; gap:2px;">
                                <span style="font-size:10px; color:#94a3b8;">Impacto Limite:</span>
                                <input type="datetime-local" id="tw-f-end" class="tw-input" value="${dEnd}">
                            </div>
                        </div>
                    </div>

                    <div class="tw-card">
                        <div class="tw-card-title" style="color:#34d399;">🔢 3. Volume & Modelo</div>
                        <div style="grid-template-columns: 1.2fr 1fr; gap:6px; display:grid;">
                            <div style="display:flex; flex-direction:column; gap:2px;">
                                <span style="font-size:10px; color:#94a3b8;">Nome do Modelo:</span>
                                <input type="text" id="tw-f-model" class="tw-input" value="Fake" style="font-weight:bold; color:#38bdf8;">
                            </div>
                            <div style="display:flex; flex-direction:column; gap:2px;">
                                <span style="font-size:10px; color:#94a3b8;">Fakes / Alvo:</span>
                                <input type="number" id="tw-f-pertarget" class="tw-input" value="4" min="1" max="30" style="text-align:center; font-weight:bold; color:#34d399;">
                            </div>
                        </div>
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; margin-top:2px;">
                            <div style="display:flex; flex-direction:column; gap:2px;">
                                <span style="font-size:10px; color:#94a3b8;">Max / Aldeia:</span>
                                <input type="number" id="tw-f-maxorigin" class="tw-input" value="4" min="1" max="100" style="text-align:center;">
                            </div>
                            <div style="display:flex; align-items:center; gap:6px; margin-top:14px;">
                                <input type="checkbox" id="tw-f-allow-multi" checked style="cursor:pointer; width:15px; height:15px;">
                                <label for="tw-f-allow-multi" style="font-size:10px; color:#f8fafc; cursor:pointer;" title="Permite enviar múltiplos fakes da mesma aldeia para o mesmo alvo se necessário">Repetir p/ Alvo</label>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; padding:2px 0;">
                    <div style="display:flex; gap:8px; align-items:center;">
                        <button class="tw-btn tw-btn-gold" id="tw-btn-gen-russo" style="padding:7px 18px;">
                            ⚡ Gerar Plano de Fakes (Copiar BBCode)
                        </button>
                        <button class="tw-btn tw-btn-purple" id="tw-btn-fakes-commit-1h" style="padding:7px 14px; font-weight:bold;">
                            💾 Agendamento feito - guardar durante 1h
                        </button>
                    </div>
                    <span id="tw-f-status" style="font-size:12px; font-weight:bold;"></span>
                </div>

                <div style="display:flex; flex-direction:column; flex-grow:1; overflow:hidden;">
                    <textarea id="tw-f-preview" class="tw-textarea" style="height:48px; margin-bottom:6px;" placeholder="Configura os parâmetros e clica em 'Gerar Plano de Fakes'..."></textarea>
                    <div class="tw-panel">
                        <table class="tw-table">
                            <thead>
                                <tr>
                                    <th style="width:35px;">#</th>
                                    <th style="text-align:left; width:200px; padding-left:10px;">Aldeia Origem</th>
                                    <th style="width:80px;">Alvo</th>
                                    <th style="width:75px;">Distância</th>
                                    <th style="width:140px;">Hora de Envio</th>
                                    <th style="width:140px;">Hora de Impacto</th>
                                    <th style="width:110px;">Modelo de Tropas</th>
                                </tr>
                            </thead>
                            <tbody id="tw-f-tbody">
                                <tr><td colspan="7" style="padding:25px; color:#94a3b8;">Define os alvos e clica em 'Gerar Plano de Fakes'.</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        const aiSelect = document.getElementById('tw-f-ai');
        aiSelect.onchange = (e) => {
            const isExact = e.target.value === 'sync' || e.target.value === 'fake_train';
            document.getElementById('tw-f-box-exact').style.display = isExact ? 'flex' : 'none';
            document.getElementById('tw-f-box-window').style.display = isExact ? 'none' : 'grid';
        };

        document.querySelectorAll('.tw-fake-time-shortcut').forEach(btn => btn.onclick = function() {
            const addH = parseInt(this.getAttribute('data-add-h'), 10);
            const setH = this.getAttribute('data-set-h');
            const exInput = document.getElementById('tw-f-exact-time');
            let d = exInput.value ? new Date(exInput.value) : new Date();

            if (!isNaN(addH)) {
                d = new Date(Date.now() + addH * 3600 * 1000);
            } else if (setH) {
                const targetH = parseInt(setH, 10);
                d = new Date();
                if (d.getHours() >= targetH) d.setDate(d.getDate() + 1);
                d.setHours(targetH, 0, 0, 0);
            }

            const yr = d.getFullYear();
            const mo = String(d.getMonth() + 1).padStart(2, '0');
            const da = String(d.getDate()).padStart(2, '0');
            const ho = String(d.getHours()).padStart(2, '0');
            const mi = String(d.getMinutes()).padStart(2, '0');
            const se = String(d.getSeconds()).padStart(2, '0');
            exInput.value = `${yr}-${mo}-${da}T${ho}:${mi}:${se}`;
            showToast(`⏰ Hora de Chegada dos fakes ajustada para ${ho}:${mi}:${se} (${da}/${mo})`);
        });

        const savedFakeModelTab = getPref('tw_f_model', 'Fake');
        if (document.getElementById('tw-f-model')) {
            document.getElementById('tw-f-model').value = savedFakeModelTab;
            document.getElementById('tw-f-model').onchange = (e) => savePrefs('tw_f_model', e.target.value);
        }

        document.getElementById('tw-btn-open-map-modal').onclick = () => openMapIframeModal('fakes');
        document.getElementById('tw-btn-gen-russo').onclick = () => buildFakePlan('russo');

        document.getElementById('tw-btn-fakes-commit-1h').onclick = () => {
            if (!lastGeneratedCommands || lastGeneratedCommands.length === 0) {
                alert('Primeiro clica em "Gerar Plano de Fakes" para ter comandos prontos para reservar.');
                return;
            }
            const count = commitVillages(lastGeneratedCommands, 3600000, lastGeneratedTarget);
            showToast(`🔒 ${count} comandos de fakes guardados na memória durante 1h!`);
            document.getElementById('tw-f-status').innerHTML = `<span style="color:#c084fc;">💾 Agendamento registado na memória por 1 hora (${count} origens reservadas)!</span>`;
        };

        const updateFakesHUD = () => {
            const raw = document.getElementById('tw-f-targets').value;
            const tList = Array.from(new Set(raw.match(/\d{3}\|\d{3}/g) || []));
            const perTarget = parseInt(document.getElementById('tw-f-pertarget').value, 10) || 1;
            const unit = document.getElementById('tw-f-unit').value;
            
            document.getElementById('tw-f-hud-targets').innerHTML = `${tList.length} <span style="font-size:12px; color:#94a3b8; font-weight:normal;">Alvos</span>`;
            document.getElementById('tw-f-hud-capacity').innerHTML = `${tList.length * perTarget} <span style="font-size:12px; color:#94a3b8; font-weight:normal;">Comandos</span>`;
            
            const uNames = { ram: 'Aríete / Cata (30m)', snob: 'Nobre (35m)', sword: 'Espada (22m)', axe: 'Machado (18m)', heavy: 'CP (11m)', light: 'CL (10m)', spy: 'Batedor (9m)' };
            document.getElementById('tw-f-hud-speed').innerText = uNames[unit] || 'Aríete (30m)';
        };

        document.getElementById('tw-f-targets').oninput = updateFakesHUD;
        document.getElementById('tw-f-pertarget').oninput = updateFakesHUD;
        document.getElementById('tw-f-unit').onchange = updateFakesHUD;
        document.getElementById('tw-f-group').onchange = updateFakesHUD;
    }

    async function buildFakePlan(format = 'russo') {
        const raw = document.getElementById('tw-f-targets').value;
        const targets = Array.from(new Set(raw.match(/\d{3}\|\d{3}/g) || []));
        if (targets.length === 0) {
            alert('Por favor insere ou seleciona no mapa pelo menos uma coordenada alvo válida (ex: 500|500).');
            return;
        }

        const strategy = document.getElementById('tw-f-ai').value;
        const group = document.getElementById('tw-f-group').value;
        const unit = document.getElementById('tw-f-unit').value;
        const modelName = document.getElementById('tw-f-model').value.trim() || 'Fake';
        const fakesPerTarget = parseInt(document.getElementById('tw-f-pertarget').value, 10) || 1;
        const maxPerOrigin = parseInt(document.getElementById('tw-f-maxorigin').value, 10) || 4;
        const allowMultiSameTarget = document.getElementById('tw-f-allow-multi').checked;
        const excludeCommitted = document.getElementById('tw-f-exclude-committed').checked;
        const committedMap = getCommittedSchedules();

        let startMs, endMs;
        if (strategy === 'sync' || strategy === 'fake_train') {
            startMs = new Date(document.getElementById('tw-f-exact-time').value).getTime();
            endMs = startMs + 1000;
        } else {
            startMs = new Date(document.getElementById('tw-f-start').value).getTime();
            endMs = new Date(document.getElementById('tw-f-end').value).getTime();
        }

        if (isNaN(startMs) || (strategy !== 'sync' && strategy !== 'fake_train' && (isNaN(endMs) || endMs < startMs))) {
            alert('A hora de chegada/janela é inválida.');
            return;
        }

        let pool = [...allVillages];
        if (excludeCommitted) {
            pool = pool.filter(v => !committedMap[v.id]);
        }
        if (group === 'def') pool = pool.filter(v => v.rowClass === 'tw-row-def');
        else if (group === 'off') pool = pool.filter(v => v.rowClass === 'tw-row-off');

        if (pool.length === 0) {
            alert('Nenhuma aldeia disponível para o grupo e filtros selecionados (verifica se não estão todas reservadas na memória).');
            return;
        }

        const now = Date.now();
        const minLaunchMs = now + 45000;
        const originUsage = {};
        pool.forEach(v => originUsage[v.id] = 0);

        const commands = [];
        const speedMin = unitSpeedMinutes[unit] || unitSpeedMinutes.ram;

        targets.forEach((targetCoord, tIdx) => {
            const targetPool = pool.map(v => {
                const dist = calcDistance(v.coords, targetCoord);
                const travelSec = dist * speedMin * 60;
                return { village: v, dist, travelSec };
            }).filter(item => {
                const minPossibleLand = minLaunchMs + (item.travelSec * 1000);
                return minPossibleLand <= endMs;
            }).sort((a, b) => a.dist - b.dist);

            if (targetPool.length === 0) return;

            let assigned = 0;
            let round = 0;

            while (assigned < fakesPerTarget && round < 30) {
                let candidateFoundInRound = false;

                for (let i = 0; i < targetPool.length && assigned < fakesPerTarget; i++) {
                    const cand = targetPool[i];
                    if (originUsage[cand.village.id] >= maxPerOrigin) continue;

                    let landMs;
                    if (strategy === 'sync') {
                        landMs = startMs;
                    } else if (strategy === 'fake_train') {
                        landMs = startMs + (assigned * 200);
                    } else if (strategy === 'spam' || strategy === 'chaos') {
                        const ratio = (tIdx * fakesPerTarget + assigned) / (targets.length * fakesPerTarget);
                        landMs = startMs + (ratio * (endMs - startMs));
                    } else {
                        landMs = startMs + Math.random() * (endMs - startMs);
                    }

                    const launchMs = landMs - (cand.travelSec * 1000);
                    if (launchMs < minLaunchMs) continue;

                    originUsage[cand.village.id]++;
                    assigned++;
                    candidateFoundInRound = true;

                    commands.push({
                        actionType: 'Attack',
                        type: 'Fake',
                        originId: cand.village.id,
                        originName: cand.village.name,
                        originCoords: cand.village.coords,
                        targetCoords: targetCoord,
                        dist: cand.dist.toFixed(2),
                        sec: cand.travelSec,
                        launchTime: new Date(launchMs),
                        landTime: new Date(landMs),
                        model: modelName
                    });

                    if (!allowMultiSameTarget) {
                        // Passa para a próxima
                    }
                }

                round++;
                if (!candidateFoundInRound) break;
            }
        });

        if (commands.length === 0) {
            const timeDiffHours = ((startMs - now) / 3600000).toFixed(1);
            const maxReachFields = ((startMs - now) / 1000 / 60 / speedMin).toFixed(1);
            alert(`❌ Não foi possível agendar fakes para a hora definida.\n\nMotivo: A hora de impacto é daqui a ${timeDiffHours}h, o que permite um alcance máximo de ${maxReachFields} campos para a unidade selecionada.\n\nSoluções:\n1. Aumenta a hora de impacto para mais tarde.\n2. Escolhe uma unidade mais rápida (ex: Cavalaria ou Batedor).\n3. Seleciona o grupo 'Todas as Aldeias'.`);
            return;
        }

        commands.sort((a, b) => a.launchTime - b.launchTime);
        lastGeneratedCommands = commands;
        lastGeneratedTarget = targets.join(' ');

        let rows = '', output = '';
        commands.forEach((cmd, i) => {
            rows += `<tr data-vid="${cmd.originId}">
                <td style="color:#94a3b8;">${i+1}</td>
                <td style="text-align:left; padding-left:10px; font-weight:bold; color:#38bdf8;">${cmd.originName}</td>
                <td style="font-weight:bold; color:#fbbf24;">${cmd.targetCoords}</td>
                <td>${cmd.dist}c</td>
                <td><b style="color:#f8fafc;">${cmd.launchTime.toLocaleTimeString('pt-PT')}:${String(cmd.launchTime.getMilliseconds()).padStart(3,'0')}</b></td>
                <td><b style="color:#38bdf8;">${cmd.landTime.toLocaleTimeString('pt-PT')}:${String(cmd.landTime.getMilliseconds()).padStart(3,'0')}</b></td>
                <td><b style="color:#f43f5e;">${cmd.model}</b></td>
            </tr>`;

            let u = `https://${location.host}/game.php?village=${cmd.originId}&screen=place&target_coord=${cmd.targetCoords}`;
            output += `[*]${i+1}. ${formatRussianDateTime(cmd.launchTime)} --- ${cmd.model}[|]${formatRussianDateTime(cmd.landTime)}[|] ${cmd.originCoords} --> ${cmd.targetCoords} [|][url=${u}]Link[/url]\n`;
        });

        document.getElementById('tw-f-tbody').innerHTML = rows;
        document.getElementById('tw-f-preview').value = output.trim();
        await navigator.clipboard.writeText(output.trim());
        document.getElementById('tw-f-status').innerHTML = `<span style="color:#34d399;">✅ ${commands.length} fakes gerados e copiados para o Clipboard!</span>`;
        showToast(`⚡ ${commands.length} Fakes copiados para a Área de Transferência!`);
    }

    // ==========================================
    // ABA 4: PLANEADOR DE ATAQUES & CAMPANHA MULTIALVO
    // ==========================================
    function renderAttackPlanner() {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 18 * 3600 * 1000);
        const landDefaultStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}T20:00:00`;

        const committedMap = getCommittedSchedules();
        const committedCount = Object.keys(committedMap).length;

        const nobleVillages = allVillages.filter(v => (v.snobsHome > 0 || v.snobsTotal > 0));
        let nobleOptions = nobleVillages.map(v => {
            const isComm = !!committedMap[v.id];
            const pal = (v.paladin && v.paladin.isHome) ? v.paladin : null;
            const palTag = pal ? ` [${pal.name}${pal.name === 'QuimConquista' ? ' ⚔️ Persuasão' : ''}]` : '';
            const nobleStatus = (v.snobsOutside > 0)
                ? `${v.snobsHome} na aldeia (⚠️ ${v.snobsOutside} fora)`
                : `${v.snobsHome} Nobres`;
            return `<option value="${v.id}">${cleanVillageDisplayName(v)} • ${nobleStatus}${palTag}${isComm ? ' [🔒 Reservada]' : ''}</option>`;
        }).join('');
        if (!nobleOptions) nobleOptions = `<option value="">❌ Nenhuma aldeia com nobres</option>`;

        const paladinOptionsHtml = allAccountPaladins.map(p => {
            const roleIcon = p.isOffense ? '⚔️' : '🛡️';
            const note = p.name === 'QuimConquista' ? ' • Persuasão 4 / Arrebentar' : (p.name === 'Antoniooo' ? ' • Destruição 4 / Arrebentar' : (p.isOffense ? ' • Ataque' : ' • Defesa'));
            return `<option value="${p.id}">${roleIcon} ${p.name} (Lvl ${p.level}${note})</option>`;
        }).join('');

        document.getElementById('tw-main-body').innerHTML = `
            <div class="tw-pane active" id="tw-pane-planner" style="padding: 4px 6px 24px 4px; gap:8px; display:flex; flex-direction:column; flex-grow:1; min-height:0; overflow-y:auto; overflow-x:hidden;">
                <!-- GRID PRINCIPAL DE 3 COLUNAS BALANCEADAS -->
                <div style="display:grid; grid-template-columns: 1.35fr 1.25fr 1.05fr; gap:10px; flex-shrink:0;">
                    
                    <!-- COLUNA 1: ALVO, MODO DE OPERAÇÃO & NOBRES -->
                    <div class="tw-card" style="padding:10px 12px; gap:5px;">
                        <div class="tw-card-title" style="color:#fbbf24; font-size:11px;">
                            <span>🎯 1. Alvo & Operação</span>
                            <div style="display:flex; gap:3px;">
                                <button class="tw-pill ${plannerMode==='single'?'active':''}" id="tw-btn-mode-single" style="padding:2px 7px; font-size:9.5px;">🎯 Único</button>
                                <button class="tw-pill ${plannerMode==='multi'?'active':''}" id="tw-btn-mode-multi" style="padding:2px 7px; font-size:9.5px;">🌐 Multialvo</button>
                            </div>
                        </div>

                        <!-- MODO ALVO ÚNICO -->
                        <div id="tw-box-target-single" style="display:${plannerMode==='single'?'grid':'none'}; grid-template-columns: 1fr 1fr; gap:6px;">
                            <div style="display:flex; flex-direction:column; gap:1px;">
                                <span style="font-size:9px; color:#94a3b8;">Coordenada:</span>
                                <input type="text" id="tw-nt-target" class="tw-input" placeholder="xxx|yyy" maxlength="7" style="font-weight:bold; color:#fbbf24; text-align:center; padding:5px 6px; font-size:12px;">
                            </div>
                            <div style="display:flex; flex-direction:column; gap:1px;">
                                <span style="font-size:9px; color:#94a3b8;">Impacto Chegada:</span>
                                <input type="datetime-local" id="tw-nt-landtime" class="tw-input" step="1" value="${landDefaultStr}" style="padding:5px 6px; font-size:11px;">
                            </div>
                        </div>

                        <!-- MODO CAMPANHA MULTIALVO -->
                        <div id="tw-box-target-multi" style="display:${plannerMode==='multi'?'flex':'none'}; flex-direction:column; gap:3px;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <span style="font-size:9.5px; color:#c084fc; font-weight:bold;">Alvos da Campanha:</span>
                                <button class="tw-btn tw-btn-blue" id="tw-btn-open-map-planner" style="padding:2px 7px; font-size:9.5px;">🗺️ Seleção no Mapa</button>
                            </div>
                            <textarea id="tw-nt-targets-multi" class="tw-textarea" style="height:58px; min-height:52px; font-size:11px; padding:6px 8px; line-height:1.4;" placeholder="Cola lista de alvos (ex: 500|500 501|501 502|502) ou clica em Seleção no Mapa...">${Array.from(grabbedTargets).join(' ')}</textarea>
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1px;">
                                <span style="font-size:9.5px; color:#94a3b8;">Impacto Chegada (OP):</span>
                                <input type="datetime-local" id="tw-nt-landtime-multi" class="tw-input" step="1" value="${landDefaultStr}" style="padding:3px 6px; font-size:11px; width:155px;">
                            </div>
                            <div id="tw-nt-multi-hud" style="font-size:10px; color:#34d399; font-weight:bold; background:rgba(52, 211, 153, 0.1); padding:4px 6px; border-radius:4px; margin-top:2px;">
                                🎯 0 Alvos | 👑 0 Nobres req.
                            </div>
                        </div>

                        <!-- ATALHOS RÁPIDOS DE HORA -->
                        <div style="display:flex; gap:3px; justify-content:space-between; margin-top:2px;">
                            <button class="tw-pill" id="tw-btn-min-impact" style="padding:2px 7px; font-size:9.5px; background:linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(234, 88, 12, 0.25)); border:1px solid #f59e0b; color:#fbbf24; font-weight:bold;" title="Calcula e preenche automaticamente o horário de chegada mais cedo viável (tendo em conta regresso de tropas e produção na academia)">⚡ Horário Mínimo</button>
                            <button class="tw-pill tw-time-shortcut" data-add-h="4" style="padding:2px 6px; font-size:9.5px;">+4h</button>
                            <button class="tw-pill tw-time-shortcut" data-add-h="8" style="padding:2px 6px; font-size:9.5px;">+8h</button>
                            <button class="tw-pill tw-time-shortcut" data-add-h="12" style="padding:2px 6px; font-size:9.5px;">+12h</button>
                            <button class="tw-pill tw-time-shortcut" data-set-h="20" style="padding:2px 6px; font-size:9.5px;">20:00</button>
                            <button class="tw-pill tw-time-shortcut" data-set-h="08" style="padding:2px 6px; font-size:9.5px;">08:00</button>
                        </div>

                        <!-- SELETOR DE MODO DE ATAQUE EXPANDIDO -->
                        <div style="display:flex; flex-direction:column; gap:1px; margin-top:2px;">
                            <span style="font-size:9.5px; color:#fbbf24; font-weight:bold;">Modo de Ataque (Perfil):</span>
                            <select id="tw-nt-attack-mode" class="tw-select" style="padding:5px 6px; font-size:11.5px; font-weight:bold; color:#38bdf8;">
                                <option value="standard_anti" selected>🛡️ NT + Escoltas Anti-Snipe (Full / 3 Aldeias)</option>
                                <option value="standard_anti_50">🛡️ NT + Anti-Snipe 50% (2 Aldeias / Fácil)</option>
                                <option value="nt_simple">👑 NT Simples (Ondas de Nobres Diretas)</option>
                                <option value="nt_clean">⚔️ NT + Nuke Limpeza (Sem Anti-Snipe)</option>
                                <option value="split_2x2">🔀 NT Dividido (Split 2x2 Aldeias Distintas)</option>
                                <option value="snob_solo">🔄 Re-Nobre: Bate e Volta (1 Nobre / 4 Viagens)</option>
                                <option value="snob_single">🎯 1 Nobre Solitário (Re-Nobre Rápido / 1 Ataque)</option>
                                <option value="nuke_sweep">💥 Apenas Limpeza / Nuke Sweep (Sem Nobres)</option>
                                <option value="cat_demolish">🏚️ Demolição Tática (Catapultas em Edifício)</option>
                                <option value="full_storm">🌪️ Full Storm OP (Anti-Desvio Praça + NT + Bunkers)</option>
                            </select>
                        </div>

                        <!-- CONTROLOS DE NOBRES & INTERVALO -->
                        <div style="display:flex; flex-direction:column; gap:4px; margin-top:2px;" id="tw-box-noble-controls">
                            <div style="display:grid; grid-template-columns: 1.1fr 1fr; gap:4px;">
                                <div style="display:flex; flex-direction:column; gap:1px;">
                                    <span style="font-size:9px; color:#94a3b8;" id="tw-lbl-noble-count">Qtd Nobres:</span>
                                    <select id="tw-nt-noble-count" class="tw-select" style="padding:4px 6px; font-size:11px; font-weight:bold; color:#fbbf24;">
                                        <option value="0">0 Nobres (Apenas Limpeza)</option>
                                        <option value="1">1 Nobre / 1 Viagem</option>
                                        <option value="2">2 Nobres / 2 Viagens</option>
                                        <option value="3">3 Nobres / 3 Viagens</option>
                                        <option value="4" selected>4 Nobres / 4 Viagens</option>
                                        <option value="5">5 Nobres (Recup. Rápida)</option>
                                    </select>
                                </div>
                                <div style="display:flex; flex-direction:column; gap:1px;" id="tw-box-ms-interval">
                                    <span style="font-size:9px; color:#94a3b8;">Intervalo NT (ms):</span>
                                    <input type="number" id="tw-nt-ms-interval" class="tw-input" value="200" min="50" max="1000" style="padding:4px 6px; font-size:11px; text-align:center; font-weight:bold; color:#fbbf24;" title="Intervalo em milissegundos entre as ondas do Trem de Nobres">
                                </div>
                            </div>
                            <div style="display:grid; grid-template-columns: 1fr; gap:4px;" id="tw-box-noble-suboptions">
                                <div style="display:flex; flex-direction:column; gap:1px;" id="tw-box-noble-arch">
                                    <span style="font-size:9px; color:#94a3b8;">Arquitetura do NT:</span>
                                    <select id="tw-nt-architecture" class="tw-select" style="padding:4px 6px; font-size:11px;">
                                        <option value="single_4" selected>Única Aldeia</option>
                                        <option value="split_2x2">Dividida 2x2</option>
                                    </select>
                                </div>
                                <div style="display:none; flex-direction:column; gap:1px;" id="tw-box-batevolta-anchor">
                                    <span style="font-size:9px; color:#38bdf8;">Âncora Bate e Volta:</span>
                                    <select id="tw-nt-bv-anchor" class="tw-select" style="padding:4px 6px; font-size:11px; font-weight:bold; color:#38bdf8;">
                                        <option value="first" selected>1ª Viagem (Início)</option>
                                        <option value="final">Última (Conquista)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- SELEÇÃO MANUAL DE ALDEIA DE NOBRES (SÓ NO MODO ÚNICO) -->
                        <div id="tw-box-manual-nobles" style="display:${plannerMode==='single'?'block':'none'};">
                            <!-- BANNER INDICADOR DE PROXIMIDADE DE NOBRES -->
                            <div id="tw-nt-noble-proximity-hint" style="margin-bottom:5px; padding:4px 7px; background:rgba(30, 41, 59, 0.6); border:1px dashed #475569; border-radius:4px; font-size:9.5px; color:#94a3b8; line-height:1.3; transition:all 0.2s ease;">
                                🎯 <i>Insere a coordenada do alvo acima para ver a aldeia de nobres mais próxima e tempos de viagem.</i>
                            </div>

                            <div style="display:flex; flex-direction:column; gap:1px;" id="tw-box-noble-primary">
                                <span style="font-size:9px; color:#94a3b8;" id="tw-lbl-noble-primary">Aldeia Nobres Principal:</span>
                                <select id="tw-nt-noble-village" class="tw-select" style="padding:4px 6px; font-size:11px;">${nobleOptions}</select>
                            </div>
                            <div style="display:none; flex-direction:column; gap:1px;" id="tw-box-noble-secondary">
                                <span style="font-size:9px; color:#94a3b8;">Aldeia Nobres Secundária:</span>
                                <select id="tw-nt-noble-village-2" class="tw-select" style="padding:4px 6px; font-size:11px;">${nobleOptions}</select>
                            </div>
                        </div>

                        <!-- INDICAÇÃO IA NO MODO MULTIALVO -->
                        <div id="tw-box-auto-nobles-hint" style="display:${plannerMode==='multi'?'block':'none'}; padding:5px 7px; background:rgba(56, 189, 248, 0.1); border:1px dashed #0284c7; border-radius:4px; font-size:9.5px; color:#bae6fd; line-height:1.3;">
                            🤖 <b>IA de Atribuição:</b> As melhores aldeias de nobres e nukes serão alocadas automaticamente a cada alvo por menor tempo de viagem.
                        </div>

                        <!-- EXCLUSÃO INTELIGENTE DE ALDEIAS RESERVADAS -->
                        <div style="display:flex; align-items:center; gap:5px; margin-top:2px; padding:3px 6px; background:rgba(126, 34, 206, 0.15); border:1px solid rgba(126, 34, 206, 0.4); border-radius:4px;">
                            <input type="checkbox" id="tw-nt-exclude-committed" checked style="cursor:pointer; width:13px; height:13px;">
                            <label for="tw-nt-exclude-committed" style="cursor:pointer; font-size:9.5px; color:#e9d5ff; font-weight:bold;">
                                🔒 Ignorar aldeias agendadas (${committedCount})
                            </label>
                        </div>
                    </div>

                    <!-- COLUNA 2: LIMPEZAS, ESCÔRTAS & MODELOS -->
                    <div class="tw-card" style="padding:10px 12px; gap:5px;">
                        <div class="tw-card-title" style="color:#f87171; font-size:11px;">⚔️ 2. Limpezas, Escoltas & Modelos</div>
                        
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:4px;">
                            <div style="display:flex; flex-direction:column; gap:1px;">
                                <span style="font-size:9px; color:#94a3b8;">Nukes Limpeza:</span>
                                <input type="number" id="tw-nt-lead-nukes" class="tw-input" value="1" min="0" max="10" style="padding:4px 6px; font-size:11px; text-align:center; font-weight:bold; color:#f87171;">
                            </div>
                            <div style="display:flex; flex-direction:column; gap:1px;">
                                <span style="font-size:9px; color:#f87171; font-weight:bold;">🎯 Alvo Cats (Nuke):</span>
                                <select id="tw-nt-nuke-cat-target" class="tw-select" style="padding:4px 6px; font-size:10.5px; font-weight:bold; color:#f87171;" title="Alvo caso o modelo de Nuke leve catapultas">
                                    <option value="place" selected>Praça (place)</option>
                                    <option value="wall">Muralha (wall)</option>
                                    <option value="farm">Fazenda (farm)</option>
                                    <option value="smith">Ferreiro (smith)</option>
                                    <option value="main">Ed. Principal (main)</option>
                                    <option value="barracks">Quartel (barracks)</option>
                                    <option value="storage">Armazém (storage)</option>
                                    <option value="none">Nenhum</option>
                                </select>
                            </div>
                        </div>

                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:4px;">
                            <div style="display:flex; flex-direction:column; gap:1px;">
                                <span style="font-size:9px; color:#94a3b8;">Escoltas Anti-Snipe:</span>
                                <select id="tw-nt-anti-mode" class="tw-select" style="padding:4px 6px; font-size:10px; font-weight:bold; color:#38bdf8;">
                                    <option value="anti_50_2" selected>🛡️ 2 Escoltas (50% / 2 Aldeias)</option>
                                    <option value="anti_full_3">⚔️ 3 Escoltas (Full / 3 Aldeias)</option>
                                    <option value="anti_full_1">🎯 1 Escolta (Full / 1 Aldeia)</option>
                                    <option value="anti_50_1">🛡️ 1 Escolta (50% / 1 Aldeia)</option>
                                    <option value="none">❌ 0 Escoltas (Desativado)</option>
                                </select>
                            </div>
                            <div style="display:flex; flex-direction:column; gap:1px;">
                                <span style="font-size:9px; color:#38bdf8; font-weight:bold;">🎯 Alvo Cats (Anti-Snipe):</span>
                                <select id="tw-nt-anti-cat-target" class="tw-select" style="padding:4px 6px; font-size:10.5px; font-weight:bold; color:#38bdf8;" title="Alvo caso as tropas do Anti-Snipe levem catapultas">
                                    <option value="none" selected>Nenhum</option>
                                    <option value="place">Praça (place)</option>
                                    <option value="wall">Muralha (wall)</option>
                                    <option value="farm">Fazenda (farm)</option>
                                    <option value="smith">Ferreiro (smith)</option>
                                    <option value="main">Ed. Principal (main)</option>
                                    <option value="barracks">Quartel (barracks)</option>
                                    <option value="storage">Armazém (storage)</option>
                                </select>
                            </div>
                        </div>

                        <!-- ONDA DEDICADA DE DEMOLIÇÃO TÁTICA (APENAS VISÍVEL QUANDO PERFIL É DEMOLIÇÃO TÁTICA) -->
                        <div id="tw-box-cat-demolish" style="display:none; flex-direction:column; gap:2px; padding:4px 6px; background:rgba(244, 63, 94, 0.08); border:1px dashed rgba(244, 63, 94, 0.4); border-radius:4px;">
                            <span style="font-size:9.5px; color:#fb7185; font-weight:bold;">🏚️ Alvo Demolição Tática (-10m/-15m):</span>
                            <select id="tw-nt-cat-target-building" class="tw-select" style="padding:4px 6px; font-size:10.5px; font-weight:bold; color:#fb7185;">
                                <option value="place">Praça de Reunião (place)</option>
                                <option value="wall">Muralha (wall)</option>
                                <option value="farm">Fazenda (farm)</option>
                                <option value="smith">Ferreiro (smith)</option>
                                <option value="main" selected>Edifício Principal (main)</option>
                                <option value="barracks">Quartel (barracks)</option>
                                <option value="storage">Armazém (storage)</option>
                                <option value="none">Nenhum</option>
                            </select>
                        </div>

                        <!-- SELETOR E TICKBOX DE PALADINO NO NUKE (Dimmed se 0 Nukes) -->
                        <div id="tw-box-paladin-nuke" style="display:flex; flex-direction:column; gap:4px; margin:1px 0; padding:4px 6px; background:rgba(239, 68, 68, 0.1); border:1px solid rgba(239, 68, 68, 0.3); border-radius:4px; transition:0.2s;">
                            <div style="display:flex; align-items:center; justify-content:space-between; gap:5px;">
                                <label style="display:flex; align-items:center; gap:5px; cursor:pointer; font-size:9.5px; color:#fca5a5; font-weight:bold; margin:0;">
                                    <input type="checkbox" id="tw-nt-req-paladin-nuke" checked style="cursor:pointer; width:13px; height:13px;">
                                    🛡️ Priorizar Paladino no Nuke
                                </label>
                                <span style="font-size:8.5px; color:#94a3b8;">(Aviso 3h31m)</span>
                            </div>
                            <div id="tw-box-paladin-select" style="display:flex; align-items:center; gap:4px;">
                                <span style="font-size:9px; color:#cbd5e1; white-space:nowrap; font-weight:600;">🎯 Paladino:</span>
                                <select id="tw-nt-paladin-choice" class="tw-select" style="font-size:9.5px; padding:1px 4px; background:#1e1b4b; border:1px solid #7c3aed; color:#e9d5ff; flex:1; text-overflow:ellipsis;" title="Escolhe qual Paladino usar na Limpeza (ex: poupar QuimConquista para Nobres/Persuasão)">
                                    <option value="auto">⚡ Auto (Melhor Ofensivo)</option>
                                    ${paladinOptionsHtml}
                                </select>
                            </div>
                        </div>

                        <!-- SELETOR MANUAL E INTELIGENTE DE ALDEIA DO NUKE PRINCIPAL -->
                        <div id="tw-box-lead-nuke-village" style="display:flex; flex-direction:column; gap:3px; margin:1px 0; padding:4px 6px; background:rgba(239, 68, 68, 0.08); border:1px dashed rgba(239, 68, 68, 0.3); border-radius:4px;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <span style="font-size:9.5px; color:#f87171; font-weight:bold;">🎯 Aldeia Nuke Principal:</span>
                                <label style="font-size:8.5px; color:#fca5a5; display:flex; align-items:center; gap:3px; cursor:pointer;" title="Dá prioridade a Full Nukes reais (Fazenda ≥ 20.000) sobre Semi Nukes incompletos">
                                    <input type="checkbox" id="tw-nt-prefer-full-nukes" checked style="cursor:pointer; width:12px; height:12px;">
                                    Priorizar Fulls (≥20k)
                                </label>
                            </div>
                            <select id="tw-nt-lead-nuke-village" class="tw-select" style="font-size:9.5px; padding:2px 4px; font-weight:bold; color:#fca5a5; background:#1e1b4b; border:1px solid #ef4444; width:100%; text-overflow:ellipsis;">
                                <option value="auto">⚡ Auto (Melhor Full Nuke mais perto)</option>
                            </select>
                            <div id="tw-nt-nuke-proximity-hint" style="font-size:8.5px; color:#94a3b8; line-height:1.2;">
                                🎯 Insere a coordenada do alvo para ver aldeias de nuke e tropas disponíveis.
                            </div>
                        </div>

                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:4px;">
                            <div style="display:flex; flex-direction:column; gap:1px;">
                                <span style="font-size:8.5px; color:#94a3b8;">Mod. Nuke:</span>
                                <input type="text" id="tw-nt-model-nuke" class="tw-input" value="Ataque Full" style="font-weight:bold; color:#f87171; padding:3px 5px; font-size:10.5px;">
                            </div>
                            <div style="display:flex; flex-direction:column; gap:1px;">
                                <span style="font-size:8.5px; color:#94a3b8;">Mod. Anti-Snipe:</span>
                                <input type="text" id="tw-nt-model-anti" class="tw-input" value="Ataque 50%" style="font-weight:bold; color:#38bdf8; padding:3px 5px; font-size:10.5px;">
                            </div>
                        </div>

                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:4px;">
                            <div style="display:flex; flex-direction:column; gap:1px;">
                                <span style="font-size:8.5px; color:#94a3b8;">Mod. NT:</span>
                                <input type="text" id="tw-nt-model-snob" class="tw-input" value="NT 25%" style="font-weight:bold; color:#fbbf24; padding:3px 5px; font-size:10.5px;">
                            </div>
                            <div style="display:flex; flex-direction:column; gap:1px;">
                                <span style="font-size:8.5px; color:#94a3b8;">Mod. Catapultas:</span>
                                <input type="text" id="tw-nt-model-cats" class="tw-input" value="Cats" style="font-weight:bold; color:#f43f5e; padding:3px 5px; font-size:10.5px;">
                            </div>
                        </div>
                    </div>

                    <!-- COLUNA 3: BUNKER CONQUISTA + FAKES EM RAIO (EMPILHADOS) -->
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        
                        <!-- CARD 3: BUNKER CIRÚRGICO C/ PALADINO -->
                        <div class="tw-card" id="tw-card-bunker" style="border-color:#059669; background:rgba(6, 78, 59, 0.2); padding:8px 10px; gap:4px;">
                            <div class="tw-card-title" style="color:#34d399; font-size:11px;">
                                <span>🛡️ 3. Bunker Conquista</span>
                                <select id="tw-nt-bunker-count" class="tw-select" style="font-weight:bold; color:#34d399; padding:2px 4px; font-size:10px;">
                                    <option value="0">0 Apoios</option>
                                    <option value="1">1 Apoio</option>
                                    <option value="2" selected>2 Apoios</option>
                                    <option value="3">3 Apoios</option>
                                    <option value="4">4 Apoios</option>
                                </select>
                            </div>
                            
                            <div id="tw-box-bunker-inputs" style="display:flex; flex-direction:column; gap:4px; transition:opacity 0.2s ease;">
                                <div style="display:grid; grid-template-columns: 1.1fr 1fr; gap:4px;">
                                    <div style="display:flex; flex-direction:column; gap:1px;">
                                        <span style="font-size:9px; color:#a7f3d0;">Gap Nobre (ms):</span>
                                        <input type="number" id="tw-nt-bunker-gap" class="tw-input" value="200" min="50" max="2000" step="50" style="font-weight:bold; color:#34d399; text-align:center; padding:3px 5px; font-size:10.5px;">
                                    </div>
                                    <div style="display:flex; flex-direction:column; gap:1px;">
                                        <span style="font-size:9px; color:#a7f3d0;">Degrau / Apoio:</span>
                                        <input type="number" id="tw-nt-bunker-step" class="tw-input" value="50" min="10" max="500" step="10" style="font-weight:bold; color:#34d399; text-align:center; padding:3px 5px; font-size:10.5px;">
                                    </div>
                                </div>

                                <div style="display:flex; flex-direction:column; gap:2px;">
                                    <div style="display:grid; grid-template-columns: 1.4fr 1fr; gap:4px;">
                                        <input type="text" id="tw-nt-model-bunker-1" class="tw-input" value="BUNK" placeholder="Preset 1" style="font-weight:bold; color:#34d399; padding:3px 5px; font-size:10.5px;">
                                        <input type="number" id="tw-nt-pop-bunker-1" class="tw-input" value="12000" placeholder="Pop Mín" style="text-align:center; padding:3px 5px; font-size:10.5px;">
                                    </div>
                                    <div style="display:grid; grid-template-columns: 1.4fr 1fr; gap:4px;">
                                        <input type="text" id="tw-nt-model-bunker-2" class="tw-input" value="BUNK" placeholder="Preset 2" style="font-weight:bold; color:#34d399; padding:3px 5px; font-size:10.5px;">
                                        <input type="number" id="tw-nt-pop-bunker-2" class="tw-input" value="4000" placeholder="Pop Mín" style="text-align:center; padding:3px 5px; font-size:10.5px;">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- CARD 4: CORTINA DE FAKES & SATURAÇÃO -->
                        <div class="tw-card" id="tw-card-fakes" style="border-color:#a855f7; background:rgba(88, 28, 135, 0.2); padding:8px 10px; gap:4px;">
                            <div class="tw-card-title" style="color:#c084fc; font-size:11px;">
                                <div style="display:flex; align-items:center; gap:4px;">
                                    <input type="checkbox" id="tw-nt-fake-enable" style="cursor:pointer; width:13px; height:13px;">
                                    <label for="tw-nt-fake-enable" style="cursor:pointer;">🎭 Fakes & Saturação</label>
                                </div>
                                <span style="font-size:8.5px; color:#a855f7;">Arsenal Tático</span>
                            </div>
                            
                            <div id="tw-box-fakes-inputs" style="display:flex; flex-direction:column; gap:4px; opacity:0.4; pointer-events:none; transition:opacity 0.2s ease;">
                                <!-- Linha 1: Raio livre e Fakes por Aldeia -->
                                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:4px;">
                                    <div style="display:flex; flex-direction:column; gap:1px;">
                                        <span style="font-size:8.5px; color:#e9d5ff;">Raio (campos):</span>
                                        <input type="number" id="tw-nt-fake-radius" class="tw-input" value="8" min="1" max="50" style="text-align:center; font-weight:bold; color:#c084fc; padding:3px 5px; font-size:10.5px;" title="Raio de proximidade em torno do alvo (ex: 3, 5, 8, 12, 15 campos)">
                                    </div>
                                    <div style="display:flex; flex-direction:column; gap:1px;">
                                        <span style="font-size:8.5px; color:#e9d5ff;">Fakes / Aldeia:</span>
                                        <input type="number" id="tw-nt-fake-count" class="tw-input" value="3" min="1" max="50" style="text-align:center; font-weight:bold; color:#c084fc; padding:3px 5px; font-size:10.5px;" title="Quantos fakes enviar para cada aldeia inimiga encontrada no raio">
                                    </div>
                                </div>

                                <!-- Linha 2: Estilo e Modelo -->
                                <div style="display:grid; grid-template-columns: 1.2fr 0.8fr; gap:4px;">
                                    <div style="display:flex; flex-direction:column; gap:1px;">
                                        <span style="font-size:8.5px; color:#e9d5ff;">Estilo de Envio:</span>
                                        <select id="tw-nt-fake-style" class="tw-select" style="font-weight:bold; color:#c084fc; padding:3px 4px; font-size:10px;">
                                            <option value="single" selected>🎯 Simples (30m/c)</option>
                                            <option value="fake_nt">🚂 Fake NT (4x 100ms)</option>
                                            <option value="snob">👑 Nobre (35m/c)</option>
                                            <option value="spy">🕵️ Espião (9m/c)</option>
                                        </select>
                                    </div>
                                    <div style="display:flex; flex-direction:column; gap:1px;">
                                        <span style="font-size:8.5px; color:#e9d5ff;">Mod. Tropas:</span>
                                        <input type="text" id="tw-nt-fake-model" class="tw-input" value="Fake" style="font-weight:bold; color:#c084fc; padding:3px 4px; font-size:10px;">
                                    </div>
                                </div>

                                <!-- Linha 3: Máx Fakes / Aldeia Própria e Incluir Alvo Real -->
                                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:4px; align-items:center;">
                                    <div style="display:flex; flex-direction:column; gap:1px;">
                                        <span style="font-size:8.5px; color:#e9d5ff;">Máx/Aldeia Tua:</span>
                                        <input type="number" id="tw-nt-fake-max-origin" class="tw-input" value="2" min="1" max="20" style="text-align:center; font-weight:bold; color:#c084fc; padding:3px 5px; font-size:10px;" title="Limite máximo de fakes que cada uma das tuas aldeias pode enviar para poupar aríetes">
                                    </div>
                                    <div style="display:flex; align-items:center; margin-top:10px;">
                                        <label style="display:flex; align-items:center; gap:3px; font-size:9px; color:#e9d5ff; cursor:pointer; font-weight:600; white-space:nowrap;" title="Envia também fakes para o alvo real para camuflar os nobres e nukes">
                                            <input type="checkbox" id="tw-nt-fake-include-target" checked style="cursor:pointer; width:12px; height:12px;">
                                            🎯 Alvo Real
                                        </label>
                                    </div>
                                </div>

                                <!-- Linha 4: Fakes Inteligentes (1% Dinâmico por Pontos) -->
                                <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(88, 28, 135, 0.25); border:1px solid rgba(192, 132, 252, 0.3); border-radius:4px; padding:3px 6px;">
                                    <label style="display:flex; align-items:center; gap:5px; font-size:9px; color:#f3e8ff; cursor:pointer; font-weight:bold; white-space:nowrap;" title="Ativa a seleção automática de modelos escalonados (Fake_60, Fake_90, Fake_115, Fake_135) por pontos da aldeia para nunca violar a regra de 1% fake limit">
                                        <input type="checkbox" id="tw-nt-fake-smart-limit" style="cursor:pointer; width:12px; height:12px;">
                                        🧠 Fakes Inteligentes (1% Dinâmico)
                                    </label>
                                    <span style="font-size:8px; color:#c084fc; font-weight:600;" title="Escalões: _60 (≤6k), _90 (≤9k), _115 (≤11.5k), _135 (>11.5k)">_60/_90/_115/_135</span>
                                </div>

                                <div id="tw-nt-fake-info" style="padding:3px 5px; background:rgba(2, 6, 23, 0.7); border:1px solid #4c1d95; border-radius:4px; font-size:8.5px; color:#d8b4fe; line-height:1.2;">
                                    🎯 Insere o alvo para filtrar as aldeias do defensor.
                                </div>
                            </div>
                        </div>

                    </div>

                </div>

                <!-- BARRA DE AÇÕES: GERAR + BOTÃO DE MEMÓRIA DE 1H -->
                <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0; margin-top:2px; flex-shrink:0;">
                    <div style="display:flex; gap:10px; align-items:center;">
                        <button class="tw-btn tw-btn-gold" id="tw-btn-gen-nt-russo" style="padding:8px 22px; font-size:12.5px; font-weight:bold; box-shadow:0 0 12px rgba(245, 158, 11, 0.3);">
                            ⚡ Gerar Plano de Ataque (Copiar BBCode)
                        </button>
                        <div style="display:flex; align-items:center; gap:4px; background:#0f172a; border:1px solid #7e22ce; border-radius:6px; padding:3px 8px;">
                            <button class="tw-btn tw-btn-purple" id="tw-btn-commit-1h" style="padding:4px 10px; font-size:11px; font-weight:bold;" title="Regista na memória que as aldeias desta operação estão ocupadas">
                                💾 Agendamento feito - guardar durante:
                            </button>
                            <select id="tw-commit-duration" class="tw-select" style="padding:2px 4px; font-size:11px; font-weight:bold; color:#e9d5ff; border:none; background:transparent;">
                                <option value="3600000" selected>1 hora</option>
                                <option value="7200000">2 horas</option>
                                <option value="14400000">4 horas</option>
                                <option value="43200000">12 horas</option>
                                <option value="86400000">24 horas</option>
                            </select>
                        </div>
                    </div>
                    <span id="tw-nt-status" style="font-size:12px; font-weight:bold;"></span>
                </div>

                <!-- PREVIEW & VISUALIZAÇÃO DE COMANDOS (FLEXÍVEL E EXPANDÍVEL) -->
                <div style="display:flex; flex-direction:column; gap:6px; flex-grow:1; min-height:220px; margin-top:2px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
                        <div style="display:flex; align-items:center; gap:6px;">
                            <span style="font-size:10.5px; font-weight:bold; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em;">Visualização de Comandos & Links:</span>
                            <span id="tw-nt-cmd-counter" style="display:inline-block; font-size:10px; font-weight:bold; padding:2px 7px; background:#1e293b; color:#38bdf8; border-radius:10px; border:1px solid #0284c7;">0 comandos</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:6px;">
                            <button class="tw-btn" id="tw-btn-copy-bbcode" style="padding:3px 10px; font-size:10px; font-weight:bold; background:#0f172a; border-color:#f59e0b; color:#fbbf24; box-shadow:0 0 6px rgba(245,158,11,0.2);" title="Copia o código BBCode gerado diretamente para o clipboard">
                                📋 Copiar BBCode
                            </button>
                            <button class="tw-btn" id="tw-btn-toggle-bbcode-view" style="padding:3px 10px; font-size:10px; font-weight:bold; background:#0f172a; border-color:#64748b; color:#cbd5e1;" title="Mostra ou esconde a caixa de texto com o BBCode bruto">
                                👁️ Ver BBCode
                            </button>
                            <button class="tw-btn" id="tw-btn-toggle-table-size" style="padding:3px 10px; font-size:10px; font-weight:bold; background:#0f172a; border-color:#0284c7; color:#38bdf8; box-shadow:0 0 6px rgba(56,189,248,0.2);" title="Alterna entre visualização normal e expandida de todos os comandos">
                                ↕️ Expandir Tabela
                            </button>
                        </div>
                    </div>
                    <textarea id="tw-nt-preview" class="tw-textarea" style="display:none; height:44px; min-height:44px; max-height:80px; font-size:10.5px; padding:4px 8px;" placeholder="Configura os parâmetros e clica em Gerar... O BBCode é copiado automaticamente para o clipboard para colares no PS!"></textarea>
                    
                    <div class="tw-panel" id="tw-nt-table-panel" style="min-height:220px; max-height:420px; overflow-y:auto; border:1px solid #1e293b; border-radius:8px; background:#020617; transition:max-height 0.2s ease;">
                        <table class="tw-table" id="tw-nt-table" style="font-size:11px;">
                            <thead>
                                <tr>
                                    <th style="width:28px; padding:4px 6px;">#</th>
                                    <th style="width:140px; padding:4px 6px;">Fase do Comando</th>
                                    <th style="text-align:left; width:180px; padding:4px 6px 4px 10px;">Origem</th>
                                    <th style="width:70px; padding:4px 6px;">Alvo</th>
                                    <th style="width:60px; padding:4px 6px;">Dist.</th>
                                    <th style="width:130px; padding:4px 6px;">Hora de Envio</th>
                                    <th style="width:130px; padding:4px 6px;">Hora de Impacto</th>
                                    <th style="width:120px; padding:4px 6px;">Modelo & Pop</th>
                                </tr>
                            </thead>
                            <tbody id="tw-nt-tbody">
                                <tr><td colspan="8" style="padding:16px; color:#94a3b8; font-size:11px;">Define os parâmetros e clica em 'Gerar Plano de Ataque'.</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        // Alternância entre Alvo Único e Campanha Multialvo
        document.getElementById('tw-btn-mode-single').onclick = () => {
            plannerMode = 'single';
            renderAttackPlanner();
        };
        document.getElementById('tw-btn-mode-multi').onclick = () => {
            plannerMode = 'multi';
            renderAttackPlanner();
        };

        // Alternância de Tamanho da Tabela de Comandos
        const btnToggleTable = document.getElementById('tw-btn-toggle-table-size');
        const tablePanel = document.getElementById('tw-nt-table-panel');
        let isTableExpanded = false;
        if (btnToggleTable && tablePanel) {
            btnToggleTable.onclick = () => {
                isTableExpanded = !isTableExpanded;
                if (isTableExpanded) {
                    tablePanel.style.maxHeight = 'none';
                    btnToggleTable.innerHTML = '🔼 Reduzir Tabela';
                    btnToggleTable.style.borderColor = '#d97706';
                    btnToggleTable.style.color = '#fbbf24';
                    tablePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                    tablePanel.style.maxHeight = '420px';
                    btnToggleTable.innerHTML = '↕️ Expandir Tabela';
                    btnToggleTable.style.borderColor = '#0284c7';
                    btnToggleTable.style.color = '#38bdf8';
                }
            };
        }

        // Botão de Copiar BBCode Manual
        const btnCopyBB = document.getElementById('tw-btn-copy-bbcode');
        if (btnCopyBB) {
            btnCopyBB.onclick = async () => {
                const previewEl = document.getElementById('tw-nt-preview');
                const val = previewEl ? previewEl.value.trim() : '';
                if (!val) {
                    showToast('⚠️ Gera primeiro o plano para teres BBCode.');
                    return;
                }
                try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(val);
                    }
                    showToast('📋 BBCode copiado para o Clipboard!');
                } catch (e) {
                    showToast('❌ Erro ao copiar BBCode.');
                }
            };
        }

        // Botão de Alternar Visualização do BBCode
        const btnToggleBB = document.getElementById('tw-btn-toggle-bbcode-view');
        const previewTextarea = document.getElementById('tw-nt-preview');
        if (btnToggleBB && previewTextarea) {
            btnToggleBB.onclick = () => {
                if (previewTextarea.style.display === 'none') {
                    previewTextarea.style.display = 'block';
                    btnToggleBB.innerHTML = '🙈 Ocultar BBCode';
                    btnToggleBB.style.borderColor = '#fbbf24';
                    btnToggleBB.style.color = '#fbbf24';
                } else {
                    previewTextarea.style.display = 'none';
                    btnToggleBB.innerHTML = '👁️ Ver BBCode';
                    btnToggleBB.style.borderColor = '#64748b';
                    btnToggleBB.style.color = '#cbd5e1';
                }
            };
        }

        // Alternância de Ativação de Fakes
        const chkFakeEnable = document.getElementById('tw-nt-fake-enable');
        const boxFakesInputs = document.getElementById('tw-box-fakes-inputs');
        if (chkFakeEnable && boxFakesInputs) {
            chkFakeEnable.onchange = () => {
                const isEnabled = chkFakeEnable.checked;
                boxFakesInputs.style.opacity = isEnabled ? '1' : '0.4';
                boxFakesInputs.style.pointerEvents = isEnabled ? 'auto' : 'none';
                savePrefs('tw_nt_fake_enable', String(isEnabled));
                if (typeof updateRadiusFakesHUD === 'function') updateRadiusFakesHUD();
            };
        }

        if (document.getElementById('tw-btn-open-map-planner')) {
            document.getElementById('tw-btn-open-map-planner').onclick = () => openMapIframeModal('planner');
        }

        // Controlos do Planeador
        const attackModeSelect = document.getElementById('tw-nt-attack-mode');
        const nobleControlsBox = document.getElementById('tw-box-noble-controls');
        const noblePrimaryBox = document.getElementById('tw-box-noble-primary');
        const nobleSecondaryBox = document.getElementById('tw-box-noble-secondary');
        const leadNukesInput = document.getElementById('tw-nt-lead-nukes');
        const antiModeSelect = document.getElementById('tw-nt-anti-mode');
        const bunkerCountSelect = document.getElementById('tw-nt-bunker-count');
        const catTargetSelect = document.getElementById('tw-nt-cat-target-building');
        const nukeCatTargetSelect = document.getElementById('tw-nt-nuke-cat-target');
        const antiCatTargetSelect = document.getElementById('tw-nt-anti-cat-target');
        const nobleCountSelect = document.getElementById('tw-nt-noble-count');
        const archSelect = document.getElementById('tw-nt-architecture');

        const updateMultiHUD = () => {
            const raw = document.getElementById('tw-nt-targets-multi') ? document.getElementById('tw-nt-targets-multi').value : '';
            const tList = Array.from(new Set(raw.match(/\d{3}\|\d{3}/g) || []));
            const attackMode = attackModeSelect ? attackModeSelect.value : 'standard_anti';
            const isCleanOnly = (attackMode === 'nuke_sweep' || attackMode === 'cat_demolish');
            const rawNobleCount = parseInt(nobleCountSelect ? nobleCountSelect.value : '4', 10);
            const nobleCount = isCleanOnly ? 0 : (isNaN(rawNobleCount) ? 4 : rawNobleCount);
            const hasNobles = nobleCount > 0;
            const leadNukes = parseInt(leadNukesInput ? leadNukesInput.value : '0', 10) || 0;
            const bunkerCount = hasNobles ? (parseInt(bunkerCountSelect ? bunkerCountSelect.value : '0', 10) || 0) : 0;
            const { waves: rawAntiWaves } = getAntiSnipeConfig();
            const antiWaves = hasNobles ? rawAntiWaves : 0;
            
            const hud = document.getElementById('tw-nt-multi-hud');
            if (hud) {
                if (!hasNobles) {
                    hud.innerHTML = `🎯 <b>${tList.length}</b> Alvos | ⚔️ <b>${tList.length * leadNukes}</b> Nukes Limpeza | <span style="color:#94a3b8;">👑 Sem Nobres / Sem Bunkers</span>`;
                } else if (attackMode === 'snob_solo') {
                    hud.innerHTML = `🎯 <b>${tList.length}</b> Alvos | 🔄 <b>${tList.length * nobleCount}</b> Viagens Bate-Volta (1 Nobre/alvo) | ⚔️ <b>${tList.length * leadNukes}</b> Nukes | 🛡️ <b>${tList.length * antiWaves}</b> Escoltas | 🛡️ <b>${tList.length * bunkerCount}</b> Bunkers`;
                } else {
                    hud.innerHTML = `🎯 <b>${tList.length}</b> Alvos | 👑 <b>${tList.length * nobleCount}</b> Nobres | ⚔️ <b>${tList.length * leadNukes}</b> Nukes | 🛡️ <b>${tList.length * antiWaves}</b> Escoltas | 🛡️ <b>${tList.length * bunkerCount}</b> Bunkers`;
                }
            }

            const hintEl = document.getElementById('tw-box-auto-nobles-hint');
            if (hintEl) {
                if (!hasNobles) {
                    hintEl.innerHTML = `💥 <b>IA de Atribuição:</b> Alocação automática dos nukes de ataque mais próximos a cada alvo por menor tempo de viagem. Sem envio de nobres ou apoios.`;
                } else if (attackMode === 'snob_solo') {
                    hintEl.innerHTML = `🔄 <b>IA de Atribuição:</b> O mesmo nobre realizará ${nobleCount} viagens consecutivas de Bate e Volta (ir, bater, regressar e relançar) para conquista total.`;
                } else {
                    hintEl.innerHTML = `🤖 <b>IA de Atribuição:</b> As melhores aldeias de nobres e nukes serão alocadas automaticamente a cada alvo por menor tempo de viagem.`;
                }
            }
        };

        if (document.getElementById('tw-nt-targets-multi')) {
            document.getElementById('tw-nt-targets-multi').oninput = updateMultiHUD;
        }

        function applyProfilePresets(mode) {
            if (mode === 'nt_simple') {
                if (nobleCountSelect) nobleCountSelect.value = '4';
                if (archSelect) archSelect.value = 'single_4';
                if (leadNukesInput) leadNukesInput.value = '0';
                if (antiModeSelect) antiModeSelect.value = 'none';
                if (bunkerCountSelect) bunkerCountSelect.value = '0';
                if (nukeCatTargetSelect) nukeCatTargetSelect.value = 'place';
                if (antiCatTargetSelect) antiCatTargetSelect.value = 'none';
                if (catTargetSelect) catTargetSelect.value = 'none';
                const snobEl = document.getElementById('tw-nt-model-snob');
                if (snobEl) snobEl.value = 'NT 25%';
            } else if (mode === 'nt_clean') {
                if (nobleCountSelect) nobleCountSelect.value = '4';
                if (archSelect) archSelect.value = 'single_4';
                if (leadNukesInput) leadNukesInput.value = '1';
                if (antiModeSelect) antiModeSelect.value = 'none';
                if (bunkerCountSelect) bunkerCountSelect.value = '2';
                if (nukeCatTargetSelect) nukeCatTargetSelect.value = 'place';
                if (antiCatTargetSelect) antiCatTargetSelect.value = 'none';
                if (catTargetSelect) catTargetSelect.value = 'none';
                const snobEl = document.getElementById('tw-nt-model-snob');
                if (snobEl) snobEl.value = 'NT 25%';
                const nukeEl = document.getElementById('tw-nt-model-nuke');
                if (nukeEl) nukeEl.value = 'Ataque Full';
            } else if (mode === 'standard_anti') {
                if (nobleCountSelect) nobleCountSelect.value = '4';
                if (archSelect) archSelect.value = 'single_4';
                if (leadNukesInput) leadNukesInput.value = '1';
                if (antiModeSelect) antiModeSelect.value = 'anti_full_3';
                if (bunkerCountSelect) bunkerCountSelect.value = '2';
                if (nukeCatTargetSelect) nukeCatTargetSelect.value = 'place';
                if (antiCatTargetSelect) antiCatTargetSelect.value = 'none';
                if (catTargetSelect) catTargetSelect.value = 'place';
                const snobEl = document.getElementById('tw-nt-model-snob');
                if (snobEl) snobEl.value = 'NT 25%';
                const antiEl = document.getElementById('tw-nt-model-anti');
                if (antiEl) antiEl.value = 'Ataque Full';
                const nukeEl = document.getElementById('tw-nt-model-nuke');
                if (nukeEl) nukeEl.value = 'Ataque Full';
            } else if (mode === 'standard_anti_50') {
                if (nobleCountSelect) nobleCountSelect.value = '4';
                if (archSelect) archSelect.value = 'single_4';
                if (leadNukesInput) leadNukesInput.value = '1';
                if (antiModeSelect) antiModeSelect.value = 'anti_50_2';
                if (bunkerCountSelect) bunkerCountSelect.value = '1';
                if (nukeCatTargetSelect) nukeCatTargetSelect.value = 'place';
                if (antiCatTargetSelect) antiCatTargetSelect.value = 'none';
                if (catTargetSelect) catTargetSelect.value = 'place';
                const snobEl = document.getElementById('tw-nt-model-snob');
                if (snobEl) snobEl.value = 'NT 25%';
                const antiEl = document.getElementById('tw-nt-model-anti');
                if (antiEl) antiEl.value = 'Ataque 50%';
                const nukeEl = document.getElementById('tw-nt-model-nuke');
                if (nukeEl) nukeEl.value = 'Ataque Full';
            } else if (mode === 'split_2x2') {
                if (nobleCountSelect) nobleCountSelect.value = '4';
                if (archSelect) archSelect.value = 'split_2x2';
                if (leadNukesInput) leadNukesInput.value = '1';
                if (antiModeSelect) antiModeSelect.value = 'anti_50_2';
                if (bunkerCountSelect) bunkerCountSelect.value = '2';
                if (nukeCatTargetSelect) nukeCatTargetSelect.value = 'place';
                if (antiCatTargetSelect) antiCatTargetSelect.value = 'none';
                if (catTargetSelect) catTargetSelect.value = 'place';
                const snobEl = document.getElementById('tw-nt-model-snob');
                if (snobEl) snobEl.value = 'NT - 2 - 50%';
                const antiEl = document.getElementById('tw-nt-model-anti');
                if (antiEl) antiEl.value = 'Ataque 50%';
                const nukeEl = document.getElementById('tw-nt-model-nuke');
                if (nukeEl) nukeEl.value = 'Ataque Full';
            } else if (mode === 'snob_solo') {
                if (nobleCountSelect) nobleCountSelect.value = '4';
                if (archSelect) archSelect.value = 'single_4';
                if (leadNukesInput) leadNukesInput.value = '0';
                if (antiModeSelect) antiModeSelect.value = 'none';
                if (bunkerCountSelect) bunkerCountSelect.value = '1';
                if (nukeCatTargetSelect) nukeCatTargetSelect.value = 'none';
                if (antiCatTargetSelect) antiCatTargetSelect.value = 'none';
                if (catTargetSelect) catTargetSelect.value = 'none';
                const snobEl = document.getElementById('tw-nt-model-snob');
                if (snobEl) snobEl.value = 'Nobre';
                const anchorEl = document.getElementById('tw-nt-bv-anchor');
                if (anchorEl) anchorEl.value = 'first';
            } else if (mode === 'snob_single') {
                if (nobleCountSelect) nobleCountSelect.value = '1';
                if (archSelect) archSelect.value = 'single_4';
                if (leadNukesInput) leadNukesInput.value = '0';
                if (antiModeSelect) antiModeSelect.value = 'none';
                if (bunkerCountSelect) bunkerCountSelect.value = '1';
                if (nukeCatTargetSelect) nukeCatTargetSelect.value = 'none';
                if (antiCatTargetSelect) antiCatTargetSelect.value = 'none';
                if (catTargetSelect) catTargetSelect.value = 'none';
                const snobEl = document.getElementById('tw-nt-model-snob');
                if (snobEl) snobEl.value = 'Nobre';
            } else if (mode === 'nuke_sweep') {
                if (nobleCountSelect) nobleCountSelect.value = '0';
                if (leadNukesInput) leadNukesInput.value = '1';
                if (antiModeSelect) antiModeSelect.value = 'none';
                if (bunkerCountSelect) bunkerCountSelect.value = '0';
                if (nukeCatTargetSelect) nukeCatTargetSelect.value = 'wall';
                if (antiCatTargetSelect) antiCatTargetSelect.value = 'none';
                if (catTargetSelect) catTargetSelect.value = 'wall';
                const nukeEl = document.getElementById('tw-nt-model-nuke');
                if (nukeEl) nukeEl.value = 'Ataque Full';
            } else if (mode === 'cat_demolish') {
                if (nobleCountSelect) nobleCountSelect.value = '0';
                if (leadNukesInput) leadNukesInput.value = '1';
                if (antiModeSelect) antiModeSelect.value = 'none';
                if (bunkerCountSelect) bunkerCountSelect.value = '0';
                if (nukeCatTargetSelect) nukeCatTargetSelect.value = 'place';
                if (antiCatTargetSelect) antiCatTargetSelect.value = 'none';
                if (catTargetSelect) catTargetSelect.value = 'main';
                const catsEl = document.getElementById('tw-nt-model-cats');
                if (catsEl) catsEl.value = 'Cats';
            } else if (mode === 'full_storm') {
                if (nobleCountSelect) nobleCountSelect.value = '4';
                if (archSelect) archSelect.value = 'single_4';
                if (leadNukesInput) leadNukesInput.value = '2';
                if (antiModeSelect) antiModeSelect.value = 'anti_full_3';
                if (bunkerCountSelect) bunkerCountSelect.value = '3';
                if (nukeCatTargetSelect) nukeCatTargetSelect.value = 'place';
                if (antiCatTargetSelect) antiCatTargetSelect.value = 'none';
                if (catTargetSelect) catTargetSelect.value = 'place';
                const snobEl = document.getElementById('tw-nt-model-snob');
                if (snobEl) snobEl.value = 'NT 25%';
                const antiEl = document.getElementById('tw-nt-model-anti');
                if (antiEl) antiEl.value = 'Ataque Full';
                const nukeEl = document.getElementById('tw-nt-model-nuke');
                if (nukeEl) nukeEl.value = 'Ataque Full';
                const catsEl = document.getElementById('tw-nt-model-cats');
                if (catsEl) catsEl.value = 'Cats';
            }
        }

        function syncPlannerFormState() {
            const attackMode = attackModeSelect ? attackModeSelect.value : 'standard_anti';
            const isBateVolta = (attackMode === 'snob_solo');
            const isCleanOnlyProfile = (attackMode === 'nuke_sweep' || attackMode === 'cat_demolish');

            const rawNobleCount = parseInt(nobleCountSelect ? nobleCountSelect.value : '4', 10);
            let nobleCount = isCleanOnlyProfile ? 0 : (isNaN(rawNobleCount) ? 4 : rawNobleCount);
            const hasNobles = nobleCount > 0;

            const archVal = archSelect ? archSelect.value : 'single_4';
            const isSplit = (hasNobles && !isBateVolta && archVal === 'split_2x2' && nobleCount >= 2);

            // 1. Card 1: Controlos de Nobres
            if (nobleControlsBox) {
                nobleControlsBox.style.display = isCleanOnlyProfile ? 'none' : 'flex';
            }

            const lblNobleCount = document.getElementById('tw-lbl-noble-count');
            if (lblNobleCount) {
                lblNobleCount.innerText = isBateVolta ? 'Viagens (Bate-Volta):' : 'Qtd Nobres:';
            }

            if (nobleCountSelect) {
                Array.from(nobleCountSelect.options).forEach(opt => {
                    const v = parseInt(opt.value, 10);
                    if (isBateVolta) {
                        if (v === 0) opt.text = '0 Viagens (Inválido)';
                        else if (v === 1) opt.text = '1 Viagem';
                        else if (v === 2) opt.text = '2 Viagens';
                        else if (v === 3) opt.text = '3 Viagens';
                        else if (v === 4) opt.text = '4 Viagens (Padrão)';
                        else if (v === 5) opt.text = '5 Viagens (Segurança)';
                    } else {
                        if (v === 0) opt.text = '0 Nobres (Apenas Limpeza)';
                        else if (v === 1) opt.text = '1 Nobre (Re-Nobre)';
                        else if (v === 2) opt.text = '2 Nobres';
                        else if (v === 3) opt.text = '3 Nobres';
                        else if (v === 4) opt.text = '4 Nobres (NT Completo)';
                        else if (v === 5) opt.text = '5 Nobres';
                    }
                });
            }

            const boxSuboptions = document.getElementById('tw-box-noble-suboptions');
            const boxArch = document.getElementById('tw-box-noble-arch');
            const boxAnchor = document.getElementById('tw-box-batevolta-anchor');
            if (isBateVolta) {
                if (boxArch) boxArch.style.display = 'none';
                if (boxAnchor) boxAnchor.style.display = 'flex';
                if (boxSuboptions) boxSuboptions.style.display = 'grid';
            } else {
                if (boxAnchor) boxAnchor.style.display = 'none';
                const showArch = (hasNobles && nobleCount >= 2);
                if (boxArch) boxArch.style.display = showArch ? 'flex' : 'none';
                if (boxSuboptions) boxSuboptions.style.display = showArch ? 'grid' : 'none';
            }

            const boxManualNobles = document.getElementById('tw-box-manual-nobles');
            if (boxManualNobles) {
                boxManualNobles.style.display = (plannerMode === 'single' && hasNobles) ? 'block' : 'none';
            }
            if (noblePrimaryBox) {
                noblePrimaryBox.style.display = hasNobles ? 'flex' : 'none';
                const lblPrimary = document.getElementById('tw-lbl-noble-primary');
                if (lblPrimary) {
                    lblPrimary.innerText = isSplit ? 'Aldeia Nobres (Parte 1 / 2N):' : 'Aldeia Nobres Principal:';
                }
            }
            if (nobleSecondaryBox) {
                nobleSecondaryBox.style.display = (hasNobles && isSplit) ? 'flex' : 'none';
            }

            const modelSnobInput = document.getElementById('tw-nt-model-snob');
            if (modelSnobInput) {
                modelSnobInput.disabled = !hasNobles;
                modelSnobInput.style.opacity = hasNobles ? '1' : '0.4';
                if (isBateVolta) {
                    if (['NT 25%', 'NT 33%', 'NT - 2 - 50%', 'NT 50%'].includes(modelSnobInput.value)) modelSnobInput.value = 'Nobre';
                } else if (isSplit) {
                    if (['NT 25%', 'NT 33%', 'Nobre'].includes(modelSnobInput.value)) modelSnobInput.value = 'NT - 2 - 50%';
                } else if (hasNobles) {
                    if (['NT 25%', 'NT 33%', 'NT - 2 - 50%', 'NT 50%', 'Nobre'].includes(modelSnobInput.value)) {
                        if (nobleCount === 1) modelSnobInput.value = 'Nobre';
                        else if (nobleCount === 2) modelSnobInput.value = 'NT - 2 - 50%';
                        else if (nobleCount === 3) modelSnobInput.value = 'NT 33%';
                        else if (nobleCount >= 4) modelSnobInput.value = 'NT 25%';
                    }
                }
            }

            // 2. Card 2: Limpezas, Escoltas & Modelos
            let leadNukes = parseInt(leadNukesInput ? leadNukesInput.value : '0', 10) || 0;

            const boxPaladin = document.getElementById('tw-box-paladin-nuke');
            const chkPaladin = document.getElementById('tw-nt-req-paladin-nuke');
            const selPaladin = document.getElementById('tw-nt-paladin-choice');
            if (boxPaladin && chkPaladin) {
                if (leadNukes === 0) {
                    boxPaladin.style.opacity = '0.35';
                    boxPaladin.style.pointerEvents = 'none';
                    chkPaladin.checked = false;
                    if (selPaladin) selPaladin.disabled = true;
                } else {
                    boxPaladin.style.opacity = '1';
                    boxPaladin.style.pointerEvents = 'auto';
                    if (selPaladin) {
                        selPaladin.disabled = !chkPaladin.checked;
                        selPaladin.style.opacity = chkPaladin.checked ? '1' : '0.4';
                    }
                }
            }

            const modelNukeInput = document.getElementById('tw-nt-model-nuke');
            if (modelNukeInput) {
                modelNukeInput.disabled = (leadNukes === 0);
                modelNukeInput.style.opacity = (leadNukes === 0) ? '0.4' : '1';
            }
            if (nukeCatTargetSelect) {
                nukeCatTargetSelect.disabled = (leadNukes === 0);
                nukeCatTargetSelect.style.opacity = (leadNukes === 0) ? '0.4' : '1';
            }

            if (antiModeSelect) {
                if (!hasNobles) {
                    antiModeSelect.value = 'none';
                    antiModeSelect.disabled = true;
                    antiModeSelect.style.opacity = '0.4';
                } else {
                    antiModeSelect.disabled = false;
                    antiModeSelect.style.opacity = '1';
                }
            }

            const modelAntiInput = document.getElementById('tw-nt-model-anti');
            if (modelAntiInput) {
                const antiCfg = getAntiSnipeConfig();
                const isAntiActive = (hasNobles && antiCfg.waves > 0);
                modelAntiInput.disabled = !isAntiActive;
                modelAntiInput.style.opacity = isAntiActive ? '1' : '0.4';
            }
            if (antiCatTargetSelect) {
                const antiCfg = getAntiSnipeConfig();
                const isAntiActive = (hasNobles && antiCfg.waves > 0);
                antiCatTargetSelect.disabled = !isAntiActive;
                antiCatTargetSelect.style.opacity = isAntiActive ? '1' : '0.4';
            }

            const boxCatDemolish = document.getElementById('tw-box-cat-demolish');
            if (boxCatDemolish) {
                boxCatDemolish.style.display = (attackMode === 'cat_demolish') ? 'flex' : 'none';
            }

            const modelCatsInput = document.getElementById('tw-nt-model-cats');
            if (modelCatsInput) {
                const isCatDemolishActive = (attackMode === 'cat_demolish');
                const isNukeCatActive = (nukeCatTargetSelect && nukeCatTargetSelect.value !== 'none' && leadNukes > 0);
                const isAntiCatActive = (antiCatTargetSelect && antiCatTargetSelect.value !== 'none' && hasNobles);
                const isFullStormActive = (attackMode === 'full_storm');
                const hasCats = isCatDemolishActive || isNukeCatActive || isAntiCatActive || isFullStormActive;
                modelCatsInput.disabled = !hasCats;
                modelCatsInput.style.opacity = hasCats ? '1' : '0.4';
            }

            const boxLeadNuke = document.getElementById('tw-box-lead-nuke-village');
            if (boxLeadNuke) {
                boxLeadNuke.style.display = (plannerMode === 'single' && leadNukes > 0) ? 'flex' : 'none';
            }

            // 3. Card 3: Bunker Conquista
            const boxBunkerInputs = document.getElementById('tw-box-bunker-inputs');
            if (bunkerCountSelect) {
                if (!hasNobles) {
                    bunkerCountSelect.value = '0';
                    bunkerCountSelect.disabled = true;
                    bunkerCountSelect.style.opacity = '0.4';
                    if (boxBunkerInputs) {
                        boxBunkerInputs.style.opacity = '0.35';
                        boxBunkerInputs.style.pointerEvents = 'none';
                    }
                } else {
                    bunkerCountSelect.disabled = false;
                    bunkerCountSelect.style.opacity = '1';
                    const bCount = parseInt(bunkerCountSelect.value, 10) || 0;
                    if (boxBunkerInputs) {
                        if (bCount === 0) {
                            boxBunkerInputs.style.opacity = '0.35';
                            boxBunkerInputs.style.pointerEvents = 'none';
                        } else {
                            boxBunkerInputs.style.opacity = '1';
                            boxBunkerInputs.style.pointerEvents = 'auto';
                        }
                    }
                }
            }

            // 4. Multi HUD
            updateMultiHUD();

            // 5. Proximity HUD de Nobres (no modo alvo único)
            if (plannerMode === 'single' && typeof updateNobleProximityHUD === 'function') {
                updateNobleProximityHUD(null, true);
            }

            // 6. Proximity HUD de Nuke (no modo alvo único)
            if (plannerMode === 'single' && typeof updateNukeProximityHUD === 'function') {
                updateNukeProximityHUD(null, true);
            }
        }

        if (leadNukesInput) {
            leadNukesInput.oninput = () => syncPlannerFormState();
        }
        if (antiModeSelect) {
            antiModeSelect.onchange = (e) => {
                const cfg = getAntiSnipeConfig();
                if (cfg.waves > 0 && cfg.defaultModel) {
                    const modelInput = document.getElementById('tw-nt-model-anti');
                    if (modelInput) {
                        modelInput.value = cfg.defaultModel;
                        savePrefs('tw_nt_model_anti', cfg.defaultModel);
                    }
                }
                savePrefs('tw_nt_anti_mode', e.target.value);
                syncPlannerFormState();
            };
        }
        if (bunkerCountSelect) {
            bunkerCountSelect.onchange = () => syncPlannerFormState();
        }
        const chkPaladinNuke = document.getElementById('tw-nt-req-paladin-nuke');
        const selPaladinChoice = document.getElementById('tw-nt-paladin-choice');
        if (chkPaladinNuke && selPaladinChoice) {
            chkPaladinNuke.onchange = () => {
                selPaladinChoice.disabled = !chkPaladinNuke.checked;
                selPaladinChoice.style.opacity = chkPaladinNuke.checked ? '1' : '0.4';
            };
        }
        if (nobleCountSelect) {
            nobleCountSelect.onchange = (e) => {
                const val = parseInt(e.target.value, 10);
                if (val > 0) {
                    const mode = attackModeSelect ? attackModeSelect.value : 'standard_anti';
                    if (bunkerCountSelect && bunkerCountSelect.value === '0') {
                        if (mode === 'standard_anti' || mode === 'nt_clean' || mode === 'split_2x2') bunkerCountSelect.value = '2';
                        else if (mode === 'standard_anti_50' || mode === 'snob_solo' || mode === 'snob_single') bunkerCountSelect.value = '1';
                        else if (mode === 'full_storm') bunkerCountSelect.value = '3';
                    }
                    if (antiModeSelect && antiModeSelect.value === 'none') {
                        if (mode === 'standard_anti' || mode === 'full_storm') antiModeSelect.value = 'anti_full_3';
                        else if (mode === 'standard_anti_50' || mode === 'split_2x2') antiModeSelect.value = 'anti_50_2';
                    }
                }
                syncPlannerFormState();
            };
        }
        if (catTargetSelect) {
            catTargetSelect.onchange = (e) => {
                savePrefs('tw_nt_cat_target_building', e.target.value);
                syncPlannerFormState();
            };
        }
        if (nukeCatTargetSelect) {
            nukeCatTargetSelect.onchange = (e) => {
                savePrefs('tw_nt_nuke_cat_target', e.target.value);
                syncPlannerFormState();
            };
        }
        if (antiCatTargetSelect) {
            antiCatTargetSelect.onchange = (e) => {
                savePrefs('tw_nt_anti_cat_target', e.target.value);
                syncPlannerFormState();
            };
        }
        if (archSelect) {
            archSelect.onchange = () => syncPlannerFormState();
        }
        if (attackModeSelect) {
            attackModeSelect.onchange = (e) => {
                applyProfilePresets(e.target.value);
                syncPlannerFormState();
            };
        }

        const targetInput = document.getElementById('tw-nt-target');

        const updateRadiusFakesHUD = async () => {
            const radius = parseFloat(document.getElementById('tw-nt-fake-radius') ? document.getElementById('tw-nt-fake-radius').value : '8') || 8;
            const fakesPerTarget = parseInt(document.getElementById('tw-nt-fake-count') ? document.getElementById('tw-nt-fake-count').value : '3', 10) || 3;
            const fakeStyle = document.getElementById('tw-nt-fake-style') ? document.getElementById('tw-nt-fake-style').value : 'single';
            const includeTarget = document.getElementById('tw-nt-fake-include-target') ? document.getElementById('tw-nt-fake-include-target').checked : true;
            const infoBox = document.getElementById('tw-nt-fake-info');
            if (!infoBox) return;

            const multiplier = (fakeStyle === 'fake_nt') ? 4 : 1;
            const myCoords = new Set(allVillages.map(v => v.coords));

            if (plannerMode === 'single') {
                const target = targetInput ? targetInput.value.trim() : '';
                if (!/^\d{3}\|\d{3}$/.test(target)) {
                    infoBox.innerHTML = '🎯 Insere o alvo para calcular vizinhança.';
                    return;
                }

                const [tx, ty] = target.split('|').map(Number);
                let neighborCount = 0;

                if (!worldVillagesLoaded) {
                    await fetchWorldVillages();
                }

                if (worldVillages.length > 0) {
                    const targetObj = worldVillages.find(v => v.coord === target);
                    const targetPlayerId = targetObj ? targetObj.playerId : null;

                    worldVillages.forEach(v => {
                        if (v.coord === target || myCoords.has(v.coord)) return;
                        if (targetPlayerId && targetPlayerId !== '0' && v.playerId !== targetPlayerId) return;
                        const dist = Math.hypot(v.x - tx, v.y - ty);
                        if (dist <= radius) neighborCount++;
                    });
                } else if (typeof TWMap !== 'undefined' && TWMap.villages) {
                    for (let key in TWMap.villages) {
                        const v = TWMap.villages[key];
                        if (v && v.xy) {
                            const vx = Math.floor(v.xy / 1000), vy = v.xy % 1000;
                            const coord = `${vx}|${vy}`;
                            if (coord === target || myCoords.has(coord)) continue;
                            const dist = Math.hypot(vx - tx, vy - ty);
                            if (dist <= radius) neighborCount++;
                        }
                    }
                } else {
                    neighborCount = Math.max(Math.floor(radius * 0.8), 3);
                }

                const totalTargetVillages = neighborCount + (includeTarget ? 1 : 0);
                const totalCommands = totalTargetVillages * fakesPerTarget * multiplier;
                const isSmartFake = document.getElementById('tw-nt-fake-smart-limit') && document.getElementById('tw-nt-fake-smart-limit').checked;
                const smartDesc = isSmartFake ? ' • 🧠 1% Dinâmico' : '';
                const styleDesc = (fakeStyle === 'fake_nt') ? ` • 4x combo NT${smartDesc}` : (fakeStyle === 'snob' ? ` • 35m/c Nobre${smartDesc}` : (fakeStyle === 'spy' ? ` • 9m/c Espião${smartDesc}` : ` • 30m/c${smartDesc}`));

                infoBox.innerHTML = `🎯 <b>${neighborCount}</b> vizinhas ${includeTarget ? '+ <b>1 Alvo Real</b>' : ''} (raio <b>${radius}c</b>)<br>🚀 Total: <b style="color:#34d399;">${totalCommands} fakes</b> (${fakesPerTarget}x/aldeia${styleDesc})`;
            } else {
                // Modo Campanha Multialvo
                const raw = document.getElementById('tw-nt-targets-multi') ? document.getElementById('tw-nt-targets-multi').value : '';
                const multiTargets = Array.from(new Set(raw.match(/\d{3}\|\d{3}/g) || []));
                if (multiTargets.length === 0) {
                    infoBox.innerHTML = '🎯 Insere coordenadas na Campanha para calcular fakes.';
                    return;
                }

                if (!worldVillagesLoaded) {
                    await fetchWorldVillages();
                }

                const seenTargets = new Set();
                let neighborCount = 0;

                multiTargets.forEach(tCoord => {
                    if (includeTarget) seenTargets.add(tCoord);
                    const [tx, ty] = tCoord.split('|').map(Number);
                    if (worldVillages.length > 0) {
                        const targetObj = worldVillages.find(v => v.coord === tCoord);
                        const targetPlayerId = targetObj ? targetObj.playerId : null;
                        worldVillages.forEach(v => {
                            if (seenTargets.has(v.coord) || myCoords.has(v.coord)) return;
                            if (targetPlayerId && targetPlayerId !== '0' && v.playerId !== targetPlayerId) return;
                            const dist = Math.hypot(v.x - tx, v.y - ty);
                            if (dist <= radius) {
                                seenTargets.add(v.coord);
                                neighborCount++;
                            }
                        });
                    }
                });

                const totalTargetVillages = seenTargets.size || (neighborCount + (includeTarget ? multiTargets.length : 0));
                const totalCommands = totalTargetVillages * fakesPerTarget * multiplier;
                const isSmartFake = document.getElementById('tw-nt-fake-smart-limit') && document.getElementById('tw-nt-fake-smart-limit').checked;
                const smartDesc = isSmartFake ? ' • 🧠 1% Dinâmico' : '';
                const styleDesc = (fakeStyle === 'fake_nt') ? ` • 4x combo NT${smartDesc}` : (fakeStyle === 'snob' ? ` • 35m/c Nobre${smartDesc}` : (fakeStyle === 'spy' ? ` • 9m/c Espião${smartDesc}` : ` • 30m/c${smartDesc}`));

                infoBox.innerHTML = `🎯 <b>${totalTargetVillages}</b> alvos fakes na Campanha (raio <b>${radius}c</b>)<br>🚀 Total: <b style="color:#34d399;">${totalCommands} fakes</b> (${fakesPerTarget}x/alvo${styleDesc})`;
            }
        };

        function updateNobleProximityHUD(preferredPrimaryId = null, isUserManualChange = false) {
            const target = targetInput ? targetInput.value.trim() : '';
            const selPrimary = document.getElementById('tw-nt-noble-village');
            const selSecondary = document.getElementById('tw-nt-noble-village-2');
            const hintBox = document.getElementById('tw-nt-noble-proximity-hint');
            if (!selPrimary) return;

            const excludeCommitted = document.getElementById('tw-nt-exclude-committed') ? document.getElementById('tw-nt-exclude-committed').checked : true;
            const committedMap = getCommittedSchedules();

            const nobleCountVal = parseInt(document.getElementById('tw-nt-noble-count') ? document.getElementById('tw-nt-noble-count').value : '4', 10) || 1;
            const attackMode = document.getElementById('tw-nt-attack-mode') ? document.getElementById('tw-nt-attack-mode').value : 'standard_anti';
            const reqNobles = (attackMode === 'snob_solo' || attackMode === 'snob_single') ? 1 : nobleCountVal;

            const prevSelectedPrimary = preferredPrimaryId || selPrimary.value;
            const prevSelectedSecondary = selSecondary ? selSecondary.value : null;

            const nobleVillages = allVillages.filter(v => (v.snobsHome > 0 || v.snobsTotal > 0));
            if (nobleVillages.length === 0) {
                if (hintBox) {
                    hintBox.innerHTML = '❌ <b style="color:#ef4444;">Nenhuma aldeia tem nobres disponíveis.</b>';
                    hintBox.style.background = 'rgba(239, 68, 68, 0.15)';
                    hintBox.style.borderColor = '#ef4444';
                    hintBox.style.color = '#fca5a5';
                }
                selPrimary.innerHTML = '<option value="">❌ Nenhuma aldeia com nobres</option>';
                if (selSecondary) selSecondary.innerHTML = '<option value="">❌ Nenhuma aldeia com nobres</option>';
                return;
            }

            const isValidTarget = /^\d{3}\|\d{3}$/.test(target);

            if (!isValidTarget) {
                if (hintBox) {
                    hintBox.innerHTML = '🎯 <i>Insere a coordenada do alvo acima para ver a aldeia de nobres mais próxima e tempos de viagem.</i>';
                    hintBox.style.background = 'rgba(30, 41, 59, 0.6)';
                    hintBox.style.borderColor = '#475569';
                    hintBox.style.color = '#94a3b8';
                }
                const defaultOptions = nobleVillages.map(v => {
                    const isComm = !!committedMap[v.id];
                    const pal = (v.paladin && v.paladin.isHome) ? v.paladin : null;
                    const palTag = pal ? ` [${pal.name}${pal.name === 'QuimConquista' ? ' ⚔️ Persuasão' : ''}]` : '';
                    const nobleStatus = (v.snobsOutside > 0)
                        ? `${v.snobsHome} na aldeia (⚠️ ${v.snobsOutside} fora)`
                        : `${v.snobsHome} Nobres`;
                    return `<option value="${v.id}">${cleanVillageDisplayName(v)} • ${nobleStatus}${palTag}${isComm ? ' [🔒 Reservada]' : ''}</option>`;
                }).join('');
                selPrimary.innerHTML = defaultOptions;
                if (selSecondary) selSecondary.innerHTML = defaultOptions;
                if (prevSelectedPrimary && selPrimary.querySelector(`option[value="${prevSelectedPrimary}"]`)) {
                    selPrimary.value = prevSelectedPrimary;
                }
                if (selSecondary && prevSelectedSecondary && selSecondary.querySelector(`option[value="${prevSelectedSecondary}"]`)) {
                    selSecondary.value = prevSelectedSecondary;
                }
                return;
            }

            // Alvo válido: calcular distâncias e tempos de viagem de nobre
            const snobSpeedMin = unitSpeedMinutes.snob || 35;
            const listWithDist = nobleVillages.map(v => {
                const dist = calcDistance(v.coords, target);
                const sec = dist * snobSpeedMin * 60;
                const isComm = !!committedMap[v.id];
                const hasReqNobles = (v.snobsHome >= reqNobles);
                const hasTotalNobles = (v.snobsTotal >= reqNobles);
                return {
                    village: v,
                    dist,
                    sec,
                    timeStr: formatDuration(sec),
                    isComm,
                    hasReqNobles,
                    hasTotalNobles,
                    snobsOutside: v.snobsOutside || 0
                };
            }).sort((a, b) => {
                if (excludeCommitted) {
                    if (a.isComm && !b.isComm) return 1;
                    if (!a.isComm && b.isComm) return -1;
                }
                // Priorizar aldeias com nobres PRONTOS EM CASA
                if (a.hasReqNobles && !b.hasReqNobles) return -1;
                if (!a.hasReqNobles && b.hasReqNobles) return 1;
                return a.dist - b.dist;
            });

            const closest = listWithDist[0];
            const closestWithEnough = listWithDist.find(i => i.hasReqNobles && (!excludeCommitted || !i.isComm))
                || listWithDist.find(i => i.hasReqNobles)
                || listWithDist.find(i => i.hasTotalNobles && (!excludeCommitted || !i.isComm))
                || closest;

            // Renderizar opções para Aldeia Nobres Principal
            selPrimary.innerHTML = listWithDist.map((item, idx) => {
                const v = item.village;
                const pal = (v.paladin && v.paladin.isHome) ? v.paladin : null;
                const palTag = pal ? ` [${pal.name}${pal.name === 'QuimConquista' ? ' ⚔️ Persuasão' : ''}]` : '';
                const isClosest = (v.id === closest.village.id);
                const isBestWithEnough = (v.id === closestWithEnough.village.id);
                
                let prefix = `[#${idx + 1}] `;
                if (isBestWithEnough) {
                    prefix = item.hasReqNobles ? '⭐ [MAIS PERTO PRONTA] ' : '⚠️ [MAIS PERTO] ';
                } else if (isClosest && !isBestWithEnough) {
                    prefix = '⭐ [1º MAIS PERTO] ';
                }

                let nobleStatus = '';
                const inProdTag = (v.snobsInProd > 0) ? ` 🔨+${v.snobsInProd}` : '';
                const retTag = (v.snobsReturning > 0) ? ` ⏳+${v.snobsReturning}` : '';
                if (item.hasReqNobles) {
                    if (item.snobsOutside > 0) {
                        nobleStatus = `${v.snobsHome} na aldeia (⚠️ ${item.snobsOutside} fora${inProdTag}${retTag})`;
                    } else {
                        nobleStatus = `${v.snobsHome} Nobres${inProdTag}`;
                    }
                } else {
                    if (item.snobsOutside > 0 || v.snobsInProd > 0) {
                        nobleStatus = `⚠️ ${v.snobsHome}/${reqNobles} na aldeia (${item.snobsOutside} fora${inProdTag}${retTag})`;
                    } else {
                        nobleStatus = `⚠️ ${v.snobsHome}/${reqNobles} Nobres`;
                    }
                }

                const commTag = item.isComm ? ' [🔒 Reservada]' : '';
                return `<option value="${v.id}" data-dist="${item.dist.toFixed(2)}" data-time="${item.timeStr}">${prefix}${cleanVillageDisplayName(v)} • ${item.dist.toFixed(1)}c • ⏳ ${item.timeStr} • ${nobleStatus}${palTag}${commTag}</option>`;
            }).join('');

            // Renderizar opções para Aldeia Nobres Secundária (Split 2x2)
            if (selSecondary) {
                selSecondary.innerHTML = listWithDist.map((item, idx) => {
                    const v = item.village;
                    const pal = (v.paladin && v.paladin.isHome) ? v.paladin : null;
                    const palTag = pal ? ` [${pal.name}${pal.name === 'QuimConquista' ? ' ⚔️ Persuasão' : ''}]` : '';
                    const is2ndClosest = (idx === 1);
                    const prefix = is2ndClosest ? '⭐ [2º MAIS PERTO] ' : `[#${idx + 1}] `;
                    
                    let nobleStatus = '';
                    const inProdTag2 = (v.snobsInProd > 0) ? ` 🔨+${v.snobsInProd}` : '';
                    const retTag2 = (v.snobsReturning > 0) ? ` ⏳+${v.snobsReturning}` : '';
                    if (item.hasReqNobles) {
                        if (item.snobsOutside > 0) {
                            nobleStatus = `${v.snobsHome} na aldeia (⚠️ ${item.snobsOutside} fora${inProdTag2}${retTag2})`;
                        } else {
                            nobleStatus = `${v.snobsHome} Nobres${inProdTag2}`;
                        }
                    } else {
                        if (item.snobsOutside > 0 || v.snobsInProd > 0) {
                            nobleStatus = `⚠️ ${v.snobsHome}/${reqNobles} na aldeia (${item.snobsOutside} fora${inProdTag2}${retTag2})`;
                        } else {
                            nobleStatus = `⚠️ ${v.snobsHome}/${reqNobles} Nobres`;
                        }
                    }

                    const commTag = item.isComm ? ' [🔒 Reservada]' : '';
                    return `<option value="${v.id}" data-dist="${item.dist.toFixed(2)}" data-time="${item.timeStr}">${prefix}${cleanVillageDisplayName(v)} • ${item.dist.toFixed(1)}c • ⏳ ${item.timeStr} • ${nobleStatus}${palTag}${commTag}</option>`;
                }).join('');
            }

            // Seleção da aldeia no dropdown
            if (isUserManualChange && prevSelectedPrimary && selPrimary.querySelector(`option[value="${prevSelectedPrimary}"]`)) {
                selPrimary.value = prevSelectedPrimary;
            } else if (!isUserManualChange) {
                if (closestWithEnough) {
                    selPrimary.value = closestWithEnough.village.id;
                }
            } else if (prevSelectedPrimary && selPrimary.querySelector(`option[value="${prevSelectedPrimary}"]`)) {
                selPrimary.value = prevSelectedPrimary;
            }

            if (selSecondary) {
                if (isUserManualChange && prevSelectedSecondary && selSecondary.querySelector(`option[value="${prevSelectedSecondary}"]`)) {
                    selSecondary.value = prevSelectedSecondary;
                } else {
                    const secondBest = listWithDist.find(item => item.village.id !== selPrimary.value) || listWithDist[1] || listWithDist[0];
                    if (secondBest) selSecondary.value = secondBest.village.id;
                }
            }

            // Atualizar o banner indicador
            if (hintBox) {
                const currentPrimaryId = selPrimary.value;
                const currentPrimaryItem = listWithDist.find(i => i.village.id === currentPrimaryId) || closestWithEnough;
                const selV = currentPrimaryItem.village;
                const isCurrentClosest = (currentPrimaryItem.village.id === closestWithEnough.village.id);
                const bestV = closestWithEnough.village;
                const bestPal = (bestV.paladin && bestV.paladin.isHome) ? bestV.paladin : null;
                const bestPalTag = bestPal ? ` • <span style="color:#c084fc;">[${bestPal.name}${bestPal.name === 'QuimConquista' ? ' ⚔️ Persuasão' : ''}]</span>` : '';

                // Se a aldeia selecionada ainda não tiver nobres em treino registados, verificar página da academia em background
                if (selV && !selV._snobScreenChecked && (!selV.snobsInProd || selV.snobsInProd === 0)) {
                    selV._snobScreenChecked = true;
                    fetch(`/game.php?village=${selV.id}&screen=snob`).then(r => r.text()).then(snobHtml => {
                        const foundProds = parseAcademyProduction(snobHtml, selV.id);
                        if (foundProds.length > 0) {
                            foundProds.forEach(p => {
                                const pVId = String(p.villageId || '');
                                if (!selV.noblePendingEvents.some(e => {
                                    const exVId = String(e.villageId || '');
                                    const matchVillage = (exVId && pVId && exVId === pVId) || (e.coords && p.coords && e.coords === p.coords);
                                    return e.type === 'production' && matchVillage && Math.abs(e.readyAtMs - p.readyAtMs) < 30000;
                                })) {
                                    selV.noblePendingEvents.push(p);
                                }
                            });
                            selV.noblePendingEvents.sort((a, b) => a.readyAtMs - b.readyAtMs);
                            selV.snobsInProd = selV.noblePendingEvents.filter(e => e.type === 'production').length;
                            updateNobleProximityHUD(selV.id, false);
                        }
                    }).catch(() => {});
                }

                // Se a aldeia selecionada tiver nobres fora e ainda não tiver comandos de retorno registados, verificar página overview em background
                if (selV && !selV._commandsChecked && (selV.snobsOutside > 0 || selV.snobsHome < reqNobles) && (!selV.snobsReturning || selV.snobsReturning === 0)) {
                    selV._commandsChecked = true;
                    fetch(`/game.php?village=${selV.id}&screen=overview`).then(r => r.text()).then(ovHtml => {
                        const foundReturns = parseCommandsNobleReturns(ovHtml, selV.id, selV.coords);
                        if (foundReturns.length > 0) {
                            foundReturns.forEach(ret => {
                                const isDup = selV.noblePendingEvents.some(e => {
                                    if (e.commandId && ret.commandId) {
                                        return String(e.commandId) === String(ret.commandId);
                                    }
                                    const matchV = (e.villageId && ret.villageId && String(e.villageId) === String(ret.villageId)) || (e.coords && ret.coords && e.coords === ret.coords);
                                    return matchV && Math.abs(e.readyAtMs - ret.readyAtMs) < 2000 && e.remoteCoords === ret.remoteCoords;
                                });
                                if (!isDup) {
                                    selV.noblePendingEvents.push(ret);
                                }
                            });
                            selV.noblePendingEvents.sort((a, b) => a.readyAtMs - b.readyAtMs);
                            selV.snobsReturning = selV.noblePendingEvents.filter(e => e.type === 'return').length;
                            updateNobleProximityHUD(selV.id, false);
                        }
                    }).catch(() => {});
                }

                if (selV.snobsHome < reqNobles) {
                    // ALERTA INTELIGENTE: Nobres fora ou em treino!
                    const canSwitchToBest = (bestV.id !== selV.id && bestV.snobsHome >= reqNobles);
                    const readiness = calculateEarliestViableNobleTime(selV, reqNobles);
                    const calcMin = calculateEarliestViableLandTime();

                    let readyDetails = '';
                    let minLandBtnHtml = '';

                    if (readiness.hasShortage) {
                        hintBox.style.background = 'rgba(239, 68, 68, 0.25)';
                        hintBox.style.borderColor = '#ef4444';
                        hintBox.style.color = '#fecaca';
                        readyDetails = `<br><span style="color:#ef4444; font-size:10px; font-weight:bold;">❌ <b>INSUFICIENTE:</b> ${readiness.summary}</span>`;
                        minLandBtnHtml = `<button type="button" class="tw-btn" disabled style="padding:3px 8px; font-size:9.5px; font-weight:bold; opacity:0.65; cursor:not-allowed; background:#991b1b; color:#fecaca;" title="${readiness.summary}">❌ Faltam Nobres (${readiness.availableTotal}/${reqNobles})</button>`;
                    } else {
                        hintBox.style.background = 'rgba(239, 68, 68, 0.2)';
                        hintBox.style.borderColor = '#ef4444';
                        hintBox.style.color = '#fecaca';

                        if (readiness.targetEvent) {
                            const timeTxt = readiness.targetEvent.completionStr || (readiness.targetEvent.timerStr ? `em ${readiness.targetEvent.timerStr}` : new Date(readiness.readyAtMs).toLocaleTimeString('pt-PT'));
                            readyDetails = `<br><span style="color:#fde047; font-size:10px;">⏰ <b>Disponibilidade:</b> O ${reqNobles}º nobre fica pronto às <b>${timeTxt}</b> (${readiness.summary}).</span>`;
                        }

                        if (calcMin && !calcMin.hasShortage) {
                            const isTomorrow = calcMin.earliestLandDate.getDate() !== new Date().getDate();
                            const timeLabel = isTomorrow ? `amanhã às ${calcMin.earliestLandDate.toLocaleTimeString('pt-PT')}` : calcMin.earliestLandDate.toLocaleTimeString('pt-PT');
                            minLandBtnHtml = `<button type="button" class="tw-btn tw-btn-blue" id="tw-btn-apply-hud-min-land" style="padding:3px 8px; font-size:9.5px; font-weight:bold; white-space:nowrap;" title="Ajusta automaticamente a hora de chegada para o horário mais cedo viável (com 5m de margem de segurança)">⚡ Ajustar para ${timeLabel}</button>`;
                        }
                    }

                    const inProdTxt = selV.snobsInProd > 0 ? `, <b style="color:#38bdf8;">${selV.snobsInProd} em treino</b>` : '';
                    const inRetTxt = selV.snobsReturning > 0 ? `, <b style="color:#f59e0b;">${selV.snobsReturning} a caminho</b>` : '';

                    const alertTitle = readiness.hasShortage
                        ? '❌ <b style="color:#ef4444;">ALERTA: NOBRES INSUFICIENTES NESTA ALDEIA!</b>'
                        : '⚠️ <b style="color:#f87171;">ALERTA: NOBRES EM VIAGEM OU TREINO!</b>';

                    hintBox.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center; width:100%; gap:8px;">
                            <span style="line-height:1.35;">
                                ${alertTitle}<br>
                                A aldeia <b>${cleanVillageDisplayName(selV)}</b> tem apenas <b style="color:#fde047;">${selV.snobsHome}/${reqNobles}</b> nobres prontos na aldeia (<b style="color:#f87171;">${selV.snobsOutside} fora</b>${inProdTxt}${inRetTxt}).${readyDetails}
                                ${canSwitchToBest ? `<br><span style="color:#86efac;">💡 Aldeia pronta mais próxima: <b>${cleanVillageDisplayName(bestV)}</b> (${closestWithEnough.dist.toFixed(1)}c • ⏳ ${closestWithEnough.timeStr} • ${bestV.snobsHome}N na aldeia).</span>` : ''}
                            </span>
                            <div style="display:flex; flex-direction:column; gap:3px; align-items:flex-end; flex-shrink:0;">
                                ${minLandBtnHtml}
                                ${canSwitchToBest ? `
                                    <button type="button" class="tw-btn tw-btn-gold" id="tw-btn-pick-closest-noble" style="padding:3px 8px; font-size:9.5px; font-weight:bold; white-space:nowrap;">
                                        🎯 Escolher Pronta (${bestV.snobsHome}N)
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `;
                } else if (selV.snobsOutside > 0) {
                    // AVISO ÂMBAR: Tem nobres suficientes para este ataque, mas há outros fora
                    hintBox.style.background = 'rgba(245, 158, 11, 0.15)';
                    hintBox.style.borderColor = '#f59e0b';
                    hintBox.style.color = '#fef3c7';

                    if (isCurrentClosest) {
                        hintBox.innerHTML = `
                            <div style="display:flex; justify-content:space-between; align-items:center; width:100%; gap:6px;">
                                <span style="line-height:1.2;">
                                    ⭐ <b>Mais Perto Pronta:</b> <span style="color:#fbbf24; font-weight:bold;">${cleanVillageDisplayName(bestV)}</span> 
                                    • <b style="color:#38bdf8;">${closestWithEnough.dist.toFixed(1)}c</b> 
                                    • <span style="color:#4ade80;">⏳ ${closestWithEnough.timeStr}</span> 
                                    • <b>${bestV.snobsHome} Nobres na aldeia</b> <span style="color:#fbbf24; font-size:9.5px;">(⚠️ ${selV.snobsOutside} fora em viagem)</span>${bestPalTag}
                                    <span style="color:#86efac; font-size:9px; font-weight:bold; margin-left:4px;">(Selecionada ✅)</span>
                                </span>
                            </div>
                        `;
                    } else {
                        hintBox.innerHTML = `
                            <div style="display:flex; justify-content:space-between; align-items:center; width:100%; gap:6px;">
                                <span style="line-height:1.2;">
                                    📍 <b>Selecionada:</b> <span style="color:#e2e8f0; font-weight:bold;">${cleanVillageDisplayName(selV)}</span> (${currentPrimaryItem.dist.toFixed(1)}c • ⏳ ${currentPrimaryItem.timeStr} • ${selV.snobsHome}N na aldeia, ${selV.snobsOutside} fora) 
                                    <br>⭐ <b>Mais Perto Pronta:</b> <span style="color:#fbbf24; font-weight:bold;">${cleanVillageDisplayName(bestV)}</span> (${closestWithEnough.dist.toFixed(1)}c • ⏳ ${closestWithEnough.timeStr} • ${bestV.snobsHome}N)${bestPalTag}
                                </span>
                                <button type="button" class="tw-btn tw-btn-gold" id="tw-btn-pick-closest-noble" style="padding:2px 8px; font-size:9.5px; font-weight:bold; white-space:nowrap; flex-shrink:0;">
                                    🎯 Escolher Mais Perto
                                </button>
                            </div>
                        `;
                    }
                } else {
                    // NORMAL: Todos os nobres estão em casa
                    hintBox.style.background = 'rgba(245, 158, 11, 0.12)';
                    hintBox.style.borderColor = '#f59e0b';
                    hintBox.style.color = '#fef3c7';

                    if (isCurrentClosest) {
                        hintBox.innerHTML = `
                            <div style="display:flex; justify-content:space-between; align-items:center; width:100%; gap:6px;">
                                <span style="line-height:1.2;">
                                    ⭐ <b>Mais Perto do Alvo:</b> <span style="color:#fbbf24; font-weight:bold;">${cleanVillageDisplayName(bestV)}</span> 
                                    • <b style="color:#38bdf8;">${closestWithEnough.dist.toFixed(1)} campos</b> 
                                    • <span style="color:#4ade80;">⏳ ${closestWithEnough.timeStr}</span> 
                                    • <b>${bestV.snobsHome} Nobres</b>${bestPalTag}
                                    <span style="color:#86efac; font-size:9px; font-weight:bold; margin-left:4px;">(Selecionada ✅)</span>
                                </span>
                            </div>
                        `;
                    } else {
                        hintBox.innerHTML = `
                            <div style="display:flex; justify-content:space-between; align-items:center; width:100%; gap:6px;">
                                <span style="line-height:1.2;">
                                    📍 <b>Selecionada:</b> <span style="color:#e2e8f0; font-weight:bold;">${cleanVillageDisplayName(selV)}</span> (${currentPrimaryItem.dist.toFixed(1)}c • ⏳ ${currentPrimaryItem.timeStr}) 
                                    <br>⭐ <b>Mais Perto:</b> <span style="color:#fbbf24; font-weight:bold;">${cleanVillageDisplayName(bestV)}</span> (${closestWithEnough.dist.toFixed(1)}c • ⏳ ${closestWithEnough.timeStr} • ${bestV.snobsHome}N)${bestPalTag}
                                </span>
                                <button type="button" class="tw-btn tw-btn-gold" id="tw-btn-pick-closest-noble" style="padding:2px 8px; font-size:9.5px; font-weight:bold; white-space:nowrap; flex-shrink:0;">
                                    🎯 Escolher Mais Perto
                                </button>
                            </div>
                        `;
                    }
                }

                const btnPick = document.getElementById('tw-btn-pick-closest-noble');
                if (btnPick) {
                    btnPick.onclick = (e) => {
                        e.preventDefault();
                        selPrimary.value = bestV.id;
                        updateNobleProximityHUD(bestV.id, false);
                    };
                }

                const btnApplyHudMin = document.getElementById('tw-btn-apply-hud-min-land');
                if (btnApplyHudMin) {
                    btnApplyHudMin.onclick = (e) => {
                        e.preventDefault();
                        applyMinimumViableLandTime();
                    };
                }
            }
        }

        function updateNukeProximityHUD(preferredNukeId = null, isUserManualChange = false) {
            const target = targetInput ? targetInput.value.trim() : '';
            const selNuke = document.getElementById('tw-nt-lead-nuke-village');
            const hintBox = document.getElementById('tw-nt-nuke-proximity-hint');
            const chkPreferFull = document.getElementById('tw-nt-prefer-full-nukes');
            const boxLeadNuke = document.getElementById('tw-box-lead-nuke-village');
            const leadNukesCount = parseInt(leadNukesInput ? leadNukesInput.value : '0', 10) || 0;

            if (!selNuke) return;

            if (leadNukesCount === 0 || plannerMode !== 'single') {
                if (boxLeadNuke) boxLeadNuke.style.display = 'none';
                return;
            } else {
                if (boxLeadNuke) boxLeadNuke.style.display = 'flex';
            }

            const excludeCommitted = document.getElementById('tw-nt-exclude-committed') ? document.getElementById('tw-nt-exclude-committed').checked : true;
            const committedMap = getCommittedSchedules();

            const nobleVillageId1 = document.getElementById('tw-nt-noble-village') ? document.getElementById('tw-nt-noble-village').value : null;
            const nobleVillageId2 = document.getElementById('tw-nt-noble-village-2') ? document.getElementById('tw-nt-noble-village-2').value : null;
            const excludedIds = [];
            if (nobleVillageId1) excludedIds.push(nobleVillageId1);
            if (nobleVillageId2) excludedIds.push(nobleVillageId2);

            let offPool = allVillages.filter(v => v.rowClass === 'tw-row-off' && !excludedIds.includes(v.id));
            if (excludeCommitted) {
                offPool = offPool.filter(v => !committedMap[v.id]);
            }

            if (offPool.length === 0) {
                selNuke.innerHTML = '<option value="auto">❌ Nenhuma aldeia de ataque disponível</option>';
                if (hintBox) hintBox.innerHTML = '❌ <b style="color:#ef4444;">Sem aldeias de ataque disponíveis.</b>';
                return;
            }

            const isValidTarget = /^\d{3}\|\d{3}$/.test(target);
            const prevSelected = preferredNukeId || selNuke.value || 'auto';
            const preferFull = chkPreferFull ? chkPreferFull.checked : true;
            const reqPaladinNuke = document.getElementById('tw-nt-req-paladin-nuke') ? document.getElementById('tw-nt-req-paladin-nuke').checked : true;
            const palChoice = document.getElementById('tw-nt-paladin-choice') ? document.getElementById('tw-nt-paladin-choice').value : 'auto';

            const formatTroopsShort = (v) => {
                const d = v.homeTroopsDict || v.troopsDict || {};
                const p = [];
                if (d.axe) p.push(`${(d.axe/1000).toFixed(1)}k🪓`);
                if (d.light) p.push(`${(d.light/1000).toFixed(1)}k🐎`);
                if (d.ram) p.push(`${d.ram}🪵`);
                if (d.catapult) p.push(`${d.catapult}☄️`);
                return p.length > 0 ? p.join(' ') : '0 tropas';
            };

            if (!isValidTarget) {
                let defaultOptions = '<option value="auto">⚡ Auto (Melhor Full Nuke mais perto)</option>';
                defaultOptions += offPool.map(v => {
                    const isFull = (v.farm && v.farm.used >= 20000);
                    const tag = isFull ? '⭐ [FULL]' : '⚠️ [SEMI]';
                    const awayWarn = v.hasTroopsAway ? ` ⚠️ [${v.troopsAwayPerc}% Tropas Fora]` : '';
                    const pal = (v.paladin && v.paladin.isHome) ? ` [${v.paladin.name} ⚔️]` : '';
                    const comm = committedMap[v.id] ? ' [🔒 Reservada]' : '';
                    const farmK = (v.farm && v.farm.used) ? (v.farm.used/1000).toFixed(1) : '?';
                    return `<option value="${v.id}">${tag}${awayWarn} ${cleanVillageDisplayName(v)} • Faz. ${farmK}k • ${formatTroopsShort(v)}${pal}${comm}</option>`;
                }).join('');
                selNuke.innerHTML = defaultOptions;
                if (prevSelected && selNuke.querySelector(`option[value="${prevSelected}"]`)) {
                    selNuke.value = prevSelected;
                }
                if (hintBox) hintBox.innerHTML = '🎯 <i>Insere a coordenada do alvo para ver distâncias, tempos e tropas.</i>';
                return;
            }

            // Alvo válido
            const listWithDist = getSortedOffVillages(target, excludedIds);
            if (listWithDist.length === 0) {
                selNuke.innerHTML = '<option value="auto">❌ Nenhuma aldeia de ataque disponível</option>';
                if (hintBox) hintBox.innerHTML = '❌ <b style="color:#ef4444;">Sem aldeias de ataque disponíveis.</b>';
                return;
            }
            const bestAuto = listWithDist[0];

            let optionsHtml = '<option value="auto">⚡ Auto (Melhor Nuke Mais Perto)</option>';
            optionsHtml += listWithDist.map((item, idx) => {
                const v = item.village;
                const isFull = item.isFull;
                const tag = isFull ? '⭐ [FULL]' : '⚠️ [SEMI]';
                const awayWarn = v.hasTroopsAway ? ` ⚠️ [${v.troopsAwayPerc}% Tropas Fora]` : '';
                const isBest = (v.id === bestAuto.village.id);
                const prefix = isBest ? '⭐ [1º RECOMENDADO] ' : `[#${idx + 1}] `;
                const pal = (v.paladin && v.paladin.isHome) ? ` [${v.paladin.name} ⚔️]` : '';
                const comm = item.isComm ? ' [🔒 Reservada]' : '';
                const farmK = (v.farm && v.farm.used) ? (v.farm.used/1000).toFixed(1) : '?';
                return `<option value="${v.id}">${prefix}${tag}${awayWarn} ${cleanVillageDisplayName(v)} • ${item.dist.toFixed(1)}c • ⏳ ${item.timeStr} • Faz. ${farmK}k • ${formatTroopsShort(v)}${pal}${comm}</option>`;
            }).join('');

            selNuke.innerHTML = optionsHtml;

            if (isUserManualChange && prevSelected && selNuke.querySelector(`option[value="${prevSelected}"]`)) {
                selNuke.value = prevSelected;
            } else if (!isUserManualChange && prevSelected && prevSelected !== 'auto' && selNuke.querySelector(`option[value="${prevSelected}"]`)) {
                selNuke.value = prevSelected;
            } else {
                selNuke.value = 'auto';
            }

            // Atualizar o banner descritivo
            if (hintBox) {
                const currentVal = selNuke.value;
                const chosenItem = (currentVal === 'auto') ? bestAuto : (listWithDist.find(i => i.village.id === currentVal) || bestAuto);
                const cV = chosenItem.village;
                const farmK = (cV.farm && cV.farm.used) ? (cV.farm.used/1000).toFixed(1) : '?';
                const modeLabel = (currentVal === 'auto') ? '⭐ <b>Auto:</b>' : '🎯 <b>Manual:</b>';
                const palHint = (cV.paladin && cV.paladin.isHome) ? ` • <span style="color:#c084fc; font-weight:bold;">[${cV.paladin.name} ⚔️ Lvl ${cV.paladin.level}]</span>` : '';

                let awayBanner = '';
                if (cV.hasTroopsAway) {
                    awayBanner = `
                        <div style="margin-top:5px; padding:4px 8px; background:rgba(245, 158, 11, 0.12); border:1px solid #f59e0b; border-radius:4px; color:#fbbf24; font-size:11px;">
                            ⚠️ <b>Aviso: Tropas Fora de Casa!</b> Esta aldeia tem cerca de <b>${cV.troopsAwayPerc}% das tropas fora (~${(cV.troopsAwayPop/1000).toFixed(1)}k pop em trânsito)</b>.<br>
                            Em casa: <b>${formatTroopsShort(cV)}</b>. Confirma se as tropas regressam antes do horário de lançamento!
                        </div>
                    `;
                } else {
                    awayBanner = `
                        <div style="margin-top:4px; color:#10b981; font-size:11px;">
                            ✅ <b>Tropas prontas em casa:</b> ${formatTroopsShort(cV)}
                        </div>
                    `;
                }

                hintBox.innerHTML = `
                    <div style="font-size:11.5px; color:#e2e8f0; line-height:1.4;">
                        ${modeLabel} <span style="color:#38bdf8; font-weight:bold;">${cleanVillageDisplayName(cV)}</span> (${chosenItem.dist.toFixed(1)}c • ⏳ ${chosenItem.timeStr}) • 🌾 Faz. <b>${farmK}k</b> • ⚔️ ${formatTroopsShort(cV)}${palHint}
                        ${awayBanner}
                    </div>
                `;
            }
        }

        if (targetInput) {
            const handleTargetChange = () => {
                let val = targetInput.value;
                if (/^\d{3}$/.test(val) && !val.includes('|')) {
                    targetInput.value = val + '|';
                }
                updateRadiusFakesHUD();
                updateNobleProximityHUD(null, false);
                updateNukeProximityHUD(null, false);
            };
            targetInput.addEventListener('input', handleTargetChange);
            targetInput.addEventListener('change', handleTargetChange);
            targetInput.addEventListener('paste', () => setTimeout(handleTargetChange, 50));
        }

        const selNoblePrimary = document.getElementById('tw-nt-noble-village');
        if (selNoblePrimary) {
            selNoblePrimary.onchange = () => {
                updateNobleProximityHUD(selNoblePrimary.value, true);
                updateNukeProximityHUD(null, false);
            };
        }
        const selNobleSecondary = document.getElementById('tw-nt-noble-village-2');
        if (selNobleSecondary) {
            selNobleSecondary.onchange = () => {
                updateNobleProximityHUD(null, true);
                updateNukeProximityHUD(null, false);
            };
        }
        const chkExcludeCommitted = document.getElementById('tw-nt-exclude-committed');
        if (chkExcludeCommitted) {
            chkExcludeCommitted.onchange = () => {
                updateNobleProximityHUD(null, false);
                updateNukeProximityHUD(null, false);
            };
        }

        const selLeadNukeVillage = document.getElementById('tw-nt-lead-nuke-village');
        if (selLeadNukeVillage) {
            selLeadNukeVillage.onchange = () => {
                updateNukeProximityHUD(selLeadNukeVillage.value, true);
                if (plannerMode === 'single' && typeof updateNobleProximityHUD === 'function') {
                    updateNobleProximityHUD(null, false);
                }
            };
        }
        const chkPreferFullNukes = document.getElementById('tw-nt-prefer-full-nukes');
        if (chkPreferFullNukes) {
            chkPreferFullNukes.onchange = () => {
                updateNukeProximityHUD(null, false);
                if (plannerMode === 'single' && typeof updateNobleProximityHUD === 'function') {
                    updateNobleProximityHUD(null, false);
                }
            };
        }

        document.querySelectorAll('.tw-time-shortcut').forEach(btn => btn.onclick = function() {
            const addH = parseInt(this.getAttribute('data-add-h'), 10);
            const setH = this.getAttribute('data-set-h');
            const landInput = plannerMode === 'single' ? document.getElementById('tw-nt-landtime') : document.getElementById('tw-nt-landtime-multi');
            let d = landInput.value ? new Date(landInput.value) : new Date();

            if (!isNaN(addH)) {
                d = new Date(Date.now() + addH * 3600 * 1000);
            } else if (setH) {
                const targetH = parseInt(setH, 10);
                d = new Date();
                if (d.getHours() >= targetH) {
                    d.setDate(d.getDate() + 1);
                }
                d.setHours(targetH, 0, 0, 0);
            }

            const yr = d.getFullYear();
            const mo = String(d.getMonth() + 1).padStart(2, '0');
            const da = String(d.getDate()).padStart(2, '0');
            const ho = String(d.getHours()).padStart(2, '0');
            const mi = String(d.getMinutes()).padStart(2, '0');
            const se = String(d.getSeconds()).padStart(2, '0');
            landInput.value = `${yr}-${mo}-${da}T${ho}:${mi}:${se}`;
            showToast(`⏰ Hora de Impacto ajustada para ${ho}:${mi}:${se} (${da}/${mo})`);
        });

        const btnMinImpact = document.getElementById('tw-btn-min-impact');
        if (btnMinImpact) {
            btnMinImpact.onclick = (e) => {
                e.preventDefault();
                applyMinimumViableLandTime();
            };
        }

        const savedNukeModel = getPref('tw_nt_model_nuke', 'Ataque Full');
        const savedAntiModel = getPref('tw_nt_model_anti', 'Ataque 50%');
        const savedAntiMode = getPref('tw_nt_anti_mode', 'anti_50_2');
        const savedCatsModel = getPref('tw_nt_model_cats', 'Cats');
        const savedBunkModel1 = getPref('tw_nt_model_bunk1', 'BUNK');
        const savedBunkModel2 = getPref('tw_nt_model_bunk2', 'BUNK');
        const savedFakeModel = getPref('tw_nt_model_fake', 'Fake');
        const savedFakeRadius = getPref('tw_nt_fake_radius', '8');
        const savedFakeCount = getPref('tw_nt_fake_count', '3');
        const savedFakeStyle = getPref('tw_nt_fake_style', 'single');
        const savedFakeMaxOrigin = getPref('tw_nt_fake_max_origin', '2');
        const savedFakeIncTarget = getPref('tw_nt_fake_include_target', 'true');
        const savedFakeSmartLimit = getPref('tw_nt_fake_smart_limit', 'false');
        const savedFakeEnable = getPref('tw_nt_fake_enable', 'false');
        const savedPreferFull = getPref('tw_nt_prefer_full_nukes', 'true');
        const savedReqPaladinNuke = getPref('tw_nt_req_paladin_nuke', 'true');
        const savedNukeCat = getPref('tw_nt_nuke_cat_target', 'place');
        const savedAntiCat = getPref('tw_nt_anti_cat_target', 'none');
        const savedMsInterval = getPref('tw_nt_ms_interval', '200');
        const savedCatDemolishTarget = getPref('tw_nt_cat_target_building', 'main');

        if (document.getElementById('tw-nt-model-nuke')) document.getElementById('tw-nt-model-nuke').value = savedNukeModel;
        if (document.getElementById('tw-nt-model-anti')) document.getElementById('tw-nt-model-anti').value = savedAntiModel;
        if (document.getElementById('tw-nt-anti-mode')) document.getElementById('tw-nt-anti-mode').value = savedAntiMode;
        if (document.getElementById('tw-nt-model-cats')) document.getElementById('tw-nt-model-cats').value = savedCatsModel;
        if (document.getElementById('tw-nt-model-bunker-1')) document.getElementById('tw-nt-model-bunker-1').value = savedBunkModel1;
        if (document.getElementById('tw-nt-model-bunker-2')) document.getElementById('tw-nt-model-bunker-2').value = savedBunkModel2;
        if (document.getElementById('tw-nt-fake-model')) document.getElementById('tw-nt-fake-model').value = savedFakeModel;
        if (document.getElementById('tw-nt-fake-radius')) document.getElementById('tw-nt-fake-radius').value = savedFakeRadius;
        if (document.getElementById('tw-nt-fake-count')) document.getElementById('tw-nt-fake-count').value = savedFakeCount;
        if (document.getElementById('tw-nt-fake-style')) document.getElementById('tw-nt-fake-style').value = savedFakeStyle;
        if (document.getElementById('tw-nt-fake-max-origin')) document.getElementById('tw-nt-fake-max-origin').value = savedFakeMaxOrigin;
        if (document.getElementById('tw-nt-fake-include-target')) document.getElementById('tw-nt-fake-include-target').checked = (savedFakeIncTarget === 'true');
        if (document.getElementById('tw-nt-fake-smart-limit')) document.getElementById('tw-nt-fake-smart-limit').checked = (savedFakeSmartLimit === 'true');
        if (document.getElementById('tw-nt-fake-enable')) {
            const isFakeOn = (savedFakeEnable === 'true');
            document.getElementById('tw-nt-fake-enable').checked = isFakeOn;
            if (boxFakesInputs) {
                boxFakesInputs.style.opacity = isFakeOn ? '1' : '0.4';
                boxFakesInputs.style.pointerEvents = isFakeOn ? 'auto' : 'none';
            }
        }
        if (document.getElementById('tw-nt-prefer-full-nukes')) {
            document.getElementById('tw-nt-prefer-full-nukes').checked = (savedPreferFull === 'true');
            document.getElementById('tw-nt-prefer-full-nukes').onchange = (e) => {
                savePrefs('tw_nt_prefer_full_nukes', String(e.target.checked));
                updateNukeProximityHUD(null, false);
            };
        }
        if (document.getElementById('tw-nt-req-paladin-nuke')) {
            document.getElementById('tw-nt-req-paladin-nuke').checked = (savedReqPaladinNuke === 'true');
            document.getElementById('tw-nt-req-paladin-nuke').onchange = (e) => {
                savePrefs('tw_nt_req_paladin_nuke', String(e.target.checked));
                syncPlannerFormState();
            };
        }
        if (document.getElementById('tw-nt-nuke-cat-target')) document.getElementById('tw-nt-nuke-cat-target').value = savedNukeCat;
        if (document.getElementById('tw-nt-anti-cat-target')) document.getElementById('tw-nt-anti-cat-target').value = savedAntiCat;
        if (document.getElementById('tw-nt-cat-target-building')) document.getElementById('tw-nt-cat-target-building').value = savedCatDemolishTarget;
        if (document.getElementById('tw-nt-ms-interval')) {
            document.getElementById('tw-nt-ms-interval').value = savedMsInterval;
            document.getElementById('tw-nt-ms-interval').oninput = (e) => savePrefs('tw_nt_ms_interval', e.target.value);
        }

        document.getElementById('tw-nt-model-nuke').onchange = (e) => savePrefs('tw_nt_model_nuke', e.target.value);
        document.getElementById('tw-nt-model-anti').onchange = (e) => savePrefs('tw_nt_model_anti', e.target.value);
        if (document.getElementById('tw-nt-model-cats')) document.getElementById('tw-nt-model-cats').onchange = (e) => savePrefs('tw_nt_model_cats', e.target.value);
        document.getElementById('tw-nt-model-bunker-1').onchange = (e) => savePrefs('tw_nt_model_bunk1', e.target.value);
        document.getElementById('tw-nt-model-bunker-2').onchange = (e) => savePrefs('tw_nt_model_bunk2', e.target.value);
        if (document.getElementById('tw-nt-fake-model')) document.getElementById('tw-nt-fake-model').onchange = (e) => savePrefs('tw_nt_model_fake', e.target.value);

        if (document.getElementById('tw-nt-fake-radius')) {
            document.getElementById('tw-nt-fake-radius').oninput = (e) => {
                savePrefs('tw_nt_fake_radius', e.target.value);
                updateRadiusFakesHUD();
            };
        }
        if (document.getElementById('tw-nt-fake-count')) {
            document.getElementById('tw-nt-fake-count').oninput = (e) => {
                savePrefs('tw_nt_fake_count', e.target.value);
                updateRadiusFakesHUD();
            };
        }
        if (document.getElementById('tw-nt-fake-style')) {
            document.getElementById('tw-nt-fake-style').onchange = (e) => {
                savePrefs('tw_nt_fake_style', e.target.value);
                updateRadiusFakesHUD();
            };
        }
        if (document.getElementById('tw-nt-fake-max-origin')) {
            document.getElementById('tw-nt-fake-max-origin').oninput = (e) => {
                savePrefs('tw_nt_fake_max_origin', e.target.value);
            };
        }
        if (document.getElementById('tw-nt-fake-include-target')) {
            document.getElementById('tw-nt-fake-include-target').onchange = (e) => {
                savePrefs('tw_nt_fake_include_target', String(e.target.checked));
                updateRadiusFakesHUD();
            };
        }
        if (document.getElementById('tw-nt-fake-smart-limit')) {
            document.getElementById('tw-nt-fake-smart-limit').onchange = (e) => {
                savePrefs('tw_nt_fake_smart_limit', String(e.target.checked));
                updateRadiusFakesHUD();
            };
        }

        document.getElementById('tw-btn-gen-nt-russo').onclick = async () => {
            try {
                if (plannerMode === 'single') {
                    await buildMasterOPPlan();
                } else {
                    await buildMultiTargetCampaignPlan();
                }
            } catch (err) {
                console.error('[TW Suite Error]', err);
                const statusEl = document.getElementById('tw-nt-status');
                if (statusEl) {
                    statusEl.innerHTML = `<span style="color:#ef4444; font-weight:bold;">❌ Erro ao gerar plano: ${err.message}</span>`;
                }
                alert('❌ Erro ao gerar plano: ' + err.message);
            }
        };

        document.getElementById('tw-btn-commit-1h').onclick = () => {
            if (!lastGeneratedCommands || lastGeneratedCommands.length === 0) {
                alert('Primeiro clica em "Gerar Plano de Ataque" para calibrar os comandos antes de guardar.');
                return;
            }
            const durationMs = parseInt(document.getElementById('tw-commit-duration').value, 10) || 3600000;
            const hours = (durationMs / 3600000);
            const count = commitVillages(lastGeneratedCommands, durationMs, lastGeneratedTarget);
            showToast(`🔒 ${count} aldeias guardadas na memória durante ${hours}h!`);
            document.getElementById('tw-nt-status').innerHTML = `<span style="color:#c084fc;">💾 Agendamento registado na memória por ${hours}h (${count} aldeias reservadas)!</span>`;
        };

        syncPlannerFormState();
        if (plannerMode === 'single') {
            updateNobleProximityHUD(null, false);
            updateNukeProximityHUD(null, false);
        }
    }

    // ==========================================
    // CONFIGURAÇÃO CENTRALIZADA ANTI-SNIPE
    // ==========================================
    function getAntiSnipeConfig() {
        const mode = document.getElementById('tw-nt-anti-mode') ? document.getElementById('tw-nt-anti-mode').value : 'anti_50_2';
        if (mode === 'anti_full_3') return { waves: 3, origins: 'dedicated', defaultModel: 'Ataque Full' };
        if (mode === 'anti_50_2') return { waves: 2, origins: 'max2', defaultModel: 'Ataque 50%' };
        if (mode === 'anti_full_1') return { waves: 1, origins: 'dedicated', defaultModel: 'Ataque Full' };
        if (mode === 'anti_50_1') return { waves: 1, origins: 'max2', defaultModel: 'Ataque 50%' };
        return { waves: 0, origins: 'dedicated', defaultModel: 'Ataque Full' };
    }

    // ==========================================
    // MOTOR DE CAMPANHA MULTIALVO (IA DE ATRIBUIÇÃO)
    // ==========================================
    async function buildMultiTargetCampaignPlan() {
        try {
            const raw = document.getElementById('tw-nt-targets-multi').value;
            const targets = Array.from(new Set(raw.match(/\d{3}\|\d{3}/g) || []));
            if (targets.length === 0) {
                alert('Por favor insere pelo menos uma coordenada alvo válida (ex: 500|500 501|501).');
                return;
            }

            const rawLand = document.getElementById('tw-nt-landtime-multi').value;
            const baseLandTime = new Date(rawLand).getTime();
            if (isNaN(baseLandTime)) {
                alert('Por favor insere uma data e hora de chegada válida.');
                return;
            }

            const attackMode = document.getElementById('tw-nt-attack-mode').value;
            const isCleanOnlyProfile = (attackMode === 'nuke_sweep' || attackMode === 'cat_demolish');
            const rawNobleVal = document.getElementById('tw-nt-noble-count') ? document.getElementById('tw-nt-noble-count').value : '4';
            const parsedNobles = parseInt(rawNobleVal, 10);
            const nobleCount = isCleanOnlyProfile ? 0 : (isNaN(parsedNobles) ? 4 : parsedNobles);
            const hasNobles = nobleCount > 0;

            const leadNukesCount = parseInt(document.getElementById('tw-nt-lead-nukes').value, 10) || 0;
            const { waves: rawAntiWaves, origins: antiOrigins } = getAntiSnipeConfig();
            const antiWavesCount = hasNobles ? rawAntiWaves : 0;
            const bunkerCount = hasNobles ? (parseInt(document.getElementById('tw-nt-bunker-count').value, 10) || 0) : 0;
            const bunkerGapMs = parseInt(document.getElementById('tw-nt-bunker-gap').value, 10) || 200;
            const bunkerStepMs = parseInt(document.getElementById('tw-nt-bunker-step').value, 10) || 50;
            const msStep = parseInt(document.getElementById('tw-nt-ms-interval').value, 10) || 200;
            const halfStep = Math.floor(msStep / 2);

            if (!hasNobles && leadNukesCount === 0 && attackMode !== 'full_storm' && attackMode !== 'cat_demolish') {
                alert('❌ Nenhuma unidade ou ataque selecionado para agendar na campanha (0 Nobres e 0 Limpezas).\nSeleciona pelo menos 1 Nuke de Limpeza ou Nobres.');
                return;
            }

            const modelBunker1 = document.getElementById('tw-nt-model-bunker-1').value.trim() || 'BUNK';
            const popBunker1 = parseInt(document.getElementById('tw-nt-pop-bunker-1').value, 10) || 12000;
            const modelBunker2 = document.getElementById('tw-nt-model-bunker-2').value.trim() || 'BUNK';
            const popBunker2 = parseInt(document.getElementById('tw-nt-pop-bunker-2').value, 10) || 4000;

            const modelNuke = document.getElementById('tw-nt-model-nuke').value.trim() || 'Ataque Full';
            const modelAnti = document.getElementById('tw-nt-model-anti').value.trim() || 'Ataque Full';
            const modelSnob = document.getElementById('tw-nt-model-snob').value.trim() || (nobleCount === 3 ? 'NT 33%' : (nobleCount === 2 ? 'NT - 2 - 50%' : (nobleCount === 1 ? 'Nobre' : 'NT 25%')));
            const catTargetBuilding = document.getElementById('tw-nt-cat-target-building').value;
            const nukeCatTarget = document.getElementById('tw-nt-nuke-cat-target') ? document.getElementById('tw-nt-nuke-cat-target').value : 'place';
            const antiCatTarget = document.getElementById('tw-nt-anti-cat-target') ? document.getElementById('tw-nt-anti-cat-target').value : 'none';
            const modelCats = document.getElementById('tw-nt-model-cats') ? document.getElementById('tw-nt-model-cats').value.trim() || 'Cats' : 'Cats';

            const reqPaladinNuke = document.getElementById('tw-nt-req-paladin-nuke') ? document.getElementById('tw-nt-req-paladin-nuke').checked : true;
            const paladinChoice = document.getElementById('tw-nt-paladin-choice') ? document.getElementById('tw-nt-paladin-choice').value : 'auto';
            const preferFullNukes = document.getElementById('tw-nt-prefer-full-nukes') ? document.getElementById('tw-nt-prefer-full-nukes').checked : true;

            const excludeCommitted = document.getElementById('tw-nt-exclude-committed').checked;
            const committedMap = getCommittedSchedules();

            const now = Date.now();
            const minLaunchMs = now + 60000;

            // Pools de aldeias disponíveis
            const nobleUsage = {};
            allVillages.forEach(v => {
                const ready = v.snobsHome || 0;
                if (ready > 0 && (!excludeCommitted || !committedMap[v.id])) {
                    nobleUsage[v.id] = ready;
                }
            });

            const usedOffVillages = new Set();
            const usedDefVillages = new Set();
            const allCampaignCommands = [];

            // 1. Atribuição de Nobres por Alvo (Heurística de Menor Distância)
            const targetAssignments = [];
            for (const tCoord of targets) {
                let assignedNobleVillages = [];

                if (hasNobles) {
                    const reqNobles = (attackMode === 'snob_solo') ? 1 : nobleCount;
                const candidates = Object.keys(nobleUsage).map(vId => {
                    const v = villagesById[vId];
                    const dist = calcDistance(v.coords, tCoord);
                    const sec = dist * unitSpeedMinutes.snob * 60;
                    const launchMs = baseLandTime - (sec * 1000);
                    return { village: v, dist, sec, launchMs, remaining: nobleUsage[vId] };
                }).filter(c => c.remaining >= reqNobles && c.launchMs >= minLaunchMs)
                  .sort((a, b) => a.dist - b.dist);

                if (candidates.length === 0) {
                    alert(`❌ Não há aldeias com ${reqNobles} nobres livres a tempo de atingir o alvo ${tCoord}!\n\nDica: Alarga a hora de impacto ou reduz a quantidade de nobres.`);
                    return;
                }

                const chosen = candidates[0];
                nobleUsage[chosen.village.id] -= reqNobles;
                assignedNobleVillages.push({
                    village: chosen.village,
                    dist: chosen.dist,
                    sec: chosen.sec,
                    launchMs: chosen.launchMs,
                    nobles: reqNobles
                });
            }

            targetAssignments.push({
                target: tCoord,
                nobles: assignedNobleVillages
            });
        }

        // 2. Alocação de Nukes, Escoltas e Bunkers para cada alvo
        const offPool = allVillages.filter(v => v.rowClass === 'tw-row-off' && (!excludeCommitted || !committedMap[v.id]));
        const defPool = allVillages.filter(v => v.rowClass === 'tw-row-def' && (!excludeCommitted || !committedMap[v.id]));

        for (const assignment of targetAssignments) {
            const tCoord = assignment.target;

            // 1. Nukes de Limpeza (Prioridade Máxima para Paladino)
            for (let i = 0; i < leadNukesCount; i++) {
                const landOffset = hasNobles ? ((leadNukesCount - i) * 100) : ((leadNukesCount - 1 - i) * 100);
                const landMs = baseLandTime - landOffset;
                const nukeOff = findClosestAvailable(offPool, usedOffVillages, tCoord, landMs, minLaunchMs, false, reqPaladinNuke, paladinChoice, preferFullNukes);
                if (nukeOff) {
                    usedOffVillages.add(nukeOff.village.id);
                    const pal = nukeOff.village.paladin;
                    const isPaladin = pal ? (pal.isOffense && pal.isHome) : nukeOff.hasKnight;
                    const palName = pal ? pal.name : 'Paladino';
                    const typeLabel = isPaladin ? `Limpeza #${i+1} (${palName} ⚔️)` : `Limpeza #${i+1}`;
                    const badge = isPaladin ? 'tw-badge-paladino' : 'tw-badge-nuke';
                    const infoLabel = isPaladin ? `Full Off (Buff ${palName} ⚔️${pal ? ' Lvl ' + pal.level : ''})` : 'Full Off';
                    allCampaignCommands.push(makeCmd(typeLabel, badge, 'Attack', nukeOff.village, tCoord, nukeOff.dist, nukeOff.sec, nukeOff.launchTime, new Date(landMs), modelNuke, nukeCatTarget !== 'none' ? nukeCatTarget : '', infoLabel));
                }
            }

            // Se o utilizador pediu Paladino no Nuke, mas NENHUM dos nukes deste alvo tem Paladino:
            if (reqPaladinNuke && leadNukesCount > 0) {
                const targetNukes = allCampaignCommands.filter(c => c.targetCoords === tCoord && c.type.includes('Limpeza'));
                const hasPal = targetNukes.some(c => c.badge === 'tw-badge-paladino');
                if (!hasPal && targetNukes.length > 0) {
                    const primaryNuke = targetNukes[0];
                    const timeUntilLaunch = primaryNuke.launchTime.getTime() - now;
                    let bestPal = null;
                    if (paladinChoice !== 'auto') {
                        bestPal = allAccountPaladins.find(p => String(p.id) === String(paladinChoice)) || null;
                    }
                    if (!bestPal) {
                        const idleOffPaladins = allAccountPaladins
                            .filter(p => p.isOffense && p.isHome)
                            .sort((a, b) => (b.offPoints || b.level) - (a.offPoints || a.level));
                        bestPal = idleOffPaladins[0] || allAccountPaladins.find(p => p.isHome) || null;
                    }
                    if (timeUntilLaunch >= STANDARD_RELOCATE_MS) {
                        const marginMin = Math.floor((timeUntilLaunch - STANDARD_RELOCATE_MS) / 60000);
                        const palName = bestPal ? bestPal.name : 'Paladino';
                        primaryNuke.info = `⚠️ Realocar ${palName}! (+${marginMin}m folga)`;
                        primaryNuke.badge = 'tw-badge-warn';
                        primaryNuke.needsPaladinRelocate = true;
                        if (bestPal) {
                            primaryNuke.relocatePaladinId = bestPal.id;
                            primaryNuke.relocatePaladinName = bestPal.name;
                        }
                    } else {
                        primaryNuke.info = `Sem Paladino (Tempo insuficiente)`;
                    }
                }
            }

            // 2. Catapultas preliminares (Anti-Desvio na Praça de Reunião / Demolição) - forbidPaladin = true
            if (attackMode === 'full_storm') {
                const pracaOffsetsMin = [10, 3];
                pracaOffsetsMin.forEach(minBefore => {
                    const pracaOff = findClosestAvailable(offPool, usedOffVillages, tCoord, baseLandTime - (minBefore * 60 * 1000), minLaunchMs, true);
                    if (pracaOff) {
                        usedOffVillages.add(pracaOff.village.id);
                        allCampaignCommands.push(makeCmd(`Praça (-${minBefore}m)`, 'tw-badge-praca', 'Attack', pracaOff.village, tCoord, pracaOff.dist, pracaOff.sec, pracaOff.launchTime, new Date(baseLandTime - (minBefore * 60 * 1000)), modelCats, 'place', 'Anti-Desvio'));
                    }
                });
            } else if (attackMode === 'cat_demolish') {
                const bld = catTargetBuilding !== 'none' ? catTargetBuilding : 'place';
                const catOff = findClosestAvailable(offPool, usedOffVillages, tCoord, baseLandTime - (10 * 60 * 1000), minLaunchMs, true);
                if (catOff) {
                    usedOffVillages.add(catOff.village.id);
                    allCampaignCommands.push(makeCmd('Demolição (-10m)', 'tw-badge-praca', 'Attack', catOff.village, tCoord, catOff.dist, catOff.sec, catOff.launchTime, new Date(baseLandTime - (10 * 60 * 1000)), modelCats, bld, 'Catapultas'));
                }
            }

            // Nobres / Bate e Volta
            let lastNobleImpactMs = baseLandTime + (Math.max(1, nobleCount - 1) * msStep);
            if (hasNobles && attackMode === 'snob_solo') {
                assignment.nobles.forEach(nItem => {
                    const numTrips = Math.max(1, nobleCount || 4);
                    const travelSec = nItem.sec;
                    const travelMs = Math.round(travelSec * 1000);
                    const bufferMs = 2000;

                    let currentLaunchMs = baseLandTime - travelMs;
                    let currentLandMs = baseLandTime;

                    for (let trip = 1; trip <= numTrips; trip++) {
                        const isConquest = (trip === numTrips);
                        const typeLabel = isConquest ? `Bate e Volta #${trip} (Conquista)` : `Bate e Volta #${trip}`;
                        const returnMs = currentLandMs + travelMs;
                        const retD = new Date(returnMs);
                        const returnTimeStr = `${retD.toLocaleTimeString('pt-PT')}:${String(retD.getMilliseconds()).padStart(3,'0')}`;
                        const returnDateStr = `${String(retD.getDate()).padStart(2,'0')}/${String(retD.getMonth()+1).padStart(2,'0')}`;
                        const infoLabel = isConquest 
                            ? `Viagem ${trip}/${numTrips} • Conquista Final` 
                            : `Viagem ${trip}/${numTrips} • Retorno: ${returnTimeStr} (${returnDateStr})`;

                        allCampaignCommands.push(makeCmd(typeLabel, isConquest ? 'tw-badge-snob' : 'tw-badge-anti', 'Attack', nItem.village, tCoord, nItem.dist.toFixed(2), travelSec, new Date(currentLaunchMs), new Date(currentLandMs), modelSnob, '', infoLabel));

                        lastNobleImpactMs = currentLandMs;

                        currentLaunchMs = returnMs + bufferMs;
                        currentLandMs = currentLaunchMs + travelMs;
                    }
                });
            } else if (hasNobles) {
                assignment.nobles.forEach(nItem => {
                    allCampaignCommands.push(makeCmd(`Combo NT (${nItem.nobles}N)`, 'tw-badge-snob', 'Attack', nItem.village, tCoord, nItem.dist.toFixed(2), nItem.sec, new Date(nItem.launchMs), new Date(baseLandTime), modelSnob, '', `${nItem.nobles} Nobres`));
                });
            }

            // Escoltas Anti-Snipe (NUNCA gastam aldeia com Paladino: forbidPaladin = true)
            if (hasNobles && antiWavesCount > 0) {
                const antiOffsets = [halfStep, msStep + halfStep, (2 * msStep) + halfStep].slice(0, antiWavesCount);
                if (antiOrigins === 'max2') {
                    const v1 = findClosestAvailable(offPool, usedOffVillages, tCoord, baseLandTime + antiOffsets[0], minLaunchMs, true);
                    let v2 = null;
                    if (v1) {
                        usedOffVillages.add(v1.village.id);
                        if (antiWavesCount > 1) {
                            v2 = findClosestAvailable(offPool, usedOffVillages, tCoord, baseLandTime + antiOffsets[antiOffsets.length - 1], minLaunchMs, true);
                            if (v2) usedOffVillages.add(v2.village.id);
                        }
                    }
                    antiOffsets.forEach((offset, idx) => {
                        const landMs = baseLandTime + offset;
                        let cand = null;
                        if (antiWavesCount === 3) {
                            cand = (idx === 0 || idx === 1) ? v1 : (v2 || v1);
                        } else if (antiWavesCount === 2) {
                            cand = (idx === 0) ? v1 : (v2 || v1);
                        } else {
                            cand = v1;
                        }
                        if (cand) {
                            const launchMs = landMs - (cand.sec * 1000);
                            allCampaignCommands.push(makeCmd(`Anti-Snipe #${idx+1}`, 'tw-badge-anti', 'Attack', cand.village, tCoord, cand.dist, cand.sec, new Date(launchMs), new Date(landMs), modelAnti, antiCatTarget !== 'none' ? antiCatTarget : '', `Escolta Anti-Snipe (${modelAnti})`));
                        }
                    });
                } else {
                    antiOffsets.forEach((offset, idx) => {
                        const landMs = baseLandTime + offset;
                        const antiOff = findClosestAvailable(offPool, usedOffVillages, tCoord, landMs, minLaunchMs, true);
                        if (antiOff) {
                            usedOffVillages.add(antiOff.village.id);
                            allCampaignCommands.push(makeCmd(`Anti-Snipe #${idx+1}`, 'tw-badge-anti', 'Attack', antiOff.village, tCoord, antiOff.dist, antiOff.sec, antiOff.launchTime, new Date(landMs), modelAnti, antiCatTarget !== 'none' ? antiCatTarget : '', 'Escolta Anti-Snipe'));
                        }
                    });
                }
            }

            // Bunkers de Conquista
            if (hasNobles && bunkerCount > 0) {
                const finalNobleImpactMs = lastNobleImpactMs;
                for (let b = 1; b <= bunkerCount; b++) {
                    const bunkerLandMs = finalNobleImpactMs + bunkerGapMs + ((b - 1) * bunkerStepMs);
                    const bunkDef = findClosestDefBunker(defPool, usedDefVillages, tCoord, bunkerLandMs, minLaunchMs, popBunker2, popBunker1, modelBunker1, modelBunker2);
                    if (bunkDef) {
                        usedDefVillages.add(bunkDef.village.id);
                        allCampaignCommands.push(makeCmd(`Bunker Apoio #${b}`, bunkDef.hasKnight ? 'tw-badge-paladino' : 'tw-badge-bunker', 'Support', bunkDef.village, tCoord, bunkDef.dist, bunkDef.sec, bunkDef.launchTime, new Date(bunkerLandMs), bunkDef.model, '', bunkDef.info));
                    }
                }
            }
        }

        // 3. Cortina de Fakes & Saturação na Campanha
        const isCampaignFakeEnabled = document.getElementById('tw-nt-fake-enable') && document.getElementById('tw-nt-fake-enable').checked;
        if (isCampaignFakeEnabled) {
            const fakeRadius = parseFloat(document.getElementById('tw-nt-fake-radius') ? document.getElementById('tw-nt-fake-radius').value : '8') || 8;
            const fakesPerNeighbor = parseInt(document.getElementById('tw-nt-fake-count') ? document.getElementById('tw-nt-fake-count').value : '3', 10) || 3;
            const fakeStyle = document.getElementById('tw-nt-fake-style') ? document.getElementById('tw-nt-fake-style').value : 'single';
            const fakeMaxPerOrigin = parseInt(document.getElementById('tw-nt-fake-max-origin') ? document.getElementById('tw-nt-fake-max-origin').value : '2', 10) || 2;
            const fakeIncludeTarget = document.getElementById('tw-nt-fake-include-target') ? document.getElementById('tw-nt-fake-include-target').checked : true;
            const fakeModelName = document.getElementById('tw-nt-fake-model') ? document.getElementById('tw-nt-fake-model').value.trim() || 'Fake' : 'Fake';
            const fakeSmartLimit = document.getElementById('tw-nt-fake-smart-limit') ? document.getElementById('tw-nt-fake-smart-limit').checked : false;

            let fakeSpeedMin = unitSpeedMinutes.ram; // 30 min/campo padrão
            if (fakeStyle === 'snob') fakeSpeedMin = unitSpeedMinutes.snob; // 35 min/campo
            else if (fakeStyle === 'spy') fakeSpeedMin = unitSpeedMinutes.spy; // 9 min/campo

            const myCoords = new Set(allVillages.map(v => v.coords));
            const seenTargets = new Set();
            const campaignNeighborTargets = [];

            if (!worldVillagesLoaded) {
                await fetchWorldVillages();
            }

            for (const tCoord of targets) {
                if (fakeIncludeTarget && !seenTargets.has(tCoord)) {
                    seenTargets.add(tCoord);
                    campaignNeighborTargets.push({ coord: tCoord, dist: 0, isRealTarget: true });
                }
                const [tx, ty] = tCoord.split('|').map(Number);
                if (worldVillages.length > 0) {
                    const targetObj = worldVillages.find(v => v.coord === tCoord);
                    const targetPlayerId = targetObj ? targetObj.playerId : null;
                    worldVillages.forEach(v => {
                        if (seenTargets.has(v.coord) || myCoords.has(v.coord)) return;
                        if (targetPlayerId && targetPlayerId !== '0' && v.playerId !== targetPlayerId) return;
                        const dist = Math.hypot(v.x - tx, v.y - ty);
                        if (dist <= fakeRadius) {
                            seenTargets.add(v.coord);
                            campaignNeighborTargets.push({ coord: v.coord, dist, isRealTarget: false });
                        }
                    });
                }
            }

            const fakePool = allVillages.filter(v => !excludeCommitted || !committedMap[v.id]);
            const originUsageCount = {};

            campaignNeighborTargets.forEach(nTarget => {
                let fakesAssigned = 0;
                const validOrigins = fakePool.map(v => {
                    const dist = calcDistance(v.coords, nTarget.coord);
                    const travelSec = dist * fakeSpeedMin * 60;
                    return { village: v, dist, travelSec };
                }).filter(item => {
                    const launchMs = baseLandTime - (item.travelSec * 1000);
                    return launchMs >= minLaunchMs;
                }).sort((a, b) => a.dist - b.dist);

                for (let i = 0; i < validOrigins.length && fakesAssigned < fakesPerNeighbor; i++) {
                    const cand = validOrigins[i];
                    const usedCount = originUsageCount[cand.village.id] || 0;
                    if (usedCount >= fakeMaxPerOrigin) continue;

                    const fakeModelRes = resolveFakeModel(cand.village, fakeModelName, fakeSmartLimit);
                    const chosenFakeModel = fakeModelRes.model;
                    const ptsInfo = fakeSmartLimit ? ` • ${fakeModelRes.pts.toLocaleString('pt-PT')} pts` : '';

                    if (fakeStyle === 'fake_nt') {
                        for (let wave = 0; wave < 4; wave++) {
                            const waveOffset = wave * 100;
                            const landMs = baseLandTime + waveOffset;
                            const launchMs = landMs - (cand.travelSec * 1000);
                            allCampaignCommands.push(makeCmd(`🎭 Fake NT #${fakesAssigned + 1} (${wave + 1}/4)`, 'tw-badge-praca', 'Attack', cand.village, nTarget.coord, cand.dist, cand.travelSec, new Date(launchMs), new Date(landMs), chosenFakeModel, '', nTarget.isRealTarget ? `Fake NT Alvo Real (${fakeSpeedMin}m/c${ptsInfo})` : `Fake NT (${fakeSpeedMin}m/c${ptsInfo})`));
                        }
                        originUsageCount[cand.village.id] = usedCount + 1;
                        fakesAssigned++;
                    } else {
                        const launchMs = baseLandTime - (cand.travelSec * 1000);
                        const typeLabel = nTarget.isRealTarget ? '🎭 Fake Saturação' : '🎭 Fake Cortina';
                        const infoLabel = nTarget.isRealTarget ? `Saturação Alvo (${fakeSpeedMin}m/c${ptsInfo})` : `Cortina (${fakeSpeedMin}m/c${ptsInfo})`;
                        allCampaignCommands.push(makeCmd(typeLabel, 'tw-badge-praca', 'Attack', cand.village, nTarget.coord, cand.dist, cand.travelSec, new Date(launchMs), new Date(baseLandTime), chosenFakeModel, '', infoLabel));
                        originUsageCount[cand.village.id] = usedCount + 1;
                        fakesAssigned++;
                    }
                }
            });
        }

        allCampaignCommands.sort((a, b) => {
            const aIsFake = (a.type && a.type.includes('Fake')) ? 1 : 0;
            const bIsFake = (b.type && b.type.includes('Fake')) ? 1 : 0;
            if (aIsFake !== bIsFake) return aIsFake - bIsFake;
            return a.launchTime - b.launchTime;
        });
        lastGeneratedCommands = allCampaignCommands;
        lastGeneratedTarget = targets.join(' ');

        let rows = '', output = '';
        allCampaignCommands.forEach((cmd, i) => {
            let actionShortcut = '';
            if (cmd.needsPaladinRelocate || (cmd.info && cmd.info.includes('Realocar Paladino')) || (cmd.info && cmd.info.includes('Realocar '))) {
                const knightParam = cmd.relocatePaladinId ? `&mode=knight&knight=${cmd.relocatePaladinId}` : '';
                const btnText = cmd.relocatePaladinName ? `🏰 Puxar ${cmd.relocatePaladinName}` : '🏰 Puxar Paladino';
                const titleText = cmd.relocatePaladinName 
                    ? `Abre a Estátua da aldeia ${cmd.originName} (${cmd.originCoords}) focada no ${cmd.relocatePaladinName} para o puxares imediatamente` 
                    : `Abre a Estátua da aldeia ${cmd.originName} (${cmd.originCoords}) noutro separador para puxares o Paladino`;

                let palSelectOptions = '';
                if (allAccountPaladins && allAccountPaladins.length > 0) {
                    palSelectOptions = `
                    <select class="tw-select tw-quick-reloc-select" data-cmd-idx="${i}" data-vid="${cmd.originId}" style="font-size:9.5px; padding:1px 4px; background:#0f172a; border:1px solid #c084fc; color:#e9d5ff; border-radius:4px; margin-left:4px; cursor:pointer;" title="Mudar qual Paladino queres puxar para esta aldeia">
                        ${allAccountPaladins.map(p => `<option value="${p.id}" ${String(p.id) === String(cmd.relocatePaladinId) ? 'selected' : ''}>${p.isOffense ? '⚔️' : '🛡️'} ${p.name} (Lvl ${p.level}${p.name === 'QuimConquista' ? ' • Persuasão' : ''})</option>`).join('')}
                    </select>`;
                }

                actionShortcut = `
                <span style="display:inline-flex; align-items:center; vertical-align:middle; margin-left:6px;">
                    <a href="game.php?village=${cmd.originId}&screen=statue${knightParam}" target="_blank" id="tw-btn-reloc-${i}" class="tw-btn" style="padding:2px 7px; font-size:9.5px; font-weight:bold; background:#7c3aed; border:1px solid #c084fc; color:#fff; border-radius:4px; text-decoration:none; display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="${titleText}">${btnText}</a>
                    ${palSelectOptions}
                </span>`;
            }

            const bldBadge = cmd.building ? `<span style="display:inline-block; margin-left:4px; padding:1px 5px; font-size:9px; font-weight:bold; background:rgba(244,63,94,0.15); border:1px solid rgba(244,63,94,0.4); color:#fda4af; border-radius:3px;">🎯 ${formatBuildingName(cmd.building)}</span>` : '';

            rows += `<tr data-vid="${cmd.originId}">
                <td style="color:#94a3b8; padding:3px 6px;">${i+1}</td>
                <td style="padding:3px 6px;"><span class="${cmd.badge}">${cmd.type}</span></td>
                <td style="text-align:left; padding:3px 6px 3px 10px; font-weight:bold; color:#38bdf8;">${cmd.originName}</td>
                <td style="font-weight:bold; color:#fbbf24; padding:3px 6px;">${cmd.targetCoords}</td>
                <td style="padding:3px 6px;">${cmd.dist}c</td>
                <td style="padding:3px 6px;"><b style="color:#f8fafc;">${cmd.launchTime.toLocaleTimeString('pt-PT')}:${String(cmd.launchTime.getMilliseconds()).padStart(3,'0')}</b> <span style="font-size:9.5px; color:#64748b; font-weight:normal;">(${String(cmd.launchTime.getDate()).padStart(2,'0')}/${String(cmd.launchTime.getMonth()+1).padStart(2,'0')})</span></td>
                <td style="padding:3px 6px;"><b style="color:#38bdf8;">${cmd.landTime.toLocaleTimeString('pt-PT')}:${String(cmd.landTime.getMilliseconds()).padStart(3,'0')}</b> <span style="font-size:9.5px; color:#64748b; font-weight:normal;">(${String(cmd.landTime.getDate()).padStart(2,'0')}/${String(cmd.landTime.getMonth()+1).padStart(2,'0')})</span></td>
                <td style="padding:3px 6px;"><b style="color:${cmd.actionType==='Support'?'#34d399':'#3fb950'};">${cmd.model}</b>${bldBadge} <span style="font-size:10px; color:#94a3b8;">(${cmd.info})</span>${actionShortcut}</td>
            </tr>`;

            let u = `https://${location.host}/game.php?village=${cmd.originId}&screen=place&target_coord=${cmd.targetCoords}${cmd.building ? `&target_building=${cmd.building}` : ''}`;
            let bldStr = cmd.building ? `${cmd.building}[|]` : '';
            output += `[*]${i+1}. ${formatRussianDateTime(cmd.launchTime)} --- ${cmd.model}[|]${formatRussianDateTime(cmd.landTime)}[|] ${cmd.originCoords} --> ${cmd.targetCoords} [|]${bldStr}[url=${u}]Link[/url]\n`;
        });

        document.getElementById('tw-nt-tbody').innerHTML = rows;
        bindQuickRelocEvents();
        const previewEl = document.getElementById('tw-nt-preview');
        if (previewEl) {
            previewEl.value = output.trim();
        }
        let copied = false;
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(output.trim());
                copied = true;
            }
        } catch (clipErr) {
            console.warn('[TW Suite] Falha ao copiar para clipboard automaticamente:', clipErr);
        }
        const tPanel = document.getElementById('tw-nt-table-panel');
        if (tPanel) {
            tPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        const cmdCounterEl = document.getElementById('tw-nt-cmd-counter');
        if (cmdCounterEl) {
            cmdCounterEl.innerText = `${allCampaignCommands.length} comandos (${targets.length} alvos)`;
        }
        const copyNotice = copied ? 'copiada para o Clipboard' : 'gerada (copia do campo de texto)';
        if (attackMode === 'nuke_sweep' || attackMode === 'cat_demolish' || !hasNobles) {
            document.getElementById('tw-nt-status').innerHTML = `<span style="color:#34d399;">✅ Campanha de Limpeza: ${targets.length} alvos (${allCampaignCommands.length} nukes) ${copyNotice}!</span>`;
            showToast(copied ? `⚡ Campanha de Limpeza copiada para o Clipboard!` : `⚡ Campanha gerada com sucesso!`);
        } else {
            document.getElementById('tw-nt-status').innerHTML = `<span style="color:#34d399;">✅ Campanha de ${targets.length} alvos (${allCampaignCommands.length} comandos) ${copyNotice}!</span>`;
            showToast(copied ? `⚡ Campanha copiada para o Clipboard!` : `⚡ Campanha gerada com sucesso!`);
        }
    } catch (err) {
        console.error('[TW Suite Error] buildMultiTargetCampaignPlan:', err);
        const statusEl = document.getElementById('tw-nt-status');
        if (statusEl) {
            statusEl.innerHTML = `<span style="color:#ef4444; font-weight:bold;">❌ Erro: ${err.message}</span>`;
        }
        alert('❌ Erro ao gerar plano de campanha: ' + err.message);
    }
}

    function findClosestAvailable(pool, usedSet, targetCoord, targetLandMs, minLaunchMs, forbidPaladin = false, preferPaladin = false, paladinChoice = 'auto', preferFull = false) {
        let bestPal = null, bestPalDist = Infinity;
        let bestFull = null, bestFullDist = Infinity;
        let bestFullReady = null, bestFullReadyDist = Infinity;
        let best = null, bestDist = Infinity;
        let bestFallback = null, bestFallbackDist = Infinity;

        pool.forEach(v => {
            if (usedSet.has(v.id)) return;
            const dist = calcDistance(v.coords, targetCoord);
            const sec = dist * unitSpeedMinutes.ram * 60;
            const launchMs = targetLandMs - (sec * 1000);
            if (launchMs >= minLaunchMs) {
                const pal = v.paladin;
                const hasKnight = pal ? pal.isHome : ((v.knightAvailable || (v.homeTroopsDict && v.homeTroopsDict.knight) || 0) >= 1);
                let hasMatchingPaladin = false;
                if (paladinChoice === 'auto') {
                    hasMatchingPaladin = pal ? (pal.isOffense && pal.isHome) : hasKnight;
                } else {
                    hasMatchingPaladin = pal ? (String(pal.id) === String(paladinChoice) && pal.isHome) : false;
                }
                const hasOffPaladin = pal ? (pal.isOffense && pal.isHome) : hasKnight;
                const isFullNuke = (v.farm && v.farm.used >= 20000) || (v.roleTag && v.roleTag.label && v.roleTag.label.includes('Full Nuke'));
                const candObj = { village: v, dist: dist.toFixed(2), sec, launchTime: new Date(launchMs), hasKnight, hasOffPaladin, hasMatchingPaladin, isFullNuke, hasTroopsAway: v.hasTroopsAway };

                if (!forbidPaladin || !hasKnight) {
                    if (preferPaladin && hasMatchingPaladin) {
                        if (dist < bestPalDist) {
                            bestPalDist = dist;
                            bestPal = candObj;
                        }
                    }
                    if (preferFull && isFullNuke) {
                        if (!v.hasTroopsAway && dist < bestFullReadyDist) {
                            bestFullReadyDist = dist;
                            bestFullReady = candObj;
                        }
                        if (dist < bestFullDist) {
                            bestFullDist = dist;
                            bestFull = candObj;
                        }
                    }
                    if (dist < bestDist) {
                        bestDist = dist;
                        best = candObj;
                    }
                } else {
                    if (dist < bestFallbackDist) {
                        bestFallbackDist = dist;
                        bestFallback = candObj;
                    }
                }
            }
        });
        if (preferPaladin && bestPal && (!bestFull || bestPalDist <= bestFullDist + 3)) return bestPal;
        if (preferFull && bestFullReady && (!bestFull || bestFullReadyDist <= bestFullDist + 1)) return bestFullReady;
        if (preferFull && bestFull) return bestFull;
        return best || bestFallback;
    }

    function findClosestDefBunker(pool, usedSet, targetCoord, targetLandMs, minLaunchMs, minPop2, minPop1, model1, model2) {
        let best = null;
        let bestDist = Infinity;
        pool.forEach(v => {
            if (usedSet.has(v.id)) return;
            const d = v.homeTroopsDict || v.troopsDict;
            const defPop = (d.spear||0)*1 + (d.sword||0)*1 + (d.archer||0)*1 + (d.heavy||0)*6;
            if (defPop < minPop2) return;

            const pal = v.paladin;
            const hasKnight = pal ? pal.isHome : ((v.knightAvailable || d.knight || 0) >= 1);
            const speedMin = hasKnight ? unitSpeedMinutes.knight : unitSpeedMinutes.sword;
            const dist = calcDistance(v.coords, targetCoord);
            const sec = dist * speedMin * 60;
            const launchMs = targetLandMs - (sec * 1000);

            if (launchMs >= minLaunchMs && dist < bestDist) {
                bestDist = dist;
                const chosenModel = defPop >= minPop1 ? model1 : model2;
                const palTag = pal ? `${pal.name} 🛡️ (Lvl ${pal.level})` : 'Paladino';
                const infoStr = hasKnight ? `${palTag} (${formatDuration(sec)}) • ${(defPop/1000).toFixed(1)}k` : `Espada (${formatDuration(sec)}) • ${(defPop/1000).toFixed(1)}k`;
                best = { village: v, dist: dist.toFixed(2), sec, launchTime: new Date(launchMs), model: chosenModel, hasKnight, info: infoStr };
            }
        });
        return best;
    }

    function makeCmd(type, badge, actionType, v, targetCoords, dist, sec, launchTime, landTime, model, building = '', info = '') {
        return {
            type, badge, actionType,
            originId: v.id,
            originName: v.name,
            originCoords: v.coords,
            targetCoords,
            dist, sec, launchTime, landTime, model, building, info,
            needsPaladinRelocate: false,
            relocatePaladinId: null,
            relocatePaladinName: null
        };
    }

    function bindQuickRelocEvents() {
        document.querySelectorAll('.tw-quick-reloc-select').forEach(sel => {
            sel.onchange = (e) => {
                const newPalId = e.target.value;
                const cmdIdx = parseInt(e.target.getAttribute('data-cmd-idx'), 10);
                const vId = e.target.getAttribute('data-vid');
                const palObj = allAccountPaladins.find(p => String(p.id) === String(newPalId));
                if (!palObj) return;

                if (lastGeneratedCommands && lastGeneratedCommands[cmdIdx]) {
                    lastGeneratedCommands[cmdIdx].relocatePaladinId = palObj.id;
                    lastGeneratedCommands[cmdIdx].relocatePaladinName = palObj.name;
                    const marginMatch = (lastGeneratedCommands[cmdIdx].info || '').match(/\(\+(\d+m)\s+folga\)/);
                    const folgaStr = marginMatch ? ` (+${marginMatch[1]} folga)` : '';
                    lastGeneratedCommands[cmdIdx].info = `⚠️ Realocar ${palObj.name}!${folgaStr}`;
                }

                const btn = document.getElementById(`tw-btn-reloc-${cmdIdx}`);
                if (btn) {
                    btn.href = `game.php?village=${vId}&screen=statue&mode=knight&knight=${palObj.id}`;
                    btn.innerHTML = `🏰 Puxar ${palObj.name}`;
                    btn.title = `Abre a Estátua da aldeia focada no ${palObj.name} para o puxares imediatamente`;
                }

                const tr = e.target.closest('tr');
                if (tr) {
                    const infoSpan = tr.querySelector('span[style*="color:#94a3b8"]');
                    if (infoSpan && lastGeneratedCommands && lastGeneratedCommands[cmdIdx]) {
                        infoSpan.textContent = `(${lastGeneratedCommands[cmdIdx].info})`;
                    }
                }
                showToast(`🏰 Alvo de realocação alterado para ${palObj.name}!`);
            };
        });
    }

    // ==========================================
    // MOTOR DE CALENDÁRIO & SINCRONIZAÇÃO (ALVO ÚNICO)
    // ==========================================
    async function buildMasterOPPlan() {
        try {
            const target = document.getElementById('tw-nt-target').value.trim();
            if (!/^\d{3}\|\d{3}$/.test(target)) {
                alert('Por favor insere uma coordenada alvo válida (ex: 500|500).');
                return;
            }

            const rawLand = document.getElementById('tw-nt-landtime').value;
            const baseLandTime = new Date(rawLand).getTime();
            if (isNaN(baseLandTime)) {
                alert('Por favor insere uma data e hora de chegada válida.');
                return;
            }

            const attackMode = document.getElementById('tw-nt-attack-mode').value;
            const architecture = document.getElementById('tw-nt-architecture').value;
            const isCleanOnlyProfile = (attackMode === 'nuke_sweep' || attackMode === 'cat_demolish');
            const rawNobleVal = document.getElementById('tw-nt-noble-count') ? document.getElementById('tw-nt-noble-count').value : '4';
            const parsedNobles = parseInt(rawNobleVal, 10);
            const nobleCount = isCleanOnlyProfile ? 0 : (isNaN(parsedNobles) ? 4 : parsedNobles);
            const hasNobles = nobleCount > 0;
            const excludeCommitted = document.getElementById('tw-nt-exclude-committed').checked;
            const committedMap = getCommittedSchedules();

            let nobleVillage1 = null, nobleVillage2 = null;
            if (hasNobles) {
                const nobleVillageId1 = document.getElementById('tw-nt-noble-village').value;
                nobleVillage1 = villagesById[nobleVillageId1];
                if (!nobleVillage1) {
                    alert('Por favor seleciona a aldeia de nobres.');
                    return;
                }

                const needed1 = (architecture === 'split_2x2' && attackMode === 'split_2x2') ? 2 : (attackMode === 'snob_solo' ? 1 : nobleCount);
                const totalPotentialNobles1 = nobleVillage1.snobsHome + (nobleVillage1.snobsInProd || 0) + (nobleVillage1.snobsReturning || 0);
                if (totalPotentialNobles1 < needed1) {
                    const diff = needed1 - totalPotentialNobles1;
                    const confirmMsg = `⚠️ ALERTA: NOBRES INSUFICIENTES!\n\nA aldeia "${cleanVillageDisplayName(nobleVillage1)}" tem apenas ${nobleVillage1.snobsHome} nobre(s) na aldeia (${nobleVillage1.snobsInProd || 0} em treino, ${nobleVillage1.snobsReturning || 0} a caminho — total: ${totalPotentialNobles1}).\n\nPara esta operação são necessários ${needed1} nobre(s) (faltam ${diff}).\n\nDesejas avançar e gerar o plano mesmo assim?`;
                    if (!confirm(confirmMsg)) {
                        return;
                    }
                }

                if (architecture === 'split_2x2' && attackMode === 'split_2x2') {
                    const nobleVillageId2 = document.getElementById('tw-nt-noble-village-2').value;
                    nobleVillage2 = villagesById[nobleVillageId2];
                    if (!nobleVillage2 || nobleVillage2.id === nobleVillage1.id) {
                        alert('Para a divisão 2x2, seleciona duas aldeias de nobres distintas.');
                        return;
                    }
                    const totalPotentialNobles2 = nobleVillage2.snobsHome + (nobleVillage2.snobsInProd || 0) + (nobleVillage2.snobsReturning || 0);
                    if (totalPotentialNobles2 < 2) {
                        const diff2 = 2 - totalPotentialNobles2;
                        const confirmMsg2 = `⚠️ ALERTA: NOBRES INSUFICIENTES (2ª Aldeia)!\n\nA 2ª aldeia "${cleanVillageDisplayName(nobleVillage2)}" tem apenas ${nobleVillage2.snobsHome} nobre(s) na aldeia (${nobleVillage2.snobsInProd || 0} em treino, ${nobleVillage2.snobsReturning || 0} a caminho — total: ${totalPotentialNobles2}).\n\nSão necessários 2 nobres (faltam ${diff2}).\n\nDesejas avançar e gerar o plano mesmo assim?`;
                        if (!confirm(confirmMsg2)) {
                            return;
                        }
                    }
                }
            }

            const bunkerCount = hasNobles ? (parseInt(document.getElementById('tw-nt-bunker-count').value, 10) || 0) : 0;
            const bunkerGapMs = parseInt(document.getElementById('tw-nt-bunker-gap').value, 10) || 200;
            const bunkerStepMs = parseInt(document.getElementById('tw-nt-bunker-step').value, 10) || 50;

            const modelBunker1 = document.getElementById('tw-nt-model-bunker-1').value.trim() || 'BUNK';
            const popBunker1 = parseInt(document.getElementById('tw-nt-pop-bunker-1').value, 10) || 12000;
            const modelBunker2 = document.getElementById('tw-nt-model-bunker-2').value.trim() || 'BUNK';
            const popBunker2 = parseInt(document.getElementById('tw-nt-pop-bunker-2').value, 10) || 4000;

            const leadNukesCount = parseInt(document.getElementById('tw-nt-lead-nukes').value, 10) || 0;
            const { waves: rawAntiWaves, origins: antiOrigins } = getAntiSnipeConfig();
            const antiWavesCount = hasNobles ? rawAntiWaves : 0;
            const msStep = parseInt(document.getElementById('tw-nt-ms-interval').value, 10) || 200;
            const halfStep = Math.floor(msStep / 2);

            if (!hasNobles && leadNukesCount === 0 && attackMode !== 'full_storm' && attackMode !== 'cat_demolish') {
                alert('❌ Nenhuma unidade ou ataque selecionado para agendar (0 Nobres e 0 Limpezas).\nSeleciona pelo menos 1 Nuke de Limpeza ou Nobres.');
                return;
            }
        
        const reqPaladinNuke = document.getElementById('tw-nt-req-paladin-nuke') ? document.getElementById('tw-nt-req-paladin-nuke').checked : true;
        const paladinChoice = document.getElementById('tw-nt-paladin-choice') ? document.getElementById('tw-nt-paladin-choice').value : 'auto';
        const modelNuke = document.getElementById('tw-nt-model-nuke').value.trim() || 'Ataque Full';
        const modelAnti = document.getElementById('tw-nt-model-anti').value.trim() || 'Ataque Full';
        const modelSnob = document.getElementById('tw-nt-model-snob').value.trim() || (needed1 === 3 ? 'NT 33%' : (needed1 === 2 ? 'NT - 2 - 50%' : (needed1 === 1 ? 'Nobre' : 'NT 25%')));
        const catTargetBuilding = document.getElementById('tw-nt-cat-target-building').value;
        const nukeCatTarget = document.getElementById('tw-nt-nuke-cat-target') ? document.getElementById('tw-nt-nuke-cat-target').value : 'place';
        const antiCatTarget = document.getElementById('tw-nt-anti-cat-target') ? document.getElementById('tw-nt-anti-cat-target').value : 'none';

        const now = Date.now();
        const MARGIN_MS = 5 * 60 * 1000;
        const minLaunchMs = now + MARGIN_MS;

        const bvAnchor = document.getElementById('tw-nt-bv-anchor') ? document.getElementById('tw-nt-bv-anchor').value : 'first';
        let snobDist1 = 0, snobSec1 = 0, nobleLaunchMs1 = 0, trip1AnchorLandMs = baseLandTime;
        if (nobleVillage1) {
            snobDist1 = calcDistance(nobleVillage1.coords, target);
            snobSec1 = snobDist1 * unitSpeedMinutes.snob * 60;
            const travelMs1 = Math.round(snobSec1 * 1000);
            const numTrips = Math.max(1, nobleCount || 4);

            if (attackMode === 'snob_solo' && bvAnchor === 'final') {
                const totalCycleMs = (2 * travelMs1) + 2000;
                trip1AnchorLandMs = baseLandTime - ((numTrips - 1) * totalCycleMs);
            }
            nobleLaunchMs1 = trip1AnchorLandMs - travelMs1;

            const needed1 = (architecture === 'split_2x2' && attackMode === 'split_2x2') ? 2 : (attackMode === 'snob_solo' ? 1 : nobleCount);
            const readiness1 = calculateEarliestViableNobleTime(nobleVillage1, needed1);
            const minAllowedLaunchMs1 = Math.max(minLaunchMs, readiness1.isFullyReadyNow ? minLaunchMs : (readiness1.readyAtMs + MARGIN_MS));

            if (nobleLaunchMs1 < minAllowedLaunchMs1) {
                const calc = calculateEarliestViableLandTime();
                let reasonMsg = '';
                if (!readiness1.isFullyReadyNow && nobleLaunchMs1 < (readiness1.readyAtMs + MARGIN_MS)) {
                    const readyTimeStr = new Date(readiness1.readyAtMs).toLocaleTimeString('pt-PT');
                    reasonMsg = `Os nobres de "${cleanVillageDisplayName(nobleVillage1)}" só estarão disponíveis às ${readyTimeStr} (${readiness1.summary}).\nPara a chegada às ${new Date(baseLandTime).toLocaleTimeString('pt-PT')}, o envio teria de ser às ${new Date(nobleLaunchMs1).toLocaleTimeString('pt-PT')}.`;
                } else if (attackMode === 'snob_solo' && bvAnchor === 'final') {
                    reasonMsg = `Para a última viagem de bate-e-volta chegar à hora definida, o 1º envio teria de ter sido no passado (${new Date(nobleLaunchMs1).toLocaleTimeString('pt-PT')}).`;
                } else {
                    reasonMsg = `A aldeia "${cleanVillageDisplayName(nobleVillage1)}" fica a ${snobDist1.toFixed(1)}c (${formatDuration(snobSec1)}) do alvo e a hora de envio necessária já passou (${new Date(nobleLaunchMs1).toLocaleTimeString('pt-PT')}).`;
                }

                if (calc) {
                    const recLandDate = calc.earliestLandDate;
                    const recLandStr = `${recLandDate.toLocaleDateString('pt-PT')} às ${recLandDate.toLocaleTimeString('pt-PT')}`;
                    const promptMsg = `⚠️ HORÁRIO DE IMPACTO INVIÁVEL!\n\n${reasonMsg}\n\n⚡ Horário Mínimo de Chegada Recomendado (com 5m de margem): ${recLandStr}\n\nDesejas ajustar automaticamente a hora de chegada para ${recLandStr} e continuar a gerar o plano?`;
                    if (confirm(promptMsg)) {
                        applyMinimumViableLandTime();
                        baseLandTime = recLandDate.getTime();
                        trip1AnchorLandMs = baseLandTime;
                        if (attackMode === 'snob_solo' && bvAnchor === 'final') {
                            const totalCycleMs = (2 * travelMs1) + 2000;
                            trip1AnchorLandMs = baseLandTime - ((numTrips - 1) * totalCycleMs);
                        }
                        nobleLaunchMs1 = trip1AnchorLandMs - travelMs1;
                    } else {
                        return;
                    }
                } else {
                    alert(`❌ Horário inviável.\n${reasonMsg}`);
                    return;
                }
            } else if (!readiness1.isFullyReadyNow) {
                const readyTimeStr = new Date(readiness1.readyAtMs).toLocaleTimeString('pt-PT');
                const launchTimeStr = new Date(nobleLaunchMs1).toLocaleTimeString('pt-PT');
                showToast(`💡 Nobres de ${cleanVillageDisplayName(nobleVillage1)} estarão prontos às ${readyTimeStr}, a tempo do envio às ${launchTimeStr} ✅`);
            }
        }

        let snobDist2 = 0, snobSec2 = 0, nobleLaunchMs2 = 0, nobleLandMs2 = 0;
        if (nobleVillage2 && architecture === 'split_2x2') {
            snobDist2 = calcDistance(nobleVillage2.coords, target);
            snobSec2 = snobDist2 * unitSpeedMinutes.snob * 60;
            nobleLandMs2 = baseLandTime + (2 * msStep);
            nobleLaunchMs2 = nobleLandMs2 - (snobSec2 * 1000);

            const readiness2 = calculateEarliestViableNobleTime(nobleVillage2, 2);
            const minAllowedLaunchMs2 = Math.max(minLaunchMs, readiness2.isFullyReadyNow ? minLaunchMs : (readiness2.readyAtMs + MARGIN_MS));

            if (nobleLaunchMs2 < minAllowedLaunchMs2) {
                const calc = calculateEarliestViableLandTime();
                let reasonMsg = '';
                if (!readiness2.isFullyReadyNow && nobleLaunchMs2 < (readiness2.readyAtMs + MARGIN_MS)) {
                    const readyTimeStr = new Date(readiness2.readyAtMs).toLocaleTimeString('pt-PT');
                    reasonMsg = `Os nobres da 2ª aldeia "${cleanVillageDisplayName(nobleVillage2)}" só estarão disponíveis às ${readyTimeStr} (${readiness2.summary}).`;
                } else {
                    reasonMsg = `A 2ª aldeia "${cleanVillageDisplayName(nobleVillage2)}" fica a ${snobDist2.toFixed(1)}c (${formatDuration(snobSec2)}) do alvo e a hora de envio necessária já passou.`;
                }

                if (calc) {
                    const recLandDate = calc.earliestLandDate;
                    const recLandStr = `${recLandDate.toLocaleDateString('pt-PT')} às ${recLandDate.toLocaleTimeString('pt-PT')}`;
                    if (confirm(`⚠️ HORÁRIO DE IMPACTO INVIÁVEL (2ª Aldeia)!\n\n${reasonMsg}\n\n⚡ Horário Mínimo de Chegada Recomendado (com 5m de margem): ${recLandStr}\n\nDesejas ajustar automaticamente a hora de chegada para ${recLandStr} e continuar?`)) {
                        applyMinimumViableLandTime();
                        baseLandTime = recLandDate.getTime();
                        if (nobleVillage1) {
                            const travelMs1 = Math.round(snobSec1 * 1000);
                            trip1AnchorLandMs = baseLandTime;
                            nobleLaunchMs1 = trip1AnchorLandMs - travelMs1;
                        }
                        nobleLandMs2 = baseLandTime + (2 * msStep);
                        nobleLaunchMs2 = nobleLandMs2 - (snobSec2 * 1000);
                    } else {
                        return;
                    }
                } else {
                    alert(`❌ Horário inviável para a 2ª aldeia.\n${reasonMsg}`);
                    return;
                }
            } else if (!readiness2.isFullyReadyNow) {
                const readyTimeStr = new Date(readiness2.readyAtMs).toLocaleTimeString('pt-PT');
                const launchTimeStr = new Date(nobleLaunchMs2).toLocaleTimeString('pt-PT');
                showToast(`💡 Nobres de ${cleanVillageDisplayName(nobleVillage2)} estarão prontos às ${readyTimeStr}, a tempo do envio às ${launchTimeStr} ✅`);
            }
        }

        const excludedIds = [];
        if (nobleVillage1) excludedIds.push(nobleVillage1.id);
        if (nobleVillage2) excludedIds.push(nobleVillage2.id);

        let defPool = allVillages.filter(v => v.rowClass === 'tw-row-def' && !excludedIds.includes(v.id));
        if (excludeCommitted) {
            defPool = defPool.filter(v => !committedMap[v.id]);
        }

        const preferFullNukes = document.getElementById('tw-nt-prefer-full-nukes') ? document.getElementById('tw-nt-prefer-full-nukes').checked : true;
        const preferredLeadNukeId = document.getElementById('tw-nt-lead-nuke-village') ? document.getElementById('tw-nt-lead-nuke-village').value : 'auto';

        const sortedOff = getSortedOffVillages(target, excludedIds);

        const sortedDef = defPool.map(v => {
            const dist = calcDistance(v.coords, target);
            return { village: v, dist };
        }).sort((a,b) => a.dist - b.dist);

        if (leadNukesCount > 0) {
            let leadNukeCand = null;
            if (preferredLeadNukeId && preferredLeadNukeId !== 'auto') {
                leadNukeCand = sortedOff.find(c => c.village.id === preferredLeadNukeId);
            } else if (sortedOff.length > 0) {
                leadNukeCand = sortedOff[0];
            }

            if (leadNukeCand) {
                const nukeLaunchMs = baseLandTime - (leadNukeCand.sec * 1000);
                if (nukeLaunchMs < minLaunchMs) {
                    const calc = calculateEarliestViableLandTime();
                    if (calc) {
                        const recLandDate = calc.earliestLandDate;
                        const recLandStr = `${recLandDate.toLocaleDateString('pt-PT')} às ${recLandDate.toLocaleTimeString('pt-PT')}`;
                        const promptMsg = `⚠️ HORÁRIO DE IMPACTO INVIÁVEL (Limpeza)!\n\nA aldeia de limpeza "${cleanVillageDisplayName(leadNukeCand.village)}" fica a ${leadNukeCand.dist.toFixed(1)}c (${formatDuration(leadNukeCand.sec)}) do alvo e a hora de envio necessária já passou (${new Date(nukeLaunchMs).toLocaleTimeString('pt-PT')}).\n\n⚡ Horário Mínimo de Chegada Recomendado (com 5m de margem): ${recLandStr}\n\nDesejas ajustar automaticamente a hora de chegada para ${recLandStr} e continuar a gerar o plano?`;
                        if (confirm(promptMsg)) {
                            applyMinimumViableLandTime();
                            baseLandTime = recLandDate.getTime();
                            trip1AnchorLandMs = baseLandTime;
                            if (nobleVillage1) {
                                const travelMs1 = Math.round(snobSec1 * 1000);
                                if (attackMode === 'snob_solo' && bvAnchor === 'final') {
                                    const totalCycleMs = (2 * travelMs1) + 2000;
                                    trip1AnchorLandMs = baseLandTime - ((numTrips - 1) * totalCycleMs);
                                }
                                nobleLaunchMs1 = trip1AnchorLandMs - travelMs1;
                            }
                            if (nobleVillage2 && architecture === 'split_2x2') {
                                nobleLandMs2 = baseLandTime + (2 * msStep);
                                nobleLaunchMs2 = nobleLandMs2 - (snobSec2 * 1000);
                            }
                        } else {
                            return;
                        }
                    }
                }
            }
        }

        const sequence = [];
        const usedOffVillages = new Set();
        const usedDefVillages = new Set();

        const STANDARD_RELOCATE_MS = (3 * 3600 + 31 * 60 + 45) * 1000;

        function assignOffNuke(targetLandMs, typeLabel, badgeClass, modelStr, isLeadNuke = false, buildingTarget = '', allowPaladin = true, forceVillageId = null) {
            let candIndex = -1;
            if (forceVillageId && forceVillageId !== 'auto') {
                const idx = sortedOff.findIndex(c => c.village.id === forceVillageId && !usedOffVillages.has(c.village.id));
                if (idx !== -1) {
                    const cand = sortedOff[idx];
                    const travelSec = cand.sec;
                    const launchMs = targetLandMs - (travelSec * 1000);
                    if (launchMs >= minLaunchMs) {
                        candIndex = idx;
                    } else {
                        const calc = calculateEarliestViableLandTime();
                        if (calc) {
                            const recLandDate = calc.earliestLandDate;
                            const recLandStr = `${recLandDate.toLocaleDateString('pt-PT')} às ${recLandDate.toLocaleTimeString('pt-PT')}`;
                            if (confirm(`⚠️ HORÁRIO DE IMPACTO INVIÁVEL (Limpeza)!\n\nA aldeia "${cleanVillageDisplayName(cand.village)}" demora ${formatDuration(travelSec)} e o envio já passou (${new Date(launchMs).toLocaleTimeString('pt-PT')}).\n\n⚡ Horário Mínimo Recomendado (com 5m de margem): ${recLandStr}\n\nDesejas ajustar para ${recLandStr} e continuar?`)) {
                                applyMinimumViableLandTime();
                                return setTimeout(() => buildMasterOPPlan(), 50);
                            } else {
                                return;
                            }
                        } else {
                            const earliestLand = new Date(now + (travelSec + 300) * 1000);
                            alert(`❌ A aldeia de limpeza selecionada (${cleanVillageDisplayName(cand.village)}) fica a ${cand.dist.toFixed(1)}c (${formatDuration(travelSec)}) do alvo.\nA hora de envio já passou.\nHora mínima de impacto para esta aldeia: ${earliestLand.toLocaleDateString('pt-PT')} ${earliestLand.toLocaleTimeString('pt-PT')}`);
                            return;
                        }
                    }
                }
            }

            if (candIndex === -1) {
                for (let i = 0; i < sortedOff.length; i++) {
                    const cand = sortedOff[i];
                    if (usedOffVillages.has(cand.village.id)) continue;
                    if (!allowPaladin && cand.hasKnight) continue;
                    
                    const travelSec = cand.sec;
                    const launchMs = targetLandMs - (travelSec * 1000);
                    
                    if (launchMs >= minLaunchMs) {
                        candIndex = i;
                        break;
                    }
                }
            }

            // Fallback se allowPaladin for falso mas nenhuma aldeia sem paladino estava no alcance
            if (candIndex === -1 && !allowPaladin) {
                for (let i = 0; i < sortedOff.length; i++) {
                    const cand = sortedOff[i];
                    if (usedOffVillages.has(cand.village.id)) continue;
                    const travelSec = cand.sec;
                    const launchMs = targetLandMs - (travelSec * 1000);
                    if (launchMs >= minLaunchMs) {
                        candIndex = i;
                        break;
                    }
                }
            }

            if (candIndex !== -1) {
                const cand = sortedOff[candIndex];
                usedOffVillages.add(cand.village.id);
                const travelSec = cand.sec;
                const launchMs = targetLandMs - (travelSec * 1000);
                const isPaladinOff = cand.hasOffPaladin || cand.hasKnight;
                let finalType = typeLabel;
                let finalBadge = badgeClass;

                const d = cand.village.homeTroopsDict || cand.village.troopsDict || {};
                const axe = d.axe ? `${(d.axe/1000).toFixed(1)}k🪓 ` : '';
                const lc = d.light ? `${(d.light/1000).toFixed(1)}k🐎 ` : '';
                const ram = d.ram ? `${d.ram}🪵 ` : '';
                const cat = d.catapult ? `${d.catapult}☄️ ` : '';
                const farmK = (cand.village.farm && cand.village.farm.used) ? `Faz. ${(cand.village.farm.used/1000).toFixed(1)}k` : '';
                const troopsInline = (axe || lc || ram || cat) ? `• ${axe}${lc}${ram}${cat}`.trim() : '';
                let extraInfo = isLeadNuke ? `${farmK} ${troopsInline}`.trim() : 'Full Off';
                if (cand.village.hasTroopsAway) {
                    extraInfo += ` • ⚠️ ${cand.village.troopsAwayPerc}% fora`;
                }

                if (cand.paladin && cand.paladin.isHome) {
                    const pal = cand.paladin;
                    finalType = `${typeLabel} (${pal.name} ⚔️)`;
                    finalBadge = 'tw-badge-paladino';
                    extraInfo = `Buff ${pal.name} ⚔️ Lvl ${pal.level} ${troopsInline}`.trim();
                    if (cand.village.hasTroopsAway) {
                        extraInfo += ` • ⚠️ ${cand.village.troopsAwayPerc}% fora`;
                    }
                } else if (isPaladinOff) {
                    finalType = `${typeLabel} (Paladino)`;
                    finalBadge = 'tw-badge-paladino';
                    extraInfo = `Buff Paladino ⚔️ ${troopsInline}`.trim();
                    if (cand.village.hasTroopsAway) {
                        extraInfo += ` • ⚠️ ${cand.village.troopsAwayPerc}% fora`;
                    }
                }

                const cmdObj = {
                    type: finalType,
                    badge: finalBadge,
                    actionType: 'Attack',
                    originId: cand.village.id,
                    originName: cand.village.name,
                    originCoords: cand.village.coords,
                    targetCoords: target,
                    dist: cand.dist.toFixed(2),
                    sec: travelSec,
                    launchTime: new Date(launchMs),
                    landTime: new Date(targetLandMs),
                    model: modelStr,
                    building: buildingTarget !== 'none' ? buildingTarget : '',
                    info: extraInfo,
                    hasPaladin: isPaladinOff,
                    needsPaladinRelocate: false,
                    relocatePaladinId: null,
                    relocatePaladinName: null
                };

                sequence.push(cmdObj);
                return cmdObj;
            }
            return null;
        }

        function assignDefBunker(targetLandMs, typeLabel, badgeClass, requirePaladin = false) {
            for (let i = 0; i < sortedDef.length; i++) {
                const cand = sortedDef[i];
                if (usedDefVillages.has(cand.village.id)) continue;
                
                const v = cand.village;
                const d = v.homeTroopsDict || v.troopsDict;
                const defPop = (d.spear||0)*1 + (d.sword||0)*1 + (d.archer||0)*1 + (d.heavy||0)*6;
                const pal = v.paladin;
                const hasKnightInVillage = pal ? pal.isHome : ((v.knightAvailable || d.knight || 0) >= 1);

                if (requirePaladin && !hasKnightInVillage) continue;
                
                let chosenModel = null, presetLabel = '';
                if (defPop >= popBunker1) {
                    chosenModel = modelBunker1;
                    presetLabel = `Preset 1 (${(defPop/1000).toFixed(1)}k)`;
                } else if (defPop >= popBunker2) {
                    chosenModel = modelBunker2;
                    presetLabel = `Preset 2 (${(defPop/1000).toFixed(1)}k)`;
                } else {
                    continue;
                }

                const speedMin = hasKnightInVillage ? unitSpeedMinutes.knight : unitSpeedMinutes.sword;
                const travelSec = cand.dist * speedMin * 60;
                const launchMs = targetLandMs - (travelSec * 1000);
                
                if (launchMs >= minLaunchMs) {
                    usedDefVillages.add(v.id);
                    const palTag = pal ? `${pal.name} 🛡️ (Lvl ${pal.level})` : 'Paladino';
                    const finalBadge = hasKnightInVillage ? 'tw-badge-paladino' : badgeClass;
                    const finalType = hasKnightInVillage ? `${typeLabel} (${pal ? pal.name : 'Paladino'})` : typeLabel;
                    const extraInfo = hasKnightInVillage ? `${palTag} (${formatDuration(travelSec)}) • ${presetLabel}` : `Espada (${formatDuration(travelSec)}) • ${presetLabel}`;

                    sequence.push({
                        type: finalType,
                        badge: finalBadge,
                        actionType: 'Support',
                        originId: v.id,
                        originName: v.name,
                        originCoords: v.coords,
                        targetCoords: target,
                        dist: cand.dist.toFixed(2),
                        sec: travelSec,
                        launchTime: new Date(launchMs),
                        landTime: new Date(targetLandMs),
                        model: chosenModel,
                        building: '',
                        info: extraInfo
                    });
                    return true;
                }
            }
            return false;
        }

        // 1. Nukes de Limpeza (Prioridade Máxima para Paladino)
        let paladinInNukes = false;
        const nukeCommands = [];
        for (let i = 0; i < leadNukesCount; i++) {
            const landOffset = hasNobles ? ((leadNukesCount - i) * 100) : ((leadNukesCount - 1 - i) * 100);
            const forceId = (i === 0 && preferredLeadNukeId !== 'auto') ? preferredLeadNukeId : null;
            const cmd = assignOffNuke(trip1AnchorLandMs - landOffset, `Limpeza Principal #${i+1}`, 'tw-badge-nuke', modelNuke, true, nukeCatTarget !== 'none' ? nukeCatTarget : '', true, forceId);
            if (cmd) {
                if (cmd.hasPaladin) paladinInNukes = true;
                nukeCommands.push(cmd);
            }
        }

        // Se o utilizador pediu Paladino no Nuke, mas NENHUM dos nukes tem Paladino:
        // Avisar para realocar no Nuke Principal #1
        if (reqPaladinNuke && !paladinInNukes && nukeCommands.length > 0) {
            const primaryNuke = nukeCommands[0]; // Limpeza Principal #1
            const timeUntilLaunch = primaryNuke.launchTime.getTime() - now;

            // Procurar o paladino a realocar baseado na escolha do utilizador
            let bestPal = null;
            if (paladinChoice !== 'auto') {
                bestPal = allAccountPaladins.find(p => String(p.id) === String(paladinChoice)) || null;
            }
            if (!bestPal) {
                const idleOffPaladins = allAccountPaladins
                    .filter(p => p.isOffense && p.isHome)
                    .sort((a, b) => (b.offPoints || b.level) - (a.offPoints || a.level));
                bestPal = idleOffPaladins[0] || allAccountPaladins.find(p => p.isHome) || null;
            }

            if (timeUntilLaunch >= STANDARD_RELOCATE_MS) {
                const marginMin = Math.floor((timeUntilLaunch - STANDARD_RELOCATE_MS) / 60000);
                const palName = bestPal ? bestPal.name : 'Paladino';
                primaryNuke.info = `⚠️ Realocar ${palName}! (+${marginMin}m folga)`;
                primaryNuke.badge = 'tw-badge-warn';
                primaryNuke.needsPaladinRelocate = true;
                if (bestPal) {
                    primaryNuke.relocatePaladinId = bestPal.id;
                    primaryNuke.relocatePaladinName = bestPal.name;
                }
            } else {
                primaryNuke.info = `Sem Paladino (Tempo insuficiente)`;
            }
        }

        // 2. Catapultas preliminares (Anti-Desvio na Praça de Reunião / Demolição)
        // NUNCA gastam aldeias com Paladino (allowPaladin = false)
        const modelCats = document.getElementById('tw-nt-model-cats') ? document.getElementById('tw-nt-model-cats').value.trim() || 'Cats' : 'Cats';
        if (attackMode === 'full_storm') {
            const pracaOffsetsMin = [14, 10, 6, 2];
            pracaOffsetsMin.forEach(minBefore => {
                assignOffNuke(trip1AnchorLandMs - (minBefore * 60 * 1000), `Praça (-${minBefore}m)`, 'tw-badge-praca', modelCats, false, 'place', false);
            });
        } else if (attackMode === 'cat_demolish') {
            const building = catTargetBuilding !== 'none' ? catTargetBuilding : 'place';
            assignOffNuke(trip1AnchorLandMs - (15 * 60 * 1000), `Demolição (-15m)`, 'tw-badge-muralha', modelCats, false, building, false);
            assignOffNuke(trip1AnchorLandMs - (5 * 60 * 1000), `Demolição (-5m)`, 'tw-badge-praca', modelCats, false, building, false);
        }

        // 3. Escoltas Anti-Snipe (NUNCA gastam aldeia com Paladino)
        if (hasNobles && antiWavesCount > 0) {
            const antiAnchorLandMs = (attackMode === 'snob_solo' && bvAnchor === 'final') ? baseLandTime : trip1AnchorLandMs;
            const antiSnipeOffsets = [halfStep, msStep + halfStep, (2 * msStep) + halfStep].slice(0, antiWavesCount);
            if (antiOrigins === 'max2') {
                let antiCand1 = null;
                let antiCand2 = null;

                for (let i = 0; i < sortedOff.length; i++) {
                    const c = sortedOff[i];
                    if (usedOffVillages.has(c.village.id)) continue;
                    if (c.hasKnight) continue;
                    const travelSec = c.sec;
                    if ((antiAnchorLandMs + antiSnipeOffsets[0]) - (travelSec * 1000) >= minLaunchMs) {
                        antiCand1 = c;
                        usedOffVillages.add(c.village.id);
                        break;
                    }
                }
                if (!antiCand1) {
                    for (let i = 0; i < sortedOff.length; i++) {
                        const c = sortedOff[i];
                        if (usedOffVillages.has(c.village.id)) continue;
                        const travelSec = c.sec;
                        if ((antiAnchorLandMs + antiSnipeOffsets[0]) - (travelSec * 1000) >= minLaunchMs) {
                            antiCand1 = c;
                            usedOffVillages.add(c.village.id);
                            break;
                        }
                    }
                }

                if (antiWavesCount > 1) {
                    for (let i = 0; i < sortedOff.length; i++) {
                        const c = sortedOff[i];
                        if (usedOffVillages.has(c.village.id)) continue;
                        if (c.hasKnight) continue;
                        const travelSec = c.sec;
                        if ((antiAnchorLandMs + antiSnipeOffsets[antiSnipeOffsets.length - 1]) - (travelSec * 1000) >= minLaunchMs) {
                            antiCand2 = c;
                            usedOffVillages.add(c.village.id);
                            break;
                        }
                    }
                    if (!antiCand2) {
                        for (let i = 0; i < sortedOff.length; i++) {
                            const c = sortedOff[i];
                            if (usedOffVillages.has(c.village.id)) continue;
                            const travelSec = c.sec;
                            if ((antiAnchorLandMs + antiSnipeOffsets[antiSnipeOffsets.length - 1]) - (travelSec * 1000) >= minLaunchMs) {
                                antiCand2 = c;
                                usedOffVillages.add(c.village.id);
                                break;
                            }
                        }
                    }
                }

                antiSnipeOffsets.forEach((offset, idx) => {
                    const targetLandMs = antiAnchorLandMs + offset;
                    let cand = null;
                    if (antiWavesCount === 3) {
                        cand = (idx === 0 || idx === 1) ? antiCand1 : (antiCand2 || antiCand1);
                    } else if (antiWavesCount === 2) {
                        cand = (idx === 0) ? antiCand1 : (antiCand2 || antiCand1);
                    } else {
                        cand = antiCand1;
                    }

                    if (cand) {
                        const travelSec = cand.sec;
                        const launchMs = targetLandMs - (travelSec * 1000);
                        const finalBadge = 'tw-badge-anti';
                        const finalType = `Anti-Snipe #${idx + 1}`;
                        const extraInfo = `Escolta Anti-Snipe (${modelAnti})`;

                        sequence.push({
                            type: finalType,
                            badge: finalBadge,
                            actionType: 'Attack',
                            originId: cand.village.id,
                            originName: cand.village.name,
                            originCoords: cand.village.coords,
                            targetCoords: target,
                            dist: cand.dist.toFixed(2),
                            sec: travelSec,
                            launchTime: new Date(launchMs),
                            landTime: new Date(targetLandMs),
                            model: modelAnti,
                            building: (antiCatTarget !== 'none' ? antiCatTarget : ''),
                            info: extraInfo
                        });
                    }
                });
            } else {
                antiSnipeOffsets.forEach((offset, idx) => {
                    assignOffNuke(antiAnchorLandMs + offset, `Anti-Snipe #${idx+1}`, 'tw-badge-anti', modelAnti, false, (antiCatTarget !== 'none' ? antiCatTarget : ''), false);
                });
            }
        }

        let lastNobleImpactMs = baseLandTime + (Math.max(1, nobleCount - 1) * msStep);

        // 4. Inserção do Trem de Nobres / Bate e Volta
        if (hasNobles && nobleVillage1) {
            if (attackMode === 'snob_solo') {
                const numTrips = Math.max(1, nobleCount || 4);
                const travelSec = snobSec1;
                const travelMs = Math.round(travelSec * 1000);
                const bufferMs = 2000; // 2s folga de retorno das tropas ao ponto de reunião

                let currentLaunchMs = trip1AnchorLandMs - travelMs;
                let currentLandMs = trip1AnchorLandMs;

                for (let trip = 1; trip <= numTrips; trip++) {
                    const isConquest = (trip === numTrips);
                    const typeLabel = isConquest ? `Bate e Volta #${trip} (Conquista)` : `Bate e Volta #${trip}`;
                    const returnMs = currentLandMs + travelMs;
                    const retD = new Date(returnMs);
                    const returnTimeStr = `${retD.toLocaleTimeString('pt-PT')}:${String(retD.getMilliseconds()).padStart(3,'0')}`;
                    const returnDateStr = `${String(retD.getDate()).padStart(2,'0')}/${String(retD.getMonth()+1).padStart(2,'0')}`;
                    const infoLabel = isConquest 
                        ? `Viagem ${trip}/${numTrips} • Conquista Final` 
                        : `Viagem ${trip}/${numTrips} • Retorno: ${returnTimeStr} (${returnDateStr})`;

                    sequence.push({
                        type: typeLabel,
                        badge: isConquest ? 'tw-badge-snob' : 'tw-badge-anti',
                        actionType: 'Attack',
                        originId: nobleVillage1.id,
                        originName: nobleVillage1.name,
                        originCoords: nobleVillage1.coords,
                        targetCoords: target,
                        dist: snobDist1.toFixed(2),
                        sec: travelSec,
                        launchTime: new Date(currentLaunchMs),
                        landTime: new Date(currentLandMs),
                        model: modelSnob,
                        building: '',
                        info: infoLabel
                    });

                    lastNobleImpactMs = currentLandMs;

                    currentLaunchMs = returnMs + bufferMs;
                    currentLandMs = currentLaunchMs + travelMs;
                }
            } else if (architecture === 'single_4' || attackMode === 'nt_simple' || attackMode === 'snob_single' || attackMode === 'nt_clean' || attackMode === 'standard_anti' || attackMode === 'standard_anti_50' || attackMode === 'full_storm') {
                const labelStr = nobleCount === 1 ? '1 Nobre' : `${nobleCount} Nobres`;
                sequence.push({
                    type: `Combo NT (${labelStr})`,
                    badge: 'tw-badge-snob',
                    actionType: 'Attack',
                    originId: nobleVillage1.id,
                    originName: nobleVillage1.name,
                    originCoords: nobleVillage1.coords,
                    targetCoords: target,
                    dist: snobDist1.toFixed(2),
                    sec: snobSec1,
                    launchTime: new Date(nobleLaunchMs1),
                    landTime: new Date(baseLandTime),
                    model: modelSnob,
                    building: '',
                    info: labelStr
                });
                lastNobleImpactMs = baseLandTime + (Math.max(1, nobleCount - 1) * msStep);
            } else if (architecture === 'split_2x2' && nobleVillage2) {
                sequence.push({
                    type: 'Combo NT 1/2 (2 Nobres)',
                    badge: 'tw-badge-snob',
                    actionType: 'Attack',
                    originId: nobleVillage1.id,
                    originName: nobleVillage1.name,
                    originCoords: nobleVillage1.coords,
                    targetCoords: target,
                    dist: snobDist1.toFixed(2),
                    sec: snobSec1,
                    launchTime: new Date(nobleLaunchMs1),
                    landTime: new Date(baseLandTime),
                    model: modelSnob,
                    building: '',
                    info: '2 Nobres'
                });

                sequence.push({
                    type: 'Combo NT 2/2 (2 Nobres)',
                    badge: 'tw-badge-snob',
                    actionType: 'Attack',
                    originId: nobleVillage2.id,
                    originName: nobleVillage2.name,
                    originCoords: nobleVillage2.coords,
                    targetCoords: target,
                    dist: snobDist2.toFixed(2),
                    sec: snobSec2,
                    launchTime: new Date(nobleLaunchMs2),
                    landTime: new Date(nobleLandMs2),
                    model: modelSnob,
                    building: '',
                    info: '2 Nobres'
                });
                lastNobleImpactMs = nobleLandMs2 + msStep;
            }
        }

        // 5. Bunkers de Conquista Milimétricos
        if (hasNobles && bunkerCount > 0) {
            const finalNobleImpactMs = lastNobleImpactMs;
            for (let b = 1; b <= bunkerCount; b++) {
                const bunkerLandMs = finalNobleImpactMs + bunkerGapMs + ((b - 1) * bunkerStepMs);
                if (b === 1) {
                    const paladinFound = assignDefBunker(bunkerLandMs, `🛡️ Bunker Apoio 1`, 'tw-badge-bunker', true);
                    if (!paladinFound) {
                        assignDefBunker(bunkerLandMs, `🛡️ Bunker Apoio 1`, 'tw-badge-bunker', false);
                    }
                } else {
                    assignDefBunker(bunkerLandMs, `🛡️ Bunker Apoio ${b}`, 'tw-badge-bunker', false);
                }
            }
        }

        // 6. Cortina de Fakes & Saturação Avançada
        const isRadiusFakeEnabled = document.getElementById('tw-nt-fake-enable') && document.getElementById('tw-nt-fake-enable').checked;
        if (isRadiusFakeEnabled) {
            const fakeRadius = parseFloat(document.getElementById('tw-nt-fake-radius') ? document.getElementById('tw-nt-fake-radius').value : '8') || 8;
            const fakesPerNeighbor = parseInt(document.getElementById('tw-nt-fake-count') ? document.getElementById('tw-nt-fake-count').value : '3', 10) || 3;
            const fakeStyle = document.getElementById('tw-nt-fake-style') ? document.getElementById('tw-nt-fake-style').value : 'single';
            const fakeMaxPerOrigin = parseInt(document.getElementById('tw-nt-fake-max-origin') ? document.getElementById('tw-nt-fake-max-origin').value : '2', 10) || 2;
            const fakeIncludeTarget = document.getElementById('tw-nt-fake-include-target') ? document.getElementById('tw-nt-fake-include-target').checked : true;
            const fakeModelName = document.getElementById('tw-nt-fake-model') ? document.getElementById('tw-nt-fake-model').value.trim() || 'Fake' : 'Fake';
            const fakeSmartLimit = document.getElementById('tw-nt-fake-smart-limit') ? document.getElementById('tw-nt-fake-smart-limit').checked : false;

            let fakeSpeedMin = unitSpeedMinutes.ram; // 30 min/campo padrão
            if (fakeStyle === 'snob') fakeSpeedMin = unitSpeedMinutes.snob; // 35 min/campo
            else if (fakeStyle === 'spy') fakeSpeedMin = unitSpeedMinutes.spy; // 9 min/campo

            const [tx, ty] = target.split('|').map(Number);
            const myCoords = new Set(allVillages.map(v => v.coords));
            const neighborTargets = [];

            // Se solicitado, incluir o próprio alvo real na saturação de fakes
            if (fakeIncludeTarget) {
                neighborTargets.push({ coord: target, dist: 0, isRealTarget: true });
            }

            if (!worldVillagesLoaded) {
                await fetchWorldVillages();
            }

            if (worldVillages.length > 0) {
                const targetObj = worldVillages.find(v => v.coord === target);
                const targetPlayerId = targetObj ? targetObj.playerId : null;

                worldVillages.forEach(v => {
                    if (v.coord === target || myCoords.has(v.coord)) return;
                    if (targetPlayerId && targetPlayerId !== '0' && v.playerId !== targetPlayerId) return;

                    const dist = Math.hypot(v.x - tx, v.y - ty);
                    if (dist <= fakeRadius) neighborTargets.push({ coord: v.coord, dist, isRealTarget: false });
                });
            } else if (typeof TWMap !== 'undefined' && TWMap.villages) {
                for (let key in TWMap.villages) {
                    const v = TWMap.villages[key];
                    if (v && v.xy) {
                        const vx = Math.floor(v.xy / 1000), vy = v.xy % 1000;
                        const coord = `${vx}|${vy}`;
                        if (coord === target || myCoords.has(coord)) continue;
                        const dist = Math.hypot(vx - tx, vy - ty);
                        if (dist <= fakeRadius) neighborTargets.push({ coord, dist, isRealTarget: false });
                    }
                }
            }

            neighborTargets.sort((a, b) => a.dist - b.dist);

            const fakePool = allVillages.filter(v => !excludedIds.includes(v.id) && (!excludeCommitted || !committedMap[v.id]));
            const originUsageCount = {};

            neighborTargets.forEach(nTarget => {
                let fakesAssigned = 0;

                const validOrigins = fakePool.map(v => {
                    const dist = calcDistance(v.coords, nTarget.coord);
                    const travelSec = dist * fakeSpeedMin * 60;
                    return { village: v, dist, travelSec };
                }).filter(item => {
                    const launchMs = baseLandTime - (item.travelSec * 1000);
                    return launchMs >= minLaunchMs;
                }).sort((a, b) => a.dist - b.dist);

                for (let i = 0; i < validOrigins.length && fakesAssigned < fakesPerNeighbor; i++) {
                    const cand = validOrigins[i];
                    const usedCount = originUsageCount[cand.village.id] || 0;
                    if (usedCount >= fakeMaxPerOrigin) continue;

                    const fakeModelRes = resolveFakeModel(cand.village, fakeModelName, fakeSmartLimit);
                    const chosenFakeModel = fakeModelRes.model;
                    const ptsInfo = fakeSmartLimit ? ` • ${fakeModelRes.pts.toLocaleString('pt-PT')} pts` : '';

                    if (fakeStyle === 'fake_nt') {
                        // Combo Fake NT (4 ataques da mesma aldeia espaçados por 100ms)
                        for (let wave = 0; wave < 4; wave++) {
                            const waveOffset = wave * 100;
                            const landMs = baseLandTime + waveOffset;
                            const launchMs = landMs - (cand.travelSec * 1000);
                            sequence.push({
                                type: `🎭 Fake NT #${fakesAssigned + 1} (${wave + 1}/4)`,
                                badge: 'tw-badge-praca',
                                actionType: 'Attack',
                                originId: cand.village.id,
                                originName: cand.village.name,
                                originCoords: cand.village.coords,
                                targetCoords: nTarget.coord,
                                dist: cand.dist.toFixed(2),
                                sec: cand.travelSec,
                                launchTime: new Date(launchMs),
                                landTime: new Date(landMs),
                                model: chosenFakeModel,
                                building: '',
                                info: nTarget.isRealTarget ? `Fake NT Alvo Real (${fakeSpeedMin}m/c${ptsInfo})` : `Fake NT (${fakeSpeedMin}m/c${ptsInfo})`,
                                isFake: true
                            });
                        }
                        originUsageCount[cand.village.id] = usedCount + 1;
                        fakesAssigned++;
                    } else {
                        // Ataques Simples individuais
                        const launchMs = baseLandTime - (cand.travelSec * 1000);
                        const typeLabel = nTarget.isRealTarget ? '🎭 Fake Saturação' : '🎭 Fake Cortina';
                        const infoLabel = nTarget.isRealTarget ? `Saturação Alvo (${fakeSpeedMin}m/c${ptsInfo})` : `Cortina (${fakeSpeedMin}m/c${ptsInfo})`;

                        sequence.push({
                            type: typeLabel,
                            badge: 'tw-badge-praca',
                            actionType: 'Attack',
                            originId: cand.village.id,
                            originName: cand.village.name,
                            originCoords: cand.village.coords,
                            targetCoords: nTarget.coord,
                            dist: cand.dist.toFixed(2),
                            sec: cand.travelSec,
                            launchTime: new Date(launchMs),
                            landTime: new Date(baseLandTime),
                            model: chosenFakeModel,
                            building: '',
                            info: infoLabel,
                            isFake: true
                        });

                        originUsageCount[cand.village.id] = usedCount + 1;
                        fakesAssigned++;
                    }
                }
            });
        }

        sequence.sort((a, b) => {
            const aIsFake = a.isFake ? 1 : 0;
            const bIsFake = b.isFake ? 1 : 0;
            if (aIsFake !== bIsFake) return aIsFake - bIsFake;
            return a.launchTime - b.launchTime;
        });

        lastGeneratedCommands = sequence;
        lastGeneratedTarget = target;

        let rows = '', output = '';
        sequence.forEach((cmd, i) => {
            let actionShortcut = '';
            if (cmd.needsPaladinRelocate || (cmd.info && cmd.info.includes('Realocar Paladino')) || (cmd.info && cmd.info.includes('Realocar '))) {
                const knightParam = cmd.relocatePaladinId ? `&mode=knight&knight=${cmd.relocatePaladinId}` : '';
                const btnText = cmd.relocatePaladinName ? `🏰 Puxar ${cmd.relocatePaladinName}` : '🏰 Puxar Paladino';
                const titleText = cmd.relocatePaladinName 
                    ? `Abre a Estátua da aldeia ${cmd.originName} (${cmd.originCoords}) focada no ${cmd.relocatePaladinName} para o puxares imediatamente` 
                    : `Abre a Estátua da aldeia ${cmd.originName} (${cmd.originCoords}) noutro separador para puxares o Paladino`;

                let palSelectOptions = '';
                if (allAccountPaladins && allAccountPaladins.length > 0) {
                    palSelectOptions = `
                    <select class="tw-select tw-quick-reloc-select" data-cmd-idx="${i}" data-vid="${cmd.originId}" style="font-size:9.5px; padding:1px 4px; background:#0f172a; border:1px solid #c084fc; color:#e9d5ff; border-radius:4px; margin-left:4px; cursor:pointer;" title="Mudar qual Paladino queres puxar para esta aldeia">
                        ${allAccountPaladins.map(p => `<option value="${p.id}" ${String(p.id) === String(cmd.relocatePaladinId) ? 'selected' : ''}>${p.isOffense ? '⚔️' : '🛡️'} ${p.name} (Lvl ${p.level}${p.name === 'QuimConquista' ? ' • Persuasão' : ''})</option>`).join('')}
                    </select>`;
                }

                actionShortcut = `
                <span style="display:inline-flex; align-items:center; vertical-align:middle; margin-left:6px;">
                    <a href="game.php?village=${cmd.originId}&screen=statue${knightParam}" target="_blank" id="tw-btn-reloc-${i}" class="tw-btn" style="padding:2px 7px; font-size:9.5px; font-weight:bold; background:#7c3aed; border:1px solid #c084fc; color:#fff; border-radius:4px; text-decoration:none; display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="${titleText}">${btnText}</a>
                    ${palSelectOptions}
                </span>`;
            }

            const bldBadge = cmd.building ? `<span style="display:inline-block; margin-left:4px; padding:1px 5px; font-size:9px; font-weight:bold; background:rgba(244,63,94,0.15); border:1px solid rgba(244,63,94,0.4); color:#fda4af; border-radius:3px;">🎯 ${formatBuildingName(cmd.building)}</span>` : '';

            rows += `<tr data-vid="${cmd.originId}">
                <td style="color:#94a3b8; padding:3px 6px;">${i+1}</td>
                <td style="padding:3px 6px;"><span class="${cmd.badge}">${cmd.type}</span></td>
                <td style="text-align:left; padding:3px 6px 3px 10px; font-weight:bold; color:#38bdf8;">${cmd.originName}</td>
                <td style="font-weight:bold; color:#fbbf24; padding:3px 6px;">${cmd.targetCoords}</td>
                <td style="padding:3px 6px;">${cmd.dist}c</td>
                <td style="padding:3px 6px;"><b style="color:#f8fafc;">${cmd.launchTime.toLocaleTimeString('pt-PT')}:${String(cmd.launchTime.getMilliseconds()).padStart(3,'0')}</b> <span style="font-size:9.5px; color:#64748b; font-weight:normal;">(${String(cmd.launchTime.getDate()).padStart(2,'0')}/${String(cmd.launchTime.getMonth()+1).padStart(2,'0')})</span></td>
                <td style="padding:3px 6px;"><b style="color:#38bdf8;">${cmd.landTime.toLocaleTimeString('pt-PT')}:${String(cmd.landTime.getMilliseconds()).padStart(3,'0')}</b> <span style="font-size:9.5px; color:#64748b; font-weight:normal;">(${String(cmd.landTime.getDate()).padStart(2,'0')}/${String(cmd.landTime.getMonth()+1).padStart(2,'0')})</span></td>
                <td style="padding:3px 6px;"><b style="color:${cmd.actionType==='Support'?'#34d399':'#3fb950'};">${cmd.model}</b>${bldBadge} <span style="font-size:10px; color:#94a3b8;">(${cmd.info})</span>${actionShortcut}</td>
            </tr>`;

            let u = `https://${location.host}/game.php?village=${cmd.originId}&screen=place&target_coord=${cmd.targetCoords}${cmd.building ? `&target_building=${cmd.building}` : ''}`;
            let bldStr = cmd.building ? `${cmd.building}[|]` : '';
            output += `[*]${i+1}. ${formatRussianDateTime(cmd.launchTime)} --- ${cmd.model}[|]${formatRussianDateTime(cmd.landTime)}[|] ${cmd.originCoords} --> ${cmd.targetCoords} [|]${bldStr}[url=${u}]Link[/url]\n`;
        });

        document.getElementById('tw-nt-tbody').innerHTML = rows;
        bindQuickRelocEvents();
        const previewEl = document.getElementById('tw-nt-preview');
        if (previewEl) {
            previewEl.value = output.trim();
        }
        let copied = false;
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(output.trim());
                copied = true;
            }
        } catch (clipErr) {
            console.warn('[TW Suite] Falha ao copiar para clipboard automaticamente:', clipErr);
        }
        const tPanel = document.getElementById('tw-nt-table-panel');
        if (tPanel) {
            tPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        const cmdCounterEl = document.getElementById('tw-nt-cmd-counter');
        if (cmdCounterEl) {
            cmdCounterEl.innerText = `${sequence.length} comandos`;
        }
        const copyNotice = copied ? 'copiado para o Clipboard' : 'gerado (copia do campo de texto abaixo)';
        if (attackMode === 'nuke_sweep' || attackMode === 'cat_demolish' || !hasNobles) {
            document.getElementById('tw-nt-status').innerHTML = `<span style="color:#34d399;">✅ Limpeza (${sequence.length} ataques) ${copyNotice}!</span>`;
            showToast(copied ? `⚡ Limpeza copiada para o Clipboard!` : `⚡ Limpeza gerada com sucesso!`);
        } else {
            document.getElementById('tw-nt-status').innerHTML = `<span style="color:#34d399;">✅ ${sequence.length} comandos sincronizados e ${copyNotice}!</span>`;
            showToast(copied ? `⚡ Plano copiado para o Clipboard!` : `⚡ Plano gerado com sucesso!`);
        }
    } catch (err) {
        console.error('[TW Suite Error] buildMasterOPPlan:', err);
        const statusEl = document.getElementById('tw-nt-status');
        if (statusEl) {
            statusEl.innerHTML = `<span style="color:#ef4444; font-weight:bold;">❌ Erro: ${err.message}</span>`;
        }
        alert('❌ Erro ao gerar plano: ' + err.message);
    }
}

    // ==========================================
    // JANELA DO MAPA (SEM RELOAD)
    // ==========================================
    function openMapIframeModal(caller = 'fakes') {
        if (document.getElementById('tw-map-iframe-modal')) return;

        const mapModal = document.createElement('div');
        mapModal.id = 'tw-map-iframe-modal';
        mapModal.style.cssText = `
            position: fixed; inset: 2vh 2vw; z-index: 1000000;
            background: #090d16; border: 2px solid #38bdf8; border-radius: 12px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.95);
            display: flex; flex-direction: column; overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        `;
        
        mapModal.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 16px; background:#0f172a; border-bottom:1px solid #1e293b;">
                <div style="font-weight:bold; color:#38bdf8; font-size:14px;">🗺️ SELEÇÃO NO MAPA (SEM RELOAD)</div>
                <div style="display:flex; gap:10px; align-items:center;">
                    <span style="color:#94a3b8; font-size:12px; font-weight:bold;">Alvos: <span id="tw-hud-count" style="color:#34d399; font-size:14px;">${grabbedTargets.size}</span></span>
                    <button class="tw-btn" id="tw-hud-clear" style="color:#f43f5e; padding:4px 10px;">Limpar</button>
                    <button class="tw-btn tw-btn-green" id="tw-hud-done" style="padding:4px 12px;">✅ Concluir & Fechar</button>
                </div>
            </div>
            <div style="flex-grow:1; position:relative; background:#000;">
                <div id="tw-map-loader" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:#94a3b8; z-index:10;"><div class="tw-spinner"></div> A carregar o mapa...</div>
                <iframe id="tw-map-frame" src="/game.php?screen=map" style="width:100%; height:100%; border:none; opacity:0; transition:opacity 0.3s;"></iframe>
            </div>
        `;
        document.body.appendChild(mapModal);

        const iframe = document.getElementById('tw-map-frame');
        iframe.onload = () => {
            document.getElementById('tw-map-loader').style.display = 'none';
            iframe.style.opacity = '1';
            
            try {
                const iWin = iframe.contentWindow, iDoc = iframe.contentDocument;
                const style = iDoc.createElement('style');
                style.innerHTML = `
                    #topContainer, #header_info, #footer, #side_bar, #minimap_container, .principal, .server_info { display: none !important; }
                    body { background: #000 !important; overflow: hidden !important; margin:0; padding:0; }
                    #map_container { margin: 0 auto !important; position: relative !important; }
                    .tw-shadow-box {
                        position: absolute !important;
                        background: rgba(239, 68, 68, 0.45) !important;
                        border: 2px solid #ef4444 !important;
                        box-shadow: 0 0 12px rgba(239, 68, 68, 0.9), inset 0 0 8px rgba(239, 68, 68, 0.6) !important;
                        border-radius: 4px !important;
                        pointer-events: none !important;
                        display: flex !important; align-items: center !important; justify-content: center !important;
                        font-size: 14px !important; font-weight: bold !important; color: #fff !important;
                        z-index: 1000 !important;
                    }
                `;
                iDoc.head.appendChild(style);

                const checkTWMap = setInterval(() => {
                    if (iWin.TWMap && iWin.TWMap.mapHandler && iWin.TWMap.mapHandler.onClick) {
                        clearInterval(checkTWMap);
                        const origClick = iWin.TWMap.mapHandler.onClick;
                        iWin.TWMap.mapHandler.onClick = function (x, y, event) {
                            const coord = `${x}|${y}`;
                            const v = iWin.TWMap.villages[x * 1000 + y];
                            if (v) {
                                if (grabbedTargets.has(coord)) grabbedTargets.delete(coord);
                                else grabbedTargets.add(coord);
                                
                                document.getElementById('tw-hud-count').innerText = grabbedTargets.size;
                                
                                const tbFakes = document.getElementById('tw-f-targets');
                                if (tbFakes) {
                                    tbFakes.value = Array.from(grabbedTargets).join(' ');
                                    tbFakes.dispatchEvent(new Event('input'));
                                }
                                const tbMulti = document.getElementById('tw-nt-targets-multi');
                                if (tbMulti) {
                                    tbMulti.value = Array.from(grabbedTargets).join(' ');
                                    tbMulti.dispatchEvent(new Event('input'));
                                }
                                
                                renderShadowsInIframe(iWin, iDoc);
                                return false;
                            }
                            return origClick.call(this, x, y, event);
                        };

                        if (mapInterval) clearInterval(mapInterval);
                        mapInterval = setInterval(() => renderShadowsInIframe(iWin, iDoc), 100);
                        renderShadowsInIframe(iWin, iDoc);
                    }
                }, 100);
            } catch (e) { console.error(e); }
        };

        document.getElementById('tw-hud-clear').onclick = () => {
            grabbedTargets.clear();
            document.getElementById('tw-hud-count').innerText = '0';
            const tbFakes = document.getElementById('tw-f-targets');
            if (tbFakes) {
                tbFakes.value = '';
                tbFakes.dispatchEvent(new Event('input'));
            }
            const tbMulti = document.getElementById('tw-nt-targets-multi');
            if (tbMulti) {
                tbMulti.value = '';
                tbMulti.dispatchEvent(new Event('input'));
            }
            const iframe = document.getElementById('tw-map-frame');
            if (iframe && iframe.contentWindow) renderShadowsInIframe(iframe.contentWindow, iframe.contentDocument);
        };
        document.getElementById('tw-hud-done').onclick = () => {
            if (mapInterval) { clearInterval(mapInterval); mapInterval = null; }
            mapModal.remove();
        };
    }

    function renderShadowsInIframe(iWin, iDoc) {
        if (!iWin.TWMap || !iWin.TWMap.map) return;
        const mapContainer = iDoc.getElementById('map_container') || iDoc.getElementById('map');
        if (!mapContainer) return;
        mapContainer.querySelectorAll('.tw-shadow-box').forEach(el => el.remove());

        const size = iWin.TWMap.tileSize || [53, 38];
        grabbedTargets.forEach(coord => {
            const [x, y] = coord.split('|').map(Number);
            const pos = iWin.TWMap.map.pixelByCoord(x, y);
            if (pos && typeof pos[0] === 'number') {
                const mark = iDoc.createElement('div');
                mark.className = 'tw-shadow-box';
                mark.style.left = `${pos[0]}px`;
                mark.style.top = `${pos[1]}px`;
                mark.style.width = `${size[0]}px`;
                mark.style.height = `${size[1]}px`;
                mark.innerHTML = '🎯';
                mapContainer.appendChild(mark);
            }
        });
    }

    // Tooltips interativos
    document.addEventListener('mouseover', e => {
        const tr = e.target.closest('[data-vid]');
        if (!tr) return;
        const v = villagesById[tr.getAttribute('data-vid')];
        if (!v) return;
        let t = `<div style="font-weight:bold; color:#fff; margin-bottom:4px;">${v.name}</div>
                 <div style="font-size:11px; margin-bottom:4px; color:#38bdf8;">Função: <span class="${v.roleTag.css}">${v.roleTag.label}</span></div>
                 <div style="font-size:11px; margin-bottom:6px; color:${v.farm.color};">Fazenda: ${v.farm.used.toLocaleString('pt-PT')} / ${v.farm.max.toLocaleString('pt-PT')} (${v.farm.perc}%)</div>
                 <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px 8px;">`;
        unitConfigs.forEach(u => {
            if (!u.isHidden && u.name) {
                const q = v.troopsDict[u.name] || 0;
                t += `<div style="display:flex; justify-content:space-between; gap:4px; color:#94a3b8;"><img src="${u.src}" style="width:14px; height:14px;"> <b style="color:${q>0?'#fff':'#475569'};">${q}</b></div>`;
            }
        });
        const tt = document.getElementById(`${modalId}-tooltip`);
        tt.innerHTML = t + '</div>'; tt.classList.add('show');
    });
    document.addEventListener('mousemove', e => {
        if (!e.target.closest('[data-vid]')) return;
        const tt = document.getElementById(`${modalId}-tooltip`);
        tt.style.left = Math.min(e.clientX + 15, window.innerWidth - 220) + 'px';
        tt.style.top = Math.min(e.clientY + 15, window.innerHeight - 180) + 'px';
    });
    document.addEventListener('mouseout', e => {
        if (e.target.closest('[data-vid]')) document.getElementById(`${modalId}-tooltip`).classList.remove('show');
    });

    // Preferências de localStorage
    const STORAGE_KEY = 'tw_tactical_prefs_v2';
    function savePrefs(key, val) {
        try {
            const cur = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            cur[key] = val;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cur));
        } catch (e) {}
    }
    function getPref(key, defaultVal) {
        try {
            const cur = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            return cur[key] !== undefined ? cur[key] : defaultVal;
        } catch (e) { return defaultVal; }
    }

    // Fechar com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const mapModal = document.getElementById('tw-map-iframe-modal');
            const memModal = document.getElementById('tw-memory-modal');
            if (mapModal) {
                mapModal.remove();
                if (mapInterval) { clearInterval(mapInterval); mapInterval = null; }
            } else if (memModal) {
                memModal.remove();
            } else if (document.getElementById(modalId)) {
                closeSuite();
            }
        }
    });

    function closeSuite() {
        if (mapInterval) clearInterval(mapInterval);
        if (ui) ui.remove();
        if (backdrop) backdrop.remove();
        if (tooltip) tooltip.remove();
        if (toast) toast.remove();
        if (document.getElementById('tw-map-iframe-modal')) document.getElementById('tw-map-iframe-modal').remove();
        if (document.getElementById('tw-memory-modal')) document.getElementById('tw-memory-modal').remove();
    }

    await loadData();
})();
