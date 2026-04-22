#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
import os
import requests
import time as time_module
import configparser
import hmac
import hashlib
import base64
import urllib.parse
from html.parser import HTMLParser
from re import sub
from sys import stderr
from traceback import print_exc
import random
import re
from bs4 import BeautifulSoup
from requests.packages.urllib3.exceptions import InsecureRequestWarning
from push_logger import push_logger  # 导入推送日志记录器
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

# 初始化配置
config = configparser.ConfigParser()
# 确保使用UTF-8编码读取配置文件
try:
    with open('config.ini', 'r', encoding='utf-8') as f:
        config.read_file(f)
except UnicodeDecodeError:
    # 如果UTF-8失败，尝试GBK编码
    with open('config.ini', 'r', encoding='gbk') as f:
        config.read_file(f)

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
    """去除HTML标签"""
    try:
        parser = _DeHTMLParser()
        parser.feed(text)
        return parser.text()
    except:
        return text

# 获取当前时间
def get_current_time():
    return time_module.strftime('%Y-%m-%d %H:%M:%S', time_module.localtime(time_module.time()))

def generate_signature(secret):
    """生成钉钉机器人签名"""
    timestamp = str(round(time_module.time() * 1000))
    secret_enc = secret.encode('utf-8')
    string_to_sign = f"{timestamp}\n{secret}"
    string_to_sign_enc = string_to_sign.encode('utf-8')
    hmac_code = hmac.new(secret_enc, string_to_sign_enc, digestmod=hashlib.sha256).digest()
    sign = urllib.parse.quote_plus(base64.b64encode(hmac_code))
    return timestamp, sign

# 仅入库，不推送（已禁用推送功能）
def dingding(message):
    """仅入库，不推送"""
    try:
        # 钉钉推送已禁用
        # access_token = config.get('dingding', 'access_token')
        # secret = config.get('dingding', 'secret')
        # ... 推送代码已注释 ...
        
        # 直接入库，不推送
        # 从消息中提取标题（去掉时间戳前缀）
        title = "Cognition AI博客更新"  # 默认标题
        if message:
            lines = message.split('\n')
            for line in lines[2:5]:  # 跳过前两行（标题和时间）
                line = line.strip()
                if line and len(line) > 10:
                    title = line[:200]
                    break
        
        # 提取原始内容（去掉推送格式）
        content = message
        # 移除时间戳行
        content = re.sub(r'Cognition AI博客更新 - \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\n?', '', content)
        content = content.strip()
        
        success = push_logger.log_push(
            source="Cognition AI",
            title=title,
            content=content,  # 存储原始内容
            category="AI博客",
            url="https://www.cognition-labs.com/blog",
            push_channel="无",  # 不推送
            push_status="skipped",  # 跳过推送
            keywords=["Cognition", "AI博客"]
        )
        if success:
            print(f"✓ 已入库: {title[:50]}...")
        else:
            print(f"⚠ 内容已存在，跳过入库")
        return True
            
    except Exception as e:
        print(f"记录入库失败: {str(e)}")
        import traceback
        print(f"详细错误信息:")
        traceback.print_exc()
        return False

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
            return False
            
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
        
        # 记录推送日志
        result = response.json()
        if result.get('errcode') == 0:
            push_logger.log_push(
                source="Cognition AI",
                title="Cognition AI博客更新通知",
                content=message,
                push_channel="企业微信",
                push_status="success"
            )
            return True
        else:
            push_logger.log_push(
                source="Cognition AI",
                title="Cognition AI博客更新通知", 
                content=message,
                push_channel="企业微信",
                push_status="failed"
            )
            return False
        
    except Exception as e:
        print(f"企业微信推送失败: {str(e)}")
        push_logger.log_push(
            source="Cognition AI",
            title="Cognition AI博客更新通知",
            content=message,
            push_channel="企业微信",
            push_status="failed"
        )
        return False

def get_cognition_blog():
    """获取Cognition AI博客内容"""
    print("开始获取Cognition AI博客内容...")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': 'https://cognition.ai/',
        'DNT': '1',
        'Sec-GPC': '1',
        'Upgrade-Insecure-Requests': '1',
        'Connection': 'keep-alive',
    }

    max_retries = 3
    retry_delay = 5
    
    # 目标URL
    url = "https://cognition.ai/blog/1"
    
    for attempt in range(max_retries):
        try:
            print(f"正在请求URL: {url} (尝试 {attempt + 1}/{max_retries})")
            response = requests.get(url, headers=headers, timeout=30, verify=False)
            
            if response.status_code == 200:
                print(f"成功访问: {url}")
                break
            else:
                print(f"获取博客内容失败，状态码：{response.status_code}")
                if attempt < max_retries - 1:
                    time_module.sleep(retry_delay)
        except Exception as e:
            print(f"请求异常: {str(e)}")
            if attempt < max_retries - 1:
                time_module.sleep(retry_delay)
    else:
        print("所有重试均失败")
        return None
    
    if response.status_code != 200:
        print(f"最终请求失败，状态码：{response.status_code}")
        return None

    # 保存HTML内容以便调试
    with open('cognition_debug.html', 'w', encoding='utf-8') as f:
        f.write(response.text)
    print(f"已保存HTML内容到cognition_debug.html，长度：{len(response.text)}")

    try:
        soup = BeautifulSoup(response.text, 'html.parser')
        blog_items = []
        
        print("开始解析Cognition AI博客页面结构...")
        
        # 方法1: 查找文章容器
        # 通常博客文章会在 article, .post, .blog-post 等容器中
        articles = soup.find_all(['article', 'div'], class_=re.compile(r'post|article|blog|entry', re.IGNORECASE))
        print(f"找到 {len(articles)} 个可能的文章容器")
        
        if not articles:
            # 如果没有找到标准的文章容器，查找其他可能的容器
            articles = soup.find_all('div', class_=re.compile(r'content|main|container', re.IGNORECASE))
            print(f"备用方案：找到 {len(articles)} 个内容容器")
        
        # 寻找第一条有实际标题的博客内容
        for article in articles:
            try:
                # 提取标题
                title = None
                title_selectors = ['h1', 'h2', 'h3', '.title', '.post-title', '.entry-title']
                
                for selector in title_selectors:
                    if selector.startswith('.'):
                        title_elem = article.find(class_=selector[1:])
                    else:
                        title_elem = article.find(selector)
                    
                    if title_elem:
                        extracted_title = title_elem.get_text(strip=True)
                        # 跳过默认标题或太短的标题
                        if (extracted_title and 
                            extracted_title != "Cognition AI 博客更新" and 
                            len(extracted_title) > 10 and
                            not extracted_title.lower().startswith('blog')):
                            title = extracted_title
                            print(f"找到有效标题: {title}")
                            break
                
                # 如果没有找到有效标题，跳过这个文章容器
                if not title:
                    print("未找到有效标题，跳过此容器")
                    continue
                
                # 提取日期
                date = get_current_time().split()[0]
                date_selectors = ['time', '.date', '.published', '.post-date', '.entry-date']
                
                for selector in date_selectors:
                    if selector.startswith('.'):
                        date_elem = article.find(class_=selector[1:])
                    else:
                        date_elem = article.find(selector)
                    
                    if date_elem:
                        date_text = date_elem.get_text(strip=True)
                        # 尝试提取日期格式
                        date_match = re.search(r'\d{4}[-/]\d{1,2}[-/]\d{1,2}', date_text)
                        if date_match:
                            date = date_match.group(0)
                            print(f"找到日期: {date}")
                            break
                        # 尝试其他日期格式
                        date_match = re.search(r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}', date_text, re.IGNORECASE)
                        if date_match:
                            date = date_match.group(0)
                            print(f"找到日期: {date}")
                            break
                
                # 提取内容摘要
                content_lines = []
                
                # 查找内容容器
                content_selectors = ['.content', '.post-content', '.entry-content', '.excerpt', 'p']
                
                for selector in content_selectors:
                    if selector.startswith('.'):
                        content_elem = article.find(class_=selector[1:])
                    else:
                        content_elems = article.find_all(selector)
                        content_elem = content_elems[0] if content_elems else None
                    
                    if content_elem:
                        # 提取段落内容
                        paragraphs = content_elem.find_all('p') if selector != 'p' else [content_elem]
                        
                        for p in paragraphs[:3]:  # 只取前3段
                            p_text = p.get_text(strip=True)
                            if len(p_text) > 20:  # 过滤太短的段落
                                content_lines.append(f"• {p_text[:150]}...")
                        
                        if content_lines:
                            print(f"找到内容: {len(content_lines)} 段")
                            break
                
                # 如果没有找到具体内容，添加默认描述
                if not content_lines:
                    content_lines.append("• Cognition AI 发布了新的博客文章，详情请查看官网")
                
                # 组合文章信息
                blog_item = f"标题: {title}\n"
                blog_item += f"发布日期: {date}\n"
                blog_item += f"链接: {url}\n"
                blog_item += "\n".join(content_lines)
                
                blog_items.append(blog_item)
                print(f"成功添加文章: {title} ({date})")
                
                # 找到第一条有效文章后立即退出
                break
                
            except Exception as e:
                print(f"解析文章时出错: {str(e)}")
                continue
        
        # 方法2: 如果没有找到文章，尝试提取页面主要内容
        if not blog_items:
            print("未找到标准文章结构，尝试提取页面主要内容...")
            
            # 查找页面标题
            page_title = "Cognition AI 博客"
            title_elem = soup.find('title')
            if title_elem:
                page_title = title_elem.get_text(strip=True)
            else:
                h1_elem = soup.find('h1')
                if h1_elem:
                    page_title = h1_elem.get_text(strip=True)
            
            # 查找主要内容
            main_content = soup.find(['main', 'div'], class_=re.compile(r'main|content|container', re.IGNORECASE))
            if not main_content:
                main_content = soup.find('body')
            
            content_lines = []
            if main_content:
                # 提取所有段落
                paragraphs = main_content.find_all('p')
                for p in paragraphs[:5]:  # 只取前5段
                    p_text = p.get_text(strip=True)
                    if len(p_text) > 30:  # 过滤太短的段落
                        content_lines.append(f"• {p_text[:200]}...")
            
            if not content_lines:
                content_lines.append("• Cognition AI 博客页面有更新，请查看详细内容")
            
            blog_item = f"标题: {page_title}\n"
            blog_item += f"更新时间: {get_current_time().split()[0]}\n"
            blog_item += f"链接: {url}\n"
            blog_item += "\n".join(content_lines)
            
            blog_items.append(blog_item)
            print(f"添加页面内容: {page_title}")
        
        if not blog_items:
            print("未能提取任何博客内容")
            # 保存调试信息
            with open('cognition_output.txt', 'w', encoding='utf-8') as f:
                f.write("未找到博客内容\n")
                f.write(f"页面长度: {len(response.text)}\n")
                f.write(f"页面标题: {soup.title.string if soup.title else '无标题'}\n")
                f.write(f"页面内容预览:\n{soup.get_text()[:1000]}")
            return None
        
        # 组合所有博客内容
        blog_text = "Cognition AI 博客最新更新：\n\n" + "\n\n".join(blog_items)
        
        # 保存提取的内容
        with open('cognition_output.txt', 'w', encoding='utf-8') as f:
            f.write(blog_text)
        
        print(f"成功提取 {len(blog_items)} 条博客内容")
        return blog_text

    except Exception as e:
        print(f"解析博客内容失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def is_within_working_hours():
    """检查当前时间是否在工作时间范围内（早7:30至晚23:30）"""
    import datetime
    current_time = datetime.datetime.now().time()
    start_time = datetime.time(7, 30)
    end_time = datetime.time(23, 30)
    return start_time <= current_time <= end_time

def main():
    try:
        print("-" * 50)
        print(f"开始获取 Cognition AI 博客内容 - {get_current_time()}")

        # 1. 获取博客内容
        article = get_cognition_blog()
        if not article:
            print("未获取到博客内容，跳过本次任务")
            return
        
        # 2. 准备推送内容
        todaytime = get_current_time()
        tex = f"Cognition AI 博客更新 - {todaytime}\n\n{article}"
        print("准备推送内容长度:", len(tex))

        # 3. 检查内容更新
        art_keywork = "Cognition AI博客"
        if os.path.exists(f"{art_keywork}.txt"):
            with open(f"{art_keywork}.txt", 'r', encoding='utf-8') as g:
                read_all = g.read()

            print('读取到的文件内容长度:', len(read_all))
            if read_all != article:
                print('内容比对不一致，需要更新')
                with open(f"{art_keywork}.txt", "w+", encoding='utf-8', errors='ignore') as g:
                    g.write(article)

                # 4. 仅入库，不推送（已禁用推送功能）
                print("内容有更新，准备入库...")
                dingding(tex)  # 函数内部已改为仅入库
                # wx(tex)  # 已禁用
            else:
                print('内容比对一致，无需更新和推送')
                # 即使内容一致，也检查是否需要入库（可能之前入库失败）
                print("检查是否需要入库...")
                try:
                    # 提取标题
                    title = "Cognition AI博客更新"
                    if article:
                        lines = str(article).split('\n')
                        for line in lines[:3]:
                            line = line.strip()
                            if line and len(line) > 10:
                                title = line[:200]
                                break
                    
                    # 提取原始内容
                    content = str(article)
                    content = re.sub(r'Cognition AI博客更新 - \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\n?', '', content)
                    content = content.strip()
                    
                    success = push_logger.log_push(
                        source="Cognition AI",
                        title=title,
                        content=content,
                        category="AI博客",
                        url="https://www.cognition-labs.com/blog",
                        push_channel="无",
                        push_status="skipped",
                        keywords=["Cognition", "AI博客"]
                    )
                    if success:
                        print(f"✓ 已入库（之前可能未入库）: {title[:50]}...")
                    else:
                        print(f"✓ 内容已存在于数据库，无需重复入库")
                except Exception as e:
                    print(f"⚠ 检查入库时出错: {str(e)}")
        else:
            print('首次运行，创建内容文件')
            with open(f"{art_keywork}.txt", "w+", encoding='utf-8', errors='ignore') as g:
                g.write(article)
            # 首次运行也入库（不推送）
            print("首次运行，准备入库...")
            dingding(tex)  # 函数内部已改为仅入库
            # wx(tex)  # 已禁用

    except Exception as e:
        print(f"程序运行出错: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # 持续运行模式：一直自动运行
    while True:
        try:
            print(f"当前时间: {get_current_time()}, 执行任务..")
            main()
        except Exception as e:
            print(f"执行任务时出错: {str(e)}")
            import traceback
            traceback.print_exc()
        
        # 每6小时检查一次（博客更新频率通常比软件版本更新频繁）
        print(f"等待6小时后再次检查...")
        time_module.sleep(6 * 60 * 60)