#!/usr/bin/python
# -*- coding: UTF-8 -*-
"""
自动日报生成器
定期生成日报和周报，并可选择推送到钉钉/企业微信
"""

import os
import time
import schedule
from datetime import datetime, date, timedelta
from daily_report_generator import DailyReportGenerator
from analytics import PushAnalytics
import configparser

class AutoReportGenerator:
    def __init__(self):
        """初始化自动报告生成器"""
        self.daily_generator = DailyReportGenerator()
        self.analytics = PushAnalytics()
        self.load_config()
    
    def load_config(self):
        """加载配置"""
        self.config = configparser.ConfigParser()
        config_file = 'config.ini'
        
        if os.path.exists(config_file):
            self.config.read(config_file, encoding='utf-8')
        else:
            print("配置文件不存在，使用默认配置")
            self.config.add_section('report')
            self.config.set('report', 'auto_push', 'false')
            self.config.set('report', 'daily_time', '18:00')
            self.config.set('report', 'weekly_day', 'friday')
            self.config.set('report', 'weekly_time', '17:00')
    
    def generate_and_save_daily_report(self):
        """生成并保存日报"""
        try:
            print(f"开始生成日报 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            
            today = date.today()
            
            # 生成日报
            daily_report = self.daily_generator.generate_daily_report(today, 'markdown')
            
            # 保存日报
            daily_filename = f"daily_report_{today.strftime('%Y%m%d')}"
            report_path = self.daily_generator.save_report(daily_report, daily_filename, 'markdown')
            
            # 同时生成文本版本
            daily_report_text = self.daily_generator.generate_daily_report(today, 'text')
            daily_filename_text = f"daily_report_{today.strftime('%Y%m%d')}_text"
            self.daily_generator.save_report(daily_report_text, daily_filename_text, 'text')
            
            print(f"日报生成完成: {report_path}")
            
            # 如果配置了自动推送，则推送日报摘要
            if self.config.getboolean('report', 'auto_push', fallback=False):
                self.push_daily_summary(daily_report_text)
            
            return report_path
            
        except Exception as e:
            print(f"生成日报失败: {str(e)}")
            return None
    
    def generate_and_save_weekly_report(self):
        """生成并保存周报"""
        try:
            print(f"开始生成周报 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            
            today = date.today()
            
            # 生成周报
            weekly_report = self.daily_generator.generate_weekly_report(today, 'markdown')
            
            # 保存周报
            weekly_filename = f"weekly_report_{today.strftime('%Y%m%d')}"
            report_path = self.daily_generator.save_report(weekly_report, weekly_filename, 'markdown')
            
            # 同时生成文本版本
            weekly_report_text = self.daily_generator.generate_weekly_report(today, 'text')
            weekly_filename_text = f"weekly_report_{today.strftime('%Y%m%d')}_text"
            self.daily_generator.save_report(weekly_report_text, weekly_filename_text, 'text')
            
            print(f"周报生成完成: {report_path}")
            
            # 如果配置了自动推送，则推送周报摘要
            if self.config.getboolean('report', 'auto_push', fallback=False):
                self.push_weekly_summary(weekly_report_text)
            
            return report_path
            
        except Exception as e:
            print(f"生成周报失败: {str(e)}")
            return None
    
    def generate_analytics_report(self):
        """生成分析报告"""
        try:
            print(f"开始生成分析报告 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            
            # 生成分析报告
            analytics_report = self.analytics.generate_analytics_report(30)
            
            # 保存报告
            os.makedirs('reports', exist_ok=True)
            report_filename = f"analytics_report_{date.today().strftime('%Y%m%d')}.md"
            report_path = os.path.join('reports', report_filename)
            
            with open(report_path, 'w', encoding='utf-8') as f:
                f.write(analytics_report)
            
            print(f"分析报告生成完成: {report_path}")
            
            # 导出CSV数据
            csv_filename = f"push_data_{date.today().strftime('%Y%m%d')}.csv"
            self.analytics.export_data_to_csv(30, csv_filename)
            
            return report_path
            
        except Exception as e:
            print(f"生成分析报告失败: {str(e)}")
            return None
    
    def push_daily_summary(self, daily_report):
        """推送日报摘要"""
        try:
            # 提取摘要信息
            lines = daily_report.split('\n')
            summary_lines = []
            
            for line in lines[:20]:  # 只取前20行作为摘要
                if '报告日期' in line or '资讯来源' in line or '资讯总数' in line:
                    summary_lines.append(line)
                elif line.startswith('OpenAI') or line.startswith('Anthropic') or line.startswith('AIBase'):
                    summary_lines.append(f"📰 {line}")
                    break  # 只显示第一条资讯标题
            
            if summary_lines:
                summary = "🗞️ AI资讯日报摘要\n\n" + '\n'.join(summary_lines)
                summary += f"\n\n📊 完整报告已生成，请查看reports目录"
                
                # 这里可以调用推送函数
                print("日报摘要:")
                print(summary)
            
        except Exception as e:
            print(f"推送日报摘要失败: {str(e)}")
    
    def push_weekly_summary(self, weekly_report):
        """推送周报摘要"""
        try:
            # 提取周报摘要
            lines = weekly_report.split('\n')
            summary_lines = []
            
            for line in lines[:15]:  # 只取前15行作为摘要
                if '报告周期' in line or '活跃来源' in line or '资讯总数' in line:
                    summary_lines.append(line)
            
            if summary_lines:
                summary = "📊 AI资讯周报摘要\n\n" + '\n'.join(summary_lines)
                summary += f"\n\n📈 完整报告已生成，请查看reports目录"
                
                # 这里可以调用推送函数
                print("周报摘要:")
                print(summary)
            
        except Exception as e:
            print(f"推送周报摘要失败: {str(e)}")
    
    def setup_schedule(self):
        """设置定时任务"""
        # 每日报告时间
        daily_time = self.config.get('report', 'daily_time', fallback='18:00')
        schedule.every().day.at(daily_time).do(self.generate_and_save_daily_report)
        
        # 周报时间
        weekly_day = self.config.get('report', 'weekly_day', fallback='friday').lower()
        weekly_time = self.config.get('report', 'weekly_time', fallback='17:00')
        
        if weekly_day == 'monday':
            schedule.every().monday.at(weekly_time).do(self.generate_and_save_weekly_report)
        elif weekly_day == 'tuesday':
            schedule.every().tuesday.at(weekly_time).do(self.generate_and_save_weekly_report)
        elif weekly_day == 'wednesday':
            schedule.every().wednesday.at(weekly_time).do(self.generate_and_save_weekly_report)
        elif weekly_day == 'thursday':
            schedule.every().thursday.at(weekly_time).do(self.generate_and_save_weekly_report)
        elif weekly_day == 'friday':
            schedule.every().friday.at(weekly_time).do(self.generate_and_save_weekly_report)
        elif weekly_day == 'saturday':
            schedule.every().saturday.at(weekly_time).do(self.generate_and_save_weekly_report)
        elif weekly_day == 'sunday':
            schedule.every().sunday.at(weekly_time).do(self.generate_and_save_weekly_report)
        
        # 分析报告 - 每周一次
        schedule.every().sunday.at("19:00").do(self.generate_analytics_report)
        
        print(f"定时任务已设置:")
        print(f"  - 日报: 每天 {daily_time}")
        print(f"  - 周报: 每{weekly_day} {weekly_time}")
        print(f"  - 分析报告: 每周日 19:00")
    
    def run_once(self):
        """立即执行一次所有报告生成"""
        print("立即生成所有报告...")
        
        # 生成日报
        self.generate_and_save_daily_report()
        
        # 生成周报
        self.generate_and_save_weekly_report()
        
        # 生成分析报告
        self.generate_analytics_report()
        
        print("所有报告生成完成！")
    
    def run_scheduler(self):
        """运行定时调度器"""
        self.setup_schedule()
        
        print("自动报告生成器已启动，等待定时任务...")
        print("按 Ctrl+C 停止")
        
        try:
            while True:
                schedule.run_pending()
                time.sleep(60)  # 每分钟检查一次
        except KeyboardInterrupt:
            print("\n自动报告生成器已停止")

def main():
    """主函数"""
    import sys
    
    generator = AutoReportGenerator()
    
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == 'daily':
            generator.generate_and_save_daily_report()
        elif command == 'weekly':
            generator.generate_and_save_weekly_report()
        elif command == 'analytics':
            generator.generate_analytics_report()
        elif command == 'all':
            generator.run_once()
        elif command == 'schedule':
            generator.run_scheduler()
        else:
            print("用法:")
            print("  python auto_report_generator.py daily     - 生成日报")
            print("  python auto_report_generator.py weekly    - 生成周报")
            print("  python auto_report_generator.py analytics - 生成分析报告")
            print("  python auto_report_generator.py all       - 生成所有报告")
            print("  python auto_report_generator.py schedule  - 启动定时任务")
    else:
        # 默认生成所有报告
        generator.run_once()

if __name__ == "__main__":
    main()