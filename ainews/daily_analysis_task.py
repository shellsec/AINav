#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI新闻每日分析任务调度器
默认每天00:05执行，分析前一天的新闻
"""

import schedule
import time
import json
import os
from datetime import datetime, timedelta
from ai_analyzer import DailyAIAnalyzer
import traceback

def is_daily_analysis_enabled():
    """检查每日分析是否启用"""
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        config_path = os.path.join(current_dir, 'ai_analysis_config.json')
        if not os.path.exists(config_path):
            return False
        
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        ai_config = config.get('ai_analysis', {})
        return bool(ai_config.get('daily_analysis_enabled', True))
    except:
        return True

def daily_analysis_job():
    """每日分析任务"""
    if not is_daily_analysis_enabled():
        print(f"⏭️ 每日分析功能未启用，跳过执行")
        return
    
    try:
        analyzer = DailyAIAnalyzer()
        
        # 检查AI分析器状态
        print(f"📊 AI分析器状态:")
        print(f"   enabled: {analyzer.ai_analyzer.enabled}")
        print(f"   api_key: {'已配置' if analyzer.ai_analyzer.api_key else '未配置'}")
        print(f"   api_base: {analyzer.ai_analyzer.api_base}")
        print(f"   model: {analyzer.ai_analyzer.model}")
        print(f"   fallback_to_keywords: {analyzer.ai_analyzer.fallback_to_keywords}")
        
        # 分析前一天的新闻（确保数据完整）
        now = datetime.now()
        target_date = (now - timedelta(days=1)).strftime('%Y-%m-%d')
        
        print(f"\n{'='*60}")
        print(f"🤖 开始执行AI新闻每日分析任务")
        print(f"   目标日期: {target_date}")
        print(f"   执行时间: {now.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*60}")
        
        result = analyzer.analyze_daily_news(target_date)
        
        if result:
            analysis = result.get('analysis', {})
            print(f"✅ 每日分析任务完成: {target_date}")
            print(f"   分析方法: {result.get('analysis_method', 'unknown')}")
            print(f"   新闻数量: {result.get('news_count', 0)}")
            if analysis:
                print(f"   技术发展热度: {analysis.get('overall_sentiment', '未知')} ({analysis.get('sentiment_score', 0)}分)")
                print(f"   重要新闻: {len(analysis.get('top_news', []))}条")
        else:
            print(f"⚠️ 每日分析任务完成，但未生成结果: {target_date}")
            print(f"   可能原因: 1) 该日期没有新闻数据 2) AI分析失败且未启用降级处理")
        
        # 生成分析列表文件（用于索引页面）
        try:
            from generate_analysis_list import generate_analysis_list
            generate_analysis_list()
        except Exception as e:
            print(f"⚠️ 生成分析列表失败: {e}")
            
    except Exception as e:
        print(f"❌ 每日分析任务失败: {e}")
        traceback.print_exc()

def main():
    """主函数"""
    print("🚀 AI新闻每日分析任务调度器启动")
    print(f"当前时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 检查是否启用
    if not is_daily_analysis_enabled():
        print("⚠️ 每日分析功能未启用（ai_analysis.daily_analysis_enabled = false）")
        print("   如需启用，请在 ai_analysis_config.json 中设置:")
        print('   "ai_analysis": { "daily_analysis_enabled": true }')
        print("   程序将退出，不会执行定时任务\n")
        return
    
    # 获取配置中的执行时间
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        config_path = os.path.join(current_dir, 'ai_analysis_config.json')
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        ai_config = config.get('ai_analysis', {})
        analysis_time = ai_config.get('daily_analysis_time', '00:05')
    except:
        analysis_time = '00:05'
    
    # 每天指定时间执行
    schedule.every().day.at(analysis_time).do(daily_analysis_job)
    
    # 启动时立即执行一次（测试用，可选）
    import sys
    if '--run-now' in sys.argv:
        print("🚀 立即执行一次分析任务...")
        daily_analysis_job()
        print("\n" + "="*60 + "\n")
    
    print(f"⏰ 定时任务已设置: 每天{analysis_time}执行")
    print(f"📅 分析策略: 分析前一天的新闻数据（确保数据完整）")
    print("💡 提示: 使用 'python daily_analysis_task.py --run-now' 可以立即执行一次分析")
    print("按 Ctrl+C 退出\n")
    
    # 保持运行
    while True:
        schedule.run_pending()
        time.sleep(60)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n👋 任务调度器已停止")
