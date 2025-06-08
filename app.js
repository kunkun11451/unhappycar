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
    function resetGame() {
        // 清空游戏状态
        gameState.usedCharacters.global.clear();
        gameState.usedCharacters.players.forEach(s => s.clear());
        gameState.unavailableCharacters.forEach(s => s.clear());
        gameState.isGameStarted = false;
        gameState.roundCounter = 0;

        // 恢复重抽次数
        window.rerollCount = 3; // 将重抽次数恢复到 3
        const rerollCountDisplay = document.getElementById('rerollCount');
        if (rerollCountDisplay) {
            rerollCountDisplay.textContent = window.rerollCount; // 更新显示
        }

        // 停止计时器
        if (gameState.timerInterval) {
            clearInterval(gameState.timerInterval);
            gameState.timerInterval = null;
        }

        // 重置按钮状态
        bpButton.disabled = false;
        startButton.disabled = false;
        roundCounterDisplay.textContent = "当前轮数：0";

        // 清空角色卡片
        characterBoxes.forEach(box => {
            const img = box.querySelector(".character-image");
            const name = box.querySelector(".character-name");
            img.style.display = "none";
            img.src = "";
            name.textContent = "";
            box.style.opacity = 1; // 确保卡片可见
            box.style.pointerEvents = "auto"; // 恢复点击事件
        });

        // 清空事件卡片
        const missionBoxes = document.querySelectorAll(".mission-box");
        missionBoxes.forEach(box => {
            const title = box.querySelector(".mission-title");
            const content = box.querySelector(".mission-content");
            title.textContent = ""; // 清空标题
            content.textContent = ""; // 清空内容
            box.style.opacity = 1; // 确保卡片可见
            box.style.pointerEvents = "auto"; // 恢复点击事件
        });        // 隐藏困难事件卡片
        const hardMissionBox = document.getElementById("selectedHardMission");
        if (hardMissionBox) {
            hardMissionBox.style.display = "none"; // 隐藏卡片
            const title = hardMissionBox.querySelector(".mission-title");
            const content = hardMissionBox.querySelector(".mission-content");
            if (title) title.textContent = ""; // 清空标题
            if (content) content.textContent = ""; // 清空内容
        }

        // 隐藏新的困难事件容器
        const hardMissionsContainer = document.getElementById("hardMissionsContainer");
        if (hardMissionsContainer) {
            hardMissionsContainer.style.display = "none";
        }

        // 清空历史记录并关闭弹窗
        window.historyModule.clearHistory(); // 调用清空历史记录的方法

        // 清空事件历史记录
        window.eventHistoryModule.clearEventHistory(); // 调用清空事件历史记录的方法

        // 清空时间显示
        const timeCounter = document.getElementById("timeCounter");
        timeCounter.textContent = "总用时：00:00 | 本轮用时：00:00";
    }
    window.resetGame = resetGame;

    // ================= 抽取角色 =================
    startButton.addEventListener('click', () => {
        displayRandomCharacters(); // 抽取角色逻辑
    });

    function displayRandomCharacters() {
        const now = Date.now(); // 当前时间戳

        if (!gameState.isGameStarted) {
            gameState.isGameStarted = true;
            gameState.startTime = now; // 记录游戏开始时间
            gameState.lastRoundTime = now; // 初始化上一轮时间
            bpButton.disabled = true;

            // 初始化历史记录功能（移除对 historyButton 的依赖）
            window.historyModule.initHistoryUI();

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
            window.historyModule.updateLastRoundTime(roundTime); // 更新历史记录
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

            if (gameState.bpMode === 'off') {
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

        // 将本轮抽取的角色存到历史
        window.historyModule.pushRoundHistory(roundHistory);

        // 禁用按钮 0.5 秒
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
                usedSet.add(oldChar);
            }
            usedSet.add(newChar); // 添加新角色到个人 BP 列表
        }

        // 更新角色卡片
        box.style.pointerEvents = 'none';
        animateSelection(box, newChar, 0);
        setTimeout(() => box.style.pointerEvents = 'auto', 3500);

        // 更新历史记录
        if (oldChar) {
            window.historyModule.updateSingleCharacter(playerIndex, oldChar, newChar);
        }
    }

    // ================= 工具函数 =================
    function getCharacterKeys() {
        // 排除禁用的角色
        return Object.keys(characterData).filter(character => !disabledCharacters.has(character));
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
    }    // ================= 事件绑定 =================
    characterBoxes.forEach(box => {
        box.addEventListener('click', () => refreshSingleCharacter(box));
    });    // 等待所有脚本加载完成后初始化表格
    setTimeout(() => {
        // 获取表格元素
        const personalEventsTable = document.getElementById('personalEventsTable');
        const teamEventsTable = document.getElementById('teamEventsTable');
        
        // 初始化个人任务和团体任务表格
        if (window.eventManagement && typeof window.eventManagement.populateTable === 'function') {
            if (personalEventsTable) {
                window.eventManagement.populateTable(personalEventsTable, mission, 'personalEventsTable');
            }
            if (teamEventsTable) {
                window.eventManagement.populateTable(teamEventsTable, hardmission, 'teamEventsTable');
            }
        } else {
            console.warn('eventManagement模块未加载或populateTable函数未找到');
        }
    }, 100);
});