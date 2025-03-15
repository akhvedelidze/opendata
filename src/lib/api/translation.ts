import axios from 'axios';
import { ApiError } from '../types';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Translates text from English to the target language using OpenAI
 */
export async function translateToLanguage(text: string, targetLanguage: string): Promise<string> {
  if (targetLanguage.toLowerCase() === 'english') {
    return text; // No translation needed
  }

  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('OpenAI API key is not configured');
    throw {
      message: 'OpenAI API key is not configured',
      statusCode: 500,
      source: 'translation'
    } as ApiError;
  }

  try {
    console.log(`Translating text to ${targetLanguage}...`);
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a professional translator. Translate the provided English text to ${targetLanguage}. Preserve the meaning, tone, and format of the original text. Return only the translated text without any additional comments or explanations.`
          },
          {
            role: "user",
            content: text
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    const translatedText = response.data.choices[0].message.content.trim();
    console.log(`Translation to ${targetLanguage} completed`);
    return translatedText;
  } catch (error: any) {
    console.error('Translation API error:', error.response?.data || error.message);
    throw {
      message: error.response?.data?.message || `Failed to translate text to ${targetLanguage}`,
      statusCode: error.response?.status || 500,
      source: 'translation'
    } as ApiError;
  }
}

/**
 * Translates text from the source language to English using OpenAI
 */
export async function translateToEnglish(text: string, sourceLanguage: string): Promise<string> {
  if (sourceLanguage.toLowerCase() === 'english') {
    return text; // No translation needed
  }

  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('OpenAI API key is not configured');
    throw {
      message: 'OpenAI API key is not configured',
      statusCode: 500,
      source: 'translation'
    } as ApiError;
  }

  try {
    console.log(`Translating text from ${sourceLanguage} to English...`);
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a professional translator. Translate the provided ${sourceLanguage} text to English. Preserve the meaning, tone, and format of the original text. Return only the translated text without any additional comments or explanations.`
          },
          {
            role: "user",
            content: text
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    const translatedText = response.data.choices[0].message.content.trim();
    console.log(`Translation to English completed`);
    return translatedText;
  } catch (error: any) {
    console.error('Translation API error:', error.response?.data || error.message);
    throw {
      message: error.response?.data?.message || `Failed to translate text from ${sourceLanguage} to English`,
      statusCode: error.response?.status || 500,
      source: 'translation'
    } as ApiError;
  }
} 