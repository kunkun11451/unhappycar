document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const charCountInput = document.getElementById('char-count');
    const drawCharactersBtn = document.getElementById('draw-characters');
    const resetGameBtn = document.getElementById('reset-game');
    const characterDisplay = document.getElementById('character-display');
    const characterResultText = document.getElementById('character-result-text');
    const copyCharactersBtn = document.getElementById('copy-characters-btn');
    const banListTableBody = document.querySelector('#ban-list-table tbody');
    const fullCharacterGrid = document.getElementById('full-character-grid');
    const orderToggle = document.getElementById('order-toggle');

    // State
    let banListByRound = []; // For table display only
    let globalBanList = new Set(); // Single source of truth for banned characters
    let currentDrawnCharacters = [];
    let currentSkillBans = '';
    let currentRound = 1;
    let currentOrder = [];

    // --- Functions ---

    function loadState() {
        const savedState = localStorage.getItem('genshinPickerState');
        if (savedState) {
            const state = JSON.parse(savedState);
            banListByRound = state.banListByRound || [];
            currentRound = state.currentRound || 1;
            if (state.globalBanList) {
                globalBanList = new Set(state.globalBanList);
            } else {
                globalBanList = new Set(banListByRound.flat());
            }
        }
        updateBanListDisplay();
        populateFullCharacterList();
    }

    function saveState() {
        const state = {
            banListByRound,
            currentRound,
            globalBanList: Array.from(globalBanList)
        };
        localStorage.setItem('genshinPickerState', JSON.stringify(state));
    }

    function updateBanListDisplay() {
        banListTableBody.innerHTML = '';
        banListByRound.forEach((roundBans, index) => {
            const row = banListTableBody.insertRow();
            const roundCell = row.insertCell(0);
            const bansCell = row.insertCell(1);
            roundCell.textContent = index + 1;
            bansCell.textContent = roundBans.join(', ');
        });
    }

    function setBanStatus(charName, shouldBeBanned) {
        const card = fullCharacterGrid.querySelector(`[data-name="${charName}"]`);
        if (shouldBeBanned) {
            globalBanList.add(charName);
            if (card) card.classList.add('banned');
        } else {
            globalBanList.delete(charName);
            if (card) card.classList.remove('banned');
        }
        saveState();
    }

    function toggleBanStatus(charName) {
        // Used by the full character list for manual toggling
        setBanStatus(charName, !globalBanList.has(charName));
    }

    function createCharacterCard(charName, charData, isFullListCard = false) {
        const card = document.createElement('div');
        card.className = 'character-card';
        card.dataset.name = charName;

        if (charData['星级'] === '五星') card.classList.add('star-five');
        else card.classList.add('star-four');

        const img = document.createElement('img');
        img.src = charData['头像'];
        img.alt = charName;

        const nameDiv = document.createElement('div');
        nameDiv.className = 'name';
        nameDiv.textContent = charName;

        card.appendChild(img);
        card.appendChild(nameDiv);

        if (isFullListCard) {
            card.addEventListener('click', () => toggleBanStatus(charName));
        } else {
            // For drawn characters, clicking syncs the ban status
            card.addEventListener('click', () => {
                card.classList.toggle('used');
                const isPicked = !card.classList.contains('used');
                setBanStatus(card.dataset.name, isPicked);
            });
        }

        return card;
    }

    function populateFullCharacterList() {
        fullCharacterGrid.innerHTML = '';
        const allCharacters = Object.keys(window.characterData); // Removed alphabetical sort

        allCharacters.forEach(charName => {
            const card = createCharacterCard(charName, window.characterData[charName], true);
            if (globalBanList.has(charName)) {
                card.classList.add('banned');
            }
            fullCharacterGrid.appendChild(card);
        });
    }

    function handleDraw() {
        // 1. Record the picked characters from the PREVIOUS round for the table display
        if (currentDrawnCharacters.length > 0) {
            const pickedLastRound = [];
            characterDisplay.querySelectorAll('.character-card').forEach(card => {
                if (!card.classList.contains('used')) {
                    pickedLastRound.push(card.dataset.name);
                }
            });
            if (pickedLastRound.length > 0) {
                banListByRound.push(pickedLastRound);
                currentRound++;
            }
        }

        // 2. Get available characters for the new draw
        const allCharacters = Object.keys(window.characterData);
        const availableCharacters = allCharacters.filter(char => !globalBanList.has(char));
        
        // 3. Validate count
        const count = parseInt(charCountInput.value, 10);
        if (isNaN(count) || count < 4 || count > 8) {
            alert('请选择4到8之间的角色数量。');
            return;
        }
        if (availableCharacters.length < count) {
            alert(`可用角色不足 ${count} 位！请重置游戏或减少抽取数量。`);
            return;
        }

        // 4. Draw new characters
        const shuffled = availableCharacters.sort(() => 0.5 - Math.random());
        currentDrawnCharacters = shuffled.slice(0, count);

        // 5. Display new characters and set their default state to "picked" (banned)
        characterDisplay.innerHTML = '';
        currentDrawnCharacters.forEach(charName => {
            setBanStatus(charName, true); // Add to global ban list by default
            const card = createCharacterCard(charName, window.characterData[charName], false);
            characterDisplay.appendChild(card);
        });

        // 6. Handle skills and result text
        const skills = ['A', 'E', 'Q'];
        const shuffledSkills = skills.sort(() => 0.5 - Math.random());
        currentSkillBans = `${shuffledSkills[0]}-${shuffledSkills[1]}-${shuffledSkills[2]}`;
        // 顺序抽取显示（1,2,3,4 随机排序），统一写入 character-result-text
        if (orderToggle && orderToggle.checked) {
            const base = [1, 2, 3, 4];
            currentOrder = base.sort(() => 0.5 - Math.random());
        } else {
            currentOrder = [];
        }
        const orderPart = (orderToggle && orderToggle.checked && Array.isArray(currentOrder) && currentOrder.length === 4)
            ? `顺序${currentOrder.join('→')};`
            : '';
        const combinedResult = `${orderPart}${currentDrawnCharacters.join(' ')};${currentSkillBans}`;
        characterResultText.textContent = combinedResult;

        // 7. Update displays
        saveState();
        updateBanListDisplay();
        populateFullCharacterList();
    }

    function handleCopy(textToCopy, buttonElement) {
        if (!textToCopy || textToCopy.trim() === '') return;
        navigator.clipboard.writeText(textToCopy).then(() => {
            if (buttonElement.classList.contains('copied')) return;
            buttonElement.classList.add('copied');
            setTimeout(() => buttonElement.classList.remove('copied'), 1500);
        }).catch(err => console.error('Copy failed:', err));
    }

    function performReset() {
        banListByRound = [];
        globalBanList.clear();
        currentDrawnCharacters = [];
        currentSkillBans = '';
    currentRound = 1;
    currentOrder = [];
        
        localStorage.removeItem('genshinPickerState');
        
    characterDisplay.innerHTML = '';
    characterResultText.textContent = '';
        updateBanListDisplay();
        populateFullCharacterList();
    }

    function showResetConfirmationModal() {
        const overlay = document.createElement("div");
        overlay.id = "resetOverlay";
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(5px);
            z-index: 10000; display: flex; justify-content: center; align-items: center;
            opacity: 0; transition: opacity 0.3s ease;
        `;

        const modal = document.createElement("div");
        modal.style.cssText = `
            background: rgba(40, 40, 40, 0.8); backdrop-filter: blur(15px);
            border-radius: 15px; padding: 30px; max-width: 400px; width: 90%;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.2);
            transform: scale(0.9); transition: transform 0.3s ease; text-align: center;
        `;

        const title = document.createElement("h2");
        title.textContent = "确认重置游戏？";
        title.style.cssText = `color: #e74c3c; margin-top: 0; margin-bottom: 10px; text-shadow: none; border: none;`;
        
        const message = document.createElement("p");
        message.textContent = "将清空Ban List和当前抽取的角色。";
        message.style.cssText = `color: #ecf0f1; margin-bottom: 25px;`;

        const buttonContainer = document.createElement("div");
        buttonContainer.style.cssText = `display: flex; justify-content: center; gap: 15px;`;

        const confirmButton = document.createElement("button");
        confirmButton.textContent = "确认重置";
        confirmButton.style.cssText = `
            background: rgba(231, 76, 60, 0.8); border: 1px solid rgba(231, 76, 60, 1);
            color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer;
            transition: all 0.3s ease; font-weight: bold;
        `;

        const cancelButton = document.createElement("button");
        cancelButton.textContent = "取消";
        cancelButton.style.cssText = `
            background: rgba(255, 255, 255, 0.2); border: 1px solid rgba(255, 255, 255, 0.3);
            color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer;
            transition: all 0.3s ease;
        `;

        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(confirmButton);
        modal.appendChild(title);
        modal.appendChild(message);
        modal.appendChild(buttonContainer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        setTimeout(() => {
            overlay.style.opacity = '1';
            modal.style.transform = 'scale(1)';
        }, 10);

        const hideModal = () => {
            overlay.style.opacity = '0';
            modal.style.transform = 'scale(0.9)';
            setTimeout(() => document.body.removeChild(overlay), 300);
        };

        confirmButton.addEventListener("click", () => {
            performReset();
            hideModal();
        });
        
        cancelButton.addEventListener("click", hideModal);
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) hideModal();
        });
    }

    // --- Event Listeners ---
    drawCharactersBtn.addEventListener('click', handleDraw);
    if (orderToggle) {
        orderToggle.addEventListener('change', () => {
            if (orderToggle.checked) {
                if (!(Array.isArray(currentOrder) && currentOrder.length === 4)) {
                    const base = [1, 2, 3, 4];
                    currentOrder = base.sort(() => 0.5 - Math.random());
                }
                if (currentDrawnCharacters.length > 0) {
                    const prefix = `顺序${currentOrder.join('→')};`;
                    characterResultText.textContent = `${prefix}${currentDrawnCharacters.join(' ')};${currentSkillBans}`;
                } else {
                    characterResultText.textContent = `顺序${currentOrder.join('→')}`;
                }
            } else {
                // 关闭时：若已有结果，则不立即移除顺序显示；仅在无结果时清空
                currentOrder = [];
                if (currentDrawnCharacters.length === 0) {
                    characterResultText.textContent = '';
                }
            }
        });
    }
    copyCharactersBtn.addEventListener('click', () => {
        if (currentDrawnCharacters.length === 0) return;
        const orderPart = (orderToggle && orderToggle.checked && Array.isArray(currentOrder) && currentOrder.length === 4)
            ? `顺序${currentOrder.join('→')};`
            : '';
        const combinedResult = `${orderPart}${currentDrawnCharacters.join(' ')};${currentSkillBans}`;
        handleCopy(combinedResult, copyCharactersBtn);
    });
    resetGameBtn.addEventListener('click', showResetConfirmationModal);

    function matchPinyinInitials(text, searchTerm, pinyinFn) {
        const pinyinResult = pinyinFn(text, { pattern: 'first', toneType: 'none' });
        const initials = pinyinResult.split(' ');
        const fullInitialsString = initials.join('');

        const startIndex = fullInitialsString.indexOf(searchTerm);

        if (startIndex !== -1) {
            const matchedPositions = [];
            for (let i = 0; i < searchTerm.length; i++) {
                matchedPositions.push(startIndex + i);
            }
            return { match: true, matchedPositions };
        }
        
        return { match: false, matchedPositions: [] };
    }

    function setupCharacterSearch(inputId, containerSelector, itemSelector, nameSelector, nameDatasetKey, clearFiltersCallback) {
        const searchInput = document.getElementById(inputId);
        if (!searchInput) return;
        
        const hasPinyinSupport = typeof window.pinyinPro !== 'undefined' && 
                                typeof window.pinyinPro.pinyin === 'function';
        
        if (!hasPinyinSupport) {
            console.warn('pinyinPro库未加载，拼音搜索功能将不可用');
        }

        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            
            if (searchTerm !== '' && clearFiltersCallback) {
                clearFiltersCallback();
            }
            
            const container = document.querySelector(containerSelector);
            const items = container.querySelectorAll(itemSelector);

            items.forEach(item => {
                const nameElement = item.querySelector(nameSelector);
                const itemName = item.dataset[nameDatasetKey];
                if (!itemName || !nameElement) return;

                nameElement.textContent = itemName;
                let highlightedHTML = itemName;
                let match = false;

                if (searchTerm === '') {
                    match = true;
                } else if (itemName.toLowerCase().includes(searchTerm)) {
                    match = true;
                    const regex = new RegExp(searchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
                    highlightedHTML = itemName.replace(regex, `<span style="background-color: yellow; color: black; font-weight: bold;">$&</span>`);
                } else if (hasPinyinSupport) {
                    const { pinyin } = window.pinyinPro;
                    const matchResult = matchPinyinInitials(itemName, searchTerm, pinyin);
                    
                    if (matchResult.match) {
                        match = true;
                        highlightedHTML = '';
                        for (let i = 0; i < itemName.length; i++) {
                            if (matchResult.matchedPositions.includes(i)) {
                                highlightedHTML += `<span style="background-color: yellow; color: black; font-weight: bold;">${itemName[i]}</span>`;
                            } else {
                                highlightedHTML += itemName[i];
                            }
                        }
                    }
                }

                item.style.display = match ? '' : 'none';
                nameElement.innerHTML = highlightedHTML;
            });
        });
    }

    // --- Initial Load ---
    loadState();
    setupCharacterSearch('character-search', '#full-character-grid', '.character-card', '.name', 'name');
});
