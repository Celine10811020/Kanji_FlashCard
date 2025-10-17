# -*- coding: utf-8 -*-
"""
合併「第一課_漢字詞語表.xlsx … 第十一課_漢字詞語表.xlsx」(N5)
以及「N4_第一課_漢字詞語表.xlsx … N4_第二十課_漢字詞語表.xlsx」(N4)
到同一工作表，新增「第幾課」欄位（整數）。
輸出：合併_漢字詞語表.xlsx
需求：pip install pandas openpyxl
"""

import re
from pathlib import Path
import pandas as pd

# === 1) 參數設定 ===
# 放置檔案的資料夾（若就在同一路徑，留 '.'）
DATA_DIR = Path(".")

# 輸出檔名
OUTPUT_XLSX = DATA_DIR / "合併_漢字詞語表.xlsx"

# 可能的檔名樣式（同時支援 .xlsx 與常見手誤 .xslx）
PATTERNS = [
    "第*課_漢字詞語表.xlsx",
    "第*課_漢字詞語表.xslx",     # 手誤副檔名
    "N4_第*課_漢字詞語表.xlsx",
    "N4_第*課_漢字詞語表.xslx",   # 手誤副檔名
]

# 期望欄位（會自動對應、修正空白）
EXPECTED_COLS = ["漢字", "平假名", "中文意思"]


# === 2) 工具函式：中文數字轉整數（支援到 99+，此處足夠 1~20） ===
_CN_DIGIT = {"零":0,"〇":0,"一":1,"二":2,"兩":2,"三":3,"四":4,"五":5,"六":6,"七":7,"八":8,"九":9}
def chinese_numeral_to_int(s: str) -> int:
    s = s.strip()
    # 若包含阿拉伯數字，直接抓數字
    m = re.search(r"\d+", s)
    if m:
        return int(m.group())

    # 處理「十」「二十」「二十一」… 典型格式
    if "十" in s:
        left, right = s.split("十", 1)
        tens = _CN_DIGIT.get(left, 1) if left else 1  # 「十」= 10；「二十」= 20
        ones = _CN_DIGIT.get(right, 0) if right else 0
        return tens * 10 + ones

    # 單字數字（「一」「二」…）
    if len(s) == 1 and s in _CN_DIGIT:
        return _CN_DIGIT[s]

    # 再保險：逐字相加（用於較罕見寫法），但本案應不會用到
    total = 0
    for ch in s:
        if ch in _CN_DIGIT:
            total = total * 10 + _CN_DIGIT[ch]
    return total


# === 3) 從檔名抓出第幾課 ===
def extract_lesson_from_name(name: str) -> int:
    # e.g. "第十一課_漢字詞語表.xlsx" or "N4_第二十課_漢字詞語表.xslx"
    m = re.search(r"第([零〇一二兩三四五六七八九十\d]+)課", name)
    if not m:
        raise ValueError(f"檔名中找不到『第…課』：{name}")
    return chinese_numeral_to_int(m.group(1))


# === 4) 讀檔 + 整理欄位 ===
def read_one_excel(fp: Path) -> pd.DataFrame:
    df = pd.read_excel(fp, engine="openpyxl")
    # 去除欄名左右空白
    df.columns = [str(c).strip() for c in df.columns]

    # 嘗試對應中文欄位（容錯：有時會多空白或不同順序）
    col_map = {}
    for need in EXPECTED_COLS:
        # 直接匹配、或忽略全形/半形空白
        candidates = [c for c in df.columns if c.replace(" ", "") == need]
        if candidates:
            col_map[candidates[0]] = need
        else:
            # 寬鬆比對（包含相同關鍵詞）
            candidates = [c for c in df.columns if need in c]
            if candidates:
                col_map[candidates[0]] = need

    # 只保留與重命名必要欄
    df = df.rename(columns=col_map)
    missing = [c for c in EXPECTED_COLS if c not in df.columns]
    if missing:
        raise ValueError(f"{fp.name} 缺少欄位：{missing}，實際欄位={list(df.columns)}")

    # 新增「第幾課」
    lesson = extract_lesson_from_name(fp.name)
    df["第幾課"] = int(lesson)

    # 也可附帶一個等級欄位（N4/N5），你若不需要可刪掉下一行
    df["等級"] = "N4" if fp.name.startswith("N4_") else "N5"

    # 僅輸出需要的欄位順序（把等級與第幾課放最後）
    ordered = EXPECTED_COLS + ["第幾課", "等級"]
    return df[ordered]


def main():
    all_files = []
    for pat in PATTERNS:
        all_files.extend(sorted(DATA_DIR.glob(pat)))

    if not all_files:
        raise FileNotFoundError("找不到任何符合樣式的檔案，請確認檔名與資料夾位置。")

    # 先讓 N5 在前、N4 在後（或反之都可）
    all_files_sorted = sorted(all_files, key=lambda p: (p.name.startswith("N4_"), extract_lesson_from_name(p.name)))

    frames = []
    for fp in all_files_sorted:
        try:
            frames.append(read_one_excel(fp))
            print(f"讀取成功：{fp.name}")
        except Exception as e:
            print(f"讀取失敗：{fp.name} -> {e}")

    if not frames:
        raise RuntimeError("沒有任何檔案成功讀取。")

    merged = pd.concat(frames, ignore_index=True)

    # 去除可能的整列重複（同一課重複資料）
    merged = merged.drop_duplicates(subset=["漢字", "平假名", "中文意思", "第幾課", "等級"]).reset_index(drop=True)

    # 依等級、課次排序
    merged = merged.sort_values(by=["等級", "第幾課", "漢字", "平假名"]).reset_index(drop=True)

    # 寫出 Excel
    merged.to_excel(OUTPUT_XLSX, index=False)
    print(f"已輸出：{OUTPUT_XLSX.resolve()}")


if __name__ == "__main__":
    main()
