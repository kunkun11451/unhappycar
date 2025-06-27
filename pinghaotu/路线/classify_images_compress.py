import os
import send2trash  
from PIL import Image

def classify_and_compress_images(folder_path, compression_quality=70):
    files = os.listdir(folder_path)
    image_files = [f for f in files if f.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.gif', '.tiff'))]

    for file_name in image_files:
        file_path = os.path.join(folder_path, file_name)

        print(f"当前图片：{file_name}")

        category = input(f"请输入图片 {file_name} 的类别：").strip().upper()
        if not category:
            print("类别不能为空，请重新输入。")
            continue

        category_folder = os.path.join(folder_path, category)
        if not os.path.exists(category_folder):
            os.makedirs(category_folder)

        count = len([f for f in os.listdir(category_folder) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]) + 1

        new_file_name = f"{category}{count}.jpg"
        new_file_path = os.path.join(category_folder, new_file_name)

        try:
            with Image.open(file_path) as img:
                img = img.convert("RGB")
                img.save(new_file_path, "JPEG", quality=compression_quality)
                print(f"图片已保存到 {new_file_path}")
        except Exception as e:
            print(f"无法压缩保存图片 {file_name}: {e}")
            continue

        try:
            send2trash.send2trash(file_path)
            print(f"原文件 {file_name} 已移动到回收站")
        except Exception as e:
            print(f"无法移动文件到回收站 {file_name}: {e}")

if __name__ == "__main__":
    folder_path = os.path.dirname(os.path.abspath(__file__))
    compression_quality = 85  

    classify_and_compress_images(folder_path, compression_quality)