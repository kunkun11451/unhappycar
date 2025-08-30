// “不要做挑战”特殊玩法模块
(function(){
  const state = {
    active: false,
    playerCount: 4,
  lastMissions: [], // 保存上轮各P事件文本
  selfIndex: null, // 本机玩家的P位（0-based）
  counters: [0, 0, 0, 0], // 每个P位的“不能做”触发计数
  seats: [null, null, null, null], // 座位占用（仅用于回显）
  _asked: false,
  _askedSeat: false,
  _originalRulesHTML: null, // 缓存原始规则区域，便于需要时还原
  _rulesInjected: false
  };

  // 简易获取元素
  function qs(sel){ return document.querySelector(sel); }
  function qsa(sel){ return Array.from(document.querySelectorAll(sel)); }

  // UI：通用弹窗
  // 使用 multiplayer 提供的统一弹窗风格
  function showSelectionDialog({ title, options, onSelect, disableCancel = false, closeOnOverlayClick = true }) {
    if (window.showStyledOptionDialog) {
      const opts = options.map(o => ({ label: o.label, value: o.value, onSelect: (v) => onSelect(v) }));
      window.showStyledOptionDialog({ title, options: opts, disableCancel, closeOnOverlayClick });
      return;
    }
  // 兜底：样式弹窗未就绪时不做自动选择，待后续 onStateUpdated 或下次触发再弹
  }

  // 固定4人：不弹P数选择
  function showPCountDialogIfNeeded() {
    state.playerCount = 4;
    showHideMissionBoxes();
  }

  // 选择本机P位（1..playerCount）
  function showSeatDialogIfNeeded() {
    if (state._askedSeat) return;
    state._askedSeat = true;
    const count = state.playerCount || 4;
    const options = Array.from({ length: count }, (_, i) => ({ label: `${i+1}P`, value: i }));
    showSelectionDialog({
      title: '你在游戏中是....',
      options,
      disableCancel: true,
      closeOnOverlayClick: false,
      onSelect(value) {
        state.selfIndex = value;
        applyMasks();
        
        // 更新聊天系统的座位信息
        if (window.chatSystem && typeof window.chatSystem.initialize === 'function') {
          const roomId = window.multiplayerManager && window.multiplayerManager.getRoomId ? window.multiplayerManager.getRoomId() : null;
          if (roomId) {
            window.chatSystem.initialize(value + 1, roomId); // value是0-based，座位是1-based
          }
        }
        
        // 占座上报到服务器
        try {
          if (window.multiplayerManager && window.multiplayerManager.getWebSocket && window.multiplayerManager.getRoomId) {
            const ws = window.multiplayerManager.getWebSocket();
            const roomId = window.multiplayerManager.getRoomId();
            const playerId = window.multiplayerManager.getCurrentPlayerId ? window.multiplayerManager.getCurrentPlayerId() : undefined;
            if (ws && roomId) {
              ws.send(JSON.stringify({ type: 'noChallenge_seatClaim', roomId, seatIndex: value, playerId }));
            }
          }
        } catch (e) { console.warn('占座上报失败', e); }
      }
    });
  }

  // 隐藏困难事件与设置里事件历史入口
  function applyGlobalHiding(){
    const hardMissionsContainer = qs('#hardMissionsContainer');
    const selectedHardMission = qs('#selectedHardMission');
    if (hardMissionsContainer) hardMissionsContainer.style.display = 'none';
    if (selectedHardMission) selectedHardMission.style.display = 'none';

    const eventHistoryBtn = qs('#eventHistory');
    if (eventHistoryBtn) eventHistoryBtn.style.display = 'none';

  // 隐藏设置中的“事件创意工坊”入口
  const sharedEventsBtn = qs('#sharedEvents');
  if (sharedEventsBtn) sharedEventsBtn.style.display = 'none';

    // 锁定重抽次数为关闭状态并更新UI
    if (!window.rerollSettings) window.rerollSettings = {};
    window.rerollSettings.enabled = false;
    if (typeof window.updateRerollUI === 'function') {
      window.updateRerollUI();
    }
    const rerollCounter = qs('#rerollCounter');
    if (rerollCounter) rerollCounter.style.display = 'none';

  // 在该模式下，所有事件卡隐藏内容区域，只显示标题
  qsa('.mission-content').forEach(el => { el.style.display = 'none'; });
  
  // 修改事件标题样式：居中显示并放大
  qsa('.mission-title').forEach(el => {
    el.style.cssText += `
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      font-size: 1.4em;
      font-weight: 600;
      line-height: 1.3;
      min-height: 120px;
      padding: 20px 15px;
      margin: 0;
    `;
  });
  }

  // 规则区域：在不要做挑战模式下展示专用说明
  function renderNoChallengeRules(){
    try {
      const rulesContent = qs('.rules-container .rules-content');
      if (!rulesContent) return;
      // 首次进入时缓存原始内容
      if (!state._originalRulesHTML && !state._rulesInjected) {
        state._originalRulesHTML = rulesContent.innerHTML;
      }
      // 注入专用规则
      rulesContent.innerHTML = `
        <ul>
          <h3>不要做挑战 模式简介</h3>

          <h3>基本规则</h3>
          <li>每位玩家抽取一张卡片，包含一条不能做的事件。</li>
          <li>玩家看不到自己的事件，只能看到他人的。</li>
          <li>如果做或说了自己卡片上的事情，则扣一分；如果推测出自己卡片上的内容，则加一分。并且重抽卡片。</li>
          <li>相互算计使其他玩家扣分，避免触发或猜出自己的内容以获得最后的胜利。</li>

          <h3>操作与游戏管理</h3>
          <li>进入房间后，首先根据游戏内的P数选择位置，如果选错可以刷新网页重进房间。</li>
          <li>游戏开始，主持人点击“抽取事件”后为每人生成1条个人事件。</li>
          <li>当玩家触发了不能做事件后，主持人可点击TA的“事件卡片”来刷新对应事件卡。</li>
          <li>（主持人同时也是玩家，看不到自己的事件，触发时其他玩家可以提醒主持人为自己刷新）</li>
          <li>主持人按照规则通过对应事件卡片下方的+—按钮，为每位玩家计分</li>
          <li>提供了4个人4个群的独立秘密聊天频道，方便相互算计🥵，可通过屏幕右侧的按钮打开。</li>

          <h3>其他规则与注意事项</h3>
          <li>其他获胜条件、长时间未触发的换牌，每次猜词的次数限制等，地主归最终解释权所有。</li>
          <li>当前为测试版，可能存在些许bug，且服务器与正式版不互通。</li>
          
        </ul>
      `;
      state._rulesInjected = true;
    } catch (e) {
      console.warn('渲染不要做挑战规则失败', e);
    }
  }

  // 首次点击“抽取事件”后，隐藏按钮，并记录当次内容为上一轮
  function hookMissionButton() {
    const missionButton = qs('#missionButton');
    if (!missionButton || missionButton._nochallenge_hooked) return;
    missionButton._nochallenge_hooked = true;
    missionButton.addEventListener('click', () => {
      // 延迟读取内容，等待原逻辑写入
      setTimeout(() => {
  // 第一轮不记录“上轮事件”，避免显示为本轮内容
  state.lastMissions = [];
  renderLastMissions();
        // 隐藏按钮
        missionButton.style.display = 'none';

  // 初次抽完后，按身份设置交互：主持人可直接点击事件卡，其他人禁用
  const isHost = !!(window.multiplayerManager && typeof window.multiplayerManager.isHost === 'function' && window.multiplayerManager.isHost());
  restrictSingleRefresh(isHost);

        // 抽完后再次遮蔽自己的事件
        setTimeout(() => {
          applyMasks();
          // 重新应用标题样式
          qsa('.mission-title').forEach(el => {
            el.style.cssText += `
              display: flex;
              align-items: center;
              justify-content: center;
              text-align: center;
              font-size: 1.4em;
              font-weight: 600;
              line-height: 1.3;
              min-height: 120px;
              padding: 20px 15px;
              margin: 0;
            `;
          });
          // 重新渲染上轮事件
          renderLastMissions();
        }, 50);
      }, 350);
    }, { capture: true });
  }

  // 仅主持人可单独刷新：屏蔽事件卡点击，改为点击角色卡触发对应事件卡点击
  function restrictSingleRefresh(isHost){
    const boxes = qsa('.mission-box');
    boxes.forEach((box, idx) => {
      // 显示P标识（若没有）
      ensurePlayerTag(box, idx);
      // 遮蔽自己的事件文本
      maskOwnMissionIfNeeded(box, idx);
      // 根据身份控制是否允许点击事件卡单独刷新
      box.style.pointerEvents = isHost ? 'auto' : 'none';

      // 为事件卡添加捕获阶段监听：在刷新前记录“上轮事件”
      if (!box._nochallenge_captureHooked) {
        box._nochallenge_captureHooked = true;
        box.addEventListener('click', (e) => {
          // 如果点击来自计分控件，跳过刷新/记录逻辑
          if (e && e.target && (e.target.closest('.nc-score') || e.target.closest('.nc-score-btn'))) {
            return;
          }
          // 刷新前保存旧内容
          updateLastMissionForIndex(idx);
          // 主持人同步一次lastMissions（便于其他端看到“上轮事件”）
          if (isHost && typeof window.sendGameState === 'function') {
            try { window.sendGameState(); } catch {}
          }

          // 刷新后再次遮蔽自己的事件并重新应用样式
          setTimeout(() => {
            applyMasks();
            // 重新应用标题样式
            qsa('.mission-title').forEach(el => {
              el.style.cssText += `
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
                font-size: 1.4em;
                font-weight: 600;
                line-height: 1.3;
                min-height: 120px;
                padding: 20px 15px;
                margin: 0;
              `;
            });
            // 重新渲染上轮事件
            renderLastMissions();
          }, 420);
        }, true);
      }
    });

    // 主持人通过点击角色卡触发对应事件卡的刷新
    const characterBoxes = qsa('.character-box');
    characterBoxes.forEach((cbox, idx) => {
      if (!cbox._nochallenge_clickBound) {
        cbox._nochallenge_clickBound = true;
        cbox.addEventListener('click', () => {
          if (isHost) {
            const mboxes = qsa('.mission-box');
            if (mboxes[idx]) {
              mboxes[idx].click();
            }
          }
        });
      }
    });
  }

  function ensurePlayerTag(box, idx){
    if (box.querySelector('.player-tag')) return;
    const tag = document.createElement('div');
    tag.className = 'player-tag';
    tag.textContent = `${idx+1}P`;
    tag.style.cssText = 'position:absolute;right:8px;top:6px;background:#3396D9;color:#fff;border-radius:10px;padding:2px 6px;font-size:12px;';
    box.style.position = 'relative';
    box.appendChild(tag);
  }

  // 移除覆盖层方案，改回内容改写方案

  function maskOwnMissionIfNeeded(box, idx){
    if (state.selfIndex == null) return;
    if (idx !== state.selfIndex) return;
    const title = box.querySelector('.mission-title');
    const content = box.querySelector('.mission-content');
    if (!title || !content) return;
    // 保存真实数据到 data-real*，若尚未保存
    if (!title.dataset.realTitle) title.dataset.realTitle = title.textContent || '';
    if (!content.dataset.realContent) content.dataset.realContent = content.innerHTML || '';
    // 改写可见内容为问号
    title.textContent = '？';
    content.textContent = '？';
    content.innerHTML = '？';
  }

  function applyMasks(){
    const boxes = qsa('.mission-box');
    boxes.forEach((box, idx) => maskOwnMissionIfNeeded(box, idx));
  }

  // 记录当前四张事件卡为上一轮
  function captureCurrentMissionsAsLast(){
    const boxes = qsa('.mission-box');
    state.lastMissions = boxes.map(box => {
      const t = box.querySelector('.mission-title');
      const c = box.querySelector('.mission-content');
      const title = t ? (t.dataset.realTitle ?? t.textContent) : '';
      const content = c ? (c.dataset.realContent ?? (c.innerHTML || c.textContent)) : '';
      return { title, content };
    });
    // 渲染“上轮事件”
    renderLastMissions();
  }

  function updateLastMissionForIndex(idx){
    const boxes = qsa('.mission-box');
    const box = boxes[idx];
    if (!box) return;
  const t = box.querySelector('.mission-title');
  const c = box.querySelector('.mission-content');
  const realTitle = t ? (t.dataset.realTitle ?? t.textContent) : '';
  const realContent = c ? (c.dataset.realContent ?? (c.innerHTML || c.textContent)) : '';
  state.lastMissions[idx] = { title: realTitle, content: realContent };
    renderLastMissions();
  }

  function renderLastMissions(){
    const boxes = qsa('.mission-box');
    boxes.forEach((box, idx) => {
      // 移除旧的
      const old = box.querySelector('.last-mission');
      if (old) old.remove();
      const info = state.lastMissions[idx];
      if (!info) return;
      const div = document.createElement('div');
      div.className = 'last-mission';
      div.style.cssText = `
        position: absolute;
        bottom: 45px;
        left: 8px;
        right: 8px;
        color: #888;
        font-size: 11px;
        padding: 4px 8px;
        border-radius: 4px;
        text-align: center;
        z-index: 10;
      `;
      div.textContent = `上轮事件：${info.title}`;
      box.appendChild(div);
    });
  }

  // 渲染每个卡片下方的分数与加减按钮
  function renderScores(){
    const boxes = qsa('.mission-box');
    const isHost = !!(window.multiplayerManager && typeof window.multiplayerManager.isHost === 'function' && window.multiplayerManager.isHost());
    boxes.forEach((box, idx) => {
      // 确保容器为定位上下文，并预留底部空间避免遮挡
      box.style.position = 'relative';
      // 预留底部空间容纳计分条（非侵入式，覆盖现有样式）
      box.style.paddingBottom = '38px';

      // 如果还没有包裹容器，则创建包裹，使外部按钮能固定在卡片正下方
      let wrapper = box.parentNode && box.parentNode.classList && box.parentNode.classList.contains('nc-wrap')
        ? box.parentNode
        : null;
      if (!wrapper) {
        const originalParent = box.parentNode;
        const newWrap = document.createElement('div');
        newWrap.className = 'nc-wrap';
        newWrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;';
        // 让包裹元素在flex容器中占位，保持与卡片一致的间距
        // 使用与卡片相同的外边距，将卡片本身外边距归零
        newWrap.style.margin = '2px';
        // 尽量匹配卡片宽度（首次渲染可能为0，允许浏览器自适应）
        try { if (box.offsetWidth) newWrap.style.width = box.offsetWidth + 'px'; } catch {}
        if (originalParent) {
          originalParent.insertBefore(newWrap, box);
          // 重置卡片外边距，由包裹承担间距
          box.style.margin = '0';
          newWrap.appendChild(box);
        }
        wrapper = newWrap;
      }
      // 移除旧的计分区
      const old = box.querySelector('.nc-score');
      if (old) old.remove();
      // 移除旧的外部控制区（在包裹内）
      if (wrapper) {
        const oldCtrl = wrapper.querySelector('.nc-score-controls');
        if (oldCtrl) oldCtrl.remove();
      }
      // 仅显示前4P
      if (idx >= (state.playerCount || 4)) return;
      const cnt = Number(state.counters[idx] || 0);
  const wrap = document.createElement('div');
      wrap.className = 'nc-score';
      wrap.style.cssText = 'position:absolute;left:0;right:0;bottom:6px;color:#666;font-size:12px;display:flex;gap:8px;align-items:center;justify-content:center;background:transparent;text-align:center;';

      const label = document.createElement('span');
      label.textContent = `分数：${cnt}`;
      wrap.appendChild(label);

      box.appendChild(wrap);

      // 仅主持人显示外部加减按钮（放在卡片外，包裹内部）
      if (isHost && wrapper) {
        const ctrl = document.createElement('div');
        ctrl.className = 'nc-score-controls';
        ctrl.style.cssText = 'display:flex;justify-content:center;gap:10px;margin:6px 0 10px;';

        const minus = document.createElement('button');
        minus.className = 'nc-score-btn nc-score-minus';
        minus.textContent = '−';
        minus.title = '减少1分';
        minus.style.cssText = 'padding:4px 12px;font-size:14px;border:1px solid #ccc;border-radius:6px;background:#f8f8f8;cursor:pointer;';
        minus.addEventListener('click', (ev) => {
          ev.stopPropagation();
          ev.preventDefault();
          state.counters[idx] = (Number(state.counters[idx]) || 0) - 1;
          renderScores();
          if (typeof window.sendGameState === 'function') {
            try { window.sendGameState(); } catch {}
          }
        });

        const plus = document.createElement('button');
        plus.className = 'nc-score-btn nc-score-plus';
        plus.textContent = '+';
        plus.title = '增加1分';
        plus.style.cssText = 'padding:4px 12px;font-size:14px;border:1px solid #ccc;border-radius:6px;background:#f8f8f8;cursor:pointer;';
        plus.addEventListener('click', (ev) => {
          ev.stopPropagation();
          ev.preventDefault();
          state.counters[idx] = (Number(state.counters[idx]) || 0) + 1;
          renderScores();
          if (typeof window.sendGameState === 'function') {
            try { window.sendGameState(); } catch {}
          }
        });

  ctrl.appendChild(minus);
  ctrl.appendChild(plus);
  // 插入到卡片之后（同一包裹内，确保在下方）
  wrapper.appendChild(ctrl);
      }
    });
  }

  function showHideMissionBoxes(){
    const boxes = qsa('.mission-box');
    boxes.forEach((box, idx) => {
      box.style.display = (idx < (state.playerCount || 4)) ? '' : 'none';
    });
  }

  function disableMissionBoxClicks(){
    const boxes = qsa('.mission-box');
    boxes.forEach((box) => {
      box.style.pointerEvents = 'none';
    });
  }

  // 当状态从主机同步来时
  function onStateUpdated(payload){
    if (!payload) return;
  // 固定为4人
  state.playerCount = 4;
    if (Array.isArray(payload.seats)) {
      state.seats = payload.seats.slice(0,4);
      // 提示 multiplayer 刷新座位 chips（如果提供了接口）
      if (window.multiplayerManager && typeof window.multiplayerManager.onNoChallengeSeats === 'function') {
        try { window.multiplayerManager.onNoChallengeSeats(state.seats); } catch {}
      }
    }
    if (Array.isArray(payload.counters)) {
      // 使用来自主机的计数器
      // 只保留前4位，防御性赋值
      const arr = payload.counters.slice(0, 4).map(v => Number(v) || 0);
      while (arr.length < 4) arr.push(0);
      state.counters = arr;
    }
    if (Array.isArray(payload.lastMissions)) {
      state.lastMissions = payload.lastMissions;
      renderLastMissions();
    }
    applyGlobalHiding();
    showHideMissionBoxes();

  // 在该模式下替换规则说明
  renderNoChallengeRules();

  // 固定4人：只弹自己的P位
  showPCountDialogIfNeeded();
    showSeatDialogIfNeeded();

    // 根据当前身份设置交互
    const isHost = !!(window.multiplayerManager && typeof window.multiplayerManager.isHost === 'function' && window.multiplayerManager.isHost());
    restrictSingleRefresh(isHost);
    applyMasks();
  // 再次保证内容区域被隐藏
  qsa('.mission-content').forEach(el => { el.style.display = 'none'; });
  // 渲染分数与加减按钮
  renderScores();
  }

  function getLastMissions(){ return state.lastMissions; }

  function activate({ isHost }){
    state.active = true;
    applyGlobalHiding();
    hookMissionButton();
    // 初始时，按P数隐藏多余卡
    showHideMissionBoxes();

  // 替换规则说明
  renderNoChallengeRules();

    restrictSingleRefresh(!!isHost);
    applyMasks();
  // 再次保证内容区域被隐藏
  qsa('.mission-content').forEach(el => { el.style.display = 'none'; });
  // 初始化并渲染分数与加减按钮
  if (!Array.isArray(state.counters) || state.counters.length !== 4) state.counters = [0,0,0,0];
  renderScores();

    // 若样式弹窗已经可用且尚未选择P位，延迟引导一次
    setTimeout(() => {
      if (!state._askedSeat && window.showStyledOptionDialog) {
        showSeatDialogIfNeeded();
      }
    }, 300);
  }

  window.noChallengeMode = {
  get active(){ return state.active; },
    activate,
    onStateUpdated,
  getLastMissions,
  getCounters(){ return Array.from(state.counters); },
  getSeats(){ return Array.from(state.seats); },
  // 供同步：让主持人带上playerCount
  getPlayerCount(){ return state.playerCount; },
  // 同步时决定是否冻结某个索引的内容（不被覆盖）
  shouldFreezeIndex(index){
    // 选择P位后才冻结自己的位置
    return state.selfIndex != null && index === state.selfIndex;
  }
  };
})();
