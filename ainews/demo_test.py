#!/usr/bin/python
# -*- coding: UTF-8 -*-
"""
演示脚本 - 展示日报系统的功能
"""

from push_logger import push_logger
from daily_report_generator import DailyReportGenerator
from analytics import PushAnalytics
from datetime import datetime, date

def demo_add_sample_data():
    """添加一些示例数据用于演示"""
    print("添加示例数据...")
    
    # 示例数据
    sample_data = [
        {
            "source": "OpenAI",
            "title": "GPT-4 Turbo 性能优化更新",
            "content": "📰 GPT-4 Turbo 性能优化更新\n📅 发布时间: 2025-07-15\n📋 分类: AI模型\n🔗 链接: https://openai.com/blog/gpt-4-turbo-update",
            "category": "AI模型",
            "url": "https://openai.com/blog/gpt-4-turbo-update"
        },
        {
            "source": "Anthropic",
            "title": "Claude 3.5 Sonnet 推理能力提升",
            "content": "📰 Claude 3.5 Sonnet 推理能力提升\n📅 发布时间: 2025-07-15\n📋 分类: AI模型\n🔗 链接: https://anthropic.com/news/claude-3-5-sonnet-reasoning",
            "category": "AI模型",
            "url": "https://anthropic.com/news/claude-3-5-sonnet-reasoning"
        },
        {
            "source": "HuggingFace",
            "title": "新增开源大模型 Llama-3-70B-Instruct",
            "content": "📰 新增开源大模型 Llama-3-70B-Instruct\n📅 发布时间: 2025-07-15\n📋 分类: 开源模型\n🔗 链接: https://huggingface.co/meta-llama/Llama-3-70b-instruct",
            "category": "开源模型",
            "url": "https://huggingface.co/meta-llama/Llama-3-70b-instruct"
        }
    ]
    
    # 添加到数据库
    for data in sample_data:
        success = push_logger.log_push(
            source=data["source"],
            title=data["title"],
            content=data["content"],
            category=data["category"],
            url=data["url"],
            push_channel="钉钉",
            push_status="success"
        )
        if success:
            print(f"✅ 已添加: {data['title']}")
        else:
            print(f"❌ 添加失败: {data['title']}")

def demo_generate_reports():
    """生成演示报告"""
    print("\n生成演示报告...")
    
    generator = DailyReportGenerator()
    
    # 生成日报
    print("生成日报...")
    daily_report = generator.generate_daily_report()
    print("日报预览（前500字符）:")
    print("-" * 50)
    print(daily_report[:500] + "...")
    print("-" * 50)
    
    # 生成周报
    print("\n生成周报...")
    weekly_report = generator.generate_weekly_report()
    print("周报预览（前500字符）:")
    print("-" * 50)
    print(weekly_report[:500] + "...")
    print("-" * 50)

def demo_analytics():
    """演示数据分析功能"""
    print("\n数据分析演示...")
    
    analytics = PushAnalytics()
    
    # 活跃度统计
    print("📊 活跃度统计:")
    activity_stats = analytics.get_activity_stats(7)
    for source, total, active_days, first, last in activity_stats:
        print(f"  {source}: {total}条推送, {active_days}天活跃")
    
    # 推送成功率
    print("\n✅ 推送成功率:")
    success_rates = analytics.get_push_success_rate(7)
    for source, stats in success_rates.items():
        print(f"  {source}: {stats['success_rate']:.1f}% ({stats['success_count']}/{stats['total_count']})")
    
    # 分类统计
    print("\n📋 分类统计:")
    category_stats = analytics.get_category_stats(7)
    category_summary = {}
    for category, count, source in category_stats:
        if category not in category_summary:
            category_summary[category] = 0
        category_summary[category] += count
    
    for category, count in sorted(category_summary.items(), key=lambda x: x[1], reverse=True):
        print(f"  {category}: {count}条")

def main():
    """主演示函数"""
    print("🎉 AI资讯日报系统演示")
    print("=" * 50)
    
    # 1. 添加示例数据
    demo_add_sample_data()
    
    # 2. 生成报告
    demo_generate_reports()
    
    # 3. 数据分析
    demo_analytics()
    
    print("\n" + "=" * 50)
    print("演示完成！")
    print("\n💡 提示:")
    print("- 查看 reports/ 目录下的完整报告文件")
    print("- 运行 'python auto_report_generator.py all' 生成所有报告")
    print("- 运行 'python auto_report_generator.py schedule' 启动定时任务")

if __name__ == "__main__":
    main()