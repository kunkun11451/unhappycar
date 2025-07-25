document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const charCountInput = document.getElementById('char-count');
    const drawCharactersBtn = document.getElementById('draw-characters');
    const resetGameBtn = document.getElementById('reset-game');
    const characterDisplay = document.getElementById('character-display');
    const characterResultText = document.getElementById('character-result-text');
    const copyCharactersBtn = document.getElementById('copy-characters-btn');
    const banListTableBody = document.querySelector('#ban-list-table tbody');

    // State
    let banListByRound = []; // Array of arrays, e.g., [[round1_char1, r1_c2], [r2_c1, r2_c2]]
    let currentDrawnCharacters = [];
    let currentSkillBans = '';
    let currentRound = 1;

    // --- Functions ---

    function loadState() {
        const savedState = localStorage.getItem('genshinPickerState');
        if (savedState) {
            const state = JSON.parse(savedState);
            banListByRound = state.banListByRound || [];
            currentRound = state.currentRound || 1;
        }
        updateBanListDisplay();
    }

    function saveState() {
        const state = {
            banListByRound,
            currentRound
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

    function createCharacterCard(charName, charData) {
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

        // Click to mark as "unused" - this no longer affects the ban list logic directly
        card.addEventListener('click', () => {
            card.classList.toggle('used');
        });

        return card;
    }

    function handleDraw() {
        // 1. Add picked characters from the PREVIOUS round to the ban list
        if (currentDrawnCharacters.length > 0) {
            const pickedThisRound = [];
            characterDisplay.querySelectorAll('.character-card').forEach(card => {
                if (!card.classList.contains('used')) {
                    pickedThisRound.push(card.dataset.name);
                }
            });
            if (pickedThisRound.length > 0) {
                banListByRound.push(pickedThisRound);
                currentRound++;
            }
        }

        // 2. Get all currently banned characters for drawing logic
        const allBannedChars = banListByRound.flat();
        const allCharacters = Object.keys(window.characterData);
        const availableCharacters = allCharacters.filter(char => !allBannedChars.includes(char));
        
        // 3. Get draw count and validate
        const count = parseInt(charCountInput.value, 10);
        if (isNaN(count) || count < 4 || count > 8) {
            alert('请选择4到8之间的角色数量。');
            return;
        }
        if (availableCharacters.length < count) {
            alert(`可用角色不足 ${count} 位！请重置游戏或减少抽取数量。`);
            return;
        }

        // 4. Shuffle and draw characters
        const shuffled = availableCharacters.sort(() => 0.5 - Math.random());
        currentDrawnCharacters = shuffled.slice(0, count);

        // 5. Display characters
        characterDisplay.innerHTML = '';
        currentDrawnCharacters.forEach(charName => {
            const card = createCharacterCard(charName, window.characterData[charName]);
            characterDisplay.appendChild(card);
        });

        // 6. Draw skills and combine results
        const skills = ['A', 'E', 'Q'];
        const shuffledSkills = skills.sort(() => 0.5 - Math.random());
        currentSkillBans = `${shuffledSkills[0]}-${shuffledSkills[1]}-${shuffledSkills[2]}`;
        
        const combinedResult = `${currentDrawnCharacters.join(' ')};${currentSkillBans}`;
        characterResultText.textContent = combinedResult;

        // 7. Update state and display
        saveState();
        updateBanListDisplay();
    }

    function handleCopy(textToCopy, buttonElement) {
        if (!textToCopy || textToCopy.trim() === '') {
            return;
        }

        navigator.clipboard.writeText(textToCopy).then(() => {
            if (buttonElement.classList.contains('copied')) return; // Prevent re-triggering animation

            buttonElement.classList.add('copied');
            
            setTimeout(() => {
                buttonElement.classList.remove('copied');
            }, 1500);
        }).catch(err => {
            console.error('Copy failed:', err);
        });
    }

    function performReset() {
        banListByRound = [];
        currentDrawnCharacters = [];
        currentSkillBans = '';
        currentRound = 1;
        
        localStorage.removeItem('genshinPickerState');
        
        characterDisplay.innerHTML = '';
        characterResultText.textContent = '';
        updateBanListDisplay();
    }

    function showResetConfirmationModal() {
        // --- Modal Creation ---
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

        // --- Show Animation ---
        setTimeout(() => {
            overlay.style.opacity = '1';
            modal.style.transform = 'scale(1)';
        }, 10);

        // --- Event Listeners ---
        const hideModal = () => {
            overlay.style.opacity = '0';
            modal.style.transform = 'scale(0.9)';
            setTimeout(() => {
                document.body.removeChild(overlay);
            }, 300);
        };

        confirmButton.addEventListener("click", () => {
            performReset();
            hideModal();
        });
        
        cancelButton.addEventListener("click", hideModal);
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) {
                hideModal();
            }
        });
    }

    function handleResetGame() {
        showResetConfirmationModal();
    }

    // --- Event Listeners ---
    drawCharactersBtn.addEventListener('click', handleDraw);
    copyCharactersBtn.addEventListener('click', () => {
        if (currentDrawnCharacters.length === 0) {
            // Prevent copying when there's nothing to copy
            return;
        }
        const combinedResult = `${currentDrawnCharacters.join(' ')};${currentSkillBans}`;
        handleCopy(combinedResult, copyCharactersBtn);
    });
    resetGameBtn.addEventListener('click', handleResetGame);

    // --- Initial Load ---
    loadState();
});
