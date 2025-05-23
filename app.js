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
        roundCounter: 0,           // 当前轮数
        startTime: null,           // 游戏开始时间
        lastRoundTime: null,       // 上一轮抽取时间
        totalTime: 0,              // 总用时（秒）
        timerInterval: null        // 定时器
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

        // 停止计时器
        if (gameState.timerInterval) {
            clearInterval(gameState.timerInterval);
            gameState.timerInterval = null;
        }

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

        // 清空事件卡片
        const missionBoxes = document.querySelectorAll('.mission-box');
        missionBoxes.forEach(box => {
            const title = box.querySelector('.mission-title');
            const content = box.querySelector('.mission-content');
            title.textContent = ''; // 清空标题
            content.textContent = ''; // 清空内容
            box.style.opacity = 1; // 确保卡片可见
            box.style.pointerEvents = 'auto'; // 恢复点击事件
        });

        // 隐藏困难事件卡片
        const hardMissionBox = document.getElementById('selectedHardMission');
        if (hardMissionBox) {
            hardMissionBox.style.display = 'none'; // 隐藏卡片
            const title = hardMissionBox.querySelector('.mission-title');
            const content = hardMissionBox.querySelector('.mission-content');
            if (title) title.textContent = ''; // 清空标题
            if (content) content.textContent = ''; // 清空内容
        }

        // 清空历史记录并关闭弹窗
        historyData.length = 0;
        historyPopup.style.display = 'none';
        overlay.style.display = 'none';

        // 清空时间显示
        const timeCounter = document.getElementById('timeCounter');
        timeCounter.textContent = '总用时：00:00 | 本轮用时：00:00';

        alert('游戏已重置！');
    });

    // ================= 抽取角色 =================
    function displayRandomCharacters() {
        const now = Date.now(); // 当前时间戳

        if (!gameState.isGameStarted) {
            gameState.isGameStarted = true;
            gameState.startTime = now; // 记录游戏开始时间
            gameState.lastRoundTime = now; // 初始化上一轮时间
            bpButton.disabled = true;
            resetButton.style.display = 'inline-block';
            historyButton.style.display = 'inline-block'; // 显示历史记录按钮

            // 启动定时器，实时更新总用时和本轮用时
            gameState.timerInterval = setInterval(() => {
                const currentTime = Date.now();
                const totalElapsed = Math.floor((currentTime - gameState.startTime) / 1000); // 总用时
                const roundElapsed = Math.floor((currentTime - gameState.lastRoundTime) / 1000); // 本轮用时

                // 更新页面显示
                const timeCounter = document.getElementById('timeCounter');
                timeCounter.textContent = `总用时：${formatTime(totalElapsed)} | 本轮用时：${formatTime(roundElapsed)}`;
            }, 1000); // 每秒更新一次
        } else {
            // 计算本轮用时
            const roundTime = Math.floor((now - gameState.lastRoundTime) / 1000); // 秒
            gameState.lastRoundTime = now; // 更新上一轮时间
            gameState.totalTime += roundTime; // 累加总用时

            // 将本轮用时记录到历史数据
            const lastRound = historyData[historyData.length - 1];
            if (lastRound) {
                lastRound.roundTime = roundTime; // 保存本轮用时
            }
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

        const timeHeader = document.createElement('th');
        timeHeader.textContent = '用时';
        timeHeader.style.border = '1px solid #ddd';
        timeHeader.style.padding = '8px';
        headerRow.appendChild(timeHeader);

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

            const timeCell = document.createElement('td');
            timeCell.textContent = formatTime(round.roundTime || 0); // 使用格式化时间
            timeCell.style.border = '1px solid #ddd';
            timeCell.style.padding = '8px';
            row.appendChild(timeCell);

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

    // ================= 事件相关代码 =================
    // 获取查看事件按钮和弹窗相关元素
    const viewEventsButton = document.getElementById('viewEventsButton');
    const eventOverlay = document.getElementById('eventOverlay');
    const eventPopup = document.getElementById('eventPopup');
    const closeEventPopup = document.getElementById('closeEventPopup');
    const toggleEventsButton = document.getElementById('toggleEventsButton');
    const personalEvents = document.getElementById('personalEvents');
    const teamEvents = document.getElementById('teamEvents');
    const personalEventsTable = document.getElementById('personalEventsTable');
    const teamEventsTable = document.getElementById('teamEventsTable');

    let isShowingPersonal = true; // 当前显示的任务类型

    // 填充任务表格
    function populateTable(table, tasks, tableId) {
        table.innerHTML = '';
        Object.keys(tasks).forEach(key => {
            const row = document.createElement('tr');

            // 创建启用勾选框
            const enableCell = document.createElement('td');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = true; // 默认勾选
            checkbox.dataset.key = key; // 保存任务的 key
            enableCell.appendChild(checkbox);

            // 创建标题和内容单元格
            const titleCell = document.createElement('td');
            const contentCell = document.createElement('td');
            titleCell.textContent = key;
            contentCell.textContent = tasks[key].内容;

            // 将单元格添加到行
            row.appendChild(enableCell);
            row.appendChild(titleCell);
            row.appendChild(contentCell);

            // 将行添加到表格
            table.appendChild(row);
        });

        // 加载保存的勾选状态
        loadCheckedState(tableId);

        // 绑定勾选框的事件监听器
        attachCheckboxListeners(tableId);
    }

    // 显示弹窗
    viewEventsButton.addEventListener('click', () => {
        populateTable(personalEventsTable, mission, 'personalEventsTable'); // 填充个人任务
        populateTable(teamEventsTable, hardmission, 'teamEventsTable'); // 填充团体任务
        eventOverlay.style.display = 'block';
        eventPopup.style.display = 'block';
        isShowingPersonal = true; // 默认显示个人任务
        personalEvents.style.display = 'block';
        teamEvents.style.display = 'none';
        toggleEventsButton.textContent = '显示团体事件';
    });

    // 关闭弹窗
    closeEventPopup.addEventListener('click', () => {
        eventOverlay.style.display = 'none';
        eventPopup.style.display = 'none';
    });

    eventOverlay.addEventListener('click', () => {
        eventOverlay.style.display = 'none';
        eventPopup.style.display = 'none';
    });

    // 切换任务类型
    toggleEventsButton.addEventListener('click', () => {
        isShowingPersonal = !isShowingPersonal;
        if (isShowingPersonal) {
            personalEvents.style.display = 'block';
            teamEvents.style.display = 'none';
            toggleEventsButton.textContent = '显示团体事件';
        } else {
            personalEvents.style.display = 'none';
            teamEvents.style.display = 'block';
            toggleEventsButton.textContent = '显示个人事件';
        }
    });

    // 保存勾选状态
    function saveCheckedState(tableId) {
        const checkboxes = document.querySelectorAll(`#${tableId} input[type="checkbox"]`);
        const checkedState = {};
        checkboxes.forEach(checkbox => {
            checkedState[checkbox.dataset.key] = checkbox.checked; // 保存每个任务的勾选状态
        });
        localStorage.setItem(`${tableId}-checkedState`, JSON.stringify(checkedState)); // 存储到 localStorage
    }

    // 加载勾选状态
    function loadCheckedState(tableId) {
        const savedState = JSON.parse(localStorage.getItem(`${tableId}-checkedState`)) || {};
        const checkboxes = document.querySelectorAll(`#${tableId} input[type="checkbox"]`);
        checkboxes.forEach(checkbox => {
            checkbox.checked = savedState[checkbox.dataset.key] !== undefined ? savedState[checkbox.dataset.key] : true; // 默认勾选
        });
    }

    function attachCheckboxListeners(tableId) {
        const checkboxes = document.querySelectorAll(`#${tableId} input[type="checkbox"]`);
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                saveCheckedState(tableId); // 保存勾选状态
            });
        });
    }

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

    function formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const remainingSeconds = (seconds % 60).toString().padStart(2, '0');

        // 如果小时位为 0，则不显示小时
        if (hours > 0) {
            return `${hours}:${minutes}:${remainingSeconds}`;
        } else {
            return `${minutes}:${remainingSeconds}`;
        }
    }

    // ================= 事件绑定 =================
    characterBoxes.forEach(box => {
        box.addEventListener('click', () => refreshSingleCharacter(box));
    });

    startButton.addEventListener('click', () => {
        displayRandomCharacters(); // 抽取角色逻辑
    });

    // 初始化个人任务和团体任务表格
    populateTable(personalEventsTable, mission, 'personalEventsTable');
    populateTable(teamEventsTable, hardmission, 'teamEventsTable');
});
