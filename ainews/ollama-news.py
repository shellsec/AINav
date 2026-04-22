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

# 钉钉消息推送
def dingding(message):
    try:
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
    except Exception as e:
        print(f"钉钉推送失败: {str(e)}")

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

def get_ollama_news():
    """获取Ollama模型库更新信息"""
    print("开始获取Ollama模型库更新信息...")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2',
        'DNT': '1',
        'Connection': 'keep-alive',
    }

    max_retries = 3
    retry_delay = 5
    for attempt in range(max_retries):
        try:
            response = requests.get('https://ollama.com/search?o=newest', headers=headers, timeout=30)
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
        print('所有重试均失败，跳过本次请求')
        return None

    if response.status_code != 200:
        print(f"请求失败，状态码: {response.status_code}")
        return None

    if not response.text or response.text.strip() == '':
        print('接口返回空内容，跳过处理')
        return None
            
    try:
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 获取第一个模型信息
        first_model = soup.find('li', attrs={'x-test-model': True})
        if not first_model:
            print("未找到模型信息")
            return None
            
        # 获取模型名称
        title = first_model.find('span', attrs={'x-test-search-response-title': True})
        if not title:
            print("未找到模型名称")
            return None
        model_name = title.text.strip()
        
        # 获取模型描述
        description = first_model.find('p', class_='text-neutral-800')
        if not description:
            print("未找到模型描述")
            return None
        model_desc = description.text.strip()
        
        # 获取模型能力标签
        capabilities = first_model.find_all('span', attrs={'x-test-capability': True})
        capability_text = ', '.join([cap.text.strip() for cap in capabilities]) if capabilities else "无"
        
        # 获取模型大小
        sizes = first_model.find_all('span', attrs={'x-test-size': True})
        size_text = ', '.join([size.text.strip() for size in sizes]) if sizes else "未知"
        
        # 获取下载次数
        pull_count = first_model.find('span', attrs={'x-test-pull-count': True})
        pull_text = pull_count.text.strip() if pull_count else "0"
        
        # 获取标签数量
        tag_count = first_model.find('span', attrs={'x-test-tag-count': True})
        tag_text = tag_count.text.strip() if tag_count else "0"
        
        # 获取更新时间
        updated = first_model.find('span', attrs={'x-test-updated': True})
        update_text = updated.text.strip() if updated else "未知"
        
        # 获取模型链接
        model_link = first_model.find('a')['href'] if first_model.find('a') else ""
        full_link = f"https://ollama.com{model_link}" if model_link else ""
        
        # 组合最终内容
        news_text = (
            f"Ollama最新模型更新\n\n"
            f"【模型名称】{model_name}\n"
            f"【模型描述】{model_desc}\n"
            f"【模型能力】{capability_text}\n"
            f"【模型大小】{size_text}\n"
            f"【下载次数】{pull_text}\n"
            f"【标签数量】{tag_text}\n"
            f"【更新时间】{update_text}\n"
            f"【模型链接】{full_link}"
        )
        return news_text
            
    except Exception as e:
        print(f"解析HTML失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def is_within_working_hours():
    """检查当前时间是否在工作时间范围内（早7:30至晚22:30）"""
    import datetime
    current_time = datetime.datetime.now().time()
    start_time = datetime.time(7, 30)
    end_time = datetime.time(22, 30)
    return start_time <= current_time <= end_time

def main():
    try:
        print("-" * 50)
        print(f"开始获取 Ollama 模型库更新 - {get_current_time()}")

        # 1. 获取资讯内容
        news_text = get_ollama_news()
        if not news_text:
            print("未获取到更新内容，跳过本次任务")
            return
        
        # 2. 准备推送内容
        todaytime = get_current_time()
        tex = f"Ollama模型库更新-消息：{todaytime}\n\n{news_text}"
        print("准备推送内容长度:", len(tex))

        # 3. 检查内容更新
        file_path = "Ollama模型库更新.txt"
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                old_content = f.read()

            print('读取到的文件内容长度:', len(old_content))
            if old_content == news_text:
                print('内容比对一致，无需更新和推送')
                # 即使内容一致，也检查是否需要入库（可能之前入库失败）
                print("检查是否需要入库...")
                try:
                    extracted_title = "Ollama模型库更新"
                    if news_text:
                        lines = str(news_text).split('\n')
                        for line in lines[:3]:
                            line = line.strip()
                            if line and len(line) > 10 and not line.startswith('📰') and not line.startswith('📅'):
                                extracted_title = line[:200]
                                break
                    
                    success = push_logger.log_push(
                        source="Ollama",
                        title=extracted_title,
                        content=str(news_text),
                        category="AI模型",
                        url=None,  # 使用None，避免固定URL导致去重（模型库内容会变化）
                        push_channel="无",
                        push_status="skipped",
                        keywords=["Ollama", "AI模型"]
                    )
                    if success:
                        print(f"✓ 已入库（之前可能未入库）: {extracted_title[:50]}...")
                    else:
                        print(f"✓ 内容已存在于数据库，无需重复入库")
                except Exception as e:
                    print(f"⚠ 检查入库时出错: {str(e)}")
                return
            else:
                print('内容比对不一致，需要更新')
                with open(file_path, 'w', encoding='utf-8', errors='ignore') as f:
                    f.write(news_text)

                # 4. 仅入库，不推送（已禁用推送功能）
                print("内容有更新，准备入库...")
                # dingding(tex)  # 已禁用推送
                
                # 记录到数据库
                try:
                    # 从内容中提取标题
                    extracted_title = "Ollama模型库更新"  # 默认标题
                    if news_text:
                        lines = str(news_text).split('\n')
                        for line in lines[:3]:
                            line = line.strip()
                            if line and len(line) > 10 and not line.startswith('📰') and not line.startswith('📅'):
                                extracted_title = line[:200]
                                break
                    
                    success = push_logger.log_push(
                        source="Ollama",
                        title=extracted_title,
                        content=str(news_text),  # 存储原始内容
                        category="AI模型",
                        url=None,  # 使用None，避免固定URL导致去重（模型库内容会变化）
                        push_channel="无",  # 不推送
                        push_status="skipped",  # 跳过推送
                        keywords=["Ollama", "AI模型"]
                    )
                    if success:
                        print(f"✓ 已入库: {extracted_title[:50]}...")
                    else:
                        print(f"⚠ 内容已存在，跳过入库")
                except Exception as e:
                    print(f"记录入库失败: {str(e)}")
                    import traceback
                    print(f"详细错误信息:")
                    traceback.print_exc()
                # wx(tex)
        else:
            print('首次运行，创建内容文件')
            with open(file_path, 'w', encoding='utf-8', errors='ignore') as f:
                f.write(news_text)
            # 首次运行也入库（不推送）
            print("首次运行，准备入库...")
            # dingding(tex)  # 已禁用推送
            
            # 记录到数据库
            try:
                # 从内容中提取标题
                extracted_title = "Ollama模型库更新"  # 默认标题
                if news_text:
                    lines = str(news_text).split('\n')
                    for line in lines[:3]:
                        line = line.strip()
                        if line and len(line) > 10 and not line.startswith('📰') and not line.startswith('📅'):
                            extracted_title = line[:200]
                            break
                
                success = push_logger.log_push(
                    source="Ollama",
                    title=extracted_title,
                    content=str(news_text),  # 存储原始内容
                    category="AI模型",
                    url="https://ollama.com/library",
                    push_channel="无",  # 不推送
                    push_status="skipped",  # 跳过推送
                    keywords=["Ollama", "AI模型"]
                )
                if success:
                    print(f"✓ 已入库: {extracted_title[:50]}...")
                else:
                    print(f"⚠ 内容已存在，跳过入库")
            except Exception as e:
                print(f"记录入库失败: {str(e)}")
            # wx(tex)

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