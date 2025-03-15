import { NextResponse, NextRequest } from 'next/server';
import { research } from '@/lib/api/research';

export async function GET(request: NextRequest) {
  try {
    console.log('Test Research Flow endpoint invoked');
    
    // Get query from search params or use default
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || 'What are the requirements for a tourist visa to Armenia?';
    
    // Armenian tourism and visa-related custom URLs
    const customUrls = [
      'https://www.mfa.am/en/visa/',
      'https://www.evisa.am/visa-information.html', 
      'https://www.petekamutner.am/en/content.aspx?id=24'
    ];
    
    // Non-relevant URLs to test filtering
    const nonRelevantUrls = [
      'https://en.wikipedia.org/wiki/United_States', 
      'https://www.weather.com'
    ];
    
    // Combine relevant and non-relevant URLs
    const allUrls = [...customUrls, ...nonRelevantUrls];
    
    console.log(`Testing research flow with query: "${query}"`);
    console.log(`Custom URLs: ${allUrls.join(', ')}`);
    
    // Conduct research with the combined URLs
    const researchResult = await research(query, allUrls);
    
    // Calculate statistics on which sources were included
    const includedSources = researchResult.sources;
    const perplexitySources = includedSources.filter(s => s.source === 'perplexity');
    const serperSources = includedSources.filter(s => s.source === 'serper');
    const customSources = includedSources.filter(s => s.source === 'custom');
    
    // Check which custom URLs were included in the results
    const includedCustomUrls = customSources.map(s => s.url);
    const excludedCustomUrls = allUrls.filter(url => !includedCustomUrls.includes(url));
    
    return NextResponse.json({
      query,
      answer: researchResult.answer,
      sourceStats: {
        total: includedSources.length,
        perplexity: perplexitySources.length,
        serper: serperSources.length,
        custom: customSources.length
      },
      customSources: {
        included: includedCustomUrls,
        excluded: excludedCustomUrls
      }
    });
  } catch (error: any) {
    console.error('Error in test-research-flow endpoint:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'An error occurred during the test',
        stack: error.stack
      },
      { status: 500 }
    );
  }
} 