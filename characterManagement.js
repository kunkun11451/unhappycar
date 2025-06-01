// 角色管理模块
const disabledCharacters = new Set(JSON.parse(localStorage.getItem("disabledCharacters")) || []); // 从缓存加载禁用角色
let activeFilter = null; // 当前激活的筛选元素

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
    enabledCountContainer.textContent = `启用角色数量：${Object.keys(characterData).length - disabledCharacters.size}/100`;

    // 创建筛选按钮容器
    const filterContainer = document.createElement("div");
    filterContainer.className = "filter-container"; // 筛选按钮容器

    const elements = ["冰", "火", "水", "雷", "草", "风", "岩"];
    elements.forEach(element => {
        const button = document.createElement("img");
        button.src = `SVG/${element}.svg`; // 对应的 SVG 文件路径
        button.alt = element;
        button.className = "filter-button";
        button.dataset.element = element; // 将元素类型存储为按钮的自定义属性

        button.addEventListener("click", () => {
            if (activeFilter === element) {
                // 如果当前筛选已经激活，再次点击取消筛选
                activeFilter = null;
                button.classList.remove("active");
                Array.from(cardContainer.children).forEach((card, index) => {
                    card.style.display = ""; // 显示所有卡片
                    card.classList.remove("animate"); // 移除动画类名
                    setTimeout(() => {
                        card.classList.add("animate"); // 重新添加动画类名
                    }, index * 3); // 每个卡片延迟
                });
            } else {
                // 激活新的筛选
                activeFilter = element;
                document.querySelectorAll(".filter-button").forEach(btn => btn.classList.remove("active"));
                button.classList.add("active");
                Array.from(cardContainer.children).forEach((card, index) => {
                    if (card.dataset.element === element) {
                        card.style.display = ""; // 显示匹配的卡片
                        card.classList.remove("animate"); // 移除动画类名
                        setTimeout(() => {
                            card.classList.add("animate"); // 重新添加动画类名
                        }, index * 3); // 每个卡片延迟
                    } else {
                        card.style.display = "none"; // 隐藏不匹配的卡片
                    }
                });
            }
        });

        filterContainer.appendChild(button);
    });

    // 创建角色卡片容器
    const cardContainer = document.createElement("div");
    cardContainer.className = "character-card-container"; // 用于存放角色卡片

    Object.keys(characterData).forEach((characterName, index) => {
        const character = characterData[characterName];

        // 创建角色卡片
        const card = document.createElement("div");
        card.className = "character-management-card"; // 添加类名
        card.dataset.element = character.元素类型; // 将元素类型存储为卡片的自定义属性

        // 如果角色在禁用列表中，添加禁用样式
        if (disabledCharacters.has(characterName)) {
            card.classList.add("disabled");
        }

        // 角色头像
        const img = document.createElement("img");
        img.src = character.头像;
        img.alt = characterName;
        img.className = "character-management-image";

        // 角色名字
        const name = document.createElement("p");
        name.textContent = characterName;
        name.className = "character-name character-management-name"; // 添加专属类名

        // 点击卡片切换禁用状态
        card.addEventListener("click", () => {
            if (disabledCharacters.has(characterName)) {
                disabledCharacters.delete(characterName);
                card.classList.remove("disabled"); // 移除禁用样式
            } else {
                disabledCharacters.add(characterName);
                card.classList.add("disabled"); // 添加禁用样式
            }

            // 更新缓存
            localStorage.setItem("disabledCharacters", JSON.stringify(Array.from(disabledCharacters)));

            // 更新启用角色数量
            enabledCountContainer.textContent = `启用角色数量：${Object.keys(characterData).length - disabledCharacters.size}/100`;
        });

        // 将头像和名字添加到卡片
        card.appendChild(img);
        card.appendChild(name);

        // 将卡片添加到卡片容器
        cardContainer.appendChild(card);

        // 添加动画类名，延迟依次排开
        setTimeout(() => {
            card.classList.add("animate");
        }, index * 15); // 每个卡片延迟
    });

    // 按顺序将统计容器、筛选按钮容器和卡片容器添加到主容器
    container.appendChild(enabledCountContainer); // 统计容器在最上方
    container.appendChild(filterContainer); // 筛选按钮容器在统计容器下方
    container.appendChild(cardContainer); // 卡片容器在筛选按钮容器下方

    return container;
}

document.addEventListener("DOMContentLoaded", () => {
    window.loadCharacterManagement = function () {
        const container = initCharacterManagement();
        return container; // 不再返回 outerHTML，而是返回 DOM 节点
    };
});