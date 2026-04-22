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
from fake_useragent import UserAgent
from html.parser import HTMLParser
from re import sub 
from sys import stderr 
from traceback import print_exc 
import random
from fake_useragent import UserAgent
from push_logger import push_logger  # 导入推送日志记录器


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
    try: 
        parser = _DeHTMLParser() 
        parser.feed(text) 
        parser.close() 
        return parser.text() 
    except: 
        print_exc(file=stderr) 
        return text  


user_agent = [
    "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; en-us) AppleWebKit/534.50 (KHTML, like Gecko) Version/5.1 Safari/534.50",
    "Mozilla/5.0 (Windows; U; Windows NT 6.1; en-us) AppleWebKit/534.50 (KHTML, like Gecko) Version/5.1 Safari/534.50",
    "Mozilla/5.0 (Windows NT 10.0; WOW64; rv:38.0) Gecko/20100101 Firefox/38.0",
    "Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; .NET4.0C; .NET4.0E; .NET CLR 2.0.50727; .NET CLR 3.0.30729; .NET CLR 3.5.30729; InfoPath.3; rv:11.0) like Gecko",
    "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)",
    "Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.0; Trident/4.0)",
    "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)",
    "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.6; rv:2.0.1) Gecko/20100101 Firefox/4.0.1",
    "Mozilla/5.0 (Windows NT 6.1; rv:2.0.1) Gecko/20100101 Firefox/4.0.1",
    "Opera/9.80 (Macintosh; Intel Mac OS X 10.6.8; U; en) Presto/2.8.131 Version/11.11",
    "Opera/9.80 (Windows NT 6.1; U; en) Presto/2.8.131 Version/11.11",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_0) AppleWebKit/535.11 (KHTML, like Gecko) Chrome/17.0.963.56 Safari/535.11",
    "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 5.1; Maxthon 2.0)",
    "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 5.1; TencentTraveler 4.0)",
    "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 5.1)",
    "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 5.1; The World)",
    "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 5.1; Trident/4.0; SE 2.X MetaSr 1.0; SE 2.X MetaSr 1.0; .NET CLR 2.0.50727; SE 2.X MetaSr 1.0)",
    "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 5.1; 360SE)",
    "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 5.1; Avant Browser)",
    "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 5.1)",
    "Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_3_3 like Mac OS X; en-us) AppleWebKit/533.17.9 (KHTML, like Gecko) Version/5.0.2 Mobile/8J2 Safari/6533.18.5",
    "Mozilla/5.0 (iPod; U; CPU iPhone OS 4_3_3 like Mac OS X; en-us) AppleWebKit/533.17.9 (KHTML, like Gecko) Version/5.0.2 Mobile/8J2 Safari/6533.18.5",
    "Mozilla/5.0 (iPad; U; CPU OS 4_3_3 like Mac OS X; en-us) AppleWebKit/533.17.9 (KHTML, like Gecko) Version/5.0.2 Mobile/8J2 Safari/6533.18.5",
    "Mozilla/5.0 (Linux; U; Android 2.3.7; en-us; Nexus One Build/FRF91) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1",
    "MQQBrowser/26 Mozilla/5.0 (Linux; U; Android 2.3.7; zh-cn; MB200 Build/GRJ22; CyanogenMod-7) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1",
    "Opera/9.80 (Android 2.3.4; Linux; Opera Mobi/build-1107180945; U; en-GB) Presto/2.8.149 Version/11.10",
    "Mozilla/5.0 (Linux; U; Android 3.0; en-us; Xoom Build/HRI39) AppleWebKit/534.13 (KHTML, like Gecko) Version/4.0 Safari/534.13",
    "Mozilla/5.0 (BlackBerry; U; BlackBerry 9800; en) AppleWebKit/534.1+ (KHTML, like Gecko) Version/6.0.0.337 Mobile Safari/534.1+",
    "Mozilla/5.0 (hp-tablet; Linux; hpwOS/3.0.0; U; en-US) AppleWebKit/534.6 (KHTML, like Gecko) wOSBrowser/233.70 Safari/534.6 TouchPad/1.0",
    "Mozilla/5.0 (SymbianOS/9.4; Series60/5.0 NokiaN97-1/20.0.019; Profile/MIDP-2.1 Configuration/CLDC-1.1) AppleWebKit/525 (KHTML, like Gecko) BrowserNG/7.1.18124",
    "Mozilla/5.0 (compatible; MSIE 9.0; Windows Phone OS 7.5; Trident/5.0; IEMobile/9.0; HTC; Titan)",
    "UCWEB7.0.2.37/28/999",
    "NOKIA5700/ UCWEB7.0.2.37/28/999",
    "Openwave/ UCWEB7.0.2.37/28/999",
    "Mozilla/4.0 (compatible; MSIE 6.0; ) Opera/UCWEB7.0.2.37/28/999",
    # iPhone 6：
    "Mozilla/6.0 (iPhone; CPU iPhone OS 8_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/8.0 Mobile/10A5376e Safari/8536.25",

]

headers = {'User-Agent': random.choice(user_agent)}

# 随机获取一个请求头
def get_user_agent():
    return random.choice(USER_AGENTS)        

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

def get_aibase_news():
    """从aibase获取最新新闻"""
    url = "https://www.aibase.com/zh/news"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2',
        'Referer': 'https://www.aibase.com/zh/news',
        'DNT': '1',
        'Sec-GPC': '1',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Connection': 'keep-alive',
        'Priority': 'u=0, i',
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            html2 = response.text.replace('\n', '').replace('\r', '').replace(' ', '').replace('\u200b', '')
            import re
            b = re.findall(r'<h3class="line-clamp-2md:text-xltext-lgtext-surface-800">(.*?)</div></div>', html2)
            if b:
                article = dehtml(b[0])
                return article
            else:
                print("No matches found in the HTML content.")
                return None
        else:
            print(f"请求失败，状态码: {response.status_code}")
            return None
    except Exception as e:
        print(f"获取新闻失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def check_updates(new_content):
    """检查内容是否有更新"""
    file_path = "AI日报快讯.txt"
    try:
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                old_content = f.read()
            if old_content == new_content:
                return False
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    except Exception as e:
        print(f"更新检查失败: {str(e)}")
        return True

# 主函数
def main():
    try:
        print("-" * 50)
        print(f"开始获取 AIbase 新闻 - {get_current_time()}")
        
        # 1. 获取新闻内容
        article2 = get_aibase_news()
        if not article2:
            print("未获取到新闻内容，跳过本次任务")
            return
        
        # 2. 准备推送内容
        todaytime = get_current_time()
        tex = "AI日报快讯-消息：" + todaytime  + "\n" + str(article2)
        print("准备推送内容:\n", tex)
        
        # 从内容中提取真实标题（取第一行有意义的文本）
        extracted_title = "AI日报快讯"  # 默认标题
        if article2:
            lines = str(article2).split('\n')
            for line in lines[:3]:
                line = line.strip()
                # 跳过空行和格式标记
                if line and len(line) > 10 and not line.startswith('📰') and not line.startswith('📅'):
                    extracted_title = line[:200]
                    break

        # 3. 检查内容更新
        art_keywork = "AI日报快讯"
        if os.path.exists(str(art_keywork)+'.txt'):
            with open(str(art_keywork)+'.txt','r',encoding='utf-8') as g:
                read_all = g.read()
                g.close()

            print('读取到的文件内容:')
            print(read_all)
            if read_all != str(article2):
                print('内容比对不一致，需要更新')
                with open(str(art_keywork)+'.txt',"w+", encoding='utf-8', errors='ignore') as g:
                    g.write(str(article2))
                
                # 4. 仅入库，不推送（已禁用推送功能）
                print("内容有更新，准备入库...")
                # send_result = dingding(tex)  # 已禁用推送
                
                # 记录到数据库 - 使用原始内容，不包含推送格式
                try:
                    # 记录到数据库 - 使用原始内容，不包含推送格式
                    success = push_logger.log_push(
                        source="AIBase",
                        title=extracted_title,  # 使用提取的标题
                        content=str(article2),  # 存储原始内容，不包含推送格式标记
                        category="AI资讯",
                        url=None,  # 使用None，避免固定URL导致去重（每日资讯内容会变化）
                        push_channel="无",  # 不推送
                        push_status="skipped",  # 跳过推送
                        keywords=["AI日报快讯", "AIBase"]
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
                print('内容比对一致，无需更新和推送')
                # 即使内容一致，也检查是否需要入库（可能之前入库失败）
                print("检查是否需要入库...")
                try:
                    # 提取标题
                    extracted_title = "AI日报快讯"
                    if article2:
                        lines = str(article2).split('\n')
                        for line in lines[:3]:
                            line = line.strip()
                            if line and len(line) > 10 and not line.startswith('📰') and not line.startswith('📅'):
                                extracted_title = line[:200]
                                break
                    
                    success = push_logger.log_push(
                        source="AIBase",
                        title=extracted_title,
                        content=str(article2),
                        category="AI资讯",
                        url=None,  # 使用None，避免固定URL导致去重（每日资讯内容会变化）
                        push_channel="无",
                        push_status="skipped",
                        keywords=["AI日报快讯", "AIBase"]
                    )
                    if success:
                        print(f"✓ 已入库（之前可能未入库）: {extracted_title[:50]}...")
                    else:
                        print(f"✓ 内容已存在于数据库，无需重复入库")
                except Exception as e:
                    print(f"⚠ 检查入库时出错: {str(e)}")
        else:
            print('首次运行，创建内容文件')
            with open(str(art_keywork)+'.txt',"w+", encoding='utf-8', errors='ignore') as g:
                g.write(str(article2))
            # 首次运行也入库（不推送）
            print("首次运行，准备入库...")
            # send_result = dingding(tex)  # 已禁用推送
            
            # 记录到数据库 - 使用原始内容，不包含推送格式
            try:
                success = push_logger.log_push(
                    source="AIBase",
                    title=extracted_title,  # 使用提取的标题
                    content=str(article2),  # 存储原始内容，不包含推送格式标记
                    category="AI资讯",
                    url="https://www.aibase.com/zh/news",
                    push_channel="无",  # 不推送
                    push_status="skipped",  # 跳过推送
                    keywords=["AI日报快讯", "AIBase"]
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

def is_within_working_hours():
    """检查当前时间是否在工作时间范围内（早7:30至晚22:30）"""
    import datetime
    current_time = datetime.datetime.now().time()
    start_time = datetime.time(7, 30)
    end_time = datetime.time(22, 30)
    return start_time <= current_time <= end_time

# 修改主函数
if __name__ == "__main__":
    import time
    
    while True:
        try:
            print(f"当前时间: {get_current_time()}, 执行任务...")
            main()
        except Exception as e:
            print(f"执行任务时出错: {str(e)}")
            import traceback
            traceback.print_exc()
        
        # 每5分钟检查一次
        print(f"等待5分钟后再次检查...")
        time_module.sleep(60 * 5)