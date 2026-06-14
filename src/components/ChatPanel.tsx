import { useCallback, useRef, useEffect, useState } from 'react';
import { useStore, type ChatMessage } from '@/store/useStore';
import { sendChatMessage } from '@/utils/api';
import { Trash2, ImagePlus, X, Loader2, ArrowUp, Download } from 'lucide-react';
import { downloadText } from '@/utils/download';

export default function ChatPanel() {
  const {
    chatMessages, chatInput, chatImage,
    isChatStreaming, setChatInput, setChatImage,
    addChatMessage, updateLastAssistantMessage,
    setIsChatStreaming, clearChat,
  } = useStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = useCallback(async () => {
    const text = chatInput.trim();
    if (!text && !chatImage) return;
    if (isChatStreaming) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text || '(发送了一张图片)',
      imageUrl: chatImage ? `data:image/png;base64,${chatImage}` : undefined,
      createdAt: Date.now(),
    };
    addChatMessage(userMsg);
    setChatInput('');
    const imageToSend = chatImage;
    setChatImage(null, null);

    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
    };
    addChatMessage(assistantMsg);
    setIsChatStreaming(true);

    try {
      const messagesToSend = [...chatMessages, userMsg];
      await sendChatMessage(messagesToSend, imageToSend, (fullText) => {
        updateLastAssistantMessage(fullText);
      });
    } catch (err) {
      updateLastAssistantMessage(
        `出错了：${err instanceof Error ? err.message : '未知错误'}`
      );
    } finally {
      setIsChatStreaming(false);
    }
  }, [chatInput, chatImage, chatMessages, isChatStreaming, addChatMessage, setChatInput, setChatImage, updateLastAssistantMessage, setIsChatStreaming]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isChatStreaming) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend, isChatStreaming]);

  const handleImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const base64 = result.split(',')[1] || result;
      setChatImage(base64, file.name);
    };
    reader.readAsDataURL(file);
  }, [setChatImage]);

  const handleExportChat = useCallback(() => {
    if (chatMessages.length === 0) return;
    const lines = chatMessages.map((msg) => {
      const time = new Date(msg.createdAt).toLocaleString('zh-CN', { hour12: false });
      const name = msg.role === 'user' ? '我' : 'AI 助手';
      const content = msg.content || '(生成中...)';
      return `[${time}] ${name}\n${content}`;
    });
    const text = `工坊 · 对话记录\n导出时间：${new Date().toLocaleString('zh-CN', { hour12: false })}\n消息数：${chatMessages.length}\n\n${'─'.repeat(40)}\n\n${lines.join('\n\n')}\n`;
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const fname = `工坊-对话-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.txt`;
    downloadText(text, fname);
  }, [chatMessages]);

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[480px]">
      {/* 顶部信息条 */}
      <div className="flex items-center justify-between pb-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="w-1 h-1 rounded-full bg-umber animate-ticker" />
          <span className="label-ink">对话</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="catalogue">{String(chatMessages.length).padStart(3, '0')} 条</span>
          {chatMessages.length > 0 && (
            <>
              <button
                onClick={handleExportChat}
                className="text-paper-50/55 hover:text-paper-50 transition-colors duration-400"
                title="导出"
              >
                <Download size={12} strokeWidth={1.5} />
              </button>
              <button
                onClick={clearChat}
                className="text-paper-50/55 hover:text-umber transition-colors duration-400"
                title="清空"
              >
                <Trash2 size={12} strokeWidth={1.5} />
              </button>
            </>
          )}
        </div>
      </div>
      <div className="rule mb-6" />

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto space-y-8 pr-1">
        {chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full min-h-[340px] gap-6">
            <div className="text-center space-y-3">
              <span className="label">等待对话</span>
              <p className="font-display italic text-2xl text-paper-50">
                开始一段对话。
              </p>
              <div className="rule w-12 mx-auto" />
              <p className="text-xs text-paper-200 font-sans tracking-wide">
                支持文字与图片
              </p>
            </div>
          </div>
        )}

        {chatMessages.map((msg, idx) => {
          const isLast = idx === chatMessages.length - 1;
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`animate-fade-up ${isUser ? 'flex justify-end' : ''}`}
            >
              <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
                <div className="flex items-baseline gap-3">
                  <span className="label-ink">
                    {isUser ? '我' : 'AI 助手'}
                  </span>
                  <span className="catalogue">
                    {new Date(msg.createdAt).toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="catalogue">N°{String(idx + 1).padStart(3, '0')}</span>
                </div>
                {msg.imageUrl && (
                  <img
                    src={msg.imageUrl}
                    alt="图片"
                    className="max-w-[200px] max-h-[140px] object-cover"
                  />
                )}
                <div className={isUser ? 'bubble-user' : 'bubble-art'}>
                  {msg.content ? (
                    <span className={`text-sm leading-relaxed font-sans whitespace-pre-wrap ${
                      isChatStreaming && isLast && !isUser ? 'cursor-blink' : ''
                    }`}>
                      {msg.content}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2.5 text-paper-200/80 text-xs">
                      <span
                        className="inline-block rounded-full bg-umber"
                        style={{
                          width: 5,
                          height: 5,
                          boxShadow: '0 0 8px rgba(212, 165, 116, 0.55)',
                          animation: 'dotPulse 1.8s ease-in-out infinite',
                        }}
                      />
                      <span className="font-display italic tracking-wider">思绪正在被梳理</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="rule mt-6 mb-4" />

      {/* 输入区 */}
      <div>
        {chatImage && (
          <div className="relative inline-block mb-3 animate-fade-in">
            <img
              src={`data:image/png;base64,${chatImage}`}
              alt="待发送"
              className="h-14 object-cover"
            />
            <button
              onClick={() => setChatImage(null, null)}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-ink text-paper flex items-center justify-center hover:bg-umber transition-colors"
            >
              <X size={9} />
            </button>
          </div>
        )}

        <div className="flex items-end gap-4">
          <button
            onClick={() => document.getElementById('chat-file-input')?.click()}
            className="flex-shrink-0 text-paper-50/55 hover:text-paper-50 transition-colors duration-400"
            title="添加图片"
          >
            <ImagePlus size={14} strokeWidth={1.5} />
          </button>
          <input
            id="chat-file-input"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageFile(file);
              e.target.value = '';
            }}
            className="hidden"
          />

          <div className="flex-1 relative">
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="说点什么..."
              rows={1}
              className="w-full bg-transparent border-b border-paper-50/25 focus:border-paper-50 px-1 py-2 text-sm text-paper-50 placeholder:text-paper-50/45 placeholder:font-display placeholder:italic focus:outline-none resize-none font-sans transition-colors duration-400"
              style={{ minHeight: '36px', maxHeight: '100px' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 100) + 'px';
              }}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={isChatStreaming || (!chatInput.trim() && !chatImage)}
            className={`
              flex-shrink-0 transition-all duration-400
              ${isChatStreaming || (!chatInput.trim() && !chatImage)
                ? 'text-paper-50/40 cursor-not-allowed'
                : 'text-paper-50 hover:text-umber'
              }
            `}
          >
            {isChatStreaming ? <Loader2 size={14} className="animate-spin" /> : <ArrowUp size={14} strokeWidth={1.5} />}
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-paper-200 font-mono tracking-wider">
          <span>↵ 发送 · ⇧↵ 换行</span>
          <span className="tabular-nums">{chatInput.length}/2000</span>
        </div>
      </div>
    </div>
  );
}
