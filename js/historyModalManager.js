// 新的历史记录弹窗管理器
window.historyModalManager = (() => {
    let isInitialized = false;
    let currentTab = 'character';

    function init() {
        if (isInitialized) return;
        
        const historyOverlay = document.getElementById('historyOverlay');
        const historyModal = document.getElementById('historyModal');
        const closeButton = document.getElementById('closeHistoryModal');
        const characterTab = document.getElementById('characterHistoryTab');
        const eventTab = document.getElementById('eventHistoryTab');
        const characterList = document.getElementById('characterHistoryList');
        const eventList = document.getElementById('eventHistoryList');

        // 显示历史记录弹窗
        window.showHistoryModal = () => {
            // 先更新内容
            updateHistoryContent();

            // 不要做挑战：非主持人隐藏“事件历史”标签与内容
            try {
                const isNC = !!(window.noChallengeMode && window.noChallengeMode.active);
                const isHost = !!(window.multiplayerManager && typeof window.multiplayerManager.isHost === 'function' && window.multiplayerManager.isHost());
                if (isNC && !isHost) {
                    if (eventTab) eventTab.style.display = 'none';
                    if (eventList) eventList.style.display = 'none';
                    currentTab = 'character';
                } else {
                    if (eventTab) eventTab.style.display = '';
                    if (eventList) eventList.style.display = '';
                }
                // 同步按钮和内容区的 active 状态
                characterTab.classList.toggle('active', currentTab === 'character');
                eventTab.classList.toggle('active', currentTab === 'event');
                characterList.classList.toggle('active', currentTab === 'character');
                eventList.classList.toggle('active', currentTab === 'event');
            } catch {}

            // 显示弹窗
            historyOverlay.style.display = 'block';
            historyModal.style.display = 'block';
            
            // 添加动画类
            setTimeout(() => {
                historyOverlay.classList.add('show');
                historyModal.classList.add('show');
            }, 10);
            
            // 阻止背景滚动
            document.body.style.overflow = 'hidden';
        };

        // 隐藏历史记录弹窗
        const hideHistoryModal = () => {
            // 移除显示类，添加隐藏类
            historyOverlay.classList.remove('show');
            historyOverlay.classList.add('hide');
            historyModal.classList.remove('show');
            historyModal.classList.add('hide');
            
            // 等待动画完成后隐藏元素
            setTimeout(() => {
                historyOverlay.style.display = 'none';
                historyModal.style.display = 'none';
                historyOverlay.classList.remove('hide');
                historyModal.classList.remove('hide');
            }, 300);
            
            // 恢复背景滚动
            document.body.style.overflow = '';
            
            // 清理提示框
            const tooltip = document.querySelector('.history-tooltip');
            if (tooltip) {
                tooltip.remove();
            }
        };

        // 切换标签页
        const switchTab = (tab) => {
            currentTab = tab;
            
            // 更新标签按钮状态
            characterTab.classList.toggle('active', tab === 'character');
            eventTab.classList.toggle('active', tab === 'event');
            
            // 更新内容显示
            characterList.classList.toggle('active', tab === 'character');
            eventList.classList.toggle('active', tab === 'event');
            
            // 更新内容
            updateHistoryContent();
        };

        // 更新历史记录内容
        const updateHistoryContent = () => {
            if (currentTab === 'character') {
                updateCharacterHistory();
            } else {
                updateEventHistory();
            }
        };

        // 更新角色历史记录
        const updateCharacterHistory = () => {
            const container = characterList;
            container.innerHTML = '';

            if (!window.historyModule || !window.historyModule.historyData || window.historyModule.historyData.length === 0) {
                container.innerHTML = `
                    <div class="history-empty">
                        <div class="history-empty-icon">
                            <svg data-name="Layer 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
                                <path d="m1.5 13v1a.5.5 0 0 0 .3379.4731 18.9718 18.9718 0 0 0 6.1621 1.0269 18.9629 18.9629 0 0 0 6.1621-1.0269.5.5 0 0 0 .3379-.4731v-1a6.5083 6.5083 0 0 0 -4.461-6.1676 3.5 3.5 0 1 0 -4.078 0 6.5083 6.5083 0 0 0 -4.461 6.1676zm4-9a2.5 2.5 0 1 1 2.5 2.5 2.5026 2.5026 0 0 1 -2.5-2.5zm2.5 3.5a5.5066 5.5066 0 0 1 5.5 5.5v.6392a18.08 18.08 0 0 1 -11 0v-.6392a5.5066 5.5066 0 0 1 5.5-5.5z"></path>
                            </svg>
                        </div>
                        <div class="history-empty-text">暂无角色历史记录</div>
                        <div class="history-empty-subtext">开始游戏后会自动记录角色选择历史</div>
                    </div>
                `;
                return;
            }

            // 创建表格
            const table = document.createElement('table');
            table.className = 'history-table';

            // // 创建表头
            // const thead = document.createElement('thead');
            // const headerRow = document.createElement('tr');
            
            // const headers = ['轮次', '本轮用时', '玩家1', '玩家2', '玩家3', '玩家4'];
            // headers.forEach(headerText => {
            //     const th = document.createElement('th');
            //     th.textContent = headerText;
            //     headerRow.appendChild(th);
            // });
            
            // thead.appendChild(headerRow);
            // table.appendChild(thead);

            // 创建表体
            const tbody = document.createElement('tbody');

            const formatTime = (seconds) => {
                if (!seconds) return '00:00';
                const hours = Math.floor(seconds / 3600);
                const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
                const remainingSeconds = (seconds % 60).toString().padStart(2, '0');
                return (hours > 0) ? `${hours}:${minutes}:${remainingSeconds}` : `${minutes}:${remainingSeconds}`;
            };

            window.historyModule.historyData.forEach((round, index) => {
                const row = document.createElement('tr');

                // 轮次
                const roundCell = document.createElement('td');
                roundCell.textContent = `${index + 1}`;
                row.appendChild(roundCell);

                // 本轮用时
                const timeCell = document.createElement('td');
                timeCell.textContent = formatTime(round.roundTime || 0);
                row.appendChild(timeCell);

                // 玩家角色
                round.characters.forEach(player => {
                    const playerCell = document.createElement('td');
                    if (player.replaced && player.replaced.length > 1) {
                        playerCell.textContent = player.replaced.join('→');
                    } else {
                        playerCell.textContent = player.new;
                    }
                    row.appendChild(playerCell);
                });

                tbody.appendChild(row);

                // 添加动画效果
                setTimeout(() => {
                    row.classList.add('animate');
                }, index * 30);
            });

            table.appendChild(tbody);
            container.appendChild(table);

            // 显示表格动画
            setTimeout(() => {
                table.classList.add("visible");
            }, 50);
        };

        // 更新事件历史记录
        const updateEventHistory = () => {
            const container = eventList;
            container.innerHTML = '';

            if (!window.eventHistoryModule || !window.eventHistoryModule.eventHistoryData || window.eventHistoryModule.eventHistoryData.length === 0) {
                container.innerHTML = `
                    <div class="history-empty">
                        <div class="history-empty-icon">
                            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                                <line x1="12" y1="12" x2="12" y2="7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                <line x1="12" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        </div>
                        <div class="history-empty-text">暂无事件历史记录</div>
                        <div class="history-empty-subtext">开始抽取事件后会自动记录事件历史</div>
                    </div>
                `;
                return;
            }

            // 创建提示框
            const tooltip = document.createElement('div');
            tooltip.className = 'history-tooltip';
            document.body.appendChild(tooltip);

            // 查找事件内容的函数
            const findEventContent = (eventKey) => {
                const sources = [
                    window.mission,
                    typeof mission !== 'undefined' ? mission : null,
                    window.hardmission,
                    typeof hardmission !== 'undefined' ? hardmission : null
                ];
                
                for (const source of sources) {
                    if (source && source[eventKey]) {
                        return source[eventKey].内容 || source[eventKey].content || '';
                    }
                }
                return null;
            };

            // 创建表格
            const table = document.createElement('table');
            table.className = 'history-table';

            // // 创建表头
            // const thead = document.createElement('thead');
            // const headerRow = document.createElement('tr');
            
            // const headers = ['轮次', '玩家1', '玩家2', '玩家3', '玩家4'];
            // headers.forEach(headerText => {
            //     const th = document.createElement('th');
            //     th.textContent = headerText;
            //     headerRow.appendChild(th);
            // });
            
            // thead.appendChild(headerRow);
            // table.appendChild(thead);

            // 创建表体
            const tbody = document.createElement('tbody');

            window.eventHistoryModule.eventHistoryData.forEach((round, index) => {
                const personalEvents = round.filter(event => event.type === 'personal');
                const teamEvent = round.find(event => event.type === 'team');

                const row = document.createElement('tr');

                // 轮次
                const roundCell = document.createElement('td');
                roundCell.textContent = `${index + 1}`;
                if (teamEvent) {
                    roundCell.rowSpan = 2;
                }
                row.appendChild(roundCell);

                // 个人事件
                personalEvents.forEach(player => {
                    const playerCell = document.createElement('td');
                    
                    // 显示事件切换链条
                    if (player.replaced && player.replaced.length > 0) {
                        playerCell.textContent = `${player.original} → ${player.replaced.join(" → ")}`;
                    } else {
                        playerCell.textContent = player.original || "（无）";
                    }

                    // 添加鼠标悬停事件
                    const allEvents = [player.original, ...(player.replaced || [])];
                    playerCell.addEventListener("mousemove", (e) => {
                        const cellWidth = playerCell.offsetWidth;
                        const segmentWidth = cellWidth / allEvents.length; 
                        const hoverIndex = Math.min(
                            Math.floor(e.offsetX / segmentWidth),
                            allEvents.length - 1
                        );
                        const eventKey = allEvents[hoverIndex];
                        
                        let eventContent = null;
                        if (hoverIndex === 0) {
                            eventContent = player.originalContent;
                        } else {
                            const replacedIndex = hoverIndex - 1;
                            if (player.replacedContents && player.replacedContents[replacedIndex]) {
                                eventContent = player.replacedContents[replacedIndex];
                            } else {
                                eventContent = findEventContent(eventKey);
                            }
                        }
                        
                        if (!eventContent) {
                            eventContent = findEventContent(eventKey);
                        }
                        
                        if (eventContent) {
                            tooltip.textContent = eventContent; 
                            tooltip.style.display = "block";
                            tooltip.style.left = `${e.pageX + 10}px`;
                            tooltip.style.top = `${e.pageY + 10}px`;
                        } else {
                            tooltip.textContent = "未知事件";
                            tooltip.style.display = "block";
                            tooltip.style.left = `${e.pageX + 10}px`;
                            tooltip.style.top = `${e.pageY + 10}px`;
                        }
                    });

                    playerCell.addEventListener("mouseleave", () => {
                        tooltip.style.display = "none"; 
                    });

                    row.appendChild(playerCell);
                });

                tbody.appendChild(row);

                // 团队事件行
                if (teamEvent) {
                    const teamEventRow = document.createElement('tr');
                    teamEventRow.className = 'team-event-row';

                    const teamEventCell = document.createElement('td');
                    teamEventCell.colSpan = 4;
                    teamEventCell.textContent = `团队事件—— ${teamEvent.title || '(无标题)'} —— ${teamEvent.result || '-'}`;

                    // 添加团队事件悬停提示
                    teamEventCell.addEventListener("mousemove", (e) => {
                        if (teamEvent.content) {
                            tooltip.textContent = teamEvent.content;
                            tooltip.style.display = "block";
                            tooltip.style.left = `${e.pageX + 10}px`;
                            tooltip.style.top = `${e.pageY + 10}px`;
                        } else {
                            tooltip.textContent = "没有找到这个事件的内容";
                            tooltip.style.display = "block";
                            tooltip.style.left = `${e.pageX + 10}px`;
                            tooltip.style.top = `${e.pageY + 10}px`;
                        }
                    });

                    teamEventCell.addEventListener("mouseleave", () => {
                        tooltip.style.display = "none";
                    });

                    teamEventRow.appendChild(teamEventCell);
                    tbody.appendChild(teamEventRow);
                    
                    // 为团队事件行也添加动画
                    setTimeout(() => {
                        teamEventRow.classList.add("animate");
                    }, index * 30 + 15);
                }

                // 添加动画效果
                setTimeout(() => {
                    row.classList.add('animate');
                }, index * 30);
            });

            table.appendChild(tbody);
            container.appendChild(table);

            // 显示表格动画
            setTimeout(() => {
                table.classList.add("visible");
            }, 50);
        };

        // 绑定事件监听器
        closeButton.addEventListener('click', hideHistoryModal);
        historyOverlay.addEventListener('click', hideHistoryModal);
        characterTab.addEventListener('click', () => switchTab('character'));
        eventTab.addEventListener('click', () => switchTab('event'));

        // 阻止弹窗内部点击事件冒泡
        historyModal.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // 键盘事件：按ESC关闭弹窗
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && historyModal.style.display === 'block') {
                hideHistoryModal();
            }
        });

        isInitialized = true;
    }

    // 公开方法
    return {
        init,
        show: () => {
            if (!isInitialized) init();
            window.showHistoryModal();
        }
    };
})();

// 在DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.historyModalManager.init();
});
