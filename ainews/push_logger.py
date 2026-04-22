#!/usr/bin/python
# -*- coding: UTF-8 -*-
"""
推送日志记录模块
用于记录每天的推送内容，便于后续分析和生成日报
"""

import os
import json
import sqlite3
import re
from datetime import datetime, date
import hashlib

class PushLogger:
    def __init__(self, db_path="push_logs.db"):
        """初始化推送日志记录器"""
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """初始化数据库表结构"""
        # 设置SQLite连接为UTF-8编码
        conn = sqlite3.connect(self.db_path)
        # 确保数据库使用UTF-8编码
        conn.execute("PRAGMA encoding = 'UTF-8'")
        cursor = conn.cursor()
        
        # 创建推送记录表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS push_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source TEXT NOT NULL,           -- 来源（如：OpenAI、Anthropic等）
                title TEXT NOT NULL,            -- 标题
                content TEXT NOT NULL,          -- 完整内容
                content_hash TEXT NOT NULL,     -- 内容哈希，用于去重
                push_time DATETIME NOT NULL,    -- 推送时间
                push_date DATE NOT NULL,        -- 推送日期
                category TEXT,                  -- 分类
                url TEXT,                       -- 链接
                push_channel TEXT,              -- 推送渠道（钉钉/企业微信）
                push_status TEXT DEFAULT 'success',  -- 推送状态
                keywords TEXT                   -- 关键词（JSON格式）
            )
        ''')
        
        # 创建索引
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_push_date ON push_records(push_date)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_source ON push_records(source)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_content_hash ON push_records(content_hash)')
        
        conn.commit()
        conn.close()
    
    def log_push(self, source, title, content, category=None, url=None, 
                 push_channel="钉钉", push_status="success", keywords=None):
        """记录推送信息"""
        try:
            # 清理内容用于去重（移除空白字符和换行差异）
            cleaned_content = self._normalize_content(content)
            
            # 生成内容哈希（基于清理后的内容）
            content_hash = hashlib.md5(cleaned_content.encode('utf-8')).hexdigest()
            
            # 检查是否已存在相同内容（基于hash、URL和标题+来源组合）
            if self.is_duplicate(content_hash, source, title, content, url):
                # 确保打印时使用UTF-8编码
                try:
                    safe_source = source if isinstance(source, str) else str(source)
                    safe_title = title[:50] if isinstance(title, str) else str(title)[:50]
                    print(f"内容已存在，跳过记录: {safe_source} - {safe_title}...")
                except UnicodeEncodeError:
                    safe_source = (source if isinstance(source, str) else str(source)).encode('ascii', errors='replace').decode('ascii')
                    safe_title = (title[:50] if isinstance(title, str) else str(title)[:50]).encode('ascii', errors='replace').decode('ascii')
                    print(f"内容已存在，跳过记录: {safe_source} - {safe_title}...")
                return False
            
            conn = sqlite3.connect(self.db_path)
            # 确保数据库使用UTF-8编码
            conn.execute("PRAGMA encoding = 'UTF-8'")
            cursor = conn.cursor()
            
            now = datetime.now()
            today = date.today()
            
            # 处理关键词
            keywords_json = json.dumps(keywords, ensure_ascii=False) if keywords else None
            
            # 确保所有字符串都是UTF-8编码
            source_utf8 = source if isinstance(source, str) else str(source).encode('utf-8', errors='ignore').decode('utf-8')
            title_utf8 = title if isinstance(title, str) else str(title).encode('utf-8', errors='ignore').decode('utf-8')
            content_utf8 = content if isinstance(content, str) else str(content).encode('utf-8', errors='ignore').decode('utf-8')
            
            cursor.execute('''
                INSERT INTO push_records 
                (source, title, content, content_hash, push_time, push_date, 
                 category, url, push_channel, push_status, keywords)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (source_utf8, title_utf8, content_utf8, content_hash, now, today, 
                  category, url, push_channel, push_status, keywords_json))
            
            conn.commit()
            conn.close()
            
            # 确保打印时使用UTF-8编码
            try:
                print(f"已记录推送: {source_utf8} - {title_utf8[:50]}...")
            except UnicodeEncodeError:
                # 如果控制台不支持UTF-8，使用ASCII安全的方式打印
                print(f"已记录推送: {source_utf8.encode('ascii', errors='replace').decode('ascii')} - {title_utf8[:50].encode('ascii', errors='replace').decode('ascii')}...")
            return True
            
        except Exception as e:
            print(f"记录推送失败: {str(e)}")
            import traceback
            print(f"详细错误信息:")
            traceback.print_exc()
            return False
    
    def _normalize_content(self, content):
        """规范化内容用于去重比较"""
        if not content:
            return ""
        # 移除所有空白字符（空格、换行、制表符等）
        normalized = re.sub(r'\s+', ' ', str(content).strip())
        # 移除常见的格式标记
        normalized = re.sub(r'[📰📅🔗📋🚀⏰📝]', '', normalized)
        return normalized
    
    def is_duplicate(self, content_hash, source=None, title=None, content=None, url=None):
        """检查内容是否重复（基于hash、URL、标题+来源组合）"""
        try:
            conn = sqlite3.connect(self.db_path)
            # 确保数据库使用UTF-8编码
            conn.execute("PRAGMA encoding = 'UTF-8'")
            cursor = conn.cursor()
            
            # 首先检查内容hash
            cursor.execute('SELECT COUNT(*) FROM push_records WHERE content_hash = ?', (content_hash,))
            count = cursor.fetchone()[0]
            
            if count > 0:
                conn.close()
                return True
            
            # 如果提供了URL，检查URL是否已存在（同一URL不应重复入库）
            # 但是，对于固定URL（如每日资讯页面），应该允许同一URL的不同内容入库
            # 所以只检查URL+内容哈希的组合，而不是仅检查URL
            if url:
                # 检查最近24小时内是否有相同URL+内容哈希的记录
                cursor.execute('''
                    SELECT COUNT(*) FROM push_records 
                    WHERE url = ? AND content_hash = ? AND push_time > datetime('now', '-1 day')
                ''', (url, content_hash))
                url_hash_count = cursor.fetchone()[0]
                if url_hash_count > 0:
                    conn.close()
                    return True
                
                # 如果URL是固定URL（如每日资讯页面），不进行URL去重，允许不同内容入库
                # 只检查内容哈希是否重复
                # 固定URL的特征：不包含具体文章路径，通常是列表页或主页
                fixed_url_patterns = [
                    '/daily-ai-news/',
                    '/zh/news',
                    '/news',
                    '/library',
                    '/blog',
                    '/changelog'
                ]
                is_fixed_url = any(pattern in url for pattern in fixed_url_patterns)
                if not is_fixed_url:
                    # 对于非固定URL（具体文章链接），如果URL已存在，认为是重复
                    cursor.execute('SELECT COUNT(*) FROM push_records WHERE url = ?', (url,))
                    url_count = cursor.fetchone()[0]
                    if url_count > 0:
                        conn.close()
                        return True
            
            # 如果提供了来源和标题，也检查标题+来源的组合（防止不同格式的相同内容）
            if source and title:
                # 清理标题用于比较（移除数字、标点、空白，只保留核心文字）
                clean_title = re.sub(r'\d+', '', title.strip())  # 移除数字
                clean_title = re.sub(r'[^\w\s]', '', clean_title)  # 移除标点
                clean_title = re.sub(r'\s+', ' ', clean_title).strip()  # 规范化空白
                
                # 如果清理后的标题长度足够，进行相似度检查
                if len(clean_title) >= 5:
                    # 获取最近24小时内的记录，检查标题相似度
                    cursor.execute('''
                        SELECT title, content FROM push_records 
                        WHERE source = ? AND push_time > datetime('now', '-1 day')
                        ORDER BY push_time DESC LIMIT 20
                    ''', (source,))
                    recent_records = cursor.fetchall()
                    
                    for existing_title, existing_content in recent_records:
                        if not existing_title:
                            continue
                        # 清理已有标题
                        clean_existing = re.sub(r'\d+', '', existing_title.strip())
                        clean_existing = re.sub(r'[^\w\s]', '', clean_existing)
                        clean_existing = re.sub(r'\s+', ' ', clean_existing).strip()
                        
                        # 如果清理后的标题相似度很高（包含关系或长度相近），可能是重复
                        if len(clean_title) >= 5 and len(clean_existing) >= 5:
                            # 检查是否互相包含（允许部分差异）
                            if clean_title in clean_existing or clean_existing in clean_title:
                                # 进一步检查：如果内容也相似，则认为是重复
                                if content and existing_content:
                                    content_sim = self._calculate_similarity(content, existing_content)
                                    if content_sim > 0.7:  # 70%相似度阈值
                                        conn.close()
                                        return True
                                else:
                                    # 如果没有内容，仅标题相似也认为是重复
                                    conn.close()
                                    return True
            
            conn.close()
            return False
            
        except Exception as e:
            print(f"检查重复失败: {str(e)}")
            return False
    
    def _calculate_similarity(self, str1, str2):
        """计算两个字符串的相似度（简单版本）"""
        if not str1 or not str2:
            return 0.0
        
        # 使用集合交集计算相似度
        set1 = set(str1.lower())
        set2 = set(str2.lower())
        
        if not set1 or not set2:
            return 0.0
        
        intersection = len(set1 & set2)
        union = len(set1 | set2)
        
        return intersection / union if union > 0 else 0.0
    
    def get_daily_records(self, target_date=None):
        """获取指定日期的推送记录"""
        if target_date is None:
            target_date = date.today()
        
        try:
            conn = sqlite3.connect(self.db_path)
            # 确保数据库使用UTF-8编码
            conn.execute("PRAGMA encoding = 'UTF-8'")
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT source, title, content, category, url, push_time, push_channel
                FROM push_records 
                WHERE push_date = ?
                ORDER BY push_time DESC
            ''', (target_date,))
            
            records = cursor.fetchall()
            conn.close()
            
            return records
            
        except Exception as e:
            print(f"获取日记录失败: {str(e)}")
            return []
    
    def get_records_by_date_range(self, start_date, end_date):
        """获取日期范围内的推送记录"""
        try:
            conn = sqlite3.connect(self.db_path)
            # 确保数据库使用UTF-8编码
            conn.execute("PRAGMA encoding = 'UTF-8'")
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT source, title, content, category, url, push_time, push_date, push_channel
                FROM push_records 
                WHERE push_date BETWEEN ? AND ?
                ORDER BY push_date DESC, push_time DESC
            ''', (start_date, end_date))
            
            records = cursor.fetchall()
            conn.close()
            
            return records
            
        except Exception as e:
            print(f"获取范围记录失败: {str(e)}")
            return []
    
    def get_source_statistics(self, days=7):
        """获取来源统计信息"""
        try:
            conn = sqlite3.connect(self.db_path)
            # 确保数据库使用UTF-8编码
            conn.execute("PRAGMA encoding = 'UTF-8'")
            cursor = conn.cursor()
            
            # 获取最近N天的统计
            cursor.execute('''
                SELECT source, COUNT(*) as count
                FROM push_records 
                WHERE push_date >= date('now', '-{} days')
                GROUP BY source
                ORDER BY count DESC
            '''.format(days))
            
            stats = cursor.fetchall()
            conn.close()
            
            return stats
            
        except Exception as e:
            print(f"获取统计失败: {str(e)}")
            return []

# 全局日志记录器实例
push_logger = PushLogger()