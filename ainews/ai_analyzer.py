#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI新闻每日分析器
使用 mimo-flash API 进行AI分析
"""

import os
import sys
import json
import requests
import time
import sqlite3
from typing import Dict, Optional, List
from datetime import datetime, timedelta
from collections import Counter

# 尝试导入日志
try:
    parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sys.path.insert(0, parent_dir)
    from logger_config import log_system_event, log_error
except:
    def log_system_event(*args, **kwargs):
        pass
    def log_error(*args, **kwargs):
        pass

try:
    from dingtalk_fallback_notify import notify_ai_fallback
except ImportError:
    def notify_ai_fallback(*a, **k):
        pass

_repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)
from ai_api_compat import default_api_base_for_ollama, resolve_openai_compatible_auth
from ai_config_merge import (
    infer_repo_root_for_config,
    merge_shared_ai_profile,
    build_profile_try_chain,
)


class AIAnalyzer:
    def __init__(self, config_path=None):
        """初始化AI分析器"""
        if config_path is None:
            # 默认使用 ainews 目录下的配置
            current_dir = os.path.dirname(os.path.abspath(__file__))
            config_path = os.path.join(current_dir, 'ai_analysis_config.json')
        
        self.config = self.load_config(config_path)
        _abs = os.path.abspath(config_path)
        _root = infer_repo_root_for_config(_abs)
        _raw_ai = self.config.get("ai_analysis") or {}
        self._ai_try_chain = build_profile_try_chain(_raw_ai, _root)
        self.ai_config = self._ai_try_chain[0] if self._ai_try_chain else merge_shared_ai_profile(_raw_ai, _root)
        self.enabled = bool(self.ai_config.get('enabled', False))
        self.api_key, _ = resolve_openai_compatible_auth(self.ai_config)
        self.api_base = default_api_base_for_ollama(
            self.ai_config,
            self.ai_config.get('api_base', '') or 'https://api.xiaomimimo.com/v1',
        )
        self.model = self.ai_config.get('model', 'mimo-v2-flash')
        self.timeout = int(self.ai_config.get('timeout', 30))
        self.max_retries = int(self.ai_config.get('max_retries', 2))
        self.max_news_per_batch = int(self.ai_config.get('max_news_per_batch', 100))
        self.batch_size = int(self.ai_config.get('batch_size', 50))
        self.fallback_to_keywords = bool(self.ai_config.get('fallback_to_keywords', True))
        self.only_important_news = bool(self.ai_config.get('only_important_news', False))
        self.important_news_threshold = int(self.ai_config.get('important_news_threshold', 70))
        self.max_news_to_analyze = int(self.ai_config.get('max_news_to_analyze', 200))

        _any_key = any(resolve_openai_compatible_auth(c)[0] for c in self._ai_try_chain)
        if not _any_key:
            self.enabled = False
    
    def load_config(self, config_path):
        """加载配置文件"""
        try:
            if os.path.exists(config_path):
                with open(config_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            print(f"⚠️ 加载配置文件失败: {e}")
        
        # 返回默认配置
        return {
            'ai_analysis': {
                'enabled': False,
                'api_key': '',
                'api_base': 'https://api.xiaomimimo.com/v1',
                'model': 'mimo-v2-flash',
                'max_tokens': 1024,
                'timeout': 30,
                'max_retries': 2,
                'max_news_per_batch': 100,
                'batch_size': 50,
                'fallback_to_keywords': True
            }
        }
    
    def batch_analyze(self, prompt: str) -> Optional[Dict]:
        """按 profile 链逐套请求；仅整条链路均失败才返回 None，再由上层决定是否关键词降级。"""
        if not self.enabled:
            print("⚠️ AI分析未启用（enabled=False 或 api_key为空）")
            return None

        chain = getattr(self, "_ai_try_chain", None) or [self.ai_config]

        system_prompt = """你是AI技术领域的信息汇总与趋势分析助手，专门基于当日AI新闻做结构化归纳。职责是：从给定新闻中提炼技术热度、重要事件、关键洞察与SWOT，并按固定JSON输出；不预测具体产品成败或商业结果，不替代用户做决策，仅提供信息层面的摘要与趋势判断。

分析范围包括：
- AI模型和技术发展（GPT、Claude、LLM等）
- AI公司和产品动态（OpenAI、Anthropic、Google等）
- AI应用场景和行业影响
- AI监管和政策动态
- AI开源社区和工具

能力边界：你能做的是基于新闻做情绪/热度判断、TOP新闻排序、关键洞察与SWOT归纳；不能做的是臆造新闻或数据、承诺具体商业结果或替代用户决策。信息不足时：必填字段填"数据不足"，可选字段可省略或null。

分析原则：
1. 基于事实：所有分析必须基于新闻内容，不得臆测
2. 量化评估：使用具体数字和评分，避免模糊表述
3. 技术导向：重点关注技术发展趋势、创新突破和行业影响
4. 结构化输出：严格按照JSON格式返回，确保字段完整
5. 专业视角：从技术发展、产品创新、行业趋势等角度进行分析，而非金融投资角度

输出要求：
- 必须返回有效的JSON格式
- 所有数值字段必须是数字类型
- 所有文本字段必须具体明确
- 只输出一个完整的JSON对象，不要用```json或```包裹，不要先输出任何说明再输出JSON
- 如果信息不足，使用"数据不足"而非猜测

本分析仅供信息参考，不构成任何投资、交易或决策建议；用户须独立判断并自担风险。"""

        for pi, cfg in enumerate(chain):
            if cfg.get("enabled") is False:
                continue
            api_key, _ = resolve_openai_compatible_auth(cfg)
            if not api_key:
                continue
            api_base = default_api_base_for_ollama(
                cfg, (cfg.get("api_base") or "") or "https://api.xiaomimimo.com/v1"
            ).rstrip("/")
            model = cfg.get("model", "mimo-v2-flash")
            timeout = int(cfg.get("timeout", self.timeout))
            retries = max(1, int(cfg.get("max_retries", self.max_retries)))

            if pi > 0:
                print(f"⚠️ 主 AI 不可用，切换备用配置（{pi + 1}/{len(chain)}）：{model}")

            data = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.2,
            }
            mt = cfg.get("max_tokens")
            if mt is not None and int(mt) > 0:
                data["max_tokens"] = int(mt)

            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }

            for attempt in range(retries):
                try:
                    response = requests.post(
                        f"{api_base}/chat/completions",
                        headers=headers,
                        json=data,
                        timeout=timeout,
                    )
                    if response.status_code == 200:
                        try:
                            result = response.json()
                            content = result["choices"][0]["message"]["content"]
                        except (KeyError, IndexError, TypeError) as e:
                            print(f"⚠️ API 响应结构异常: {e}")
                            break
                        parsed = self._parse_response(content)
                        if parsed is not None:
                            return parsed
                        print("⚠️ JSON 解析失败，尝试下一套 API 配置")
                        break
                    if response.status_code == 429:
                        wait_time = 2 ** attempt
                        print(f"⚠️ API速率限制，等待{wait_time}秒后重试")
                        time.sleep(wait_time)
                        continue
                    print(f"⚠️ API错误: {response.status_code} - {response.text[:200]}")
                    break
                except requests.exceptions.Timeout:
                    wait_time = 2 ** attempt
                    if attempt < retries - 1:
                        print(
                            f"⚠️ API请求超时（{timeout}秒），等待{wait_time}秒后重试 ({attempt + 1}/{retries})"
                        )
                        time.sleep(wait_time)
                        continue
                    print(f"⚠️ API请求超时（{timeout}秒），已重试{retries}次，尝试下一套配置")
                    break
                except Exception as e:
                    print(f"⚠️ API调用异常: {e}")
                    if attempt < retries - 1:
                        time.sleep(2 ** attempt)
                        continue
                    break
        n_usable = sum(
            1
            for c in chain
            if c.get("enabled") is not False and resolve_openai_compatible_auth(c)[0]
        )
        print(
            f"⚠️ 本请求已按顺序尝试 {n_usable} 套可用模型接口（链路配置 {len(chain)} 项），均未返回有效结果；"
            "若上层启用 fallback_to_keywords，将接着使用关键词/规则摘要。"
        )
        return None
    
    def _parse_response(self, response_text: str) -> Optional[Dict]:
        """解析AI返回的JSON结果，支持处理截断和不完整JSON"""
        try:
            import re
            
            # 移除可能的markdown代码块标记
            response_text = re.sub(r'```json\s*', '', response_text)
            response_text = re.sub(r'```\s*$', '', response_text, flags=re.MULTILINE)
            response_text = response_text.strip()
            
            # 尝试直接解析
            try:
                return json.loads(response_text)
            except json.JSONDecodeError as e:
                # 如果直接解析失败，尝试提取JSON部分
                json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                if json_match:
                    json_str = json_match.group()
                    
                    # 如果JSON被截断（不以}结尾），尝试修复
                    if not json_str.rstrip().endswith('}'):
                        # 统计大括号数量，尝试补全
                        open_braces = json_str.count('{')
                        close_braces = json_str.count('}')
                        missing_braces = open_braces - close_braces
                        
                        # 移除最后一个不完整的字符串字段
                        # 匹配最后一个未闭合的字符串字段
                        json_str = re.sub(r',\s*"[^"]*":\s*"[^"]*$', '', json_str, flags=re.MULTILINE)
                        json_str = re.sub(r',\s*"[^"]*":\s*"[^"]*[^"]$', '', json_str, flags=re.MULTILINE)
                        
                        # 移除最后一个不完整的数组或对象
                        json_str = re.sub(r',\s*"[^"]*":\s*\[[^\]]*$', '', json_str, flags=re.MULTILINE)
                        json_str = re.sub(r',\s*"[^"]*":\s*\{[^}]*$', '', json_str, flags=re.MULTILINE)
                        
                        # 补全缺失的大括号
                        json_str = json_str.rstrip().rstrip(',')
                        json_str += '\n' + '}' * missing_braces
                    
                    try:
                        return json.loads(json_str)
                    except json.JSONDecodeError:
                        # 如果还是失败，尝试更激进的修复
                        # 移除所有未闭合的字符串
                        json_str = re.sub(r':\s*"[^"]*$', ': ""', json_str, flags=re.MULTILINE)
                        json_str = re.sub(r':\s*"[^"]*[^"]$', ': ""', json_str, flags=re.MULTILINE)
                        # 确保以}结尾
                        if not json_str.rstrip().endswith('}'):
                            json_str = json_str.rstrip().rstrip(',') + '\n}'
                        
                        try:
                            return json.loads(json_str)
                        except:
                            pass
                
                # 如果都失败了，记录详细错误信息
                print(f"⚠️ 解析AI响应失败: {e}")
                print(f"错误位置: line {e.lineno}, column {e.colno}")
                print(f"响应内容前800字符:\n{response_text[:800]}")
                if len(response_text) > 800:
                    print(f"响应内容后800字符:\n{response_text[-800:]}")
                return None
        except Exception as e:
            print(f"⚠️ 解析AI响应时发生异常: {e}")
            print(f"响应内容长度: {len(response_text)}")
            return None


class DailyAIAnalyzer:
    """每日AI分析器 - AI新闻专用"""
    def __init__(self):
        self.ai_analyzer = AIAnalyzer()
        self.current_dir = os.path.dirname(os.path.abspath(__file__))
        self.history_dir = os.path.join(self.current_dir, 'news_history')
        self.analysis_dir = os.path.join(self.current_dir, 'daily_analysis')
        os.makedirs(self.history_dir, exist_ok=True)
        os.makedirs(self.analysis_dir, exist_ok=True)
        
        # 数据库路径
        self.db_path = os.path.join(self.current_dir, 'push_logs.db')
    
    def load_daily_news_from_db(self, date_str: str) -> List[Dict]:
        """从数据库加载指定日期的新闻"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 查询指定日期的新闻
            cursor.execute('''
                SELECT source, title, content, push_time, category, url
                FROM push_records
                WHERE push_date = ?
                ORDER BY push_time DESC
            ''', (date_str,))
            
            rows = cursor.fetchall()
            conn.close()
            
            news_list = []
            for row in rows:
                news_list.append({
                    'source': row[0] or '',
                    'title': row[1] or '',
                    'content': row[2] or '',
                    'time': row[3] or '',
                    'category': row[4] or '',
                    'url': row[5] or '',
                    'importance_score': 50  # 默认重要性分数
                })
            
            return news_list
        except Exception as e:
            print(f"⚠️ 从数据库加载新闻失败: {e}")
            return []
    
    @staticmethod
    def _stub_executive_lens_vertical(sentiment_score: int, domain_cn: str) -> List[Dict]:
        if sentiment_score >= 60:
            st, hint = '偏多', '行业热度偏高，注意估值与政策节奏'
        elif sentiment_score <= 40:
            st, hint = '偏空', '负面叙事增多，关注现金流与合规'
        else:
            st, hint = '中性', '信号混杂，宜跟踪龙头与监管动向'
        return [
            {'role': 'CEO', 'stance': st, 'summary': f'【{domain_cn}·占位】当日新闻统计倾向{st}；完整高管推演请使用 AI 分析。', 'key_concern': hint},
            {'role': 'CFO', 'stance': st, 'summary': f'【{domain_cn}·占位】关注研发投入与商业化节奏。', 'key_concern': '投入产出与回款'},
            {'role': 'CTO', 'stance': '中性', 'summary': f'【{domain_cn}·占位】技术与安全需结合具体报道。', 'key_concern': '基础设施与数据'},
            {'role': 'CRO', 'stance': '中性', 'summary': f'【{domain_cn}·占位】合规与知识产权风险需个案核对。', 'key_concern': '政策与诉讼'},
        ]
    
    def analyze_daily_news(self, date_str: Optional[str] = None) -> Optional[Dict]:
        """分析指定日期的新闻"""
        if date_str is None:
            date_str = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
        
        # 从数据库加载新闻
        daily_news = self.load_daily_news_from_db(date_str)
        
        if not daily_news:
            print(f"📅 {date_str} 没有新闻数据")
            return None
        
        print(f"📊 开始分析 {date_str} 的 {len(daily_news)} 条AI新闻...")
        
        # 如果AI未启用，使用关键词匹配生成摘要
        if not self.ai_analyzer.enabled:
            print(f"⚠️ AI分析未启用")
            if self.ai_analyzer.fallback_to_keywords:
                print("🤖 AI未启用，使用关键词匹配生成摘要")
                notify_ai_fallback("AI新闻", date_str, "AI未启用")
                return self._generate_keyword_summary(date_str, daily_news)
            else:
                print("⚠️ AI未启用且未配置降级处理")
                return None
        
        # 如果新闻太多，分批处理
        if len(daily_news) > self.ai_analyzer.max_news_per_batch:
            print(f"⚠️ 新闻数量({len(daily_news)})超过限制({self.ai_analyzer.max_news_per_batch})，将分批处理")
            result = self._analyze_in_batches(date_str, daily_news)
            if not result and self.ai_analyzer.fallback_to_keywords:
                print("⚠️ 各批均已轮询全部模型接口仍失败，启用关键词/规则摘要…")
                notify_ai_fallback("AI新闻", date_str, "分批分析失败")
                return self._generate_keyword_summary(date_str, daily_news)
            return result
        
        # 正常批量分析
        result = self._analyze_single_batch(date_str, daily_news)
        if not result and self.ai_analyzer.fallback_to_keywords:
            print("⚠️ 全部模型接口尝试完毕仍失败，启用关键词/规则摘要…")
            notify_ai_fallback("AI新闻", date_str, "AI分析失败")
            return self._generate_keyword_summary(date_str, daily_news)
        return result
    
    def _analyze_single_batch(self, date_str: str, daily_news: List[Dict]) -> Optional[Dict]:
        """单批次分析"""
        # 构建批量分析提示词
        news_summary = []
        for i, news in enumerate(daily_news[:self.ai_analyzer.max_news_per_batch], 1):
            title = news.get('title', '')[:200]
            source = news.get('source', '')
            time_str = news.get('time', '')
            content = news.get('content', '')[:300]  # 限制内容长度
            news_info = f"{i}. [{source}] [{time_str}] {title}"
            if content:
                news_info += f"\n   内容: {content}"
            news_summary.append(news_info)
        
        prompt = f"""请对{date_str}的AI技术新闻进行深度分析。以下是{len(daily_news)}条新闻的详细信息：

新闻列表：
{chr(10).join(news_summary)}

请进行以下分析（必须基于新闻事实，给出确定性结论）：

【1. 核心摘要】（最重要！）
用一句话（50字以内）总结今天AI领域最重要的变化和整体情况。例如："OpenAI发布GPT-5，性能提升显著，引发行业关注"。

【2. 技术发展热度】
- 整体热度：积极/消极/中性（三选一）
- 热度评分：0-100分（50为中性，>50表示技术发展活跃，<50表示发展放缓）
- 热度强度：强/中/弱（三选一）

【3. 重要新闻TOP5】（只选最重要的5条）
按重要性排序，每条包含：
- 标题（完整）
- 来源
- 重要性评分（0-100）
- 一句话影响说明（30字以内，说明这条新闻为什么重要，对AI行业意味着什么）
- 影响时间：短期1-3天/中期1周/长期1月以上

【4. 关键洞察】（最重要！）
用2-3句话（每句不超过50字）说明：
- 今天最重要的变化意味着什么？
- 对AI行业未来发展的影响是什么？
- 有什么值得特别关注的趋势？

【5. 需要关注】
列出未来1-2周内可能发生的重要技术事件或产品发布（最多3条）

【6. SWOT分析】（基于今日新闻）
从技术发展角度进行SWOT分析：
- Strengths（优势）：今日展现出的技术优势、创新突破、资源投入等（2-3条，每条30字以内）
- Weaknesses（劣势）：技术瓶颈、资源不足、竞争劣势等（2-3条，每条30字以内）
- Opportunities（机会）：新技术趋势、市场机会、政策支持等（2-3条，每条30字以内）
- Threats（威胁）：技术风险、竞争威胁、政策风险等（2-3条，每条30字以内）

【7. 高管视角（模拟推演）】
基于今日 AI 行业新闻，模拟 CEO（产品与市场战略）/ CFO（投入产出与商业化）/ CTO（技术与安全、基础设施）/ CRO（合规、知识产权与政策风险）各自解读。虚构推演，非投资建议。role 只能是 CEO、CFO、CTO、CRO；stance 只能是 偏多、偏空、中性、观望；summary 合计≤120字；key_concern≤40字；禁止具体交易指令。

请严格按照以下JSON格式返回（所有字段必须填写，不得遗漏，确保JSON完整闭合）：

{{
    "date": "{date_str}",
    "total_news": {len(daily_news)},
    "core_summary": "一句话总结今天AI领域最重要的变化（50字以内）",
    "overall_sentiment": "积极",
    "sentiment_score": 65,
    "sentiment_intensity": "中",
    "key_insights": [
        "第一句关键洞察：说明今天最重要的变化意味着什么（50字以内）",
        "第二句关键洞察：对AI行业未来发展的影响（50字以内）",
        "第三句关键洞察：值得特别关注的趋势（50字以内，可选）"
    ],
    "top_news": [
        {{
            "title": "完整新闻标题",
            "source": "来源",
            "importance": 95,
            "impact_summary": "一句话说明为什么重要，对AI行业意味着什么（30字以内）",
            "impact_timespan": "短期1-3天"
        }}
    ],
    "things_to_watch": [
        "未来1-2周内可能发生的重要技术事件或产品发布（最多3条）"
    ],
    "swot_analysis": {{
        "strengths": [
            "技术优势1（30字以内）",
            "技术优势2（30字以内）"
        ],
        "weaknesses": [
            "技术劣势1（30字以内）",
            "技术劣势2（30字以内）"
        ],
        "opportunities": [
            "发展机会1（30字以内）",
            "发展机会2（30字以内）"
        ],
        "threats": [
            "潜在威胁1（30字以内）",
            "潜在威胁2（30字以内）"
        ]
    }},
    "executive_lens": [
        {{"role": "CEO", "stance": "中性", "summary": "2-3句话，120字以内", "key_concern": "40字以内"}},
        {{"role": "CFO", "stance": "中性", "summary": "2-3句话，120字以内", "key_concern": "40字以内"}},
        {{"role": "CTO", "stance": "中性", "summary": "2-3句话，120字以内", "key_concern": "40字以内"}},
        {{"role": "CRO", "stance": "中性", "summary": "2-3句话，120字以内", "key_concern": "40字以内"}}
    ]
}}

**关键要求：**
1. 必须返回完整、有效的JSON格式，所有大括号和引号必须正确闭合
2. 所有选择项必须从给定的选项中明确选择，不得使用其他词汇
3. 所有数值必须是具体数字，不得使用"约"、"左右"等模糊表述
4. 所有分析必须基于新闻内容，不得臆测
5. 如果信息不足，填写"数据不足"，不要猜测
6. **确保JSON以 }} 结尾，所有字符串字段必须用双引号闭合**
7. 如果内容较长，请确保在描述字段中适当截断，但必须保证JSON结构完整；优先保证 date、core_summary、overall_sentiment、sentiment_score、key_insights、top_news、swot_analysis、executive_lens 完整
8. key_insights 每条字符串在结论后追加一小句，格式「若被证伪：……（一条可观察的反证现象或数据）」；无法写出则「若被证伪：数据不足」。"""
        
        # 调用AI分析
        ai_result = self.ai_analyzer.batch_analyze(prompt)
        
        if ai_result:
            return self._save_analysis_result(date_str, daily_news, ai_result, 'ai')
        
        return None
    
    def _analyze_in_batches(self, date_str: str, daily_news: List[Dict]) -> Optional[Dict]:
        """分批分析（新闻太多时）"""
        batch_size = self.ai_analyzer.batch_size
        batches = [daily_news[i:i+batch_size] for i in range(0, len(daily_news), batch_size)]
        
        print(f"📦 将 {len(daily_news)} 条新闻分成 {len(batches)} 批处理（每批{batch_size}条）")
        
        batch_results = []
        for i, batch in enumerate(batches, 1):
            print(f"📊 处理第 {i}/{len(batches)} 批 ({len(batch)}条新闻)...")
            try:
                result = self._analyze_single_batch(date_str, batch)
                if result:
                    batch_results.append(result)
                    print(f"✅ 第 {i} 批分析成功")
                else:
                    print(f"⚠️ 第 {i} 批分析失败")
            except Exception as e:
                print(f"❌ 第 {i} 批分析异常: {e}")
            
            # 批次间等待，避免API速率限制
            if i < len(batches):
                wait_time = min(3, 1 + (i * 0.5))  # 逐渐增加等待时间
                time.sleep(wait_time)
        
        if not batch_results:
            print(f"⚠️ 共 {len(batches)} 批、每批已轮询全部模型接口仍均失败")
            return None
        
        # 合并批次结果
        if batch_results:
            return self._merge_batch_results(date_str, daily_news, batch_results)
        
        return None
    
    def _merge_batch_results(self, date_str: str, daily_news: List[Dict], batch_results: List[Dict]) -> Dict:
        """合并批次分析结果"""
        print(f"🔄 开始合并 {len(batch_results)} 批分析结果...")
        
        # 合并所有批次的top_news
        all_top_news = []
        for result in batch_results:
            analysis = result.get('analysis', {})
            top_news = analysis.get('top_news', [])
            if isinstance(top_news, list):
                all_top_news.extend(top_news)
        
        # 按重要性排序，去重，取TOP10
        seen_titles = set()
        unique_top_news = []
        for news in sorted(all_top_news, key=lambda x: x.get('importance', 0), reverse=True):
            title = news.get('title', '')[:50]
            if title not in seen_titles:
                seen_titles.add(title)
                unique_top_news.append(news)
                if len(unique_top_news) >= 10:
                    break
        
        # 计算平均情绪分数
        sentiment_scores = []
        for result in batch_results:
            analysis = result.get('analysis', {})
            score = analysis.get('sentiment_score', 50)
            if isinstance(score, (int, float)):
                sentiment_scores.append(score)
        avg_sentiment_score = sum(sentiment_scores) / len(sentiment_scores) if sentiment_scores else 50
        
        # 合并核心摘要和关键洞察（取第一个批次的，或合并）
        core_summaries = []
        all_key_insights = []
        all_things_to_watch = []
        for result in batch_results:
            analysis = result.get('analysis', {})
            if analysis.get('core_summary'):
                core_summaries.append(analysis.get('core_summary'))
            if analysis.get('key_insights'):
                all_key_insights.extend(analysis.get('key_insights', []))
            if analysis.get('things_to_watch'):
                all_things_to_watch.extend(analysis.get('things_to_watch', []))
        
        # 去重并限制数量
        unique_key_insights = []
        seen_insights = set()
        for insight in all_key_insights:
            if insight and insight not in seen_insights:
                seen_insights.add(insight)
                unique_key_insights.append(insight)
                if len(unique_key_insights) >= 3:
                    break
        
        unique_things_to_watch = []
        seen_watch = set()
        for item in all_things_to_watch:
            if item and item not in seen_watch:
                seen_watch.add(item)
                unique_things_to_watch.append(item)
                if len(unique_things_to_watch) >= 3:
                    break
        
        merged_executive_lens = []
        for result in batch_results:
            analysis = result.get('analysis', {})
            el = analysis.get('executive_lens')
            if isinstance(el, list) and len(el) >= 4:
                merged_executive_lens = el
                break
            if isinstance(el, list) and el and not merged_executive_lens:
                merged_executive_lens = el
        
        merged_analysis = {
            'date': date_str,
            'total_news': len(daily_news),
            'core_summary': core_summaries[0] if core_summaries else f'AI领域今日整体发展活跃，共{len(daily_news)}条重要新闻',
            'overall_sentiment': '积极' if avg_sentiment_score >= 60 else '消极' if avg_sentiment_score <= 40 else '中性',
            'sentiment_score': int(avg_sentiment_score),
            'sentiment_intensity': '中',
            'sentiment_trend': '持平',
            'key_insights': unique_key_insights if unique_key_insights else [
                f'AI技术发展热度评分{int(avg_sentiment_score)}分，处于{"积极" if avg_sentiment_score >= 60 else "消极" if avg_sentiment_score <= 40 else "中性"}状态',
                f'今日共{len(unique_top_news)}条重要新闻，涵盖模型发展、产品发布、公司动态等多个领域',
                '建议持续关注AI技术发展趋势和行业政策变化'
            ],
            'top_news': unique_top_news[:5],  # 只保留TOP5
            'things_to_watch': unique_things_to_watch if unique_things_to_watch else [],
            'executive_lens': merged_executive_lens if merged_executive_lens else DailyAIAnalyzer._stub_executive_lens_vertical(int(avg_sentiment_score), 'AI行业'),
            'batch_count': len(batch_results),
            'merge_note': f'由{len(batch_results)}批分析结果合并而成'
        }
        
        print(f"✅ 合并完成，共 {len(unique_top_news)} 条重要新闻，平均热度分数: {avg_sentiment_score:.0f}")
        return self._save_analysis_result(date_str, daily_news, merged_analysis, 'ai_batch')
    
    def _generate_keyword_summary(self, date_str: str, daily_news: List[Dict]) -> Dict:
        """使用关键词匹配生成摘要（AI未启用时）"""
        # 统计分类
        all_categories = []
        for news in daily_news:
            category = news.get('category', '')
            if category:
                all_categories.append(category)
        category_counter = Counter(all_categories)
        main_topics = [cat for cat, count in category_counter.most_common(5)]
        
        # 计算情绪分数（基于关键词）
        sentiment_score = 50
        positive_keywords = ['突破', '创新', '发布', '升级', '优化', '增长']
        negative_keywords = ['问题', '漏洞', '故障', '下降', '风险']
        
        positive_count = sum(1 for n in daily_news 
                            if any(kw in n.get('title', '') + n.get('content', '') for kw in positive_keywords))
        negative_count = sum(1 for n in daily_news 
                            if any(kw in n.get('title', '') + n.get('content', '') for kw in negative_keywords))
        
        if positive_count > negative_count:
            sentiment_score = 50 + min(30, (positive_count - negative_count) * 5)
        elif negative_count > positive_count:
            sentiment_score = 50 - min(30, (negative_count - positive_count) * 5)
        
        # 生成TOP新闻
        sorted_news = sorted(daily_news, key=lambda x: len(x.get('title', '')), reverse=True)
        top_news = []
        for news in sorted_news[:10]:
            top_news.append({
                'title': news.get('title', '')[:100],
                'importance': 50,
                'impact_analysis': f"来源: {news.get('source', '')}",
                'source': news.get('source', ''),
                'impact_timespan': '中期1周',
                'confidence': '中'
            })
        
        # 生成核心摘要
        core_summary = f'AI领域今日{"积极" if sentiment_score >= 60 else "消极" if sentiment_score <= 40 else "中性"}发展，共{len(daily_news)}条新闻，主要关注{", ".join(main_topics[:3]) if main_topics else "技术创新"}等领域'
        
        analysis = {
            'date': date_str,
            'total_news': len(daily_news),
            'core_summary': core_summary,
            'overall_sentiment': '积极' if sentiment_score >= 60 else '消极' if sentiment_score <= 40 else '中性',
            'sentiment_score': sentiment_score,
            'sentiment_intensity': '强' if abs(sentiment_score - 50) > 30 else '中' if abs(sentiment_score - 50) > 15 else '弱',
            'key_insights': [
                f'AI技术发展热度评分{sentiment_score}分，处于{"积极" if sentiment_score >= 60 else "消极" if sentiment_score <= 40 else "中性"}状态',
                f'主要关注领域：{", ".join(main_topics[:3]) if main_topics else "技术创新"}',
                '建议持续关注AI技术发展趋势和行业政策变化'
            ],
            'main_topics': main_topics,
            'top_news': top_news[:5],  # 只保留TOP5
            'things_to_watch': [],
            'executive_lens': DailyAIAnalyzer._stub_executive_lens_vertical(sentiment_score, 'AI行业'),
        }
        
        return self._save_analysis_result(date_str, daily_news, analysis, 'keyword')
    
    def _save_analysis_result(self, date_str: str, daily_news: List[Dict], analysis: Dict, method: str) -> Dict:
        """保存分析结果"""
        analysis_file = os.path.join(self.analysis_dir, f'analysis_{date_str}.json')
        analysis_data = {
            'date': date_str,
            'news_count': len(daily_news),
            'analysis': analysis,
            'analyzed_at': datetime.now().isoformat(),
            'analysis_method': method,
            'news_sources': list(set(n.get('source', '') for n in daily_news))
        }
        
        with open(analysis_file, 'w', encoding='utf-8') as f:
            json.dump(analysis_data, f, ensure_ascii=False, indent=2)
        
        print(f"✅ 分析完成，结果已保存到 {analysis_file} (方法: {method})")
        return analysis_data
