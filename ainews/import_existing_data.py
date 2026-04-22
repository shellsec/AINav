#!/usr/bin/python
# -*- coding: UTF-8 -*-
"""
导入现有TXT文件数据到日报系统
解析各种格式的TXT文件并导入到数据库中
"""

import os
import re
import glob
from datetime import datetime, date, timedelta
from push_logger import push_logger
import json

class DataImporter:
    def __init__(self):
        """初始化数据导入器"""
        self.source_mapping = {
            'AI日报快讯.txt': 'AIBase',
            'AI-Bot每日资讯.txt': 'AI-Bot',
            'Anthropic新闻.txt': 'Anthropic',
            'OpenAI新闻.txt': 'OpenAI',
            'HuggingFace更新.txt': 'HuggingFace',
            'Ollama模型库更新.txt': 'Ollama',
            'Trae更新日志.txt': 'TraeAI'
        }
        
        self.imported_count = 0
        self.skipped_count = 0
        self.error_count = 0
    
    def parse_anthropic_format(self, content):
        """解析Anthropic格式的内容"""
        items = []
        
        # 使用正则表达式匹配【标题】格式
        pattern = r'【([^】]+)】\n发布日期:\s*([^\n]+)\n链接:\s*([^\n]+)'
        matches = re.findall(pattern, content)
        
        for title, pub_date, url in matches:
            item = {
                'title': title.strip(),
                'content': f"📰 {title.strip()}\n📅 发布时间: {pub_date.strip()}\n🔗 链接: {url.strip()}",
                'category': 'AI新闻',
                'url': url.strip(),
                'pub_date': pub_date.strip()
            }
            items.append(item)
        
        return items
    
    def parse_huggingface_format(self, content):
        """解析HuggingFace格式的内容"""
        items = []
        
        # 按模型分割
        model_blocks = re.split(r'🤖\s+', content)
        
        for block in model_blocks[1:]:  # 跳过第一个空块
            lines = block.strip().split('\n')
            if len(lines) >= 4:
                model_name = lines[0].strip()
                model_type = ""
                model_url = ""
                
                for line in lines[1:]:
                    if line.startswith('📝 类型:'):
                        model_type = line.replace('📝 类型:', '').strip()
                    elif line.startswith('🔗'):
                        model_url = line.replace('🔗', '').strip()
                
                if model_name and model_url:
                    item = {
                        'title': f"新模型: {model_name}",
                        'content': f"📰 新模型: {model_name}\n📋 分类: {model_type}\n⏰ 近期更新\n🔗 链接: {model_url}",
                        'category': model_type or '最新AI模型',
                        'url': model_url,
                        'pub_date': '近期更新'
                    }
                    items.append(item)
        
        return items
    
    def parse_ollama_format(self, content):
        """解析Ollama格式的内容"""
        items = []
        
        # 查找模型信息
        model_pattern = r'【模型名称】([^\n]+)\n【模型描述】([^\n]+).*?【模型链接】([^\n]+)'
        matches = re.findall(model_pattern, content, re.DOTALL)
        
        for model_name, description, url in matches:
            item = {
                'title': f"Ollama新模型: {model_name.strip()}",
                'content': f"📰 Ollama新模型: {model_name.strip()}\n📝 描述: {description.strip()}\n🔗 链接: {url.strip()}",
                'category': 'Ollama模型',
                'url': url.strip(),
                'pub_date': '最近更新'
            }
            items.append(item)
        
        return items
    
    def parse_trae_format(self, content):
        """解析Trae格式的内容"""
        items = []
        
        # 查找版本信息
        version_pattern = r'v(\d+\.\d+\.\d+)\n发布日期:\s*([^\n]+)'
        matches = re.findall(version_pattern, content)
        
        for version, pub_date in matches:
            item = {
                'title': f"Trae AI v{version} 更新",
                'content': f"📰 Trae AI v{version} 更新\n📅 发布时间: {pub_date.strip()}\n📋 分类: 软件更新",
                'category': '软件更新',
                'url': 'https://trae.ai/changelog',
                'pub_date': pub_date.strip()
            }
            items.append(item)
        
        return items
    
    def parse_simple_format(self, content, source):
        """解析简单格式的内容（如AI日报快讯、AI-Bot每日资讯）"""
        items = []
        
        # 对于简单格式，将整个内容作为一条资讯
        if content.strip():
            # 尝试提取标题（第一行或第一句）
            lines = content.strip().split('\n')
            first_line = lines[0].strip()
            
            # 如果第一行包含【】，提取标题
            title_match = re.search(r'【([^】]+)】', first_line)
            if title_match:
                title = title_match.group(1)
            else:
                # 否则取前50个字符作为标题
                title = first_line[:50] + ('...' if len(first_line) > 50 else '')
            
            item = {
                'title': title,
                'content': f"📰 {title}\n\n{content.strip()}",
                'category': 'AI资讯',
                'url': None,
                'pub_date': '最近更新'
            }
            items.append(item)
        
        return items
    
    def parse_file_content(self, filepath, source):
        """根据文件类型解析内容"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read().strip()
            
            if not content:
                print(f"⚠️  {filepath} 文件为空，跳过")
                return []
            
            filename = os.path.basename(filepath)
            
            # 根据文件名选择解析方法
            if 'Anthropic' in filename:
                return self.parse_anthropic_format(content)
            elif 'HuggingFace' in filename:
                return self.parse_huggingface_format(content)
            elif 'Ollama' in filename:
                return self.parse_ollama_format(content)
            elif 'Trae' in filename:
                return self.parse_trae_format(content)
            else:
                return self.parse_simple_format(content, source)
                
        except Exception as e:
            print(f"❌ 解析文件 {filepath} 失败: {str(e)}")
            self.error_count += 1
            return []
    
    def estimate_push_date(self, pub_date_str, filename):
        """估算推送日期"""
        try:
            # 尝试解析日期字符串
            if '2025' in pub_date_str:
                # 尝试匹配 YYYY-MM-DD 或 YYYY 年 MM 月 DD 日格式
                date_match = re.search(r'2025[-年\s]*(\d{1,2})[-月\s]*(\d{1,2})', pub_date_str)
                if date_match:
                    month, day = date_match.groups()
                    return date(2025, int(month), int(day))
            
            # 如果无法解析，使用文件修改时间
            if os.path.exists(filename):
                mtime = os.path.getmtime(filename)
                return datetime.fromtimestamp(mtime).date()
            
            # 默认使用今天
            return date.today()
            
        except:
            return date.today()
    
    def import_file(self, filepath):
        """导入单个文件"""
        filename = os.path.basename(filepath)
        source = self.source_mapping.get(filename)
        
        if not source:
            print(f"⚠️  未知文件类型: {filename}，跳过")
            self.skipped_count += 1
            return
        
        print(f"📁 处理文件: {filename} -> {source}")
        
        # 解析文件内容
        items = self.parse_file_content(filepath, source)
        
        if not items:
            print(f"⚠️  {filename} 未解析到任何内容")
            self.skipped_count += 1
            return
        
        # 导入到数据库
        for item in items:
            try:
                # 估算推送日期
                push_date = self.estimate_push_date(item.get('pub_date', ''), filepath)
                
                # 构造完整内容
                full_content = item['content']
                
                # 记录到数据库
                success = push_logger.log_push(
                    source=source,
                    title=item['title'],
                    content=full_content,
                    category=item.get('category'),
                    url=item.get('url'),
                    push_channel="历史导入",
                    push_status="imported",
                    keywords=None
                )
                
                if success:
                    print(f"  ✅ 导入: {item['title'][:50]}...")
                    self.imported_count += 1
                else:
                    print(f"  ⚠️  跳过重复: {item['title'][:50]}...")
                    self.skipped_count += 1
                    
            except Exception as e:
                print(f"  ❌ 导入失败: {item['title'][:50]}... - {str(e)}")
                self.error_count += 1
    
    def import_all_txt_files(self):
        """导入所有TXT文件"""
        print("🚀 开始导入现有TXT文件数据...")
        print("=" * 60)
        
        # 查找所有相关的TXT文件
        txt_files = []
        for filename in self.source_mapping.keys():
            if os.path.exists(filename):
                txt_files.append(filename)
        
        if not txt_files:
            print("❌ 未找到任何可导入的TXT文件")
            return
        
        print(f"📋 找到 {len(txt_files)} 个文件待导入:")
        for filename in txt_files:
            print(f"  - {filename}")
        
        print("\n开始导入...")
        print("-" * 60)
        
        # 逐个导入文件
        for filepath in txt_files:
            self.import_file(filepath)
            print()
        
        # 显示导入结果
        print("=" * 60)
        print("📊 导入完成统计:")
        print(f"  ✅ 成功导入: {self.imported_count} 条")
        print(f"  ⚠️  跳过/重复: {self.skipped_count} 条")
        print(f"  ❌ 导入失败: {self.error_count} 条")
        print(f"  📁 处理文件: {len(txt_files)} 个")
        
        if self.imported_count > 0:
            print(f"\n🎉 导入成功！现在可以运行以下命令生成报告:")
            print(f"  python auto_report_generator.py all")

def main():
    """主函数"""
    importer = DataImporter()
    importer.import_all_txt_files()

if __name__ == "__main__":
    main()