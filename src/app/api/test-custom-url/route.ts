import { NextRequest, NextResponse } from 'next/server';
import { fetchFromCustomSources } from '@/lib/api/customSources';
import { summarizeWithOpenAI } from '@/lib/api/openai';

export async function GET(request: NextRequest) {
  try {
    console.log('Test endpoint for Armenia biometric gates query called');
    
    // Sample query about Armenia biometric gates
    const query = 'does Armenia have biometric gates installed on all border points';
    
    // Sample URLs that might have information about this topic
    const customUrls = [
      'https://www.evisa.am/visa-information.html',
      'https://www.petekamutner.am/en/content.aspx?id=24',  // Armenia's customs service
      'https://www.mfa.am/en/visa/',  // Armenia's foreign ministry
      'https://www.gov.am/en/structure/576/'  // Armenia's government structure
    ];
    
    console.log(`Testing with ${customUrls.length} custom URLs: ${customUrls.join(', ')}`);
    
    // Fetch from custom sources directly
    const sources = await fetchFromCustomSources(customUrls);
    
    console.log(`Retrieved ${sources.length} sources from custom URLs`);
    
    // Get detailed information about each source
    const sourcesDetails = sources.map(source => ({
      title: source.title,
      url: source.url,
      snippetLength: source.snippet.length,
      fullContentLength: source.fullContent ? source.fullContent.length : 0,
      snippet: source.snippet.substring(0, 100) + '...'
    }));
    
    // Attempt to run summarization with OpenAI
    let summary = 'No summary generated';
    try {
      console.log('Attempting to summarize with OpenAI');
      const openaiResponse = await summarizeWithOpenAI(query, null, null, sources);
      summary = openaiResponse.answer;
      console.log('Successfully generated summary with OpenAI');
    } catch (error: any) {
      console.error('Error summarizing with OpenAI:', error);
      summary = 'Error generating summary: ' + (error.message || 'Unknown error');
    }
    
    // Return the detailed results
    return NextResponse.json({
      query,
      customUrls,
      sourcesCount: sources.length,
      sourcesDetails,
      summary
    });
  } catch (error: any) {
    console.error('Test endpoint error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during the test' },
      { status: 500 }
    );
  }
} 