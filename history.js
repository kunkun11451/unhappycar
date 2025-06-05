// 管理历史记录的数据与显示
window.historyModule = (() => {
    const historyData = [];

    // 初始化UI与事件
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.style.display = 'none';
    document.body.appendChild(overlay);

    const historyPopup = document.createElement('div');
    historyPopup.className = 'history-popup';
    historyPopup.style.display = 'none';
    document.body.appendChild(historyPopup);

    const historyContent = document.createElement('div');
    historyContent.className = 'history-content';
    historyPopup.appendChild(historyContent);

    // 定义关闭按钮
    const closeHistoryButton = document.createElement('button');
    closeHistoryButton.textContent = '关闭';
    closeHistoryButton.className = 'close-history-button';
    historyPopup.appendChild(closeHistoryButton);

    function initHistoryUI() {
        // 关闭弹窗
        closeHistoryButton.addEventListener('click', hideHistoryPopup);
        overlay.addEventListener('click', hideHistoryPopup);
    }

    // 显示历史记录
    function showHistoryPopup() {
        historyContent.innerHTML = '';

        // 创建表格
        const table = document.createElement('table');
        table.className = 'history-table'; // 添加表格样式类
        table.style.margin = '0 auto';
        table.style.borderCollapse = 'collapse';
        table.style.width = '80%';

        // 填充记录
        if (historyData.length === 0) {
            const emptyRow = document.createElement('tr');
            const emptyCell = document.createElement('td');
            emptyCell.colSpan = 6; // 跨越所有列
            emptyCell.textContent = '开始游戏以记录数据';
            emptyCell.style.textAlign = 'center';
            emptyCell.style.padding = '16px';
            emptyCell.style.color = '#FFFFFF';
            emptyRow.appendChild(emptyCell);
            table.appendChild(emptyRow);
        } else {
            historyData.forEach((round, index) => {
                const row = document.createElement('tr');
                row.style.textAlign = 'center';

                // 轮次
                const roundCell = document.createElement('td');
                roundCell.textContent = ` ${index + 1} `;
                roundCell.style.border = '1px solid #ddd';
                roundCell.style.padding = '8px';
                row.appendChild(roundCell);

                // 本轮用时
                const timeCell = document.createElement('td');
                timeCell.textContent = formatTime(round.roundTime || 0);
                timeCell.style.border = '1px solid #ddd';
                timeCell.style.padding = '8px';
                row.appendChild(timeCell);

                // 玩家角色
                round.forEach(player => {
                    const playerCell = document.createElement('td');
                    playerCell.style.border = '1px solid #ddd';
                    playerCell.style.padding = '8px';
                    if (player.replaced && player.replaced.length > 1) {
                        playerCell.textContent = player.replaced.join('→');
                    } else {
                        playerCell.textContent = player.new;
                    }
                    row.appendChild(playerCell);
                });

                table.appendChild(row);                // 添加动画类名，延迟依次排开
                setTimeout(() => {
                    row.classList.add('animate');
                }, index * 15); // 每一行延迟15ms（加快速度）
            });
        }

        historyContent.appendChild(table);

        overlay.style.display = 'block';
        historyPopup.style.display = 'block';
        document.body.style.overflow = 'hidden';

        // 显示表格动画
        setTimeout(() => {
            table.style.opacity = "1"; // 显示表格
            table.style.transform = "translateY(0)"; // 恢复位置
        }, 50); // 延迟 
    }

    // 隐藏历史记录
    function hideHistoryPopup() {
        // 移除所有动画类，避免下次打开时失效
        document.querySelectorAll('.history-table tr.animate')
            .forEach(row => row.classList.remove('animate'));

        historyPopup.style.display = 'none';
        overlay.style.display = 'none';
        document.body.style.overflow = '';
    }

    // 存储每轮选人结果
    function pushRoundHistory(roundHistory) {
        historyData.push(roundHistory);
    }

    // 更新上一轮的用时
    function updateLastRoundTime(roundTime) {
        const lastRound = historyData[historyData.length - 1];
        if (lastRound) {
            lastRound.roundTime = roundTime;
        }
    }

    // 更新替换角色记录
    function updateSingleCharacter(playerIndex, oldChar, newChar) {
        const lastRound = historyData[historyData.length - 1];
        if (lastRound) {
            if (!lastRound[playerIndex].replaced) {
                lastRound[playerIndex].replaced = [oldChar, newChar];
            } else {
                const lastCharacter = lastRound[playerIndex]
                    .replaced[lastRound[playerIndex].replaced.length - 1];
                if (lastCharacter !== newChar) {
                    lastRound[playerIndex].replaced.push(newChar);
                }
            }
        }
    }

    // 时间格式化
    function formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const remainingSeconds = (seconds % 60).toString().padStart(2, '0');
        return (hours > 0) ? `${hours}:${minutes}:${remainingSeconds}`
                           : `${minutes}:${remainingSeconds}`;
    }

    // 添加一个方法返回历史记录的 HTML 内容
    function getHistoryContent() {
        const container = document.createElement("div");
        const table = document.createElement("table");
        table.className = "history-table";
        table.style.margin = "0 auto";
        table.style.borderCollapse = "collapse";
        table.style.width = "100%";


        // 填充记录
        if (historyData.length === 0) {
            const emptyRow = document.createElement("tr");
            const emptyCell = document.createElement("td");
            emptyCell.colSpan = 6;
            emptyCell.textContent = "开始游戏以记录数据";
            emptyCell.style.textAlign = "center";
            emptyCell.style.padding = "16px";
            emptyCell.style.color = "#666";
            emptyRow.appendChild(emptyCell);
            table.appendChild(emptyRow);
        } else {
            historyData.forEach((round, index) => {
                const row = document.createElement("tr");
                row.style.textAlign = "center";

                const roundCell = document.createElement("td");
                roundCell.textContent = ` ${index + 1} `;
                roundCell.style.border = "1px solid #ddd";
                roundCell.style.padding = "8px";
                row.appendChild(roundCell);

                const timeCell = document.createElement("td");
                timeCell.textContent = formatTime(round.roundTime || 0);
                timeCell.style.border = "1px solid #ddd";
                timeCell.style.padding = "8px";
                row.appendChild(timeCell);

                round.forEach(player => {
                    const playerCell = document.createElement("td");
                    playerCell.style.border = "1px solid #ddd";
                    playerCell.style.padding = "8px";
                    if (player.replaced && player.replaced.length > 1) {
                        playerCell.textContent = player.replaced.join("→");
                    } else {
                        playerCell.textContent = player.new;
                    }
                    row.appendChild(playerCell);
                });

                table.appendChild(row);                // 延迟添加动画类名
                setTimeout(() => {
                    row.classList.add("animate");
                }, index * 15); // 每一行延迟15ms（加快速度）
            });
        }

        container.appendChild(table);
        return container; // 返回 DOM
    }

    // 清空历史记录
    function clearHistory() {
        historyData.length = 0; // 清空历史记录数组

        // 更新历史记录显示内容
        if (historyContent) {
            historyContent.innerHTML = '<p style="text-align: center; color: #666;">开始游戏以记录数据</p>';
        }
    }

    // 暴露方法
    return {
        initHistoryUI,
        pushRoundHistory,
        updateLastRoundTime,
        updateSingleCharacter,
        getHistoryContent,
        clearHistory
    };
})();
