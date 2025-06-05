// 事件管理模块 - 独立的事件管理功能
window.eventManagement = (() => {
    // 事件管理相关变量
    let isShowingPersonal = true;
    let currentEventKey = null;
    let currentEventType = null;    // 填充任务表格
    function populateTable(table, tasks, tableId, skipAnimation = false) {
        table.innerHTML = '';

        // 加载保存的勾选状态
        const savedState = JSON.parse(localStorage.getItem(`${tableId}-checkedState`)) || {};

        // 计算启用的个数
        const totalTasks = Object.keys(tasks).length;
        let enabledCount = 0;

        // 遍历任务，生成表格内容
        Object.keys(tasks).forEach((key, index) => {
            const row = document.createElement('tr');
            
            // 添加动画类，初始隐藏
            row.classList.add('animate-row');
            
            // 创建序号单元格
            const indexCell = document.createElement('td');
            indexCell.textContent = index + 1;
            row.appendChild(indexCell);

            // 创建标题和内容单元格
            const titleCell = document.createElement('td');
            const contentCell = document.createElement('td');
            titleCell.textContent = key;
            contentCell.textContent = tasks[key].内容;
            row.appendChild(titleCell);
            row.appendChild(contentCell);

            // 创建启用勾选框单元格
            const enableCell = document.createElement('td');
            const label = document.createElement('label');
            label.className = 'custom-checkbox';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.addEventListener('click', e => {
                e.stopPropagation();
            });
            checkbox.checked = savedState[key] !== undefined ? savedState[key] : true;
            checkbox.dataset.key = key;

            const checkmark = document.createElement('span');
            checkmark.className = 'checkmark';

            label.appendChild(checkbox);
            label.appendChild(checkmark);
            enableCell.appendChild(label);
            row.appendChild(enableCell);

            // 更新启用计数和行样式
            if (checkbox.checked) {
                enabledCount++;
            } else {
                row.classList.add('unchecked');
            }

            // 为整行添加点击事件，切换勾选框状态
            row.addEventListener('click', (event) => {
                if (event.target.tagName.toLowerCase() === 'input') {
                    return;
                }
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            });

            // 为勾选框单独添加事件监听
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    enabledCount++;
                    row.classList.remove('unchecked');
                } else {
                    enabledCount--;
                    row.classList.add('unchecked');
                }
                updateEnabledCount(tableId, enabledCount, totalTasks);
                saveCheckedState(tableId);
            });

            // 将行添加到表格
            table.appendChild(row);
        });        // 添加启用计数行
        const footerRow = document.createElement('tr');
        const footerCell = document.createElement('td');
        footerCell.colSpan = 3;
        footerCell.textContent = `启用：${enabledCount}/${totalTasks}`;
        footerCell.style.textAlign = 'right';
        footerRow.appendChild(footerCell);        const emptyCell = document.createElement('td');
        footerRow.appendChild(emptyCell);
        table.appendChild(footerRow);
        
        // 只有在不跳过动画时才触发动画效果
        if (!skipAnimation) {
            triggerTableAnimation(table);
        } else {
            // 如果跳过动画，确保行立即可见
            const tbody = table.querySelector('tbody');
            const rows = tbody ? tbody.querySelectorAll('tr') : table.querySelectorAll('tr:not(thead tr)');
            rows.forEach(row => {
                row.classList.remove('animate-row');
                row.style.opacity = '1';
                row.style.transform = 'translateY(0)';
            });
            
            // 确保添加事件表单可见
            const addForms = document.querySelectorAll('.add-event-form');
            addForms.forEach(form => {
                form.style.opacity = '1';
            });
        }
    }

    // 更新启用计数显示
    function updateEnabledCount(tableId, enabledCount, totalTasks) {
        const table = document.getElementById(tableId);
        if (table) {
            const footerRow = table.querySelector('tr:last-child');
            if (footerRow) {
                const footerCell = footerRow.querySelector('td');
                if (footerCell) {
                    footerCell.textContent = `启用：${enabledCount}/${totalTasks}`;
                }
            }
        }
    }

    // 保存勾选状态
    function saveCheckedState(tableId) {
        const table = document.getElementById(tableId);
        if (!table) return;

        const checkboxes = table.querySelectorAll('input[type="checkbox"]');
        const state = {};

        checkboxes.forEach(checkbox => {
            const key = checkbox.dataset.key;
            if (key) {
                state[key] = checkbox.checked;
            }
        });

        localStorage.setItem(`${tableId}-checkedState`, JSON.stringify(state));
    }

    // 从 localStorage 加载事件数据
    function loadEventsFromStorage() {
        if (typeof window.mission === 'undefined') {
            console.warn('mission变量未定义，使用空对象');
            window.mission = {};
        }
        if (typeof window.hardmission === 'undefined') {
            console.warn('hardmission变量未定义，使用空对象');
            window.hardmission = {};
        }

        const savedMissions = localStorage.getItem('missions');
        const savedHardMissions = localStorage.getItem('hardmissions');

        if (savedMissions) {
            Object.assign(window.mission, JSON.parse(savedMissions));
        }

        if (savedHardMissions) {
            Object.assign(window.hardmission, JSON.parse(savedHardMissions));
        }
    }

    // 将事件数据保存到 localStorage
    function saveEventsToStorage() {
        if (typeof window.mission !== 'undefined') {
            localStorage.setItem('missions', JSON.stringify(window.mission));
        }
        if (typeof window.hardmission !== 'undefined') {
            localStorage.setItem('hardmissions', JSON.stringify(window.hardmission));
        }
    }

    // 显示右键菜单
    function showContextMenu(event, key, type) {
        event.preventDefault();
        
        currentEventKey = key;
        currentEventType = type;
        
        console.log('显示右键菜单：', key, type);
        console.log('事件对象：', event.clientX, event.clientY);
          // 添加选中行的视觉提示
        const rows = document.querySelectorAll('tr');
        rows.forEach(row => row.classList.remove('highlighted-row'));
        
        // 获取当前行并高亮
        const row = event.target.closest('tr');
        if (row) {
            row.classList.add('highlighted-row');
            // 确保行动画不会影响高亮显示
            row.classList.add('show'); 
            console.log('高亮行：', row.rowIndex);
        }
        
        // 获取右键菜单
        const contextMenu = document.querySelector('.context-menu');
        if (!contextMenu) {
            console.error('找不到右键菜单元素');
            return;
        }
        
        // 确保菜单可见以计算尺寸
        contextMenu.style.display = 'block';
        contextMenu.classList.remove('visible'); // 准备动画
        
        // 计算菜单位置
        const menuWidth = contextMenu.offsetWidth || 150;
        const menuHeight = contextMenu.offsetHeight || 100;
        console.log('菜单尺寸：', menuWidth, menuHeight);
          // 获取鼠标位置和窗口尺寸
        const x = event.clientX || (event.touches && event.touches[0].clientX) || 0;
        const y = event.clientY || (event.touches && event.touches[0].clientY) || 0;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        console.log('窗口尺寸：', windowWidth, windowHeight);
        console.log('鼠标位置：', x, y);
        
        // 计算箭头的末端位置 (基于图片中的箭头方向，向右下方延伸)
        // 模拟箭头位置，通常比鼠标位置偏向右下方约40-60像素
        let posX = x - 200; // 箭头向右延伸约50像素
        let posY = y - 100; // 箭头向下延伸约50像素
        
        // 检查右边界
        if (posX + menuWidth > windowWidth) {
            posX = x - menuWidth;
            console.log('调整右边界：', posX);
        }
        
        // 检查下边界
        if (posY + menuHeight > windowHeight) {
            posY = y - menuHeight;
            console.log('调整下边界：', posY);
        }
        
        // 确保菜单不会显示在负坐标
        posX = Math.max(0, posX);
        posY = Math.max(0, posY);
        
        // 设置最终位置
        contextMenu.style.left = `${posX}px`;
        contextMenu.style.top = `${posY}px`;
        
        // 应用动画
        requestAnimationFrame(() => {
            contextMenu.classList.add('visible');
        });
        
        console.log('最终位置：', posX, posY);
        
        // 添加点击外部区域关闭菜单的处理
        setTimeout(() => {
            document.addEventListener('click', hideContextMenuOnClickOutside);
        }, 10);
    }
    
    // 点击外部区域关闭菜单
    function hideContextMenuOnClickOutside(event) {
        const contextMenu = document.querySelector('.context-menu');
        if (contextMenu && !contextMenu.contains(event.target)) {
            hideContextMenu();
            document.removeEventListener('click', hideContextMenuOnClickOutside);
        }
    }
    
    // 隐藏右键菜单
    function hideContextMenu() {
        const contextMenu = document.querySelector('.context-menu');
        if (contextMenu) {
            // 添加动画效果
            contextMenu.classList.remove('visible');
            
            // 等待动画完成后隐藏菜单
            setTimeout(() => {
                contextMenu.style.display = 'none';
            }, 150); // 与CSS中transition时间一致
        }
        
        // 移除高亮效果
        const rows = document.querySelectorAll('tr');
        rows.forEach(row => row.classList.remove('highlighted-row'));
        
        currentEventKey = null;
        currentEventType = null;
    }

    // 编辑事件
    function editEvent() {
        if (!currentEventKey || !currentEventType) return;

        const isPersonal = currentEventType === 'personal';
        
        const missionObj = window.mission || {};
        const hardmissionObj = window.hardmission || {};
        
        const eventData = isPersonal ? missionObj[currentEventKey] : hardmissionObj[currentEventKey];

        const newContent = prompt('编辑事件内容：', eventData.内容);
        if (newContent) {
            if (isPersonal) {
                missionObj[currentEventKey].内容 = newContent;
                if (window.mission && window.mission[currentEventKey]) {
                    window.mission[currentEventKey].内容 = newContent;
                }
            } else {
                hardmissionObj[currentEventKey].内容 = newContent;
                if (window.hardmission && window.hardmission[currentEventKey]) {
                    window.hardmission[currentEventKey].内容 = newContent;
                }
            }            saveEventsToStorage();

            const table = document.getElementById(isPersonal ? 'personalEventsTable' : 'teamEventsTable');
            if (table) {
                populateTable(table, isPersonal ? missionObj : hardmissionObj, isPersonal ? 'personalEventsTable' : 'teamEventsTable', true);
            }
        }

        hideContextMenu();
    }

    // 删除事件
    function deleteEvent() {
        if (!currentEventKey || !currentEventType) return;

        const isPersonal = currentEventType === 'personal';

        const missionObj = window.mission || {};
        const hardmissionObj = window.hardmission || {};

        if (isPersonal) {
            delete missionObj[currentEventKey];
            if (window.mission && window.mission[currentEventKey]) {
                delete window.mission[currentEventKey];
            }
        } else {
            delete hardmissionObj[currentEventKey];
            if (window.hardmission && window.hardmission[currentEventKey]) {
                delete window.hardmission[currentEventKey];
            }
        }

        const tableId = isPersonal ? 'personalEventsTable' : 'teamEventsTable';
        const savedState = JSON.parse(localStorage.getItem(`${tableId}-checkedState`)) || {};
        if (savedState[currentEventKey] !== undefined) {
            delete savedState[currentEventKey];
            localStorage.setItem(`${tableId}-checkedState`, JSON.stringify(savedState));
        }        saveEventsToStorage();

        const table = document.getElementById(isPersonal ? 'personalEventsTable' : 'teamEventsTable');
        if (table) {
            populateTable(table, isPersonal ? missionObj : hardmissionObj, isPersonal ? 'personalEventsTable' : 'teamEventsTable', true);
        }

        hideContextMenu();
    }

    // 在表格中绑定右键事件（支持桌面端右键和手机端长按）
    function bindTableRowContextMenu(table, type) {
        // 处理鼠标右键
        table.addEventListener('contextmenu', (event) => {
            event.preventDefault(); // 阻止默认右键菜单
            
            const row = event.target.closest('tr');
            if (row && row.children.length >= 2) {
                const titleCell = row.children[1];
                if (titleCell) {
                    const key = titleCell.textContent;
                    console.log('右键菜单触发：', key);
                    showContextMenu(event, key, type);
                }
            }
        });

        // 处理长按事件（移动端）
        let pressTimer;
        let startX, startY;
        const longPressThreshold = 500; // 长按阈值（毫秒）
        const moveThreshold = 10; // 移动阈值（像素）
          // 触摸开始
        table.addEventListener('touchstart', (event) => {
            if (event.touches.length !== 1) return; // 仅处理单指触摸
            
            const touch = event.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            console.log('触摸开始：', startX, startY);
            
            // 添加触摸反馈效果
            createTouchRipple(startX, startY);
            
            const row = event.target.closest('tr');
            if (!row || row.children.length < 2) return;
            
            const titleCell = row.children[1];
            if (!titleCell) return;
            
            const key = titleCell.textContent;
            
            // 设置长按定时器
            pressTimer = setTimeout(() => {
                console.log('长按触发：', key, startX, startY);
                
                // 阻止默认行为（防止菜单弹出后消失）
                event.preventDefault();
                
                const touchEvent = {
                    preventDefault: () => {},
                    clientX: startX,
                    clientY: startY,
                    target: event.target,
                    closest: (selector) => event.target.closest(selector)
                };
                
                showContextMenu(touchEvent, key, type);
                
                // 阻止接下来的触摸事件转换为鼠标事件
                event.stopPropagation();
            }, longPressThreshold);
        }, { passive: false }); // 非被动模式，允许preventDefault
        
        // 触摸移动
        table.addEventListener('touchmove', (event) => {
            if (!pressTimer) return;
            
            const touch = event.touches[0];
            const moveX = Math.abs(touch.clientX - startX);
            const moveY = Math.abs(touch.clientY - startY);
            
            console.log('触摸移动：', moveX, moveY);
            
            // 如果移动超过阈值，取消长按
            if (moveX > moveThreshold || moveY > moveThreshold) {
                console.log('取消长按（移动超过阈值）');
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        });
        
        // 触摸结束
        table.addEventListener('touchend', (event) => {
            console.log('触摸结束');
            clearTimeout(pressTimer);
            pressTimer = null;
        });
        
        // 触摸取消
        table.addEventListener('touchcancel', (event) => {
            console.log('触摸取消');
            clearTimeout(pressTimer);
            pressTimer = null;
        });
    }

    // 创建触摸反馈效果
    function createTouchRipple(x, y) {
        const ripple = document.createElement('div');
        ripple.className = 'touch-feedback';
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        document.body.appendChild(ripple);
        
        // 动画结束后移除元素
        setTimeout(() => {
            ripple.remove();
        }, 700); // 稍微长于动画时间，确保完成
    }    // 触发表格行动画效果
    function triggerTableAnimation(table) {
        if (!table) return;
        
        // 先隐藏添加事件表单，避免闪现
        const addForms = document.querySelectorAll('.add-event-form');
        addForms.forEach(form => {
            form.style.opacity = '0';
            form.style.transition = 'opacity 0.3s ease';
        });
        
        // 确保表格布局保持固定
        table.style.tableLayout = 'fixed';
        table.style.width = '100%';
        
        // 获取所有数据行（排除表头）
        const tbody = table.querySelector('tbody');
        const rows = tbody ? tbody.querySelectorAll('tr') : table.querySelectorAll('tr:not(thead tr)');
        
        // 先重置所有行的动画状态
        rows.forEach(row => {
            row.classList.remove('show');
            row.classList.add('animate-row');
        });
          
        // 逐行添加显示类，触发动画效果
        rows.forEach((row, index) => {
            setTimeout(() => {
                row.classList.add('show');
                
                // 在最后一行动画完成后显示添加事件表单
                if (index === rows.length - 1) {
                    setTimeout(() => {
                        addForms.forEach(form => {
                            form.style.opacity = '1';
                        });                }, 250); // 等待行动画完成（减少等待时间）
            }
        }, 5 + (index * 25)); // 每行延迟25ms (0.025秒，加快速度)
        });
    }

    // 设置添加事件表单的可见性
    function setAddEventFormsVisibility(visible, delay = 0) {
        setTimeout(() => {
            const addForms = document.querySelectorAll('.add-event-form');
            addForms.forEach(form => {
                form.style.opacity = visible ? '1' : '0';
            });
        }, delay);
    }

    // 生成事件管理内容
    function loadEventManagement() {
        const container = document.createElement('div');
        container.style.width = '100%';
        container.style.height = '100%';
        
        // 创建头部区域
        const header = document.createElement('div');
        header.style.marginBottom = '20px';
        header.style.textAlign = 'center';
        
        const instructionText = document.createElement('div');
        instructionText.style.fontSize = '14px';
        instructionText.style.color = 'rgb(197, 197, 197)';
        instructionText.style.marginBottom = '10px';
        instructionText.textContent = '最下方可添加事件，右键/长按可删除或编辑事件，无法右键请关闭Simple Allow Copy等插件';
        header.appendChild(instructionText);
        
        // 创建单选按钮
        const radioInputs = document.createElement('div');
        radioInputs.className = 'radio-inputs';
        radioInputs.style.display = 'flex';
        radioInputs.style.justifyContent = 'center';
        radioInputs.style.gap = '20px';
        radioInputs.style.marginBottom = '20px';
        
        const personalLabel = document.createElement('label');
        personalLabel.className = 'radio';
        personalLabel.style.display = 'flex';
        personalLabel.style.alignItems = 'center';
        personalLabel.style.cursor = 'pointer';
        
        const personalRadio = document.createElement('input');
        personalRadio.type = 'radio';
        personalRadio.name = 'eventTypeInSettings';
        personalRadio.id = 'personalEventsRadioInSettings';
        personalRadio.checked = true;
        
        const personalSpan = document.createElement('span');
        personalSpan.className = 'radio-item';
        personalSpan.textContent = '个人事件';
        personalSpan.style.marginLeft = '8px';
        
        personalLabel.appendChild(personalRadio);
        personalLabel.appendChild(personalSpan);
        
        const teamLabel = document.createElement('label');
        teamLabel.className = 'radio';
        teamLabel.style.display = 'flex';
        teamLabel.style.alignItems = 'center';
        teamLabel.style.cursor = 'pointer';
        
        const teamRadio = document.createElement('input');
        teamRadio.type = 'radio';
        teamRadio.name = 'eventTypeInSettings';
        teamRadio.id = 'teamEventsRadioInSettings';
        
        const teamSpan = document.createElement('span');
        teamSpan.className = 'radio-item';
        teamSpan.textContent = '团队事件';
        teamSpan.style.marginLeft = '8px';
        
        teamLabel.appendChild(teamRadio);
        teamLabel.appendChild(teamSpan);
        
        radioInputs.appendChild(personalLabel);
        radioInputs.appendChild(teamLabel);
        header.appendChild(radioInputs);
        
        container.appendChild(header);
        
        // 创建个人事件内容区域
        const personalEvents = document.createElement('div');
        personalEvents.id = 'personalEventsInSettings';
        personalEvents.style.display = 'block';
          const personalTable = document.createElement('table');
        personalTable.className = 'event-table';
        personalTable.style.width = '100%';
        personalTable.style.borderCollapse = 'collapse';
        personalTable.style.marginBottom = '20px';
        personalTable.style.tableLayout = 'fixed'; // 强制固定布局
        
        const personalThead = document.createElement('thead');
        personalThead.style.position = 'relative';
        personalThead.style.zIndex = '10';
        
        const personalHeaderRow = document.createElement('tr');
        personalHeaderRow.style.opacity = '1'; // 确保表头始终可见
        personalHeaderRow.style.transform = 'none'; // 确保表头不参与动画
        ['序号', '事件标题', '事件内容', '启用'].forEach((text, index) => {
            const th = document.createElement('th');
            th.textContent = text;
            th.style.border = '1px solid #ddd';
            th.style.padding = '8px';
            th.style.backgroundColor = 'transparent';
            th.style.position = 'relative';
            th.style.boxSizing = 'border-box';
            
            // 为每列设置固定宽度
            const widths = ['8%', '30%', '52%', '10%'];
            th.style.width = widths[index];
            th.style.minWidth = widths[index];
            th.style.maxWidth = widths[index];
            
            personalHeaderRow.appendChild(th);
        });
        
        personalThead.appendChild(personalHeaderRow);
        personalTable.appendChild(personalThead);
        
        const personalTbody = document.createElement('tbody');
        personalTbody.id = 'personalEventsTable';
        personalTable.appendChild(personalTbody);
        
        personalEvents.appendChild(personalTable);
          // 添加个人事件表单
        const personalForm = document.createElement('div');
        personalForm.className = 'add-event-form';
        personalForm.style.display = 'flex';
        personalForm.style.flexDirection = 'column';
        personalForm.style.gap = '10px';
        personalForm.style.marginBottom = '20px';
        personalForm.style.opacity = '0'; // 初始设置为不可见
        personalForm.style.transition = 'opacity 0.3s ease'; // 添加平滑过渡
        
        const personalTitleInput = document.createElement('input');
        personalTitleInput.type = 'text';
        personalTitleInput.id = 'newEventTitle';
        personalTitleInput.placeholder = '添加个人事件: 标题';
        personalTitleInput.className = 'input-field';
        personalTitleInput.style.padding = '8px';
        personalTitleInput.style.border = '1px solid #ddd';
        personalTitleInput.style.borderRadius = '4px';
        
        const personalContentTextarea = document.createElement('textarea');
        personalContentTextarea.id = 'newEventContent';
        personalContentTextarea.placeholder = '添加个人事件: 内容';
        personalContentTextarea.className = 'textarea-field';
        personalContentTextarea.style.padding = '8px';
        personalContentTextarea.style.border = '1px solid #ddd';
        personalContentTextarea.style.borderRadius = '4px';
        personalContentTextarea.style.minHeight = '60px';
        personalContentTextarea.style.resize = 'vertical';
        
        const personalAddButton = document.createElement('button');
        personalAddButton.id = 'addEventButton';
        personalAddButton.textContent = '添加事件';
        personalAddButton.className = 'add-event-btn';
        personalAddButton.style.padding = '8px 16px';
        personalAddButton.style.color = 'white';
        personalAddButton.style.border = 'none';
        personalAddButton.style.borderRadius = '4px';
        personalAddButton.style.cursor = 'pointer';
        
        personalForm.appendChild(personalTitleInput);
        personalForm.appendChild(personalContentTextarea);
        personalForm.appendChild(personalAddButton);
        personalEvents.appendChild(personalForm);
        
        container.appendChild(personalEvents);
        
        // 创建团队事件内容区域
        const teamEvents = document.createElement('div');
        teamEvents.id = 'teamEventsInSettings';
        teamEvents.style.display = 'none';
          const teamTable = document.createElement('table');
        teamTable.className = 'event-table';
        teamTable.style.width = '100%';
        teamTable.style.borderCollapse = 'collapse';
        teamTable.style.marginBottom = '20px';
        teamTable.style.tableLayout = 'fixed'; // 强制固定布局
        
        const teamThead = document.createElement('thead');
        teamThead.style.position = 'relative';
        teamThead.style.zIndex = '10';
        
        const teamHeaderRow = document.createElement('tr');
        teamHeaderRow.style.opacity = '1'; // 确保表头始终可见
        teamHeaderRow.style.transform = 'none'; // 确保表头不参与动画
        ['序号', '事件标题', '事件内容', '启用'].forEach((text, index) => {
            const th = document.createElement('th');
            th.textContent = text;
            th.style.border = '1px solid #ddd';
            th.style.padding = '8px';
            th.style.backgroundColor = 'transparent';
            th.style.position = 'relative';
            th.style.boxSizing = 'border-box';
            
            // 为每列设置固定宽度
            const widths = ['8%', '30%', '52%', '10%'];
            th.style.width = widths[index];
            th.style.minWidth = widths[index];
            th.style.maxWidth = widths[index];
            
            teamHeaderRow.appendChild(th);
        });
        
        teamThead.appendChild(teamHeaderRow);
        teamTable.appendChild(teamThead);
        
        const teamTbody = document.createElement('tbody');
        teamTbody.id = 'teamEventsTable';
        teamTable.appendChild(teamTbody);
        
        teamEvents.appendChild(teamTable);
          // 添加团队事件表单
        const teamForm = document.createElement('div');
        teamForm.className = 'add-event-form';
        teamForm.style.display = 'flex';
        teamForm.style.flexDirection = 'column';
        teamForm.style.gap = '10px';
        teamForm.style.marginBottom = '20px';
        teamForm.style.opacity = '0'; // 初始设置为不可见
        teamForm.style.transition = 'opacity 0.3s ease'; // 添加平滑过渡
        
        const teamTitleInput = document.createElement('input');
        teamTitleInput.type = 'text';
        teamTitleInput.id = 'newTeamEventTitle';
        teamTitleInput.placeholder = '添加团队事件: 标题';
        teamTitleInput.className = 'input-field';
        teamTitleInput.style.padding = '8px';
        teamTitleInput.style.border = '1px solid #ddd';
        teamTitleInput.style.borderRadius = '4px';
        
        const teamContentTextarea = document.createElement('textarea');
        teamContentTextarea.id = 'newTeamEventContent';
        teamContentTextarea.placeholder = '添加团队事件: 内容';
        teamContentTextarea.className = 'textarea-field';
        teamContentTextarea.style.padding = '8px';
        teamContentTextarea.style.border = '1px solid #ddd';
        teamContentTextarea.style.borderRadius = '4px';
        teamContentTextarea.style.minHeight = '60px';
        teamContentTextarea.style.resize = 'vertical';
        
        const teamAddButton = document.createElement('button');
        teamAddButton.id = 'addTeamEventButton';
        teamAddButton.textContent = '添加事件';
        teamAddButton.className = 'add-event-btn';
        teamAddButton.style.padding = '8px 16px';
        teamAddButton.style.color = 'white';
        teamAddButton.style.border = 'none';
        teamAddButton.style.borderRadius = '4px';
        teamAddButton.style.cursor = 'pointer';
        
        teamForm.appendChild(teamTitleInput);
        teamForm.appendChild(teamContentTextarea);
        teamForm.appendChild(teamAddButton);
        teamEvents.appendChild(teamForm);
        
        container.appendChild(teamEvents);
        
        // 创建右键菜单
        const contextMenu = document.createElement('div');
        contextMenu.className = 'context-menu';
        contextMenu.style.position = 'fixed';
        contextMenu.style.backgroundColor = 'white';
        contextMenu.style.border = '1px solid #ccc';
        contextMenu.style.borderRadius = '4px';
        contextMenu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        contextMenu.style.zIndex = '1000';
        contextMenu.style.display = 'none';
        contextMenu.style.minWidth = '120px';
        
        const menuList = document.createElement('ul');
        menuList.style.listStyle = 'none';
        menuList.style.margin = '0';
        menuList.style.padding = '0';
        
        const editItem = document.createElement('li');
        editItem.id = 'editEvent';
        editItem.textContent = '编辑事件';
        editItem.style.padding = '8px 12px';
        editItem.style.cursor = 'pointer';
        editItem.style.borderBottom = '1px solid #eee';
        editItem.style.color = 'black';
        editItem.addEventListener('mouseover', () => editItem.style.backgroundColor = '#f5f5f5');
        editItem.addEventListener('mouseout', () => editItem.style.backgroundColor = 'white');
        
        const deleteItem = document.createElement('li');
        deleteItem.id = 'deleteEvent';
        deleteItem.textContent = '删除事件';
        deleteItem.style.padding = '8px 12px';
        deleteItem.style.cursor = 'pointer';
        deleteItem.style.color = 'black';
        deleteItem.addEventListener('mouseover', () => deleteItem.style.backgroundColor = '#f5f5f5');
        deleteItem.addEventListener('mouseout', () => deleteItem.style.backgroundColor = 'white');
        
        menuList.appendChild(editItem);
        menuList.appendChild(deleteItem);
        contextMenu.appendChild(menuList);
        container.appendChild(contextMenu);
        
        // 绑定事件监听器
        setTimeout(() => {
            // 加载事件数据
            loadEventsFromStorage();
            
            const personalTableBody = document.getElementById('personalEventsTable');
            const teamTableBody = document.getElementById('teamEventsTable');
            if (personalTableBody && teamTableBody) {
                const missionObj = window.mission || {};
                const hardmissionObj = window.hardmission || {};
                
                // 填充表格
                populateTable(personalTableBody, missionObj, 'personalEventsTable');
                populateTable(teamTableBody, hardmissionObj, 'teamEventsTable');
                
                // 绑定右键事件
                bindTableRowContextMenu(personalTableBody, 'personal');
                bindTableRowContextMenu(teamTableBody, 'team');
            }
            
            // 单选按钮事件
            const personalRadioInSettings = document.getElementById('personalEventsRadioInSettings');
            const teamRadioInSettings = document.getElementById('teamEventsRadioInSettings');
            const personalEventsInSettings = document.getElementById('personalEventsInSettings');
            const teamEventsInSettings = document.getElementById('teamEventsInSettings');
            
            if (personalRadioInSettings && teamRadioInSettings && personalEventsInSettings && teamEventsInSettings) {                personalRadioInSettings.addEventListener('change', () => {
                    if (personalRadioInSettings.checked) {
                        personalEventsInSettings.style.display = 'block';
                        teamEventsInSettings.style.display = 'none';
                        
                        // 触发个人事件表格的动画效果
                        const personalTableBody = document.getElementById('personalEventsTable');
                        triggerTableAnimation(personalTableBody);
                    }
                });
                
                teamRadioInSettings.addEventListener('change', () => {
                    if (teamRadioInSettings.checked) {
                        personalEventsInSettings.style.display = 'none';
                        teamEventsInSettings.style.display = 'block';
                        
                        // 触发团队事件表格的动画效果
                        const teamTableBody = document.getElementById('teamEventsTable');
                        triggerTableAnimation(teamTableBody);
                    }
                });
            }
            
            // 添加个人事件按钮事件
            const addEventButtonInSettings = document.getElementById('addEventButton');
            const newEventTitleInSettings = document.getElementById('newEventTitle');
            const newEventContentInSettings = document.getElementById('newEventContent');
            
            if (addEventButtonInSettings && newEventTitleInSettings && newEventContentInSettings) {
                addEventButtonInSettings.addEventListener('click', () => {
                    const title = newEventTitleInSettings.value.trim();
                    const content = newEventContentInSettings.value.trim();

                    if (!title || !content) {
                        alert('事件标题和内容不能为空！');
                        return;
                    }

                    const missionObj = window.mission || {};
                    if (!window.mission) window.mission = missionObj;

                    if (missionObj[title]) {
                        alert('事件标题已存在，请使用其他标题！');
                        return;
                    }

                    missionObj[title] = { 内容: content };
                    if (window.mission) {
                        window.mission[title] = { 内容: content };
                    }

                    const savedState = JSON.parse(localStorage.getItem('personalEventsTable-checkedState')) || {};
                    savedState[title] = true;
                    localStorage.setItem('personalEventsTable-checkedState', JSON.stringify(savedState));                    saveEventsToStorage();

                    populateTable(personalTableBody, missionObj, 'personalEventsTable', true); // 跳过动画

                    newEventTitleInSettings.value = '';
                    newEventContentInSettings.value = '';
                });
            }
            
            // 添加团队事件按钮事件
            const addTeamEventButtonInSettings = document.getElementById('addTeamEventButton');
            const newTeamEventTitleInSettings = document.getElementById('newTeamEventTitle');
            const newTeamEventContentInSettings = document.getElementById('newTeamEventContent');
            
            if (addTeamEventButtonInSettings && newTeamEventTitleInSettings && newTeamEventContentInSettings) {
                addTeamEventButtonInSettings.addEventListener('click', () => {
                    const title = newTeamEventTitleInSettings.value.trim();
                    const content = newTeamEventContentInSettings.value.trim();

                    if (!title || !content) {
                        alert('事件标题和内容不能为空！');
                        return;
                    }

                    const hardmissionObj = window.hardmission || {};
                    if (!window.hardmission) window.hardmission = hardmissionObj;

                    if (hardmissionObj[title]) {
                        alert('事件标题已存在，请使用其他标题！');
                        return;
                    }

                    hardmissionObj[title] = { 内容: content };
                    if (window.hardmission) {
                        window.hardmission[title] = { 内容: content };
                    }

                    const savedState = JSON.parse(localStorage.getItem('teamEventsTable-checkedState')) || {};
                    savedState[title] = true;
                    localStorage.setItem('teamEventsTable-checkedState', JSON.stringify(savedState));                    saveEventsToStorage();

                    populateTable(teamTableBody, hardmissionObj, 'teamEventsTable', true); // 跳过动画

                    newTeamEventTitleInSettings.value = '';
                    newTeamEventContentInSettings.value = '';
                });
            }
            
            // 右键菜单事件
            const contextMenuInSettings = container.querySelector('.context-menu');
            if (contextMenuInSettings) {
                contextMenuInSettings.addEventListener('click', (event) => {
                    if (event.target.id === 'editEvent') {
                        editEvent();
                    } else if (event.target.id === 'deleteEvent') {
                        deleteEvent();
                    }
                });
            }
              // 隐藏右键菜单（点击其他地方时）
            document.addEventListener('click', (event) => {
                const contextMenu = document.querySelector('.context-menu');
                if (contextMenu && 
                    event.target !== contextMenu && 
                    !contextMenu.contains(event.target) &&
                    !event.target.closest('tr')) {
                    hideContextMenu();
                }
            });
            
        }, 100);
        
        return container;
    }

    // 初始化事件数据
    function initializeEventData() {
        // 确保全局事件对象存在
        if (typeof window.mission === 'undefined') {
            window.mission = {};
        }
        if (typeof window.hardmission === 'undefined') {
            window.hardmission = {};
        }
        
        // 加载存储的事件数据
        loadEventsFromStorage();
        
        // 如果没有存储的数据，使用原始数据
        if (Object.keys(window.mission).length === 0 && typeof mission !== 'undefined') {
            Object.assign(window.mission, mission);
        }
        if (Object.keys(window.hardmission).length === 0 && typeof hardmission !== 'undefined') {
            Object.assign(window.hardmission, hardmission);
        }
        
        // 在事件数据加载完成后初始化勾选状态
        initializeCheckboxStates();
        
        console.log('事件数据初始化完成:', {
            personalEvents: Object.keys(window.mission || {}).length,
            teamEvents: Object.keys(window.hardmission || {}).length
        });
    }

    // 初始化勾选状态
    function initializeCheckboxStates() {
        // 检查个人事件的勾选状态
        if (window.mission) {
            const savedState = JSON.parse(localStorage.getItem('personalEventsTable-checkedState')) || {};
            let needsUpdate = false;
            
            // 为所有存在的事件初始化勾选状态（如果不存在）
            Object.keys(window.mission).forEach(key => {
                if (savedState[key] === undefined) {
                    savedState[key] = true; // 默认启用
                    needsUpdate = true;
                }
            });
            
            // 移除不存在的事件的勾选状态
            Object.keys(savedState).forEach(key => {
                if (!window.mission[key]) {
                    delete savedState[key];
                    needsUpdate = true;
                }
            });
            
            if (needsUpdate) {
                localStorage.setItem('personalEventsTable-checkedState', JSON.stringify(savedState));
            }
        }
        
        // 检查团队事件的勾选状态
        if (window.hardmission) {
            const savedState = JSON.parse(localStorage.getItem('teamEventsTable-checkedState')) || {};
            let needsUpdate = false;
            
            // 为所有存在的事件初始化勾选状态（如果不存在）
            Object.keys(window.hardmission).forEach(key => {
                if (savedState[key] === undefined) {
                    savedState[key] = true; // 默认启用
                    needsUpdate = true;
                }
            });
            
            // 移除不存在的事件的勾选状态
            Object.keys(savedState).forEach(key => {
                if (!window.hardmission[key]) {
                    delete savedState[key];
                    needsUpdate = true;
                }
            });
            
            if (needsUpdate) {
                localStorage.setItem('teamEventsTable-checkedState', JSON.stringify(savedState));
            }
        }
    }    // 公共接口
    return {
        loadEventManagement,
        populateTable,
        loadEventsFromStorage,
        saveEventsToStorage,
        editEvent,
        deleteEvent,
        bindTableRowContextMenu,
        initializeEventData,
        triggerTableAnimation,
        setAddEventFormsVisibility
    };
})();