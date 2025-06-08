// 确保即使在DOM加载之前也能访问到这些函数（提前导出空对象）
window.hardMissionVoting = window.hardMissionVoting || {};

// 全局函数：获取启用的困难模式事件键
function getHardMissionKeys() {
    const enabledKeys = [];
    const checkboxes = document.querySelectorAll('#teamEventsTable input[type="checkbox"]');
    
    // 如果表格不存在（用户还没打开事件管理），从localStorage读取勾选状态
    if (checkboxes.length === 0) {
        // 确保hardmission对象存在
        const hardmissionObj = window.hardmission || hardmission;
        if (!hardmissionObj) {
            console.error('hardmission对象未找到');
            return [];
        }
        
        // 从localStorage读取保存的勾选状态
        const savedState = JSON.parse(localStorage.getItem('teamEventsTable-checkedState')) || {};
        const allKeys = Object.keys(hardmissionObj);
        
        // 如果没有保存的状态，默认所有事件都启用
        if (Object.keys(savedState).length === 0) {
            return allKeys;
        }
        
        // 根据保存的状态过滤启用的事件
        return allKeys.filter(key => savedState[key] !== false);
    }
    
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            enabledKeys.push(checkbox.dataset.key);
        }
    });
    return enabledKeys;
}

// 投票系统全局变量
let votingActive = false;
let playerVotes = {}; // 存储每个玩家的投票 {playerId: missionIndex}
let currentHardMissions = []; // 当前的困难事件数组
let votingResults = {}; // 存储投票结果 {missionIndex: voteCount}
let votingResultShown = false; // 标记投票结果是否已显示
let votingResultTime = null; // 记录投票结果显示时间

// 显示困难事件并启动投票
function displayHardMissionsWithVoting(hardMissionKeys) {
    console.log('开始显示困难事件投票系统，事件:', hardMissionKeys);
    
    if (!hardMissionKeys || hardMissionKeys.length < 3) {
        console.error('困难事件数量不足');
        return;
    }
    
    // 确保能够访问hardmission对象
    const hardmissionObj = window.hardmission || hardmission;
    if (!hardmissionObj) {
        console.error('hardmission对象未找到');
        return;
    }
    
    // 获取困难事件显示区域
    const hardMissionsContainer = document.getElementById('hardMissionsContainer');
    const hardMissionsGrid = document.getElementById('hardMissionsGrid');
    
    if (!hardMissionsContainer || !hardMissionsGrid) {
        console.error('困难事件显示容器未找到');
        return;
    }
      // 重置投票状态
    console.log('重置投票状态，开始新的投票');
    votingActive = true;
    playerVotes = {};
    votingResults = {0: 0, 1: 0, 2: 0};
    currentHardMissions = hardMissionKeys.slice(0, 3);
    
    // 重置投票结果保护状态
    votingResultShown = false;
    votingResultTime = null;
    console.log('投票结果保护状态已重置');
    
    console.log('当前困难事件列表:', currentHardMissions);
    
    // 清空之前的投票结果显示和样式
    const existingResult = hardMissionsContainer.querySelector('.voting-result');
    if (existingResult) {
        existingResult.remove();
    }
    
    // 清除所有投票相关的样式类
    hardMissionsGrid.innerHTML = '';
      // 检查是否在多人游戏模式
    if (window.multiplayerManager && window.multiplayerManager.isConnected()) {
        // 多人游戏模式：如果是主持人，启动服务器端投票
        if (isHost()) {
            console.log('主持人启动服务器端投票');
            try {
                const result = window.multiplayerManager.startVoting(currentHardMissions);
                if (!result) {
                    console.warn('多人游戏投票启动失败，回退到单机模式');
                    console.log('单人游戏模式，使用客户端投票逻辑');
                }
            } catch (error) {
                console.error('多人游戏投票启动错误:', error);
                console.log('回退到单机模式');
            }
        } else {
            console.log('非主持人玩家等待投票启动');
        }
    } else {
        // 单人游戏模式：继续使用客户端逻辑
        console.log('单人游戏模式，使用客户端投票逻辑');
    }
    
    // 创建困难事件UI（无论单人还是多人模式都需要）
    createHardMissionUI(hardMissionsContainer, hardMissionsGrid, hardmissionObj);
}

// 创建困难事件UI
function createHardMissionUI(hardMissionsContainer, hardMissionsGrid, hardmissionObj) {
    // 为每个困难事件创建元素
    currentHardMissions.forEach((missionKey, index) => {
        const missionData = hardmissionObj[missionKey];
        if (!missionData) {
            console.error('无法找到困难事件数据:', missionKey);
            return;
        }
        
        // 创建困难事件盒子
        const hardMissionBox = document.createElement('div');
        hardMissionBox.className = 'hard-mission-box';
        hardMissionBox.id = `hardMission${index + 1}`;
        hardMissionBox.dataset.missionIndex = index;
        
        const titleElement = document.createElement('div');
        titleElement.className = 'hard-mission-title';
        titleElement.textContent = missionKey;
        
        const contentElement = document.createElement('div');
        contentElement.className = 'hard-mission-content';
        
        // 处理"谁？"事件的NPC替换
        if (missionKey === "谁？" && window.npc) {
            const npcNames = Object.keys(window.npc);
            if (npcNames.length > 0) {
                const randomIndex = Math.floor(Math.random() * npcNames.length);
                const randomNpcName = npcNames[randomIndex];
                const npcData = window.npc[randomNpcName];
                
                let modifiedContent = missionData.内容
                    .replace("AA", randomNpcName)
                    .replace("BB", npcData.国家)
                    .replace("CC", npcData.职业);
                
                contentElement.textContent = modifiedContent;
            } else {
                contentElement.textContent = missionData.内容;
            }
        } else {
            contentElement.textContent = missionData.内容;
        }
        
        // 创建投票点数显示容器
        const voteDotsContainer = document.createElement('div');
        voteDotsContainer.className = 'vote-dots-container';
        voteDotsContainer.id = `voteDots${index}`;
        
        hardMissionBox.appendChild(titleElement);
        hardMissionBox.appendChild(contentElement);
        hardMissionBox.appendChild(voteDotsContainer);
        hardMissionsGrid.appendChild(hardMissionBox);

        // 添加点击投票事件
        hardMissionBox.addEventListener('click', () => handleVote(index));
        
        // 添加淡入动画
        hardMissionBox.style.opacity = '0';
        hardMissionBox.style.transform = 'translateY(20px)';
        setTimeout(() => {
            hardMissionBox.style.transition = 'all 0.3s ease';
            hardMissionBox.style.opacity = '1';
            hardMissionBox.style.transform = 'translateY(0)';
        }, 300 + index * 100);
    });
    
    // 显示困难事件容器
    hardMissionsContainer.style.display = 'block';
    
    // 显示投票提示
    showVotingInstructions();
}

// 处理投票 - 重构为服务器端处理
function handleVote(missionIndex) {
    console.log('投票被触发:', { 
        missionIndex, 
        votingActive, 
        playerId: getCurrentPlayerId(),
        isMultiplayer: !!(window.multiplayerManager && window.multiplayerManager.isConnected()),
        isHost: isHost()
    });
    
    if (!votingActive) {
        console.log('当前不在投票阶段，投票状态详情:', {
            votingActive,
            currentHardMissions: currentHardMissions.length,
            playerVotes: Object.keys(playerVotes).length,
            votingResults
        });
        return;
    }
    
    // 获取当前玩家ID
    const playerId = getCurrentPlayerId();
    console.log('玩家投票:', { playerId, missionIndex, isHost: isHost() });
      // 检查是否在多人游戏模式    if (window.multiplayerManager && window.multiplayerManager.isConnected()) {
        // 多人游戏模式：发送投票到服务器
        console.log('发送投票到服务器');
        
        // 检查是否已经投过票
        const currentPlayerId = getCurrentPlayerId();
        if (playerVotes[currentPlayerId] !== undefined) {
            // 取消之前的投票样式
            const prevIndex = playerVotes[currentPlayerId];
            const prevBox = document.querySelector(`[data-mission-index="${prevIndex}"]`);
            if (prevBox) {
                prevBox.classList.remove('voted');
            }
            console.log('取消之前的投票样式:', { prevIndex });
        }
        
        // 立即更新本地状态和样式（等待服务器确认）
        playerVotes[currentPlayerId] = missionIndex;
        
        // 更新投票样式（持久化）
        document.querySelectorAll('.hard-mission-box').forEach(box => {
            box.classList.remove('voted');
        });
        const missionBox = document.querySelector(`[data-mission-index="${missionIndex}"]`);
        if (missionBox) {
            missionBox.classList.add('voted');
            console.log(`添加持久化voted样式到事件 ${missionIndex}`);        
        // 发送投票到服务器
        window.multiplayerManager.submitVote(missionIndex, currentPlayerId);
          // 显示投票反馈
        const voteWeight = isHost() ? 2 : 1;
        showVoteConfirmation(currentPlayerId, missionIndex, voteWeight);
        
        // 更新所有卡片的投票状态文本
        updateAllVotingStatus();
        
    } else {
        // 单人游戏模式：保持原有客户端逻辑
        handleVoteSinglePlayer(missionIndex);
    }
}

// 单人游戏投票处理（保持原有逻辑）
function handleVoteSinglePlayer(missionIndex) {
    const playerId = getCurrentPlayerId();
    
    // 检查是否已经投过票
    if (playerVotes[playerId] !== undefined) {
        // 取消之前的投票
        const prevIndex = playerVotes[playerId];
        const prevVoteWeight = isHost() ? 2 : 1;
        votingResults[prevIndex] -= prevVoteWeight;
        updateVoteDisplay(prevIndex);
        
        // 移除之前的投票样式
        const prevBox = document.querySelector(`[data-mission-index="${prevIndex}"]`);
        if (prevBox) {
            prevBox.classList.remove('voted');
        }
        console.log('取消之前的投票:', { prevIndex, prevVoteWeight });
    }
    
    // 添加新投票
    playerVotes[playerId] = missionIndex;
    
    // 主持人的票算作两票
    const voteWeight = isHost() ? 2 : 1;
    if (!votingResults[missionIndex]) {
        votingResults[missionIndex] = 0;
    }
    votingResults[missionIndex] += voteWeight;
    
    console.log('添加新投票:', { missionIndex, voteWeight, newTotal: votingResults[missionIndex] });
      // 更新显示
    updateVoteDisplay(missionIndex);
    
    // 更新所有卡片的投票状态文本
    updateAllVotingStatus();
    
    // 添加投票样式
    const missionBox = document.querySelector(`[data-mission-index="${missionIndex}"]`);
    if (missionBox) {
        missionBox.classList.add('voted');
    }
    
    // 显示投票反馈
    showVoteConfirmation(playerId, missionIndex, voteWeight);
    
    // 检查投票是否完成（所有人都投票了）
    checkVotingComplete();
}

// 更新投票点数显示
function updateVoteDisplay(missionIndex) {
    const voteDotsContainer = document.getElementById(`voteDots${missionIndex}`);
    if (!voteDotsContainer) return;
    
    const voteCount = votingResults[missionIndex] || 0;
    voteDotsContainer.innerHTML = '';
    
    // 添加投票点数，每个都使用随机图像
    for (let i = 0; i < voteCount; i++) {
        const dot = document.createElement('div');
        dot.className = 'vote-dot';
        dot.style.animationDelay = `${i * 0.1}s`;
        dot.style.backgroundImage = `url('${getRandomVoteDotImage()}')`;
        voteDotsContainer.appendChild(dot);
    }
}

// 更新所有投票卡片的状态文本
function updateAllVotingStatus() {
    if (!votingActive) {
        // 如果投票已结束，移除状态显示
        const existingStatus = document.querySelector('.global-vote-status');
        if (existingStatus) {
            existingStatus.remove();
        }
        return;
    }

    const totalPlayers = getExpectedPlayerCount();
    const votedPlayers = Object.keys(playerVotes).length;
    
    // 查找或创建全局投票状态显示区域
    const hardMissionsContainer = document.getElementById('hardMissionsContainer');
    let statusContainer = document.querySelector('.global-vote-status');
    
    if (!statusContainer) {
        statusContainer = document.createElement('div');
        statusContainer.className = 'global-vote-status';
        statusContainer.style.cssText = `
            text-align: center;
            font-size: 12px;
            color: #999;
            margin-top: 15px;
            padding: 8px;
        `;
        
        // 将状态显示添加到困难事件容器的末尾
        hardMissionsContainer.appendChild(statusContainer);
    }
    
    statusContainer.textContent = `${votedPlayers}/${totalPlayers} 已完成投票`;
    
    // 更新每个卡片的投票点数显示
    for (let i = 0; i < 3; i++) {
        updateVoteDisplay(i);
    }
}

// 获取随机投票点图像
function getRandomVoteDotImage() {
    const images = [
        'https://upload-bbs.miyoushe.com/upload/2024/06/29/273489775/4be47bf1376bfb4f69c1e3fe26c8a8e8_8119842655567179283.png'
    ];
    return images[Math.floor(Math.random() * images.length)];
}

// 检查投票是否完成（仅单人游戏模式使用）
function checkVotingComplete() {
    // 在多人游戏模式下，投票完成检查由服务器处理
    if (window.multiplayerManager && window.multiplayerManager.isConnected()) {
        console.log('多人游戏模式：投票完成检查由服务器处理');
        return;
    }
    
    // 单人游戏模式：客户端检查投票完成
    const expectedPlayers = getExpectedPlayerCount();
    const currentVotes = Object.keys(playerVotes).length;
    
    console.log('检查投票完成状态:', { expectedPlayers, currentVotes, playerVotes, isHost: isHost() });
    
    if (currentVotes >= expectedPlayers) {
        console.log('单人游戏投票完成，准备显示结果');
        setTimeout(() => {
            finishVoting();
        }, 1000); // 延迟1秒显示结果
    }
}

// 完成投票，显示结果（仅单人游戏模式使用）
function finishVoting() {
    console.log('开始处理投票结果');
    
    // 在多人游戏模式下，投票结果由服务器处理
    if (window.multiplayerManager && window.multiplayerManager.isConnected()) {
        console.log('多人游戏模式：投票结果由服务器处理');
        return;
    }
    
    // 确保只在投票激活状态时处理
    if (!votingActive) {
        console.log('投票已结束，忽略重复处理');
        return;
    }
    
    votingActive = false;
    
    console.log('完成投票，当前投票结果:', votingResults);
    console.log('当前困难事件列表:', currentHardMissions);
    
    // 检查是否有有效的投票结果
    const voteValues = Object.values(votingResults).filter(v => v > 0);
    if (voteValues.length === 0) {
        console.error('没有有效的投票结果');
        return;
    }
    
    // 找出票数最多的事件
    const maxVotes = Math.max(...voteValues);
    const winners = Object.keys(votingResults).filter(index => votingResults[index] === maxVotes);
    
    let selectedIndex;
    if (winners.length === 1) {
        selectedIndex = parseInt(winners[0]);
    } else {
        // 平票时随机选择
        selectedIndex = parseInt(winners[Math.floor(Math.random() * winners.length)]);
    }
    
    console.log('选中的困难事件索引:', selectedIndex, '事件名称:', currentHardMissions[selectedIndex]);
    
    // 高亮选中的事件，其他变灰
    currentHardMissions.forEach((_, index) => {
        const missionBox = document.querySelector(`[data-mission-index="${index}"]`);
        if (missionBox) {
            if (index === selectedIndex) {
                missionBox.classList.add('selected');
                missionBox.classList.remove('voted');
            } else {
                missionBox.classList.add('rejected');
                missionBox.classList.remove('voted');
            }
        }
    });
      // 显示投票结果
    showVotingResult(selectedIndex, maxVotes, winners.length > 1);
    
    // 标记投票结果已显示，启动保护期
    votingResultShown = true;
    votingResultTime = Date.now();
    console.log('单人游戏投票结果显示，启动UI保护期');
}

// 显示投票说明
function showVotingInstructions() {
    const container = document.getElementById('hardMissionsContainer');
    const existingInstructions = container.querySelector('.voting-instructions');
    if (existingInstructions) {
        existingInstructions.remove();
    }
    
    const instructions = document.createElement('div');
    instructions.className = 'voting-instructions';
    
    let instructionsHTML = `
        <p style="text-align: center; color: #666; margin: 10px 0;">
            请点击选择一个团体事件进行投票
        </p>
    `;
    
    // 为主持人添加手动结算按钮
    if (isHost() && votingActive) {
        instructionsHTML += `
            <div style="text-align: center; margin: 15px 0;">
                <button id="manualSettleBtn" onclick="manualSettleVoting()" style="
                    background: #ff6b35;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: bold;
                    transition: background-color 0.3s;
                " onmouseover="this.style.backgroundColor='#e55a2b'" 
                   onmouseout="this.style.backgroundColor='#ff6b35'">
                    手动结算投票
                </button>
                <p style="font-size: 12px; color: #999; margin: 5px 0 0 0;">
                    小概率情况会没有自动结算，可以点击此按钮可立即结束投票并显示当前结果
                </p>
            </div>
        `;
    }
    
    instructions.innerHTML = instructionsHTML;
    
    container.insertBefore(instructions, container.querySelector('.hard-missions-grid'));
}

// 显示投票结果
function showVotingResult(selectedIndex, voteCount, wasTie) {
    const container = document.getElementById('hardMissionsContainer');
    const existingResult = container.querySelector('.voting-result');
    if (existingResult) {
        existingResult.remove();
    }
    
    const instructions = container.querySelector('.voting-instructions');
    if (instructions) {
        instructions.remove();
    }
    
    // 确保有有效的选中事件
    const selectedMission = currentHardMissions[selectedIndex];
    if (!selectedMission) {
        console.error('无法找到选中的困难事件:', selectedIndex, currentHardMissions);
        return;
    }
    
    console.log('显示投票结果:', { selectedMission, voteCount, wasTie });
    
    const result = document.createElement('div');
    result.className = 'voting-result';
    result.innerHTML = `
        <h3>投票结果</h3>
        <p><strong>"${selectedMission}"</strong> 获得 ${voteCount} 票${wasTie ? ' (平票随机选择)' : ''}</p>
        <p>该团体事件已被选定为本轮任务！</p>
    `;
    
    container.appendChild(result);
}

// 显示带事件名称的投票结果（用于同步时）
function showVotingResultWithMissionName(selectedIndex, voteCount, wasTie, missionName) {
    const container = document.getElementById('hardMissionsContainer');
    const existingResult = container.querySelector('.voting-result');
    if (existingResult) {
        existingResult.remove();
    }
    
    const instructions = container.querySelector('.voting-instructions');
    if (instructions) {
        instructions.remove();
    }
    
    console.log('显示投票结果（带事件名称）:', { selectedIndex, voteCount, wasTie, missionName });
    
    const result = document.createElement('div');
    result.className = 'voting-result';
    result.innerHTML = `
        <h3>投票结果</h3>
        <p><strong>"${missionName}"</strong> 获得 ${voteCount} 票${wasTie ? ' (平票随机选择)' : ''}</p>
        <p>该团体事件已被选定为本轮任务！</p>
    `;
    
    container.appendChild(result);
}

// 显示投票确认
function showVoteConfirmation(playerId, missionIndex, voteWeight) {
    const container = document.getElementById('hardMissionsContainer');
    const existingConfirmation = container.querySelector('.vote-confirmation');
    if (existingConfirmation) {
        existingConfirmation.remove();
    }
    
    const confirmation = document.createElement('div');
    confirmation.className = 'vote-confirmation';
    confirmation.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4caf50;
        color: white;
        padding: 10px 15px;
        border-radius: 5px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
      const playerName = isHost() ? '主持人' : '玩家';
    const missionTitle = currentHardMissions[missionIndex] || `团体事件${missionIndex + 1}`;
    
    console.log('显示投票确认:', { playerId, missionIndex, missionTitle, voteWeight });
    
    confirmation.innerHTML = `
        <strong>${playerName}已投票</strong><br>
        选择: ${missionTitle}<br>
        票数: ${voteWeight}票
    `;
    
    document.body.appendChild(confirmation);
    
    // 3秒后自动消失
    setTimeout(() => {
        if (confirmation.parentNode) {
            confirmation.parentNode.removeChild(confirmation);
        }
    }, 3000);
}

// 手动结算投票（主持人专用）
function manualSettleVoting() {
    if (!isHost()) {
        alert('只有主持人可以手动结算投票');
        return;
    }
    
    if (!votingActive) {
        alert('当前没有进行中的投票');
        return;
    }
    
    console.log('主持人手动结算投票');
    
    // 检查是否在多人游戏模式
    if (window.multiplayerManager && window.multiplayerManager.isConnected()) {
        // 多人游戏模式：发送手动结算请求到服务器
        console.log('发送手动结算请求到服务器');
        
        if (window.multiplayerManager.manualSettleVoting) {
            window.multiplayerManager.manualSettleVoting();
        } else {
            console.error('多人游戏管理器不支持手动结算功能');
            alert('多人游戏模式下手动结算功能暂时不可用');
        }
    } else {
        // 单人游戏模式：直接执行本地结算
        console.log('单人游戏模式：执行本地手动结算');
        
        // 检查是否有任何投票
        const totalVotes = Object.values(votingResults).reduce((sum, votes) => sum + votes, 0);
        if (totalVotes === 0) {
            alert('还没有任何投票，无法结算');
            return;
        }
        
        // 确认操作
        if (confirm('确定要立即结束投票并显示当前结果吗？')) {
            finishVoting();
        }
    }
}

// 测试模式函数 - 用于调试多人游戏投票
function enableTestMode() {
    console.log('启用投票测试模式');
    
    // 模拟多个玩家投票
    const testPlayers = ['host_test', 'player1_test', 'player2_test', 'player3_test'];
    let currentTestPlayer = 0;
    
    // 创建测试控制面板
    const testPanel = document.createElement('div');
    testPanel.id = 'votingTestPanel';
    testPanel.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        background: #fff;
        border: 2px solid #007bff;
        border-radius: 8px;
        padding: 15px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        z-index: 1001;
        font-family: Arial, sans-serif;
        min-width: 250px;
    `;
    
    testPanel.innerHTML = `
        <h4 style="margin: 0 0 10px 0; color: #007bff;">投票测试控制台</h4>
        <div style="margin-bottom: 10px;">
            <strong>当前测试玩家:</strong> <span id="currentTestPlayer">${testPlayers[currentTestPlayer]}</span>
        </div>
        <div style="margin-bottom: 10px;">
            <button onclick="switchTestPlayer()" style="padding: 5px 10px; margin-right: 5px;">切换玩家</button>
            <button onclick="clearVotes()" style="padding: 5px 10px;">清空投票</button>
        </div>
        <div style="margin-bottom: 10px;">
            <button onclick="closeTestPanel()" style="padding: 5px 10px; background: #dc3545; color: white; border: none; border-radius: 3px;">关闭测试</button>
        </div>
        <div style="font-size: 12px; color: #666;">
            投票状态: <span id="votingStatus">等待投票</span>
        </div>
    `;
    
    document.body.appendChild(testPanel);
    
    // 覆盖getCurrentPlayerId函数用于测试
    window.originalGetCurrentPlayerId = getCurrentPlayerId;
    window.getCurrentPlayerId = () => testPlayers[currentTestPlayer];
    
    // 覆盖isHost函数用于测试
    window.originalIsHost = isHost;
    window.isHost = () => testPlayers[currentTestPlayer].includes('host');
    
    // 切换测试玩家函数
    window.switchTestPlayer = () => {
        currentTestPlayer = (currentTestPlayer + 1) % testPlayers.length;
        document.getElementById('currentTestPlayer').textContent = testPlayers[currentTestPlayer];
        updateTestStatus();
    };
    
    // 清空投票函数
    window.clearVotes = () => {
        playerVotes = {};
        votingResults = {0: 0, 1: 0, 2: 0};
        
        // 清除所有投票样式
        document.querySelectorAll('.hard-mission-box').forEach(box => {
            box.classList.remove('voted', 'selected', 'rejected');
        });
        
        // 清除投票点数显示
        for (let i = 0; i < 3; i++) {
            updateVoteDisplay(i);
        }
        
        updateTestStatus();
        console.log('已清空所有投票');
    };
    
    // 关闭测试面板函数
    window.closeTestPanel = () => {
        // 恢复原始函数
        if (window.originalGetCurrentPlayerId) {
            window.getCurrentPlayerId = window.originalGetCurrentPlayerId;
        }
        if (window.originalIsHost) {
            window.isHost = window.originalIsHost;
        }
        
        // 移除测试面板
        const panel = document.getElementById('votingTestPanel');
        if (panel) {
            panel.remove();
        }
        
        console.log('测试模式已关闭');
    };
    
    // 更新测试状态函数
    window.updateTestStatus = () => {
        const statusEl = document.getElementById('votingStatus');
        if (statusEl) {
            const voteCount = Object.keys(playerVotes).length;
            const totalPlayers = testPlayers.length;
            statusEl.textContent = `${voteCount}/${totalPlayers} 已投票`;
        }
    };
    
    // 定期更新测试状态
    setInterval(updateTestStatus, 1000);
}

// 导出测试函数到全局
window.enableVotingTestMode = enableTestMode;

// 辅助函数
function getCurrentPlayerId() {
    // 如果是多人游戏，返回实际的玩家ID
    if (window.multiplayerManager && window.multiplayerManager.isConnected()) {
        return window.multiplayerManager.getCurrentPlayerId();
    }
    // 单人游戏时返回默认ID，添加时间戳确保唯一性
    return 'player1_' + Date.now();
}

function isHost() {
    // 检查是否是房间主持人
    if (window.multiplayerManager && window.multiplayerManager.isConnected()) {
        return window.multiplayerManager.isHost();
    }
    // 单人游戏时默认为主持人
    return true;
}

function getExpectedPlayerCount() {
    // 获取房间内预期的玩家数量
    if (window.multiplayerManager && window.multiplayerManager.isConnected()) {
        return window.multiplayerManager.getPlayerCount();
    }
    // 单人游戏时返回1
    return 1;
}

// 同步投票状态（供multiplayer.js调用）- 处理服务器发送的投票状态
function syncVotingState(voteData, senderId) {
    console.log('接收到投票状态同步:', voteData, '发送者:', senderId);
    
    // 如果是旧的客户端投票状态同步，转换为新格式
    if (voteData.reset || voteData.realTimeUpdate) {
        console.log('处理旧格式的客户端投票状态同步');
        syncVotingStateOldFormat(voteData, senderId);
        return;
    }
    
    // 处理服务器发送的投票状态同步（新格式）
    if (voteData.votingState) {
        console.log('处理服务器投票状态同步');
        handleServerVotingState(voteData.votingState);
    }
}

// 处理服务器投票状态
function handleServerVotingState(votingState) {
    console.log('处理服务器投票状态:', votingState);
    
    // 更新投票激活状态
    votingActive = votingState.isActive;
    
    // 更新当前困难事件列表
    if (votingState.missions && votingState.missions.length > 0) {
        currentHardMissions = votingState.missions;
        console.log('从服务器同步困难事件列表:', currentHardMissions);
        
        // 如果UI还没有创建，创建UI
        if (!document.querySelector('.hard-mission-box')) {
            createHardMissionUIFromServer(votingState.missions);
        }
    }    // 检查是否是新轮投票开始（重置状态）
    if (votingState.isNewRound) {
        console.log('检测到新轮投票开始，清除普通玩家的投票状态，允许UI重建');
        playerVotes = {};
        votingResults = {0: 0, 1: 0, 2: 0};
        
        // 重置投票结果保护状态，允许UI重建
        votingResultShown = false;
        votingResultTime = null;
        console.log('投票结果保护状态已重置，UI可以重建');
        
        // 清除所有投票相关样式
        document.querySelectorAll('.hard-mission-box').forEach(box => {
            box.classList.remove('voted', 'selected', 'rejected');
        });
        
        // 清除投票点数显示
        for (let i = 0; i < 3; i++) {
            updateVoteDisplay(i);
        }
        
        // 移除之前的投票结果显示
        const existingResult = document.querySelector('.voting-result');
        if (existingResult) {
            existingResult.remove();
        }
    }
    
    // 更新投票记录和结果（从服务器同步最新状态）
    if (votingState.votes) {
        // 完全同步服务器的投票状态，不保留本地状态
        playerVotes = { ...votingState.votes };
        console.log('同步玩家投票记录:', playerVotes);
    }
    
    if (votingState.voteResults) {
        votingResults = { ...votingState.voteResults };
        console.log('同步投票结果:', votingResults);
          // 更新投票点数显示
        Object.keys(votingResults).forEach(index => {
            updateVoteDisplay(parseInt(index));
        });
        
        // 更新所有卡片的投票状态文本
        updateAllVotingStatus();
    }
    
    // 更新投票样式（确保正确显示当前玩家的投票状态）
    const currentPlayerId = getCurrentPlayerId();
    document.querySelectorAll('.hard-mission-box').forEach((box, index) => {
        // 清除所有样式，重新设置
        box.classList.remove('voted', 'selected', 'rejected');
        
        // 如果当前玩家已投票，显示投票样式
        if (playerVotes[currentPlayerId] === index) {
            box.classList.add('voted');
            console.log(`玩家 ${currentPlayerId} 已投票给事件 ${index}，显示voted样式`);
        }
    });
      // 如果投票已完成且有结果，显示结果
    if (votingState.result) {
        console.log('显示服务器投票结果:', votingState.result);
        votingActive = false;
        displayVotingResult(votingState.result);
        
        // 标记投票结果已显示，启动保护期
        votingResultShown = true;
        votingResultTime = Date.now();
        console.log('服务器投票结果显示，启动UI保护期');
    } else if (votingActive) {
        // 如果投票仍在进行中，显示投票说明
        showVotingInstructions();
    }
    
    console.log('服务器投票状态处理完成:', { 
        votingActive, 
        playerVotes, 
        votingResults,
        currentHardMissions,
        currentPlayerId,
        currentPlayerVote: playerVotes[currentPlayerId],
        isNewRound: votingState.isNewRound
    });
}

// 从服务器数据创建困难事件UI
function createHardMissionUIFromServer(missions) {
    const hardMissionsContainer = document.getElementById('hardMissionsContainer');
    const hardMissionsGrid = document.getElementById('hardMissionsGrid');
    
    if (!hardMissionsContainer || !hardMissionsGrid) {
        console.error('困难事件显示容器未找到');
        return;
    }
    
    // 确保能够访问hardmission对象
    const hardmissionObj = window.hardmission || hardmission;
    if (!hardmissionObj) {
        console.error('hardmission对象未找到');
        return;
    }
    
    // 清空现有内容
    hardMissionsGrid.innerHTML = '';
    
    // 创建困难事件UI
    createHardMissionUI(hardMissionsContainer, hardMissionsGrid, hardmissionObj);
}

// 显示投票结果
function displayVotingResult(result) {
    const { selectedIndex, maxVotes, wasTie, selectedMission } = result;
    
    // 标记投票结果已显示，启动保护期
    votingResultShown = true;
    votingResultTime = Date.now();
    console.log('投票结果显示，启动UI保护期');
    
    // 高亮选中的事件，其他变灰
    currentHardMissions.forEach((_, index) => {
        const missionBox = document.querySelector(`[data-mission-index="${index}"]`);
        if (missionBox) {
            if (index === selectedIndex) {
                missionBox.classList.add('selected');
                missionBox.classList.remove('voted');
            } else {
                missionBox.classList.add('rejected');
                missionBox.classList.remove('voted');
            }
        }
    });
    
    // 显示投票结果
    const missionName = selectedMission || currentHardMissions[selectedIndex];
    showVotingResultWithMissionName(selectedIndex, maxVotes, wasTie, missionName);
}

// 处理旧格式的客户端投票状态同步（向后兼容）
function syncVotingStateOldFormat(voteData, senderId) {
    console.log('处理旧格式投票状态同步');
    
    // 如果是重置操作，清除所有状态和样式
    if (voteData.reset) {
        console.log('处理投票重置 - 为普通玩家清除投票状态');
        votingActive = true;
        playerVotes = {};
        votingResults = {0: 0, 1: 0, 2: 0};
        
        // 清除所有投票相关样式
        document.querySelectorAll('.hard-mission-box').forEach(box => {
            box.classList.remove('voted', 'selected', 'rejected');
        });
        
        // 重置所有投票点数显示
        document.querySelectorAll('.vote-dots-container').forEach(container => {
            container.innerHTML = '';
        });
        
        // 移除投票结果显示
        const existingResult = document.querySelector('.voting-result');
        if (existingResult) {
            existingResult.remove();
        }
        
        console.log('投票状态重置完成，普通玩家状态已清除');
    }
    
    // 更新投票状态
    if (voteData.votingActive !== undefined) {
        votingActive = voteData.votingActive;
        console.log('同步投票状态:', votingActive);
    }
    
    // 同步当前困难事件列表
    if (voteData.currentHardMissions && voteData.currentHardMissions.length > 0) {
        currentHardMissions = voteData.currentHardMissions;
        console.log('同步困难事件列表:', currentHardMissions);
    }
    
    if (voteData.votes) {
        // 合并投票记录，保持当前玩家的投票状态
        const currentPlayerId = getCurrentPlayerId();
        const oldPlayerVote = playerVotes[currentPlayerId];
        
        Object.assign(playerVotes, voteData.votes);
        console.log('同步玩家投票记录:', playerVotes);
        
        // 更新投票样式 - 持久化显示
        document.querySelectorAll('.hard-mission-box').forEach((box, index) => {
            box.classList.remove('voted');
            if (playerVotes[currentPlayerId] === index) {
                box.classList.add('voted');
                console.log(`恢复玩家 ${currentPlayerId} 对事件 ${index} 的voted样式`);
            }
        });
    }
    
    if (voteData.results) {
        votingResults = voteData.results;
        Object.keys(votingResults).forEach(index => {
            updateVoteDisplay(parseInt(index));
        });
        console.log('同步投票结果显示:', votingResults);
    }
    
    if (voteData.realTimeUpdate) {
        checkVotingComplete();
    }
}

// 困难模式事件处理（旧的代码保持不变）
document.addEventListener('DOMContentLoaded', function() {
    // 获取弹窗元素（如果存在）
    const modal = document.getElementById('hardMissionModal');
    
    // 点击弹窗背景不再关闭弹窗（仅当modal存在时）
    if (modal) {
        modal.addEventListener('click', function(event) {            // 移除关闭弹窗的功能
            // if (event.target === modal) {
            //     modal.style.display = 'none';
            // }
        });
    }
});

// 同步投票结果（向后兼容函数）
function syncVotingResult(resultData) {
    console.log('接收到投票结果同步（旧格式）:', resultData);
    // 这个函数保持向后兼容，但实际逻辑已移到 handleServerVotingState
}

// 导出函数供其他模块使用 - 移到 DOMContentLoaded 外部以确保立即可用
window.hardMissionVoting = {
    displayHardMissionsWithVoting,
    syncVotingState,
    syncVotingResult,
    handleVote,    isVotingActive: () => {
        // 如果正在投票，返回true
        if (votingActive) {
            return true;
        }
        
        // 对于非主持人，如果已经有困难事件UI，在没有明确开始新轮投票前都保持UI不重建
        if (!isHost() && document.querySelector('.hard-mission-box')) {
            console.log('非主持人且已有困难事件UI，保持不重建直到新轮投票开始');
            return true;
        }
        
        // 如果投票结果刚刚显示，在一定时间内也返回true，避免UI被重建
        if (votingResultShown && votingResultTime) {
            const timeSinceResult = Date.now() - votingResultTime;
            const protectionPeriod = 60000; // 保护期60秒
            if (timeSinceResult < protectionPeriod) {
                console.log(`投票结果保护期内 (${Math.round(timeSinceResult/1000)}s/${protectionPeriod/1000}s)，避免UI重建`);
                return true;
            } else {
                console.log('投票结果保护期已结束，允许UI重建');
                votingResultShown = false;
                votingResultTime = null;
                return false;
            }
        }        
        return false;
    },
    // 强制允许UI重建（用于新轮投票开始时）
    allowUIRebuild: () => {
        console.log('强制允许UI重建');
        votingResultShown = false;
        votingResultTime = null;
    }
};
