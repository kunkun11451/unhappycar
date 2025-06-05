window.eventHistoryModule = (() => {
  const eventHistoryData = [];

  function pushEventRoundHistory(roundEvents) {
    const initializedRound = roundEvents.map(event => ({
      original: event.event,
      replaced: [] 
    }));
    eventHistoryData.push(initializedRound);
  }

  function getEventHistoryContent() {
    const container = document.createElement("div");

    // 创建表格
    const table = document.createElement("table");
    table.className = "history-table";
    table.style.margin = "0 auto";
    table.style.borderCollapse = "collapse";
    table.style.width = "100%";

    // 创建自定义工具提示元素
    const tooltip = document.createElement("div");
    tooltip.style.position = "absolute";
    tooltip.style.backgroundColor = "#333";
    tooltip.style.color = "#fff";
    tooltip.style.padding = "5px 10px";
    tooltip.style.borderRadius = "4px";
    tooltip.style.fontSize = "12px";
    tooltip.style.display = "none";
    tooltip.style.zIndex = "1000";
    document.body.appendChild(tooltip);

    if (eventHistoryData.length === 0) {
        // 如果尚未记录任何数据，则提示
        const emptyRow = document.createElement("tr");
        const emptyCell = document.createElement("td");
        emptyCell.colSpan = 5; 
        emptyCell.textContent = "还没有记录到任何个人事件，请先进行抽取";
        emptyCell.style.textAlign = "center";
        emptyCell.style.padding = "16px";
        emptyCell.style.color = "#666";
        emptyRow.appendChild(emptyCell);
        table.appendChild(emptyRow);
    } else {
        // 循环生成每一轮的行
        eventHistoryData.forEach((round, index) => {
            const row = document.createElement("tr");
            row.style.textAlign = "center";

            // 第一列：轮数
            const roundCell = document.createElement("td");
            roundCell.textContent = `${index + 1}`;
            roundCell.style.border = "1px solid #ddd";
            roundCell.style.padding = "8px";
            row.appendChild(roundCell);

            // 接下来4列：4位玩家的事件标题
            round.forEach(player => {
                const playerCell = document.createElement("td");
                playerCell.style.border = "1px solid #ddd";
                playerCell.style.padding = "8px";

                // 显示切换链条
                if (player.replaced.length > 0) {
                    playerCell.textContent = `${player.original} → ${player.replaced.join(" → ")}`;
                } else {
                    playerCell.textContent = player.original || "（无）";
                }

                // 设置鼠标悬停时显示的内容
                const allEvents = [player.original, ...player.replaced];
                playerCell.addEventListener("mousemove", (e) => {
                    const cellWidth = playerCell.offsetWidth;
                    const segmentWidth = cellWidth / allEvents.length; 
                    const hoverIndex = Math.min(
                        Math.floor(e.offsetX / segmentWidth),
                        allEvents.length - 1
                    ); // 确保索引不超出范围
                    const eventKey = allEvents[hoverIndex];
                    if (mission[eventKey]) {
                        tooltip.textContent = mission[eventKey].内容; 
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

            table.appendChild(row);            // 添加动画类名，延迟依次排开
            setTimeout(() => {
                row.classList.add("animate");
            }, index * 15); // 每一行延迟15ms（加快速度）
        });
    }

    container.appendChild(table);
    return container;
  }

  function clearEventHistory() {
    eventHistoryData.length = 0;
  }

  // 在这里暴露 eventHistoryData
  return {
    pushEventRoundHistory,
    getEventHistoryContent,
    clearEventHistory,
    eventHistoryData 
  };
})();