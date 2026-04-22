#!/usr/bin/python
# -*- coding: UTF-8 -*-
"""
批量更新脚本，为所有监控脚本添加推送日志记录功能
"""

import os
import re
import glob

def update_script_with_logging(script_path):
    """为单个脚本添加日志记录功能"""
    try:
        with open(script_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 检查是否已经导入了push_logger
        if 'from push_logger import push_logger' in content:
            print(f"{script_path} 已经包含日志记录功能，跳过")
            return True
        
        # 获取脚本名称，用于确定来源
        script_name = os.path.basename(script_path).replace('.py', '')
        source_mapping = {
            'openai-news': 'OpenAI',
            'anthropic-news': 'Anthropic',
            'aibase-news': 'AIBase',
            'ai-bot-news': 'AI-Bot',
            'cursor-changelog-monitor': 'Cursor',
            'huggingface-monitor': 'HuggingFace',
            'trae-changelog': 'TraeAI',
            'ollama-news': 'Ollama'
        }
        
        source_name = source_mapping.get(script_name, script_name.title())
        
        # 1. 添加导入语句
        import_pattern = r'(from datetime import datetime, time\n)'
        if re.search(import_pattern, content):
            content = re.sub(
                import_pattern,
                r'\1from push_logger import push_logger  # 导入推送日志记录器\n',
                content
            )
        else:
            # 如果没有找到datetime导入，在其他导入后添加
            import_lines = []
            lines = content.split('\n')
            insert_index = 0
            
            for i, line in enumerate(lines):
                if line.startswith('import ') or line.startswith('from '):
                    insert_index = i + 1
                elif line.strip() == '' and insert_index > 0:
                    break
            
            lines.insert(insert_index, 'from push_logger import push_logger  # 导入推送日志记录器')
            content = '\n'.join(lines)
        
        # 2. 查找推送成功的代码段并添加日志记录
        # 查找钉钉推送相关的代码
        dingding_pattern = r'(.*?print\("已推送.*?".*?\n)'
        
        if re.search(dingding_pattern, content, re.DOTALL):
            # 找到推送成功的位置，添加日志记录代码
            log_code = f'''
                    # 记录推送日志
                    try:
                        # 从新闻内容中提取标题和链接
                        title_match = re.search(r'📰\\s*(.+?)(?:\\n|$)', news)
                        title = title_match.group(1).strip() if title_match else "{source_name}最新动态"
                        
                        link_match = re.search(r'🔗\\s*链接:\\s*(.+?)(?:\\n|$)', news)
                        url = link_match.group(1).strip() if link_match else None
                        
                        category_match = re.search(r'📋\\s*分类:\\s*(.+?)(?:\\n|$)', news)
                        category = category_match.group(1).strip() if category_match else None
                        
                        # 记录到数据库
                        push_logger.log_push(
                            source="{source_name}",
                            title=title,
                            content=news,
                            category=category,
                            url=url,
                            push_channel="钉钉",
                            push_status="success",
                            keywords=keywords if 'keywords' in locals() else None
                        )
                        
                    except Exception as e:
                        print(f"记录推送日志失败: {{str(e)}}")'''
            
            # 在推送成功后添加日志记录
            content = re.sub(
                r'(\s+print\("已推送.*?".*?\n)',
                r'\1' + log_code + '\n',
                content
            )
        
        # 3. 保存更新后的文件
        backup_path = script_path + '.backup'
        
        # 创建备份
        with open(backup_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        # 写入更新后的内容
        with open(script_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"✅ 已更新 {script_path}")
        return True
        
    except Exception as e:
        print(f"❌ 更新 {script_path} 失败: {str(e)}")
        return False

def main():
    """主函数"""
    print("开始批量更新监控脚本...")
    
    # 查找所有监控脚本
    script_patterns = [
        '*-news.py',
        '*-monitor.py',
        '*-changelog.py'
    ]
    
    scripts_to_update = []
    for pattern in script_patterns:
        scripts_to_update.extend(glob.glob(pattern))
    
    # 排除当前脚本和已知的非监控脚本
    exclude_scripts = [
        'update_scripts_with_logging.py',
        'push_logger.py',
        'daily_report_generator.py'
    ]
    
    scripts_to_update = [s for s in scripts_to_update if s not in exclude_scripts]
    
    if not scripts_to_update:
        print("未找到需要更新的监控脚本")
        return
    
    print(f"找到 {len(scripts_to_update)} 个脚本需要更新:")
    for script in scripts_to_update:
        print(f"  - {script}")
    
    print("\n开始更新...")
    
    success_count = 0
    for script in scripts_to_update:
        if update_script_with_logging(script):
            success_count += 1
    
    print(f"\n更新完成！成功更新 {success_count}/{len(scripts_to_update)} 个脚本")
    
    if success_count > 0:
        print("\n注意事项:")
        print("1. 已为每个脚本创建了 .backup 备份文件")
        print("2. 请测试更新后的脚本是否正常工作")
        print("3. 如有问题，可以使用备份文件恢复")
        print("4. 确保 push_logger.py 文件在同一目录下")

if __name__ == "__main__":
    main()