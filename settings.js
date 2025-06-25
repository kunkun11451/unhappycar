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
const userDocumentation = document.getElementById("userDocumentation");

// 跟踪当前活跃的选项
let currentActiveOption = null;

// 打开设置弹窗
settingsButton.addEventListener("click", () => {
    settingsOverlay.style.display = "block";
    settingsPopup.style.display = "flex";
    document.body.classList.add("no-scroll");

    // 确保团队数据已更新 - 使用loadTeamData重新加载数据
    if (window.teamManagement && typeof window.teamManagement.loadTeamData === 'function') {
        window.teamManagement.loadTeamData();
    }    // 默认加载角色管理界面
    if (window.clearCharacterFilters) {
        window.clearCharacterFilters(); // 清除所有筛选状态
    }
    const container = window.loadCharacterManagement(); // 获取角色管理内容
    settingsDetails.innerHTML = ""; // 清空内容
    settingsDetails.appendChild(container); // 插入角色管理内容
    settingsTitle.textContent = "角色管理"; // 设置标题
    document.querySelectorAll(".value").forEach(btn => btn.classList.remove("active"));
    characterManagement.classList.add("active");
    currentActiveOption = characterManagement; // 记录当前活跃选项

    settingsDetails.scrollTop = 0;
});

// 关闭设置弹窗
const closeSettingsPopup = document.createElement("button");
closeSettingsPopup.className = "close-popup-button"; // 添加样式类名    
closeSettingsPopup.addEventListener("click", () => {
    settingsOverlay.style.display = "none";
    settingsPopup.style.display = "none";
    document.body.classList.remove("no-scroll");
    
    // 确保在下次打开设置弹窗前重置状态
    document.querySelectorAll(".value").forEach(btn => btn.classList.remove("active"));
    currentActiveOption = null; // 重置当前活跃选项
});

// 将关闭按钮添加到设置弹窗
settingsPopup.appendChild(closeSettingsPopup);

// 点击空白处关闭设置弹窗
settingsOverlay.addEventListener("click", (event) => {
    if (event.target === settingsOverlay) {
        settingsOverlay.style.display = "none";
        settingsPopup.style.display = "none";
        document.body.classList.remove("no-scroll");
        currentActiveOption = null; // 重置当前活跃选项
    }
});

// 设置选项点击事件
characterManagement.addEventListener("click", () => {
    if (currentActiveOption === characterManagement) {
        return; // 如果当前已经在角色管理界面，则不响应
    }
    if (window.clearCharacterFilters) {
        window.clearCharacterFilters(); // 清除所有筛选状态
    }
    const container = window.loadCharacterManagement(); // 获取角色管理内容
    selectOption(characterManagement, "角色管理", container);
    currentActiveOption = characterManagement; // 更新当前活跃选项
});

characterHistory.addEventListener("click", () => {
    if (currentActiveOption === characterHistory) {
        return; // 如果当前已经在角色历史记录界面，则不响应
    }
    const historyContent = window.historyModule.getHistoryContent(); 
    selectOption(characterHistory, "角色历史记录", historyContent);
    currentActiveOption = characterHistory; // 更新当前活跃选项
});

eventManagement.addEventListener("click", () => {
    if (currentActiveOption === eventManagement) {
        return; // 如果当前已经在事件管理界面，则不响应
    }
    // 确保在加载内容前隐藏添加事件表单
    if (typeof window.eventManagement.setAddEventFormsVisibility === 'function') {
        window.eventManagement.setAddEventFormsVisibility(false, 0);
    }
    
    // 使用 events.js 模块中的事件管理功能
    const eventManagementContent = window.eventManagement.loadEventManagement();
    selectOption(eventManagement, "事件管理", eventManagementContent);
    currentActiveOption = eventManagement; // 更新当前活跃选项
    
    // 延时确保DOM已经更新，然后触发表格动画
    setTimeout(() => {
        const personalTableBody = document.getElementById('personalEventsTable');
        if (personalTableBody && typeof window.eventManagement.triggerTableAnimation === 'function') {
            window.eventManagement.triggerTableAnimation(personalTableBody);
        }
    }, 100);
});

eventHistory.addEventListener("click", () => {
    if (currentActiveOption === eventHistory) {
        return; // 如果当前已经在事件历史记录界面，则不响应
    }
    const eventHistoryContent = window.eventHistoryModule.getEventHistoryContent();
    selectOption(eventHistory, "事件历史记录", eventHistoryContent);
    currentActiveOption = eventHistory; // 更新当前活跃选项
});

moreSettings.addEventListener("click", () => {
    if (currentActiveOption === moreSettings) {
        return; // 如果当前已经在更多玩法设置界面，则不响应
    }
    // 强制更新团队数据
    if (window.teamManagement) {
        // 重新创建内容前先确保团队数据已经准备好
        window.teamManagement.loadTeamData();
    }
    
    const moreSettingsContent = window.teamManagement.createMoreSettingsContent();
    selectOption(moreSettings, "更多玩法设置", moreSettingsContent);
    currentActiveOption = moreSettings; // 更新当前活跃选项
    
    // 添加延时确保DOM已经更新
    setTimeout(() => {
        // 确保阵容列表组件已创建
        const teamListSection = document.getElementById('teamListSection');
        const teamList = document.getElementById('teamList');
        
        if (teamListSection && teamList) {
            // 强制重新生成阵容列表内容
            window.teamManagement.updateTeamList();
            
            // 然后根据当前模式状态决定显示或隐藏
            if (window.teamManagement.isTeamMode()) {
                teamListSection.style.display = 'block';
            }
        }
    }, 100);
});

gameSettings.addEventListener("click", () => {
    if (currentActiveOption === gameSettings) {
        return; // 如果当前已经在游戏设置界面，则不响应
    }
    
    // 创建游戏设置内容
    const container = createGameSettingsContent();
    
    // 显示游戏设置内容
    selectOption(gameSettings, "游戏设置", container);
    currentActiveOption = gameSettings; // 更新当前活跃选项
});

// 使用文档按钮点击事件
userDocumentation.addEventListener("click", () => {
    // 在新窗口中打开使用文档
    window.open('./documentation', '_blank');
});

// 方位抽取按钮点击事件
document.getElementById("directionExtractor").addEventListener("click", () => {
    // 在新窗口中打开方位抽取器
    window.open('./fangwei', '_blank');
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

    // 更新当前活跃选项
    currentActiveOption = button;
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

// 重抽次数设置相关的全局状态
window.rerollSettings = {
    enabled: true,           // 是否启用重抽次数功能
    enableZeroReset: false,  // 是否开启重抽归零（2%概率） - 默认关闭
    enableNegativeReroll: true  // 是否可抽到"重抽次数-1"
};

// 创建游戏设置内容
function createGameSettingsContent() {
    const container = document.createElement("div");
    container.className = "game-settings-container";
    container.style.cssText = `
        padding: 20px;
        max-width: 800px;
        margin: 0 auto;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border-radius: 15px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    `;

    // 重抽次数功能设置
    const rerollSection = createRerollSettingsSection();
    container.appendChild(rerollSection);

    // 分隔线
    const divider = document.createElement("div");
    divider.style.cssText = `
        height: 1px;
        background: rgba(255, 255, 255, 0.1);
        margin: 30px 0;
    `;
    container.appendChild(divider);

    // 重置游戏按钮
    const resetButton = document.createElement("button");
    resetButton.textContent = "重置游戏";
    resetButton.className = "reset-button";
    resetButton.style.cssText = `
        background: linear-gradient(135deg, #ff6b6b, #ee5a24);
        color: white;
        border: none;
        padding: 12px 24px;
        font-size: 16px;
        font-weight: bold;
        border-radius: 25px;
        cursor: pointer;
        box-shadow: 0 4px 15px rgba(238, 90, 36, 0.3);
        transition: all 0.3s ease;
        display: block;
        margin: 20px auto 0;
    `;
    
    resetButton.addEventListener("mouseover", () => {
        resetButton.style.transform = "translateY(-2px)";
        resetButton.style.boxShadow = "0 6px 20px rgba(238, 90, 36, 0.4)";
    });
    
    resetButton.addEventListener("mouseout", () => {
        resetButton.style.transform = "translateY(0)";
        resetButton.style.boxShadow = "0 4px 15px rgba(238, 90, 36, 0.3)";
    });
    
    resetButton.addEventListener("click", () => {
        if (confirm("确定要重置游戏吗？")) {
            window.resetGame();
            // 关闭设置弹窗
            settingsOverlay.style.display = "none";
            settingsPopup.style.display = "none";
            document.body.classList.remove("no-scroll");
        }
    });

    container.appendChild(resetButton);

    return container;
}

// 创建重抽次数设置区域
function createRerollSettingsSection() {
    const section = document.createElement("div");
    section.className = "reroll-settings-section";

    // 主开关设置
    const mainSetting = createMainRerollSetting();
    section.appendChild(mainSetting);

    // 二级设置菜单
    const subSettings = createRerollSubSettings();
    section.appendChild(subSettings);

    return section;
}

// 创建重抽次数主开关设置
function createMainRerollSetting() {
    const settingSection = document.createElement("div");
    settingSection.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        margin-bottom: 20px;
    `;

    const label = document.createElement("div");
    label.textContent = "重抽次数功能";
    label.style.cssText = `
        font-size: 18px;
        font-weight: bold;
        color: #fff;
        display: flex;
        align-items: center;
    `;

    // 添加图标
    const icon = document.createElement("span");
    icon.textContent = "🔄";
    icon.style.marginRight = "10px";
    label.insertBefore(icon, label.firstChild);

    const switchContainer = document.createElement("label");
    switchContainer.style.cssText = `
        position: relative;
        display: inline-block;
        width: 60px;
        height: 34px;
    `;

    const switchInput = document.createElement("input");
    switchInput.type = "checkbox";
    switchInput.checked = window.rerollSettings.enabled;
    switchInput.style.cssText = `
        opacity: 0;
        width: 0;
        height: 0;
    `;

    const slider = document.createElement("span");
    slider.style.cssText = `
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: ${switchInput.checked ? '#2196F3' : '#ccc'};
        transition: .4s;
        border-radius: 34px;
    `;

    const sliderDot = document.createElement("span");
    sliderDot.style.cssText = `
        position: absolute;
        content: "";
        height: 26px;
        width: 26px;
        left: ${switchInput.checked ? '30px' : '4px'};
        bottom: 4px;
        background-color: white;
        transition: .4s;
        border-radius: 50%;
    `;

    slider.appendChild(sliderDot);

    switchInput.addEventListener('change', (e) => {
        window.rerollSettings.enabled = e.target.checked;
        updateRerollUI();
        
        // 更新开关样式
        slider.style.backgroundColor = e.target.checked ? '#2196F3' : '#ccc';
        sliderDot.style.left = e.target.checked ? '30px' : '4px';
        
        // 更新二级设置的显示状态
        const subSettings = document.getElementById('rerollSubSettings');
        if (subSettings) {
            if (e.target.checked) {
                subSettings.style.maxHeight = subSettings.scrollHeight + 'px';
                subSettings.style.opacity = '1';
                subSettings.style.marginTop = '15px';
            } else {
                subSettings.style.maxHeight = '0';
                subSettings.style.opacity = '0';
                subSettings.style.marginTop = '0';
            }
        }
    });

    switchContainer.appendChild(switchInput);
    switchContainer.appendChild(slider);

    settingSection.appendChild(label);
    settingSection.appendChild(switchContainer);

    return settingSection;
}

// 创建重抽次数二级设置
function createRerollSubSettings() {
    const subSettings = document.createElement("div");
    subSettings.id = "rerollSubSettings";
    subSettings.style.cssText = `
        overflow: hidden;
        transition: all 0.3s ease;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 10px;
        padding: ${window.rerollSettings.enabled ? '15px' : '0'};
        max-height: ${window.rerollSettings.enabled ? 'none' : '0'};
        opacity: ${window.rerollSettings.enabled ? '1' : '0'};
        margin-top: ${window.rerollSettings.enabled ? '15px' : '0'};
    `;

    // 重抽归零设置
    const zeroResetSetting = createSubSetting(
        "🎯", 
        "可抽到重抽归零", 
        "概率变为有3%附加重抽归零，97%概率重抽+1/-1",
        window.rerollSettings.enableZeroReset,
        (checked) => {
            window.rerollSettings.enableZeroReset = checked;
        }
    );

    // 重抽-1设置  
    const negativeRerollSetting = createSubSetting(
        "➖", 
        "可抽到\"重抽次数-1\"", 
        "关闭后抽取到的全是+1",
        window.rerollSettings.enableNegativeReroll,
        (checked) => {
            window.rerollSettings.enableNegativeReroll = checked;
        }
    );

    subSettings.appendChild(zeroResetSetting);
    subSettings.appendChild(negativeRerollSetting);

    return subSettings;
}

// 创建二级设置项
function createSubSetting(icon, title, description, checked, onChange) {
    const setting = document.createElement("div");
    setting.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 12px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        margin-bottom: 12px;
    `;

    const leftContent = document.createElement("div");
    leftContent.style.cssText = `
        flex: 1;
        margin-right: 15px;
    `;

    const titleDiv = document.createElement("div");
    titleDiv.style.cssText = `
        font-size: 16px;
        font-weight: 600;
        color: #fff;
        margin-bottom: 5px;
        display: flex;
        align-items: center;
    `;
    titleDiv.innerHTML = `<span style="margin-right: 8px;">${icon}</span>${title}`;

    const descDiv = document.createElement("div");
    descDiv.textContent = description;
    descDiv.style.cssText = `
        font-size: 13px;
        color: rgba(255, 255, 255, 0.7);
        line-height: 1.4;
        text-align: left;
    `;

    leftContent.appendChild(titleDiv);
    leftContent.appendChild(descDiv);

    // 创建小尺寸开关
    const switchContainer = document.createElement("label");
    switchContainer.style.cssText = `
        position: relative;
        display: inline-block;
        width: 48px;
        height: 26px;
        flex-shrink: 0;
    `;

    const switchInput = document.createElement("input");
    switchInput.type = "checkbox";
    switchInput.checked = checked;
    switchInput.style.cssText = `
        opacity: 0;
        width: 0;
        height: 0;
    `;

    const slider = document.createElement("span");
    slider.style.cssText = `
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: ${switchInput.checked ? '#2196F3' : '#999'};
        transition: .3s;
        border-radius: 26px;
    `;

    const sliderDot = document.createElement("span");
    sliderDot.style.cssText = `
        position: absolute;
        content: "";
        height: 20px;
        width: 20px;
        left: ${switchInput.checked ? '25px' : '3px'};
        bottom: 3px;
        background-color: white;
        transition: .3s;
        border-radius: 50%;
    `;

    slider.appendChild(sliderDot);

    switchInput.addEventListener('change', (e) => {
        onChange(e.target.checked);
        
        // 更新开关样式
        slider.style.backgroundColor = e.target.checked ? '#2196F3' : '#999';
        sliderDot.style.left = e.target.checked ? '25px' : '3px';
    });

    switchContainer.appendChild(switchInput);
    switchContainer.appendChild(slider);

    setting.appendChild(leftContent);
    setting.appendChild(switchContainer);

    return setting;
}

// 更新重抽次数相关UI
function updateRerollUI() {
    const rerollCounter = document.getElementById('rerollCounter');
    
    if (window.rerollSettings.enabled) {
        if (rerollCounter) rerollCounter.style.display = 'block';
    } else {
        if (rerollCounter) rerollCounter.style.display = 'none';
    }
}

// 将函数导出到全局作用域
window.updateRerollUI = updateRerollUI;