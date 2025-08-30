// 从事件库获取可用键（模式感知：正常模式=window.mission；不要做挑战=window.noChallengeMission）
function getMissionKeys() {
    const enabledKeys = [];
    const checkboxes = document.querySelectorAll('#personalEventsTable input[type="checkbox"]');
    const isNC = !!(window.noChallengeMode && window.noChallengeMode.active);

    // 如果表格不存在（用户还没打开事件管理），从localStorage读取勾选状态
    if (checkboxes.length === 0) {
        // 优先确保事件数据已从localStorage加载（会加载 nc_missions 或 missions 到对应 window 对象）
        if (window.eventManagement && typeof window.eventManagement.loadEventsFromStorage === 'function') {
            try { window.eventManagement.loadEventsFromStorage(); } catch {}
        }

        // 选择当前模式对应的事件对象
        const missionObj = isNC
            ? (window.noChallengeMission || {})
            : (window.mission || (typeof mission !== 'undefined' ? mission : {}));

        if (!missionObj || Object.keys(missionObj).length === 0) {
            console.error('事件对象未找到或为空（模式：', isNC ? '不要做挑战' : '正常', '）');
            return [];
        }

    // 从localStorage读取保存的勾选状态（模式感知，与管理页一致）
    const savedStateKey = isNC ? 'nc_personalEventsTable-checkedState' : 'personalEventsTable-checkedState';
    const savedState = JSON.parse(localStorage.getItem(savedStateKey)) || {};
        const allKeys = Object.keys(missionObj);

        // 如果没有保存的状态，默认所有事件都启用
        if (Object.keys(savedState).length === 0) {
            return allKeys;
        }

        // 根据保存的状态过滤启用的事件
        return allKeys.filter(key => savedState[key] !== false);
    }

    // 已打开管理表格时，直接依据勾选框
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            enabledKeys.push(checkbox.dataset.key);
        }
    });
    return enabledKeys;
}

// 随机事件展示功能
document.addEventListener('DOMContentLoaded', function() {
    window.missionBoxes = document.querySelectorAll('.mission-box');
    const missionButton = document.getElementById('missionButton');
    // 注意：hardModeButton已被移除，不再需要引用
    const rerollCountDisplay = document.getElementById('rerollCount');
    const increaseRerollButton = document.getElementById('increaseReroll');
    const decreaseRerollButton = document.getElementById('decreaseReroll');
    let rerollCount = 3; // 初始重抽次数   
    let rerollChance = 0.05; // 初始概率为 5%
    let negativeCount = 0; // 累计 -1 的次数  
    // 初始化动画效果
    missionBoxes.forEach((box, index) => {
        setTimeout(() => {
            box.classList.add('active');
            box.dataset.player = `${index + 1}P`;
            
            // 为每个事件盒子添加点击事件，实现单独刷新
            box.addEventListener('click', function() {
                refreshSingleMission(box, index);
            });
        }, 100 * index);
    });
    
    // 随机选择事件
    function getRandomMissions(count) {
        const keys = getMissionKeys(); // 获取已启用的任务
        const shuffled = [...keys].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }
    
    // 更新重抽次数显示
    function updateRerollCount(change) {
        rerollCount += change;
        rerollCountDisplay.textContent = rerollCount; // 更新显示
    }

    // 增加重抽次数
    increaseRerollButton.addEventListener('click', () => {
        updateRerollCount(1);
    });

    // 减少重抽次数
    decreaseRerollButton.addEventListener('click', () => {
        updateRerollCount(-1);
    });

    // 处理值中的内嵌随机格式 [*xx,yy,zz*]
    function processInlineRandomValues(text) {
        // 匹配 [*内容*] 格式的模式
        const inlineRandomPattern = /\[\*([^*]+)\*\]/g;
        
        return text.replace(inlineRandomPattern, (match, content) => {
            // 按逗号分割内容
            const options = content.split(',').map(item => item.trim()).filter(item => item.length > 0);
            
            if (options.length > 0) {
                // 随机选择一个选项
                const randomOption = options[Math.floor(Math.random() * options.length)];
                return randomOption;
            } else {
                // 如果没有有效选项，返回原始文本
                return match;
            }
        });
    }

    // 占位符处理函数
    function processPlaceholders(title, missionData) {
        let processedTitle = title;
        let processedContent = missionData.内容;

        if (missionData.placeholders) {
            for (const placeholder in missionData.placeholders) {
                const values = missionData.placeholders[placeholder];
                if (values && values.length > 0) {
                    // 随机选择一个值
                    let randomValue = values[Math.floor(Math.random() * values.length)];
                    
                    // 处理选中值中的内嵌随机格式
                    randomValue = processInlineRandomValues(randomValue);
                    
                    const regex = new RegExp(`\\[${placeholder}\\]`, 'g');
                    processedTitle = processedTitle.replace(regex, randomValue);
                    processedContent = processedContent.replace(regex, randomValue);
                }
            }
        }
        return { title: processedTitle, content: processedContent };
    }

    // 刷新单个事件
    function refreshSingleMission(box, index) {
        const frozen = !!(window.noChallengeMode && window.noChallengeMode.active && typeof window.noChallengeMode.shouldFreezeIndex === 'function' && window.noChallengeMode.shouldFreezeIndex(index));
        // 检查重抽次数功能是否启用
        if (window.rerollSettings && !window.rerollSettings.enabled) {
            // 重抽次数功能关闭时，允许随意重抽个人事件
        } else {
            // 检查重抽次数是否足够
            if (rerollCount <= 0) {
                alert('重抽次数不足！');
                return;
            }
        }        const keys = getMissionKeys();
        if (keys.length === 0) {
            alert('没有可用的事件！请检查事件管理设置。');
            return;
        }
        
        const randomIndex = Math.floor(Math.random() * keys.length);
        const originalMissionKey = keys[randomIndex];
        
        // 确保事件数据已从localStorage加载
        if (window.eventManagement && typeof window.eventManagement.loadEventsFromStorage === 'function') {
            window.eventManagement.loadEventsFromStorage();
        }
        
        // 确保能够访问事件对象（模式感知）
        const isNC = !!(window.noChallengeMode && window.noChallengeMode.active);
        const missionObj = isNC
            ? (window.noChallengeMission || {})
            : (window.mission || (typeof mission !== 'undefined' ? mission : {}));
        if (!missionObj || !missionObj[originalMissionKey]) {
            console.error('无法找到事件数据:', originalMissionKey);
            alert('事件数据加载失败，请刷新页面重试。');
            return;
        }
        const missionData = missionObj[originalMissionKey];

        // 处理占位符
        const { title: missionKey, content: baseContent } = processPlaceholders(originalMissionKey, missionData);

        // 重置动画（本机P位冻结时不做可见动画，避免闪烁）
        if (!frozen) {
            box.classList.remove('active');
        }

        // 设置事件内容
        const titleElement = box.querySelector('.mission-title');
        const contentElement = box.querySelector('.mission-content');

        // 隐藏玩家标识（冻结时不改动）
        const playerTag = box.querySelector('.player-tag');
        if (!frozen && playerTag) {
            playerTag.classList.remove('show');
        }

        if (!frozen) {
            // 清空内容
            titleElement.textContent = '';
            contentElement.textContent = '';
            contentElement.innerHTML = '';
            // 添加淡出效果
            box.style.opacity = 0;
        }

        setTimeout(() => {
            let modifiedContent = baseContent;

            // 添加随机逻辑 - 根据重抽次数设置决定是否触发
            const randomChance = Math.random();
            if (window.rerollSettings && window.rerollSettings.enabled && randomChance < rerollChance) {
                // 触发附加后，3%概率是归零，97%概率是重抽+-
                if (window.rerollSettings.enableZeroReset && Math.random() < 0.03) {
                    const color = "purple";
                    modifiedContent += `;<span style="color: ${color};">重抽次数归零</span>`;
                    
                    // 直接设置重抽次数为0
                    rerollCount = 0;
                    rerollCountDisplay.textContent = rerollCount;
                } else {
                    // 确定是 +1 还是 -1
                    let rerollResult;
                    if (negativeCount >= 2) {
                        // 如果累计两次 -1，下一次触发时强制为 +1
                        rerollResult = "+1";
                        negativeCount = 0; // 重置计数器
                    } else {
                        // 根据设置决定是否可以获得-1
                        if (window.rerollSettings.enableNegativeReroll) {
                            // 正常随机判断 +1 或 -1
                            rerollResult = Math.random() < 0.5 ? "+1" : "-1";
                        } else {
                            // 关闭负重抽，只能获得+1
                            rerollResult = "+1";
                        }
                        
                        if (rerollResult === "-1") {
                            negativeCount++; // 累计 -1 次数
                        } else {
                            negativeCount = 0; // 如果是 +1，清空 -1 的累计次数
                        }
                    }

                    // 添加重抽次数
                    const color = rerollResult === "+1" ? "green" : "red";
                    modifiedContent += `;<span style="color: ${color};">重抽次数${rerollResult}</span>`;

                    // 更新重抽次数
                    updateRerollCount(rerollResult === "+1" ? 1 : -1);
                }

                // 重置概率
                rerollChance = 0.05;
            } else if (window.rerollSettings && window.rerollSettings.enabled) {
                // 未触发，增加概率
                rerollChance += 0.05;
            }

            if (frozen) {
                // 不改写可见内容，仅更新真实数据供同步
                if (titleElement) titleElement.dataset.realTitle = missionKey;
                if (contentElement) contentElement.dataset.realContent = modifiedContent;
                // 若需要，可在此处再次遮蔽（通常已是问号，无需处理）
            } else {
                // 设置新内容
                titleElement.textContent = missionKey;
                // 确保内容被正确更新到卡片
                contentElement.textContent = modifiedContent;
                contentElement.innerHTML = modifiedContent;
                // 添加淡入效果
                box.style.opacity = 1;
                box.classList.add('active');
                // 显示玩家标识
                if (playerTag) {
                    setTimeout(() => {
                        playerTag.classList.add('show');
                    }, 500);
                }
            }

            // 更新事件历史记录
            if (!(window.noChallengeMode && window.noChallengeMode.active) && window.eventHistoryModule && window.eventHistoryModule.eventHistoryData.length > 0) {
                const lastRound = window.eventHistoryModule.eventHistoryData[
                    window.eventHistoryModule.eventHistoryData.length - 1
                ];
                const currentEvent = lastRound[index];
                if (currentEvent) {
                    // 将当前事件添加到切换链条，并保存实际内容
                    currentEvent.replaced.push(missionKey);
                    // 保存实际生成的内容到最新替换的事件
                    if (!currentEvent.replacedContents) {
                        currentEvent.replacedContents = [];
                    }
                    currentEvent.replacedContents.push(modifiedContent);
                }
            }
    }, 300);

        // 减少重抽次数（点击卡片时至少需要 1 次）
        updateRerollCount(-1);
    }      // 显示随机事件
    function displayRandomMissions() {
        const randomMissions = getRandomMissions(4);
        
        if (randomMissions.length === 0) {
            alert('没有可用的事件！请检查事件管理设置。');
            return;
        }
        
        // 确保事件数据已从localStorage加载
        if (window.eventManagement && typeof window.eventManagement.loadEventsFromStorage === 'function') {
            window.eventManagement.loadEventsFromStorage();
        }
        
        // 确保能够访问事件对象（模式感知）
        const isNC = !!(window.noChallengeMode && window.noChallengeMode.active);
        const missionObj = isNC
            ? (window.noChallengeMission || {})
            : (window.mission || (typeof mission !== 'undefined' ? mission : {}));
        if (!missionObj || Object.keys(missionObj).length === 0) {
            alert('事件数据未加载，请刷新页面重试。');
            return;
        }
        
        // 记录本轮事件（需要在处理完占位符后记录）
        const roundEvents = [];
        
        // 将事件存入事件历史（先不调用，稍后在循环中处理完占位符后再调用）
        // window.eventHistoryModule.pushEventRoundHistory(roundEvents);

        // 隐藏所有玩家标识
        document.querySelectorAll('.player-tag').forEach(tag => {
            tag.classList.remove('show');
        });
        
        // 同时抽取并显示困难事件
        displayHardMissions();
        
        missionBoxes.forEach((box, index) => {
            const originalMissionKey = randomMissions[index];
            const missionData = missionObj[originalMissionKey];
            
            if (!missionData) {
                console.error('无法找到事件数据:', originalMissionKey);
                return;
            }

            // 处理占位符
            const { title: missionKey, content: baseContent } = processPlaceholders(originalMissionKey, missionData);

            // 重置动画
            box.classList.remove('active');

            // 设置事件内容
            const titleElement = box.querySelector('.mission-title');
            const contentElement = box.querySelector('.mission-content');

            // 清空内容
            titleElement.textContent = '';
            contentElement.textContent = '';
            contentElement.innerHTML = ''
            
            // 添加淡出效果
            box.style.opacity = 0;

            setTimeout(() => {
                // 设置新内容
                titleElement.textContent = missionKey;

                let modifiedContent = baseContent;

            // 添加随机逻辑 - 根据重抽次数设置决定是否触发
            const randomChance = Math.random();
            if (window.rerollSettings && window.rerollSettings.enabled && randomChance < rerollChance) {
                // 检查是否触发重抽归零（1%概率）
                if (window.rerollSettings.enableZeroReset && Math.random() < 0.01) {
                    const color = "purple";
                    modifiedContent += `;<span style="color: ${color};">重抽次数归零！</span>`;
                    
                    // 直接设置重抽次数为0
                    rerollCount = 0;
                    rerollCountDisplay.textContent = rerollCount;
                } else {
                    // 确定是 +1 还是 -1
                    let rerollResult;
                    if (negativeCount >= 2) {
                        // 如果累计两次 -1，下一次触发时强制为 +1
                        rerollResult = "+1";
                        negativeCount = 0; // 重置计数器
                    } else {
                        // 根据设置决定是否可以获得-1
                        if (window.rerollSettings.enableNegativeReroll) {
                            // 正常随机判断 +1 或 -1
                            rerollResult = Math.random() < 0.5 ? "+1" : "-1";
                        } else {
                            // 关闭负重抽，只能获得+1
                            rerollResult = "+1";
                        }
                        
                        if (rerollResult === "-1") {
                            negativeCount++; // 累计 -1 次数
                        } else {
                            negativeCount = 0; // 如果是 +1，清空 -1 的累计次数
                        }
                    }

                    // 添加重抽次数
                    const color = rerollResult === "+1" ? "green" : "red";
                    modifiedContent += `;<span style="color: ${color};">重抽次数${rerollResult}</span>`;

                    // 更新重抽次数
                    updateRerollCount(rerollResult === "+1" ? 1 : -1);
                }

                // 重置概率
                rerollChance = 0.05;
            } else if (window.rerollSettings && window.rerollSettings.enabled) {
                // 未触发，增加概率
                rerollChance += 0.05;
            }

            // 确保内容被正确更新到卡片
                contentElement.textContent = modifiedContent;
                contentElement.innerHTML = modifiedContent;

                // 记录处理后的事件到历史记录
                roundEvents.push({
                    event: missionKey, // 使用处理后的标题
                    content: modifiedContent // 保存处理后的完整内容
                });

                // 添加淡入效果
                box.style.opacity = 1;
                box.classList.add('active');
                
                // 显示玩家标识
                const playerTag = box.querySelector('.player-tag');
                if (playerTag) {                setTimeout(() => {
                        playerTag.classList.add('show');
                    }, 500); // 在内容显示后再显示玩家标识
                }
            }, 300);
        });
        
        // 在所有任务处理完成后，记录到历史
        setTimeout(() => {
            if (roundEvents.length > 0 && !(window.noChallengeMode && window.noChallengeMode.active)) {
                window.eventHistoryModule.pushEventRoundHistory(roundEvents);
            }
        }, 350); // 确保在内容设置完成后再记录
        
        // 不再显示困难模式按钮，因为困难事件会自动显示
        // hardModeButton.style.display = 'inline-block';
    }    // 显示困难事件的函数
    function displayHardMissions() {
        // 不要做挑战：彻底禁用团体事件展示
        if (window.noChallengeMode && window.noChallengeMode.active) {
            const cont = document.getElementById('hardMissionsContainer');
            const sel = document.getElementById('selectedHardMission');
            if (cont) cont.style.display = 'none';
            if (sel) sel.style.display = 'none';
            return;
        }
        // 获取三个随机困难事件
        const hardMissionKeys = typeof getHardMissionKeys === 'function' ? getHardMissionKeys() : [];
        if (hardMissionKeys.length === 0) {
            console.log('没有可用的困难事件');
            return;
        }
        
        // 随机选择三个困难事件
        const shuffled = [...hardMissionKeys].sort(() => 0.5 - Math.random());
        const selectedHardMissions = shuffled.slice(0, 3);        // 调用投票系统显示困难事件
        const tryDisplayHardMissions = () => {
            if (window.hardMissionVoting && window.hardMissionVoting.displayHardMissionsWithVoting) {
                console.log('调用困难事件投票系统，事件数量:', selectedHardMissions.length);
                window.hardMissionVoting.displayHardMissionsWithVoting(selectedHardMissions);
            } else {
                console.log('等待困难事件投票系统加载...');
                // 如果投票系统还没加载完成，稍后重试
                setTimeout(tryDisplayHardMissions, 50);
            }
        };
        
        tryDisplayHardMissions();
    }
    
    // 绑定按钮点击事件
    missionButton.addEventListener('click', () => {
      displayRandomMissions(); // 抽取事件逻辑
    });
    
    function saveCheckedState(tableId) {
        const checkboxes = document.querySelectorAll(`#${tableId} input[type="checkbox"]`);
        const checkedState = {};
        checkboxes.forEach(checkbox => {
            checkedState[checkbox.dataset.key] = checkbox.checked; // 保存每个任务的勾选状态
        });
        localStorage.setItem(`${tableId}-checkedState`, JSON.stringify(checkedState)); // 存储到 localStorage
    }
    
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

    const viewProbabilityText = document.getElementById('viewProbabilityText');
    const probabilityPopup = document.getElementById('probabilityPopup');

    // 点击文字显示弹窗
    viewProbabilityText.addEventListener('click', function (event) {
        if (probabilityPopup.style.display === 'none') {
                // 显示弹窗
            probabilityPopup.style.display = 'block';

            // 在手机端居中显示
            if (window.innerWidth <= 768) {
                probabilityPopup.style.left = '5%';
                probabilityPopup.style.top = `${window.scrollY + 100}px`; // 距离顶部 100px
            } else {
                // 桌面端显示在文字旁边
                probabilityPopup.style.left = `${event.pageX + 10}px`;
                probabilityPopup.style.top = `${event.pageY}px`;
            }
        } else {
            // 隐藏弹窗
            probabilityPopup.style.display = 'none';
        }
    });

    // 点击页面其他地方隐藏弹窗
    document.addEventListener('click', function (event) {
        if (!viewProbabilityText.contains(event.target) && !probabilityPopup.contains(event.target)) {
            probabilityPopup.style.display = 'none';
        }
    });
});

// 初始化重抽次数UI状态
function initializeRerollUI() {
    // 确保重抽设置已初始化
    if (!window.rerollSettings) {
        window.rerollSettings = {
            enabled: true,
            enableZeroReset: true,
            enableNegativeReroll: true
        };
    }
    
    // 根据设置更新重抽计数器显示
    if (window.updateRerollUI) {
        window.updateRerollUI();
    }
}

// 页面加载时初始化重抽UI
document.addEventListener('DOMContentLoaded', initializeRerollUI);

// 暴露一些函数用于测试（可以在浏览器控制台中使用）
function testInlineRandomValues(text) {
    // 匹配 [*内容*] 格式的模式
    const inlineRandomPattern = /\[\*([^*]+)\*\]/g;
    
    return text.replace(inlineRandomPattern, (match, content) => {
        // 按逗号分割内容
        const options = content.split(',').map(item => item.trim()).filter(item => item.length > 0);
        
        if (options.length > 0) {
            // 随机选择一个选项
            const randomOption = options[Math.floor(Math.random() * options.length)];
            return randomOption;
        } else {
            // 如果没有有效选项，返回原始文本
            return match;
        }
    });
}

// 暴露测试函数到全局作用域以便在控制台测试
window.testInlineRandom = testInlineRandomValues;
