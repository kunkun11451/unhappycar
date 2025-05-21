// 困难模式事件处理
document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const hardModeButton = document.getElementById('hardModeButton');
    const selectedHardMission = document.getElementById('selectedHardMission');
    
    // 创建模态框元素
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-title">困难模式</div>
            <div class="modal-cards-container">
                <div class="hard-card" id="modalCard1">
                    <div class="card-inner">
                        <div class="card-front">
                            <img src="face.png" alt="卡牌正面">
                            <div class="hard-mission-title"></div>
                            <div class="hard-mission-content"></div>
                        </div>
                        <div class="card-back">
                            <img src="back.png" alt="卡牌背面">
                        </div>
                    </div>
                </div>
                <div class="hard-card" id="modalCard2">
                    <div class="card-inner">
                        <div class="card-front">
                            <img src="face.png" alt="卡牌正面">
                            <div class="hard-mission-title"></div>
                            <div class="hard-mission-content"></div>
                        </div>
                        <div class="card-back">
                            <img src="back.png" alt="卡牌背面">
                        </div>
                    </div>
                </div>
                <div class="hard-card" id="modalCard3">
                    <div class="card-inner">
                        <div class="card-front">
                            <img src="face.png" alt="卡牌正面">
                            <div class="hard-mission-title"></div>
                            <div class="hard-mission-content"></div>
                        </div>
                        <div class="card-back">
                            <img src="back.png" alt="卡牌背面">
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-instruction" style="display: none;">请做出你的选择</div>
            <button id="cancelButton" class="cancel-button">还是算了吧</button>
        </div>
    `;
    document.body.appendChild(modal);
    
    // 从hardmission.js中获取困难模式事件
    function getHardMissionKeys() {
        return Object.keys(hardmission);
    }
    
    // 获取随机困难模式事件
    function getRandomHardMissions(count) {
        const keys = getHardMissionKeys();
        const shuffled = [...keys].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }
    
    // 获取单个随机困难模式事件（不重复）
    function getOneRandomHardMission(excludeKeys) {
        const keys = getHardMissionKeys().filter(key => !excludeKeys.includes(key));
        if (keys.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * keys.length);
        return keys[randomIndex];
    }
    
    // 设置卡牌内容并添加事件监听
    function setupCards() {
        // 获取三个随机困难模式事件
        const randomHardMissions = getRandomHardMissions(3);
        const modalCards = modal.querySelectorAll('.hard-card');
        
        // 为每张卡牌设置事件内容
        modalCards.forEach((card, index) => {
            const missionKey = randomHardMissions[index];
            const missionData = hardmission[missionKey];
            
            const titleElement = card.querySelector('.hard-mission-title');
            const contentElement = card.querySelector('.hard-mission-content');
            
            titleElement.textContent = missionKey;
            
            // 检查是否为"谁？"事件，如果是则随机选择NPC替换内容
            if (missionKey === "谁？") {
                // 获取所有NPC的名字
                const npcNames = Object.keys(npc || {});
                if (npcNames.length > 0) {
                    // 随机选择一个NPC
                    const randomIndex = Math.floor(Math.random() * npcNames.length);
                    const randomNpcName = npcNames[randomIndex];
                    const npcData = npc[randomNpcName];
                    
                    // 替换内容中的占位符
                    let modifiedContent = missionData.内容
                        .replace("AA", randomNpcName)
                        .replace("BB", npcData.国家)
                        .replace("CC", npcData.职业);
                    
                    contentElement.textContent = modifiedContent;
                    
                    // 保存原始NPC数据到卡牌元素，以便后续使用
                    card.dataset.npcName = randomNpcName;
                    card.dataset.npcCountry = npcData.国家;
                    card.dataset.npcJob = npcData.职业;
                } else {
                    contentElement.textContent = missionData.内容;
                }
            } else {
                contentElement.textContent = missionData.内容;
            }
            
            // 重置卡牌状态
            card.classList.remove('flipped');
            card.classList.remove('revealed');
            card.dataset.missionKey = missionKey;
            
            // 确保卡片背面和正面的显示状态正确
            const cardBack = card.querySelector('.card-back');
            const cardFront = card.querySelector('.card-front');
            cardBack.style.display = '';
            cardFront.style.display = '';
            
            // 移除之前的点击事件
            card.replaceWith(card.cloneNode(true));
        });
        
        // 重新获取卡牌元素（因为上面的replaceWith操作）
        const newModalCards = modal.querySelectorAll('.hard-card');
        
        // 隐藏选择提示
        modal.querySelector('.modal-instruction').style.display = 'none';
        
        // 为每张卡牌添加点击事件
        newModalCards.forEach(card => {
            // 为卡牌添加点击事件
            card.addEventListener('click', function() {
                // 如果所有卡牌都已显示正面，则可以选择
                if (modal.querySelector('.modal-instruction').style.display === 'block') {
                    const missionKey = this.dataset.missionKey;
                    const missionData = hardmission[missionKey];
                    
                    // 显示选中的困难模式事件
                    selectedHardMission.style.display = 'block';
                    selectedHardMission.querySelector('.mission-title').textContent = missionKey;
                    
                    // 检查是否为"谁？"事件，如果是则使用保存的NPC数据
                    if (missionKey === "谁？" && this.dataset.npcName) {
                        let modifiedContent = missionData.内容
                            .replace("AA", this.dataset.npcName)
                            .replace("BB", this.dataset.npcCountry)
                            .replace("CC", this.dataset.npcJob);
                        
                        selectedHardMission.querySelector('.mission-content').textContent = modifiedContent;
                    } else {
                        selectedHardMission.querySelector('.mission-content').textContent = missionData.内容;
                    }
                    
                    // 隐藏弹窗
                    modal.style.display = 'none';
                    
                    // 隐藏困难模式按钮，直到下次点击抽取事件按钮
                    hardModeButton.style.display = 'none';
                    
                    // 恢复背景滚动
                    document.body.style.overflow = '';
                } else if (!this.classList.contains('revealed')) {
                    // 使用翻转效果而不是直接修改显示属性
                    this.classList.add('flipped');
                    
                    // 标记为已显示
                    this.classList.add('revealed');
                    
                    // 检查是否所有卡牌都已显示
                    const allRevealed = Array.from(newModalCards).every(card => card.classList.contains('revealed'));
                    
                    if (allRevealed) {
                        // 显示选择提示
                        modal.querySelector('.modal-instruction').style.display = 'block';
                    }
                }
            });
        });
    }
    
    // 点击困难模式按钮
    hardModeButton.addEventListener('click', function() {
        // 每次点击按钮时重新设置卡牌
        setupCards();

        // 显示弹窗
        modal.style.display = 'block';

        // 如果是主持人，确保困难模式事件区域隐藏，直到选择一个事件
        if (isHost) {
            const selectedHardMission = document.getElementById('selectedHardMission');
            if (selectedHardMission) {
                selectedHardMission.style.display = 'none';
            }
        }

        // 移动端优化：禁止背景滚动
        document.body.style.overflow = 'hidden';
    });
    
    // 点击弹窗背景不再关闭弹窗
    modal.addEventListener('click', function(event) {
        // 移除关闭弹窗的功能
        // if (event.target === modal) {
        //     modal.style.display = 'none';
        // }
    });
    
    // 当选择卡牌后恢复背景滚动
    function restoreBodyScroll() {
        document.body.style.overflow = '';
    }
    
    // 修改卡牌点击事件处理函数
    function handleCardClick(card, newModalCards) {
        // 如果所有卡牌都已显示正面，则可以选择
        if (modal.querySelector('.modal-instruction').style.display === 'block') {
            const missionKey = card.dataset.missionKey;
            const missionData = hardmission[missionKey];
            
            // 显示选中的困难模式事件
            selectedHardMission.style.display = 'block';
            selectedHardMission.querySelector('.mission-title').textContent = missionKey;
            
            // 检查是否为"谁？"事件，如果是则使用保存的NPC数据
            if (missionKey === "谁？" && card.dataset.npcName) {
                let modifiedContent = missionData.内容
                    .replace("AA", card.dataset.npcName)
                    .replace("BB", card.dataset.npcCountry)
                    .replace("CC", card.dataset.npcJob);
                
                selectedHardMission.querySelector('.mission-content').textContent = modifiedContent;
            } else {
                selectedHardMission.querySelector('.mission-content').textContent = missionData.内容;
            }
            
            // 隐藏弹窗
            modal.style.display = 'none';
            
            // 隐藏困难模式按钮，直到下次点击抽取事件按钮
            hardModeButton.style.display = 'none';
            
            // 恢复背景滚动
            restoreBodyScroll();
        } else if (!card.classList.contains('revealed')) {
            // 使用翻转效果而不是直接修改显示属性
            card.classList.add('flipped');
            
            // 标记为已显示
            card.classList.add('revealed');
            
            // 检查是否所有卡牌都已显示
            const allRevealed = Array.from(newModalCards).every(c => c.classList.contains('revealed'));
            
            if (allRevealed) {
                // 显示选择提示
                modal.querySelector('.modal-instruction').style.display = 'block';
            }
        }
    }
    
    // 为"还是算了吧"按钮添加点击事件
    document.getElementById('cancelButton').addEventListener('click', function() {
        // 显示"那可不行"的提示
        alert('那可不行');
    });
});