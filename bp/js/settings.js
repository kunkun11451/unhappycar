(function(){
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const closeSettingsModalX = document.getElementById('closeSettingsModalX');

  function openSettings(){
    if(settingsModal) {
        showModal(settingsModal);
    }
  }

  function closeSettings(){
    if(settingsModal) {
        hideModal(settingsModal);
    }
  }

  if(settingsBtn) settingsBtn.addEventListener('click', openSettings);
  if(closeSettingsModalX) closeSettingsModalX.addEventListener('click', closeSettings);
  
  if(settingsModal) {
      settingsModal.addEventListener('click', (e) => {
          if(e.target === settingsModal) closeSettings();
      });
  }
})();

// Desktop App Integration
window.syncDesktopSettings = function(hotkey, randomToolHotkey) {
    const desktopSection = document.getElementById('desktopSettingsSection');
    if(desktopSection) desktopSection.style.display = 'flex';
    
    const hotkeyInput = document.getElementById('desktopHotkeyInput');
    const randomHotkeyInput = document.getElementById('desktopRandomToolHotkeyInput');
    
    if(hotkeyInput) hotkeyInput.value = hotkey;
    if(randomHotkeyInput) randomHotkeyInput.value = randomToolHotkey || '6';
};

document.addEventListener('DOMContentLoaded', () => {
    const hotkeyInput = document.getElementById('desktopHotkeyInput');
    const randomHotkeyInput = document.getElementById('desktopRandomToolHotkeyInput');
    
    function sendSettingsToDesktop() {
        if(window.chrome && window.chrome.webview && window.chrome.webview.postMessage) {
            window.chrome.webview.postMessage(JSON.stringify({
                type: 'updateSettings',
                hotkey: hotkeyInput ? hotkeyInput.value : '',
                randomToolHotkey: randomHotkeyInput ? randomHotkeyInput.value : '6'
            }));
        }
    }
    
    function bindHotkeyRecorder(inputEl, defaultPlaceholder) {
        if(!inputEl) return;
        inputEl.addEventListener('focus', () => {
            inputEl.value = '';
            inputEl.placeholder = '请按下快捷键...';
        });

        inputEl.addEventListener('blur', () => {
            inputEl.placeholder = defaultPlaceholder;
        });

        inputEl.addEventListener('keydown', (e) => {
            e.preventDefault();
            e.stopPropagation();

            let key = e.key;
            if(['Control', 'Shift', 'Alt', 'Meta'].includes(key)) return;

            let keys = [];
            if(e.ctrlKey) keys.push('Ctrl');
            if(e.altKey) keys.push('Alt');
            if(e.shiftKey) keys.push('Shift');
            
            if(key.length === 1 && /[a-z]/.test(key)) {
                key = key.toUpperCase();
            } else if (key === ' ') {
                key = 'Space';
            }
            
            keys.push(key);
            inputEl.value = keys.join('+');
            sendSettingsToDesktop();
            inputEl.blur();
        });
    }

    bindHotkeyRecorder(hotkeyInput, '默认: 5');
    bindHotkeyRecorder(randomHotkeyInput, '默认: 6');
    
    // Automatically show if desktop app has injected flag earlier
    if (window.isDesktopApp) {
        const desktopSection = document.getElementById('desktopSettingsSection');
        if(desktopSection) desktopSection.style.display = 'flex';
    }
});
