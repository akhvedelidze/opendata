import { NextRequest, NextResponse } from 'next/server';
import { conductResearch } from '@/lib/api/research';
import { ResearchQuery } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body: ResearchQuery = await request.json();
    const { query } = body;

    if (!query || typeof query !== 'string' || query.trim() === '') {
      return NextResponse.json(
        { error: 'A valid query string is required' },
        { status: 400 }
      );
    }

    // Conduct the research
    const researchResult = await conductResearch(query);

    // Return the result
    return NextResponse.json(researchResult);
  } catch (error: any) {
    console.error('Research API error:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'An error occurred while processing your request',
        source: error.source
      },
      { status: error.statusCode || 500 }
    );
  }
} 