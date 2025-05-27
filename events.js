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
const addEventButton = document.getElementById('addEventButton');
const addEventForm = document.getElementById('addEventForm');
const submitEventButton = document.getElementById('submitEventButton');

let isShowingPersonal = true; // 当前显示的任务类型

// 初始化任务存储
const personalTasksKey = 'personalTasks';
const teamTasksKey = 'teamTasks';

// 加载任务
function loadTasks(key) {
    return JSON.parse(localStorage.getItem(key)) || {};
}

// 初始化任务数据
let personalTasks = loadTasks(personalTasksKey);
let teamTasks = loadTasks(teamTasksKey);

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
    eventPopup.classList.remove('md-show'); // 秮除动画类
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

    // 初始化个人任务和团体任务表格
    populateTable(personalEventsTable, mission, 'personalEventsTable');
    populateTable(teamEventsTable, hardmission, 'teamEventsTable');
});

// 点击“添加事件”按钮，显示二级弹窗
addEventButton.addEventListener('click', () => {
    addEventForm.style.display = 'flex'; // 显示弹窗
});


// 页面加载时初始化表格
document.addEventListener('DOMContentLoaded', () => {
    personalTasks = loadTasks(personalTasksKey);
    teamTasks = loadTasks(teamTasksKey);

    populateTable(personalEventsTable, personalTasks, 'personalEventsTable');
    populateTable(teamEventsTable, teamTasks, 'teamEventsTable');
});

// 点击弹窗外部关闭弹窗
addEventForm.addEventListener('click', (e) => {
  if (e.target === addEventForm) {
    addEventForm.style.display = 'none';
  }
});