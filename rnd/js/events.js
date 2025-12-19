// 事件管理模块 - 独立的事件管理功能
window.eventManagement = (() => {
    // 事件管理相关变量
    let isShowingPersonal = true;
    // 启用状态筛选：'all' | 'enabled' | 'disabled'
    const statusFilter = { personal: 'all', team: 'all' };

    // 预设存取
    function getPresetKey(/* unified */) {
        return 'eventEnabledPresets';
    }
    function loadPresets() {
        try { return JSON.parse(localStorage.getItem(getPresetKey()) || '{}') || {}; } catch { return {}; }
    }
    function savePresets(presets) {
        try { localStorage.setItem(getPresetKey(), JSON.stringify(presets || {})); } catch {}
    }
    function snapshotAll() {
        const personalChecked = JSON.parse(localStorage.getItem('personalEventsTable-checkedState') || '{}');
        const teamChecked = JSON.parse(localStorage.getItem('teamEventsTable-checkedState') || '{}');
        return {
            personalEvents: JSON.parse(JSON.stringify(window.mission || {})),
            teamEvents: JSON.parse(JSON.stringify(window.hardmission || {})),
            personalCheckedState: JSON.parse(JSON.stringify(personalChecked)),
            teamCheckedState: JSON.parse(JSON.stringify(teamChecked)),
            savedAt: new Date().toISOString()
        };
    }
    function applyPresetAll(preset) {
        if (!preset) return;
        window.mission = JSON.parse(JSON.stringify(preset.personalEvents || {}));
        window.hardmission = JSON.parse(JSON.stringify(preset.teamEvents || {}));
        localStorage.setItem('personalEventsTable-checkedState', JSON.stringify(preset.personalCheckedState || {}));
        localStorage.setItem('teamEventsTable-checkedState', JSON.stringify(preset.teamCheckedState || {}));
        saveEventsToStorage();
        refreshEventManagement();
    }

    // 轻量提示（玻璃风格）替代 alert
    function showGlassToast(message, variant = 'info', duration = 1600) {
        const palette = {
            info:  { bg:'rgba(59,130,246,.22)', bd:'rgba(59,130,246,.35)' },
            success:{ bg:'rgba(34,197,94,.22)', bd:'rgba(34,197,94,.35)' },
            warn:  { bg:'rgba(234,179,8,.22)',  bd:'rgba(234,179,8,.35)' },
            error: { bg:'rgba(239,68,68,.22)',  bd:'rgba(239,68,68,.35)' }
        };
        const color = palette[variant] || palette.info;
        let container = document.getElementById('glassToastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'glassToastContainer';
            container.style.cssText = 'position:fixed;top:24px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;gap:10px;z-index:10010;pointer-events:none;';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.style.cssText = `
            pointer-events:auto; color:#fff; font-weight:600; letter-spacing:.2px;
            background:${color.bg}; backdrop-filter:blur(16px);
            border:1px solid ${color.bd}; border-radius:14px; padding:10px 14px; 
            box-shadow:0 8px 24px rgba(0,0,0,.22); opacity:0; transform:translateY(-6px);
            transition:opacity .25s ease, transform .25s ease; max-width:80vw; text-align:center;
        `;
        toast.textContent = message;
        container.appendChild(toast);
        requestAnimationFrame(()=>{ toast.style.opacity='1'; toast.style.transform='translateY(0)'; });
        setTimeout(()=>{
            toast.style.opacity='0'; toast.style.transform='translateY(-6px)';
            setTimeout(()=>{ toast.remove(); if (!container.children.length) container.remove(); }, 250);
        }, duration);
    }

    // 确认框，替代 confirm()
    function showGlassConfirm(message, onConfirm, opts = {}) {
        const { okText = '确定', cancelText = '取消', title = '提示', intent = 'ok' } = opts;
        const palette = {
            base:   { bg:'rgba(255,255,255,0.10)', bd:'rgba(255,255,255,0.22)' },
            ok:     { bg:'rgba(34,197,94,.25)',  bd:'rgba(34,197,94,.35)' },
            danger: { bg:'rgba(239,68,68,.25)',  bd:'rgba(239,68,68,.35)' },
            cancel: { bg:'rgba(148,163,184,.25)',bd:'rgba(148,163,184,.35)' }
        };
        const overlay = document.createElement('div');
        overlay.id = 'glassConfirmOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(5px);z-index:10020;display:flex;justify-content:center;align-items:center;opacity:0;transition:opacity .25s ease;';
        const box = document.createElement('div');
        box.style.cssText = `background:${palette.base.bg};backdrop-filter:blur(20px);border-radius:16px;border:1px solid ${palette.base.bd};padding:18px 16px;max-width:440px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,.22);transform:scale(.92);transition:transform .25s ease;`;
    const header = document.createElement('div'); header.textContent = title; header.style.cssText='color:#fff;font-weight:800;font-size:20px;letter-spacing:.3px;margin-bottom:8px;text-align:center;';
        const msg = document.createElement('div'); msg.textContent = message; msg.style.cssText = 'color:#fff;font-size:15px;line-height:1.7;margin-bottom:14px;opacity:.95;white-space:pre-line;';
        const btns = document.createElement('div'); btns.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;';
        const ok = document.createElement('button'); ok.className='icon-btn';
        const okPal = palette[intent] || palette.ok;
        ok.style.cssText = `min-width:88px;background:${okPal.bg};border:1px solid ${okPal.bd};`;
        const okLabel = document.createElement('div'); okLabel.className='btn-icon'; okLabel.textContent = okText; ok.appendChild(okLabel);
        const cancel = document.createElement('button'); cancel.className='icon-btn'; cancel.style.cssText = `min-width:88px;background:${palette.cancel.bg};border:1px solid ${palette.cancel.bd};`;
        const cancelLabel = document.createElement('div'); cancelLabel.className='btn-icon'; cancelLabel.textContent = cancelText; cancel.appendChild(cancelLabel);
        btns.appendChild(cancel); btns.appendChild(ok);
        box.appendChild(header); box.appendChild(msg); box.appendChild(btns); overlay.appendChild(box);

        function close(){ overlay.style.opacity='0'; box.style.transform='scale(.92)'; setTimeout(()=>overlay.remove(), 220); }
        cancel.addEventListener('click', close);
        ok.addEventListener('click', ()=>{ try{ onConfirm && onConfirm(); } finally { close(); } });
        overlay.addEventListener('click', (e)=>{ if(e.target===overlay) close(); });
        document.addEventListener('keydown', function onKey(e){ if(e.key==='Escape'){ close(); document.removeEventListener('keydown',onKey);} });

        document.body.appendChild(overlay);
        requestAnimationFrame(()=>{ overlay.style.opacity='1'; box.style.transform='scale(1)'; });
    }

    // 统计工具：返回 {enabled, total}
    function countEnabledTotal(eventsObj, checkedMap) {
        const keys = Object.keys(eventsObj || {});
        const total = keys.length;
        let enabled = 0;
        for (const k of keys) if (checkedMap && checkedMap[k]) enabled++;
        return { enabled, total };
    }

    // 预设管理弹窗
    function showPresetModal() {
        // 避免重复
        if (document.getElementById('presetOverlay')) return;
        const presets = loadPresets();
        const overlay = document.createElement('div');
        overlay.id = 'presetOverlay';
        overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(5px);z-index:10000;display:flex;justify-content:center;align-items:center;opacity:0;transition:opacity .3s ease;`;
        const modal = document.createElement('div');
        modal.style.cssText = `background:rgba(255,255,255,0.1);backdrop-filter:blur(20px);border-radius:20px;padding:24px;max-width:560px;width:92%;max-height:80vh;overflow:auto;box-shadow:0 8px 32px rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.2);transform:scale(.9);transition:transform .3s ease;position:relative;`;

        const title = document.createElement('h2');
        title.textContent = '事件预设';
        title.style.cssText = 'color:#fff;text-align:center;font-size:22px;font-weight:700;margin:0 0 14px;text-shadow:2px 2px 4px rgba(0,0,0,.3)';
        modal.appendChild(title);

    // 帮助按钮（左上角）
    const helpBtn = document.createElement('button');
    helpBtn.innerHTML = '？';
    helpBtn.title = '预设功能教程';
    helpBtn.style.cssText = 'position:absolute;top:12px;left:12px;background:rgba(255,255,255,.15);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.2);color:#fff;font-size:18px;font-weight:700;width:35px;height:35px;border-radius:50%;cursor:pointer;transition:all .3s;display:flex;align-items:center;justify-content:center;';
    helpBtn.addEventListener('mouseover',()=>{helpBtn.style.background='rgba(255,255,255,.25)';helpBtn.style.transform='scale(1.08)';helpBtn.style.borderColor='rgba(255,255,255,.3)';});
    helpBtn.addEventListener('mouseout',()=>{helpBtn.style.background='rgba(255,255,255,.15)';helpBtn.style.transform='scale(1)';helpBtn.style.borderColor='rgba(255,255,255,.2)';});
    helpBtn.addEventListener('click', showPresetHelpModal);
    modal.appendChild(helpBtn);

    const close = document.createElement('button');
        close.innerHTML = '✕';
        close.style.cssText = 'position:absolute;top:12px;right:12px;background:rgba(255,255,255,.15);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.2);color:#fff;font-size:18px;font-weight:700;width:35px;height:35px;border-radius:50%;cursor:pointer;transition:all .3s;display:flex;align-items:center;justify-content:center;';
        close.addEventListener('mouseover',()=>{close.style.background='rgba(255,255,255,.25)';close.style.transform='rotate(90deg) scale(1.1)';close.style.borderColor='rgba(255,255,255,.3)';});
        close.addEventListener('mouseout',()=>{close.style.background='rgba(255,255,255,.15)';close.style.transform='rotate(0) scale(1)';close.style.borderColor='rgba(255,255,255,.2)';});
        close.addEventListener('click', hidePresetModal);
        modal.appendChild(close);

        // 新建预设区域
        const createBox = document.createElement('div');
        createBox.style.cssText = 'display:flex;gap:8px;align-items:center;justify-content:center;margin:10px 0 16px;';
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = '输入预设名称';
        nameInput.style.cssText = 'flex:1;min-width:140px;max-width:260px;padding:8px 10px;border:1px solid rgba(255,255,255,.2);border-radius:10px;background:rgba(255,255,255,.1);color:#fff;outline:none;';
        const saveBtn = document.createElement('button');
        saveBtn.className = 'icon-btn';
        saveBtn.style.cssText = 'min-width:96px;background:rgba(99,102,241,.25);border:1px solid rgba(99,102,241,.35);';
        saveBtn.title = '保存当前为预设';
        const sbIcon = document.createElement('div'); sbIcon.className='btn-icon'; sbIcon.textContent='保存预设';
        saveBtn.appendChild(sbIcon);
        saveBtn.addEventListener('click', () => {
            const n = (nameInput.value||'').trim();
            if (!n) { showGlassToast('请输入预设名称','warn'); return; }
            const cur = snapshotAll();
            const list = loadPresets();
            list[n] = cur;
            savePresets(list);
            renderList();
            showGlassToast('已保存预设','success');
        });
        createBox.appendChild(nameInput);
        createBox.appendChild(saveBtn);
        modal.appendChild(createBox);

        // 预设列表
        const listWrap = document.createElement('div');
        listWrap.style.cssText = 'display:flex;flex-direction:column;gap:10px;';
        modal.appendChild(listWrap);

        function styleColored(btn, color) {
            const colors = {
                green: { bg:'rgba(34,197,94,.25)', bd:'rgba(34,197,94,.35)' },
                blue:  { bg:'rgba(59,130,246,.25)', bd:'rgba(59,130,246,.35)' },
                red:   { bg:'rgba(239,68,68,.25)', bd:'rgba(239,68,68,.35)' },
                slate: { bg:'rgba(148,163,184,.25)', bd:'rgba(148,163,184,.35)' }
            };
            const c = colors[color] || colors.slate;
            btn.style.minWidth = '80px';
            btn.style.background = c.bg;
            btn.style.border = `1px solid ${c.bd}`;
        }

        function renderList() {
            listWrap.innerHTML='';
            const list = loadPresets();
            const names = Object.keys(list);
            if (names.length===0){
                const empty = document.createElement('div');
                empty.textContent = '暂无预设';
                empty.style.cssText = 'color:#ddd;text-align:center;padding:12px;';
                listWrap.appendChild(empty);
                return;
            }
            names.forEach(n=>{
                const row = document.createElement('div');
                row.style.cssText = 'display:flex;align-items:center;gap:8px;justify-content:space-between;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:12px;padding:10px 12px;';
                const info = document.createElement('div');
                info.style.cssText = 'display:flex;flex-direction:column;color:#eee;';
                const title = document.createElement('div'); title.textContent = n;
                const time = document.createElement('small'); time.style.color='#bbb'; time.textContent = `保存于 ${new Date(list[n].savedAt||Date.now()).toLocaleString()}`;
                info.appendChild(title); info.appendChild(time);
                const actions = document.createElement('div'); actions.style.cssText='display:flex;gap:8px;'; actions.setAttribute('data-role','actions');
                const apply = document.createElement('button'); apply.className='icon-btn'; styleColored(apply,'green'); const ai=document.createElement('div'); ai.className='btn-icon'; ai.textContent='应用'; apply.appendChild(ai);
                apply.addEventListener('click', ()=>{
                    const p = list[n] || {};
                    const pc = countEnabledTotal(p.personalEvents||{}, p.personalCheckedState||{});
                    const tc = countEnabledTotal(p.teamEvents||{}, p.teamCheckedState||{});
                    const lines = `应用预设 "${n}" 将覆盖当前个人与团队事件及其启用状态，确定继续？\n\n将应用的数量：\n个人事件：${pc.enabled}/${pc.total}\n团队事件：${tc.enabled}/${tc.total}`;
                    showGlassConfirm(lines, ()=>{
                        applyPresetAll(list[n]);
                        hidePresetModal();
                        showGlassToast('已应用预设','success');
                    }, { okText:'应用', cancelText:'取消', title:'✅应用预设', intent:'ok' });
                });
                const update = document.createElement('button'); update.className='icon-btn'; styleColored(update,'blue'); const ui=document.createElement('div'); ui.className='btn-icon'; ui.textContent='更新'; update.appendChild(ui);
                update.addEventListener('click', ()=>{
                    const personalChecked = JSON.parse(localStorage.getItem('personalEventsTable-checkedState')||'{}');
                    const teamChecked = JSON.parse(localStorage.getItem('teamEventsTable-checkedState')||'{}');
                    const pc = countEnabledTotal(window.mission||{}, personalChecked);
                    const tc = countEnabledTotal(window.hardmission||{}, teamChecked);
                    const lines = `使用当前状态覆盖预设 "${n}"？\n\n当前事件数量：\n个人事件：${pc.enabled}/${pc.total}\n团队事件：${tc.enabled}/${tc.total}`;
                    showGlassConfirm(lines, ()=>{
                        const cur = snapshotAll();
                        const l = loadPresets(); l[n]=cur; savePresets(l); renderList(); showGlassToast('已更新预设','success');
                    }, { okText:'更新', cancelText:'取消', title:'🔄️更新预设', intent:'ok' });
                });
                const del = document.createElement('button'); del.className='icon-btn'; styleColored(del,'red'); const di=document.createElement('div'); di.className='btn-icon'; di.textContent='删除'; del.appendChild(di);
                del.addEventListener('click', ()=>{
                    showGlassConfirm(`删除预设 "${n}"？`, ()=>{
                        const l = loadPresets(); delete l[n]; savePresets(l); renderList(); showGlassToast('已删除预设','success');
                    }, { okText:'删除', cancelText:'取消', title:'🗑️删除预设', intent:'danger' });
                });
                actions.appendChild(apply); actions.appendChild(update); actions.appendChild(del);
                row.appendChild(info); row.appendChild(actions);
                listWrap.appendChild(row);
            });
        }
        // 根据窗口宽度动态调整列表项布局
        function applyResponsive(){
            const narrow = window.innerWidth < 512;
            Array.from(listWrap.children).forEach(row => {
                const actions = row.querySelector('[data-role="actions"]');
                if (!actions) return;
                if (narrow) {
                    row.style.flexDirection = 'column';
                    row.style.alignItems = 'stretch';
                    row.style.justifyContent = 'flex-start';
                    actions.style.marginTop = '8px';
                    actions.style.justifyContent = 'flex-start';
                    actions.style.flexWrap = 'wrap';
                } else {
                    row.style.flexDirection = 'row';
                    row.style.alignItems = 'center';
                    row.style.justifyContent = 'space-between';
                    actions.style.marginTop = '0';
                    actions.style.justifyContent = 'flex-start';
                    actions.style.flexWrap = 'nowrap';
                }
            });
        }
        renderList();
        applyResponsive();
        const onResize = () => applyResponsive();
        window.addEventListener('resize', onResize);
        overlay._onResize = onResize;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        requestAnimationFrame(()=>{ overlay.style.opacity='1'; modal.style.transform='scale(1)'; });
    }

    // 预设功能教程弹窗
    function showPresetHelpModal(){
        if (document.getElementById('presetHelpOverlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'presetHelpOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(5px);z-index:10015;display:flex;justify-content:center;align-items:center;opacity:0;transition:opacity .25s ease;';
        const modal = document.createElement('div');
        modal.style.cssText = 'background:rgba(255,255,255,0.12);backdrop-filter:blur(20px);border-radius:18px;padding:20px 18px;max-width:640px;width:92%;max-height:82vh;overflow:auto;border:1px solid rgba(255,255,255,0.22);box-shadow:0 8px 32px rgba(0,0,0,.24);transform:scale(.92);transition:transform .25s ease;position:relative;';

        const title = document.createElement('h3');
        title.textContent = '❓ 预设功能教程';
        title.style.cssText = 'color:#fff;text-align:center;font-size:20px;font-weight:800;margin:0 0 10px;letter-spacing:.3px;';
        modal.appendChild(title);

        const content = document.createElement('div');
        content.style.cssText = 'color:#eaeaea;font-size:14px;line-height:1.8;';
        const p1 = document.createElement('p'); p1.textContent = '预设用于一键保存/恢复事件列表与启用状态。';
        const list = document.createElement('ul'); list.style.margin='8px 0 0 18px'; list.style.padding='0'; list.style.listStyle='disc';
        function li(text){ const el=document.createElement('li'); el.textContent=text; el.style.margin='6px 0'; return el; }
        list.appendChild(li('在“输入预设名称”后点「保存预设」即可自动读取当前的所有事件和启用状态创建预设。'));
        list.appendChild(li('「应用」会使用预设内容覆盖当前的事件与启用状态。'));
        list.appendChild(li('「更新」会用当前的事件与启用状态覆盖该预设内容。'));
        list.appendChild(li('「删除」将从本地清除该预设。'));
        list.appendChild(li('数据保存在浏览器缓存中，清理缓存后数据将丢失！'));
        const p2 = document.createElement('p');
        content.appendChild(p1); content.appendChild(list); content.appendChild(p2);
        modal.appendChild(content);

        const close = document.createElement('button');
        close.innerHTML = '✕';
        close.style.cssText = 'position:absolute;top:10px;right:10px;background:rgba(255,255,255,.15);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.2);color:#fff;font-size:16px;font-weight:700;width:32px;height:32px;border-radius:50%;cursor:pointer;transition:all .25s;display:flex;align-items:center;justify-content:center;';
        close.addEventListener('mouseover',()=>{close.style.background='rgba(255,255,255,.25)';close.style.transform='rotate(90deg) scale(1.06)';close.style.borderColor='rgba(255,255,255,.3)';});
        close.addEventListener('mouseout',()=>{close.style.background='rgba(255,255,255,.15)';close.style.transform='rotate(0) scale(1)';close.style.borderColor='rgba(255,255,255,.2)';});
        close.addEventListener('click', hidePresetHelpModal);
        modal.appendChild(close);

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        requestAnimationFrame(()=>{ overlay.style.opacity='1'; modal.style.transform='scale(1)'; });
    }
    function hidePresetHelpModal(){
        const overlay = document.getElementById('presetHelpOverlay');
        if (!overlay) return;
        overlay.style.opacity='0';
        const modal = overlay.firstElementChild; if (modal) modal.style.transform='scale(.92)';
        setTimeout(()=> overlay.remove(), 220);
    }
    function hidePresetModal(){
        const overlay = document.getElementById('presetOverlay');
        if (!overlay) return;
        if (overlay._onResize) {
            window.removeEventListener('resize', overlay._onResize);
        }
        overlay.style.opacity='0';
        const modal = overlay.firstElementChild; if (modal) modal.style.transform='scale(.9)';
        setTimeout(()=>{ overlay.remove(); }, 250);
    }
    // 右键菜单已移除，相关状态变量删除
    // 搜索（表格版，兼容旧结构；已去除右键/动画逻辑）
    function setupEventSearch(inputId, tableSelector) {
        const searchInput = document.getElementById(inputId);
        if (!searchInput) return;
        const hasPinyin = typeof window.pinyinPro?.pinyin === 'function';
        const toInitials = (text) => {
            if (!hasPinyin || !text) return '';
            try {
                return window.pinyinPro.pinyin(text, { pattern: 'initial', toneType: 'none', type: 'array' }).join('').toLowerCase();
            } catch { return ''; }
        };
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.trim().toLowerCase();
            const table = document.querySelector(tableSelector);
            const tbody = table ? table.querySelector('tbody') || table : null;
            if (!tbody) return;
            const rows = tbody.querySelectorAll('tr');
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                const match = !searchTerm || text.includes(searchTerm) || toInitials(text).includes(searchTerm);
                row.style.display = match ? '' : 'none';
            });
        });
    }

    // 搜索（卡片版）
    function setupEventCardSearch(inputId, gridSelector) {
        const input = document.getElementById(inputId);
        const grid = document.querySelector(gridSelector);
        if (!input || !grid) return;
        const hasPinyin = typeof window.pinyinPro?.pinyin === 'function';
        const toInitials = (text) => {
            if (!hasPinyin || !text) return '';
            try {
                return window.pinyinPro.pinyin(text, { pattern: 'initial', toneType: 'none', type: 'array' }).join('').toLowerCase();
            } catch { return ''; }
        };
        const escapeHTML = (s = '') => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
        const highlightPlain = (text = '', term = '') => {
            if (!term) return escapeHTML(text);
            const lowerText = text.toLowerCase();
            const lowerTerm = term.toLowerCase();
            if (!lowerTerm) return escapeHTML(text);
            let idx = 0, out = '';
            while (true) {
                const pos = lowerText.indexOf(lowerTerm, idx);
                if (pos === -1) { out += escapeHTML(text.slice(idx)); break; }
                out += escapeHTML(text.slice(idx, pos));
                const match = text.slice(pos, pos + term.length);
                out += `<span class="search-highlight">${escapeHTML(match)}</span>`;
                idx = pos + term.length;
            }
            return out;
        };
        // 计算拼音首字母字符串与字符索引映射
        const computeInitialsMap = (text = '') => {
            if (!hasPinyin || !text) return { initials: '', map: [] };
            try {
                const arr = window.pinyinPro.pinyin(text, { pattern: 'initial', toneType: 'none', type: 'array' });
                let initials = '';
                const map = [];
                arr.forEach((seg, idx) => {
                    const piece = String(seg || '').toLowerCase();
                    for (let k = 0; k < piece.length; k++) {
                        initials += piece[k];
                        map.push(idx);
                    }
                });
                return { initials, map };
            } catch {
                return { initials: '', map: [] };
            }
        };
        const wrapByCharIndices = (text = '', indicesSet) => {
            const chars = Array.from(text);
            let out = '';
            for (let i = 0; i < chars.length; i++) {
                const ch = chars[i];
                if (indicesSet.has(i)) out += `<span class="search-highlight">${escapeHTML(ch)}</span>`;
                else out += escapeHTML(ch);
            }
            return out;
        };
        const highlightByPinyin = (text = '', term = '') => {
            if (!term) return null;
            const { initials, map } = computeInitialsMap(text);
            if (!initials) return null;
            const lowerTerm = term.toLowerCase();
            const pos = initials.indexOf(lowerTerm);
            if (pos === -1) return null;
            const covered = map.slice(pos, pos + lowerTerm.length);
            const indicesSet = new Set(covered);
            return wrapByCharIndices(text, indicesSet);
        };
    input.oninput = () => {
            const term = input.value.trim().toLowerCase();
            const cards = grid.querySelectorAll('.shared-event-card');
            cards.forEach(card => {
                const titleEl = card.querySelector('.shared-card-title');
                const contentEl = card.querySelector('.shared-card-content');
                const placeholderLis = Array.from(card.querySelectorAll('.shared-card-placeholders li'));
                const title = titleEl?.textContent || '';
                const content = contentEl?.textContent || '';
                const placeholders = placeholderLis.map(li => li.textContent).join(' ');
                const text = `${title}\n${content}\n${placeholders}`.toLowerCase();
                const match = !term || text.includes(term) || toInitials(text).includes(term);
        // 启用状态筛选
        const type = card.dataset.type || (gridSelector.includes('personal') ? 'personal' : 'team');
        const mode = statusFilter[type] || 'all';
        const enabledChecked = !!card.querySelector('.enable-checkbox')?.checked;
        let statusOk = true;
        if (mode === 'enabled') statusOk = enabledChecked;
        else if (mode === 'disabled') statusOk = !enabledChecked;
        const visible = match && statusOk;
        card.style.display = visible ? '' : 'none';

                // 恢复原文缓存
                if (titleEl && !titleEl.dataset.original) titleEl.dataset.original = title;
                if (contentEl && !contentEl.dataset.original) contentEl.dataset.original = content;
                placeholderLis.forEach(li => {
                    const nameEl = li.querySelector('strong');
                    const valuesEl = li.querySelector('.ph-values');
                    if (nameEl && !nameEl.dataset.original) nameEl.dataset.original = nameEl.textContent;
                    if (valuesEl && !valuesEl.dataset.original) valuesEl.dataset.original = valuesEl.textContent;
                });

                // 高亮：优先文本直接匹配；若无文本命中则尝试拼音首字母匹配
                const rawTerm = input.value.trim();
                if (rawTerm) {
                    const apply = (el, original) => {
                        if (!el) return;
                        let html = highlightPlain(original, rawTerm);
                        if (!html.includes('search-highlight')) {
                            const pinHtml = highlightByPinyin(original, rawTerm);
                            if (pinHtml) html = pinHtml;
                        }
                        el.innerHTML = html;
                    };
                    if (titleEl) apply(titleEl, titleEl.dataset.original || '');
                    if (contentEl) apply(contentEl, contentEl.dataset.original || '');
                    placeholderLis.forEach(li => {
                        const nameEl = li.querySelector('strong');
                        const valuesEl = li.querySelector('.ph-values');
                        if (nameEl) apply(nameEl, nameEl.dataset.original || nameEl.textContent || '');
                        if (valuesEl) apply(valuesEl, valuesEl.dataset.original || valuesEl.textContent || '');
                    });
                } else {
                    // 清空搜索时恢复原文
                    if (titleEl) titleEl.textContent = titleEl.dataset.original || titleEl.textContent;
                    if (contentEl) contentEl.textContent = contentEl.dataset.original || contentEl.textContent;
                    placeholderLis.forEach(li => {
                        const nameEl = li.querySelector('strong');
                        const valuesEl = li.querySelector('.ph-values');
                        if (nameEl && nameEl.dataset.original) nameEl.textContent = nameEl.dataset.original;
                        if (valuesEl && valuesEl.dataset.original) valuesEl.textContent = valuesEl.dataset.original;
                    });
                }
            });
        };
    }

    // 根据当前搜索与状态筛选刷新可见性
    function refreshGridVisibilityForType(type) {
        try {
            const input = document.getElementById('eventSearchInput');
            if (input && typeof input.oninput === 'function') {
                input.oninput();
                return;
            }
            const gridId = type === 'personal' ? 'personalEventsGrid' : 'teamEventsGrid';
            const grid = document.getElementById(gridId);
            if (!grid) return;
            const mode = statusFilter[type] || 'all';
            const cards = grid.querySelectorAll('.shared-event-card');
            cards.forEach(card => {
                const enabledChecked = !!card.querySelector('.enable-checkbox')?.checked;
                let statusOk = true;
                if (mode === 'enabled') statusOk = enabledChecked;
                else if (mode === 'disabled') statusOk = !enabledChecked;
                card.style.display = statusOk ? '' : 'none';
            });
        } catch {}
    }

    // 卡片渲染
    function populateCards(grid, tasks, type) {
        if (!grid) return;
        grid.innerHTML = '';
        const keys = Object.keys(tasks || {});
        if (keys.length === 0) {
            grid.innerHTML = '<p class="shared-events-empty">暂无事件</p>';
            updateEnabledCountForCards(type, 0, 0);
            return;
        }
        const tableId = type === 'personal' ? 'personalEventsTable' : 'teamEventsTable';
        const savedState = JSON.parse(localStorage.getItem(`${tableId}-checkedState`) || '{}');

        keys.forEach(title => {
            const event = tasks[title] || {};
            const card = document.createElement('div');
            card.className = 'shared-event-card';
            card.dataset.type = type;
            card.dataset.title = title;

            let placeholdersHtml = '';
        if (event.placeholders && Object.keys(event.placeholders).length > 0) {
                placeholdersHtml += '<ul class="shared-card-placeholders">';
                for (const ph in event.placeholders) {
            const values = Array.isArray(event.placeholders[ph]) ? event.placeholders[ph].join(', ') : String(event.placeholders[ph] ?? '');
            placeholdersHtml += `<li><strong class="ph-name">[${ph}]</strong>: <span class="ph-values">${values}</span></li>`;
                }
                placeholdersHtml += '</ul>';
            }

            const checked = savedState[title] !== undefined ? !!savedState[title] : true;
            card.innerHTML = `
                <div class="shared-card-header">
                    <div class="card-header-line" style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                        <h4 class="shared-card-title" style="margin:0;">${title}</h4>
                        <label class="custom-checkbox" title="启用/禁用">
                            <input type="checkbox" class="enable-checkbox" ${checked ? 'checked' : ''} data-key="${title}">
                            <span class="checkmark"></span>
                        </label>
                    </div>
                </div>
                <p class="shared-card-content">${event.内容 || ''}</p>
                ${placeholdersHtml}
                <div class="shared-card-footer" style="display:flex;gap:8px;justify-content:flex-end;">
                    <button class="shared-card-btn edit-btn" title="编辑">编辑</button>
                    <button class="shared-card-btn delete-btn" title="删除">删除</button>
                </div>
            `;

            // 初始状态样式：未启用的事件卡片添加明显区分
            if (!checked) {
                card.classList.add('disabled');
            }

            // 绑定启用勾选
            const checkbox = card.querySelector('.enable-checkbox');
            checkbox.addEventListener('change', () => {
                const state = JSON.parse(localStorage.getItem(`${tableId}-checkedState`) || '{}');
                state[title] = checkbox.checked;
                localStorage.setItem(`${tableId}-checkedState`, JSON.stringify(state));
                // 切换未启用样式
                card.classList.toggle('disabled', !checkbox.checked);
                updateEnabledCountForCards(type);
                // 若当前存在状态筛选，需立即应用
                refreshGridVisibilityForType(type);
            });

            // 编辑
            card.querySelector('.edit-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                openEventModal(type, title);
            });

            // 删除
            card.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`确定要删除事件 "${title}" 吗？`)) {
                    deleteEventDirect(type, title);
                }
            });

            grid.appendChild(card);
        });

        updateEnabledCountForCards(type);
    }

    function updateEnabledCountForCards(type, forcedEnabled = null, forcedTotal = null) {
        const tableId = type === 'personal' ? 'personalEventsTable' : 'teamEventsTable';
        const counterId = type === 'personal' ? 'personalEnabledCount' : 'teamEnabledCount';
        const tasks = type === 'personal' ? (window.mission || {}) : (window.hardmission || {});
        const total = forcedTotal !== null ? forcedTotal : Object.keys(tasks).length;
        const savedState = JSON.parse(localStorage.getItem(`${tableId}-checkedState`) || '{}');
        let enabled = forcedEnabled !== null ? forcedEnabled : 0;
        if (forcedEnabled === null) {
            enabled = Object.keys(tasks).reduce((acc, k) => acc + (savedState[k] !== undefined ? (savedState[k] ? 1 : 0) : 1), 0);
        }
        const el = document.getElementById(counterId);
        if (el) el.textContent = `已启用：${enabled}/${total}`;
    }

    // 批量选择：mode = 'toggleAll' | 'invert'；onlyVisible=true 时仅作用于当前显示的卡片（受搜索过滤影响）
    function bulkToggleSelection(type, mode = 'toggleAll', onlyVisible = true) {
        const gridId = type === 'personal' ? 'personalEventsGrid' : 'teamEventsGrid';
        const tableId = type === 'personal' ? 'personalEventsTable' : 'teamEventsTable';
        const grid = document.getElementById(gridId);
        if (!grid) return;
        const cards = Array.from(grid.querySelectorAll('.shared-event-card'))
            .filter(card => !onlyVisible || card.style.display !== 'none');
        if (cards.length === 0) return;

        const savedState = JSON.parse(localStorage.getItem(`${tableId}-checkedState`) || '{}');
        const checkboxes = cards.map(card => ({
            card,
            title: card.dataset.title,
            el: card.querySelector('.enable-checkbox')
        })).filter(x => x.el);

        // 计算目标状态
        let op; // function(current:boolean) => boolean
        if (mode === 'invert') {
            op = (cur) => !cur;
        } else {
            const allChecked = checkboxes.every(x => x.el.checked || savedState[x.title] === true || savedState[x.title] === undefined);
            const target = !allChecked; // 若全选则全不选，否则全选
            op = () => target;
        }

        // 应用更改
        checkboxes.forEach(({ card, title, el }) => {
            const next = op(el.checked);
            el.checked = next;
            savedState[title] = next;
            card.classList.toggle('disabled', !next);
        });
        localStorage.setItem(`${tableId}-checkedState`, JSON.stringify(savedState));
        updateEnabledCountForCards(type);
    }

    // 表格回退渲染（供旧页面或其他模块调用）
    function populateTable(table, tasks, tableId) {
        if (!table) return;
        table.innerHTML = '';
        const tbody = table.tagName.toLowerCase() === 'tbody' ? table : table.querySelector('tbody') || table;
        const savedState = JSON.parse(localStorage.getItem(`${tableId}-checkedState`) || '{}');
        Object.keys(tasks || {}).forEach(key => {
            const row = document.createElement('tr');
            const enableCell = document.createElement('td');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = savedState[key] !== undefined ? !!savedState[key] : true;
            checkbox.dataset.key = key;
            checkbox.addEventListener('change', () => {
                const state = JSON.parse(localStorage.getItem(`${tableId}-checkedState`) || '{}');
                state[key] = checkbox.checked;
                localStorage.setItem(`${tableId}-checkedState`, JSON.stringify(state));
            });
            enableCell.appendChild(checkbox);
            const titleCell = document.createElement('td');
            const contentCell = document.createElement('td');
            titleCell.textContent = key;
            contentCell.textContent = tasks[key]?.内容 || '';
            row.appendChild(enableCell);
            row.appendChild(titleCell);
            row.appendChild(contentCell);
            tbody.appendChild(row);
        });
    }

    // 事件数据存取（仅使用原始键名：missions / hardmissions）
    function saveEventsToStorage() {
        try {
            localStorage.setItem('missions', JSON.stringify(window.mission || {}));
            localStorage.setItem('hardmissions', JSON.stringify(window.hardmission || {}));
        } catch (e) {
            console.warn('保存事件到本地存储失败:', e);
        }
    }

    function loadEventsFromStorage() {
        try {
            const personal = JSON.parse(localStorage.getItem('missions') || 'null');
            const team = JSON.parse(localStorage.getItem('hardmissions') || 'null');
            if (personal && typeof personal === 'object') {
                window.mission = personal;
            }
            if (team && typeof team === 'object') {
                window.hardmission = team;
            }
        } catch (e) {
            console.warn('从本地存储加载事件失败:', e);
        }
    }

    // 生成事件管理内容（改为卡片样式）
    function loadEventManagement() {
        const container = document.createElement('div');
        container.style.width = '100%';
        container.style.height = '100%';
        
        // 创建头部区域
        const header = document.createElement('div');
        header.style.marginBottom = '20px';
        header.style.textAlign = 'center';
        
        const instructionText = document.createElement('div');
        instructionText.style.fontSize = '14px';
        instructionText.style.color = 'rgb(197, 197, 197)';
        instructionText.style.marginBottom = '10px';
        header.appendChild(instructionText);
        
        // 创建毛玻璃切换按钮
        const radioContainer = document.createElement('div');
        radioContainer.className = 'glassmorphism-radio-inputs';
        
        // 个人事件选项
        const personalLabel = document.createElement('label');
        personalLabel.className = 'radio';
        
        const personalRadio = document.createElement('input');
        personalRadio.type = 'radio';
        personalRadio.name = 'eventType';
        personalRadio.id = 'personalEventsRadio';
        personalRadio.checked = true;
        
        const personalSpan = document.createElement('span');
        personalSpan.className = 'radio-item';
        personalSpan.textContent = '个人事件';
        
        personalLabel.appendChild(personalRadio);
        personalLabel.appendChild(personalSpan);
        
        // 团队事件选项
        const teamLabel = document.createElement('label');
        teamLabel.className = 'radio';
        
        const teamRadio = document.createElement('input');
        teamRadio.type = 'radio';
        teamRadio.name = 'eventType';
        teamRadio.id = 'teamEventsRadio';
        
        const teamSpan = document.createElement('span');
        teamSpan.className = 'radio-item';
        teamSpan.textContent = '团队事件';
        
        teamLabel.appendChild(teamRadio);
        teamLabel.appendChild(teamSpan);
        
        radioContainer.appendChild(personalLabel);
        radioContainer.appendChild(teamLabel);

        // 创建主控制容器，包含所有按钮和搜索框
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'event-management-container';
        
        // 1. 个人/团队切换按钮 (放在最上面)
        controlsContainer.appendChild(radioContainer);
        
        // 2. 小图标按钮区域
        const iconButtonsContainer = document.createElement('div');
        iconButtonsContainer.className = 'icon-buttons-container';
        
        // 创建小图标按钮的函数
        function createIconButton(id, iconSvg, tooltip, className) {
            const button = document.createElement('button');
            button.id = id;
            button.className = `icon-btn ${className}`;
            button.title = tooltip; // 使用title属性作为工具提示
            
            const icon = document.createElement('div');
            icon.className = 'btn-icon';
            icon.innerHTML = iconSvg;
            
            button.appendChild(icon);
            
            return button;
        }
        
        // 添加个人事件按钮
        const addPersonalButton = createIconButton(
            'addPersonalButton',
            `<svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
            </svg>`,
            '添加个人事件',
            'add-btn'
        );
        addPersonalButton.style.display = 'flex';
        addPersonalButton.addEventListener('click', () => openEventModal('personal'));
        iconButtonsContainer.appendChild(addPersonalButton);
        
        // 添加团队事件按钮
        const addTeamButton = createIconButton(
            'addTeamButton',
            `<svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
            </svg>`,
            '添加团队事件',
            'add-btn'
        );
        addTeamButton.style.display = 'none';
        addTeamButton.addEventListener('click', () => openEventModal('team'));
        iconButtonsContainer.appendChild(addTeamButton);
        
        // 导出事件按钮
        const exportAllButton = createIconButton(
            'exportAllButton',
            `<svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                <path d="M12,11L16,15H13V19H11V15H8L12,11Z"/>
            </svg>`,
            '导出事件',
            'export-btn'
        );
        exportAllButton.addEventListener('click', exportAllEvents);
        iconButtonsContainer.appendChild(exportAllButton);
        
        // 导入事件按钮
        const importAllButton = createIconButton(
            'importAllButton',
            `<svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                <path d="M12,17L8,13H11V9H13V13H16L12,17Z"/>
            </svg>`,
            '导入事件',
            'import-btn'
        );
        importAllButton.addEventListener('click', importAllEvents);
        iconButtonsContainer.appendChild(importAllButton);

        // 全选/全不选（二合一）按钮
                const toggleSelectButton = createIconButton(
                        'toggleSelectButton',
                        `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                            <title>tasks</title>
                            <g fill="none">
                                <path d="M9.27314 1.65681C11.4366 1.07711 12.5185 0.786442 13.4577 0.985911C14.284 1.16154 15.0341 1.59449 15.5993 2.22224C16.2419 2.93589 16.5312 4.01836 17.111 6.1822L17.9392 9.27302C18.0796 9.79721 18.2028 10.258 18.3063 10.6685C18.8715 10.3738 19.5855 10.4646 20.0603 10.939C20.646 11.5248 20.646 12.4743 20.0603 13.0601L14.5603 18.5601C13.9745 19.1459 13.0249 19.1459 12.4392 18.5601L11.5017 17.6226L10.3229 17.939C8.15947 18.5187 7.07759 18.8094 6.13838 18.6099C5.31212 18.4343 4.562 18.0014 3.99678 17.3736C3.35422 16.66 3.06486 15.5775 2.48506 13.4136L1.65693 10.3228C1.07723 8.15934 0.786562 7.07747 0.986035 6.13825C1.16166 5.312 1.59462 4.56188 2.22236 3.99665C2.93602 3.35412 4.01851 3.06473 6.18232 2.48493L9.27314 1.65681Z" fill="url(#1752500502808-546714_tasks_existing_0_b87x1rwj4)" data-glass="origin" mask="url(#1752500502808-546714_tasks_mask_lnek3qiiw)"></path>
                                <path d="M9.27314 1.65681C11.4366 1.07711 12.5185 0.786442 13.4577 0.985911C14.284 1.16154 15.0341 1.59449 15.5993 2.22224C16.2419 2.93589 16.5312 4.01836 17.111 6.1822L17.9392 9.27302C18.0796 9.79721 18.2028 10.258 18.3063 10.6685C18.8715 10.3738 19.5855 10.4646 20.0603 10.939C20.646 11.5248 20.646 12.4743 20.0603 13.0601L14.5603 18.5601C13.9745 19.1459 13.0249 19.1459 12.4392 18.5601L11.5017 17.6226L10.3229 17.939C8.15947 18.5187 7.07759 18.8094 6.13838 18.6099C5.31212 18.4343 4.562 18.0014 3.99678 17.3736C3.35422 16.66 3.06486 15.5775 2.48506 13.4136L1.65693 10.3228C1.07723 8.15934 0.786562 7.07747 0.986035 6.13825C1.16166 5.312 1.59462 4.56188 2.22236 3.99665C2.93602 3.35412 4.01851 3.06473 6.18232 2.48493L9.27314 1.65681Z" fill="url(#1752500502808-546714_tasks_existing_0_b87x1rwj4)" data-glass="clone" filter="url(#1752500502808-546714_tasks_filter_js25kvyuv)" clip-path="url(#1752500502808-546714_tasks_clipPath_wvsdi5iv7)"></path>
                                <path d="M16.0996 6.5C18.3398 6.5 19.4608 6.49957 20.3164 6.93555C21.0689 7.31902 21.681 7.93109 22.0645 8.68359C22.5004 9.53924 22.5 10.6602 22.5 12.9004V16.0996C22.5 18.3398 22.5004 19.4608 22.0645 20.3164C21.681 21.0689 21.0689 21.681 20.3164 22.0645C19.4608 22.5004 18.3398 22.5 16.0996 22.5H12.9004C10.6602 22.5 9.53924 22.5004 8.68359 22.0645C7.93109 21.681 7.31902 21.0689 6.93555 20.3164C6.49957 19.4608 6.5 18.3398 6.5 16.0996V12.9004C6.5 10.6602 6.49957 9.53924 6.93555 8.68359C7.31902 7.93109 7.93109 7.31902 8.68359 6.93555C9.53924 6.49957 10.6602 6.5 12.9004 6.5H16.0996ZM19.707 11.293C19.3165 10.9024 18.6835 10.9024 18.293 11.293L13.5 16.0859L11.707 14.293L11.6309 14.2246C11.2381 13.9043 10.6591 13.9269 10.293 14.293C9.90244 14.6835 9.90244 15.3165 10.293 15.707L12.793 18.207C13.1835 18.5976 13.8165 18.5976 14.207 18.207L19.707 12.707C20.0976 12.3165 20.0976 11.6835 19.707 11.293Z" fill="url(#1752500502808-546714_tasks_existing_1_zvuzizccf)" data-glass="blur"></path>
                                <path d="M16.0996 21.75V22.5H12.9004V21.75H16.0996ZM21.75 16.0996V12.9004C21.75 11.768 21.7497 10.9633 21.6982 10.334C21.6475 9.71336 21.5506 9.32889 21.3955 9.02441C21.0839 8.41304 20.587 7.91605 19.9756 7.60449C19.6711 7.44936 19.2866 7.35247 18.666 7.30176C18.0367 7.25035 17.232 7.25 16.0996 7.25H12.9004C11.768 7.25 10.9633 7.25035 10.334 7.30176C9.71336 7.35247 9.32889 7.44936 9.02441 7.60449C8.41304 7.91605 7.91605 8.41304 7.60449 9.02441C7.44936 9.32889 7.35247 9.71336 7.30176 10.334C7.25035 10.9633 7.25 11.768 7.25 12.9004V16.0996C7.25 17.232 7.25035 18.0367 7.30176 18.666C7.35247 19.2866 7.44936 19.6711 7.60449 19.9756C7.91605 20.587 8.41304 21.0839 9.02441 21.3955C9.32889 21.5506 9.71336 21.6475 10.334 21.6982C10.9633 21.7497 11.768 21.75 12.9004 21.75V22.5L11.416 22.4932C10.2243 22.4744 9.46088 22.4041 8.84766 22.1406L8.68359 22.0645C8.02512 21.7289 7.47413 21.2183 7.08984 20.5918L6.93555 20.3164C6.49957 19.4608 6.5 18.3398 6.5 16.0996V12.9004C6.5 10.6602 6.49957 9.53924 6.93555 8.68359C7.31902 7.93109 7.93109 7.31902 8.68359 6.93555C9.32525 6.60861 10.1161 6.52728 11.416 6.50684L12.9004 6.5H16.0996C18.3398 6.5 19.4608 6.49957 20.3164 6.93555C21.0689 7.31902 21.681 7.93109 22.0645 8.68359C22.5004 9.53924 22.5 10.6602 22.5 12.9004V16.0996C22.5 18.3398 22.5004 19.4608 22.0645 20.3164L21.9102 20.5918C21.5259 21.2183 20.9749 21.7289 20.3164 22.0645L20.1523 22.1406C19.316 22.4999 18.1999 22.5 16.0996 22.5V21.75C17.232 21.75 18.0367 21.7497 18.666 21.6982C19.2866 21.6475 19.6711 21.5506 19.9756 21.3955C20.587 21.0839 21.0839 20.587 21.3955 19.9756C21.5506 19.6711 21.6475 19.2866 21.6982 18.666C21.7497 18.0367 21.75 17.232 21.75 16.0996Z" fill="url(#1752500502808-546714_tasks_existing_2_rwjcgbppv)"></path>
                                <defs>
                                    <linearGradient id="1752500502808-546714_tasks_existing_0_b87x1rwj4" x1="10.711" y1=".923" x2="10.711" y2="19" gradientUnits="userSpaceOnUse">
                                        <stop stop-color="#575757"></stop>
                                        <stop offset="1" stop-color="#151515"></stop>
                                    </linearGradient>
                                    <linearGradient id="1752500502808-546714_tasks_existing_1_zvuzizccf" x1="14.5" y1="6.5" x2="14.5" y2="22.5" gradientUnits="userSpaceOnUse">
                                        <stop stop-color="#E3E3E5" stop-opacity=".6"></stop>
                                        <stop offset="1" stop-color="#BBBBC0" stop-opacity=".6"></stop>
                                    </linearGradient>
                                    <linearGradient id="1752500502808-546714_tasks_existing_2_rwjcgbppv" x1="14.5" y1="6.5" x2="14.5" y2="15.766" gradientUnits="userSpaceOnUse">
                                        <stop stop-color="#fff"></stop>
                                        <stop offset="1" stop-color="#fff" stop-opacity="0"></stop>
                                    </linearGradient>
                                    <filter id="1752500502808-546714_tasks_filter_js25kvyuv" x="-100%" y="-100%" width="400%" height="400%" filterUnits="objectBoundingBox" primitiveUnits="userSpaceOnUse">
                                        <feGaussianBlur stdDeviation="2" x="0%" y="0%" width="100%" height="100%" in="SourceGraphic" edgeMode="none" result="blur"></feGaussianBlur>
                                    </filter>
                                    <clipPath id="1752500502808-546714_tasks_clipPath_wvsdi5iv7">
                                        <path d="M16.0996 6.5C18.3398 6.5 19.4608 6.49957 20.3164 6.93555C21.0689 7.31902 21.681 7.93109 22.0645 8.68359C22.5004 9.53924 22.5 10.6602 22.5 12.9004V16.0996C22.5 18.3398 22.5004 19.4608 22.0645 20.3164C21.681 21.0689 21.0689 21.681 20.3164 22.0645C19.4608 22.5004 18.3398 22.5 16.0996 22.5H12.9004C10.6602 22.5 9.53924 22.5004 8.68359 22.0645C7.93109 21.681 7.31902 21.0689 6.93555 20.3164C6.49957 19.4608 6.5 18.3398 6.5 16.0996V12.9004C6.5 10.6602 6.49957 9.53924 6.93555 8.68359C7.31902 7.93109 7.93109 7.31902 8.68359 6.93555C9.53924 6.49957 10.6602 6.5 12.9004 6.5H16.0996ZM19.707 11.293C19.3165 10.9024 18.6835 10.9024 18.293 11.293L13.5 16.0859L11.707 14.293L11.6309 14.2246C11.2381 13.9043 10.6591 13.9269 10.293 14.293C9.90244 14.6835 9.90244 15.3165 10.293 15.707L12.793 18.207C13.1835 18.5976 13.8165 18.5976 14.207 18.207L19.707 12.707C20.0976 12.3165 20.0976 11.6835 19.707 11.293Z" fill="url(#1752500502808-546714_tasks_existing_1_zvuzizccf)"></path>
                                    </clipPath>
                                    <mask id="1752500502808-546714_tasks_mask_lnek3qiiw">
                                        <rect width="100%" height="100%" fill="#FFF"></rect>
                                        <path d="M16.0996 6.5C18.3398 6.5 19.4608 6.49957 20.3164 6.93555C21.0689 7.31902 21.681 7.93109 22.0645 8.68359C22.5004 9.53924 22.5 10.6602 22.5 12.9004V16.0996C22.5 18.3398 22.5004 19.4608 22.0645 20.3164C21.681 21.0689 21.0689 21.681 20.3164 22.0645C19.4608 22.5004 18.3398 22.5 16.0996 22.5H12.9004C10.6602 22.5 9.53924 22.5004 8.68359 22.0645C7.93109 21.681 7.31902 21.0689 6.93555 20.3164C6.49957 19.4608 6.5 18.3398 6.5 16.0996V12.9004C6.5 10.6602 6.49957 9.53924 6.93555 8.68359C7.31902 7.93109 7.93109 7.31902 8.68359 6.93555C9.53924 6.49957 10.6602 6.5 12.9004 6.5H16.0996ZM19.707 11.293C19.3165 10.9024 18.6835 10.9024 18.293 11.293L13.5 16.0859L11.707 14.293L11.6309 14.2246C11.2381 13.9043 10.6591 13.9269 10.293 14.293C9.90244 14.6835 9.90244 15.3165 10.293 15.707L12.793 18.207C13.1835 18.5976 13.8165 18.5976 14.207 18.207L19.707 12.707C20.0976 12.3165 20.0976 11.6835 19.707 11.293Z" fill="#000"></path>
                                    </mask>
                                </defs>
                            </g>
                        </svg>`,
                        '全选/全不选（按一次全选，再按全不选；对当前显示卡片生效）',
                        'select-toggle-btn'
                );
        toggleSelectButton.addEventListener('click', () => {
            const type = isShowingPersonal ? 'personal' : 'team';
            bulkToggleSelection(type, 'toggleAll', true);
        });
        iconButtonsContainer.appendChild(toggleSelectButton);

        // 反选按钮
                const invertSelectButton = createIconButton(
                        'invertSelectButton',
                        `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                            <title>arrows-bold-opposite-direction</title>
                            <g fill="none">
                                <path d="M12 15.1099V12.134H18.5C19.3284 12.134 20 11.4624 20 10.634L20 6.63397C20 5.80555 19.3284 5.13398 18.5 5.13398L12 5.13398V2.15802C12 0.917543 10.58 0.213184 9.59238 0.963774L1.07138 7.43974C0.281546 8.04001 0.281546 9.22795 1.07138 9.82822L9.59238 16.3042C10.58 17.0548 12 16.3504 12 15.1099Z" fill="url(#1752500502765-1219022_arrows-bold-opposite-direction_existing_0_ng1mkmgk8)" data-glass="origin" mask="url(#1752500502765-1219022_arrows-bold-opposite-direction_mask_m1tbxjjqc)"></path>
                                <path d="M12 15.1099V12.134H18.5C19.3284 12.134 20 11.4624 20 10.634L20 6.63397C20 5.80555 19.3284 5.13398 18.5 5.13398L12 5.13398V2.15802C12 0.917543 10.58 0.213184 9.59238 0.963774L1.07138 7.43974C0.281546 8.04001 0.281546 9.22795 1.07138 9.82822L9.59238 16.3042C10.58 17.0548 12 16.3504 12 15.1099Z" fill="url(#1752500502765-1219022_arrows-bold-opposite-direction_existing_0_ng1mkmgk8)" data-glass="clone" filter="url(#1752500502765-1219022_arrows-bold-opposite-direction_filter_fjwlm2igw)" clip-path="url(#1752500502765-1219022_arrows-bold-opposite-direction_clipPath_06b3zrgty)"></path>
                                <path d="M12 21.976L12 19L5.50001 19C4.67158 19 4 18.3284 4.00001 17.5L4.00003 13.5C4.00003 12.6716 4.67161 12 5.50003 12L12 12L12 9.02404C12 7.78356 13.42 7.07921 14.4076 7.8298L22.9286 14.3058C23.7185 14.906 23.7185 16.094 22.9286 16.6942L14.4076 23.1702C13.42 23.9208 12 23.2164 12 21.976Z" fill="url(#1752500502765-1219022_arrows-bold-opposite-direction_existing_1_7ryavlmrh)" data-glass="blur"></path>
                                <path d="M4 17.4996V13.4996C4.0001 12.6712 4.67165 11.9996 5.5 11.9996H12V9.024C12 7.78361 13.4196 7.07932 14.4072 7.82966L22.9287 14.3052C23.7185 14.9055 23.7184 16.0936 22.9287 16.6939L14.4072 23.1695C13.4505 23.8966 12.0881 23.2588 12.0039 22.0904L12 21.9761V18.9996H5.5V18.2496H12.75V21.9761C12.7503 22.5961 13.4604 22.948 13.9541 22.5728L22.4746 16.0972C22.8695 15.7971 22.8695 15.203 22.4746 14.9029L13.9541 8.42634C13.4603 8.05104 12.75 8.40376 12.75 9.024V12.7496H5.5C5.08586 12.7496 4.7501 13.0855 4.75 13.4996V17.4996C4.75 17.9138 5.08579 18.2496 5.5 18.2496V18.9996L5.34668 18.9918C4.59028 18.915 4 18.2762 4 17.4996Z" fill="url(#1752500502765-1219022_arrows-bold-opposite-direction_existing_2_p9nlanf69)"></path>
                                <defs>
                                    <linearGradient id="1752500502765-1219022_arrows-bold-opposite-direction_existing_0_ng1mkmgk8" x1="10.239" y1=".655" x2="10.239" y2="16.613" gradientUnits="userSpaceOnUse">
                                        <stop stop-color="#575757"></stop>
                                        <stop offset="1" stop-color="#151515"></stop>
                                    </linearGradient>
                                    <linearGradient id="1752500502765-1219022_arrows-bold-opposite-direction_existing_1_7ryavlmrh" x1="24.5" y1="15.5" x2="4" y2="15.5" gradientUnits="userSpaceOnUse">
                                        <stop stop-color="#E3E3E5" stop-opacity=".6"></stop>
                                        <stop offset="1" stop-color="#BBBBC0" stop-opacity=".6"></stop>
                                    </linearGradient>
                                    <linearGradient id="1752500502765-1219022_arrows-bold-opposite-direction_existing_2_p9nlanf69" x1="13.761" y1="7.521" x2="13.761" y2="16.762" gradientUnits="userSpaceOnUse">
                                        <stop stop-color="#fff"></stop>
                                        <stop offset="1" stop-color="#fff" stop-opacity="0"></stop>
                                    </linearGradient>
                                    <filter id="1752500502765-1219022_arrows-bold-opposite-direction_filter_fjwlm2igw" x="-100%" y="-100%" width="400%" height="400%" filterUnits="objectBoundingBox" primitiveUnits="userSpaceOnUse">
                                        <feGaussianBlur stdDeviation="2" x="0%" y="0%" width="100%" height="100%" in="SourceGraphic" edgeMode="none" result="blur"></feGaussianBlur>
                                    </filter>
                                    <clipPath id="1752500502765-1219022_arrows-bold-opposite-direction_clipPath_06b3zrgty">
                                        <path d="M12 21.976L12 19L5.50001 19C4.67158 19 4 18.3284 4.00001 17.5L4.00003 13.5C4.00003 12.6716 4.67161 12 5.50003 12L12 12L12 9.02404C12 7.78356 13.42 7.07921 14.4076 7.8298L22.9286 14.3058C23.7185 14.906 23.7185 16.094 22.9286 16.6942L14.4076 23.1702C13.42 23.9208 12 23.2164 12 21.976Z" fill="url(#1752500502765-1219022_arrows-bold-opposite-direction_existing_1_7ryavlmrh)"></path>
                                    </clipPath>
                                    <mask id="1752500502765-1219022_arrows-bold-opposite-direction_mask_m1tbxjjqc">
                                        <rect width="100%" height="100%" fill="#FFF"></rect>
                                        <path d="M12 21.976L12 19L5.50001 19C4.67158 19 4 18.3284 4.00001 17.5L4.00003 13.5C4.00003 12.6716 4.67161 12 5.50003 12L12 12L12 9.02404C12 7.78356 13.42 7.07921 14.4076 7.8298L22.9286 14.3058C23.7185 14.906 23.7185 16.094 22.9286 16.6942L14.4076 23.1702C13.42 23.9208 12 23.2164 12 21.976Z" fill="#000"></path>
                                    </mask>
                                </defs>
                            </g>
                        </svg>`,
                        '反选（对当前显示卡片生效）',
                        'invert-select-btn'
                );
        invertSelectButton.addEventListener('click', () => {
            const type = isShowingPersonal ? 'personal' : 'team';
            bulkToggleSelection(type, 'invert', true);
        });
        iconButtonsContainer.appendChild(invertSelectButton);

        // 将图标按钮容器添加到主控制容器
        controlsContainer.appendChild(iconButtonsContainer);
        
    // 3. 创建搜索输入框 (放在最下面)
        const searchContainer = document.createElement('div');
        searchContainer.style.marginBottom = '15px';
        searchContainer.style.textAlign = 'center';

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.id = 'eventSearchInput';
        searchInput.placeholder = '搜索事件 (支持拼音首字母)';
        searchInput.style.width = '300px';
        searchInput.style.padding = '8px 12px';
        searchInput.style.border = '1px solid rgba(255, 255, 255, 0.2)';
        searchInput.style.backgroundColor = 'rgba(128, 128, 128, 0.3)';
        searchInput.style.backdropFilter = 'blur(10px)';
        searchInput.style.webkitBackdropFilter = 'blur(10px)';
        searchInput.style.color = '#fff';
        searchInput.style.borderRadius = '8px';
        searchInput.style.fontSize = '14px';
        searchInput.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        searchInput.style.transition = 'all 0.3s ease';

        // 设置placeholder为纯白色
        const style = document.createElement('style');
        style.innerHTML = `
        #eventSearchInput::placeholder {
            color: #fff !important;
            opacity: 1 !important;
        }
        #eventSearchInput::-webkit-input-placeholder {
            color: #fff !important;
            opacity: 1 !important;
        }
        #eventSearchInput:-ms-input-placeholder {
            color: #fff !important;
            opacity: 1 !important;
        }
        #eventSearchInput::-ms-input-placeholder {
            color: #fff !important;
            opacity: 1 !important;
        }
        `;

    document.head.appendChild(style);

    searchContainer.appendChild(searchInput);
    
    // 将搜索容器添加到主控制容器
    controlsContainer.appendChild(searchContainer);
    
    // 将主控制容器添加到header
    header.appendChild(controlsContainer);

    container.appendChild(header);

        // 创建个人事件卡片区域
        const personalEvents = document.createElement('div');
        personalEvents.id = 'personalEventsInSettings';
        personalEvents.style.display = 'block';
        // 顶部行：左侧筛选按钮，右侧启用计数
        const personalTopRow = document.createElement('div');
        personalTopRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;gap:10px;';
        // 筛选按钮（个人）
    const personalFilterBtn = document.createElement('button');
        personalFilterBtn.className = 'icon-btn filter-btn';
        const personalFilterIcon = document.createElement('div');
        personalFilterIcon.className = 'btn-icon';
        personalFilterIcon.textContent = '筛选：全部事件';
        personalFilterBtn.appendChild(personalFilterIcon);
        personalFilterBtn.addEventListener('click', () => {
            const order = ['all', 'enabled', 'disabled'];
            const cur = statusFilter.personal || 'all';
            const next = order[(order.indexOf(cur) + 1) % order.length];
            statusFilter.personal = next;
            personalFilterIcon.textContent = next === 'all' ? '筛选：全部事件' : (next === 'enabled' ? '筛选：启用事件' : '筛选：禁用事件');
            refreshGridVisibilityForType('personal');
        });
        // 启用计数（个人）
        const personalCount = document.createElement('div');
        personalCount.id = 'personalEnabledCount';
        personalCount.style.cssText = 'text-align:right;color:#ddd;';
    // 预设按钮（个人）
    const personalPresetBtn = document.createElement('button');
    personalPresetBtn.className = 'icon-btn filter-btn';
    const ppIcon = document.createElement('div'); ppIcon.className='btn-icon'; ppIcon.textContent='事件预设';
    personalPresetBtn.appendChild(ppIcon);
    personalPresetBtn.addEventListener('click', ()=> showPresetModal());

    const personalLeft = document.createElement('div');
    personalLeft.style.cssText='display:flex;gap:8px;align-items:center;';
    personalLeft.appendChild(personalFilterBtn);
    personalLeft.appendChild(personalPresetBtn);
    personalTopRow.appendChild(personalLeft);
        personalTopRow.appendChild(personalCount);
        personalEvents.appendChild(personalTopRow);
        const personalGrid = document.createElement('div');
        personalGrid.id = 'personalEventsGrid';
        personalGrid.className = 'shared-events-grid';
        personalEvents.appendChild(personalGrid);
        container.appendChild(personalEvents);

        // 创建团队事件卡片区域
        const teamEvents = document.createElement('div');
        teamEvents.id = 'teamEventsInSettings';
        teamEvents.style.display = 'none';
        // 顶部行：左侧筛选按钮，右侧启用计数（团队）
        const teamTopRow = document.createElement('div');
        teamTopRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;gap:10px;';
    const teamFilterBtn = document.createElement('button');
        teamFilterBtn.className = 'icon-btn filter-btn';
        teamFilterBtn.title = '筛选：全部/启用/禁用';
        const teamFilterIcon = document.createElement('div');
        teamFilterIcon.className = 'btn-icon';
        teamFilterIcon.textContent = '筛选：全部事件';
        teamFilterBtn.appendChild(teamFilterIcon);
        teamFilterBtn.addEventListener('click', () => {
            const order = ['all', 'enabled', 'disabled'];
            const cur = statusFilter.team || 'all';
            const next = order[(order.indexOf(cur) + 1) % order.length];
            statusFilter.team = next;
            teamFilterIcon.textContent = next === 'all' ? '筛选：全部事件' : (next === 'enabled' ? '筛选：启用事件' : '筛选：禁用事件');
            refreshGridVisibilityForType('team');
        });
        const teamCount = document.createElement('div');
        teamCount.id = 'teamEnabledCount';
        teamCount.style.cssText = 'text-align:right;color:#ddd;';
    // 预设按钮（团队）
    const teamPresetBtn = document.createElement('button');
    teamPresetBtn.className = 'icon-btn filter-btn';
    const tpIcon = document.createElement('div'); tpIcon.className='btn-icon'; tpIcon.textContent='事件预设';
    teamPresetBtn.appendChild(tpIcon);
    teamPresetBtn.addEventListener('click', ()=> showPresetModal());

    const teamLeft = document.createElement('div');
    teamLeft.style.cssText='display:flex;gap:8px;align-items:center;';
    teamLeft.appendChild(teamFilterBtn);
    teamLeft.appendChild(teamPresetBtn);
    teamTopRow.appendChild(teamLeft);
        teamTopRow.appendChild(teamCount);
        teamEvents.appendChild(teamTopRow);
        const teamGrid = document.createElement('div');
        teamGrid.id = 'teamEventsGrid';
        teamGrid.className = 'shared-events-grid';
        teamEvents.appendChild(teamGrid);
        container.appendChild(teamEvents);
        
        // 绑定事件监听器
        setTimeout(() => {
            // 加载事件数据
            loadEventsFromStorage();
            
            const personalGrid = document.getElementById('personalEventsGrid');
            const teamGrid = document.getElementById('teamEventsGrid');
            const missionObj = window.mission || {};
            const hardmissionObj = window.hardmission || {};
            populateCards(personalGrid, missionObj, 'personal');
            populateCards(teamGrid, hardmissionObj, 'team');
            
            // 毛玻璃切换按钮事件
            const personalRadio = document.getElementById('personalEventsRadio');
            const teamRadio = document.getElementById('teamEventsRadio');
            const personalEventsInSettings = document.getElementById('personalEventsInSettings');
            const teamEventsInSettings = document.getElementById('teamEventsInSettings');
            
            if (personalRadio && teamRadio && personalEventsInSettings && teamEventsInSettings) {
                personalRadio.addEventListener('change', () => {
                    if (personalRadio.checked) {
                        personalEventsInSettings.style.display = 'block';
                        teamEventsInSettings.style.display = 'none';
                        
                        // 控制添加按钮显示
                        const addPersonalButton = document.getElementById('addPersonalButton');
                        const addTeamButton = document.getElementById('addTeamButton');
                        if (addPersonalButton && addTeamButton) {
                            addPersonalButton.style.display = 'flex';
                            addTeamButton.style.display = 'none';
                        }
                        
                        // 更新搜索功能（卡片）
                        setupEventCardSearch('eventSearchInput', '#personalEventsGrid');
                        
                        isShowingPersonal = true;
                    }
                });
                
                teamRadio.addEventListener('change', () => {
                    if (teamRadio.checked) {
                        personalEventsInSettings.style.display = 'none';
                        teamEventsInSettings.style.display = 'block';
                        
                        // 控制添加按钮显示
                        const addPersonalButton = document.getElementById('addPersonalButton');
                        const addTeamButton = document.getElementById('addTeamButton');
                        if (addPersonalButton && addTeamButton) {
                            addPersonalButton.style.display = 'none';
                            addTeamButton.style.display = 'flex';
                        }
                        
                        // 更新搜索功能（卡片）
                        setupEventCardSearch('eventSearchInput', '#teamEventsGrid');
                        
                        isShowingPersonal = false;
                    }
                });
            }
            
            // 弹窗相关事件绑定
            setupModalControls();
            
            // 初始化搜索功能（默认个人事件卡片）
            setupEventCardSearch('eventSearchInput', '#personalEventsGrid');
            
        }, 100);
        
    return container;
    }

    // 初始化事件数据
    function initializeEventData() {
        // 确保全局事件对象存在
        if (typeof window.mission === 'undefined') {
            window.mission = {};
        }
        if (typeof window.hardmission === 'undefined') {
            window.hardmission = {};
        }
        
        // 加载存储的事件数据
        loadEventsFromStorage();
        
        // 如果没有存储的数据，使用原始数据
        if (Object.keys(window.mission).length === 0 && typeof mission !== 'undefined') {
            Object.assign(window.mission, mission);
        }
        if (Object.keys(window.hardmission).length === 0 && typeof hardmission !== 'undefined') {
            Object.assign(window.hardmission, hardmission);
        }
        
        // 在事件数据加载完成后初始化勾选状态
        initializeCheckboxStates();
        
        console.log('事件数据初始化完成:', {
            personalEvents: Object.keys(window.mission || {}).length,
            teamEvents: Object.keys(window.hardmission || {}).length
        });
    }

    // 初始化勾选状态
    function initializeCheckboxStates() {
        // 检查个人事件的勾选状态
        if (window.mission) {
            const savedState = JSON.parse(localStorage.getItem('personalEventsTable-checkedState')) || {};
            let needsUpdate = false;
            
            // 为所有存在的事件初始化勾选状态（如果不存在）
            Object.keys(window.mission).forEach(key => {
                if (savedState[key] === undefined) {
                    savedState[key] = true; // 默认启用
                    needsUpdate = true;
                }
            });
            
            // 移除不存在的事件的勾选状态
            Object.keys(savedState).forEach(key => {
                if (!window.mission[key]) {
                    delete savedState[key];
                    needsUpdate = true;
                }
            });
            
            if (needsUpdate) {
                localStorage.setItem('personalEventsTable-checkedState', JSON.stringify(savedState));
            }
        }
        
        // 检查团队事件的勾选状态
        if (window.hardmission) {
            const savedState = JSON.parse(localStorage.getItem('teamEventsTable-checkedState')) || {};
            let needsUpdate = false;
            
            // 为所有存在的事件初始化勾选状态（如果不存在）
            Object.keys(window.hardmission).forEach(key => {
                if (savedState[key] === undefined) {
                    savedState[key] = true; // 默认启用
                    needsUpdate = true;
                }
            });
            
            // 移除不存在的事件的勾选状态
            Object.keys(savedState).forEach(key => {
                if (!window.hardmission[key]) {
                    delete savedState[key];
                    needsUpdate = true;
                }
            });
            
            if (needsUpdate) {
                localStorage.setItem('teamEventsTable-checkedState', JSON.stringify(savedState));
            }
        }
    }

    // --- 弹窗相关函数 ---

    let currentEditingType = 'personal'; // 'personal' or 'team'
    let currentEditingKey = null;

    function openEventModal(type, key = null) {
        const modal = document.getElementById('eventModal');
        const overlay = document.getElementById('eventModalOverlay');
        const titleInput = document.getElementById('eventTitle');
        const contentInput = document.getElementById('eventContent');
        const placeholdersContainer = document.getElementById('placeholdersContainer');

        currentEditingType = type;
        currentEditingKey = key;

        // 重置表单
        titleInput.value = '';
        contentInput.value = '';
        placeholderData = {}; // 重置占位符数据

        if (key) {
            // 编辑模式
            const eventData = (type === 'personal' ? window.mission : window.hardmission)[key];
            if (eventData) {
                titleInput.value = key;
                contentInput.value = eventData.内容;
                if (eventData.placeholders) {
                    // 安全地复制占位符数据，确保每个值都是数组格式
                    placeholderData = {};
                    Object.entries(eventData.placeholders).forEach(([name, values]) => {
                        // 确保 values 是数组格式，防止类型错误
                        if (Array.isArray(values)) {
                            placeholderData[name] = [...values];
                        } else if (values != null) {
                            // 如果不是数组但有值，转换为数组
                            placeholderData[name] = [String(values)];
                        } else {
                            // 如果是 null 或 undefined，使用空数组
                            placeholderData[name] = [];
                        }
                    });
                } else {
                    placeholderData = {};
                }
            }
        }

        // 渲染占位符卡片
        renderPlaceholderCards();

        modal.style.display = 'block';
        overlay.style.display = 'block';
    }

    function closeEventModal() {
        const modal = document.getElementById('eventModal');
        const overlay = document.getElementById('eventModalOverlay');
        modal.style.display = 'none';
        overlay.style.display = 'none';
    }

    function addPlaceholderInput(name = '', values = '') {
        // 旧的函数保留用于兼容性，但不再使用
        console.log('addPlaceholderInput called with legacy parameters');
    }

    // 新的占位符管理系统
    let currentEditingPlaceholder = null;
    let placeholderData = {};

    function renderPlaceholderCards() {
        const container = document.getElementById('placeholdersContainer');
        if (!container) {
            console.warn('placeholdersContainer 未找到');
            return;
        }
        
        container.innerHTML = '';

        // 确保 placeholderData 是有效对象
        if (!placeholderData || typeof placeholderData !== 'object') {
            placeholderData = {};
        }

        // 渲染现有的占位符卡片
        try {
            Object.entries(placeholderData).forEach(([name, values]) => {
                // 额外的安全检查
                if (name && values !== undefined) {
                    const card = createPlaceholderCard(name, values);
                    container.appendChild(card);
                }
            });
        } catch (error) {
            console.error('渲染占位符卡片时出错:', error);
            console.log('placeholderData 内容:', placeholderData);
        }

        // 添加新增卡片
        const addCard = createAddPlaceholderCard();
        container.appendChild(addCard);
    }

    function createPlaceholderCard(name, values) {
        const card = document.createElement('div');
        card.className = 'placeholder-card';
        
        // 确保 values 是数组格式
        const valuesArray = Array.isArray(values) ? values : (values ? [values] : []);
        
        card.innerHTML = `
            <div class="placeholder-card-header">
                <div class="placeholder-card-name">${name}</div>
                <div class="placeholder-card-actions">
                    <button class="placeholder-card-btn placeholder-edit-btn" onclick="window.eventManagement.editPlaceholder('${name}')" title="编辑">
                        ✏️
                    </button>
                    <button class="placeholder-card-btn placeholder-delete-btn" onclick="window.eventManagement.deletePlaceholder('${name}')" title="删除">
                        🗑️
                    </button>
                </div>
            </div>
            <div class="placeholder-card-values">
                ${valuesArray.map(value => `<span class="placeholder-value-tag">${value}</span>`).join('')}
            </div>
            <div class="placeholder-copy-hint">点击卡片复制引用标签</div>
        `;
        
        // 添加点击复制功能
        card.addEventListener('click', (e) => {
            // 如果点击的是按钮，不执行复制
            if (e.target.closest('.placeholder-card-btn')) {
                return;
            }
            
            const referenceTag = `[${name}]`;
            copyToClipboard(referenceTag, name);
        });
        
        return card;
    }

    function createAddPlaceholderCard() {
        const card = document.createElement('div');
        card.className = 'placeholder-add-card';
        card.innerHTML = `
            <div class="placeholder-add-icon">+</div>
            <div class="placeholder-add-text">添加新的随机词条</div>
        `;
        card.onclick = () => openPlaceholderEditModal();
        return card;
    }

    function openPlaceholderEditModal(placeholderName = null) {
        const modal = document.getElementById('placeholderEditModal');
        const titleElement = document.getElementById('placeholderEditTitle');
        const nameInput = document.getElementById('placeholderNameInput');
        const valuesList = document.getElementById('placeholderValuesList');

        currentEditingPlaceholder = placeholderName;
        
        if (placeholderName) {
            titleElement.textContent = '编辑随机词条';
            nameInput.value = placeholderName;
            nameInput.disabled = true; // 编辑时不允许修改名称
            renderPlaceholderValues(placeholderData[placeholderName] || []);
        } else {
            titleElement.textContent = '添加随机词条';
            nameInput.value = '';
            nameInput.disabled = false;
            renderPlaceholderValues([]);
        }

        clearPlaceholderErrors();
        modal.style.display = 'flex';
    }

    function closePlaceholderEditModal() {
        const modal = document.getElementById('placeholderEditModal');
        modal.style.display = 'none';
        currentEditingPlaceholder = null;
    }

    function renderPlaceholderValues(values) {
        const valuesList = document.getElementById('placeholderValuesList');
        valuesList.innerHTML = '';

        values.forEach((value, index) => {
            const valueItem = createPlaceholderValueItem(value, index);
            valuesList.appendChild(valueItem);
        });

        // 如果没有值，添加一个空的输入框
        if (values.length === 0) {
            addPlaceholderValueInput('');
        }
    }

    function createPlaceholderValueItem(value, index) {
        const item = document.createElement('div');
        item.className = 'placeholder-value-item';
        item.innerHTML = `
            <input type="text" class="placeholder-value-input" value="${value}" data-index="${index}" placeholder="输入一个词条，高级功能:使用[*xx,yy,zz*]格式可在抽取时随机替换为其中一个">
            <button type="button" class="placeholder-value-delete" onclick="window.eventManagement.removePlaceholderValue(${index})">×</button>
        `;
        return item;
    }

    function addPlaceholderValueInput(value = '') {
        const valuesList = document.getElementById('placeholderValuesList');
        const index = valuesList.children.length;
        const valueItem = createPlaceholderValueItem(value, index);
        valuesList.appendChild(valueItem);
    }

    function removePlaceholderValue(index) {
        const valuesList = document.getElementById('placeholderValuesList');
        const item = valuesList.children[index];
        if (item) {
            item.remove();
            // 重新编号
            Array.from(valuesList.children).forEach((child, newIndex) => {
                const input = child.querySelector('.placeholder-value-input');
                const deleteBtn = child.querySelector('.placeholder-value-delete');
                input.setAttribute('data-index', newIndex);
                deleteBtn.setAttribute('onclick', `window.eventManagement.removePlaceholderValue(${newIndex})`);
            });
        }
    }

    function savePlaceholder() {
        const nameInput = document.getElementById('placeholderNameInput');
        const valuesList = document.getElementById('placeholderValuesList');
        
        const name = nameInput.value.trim();
        if (!name) {
            showPlaceholderError('placeholderNameError', '词条名称不能为空');
            return;
        }

        // 检查名称是否重复（仅在新增时检查）
        if (!currentEditingPlaceholder && placeholderData.hasOwnProperty(name)) {
            showPlaceholderError('placeholderNameError', '词条名称已存在');
            return;
        }

        // 收集所有值
        const values = [];
        const valueInputs = valuesList.querySelectorAll('.placeholder-value-input');
        valueInputs.forEach(input => {
            const value = input.value.trim();
            if (value) {
                // 检查值是否重复
                if (values.includes(value)) {
                    showPlaceholderError('placeholderNameError', `值 "${value}" 重复了`);
                    return;
                }
                values.push(value);
            }
        });

        if (values.length === 0) {
            showPlaceholderError('placeholderNameError', '至少需要添加一个值');
            return;
        }

        // 如果是编辑现有占位符且名称改变了，删除旧的
        if (currentEditingPlaceholder && currentEditingPlaceholder !== name) {
            delete placeholderData[currentEditingPlaceholder];
        }

        // 保存数据
        placeholderData[name] = values;
        
        // 重新渲染卡片
        renderPlaceholderCards();
        
        // 关闭模态框
        closePlaceholderEditModal();
    }

    function deletePlaceholder(name) {
        if (confirm(`确定要删除随机词条 "${name}" 吗？`)) {
            delete placeholderData[name];
            renderPlaceholderCards();
        }
    }

    function showPlaceholderError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }

    function clearPlaceholderErrors() {
        const errorElement = document.getElementById('placeholderNameError');
        errorElement.style.display = 'none';
    }

    // 复制到剪贴板的函数
    function copyToClipboard(text, placeholderName) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            // 使用现代 Clipboard API
            navigator.clipboard.writeText(text).then(() => {
                showCopySuccessMessage(placeholderName);
            }).catch(() => {
                // 如果失败，使用备用方法
                fallbackCopyToClipboard(text, placeholderName);
            });
        } else {
            // 备用方法
            fallbackCopyToClipboard(text, placeholderName);
        }
    }

    function fallbackCopyToClipboard(text, placeholderName) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            showCopySuccessMessage(placeholderName);
        } catch (err) {
            console.error('复制失败:', err);
            alert('复制失败，请手动复制：' + text);
        }
        
        document.body.removeChild(textArea);
    }

    function showCopySuccessMessage(placeholderName) {
        // 创建临时提示消息
        const message = document.createElement('div');
        message.className = 'copy-success-message';
        message.textContent = `已复制引用标签 [${placeholderName}]`;
        message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(46, 204, 113, 0.9);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(10px);
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(message);
        
        // 3秒后移除消息
        setTimeout(() => {
            if (message.parentNode) {
                message.style.animation = 'slideOutRight 0.3s ease-in';
                setTimeout(() => {
                    document.body.removeChild(message);
                }, 300);
            }
        }, 3000);
    }

    function saveEvent() {
        const title = document.getElementById('eventTitle').value.trim();
        const content = document.getElementById('eventContent').value.trim();

        if (!title || !content) {
            alert('事件标题和内容不能为空！');
            return;
        }

        const eventPool = currentEditingType === 'personal' ? window.mission : window.hardmission;
        
        // 检查标题是否重复（仅在新增或编辑时标题有变化的情况下）
        if ((!currentEditingKey || currentEditingKey !== title) && eventPool.hasOwnProperty(title)) {
            alert(`事件标题 "${title}" 已存在，请使用不同的标题！`);
            return;
        }

        // 使用新的占位符系统数据
        const eventData = {
            '内容': content
        };

        if (Object.keys(placeholderData).length > 0) {
            eventData.placeholders = { ...placeholderData };
        }
        
        // 如果是编辑模式且标题已更改，则删除旧条目
        if (currentEditingKey && currentEditingKey !== title) {
            delete eventPool[currentEditingKey];
        }

        eventPool[title] = eventData;
        saveEventsToStorage();

        // 刷新视图：优先刷新卡片网格，其次表格（兼容）
    const gridId = currentEditingType === 'personal' ? 'personalEventsGrid' : 'teamEventsGrid';
        const grid = document.getElementById(gridId);
        if (grid) {
            populateCards(grid, eventPool, currentEditingType);
        } else {
            const tableId = currentEditingType === 'personal' ? 'personalEventsTable' : 'teamEventsTable';
            const table = document.getElementById(tableId);
            if (table) populateTable(table, eventPool, tableId);
        }

        closeEventModal();
    }

    let modalControlsInitialized = false;
    function setupModalControls() {
        if (modalControlsInitialized) return;

        // 移除旧的添加占位符按钮事件（因为现在使用卡片系统）
        document.getElementById('saveEventBtn').addEventListener('click', saveEvent);
        document.getElementById('cancelEventBtn').addEventListener('click', closeEventModal);
        // 移除了 eventModalOverlay 的点击关闭逻辑

        // 新的占位符编辑模态框事件监听器
        document.getElementById('placeholderEditClose').addEventListener('click', closePlaceholderEditModal);
        document.getElementById('placeholderCancelBtn').addEventListener('click', closePlaceholderEditModal);
        document.getElementById('placeholderSaveBtn').addEventListener('click', savePlaceholder);
        document.getElementById('addPlaceholderValue').addEventListener('click', () => addPlaceholderValueInput());
        
        // 移除了 placeholderEditModal 的点击外部关闭逻辑

        const helpBtn = document.getElementById('placeholderHelpBtn');
        helpBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            window.open('./docs/#/guide?id=随机词条', '_blank');
        });

        modalControlsInitialized = true;
    }

    // 导出所有事件
    function exportAllEvents() {
        try {
            const allEvents = {
                personalEvents: window.mission || {},
                teamEvents: window.hardmission || {},
                exportTime: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
            };
            
            const dataStr = JSON.stringify(allEvents, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `unhappycar事件导出_${new Date().toISOString().slice(0, 10)}.json`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            alert('事件导出成功！');
        } catch (error) {
            console.error('导出失败：', error);
            alert('导出失败，请稍后重试');
        }
    }
    
    // 导入所有事件
    function importAllEvents() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = function(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const importedData = JSON.parse(e.target.result);
                    
                    // 验证数据格式
                    if (!importedData.personalEvents || !importedData.teamEvents) {
                        alert('文件格式不正确，请选择正确的事件导出文件');
                        return;
                    }
                    
                    // 确认导入操作
                    const confirmMessage = `将要导入：
- 个人事件：${Object.keys(importedData.personalEvents).length} 个
- 团队事件：${Object.keys(importedData.teamEvents).length} 个

注意：这将覆盖当前所有事件数据，是否继续？`;
                    
                    if (!confirm(confirmMessage)) {
                        return;
                    }
                    
                    // 导入数据
                    window.mission = importedData.personalEvents;
                    window.hardmission = importedData.teamEvents;
                    
                    // 保存到本地存储
                    saveEventsToStorage();
                    
                    // 刷新事件管理界面
                    refreshEventManagement();
                    
                    alert('事件导入成功！');
                } catch (error) {
                    console.error('导入失败：', error);
                    alert('文件格式错误或损坏，导入失败');
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }
    
    // 刷新事件管理界面
    function refreshEventManagement() {
        // 优先刷新卡片网格
        const personalGrid = document.getElementById('personalEventsGrid');
        const teamGrid = document.getElementById('teamEventsGrid');
        if (personalGrid) {
            populateCards(personalGrid, window.mission || {}, 'personal');
        }
        if (teamGrid) {
            populateCards(teamGrid, window.hardmission || {}, 'team');
        }
        // 回退：若存在旧表格结构，也刷新
        const personalTable = document.getElementById('personalEventsTable');
        if (personalTable) {
            populateTable(personalTable, window.mission || {}, 'personalEventsTable');
        }
        const teamTable = document.getElementById('teamEventsTable');
        if (teamTable) {
            populateTable(teamTable, window.hardmission || {}, 'teamEventsTable');
        }
    }

    // 直接删除（卡片按钮用）
    function deleteEventDirect(type, key) {
        const isPersonal = type === 'personal';
        if (isPersonal) {
            if (window.mission && window.mission[key]) delete window.mission[key];
        } else {
            if (window.hardmission && window.hardmission[key]) delete window.hardmission[key];
        }
        // 同步勾选状态存储
        const tableId = isPersonal ? 'personalEventsTable' : 'teamEventsTable';
        const savedState = JSON.parse(localStorage.getItem(`${tableId}-checkedState`)) || {};
        if (savedState[key] !== undefined) {
            delete savedState[key];
            localStorage.setItem(`${tableId}-checkedState`, JSON.stringify(savedState));
        }
        saveEventsToStorage();

        // 刷新界面
        refreshEventManagement();
    }

    // 公共接口
    return {
        loadEventManagement,
        populateTable,
        loadEventsFromStorage,
        saveEventsToStorage,
        // 旧函数已移除：右键/动画
        initializeEventData,
        
        // 新的占位符功能
        editPlaceholder: openPlaceholderEditModal,
        deletePlaceholder: deletePlaceholder,
        removePlaceholderValue: removePlaceholderValue,
        setupEventSearch,
        setupEventCardSearch,
        // 新卡片渲染 & 刷新
        populateCards,
    refreshEventManagement,
    bulkToggleSelection
    };
})();
