import { ChatMessage } from '../types';
import { Chat as ChatType } from '../types';
import { getUserToken } from './tokens';
import { AVAILABLE_MODELS } from '@/constants';

const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

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
    return chat.chat;
  } catch (e) {
    console.error("Error al obtener el chat:", e);
    throw e; // Re-lanzar error para manejarlo en el componente
  }
}

export async function getResponse(
  userMessage: ChatMessage,
  chatId: string | null | undefined,
  selectedModel: string
): Promise<{newChatId: string | null, newChatTitle: string | null, response: ChatMessage}> {

  const chatType = AVAILABLE_MODELS.find(model => model.id == selectedModel)?.type;
  const response = await fetch(`${baseUrl}/chats/get-response`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await getUserToken()}`,
    },
    body: JSON.stringify({
      chatId,
      chatType,
      message: userMessage,
      model: selectedModel,
    })
  });
  if (!response.ok) {
    throw new Error(`Error al obtener respuesta: ${response.status}. ${response.statusText}`);
  }
  const responseMessage = await response.json()
  return responseMessage;
}