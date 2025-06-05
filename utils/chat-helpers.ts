import { GoogleGenAI, Chat } from '@google/genai';
import { ChatMessage, Sender } from '../types';
import { Chat as ChatType } from '../types';
import { getUserToken } from './tokens';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

if (!apiKey) {
  throw new Error("VITE_API_KEY no está definida en las variables de entorno");
}

const genAI = new GoogleGenAI({ apiKey });

/**
 * Genera un título breve para un chat, usando los primeros mensajes como contexto.
 * @param messages Lista de mensajes del chat, típicamente los primeros 2-4.
 * @param modelId ID del modelo a usar (por defecto Gemini Pro).
 * @returns Un string con el título sugerido.
 */
export async function generateChatTitle(
  messages: ChatMessage[],
  modelId: string = 'gemini-2.5-flash-preview-04-17'
): Promise<string> {
  const content = messages
    .map((m) => `${m.sender === Sender.USER ? 'Usuario' : 'IA'}: ${m.text}`)
    .join('\n');

  const prompt = `Dado el siguiente historial de conversación, genera un título breve (máximo 8 palabras) que represente el tema principal. No uses comillas ni signos de puntuación innecesarios:\n\n${content}`;

  try {
    const chat: Chat = genAI.chats.create({ model: modelId });
    const result = await chat.sendMessage({ message: prompt });
    const raw = result.text || '';

    // Limpiar salida innecesaria (en caso de que el modelo devuelva comillas o puntuación extra)
    const cleanTitle = raw.replace(/^["“”']+|["“”']+$/g, '').trim();

    return cleanTitle || 'Chat sin título';
  } catch (error: any) {
    console.error("Error al generar título del chat:", error);
    return 'Chat sin título';
  }
}

/**
 * Crea un nuevo chat enviando los datos al servidor.
 *
 * @param {string} title - El título del chat.
 * @param {ChatMessage[]} messages - Un array de mensajes que forman parte del chat.
 * @param {string} model - El modelo utilizado para el chat (por ejemplo, un modelo de IA).
 * @returns {Promise<ChatType>} Una promesa que resuelve con el chat creado.
 * @throws {Error} Lanza un error si la solicitud al servidor falla.
 */
export async function createChat(
  title: string,
  messages: ChatMessage[],
  model: string
): Promise<ChatType> {
  try {
    const response = await fetch(`${baseUrl}/chats/new-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await getUserToken()}`,
      },
      body: JSON.stringify({
        title,
        messages,
        model,
      }),
    });
    if (!response.ok) {
      throw new Error(`Error al guardar el chat: ${response.status} ${response.statusText}`);
    }
    const chat = await response.json();
    return chat.chat;

  } catch(e) {
    console.error("Error al guardar el chat:", e);
    throw e; // Re-lanzar error para manejarlo en el componente
  }
  
}

/**
 * Obtiene un chat específico desde el servidor utilizando su ID.
 *
 * @param {string} chatId - El ID del chat que se desea obtener.
 * @returns {Promise<ChatType>} Una promesa que resuelve con los datos del chat obtenido.
 * @throws {Error} Lanza un error si la solicitud al servidor falla.
 */
export async function getChat(chatId: string): Promise<ChatType> {
  try {
    const response = await fetch(`${baseUrl}/chats/${chatId}`, {
      headers: {
        Authorization: `Bearer ${await getUserToken()}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Error al obtener el chat: ${response.status} ${response.statusText}`);
    }
    const chat = await response.json();
    console.log("Chat obtenido:", chat);
    return chat.chat;
  } catch (e) {
    console.error("Error al obtener el chat:", e);
    throw e; // Re-lanzar error para manejarlo en el componente
  }
}

/**
 * Actualiza los mensajes de un chat específico en el servidor.
 *
 * @param {string} chatId - El ID del chat que se desea actualizar.
 * @param {ChatMessage[]} messages - Un array de mensajes que reemplazarán los mensajes actuales del chat.
 * @returns {Promise<ChatType>} Una promesa que resuelve con los datos del chat actualizado.
 * @throws {Error} Lanza un error si la solicitud al servidor falla.
 */
export async function updateChatMessages(
  chatId: string,
  messages: ChatMessage[]
): Promise<void> {
  try {
    const response = await fetch(`${baseUrl}/chats/update-chat-messages`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await getUserToken()}`,
      },
      body: JSON.stringify({ chatId, messages }),
    });
    if (!response.ok) {
      throw new Error(`Error al actualizar los mensajes del chat: ${response.status} ${response.statusText}`);
    }
    return;
  } catch (e) {
    console.error("Error al actualizar los mensajes del chat:", e);
    throw e; // Re-lanzar error para manejarlo en el componente
  }
}