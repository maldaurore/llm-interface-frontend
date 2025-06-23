// Adaptado completamente a OpenAI con el estilo visual original conservado
import React, { useState, useEffect, useRef, useCallback } from 'react';
import OpenAI from 'openai';
import { Sender, ChatMessage, ModelOption, Chat as ChatType } from '../types';
import { AVAILABLE_MODELS, DEFAULT_MODEL_ID } from '../constants';
import { createChat, generateChatTitle, getChat, updateChatMessages } from '@/utils/chat-helpers';
import { useOutletContext, useParams } from 'react-router-dom';
import { ChatCompletionMessageParam } from 'openai/resources';

interface LayoutContext {
  handleNewChatCreated: (chat: ChatType) => void;
}

const ChatInterface: React.FC = () => {
  const { id } = useParams();
  const [isUserMessageSent, setIsUserMessageSent] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [aiInstance, setAiInstance] = useState<OpenAI | null>(null);
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
      }
    };
    onIdChange();
  }, [id]);

  useEffect(() => {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      setApiKeyError('Variable de entorno OPENAI_API_KEY no encontrada.');
      return;
    }
    try {
      const openai = new OpenAI({
        apiKey: key,
        dangerouslyAllowBrowser: true,
      });
      setAiInstance(openai);
    } catch (error: any) {
      setApiKeyError(`Inicialización fallida: ${error.message || String(error)}`);
    }
  }, []);

  useEffect(() => {
    if (aiInstance) {
      const currentModel = AVAILABLE_MODELS.find(m => m.id === selectedModel);
      if (currentModel) {
        setMessages([{
          _id: Date.now().toString() + '_ai_greeting',
          text: `¡Hola! Estoy usando ${currentModel.name}. ¿Qué puedo hacer por ti?`,
          sender: Sender.AI,
          timestamp: Date.now(),
        }]);
      }
    }
  }, [aiInstance, selectedModel]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || !aiInstance || isLoading) return;

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
      const history: ChatCompletionMessageParam[] = messages.map((msg) => ({
        role: msg.sender === Sender.USER ? 'user' : 'assistant',
        content: msg.text,
      }));

      const stream = await aiInstance.chat.completions.create({
        model: selectedModel,
        messages: [...history, { role: 'user', content: userText }],
        stream: true,
      });

      let fullText = '';
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          fullText += delta;
          setMessages(prev => prev.map(msg => msg._id === aiId ? { ...msg, text: fullText } : msg));
        }
      }
    } catch (error: any) {
      setMessages(prev => prev.map(msg => msg._id === aiId ? { ...msg, text: 'Error al generar respuesta.', isError: true } : msg));
    } finally {
      setIsLoading(false);
      setIsGeneratingResponse(false);
      setIsUserMessageSent(true);
    }
  }, [inputValue, isLoading, aiInstance, messages, selectedModel]);

  useEffect(() => {
    const saveChat = async () => {
      if (!isGeneratingResponse && isUserMessageSent) {
        if (messages.length === 3 && !chatId) {
          const title = await generateChatTitle(messages);
          const newChat = await createChat(title, messages, selectedModel);
          setChatId(newChat._id);
          handleNewChatCreated(newChat);
        } else if (messages.length > 3 && chatId) {
          const lastPair = messages.slice(-2);
          await updateChatMessages(chatId, lastPair);
        }
        setIsUserMessageSent(false);
      }
    };
    saveChat();
  }, [messages, isUserMessageSent]);

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedModel(e.target.value);
  };

  if (apiKeyError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <div className="max-w-md w-full bg-red-100 dark:bg-red-900 border-l-4 border-red-500 dark:border-red-700 text-red-700 dark:text-red-200 p-6 rounded-md shadow-lg" role="alert">
          <p className="font-bold text-xl mb-2">Error de configuración</p>
          <p>{apiKeyError}</p>
          <p className="mt-4 text-sm">Por favor, asegúrese de que OPENAI_API_KEY esté definida en las variables del entorno.</p>
        </div>
      </div>
    );
  }

  if (!aiInstance) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        <p className="text-slate-700 dark:text-slate-300 text-lg mt-4">Inicializando OpenAI...</p>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-screen p-0 sm:p-4 bg-slate-100 dark:bg-slate-900">
      <div className="flex flex-col h-full w-full max-w-3xl bg-white dark:bg-slate-800 shadow-xl rounded-none sm:rounded-lg overflow-hidden">
        <header className="bg-slate-50 dark:bg-slate-900/70 backdrop-blur-sm p-3 sm:p-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-800 dark:text-slate-100">Zafirosoft Chat</h1>
          <select
            value={selectedModel}
            onChange={handleModelChange}
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
