#!/usr/bin/python
# -*- coding: UTF-8 -*-
"""
AI资讯统一监控脚本
整合多个AI资讯来源，自动抓取最新资讯并入库
"""
import os
import sys
import requests
import time as time_module
import configparser
import re
from datetime import datetime, date
from bs4 import BeautifulSoup
from requests.packages.urllib3.exceptions import InsecureRequestWarning
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

# 添加当前目录到路径
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)
from push_logger import PushLogger

# 初始化数据库连接
db_path = os.path.join(current_dir, 'push_logs.db')
push_logger = PushLogger(db_path=db_path)

# 读取配置文件
config = configparser.ConfigParser()
config_file = os.path.join(current_dir, 'config.ini')
if os.path.exists(config_file):
    try:
        with open(config_file, 'r', encoding='utf-8') as f:
            config.read_file(f)
    except UnicodeDecodeError:
        with open(config_file, 'r', encoding='gbk') as f:
            config.read_file(f)
else:
    print("未找到配置文件，将使用默认配置（所有来源启用）")

# 通用请求函数
def fetch_url(url, headers=None, max_retries=3, retry_delay=5):
    """通用URL请求函数"""
    if headers is None:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
        }
    
    for attempt in range(max_retries):
        try:
            response = requests.get(url, headers=headers, timeout=30, verify=False)
            if response.status_code == 200:
                return response
            else:
                print(f'请求失败，状态码: {response.status_code}, 重试 {attempt + 1}/{max_retries}')
                if attempt < max_retries - 1:
                    time_module.sleep(retry_delay)
        except Exception as e:
            print(f'请求异常: {str(e)}, 重试 {attempt + 1}/{max_retries}')
            if attempt < max_retries - 1:
                time_module.sleep(retry_delay)
    
    print('所有重试均失败，跳过本次请求')
    return None

def get_current_time():
    return time_module.strftime('%Y-%m-%d %H:%M:%S', time_module.localtime(time_module.time()))

# ==================== AI资讯抓取函数 ====================

def get_google_ai_news():
    """获取Google AI Blog最新资讯"""
    print("开始获取Google AI Blog资讯...")
    try:
        # 直接使用HTML解析（RSS已失效）
        url = "https://blog.google/technology/ai/"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
        response = fetch_url(url, headers=headers)
        if not response:
            return None
        
        soup = BeautifulSoup(response.text, 'html.parser')
        news_list = []
        seen_urls = set()
        
        selectors = [
            'article',
            '.post',
            'h2 a',
            'h3 a',
            'a[href*="/"]',
        ]
        
        for selector in selectors:
            items = soup.select(selector)
            if items and len(items) > 0:
                print(f"使用选择器 '{selector}' 找到 {len(items)} 个元素")
                for item in items[:20]:
                    try:
                        link = item if item.name == 'a' else item.find('a', href=True)
                        if not link:
                            continue
                        
                        href = link.get('href', '')
                        if not href or href == '#':
                            continue
                        
                        if not href.startswith('http'):
                            if href.startswith('/'):
                                full_url = f"https://blog.google{href}"
                            else:
                                full_url = f"https://blog.google/technology/ai/{href}"
                        else:
                            full_url = href
                        
                        if 'blog.google' not in full_url or '/technology/ai/' not in full_url:
                            continue
                        
                        if full_url in seen_urls:
                            continue
                        seen_urls.add(full_url)
                        
                        title = link.get_text(strip=True)
                        if not title or len(title) < 5:
                            continue
                        
                        content = title
                        parent = link.find_parent(['article', 'div', 'section'])
                        if parent:
                            desc = parent.get_text(strip=True)
                            if desc and len(desc) > len(title) + 20:
                                content = desc[:300] + '...' if len(desc) > 300 else desc
                        
                        news_list.append({
                            'title': title,
                            'url': full_url,
                            'content': content
                        })
                        print(f"  ✓ 找到: {title[:50]}...")
                        if len(news_list) >= 10:
                            break
                    except Exception as e:
                        continue
                
                if news_list:
                    break
        
        print(f"Google AI Blog提取到 {len(news_list)} 条资讯")
        if news_list:
            return news_list[:10]
        return None
    except Exception as e:
        print(f"获取Google AI Blog资讯失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def get_microsoft_ai_news():
    """获取Microsoft AI Blog最新资讯"""
    print("开始获取Microsoft AI Blog资讯...")
    try:
        url = "https://www.microsoft.com/en-us/research/blog/"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
        response = fetch_url(url, headers=headers)
        if not response:
            return None
        
        soup = BeautifulSoup(response.text, 'html.parser')
        news_list = []
        seen_urls = set()
        
        # 尝试多种选择器
        selectors = [
            'article',
            '.post',
            '.blog-post',
            'h2 a',
            'h3 a',
            'a[href*="/research/blog/"]',
        ]
        
        for selector in selectors:
            items = soup.select(selector)
            if items and len(items) > 0:
                print(f"使用选择器 '{selector}' 找到 {len(items)} 个元素")
                for item in items[:20]:
                    try:
                        link = item if item.name == 'a' else item.find('a', href=True)
                        if not link:
                            continue
                        
                        href = link.get('href', '')
                        if not href or href == '#':
                            continue
                        
                        if not href.startswith('http'):
                            if href.startswith('/'):
                                full_url = f"https://www.microsoft.com{href}"
                            else:
                                full_url = f"https://www.microsoft.com/en-us/research/blog/{href}"
                        else:
                            full_url = href
                        
                        if 'microsoft.com' not in full_url or '/research/blog/' not in full_url:
                            continue
                        
                        if full_url in seen_urls:
                            continue
                        seen_urls.add(full_url)
                        
                        title = link.get_text(strip=True)
                        if not title or len(title) < 5:
                            continue
                        
                        content = title
                        parent = link.find_parent(['article', 'div', 'section'])
                        if parent:
                            desc = parent.get_text(strip=True)
                            if desc and len(desc) > len(title) + 20:
                                content = desc[:300] + '...' if len(desc) > 300 else desc
                        
                        news_list.append({
                            'title': title,
                            'url': full_url,
                            'content': content
                        })
                        print(f"  ✓ 找到: {title[:50]}...")
                        if len(news_list) >= 10:
                            break
                    except Exception as e:
                        continue
                
                if news_list:
                    break
        
        print(f"Microsoft AI Blog提取到 {len(news_list)} 条资讯")
        if news_list:
            return news_list[:10]
        return None
    except Exception as e:
        print(f"获取Microsoft AI Blog资讯失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def get_meta_ai_news():
    """获取Meta AI Research最新资讯"""
    print("开始获取Meta AI Research资讯...")
    try:
        # 尝试多个URL
        urls = [
            "https://ai.meta.com/blog",
            "https://ai.meta.com/",
            "https://about.fb.com/news/tag/artificial-intelligence/",
        ]
        
        response = None
        selected_url = None
        for url in urls:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            }
            print(f"  尝试访问: {url}")
            response = fetch_url(url, headers=headers)
            if response and response.status_code == 200:
                selected_url = url
                break
        
        if not response or response.status_code != 200:
            print(f"  [警告] Meta AI - 所有URL访问失败")
            return None
        
        soup = BeautifulSoup(response.text, 'html.parser')
        news_list = []
        seen_urls = set()
        
        selectors = [
            'article',
            '.post',
            '.blog-post',
            'h2 a',
            'h3 a',
            'a[href*="/blog/"]',
        ]
        
        for selector in selectors:
            items = soup.select(selector)
            if items and len(items) > 0:
                print(f"使用选择器 '{selector}' 找到 {len(items)} 个元素")
                for item in items[:20]:
                    try:
                        link = item if item.name == 'a' else item.find('a', href=True)
                        if not link:
                            continue
                        
                        href = link.get('href', '')
                        if not href or href == '#':
                            continue
                        
                        if not href.startswith('http'):
                            if href.startswith('/'):
                                if selected_url and 'about.fb.com' in selected_url:
                                    full_url = f"https://about.fb.com{href}"
                                else:
                                    full_url = f"https://ai.meta.com{href}"
                            else:
                                full_url = f"https://ai.meta.com/blog/{href}"
                        else:
                            full_url = href
                        
                        if 'meta.com' not in full_url and 'fb.com' not in full_url:
                            continue
                        
                        if full_url in seen_urls:
                            continue
                        seen_urls.add(full_url)
                        
                        title = link.get_text(strip=True)
                        if not title or len(title) < 5:
                            continue
                        
                        content = title
                        parent = link.find_parent(['article', 'div', 'section'])
                        if parent:
                            desc = parent.get_text(strip=True)
                            if desc and len(desc) > len(title) + 20:
                                content = desc[:300] + '...' if len(desc) > 300 else desc
                        
                        news_list.append({
                            'title': title,
                            'url': full_url,
                            'content': content
                        })
                        print(f"  ✓ 找到: {title[:50]}...")
                        if len(news_list) >= 10:
                            break
                    except Exception as e:
                        continue
                
                if news_list:
                    break
        
        print(f"Meta AI Research提取到 {len(news_list)} 条资讯")
        if news_list:
            return news_list[:10]
        return None
    except Exception as e:
        print(f"获取Meta AI Research资讯失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def get_deepmind_news():
    """获取DeepMind Blog最新资讯"""
    print("开始获取DeepMind Blog资讯...")
    try:
        url = "https://www.deepmind.com/blog"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
        response = fetch_url(url, headers=headers)
        if not response:
            return None
        
        soup = BeautifulSoup(response.text, 'html.parser')
        news_list = []
        seen_urls = set()
        
        selectors = [
            'article',
            '.post',
            '.blog-post',
            'h2 a',
            'h3 a',
            'a[href*="/blog/"]',
        ]
        
        for selector in selectors:
            items = soup.select(selector)
            if items and len(items) > 0:
                print(f"使用选择器 '{selector}' 找到 {len(items)} 个元素")
                for item in items[:20]:
                    try:
                        link = item if item.name == 'a' else item.find('a', href=True)
                        if not link:
                            continue
                        
                        href = link.get('href', '')
                        if not href or href == '#':
                            continue
                        
                        if not href.startswith('http'):
                            if href.startswith('/'):
                                full_url = f"https://www.deepmind.com{href}"
                            else:
                                full_url = f"https://www.deepmind.com/blog/{href}"
                        else:
                            full_url = href
                        
                        if 'deepmind.com' not in full_url:
                            continue
                        
                        if full_url in seen_urls:
                            continue
                        seen_urls.add(full_url)
                        
                        title = link.get_text(strip=True)
                        if not title or len(title) < 5:
                            continue
                        
                        content = title
                        parent = link.find_parent(['article', 'div', 'section'])
                        if parent:
                            desc = parent.get_text(strip=True)
                            if desc and len(desc) > len(title) + 20:
                                content = desc[:300] + '...' if len(desc) > 300 else desc
                        
                        news_list.append({
                            'title': title,
                            'url': full_url,
                            'content': content
                        })
                        print(f"  ✓ 找到: {title[:50]}...")
                        if len(news_list) >= 10:
                            break
                    except Exception as e:
                        continue
                
                if news_list:
                    break
        
        print(f"DeepMind Blog提取到 {len(news_list)} 条资讯")
        if news_list:
            return news_list[:10]
        return None
    except Exception as e:
        print(f"获取DeepMind Blog资讯失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def get_stability_ai_news():
    """获取Stability AI Blog最新资讯"""
    print("开始获取Stability AI Blog资讯...")
    try:
        # 尝试多个URL
        urls = [
            "https://stability.ai/news",
            "https://stability.ai/blog",
            "https://stability.ai/",
        ]
        
        response = None
        for url in urls:
            print(f"  尝试访问: {url}")
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            }
            response = fetch_url(url, headers=headers)
            if response and response.status_code == 200:
                break
        
        if not response or response.status_code != 200:
            print(f"  [警告] Stability AI - 所有URL访问失败")
            return None
        
        url = response.url  # 使用实际访问的URL
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
        response = fetch_url(url, headers=headers)
        if not response:
            return None
        
        soup = BeautifulSoup(response.text, 'html.parser')
        news_list = []
        seen_urls = set()
        
        selectors = [
            'article',
            '.post',
            '.blog-post',
            'h2 a',
            'h3 a',
            'a[href*="/blog/"]',
        ]
        
        for selector in selectors:
            items = soup.select(selector)
            if items and len(items) > 0:
                print(f"使用选择器 '{selector}' 找到 {len(items)} 个元素")
                for item in items[:20]:
                    try:
                        link = item if item.name == 'a' else item.find('a', href=True)
                        if not link:
                            continue
                        
                        href = link.get('href', '')
                        if not href or href == '#':
                            continue
                        
                        if not href.startswith('http'):
                            if href.startswith('/'):
                                full_url = f"https://stability.ai{href}"
                            else:
                                full_url = f"https://stability.ai/blog/{href}"
                        else:
                            full_url = href
                        
                        if 'stability.ai' not in full_url:
                            continue
                        
                        if full_url in seen_urls:
                            continue
                        seen_urls.add(full_url)
                        
                        title = link.get_text(strip=True)
                        if not title or len(title) < 5:
                            continue
                        
                        content = title
                        parent = link.find_parent(['article', 'div', 'section'])
                        if parent:
                            desc = parent.get_text(strip=True)
                            if desc and len(desc) > len(title) + 20:
                                content = desc[:300] + '...' if len(desc) > 300 else desc
                        
                        news_list.append({
                            'title': title,
                            'url': full_url,
                            'content': content
                        })
                        print(f"  ✓ 找到: {title[:50]}...")
                        if len(news_list) >= 10:
                            break
                    except Exception as e:
                        continue
                
                if news_list:
                    break
        
        print(f"Stability AI Blog提取到 {len(news_list)} 条资讯")
        if news_list:
            return news_list[:10]
        return None
    except Exception as e:
        print(f"获取Stability AI Blog资讯失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def get_paperswithcode_news():
    """获取Papers with Code最新资讯"""
    print("开始获取Papers with Code资讯...")
    try:
        url = "https://paperswithcode.com/"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
        response = fetch_url(url, headers=headers)
        if not response:
            return None
        
        soup = BeautifulSoup(response.text, 'html.parser')
        news_list = []
        seen_urls = set()
        
        # 查找所有包含 /paper/ 的链接
        all_links = soup.find_all('a', href=re.compile(r'/paper/'))
        print(f"找到 {len(all_links)} 个论文链接")
        
        for link in all_links[:30]:
            try:
                href = link.get('href', '')
                if not href or href == '#':
                    continue
                
                if not href.startswith('http'):
                    if href.startswith('/'):
                        full_url = f"https://paperswithcode.com{href}"
                    else:
                        full_url = f"https://paperswithcode.com/{href}"
                else:
                    full_url = href
                
                if 'paperswithcode.com' not in full_url or '/paper/' not in full_url:
                    continue
                
                if full_url in seen_urls:
                    continue
                seen_urls.add(full_url)
                
                title = link.get_text(strip=True)
                if not title or len(title) < 5:
                    # 尝试从父元素获取标题
                    parent = link.find_parent(['div', 'article', 'section', 'h1', 'h2', 'h3'])
                    if parent:
                        title = parent.get_text(strip=True)
                        if '\n' in title:
                            title = title.split('\n')[0].strip()
                
                if not title or len(title) < 5:
                    continue
                
                # 提取内容
                content = title
                parent = link.find_parent(['div', 'article', 'section'])
                if parent:
                    desc = parent.get_text(strip=True)
                    if desc and len(desc) > len(title) + 20:
                        if desc.lower().startswith(title.lower()):
                            desc = desc[len(title):].strip()
                        content = desc[:300] + '...' if len(desc) > 300 else desc
                
                news_list.append({
                    'title': title,
                    'url': full_url,
                    'content': content
                })
                print(f"  ✓ 找到: {title[:50]}...")
                if len(news_list) >= 10:
                    break
            except Exception as e:
                continue
        
        print(f"Papers with Code提取到 {len(news_list)} 条资讯")
        if news_list:
            return news_list[:10]
        return None
    except Exception as e:
        print(f"获取Papers with Code资讯失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def get_ai_news_site():
    """获取AI News网站最新资讯"""
    print("开始获取AI News资讯...")
    try:
        url = "https://www.artificialintelligence-news.com/"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
        response = fetch_url(url, headers=headers)
        if not response:
            return None
        
        soup = BeautifulSoup(response.text, 'html.parser')
        news_list = []
        seen_urls = set()
        
        selectors = [
            'article',
            '.post',
            '.news-item',
            'h2 a',
            'h3 a',
            'a[href*="/"]',
        ]
        
        for selector in selectors:
            items = soup.select(selector)
            if items and len(items) > 0:
                print(f"使用选择器 '{selector}' 找到 {len(items)} 个元素")
                for item in items[:20]:
                    try:
                        link = item if item.name == 'a' else item.find('a', href=True)
                        if not link:
                            continue
                        
                        href = link.get('href', '')
                        if not href or href == '#':
                            continue
                        
                        if not href.startswith('http'):
                            if href.startswith('/'):
                                full_url = f"https://www.artificialintelligence-news.com{href}"
                            else:
                                full_url = f"https://www.artificialintelligence-news.com/{href}"
                        else:
                            full_url = href
                        
                        if 'artificialintelligence-news.com' not in full_url:
                            continue
                        
                        # 排除非文章页面
                        if any(exclude in full_url for exclude in ['/tag/', '/category/', '/author/', '/search', '/page/', '/login']):
                            continue
                        
                        if full_url in seen_urls:
                            continue
                        seen_urls.add(full_url)
                        
                        title = link.get_text(strip=True)
                        if not title or len(title) < 5:
                            continue
                        
                        content = title
                        parent = link.find_parent(['article', 'div', 'section'])
                        if parent:
                            desc = parent.get_text(strip=True)
                            if desc and len(desc) > len(title) + 20:
                                content = desc[:300] + '...' if len(desc) > 300 else desc
                        
                        news_list.append({
                            'title': title,
                            'url': full_url,
                            'content': content
                        })
                        print(f"  ✓ 找到: {title[:50]}...")
                        if len(news_list) >= 10:
                            break
                    except Exception as e:
                        continue
                
                if news_list:
                    break
        
        print(f"AI News提取到 {len(news_list)} 条资讯")
        if news_list:
            return news_list[:10]
        return None
    except Exception as e:
        print(f"获取AI News资讯失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def get_venturebeat_ai_news():
    """获取VentureBeat AI最新资讯"""
    print("开始获取VentureBeat AI资讯...")
    try:
        url = "https://venturebeat.com/ai/"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
        response = fetch_url(url, headers=headers)
        if not response:
            return None
        
        soup = BeautifulSoup(response.text, 'html.parser')
        news_list = []
        seen_urls = set()
        
        selectors = [
            'article',
            '.post',
            '.article-item',
            'h2 a',
            'h3 a',
            'a[href*="/ai/"]',
        ]
        
        for selector in selectors:
            items = soup.select(selector)
            if items and len(items) > 0:
                print(f"使用选择器 '{selector}' 找到 {len(items)} 个元素")
                for item in items[:20]:
                    try:
                        link = item if item.name == 'a' else item.find('a', href=True)
                        if not link:
                            continue
                        
                        href = link.get('href', '')
                        if not href or href == '#':
                            continue
                        
                        if not href.startswith('http'):
                            if href.startswith('/'):
                                full_url = f"https://venturebeat.com{href}"
                            else:
                                full_url = f"https://venturebeat.com/ai/{href}"
                        else:
                            full_url = href
                        
                        if 'venturebeat.com' not in full_url or '/ai/' not in full_url:
                            continue
                        
                        if full_url in seen_urls:
                            continue
                        seen_urls.add(full_url)
                        
                        title = link.get_text(strip=True)
                        if not title or len(title) < 5:
                            continue
                        
                        content = title
                        parent = link.find_parent(['article', 'div', 'section'])
                        if parent:
                            desc = parent.get_text(strip=True)
                            if desc and len(desc) > len(title) + 20:
                                content = desc[:300] + '...' if len(desc) > 300 else desc
                        
                        news_list.append({
                            'title': title,
                            'url': full_url,
                            'content': content
                        })
                        print(f"  ✓ 找到: {title[:50]}...")
                        if len(news_list) >= 10:
                            break
                    except Exception as e:
                        continue
                
                if news_list:
                    break
        
        print(f"VentureBeat AI提取到 {len(news_list)} 条资讯")
        if news_list:
            return news_list[:10]
        return None
    except Exception as e:
        print(f"获取VentureBeat AI资讯失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def get_deeplearning_ai_news():
    """获取The Batch (DeepLearning.AI)最新资讯"""
    print("开始获取The Batch资讯...")
    try:
        url = "https://www.deeplearning.ai/the-batch/"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
        response = fetch_url(url, headers=headers)
        if not response:
            return None
        
        soup = BeautifulSoup(response.text, 'html.parser')
        news_list = []
        seen_urls = set()
        
        selectors = [
            'article',
            '.post',
            '.batch-item',
            'h2 a',
            'h3 a',
            'a[href*="/the-batch/"]',
        ]
        
        for selector in selectors:
            items = soup.select(selector)
            if items and len(items) > 0:
                print(f"使用选择器 '{selector}' 找到 {len(items)} 个元素")
                for item in items[:20]:
                    try:
                        link = item if item.name == 'a' else item.find('a', href=True)
                        if not link:
                            continue
                        
                        href = link.get('href', '')
                        if not href or href == '#':
                            continue
                        
                        if not href.startswith('http'):
                            if href.startswith('/'):
                                full_url = f"https://www.deeplearning.ai{href}"
                            else:
                                full_url = f"https://www.deeplearning.ai/the-batch/{href}"
                        else:
                            full_url = href
                        
                        if 'deeplearning.ai' not in full_url:
                            continue
                        
                        if full_url in seen_urls:
                            continue
                        seen_urls.add(full_url)
                        
                        title = link.get_text(strip=True)
                        if not title or len(title) < 5:
                            continue
                        
                        content = title
                        parent = link.find_parent(['article', 'div', 'section'])
                        if parent:
                            desc = parent.get_text(strip=True)
                            if desc and len(desc) > len(title) + 20:
                                content = desc[:300] + '...' if len(desc) > 300 else desc
                        
                        news_list.append({
                            'title': title,
                            'url': full_url,
                            'content': content
                        })
                        print(f"  ✓ 找到: {title[:50]}...")
                        if len(news_list) >= 10:
                            break
                    except Exception as e:
                        continue
                
                if news_list:
                    break
        
        print(f"The Batch提取到 {len(news_list)} 条资讯")
        if news_list:
            return news_list[:10]
        return None
    except Exception as e:
        print(f"获取The Batch资讯失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def get_arxiv_ai_news():
    """获取arXiv AI论文最新资讯（使用RSS）"""
    print("开始获取arXiv AI论文资讯...")
    try:
        url = "https://arxiv.org/list/cs.AI/recent?show=25"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
        response = fetch_url(url, headers=headers)
        if not response:
            return None
        
        soup = BeautifulSoup(response.text, 'html.parser')
        news_list = []
        seen_ids = set()
        
        # arXiv的HTML结构：每个论文在一个dt/dd对中
        dt_items = soup.find_all('dt')
        
        for dt in dt_items[:15]:
            try:
                # 提取论文ID和标题
                id_link = dt.find('a', href=re.compile(r'/abs/'))
                if not id_link:
                    continue
                
                paper_id = id_link.get_text(strip=True)
                if paper_id in seen_ids:
                    continue
                seen_ids.add(paper_id)
                
                # 找到对应的dd元素（包含标题）
                dd = dt.find_next_sibling('dd')
                if not dd:
                    continue
                
                title_elem = dd.find('div', class_='list-title')
                if not title_elem:
                    continue
                
                # 提取标题（去掉"Title:"前缀）
                title = title_elem.get_text(strip=True).replace('Title:', '').strip()
                if not title or len(title) < 5:
                    continue
                
                # 构建URL
                paper_url = f"https://arxiv.org/abs/{paper_id.split(':')[-1]}"
                
                # 提取摘要
                abstract_elem = dd.find('p')
                content = title
                if abstract_elem:
                    abstract = abstract_elem.get_text(strip=True)
                    if abstract and len(abstract) > 20:
                        content = abstract[:300] + '...' if len(abstract) > 300 else abstract
                
                news_list.append({
                    'title': f"[论文] {title}",
                    'url': paper_url,
                    'content': content
                })
                print(f"  ✓ 找到: {title[:50]}...")
                if len(news_list) >= 10:
                    break
            except Exception as e:
                continue
        
        print(f"arXiv AI提取到 {len(news_list)} 条资讯")
        if news_list:
            return news_list[:10]
        return None
    except Exception as e:
        print(f"获取arXiv AI论文资讯失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def get_jiqizhixin_news():
    """获取机器之心最新AI/科技资讯"""
    print("开始获取机器之心资讯...")
    try:
        url = "https://www.jiqizhixin.com/"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9',
            'Referer': 'https://www.jiqizhixin.com/',
        }
        response = fetch_url(url, headers=headers)
        if not response:
            return None
        soup = BeautifulSoup(response.text, 'html.parser')
        news_list = []
        seen_urls = set()
        base = "https://www.jiqizhixin.com"
        selectors = [
            'a[href*="/articles/"]',
            'a[href*="/news/"]',
            'article a[href^="/"]',
            '.article-item a',
            '.list-item a',
        ]
        for selector in selectors:
            items = soup.select(selector)
            if not items:
                continue
            for item in items[:25]:
                try:
                    href = item.get('href', '').strip()
                    title = item.get_text(strip=True)
                    if not href or not title or len(title) < 5:
                        continue
                    if not href.startswith('http'):
                        full_url = href if href.startswith('/') else '/' + href
                        full_url = base + full_url
                    else:
                        full_url = href
                    if 'jiqizhixin.com' not in full_url:
                        continue
                    if full_url in seen_urls:
                        continue
                    seen_urls.add(full_url)
                    if '/articles/' not in full_url and '/news/' not in full_url:
                        continue
                    news_list.append({
                        'title': title,
                        'url': full_url,
                        'content': title
                    })
                except Exception:
                    continue
            if news_list:
                break
        if news_list:
            news_list = news_list[:10]
            print(f"机器之心提取到 {len(news_list)} 条资讯")
            return news_list
        return None
    except Exception as e:
        print(f"获取机器之心资讯失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

# ==================== 主函数 ====================

def main():
    """主函数：抓取所有AI资讯来源并入库"""
    print("=" * 60)
    print(f"开始获取AI资讯 - {get_current_time()}")
    print("=" * 60)
    
    # 定义所有来源及其抓取函数和更新频率（小时）
    # 格式: (来源名称, 抓取函数, 更新间隔小时数)
    all_sources = [
        ('Google AI', get_google_ai_news, 12),  # 中等更新频率
        ('Microsoft AI', get_microsoft_ai_news, 12),  # 中等更新频率
        ('Meta AI', get_meta_ai_news, 24),  # 暂时禁用，更新频率设为24小时
        ('DeepMind', get_deepmind_news, 12),  # 中等更新频率
        ('Stability AI', get_stability_ai_news, 24),  # 暂时有问题，更新频率设为24小时
        ('Papers with Code', get_paperswithcode_news, 6),  # 高更新频率（但暂时有问题）
        ('AI News', get_ai_news_site, 6),  # 高更新频率
        ('VentureBeat AI', get_venturebeat_ai_news, 6),  # 高更新频率
        ('The Batch', get_deeplearning_ai_news, 168),  # 周报，每周更新一次
        ('arXiv AI', get_arxiv_ai_news, 6),  # 高更新频率
        ('机器之心', get_jiqizhixin_news, 6),  # 中文 AI/科技媒体
    ]
    
    # 根据配置文件过滤启用的来源
    sources = []
    if config.has_section('sources'):
        for source_name, fetch_func, update_interval in all_sources:
            if config.has_option('sources', source_name):
                try:
                    raw_value = config.get('sources', source_name).strip().lower()
                    if raw_value in ['true', '1', 'yes', 'on']:
                        enabled = True
                    elif raw_value in ['false', '0', 'no', 'off']:
                        enabled = False
                    else:
                        enabled = True
                except:
                    enabled = True
                
                if enabled:
                    sources.append((source_name, fetch_func))
                    print(f"[配置] {source_name}: 已启用 (更新间隔: {update_interval}小时)")
                else:
                    print(f"[配置] {source_name}: 已禁用")
            else:
                sources.append((source_name, fetch_func))
                print(f"[配置] {source_name}: 未配置，默认启用 (更新间隔: {update_interval}小时)")
    else:
        # 如果没有配置节，只取前两个元素（名称和函数）
        sources = [(name, func) for name, func, _ in all_sources]
        print("[配置] 未找到sources配置节，启用所有来源")
    
    # 统计信息
    total_new = 0
    total_skipped = 0
    
    # 遍历所有启用的来源
    for source_name, fetch_func in sources:
        print(f"\n--- 处理 {source_name} ---")
        try:
            news_list = fetch_func()
            
            if not news_list:
                print(f"[警告] {source_name} - 未获取到内容")
                continue
            
            print(f"[调试] {source_name} 返回了 {len(news_list)} 个新闻项")
            
            # 入库处理
            for news in news_list:
                try:
                    title = news.get('title', '').strip()
                    content = news.get('content', '').strip()
                    url = news.get('url', '')
                    
                    if not title:
                        continue
                    
                    # 如果没有content，使用title作为content
                    if not content:
                        content = title
                    
                    print(f"[调试] {source_name} - 准备入库: {title[:50]}... (URL: {url})")
                    print(f"[调试] 内容长度: {len(content)} 字符")
                    
                    # 记录到数据库
                    try:
                        success = push_logger.log_push(
                            source=source_name,
                            title=title,
                            content=content,
                            category='AI资讯',
                            url=url if url else None,
                            push_channel="无",
                            push_status="success",
                            keywords=None
                        )
                        
                        if success:
                            total_new += 1
                            print(f"[成功] {source_name} - 已入库: {title[:50]}...")
                        else:
                            total_skipped += 1
                            print(f"[跳过] {source_name} - 重复或去重: {title[:50]}...")
                    except Exception as db_error:
                        print(f"[数据库错误] {source_name} - 写入数据库失败: {str(db_error)}")
                        import traceback
                        traceback.print_exc()
                        # 即使数据库写入失败，也继续处理下一条
                        continue
                        
                except Exception as e:
                    print(f"[错误] {source_name} - 处理单条新闻失败: {str(e)}")
                    import traceback
                    traceback.print_exc()
                    continue
                    
        except KeyboardInterrupt:
            print("\n[中断] 用户中断，退出程序")
            break
        except Exception as e:
            print(f"[严重错误] 执行任务时出错: {str(e)}")
            import traceback
            traceback.print_exc()
            continue
    
    # 输出统计信息
    print("\n" + "=" * 60)
    print(f"AI资讯抓取完成 - {get_current_time()}")
    print(f"新增: {total_new} 条，跳过: {total_skipped} 条")
    print("=" * 60)

if __name__ == "__main__":
    # 自动循环运行
    consecutive_errors = 0
    max_consecutive_errors = 5  # 最大连续错误次数
    
    while True:
        try:
            print(f"\n当前时间: {get_current_time()}, 执行任务...")
            main()
            consecutive_errors = 0  # 成功执行，重置错误计数
            
            # 根据更新频率，等待30分钟后再次检查
            print(f"\n等待30分钟后再次检查...")
            time_module.sleep(60 * 30)
            
        except KeyboardInterrupt:
            print(f"\n[中断] 用户手动停止，退出程序")
            break
        except Exception as e:
            consecutive_errors += 1
            print(f"[严重错误] 执行任务时出错: {str(e)}")
            import traceback
            traceback.print_exc()
            
            # 如果连续错误超过阈值，等待更长时间再重试
            if consecutive_errors >= max_consecutive_errors:
                print(f"\n[警告] 连续错误 {consecutive_errors} 次，等待5分钟后重试...")
                time_module.sleep(60 * 5)
                consecutive_errors = 0  # 重置计数
            else:
                print(f"\n等待30分钟后再次检查...")
                time_module.sleep(60 * 30)
