import os
from datetime import datetime

def rename_images_by_creation_time(folder_path):
    files = os.listdir(folder_path)

    image_files = [f for f in files if f.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.gif', '.tiff'))]

    image_files.sort(key=lambda x: os.path.getctime(os.path.join(folder_path, x)))

    for i, file_name in enumerate(image_files, start=1):
        file_extension = os.path.splitext(file_name)[1]

        new_name = f"{i}{file_extension}"

        old_file_path = os.path.join(folder_path, file_name)
        new_file_path = os.path.join(folder_path, new_name)

        os.rename(old_file_path, new_file_path)
        print(f"Renamed: {file_name} -> {new_name}")

if __name__ == "__main__":
    folder_path = input("请输入文件夹路径：")
    if os.path.exists(folder_path) and os.path.isdir(folder_path):
        rename_images_by_creation_time(folder_path)
    else:
        print("文件夹路径不存在或不是一个文件夹。")