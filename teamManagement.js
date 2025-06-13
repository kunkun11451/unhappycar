// 阵容管理模块
let teamMode = false; // 阵容模式状态，默认关闭，不保存状态
let selectedCharacters = new Set(); // 当前选中的角色
let editingTeamName = null; // 正在编辑的阵容名称
let alternativeMode = null; // 替代角色模式：存储正在设置替代角色的原角色名

// 加载阵容模式设置
function loadTeamModeSettings() {
    teamMode = false; // 始终默认关闭
    
    // 控制BP模式按钮显示
    updateBPButtonVisibility();
    
    // 确保阵容提示的显示状态与阵容模式一致
    const teamNameDisplay = document.getElementById('teamNameDisplay');
    if (teamNameDisplay) {
        teamNameDisplay.style.display = 'none'; // 默认隐藏阵容提示
    }
}

// 保存阵容模式设置（不再保存到localStorage）
function saveTeamModeSettings() {
    // 不保存状态，但仍需要控制BP按钮显示
    updateBPButtonVisibility();
    
    // 当关闭阵容模式时，隐藏抽取界面上的阵容提示
    const teamNameDisplay = document.getElementById('teamNameDisplay');
    if (teamNameDisplay) {
        teamNameDisplay.style.display = teamMode ? 'block' : 'none';
    }
}

// 控制BP模式按钮显示/隐藏
function updateBPButtonVisibility() {
    const bpButton = document.getElementById('bpButton');
    if (bpButton) {
        bpButton.style.display = teamMode ? 'none' : 'inline-block';
    }
}

// 创建更多设置内容
function createMoreSettingsContent() {
    const container = document.createElement('div');
    container.className = 'more-settings-container';
    
    // 阵容模式开关
    const teamModeSection = document.createElement('div');
    teamModeSection.className = 'setting-section';
    
    const teamModeLabel = document.createElement('div');
    teamModeLabel.className = 'setting-label';
    teamModeLabel.textContent = '阵容模式';
    
    const teamModeSwitch = document.createElement('label');
    teamModeSwitch.className = 'switch';
      const teamModeInput = document.createElement('input');
    teamModeInput.type = 'checkbox';
    teamModeInput.checked = teamMode;
    teamModeInput.addEventListener('change', (e) => {
        teamMode = e.target.checked;
        saveTeamModeSettings();
        updateTeamListVisibility();
        
        // 切换阵容提示的显示状态
        const teamNameDisplay = document.getElementById('teamNameDisplay');
        if (teamNameDisplay) {
            teamNameDisplay.style.display = teamMode ? 'block' : 'none';
        }
    });
    
    const teamModeSlider = document.createElement('span');
    teamModeSlider.className = 'slider';
    
    teamModeSwitch.appendChild(teamModeInput);
    teamModeSwitch.appendChild(teamModeSlider);
    
    teamModeSection.appendChild(teamModeLabel);
    teamModeSection.appendChild(teamModeSwitch);
    
    // 阵容列表区域
    const teamListSection = document.createElement('div');
    teamListSection.className = 'team-list-section';
    teamListSection.id = 'teamListSection';
    
    const teamListHeader = document.createElement('div');
    teamListHeader.className = 'team-list-header';
    teamListHeader.textContent = '阵容列表';
    
    const addTeamButton = document.createElement('button');
    addTeamButton.className = 'add-team-button';
    addTeamButton.textContent = '添加阵容';
    addTeamButton.addEventListener('click', openTeamEditor);
    
    teamListHeader.appendChild(addTeamButton);
    
    const teamList = document.createElement('div');
    teamList.className = 'team-list';
    teamList.id = 'teamList';
    
    teamListSection.appendChild(teamListHeader);
    teamListSection.appendChild(teamList);
    
    container.appendChild(teamModeSection);
    container.appendChild(teamListSection);
      // 先更新团队列表内容，再更新显示状态
    updateTeamList(); // 确保团队列表内容已更新
    updateTeamListVisibility(); // 然后根据当前模式控制显示
    return container;
}

// 更新阵容列表显示状态
function updateTeamListVisibility() {
    const teamListSection = document.getElementById('teamListSection');
    if (teamListSection) {
        teamListSection.style.display = teamMode ? 'block' : 'none';
        // 当阵容模式开启时，始终更新阵容列表
        if (teamMode) {
            updateTeamList();
        }
    }
}

// 更新阵容列表
function updateTeamList() {
    const teamList = document.getElementById('teamList');
    if (!teamList) return;
    
    teamList.innerHTML = '';
    
    Object.keys(window.teamData).forEach(teamName => {
        const team = window.teamData[teamName];
        const teamCard = document.createElement('div');
        teamCard.className = 'team-card';
        
        const teamHeader = document.createElement('div');
        teamHeader.className = 'team-header';
        
        const teamNameElement = document.createElement('div');
        teamNameElement.className = 'team-name';
        teamNameElement.textContent = teamName;
        
        const teamActions = document.createElement('div');
        teamActions.className = 'team-actions';
        
        const editButton = document.createElement('button');
        editButton.className = 'team-action-button edit';
        editButton.textContent = '编辑';
        editButton.addEventListener('click', () => openTeamEditor(teamName));
        
        const deleteButton = document.createElement('button');
        deleteButton.className = 'team-action-button delete';
        deleteButton.textContent = '删除';
        deleteButton.addEventListener('click', () => deleteTeam(teamName));
        
        teamActions.appendChild(editButton);
        teamActions.appendChild(deleteButton);
        
        teamHeader.appendChild(teamNameElement);
        teamHeader.appendChild(teamActions);
        
        const teamCharacters = document.createElement('div');
        teamCharacters.className = 'team-characters';
          team.角色列表.forEach(characterName => {
            const charElement = document.createElement('div');
            charElement.className = 'team-character';
            
            // 检查是否为替代角色（包含"/"）
            if (characterName.includes('/')) {
                const [char1, char2] = characterName.split('/');
                const character1 = window.characterData[char1];
                const character2 = window.characterData[char2];
                
                if (character1 && character2) {
                    // 创建分割头像容器
                    const charImgContainer = document.createElement('div');
                    charImgContainer.className = 'team-character-image-split';
                    
                    const charImg1 = document.createElement('img');
                    charImg1.src = character1.头像;
                    charImg1.alt = char1;
                    charImg1.className = 'team-character-image-half left';
                    
                    const charImg2 = document.createElement('img');
                    charImg2.src = character2.头像;
                    charImg2.alt = char2;
                    charImg2.className = 'team-character-image-half right';
                    
                    charImgContainer.appendChild(charImg1);
                    charImgContainer.appendChild(charImg2);
                    
                    const charName = document.createElement('div');
                    charName.className = 'team-character-name';
                    charName.textContent = characterName; // 显示"角色1/角色2"
                    
                    charElement.appendChild(charImgContainer);
                    charElement.appendChild(charName);
                }
            } else {
                // 普通角色显示
                const character = window.characterData[characterName];
                if (character) {
                    const charImg = document.createElement('img');
                    charImg.src = character.头像;
                    charImg.alt = characterName;
                    charImg.className = 'team-character-image';
                    
                    const charName = document.createElement('div');
                    charName.className = 'team-character-name';
                    charName.textContent = characterName;
                    
                    charElement.appendChild(charImg);
                    charElement.appendChild(charName);
                }
            }
            
            teamCharacters.appendChild(charElement);
        });
        
        teamCard.appendChild(teamHeader);
        teamCard.appendChild(teamCharacters);
        teamList.appendChild(teamCard);
    });
}

// 打开阵容编辑器
function openTeamEditor(teamName = null) {
    editingTeamName = teamName;
    selectedCharacters.clear();
    
    if (teamName && window.teamData[teamName]) {
        window.teamData[teamName].角色列表.forEach(char => {
            selectedCharacters.add(char);
        });
    }
      // 创建弹窗
    const overlay = document.createElement('div');
    overlay.className = 'team-editor-overlay';
    overlay.id = 'teamEditorOverlay';
    
    const popup = document.createElement('div');
    popup.className = 'team-editor-popup';
    
    // 弹窗内容容器（可滚动）
    const content = document.createElement('div');
    content.className = 'team-editor-content';
    
    const header = document.createElement('div');
    header.className = 'team-editor-header';
    
    const title = document.createElement('h3');
    title.textContent = teamName ? '编辑阵容' : '添加阵容';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'close-team-editor';
    closeButton.textContent = '×';
    closeButton.addEventListener('click', closeTeamEditor);
    
    header.appendChild(title);
    header.appendChild(closeButton);
    
    // 阵容名称输入
    const nameSection = document.createElement('div');
    nameSection.className = 'team-name-section';
    
    const nameLabel = document.createElement('label');
    nameLabel.textContent = '阵容名称：';
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'team-name-input';
    nameInput.id = 'teamNameInput';
    nameInput.value = teamName || '';
    nameInput.placeholder = '请输入阵容名称';
    
    nameSection.appendChild(nameLabel);
    nameSection.appendChild(nameInput);
    
    // 选中角色显示
    const selectedSection = document.createElement('div');
    selectedSection.className = 'selected-characters-section';
    
    const selectedTitle = document.createElement('div');
    selectedTitle.className = 'selected-title';
    selectedTitle.textContent = '已选择角色 (4/4)';
    selectedTitle.id = 'selectedTitle';
    
    const selectedContainer = document.createElement('div');
    selectedContainer.className = 'selected-characters';
    selectedContainer.id = 'selectedCharacters';
    
    selectedSection.appendChild(selectedTitle);
    selectedSection.appendChild(selectedContainer);
    
    // 角色选择区域
    const characterSection = document.createElement('div');
    characterSection.className = 'character-selection-section';
    
    const characterTitle = document.createElement('div');
    characterTitle.className = 'character-selection-title';
    characterTitle.textContent = '选择角色';
    
    const characterContainer = document.createElement('div');
    characterContainer.className = 'character-selection-container';
    characterContainer.id = 'characterSelection';
    
    characterSection.appendChild(characterTitle);
    characterSection.appendChild(characterContainer);
      // 操作按钮（固定在底部）
    const actions = document.createElement('div');
    actions.className = 'team-editor-actions';
    
    const cancelButton = document.createElement('button');
    cancelButton.className = 'team-editor-button cancel';
    cancelButton.textContent = '取消';
    cancelButton.addEventListener('click', closeTeamEditor);
    
    const saveButton = document.createElement('button');
    saveButton.className = 'team-editor-button save';
    saveButton.textContent = '保存';
    saveButton.addEventListener('click', saveTeam);
    
    actions.appendChild(cancelButton);
    actions.appendChild(saveButton);
    
    // 组装内容区域
    content.appendChild(header);
    content.appendChild(nameSection);
    content.appendChild(selectedSection);
    content.appendChild(characterSection);
    
    // 组装弹窗
    popup.appendChild(content);
    popup.appendChild(actions);
    
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    
    // 点击外部关闭
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeTeamEditor();
        }
    });
    
    updateCharacterSelection();
    updateSelectedCharacters();
}

// 更新角色选择界面
function updateCharacterSelection() {
    const container = document.getElementById('characterSelection');
    if (!container) return;
    
    container.innerHTML = '';
    
    // 添加元素筛选按钮
    const filterContainer = document.createElement('div');
    filterContainer.className = 'character-filter-container';
    
    const elements = ["全部", "冰", "火", "水", "雷", "草", "风", "岩"];
    let activeElement = "全部";
    
    elements.forEach(element => {
        const button = document.createElement('button');
        button.className = 'character-filter-button';
        if (element === "全部") {
            button.classList.add('active');
        }
        
        if (element === "全部") {
            button.textContent = element;
        } else {
            const img = document.createElement('img');
            img.src = `SVG/${element}.svg`;
            img.alt = element;
            img.className = 'filter-element-icon';
            button.appendChild(img);
        }
        
        button.addEventListener('click', () => {
            // 更新按钮状态
            filterContainer.querySelectorAll('.character-filter-button').forEach(btn => {
                btn.classList.remove('active');
            });
            button.classList.add('active');
            activeElement = element;
            
            // 过滤角色
            const characterCards = container.querySelectorAll('.character-selection-card');
            characterCards.forEach(card => {
                const characterElement = card.dataset.element;
                if (activeElement === "全部" || characterElement === activeElement) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
        });
        
        filterContainer.appendChild(button);
    });
    
    container.appendChild(filterContainer);
    
    // 创建角色容器
    const charactersContainer = document.createElement('div');
    charactersContainer.className = 'characters-grid';
    
    Object.keys(window.characterData).forEach(characterName => {
        if (characterName === '角色任选!') return; // 跳过特殊角色
        
        const character = window.characterData[characterName];
        const characterCard = document.createElement('div');
        characterCard.className = 'character-selection-card';
        characterCard.dataset.element = character.元素类型 || '';
        
        if (selectedCharacters.has(characterName)) {
            characterCard.classList.add('selected');
        }
        
        const img = document.createElement('img');
        img.src = character.头像;
        img.alt = characterName;
        img.className = 'character-selection-image';
        
        const name = document.createElement('div');
        name.className = 'character-selection-name';
        name.textContent = characterName;
        
        // 绿色遮罩
        const mask = document.createElement('div');
        mask.className = 'selection-mask';
        
        characterCard.appendChild(img);
        characterCard.appendChild(name);
        characterCard.appendChild(mask);
          characterCard.addEventListener('click', () => {
            if (alternativeMode) {
                // 如果处于替代模式，设置替代角色
                if (characterName !== alternativeMode) {
                    // 检查是否已经存在替代角色
                    const existingAlternative = `${alternativeMode}/${characterName}`;
                    const reverseAlternative = `${characterName}/${alternativeMode}`;
                    
                    if (!selectedCharacters.has(existingAlternative) && !selectedCharacters.has(reverseAlternative)) {
                        selectedCharacters.delete(alternativeMode);
                        selectedCharacters.add(existingAlternative);
                        alternativeMode = null;
                        updateSelectedCharacters();
                        updateCharacterSelection();
                        updateAlternativeModeDisplay();
                    }
                }
                return;
            }
            
            // 普通选择逻辑
            if (selectedCharacters.has(characterName)) {
                selectedCharacters.delete(characterName);
                characterCard.classList.remove('selected');
            } else if (selectedCharacters.size < 4) {
                selectedCharacters.add(characterName);
                characterCard.classList.add('selected');
            }
            updateSelectedCharacters();
        });
        
        charactersContainer.appendChild(characterCard);
    });
    
    container.appendChild(charactersContainer);
}

// 更新已选择角色显示
function updateSelectedCharacters() {
    const container = document.getElementById('selectedCharacters');
    const title = document.getElementById('selectedTitle');
      if (!container || !title) return;
    
    container.innerHTML = '';
      selectedCharacters.forEach(characterName => {
        const charElement = document.createElement('div');
        charElement.className = 'selected-character';
        
        // 检查是否为替代角色（包含"/"）
        if (characterName.includes('/')) {
            const [char1, char2] = characterName.split('/');
            const character1 = window.characterData[char1];
            const character2 = window.characterData[char2];
            
            if (character1 && character2) {
                // 创建分割头像容器
                const imgContainer = document.createElement('div');
                imgContainer.className = 'selected-character-image-split';
                
                const img1 = document.createElement('img');
                img1.src = character1.头像;
                img1.alt = char1;
                img1.className = 'selected-character-image-half left';
                
                const img2 = document.createElement('img');
                img2.src = character2.头像;
                img2.alt = char2;
                img2.className = 'selected-character-image-half right';
                
                imgContainer.appendChild(img1);
                imgContainer.appendChild(img2);
                
                const name = document.createElement('div');
                name.className = 'selected-character-name';
                name.textContent = characterName;
                
                charElement.appendChild(imgContainer);
                charElement.appendChild(name);
            }
        } else {
            // 普通角色显示
            const character = window.characterData[characterName];
            if (character) {
                const img = document.createElement('img');
                img.src = character.头像;
                img.alt = characterName;
                img.className = 'selected-character-image';
                
                const name = document.createElement('div');
                name.className = 'selected-character-name';
                name.textContent = characterName;
                
                charElement.appendChild(img);
                charElement.appendChild(name);
            }
        }
          // 添加点击取消选择的功能
        charElement.addEventListener('click', () => {
            if (alternativeMode) {
                // 如果处于替代模式，取消替代模式
                alternativeMode = null;
                updateAlternativeModeDisplay();
                return;
            }
            selectedCharacters.delete(characterName);
            updateSelectedCharacters();
            updateCharacterSelection(); // 更新角色选择界面的选中状态
        });
        
        // 添加右键菜单来设置替代角色（只对单个角色生效）
        if (!characterName.includes('/')) {
            charElement.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (selectedCharacters.size === 4) {
                    alternativeMode = characterName;
                    updateAlternativeModeDisplay();
                }
            });        }
        
        container.appendChild(charElement);
    });
    
    // 更新替代模式显示
    updateAlternativeModeDisplay();
}

// 更新替代模式显示
function updateAlternativeModeDisplay() {
    const title = document.getElementById('selectedTitle');
    if (!title) return;
    
    if (alternativeMode) {
        title.textContent = `已选择角色 (${selectedCharacters.size}/4) - 请选择${alternativeMode}的替代角色`;
        title.style.color = '#FFA500'; // 橙色提示
    } else {
        title.textContent = `已选择角色 (${selectedCharacters.size}/4)`;
        title.style.color = '#fff'; // 恢复白色
    }
}

// 保存阵容
function saveTeam() {
    const nameInput = document.getElementById('teamNameInput');
    const teamName = nameInput.value.trim();
    
    if (!teamName) {
        alert('请输入阵容名称');
        return;
    }
    
    if (selectedCharacters.size !== 4) {
        alert('请选择4个角色');
        return;
    }
    
    if (teamName !== editingTeamName && window.teamData[teamName]) {
        alert('阵容名称已存在');
        return;
    }
    
    // 如果是编辑模式且名称改变了，删除旧的
    if (editingTeamName && teamName !== editingTeamName) {
        delete window.teamData[editingTeamName];
    }
      window.teamData[teamName] = {
        角色列表: Array.from(selectedCharacters),
        描述: `自定义阵容`
    };
    
    saveTeamData();
    updateTeamList();
    updateTeamListVisibility(); // 确保阵容列表显示
    closeTeamEditor();
}

// 删除阵容
function deleteTeam(teamName) {
    if (confirm(`确定要删除阵容"${teamName}"吗？`)) {
        delete window.teamData[teamName];
        saveTeamData();
        updateTeamList();
    }
}

// 关闭阵容编辑器
function closeTeamEditor() {
    const overlay = document.getElementById('teamEditorOverlay');
    if (overlay) {
        overlay.remove();
    }
    selectedCharacters.clear();
    editingTeamName = null;
}

// 获取阵容模式抽取结果
function getTeamModeResult() {
    if (!teamMode || Object.keys(window.teamData).length === 0) {
        return null;
    }
    
    const teamNames = Object.keys(window.teamData);
    const randomTeam = teamNames[Math.floor(Math.random() * teamNames.length)];
    const team = window.teamData[randomTeam];
    
    return {
        teamName: randomTeam,
        characters: team.角色列表,
        description: team.描述
    };
}

// 初始化
function initTeamManagement() {
    loadTeamModeSettings();
    // 确保在页面加载后设置BP按钮可见性
    setTimeout(() => {
        updateBPButtonVisibility();
    }, 100);
}

// 暴露给全局
window.teamManagement = {
    createMoreSettingsContent,
    getTeamModeResult,
    initTeamManagement,
    isTeamMode: () => teamMode,
    updateTeamList,
    // 添加loadTeamData函数，用于重新加载团队数据
    loadTeamData: () => {
        // 如果characters.js中定义了loadTeamData函数，则调用它
        if (typeof window.loadTeamData === 'function') {
            window.loadTeamData();
        }
        // 确保在加载数据后更新列表
        updateTeamList();
    }
};

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', initTeamManagement);
