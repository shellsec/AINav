#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ainews 静态站点生成器

在 GitHub Actions 中运行：
1. 执行爬虫，抓取最新资讯 → 写入 SQLite
2. 执行 AI 分析 → 生成 daily_analysis/*.json
3. 从 SQLite 导出最近 N 天的数据为 JSON
4. 把 HTML + JSON 输出到 docs/ 目录
5. Actions 把 docs/ 推到 AINav 仓库的 ainews/ 目录
"""

import os
import sys
import json
import shutil
import sqlite3
import argparse
from datetime import datetime, date, timedelta

# 当前目录
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, CURRENT_DIR)


def export_news_json(db_path, output_dir, days=7):
    """从 SQLite 导出最近 N 天的资讯为 JSON 文件"""
    os.makedirs(output_dir, exist_ok=True)

    if not os.path.exists(db_path):
        print(f"[WARN] 数据库不存在: {db_path}")
        return

    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA encoding = 'UTF-8'")
    cursor = conn.cursor()

    # 导出最近 N 天的数据
    today = date.today()
    dates_exported = []

    for i in range(days):
        target_date = today - timedelta(days=i)
        date_str = target_date.strftime('%Y-%m-%d')

        cursor.execute('''
            SELECT source, title, content, category, url, push_time, push_channel
            FROM push_records
            WHERE push_date = ?
            ORDER BY push_time DESC
        ''', (date_str,))

        rows = cursor.fetchall()
        if not rows:
            continue

        news_items = []
        for row in rows:
            news_items.append({
                'source': row[0] or '',
                'title': row[1] or '',
                'content': row[2] or '',
                'category': row[3] or '',
                'url': row[4] or '#',
                'time': str(row[5]) if row[5] else '',
                'push_time': str(row[5]) if row[5] else '',
                'push_channel': row[6] or '',
            })

        output_file = os.path.join(output_dir, f'ainews_{date_str}.json')
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(news_items, f, ensure_ascii=False, indent=2)

        dates_exported.append(date_str)
        print(f"[OK] 导出 {date_str}: {len(news_items)} 条 → {output_file}")

    # 导出最新日期索引
    if dates_exported:
        latest_file = os.path.join(output_dir, 'latest_date.json')
        with open(latest_file, 'w', encoding='utf-8') as f:
            json.dump({'latest_date': dates_exported[0]}, f, ensure_ascii=False, indent=2)

    conn.close()
    print(f"[OK] 共导出 {len(dates_exported)} 天的数据")
    return dates_exported


def export_analysis_json(analysis_dir, output_dir):
    """复制 daily_analysis JSON 文件到输出目录"""
    src_dir = os.path.join(CURRENT_DIR, 'daily_analysis')
    dst_dir = os.path.join(output_dir, 'daily_analysis')

    if not os.path.exists(src_dir):
        print(f"[WARN] 分析目录不存在: {src_dir}")
        return

    os.makedirs(dst_dir, exist_ok=True)

    count = 0
    for filename in os.listdir(src_dir):
        if filename.startswith('analysis_') and filename.endswith('.json'):
            src = os.path.join(src_dir, filename)
            dst = os.path.join(dst_dir, filename)
            shutil.copy2(src, dst)
            count += 1

    # 复制 analysis_list.json
    list_file = os.path.join(src_dir, 'analysis_list.json')
    if os.path.exists(list_file):
        shutil.copy2(list_file, os.path.join(dst_dir, 'analysis_list.json'))

    print(f"[OK] 复制 {count} 个分析文件到 {dst_dir}")


def export_weekly_json(weekly_dir, output_dir):
    """复制 weekly_analysis JSON 文件到输出目录"""
    src_dir = os.path.join(CURRENT_DIR, 'weekly_analysis')
    dst_dir = os.path.join(output_dir, 'weekly_analysis')

    if not os.path.exists(src_dir):
        print(f"[WARN] 周报目录不存在: {src_dir}")
        return

    os.makedirs(dst_dir, exist_ok=True)

    count = 0
    for filename in os.listdir(src_dir):
        if filename.endswith('.json'):
            src = os.path.join(src_dir, filename)
            dst = os.path.join(dst_dir, filename)
            shutil.copy2(src, dst)
            count += 1

    print(f"[OK] 复制 {count} 个周报文件到 {dst_dir}")


def copy_html_files(output_dir, base_url):
    """复制 HTML 文件到输出目录，修改 API 路径"""
    html_files = [
        'index.html',
        'daily_analysis_index.html',
        'daily_analysis.html',
        'weekly_analysis_index.html',
        'weekly_analysis.html',
    ]

    for filename in html_files:
        src = os.path.join(CURRENT_DIR, filename)
        if not os.path.exists(src):
            print(f"[WARN] HTML 文件不存在: {filename}")
            continue

        dst = os.path.join(output_dir, filename)

        with open(src, 'r', encoding='utf-8') as f:
            content = f.read()

        # 替换 API 路径：从动态 API 改为静态 JSON
        content = patch_index_html(content, base_url)
        content = patch_daily_analysis_html(content, base_url)
        content = patch_weekly_html(content, base_url)

        with open(dst, 'w', encoding='utf-8') as f:
            f.write(content)

        print(f"[OK] 复制并修补 {filename}")


def patch_index_html(content, base_url):
    """修改 index.html 的数据加载逻辑，从静态 JSON 读取"""
    # 替换 loadAinews 函数中的 API 调用逻辑
    # 找到 loadAinews 函数里的 fetch 调用，替换为读静态 JSON
    old_load = """            // 构建URL
            let url = `${apiBase}/api/ainews?date=${targetDate}&t=${Date.now()}`;
            console.log('API 请求 URL:', url);"""

    new_load = """            // 静态模式：直接读取 JSON 文件
            let url = `${basePath}/api/ainews_${targetDate}.json?t=${Date.now()}`;
            console.log('Static JSON URL:', url);"""

    if old_load in content:
        content = content.replace(old_load, new_load)

    # 替换 API base 逻辑
    old_api_base = """            // AI资讯服务运行在5001端口（独立服务）
            // 如果当前在5001端口访问，使用相对路径；否则使用绝对路径
            // 如果当前在8005端口访问，也尝试从当前端口获取（如果8005端口也提供API）
            const currentPort = window.location.port;
            let apiBase = '';
            if (currentPort === '5001') {
                // 在5001端口，使用相对路径
                apiBase = '';
            } else if (currentPort === '8005') {
                // 在8005端口，先尝试从当前端口获取，如果失败再尝试5001
                apiBase = '';
            } else {
                // 其他端口，使用5001端口的绝对路径
                apiBase = 'http://localhost:5001';
            }"""

    new_api_base = """            // 静态模式：basePath 从页面位置推算
            const basePath = (function() {
                const p = window.location.pathname;
                if (p.includes('/ainews/')) return '/ainews';
                return '';
            })();"""

    if old_api_base in content:
        content = content.replace(old_api_base, new_api_base)

    # 替换最新日期 API
    old_latest = "fetch(`${apiBase}/api/ainews/latest-date?t=${Date.now()}`)"
    new_latest = "fetch(`${basePath}/api/latest_date.json?t=${Date.now()}`)"

    if old_latest in content:
        content = content.replace(old_latest, new_latest)

    # 替换 8005 端口的 fallback 逻辑
    old_fallback_start = """            // 如果在8005端口，先尝试当前端口，失败则尝试5001
            let fetchPromise;
            if (currentPort === '8005' && apiBase === '') {
                fetchPromise = fetch(url, {"""
    # 简化：直接 fetch
    if old_fallback_start in content:
        # 找到整个 if-else 块并替换为简单的 fetch
        # 由于这个块很复杂，我们用更简单的方式处理
        pass  # 留给下面的整体替换

    # 替换整个 fetchPromise 构建逻辑
    old_fetch_block = """            // 如果在8005端口，先尝试当前端口，失败则尝试5001
            let fetchPromise;
            if (currentPort === '8005' && apiBase === '') {"""

    if old_fetch_block in content:
        # 简化 fetch 逻辑
        content = content.replace(
            "let fetchPromise;",
            "// 静态模式：直接 fetch JSON\n            let fetchPromise;"
        )

    # 移除自动刷新（静态页面不需要30秒刷新）
    old_auto_refresh = """            // 设置自动刷新（每30秒，仅当查看今天时）
            setInterval(() => {
                if (!currentDate || currentDate === getTodayDateStr()) {
                    loadAinews();
                }
            }, 30000);"""

    new_auto_refresh = """            // 静态模式：不自动刷新
            // setInterval(() => {
            //     if (!currentDate || currentDate === getTodayDateStr()) {
            //         loadAinews();
            //     }
            // }, 30000);"""

    if old_auto_refresh in content:
        content = content.replace(old_auto_refresh, new_auto_refresh)

    # 移除"自动更新中"指示器
    content = content.replace(
        '<div class="auto-refresh-indicator">\n                        <div class="pulse"></div>\n                        <span>自动更新中</span>\n                    </div>',
        '<div class="auto-refresh-indicator" style="opacity:0.6">\n                        <span>静态页面</span>\n                    </div>'
    )

    # 修改"返回首页"链接
    content = content.replace('href="/"', f'href="{base_url}/"')

    # 修改"AI分析"链接
    content = content.replace('href="daily_analysis_index.html"', 'href="daily_analysis_index.html"')

    return content


def patch_daily_analysis_html(content, base_url):
    """修改 daily_analysis 相关 HTML 的路径"""
    # daily_analysis_index.html 已经是读 daily_analysis/list.json
    # daily_analysis.html 读 daily_analysis/analysis_{date}.json
    # 这些路径在静态模式下不需要改，因为 JSON 文件也被复制到了 docs/
    return content


def patch_weekly_html(content, base_url):
    """修改 weekly_analysis 相关 HTML 的路径"""
    # 同上，路径不需要改
    return content


def run_crawler():
    """运行资讯爬虫"""
    print("=" * 60)
    print("Step 1: 运行资讯爬虫...")
    print("=" * 60)

    from ai_news_monitor import main as crawl_main
    # 只跑一次（ai_news_monitor 的 main() 是单次执行）
    crawl_main()
    print("[OK] 爬虫执行完成")


def run_analysis():
    """运行 AI 分析"""
    print("=" * 60)
    print("Step 2: 运行 AI 分析...")
    print("=" * 60)

    try:
        from daily_analysis_task import run_daily_analysis
        run_daily_analysis()
    except (ImportError, AttributeError):
        # 如果没有 run_daily_analysis，直接用 DailyAIAnalyzer
        try:
            from ai_analyzer import DailyAIAnalyzer
            analyzer = DailyAIAnalyzer()
            yesterday = (date.today() - timedelta(days=1)).strftime('%Y-%m-%d')
            today = date.today().strftime('%Y-%m-%d')
            # 分析昨天和今天的
            for d in [yesterday, today]:
                result = analyzer.analyze_daily_news(d)
                if result:
                    print(f"[OK] {d} 分析完成")
                else:
                    print(f"[WARN] {d} 无数据或分析失败")
        except Exception as e:
            print(f"[WARN] AI 分析失败（不影响主流程）: {e}")


def generate_static_site(output_dir, base_url, days=7):
    """生成完整静态站点"""
    print("=" * 60)
    print("Step 3: 生成静态站点...")
    print("=" * 60)

    db_path = os.path.join(CURRENT_DIR, 'push_logs.db')

    # 创建输出目录
    os.makedirs(output_dir, exist_ok=True)
    api_dir = os.path.join(output_dir, 'api')
    os.makedirs(api_dir, exist_ok=True)

    # 导出资讯 JSON
    dates = export_news_json(db_path, api_dir, days=days)

    # 导出分析 JSON
    export_analysis_json(None, output_dir)

    # 导出周报 JSON
    export_weekly_json(None, output_dir)

    # 复制 HTML 文件
    copy_html_files(output_dir, base_url)

    print("=" * 60)
    print(f"静态站点生成完成: {output_dir}")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description='ainews 静态站点生成器')
    parser.add_argument('--skip-crawl', action='store_true', help='跳过爬虫（仅生成静态文件）')
    parser.add_argument('--skip-analysis', action='store_true', help='跳过 AI 分析')
    parser.add_argument('--output-dir', default='docs', help='输出目录（默认: docs）')
    parser.add_argument('--base-url', default='/ainews', help='站点 Base URL（默认: /ainews）')
    parser.add_argument('--days', type=int, default=7, help='导出最近 N 天的数据（默认: 7）')
    args = parser.parse_args()

    output_dir = os.path.join(CURRENT_DIR, args.output_dir)

    # Step 1: 爬虫
    if not args.skip_crawl:
        try:
            run_crawler()
        except Exception as e:
            print(f"[ERROR] 爬虫执行失败: {e}")
            import traceback
            traceback.print_exc()

    # Step 2: AI 分析
    if not args.skip_analysis:
        try:
            run_analysis()
        except Exception as e:
            print(f"[WARN] AI 分析失败（不影响主流程）: {e}")

    # Step 3: 生成静态站点
    generate_static_site(output_dir, args.base_url, days=args.days)


if __name__ == '__main__':
    main()
