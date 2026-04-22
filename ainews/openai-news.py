#!/usr/bin/python
# -*- coding: UTF-8 -*-
import os
import requests
import time as time_module
import configparser
import hmac
import hashlib
import base64
import urllib.parse
import json
import re
from html.parser import HTMLParser
from re import sub
from sys import stderr
from traceback import print_exc
import random
from bs4 import BeautifulSoup
from requests.packages.urllib3.exceptions import InsecureRequestWarning
from datetime import datetime, time
from push_logger import push_logger  # 导入推送日志记录器
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

# 读取配置文件
config = configparser.ConfigParser()
config_file = 'config.ini'
if os.path.exists(config_file):
    config.read(config_file, encoding='utf-8')
else:
    print(f"配置文件 {config_file} 不存在，将使用默认配置")
    # 创建默认配置
    config.add_section('dingding')
    config.set('dingding', 'access_token', '')
    config.set('dingding', 'secret', '')
    config.add_section('wechat')
    config.set('wechat', 'corpid', '')
    config.set('wechat', 'corpsecret', '')
    config.set('wechat', 'agentid', '1000001')

class _DeHTMLParser(HTMLParser):
    def __init__(self):
        HTMLParser.__init__(self)
        self.__text = []

    def handle_data(self, data):
        text = data.strip()
        if len(text) > 0:
            text = sub('[ \t\r\n]+', ' ', text)
            self.__text.append(text + ' ')

    def handle_starttag(self, tag, attrs):
        if tag == 'p':
            self.__text.append('\n\n')
        elif tag == 'br':
            self.__text.append('\n')

    def handle_startendtag(self, tag, attrs):
        if tag == 'br':
            self.__text.append('\n\n')

    def text(self):
        return ''.join(self.__text).strip()

def dehtml(text):
    try:
        parser = _DeHTMLParser()
        parser.feed(text)
        parser.close()
        return parser.text()
    except:
        print_exc(file=stderr)
        return text



# 生成钉钉签名
def generate_signature(secret):
    timestamp = str(round(time_module.time() * 1000))
    string_to_sign = f"{timestamp}\n{secret}"
    hmac_code = hmac.new(secret.encode(), string_to_sign.encode(), digestmod=hashlib.sha256).digest()
    sign = urllib.parse.quote_plus(base64.b64encode(hmac_code))
    return timestamp, sign

# 钉钉消息推送
def dingding(message):
    try:
        # 检查配置是否存在
        if not config.has_section('dingding'):
            print("配置文件中缺少 [dingding] 部分")
            return {"errcode": -1, "errmsg": "配置缺失"}
            
        access_token = config.get('dingding', 'access_token')
        secret = config.get('dingding', 'secret')

        # 生成签名
        timestamp, sign = generate_signature(secret)

        # 构造带签名的URL
        base_url = "https://oapi.dingtalk.com/robot/send"
        params = {
            "access_token": access_token,
            "timestamp": timestamp,
            "sign": sign
        }
        webhook = f"{base_url}?{urllib.parse.urlencode(params)}"

        headers = {
            "Content-Type": "application/json",
            "Charset": "UTF-8"
        }
        payload = {
            "msgtype": "text",
            "text": {"content": message},
            "at": {"isAtAll": False}
        }
        response = requests.post(webhook, json=payload, headers=headers, timeout=10)
        print(f"钉钉推送结果: {response.text}")
        
        # 返回响应结果
        return response.json()
    except Exception as e:
        print(f"钉钉推送失败: {str(e)}")
        return {"errcode": -1, "errmsg": str(e)}

def wx(message):
    """企业微信消息推送"""
    try:
        corpid = config.get('wechat', 'corpid')
        corpsecret = config.get('wechat', 'corpsecret')
        agentid = config.getint('wechat', 'agentid')

        # 获取access_token
        token_url = f"https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid={corpid}&corpsecret={corpsecret}"
        token_res = requests.get(token_url, timeout=10)
        access_token = token_res.json().get('access_token')

        if not access_token:
            print("获取企业微信access_token失败")
            return

        # 构造消息体
        send_url = f"https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token={access_token}"
        payload = {
            "touser": "@all",
            "msgtype": "text",
            "agentid": agentid,
            "text": {"content": message},
            "safe": 0
        }

        # 发送消息
        response = requests.post(send_url, json=payload, timeout=10)
        print(f"企业微信推送结果: {response.text}")

    except Exception as e:
        print(f"企业微信推送失败: {str(e)}")


def analyze_html_structure(html_content):
    """分析HTML结构以帮助调试"""
    print("\n=== 开始分析HTML结构 ===")
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # 1. 查找所有可能的文章容器
    print("\n查找文章容器:")
    
    # 查找包含文章信息的div
    article_divs = soup.find_all(['div', 'article', 'section'], class_=re.compile(r'.*post.*|.*article.*|.*blog.*|.*news.*|.*card.*|.*group.*|.*relative.*', re.I))
    print(f"找到 {len(article_divs)} 个可能的文章容器")
    
    # 查找所有链接
    links = soup.find_all('a', href=True)
    blog_links = [link for link in links if '/blog/' in link.get('href', '') or 'openai.com' in link.get('href', '') or '/index/' in link.get('href', '')]
    print(f"找到 {len(blog_links)} 个博客链接")
    
    # 显示前几个博客链接的信息
    for i, link in enumerate(blog_links[:5]):
        href = link.get('href', '')
        text = link.get_text(strip=True)
        print(f"文章 {i+1}: {text} -> {href}")
    
    print("\n=== HTML结构分析结束 ===\n")

def clean_html_text(text):
    """清理HTML文本，处理特殊字符和编码问题"""
    if not text:
        return ""
    
    # 解码HTML实体
    text = text.replace('&amp;', '&')
    text = text.replace('&lt;', '<')
    text = text.replace('&gt;', '>')
    text = text.replace('&quot;', '"')
    text = text.replace('&#x27;', "'")
    
    # 移除多余空白
    text = re.sub(r'\s+', ' ', text).strip()
    
    # 移除URL参数
    text = re.sub(r'\?w=\d+&q=\d+&fm=\w+', '', text)
    
    return text

def get_openai_news():
    """获取OpenAI最新新闻"""
    print("开始获取OpenAI新闻...")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
    }

    max_retries = 3
    retry_delay = 5
    
    # 尝试多个可能的URL
    urls_to_try = [
        "https://openai.com/blog",
        "https://openai.com/",
        "https://openai.com/index"
    ]
    
    # 更新请求头，使其更像真实浏览器
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
        'Referer': 'https://www.google.com/'
    }
    
    response = None
    successful_url = None
    
    for url in urls_to_try:
        for attempt in range(max_retries):
            try:
                print(f"正在请求URL: {url} (尝试 {attempt + 1}/{max_retries})")
                
                # 添加随机延迟，模拟人类行为
                if attempt > 0:
                    delay = random.uniform(1.0, 3.0)
                    print(f"等待 {delay:.1f} 秒后重试...")
                    time_module.sleep(delay)
                
                response = requests.get(url, headers=headers, timeout=30, verify=False)
                
                if response.status_code == 200:
                    print(f"成功获取页面: {url}")
                    successful_url = url
                    break
                else:
                    print(f"请求失败，状态码：{response.status_code}")
                    
            except Exception as e:
                print(f"请求异常: {str(e)}")
                
        if successful_url:
            break
                    


    if not successful_url:
        print("所有URL尝试均失败，无法获取OpenAI新闻")
        
        # 尝试使用备用方法：直接获取RSS或API
        try:
            print("尝试使用备用方法获取新闻...")
            # 尝试获取OpenAI的Twitter页面作为备用
            twitter_url = "https://nitter.net/OpenAI"
            print(f"尝试获取Twitter镜像: {twitter_url}")
            
            twitter_headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
            
            twitter_response = requests.get(twitter_url, headers=twitter_headers, timeout=30, verify=False)
            
            if twitter_response.status_code == 200:
                print("成功获取Twitter镜像页面")
                response = twitter_response
                successful_url = twitter_url
            else:
                print(f"Twitter镜像获取失败，状态码：{twitter_response.status_code}")
                return None
        except Exception as e:
            print(f"备用方法失败: {str(e)}")
            return None
    
    # 保存HTML内容以便调试
    try:
        with open('openai_debug.html', 'w', encoding='utf-8') as f:
            f.write(response.text)
        print(f"已保存HTML内容到openai_debug.html，长度：{len(response.text)}")
    except Exception as e:
        print(f"保存调试文件失败: {str(e)}")

    # 分析HTML结构
    analyze_html_structure(response.text)

    soup = BeautifulSoup(response.text, 'html.parser')
    
    # 根据成功的URL选择不同的解析策略
    is_twitter = 'nitter.net' in successful_url if successful_url else False
    
    # 提取新闻内容
    print("\n尝试提取新闻内容...")
    news_items = []
    
    try:
        # 根据不同来源使用不同的提取策略
        if is_twitter:
            print("使用Twitter镜像站提取策略...")
            # 提取推文
            tweets = []
            tweet_containers = soup.select('.timeline-item')
            
            if tweet_containers:
                print(f"找到 {len(tweet_containers)} 个推文容器")
                
                for container in tweet_containers[:3]:  # 只处理前3条推文
                    try:
                        # 提取推文内容
                        content_div = container.select_one('.tweet-content')
                        content = content_div.get_text(strip=True) if content_div else ""
                        
                        # 提取时间
                        time_elem = container.select_one('.tweet-date a')
                        date = time_elem.get_text(strip=True) if time_elem else ""
                        
                        # 提取链接
                        link = ""
                        if time_elem and time_elem.get('href'):
                            link = f"https://twitter.com{time_elem.get('href')}"
                        
                        if content:
                            tweets.append({
                                'content': content,
                                'date': date,
                                'link': link
                            })
                            print(f"提取到推文: {content[:50]}...")
                    except Exception as e:
                        print(f"处理推文时出错: {str(e)}")
                        continue
                
                # 将推文转换为新闻项
                for tweet in tweets:
                    news_item = f"📰 OpenAI推文: {tweet['content']}\n"
                    if tweet['date']:
                        news_item += f"📅 发布时间: {tweet['date']}\n"
                    if tweet['link']:
                        news_item += f"🔗 链接: {tweet['link']}\n"
                    
                    news_items.append(news_item)
            else:
                print("未找到推文容器")
        else:
            print("使用OpenAI网站提取策略...")
            # 查找所有文章链接
            article_links = []
            
            # 方法1: 查找带有aria-label的链接
            aria_links = soup.find_all('a', attrs={'aria-label': True, 'href': True})
            if aria_links:
                print(f"找到 {len(aria_links)} 个带aria-label的链接")
                article_links.extend(aria_links)
            
            # 方法2: 查找带有特定类的链接
            class_links = soup.find_all('a', class_=lambda x: x and ('transition' in x or 'block' in x))
            if class_links:
                print(f"找到 {len(class_links)} 个带特定类的链接")
                for link in class_links:
                    if link not in article_links and link.get('href'):
                        article_links.append(link)
            
            # 方法3: 查找带有id的链接
            id_links = soup.find_all('a', id=True, href=True)
            if id_links:
                print(f"找到 {len(id_links)} 个带id的链接")
                for link in id_links:
                    if link not in article_links:
                        article_links.append(link)
            
            # 方法4: 查找博客链接
            blog_links = soup.find_all('a', href=lambda x: x and ('/blog/' in x or '/research/' in x))
            if blog_links:
                print(f"找到 {len(blog_links)} 个博客链接")
                for link in blog_links:
                    if link not in article_links:
                        article_links.append(link)
            
            print(f"总共找到 {len(article_links)} 个可能的文章链接")
        
        # 只处理第一个文章（最新的）
        processed_count = 0
        for link in article_links:
            if processed_count >= 1:  # 只取第一条
                break
                
            try:
                # 获取链接文本和URL
                href = link.get('href', '')
                if href.startswith('/'):
                    href = f"https://openai.com{href}"
                
                # 获取标题
                title = ""
                
                # 方法1: 从aria-label获取
                if link.has_attr('aria-label'):
                    aria_parts = link['aria-label'].split(' - ')
                    if len(aria_parts) > 0:
                        title = aria_parts[0].strip()
                
                # 方法2: 从内部标题元素获取
                if not title:
                    title_elem = link.find(['div', 'h1', 'h2', 'h3', 'h4', 'h5'], class_=lambda x: x and ('text-h' in x or 'title' in x or 'heading' in x))
                    if title_elem:
                        title = title_elem.get_text(strip=True)
                
                # 方法3: 从链接文本获取
                if not title:
                    title = link.get_text(strip=True)
                
                # 清理标题
                title = clean_html_text(title)
                
                # 获取日期
                date = ""
                
                # 方法1: 从time元素获取
                time_elem = link.find('time')
                if time_elem:
                    date = time_elem.get('datetime', '') or time_elem.get_text(strip=True)
                
                # 方法2: 从aria-label获取
                if not date and link.has_attr('aria-label'):
                    aria_parts = link['aria-label'].split(' - ')
                    if len(aria_parts) > 2:
                        date = aria_parts[-1].strip()
                
                # 方法3: 从文本内容查找日期模式
                if not date:
                    date_pattern = r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}|\d{4}-\d{2}-\d{2}'
                    date_match = re.search(date_pattern, str(link))
                    if date_match:
                        date = date_match.group(0)
                
                # 获取分类
                category = ""
                meta_p = link.find('p', class_=lambda x: x and 'text-meta' in x)
                if meta_p:
                    category_span = meta_p.find('span', class_='text-nowrap')
                    if category_span:
                        category = category_span.get_text(strip=True)
                
                # 清理日期和分类
                date = clean_html_text(date)
                category = clean_html_text(category)
                
                # 如果有标题和链接，添加到新闻列表
                if title and href and len(title) > 3:
                    news_item = f"� {title}\n"
                    if date:
                        news_item += f"📅 发布时间: {date}\n"
                    if category:
                        news_item += f"📋 分类: {category}\n"
                    news_item += f"🔗 链接: {href}\n"
                    
                    news_items.append(news_item)
                    print(f"添加新闻: {title}")
                    processed_count += 1
                    
            except Exception as e:
                print(f"处理文章链接时出错: {str(e)}")
                continue
        
        # 如果没有找到任何新闻，使用备用方法
        if not news_items:
            print("\n使用备用方法提取新闻...")
            
            # 查找所有可能的文章容器
            article_containers = soup.select('div.group.relative, article, div[class*="post"], div[class*="blog"]')
            
            for container in article_containers[:1]:  # 只处理第一个（最新的）
                try:
                    # 尝试提取标题
                    title_elem = container.select_one('div[class*="text-h"], h1, h2, h3, h4, h5')
                    title = title_elem.get_text(strip=True) if title_elem else None
                    
                    # 尝试提取日期
                    date_elem = container.select_one('time, span[class*="date"], div[class*="date"]')
                    date = None
                    if date_elem:
                        date = date_elem.get('datetime', '') or date_elem.get_text(strip=True)
                    
                    # 尝试提取链接
                    link_elem = container.select_one('a[href]')
                    link = None
                    if link_elem:
                        link = link_elem.get('href', '')
                        if link and link.startswith('/'):
                            link = f"https://openai.com{link}"
                    
                    # 尝试提取分类
                    category_elem = container.select_one('span.text-nowrap')
                    category = category_elem.get_text(strip=True) if category_elem else ''
                    
                    # 清理提取的文本
                    title = clean_html_text(title) if title else "无标题"
                    date = clean_html_text(date) if date else "最近更新"
                    category = clean_html_text(category) if category else ""
                    
                    if title != "无标题" and link:
                        news_item = f"📰 {title}\n"
                        if date:
                            news_item += f"📅 发布时间: {date}\n"
                        if category:
                            news_item += f"📋 分类: {category}\n"
                        news_item += f"🔗 链接: {link}\n"
                        
                        news_items.append(news_item)
                        print(f"备用方法找到文章: {title}")
                except Exception as e:
                    print(f"备用方法处理容器时出错: {str(e)}")
                    continue
        
        # 如果仍然没有找到任何新闻，使用正则表达式方法
        if not news_items:
            print("\n使用正则表达式方法提取新闻...")
            
            # 查找标题和链接模式
            title_link_pattern = r'<a[^>]*href="([^"]*)"[^>]*>\s*<div[^>]*>\s*<div[^>]*class="[^"]*text-h5[^"]*"[^>]*>([^<]+)</div>'
            matches = re.findall(title_link_pattern, response.text)
            
            if matches:
                print(f"正则表达式找到 {len(matches)} 个标题和链接")
                match = matches[0]  # 只取第一个
                link = match[0]
                title = match[1]
                
                if link.startswith('/'):
                    link = f"https://openai.com{link}"
                
                news_item = f"� {clean_html_text(title)}\n"
                news_item += f"� 发布时间: 最近更新\n"
                news_item += f"🔗 链接: {link}\n"
                
                news_items.append(news_item)
                print(f"正则表达式方法找到文章: {title}")
        
        # 如果仍然没有找到任何新闻，使用已知的最新文章信息
        if not news_items:
            print("\n使用已知最新文章信息...")
            
            # 使用页面标题作为备用
            page_title = soup.find('title')
            title = page_title.get_text(strip=True) if page_title else "OpenAI 最新更新"
            
            news_item = f"📰 {clean_html_text(title)}\n"
            news_item += f"📅 发布时间: {datetime.now().strftime('%Y-%m-%d')}\n"
            news_item += f"🔗 链接: https://openai.com/index\n"
            
            news_items.append(news_item)
            print(f"使用页面标题作为新闻: {title}")
        
        # 保存提取结果
        try:
            debug_info = f"提取到 {len(news_items)} 条新闻:\n\n"
            debug_info += "\n".join(news_items)
            
            with open('openai_output.txt', 'w', encoding='utf-8') as f:
                f.write(debug_info)
            print(f"已保存提取结果到: openai_output.txt")
        except Exception as e:
            print(f"保存提取结果失败: {str(e)}")
        
        if not news_items:
            print("未能提取到任何新闻信息")
            return None
        
        # 组合所有新闻内容
        news_text = "🚀 OpenAI 最新动态\n\n" + "\n".join(news_items)
        
        print(f"成功提取到 {len(news_items)} 条新闻")
        return news_text
        
    except Exception as e:
        print(f"获取新闻失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def main():
    while True:
        try:
            news = get_openai_news()
            
            if news:
                # 检查是否有新内容
                file_path = "OpenAI新闻.txt"
                
                if os.path.exists(file_path):
                    with open(file_path, 'r', encoding='utf-8') as f:
                        old_content = f.read()
                        
                    if old_content == news:
                        print('内容比对一致，无需更新和推送')
                        # 即使内容一致，也检查是否需要入库（可能之前入库失败）
                        print("检查是否需要入库...")
                        try:
                            title_match = re.search(r'📰\s*(.+?)(?:\n|$)', news)
                            title = title_match.group(1).strip() if title_match else "OpenAI最新动态"
                            
                            link_match = re.search(r'🔗\s*链接:\s*(.+?)(?:\n|$)', news)
                            url = link_match.group(1).strip() if link_match else None
                            
                            clean_content = news
                            clean_content = re.sub(r'📰\s*', '', clean_content)
                            clean_content = re.sub(r'📅\s*发布时间:\s*[^\n]+\n?', '', clean_content)
                            clean_content = re.sub(r'🔗\s*链接:\s*[^\n]+\n?', '', clean_content)
                            clean_content = re.sub(r'📋\s*分类:\s*[^\n]+\n?', '', clean_content)
                            clean_content = re.sub(r'\n{3,}', '\n\n', clean_content).strip()
                            
                            success = push_logger.log_push(
                                source="OpenAI",
                                title=title,
                                content=clean_content,
                                category=None,
                                url=url,
                                push_channel="无",
                                push_status="skipped",
                                keywords=["OpenAI新闻", "AI资讯"]
                            )
                            if success:
                                print(f"✓ 已入库（之前可能未入库）: {title[:50]}...")
                            else:
                                print(f"✓ 内容已存在于数据库，无需重复入库")
                        except Exception as e:
                            print(f"⚠ 检查入库时出错: {str(e)}")
                        print(f"等待3小时后再次检查...")
                        time_module.sleep(60 * 60 * 3)  # 3小时后再检查
                        continue
                
                # 保存新内容
                with open(file_path, 'w', encoding='utf-8', errors='ignore') as f:
                    f.write(news)
                
                # 仅入库，不推送（已禁用推送功能）
                print("内容有更新，准备入库...")
                
                # 添加关键词（用于分类）
                keywords = ["OpenAI新闻", "AI资讯", "人工智能", "OpenAI动态"]
                
                # 记录到数据库
                try:
                    # 从新闻内容中提取标题和链接
                    title_match = re.search(r'📰\s*(.+?)(?:\n|$)', news)
                    title = title_match.group(1).strip() if title_match else "OpenAI最新动态"
                    
                    link_match = re.search(r'🔗\s*链接:\s*(.+?)(?:\n|$)', news)
                    url = link_match.group(1).strip() if link_match else None
                    
                    category_match = re.search(r'📋\s*分类:\s*(.+?)(?:\n|$)', news)
                    category = category_match.group(1).strip() if category_match else None
                    
                    # 清理推送格式标记，提取原始内容
                    # 移除 emoji 标记和格式前缀，保留实际内容
                    clean_content = news
                    # 移除 📰 标记
                    clean_content = re.sub(r'📰\s*', '', clean_content)
                    # 移除 📅 发布时间行
                    clean_content = re.sub(r'📅\s*发布时间:\s*[^\n]+\n?', '', clean_content)
                    # 移除 🔗 链接行
                    clean_content = re.sub(r'🔗\s*链接:\s*[^\n]+\n?', '', clean_content)
                    # 移除 📋 分类行
                    clean_content = re.sub(r'📋\s*分类:\s*[^\n]+\n?', '', clean_content)
                    # 清理多余空行
                    clean_content = re.sub(r'\n{3,}', '\n\n', clean_content).strip()
                    
                    # 记录到数据库 - 使用清理后的原始内容
                    success = push_logger.log_push(
                        source="OpenAI",
                        title=title,
                        content=clean_content,  # 存储清理后的原始内容，不包含推送格式标记
                        category=category,
                        url=url,
                        push_channel="无",  # 不推送
                        push_status="skipped",  # 跳过推送
                        keywords=keywords
                    )
                    if success:
                        print(f"✓ 已入库: {title[:50]}...")
                    else:
                        print(f"⚠ 内容已存在，跳过入库")
                    
                except Exception as e:
                    print(f"记录推送日志失败: {str(e)}")
                    import traceback
                    print(f"详细错误信息:")
                    traceback.print_exc()
            else:
                print("未获取到新闻内容")
                
        except Exception as e:
            print(f"执行任务时出错: {str(e)}")
            import traceback
            traceback.print_exc()
        
        # 每3小时检查一次
        print(f"等待3小时后再次检查...")
        time_module.sleep(60 * 60 * 3)

if __name__ == "__main__":
    main()