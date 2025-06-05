// 获取设置按钮和弹窗相关元素
const settingsButton = document.getElementById("settingsButton");
const settingsOverlay = document.getElementById("settingsOverlay");
const settingsPopup = document.getElementById("settingsPopup");
const settingsTitle = document.getElementById("settingsTitle");
const settingsDetails = document.getElementById("settingsDetails");

// 设置选项按钮
const characterManagement = document.getElementById("characterManagement");
const characterHistory = document.getElementById("characterHistory");
const eventManagement = document.getElementById("eventManagement");
const eventHistory = document.getElementById("eventHistory");
const moreSettings = document.getElementById("moreSettings");
const gameSettings = document.getElementById("gameSettings");

// 打开设置弹窗
settingsButton.addEventListener("click", () => {
    settingsOverlay.style.display = "block";
    settingsPopup.style.display = "flex";
    document.body.classList.add("no-scroll");

    // 默认加载角色管理界面
    activeFilter = null; 
    const container = window.loadCharacterManagement(); // 获取角色管理内容
    settingsDetails.innerHTML = ""; // 清空内容
    settingsDetails.appendChild(container); // 插入角色管理内容
    settingsTitle.textContent = "角色管理"; // 设置标题
    document.querySelectorAll(".value").forEach(btn => btn.classList.remove("active"));
    characterManagement.classList.add("active"); 

    settingsDetails.scrollTop = 0;
});

// 关闭设置弹窗
const closeSettingsPopup = document.createElement("button");
closeSettingsPopup.className = "close-popup-button"; // 添加样式类名    
closeSettingsPopup.addEventListener("click", () => {
    settingsOverlay.style.display = "none";
    settingsPopup.style.display = "none";
    document.body.classList.remove("no-scroll");
});

// 将关闭按钮添加到设置弹窗
settingsPopup.appendChild(closeSettingsPopup);

// 点击空白处关闭设置弹窗
settingsOverlay.addEventListener("click", (event) => {
    if (event.target === settingsOverlay) {
        settingsOverlay.style.display = "none";
        settingsPopup.style.display = "none";
        document.body.classList.remove("no-scroll");
    }
});

// 设置选项点击事件
characterManagement.addEventListener("click", () => {
    activeFilter = null; 
    const container = window.loadCharacterManagement(); // 获取角色管理内容
    selectOption(characterManagement, "角色管理", container);
});

characterHistory.addEventListener("click", () => {
    const historyContent = window.historyModule.getHistoryContent(); 
    selectOption(characterHistory, "角色历史记录", historyContent); 
});

eventManagement.addEventListener("click", () => {
    // 确保在加载内容前隐藏添加事件表单
    if (typeof window.eventManagement.setAddEventFormsVisibility === 'function') {
        window.eventManagement.setAddEventFormsVisibility(false, 0);
    }
    
    // 使用 events.js 模块中的事件管理功能
    const eventManagementContent = window.eventManagement.loadEventManagement();
    selectOption(eventManagement, "事件管理", eventManagementContent);
    
    // 延时确保DOM已经更新，然后触发表格动画
    setTimeout(() => {
        const personalTableBody = document.getElementById('personalEventsTable');
        if (personalTableBody && typeof window.eventManagement.triggerTableAnimation === 'function') {
            window.eventManagement.triggerTableAnimation(personalTableBody);
        }
    }, 100);
});

eventHistory.addEventListener("click", () => {
    const eventHistoryContent = window.eventHistoryModule.getEventHistoryContent();
    selectOption(eventHistory, "事件历史记录", eventHistoryContent);
});

moreSettings.addEventListener("click", () => {
    selectOption(moreSettings, "更多玩法设置", "<p> coming soon</p>");
});

gameSettings.addEventListener("click", () => {
    // 创建重置按钮
    const resetButton = document.createElement("button");
    resetButton.textContent = "重置游戏";
    resetButton.className = "reset-button"; // 添加样式类名
    resetButton.addEventListener("click", () => {
        if (confirm("确定要重置游戏吗？")) {
            window.resetGame(); // 调用全局的 resetGame
            // 关闭设置弹窗
            settingsOverlay.style.display = "none";
            settingsPopup.style.display = "none";
            document.body.classList.remove("no-scroll");
        }
    });

    // 创建容器并插入内容
    const container = document.createElement("div");
    container.innerHTML = "<p>这里是游戏设置的内容。</p>";
    container.appendChild(resetButton);

    // 显示游戏设置内容
    selectOption(gameSettings, "游戏设置", container);
});

// 通用函数：选定设置选项
function selectOption(button, title, content) {
    // 移除所有按钮的激活状态
    document.querySelectorAll(".value").forEach(btn => btn.classList.remove("active"));

    // 设置当前按钮为激活状态
    button.classList.add("active");

    // 更新右侧内容
    settingsTitle.textContent = title;

    // 添加动画类
    settingsDetails.classList.remove("animate"); // 移除旧的动画类
    void settingsDetails.offsetWidth; // 触发重绘以重新应用动画
    settingsDetails.classList.add("animate");

    settingsDetails.innerHTML = ""; // 清空内容
    if (typeof content === "string") {
        settingsDetails.innerHTML = content; // 插入 HTML 字符串
    } else {
        settingsDetails.appendChild(content); // 插入 DOM 节点
    }
}

// 添加菜单按钮到弹窗内部
const burgerLabel = document.createElement("label");
burgerLabel.className = "burger";
burgerLabel.setAttribute("for", "burger");

const burgerInput = document.createElement("input");
burgerInput.type = "checkbox";
burgerInput.id = "burger";

const span1 = document.createElement("span");
const span2 = document.createElement("span");
const span3 = document.createElement("span");

burgerLabel.appendChild(burgerInput);
burgerLabel.appendChild(span1);
burgerLabel.appendChild(span2);
burgerLabel.appendChild(span3);

settingsPopup.appendChild(burgerLabel); // 将汉堡菜单按钮添加到弹窗内部

// 监听汉堡菜单的状态变化
burgerInput.addEventListener("change", () => {
    const inputContainer = document.querySelector(".input");
    if (inputContainer) {
        if (burgerInput.checked) {
            // 显示菜单
            inputContainer.style.display = "flex";
            inputContainer.classList.add("show");
            inputContainer.classList.remove("hide");
        } else {
            // 隐藏菜单
            inputContainer.classList.remove("show");
            inputContainer.classList.add("hide");

            inputContainer.addEventListener("animationend", () => {
                inputContainer.style.display = "none";
                inputContainer.classList.remove("hide");
            }, { once: true });
        }
    }
});

// 点击左侧选项后自动隐藏菜单（仅在小屏幕下生效）
document.querySelectorAll(".input .value").forEach(option => {
    option.addEventListener("click", () => {
        if (window.innerWidth <= 518) {
            const inputContainer = document.querySelector(".input");
            const burgerInput = document.getElementById("burger");
            if (inputContainer.classList.contains("show")) {
                // 添加隐藏动画
                inputContainer.classList.remove("show");
                inputContainer.classList.add("hide");

                // 动画结束后隐藏菜单
                inputContainer.addEventListener("animationend", () => {
                    inputContainer.classList.remove("hide");
                    inputContainer.style.display = "none";
                }, { once: true });

                // 重置汉堡菜单按钮状态
                burgerInput.checked = false;
            }
        }
    });
});

// 检查屏幕宽度并动态调整菜单选项栏的显示状态
function adjustMenuForScreenSize() {
    const inputContainer = document.querySelector(".input");
    const settingsToggleButton = document.querySelector(".settings-toggle-button");

    if (window.innerWidth > 518) {
        // 大屏幕：显示菜单选项栏，隐藏菜单按钮
        if (inputContainer) {
            inputContainer.style.display = "flex";
            inputContainer.classList.remove("hide", "show"); // 移除动画类
        }
        if (settingsToggleButton) {
            settingsToggleButton.style.display = "none";
        }
    } else {
        // 小屏幕：隐藏菜单选项栏，显示菜单按钮
        if (inputContainer) {
            inputContainer.style.display = "none";
            inputContainer.classList.remove("show");
        }
        if (settingsToggleButton) {
            settingsToggleButton.style.display = "block";
        }
    }
}

// 初始化时调整菜单状态
adjustMenuForScreenSize();

// 监听窗口大小变化，动态调整菜单状态
window.addEventListener("resize", adjustMenuForScreenSize);

// 页面加载时自动初始化事件数据
document.addEventListener('DOMContentLoaded', function() {
    // 确保事件管理模块已加载
    if (window.eventManagement) {
        // 初始化事件数据
        window.eventManagement.initializeEventData();
    }
});