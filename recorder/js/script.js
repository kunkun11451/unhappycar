(function () {
  let hasLastDraw = false;
  let currentAnimationToken = 0; // 用于防止快速多次抽取导致回调错乱
  const history = []; // {round, 元素, 国家, 武器, 体型, changes}
  // 维护显示顺序（与 Set 中内容同步；新增放末尾，删除时移除）
  const order = {
    元素: [],
    国家: [],
    武器: [],
    体型: [],
  };
  // 取值池
  const POOLS = {
    元素: ["水", "火", "冰", "雷", "草", "风", "岩"],
    国家: ["蒙德", "璃月", "稻妻", "须弥", "枫丹", "纳塔", "挪德卡莱"],
    武器: ["单手剑", "双手剑", "弓", "法器", "长柄武器"],
    体型: ["成女", "成男", "少女", "少年", "萝莉"],
  };

  // 当前对称差记录
  const record = {
    元素: new Set(),
    国家: new Set(),
    武器: new Set(),
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
      lastDraw: window.__recorder_lastDraw
    };
  }

  function restoreState(state) {
    if (!state) return;

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
        renderLast(window.__recorder_lastDraw, null);
        renderHistoryTable();
        renderRecord(null, () => { renderComplement(); });
      }

      const lastBar = document.getElementById('lastCopyBar');
      const recBar = document.getElementById('recordCopyBar');
      const availPanel = document.getElementById('availablePanel');
      if (lastBar) lastBar.classList.remove('hidden');
      if (recBar) recBar.classList.remove('hidden');
      if (availPanel) availPanel.classList.remove('hidden');
    } else {
      // 确保清除上一次的显示（如果是重置或加入新房间为空状态时）
      document.getElementById('lastDraw').innerHTML = '';
      const lastBar = document.getElementById('lastCopyBar');
      if (lastBar) lastBar.classList.add('hidden');

      renderHistoryTable();
      renderRecord(null, () => { renderComplement(); });
    }
  }

  function triggerStateChange() {
    if (onStateChangeCallback) {
      onStateChangeCallback(getState());
    }
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
    const token = ++currentAnimationToken;
    const last = {
      元素: pickRandom(POOLS.元素),
      国家: pickRandom(POOLS.国家),
      武器: pickRandom(POOLS.武器),
      体型: pickRandom(POOLS.体型),
    };
    // 计算并记录操作 + 原位置索引（删除时用）
    const lastChanges = {};
    ["元素", "国家", "武器", "体型"].forEach(cat => {
      const val = last[cat];
      const isRemove = (record[cat].has ? record[cat].has(val) : false);
      const change = { value: val, op: isRemove ? 'remove' : 'add', index: -1 };
      if (isRemove) {
        change.index = order[cat].indexOf(val); // 原位置
      }
      lastChanges[cat] = change;
    });
    // 应用对称差 + 更新顺序
    ["元素", "国家", "武器", "体型"].forEach(cat => {
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
      元素: order.元素.slice(),
      国家: order.国家.slice(),
      武器: order.武器.slice(),
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

    const copyPanel = document.getElementById('copyAvailablePanel');
    if (copyAvail && copyAvail.children.length) {
      copyAvail.classList.remove('hidden');
      if (copyPanel) copyPanel.classList.remove('hidden');
    }

    if (availPanel) availPanel.classList.remove('hidden');

    saveState();
    triggerStateChange();
  }

  function undo() {
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

      if (availPanel) {
        const grid = document.getElementById('complementList');
        if (grid) grid.innerHTML = '<div style="padding:12px;color:#94a3b8;font-size:.95rem">开始游戏以记录并查看可用角色列表</div>';
      }
    } else {
      const lastEntry = history[history.length - 1];
      const snapshot = lastEntry.snapshot;

      order.元素 = snapshot.元素.slice();
      order.国家 = snapshot.国家.slice();
      order.武器 = snapshot.武器.slice();
      order.体型 = snapshot.体型.slice();

      record.元素 = new Set(order.元素);
      record.国家 = new Set(order.国家);
      record.武器 = new Set(order.武器);
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
    triggerStateChange();
  }

  function reset() {
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
    // availablePanel 不再隐藏，仅清空内容并提示
    if (availPanel) {
      const grid = document.getElementById('complementList');
      if (grid) grid.innerHTML = '<div style="padding:12px;color:#94a3b8;font-size:.95rem">开始游戏以记录并查看可用角色列表</div>';
    }
    clearState();
    triggerStateChange();
  }

  function renderListRow(label, arr, change) {
    const anims = (window.__recorder_settings && window.__recorder_settings.animationsEnabled !== false);
    // arr 为字符串或包含 {removed:true,value} 占位的对象
    const parts = arr.map(item => {
      if (item && typeof item === 'object' && item.removed) {
        const classes = ['badge', 'badge-remove'];
        if (item.noAnim || !anims) {
          if (item.pulse && anims) classes.push('add-anim');
        } else {
          classes.push('removal-flash');
        }
        return `<span class="${classes.join(' ')}">${item.value}</span>`;
      }
      const v = item;
      if (change && change.op === 'add' && change.value === v) {
        const addClass = anims ? 'badge badge-add add-anim' : 'badge badge-add';
        return `<span class="${addClass}">${v}</span>`;
      }
      return `<span class="badge">${v}</span>`;
    });
    const chips = parts.join('');
    return `<div><div class="label">${label}</div><div class="group">${chips || '<span class="badge">—</span>'}</div></div>`;
  }

  function renderLast(last, changes) {
    const el = document.getElementById('lastDraw');
    el.innerHTML = [
      (() => { const c = changes && changes.元素; const arr = (c && c.op === 'remove') ? [{ removed: true, noAnim: true, pulse: true, value: last.元素 }] : [last.元素]; return renderListRow('元素', arr, c); })(),
      (() => { const c = changes && changes.国家; const arr = (c && c.op === 'remove') ? [{ removed: true, noAnim: true, pulse: true, value: last.国家 }] : [last.国家]; return renderListRow('国家', arr, c); })(),
      (() => { const c = changes && changes.武器; const arr = (c && c.op === 'remove') ? [{ removed: true, noAnim: true, pulse: true, value: last.武器 }] : [last.武器]; return renderListRow('武器', arr, c); })(),
      (() => { const c = changes && changes.体型; const arr = (c && c.op === 'remove') ? [{ removed: true, noAnim: true, pulse: true, value: last.体型 }] : [last.体型]; return renderListRow('体型', arr, c); })(),
    ].join('');
  }

  function renderRecord(changes, done) {
    const anims = (window.__recorder_settings && window.__recorder_settings.animationsEnabled !== false);
    const el = document.getElementById('record');
    const rows = ["元素", "国家", "武器", "体型"].map(cat => {
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
    return `本次抽取：${last.元素} ${last.国家} ${last.武器} ${last.体型}`;
  }

  function formatCurrentRecordText() {
    const e = [...record.元素].join('') || '—';
    const n = [...record.国家].join('') || '—';
    const w = [...record.武器].join('') || '—';
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
    const charElem = char.元素;
    const charNation = char.国家 || '其他';
    const charWeapon = char.武器;
    const charBody = char.体型 || '';

    const checks = [
      () => record.元素.size === 0 || !record.元素.has(charElem),
      () => record.国家.size === 0 || !record.国家.has(charNation),
      () => record.武器.size === 0 || !record.武器.has(charWeapon),
      () => record.体型.size === 0 || !record.体型.has(charBody),
    ];
    return checks.every(fn => fn());
  }

  function renderComplement() {
    const grid = document.getElementById('complementList');
    const stats = document.getElementById('stats');
    const copyBox = document.getElementById('copyAvailable');

    const all = window.characterData || {};
    const entries = Object.entries(all);

    const list = entries.filter(([name, data]) => isComplement(data)).map(([name, data]) => ({ name, data }));

    if (stats) stats.textContent = `排除当前Ban位后剩余：${list.length} / ${entries.length}`;

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
        panel.insertAdjacentHTML('beforeend', `<div class="no-available"><div class="no-available-msg">开始游戏以记录并查看可用角色列表</div></div>`);
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
      // 确保复制区域隐藏
      if (copyBox) copyBox.classList.add('hidden');
      const copyPanel = document.getElementById('copyAvailablePanel');
      if (copyPanel) copyPanel.classList.add('hidden');

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

    const anims = (window.__recorder_settings && window.__recorder_settings.animationsEnabled !== false);
    grid.innerHTML = list.map(({ name, data }, i) => {
      const avatar = data.头像 || '';
      const cardClass = anims ? 'card card-appear' : 'card';
      const cardStyle = anims ? `--stagger:${i}` : '';
      return `<div class="${cardClass}" style="${cardStyle}" title="${name}">
        ${avatar ? `<img src="${avatar}" alt="${name}" class="avatar">` : ''}
        <h3>${name}</h3>
      </div>`;
    }).join('');

    if (grid) grid.classList.remove('hidden');

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
      // 如果已有抽取且存在可复制段，则显示该区域
      const copyPanel = document.getElementById('copyAvailablePanel');
      if (hasLastDraw && chunks.length) {
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
      return `<tr class="history-last"><td class="round-cell" rowspan="2">${h.round}</td>${tdLast('元素')}${tdLast('国家')}${tdLast('武器')}${tdLast('体型')}<td class="avail-cell" rowspan="2">${h.available ?? '—'}</td></tr>
      <tr class="history-snapshot">${tdSnap('元素')}${tdSnap('国家')}${tdSnap('武器')}${tdSnap('体型')}</tr>`;
    }).join('');
  }

  // ===== 统计功能 =====
  function isBanned(char, snapshot) {
    if (!snapshot) return false;
    if (snapshot.元素 && snapshot.元素.length > 0 && snapshot.元素.includes(char.元素)) return true;
    if (snapshot.国家 && snapshot.国家.length > 0 && snapshot.国家.includes(char.国家 || '其他')) return true;
    if (snapshot.武器 && snapshot.武器.length > 0 && snapshot.武器.includes(char.武器)) return true;
    if (snapshot.体型 && snapshot.体型.length > 0 && snapshot.体型.includes(char.体型 || '')) return true;
    return false;
  }

  function renderStats() {
    const attrCounts = {};
    const charCounts = {};
    const labelCategory = {}; // 记录标签所属分类

    // 初始化计数：包含所有类型的标签
    Object.entries(POOLS).forEach(([cat, pool]) => {
      pool.forEach(val => {
        attrCounts[val] = 0;
        labelCategory[val] = cat;
      });
    });

    const allChars = window.characterData || {};
    Object.keys(allChars).forEach(k => charCounts[k] = 0);

    history.forEach(h => {
      const snap = h.snapshot;
      // 统计所有标签 Ban 回合
      ["元素", "国家", "武器", "体型"].forEach(cat => {
        if (snap && snap[cat]) {
          snap[cat].forEach(val => {
            if (attrCounts[val] !== undefined) attrCounts[val]++;
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

    const availData = history
      .filter(h => h.available !== undefined)
      .map(h => ({ round: h.round, count: h.available }));

    renderLineChart('availChart', availData);
    renderBarChart('elemStats', attrCounts, 'elem-', labelCategory);
    renderBarChart('charStats', charCounts, 'char-bar');
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
          <circle cx="${p.x}" cy="${p.y}" r="3.2" class="chart-point ${p.count === 0 ? 'point-zero' : ''} point-anim" 
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
      '元素': 'elem',
      '国家': 'nation',
      '武器': 'weapon',
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

    // 尝试加载数据
    loadState();
  }

  // 暴露给外部使用的函数
  window.__recorder_actions = {
    drawOnce,
    undo,
    reset,
    openHistory,
    copyWithFeedback,
    formatLastDrawText,
    formatCurrentRecordText,
    getState,
    restoreState,
    setOnStateChange: (cb) => { onStateChangeCallback = cb; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
