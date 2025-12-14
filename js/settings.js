document.addEventListener('DOMContentLoaded', () => {
    // 获取设置按钮和弹窗相关元素
    const settingsButton = document.getElementById("settingsButton");
    const initialSettingsButton = document.getElementById("initialSettingsButton");
    const settingsOverlay = document.getElementById("settingsOverlay");
    const settingsPopup = document.getElementById("settingsPopup");
    const settingsTitle = document.getElementById("settingsTitle");
    const settingsDetails = document.getElementById("settingsDetails");

    const viewHistoryButton = document.getElementById("viewHistoryButton");

    // 设置选项按钮
    const characterManagement = document.getElementById("characterManagement");
    const characterHistory = document.getElementById("characterHistory");
    const eventManagement = document.getElementById("eventManagement");
    const sharedEvents = document.getElementById("sharedEvents");
    const eventHistory = document.getElementById("eventHistory");
    const moreSettings = document.getElementById("moreSettings");
    const gameSettings = document.getElementById("gameSettings");
    const userDocumentation = document.getElementById("userDocumentation");
    const redstoneTech = document.getElementById("redstoneTech");

    // 跟踪当前活跃的选项
    let currentActiveOption = null;

    // 打开设置弹窗
    const openSettingsPopup = () => {
        // 进入设置时断开多人游戏WebSocket连接
        disconnectMultiplayerWebSocket();
        
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
    };

    if (settingsButton) {
        settingsButton.addEventListener("click", openSettingsPopup);
    }
    if (initialSettingsButton) {
        initialSettingsButton.addEventListener("click", openSettingsPopup);
    }

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
    if (settingsPopup) {
        settingsPopup.appendChild(closeSettingsPopup);
    }

    // 点击空白处关闭设置弹窗
    if (settingsOverlay) {
        settingsOverlay.addEventListener("click", (event) => {
            if (event.target === settingsOverlay) {
                settingsOverlay.style.display = "none";
                settingsPopup.style.display = "none";
                document.body.classList.remove("no-scroll");
                currentActiveOption = null; // 重置当前活跃选项
            }
        });
    }

    // 设置选项点击事件
    if(characterManagement) {
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
    }

    if(characterHistory) {
        characterHistory.addEventListener("click", () => {
            if (currentActiveOption === characterHistory) {
                return; // 如果当前已经在角色历史记录界面，则不响应
            }
            const historyContent = window.historyModule.getHistoryContent(); 
            selectOption(characterHistory, "角色历史记录", historyContent);
            currentActiveOption = characterHistory; // 更新当前活跃选项
        });
    }

    if(eventManagement) {
        eventManagement.addEventListener("click", () => {
            if (currentActiveOption === eventManagement) {
                return; // 如果当前已经在事件管理界面，则不响应
            }
            // 使用 events.js 模块中的事件管理功能
            const eventManagementContent = window.eventManagement.loadEventManagement();
            selectOption(eventManagement, "事件管理", eventManagementContent);
            currentActiveOption = eventManagement; // 更新当前活跃选项

        });
    }

    if(sharedEvents) {
        sharedEvents.addEventListener("click", () => {
            if (currentActiveOption === sharedEvents) {
                return;
            }
            // The sharedEvents module now generates content instead of a modal
            if (window.sharedEvents && typeof window.sharedEvents.renderUserView === 'function') {
                // Request the libraries first
                if (typeof window.sharedEvents.requestSharedLibraries === 'function') {
                    window.sharedEvents.requestSharedLibraries();
                }

                // Create a container for the content
                const container = document.createElement('div');
                container.id = 'sharedEventsContainer'; // Add an ID for styling if needed
                container.style.height = '100%';
                
                selectOption(sharedEvents, "事件创意工坊", container);
                
                // Call the render function which populates the container
                window.sharedEvents.renderUserView(container);
                currentActiveOption = sharedEvents;
            } else {
                console.error('sharedEvents module or renderUserView function not found.');
            }
        });
    }

    if(eventHistory) {
        eventHistory.addEventListener("click", () => {
            if (currentActiveOption === eventHistory) {
                return; // 如果当前已经在事件历史记录界面，则不响应
            }
            const eventHistoryContent = window.eventHistoryModule.getEventHistoryContent();
            selectOption(eventHistory, "事件历史记录", eventHistoryContent);
            currentActiveOption = eventHistory; // 更新当前活跃选项
        });
    }

    if (viewHistoryButton) {
        viewHistoryButton.addEventListener("click", () => {
            // 使用新的历史记录弹窗管理器
            if (window.historyModalManager) {
                window.historyModalManager.show();
            }
        });
    }

    if(moreSettings) {
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
    }

    if(gameSettings) {
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
    }

    // 使用文档按钮点击事件
    if(userDocumentation) {
        userDocumentation.addEventListener("click", () => {
            // 在新窗口中打开使用文档
            window.open('./docs', '_blank');
        });
    }

    // 赤石科技按钮点击事件
    if(redstoneTech) {
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
    }

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

    if (settingsPopup) {
        settingsPopup.appendChild(burgerLabel); // 将汉堡菜单按钮添加到弹窗内部
    }

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

        // 主题设置
        if (window.themeToggle) {
            const themeSection = window.themeToggle.createThemeToggleUI();
            container.appendChild(themeSection);

            // 分隔线
            const themeDivider = document.createElement("div");
            themeDivider.style.cssText = `
                height: 1px;
                background: rgba(255, 255, 255, 0.1);
                margin: 30px 0;
            `;
            container.appendChild(themeDivider);
        }

        // 自定义服务器URL设置
        const serverSection = createServerSettingsSection();
        container.appendChild(serverSection);

        // 分隔线
        const divider1 = document.createElement("div");
        divider1.style.cssText = `
            height: 1px;
            background: rgba(255, 255, 255, 0.1);
            margin: 30px 0;
        `;
        container.appendChild(divider1);

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

    // 创建自定义服务器设置区域
    function createServerSettingsSection() {
        const section = document.createElement("div");
        section.className = "server-settings-section";

        const title = document.createElement("div");
        title.textContent = "自定义服务器";
        title.style.cssText = `
            font-size: 18px;
            font-weight: bold;
            color: #fff;
            display: flex;
            align-items: center;
            margin-bottom: 15px;
        `;
        const icon = document.createElement("span");
        icon.textContent = "⚙️";
        icon.style.marginRight = "10px";
        title.insertBefore(icon, title.firstChild);
        section.appendChild(title);

        const inputContainer = document.createElement("div");
        inputContainer.style.display = "flex";
        inputContainer.style.gap = "10px";

        const protocolButton = document.createElement("button");
        let currentProtocol = localStorage.getItem('customWsProtocol') || 'wss://';
        protocolButton.innerHTML = `🔄${currentProtocol} <span style="font-size: 10px; vertical-align: middle;"></span>`;
        protocolButton.style.cssText = `
            padding: 12px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 12px 0 0 12px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-right: none;
            color: #fff;
            cursor: pointer;
            font-weight: bold;
            transition: background 0.3s;
        `;
        protocolButton.addEventListener('mouseover', () => {
            protocolButton.style.background = 'rgba(255, 255, 255, 0.1)';
        });
        protocolButton.addEventListener('mouseout', () => {
            protocolButton.style.background = 'rgba(0, 0, 0, 0.2)';
        });
        protocolButton.addEventListener('click', () => {
            currentProtocol = currentProtocol === 'wss://' ? 'ws://' : 'wss://';
            protocolButton.innerHTML = `🔄${currentProtocol} <span style="font-size: 10px; vertical-align: middle;"></span>`;
            localStorage.setItem('customWsProtocol', currentProtocol);
            
            const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const warningMessage = document.getElementById('ws-warning-message');
            if (currentProtocol === 'ws://' && !isLocalDev) {
                if (!warningMessage) {
                    const warning = document.createElement('div');
                    warning.id = 'ws-warning-message';
                    warning.textContent = "警告：(ws://)连接仅适用于本地网页，可能无法正常工作。";
                    warning.style.cssText = `
                        color: #ffcc00;
                        font-size: 13px;
                        margin-top: 10px;
                        text-align: center;
                    `;
                    section.appendChild(warning);
                }
            } else {
                if (warningMessage) {
                    warningMessage.remove();
                }
            }
        });
        inputContainer.appendChild(protocolButton);

        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = "your-server.com(:port) (留空保存后使用默认服务器)";
        input.id = "customServerUrlInput";
        const savedUrl = localStorage.getItem('customWsUrl') || '';
        const savedProto = localStorage.getItem('customWsProtocol') || 'wss://';
        input.value = savedUrl.startsWith(savedProto) ? savedUrl.substring(savedProto.length) : savedUrl;
        input.style.cssText = `
            flex-grow: 1;
            padding: 12px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 0 12px 12px 0;
            background: rgba(255, 255, 255, 0.3);
            backdrop-filter: blur(10px);
            color: white;
            font-size: 14px;
            border-left: none;
        `;
        inputContainer.appendChild(input);

        const saveButton = document.createElement("button");
        saveButton.textContent = "保存";
        saveButton.style.cssText = `
            padding: 0 20px;
            background: #2196F3;
            color: white;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            font-weight: bold;
            transition: background 0.3s;
        `;
        saveButton.addEventListener('click', () => {
            const urlPart = input.value.trim();
            if (urlPart) {
                const fullUrl = currentProtocol + urlPart;
                localStorage.setItem('customWsUrl', fullUrl);
                localStorage.setItem('customWsProtocol', currentProtocol);
                showMessage("自定义服务器地址已保存！请刷新页面以生效。", "success");
            } else {
                localStorage.removeItem('customWsUrl');
                localStorage.removeItem('customWsProtocol');
                showMessage("已清除自定义服务器地址。将使用默认地址。请刷新页面以生效。", "info");
            }
        });
        
        saveButton.addEventListener("mouseover", () => {
            saveButton.style.background = "#1976D2";
        });
        
        saveButton.addEventListener("mouseout", () => {
            saveButton.style.background = "#2196F3";
        });

        inputContainer.appendChild(saveButton);
        
        section.appendChild(inputContainer);

        const tutorialLink = document.createElement("a");
        tutorialLink.textContent = "搭建服务器教程";
        tutorialLink.href = "./docs/#/server-deployment"; 
        tutorialLink.target = "_blank";
        tutorialLink.style.cssText = `
            display: block;
            margin-top: 15px;
            color: #00ff11ff;
            text-decoration: none;
            font-size: 14px;
            text-align: center;
        `;
        section.appendChild(tutorialLink);

        return section;
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
            { name: "拼好图", file: "pinhaotu" },
            { name: "方位抽取器", file: "fangwei"},
            { name: "选角禁技", file: "xjjj"},
            { name: "表情包编辑", file: "pt"},
            { name: "史镶金随机数生成器", file: "dice" },
            { name: "随机ban位抽取", file: "recorder"},
            { name: "自动BP记录器", url: "https://unhappycar.tech/" },
            { name: "赤石8",},
            { name: "赤石9",}
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
                if (project.url) {
                    window.open(project.url, '_blank');
                } else if (project.file) {
                    window.open(`./${project.file}`, '_blank');
                }
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
            <p>@？？？的赤石抽象科技，这里的内容和此网站没有关系。</p>
            <img src="https://upload-bbs.miyoushe.com/upload/2025/01/25/363839390/ceb4acae51995eb8189fabeff82cca55_2322181693803859851.png" alt="赤石科技合集" style="max-width: 20%"; height: auto; border-radius: 10px; margin-top: 15px;">
        `;
        
        container.appendChild(description);

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

    // 将消息提示函数和WebSocket连接管理函数移到外部，以便复用
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

    // WebSocket连接管理函数
    async function ensureWebSocketConnection() {
        return new Promise((resolve, reject) => {
            // 检查app.js中主WebSocket连接
            if (window.ws && window.ws.readyState === WebSocket.OPEN) {
                console.log('Using main WebSocket connection.');
                resolve(window.ws);
                return;
            }
            
            // 检查多人游戏连接
            if (window.multiplayerManager && window.multiplayerManager.isConnected()) {
                console.log('Using multiplayer WebSocket connection.');
                resolve(window.multiplayerManager.getWebSocket());
                return;
            }

            // 检查已有的临时连接
            if (window.tempWs && window.tempWs.readyState === WebSocket.OPEN) {
                console.log('Using existing temporary WebSocket connection.');
                resolve(window.tempWs);
                return;
            }

            // 创建新的临时连接
            const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const wsUrl = isLocalDev ? 'ws://127.0.0.1:3000' : 'wss://unhappycar.tech:3000';
            
            console.log('Creating new temporary WebSocket connection:', wsUrl);
            
            window.tempWs = new WebSocket(wsUrl);
            
            const connectionTimeout = setTimeout(() => {
                window.tempWs.close();
                reject(new Error('WebSocket connection timed out.'));
            }, 5000);

            window.tempWs.onopen = () => {
                clearTimeout(connectionTimeout);
                console.log('Temporary WebSocket connection successful.');
                
                // 临时连接也需要能处理消息
                window.tempWs.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    // 主ws连接断开时,临时ws连接也能收到消息并处理
                    if (window.sharedEvents && typeof window.sharedEvents.handleMessage === 'function') {
                        window.sharedEvents.handleMessage(data);
                    }
                };
                
                resolve(window.tempWs);
            };

            window.tempWs.onerror = (error) => {
                clearTimeout(connectionTimeout);
                console.error('Temporary WebSocket connection error:', error);
                reject(error);
            };

            window.tempWs.onclose = () => {
                console.log('Temporary WebSocket connection closed.');
                window.tempWs = null; // 清理
            };
        });
    }
    // 暴露到全局
    window.ensureWebSocketConnection = ensureWebSocketConnection;



    // 进入设置页面时的处理（现在不需要断开连接，因为投稿会复用现有连接）
    function disconnectMultiplayerWebSocket() {
        if (window.multiplayerManager && typeof window.multiplayerManager.isConnected === 'function' && window.multiplayerManager.isConnected()) {
            // console.log('进入设置页面，保持多人游戏WebSocket连接以供投稿功能使用');
            
            // 不再断开连接，因为投稿功能需要复用这个连接
            // 这样可以减少不必要的连接创建和销毁
        }
    }
});
