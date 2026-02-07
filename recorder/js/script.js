(function () {
  let hasLastDraw = false;
  let currentAnimationToken = 0; // 用于防止快速多次抽取导致回调错乱
  const history = []; // {round, 元素类型, 国家, 武器类型, 体型, changes}
  // 维护显示顺序（与 Set 中内容同步；新增放末尾，删除时移除）
  const order = {
    元素类型: [],
    国家: [],
    武器类型: [],
    体型: [],
  };
  // 取值池
  const POOLS = {
    元素类型: ["水", "火", "冰", "雷", "草", "风", "岩"],
    国家: ["蒙德", "璃月", "稻妻", "须弥", "枫丹", "纳塔", "挪德卡莱"],
    武器类型: ["单手剑", "双手剑", "弓", "法器", "长柄武器"],
    体型: ["成女", "成男", "少女", "少年", "萝莉"],
  };

  let panelSearchTerm = ''; // 用于顶部搜索框的过滤条件

  function closePanelSearch() {
    const btn = document.getElementById('panelSearchBtn');
    const container = document.getElementById('panelSearchContainer');
    const input = document.getElementById('panelSearchInput');
    if (btn && container && input && container.classList.contains('active')) {
      container.classList.remove('active');
      input.blur();
      // Reset icon to search
      btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;
      // Clear search if necessary
      if (input.value.trim() || panelSearchTerm) {
        input.value = '';
        panelSearchTerm = '';
        renderComplement(true);
      }
    }
  }

  // 当前对称差记录
  const record = {
    元素类型: new Set(),
    国家: new Set(),
    武器类型: new Set(),
    体型: new Set(),
  };

  // ===== 持久化存储 =====
  const STORAGE_KEY = 'recorder_data_v1';

  function saveState() {
    const state = {
      history,
      order,
      hasLastDraw,
      lastDraw: window.__recorder_lastDraw
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save state', e);
    }
  }

  // ===== 外部同步接口支持 =====
  let onStateChangeCallback = null;

  function getState() {
    return {
      history,
      order,
      hasLastDraw,
      lastDraw: window.__recorder_lastDraw,
      // Add Brain Teaser Mode to sync state
      brainTeaserMode: (window.__recorder_settings && window.__recorder_settings.brainTeaserMode)
    };
  }


  function restoreState(state) {
    if (!state) return;

    const lastBar = document.getElementById('lastCopyBar');
    const recBar = document.getElementById('recordCopyBar');
    const availPanel = document.getElementById('availablePanel');

    // Sync Brain Teaser Mode
    if (state.brainTeaserMode !== undefined) {
      if (!window.__recorder_settings) window.__recorder_settings = {};
      window.__recorder_settings.brainTeaserMode = state.brainTeaserMode;

      // Update Toggle UI if exists
      const btToggle = document.getElementById('brainTeaserToggle');
      if (btToggle) {
        btToggle.checked = state.brainTeaserMode;
      }

      // Update internal BT state visibility (handled in renderComplement, but force hide if off)
      if (!state.brainTeaserMode && window.__brainTeaser) {
        window.__brainTeaser.hideUI();
      }
    }

    // 判断是否为新增一次抽取：当前有历史，且新历史比当前多1条
    const isNewDraw = (history.length > 0 &&
      state.history &&
      Array.isArray(state.history) &&
      state.history.length === history.length + 1);

    // 恢复 history
    if (Array.isArray(state.history)) {
      history.length = 0;
      history.push(...state.history);
    }

    // 恢复 order 和 record
    if (state.order) {
      Object.keys(order).forEach(k => {
        order[k] = state.order[k] || [];
        record[k] = new Set(order[k]);
      });
    }

    // 恢复其他状态
    hasLastDraw = !!state.hasLastDraw;
    window.__recorder_lastDraw = state.lastDraw;

    // 恢复界面显示
    if (hasLastDraw && window.__recorder_lastDraw) {
      if (isNewDraw) {
        // 重置 Brain Teaser 状态 (如 viewer 之前投降过)
        if (window.__brainTeaser) window.__brainTeaser.reset();

        // 动画逻辑：
        // 1. 获取最新一次的 changes
        const lastEntry = history[history.length - 1];
        const changes = lastEntry.changes || null;

        // 2. 显示本次抽取（带动画效果，renderLast 内部若 changes 存在会带动画类）
        renderLast(window.__recorder_lastDraw, changes);

        // 3. 更新历史表格
        renderHistoryTable();

        // 4. 延迟更新记录列表
        const delay = (window.__recorder_settings && window.__recorder_settings.animationsEnabled === false) ? 0 : 800;
        setTimeout(() => {
          renderRecord(changes, () => {
            renderComplement();
          });
        }, delay);
      } else {
        // 非动画逻辑（也是默认的初始化/刷新逻辑）
        // 在恢复时保留最后一次 changes（用于让 "add" 保持 badge-add 样式，但不触发动画）
        // 【关键修复】只保留 add 操作，避免 remove 的红色 badge 在刷新后重现
        const lastEntry = history[history.length - 1];
        const rawChanges = lastEntry ? lastEntry.changes : null;
        let displayChanges = null;

        if (rawChanges) {
          displayChanges = {};
          Object.keys(rawChanges).forEach(k => {
            const ch = rawChanges[k];
            if (ch.op !== 'remove') {
              displayChanges[k] = ch;
            }
          });
        }

        window.__recorder_restoring = true;
        renderLast(window.__recorder_lastDraw, rawChanges);
        renderHistoryTable();
        renderRecord(displayChanges, () => { renderComplement(); window.__recorder_restoring = false; });
      }
      if (lastBar) lastBar.classList.remove('hidden');
      if (recBar) recBar.classList.remove('hidden');
      if (availPanel) availPanel.classList.remove('hidden');
    } else {
      // 确保清除上一次的显示（如果是重置或加入新房间为空状态时）
      document.getElementById('lastDraw').innerHTML = '';
      if (lastBar) lastBar.classList.add('hidden');
      if (recBar) recBar.classList.add('hidden');

      renderHistoryTable();
      renderRecord(null, () => { renderComplement(); });
    }
    if (onStateChangeCallback) {
      onStateChangeCallback(getState());
    }
  }

  // 重新渲染当前状态（用于设置变更后刷新UI等）
  function refresh() {
    const lastBar = document.getElementById('lastCopyBar');
    const recBar = document.getElementById('recordCopyBar');
    const availPanel = document.getElementById('availablePanel');

    if (!hasLastDraw) {
      if (lastBar) lastBar.classList.add('hidden');
      if (recBar) recBar.classList.add('hidden');
      renderHistoryTable();
      renderRecord(null, () => renderComplement());
      return;
    }

    if (lastBar) lastBar.classList.remove('hidden');
    if (recBar) recBar.classList.remove('hidden');
    if (availPanel) availPanel.classList.remove('hidden');

    // 尝试获取最后一次的 changes 以保持高亮状态
    const lastEntry = history.length > 0 ? history[history.length - 1] : null;
    const rawChanges = lastEntry ? lastEntry.changes : null;

    // 同样进行过滤，防止刷新时出现红色删除标记
    let displayChanges = null;
    if (rawChanges) {
      displayChanges = {};
      Object.keys(rawChanges).forEach(k => {
        if (rawChanges[k].op !== 'remove') {
          displayChanges[k] = rawChanges[k];
        }
      });
    }

    renderLast(window.__recorder_lastDraw, rawChanges);
    renderHistoryTable();
    renderRecord(displayChanges, () => renderComplement());
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        restoreState(JSON.parse(raw));
      } else {
        // 无论是否有数据，都执行初始渲染以确保界面状态正确
        renderHistoryTable();
        renderRecord(null, () => { renderComplement(); });
      }

    } catch (e) {
      console.error('Failed to load state', e);
    }
  }

  function clearState() {
    localStorage.removeItem(STORAGE_KEY);
  }

  // 工具：随机从数组取一个
  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // 工具：对称差更新（出现一次加入，再次出现移除）
  function toggle(set, value) {
    if (set.has(value)) set.delete(value); else set.add(value);
  }

  // 抽取一次
  function drawOnce() {
    closePanelSearch();
    // 重置 Brain Teaser 状态 (Host端)
    if (window.__brainTeaser) window.__brainTeaser.reset();

    const token = ++currentAnimationToken;
    const last = {
      元素类型: pickRandom(POOLS.元素类型),
      国家: pickRandom(POOLS.国家),
      武器类型: pickRandom(POOLS.武器类型),
      体型: pickRandom(POOLS.体型),
    };
    // 计算并记录操作 + 原位置索引（删除时用）
    const lastChanges = {};
    ["元素类型", "国家", "武器类型", "体型"].forEach(cat => {
      const val = last[cat];
      const isRemove = (record[cat].has ? record[cat].has(val) : false);
      const change = { value: val, op: isRemove ? 'remove' : 'add', index: -1 };
      if (isRemove) {
        change.index = order[cat].indexOf(val); // 原位置
      }
      lastChanges[cat] = change;
    });
    // 应用对称差 + 更新顺序
    ["元素类型", "国家", "武器类型", "体型"].forEach(cat => {
      const { value, op, index } = lastChanges[cat];
      if (op === 'remove') {
        // 从 Set 删除
        toggle(record[cat], value);
        // 从顺序数组中移除
        const i = order[cat].indexOf(value);
        if (i > -1) order[cat].splice(i, 1);
      } else {
        // 添加
        toggle(record[cat], value);
        if (!order[cat].includes(value)) order[cat].push(value);
        // 记录新增后的索引（末尾）
        lastChanges[cat].index = order[cat].length - 1;
      }
    });

    // 渲染
    // 缓存本次抽取，供复制
    window.__recorder_lastDraw = last;
    renderLast(last, lastChanges);
    // 记录历史
    // 记录当前记录快照（使用顺序数组保持展示顺序）
    const snapshot = {
      元素类型: order.元素类型.slice(),
      国家: order.国家.slice(),
      武器类型: order.武器类型.slice(),
      体型: order.体型.slice(),
    };
    // 计算当前可用角色数量（基于最新记录）
    const all = window.characterData || {};
    const entries = Object.entries(all);
    const availableCount = entries.filter(([name, data]) => isComplement(data)).length;
    history.push({
      round: history.length + 1,
      last,
      snapshot,
      available: availableCount,
      changes: lastChanges
    });
    renderHistoryTable();
    // 延迟显示当前记录动画（0.8s）
    const delay = (window.__recorder_settings && window.__recorder_settings.animationsEnabled === false) ? 0 : 800;
    setTimeout(() => {
      renderRecord(lastChanges, () => {
        // 仅在仍是最新一次抽取时渲染可用角色
        if (token === currentAnimationToken) {
          renderComplement();
        }
      });
    }, delay);
    // 显示复制控件与可用复制区域
    hasLastDraw = true;
    const lastBar = document.getElementById('lastCopyBar');
    const recBar = document.getElementById('recordCopyBar');
    const copyAvail = document.getElementById('copyAvailable');
    const availPanel = document.getElementById('availablePanel');
    if (lastBar) lastBar.classList.remove('hidden');
    if (recBar) recBar.classList.remove('hidden');

    if (availPanel) availPanel.classList.remove('hidden');

    saveState();

    // 重置脑筋急转弯状态
    if (window.__brainTeaser) {
      window.__brainTeaser.reset();
    }

    if (onStateChangeCallback) {
      onStateChangeCallback(getState());
    }
  }

  function undo() {
    closePanelSearch();
    if (history.length === 0) return;
    history.pop();

    if (history.length === 0) {
      Object.values(record).forEach(s => s.clear());
      Object.keys(order).forEach(k => order[k].length = 0);
      document.getElementById('lastDraw').innerHTML = '';
      hasLastDraw = false;
      window.__recorder_lastDraw = null;

      const lastBar = document.getElementById('lastCopyBar');
      const recBar = document.getElementById('recordCopyBar');
      const copyAvail = document.getElementById('copyAvailable');
      const copyPanel = document.getElementById('copyAvailablePanel');
      const availPanel = document.getElementById('availablePanel');
      if (lastBar) lastBar.classList.add('hidden');
      if (recBar) recBar.classList.add('hidden');
      if (copyAvail) copyAvail.classList.add('hidden');
      if (copyPanel) copyPanel.classList.add('hidden');
    } else {
      const lastEntry = history[history.length - 1];
      const snapshot = lastEntry.snapshot;

      order.元素类型 = snapshot.元素类型.slice();
      order.国家 = snapshot.国家.slice();
      order.武器类型 = snapshot.武器类型.slice();
      order.体型 = snapshot.体型.slice();

      record.元素类型 = new Set(order.元素类型);
      record.国家 = new Set(order.国家);
      record.武器类型 = new Set(order.武器类型);
      record.体型 = new Set(order.体型);

      window.__recorder_lastDraw = lastEntry.last;
      renderLast(lastEntry.last, lastEntry.changes);

      hasLastDraw = true;
      const lastBar = document.getElementById('lastCopyBar');
      const recBar = document.getElementById('recordCopyBar');
      const availPanel = document.getElementById('availablePanel');
      if (lastBar) lastBar.classList.remove('hidden');
      if (recBar) recBar.classList.remove('hidden');
      if (availPanel) availPanel.classList.remove('hidden');
    }

    renderHistoryTable();
    renderRecord(null, () => { renderComplement(); });
    saveState();

    // 重置脑筋急转弯状态
    if (window.__brainTeaser) {
      window.__brainTeaser.reset();
    }

    if (onStateChangeCallback) {
      onStateChangeCallback(getState());
    }
  }

  function reset() {
    closePanelSearch();
    Object.values(record).forEach(s => s.clear());
    Object.keys(order).forEach(k => order[k].length = 0);
    document.getElementById('lastDraw').innerHTML = '';
    history.length = 0; renderHistoryTable();
    renderRecord(null, () => { renderComplement(); });
    // 隐藏复制控件与可用复制区域
    hasLastDraw = false;
    window.__recorder_lastDraw = null;
    const lastBar = document.getElementById('lastCopyBar');
    const recBar = document.getElementById('recordCopyBar');
    const copyAvail = document.getElementById('copyAvailable');
    const copyPanel = document.getElementById('copyAvailablePanel');
    const availPanel = document.getElementById('availablePanel');
    if (lastBar) lastBar.classList.add('hidden');
    if (recBar) recBar.classList.add('hidden');
    if (copyAvail) copyAvail.classList.add('hidden');
    if (copyPanel) copyPanel.classList.add('hidden');
    clearState();
    if (onStateChangeCallback) {
      onStateChangeCallback(getState());
    }
  }

  function renderListRow(label, arr, change) {
    const animsEnabled = (window.__recorder_settings && window.__recorder_settings.animationsEnabled !== false);
    const badgeMode = (window.__recorder_settings && window.__recorder_settings.badgeDisplayMode) || 'icon-text';
    const restoring = !!window.__recorder_restoring;
    const doAnims = animsEnabled && !restoring;

    // arr 为字符串或包含 {removed:true,value} 占位的对象
    const parts = arr.map(item => {
      let isRemoved = false;
      let val = item;
      let extraClasses = [];
      let noAnim = false;
      let pulse = false;
      let attrStr = ''; // Declare attrStr here

      if (item && typeof item === 'object' && item.removed) {
        isRemoved = true;
        val = item.value;
        noAnim = item.noAnim;
        pulse = item.pulse;
        extraClasses.push('badge-remove');
        if (noAnim || !doAnims) {
          if (pulse && doAnims) extraClasses.push('add-anim');
        } else {
          extraClasses.push('removal-flash');
        }
      } else {
        // Check for Add animation
        if (change && change.op === 'add' && change.value === val) {
          extraClasses.push('badge-add');
          if (doAnims) extraClasses.push('add-anim');
        }
      }

      // === Icon Logic ===
      let content = val;
      let hasIcon = false;

      if (badgeMode !== 'text') {
        let iconHtml = '';
        if (label === '元素类型' && ELEMENT_SVGS[val]) {
          iconHtml = `<span class="badge-icon svg-icon">${ELEMENT_SVGS[val]}</span>`;
        } else if (label === '武器类型' && WEAPON_ICON_MAP[val]) {
          iconHtml = `<img src="${WEAPON_ICON_MAP[val]}" class="badge-icon img-icon" alt="${val}">`;
        } else if (label === '国家' && NATION_ICON_MAP[val]) {
          iconHtml = `<img src="${NATION_ICON_MAP[val]}" class="badge-icon img-icon" alt="${val}">`;
        } else if (label === '体型' && BODY_ICON_MAP[val]) {
          iconHtml = `<img src="${BODY_ICON_MAP[val]}" class="badge-icon img-icon" alt="${val}">`;
        }

        if (iconHtml) {
          hasIcon = true;
          if (badgeMode === 'icon') {
            content = iconHtml;
            extraClasses.push('icon-only');
            // Tooltip for icon-only mode
            extraClasses.push('hint--top');
            attrStr = `aria-label="${val}"`; // Assign to attrStr
          } else {
            // icon-text
            content = `${iconHtml}<span class="badge-text">${val}</span>`;
            extraClasses.push('with-icon');
          }
        }
      }

      const classStr = ['badge', ...extraClasses].join(' ');
      attrStr = (hasIcon && badgeMode === 'icon') ? `title="${val}"` : attrStr; // Use attrStr, fallback to aria-label if set

      return `<span class="${classStr}" ${attrStr}>${content}</span>`;
    });

    const chips = parts.join('');
    return `<div><div class="label">${label}</div><div class="group">${chips || '<span class="badge">—</span>'}</div></div>`;
  }

  function renderLast(last, changes) {
    const el = document.getElementById('lastDraw');
    el.innerHTML = [
      (() => { const c = changes && changes.元素类型; const arr = (c && c.op === 'remove') ? [{ removed: true, noAnim: true, pulse: true, value: last.元素类型 }] : [last.元素类型]; return renderListRow('元素类型', arr, c); })(),
      (() => { const c = changes && changes.国家; const arr = (c && c.op === 'remove') ? [{ removed: true, noAnim: true, pulse: true, value: last.国家 }] : [last.国家]; return renderListRow('国家', arr, c); })(),
      (() => { const c = changes && changes.武器类型; const arr = (c && c.op === 'remove') ? [{ removed: true, noAnim: true, pulse: true, value: last.武器类型 }] : [last.武器类型]; return renderListRow('武器类型', arr, c); })(),
      (() => { const c = changes && changes.体型; const arr = (c && c.op === 'remove') ? [{ removed: true, noAnim: true, pulse: true, value: last.体型 }] : [last.体型]; return renderListRow('体型', arr, c); })(),
    ].join('');
  }

  function renderRecord(changes, done) {
    const anims = (window.__recorder_settings && window.__recorder_settings.animationsEnabled !== false);
    const el = document.getElementById('record');
    const rows = ["元素类型", "国家", "武器类型", "体型"].map(cat => {
      let base = order[cat].slice();
      const ch = changes && changes[cat];
      if (ch && ch.op === 'remove') {
        // 在原位置插入一个移除占位，动画后消失
        let insertIdx = ch.index;
        if (insertIdx < 0) insertIdx = base.length; // fallback
        base.splice(insertIdx, 0, { removed: true, value: ch.value });
      }
      return renderListRow(cat, base, ch);
    });
    el.innerHTML = rows.join('');

    if (!anims) {
      // 禁用动画时，直接移除所有 badge-remove 并回调
      el.querySelectorAll('.badge-remove').forEach(node => {
        const parent = node.parentElement;
        if (parent) {
          parent.removeChild(node);
          const hasReal = parent.querySelector('.badge:not(.badge-remove)');
          if (!hasReal) {
            const placeholder = document.createElement('span');
            placeholder.className = 'badge';
            placeholder.textContent = '—';
            parent.appendChild(placeholder);
          }
        }
      });
      if (typeof done === 'function') done();
      return;
    }

    // 删除徽标：先闪烁（flash-phase），再收缩消失
    const FLASH_DURATION = 1000;
    requestAnimationFrame(() => {
      const removalNodes = el.querySelectorAll('.removal-flash');
      let finished = 0;
      const total = removalNodes.length;
      removalNodes.forEach(node => {
        node.classList.add('flash-phase');
        const w = node.getBoundingClientRect().width;
        node.style.width = w + 'px';
        setTimeout(() => {
          // 进入收缩阶段
          node.classList.add('collapsing');
          // 再下一帧应用收缩属性（类里已定义）
          requestAnimationFrame(() => {
            // nothing extra
          });
        }, FLASH_DURATION);
        node.addEventListener('transitionend', (e) => {
          if (e.propertyName === 'width') {
            const parent = node.parentElement;
            if (parent) {
              parent.removeChild(node);
              // 若该组已无其他非删除徽标，补一个占位
              const hasReal = parent.querySelector('.badge:not(.badge-remove)');
              const hasRemove = parent.querySelector('.badge-remove');
              if (!hasReal && !hasRemove) {
                const placeholder = document.createElement('span');
                placeholder.className = 'badge';
                placeholder.textContent = '—';
                parent.appendChild(placeholder);
              }
            }
            finished++;
            if (finished === total && typeof done === 'function') {
              // 所有删除动画完成（包含收缩）
              done();
            }
          }
        });
      });
      if (total === 0) {
        // 没有删除：等待可能存在的新增弹跳动画（约 450ms），再调用回调
        if (typeof done === 'function') {
          setTimeout(() => done(), 460);
        }
      }
    });
  }

  // 生成用于复制的文本
  function formatLastDrawText() {
    const last = window.__recorder_lastDraw;
    if (!last) return '本次抽取：— — — —';
    return `本次抽取：${last.元素类型} ${last.国家} ${last.武器类型} ${last.体型}`;
  }

  function formatCurrentRecordText() {
    const e = [...record.元素类型].join('') || '—';
    const n = [...record.国家].join('') || '—';
    const w = [...record.武器类型].join('') || '—';
    const b = [...record.体型].join('') || '—';
    return `记录：${e} ${n} ${w} ${b}`;
  }

  const ICON_CLIPBOARD = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>`;
  const ICON_CHECK = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

  async function copyWithFeedback(text, btn, showHighlight = false) {
    try { await navigator.clipboard.writeText(text); } catch { }
    if (!btn) return;

    // 视觉反馈：仅在快捷键触发时显示蓝框（全局唯一）
    if (showHighlight) {
      // 清除所有可能的蓝框
      document.querySelectorAll('.copy-highlight').forEach(el => {
        el.classList.remove('copy-highlight');
      });

      const panel = btn.closest('.panel');
      if (panel) {
        panel.classList.add('copy-highlight');
        setTimeout(() => {
          panel.classList.remove('copy-highlight');
        }, 3000);
      }
    }

    const originalHTML = btn.innerHTML;
    const originalClass = btn.className;
    btn.classList.add('success');
    btn.innerHTML = ICON_CHECK;
    setTimeout(() => {
      btn.className = originalClass;
      btn.innerHTML = originalHTML;
    }, 1200);
  }

  // 判断一个角色是否应被保留（排除当前记录的类型）：
  // 若某类记录集合非空，则角色对应值必须“不在集合内”；所有已记录类别都需满足。
  function isComplement(char) {
    const charElem = char.元素类型;
    const charNation = char.国家 || '其他';
    const charWeapon = char.武器类型;
    const charBody = char.体型 || '';

    const checks = [
      () => record.元素类型.size === 0 || !record.元素类型.has(charElem),
      () => record.国家.size === 0 || !record.国家.has(charNation),
      () => record.武器类型.size === 0 || !record.武器类型.has(charWeapon),
      () => record.体型.size === 0 || !record.体型.has(charBody),
    ];
    return checks.every(fn => fn());
  }

  // 辅助函数：根据匹配范围高亮文本
  function highlightText(text, search, matchRange) {
    if (!search || !text) return text;

    // 1. 如果有明确的匹配范围（通常来自拼音首字母匹配）
    if (matchRange) {
      const start = matchRange.start;
      const end = start + matchRange.length;
      return text.substring(0, start) +
        `<span class="name-hl">${text.substring(start, end)}</span>` +
        text.substring(end);
    }

    // 2. 备选：直接子串匹配（由于拼音匹配可能优先命中，这里主要处理直接输入文字的情况）
    const idx = text.toLowerCase().indexOf(search.toLowerCase());
    if (idx !== -1) {
      return text.substring(0, idx) +
        `<span class="name-hl">${text.substring(idx, idx + search.length)}</span>` +
        text.substring(idx + search.length);
    }

    return text;
  }

  function renderComplement(skipAnims = false) {
    const grid = document.getElementById('complementList');
    const stats = document.getElementById('stats');
    const copyBox = document.getElementById('copyAvailable');

    const all = window.characterData || {};
    const entries = Object.entries(all);

    const list = entries.filter(([name, data]) => isComplement(data)).map(([name, data]) => ({ name, data }));
    let displayList = [...list];

    if (stats) stats.textContent = `排除当前Ban位后剩余：${list.length} / ${entries.length}`;

    // 处理顶部搜索逻辑：不再过滤 list，而是计算匹配项用于高亮
    let matches = new Map(); // 使用 Map 存储 name -> matchRange
    const isSearchActive = !!panelSearchTerm;
    if (isSearchActive) {
      const hasPinyinSupport = typeof window.pinyinPro !== 'undefined' && typeof window.pinyinPro.pinyin === 'function';
      const pinyinFunc = hasPinyinSupport ? window.pinyinPro.pinyin : null;

      displayList.forEach(item => {
        const name = item.name;
        const lowerName = name.toLowerCase();

        // 1. 优先尝试直接子串匹配
        const subIdx = lowerName.indexOf(panelSearchTerm);
        if (subIdx !== -1) {
          matches.set(name, { start: subIdx, length: panelSearchTerm.length });
          return;
        }

        // 2. 尝试拼音首字母逻辑
        if (window.__brainTeaser && window.__brainTeaser.matchPinyinInitials) {
          const res = window.__brainTeaser.matchPinyinInitials(name, panelSearchTerm, pinyinFunc);
          if (res && res.match) {
            matches.set(name, res.range);
          }
        }
      });

      // Sort displayList to put matches first if searching
      displayList.sort((a, b) => {
        const matchA = matches.has(a.name);
        const matchB = matches.has(b.name);
        if (matchA && !matchB) return -1;
        if (!matchA && matchB) return 1;
        return 0;
      });
    }

    // === Brain Teaser Mode Logic ===
    const settings = window.__recorder_settings || {};
    const brainTeaserMode = settings.brainTeaserMode;
    const isSurrendered = window.__brainTeaser ? window.__brainTeaser.isSurrendered : false;

    // 如果开启了脑筋急转弯且未投降
    // 如果开启了脑筋急转弯且未投降
    if (brainTeaserMode && !isSurrendered) {
      // 隐藏常规列表
      if (grid) grid.classList.add('hidden');
      if (copyBox) copyBox.classList.add('hidden');

      const copyPanel = document.getElementById('copyAvailablePanel');
      if (copyPanel) copyPanel.classList.add('hidden');

      const searchContainer = document.getElementById('panelSearchContainer');
      if (searchContainer) {
        searchContainer.classList.add('hidden');
        // 确保退出搜索状态
        if (searchContainer.classList.contains('active')) {
          searchContainer.classList.remove('active');
          panelSearchTerm = '';
        }
      }

      // 显示脑筋急转弯UI
      if (window.__brainTeaser && hasLastDraw) {
        window.__brainTeaser.renderUI(list);
      } else if (window.__brainTeaser) {
        // 还没开始抽取时，也要显示成验证模式的标题，但隐藏输入框
        // 这里让 brainTeaser 自行处理
        window.__brainTeaser.hideUI();
        // 此时应显示“开始游戏以...”
      }
    } else {
      // 关闭脑筋急转弯UI
      if (window.__brainTeaser) {
        window.__brainTeaser.hideUI();
      }
      const searchContainer = document.getElementById('panelSearchContainer');
      if (searchContainer) searchContainer.classList.remove('hidden');
    }

    // 未进行首次抽取：显示提示（放在 availablePanel 底部），不展示角色卡片
    if (!hasLastDraw) {
      if (grid) {
        grid.innerHTML = '';
        grid.classList.add('hidden');
      }
      if (copyBox) copyBox.classList.add('hidden');
      const copyPanel = document.getElementById('copyAvailablePanel');
      if (copyPanel) copyPanel.classList.add('hidden');

      const panel = document.getElementById('availablePanel');
      if (panel) {
        const exist = panel.querySelector('.no-available');
        if (exist) exist.remove();
        panel.insertAdjacentHTML('beforeend', `<div class="no-available"><div class="no-available-msg">开始一次抽取以记录并查看可用角色列表</div></div>`);
      }
      return;
    }

    // 如果已有抽取但当前没有可用角色，显示空状态图片（放在整个 availablePanel 底部）
    if (hasLastDraw && list.length === 0) {
      // 清空卡片网格
      if (grid) {
        grid.innerHTML = '';
        grid.classList.add('hidden');
      }
      if (copyBox) copyBox.classList.add('hidden');
      const copyPanel = document.getElementById('copyAvailablePanel');
      if (copyPanel) copyPanel.classList.add('hidden');

      // Brain Teaser specific: ensure BT UI is hidden if no chars (or handled inside BT)
      // Actually if list is empty, BT UI should probably be hidden or show empty
      // But standard logic below handles "no available" image.
      if (window.__brainTeaser) window.__brainTeaser.hideUI();

      // 在 availablePanel 底部显示空状态图片
      const panel = document.getElementById('availablePanel');
      if (panel) {
        // 移除已有的占位
        const exist = panel.querySelector('.no-available');
        if (exist) exist.remove();
        panel.insertAdjacentHTML('beforeend', `<div class="no-available"><img src="https://upload-bbs.miyoushe.com/upload/2024/11/03/273489775/a19dced01017ecfcb6ab0fb284ecb215_4557425723990781450.png" alt="无可用角色"></div>`);
      }
      return;
    }

    const anims = (window.__recorder_settings && window.__recorder_settings.animationsEnabled !== false) && !skipAnims;
    const globalAnims = window.__recorder_settings && window.__recorder_settings.animationsEnabled !== false;

    // FLIP: Capture old positions
    const oldPosMap = new Map();
    if (grid && grid.children.length > 0) {
      Array.from(grid.children).forEach(el => {
        const name = el.getAttribute('title');
        if (name) oldPosMap.set(name, el.getBoundingClientRect());
      });
    }

    grid.innerHTML = displayList.map(({ name, data }, i) => {
      const avatar = data.头像 || '';
      // If we are doing FLIP (cards already existed), don't play entry animation
      const isExisting = oldPosMap.has(name);
      let cardClass = (anims && !isExisting) ? 'card card-appear' : 'card';
      let displayName = name;
      if (isSearchActive) {
        const matchRange = matches.get(name);
        if (matchRange) {
          cardClass += ' search-match';
          displayName = highlightText(name, panelSearchTerm, matchRange);
        } else {
          cardClass += ' search-dim';
        }
      }
      const cardStyle = (anims && !isExisting) ? `--stagger:${i}` : '';
      return `<div class="${cardClass}" style="${cardStyle}" title="${name}">
        ${avatar ? `<img src="${avatar}" alt="${name}" class="avatar">` : ''}
        <h3>${displayName}</h3>
      </div>`;
    }).join('');

    if (grid) {
      if (isSearchActive) {
        grid.classList.add('search-active');
      } else {
        grid.classList.remove('search-active');
      }

      if (brainTeaserMode && !isSurrendered) {
        grid.classList.add('hidden');
      } else {
        grid.classList.remove('hidden');
      }

      // FLIP: Calculate new positions and animate
      if (globalAnims && oldPosMap.size > 0 && !document.hidden) {
        requestAnimationFrame(() => {
          const newItems = Array.from(grid.children);
          const moved = [];
          newItems.forEach(el => {
            const name = el.getAttribute('title');
            const oldRect = oldPosMap.get(name);
            if (oldRect) {
              const newRect = el.getBoundingClientRect();
              const dx = oldRect.left - newRect.left;
              const dy = oldRect.top - newRect.top;
              if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
                el.style.transform = `translate(${dx}px, ${dy}px)`;
                el.style.transition = 'none';
                moved.push(el);
              }
            }
          });

          if (moved.length > 0) {
            requestAnimationFrame(() => {
              moved.forEach(el => {
                el.style.transform = '';
                el.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';
              });
            });
          }
        });
      }
    }

    // 渲染完列表后，确保可用面板底部的空状态占位被移除（若存在）
    const panel = document.getElementById('availablePanel');
    if (panel) {
      const exist = panel.querySelector('.no-available');
      if (exist) exist.remove();
    }

    // 生成可复制的名字段落，规则：
    // - 以空格分隔名字；
    // - 每段严格 <=40 字符；
    // - 不拆分名字；若加入下一个名字会超过40，则开启新段；
    // - 若单个名字本身 >40，则它单独成段（无法再分）。
    const N = 40;
    const names = list.map(x => x.name);
    const chunks = [];
    let current = '';
    for (const n of names) {
      if (!current) {
        // 段首放入；若已超限，直接推入并清空
        current = n;
        if (current.length > N) {
          chunks.push(current);
          current = '';
        }
      } else {
        const candidate = current + ' ' + n;
        if (candidate.length <= N) {
          current = candidate;
        } else {
          chunks.push(current);
          if (n.length > N) {
            // 过长名字单独成段
            chunks.push(n);
            current = '';
          } else {
            current = n;
          }
        }
      }
    }
    if (current) chunks.push(current); // 最后残余

    // 渲染复制块
    if (copyBox) {
      copyBox.innerHTML = chunks.map((text, idx) => {
        const chipClass = anims ? 'copy-chip chip-appear' : 'copy-chip';
        const chipStyle = anims ? `style="--stagger:${idx}"` : '';
        return `<div class="${chipClass}" ${chipStyle}>
           <input class="text" value="${text}" readonly>
           <button class="btn btn-icon" data-copy-idx="${idx}" title="复制" aria-label="复制">
             ${ICON_CLIPBOARD}
           </button>
         </div>`;
      }).join('');

      // 绑定复制事件
      copyBox.querySelectorAll('button[data-copy-idx]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const i = parseInt(btn.getAttribute('data-copy-idx'), 10);
          const text = chunks[i] || '';
          try { await navigator.clipboard.writeText(text); } catch { }

          // 持久显示已复制状态，不禁用，供用户作为“已复制”标记
          btn.classList.add('success');
          btn.innerHTML = ICON_CHECK;
        });
      });
      const copyPanel = document.getElementById('copyAvailablePanel');
      if (hasLastDraw && chunks.length && (!brainTeaserMode || isSurrendered)) {
        copyBox.classList.remove('hidden');
        if (copyPanel) copyPanel.classList.remove('hidden');
      } else {
        copyBox.classList.add('hidden');
        if (copyPanel) copyPanel.classList.add('hidden');
      }
    }
  }

  // ===== 历史表格 =====
  function renderHistoryTable() {
    const tbody = document.getElementById('historyTbody');
    if (!tbody) return;
    if (history.length === 0) {
      tbody.innerHTML = '<tr class="empty"><td colspan="5">暂无记录</td></tr>';
      return;
    }
    tbody.innerHTML = history.map(h => {
      const c = h.changes || {};
      const last = h.last;
      const snap = h.snapshot;
      function tdLast(cat) {
        const ch = c[cat];
        if (!ch) {
          return `<td>${last[cat]}</td>`;
        }
        const badgeClass = ch.op === 'add' ? 'hist-badge hist-badge-add' : 'hist-badge hist-badge-remove';
        return `<td><span class="${badgeClass}">${last[cat]}</span></td>`;
      }
      function tdSnap(cat) {
        const arr = snap[cat] || [];
        const text = arr.length ? arr.join(' ') : '—';
        return `<td class="snapshot-cell">${text}</td>`;
      }
      return `<tr class="history-last"><td class="round-cell" rowspan="2">${h.round}</td>${tdLast('元素类型')}${tdLast('国家')}${tdLast('武器类型')}${tdLast('体型')}<td class="avail-cell" rowspan="2">${h.available ?? '—'}</td></tr>
      <tr class="history-snapshot">${tdSnap('元素类型')}${tdSnap('国家')}${tdSnap('武器类型')}${tdSnap('体型')}</tr>`;
    }).join('');
  }

  // ===== 统计功能 =====
  function isBanned(char, snapshot) {
    if (!snapshot) return false;
    if (snapshot.元素类型 && snapshot.元素类型.length > 0 && snapshot.元素类型.includes(char.元素类型)) return true;
    if (snapshot.国家 && snapshot.国家.length > 0 && snapshot.国家.includes(char.国家 || '其他')) return true;
    if (snapshot.武器类型 && snapshot.武器类型.length > 0 && snapshot.武器类型.includes(char.武器类型)) return true;
    if (snapshot.体型 && snapshot.体型.length > 0 && snapshot.体型.includes(char.体型 || '')) return true;
    return false;
  }

  function renderStats() {
    const attrCounts = {};
    const charCounts = {};
    const labelCategory = {}; // 记录标签所属分类
    const categoryCounts = { '元素类型': {}, '国家': {}, '武器类型': {}, '体型': {} };

    // 初始化计数：包含所有类型的标签
    Object.entries(POOLS).forEach(([cat, pool]) => {
      pool.forEach(val => {
        attrCounts[val] = 0;
        labelCategory[val] = cat;
        categoryCounts[cat][val] = 0;
      });
    });

    const allChars = window.characterData || {};
    Object.keys(allChars).forEach(k => charCounts[k] = 0);

    history.forEach(h => {
      const snap = h.snapshot;
      // 统计所有标签 Ban 回合
      ["元素类型", "国家", "武器类型", "体型"].forEach(cat => {
        if (snap && snap[cat]) {
          snap[cat].forEach(val => {
            if (attrCounts[val] !== undefined) {
              attrCounts[val]++;
              categoryCounts[cat][val]++;
            }
          });
        }
      });

      // 统计角色 Ban 回合
      Object.entries(allChars).forEach(([name, data]) => {
        if (isBanned(data, snap)) {
          charCounts[name]++;
        }
      });
    });

    // 渲染概览卡片
    renderStatsOverview();

    // 渲染可用角色趋势
    const availData = history
      .filter(h => h.available !== undefined)
      .map(h => ({ round: h.round, count: h.available }));
    renderLineChart('availChart', availData);

    // 渲染禁用标签环形图
    renderDonutCharts('elemStats', categoryCounts);

    // 渲染角色热力图
    renderCharHeatmap('charStats', charCounts, allChars);
  }

  // 渲染概览卡片
  function renderStatsOverview() {
    const totalRoundsEl = document.getElementById('statsTotalRounds');
    const zeroAvailRoundsEl = document.getElementById('statsZeroAvailRounds');
    const avgAvailEl = document.getElementById('statsAvgAvail');
    const varianceEl = document.getElementById('statsVariance');

    // 获取所有可用角色数数据
    const availData = history.filter(h => h.available !== undefined).map(h => h.available);

    // 计算各项数值
    const totalRounds = history.length;
    const zeroRounds = history.filter(h => h.available === 0).length;
    const avg = availData.length > 0 ? availData.reduce((sum, v) => sum + v, 0) / availData.length : null;
    const stdDev = availData.length > 0 ? Math.sqrt(availData.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / availData.length) : null;

    // 使用动画计数器渲染
    if (totalRoundsEl) animateCounter(totalRoundsEl, totalRounds, 0);
    if (zeroAvailRoundsEl) animateCounter(zeroAvailRoundsEl, zeroRounds, 0);
    if (avgAvailEl) animateCounter(avgAvailEl, avg, 1);
    if (varianceEl) animateCounter(varianceEl, stdDev, 1);
  }

  // 动画计数器 - 创建滚动数字效果
  function animateCounter(el, targetValue, decimals) {
    // 动画禁用时直接显示
    if (window.__recorder_settings && window.__recorder_settings.animationsEnabled === false) {
      el.textContent = targetValue === null ? '—' : targetValue.toFixed(decimals);
      return;
    }

    if (targetValue === null) {
      el.textContent = '—';
      return;
    }

    const valueStr = targetValue.toFixed(decimals);
    const height = 28; // 数字高度，与font-size匹配

    // 清空并创建容器
    el.innerHTML = '';
    el.classList.add('animated-counter');

    // 为每个字符创建数字轮
    const chars = valueStr.split('');
    chars.forEach((char, idx) => {
      if (char === '.') {
        // 小数点直接显示
        const dotSpan = document.createElement('span');
        dotSpan.className = 'counter-dot';
        dotSpan.textContent = '.';
        el.appendChild(dotSpan);
      } else {
        const digit = parseInt(char, 10);
        const digitContainer = document.createElement('span');
        digitContainer.className = 'counter-digit';
        digitContainer.style.height = height + 'px';

        // 创建数字轮
        const wheel = document.createElement('span');
        wheel.className = 'counter-wheel';
        for (let i = 0; i <= 9; i++) {
          const numSpan = document.createElement('span');
          numSpan.className = 'counter-num';
          numSpan.style.height = height + 'px';
          numSpan.textContent = i;
          wheel.appendChild(numSpan);
        }
        digitContainer.appendChild(wheel);
        el.appendChild(digitContainer);

        // 触发动画，从0滚动到目标数字
        requestAnimationFrame(() => {
          setTimeout(() => {
            wheel.style.transform = `translateY(${-digit * height}px)`;
          }, idx * 50); 
        });
      }
    });
  }

  // 渲染环形图
  function renderDonutCharts(containerId, categoryCounts) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const categoryNames = {
      '元素类型': '元素',
      '国家': '国家',
      '武器类型': '武器',
      '体型': '体型'
    };

    const categoryColors = {
      '元素类型': ['#003A8C', '#0050B3', '#096DD9', '#1890FF', '#40A9FF', '#69C0FF', '#91D5FF'],
      '国家': ['#876800', '#AD8B00', '#D4B106', '#F4D40A', '#FBE139', '#FFEB6B', '#FFF690'],
      '武器类型': ['#800D00', '#B8292F', '#D9333B', '#E65E67', '#F57582'],
      '体型': ['#135200 ', '#237804', '#389E0D', '#52C41A', '#73D13D']
    };

    let html = '';
    let chartIndex = 0;

    Object.entries(categoryCounts).forEach(([cat, counts]) => {
      const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      const total = entries.reduce((sum, [, v]) => sum + v, 0);
      const colors = categoryColors[cat] || ['#64748b'];
      const chartId = `donut-${chartIndex++}`;

      html += `<div class="donut-chart-wrapper" data-chart-id="${chartId}" data-title="${categoryNames[cat]}">
        <div class="donut-chart-title">${categoryNames[cat]}</div>
        <svg class="donut-chart-svg" viewBox="0 0 100 100">`;

      if (total === 0) {
        // 空状态
        html += `<circle cx="50" cy="50" r="40" fill="none" stroke="rgba(100,116,139,0.3)" stroke-width="12"/>
          <text x="50" y="50" class="donut-center-text">无数据</text>`;
      } else {
        const radius = 40;
        const circumference = 2 * Math.PI * radius;
        let currentOffset = 0;

        entries.forEach(([label, count], i) => {
          const percent = count / total;
          const dashLength = circumference * percent;
          const color = colors[i % colors.length];

          html += `<circle cx="50" cy="50" r="${radius}" fill="none" 
            stroke="${color}" stroke-width="12"
            stroke-dasharray="${dashLength} ${circumference - dashLength}"
            stroke-dashoffset="${-currentOffset}"
            transform="rotate(-90 50 50)"
            class="donut-segment donut-segment-anim"
            style="--circumference: ${circumference}; --offset: ${-currentOffset}"
            data-label="${label}" data-count="${count}" data-chart="${chartId}"/>`;

          currentOffset += dashLength;
        });

        // 中心文本区域 - 默认显示分类名称，居中显示
        html += `<text x="50" y="50" class="donut-center-label" data-chart="${chartId}">${categoryNames[cat]}</text>
          <text x="50" y="62" class="donut-center-count" data-chart="${chartId}"></text>`;

        // 高亮指示器环 - 用于平滑动画
        html += `<circle cx="50" cy="50" r="40" fill="none" 
          stroke="transparent" stroke-width="14"
          stroke-dasharray="0 ${circumference}"
          stroke-dashoffset="0"
          transform="rotate(-90 50 50)"
          class="donut-highlight-ring"
          data-chart="${chartId}" data-circumference="${circumference}"/>`;
      }

      html += `</svg><div class="donut-legend">`;

      entries.forEach(([label, count], i) => {
        const color = colors[i % colors.length];
        html += `<div class="donut-legend-item" data-label="${label}" data-count="${count}" data-chart="${chartId}">
          <div class="donut-legend-color" style="background:${color}"></div>
          <span class="donut-legend-label">${label}</span>
          <span class="donut-legend-value">${count}</span>
        </div>`;
      });

      html += `</div></div>`;
    });

    container.innerHTML = html;

    // 全局延迟重置定时器，用于快速滑动时避免闪烁
    const resetTimers = {};
    const RESET_DELAY = 150;

    function scheduleReset(chartId, wrapper, labelEl, countEl) {
      // 清除之前的定时器
      if (resetTimers[chartId]) {
        clearTimeout(resetTimers[chartId]);
      }
      resetTimers[chartId] = setTimeout(() => {
        const title = wrapper ? wrapper.dataset.title : '';
        if (labelEl) labelEl.textContent = title;
        if (countEl) countEl.textContent = '';
        if (wrapper) clearSegmentHighlight(wrapper);
        delete resetTimers[chartId];
      }, RESET_DELAY);
    }

    function cancelReset(chartId) {
      if (resetTimers[chartId]) {
        clearTimeout(resetTimers[chartId]);
        delete resetTimers[chartId];
      }
    }

    // 辅助函数：高亮指定片段，其他变灰，并更新高亮指示器环
    function highlightSegment(wrapper, targetLabel) {
      const ring = wrapper.querySelector('.donut-highlight-ring');
      const circumference = ring ? parseFloat(ring.dataset.circumference) : 0;
      let targetSegment = null;

      wrapper.querySelectorAll('.donut-segment').forEach(seg => {
        if (seg.dataset.label === targetLabel) {
          targetSegment = seg;
          seg.classList.add('segment-highlight');
          seg.classList.remove('segment-dimmed');
        } else {
          seg.classList.add('segment-dimmed');
          seg.classList.remove('segment-highlight');
          seg.style.filter = '';
        }
      });

      // 更新高亮指示器环
      if (ring && targetSegment && circumference) {
        const dashArray = targetSegment.getAttribute('stroke-dasharray');
        const dashOffset = targetSegment.getAttribute('stroke-dashoffset');
        const color = targetSegment.getAttribute('stroke');
        const dashLength = parseFloat(dashArray.split(' ')[0]);

        ring.setAttribute('stroke', color);
        ring.setAttribute('stroke-dasharray', `${dashLength} ${circumference - dashLength}`);
        ring.setAttribute('stroke-dashoffset', dashOffset);
        ring.style.filter = `brightness(1.4) drop-shadow(0 0 6px ${color}) drop-shadow(0 0 12px ${color})`;
        ring.classList.add('active');
      }
    }

    // 辅助函数：清除所有片段的高亮/灰色状态，带有扩张消失动画
    function clearSegmentHighlight(wrapper) {
      wrapper.querySelectorAll('.donut-segment').forEach(seg => {
        seg.classList.remove('segment-highlight', 'segment-dimmed');
        seg.style.filter = '';
      });
      // 高亮指示器环：扩张到整个圆环，然后淡出
      const ring = wrapper.querySelector('.donut-highlight-ring');
      if (ring && ring.classList.contains('active')) {
        const circumference = parseFloat(ring.dataset.circumference) || 251.33;
        // 扩张到整个圆环
        ring.setAttribute('stroke-dasharray', `${circumference} 0`);
        ring.setAttribute('stroke-dashoffset', '0');
        // 淡出高光
        ring.style.filter = 'brightness(1) drop-shadow(0 0 0px transparent)';
        ring.classList.add('fading');
        ring.classList.remove('active');
        // 动画结束后重置状态
        setTimeout(() => {
          if (ring.classList.contains('fading')) {
            ring.classList.remove('fading');
            ring.style.filter = '';
          }
        }, 400);
      } else if (ring) {
        ring.classList.remove('active', 'fading');
        ring.style.filter = '';
      }
    }

    // 绑定 hover 事件
    container.querySelectorAll('.donut-segment').forEach(segment => {
      segment.addEventListener('mouseenter', () => {
        const chartId = segment.dataset.chart;
        cancelReset(chartId);
        const label = segment.dataset.label;
        const count = segment.dataset.count;
        const wrapper = segment.closest('.donut-chart-wrapper');
        const labelEl = container.querySelector(`.donut-center-label[data-chart="${chartId}"]`);
        const countEl = container.querySelector(`.donut-center-count[data-chart="${chartId}"]`);
        if (labelEl) labelEl.textContent = label;
        if (countEl) countEl.textContent = `${count}回合`;
        if (wrapper) highlightSegment(wrapper, label);
      });

      segment.addEventListener('mouseleave', () => {
        const chartId = segment.dataset.chart;
        const wrapper = segment.closest('.donut-chart-wrapper');
        const labelEl = container.querySelector(`.donut-center-label[data-chart="${chartId}"]`);
        const countEl = container.querySelector(`.donut-center-count[data-chart="${chartId}"]`);
        scheduleReset(chartId, wrapper, labelEl, countEl);
      });
    });

    // 图例项也支持 hover
    container.querySelectorAll('.donut-legend-item').forEach(item => {
      item.addEventListener('mouseenter', () => {
        const chartId = item.dataset.chart;
        cancelReset(chartId);
        const label = item.dataset.label;
        const count = item.dataset.count;
        const wrapper = item.closest('.donut-chart-wrapper');
        const labelEl = container.querySelector(`.donut-center-label[data-chart="${chartId}"]`);
        const countEl = container.querySelector(`.donut-center-count[data-chart="${chartId}"]`);
        if (labelEl) labelEl.textContent = label;
        if (countEl) countEl.textContent = `${count}回合`;
        if (wrapper) highlightSegment(wrapper, label);
      });

      item.addEventListener('mouseleave', () => {
        const chartId = item.dataset.chart;
        const wrapper = item.closest('.donut-chart-wrapper');
        const labelEl = container.querySelector(`.donut-center-label[data-chart="${chartId}"]`);
        const countEl = container.querySelector(`.donut-center-count[data-chart="${chartId}"]`);
        scheduleReset(chartId, wrapper, labelEl, countEl);
      });
    });
  }

  // 渲染角色排行榜
  function renderCharHeatmap(containerId, charCounts, allChars) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // 渲染所有角色
    const sorted = Object.entries(charCounts)
      .sort((a, b) => b[1] - a[1]);

    const maxCount = sorted.length > 0 ? Math.max(sorted[0][1], 1) : 1;
    const anims = window.__recorder_settings && window.__recorder_settings.animationsEnabled !== false;

    if (sorted.length === 0) {
      container.innerHTML = '<div class="ranking-empty">暂无禁用记录</div>';
      return;
    }

    let currentRank = 1;
    let actualIndex = 0; // 实际索引，用于交错动画

    container.innerHTML = sorted.map(([name, count], index) => {
      // 处理并列排名
      if (index > 0 && count < sorted[index - 1][1]) {
        currentRank = index + 1;
      }

      const char = allChars[name];
      const avatar = char?.头像 || '';
      const element = char?.元素类型 || '';
      const region = char?.国家 || '';
      const weapon = char?.武器类型 || '';
      const body = char?.体型 || '';
      const percent = (count / maxCount) * 100;
      const animClass = anims ? 'ranking-row-anim' : '';
      const animStyle = anims ? `--index:${actualIndex++};--percent:${percent}%` : `--percent:${percent}%`;

      // 添加特殊排名类，用于 CSS 样式
      let rankClass = 'ranking-row';
      if (currentRank === 1) rankClass += ' rank-1';
      else if (currentRank === 2) rankClass += ' rank-2';
      else if (currentRank === 3) rankClass += ' rank-3';

      return `<div class="${rankClass} ${animClass}" style="${animStyle}"
        data-element="${element}" data-region="${region}" data-weapon="${weapon}" data-body="${body}">
        <div class="ranking-rank">${currentRank}</div>
        <div class="ranking-avatar">
          ${avatar ? `<img src="${avatar}" alt="${name}">` : '<div class="avatar-placeholder"></div>'}
        </div>
        <div class="ranking-info">
          <div class="ranking-name">${name}</div>
          <div class="ranking-meta">${element} · ${region} · ${weapon} · ${body}</div>
        </div>
        <div class="ranking-count">${count}</div>
      </div>`;
    }).join('');

    // 绑定 hover 事件，联动更新环形图中心显示
    const elemStats = document.getElementById('elemStats');
    let rankingResetTimer = null;
    const RANKING_RESET_DELAY = 150;

    container.querySelectorAll('.ranking-row').forEach(row => {
      row.addEventListener('mouseenter', () => {
        // 取消之前的重置定时器
        if (rankingResetTimer) {
          clearTimeout(rankingResetTimer);
          rankingResetTimer = null;
        }
        if (!elemStats) return;
        const element = row.dataset.element;
        const region = row.dataset.region;
        const weapon = row.dataset.weapon;
        const body = row.dataset.body;
        const tags = { '元素类型': element, '国家': region, '武器类型': weapon, '体型': body };

        elemStats.querySelectorAll('.donut-chart-wrapper').forEach(wrapper => {
          const chartId = wrapper.dataset.chartId;
          const labelEl = wrapper.querySelector('.donut-center-label');
          const countEl = wrapper.querySelector('.donut-center-count');
          const ring = wrapper.querySelector('.donut-highlight-ring');
          const circumference = ring ? parseFloat(ring.dataset.circumference) : 0;
          // 从 title 获取分类名称
          const title = wrapper.querySelector('.donut-chart-title')?.textContent;
          const categoryMap = { '元素': '元素类型', '国家': '国家', '武器': '武器类型', '体型': '体型' };
          const cat = categoryMap[title];
          if (cat && tags[cat]) {
            const tagValue = tags[cat];
            if (labelEl) labelEl.textContent = tagValue;
            // 查找对应标签的回合数
            const legendItem = wrapper.querySelector(`.donut-legend-item[data-label="${tagValue}"]`);
            const segmentCount = legendItem?.dataset.count || '0';
            if (countEl) countEl.textContent = `${segmentCount}回合`;
            
            // 高亮对应片段，其他变灰，并更新高亮指示器环
            let targetSegment = null;
            wrapper.querySelectorAll('.donut-segment').forEach(seg => {
              if (seg.dataset.label === tagValue) {
                targetSegment = seg;
                seg.classList.add('segment-highlight');
                seg.classList.remove('segment-dimmed');
              } else {
                seg.classList.add('segment-dimmed');
                seg.classList.remove('segment-highlight');
                seg.style.filter = '';
              }
            });

            // 更新高亮指示器环
            if (ring && targetSegment && circumference) {
              const dashArray = targetSegment.getAttribute('stroke-dasharray');
              const dashOffset = targetSegment.getAttribute('stroke-dashoffset');
              const color = targetSegment.getAttribute('stroke');
              const dashLength = parseFloat(dashArray.split(' ')[0]);

              ring.setAttribute('stroke', color);
              ring.setAttribute('stroke-dasharray', `${dashLength} ${circumference - dashLength}`);
              ring.setAttribute('stroke-dashoffset', dashOffset);
              ring.style.filter = `brightness(1.4) drop-shadow(0 0 6px ${color}) drop-shadow(0 0 12px ${color})`;
              ring.classList.add('active');
            }
          }
        });
      });

      row.addEventListener('mouseleave', () => {
        if (!elemStats) return;
        // 延迟恢复，避免快速滑动时闪烁
        rankingResetTimer = setTimeout(() => {
          // 恢复每个环形图的标题显示，并播放扩张消失动画
          elemStats.querySelectorAll('.donut-chart-wrapper').forEach(wrapper => {
            const title = wrapper.dataset.title || '';
            const labelEl = wrapper.querySelector('.donut-center-label');
            const countEl = wrapper.querySelector('.donut-center-count');
            const ring = wrapper.querySelector('.donut-highlight-ring');
            if (labelEl) labelEl.textContent = title;
            if (countEl) countEl.textContent = '';
            // 高亮指示器环：扩张到整个圆环，然后淡出
            if (ring && ring.classList.contains('active')) {
              const circumference = parseFloat(ring.dataset.circumference) || 251.33;
              ring.setAttribute('stroke-dasharray', `${circumference} 0`);
              ring.setAttribute('stroke-dashoffset', '0');
              ring.style.filter = 'brightness(1) drop-shadow(0 0 0px transparent)';
              ring.classList.add('fading');
              ring.classList.remove('active');
              setTimeout(() => {
                if (ring.classList.contains('fading')) {
                  ring.classList.remove('fading');
                  ring.style.filter = '';
                }
              }, 400);
            } else if (ring) {
              ring.classList.remove('active', 'fading');
              ring.style.filter = '';
            }
          });
          // 清除所有片段的高亮/灰色状态
          elemStats.querySelectorAll('.donut-segment').forEach(seg => {
            seg.classList.remove('segment-highlight', 'segment-dimmed');
            seg.style.filter = '';
          });
          rankingResetTimer = null;
        }, RANKING_RESET_DELAY);
      });
    });
  }

  function renderLineChart(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (data.length === 0) {
      container.innerHTML = '<div style="color:#64748b;font-size:0.9rem;padding:8px;">暂无数据</div>';
      return;
    }

    // 如果只有一条数据，不进行特殊补点，直接显示单点
    const chartData = data;

    const width = container.clientWidth - 24;
    const height = container.clientHeight - 40;
    const padding = { top: 10, right: 10, bottom: 20, left: 30 };

    const maxCount = Math.max(...chartData.map(d => d.count), 1);
    const minCount = 0;
    const rounds = chartData.map(d => d.round);
    const maxRound = Math.max(...rounds);
    const minRound = 1; // 强制从1开始

    const getX = (r) => padding.left + ((r - minRound) / (maxRound - minRound || 1)) * (width - padding.left - padding.right);
    const getY = (c) => padding.top + (1 - (c / maxCount)) * (height - padding.top - padding.bottom);

    const points = chartData.map(d => ({ x: getX(d.round), y: getY(d.count), ...d }));
    const linePath = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
    const areaPath = `${linePath} L ${getX(maxRound)} ${getY(0)} L ${getX(minRound)} ${getY(0)} Z`;

    // 生成 Y 轴刻度 (4条)
    const yTicks = [0, Math.floor(maxCount * 0.33), Math.floor(maxCount * 0.66), maxCount];
    const yAxisHtml = yTicks.map(t => `
      <text x="${padding.left - 5}" y="${getY(t)}" class="chart-label chart-label-y" alignment-baseline="middle">${t}</text>
      <line x1="${padding.left}" y1="${getY(t)}" x2="${width - padding.right}" y2="${getY(t)}" class="chart-grid" />
    `).join('');

    // 生成 X 轴刻度 (最多显示 10 个)
    const xStep = Math.max(1, Math.ceil(chartData.length / 10));
    const xAxisHtml = chartData.filter((_, i) => i % xStep === 0).map(d => `
      <text x="${getX(d.round)}" y="${height - 5}" class="chart-label">${d.round}</text>
    `).join('');

    container.innerHTML = `
      <svg class="line-chart-svg" viewBox="0 0 ${width} ${height}">
        <defs>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.5" />
            <stop offset="100%" stop-color="#3b82f6" stop-opacity="0" />
          </linearGradient>
        </defs>
        ${yAxisHtml}
        <path d="${areaPath}" class="chart-area" />
        <path d="${linePath}" class="chart-line" />
        ${points.map((p, i) => `
          <circle cx="${p.x}" cy="${p.y}" r="2.5" class="chart-point ${p.count === 0 ? 'point-zero' : ''} point-anim" 
            style="animation-delay: ${(i / (points.length || 1)) * 1000}ms; ${p.count === 0 ? 'fill: #ef4444; stroke: #fee2e2;' : ''}"
            data-round="${p.round}" data-count="${p.count}" />
        `).join('')}
        ${xAxisHtml}
      </svg>
      <div class="chart-tooltip"></div>
    `;

    // Tooltip 逻辑
    const tooltip = container.querySelector('.chart-tooltip');
    container.querySelectorAll('.chart-point').forEach(p => {
      p.addEventListener('mouseenter', (e) => {
        const r = p.getAttribute('data-round');
        const c = p.getAttribute('data-count');
        tooltip.innerHTML = `第 ${r} 轮: ${c} 人可用`;
        tooltip.style.opacity = '1';
        tooltip.style.left = `${e.offsetX + 10}px`;
        tooltip.style.top = `${e.offsetY - 30}px`;
      });
      p.addEventListener('mousemove', (e) => {
        tooltip.style.left = `${e.offsetX + 10}px`;
        tooltip.style.top = `${e.offsetY - 30}px`;
      });
      p.addEventListener('mouseleave', () => {
        tooltip.style.opacity = '0';
      });
    });

    // 触发折线图动画
    const path = container.querySelector('.chart-line');
    if (path) {
      const len = path.getTotalLength();
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      // 强制重绘
      path.getBoundingClientRect();
      path.classList.add('line-anim');
    }
    const area = container.querySelector('.chart-area');
    if (area) {
      area.classList.add('area-anim');
    }
  }

  function renderBarChart(containerId, counts, classPrefix, labelCategory) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1]);

    if (sorted.length === 0) {
      container.innerHTML = '<div style="color:#64748b;font-size:0.9rem;padding:8px;">暂无数据</div>';
      return;
    }

    const max = sorted[0][1] || 1;

    // 分类映射到 CSS 类名后缀
    const catClassMap = {
      '元素类型': 'elem',
      '国家': 'nation',
      '武器类型': 'weapon',
      '体型': 'body'
    };

    container.innerHTML = sorted.map(([label, count], index) => {
      const percent = (count / max) * 100;
      let barClass = classPrefix;

      if (classPrefix === 'elem-' && labelCategory && labelCategory[label]) {
        const catSuffix = catClassMap[labelCategory[label]] || 'other';
        barClass = `cat-${catSuffix}`;
      } else if (classPrefix === 'elem-') {
        barClass = `elem-${label}`; // fallback
      }

      return `
        <div class="stat-row">
          <div class="stat-label" title="${label}">${label}</div>
          <div class="stat-bar-bg">
            <div class="stat-bar ${barClass} bar-anim" style="width: ${percent}%; animation-delay: ${index * 50}ms"></div>
          </div>
          <div class="stat-count">${count}</div>
        </div>
      `;
    }).join('');
  }

  function openHistory() {
    const modal = document.getElementById('historyModal');
    if (modal) {
      modal.classList.remove('hidden', 'closing');
      document.body.classList.add('modal-open');
      // 重置到第一个 Tab
      const firstTab = modal.querySelector('.tab-btn');
      if (firstTab) firstTab.click();
    }
  }
  function closeHistory() {
    const modal = document.getElementById('historyModal');
    if (modal) {
      modal.classList.add('closing');
      // 等待动画结束后隐藏
      const handle = (e) => {
        if (e.target.classList && e.target.classList.contains('modal-dialog')) {
          modal.classList.add('hidden');
          modal.classList.remove('closing');
          document.body.classList.remove('modal-open');
          modal.removeEventListener('animationend', handle);
        }
      };
      modal.addEventListener('animationend', handle);
    }
  }

  function init() {
    document.getElementById('drawBtn').addEventListener('click', drawOnce);

    const historyBtn = document.getElementById('historyBtn');
    if (historyBtn) historyBtn.addEventListener('click', openHistory);
    document.querySelectorAll('[data-history-close]').forEach(el => {
      el.addEventListener('click', closeHistory);
    });

    // Tab 切换
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');

        const targetId = btn.getAttribute('data-tab') === 'history' ? 'historyView' : 'statsView';

        // Sliding logic
        const slider = document.getElementById('tabSlider');
        if (slider) {
          if (targetId === 'statsView') {
            slider.style.transform = 'translateX(-50%)';
          } else {
            slider.style.transform = 'translateX(0)';
          }
        }

        // document.querySelectorAll('.tab-view').forEach(v => v.classList.add('hidden'));
        // document.getElementById(targetId).classList.remove('hidden');

        // 切换 Tab 时，将滚动位置重置到顶部，避免不同页面的滚动位置相互继承
        const modal = document.getElementById('historyModal');
        if (modal) {
          const views = modal.querySelectorAll('.tab-view');
          views.forEach(v => { try { v.scrollTop = 0; } catch { } });
        }

        if (targetId === 'statsView') {
          // Allow animation to start slightly before render for smoothness, or just render
          renderStats();
        }
      });
    });

    const copyLastBtn = document.getElementById('copyLastBtn');
    const copyRecordBtn = document.getElementById('copyRecordBtn');
    if (copyLastBtn) {
      copyLastBtn.addEventListener('click', (e) => copyWithFeedback(formatLastDrawText(), e.currentTarget));
    }
    if (copyRecordBtn) {
      copyRecordBtn.addEventListener('click', (e) => copyWithFeedback(formatCurrentRecordText().replace(/水/g, '氵'), e.currentTarget));
    }

    // 绑定顶部搜索框逻辑
    const searchBtn = document.getElementById('panelSearchBtn');
    const searchInput = document.getElementById('panelSearchInput');
    const searchContainer = document.getElementById('panelSearchContainer');

    if (searchBtn && searchInput && searchContainer) {
      searchBtn.addEventListener('click', (e) => {
        if (!searchContainer.classList.contains('active')) {
          searchContainer.classList.add('active');
          searchInput.focus();
          searchBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        } else {
          closePanelSearch();
        }
      });

      searchInput.addEventListener('input', () => {
        panelSearchTerm = searchInput.value.trim().toLowerCase().replace(/'/g, '');
        renderComplement(true);
      });

      // 快捷键 ESC 退出搜索
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          closePanelSearch();
        }
      });
    }

    // 尝试加载数据
    loadState();
  }

  // 暴露给外部使用的函数
  window.__recorder_actions = {
    getState,
    restoreState,
    setOnStateChange: (cb) => { onStateChangeCallback = cb; },
    undo,
    reset,
    openHistory: () => {
      document.getElementById('historyModal').classList.remove('hidden');
      document.body.classList.add('modal-open');
      // 重置到第一个 Tab
      const firstTab = document.getElementById('historyModal').querySelector('.tab-btn');
      if (firstTab) firstTab.click();
    },
    refresh, // Expose refresh
    drawOnce,
    formatLastDrawText,
    formatCurrentRecordText,
    copyWithFeedback,
    getRecord: () => record // 暴露当前记录供角色标签弹窗使用
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
