import React, { useState, useEffect } from 'react';
import type { OllamaConfig } from '../types';
import { OLLAMA_CONFIG } from '../types';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (config: OllamaConfig) => void;
}

/**
 * 设置面板：可以查看和修改配置
 * 修改后会更新到 localStorage，页面刷新后生效
 */
export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose, onSave }) => {
  const [config, setConfig] = useState<OllamaConfig>(OLLAMA_CONFIG);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    // 从 localStorage 读取保存的配置
    const savedConfig = localStorage.getItem('ollamaConfig');
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig) as OllamaConfig;
        // 使用 setTimeout 避免在 effect 中直接调用 setState
        setTimeout(() => setConfig(parsedConfig), 0);
      } catch {
        // 解析失败，使用默认配置
      }
    }
  }, [isOpen]);

  const handleChange = (field: keyof OllamaConfig, value: string | number | boolean) => {
    setConfig(prev => {
      const newConfig = { ...prev, [field]: value };
      setHasChanges(JSON.stringify(newConfig) !== JSON.stringify(prev));
      return newConfig;
    });
  };

  const handleSave = () => {
    // 保存到 localStorage
    localStorage.setItem('ollamaConfig', JSON.stringify(config));
    onSave?.(config);
    setHasChanges(false);
    setSaveSuccess(true);

    // 显示成功提示 2 秒后关闭
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 2000);
  };

  const handleReset = () => {
    setConfig(OLLAMA_CONFIG);
    setHasChanges(false);
    localStorage.removeItem('ollamaConfig');
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay">
      <div className="settings-panel">
        <div className="settings-header">
          <h2>Ollama 配置</h2>
          <button onClick={onClose} className="close-button">&times;</button>
        </div>

        <div className="settings-content">
          <section>
            <h3>连接配置</h3>
            <label>
              Base URL
              <input
                type="text"
                value={config.baseUrl}
                onChange={(e) => handleChange('baseUrl', e.target.value)}
                placeholder="http://localhost:11434"
              />
            </label>
            <label>
              Model
              <input
                type="text"
                value={config.model}
                onChange={(e) => handleChange('model', e.target.value)}
                placeholder="qwen3:0.6b"
              />
            </label>
          </section>

          <section>
            <h3>参数配置</h3>
            <label>
              Temperature (0-2)
              <input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={config.temperature}
                onChange={(e) => handleChange('temperature', parseFloat(e.target.value) || 0)}
              />
              <small>值越低越精确，值越高越随机</small>
            </label>
            <label>
              Max Tokens
              <input
                type="number"
                min="1"
                max="8192"
                value={config.maxTokens}
                onChange={(e) => handleChange('maxTokens', parseInt(e.target.value) || 1000)}
              />
              <small>生成文本的最大长度</small>
            </label>
          </section>

          <section>
            <h3>功能开关</h3>
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={config.showThinking}
                onChange={(e) => handleChange('showThinking', e.target.checked)}
              />
              显示思考过程
            </label>
          </section>

          <section className="settings-actions">
            <button
              className="btn-reset"
              onClick={handleReset}
              disabled={!localStorage.getItem('ollamaConfig')}
            >
              重置为默认
            </button>
            <button
              className="btn-save"
              onClick={handleSave}
              disabled={!hasChanges}
            >
              {saveSuccess ? '✓ 已保存' : '保存配置'}
            </button>
          </section>

          <section className="settings-note">
            <p><strong>提示：</strong>配置保存到浏览器本地存储，刷新页面后自动应用。如需修改 .env 文件，请直接编辑项目根目录的 .env 文件并重启服务器。</p>
          </section>
        </div>
      </div>
    </div>
  );
};
