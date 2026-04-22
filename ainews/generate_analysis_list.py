#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成AI新闻分析列表文件
用于索引页面展示
"""

import os
import json
from datetime import datetime

def generate_analysis_list():
    """生成分析列表"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    analysis_dir = os.path.join(current_dir, 'daily_analysis')
    
    if not os.path.exists(analysis_dir):
        os.makedirs(analysis_dir)
        return
    
    # 获取所有分析文件
    analysis_files = []
    for filename in os.listdir(analysis_dir):
        if filename.startswith('analysis_') and filename.endswith('.json'):
            filepath = os.path.join(analysis_dir, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    analysis_files.append({
                        'date': data.get('date', ''),
                        'news_count': data.get('news_count', 0),
                        'analyzed_at': data.get('analyzed_at', ''),
                        'analysis_method': data.get('analysis_method', 'unknown'),
                        'analysis': data.get('analysis', {})
                    })
            except Exception as e:
                print(f"⚠️ 读取分析文件失败 {filename}: {e}")
    
    # 按日期排序（最新的在前）
    analysis_files.sort(key=lambda x: x.get('date', ''), reverse=True)
    
    # 保存列表文件
    list_file = os.path.join(analysis_dir, 'analysis_list.json')
    with open(list_file, 'w', encoding='utf-8') as f:
        json.dump({
            'generated_at': datetime.now().isoformat(),
            'total_count': len(analysis_files),
            'analyses': analysis_files
        }, f, ensure_ascii=False, indent=2)
    
    print(f"✅ 分析列表已生成: {list_file} ({len(analysis_files)}条记录)")

if __name__ == '__main__':
    generate_analysis_list()
