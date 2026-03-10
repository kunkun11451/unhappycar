import os
import re
import json

def natural_sort_key(s):
    """
    Sort strings containing numbers naturally.
    For example: '第1章', '第2章', '第10章' will be sorted correctly.
    """
    return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', s)]

def generate_library(start_book_id):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    library = []
    book_id_counter = start_book_id

    
    # Supported audio extensions
    audio_extensions = {'.wav', '.mp3', '.m4a', '.ogg', '.aac'}

    # Iterate over items in the base directory
    for item in os.listdir(base_dir):
        item_path = os.path.join(base_dir, item)
        # Check if it's a directory (treat as a book)
        if os.path.isdir(item_path) and not item.startswith('.'):
            book_title = item
            chapters = []
            
            # Find all audio files in the book directory
            files = [f for f in os.listdir(item_path) if os.path.splitext(f)[1].lower() in audio_extensions]
            # Sort files naturally so that Chapter 10 comes after Chapter 9, not Chapter 1
            files.sort(key=natural_sort_key)
            
            chapter_id_counter = 1
            for file_name in files:
                # Remove extension to get chapter title
                chapter_title = os.path.splitext(file_name)[0]
                import urllib.parse
                encoded_book_title = urllib.parse.quote(book_title)
                encoded_file_name = urllib.parse.quote(file_name)
                
                audio_url = f"https://pub-fe126a6238c04beb9f31c1ad2a56231a.r2.dev/{encoded_book_title}/{encoded_file_name}"

                chapters.append({
                    "id": f"c{chapter_id_counter}",
                    "title": chapter_title,
                    "audioUrl": audio_url
                })
                chapter_id_counter += 1
            
            # Only add the book if it has audio chapters
            if chapters:
                library.append({
                    "id": f"book{book_id_counter}",
                    "title": book_title,
                    "chapters": chapters
                })
                book_id_counter += 1

    return library

import subprocess

def copy_to_clipboard_and_prompt(library):
    # Strip the surrounding [ ] brackets
    library_json = json.dumps(library, ensure_ascii=False, indent=4)
    data_content = library_json[1:-1].strip() + ",\n"

    try:
        # Call Windows "clip" command to copy string to clipboard
        subprocess.run("clip", text=True, input=data_content, check=True)       
        print(f"\n 成功解析了 {len(library)} 本书的结构！")
    except Exception as e:
        print(f"\n 成功解析了 {len(library)} 本书的结构！")
        print(" 自动复制到剪贴板失败，请手动复制下方分割线内的内容\n")
        print("-" * 50)
        print(data_content)
        print("-" * 50)

    input("按回车键 (Enter) 退出...")

if __name__ == "__main__":
    try:
        start_id = int(input(" 请输入本次新增书籍的起始 ID 数字: ").strip())
    except ValueError:
        print("输入无效，默认使用 ID: 1")
        start_id = 1
        
    lib = generate_library(start_id)
    copy_to_clipboard_and_prompt(lib)
