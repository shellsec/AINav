"""
AI资讯独立Web服务
提供AI资讯数据的API接口和Web页面
"""
import os
import sys
import re
import sqlite3
from datetime import datetime, date
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

# 确保可以导入 push_logger
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)
from push_logger import PushLogger

# 初始化Flask应用
app = Flask(__name__, static_folder='.', static_url_path='')
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'ainews-secret-key')
CORS(app)  # 允许跨域请求

_repo_root = os.path.dirname(current_dir)
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)
from weekly_flask_routes import register_weekly_routes

register_weekly_routes(app, current_dir)

# 初始化数据库连接
db_path = os.path.join(current_dir, 'push_logs.db')
ainews_logger = PushLogger(db_path=db_path)
print(f"AI资讯数据库路径: {db_path}")
print(f"数据库存在: {os.path.exists(db_path)}")

def clean_content(content, title=''):
    """
    彻底清理内容格式，移除所有元数据、重复标题、时间戳等，只保留关键内容
    """
    if not content:
        return ''
    
    # 1. 移除标题在内容中的重复（包括各种变体）
    if title:
        title_variants = [
            title.strip(),
            title.strip().rstrip(':').rstrip('：'),
            title.strip().rstrip(':').rstrip('：').rstrip() + ':',
            title.strip().rstrip(':').rstrip('：').rstrip() + '：',
        ]
        for title_variant in title_variants:
            if title_variant:
                # 移除开头的标题
                if content.startswith(title_variant):
                    content = content[len(title_variant):].lstrip(':').lstrip('：').lstrip('-').lstrip()
                # 移除换行后的标题
                content = re.sub(r'^\s*' + re.escape(title_variant) + r'[：:\s-]*', '', content, flags=re.MULTILINE)
                # 移除行中的标题重复
                content = re.sub(r'\s+' + re.escape(title_variant) + r'[：:\s-]*', ' ', content)
    
    # 2. 移除所有【】格式的元数据标签
    content = re.sub(r'【[^】]+】', '', content)
    
    # 3. 移除日期时间格式（YYYY-MM-DD HH:MM:SS 或类似格式）
    content = re.sub(r'\d{4}[-年/]\d{1,2}[-月/]\d{1,2}[\s-]+\d{1,2}[:：]\d{1,2}[:：]\d{1,2}', '', content)
    content = re.sub(r'\d{4}[-年/]\d{1,2}[-月/]\d{1,2}', '', content)
    content = re.sub(r'\d{1,2}\s*(yesterday|today|ago|小时前|分钟前|天前)', '', content, flags=re.IGNORECASE)
    
    # 4. 移除常见的元数据标签行：标题:、发布日期:、链接:、分类: 等
    content = re.sub(r'^(标题|标题:|发布日期|发布日期:|链接|链接:|分类|分类:|来源|来源:|时间|时间:)[：:\s]*[^\n]*\n?', '', content, flags=re.MULTILINE | re.IGNORECASE)
    
    # 5. 移除"无 未知"这样的元数据
    content = re.sub(r'\s*无\s+未知\s*', ' ', content)
    content = re.sub(r'\s*未知\s*', ' ', content)
    
    # 6. 移除数字+单位（如浏览量、点赞数等）：5,577、5,433、2 yesterday 等
    content = re.sub(r'\d{1,3}(,\d{3})*(\.\d+)?\s*(yesterday|today|ago|views|likes|shares|小时前|分钟前|天前|次)?', '', content, flags=re.IGNORECASE)
    
    # 7. 移除URL（http://、https://开头的链接）
    content = re.sub(r'https?://[^\s]+', '', content)
    content = re.sub(r'www\.[^\s]+', '', content)
    
    # 8. 移除JSON/Markdown格式片段
    content = re.sub(r'\{"[^"]*":"[^"]*"\}', '', content)  # {"insert":"..."}
    content = re.sub(r'\{"attributes":[^}]+\}', '', content)  # {"attributes":...}
    content = re.sub(r'\{[^}]*"insert"[^}]*\}', '', content)  # 包含"insert"的JSON对象
    content = re.sub(r'・\\n', '', content)  # 特殊字符
    content = re.sub(r'\\n', ' ', content)  # 转义的换行符
    
    # 9. 移除分隔符行（等号、减号、下划线等）
    content = re.sub(r'^[=\-_{]{3,}$', '', content, flags=re.MULTILINE)
    
    # 10. 移除行首的标记符号（*、-、+、• 等）
    content = re.sub(r'^[\*\-\+•]\s+', '', content, flags=re.MULTILINE)
    
    # 11. 移除重复的短语（如"Cognition AI 博客更新"、"博客最新更新"等）
    # 移除常见的重复模式
    content = re.sub(r'(博客更新|最新更新|更新通知)[：:\s-]*', '', content, flags=re.IGNORECASE)
    
    # 12. 清理多余的空格和换行
    content = re.sub(r'\s+', ' ', content)  # 多个空格合并为一个
    content = re.sub(r'\n{3,}', '\n\n', content)  # 多个换行合并为两个
    content = re.sub(r'[ \t]+', ' ', content)  # 制表符和空格合并
    
    # 13. 按行处理，移除无效行
    lines = content.split('\n')
    cleaned_lines = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # 跳过只包含符号、数字、日期或URL的行
        if re.match(r'^[^\w\u4e00-\u9fa5]+$', line):  # 只包含非字母数字字符
            continue
        if re.match(r'^\d+$', line):  # 只包含数字
            continue
        if re.match(r'^https?://', line):  # URL行
            continue
        
        # 跳过太短的行（少于5个字符，且不包含中文）
        if len(line) < 5 and not re.search(r'[\u4e00-\u9fa5]', line):
            continue
        
        cleaned_lines.append(line)
    
    # 14. 合并所有行，清理首尾空白
    result = ' '.join(cleaned_lines).strip()
    
    # 15. 移除开头和结尾的标点符号和空格
    result = re.sub(r'^[：:\s\-_]+', '', result)
    result = re.sub(r'[：:\s\-_]+$', '', result)
    
    return result

def extract_meaningful_content(content, max_length=300):
    """
    从内容中提取有意义的预览文本
    先清理内容，然后提取关键部分
    """
    if not content:
        return ''
    
    # 先使用clean_content清理
    cleaned = clean_content(content)
    
    if not cleaned:
        return ''
    
    # 如果清理后的内容已经足够短，直接返回
    if len(cleaned) <= max_length:
        return cleaned
    
    # 如果太长，尝试智能截断
    # 优先在句子边界截断
    truncated = cleaned[:max_length]
    
    # 查找最后一个合适的截断点（句号、问号、感叹号）
    last_punct = max(
        truncated.rfind('。'),
        truncated.rfind('！'),
        truncated.rfind('？'),
        truncated.rfind('.'),
        truncated.rfind('!'),
        truncated.rfind('?'),
        truncated.rfind('，'),
        truncated.rfind(','),
    )
    
    # 如果找到合适的截断点（在70%之后），在那里截断
    if last_punct > max_length * 0.7:
        result = truncated[:last_punct + 1]
    else:
        # 否则在单词边界截断（避免截断单词）
        last_space = truncated.rfind(' ')
        if last_space > max_length * 0.8:
            result = truncated[:last_space] + '...'
        else:
            result = truncated + '...'
    
    return result

@app.route('/')
def index():
    """返回AI资讯页面"""
    return send_from_directory('.', 'index.html')

@app.route('/ainews.html')
def ainews_page():
    """返回AI资讯页面（直接访问路径，兼容旧链接）"""
    return send_from_directory('.', 'index.html')

@app.route('/api/ainews/test')
def test_ainews():
    """测试端点：检查数据库连接和数据"""
    try:
        records = ainews_logger.get_daily_records(date.today())
        return jsonify({
            'status': 'ok',
            'database_path': db_path,
            'database_exists': os.path.exists(db_path),
            'today': str(date.today()),
            'records_count': len(records),
            'sample_record': {
                'source': records[0][0] if records else None,
                'title': records[0][1][:50] if records and records[0][1] else None,
            } if records else None
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ainews')
def get_ainews():
    """获取 AI 资讯数据"""
    try:
        target_date_str = request.args.get('date')
        if target_date_str:
            try:
                target_date = datetime.strptime(target_date_str, '%Y-%m-%d').date()
            except ValueError:
                target_date = date.today()
        else:
            target_date = date.today()
        
        print(f"获取AI资讯，日期: {target_date}")
        
        # 获取指定日期的记录
        records = ainews_logger.get_daily_records(target_date)
        print(f"找到 {len(records)} 条记录")
        
        # 转换为 JSON 格式
        news_items = []
        for idx, record in enumerate(records):
            try:
                if len(record) < 7:
                    print(f"警告: 记录 {idx} 格式无效，期望7个字段，实际 {len(record)} 个")
                    continue
                    
                source, title, content, category, url, push_time, push_channel = record
                
                # 确保字段不为 None
                source = source or '未知来源'
                title = title or ''
                content = content or ''
                category = category or ''
                url = url or '#'
                push_time = push_time or ''
                push_channel = push_channel or ''
                
                # 改进标题提取逻辑
                generic_titles = [
                    'AI日报快讯', 'AI资讯', '无标题', 'AI-Bot每日资讯', 
                    'OpenAI新闻', 'Anthropic新闻', 'Ollama最新模型更新', 
                    'Kiro AI更新通知', 'HuggingFace最新更新', 
                    'Cognition AI博客更新通知', 'Trae AI更新'
                ]
                
                if not title or title in generic_titles:
                    # 尝试从内容中提取标题
                    lines = content.split('\n')
                    for line in lines[:10]:  # 扩大搜索范围
                        line = line.strip()
                        # 跳过元数据标签行
                        if re.match(r'^(【|标题|发布日期|链接|分类)[：:]', line):
                            continue
                        if re.match(r'^[=\-{]{3,}$', line):  # 分隔符行
                            continue
                        if line and len(line) > 10 and len(line) < 200:
                            if not line.startswith('📰') and not line.startswith('📅') and not line.startswith('🔗'):
                                if not re.match(r'^\d{4}[-年]\d{1,2}', line):  # 不是日期行
                                    # 检查是否包含明显的元数据标记
                                    if '【' not in line and '】' not in line:
                                        title = line[:200]
                                        break
                
                # 如果还是没有标题，使用内容的前100个字符
                if not title or title in generic_titles:
                    cleaned_preview = extract_meaningful_content(content, max_length=100)
                    if cleaned_preview:
                        title = cleaned_preview.replace('\n', ' ').strip()[:200]
                
                # 清理内容格式（传入标题以便移除重复）
                cleaned_content = clean_content(content, title)
                
                # 如果清理后内容为空或太短，尝试从原始内容中提取
                if not cleaned_content or len(cleaned_content.strip()) < 10:
                    # 使用extract_meaningful_content提取关键内容
                    cleaned_content = extract_meaningful_content(content, max_length=500)
                    if not cleaned_content:
                        cleaned_content = content
                
                # 格式化时间
                time_str = ''
                if push_time:
                    if isinstance(push_time, str):
                        try:
                            if '.' in push_time:
                                time_str = push_time.split('.')[0]  # 去掉微秒部分
                            else:
                                time_str = push_time
                            if len(time_str) > 19:
                                time_str = time_str[:19]
                        except Exception as e:
                            print(f"   警告: 解析时间字符串失败 '{push_time}': {e}")
                            time_str = push_time[:19] if push_time else ''
                    else:
                        try:
                            time_str = push_time.strftime('%Y-%m-%d %H:%M:%S') if hasattr(push_time, 'strftime') else str(push_time)
                        except Exception as e:
                            print(f"   警告: 格式化时间对象失败: {e}")
                            time_str = str(push_time) if push_time else ''
                
                # 如果时间字符串为空，使用当前时间
                if not time_str:
                    time_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                
                # 构建新闻项
                news_item = {
                    'source': str(source) if source else '未知来源',
                    'title': str(title) if title else '无标题',
                    'content': str(cleaned_content) if cleaned_content else '',  # 使用清理后的内容
                    'category': str(category) if category else '',
                    'url': str(url) if url else '#',
                    'time': str(time_str) if time_str else '',
                    'push_time': str(time_str) if time_str else '',
                    'push_channel': str(push_channel) if push_channel else ''
                }
                news_items.append(news_item)
                
            except Exception as e:
                print(f"❌ 处理记录 {idx} 时出错: {e}")
                import traceback
                traceback.print_exc()
                continue
        
        print(f"✅ 成功处理 {len(news_items)}/{len(records)} 条记录")
        return jsonify(news_items)
        
    except Exception as e:
        print(f"获取AI资讯失败: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e), 'message': '获取AI资讯失败'}), 500

@app.route('/api/ainews/latest-date')
def get_latest_date():
    """获取最近有数据的日期（按日期排序，不是按数据量）"""
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 查询最近有数据的日期（按日期降序，取最新的）
        cursor.execute('''
            SELECT push_date 
            FROM push_records 
            WHERE push_date <= date('now')
            ORDER BY push_date DESC 
            LIMIT 1
        ''')
        
        result = cursor.fetchone()
        conn.close()
        
        if result:
            latest_date = result[0]
            return jsonify({'latest_date': latest_date})
        else:
            return jsonify({'latest_date': None})
            
    except Exception as e:
        print(f"获取最近日期失败: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/health')
def health():
    """健康检查端点"""
    return jsonify({'status': 'ok', 'service': 'ainews'})

@app.route('/daily_analysis_index.html')
def daily_analysis_index():
    """每日分析索引页面"""
    return send_from_directory('.', 'daily_analysis_index.html')

@app.route('/daily_analysis.html')
def daily_analysis_detail():
    """每日分析详情页面（避免占用根路径 /）"""
    return send_from_directory('.', 'daily_analysis.html')

@app.route('/daily_analysis/list.json')
def get_analysis_list():
    """获取分析列表"""
    try:
        import json
        analysis_dir = os.path.join(current_dir, 'daily_analysis')
        list_file = os.path.join(analysis_dir, 'analysis_list.json')
        
        if os.path.exists(list_file):
            with open(list_file, 'r', encoding='utf-8') as f:
                return jsonify(json.load(f))
        
        # 如果没有列表文件，扫描目录
        analyses = []
        if os.path.exists(analysis_dir):
            for filename in os.listdir(analysis_dir):
                if filename.startswith('analysis_') and filename.endswith('.json'):
                    try:
                        filepath = os.path.join(analysis_dir, filename)
                        with open(filepath, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                            analysis = data.get('analysis', {})
                            analyses.append({
                                'date': data.get('date', ''),
                                'news_count': data.get('news_count', 0),
                                'sentiment': analysis.get('overall_sentiment', '中性'),
                                'sentiment_score': analysis.get('sentiment_score', 50),
                                'trading_suggestion': analysis.get('trading_suggestion', {}).get('action', 'CASH') if isinstance(analysis.get('trading_suggestion'), dict) else analysis.get('trading_suggestion', 'CASH'),
                                'method': data.get('analysis_method', 'keyword'),
                                'analyzed_at': data.get('analyzed_at', '')
                            })
                    except:
                        continue
        
        analyses.sort(key=lambda x: x.get('date', ''), reverse=True)
        return jsonify({'analyses': analyses, 'total_count': len(analyses)})
    except Exception as e:
        return jsonify({'error': str(e), 'analyses': []}), 500

@app.route('/daily_analysis/analysis_<date>.json')
def get_analysis_detail(date):
    """获取指定日期的分析详情"""
    try:
        import json
        # 仅允许 YYYY-MM-DD，防止路径穿越
        if not re.match(r'^\d{4}-\d{2}-\d{2}$', date or ''):
            return jsonify({'error': 'Invalid date format'}), 400
        analysis_dir = os.path.join(current_dir, 'daily_analysis')
        analysis_file = os.path.join(analysis_dir, f'analysis_{date}.json')
        # 确保最终路径仍在 analysis_dir 内
        real_dir = os.path.realpath(analysis_dir)
        real_file = os.path.realpath(analysis_file)
        if not real_file.startswith(real_dir) or not os.path.isfile(real_file):
            return jsonify({'error': 'Analysis not found'}), 404
        with open(real_file, 'r', encoding='utf-8') as f:
            return jsonify(json.load(f))
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))  # 默认使用5001端口，避免与主应用冲突
    print("=" * 60)
    print("🚀 AI资讯Web服务启动中...")
    print(f"📊 数据库路径: {db_path}")
    print(f"🌐 访问地址: http://localhost:{port}")
    print(f"📰 AI资讯页面: http://localhost:{port}/")
    print(f"🔍 API测试: http://localhost:{port}/api/ainews/test")
    print("=" * 60)
    
    app.run(host='0.0.0.0', port=port, debug=False)
