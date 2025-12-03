/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { DanmakuFilterConfig, DanmakuFilterRule } from '@/lib/types';
import { getDanmakuFilterConfig, saveDanmakuFilterConfig } from '@/lib/db.client';

interface DanmakuFilterSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdate?: (config: DanmakuFilterConfig) => void;
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function DanmakuFilterSettings({
  isOpen,
  onClose,
  onConfigUpdate,
  onShowToast,
}: DanmakuFilterSettingsProps) {
  const [config, setConfig] = useState<DanmakuFilterConfig>({ rules: [] });
  const [newKeyword, setNewKeyword] = useState('');
  const [newType, setNewType] = useState<'normal' | 'regex'>('normal');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 加载配置
  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const loadedConfig = await getDanmakuFilterConfig();
      if (loadedConfig) {
        setConfig(loadedConfig);
      } else {
        setConfig({ rules: [] });
      }
    } catch (error) {
      console.error('加载弹幕过滤配置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 保存配置
  const handleSave = async () => {
    setSaving(true);
    try {
      await saveDanmakuFilterConfig(config);
      if (onConfigUpdate) {
        onConfigUpdate(config);
      }
      if (onShowToast) {
        onShowToast('保存成功！', 'success');
      }
      // 延迟关闭面板，让用户看到toast
      setTimeout(() => {
        onClose();
      }, 300);
    } catch (error) {
      console.error('保存弹幕过滤配置失败:', error);
      if (onShowToast) {
        onShowToast('保存失败，请重试', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  // 添加规则
  const handleAddRule = () => {
    if (!newKeyword.trim()) {
      if (onShowToast) {
        onShowToast('请输入关键字', 'info');
      }
      return;
    }

    const newRule: DanmakuFilterRule = {
      keyword: newKeyword.trim(),
      type: newType,
      enabled: true,
      id: Date.now().toString(),
    };

    setConfig((prev) => ({
      rules: [...prev.rules, newRule],
    }));

    setNewKeyword('');
  };

  // 删除规则
  const handleDeleteRule = (id: string | undefined) => {
    if (!id) return;
    setConfig((prev) => ({
      rules: prev.rules.filter((rule) => rule.id !== id),
    }));
  };

  // 切换规则启用状态
  const handleToggleRule = (id: string | undefined) => {
    if (!id) return;
    setConfig((prev) => ({
      rules: prev.rules.map((rule) =>
        rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
      ),
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">弹幕关键字屏蔽设置</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 添加规则 */}
          <div className="bg-gray-800 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-medium text-gray-300">添加屏蔽规则</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddRule()}
                placeholder="输入要屏蔽的关键字"
                className="flex-1 px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-teal-500 focus:outline-none"
              />
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as 'normal' | 'regex')}
                className="px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-teal-500 focus:outline-none"
              >
                <option value="normal">普通模式</option>
                <option value="regex">正则模式</option>
              </select>
              <button
                onClick={handleAddRule}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded transition-colors flex items-center gap-1"
              >
                <Plus size={20} />
                添加
              </button>
            </div>
            <p className="text-xs text-gray-400">
              * 普通模式：包含关键字即屏蔽 | 正则模式：支持正则表达式匹配
            </p>
          </div>

          {/* 规则列表 */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-300">
              当前规则 ({config.rules.length})
            </h3>
            {loading ? (
              <div className="text-center py-8 text-gray-400">加载中...</div>
            ) : config.rules.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                暂无屏蔽规则，点击上方添加
              </div>
            ) : (
              <div className="space-y-2">
                {config.rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="bg-gray-800 rounded-lg p-3 flex items-center gap-3"
                  >
                    {/* 启用/禁用按钮 */}
                    <button
                      onClick={() => handleToggleRule(rule.id)}
                      className="flex-shrink-0"
                    >
                      {rule.enabled ? (
                        <ToggleRight
                          size={24}
                          className="text-teal-500 hover:text-teal-400"
                        />
                      ) : (
                        <ToggleLeft
                          size={24}
                          className="text-gray-500 hover:text-gray-400"
                        />
                      )}
                    </button>

                    {/* 关键字 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono break-all ${
                            rule.enabled ? 'text-white' : 'text-gray-500'
                          }`}
                        >
                          {rule.keyword}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            rule.type === 'regex'
                              ? 'bg-purple-900/50 text-purple-300'
                              : 'bg-blue-900/50 text-blue-300'
                          }`}
                        >
                          {rule.type === 'regex' ? '正则' : '普通'}
                        </span>
                      </div>
                    </div>

                    {/* 删除按钮 */}
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="flex-shrink-0 text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex gap-2 p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
