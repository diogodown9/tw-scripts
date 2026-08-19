(function () {
    // Evitar sobreposição: fecha a UI se já estiver aberta
    if (document.getElementById('tw-dark-ui')) {
        document.getElementById('tw-dark-ui').remove();
        return;
    }

    // Criar o contentor principal (UI Dark Mode)
    var ui = document.createElement('div');
    ui.id = 'tw-dark-ui';
    ui.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1a1a1a;color:#e0e0e0;border:2px solid #333;border-radius:10px;z-index:99999;padding:20px;box-shadow:0 8px 25px rgba(0,0,0,0.9);width:90%;max-width:400px;font-family:Verdana,sans-serif;box-sizing:border-box;';
    ui.innerHTML = '<div style="font-size:16px;font-weight:bold;margin-bottom:15px;display:flex;justify-content:space-between;border-bottom:1px solid #444;padding-bottom:10px;"><span id="tw-ui-title">⏳ A processar...</span><span style="cursor:pointer;color:#ff5555;font-size:18px;" onclick="document.getElementById(\'tw-dark-ui\').remove()">✖</span></div><div id="tw-ui-content" style="text-align:center;font-size:14px;">A aceder aos dados da aldeia...</div>';
    document.body.appendChild(ui);

    // Variáveis da aldeia atual
    var vId = game_data.village.id;
    var vName = game_data.village.name;
    var fLvl = game_data.village.buildings.farm;
    var p = game_data.village.pop;
    var pMax = game_data.village.pop_max;
    var pPerc = ((p / pMax) * 100).toFixed(1);
    var pColor = pPerc >= 95 ? '#ff5555' : (pPerc >= 80 ? '#ffa500' : '#55ff55');

    // URLs para as extrações
    var urlO = game_data.link_base_pure + 'overview';
    var urlU = game_data.link_base_pure + 'overview_villages&mode=units&type=complete';

    // Executar os pedidos em paralelo
    Promise.all([$.get(urlO), $.get(urlU)]).then(function (res) {
        var dO = new DOMParser().parseFromString(res[0], 'text/html');
        var dU = new DOMParser().parseFromString(res[1], 'text/html');

        // Extração dos Grupos
        var grps = [];
        dO.querySelectorAll('a[href*="mode=groups&group="]').forEach(function (a) {
            var t = a.textContent.replace(/[\[\]]/g, '').trim();
            if (t && t !== '+' && t.toLowerCase() !== 'editar' && t.toLowerCase() !== 'edit') {
                if (!grps.includes(t)) grps.push(t);
            }
        });
        var grpTxt = grps.length > 0 ? grps.join(', ') : 'Sem grupo';

        // Extração das Tropas
        var tHtml = '';
        var $t = $(dU).find('#units_table');

        if ($t.length) {
            var hdrs = [];
            $t.find('thead th img[src*="unit"]').each(function () {
                var src = $(this).attr('src');
                var nm = src.match(/unit_([a-z_]+)\.png/)[1];
                hdrs.push({ name: nm, src: src });
            });

            var $vLink = $t.find('a[href*="village=' + vId + '"]').first();
            var $tb = $vLink.closest('tbody');

            if ($tb.length) {
                var $tRow = $tb.find('tr').filter(function () {
                    return $(this).text().indexOf('Total') > -1;
                }).last();

                if ($tRow.length) {
                    $tRow.find('td.unit-item, td[class*="unit"]').each(function (i) {
                        var c = parseInt($(this).text().replace(/\./g, '').trim()) || 0;
                        if (hdrs[i]) {
                            tHtml += '<div style="background:#262626;border:1px solid #333;border-radius:6px;padding:8px 4px;text-align:center;"><img src="' + hdrs[i].src + '" style="margin-bottom:6px;"><div style="font-weight:bold;font-size:13px;color:#fff;">' + c + '</div></div>';
                        }
                    });
                } else {
                    tHtml = '<div style="grid-column:1/-1;color:#ffaaaa;">Linha "Total" não encontrada.</div>';
                }
            } else {
                tHtml = '<div style="grid-column:1/-1;color:#ffaaaa;">Aldeia sem dados de tropas.</div>';
            }
        } else {
            tHtml = '<div style="grid-column:1/-1;color:#ffaaaa;padding:10px;">Requer Conta Premium ativa.</div>';
        }

        // Construir a UI Final
        document.getElementById('tw-ui-title').innerText = '📊 ' + vName;
        document.getElementById('tw-ui-content').innerHTML = '<div style="text-align:left;line-height:1.7;"><div style="margin-bottom:5px;"><strong>📁 Grupos:</strong> <span style="color:#7fbfff;">' + grpTxt + '</span></div><div style="margin-bottom:5px;"><strong>🌾 Fazenda:</strong> Nível ' + fLvl + '</div><div style="margin-bottom:5px;"><strong>👥 Ocupação:</strong> ' + p + ' / ' + pMax + ' (<span style="color:' + pColor + ';font-weight:bold;">' + pPerc + '%</span>)</div><div style="border-top:1px solid #444;margin-top:15px;padding-top:12px;"><div style="text-align:center;font-weight:bold;margin-bottom:12px;color:#aaa;">⚔️ Total da Aldeia (Incl. em trânsito)</div><div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(45px, 1fr));gap:6px;">' + tHtml + '</div></div></div>';

    }).catch(function () {
        document.getElementById('tw-ui-content').innerHTML = '<span style="color:#ff5555;">Erro de ligação. Tenta novamente.</span>';
    });
})();
