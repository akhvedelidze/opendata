import { NextResponse, NextRequest } from 'next/server';
import { fetchFromUrl } from '@/lib/api/customSources';

export async function GET(request: NextRequest) {
  try {
    console.log('Test Custom URL Direct endpoint invoked');
    
    // Get URL from query params
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }
    
    console.log(`Testing direct URL fetch for: ${url}`);
    
    const result = await fetchFromUrl(url);
    
    if (!result) {
      return NextResponse.json(
        { error: 'Failed to fetch content from URL', url },
        { status: 404 }
      );
    }
    
    // Create a truncated preview of content for better readability
    const contentPreview = result.content.length > 300 
      ? result.content.substring(0, 300) + '...' 
      : result.content;
    
    return NextResponse.json({
      url: result.url,
      title: result.title,
      contentLength: result.content.length,
      contentPreview,
      content: result.content
    });
  } catch (error: any) {
    console.error('Error in test-custom-url-direct endpoint:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'An error occurred while processing your request',
        stack: error.stack
      },
      { status: 500 }
    );
  }
} 