// 角色管理模块
const disabledCharacters = new Set(JSON.parse(localStorage.getItem("disabledCharacters")) || []); // 从缓存加载禁用角色
let activeElementFilter = null; // 当前激活的元素筛选
let activeWeaponFilter = null; // 当前激活的武器筛选

// 设置搜索功能
function setupCharacterSearch(inputId, containerSelector, itemSelector, nameSelector, nameDatasetKey, clearFiltersCallback) {
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
        
        // 如果有搜索内容且提供了清除筛选的回调函数，则清除筛选状态
        if (searchTerm !== '' && clearFiltersCallback) {
            clearFiltersCallback();
        }
        
        const container = document.querySelector(containerSelector);
        const items = container.querySelectorAll(itemSelector);
        let visibleCount = 0; // 计算搜索结果中可见卡片数量

        items.forEach(item => {
            const nameElement = item.querySelector(nameSelector);
            const itemName = item.dataset[nameDatasetKey];
            if (!itemName || !nameElement) return;

            // Reset highlight
            nameElement.textContent = itemName;
            let highlightedHTML = itemName;
            let match = false;

            if (searchTerm === '') {
                match = true;
            } else if (itemName.toLowerCase().includes(searchTerm)) {
                match = true;
                const regex = new RegExp(searchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
                highlightedHTML = itemName.replace(regex, '<span style="background-color: yellow; color: black; font-weight: bold;">$&</span>');
            } else if (hasPinyinSupport) {
                // 使用安全的方式访问pinyin函数
                const { pinyin } = window.pinyinPro;
                const matchResult = matchPinyinInitials(itemName, searchTerm, pinyin);
                
                if (matchResult.match) {
                    match = true;
                    // 构建高亮HTML，只高亮匹配的字符
                    highlightedHTML = '';
                    for (let i = 0; i < itemName.length; i++) {
                        if (matchResult.matchedPositions.includes(i)) {
                            highlightedHTML += `<span style="background-color: yellow; color: black; font-weight: bold;">${itemName[i]}</span>`;
                        } else {
                            highlightedHTML += itemName[i];
                        }
                    }
                }
            }

            item.style.display = match ? '' : 'none';
            nameElement.innerHTML = highlightedHTML;
            
            // 统计可见卡片数量
            if (match) {
                visibleCount++;
            }
        });

        // 根据搜索结果中可见卡片数量添加或移除CSS类
        if (visibleCount < 4) {
            container.classList.add("few-cards");
        } else {
            container.classList.remove("few-cards");
        }
    });

    // 支持多音字的拼音首字母匹配函数
    function matchPinyinInitials(name, searchTerm, pinyinFunc) {
        if (!pinyinFunc) return { match: false };
        
        // 获取所有可能的拼音首字母组合
        const { initialsMatrix, matchedPositions } = getAllPossibleInitials(name, searchTerm, pinyinFunc);
        
        // 检查是否有任何组合匹配搜索词
        const match = initialsMatrix.some(initials => {
            const combinedInitials = initials.join('');
            const startIndex = combinedInitials.indexOf(searchTerm);
            
            if (startIndex !== -1) {
                // 记录匹配的字符位置
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


// 清除所有筛选状态的函数
function clearAllFilters() {
    activeElementFilter = null;
    activeWeaponFilter = null;
}

function initCharacterManagement() {
    const characterData = window.characterData || {}; // 确保角色数据存在

    if (Object.keys(characterData).length === 0) {
        console.error("角色数据未加载，请检查 characters.js 文件是否正确引入！");
        const errorContainer = document.createElement("div");
        errorContainer.textContent = "角色数据未加载，请检查 characters.js 文件是否正确引入！";
        return errorContainer; // 返回一个错误提示容器
    }

    const container = document.createElement("div");
    container.className = "character-management-container"; // 添加管理界面容器样式

    // 创建启用角色数量统计容器
    const enabledCountContainer = document.createElement("div");
    enabledCountContainer.className = "enabled-count-container"; // 用于显示启用角色数量
    enabledCountContainer.textContent = `启用角色数量：${Object.keys(characterData).length - disabledCharacters.size} / ${Object.keys(characterData).length}`;
    // 创建角色卡片容器
    const cardContainer = document.createElement("div");
    cardContainer.className = "character-card-container"; // 用于存放角色卡片    // 筛选应用函数
    function applyFilters() {
        let visibleCount = 0; // 计算可见卡片数量
        
        Array.from(cardContainer.children).forEach((card, index) => {
            const elementMatch = !activeElementFilter || card.dataset.element === activeElementFilter;
            const weaponMatch = !activeWeaponFilter || card.dataset.weapon === activeWeaponFilter;

            if (elementMatch && weaponMatch) {
                card.style.display = "";
                card.classList.remove("animate");
                setTimeout(() => {
                    card.classList.add("animate");
                }, index * 3);
                visibleCount++; // 增加可见卡片计数
            } else {
                card.style.display = "none";
            }
        });

        // 根据可见卡片数量添加或移除CSS类
        if (visibleCount < 4) {
            cardContainer.classList.add("few-cards");
        } else {
            cardContainer.classList.remove("few-cards");
        }
    }

    // 创建搜索输入框
    const searchContainer = document.createElement("div");
    searchContainer.className = "search-container";
    searchContainer.style.marginBottom = "15px";
    searchContainer.style.textAlign = "center";

    const searchInput = document.createElement("input");
    searchInput.type = 'text';
    searchInput.id = 'characterSearchInput';
    searchInput.placeholder = '搜索角色 (支持拼音首字母：lxz→旅行者)';
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
    const style = document.createElement('style');
    style.innerHTML = `
    #characterSearchInput::placeholder {
        color: #fff !important;
        opacity: 1 !important;
    }
    #characterSearchInput::-webkit-input-placeholder {
        color: #fff !important;
        opacity: 1 !important;
    }
    #characterSearchInput:-ms-input-placeholder {
        color: #fff !important;
        opacity: 1 !important;
    }
    #characterSearchInput::-ms-input-placeholder {
        color: #fff !important;
        opacity: 1 !important;
    }
    `;
    document.head.appendChild(style);

    searchContainer.appendChild(searchInput);
    // searchContainer.appendChild(style);

    // 创建元素筛选按钮容器
    const filterContainer = document.createElement("div");
    filterContainer.className = "filter-container";

    const elements = ["冰", "火", "水", "雷", "草", "风", "岩"];
    elements.forEach(element => {
        const button = document.createElement("img");
        button.src = `SVG/${element}.svg`;
        button.alt = element;
        button.className = "filter-button";
        button.dataset.element = element;

        button.addEventListener("click", () => {
            // 清空搜索框
            const searchInput = document.getElementById('characterSearchInput');
            if (searchInput) {
                searchInput.value = '';
                // 触发input事件以重置搜索状态
                searchInput.dispatchEvent(new Event('input'));
            }
            
            if (activeElementFilter === element) {
                activeElementFilter = null;
                button.classList.remove("active");
            } else {
                filterContainer.querySelectorAll('.filter-button').forEach(btn => btn.classList.remove("active"));
                activeElementFilter = element;
                button.classList.add("active");
            }
            applyFilters();
        });

        filterContainer.appendChild(button);
    });

    // 创建武器筛选按钮容器
    const weaponFilterContainer = document.createElement("div");
    weaponFilterContainer.className = "filter-container";

    const weaponTypes = {
        "弓": "https://homdgcat.wiki/homdgcat-res/AvatarSkill/Skill_A_02.png",
        "长枪": "https://homdgcat.wiki/homdgcat-res/AvatarSkill/Skill_A_03.png",
        "法器": "https://homdgcat.wiki/homdgcat-res/AvatarSkill/Skill_A_Catalyst_MD.png",
        "大剑": "https://homdgcat.wiki/homdgcat-res/AvatarSkill/Skill_A_04.png",
        "单手剑": "https://homdgcat.wiki/homdgcat-res/AvatarSkill/Skill_A_01.png"
    };

    Object.entries(weaponTypes).forEach(([weapon, url]) => {
        const button = document.createElement("img");
        button.src = url;
        button.alt = weapon;
        button.className = "filter-button";
        button.style.width = "40px"; 
        button.style.height = "40px"; 
        button.dataset.weapon = weapon;

        button.addEventListener("click", () => {
            // 清空搜索框
            const searchInput = document.getElementById('characterSearchInput');
            if (searchInput) {
                searchInput.value = '';
                // 触发input事件以重置搜索状态
                searchInput.dispatchEvent(new Event('input'));
            }
            
            if (activeWeaponFilter === weapon) {
                activeWeaponFilter = null;
                button.classList.remove("active");
            } else {
                weaponFilterContainer.querySelectorAll('.filter-button').forEach(btn => btn.classList.remove("active"));
                activeWeaponFilter = weapon;
                button.classList.add("active");
            }
            applyFilters();
        });

        weaponFilterContainer.appendChild(button);
    });

    Object.keys(characterData).forEach((characterName, index) => {
        const character = characterData[characterName];

        const card = document.createElement("div");
        card.className = "character-management-card";
        card.dataset.element = character.元素类型;
        card.dataset.weapon = character.武器类型;
        card.dataset.character = characterName; // 添加角色名称数据属性用于搜索

        if (disabledCharacters.has(characterName)) {
            card.classList.add("disabled");
        }

        const img = document.createElement("img");
        img.src = character.头像;
        img.alt = characterName;
        img.className = "character-management-image";

        const name = document.createElement("p");
        name.textContent = characterName;
        name.className = "character-name character-management-name";

        card.addEventListener("click", () => {
            if (disabledCharacters.has(characterName)) {
                disabledCharacters.delete(characterName);
                card.classList.remove("disabled");
            } else {
                disabledCharacters.add(characterName);
                card.classList.add("disabled");
            }
            localStorage.setItem("disabledCharacters", JSON.stringify(Array.from(disabledCharacters)));
            enabledCountContainer.textContent = `启用角色数量：${Object.keys(characterData).length - disabledCharacters.size} / ${Object.keys(characterData).length}`;
        });

        card.appendChild(img);
        card.appendChild(name);
        cardContainer.appendChild(card);

        setTimeout(() => {
            card.classList.add("animate");
        }, index * 15);
    });    
    container.appendChild(enabledCountContainer);
    container.appendChild(searchContainer); // 搜索容器
    container.appendChild(filterContainer);
    container.appendChild(weaponFilterContainer);
    container.appendChild(cardContainer);    // 初始化时检测可见卡片数量并清除筛选按钮状态
    // 初始化搜索功能
    setTimeout(() => {
        // 创建清除筛选状态的回调函数
        const clearFiltersCallback = () => {
            // 清除元素筛选状态
            activeElementFilter = null;
            filterContainer.querySelectorAll('.filter-button').forEach(btn => btn.classList.remove("active"));
            
            // 清除武器筛选状态
            activeWeaponFilter = null;
            weaponFilterContainer.querySelectorAll('.filter-button').forEach(btn => btn.classList.remove("active"));
            
            // 重新应用筛选（此时所有筛选都被清除，所以会显示所有卡片）
            applyFilters();
        };
        
        setupCharacterSearch('characterSearchInput', '.character-card-container', '.character-management-card', '.character-management-name', 'character', clearFiltersCallback);
    }, 100);

    setTimeout(() => {
        // 清除所有筛选按钮的激活状态
        filterContainer.querySelectorAll('.filter-button').forEach(btn => btn.classList.remove("active"));
        weaponFilterContainer.querySelectorAll('.filter-button').forEach(btn => btn.classList.remove("active"));
        
        applyFilters();
    }, 100);

    return container;
}

document.addEventListener("DOMContentLoaded", () => {
    window.loadCharacterManagement = function () {
        const container = initCharacterManagement();
        return container;
    };
    
    // 暴露清除筛选函数到全局作用域
    window.clearCharacterFilters = clearAllFilters;
});
// 为了保持向后兼容性，这里也传递一个空的回调函数
setupCharacterSearch('searchInput', '.character-card-container', '.character-management-card', '.character-management-name', 'characterName', null);