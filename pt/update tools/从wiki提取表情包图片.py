import re
import sys
import os
import requests
from datetime import datetime

# ==AUTO_MAPPING_START==
AVATAR_MAPPING = {
    "aino": "爱诺",
    "albedo": "阿贝多",
    "alhatham": "艾尔海森",
    "aloy": "埃洛伊",
    "amber": "安柏",
    "arlecchino": "阿蕾奇诺",
    "ayaka": "神里绫华",
    "ayato": "神里绫人",
    "baizhuer": "白术",
    "barbara": "芭芭拉",
    "beidou": "北斗",
    "bennett": "班尼特",
    "candace": "坎蒂丝",
    "charlotte": "夏洛蒂",
    "chasca": "恰斯卡",
    "chevreuse": "夏沃蕾",
    "chiori": "千织",
    "chongyun": "重云",
    "citlali": "茜特菈莉",
    "clorinde": "克洛琳德",
    "collei": "柯莱",
    "columbina": "哥伦比娅",
    "cyno": "赛诺",
    "dahlia": "塔利雅",
    "dehya": "迪希雅",
    "diluc": "迪卢克",
    "diona": "迪奥娜",
    "dori": "多莉",
    "durin": "杜林",
    "emilie": "艾梅莉埃",
    "escoffier": "爱可菲",
    "eula": "优菈",
    "faruzan": "珐露珊",
    "feiyan": "烟绯",
    "fischl": "菲谢尔",
    "flins": "菲林斯",
    "freminet": "菲米尼",
    "furina": "芙宁娜",
    "gaming": "嘉明",
    "ganyu": "甘雨",
    "gorou": "五郎",
    "heizo": "鹿野院平藏",
    "hutao": "胡桃",
    "iansan": "伊安珊",
    "ifa": "伊法",
    "illuga": "叶洛亚",
    "ineffa": "伊涅芙",
    "itto": "荒泷一斗",
    "jahoda": "雅珂达",
    "kachina": "卡齐娜",
    "kaeya": "凯亚",
    "kaveh": "卡维",
    "kazuha": "枫原万叶",
    "keqing": "刻晴",
    "kinich": "基尼奇",
    "klee": "可莉",
    "kokomi": "珊瑚宫心海",
    "lanyan": "蓝砚",
    "lauma": "菈乌玛",
    "layla": "莱依拉",
    "linette": "琳妮特",
    "liney": "林尼",
    "linnea": "莉奈娅",
    "lisa": "丽莎",
    "liuyun": "闲云",
    "mannequinboy": "奇偶(男)",
    "mannequingirl": "奇偶(女)",
    "mavuika": "玛薇卡",
    "mika": "米卡",
    "mizuki": "梦见月瑞希",
    "momoka": "绮良良",
    "mona": "莫娜",
    "mualani": "玛拉妮",
    "nahida": "纳西妲",
    "navia": "娜维娅",
    "nefer": "奈芙尔",
    "neuvillette": "那维莱特",
    "nilou": "妮露",
    "ningguang": "凝光",
    "noel": "诺艾尔",
    "olorun": "欧洛伦",
    'aether': '空',
    'lumine': '荧',
    "jean": "琴",
    "qiqi": "七七",
    "razor": "雷泽",
    "rosaria": "罗莎莉亚",
    "sara": "九条裟罗",
    "sayu": "早柚",
    "sethos": "赛索斯",
    "shenhe": "申鹤",
    "shinobu": "久岐忍",
    "shougun": "雷电将军",
    "sigewinne": "希格雯",
    "skirknew": "丝柯克",
    "sucrose": "砂糖",
    "tartaglia": "达达利亚",
    "tighnari": "提纳里",
    "tohma": "托马",
    "traveler": "旅行者",
    "varesa": "瓦雷莎",
    "varka": "法尔伽",
    "venti": "温迪",
    "wanderer": "流浪者",
    "wriothesley": "莱欧斯利",
    "xiangling": "香菱",
    "xiao": "魈",
    "xilonen": "希诺宁",
    "xingqiu": "行秋",
    "xinyan": "辛焱",
    "yae": "八重神子",
    "yaoyao": "瑶瑶",
    "yelan": "夜兰",
    "yoimiya": "宵宫",
    "yunjin": "云堇",
    "zhongli": "钟离",
    "zibai": "兹白",
    'paimon': '派蒙',
    'varka': '法尔伽',
    'dainsleif': '戴因斯雷布',
    'alice': '爱丽丝',
    'sandrone': '桑多涅',
    'nicole': '妮可',
    'rerir': '雷利尔',
    'lohen': '洛恩'
}
# ==AUTO_MAPPING_END==


def load_avatar_data():
    return AVATAR_MAPPING.copy()

def extract_character_from_filename(filename):
    
    name_part = os.path.splitext(filename)[0]
    
    match = re.search(r'Paintings \d+ ([a-zA-Z]+)', name_part)
    if match:
        return match.group(1)
    
    words = name_part.replace('_', ' ').split()
    if len(words) >= 2:
        if words[-1].isdigit():
            return words[-2]
        return words[-1]
    
    return name_part

def main():
    print("--- 从wiki提取表情包图片 ---")
    
    avatar_mapping = load_avatar_data()
    if not avatar_mapping:
        print("角色映射为空，请先运行映射同步脚本。")
        return

    print("请输入 HTML 代码（输入完成后，在**新的一行**输入 'END' 并回车）:")
    print("-" * 35)

    try:
        lines = []
        while True:
            line = sys.stdin.readline()
            if not line: break
            if line.strip().upper() == 'END': break
            lines.append(line)
        
        html_input = "".join(lines)
        if not html_input.strip():
            print("错误：未输入内容")
            return
        
        pattern = r'data-image-name="([^"]+)".*?data-src="([^"]+)"'
        matches = re.findall(pattern, html_input, re.DOTALL)
        
        if not matches:
            pattern = r'data-image-name="([^"]+)".*?src="([^"]+)"'
            matches = re.findall(pattern, html_input, re.DOTALL)

        if not matches:
            print("未找到图片信息。")
            return

        today_dir = datetime.now().strftime('%Y-%m-%d_Wiki')
        if not os.path.exists(today_dir):
            os.makedirs(today_dir)

        char_counts = {} 

        print(f"\n找到 {len(matches)} 个图片项，开始下载...")
        
        for img_name, url in matches:
            clean_url = url.split('/revision/')[0]
            
            en_name = extract_character_from_filename(img_name)
            cn_name = avatar_mapping.get(en_name.lower(), en_name)
            
            char_counts[cn_name] = char_counts.get(cn_name, 0) + 1
            seq = char_counts[cn_name]
            
            ext = os.path.splitext(img_name)[1] or ".png"
            final_file_name = f"{cn_name}_{seq}{ext}"
            save_path = os.path.join(today_dir, final_file_name)

            try:
                print(f"正在下载: {final_file_name}...", end=" ", flush=True)
                resp = requests.get(clean_url, timeout=15)
                if resp.status_code == 200:
                    with open(save_path, 'wb') as f:
                        f.write(resp.content)
                    print("[√]")
                else:
                    print(f"[×] HTTP {resp.status_code}")
            except Exception as e:
                print(f"[×] 错误: {e}")

        print(f"\n全部完成！文件保存在: {os.path.abspath(today_dir)}")

    except Exception as e:
        print(f"运行出错: {e}")

if __name__ == '__main__':
    main()
