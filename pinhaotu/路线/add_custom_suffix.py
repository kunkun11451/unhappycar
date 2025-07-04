import os

def add_suffix_interactively(folder_path):
    # 获取文件夹中的所有文件
    files = os.listdir(folder_path)

    for file_name in files:
        # 跳过文件夹本身和隐藏文件
        if file_name == os.path.basename(__file__) or file_name.startswith('.'):
            continue

        # 询问用户后缀
        suffix = input(f"请输入文件 '{file_name}' 的后缀（留空则跳过此文件）：").strip()

        # 如果用户未输入后缀，跳过重命名
        if not suffix:
            print(f"跳过文件 '{file_name}'")
            continue

        # 构造新的文件名
        name, ext = os.path.splitext(file_name)
        new_file_name = f"{name} {suffix}{ext}"

        # 获取完整路径
        old_file_path = os.path.join(folder_path, file_name)
        new_file_path = os.path.join(folder_path, new_file_name)

        # 重命名文件
        try:
            os.rename(old_file_path, new_file_path)
            print(f"重命名: {file_name} -> {new_file_name}")
        except Exception as e:
            print(f"无法重命名 {file_name}: {e}")

if __name__ == "__main__":
    # 获取脚本所在文件夹路径
    folder_path = os.path.dirname(os.path.abspath(__file__))
    add_suffix_interactively(folder_path)