import { NextResponse } from 'next/server';
import { isOCRConfigured } from '@/lib/ocr/azure-document';

// GET /api/test/azure - Test Azure Document Intelligence connection
export async function GET() {
  try {
    // Check if credentials are configured
    const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
    const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;

    if (!endpoint || !key) {
      return NextResponse.json({
        success: false,
        error: 'Missing credentials',
        details: {
          hasEndpoint: !!endpoint,
          hasKey: !!key,
        },
      });
    }

    // Test the connection by making a simple API call
    const response = await fetch(`${endpoint}/documentintelligence/info?api-version=2024-02-29-preview`, {
      method: 'GET',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        success: false,
        error: `Azure API returned ${response.status}`,
        details: errorText,
      });
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Azure Document Intelligence is configured correctly!',
      serviceInfo: data,
      config: {
        endpoint: endpoint.replace(/\/+$/, ''), // Remove trailing slash
        keyConfigured: true,
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
