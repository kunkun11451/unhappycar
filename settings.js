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
const redstoneTech = document.getElementById("redstoneTech");

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

// 赤石科技按钮点击事件
redstoneTech.addEventListener("click", () => {
    if (currentActiveOption === redstoneTech) {
        return; // 如果当前已经在赤石科技界面，则不响应
    }
    
    // 创建赤石科技内容
    const container = createRedstoneTechContent();
    
    // 显示赤石科技内容
    selectOption(redstoneTech, " ", container);
    currentActiveOption = redstoneTech; // 更新当前活跃选项
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

// 创建赤石科技内容
function createRedstoneTechContent() {
    const container = document.createElement("div");
    container.className = "redstone-tech-container";
    container.style.cssText = `
        padding: 20px;
        max-width: 800px;
        margin: 0 auto;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border-radius: 15px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        text-align: center;
    `;

    // 标题
    const title = document.createElement("h2");
    title.textContent = "赤石科技合集";
    title.style.cssText = `
        color: #fff;
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 20px;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
    `;
    container.appendChild(title);

    // 按钮容器
    const buttonContainer = document.createElement("div");
    buttonContainer.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin-top: 20px;
    `;

    // 创建跳转到unhappycar文件夹下其他项目的按钮
    const projects = [
        { name: "拼好图（y7）", file: "y7" },
        { name: "拼好车", file: "pinhaoche" },
        { name: "赤石3",},
        { name: "赤石4", },
        { name: "赤石5", },
        { name: "赤石6", }
    ];

    projects.forEach(project => {
        const button = document.createElement("button");
        button.textContent = project.name;
        button.style.cssText = `
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
            padding: 12px 20px;
            font-size: 14px;
            font-weight: bold;
            border-radius: 25px;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            transition: all 0.3s ease;
            white-space: nowrap;
        `;
        
        button.addEventListener("mouseover", () => {
            button.style.transform = "translateY(-2px)";
            button.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.3)";
            button.style.background = "rgba(255, 255, 255, 0.25)";
            button.style.borderColor = "rgba(255, 255, 255, 0.3)";
        });
        
        button.addEventListener("mouseout", () => {
            button.style.transform = "translateY(0)";
            button.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.2)";
            button.style.background = "rgba(255, 255, 255, 0.15)";
            button.style.borderColor = "rgba(255, 255, 255, 0.2)";
        });
        
        button.addEventListener("click", () => {
            window.open(`./${project.file}`, '_blank');
        });

        buttonContainer.appendChild(button);
    });

    container.appendChild(buttonContainer);

    // 赤石开关设置
    const switchContainer = document.createElement("div");
    switchContainer.style.cssText = `
        margin-top: 20px;
        padding: 15px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 15px;
    `;

    const switchLabel = document.createElement("label");
    switchLabel.textContent = "赤石背景";
    switchLabel.style.cssText = `
        color: white;
        font-size: 16px;
        font-weight: bold;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
    `;

    const switchInput = document.createElement("input");
    switchInput.type = "checkbox";
    switchInput.id = "redstoneBgSwitch";
    switchInput.style.cssText = `
        width: 50px;
        height: 25px;
        appearance: none;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 25px;
        position: relative;
        cursor: pointer;
        transition: all 0.3s ease;
        border: 2px solid rgba(255, 255, 255, 0.3);
    `;

    // 创建开关滑块
    const switchSlider = document.createElement("div");
    switchSlider.style.cssText = `
        position: absolute;
        top: 1px;
        left: 1px;
        width: 21px;
        height: 21px;
        background: white;
        border-radius: 50%;
        transition: transform 0.3s ease;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    `;
    switchInput.appendChild(switchSlider);

    // 检查本地存储中的设置
    const isRedstoneBgEnabled = localStorage.getItem('redstoneBgEnabled') === 'true';
    switchInput.checked = isRedstoneBgEnabled;
    if (isRedstoneBgEnabled) {
        switchInput.style.background = "rgba(255, 100, 100, 0.6)";
        switchSlider.style.transform = "translateX(25px)";
        applyRedstoneBackground();
    }

    switchInput.addEventListener("change", () => {
        if (switchInput.checked) {
            switchInput.style.background = "rgba(255, 100, 100, 0.6)";
            switchSlider.style.transform = "translateX(25px)";
            localStorage.setItem('redstoneBgEnabled', 'true');
            applyRedstoneBackground();
        } else {
            switchInput.style.background = "rgba(255, 255, 255, 0.2)";
            switchSlider.style.transform = "translateX(0)";
            localStorage.setItem('redstoneBgEnabled', 'false');
            removeRedstoneBackground();
        }
    });

    switchContainer.appendChild(switchLabel);
    switchContainer.appendChild(switchInput);
    container.appendChild(switchContainer);

    // 石上加石二级开关（动画效果）
    const animationSwitchContainer = document.createElement("div");
    animationSwitchContainer.id = "animationSwitchContainer";
    animationSwitchContainer.style.cssText = `
        margin-top: 15px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        display: ${isRedstoneBgEnabled ? 'flex' : 'none'};
        align-items: center;
        justify-content: center;
        gap: 12px;
        transition: all 0.3s ease;
        opacity: ${isRedstoneBgEnabled ? '1' : '0'};
        max-height: ${isRedstoneBgEnabled ? '60px' : '0'};
        overflow: hidden;
    `;

    const animationLabel = document.createElement("label");
    animationLabel.textContent = "石上加石";
    animationLabel.style.cssText = `
        color: rgba(255, 255, 255, 0.9);
        font-size: 14px;
        font-weight: 600;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
    `;

    const animationInput = document.createElement("input");
    animationInput.type = "checkbox";
    animationInput.id = "redstoneAnimationSwitch";
    animationInput.style.cssText = `
        width: 40px;
        height: 20px;
        appearance: none;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 20px;
        position: relative;
        cursor: pointer;
        transition: all 0.3s ease;
        border: 1px solid rgba(255, 255, 255, 0.3);
    `;

    // 创建动画开关滑块
    const animationSlider = document.createElement("div");
    animationSlider.style.cssText = `
        position: absolute;
        top: 1px;
        left: 1px;
        width: 16px;
        height: 16px;
        background: white;
        border-radius: 50%;
        transition: transform 0.3s ease;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    `;
    animationInput.appendChild(animationSlider);

    // 检查本地存储中的动画设置
    const isAnimationEnabled = localStorage.getItem('redstoneAnimationEnabled') === 'true';
    animationInput.checked = isAnimationEnabled;
    if (isAnimationEnabled && isRedstoneBgEnabled) {
        animationInput.style.background = "rgba(100, 255, 100, 0.6)";
        animationSlider.style.transform = "translateX(18px)";
        applyRedstoneAnimation();
    }

    animationInput.addEventListener("change", () => {
        if (animationInput.checked) {
            animationInput.style.background = "rgba(100, 255, 100, 0.6)";
            animationSlider.style.transform = "translateX(18px)";
            localStorage.setItem('redstoneAnimationEnabled', 'true');
            if (isRedstoneBgEnabled) {
                applyRedstoneAnimation();
            }
        } else {
            animationInput.style.background = "rgba(255, 255, 255, 0.2)";
            animationSlider.style.transform = "translateX(0)";
            localStorage.setItem('redstoneAnimationEnabled', 'false');
            removeRedstoneAnimation();
        }
    });

    // 更新主开关的事件监听器，控制二级开关的显示
    const originalChangeHandler = switchInput.onchange;
    switchInput.addEventListener("change", () => {
        const isEnabled = switchInput.checked;
        
        if (isEnabled) {
            // 显示二级开关
            animationSwitchContainer.style.display = 'flex';
            setTimeout(() => {
                animationSwitchContainer.style.opacity = '1';
                animationSwitchContainer.style.maxHeight = '60px';
            }, 10);
            
            // 如果动画开关也打开，应用动画
            if (animationInput.checked) {
                applyRedstoneAnimation();
            }
        } else {
            // 隐藏二级开关
            animationSwitchContainer.style.opacity = '0';
            animationSwitchContainer.style.maxHeight = '0';
            setTimeout(() => {
                animationSwitchContainer.style.display = 'none';
            }, 300);
            
            // 移除动画
            removeRedstoneAnimation();
        }
    });

    animationSwitchContainer.appendChild(animationLabel);
    animationSwitchContainer.appendChild(animationInput);
    container.appendChild(animationSwitchContainer);

    // 说明文字
    const description = document.createElement("div");
    description.style.cssText = `
        margin-top: 25px;
        padding: 15px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 10px;
        color: rgba(255, 255, 255, 0.8);
        font-size: 14px;
        line-height: 1.6;
    `;
    description.innerHTML = `
        <p><img src="https://qqchannel-profile-1251316161.file.myqcloud.com/1743573692859791383709823694776879526411409/140?=1743573693" alt="赤石科技" style="width: 35px; height: 35px; border-radius: 50%; margin-right: 8px; vertical-align: middle;">@你看到我的朋友嘟嘟可了吗，的赤石抽象科技，这里的内容和此网站没有关系。</p>
        <img src="https://upload-bbs.miyoushe.com/upload/2025/01/25/363839390/ceb4acae51995eb8189fabeff82cca55_2322181693803859851.png" alt="赤石科技合集" style="max-width: 20%"; height: auto; border-radius: 10px; margin-top: 15px;">
    `;
    
    container.appendChild(description);

    // 投稿按钮
    const submitButton = document.createElement("button");
    submitButton.textContent = "📝 投稿赤石科技";
    submitButton.style.cssText = `
        margin-top: 20px;
        background: rgba(255, 255, 255, 0.15);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        padding: 15px 30px;
        font-size: 16px;
        font-weight: bold;
        border-radius: 25px;
        cursor: pointer;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        transition: all 0.3s ease;
        display: none;
        margin-left: auto;
        margin-right: auto;
        min-width: 200px;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
    `;
    
    submitButton.addEventListener("mouseover", () => {
        submitButton.style.transform = "translateY(-2px)";
        submitButton.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.3)";
        submitButton.style.background = "rgba(255, 255, 255, 0.25)";
        submitButton.style.borderColor = "rgba(255, 255, 255, 0.3)";
    });
    
    submitButton.addEventListener("mouseout", () => {
        submitButton.style.transform = "translateY(0)";
        submitButton.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.2)";
        submitButton.style.background = "rgba(255, 255, 255, 0.15)";
        submitButton.style.borderColor = "rgba(255, 255, 255, 0.2)";
    });
    
    submitButton.addEventListener("click", () => {
        showSubmissionModal();
    });

    container.appendChild(submitButton);

    return container;
}

// 赤石背景控制函数
function applyRedstoneBackground() {
    document.body.style.backgroundImage = `url('https://upload-bbs.miyoushe.com/upload/2024/06/29/273489775/4be47bf1376bfb4f69c1e3fe26c8a8e8_8119842655567179283.png')`;
    document.body.style.backgroundSize = '50px 50px';
    document.body.style.backgroundRepeat = 'repeat';
    document.body.style.backgroundAttachment = 'fixed';
    
    // 检查是否需要应用动画
    const isAnimationEnabled = localStorage.getItem('redstoneAnimationEnabled') === 'true';
    if (isAnimationEnabled) {
        applyRedstoneAnimation();
    }
}

function removeRedstoneBackground() {
    document.body.style.backgroundImage = '';
    document.body.style.backgroundSize = '';
    document.body.style.backgroundRepeat = '';
    document.body.style.backgroundAttachment = '';
    removeRedstoneAnimation();
}

// 赤石动画控制函数
function applyRedstoneAnimation() {
    // 创建CSS动画样式
    let styleElement = document.getElementById('redstoneAnimationStyle');
    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'redstoneAnimationStyle';
        document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = `
        @keyframes redstoneSlide {
            from {
                background-position: 0px 0px;
            }
            to {
                background-position: -50px -50px;
            }
        }
        
        body {
            animation: redstoneSlide 3s linear infinite !important;
        }
    `;
}

function removeRedstoneAnimation() {
    const styleElement = document.getElementById('redstoneAnimationStyle');
    if (styleElement) {
        styleElement.remove();
    }
    
    // 移除动画属性
    document.body.style.animation = '';
}

// 页面加载时检查设置
document.addEventListener('DOMContentLoaded', function() {
    const isRedstoneBgEnabled = localStorage.getItem('redstoneBgEnabled') === 'true';
    const isAnimationEnabled = localStorage.getItem('redstoneAnimationEnabled') === 'true';
    
    if (isRedstoneBgEnabled) {
        applyRedstoneBackground();
        
        // 如果动画也启用，应用动画效果
        if (isAnimationEnabled) {
            applyRedstoneAnimation();
        }
    }
});

// 投稿弹窗功能
function showSubmissionModal() {
    // 创建遮罩层
    const overlay = document.createElement("div");
    overlay.id = "submissionOverlay";
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(5px);
        z-index: 10000;
        display: flex;
        justify-content: center;
        align-items: center;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;

    // 创建弹窗
    const modal = document.createElement("div");
    modal.style.cssText = `
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(20px);
        border-radius: 20px;
        padding: 30px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.2);
        transform: scale(0.8);
        transition: transform 0.3s ease;
        position: relative;
    `;

    // 标题
    const title = document.createElement("h2");
    title.textContent = "📝 投稿赤石科技";
    title.style.cssText = `
        color: white;
        text-align: center;
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 20px;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
    `;
    modal.appendChild(title);

    // 关闭按钮
    const closeButton = document.createElement("button");
    closeButton.innerHTML = "✕";
    closeButton.style.cssText = `
        position: absolute;
        top: 15px;
        right: 15px;
        background: rgba(255, 255, 255, 0.15);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        font-size: 18px;
        font-weight: bold;
        width: 35px;
        height: 35px;
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    closeButton.addEventListener("mouseover", () => {
        closeButton.style.background = "rgba(255, 255, 255, 0.25)";
        closeButton.style.transform = "rotate(90deg) scale(1.1)";
        closeButton.style.borderColor = "rgba(255, 255, 255, 0.3)";
    });

    closeButton.addEventListener("mouseout", () => {
        closeButton.style.background = "rgba(255, 255, 255, 0.15)";
        closeButton.style.transform = "rotate(0deg) scale(1)";
        closeButton.style.borderColor = "rgba(255, 255, 255, 0.2)";
    });

    closeButton.addEventListener("click", () => {
        hideSubmissionModal();
    });

    modal.appendChild(closeButton);

    // 创建表单
    const form = document.createElement("form");
    form.id = "submissionForm";

    // 频道昵称输入
    const nicknameLabel = document.createElement("label");
    nicknameLabel.textContent = "频道昵称";
    nicknameLabel.style.cssText = `
        display: block;
        color: white;
        font-weight: bold;
        margin-bottom: 8px;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
    `;

    const nicknameInput = document.createElement("input");
    nicknameInput.type = "text";
    nicknameInput.id = "channelNickname";
    nicknameInput.required = true;
    nicknameInput.placeholder = "请输入您的频道昵称";
    nicknameInput.style.cssText = `
        width: 100%;
        padding: 12px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        color: white;
        font-size: 14px;
        margin-bottom: 20px;
        box-sizing: border-box;
        transition: all 0.3s ease;
    `;

    nicknameInput.addEventListener("focus", () => {
        nicknameInput.style.borderColor = "rgba(255, 255, 255, 0.4)";
        nicknameInput.style.background = "rgba(255, 255, 255, 0.15)";
        nicknameInput.style.boxShadow = "0 4px 15px rgba(255, 255, 255, 0.1)";
    });

    nicknameInput.addEventListener("blur", () => {
        nicknameInput.style.borderColor = "rgba(255, 255, 255, 0.2)";
        nicknameInput.style.background = "rgba(255, 255, 255, 0.1)";
        nicknameInput.style.boxShadow = "none";
    });

    // 想法输入
    const thoughtLabel = document.createElement("label");
    thoughtLabel.textContent = "你的想法";
    thoughtLabel.style.cssText = `
        display: block;
        color: white;
        font-weight: bold;
        margin-bottom: 8px;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
    `;

    const thoughtTextarea = document.createElement("textarea");
    thoughtTextarea.id = "userThought";
    thoughtTextarea.required = true;
    thoughtTextarea.placeholder = "请分享您的抽象想法，我们会尽量实现并添加到此处";
    thoughtTextarea.style.cssText = `
        width: 100%;
        height: 120px;
        padding: 12px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        color: white;
        font-size: 14px;
        margin-bottom: 25px;
        box-sizing: border-box;
        resize: vertical;
        min-height: 80px;
        transition: all 0.3s ease;
        font-family: inherit;
    `;

    thoughtTextarea.addEventListener("focus", () => {
        thoughtTextarea.style.borderColor = "rgba(255, 255, 255, 0.4)";
        thoughtTextarea.style.background = "rgba(255, 255, 255, 0.15)";
        thoughtTextarea.style.boxShadow = "0 4px 15px rgba(255, 255, 255, 0.1)";
    });

    thoughtTextarea.addEventListener("blur", () => {
        thoughtTextarea.style.borderColor = "rgba(255, 255, 255, 0.2)";
        thoughtTextarea.style.background = "rgba(255, 255, 255, 0.1)";
        thoughtTextarea.style.boxShadow = "none";
    });

    // 按钮容器
    const buttonContainer = document.createElement("div");
    buttonContainer.style.cssText = `
        display: flex;
        gap: 15px;
        justify-content: center;
    `;

    // 提交按钮
    const submitBtn = document.createElement("button");
    submitBtn.type = "submit";
    submitBtn.textContent = "🚀 提交投稿";
    submitBtn.style.cssText = `
        background: rgba(255, 255, 255, 0.15);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        padding: 12px 25px;
        font-size: 16px;
        font-weight: bold;
        border-radius: 25px;
        cursor: pointer;
        transition: all 0.3s ease;
        min-width: 140px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    `;

    submitBtn.addEventListener("mouseover", () => {
        submitBtn.style.background = "rgba(255, 255, 255, 0.25)";
        submitBtn.style.transform = "translateY(-2px)";
        submitBtn.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.3)";
        submitBtn.style.borderColor = "rgba(255, 255, 255, 0.3)";
    });

    submitBtn.addEventListener("mouseout", () => {
        submitBtn.style.background = "rgba(255, 255, 255, 0.15)";
        submitBtn.style.transform = "translateY(0)";
        submitBtn.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.2)";
        submitBtn.style.borderColor = "rgba(255, 255, 255, 0.2)";
    });

    // 取消按钮
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = "❌ 取消";
    cancelBtn.style.cssText = `
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        padding: 12px 25px;
        font-size: 16px;
        font-weight: bold;
        border-radius: 25px;
        cursor: pointer;
        transition: all 0.3s ease;
        min-width: 140px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    `;

    cancelBtn.addEventListener("mouseover", () => {
        cancelBtn.style.background = "rgba(255, 255, 255, 0.2)";
        cancelBtn.style.transform = "translateY(-2px)";
        cancelBtn.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.2)";
        cancelBtn.style.borderColor = "rgba(255, 255, 255, 0.3)";
    });

    cancelBtn.addEventListener("mouseout", () => {
        cancelBtn.style.background = "rgba(255, 255, 255, 0.1)";
        cancelBtn.style.transform = "translateY(0)";
        cancelBtn.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.1)";
        cancelBtn.style.borderColor = "rgba(255, 255, 255, 0.2)";
    });

    cancelBtn.addEventListener("click", () => {
        hideSubmissionModal();
    });

    // 组装表单
    form.appendChild(nicknameLabel);
    form.appendChild(nicknameInput);
    form.appendChild(thoughtLabel);
    form.appendChild(thoughtTextarea);
    
    buttonContainer.appendChild(submitBtn);
    buttonContainer.appendChild(cancelBtn);
    form.appendChild(buttonContainer);

    modal.appendChild(form);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // 动画显示
    setTimeout(() => {
        overlay.style.opacity = "1";
        modal.style.transform = "scale(1)";
    }, 10);

    // 表单提交处理
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const nickname = nicknameInput.value.trim();
        const thought = thoughtTextarea.value.trim();

        if (!nickname || !thought) {
            showMessage("请填写完整信息", "error");
            return;
        }

        // 提交数据到服务器
        try {
            submitBtn.textContent = "⏳ 提交中...";
            submitBtn.disabled = true;

            // 检测投稿服务器地址
            const submissionServerUrl = window.location.hostname === 'localhost' 
                ? 'http://localhost:3001' 
                : `${window.location.protocol}//${window.location.hostname}:3001`;

            const response = await fetch(`${submissionServerUrl}/api/submit-redstone-tech`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    nickname: nickname,
                    thought: thought,
                    timestamp: new Date().toISOString()
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                showMessage(result.message || "投稿提交成功！感谢您的分享！", "success");
                hideSubmissionModal();
            } else {
                throw new Error(result.error || '提交失败');
            }
        } catch (error) {
            console.error('提交投稿时出错:', error);
            showMessage("提交失败，请稍后重试", "error");
        } finally {
            submitBtn.textContent = "🚀 提交投稿";
            submitBtn.disabled = false;
        }
    });

    // 点击遮罩层关闭
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
            hideSubmissionModal();
        }
    });

    // ESC键关闭
    const handleEsc = (e) => {
        if (e.key === "Escape") {
            hideSubmissionModal();
            document.removeEventListener("keydown", handleEsc);
        }
    };
    document.addEventListener("keydown", handleEsc);
}

function hideSubmissionModal() {
    const overlay = document.getElementById("submissionOverlay");
    if (overlay) {
        const modal = overlay.querySelector("div");
        overlay.style.opacity = "0";
        modal.style.transform = "scale(0.8)";
        
        setTimeout(() => {
            overlay.remove();
        }, 300);
    }
}

// 消息提示函数
function showMessage(message, type = "info") {
    const messageDiv = document.createElement("div");
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 15px;
        color: white;
        font-weight: bold;
        z-index: 10001;
        backdrop-filter: blur(15px);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        transform: translateX(400px);
        transition: transform 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
    `;

    if (type === "success") {
        messageDiv.style.background = "rgba(100, 255, 100, 0.2)";
        messageDiv.style.border = "1px solid rgba(100, 255, 100, 0.3)";
    } else if (type === "error") {
        messageDiv.style.background = "rgba(255, 100, 100, 0.2)";
        messageDiv.style.border = "1px solid rgba(255, 100, 100, 0.3)";
    } else {
        messageDiv.style.background = "rgba(100, 150, 255, 0.2)";
        messageDiv.style.border = "1px solid rgba(100, 150, 255, 0.3)";
    }

    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);

    // 动画显示
    setTimeout(() => {
        messageDiv.style.transform = "translateX(0)";
    }, 10);

    // 自动隐藏
    setTimeout(() => {
        messageDiv.style.transform = "translateX(400px)";
        setTimeout(() => {
            messageDiv.remove();
        }, 300);
    }, 3000);
}