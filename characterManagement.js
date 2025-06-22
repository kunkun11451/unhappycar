// 角色管理模块
const disabledCharacters = new Set(JSON.parse(localStorage.getItem("disabledCharacters")) || []); // 从缓存加载禁用角色
let activeElementFilter = null; // 当前激活的元素筛选
let activeWeaponFilter = null; // 当前激活的武器筛选

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
    });    container.appendChild(enabledCountContainer);
    container.appendChild(filterContainer);
    container.appendChild(weaponFilterContainer);
    container.appendChild(cardContainer);

    // 初始化时检测可见卡片数量
    setTimeout(() => {
        applyFilters();
    }, 100);

    return container;
}

document.addEventListener("DOMContentLoaded", () => {
    window.loadCharacterManagement = function () {
        const container = initCharacterManagement();
        return container;
    };
});