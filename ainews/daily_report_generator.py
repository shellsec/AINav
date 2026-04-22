#!/usr/bin/python
# -*- coding: UTF-8 -*-
"""
AI资讯日报生成器
基于推送记录生成每日AI资讯汇总报告
"""

import os
import json
from datetime import datetime, date, timedelta
from push_logger import PushLogger
import re

class DailyReportGenerator:
    def __init__(self):
        """初始化日报生成器"""
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
    
    def extract_key_info(self, content):
        """从内容中提取关键信息"""
        # 提取标题
        title_match = re.search(r'📰\s*(.+?)(?:\n|$)', content)
        title = title_match.group(1).strip() if title_match else "无标题"
        
        # 提取日期
        date_match = re.search(r'📅\s*发布时间:\s*(.+?)(?:\n|$)', content)
        pub_date = date_match.group(1).strip() if date_match else ""
        
        # 提取链接
        link_match = re.search(r'🔗\s*链接:\s*(.+?)(?:\n|$)', content)
        link = link_match.group(1).strip() if link_match else ""
        
        # 提取分类
        category_match = re.search(r'📋\s*分类:\s*(.+?)(?:\n|$)', content)
        category = category_match.group(1).strip() if category_match else ""
        
        return {
            'title': title,
            'date': pub_date,
            'link': link,
            'category': category
        }
    
    def generate_daily_report(self, target_date=None, output_format='markdown'):
        """生成指定日期的日报"""
        if target_date is None:
            target_date = date.today()
        
        # 获取当日推送记录
        records = self.logger.get_daily_records(target_date)
        
        if not records:
            return f"# {target_date} AI资讯日报\n\n今日暂无AI资讯推送。"
        
        # 按来源分组
        grouped_records = {}
        for record in records:
            source, title, content, category, url, push_time, push_channel = record
            
            if source not in grouped_records:
                grouped_records[source] = []
            
            # 提取关键信息
            key_info = self.extract_key_info(content)
            
            grouped_records[source].append({
                'title': key_info['title'] or title,
                'content': content,
                'category': key_info['category'] or category,
                'url': key_info['link'] or url,
                'push_time': push_time,
                'push_channel': push_channel,
                'pub_date': key_info['date']
            })
        
        # 生成报告
        if output_format == 'markdown':
            return self._generate_markdown_report(target_date, grouped_records)
        elif output_format == 'text':
            return self._generate_text_report(target_date, grouped_records)
        else:
            return self._generate_json_report(target_date, grouped_records)
    
    def _generate_markdown_report(self, target_date, grouped_records):
        """生成Markdown格式的日报"""
        report = f"# {target_date.strftime('%Y年%m月%d日')} AI资讯日报\n\n"
        report += f"📅 **报告日期**: {target_date}\n"
        report += f"📊 **资讯来源**: {len(grouped_records)} 个\n"
        report += f"📰 **资讯总数**: {sum(len(items) for items in grouped_records.values())} 条\n\n"
        
        report += "---\n\n"
        
        # 按来源生成内容
        for source, items in grouped_records.items():
            source_name = self.source_names.get(source.lower(), source)
            report += f"## 🚀 {source_name}\n\n"
            
            for i, item in enumerate(items, 1):
                report += f"### {i}. {item['title']}\n\n"
                
                if item['category']:
                    report += f"**分类**: {item['category']}\n\n"
                
                if item['pub_date']:
                    report += f"**发布时间**: {item['pub_date']}\n\n"
                
                if item['url']:
                    report += f"**链接**: [{item['url']}]({item['url']})\n\n"
                
                report += f"**推送时间**: {item['push_time']}\n\n"
                report += f"**推送渠道**: {item['push_channel']}\n\n"
                
                # 添加内容摘要（去除格式符号）
                clean_content = re.sub(r'[📰📅🔗📋🚀]', '', item['content'])
                clean_content = re.sub(r'\n+', ' ', clean_content).strip()
                if len(clean_content) > 200:
                    clean_content = clean_content[:200] + "..."
                
                report += f"**内容摘要**: {clean_content}\n\n"
                report += "---\n\n"
        
        # 添加统计信息
        report += "## 📊 今日统计\n\n"
        for source, items in grouped_records.items():
            source_name = self.source_names.get(source.lower(), source)
            report += f"- **{source_name}**: {len(items)} 条资讯\n"
        
        report += f"\n**总计**: {sum(len(items) for items in grouped_records.values())} 条资讯\n\n"
        
        # 添加生成信息
        report += "---\n\n"
        report += f"*报告生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*\n"
        report += "*由AI资讯监控系统自动生成*"
        
        return report
    
    def _generate_text_report(self, target_date, grouped_records):
        """生成纯文本格式的日报"""
        report = f"{'='*50}\n"
        report += f"{target_date.strftime('%Y年%m月%d日')} AI资讯日报\n"
        report += f"{'='*50}\n\n"
        
        report += f"报告日期: {target_date}\n"
        report += f"资讯来源: {len(grouped_records)} 个\n"
        report += f"资讯总数: {sum(len(items) for items in grouped_records.values())} 条\n\n"
        
        # 按来源生成内容
        for source, items in grouped_records.items():
            source_name = self.source_names.get(source.lower(), source)
            report += f"{'-'*30}\n"
            report += f"{source_name} ({len(items)} 条)\n"
            report += f"{'-'*30}\n\n"
            
            for i, item in enumerate(items, 1):
                report += f"{i}. {item['title']}\n"
                
                if item['category']:
                    report += f"   分类: {item['category']}\n"
                
                if item['pub_date']:
                    report += f"   发布时间: {item['pub_date']}\n"
                
                if item['url']:
                    report += f"   链接: {item['url']}\n"
                
                report += f"   推送时间: {item['push_time']}\n"
                report += f"   推送渠道: {item['push_channel']}\n\n"
        
        # 添加统计信息
        report += f"{'-'*30}\n"
        report += "今日统计\n"
        report += f"{'-'*30}\n"
        for source, items in grouped_records.items():
            source_name = self.source_names.get(source.lower(), source)
            report += f"{source_name}: {len(items)} 条资讯\n"
        
        report += f"\n总计: {sum(len(items) for items in grouped_records.values())} 条资讯\n\n"
        
        # 添加生成信息
        report += f"报告生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
        report += "由AI资讯监控系统自动生成\n"
        
        return report
    
    def _generate_json_report(self, target_date, grouped_records):
        """生成JSON格式的日报"""
        report_data = {
            'date': target_date.isoformat(),
            'generated_at': datetime.now().isoformat(),
            'summary': {
                'total_sources': len(grouped_records),
                'total_items': sum(len(items) for items in grouped_records.values())
            },
            'sources': {}
        }
        
        for source, items in grouped_records.items():
            source_name = self.source_names.get(source.lower(), source)
            report_data['sources'][source] = {
                'name': source_name,
                'count': len(items),
                'items': items
            }
        
        return json.dumps(report_data, ensure_ascii=False, indent=2)
    
    def generate_weekly_report(self, end_date=None, output_format='markdown'):
        """生成周报"""
        if end_date is None:
            end_date = date.today()
        
        start_date = end_date - timedelta(days=6)  # 最近7天
        
        records = self.logger.get_records_by_date_range(start_date, end_date)
        
        if not records:
            return f"# {start_date} 至 {end_date} AI资讯周报\n\n本周暂无AI资讯推送。"
        
        # 按日期和来源分组
        daily_grouped = {}
        source_stats = {}
        
        for record in records:
            source, title, content, category, url, push_time, push_date, push_channel = record
            
            # 按日期分组
            if push_date not in daily_grouped:
                daily_grouped[push_date] = {}
            
            if source not in daily_grouped[push_date]:
                daily_grouped[push_date][source] = []
            
            # 统计来源
            if source not in source_stats:
                source_stats[source] = 0
            source_stats[source] += 1
            
            # 提取关键信息
            key_info = self.extract_key_info(content)
            
            daily_grouped[push_date][source].append({
                'title': key_info['title'] or title,
                'content': content,
                'category': key_info['category'] or category,
                'url': key_info['link'] or url,
                'push_time': push_time,
                'push_channel': push_channel,
                'pub_date': key_info['date']
            })
        
        if output_format == 'markdown':
            return self._generate_markdown_weekly_report(start_date, end_date, daily_grouped, source_stats)
        else:
            # 对于非markdown格式，暂时返回markdown格式
            return self._generate_markdown_weekly_report(start_date, end_date, daily_grouped, source_stats)
    
    def _generate_markdown_weekly_report(self, start_date, end_date, daily_grouped, source_stats):
        """生成Markdown格式的周报"""
        report = f"# {start_date.strftime('%Y年%m月%d日')} 至 {end_date.strftime('%Y年%m月%d日')} AI资讯周报\n\n"
        
        total_items = sum(source_stats.values())
        report += f"📅 **报告周期**: {start_date} 至 {end_date}\n"
        report += f"📊 **活跃来源**: {len(source_stats)} 个\n"
        report += f"📰 **资讯总数**: {total_items} 条\n\n"
        
        # 来源统计
        report += "## 📊 本周统计\n\n"
        sorted_sources = sorted(source_stats.items(), key=lambda x: x[1], reverse=True)
        for source, count in sorted_sources:
            source_name = self.source_names.get(source.lower(), source)
            percentage = (count / total_items) * 100
            report += f"- **{source_name}**: {count} 条 ({percentage:.1f}%)\n"
        
        report += "\n---\n\n"
        
        # 按日期展示
        report += "## 📅 每日资讯\n\n"
        
        sorted_dates = sorted(daily_grouped.keys(), reverse=True)
        for push_date in sorted_dates:
            date_obj = datetime.strptime(push_date, '%Y-%m-%d').date()
            weekday = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][date_obj.weekday()]
            
            daily_total = sum(len(items) for items in daily_grouped[push_date].values())
            report += f"### {date_obj.strftime('%m月%d日')} ({weekday}) - {daily_total} 条资讯\n\n"
            
            for source, items in daily_grouped[push_date].items():
                source_name = self.source_names.get(source.lower(), source)
                report += f"#### {source_name} ({len(items)} 条)\n\n"
                
                for item in items:
                    report += f"- **{item['title']}**\n"
                    if item['url']:
                        report += f"  - 链接: [{item['url']}]({item['url']})\n"
                    if item['pub_date']:
                        report += f"  - 发布: {item['pub_date']}\n"
                    report += f"  - 推送: {item['push_time']}\n\n"
        
        # 添加生成信息
        report += "---\n\n"
        report += f"*报告生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*\n"
        report += "*由AI资讯监控系统自动生成*"
        
        return report
    
    def save_report(self, content, filename, format_type='markdown'):
        """保存报告到文件"""
        try:
            # 确保reports目录存在
            os.makedirs('reports', exist_ok=True)
            
            # 根据格式添加扩展名
            if format_type == 'markdown':
                filename += '.md'
            elif format_type == 'json':
                filename += '.json'
            else:
                filename += '.txt'
            
            filepath = os.path.join('reports', filename)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print(f"报告已保存到: {filepath}")
            return filepath
            
        except Exception as e:
            print(f"保存报告失败: {str(e)}")
            return None

def main():
    """主函数 - 生成今日和本周报告"""
    generator = DailyReportGenerator()
    
    # 生成今日报告
    today = date.today()
    daily_report = generator.generate_daily_report(today, 'markdown')
    daily_filename = f"daily_report_{today.strftime('%Y%m%d')}"
    generator.save_report(daily_report, daily_filename, 'markdown')
    
    # 生成本周报告
    weekly_report = generator.generate_weekly_report(today, 'markdown')
    weekly_filename = f"weekly_report_{today.strftime('%Y%m%d')}"
    generator.save_report(weekly_report, weekly_filename, 'markdown')
    
    print("报告生成完成！")

if __name__ == "__main__":
    main()