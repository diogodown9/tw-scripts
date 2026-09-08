// ==UserScript==
// @name         TW Tactical Command Suite
// @namespace    https://tribalwars.com.pt/
// @version      3.2.31
// @description  Suite militar avançada para Tribal Wars PT: Módulo Tático de Comandos (Deteção Inteligente de Ataques Inimigos a Chegar com Identificação Real do Jogador Atacante e Aldeia de Origem, Ataques & Retornos com filtros, agrupamento por alvos, ordenação interativa por clique nos cabeçalhos de coluna, exclusão opcional de micro-saques Modo Turbo para velocidade máxima, purga automática de comandos expirados e timers sincronizados com o servidor), Exclusão de Horário Noturno (Bónus Noturno) no Impacto e no Envio com horas configuráveis, Calculador Automático de Horário Mínimo de Impacto com Folga de Envio Configurável (1º Impacto e Cobertura Total de Alvos com ajuste instantâneo a 1 clique), identificação visual de Hoje/Amanhã na tabela, balanceamento round-robin de alvos, escalonamento sem colisão em repetições e Fakes Inteligentes 1% Dinâmico por Pontos (_60, _90, _115, _135), Escoltas Anti-Snipe de Precisão Cirúrgica a 40ms antes de cada Nobre (janela anti-snipe personalizável), Bate e Volta com folga configurável de regresso (mínimo seguro de 75s para PSEvolution e bots), Rastreio em Tempo Real de Nobres a Caminho & em Retorno de Comandos + Treino na Academia, Deteção Rigorosa de 0 Nobres em Casa por Isolamento de Linhas HTML & Cruzamento de Comandos Ativos, Deduplicação Rigorosa de Nobres & Teto Físico de Tropas Fora, Sincronização Server-Live sem Cache, Validação Precisa de Envio & Horário Mínimo de Ataque à Prova de Falhas (⚡ com 5m folga, cálculo inteligente de nobres a regressar e seleção do Nuke Full mais perto), Suporte Automático a Modelos NT (NT 33% para 3 nobres, NT 25% para 4 nobres), Bunkers Desligados por Default, Alvo Cats do Nuke Muralha por Default, Arsenal Tático de Fakes, UI de Limpezas/Nobres/Demolição, e Planeador Tático.
// @author       Diogo & Antigravity
// @match        https://*.tribalwars.com.pt/game.php*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tribalwars.com.pt
// @updateURL    https://raw.githubusercontent.com/diogodown9/tribos-114/main/tw_tactical_command_suite.user.js
// @downloadURL  https://raw.githubusercontent.com/diogodown9/tribos-114/main/tw_tactical_command_suite.user.js
// @grant        none
// ==/UserScript==

(async function () {
    const SCRIPT_VERSION = '3.2.31';

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
        .tw-badge-cmd-attack { background: #7f1d1d; color: #fca5a5; border: 1px solid #ef4444; padding: 2px 7px; border-radius: 4px; font-weight: bold; font-size: 10px; }
        .tw-badge-cmd-return { background: #1e1b4b; color: #c7d2fe; border: 1px solid #6366f1; padding: 2px 7px; border-radius: 4px; font-weight: bold; font-size: 10px; }
        .tw-badge-cmd-snob { background: #78350f; color: #fde68a; border: 1px solid #f59e0b; padding: 2px 7px; border-radius: 4px; font-weight: bold; font-size: 10px; box-shadow: 0 0 6px rgba(245, 158, 11, 0.35); }
        .tw-badge-cmd-farm { background: #451a03; color: #fed7aa; border: 1px solid #d97706; padding: 2px 7px; border-radius: 4px; font-weight: bold; font-size: 10px; }
        .tw-badge-cmd-support { background: #064e3b; color: #a7f3d0; border: 1px solid #10b981; padding: 2px 7px; border-radius: 4px; font-weight: bold; font-size: 10px; }

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
                <button class="tw-tab" id="tab-btn-commands" style="border-left:1px solid #334155; margin-left:4px;">📡 Comandos & Retornos <span id="tw-commands-count-badge" style="font-size:10px; background:rgba(56,189,248,0.2); color:#38bdf8; padding:1px 6px; border-radius:10px; margin-left:4px; font-weight:bold;">0</span></button>
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
    // Preferências de localStorage persistentes
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

    let savedCounterTarget = '';
    let savedCounterUnit = 'ram';
    let lastGeneratedCommands = [];
    let lastGeneratedTarget = '';
    let plannerMode = 'single'; // 'single' ou 'multi'
    let allAccountPaladins = [];
    let allParsedCommands = [];
    let allSnobProductions = [];
    let allNobleReturns = [];
    let commandsFilter = 'players'; // 'players' (padrão: ataques e retornos a jogadores), 'all', 'attack', 'return', 'snob', 'farm', 'support'
    let commandsSearch = '';
    let commandsSort = getPref('tw_cmd_sort', 'time_asc'); // 'time_asc', 'time_desc', 'origin', 'target', 'snob_first'
    let commandsGroupByTarget = getPref('tw_cmd_group_targets', false); // Alternar agrupamento de comandos por aldeia alvo
    let commandsIgnoreFarms = getPref('tw_cmd_ignore_farms', true); // Modo Turbo: excluir micro-saques automáticos a bárbaras para velocidade máxima
    let collapsedTargetGroups = new Set(); // Conjunto de chaves de grupos recolhidos
    let commandsTimerInterval = null;

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

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
    let worldVillageByCoord = new Map();
    let worldPlayers = {};
    let worldPlayersLoaded = false;

    // Recuperar cache do mapa se já carregado previamente nesta aba do navegador
    if (typeof window !== 'undefined' && window.__tw_world_cache && window.__tw_world_cache.villagesLoaded && window.__tw_world_cache.playersLoaded) {
        worldVillages = window.__tw_world_cache.villages || [];
        worldVillageByCoord = window.__tw_world_cache.villageByCoord || new Map();
        worldPlayers = window.__tw_world_cache.players || {};
        worldVillagesLoaded = true;
        worldPlayersLoaded = true;
    }

    async function fetchWorldData() {
        if (worldVillagesLoaded && worldPlayersLoaded) return;
        try {
            const fetches = [];
            const originBase = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';

            const fetchText = async (path) => {
                const url = originBase + path;
                try {
                    const res = await fetch(url);
                    if (res.ok) {
                        const t = await res.text();
                        if (t && t.length > 50) return t;
                    }
                } catch (_) {}
                if (typeof $ !== 'undefined' && $.ajax) {
                    try {
                        const t = await $.ajax({ url, dataType: 'text', cache: true });
                        if (t && t.length > 50) return t;
                    } catch (_) {}
                }
                return '';
            };

            if (!worldVillagesLoaded) {
                fetches.push((async () => {
                    const text = await fetchText('/map/village.txt');
                    if (text) {
                        const lines = text.trim().split('\n');
                        const vList = [];
                        const vMap = new Map();
                        lines.forEach(line => {
                            const parts = line.split(',');
                            if (parts.length >= 4) {
                                const coord = `${parts[2]}|${parts[3]}`;
                                let vName = parts[1] || '';
                                try { vName = decodeURIComponent(vName).replace(/\+/g, ' '); } catch (_) { vName = vName.replace(/\+/g, ' '); }
                                const vObj = {
                                    id: parts[0],
                                    name: vName,
                                    x: parseInt(parts[2], 10),
                                    y: parseInt(parts[3], 10),
                                    playerId: parts[4] || '0',
                                    points: parts.length >= 6 ? (parseInt(parts[5], 10) || 0) : 0,
                                    coord
                                };
                                vList.push(vObj);
                                vMap.set(coord, vObj);
                            }
                        });
                        worldVillages = vList;
                        worldVillageByCoord = vMap;
                        worldVillagesLoaded = true;
                    }
                })());
            }

            if (!worldPlayersLoaded) {
                fetches.push((async () => {
                    const text = await fetchText('/map/player.txt');
                    if (text) {
                        const lines = text.trim().split('\n');
                        const pMap = {};
                        lines.forEach(line => {
                            const parts = line.split(',');
                            if (parts.length >= 2) {
                                let pName = parts[1] || '';
                                try { pName = decodeURIComponent(pName).replace(/\+/g, ' '); } catch (_) { pName = pName.replace(/\+/g, ' '); }
                                pMap[parts[0]] = pName;
                            }
                        });
                        worldPlayers = pMap;
                        worldPlayersLoaded = true;
                    }
                })());
            }

            await Promise.all(fetches);

            if (typeof window !== 'undefined' && worldVillagesLoaded && worldPlayersLoaded) {
                window.__tw_world_cache = {
                    villages: worldVillages,
                    villageByCoord: worldVillageByCoord,
                    players: worldPlayers,
                    villagesLoaded: true,
                    playersLoaded: true,
                    loadedAt: Date.now()
                };
            }

            // Auto-atualizar reativamente comandos já em memória assim que os dados do mundo carregam
            if (typeof allParsedCommands !== 'undefined' && Array.isArray(allParsedCommands) && allParsedCommands.length > 0) {
                allParsedCommands.forEach(c => {
                    c.targetOwner = getCoordOwnership(c.targetCoords);
                    c.targetPlayerName = c.targetOwner.playerName || (c.targetOwner.isOwn ? 'Própria' : (c.targetOwner.isBarbarian ? 'Bárbara' : 'Player'));
                    if (!c.targetName && c.targetOwner.villageName) c.targetName = c.targetOwner.villageName;
                });
                if (typeof renderCommandsTable === 'function' && document.getElementById('tw-cmd-tbody')) {
                    renderCommandsTable();
                }
            }
        } catch (e) {
            console.warn('[TW] Erro ao carregar dados do mapa e jogadores', e);
        }
    }
    const fetchWorldVillages = fetchWorldData;

    function getCoordOwnership(coord) {
        if (!coord) return { type: 'unknown', label: 'Desconhecido', isOwn: false, isPlayer: false, isBarbarian: false, playerName: '' };

        // 1. Verificar se é aldeia própria ativa do jogador da conta (allVillages)
        if (typeof allVillages !== 'undefined' && Array.isArray(allVillages)) {
            const ownV = allVillages.find(v => v.coords === coord);
            if (ownV) {
                return { type: 'own', label: 'Própria', isOwn: true, isPlayer: false, isBarbarian: false, playerName: 'Própria', villageName: ownV.name };
            }
        }

        // 2. Verificar no game_data.player.id
        const currentPid = (typeof game_data !== 'undefined' && game_data.player && game_data.player.id) ? String(game_data.player.id) : null;

        // 3. Consultar no mapa de aldeias do mundo
        const wv = worldVillageByCoord.get(coord) || (worldVillages && worldVillages.find(v => v.coord === coord));
        if (wv) {
            if (!wv.playerId || wv.playerId === '0') {
                return { type: 'barbarian', label: 'Bárbara', isOwn: false, isPlayer: false, isBarbarian: true, playerName: 'Bárbara', villageName: wv.name };
            }
            if (currentPid && String(wv.playerId) === currentPid) {
                return { type: 'own', label: 'Própria', isOwn: true, isPlayer: false, isBarbarian: false, playerName: 'Própria', villageName: wv.name };
            }
            const pName = worldPlayers[wv.playerId] || 'Player';
            return { type: 'player', label: pName, isOwn: false, isPlayer: true, isBarbarian: false, playerName: pName, villageName: wv.name, playerId: wv.playerId };
        }

        return { type: 'player', label: 'Player', isOwn: false, isPlayer: true, isBarbarian: false, playerName: 'Player' };
    }

    function parseTimerSeconds(timerStr) {
        if (!timerStr) return 0;
        const parts = timerStr.trim().split(':').map(Number);
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        if (parts.length === 4) return parts[0] * 86400 + parts[1] * 3600 + parts[2] * 60 + parts[3];
        return 0;
    }

    function getTwServerTimeMs() {
        try {
            if (typeof Timing !== 'undefined' && typeof Timing.getCurrentServerTime === 'function') {
                const t = Timing.getCurrentServerTime();
                if (t && !isNaN(t) && t > 1000000) return t;
            }
        } catch (_) {}
        try {
            if (typeof game_data !== 'undefined' && game_data.time) {
                const t = parseInt(game_data.time, 10);
                if (t && !isNaN(t)) return t * 1000;
            }
        } catch (_) {}
        return Date.now();
    }

    function parseTwDateTime(str, serverTimeObj = null) {
        if (!str) return null;
        if (!serverTimeObj) serverTimeObj = new Date(getTwServerTimeMs());
        str = str.trim();
        const cleanStr = str.replace(/<[^>]+>/g, '').trim().toLowerCase();
        const timeMatch = cleanStr.match(/(\d{1,2}):(\d{2}):(\d{2})(?:[:\.](\d{1,3}))?/);
        if (!timeMatch) return null;
        const h = parseInt(timeMatch[1], 10);
        const m = parseInt(timeMatch[2], 10);
        const s = parseInt(timeMatch[3], 10);
        const ms = timeMatch[4] ? parseInt(timeMatch[4].padEnd(3, '0').slice(0, 3), 10) : 0;
        
        const d = new Date(serverTimeObj.getTime());
        d.setHours(h, m, s, ms);

        if (cleanStr.includes('amanhã') || cleanStr.includes('tomorrow')) {
            d.setDate(d.getDate() + 1);
        } else {
            const dateMatch = cleanStr.match(/(\d{1,2})\.(\d{1,2})\./) || cleanStr.match(/(\d{1,2})\/(\d{1,2})\//);
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

    // Diagnóstico global de recolha de comandos
    window.twCommandDiagnostics = {
        lastRun: null,
        logs: [],
        add(url, status, bytes, cmdsFound, note = '') {
            const entry = {
                time: new Date().toLocaleTimeString('pt-PT'),
                url,
                status,
                bytes,
                cmdsFound,
                note
            };
            this.logs.push(entry);
            console.log(`[TW Tactical Fetch] ${status} (${(bytes/1024).toFixed(1)}KB) -> ${cmdsFound} cmds | ${url} ${note ? '('+note+')' : ''}`);
        },
        clear() {
            this.logs = [];
            this.lastRun = new Date();
        },
        getSummaryText() {
            if (!this.logs.length) return 'Nenhuma consulta efetuada ainda.';
            return this.logs.map((l, i) => `[${i+1}] ${l.status} (${(l.bytes/1024).toFixed(1)}KB, ${l.cmdsFound} cmds) -> ${l.url} ${l.note ? '['+l.note+']' : ''}`).join('\n');
        }
    };

    async function fetchAllAccountCommandsHtml(customMakeUrl = null, customSafeFetch = null, activeWarVillages = [], warGroupIds = []) {
        if (window.twCommandDiagnostics) window.twCommandDiagnostics.clear();

        const doFetch = async (url) => {
            if (!url) return '';
            const cacheBusterUrl = url + (url.includes('?') ? '&' : '?') + `_tw_ts=${Date.now()}`;
            if (typeof customSafeFetch === 'function') {
                try {
                    const r = await customSafeFetch(cacheBusterUrl);
                    if (r && r.length > 50) return r;
                } catch (_) {}
            }
            for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                    const res = await fetch(cacheBusterUrl, { cache: 'no-store' });
                    if (res.ok) {
                        const txt = await res.text();
                        if (txt && txt.length > 50) return txt;
                    }
                } catch (e) {
                    if (attempt === 2) console.warn('[TW Tactical] Falha de fetch:', cacheBusterUrl, e);
                }
                if (attempt < 2) await new Promise(r => setTimeout(r, 200));
            }
            return '';
        };

        const currentVId = (typeof game_data !== 'undefined' && game_data.village) ? game_data.village.id : null;
        const currentVCoords = (typeof game_data !== 'undefined' && game_data.village) ? game_data.village.coord : null;
        const currentVName = (typeof game_data !== 'undefined' && game_data.village && game_data.village.name) ? game_data.village.name : '';
        const sitterParam = (typeof game_data !== 'undefined' && game_data.player && game_data.player.sitter > 0) ? `&t=${game_data.player.id}` : '';

        const results = [];
        const seenCommandIds = new Set();
        const fetchedUrls = new Set();

        const extractIds = (html) => {
            if (!html) return [];
            const m1 = Array.from(html.matchAll(/data-command-id="(\d+)"/g)).map(m => m[1]);
            const m2 = Array.from(html.matchAll(/href="[^"]*(?:info_command)[^"]*"/gi)).map(h => (h[0].match(/[?&;]id=(\d+)/i) || [])[1]).filter(Boolean);
            const m3 = Array.from(html.matchAll(/data-id="(\d+)"/g)).map(m => m[1]);
            const m4 = Array.from(html.matchAll(/id="command_(\d+)"/gi)).map(m => m[1]);
            const m5 = Array.from(html.matchAll(/name="id_(\d+)"/gi)).map(m => m[1]);
            const m6 = Array.from(html.matchAll(/<tr[^>]*class="[^"]*command-row[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi)).map((m, idx) => {
                const idM = m[1].match(/(?:data-command-id|data-id)="(\d+)"/) || m[1].match(/[?&;]id=(\d+)/) || m[1].match(/id="command_(\d+)"/);
                return idM ? idM[1] : `cmd_${idx}`;
            });
            return [...new Set([...m1, ...m2, ...m3, ...m4, ...m5, ...m6])];
        };

        const fetchSingleUrl = async (url, label = '') => {
            if (!url || fetchedUrls.has(url)) return null;
            fetchedUrls.add(url);
            try {
                const res = await doFetch(url);
                const bytes = res ? res.length : 0;
                if (res && (
                    res.includes('commands_table') ||
                    res.includes('incomings_table') ||
                    res.includes('commands_incomings') ||
                    res.includes('screen=info_command') ||
                    res.includes('data-command-id') ||
                    res.includes('command_hover_details') ||
                    res.includes('command-row') ||
                    res.includes('commands_outgoings') ||
                    (res.includes('overview_table') && (res.includes('mode=commands') || res.includes('mode=incomings'))) ||
                    (res.includes('overview_villages') && (res.includes('commands') || res.includes('incomings')))
                )) {
                    const ids = extractIds(res);
                    if (window.twCommandDiagnostics) window.twCommandDiagnostics.add(url, '200 OK', bytes, ids.length, label);
                    return res;
                } else if (res) {
                    if (window.twCommandDiagnostics) window.twCommandDiagnostics.add(url, 'Sem tabela', bytes, 0, label);
                } else {
                    if (window.twCommandDiagnostics) window.twCommandDiagnostics.add(url, 'Falhou', 0, 0, label);
                }
            } catch (err) {
                if (window.twCommandDiagnostics) window.twCommandDiagnostics.add(url, 'Erro ' + err.message, 0, 0, label);
            }
            return null;
        };

        const addPageHtml = (html, vId = null, coords = null, name = null, label = '') => {
            if (!html) return 0;
            const ids = extractIds(html);
            const item = {
                html,
                villageId: vId,
                coords: coords,
                name: name,
                label: label,
                toString() { return this.html; },
                includes(...args) { return this.html.includes(...args); },
                match(...args) { return this.html.match(...args); }
            };
            results.push(item);
            ids.forEach(id => seenCommandIds.add(id));
            return ids.length;
        };

        // 1. Pedido a Grupos de Guerra Dedicados (ex: [ WAR ], [ Ataque ]) se existirem na conta
        if (Array.isArray(warGroupIds) && warGroupIds.length > 0) {
            for (const gId of warGroupIds) {
                const gUrl = `/game.php?screen=overview_villages&mode=commands&group=${gId}&page=-1${sitterParam}`;
                const gHtml = await fetchSingleUrl(gUrl, `grupo-guerra-${gId}`);
                if (gHtml) addPageHtml(gHtml, null, null, null, `war-group-${gId}`);
            }
        }

        // 2. Pedido Primário Canónico: Visão Geral de Comandos (&group=0) e Sem Paginação (&page=-1)
        const primaryEndpoints = [
            currentVId ? `/game.php?village=${currentVId}&screen=overview_villages&mode=commands&group=0&page=-1${sitterParam}` : '',
            `/game.php?screen=overview_villages&mode=commands&group=0&page=-1${sitterParam}`,
            currentVId ? `/game.php?village=${currentVId}&screen=overview_villages&mode=commands&type=all&group=0&page=-1${sitterParam}` : '',
            `/game.php?screen=overview_villages&mode=commands&type=all&group=0&page=-1${sitterParam}`
        ].filter(Boolean);

        let mainHtml = null;
        for (const ep of primaryEndpoints) {
            mainHtml = await fetchSingleUrl(ep, 'global-overview-page-all');
            if (mainHtml && (mainHtml.includes('commands_table') || extractIds(mainHtml).length > 0)) {
                addPageHtml(mainHtml, currentVId, currentVCoords, currentVName, 'global-overview');
                break;
            }
        }

        // Se houver paginação real (.paged-nav-item), seguir as primeiras páginas explícitas (teto 3 páginas)
        if (mainHtml) {
            const navMatches = Array.from(mainHtml.matchAll(/class="[^"]*paged-nav-item[^"]*"[^>]*href="([^"]+)"/gi))
                .concat(Array.from(mainHtml.matchAll(/href="([^"]+)"[^>]*class="[^"]*paged-nav-item[^"]*"/gi)));
            const pLinks = [...new Set(navMatches.map(m => m[1].replace(/&amp;/g, '&')).filter(u => u && !u.includes('page=-1')))].slice(0, 3);
            for (const pUrl of pLinks) {
                const pRes = await fetchSingleUrl(pUrl, 'paged-nav');
                if (pRes) addPageHtml(pRes, currentVId, currentVCoords, currentVName, 'paged-nav');
            }
        }

        // 3. Consulta da aba de retornos (&type=return) caso o servidor os separe
        const returnEndpoints = [
            currentVId ? `/game.php?village=${currentVId}&screen=overview_villages&mode=commands&type=return&group=0&page=-1${sitterParam}` : '',
            `/game.php?screen=overview_villages&mode=commands&type=return&group=0&page=-1${sitterParam}`
        ].filter(Boolean);

        for (const rEp of returnEndpoints) {
            const rHtml = await fetchSingleUrl(rEp, 'global-returns-page');
            if (rHtml && (rHtml.includes('commands_table') || extractIds(rHtml).length > 0)) {
                addPageHtml(rHtml, currentVId, currentVCoords, currentVName, 'global-returns');
                break;
            }
        }

        // 3b. Consulta canónica da aba de comandos a chegar (Incomings / Ataques Inimigos à conta com nomes de jogador e aldeias)
        const incomingEndpoints = [
            currentVId ? `/game.php?village=${currentVId}&screen=overview_villages&mode=incomings&type=unignored&subtype=all&group=0&page=-1${sitterParam}` : '',
            `/game.php?screen=overview_villages&mode=incomings&type=unignored&subtype=all&group=0&page=-1${sitterParam}`,
            currentVId ? `/game.php?village=${currentVId}&screen=overview_villages&mode=incomings&group=0&page=-1${sitterParam}` : '',
            `/game.php?screen=overview_villages&mode=incomings&group=0&page=-1${sitterParam}`
        ].filter(Boolean);

        for (const inEp of incomingEndpoints) {
            const inHtml = await fetchSingleUrl(inEp, 'global-incomings-page');
            if (inHtml && (inHtml.includes('incomings_table') || extractIds(inHtml).length > 0)) {
                addPageHtml(inHtml, currentVId, currentVCoords, currentVName, 'global-incomings');
                break;
            }
        }

        // 4. Caçador Direcionado de Aldeias de Guerra (Bypassa os 3000+ comandos de auto-farm de bárbaras)
        let warList = Array.isArray(activeWarVillages) ? [...activeWarVillages] : [];
        if (warList.length === 0 && typeof allVillages !== 'undefined' && Array.isArray(allVillages)) {
            allVillages.forEach(v => {
                const mov = v.movingTroopsDict || {};
                const snobsOut = v.snobsOutside || 0;
                const movSnobs = mov.snob || 0;
                const movRams = mov.ram || 0;
                const movCats = mov.catapult || 0;
                const movAxes = mov.axe || 0;
                const movLights = mov.light || 0;
                const movPop = v.movingPopTotal || 0;
                const hasKnightMoving = (v.paladin && mov.knight > 0);

                if (snobsOut > 0 || movSnobs > 0 || movRams > 0 || movCats > 0 ||
                    movAxes >= 800 || movLights >= 400 || movPop >= 1500 || hasKnightMoving) {
                    warList.push({ id: String(v.id), coords: v.coords, name: v.name });
                }
            });
        }

        // Deduplicar aldeias por ID
        const uniqueWarVillages = [];
        const seenV = new Set();
        warList.forEach(wv => {
            const vId = typeof wv === 'object' ? String(wv.id) : String(wv);
            if (!seenV.has(vId)) {
                seenV.add(vId);
                const coords = (typeof wv === 'object' && wv.coords) ? wv.coords : (typeof allVillages !== 'undefined' ? (allVillages.find(v => String(v.id) === vId)?.coords || '') : '');
                const name = (typeof wv === 'object' && wv.name) ? wv.name : (typeof allVillages !== 'undefined' ? (allVillages.find(v => String(v.id) === vId)?.name || '') : '');
                uniqueWarVillages.push({ id: vId, coords, name });
            }
        });

        // Fetch em paralelo por batches de 6 aldeias
        for (let i = 0; i < uniqueWarVillages.length; i += 6) {
            const chunk = uniqueWarVillages.slice(i, i + 6);
            await Promise.all(chunk.map(async (wv) => {
                if (wv.id === String(currentVId)) return;
                const ovUrl = `/game.php?village=${wv.id}&screen=overview${sitterParam}`;
                const ovHtml = await fetchSingleUrl(ovUrl, `aldeia-guerra-${wv.coords || wv.id}`);
                if (ovHtml) addPageHtml(ovHtml, wv.id, wv.coords, wv.name, `war-village-${wv.id}`);
            }));
        }

        console.log(`[TW Tactical] Comandos recolhidos de ${results.length} respostas HTTP (${seenCommandIds.size} comandos únicos detetados em ${uniqueWarVillages.length} aldeias de guerra).`);
        return results;
    }

    function parseCommandsNobleReturns(html, fallbackVillageId = null, fallbackCoords = null) {
        if (!html) return [];
        const returns = [];
        const trRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
        let trM;
        const rowMatches = [];
        while ((trM = trRegex.exec(html)) !== null) {
            const row = trM[0];
            const hasSnob = row.includes('snob') || row.includes('nobre') || row.includes('return_snob');
            if (!hasSnob) continue;

            const isReturn = (row.includes('return') || row.includes('retorno') || row.includes('regresso') || row.includes('other_back') || row.includes('back.webp')) &&
                             !/data-command-type="attack"/i.test(row) &&
                             !/\/command\/attack/i.test(row) &&
                             !/<a[^>]*>(?:Ataque|Saque)\b/i.test(row);

            const isAttack = (/data-command-type="attack"/i.test(row) || /\/command\/attack/i.test(row) || /<a[^>]*>(?:Ataque)\b/i.test(row) || /quickedit-label[^>]*>\s*Ataque/i.test(row)) &&
                             !row.includes('return_');

            if (isReturn || isAttack) {
                rowMatches.push({ row, isReturn, isAttack });
            }
        }

        rowMatches.forEach(({ row, isReturn, isAttack }) => {
            if (/<th/i.test(row) && !/<td/i.test(row)) return;

            let commandId = null;
            const cmdIdMatch = row.match(/data-command-id="(\d+)"/) || row.match(/data-id="(\d+)"/) || row.match(/id="command_(\d+)"/i);
            if (cmdIdMatch) {
                commandId = cmdIdMatch[1];
            } else {
                const hrefM = row.match(/href="([^"]*info_command[^"]*)"/i) || row.match(/href="([^"]*id=\d+[^"]*)"/i);
                if (hrefM) {
                    const idParam = hrefM[1].match(/[?&;]id=(\d+)/i);
                    if (idParam) commandId = idParam[1];
                }
            }

            const tds = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
            let homeCoords = fallbackCoords || '';
            let remoteCoords = '';

            const isOverviewTable = tds.length >= 4;
            const vMatch = isOverviewTable ? null : row.match(/village=(\d+)/);
            const vId = vMatch ? vMatch[1] : (fallbackVillageId ? String(fallbackVillageId) : null);

            if (isOverviewTable) {
                // Layout A: overview_villages (tds[0]: Command/Target, tds[1]: Origin/Home)
                const origTd = tds[1];
                const destTd = tds[0];

                const oCoord = origTd.match(/(\d{1,3}\|\d{1,3})/);
                if (oCoord) homeCoords = oCoord[1];

                const dCoord = destTd.match(/(\d{1,3}\|\d{1,3})/);
                if (dCoord) remoteCoords = dCoord[1];
            } else {
                // Layout B: Village Overview widget
                homeCoords = fallbackCoords || '';
                const allCoords = Array.from(row.matchAll(/(\d{1,3}\|\d{1,3})/g)).map(m => m[1]);
                if (allCoords.length > 0) {
                    remoteCoords = allCoords[0];
                }
            }

            // Deteção do timestamp de impacto / chegada
            let hitAtMs = 0;
            let timerStr = '';
            let remainingSec = 0;
            let completionStr = '';

            const endtimeMatch = row.match(/data-endtime="(\d+)"/);
            if (endtimeMatch) {
                hitAtMs = parseInt(endtimeMatch[1], 10) * 1000;
            }

            const timerMatch = row.match(/class="[^"]*(?:widget-command-)?timer[^"]*"[^>]*>([^<]+)<\/span>/i) || row.match(/timer">([^<]+)<\/span>/i);
            if (timerMatch) {
                timerStr = timerMatch[1].trim();
            } else {
                tds.forEach(td => {
                    const clean = td.replace(/<[^>]+>/g, '').trim();
                    const m = clean.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
                    if (m && !timerStr) timerStr = clean;
                });
            }
            if (timerStr) {
                const parts = timerStr.split(':').map(p => parseInt(p, 10));
                if (parts.length === 3) remainingSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
                else if (parts.length === 2) remainingSec = parts[0] * 60 + parts[1];
            }

            const timeMatch = row.match(/(hoje|amanhã|today|tomorrow|[0-9\.\/]+)\s*(?:às|at|\s)\s*(\d{1,2}:\d{2}:\d{2}(?::\d{3})?)/i) ||
                              row.match(/(\d{1,2}\.\d{1,2}\.(?:\d{2,4})?\s+\d{1,2}:\d{2}:\d{2})/i) ||
                              row.match(/(\d{1,2}:\d{2}:\d{2}:\d{3})/i);
            if (timeMatch) {
                completionStr = timeMatch[0];
                if (!hitAtMs) hitAtMs = parseTwDateTime(completionStr);
            }

            if (!hitAtMs && remainingSec > 0) {
                hitAtMs = Date.now() + remainingSec * 1000;
            }
            if (!hitAtMs) {
                hitAtMs = Date.now() + 60000;
            }

            let readyAtMs = hitAtMs;
            let isAttackReturn = false;
            let note = 'Regresso a casa';

            if (isAttack) {
                isAttackReturn = true;
                const snobSpeedMin = (typeof unitSpeedMinutes !== 'undefined' && unitSpeedMinutes.snob) ? unitSpeedMinutes.snob : 35;
                let travelSec = 0;
                if (homeCoords && remoteCoords && typeof calcDistance === 'function') {
                    const dist = calcDistance(homeCoords, remoteCoords);
                    travelSec = Math.round(dist * snobSpeedMin * 60);
                } else if (remainingSec > 0) {
                    travelSec = remainingSec;
                }
                readyAtMs = hitAtMs + (travelSec * 1000);
                const impactTimeLabel = new Date(hitAtMs).toLocaleTimeString('pt-PT');
                const returnTimeLabel = new Date(readyAtMs).toLocaleTimeString('pt-PT');
                const dayOffset = (new Date(readyAtMs).getDate() !== new Date().getDate()) ? ' (+1d)' : '';
                completionStr = `${returnTimeLabel}${dayOffset}`;
                note = `Regresso de Ataque a ${remoteCoords || 'alvo'} (impacto às ${impactTimeLabel})`;
                const remReturnSec = Math.max(0, Math.floor((readyAtMs - Date.now()) / 1000));
                timerStr = formatDuration(remReturnSec);
            }

            if (!commandId) {
                commandId = `snob_${isAttack ? 'atk' : 'ret'}_${homeCoords || fallbackCoords || 'h'}_${remoteCoords || 'r'}_${readyAtMs}_${returns.length}`;
            }

            returns.push({
                commandId,
                villageId: vId,
                coords: homeCoords,
                remoteCoords,
                type: 'return',
                isReturn: true,
                isAttackReturn,
                impactAtMs: isAttack ? hitAtMs : null,
                timerStr,
                remainingSec: Math.max(0, Math.floor((readyAtMs - Date.now()) / 1000)),
                completionStr: completionStr || (readyAtMs ? new Date(readyAtMs).toLocaleTimeString('pt-PT') : ''),
                readyAtMs,
                note
            });
        });

        return returns;
    }

    function parseAllAccountCommands(html, fallbackVillageId = null, fallbackCoords = null, fallbackVillageName = null) {
        if (!html) return [];
        const commands = [];

        // Deteção da aldeia proprietária do HTML (para preservar coordenadas fiéis de origem)
        let pageVId = fallbackVillageId;
        let pageVCoords = fallbackCoords;
        let pageVName = fallbackVillageName;

        const gameDataM = html.match(/"village"\s*:\s*\{([^}]+)\}/);
        if (gameDataM) {
            const idM = gameDataM[1].match(/"id"\s*:\s*(\d+)/);
            const coordM = gameDataM[1].match(/"coord"\s*:\s*"(\d{1,3}\|\d{1,3})"/);
            const nameM = gameDataM[1].match(/"name"\s*:\s*"([^"]+)"/);
            if (idM) pageVId = idM[1];
            if (coordM) pageVCoords = coordM[1];
            if (nameM) pageVName = decodeURIComponent(nameM[1].replace(/\\u([0-9a-fA-F]{4})/g, (m, cc) => String.fromCharCode(parseInt(cc, 16))));
        }
        if (!pageVCoords) {
            const titleM = html.match(/<title>([^<]+)\((\d{1,3}\|\d{1,3})\)[^<]*<\/title>/i);
            if (titleM) {
                pageVCoords = titleM[2];
                if (!pageVName) pageVName = titleM[1].trim();
            }
        }

        // Extração robusta de linhas TR (filtrando linhas de cabeçalho, atalhos de teclado e barras de navegação)
        const trRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
        let trM;
        const rows = [];
        while ((trM = trRegex.exec(html)) !== null) {
            const row = trM[0];
            const isCommandRow = row.includes('command-row') ||
                                 row.includes('data-command-id') ||
                                 row.includes('command_hover_details') ||
                                 row.includes('widget-command-timer') ||
                                 row.includes('screen=info_command') ||
                                 /data-command-type=/i.test(row);
            
            const isSpuriousRow = row.includes('header_menu') ||
                                  row.includes('arrowLeft') ||
                                  row.includes('arrowRight') ||
                                  row.includes('tooltip-delayed') ||
                                  /atalho\s*teclado/i.test(row) ||
                                  (row.includes('<th') && !row.includes('<td'));

            if (isCommandRow && !isSpuriousRow) {
                rows.push(row);
            }
        }

        rows.forEach((row, idx) => {
            let commandId = null;
            const cmdIdMatch = row.match(/data-command-id="(\d+)"/) ||
                               row.match(/data-id="(\d+)"/) ||
                               row.match(/id="command_(\d+)"/i);
            if (cmdIdMatch) {
                commandId = cmdIdMatch[1];
            } else {
                const hrefMatch = row.match(/href="([^"]*(?:info_command)[^"]*)"/i) || row.match(/href="([^"]*[?&;]id=\d+[^"]*)"/i);
                if (hrefMatch) {
                    const idParam = hrefMatch[1].match(/[?&;]id=(\d+)/i);
                    if (idParam) commandId = idParam[1];
                }
            }

            const linkMatch = row.match(/href="([^"]*screen=info_command[^"]*)"/i);
            const commandLink = linkMatch ? linkMatch[1].replace(/&amp;/g, '&') : `/game.php?screen=info_command&id=${commandId || idx}`;

            const tds = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];

            let readyAtMs = 0;
            let timerStr = '';
            let remainingSec = 0;
            let completionStr = '';

            const endtimeMatch = row.match(/data-endtime="(\d+)"/);
            if (endtimeMatch) {
                readyAtMs = parseInt(endtimeMatch[1], 10) * 1000;
            }

            const timerMatch = row.match(/class="[^"]*(?:widget-command-)?timer[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                               row.match(/timer">([^<]+)<\/span>/i);
            if (timerMatch) {
                timerStr = timerMatch[1].trim();
            } else {
                tds.forEach(td => {
                    const clean = td.replace(/<[^>]+>/g, '').trim();
                    const m = clean.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
                    if (m && !timerStr) timerStr = clean;
                });
            }

            if (timerStr) {
                const parts = timerStr.split(':').map(p => parseInt(p, 10));
                if (parts.length === 3) remainingSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
                else if (parts.length === 2) remainingSec = parts[0] * 60 + parts[1];
            }

            // Preservação de milissegundos na hora de chegada
            const cleanRowForTime = row.replace(/<span class="grey small">(\d+)<\/span>/gi, ':$1');
            const timeMatch = cleanRowForTime.match(/(hoje|amanhã|today|tomorrow|[0-9\.\/]+)\s*(?:às|at|\s)\s*(\d{1,2}:\d{2}:\d{2}(?::\d{1,3})?)/i) ||
                              cleanRowForTime.match(/(\d{1,2}\.\d{1,2}\.(?:\d{2,4})?\s+\d{1,2}:\d{2}:\d{2})/i) ||
                              cleanRowForTime.match(/(\d{1,2}:\d{2}:\d{2}:\d{1,3})/i);
            if (timeMatch) {
                completionStr = timeMatch[0];
                const parsedMs = parseTwDateTime(completionStr);
                if (parsedMs) {
                    if (completionStr.includes(':') && completionStr.split(':').length >= 4) {
                        readyAtMs = parsedMs;
                    } else if (!readyAtMs) {
                        readyAtMs = parsedMs;
                    }
                }
            }

            if (!readyAtMs && remainingSec > 0) {
                readyAtMs = Date.now() + remainingSec * 1000;
            }
            if (!readyAtMs) {
                readyAtMs = Date.now() + 60000;
            }

            if (!commandId) {
                const coordM = row.match(/(\d{1,3}\|\d{1,3})/g) || [];
                const cTimeM = row.match(/(\d{1,2}:\d{2}:\d{2}(?::\d{1,3})?)/);
                const timePart = cTimeM ? cTimeM[1] : (completionStr || idx);
                commandId = `${coordM.join('_')}_${timePart}_${idx}`;
            }

            let label = '';
            const labelMatch = row.match(/class="quickedit-label"[^>]*>([\s\S]*?)<\/span>/i) ||
                               row.match(/class="quickedit-content"[^>]*>([\s\S]*?)<\/span>/i) ||
                               row.match(/<a[^>]*screen=info_command[^>]*>([\s\S]*?)<\/a>/i);
            if (labelMatch) {
                label = labelMatch[1].replace(/<[^>]+>/g, '').trim();
            } else if (tds.length > 0) {
                const linkInFirstTd = tds[0].match(/<a[^>]*>([\s\S]*?)<\/a>/i);
                if (linkInFirstTd) label = linkInFirstTd[1].replace(/<[^>]+>/g, '').trim();
                else label = tds[0].replace(/<[^>]+>/g, '').trim();
            }

            if (/atalho\s*teclado/i.test(label) || /atalho\s*teclado/i.test(row)) return;

            // Deteção autoritária do tipo de comando
            const cmdTypeAttr = (row.match(/data-command-type="([^"]+)"/i) || [])[1] || '';
            const iconSrcMatch = row.match(/src="([^"]*(?:command|graphic)[^"]*\.(?:png|webp|gif))"/i) ||
                                 row.match(/src="([^"]*(?:attack|return|support|back|cancel)[^"]*\.(?:png|webp|gif))"/i);
            const iconSrc = iconSrcMatch ? iconSrcMatch[1].toLowerCase() : '';
            const cleanLabel = (label || '').toLowerCase();

            let isReturn = false;
            let isAttack = false;
            let isSupport = false;

            if (cmdTypeAttr === 'attack') {
                isAttack = true;
            } else if (cmdTypeAttr === 'return' || cmdTypeAttr === 'other_back' || cmdTypeAttr === 'cancel') {
                isReturn = true;
            } else if (cmdTypeAttr === 'support') {
                isSupport = true;
            } else {
                const isReturnIcon = /command\/(?:return|back|cancel)|return_\w+\.(?:png|webp)|\/back\.(?:png|webp)|\/cancel\.(?:png|webp)/i.test(iconSrc);
                const isReturnLabel = /^(?:retorno\b|regresso\b|enviado de volta|cancelamento\b)/i.test(cleanLabel);

                const isAttackIcon = /command\/attack|attack_\w+\.(?:png|webp)|\/attack\.(?:png|webp)/i.test(iconSrc);
                const isAttackLabel = /^(?:ataque\b|saque\b)/i.test(cleanLabel);

                const isSupportIcon = /command\/support|\/support\.(?:png|webp)/i.test(iconSrc);
                const isSupportLabel = /^apoio\b/i.test(cleanLabel);

                if (isReturnIcon || isReturnLabel) {
                    isReturn = true;
                } else if (isAttackIcon || isAttackLabel) {
                    isAttack = true;
                } else if (isSupportIcon || isSupportLabel) {
                    isSupport = true;
                } else if (/retorno|regresso/i.test(cleanLabel)) {
                    isReturn = true;
                } else if (/ataque|saque/i.test(cleanLabel)) {
                    isAttack = true;
                } else if (/apoio/i.test(cleanLabel)) {
                    isSupport = true;
                }
            }

            let type = 'other';
            if (isReturn) type = 'return';
            else if (isAttack) type = 'attack';
            else if (isSupport) type = 'support';

            const hasSnob = /snob|nobre|snob\.webp|return_snob\.webp/i.test(row);
            const hasPaladin = /knight|paladino|knight\.webp/i.test(row);
            const hasSpy = /spy|batedor|spy\.webp/i.test(row);
            const isLarge = /attack_large|grande ataque/i.test(row);
            const isMedium = /attack_medium|médio ataque/i.test(row);
            const isSmall = /attack_small|pequeno ataque/i.test(row);

            let originName = pageVName || fallbackVillageName || '';
            let originCoords = pageVCoords || fallbackCoords || '';
            let targetName = '';
            let targetCoords = '';
            let dist = null;

            const isIncomingTable = html.includes('incomings_table') || (row.includes('data-command-type="other"') && tds.length >= 6);
            const isIncomingWidget = (html.includes('commands_incomings') && (row.includes('type=other') || /screen=info_command[^"]*type=other/i.test(row))) || (row.includes('type=other') && !isReturn && !isSupport);
            const isIncoming = isIncomingTable || isIncomingWidget || /screen=info_command[^"]*type=other/i.test(row);
            let attackerPlayerName = '';

            if (isIncoming && isIncomingTable && tds.length >= 5) {
                // Layout incomings_table:
                // tds[0]: Comando / Etiqueta
                // tds[1]: Destino (Tua Aldeia atacada)
                // tds[2]: Origem (Aldeia Atacante)
                // tds[3]: Jogador (Atacante)
                // tds[4]: Distância
                // tds[5]: Chegada
                const destTd = tds[1];
                const origTd = tds[2];
                const playerTd = tds[3];
                const distTd = tds.length >= 6 ? tds[4] : null;

                const dCoordMatch = destTd.match(/(\d{1,3}\|\d{1,3})/);
                if (dCoordMatch) targetCoords = dCoordMatch[1];
                targetName = destTd.replace(/<[^>]+>/g, '').replace(/\(\d{1,3}\|\d{1,3}\).*$/, '').trim();

                const oCoordMatch = origTd.match(/(\d{1,3}\|\d{1,3})/);
                if (oCoordMatch) originCoords = oCoordMatch[1];
                originName = origTd.replace(/<[^>]+>/g, '').replace(/\(\d{1,3}\|\d{1,3}\).*$/, '').trim();

                attackerPlayerName = playerTd ? playerTd.replace(/<[^>]+>/g, '').trim() : '';
                if (distTd) {
                    const parsedDist = parseFloat(distTd.replace(/<[^>]+>/g, '').replace(',', '.').trim());
                    if (!isNaN(parsedDist)) dist = parsedDist;
                }
            } else if (isIncoming) {
                // Layout incomings widget no overview da aldeia (commands_incomings)
                targetCoords = pageVCoords || fallbackCoords || '';
                targetName = pageVName || fallbackVillageName || '';
                originName = '';
                originCoords = '';
                const rowCoords = row.match(/(\d{1,3}\|\d{1,3})/g) || [];
                if (rowCoords.length > 0 && rowCoords[0] !== targetCoords) {
                    originCoords = rowCoords[0];
                }
            } else if (tds.length >= 4) {
                // Layout A: overview_villages commands_table (tds[0]: Dest/Command, tds[1]: Origin)
                const destTd = tds[0];
                const origTd = tds[1];

                const oLink = origTd.match(/<a[^>]*>([\s\S]*?)<\/a>/i);
                if (oLink) originName = oLink[1].replace(/<[^>]+>/g, '').trim();
                else originName = origTd.replace(/<[^>]+>/g, '').trim();

                const dLink = destTd.match(/<a[^>]*screen=info_command[^>]*>([\s\S]*?)<\/a>/i) || destTd.match(/<a[^>]*>([\s\S]*?)<\/a>/i);
                if (dLink) targetName = dLink[1].replace(/<[^>]+>/g, '').trim();
                else targetName = destTd.replace(/<[^>]+>/g, '').trim();

                const oCoordMatch = origTd.match(/(\d{1,3}\|\d{1,3})/);
                if (oCoordMatch) originCoords = oCoordMatch[1];

                const dCoordMatch = destTd.match(/(\d{1,3}\|\d{1,3})/);
                if (dCoordMatch) targetCoords = dCoordMatch[1];

                targetName = targetName.replace(/^(?:Ataque a|Saque a|Apoio a|Retorno de|Regresso de|Enviado de volta por)\s*/i, '').trim();
            } else {
                // Layout B: Village Overview widget (commands_outgoings)
                const rowCoords = row.match(/(\d{1,3}\|\d{1,3})/g) || [];
                originCoords = pageVCoords || fallbackCoords || '';
                originName = pageVName || fallbackVillageName || '';
                targetCoords = rowCoords.length > 0 ? rowCoords[0] : '';
                if (isReturn) {
                    targetName = label.replace(/^(?:Enviado de volta por|Retorno de|Regresso de)\s*/i, '').trim();
                } else {
                    targetName = label.replace(/^(?:Ataque a|Apoio a|Saque a)\s*/i, '').trim();
                }
            }

            if (!originCoords && pageVCoords && !isIncoming) originCoords = pageVCoords;
            if (!targetCoords && !isIncoming) {
                const allCoords = row.match(/(\d{1,3}\|\d{1,3})/g) || [];
                if (allCoords.length > 1) {
                    targetCoords = allCoords[0];
                    if (!originCoords) originCoords = allCoords[1];
                } else if (allCoords.length === 1) {
                    targetCoords = allCoords[0];
                }
            }

            if (isIncoming) {
                if (isSupport) {
                    isAttack = false;
                    isReturn = false;
                    type = 'support';
                } else {
                    isAttack = true;
                    isReturn = false;
                    type = 'attack';
                }
                if (!attackerPlayerName && originCoords) {
                    const owner = getCoordOwnership(originCoords);
                    if (owner && owner.playerName && owner.playerName !== 'Player') {
                        attackerPlayerName = owner.playerName;
                    }
                }
            }

            // Classificação e Propriedade da Aldeia Alvo/Remota
            const targetOwner = isIncoming 
                ? { type: 'own', label: 'Própria', isOwn: true, isPlayer: false, isBarbarian: false, playerName: 'Própria' }
                : getCoordOwnership(targetCoords);
            const targetPlayerName = isIncoming
                ? (attackerPlayerName || (isSupport ? 'Apoiante' : 'Inimigo'))
                : (targetOwner.playerName || (targetOwner.isOwn ? 'Própria' : (targetOwner.isBarbarian ? 'Bárbara' : 'Player')));
            if (!targetName && targetOwner.villageName) targetName = targetOwner.villageName;

            // Classificação rigorosa de Alvo Jogador vs Saque Bárbara
            const isBarbarianTarget = !isIncoming && (targetOwner.isBarbarian ||
                                      /b[áa]rbar[ao]|b[oó]nus|barbarian/i.test(targetName || '') || 
                                      /b[áa]rbar[ao]|b[oó]nus|barbarian/i.test(label || ''));
            const isFarmIconOrLabel = !isIncoming && (/farm\.webp/i.test(row) || /data-icon-hint="[^"]*saque[^"]*"/i.test(row) || /^saque\b/i.test(label || ''));
            const isFarm = !isIncoming && (isFarmIconOrLabel || isBarbarianTarget) && !hasSnob && !hasPaladin && !isLarge;
            const isPlayerTarget = isIncoming || (!isFarm && (!isBarbarianTarget || hasSnob || hasPaladin || isLarge));

            commands.push({
                commandId,
                commandLink,
                label,
                type,
                isIncoming,
                attackerPlayerName,
                isReturn,
                isAttack,
                isSupport,
                hasSnob,
                hasPaladin,
                hasSpy,
                isFarm,
                isPlayerTarget,
                isLarge,
                isMedium,
                isSmall,
                originName,
                originCoords,
                targetName,
                targetCoords,
                targetOwner,
                targetPlayerName,
                timerStr,
                remainingSec,
                completionStr: completionStr || (readyAtMs ? new Date(readyAtMs).toLocaleTimeString('pt-PT') : ''),
                readyAtMs
            });
        });

        return commands;
    }

    function parseInfoCommandHtml(html) {
        if (!html) return {};
        let attackerPlayerName = '';
        let originCoords = '';
        let originName = '';
        let targetCoords = '';
        let targetName = '';

        const originRowM = html.match(/Origem:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i);
        if (originRowM) {
            const txt = originRowM[1].replace(/<[^>]+>/g, '').trim();
            const cm = txt.match(/(\d{1,3}\|\d{1,3})/);
            if (cm) originCoords = cm[1];
            originName = txt.replace(/\(\d{1,3}\|\d{1,3}\).*$/, '').trim();
        }

        const destRowM = html.match(/Destino:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i);
        if (destRowM) {
            const txt = destRowM[1].replace(/<[^>]+>/g, '').trim();
            const cm = txt.match(/(\d{1,3}\|\d{1,3})/);
            if (cm) targetCoords = cm[1];
            targetName = txt.replace(/\(\d{1,3}\|\d{1,3}\).*$/, '').trim();
        }

        const playerRowM = html.match(/Jogador:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i);
        if (playerRowM) {
            attackerPlayerName = playerRowM[1].replace(/<[^>]+>/g, '').trim();
        }

        if (!attackerPlayerName) {
            const pMatches = Array.from(html.matchAll(/screen=info_player[^>]*>([^<]+)<\/a>/gi));
            if (pMatches.length > 0) attackerPlayerName = pMatches[0][1].trim();
        }
        if (!originCoords) {
            const vMatches = Array.from(html.matchAll(/screen=info_village[^>]*>([\s\S]*?)<\/a>/gi));
            if (vMatches.length > 0) {
                const oText = vMatches[0][1].replace(/<[^>]+>/g, '').trim();
                const oM = oText.match(/(\d{1,3}\|\d{1,3})/);
                if (oM) originCoords = oM[1];
                if (!originName) originName = oText.replace(/\(\d{1,3}\|\d{1,3}\).*$/, '').trim();
            }
            if (vMatches.length > 1 && !targetCoords) {
                const dText = vMatches[1][1].replace(/<[^>]+>/g, '').trim();
                const dM = dText.match(/(\d{1,3}\|\d{1,3})/);
                if (dM) targetCoords = dM[1];
                if (!targetName) targetName = dText.replace(/\(\d{1,3}\|\d{1,3}\).*$/, '').trim();
            }
        }

        return { attackerPlayerName, originCoords, originName, targetCoords, targetName };
    }

    function enrichCommandDetails(c) {
        if (!c) return;
        if (c.isIncoming) {
            if (c.targetCoords && !c.targetName) {
                const foundV = (typeof allVillages !== 'undefined' && Array.isArray(allVillages)) ? allVillages.find(v => v.coords === c.targetCoords) : null;
                if (foundV) c.targetName = foundV.name;
            }
            c.targetOwner = { type: 'own', label: 'Própria', isOwn: true, isPlayer: false, isBarbarian: false, playerName: 'Própria' };
            if (!c.targetName && c.targetOwner.villageName) c.targetName = c.targetOwner.villageName;

            if (c.originCoords) {
                const origOwner = typeof getCoordOwnership === 'function' ? getCoordOwnership(c.originCoords) : null;
                if (origOwner) {
                    if (!c.originName && origOwner.villageName) c.originName = origOwner.villageName;
                    if ((!c.attackerPlayerName || c.attackerPlayerName === 'Player') && origOwner.playerName && origOwner.playerName !== 'Player') {
                        c.attackerPlayerName = origOwner.playerName;
                    }
                }
            }
            c.targetPlayerName = c.attackerPlayerName || (c.isSupport ? 'Apoiante' : 'Inimigo');
            c.isPlayerTarget = true;
        } else {
            if (c.originCoords && !c.originName) {
                const foundV = (typeof allVillages !== 'undefined' && Array.isArray(allVillages)) ? allVillages.find(v => v.coords === c.originCoords) : null;
                if (foundV) c.originName = foundV.name;
            }
            if (c.targetCoords && !c.targetName) {
                const foundV = (typeof allVillages !== 'undefined' && Array.isArray(allVillages)) ? allVillages.find(v => v.coords === c.targetCoords) : null;
                if (foundV) c.targetName = foundV.name;
            }
            c.targetOwner = typeof getCoordOwnership === 'function' ? getCoordOwnership(c.targetCoords) : { type: 'unknown', label: 'Desconhecida' };
            c.targetPlayerName = c.targetOwner.playerName || (c.targetOwner.isOwn ? 'Própria' : (c.targetOwner.isBarbarian ? 'Bárbara' : 'Player'));
            if (!c.targetName && c.targetOwner.villageName) c.targetName = c.targetOwner.villageName;
        }

        if (c.originCoords && c.targetCoords && typeof calcDistance === 'function') {
            c.dist = calcDistance(c.originCoords, c.targetCoords).toFixed(1);
        }
    }

    async function enrichIncompleteIncomings(commandsList, safeFetch) {
        if (!Array.isArray(commandsList) || commandsList.length === 0 || typeof safeFetch !== 'function') return;
        const incomplete = commandsList.filter(c => c.isIncoming && (!c.attackerPlayerName || !c.originCoords || c.attackerPlayerName === 'Player') && c.commandId);
        if (incomplete.length === 0) return;

        await Promise.all(incomplete.slice(0, 10).map(async c => {
            try {
                const url = `/game.php?screen=info_command&id=${c.commandId}&type=other`;
                const cHtml = await safeFetch(url);
                if (cHtml) {
                    const det = parseInfoCommandHtml(cHtml);
                    if (det.attackerPlayerName) c.attackerPlayerName = det.attackerPlayerName;
                    if (det.originCoords) c.originCoords = det.originCoords;
                    if (det.originName) c.originName = det.originName;
                    if (det.targetCoords && !c.targetCoords) c.targetCoords = det.targetCoords;
                    if (det.targetName && !c.targetName) c.targetName = det.targetName;
                }
            } catch (_) {}
        }));
    }

    function calculateEarliestViableNobleTime(village, neededNobles) {
        if (!village) return { readyAtMs: Date.now(), isFullyReadyNow: true, hasShortage: false, summary: 'Nenhuma aldeia selecionada' };
        const readyNow = village.snobsHome || 0;
        const events = (village.noblePendingEvents || []).slice().sort((a, b) => a.readyAtMs - b.readyAtMs);
        const inProdCount = events.filter(e => e.type === 'production').length;
        const inReturnCount = Math.min(events.filter(e => e.type === 'return').length, (village.snobsOutside || 0));
        const availableEvents = readyNow + inProdCount + inReturnCount;

        if (readyNow >= neededNobles) {
            return {
                readyAtMs: Date.now(),
                neededNobles,
                readyNow,
                availableTotal: readyNow,
                isFullyReadyNow: true,
                hasShortage: false,
                summary: `${readyNow} Nobre(s) prontos na aldeia`
            };
        }

        const missing = neededNobles - readyNow;

        if (events.length >= missing) {
            const targetEvent = events[missing - 1];
            const timeLabel = targetEvent.completionStr || (targetEvent.timerStr ? `em ${targetEvent.timerStr}` : new Date(targetEvent.readyAtMs).toLocaleTimeString('pt-PT'));
            const returnNote = targetEvent.isAttackReturn ? ' (após ataque)' : '';
            return {
                readyAtMs: targetEvent.readyAtMs,
                neededNobles,
                readyNow,
                availableTotal: availableEvents,
                isFullyReadyNow: false,
                hasShortage: false,
                waitingForCount: missing,
                targetEvent,
                inProdCount,
                inReturnCount,
                summary: `${readyNow} na aldeia, ${inProdCount > 0 ? inProdCount + ' em treino' : ''}${inProdCount > 0 && inReturnCount > 0 ? ', ' : ''}${inReturnCount > 0 ? inReturnCount + ' a caminho' : ''} (${neededNobles}º nobre disponível às ${timeLabel}${returnNote})`
            };
        }

        // Se o total de nobres conhecidos da aldeia (em casa + em treino + fora) cobre o necessário:
        const potentialTotal = readyNow + inProdCount + Math.max(inReturnCount, village.snobsOutside || 0);
        if (potentialTotal >= neededNobles) {
            // Os nobres existem na conta! Estão fora/em trânsito ou a chegar
            const lastMs = events.length > 0 ? events[events.length - 1].readyAtMs : Date.now();
            const timeLabel = events.length > 0 ? (events[events.length - 1].completionStr || new Date(lastMs).toLocaleTimeString('pt-PT')) : 'agora/breve';
            return {
                readyAtMs: lastMs,
                neededNobles,
                readyNow,
                availableTotal: potentialTotal,
                isFullyReadyNow: false,
                hasShortage: false, // NÃO bloquear! A aldeia tem os nobres!
                waitingForCount: missing,
                inProdCount,
                inReturnCount: Math.max(inReturnCount, (village.snobsOutside || 0)),
                summary: `${readyNow} na aldeia, ${inProdCount > 0 ? inProdCount + ' em treino, ' : ''}${village.snobsOutside || 0} fora (disponíveis às ${timeLabel})`
            };
        }

        // Falta real de nobres mesmo considerando todos os eventos em treino, viagem e fora
        const lastMs = events.length > 0 ? events[events.length - 1].readyAtMs : Date.now();
        const missingTotal = neededNobles - potentialTotal;
        return {
            readyAtMs: lastMs,
            neededNobles,
            readyNow,
            availableTotal: potentialTotal,
            isFullyReadyNow: false,
            hasShortage: true,
            waitingForCount: missing,
            missingTotal,
            inProdCount,
            inReturnCount: Math.max(inReturnCount, village.snobsOutside || 0),
            summary: `Apenas ${potentialTotal}/${neededNobles} nobres possíveis (${readyNow} em casa, ${inProdCount} em treino, ${Math.max(inReturnCount, village.snobsOutside || 0)} fora). Faltam ${missingTotal} nobres!`
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
        let nobleReadiness1 = null;

        const attackMode = document.getElementById('tw-nt-attack-mode') ? document.getElementById('tw-nt-attack-mode').value : 'standard_anti';
        const architecture = document.getElementById('tw-nt-architecture') ? document.getElementById('tw-nt-architecture').value : '';
        const bvAnchor = document.getElementById('tw-nt-bv-anchor') ? document.getElementById('tw-nt-bv-anchor').value : 'first';

        // 1. Aldeia de Nobres Principal
        if (nobleV && neededNobles > 0) {
            const dist = calcDistance(nobleV.coords, target);
            let travelSec = dist * unitSpeedMinutes.snob * 60;
            if (attackMode === 'snob_solo' && bvAnchor === 'final') {
                const numTrips = Math.max(1, neededNobles);
                // Buffer seguro de 75s (mínimo 60s) para garantir o ciclo completo sem falhas
                const bvBufferSec = Math.max(60, parseInt(document.getElementById('tw-nt-bv-buffer') ? document.getElementById('tw-nt-bv-buffer').value : getPref('tw_nt_bv_buffer', '75'), 10) || 75);
                travelSec = travelSec + (numTrips - 1) * (2 * travelSec + bvBufferSec);
            }

            const needed1 = (architecture === 'split_2x2' && attackMode === 'split_2x2') ? 2 : (attackMode === 'snob_solo' ? 1 : neededNobles);
            const readiness = calculateEarliestViableNobleTime(nobleV, needed1);
            nobleReadiness1 = readiness;
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
            reasons,
            readiness: nobleReadiness1
        };
    }

    function getBaseCommandId(id) {
        if (!id) return '';
        return String(id).replace(/_(?:ret_est|atk|ret|attack_ret|dup).*$/, '').trim();
    }

    function deduplicateNobleReturnsList(returnsList) {
        if (!Array.isArray(returnsList)) return [];
        // 1. Priorizar comandos com ID numérico real do jogo
        const realCmds = [];
        const seenRealIds = new Set();
        returnsList.forEach(r => {
            if (!r) return;
            const baseId = getBaseCommandId(r.commandId);
            if (/^\d{5,}$/.test(baseId)) {
                if (!seenRealIds.has(baseId)) {
                    seenRealIds.add(baseId);
                    realCmds.push(r);
                }
            }
        });

        // 2. Comandos sintéticos (sem ID real): apenas aceitar se não duplicarem comandos reais do mesmo lote
        const finalReturns = [...realCmds];
        returnsList.forEach(r => {
            if (!r) return;
            const baseId = getBaseCommandId(r.commandId);
            if (/^\d{5,}$/.test(baseId)) return; // já processado nos reais

            const realBatchCount = realCmds.filter(ex => 
                ex.coords === r.coords && 
                ex.remoteCoords === r.remoteCoords && 
                Math.abs(ex.readyAtMs - r.readyAtMs) < 4000
            ).length;

            if (realBatchCount > 0) {
                // Já temos os comandos reais com precisão para este lote
                return;
            }

            const synKey = `${r.coords}_${r.remoteCoords}_${Math.round((r.readyAtMs || 0) / 4000)}`;
            const existsSyn = finalReturns.some(ex => `${ex.coords}_${ex.remoteCoords}_${Math.round((ex.readyAtMs || 0) / 4000)}` === synKey);
            if (!existsSyn) {
                finalReturns.push(r);
            }
        });

        finalReturns.sort((a, b) => a.readyAtMs - b.readyAtMs);
        return finalReturns;
    }

    function syncNobleEventsAcrossVillages() {
        if (!Array.isArray(allVillages) || allVillages.length === 0) return;
        const now = Date.now();
        const currentVId = (typeof game_data !== 'undefined' && game_data.village) ? game_data.village.id : null;
        const currentVCoords = (typeof game_data !== 'undefined' && game_data.village) ? game_data.village.coord : '';
        const snobSpeedMin = (typeof unitSpeedMinutes !== 'undefined' && unitSpeedMinutes.snob) ? unitSpeedMinutes.snob : 35;

        // Recolher comandos de retorno e ataques de ida a partir de allParsedCommands
        allParsedCommands.forEach(c => {
            if (c.hasSnob) {
                if (c.isReturn) {
                    const vTarget = allVillages.find(v => v.coords === c.originCoords);
                    const retObj = {
                        commandId: c.commandId,
                        villageId: vTarget ? vTarget.id : ((c.originCoords && currentVCoords && c.originCoords !== currentVCoords) ? null : currentVId),
                        coords: c.originCoords || currentVCoords,
                        remoteCoords: c.targetCoords,
                        type: 'return',
                        isReturn: true,
                        isAttackReturn: false,
                        timerStr: c.timerStr,
                        remainingSec: c.remainingSec,
                        completionStr: c.completionStr,
                        readyAtMs: c.readyAtMs,
                        note: 'Regresso a casa'
                    };
                    allNobleReturns.push(retObj);
                } else if (c.isAttack || c.type === 'attack') {
                    // Nobre em ataque de ida: estimar regresso home = impacto + tempo de viagem
                    const vOrigin = allVillages.find(v => v.coords === c.originCoords);
                    let travelSec = 0;
                    if (c.originCoords && c.targetCoords && typeof calcDistance === 'function') {
                        const dist = calcDistance(c.originCoords, c.targetCoords);
                        travelSec = Math.round(dist * snobSpeedMin * 60);
                    } else if (c.remainingSec) {
                        travelSec = c.remainingSec;
                    }
                    const hitAtMs = c.readyAtMs || (now + (c.remainingSec || 0) * 1000);
                    const returnHomeMs = hitAtMs + (travelSec * 1000);
                    const remSec = Math.max(0, Math.floor((returnHomeMs - now) / 1000));
                    const dRet = new Date(returnHomeMs);
                    const dNow = new Date();
                    const dayTag = (dRet.getDate() !== dNow.getDate()) ? ' (+1d)' : '';
                    const timeTag = `${String(dRet.getHours()).padStart(2, '0')}:${String(dRet.getMinutes()).padStart(2, '0')}:${String(dRet.getSeconds()).padStart(2, '0')}${dayTag}`;

                    const retObj = {
                        commandId: c.commandId, // Manter ID original do jogo para deduplicação perfeita!
                        villageId: vOrigin ? vOrigin.id : null,
                        coords: c.originCoords || currentVCoords,
                        remoteCoords: c.targetCoords,
                        type: 'return',
                        isReturn: true,
                        isAttackReturn: true,
                        impactAtMs: hitAtMs,
                        timerStr: formatDuration(remSec),
                        remainingSec: remSec,
                        completionStr: timeTag,
                        readyAtMs: returnHomeMs,
                        note: `Regresso de Ataque a ${c.targetCoords || 'alvo'} (impacto às ${c.completionStr || new Date(hitAtMs).toLocaleTimeString('pt-PT')})`
                    };
                    allNobleReturns.push(retObj);
                }
            }
        });

        // 1. Filtrar expirados e deduplicar rigorosamente toda a lista global de retornos
        const validReturns = deduplicateNobleReturnsList(allNobleReturns.filter(e => !e.readyAtMs || e.readyAtMs > (now - 1000)));
        allNobleReturns.length = 0;
        allNobleReturns.push(...validReturns);

        // 2. Filtrar produções na academia
        const validProds = allSnobProductions.filter(e => !e.readyAtMs || e.readyAtMs > (now - 1000));
        const allPending = [...validProds, ...validReturns];

        // 3. Atualizar cada aldeia respeitando estritamente o teto de nobres fora
        allVillages.forEach(v => {
            const vEvents = allPending.filter(e => {
                if (e.coords && v.coords) return e.coords === v.coords;
                if (!e.coords && e.villageId && v.id) return String(e.villageId) === String(v.id);
                return false;
            });

            // Produções na academia da aldeia
            const vProds = [];
            const seenProdTimes = new Set();
            vEvents.filter(e => e.type === 'production').forEach(p => {
                const timeKey = Math.round((p.readyAtMs || 0) / 30000);
                if (!seenProdTimes.has(timeKey)) {
                    seenProdTimes.add(timeKey);
                    vProds.push(p);
                }
            });

            // Retornos da aldeia (deduplicados e limitados a snobsOutside)
            const vRawReturns = vEvents.filter(e => e.type === 'return');
            const vCleanReturns = deduplicateNobleReturnsList(vRawReturns);
            vCleanReturns.sort((a, b) => a.readyAtMs - b.readyAtMs);

            // TETO FÍSICO: Uma aldeia nunca pode ter mais nobres a caminho do que o número de nobres fora!
            const maxOutside = (typeof v.snobsOutside === 'number' && v.snobsOutside >= 0) ? v.snobsOutside : Infinity;
            const cappedReturns = (maxOutside < Infinity) ? vCleanReturns.slice(0, maxOutside) : vCleanReturns;

            v.snobsInProd = vProds.length;
            v.snobsReturning = cappedReturns.length;
            v.noblePendingEvents = [...vProds, ...cappedReturns].sort((a, b) => a.readyAtMs - b.readyAtMs);
            v.hasSnobsAway = (v.snobsOutside > 0) || (v.snobsInProd > 0) || (v.snobsReturning > 0);
        });
    }

    async function syncVillageLiveTroopsAndCommands(v) {
        if (!v || !v.id) return;
        try {
            const ts = Date.now();
            const overviewUrl = `/game.php?village=${v.id}&screen=overview&_tw_ts=${ts}`;
            const snobUrl = `/game.php?village=${v.id}&screen=snob&_tw_ts=${ts}`;

            const [ovHtml, snobHtml] = await Promise.all([
                fetch(overviewUrl, { cache: 'no-store' }).then(r => r.ok ? r.text() : '').catch(() => ''),
                fetch(snobUrl, { cache: 'no-store' }).then(r => r.ok ? r.text() : '').catch(() => '')
            ]);

            // 1. Extrair tropas em casa e fora a partir do overview da aldeia
            if (ovHtml) {
                let snobsHome = 0;
                let snobsMoving = 0;
                let snobsTotalFound = 0;
                let foundTable = false;

                // Processar cada <tr> individualmente para não misturar classes entre linhas diferentes
                const trBlocks = ovHtml.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) || [];
                for (const tr of trBlocks) {
                    const isHome = /class="[^"]*\bhome_unit\b[^"]*"/i.test(tr);
                    const isMoving = /class="[^"]*\bmoving_unit\b[^"]*"/i.test(tr);
                    const isAll = /class="[^"]*\ball_unit\b[^"]*"/i.test(tr);
                    if (isHome || isMoving || isAll) foundTable = true;

                    const isSnob = /data-unit="snob"/i.test(tr) || /unit_snob/i.test(tr) || />\s*Nobres?\s*</i.test(tr);
                    if (isSnob) {
                        const countMatch = tr.match(/<strong[^>]*data-count="snob"[^>]*>(\d+)<\/strong>/i) ||
                                           tr.match(/<strong[^>]*>(\d+)<\/strong>/i) ||
                                           tr.match(/<td[^>]*>(\d+)<\/td>/i);
                        const count = countMatch ? parseInt(countMatch[1], 10) : 0;
                        if (isHome) snobsHome += count;
                        else if (isMoving) snobsMoving += count;
                        else if (isAll) snobsTotalFound = Math.max(snobsTotalFound, count);
                    }
                }

                if (foundTable) {
                    v.snobsHome = snobsHome;
                    const activeSnobCmds = allParsedCommands.filter(c => c.originCoords === v.coords && c.hasSnob && (!c.readyAtMs || c.readyAtMs > (ts - 2000))).length;
                    v.snobsOutside = Math.max(snobsMoving, activeSnobCmds);
                    v.snobsTotal = Math.max(snobsTotalFound, (v.snobsHome || 0) + (v.snobsOutside || 0));
                    v.snobsAvailable = v.snobsHome;
                } else {
                    const activeSnobCmds = allParsedCommands.filter(c => c.originCoords === v.coords && c.hasSnob && (!c.readyAtMs || c.readyAtMs > (ts - 2000))).length;
                    if (activeSnobCmds > 0) {
                        v.snobsOutside = Math.max(v.snobsOutside || 0, activeSnobCmds);
                        v.snobsHome = Math.max(0, (v.snobsTotal || 0) - v.snobsOutside);
                        v.snobsAvailable = v.snobsHome;
                    }
                }
            }

            // 2. Extrair produções na academia
            if (snobHtml) {
                const newProds = parseAcademyProduction(snobHtml, v.id);
                newProds.forEach(p => {
                    if (!allSnobProductions.some(existing => existing.villageId === p.villageId && Math.abs(existing.readyAtMs - p.readyAtMs) < 30000)) {
                        allSnobProductions.push(p);
                    }
                });
            }

            // 3. Extrair comandos de retorno no overview
            if (ovHtml) {
                const newReturns = parseCommandsNobleReturns(ovHtml, v.id, v.coords);
                newReturns.forEach(ret => {
                    allNobleReturns.push(ret);
                });
            }

            // 4. Sincronizar eventos por todas as aldeias e atualizar HUD
            syncNobleEventsAcrossVillages();
            updateNobleProximityHUD(v.id, false);
        } catch (e) {
            console.warn('[TW Tactical] Erro ao sincronizar aldeia em tempo real:', e);
        }
    }

    async function applyMinimumViableLandTime(forceSync = false) {
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

        const selNoble = document.getElementById('tw-nt-noble-village');
        const nobleV = selNoble && villagesById[selNoble.value] ? villagesById[selNoble.value] : null;
        const rawNobleCount = document.getElementById('tw-nt-noble-count') ? document.getElementById('tw-nt-noble-count').value : '4';
        const neededNobles = parseInt(rawNobleCount, 10) || 4;

        if (nobleV && (forceSync || nobleV.snobsHome < neededNobles)) {
            await syncVillageLiveTroopsAndCommands(nobleV);
        }

        const calc = calculateEarliestViableLandTime();
        if (!calc) return null;

        const d = calc.earliestLandDate;
        const yr = d.getFullYear();
        const mo = String(d.getMonth() + 1).padStart(2, '0');
        const da = String(d.getDate()).padStart(2, '0');
        const ho = String(d.getHours()).padStart(2, '0');
        const mi = String(d.getMinutes()).padStart(2, '0');
        const se = String(d.getSeconds()).padStart(2, '0');
        const recLandStr = `${ho}:${mi}:${se} (${da}/${mo})`;

        if (calc.hasShortage) {
            const shortMsg = calc.shortageReasons.length > 0 ? calc.shortageReasons.join('\n') : 'Não há nobres suficientes disponíveis nesta aldeia!';
            const confirmMsg = `⚠️ ALERTA: NOBRES INSUFICIENTES!\n\n${shortMsg}\n\n⚡ Horário Mínimo Viável Estimado: ${recLandStr}\n\nDesejas preencher a data de chegada para ${recLandStr} mesmo assim?`;
            if (!confirm(confirmMsg)) {
                return null;
            }
        }

        const landInput = (plannerMode === 'single') ? document.getElementById('tw-nt-landtime') : document.getElementById('tw-nt-landtime-multi');
        if (landInput) {
            landInput.value = `${yr}-${mo}-${da}T${ho}:${mi}:${se}`;
        }

        const reasonTxt = calc.reasons.length > 0 ? ` (${calc.reasons.join('; ')})` : '';
        showToast(`⚡ Horário Mínimo ajustado: ${recLandStr}${reasonTxt}`);
        return calc;
    }

    async function loadData() {
        const worldDataPromise = fetchWorldData();
        try {
            const baseUrl = (typeof game_data !== 'undefined' && game_data.link_base_pure) ? game_data.link_base_pure : '/game.php?screen=';
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

            const safeFetch = async (url, options = {}, retries = 2) => {
                if (!url) return '';
                const sep = url.includes('?') ? '&' : '?';
                const cacheBustUrl = url.includes('_tw_ts=') ? url : `${url}${sep}_tw_ts=${Date.now()}`;
                const fetchOpts = Object.assign({ cache: 'no-store' }, options);
                for (let i = 0; i < retries; i++) {
                    try {
                        const r = await fetch(cacheBustUrl, fetchOpts);
                        if (r.ok) {
                            const text = await r.text();
                            if (text && text.length > 50) return text;
                        }
                    } catch (_) {}
                    if (i < retries - 1) await new Promise(res => setTimeout(res, 250));
                }
                return '';
            };

            const makeUrl = (param) => {
                if (baseUrl.includes('screen=')) return baseUrl + param;
                return baseUrl + (baseUrl.includes('?') ? '&screen=' : '?screen=') + param;
            };

            const [rU, rP, rS, rSnobDirect, rSnobPopup, rSnobTrain, rVillageOverview] = await Promise.all([
                safeFetch(makeUrl('overview_villages&mode=units&type=complete&group=0&page=-1')).then(async (res) => {
                    if (res && res.includes('units_table')) return res;
                    return await safeFetch(makeUrl('overview_villages&mode=units&group=0')) ||
                           await safeFetch(makeUrl('overview_villages&mode=units&type=complete')) ||
                           await safeFetch(makeUrl('overview_villages&mode=units'));
                }),
                safeFetch(makeUrl('overview_villages&mode=prod&group=0&page=-1')),
                safeFetch(statueUrl),
                safeFetch(snobScreenUrl),
                safeFetch(snobPopupUrl, { headers: { 'X-Requested-With': 'XMLHttpRequest' } }),
                safeFetch(snobTrainUrl),
                villageOverviewUrl ? safeFetch(villageOverviewUrl) : Promise.resolve('')
            ]);
            await worldDataPromise;

            // 1. Processar dados de Paladinos
            allAccountPaladins = parseKnightsFromHtml(rS);
            const paladinByVillage = {};
            allAccountPaladins.forEach(p => {
                if (p.homeVillageId) {
                    paladinByVillage[p.homeVillageId] = p;
                }
            });

            // 2. Processar Fazenda e Pontos de Produção
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

            // 3. Processar Tabela Militar (units_table) e Construir allVillages de Forma Completa
            let uTable = dU ? dU.querySelector('#units_table') : null;
            if (!uTable && typeof document !== 'undefined') {
                uTable = document.querySelector('#units_table');
            }
            if (!uTable) {
                const rescue = await safeFetch(makeUrl('overview_villages&mode=units&type=complete&group=0'), {}, 2) ||
                               await safeFetch(makeUrl('overview_villages&mode=units'), {}, 2);
                if (rescue) {
                    const dR = parser.parseFromString(rescue, 'text/html');
                    uTable = dR.querySelector('#units_table');
                }
            }

            const summary = { totalPop: 0, units: {}, categories: {}, offCount: 0, defCount: 0, snobCount: 0, fullTrain22kCount: 0, semiTrainCount: 0, fullNuke22kCount: 0, fullBunk22kCount: 0 };
            Object.keys(outputCategories).forEach(cat => summary.categories[cat] = { count: 0, coords: [], villageIds: [] });

            if (uTable) {
                const headers = Array.from(uTable.querySelectorAll('thead th')).filter(th => th.querySelector('img[src*="unit_"]'));
                unitConfigs = headers.map(th => {
                    const img = th.querySelector('img');
                    return { name: (img.src.match(/unit_([a-z0-9_]+)/i)||[])[1]||'', src: img.src, isHidden: th.classList.contains('hidden') || img.src.includes('militia') };
                });
                unitConfigs.forEach(u => { if(u.name) summary.units[u.name] = { count: 0, pop: 0, src: u.src }; });

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
                    const isDef = (vTot.defense > vTot.offense) || (vTot.defense > 0 && vTot.defense === vTot.offense);
                    const isOff = (vTot.offense > vTot.defense);

                    if (vTot.offense > vTot.defense && vTot.offense >= 4000) {
                        rowClass = 'tw-row-off';
                        summary.offCount++;
                    } else if (vTot.defense > vTot.offense && vTot.defense >= 4000) {
                        rowClass = 'tw-row-def';
                        summary.defCount++;
                    }

                    const farmInfo = farmMap[vId] || { txt:'N/A', used: 0, max: 24000, perc: 0, color:'#8b949e', lvl:'?' };

                    let outsidePop = Math.max(0, totalPopTotal - homePopTotal);
                    if (outsidePop === 0 && (movingPopTotal > 0 || awayPopTotal > 0)) {
                        outsidePop = movingPopTotal + awayPopTotal;
                    }
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

                    const vObj = {
                        id: vId, name: vName, coords, points: vPoints, troops: vTroops, troopsDict: dict, homeTroopsDict: homeDict,
                        movingTroopsDict: movingDict, awayTroopsDict: awayDict,
                        knightAvailable, rowClass, isDef, isOff, roleTag,
                        farm: farmInfo,
                        snobsAvailable: snobsHome,
                        snobsHome: snobsHome,
                        snobsTotal: snobsTotal,
                        snobsOutside: snobsOutside,
                        snobsInProd: 0,
                        snobsReturning: 0,
                        noblePendingEvents: [],
                        hasSnobsAway: snobsOutside > 0,
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
            } else {
                console.warn('[TW Tactical] uTable não disponível. Módulo militar e comandos continuam operacionais.');
                showToast('⚠️ Aviso: Visão geral de tropas indisponível (requer CP). Comandos carregados!', 4000);
                if (currentVId && currentVCoords) {
                    const vObj = {
                        id: currentVId, name: currentVName || 'Aldeia Atual', coords: currentVCoords, points: 0, troops: [], troopsDict: {}, homeTroopsDict: {},
                        movingTroopsDict: {}, awayTroopsDict: {},
                        knightAvailable: 0, rowClass: 'tw-row-other', roleTag: { label: 'Atual', css: 'tw-tag-growth' },
                        farm: { txt:'N/A', used: 0, max: 24000, perc: 0, color:'#8b949e', lvl:'?' },
                        snobsAvailable: 0, snobsHome: 0, snobsTotal: 0, snobsOutside: 0, snobsInProd: 0, snobsReturning: 0,
                        noblePendingEvents: [], hasSnobsAway: false, totalOffPop: 0, totalDefPop: 0, homeOffPop: 0, paladin: null,
                        homePopTotal: 0, totalPopTotal: 0, movingPopTotal: 0, awayPopTotal: 0, hasTroopsAway: false, isFarming: false,
                        troopsAwayPop: 0, troopsAwayPerc: 0
                    };
                    allVillages.push(vObj);
                    villagesById[currentVId] = vObj;
                }
            }

            // 4. Identificar Aldeias de Guerra com Precisão Absoluta para Caça de Comandos
            const activeWarVillages = allVillages.filter(v => {
                const snobActive = (v.snobsTotal > 0) || (v.movingTroopsDict && v.movingTroopsDict.snob > 0) || (v.awayTroopsDict && v.awayTroopsDict.snob > 0);
                const offMoving = (v.movingTroopsDict && ((v.movingTroopsDict.ram || 0) > 0 || (v.movingTroopsDict.catapult || 0) > 0 || (v.movingTroopsDict.axe || 0) >= 200 || (v.movingTroopsDict.light || 0) >= 100));
                const isWarRole = v.rowClass === 'tw-row-off' || (v.roleTag && v.roleTag.label && (v.roleTag.label.includes('Train') || v.roleTag.label.includes('Nuke') || v.roleTag.label.includes('Nobre')));
                return snobActive || offMoving || (isWarRole && v.hasTroopsAway);
            });

            // Grupos de Guerra nativos detetados no HTML
            const warGroupIds = [];
            const groupRegex = /group=(\d+)[^>]*>([^<]+)<\/a>/gi;
            let gM;
            const searchHtml = (rU || '') + ' ' + (typeof document !== 'undefined' ? (document.body?.innerHTML || '') : '');
            while ((gM = groupRegex.exec(searchHtml)) !== null) {
                const gId = gM[1];
                const gName = gM[2].toLowerCase();
                if (/war|ataque|nuke|snob|nobre|op\b|front/i.test(gName)) {
                    if (!warGroupIds.includes(gId) && gId !== '0') warGroupIds.push(gId);
                }
            }

            // 5. Recolha de Comandos da Conta (Overview Global + Grupos de Guerra + Overview de Aldeias de Guerra)
            const rCmdResponses = await fetchAllAccountCommandsHtml(makeUrl, safeFetch, activeWarVillages, warGroupIds);

            // 6. Deteção de Nobres em Treino na Academia (DOM da página atual + página snob direta + popup + train)
            allSnobProductions.length = 0;
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
            if (currentVId && !allSnobProductions.some(p => String(p.villageId) === String(currentVId))) {
                addSnobProds(parseAcademyProduction(currentDocHtml, currentVId));
            }

            // 7. Deteção de Nobres em Viagem / Comandos de Retorno
            allNobleReturns.length = 0;
            const addNobleReturns = (list) => {
                list.forEach(ret => {
                    const isDup = allNobleReturns.some(e => {
                        if (e.commandId && ret.commandId) {
                            return String(e.commandId) === String(ret.commandId);
                        }
                        const matchV = (e.coords && ret.coords) ? (e.coords === ret.coords) : (e.villageId && ret.villageId && String(e.villageId) === String(ret.villageId));
                        return matchV && Math.abs(e.readyAtMs - ret.readyAtMs) < 2000 && e.remoteCoords === ret.remoteCoords;
                    });
                    if (!isDup) {
                        allNobleReturns.push(ret);
                    }
                });
            };

            addNobleReturns(parseCommandsNobleReturns(currentDocHtml, currentVId, currentVCoords));
            if (rVillageOverview) {
                addNobleReturns(parseCommandsNobleReturns(rVillageOverview, currentVId, currentVCoords));
            }
            rCmdResponses.forEach(r => {
                if (!r) return;
                const rawHtml = typeof r === 'string' ? r : (r.html || '');
                const vId = r.villageId || currentVId;
                const vCoords = r.coords || currentVCoords;
                addNobleReturns(parseCommandsNobleReturns(rawHtml, vId, vCoords));
            });

            // 8. Extração completa de Comandos & Retornos
            const cmdMap = new Map();
            const addAllCmds = (list) => {
                const now = getTwServerTimeMs();
                list.forEach(c => {
                    if (!c) return;
                    // Exclusão de micro-saques a bárbaras para velocidade máxima (Modo Turbo)
                    if (commandsIgnoreFarms && c.isFarm) return;
                    // Ignorar comandos que já chegaram / expiraram
                    if (c.readyAtMs && c.readyAtMs <= (now - 2000)) return;
                    const k = c.commandId ? String(c.commandId) : `${c.originCoords}_${c.targetCoords}_${c.readyAtMs}_${c.completionStr || ''}_${c.type}`;
                    if (!cmdMap.has(k)) {
                        cmdMap.set(k, c);
                    } else {
                        const ex = cmdMap.get(k);
                        if (!ex.originName && c.originName) ex.originName = c.originName;
                        if (!ex.targetName && c.targetName) ex.targetName = c.targetName;
                        if (!ex.hasSnob && c.hasSnob) ex.hasSnob = true;
                        if (!ex.hasPaladin && c.hasPaladin) ex.hasPaladin = true;
                    }
                });
            };

            const currentVName = (typeof game_data !== 'undefined' && game_data.village && game_data.village.name) ? game_data.village.name : '';
            rCmdResponses.forEach(r => {
                if (!r) return;
                const rawHtml = typeof r === 'string' ? r : (r.html || '');
                const vId = r.villageId || currentVId;
                const vCoords = r.coords || currentVCoords;
                const vName = r.name || currentVName;
                addAllCmds(parseAllAccountCommands(rawHtml, vId, vCoords, vName));
            });
            if (currentDocHtml) addAllCmds(parseAllAccountCommands(currentDocHtml, currentVId, currentVCoords, currentVName));
            if (rVillageOverview) addAllCmds(parseAllAccountCommands(rVillageOverview, currentVId, currentVCoords, currentVName));

            const nowCmds = getTwServerTimeMs();
            allParsedCommands = Array.from(cmdMap.values())
                .filter(c => (!commandsIgnoreFarms || !c.isFarm) && (!c.readyAtMs || c.readyAtMs > (nowCmds - 2000)))
                .sort((a, b) => a.readyAtMs - b.readyAtMs);

            // 9. Cruzamento inteligente de Comandos Ativos com allVillages para deduzir nobres fora e em casa
            allVillages.forEach(v => {
                const activeNobleCmds = allParsedCommands.filter(c => c.originCoords === v.coords && c.hasSnob && (!c.readyAtMs || c.readyAtMs > (nowCmds - 2000)));
                if (activeNobleCmds.length > 0) {
                    v.snobsOutside = Math.max(v.snobsOutside || 0, activeNobleCmds.length);
                    if ((v.snobsHome + v.snobsOutside) > (v.snobsTotal || 0)) {
                        v.snobsHome = Math.max(0, (v.snobsTotal || 0) - v.snobsOutside);
                    }
                    v.snobsTotal = Math.max(v.snobsTotal || 0, (v.snobsHome || 0) + v.snobsOutside);
                    v.snobsAvailable = v.snobsHome;
                }
            });

            // 10. Sincronizar todos os eventos e status de Nobres em todas as aldeias
            syncNobleEventsAcrossVillages();

            // 11. Enriquecer comandos a chegar incompletos com info_command e allParsedCommands com nomes de aldeias, atacantes e distâncias
            await enrichIncompleteIncomings(allParsedCommands, safeFetch);
            allParsedCommands.forEach(c => enrichCommandDetails(c));

            const cmdBadge = document.getElementById('tw-commands-count-badge');
            if (cmdBadge) cmdBadge.textContent = allParsedCommands.filter(c => c.isPlayerTarget).length;

            counterSummaryData = summary;
            updateMemoryHUD();
            document.getElementById('tw-tabs-container').style.display = 'flex';
            document.getElementById('tw-title-text').innerHTML = `⚡ TW Tactical Command Suite <span style="font-size:10px; font-weight:600; background:rgba(56,189,248,0.15); color:#38bdf8; padding:2px 7px; border-radius:4px; border:1px solid rgba(56,189,248,0.25); margin-left:6px; vertical-align:middle;">v${SCRIPT_VERSION}</span> <span style="font-size:11px; font-weight:normal; color:#94a3b8; margin-left:6px; vertical-align:middle;">(${allVillages.length} Aldeias Conectadas)</span>`;
            
            document.getElementById('tab-btn-overview').onclick = () => switchTab('overview');
            document.getElementById('tab-btn-counter').onclick = () => switchTab('counter');
            document.getElementById('tab-btn-fakes').onclick = () => switchTab('fakes');
            document.getElementById('tab-btn-nt').onclick = () => switchTab('nt');
            if (document.getElementById('tab-btn-commands')) {
                document.getElementById('tab-btn-commands').onclick = () => switchTab('commands');
            }
            document.getElementById('tw-btn-close').onclick = closeSuite;
            
            switchTab('overview');
        } catch (e) {
            console.error('[TW Tactical] Erro em loadData:', e);
            const mb = document.getElementById('tw-main-body');
            if (mb) mb.innerHTML = `<div style="padding:40px; color:#f85149; text-align:center;">Erro: ${e.message}</div>`;
        }
    }

    async function switchTab(tab) {
        activeTab = tab;
        if (commandsTimerInterval) {
            clearInterval(commandsTimerInterval);
            commandsTimerInterval = null;
        }

        document.getElementById('tab-btn-overview').classList.toggle('active', tab === 'overview');
        document.getElementById('tab-btn-counter').classList.toggle('active', tab === 'counter');
        document.getElementById('tab-btn-fakes').classList.toggle('active', tab === 'fakes');
        document.getElementById('tab-btn-nt').classList.toggle('active', tab === 'nt');
        if (document.getElementById('tab-btn-commands')) {
            document.getElementById('tab-btn-commands').classList.toggle('active', tab === 'commands');
        }
        
        if (tab === 'overview') renderOverview();
        else if (tab === 'counter') renderCounter();
        else if (tab === 'fakes') renderFakes();
        else if (tab === 'nt') renderAttackPlanner();
        else if (tab === 'commands') renderCommands();
    }

    // ==========================================
    // ROTINAS DE GERAÇÃO DA OPERAÇÃO TÁTICA
    // ==========================================
    function makeCmd(typeLabel, badgeClass, actionType, village, targetCoords, dist, sec, launchTime, landTime, modelName, catTarget = '', info = '') {
        return {
            type: typeLabel,
            badge: badgeClass,
            actionType,
            originId: village.id,
            originName: cleanVillageDisplayName(village),
            originCoords: village.coords,
            targetCoords,
            dist: parseFloat(dist).toFixed(2),
            sec: Math.round(sec),
            launchTime: new Date(launchTime),
            landTime: new Date(landTime),
            model: modelName,
            catTarget: catTarget || '',
            info: info || ''
        };
    }

    function findClosestAvailable(pool, usedSet, targetCoord, landMs, minLaunchMs, allowCommitted = false, reqPaladin = false, paladinChoice = 'auto', preferFull = true) {
        const ramSpeedMin = unitSpeedMinutes.ram || 30;
        const candidates = pool.filter(v => !usedSet.has(v.id)).map(v => {
            const dist = calcDistance(v.coords, targetCoord);
            const sec = dist * ramSpeedMin * 60;
            const launchMs = landMs - (sec * 1000);
            const isFull = (v.farm && v.farm.used >= 20000);
            const pal = v.paladin;
            let hasPal = false;
            if (palChoice === 'auto') {
                hasPal = pal ? (pal.isOffense && pal.isHome) : ((v.knightAvailable || (v.homeTroopsDict && v.homeTroopsDict.knight) || 0) >= 1);
            } else {
                hasPal = pal ? (String(pal.id) === String(paladinChoice) && pal.isHome) : false;
            }
            return { village: v, dist, sec, launchMs, launchTime: new Date(launchMs), isFull, hasPal };
        }).filter(c => c.launchMs >= minLaunchMs);

        if (candidates.length === 0) return null;

        candidates.sort((a, b) => {
            if (preferFull) {
                if (a.isFull && !b.isFull) return -1;
                if (!a.isFull && b.isFull) return 1;
            }
            if (reqPaladin) {
                if (a.hasPal && !b.hasPal) return -1;
                if (!a.hasPal && b.hasPal) return 1;
            }
            return a.dist - b.dist;
        });

        return candidates[0];
    }

    async function buildMasterOPPlan() {
        const targetInput = document.getElementById('tw-nt-target');
        const target = targetInput ? targetInput.value.trim() : '';
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
        const isCleanOnlyProfile = (attackMode === 'nuke_sweep' || attackMode === 'cat_demolish');
        const isBateVolta = (attackMode === 'snob_solo');
        const rawNobleCount = parseInt(document.getElementById('tw-nt-noble-count').value, 10);
        const nobleCount = isCleanOnlyProfile ? 0 : (isNaN(rawNobleCount) ? 4 : rawNobleCount);
        const hasNobles = nobleCount > 0;

        const selNoble = document.getElementById('tw-nt-noble-village');
        const nobleV = (hasNobles && selNoble && villagesById[selNoble.value]) ? villagesById[selNoble.value] : null;

        const arch = document.getElementById('tw-nt-architecture').value;
        const isSplit = (hasNobles && !isBateVolta && arch === 'split_2x2' && nobleCount >= 2);
        const selNoble2 = document.getElementById('tw-nt-noble-village-2');
        const nobleV2 = (isSplit && selNoble2 && villagesById[selNoble2.value]) ? villagesById[selNoble2.value] : null;

        const leadNukesCount = parseInt(document.getElementById('tw-nt-lead-nukes').value, 10) || 0;
        const { waves: rawAntiWaves, leadMs: antiLeadMs } = getAntiSnipeConfig();
        const antiWavesCount = hasNobles ? rawAntiWaves : 0;
        const bunkerCount = hasNobles ? (parseInt(document.getElementById('tw-nt-bunker-count').value, 10) || 0) : 0;
        const bunkerGapMs = parseInt(document.getElementById('tw-nt-bunker-gap').value, 10) || 200;
        const bunkerStepMs = parseInt(document.getElementById('tw-nt-bunker-step').value, 10) || 50;
        const msStep = parseInt(document.getElementById('tw-nt-ms-interval').value, 10) || 200;

        const modelNuke = document.getElementById('tw-nt-model-nuke').value.trim() || 'Ataque Full';
        const modelAnti = document.getElementById('tw-nt-model-anti').value.trim() || 'Ataque 50%';
        const modelSnob = document.getElementById('tw-nt-model-snob').value.trim() || 'NT 25%';
        const nukeCatTarget = document.getElementById('tw-nt-nuke-cat-target').value;
        const antiCatTarget = document.getElementById('tw-nt-anti-cat-target').value;
        const catTargetBuilding = document.getElementById('tw-nt-cat-target-building').value;
        const modelCats = document.getElementById('tw-nt-model-cats').value.trim() || 'Cats';

        const modelBunker1 = document.getElementById('tw-nt-model-bunker-1').value.trim() || 'BUNK';
        const modelBunker2 = document.getElementById('tw-nt-model-bunker-2').value.trim() || 'BUNK';

        const now = Date.now();
        const minLaunchMs = now + 60000;
        const commands = [];
        const usedOff = new Set();
        const usedDef = new Set();

        const excludeCommitted = document.getElementById('tw-nt-exclude-committed').checked;
        const committedMap = getCommittedSchedules();
        const offPool = allVillages.filter(v => v.rowClass === 'tw-row-off' && (!excludeCommitted || !committedMap[v.id]));
        const defPool = allVillages.filter(v => v.rowClass === 'tw-row-def' && (!excludeCommitted || !committedMap[v.id]));

        // 1. Nukes de Limpeza
        if (leadNukesCount > 0) {
            for (let i = 0; i < leadNukesCount; i++) {
                const landOffset = hasNobles ? ((leadNukesCount - i) * 100) : ((leadNukesCount - 1 - i) * 100);
                const landMs = baseLandTime - landOffset;
                const nukeItem = findClosestAvailable(offPool, usedOff, target, landMs, minLaunchMs, false, true, 'auto', true);
                if (nukeItem) {
                    usedOff.add(nukeItem.village.id);
                    commands.push(makeCmd(`Limpeza #${i+1}`, 'tw-badge-nuke', 'Attack', nukeItem.village, target, nukeItem.dist, nukeItem.sec, nukeItem.launchTime, new Date(landMs), modelNuke, nukeCatTarget !== 'none' ? nukeCatTarget : '', 'Full Nuke'));
                }
            }
        }

        // 2. Onda Dedicada de Demolição Tática (Catapultas)
        if (attackMode === 'cat_demolish' || attackMode === 'full_storm') {
            const catLandMs = baseLandTime - 50;
            const catItem = findClosestAvailable(offPool, usedOff, target, catLandMs, minLaunchMs, false, false, 'auto', false);
            if (catItem) {
                usedOff.add(catItem.village.id);
                commands.push(makeCmd(`Demolição (${formatBuildingName(catTargetBuilding)})`, 'tw-badge-muralha', 'Attack', catItem.village, target, catItem.dist, catItem.sec, catItem.launchTime, new Date(catLandMs), modelCats, catTargetBuilding, `Demolição: ${formatBuildingName(catTargetBuilding)}`));
            }
        }

        // 3. Nobres e Escoltas Anti-Snipe
        if (hasNobles && nobleV) {
            const snobDist = calcDistance(nobleV.coords, target);
            const snobTravelSec = snobDist * unitSpeedMinutes.snob * 60;

            if (isBateVolta) {
                // Modo Bate e Volta (1 nobre a fazer viagens consecutivas com folga de segurança para o bot)
                const bvBufferSec = Math.max(60, parseInt(document.getElementById('tw-nt-bv-buffer') ? document.getElementById('tw-nt-bv-buffer').value : getPref('tw_nt_bv_buffer', '75'), 10) || 75);
                const cycleSec = 2 * snobTravelSec + bvBufferSec;
                const bvAnchor = document.getElementById('tw-nt-bv-anchor').value;
                const totalTrips = nobleCount;

                for (let trip = 0; trip < totalTrips; trip++) {
                    let tripLandMs;
                    if (bvAnchor === 'final') {
                        tripLandMs = baseLandTime - ((totalTrips - 1 - trip) * cycleSec * 1000);
                    } else {
                        tripLandMs = baseLandTime + (trip * cycleSec * 1000);
                    }
                    const tripLaunchMs = tripLandMs - (snobTravelSec * 1000);
                    commands.push(makeCmd(`Nobre BV (Viagem ${trip+1}/${totalTrips})`, 'tw-badge-snob', 'Attack', nobleV, target, snobDist, snobTravelSec, new Date(tripLaunchMs), new Date(tripLandMs), modelSnob, '', `Bate e Volta #${trip+1}`));
                }
            } else if (isSplit && nobleV2) {
                // Modo Split 2x2
                const snobDist2 = calcDistance(nobleV2.coords, target);
                const snobTravelSec2 = snobDist2 * unitSpeedMinutes.snob * 60;

                for (let i = 0; i < 2; i++) {
                    const landMs = baseLandTime + (i * msStep);
                    const launchMs = landMs - (snobTravelSec * 1000);
                    commands.push(makeCmd(`Nobre #${i+1} (Aldeia 1)`, 'tw-badge-snob', 'Attack', nobleV, target, snobDist, snobTravelSec, new Date(launchMs), new Date(landMs), modelSnob, '', 'Nobre Split'));
                }
                for (let i = 2; i < 4; i++) {
                    const landMs = baseLandTime + (i * msStep);
                    const launchMs = landMs - (snobTravelSec2 * 1000);
                    commands.push(makeCmd(`Nobre #${i+1} (Aldeia 2)`, 'tw-badge-snob', 'Attack', nobleV2, target, snobDist2, snobTravelSec2, new Date(launchMs), new Date(landMs), modelSnob, '', 'Nobre Split'));
                }
            } else {
                // Modo Padrão (1 a 5 nobres)
                for (let i = 0; i < nobleCount; i++) {
                    const landMs = baseLandTime + (i * msStep);
                    const launchMs = landMs - (snobTravelSec * 1000);

                    // Escolta Anti-Snipe imediatamente antes deste nobre
                    if (antiWavesCount > 0 && i < antiWavesCount) {
                        const antiLandMs = landMs - antiLeadMs;
                        const antiItem = findClosestAvailable(offPool, usedOff, target, antiLandMs, minLaunchMs, false, false, 'auto', false);
                        if (antiItem) {
                            usedOff.add(antiItem.village.id);
                            commands.push(makeCmd(`Escolta Anti-Snipe #${i+1}`, 'tw-badge-anti', 'Attack', antiItem.village, target, antiItem.dist, antiItem.sec, antiItem.launchTime, new Date(antiLandMs), modelAnti, antiCatTarget !== 'none' ? antiCatTarget : '', `Anti-Snipe -${antiLeadMs}ms`));
                        }
                    }

                    commands.push(makeCmd(`Nobre #${i+1}`, 'tw-badge-snob', 'Attack', nobleV, target, snobDist, snobTravelSec, new Date(launchMs), new Date(landMs), modelSnob, '', `Nobre #${i+1}`));
                }
            }
        }

        // 4. Bunkers de Conquista
        if (hasNobles && bunkerCount > 0) {
            const lastNobleLandMs = baseLandTime + ((Math.max(1, nobleCount) - 1) * msStep);
            const ramSpeedMin = unitSpeedMinutes.ram || 30;

            for (let i = 0; i < bunkerCount; i++) {
                const bLandMs = lastNobleLandMs + bunkerGapMs + (i * bunkerStepMs);
                const bCandidates = defPool.filter(v => !usedDef.has(v.id)).map(v => {
                    const dist = calcDistance(v.coords, target);
                    const sec = dist * ramSpeedMin * 60;
                    const launchMs = bLandMs - (sec * 1000);
                    return { village: v, dist, sec, launchMs, launchTime: new Date(launchMs) };
                }).filter(c => c.launchMs >= minLaunchMs).sort((a, b) => a.dist - b.dist);

                if (bCandidates.length > 0) {
                    const chosenBunk = bCandidates[0];
                    usedDef.add(chosenBunk.village.id);
                    const bModel = (i === 0) ? modelBunker1 : modelBunker2;
                    commands.push(makeCmd(`Bunker #${i+1}`, 'tw-badge-bunker', 'Support', chosenBunk.village, target, chosenBunk.dist, chosenBunk.sec, chosenBunk.launchTime, new Date(bLandMs), bModel, '', `Apoio Pós-Conquista +${bunkerGapMs + (i * bunkerStepMs)}ms`));
                }
            }
        }

        // 5. Cortina de Fakes em Raio (se ativa)
        const fakeEnable = document.getElementById('tw-nt-fake-enable') && document.getElementById('tw-nt-fake-enable').checked;
        if (fakeEnable) {
            const radius = parseFloat(document.getElementById('tw-nt-fake-radius').value) || 8;
            const fakesPerVillage = parseInt(document.getElementById('tw-nt-fake-count').value, 10) || 3;
            const fakeStyle = document.getElementById('tw-nt-fake-style').value;
            const fakeModelBase = document.getElementById('tw-nt-fake-model').value.trim() || 'Fake';
            const fakeMaxOrigin = parseInt(document.getElementById('tw-nt-fake-max-origin').value, 10) || 2;
            const includeTarget = document.getElementById('tw-nt-fake-include-target').checked;
            const isSmartFake = document.getElementById('tw-nt-fake-smart-limit') && document.getElementById('tw-nt-fake-smart-limit').checked;

            if (isSmartFake && !worldVillagesLoaded) {
                await fetchWorldVillages();
            }

            const [tx, ty] = target.split('|').map(Number);
            const myCoords = new Set(allVillages.map(v => v.coords));
            const radiusTargets = [];

            if (worldVillages.length > 0) {
                const targetObj = worldVillages.find(v => v.coord === target);
                const targetPlayerId = targetObj ? targetObj.playerId : null;
                worldVillages.forEach(wv => {
                    if (wv.coord === target || myCoords.has(wv.coord)) return;
                    if (targetPlayerId && targetPlayerId !== '0' && wv.playerId !== targetPlayerId) return;
                    const d = Math.hypot(wv.x - tx, wv.y - ty);
                    if (d <= radius) radiusTargets.push(wv.coord);
                });
            }
            if (includeTarget) radiusTargets.push(target);

            const speedMin = (fakeStyle === 'snob') ? (unitSpeedMinutes.snob || 35) : (fakeStyle === 'spy' ? (unitSpeedMinutes.spy || 9) : (unitSpeedMinutes.ram || 30));
            const fakePool = allVillages.filter(v => (v.isDef || v.rowClass === 'tw-row-def' || v.isOff) && (!excludeCommitted || !committedMap[v.id]));
            const fakeUsage = {};
            fakePool.forEach(v => fakeUsage[v.id] = 0);

            radiusTargets.forEach(rTarget => {
                for (let k = 0; k < fakesPerVillage; k++) {
                    const cands = fakePool.filter(v => v.coords !== rTarget && fakeUsage[v.id] < fakeMaxOrigin).map(v => {
                        const dist = calcDistance(v.coords, rTarget);
                        const sec = dist * speedMin * 60;
                        const landMs = baseLandTime + (k * 200);
                        const launchMs = landMs - (sec * 1000);
                        return { village: v, dist, sec, landMs, launchMs };
                    }).filter(c => c.launchMs >= minLaunchMs).sort((a, b) => a.dist - b.dist);

                    if (cands.length > 0) {
                        const pick = cands[0];
                        fakeUsage[pick.village.id]++;
                        const resolvedModel = resolveFakeModel(pick.village, fakeModelBase, isSmartFake).model;
                        commands.push(makeCmd(`Fake (Raio ${radius}c)`, 'tw-badge-warn', 'Attack', pick.village, rTarget, pick.dist, pick.sec, new Date(pick.launchMs), new Date(pick.landMs), resolvedModel, '', 'Fake Saturação'));
                    }
                }
            });
        }

        if (commands.length === 0) {
            alert('Não foi possível gerar comandos válidos para os parâmetros inseridos (verifica as distâncias, horários e filtros de aldeias).');
            return;
        }

        // Ordenar por hora de lançamento
        commands.sort((a, b) => a.launchTime - b.launchTime);
        lastGeneratedCommands = commands;
        lastGeneratedTarget = target;

        // Renderizar comandos e gerar BBCode
        const formatTableDateTime = (date, color = '#f8fafc') => {
            const d = new Date(date);
            const now = new Date();
            const todayStr = now.toDateString();
            const tomorrowStr = new Date(now.getTime() + 86400000).toDateString();
            const dStr = d.toDateString();

            let badge = '';
            if (dStr === todayStr) {
                badge = `<span style="font-size:9px; color:#34d399; font-weight:bold; display:block;">Hoje</span>`;
            } else if (dStr === tomorrowStr) {
                const dayMonth = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
                badge = `<span style="font-size:9px; color:#c084fc; font-weight:bold; display:block;">Amanhã (${dayMonth})</span>`;
            } else {
                const dayMonth = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
                badge = `<span style="font-size:9px; color:#94a3b8; font-weight:bold; display:block;">${dayMonth}</span>`;
            }
            const timeStr = `${d.toLocaleTimeString('pt-PT')}:${String(d.getMilliseconds()).padStart(3, '0')}`;
            return `${badge}<b style="color:${color}; font-size:11px;">${timeStr}</b>`;
        };

        let rows = '', output = '';
        commands.forEach((cmd, i) => {
            const catBadge = cmd.catTarget && cmd.catTarget !== 'none' ? ` <span class="tw-badge-muralha" style="font-size:9px;">🎯 ${formatBuildingName(cmd.catTarget)}</span>` : '';
            rows += `
                <tr data-vid="${cmd.originId}">
                    <td style="color:#94a3b8;">${i+1}</td>
                    <td><span class="${cmd.badge}">${cmd.type}</span>${catBadge}</td>
                    <td style="text-align:left; padding-left:10px; font-weight:bold; color:#38bdf8;">${cmd.originName}</td>
                    <td style="font-weight:bold; color:#fbbf24;">${cmd.targetCoords}</td>
                    <td>${cmd.dist}c</td>
                    <td>${formatTableDateTime(cmd.launchTime, '#f8fafc')}</td>
                    <td>${formatTableDateTime(cmd.landTime, '#38bdf8')}</td>
                    <td><b style="color:#f43f5e;">${cmd.model}</b> <span style="font-size:9px; color:#94a3b8;">(${cmd.info || 'Auto'})</span></td>
                </tr>
            `;

            let u = `https://${location.host}/game.php?village=${cmd.originId}&screen=place&target_coord=${cmd.targetCoords}`;
            if (cmd.catTarget && cmd.catTarget !== 'none') u += `&target_building=${cmd.catTarget}`;
            output += `[*]${i+1}. ${formatRussianDateTime(cmd.launchTime)} --- ${cmd.model}[|]${formatRussianDateTime(cmd.landTime)}[|] ${cmd.originCoords} --> ${cmd.targetCoords} [|][url=${u}]Link[/url]\n`;
        });

        document.getElementById('tw-nt-tbody').innerHTML = rows;
        document.getElementById('tw-nt-preview').value = output.trim();
        const cmdCountEl = document.getElementById('tw-nt-cmd-counter');
        if (cmdCountEl) cmdCountEl.innerText = `${commands.length} comandos`;

        try {
            await navigator.clipboard.writeText(output.trim());
            document.getElementById('tw-nt-status').innerHTML = `<span style="color:#34d399;">✅ ${commands.length} comandos gerados e copiados para o Clipboard!</span>`;
            showToast(`⚡ ${commands.length} Comandos copiados para o Clipboard!`);
        } catch (e) {
            document.getElementById('tw-nt-status').innerHTML = `<span style="color:#fbbf24;">⚠️ ${commands.length} comandos gerados (copia manualmente da caixa de texto).</span>`;
        }
    }

    // ==========================================
    // ABA 5: COMANDOS E RETORNOS
    // ==========================================
    function renderCommands() {
        if (commandsTimerInterval) {
            clearInterval(commandsTimerInterval);
            commandsTimerInterval = null;
        }

        const container = document.getElementById('tw-main-body');
        if (!container) return;

        const countPlayers = allParsedCommands.filter(c => c.isPlayerTarget).length;
        const countAttacks = allParsedCommands.filter(c => c.isAttack && c.isPlayerTarget).length;
        const countReturns = allParsedCommands.filter(c => c.isReturn && c.isPlayerTarget).length;
        const countSnobs = allParsedCommands.filter(c => c.hasSnob).length;

        container.innerHTML = `
            <div class="tw-pane active" style="padding:4px; gap:8px; display:flex; flex-direction:column; flex-grow:1; height:100%; overflow:hidden;">
                <!-- KPI CARDS COMANDOS -->
                <div class="tw-kpi-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom:4px; flex-shrink:0;">
                    <div class="tw-kpi-card tw-kpi-blue">
                        <div class="tw-kpi-label"><span>📡 COMANDOS A JOGADORES</span><span>ATIVOS</span></div>
                        <div class="tw-kpi-value" style="color:#38bdf8;">${countPlayers} <span style="font-size:12px; color:#94a3b8; font-weight:normal;">Comandos</span></div>
                        <div class="tw-kpi-sub">Total de ataques e regressos</div>
                    </div>
                    <div class="tw-kpi-card tw-kpi-red">
                        <div class="tw-kpi-label"><span>⚔️ ATAQUES A CAMINHO</span><span>IDA</span></div>
                        <div class="tw-kpi-value" style="color:#f87171;">${countAttacks} <span style="font-size:12px; color:#94a3b8; font-weight:normal;">Ataques</span></div>
                        <div class="tw-kpi-sub">Tropas em marcha para o alvo</div>
                    </div>
                    <div class="tw-kpi-card tw-kpi-purple">
                        <div class="tw-kpi-label"><span>↩️ REGRESSOS A CASA</span><span>RETORNO</span></div>
                        <div class="tw-kpi-value" style="color:#c084fc;">${countReturns} <span style="font-size:12px; color:#94a3b8; font-weight:normal;">Retornos</span></div>
                        <div class="tw-kpi-sub">Tropas a voltar de ataques</div>
                    </div>
                    <div class="tw-kpi-card tw-kpi-gold">
                        <div class="tw-kpi-label"><span>👑 NOBRES EM VIAGEM</span><span>TOTAL</span></div>
                        <div class="tw-kpi-value" style="color:#fbbf24;">${countSnobs} <span style="font-size:12px; color:#94a3b8; font-weight:normal;">Nobres</span></div>
                        <div class="tw-kpi-sub">Ataques ou retornos com Nobre</div>
                    </div>
                </div>

                <!-- BARRA DE FILTROS & OPÇÕES -->
                <div style="display:flex; justify-content:space-between; align-items:center; background:#0f172a; border:1px solid #1e293b; border-radius:8px; padding:6px 10px; flex-shrink:0;">
                    <div class="tw-pill-group">
                        <span style="font-size:11px; font-weight:bold; color:#64748b; margin-right:4px;">VER:</span>
                        <div class="tw-pill ${commandsFilter==='players'?'active':''}" data-cf="players">👤 Jogadores (${countPlayers})</div>
                        <div class="tw-pill ${commandsFilter==='attack'?'active':''}" data-cf="attack">⚔️ Ataques (${countAttacks})</div>
                        <div class="tw-pill ${commandsFilter==='return'?'active':''}" data-cf="return">↩️ Retornos (${countReturns})</div>
                        <div class="tw-pill ${commandsFilter==='snob'?'active':''}" data-cf="snob">👑 Nobres (${countSnobs})</div>
                        <div class="tw-pill ${commandsFilter==='all'?'active':''}" data-cf="all">🌍 Todos (${allParsedCommands.length})</div>
                    </div>

                    <div style="display:flex; gap:8px; align-items:center;">
                        <label style="display:flex; align-items:center; gap:4px; font-size:11px; color:#94a3b8; cursor:pointer;" title="Agrupa comandos que atacam a mesma aldeia alvo">
                            <input type="checkbox" id="tw-cmd-chk-group" ${commandsGroupByTarget ? 'checked' : ''} style="cursor:pointer;">
                            Agrupar por Alvo
                        </label>
                        <input type="text" id="tw-cmd-search" class="tw-input" style="width:170px; padding:4px 8px; font-size:11px;" placeholder="🔍 Filtrar jogador/coord..." value="${commandsSearch}">
                    </div>
                </div>

                <!-- TABELA DE COMANDOS -->
                <div class="tw-panel" style="flex-grow:1; overflow-y:auto; min-height:0;">
                    <table class="tw-table">
                        <thead>
                            <tr>
                                <th style="width:35px;">#</th>
                                <th style="width:110px;">Tipo</th>
                                <th style="text-align:left; width:180px; padding-left:10px;">Origem</th>
                                <th style="width:130px;">Jogador Alvo</th>
                                <th style="width:85px;">Alvo</th>
                                <th style="width:65px;">Dist.</th>
                                <th style="width:105px;">Tempo Rest.</th>
                                <th style="width:140px;">Chegada</th>
                            </tr>
                        </thead>
                        <tbody id="tw-cmd-tbody"></tbody>
                    </table>
                </div>
            </div>
        `;

        // Eventos
        document.querySelectorAll('.tw-pill[data-cf]').forEach(pill => {
            pill.onclick = function() {
                commandsFilter = this.getAttribute('data-cf');
                renderCommands();
            };
        });

        const chkGroup = document.getElementById('tw-cmd-chk-group');
        if (chkGroup) {
            chkGroup.onchange = (e) => {
                commandsGroupByTarget = e.target.checked;
                savePrefs('tw_cmd_group_targets', commandsGroupByTarget);
                renderCommandsTable();
            };
        }

        const searchInput = document.getElementById('tw-cmd-search');
        if (searchInput) {
            searchInput.oninput = (e) => {
                commandsSearch = e.target.value.toLowerCase();
                renderCommandsTable();
            };
        }

        renderCommandsTable();

        // Intervalo para atualizar temporizadores a cada 1 segundo
        commandsTimerInterval = setInterval(() => {
            const now = Date.now();
            document.querySelectorAll('.tw-cmd-timer').forEach(el => {
                const targetMs = parseInt(el.getAttribute('data-target-ms'), 10);
                if (targetMs) {
                    const diffSec = Math.max(0, Math.floor((targetMs - now) / 1000));
                    el.innerText = formatDuration(diffSec);
                    if (diffSec === 0) el.style.color = '#f43f5e';
                }
            });
        }, 1000);
    }

    function renderCommandsTable() {
        const tbody = document.getElementById('tw-cmd-tbody');
        if (!tbody) return;

        let filtered = allParsedCommands.filter(c => {
            if (commandsFilter === 'players' && !c.isPlayerTarget) return false;
            if (commandsFilter === 'attack' && (!c.isAttack || !c.isPlayerTarget)) return false;
            if (commandsFilter === 'return' && (!c.isReturn || !c.isPlayerTarget)) return false;
            if (commandsFilter === 'snob' && !c.hasSnob) return false;

            if (commandsSearch) {
                const s = commandsSearch;
                const matchOrig = (c.originName && c.originName.toLowerCase().includes(s)) || (c.originCoords && c.originCoords.includes(s));
                const matchTgt = (c.targetName && c.targetName.toLowerCase().includes(s)) || (c.targetCoords && c.targetCoords.includes(s));
                const matchPlayer = (c.targetPlayerName && c.targetPlayerName.toLowerCase().includes(s));
                const matchLabel = (c.label && c.label.toLowerCase().includes(s));
                if (!matchOrig && !matchTgt && !matchPlayer && !matchLabel) return false;
            }
            return true;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="padding:35px; color:#64748b; text-align:center;">Nenhum comando corresponde aos filtros selecionados.</td></tr>`;
            return;
        }

        let rows = '';
        const now = Date.now();

        filtered.forEach((cmd, idx) => {
            const remSec = Math.max(0, Math.floor((cmd.readyAtMs - now) / 1000));
            const timerDisplay = formatDuration(remSec);

            let typeBadge = '';
            if (cmd.hasSnob) typeBadge = `<span class="tw-badge-cmd-snob">👑 Nobre</span>`;
            else if (cmd.isAttack) typeBadge = `<span class="tw-badge-cmd-attack">⚔️ Ataque</span>`;
            else if (cmd.isReturn) typeBadge = `<span class="tw-badge-cmd-return">↩️ Retorno</span>`;
            else if (cmd.isSupport) typeBadge = `<span class="tw-badge-cmd-support">🛡️ Apoio</span>`;
            else typeBadge = `<span class="tw-badge-reserved">Comando</span>`;

            const distStr = cmd.dist ? `${cmd.dist}c` : '-';
            const playerName = cmd.targetPlayerName || 'Player';

            rows += `
                <tr>
                    <td style="color:#64748b;">${idx + 1}</td>
                    <td>${typeBadge}</td>
                    <td style="text-align:left; padding-left:10px;">
                        <a href="javascript:void(0);" class="tw-v-coord" data-coord="${cmd.originCoords}" style="color:#38bdf8; text-decoration:none; font-weight:bold;">${cmd.originName || cmd.originCoords}</a>
                    </td>
                    <td><b style="color:#f8fafc;">${playerName}</b></td>
                    <td>
                        <a href="javascript:void(0);" class="tw-v-coord" data-coord="${cmd.targetCoords}" style="color:#fbbf24; text-decoration:none; font-weight:bold;">${cmd.targetCoords}</a>
                    </td>
                    <td>${distStr}</td>
                    <td><b class="tw-cmd-timer" data-target-ms="${cmd.readyAtMs}" style="color:#38bdf8;">${timerDisplay}</b></td>
                    <td style="color:#94a3b8;">${cmd.completionStr || new Date(cmd.readyAtMs).toLocaleTimeString('pt-PT')}</td>
                </tr>
            `;
        });

        tbody.innerHTML = rows;

        tbody.querySelectorAll('.tw-v-coord').forEach(el => {
            el.onclick = function() {
                const c = this.getAttribute('data-coord');
                navigator.clipboard.writeText(c);
                showToast(`📋 Coordenadas ${c} copiadas!`);
            };
        });
    }

    function openMapIframeModal(sourceTab = 'planner') {
        if (document.getElementById('tw-map-iframe-modal')) {
            document.getElementById('tw-map-iframe-modal').remove();
            return;
        }

        const mapModal = document.createElement('div');
        mapModal.id = 'tw-map-iframe-modal';
        mapModal.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 90vw; max-width: 1200px; height: 85vh; max-height: 800px;
            background: #020617; border: 2px solid #38bdf8; border-radius: 12px;
            box-shadow: 0 25px 60px rgba(0,0,0,0.95); z-index: 100000;
            display: flex; flex-direction: column; overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        `;

        mapModal.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 14px; background:#0f172a; border-bottom:1px solid #1e293b;">
                <div style="font-weight:bold; color:#38bdf8; font-size:13px; display:flex; align-items:center; gap:8px;">
                    🗺️ Seletor de Alvos no Mapa
                    <span style="font-size:11px; color:#94a3b8; font-weight:normal;">(Clica nas aldeias no mapa para adicionar)</span>
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                    <button class="tw-btn tw-btn-green" id="tw-map-modal-done" style="padding:4px 10px; font-size:11px;">Concluir e Inserir</button>
                    <span class="tw-close" id="tw-map-modal-close" style="font-size:22px; cursor:pointer;">&times;</span>
                </div>
            </div>
            <iframe id="tw-map-iframe" src="/game.php?screen=map" style="flex-grow:1; border:none; width:100%; height:100%;"></iframe>
        `;
        document.body.appendChild(mapModal);

        document.getElementById('tw-map-modal-close').onclick = () => mapModal.remove();
        document.getElementById('tw-map-modal-done').onclick = () => {
            const list = Array.from(grabbedTargets).join(' ');
            if (sourceTab === 'fakes') {
                const targetTextarea = document.getElementById('tw-f-targets');
                if (targetTextarea) {
                    targetTextarea.value = list;
                    targetTextarea.dispatchEvent(new Event('input'));
                }
            } else {
                if (plannerMode === 'single') {
                    const targetSingle = document.getElementById('tw-nt-target');
                    if (targetSingle && grabbedTargets.size > 0) {
                        targetSingle.value = Array.from(grabbedTargets)[0];
                        targetSingle.dispatchEvent(new Event('input'));
                    }
                } else {
                    const targetMulti = document.getElementById('tw-nt-targets-multi');
                    if (targetMulti) {
                        targetMulti.value = list;
                        targetMulti.dispatchEvent(new Event('input'));
                    }
                }
            }
            mapModal.remove();
            showToast(`🎯 ${grabbedTargets.size} alvos inseridos a partir do mapa!`);
        };
    }

    function closeSuite() {
        if (commandsTimerInterval) {
            clearInterval(commandsTimerInterval);
            commandsTimerInterval = null;
        }
        if (document.getElementById(modalId)) document.getElementById(modalId).remove();
        if (document.getElementById(`${modalId}-backdrop`)) document.getElementById(`${modalId}-backdrop`).remove();
        if (document.getElementById(`${modalId}-style`)) document.getElementById(`${modalId}-style`).remove();
        if (document.getElementById(`${modalId}-tooltip`)) document.getElementById(`${modalId}-tooltip`).remove();
        if (document.getElementById(`${modalId}-toast`)) document.getElementById(`${modalId}-toast`).remove();
        if (document.getElementById('tw-map-iframe-modal')) document.getElementById('tw-map-iframe-modal').remove();
        if (document.getElementById('tw-memory-modal')) document.getElementById('tw-memory-modal').remove();
    }

    // Inicialização da Suite
    loadData();
})();
