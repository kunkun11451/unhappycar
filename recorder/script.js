(function(){
  let hasLastDraw = false;
  let currentAnimationToken = 0; // 用于防止快速多次抽取导致回调错乱
  // 维护显示顺序（与 Set 中内容同步；新增放末尾，删除时移除）
  const order = {
    元素类型: [],
    国家: [],
    武器类型: [],
    体型: [],
  };
  // 取值池
  const POOLS = {
    元素类型: ["水","火","冰","雷","草","风","岩"],
    国家: ["蒙德","璃月","稻妻","须弥","枫丹","纳塔","挪德"],
    武器类型: ["单手剑","大剑","弓","法器","长枪"],
    体型: ["成女","成男","少女","少年","萝莉"],
  };

  // 当前对称差记录
  const record = {
    元素类型: new Set(),
    国家: new Set(),
    武器类型: new Set(),
    体型: new Set(),
  };

  // 工具：随机从数组取一个
  function pickRandom(arr){
    return arr[Math.floor(Math.random()*arr.length)];
  }

  // 工具：对称差更新（出现一次加入，再次出现移除）
  function toggle(set, value){
    if(set.has(value)) set.delete(value); else set.add(value);
  }

  // 抽取一次
  function drawOnce(){
    const token = ++currentAnimationToken;
    const last = {
      元素类型: pickRandom(POOLS.元素类型),
      国家: pickRandom(POOLS.国家),
      武器类型: pickRandom(POOLS.武器类型),
      体型: pickRandom(POOLS.体型),
    };
    // 计算并记录操作 + 原位置索引（删除时用）
    const lastChanges = {};
    ["元素类型","国家","武器类型","体型"].forEach(cat=>{
      const val = last[cat];
      const isRemove = (record[cat].has ? record[cat].has(val) : false);
      const change = { value: val, op: isRemove ? 'remove' : 'add', index: -1 };
      if(isRemove){
        change.index = order[cat].indexOf(val); // 原位置
      }
      lastChanges[cat] = change;
    });
    // 应用对称差 + 更新顺序
    ["元素类型","国家","武器类型","体型"].forEach(cat=>{
      const { value, op, index } = lastChanges[cat];
      if(op === 'remove'){
        // 从 Set 删除
        toggle(record[cat], value);
        // 从顺序数组中移除
        const i = order[cat].indexOf(value);
        if(i>-1) order[cat].splice(i,1);
      }else{
        // 添加
        toggle(record[cat], value);
        if(!order[cat].includes(value)) order[cat].push(value);
        // 记录新增后的索引（末尾）
        lastChanges[cat].index = order[cat].length - 1;
      }
    });

    // 渲染
  // 缓存本次抽取，供复制
  window.__recorder_lastDraw = last;
    renderLast(last, lastChanges);
    // 延迟显示当前记录动画（0.8s）
    setTimeout(()=>{
      renderRecord(lastChanges, ()=>{
        // 仅在仍是最新一次抽取时渲染可用角色
        if(token === currentAnimationToken){
          renderComplement();
        }
      });
    }, 800);
  // 显示复制控件与可用复制区域
  hasLastDraw = true;
  const lastBar = document.getElementById('lastCopyBar');
  const recBar = document.getElementById('recordCopyBar');
  const copyAvail = document.getElementById('copyAvailable');
  const availPanel = document.getElementById('availablePanel');
  if(lastBar) lastBar.classList.remove('hidden');
  if(recBar) recBar.classList.remove('hidden');
  if(copyAvail && copyAvail.children.length) copyAvail.classList.remove('hidden');
  if(availPanel) availPanel.classList.remove('hidden');
  }

  function reset(){
    Object.values(record).forEach(s=>s.clear());
  Object.keys(order).forEach(k=> order[k].length = 0);
    document.getElementById('lastDraw').innerHTML = '';
  renderRecord(null, ()=>{ renderComplement(); });
  // 隐藏复制控件与可用复制区域
  hasLastDraw = false;
  const lastBar = document.getElementById('lastCopyBar');
  const recBar = document.getElementById('recordCopyBar');
  const copyAvail = document.getElementById('copyAvailable');
  const availPanel = document.getElementById('availablePanel');
  if(lastBar) lastBar.classList.add('hidden');
  if(recBar) recBar.classList.add('hidden');
  if(copyAvail) copyAvail.classList.add('hidden');
  // availablePanel 不再隐藏，仅清空内容并提示
  if(availPanel){
    const grid = document.getElementById('complementList');
    if(grid) grid.innerHTML = '<div style="padding:12px;color:#94a3b8;font-size:.95rem">开始游戏以记录并查看可用角色列表</div>';
  }
  }

  function renderListRow(label, arr, change){
    // arr 为字符串或包含 {removed:true,value} 占位的对象
    const parts = arr.map(item=>{
      if(item && typeof item === 'object' && item.removed){
        const classes = ['badge','badge-remove'];
        if(item.noAnim){
          if(item.pulse) classes.push('add-anim');
        }else{
          classes.push('removal-flash');
        }
        return `<span class="${classes.join(' ')}">${item.value}</span>`;
      }
      const v = item;
      if(change && change.op === 'add' && change.value === v){
        return `<span class="badge badge-add add-anim">${v}</span>`;
      }
      return `<span class="badge">${v}</span>`;
    });
    const chips = parts.join('');
    return `<div><div class="label">${label}</div><div class="group">${chips || '<span class="badge">—</span>'}</div></div>`;
  }

  function renderLast(last, changes){
    const el = document.getElementById('lastDraw');
    el.innerHTML = [
  (()=>{ const c = changes && changes.元素类型; const arr = (c && c.op==='remove')?[{removed:true,noAnim:true,pulse:true,value:last.元素类型}]:[last.元素类型]; return renderListRow('元素类型', arr, c); })(),
  (()=>{ const c = changes && changes.国家; const arr = (c && c.op==='remove')?[{removed:true,noAnim:true,pulse:true,value:last.国家}]:[last.国家]; return renderListRow('国家', arr, c); })(),
  (()=>{ const c = changes && changes.武器类型; const arr = (c && c.op==='remove')?[{removed:true,noAnim:true,pulse:true,value:last.武器类型}]:[last.武器类型]; return renderListRow('武器类型', arr, c); })(),
  (()=>{ const c = changes && changes.体型; const arr = (c && c.op==='remove')?[{removed:true,noAnim:true,pulse:true,value:last.体型}]:[last.体型]; return renderListRow('体型', arr, c); })(),
    ].join('');
  }

  function renderRecord(changes, done){
    const el = document.getElementById('record');
    const rows = ["元素类型","国家","武器类型","体型"].map(cat=>{
      let base = order[cat].slice();
      const ch = changes && changes[cat];
      if(ch && ch.op==='remove'){
        // 在原位置插入一个移除占位，动画后消失
        let insertIdx = ch.index;
        if(insertIdx < 0) insertIdx = base.length; // fallback
        base.splice(insertIdx,0,{removed:true,value:ch.value});
      }
      return renderListRow(cat, base, ch);
    });
  el.innerHTML = rows.join('');
    // 删除徽标：先闪烁（flash-phase），再收缩消失
    const FLASH_DURATION = 1000; 
    requestAnimationFrame(()=>{
      const removalNodes = el.querySelectorAll('.removal-flash');
      let finished = 0;
      const total = removalNodes.length;
      removalNodes.forEach(node=>{
        node.classList.add('flash-phase');
        const w = node.getBoundingClientRect().width;
        node.style.width = w + 'px';
        setTimeout(()=>{
          // 进入收缩阶段
          node.classList.add('collapsing');
          // 再下一帧应用收缩属性（类里已定义）
          requestAnimationFrame(()=>{
            // nothing extra
          });
        }, FLASH_DURATION);
        node.addEventListener('transitionend', (e)=>{
          if(e.propertyName === 'width'){
            const parent = node.parentElement;
            if(parent){
              parent.removeChild(node);
              // 若该组已无其他非删除徽标，补一个占位
              const hasReal = parent.querySelector('.badge:not(.badge-remove)');
              const hasRemove = parent.querySelector('.badge-remove');
              if(!hasReal && !hasRemove){
                const placeholder = document.createElement('span');
                placeholder.className = 'badge';
                placeholder.textContent = '—';
                parent.appendChild(placeholder);
              }
            }
            finished++;
            if(finished === total && typeof done === 'function'){
              // 所有删除动画完成（包含收缩）
              done();
            }
          }
        });
      });
      if(total === 0){
        // 没有删除：等待可能存在的新增弹跳动画（约 450ms），再调用回调
        if(typeof done === 'function'){
          setTimeout(()=>done(), 460);
        }
      }
    });
  }

  // 生成用于复制的文本
  function formatLastDrawText(){
    const last = window.__recorder_lastDraw;
    if(!last) return '本次抽取：— — — —';
    return `本次抽取：${last.元素类型} ${last.国家} ${last.武器类型} ${last.体型}`;
  }

  function formatCurrentRecordText(){
    const e = [...record.元素类型].join('') || '—';
    const n = [...record.国家].join('') || '—';
    const w = [...record.武器类型].join('') || '—';
    const b = [...record.体型].join('') || '—';
    return `当前记录：${e} ${n} ${w} ${b}`;
  }

  async function copyWithFeedback(text, btn){
    try{ await navigator.clipboard.writeText(text); }catch{}
    if(!btn) return;
    const originalText = btn.textContent;
    const originalClass = btn.className;
    btn.classList.add('success');
    btn.textContent = '✔ 已复制';
    btn.disabled = true;
    setTimeout(()=>{
      btn.className = originalClass;
      btn.textContent = originalText;
      btn.disabled = false;
    }, 1200);
  }

  // 判断一个角色是否应被保留（排除当前记录的类型）：
  // 若某类记录集合非空，则角色对应值必须“不在集合内”；所有已记录类别都需满足。
  function isComplement(char){
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

  function renderComplement(){
    const grid = document.getElementById('complementList');
    const stats = document.getElementById('stats');
    const copyBox = document.getElementById('copyAvailable');

    const all = window.characterData || {};
    const entries = Object.entries(all);

    const list = entries.filter(([name, data])=> isComplement(data)).map(([name, data])=>({name, data}));

  if(stats) stats.textContent = `排除当前记录类型后剩余：${list.length} / ${entries.length}`;

    // 未进行首次抽取：显示提示，不展示角色卡片
    if(!hasLastDraw){
      if(grid){
        grid.innerHTML = '<div style="padding:12px;color:#94a3b8;font-size:.95rem">开始游戏以记录并查看可用角色列表</div>';
      }
      if(copyBox) copyBox.classList.add('hidden');
      return;
    }

    grid.innerHTML = list.map(({name, data},i)=>{
      const avatar = data.头像 || '';
      return `<div class="card card-appear" style="--stagger:${i}" title="${name}">
        ${avatar?`<img src="${avatar}" alt="${name}" class="avatar">`:''}
        <h3>${name}</h3>
      </div>`;
    }).join('');

    // 生成可复制的名字段落，规则：
    // - 以空格分隔名字；
    // - 每段严格 <=40 字符；
    // - 不拆分名字；若加入下一个名字会超过40，则开启新段；
    // - 若单个名字本身 >40，则它单独成段（无法再分）。
    const N = 40;
    const names = list.map(x=>x.name);
    const chunks = [];
    let current = '';
    for(const n of names){
      if(!current){
        // 段首放入；若已超限，直接推入并清空
        current = n;
        if(current.length > N){
          chunks.push(current);
          current = '';
        }
      }else{
        const candidate = current + ' ' + n;
        if(candidate.length <= N){
          current = candidate;
        }else{
          chunks.push(current);
          if(n.length > N){
            // 过长名字单独成段
            chunks.push(n);
            current = '';
          }else{
            current = n;
          }
        }
      }
    }
    if(current) chunks.push(current); // 最后残余

    // 渲染复制块
    if(copyBox){
      copyBox.innerHTML = chunks.map((text, idx)=>
        `<div class="copy-chip">
           <input class="text" value="${text}" readonly>
           <button class="btn" data-copy-idx="${idx}">复制</button>
         </div>`
      ).join('');

      // 绑定复制事件
      copyBox.querySelectorAll('button[data-copy-idx]').forEach(btn=>{
        btn.addEventListener('click', async (e)=>{
          const i = parseInt(btn.getAttribute('data-copy-idx'),10);
          const text = chunks[i] || '';
          try{ await navigator.clipboard.writeText(text); }catch{}
          // 持久显示已复制状态，不禁用，供用户作为“已复制”标记
          btn.classList.add('success');
          btn.textContent = '✔ 已复制';
        });
      });
      // 如果已有抽取且存在可复制段，则显示该区域
  if(hasLastDraw && chunks.length){
        copyBox.classList.remove('hidden');
      }else{
        copyBox.classList.add('hidden');
      }
    }
  }

  function init(){
    document.getElementById('drawBtn').addEventListener('click', drawOnce);
    document.getElementById('resetBtn').addEventListener('click', reset);
    const copyLastBtn = document.getElementById('copyLastBtn');
    const copyRecordBtn = document.getElementById('copyRecordBtn');
    if(copyLastBtn){
      copyLastBtn.addEventListener('click', (e)=> copyWithFeedback(formatLastDrawText(), e.currentTarget));
    }
    if(copyRecordBtn){
      copyRecordBtn.addEventListener('click', (e)=> copyWithFeedback(formatCurrentRecordText(), e.currentTarget));
    }
  renderRecord(null, ()=>{ renderComplement(); });
  // 初始隐藏复制控件
  const lastBar = document.getElementById('lastCopyBar');
  const recBar = document.getElementById('recordCopyBar');
  if(lastBar) lastBar.classList.add('hidden');
  if(recBar) recBar.classList.add('hidden');
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  }else{
    init();
  }
})();
