import argparse
import json
import os
import sys
from collections import OrderedDict

try:
    from pypinyin import Style, lazy_pinyin, load_phrases_dict, pinyin
except ImportError:
    lazy_pinyin = None
    Style = None
    load_phrases_dict = None
    pinyin = None


# 始终放在最后的组名
FORCED_LAST_GROUPS = {"崩铁"}

# 常见多音字词组纠正（通讯录排序希望与常用称呼一致）
PHRASE_PINYIN_OVERRIDES = {
    "重云": ["chong", "yun"],
    "八重神子": ["ba", "chong", "shen", "zi"],
    "乐平波琳": ["le", "ping", "bo", "lin"],
    "茜特菈莉": ["xi", "te", "la", "li"],
    "叶洛亚": ["ye", "luo", "ya"],
    "行秋": ["xing", "qiu"],
}


def apply_phrase_overrides():
    if load_phrases_dict is None:
        return
    phrase_dict_for_pypinyin = {
        name: [[syllable] for syllable in pinyins] for name, pinyins in PHRASE_PINYIN_OVERRIDES.items()
    }
    load_phrases_dict(phrase_dict_for_pypinyin)


def pinyin_sort_key(text):
    """Return a contact-like key: initials first, full pinyin second."""
    if text in PHRASE_PINYIN_OVERRIDES:
        full = PHRASE_PINYIN_OVERRIDES[text]
        initials = [p[0] if p else "" for p in full]
        return initials, full

    if lazy_pinyin is not None:
        py = lazy_pinyin(text, style=Style.NORMAL)
        full = [part.lower() for part in py]
        initials = [p[0] if p else "" for p in full]
        return initials, full

    # Fallback when pypinyin is unavailable.
    # GBK byte order is not perfect, but gives a predictable Chinese-friendly order.
    try:
        encoded = text.encode("gbk")
        return [encoded], [encoded]
    except UnicodeEncodeError:
        encoded = text.encode("utf-8")
        return [encoded], [encoded]


def sort_groups_by_pinyin(data):
    sorted_items = sorted(
        data.items(),
        key=lambda kv: (
            1 if str(kv[0]) in FORCED_LAST_GROUPS else 0,
            pinyin_sort_key(str(kv[0])),
            str(kv[0]),
        ),
    )
    return OrderedDict(sorted_items)


def print_override_hits(group_names):
    hits = [name for name in group_names if name in PHRASE_PINYIN_OVERRIDES]
    if not hits:
        print("[Check] No phrase overrides matched current groups.")
        return

    print(f"[Check] Phrase overrides matched: {len(hits)}")
    for name in hits:
        print(f"  - {name}: {' '.join(PHRASE_PINYIN_OVERRIDES[name])}")


def check_polyphonic_names(data):
    if pinyin is None or Style is None:
        print("[Info] pypinyin not installed, cannot run polyphonic check.")
        return

    print("[Check] Polyphonic candidates in group names:")
    count = 0
    for name in data.keys():
        candidate_parts = []
        for ch in str(name):
            variants = pinyin(ch, style=Style.NORMAL, heteronym=True)[0]
            uniq = []
            for py in variants:
                if py not in uniq:
                    uniq.append(py)
            if len(uniq) > 1:
                candidate_parts.append(f"{ch}:{'/'.join(uniq)}")

        if candidate_parts:
            chosen = " ".join(lazy_pinyin(str(name), style=Style.NORMAL))
            count += 1
            print(f"- {name} => {chosen} | {', '.join(candidate_parts)}")

    print(f"[Check] Total candidates: {count}")


def main():
    parser = argparse.ArgumentParser(
        description="Sort top-level groups in a JSON file by Chinese name pinyin (contact-list style)."
    )
    parser.add_argument(
        "input",
        nargs="?",
        default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "image_urls.json"),
        help="Input JSON path (default: ../image_urls.json)",
    )
    parser.add_argument(
        "-o",
        "--output",
        default=None,
        help="Output JSON path (default: overwrite input file)",
    )
    parser.add_argument(
        "--check-polyphonic",
        action="store_true",
        help="Check and print polyphonic-character candidates in group names.",
    )
    parser.add_argument(
        "--check-only",
        action="store_true",
        help="Only check and print override hits without writing output.",
    )
    args = parser.parse_args()

    input_path = os.path.abspath(args.input)
    output_path = os.path.abspath(args.output) if args.output else input_path

    if not os.path.exists(input_path):
        print(f"[Error] File not found: {input_path}")
        sys.exit(1)

    with open(input_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, dict):
        print("[Error] Top-level JSON value is not an object/dict.")
        sys.exit(1)

    apply_phrase_overrides()

    print_override_hits(list(data.keys()))

    if args.check_only:
        print("[Done] Check only, no file written.")
        return

    if args.check_polyphonic:
        check_polyphonic_names(data)

    sorted_data = sort_groups_by_pinyin(data)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(sorted_data, f, ensure_ascii=False, indent=4)

    print(f"[Done] Sorted {len(sorted_data)} groups by pinyin.")
    print(f"[Done] Output: {output_path}")

    if lazy_pinyin is None:
        print("[Hint] Install pypinyin for best contact-list style order: pip install pypinyin")


if __name__ == "__main__":
    main()
