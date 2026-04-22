#!/usr/bin/python
# -*- coding: UTF-8 -*-
"""
数据库写入诊断脚本
检查数据库连接、表结构、写入权限等
"""

import os
import sqlite3
from datetime import datetime, date
from push_logger import PushLogger

def check_database():
    """检查数据库状态"""
    print("=" * 60)
    print("数据库写入诊断工具")
    print("=" * 60)
    print()
    
    # 1. 检查数据库文件
    current_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(current_dir, 'push_logs.db')
    
    print(f"1. 检查数据库文件: {db_path}")
    if os.path.exists(db_path):
        size = os.path.getsize(db_path)
        print(f"   ✓ 数据库文件存在，大小: {size / 1024 / 1024:.2f} MB")
    else:
        print(f"   ✗ 数据库文件不存在，将自动创建")
    print()
    
    # 2. 检查数据库连接
    print("2. 检查数据库连接...")
    try:
        conn = sqlite3.connect(db_path)
        conn.execute("PRAGMA encoding = 'UTF-8'")
        cursor = conn.cursor()
        print("   ✓ 数据库连接成功")
        conn.close()
    except Exception as e:
        print(f"   ✗ 数据库连接失败: {e}")
        return
    print()
    
    # 3. 检查表结构
    print("3. 检查表结构...")
    try:
        conn = sqlite3.connect(db_path)
        conn.execute("PRAGMA encoding = 'UTF-8'")
        cursor = conn.cursor()
        
        # 检查表是否存在
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='push_records'")
        if cursor.fetchone():
            print("   ✓ push_records 表存在")
            
            # 检查表结构
            cursor.execute("PRAGMA table_info(push_records)")
            columns = cursor.fetchall()
            print(f"   ✓ 表有 {len(columns)} 个字段:")
            for col in columns:
                print(f"      - {col[1]} ({col[2]})")
        else:
            print("   ✗ push_records 表不存在")
        
        conn.close()
    except Exception as e:
        print(f"   ✗ 检查表结构失败: {e}")
        return
    print()
    
    # 4. 检查数据统计
    print("4. 检查数据统计...")
    try:
        conn = sqlite3.connect(db_path)
        conn.execute("PRAGMA encoding = 'UTF-8'")
        cursor = conn.cursor()
        
        # 总记录数
        cursor.execute("SELECT COUNT(*) FROM push_records")
        total = cursor.fetchone()[0]
        print(f"   ✓ 总记录数: {total}")
        
        # 今日记录数
        today = date.today()
        cursor.execute("SELECT COUNT(*) FROM push_records WHERE push_date = ?", (today,))
        today_count = cursor.fetchone()[0]
        print(f"   ✓ 今日记录数: {today_count}")
        
        # 按来源统计
        cursor.execute("SELECT source, COUNT(*) as count FROM push_records GROUP BY source ORDER BY count DESC LIMIT 10")
        sources = cursor.fetchall()
        print(f"   ✓ 来源统计（前10）:")
        for source, count in sources:
            print(f"      - {source}: {count} 条")
        
        # 最近10条记录
        cursor.execute("SELECT source, title, push_time FROM push_records ORDER BY push_time DESC LIMIT 10")
        recent = cursor.fetchall()
        print(f"   ✓ 最近10条记录:")
        for i, (source, title, push_time) in enumerate(recent, 1):
            title_short = title[:40] + "..." if len(title) > 40 else title
            print(f"      {i}. [{source}] {title_short} ({push_time})")
        
        conn.close()
    except Exception as e:
        print(f"   ✗ 检查数据统计失败: {e}")
        import traceback
        traceback.print_exc()
        return
    print()
    
    # 5. 测试写入
    print("5. 测试数据库写入...")
    try:
        push_logger = PushLogger(db_path=db_path)
        
        test_title = f"测试记录 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        test_content = "这是一条测试记录，用于验证数据库写入功能是否正常。"
        
        success = push_logger.log_push(
            source="诊断工具",
            title=test_title,
            content=test_content,
            category="测试",
            url=None,
            push_channel="无",
            push_status="test",
            keywords=["测试"]
        )
        
        if success:
            print("   ✓ 测试写入成功")
        else:
            print("   ⚠ 测试写入失败（可能是重复内容）")
            
        # 验证是否真的写入了
        conn = sqlite3.connect(db_path)
        conn.execute("PRAGMA encoding = 'UTF-8'")
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM push_records WHERE source = '诊断工具' AND title LIKE '测试记录%'")
        count = cursor.fetchone()[0]
        if count > 0:
            print(f"   ✓ 验证成功：找到 {count} 条测试记录")
        else:
            print("   ✗ 验证失败：未找到测试记录")
        conn.close()
        
    except Exception as e:
        print(f"   ✗ 测试写入失败: {e}")
        import traceback
        traceback.print_exc()
        return
    print()
    
    # 6. 检查文件权限
    print("6. 检查文件权限...")
    try:
        if os.path.exists(db_path):
            # 检查是否可写
            if os.access(db_path, os.W_OK):
                print("   ✓ 数据库文件可写")
            else:
                print("   ✗ 数据库文件不可写（权限问题）")
            
            # 检查目录权限
            db_dir = os.path.dirname(db_path)
            if os.access(db_dir, os.W_OK):
                print("   ✓ 数据库目录可写")
            else:
                print("   ✗ 数据库目录不可写（权限问题）")
        else:
            # 检查目录是否可写（用于创建新文件）
            db_dir = os.path.dirname(db_path)
            if os.access(db_dir, os.W_OK):
                print("   ✓ 数据库目录可写（可以创建新文件）")
            else:
                print("   ✗ 数据库目录不可写（无法创建新文件）")
    except Exception as e:
        print(f"   ✗ 检查权限失败: {e}")
    print()
    
    print("=" * 60)
    print("诊断完成！")
    print("=" * 60)

if __name__ == "__main__":
    check_database()
