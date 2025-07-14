import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sender, ChatMessage, NewChat } from '../types';
import { AVAILABLE_MODELS, DEFAULT_MODEL_ID } from '../constants';
import { getChat, getResponse } from '@/utils/chat-helpers';
import { useOutletContext, useParams } from 'react-router-dom';

interface LayoutContext {
  handleNewChatCreated: (chat: NewChat) => void;
}

const ChatInterface: React.FC = () => {
  const { id } = useParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);
  const [isLoading, setIsLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null | undefined>(null);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const { handleNewChatCreated } = useOutletContext<LayoutContext>();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const onIdChange = async () => {
      setChatId(id);
      if (id) {
        const chat = await getChat(id);
        setMessages(chat.messages || []);
        setSelectedModel(chat.model || DEFAULT_MODEL_ID);
      }
    };
    onIdChange();
  }, [id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const userText = inputValue.trim();
    const userMessage: ChatMessage = {
      _id: Date.now().toString() + '_user',
      text: userText,
      sender: Sender.USER,
      timestamp: Date.now(),
    };

    const aiId = Date.now().toString() + '_ai';
    const placeholder: ChatMessage = {
      _id: aiId,
      text: '',
      sender: Sender.AI,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage, placeholder]);
    setInputValue('');
    setIsLoading(true);
    setIsGeneratingResponse(true);

    try {

      const response = await getResponse(userMessage, chatId, selectedModel);

      if (response.newChatId) {
        setChatId(response.newChatId);
        const newChat: NewChat =  {
          _id: response.newChatId,
          title: response.newChatTitle as string,
        }
        handleNewChatCreated(newChat);
      }

      setMessages(prev => prev.map(msg => msg._id === aiId ? { ...msg, text: response.response.text } : msg));

    } catch (error: any) {
      console.error('Error al generar respuesta:', error);
      setMessages(prev => prev.map(msg => msg._id === aiId ? { ...msg, text: 'Error al generar respuesta.', isError: true } : msg));
    } finally {
      inputRef.current?.focus();
      setIsLoading(false);
      setIsGeneratingResponse(false);
    }
  }, [inputValue, isLoading, messages, selectedModel]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.sender == Sender.AI && !isLoading && !isGeneratingResponse) {
      // Delay para garantizar que el input este montado
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [messages, isLoading, isGeneratingResponse]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedModel(e.target.value);
  };

  return (
    <div className="flex justify-center items-center h-screen p-0 sm:p-4 bg-slate-100 dark:bg-slate-900">
      <div className="flex flex-col h-full w-full max-w-3xl bg-white dark:bg-slate-800 shadow-xl rounded-none sm:rounded-lg overflow-hidden">
        <header className="bg-slate-50 dark:bg-slate-900/70 backdrop-blur-sm p-3 sm:p-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-800 dark:text-slate-100">Zafirosoft Chat</h1>
          <select
            value={selectedModel}
            onChange={handleModelChange}
            disabled={typeof chatId === 'string'}
            className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-xs sm:text-sm rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 p-2"
          >
            {AVAILABLE_MODELS.map(model => (
              <option key={model.id} value={model.id}>{model.name}</option>
            ))}
          </select>
        </header>

        <div className="flex-grow p-3 sm:p-4 space-y-4 overflow-y-auto">
          {messages.map(msg => (
            <div key={msg._id} className={`flex ${msg.sender === Sender.USER ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] sm:max-w-[75%] py-2 px-3.5 shadow-sm break-words rounded-xl ${
                msg.sender === Sender.USER ?
                  'bg-blue-500 text-white rounded-br-md' :
                  msg.isError ?
                    'bg-red-100 dark:bg-red-800/50 text-red-700 dark:text-red-300 rounded-bl-md border border-red-300 dark:border-red-600' :
                    'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-md'
              }`}>
                <div>
                  <p className="text-sm whitespace-pre-wrap">
                    {isLoading && msg._id.endsWith('_ai') && msg.text === '' ? (
                      <span className="italic opacity-70 flex items-center gap-2">
                        Pensando...
                        <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full"></span>
                      </span>
                    ) : (
                      msg.text
                    )}
                  </p>
                  <p className={`text-xs mt-1.5 opacity-60 ${msg.sender === Sender.USER ? 'text-right' : 'text-left'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-end space-x-2 sm:space-x-3">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Envía un mensaje..."
              className="flex-grow p-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-shadow duration-150 focus:shadow-md resize-none"
              disabled={isLoading}
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              style={{ minHeight: '44px', maxHeight: '120px' }}
              onInput={(e) => {
                const textarea = e.target as HTMLTextAreaElement;
                textarea.style.height = 'auto';
                textarea.style.height = `${textarea.scrollHeight}px`;
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="p-3 bg-blue-500 hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-800 text-white rounded-lg disabled:bg-slate-400 dark:disabled:bg-slate-500 disabled:cursor-not-allowed transition-all duration-150 ease-in-out transform active:scale-95 self-end"
              aria-label="Enviar mensaje"
              style={{ height: '44px' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
