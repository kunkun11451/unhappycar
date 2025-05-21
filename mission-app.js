// 随机事件展示功能
document.addEventListener('DOMContentLoaded', function() {
    window.missionBoxes = document.querySelectorAll('.mission-box');
    const missionButton = document.getElementById('missionButton');
    const hardModeButton = document.getElementById('hardModeButton');
    
    // 初始化时隐藏困难模式按钮
    hardModeButton.style.display = 'none';
    
    // 初始化动画效果
    missionBoxes.forEach((box, index) => {
        setTimeout(() => {
            box.classList.add('active');
            
            // 为每个事件盒子添加玩家标识元素
            const playerTag = document.createElement('div');
            playerTag.className = `player-tag p${index+1}`;
            playerTag.textContent = `P${index+1}`;
            box.appendChild(playerTag);
            
            // 为每个事件盒子添加点击事件，实现单独刷新
            box.addEventListener('click', function() {
                refreshSingleMission(box, index);
            });
        }, 100 * index);
    });
    
    // 从mission.js获取事件数据
    function getMissionKeys() {
        return Object.keys(mission);
    }
    
    // 随机选择事件
    function getRandomMissions(count) {
        const keys = getMissionKeys();
        const shuffled = [...keys].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }
    
    // 刷新单个事件
    function refreshSingleMission(box, index) {
        const keys = getMissionKeys();
        const randomIndex = Math.floor(Math.random() * keys.length);
        const missionKey = keys[randomIndex];
        const missionData = mission[missionKey];
        
        // 重置动画
        box.classList.remove('active');
        
        // 设置事件内容
        const titleElement = box.querySelector('.mission-title');
        const contentElement = box.querySelector('.mission-content');
        
        // 隐藏玩家标识
        const playerTag = box.querySelector('.player-tag');
        if (playerTag) {
            playerTag.classList.remove('show');
        }
        
        // 清空内容
        titleElement.textContent = '';
        contentElement.textContent = '';
        
        // 添加淡出效果
        box.style.opacity = 0;
        
        setTimeout(() => {
            // 设置新内容
            titleElement.textContent = missionKey;
            contentElement.textContent = missionData.内容;
            
            // 添加淡入效果
            box.style.opacity = 1;
            box.classList.add('active');
            
            // 显示玩家标识
            if (playerTag) {
                setTimeout(() => {
                    playerTag.classList.add('show');
                }, 500); // 在内容显示后再显示玩家标识
            }
        }, 300);
    }
    
    // 显示随机事件
    function displayRandomMissions() {
        const randomMissions = getRandomMissions(4);
        
        // 隐藏所有玩家标识
        document.querySelectorAll('.player-tag').forEach(tag => {
            tag.classList.remove('show');
        });
        
        // 隐藏上一次抽到的困难模式事件
        const selectedHardMission = document.getElementById('selectedHardMission');
        if (selectedHardMission) {
            selectedHardMission.style.display = 'none';
        }
        
        missionBoxes.forEach((box, index) => {
            const missionKey = randomMissions[index];
            const missionData = mission[missionKey];
            
            // 重置动画
            box.classList.remove('active');
            
            // 设置事件内容
            const titleElement = box.querySelector('.mission-title');
            const contentElement = box.querySelector('.mission-content');
            
            // 清空内容
            titleElement.textContent = '';
            contentElement.textContent = '';
            
            // 添加淡出效果
            box.style.opacity = 0;
            
            setTimeout(() => {
                // 设置新内容
                titleElement.textContent = missionKey;
                contentElement.textContent = missionData.内容;
                
                // 添加淡入效果
                box.style.opacity = 1;
                box.classList.add('active');
                
                // 显示玩家标识
                const playerTag = box.querySelector('.player-tag');
                if (playerTag) {
                    setTimeout(() => {
                        playerTag.classList.add('show');
                    }, 500); // 在内容显示后再显示玩家标识
                }
            }, 300);
        });
        
        // 显示困难模式按钮
        hardModeButton.style.display = 'inline-block';
    }
    
    // 绑定按钮点击事件
    missionButton.addEventListener('click', () => {
      displayRandomMissions(); // 抽取事件逻辑
    });
});