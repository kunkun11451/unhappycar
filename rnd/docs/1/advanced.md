# ⚙️ 高级设置

自定义和高级配置选项

## 🛠️ 系统配置

### 游戏设置

#### 事件抽取控制
通过游戏设置可以精确控制事件抽取行为：

**个人事件抽取开关**
- **功能**：控制是否进行个人事件抽取
- **效果**：关闭时隐藏4个事件卡片和重抽次数显示
- **存储**：设置保存在浏览器本地存储中

**团队事件抽取开关**  
- **功能**：控制是否进行团队事件抽取
- **效果**：关闭时不会显示团队事件投票界面
- **联动**：与个人事件开关独立控制

**完全关闭模式**
- **触发条件**：两个开关都关闭时
- **界面效果**：隐藏所有事件相关界面元素
- **按钮状态**：抽取事件按钮完全隐藏

#### 数据重置
- **重置游戏**：清除所有游戏状态和历史记录
- **确认机制**：防止误操作的二次确认
- **清理范围**：
  - BP状态记录
  - 角色使用历史  
  - 事件抽取历史
  - 屏蔽角色列表
  - 重抽次数状态

### 存储管理

#### 本地存储配置
系统使用localStorage保存以下数据：

```javascript
存储项目 = {
  // 角色管理
  "characterTable-checkedState": "角色启用状态",
  "characterFilters": "角色筛选条件",
  "characterSearchTerm": "角色搜索关键词",
  
  // 事件管理  
  "personalEventsTable-checkedState": "个人事件启用状态",
  "teamEventsTable-checkedState": "团队事件启用状态",
  
  // 游戏设置
  "enableMissionExtraction": "个人事件抽取开关",
  "enableHardMissionExtraction": "团队事件抽取开关",
  
  // BP系统
  "usedCharacters": "已使用角色列表",
  "blockedCharacters": "屏蔽角色列表",
  
  // 团队模式
  "teamMode": "团队模式开关",
  "teams": "阵容配置数据"
}
```

#### 数据导入导出

**配置导出**
```javascript
// 导出当前配置
function exportSettings() {
  const settings = {
    characters: JSON.parse(localStorage.getItem('characterTable-checkedState')),
    personalEvents: JSON.parse(localStorage.getItem('personalEventsTable-checkedState')),
    teamEvents: JSON.parse(localStorage.getItem('teamEventsTable-checkedState')),
    gameSettings: {
      enableMission: localStorage.getItem('enableMissionExtraction'),
      enableHardMission: localStorage.getItem('enableHardMissionExtraction')
    }
  };
  return JSON.stringify(settings, null, 2);
}
```

**配置导入**
```javascript
// 导入配置
function importSettings(settingsJSON) {
  const settings = JSON.parse(settingsJSON);
  
  Object.keys(settings).forEach(key => {
    localStorage.setItem(key, JSON.stringify(settings[key]));
  });
  
  // 刷新界面
  location.reload();
}
```

## 🎮 团队模式详解

### 阵容管理系统

#### 阵容创建
1. **开启团队模式**：在更多玩法设置中启用
2. **创建新阵容**：点击"添加新阵容"按钮
3. **配置成员**：为每个阵容位置分配角色
4. **保存阵容**：系统自动保存阵容配置

#### 阵容配置格式
```javascript
阵容数据结构 = {
  id: "唯一标识符",
  name: "阵容名称", 
  members: [
    { position: 1, character: "角色名称1" },
    { position: 2, character: "角色名称2" },
    { position: 3, character: "角色名称3" },
    { position: 4, character: "角色名称4" }
  ],
  created: "创建时间",
  lastUsed: "最后使用时间"
}
```

#### 阵容操作
- **应用阵容**：将阵容成员设置为当前角色
- **编辑阵容**：修改阵容的成员配置
- **删除阵容**：移除不需要的阵容
- **复制阵容**：基于现有阵容创建新阵容

### 团队模式功能

#### 角色同步
- **阵容应用**：所有玩家看到相同的角色配置
- **成员显示**：角色卡片显示对应的阵容成员
- **实时更新**：阵容变更实时同步到所有玩家

#### BP规则适配
在团队模式下，BP规则需要特殊处理：
- **全局BP**：整个团队共享已使用角色列表
- **个人BP**：每个阵容位置独立维护使用记录
- **屏蔽机制**：按阵容位置记录屏蔽角色

## 🔧 自定义开发

### 扩展事件系统

#### 添加新事件类型
1. **定义事件数据**：在mission.js或hardmission.js中添加
2. **事件格式**：
```javascript
"事件名称": {
  "内容": "事件描述文本",
  "类型": "个人/团队",
  "难度": "简单/中等/困难",
  "标签": ["标签1", "标签2"]
}
```

#### 动态事件开发
```javascript
// 动态内容事件示例
"自定义动态事件": {
  "内容": function() {
    const options = ["选项1", "选项2", "选项3"];
    const selected = options[Math.floor(Math.random() * options.length)];
    return `动态内容：${selected}`;
  }
}
```

### 添加新角色

#### 角色数据结构
```javascript
角色对象 = {
  "角色名称": {
    "稀有度": "4星" | "5星",
    "元素": "火|水|风|雷|草|冰|岩",
    "武器": "单手剑|双手剑|长枪|法器|弓箭",
    "头像": "图片URL",
    "描述": "角色描述"
  }
}
```

#### 添加步骤
1. **数据添加**：在characters.js中添加角色数据
2. **图片资源**：确保头像图片可访问
3. **测试验证**：确认角色在各个筛选条件下正常显示

### API接口扩展

#### WebSocket消息扩展
```javascript
// 自定义消息类型
const customMessageHandler = {
  'custom-action': function(data) {
    // 处理自定义操作
    console.log('收到自定义消息:', data);
  }
};

// 注册消息处理器
socket.on('message', function(message) {
  const { type, data } = JSON.parse(message);
  if (customMessageHandler[type]) {
    customMessageHandler[type](data);
  }
});
```

#### HTTP API扩展
```javascript
// 添加新的API端点
app.post('/api/custom-endpoint', (req, res) => {
  // 处理自定义请求
  const result = processCustomRequest(req.body);
  res.json(result);
});
```

## 🔍 调试和监控

### 开发者工具

#### 控制台调试
```javascript
// 启用调试模式
window.DEBUG_MODE = true;

// 调试信息输出
function debugLog(message, data) {
  if (window.DEBUG_MODE) {
    console.log(`[DEBUG] ${message}:`, data);
  }
}

// 使用示例
debugLog('角色抽取结果', selectedCharacters);
debugLog('事件抽取结果', selectedMissions);
```

#### 状态监控
```javascript
// 监控游戏状态
window.gameState = {
  currentCharacters: [],
  currentMissions: [],
  bpMode: 'global',
  rerollCount: 3,
  
  // 状态更新方法
  updateState: function(key, value) {
    this[key] = value;
    debugLog(`状态更新 ${key}`, value);
  }
};
```

### 性能优化

#### 内存管理
```javascript
// 清理未使用的数据
function cleanupMemory() {
  // 清理过期的历史记录
  const history = JSON.parse(localStorage.getItem('eventHistory') || '[]');
  const recentHistory = history.slice(-100); // 保留最近100条
  localStorage.setItem('eventHistory', JSON.stringify(recentHistory));
  
  // 清理临时数据
  delete window.tempData;
}

// 定期清理
setInterval(cleanupMemory, 5 * 60 * 1000); // 每5分钟清理一次
```

#### 网络优化
```javascript
// 消息去重
const messageBuffer = new Set();

function sendMessage(message) {
  const messageHash = btoa(JSON.stringify(message));
  
  if (!messageBuffer.has(messageHash)) {
    messageBuffer.add(messageHash);
    socket.send(JSON.stringify(message));
    
    // 清理缓存
    setTimeout(() => {
      messageBuffer.delete(messageHash);
    }, 1000);
  }
}
```

## 🚀 部署配置

### 生产环境部署

#### 服务器配置
```nginx
# Nginx配置示例
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        root /path/to/unhappycar;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    location /docs {
        root /path/to/unhappycar;
        index index.html;
    }
    
    # WebSocket代理
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

#### 环境变量配置
```bash
# 生产环境配置
NODE_ENV=production
WS_PORT=3000
HTTP_PORT=8000
CORS_ORIGIN=https://your-domain.com
MAX_ROOM_SIZE=10
ROOM_TIMEOUT=3600000
```

### CDN配置

#### 静态资源CDN
```html
<!-- 使用CDN加速 -->
<link rel="stylesheet" href="https://cdn.your-domain.com/css/styles.css">
<script src="https://cdn.your-domain.com/js/app.js"></script>
```

#### 图片资源优化
```javascript
// 图片懒加载
const imageObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      img.classList.remove('lazy');
      imageObserver.unobserve(img);
    }
  });
});

document.querySelectorAll('img[data-src]').forEach(img => {
  imageObserver.observe(img);
});
```

---

通过这些高级设置和配置选项，你可以完全定制化你的游戏体验，甚至进行二次开发来满足特定需求！ 🛠️
