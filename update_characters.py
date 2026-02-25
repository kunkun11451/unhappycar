import json
import time
import re
import os
import argparse
import sys

# Only import playwright if we are scraping
try:
    from playwright.sync_api import sync_playwright
except ImportError:
    pass

def scrape_characters():
    url = "https://baike.mihoyo.com/ys/obc/channel/map/189/25?bbs_presentation_style=no_header&visit_device=pc&no_page_view=1"
    
    # Output structure
    scraped_data = {}

    with sync_playwright() as p:
        # Launch browser (headless=True for background run)
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        print(f"Navigating to {url}...")
        page.goto(url)
        
        # Wait for the character list to load
        page.wait_for_selector(".collection-avatar__item", timeout=10000)
        
        # Initial scrape of all characters (Name and Avatar)
        print("Scraping basic character info...")
        # Scroll to bottom to ensure all lazy-loaded images are loaded
        last_height = page.evaluate("document.body.scrollHeight")
        while True:
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            time.sleep(1)
            new_height = page.evaluate("document.body.scrollHeight")
            if new_height == last_height:
                break
            last_height = new_height
            
        items = page.query_selector_all(".collection-avatar__item")
        for item in items:
            name_el = item.query_selector(".collection-avatar__title")
            icon_el = item.query_selector(".collection-avatar__icon")
            
            if name_el and icon_el:
                name = name_el.inner_text().strip()
                
                # Filter out Travelers
                if "旅行者" in name:
                    continue

                # Try to get data-src or style background-image
                avatar_url = icon_el.get_attribute("data-src")
                if not avatar_url:
                    # Fallback to parsing style attribute if data-src is missing/processed
                    style = icon_el.get_attribute("style")
                    if style and "url(" in style:
                        avatar_url = style.split('url("')[1].split('")')[0]
                
                # Clean up URL (remove query params)
                if avatar_url and "?" in avatar_url:
                    avatar_url = avatar_url.split("?")[0]
                
                scraped_data[name] = {
                    "头像": avatar_url,
                    "元素类型": "",
                    "武器类型": "",
                    "星级": "",
                    "体型": "", # Cannot be obtained, leave empty
                    "国家": ""
                }
        
        print(f"Found {len(scraped_data)} characters (excluding Travelers).")

        # Define filters to process
        filters_config = [
            {"placeholder": "元素", "key": "元素类型"},
            {"placeholder": "武器", "key": "武器类型"},
            {"placeholder": "星级", "key": "星级"},
            {"placeholder": "地区", "key": "国家"} 
        ]

        # Region mapping
        region_mapping = {
            "蒙德城": "蒙德",
            "璃月港": "璃月",
            "稻妻城": "稻妻",
            "须弥城": "须弥",
            "枫丹廷": "枫丹",
            "纳塔": "纳塔",
            "至冬国": "至冬"
        }

        for filter_conf in filters_config:
            placeholder = filter_conf["placeholder"]
            key = filter_conf["key"]
            print(f"Processing filter: {placeholder}...")
            
            # Locate the specific filter input
            filter_input = page.locator(f".pos-filter-pc .el-input__inner[placeholder='{placeholder}']")
            
            if filter_input.count() == 0:
                print(f"Filter {placeholder} not found, skipping.")
                continue
                
            # Click to open dropdown
            filter_input.click()
            time.sleep(0.2) # Reduced wait
            
            # Get all items in the visible dropdown
            dropdown_items = page.locator(".el-select-dropdown__item:visible")
            
            count = dropdown_items.count()
            options_text = []
            for i in range(count):
                text = dropdown_items.nth(i).inner_text().strip()
                if text != "不限":
                    options_text.append(text)
            
            # Close dropdown
            page.locator("body").click() 
            time.sleep(0.2) # Reduced wait

            for option in options_text:
                # print(f"  Selecting {option}...")
                
                # Open dropdown
                filter_input.click()
                time.sleep(0.2) # Reduced wait
                
                # Click the option
                page.locator(f".el-select-dropdown__item:visible >> text='{option}'").click()
                
                # Wait for list to update
                time.sleep(0.3) # Reduced wait
                
                # Scrape visible characters
                visible_items = page.query_selector_all(".collection-avatar__item")
                for item in visible_items:
                    name_el = item.query_selector(".collection-avatar__title")
                    if name_el:
                        name = name_el.inner_text().strip()
                        if name in scraped_data:
                            value_to_save = option
                            # Apply mapping for Region/Country
                            if key == "国家":
                                value_to_save = region_mapping.get(option, option)
                            
                            scraped_data[name][key] = value_to_save
            
            # Reset this filter to "不限" before moving to next filter
            print(f"  Resetting filter {placeholder}...")
            filter_input.click()
            time.sleep(0.2) # Reduced wait
            page.locator(".el-select-dropdown__item:visible >> text='不限'").click()
            time.sleep(0.5) # Reduced wait

        browser.close()
    
    return scraped_data

def extract_json_from_js(content):
    # Find start of window.characterData = 
    match = re.search(r"window\.characterData\s*=\s*", content)
    if not match:
        return None, None, None
    
    start_index = match.end()
    # Find the first '{'
    json_start = content.find('{', start_index)
    if json_start == -1:
        return None, None, None
    
    # Count braces to find the end
    brace_count = 0
    json_end = -1
    for i in range(json_start, len(content)):
        if content[i] == '{':
            brace_count += 1
        elif content[i] == '}':
            brace_count -= 1
            if brace_count == 0:
                json_end = i + 1
                break
    
    if json_end == -1:
        return None, None, None
        
    json_str = content[json_start:json_end]
    return json_str, json_start, json_end

def merge_data(existing_data, scraped_data):
    final_data = {}
    existing_order = list(existing_data.keys())
    new_keys = []
    
    # 1. Add New Characters (Scraped but not in Existing)
    for name in scraped_data:
        if name not in existing_data:
            final_data[name] = scraped_data[name]
            new_keys.append(name)
            
    # 2. Add Existing Characters (Preserve Order, Update with Scraped Data)
    for name in existing_order:
        if name in scraped_data:
            # Merge: Start with existing, update with non-empty scraped values
            merged = existing_data[name].copy()
            for k, v in scraped_data[name].items():
                if v: # Only update if scraped value is not empty
                    merged[k] = v
            final_data[name] = merged
        else:
            # Keep existing as is
            final_data[name] = existing_data[name]
            
    return final_data, new_keys

def process_file(file_path, scraped_data):
    print(f"Processing {file_path}...")
    if not os.path.exists(file_path):
        print(f"File {file_path} not found.")
        return []

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    json_str, start, end = extract_json_from_js(content)
    
    existing_data = {}
    if json_str:
        # Clean up JSON (remove trailing commas)
        clean_json_str = re.sub(r',(\s*})', r'\1', json_str)
        clean_json_str = re.sub(r',(\s*])', r'\1', clean_json_str)
        try:
            existing_data = json.loads(clean_json_str)
        except json.JSONDecodeError as e:
            print(f"Warning: Could not parse JSON in {file_path}: {e}. Using scraped data only for merge.")
    else:
        print(f"Warning: Could not find window.characterData in {file_path}.")
        
    final_data, new_keys = merge_data(existing_data, scraped_data)
    
    new_json_str = json.dumps(final_data, ensure_ascii=False, indent=4)
    
    if start is not None and end is not None:
        new_content = content[:start] + new_json_str + content[end:]
    else:
        print(f"Skipping {file_path} due to extraction failure.")
        return []

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print(f"Updated {file_path}")
    return new_keys

def update_body_types(updates, files_to_update):
    for file_path in files_to_update:
        print(f"Updating body types in {file_path}...")
        if not os.path.exists(file_path):
            continue
            
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
            
        json_str, start, end = extract_json_from_js(content)
        if not json_str:
            continue
            
        clean_json_str = re.sub(r',(\s*})', r'\1', json_str)
        clean_json_str = re.sub(r',(\s*])', r'\1', clean_json_str)
        
        try:
            data = json.loads(clean_json_str)
            
            changed = False
            for name, body_type in updates.items():
                if name in data:
                    data[name]["体型"] = body_type
                    changed = True
            
            if changed:
                new_json_str = json.dumps(data, ensure_ascii=False, indent=4)
                new_content = content[:start] + new_json_str + content[end:]
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(new_content)
                print(f"Updated {file_path} with new body types.")
                
        except Exception as e:
            print(f"Error updating {file_path}: {e}")

def main():
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command")
    
    # Scrape command
    scrape_parser = subparsers.add_parser("scrape")
    
    # Update body command
    update_parser = subparsers.add_parser("update-body")
    update_parser.add_argument("--data", required=True, help="JSON string of updates {name: body_type}")

    args = parser.parse_args()
    
    files_to_update = [
        os.path.join("rnd", "js", "characters.js"),
    ]

    if args.command == "scrape" or args.command is None:
        scraped_data = scrape_characters()
        
        all_new_keys = set()
        for file_path in files_to_update:
            new_keys = process_file(file_path, scraped_data)
            all_new_keys.update(new_keys)
            
        # Output new keys to GITHUB_OUTPUT if running in Actions
        if "GITHUB_OUTPUT" in os.environ:
            new_chars_list = list(all_new_keys)
            if new_chars_list:
                print(f"New characters detected: {new_chars_list}")
                with open(os.environ["GITHUB_OUTPUT"], "a") as f:
                    f.write(f"new_characters={json.dumps(new_chars_list, ensure_ascii=False)}\n")
                    
                    # Generate template for copy-pasting
                    template_str = "\n".join([f"{name}: " for name in new_chars_list])
                    
                    # Write multiline output using delimiter
                    import uuid
                    delimiter = f"EOF_{uuid.uuid4().hex}"
                    f.write(f"new_characters_template<<{delimiter}\n")
                    f.write(template_str + "\n")
                    f.write(f"{delimiter}\n")
                    
    elif args.command == "update-body":
        try:
            updates = json.loads(args.data)
            update_body_types(updates, files_to_update)
        except json.JSONDecodeError:
            print("Invalid JSON data provided for update-body")
            sys.exit(1)

if __name__ == "__main__":
    main()
