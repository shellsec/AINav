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
        title = "Kiro更新通知"  # 默认标题
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
        content = re.sub(r'Kiro AI更新日志 - \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\n?', '', content)
        content = content.strip()
        
        success = push_logger.log_push(
            source="Kiro",
            title=title,
            content=content,  # 存储原始内容
            category="软件更新",
            url="https://kiro.ai",
            push_channel="无",  # 不推送
            push_status="skipped",  # 跳过推送
            keywords=["Kiro", "AI更新"]
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
                source="Kiro",
                title="Kiro更新通知",
                content=message,
                push_channel="企业微信",
                push_status="success"
            )
            return True
        else:
            push_logger.log_push(
                source="Kiro",
                title="Kiro更新通知", 
                content=message,
                push_channel="企业微信",
                push_status="failed"
            )
            return False
        
    except Exception as e:
        print(f"企业微信推送失败: {str(e)}")
        push_logger.log_push(
            source="Kiro",
            title="Kiro更新通知",
            content=message,
            push_channel="企业微信",
            push_status="failed"
        )
        return False

def analyze_html_structure(html_content):
    """分析HTML结构以帮助调试"""
    print("\n=== 开始分析HTML结构 ===")
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # 1. 查找所有标题
    print("\n页面中的标题(h1-h6):")
    for i in range(1, 7):
        headings = soup.find_all(f'h{i}')
        if headings:
            print(f"\n<h{i}> 标签 ({len(headings)}个):")
            for h in headings[:3]:
                print(f"- {h.text.strip()}")
    
    # 2. 查找所有可能的更新日志容器
    print("\n可能的更新日志容器:")
    containers = soup.find_all(['article', 'div', 'section'])
    changelog_containers = []
    
    for container in containers:
        classes = container.get('class', [])
        class_str = ' '.join(classes) if classes else ''
        text_content = container.text.strip().lower()
        
        # 检查是否包含更新日志相关关键词
        if any(keyword in class_str.lower() for keyword in ['changelog', 'update', 'release', 'version']) or \
           any(keyword in text_content for keyword in ['更新', '版本', 'changelog', 'update', 'release']):
            changelog_containers.append(container)
            print(f"\n容器类型: {container.name}, 类: {class_str}")
            content_preview = container.text.strip().replace('\n', ' ')[:100]
            print(f"内容预览: {content_preview}...")
    
    # 3. 查找所有版本号
    print("\n页面中的版本号:")
    version_pattern = r'v?\d+\.\d+(?:\.\d+)?'
    version_matches = re.findall(version_pattern, html_content)
    for version in set(version_matches[:10]):  # 去重并限制数量
        print(f"- {version}")
    
    print("\n=== HTML结构分析结束 ===\n")
    return changelog_containers

def get_kiro_changelog():
    """获取Kiro AI更新日志"""
    print("开始获取Kiro AI更新日志...")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': 'https://kiro.dev/',
        'DNT': '1',
        'Sec-GPC': '1',
        'Upgrade-Insecure-Requests': '1',
        'Connection': 'keep-alive',
    }

    max_retries = 3
    retry_delay = 5
    
    # 尝试多个可能的Kiro更新源
    urls_to_try = [
        "https://kiro.dev/changelog",
        "https://docs.kiro.dev/changelog",
        "https://blog.kiro.dev/releases",
        "https://github.com/kirodotdev/kiro/releases"  # GitHub备用源
    ]
    
    for url in urls_to_try:
        for attempt in range(max_retries):
            try:
                print(f"正在请求URL: {url} (尝试 {attempt + 1}/{max_retries})")
                response = requests.get(url, headers=headers, timeout=30, verify=False)
                
                if response.status_code == 200:
                    print(f"成功访问: {url}")
                    break
                else:
                    print(f"获取更新日志失败，状态码：{response.status_code}")
                    if attempt < max_retries - 1:
                        time_module.sleep(retry_delay)
            except Exception as e:
                print(f"请求异常: {str(e)}")
                if attempt < max_retries - 1:
                    time_module.sleep(retry_delay)
        else:
            print(f"URL {url} 所有重试均失败，尝试下一个URL")
            continue
        
        if response.status_code != 200:
            print(f"URL {url} 最终请求失败，状态码：{response.status_code}")
            continue

        # 保存HTML内容以便调试
        with open('kiro_debug.html', 'w', encoding='utf-8') as f:
            f.write(response.text)
        print(f"已保存HTML内容到kiro_debug.html，长度：{len(response.text)}")

        try:
            soup = BeautifulSoup(response.text, 'html.parser')
            changelog_items = []
            
            # 方法1: 基于Kiro实际HTML结构解析
            print("开始解析Kiro changelog页面结构...")
            
            # 查找时间元素 - Kiro使用 <time> 标签
            time_elements = soup.find_all('time')
            print(f"找到 {len(time_elements)} 个时间元素")
            
            # 查找版本标签 - Kiro使用带有版本号的span标签
            version_spans = soup.find_all('span', string=re.compile(r'v\d+\.\d+\.\d+'))
            print(f"找到 {len(version_spans)} 个版本标签")
            
            # 查找文章容器 - Kiro使用article标签
            articles = soup.find_all('article')
            print(f"找到 {len(articles)} 个文章容器")
            
            for article in articles[:3]:  # 只处理前3个最新版本
                try:
                    # 提取版本号 - 多种方式尝试
                    version = "未知版本"
                    
                    # 方式1: 直接查找版本号span
                    version_span = article.find('span', string=re.compile(r'v\d+\.\d+\.\d+'))
                    if version_span:
                        version = version_span.get_text(strip=True)
                        print(f"找到版本(方式1): {version}")
                    
                    # 方式2: 查找带有class的版本号span
                    if version == "未知版本":
                        version_spans = article.find_all('span', class_=re.compile(r'version|tag|badge'))
                        for span in version_spans:
                            text = span.get_text(strip=True)
                            if re.search(r'v?\d+\.\d+\.\d+', text):
                                version = re.search(r'v?\d+\.\d+\.\d+', text).group(0)
                                if not version.startswith('v'):
                                    version = f"v{version}"
                                print(f"找到版本(方式2): {version}")
                                break
                    
                    # 方式3: 在文章内容中查找版本号
                    if version == "未知版本":
                        article_text = article.get_text()
                        version_matches = re.findall(r'v?\d+\.\d+\.\d+', article_text)
                        if version_matches:
                            version = version_matches[0]
                            if not version.startswith('v'):
                                version = f"v{version}"
                            print(f"找到版本(方式3): {version}")
                            
                    # 方式4: 从标题中提取
                    if version == "未知版本":
                        h3_elem = article.find('h3')
                        if h3_elem:
                            title_text = h3_elem.get_text(strip=True)
                            version_match = re.search(r'v?\d+\.\d+\.\d+', title_text)
                            if version_match:
                                version = version_match.group(0)
                                if not version.startswith('v'):
                                    version = f"v{version}"
                                print(f"找到版本(方式4): {version}")
                    
                    # 提取日期 - 查找同一个grid容器中的time元素
                    date = "未知日期"
                    # 向上查找包含该article的grid容器
                    grid_container = article.find_parent('div', class_=re.compile(r'grid'))
                    if grid_container:
                        time_elem = grid_container.find('time')
                        if time_elem:
                            date = time_elem.get_text(strip=True)
                            print(f"找到日期: {date}")
                    
                    # 提取标题
                    title = "Kiro更新"
                    h3_elem = article.find('h3')
                    if h3_elem:
                        title = h3_elem.get_text(strip=True)
                        print(f"找到标题: {title}")
                    
                    # 提取更新内容
                    content_lines = []
                    
                    # 查找prose容器中的内容
                    prose_div = article.find('div', class_=re.compile(r'prose'))
                    if prose_div:
                        # 提取Features部分
                        features_h4 = prose_div.find('h4', string=re.compile(r'Features', re.IGNORECASE))
                        if features_h4:
                            # 查找Features后面的所有h5标题
                            current = features_h4.find_next_sibling()
                            while current and len(content_lines) < 5:
                                if current.name == 'h5':
                                    feature_title = current.get_text(strip=True)
                                    # 查找该h5后面的描述
                                    desc_elem = current.find_next_sibling('div')
                                    if desc_elem:
                                        desc_text = desc_elem.get_text(strip=True)
                                        if len(desc_text) > 10:
                                            content_lines.append(f"• {feature_title}: {desc_text[:100]}...")
                                    else:
                                        content_lines.append(f"• {feature_title}")
                                elif current.name == 'h4':
                                    # 遇到下一个h4就停止
                                    break
                                current = current.find_next_sibling()
                        
                        # 如果没有找到Features，就提取第一个div的内容
                        if not content_lines:
                            first_div = prose_div.find('div', class_='mb-6')
                            if first_div:
                                desc_text = first_div.get_text(strip=True)
                                if len(desc_text) > 10:
                                    content_lines.append(f"• {desc_text[:200]}...")
                    
                    # 如果还是没有内容，添加默认描述
                    if not content_lines:
                        content_lines.append("• Kiro AI IDE 新版本发布，包含多项功能改进和优化")
                    
                    # 组合版本信息
                    changelog_item = f"{version}\n"
                    changelog_item += f"发布日期: {date}\n"
                    changelog_item += f"标题: {title}\n"
                    changelog_item += "\n".join(content_lines)
                    
                    changelog_items.append(changelog_item)
                    print(f"成功添加版本: {version} ({date})")
                    
                except Exception as e:
                    print(f"解析文章时出错: {str(e)}")
                    continue
            
            # 方法2: 如果正则表达式失败，尝试BeautifulSoup解析
            if not changelog_items:
                print("正则表达式提取失败，尝试BeautifulSoup解析...")
                
                # 查找标题中的版本信息
                headings = soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
                for heading in headings:
                    text = heading.get_text(strip=True)
                    version_match = re.search(r'v?\d+\.\d+\.\d+', text)
                    if version_match:
                        version = version_match.group(0)
                        if not version.startswith('v'):
                            version = f"v{version}"
                        
                        # 查找日期信息
                        date_elem = heading.find_next(['time', 'span', 'div'])
                        date = get_current_time().split()[0]
                        if date_elem:
                            date_text = date_elem.get_text(strip=True)
                            date_match = re.search(r'\d{4}[-/]\d{1,2}[-/]\d{1,2}', date_text)
                            if date_match:
                                date = date_match.group(0)
                        
                        # 查找更新内容
                        content_elem = heading.find_next(['div', 'section', 'ul', 'ol'])
                        content_lines = ["• 优化了部分功能和用户体验"]
                        if content_elem:
                            content_text = content_elem.get_text(strip=True)
                            if len(content_text) > 20:
                                sentences = [s.strip() for s in content_text.split('.') if s.strip() and len(s.strip()) > 10]
                                content_lines = [f"• {s}" for s in sentences[:3]]
                        
                        changelog_item = f"{version}\n发布日期: {date}\n" + "\n".join(content_lines)
                        changelog_items.append(changelog_item)
                        print(f"BeautifulSoup添加版本: {version}")
                        
                        if len(changelog_items) >= 3:
                            break
            
            # 方法3: 最后的备用方法
            if not changelog_items:
                print("BeautifulSoup解析也失败，使用备用方法...")
                
                # 简单提取页面中的版本号
                version_matches = re.findall(r'v?\d+\.\d+\.\d+', html_content)
                if version_matches:
                    unique_versions = list(set(version_matches))[:3]  # 修复set切片问题
                    for i, version in enumerate(unique_versions):
                        if not version.startswith('v'):
                            version = f"v{version}"
                        date = get_current_time().split()[0]
                        changelog_item = f"{version}\n发布日期: {date}\n• Kiro版本更新，详情请查看官网"
                        changelog_items.append(changelog_item)
                        print(f"备用方法添加版本: {version}")
            
            if not changelog_items:
                print("未能提取任何更新日志内容")
                # 保存调试信息
                with open('kiro_output.txt', 'w', encoding='utf-8') as f:
                    f.write("未找到更新日志内容\n")
                    f.write(f"页面长度: {len(response.text)}\n")
                    f.write(f"页面标题: {soup.title.string if soup.title else '无标题'}\n")
                    f.write(f"页面内容预览:\n{soup.get_text()[:1000]}")
                continue  # 尝试下一个URL
            
            # 组合所有更新日志内容
            changelog_text = "Kiro AI最新更新：\n\n" + "\n\n".join(changelog_items)
            
            # 保存提取的内容
            with open('kiro_output.txt', 'w', encoding='utf-8') as f:
                f.write(changelog_text)
            
            print(f"成功提取 {len(changelog_items)} 条更新日志")
            return changelog_text

        except Exception as e:
            print(f"解析更新日志失败: {str(e)}")
            import traceback
            traceback.print_exc()
            continue  # 尝试下一个URL
    
    print("所有URL都无法获取到有效的更新日志")
    return None

def check_if_new_version(version, published_at):
    """检查是否为新版本"""
    try:
        # 读取上次检查的版本信息
        last_version_file = 'kiro_last_version.txt'
        
        if os.path.exists(last_version_file):
            with open(last_version_file, 'r', encoding='utf-8') as f:
                content = f.read().strip()
                if '|' in content:
                    last_version, last_time = content.split('|', 1)
                else:
                    last_version = content
                    last_time = ""
        else:
            last_version = ""
            last_time = ""
        
        # 检查是否为新版本
        is_new = (version != last_version) or (published_at != last_time)
        
        if is_new:
            # 保存新版本信息
            with open(last_version_file, 'w', encoding='utf-8') as f:
                f.write(f"{version}|{published_at}")
        
        return is_new
        
    except Exception as e:
        print(f"检查版本时出错: {str(e)}")
        return True  # 出错时默认认为是新版本

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
        print(f"开始获取 Kiro AI 更新日志 - {get_current_time()}")

        # 1. 获取更新日志内容
        article = get_kiro_changelog()
        if not article:
            print("未获取到更新日志内容，跳过本次任务")
            return
        
        # 2. 准备推送内容
        todaytime = get_current_time()
        tex = f"Kiro AI更新日志 - {todaytime}\n\n{article}"
        print("准备推送内容长度:", len(tex))

        # 3. 检查内容更新
        art_keywork = "Kiro更新日志"
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
                    title = "Kiro更新通知"
                    if article:
                        lines = str(article).split('\n')
                        for line in lines[:3]:
                            line = line.strip()
                            if line and len(line) > 10:
                                title = line[:200]
                                break
                    
                    # 提取原始内容
                    content = str(article)
                    content = re.sub(r'Kiro更新 - \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\n?', '', content)
                    content = content.strip()
                    
                    success = push_logger.log_push(
                        source="Kiro",
                        title=title,
                        content=content,
                        category="工具更新",
                        url="https://kiro.com/changelog",
                        push_channel="无",
                        push_status="skipped",
                        keywords=["Kiro", "工具更新"]
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
    while True:
        try:
            print(f"当前时间: {get_current_time()}, 执行任务..")
            main()
        except Exception as e:
            print(f"执行任务时出错: {str(e)}")
            import traceback
            traceback.print_exc()
        
        # 每12小时检查一次
        print(f"等待12小时后再次检查...")
        time_module.sleep(12 * 60 * 60)