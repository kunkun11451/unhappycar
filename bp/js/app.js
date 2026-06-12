const fileEl = document.getElementById('file');
// 合并上传/粘贴/截取的组合控件
const mainActionBtn = document.getElementById('mainActionBtn');
const actionToggleBtn = document.getElementById('actionToggleBtn');
const actionDropdown = document.getElementById('actionDropdown');
const actionCombo = document.getElementById('actionCombo');
const PANEL_MAIN_ACTION_KEY = 'panelMainAction'; // 可选值: 'select' | 'paste' | 'capture'
// no direct API log output now
const canvasWrap = document.getElementById('canvasWrap');
const imgPrev = document.getElementById('imgPrev');
const calibLayer = document.getElementById('calibLayer');
// Onboarding modal controls
const resetRecords = document.getElementById('resetRecords');
const onboardingModal = document.getElementById('onboardingModal');
const calibStatus = document.getElementById('calibStatus');
const btnStartCalib = document.getElementById('btnStartCalib');
const btnRecalib = document.getElementById('btnRecalib');
const pButtons = document.getElementById('pButtons');
const modeButtons = document.getElementById('modeButtons');
const btnStartApp = document.getElementById('btnStartApp');
const btnCustomBp = document.getElementById('btnCustomBp');
// const customBpModal = document.getElementById('customBpModal');
// const closeCustomBpModalX = document.getElementById('closeCustomBpModalX');
// const saveCustomBp = document.getElementById('saveCustomBp');

// Download Modal
const downloadModal = document.getElementById('downloadModal');
const openDownloadModalBtn = document.getElementById('openDownloadModalBtn');
const closeDownloadModalX = document.getElementById('closeDownloadModalX');
const confirmDownloadBtn = document.getElementById('confirmDownloadBtn');

// Calibration modal controls
const openCalibrate = document.getElementById('openCalibrate');
const calibModal = document.getElementById('calibModal');
const calibFile = document.getElementById('calibFile');
const saveCalib = document.getElementById('saveCalib');
// clearCalib & closeCalib 按钮已从新版布局中移除
const openCalibVideo = document.getElementById('openCalibVideo');
// two-step calibration containers
const calibStep1 = document.getElementById('calibStep1');
const calibStep2 = document.getElementById('calibStep2');
const roundSlots = document.getElementById('roundSlots');
const roundTip = document.getElementById('roundTip');
const calibSlots = document.getElementById('calibSlots');
const picker = document.getElementById('picker');
const pickerGrid = document.getElementById('pickerGrid');
const closePicker = document.getElementById('closePicker');
const closePickerX = document.getElementById('closePickerX');
const searchInput = document.getElementById('searchInput');
// Picker filters (icon-based)
const eleFilters = document.getElementById('eleFilters');
const wpnFilters = document.getElementById('wpnFilters');
// Catalog controls
const catalogSearchInput = document.getElementById('catalogSearchInput');
const catalogSearchInner = document.getElementById('catalogSearchInner');
const catalogTagMenu = document.getElementById('catalogTagMenu');
const catalogContainer = document.getElementById('catalogContainer');
const ownershipModal = document.getElementById('ownershipModal');
const ownershipStepMode = document.getElementById('ownershipStepMode');
const ownershipStepManual = document.getElementById('ownershipStepManual');
const ownershipStepParser = document.getElementById('ownershipStepParser');
const ownershipManualGrid = document.getElementById('ownershipManualGrid');
const ownershipManualSearch = document.getElementById('ownershipManualSearch');
const ownershipManualSelectAll = document.getElementById('ownershipManualSelectAll');
const ownershipManualClear = document.getElementById('ownershipManualClear');
const ownershipManualSave = document.getElementById('ownershipManualSave');
const ownershipManualCount = document.getElementById('ownershipManualCount');
const ownershipModeButtons = document.querySelectorAll('[data-ownership-mode]');
const ownershipBackBtn = document.getElementById('ownershipBackBtn');
const ownershipParserInput = document.getElementById('ownershipParserInput');
const ownershipParserStatus = document.getElementById('ownershipParserStatus');
const ownershipParserParseBtn = document.getElementById('ownershipParserParse');
const ownershipParserOpenCalcBtn = document.getElementById('ownershipParserOpenCalc');
const closeOwnershipModalX = document.getElementById('closeOwnershipModalX');
// catalog and history
const catalogGrid = document.getElementById('catalogGrid');
const openHistory = document.getElementById('openHistory');
const pasteImageTop = document.getElementById('pasteImageTop');
const pasteImageCalib = document.getElementById('pasteImageCalib');
const btnSelectCalib = document.getElementById('btnSelectCalib');
const roundNoEl = document.getElementById('roundNo');
// Round edit modal elements
const roundEditModal = document.getElementById('roundEditModal');
const roundEditTitle = document.getElementById('roundEditTitle');
const roundEditSlotsEl = document.getElementById('roundEditSlots');
const ignoreRoundBpToggle = document.getElementById('ignoreRoundBpToggle');
const reidentifyFile = document.getElementById('reidentifyFile');
const reidentifyUploadBtn = document.getElementById('reidentifyUploadBtn');
const roundEditSaveBtn = document.getElementById('roundEditSaveBtn');
const deleteRoundBtn = document.getElementById('deleteRoundBtn');
function saveRoundEdit() {
  if (currentRoundEditIndex !== null && tempRoundEditData) {
    rounds[currentRoundEditIndex] = JSON.parse(JSON.stringify(tempRoundEditData));
    rebuildUsageSetsFromRounds();
    renderCatalog();
    renderHistory();
    try{ if (rounds.length>0) renderRoundPanel(computeRoundDisplayForIndex(rounds.length-1)); }catch{}
    saveSessionToCache();
  }
  hideModal(roundEditModal);
  tempRoundEditData = null;
  currentRoundEditIndex = null;
}

function tryCloseRoundEditModal() {
  if (currentRoundEditIndex === null) {
    hideModal(roundEditModal);
    tempRoundEditData = null;
    return;
  }
  const original = rounds[currentRoundEditIndex];
  const current = tempRoundEditData;
  
  if (!current || !original) {
    hideModal(roundEditModal);
    tempRoundEditData = null;
    currentRoundEditIndex = null;
    return;
  }

  const simplify = (r) => ({
    ignoreBp: !!r.ignoreBp,
    entries: (r.entries||[]).map(e => ({ p: e.p, name: e.name, from: e.from }))
  });
  const origJson = JSON.stringify(simplify(original));
  const currJson = JSON.stringify(simplify(current));

  if (origJson !== currJson) {
    showCustomConfirm({
      message: '当前修改未保存，是否保存？',
      buttons: [
        { text: '取消', class: 'btn-glass btn-glass-danger', role: 'discard' },
        { text: '确定', class: 'btn-glass btn-glass-primary', role: 'save' }
      ]
    }).then(res => {
      if (res.role === 'save') {
        saveRoundEdit();
      } else if (res.role === 'discard') {
        hideModal(roundEditModal);
        tempRoundEditData = null;
        currentRoundEditIndex = null;
      }
      // if role === 'close', do nothing (stay in edit modal)
    });
  } else {
    hideModal(roundEditModal);
    tempRoundEditData = null;
    currentRoundEditIndex = null;
  }
}

document.getElementById('closeRoundEditX')?.addEventListener('click', tryCloseRoundEditModal);
roundEditModal?.addEventListener('click', (e)=>{ if (e.target===roundEditModal) tryCloseRoundEditModal(); });

// Download Modal Event Listeners
openDownloadModalBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  showModal(downloadModal);
});
closeDownloadModalX?.addEventListener('click', () => hideModal(downloadModal));
confirmDownloadBtn?.addEventListener('click', () => {
  hideModal(downloadModal);
});
downloadModal?.addEventListener('click', (e) => {
  if (e.target === downloadModal) hideModal(downloadModal);
});

const historyRoundSelectModal = document.getElementById('historyRoundSelectModal');
const historyRoundSelectContent = document.getElementById('historyRoundSelectContent');
const historySwapModal = document.getElementById('historySwapModal');
const historySwapConfirmBtn = document.getElementById('historySwapConfirm');
const historySwapSideLeft = document.getElementById('historySwapSideLeft');
const historySwapSideRight = document.getElementById('historySwapSideRight');

// 保存并关闭历史编辑弹窗
roundEditSaveBtn?.addEventListener('click', saveRoundEdit);

deleteRoundBtn?.addEventListener('click', async () => {
  if (currentRoundEditIndex === null || currentRoundEditIndex === undefined) return;
  const ok = await showConfirm('确定要删除本轮记录吗？');
  if (!ok) return;
  
  rounds.splice(currentRoundEditIndex, 1);
  
  saveSessionToCache();
  rebuildUsageSetsFromRounds();
  
  if (document.getElementById('historySection')?.style.display === 'block') {
    renderHistory();
  }
  
  renderRoundNo();
  refreshCurrentPanelFromLastRound();
  hideModal(roundEditModal);
  tempRoundEditData = null;
  currentRoundEditIndex = null;
});

// Catalog filter states should be initialized before any call to renderCatalog
let activeFilterTags = [];
let catalogSkipNextAnimation = false;
const OWNERSHIP_CACHE_KEY = 'catalogOwnedCharacters';
let ownedCharacterNames = new Set();
let ownedCharacterNameNormals = new Set();
let ownershipConfigured = false;
let ownershipDraftNames = new Set();
let ownershipDraftNormals = new Set();

function setOwnedCharacters(list, configuredFlag = ownershipConfigured){
  ownershipConfigured = !!configuredFlag;
  ownedCharacterNames = new Set();
  ownedCharacterNameNormals = new Set();
  if (Array.isArray(list)){
    list.forEach(name=>{
      const trimmed = (name||'').trim();
      if (!trimmed) return;
      ownedCharacterNames.add(trimmed);
      ownedCharacterNameNormals.add(normalizeName(trimmed));
    });
  }
  if (!ownershipConfigured){
    const before = activeFilterTags.length;
    activeFilterTags = activeFilterTags.filter(tag=>tag.group !== 'ownership');
    if (before !== activeFilterTags.length){
      renderCatalogSearchChips();
      renderCatalog();
    }
  }
}

function loadOwnedCharactersFromCache(){
  try{
    const raw = localStorage.getItem(OWNERSHIP_CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)){
      setOwnedCharacters(parsed, parsed.length > 0);
    } else if (parsed && Array.isArray(parsed.names)){
      setOwnedCharacters(parsed.names, parsed.configured !== false);
    }
  }catch(e){
    console.warn('Failed to load ownership cache', e);
  }
}

function saveOwnedCharactersToCache(){
  try{
    const payload = {
      names: Array.from(ownedCharacterNames),
      configured: ownershipConfigured || ownedCharacterNames.size > 0
    };
    localStorage.setItem(OWNERSHIP_CACHE_KEY, JSON.stringify(payload));
  }catch(e){
    console.warn('Failed to save ownership cache', e);
  }
}

function isCharacterOwned(name){
  if (!name) return false;
  const norm = normalizeName(name);
  return ownedCharacterNames.has(name) || ownedCharacterNameNormals.has(norm);
}

function rebuildCatalogTagMenu(){
  if (!catalogTagMenu) return;
  catalogTagMenu.dataset.built = '0';
  ensureCatalogTagMenu();
  syncCatalogTagChipUI();
}

loadOwnedCharactersFromCache();

function getCatalogSearchTerm(){
  return (catalogSearchInput?.value || '').trim();
}

function clearCatalogSearchTerm(){
  if (catalogSearchInput){
    catalogSearchInput.value = '';
  }
}

function suppressCatalogAnimationOnce(){
  catalogSkipNextAnimation = true;
}

// 通用图标映射
const ELEMENT_SVGS = {
  '冰': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 314.09 314.09"><defs><style>.cls-1{fill:#9fd6e3;}.cls-2{fill:none;}</style></defs><g id="Livello_2" data-name="Livello 2"><g id="Livello_10" data-name="Livello 10"><path class="cls-1" d="M157.22,11.84s-24.09,53.85-39,69.77c.31-.11,5.29-2,11.64-5.16,5.67,8,27.32,39.91,27.32,62.7,0-22.79,21.65-54.73,27.32-62.7,6.35,3.11,11.33,5,11.64,5.16C181.31,65.69,157.22,11.84,157.22,11.84Zm0,105.58a106.72,106.72,0,0,0-13.51-48.71c5.93-3.88,11.19-8.34,13.51-12.91,2.32,4.57,7.58,9,13.51,12.91A106.72,106.72,0,0,0,157.22,117.42Z"/><path class="cls-1" d="M282.88,84.59S224.2,90.66,203,85.74c.25.21,4.42,3.56,10.28,7.5-4.06,8.89-20.9,43.61-40.63,55,19.73-11.4,58.22-8.62,68-7.69.49,7.05,1.3,12.34,1.36,12.66C248.29,132.38,282.88,84.59,282.88,84.59Zm-91.44,52.79a106.58,106.58,0,0,0,35.43-36c6.33,3.19,12.82,5.52,17.94,5.24-2.8,4.3-4,11.08-4.43,18.16C213.63,124.79,192.73,136.64,191.44,137.38Z"/><path class="cls-1" d="M282.7,229.8S248.11,182,241.76,161.17c-.06.32-.87,5.61-1.35,12.66-9.74.93-48.22,3.71-68-7.69,19.74,11.4,36.57,46.11,40.64,55-5.87,3.94-10,7.29-10.29,7.5C224,223.73,282.7,229.8,282.7,229.8ZM191.27,177a106.79,106.79,0,0,0,48.94,12.65c.39,7.08,1.63,13.86,4.42,18.16-5.11-.28-11.61,2-17.93,5.24A106.77,106.77,0,0,0,191.27,177Z"/><path class="cls-1" d="M156.87,302.24s24.09-53.85,39-69.77c-.31.11-5.29,2.05-11.64,5.16-5.67-8-27.32-39.91-27.32-62.7,0,22.79-21.65,54.73-27.32,62.7-6.35-3.11-11.33-5-11.64-5.16C132.78,248.39,156.87,302.24,156.87,302.24Zm0-105.58a106.72,106.72,0,0,0,13.51,48.71c-5.93,3.88-11.19,8.34-13.51,12.91-2.32-4.57-7.58-9-13.51-12.91A106.72,106.72,0,0,0,156.87,196.66Z"/><path class="cls-1" d="M31.21,229.49s58.68-6.06,79.9-1.14c-.25-.22-4.42-3.56-10.29-7.5,4.07-8.9,20.91-43.62,40.64-55-19.73,11.39-58.22,8.61-68,7.69-.48-7.06-1.29-12.34-1.35-12.66C65.8,181.71,31.21,229.49,31.21,229.49Zm91.43-52.79a106.74,106.74,0,0,0-35.43,36.06c-6.32-3.2-12.81-5.52-17.93-5.25,2.8-4.29,4-11.08,4.42-18.15A106.73,106.73,0,0,0,122.64,176.7Z"/><path class="cls-1" d="M31.38,84.29s34.59,47.79,41,68.63c.06-.33.87-5.61,1.35-12.66,9.73-.93,48.22-3.71,68,7.69-19.74-11.4-36.58-46.12-40.64-55,5.87-4,10-7.29,10.29-7.5C90.06,90.35,31.38,84.29,31.38,84.29Zm91.44,52.79a106.65,106.65,0,0,0-48.94-12.65c-.4-7.08-1.63-13.86-4.43-18.16,5.12.28,11.61-2,17.94-5.24A106.77,106.77,0,0,0,122.82,137.08Z"/><circle class="cls-1" cx="157.22" cy="158.05" r="5.65"/><path class="cls-1" d="M153.85,138l2,17.62-14.29-10.5a15.63,15.63,0,0,1-6.37-12l-.45-12.36a1,1,0,0,1,1.44-.83l10.48,6.56A15.64,15.64,0,0,1,153.85,138Z"/><path class="cls-1" d="M172.93,145.09l-14.29,10.5L160.58,138a15.68,15.68,0,0,1,7.25-11.55l10.48-6.56a.94.94,0,0,1,1.43.83l-.44,12.36A15.63,15.63,0,0,1,172.93,145.09Z"/><path class="cls-1" d="M176.29,165.18l-16.23-7.13,16.23-7.13a15.62,15.62,0,0,1,13.62.51l10.92,5.79a.94.94,0,0,1,0,1.66l-10.92,5.79A15.65,15.65,0,0,1,176.29,165.18Z"/><path class="cls-1" d="M160.58,178.13l-1.94-17.62L172.93,171a15.65,15.65,0,0,1,6.37,12.05l.44,12.35a.93.93,0,0,1-1.43.83l-10.48-6.56A15.68,15.68,0,0,1,160.58,178.13Z"/><path class="cls-1" d="M141.51,171l14.29-10.49-2,17.62a15.63,15.63,0,0,1-7.24,11.54l-10.48,6.56a.94.94,0,0,1-1.44-.83l.45-12.35A15.65,15.65,0,0,1,141.51,171Z"/><path class="cls-1" d="M138.15,150.92l16.23,7.13-16.23,7.13a15.65,15.65,0,0,1-13.62-.51l-10.92-5.79a.94.94,0,0,1,0-1.66l10.92-5.79A15.62,15.62,0,0,1,138.15,150.92Z"/><rect class="cls-2" width="314.09" height="314.09"/></g></g></svg>`,
  '岩': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 314.09 314.09"><defs><style>.cls-1{fill:#fab632;}.cls-2{fill:none;}</style></defs><g id="Livello_2" data-name="Livello 2"><g id="Livello_10" data-name="Livello 10"><path class="cls-1" d="M249.57,189.64l2.06-1.63a75.5,75.5,0,0,0,23.28-31.09h0S215.85,68.49,157,29.73c0,0-65.9,52.18-81.56,80,0,0,10.81,39,19.76,49.77,0,0,47.63-45.54,61.8-50.2,0,0,18.34,13.3,26.55,36.41l-28.71,27.21,8.58,11.56,43.24-36.91S184.91,105,157,81.54L102,128.14S114.46,84.15,157,42C157,42,232.05,127.39,249.57,189.64Z"/><path class="cls-1" d="M64.52,124.44l-2.07,1.63a75.64,75.64,0,0,0-23.28,31.1h0s59.07,88.42,117.88,127.19c0,0,65.9-52.19,81.56-80,0,0-10.82-39-19.76-49.76,0,0-47.65,45.1-61.81,49.76,0,0-18.34-12.86-26.54-36l28.7-27.21-8.57-11.56-43.24,36.91s21.79,42.49,49.66,66L212.14,186s-12.51,44-55.09,86.11C157.05,272.06,82,186.7,64.52,124.44Z"/><rect class="cls-2" width="314.09" height="314.09"/></g></g></svg>`,
  '水': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 314.09 314.09"><defs><style>.cls-1{fill:#4cc2f1;}.cls-2{fill:none;}</style></defs><g id="Livello_2" data-name="Livello 2"><g id="Livello_10" data-name="Livello 10"><path class="cls-1" d="M156.62,280c-15.53.38-28.14-2.22-38.2-6.05A122.71,122.71,0,0,0,156.62,280Z"/><path class="cls-1" d="M127.39,225v0a17.1,17.1,0,0,0,1.75,7.33,37.87,37.87,0,0,0,18.63,18.08h0a37.51,37.51,0,0,0,15.33,3.25c19.53,0,28.31-12.44,29.43-17.49-1.39,7.53-12.66,24-35.92,24A44.18,44.18,0,1,1,199.13,204c.09.26.16.53.23.81s.11.43.16.65a16.82,16.82,0,0,1,.3,2,0,0,0,0,1,0,0v.11a17,17,0,0,1-12.09,17.79,17.27,17.27,0,0,1-8.2.39,17.06,17.06,0,0,1-13.39-13.22,15.05,15.05,0,0,1-.25-1.52,15,15,0,0,0-14.71-11.89,15.62,15.62,0,0,0-2.29.17q-.75.12-1.47.3A26.08,26.08,0,0,0,127.39,225Z"/><path class="cls-1" d="M49.14,97.24c-.44.78-.87,1.57-1.28,2.37A15.9,15.9,0,0,1,49.14,97.24Z"/><path class="cls-1" d="M67.13,159a16.28,16.28,0,0,1-8.8,14.47h0A16.31,16.31,0,1,1,67.13,159Z"/><path class="cls-1" d="M85.11,212.7A11.94,11.94,0,0,1,78,223.64a11.76,11.76,0,0,1-4.48,1h-.3a11.93,11.93,0,0,1-2-23.7,11.4,11.4,0,0,1,2-.16A11.93,11.93,0,0,1,85.11,212.7Z"/><path class="cls-1" d="M279.58,155.7c.71,68-55,124.29-123,124.29a122.71,122.71,0,0,1-38.2-6.05c-23.47-8.95-33-24.67-33.3-25.16a108.58,108.58,0,0,0,32.14,16c1.16.36,2.31.7,3.44,1h0a123.38,123.38,0,0,0,35.88,4.69c1.34,0,2.66,0,4-.08,23.68-.94,45.25-14.7,55.1-36.25A68.25,68.25,0,0,0,221.76,202c-1.91-36.23-32.38-64.85-68.66-64.65a68,68,0,0,0-17.63,2.4l-.28.08a17.07,17.07,0,0,1-4.14.51,16.81,16.81,0,0,1-7-32.12l.13,0,.18-.08.07,0,.33-.13.82-.31,0,0a86.07,86.07,0,0,1,88,144.61,98.16,98.16,0,0,0,41.25-80.83c-.41-53.38-44.07-97.08-97.45-97.54A98.16,98.16,0,0,0,76.71,114.9c-.34.46-.66.92-1,1.38A16.37,16.37,0,0,1,47.86,99.61c.41-.8.84-1.59,1.28-2.37A123,123,0,0,1,279.58,155.7Z"/><path class="cls-1" d="M156.62,280c-15.53.38-28.14-2.22-38.2-6.05A122.71,122.71,0,0,0,156.62,280Z"/><rect class="cls-2" width="314.09" height="314.09"/></g></g></svg>`,
  '火': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 314.09 314.09"><defs><style>.cls-1{fill:#ef7938;}.cls-2{fill:none;}</style></defs><g id="Livello_2" data-name="Livello 2"><g id="Livello_10" data-name="Livello 10"><path class="cls-1" d="M154.81,18.06s0,22.28-13,38.9-23.94,26.6-23.94,43.89,12.64,30.92,46.55,44.89S216,180.32,216,199.6s-13.62,45.93-58.71,45.55c-44.53-7-22.75-44.88-10.79-48.87,0,0-34.54-2.95-34.54,21.66s32.55,32.53,51.67,32.53,77.64-11.3,77.64-61.17c0-19.58-7.65-30.59-7.65-30.59s29,11.17,25.6,39.56c-4.33,35.86-56.18,38.36-99.81,79.84,0,0-11.62-13.58-51.47-33.29-22.82-11.28-50.32-20.93-49.55-54.5.64-27.92,30.26-39.26,30.26-39.26s-49.87,51.2,21.61,85.12c0,0-46.21-71.82,44.89-87.45,0,0-49.54-12.63-51.54-55.19,0,0-8.31,23.94-20.28,36.57S41.51,172.48,45.5,206.06s82.38,52.39,113.63,90c0,0,25.27-26.27,50.87-38.57s111.05-51.87,13-126.68c0,0-15-10-16.29-37.58a50.17,50.17,0,0,0-13.3,33.59c0,20.61,14.67,17,16.29,36.21,0,0-28.93-24.58-28.6-43.86s7.65-39.9,7.65-39.9-50.2,22.94-25.27,59.18c0,0-18.29-7.31-14.3-31.92S207.34,81.23,154.81,18.06Z"/><path class="cls-1" d="M169.94,227s27.43-8.56,27.43-30-40.72-59.34-74.07-10c0,0,31.67-15.46,45.64,5S169.94,227,169.94,227Z"/><rect class="cls-2" width="314.09" height="314.09"/></g></g></svg>`,
  '草': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 314.09 314.09"><defs><style>.cls-1{fill:#a5c83b;}.cls-2{fill:none;}</style></defs><g id="Livello_2" data-name="Livello 2"><g id="Livello_10" data-name="Livello 10"><path class="cls-1" d="M172.23,78.43,157.05,96.1,141.86,78.43A24,24,0,0,1,139.77,50l17.28-27.35L174.32,50A24,24,0,0,1,172.23,78.43Z"/><path class="cls-1" d="M268.12,172.71l-.78.57.59.51c-6.93,39.22-38.21,56.42-56,64.94-20.11,9.62-54.86,29.44-54.86,52.75,0-23.31-34.76-43.13-54.87-52.75-17.8-8.52-49.08-25.72-56-64.93l.6-.52L46,172.7a93.47,93.47,0,0,1-1.21-15.29c0-51,40.52-73.45,65.87-73.45,19.14,0,33,11.45,38.59,17.07a5.05,5.05,0,0,1,.65,6.34l-4.07,6.25a2.42,2.42,0,0,1-3.93.18C136.59,107.14,120.7,91.66,93,102,72.29,109.75,59.33,129,59.33,152s14.21,56.43,51.41,70.22,46.31,36.08,46.31,36.08,9.11-22.29,46.31-36.08S254.77,175,254.77,152s-13-42.21-33.65-49.94c-27.72-10.36-43.62,5.12-48.9,11.78a2.42,2.42,0,0,1-3.93-.18l-4.07-6.25a5.07,5.07,0,0,1,.65-6.34C170.51,95.41,184.33,84,203.46,84c25.36,0,65.87,22.44,65.87,73.45A93.51,93.51,0,0,1,268.12,172.71Z"/><path class="cls-1" d="M46.76,173.28l-.6.52c-.07-.36-.14-.73-.19-1.1Z"/><path class="cls-1" d="M140.75,206.42c-31.67-27.84-39-46.35-31.82-63s27.13-9.94,27.13-9.94c-17.07-17.7-31.49-14.39-39.49-9.91a26.73,26.73,0,0,0-11,12c-6.5,13.75-.57,27.06,9.45,38.36-6.32.52-14.13,3.24-18.63,12.44,0,0,4.65-4.77,11-5.6s12.7-1.17,17.62,2.8h0C121.32,197.37,140.75,206.42,140.75,206.42Z"/><path class="cls-1" d="M60.87,92.75A16.77,16.77,0,0,0,44.93,78.16l-20.36-.83,4.77,16.8a18.22,18.22,0,0,0,20,13.08l13.14-1.81Z"/><path class="cls-1" d="M46.76,173.28l-.6.52-7.89,6.83a12,12,0,0,1-14.52.94l-10-6.6,10.47-7.71a12,12,0,0,1,14.23,0L46,172.7Z"/><path class="cls-1" d="M268.12,172.71c-.05.36-.12.72-.19,1.08l-.59-.51Z"/><path class="cls-1" d="M173.35,206.42c31.66-27.84,39-46.35,31.81-63S178,133.45,178,133.45c17.07-17.7,31.49-14.39,39.5-9.91a26.73,26.73,0,0,1,11,12c6.49,13.75.57,27.06-9.45,38.36,6.32.52,14.12,3.24,18.63,12.44,0,0-4.65-4.77-11-5.6s-12.7-1.17-17.62,2.8h0C192.78,197.37,173.35,206.42,173.35,206.42Z"/><path class="cls-1" d="M253.22,92.75a16.79,16.79,0,0,1,15.94-14.59l20.37-.83-4.77,16.8a18.24,18.24,0,0,1-20,13.08l-13.14-1.81Z"/><path class="cls-1" d="M300.3,175l-10,6.6a12,12,0,0,1-14.51-.94l-7.9-6.84-.59-.51.78-.57,7.48-5.48a12,12,0,0,1,14.24,0Z"/><rect class="cls-2" width="314.09" height="314.09"/></g></g></svg>`,
  '雷': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 314.09 314.09"><defs><style>.cls-1{fill:#af8ec1;}.cls-2{fill:none;}</style></defs><g id="Livello_2" data-name="Livello 2"><g id="Livello_10" data-name="Livello 10"><path class="cls-1" d="M270,217.38l0,0a127.47,127.47,0,0,1-160.49,57.53c.77.05,43.6,2.93,57.78-7.87,0,0-69.5-8.18-68.47-83.46,0,0,8.51,14.64,23.84,14.64s25.89-18.39,25.89-36.45-21.46-41.22-45.65-41.22S38.61,141.08,47.78,221.07A127.39,127.39,0,0,1,80.21,56.12C79.26,57.54,55.83,92.51,58,110c0,0,42-56,106.57-17.28,0,0-17,0-24.65,13.26s2.9,31.62,18.51,40.69,46.43,2.15,58.58-18.76S231.57,62,157.81,29.71h.05A127.36,127.36,0,0,1,283.55,136.58c-.62-1.17-20.39-38.71-36.9-45.1.42.93,28.88,63.79-35.34,102,0,0,8-14.92,0-28s-29.22-12.45-44.61-3-23.9,39.85-11.26,60.47S206.61,267,270,217.38Z"/><rect class="cls-2" width="314.09" height="314.09"/></g></g></svg>`,
  '风': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 314.09 314.09"><defs><style>.cls-1{fill:#74c2a8;}.cls-2{fill:none;}</style></defs><g id="Livello_2" data-name="Livello 2"><g id="Livello_10" data-name="Livello 10"><path class="cls-1" d="M145.24,148.75S76.89,104.14,112.89,24.57c0,0-40.5,19-40.5,53.48C72.39,126.18,114.06,140.47,145.24,148.75Z"/><path class="cls-1" d="M136.37,189.38c0,15.85-23.48,16.24-23.48,16.24,1.37,18,29,15.06,28.81-12.13s-17.27-28.57-57-30.13-56.94-46.18-56.94-46.18S12.32,163.94,44.9,182.73s66.23-7.44,71.9-8S136.37,173.53,136.37,189.38Z"/><path class="cls-1" d="M241.7,78.05c0-34.43-40.5-53.48-40.5-53.48,36,79.57-32.35,124.18-32.35,124.18C200,140.47,241.7,126.18,241.7,78.05Z"/><path class="cls-1" d="M286.31,117.18s-17.22,44.61-56.94,46.18-56.84,2.93-57,30.13,27.44,30.13,28.81,12.13c0,0-23.48-.39-23.48-16.24s13.89-15.26,19.56-14.68,39.34,26.81,71.91,8S286.31,117.18,286.31,117.18Z"/><path class="cls-1" d="M181.22,224.52c-8.84,0-19.58-10.31-19.58-27.21l.08-4.18a26.82,26.82,0,0,1,9-19.58c9.94-8.79,26.63-17.57,46.75-19,38.74-2.74,69.06-31.69,40.5-92.35,0,0,1.37,49.5-34.05,71.42s-56.2,25.63-66.84,48.5h0c-10.63-22.87-31.43-26.59-66.84-48.5s-34-71.42-34-71.42c-28.56,60.66,1.76,89.61,40.5,92.35,20.12,1.43,36.8,10.21,46.74,19a26.75,26.75,0,0,1,9,19.58l.08,4.18c0,16.9-10.74,27.21-19.58,27.21a29.25,29.25,0,0,1-10-1.64,12.91,12.91,0,0,0-10.47.8l-2.22,1.18C144.47,251,157,289.51,157,289.51s12.57-38.48,46.88-64.65l-2.22-1.18a12.9,12.9,0,0,0-10.47-.8A29.21,29.21,0,0,1,181.22,224.52ZM157,268.35c0-5.34-12.33-21.91-12.33-21.91A20.78,20.78,0,0,0,157,237.7a20.78,20.78,0,0,0,12.33,8.74S157,263,157,268.35ZM162.83,234a34.91,34.91,0,0,1-5.79-5.2,34.6,34.6,0,0,1-5.78,5.2,13,13,0,0,1-7.41,2.24h-6.7s19.21-9.2,19.86-19.55h.06c.65,10.35,19.86,19.55,19.86,19.55h-6.69A13,13,0,0,1,162.83,234Z"/><rect class="cls-2" width="314.09" height="314.09"/></g></g></svg>`
};

function getElementSvgUrl(label) {
  const svg = ELEMENT_SVGS[label];
  if (svg) {
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }
}

const WEAPON_ICON_MAP = {
  '弓': 'https://upload-bbs.miyoushe.com/upload/2026/02/24/284249424/35a7e5bab7b2ee97d79e2cc055c2922f_6542701528289378136.png',
  '长柄武器': 'https://upload-bbs.miyoushe.com/upload/2026/02/24/284249424/6853501f9aa3bf01a16ff734b654678a_2633346180400109686.png',
  '法器': 'https://upload-bbs.miyoushe.com/upload/2026/02/24/284249424/fd7eb2eb48680aa9b1042296e8c99c96_2921164432939280308.png',
  '双手剑': 'https://upload-bbs.miyoushe.com/upload/2026/02/24/284249424/883b0e3e3746d86f89754308954f2187_8860028975768290912.png',
  '单手剑': 'https://upload-bbs.miyoushe.com/upload/2026/02/24/284249424/d184c1947787d8106d3d9e4409f068f5_267450943913260561.png'
};

const NATION_ICON_MAP = {
  '蒙德': 'https://upload-bbs.miyoushe.com/upload/2024/05/18/298130464/6be41cc4f7c6aaa5ae523dee3412b7f0_6372159650948070412.png',
  '璃月': 'https://upload-bbs.miyoushe.com/upload/2024/05/18/298130464/0748de9c464f085ba5d800de13a8dd84_2542498735652518707.png',
  '稻妻': 'https://upload-bbs.miyoushe.com/upload/2024/05/18/298130464/8bfa9b5a69a2fd259bb67833aed7a782_5564237882480813435.png',
  '须弥': 'https://upload-bbs.miyoushe.com/upload/2024/05/18/298130464/f2b593734cb924b8d4017c3f9fe8ee26_3832341326944379486.png',
  '枫丹': 'https://upload-bbs.miyoushe.com/upload/2024/05/18/298130464/cb36f5c1b6a85a5f313ab64ca04c2d5d_3595323083267783878.png',
  '纳塔': 'https://upload-bbs.miyoushe.com/upload/2024/08/23/298130464/04591e46b22fd6bd0202cfba7d380e79_8536478856212962072.png',
  '挪德卡莱': 'https://gi.yatta.moe/assets/UI/chapter/UI_ChapterIcon_NodKrai.png',
  '未知': 'https://gi.yatta.moe/assets/UI/chapter/UI_ChapterIcon_Aster.png'
};

// 星级点颜色映射
const RARITY_DOT_COLOR_MAP = {
  '四星': '#a855f7',
  '五星': '#f97316'
};

const BODY_ICON_MAP = {
  '萝莉': 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="512" cy="300" r="150" fill="#FF9AA2"/><path d="M350 500 L674 500 L750 850 L274 850 Z" fill="#FF9AA2"/></svg>'),
  '少年': 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="512" cy="250" r="140" fill="#4D96FF"/><rect x="362" y="440" width="300" height="450" rx="20" fill="#4D96FF"/></svg>'),
  '少女': 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="512" cy="240" r="140" fill="#FF6F91"/><path d="M340 440 L684 440 L720 900 L304 900 Z" fill="#FF6F91"/></svg>'),
  '成男': 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="512" cy="200" r="130" fill="#005A8D"/><path d="M280 400 L744 400 L680 950 L344 950 Z" fill="#005A8D"/></svg>'),
  '成女': 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="512" cy="200" r="130" fill="#845EC2"/><path d="M320 380 L704 380 L760 950 L264 950 Z" fill="#845EC2"/></svg>')
};

// 使用状态小圆点颜色
const USAGE_DOT_COLOR_MAP = {
  '已使用': '#c52222ff',
  '未使用': '#22c55eff'
};

function buildCatalogTagIndex(){
  const data = window.characterData || {};
  const elements = new Set();
  const weapons = new Set();
  const rarities = new Set();
  const bodies = new Set();
  const nations = new Set();
  Object.values(data).forEach(info=>{
    if (!info || typeof info !== 'object') return;
    if (info['元素类型']) elements.add(info['元素类型']);
    if (info['武器类型']) weapons.add(info['武器类型']);
    if (info['星级']) rarities.add(info['星级']);
    if (info['体型']) bodies.add(info['体型']);
    if (info['国家']) nations.add(info['国家']);
  });
  return {
    elements: Array.from(elements),
    weapons: Array.from(weapons),
    rarities: Array.from(rarities),
    bodies: Array.from(bodies),
    nations: Array.from(nations)
  };
}

function ensureCatalogTagMenu(){
  if (!catalogTagMenu) return;
  if (catalogTagMenu.dataset.built === '1') return;
  catalogTagMenu.innerHTML = '';
  if (catalogSearchInput){
    const searchWrap = document.createElement('div');
    searchWrap.className = 'catalog-tag-menu-search';
    const label = document.createElement('div');
    label.className = 'catalog-tag-menu-search-label';
    label.textContent = '搜索名称';
    searchWrap.appendChild(label);
    catalogSearchInput.placeholder = '输入角色名（支持拼音首字母lxz→旅行者）';
    searchWrap.appendChild(catalogSearchInput);
    const note = document.createElement('div');
    note.className = 'catalog-tag-menu-search-note';
    searchWrap.appendChild(note);
    catalogTagMenu.appendChild(searchWrap);
  }
  const { elements, weapons, rarities, bodies, nations } = buildCatalogTagIndex();
  const hasOwnershipConfig = ownershipConfigured || ownedCharacterNames.size > 0;
  const elementOrder = ['火','水','风','雷','草','冰','岩'];
  const weaponOrder = ['单手剑','双手剑','长柄武器','弓','法器'];
  const bodyOrder = ['萝莉','少年','少女','成男','成女'];
  const nationOrder = ['蒙德','璃月','稻妻','须弥','枫丹','纳塔','挪德卡莱','未知'];
  const sortByOrder = (list, order)=> list.slice().sort((a,b)=>{
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
  const groups = [
    { key: 'element', title: '元素', values: sortByOrder(elements, elementOrder) },
    { key: 'weapon', title: '武器类型', values: sortByOrder(weapons, weaponOrder) },
    { key: 'rarity', title: '星级', values: rarities.slice().sort((a,b)=> Number(b) - Number(a)) },
    { key: 'body', title: '体型', values: sortByOrder(bodies, bodyOrder) },
    { key: 'nation', title: '国家', values: sortByOrder(nations, nationOrder) },
    { key: 'usage', title: '使用状态', values: ['已使用','未使用'] },
    { key: 'ownership', title: '拥有状态', values: hasOwnershipConfig ? ['拥有','未拥有'] : [] },
  ];
  const groupWrap = document.createElement('div');
  groupWrap.className = 'catalog-tag-menu-search catalog-tag-menu-group-wrap';

  // 顶部模式切换行：左侧模式按钮，右侧标题文字
  const headerRow = document.createElement('div');
  headerRow.className = 'catalog-tag-menu-header-row';

  const modeToggle = document.createElement('button');
  modeToggle.type = 'button';
  // use the same visual style as other tag chips
  modeToggle.className = 'catalog-tag-chip mode-toggle';
  const updateModeToggleLabel = ()=>{
    if (catalogTagFilterMode === 'group-union') modeToggle.textContent = '筛选模式：同类并集，不同交集';
    else if (catalogTagFilterMode === 'full-union') modeToggle.textContent = '筛选模式：全并集（任一匹配）';
    else if (catalogTagFilterMode === 'exclude') modeToggle.textContent = '筛选模式：全补集（排除选中）';
  };
  updateModeToggleLabel();
  modeToggle.addEventListener('click', ()=>{
    if (catalogTagFilterMode === 'group-union') catalogTagFilterMode = 'full-union';
    else if (catalogTagFilterMode === 'full-union') catalogTagFilterMode = 'exclude';
    else catalogTagFilterMode = 'group-union';
    updateModeToggleLabel();
    // 模式切换时仅重新渲染图鉴，不改动已选标签/搜索
    renderCatalog();
  });

  const groupLabel = document.createElement('div');
  groupLabel.className = 'catalog-tag-menu-search-label';
  groupLabel.textContent = '筛选标签';
  catalogFilterLabelElement = groupLabel;

  headerRow.appendChild(groupLabel);
  headerRow.appendChild(modeToggle);
  groupWrap.appendChild(headerRow);

  const statusGroups = ['usage', 'ownership'];
  const regularGroups = groups.filter(g => !statusGroups.includes(g.key));
  const specialGroups = groups.filter(g => statusGroups.includes(g.key));

  regularGroups.forEach(g => {
    if (!g.values.length) return;
    const wrap = document.createElement('div');
    wrap.className = 'catalog-tag-menu-group';
    const title = document.createElement('div');
    title.className = 'catalog-tag-menu-title';
    title.textContent = g.title;
    const list = document.createElement('div');
    list.className = 'catalog-tag-menu-list';
    g.values.forEach(v=>{
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'catalog-tag-chip';
      chip.dataset.group = g.key;
      chip.dataset.value = v;

      const icon = document.createElement('span');
      icon.className = 'catalog-search-chip-icon';
      // Icons for element/weapon/rarity etc.
      if (g.key === 'element'){
        const img = document.createElement('img');
        img.src = getElementSvgUrl(v);
        img.alt = v;
        icon.appendChild(img);
      } else if (g.key === 'weapon'){
        const src = WEAPON_ICON_MAP[v];
        if (src){
          const img = document.createElement('img');
          img.src = src;
          img.alt = v;
          icon.appendChild(img);
        }
      } else if (g.key === 'rarity'){
        const dot = document.createElement('span');
        dot.style.display = 'inline-block';
        dot.style.width = '8px';
        dot.style.height = '8px';
        dot.style.borderRadius = '999px';
        dot.style.boxShadow = '0 0 6px rgba(0,0,0,0.45)';
        const rv = String(v);
        if (rv.includes('四') || rv.includes('4')){
          dot.style.background = RARITY_DOT_COLOR_MAP['四星'];
        } else if (rv.includes('五') || rv.includes('5')){
          dot.style.background = RARITY_DOT_COLOR_MAP['五星'];
        } else {
          dot.style.background = '#9ca3af';
        }
        icon.appendChild(dot);
      } else if (g.key === 'body'){
        const src = BODY_ICON_MAP[v];
        if (src){
          const img = document.createElement('img');
          img.src = src;
          img.alt = v;
          img.classList.add('body-icon');
          icon.appendChild(img);
        }
      } else if (g.key === 'nation'){
        const src = NATION_ICON_MAP[v];
        if (src){
          const img = document.createElement('img');
          img.src = src;
          img.alt = v;
          icon.appendChild(img);
        }
      }
      
      const label = document.createElement('span');
      label.className = 'catalog-search-chip-label';
      label.textContent = v;

      chip.appendChild(icon);
      chip.appendChild(label);
      chip.addEventListener('click', ()=> toggleFilterTag(g.key, v));
      list.appendChild(chip);
    });
    wrap.appendChild(title);
    wrap.appendChild(list);
    groupWrap.appendChild(wrap);
  });
  
  const statusRow = document.createElement('div');
  statusRow.className = 'catalog-tag-menu-group-row';

  specialGroups.forEach(g => {
    if (!g.values.length && g.key !== 'ownership') return;

    const wrap = document.createElement('div');
    wrap.className = 'catalog-tag-menu-group';
    const title = document.createElement('div');
    title.className = 'catalog-tag-menu-title';
    title.textContent = g.title;
    const list = document.createElement('div');
    list.className = 'catalog-tag-menu-list';

    if (g.key === 'ownership') {
      if (hasOwnershipConfig){
        title.classList.add('ownership-clickable');
        title.setAttribute('role','button');
        title.tabIndex = 0;
        const openEditor = (evt)=>{
          evt?.preventDefault();
          evt?.stopPropagation();
          openOwnershipModal('manual');
        };
        title.addEventListener('click', openEditor);
        title.addEventListener('keydown', (e)=>{
          if (e.key === 'Enter' || e.key === ' '){
            openEditor(e);
          }
        });
        g.values.forEach(v=>{
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'catalog-tag-chip';
          chip.dataset.group = g.key;
          chip.dataset.value = v;
          const icon = document.createElement('span');
          icon.className = 'catalog-ownership-icon ' + (v === '拥有' ? 'check' : 'ban');
          icon.textContent = v === '拥有' ? '✓' : '✗';
          const label = document.createElement('span');
          label.className = 'catalog-search-chip-label';
          label.textContent = v;
          chip.appendChild(icon);
          chip.appendChild(label);
          chip.addEventListener('click', ()=> toggleFilterTag(g.key, v));
          list.appendChild(chip);
        });
      } else {
        const setupChip = document.createElement('button');
        setupChip.type = 'button';
        setupChip.className = 'catalog-tag-chip ownership-setup-chip';
        const icon = document.createElement('span');
        icon.className = 'ownership-setup-icon';
        icon.textContent = '⚙';
        const label = document.createElement('span');
        label.className = 'catalog-search-chip-label';
        label.textContent = '设置拥有状态';
        setupChip.appendChild(icon);
        setupChip.appendChild(label);
        setupChip.addEventListener('click', (evt)=>{
          evt.preventDefault();
          evt.stopPropagation();
          openOwnershipModal('mode');
        });
        list.appendChild(setupChip);
      }
    } else if (g.key === 'usage') {
      g.values.forEach(v=>{
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'catalog-tag-chip';
        chip.dataset.group = g.key;
        chip.dataset.value = v;

        const icon = document.createElement('span');
        icon.className = 'catalog-search-chip-icon';
        const dot = document.createElement('span');
        dot.style.display = 'inline-block';
        dot.style.width = '8px';
        dot.style.height = '8px';
        dot.style.borderRadius = '999px';
        dot.style.boxShadow = '0 0 6px rgba(0,0,0,0.45)';
        dot.style.background = USAGE_DOT_COLOR_MAP[v] || '#9ca3af';
        icon.appendChild(dot);
        
        const label = document.createElement('span');
        label.className = 'catalog-search-chip-label';
        label.textContent = v;

        chip.appendChild(icon);
        chip.appendChild(label);
        chip.addEventListener('click', ()=> toggleFilterTag(g.key, v));
        list.appendChild(chip);
      });
    }
    
    wrap.appendChild(title);
    wrap.appendChild(list);
    statusRow.appendChild(wrap);
  });

  groupWrap.appendChild(statusRow);
  catalogTagMenu.appendChild(groupWrap);
  // 底部重置按钮：清空所有筛选标签
  const resetWrap = document.createElement('div');
  resetWrap.style.marginTop = '8px';
  // center the reset button at the bottom of the menu
  resetWrap.style.textAlign = 'center';
  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.textContent = '重置筛选';
  // apply tag-chip style so it looks like the other tags
  resetBtn.classList.add('catalog-tag-chip', 'reset-filter-btn');
  // visual state handled by CSS hover rules for .catalog-tag-chip
  resetBtn.addEventListener('click', ()=>{
    activeFilterTags = [];
    if (catalogSearchInput) catalogSearchInput.value = '';
    syncCatalogTagChipUI();
    renderCatalogSearchChips();
    renderCatalog();
  });
  resetWrap.appendChild(resetBtn);
  catalogTagMenu.appendChild(resetWrap);
  catalogTagMenu.dataset.built = '1';
}

function toggleFilterTag(group, value){
  const existing = activeFilterTags.filter(t=>!(t.group===group && t.value===value));
  const has = activeFilterTags.some(t=>t.group===group && t.value===value);
  if (!has){
    activeFilterTags = activeFilterTags.concat([{ group, value }]);
  } else {
    activeFilterTags = existing;
  }
  // 点击标签时清空输入框内容
  clearCatalogSearchTerm();
  syncCatalogTagChipUI();
  renderCatalogSearchChips();
  renderCatalog();
}

function syncCatalogTagChipUI(){
  if (!catalogTagMenu) return;
  const set = new Set(activeFilterTags.map(t=>`${t.group}::${t.value}`));
  catalogTagMenu.querySelectorAll('.catalog-tag-chip').forEach(chip=>{
    const g = chip.dataset.group; const v = chip.dataset.value;
    const key = `${g}::${v}`;
    if (set.has(key)) chip.classList.add('active'); else chip.classList.remove('active');
  });
}

function syncCatalogSearchInputWithTags(){
  renderCatalogSearchChips();
}

function renderCatalogSearchChips(){
  if (!catalogSearchInner) return;
  catalogSearchInner.innerHTML = '';
  const frag = document.createDocumentFragment();
  const searchTerm = getCatalogSearchTerm();
  if (searchTerm){
    const span = document.createElement('span');
    span.textContent = searchTerm;
    span.style.cursor = 'default';
    span.addEventListener('click', (e)=> e.stopPropagation());
    frag.appendChild(span);
  }

  activeFilterTags.forEach(tag=>{
    const chip = document.createElement('div');
    chip.className = 'catalog-search-chip';
    chip.dataset.group = tag.group;
    chip.dataset.value = tag.value;
    chip.addEventListener('click', (e)=> e.stopPropagation());
    const icon = document.createElement('span');
    icon.className = 'catalog-search-chip-icon';
    if (tag.group === 'element'){
      const img = document.createElement('img');
      img.src = getElementSvgUrl(tag.value);
      img.alt = tag.value;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'contain';
      icon.appendChild(img);
    } else if (tag.group === 'weapon'){
      const src = WEAPON_ICON_MAP[tag.value];
      if (src){
        const img = document.createElement('img');
        img.src = src;
        img.alt = tag.value;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        icon.appendChild(img);
      } else {
        icon.textContent = '武';
      }
    } else if (tag.group === 'rarity'){
      const dot = document.createElement('span');
      dot.style.display = 'inline-block';
      dot.style.width = '8px';
      dot.style.height = '8px';
      dot.style.borderRadius = '999px';
      dot.style.boxShadow = '0 0 6px rgba(0,0,0,0.45)';
      const rv = String(tag.value);
      if (rv.includes('四') || rv.includes('4')){
        dot.style.background = RARITY_DOT_COLOR_MAP['四星'];
      } else if (rv.includes('五') || rv.includes('5')){
        dot.style.background = RARITY_DOT_COLOR_MAP['五星'];
      } else {
        dot.style.background = '#9ca3af';
      }
      icon.appendChild(dot);
    } else if (tag.group === 'body'){
      const src = BODY_ICON_MAP[tag.value];
      if (src){
        const img = document.createElement('img');
        img.src = src;
        img.alt = tag.value;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        img.classList.add('body-icon');
        icon.appendChild(img);
      }
    } else if (tag.group === 'usage'){
      const dot = document.createElement('span');
      dot.style.display = 'inline-block';
      dot.style.width = '8px';
      dot.style.height = '8px';
      dot.style.borderRadius = '999px';
      dot.style.boxShadow = '0 0 6px rgba(0,0,0,0.45)';
      dot.style.background = USAGE_DOT_COLOR_MAP[tag.value] || '#9ca3af';
      icon.appendChild(dot);
    } else if (tag.group === 'nation'){
      const src = NATION_ICON_MAP[tag.value];
      if (src){
        const img = document.createElement('img');
        img.src = src;
        img.alt = tag.value;
        icon.appendChild(img);
      }
    } else if (tag.group === 'ownership'){
      const symbol = document.createElement('span');
      symbol.className = 'catalog-ownership-icon ' + (tag.value === '拥有' ? 'check' : 'ban');
      symbol.textContent = tag.value === '拥有' ? '✓' : '✗';
      icon.appendChild(symbol);
    }
    const label = document.createElement('span');
    label.className = 'catalog-search-chip-label';
    label.textContent = tag.value;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'catalog-search-chip-remove';
    btn.innerHTML = '×';
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      toggleFilterTag(tag.group, tag.value);
    });
    chip.appendChild(icon);
    chip.appendChild(label);
    chip.appendChild(btn);
    frag.appendChild(chip);
  });

  catalogSearchInner.appendChild(frag);
  const hasContent = !!searchTerm || activeFilterTags.length > 0;
  catalogSearchInner.setAttribute('data-empty', hasContent ? 'false' : 'true');
}

function resetOwnershipDraft(){
  ownershipDraftNames = new Set(ownedCharacterNames);
  ownershipDraftNormals = new Set(ownedCharacterNameNormals);
}
function ownershipDraftHas(name){
  if (!name) return false;
  const norm = normalizeName(name);
  return ownershipDraftNames.has(name) || ownershipDraftNormals.has(norm);
}
function ownershipDraftToggle(name){
  if (!name) return false;
  const norm = normalizeName(name);
  if (ownershipDraftNormals.has(norm)){
    ownershipDraftNormals.delete(norm);
    ownershipDraftNames = new Set(Array.from(ownershipDraftNames).filter(n=> normalizeName(n) !== norm));
    updateOwnershipManualSummary();
    return false;
  } else {
    ownershipDraftNormals.add(norm);
    ownershipDraftNames.add(name);
    updateOwnershipManualSummary();
    return true;
  }
}
function ownershipDraftSelectAll(){
  const data = window.characterData || {};
  ownershipDraftNames = new Set();
  ownershipDraftNormals = new Set();
  Object.keys(data).forEach(name=>{
    ownershipDraftNames.add(name);
    ownershipDraftNormals.add(normalizeName(name));
  });
  buildOwnershipManualGrid();
}
function ownershipDraftClear(){
  ownershipDraftNames = new Set();
  ownershipDraftNormals = new Set();
  buildOwnershipManualGrid();
}
function applyOwnershipParserResult(names){
  const normTargets = new Set((names||[]).map(n=> normalizeName(n)));
  const data = window.characterData || {};
  ownershipDraftNames = new Set();
  ownershipDraftNormals = new Set();
  Object.keys(data).forEach(name=>{
    const norm = normalizeName(name);
    if (normTargets.has(norm)){
      ownershipDraftNames.add(name);
      ownershipDraftNormals.add(norm);
    }
  });
  buildOwnershipManualGrid();
}
function updateOwnershipManualSummary(){
  if (!ownershipManualCount) return;
  const total = Object.keys(window.characterData || {}).length;
  ownershipManualCount.textContent = `已选择 ${ownershipDraftNames.size} / ${total}`;
}
function buildOwnershipManualGrid(){
  if (!ownershipManualGrid) return;
  const data = window.characterData || {};
  const entries = Object.entries(data);
  const term = (ownershipManualSearch?.value || '').trim();
  const frag = document.createDocumentFragment();
  let visible = 0;
  entries.forEach(([name, info])=>{
    const { match, html } = matchAndHighlight(name, term);
    if (!match) return;
    visible++;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'ownership-card';
    if (ownershipDraftHas(name)) card.classList.add('selected');
    card.innerHTML = `
      <img src="${info['头像']||''}" alt="${name}">
      <div class="ownership-card-name">${html}</div>
      <div class="ownership-card-check">✓</div>
    `;
    card.addEventListener('click', ()=>{
      const selected = ownershipDraftToggle(name);
      card.classList.toggle('selected', selected);
    });
    frag.appendChild(card);
  });
  ownershipManualGrid.innerHTML = '';
  if (!visible){
    const empty = document.createElement('div');
    empty.className = 'ownership-empty muted';
    empty.textContent = term ? '没有匹配的角色' : '暂无角色可选择';
    ownershipManualGrid.appendChild(empty);
  } else {
    ownershipManualGrid.appendChild(frag);
  }
  updateOwnershipManualSummary();
}
function parseOwnershipFromText(raw){
  const text = (raw || '').trim();
  if (!text) return [];
  const data = window.characterData || {};
  const matches = [];
  Object.keys(data).forEach(name=>{
    if (!name) return;
    if (text.includes(name)){
      matches.push(name);
    }
  });
  return matches;
}
function setOwnershipParserStatus(message, state='neutral'){
  if (!ownershipParserStatus) return;
  ownershipParserStatus.textContent = message || '';
  ownershipParserStatus.dataset.state = state || 'neutral';
}
function showOwnershipStep(step){
  const map = {
    mode: ownershipStepMode,
    manual: ownershipStepManual,
    parser: ownershipStepParser
  };
  Object.entries(map).forEach(([key, el])=>{
    if (!el) return;
    el.style.display = key === step ? 'flex' : 'none';
    if (key === 'manual' && key === step){
      requestAnimationFrame(()=>{
        ownershipManualSearch?.focus();
      });
    } else if (key === 'parser' && key === step){
      requestAnimationFrame(()=>{
        ownershipParserInput?.focus();
      });
    }
  });

  if (ownershipBackBtn) {
    ownershipBackBtn.style.display = (step === 'manual' || step === 'parser') ? 'inline-flex' : 'none';
  }

  if (step === 'manual'){
    buildOwnershipManualGrid();
  }
  if (step === 'parser'){
    setOwnershipParserStatus('', 'neutral');
  }
}
function openOwnershipModal(initialStep='mode'){
  if (!ownershipModal) return;
  resetOwnershipDraft();
  if (ownershipParserInput) ownershipParserInput.value = '';
  if (ownershipManualSearch) ownershipManualSearch.value = '';
  setOwnershipParserStatus('', 'neutral');
  const targetStep = initialStep === 'manual' ? 'manual' : initialStep;
  showOwnershipStep(targetStep);
  showModal(ownershipModal);
}
function closeOwnershipModal(){
  hideModal(ownershipModal);
}
function commitOwnershipDraft(){
  ownershipConfigured = true;
  setOwnedCharacters(Array.from(ownershipDraftNames), true);
  saveOwnedCharactersToCache();
  rebuildCatalogTagMenu();
  syncCatalogTagChipUI();
  renderCatalogSearchChips();
  renderCatalog();
}

ownershipModeButtons?.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const mode = btn.dataset.ownershipMode || 'mode';
    showOwnershipStep(mode === 'manual' || mode === 'parser' ? mode : 'mode');
  });
});
ownershipBackBtn?.addEventListener('click', ()=>{
    showOwnershipStep('mode');
});
ownershipManualSearch?.addEventListener('input', ()=> buildOwnershipManualGrid());
ownershipManualSelectAll?.addEventListener('click', ownershipDraftSelectAll);
ownershipManualClear?.addEventListener('click', ownershipDraftClear);
ownershipManualSave?.addEventListener('click', ()=>{
  commitOwnershipDraft();
  closeOwnershipModal();
});
ownershipParserParseBtn?.addEventListener('click', ()=>{
  const raw = ownershipParserInput?.value || '';
  if (!raw.trim()){
    setOwnershipParserStatus('请先粘贴从养成计算器复制的内容。', 'error');
    return;
  }
  const names = parseOwnershipFromText(raw);
  if (!names.length){
    setOwnershipParserStatus('未能识别任何角色，请确认复制的是“已拥有”页面。', 'error');
    return;
  }
  applyOwnershipParserResult(names);
  setOwnershipParserStatus(`已解析 ${names.length} 名角色，已应用到手动列表。`, 'success');
  showOwnershipStep('manual');
});
ownershipParserInput?.addEventListener('input', ()=> setOwnershipParserStatus('', 'neutral'));
const _openCalcGuide = ()=>{
  window.open('https://act.mihoyo.com/ys/event/calculator/', '_blank', 'noopener');
};
ownershipParserOpenCalcBtn?.addEventListener('click', _openCalcGuide);
ownershipParserOpenCalcBtn?.addEventListener('keydown', (e)=>{
  if (e.key === 'Enter' || e.key === ' '){
    e.preventDefault();
    _openCalcGuide();
  }
});
closeOwnershipModalX?.addEventListener('click', closeOwnershipModal);
ownershipModal?.addEventListener('click', (e)=>{
  if (e.target === ownershipModal) closeOwnershipModal();
});

// 4 个矩形的归一化配置 [0..1]
let rects = [
  { x: 0.79, y: 0.13, w: 0.115, h: 0.205 },
  { x: 0.79, y: 0.34, w: 0.115, h: 0.205 },
  { x: 0.79, y: 0.55, w: 0.115, h: 0.205 },
  { x: 0.79, y: 0.76, w: 0.115, h: 0.205 },
];

function loadRects() {
  const s = localStorage.getItem('avatarSideRects');
  if (s) { try { const r = JSON.parse(s); if (Array.isArray(r) && r.length === 4) rects = r; } catch {} }
}
function saveRects() { localStorage.setItem('avatarSideRects', JSON.stringify(rects)); }
function clearRects() { localStorage.removeItem('avatarSideRects'); loadRects(); }
loadRects();

// 筛选模式："group-union" = 相同类型并集、不同类型交集（默认）
//           "full-union"  = 全并集（任一标签匹配即可）
let catalogTagFilterMode = 'group-union';
let catalogFilterLabelElement = null;

// 会话状态（部分持久化）
let myP = '';
let bpMode = 'personal';
let rounds = [];
let usedBy = { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set() };
let usedGlobal = new Set();
let clearedBefore = {}; // name -> lastClearedRoundIdx

function saveSessionToCache() {
  const sessionData = { myP, bpMode, rounds, clearedBefore, isManualMode: window.isManualMode };
  try {
    localStorage.setItem('avatarSideSession', JSON.stringify(sessionData));
  } catch (e) {
    // Fallback: if serialization fails for any reason, don't block the app.
    console.error('Failed to save session to cache', e);
  }
}

function loadSessionFromCache() {
  const forceOnboarding = localStorage.getItem('avatarSideForceOnboarding') === 'true';
  if (forceOnboarding) {
    localStorage.removeItem('avatarSideForceOnboarding');
    resetSession(true);
    return false;
  }

  const s = localStorage.getItem('avatarSideSession');
  if (s) {
    try {
      const data = JSON.parse(s);
      if (data && typeof data === 'object') {
        myP = data.myP || '';
        if (typeof data.bpMode === 'string') {
          bpMode = data.bpMode || 'personal';
        } else if (typeof data.bpMode === 'object') {
          bpMode = data.bpMode;
        } else {
          bpMode = 'personal';
        }
        rounds = Array.isArray(data.rounds) ? data.rounds : [];
        clearedBefore = typeof data.clearedBefore === 'object' ? data.clearedBefore : {};
        if (typeof data.isManualMode === 'boolean') {
            window.isManualMode = data.isManualMode;
        }
        
        rebuildUsageSetsFromRounds();
        renderRoundNo();
        refreshCurrentPanelFromLastRound();
        renderCatalog();
        updateModeUI();
        
        roundTip.textContent='';
        return true;
      }
    } catch (e) {
      console.error("Failed to load session from cache", e);
    }
  }
  return false;
}

const EMPTY_STATE_IMAGES = [
  'https://upload-bbs.miyoushe.com/upload/2025/02/06/407777514/8ebf44386bf85cf59162bef464e38308_4367846965199814690.png',
  'https://upload-bbs.miyoushe.com/upload/2025/04/02/279632390/a91d2a14fee7fc8d50bf5d9e8b53d2c7_577996957060696080.png',
  'https://upload-bbs.miyoushe.com/upload/2024/02/03/273489775/c0f03c3359399144b71afadf3c83522d_3893341309840482073.png',
  'https://upload-bbs.miyoushe.com/upload/2024/02/05/273489775/6c68e7a7ab120f83aec478fce34d81cf_1010412239053042832.png',
  'https://upload-bbs.miyoushe.com/upload/2024/02/06/273489775/a976d21cda8da45d945694bf85da10cc_5199651072507289644.png',
  'https://upload-bbs.miyoushe.com/upload/2024/06/25/273489775/e87873362bc409f65c6ab586c4e364f6_5290621343385855642.png',
  'https://upload-bbs.miyoushe.com/upload/2024/11/09/273489775/705cbdf9088a9dc7a2ca252f8813c0f6_4437823511807979011.png',
  'https://upload-bbs.miyoushe.com/upload/2024/11/09/273489775/4c3aac12039a5a05b3ed284fe3704629_3655797959705379199.png',
  'https://upload-bbs.miyoushe.com/upload/2024/11/09/273489775/697ab650d4ef45a8b7b641f328219949_267729926758616386.png',
  'https://upload-bbs.miyoushe.com/upload/2024/11/09/273489775/3fc37a9cf1d1290e8953e4552fc975c7_7620722366369667699.png',
  'https://upload-bbs.miyoushe.com/upload/2024/11/03/273489775/ac8cc89729e6bbf48f68e52f6c0d4020_8006937065318554054.png',
  'https://upload-bbs.miyoushe.com/upload/2024/11/09/273489775/ceb4acae51995eb8189fabeff82cca55_1025240340820937590.png',
  'https://upload-bbs.miyoushe.com/upload/2024/11/08/273489775/4426228777a7e2ebd0048727370a376a_7951741384908377540.png',
  'https://upload-bbs.miyoushe.com/upload/2024/11/03/273489775/dfe68fe72b88b6c039cc31bc7b7f7806_818843631555829688.png',
  'https://upload-bbs.miyoushe.com/upload/2024/11/09/273489775/ce571d3dd850a126513a81fcc992a23c_4468423263221193479.png',
  'https://upload-bbs.miyoushe.com/upload/2024/02/03/273489775/0adbfc4850e2e783789d198ebea9c142_3654013575541702378.png',
  'https://upload-bbs.miyoushe.com/upload/2024/02/05/273489775/cc9d7db6e4081d4c6e3a3bcac567cb0c_6023314499811805923.png',
  'https://upload-bbs.miyoushe.com/upload/2024/11/04/273489775/3ee79ac33eaad22d3609e7ffaf7dc22b_6817230100985611292.png',
  'https://upload-bbs.miyoushe.com/upload/2024/02/05/273489775/5e3e2f7a6bb76416392199dae4c831c6_7526667435328324962.png',
  'https://upload-bbs.miyoushe.com/upload/2024/02/05/273489775/aed2eb69bf3b6c2abb84184a1b4bd0db_8744334817291281646.png',
  'https://upload-bbs.miyoushe.com/upload/2024/02/06/273489775/e162d189bc9ae798a5cc30fe1baec56c_4747108931468163361.png',
  'https://upload-bbs.miyoushe.com/upload/2024/02/06/273489775/55d99ee05902eed1e911621737ac089f_4566126243891857628.png',
  'https://upload-bbs.miyoushe.com/upload/2024/02/06/273489775/55eff3bfd54b990a87d6afacbb49e8e6_5609001809701785952.png',
  'https://upload-bbs.miyoushe.com/upload/2024/02/09/273489775/74d48428b7b2c5a45058d2fb3ed9f2a7_5630328886121320848.png',
  'https://upload-bbs.miyoushe.com/upload/2024/11/09/273489775/0f147dcbf17b5fcebec99f9412b2e859_3767626698872818046.png',
  'https://upload-bbs.miyoushe.com/upload/2024/11/09/273489775/8d80e61f5e5685dfc8d3e7f09ccea7e6_2132277407840622075.png',
  'https://upload-bbs.miyoushe.com/upload/2024/11/09/273489775/82b51ccf624d8342d4083202e5f07081_6663804071818218694.png',
  'https://upload-bbs.miyoushe.com/upload/2024/11/09/273489775/e5b0a2a36789a0825a4fdefd11f191db_4926010984222315095.png',
  'https://upload-bbs.miyoushe.com/upload/2024/11/09/273489775/303005f064bc178646aa7e7148af2404_4184162256646106716.png',
  'https://upload-bbs.miyoushe.com/upload/2024/11/08/273489775/26911fa3b407d7a1bdb93180fb5bdc73_3503897204375100504.png',
  'https://upload-bbs.miyoushe.com/upload/2024/06/29/273489775/4be47bf1376bfb4f69c1e3fe26c8a8e8_8119842655567179283.png',
  'https://upload-bbs.miyoushe.com/upload/2024/11/03/273489775/d03a1367e14b95627eb000f781f453fd_3537095380218873516.png',
  'https://upload-bbs.miyoushe.com/upload/2024/11/03/273489775/b8568ed4578c262b1e82de830f88a444_4282867627351916631.png',
  'https://upload-bbs.miyoushe.com/upload/2025/02/03/273489775/e980d50b33ce8db748b3037f7395ba68_434322672713591018.png',
  'https://upload-bbs.miyoushe.com/upload/2025/02/03/273489775/b53bf14e4c1cecd0aadfb69b5cc2a3bc_7304141382454640965.png',
  'https://upload-bbs.miyoushe.com/upload/2025/03/30/273489775/be7ab7ce29745b6af45da17674838f67_193445820641258103.png',
  'https://upload-bbs.miyoushe.com/upload/2025/04/06/273489775/2d1489325107513c2f0167677868010c_3790296858220722202.png',
  'https://upload-bbs.miyoushe.com/upload/2025/07/06/273489775/fabe83bbca193bedc9b542003d215944_6069987243218748025.png',
  'https://upload-bbs.miyoushe.com/upload/2025/02/03/273489775/30b724be759925574257a4a4a2ca0276_6568315822541313331.png'
];
function pickEmptyImage(){
  if (!EMPTY_STATE_IMAGES.length) return '';
  const i = Math.floor(Math.random() * EMPTY_STATE_IMAGES.length);
  return EMPTY_STATE_IMAGES[i];
}

// 初始进入时弹出入门引导
if (!loadSessionFromCache()) {
  resetSession(true);
}
// 统一名称：将“空”“荧”（及常见写法）都视为“旅行者”
function normalizeName(name){
  const n = (name||'').trim();
  if (!n) return '';
  // 去除中间空白，便于匹配“旅行者 · 空”等写法
  const t = n.replace(/\s+/g,'');
  // 直接是空/荧
  if (/^(空|荧)$/.test(t)) return '旅行者';
  // 旅行者·空 / 旅行者·荧（不同点号/中点变体）
  if (/^旅行者[·・\.·]?(空|荧)$/.test(t)) return '旅行者';
  // 可选：英文名（防御性处理）
  if (/^(Aether|Lumine|Traveler)$/i.test(t)) return '旅行者';
  return n;
}


function canRunRecognition() {
  // bpMode can be either:
  // - a string: 'global' | 'personal' | 'off' (when selecting a single mode for both rarities)
  // - an object: { fourStar: 'global'|'personal'|'off', fiveStar: ... } (custom per-rarity)
  const hasBpSelected = (() => {
    if (!bpMode) return false;
    if (typeof bpMode === 'string') return bpMode.length > 0;
    if (typeof bpMode === 'object') return !!(bpMode.fourStar || bpMode.fiveStar);
    return false;
  })();
  return hasBpSelected;
}
function resetSession(showOnboarding=true) {
  rounds = [];
  usedBy = { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set() };
  usedGlobal = new Set();
  myP = '';
  bpMode = 'personal';
  clearedBefore = {};
  saveSessionToCache();
  renderRoundPanel([]);
  roundTip.textContent = '';
  renderRoundNo();
  if (showOnboarding) openOnboarding();
  renderCatalog();
  updateModeUI();
}
resetRecords.addEventListener('click', async ()=>{
  const ok = await showConfirm('此操作将清空当前记录，确定继续？');
  if (!ok) return;
  resetSession(true);
  
  // If in manual mode, reset manual view state
  if (window.isManualMode && window.resetManualModeState) {
    window.resetManualModeState();
  }

  // 若当前位于“历史记录”视图，立即刷新为空态
  try{
    if (document.getElementById('historySection')?.style.display === 'block'){
      renderHistory();
    }
    // 关闭设置弹窗
    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal) hideModal(settingsModal);
  }catch{}
});

// 通用：模态框显示/隐藏与页面滚动状态控制
function anyModalOpen(){
  return Array.from(document.querySelectorAll('.modal.open')).length > 0;
}
function refreshModalOpenClass(){
  if (anyModalOpen()) document.body.classList.add('modal-open');
  else document.body.classList.remove('modal-open');
}
function showModal(el){
  if (!el) return;
  el.style.display = 'flex';
  requestAnimationFrame(()=>{
    el.classList.add('open');
    refreshModalOpenClass();
  });
}
function hideModal(el){
  if (!el) return;
  el.classList.remove('open');
  setTimeout(()=>{
    if (!el.classList.contains('open')){
      el.style.display='none';
      refreshModalOpenClass();
    }
  }, 280);
  refreshModalOpenClass();
}

function buildHistoryRoundSelectContent(){
  if (!historyRoundSelectContent) return;
  if (!rounds.length){
    const img = pickEmptyImage();
    historyRoundSelectContent.innerHTML = `<div class="empty-state"><img src="${img}" alt="empty"/><div class="txt">暂无数据</div></div>`;
    return;
  }
  let html = '<table class="history-table"><thead><tr><th>轮次</th><th>1P</th><th>2P</th><th>3P</th><th>4P</th><th style="width:90px;">操作</th></tr></thead><tbody>';
  rounds.forEach((r, idx)=>{
    html += '<tr>';
    html += `<td>第${idx+1}轮${r && r.ignoreBp ? '<div class="history-note" style="color:var(--muted);font-size:10px;">已忽略本轮BP</div>' : ''}</td>`;
    const names = {1:'',2:'',3:'',4:''};
    (r.entries||[]).forEach(e=>{ if (e && e.p) names[e.p] = e.name || ''; });
    const priorUsedSets = aggregateUsedByUntil(idx);
    for (let p=1; p<=4; p++){
      const name = names[p];
      if (name && name !== '——'){
        const avatarUrl = (window.characterData && window.characterData[name]?.头像) || '';
        const normalizedName = normalizeName(name);
        const priorUsed = priorUsedSets?.[p];
        const isDup = normalizedName && priorUsed && priorUsed.has(normalizedName);
        const tdDupClass = isDup ? ' class="history-dup-cell"' : '';
        html += `<td${tdDupClass}><div class="history-cell-content">${avatarUrl?`<img src="${avatarUrl}" class="history-avatar" alt="${escapeHtml(name)}">`:''}<span class="history-name">${escapeHtml(name)}</span></div></td>`;
      } else {
        html += '<td>——</td>';
      }
    }
    html += `<td><button class="btn-glass btn-glass-secondary history-edit-round" data-round-index="${idx}" style="padding:3px 8px;font-size:12px;">编辑</button></td>`;
    html += '</tr>';
  });
  html += '</tbody></table>';
  historyRoundSelectContent.innerHTML = html;
  historyRoundSelectContent.querySelectorAll('.history-edit-round').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const idx = parseInt(btn.dataset.roundIndex, 10);
      hideModal(historyRoundSelectModal);
      openRoundEditModal(idx);
    });
  });
}

function openHistoryRoundSelectModal(){
  buildHistoryRoundSelectContent();
  showModal(historyRoundSelectModal);
}
function closeHistoryRoundSelectModal(){ hideModal(historyRoundSelectModal); }
document.getElementById('closeHistoryRoundSelectX')?.addEventListener('click', closeHistoryRoundSelectModal);
historyRoundSelectModal?.addEventListener('click', (e)=>{ if (e.target===historyRoundSelectModal) closeHistoryRoundSelectModal(); });

let _swapSelectedLeft = null;
let _swapSelectedRight = null;

function renderSwapSideButtons(){
  const createSide = (sideEl, side) =>{
    if (!sideEl) return;
    // Ensure base class
    if (!sideEl.classList.contains('swap-side')) sideEl.className = 'swap-side';
    
    const selectedVal = side === 'left' ? _swapSelectedLeft : _swapSelectedRight;
    const otherVal = side === 'left' ? _swapSelectedRight : _swapSelectedLeft;

    // Toggle container state for animation
    if (selectedVal !== null) {
      sideEl.classList.add('has-selection');
    } else {
      sideEl.classList.remove('has-selection');
    }

    // Initialize buttons if not present
    if (sideEl.children.length !== 4) {
      sideEl.innerHTML = '';
      for (let p=1; p<=4; p++){
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = p + 'P';
        btn.dataset.p = String(p);
        btn.classList.add('swap-p-btn');
        btn.addEventListener('click', ()=>{
          const pVal = parseInt(btn.dataset.p, 10);
          if (side === 'left'){
            _swapSelectedLeft = _swapSelectedLeft === pVal ? null : pVal;
          } else {
            _swapSelectedRight = _swapSelectedRight === pVal ? null : pVal;
          }
          renderSwapSideButtons();
        });
        sideEl.appendChild(btn);
      }
    }

    // Update button states
    const buttons = sideEl.querySelectorAll('.swap-p-btn');
    buttons.forEach(btn => {
      const p = parseInt(btn.dataset.p, 10);
      const isSelected = selectedVal === p;
      const isDisabled = otherVal === p;
      
      if (isSelected) {
        btn.classList.add('selected');
        // 动态计算从当前布局位置到容器中心的位移，确保在任何尺寸下都能精确居中
        const btnLeft = btn.offsetLeft;
        const btnTop = btn.offsetTop;
        const btnW = btn.offsetWidth;
        const btnH = btn.offsetHeight;
        const contW = sideEl.offsetWidth;
        const contH = sideEl.offsetHeight;
        
        const tx = (contW - btnW) / 2 - btnLeft;
        const ty = (contH - btnH) / 2 - btnTop;
        
        btn.style.setProperty('--tx', `${tx}px`);
        btn.style.setProperty('--ty', `${ty}px`);
      } else {
        btn.classList.remove('selected');
        btn.style.removeProperty('--tx');
        btn.style.removeProperty('--ty');
      }
      
      if (isDisabled) {
        btn.disabled = true;
        btn.classList.remove('selected');
      } else {
        btn.disabled = false;
      }
    });
  };
  createSide(historySwapSideLeft, 'left');
  createSide(historySwapSideRight, 'right');
  if (historySwapConfirmBtn){
    const ok = Number.isInteger(_swapSelectedLeft) && Number.isInteger(_swapSelectedRight) && _swapSelectedLeft !== _swapSelectedRight;
    historySwapConfirmBtn.disabled = !ok;
  }
}

function openHistorySwapModal(){
  if (!rounds.length){ showAlert('暂无记录可交换'); return; }
  _swapSelectedLeft = null;
  _swapSelectedRight = null;
  renderSwapSideButtons();
  showModal(historySwapModal);
}
function closeHistorySwapModal(){ hideModal(historySwapModal); }
document.getElementById('closeHistorySwapX')?.addEventListener('click', closeHistorySwapModal);
historySwapModal?.addEventListener('click', (e)=>{ if (e.target===historySwapModal) closeHistorySwapModal(); });

historySwapConfirmBtn?.addEventListener('click', async ()=>{
  if (!Number.isInteger(_swapSelectedLeft) || !Number.isInteger(_swapSelectedRight) || _swapSelectedLeft === _swapSelectedRight){ return; }
  const p1 = _swapSelectedLeft;
  const p2 = _swapSelectedRight;

  const leftContainer = historySwapSideLeft;
  const rightContainer = historySwapSideRight;
  const leftBtn = leftContainer?.querySelector(`.swap-p-btn[data-p="${p1}"]`);
  const rightBtn = rightContainer?.querySelector(`.swap-p-btn[data-p="${p2}"]`);

  const doSwap = async () => {
    const swapped = swapPlayerRecords(p1, p2);
    if (!swapped) return;

    return new Promise((resolve) => {
      // 在弹窗内显示局部“成功打勾”动画
      try {
        const overlay = document.createElement('div');
        overlay.className = 'swap-loading-overlay';
        overlay.innerHTML = `
          <div class="swap-loading-content">
            <div class="swap-checkmark-container">
              <div class="swap-ring"></div>
              <div class="swap-ring-inner"></div>
              <svg class="swap-checkmark-svg" viewBox="0 0 52 52">
                <path d="M14.1 27.2l7.1 7.2 16.7-16.8" />
              </svg>
            </div>
          </div>`;
        historySwapModal?.querySelector('.dialog')?.appendChild(overlay);

        // 强制 reflow 以启动动画
        void overlay.offsetWidth;
        overlay.classList.add('show');

        setTimeout(()=>{
          overlay.classList.add('success');
        }, 50);

        setTimeout(()=>{
          overlay.classList.remove('show');
          overlay.classList.remove('success');
          overlay.remove();
          closeHistorySwapModal();
          resolve();
        }, 900);
      } catch {
        resolve();
      }
    });
  };

  if (leftBtn && rightBtn && leftContainer && rightContainer){
    try {
      const leftRect = leftBtn.getBoundingClientRect();
      const rightRect = rightBtn.getBoundingClientRect();

      const createGhost = (btn, rect) => {
        const ghost = btn.cloneNode(true);
        ghost.classList.add('swap-ghost-btn');
        ghost.style.position = 'fixed';
        ghost.style.margin = '0';
        ghost.style.width = btn.offsetWidth + 'px';
        ghost.style.height = btn.offsetHeight + 'px';
        ghost.style.left = rect.left + rect.width / 2 + 'px';
        ghost.style.top = rect.top + rect.height / 2 + 'px';
        ghost.style.transform = 'translate(-50%, -50%) scale(1.8)';
        ghost.style.zIndex = '3000';
        ghost.disabled = false;
        return ghost;
      };

      const gLeft = createGhost(leftBtn, leftRect);
      const gRight = createGhost(rightBtn, rightRect);

      document.body.appendChild(gLeft);
      document.body.appendChild(gRight);

      // 隐藏原按钮，避免和幽灵重叠
      leftBtn.classList.add('swap-origin-hidden');
      rightBtn.classList.add('swap-origin-hidden');

      // 计算位移向量（从自己中心到对方中心）
      const dxL = rightRect.left + rightRect.width / 2 - (leftRect.left + leftRect.width / 2);
      const dyL = rightRect.top + rightRect.height / 2 - (leftRect.top + leftRect.height / 2);
      const dxR = leftRect.left + leftRect.width / 2 - (rightRect.left + rightRect.width / 2);
      const dyR = leftRect.top + leftRect.height / 2 - (rightRect.top + rightRect.height / 2);

      // 触发动画（保持 scale(1.8)）
      requestAnimationFrame(()=>{
        gLeft.style.transform = `translate(calc(-50% + ${dxL}px), calc(-50% + ${dyL}px)) scale(1.8)`;
        gRight.style.transform = `translate(calc(-50% + ${dxR}px), calc(-50% + ${dyR}px)) scale(1.8)`;
        gLeft.classList.add('swap-ghost-animating');
        gRight.classList.add('swap-ghost-animating');
      });

      setTimeout(async ()=>{
        // 动画结束后，交换选中状态以匹配视觉位置
        const temp = _swapSelectedLeft;
        _swapSelectedLeft = _swapSelectedRight;
        _swapSelectedRight = temp;
        
        renderSwapSideButtons();

        // 获取新的选中按钮（它们即将显示在幽灵按钮消失的位置）
        const newLeftBtn = leftContainer.querySelector(`.swap-p-btn[data-p="${_swapSelectedLeft}"]`);
        const newRightBtn = rightContainer.querySelector(`.swap-p-btn[data-p="${_swapSelectedRight}"]`);

        if (newLeftBtn) newLeftBtn.style.transition = 'none';
        if (newRightBtn) newRightBtn.style.transition = 'none';

        // 强制浏览器应用样式
        void leftContainer.offsetHeight;

        // 移除幽灵并恢复原按钮显示
        gLeft.remove();
        gRight.remove();
        
        // 清理旧按钮上的 hidden class
        leftBtn.classList.remove('swap-origin-hidden');
        rightBtn.classList.remove('swap-origin-hidden');
        
        // 下一帧恢复过渡效果，以免影响后续交互
        requestAnimationFrame(()=>{
          if (newLeftBtn) newLeftBtn.style.transition = '';
          if (newRightBtn) newRightBtn.style.transition = '';
        });
        
        await doSwap();
      }, 420);
    } catch {
      await doSwap();
    }
  } else {
    await doSwap();
  }
});

function updateModeUI(){
  // highlight selected mode
  if (modeButtons){
    modeButtons.querySelectorAll('button').forEach(b=>{
      let sel = false;
      const mode = b.dataset.mode;
      if (mode === 'custom') {
        sel = bpMode && (typeof bpMode === 'object');
      } else {
        sel = bpMode && (typeof bpMode === 'string') && (mode === bpMode);
      }
      b.classList.toggle('primary', sel);
    });
  }
  updateBpModeText();
}

function openOnboarding(){}
function closeOnboarding(){}

// mode select
if (modeButtons){
  modeButtons.querySelectorAll('button').forEach(b=>{
    b.addEventListener('click', ()=>{ 
      const mode = b.dataset.mode;
      if (mode === 'custom') {
        openCustomBpModal();
      } else {
        bpMode = mode || ''; 
        rebuildUsageSetsFromRounds(); 
        updateModeUI(); 
        renderCatalog(); 
        if (document.getElementById('historySection')?.style.display === 'block') {
          renderHistory();
        }
        refreshCurrentPanelFromLastRound();
        saveSessionToCache();
      }
    });
  });
}

let currentFile = null;
let pasteLocked = false;
const PASTE_COOLDOWN_MS = 800;

function showImageInEditor(url) {
  if (!url) return;
  imgPrev.onload = () => {
    setupCalibLayerSize();
    positionRects();
    // 图片加载完成后，确保切换到第2步
    try { gotoCalibStep(2); } catch {}
  };
  imgPrev.src = url;
  canvasWrap.classList.remove('hidden');
}

function setupCalibLayerSize(){
  const W = imgPrev.naturalWidth || imgPrev.width;
  const H = imgPrev.naturalHeight || imgPrev.height;
  if (!W || !H) return;
  if (calibLayer){
    // 将预览固定为合适大小，适应容器
    const wrapRect = canvasWrap.getBoundingClientRect();
    const availW = Math.max(200, wrapRect.width - 16);
    const availH = Math.max(200, wrapRect.height - 16);
    const s = Math.min(availW / W, availH / H);
    const dispW = Math.max(100, Math.round(W * s));
    const dispH = Math.max(100, Math.round(H * s));
    calibLayer.style.width = dispW + 'px';
    calibLayer.style.height = dispH + 'px';
  }
}

function positionRects() {
  // 使用显示尺寸放置CSS，但 rects 始终是相对自然尺寸的归一化值
  const dispW = (calibLayer?.clientWidth) || (imgPrev?.clientWidth) || 0;
  const dispH = (calibLayer?.clientHeight) || (imgPrev?.clientHeight) || 0;
  const root = calibLayer || canvasWrap;
  const els = root.querySelectorAll('.rect');
  els.forEach(el => {
    const idx = parseInt(el.getAttribute('data-idx'));
    const r = rects[idx];
    el.style.position = 'absolute';
    el.style.left = (r.x * dispW) + 'px';
    el.style.top = (r.y * dispH) + 'px';
    el.style.width = (r.w * dispW) + 'px';
    el.style.height = (r.h * dispH) + 'px';
    el.style.display = editing ? 'block' : 'none';
  });
  renderCalibSlots();
}

let editing = false;
let activeRectIndex = 0; // 当前可调的矫正框索引（全局）
const SCALE_MIN = 0.2, SCALE_MAX = 5.0, SCALE_STEP = 0.1;

function bindEditorEvents() {
  // 校准编辑器已弃用
}
bindEditorEvents();

// 放大镜：在校准步骤2的预览上跟随鼠标，居中放大，并在放大镜内显示校准框范围预览
let _magnifierEl = null;
let _magnifierCanvas = null;
let _magnifierCtx = null;
const MAG_SIZE = 160; // 放大镜直径（CSS像素）
const MAG_ZOOM = 1.05 ;  // 放大倍数
// mobile detection & drag state
const _isMobile = (('ontouchstart' in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0));
let _magDragging = false;
let _magDragOffset = { x: 0, y: 0 };
let _magPos = { x: 0, y: 0 }; // relative to root (css coords)

function ensureMagnifier() {
  if (_magnifierEl) return;
  const root = calibLayer || canvasWrap;
  if (!root) return;
  const el = document.createElement('div');
  el.className = 'magnifier';
  // 基础样式（若页面有样式表会覆盖它）
  el.style.position = 'absolute';
  el.style.width = MAG_SIZE + 'px';
  el.style.height = MAG_SIZE + 'px';
  el.style.borderRadius = '50%';
  el.style.overflow = 'hidden';
  // Desktop: pointerEvents none (follow mouse). Mobile: allow touch to drag.
  el.style.pointerEvents = _isMobile ? 'auto' : 'none';
  // no explicit border; use subtle reflection + dispersion overlays for visual effect
  el.style.border = 'none';
  el.style.boxShadow = '0 8px 22px rgba(0,0,0,0.45)';
  el.style.transform = 'translate(-50%, -50%)';
  el.style.zIndex = '999';
  el.style.display = 'none';

  const c = document.createElement('canvas');
  // 适配 DPR 使放大镜清晰
  const dpr = window.devicePixelRatio || 1;
  c.width = Math.round(MAG_SIZE * dpr);
  c.height = Math.round(MAG_SIZE * dpr);
  c.style.width = MAG_SIZE + 'px';
  c.style.height = MAG_SIZE + 'px';
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);

  el.appendChild(c);
  el.style.boxShadow = '0 6px 16px rgba(0,0,0,0.28)';
  root.appendChild(el);

  _magnifierEl = el;
  _magnifierCanvas = c;
  _magnifierCtx = ctx;

  // Touch drag handlers (mobile): allow dragging magnifier around
  if (_isMobile) {
    el.addEventListener('touchstart', (ev) => {
      ev.preventDefault();
      const t = ev.touches[0];
      const box = root.getBoundingClientRect();
      const x = t.clientX - box.left;
      const y = t.clientY - box.top;
      // compute offset from magnifier top-left
      const magRect = _magnifierEl.getBoundingClientRect();
      _magDragOffset.x = x - (_magPos.x || (magRect.left - box.left));
      _magDragOffset.y = y - (_magPos.y || (magRect.top - box.top));
      _magDragging = true;
      // ensure visible
      _magnifierEl.style.display = '';
    }, { passive: false });

    el.addEventListener('touchmove', (ev)=>{
      if (!_magDragging) return;
      ev.preventDefault();
      const t = ev.touches[0];
      const box = root.getBoundingClientRect();
      let x = t.clientX - box.left - _magDragOffset.x;
      let y = t.clientY - box.top - _magDragOffset.y;
      // clamp within root
      x = Math.max(0, Math.min(box.width, x));
      y = Math.max(0, Math.min(box.height, y));
      _magPos.x = x; _magPos.y = y;
      _magnifierEl.style.left = x + 'px';
      _magnifierEl.style.top = y + 'px';
      // update magnifier content using client coords
      showMagnifierAt(box.left + x, box.top + y);
    }, { passive: false });

    el.addEventListener('touchend', (ev)=>{
      _magDragging = false;
      try{
        // On touchend, apply current magnifier position as the selected ghost (set active rect)
        if (editing) {
          const root = calibLayer || canvasWrap;
          const box = root.getBoundingClientRect();
          const cx = _magPos.x || (box.width/2);
          const cy = _magPos.y || (box.height/2);
          applyMagnifierPositionAsGhost(cx, cy);
          // 在移动端拖动松手后隐藏放大镜，避免遮挡后续操作
          try{ hideMagnifier(); }catch{}
        }
      }catch{}
    });
  }
}

// 将放大镜当前位置（相对于 root 的 CSS 像素坐标）应用为活动 ghost 框的位置
function applyMagnifierPositionAsGhost(xCss, yCss) {
  if (!imgPrev) return;
  const W = imgPrev.naturalWidth || 0;
  const H = imgPrev.naturalHeight || 0;
  if (!W || !H) return;
  const dispW = (calibLayer?.clientWidth) || (imgPrev?.clientWidth) || 0;
  const dispH = (calibLayer?.clientHeight) || (imgPrev?.clientHeight) || 0;
  if (!dispW || !dispH) return;
  // map display css coords to natural pixel coords
  const sX = W / dispW;
  const sY = H / dispH;
  const x = xCss * sX;
  const y = yCss * sY;
  const half = 50; // same as click handler: 100x100 box
  let nx = (x - half) / W;
  let ny = (y - half) / H;
  const nw = 100 / W;
  const nh = 100 / H;
  nx = Math.max(0, Math.min(1 - nw, nx));
  ny = Math.max(0, Math.min(1 - nh, ny));
  rects[activeRectIndex] = { x: nx, y: ny, w: nw, h: nh };
  positionRects();
}

// 将放大镜移动到容器中心并刷新内容
function centerMagnifier(){
  const root = calibLayer || canvasWrap;
  if (!root) return;
  const box = root.getBoundingClientRect();
  const cx = box.width / 2;
  const cy = box.height / 2;
  _magPos.x = cx; _magPos.y = cy;
  if (_magnifierEl) {
    _magnifierEl.style.left = cx + 'px';
    _magnifierEl.style.top = cy + 'px';
    _magnifierEl.style.display = '';
  }
  showMagnifierAt(box.left + cx, box.top + cy);
}

function hideMagnifier() {
  if (!_magnifierEl) return;
  _magnifierEl.style.display = 'none';
}

function showMagnifierAt(clientX, clientY) {
  if (!_magnifierEl) ensureMagnifier();
  if (!_magnifierEl) return;
  const root = calibLayer || canvasWrap;
  const box = root.getBoundingClientRect();
  // 鼠标在显示坐标系中的位置
  const xCss = clientX - box.left;
  const yCss = clientY - box.top;

  // 将显示坐标映射到图片自然像素坐标
  const dispW = (calibLayer?.clientWidth) || (imgPrev?.clientWidth) || 0;
  const dispH = (calibLayer?.clientHeight) || (imgPrev?.clientHeight) || 0;
  const natW = imgPrev.naturalWidth || imgPrev.width || 0;
  const natH = imgPrev.naturalHeight || imgPrev.height || 0;
  if (!dispW || !dispH || !natW || !natH) return;
  const sx = xCss * (natW / dispW);
  const sy = yCss * (natH / dispH);

  // 放大镜显示：裁剪出以 (sx,sy) 为中心的一块自然像素，大小为 MAG_SIZE / MAG_ZOOM
  const srcSizeX = MAG_SIZE / MAG_ZOOM;
  const srcSizeY = MAG_SIZE / MAG_ZOOM;
  let srcX = sx - srcSizeX / 2;
  let srcY = sy - srcSizeY / 2;
  // 限制到图片范围
  srcX = Math.max(0, Math.min(natW - srcSizeX, srcX));
  srcY = Math.max(0, Math.min(natH - srcSizeY, srcY));

  // 在放大镜 canvas 上绘制
  try {
    // 清除
    const ctx = _magnifierCtx;
    const cvs = _magnifierCanvas;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, MAG_SIZE, MAG_SIZE);
    // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
    ctx.drawImage(imgPrev, Math.round(srcX), Math.round(srcY), Math.round(srcSizeX), Math.round(srcSizeY), 0, 0, MAG_SIZE, MAG_SIZE);

    // 绘制校准框范围预览（相对于自然坐标）
    const r = rects[activeRectIndex] || { x:0, y:0, w:0, h:0 };
    const rx = r.x * natW, ry = r.y * natH, rw = r.w * natW, rh = r.h * natH;
    // 转为相对于 srcX/srcY 的位置
    const relX = (rx - srcX) / srcSizeX * MAG_SIZE;
    const relY = (ry - srcY) / srcSizeY * MAG_SIZE;
    const relW = (rw / srcSizeX) * MAG_SIZE;
    const relH = (rh / srcSizeY) * MAG_SIZE;

    // 绘制半透明的矩形边框
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,200,20,0.95)';
    ctx.fillStyle = 'rgba(255,200,20,0.06)';
    // 若校准框完全在放大区域之外，则仍绘制一个边框提示其相对位置（会超出画布，被裁剪）
    ctx.beginPath();
    ctx.rect(relX, relY, relW, relH);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 在放大镜中心始终显示一个“大小预览框”，表示当前活动校准框的尺寸（不随鼠标位移）
    try {
      const centerW = Math.max(2, rw * MAG_ZOOM);
      const centerH = Math.max(2, rh * MAG_ZOOM);
      const centerX = (MAG_SIZE - centerW) / 2;
      const centerY = (MAG_SIZE - centerH) / 2;
      ctx.save();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.setLineDash([6,4]);
      ctx.strokeRect(centerX, centerY, centerW, centerH);
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.moveTo(MAG_SIZE/2 - 8, MAG_SIZE/2);
      ctx.lineTo(MAG_SIZE/2 + 8, MAG_SIZE/2);
      ctx.moveTo(MAG_SIZE/2, MAG_SIZE/2 - 8);
      ctx.lineTo(MAG_SIZE/2, MAG_SIZE/2 + 8);
      ctx.stroke();
      ctx.restore();
    } catch (e) {
      // ignore
    }

    // 最后在放大镜位置显示
  // 因为放大镜已附加到 root（calibLayer 或 canvasWrap），left/top 使用相对显示坐标
  _magnifierEl.style.left = (xCss) + 'px';
  _magnifierEl.style.top = (yCss) + 'px';
    _magnifierEl.style.display = '';
  } catch (e) {
    // 绘制失败时隐藏放大镜
    _magnifierEl.style.display = 'none';
  }
}

// 绑定鼠标事件：仅在编辑模式下启用放大镜显示
function enableMagnifierBindings() {
  const root = calibLayer || canvasWrap;
  if (!root) return;
  // 始终监听，但在事件处理内根据 editing 决定是否显示
  root.addEventListener('mousemove', _onCalibMouseMove);
  root.addEventListener('mouseleave', _onCalibMouseLeave);
  // 当鼠标离开 imgPrev（预览图）区域时也隐藏放大镜，确保更精确的隐藏行为
  if (imgPrev) {
    imgPrev.addEventListener('mouseleave', () => { hideMagnifier(); });
    imgPrev.addEventListener('mouseenter', (e) => { if (editing) showMagnifierAt(e.clientX, e.clientY); });
  }
}

function _onCalibMouseMove(e){
  if (!editing) { hideMagnifier(); return; }
  // 仅在第2步可见时显示（calibStep2 显示时）
  if (calibStep2 && calibStep2.style.display === 'none') { hideMagnifier(); return; }
  // 若有预览图片元素，则仅当鼠标在 imgPrev 的可视范围内时显示放大镜
  try {
    if (imgPrev) {
      const imgRect = imgPrev.getBoundingClientRect();
      if (e.clientX < imgRect.left || e.clientX > imgRect.right || e.clientY < imgRect.top || e.clientY > imgRect.bottom) {
        hideMagnifier();
        return;
      }
    }
  } catch (err) {
    // ignore errors and continue
  }
  showMagnifierAt(e.clientX, e.clientY);
}

function _onCalibMouseLeave(e){ hideMagnifier(); }

// 立即绑定（函数内做显示判断），避免重复绑定多次
enableMagnifierBindings();

function findNextRectIndex(){
  for (let i=0;i<4;i++){
    const r = rects[i];
    if (!r || !isFinite(r.x) || r.w<=0 || r.h<=0) return i;
  }
  return -1;
}

function findNearestRectIndex(px, py, W, H){
  let best=-1, bestD=1e18;
  for (let i=0;i<4;i++){
    const r = rects[i];
    const cx = (r.x + r.w/2) * W;
    const cy = (r.y + r.h/2) * H;
    const d = (cx-px)*(cx-px) + (cy-py)*(cy-py);
    if (d < bestD){ bestD = d; best = i; }
  }
  return best>=0?best:0;
}

function renderCalibSlots(){
  if (!calibSlots) return;
  const W = imgPrev.naturalWidth || 0;
  const H = imgPrev.naturalHeight || 0;
  calibSlots.innerHTML = '';
  for (let i=0;i<4;i++){
    const r = rects[i];
    const sw = Math.max(1, Math.round((r.w||0) * W));
    const sh = Math.max(1, Math.round((r.h||0) * H));
    const sx = Math.max(0, Math.round((r.x||0) * W));
    const sy = Math.max(0, Math.round((r.y||0) * H));
  const canvas = document.createElement('canvas');
  canvas.width = 72; canvas.height = 72;
    const ctx = canvas.getContext('2d');
    if (W>0 && H>0 && sw>0 && sh>0){
      ctx.drawImage(imgPrev, sx, sy, sw, sh, 0, 0, 72, 72);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(0,0,72,72);
      ctx.fillStyle = '#999';
      ctx.fillText('未设置', 10, 40);
    }
    const btn = document.createElement('button');
    btn.className = 'ghost';
    btn.appendChild(canvas);
    if (i===activeRectIndex) btn.style.outline = '2px solid var(--primary)';
    btn.addEventListener('click', ()=>{
      activeRectIndex = i;
      highlightActiveRect(activeRectIndex);
      renderCalibSlots();
      try{
        ensureMagnifier();
        centerMagnifier();
      }catch{}
    });
    calibSlots.appendChild(btn);
  }
}

function highlightActiveRect(idx){
  const els = (calibLayer||canvasWrap).querySelectorAll('.rect');
  els.forEach((el)=>{
    if ((parseInt(el.getAttribute('data-idx'))||0)===idx){
      el.style.boxShadow = '0 0 0 2px var(--primary) inset';
      el.style.border = '2px solid var(--primary)';
    } else {
      el.style.boxShadow = '';
      el.style.border = '1px dashed rgba(255,255,255,0.35)';
    }
  });
}

fileEl.addEventListener('change', async () => {
  const f = fileEl.files?.[0];
  if (!f) return;
  currentFile = f;
  await startRecognition(f);
});

window.addEventListener('paste', async (e) => {
  if (!window.isManualMode && !canRunRecognition()) {
    // Check if it's an image paste before blocking
    const items = e.clipboardData?.items || [];
    let hasImage = false;
    for (const it of items) {
      if (it.kind === 'file' && it.type.startsWith('image/')) {
        hasImage = true;
        break;
      }
    }
    if (hasImage) {
      const hint = document.getElementById('onboardingIncompleteHint');
      if (hint) hint.style.display = 'block';
      openOnboarding();
      return;
    }
  }

  // 如果上一次粘贴刚触发识别，忽略后续快速重复的 paste 事件
  if (pasteLocked) return;
  const items = e.clipboardData?.items || [];
  for (const it of items) {
    if (it.kind === 'file' && it.type.startsWith('image/')) {
      const blob = it.getAsFile();
      if (blob) {
        // 上锁防止连续触发；仅在检测到图片时生效
        pasteLocked = true;
        try {
          currentFile = new File([blob], 'pasted.png', { type: blob.type || 'image/png' });
          fileEl.value = '';
          await startRecognition(currentFile);
        } finally {
          // 给予短暂冷却时间，避免按住 Ctrl+V 重复触发
          setTimeout(() => { pasteLocked = false; }, PASTE_COOLDOWN_MS);
        }
        break;
      }
    }
  }
});

async function getClipboardImage(){
  // 首选异步 Clipboard API（需 HTTPS/用户手势），回退到 navigator.clipboard.readText 无法包含图像
  if (navigator.clipboard && navigator.clipboard.read){
    try{
      const items = await navigator.clipboard.read();
      for (const item of items){
        for (const type of item.types){
          if (type.startsWith('image/')){
            const blob = await item.getType(type);
            return new File([blob], 'pasted.png', { type: blob.type || 'image/png' });
          }
        }
      }
    }catch{}
  }
  // 不可用时返回 null，让调用方提示用户使用 Ctrl+V
  return null;
}

// 顶栏：从剪贴板粘贴并直接走识别
// 主动作按钮：根据用户选择执行不同操作（选择/粘贴/截取）
function getSavedPanelAction(){ return localStorage.getItem(PANEL_MAIN_ACTION_KEY) || 'select'; }
function setSavedPanelAction(v){ localStorage.setItem(PANEL_MAIN_ACTION_KEY, v); updateMainActionUI(); }
function getReidentifyBtnLabelByMode(){
  const m = getSavedPanelAction();
  if (m === 'select') return '选择图片';
  if (m === 'paste') return '从剪贴板粘贴';
  if (m === 'capture') return '截取窗口';
  return '重新识别';
}
function updateReidentifyBtnText(){
  const btn = document.getElementById('reidentifyUploadBtn');
  if (!btn) return;
  const txt = getReidentifyBtnLabelByMode();
  btn.textContent = txt;
  btn.setAttribute('title', txt);
}
// 当主操作模式切换时，同时更新历史重识别按钮文案
const _origSetSavedPanelAction = setSavedPanelAction;
setSavedPanelAction = function(v){
  localStorage.setItem(PANEL_MAIN_ACTION_KEY, v);
  updateMainActionUI();
  try{ updateReidentifyBtnText(); }catch{}
};
function updateMainActionUI(){
  const m = getSavedPanelAction();
  if (!mainActionBtn) return;
  if (m === 'select') mainActionBtn.textContent = '选择图片';
  else if (m === 'paste') mainActionBtn.textContent = '从剪贴板粘贴';
  else if (m === 'capture') mainActionBtn.textContent = '截取窗口';
  mainActionBtn.setAttribute('title', mainActionBtn.textContent);
  // 更新下拉项高亮
  actionDropdown?.querySelectorAll('.action-item')?.forEach(btn=> btn.classList.toggle('active', btn.dataset.action === m));
}

async function performCaptureWindow(){
  if (window.isDesktopApp && window.chrome && window.chrome.webview && window.chrome.webview.postMessage) {
    window.chrome.webview.postMessage(JSON.stringify({ type: 'triggerCapture' }));
    return;
  }

  if (!navigator.mediaDevices?.getDisplayMedia) {
    showAlert('【此功能仅PC端】您的浏览器不支持屏幕捕捉功能，请使用以下浏览器（如 Chrome, Edge, Firefox）再试。');
    return;
  }

  let stream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: "never", displaySurface: "window" },
      audio: false,
    });
  } catch (err) {
    console.log('屏幕捕捉被取消或失败:', err);
    return;
  }

  const video = document.createElement('video');
  video.srcObject = stream;

  video.onloadedmetadata = () => {
    video.play();

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 停止屏幕共享
    stream.getTracks().forEach(track => track.stop());

    canvas.toBlob(async (blob) => {
      if (blob) {
        const file = new File([blob], 'captured-window.png', { type: 'image/png' });
        currentFile = file;
        fileEl.value = '';
        await startRecognition(currentFile);
      }
    }, 'image/png');
  };
}

// 仅捕获一帧并返回 File（供历史重识别等场景复用）
async function captureWindowOnce(){
  if (window.isDesktopApp && window.chrome && window.chrome.webview && window.chrome.webview.postMessage) {
    return new Promise((resolve) => {
      window._captureOnceResolver = resolve;
      window.chrome.webview.postMessage(JSON.stringify({ type: 'triggerCapture' }));
    });
  }

  if (!navigator.mediaDevices?.getDisplayMedia) {
    showAlert('【此功能仅PC端】您的浏览器不支持屏幕捕捉功能，请使用以下浏览器（如 Chrome, Edge, Firefox）再试。');
    return null;
  }
  let stream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: 'never', displaySurface: 'window' },
      audio: false,
    });
  } catch (err) {
    console.log('屏幕捕捉被取消或失败:', err);
    return null;
  }
  return await new Promise((resolve)=>{
    const video = document.createElement('video');
    video.srcObject = stream;
    video.onloadedmetadata = () => {
      video.play();
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      stream.getTracks().forEach(track => track.stop());
      canvas.toBlob((blob)=>{
        if (!blob) { resolve(null); return; }
        const file = new File([blob], 'captured-window.png', { type: 'image/png' });
        resolve(file);
      }, 'image/png');
    };
  });
}

mainActionBtn?.addEventListener('click', async ()=>{
  if (!window.isManualMode && !canRunRecognition()) {
    const hint = document.getElementById('onboardingIncompleteHint');
    if (hint) hint.style.display = 'block';
    openOnboarding();
    return;
  }
  const mode = getSavedPanelAction();
  if (mode === 'select') { fileEl?.click(); return; }
  if (mode === 'paste') {
    const f = await getClipboardImage();
    if (!f){ showAlert('无法读取剪贴板图像，请先复制图片后再试。'); return; }
    currentFile = f; fileEl.value=''; await startRecognition(currentFile); return;
  }
  if (mode === 'capture') { await performCaptureWindow(); return; }
});

// 下拉切换逻辑
function openDropdown(){
  if (!actionDropdown || !actionToggleBtn) return;
  actionDropdown.classList.add('open');
  actionDropdown.setAttribute('aria-hidden','false');
  actionToggleBtn.setAttribute('aria-expanded','true');
}
function closeDropdown(){
  if (!actionDropdown || !actionToggleBtn) return;
  actionDropdown.classList.remove('open');
  actionDropdown.setAttribute('aria-hidden','true');
  actionToggleBtn.setAttribute('aria-expanded','false');
}
actionToggleBtn?.addEventListener('click', (e)=>{ e.stopPropagation(); const open = actionDropdown?.getAttribute('aria-hidden') === 'false'; if (open) closeDropdown(); else openDropdown(); });
// 点击选项
actionDropdown?.querySelectorAll('.action-item')?.forEach(btn=> btn.addEventListener('click', (e)=>{
  const a = btn.dataset.action; if (!a) return; setSavedPanelAction(a); closeDropdown();
}));
// 点击外部关闭
document.addEventListener('click', (e)=>{ if (!actionCombo) return; if (!actionCombo.contains(e.target)) closeDropdown(); });

// 初始化主动作显示
try{ updateMainActionUI(); }catch{}

// 校准步骤1：从剪贴板粘贴并进入步骤2
pasteImageCalib?.addEventListener('click', async ()=>{
  const f = await getClipboardImage();
  if (!f){ try{ showAlert('无法读取剪贴板图像，请先复制图片（或允许浏览器读取剪贴板）。'); }catch{} return; }
  const url = URL.createObjectURL(f);
  showImageInEditor(url);
  gotoCalibStep(2);
});

// 截取窗口功能由 performCaptureWindow() 提供，上面的按钮已合并到组合控件中

const openCaptureGuide = document.getElementById('openCaptureGuide');
openCaptureGuide?.addEventListener('click', (e) => {
  e.preventDefault();
  showAlert('<strong style="color:#2B90FF">截图需求</strong>：上传的图片会自动裁剪右半边角色头像的区域出来，所以使用 上传图片 或 从剪贴板粘贴 时，请使用游戏画面的全屏截图上传。截取时请确保游戏画面内玩家的角色头像未被遮挡（没有打开地图等界面）。 此外，手机端角色头像显示不全，且分辨率未适配，如需使用请调整为手动模式。<br><br><strong style="color:#2B90FF">上传图片</strong>：从文件中上传图片。 <br><br> <strong style="color:#2B90FF">从剪贴板粘贴</strong>：读取当前剪贴板中的图片上传并识别，可使用截图软件的复制功能直接复制图片。(可用Ctrl+V快捷键触发识别)<br><br> <strong style="color:#2B90FF">截取窗口</strong>：通过浏览器共享窗口功能自动截取画面，使用时游戏需要在无边框或窗口模式下，选择共享 窗口-原神 。捕获一帧游戏画面识别后将自动关闭共享。', true);
});

// 点击 API 链接时弹出说明（在弹窗内显示可点击的文档地址与提示）
const openApiLink = document.getElementById('openApiLink');
openApiLink?.addEventListener('click', (e) => {
  e.preventDefault();
  showAlert('API 文档：<a class="hint" href="https://unhappycar.tech/swagger" target="_blank" rel="noopener">https://unhappycar.tech/swagger</a><br><br>支持识别的角色：至 6.1 版本。', true);
});

function setEditing(v) {
  editing = v; positionRects();
  // hint shown via UI; no log area now
}
// Calibration modal open/close and actions
if (openCalibrate){
  openCalibrate.addEventListener('click', ()=>{ 
    openCalibrationWizard();
  });
}
calibModal?.addEventListener('click', (e)=>{ if (e.target===calibModal) { closeCalibrationWizard(true); } });
document.getElementById('closeCalibX')?.addEventListener('click', ()=>{ closeCalibrationWizard(true); });
calibFile?.addEventListener('change', ()=>{
  const f = calibFile?.files?.[0]; if (!f) return; 
  const url = URL.createObjectURL(f); 
  showImageInEditor(url);
  // 选图后自动进入第2步
  gotoCalibStep(2);
});
btnSelectCalib?.addEventListener('click', ()=>{ calibFile?.click(); });
saveCalib?.addEventListener('click', () => { saveRects(); closeCalibrationWizard(true); });

// 校准视频弹窗：打开/关闭与播放控制（动态查询，避免脚本早于DOM渲染）
openCalibVideo?.addEventListener('click', ()=>{
  const modal = document.getElementById('calibVideoModal');
  const video = document.getElementById('calibVideo');
  if (modal){
    showModal(modal);
    try{ video?.play(); }catch{}
  }
});
document.addEventListener('click', (e)=>{
  const target = e.target;
  // 点击遮罩关闭
  if (target && target.id === 'calibVideoModal'){
    const modal = document.getElementById('calibVideoModal');
    const video = document.getElementById('calibVideo');
    try{ video?.pause(); if (video) video.currentTime = 0; }catch{}
  if (modal) hideModal(modal);
  }
  // 点击关闭按钮
  if (target && target.id === 'closeCalibVideo'){
    const modal = document.getElementById('calibVideoModal');
    const video = document.getElementById('calibVideo');
    try{ video?.pause(); if (video) video.currentTime = 0; }catch{}
  if (modal) hideModal(modal);
  }
  if (target && target.id === 'closeCalibVideoX'){
    const modal = document.getElementById('calibVideoModal');
    const video = document.getElementById('calibVideo');
    try{ video?.pause(); if (video) video.currentTime = 0; }catch{}
    if (modal) hideModal(modal);
  }
});

function openCalibrationWizard(){
  showModal(calibModal);
  // 默认进入第1步
  gotoCalibStep(1);
  setEditing(false); // 第1步不允许编辑
  // 从现在起不再保留或自动加载校准图片缓存
  try { localStorage.removeItem('avatarCalibImage'); } catch {}
}

function closeCalibrationWizard(backToOnboarding){
  hideModal(calibModal);
  setEditing(false);
  if (backToOnboarding){ try{ updateModeUI(); openOnboarding(); }catch{} }
}

function gotoCalibStep(n){
  if (!calibStep1 || !calibStep2) return;
  if (n===1){
    calibStep1.style.display='block';
    calibStep2.style.display='none';
  } else {
    calibStep1.style.display='none';
    calibStep2.style.display='block';
    setEditing(true); // 进入第2步启用编辑
    // 确保尺寸/位置刷新
    requestAnimationFrame(()=>{ 
      setupCalibLayerSize(); positionRects(); 
      try{
        if (_isMobile) {
          ensureMagnifier();
          const root = calibLayer || canvasWrap;
          const box = root.getBoundingClientRect();
          const cx = box.width / 2;
          const cy = box.height / 2;
          _magPos.x = cx; _magPos.y = cy;
          _magnifierEl.style.left = cx + 'px';
          _magnifierEl.style.top = cy + 'px';
          _magnifierEl.style.display = '';
          // update content once
          showMagnifierAt(box.left + cx, box.top + cy);
        }
      }catch{}
    });
  }
}

async function fileToImage(fileOrBlob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(fileOrBlob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = reject; img.src = url;
  });
}

async function cropByRects(fileOrBlob) {
  const img = await fileToImage(fileOrBlob);
  const W = img.naturalWidth, H = img.naturalHeight;
  const result = [];
  for (let i = 0; i < 4; i++) {
    const r = rects[i];
    const sx = Math.round(r.x * W), sy = Math.round(r.y * H);
    const sw = Math.round(r.w * W), sh = Math.round(r.h * H);
    const c = document.createElement('canvas');
    c.width = sw; c.height = sh;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    const blob = await new Promise(res => c.toBlob(res, 'image/png', 0.95));
    result.push({ blob, canvas: c });
  }
  return result.map(r => r.blob);
}

async function startRecognition(file){
  if (!file) { roundTip.textContent = '请选择图片，或直接 Ctrl+V 粘贴图片'; return; }
  if (!bpMode) { roundTip.textContent = '请在设置中选择 BP 模式。'; return; }
  showLoading(true);
  try {
    const img = await fileToImage(file);
    const origW = img.naturalWidth;
    const origH = img.naturalHeight;
    const cropX = origW * 0.8;
    const cropY = origH * 0.15;
    const cropW = origW * 0.2;
    const cropH = origH * 0.6;

    const canvas = document.createElement('canvas');
    canvas.width = cropW;
    canvas.height = cropH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    
    const croppedBlob = await new Promise(res => canvas.toBlob(res, 'image/png'));
    window._lastDebugImage = croppedBlob;

    const fd = new FormData();
    fd.append('file', croppedBlob, 'cropped.png');
    fd.append('mode', 'team');
    fd.append('origW', origW);
    fd.append('origH', origH);

    const res = await fetch('https://picksnap.unhappycar.xyz:8080/api/classify', { method: 'POST', body: fd });
    const json = await res.json();
    try{ window._lastModelResponse = json; }catch(e){}
    if (!json.success && !json.results) {
      if (window.isDesktopApp && window.chrome && window.chrome.webview && window.chrome.webview.postMessage) {
         window.chrome.webview.postMessage(JSON.stringify({ type: 'showNotification', title: '识别失败', body: json.message || '识别失败', isError: true }));
      }
      roundTip.innerHTML = escapeHtml(json.message || '识别失败') + ' <a href="#" id="viewDebugLink" style="color:#6db3ff;text-decoration:underline;">[查看详情]</a>';
      document.getElementById('viewDebugLink')?.addEventListener('click', (e)=>{
          e.preventDefault();
          if (window.openModelResponse) window.openModelResponse();
      });
      showLoading(false);
      return;
    }
    const mapped = mapResultsToP(json);
    const enriched = checkConflictsAndComposeRound(mapped);
    renderRoundPanel(enriched);
    commitUsage(enriched);
    rebuildUsageSetsFromRounds();
    renderCatalog();
    if (document.getElementById('historySection')?.style.display === 'block') {
      renderHistory();
    }
    showLoadingSuccess();

    if (window.isDesktopApp && window.chrome && window.chrome.webview && window.chrome.webview.postMessage) {
      try {
        let msgParts = [];
        let conflictNames = [];
        for (let i = 1; i <= 4; i++) {
          let e = enriched.find(x => x.p === i);
          if (e && e.name) {
            msgParts.push(i + 'P:' + e.name);
            if (e.conflict) {
              if (!conflictNames.includes(e.name)) {
                conflictNames.push(e.name);
              }
            }
          } else {
            msgParts.push(i + 'P:未识别');
          }
        }
        let bodyText = msgParts.join(' ');
        if (conflictNames.length > 0) {
          bodyText += '\n' + conflictNames.join('、') + '已BP';
        }
        window.chrome.webview.postMessage(JSON.stringify({
           type: 'showNotification',
           title: '识别成功',
           body: bodyText,
           isError: conflictNames.length > 0
        }));
      } catch(err) {}
    }
  } catch (e) {
    if (window.isDesktopApp && window.chrome && window.chrome.webview && window.chrome.webview.postMessage) {
       window.chrome.webview.postMessage(JSON.stringify({ type: 'showNotification', title: '上传/识别失败', body: String(e), isError: true }));
    }
    roundTip.textContent = '上传/识别失败: ' + e;
    showLoading(false);
  }
}

// ---- model response inspector modal (lazy) ----
let modelResponseModal = null;
function ensureModelResponseModal(){
  if (modelResponseModal) return modelResponseModal;
  const m = document.createElement('div');
  m.className = 'modal';
  m.id = 'modelResponseModal';
  m.innerHTML = `
    <div class="dialog onboarding-dialog" style="max-width:900px; width:95%; max-height:90vh; display:flex; flex-direction:column;">
      <button class="modal-x" id="closeModelResponseX" aria-label="关闭">×</button>
      <h3 style="margin:0 0 8px; text-align:center; color:#2B90FF">识别模型原始返回数据</h3>
      <div id="modelResponseCanvasContainer" style="position:relative; width:100%; text-align:center; flex: 1 1 auto; overflow:auto; min-height: 200px; display:none; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; margin-bottom: 10px;">
         <canvas id="modelResponseCanvas" style="max-width:100%; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 4px 12px rgba(0,0,0,0.5);"></canvas>
      </div>
      <pre id="modelResponseContent" aria-live="polite" style="flex: 0 0 auto; max-height: 30vh; overflow:auto; margin:0;"></pre>
    </div>`;
  document.body.appendChild(m);
  modelResponseModal = m;

  const doClose = ()=> hideModal(modelResponseModal);
  m.addEventListener('click', (e)=>{ if (e.target === m) doClose(); });
  m.querySelector('#closeModelResponseX').addEventListener('click', doClose);

  return modelResponseModal;
}

window.openModelResponse = function() {
  ensureModelResponseModal();
  const pre = modelResponseModal.querySelector('#modelResponseContent');
  if (!pre) return;
  const data = window._lastModelResponse ?? null;
  if (!data) {
    pre.textContent = '未找到模型返回的数据 — 请先上传并识别一张图片。';
  } else {
    try{ pre.textContent = JSON.stringify(data, null, 2); }catch{ pre.textContent = String(data); }
    const cvsContainer = modelResponseModal.querySelector('#modelResponseCanvasContainer');
    const cvs = modelResponseModal.querySelector('#modelResponseCanvas');
    const targetFile = window._lastDebugImage || currentFile;
    if (data.debugData && targetFile) {
       cvsContainer.style.display = 'block';
       const ctx = cvs.getContext('2d');
       const img = new Image();
       img.onload = () => {
          cvs.width = img.naturalWidth;
          cvs.height = img.naturalHeight;
          ctx.drawImage(img, 0, 0);
          const dd = data.debugData;
          if (dd.badges) {
             dd.badges.forEach(b => {
                if (b.p !== -1) {
                    ctx.strokeStyle = 'rgba(255, 215, 0, 1)';
                    ctx.fillStyle = 'rgba(255, 215, 0, 1)';
                    ctx.lineWidth = 4;
                    ctx.strokeRect(b.x, b.y, b.badgeW, b.badgeH);
                    ctx.font = 'bold 24px sans-serif';
                    ctx.fillText(`${b.p}P (Conf: ${b.confidence.toFixed(2)})`, b.x + b.badgeW + 10, b.y + 20);
                } else {
                    ctx.strokeStyle = '#FF3333';
                    ctx.fillStyle = '#FF3333';
                    ctx.lineWidth = 4;
                    ctx.strokeRect(b.x, b.y, b.badgeW, b.badgeH);
                    ctx.font = 'bold 24px sans-serif';
                    ctx.fillText(`未识别 (Conf: ${b.confidence.toFixed(2)})`, b.x + b.badgeW + 10, b.y + 20);
                }
             });
          }
          if (dd.avatars) {
             dd.avatars.forEach(a => {
                ctx.strokeStyle = '#00BFFF';
                ctx.lineWidth = 3;
                ctx.strokeRect(a.x, a.y, a.w, a.h);
                ctx.fillStyle = '#00BFFF';
                ctx.font = 'bold 24px sans-serif';

                // 获取具体的角色名称
                let charName = '';
                const matchedResult = data && data.results ? data.results.find(r => r.p === a.p) : null;
                if (matchedResult) {
                   if (matchedResult.success) {
                      charName = matchedResult.nameCn || matchedResult.display || '未知角色';
                   } else {
                      charName = '识别失败';
                   }
                } else {
                   charName = '未识别';
                }

                const prefix = a.isSelf ? 'Self' : `${a.p}P`;
                const text = `${prefix}: ${charName}`;

                const oldAlign = ctx.textAlign;
                const oldBaseline = ctx.textBaseline;
                ctx.textAlign = 'right';
                ctx.textBaseline = 'top';

                ctx.fillText(text, a.x - 12, a.y + 2);

                ctx.textAlign = oldAlign;
                ctx.textBaseline = oldBaseline;
             });
          }
       };
       img.src = URL.createObjectURL(targetFile);
    } else {
       if(cvsContainer) cvsContainer.style.display = 'none';
    }
  }
  showModal(modelResponseModal);
};

// add click to round title to open model response inspector
try{
  const roundTitleEl = document.querySelector('.round-title');
  if (roundTitleEl){
    roundTitleEl.addEventListener('click', window.openModelResponse);
  }
}catch(e){}

let particleAnimationId = null;
let particleCtx = null;
let particleCanvas = null;
let particles = [];
let particleTime = 0;
let particleWidth = 0;
let particleHeight = 0;

const PARTICLE_CONFIG = {
    particleCount: 600,
    baseRadius: 65, // Adjusted to match Face ID ring size (approx 120px diameter)
    focalLength: 400,
    color: { r: 200, g: 200, b: 200 }
};

class Particle {
    constructor() {
        this.theta = Math.random() * Math.PI * 2;
        this.phi = Math.acos((Math.random() * 2) - 1);
        
        this.x = 0; 
        this.y = 0; 
        this.z = 0;
        this.originalSize = Math.random() * 1.5 + 1;
        this.waveOffset = Math.random() * 100;
    }

    project(time) {
        let r = PARTICLE_CONFIG.baseRadius;
        r += Math.sin(time * 0.002 + this.phi * 5 + this.waveOffset) * 6;

        this.x = r * Math.sin(this.phi) * Math.cos(this.theta);
        this.y = r * Math.sin(this.phi) * Math.sin(this.theta);
        this.z = r * Math.cos(this.phi);

        let rotY = time * 0.0008;
        let rotX = time * 0.0002;

        let y = this.y * Math.cos(rotX) - this.z * Math.sin(rotX);
        let z = this.y * Math.sin(rotX) + this.z * Math.cos(rotX);
        let x = this.x * Math.cos(rotY) - z * Math.sin(rotY);
        z = this.x * Math.sin(rotY) + z * Math.cos(rotY);

        const scale = PARTICLE_CONFIG.focalLength / (PARTICLE_CONFIG.focalLength + z);
        this.projX = x * scale + particleWidth / 2;
        this.projY = y * scale + particleHeight / 2;
        this.projScale = scale;
        this.alpha = scale;
    }

    draw() {
        if (this.alpha <= 0) return;
        const opacity = Math.max(0.1, Math.min(1, (this.alpha - 0.5) * 2.5));
        particleCtx.fillStyle = `rgba(${PARTICLE_CONFIG.color.r}, ${PARTICLE_CONFIG.color.g}, ${PARTICLE_CONFIG.color.b}, ${opacity})`;
        particleCtx.beginPath();
        particleCtx.arc(this.projX, this.projY, this.originalSize * this.projScale, 0, Math.PI * 2);
        particleCtx.fill();
    }
}

function initParticles() {
    particles = [];
    for (let i = 0; i < PARTICLE_CONFIG.particleCount; i++) {
        particles.push(new Particle());
    }
}

function resizeParticleCanvas() {
    if (!particleCanvas) return;
    const rect = particleCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Fallback to 300 if hidden
    const w = rect.width || 300;
    const h = rect.height || 300;
    
    particleWidth = w;
    particleHeight = h;
    
    particleCanvas.width = w * dpr;
    particleCanvas.height = h * dpr;
    particleCtx.scale(dpr, dpr);
}

function particleAnimate() {
    if (!particleCtx) return;
    
    // Use destination-out to create transparent trails
    particleCtx.globalCompositeOperation = 'destination-out';
    particleCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    particleCtx.fillRect(0, 0, particleWidth, particleHeight);
    particleCtx.globalCompositeOperation = 'source-over';
    
    particleTime += 16;

    particles.forEach(p => {
        p.project(particleTime);
        p.draw();
    });

    particleAnimationId = requestAnimationFrame(particleAnimate);
}

function startParticleAnimation() {
    particleCanvas = document.getElementById('loadingCanvas');
    if (!particleCanvas) return;
    particleCtx = particleCanvas.getContext('2d');
    
    resizeParticleCanvas();
    initParticles();
    particleTime = 0;
    
    if (particleAnimationId) cancelAnimationFrame(particleAnimationId);
    particleAnimate();
    
    window.addEventListener('resize', resizeParticleCanvas);
}

function stopParticleAnimation() {
    if (particleAnimationId) {
        cancelAnimationFrame(particleAnimationId);
        particleAnimationId = null;
    }
    window.removeEventListener('resize', resizeParticleCanvas);
    if (particleCtx && particleWidth && particleHeight) {
        particleCtx.clearRect(0, 0, particleWidth, particleHeight);
    }
}

function showLoading(show){
  const el = document.getElementById('loadingOverlay');
  if (!el) return;
  if (show) {
    el.classList.remove('success'); // reset success state
    el.classList.add('show');
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    startParticleAnimation();
  } else {
    el.classList.remove('show');
    el.classList.remove('success');
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    stopParticleAnimation();
  }
}

function ensureCheckmark() {
  const overlay = document.getElementById('loadingOverlay');
  if (!overlay) return;
  if (!overlay.querySelector('.checkmark-container')) {
    const container = document.createElement('div');
    container.className = 'checkmark-container';
    container.innerHTML = `
      <div class="ring"></div>
      <div class="ring-inner"></div>
      <svg class="checkmark-svg" viewBox="0 0 52 52">
        <path d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
      </svg>
    `;
    overlay.appendChild(container);
  }
}

function showLoadingSuccess(callback) {
  const el = document.getElementById('loadingOverlay');
  if (!el) { if(callback) callback(); return; }
  
  ensureCheckmark();
  el.classList.add('success');
  
  // Stop particle animation after fade out (0.5s transition)
  setTimeout(() => {
    stopParticleAnimation();
  }, 500);
  
  setTimeout(() => {
    el.classList.remove('show');
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    // Wait for fade out transition to finish before resetting success state
    // This prevents the spinner from reappearing during the fade out
    setTimeout(() => {
      el.classList.remove('success');
      if (callback) callback();
    }, 550);
  }, 1200);
}

// 简单 HTML 转义，避免插入文本造成 XSS
function escapeHtml(str){
  return String(str||'')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function copyToClipboard(text){
  try{
    if (navigator.clipboard && navigator.clipboard.writeText){
      await navigator.clipboard.writeText(text);
      return true;
    }
  }catch{}
  // 回退方案
  try{
    const ta = document.createElement('textarea');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  }catch{
    return false;
  }
}

function mapResultsToP(batchJson) {
  const resultsByP = {1:null,2:null,3:null,4:null};
  (batchJson.results||[]).forEach((item)=>{
    if (item.p) resultsByP[item.p] = item;
  });
  return resultsByP;
}

function checkConflictsAndComposeRound(resultsByP){
  const round = [];
  for (let p=1; p<=4; p++){
    const r = resultsByP[p];
    if (!r || !r.success){
      round.push({ p, name:'', avatarUrl:'', from:'auto', confidence: r?.confidence ?? 0, conflict:false, reason:'识别失败，请检查上传的图片', editable:true });
      continue;
    }
    const raw = r.nameCn || r.display || r.predicted || '';
    const name = normalizeName(raw);
    const character = window.characterData[name];
    const rarity = character ? (character['星级'] === '五星' ? 'fiveStar' : 'fourStar') : null;
    const currentBpMode = typeof bpMode === 'object' ? (rarity ? bpMode[rarity] : 'off') : bpMode;

    let conflict = false;
    let reason = '';

    if (currentBpMode !== 'off') {
      conflict = (currentBpMode === 'personal') ? usedBy[p].has(name) : usedGlobal.has(name);
      if (conflict) {
        if (currentBpMode === 'personal') {
          const info = getLastUsageInfo(name, false);
          if (info) {
            reason = `${p}P 在第${info.round}轮 已使用过 ${name}`;
          } else {
            reason = `${p}P 已使用过 ${name}`;
          }
        } else {
          const info = getLastUsageInfo(name, false);
          if (info) {
            const psTxt = info.ps.map(x => `${x}P`).join(' / ');
            reason = `${name} 在第${info.round}轮 已被 ${psTxt} 使用`;
          } else {
            reason = `${name} 已被使用（全局BP）`;
          }
        }
      }
    }
    const avatar = (window.characterData && window.characterData[name]?.头像) || '';
    round.push({ p, name, avatarUrl: avatar, from:'auto', confidence: r.confidence, conflict, reason, editable: true });
  }
  return round;
}

function commitUsage(round){
  // 仅追加历史；usedBy/usedGlobal 由 rebuildUsageSetsFromRounds 基于 clearedBefore 自动重建
  rounds.push({ at: new Date().toISOString(), entries: round.map(({p,name,from,confidence})=>({p,name,from,confidence})) });

  // 检查所有轮次的所有数据是否都识别失败
  const allFailed = rounds.every(r => 
    !r.entries || r.entries.every(entry => !entry.name || entry.name === '——')
  );

  if (allFailed) {
    localStorage.setItem('avatarSideForceOnboarding', 'true');
  } else {
    localStorage.removeItem('avatarSideForceOnboarding');
  }

  renderRoundNo();
  saveSessionToCache();
}

function renderRoundPanel(round){
  // If no round data provided (initial state or cleared), show empty-state
  if (!round || (Array.isArray(round) && round.length === 0)){
    const img = pickEmptyImage();
    roundSlots.innerHTML = `<div class="empty-state" style="min-height:220px"><img src="${img}" alt="empty"/><div class="txt">上传截图以识别数据</div></div>`;
    // Clear round number when there's no data to align with empty-state appearance
    if (roundNoEl) roundNoEl.textContent = '';
    // keep tip as-is (resetSession / other callers set roundTip when necessary)
    return;
  }

  roundSlots.innerHTML = '';
  for (let p=1;p<=4;p++){
    const e = round.find(x=>x.p===p) || { p, name:'', conflict:false, reason:'待识别', avatarUrl:'' };
    const div = document.createElement('div');
    div.className = 'slot' + (e.conflict? ' conflict' : '');
    const reasonText = e.reason || '';
    const safeReason = escapeHtml(reasonText);
    const copyable = e.conflict && reasonText;
    div.innerHTML = `
      <h4>${p}P</h4>
      <div style="display:flex; gap:10px; align-items:center;">
        ${e.avatarUrl? `<img class="avatar" src="${e.avatarUrl}" alt="${e.name}" />` : `<div class="avatar" style="display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.06);border:1px dashed rgba(255,255,255,0.2);color:#aaa;">无</div>`}
        <div>
          <div class="name">${e.name || '——'}</div>
          ${e.conflict? `<div class="conflict">⚠ <span class="reason-text">${safeReason}</span>${copyable? ` <button class="copy-reason" data-text="${escapeHtml(reasonText)}" title="复制" style="border:none;background:transparent;cursor:pointer;line-height:1;display:inline-flex;align-items:center;">`+
          `<svg class="icon" style="width: 1em;height: 1em;vertical-align: middle;fill: currentColor;overflow: hidden;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2282"><path d="M704 202.666667a96 96 0 0 1 96 96v554.666666a96 96 0 0 1-96 96H213.333333A96 96 0 0 1 117.333333 853.333333V298.666667A96 96 0 0 1 213.333333 202.666667h490.666667z m0 64H213.333333A32 32 0 0 0 181.333333 298.666667v554.666666a32 32 0 0 0 32 32h490.666667a32 32 0 0 0 32-32V298.666667a32 32 0 0 0-32-32z" fill="#FFFFFF" p-id="2283"></path><path d="M277.333333 362.666667m32 0l298.666667 0q32 0 32 32l0 0q0 32-32 32l-298.666667 0q-32 0-32-32l0 0q0-32 32-32Z" fill="#FFFFFF" p-id="2284"></path><path d="M277.333333 512m32 0l298.666667 0q32 0 32 32l0 0q0 32-32 32l-298.666667 0q-32 0-32-32l0 0q0-32 32-32Z" fill="#FFFFFF" p-id="2285"></path><path d="M277.333333 661.333333m32 0l170.666667 0q32 0 32 32l0 0q0 32-32 32l-170.666667 0q-32 0-32-32l0 0q0-32 32-32Z" fill="#FFFFFF" p-id="2286"></path><path d="M320 138.666667h512A32 32 0 0 1 864 170.666667v576a32 32 0 0 0 64 0V170.666667A96 96 0 0 0 832 74.666667H320a32 32 0 0 0 0 64z" fill="#FFFFFF" p-id="2287"></path></svg>`+
          `</button>` : ''}</div>`: ''}
          ${!e.name? `<div class="muted">${e.reason||''}</div>`: ''}
        </div>
      </div>
      <div class="actions">
        <button data-p="${p}" class="pickBtn" style="${(window.isManualMode && !e.name) ? 'display:none' : ''}">调整</button>
      </div>
    `;
    roundSlots.appendChild(div);
  }
  roundSlots.querySelectorAll('.pickBtn').forEach(btn=> btn.addEventListener('click', ()=> openPicker(parseInt(btn.dataset.p,10))));
  // 绑定复制按钮
  roundSlots.querySelectorAll('.copy-reason').forEach(btn => {
    btn.addEventListener('click', async ()=>{
      const t = btn.getAttribute('data-text') || '';
      const ok = await copyToClipboard(t);
      if (ok){
        const old = btn.innerHTML;
        // 切换为勾 SVG
        btn.innerHTML = '<svg class="icon" style="width: 1em;height: 1em;vertical-align: middle;fill: currentColor;overflow: hidden;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2607"><path d="M384 768c-12.8 0-21.333333-4.266667-29.866667-12.8l-213.333333-213.333333c-17.066667-17.066667-17.066667-42.666667 0-59.733334s42.666667-17.066667 59.733333 0L384 665.6 823.466667 226.133333c17.066667-17.066667 42.666667-17.066667 59.733333 0s17.066667 42.666667 0 59.733334l-469.333333 469.333333c-8.533333 8.533333-17.066667 12.8-29.866667 12.8z" fill="#FFFFFF" p-id="2608"></path></svg>';
        btn.setAttribute('title', '已复制');
        setTimeout(()=>{
          // 还原为复制 SVG
          btn.innerHTML = old;
          btn.setAttribute('title','复制');
        }, 1200);
      }
    });
  });
  roundTip.textContent = '';
  // Also refresh BP mode display
  updateBpModeText();
}

function renderRoundNo(){
  if (!roundNoEl) return;
  const n = rounds.length;
  // When there are no recorded rounds, keep the round number empty to match empty-state
  if (n <= 0) { roundNoEl.textContent = ''; return; }
  roundNoEl.textContent = `(第${n}轮)`;
}

const ELEMENTS = ['冰','火','水','雷','草','风','岩'];
const WEAPONS = ['单手剑','双手剑','长柄武器','弓','法器'];
let pickTargetP = null;
let pickContext = { roundIndex: null };
let activeEle = '';
let activeWpn = '';

function createFilterButtons(container, items, type, {size=40}={}){
  if (!container) return;
  container.innerHTML = '';
  items.forEach(label=>{
    const img = document.createElement('img');
    // base class first to avoid overwriting 'active' later
    img.className = 'filter-button';
    if (type==='ele'){
      img.src = getElementSvgUrl(label);
      img.alt = label;
      img.title = label;
      const isActive = (container===eleFilters && activeEle===label);
      if (isActive) img.classList.add('active');
    } else {
      // 武器图标外链
      const mapping = {
        '弓': 'https://upload-bbs.miyoushe.com/upload/2026/02/24/284249424/35a7e5bab7b2ee97d79e2cc055c2922f_6542701528289378136.png',
        '长柄武器': 'https://upload-bbs.miyoushe.com/upload/2026/02/24/284249424/6853501f9aa3bf01a16ff734b654678a_2633346180400109686.png',
        '法器': 'https://upload-bbs.miyoushe.com/upload/2026/02/24/284249424/fd7eb2eb48680aa9b1042296e8c99c96_2921164432939280308.png',
        '双手剑': 'https://upload-bbs.miyoushe.com/upload/2026/02/24/284249424/883b0e3e3746d86f89754308954f2187_8860028975768290912.png',
        '单手剑': 'https://upload-bbs.miyoushe.com/upload/2026/02/24/284249424/d184c1947787d8106d3d9e4409f068f5_267450943913260561.png'
      };
      img.src = mapping[label];
      img.alt = label; img.title = label;
      const isActive = (container===wpnFilters && activeWpn===label);
      if (isActive) img.classList.add('active');
    }
    img.style.width = `${size}px`; img.style.height = `${size}px`;
    img.dataset[type] = label;
    img.addEventListener('click', ()=>{
      // 点击切换选中；并清空对应的搜索框
      if (container===eleFilters){
        const searchTerm = (searchInput.value||'').trim();
        if (searchTerm) { searchInput.value=''; }
        activeEle = (activeEle===label? '' : label);
        createAllFiltersUI();
        renderPickerGrid();
      } else if (container===wpnFilters){
        const searchTerm = (searchInput.value||'').trim();
        if (searchTerm) { searchInput.value=''; }
        activeWpn = (activeWpn===label? '' : label);
        createAllFiltersUI();
        renderPickerGrid();
      }
    });
    container.appendChild(img);
  });
}

function createAllFiltersUI(){
  // 放大筛选按钮尺寸：弹窗 48px，图鉴 40px
  createFilterButtons(eleFilters, ELEMENTS, 'ele', {size:36});
  createFilterButtons(wpnFilters, WEAPONS, 'wpn', {size:36});
}
createAllFiltersUI();

function openPicker(p){
  pickTargetP = p; pickContext.roundIndex = null;
  // 确保选择器总在最上层，同时避免下层编辑弹窗拦截事件
  if (picker) picker.style.zIndex = '10000';
  if (roundEditModal) roundEditModal.style.pointerEvents = 'none';
  showModal(picker);
  renderPickerGrid();
}
// 扩展：用于指定编辑某一轮
function openPickerForRound(p, roundIndex){
  pickTargetP = p; pickContext.roundIndex = parseInt(roundIndex,10);
  if (picker) picker.style.zIndex = '10000';
  if (roundEditModal) roundEditModal.style.pointerEvents = 'none';
  showModal(picker);
  renderPickerGrid();
}

let isMultiSelectMode = false;
let multiSelectCallback = null;
let multiSelectedItems = [];

let manualSlotsState = [null, null, null, null];
let activeManualSlotIndex = 0;

const manualSlotsGrid = document.getElementById('manualSlotsGrid');
if (manualSlotsGrid) {
    manualSlotsGrid.addEventListener('click', (e) => {
        const slot = e.target.closest('.manual-slot');
        if (slot) {
            const idx = parseInt(slot.dataset.slotIndex);
            if (!isNaN(idx)) {
                activeManualSlotIndex = idx;
                renderManualSlots();
            }
        }
    });
}

function renderManualSlots() {
    const slots = document.querySelectorAll('.manual-slot');
    slots.forEach((slot, idx) => {
        const state = manualSlotsState[idx];
        const content = slot.querySelector('.slot-content');
        
        if (idx === activeManualSlotIndex) {
            slot.classList.add('active');
        } else {
            slot.classList.remove('active');
        }
        
        if (state && state.name) {
            const info = window.characterData?.[state.name];
            if (info) {
                content.innerHTML = `<img src="${info['头像']||''}" alt="${state.name}">`;
            } else {
                content.textContent = state.name;
            }
            slot.classList.remove('empty');
        } else {
            content.innerHTML = '';
            slot.classList.add('empty');
        }
    });
}

window.openPickerMultiSelect = function(initialNames, callback) {
  isMultiSelectMode = true;
  multiSelectCallback = callback;
  
  manualSlotsState = [null, null, null, null];
  if (Array.isArray(initialNames)) {
      for(let i=0; i<4; i++) {
          if (initialNames[i]) {
              manualSlotsState[i] = { name: initialNames[i] };
          }
      }
  }
  
  // Find first empty slot
  activeManualSlotIndex = 0;
  for(let i=0; i<4; i++) {
      if (!manualSlotsState[i]) {
          activeManualSlotIndex = i;
          break;
      }
  }
  
  pickTargetP = null;
  pickContext.roundIndex = null;
  
  if (picker) {
    picker.style.zIndex = '10000';
    picker.classList.add('manual-multi-select-mode');
  }
  if (roundEditModal) roundEditModal.style.pointerEvents = 'none';
  
  // Setup Confirm Button
  const confirmBtn = document.getElementById('manualMultiConfirmBtn');
  if (confirmBtn) {
      // Remove old listeners to avoid duplicates (cloning is a simple way)
      const newBtn = confirmBtn.cloneNode(true);
      confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
      
      newBtn.addEventListener('click', () => {
          const currentNames = manualSlotsState.map(s => s ? s.name : '');
          if (multiSelectCallback) multiSelectCallback(currentNames);
          closePickerAndRestore();
      });
  }
  
  renderManualSlots();
  showModal(picker);
  renderPickerGrid();
};

function closePickerAndRestore(){
  hideModal(picker);
  if (picker) picker.classList.remove('manual-multi-select-mode');
  if (roundEditModal) roundEditModal.style.pointerEvents = '';
  isMultiSelectMode = false;
  multiSelectCallback = null;
  multiSelectedItems = [];
}
closePicker.addEventListener('click', closePickerAndRestore);
closePickerX?.addEventListener('click', closePickerAndRestore);
picker.addEventListener('click', (e)=> { if (e.target===picker) closePickerAndRestore(); });
searchInput.addEventListener('input', ()=>{
  // 输入时清空筛选
  if ((searchInput.value||'').trim()!==''){
    activeEle=''; activeWpn=''; createAllFiltersUI();
  }
  renderPickerGrid();
});

function escapeRegExp(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function matchPinyinInitials(name, searchTerm, pinyinFunc){
  if (!pinyinFunc) return { match:false, matchedPositions:[] };
  const lowerTerm = (searchTerm||'').toLowerCase();
  const { initialsMatrix } = getAllPossibleInitials(name, lowerTerm, pinyinFunc);
  const matchedPositions = [];
  const match = initialsMatrix.some(initials => {
    const combinedInitials = initials.join('');
    const startIndex = combinedInitials.indexOf(lowerTerm);
    if (startIndex !== -1){
      for (let i=0; i<lowerTerm.length; i++) matchedPositions.push(startIndex + i);
      return true;
    }
    return false;
  });
  return { match, matchedPositions };
}
// 生成名字中每个字符可能的首字母组合矩阵
function getAllPossibleInitials(name, searchTerm, pinyinFunc){
  const perCharInitialOptions = [];
  const isChinese = ch => /[\u4e00-\u9fff]/.test(ch);
  for (let i=0;i<name.length;i++){
    const ch = name[i];
    let initials = [];
    try {
      if (isChinese(ch)) {
        // multiple:true 返回多音字所有读音；使用 type:'array' 便于遍历
        let pys = pinyinFunc(ch, {multiple:true, toneType:'none', type:'array'});
        if (!Array.isArray(pys)) pys = [pys].filter(Boolean);
        initials = Array.from(new Set(
          pys.filter(Boolean).map(p=> (p[0]||'').toLowerCase()).filter(Boolean)
        ));
      } else {
        const c = ch.toLowerCase();
        if (/^[a-z]$/.test(c)) initials = [c];
        else initials = [c]; // 非字母也占位，保持长度一致
      }
    } catch {
      initials = [ch.toLowerCase()];
    }
    if (!initials.length) initials = [ch.toLowerCase()];
    perCharInitialOptions.push(initials);
  }
  const initialsMatrix = generateInitialsMatrix(perCharInitialOptions);
  return { initialsMatrix };
}

function generateInitialsMatrix(list){
  // list: [ ['d','t'], ['y'], ['l','n'] ] => 笛卡尔积 => 每个元素是一条首字母序列
  let acc = [[]];
  for (const opts of list){
    const next = [];
    for (const seq of acc){
      for (const o of opts){
        next.push(seq.concat(o));
      }
    }
    acc = next;
  }
  return acc;
}

function matchAndHighlight(name, term){
  // 移除输入法可能产生的单引号
  const lowerTerm = (term||'').replace(/'/g, '').toLowerCase();
  if (!lowerTerm) return { match:true, html: escapeHtml(name) };
  // 1) 中文直匹配
  if (name.toLowerCase().includes(lowerTerm)){
    const reg = new RegExp(escapeRegExp(lowerTerm), 'gi');
    const html = escapeHtml(name).replace(reg, m=>`<span class="hl">${escapeHtml(m)}</span>`);
    return { match:true, html };
  }
  // 2) 拼音匹配
  try{
    const pinyin = window.pinyinPro?.pinyin;
    if (typeof pinyin==='function'){
      const r = matchPinyinInitials(name, lowerTerm, pinyin);
      if (r.match){
        // 逐字高亮（仅高亮命中的字符）
        let html = '';
        for (let i=0;i<name.length;i++){
          if (r.matchedPositions.includes(i)) html += `<span class="hl">${escapeHtml(name[i])}</span>`;
          else html += escapeHtml(name[i]);
        }
        return { match:true, html };
      }
    }
  }catch{}
  return { match:false, html: escapeHtml(name) };
}

function renderPickerGrid(skipAnimation = false){
  const data = window.characterData || {};
  const entries = Object.entries(data);
  pickerGrid.innerHTML = '';
  const frag = document.createDocumentFragment();
  let idx = 0;
  for (const [name, info] of entries){
    if (activeEle && info['元素类型']!==activeEle) continue;
    if (activeWpn && info['武器类型']!==activeWpn) continue;
    const term = (searchInput.value||'').trim();
    const { match, html } = matchAndHighlight(name, term);
    if (!match) continue;
    const card = document.createElement('div');
    card.className = skipAnimation ? 'cardc' : 'cardc stagger-in';
    if (!skipAnimation) card.style.animationDelay = `${idx * 0.01}s`;
    card.innerHTML = `<img src="${info['头像']||''}" alt="${name}"><div class="nm">${html}</div>`;
    
    if (isMultiSelectMode) {
      const pIdx = manualSlotsState.findIndex(s => s && s.name === name);
      if (pIdx !== -1) {
        card.classList.add('selected');
        const badge = document.createElement('div');
        badge.className = 'bp-badge';
        badge.textContent = (pIdx + 1) + 'P';
        card.appendChild(badge);
      }
    }

    card.addEventListener('click', ()=> {
      if (isMultiSelectMode) {
        // Update current slot
        manualSlotsState[activeManualSlotIndex] = { name: name };
        
        // Auto-advance
        activeManualSlotIndex = (activeManualSlotIndex + 1) % 4;
        
        renderManualSlots();
        renderPickerGrid(true); // Skip animation on update
        
        // Removed auto-close and live callback. Now using Confirm button.
        
      } else {
        if (pickContext.roundIndex===null){ applyManual(pickTargetP, name); }
        else { applyManualForRound(pickContext.roundIndex, pickTargetP, name); }
        closePickerAndRestore();
      }
    });
    frag.appendChild(card);
    idx++;
  }
  pickerGrid.appendChild(frag);
}

function aggregateUsedBy(excludeLast=false){
  const sets = {1:new Set(),2:new Set(),3:new Set(),4:new Set()};
  const end = rounds.length - (excludeLast? 1 : 0);
  for (let idx=0; idx<end; idx++){
    const r = rounds[idx];
    if (r && r.ignoreBp) continue; // 忽略本轮 BP 的轮次不计入
    for (const e of (r.entries||[])){
      if (!e || !e.name || !e.p) continue;
      const cutoff = (clearedBefore[e.name] ?? -1);
      if (idx <= cutoff) continue;
      sets[e.p].add(e.name);
    }
  }
  return sets;
}

function rebuildUsageSetsFromRounds(){
  // 重建 usedBy 与 usedGlobal 与 rounds 对齐
  usedBy = aggregateUsedBy(false);
  usedGlobal = new Set();
  const isGlobalMode = (typeof bpMode === 'string' && bpMode === 'global') || (typeof bpMode === 'object');
  if (isGlobalMode) {
    for (const p of [1, 2, 3, 4]) {
      for (const nm of usedBy[p]) {
        const character = window.characterData[nm];
        const rarity = character ? (character['星级'] === '五星' ? 'fiveStar' : 'fourStar') : null;
        const currentBpMode = typeof bpMode === 'object' ? (rarity ? bpMode[rarity] : 'off') : bpMode;
        if (currentBpMode === 'global') {
          usedGlobal.add(nm);
        }
      }
    }
  }
}

function applyManual(p, name){
  const selNameNorm = normalizeName(name);
  // 1) 读取当前面板的四个名并应用手动修改
  const currentNames = [];
  for (let i=1;i<=4;i++){
    const slot = roundSlots.children[i-1];
    const nmText = (slot?.querySelector('.name')?.textContent||'').trim();
    const nmRaw = (i===p? selNameNorm : (nmText===''||nmText==='——'? '' : nmText));
    const nm = normalizeName(nmRaw);
    currentNames.push({ p:i, name:nm });
  }

  // 2) 写入历史：若已有当轮，更新最后一轮；否则创建新一轮
  if (rounds.length===0){
    rounds.push({ at:new Date().toISOString(), entries: currentNames.map(e=>({ p:e.p, name: normalizeName(e.name), from:(e.p===p?'manual':'auto') })) });
  } else {
    const last = rounds[rounds.length-1];
    const newEntries = (last.entries||[]).slice();
    // 确保长度为4
    for (let i=1;i<=4;i++){
      const prev = newEntries.find(x=>x.p===i) || { p:i, name:'' };
      const nm = normalizeName(currentNames[i-1].name);
      newEntries[i-1] = { p:i, name:nm, from:(i===p?'manual':(prev.from||'auto')) };
    }
    last.entries = newEntries;
  }

  // 3) 基于“之前轮次”计算冲突（不含当前轮）
  const priorUsedBy = aggregateUsedBy(true);
  const usedAnyPrev = new Set([...priorUsedBy[1], ...priorUsedBy[2], ...priorUsedBy[3], ...priorUsedBy[4]]);
  const validated = currentNames.map(e=>{
    const nm = normalizeName(e.name);
    const avatarUrl = nm ? (window.characterData[nm]?.头像 || '') : '';
    if (!nm) return { p: e.p, name: '', avatarUrl: '', from: (e.p === p ? 'manual' : 'auto'), conflict: false, reason: '未选择', editable: true };

    const character = window.characterData[nm];
    const rarity = character ? (character['星级'] === '五星' ? 'fiveStar' : 'fourStar') : null;
    const currentBpMode = typeof bpMode === 'object' ? (rarity ? bpMode[rarity] : 'off') : bpMode;

    let conflict = false;
    let reason = '';

    if (currentBpMode !== 'off') {
      conflict = (currentBpMode === 'personal') ? priorUsedBy[e.p].has(nm) : usedAnyPrev.has(nm);
      if (conflict) {
        if (currentBpMode === 'personal') {
          const info = getLastUsageInfoUntil(nm, rounds.length - 1);
          if (info) {
            reason = `在第${info.round}轮 ${e.p}P 已使用过 ${nm}`;
          } else {
            reason = `${e.p}P 已使用过 ${nm}`;
          }
        } else {
          const info = getLastUsageInfo(nm, true);
          if (info) {
            const psTxt = info.ps.map(x => `${x}P`).join(' / ');
            reason = `${nm} 在第${info.round}轮已被 ${psTxt} 使用`;
          } else {
            reason = `${nm} 已被使用（全局BP）`;
          }
        }
      }
    }
    return { p:e.p, name:nm, avatarUrl, from:(e.p===p?'manual':'auto'), conflict, reason, editable:true };
  });

  // 4) 重建 usedBy（用于图鉴展示），并刷新 UI：本轮面板、图鉴、历史
  rebuildUsageSetsFromRounds();
  renderRoundPanel(validated);
  renderCatalog();
  if (document.getElementById('historySection')?.style.display==='block') renderHistory();
  saveSessionToCache();
}

// （已在文件顶部初始化时调用 resetSession(true)）

// 渲染角色图鉴
function buildUsageByName(){
  const map = new Map(); // name -> Set of P
  for (const r of rounds){
    for (const e of (r.entries||[])){
      if (!e || !e.name) continue;
      if (!map.has(e.name)) map.set(e.name, new Set());
      if (e.p) map.get(e.name).add(e.p);
    }
  }
  return map;
}

// 返回按 BP 统计维度计算的使用者（考虑 clearedBefore 截止）
function getUsedPsForBP(name){
  const cutoff = (clearedBefore[name] ?? -1);
  const ps = new Set();
  for (let idx=0; idx<rounds.length; idx++){
    const r = rounds[idx];
    if (r && r.ignoreBp) continue; // 忽略本轮 BP
    if (idx <= cutoff) continue;
    for (const e of (r.entries||[])){
      if (e && e.name===name && e.p) ps.add(e.p);
    }
  }
  return Array.from(ps).sort((a,b)=>a-b);
}

// 获取最近一次（不含被清除前的）使用信息：返回 { round: 最近轮次号(1-based), ps: [P...] }
function getLastUsageInfo(name, excludeLast=false){
  if (!name) return null;
  const cutoff = (clearedBefore[name] ?? -1);
  const end = rounds.length - (excludeLast? 1 : 0);
  for (let idx = end - 1; idx >= 0; idx--){
    const r = rounds[idx];
    if (r && r.ignoreBp) continue; // 忽略本轮 BP
    if (idx <= cutoff) break;
    const ps = [];
    for (const e of (r.entries||[])){
      if (e && e.name===name && e.p) ps.push(e.p);
    }
    if (ps.length){
      return { round: idx + 1, ps: ps.sort((a,b)=>a-b) };
    }
  }
  return null;
}

// ========== 历史编辑：弹窗与逻辑 ==========
let tempRoundEditData = null;

function aggregateUsedByUntil(endExclusive){
  const sets = {1:new Set(),2:new Set(),3:new Set(),4:new Set()};
  const end = Math.max(0, Math.min(endExclusive, rounds.length));
  for (let idx=0; idx<end; idx++){
    const r = rounds[idx];
    if (!r || r.ignoreBp) continue;
    for (const e of (r.entries||[])){
      if (!e || !e.name || !e.p) continue;
      const nm = normalizeName(e.name||'');
      if (!nm) continue;
      const cutoff = (clearedBefore[e.name] ?? -1);
      if (idx <= cutoff) continue;
      sets[e.p].add(nm);
    }
  }
  return sets;
}

function getLastUsageInfoUntil(name, endExclusive){
  if (!name) return null;
  const cutoff = (clearedBefore[name] ?? -1);
  const end = Math.max(0, Math.min(endExclusive, rounds.length));
  for (let idx=end-1; idx>=0; idx--){
    if (idx <= cutoff) break;
    const r = rounds[idx];
    if (!r || r.ignoreBp) continue;
    const ps = [];
    for (const e of (r.entries||[])){
      if (e && e.name===name && e.p) ps.push(e.p);
    }
    if (ps.length) return { round: idx+1, ps: ps.sort((a,b)=>a-b) };
  }
  return null;
}

function computeRoundDisplayForIndex(index, roundDataOverride){
  const r = roundDataOverride || rounds[index] || { entries: [] };
  const names = {1:'',2:'',3:'',4:''};
  (r.entries||[]).forEach(e=>{ if (e && e.p) names[e.p] = normalizeName(e.name||''); });
  const priorUsedBy = aggregateUsedByUntil(index);
  const usedAnyPrev = new Set([...priorUsedBy[1], ...priorUsedBy[2], ...priorUsedBy[3], ...priorUsedBy[4]]);
  const arr = [];
  for (let p=1;p<=4;p++){
    const nm = names[p] || '';
    const avatarUrl = nm ? (window.characterData[nm]?.头像 || '') : '';
    if (!nm){ arr.push({ p, name:'', avatarUrl:'', conflict:false, reason:'待设置', from:'manual', editable:true }); continue; }
    const character = window.characterData[nm];
    const rarity = character ? (character['星级'] === '五星' ? 'fiveStar' : 'fourStar') : null;
    const currentBpMode = typeof bpMode === 'object' ? (rarity ? bpMode[rarity] : 'off') : bpMode;
    let conflict = false, reason='';
    if (currentBpMode !== 'off'){
      conflict = (currentBpMode === 'personal') ? priorUsedBy[p].has(nm) : usedAnyPrev.has(nm);
      if (conflict){
        if (currentBpMode === 'personal') reason = `${p}P 已使用过 ${nm}`;
        else {
          const info = getLastUsageInfoUntil(nm, index);
          if (info){ const psTxt = info.ps.map(x=>`${x}P`).join(' / '); reason = `${nm} 在第${info.round}轮已被 ${psTxt} 使用`; }
          else reason = `${nm} 已被使用（全局BP）`;
        }
      }
    }
    arr.push({ p, name:nm, avatarUrl, conflict, reason, from:'manual', editable:true });
  }
  return arr;
}

function renderRoundEditPanel(index){
  if (!roundEditSlotsEl) return;
  const data = tempRoundEditData || rounds[index];
  const roundDisp = computeRoundDisplayForIndex(index, data);
  roundEditSlotsEl.innerHTML = '';
  for (let p=1;p<=4;p++){
    const e = roundDisp.find(x=>x.p===p) || { p, name:'', conflict:false, reason:'待设置', avatarUrl:'' };
    const div = document.createElement('div');
    div.className = 'slot' + (e.conflict? ' conflict' : '');
    const safeReason = escapeHtml(e.reason||'');
    div.innerHTML = `
      <h4>${p}P</h4>
      <div style="display:flex; gap:10px; align-items:center;">
        ${e.avatarUrl? `<img class=\"avatar\" src=\"${e.avatarUrl}\" alt=\"${e.name}\" />` : `<div class=\"avatar\" style=\"display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.06);border:1px dashed rgba(255,255,255,0.2);color:#aaa;\">无</div>`}
        <div>
          <div class=\"name\">${e.name || '——'}</div>
          ${e.conflict? `<div class=\"conflict\">⚠ <span class=\"reason-text\">${safeReason}</span></div>`: ''}
          ${!e.name? `<div class=\"muted\">${e.reason||''}</div>`: ''}
        </div>
      </div>
      <div class=\"actions\">
        <button data-p=\"${p}\" class=\"pickBtn\">调整</button>
      </div>
    `;
    roundEditSlotsEl.appendChild(div);
  }
  roundEditSlotsEl.querySelectorAll('.pickBtn').forEach(btn=> btn.addEventListener('click', ()=>{
    const p = parseInt(btn.dataset.p,10);
    openPickerForRound(p, index);
  }));
}

function openRoundEditModal(index){
  currentRoundEditIndex = index;
  tempRoundEditData = JSON.parse(JSON.stringify(rounds[index]));
  if (roundEditTitle) roundEditTitle.textContent = `编辑 第${index+1}轮`;
  try{
    if (ignoreRoundBpToggle) ignoreRoundBpToggle.checked = !!(tempRoundEditData?.ignoreBp);
  }catch{}
  renderRoundEditPanel(index);
  try{ updateReidentifyBtnText(); }catch{}
  showModal(roundEditModal);
}

ignoreRoundBpToggle?.addEventListener('change', ()=>{
  if (currentRoundEditIndex===null || !tempRoundEditData) return;
  tempRoundEditData.ignoreBp = !!ignoreRoundBpToggle.checked;
  // Don't save yet
});

// 封装重识别流程，便于复用不同来源（选择/粘贴/截取）
async function reidentifyFromFile(file){
  if (!file || currentRoundEditIndex===null) return;
  try{
    showLoading(true);
    const img = await fileToImage(file);
    const origW = img.naturalWidth;
    const origH = img.naturalHeight;
    const cropX = origW * 0.8;
    const cropY = origH * 0.25;
    const cropW = origW * 0.2;
    const cropH = origH * 0.5;

    const canvas = document.createElement('canvas');
    canvas.width = cropW;
    canvas.height = cropH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    
    const croppedBlob = await new Promise(res => canvas.toBlob(res, 'image/png'));
    window._lastDebugImage = croppedBlob;

    const fd = new FormData();
    fd.append('file', croppedBlob, 'cropped.png');
    fd.append('mode', 'team');
    fd.append('origW', origW);
    fd.append('origH', origH);

    const res = await fetch('https://picksnap.unhappycar.xyz:8080/api/classify', { method: 'POST', body: fd });
    const json = await res.json();
    try{ window._lastModelResponse = json; }catch(e){}
    const mapped = mapResultsToP(json);
    const newEntries = [];
    for (let p=1;p<=4;p++){
      const rr = mapped[p];
      if (!rr || !rr.success){ newEntries.push({ p, name:'', from:'auto', confidence: rr?.confidence ?? 0 }); }
      else {
        const nm = normalizeName(rr.nameCn || rr.display || rr.predicted || '');
        newEntries.push({ p, name:nm, from:'auto', confidence: rr.confidence });
      }
    }
    if (!tempRoundEditData) tempRoundEditData = { at:new Date().toISOString(), entries:newEntries };
    else tempRoundEditData.entries = newEntries;
    
    renderRoundEditPanel(currentRoundEditIndex);
    showLoadingSuccess();
  }catch(e){
    showAlert('重新识别失败：' + e);
    showLoading(false);
  }finally{
    try{ reidentifyFile.value=''; }catch{}
  }
}

// 历史重识别按钮：跟随主操作选择（选择/粘贴/截取）
reidentifyUploadBtn?.addEventListener('click', async ()=>{
  if (!window.isManualMode && !canRunRecognition()) {
    const hint = document.getElementById('onboardingIncompleteHint');
    if (hint) hint.style.display = 'block';
    openOnboarding();
    return;
  }
  const mode = getSavedPanelAction();
  if (mode === 'select'){ reidentifyFile?.click(); return; }
  if (mode === 'paste'){
    const f = await getClipboardImage();
    if (!f){ showAlert('无法读取剪贴板图像，请先复制图片后再试。'); return; }
    await reidentifyFromFile(f); return;
  }
  if (mode === 'capture'){
    const f = await captureWindowOnce();
    if (!f) return;
    await reidentifyFromFile(f); return;
  }
});

// 选择文件（input）路径保持不变
reidentifyFile?.addEventListener('change', async ()=>{
  const f = reidentifyFile.files?.[0];
  if (!f) return; await reidentifyFromFile(f);
});

function applyManualForRound(index, p, name){
  const selNameNorm = normalizeName(name);
  const r = tempRoundEditData || rounds[index] || { entries: [{p:1,name:''},{p:2,name:''},{p:3,name:''},{p:4,name:''}] };
  const currentNames = {1:'',2:'',3:'',4:''};
  (r.entries||[]).forEach(e=>{ if (e && e.p) currentNames[e.p] = normalizeName(e.name||''); });
  currentNames[p] = selNameNorm;
  const newEntries = [];
  for (let i=1;i<=4;i++){
    const prev = (r.entries||[]).find(x=>x.p===i) || { p:i, name:'' };
    const nm = normalizeName(currentNames[i] || '');
    newEntries.push({ p:i, name:nm, from:(i===p?'manual':(prev.from||'auto')) });
  }
  if (!tempRoundEditData) tempRoundEditData = { at:new Date().toISOString(), entries:newEntries };
  else tempRoundEditData.entries = newEntries;
  
  renderRoundEditPanel(index);
}

function updateCatalogFilterLabel(filteredCount, totalCount) {
  if (catalogFilterLabelElement) {
    catalogFilterLabelElement.textContent = `筛选标签 (${filteredCount}/${totalCount})`;
  }
}

function renderCatalog(){
  const skipAnimation = catalogSkipNextAnimation;
  catalogSkipNextAnimation = false;
  const data = window.characterData || {};
  const entries = Object.entries(data);

  // Sort entries: used characters first
  entries.sort(([nameA], [nameB]) => {
    const usedA = getUsedPsForBP(nameA).length > 0;
    const usedB = getUsedPsForBP(nameB).length > 0;
    if (usedA && !usedB) return -1;
    if (!usedA && usedB) return 1;
    return 0;
  });

  const layoutSpacer = document.getElementById('layoutSpacer');
  const startScrollHeight = document.documentElement.scrollHeight;
  const startWrapper = document.getElementById('viewsWrapper');
  const startWrapperHeight = startWrapper ? startWrapper.offsetHeight : null;

  catalogGrid.innerHTML = '';
  const frag = document.createDocumentFragment();
  let idx = 0;
  for (const [name, info] of entries){
    if (!matchCatalogByTags(name, info)) continue;
    const term = (catalogSearchInput?.value||'').trim();
    const effectiveTerm = term && term[0] !== '[' ? term : '';
    const { match, html } = matchAndHighlight(name, effectiveTerm);
    if (!match && effectiveTerm) continue;
    const div = document.createElement('div');
    if (skipAnimation){
      div.className = 'citem';
    } else {
      div.className = 'citem stagger-in';
      div.style.animationDelay = `${idx * 0.012}s`;
    }
    // base content
    div.innerHTML = `<img src="${info['头像']||''}" alt="${name}"><div class="nm">${html}</div>`;

    const usedPs = getUsedPsForBP(name);
    const character = window.characterData[name];
    const rarity = character ? (character['星级'] === '五星' ? 'fiveStar' : 'fourStar') : null;
    const currentBpMode = typeof bpMode === 'object' ? (rarity ? bpMode[rarity] : 'off') : bpMode;
    // If BP is turned off for this rarity and there are used P slots, mark with special class
    if (currentBpMode === 'off' && usedPs.length > 0) {
      div.classList.add('used-bp-off');
    }

    if (currentBpMode === 'global' && usedPs.length > 0) {
      div.classList.add('used-global');
      const badge = document.createElement('div');
      badge.className = 'bp-badge';
      badge.textContent = usedPs.map(p => `${p}P`).join(' / ');
      div.appendChild(badge);
    } else if (currentBpMode === 'personal' && usedPs.length > 0) {
      usedPs.forEach(p => {
        const corner = document.createElement('div');
        corner.className = `corner p${p}`;
        const label = document.createElement('span');
        label.className = 'corner-label';
        label.textContent = `${p}P`;
        corner.appendChild(label);
        div.appendChild(corner);
      });
      // 如果四个 P 都使用过，整体灰化（与全局BP一致）
      if (usedPs.length === 4) {
        div.classList.add('used-personal-all');
      } else {
        // 任意一个人使用则浅蓝边框
        div.classList.add('used-personal-some');
      }
    }

    div.addEventListener('click', ()=> openRoleDetail(name));
    frag.appendChild(div);
    idx++;
  }
  catalogGrid.appendChild(frag);

  // 图鉴筛选时也保持整体视图高度，避免页面突然下跳
  if (startWrapper && layoutSpacer) {
    // 先重置 wrapper 的显式高度，仅保留必要的 min-height 控制
    startWrapper.style.height = '';

    // 重置 spacer 以获取真实内容高度
    layoutSpacer.style.height = '0px';
    const newScrollHeight = document.documentElement.scrollHeight;

    if (newScrollHeight < startScrollHeight) {
      const delta = startScrollHeight - newScrollHeight;
      layoutSpacer.style.height = delta + 'px';

      // 单向门：当用户滚回内容区域时自动移除 spacer
      const localHandler = () => {
        const spacerH = layoutSpacer.offsetHeight;
        if (spacerH <= 0) {
          window.removeEventListener('scroll', localHandler);
          return;
        }
        const currentDocHeight = document.documentElement.scrollHeight;
        const realContentHeight = currentDocHeight - spacerH;
        const maxScrollWithoutSpacer = Math.max(0, realContentHeight - window.innerHeight);
        if (window.scrollY <= maxScrollWithoutSpacer + 5) {
          layoutSpacer.style.height = '0px';
          window.removeEventListener('scroll', localHandler);
        }
      };
      window.addEventListener('scroll', localHandler);
      // 立即检查一次，避免已经在顶部时 spacer 残留
      localHandler();
    }
  }
  
  // Update the filter label with character counts
  updateCatalogFilterLabel(idx, entries.length);
}
if (catalogGrid) renderCatalog();
ensureCatalogTagMenu();
renderCatalogSearchChips();

function matchCatalogByTags(name, info){
  if (!activeFilterTags.length) return true;
  const groups = ['element','weapon','rarity','body','nation','usage','ownership'];

  // 排除模式：任一选中标签命中即排除
  if (catalogTagFilterMode === 'exclude'){
    let matched = false;
    for (const g of groups){
      const tags = activeFilterTags.filter(t=>t.group===g);
      if (!tags.length) continue;
      if (g === 'usage'){
        const used = getUsedPsForBP(name).length > 0;
        const val = used ? '已使用' : '未使用';
        if (tags.some(t=>t.value === val)){
          matched = true;
          break;
        }
      } else if (g === 'ownership'){
        const owned = isCharacterOwned(name);
        const val = owned ? '拥有' : '未拥有';
        if (tags.some(t=>t.value === val)){
          matched = true;
          break;
        }
      } else {
        let value = '';
        if (g==='element') value = info['元素类型']||'';
        else if (g==='weapon') value = info['武器类型']||'';
        else if (g==='rarity') value = info['星级']||'';
        else if (g==='body') value = info['体型']||'';
        else if (g==='nation') value = info['国家']||'';
        if (!value) continue;
        if (tags.some(t=>t.value===value)){
          matched = true;
          break;
        }
      }
    }
    return !matched;
  }

  // 全并集模式：任一选中标签命中即可
  if (catalogTagFilterMode === 'full-union'){
    let matched = false;
    for (const g of groups){
      const tags = activeFilterTags.filter(t=>t.group===g);
      if (!tags.length) continue;
      if (g === 'usage'){
        const used = getUsedPsForBP(name).length > 0;
        const val = used ? '已使用' : '未使用';
        if (tags.some(t=>t.value === val)){
          matched = true;
          break;
        }
      } else if (g === 'ownership'){
        const owned = isCharacterOwned(name);
        const val = owned ? '拥有' : '未拥有';
        if (tags.some(t=>t.value === val)){
          matched = true;
          break;
        }
      } else {
        let value = '';
        if (g==='element') value = info['元素类型']||'';
        else if (g==='weapon') value = info['武器类型']||'';
        else if (g==='rarity') value = info['星级']||'';
        else if (g==='body') value = info['体型']||'';
        else if (g==='nation') value = info['国家']||'';
        if (!value) continue;
        if (tags.some(t=>t.value===value)){
          matched = true;
          break;
        }
      }
    }
    return matched;
  }

  // 默认模式：相同类型并集，不同类型交集
  for (const g of groups){
    const tags = activeFilterTags.filter(t=>t.group===g);
    if (!tags.length) continue;
    if (g === 'usage'){
      const used = getUsedPsForBP(name).length > 0;
      const val = used ? '已使用' : '未使用';
      const ok = tags.some(t=>t.value === val);
      if (!ok) return false;
    } else if (g === 'ownership'){
      const owned = isCharacterOwned(name);
      const val = owned ? '拥有' : '未拥有';
      const ok = tags.some(t=>t.value === val);
      if (!ok) return false;
    } else {
      let value = '';
      if (g==='element') value = info['元素类型']||'';
      else if (g==='weapon') value = info['武器类型']||'';
      else if (g==='rarity') value = info['星级']||'';
      else if (g==='body') value = info['体型']||'';
      else if (g==='nation') value = info['国家']||'';
      if (!value) return false;
      const ok = tags.some(t=>t.value===value);
      if (!ok) return false;
    }
  }
  return true;
}

// Catalog search behavior: 输入文字时直接按名字搜索，并清空标签
catalogSearchInput?.addEventListener('input', ()=>{
  if (getCatalogSearchTerm()){
    activeFilterTags = [];
    syncCatalogTagChipUI();
  }
  renderCatalogSearchChips();
  renderCatalog();
});

catalogSearchInput?.addEventListener('focus', ()=>{
  ensureCatalogTagMenu();
  if (catalogTagMenu) catalogTagMenu.classList.add('open');
  syncCatalogSearchInputWithTags();
  renderCatalogSearchChips();
  // 保证图鉴区域高度至少比标签菜单高 30px，避免菜单遮挡列表
  try{
    if (catalogTagMenu && catalogContainer){
      const menuRect = catalogTagMenu.getBoundingClientRect();
      const controlsRect = document.getElementById('catalogControls')?.getBoundingClientRect();
      const menuHeight = menuRect.height || 0;
      const minExtra = 30;
      const targetMin = menuHeight ? (menuHeight + minExtra) : 260;
      const current = parseFloat(getComputedStyle(catalogContainer).minHeight) || 0;
      if (targetMin > current) catalogContainer.style.minHeight = targetMin + 'px';
    }
  }catch{}
});

const _focusCatalogSearchInput = ()=>{
  try{
    // focus after layout changes to ensure virtual keyboard opens on mobile
    requestAnimationFrame(()=>{
      try{ catalogSearchInput?.focus(); try{ catalogSearchInput?.select?.(); }catch{} }catch{}
    });
  }catch{ try{ catalogSearchInput?.focus(); }catch{} }
};

const _openCatalogTagMenuAndFocus = (e)=>{
  if (e) e.stopPropagation();
  ensureCatalogTagMenu();
  catalogTagMenu?.classList.add('open');
  // small delay / next frame to ensure menu DOM/CSS is applied before focusing (helps mobile keyboards)
  setTimeout(_focusCatalogSearchInput, 50);
};

catalogSearchInner?.addEventListener('click', _openCatalogTagMenuAndFocus);
// also listen for touchend to improve mobile responsiveness
catalogSearchInner?.addEventListener('touchend', (e)=>{ _openCatalogTagMenuAndFocus(e); }, { passive: true });

document.addEventListener('click', (e)=>{
  if (!catalogTagMenu || !catalogSearchInput) return;
  const target = e.target;
  if (catalogSearchInput.contains(target)) return;
  if (catalogTagMenu.contains(target)) return;
  catalogTagMenu.classList.remove('open');
});

function swapPlayerRecords(p1, p2){
  if (!Array.isArray(rounds) || !rounds.length) return false;
  rounds.forEach(r => {
    if (!r.entries) r.entries = [];
    for (let i=1; i<=4; i++){
      if (!r.entries.some(e => e?.p === i)) r.entries.push({ p:i, name:'', from:'auto' });
    }
    const entry1 = r.entries.find(e => e?.p === p1);
    const entry2 = r.entries.find(e => e?.p === p2);
    if (entry1 && entry2){
      const temp = { name: entry1.name || '', from: entry1.from || 'auto', confidence: entry1.confidence };
      entry1.name = entry2.name || '';
      entry1.from = entry2.from || 'auto';
      entry1.confidence = entry2.confidence;
      entry2.name = temp.name;
      entry2.from = temp.from;
      entry2.confidence = temp.confidence;
    }
  });
  rebuildUsageSetsFromRounds();
  renderCatalog();
  renderHistory();
  refreshCurrentPanelFromLastRound();
  saveSessionToCache();
  return true;
}

// 内嵌历史视图渲染
function renderHistory(){
  const host = document.getElementById('historyContent');
  if (!host) return;
  if (!rounds.length){
    const img = pickEmptyImage();
    host.innerHTML = `<div class="empty-state"><img src="${img}" alt="empty"/><div class="txt">暂无数据</div></div>`;
    return;
  }
  // const header = ['轮次','1P','2P','3P','4P'];
  let html = '<table class="history-table"><thead><tr><th><span class="header-action" data-action="round" style="cursor:pointer;text-decoration:underline;text-decoration-style:double;text-underline-offset:2px;">轮次</span>/<span class="header-action" data-action="player" style="cursor:pointer;text-decoration:underline;text-decoration-style:double;text-underline-offset:2px;">玩家</span></th><th>1P</th><th>2P</th><th>3P</th><th>4P</th></tr></thead><tbody>';
  rounds.forEach((r, idx)=>{
    let timeStr = '';
    if (r && r.at) {
      try {
        const d = new Date(r.at);
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        timeStr = `${hh}:${mm}`;
      } catch (e) {}
    }
    // 仅前面的轮次可编辑；当前轮在主界面调整
    if (idx < rounds.length - 1) {
      html += `<tr><td>
        <div class="history-round-cell">
          <span class="history-round-text">第${idx+1}轮</span>
          ${timeStr ? `<span class="history-time" style="display:block;color:var(--muted);font-size:10px;margin-top:2px;">${timeStr}</span>` : ''}
          ${r && r.ignoreBp ? '<span class="history-note" style="display:block;color:var(--muted);font-size:8px;line-height:1.25;margin-top:2px;">已忽略本轮BP</span>' : ''}
        </div>
      </td>`;
    } else {
      html += `<tr><td>
        <div class="history-round-cell">
          <span class="history-round-current">第${idx+1}轮</span>
          ${timeStr ? `<span class="history-time" style="display:block;color:var(--muted);font-size:10px;margin-top:2px;">${timeStr}</span>` : ''}
          ${r && r.ignoreBp ? '<span class="history-note" style="display:block;color:var(--muted);font-size:8px;line-height:1.25;margin-top:2px;">已忽略本轮BP</span>' : ''}
        </div>
      </td>`;
    }
    const names = {1:'',2:'',3:'',4:''};
    (r.entries||[]).forEach(e=>{ if (e && e.p) names[e.p] = e.name || ''; });
    const priorUsedSets = aggregateUsedByUntil(idx);
    
    for (let p=1; p<=4; p++) {
      const name = names[p];
      if (name && name !== '——') {
        const avatarUrl = (window.characterData && window.characterData[name]?.头像) || '';
        const normalizedName = normalizeName(name);
        const priorUsed = priorUsedSets?.[p];
        const isDup = normalizedName && priorUsed && priorUsed.has(normalizedName);
        const dupClass = isDup ? ' class="history-dup-cell"' : '';
        html += `<td${dupClass}>
                   <div class="history-cell-content">
                     ${avatarUrl ? `<img src="${avatarUrl}" class="history-avatar" alt="${escapeHtml(name)}">` : ''}
                     <span class="history-name">${escapeHtml(name)}</span>
                   </div>
                 </td>`;
      } else {
        html += `<td>——</td>`;
      }
    }
    html += '</tr>';
  });
  html += '</tbody></table>';
  host.innerHTML = html;
  
  host.querySelectorAll('.header-action').forEach(span => {
    span.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action === 'round') openHistoryRoundSelectModal();
      else if (action === 'player') openHistorySwapModal();
    });
  });
}

let currentViewMode = 'history';
let isViewAnimating = false;
let spacerCheckHandler = null;

function switchMainView(mode){
  if (mode === currentViewMode) {
    if (mode === 'history') renderHistory();
    else if (mode === 'random') renderRandomTools();
    else if (mode === 'overview') renderCatalog();
    const el = document.getElementById(mode + 'Section');
    if (el) el.style.display = 'block';
    return;
  }
  if (isViewAnimating) return;

  // Clear previous scroll handler if exists
  if (spacerCheckHandler) {
    window.removeEventListener('scroll', spacerCheckHandler);
    spacerCheckHandler = null;
  }

  const views = ['overview', 'history', 'random'];
  const oldIndex = views.indexOf(currentViewMode);
  const newIndex = views.indexOf(mode);
  
  const oldEl = document.getElementById(currentViewMode + 'Section');
  const newEl = document.getElementById(mode + 'Section');
  const wrapper = document.getElementById('viewsWrapper');
  
  if (!oldEl || !newEl || !wrapper) {
    currentViewMode = mode;
    return;
  }

  isViewAnimating = true;
  const switcher = document.getElementById('viewSwitcher');
  if (switcher) switcher.style.pointerEvents = 'none';

  // Prepare content
  if (mode === 'history') renderHistory();
  else if (mode === 'random') renderRandomTools();
  else if (mode === 'overview') renderCatalog();

  // Determine direction
  const direction = newIndex > oldIndex ? 'left' : 'right';
  
  // Record current scroll height before animation to maintain it later
  const layoutSpacer = document.getElementById('layoutSpacer');
  const startScrollHeight = document.documentElement.scrollHeight;
  
  // Set initial height to prevent collapse (use current wrapper height to support adaptive padding)
  const currentWrapperHeight = wrapper.offsetHeight;
  wrapper.style.height = currentWrapperHeight + 'px';
  
  // Prepare new element
  newEl.style.display = 'block';
  newEl.classList.remove('view-animating', 'slide-out-to-left', 'slide-out-to-right', 'slide-in-from-left', 'slide-in-from-right');
  oldEl.classList.remove('view-animating', 'slide-out-to-left', 'slide-out-to-right', 'slide-in-from-left', 'slide-in-from-right');

  // Force reflow
  void newEl.offsetWidth;
  
  // Animate height to new element's height (or keep current if larger, to prevent jump)
  const newHeight = newEl.offsetHeight;
  const targetHeight = Math.max(currentWrapperHeight, newHeight);
  wrapper.style.height = targetHeight + 'px';

  // Apply animation classes
  if (direction === 'left') {
    oldEl.classList.add('view-animating', 'slide-out-to-left');
    newEl.classList.add('view-active', 'slide-in-from-right');
  } else {
    oldEl.classList.add('view-animating', 'slide-out-to-right');
    newEl.classList.add('view-active', 'slide-in-from-left');
  }

  // Cleanup after animation
  const onEnd = (e) => {
    // Ignore bubbling events from children (e.g. stagger-in avatars)
    if (e && e.target !== oldEl) return;

    oldEl.removeEventListener('animationend', onEnd);
    oldEl.style.display = 'none';
    oldEl.classList.remove('view-animating', 'slide-out-to-left', 'slide-out-to-right');
    newEl.classList.remove('view-active', 'slide-in-from-left', 'slide-in-from-right');
    
    wrapper.style.height = ''; // Reset height to auto
    wrapper.style.minHeight = ''; // Clear any min-height
    
    // Adjust layout spacer to maintain previous page height if content shrunk
    if (layoutSpacer) {
      // Reset spacer first to measure actual content height
      layoutSpacer.style.height = '0px';
      const newScrollHeight = document.documentElement.scrollHeight;
      if (newScrollHeight < startScrollHeight) {
        layoutSpacer.style.height = (startScrollHeight - newScrollHeight) + 'px';
        
        // One-way door logic: remove spacer once user scrolls back to content area
        spacerCheckHandler = () => {
          const currentSpacerHeight = layoutSpacer.offsetHeight;
          if (currentSpacerHeight <= 0) {
            window.removeEventListener('scroll', spacerCheckHandler);
            spacerCheckHandler = null;
            return;
          }
          
          const currentDocHeight = document.documentElement.scrollHeight;
          const realContentHeight = currentDocHeight - currentSpacerHeight;
          // Calculate the maximum scroll position if the spacer were removed
          const maxScrollWithoutSpacer = Math.max(0, realContentHeight - window.innerHeight);
          
          // If current scroll position is within the bounds of the real content (plus small buffer),
          // it means we don't need the spacer anymore to support the viewport.
          if (window.scrollY <= maxScrollWithoutSpacer + 5) {
            layoutSpacer.style.height = '0px';
            window.removeEventListener('scroll', spacerCheckHandler);
            spacerCheckHandler = null;
          }
        };
        
        window.addEventListener('scroll', spacerCheckHandler);
        // Check immediately
        spacerCheckHandler();
      }
    }
    
    currentViewMode = mode;
    isViewAnimating = false;
    if (switcher) switcher.style.pointerEvents = '';
  };
  
  oldEl.addEventListener('animationend', onEnd);
  
  // Fallback if animation fails
  setTimeout(() => {
    if (isViewAnimating) onEnd();
  }, 400);
}

document.getElementById('viewSwitcher')?.addEventListener('change', (e)=>{
  const target = e.target;
  if (target && target.name==='viewmode') switchMainView(target.value);
});

// 初始默认停留在“历史记录”
(function ensureDefaultView(){
  try{
    const sw = document.getElementById('viewSwitcher');
    const checked = sw?.querySelector('input[name="viewmode"]:checked');
    const val = checked?.value || 'history';
    currentViewMode = val;
    
    // Hide others
    document.querySelectorAll('[data-view]').forEach(sec => {
        if (sec.id !== val + 'Section') sec.style.display = 'none';
    });
    
    const el = document.getElementById(val + 'Section');
    if (el) el.style.display = 'block';
    
    if (val === 'history') renderHistory();
    else if (val === 'random') renderRandomTools();
    else if (val === 'overview') renderCatalog();
  }catch{}
})();

// ===== 随机工具 =====
const LS_TOOLS_KEY = 'randomTools_v1';
const LS_TOOLS_BUILTINS_KEY = 'randomTools_builtins_v1';
// 随机数模板与预设 + 工具顺序
const LS_NUM_TEMPLATE_KEY = 'randomNumTemplate_v1';
const LS_NUM_PRESETS_KEY = 'randomNumPresets_v1';
const LS_NUM_SELECTED_PRESET_KEY = 'randomNumSelectedPreset_v1';
const LS_TOOLS_ORDER_KEY = 'randomToolsOrder_v2';
const ICONS = {
  del: '<svg class="icon" style="width:1em;height:1em;vertical-align:middle;fill:currentColor;overflow:hidden;" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M799.2 874.4c0 34.4-28.001 62.4-62.4 62.4H287.2c-34.4 0-62.4-28-62.4-62.4V212h574.4v662.4zM349.6 100c0-7.2 5.6-12.8 12.8-12.8h300c7.2 0 12.8 5.6 12.8 12.8v37.6H349.6V100z m636.8 37.6H749.6V100c0-48.001-39.2-87.2-87.2-87.2h-300c-48 0-87.2 39.199-87.2 87.2v37.6H37.6C16.8 137.6 0 154.4 0 175.2s16.8 37.6 37.6 37.6h112v661.6c0 76 61.6 137.6 137.6 137.6h449.6c76 0 137.6-61.6 137.6-137.6V212h112c20.8 0 37.6-16.8 37.6-37.6s-16.8-36.8-37.6-36.8zM512 824c20.8 0 37.6-16.8 37.6-37.6v-400c0-20.8-16.8-37.6-37.6-37.6s-37.6 16.8-37.6 37.6v400c0 20.8 16.8 37.6 37.6 37.6m-175.2 0c20.8 0 37.6-16.8 37.6-37.6v-400c0-20.8-16.8-37.6-37.6-37.6s-37.6 16.8-37.6 37.6v400c0.8 20.8 17.6 37.6 37.6 37.6m350.4 0c20.8 0 37.6-16.8 37.6-37.6v-400c0-20.8-16.8-37.6-37.6-37.6s-37.6 16.8-37.6 37.6" fill="#FFFFFF"></path></svg>',
  edit: '<svg class="icon" style="width:1em;height:1em;vertical-align:middle;fill:currentColor;overflow:hidden;" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M832.161 351.79c-17.673 0-32 14.327-32 32v479.85H224.037V223.784h414.605c17.673 0 32-14.327 32-32 0-17.673-14.327-32-32-32H192.037c-17.673 0-32 14.327-32 32V895.64c0 17.673 14.327 32 32 32h640.124c17.673 0 32-14.327 32-32V383.79c0-17.673-14.327-32-32-32z" fill="#FFFFFF"></path><path d="M485.612 534.222c6.249 6.248 14.438 9.372 22.627 9.372s16.379-3.124 22.627-9.372l321.407-321.406c12.496-12.497 12.496-32.758 0-45.255-12.498-12.497-32.759-12.497-45.255 0L485.612 488.967c-12.497 12.496-12.497 32.758 0 45.255zM736 627c0-17.673-14.327-32-32-32H322c-17.673 0-32 14.327-32 32s14.327 32 32 32h382c17.673 0 32-14.327 32-32zM322 725c-17.673 0-32 14.327-32 32s14.327 32 32 32h251c17.673 0 32-14.327 32-32s-14.327-32-32-32H322z" fill="#FFFFFF"></path></svg>'
  ,draw: '<svg class="icon" style="width:1em;height:1em;vertical-align:middle;fill:currentColor;overflow:hidden;" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M500.6 599.8c19.7 24.5 41.5 47.7 67.1 67.9 56.4 44.5 122.9 67.1 203.1 69.1L744 763.5c-14.1 14.1-14.1 36.9 0 50.9 7 7 16.2 10.5 25.5 10.5s18.4-3.5 25.5-10.5l84-84c7.4-7.4 10.9-17.2 10.5-26.9 2.9-11.8-0.3-24.8-9.5-34l-84-84c-14.1-14.1-36.9-14.1-50.9 0s-14.1 36.9 0 50.9l28.4 28.4c-117.4-2.6-177.1-56.5-230-127.1-7.2 10.2-14.4 20.8-21.9 31.6-6.9 10.2-13.9 20.3-21 30.5zM382.8 339.6C323.4 292.8 252.6 270 166.5 270c-19.9 0-36 16.1-36 36s16.1 36 36 36c145.4 0 205.2 75 267.8 165.5 14.2-20.7 28.7-41.8 44.3-62.2-27.2-38.1-57.2-75.3-95.8-105.7zM891.5 338.4c0.4-9.7-3.1-19.5-10.5-26.9l-84-84c-14.1-14.1-36.9-14.1-50.9 0-14.1 14.1-14.1 36.9 0 50.9l26.7 26.7c-80.2 2-146.7 24.7-203.1 69.1-51.1 40.3-87.1 92.7-121.8 143.4C380.7 615.5 322.8 700 168.5 700c-19.9 0-36 16.1-36 36s16.1 36 36 36c86.1 0 156.9-22.8 216.3-69.6 51.4-40.5 87.5-93.1 122.4-144 65.5-95.4 122.2-178.1 268.2-181.3L747 405.5c-14.1 14.1-14.1 36.9 0 50.9 7 7 16.2 10.5 25.5 10.5s18.4-3.5 25.5-10.5l84-84c9.2-9.2 12.4-22.2 9.5-34z" fill="#FFFFFF"></path></svg>'
  ,copy: '<svg class="icon" style="width:1em;height:1em;vertical-align:middle;fill:currentColor;overflow:hidden;" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M720 192h-544A80.096 80.096 0 0 0 96 272v608C96 924.128 131.904 960 176 960h544c44.128 0 80-35.872 80-80v-608C800 227.904 764.128 192 720 192z m16 688c0 8.8-7.2 16-16 16h-544a16 16 0 0 1-16-16v-608a16 16 0 0 1 16-16h544a16 16 0 0 1 16 16v608zM848 64h-544a32 32 0 0 0 0 64h544a16 16 0 0 1 16 16v608a32 32 0 1 0 64 0v-608C928 99.904 892.128 64 848 64zM608 360H288a32 32 0 0 0 0 64h320a32 32 0 1 0 0-64zM608 520H288a32 32 0 1 0 0 64h320a32 32 0 1 0 0-64zM480 678.656H288a32 32 0 1 0 0 64h192a32 32 0 1 0 0-64z" fill="#FFFFFF"></path></svg>'
  ,check: '<svg class="icon" style="width:1em;height:1em;vertical-align:middle;fill:currentColor;overflow:hidden;" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M512 32C246.92 32 32 246.92 32 512s214.92 480 480 480 480-214.92 480-480S777.08 32 512 32z m-64 672L224 480l64-64 160 160 288-288 64 64-352 352z" fill="#FFFFFF"></path></svg>'
  ,plus: '<svg class="icon" style="width:1em;height:1em;vertical-align:middle;fill:currentColor;overflow:hidden;" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M480 160h64v704h-64z" fill="#FFFFFF"></path><path d="M160 480h704v64H160z" fill="#FFFFFF"></path></svg>'
};

// 随机数预设
function loadNumPresets(){
  try{ const s = localStorage.getItem(LS_NUM_PRESETS_KEY); const arr = s? JSON.parse(s):[]; return Array.isArray(arr)? arr:[]; }catch{ return []; }
}
function saveNumPresets(list){ try{ localStorage.setItem(LS_NUM_PRESETS_KEY, JSON.stringify(list||[])); }catch{} }
function ensureDefaultNumPreset(){
  const arr = loadNumPresets();
  if (!arr.length){
    const def = { id: crypto.randomUUID?.()||String(Date.now()+Math.random()), name:'4个1-6', count:4, min:1, max:6 };
    saveNumPresets([def]);
  }
}
// 已选择预设的持久化（仅保存预设 id）
function loadSelectedNumPresetId(){ try{ return localStorage.getItem(LS_NUM_SELECTED_PRESET_KEY) || ''; }catch{ return ''; } }
function saveSelectedNumPresetId(id){ try{ if (id) localStorage.setItem(LS_NUM_SELECTED_PRESET_KEY, id); else localStorage.removeItem(LS_NUM_SELECTED_PRESET_KEY); }catch{} }
// 模板设置持久化：数量/最小值/最大值
function loadNumTemplate(){
  try{
    const s = localStorage.getItem(LS_NUM_TEMPLATE_KEY);
    const obj = s ? JSON.parse(s) : null;
    if (!obj || typeof obj !== 'object') return { count:1, min:1, max:6 };
    const count = Math.max(1, Math.min(10, parseInt(obj.count ?? 1, 10)));
    const min = Number.isFinite(parseInt(obj.min ?? 1, 10)) ? parseInt(obj.min, 10) : 1;
    const max = Number.isFinite(parseInt(obj.max ?? 6, 10)) ? parseInt(obj.max, 10) : 6;
    return { count, min, max };
  }catch{ return { count:1, min:1, max:6 }; }
}
function saveNumTemplate(obj){
  try{
    const count = Math.max(1, Math.min(10, parseInt(obj.count ?? 1, 10)));
    const min = Number.isFinite(parseInt(obj.min ?? 1, 10)) ? parseInt(obj.min, 10) : 1;
    const max = Number.isFinite(parseInt(obj.max ?? 6, 10)) ? parseInt(obj.max, 10) : 6;
    localStorage.setItem(LS_NUM_TEMPLATE_KEY, JSON.stringify({ count, min, max }));
  }catch{}
}
function randomInt(min, max){
  const a = Math.floor(min), b = Math.floor(max);
  return Math.floor(Math.random() * (b - a + 1)) + a;
}
function generateNumbers(count, min, max){
  const res = [];
  for (let i=0;i<count;i++) res.push(randomInt(min,max));
  return res;
}

// 通用确认弹窗
let confirmModal = null;
let confirmResolve = null;

function ensureConfirmModal(){
  if (confirmModal) return confirmModal;
  const m = document.createElement('div');
  m.className = 'modal';
  m.id = 'confirmModal';
  m.innerHTML = `
    <div class="dialog onboarding-dialog" style="max-width:440px">
      <button class="modal-x" id="closeConfirmX" aria-label="关闭" title="关闭">×</button>
      <h3 style="margin:0 0 8px; text-align:center; color:#2B90FF">提示</h3>
      <div id="confirmMsg" style="margin:8px 0 14px; color: var(--text, #e5e7eb); text-align:center"></div>
      <div id="confirmBtnContainer" style="display:flex; gap:10px; justify-content:center"></div>
    </div>`;
  document.body.appendChild(m);
  m.style.zIndex = '9999';
  confirmModal = m;
  
  const closeHandler = () => {
    hideModal(confirmModal);
    if (confirmResolve) confirmResolve({ role: 'close' });
  };
  
  m.addEventListener('click', (e)=>{ if (e.target===m) closeHandler(); });
  m.querySelector('#closeConfirmX').addEventListener('click', closeHandler);
  
  return m;
}

function showCustomConfirm({ message, buttons, isHtml }) {
  ensureConfirmModal();
  const msgEl = confirmModal.querySelector('#confirmMsg');
  if (isHtml) msgEl.innerHTML = message || '';
  else msgEl.textContent = message || '';
  
  const btnContainer = confirmModal.querySelector('#confirmBtnContainer');
  btnContainer.innerHTML = '';
  
  (buttons || []).forEach(cfg => {
    const btn = document.createElement('button');
    btn.className = cfg.class || 'btn-glass';
    btn.textContent = cfg.text || '按钮';
    btn.addEventListener('click', () => {
      hideModal(confirmModal);
      if (confirmResolve) confirmResolve({ role: cfg.role, value: cfg.value });
    });
    btnContainer.appendChild(btn);
  });
  
  showModal(confirmModal);
  return new Promise((resolve)=>{ confirmResolve = resolve; });
}

function showConfirm(message){
  return showCustomConfirm({
    message: message || '确认执行该操作吗？',
    buttons: [
      { text: '取消', class: 'btn-glass btn-glass-secondary', role: 'cancel', value: false },
      { text: '确定', class: 'btn-glass btn-glass-danger', role: 'ok', value: true }
    ]
  }).then(res => res.value);
}

function showAlert(message, isHtml = false){
  return showCustomConfirm({
    message,
    isHtml,
    buttons: [
      { text: '知道了', class: 'btn-glass btn-glass-primary', role: 'ok', value: true }
    ]
  }).then(res => res.value);
}
function loadTools(){
  try{ 
    const s = localStorage.getItem(LS_TOOLS_KEY); 
    const arr = s? JSON.parse(s) : []; 
    return Array.isArray(arr)? arr.map(migrateToolShape) : [];
  }catch{ return []; }
}
function saveTools(list){ try{ localStorage.setItem(LS_TOOLS_KEY, JSON.stringify(list)); }catch{} }

function defaultTool(){
  return { 
    id: crypto.randomUUID?.() || String(Date.now()+Math.random()), 
    title:'',
    content:'',
    entries:[] 
  };
}

function migrateToolShape(t){
  // 旧版本：{title, desc, items[]} -> 转换为含 content + entries 的新结构
  if (t && !t.entries){
    const items = Array.isArray(t.items)? t.items : [];
    const title = t.title || '自定义随机';
    const content = (t.desc && typeof t.desc==='string' && t.desc.trim())? t.desc.trim() : '';
    return { id: t.id || (crypto.randomUUID?.()||String(Date.now()+Math.random())), title, content, entries: items.length? [{name:'项', values: items}] : [] };
  }
  return t;
}

// 注入内置随机工具（只在本地没有同名时添加）
function ensureBuiltInTools(){
  // 若已完成种子注入，则不再重复
  try{ if (localStorage.getItem(LS_TOOLS_BUILTINS_KEY)) return; }catch{}
  const tools = loadTools();
  const hasTitle = new Set(tools.map(t=> (t.title||'').trim()));
  let changed = false;

  // 内置 1：方位
  if (!hasTitle.has('方位')){
    tools.push({
      id: crypto.randomUUID?.() || String(Date.now()+Math.random()),
      title: '方位',
      content: '[类型][方位]',
      entries: [
        { name: '类型', values: ['等级','命座','生命','防御','精通','攻击'] },
        { name: '方位', values: ['上','下','左','右','左上','左下','右上','右下'] }
      ]
    });
    changed = true;
  }

  // 组合生成：从 arr 中选 k 个（不排列，仅组合），按原顺序输出
  function getCombinations(arr, k){
    const res = [];
    const n = arr.length;
    const path = [];
    function dfs(start, depth){
      if (depth === k){ res.push(path.slice()); return; }
      for (let i=start; i<n; i++){
        path.push(arr[i]);
        dfs(i+1, depth+1);
        path.pop();
      }
    }
    if (k>0 && k<=n) dfs(0, 0); else if (k===0) res.push([]);
    return res;
  }

  // 内置 2：三元素抽取（七选三的所有组合）
  if (!hasTitle.has('三元素抽取')){
    const base = ['水','草','火','雷','冰','岩','风'];
    const combos = getCombinations(base, 3).map(c=> c.join('，'));
    tools.push({
      id: crypto.randomUUID?.() || String(Date.now()+Math.random()),
      title: '三元素抽取',
      content: '[元素]',
      entries: [ { name: '元素', values: combos } ]
    });
    changed = true;
  }

  // 内置 3：随机角色（使用 characters.js 中的所有角色名）
  if (!hasTitle.has('随机角色')){
    try{
      const cd = window.characterData || {};
      const names = Object.keys(cd).filter(k=> !!k);
      if (names.length){
        tools.push({
          id: crypto.randomUUID?.() || String(Date.now()+Math.random()),
          title: '随机角色',
          content: '[角色]',
          entries: [ 
            { name: '角色', values: names },      
            { name: '提示', values: ['通过“恢复/更新内置工具”可一键更新新角色'] }
          ]
        });
        changed = true;
      }
    }catch{}
  }

  // 内置 4：随机角色*4（使用 characters.js 中的所有角色名）
  if (!hasTitle.has('随机角色*4')){
    try{
      const cd = window.characterData || {};
      const names = Object.keys(cd).filter(k=> !!k);
      if (names.length){
        tools.push({
          id: crypto.randomUUID?.() || String(Date.now()+Math.random()),
          title: '随机角色*4',
          content: '[角色] [角色] [角色] [角色]',
          entries: [
            { name: '角色', values: names },
            { name: '提示', values: ['通过“恢复/更新内置工具”可一键更新新角色'] }
          ]
        });
        changed = true;
      }
    }catch{}
  }

  if (changed) saveTools(tools);
  // 标记已完成内置种子注入
  try{ localStorage.setItem(LS_TOOLS_BUILTINS_KEY, '1'); }catch{}
}

// 恢复/更新内置工具：在用户确认后，移除已存的同名内置工具并重新注入最新内置条目
function restoreBuiltInToolsPrompt(){
  try{
    showConfirm('确定要恢复/更新内置工具并更新其条目吗？\n\n此操作会覆盖已有的同名内置工具，但不会删除你自定义的工具。')
      .then((ok)=>{
        if (!ok) return;
        try{
          // 过滤掉已保存的、与内置同名的工具
          const builtinTitles = new Set(['方位','三元素抽取','随机角色','随机角色*4']);
          let tools = loadTools();
          tools = tools.filter(t => !builtinTitles.has((t.title||'').trim()));
          saveTools(tools);
          // 清除注入标记，让 ensureBuiltInTools 可以重新注入
          try{ localStorage.removeItem(LS_TOOLS_BUILTINS_KEY); }catch{}
          // 重新注入内置工具并刷新 UI
          ensureBuiltInTools();
          try{ ensureDefaultNumPreset(); }catch{}
          renderRandomTools();
          try{ showAlert('已恢复并更新内置工具。'); }catch{}
        }catch(e){
          try{ showAlert('恢复/更新内置工具失败：' + (e && e.message? e.message : e)); }catch{}
        }
      });
  }catch(e){
    try{ showAlert('操作失败：' + (e && e.message? e.message : e)); }catch{}
  }
}

// 挂载页面上的恢复按钮（若存在）
try{
  document.getElementById('restoreBuiltins')?.addEventListener('click', (e)=>{
    e.preventDefault();
    restoreBuiltInToolsPrompt();
  });
}catch{}

function renderRandomTools(){
  const grid = document.getElementById('toolsGrid');
  if (!grid) return;
  // 确保内置工具已注入
  ensureBuiltInTools();
  ensureDefaultNumPreset();
  const tools = loadTools();
  let order = [];
  try{
    const s = localStorage.getItem(LS_TOOLS_ORDER_KEY);
    const saved = s? JSON.parse(s):null;
    if (Array.isArray(saved)) order = saved;
  }catch{}
  const toolKeys = tools.map(t=> `tool:${t.id||''}`);
  if (!order || !order.length){
    order = ['num', ...toolKeys];
  } else {
    // 过滤无效项，并补全新增工具
    order = order.filter(k=> k==='num' || toolKeys.includes(k));
    toolKeys.forEach(k=>{ if (!order.includes(k)) order.push(k); });
    if (!order.includes('num')) order.unshift('num');
  }
  const frag = document.createDocumentFragment();
  // 按顺序渲染
  order.forEach(key=>{
    if (key==='num'){
      // 随机数模板卡片（带预设下拉与管理）
      const card = document.createElement('div');
      card.className = 'tool-card num-template';
      card.innerHTML = `
        <div class="title">
          <div style="display:flex;align-items:center;gap:8px;flex:1 1 auto;margin-bottom: 8px;">
            <strong>随机数</strong>
          </div>
          <div style="display:flex;gap:6px">
            <button class="ghost btn-edit" title="管理预设">${ICONS.edit}</button>
          </div>
        </div>
        <div class="desc num-inline">
          生成 <input class="num-input num-count" type="number" min="1" max="10" value="1"> 个 <input class="num-input num-min" type="number" value="1"> - <input class="num-input num-max" type="number" value="6"> 随机数
          <select class="num-preset-select" style="margin-left:8px; max-width: 50%"><option value="">选择预设</option></select>
        </div>
        <div class="actions-line">
          <div class="result" aria-live="polite">...</div>
          <div class="actions">
            <button class="btn-glass btn-glass-primary btn-gen-copy">抽取并复制</button>
          </div>
        </div>
      `;
      const elCount = card.querySelector('.num-count');
      const elMin = card.querySelector('.num-min');
      const elMax = card.querySelector('.num-max');
      const btnGenCopy = card.querySelector('.btn-gen-copy');
      const resultEl = card.querySelector('.result');
      const btnEdit = card.querySelector('.btn-edit');
      const sel = card.querySelector('.num-preset-select');

      // 模板设置
      const tpl = loadNumTemplate();
      elCount.value = String(tpl.count);
      elMin.value = String(tpl.min);
      elMax.value = String(tpl.max);

      function persistTpl(){
        const c = parseInt(elCount.value||'1',10);
        const mi = parseInt(elMin.value||'1',10);
        const ma = parseInt(elMax.value||'6',10);
        saveNumTemplate({ count: Number.isFinite(c)? c : tpl.count, min: Number.isFinite(mi)? mi : tpl.min, max: Number.isFinite(ma)? ma : tpl.max });
      }
      function refreshPresetOptions(){
        const list = loadNumPresets();
        sel.innerHTML = '<option value="">选择预设</option>' + list.map(p=> `<option value="${p.id}">${escapeHtml(p.name||'未命名')}</option>`).join('');
        // 恢复已选择的预设（若仍存在）
        const savedId = loadSelectedNumPresetId();
        if (savedId && list.some(p=> p.id===savedId)){
          sel.value = savedId;
        } else {
          sel.value = '';
          saveSelectedNumPresetId('');
        }
      }
      refreshPresetOptions();
      sel.addEventListener('change', ()=>{
        const id = sel.value; if (!id){ saveSelectedNumPresetId(''); return; }
        const p = loadNumPresets().find(x=> x.id===id);
        if (!p) return;
        elCount.value = String(Math.max(1, Math.min(10, parseInt(p.count||1,10))));
        elMin.value = String(parseInt(p.min||1,10));
        elMax.value = String(parseInt(p.max||6,10));
        persistTpl();
        saveSelectedNumPresetId(id);
      });
      elCount.addEventListener('input', ()=>{
        const val = parseInt(elCount.value, 10);
        if (val > 10) {
          elCount.value = '10';
          elCount.classList.add('input-invalid');
          setTimeout(()=> elCount.classList.remove('input-invalid'), 600);
        }
        persistTpl();
        // 手动修改时清除预设选择
        sel.value = '';
        saveSelectedNumPresetId('');
      });
      elMin.addEventListener('input', ()=>{ persistTpl(); sel.value=''; saveSelectedNumPresetId(''); });
      elMax.addEventListener('input', ()=>{ persistTpl(); sel.value=''; saveSelectedNumPresetId(''); });
      function doGenerate(){
        const c = Math.max(1, Math.min(10, parseInt(elCount.value||'1',10)));
        const mi = parseInt(elMin.value||'1',10);
        const ma = parseInt(elMax.value||'6',10);
        if (!Number.isFinite(mi) || !Number.isFinite(ma)) { showAlert('请输入有效的整数区间'); return; }
        if (mi > ma){ showAlert('最小值不能大于最大值'); return; }
        const arr = generateNumbers(c, mi, ma);
        resultEl.textContent = arr.join(' ');
        resultEl.classList.remove('flash'); void resultEl.offsetWidth; resultEl.classList.add('flash');
        setTimeout(()=> resultEl.classList.remove('flash'), 700);
        return resultEl.textContent.trim();
      }
      btnGenCopy.addEventListener('click', async ()=>{
        const txt = doGenerate();
        if (!txt || txt==='...') return;
        await copyToClipboard(txt);
        btnGenCopy.disabled = true;
        const prev = btnGenCopy.innerHTML; const prevClass = btnGenCopy.className;
        btnGenCopy.className = prevClass.replace('btn-glass-primary','btn-glass-success');
        btnGenCopy.innerHTML = ICONS.check || '已复制';
        setTimeout(()=>{
          btnGenCopy.className = prevClass;
          btnGenCopy.innerHTML = '抽取并复制';
          btnGenCopy.disabled = false;
        }, 1400);
      });
      btnEdit.addEventListener('click', ()=> openNumPresetEditor(refreshPresetOptions));
      frag.appendChild(card);
    } else if (key.startsWith('tool:')){
      const id = key.slice(5);
      const t = tools.find(x=> (x.id||'')===id);
      if (!t) return;
      // 工具卡
      const card = document.createElement('div');
      card.className = 'tool-card';
      card.dataset.toolId = id;
      card.innerHTML = `
        <div class="title">
          <div style="display:flex;align-items:center;gap:8px;flex:1 1 auto;margin-bottom: 8px;">
            <strong>${escapeHtml(t.title||'未命名')}</strong>
          </div>
          <div style="display:flex;gap:6px">
            <button class="ghost btn-edit" title="编辑">${ICONS.edit}</button>
            <button class="ghost btn-del" title="删除">${ICONS.del}</button>
          </div>
        </div>
        <div class="desc" style="white-space:pre-wrap">${escapeHtml((t.content||'').slice(0,160))}${(t.content||'').length>160? '…':''}</div>
        <div class="actions-line">
          <div class="result" aria-live="polite">...</div>
          <div class="actions">
            <button class="btn-glass btn-glass-primary btn-draw-copy">抽取并复制</button>
          </div>
        </div>
      `;
      card.querySelector('.btn-edit').addEventListener('click', ()=>{
        if (id) openToolEditorById(id); else openToolEditorByTitle(t.title||'');
      });
      card.querySelector('.btn-del').addEventListener('click', async ()=>{
        const ok = await showConfirm('删除该随机工具？');
        if (!ok) return;
        const cur = loadTools();
        let di = cur.findIndex(x=> (x.id||'')===id);
        if (di<0) di = cur.findIndex(x=> (x.title||'')===(t.title||''));
        if (di>=0){ cur.splice(di,1); saveTools(cur); renderRandomTools(); }
      });
      const btnDrawCopy = card.querySelector('.btn-draw-copy');
      btnDrawCopy.addEventListener('click', async ()=>{
        const res = drawTool(t);
        if (!res){ showAlert('请先在编辑中完善“内容”和“随机词条”'); return; }
        const resultEl = card.querySelector('.result');
        resultEl.textContent = res.text;
        resultEl.classList.remove('flash'); void resultEl.offsetWidth; resultEl.classList.add('flash');
        setTimeout(()=> resultEl.classList.remove('flash'), 700);
        const txt = (resultEl?.textContent||'').trim(); if (!txt || txt==='...') return;
        await copyToClipboard(txt);
        btnDrawCopy.disabled = true;
        const prevClass = btnDrawCopy.className; const prevHTML = btnDrawCopy.innerHTML;
        btnDrawCopy.className = prevClass.replace('btn-glass-primary','btn-glass-success');
        btnDrawCopy.innerHTML = (ICONS.check||'已复制');
        setTimeout(()=>{ btnDrawCopy.className = prevClass; btnDrawCopy.innerHTML = '抽取并复制'; btnDrawCopy.disabled = false; }, 1400);
      });
      frag.appendChild(card);
    }
  });
  // 桌面两列时：如当前卡片总数为奇数，先插入一个占位卡片，确保“编辑/添加”能并排在同一行
  try{
    const columnsIsTwo = window.innerWidth > 768;
    const currentCount = 1 + tools.length; // 模板 + 工具
    if (columnsIsTwo && (currentCount % 2 === 1)){
      const spacer = document.createElement('div');
      spacer.className = 'tool-card spacer-card';
      spacer.setAttribute('aria-hidden','true');
      frag.appendChild(spacer);
    }
  }catch{}

  // 添加卡片
  // 编辑卡片（进入/退出排序模式）
  const editBtn = document.createElement('button');
  editBtn.className = 'tool-card edit-card';
  editBtn.innerHTML = `<div class="plus">${ICONS.edit||'✎'}</div>`;
  editBtn.title = '编辑';
  editBtn.addEventListener('click', ()=>{
    const gridEl = document.getElementById('toolsGrid');
    if (!gridEl) return;
    const entering = !gridEl.classList.contains('edit-mode');
    const cards = gridEl.querySelectorAll('.tool-card:not(.add-card):not(.edit-card):not(.spacer-card)');
    // 切换图标：编辑 -> 勾号，退出则恢复
    const plus = editBtn.querySelector('.plus');
    if (entering){
      gridEl.classList.add('edit-mode');
      cards.forEach(card => {
        card.classList.remove('shake-1', 'shake-2', 'shake-3', 'shake-4');
        const shakeType = Math.floor(Math.random() * 4) + 1;
        card.classList.add(`shake-${shakeType}`);
      });
      plus.innerHTML = ICONS.check || '✔';
      enableToolsReorder(gridEl);
      // 出现动效
      gridEl.querySelectorAll('.tool-card .title .ghost').forEach(btn=>{
        btn.classList.remove('pop-out');
        btn.classList.add('pop-in');
        setTimeout(()=> btn.classList.remove('pop-in'), 220);
      });
    } else {
      plus.innerHTML = ICONS.edit || '✎';
      // 播放隐藏动效，完成后再移除 edit-mode
      const ghosts = Array.from(gridEl.querySelectorAll('.tool-card .title .ghost'));
      ghosts.forEach(btn=>{
        btn.classList.remove('pop-in');
        btn.classList.add('pop-out');
      });
      disableToolsReorder(gridEl);
      // 退出编辑模式时，移除所有卡片的晃动动画类
      cards.forEach(card => {
        card.classList.remove('shake-1', 'shake-2', 'shake-3', 'shake-4');
      });
      setTimeout(()=>{
        gridEl.classList.remove('edit-mode');
        ghosts.forEach(btn=> btn.classList.remove('pop-out'));
      }, 200);
    }
  });
  frag.appendChild(editBtn);

  const add = document.createElement('button');
  add.className = 'tool-card add-card';
  add.innerHTML = '<div class="plus">+</div>';
  add.addEventListener('click', ()=> openToolEditor());
  frag.appendChild(add);
  grid.innerHTML = '';
  grid.appendChild(frag);
  // 若当前处于编辑模式，重新启用拖拽监听
  if (grid.classList.contains('edit-mode')){
    enableToolsReorder(grid);
    // 同步编辑按钮图标为勾号
    const editBtn = grid.querySelector('.tool-card.edit-card .plus');
    if (editBtn) editBtn.innerHTML = ICONS.check || '✔';
    
    // 重新应用晃动动画
    const cards = grid.querySelectorAll('.tool-card:not(.add-card):not(.edit-card):not(.spacer-card)');
    cards.forEach(card => {
      card.classList.remove('shake-1', 'shake-2', 'shake-3', 'shake-4');
      const shakeType = Math.floor(Math.random() * 4) + 1;
      card.classList.add(`shake-${shakeType}`);
    });
  }
}

// 拖拽/指针排序实现（桌面 Drag & Drop + 移动端 Pointer Events）
let toolsDragState = null;
function createCardPlaceholder(el){
  const ph = document.createElement('div');
  ph.className = 'tool-card placeholder';
  ph.style.height = el.offsetHeight + 'px';
  return ph;
}
function getSortableList(grid){
  return Array.from(grid.querySelectorAll('.tool-card')).filter(el=>
    !el.classList.contains('add-card') &&
    !el.classList.contains('edit-card') &&
    !el.classList.contains('spacer-card')
  );
}
function getIndexInSortable(grid, el){
  return getSortableList(grid).indexOf(el);
}
function enableToolsReorder(grid){
  enableToolsDrag(grid);
  enableToolsPointer(grid);
}
function disableToolsReorder(grid){
  disableToolsDrag(grid);
  disableToolsPointer(grid);
}
function enableToolsDrag(grid){
  // 仅对 tool-card 且不含 add-card/edit-card 的项启用拖拽
  const items = Array.from(grid.querySelectorAll('.tool-card'))
    .filter(el=> !el.classList.contains('add-card') && !el.classList.contains('edit-card') && !el.classList.contains('spacer-card'));
  items.forEach((el, idx)=>{
    el.setAttribute('draggable', 'true');
    el.addEventListener('dragstart', onToolDragStart);
    el.addEventListener('dragover', onToolDragOver);
    el.addEventListener('drop', onToolDrop);
    el.addEventListener('dragend', onToolDragEnd);
  });
}
function disableToolsDrag(grid){
  const items = Array.from(grid.querySelectorAll('.tool-card'));
  items.forEach(el=>{
    el.removeAttribute('draggable');
    el.removeEventListener('dragstart', onToolDragStart);
    el.removeEventListener('dragover', onToolDragOver);
    el.removeEventListener('drop', onToolDrop);
    el.removeEventListener('dragend', onToolDragEnd);
  });
}
function onToolDragStart(e){
  // 若正在进行 Pointer 拖拽，阻止 HTML5 DnD 干扰
  if (pointerState){ try{ e.preventDefault(); }catch{} return; }
  const el = e.currentTarget;
  el.classList.add('dragging');
  const grid = document.getElementById('toolsGrid');
  const placeholder = createCardPlaceholder(el);
  // 在原位置放入占位元素，源元素隐藏，后续移动占位符
  grid.insertBefore(placeholder, el);
  el.style.visibility = 'hidden';
  toolsDragState = { src: el, placeholder, startIndex: getToolIndex(el) };
  try{ e.dataTransfer.setData('text/plain', 'tool'); }catch{}
}
function onToolDragOver(e){
  e.preventDefault();
  const target = e.currentTarget;
  const grid = document.getElementById('toolsGrid');
  if (!grid || !toolsDragState) return;
  if (target === toolsDragState.src || target === toolsDragState.placeholder) return;
  const ph = toolsDragState.placeholder;
  const list = getSortableList(grid);
  const phIdx = list.indexOf(ph);
  const tgtIdx = list.indexOf(target);
  if (phIdx<0 || tgtIdx<0) return;
  const before = tgtIdx > phIdx ? target.nextSibling : target;
  grid.insertBefore(ph, before);
}
function onToolDrop(e){ e.preventDefault(); }
function onToolDragEnd(){
  const grid = document.getElementById('toolsGrid');
  if (!grid || !toolsDragState) return;
  const { src, placeholder } = toolsDragState;
  src.classList.remove('dragging');
  // 将源元素放回占位符位置
  if (placeholder && placeholder.parentNode===grid){
    grid.insertBefore(src, placeholder);
    placeholder.remove();
  }
  src.style.visibility = '';
  // 保存顺序：读取 DOM 顺序并同步到本地存储（仅对“用户工具”和“随机数实例卡片”）
  persistToolsOrderFromDOM(grid);
  toolsDragState = null;
}
function getToolIndex(el){
  const grid = document.getElementById('toolsGrid'); if (!grid) return -1;
  const arr = Array.from(grid.querySelectorAll('.tool-card'))
    .filter(x=> !x.classList.contains('add-card') && !x.classList.contains('edit-card') && !x.classList.contains('spacer-card'));
  return arr.indexOf(el);
}
function persistToolsOrderFromDOM(grid){
  // 保存顺序为 ['num', 'tool:<id>', ...]
  const cards = Array.from(grid.querySelectorAll('.tool-card'))
    .filter(el=> !el.classList.contains('add-card') && !el.classList.contains('edit-card') && !el.classList.contains('spacer-card'));
  const keys = cards.map(c=> c.classList.contains('num-template') ? 'num' : (c.dataset.toolId ? `tool:${c.dataset.toolId}` : null)).filter(Boolean);
  try{ localStorage.setItem(LS_TOOLS_ORDER_KEY, JSON.stringify(keys)); }catch{}
}

// Pointer Events（移动端）实现
let pointerState = null;
function enableToolsPointer(grid){
  const items = Array.from(grid.querySelectorAll('.tool-card'))
    .filter(el=> !el.classList.contains('add-card') && !el.classList.contains('edit-card') && !el.classList.contains('spacer-card'));
  items.forEach(el=>{
    el.addEventListener('pointerdown', onToolPointerDown, {passive:false});
  });
}
function disableToolsPointer(grid){
  const items = Array.from(grid.querySelectorAll('.tool-card'));
  items.forEach(el=>{
    el.removeEventListener('pointerdown', onToolPointerDown);
  });
  if (pointerState){
    window.removeEventListener('pointermove', onToolPointerMove);
    window.removeEventListener('pointerup', onToolPointerUp);
    pointerState = null;
  }
}
function onToolPointerDown(e){
  // 仅编辑模式启用
  const grid = document.getElementById('toolsGrid');
  if (!grid || !grid.classList.contains('edit-mode')) return;
  // 避免按钮等可点击元素触发拖拽
  if (e.target.closest('button')) return;
  const el = e.currentTarget;
  if (el.classList.contains('add-card') || el.classList.contains('edit-card') || el.classList.contains('spacer-card')) return;
  e.preventDefault();
  el.classList.add('dragging');
  const rect = el.getBoundingClientRect();
  // 放置占位符
  const placeholder = createCardPlaceholder(el);
  grid.insertBefore(placeholder, el);
  // 将源卡片移到 body 作为 fixed 浮层，避免祖先 transform/滚动影响
  try{ document.body.appendChild(el); }catch{}
  // 让源卡片浮动跟随手指（以按下位置为中心）
  el.classList.add('drag-floating');
  el.style.width = rect.width + 'px';
  el.style.height = rect.height + 'px';
  const offsetX = e.clientX - rect.left;
  const offsetY = e.clientY - rect.top;
  el.style.left = (e.clientX - offsetX) + 'px';
  el.style.top = (e.clientY - offsetY) + 'px';
  pointerState = {
    src: el,
    placeholder,
    offsetX,
    offsetY
  };
  window.addEventListener('pointermove', onToolPointerMove, {passive:false});
  window.addEventListener('pointerup', onToolPointerUp, {passive:false});
}
function onToolPointerMove(e){
  if (!pointerState) return;
  e.preventDefault();
  const grid = document.getElementById('toolsGrid'); if (!grid) return;
  const src = pointerState.src;
  // 更新浮动位置
  src.style.left = (e.clientX - pointerState.offsetX) + 'px';
  src.style.top = (e.clientY - pointerState.offsetY) + 'px';
  const over = document.elementFromPoint(e.clientX, e.clientY);
  const target = over?.closest?.('.tool-card');
  if (!target || target===src || target===pointerState.placeholder) return;
  if (target.classList.contains('add-card') || target.classList.contains('edit-card') || target.classList.contains('spacer-card')) return;
  const list = getSortableList(grid);
  const phIdx = list.indexOf(pointerState.placeholder);
  const tgtIdx = list.indexOf(target);
  if (phIdx<0 || tgtIdx<0) return;
  const before = tgtIdx > phIdx ? target.nextSibling : target;
  grid.insertBefore(pointerState.placeholder, before);
}
function onToolPointerUp(e){
  if (!pointerState) return;
  const grid = document.getElementById('toolsGrid');
  const src = pointerState.src;
  src.classList.remove('dragging');
  // 将源卡片放到占位符位置并清理浮动样式
  if (pointerState.placeholder && pointerState.placeholder.parentNode===grid){
    grid.insertBefore(src, pointerState.placeholder);
    pointerState.placeholder.remove();
  }
  src.classList.remove('drag-floating');
  src.style.left = '';
  src.style.top = '';
  src.style.width = '';
  src.style.height = '';
  persistToolsOrderFromDOM(grid);
  window.removeEventListener('pointermove', onToolPointerMove);
  window.removeEventListener('pointerup', onToolPointerUp);
  pointerState = null;
}

// 获取某个随机数实例卡片在 numCards 列表中的当前索引
function getNumCardIndexFromEl(card){
  const grid = document.getElementById('toolsGrid'); if (!grid) return -1;
  const arr = Array.from(grid.querySelectorAll('.tool-card'))
    .filter(el=> !el.classList.contains('num-template') && !el.classList.contains('edit-card') && !el.classList.contains('add-card'));
  // 前面可能有若干“随机数实例”卡片，后面跟着工具卡片；我们只在含有 .num-inline 的卡中找索引
  const nums = arr.filter(el=> el.querySelector('.num-inline'));
  if (card?.dataset?.numId){
    const ids = nums.map(el=> el.dataset.numId || '');
    return ids.indexOf(card.dataset.numId);
  }
  return nums.indexOf(card);
}

function openToolEditorById(id){
  const tools = loadTools();
  const idx = tools.findIndex(t=> (t.id||'')===id);
  if (idx>=0) openToolEditor(idx); else openToolEditor(null);
}
function openToolEditorByTitle(title){
  const tools = loadTools();
  const idx = tools.findIndex(t=> (t.title||'')===title);
  if (idx>=0) openToolEditor(idx); else openToolEditor(null);
}

// 编辑弹窗（标题 + 内容 + 随机词条）
let toolEditorModal = null;
let toolEditingIndex = null;
let toolEditorData = null; // 在编辑器中维护当前正在编辑的工具数据（未保存）
let originalToolEditorData = null; // 用于对比是否修改
let entryEditorModal = null;
let entryEditingIndex = null;
function ensureToolEditor(){
  if (toolEditorModal) return toolEditorModal;
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'toolEditorModal';
  modal.innerHTML = `
    <div class="dialog onboarding-dialog" style="max-width:820px">
      <button class="modal-x" id="closeToolEditorX" aria-label="关闭" title="关闭">×</button>
      <h3 style="margin:0 0 6px; text-align:center; color:#6db3ff">添加/编辑随机工具</h3>
      <div class="tool-editor">
        <label>工具名称
          <input id="toolTitleInput" type="text" placeholder="工具名称" />
        </label>
        <label>内容（支持在文本中使用 [标签] 引用下方的随机词条）
          <textarea id="toolContentInput" placeholder="抽取内容" style="min-height:96px; resize:none;"></textarea>
        </label>
        <div class="tool-editor-entries">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:6px">
            <div style="font-weight:600; color:#6db3ff">随机词条</div>
          </div>
          <div id="entryCards" class="entry-cards"></div>
        </div>
        <div class="tool-editor-actions" style="display:flex; gap:8px; justify-content:flex-end; margin-top:12px">
          <button class="btn-glass btn-glass-primary" id="saveTool">保存</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  toolEditorModal = modal;
  modal.querySelector('#closeToolEditorX').addEventListener('click', tryCloseToolEditor);
  // 绑定输入，同步到本地编辑态
  modal.querySelector('#toolTitleInput').addEventListener('input', (e)=>{ if (toolEditorData) toolEditorData.title = e.target.value; });
  modal.querySelector('#toolContentInput').addEventListener('input', (e)=>{ if (toolEditorData) toolEditorData.content = e.target.value; });
  modal.querySelector('#saveTool').addEventListener('click', saveToolFromEditor);
  return modal;
}

function ensureEntryEditor(){
  if (entryEditorModal) return entryEditorModal;
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'entryEditorModal';
  modal.innerHTML = `
    <div class="dialog onboarding-dialog" style="max-width:620px">
      <button class="modal-x" id="closeEntryEditorX" aria-label="关闭" title="关闭">×</button>
      <h3 style="margin:0 0 6px; text-align:center; color:#6db3ff">编辑随机词条</h3>
      <div class="entry-editor">
        <label>词条名称
          <input id="entryNameInput" type="text" placeholder="词条名称" />
        </label>
        <div class="values-block">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:6px">
            <div style="display:flex; align-items:center; gap:10px;">
              <div style="font-weight:600; color:#6db3ff">可选值</div>
              <label class="batch-edit-label" style="font-size:12px; display:flex; align-items:center; gap:4px; cursor:pointer; user-select:none; opacity:0.85;">
                <input type="checkbox" id="batchEditToggle" style="margin:0; width:14px; height:14px; cursor:pointer;" /> 批量编辑
              </label>
            </div>
            <button class="ghost mini add" id="addEntryValue">${ICONS.plus} 添加值</button>
          </div>
          <div id="entryValuesList" class="values-list"></div>
          <textarea id="entryValuesTextArea" placeholder="每一行输入一个值..." style="display:none;"></textarea>
        </div>
        <div class="tool-editor-actions" style="display:flex; gap:8px; justify-content:flex-end; margin-top:12px">
          <button class="btn-glass btn-glass-primary" id="saveEntry">保存</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  entryEditorModal = modal;
  modal.querySelector('#closeEntryEditorX').addEventListener('click', closeEntryEditor);
  modal.querySelector('#addEntryValue').addEventListener('click', ()=> addEntryValueRow(''));
  modal.querySelector('#saveEntry').addEventListener('click', saveEntryFromEditor);

  // 绑定批量编辑切换逻辑
  const toggle = modal.querySelector('#batchEditToggle');
  const addBtn = modal.querySelector('#addEntryValue');
  const valuesList = modal.querySelector('#entryValuesList');
  const valuesTextArea = modal.querySelector('#entryValuesTextArea');

  toggle.addEventListener('change', (e) => {
    if (e.target.checked) {
      // 切换到批量模式
      const inputs = valuesList.querySelectorAll('.value-input');
      const vals = [];
      inputs.forEach(input => {
        const v = input.value.trim();
        if (v) vals.push(v);
      });
      valuesTextArea.value = vals.join('\n');
      
      addBtn.style.display = 'none';
      valuesList.style.display = 'none';
      valuesTextArea.style.display = 'block';
      valuesTextArea.focus();
    } else {
      // 切换回单条模式
      const vals = valuesTextArea.value.split('\n').map(v => v.trim()).filter(Boolean);
      valuesList.innerHTML = '';
      if (vals.length > 0) {
        vals.forEach(v => addEntryValueRow(v));
      } else {
        addEntryValueRow('');
      }
      
      addBtn.style.display = 'inline-flex';
      valuesList.style.display = 'flex';
      valuesTextArea.style.display = 'none';
    }
  });

  return modal;
}

function addEntryValueRow(value){
  const list = entryEditorModal.querySelector('#entryValuesList');
  const row = document.createElement('div');
  row.className = 'value-row';
  row.innerHTML = `
    <input class="value-input" type="text" placeholder="值" />
    <button class="ghost mini del value-del" title="删除">${ICONS.del}</button>
  `;
  const input = row.querySelector('.value-input');
  input.value = value || '';
  input.addEventListener('keydown', (e)=>{
    if (e.key==='Enter'){
      e.preventDefault(); addEntryValueRow('');
      const inputs = list.querySelectorAll('.value-input');
      inputs[inputs.length-1]?.focus();
    }
  });
  row.querySelector('.value-del').addEventListener('click', ()=> row.remove());
  list.appendChild(row);
}

function openEntryEditor(index){
  ensureEntryEditor();
  
  // 重置为单条模式，避免带着上次关闭前的状态
  const toggle = entryEditorModal.querySelector('#batchEditToggle');
  if (toggle) toggle.checked = false;
  
  const addBtn = entryEditorModal.querySelector('#addEntryValue');
  const valuesList = entryEditorModal.querySelector('#entryValuesList');
  const valuesTextArea = entryEditorModal.querySelector('#entryValuesTextArea');
  if (addBtn) addBtn.style.display = 'inline-flex';
  if (valuesList) valuesList.style.display = 'flex';
  if (valuesTextArea) {
    valuesTextArea.style.display = 'none';
    valuesTextArea.value = '';
  }

  entryEditingIndex = (typeof index==='number')? index : null;
  const entry = (entryEditingIndex!=null)? toolEditorData.entries[entryEditingIndex] : {name:'', values:['']};
  entryEditorModal.querySelector('#entryNameInput').value = entry.name || '';
  const list = entryEditorModal.querySelector('#entryValuesList');
  list.innerHTML = '';
  (entry.values && entry.values.length? entry.values : ['']).forEach(v=> addEntryValueRow(v));
  showModal(entryEditorModal);
}

function closeEntryEditor(){ hideModal(entryEditorModal); }

function saveEntryFromEditor(){
  const name = entryEditorModal.querySelector('#entryNameInput').value.trim();
  
  const toggle = entryEditorModal.querySelector('#batchEditToggle');
  const isBatch = toggle && toggle.checked;
  
  let values = [];
  if (isBatch) {
    const textarea = entryEditorModal.querySelector('#entryValuesTextArea');
    values = (textarea?.value || '').split('\n').map(v => v.trim()).filter(Boolean);
  } else {
    values = Array.from(entryEditorModal.querySelectorAll('.value-input')).map(i=> i.value.trim()).filter(Boolean);
  }

  if (!name){ showAlert('请填写词条名称'); return; }
  if (!values.length){ showAlert('请至少添加一个值'); return; }
  
  // 校验：当前工具内不允许存在重名词条（排除正在编辑的这条）
  const existing = (toolEditorData?.entries||[]).map((e, idx)=> ({ idx, name: (e?.name||'').trim() }));
  const dup = existing.find(e=> e.name && e.name===name && idxNotSelf(e.idx));
  function idxNotSelf(idx){ return !(entryEditingIndex!=null && idx===entryEditingIndex); }
  if (dup){ showAlert(`已存在同名的词条：“${name}”。请更换名称后再保存。`); return; }
  const data = { name, values };
  if (entryEditingIndex!=null) toolEditorData.entries[entryEditingIndex] = data;
  else toolEditorData.entries.push(data);
  renderEntryCards();
  closeEntryEditor();
}
function renderEntryCards(){
  const host = toolEditorModal.querySelector('#entryCards');
  host.innerHTML = '';
  const grid = document.createDocumentFragment();
  (toolEditorData.entries||[]).forEach((en, i)=>{
    const card = document.createElement('div');
    card.className = 'entry-card';
    const chips = (en.values||[]).slice(0,6).map(v=> `<span class="chipv">${escapeHtml(v)}</span>`).join('');
    const more = (en.values||[]).length>6? `<span class="chipv more">+${(en.values.length-6)}</span>`:'';
    card.innerHTML = `
      <div class="entry-card-head">
        <strong class="nm">${escapeHtml(en.name||'未命名')}</strong>
        <div class="ops">
          <button class="ghost mini edit" title="编辑">${ICONS.edit}</button>
          <button class="ghost mini del" title="删除">${ICONS.del}</button>
        </div>
      </div>
      <div class="entry-card-body">${chips}${more || (!chips? '<span class="muted">无可选值</span>':'')}</div>
      <div class="entry-card-tip muted">点击卡片可复制标签：[${escapeHtml(en.name||'未命名')}]</div>
    `;
    // 卡片点击复制标签（排除操作按钮区域）
    card.addEventListener('click', (e)=>{
      if (e.target.closest('.ops') || e.target.closest('button')) return;
      const name = en.name || '未命名';
      const tag = `[${name}]`;
      copyToClipboard(tag);
      const tip = card.querySelector('.entry-card-tip');
      const prev = tip.innerHTML;
      tip.style.opacity = '0.6';
      tip.classList.add('copied');
      tip.innerHTML = `${ICONS.check} 已复制`;
      setTimeout(()=>{ tip.style.opacity = '1'; }, 50);
      setTimeout(()=>{ tip.classList.remove('copied'); tip.innerHTML = prev; }, 1200);
    });
    card.querySelector('.edit').addEventListener('click', ()=> openEntryEditor(i));
    card.querySelector('.del').addEventListener('click', async ()=>{
      const ok = await showConfirm('删除该词条？');
      if (!ok) return;
      toolEditorData.entries.splice(i,1);
      renderEntryCards();
    });
    grid.appendChild(card);
  });
  const add = document.createElement('button');
  add.className = 'entry-card add-card';
  add.innerHTML = '<div class="plus">+</div><div class="muted">添加新的随机词条</div>';
  add.addEventListener('click', ()=> openEntryEditor(null));
  grid.appendChild(add);
  host.appendChild(grid);
}

function openToolEditor(index){
  ensureToolEditor();
  toolEditingIndex = (typeof index==='number')? index : null;
  const tools = loadTools();
  toolEditorData = JSON.parse(JSON.stringify((toolEditingIndex!=null)? tools[toolEditingIndex] : defaultTool()));
  originalToolEditorData = JSON.parse(JSON.stringify(toolEditorData));
  toolEditorModal.querySelector('#toolTitleInput').value = toolEditorData.title || '';
  toolEditorModal.querySelector('#toolContentInput').value = toolEditorData.content || '';
  renderEntryCards();
  showModal(toolEditorModal);
}

function closeToolEditor(){ 
  hideModal(toolEditorModal);
  toolEditorData = null;
  originalToolEditorData = null;
}

function tryCloseToolEditor() {
  if (!toolEditorData || !originalToolEditorData) {
    closeToolEditor();
    return;
  }
  
  if (JSON.stringify(toolEditorData) !== JSON.stringify(originalToolEditorData)) {
    showCustomConfirm({
      message: '当前修改未保存，是否保存？',
      buttons: [
        { text: '取消', class: 'btn-glass btn-glass-danger', role: 'discard' },
        { text: '确定', class: 'btn-glass btn-glass-primary', role: 'save' }
      ]
    }).then(res => {
      if (res.role === 'save') {
        saveToolFromEditor();
      } else if (res.role === 'discard') {
        closeToolEditor();
      }
    });
  } else {
    closeToolEditor();
  }
}

function saveToolFromEditor(){
  const title = (toolEditorData?.title||'').trim();
  const content = (toolEditorData?.content||'').trim();
  const entries = Array.isArray(toolEditorData?.entries)? toolEditorData.entries.filter(e=> e && e.name && (e.values||[]).length) : [];
  if (!title){ showAlert('请填写工具名称'); return; }
  if (!content){ showAlert('请填写内容（可包含 [标签]）'); return; }
  // 校验：同一工具内词条名称不得重复
  const names = entries.map(e=> (e.name||'').trim());
  const seen = new Set();
  const dups = [];
  for (const n of names){
    if (!n) continue;
    if (seen.has(n)) dups.push(n); else seen.add(n);
  }
  if (dups.length){
    const list = Array.from(new Set(dups)).join('、');
    showAlert(`存在重复的词条名称：${list}。请修改后再保存。`);
    return;
  }
  // 若内容包含标签，则至少一条对应词条存在
  const tagNames = Array.from((content.match(/\[[^\[\]]+\]/g)||[])).map(s=> s.slice(1,-1));
  if (tagNames.length){
    const namesSet = new Set(entries.map(e=>e.name));
    const missing = tagNames.filter(n=> !namesSet.has(n));
  if (missing.length){ showAlert(`以下标签缺少词条定义：${missing.join('、')}`); return; }
  }
  const tools = loadTools();
  const data = { id: (toolEditingIndex!=null? (tools[toolEditingIndex]?.id) : (crypto.randomUUID?.() || String(Date.now()+Math.random()))), title, content, entries };
  if (toolEditingIndex!=null) tools[toolEditingIndex] = data; else tools.push(data);
  saveTools(tools);
  renderRandomTools();
  closeToolEditor();
}

function drawTool(tool){
  const content = (tool && tool.content || '').trim();
  const entries = Array.isArray(tool?.entries)? tool.entries : [];
  if (!content) return null;
  const map = new Map(entries.map(e=> [e.name, e.values||[]]));
  const tagRegex = /\[([^\[\]]+)\]/g;
  
  const text = content.replace(tagRegex, (_, name) => {
    const arr = map.get(name) || [];
    if (!arr.length) return `[${name}]`;
    return arr[Math.floor(Math.random() * arr.length)];
  });
  
  return { text };
}

// END OF FILE

// 预设编辑弹窗（随机数）
let numPresetModal = null;
function ensureNumPresetEditor(){
  if (numPresetModal) return numPresetModal;
  const m = document.createElement('div');
  m.className = 'modal';
  m.id = 'numPresetEditorModal';
  m.innerHTML = `
    <div class="dialog onboarding-dialog" style="max-width:640px">
      <button class="modal-x" id="closeNumPresetX" aria-label="关闭" title="关闭">×</button>
      <h3 style="margin:0 0 6px; text-align:center; color:#6db3ff">管理随机数预设</h3>
  <div id="numPresetList" class="values-list num-preset-list"></div>
      <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:12px">
        <button class="btn-glass btn-glass-secondary" id="addNumPreset">添加预设</button>
        <button class="btn-glass btn-glass-primary" id="saveNumPreset">保存</button>
      </div>
    </div>`;
  document.body.appendChild(m);
  m.addEventListener('click', (e)=>{ if (e.target===m) hideModal(numPresetModal); });
  m.querySelector('#closeNumPresetX').addEventListener('click', ()=> hideModal(numPresetModal));
  m.querySelector('#addNumPreset').addEventListener('click', ()=>{
    const list = loadNumPresets();
    list.push({ id: crypto.randomUUID?.()||String(Date.now()+Math.random()), count:1, min:1, max:6 });
    saveNumPresets(list); renderNumPresetRows();
  });
  m.querySelector('#saveNumPreset').addEventListener('click', ()=> hideModal(numPresetModal));
  numPresetModal = m;
  return m;
}
function renderNumPresetRows(){
  ensureNumPresetEditor();
  const host = numPresetModal.querySelector('#numPresetList');
  host.innerHTML='';
  const list = loadNumPresets();
  list.forEach(p=>{
    const row = document.createElement('div');
    row.className = 'num-preset-row';
    row.innerHTML = `
      <div class="np-field np-name-wrap"><div class="np-lab">名称</div><input class="np-name" type="text" placeholder="名称" value="${escapeHtml(p.name||'')}"></div>
      <div class="np-field np-count-wrap"><div class="np-lab">抽取数量</div><input class="np-count" type="number" min="1" max="10" value="${escapeHtml(String(p.count||1))}"></div>
      <div class="np-field np-min-wrap"><div class="np-lab">最小值</div><input class="np-min" type="number" value="${escapeHtml(String(p.min||1))}"></div>
      <div class="np-field np-max-wrap"><div class="np-lab">最大值</div><input class="np-max" type="number" value="${escapeHtml(String(p.max||6))}"></div>
      <div class="np-ops" style="display:flex; gap:6px; justify-content:flex-end">
        <button class="ghost mini np-del" title="删除">${ICONS.del}</button>
      </div>`;
    row.querySelector('.np-name').addEventListener('input', (e)=>{ p.name = e.target.value; saveNumPresets(list); });
    row.querySelector('.np-count').addEventListener('input', (e)=>{ let v=parseInt(e.target.value||'1',10); if (v>10){ v=10; e.target.value='10'; } p.count = Math.max(1, v||1); saveNumPresets(list); });
    row.querySelector('.np-min').addEventListener('input', (e)=>{ p.min = parseInt(e.target.value||'1',10); saveNumPresets(list); });
    row.querySelector('.np-max').addEventListener('input', (e)=>{ p.max = parseInt(e.target.value||'6',10); saveNumPresets(list); });
    row.querySelector('.np-del').addEventListener('click', async ()=>{
      const ok = await showConfirm('删除该预设？'); if (!ok) return;
      const idx = list.findIndex(x=> x.id===p.id); if (idx>=0){ list.splice(idx,1); saveNumPresets(list); renderNumPresetRows(); }
    });
    host.appendChild(row);
  });
}
function openNumPresetEditor(onCloseRefresh){
  ensureNumPresetEditor();
  renderNumPresetRows();
  showModal(numPresetModal);
  // 可选：关闭后刷新下拉
  if (typeof onCloseRefresh==='function'){
    const once = ()=>{ numPresetModal.removeEventListener('transitionend', once); onCloseRefresh(); };
    // 简化：延时调用
    setTimeout(()=> onCloseRefresh(), 350);
  }
}

// 角色详情弹窗（图鉴点击）
const roleModal = document.createElement('div');
roleModal.className = 'modal role-modal';
roleModal.innerHTML = `
  <div class="dialog role-dialog">
    <button id="closeRoleX" class="modal-x" aria-label="关闭" title="关闭">×</button>
    <div class="role-header">
      <img id="roleAvatar" class="role-avatar" src="" alt="" />
      <h3 id="roleTitle" class="role-title"></h3>
    </div>

    <div id="roleUsageList" class="role-usage">
      <div class="usage-summary">
        <div class="summary-left">
          <div class="uses-count">-- 次使用</div>
          <div class="last-used muted">上次使用：—</div>
        </div>
      </div>

      <div class="usage-list" aria-live="polite"></div>

      <div class="usage-empty" style="display:none;">
        <div class="empty-card">
          <div class="empty-illus"></div>
          <div class="empty-title">暂无使用记录</div>
          <div class="empty-desc muted">该角色尚未被任何轮次使用，或使用记录已被清除。</div>
        </div>
      </div>
    </div>

    <!-- <div class="role-footer">
      <button id="removeRoleUsage" class="btn-glass btn-glass-danger">将此角色设为可用</button>
    </div> -->
  </div>`;
document.body.appendChild(roleModal);

// 将 roleModal 提升到更高的 z-index，避免被页面上某些全局控件覆盖（如 theme-toggle）
// roleModal.style.zIndex = '2100';
// const roleDialogEl = roleModal.querySelector('.dialog');
// if (roleDialogEl) roleDialogEl.style.pointerEvents = 'auto';

let roleModalCurrentName = '';
function openRoleDetail(name){
  roleModalCurrentName = name;
  const info = (window.characterData||{})[name] || {};
  roleModal.querySelector('#roleTitle').textContent = name;
  roleModal.querySelector('#roleAvatar').src = info['头像']||'';
  renderRoleUsageList(name);
  showModal(roleModal);
}
function closeRoleDetail(){ hideModal(roleModal); roleModalCurrentName=''; }
roleModal.addEventListener('click', (e)=>{ if (e.target===roleModal) closeRoleDetail(); });
roleModal.querySelector('#closeRoleX').addEventListener('click', closeRoleDetail);

// 使用事件委托处理按钮点击，防止按钮被重新渲染后丢失监听
roleModal.addEventListener('click', async (e) => {
  let node = e.target;
  let btn = null;
  while (node && node !== roleModal) {
    if (node.nodeType === 1 && node.id === 'removeRoleUsage') { btn = node; break; }
    node = node.parentNode;
  }
  if (!btn) return;
  console.debug('removeRoleUsage clicked', { name: roleModalCurrentName, disabled: btn.disabled });
  if (btn.disabled) return;
  const name = roleModalCurrentName;
  if (!name) return;
  const ok = await showConfirm(`确定将 ${name} 设为可用？`);
  if (!ok) return;
  btn.disabled = true;
  try {
    clearRoleBPUpToCurrent(name);
  } finally {
    // 重新渲染按钮状态
    renderRoleUsageList(name);
  }
});

function renderRoleUsageList(name){
  const host = roleModal.querySelector('#roleUsageList');
  if (!host) return;

  let listContainer = host.querySelector('.usage-list');
  let emptyCard = host.querySelector('.usage-empty');
  let summaryCount = host.querySelector('.uses-count');
  let summaryLast = host.querySelector('.last-used');

  const usages = [];
  rounds.forEach((r, idx)=>{
    const matches = (r.entries||[]).filter(e=> e && e.name===name && e.p);
    if (matches.length){
      usages.push({ roundIndex: idx, roundNumber: idx+1, ps: matches.map(e=> e.p).sort((a,b)=>a-b), ignoreBp: !!r.ignoreBp, at: r.at });
    }
  });

  const totalUses = usages.reduce((acc, u)=> acc + u.ps.length, 0);

  if (!summaryCount || !summaryLast || !listContainer || !emptyCard) {
    host.innerHTML = `
      <div class="usage-summary">
        <div class="summary-left">
          <div class="uses-count">-- 次使用</div>
          <div class="last-used muted">上次使用：—</div>
        </div>
      </div>
      <div class="usage-list" aria-live="polite"></div>
      <div class="usage-empty" style="display:none;">
        <div class="empty-card">
          <div class="empty-illus"></div>
          <div class="empty-title">暂无使用记录</div>
          <div class="empty-desc muted">该角色尚未被任何轮次使用，或使用记录已被清除。</div>
        </div>
      </div>`;
    listContainer = host.querySelector('.usage-list');
    emptyCard = host.querySelector('.usage-empty');
    summaryCount = host.querySelector('.uses-count');
    summaryLast = host.querySelector('.last-used');
  }

  // Update summary
  summaryCount.textContent = `${totalUses} 次使用`;
  if (usages.length){
    const last = usages[usages.length-1];
    summaryLast.textContent = `上次使用：第 ${last.roundNumber} 轮`;
  } else {
    summaryLast.textContent = `上次使用：—`;
  }

  if (!usages.length){
    const img = pickEmptyImage();
    host.innerHTML = `<div class="empty-state" style="min-height:220px"><img src="${img}" alt="empty"/><div class="txt">暂无使用记录</div></div>`;
    const btn = roleModal.querySelector('#removeRoleUsage');
    if (btn) btn.disabled = true;
    return;
  }
  listContainer.innerHTML = '';
  {
    emptyCard.style.display = 'none';
    listContainer.style.display = '';
    const frag = document.createDocumentFragment();
    // reverse for recent-first
    const items = usages.slice().reverse().slice(0, 30);
    items.forEach(u=>{
      const item = document.createElement('div');
      item.className = 'usage-item';
      // left: round badge
      const left = document.createElement('div'); left.className = 'usage-left';
      const badge = document.createElement('div'); badge.className = 'round-badge'; badge.textContent = `第 ${u.roundNumber} 轮`;
      if (u.ignoreBp) badge.classList.add('muted-outline');
      left.appendChild(badge);

      // center: positions
      const center = document.createElement('div'); center.className = 'usage-center';
      const posLine = document.createElement('div'); posLine.className = 'pos-line';
      u.ps.forEach(p=>{
        const pspan = document.createElement('span'); pspan.className = 'pos-pill'; pspan.textContent = `${p}P`;
        posLine.appendChild(pspan);
      });
      center.appendChild(posLine);

      // right: meta
      const right = document.createElement('div'); right.className = 'usage-right';
      const timeTxt = document.createElement('div'); timeTxt.className = 'muted small';
      timeTxt.textContent = u.at ? new Date(u.at).toLocaleString() : '';
      right.appendChild(timeTxt);

      item.appendChild(left);
      item.appendChild(center);
      item.appendChild(right);

      frag.appendChild(item);
    });

    listContainer.appendChild(frag);
  }

  const btn = roleModal.querySelector('#removeRoleUsage');
  if (btn) btn.disabled = totalUses === 0;
}

function clearRoleBPUpToCurrent(name){
  // 将该角色的 BP 统计清除截止到“当前轮”（即最后一轮的索引）
  if (!rounds.length){ return; }
  const lastIdx = rounds.length - 1; // 第 N 轮的索引为 N-1
  clearedBefore[name] = Math.max(clearedBefore[name] ?? -1, lastIdx);
  rebuildUsageSetsFromRounds();
  refreshCurrentPanelFromLastRound();
  renderCatalog();
  if (document.getElementById('historySection')?.style.display==='block') renderHistory();
  renderRoleUsageList(name);
  saveSessionToCache();
}

function refreshCurrentPanelFromLastRound(){
  if (!rounds.length){ renderRoundPanel([]); return; }
  const last = rounds[rounds.length-1];
  const priorUsedBy = aggregateUsedBy(true);
  const usedAnyPrev = new Set([...priorUsedBy[1], ...priorUsedBy[2], ...priorUsedBy[3], ...priorUsedBy[4]]);
  const entries = [];
  for (let p=1;p<=4;p++){
    const e = (last.entries||[]).find(x=>x.p===p) || { p, name:'' };
    const nm = e.name || '';
    const avatarUrl = nm ? (window.characterData[nm]?.头像 || '') : '';
    if (!nm) {
      entries.push({ p, name: '', avatarUrl: '', from: e.from || 'auto', conflict: false, reason: '未选择', editable: true });
    } else {
      const character = window.characterData[nm];
      const rarity = character ? (character['星级'] === '五星' ? 'fiveStar' : 'fourStar') : null;
      const currentBpMode = typeof bpMode === 'object' ? (rarity ? bpMode[rarity] : 'off') : bpMode;
      let conflict = false;
      let reason = '';
      if (currentBpMode !== 'off') {
        conflict = (currentBpMode === 'personal') ? priorUsedBy[p].has(nm) : usedAnyPrev.has(nm);
        if (conflict) {
          if (currentBpMode === 'personal') {
            reason = `${p}P 已使用过 ${nm}`;
          } else {
            const info = getLastUsageInfo(nm, true);
            if (info) {
              const psTxt = info.ps.map(x => `${x}P`).join(' / ');
              reason = `${nm} 在第${info.round}轮已被 ${psTxt} 使用`;
            } else {
              reason = `${nm} 已被使用（全局BP）`;
            }
          }
        }
      }
      entries.push({ p, name: nm, avatarUrl, from: e.from || 'auto', conflict, reason, editable: true });
    }
  }
  renderRoundPanel(entries);
}

// Custom BP Modal
function openCustomBpModal() {
  const customBpModal = document.getElementById('customBpModal');
  if (!customBpModal) { console.warn('customBpModal element not found'); return; }
  updateCustomBpModalUI();
  showModal(customBpModal);
}

function closeCustomBpModal() {
  const customBpModal = document.getElementById('customBpModal');
  if (!customBpModal) return;
  hideModal(customBpModal);
}

function updateCustomBpModalUI() {
  const customBpModal = document.getElementById('customBpModal');
  if (!customBpModal) return;
  const fiveStarMode = (typeof bpMode === 'object') ? bpMode.fiveStar : 'global';
  const fourStarMode = (typeof bpMode === 'object') ? bpMode.fourStar : 'global';

  const fiveStarButtons = customBpModal.querySelector('[data-rarity="fiveStar"]');
  if (fiveStarButtons) {
    fiveStarButtons.querySelectorAll('button').forEach(b => {
      b.classList.toggle('primary', b.dataset.mode === fiveStarMode);
    });
  }
  const fourStarButtons = customBpModal.querySelector('[data-rarity="fourStar"]');
  if (fourStarButtons) {
    fourStarButtons.querySelectorAll('button').forEach(b => {
      b.classList.toggle('primary', b.dataset.mode === fourStarMode);
    });
  }
}

// Attach modal event handlers when DOM element exists. If the script runs
// before the modal is present in the DOM, wait for DOMContentLoaded and try again.
function attachCustomBpModalHandlers() {
  const customBpModal = document.getElementById('customBpModal');
  if (!customBpModal) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', attachCustomBpModalHandlers, { once: true });
      return;
    }
    console.warn('customBpModal element not found after DOMContentLoaded');
    return;
  }

  const closeBtn = document.getElementById('closeCustomBpModalX');
  if (closeBtn) closeBtn.addEventListener('click', closeCustomBpModal);

  customBpModal.addEventListener('click', (e) => {
    if (e.target.id === 'customBpModal') closeCustomBpModal();
  });

  const buttons = customBpModal.querySelectorAll('.bp-options button');
  if (buttons && buttons.length) {
    buttons.forEach(button => {
      button.addEventListener('click', () => {
        const rarity = button.parentElement.dataset.rarity;
        const mode = button.dataset.mode;
        if (typeof bpMode !== 'object') {
          bpMode = { fourStar: 'global', fiveStar: 'global' };
        }
        bpMode[rarity] = mode;
        updateCustomBpModalUI();
      });
    });
  }

  const saveBtn = document.getElementById('saveCustomBp');
  if (!saveBtn) {
    console.warn('saveCustomBp element not found inside customBpModal');
    return;
  }
  saveBtn.addEventListener('click', () => {
    if (typeof bpMode !== 'object') {
      bpMode = { fourStar: 'global', fiveStar: 'global' };
    }
    saveSessionToCache();
    rebuildUsageSetsFromRounds();
    updateModeUI();
    refreshCurrentPanelFromLastRound();
    if (document.getElementById('historySection')?.style.display === 'block') {
      renderHistory();
    }
    renderCatalog();
    closeCustomBpModal();
  });
}

attachCustomBpModalHandlers();

// Update bp mode display text under the results area
function updateBpModeText(){
  const el = document.getElementById('bpModeText');
  if (!el) return;
  if (!bpMode) { el.textContent = ''; return; }

  // normalize to object form for easier handling
  let five = null, four = null;
  if (typeof bpMode === 'string') {
    five = bpMode; four = bpMode;
  } else if (typeof bpMode === 'object') {
    five = bpMode.fiveStar || null;
    four = bpMode.fourStar || null;
  }

  // all-off case
  if ((five === 'off' && four === 'off') || (typeof bpMode === 'string' && bpMode === 'off')){
    el.textContent = 'BP模式已关闭';
    return;
  }

  // both global
  if (five === 'global' && four === 'global'){
    el.textContent = '全局BP模式';
    return;
  }
  // both personal
  if (five === 'personal' && four === 'personal'){
    el.textContent = '个人BP模式';
    return;
  }

  // otherwise show per-rarity text: 五星xxBP 四星xxBP模式
  const mapMode = (m) => {
    if (!m) return '';
    if (m === 'global') return '全局';
    if (m === 'personal') return '个人';
    if (m === 'off') return '关闭';
    return m;
  };
  const fiveText = five ? `五星${mapMode(five)}BP` : '';
  const fourText = four ? `四星${mapMode(four)}BP` : '';
  const parts = [];
  if (fiveText) parts.push(fiveText);
  if (fourText) parts.push(fourText);
  if (parts.length===0) { el.textContent = ''; return; }
  el.textContent = parts.join(' ') + '模式';
}
