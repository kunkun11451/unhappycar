(function(){
  let hasLastDraw = false;
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
    const last = {
      元素类型: pickRandom(POOLS.元素类型),
      国家: pickRandom(POOLS.国家),
      武器类型: pickRandom(POOLS.武器类型),
      体型: pickRandom(POOLS.体型),
    };
    // 计算本次对称差效果：true=新增，false=删除
    const lastChanges = {
      元素类型: { value: last.元素类型, op: record.元素类型.has(last.元素类型) ? 'remove' : 'add' },
      国家: { value: last.国家, op: record.国家.has(last.国家) ? 'remove' : 'add' },
      武器类型: { value: last.武器类型, op: record.武器类型.has(last.武器类型) ? 'remove' : 'add' },
      体型: { value: last.体型, op: record.体型.has(last.体型) ? 'remove' : 'add' },
    };

    // 更新记录
    toggle(record.元素类型, last.元素类型);
    toggle(record.国家, last.国家);
    toggle(record.武器类型, last.武器类型);
    toggle(record.体型, last.体型);

    // 渲染
  // 缓存本次抽取，供复制
  window.__recorder_lastDraw = last;
  renderLast(last, lastChanges);
  renderRecord(lastChanges);
    renderComplement();
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
    document.getElementById('lastDraw').innerHTML = '';
    renderRecord();
    renderComplement();
  // 隐藏复制控件与可用复制区域
  hasLastDraw = false;
  const lastBar = document.getElementById('lastCopyBar');
  const recBar = document.getElementById('recordCopyBar');
  const copyAvail = document.getElementById('copyAvailable');
  const availPanel = document.getElementById('availablePanel');
  if(lastBar) lastBar.classList.add('hidden');
  if(recBar) recBar.classList.add('hidden');
  if(copyAvail) copyAvail.classList.add('hidden');
  if(availPanel) availPanel.classList.add('hidden');
  }

  function renderListRow(label, values, change){
    // values: Set 或 数组（上次抽取传数组，当前记录传 Set）
    const arr = Array.isArray(values) ? values.slice() : (values && values.size ? [...values] : []);
    arr.sort();
    const parts = arr.map(v=>{
      if(change && change.op === 'add' && change.value === v){
        return `<span class="badge badge-add">${v}</span>`;
      }
      return `<span class="badge">${v}</span>`;
    });
    // 若本次操作是删除，则额外显示被删的值（即使不在集合中）
    if(change && change.op === 'remove' && change.value){
      parts.push(`<span class="badge badge-remove">✕ ${change.value}</span>`);
    }
    const chips = parts.join('');
    return `<div><div class="label">${label}</div><div class="group">${chips || '<span class="badge">—</span>'}</div></div>`;
  }

  function renderLast(last, changes){
    const el = document.getElementById('lastDraw');
    el.innerHTML = [
  (()=>{ const c = changes && changes.元素类型; return renderListRow('元素类型', (c && c.op==='remove')?[]:[last.元素类型], c); })(),
  (()=>{ const c = changes && changes.国家; return renderListRow('国家', (c && c.op==='remove')?[]:[last.国家], c); })(),
  (()=>{ const c = changes && changes.武器类型; return renderListRow('武器类型', (c && c.op==='remove')?[]:[last.武器类型], c); })(),
  (()=>{ const c = changes && changes.体型; return renderListRow('体型', (c && c.op==='remove')?[]:[last.体型], c); })(),
    ].join('');
  }

  function renderRecord(changes){
    const el = document.getElementById('record');
    el.innerHTML = [
      renderListRow('元素类型', record.元素类型, changes && changes.元素类型),
      renderListRow('国家', record.国家, changes && changes.国家),
      renderListRow('武器类型', record.武器类型, changes && changes.武器类型),
      renderListRow('体型', record.体型, changes && changes.体型),
    ].join('');
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

  stats.textContent = `排除当前记录类型后剩余：${list.length} / ${entries.length}`;

    grid.innerHTML = list.map(({name, data})=>{
      const avatar = data.头像 || '';
      return `<div class="card" title="${name}">
        ${avatar?`<img src="${avatar}" alt="${name}" class="avatar">`:''}
        <h3>${name}</h3>
      </div>`;
    }).join('');

    // 生成可复制的名字段落，规则：
    // - 以空格分隔名字；
    // - 每段长度尽量不超过40字符；
    // - 不拆分名字；若加入下一个名字会超过40，则开启新段；
    // - 允许最后一段超过40一点点，以保证最后一个名字完整（仅当当前段为空时）。
    const N = 40;
    const names = list.map(x=>x.name);
    const chunks = [];
    let current = '';
    for(const n of names){
      if(!current){
        // 段首直接放，即便超过N也允许（避免截断名字）。
        current = n;
      }else{
        const candidate = current + ' ' + n;
        if(candidate.length <= N){
          current = candidate;
        }else{
          // 超过限制，推入当前段，另起一段
          chunks.push(current);
          current = n;
        }
      }
    }
    if(current) chunks.push(current);

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
          copyWithFeedback(text, e.currentTarget);
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
  renderRecord();
  renderComplement();
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
