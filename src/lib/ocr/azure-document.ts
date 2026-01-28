import {
  AzureKeyCredential,
  DocumentAnalysisClient,
  AnalyzeResult,
} from '@azure/ai-form-recognizer';

const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT!;
const apiKey = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY!;

let client: DocumentAnalysisClient | null = null;

function getClient(): DocumentAnalysisClient {
  if (!client) {
    if (!endpoint || !apiKey) {
      throw new Error('Azure Document Intelligence credentials not configured');
    }
    client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(apiKey));
  }
  return client;
}

export interface OCRResult {
  text: string;
  pages: PageResult[];
  tables: TableResult[];
  keyValuePairs: KeyValuePair[];
  documentType?: string;
  confidence?: number;
}

export interface PageResult {
  pageNumber: number;
  width: number;
  height: number;
  text: string;
  lines: LineResult[];
}

export interface LineResult {
  content: string;
  boundingBox?: number[];
}

export interface TableResult {
  rowCount: number;
  columnCount: number;
  cells: TableCell[];
}

export interface TableCell {
  rowIndex: number;
  columnIndex: number;
  content: string;
}

export interface KeyValuePair {
  key: string;
  value: string;
  confidence: number;
}

// Use prebuilt-document model for general document OCR
export async function analyzeDocument(documentUrl: string): Promise<OCRResult> {
  const client = getClient();

  // Start analysis
  const poller = await client.beginAnalyzeDocumentFromUrl('prebuilt-document', documentUrl);
  const result = await poller.pollUntilDone();

  return transformResult(result);
}

// Use prebuilt tax document models for specific forms
export async function analyzeTaxDocument(
  documentUrl: string,
  documentType: 'w2' | '1099' | '1098' | 'general' = 'general'
): Promise<OCRResult> {
  const client = getClient();

  // Map document types to Azure models
  const modelMap: Record<string, string> = {
    'w2': 'prebuilt-tax.us.w2',
    '1099': 'prebuilt-tax.us.1099Misc', // Most common 1099
    '1098': 'prebuilt-document', // No specific model, use general
    'general': 'prebuilt-document',
  };

  const modelId = modelMap[documentType] || 'prebuilt-document';

  try {
    const poller = await client.beginAnalyzeDocumentFromUrl(modelId, documentUrl);
    const result = await poller.pollUntilDone();
    return transformResult(result);
  } catch (error) {
    // Fall back to general document analysis if specific model fails
    console.warn(`Failed to analyze with ${modelId}, falling back to prebuilt-document`);
    const poller = await client.beginAnalyzeDocumentFromUrl('prebuilt-document', documentUrl);
    const result = await poller.pollUntilDone();
    return transformResult(result);
  }
}

function transformResult(result: AnalyzeResult): OCRResult {
  const pages: PageResult[] = (result.pages || []).map((page) => ({
    pageNumber: page.pageNumber,
    width: page.width || 0,
    height: page.height || 0,
    text: (page.lines || []).map((line) => line.content).join('\n'),
    lines: (page.lines || []).map((line) => ({
      content: line.content,
      boundingBox: line.polygon
        ? line.polygon.flatMap((point) => [point.x, point.y])
        : undefined,
    })),
  }));

  const tables: TableResult[] = (result.tables || []).map((table) => ({
    rowCount: table.rowCount,
    columnCount: table.columnCount,
    cells: (table.cells || []).map((cell) => ({
      rowIndex: cell.rowIndex,
      columnIndex: cell.columnIndex,
      content: cell.content,
    })),
  }));

  const keyValuePairs: KeyValuePair[] = (result.keyValuePairs || []).map((pair) => ({
    key: pair.key?.content || '',
    value: pair.value?.content || '',
    confidence: pair.confidence || 0,
  }));

  // Combine all text
  const fullText = pages.map((p) => p.text).join('\n\n');

  return {
    text: fullText,
    pages,
    tables,
    keyValuePairs,
    documentType: result.documents?.[0]?.docType,
    confidence: result.documents?.[0]?.confidence,
  };
}

// Check if Azure Document Intelligence is configured
export function isOCRConfigured(): boolean {
  return !!(endpoint && apiKey);
}
