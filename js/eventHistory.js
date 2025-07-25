window.eventHistoryModule = (() => {
  const eventHistoryData = [];

  // 查找事件内容的函数，支持多个事件源
  function findEventContent(eventKey) {
    // 按优先级搜索不同的事件源
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
  }

  function pushEventRoundHistory(roundEvents) {
    const initializedRound = roundEvents.map(event => ({
      type: 'personal',
      original: event.event,
      originalContent: event.content || '', // 保存实际生成的内容
      replaced: [], // 替换的事件名称
      replacedContents: [] // 替换事件对应的内容
    }));
    eventHistoryData.push(initializedRound);
  }

  function addTeamEventToHistory(roundIndex, teamEvent) {
    if (roundIndex >= 0 && roundIndex < eventHistoryData.length) {
      eventHistoryData[roundIndex].push({
        type: 'team',
        ...teamEvent
      });
    }
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
            const personalEvents = round.filter(event => event.type === 'personal');
            const teamEvent = round.find(event => event.type === 'team');

            const row = document.createElement("tr");
            row.style.textAlign = "center";

            // 第一列：轮数
            const roundCell = document.createElement("td");
            roundCell.textContent = `${index + 1}`;
            roundCell.style.border = "1px solid #ddd";
            roundCell.style.padding = "8px";
            if (teamEvent) {
                roundCell.rowSpan = 2;
            }
            row.appendChild(roundCell);

            // 接下来4列：4位玩家的事件标题
            personalEvents.forEach(player => {
                const playerCell = document.createElement("td");
                playerCell.style.border = "1px solid #ddd";
                playerCell.style.padding = "8px";

                // 显示切换链条
                if (player.replaced && player.replaced.length > 0) {
                    playerCell.textContent = `${player.original} → ${player.replaced.join(" → ")}`;
                } else {
                    playerCell.textContent = player.original || "（无）";
                }

                // 设置鼠标悬停时显示的内容
                const allEvents = [player.original, ...(player.replaced || [])];
                playerCell.addEventListener("mousemove", (e) => {
                    const cellWidth = playerCell.offsetWidth;
                    const segmentWidth = cellWidth / allEvents.length; 
                    const hoverIndex = Math.min(
                        Math.floor(e.offsetX / segmentWidth),
                        allEvents.length - 1
                    ); // 确保索引不超出范围
                    const eventKey = allEvents[hoverIndex];
                    
                    // 根据鼠标位置确定显示哪个事件的内容
                    let eventContent = null;
                    if (hoverIndex === 0) {
                        // 原始事件，使用保存的原始内容
                        eventContent = player.originalContent;
                    } else {
                        // 替换事件，使用对应的替换内容
                        const replacedIndex = hoverIndex - 1;
                        if (player.replacedContents && player.replacedContents[replacedIndex]) {
                            eventContent = player.replacedContents[replacedIndex];
                        } else {
                            // 如果没有保存的替换内容，从事件源中查找
                            eventContent = findEventContent(eventKey);
                        }
                    }
                    
                    // 如果仍然没有内容，尝试从事件源查找
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

            table.appendChild(row);

            if (teamEvent) {
                const teamEventRow = document.createElement("tr");
                teamEventRow.className = "team-event-row";
                teamEventRow.style.textAlign = "center";

                const teamEventCell = document.createElement("td");
                teamEventCell.className = "team-event-cell";
                teamEventCell.colSpan = 4;
                teamEventCell.style.border = "1px solid #ddd";
                teamEventCell.style.padding = "8px";
                teamEventCell.textContent = `团队事件—— ${teamEvent.title || '(无标题)'} —— ${teamEvent.result || '-'}`;

                // 添加悬停提示
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
                table.appendChild(teamEventRow);
                
                // 为团队事件行也添加动画
                setTimeout(() => {
                    teamEventRow.classList.add("animate");
                }, index * 15 + 5); // 稍微延迟一点，让它在个人事件行之后出现
            }

            // 添加动画类名，延迟依次排开
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
    addTeamEventToHistory,
    getEventHistoryContent,
    clearEventHistory,
    eventHistoryData 
  };
})();
