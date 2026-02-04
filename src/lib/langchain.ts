import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { OLLAMA_CONFIG, type OllamaConfig } from '../types';
import { UserSchema, type User } from '../schemas/zod';

// 流式响应块类型
export interface StreamChunk {
  type: 'thinking' | 'content';
  content: string;
}

// 当前使用的配置（支持动态更新）
let currentConfig: OllamaConfig = OLLAMA_CONFIG;
let ollamaInstance: ChatOllama | null = null;

/**
 * 更新配置并重建 Ollama 实例
 */
export const updateOllamaConfig = (config: OllamaConfig) => {
  currentConfig = config;
  ollamaInstance = null; // 清除旧实例
};

/**
 * 获取 Ollama 实例（单例模式）
 */
const getOllamaInstance = (): ChatOllama => {
  if (!ollamaInstance) {
    ollamaInstance = new ChatOllama({
      baseUrl: currentConfig.baseUrl,
      model: currentConfig.model,
      temperature: currentConfig.temperature,
      think: currentConfig.showThinking,
    });
  }
  return ollamaInstance;
};

/**
 * 将 chunk.content 转换为字符串
 * LangChain 的 content 可能是 string 或数组
 */
const getContentAsString = (content: unknown): string => {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map(item => {
        if (typeof item === 'string') {
          return item;
        }
        if (item && typeof item === 'object' && 'text' in item) {
          return String((item as { text: string }).text);
        }
        return '';
      })
      .join('');
  }
  return String(content || '');
};

/**
 * 解析 Ollama 原生流式响应格式
 * 支持 message.thinking、additional_kwargs.reasoning_content 和 message.content 分离
 */
const parseStreamChunk = (chunk: { content: unknown; additional_kwargs?: unknown }): StreamChunk[] => {
  const results: StreamChunk[] = [];
  const chunkContent = getContentAsString(chunk.content);

  // 1. 首先检查 additional_kwargs 中的 reasoning_content（LangChain 格式）
  if (chunk.additional_kwargs && typeof chunk.additional_kwargs === 'object') {
    const kwargs = chunk.additional_kwargs as { reasoning_content?: string };
    if (kwargs.reasoning_content) {
      results.push({ type: 'thinking', content: kwargs.reasoning_content });
    }
  }

  // 2. 尝试解析 content 为 JSON（Ollama 原生格式）
  if (chunkContent) {
    try {
      const parsed = JSON.parse(chunkContent);

      if (parsed.message) {
        if (parsed.message.thinking) {
          results.push({ type: 'thinking', content: parsed.message.thinking });
        }
        if (parsed.message.content) {
          results.push({ type: 'content', content: parsed.message.content });
        }
      }
    } catch (e) {
      // 非 JSON 格式，作为普通 content 处理
      console.log('⚠️ [Stream Chunk] JSON 解析失败，作为普通内容处理:', e);
      if (chunkContent) {
        results.push({ type: 'content', content: chunkContent });
      }
    }
  }

  return results;
};

/**
 * 普通聊天 - 非流式
 * 使用 ollama.invoke
 */
export const sendMessage = async (
  content: string,
  systemPrompt?: string
): Promise<{ thinking?: string; content: string }> => {
  const ollama = getOllamaInstance();
  const messages = [];

  if (systemPrompt) {
    messages.push(new SystemMessage(systemPrompt));
  }
  messages.push(new HumanMessage(content));

  const response = await ollama.invoke(messages);
  const responseText = getContentAsString(response.content);

  const finalContent = responseText;

  return { thinking: undefined, content: finalContent };
};

/**
 * 普通聊天 - 流式
 * 使用 ollama.stream，支持 Ollama 原生思考模式
 */
export const chatStream = async function* (
  content: string,
  systemPrompt?: string
): AsyncGenerator<StreamChunk> {
  const messages = [];
  messages.push(new SystemMessage(systemPrompt || '你是一个AI助手'));
  messages.push(new HumanMessage(content));

  try {
    const ollama = getOllamaInstance();

    for await (const chunk of await ollama.stream(messages)) {
      const chunks = parseStreamChunk(chunk);
      for (const c of chunks) {
        yield c;
      }
    }
  } catch (error) {
    console.error('❌ [Chat Stream] 错误:', error);
    throw new Error('流式响应失败');
  }
};

/**
 * Agent 模式 - 流式提取用户信息
 * 从用户自然语言中提取结构化用户信息
 */
export const executeAgentStream = async function* (
  content: string
): AsyncGenerator<StreamChunk, { result?: User; content: string }> {
  const showThinking = currentConfig.showThinking;
  const systemPrompt = `从用户描述中提取以下信息并返回JSON格式：
- 姓名 (name)
- 年龄 (age)
- 邮箱 (email)
- 手机号 (phone)
- 地址 (address): 包含城市(city)、区县(district)、街道(street)
- 职业 (occupation)
- 兴趣爱好 (hobbies) - 数组格式

返回格式示例：

{
  "name": "张三",
  "age": 25,
  "email": "zhangsan@example.com",
  "phone": "13800138000",
  "address": {
    "city": "北京",
    "district": "朝阳区",
    "street": "建国路88号"
  },
  "occupation": "软件工程师",
  "hobbies": ["编程", "阅读", "旅行"]
}

注意：如果没有解析到值的字段，请不要返回该字段。
${showThinking ? '\n\n请先思考如何提取这些信息。' : ''}`;

  const messages = [
    new SystemMessage(systemPrompt),
    new HumanMessage(content),
  ];

  let fullText = '';
  try {
    const ollama = getOllamaInstance();

    for await (const chunk of await ollama.stream(messages)) {
      const chunks = parseStreamChunk(chunk);
      for (const c of chunks) {
        yield c;
        fullText += c.content;
      }
    }

    // 解析 JSON 结果
    const finalContent = fullText
    console.log('📄 [Agent Stream] finalContent:', finalContent);
    const jsonMatch = finalContent.match(/```json\n?([\s\S]*?)```/) || finalContent.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : finalContent;

    const userData = JSON.parse(jsonStr);

    console.log('📄 [Agent Stream] userData:', userData);

    // 使用 Zod 验证
    const validatedUser = UserSchema.parse(userData);

    return {
      result: validatedUser,
      content: '已成功提取用户信息',
    };
  } catch (error) {
    console.error('Agent 执行错误:', error);
    return {
      result: undefined,
      content: '提取用户信息失败',
    };
  }
};
