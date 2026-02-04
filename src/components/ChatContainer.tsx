import React from 'react';
import { ChatMessage } from '../types';
import { ThinkingDisplay } from './ThinkingDisplay';

interface ChatContainerProps {
  messages: ChatMessage[];
  streamingResponse: string;
  streamingThinking: string;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({ messages, streamingResponse, streamingThinking }) => {
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingResponse, streamingThinking]);

  const renderMessageContent = (message: ChatMessage) => {
    // Assistant 消息可能包含思考过程
    if (message.role === 'assistant' && message.thinking) {
      return (
        <>
          <ThinkingDisplay thinking={message.thinking} />
          <p>{message.content}</p>
        </>
      );
    }
    return <p>{message.content}</p>;
  };

  return (
    <div className="chat-container">
      {messages.length === 0 && (
        <div className="empty-state">
          <h2>AI 智能助手</h2>
          <p>使用 Ollama + LangChain + Zod 构建的智能聊天应用</p>
        </div>
      )}

      {/* 历史消息 */}
      {messages.map((message) => (
        <div key={message.id} className={`message ${message.role}`}>
          <div className="message-content">
            <strong>{message.role === 'user' ? '用户' : '助手'}:</strong>
            {renderMessageContent(message)}
          </div>
          <span className="timestamp">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        </div>
      ))}

      {/* 流式思考过程 */}
      {streamingThinking && (
        <div className="message assistant streaming">
          <div className="message-content">
            <strong>助手:</strong>
            <ThinkingDisplay thinking={streamingThinking} isStreaming />
          </div>
        </div>
      )}

      {/* 流式内容 */}
      {streamingResponse && (
        <div className="message assistant streaming">
          <div className="message-content">
            <strong>助手:</strong>
            <p>{streamingResponse}</p>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};
