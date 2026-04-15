# -*- coding: utf-8 -*-
"""
按 index.html 各合集，将 _crx 内对应离线包打成 site/bundle/<名>.zip。
超过 MAX_PART_SRC_BYTES（默认 45MB 源文件合计，压缩后通常 <50MB）时拆成 name-part1.zip、name-part2.zip …
会译通过极简「推荐下载」链拉取。用法: python rebuild_bundles.py
"""
from __future__ import annotations

import http.cookiejar
import json
import os
import shutil
import urllib.request
import zipfile

ROOT = os.path.dirname(os.path.abspath(__file__))
CRX = os.path.join(ROOT, "_crx")
README = os.path.join(CRX, "安装说明书.txt")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36"

# 单卷内「源 zip 文件」合计上限（字节）；zip 打包后一般小于 50MB，便于 Git 托管
MAX_PART_SRC_BYTES = 45 * 1024 * 1024

HUIYI_TRIGGER = "https://huiyiai.net/hy_api/third/download?source=web_ad_jjcj"
HUIYI_LOCAL = "会译·对照式翻译_2.1.13_第三方分发.zip"


def ensure_huiyi_zip() -> str | None:
    dest = os.path.join(CRX, HUIYI_LOCAL)
    if os.path.isfile(dest) and os.path.getsize(dest) > 500_000:
        return HUIYI_LOCAL
    print("  [get] 会译·对照式翻译（huiyiai → cdn）…")
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    req = urllib.request.Request(
        HUIYI_TRIGGER,
        headers={
            "User-Agent": UA,
            "Referer": "https://chrome.zzzmh.cn/",
        },
    )
    with opener.open(req, timeout=180) as r, open(dest, "wb") as out:
        shutil.copyfileobj(r, out)
    if not os.path.isfile(dest) or os.path.getsize(dest) < 500_000:
        try:
            os.remove(dest)
        except OSError:
            pass
        return None
    return HUIYI_LOCAL


def collect_sources(rel_paths: list[str]) -> tuple[list[str], list[str]]:
    found: list[str] = []
    missing: list[str] = []
    for item in rel_paths:
        if item == "__huiyi__":
            h = ensure_huiyi_zip()
            if h:
                found.append(h)
            else:
                missing.append("会译·对照式翻译（第三方下载失败）")
            continue
        full = os.path.join(CRX, item.replace("/", os.sep))
        if os.path.isfile(full):
            found.append(item)
        else:
            missing.append(item)
    return found, missing


def _file_size(rel: str) -> int:
    return os.path.getsize(os.path.join(CRX, rel.replace("/", os.sep)))


def split_into_parts(found: list[str]) -> list[list[str]]:
    """按源文件体积贪心分卷，使每卷源文件合计不超过 MAX_PART_SRC_BYTES。"""
    if not found:
        return [[]]
    items = [(rel, _file_size(rel)) for rel in found]
    items.sort(key=lambda x: -x[1])
    parts: list[list[str]] = []
    cur: list[str] = []
    cur_sum = 0
    for rel, sz in items:
        if cur and cur_sum + sz > MAX_PART_SRC_BYTES:
            parts.append(cur)
            cur = []
            cur_sum = 0
        cur.append(rel)
        cur_sum += sz
    if cur:
        parts.append(cur)
    return parts


def _cleanup_old_outputs(name: str) -> None:
    single = os.path.join(ROOT, f"{name}.zip")
    if os.path.isfile(single):
        try:
            os.remove(single)
        except OSError:
            pass
    for fn in os.listdir(ROOT):
        if fn.startswith(f"{name}-part") and fn.endswith(".zip"):
            try:
                os.remove(os.path.join(ROOT, fn))
            except OSError:
                pass


def _write_zip(
    out_path: str,
    chunk: list[str],
    name: str,
    part_idx: int,
    total_parts: int,
    miss: list[str],
    notes: str,
    all_found: list[str],
) -> float:
    tmp_path = out_path + ".tmp"
    try:
        with zipfile.ZipFile(tmp_path, "w", zipfile.ZIP_DEFLATED) as zf:
            seen: set[str] = set()
            for rel in chunk:
                arc = os.path.basename(rel)
                if arc in seen:
                    continue
                seen.add(arc)
                disk = os.path.join(CRX, rel.replace("/", os.sep))
                zf.write(disk, arcname=arc)
            if os.path.isfile(README):
                zf.write(README, arcname="安装说明书.txt")
            manifest = [
                f"合集: {name}",
                f"分卷: 第 {part_idx}/{total_parts} 卷（请下载全部卷后解压使用）",
                "",
                "本卷内含：",
            ]
            manifest += [f"  - {os.path.basename(p)}" for p in chunk]
            manifest += ["", "完整合集所含全部插件："]
            manifest += [f"  - {os.path.basename(p)}" for p in all_found]
            if miss:
                manifest += ["", "缺失或下载失败："] + [f"  - {m}" for m in miss]
            if notes:
                manifest += ["", "说明：", notes]
            zf.writestr("本包文件清单.txt", "\n".join(manifest) + "\n")
        shutil.move(tmp_path, out_path)
        return os.path.getsize(out_path) / (1024 * 1024)
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass


def _chunk_item_basenames(chunk: list[str]) -> list[str]:
    """写入 manifest，供页面展示本卷内含插件包文件名。"""
    return [os.path.basename(p) for p in chunk]


def friendly_item_name(rel: str) -> str:
    """把路径/占位符转成页面展示的短中文名。"""
    if rel == "__huiyi__":
        return "会译·对照式翻译"
    base = os.path.basename(rel)
    low = base.casefold()
    # 先匹配更具体的子串
    rules: list[tuple[str, str]] = [
        ("沉浸式翻译", "沉浸式翻译"),
        ("豆包", "豆包浏览器AI助手"),
        ("deepsider", "DeepSider AI侧边栏"),
        ("沙拉查词", "沙拉查词"),
        ("saladict", "沙拉查词"),
        ("simpread", "简悦"),
        ("deepl", "DeepL"),
        ("circle", "Circle阅读助手"),
        ("linerchatgpt", "Liner"),
        ("微信读书助手", "微信读书助手"),
        ("猫抓", "猫抓"),
        ("globalspeed", "GlobalSpeed"),
        ("字幕精灵", "字幕精灵"),
        ("youtube 中文配音", "YouTube中文配音"),
        ("哔哩哔哩字幕", "哔哩哔哩字幕列表"),
        ("bitwarden", "Bitwarden"),
        ("lastpass", "LastPass"),
        ("隐私獾", "隐私獾"),
        ("ublock origin lite", "uBlock Origin Lite"),
        ("ublockorigin", "uBlock Origin"),
        ("adblock plus", "Adblock Plus"),
        ("adguard", "AdGuard"),
        ("adblock", "AdBlock"),
        ("ublacklist", "uBlacklist"),
        ("谷歌上网助手", "谷歌上网助手"),
        ("proxy switchy", "Proxy Switchy Omega"),
        ("switchyd", "SwitchyD"),
        ("octotree", "Octotree"),
        ("集装箱", "集装箱"),
        ("暴力猴", "暴力猴"),
        ("写作猫", "写作猫"),
        ("彩云小译", "彩云小译"),
        ("ie tab", "IE Tab"),
        ("wetab", "WeTab"),
        ("infinity", "Infinity"),
        ("itab", "iTab"),
        ("momentum", "Momentum"),
        ("酸柠檬", "酸柠檬新标签页"),
        ("小舒同学", "小舒同学"),
        ("fireshot", "FireShot"),
        ("screenity", "Screenity"),
        ("gofullpage", "GoFullPage"),
        ("sider_chatgpt", "Sider"),
        ("monica", "Monica"),
        ("react developer", "React DevTools"),
        ("vue.js devtools", "Vue Devtools"),
        ("tampermonkey", "Tampermonkey"),
        ("身份验证器", "身份验证器"),
        ("vimium", "Vimium"),
        ("powerful pixiv", "Pixiv批量下载"),
        ("pixiv工具箱", "Pixiv Toolkit"),
        ("视频去水印", "视频去水印"),
        ("极致短视频", "极致短视频"),
        ("stylus", "Stylus"),
        ("idm integration", "IDM"),
        ("chrono", "Chrono"),
        ("抖珍藏", "抖珍藏"),
    ]
    for needle, label in rules:
        if needle in low:
            return label
    b = base.replace(".zip", "").replace(".ZIP", "")
    for suf in ("_Chrome插件下载_极简插件", " Chrome插件下载", "_Chrome插件下载"):
        if suf in b:
            b = b.split(suf)[0]
            break
    return b if len(b) <= 40 else b[:39] + "…"


def _sort_chunk_for_title(bundle: str, chunk: list[str]) -> list[str]:
    """同一卷内插件名展示顺序（与分卷贪心顺序无关）。"""

    def rank_office(rel: str) -> int:
        if rel == "__huiyi__" or "会译" in os.path.basename(rel):
            return 2
        if "沉浸式翻译" in rel:
            return 0
        if "豆包" in rel:
            return 1
        if "DeepSider" in rel or "deepsider" in rel.casefold():
            return 3
        if "沙拉" in rel or "saladict" in rel.casefold():
            return 4
        return 50

    def rank_student(rel: str) -> int:
        if rel == "__huiyi__" or "会译" in os.path.basename(rel):
            return 1
        if "沉浸式翻译" in rel:
            return 0
        if "微信读书" in rel:
            return 2
        if "dark reader" in rel.casefold():
            return 3
        if "网费很贵" in rel:
            return 4
        return 50

    def rank_ai(rel: str) -> int:
        low = rel.casefold()
        if "deepsider" in low:
            return 1
        if "sider" in low and "deepsider" not in low:
            return 0
        if "豆包" in rel:
            return 2
        if "monica" in low:
            return 3
        return 50

    def rank_password(rel: str) -> int:
        low = rel.casefold()
        if "bitwarden" in low:
            return 0
        if "lastpass" in low:
            return 1
        if "隐私" in rel:
            return 2
        return 50

    def rank_reading(rel: str) -> int:
        low = rel.casefold()
        if "simpread" in low:
            return 0
        if "deepl" in low:
            return 1
        if "circle" in low:
            return 2
        if "linerchatgpt" in low:
            return 3
        if "微信读书" in rel:
            return 4
        return 50

    def rank_adblock(rel: str) -> int:
        low = os.path.basename(rel).casefold()
        if "lite" in low and "ublock" in low:
            return 5
        if "ublacklist" in low:
            return 4
        if "adblock plus" in low:
            return 1
        if "adguard" in low:
            return 2
        if "adblock" in low and "plus" not in low:
            return 3
        if "ublockorigin" in low or low == "ublockorigin.zip":
            return 0
        return 50

    rankers: dict[str, object] = {
        "office": rank_office,
        "student": rank_student,
        "ai": rank_ai,
        "password": rank_password,
        "reading": rank_reading,
        "adblock": rank_adblock,
    }
    rfn = rankers.get(bundle)
    if rfn:
        return sorted(chunk, key=lambda x: (rfn(x), friendly_item_name(x)))  # type: ignore[arg-type,operator]
    return sorted(chunk, key=lambda x: friendly_item_name(x))


def _chunk_title_zh(bundle: str, chunk: list[str]) -> str:
    ordered = _sort_chunk_for_title(bundle, chunk)
    return " + ".join(friendly_item_name(p) for p in ordered)


def _part_entry(fname: str, mb: float, chunk: list[str], bundle: str) -> dict[str, object]:
    title_zh = _chunk_title_zh(bundle, chunk)
    return {
        "file": fname,
        "mb": round(mb, 1),
        "items": _chunk_item_basenames(chunk),
        "title_zh": title_zh,
        "title_en": title_zh,
    }


def make_bundle(name: str, members: list[str], notes: str) -> list[dict]:
    """生成 1 个 name.zip 或多个 name-partN.zip。返回 [{file, mb, items}, ...] 供 manifest。"""
    found, miss = collect_sources(members)
    _cleanup_old_outputs(name)
    parts = split_into_parts(found)
    if len(parts) == 1:
        out = os.path.join(ROOT, f"{name}.zip")
        mb = _write_zip(out, parts[0], name, 1, 1, miss, notes, found)
        print(f"  -> {name}.zip ({mb:.1f} MB, {len(found)} 个插件包)")
        return [_part_entry(f"{name}.zip", mb, parts[0], name)]
    outs: list[dict] = []
    for i, chunk in enumerate(parts, start=1):
        fname = f"{name}-part{i}.zip"
        out = os.path.join(ROOT, fname)
        mb = _write_zip(out, chunk, name, i, len(parts), miss, notes, found)
        outs.append(_part_entry(fname, mb, chunk, name))
        print(f"  -> {fname} ({mb:.1f} MB, {len(chunk)} 个插件包)")
    return outs


NOTE_MANUAL = (
    "本页另有 Obsidian / Joplin / Notion / Evernote / Cubox / Hypothesis / Yandex Notes 等剪藏插件，"
    "当前 _crx 目录无对应离线包。请到 https://chrome.zzzmh.cn 搜索名称下载后自行安装。"
)

BUNDLES: dict[str, tuple[list[str], str]] = {
    "developer": (
        [
            "React Developer Tools_7.0.110_20_2025_Chrome插件下载_极简插件.zip",
            "Vue.js Devtools_7.7.7_Chrome插件下载_极简插件.zip",
            "Tampermonkey 篡改猴(油猴脚本)_5.4.1_Chrome插件下载_极简插件.zip",
            "Octotree GitHub code tree_8.2.4_Chrome插件下载_极简插件.zip",
            "身份验证器_8.0.1_Chrome插件下载_极简插件.zip",
            "Vimium_2.3.1_Chrome插件下载_极简插件.zip",
        ],
        "",
    ),
    "security": (
        [
            "security/uBlockOrigin_1.68.0_Chrome插件下载_极简插件.zip",
            "security/Dark Reader_4.9.118_Chrome插件下载_极简插件.zip",
            "security/隐私獾_2025.12.9_Chrome插件下载_极简插件.zip",
        ],
        "",
    ),
    "office": (
        [
            "__huiyi__",
            "沉浸式翻译_双语对照网页翻译&PDF文档翻译_1.24.6_Chrome插件下载_极简插件.zip",
            "豆包 浏览器AI助手_1.34.0_Chrome插件下载_极简插件.zip",
            "DeepSider™_AI侧边栏_ DeepSeek, Gemini, Claude, GPT_2.6.2_Chrome插件下载_极简插件.zip",
            "Saladict 沙拉查词 聚合词典划词翻译_7.20.0_Chrome插件下载_极简插件.zip",
        ],
        "",
    ),
    "student": (
        [
            "__huiyi__",
            "沉浸式翻译_双语对照网页翻译&PDF文档翻译_1.24.6_Chrome插件下载_极简插件.zip",
            "微信读书助手_0.0.27_Chrome插件下载_极简插件.zip",
            "Dark Reader_4.9.118_Chrome插件下载_极简插件.zip",
            "网费很贵-上网时间统计_3.7.11_Chrome插件下载_极简插件.zip",
        ],
        "会译 zip 与办公包相同一份文件，便于两栏各自下载完整依赖。",
    ),
    "media": (
        [
            "猫抓.zip",
            "Powerful Pixiv Downloader_18.2.0_Chrome插件下载_极简插件.zip",
            "视频去水印.zip",
            "Pixiv工具箱_6.4.2_Chrome插件下载_极简插件.zip",
        ],
        "页面中的「极致短视频」暂无单独离线文件名，此处用「视频去水印」替代。",
    ),
    "designer": (
        [
            "猫抓.zip",
            "Dark Reader_4.9.118_Chrome插件下载_极简插件.zip",
            "Stylus Beta_3.3.18_Chrome插件下载_极简插件.zip",
            "酸柠檬新标签页_2.5_Chrome插件下载_极简插件.zip",
            "WeTab AI新标签页_2.2.34_Chrome插件下载_极简插件.zip",
        ],
        "",
    ),
    "ai": (
        [
            "Sider_ChatGPT.zip",
            "DeepSider™_AI侧边栏_ DeepSeek, Gemini, Claude, GPT_2.6.2_Chrome插件下载_极简插件.zip",
            "豆包 浏览器AI助手_1.34.0_Chrome插件下载_极简插件.zip",
            "Monica ChatGPT AI助手 GPT-4o Claude 3.5 Gemini 1.5 o1.zip",
        ],
        "Merlin AI 在极简站无稳定离线 id，请到 Chrome 应用店或极简站内搜索「Merlin」单独获取。",
    ),
    "password": (
        [
            "Bitwarden 免费密码管理器.zip",
            "LastPass 免费密码管理工具.zip",
            "security/隐私獾_2025.12.9_Chrome插件下载_极简插件.zip",
        ],
        "1Password 在极简站当前无详情页，请从官网或 Chrome 商店安装。",
    ),
    "note": (
        ["LinerChatGPT Web&YouTube的AI副驾驶.zip"],
        NOTE_MANUAL,
    ),
    "reading": (
        [
            "SimpRead.zip",
            "DeepL 翻译：阅读写作翻译器.zip",
            "Circle 阅读助手.zip",
            "LinerChatGPT Web&YouTube的AI副驾驶.zip",
            "微信读书助手_0.0.27_Chrome插件下载_极简插件.zip",
        ],
        "Hypothesis 暂无本地包，请至 https://chrome.zzzmh.cn 搜索「Hypothesis」下载。",
    ),
    "video": (
        [
            "GlobalSpeed 视频速度控制.zip",
            "字幕精灵 实时语音识别 AI字幕翻译.zip",
            "YouTube 中文配音.zip",
            "哔哩哔哩字幕列表.zip",
        ],
        "Enhancer for YouTube 暂无本地包，请至极简站或 Chrome 商店搜索安装。",
    ),
    "adblock": (
        [
            "uBlockOrigin.zip",
            "Adblock Plus 免费的广告拦截器.zip",
            "AdGuard 广告拦截器.zip",
            "AdBlock 最佳广告拦截工具.zip",
            "uBlacklist.zip",
            "uBlock Origin Lite.zip",
        ],
        "共 6 款。",
    ),
    "vpn": (
        [
            "谷歌上网助手开发版.zip",
            "Proxy Switchy Omega.zip",
            "switchyd.zip",
            "Octotree GitHub code tree_8.2.4_Chrome插件下载_极简插件.zip",
            "security/uBlockOrigin_1.68.0_Chrome插件下载_极简插件.zip",
        ],
        "含「GitHub 加速」Octotree 与 uBlock Origin。",
    ),
    "screenshot": (
        [
            "FireShot.zip",
            "Screenity.zip",
            "GoFullPage.zip",
        ],
        "Awesome Screenshot 暂无本地极简包，请至 chrome.zzzmh.cn 搜索安装。",
    ),
    "download": (
        [
            "猫抓.zip",
            "IDM Integration Module.zip",
            "Chrono下载管理器.zip",
            "视频去水印.zip",
            "抖珍藏 下载备份你爱过的所有抖音.zip",
        ],
        "Image Downloader 暂无本地包，请至极简站搜索安装。",
    ),
    "efficiency": (
        [
            "集装箱.zip",
            "暴力猴.zip",
            "Saladict 沙拉查词 聚合词典划词翻译_7.20.0_Chrome插件下载_极简插件.zip",
            "IE Tab.zip",
            "写作猫浏览器插件.zip",
            "彩云小译 网页翻译插件.zip",
        ],
        "",
    ),
    "newtab": (
        [
            "WeTab AI新标签页_2.2.34_Chrome插件下载_极简插件.zip",
            "Infinity 新标签页 Pro.zip",
            "iTab 新标签页 免费ChatGPT.zip",
            "Momentum 新标签页.zip",
            "酸柠檬新标签页_2.5_Chrome插件下载_极简插件.zip",
            "小舒同学 基于书签的新标签页.zip",
        ],
        "",
    ),
}

# 与 index 中 data-bundle 一致；写入 bundle-manifest.json 供前端展示
BUNDLE_PAGE_LABELS: dict[str, dict[str, str]] = {
    "developer": {"zh_main": "一键打包下载", "en_main": "Bundle Download", "zh_sub": "(6款)", "en_sub": "(6)"},
    "security": {"zh_main": "一键打包下载", "en_main": "Bundle Download", "zh_sub": "(3款)", "en_sub": "(3)"},
    "office": {"zh_main": "一键打包下载", "en_main": "Bundle Download", "zh_sub": "(5款)", "en_sub": "(5)"},
    "student": {"zh_main": "一键打包下载", "en_main": "Bundle Download", "zh_sub": "(5款)", "en_sub": "(5)"},
    "media": {"zh_main": "一键打包下载", "en_main": "Bundle Download", "zh_sub": "(4款)", "en_sub": "(4)"},
    "designer": {"zh_main": "一键打包下载", "en_main": "Bundle Download", "zh_sub": "(5款)", "en_sub": "(5)"},
    "screenshot": {"zh_main": "一键打包下载", "en_main": "Bundle Download", "zh_sub": "(3款离线)", "en_sub": "(3 offline)"},
    "ai": {"zh_main": "一键打包下载", "en_main": "Bundle Download", "zh_sub": "(4款)", "en_sub": "(4)"},
    "password": {"zh_main": "一键打包下载", "en_main": "Bundle Download", "zh_sub": "(3款)", "en_sub": "(3)"},
    "note": {"zh_main": "一键打包下载", "en_main": "Bundle Download", "zh_sub": "(1款离线包)", "en_sub": "(1 offline)"},
    "reading": {"zh_main": "一键打包下载", "en_main": "Bundle Download", "zh_sub": "(5款)", "en_sub": "(5)"},
    "video": {"zh_main": "一键打包下载", "en_main": "Bundle Download", "zh_sub": "(4款离线)", "en_sub": "(4 offline)"},
    "download": {"zh_main": "一键打包下载", "en_main": "Bundle Download", "zh_sub": "(5款离线)", "en_sub": "(5 offline)"},
    "efficiency": {"zh_main": "一键打包下载", "en_main": "Bundle Download", "zh_sub": "(6款)", "en_sub": "(6)"},
    "newtab": {"zh_main": "一键打包下载", "en_main": "Bundle Download", "zh_sub": "(6款)", "en_sub": "(6)"},
    "adblock": {"zh_main": "一键打包下载", "en_main": "Bundle Download", "zh_sub": "(6款)", "en_sub": "(6)"},
    "vpn": {"zh_main": "一键打包下载", "en_main": "Bundle Download", "zh_sub": "(5款)", "en_sub": "(5)"},
}


def main() -> None:
    os.makedirs(CRX, exist_ok=True)
    print("CRX:", CRX)
    manifest: dict[str, object] = {"parts": {}, "labels": BUNDLE_PAGE_LABELS}
    for name, (members, notes) in BUNDLES.items():
        print(f"\n=== {name} ===")
        manifest["parts"][name] = make_bundle(name, members, notes)  # type: ignore[index]
    man_path = os.path.join(ROOT, "bundle-manifest.json")
    with open(man_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print("\n完成。输出:", ROOT)
    print("分卷说明已写入 bundle-manifest.json")
    print("提示：若分包数量/文件名有变，请同步更新站点根目录 index.html 里各 .bundle-slot 的 data-parts（与 manifest.parts 一致）。")


if __name__ == "__main__":
    main()
