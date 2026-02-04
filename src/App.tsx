import { useState, useEffect } from 'react';
import { useChat } from './hooks/useChat';
import { ChatContainer } from './components/ChatContainer';
import { ChatInput } from './components/ChatInput';
import { Sidebar } from './components/Sidebar';
import { SettingsPanel } from './components/SettingsPanel';
import { UserInfoCard } from './components/UserInfoCard';
import { OLLAMA_CONFIG, type OllamaConfig } from './types';
import { updateOllamaConfig } from './lib/langchain';
import './App.css';

function App() {
  // 状态管理
  const [enableStream, setEnableStream] = useState(true);
  const [useAgent, setUseAgent] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<OllamaConfig>(OLLAMA_CONFIG);

  // 从 localStorage 读取配置
  useEffect(() => {
    const savedConfig = localStorage.getItem('ollamaConfig');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        setCurrentConfig(config);
        // 更新 langchain 的配置
        updateOllamaConfig(config);
      } catch {
        // 解析失败，使用默认配置
      }
    }
  }, []);

  // 使用聊天 hook
  const { messages, isLoading, error, streamingResponse, streamingThinking, extractedUser, sendMessage, clearMessages } = useChat();

  // 发送消息处理
  const handleSendMessage = async (message: string) => {
    await sendMessage(message, {
      systemPrompt: systemPrompt || undefined,
      stream: enableStream,
      useAgent,
    });
  };

  // 保存配置
  const handleSaveConfig = (config: OllamaConfig) => {
    setCurrentConfig(config);
    updateOllamaConfig(config);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>AI Chat - LangChain + Ollama</h1>
        <div className="header-controls">
          <button onClick={() => setIsSettingsOpen(true)}>设置</button>
          <button onClick={clearMessages}>清空聊天</button>
        </div>
      </header>

      <Sidebar
        enableStream={enableStream}
        enableThinking={currentConfig.showThinking}
        useAgent={useAgent}
        systemPrompt={systemPrompt}
        messageCount={messages.length}
        isCollapsed={isSidebarCollapsed}
        ollamaConfig={currentConfig}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onEnableStreamChange={setEnableStream}
        onEnableThinkingChange={() => {}}
        onUseAgentChange={setUseAgent}
        onSystemPromptChange={setSystemPrompt}
      />

      <main className="chat-main">
        {/* 用户信息卡片（Agent 模式下显示） */}
        {extractedUser && <UserInfoCard user={extractedUser} />}

        {/* 聊天容器 */}
        <ChatContainer
          messages={messages}
          streamingResponse={streamingResponse}
          streamingThinking={streamingThinking}
        />

        {/* 输入框 */}
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          error={error}
        />
      </main>

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveConfig}
      />
    </div>
  );
}

export default App;
