// 事件管理模块 - 独立的事件管理功能
window.eventManagement = (() => {
    // 事件管理相关变量
    let isShowingPersonal = true;
    let currentEventKey = null;
    let currentEventType = null;

    // 设置搜索功能 - 支持多音字拼音搜索和精确高亮
    function setupEventSearch(inputId, tableSelector) {
        const searchInput = document.getElementById(inputId);
        if (!searchInput) return;
        
        // 检查pinyinPro库是否已加载
        const hasPinyinSupport = typeof window.pinyinPro !== 'undefined' && 
                                typeof window.pinyinPro.pinyin === 'function';
        
        if (!hasPinyinSupport) {
            console.warn('pinyinPro库未加载，拼音搜索功能将不可用');
        }

        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            const table = document.querySelector(tableSelector);
            if (!table) return;

            const tbody = table.querySelector('tbody');
            if (!tbody) return;

            const rows = tbody.querySelectorAll('tr');

            rows.forEach(row => {
                // 跳过统计行
                if (row.textContent.includes('启用：')) {
                    return;
                }

                const titleCell = row.querySelector('td:nth-child(2)'); // 事件标题列
                const contentCell = row.querySelector('td:nth-child(3)'); // 事件内容列
                
                if (!titleCell || !contentCell) return;

                const title = titleCell.textContent || '';
                const content = contentCell.textContent || '';
                const combinedText = title + ' ' + content;

                // Reset highlight
                titleCell.innerHTML = title;
                contentCell.innerHTML = content;
                
                let match = false;

                if (searchTerm === '') {
                    match = true;
                } else if (combinedText.toLowerCase().includes(searchTerm)) {
                    match = true;
                    // 高亮标题
                    if (title.toLowerCase().includes(searchTerm)) {
                        const regex = new RegExp(searchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
                        titleCell.innerHTML = title.replace(regex, '<span style="background-color: yellow; color: black; font-weight: bold;">$&</span>');
                    }
                    // 高亮内容
                    if (content.toLowerCase().includes(searchTerm)) {
                        const regex = new RegExp(searchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
                        contentCell.innerHTML = content.replace(regex, '<span style="background-color: yellow; color: black; font-weight: bold;">$&</span>');
                    }
                } else if (hasPinyinSupport) {
                    // 使用安全的方式访问pinyin函数
                    const { pinyin } = window.pinyinPro;
                    
                    // 检查标题的拼音匹配
                    const titleMatchResult = matchPinyinInitials(title, searchTerm, pinyin);
                    const contentMatchResult = matchPinyinInitials(content, searchTerm, pinyin);
                    
                    if (titleMatchResult.match || contentMatchResult.match) {
                        match = true;
                        
                        // 高亮标题中匹配的字符
                        if (titleMatchResult.match) {
                            let highlightedTitle = '';
                            for (let i = 0; i < title.length; i++) {
                                if (titleMatchResult.matchedPositions.includes(i)) {
                                    highlightedTitle += `<span style="background-color: yellow; color: black; font-weight: bold;">${title[i]}</span>`;
                                } else {
                                    highlightedTitle += title[i];
                                }
                            }
                            titleCell.innerHTML = highlightedTitle;
                        }
                        
                        // 高亮内容中匹配的字符
                        if (contentMatchResult.match) {
                            let highlightedContent = '';
                            for (let i = 0; i < content.length; i++) {
                                if (contentMatchResult.matchedPositions.includes(i)) {
                                    highlightedContent += `<span style="background-color: yellow; color: black; font-weight: bold;">${content[i]}</span>`;
                                } else {
                                    highlightedContent += content[i];
                                }
                            }
                            contentCell.innerHTML = highlightedContent;
                        }
                    }
                }

                row.style.display = match ? '' : 'none';
            });
        });

        // 支持多音字的拼音首字母匹配函数
        function matchPinyinInitials(name, searchTerm, pinyinFunc) {
            if (!pinyinFunc || !name) return { match: false, matchedPositions: [] };
            
            // 获取所有可能的拼音首字母组合
            const { initialsMatrix, matchedPositions } = getAllPossibleInitials(name, searchTerm, pinyinFunc);
            
            // 检查是否有任何组合匹配搜索词
            const match = initialsMatrix.some(initials => {
                const combinedInitials = initials.join('');
                const startIndex = combinedInitials.indexOf(searchTerm);
                
                if (startIndex !== -1) {
                    // 记录匹配的字符位置
                    matchedPositions.length = 0; // 清空之前的结果
                    for (let i = 0; i < searchTerm.length; i++) {
                        matchedPositions.push(startIndex + i);
                    }
                    return true;
                }
                return false;
            });
            
            return { match, matchedPositions };
        }

        // 获取名字所有可能的拼音首字母组合，并尝试匹配搜索词
        function getAllPossibleInitials(name, searchTerm, pinyinFunc) {
            // 存储每个字符的所有可能首字母
            const charInitialsList = [];
            
            // 遍历名字中的每个字符
            for (let i = 0; i < name.length; i++) {
                const char = name[i];
                // 获取字符的所有可能拼音
                const pinyinOptions = pinyinFunc(char, { 
                    pattern: 'pinyin', 
                    toneType: 'none',
                    multiple: true // 获取多音字的所有拼音
                });
                
                // 提取每个拼音的首字母
                const initials = pinyinOptions
                    .split(' ')
                    .map(py => py.charAt(0).toLowerCase());
                
                charInitialsList.push(initials);
            }
            
            // 生成所有可能的组合矩阵（每个组合是一个首字母数组）
            const initialsMatrix = generateInitialsMatrix(charInitialsList);
            
            return { initialsMatrix, matchedPositions: [] };
        }

        // 生成所有可能的首字母组合矩阵
        function generateInitialsMatrix(charInitialsList) {
            let result = [[]];
            
            charInitialsList.forEach(initials => {
                const temp = [];
                result.forEach(prefix => {
                    initials.forEach(initial => {
                        temp.push([...prefix, initial]);
                    });
                });
                result = temp;
            });
            
            return result;
        }
    }

    // 填充任务表格
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
        // 确保使用全局的mission和hardmission对象作为默认值
        if (typeof window.mission === 'undefined' || Object.keys(window.mission).length === 0) {
            console.log('初始化mission事件数据');
            // 如果window.mission不存在，尝试从其他来源获取
            if (typeof mission !== 'undefined') {
                window.mission = mission;
            } else {
                window.mission = {};
                console.warn('mission变量完全未找到，使用空对象');
            }
        }
        if (typeof window.hardmission === 'undefined' || Object.keys(window.hardmission).length === 0) {
            console.log('初始化hardmission事件数据');
            // 如果window.hardmission不存在，尝试从其他来源获取
            if (typeof hardmission !== 'undefined') {
                window.hardmission = hardmission;
            } else {
                window.hardmission = {};
                console.warn('hardmission变量完全未找到，使用空对象');
            }
        }

        const savedMissions = localStorage.getItem('missions');
        const savedHardMissions = localStorage.getItem('hardmissions');

        if (savedMissions) {
            // 如果有本地存储数据，完全替换而不是合并
            window.mission = JSON.parse(savedMissions);
        } else {
            // 如果没有本地存储数据，保存当前的默认数据到本地存储
            saveEventsToStorage();
        }

        if (savedHardMissions) {
            // 如果有本地存储数据，完全替换而不是合并
            window.hardmission = JSON.parse(savedHardMissions);
        } else {
            // 如果没有本地存储数据，保存当前的默认数据到本地存储
            saveEventsToStorage();
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

        // 使用新的弹窗进行编辑
        openEventModal(currentEventType, currentEventKey);

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
        instructionText.textContent = '右键/长按可删除或编辑事件，无法右键请关闭Simple Allow Copy等插件';
        header.appendChild(instructionText);
        
        // 创建毛玻璃切换按钮
        const radioContainer = document.createElement('div');
        radioContainer.className = 'glassmorphism-radio-inputs';
        
        // 个人事件选项
        const personalLabel = document.createElement('label');
        personalLabel.className = 'radio';
        
        const personalRadio = document.createElement('input');
        personalRadio.type = 'radio';
        personalRadio.name = 'eventType';
        personalRadio.id = 'personalEventsRadio';
        personalRadio.checked = true;
        
        const personalSpan = document.createElement('span');
        personalSpan.className = 'radio-item';
        personalSpan.textContent = '个人事件';
        
        personalLabel.appendChild(personalRadio);
        personalLabel.appendChild(personalSpan);
        
        // 团队事件选项
        const teamLabel = document.createElement('label');
        teamLabel.className = 'radio';
        
        const teamRadio = document.createElement('input');
        teamRadio.type = 'radio';
        teamRadio.name = 'eventType';
        teamRadio.id = 'teamEventsRadio';
        
        const teamSpan = document.createElement('span');
        teamSpan.className = 'radio-item';
        teamSpan.textContent = '团队事件';
        
        teamLabel.appendChild(teamRadio);
        teamLabel.appendChild(teamSpan);
        
        radioContainer.appendChild(personalLabel);
        radioContainer.appendChild(teamLabel);

        // 创建主控制容器，包含所有按钮和搜索框
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'event-management-container';
        
        // 1. 个人/团队切换按钮 (放在最上面)
        controlsContainer.appendChild(radioContainer);
        
        // 2. 小图标按钮区域
        const iconButtonsContainer = document.createElement('div');
        iconButtonsContainer.className = 'icon-buttons-container';
        
        // 创建小图标按钮的函数
        function createIconButton(id, iconSvg, tooltip, className) {
            const button = document.createElement('button');
            button.id = id;
            button.className = `icon-btn ${className}`;
            button.title = tooltip; // 使用title属性作为工具提示
            
            const icon = document.createElement('div');
            icon.className = 'btn-icon';
            icon.innerHTML = iconSvg;
            
            button.appendChild(icon);
            
            return button;
        }
        
        // 添加个人事件按钮
        const addPersonalButton = createIconButton(
            'addPersonalButton',
            `<svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
            </svg>`,
            '添加个人事件',
            'add-btn'
        );
        addPersonalButton.style.display = 'flex';
        addPersonalButton.addEventListener('click', () => openEventModal('personal'));
        iconButtonsContainer.appendChild(addPersonalButton);
        
        // 添加团队事件按钮
        const addTeamButton = createIconButton(
            'addTeamButton',
            `<svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
            </svg>`,
            '添加团队事件',
            'add-btn'
        );
        addTeamButton.style.display = 'none';
        addTeamButton.addEventListener('click', () => openEventModal('team'));
        iconButtonsContainer.appendChild(addTeamButton);
        
        // 导出事件按钮
        const exportAllButton = createIconButton(
            'exportAllButton',
            `<svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                <path d="M12,11L16,15H13V19H11V15H8L12,11Z"/>
            </svg>`,
            '导出事件',
            'export-btn'
        );
        exportAllButton.addEventListener('click', exportAllEvents);
        iconButtonsContainer.appendChild(exportAllButton);
        
        // 导入事件按钮
        const importAllButton = createIconButton(
            'importAllButton',
            `<svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                <path d="M12,17L8,13H11V9H13V13H16L12,17Z"/>
            </svg>`,
            '导入事件',
            'import-btn'
        );
        importAllButton.addEventListener('click', importAllEvents);
        iconButtonsContainer.appendChild(importAllButton);

        // 将图标按钮容器添加到主控制容器
        controlsContainer.appendChild(iconButtonsContainer);
        
        // 3. 创建搜索输入框 (放在最下面)
        const searchContainer = document.createElement('div');
        searchContainer.style.marginBottom = '15px';
        searchContainer.style.textAlign = 'center';

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.id = 'eventSearchInput';
        searchInput.placeholder = '搜索事件 (支持拼音首字母)';
        searchInput.style.width = '300px';
        searchInput.style.padding = '8px 12px';
        searchInput.style.border = '1px solid rgba(255, 255, 255, 0.2)';
        searchInput.style.backgroundColor = 'rgba(128, 128, 128, 0.3)';
        searchInput.style.backdropFilter = 'blur(10px)';
        searchInput.style.webkitBackdropFilter = 'blur(10px)';
        searchInput.style.color = '#fff';
        searchInput.style.borderRadius = '8px';
        searchInput.style.fontSize = '14px';
        searchInput.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        searchInput.style.transition = 'all 0.3s ease';

        // 设置placeholder为纯白色
        const style = document.createElement('style');
        style.innerHTML = `
        #eventSearchInput::placeholder {
            color: #fff !important;
            opacity: 1 !important;
        }
        #eventSearchInput::-webkit-input-placeholder {
            color: #fff !important;
            opacity: 1 !important;
        }
        #eventSearchInput:-ms-input-placeholder {
            color: #fff !important;
            opacity: 1 !important;
        }
        #eventSearchInput::-ms-input-placeholder {
            color: #fff !important;
            opacity: 1 !important;
        }
        `;

    document.head.appendChild(style);

    searchContainer.appendChild(searchInput);
    
    // 将搜索容器添加到主控制容器
    controlsContainer.appendChild(searchContainer);
    
    // 将主控制容器添加到header
    header.appendChild(controlsContainer);

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
            
            // 毛玻璃切换按钮事件
            const personalRadio = document.getElementById('personalEventsRadio');
            const teamRadio = document.getElementById('teamEventsRadio');
            const personalEventsInSettings = document.getElementById('personalEventsInSettings');
            const teamEventsInSettings = document.getElementById('teamEventsInSettings');
            
            if (personalRadio && teamRadio && personalEventsInSettings && teamEventsInSettings) {
                personalRadio.addEventListener('change', () => {
                    if (personalRadio.checked) {
                        personalEventsInSettings.style.display = 'block';
                        teamEventsInSettings.style.display = 'none';
                        
                        // 控制添加按钮显示
                        const addPersonalButton = document.getElementById('addPersonalButton');
                        const addTeamButton = document.getElementById('addTeamButton');
                        if (addPersonalButton && addTeamButton) {
                            addPersonalButton.style.display = 'flex';
                            addTeamButton.style.display = 'none';
                        }
                        
                        // 触发个人事件表格的动画效果
                        const personalTableBody = document.getElementById('personalEventsTable');
                        triggerTableAnimation(personalTableBody);
                        
                        // 更新搜索功能
                        setupEventSearch('eventSearchInput', '#personalEventsInSettings table');
                        
                        isShowingPersonal = true;
                    }
                });
                
                teamRadio.addEventListener('change', () => {
                    if (teamRadio.checked) {
                        personalEventsInSettings.style.display = 'none';
                        teamEventsInSettings.style.display = 'block';
                        
                        // 控制添加按钮显示
                        const addPersonalButton = document.getElementById('addPersonalButton');
                        const addTeamButton = document.getElementById('addTeamButton');
                        if (addPersonalButton && addTeamButton) {
                            addPersonalButton.style.display = 'none';
                            addTeamButton.style.display = 'flex';
                        }
                        
                        // 触发团队事件表格的动画效果
                        const teamTableBody = document.getElementById('teamEventsTable');
                        triggerTableAnimation(teamTableBody);
                        
                        // 更新搜索功能
                        setupEventSearch('eventSearchInput', '#teamEventsInSettings table');
                        
                        isShowingPersonal = false;
                    }
                });
            }
            
            // 弹窗相关事件绑定
            setupModalControls();
            
            // 初始化搜索功能
            setupEventSearch('eventSearchInput', '#personalEventsInSettings table');
            
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
    }

    // --- 弹窗相关函数 ---

    let currentEditingType = 'personal'; // 'personal' or 'team'
    let currentEditingKey = null;

    function openEventModal(type, key = null) {
        const modal = document.getElementById('eventModal');
        const overlay = document.getElementById('eventModalOverlay');
        const titleInput = document.getElementById('eventTitle');
        const contentInput = document.getElementById('eventContent');
        const placeholdersContainer = document.getElementById('placeholdersContainer');

        currentEditingType = type;
        currentEditingKey = key;

        // 重置表单
        titleInput.value = '';
        contentInput.value = '';
        placeholderData = {}; // 重置占位符数据

        if (key) {
            // 编辑模式
            const eventData = (type === 'personal' ? window.mission : window.hardmission)[key];
            if (eventData) {
                titleInput.value = key;
                contentInput.value = eventData.内容;
                if (eventData.placeholders) {
                    // 安全地复制占位符数据，确保每个值都是数组格式
                    placeholderData = {};
                    Object.entries(eventData.placeholders).forEach(([name, values]) => {
                        // 确保 values 是数组格式，防止类型错误
                        if (Array.isArray(values)) {
                            placeholderData[name] = [...values];
                        } else if (values != null) {
                            // 如果不是数组但有值，转换为数组
                            placeholderData[name] = [String(values)];
                        } else {
                            // 如果是 null 或 undefined，使用空数组
                            placeholderData[name] = [];
                        }
                    });
                } else {
                    placeholderData = {};
                }
            }
        }

        // 渲染占位符卡片
        renderPlaceholderCards();

        modal.style.display = 'block';
        overlay.style.display = 'block';
    }

    function closeEventModal() {
        const modal = document.getElementById('eventModal');
        const overlay = document.getElementById('eventModalOverlay');
        modal.style.display = 'none';
        overlay.style.display = 'none';
    }

    function addPlaceholderInput(name = '', values = '') {
        // 旧的函数保留用于兼容性，但不再使用
        console.log('addPlaceholderInput called with legacy parameters');
    }

    // 新的占位符管理系统
    let currentEditingPlaceholder = null;
    let placeholderData = {};

    function renderPlaceholderCards() {
        const container = document.getElementById('placeholdersContainer');
        if (!container) {
            console.warn('placeholdersContainer 未找到');
            return;
        }
        
        container.innerHTML = '';

        // 确保 placeholderData 是有效对象
        if (!placeholderData || typeof placeholderData !== 'object') {
            placeholderData = {};
        }

        // 渲染现有的占位符卡片
        try {
            Object.entries(placeholderData).forEach(([name, values]) => {
                // 额外的安全检查
                if (name && values !== undefined) {
                    const card = createPlaceholderCard(name, values);
                    container.appendChild(card);
                }
            });
        } catch (error) {
            console.error('渲染占位符卡片时出错:', error);
            console.log('placeholderData 内容:', placeholderData);
        }

        // 添加新增卡片
        const addCard = createAddPlaceholderCard();
        container.appendChild(addCard);
    }

    function createPlaceholderCard(name, values) {
        const card = document.createElement('div');
        card.className = 'placeholder-card';
        
        // 确保 values 是数组格式
        const valuesArray = Array.isArray(values) ? values : (values ? [values] : []);
        
        card.innerHTML = `
            <div class="placeholder-card-header">
                <div class="placeholder-card-name">${name}</div>
                <div class="placeholder-card-actions">
                    <button class="placeholder-card-btn placeholder-edit-btn" onclick="window.eventManagement.editPlaceholder('${name}')" title="编辑">
                        ✏️
                    </button>
                    <button class="placeholder-card-btn placeholder-delete-btn" onclick="window.eventManagement.deletePlaceholder('${name}')" title="删除">
                        🗑️
                    </button>
                </div>
            </div>
            <div class="placeholder-card-values">
                ${valuesArray.map(value => `<span class="placeholder-value-tag">${value}</span>`).join('')}
            </div>
            <div class="placeholder-copy-hint">点击卡片复制引用标签</div>
        `;
        
        // 添加点击复制功能
        card.addEventListener('click', (e) => {
            // 如果点击的是按钮，不执行复制
            if (e.target.closest('.placeholder-card-btn')) {
                return;
            }
            
            const referenceTag = `[${name}]`;
            copyToClipboard(referenceTag, name);
        });
        
        return card;
    }

    function createAddPlaceholderCard() {
        const card = document.createElement('div');
        card.className = 'placeholder-add-card';
        card.innerHTML = `
            <div class="placeholder-add-icon">+</div>
            <div class="placeholder-add-text">添加新的随机词条</div>
        `;
        card.onclick = () => openPlaceholderEditModal();
        return card;
    }

    function openPlaceholderEditModal(placeholderName = null) {
        const modal = document.getElementById('placeholderEditModal');
        const titleElement = document.getElementById('placeholderEditTitle');
        const nameInput = document.getElementById('placeholderNameInput');
        const valuesList = document.getElementById('placeholderValuesList');

        currentEditingPlaceholder = placeholderName;
        
        if (placeholderName) {
            titleElement.textContent = '编辑随机词条';
            nameInput.value = placeholderName;
            nameInput.disabled = true; // 编辑时不允许修改名称
            renderPlaceholderValues(placeholderData[placeholderName] || []);
        } else {
            titleElement.textContent = '添加随机词条';
            nameInput.value = '';
            nameInput.disabled = false;
            renderPlaceholderValues([]);
        }

        clearPlaceholderErrors();
        modal.style.display = 'flex';
    }

    function closePlaceholderEditModal() {
        const modal = document.getElementById('placeholderEditModal');
        modal.style.display = 'none';
        currentEditingPlaceholder = null;
    }

    function renderPlaceholderValues(values) {
        const valuesList = document.getElementById('placeholderValuesList');
        valuesList.innerHTML = '';

        values.forEach((value, index) => {
            const valueItem = createPlaceholderValueItem(value, index);
            valuesList.appendChild(valueItem);
        });

        // 如果没有值，添加一个空的输入框
        if (values.length === 0) {
            addPlaceholderValueInput('');
        }
    }

    function createPlaceholderValueItem(value, index) {
        const item = document.createElement('div');
        item.className = 'placeholder-value-item';
        item.innerHTML = `
            <input type="text" class="placeholder-value-input" value="${value}" data-index="${index}" placeholder="输入一个词条，高级功能:使用[*xx,yy,zz*]格式可在抽取时随机替换为其中一个">
            <button type="button" class="placeholder-value-delete" onclick="window.eventManagement.removePlaceholderValue(${index})">×</button>
        `;
        return item;
    }

    function addPlaceholderValueInput(value = '') {
        const valuesList = document.getElementById('placeholderValuesList');
        const index = valuesList.children.length;
        const valueItem = createPlaceholderValueItem(value, index);
        valuesList.appendChild(valueItem);
    }

    function removePlaceholderValue(index) {
        const valuesList = document.getElementById('placeholderValuesList');
        const item = valuesList.children[index];
        if (item) {
            item.remove();
            // 重新编号
            Array.from(valuesList.children).forEach((child, newIndex) => {
                const input = child.querySelector('.placeholder-value-input');
                const deleteBtn = child.querySelector('.placeholder-value-delete');
                input.setAttribute('data-index', newIndex);
                deleteBtn.setAttribute('onclick', `window.eventManagement.removePlaceholderValue(${newIndex})`);
            });
        }
    }

    function savePlaceholder() {
        const nameInput = document.getElementById('placeholderNameInput');
        const valuesList = document.getElementById('placeholderValuesList');
        
        const name = nameInput.value.trim();
        if (!name) {
            showPlaceholderError('placeholderNameError', '词条名称不能为空');
            return;
        }

        // 检查名称是否重复（仅在新增时检查）
        if (!currentEditingPlaceholder && placeholderData.hasOwnProperty(name)) {
            showPlaceholderError('placeholderNameError', '词条名称已存在');
            return;
        }

        // 收集所有值
        const values = [];
        const valueInputs = valuesList.querySelectorAll('.placeholder-value-input');
        valueInputs.forEach(input => {
            const value = input.value.trim();
            if (value) {
                // 检查值是否重复
                if (values.includes(value)) {
                    showPlaceholderError('placeholderNameError', `值 "${value}" 重复了`);
                    return;
                }
                values.push(value);
            }
        });

        if (values.length === 0) {
            showPlaceholderError('placeholderNameError', '至少需要添加一个值');
            return;
        }

        // 如果是编辑现有占位符且名称改变了，删除旧的
        if (currentEditingPlaceholder && currentEditingPlaceholder !== name) {
            delete placeholderData[currentEditingPlaceholder];
        }

        // 保存数据
        placeholderData[name] = values;
        
        // 重新渲染卡片
        renderPlaceholderCards();
        
        // 关闭模态框
        closePlaceholderEditModal();
    }

    function deletePlaceholder(name) {
        if (confirm(`确定要删除随机词条 "${name}" 吗？`)) {
            delete placeholderData[name];
            renderPlaceholderCards();
        }
    }

    function showPlaceholderError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }

    function clearPlaceholderErrors() {
        const errorElement = document.getElementById('placeholderNameError');
        errorElement.style.display = 'none';
    }

    // 复制到剪贴板的函数
    function copyToClipboard(text, placeholderName) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            // 使用现代 Clipboard API
            navigator.clipboard.writeText(text).then(() => {
                showCopySuccessMessage(placeholderName);
            }).catch(() => {
                // 如果失败，使用备用方法
                fallbackCopyToClipboard(text, placeholderName);
            });
        } else {
            // 备用方法
            fallbackCopyToClipboard(text, placeholderName);
        }
    }

    function fallbackCopyToClipboard(text, placeholderName) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            showCopySuccessMessage(placeholderName);
        } catch (err) {
            console.error('复制失败:', err);
            alert('复制失败，请手动复制：' + text);
        }
        
        document.body.removeChild(textArea);
    }

    function showCopySuccessMessage(placeholderName) {
        // 创建临时提示消息
        const message = document.createElement('div');
        message.className = 'copy-success-message';
        message.textContent = `已复制引用标签 [${placeholderName}]`;
        message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(46, 204, 113, 0.9);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(10px);
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(message);
        
        // 3秒后移除消息
        setTimeout(() => {
            if (message.parentNode) {
                message.style.animation = 'slideOutRight 0.3s ease-in';
                setTimeout(() => {
                    document.body.removeChild(message);
                }, 300);
            }
        }, 3000);
    }

    function saveEvent() {
        const title = document.getElementById('eventTitle').value.trim();
        const content = document.getElementById('eventContent').value.trim();

        if (!title || !content) {
            alert('事件标题和内容不能为空！');
            return;
        }

        const eventPool = currentEditingType === 'personal' ? window.mission : window.hardmission;
        
        // 检查标题是否重复（仅在新增或编辑时标题有变化的情况下）
        if ((!currentEditingKey || currentEditingKey !== title) && eventPool.hasOwnProperty(title)) {
            alert(`事件标题 "${title}" 已存在，请使用不同的标题！`);
            return;
        }

        // 使用新的占位符系统数据
        const eventData = {
            '内容': content
        };

        if (Object.keys(placeholderData).length > 0) {
            eventData.placeholders = { ...placeholderData };
        }
        
        // 如果是编辑模式且标题已更改，则删除旧条目
        if (currentEditingKey && currentEditingKey !== title) {
            delete eventPool[currentEditingKey];
        }

        eventPool[title] = eventData;
        saveEventsToStorage();

        // 刷新表格
        const tableId = currentEditingType === 'personal' ? 'personalEventsTable' : 'teamEventsTable';
        const table = document.getElementById(tableId);
        populateTable(table, eventPool, tableId, true);

        closeEventModal();
    }

    let modalControlsInitialized = false;
    function setupModalControls() {
        if (modalControlsInitialized) return;

        // 移除旧的添加占位符按钮事件（因为现在使用卡片系统）
        document.getElementById('saveEventBtn').addEventListener('click', saveEvent);
        document.getElementById('cancelEventBtn').addEventListener('click', closeEventModal);
        // 移除了 eventModalOverlay 的点击关闭逻辑

        // 新的占位符编辑模态框事件监听器
        document.getElementById('placeholderEditClose').addEventListener('click', closePlaceholderEditModal);
        document.getElementById('placeholderCancelBtn').addEventListener('click', closePlaceholderEditModal);
        document.getElementById('placeholderSaveBtn').addEventListener('click', savePlaceholder);
        document.getElementById('addPlaceholderValue').addEventListener('click', () => addPlaceholderValueInput());
        
        // 移除了 placeholderEditModal 的点击外部关闭逻辑

        const helpBtn = document.getElementById('placeholderHelpBtn');
        helpBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            window.open('./docs/#/guide?id=随机词条', '_blank');
        });

        modalControlsInitialized = true;
    }

    // 导出所有事件
    function exportAllEvents() {
        try {
            const allEvents = {
                personalEvents: window.mission || {},
                teamEvents: window.hardmission || {},
                exportTime: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
            };
            
            const dataStr = JSON.stringify(allEvents, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `unhappycar事件导出_${new Date().toISOString().slice(0, 10)}.json`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            alert('事件导出成功！');
        } catch (error) {
            console.error('导出失败：', error);
            alert('导出失败，请稍后重试');
        }
    }
    
    // 导入所有事件
    function importAllEvents() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = function(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const importedData = JSON.parse(e.target.result);
                    
                    // 验证数据格式
                    if (!importedData.personalEvents || !importedData.teamEvents) {
                        alert('文件格式不正确，请选择正确的事件导出文件');
                        return;
                    }
                    
                    // 确认导入操作
                    const confirmMessage = `将要导入：
- 个人事件：${Object.keys(importedData.personalEvents).length} 个
- 团队事件：${Object.keys(importedData.teamEvents).length} 个

注意：这将覆盖当前所有事件数据，是否继续？`;
                    
                    if (!confirm(confirmMessage)) {
                        return;
                    }
                    
                    // 导入数据
                    window.mission = importedData.personalEvents;
                    window.hardmission = importedData.teamEvents;
                    
                    // 保存到本地存储
                    saveEventsToStorage();
                    
                    // 刷新事件管理界面
                    refreshEventManagement();
                    
                    alert('事件导入成功！');
                } catch (error) {
                    console.error('导入失败：', error);
                    alert('文件格式错误或损坏，导入失败');
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }
    
    // 刷新事件管理界面
    function refreshEventManagement() {
        // 重新填充个人事件表格
        const personalTable = document.getElementById('personalEventsTable');
        if (personalTable) {
            populateTable(personalTable, window.mission || {}, 'personalEventsTable', true);
        }
        
        // 重新填充团队事件表格
        const teamTable = document.getElementById('teamEventsTable');
        if (teamTable) {
            populateTable(teamTable, window.hardmission || {}, 'teamEventsTable', true);
        }
        
        // 清除勾选状态缓存，重新计算
        localStorage.removeItem('personalEventsTable-checkedState');
        localStorage.removeItem('teamEventsTable-checkedState');
    }

    // 公共接口
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
        setAddEventFormsVisibility,
        // 新的占位符功能
        editPlaceholder: openPlaceholderEditModal,
        deletePlaceholder: deletePlaceholder,
        removePlaceholderValue: removePlaceholderValue,
        setupEventSearch
    };
})();
