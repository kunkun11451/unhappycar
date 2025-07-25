// 事件
const hardmission = {
    "凑不出啊...": {
        "内容": "每位玩家的圣遗物不可以组成四件套",
    },
    "喝水杯": {
        "内容": "每位玩家都不可以携带空之杯",
    },
    "轮到谁休息啦？": {
        "内容": "每场战斗都只能有三位玩家参加",
    },
    "禁止增益": {
        "内容": "每位玩家都不可以吃获得增益buff的食物或药剂",
    },
    "这个真的能用吗？": {
        "内容": "所有人不可以使用70级或以上等级的武器",
    },
    "一并超": {
        "内容": "接下来的战斗中不可以回血或开盾，死掉后成为观众",
    },
    "不许跑": {
        "内容": "所有人不许冲刺",
    },
    "嘘": {
        "内容": "所有人禁止发言，只能用表情交流",
    },
    "吵死了": {
        "内容": "所有人都要学角色说话，包括攻击音效",
    },
    "重击": {
        "内容": "所有人都只能使用重击",
    },
    "整整齐齐": {
        "内容": "10秒内同时击败点位里所有敌人，失败后所有人圣遗物-1",
    },
    "我发个朋友圈": {
        "内容": "战斗前先近距离和战斗状态的精英怪合照，四个人都要入镜",
    },
    "谁才是大王？": {
        "内容": "四个人使用骰子帽，点数最大的可以命令剩下的三位队友（每人两次投骰子机会）",
    },
    "顺手的事": {
        "内容": "一起搜刮地主的材料，如果让地主拿到材料，地主可以命令其他的三位队友",
    },
    "蹦床": {
        "内容": "队伍中额外新增一位闲云，除闲云外所有人只能使用下落攻击造成伤害",
    },
    "风吹起了从前": {
        "内容": "使用凯亚，丽莎，安柏，旅行者完成战斗(可以选一样的)",
    },
    "勇敢者的奖励": {
        "内容": "角色任选，无视任何事件",
    },
    "不喜欢金色": {
        "内容": "所有人都只能使用四星圣遗物",
    },
    "神明团建": {
        "内容": "无视bp，所有人选择不同的神明，但只能使用元素战绩",
    },
    "我以为是减速带": {
        "内容": "所有人只能使用火神的机车冲刺造成伤害，没有火神变为观众",
    },
    "国际会面": {
        "内容": "当四人角色所属不同国家时,获得一次消除负面效果。"
    },
    "谁？": {
        "内容": "[NPC信息]，找到此NPC才可以继续战斗",
        "placeholders": {
            "NPC信息": [
                "蒙德酿酒师 康纳",
                "蒙德水果商贩 法拉",
                "蒙德厨师 哈里斯",
                "蒙德珠宝商人 石榴",
                "蒙德仓库管理员 恩内斯特",
                "璃月仓库管理员 狗三儿",
                "璃月客栈女侍 毓华",
                "璃月水手 汐零",
                "璃月诗人 清昼",
                "璃月采药人 七郎",
                "稻妻商人 清子",
                "稻妻设计师 若紫",
                "稻妻渔夫 小畑",
                "稻妻侦探 珊瑚",
                "稻妻刀匠 宫崎三朗",
                "须弥商贩 康清涟",
                "须弥渔民 扎凯",
                "须弥图书管理员 卡塔扬",
                "须弥珠宝商人 哈立德",
                "须弥香料商人 巴巴尔",
                "枫丹鱼贩 安特曼",
                "枫丹记者 肖诺",
                "枫丹店员 卡嘉妮",
                "枫丹潜水员 艾琪诺",
                "枫丹蔬果贩 欧仁妮",
                "纳塔医生 恩琳",
                "纳塔大祭司 卡胡鲁",
                "纳塔救生员 乌米"
            ]
        }
    },
    "禁止传送": {
        "内容": "还差十万八千里",
    },
    "无伤挑战": {
        "内容": "任何人受到伤害都要重新开始战斗（不可以开盾）",
    },
    "敌我不分": {
        "内容": "妮绽放，禁盾奶、水草主c、卡维，死了要发我是笨蛋。没有妮露就正常绽放",
    },
    "判定": {
        "内容": "打爆爆箱然后抽帽子，以打爆的人帽子为准，大于磕满药，小于使用四星武器。",
    },
    "快点快点再快点": {
        "内容": "本轮用时超过6分钟后禁传",
    },  
    "吹泡泡": {
        "内容": "更换希格雯，只能使用小小关心气泡和E技能打怪。没有的使用没多少伤害的盾或挂冰位(持续一个点位)",
    }, 
    "交换": {
        "内容": "抽帽子交换互相角色，单20自选>相同交换>最大最小交换。",
    },  
    "克隆": {
        "内容": "抽帽子克隆点数最大的人的角色",
    }, 
    "镜像残像": {
        "内容": "协商从谁开始循环，大致模仿上一个玩家刚刚的动作序列(如:走→E→普攻→跳)。模仿失败即失去技能",
    }, 
    "你的回合还是我的回合": {
        "内容": "协商顺序轮流上，一次只能放一个技能",
    }, 
    "护送任务": {
        "内容": "指定一名队友为且标，其他人必须保护目标不受伤害，目标不能攻击，失败一次所有人圣遗物-1(一个点位最多一次)",
    },
    "重置bp": {
        "内容": "投票通过此事件后自动重置bp",
    },
};

// 将hardmission挂载到window对象上，确保全局可访问
window.hardmission = hardmission;
