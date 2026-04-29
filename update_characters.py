import argparse
import json
import os
import re
import sys
import time

# 仅在执行抓取时引入 playwright
try:
    from playwright.sync_api import sync_playwright
except ImportError:
    sync_playwright = None

WIKI_URL = "https://baike.mihoyo.com/ys/obc/channel/map/189/25?bbs_presentation_style=no_header&visit_device=pc&no_page_view=1"
AVATAR_URL_SOURCE = "https://act.mihoyo.com/ys/event/calculator/index.html?mhy_presentation_style=fullscreen&utm_source=bbs&utm_medium=ys&utm_campaign=pcbox#/character"
IGNORE_KEYWORDS = ["旅行者", "预告", "奇偶"]

FILTERS_CONFIG = [
    {"placeholder": "元素", "key": "元素类型"},
    {"placeholder": "武器", "key": "武器类型"},
    {"placeholder": "星级", "key": "星级"},
    {"placeholder": "地区", "key": "国家"},
]

REGION_MAPPING = {
    "蒙德城": "蒙德",
    "璃月港": "璃月",
    "稻妻城": "稻妻",
    "须弥城": "须弥",
    "枫丹廷": "枫丹",
    "纳塔": "纳塔",
    "至冬国": "至冬",
}


def get_headless_mode():
    return True


def extract_json_from_js(content):
    match = re.search(r"window\.characterData\s*=\s*", content)
    if not match:
        return None, None, None

    start_index = match.end()
    json_start = content.find("{", start_index)
    if json_start == -1:
        return None, None, None

    brace_count = 0
    json_end = -1
    for i in range(json_start, len(content)):
        if content[i] == "{":
            brace_count += 1
        elif content[i] == "}":
            brace_count -= 1
            if brace_count == 0:
                json_end = i + 1
                break

    if json_end == -1:
        return None, None, None

    json_str = content[json_start:json_end]
    return json_str, json_start, json_end


def load_existing_data(file_path):
    if not os.path.exists(file_path):
        return {}

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    json_str, _, _ = extract_json_from_js(content)
    if not json_str:
        return {}

    clean_json_str = re.sub(r",(\s*})", r"\1", json_str)
    clean_json_str = re.sub(r",(\s*])", r"\1", clean_json_str)
    try:
        return json.loads(clean_json_str)
    except json.JSONDecodeError:
        return {}


def merge_data(existing_data, scraped_data):
    final_data = {}
    existing_order = list(existing_data.keys())
    new_keys = []

    # 先插入新增角色
    for name in scraped_data:
        if name not in existing_data:
            final_data[name] = scraped_data[name]
            new_keys.append(name)
            print(f"新增角色置顶: {name}")

    # 保持旧角色顺序与数据
    for name in existing_order:
        final_data[name] = existing_data[name]

    return final_data, new_keys


def process_file(file_path, scraped_data):
    print(f"处理中: {file_path}...")
    if not os.path.exists(file_path):
        print(f"文件不存在: {file_path}")
        return []

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    json_str, start, end = extract_json_from_js(content)
    existing_data = {}
    if json_str:
        clean_json_str = re.sub(r",(\s*})", r"\1", json_str)
        clean_json_str = re.sub(r",(\s*])", r"\1", clean_json_str)
        try:
            existing_data = json.loads(clean_json_str)
        except json.JSONDecodeError as e:
            print(f"警告: 解析失败 {file_path}: {e}")
    else:
        print(f"警告: 未找到 window.characterData: {file_path}")

    final_data, new_keys = merge_data(existing_data, scraped_data)
    new_json_str = json.dumps(final_data, ensure_ascii=False, indent=4)

    if start is None or end is None:
        print(f"跳过写入: {file_path}")
        return []

    new_content = content[:start] + new_json_str + content[end:]
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print(f"已更新: {file_path}")
    return new_keys


def scrape_avatars(page):
    print(f"访问养成计算器获取头像: {AVATAR_URL_SOURCE}...")
    page.goto(AVATAR_URL_SOURCE)
    avatar_map = {}

    try:
        time.sleep(5)
        page.wait_for_selector(".character-item, .gt-avatar", timeout=30000)

        for _ in range(10):
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            time.sleep(0.5)

        container_items = page.query_selector_all("div[class*='character-item']")
        if not container_items:
            container_items = page.query_selector_all(".character-item")

        for item in container_items:
            name_el = item.query_selector("p[class*='gt-mobile-caption']")
            img_el = item.query_selector("img[src*='item_icon']")
            if not name_el or not img_el:
                continue

            name = name_el.inner_text().strip()
            avatar = img_el.get_attribute("src")
            if avatar and "?" in avatar:
                avatar = avatar.split("?")[0]

            if name and name != "Lv.1":
                avatar_map[name] = avatar

        if not avatar_map:
            print("警告: 头像列表为空，可能页面未加载完成")
        else:
            print(f"获得头像数: {len(avatar_map)}")
    except Exception as e:
        print(f"警告: 头像抓取失败: {e}")

    return avatar_map


def scrape_basic_info(page, avatar_map):
    print(f"访问米游社 Wiki获取基础信息: {WIKI_URL}...")
    
    max_retries = 3
    for attempt in range(1, max_retries + 1):
        try:
            # 增加超时时间到 60s
            page.goto(WIKI_URL, timeout=60000)
            page.wait_for_selector(".collection-avatar__item", timeout=15000)
            break
        except Exception as e:
            print(f"  米游社 Wiki 加载尝试 {attempt} 失败: {e}")
            if attempt == max_retries:
                raise e
            time.sleep(2)

    print("抓取基础角色信息...")
    last_height = page.evaluate("document.body.scrollHeight")
    while True:
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(1)
        new_height = page.evaluate("document.body.scrollHeight")
        if new_height == last_height:
            break
        last_height = new_height

    scraped_data = {}
    items = page.query_selector_all(".collection-avatar__item")
    for item in items:
        name_el = item.query_selector(".collection-avatar__title")
        icon_el = item.query_selector(".collection-avatar__icon")
        if not name_el:
            continue

        name = name_el.inner_text().strip()
        if any(keyword in name for keyword in IGNORE_KEYWORDS):
            continue

        avatar_url = avatar_map.get(name)
        if not avatar_url and icon_el:
            avatar_url = icon_el.get_attribute("data-src")
            if not avatar_url:
                style = icon_el.get_attribute("style")
                if style and "url(" in style:
                    avatar_url = style.split('url("')[1].split('")')[0]

        if avatar_url and "?" in avatar_url:
            avatar_url = avatar_url.split("?")[0]

        scraped_data[name] = {
            "头像": avatar_url,
            "元素类型": "",
            "武器类型": "",
            "星级": "",
            "体型": "",
            "国家": "",
        }

    print(f"米游社角色数: {len(scraped_data)}")
    return scraped_data


def apply_filters(page, scraped_data):
    for filter_conf in FILTERS_CONFIG:
        placeholder = filter_conf["placeholder"]
        key = filter_conf["key"]
        print(f"处理筛选: {placeholder}...")

        filter_input = page.locator(f".pos-filter-pc .el-input__inner[placeholder='{placeholder}']")
        if filter_input.count() == 0:
            print(f"筛选不存在: {placeholder}")
            continue

        filter_input.click()
        time.sleep(0.2)

        dropdown_items = page.locator(".el-select-dropdown__item:visible")
        options_text = []
        for i in range(dropdown_items.count()):
            text = dropdown_items.nth(i).inner_text().strip()
            if text != "不限":
                options_text.append(text)

        page.locator("body").click()
        time.sleep(0.2)

        for option in options_text:
            filter_input.click()
            time.sleep(0.2)
            page.locator(f".el-select-dropdown__item:visible >> text='{option}'").click()
            time.sleep(0.3)

            visible_items = page.query_selector_all(".collection-avatar__item")
            for item in visible_items:
                name_el = item.query_selector(".collection-avatar__title")
                if not name_el:
                    continue

                name = name_el.inner_text().strip()
                if name not in scraped_data:
                    continue

                value_to_save = option
                if key == "国家":
                    value_to_save = REGION_MAPPING.get(option, option)
                scraped_data[name][key] = value_to_save

        filter_input.click()
        time.sleep(0.2)
        page.locator(".el-select-dropdown__item:visible >> text='不限'").click()
        time.sleep(0.5)


def fetch_body_type(browser, name):
    bili_wiki_url = f"https://wiki.biligame.com/ys/{name}"
    
    max_retries = 3
    for attempt in range(1, max_retries + 1):
        detail_page = browser.new_page()
        try:
            print(f"  访问 Bili Wiki获取角色缺失的体型信息 (第 {attempt} 次尝试): {bili_wiki_url}")
            detail_page.goto(bili_wiki_url, timeout=120000)
            detail_page.wait_for_selector(".mw-parser-output", timeout=30000)

            body_type = detail_page.evaluate(
                """() => {
                    const ths = Array.from(document.querySelectorAll('th'));
                    const bodyTh = ths.find(th => th.innerText.trim() === '体型');
                    if (bodyTh && bodyTh.nextElementSibling) {
                        return bodyTh.nextElementSibling.innerText.trim();
                    }
                    return null;
                }"""
            )
            
            if body_type:
                return body_type
                
        except Exception as e:
            print(f"  第 {attempt} 次尝试失败: {e}")
            if attempt == max_retries:
                print(f"  已达到最大重试次数 ({max_retries})，跳过 {name}")
        finally:
            detail_page.close()
            
    return None


def fetch_body_type_processed(browser, name):
    body_type = fetch_body_type(browser, name)
    if not body_type:
        return None

    if "幼女" in body_type:
        body_type = "萝莉"

    body_type = re.sub(r"\[.*?\]", "", body_type).strip()
    return body_type or None


def fill_missing_body_types(browser, scraped_data, existing_data):
    print("检查缺失体型...")
    for name, data in scraped_data.items():
        existing_char = existing_data.get(name) if existing_data else None
        has_body_type = data.get("体型") or (existing_char and existing_char.get("体型"))
        if has_body_type:
            continue

        print(f"  体型缺失: {name}")
        try:
            body_type = fetch_body_type_processed(browser, name)
            if body_type:
                if "幼女" in body_type:
                    body_type = "萝莉"
                body_type = re.sub(r"\[.*?\]", "", body_type).strip()
                
                scraped_data[name]["体型"] = body_type
                print(f"  已保存体型: {body_type}")
            else:
                print("  未找到体型")
        except Exception as e:
            print(f"  体型处理失败: {e}")


def scrape_characters(existing_data=None):
    if sync_playwright is None:
        raise RuntimeError("未安装 playwright，无法抓取数据")

    scraped_data = {}
    with sync_playwright() as p:
        headless = get_headless_mode()
        print(f"浏览器无头模式: {headless}")
        browser = p.chromium.launch(headless=headless)
        page = browser.new_page()

        avatar_map = scrape_avatars(page)
        scraped_data = scrape_basic_info(page, avatar_map)
        apply_filters(page, scraped_data)
        fill_missing_body_types(browser, scraped_data, existing_data or {})

        browser.close()

    return scraped_data


def update_body_types(updates, files_to_update):
    for file_path in files_to_update:
        print(f"更新体型: {file_path}...")
        if not os.path.exists(file_path):
            continue

        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        json_str, start, end = extract_json_from_js(content)
        if not json_str:
            continue

        clean_json_str = re.sub(r",(\s*})", r"\1", json_str)
        clean_json_str = re.sub(r",(\s*])", r"\1", clean_json_str)

        try:
            data = json.loads(clean_json_str)
        except Exception as e:
            print(f"更新失败: {e}")
            continue

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
            print(f"已更新体型: {file_path}")


def write_github_output(new_keys):
    if "GITHUB_OUTPUT" not in os.environ:
        return

    new_chars_list = list(new_keys)
    if not new_chars_list:
        return

    print(f"新增角色: {new_chars_list}")
    with open(os.environ["GITHUB_OUTPUT"], "a") as f:
        f.write(f"new_characters={json.dumps(new_chars_list, ensure_ascii=False)}\n")

        template_str = "\n".join([f"{name}: " for name in new_chars_list])
        delimiter = f"EOF_{__import__('uuid').uuid4().hex}"
        f.write(f"new_characters_template<<{delimiter}\n")
        f.write(template_str + "\n")
        f.write(f"{delimiter}\n")


def main():
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command")

    subparsers.add_parser("scrape")
    update_parser = subparsers.add_parser("update-body")
    update_parser.add_argument("--data", required=True, help="JSON string of updates {name: body_type}")

    args = parser.parse_args()
    files_to_update = ["characters.js"]

    if args.command == "scrape" or args.command is None:
        existing_data = load_existing_data(files_to_update[0]) if files_to_update else {}
        scraped_data = scrape_characters(existing_data)

        all_new_keys = set()
        for file_path in files_to_update:
            new_keys = process_file(file_path, scraped_data)
            all_new_keys.update(new_keys)

        write_github_output(all_new_keys)
        return

    if args.command == "update-body":
        try:
            updates = json.loads(args.data)
        except json.JSONDecodeError:
            print("update-body 参数不是合法 JSON")
            sys.exit(1)

        update_body_types(updates, files_to_update)


if __name__ == "__main__":
    main()
