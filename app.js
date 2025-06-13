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
    });    function displayRandomCharacters() {
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

        // 检查是否为阵容模式
        if (window.teamManagement && window.teamManagement.isTeamMode()) {
            displayTeamModeCharacters();
            return;
        }

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
        });        // 将本轮抽取的角色存到历史
        window.historyModule.pushRoundHistory(roundHistory);

        // 禁用按钮 0.5 秒
        startButton.disabled = true;
        setTimeout(() => {
            startButton.disabled = false;
        }, 500);
    }

    // ================= 阵容模式抽取 =================
    function displayTeamModeCharacters() {
        const teamResult = window.teamManagement.getTeamModeResult();
        
        if (!teamResult) {
            alert('阵容模式已开启，但没有可用的阵容！请在设置中添加阵容。');
            return;
        }

        const roundHistory = [];        // 显示阵容名称
        const teamNameDisplay = document.createElement('div');
        teamNameDisplay.id = 'teamNameDisplay';
        teamNameDisplay.style.cssText = `
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            margin: 10px 0;
            padding: 10px;
            color: #2c3e50;
        `;
        teamNameDisplay.textContent = `当前阵容：${teamResult.teamName}`;
        
        // 根据阵容模式状态决定是否显示阵容提示
        const isTeamModeActive = window.teamManagement && typeof window.teamManagement.isTeamMode === 'function' ? 
            window.teamManagement.isTeamMode() : false;
        teamNameDisplay.style.display = isTeamModeActive ? 'block' : 'none';
        
        // 移除旧的阵容名称显示（如果存在）
        const oldDisplay = document.getElementById('teamNameDisplay');
        if (oldDisplay) {
            oldDisplay.remove();
        }
        
        // 在开始按钮后插入阵容名称
        const startButtonElement = document.getElementById('startButton');
        startButtonElement.parentNode.insertBefore(teamNameDisplay, startButtonElement.nextSibling);// 为每个角色位置分配阵容中的角色
        characterBoxes.forEach((box, index) => {
            if (index < teamResult.characters.length) {
                const characterName = teamResult.characters[index];
                
                // 检查是否为替代角色（包含"/"）
                if (characterName.includes('/')) {
                    const [char1, char2] = characterName.split('/');
                    const selectedChar = Math.random() < 0.5 ? char1 : char2;
                    
                    if (window.characterData[selectedChar]) {
                        // 调用动画函数更新角色卡片，但显示替代效果
                        animateAlternativeSelection(box, char1, char2, selectedChar, index * 100);
                        roundHistory.push({ new: `${char1}/${char2}`, selected: selectedChar });
                    } else {
                        // 如果替代角色都不存在，随机选择一个角色
                        const availableChars = getCharacterKeys();
                        const randomChar = availableChars[Math.floor(Math.random() * availableChars.length)];
                        animateSelection(box, randomChar, index * 100);
                        roundHistory.push({ new: randomChar });
                    }
                } else {
                    // 普通角色处理
                    if (window.characterData[characterName]) {
                        // 调用动画函数更新角色卡片
                        animateSelection(box, characterName, index * 100);
                        roundHistory.push({ new: characterName });
                    } else {
                        // 如果角色不存在，随机选择一个角色
                        const availableChars = getCharacterKeys();
                        const randomChar = availableChars[Math.floor(Math.random() * availableChars.length)];
                        animateSelection(box, randomChar, index * 100);
                        roundHistory.push({ new: randomChar });
                    }
                }
            } else {
                // 如果阵容角色数量少于4个，其余位置随机选择
                const availableChars = getCharacterKeys();
                const randomChar = availableChars[Math.floor(Math.random() * availableChars.length)];
                animateSelection(box, randomChar, index * 100);
                roundHistory.push({ new: randomChar });
            }
        });

        // 将本轮抽取的角色存到历史
        window.historyModule.pushRoundHistory(roundHistory);

        // 禁用按钮 0.5 秒
        startButton.disabled = true;
        setTimeout(() => {
            startButton.disabled = false;
        }, 500);
    }    // ================= 单独切换角色 =================
    function refreshSingleCharacter(box) {
        if (!gameState.isGameStarted) return; // 禁用单独抽取角色功能
        
        // 检查是否为阵容模式，如果是则禁用单独切换
        if (window.teamManagement && window.teamManagement.isTeamMode()) {
            return; // 阵容模式下禁用单独切换角色
        }

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
    }    function animateSelection(box, newChar, delay) {
        const img = box.querySelector('.character-image');
        const name = box.querySelector('.character-name');

        setTimeout(() => {
            box.style.opacity = 0;
            setTimeout(() => {
                // 检查是否存在分割头像容器并移除
                const existingSplit = box.querySelector('.character-image-split');
                if (existingSplit) {
                    existingSplit.remove();
                }
                
                img.style.display = 'block';
                img.src = characterData[newChar].头像;
                name.textContent = newChar;
                box.style.opacity = 1;
            }, 300);
        }, delay);
    }

    // 替代角色动画选择函数
    function animateAlternativeSelection(box, char1, char2, selectedChar, delay = 0) {
        setTimeout(() => {
            const charImg = box.querySelector('.character-image');
            const charName = box.querySelector('.character-name');
            
            // 获取两个角色的数据
            const character1 = window.characterData[char1];
            const character2 = window.characterData[char2];
            const selectedCharData = window.characterData[selectedChar];
            
            if (character1 && character2 && selectedCharData) {
                // 创建分割头像容器
                charImg.style.display = 'none'; // 隐藏原来的单一头像
                
                // 检查是否已存在分割容器，如果有则移除
                const existingSplit = box.querySelector('.character-image-split');
                if (existingSplit) {
                    existingSplit.remove();
                }
                
                const splitContainer = document.createElement('div');
                splitContainer.className = 'character-image-split';
                splitContainer.style.cssText = `
                    position: relative;
                    width: 140px;
                    height: 140px;
                    border-radius: 50%;
                    overflow: hidden;
                    border: 3px solid #fff;
                    margin: 0 auto 10px;
                `;
                  const img1 = document.createElement('img');
                img1.src = character1.头像;
                img1.style.cssText = `
                    position: absolute;
                    width: 140px;
                    height: 140px;
                    object-fit: cover;
                    top: 0;
                    left: 0;
                    clip-path: polygon(0 0, 60% 0, 40% 100%, 0 100%);
                `;                const img2 = document.createElement('img');
                img2.src = character2.头像;
                img2.style.cssText = `
                    position: absolute;
                    width: 140px;
                    height: 140px;
                    object-fit: cover;
                    top: 0;
                    right: 0;
                    clip-path: polygon(66% 0, 100% 0, 100% 100%, 40% 100%);
                `;
                
                // 添加分割线
                const divider = document.createElement('div');
                divider.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 50%;
                    width: 8px;
                    height: 100%;
                    background:  rgba(255, 255, 255, 0.9);
                    transform: translateX(-50%) skewX(-15deg);
                    z-index: 1;
                `;
                
                splitContainer.appendChild(img1);
                splitContainer.appendChild(img2);
                splitContainer.appendChild(divider);
                
                // 插入分割容器
                charImg.parentNode.insertBefore(splitContainer, charImg);
                
                // 更新角色名称，显示选中的角色但标注替代
                charName.textContent = `${char1}/${char2}`;
                charName.style.fontSize = '18px';
            
            }
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