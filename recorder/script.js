(function(){
  // 取值池
  const POOLS = {
    元素类型: ["水","火","冰","雷","草","风","岩"],
    国家: ["蒙德","璃月","稻妻","须弥","枫丹","纳塔","至冬","挪德"],
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
    // 更新记录
    toggle(record.元素类型, last.元素类型);
    toggle(record.国家, last.国家);
    toggle(record.武器类型, last.武器类型);
    toggle(record.体型, last.体型);

    // 渲染
    renderLast(last);
    renderRecord();
    renderComplement();
  }

  function reset(){
    Object.values(record).forEach(s=>s.clear());
    document.getElementById('lastDraw').innerHTML = '';
    renderRecord();
    renderComplement();
  }

  function renderListRow(label, values){
    const group = values.size ? [...values].sort() : [];
    const chips = group.map(v=>`<span class="badge">${v}</span>`).join('');
    return `<div><div class="label">${label}</div><div class="group">${chips || '<span class="badge">—</span>'}</div></div>`;
  }

  function renderLast(last){
    const el = document.getElementById('lastDraw');
    el.innerHTML = [
      renderListRow('元素类型', new Set([last.元素类型])),
      renderListRow('国家', new Set([last.国家])),
      renderListRow('武器类型', new Set([last.武器类型])),
      renderListRow('体型', new Set([last.体型])),
    ].join('');
  }

  function renderRecord(){
    const el = document.getElementById('record');
    el.innerHTML = [
      renderListRow('元素类型', record.元素类型),
      renderListRow('国家', record.国家),
      renderListRow('武器类型', record.武器类型),
      renderListRow('体型', record.体型),
    ].join('');
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
  }

  function init(){
    document.getElementById('drawBtn').addEventListener('click', drawOnce);
    document.getElementById('resetBtn').addEventListener('click', reset);
    renderRecord();
    renderComplement();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  }else{
    init();
  }
})();
