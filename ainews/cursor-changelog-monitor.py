#!/usr/bin/python
# -*- coding: UTF-8 -*-
import requests
import random
import os
import sys
import json
import re
import time as time_module
import datetime
import hmac
import hashlib
import base64
import urllib.parse
import configparser
from lxml import etree
from requests.packages.urllib3.exceptions import InsecureRequestWarning
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)
# 禁用安全请求警告

from html.parser import HTMLParser
from re import sub
from sys import stderr
from traceback import print_exc
from datetime import datetime, time
from bs4 import BeautifulSoup
from push_logger import push_logger  # 导入推送日志记录器

# 读取配置文件
config = configparser.ConfigParser()
config_file = 'config.ini'
if not os.path.exists(config_file):
    print(f"配置文件 {config_file} 不存在")
    sys.exit(1)
config.read(config_file, encoding='utf-8')

# 钉钉关键词列表
keywords = ['Cursor更新', 'AI编辑器', '编辑器更新', '开发工具']

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


def get_cursor_updates():
    print("开始获取Cursor更新日志...")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2',
        'Referer': 'https://www.cursor.com/',
        'DNT': '1',
        'Sec-GPC': '1',
        'Upgrade-Insecure-Requests': '1',
        'Connection': 'keep-alive',
    }

    url = "https://www.cursor.com/cn/changelog"
    
    max_retries = 3
    retry_delay = 5
    
    for attempt in range(max_retries):
        try:
            response = requests.get(url, headers=headers, timeout=30, verify=False)
            if response.status_code == 200:
                break
            else:
                print(f'请求失败，状态码: {response.status_code}, 重试 {attempt + 1}/{max_retries}')
                if attempt < max_retries - 1:
                    time_module.sleep(retry_delay)
                    
        except Exception as e:
            print(f'请求异常: {str(e)}, 重试 {attempt + 1}/{max_retries}')
            if attempt < max_retries - 1:
                time_module.sleep(retry_delay)
    else:
        print(f'所有重试均失败，无法获取Cursor更新日志')
        return

    if response.status_code == 200:
        if not response.text or response.text.strip() == '':
            print(f'接口返回空内容，跳过处理')
            return
            
        html_content = response.text
        
        # 保存调试文件
        try:
            with open('cursor_debug.html', 'w', encoding='utf-8') as f:
                f.write(html_content)
            print("已保存调试HTML文件: cursor_debug.html")
        except Exception as e:
            print(f"保存调试文件失败: {str(e)}")
        
        # 使用BeautifulSoup解析HTML
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # 提取更新日志
        updates = []
        
        # 查找所有文章条目
        changelog_items = soup.find_all('article')
        print(f"找到 {len(changelog_items)} 个更新条目")
        
        for item in changelog_items[:1]:  # 只获取最新的1个更新
            try:
                # 获取日期
                date = "未知日期"
                date_elem = item.find('div', class_='text-sm', string=lambda x: x and re.search(r'\d{4}', x))
                if date_elem:
                    date = date_elem.get_text(strip=True)
                    # 尝试标准化日期格式
                    try:
                        # 处理常见的日期格式
                        if re.match(r'\w+ \d{1,2}, \d{4}', date):  # 如 "May 15, 2025"
                            date_obj = datetime.strptime(date, '%B %d, %Y')
                            date = date_obj.strftime('%Y-%m-%d')
                    except:
                        # 如果转换失败，保留原始格式
                        pass
                
                # 获取版本号
                version = ""
                version_elem = item.find('div', class_='inline-flex')
                if version_elem:
                    version = version_elem.get_text(strip=True)
                
                # 获取标题
                title = "未知标题"
                title_elem = item.find('h2')
                if title_elem:
                    # 查找标题中的链接文本
                    title_link = title_elem.find('span', class_='group-hover:underline')
                    if title_link:
                        title = title_link.get_text(strip=True)
                    else:
                        title = title_elem.get_text(strip=True)
                
                # 获取内容
                content = []
                # 获取第一段主要描述
                main_desc = item.find('p', class_=lambda x: x and 'mb-5' in x)
                if main_desc:
                    content.append(main_desc.get_text(strip=True))
                
                # 获取其他重要内容（如子标题和列表）
                # 跟踪已添加的内容，避免重复
                added_texts = set()
                added_texts.add(main_desc.get_text(strip=True) if main_desc else "")
                
                for elem in item.find_all(['h3', 'p', 'ul']):
                    if isinstance(elem, str):
                        continue
                    
                    # 处理子标题
                    if elem.name == 'h3':
                        subtitle_text = elem.get_text(strip=True)
                        if subtitle_text and subtitle_text not in added_texts:
                            content.append(f"\n### {subtitle_text}")
                            added_texts.add(subtitle_text)
                    # 处理段落
                    elif elem.name == 'p':
                        text = elem.get_text(strip=True)
                        if text and len(text) > 10 and text not in added_texts:  # 过滤太短的内容和重复内容
                            content.append(text)
                            added_texts.add(text)
                    # 处理列表
                    elif elem.name == 'ul':
                        for li in elem.find_all('li'):
                            text = li.get_text(strip=True)
                            if text and text not in added_texts:
                                content.append(f"• {text}")
                                added_texts.add(text)
                
                # 合并并清理内容
                content_text = "\n".join(content)
                content_text = re.sub(r'\s+', ' ', content_text).strip()
                
                if content_text and len(content_text) > 5:  # 确保有有效内容
                    formatted_title = f"{version} {title}" if version else title
                    updates.append({
                        "date": date,
                        "title": formatted_title,
                        "content": content_text[:500] + "..." if len(content_text) > 500 else content_text
                    })
                    
            except Exception as e:
                print(f"解析更新日志条目时出错: {str(e)}")
                continue
        
        # 如果BeautifulSoup没有找到任何更新，尝试使用正则表达式提取
        if not updates:
            print("使用正则表达式备用方法提取更新日志信息...")
            
            # 多种正则表达式模式
            patterns = [
                r'UPDATE\s*\([^)]+\):\s*([^\n]+)',
                r'更新\s*\([^)]+\)：\s*([^\n]+)',
                r'(\d+\.\d+\.\d+)[^\n]*\n([^\n]+)',
                r'<h[1-6][^>]*>([^<]+)</h[1-6]>[^<]*<[^>]*>([^<]+)',
                r'<div[^>]*changelog[^>]*>.*?<[^>]*>([^<]+)</[^>]*>.*?<[^>]*>([^<]+)</[^>]*>.*?</div>'
            ]
            
            for pattern in patterns:
                matches = re.findall(pattern, html_content, re.DOTALL | re.IGNORECASE)
                if matches:
                    print(f"正则表达式找到 {len(matches)} 个匹配项")
                    for i, match in enumerate(matches[:10]):
                        if len(match) >= 2:
                            updates.append({
                                "date": f"更新 {i+1}",
                                "title": dehtml(match[0])[:100],
                                "content": dehtml(match[1])[:200]
                            })
                        elif len(match) == 1:
                            updates.append({
                                "date": f"更新 {i+1}",
                                "title": "Cursor 更新",
                                "content": dehtml(match[0])[:200]
                            })
                    break
        
        # 如果仍然没有找到更新，尝试提取页面中的关键信息
        if not updates:
            print("尝试提取页面关键信息...")
            # 查找包含"UPDATE"或"更新"的文本
            update_texts = re.findall(r'[^\n]*(?:UPDATE|更新|CHANGELOG|变更)[^\n]*', html_content, re.IGNORECASE)
            for i, text in enumerate(update_texts[:5]):
                clean_text = dehtml(text).strip()
                if clean_text and len(clean_text) > 10:
                    updates.append({
                        "date": f"最近更新 {i+1}",
                        "title": "Cursor 更新",
                        "content": clean_text[:200]
                    })
        
        # 保存提取结果到调试文件
        try:
            debug_info = f"提取到 {len(updates)} 个更新:\n\n"
            for i, update in enumerate(updates):
                debug_info += f"更新 {i+1}:\n"
                debug_info += f"日期: {update['date']}\n"
                debug_info += f"标题: {update['title']}\n"
                debug_info += f"内容: {update['content']}\n\n"
            
            with open('cursor_output.txt', 'w', encoding='utf-8') as f:
                f.write(debug_info)
            print("已保存提取结果到: cursor_output.txt")
        except Exception as e:
            print(f"保存提取结果失败: {str(e)}")
        
        if not updates:
            print("未能提取到任何更新日志信息")
            return
        
        # 生成更新内容
        update_text = "Cursor 最新更新日志\n\n"
        
        for update in updates:
            update_text += f"【{update['date']}】{update['title']}\n"
            update_text += f"{update['content']}\n\n"
        
        print(f"成功提取到 {len(updates)} 个更新日志")
        
        # 检查是否有新内容
        file_path = "Cursor更新日志.txt"
        
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                old_content = f.read()
                
            if old_content == update_text:
                print('内容比对一致，无需更新和推送')
                # 即使内容一致，也检查是否需要入库（可能之前入库失败）
                print("检查是否需要入库...")
                try:
                    title_match = re.search(r'📰\s*(.+?)(?:\n|$)', update_text)
                    title = title_match.group(1).strip() if title_match else "Cursor最新更新"
                    
                    link_match = re.search(r'🔗\s*链接:\s*(.+?)(?:\n|$)', update_text)
                    url = link_match.group(1).strip() if link_match else None
                    
                    clean_content = update_text
                    clean_content = re.sub(r'📰\s*', '', clean_content)
                    clean_content = re.sub(r'📅\s*发布时间:\s*[^\n]+\n?', '', clean_content)
                    clean_content = re.sub(r'🔗\s*链接:\s*[^\n]+\n?', '', clean_content)
                    clean_content = re.sub(r'📋\s*分类:\s*[^\n]+\n?', '', clean_content)
                    clean_content = re.sub(r'\n{3,}', '\n\n', clean_content).strip()
                    
                    success = push_logger.log_push(
                        source="Cursor",
                        title=title,
                        content=clean_content,
                        category=None,
                        url=url,
                        push_channel="无",
                        push_status="skipped",
                        keywords=keywords if 'keywords' in locals() else None
                    )
                    if success:
                        print(f"✓ 已入库（之前可能未入库）: {title[:50]}...")
                    else:
                        print(f"✓ 内容已存在于数据库，无需重复入库")
                except Exception as e:
                    print(f"⚠ 检查入库时出错: {str(e)}")
                return
        
        # 保存新内容
        with open(file_path, 'w', encoding='utf-8', errors='ignore') as f:
            f.write(update_text)
        
        # 仅入库，不推送（已禁用推送功能）
        print("内容有更新，准备入库...")
        # 发送钉钉消息 - 已禁用
        # todaytime = time_module.strftime('%Y-%m-%d %H:%M:%S', time_module.localtime(time_module.time()))
        # message = f"Cursor更新：{todaytime}\n\n{update_text}"
        # send_result = dingding(message)  # 已禁用推送
        
        # 记录到数据库
        try:
                    # 从更新内容中提取标题和链接
                    title_match = re.search(r'📰\s*(.+?)(?:\n|$)', update_text)
                    title = title_match.group(1).strip() if title_match else "Cursor最新更新"
                    
                    link_match = re.search(r'🔗\s*链接:\s*(.+?)(?:\n|$)', update_text)
                    url = link_match.group(1).strip() if link_match else None
                    
                    category_match = re.search(r'📋\s*分类:\s*(.+?)(?:\n|$)', update_text)
                    category = category_match.group(1).strip() if category_match else None
                    
                    # 清理推送格式标记，提取原始内容
                    clean_content = update_text
                    clean_content = re.sub(r'📰\s*', '', clean_content)
                    clean_content = re.sub(r'📅\s*发布时间:\s*[^\n]+\n?', '', clean_content)
                    clean_content = re.sub(r'🔗\s*链接:\s*[^\n]+\n?', '', clean_content)
                    clean_content = re.sub(r'📋\s*分类:\s*[^\n]+\n?', '', clean_content)
                    clean_content = re.sub(r'\n{3,}', '\n\n', clean_content).strip()
                    
                    # 记录到数据库 - 使用清理后的原始内容
                    success = push_logger.log_push(
                        source="Cursor",
                        title=title,
                        content=clean_content,  # 存储清理后的原始内容，不包含推送格式标记
                        category=category,
                        url=url,
                        push_channel="无",  # 不推送
                        push_status="skipped",  # 跳过推送
                        keywords=keywords if 'keywords' in locals() else None
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
                
                break


def main():
    while True:
        try:
            get_cursor_updates()  # 执行爬取任务
        except Exception as e:
            print(f"执行任务时出错: {str(e)}")
            import traceback
            traceback.print_exc()
        
        # 每6小时检查一次
        print(f"等待6小时后再次检查...")
        time_module.sleep(60 * 60 * 6)

if __name__ == "__main__":
    main()