import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Chat, GroundingChunk } from "@google/genai";
import { Sender, ChatMessage, ModelOption, Chat as ChatType } from '../types';
import { AVAILABLE_MODELS, DEFAULT_MODEL_ID } from '../constants';
import { createChat, generateChatTitle, getChat, updateChatMessages } from '@/utils/chat-helpers';
import { useOutletContext, useParams } from 'react-router-dom';

interface IconProps {
  className?: string;
}

interface LayoutContext {
  handleNewChatCreated: (chat: ChatType) => void;
}

// --- Icons ---
const SendIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className || "w-6 h-6"}>
    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
  </svg>
);

const LoadingSpinner: React.FC<IconProps> = ({ className }) => (
  <svg className={`animate-spin ${className || "h-5 w-5 text-slate-500 dark:text-slate-400"}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const SunIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className || "w-6 h-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m8.66-15.66l-.707.707M4.04 19.96l-.707.707M21 12h-1M4 12H3m15.66 8.66l-.707-.707M4.04 4.04l-.707-.707m12.728 12.728A7.5 7.5 0 104.758 6.242M12 18a6 6 0 000-12V3a9 9 0 000 18z"></path>
  </svg>
);

const MoonIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className || "w-6 h-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
  </svg>
);
// --- End Icons ---

const ChatInterface: React.FC = () => {
  const { id } = useParams()
  const [isUserMessageSent, setIsUserMessageSent] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<string>('');
  const isChatResumed = useRef<boolean>(false);
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL_ID);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [aiInstance, setAiInstance] = useState<GoogleGenAI | null>(null);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [chatId, setChatId] = useState<string | null | undefined>(null);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        return true;
      }
    }
    return false;
  });
  const [ isGeneratingResponse, setIsGeneratingResponse ] = useState<boolean>(false);
  const { handleNewChatCreated } = useOutletContext<LayoutContext>();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Verifica si hay un chatId en los parámetros de la URL
    // Si hay, carga el chat correspondiente
    const onIdChange = async () => {
      setChatId(id);
      if (id && id !== undefined) {
        console.log(`Cargando chat con ID: ${id}`);
        const chat = await getChat(id);
        console.log('Creando historial...')
        const history = buildHistory(chat.messages || []);
        console.log(`Historial creado`);
        setChatHistory(history);
        setMessages(chat.messages || []);
      }
    }
    onIdChange();
    
  }, [id])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(prev => !prev);

  useEffect(() => {
    console.log("Intentando inicializar GoogleGenAI...");
    const key = process.env.API_KEY;
    if (!key) {
      console.error("Variable de entorno API_KEY no encontrada.");
      setApiKeyError("Variable de entorno API_KEY no encontrada. Favor de configurarla para utilizar el chat.");
      return;
    }
    try {
      const genAI = new GoogleGenAI({ apiKey: key });
      setAiInstance(genAI);
      setApiKeyError(null);
      console.log("GoogleGenAI inicializado exitosamente.");
    } catch (error: any) {
      console.error("Error al inicializar GoogleGenAI:", error);
      setApiKeyError(`Inicialización fallida: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, []);

  useEffect(() => {
    if (aiInstance) {
      console.log(`Intentando crear sesión de chat con el modelo: ${selectedModel}`);
      try {
        const currentModelDetails = AVAILABLE_MODELS.find(m => m.id === selectedModel);
        if (!currentModelDetails) {
          throw new Error(`No se encontraron detalles del modelo ${selectedModel}.`);
        }

        const chatConfig = {
          model: currentModelDetails.id,
        };

        const newChat = aiInstance.chats.create(chatConfig);
        setChatSession(newChat);
        console.log(`Sesión de chat creada exitosamente con ${currentModelDetails.name}.`);
        setMessages([
          {
            _id: Date.now().toString() + '_ai_greeting',
            text: `¡Hola! Estoy usando ${currentModelDetails.name}. ¿Qué puedo hacer por ti?`,
            sender: Sender.AI,
            timestamp: Date.now(),
          },
        ]);
        inputRef.current?.focus();
      } catch (error: any) {
        console.error(`Error de creación de sesión de chat para: ${selectedModel}:`, error);
        setApiKeyError(`Falló la creación del chat: ${error instanceof Error ? error.message : String(error)}`);
        setChatSession(null);
        setMessages([]);
      }
    }
  }, [aiInstance, selectedModel]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || !chatSession || isLoading) {
      if (isLoading) console.log("handleSendMessage: Aborted, already loading.");
      if (!chatSession) console.log("handleSendMessage: Aborted, no chat session.");
      return;
    }

    const userMessageText = inputValue.trim();
    const userMessage: ChatMessage = {
      _id: Date.now().toString() + '_user',
      text: userMessageText,
      sender: Sender.USER,
      timestamp: Date.now(),
    };

    const aiResponseId = Date.now().toString() + '_ai_stream';
    const aiPlaceholderMessage: ChatMessage = {
      _id: aiResponseId,
      text: '',
      sender: Sender.AI,
      timestamp: Date.now(),
    };

    setIsUserMessageSent(true);
    setMessages(prev => [...prev, userMessage, aiPlaceholderMessage]);
    setInputValue('');
    setIsLoading(true);
    console.log(`[${new Date().toISOString()}] handleSendMessage: START for AI response ${aiResponseId}. isLoading SET to true.`);
    inputRef.current?.focus();

    let streamFullyProcessed = false;

    try {
      setIsGeneratingResponse(true);
      console.log(`[${new Date().toISOString()}] handleSendMessage: Calling sendMessageStream for ${aiResponseId}`);
      // Llamada al stream de mensajes. Esta función retorna un stream iterable
      let messageToSend = ''
      if (!isChatResumed.current) {
        messageToSend = `Basado en este historial de chat contigo (IA), responde a mi mensaje: "${userMessageText}"\n\n${chatHistory}`;
        isChatResumed.current = true; // Marcar que ya se ha iniciado el chat
      } else {
        messageToSend = userMessageText
      }
      const stream = await chatSession.sendMessageStream({ message: messageToSend });
      console.log(`[${new Date().toISOString()}] handleSendMessage: sendMessageStream call returned, starting iteration for ${aiResponseId}`);
      
      let accumulatedAiText = "";
      let groundingChunks: GroundingChunk[] = [];

      // Se itera el stream para ir acumulando el texto de la respuesta AI
      for await (const chunk of stream) {
        const chunkText = chunk.text;
        if (chunkText) {
          accumulatedAiText += chunkText;
        }
        if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
          groundingChunks = chunk.candidates[0].groundingMetadata.groundingChunks;
        }
        
        // Actualizar el mensaje AI en tiempo real
        setMessages(prev =>
          prev.map(msg =>
            msg._id === aiResponseId ? { 
              ...msg, 
              text: accumulatedAiText, 
              groundingChunks: groundingChunks.length > 0 ? groundingChunks : undefined 
            } : msg
          )
        );
      }
      // Se terminó de procesar el stream
      setIsGeneratingResponse(false);
      streamFullyProcessed = true;
      console.log(`[${new Date().toISOString()}] handleSendMessage: Stream loop FINISHED for ${aiResponseId}. Accumulated text: "${accumulatedAiText.substring(0,100)}..."`);

      // Actualización final si el texto está vacío pero hay chunks de grounding
      if (!accumulatedAiText && groundingChunks.length > 0) {
        console.log(`[${new Date().toISOString()}] handleSendMessage: No accumulated text but grounding chunks exist for ${aiResponseId}. Setting default text.`);
        setMessages(prev =>
          prev.map(msg =>
            msg._id === aiResponseId ? { ...msg, text: "Aquí está lo que encontré:", groundingChunks } : msg
          )
        );
      }
      
    } catch (error: any) {
      streamFullyProcessed = true; // Se marca como procesado aunque haya error
      setIsGeneratingResponse(false);
      console.error(`[${new Date().toISOString()}] handleSendMessage: ERROR during stream for ${aiResponseId}:`, error);
      const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido al procesar la respuesta.";
      setMessages(prev =>
        prev.map(msg =>
          msg._id === aiResponseId ? { ...msg, text: `Lo siento, ocurrió un error: ${errorMessage}`, isError: true } : msg
        )
      );
    } finally {
      console.log(`[${new Date().toISOString()}] handleSendMessage: FINALLY for ${aiResponseId}. Stream fully processed: ${streamFullyProcessed}. Current isLoading state: ${isLoading}`);
      setIsLoading(false);
      console.log(`[${new Date().toISOString()}] handleSendMessage: isLoading SET to false for ${aiResponseId}.`);
      inputRef.current?.focus();
    }
  }, [inputValue, chatSession, isLoading]); // Removed setMessages, setIsLoading from deps as they are stable

  useEffect(() => {

    const saveChat = async () => {
      
      if (!isGeneratingResponse && isUserMessageSent) {
        // Verificar si son los primeros mensajes y si
        // no hay chatId (nuevo chat)
        if (messages.length === 3 && !chatId) {
          // Generar título del chat
          let title = await generateChatTitle(messages);
          // Guardar chat en la BD
          const newChat = await createChat(title, messages, selectedModel);
          setChatId(newChat._id);
          // Llama a esta función de Layout.tsx para agregar el nuevo chat a la lista de chats
          // y cambiar la URL a /chat/{newChat._id}
          handleNewChatCreated(newChat);
        } else if (messages.length > 3 && chatId) {
  
          // Obtener el ultimo par de mensajes
          const lastPair = messages.slice(-2);
          try {
            await updateChatMessages(chatId, lastPair);
            console.log('Chat actualizado.');
          } catch (error) {
            console.error('Error al actualizar el chat:', error);
          }
          
        }

        setIsUserMessageSent(false);

      }
      
    };
      
    saveChat();
    
  }, [messages, isUserMessageSent])

  const handleModelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedModel(event.target.value);
  };

  const buildHistory = (messages: ChatMessage[]) => {
    let history = "";
    messages.forEach((msg) => {
      if (msg.sender === Sender.USER) {
        history += `Usuario: ${msg.text}\n`;
      } else if (msg.sender === Sender.AI) {
        history += `AI: ${msg.text}\n`;
      }
    });
    return history;
  }

  if (apiKeyError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <div className="max-w-md w-full bg-red-100 dark:bg-red-900 border-l-4 border-red-500 dark:border-red-700 text-red-700 dark:text-red-200 p-6 rounded-md shadow-lg" role="alert">
          <p className="font-bold text-xl mb-2">Error de configuración</p>
          <p>{apiKeyError}</p>
          <p className="mt-4 text-sm">Por favor, asegúrese de que API_KEY esté definida en las variables del entorno.</p>
        </div>
      </div>
    );
  }

  if (!aiInstance || !chatSession) { // Also check for chatSession before rendering main UI
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <LoadingSpinner className="h-12 w-12 text-blue-500" />
        <p className="text-slate-700 dark:text-slate-300 text-lg mt-4">
          {!aiInstance ? "Initializing AI Service..." : "Setting up chat session..."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-screen p-0 sm:p-4 bg-slate-100 dark:bg-slate-900">
      <div className="flex flex-col h-full w-full max-w-3xl bg-white dark:bg-slate-800 shadow-xl rounded-none sm:rounded-lg overflow-hidden">
        <header className="bg-slate-50 dark:bg-slate-900/70 backdrop-blur-sm p-3 sm:p-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-800 dark:text-slate-100">Zafirosoft Chat</h1>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <select
              value={selectedModel}
              onChange={handleModelChange}
              className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-xs sm:text-sm rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 p-2 disabled:opacity-50"
              disabled={isLoading || !chatSession}
              aria-label="Seleccione modelo deseado"
            >
              {AVAILABLE_MODELS.map((model: ModelOption) => ( // Added ModelOption type
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-800"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <SunIcon className="w-5 h-5 sm:w-6 sm:h-6"/> : <MoonIcon className="w-5 h-5 sm:w-6 sm:h-6"/>}
            </button>
          </div>
        </header>

        <div className="flex-grow p-3 sm:p-4 space-y-4 overflow-y-auto">
          {messages.map(msg => (
            <div key={msg._id} className={`flex ${msg.sender === Sender.USER ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] sm:max-w-[75%] py-2 px-3.5 shadow-sm break-words ${
                  msg.sender === Sender.USER
                    ? 'bg-blue-500 text-white rounded-xl rounded-br-md'
                    : msg.isError
                    ? 'bg-red-100 dark:bg-red-800/50 text-red-700 dark:text-red-300 rounded-xl rounded-bl-md border border-red-300 dark:border-red-600'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl rounded-bl-md'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">
                  {(msg.text === '' && msg.sender === Sender.AI && isLoading && messages.length > 0 && messages[messages.length -1]._id === msg._id) ? 
                  <span className="flex items-center"><LoadingSpinner className="h-4 w-4 mr-2"/>Pensando...</span> : 
                  msg.text}
                </p>
                {msg.groundingChunks && msg.groundingChunks.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-300 dark:border-slate-600">
                    <p className="text-xs font-semibold mb-1 opacity-80">Fuentes:</p>
                    <ul className="space-y-1">
                    {/*msg.groundingChunks.map((chunk, index) => (
                      chunk.web && chunk.web.uri && (
                        <li key={index} className="text-xs">
                          <a
                            href={chunk.web.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="opacity-70 hover:opacity-100 hover:underline truncate block"
                            title={chunk.web.title || chunk.web.uri}
                          >
                           {index + 1}. {chunk.web.title || chunk.web.uri}
                          </a>
                        </li>
                      )
                      ))*/}
                    </ul>
                  </div>
                )}
                <p className={`text-xs mt-1.5 opacity-60 ${msg.sender === Sender.USER ? 'text-right' : 'text-left'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
          {isLoading && messages.length > 0 && messages[messages.length-1]?.sender === Sender.AI && !messages[messages.length-1]?.text && (
            <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 italic mb-2 ml-1">
              <LoadingSpinner className="h-4 w-4 mr-1.5" /> Generando respuesta...
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-end space-x-2 sm:space-x-3">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={chatSession ? "Envía un mensaje..." : "Inicializando chat..."}
              className="flex-grow p-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-shadow duration-150 focus:shadow-md resize-none"
              disabled={isLoading || !chatSession}
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
              disabled={isLoading || !inputValue.trim() || !chatSession}
              className="p-3 bg-blue-500 hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-800 text-white rounded-lg disabled:bg-slate-400 dark:disabled:bg-slate-500 disabled:cursor-not-allowed transition-all duration-150 ease-in-out transform active:scale-95 self-end"
              aria-label="Send message"
              style={{ height: '44px' }}
            >
              <SendIcon className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
