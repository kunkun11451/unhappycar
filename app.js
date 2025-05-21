document.addEventListener('DOMContentLoaded', function () {
    // ================= 游戏状态管理 =================
    window.gameState = {
        bpMode: 'off', // 当前BP模式: global | personal | off
        usedCharacters: {
            global: new Set(),    // 全局已选角色
            players: [new Set(), new Set(), new Set(), new Set()] // 各玩家已选角色
        },
        unavailableCharacters: [new Set(), new Set(), new Set(), new Set()], // 每个玩家不可用的角色
        isGameStarted: false,      // 游戏是否开始
        roundCounter: 0            // 当前轮数
    };

    // ================= DOM元素获取 =================
    const characterBoxes = document.querySelectorAll('.character-box');
    const startButton = document.getElementById('startButton');
    const bpButton = document.getElementById('bpButton');
    const resetButton = document.getElementById('resetButton');
    const roundCounterDisplay = document.getElementById('roundCounter');
    const historyButton = document.createElement('button');
    historyButton.textContent = '历史记录';
    historyButton.className = 'history-button';
    historyButton.style.display = 'none';
    document.body.appendChild(historyButton);

    const overlay = document.createElement('div'); // 黑色半透明背景
    overlay.className = 'overlay';
    overlay.style.display = 'none';
    document.body.appendChild(overlay);

    const historyPopup = document.createElement('div');
    historyPopup.className = 'history-popup';
    historyPopup.style.display = 'none';
    document.body.appendChild(historyPopup);

    const historyContent = document.createElement('div'); // 历史记录内容
    historyContent.className = 'history-content';
    historyPopup.appendChild(historyContent);

    const closeHistoryButton = document.createElement('button'); // 添加关闭按钮
    closeHistoryButton.textContent = '关闭';
    closeHistoryButton.className = 'close-history-button';
    historyPopup.appendChild(closeHistoryButton);

    const historyData = []; // 保存历史记录

    // ================= 初始化 =================
    function initializeBPButton() {
        bpButton.textContent = `BP模式：${getModeName(gameState.bpMode)}`;
        bpButton.dataset.mode = gameState.bpMode;
        bpButton.className = `bp-button ${gameState.bpMode}`;
    }
    initializeBPButton();

    // ================= BP模式切换 =================
    const BP_MODES = ['global', 'personal', 'off'];
    bpButton.addEventListener('click', () => {
        if (!gameState.isGameStarted) {
            const newMode = BP_MODES[(BP_MODES.indexOf(gameState.bpMode) + 1) % 3];
            gameState.bpMode = newMode;
            bpButton.textContent = `BP模式：${getModeName(newMode)}`;
            bpButton.dataset.mode = newMode;
        }
    });

    // ================= 重置游戏 =================
    resetButton.addEventListener('click', () => {
        // 清空游戏状态
        gameState.usedCharacters.global.clear();
        gameState.usedCharacters.players.forEach(s => s.clear());
        gameState.unavailableCharacters.forEach(s => s.clear());
        gameState.isGameStarted = false;
        gameState.roundCounter = 0;

        // 重置按钮状态
        resetButton.style.display = 'none';
        bpButton.disabled = false;
        startButton.disabled = false;
        roundCounterDisplay.textContent = '当前轮数：0';

        // 清空角色卡片
        characterBoxes.forEach(box => {
            const img = box.querySelector('.character-image');
            const name = box.querySelector('.character-name');
            img.style.display = 'none';
            img.src = '';
            name.textContent = '';
            box.style.opacity = 1; // 确保卡片可见
            box.style.pointerEvents = 'auto'; // 恢复点击事件
        });

        // 清空历史记录并关闭弹窗
        historyData.length = 0;
        historyPopup.style.display = 'none';
        overlay.style.display = 'none';

        alert('游戏已重置！');
    });

    // ================= 抽取角色 =================
    function displayRandomCharacters() {
        if (!gameState.isGameStarted) {
            gameState.isGameStarted = true;
            bpButton.disabled = true;
            resetButton.style.display = 'inline-block';
            historyButton.style.display = 'inline-block'; // 显示历史记录按钮
        }

        // 增加轮数
        gameState.roundCounter++;
        roundCounterDisplay.textContent = `当前轮数：${gameState.roundCounter}`;

        const roundHistory = [];
        characterBoxes.forEach((box, index) => {
            const unavailableSet = gameState.unavailableCharacters[index];
            let availableChars = getCharacterKeys();

            // 根据 BP 模式过滤可用角色
            if (gameState.bpMode === 'personal') {
                availableChars = availableChars.filter(c => !gameState.usedCharacters.players[index].has(c) && !unavailableSet.has(c));
            } else if (gameState.bpMode === 'global') {
                availableChars = availableChars.filter(c => !gameState.usedCharacters.global.has(c) && !unavailableSet.has(c));
            } else if (gameState.bpMode === 'off') {
                availableChars = availableChars.filter(c => !unavailableSet.has(c));
            }

            if (availableChars.length === 0) {
                alert(`⚠️ 玩家 ${index + 1} 无可用角色，请重置游戏！`);
                disableGameControls();
                return;
            }

            const newChar = availableChars[Math.floor(Math.random() * availableChars.length)];

            // 更新不可用角色列表（仅在关闭模式下）
            if (gameState.bpMode === 'off') {
                unavailableSet.add(newChar);
            }

            // 更新 BP 列表
            if (gameState.bpMode === 'global') {
                gameState.usedCharacters.global.add(newChar);
            }
            if (gameState.bpMode === 'personal') {
                gameState.usedCharacters.players[index].add(newChar);
            }

            // 调用动画函数更新角色卡片
            animateSelection(box, newChar, 0);

            roundHistory.push({ new: newChar });
        });

        historyData.push(roundHistory);

        // 禁用按钮 1 秒
        startButton.disabled = true;
        setTimeout(() => {
            startButton.disabled = false;
        }, 500);
    }

    // ================= 单独切换角色 =================
    function refreshSingleCharacter(box) {
        if (!gameState.isGameStarted) return; // 禁用单独抽取角色功能

        const playerIndex = Array.from(characterBoxes).indexOf(box);
        const usedSet = gameState.usedCharacters.players[playerIndex];
        const unavailableSet = gameState.unavailableCharacters[playerIndex];

        // 获取当前玩家的可用角色
        let availableChars = getCharacterKeys();
        if (gameState.bpMode === 'personal') {
            // 排除个人 BP 列表和不可用角色
            availableChars = availableChars.filter(c => !usedSet.has(c) && !unavailableSet.has(c));
        } else if (gameState.bpMode === 'global') {
            // 排除全局 BP 列表和不可用角色
            availableChars = availableChars.filter(c => !gameState.usedCharacters.global.has(c) && !unavailableSet.has(c));
        } else if (gameState.bpMode === 'off') {
            // 排除不可用角色
            availableChars = availableChars.filter(c => !unavailableSet.has(c));
        }

        if (availableChars.length === 0) {
            alert('该玩家无可用角色！');
            return;
        }

        const oldChar = box.querySelector('.character-name').textContent;
        const newChar = availableChars[Math.floor(Math.random() * availableChars.length)];

        // 更新不可用角色列表（仅在关闭模式下）
        if (gameState.bpMode === 'off' && oldChar) {
            unavailableSet.add(oldChar); // 将切换前的角色加入不可用列表
        }

        // 更新 BP 列表（仅计入最后换到的角色）
        if (gameState.bpMode === 'global') {
            if (oldChar) {
                gameState.usedCharacters.global.delete(oldChar); // 从全局 BP 列表中移除旧角色
            }
            gameState.usedCharacters.global.add(newChar); // 添加新角色到全局 BP 列表
        } else if (gameState.bpMode === 'personal') {
            if (oldChar) {
                usedSet.delete(oldChar); // 从个人 BP 列表中移除旧角色
            }
            usedSet.add(newChar); // 添加新角色到个人 BP 列表
        }

        // 更新角色卡片
        box.style.pointerEvents = 'none';
        animateSelection(box, newChar, 0);
        setTimeout(() => box.style.pointerEvents = 'auto', 3500);

        // 更新历史记录
        const lastRound = historyData[historyData.length - 1];
        if (lastRound) {
            if (!lastRound[playerIndex].replaced) {
                // 初始化 replaced 数组并记录第一次替换
                lastRound[playerIndex].replaced = [oldChar, newChar];
            } else {
                // 检查最后一个角色是否与新角色相同，避免重复记录
                const lastCharacter = lastRound[playerIndex].replaced[lastRound[playerIndex].replaced.length - 1];
                if (lastCharacter !== newChar) {
                    lastRound[playerIndex].replaced.push(newChar);
                }
            }
        }
    }

    // ================= 显示历史记录 =================
    historyButton.addEventListener('click', () => {
        historyContent.innerHTML = ''; // 清空内容

        // 创建表格
        const table = document.createElement('table');
        table.style.margin = '0 auto'; // 居中表格
        table.style.borderCollapse = 'collapse';
        table.style.width = '80%';

        // 添加表头
        const headerRow = document.createElement('tr');
        headerRow.style.backgroundColor = '#f2f2f2';
        headerRow.style.textAlign = 'center';

        const roundHeader = document.createElement('th');
        roundHeader.textContent = '轮次';
        roundHeader.style.border = '1px solid #ddd';
        roundHeader.style.padding = '8px';
        headerRow.appendChild(roundHeader);

        // 添加玩家列头
        ['1P', '2P', '3P', '4P'].forEach(player => {
            const playerHeader = document.createElement('th');
            playerHeader.textContent = player;
            playerHeader.style.border = '1px solid #ddd';
            playerHeader.style.padding = '8px';
            headerRow.appendChild(playerHeader);
        });

        table.appendChild(headerRow);

        // 添加每轮记录
        historyData.forEach((round, index) => {
            const row = document.createElement('tr');
            row.style.textAlign = 'center';

            const roundCell = document.createElement('td');
            roundCell.textContent = ` ${index + 1} `;
            roundCell.style.border = '1px solid #ddd';
            roundCell.style.padding = '8px';
            row.appendChild(roundCell);

            // 添加每位玩家的角色
            round.forEach(player => {
                const playerCell = document.createElement('td');
                playerCell.style.border = '1px solid #ddd';
                playerCell.style.padding = '8px';

                // 如果有替换记录，显示完整的替换链条
                if (player.replaced && player.replaced.length > 1) {
                    playerCell.textContent = player.replaced.join('→');
                } else {
                    playerCell.textContent = player.new; // 否则显示当前角色
                }

                row.appendChild(playerCell);
            });

            table.appendChild(row);
        });

        historyContent.appendChild(table);

        // 显示弹窗和黑色半透明背景
        overlay.style.display = 'block';
        historyPopup.style.display = 'block';
        document.body.style.overflow = 'hidden'; 
    });

    closeHistoryButton.addEventListener('click', () => {
        historyPopup.style.display = 'none'; // 关闭弹窗
        overlay.style.display = 'none'; // 隐藏黑色半透明背景
        document.body.style.overflow = ''; // 恢复页面滚动
    });

    overlay.addEventListener('click', () => {
        historyPopup.style.display = 'none'; // 隐藏弹窗
        overlay.style.display = 'none'; // 隐藏背景遮罩
        document.body.style.overflow = 'auto'; // 恢复页面滚动
    });

    // ================= 工具函数 =================
    function getCharacterKeys() {
        return Object.keys(characterData);
    }

    function disableGameControls() {
        startButton.disabled = true;
        characterBoxes.forEach(box => {
            box.style.pointerEvents = 'none';
        });
    }

    function getModeName(mode) {
        return { global: '全局', personal: '个人', off: '关闭' }[mode];
    }

    function animateSelection(box, newChar, delay) {
        const img = box.querySelector('.character-image');
        const name = box.querySelector('.character-name');

        setTimeout(() => {
            box.style.opacity = 0;
            setTimeout(() => {
                img.style.display = 'block';
                img.src = characterData[newChar].头像;
                name.textContent = newChar;
                box.style.opacity = 1;
            }, 300);
        }, delay);
    }

    // ================= 事件绑定 =================
    characterBoxes.forEach(box => {
        box.addEventListener('click', () => refreshSingleCharacter(box));
    });

    startButton.addEventListener('click', () => {
        displayRandomCharacters(); // 抽取角色逻辑
    });
});