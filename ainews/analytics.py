#!/usr/bin/python
# -*- coding: UTF-8 -*-
"""
AI资讯推送数据分析工具
提供各种统计分析功能
"""

import sqlite3
from datetime import datetime, date, timedelta
import json
from collections import defaultdict, Counter
import matplotlib.pyplot as plt
import pandas as pd
from push_logger import PushLogger

class PushAnalytics:
    def __init__(self):
        """初始化分析工具"""
        self.logger = PushLogger()
        self.source_names = {
            'openai': 'OpenAI',
            'anthropic': 'Anthropic',
            'aibase': 'AIBase',
            'ai-bot': 'AI-Bot',
            'cursor': 'Cursor',
            'huggingface': 'HuggingFace',
            'trae': 'TraeAI',
            'ollama': 'Ollama'
        }
    
    def get_activity_stats(self, days=30):
        """获取活跃度统计"""
        try:
            conn = sqlite3.connect(self.logger.db_path)
            cursor = conn.cursor()
            
            # 获取最近N天的数据
            cursor.execute('''
                SELECT 
                    source,
                    COUNT(*) as total_pushes,
                    COUNT(DISTINCT push_date) as active_days,
                    MIN(push_date) as first_push,
                    MAX(push_date) as last_push
                FROM push_records 
                WHERE push_date >= date('now', '-{} days')
                GROUP BY source
                ORDER BY total_pushes DESC
            '''.format(days))
            
            stats = cursor.fetchall()
            conn.close()
            
            return stats
            
        except Exception as e:
            print(f"获取活跃度统计失败: {str(e)}")
            return []
    
    def get_daily_trend(self, days=30):
        """获取每日推送趋势"""
        try:
            conn = sqlite3.connect(self.logger.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT 
                    push_date,
                    source,
                    COUNT(*) as count
                FROM push_records 
                WHERE push_date >= date('now', '-{} days')
                GROUP BY push_date, source
                ORDER BY push_date DESC
            '''.format(days))
            
            data = cursor.fetchall()
            conn.close()
            
            # 组织数据
            daily_data = defaultdict(lambda: defaultdict(int))
            for push_date, source, count in data:
                daily_data[push_date][source] = count
            
            return dict(daily_data)
            
        except Exception as e:
            print(f"获取每日趋势失败: {str(e)}")
            return {}
    
    def get_hourly_distribution(self, days=7):
        """获取小时分布统计"""
        try:
            conn = sqlite3.connect(self.logger.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT 
                    strftime('%H', push_time) as hour,
                    COUNT(*) as count
                FROM push_records 
                WHERE push_date >= date('now', '-{} days')
                GROUP BY hour
                ORDER BY hour
            '''.format(days))
            
            data = cursor.fetchall()
            conn.close()
            
            return data
            
        except Exception as e:
            print(f"获取小时分布失败: {str(e)}")
            return []
    
    def get_category_stats(self, days=30):
        """获取分类统计"""
        try:
            conn = sqlite3.connect(self.logger.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT 
                    category,
                    COUNT(*) as count,
                    source
                FROM push_records 
                WHERE push_date >= date('now', '-{} days')
                AND category IS NOT NULL 
                AND category != ''
                GROUP BY category, source
                ORDER BY count DESC
            '''.format(days))
            
            data = cursor.fetchall()
            conn.close()
            
            return data
            
        except Exception as e:
            print(f"获取分类统计失败: {str(e)}")
            return []
    
    def get_push_success_rate(self, days=30):
        """获取推送成功率"""
        try:
            conn = sqlite3.connect(self.logger.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT 
                    source,
                    push_status,
                    COUNT(*) as count
                FROM push_records 
                WHERE push_date >= date('now', '-{} days')
                GROUP BY source, push_status
                ORDER BY source, push_status
            '''.format(days))
            
            data = cursor.fetchall()
            conn.close()
            
            # 计算成功率
            source_stats = defaultdict(lambda: {'success': 0, 'total': 0})
            
            for source, status, count in data:
                source_stats[source]['total'] += count
                if status == 'success':
                    source_stats[source]['success'] += count
            
            # 计算百分比
            success_rates = {}
            for source, stats in source_stats.items():
                if stats['total'] > 0:
                    success_rates[source] = {
                        'success_count': stats['success'],
                        'total_count': stats['total'],
                        'success_rate': (stats['success'] / stats['total']) * 100
                    }
            
            return success_rates
            
        except Exception as e:
            print(f"获取推送成功率失败: {str(e)}")
            return {}
    
    def generate_analytics_report(self, days=30):
        """生成分析报告"""
        report = f"# AI资讯推送数据分析报告\n\n"
        report += f"📊 **分析周期**: 最近 {days} 天\n"
        report += f"📅 **生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
        
        # 1. 活跃度统计
        report += "## 📈 来源活跃度统计\n\n"
        activity_stats = self.get_activity_stats(days)
        
        if activity_stats:
            report += "| 来源 | 推送总数 | 活跃天数 | 首次推送 | 最后推送 |\n"
            report += "|------|----------|----------|----------|----------|\n"
            
            for source, total, active_days, first, last in activity_stats:
                source_name = self.source_names.get(source.lower(), source)
                report += f"| {source_name} | {total} | {active_days} | {first} | {last} |\n"
        else:
            report += "暂无活跃度数据\n"
        
        report += "\n"
        
        # 2. 推送成功率
        report += "## ✅ 推送成功率统计\n\n"
        success_rates = self.get_push_success_rate(days)
        
        if success_rates:
            report += "| 来源 | 成功次数 | 总次数 | 成功率 |\n"
            report += "|------|----------|--------|--------|\n"
            
            for source, stats in success_rates.items():
                source_name = self.source_names.get(source.lower(), source)
                report += f"| {source_name} | {stats['success_count']} | {stats['total_count']} | {stats['success_rate']:.1f}% |\n"
        else:
            report += "暂无成功率数据\n"
        
        report += "\n"
        
        # 3. 分类统计
        report += "## 📋 内容分类统计\n\n"
        category_stats = self.get_category_stats(days)
        
        if category_stats:
            # 按分类汇总
            category_summary = defaultdict(int)
            for category, count, source in category_stats:
                category_summary[category] += count
            
            sorted_categories = sorted(category_summary.items(), key=lambda x: x[1], reverse=True)
            
            report += "| 分类 | 数量 |\n"
            report += "|------|------|\n"
            
            for category, count in sorted_categories[:10]:  # 只显示前10个
                report += f"| {category} | {count} |\n"
        else:
            report += "暂无分类数据\n"
        
        report += "\n"
        
        # 4. 时间分布
        report += "## ⏰ 推送时间分布\n\n"
        hourly_dist = self.get_hourly_distribution(days)
        
        if hourly_dist:
            report += "| 时间段 | 推送次数 |\n"
            report += "|--------|----------|\n"
            
            for hour, count in hourly_dist:
                report += f"| {hour}:00-{hour}:59 | {count} |\n"
        else:
            report += "暂无时间分布数据\n"
        
        report += "\n"
        
        # 5. 每日趋势
        report += "## 📅 每日推送趋势\n\n"
        daily_trend = self.get_daily_trend(min(days, 14))  # 最多显示14天
        
        if daily_trend:
            # 获取所有来源
            all_sources = set()
            for date_data in daily_trend.values():
                all_sources.update(date_data.keys())
            
            sorted_sources = sorted(all_sources)
            sorted_dates = sorted(daily_trend.keys(), reverse=True)
            
            # 表头
            header = "| 日期 |"
            for source in sorted_sources:
                source_name = self.source_names.get(source.lower(), source)
                header += f" {source_name} |"
            header += " 总计 |"
            
            separator = "|------|"
            for _ in sorted_sources:
                separator += "------|"
            separator += "------|"
            
            report += header + "\n"
            report += separator + "\n"
            
            # 数据行
            for date_str in sorted_dates[:7]:  # 只显示最近7天
                row = f"| {date_str} |"
                daily_total = 0
                
                for source in sorted_sources:
                    count = daily_trend[date_str].get(source, 0)
                    row += f" {count} |"
                    daily_total += count
                
                row += f" {daily_total} |"
                report += row + "\n"
        else:
            report += "暂无每日趋势数据\n"
        
        report += "\n---\n\n"
        report += "*报告由AI资讯监控系统自动生成*"
        
        return report
    
    def export_data_to_csv(self, days=30, filename=None):
        """导出数据到CSV文件"""
        try:
            if filename is None:
                filename = f"push_data_{date.today().strftime('%Y%m%d')}.csv"
            
            conn = sqlite3.connect(self.logger.db_path)
            
            # 查询数据
            query = '''
                SELECT 
                    source, title, content, category, url, 
                    push_time, push_date, push_channel, push_status
                FROM push_records 
                WHERE push_date >= date('now', '-{} days')
                ORDER BY push_time DESC
            '''.format(days)
            
            df = pd.read_sql_query(query, conn)
            conn.close()
            
            # 保存到CSV
            df.to_csv(filename, index=False, encoding='utf-8-sig')
            print(f"数据已导出到: {filename}")
            
            return filename
            
        except Exception as e:
            print(f"导出数据失败: {str(e)}")
            return None

def main():
    """主函数 - 生成分析报告"""
    analytics = PushAnalytics()
    
    # 生成30天分析报告
    report = analytics.generate_analytics_report(30)
    
    # 保存报告
    os.makedirs('reports', exist_ok=True)
    report_filename = f"analytics_report_{date.today().strftime('%Y%m%d')}.md"
    report_path = os.path.join('reports', report_filename)
    
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(report)
    
    print(f"分析报告已生成: {report_path}")
    
    # 导出原始数据
    csv_filename = f"push_data_{date.today().strftime('%Y%m%d')}.csv"
    analytics.export_data_to_csv(30, csv_filename)

if __name__ == "__main__":
    import os
    main()