import os
import re

def natural_sort_key(s):
    """Helper function to sort strings containing numbers in natural order."""
    return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', s)]

def scan_and_sort_folders(folder_path, log_file):
    # 用于存储结果
    result = []

    # 遍历文件夹
    for root, dirs, files in os.walk(folder_path):
        for folder_name in dirs:
            folder_path = os.path.join(root, folder_name)
            # 筛选出 .jpg 文件
            jpg_files = [f for f in os.listdir(folder_path) if f.lower().endswith('.jpg')]
            # 按自然排序规则排序文件
            sorted_jpg_files = sorted(jpg_files, key=natural_sort_key)

            if sorted_jpg_files:
                # 格式化为指定输出
                formatted_files = [f"'{file}'" for file in sorted_jpg_files]
                result.append(f"'{folder_name}': [{', '.join(formatted_files)}],")

    # 将结果写入到 log 文件
    with open(log_file, 'w', encoding='utf-8') as f:
        for line in result:
            f.write(line + '\n')
    print(f"扫描完成，结果已写入 {log_file}")

if __name__ == "__main__":
    # 获取脚本所在文件夹路径
    folder_path = os.path.dirname(os.path.abspath(__file__))
    log_file = os.path.join(folder_path, 'scan_results.log')

    scan_and_sort_folders(folder_path, log_file)