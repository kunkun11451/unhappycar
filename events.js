// 初始化事件管理相关 DOM 元素
const viewEventsButton = document.getElementById('viewEventsButton');
const eventOverlay = document.getElementById('eventOverlay');
const eventPopup = document.getElementById('eventPopup');
const closeEventPopup = document.getElementById('closeEventPopup');
const personalEventsRadio = document.getElementById('personalEventsRadio');
const teamEventsRadio = document.getElementById('teamEventsRadio');
const personalEvents = document.getElementById('personalEvents');
const teamEvents = document.getElementById('teamEvents');
const personalEventsTable = document.getElementById('personalEventsTable');
const teamEventsTable = document.getElementById('teamEventsTable');

let isShowingPersonal = true; // 当前显示的任务类型

// 填充任务表格
function populateTable(table, tasks, tableId) {
    table.innerHTML = '';

    // 加载保存的勾选状态
    const savedState = JSON.parse(localStorage.getItem(`${tableId}-checkedState`)) || {};

    // 计算启用的个数
    const totalTasks = Object.keys(tasks).length;
    let enabledCount = 0;

    // 遍历任务，生成表格内容
    Object.keys(tasks).forEach((key, index) => {
        const row = document.createElement('tr');

        // 创建序号单元格
        const indexCell = document.createElement('td');
        indexCell.textContent = index + 1; // 自动添加序号
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
        checkbox.dataset.key = key; // 保存任务的 key

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
            row.classList.add('unchecked'); // 添加暗红色遮罩
        }

        // 为整行添加点击事件，切换勾选框状态
        row.addEventListener('click', (event) => {
            if (event.target.tagName.toLowerCase() === 'input') {
                return;
            }
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event('change')); // 手动触发 change 事件
        });

        // 为勾选框单独添加事件监听
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                enabledCount++;
                row.classList.remove('unchecked'); // 移除暗红色遮罩
            } else {
                enabledCount--;
                row.classList.add('unchecked'); // 添加暗红色遮罩
            }
            updateEnabledCount(tableId, enabledCount, totalTasks); // 更新启用计数显示
            saveCheckedState(tableId); // 保存勾选状态
        });

        // 将行添加到表格
        table.appendChild(row);
    });

    // 添加启用计数行
    const footerRow = document.createElement('tr');
    const footerCell = document.createElement('td');
    footerCell.colSpan = 3; // 跨越前三列
    footerCell.textContent = `启用：${enabledCount}/${totalTasks}`;
    footerCell.style.textAlign = 'right';
    footerRow.appendChild(footerCell);

    const emptyCell = document.createElement('td'); // 空单元格用于对齐启用列
    footerRow.appendChild(emptyCell);
    table.appendChild(footerRow);
}

// 更新启用计数显示
function updateEnabledCount(tableId, enabledCount, totalTasks) {
    const footerCell = document.querySelector(`#${tableId} tr:last-child td:first-child`);
    if (footerCell) {
        footerCell.textContent = `启用：${enabledCount}/${totalTasks}`;
    }
}

// 保存勾选状态
function saveCheckedState(tableId) {
    const checkboxes = document.querySelectorAll(`#${tableId} input[type="checkbox"]`);
    const checkedState = {};
    checkboxes.forEach(checkbox => {
        checkedState[checkbox.dataset.key] = checkbox.checked; // 保存每个任务的勾选状态
    });
    localStorage.setItem(`${tableId}-checkedState`, JSON.stringify(checkedState)); // 存储到 localStorage
}

// 从 localStorage 加载事件数据
function loadEventsFromStorage() {
    const savedMissions = localStorage.getItem('missions');
    const savedHardMissions = localStorage.getItem('hardmissions');

    if (savedMissions) {
        Object.assign(mission, JSON.parse(savedMissions));
    }

    if (savedHardMissions) {
        Object.assign(hardmission, JSON.parse(savedHardMissions));
    }
}

// 将事件数据保存到 localStorage
function saveEventsToStorage() {
    localStorage.setItem('missions', JSON.stringify(mission));
    localStorage.setItem('hardmissions', JSON.stringify(hardmission));
}

// 显示弹窗
viewEventsButton.addEventListener('click', () => {
    populateTable(personalEventsTable, mission, 'personalEventsTable'); // 填充个人任务
    populateTable(teamEventsTable, hardmission, 'teamEventsTable'); // 填充团体任务
    eventOverlay.style.display = 'block'; // 显示黑色半透明背景
    eventPopup.style.display = 'block'; // 显示弹窗
    eventPopup.classList.add('md-show'); // 添加动画类
    isShowingPersonal = true; // 默认显示个人任务
    personalEvents.style.display = 'block';
    teamEvents.style.display = 'none';
});

// 关闭弹窗
closeEventPopup.addEventListener('click', () => {
    eventOverlay.style.display = 'none';
    eventPopup.classList.remove('md-show'); // 移除动画类
});

eventOverlay.addEventListener('click', () => {
    eventOverlay.style.display = 'none';
    eventPopup.classList.remove('md-show'); // 秘除动画类
});

personalEventsRadio.addEventListener('change', () => {
    if (personalEventsRadio.checked) {
        personalEvents.style.display = 'block';
        teamEvents.style.display = 'none';
    }
});

teamEventsRadio.addEventListener('change', () => {
    if (teamEventsRadio.checked) {
        personalEvents.style.display = 'none';
        teamEvents.style.display = 'block';
    }
});

// 添加事件按钮和输入框
const addEventButton = document.getElementById('addEventButton');
const newEventTitle = document.getElementById('newEventTitle');
const newEventContent = document.getElementById('newEventContent');

const addTeamEventButton = document.getElementById('addTeamEventButton');
const newTeamEventTitle = document.getElementById('newTeamEventTitle');
const newTeamEventContent = document.getElementById('newTeamEventContent');

// 添加个人事件
addEventButton.addEventListener('click', () => {
    const title = newEventTitle.value.trim();
    const content = newEventContent.value.trim();

    if (!title || !content) {
        alert('事件标题和内容不能为空！');
        return;
    }

    if (mission[title]) {
        alert('事件标题已存在，请使用其他标题！');
        return;
    }

    // 添加到 mission 对象
    mission[title] = { 内容: content };

    // 保存到 localStorage
    saveEventsToStorage();

    // 更新表格
    populateTable(personalEventsTable, mission, 'personalEventsTable');

    // 清空输入框
    newEventTitle.value = '';
    newEventContent.value = '';
});

// 添加团队事件
addTeamEventButton.addEventListener('click', () => {
    const title = newTeamEventTitle.value.trim();
    const content = newTeamEventContent.value.trim();

    if (!title || !content) {
        alert('事件标题和内容不能为空！');
        return;
    }

    if (hardmission[title]) {
        alert('事件标题已存在，请使用其他标题！');
        return;
    }

    // 添加到 hardmission 对象
    hardmission[title] = { 内容: content };

    // 保存到 localStorage
    saveEventsToStorage();

    // 更新表格
    populateTable(teamEventsTable, hardmission, 'teamEventsTable');

    // 清空输入框
    newTeamEventTitle.value = '';
    newTeamEventContent.value = '';
});

// 获取右键菜单相关 DOM 元素
const contextMenu = document.getElementById('contextMenu');
let currentEventKey = null; // 当前右键点击的事件标题
let currentEventType = null; // 当前事件类型（personal 或 team）

// 显示右键菜单
function showContextMenu(event, key, type) {
    event.preventDefault();
    currentEventKey = key;
    currentEventType = type;

        // 获取点击位置
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const menuWidth = 150; // 假设菜单宽度为 150px
    const menuHeight = 100; // 假设菜单高度为 100px

    let x = event.clientX;
    let y = event.clientY;

    // 调整菜单位置，确保不超出屏幕
    if (x + menuWidth > viewportWidth) {
        x = viewportWidth - menuWidth - 10; // 距离右侧留 10px
    }
    if (y + menuHeight > viewportHeight) {
        y = viewportHeight - menuHeight - 10; // 距离底部留 10px
    }

    // 设置菜单位置
    const contextMenu = document.querySelector('.context-menu');
    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;
    contextMenu.style.display = 'block';

    // 获取选中行
    const row = event.target.closest('tr');
    if (!row) return;

    // 移除之前的选中样式
    document.querySelectorAll('.highlighted-row').forEach((el) => {
        el.classList.remove('highlighted-row');
    });

    // 为当前行添加选中样式
    row.classList.add('highlighted-row');

    // 获取单元格的位置
    const rect = row.getBoundingClientRect();

}

// 隐藏右键菜单
function hideContextMenu() {
    contextMenu.style.display = 'none';
    currentEventKey = null;
    currentEventType = null;

    // 移除选中样式
    document.querySelectorAll('.highlighted-row').forEach((el) => {
        el.classList.remove('highlighted-row');
    });
}

// 编辑事件
function editEvent() {
    if (!currentEventKey || !currentEventType) return;

    const isPersonal = currentEventType === 'personal';
    const eventData = isPersonal ? mission[currentEventKey] : hardmission[currentEventKey];

    // 显示编辑表单，仅允许编辑内容
    const newContent = prompt('编辑事件内容：', eventData.内容);

    if (newContent) {
        // 更新事件数据
        if (isPersonal) {
            mission[currentEventKey].内容 = newContent;
        } else {
            hardmission[currentEventKey].内容 = newContent;
        }

        // 保存到 localStorage
        saveEventsToStorage();

        // 更新表格
        const table = isPersonal ? personalEventsTable : teamEventsTable;
        populateTable(table, isPersonal ? mission : hardmission, isPersonal ? 'personalEventsTable' : 'teamEventsTable');
    }

    hideContextMenu();
}

// 删除事件
function deleteEvent() {
    if (!currentEventKey || !currentEventType) return;

    const isPersonal = currentEventType === 'personal';

    // 删除事件数据
    if (isPersonal) {
        delete mission[currentEventKey];
    } else {
        delete hardmission[currentEventKey];
    }

    // 保存到 localStorage
    saveEventsToStorage();

    // 更新表格
    const table = isPersonal ? personalEventsTable : teamEventsTable;
    populateTable(table, isPersonal ? mission : hardmission, isPersonal ? 'personalEventsTable' : 'teamEventsTable');

    hideContextMenu();
}

// 绑定右键菜单事件
contextMenu.addEventListener('click', (event) => {
    if (event.target.id === 'editEvent') {
        editEvent();
    } else if (event.target.id === 'deleteEvent') {
        deleteEvent();
    }
});

// 隐藏右键菜单（点击其他地方时）
document.addEventListener('click', hideContextMenu);

// 在表格中绑定右键事件（支持桌面端右键和手机端长按）
function bindTableRowContextMenu(table, type) {
    let touchTimer = null; // 用于记录长按的计时器

    table.addEventListener('contextmenu', (event) => {
        const row = event.target.closest('tr');
        if (!row) return;

        const titleCell = row.querySelector('td:nth-child(2)');
        if (!titleCell) return;

        const key = titleCell.textContent.trim();
        showContextMenu(event, key, type);
    });

    // 手机端长按事件
    table.addEventListener('touchstart', (event) => {
        const row = event.target.closest('tr');
        if (!row) return;

        const titleCell = row.querySelector('td:nth-child(2)');
        if (!titleCell) return;

        const key = titleCell.textContent.trim();

        // 设置计时器，0.5 秒后触发右键菜单
        touchTimer = setTimeout(() => {
            showContextMenu(event, key, type);
            touchTimer = null; // 清除计时器引用
        }, 500); // 长按 0.5 秒
    });

    table.addEventListener('touchend', () => {
        // 用户松手时清除计时器
        if (touchTimer) {
            clearTimeout(touchTimer);
            touchTimer = null;
        }
    });

    table.addEventListener('touchmove', () => {
        // 如果用户在长按时移动手指，则取消长按
        if (touchTimer) {
            clearTimeout(touchTimer);
            touchTimer = null;
        }
    });
}

// 页面加载时绑定右键事件
document.addEventListener('DOMContentLoaded', () => {
    loadEventsFromStorage();
    bindTableRowContextMenu(personalEventsTable, 'personal');
    bindTableRowContextMenu(teamEventsTable, 'team');
});