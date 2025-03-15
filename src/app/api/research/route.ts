import { NextRequest, NextResponse } from 'next/server';
import { research } from '@/lib/api/research';
import { translateToLanguage, translateToEnglish } from '@/lib/api/translation';
import { ResearchQuery } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body: ResearchQuery = await request.json();
    const { query, customUrls = [], language = 'english' } = body;

    console.log(`API request received for query: "${query}"`);
    console.log(`Language selected: ${language}`);
    console.log(`Custom URLs included: ${customUrls.length > 0 ? customUrls.join(', ') : 'None'}`);

    if (!query || typeof query !== 'string' || query.trim() === '') {
      console.error('Invalid query provided in API request');
      return NextResponse.json(
        { error: 'A valid query string is required' },
        { status: 400 }
      );
    }

    // Translate the query to the selected language if it's not English
    let translatedQuery = query;
    if (language.toLowerCase() !== 'english') {
      try {
        console.log(`Translating query to ${language}...`);
        translatedQuery = await translateToLanguage(query, language);
        console.log(`Translated query: "${translatedQuery}"`);
      } catch (translationError: any) {
        console.error('Error translating query:', translationError);
        // Continue with the original query if translation fails
        console.log('Continuing with original English query');
      }
    }

    // Conduct the research with translated query and custom URLs if provided
    console.log(`Starting research process with ${customUrls.length} custom URLs in ${language}`);
    const researchResult = await research(translatedQuery, customUrls);
    console.log(`Research completed successfully with ${researchResult.sources.length} sources`);
    
    // Count sources by type
    const perplexitySources = researchResult.sources.filter(s => s.source === 'perplexity').length;
    const serperSources = researchResult.sources.filter(s => s.source === 'serper').length;
    const customSources = researchResult.sources.filter(s => s.source === 'custom').length;
    
    console.log(`Sources breakdown - Perplexity: ${perplexitySources}, Serper: ${serperSources}, Custom: ${customSources}`);

    // Translate the answer back to English if the language wasn't English
    if (language.toLowerCase() !== 'english' && researchResult.answer) {
      try {
        console.log(`Translating answer back to English...`);
        researchResult.answer = await translateToEnglish(researchResult.answer, language);
        console.log(`Answer successfully translated to English`);
        
        // Add a note that the research was conducted in another language
        researchResult.answer = `[Research conducted in ${language}]\n\n${researchResult.answer}`;
      } catch (translationError: any) {
        console.error('Error translating answer back to English:', translationError);
        // Just add a note that the answer is in the selected language
        researchResult.answer = `[Research conducted in ${language} - translation to English failed]\n\n${researchResult.answer}`;
      }
    }

    // Return the result
    return NextResponse.json(researchResult);
  } catch (error: any) {
    console.error('Research API error:', error);
    console.error('Stack trace:', error.stack);
    
    return NextResponse.json(
      { 
        error: error.message || 'An error occurred while processing your request',
        source: error.source
      },
      { status: error.statusCode || 500 }
    );
  }
} 