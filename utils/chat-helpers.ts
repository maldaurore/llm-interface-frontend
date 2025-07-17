import { ChatMessage, ModelOption } from '../types';
import { Chat as ChatType } from '../types';
import { getUserToken } from './tokens';

const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export async function getUserModels(): Promise<ModelOption[]> {
  const response = await fetch(`${baseUrl}/chat-models/user-models`, {
    headers: {
      Authorization: `Bearer ${await getUserToken()}`,
    }
  });

  if (!response.ok) {
    throw new Error("Ocurrió un error al obtener los modelos disponibles para el usuario.")
  }

  const models = await response.json();

  return models;

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
      if (response.status == 401) {
        const err = new Error(response.statusText);
        (err as any).code = 401;
        throw err;
      }
      throw new Error(`Error al obtener el chat: ${response.status} ${response.statusText}`);
    }
    const chat = await response.json();
    return chat.chat;
  } catch (e) {
    console.error("Error al obtener el chat:", e);
    throw e;
  }
}

/**
 * Obtiene la respuesta a un mensaje desde el servidor. Si es un nuevo chat, se crea y guarda en 
 * la base de datos y retorna el ID y título del nuevo chat junto con la respuesta del LLM.
 *
 * @param {ChatMessage} userMessage - El mensaje del usuario.
 * @param {string | null | undefined} chatId - ID del chat, si existe.
 * @param {string} selectedModel - ID del modelo con el que se quiere interactuar.
 * @returns {Promise<{newChatId: string | null, newChatTitle: string | null, response: ChatMessage}>} Una promesa que resuelve con los datos de la respuesta y del chat creado, si es nuevo.
 * @throws {Error} Lanza un error si la solicitud al servidor falla.
 */
export async function getResponse(
  userMessage: ChatMessage,
  chatId: string | null | undefined,
  selectedModel: ModelOption | null
): Promise<{newChatId: string | null, newChatTitle: string | null, response: ChatMessage}> {

  const chatType = selectedModel?.type;
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
      model: selectedModel?.modelId,
    })
  });
  if (!response.ok) {
    throw new Error(`Error al obtener respuesta: ${response.status}. ${response.statusText}`);
  }
  const responseMessage = await response.json()
  return responseMessage;
}