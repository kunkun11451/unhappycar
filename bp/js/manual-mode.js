(function() {
    // const modeToggleBtn = document.getElementById('modeToggleBtn'); // Removed
    // const modeDropdown = document.getElementById('modeDropdown'); // Removed
    const modeSwitchGroup = document.getElementById('modeSwitchGroup');
    const panelTitle = document.getElementById('panelTitle');
    const panelActions = document.querySelector('.panel-actions');
    const uploadHints = document.querySelector('.upload-hints');
    const roundTitle = document.querySelector('.round-title');
    const prevRoundBtn = document.getElementById('prevRoundBtn');
    const nextRoundBtn = document.getElementById('nextRoundBtn');
    const roundNoEl = document.getElementById('roundNo');
    // const modeItems = modeDropdown.querySelectorAll('.action-item'); // Removed

    const roundSlots = document.getElementById('roundSlots');

    let isManualMode = false;
    let manualRoundIndex = -1;

    // Create "Select Characters" button
    const selectCharsBtn = document.createElement('button');
    selectCharsBtn.id = 'manualSelectBtn';
    selectCharsBtn.className = 'btn-glass btn-glass-primary';
    selectCharsBtn.textContent = '选择角色';
    selectCharsBtn.style.display = 'none';
    selectCharsBtn.style.margin = '15px auto';
    
    // Insert button after panel header
    const panelHeader = document.querySelector('.panel-header');
    panelHeader.parentNode.insertBefore(selectCharsBtn, panelHeader.nextSibling);

    // Mode Selection
    const modeSwitchBtn = document.getElementById('modeSwitchBtn');
    if (modeSwitchBtn) {
        modeSwitchBtn.addEventListener('click', () => {
            const newMode = isManualMode ? 'screenshot' : 'manual';
            setMode(newMode);
        });
    }

    function setMode(mode) {
        isManualMode = (mode === 'manual');
        window.isManualMode = isManualMode;

        // Update button text
        if (modeSwitchBtn) {
            modeSwitchBtn.textContent = isManualMode ? '手动选择' : '截图识别';
            if (isManualMode) modeSwitchBtn.classList.add('active');
            else modeSwitchBtn.classList.remove('active');
        }

        if (isManualMode) {
            // Manual Mode UI
            panelTitle.textContent = '手动选择';
            if (panelActions) panelActions.style.display = 'none';
            if (uploadHints) uploadHints.style.display = 'none';
            if (roundTitle) roundTitle.style.display = 'none';
            
            selectCharsBtn.style.display = 'flex';
            prevRoundBtn.style.display = 'inline-flex';
            nextRoundBtn.style.display = 'inline-flex';

            // Initialize manual index to the end (New Round)
            manualRoundIndex = rounds.length;
            updateManualView();

        } else {
            // Screenshot Mode UI
            panelTitle.textContent = '上传截图与识别';
            if (panelActions) panelActions.style.display = 'flex';
            if (uploadHints) uploadHints.style.display = 'block';
            if (roundTitle) roundTitle.style.display = 'block';
            
            selectCharsBtn.style.display = 'none';
            prevRoundBtn.style.display = 'none';
            nextRoundBtn.style.display = 'none';

            // Restore view to the last round
            if (rounds.length > 0) {
                renderRoundPanel(computeRoundDisplayForIndex(rounds.length - 1));
                renderRoundNo();
            } else {
                renderRoundPanel(null);
            }
        }
        
        if (window.saveSessionToCache) window.saveSessionToCache();
    }

    // Expose setMode
    window.setManualMode = setMode;

    // Restore mode from cache if available
    if (typeof window.isManualMode === 'boolean') {
        setMode(window.isManualMode ? 'manual' : 'screenshot');
    }

    // Expose reset function for app.js
    window.resetManualModeState = function() {
        manualRoundIndex = 0;
        updateManualView();
    };

    // Navigation
    prevRoundBtn.addEventListener('click', () => {
        if (manualRoundIndex > 0) {
            manualRoundIndex--;
            updateManualView();
        }
    });

    nextRoundBtn.addEventListener('click', () => {
        if (manualRoundIndex < rounds.length) {
            manualRoundIndex++;
            updateManualView();
        }
    });

    function updateManualView() {
        // Update buttons state
        prevRoundBtn.disabled = (manualRoundIndex <= 0);
        nextRoundBtn.disabled = (manualRoundIndex >= rounds.length);
        
        // Render the round
        if (manualRoundIndex < rounds.length) {
            // Existing round
            const roundData = computeRoundDisplayForIndex(manualRoundIndex);
            renderRoundPanel(roundData);
            roundNoEl.textContent = `(第${manualRoundIndex + 1}轮)`;
        } else {
            // New Round
            const blankRound = [
                { p:1, name:'', conflict:false, reason:'待选择', avatarUrl:'' },
                { p:2, name:'', conflict:false, reason:'待选择', avatarUrl:'' },
                { p:3, name:'', conflict:false, reason:'待选择', avatarUrl:'' },
                { p:4, name:'', conflict:false, reason:'待选择', avatarUrl:'' }
            ];
            renderRoundPanel(blankRound);
            roundNoEl.textContent = `(第${manualRoundIndex + 1}轮)`;
        }
    }

    // Multi-select Logic
    selectCharsBtn.addEventListener('click', () => {
        // Get current names
        let initialNames = [null, null, null, null];
        if (manualRoundIndex < rounds.length) {
            const round = rounds[manualRoundIndex];
            if (round && round.entries) {
                round.entries.forEach(e => {
                    if (e.p >= 1 && e.p <= 4) {
                        initialNames[e.p - 1] = e.name;
                    }
                });
            }
        } else {
             // Try to read from DOM for new round (in case mixed usage)
            const roundSlots = document.getElementById('roundSlots');
            if (roundSlots) {
                for (let i=0; i<4; i++) {
                    const slot = roundSlots.children[i];
                    const nmText = (slot?.querySelector('.name')?.textContent || '').trim();
                    initialNames[i] = (nmText === '' || nmText === '——') ? null : nmText;
                }
            }
        }

        // Open picker in multi-select mode
        window.openPickerMultiSelect(initialNames, (selectedNames) => {
            const currentNames = [];
            // Fill slots 1-4 with selected names, or empty if not enough selected
            for (let i=1; i<=4; i++) {
                const name = selectedNames[i-1] || '';
                currentNames.push({ p:i, name: normalizeName(name) });
            }

            // Update rounds array
            if (manualRoundIndex === rounds.length) {
                rounds.push({
                    at: new Date().toISOString(),
                    entries: currentNames.map(e => ({ p:e.p, name: e.name, from: 'manual' }))
                });
            } else {
                const targetRound = rounds[manualRoundIndex];
                const newEntries = (targetRound.entries || []).slice();
                for (let i=1; i<=4; i++) {
                    const nm = currentNames[i-1].name;
                    newEntries[i-1] = { p:i, name:nm, from: 'manual' };
                }
                targetRound.entries = newEntries;
            }

            rebuildUsageSetsFromRounds();
            renderCatalog();
            renderHistory();
            saveSessionToCache();
            updateManualView();
        });
    });

    // Override applyManual
    const originalApplyManual = window.applyManual;
    window.applyManual = function(p, name) {
        if (!isManualMode) {
            return originalApplyManual(p, name);
        }

        // Manual Mode Logic
        const selNameNorm = normalizeName(name);
        
        // 1. Get current names from DOM
        const currentNames = [];
        const roundSlots = document.getElementById('roundSlots');
        for (let i=1; i<=4; i++) {
            const slot = roundSlots.children[i-1];
            const nmText = (slot?.querySelector('.name')?.textContent || '').trim();
            const nmRaw = (i === p ? selNameNorm : (nmText === '' || nmText === '——' ? '' : nmText));
            const nm = normalizeName(nmRaw);
            currentNames.push({ p:i, name:nm });
        }

        // 2. Update rounds array
        if (manualRoundIndex === rounds.length) {
            // Creating a new round
            rounds.push({
                at: new Date().toISOString(),
                entries: currentNames.map(e => ({ p:e.p, name: e.name, from: (e.p === p ? 'manual' : 'auto') }))
            });
            // manualRoundIndex is now pointing to the newly created round
        } else {
            // Updating existing round
            const targetRound = rounds[manualRoundIndex];
            const newEntries = (targetRound.entries || []).slice();
            for (let i=1; i<=4; i++) {
                const prev = newEntries.find(x => x.p === i) || { p:i, name:'' };
                const nm = currentNames[i-1].name;
                newEntries[i-1] = { p:i, name:nm, from: (i === p ? 'manual' : (prev.from || 'auto')) };
            }
            targetRound.entries = newEntries;
        }

        // 3. Rebuild usage and refresh view
        rebuildUsageSetsFromRounds();
        renderCatalog();
        renderHistory();
        saveSessionToCache();

        // Refresh current view
        updateManualView();
    };

})();
