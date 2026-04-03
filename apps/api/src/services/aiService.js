import 'dotenv/config';
import OpenAI from 'openai';
import logger from '../utils/logger.js';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

function ensureOpenAI() {
  if (!openai) {
    throw new Error('OPENAI_API_KEY não configurada');
  }

  return openai;
}

const EXPENSE_CATEGORIES = {
  'Supermercado': ['supermercado', 'mercado', 'compras', 'alimentos', 'padaria', 'açougue', 'hortifruti'],
  'Lazer': ['cinema', 'bar', 'restaurante', 'saída', 'diversão', 'festa', 'show', 'jogo'],
  'Saúde': ['farmácia', 'médico', 'hospital', 'dentista', 'psicólogo', 'fisioterapia'],
  'Transporte': ['uber', 'ônibus', 'gasolina', 'táxi', 'combustível', 'estacionamento', 'metrô'],
  'Utilidades': ['aluguel', 'condomínio', 'água', 'luz', 'internet', 'telefone', 'gás'],
  'Educação': ['livro', 'curso', 'escola', 'aula', 'faculdade', 'treinamento'],
  'Manutenção': ['conserto', 'reparo', 'limpeza', 'manutenção', 'pintura'],
};

/**
 * Transcribe audio using OpenAI Whisper API
 * @param {Buffer} audioBuffer - Audio file buffer
 * @returns {Promise<Object>} {text: string, duration: number}
 */
export async function transcribeAudio(audioBuffer) {
  try {
    const client = ensureOpenAI();
    logger.info('Transcribing audio with Whisper API');

    const file = new File([audioBuffer], 'audio.ogg', { type: 'audio/ogg' });

    const transcript = await client.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'pt',
    });

    logger.info('Audio transcribed successfully');
    return {
      text: transcript.text,
      duration: 0, // Whisper API doesn't return duration
    };
  } catch (error) {
    logger.error('Whisper transcription error:', error.message);
    throw new Error(`Failed to transcribe audio: ${error.message}`);
  }
}

/**
 * Extract intent from text using GPT-4
 * @param {string} text - User message
 * @returns {Promise<string>} Intent classification
 */
export async function extractIntent(text) {
  try {
    const client = ensureOpenAI();
    const response = await client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `Você é um classificador de intenções financeiras. Analise a mensagem do usuário em português brasileiro e classifique em uma destas categorias: EXPENSE, INCOME, QUERY, SPLIT, GOAL, CREDIT_CARD. Responda APENAS com o nome da categoria, nada mais.`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0.3,
      max_tokens: 10,
    });

    const intent = response.choices[0].message.content.trim().toUpperCase();
    const validIntents = ['EXPENSE', 'INCOME', 'QUERY', 'SPLIT', 'GOAL', 'CREDIT_CARD'];
    return validIntents.includes(intent) ? intent : 'QUERY';
  } catch (error) {
    logger.error('Intent extraction error:', error.message);
    throw new Error(`Failed to extract intent: ${error.message}`);
  }
}

/**
 * Categorize expense based on description keywords
 * @param {string} description - Expense description
 * @returns {string} Category name
 */
export function categorizeExpense(description) {
  const lowerDesc = description.toLowerCase();

  for (const [category, keywords] of Object.entries(EXPENSE_CATEGORIES)) {
    if (keywords.some(keyword => lowerDesc.includes(keyword))) {
      return category;
    }
  }

  return 'Outros';
}

/**
 * Extract entities from text using GPT-4
 * @param {string} text - User message
 * @param {string} intent - Intent classification
 * @returns {Promise<Object>} Extracted entities
 */
export async function extractEntities(text, intent) {
  try {
    const client = ensureOpenAI();
    let prompt = '';

    switch (intent) {
      case 'EXPENSE':
        prompt = `Extraia os seguintes dados da mensagem em português: amount (número), category (categoria de despesa), description (descrição), paymentMethod (dinheiro, débito, crédito, transferência), type (expense). Responda em JSON. Se não encontrar um campo, use null.`;
        break;
      case 'INCOME':
        prompt = `Extraia os seguintes dados: amount (número), type (salário, negócio, pró-labore), description (descrição), frequency (única, mensal, semanal). Responda em JSON.`;
        break;
      case 'QUERY':
        prompt = `Extraia: queryType (saldo, despesas, receitas, metas, contas), timeframe (hoje, semana, mês, ano). Responda em JSON.`;
        break;
      case 'GOAL':
        prompt = `Extraia: title (nome da meta), targetAmount (valor alvo), deadline (data limite em YYYY-MM-DD). Responda em JSON.`;
        break;
      case 'SPLIT':
        prompt = `Extraia: transactionId (ID da transação), method (igual, proporcional). Responda em JSON.`;
        break;
      case 'CREDIT_CARD':
        prompt = `Extraia: amount (número), description (descrição), cardName (nome do cartão). Responda em JSON.`;
        break;
      default:
        return {};
    }

    const response = await client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `Você é um extrator de entidades financeiras. ${prompt}`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    const content = response.choices[0].message.content.trim();
    const jsonMatch = content.match(/\{[^}]+\}/);
    const entities = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    // Auto-categorize if description exists and no category provided
    if (intent === 'EXPENSE' && entities.description && !entities.category) {
      entities.category = categorizeExpense(entities.description);
    }

    return entities;
  } catch (error) {
    logger.error('Entity extraction error:', error.message);
    throw new Error(`Failed to extract entities: ${error.message}`);
  }
}

/**
 * Process message to understand intent and extract entities
 * @param {string} text - User message
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Processing result
 */
export async function processMessage(text, userId) {
  try {
    logger.info(`Processing message for user ${userId}`);

    const intent = await extractIntent(text);
    const entities = await extractEntities(text, intent);

    return {
      intent,
      entities,
      userId,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Message processing error:', error.message);
    throw new Error(`Failed to process message: ${error.message}`);
  }
}

/**
 * Generate Portuguese confirmation message
 * @param {Object} result - Processing result
 * @param {string} intent - Intent type
 * @returns {Promise<string>} Portuguese confirmation message
 */
export async function generateResponse(result, intent) {
  try {
    const { entities } = result;
    let prompt = '';

    switch (intent) {
      case 'EXPENSE':
        prompt = `Gere uma mensagem de confirmação amigável em português para registrar uma despesa de R$ ${entities.amount || '?'} na categoria "${entities.category || 'Outros'}". Inclua um emoji apropriado. Seja conciso.`;
        break;
      case 'INCOME':
        prompt = `Gere uma mensagem de confirmação amigável em português para registrar uma receita de R$ ${entities.amount || '?'} do tipo "${entities.type || 'salário'}". Inclua um emoji. Seja conciso.`;
        break;
      case 'QUERY':
        prompt = `Gere uma resposta amigável em português para uma consulta financeira sobre ${entities.queryType || 'finanças'}. Inclua emojis. Seja útil e conciso.`;
        break;
      case 'GOAL':
        prompt = `Gere uma mensagem de confirmação em português para criar uma meta financeira "${entities.title || 'Meta'}" com alvo de R$ ${entities.targetAmount || '?'}. Inclua um emoji. Seja motivador.`;
        break;
      case 'SPLIT':
        prompt = `Gere uma mensagem em português confirmando a divisão de uma despesa. Inclua um emoji. Seja conciso.`;
        break;
      case 'CREDIT_CARD':
        prompt = `Gere uma mensagem de confirmação em português para registrar uma transação de cartão de crédito de R$ ${entities.amount || '?'}. Inclua um emoji. Seja conciso.`;
        break;
      default:
        prompt = `Gere uma resposta amigável em português para ajudar o usuário com suas finanças. Inclua emojis. Seja útil.`;
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente financeiro amigável. Responda sempre em português brasileiro.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    logger.error('Response generation error:', error.message);
    throw new Error(`Failed to generate response: ${error.message}`);
  }
}

export default {
  transcribeAudio,
  extractIntent,
  extractEntities,
  categorizeExpense,
  processMessage,
  generateResponse,
};
