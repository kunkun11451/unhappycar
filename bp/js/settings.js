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
window.syncDesktopSettings = function(title, hotkey) {
    const desktopSection = document.getElementById('desktopSettingsSection');
    if(desktopSection) desktopSection.style.display = 'flex';
    
    const titleInput = document.getElementById('desktopWindowTitleInput');
    const hotkeyInput = document.getElementById('desktopHotkeyInput');
    
    if(titleInput) titleInput.value = title;
    if(hotkeyInput) hotkeyInput.value = hotkey;
};

document.addEventListener('DOMContentLoaded', () => {
    const titleInput = document.getElementById('desktopWindowTitleInput');
    const hotkeyInput = document.getElementById('desktopHotkeyInput');
    
    function sendSettingsToDesktop() {
        if(window.chrome && window.chrome.webview && window.chrome.webview.postMessage) {
            window.chrome.webview.postMessage(JSON.stringify({
                type: 'updateSettings',
                windowTitle: titleInput.value,
                hotkey: hotkeyInput.value
            }));
        }
    }

    if(titleInput) titleInput.addEventListener('change', sendSettingsToDesktop);
    
    if(hotkeyInput) {
        hotkeyInput.addEventListener('focus', () => {
            hotkeyInput.value = '';
            hotkeyInput.placeholder = '请按下快捷键...';
        });

        hotkeyInput.addEventListener('blur', () => {
            hotkeyInput.placeholder = '默认: 5';
            if (!hotkeyInput.value && window.chrome && window.chrome.webview) {
                // If they clicked away without setting, we could revert to a saved value, but here we just let it be.
            }
        });

        hotkeyInput.addEventListener('keydown', (e) => {
            e.preventDefault();
            e.stopPropagation();

            let key = e.key;
            // Ignore if only modifiers are pressed
            if(['Control', 'Shift', 'Alt', 'Meta'].includes(key)) return;

            let keys = [];
            if(e.ctrlKey) keys.push('Ctrl');
            if(e.altKey) keys.push('Alt');
            if(e.shiftKey) keys.push('Shift');
            
            // Format some common keys
            if(key.length === 1 && /[a-z]/.test(key)) {
                key = key.toUpperCase();
            } else if (key === ' ') {
                key = 'Space';
            }
            
            keys.push(key);
            hotkeyInput.value = keys.join('+');
            sendSettingsToDesktop();
            hotkeyInput.blur(); // Remove focus after setting
        });
    }
    
    // Automatically show if desktop app has injected flag earlier
    if (window.isDesktopApp) {
        const desktopSection = document.getElementById('desktopSettingsSection');
        if(desktopSection) desktopSection.style.display = 'flex';
    }
});
