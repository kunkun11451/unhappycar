import os
import json
import shutil
import re
import functools
import ctypes
import sys

# ================= 配置路径 =================
base_dir = os.path.dirname(os.path.abspath(__file__))
json_path = os.path.join(base_dir, '..', 'image_urls.json')

# 工作目录
new_images_dir = os.path.join(base_dir, 'new_images')       # 待上传的图片放这里
processed_dir = os.path.join(base_dir, 'processed_images')  # 处理完的图片会移动到这里，防重复

def setup():
    """初始化文件夹和所需文件"""
    os.makedirs(new_images_dir, exist_ok=True)
    os.makedirs(processed_dir, exist_ok=True)

def get_character_name(filename, existing_keys):
    """根据文件名提取角色名"""
    for key in existing_keys:
        if key in filename:
            return key
            
    # 正则提取前面不是数字、下划线、短横线的部分（假设作为新角色名）
    match = re.match(r'^([^0-9_\-\.]+)', filename)
    if match:
        return match.group(1)
    
    # 彻底无法识别，返回未分类
    return "未分类"

def windows_name_sort(files):
    try:
        cmp_func = ctypes.windll.Shlwapi.StrCmpLogicalW

        def _cmp(a, b):
            return cmp_func(a, b)

        files.sort(key=functools.cmp_to_key(_cmp))
    except Exception:
        # 回退到自然排序，避免在非 Windows 环境出错
        files.sort(key=lambda text: [int(part) if part.isdigit() else part.lower() for part in re.split(r'(\d+)', text)])

def main():
    setup()
    
    print("--- 米游社 HTML 图片提取与更新写入工具 ---")
    print("请输入包含图片链接的 HTML 代码（输入完成后，在**新的一行**输入 'END' 并回车）:")
    print("-" * 35)

    try:
        lines = []
        while True:
            line = sys.stdin.readline()
            if not line:
                break
            if line.strip().upper() == 'END':
                break
            lines.append(line)
        
        content = "".join(lines)
        if not content.strip():
            print("\n[错误] 未收到任何输入。")
            return
            
    except EOFError:
        return
    
    # 预处理：处理 HTML 转义字符
    processed_content = content.replace('&quot;', '"').replace('&amp;', '&')
    
    # 正则匹配支持 upload-bbs 和 bbs-static 域名
    pattern = r'https://(?:upload-bbs|bbs-static)\.miyoushe\.com/[^"\')\s>]+'
    urls = re.findall(pattern, processed_content)
    
    if not urls:
        print("\n[提示] 未在输入中找到有效的图片链接，请检查粘贴内容。")
        return

    # 2. 读取 json
    if os.path.exists(json_path):
        with open(json_path, 'r', encoding='utf-8') as f:
            image_data = json.load(f)
    else:
        image_data = {}

    existing_keys = list(image_data.keys())

    # 3. 读取本地图片文件并排序（模拟系统按名称排序获取文件的顺序）
    # 支持常见的图片格式
    valid_exts = ('.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp')
    files = [f for f in os.listdir(new_images_dir) if f.lower().endswith(valid_exts)]
    
    windows_name_sort(files)

    if not files:
        print(f"[提示] {new_images_dir} 文件夹中没有找到图片。")
        return

    if len(files) != len(urls):
        print(f"[警告] 图片数量 ({len(files)}) 与链接数量 ({len(urls)}) 不一致！")
        print("这可能导致链接与角色对应错乱，强制进行匹配 (以数量少的一方为准)...")

    # 4. 融合匹配
    success_count = 0
    for filename, url in zip(files, urls):
        char_name = get_character_name(filename, existing_keys)
        
        if char_name not in image_data:
            image_data[char_name] = []
            existing_keys.append(char_name) # 新增后加入已知列表
            
        # 避免写入重复链接
        if url not in image_data[char_name]:
            image_data[char_name].append(url)
            
        # 移动图片至已处理文件夹，避免下次重复读取
        src_path = os.path.join(new_images_dir, filename)
        dst_path = os.path.join(processed_dir, filename)
        shutil.move(src_path, dst_path)
        
        success_count += 1
        print(f"√ {char_name} | {filename} -> {url}")

    # 5. 保存更新后的 JSON
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(image_data, f, ensure_ascii=False, indent=4)
        
    print(f"\n 成功更新并写入了 {success_count} 条链接到 image_urls.json。本地图片已移至 processed_images 目录。")

if __name__ == '__main__':
    main()
