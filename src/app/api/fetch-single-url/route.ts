import { NextRequest, NextResponse } from 'next/server';
import { fetchFromUrl } from '@/lib/api/customSources';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'A valid URL is required' },
        { status: 400 }
      );
    }

    console.log(`Testing single URL: ${url}`);
    
    // Fetch from a single URL
    const result = await fetchFromUrl(url);
    
    if (!result) {
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch content from the URL',
        url
      });
    }
    
    // Return detailed information about the result
    return NextResponse.json({
      success: true,
      url,
      title: result.title,
      contentLength: result.content.length,
      contentSample: result.content.substring(0, 300) + '...',
      fullContent: result.content
    });
  } catch (error: any) {
    console.error('Single URL test error:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'An error occurred while processing your request',
        stack: error.stack
      },
      { status: 500 }
    );
  }
} 