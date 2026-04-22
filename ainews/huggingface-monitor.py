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
from urllib3.exceptions import InsecureRequestWarning
from datetime import datetime, time
from push_logger import push_logger  # 导入推送日志记录器
import urllib3
urllib3.disable_warnings(InsecureRequestWarning)

# 全局配置对象
config = None

# 模型类型配置
MODEL_TYPES = {
    'text-generation': {
        'name': '文本生成',
        'url': 'https://huggingface.co/models?pipeline_tag=text-generation&sort=trending',
        'emoji': '📝',
        'description': '文本生成模型'
    },
    'any-to-any': {
        'name': '多模态转换',
        'url': 'https://huggingface.co/models?pipeline_tag=any-to-any&sort=trending',
        'emoji': '🔄',
        'description': '多模态转换模型'
    },
    'image-text-to-text': {
        'name': '图像文本转文本',
        'url': 'https://huggingface.co/models?pipeline_tag=image-text-to-text&sort=trending',
        'emoji': '🖼️📝',
        'description': '图像文本转文本模型'
    },
    'image-to-text': {
        'name': '图像转文本',
        'url': 'https://huggingface.co/models?pipeline_tag=image-to-text&sort=trending',
        'emoji': '🖼️➡️📝',
        'description': '图像转文本模型'
    },
    'image-to-image': {
        'name': '图像转图像',
        'url': 'https://huggingface.co/models?pipeline_tag=image-to-image&sort=trending',
        'emoji': '🖼️➡️🖼️',
        'description': '图像转图像模型'
    },
    'text-to-image': {
        'name': '文本转图像',
        'url': 'https://huggingface.co/models?pipeline_tag=text-to-image&sort=trending',
        'emoji': '📝➡️🖼️',
        'description': '文本转图像模型'
    },
    'text-to-video': {
        'name': '文本转视频',
        'url': 'https://huggingface.co/models?pipeline_tag=text-to-video&sort=trending',
        'emoji': '📝➡️🎥',
        'description': '文本转视频模型'
    },
    'text-to-speech': {
        'name': '文本转语音',
        'url': 'https://huggingface.co/models?pipeline_tag=text-to-speech&sort=trending',
        'emoji': '📝➡️🔊',
        'description': '文本转语音模型'
    }
}

def load_config():
    """加载配置文件"""
    global config
    config = configparser.ConfigParser()
    config_file = 'config.ini'
    
    if os.path.exists(config_file):
        config.read(config_file, encoding='utf-8')
        print(f"已加载配置文件: {config_file}")
    else:
        print(f"配置文件 {config_file} 不存在，将使用默认配置")
        # 创建默认配置
        config['dingding'] = {
            'access_token': 'your_access_token_here',
            'secret': 'your_secret_here'
        }
        config['wechat'] = {
            'corpid': 'your_corpid_here',
            'corpsecret': 'your_corpsecret_here',
            'agentid': '1000001'
        }
        config['monitor'] = {
            'enabled_types': 'text-generation,text-to-image,image-to-text',
            'check_interval': '43200',  # 12小时
            'max_models_per_type': '5'
        }
        
        # 保存默认配置
        with open(config_file, 'w', encoding='utf-8') as f:
            config.write(f)
        print(f"已创建默认配置文件: {config_file}")

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
    global config
    try:
        # 检查配置是否存在
        if not config or not config.has_section('dingding'):
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
    global config
    """企业微信消息推送"""
    try:
        if not config or not config.has_section('wechat'):
            print("配置文件中缺少 [wechat] 部分")
            return
            
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
    
    # 1. 查找所有可能的模型容器
    print("\n查找模型容器:")
    
    # 查找包含模型信息的div
    model_divs = soup.find_all('div', class_=re.compile(r'.*model.*|.*card.*|.*item.*', re.I))
    print(f"找到 {len(model_divs)} 个可能的模型容器")
    
    # 查找所有链接
    links = soup.find_all('a', href=True)
    model_links = [link for link in links if link.get('href', '') and '/models/' in link.get('href', '')]
    print(f"找到 {len(model_links)} 个模型链接")
    
    # 显示前几个模型链接的信息
    for i, link in enumerate(model_links[:5]):
        href = link.get('href', '')
        text = link.get_text(strip=True)
        print(f"模型 {i+1}: {text} -> {href}")
    
    print("\n=== HTML结构分析结束 ===\n")

def get_models_from_url(url, model_type_info, max_models=5):
    """从指定URL获取模型信息"""
    print(f"开始获取 {model_type_info['name']} 模型更新...")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    }

    max_retries = 3
    retry_delay = 5
    
    for attempt in range(max_retries):
        try:
            print(f"正在请求URL: {url} (尝试 {attempt + 1}/{max_retries})")
            
            response = requests.get(url, headers=headers, timeout=30, verify=False)
            
            if response.status_code == 200:
                break
            else:
                print(f"请求失败，状态码：{response.status_code}")
                if attempt < max_retries - 1:
                    time_module.sleep(retry_delay)
                    
        except Exception as e:
            print(f"请求异常: {str(e)}")
            if attempt < max_retries - 1:
                time_module.sleep(retry_delay)
    else:
        print("所有重试均失败，无法获取模型更新")
        return []

    if response.status_code != 200:
        print(f"获取模型页面失败，状态码：{response.status_code}")
        return []

    # 保存HTML内容以便调试
    debug_filename = f"huggingface_{model_type_info['name']}_debug.html"
    try:
        with open(debug_filename, 'w', encoding='utf-8') as f:
            f.write(response.text)
        print(f"已保存HTML内容到{debug_filename}，长度：{len(response.text)}")
    except Exception as e:
        print(f"保存调试文件失败: {str(e)}")

    soup = BeautifulSoup(response.text, 'html.parser')
    model_updates = []
    
    try:
        # 策略1: 优先从data-props中提取模型信息（这是最可靠的方法）
        print("尝试从data-props中提取模型信息...")
        # 查找包含ModelList的data-props属性
        data_props_pattern = r'data-target="ModelList"\s+data-props="([^"]*)"'
        data_props_match = re.search(data_props_pattern, response.text)
        
        if data_props_match:
            try:
                import html
                import json
                data_props_str = data_props_match.group(1)
                # 替换HTML实体
                data_props_str = data_props_str.replace('&quot;', '"')
                data_props_str = data_props_str.replace('&amp;', '&')
                data_props_str = data_props_str.replace('&lt;', '<')
                data_props_str = data_props_str.replace('&gt;', '>')
                
                data_props = json.loads(data_props_str)
                
                if 'initialValues' in data_props and 'models' in data_props['initialValues']:
                    models_data = data_props['initialValues']['models']
                    print(f"从data-props中找到 {len(models_data)} 个模型")
                    
                    for i, model in enumerate(models_data[:max_models]):
                        try:
                            if isinstance(model, dict):
                                model_id = model.get('id', '')
                                author = model.get('author', '')
                                pipeline_tag = model.get('pipeline_tag', '')
                                last_modified = model.get('lastModified', '')
                                likes = model.get('likes', 0)
                                
                                # 格式化时间
                                if last_modified:
                                    try:
                                        from datetime import datetime
                                        dt = datetime.fromisoformat(last_modified.replace('Z', '+00:00'))
                                        now = datetime.now(dt.tzinfo)
                                        diff = now - dt
                                        if diff.days > 0:
                                            update_time = f"{diff.days} 天前"
                                        elif diff.seconds > 3600:
                                            update_time = f"{diff.seconds // 3600} 小时前"
                                        else:
                                            update_time = f"{diff.seconds // 60} 分钟前"
                                    except:
                                        update_time = "最近更新"
                                else:
                                    update_time = "最近更新"
                                
                                full_name = model_id
                                full_url = f"https://huggingface.co/{model_id}"
                                
                                model_info = f"{model_type_info['emoji']} {full_name}\n📝 类型: {model_type_info['description']}\n🔗 {full_url}\n"
                                model_updates.append(model_info)
                                print(f"添加模型: {full_name}")
                                
                        except Exception as e:
                            print(f"解析单个模型数据时出错: {str(e)}")
                            continue
                            
            except Exception as e:
                print(f"解析data-props失败: {str(e)}")
                # 尝试使用html.unescape
                try:
                    import html
                    import json
                    data_props_str = html.unescape(data_props_match.group(1))
                    data_props = json.loads(data_props_str)
                    
                    if 'initialValues' in data_props and 'models' in data_props['initialValues']:
                        models_data = data_props['initialValues']['models']
                        print(f"从data-props中找到 {len(models_data)} 个模型")
                        
                        for i, model in enumerate(models_data[:max_models]):
                            try:
                                if isinstance(model, dict):
                                    model_id = model.get('id', '')
                                    author = model.get('author', '')
                                    pipeline_tag = model.get('pipeline_tag', '')
                                    last_modified = model.get('lastModified', '')
                                    likes = model.get('likes', 0)
                                    
                                    # 格式化时间
                                    if last_modified:
                                        try:
                                            from datetime import datetime
                                            dt = datetime.fromisoformat(last_modified.replace('Z', '+00:00'))
                                            now = datetime.now(dt.tzinfo)
                                            diff = now - dt
                                            if diff.days > 0:
                                                update_time = f"{diff.days} 天前"
                                            elif diff.seconds > 3600:
                                                update_time = f"{diff.seconds // 3600} 小时前"
                                            else:
                                                update_time = f"{diff.seconds // 60} 分钟前"
                                        except:
                                            update_time = "最近更新"
                                    else:
                                        update_time = "最近更新"
                                    
                                    full_name = model_id
                                    full_url = f"https://huggingface.co/{model_id}"
                                    
                                    model_info = f"{model_type_info['emoji']} {full_name}\n📝 类型: {model_type_info['description']}\n🔗 {full_url}\n"
                                    model_updates.append(model_info)
                                    print(f"添加模型: {full_name}")
                                    
                            except Exception as e:
                                print(f"解析单个模型数据时出错: {str(e)}")
                                continue
                                
                except Exception as e2:
                    print(f"第二次解析data-props也失败: {str(e2)}")
        
        # 策略2: 如果data-props解析失败，尝试从HTML中的JSON数据提取模型信息
        if not model_updates:
            print("data-props解析失败，尝试从JSON数据中提取模型信息...")
            
            # 查找包含模型数据的script标签或内联数据
            model_data_pattern = r'"models":\s*\[(.*?)\]'
            model_data_match = re.search(model_data_pattern, response.text, re.DOTALL)
            
            if model_data_match:
                try:
                    # 提取模型数据
                    models_json_str = "[" + model_data_match.group(1) + "]"
                    # 清理JSON字符串
                    models_json_str = re.sub(r',\s*}', '}', models_json_str)
                    models_json_str = re.sub(r',\s*]', ']', models_json_str)
                    
                    # 解析JSON
                    import json
                    models_data = json.loads(models_json_str)
                    
                    print(f"从JSON数据中找到 {len(models_data)} 个模型")
                    
                    for i, model in enumerate(models_data[:max_models]):
                        try:
                            if isinstance(model, dict):
                                model_id = model.get('id', '')
                                author = model.get('author', '')
                                pipeline_tag = model.get('pipeline_tag', '')
                                last_modified = model.get('lastModified', '')
                                likes = model.get('likes', 0)
                                
                                # 格式化时间
                                if last_modified:
                                    try:
                                        from datetime import datetime
                                        dt = datetime.fromisoformat(last_modified.replace('Z', '+00:00'))
                                        now = datetime.now(dt.tzinfo)
                                        diff = now - dt
                                        if diff.days > 0:
                                            update_time = f"{diff.days} 天前"
                                        elif diff.seconds > 3600:
                                            update_time = f"{diff.seconds // 3600} 小时前"
                                        else:
                                            update_time = f"{diff.seconds // 60} 分钟前"
                                    except:
                                        update_time = "最近更新"
                                else:
                                    update_time = "最近更新"
                                
                                full_name = model_id
                                full_url = f"https://huggingface.co/{model_id}"
                                
                                model_info = f"{model_type_info['emoji']} {full_name}\n📝 类型: {model_type_info['description']}\n🔗 {full_url}\n"
                                model_updates.append(model_info)
                                print(f"添加模型: {full_name}")
                                
                        except Exception as e:
                            print(f"解析单个模型数据时出错: {str(e)}")
                            continue
                            
                except Exception as e:
                    print(f"解析JSON数据失败: {str(e)}")
        
        # 策略2: 如果JSON解析失败，使用HTML解析
        if not model_updates:
            print("JSON解析失败，尝试HTML解析...")
            model_links = soup.find_all('a', href=re.compile(r'/models/[^/]+$'))
            print(f"找到 {len(model_links)} 个模型链接")
            
            for link in model_links[:max_models]:
                try:
                    href = link.get('href', '')
                    if not href:
                        continue
                        
                    model_name = href.split('/')[-1] if href else "未知模型"
                    
                    # 获取模型的完整名称（可能包含组织名）
                    full_name = link.get_text(strip=True)
                    if not full_name:
                        # 尝试从父元素获取文本
                        parent = link.parent
                        if parent:
                            full_name = parent.get_text(strip=True)
                    
                    if not full_name:
                        full_name = model_name
                    
                    # 查找相关的更新时间信息
                    update_time = "最近更新"
                    
                    # 尝试在同一容器中查找时间信息
                    container = link
                    for _ in range(3):  # 向上查找3层父元素
                        container = container.parent if container and container.parent else None
                        if container:
                            time_elem = container.find('time')
                            if time_elem:
                                update_time = time_elem.get_text(strip=True)
                                break
                            
                            # 查找包含"Updated"或"ago"的文本
                            time_text = container.find(string=re.compile(r'Updated|ago|\d+ days?|\d+ hours?', re.I))
                            if time_text and hasattr(time_text, 'strip'):
                                update_time = time_text.strip()
                                break
                    
                    # 尝试获取模型类型/标签
                    model_type = model_type_info['description']
                    if container:
                        # 查找标签元素
                        tag_elem = container.find(['span', 'div'], class_=re.compile(r'tag|label|badge', re.I))
                        if tag_elem:
                            model_type = tag_elem.get_text(strip=True)
                    
                    full_url = f"https://huggingface.co{href}" if href else ""
                    
                    model_info = f"{model_type_info['emoji']} {full_name}\n📝 类型: {model_type}\n⏰ {update_time}\n🔗 {full_url}\n"
                    model_updates.append(model_info)
                    print(f"添加模型: {full_name}")
                    
                except Exception as e:
                    print(f"解析模型链接时出错: {str(e)}")
                    continue
        
        # 策略2: 如果第一种方法没有找到足够的模型，使用正则表达式
        if len(model_updates) < 3:
            print("\n使用正则表达式备用方法...")
            
            # 查找模型名称模式
            model_patterns = [
                r'href="/models/([^"]+)"[^>]*>([^<]+)',
                r'/models/([a-zA-Z0-9_-]+/[a-zA-Z0-9_-]+)',
                r'"([a-zA-Z0-9_-]+/[a-zA-Z0-9_-]+)"[^>]*>.*?Updated'
            ]
            
            for pattern in model_patterns:
                matches = re.findall(pattern, response.text)
                if matches:
                    print(f"正则表达式找到 {len(matches)} 个匹配项")
                    for match in matches[:max_models]:
                        if isinstance(match, tuple):
                            model_name = match[0] if match[0] else match[1] if len(match) > 1 else "未知模型"
                        else:
                            model_name = match
                        
                        model_info = f"{model_type_info['emoji']} {model_name}\n📝 类型: {model_type_info['description']}\n⏰ 最近更新\n🔗 https://huggingface.co/models/{model_name}\n"
                        if model_info not in model_updates:
                            model_updates.append(model_info)
                    break
        
        return model_updates
        
    except Exception as e:
        print(f"获取更新失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return []

def get_all_huggingface_updates():
    """获取所有类型的Hugging Face最新更新"""
    print("开始获取所有类型的Hugging Face最新更新...")
    
    # 获取启用的模型类型
    enabled_types = []
    if config and config.has_section('monitor'):
        enabled_types_str = config.get('monitor', 'enabled_types', fallback='text-generation,text-to-image')
        enabled_types = [t.strip() for t in enabled_types_str.split(',')]
    else:
        enabled_types = ['text-generation', 'text-to-image', 'image-to-text']
    
    max_models_per_type = 5
    if config and config.has_section('monitor'):
        max_models_per_type = config.getint('monitor', 'max_models_per_type', fallback=5)
    
    all_updates = {}
    
    for model_type in enabled_types:
        if model_type in MODEL_TYPES:
            model_type_info = MODEL_TYPES[model_type]
            models = get_models_from_url(model_type_info['url'], model_type_info, max_models_per_type)
            if models:
                all_updates[model_type] = {
                    'name': model_type_info['name'],
                    'emoji': model_type_info['emoji'],
                    'models': models
                }
                print(f"成功获取 {model_type_info['name']} 模型: {len(models)} 个")
            else:
                print(f"未能获取 {model_type_info['name']} 模型")
        else:
            print(f"未知的模型类型: {model_type}")
    
    if not all_updates:
        print("未能获取到任何模型更新信息")
        return None
    
    # 组合所有更新内容
    updates_text = "🚀 Hugging Face 最新模型更新汇总\n\n"
    
    for model_type, info in all_updates.items():
        updates_text += f"📋 {info['name']} ({info['emoji']})\n"
        updates_text += "=" * 50 + "\n"
        updates_text += "\n".join(info['models'])
        updates_text += "\n\n"
    
    print(f"成功提取到 {len(all_updates)} 种类型的模型更新")
    return updates_text

def main():
    # 加载配置
    load_config()
    
    while True:
        try:
            updates = get_all_huggingface_updates()
            
            if updates:
                # 检查是否有新内容
                file_path = "HuggingFace更新.txt"
                
                if os.path.exists(file_path):
                    with open(file_path, 'r', encoding='utf-8') as f:
                        old_content = f.read()
                        
                    if old_content == updates:
                        print('内容比对一致，无需更新和推送')
                        # 即使内容一致，也检查是否需要入库（可能之前入库失败）
                        print("检查是否需要入库...")
                        try:
                            title_match = re.search(r'📰\s*(.+?)(?:\n|$)', updates)
                            title = title_match.group(1).strip() if title_match else "HuggingFace最新更新"
                            
                            link_match = re.search(r'🔗\s*链接:\s*(.+?)(?:\n|$)', updates)
                            url = link_match.group(1).strip() if link_match else None
                            
                            clean_content = updates
                            clean_content = re.sub(r'📰\s*', '', clean_content)
                            clean_content = re.sub(r'📅\s*发布时间:\s*[^\n]+\n?', '', clean_content)
                            clean_content = re.sub(r'🔗\s*链接:\s*[^\n]+\n?', '', clean_content)
                            clean_content = re.sub(r'📋\s*分类:\s*[^\n]+\n?', '', clean_content)
                            clean_content = re.sub(r'\n{3,}', '\n\n', clean_content).strip()
                            
                            keywords = ["HuggingFace更新", "AI模型", "机器学习", "深度学习", "模型监控"]
                            
                            success = push_logger.log_push(
                                source="HuggingFace",
                                title=title,
                                content=clean_content,
                                category=None,
                                url=url,
                                push_channel="无",
                                push_status="skipped",
                                keywords=keywords
                            )
                            if success:
                                print(f"✓ 已入库（之前可能未入库）: {title[:50]}...")
                            else:
                                print(f"✓ 内容已存在于数据库，无需重复入库")
                        except Exception as e:
                            print(f"⚠ 检查入库时出错: {str(e)}")
                        # 获取检查间隔
                        check_interval = 43200  # 默认12小时
                        if config and config.has_section('monitor'):
                            check_interval = config.getint('monitor', 'check_interval', fallback=43200)
                        print(f"等待{check_interval//3600}小时后再次检查...")
                        time_module.sleep(check_interval)
                        continue
                
                # 保存新内容
                with open(file_path, 'w', encoding='utf-8', errors='ignore') as f:
                    f.write(updates)
                
                # 仅入库，不推送（已禁用推送功能）
                print("内容有更新，准备入库...")
                
                keywords = ["HuggingFace更新", "AI模型", "机器学习", "深度学习", "模型监控"]
                
                # 记录到数据库
                try:
                    # 从更新内容中提取标题和链接
                    title_match = re.search(r'📰\s*(.+?)(?:\n|$)', updates)
                    title = title_match.group(1).strip() if title_match else "HuggingFace最新更新"
                    
                    link_match = re.search(r'🔗\s*链接:\s*(.+?)(?:\n|$)', updates)
                    url = link_match.group(1).strip() if link_match else None
                    
                    category_match = re.search(r'📋\s*分类:\s*(.+?)(?:\n|$)', updates)
                    category = category_match.group(1).strip() if category_match else None
                    
                    # 清理推送格式标记，提取原始内容
                    clean_content = updates
                    # 移除各种 emoji 标记和格式前缀
                    clean_content = re.sub(r'📰\s*', '', clean_content)
                    clean_content = re.sub(r'📅\s*发布时间:\s*[^\n]+\n?', '', clean_content)
                    clean_content = re.sub(r'🔗\s*链接:\s*[^\n]+\n?', '', clean_content)
                    clean_content = re.sub(r'🔗\s*[^\n]+\n?', '', clean_content)  # 单独的链接行
                    clean_content = re.sub(r'📋\s*分类:\s*[^\n]+\n?', '', clean_content)
                    clean_content = re.sub(r'📋\s*[^\n]+\s*\([^\)]+\)\n?', '', clean_content)  # 分类行（带emoji）
                    clean_content = re.sub(r'📝\s*类型:\s*[^\n]+\n?', '', clean_content)
                    clean_content = re.sub(r'⏰\s*[^\n]+\n?', '', clean_content)
                    # 清理多余空行
                    clean_content = re.sub(r'\n{3,}', '\n\n', clean_content).strip()
                    
                    # 记录到数据库 - 使用清理后的原始内容
                    success = push_logger.log_push(
                        source="HuggingFace",
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
                    print(f"记录入库失败: {str(e)}")
                    import traceback
                    print(f"详细错误信息:")
                    traceback.print_exc()
            else:
                print("未获取到更新内容")
                
        except Exception as e:
            print(f"执行任务时出错: {str(e)}")
            import traceback
            traceback.print_exc()
        
        # 获取检查间隔
        check_interval = 43200  # 默认12小时
        if config and config.has_section('monitor'):
            check_interval = config.getint('monitor', 'check_interval', fallback=43200)
        
        print(f"等待{check_interval//3600}小时后再次检查...")
        time_module.sleep(check_interval)

if __name__ == "__main__":
    main()