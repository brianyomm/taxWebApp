import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Document categories matching our database schema
export const DOCUMENT_CATEGORIES = {
  income: ['W-2', '1099-INT', '1099-DIV', '1099-B', '1099-MISC', '1099-NEC', '1099-R', 'K-1', 'SSA-1099'],
  deductions: ['1098', '1098-T', '1098-E', 'Medical receipts', 'Charitable donations', 'Property tax'],
  expenses: ['Business receipts', 'Home office', 'Vehicle logs', 'Travel expenses', 'Equipment'],
  banking: ['Bank statement', 'Investment statement', 'Brokerage statement'],
  property: ['Property tax bill', 'Purchase documents', 'Sale documents', 'Closing statement'],
  identity: ['Drivers license', 'Prior year return', 'Social security card'],
  other: ['Miscellaneous', 'Unclassified'],
} as const;

export type DocumentCategory = keyof typeof DOCUMENT_CATEGORIES;
export type DocumentSubcategory = (typeof DOCUMENT_CATEGORIES)[DocumentCategory][number];

export interface ClassificationResult {
  category: DocumentCategory;
  subcategory: string;
  confidence: number;
  taxYear?: number;
  extractedFields: ExtractedField[];
  summary: string;
}

export interface ExtractedField {
  fieldName: string;
  value: string;
  confidence: number;
}

// Helper to strip markdown code blocks from Claude's response
function stripMarkdownCodeBlocks(text: string): string {
  // Remove ```json ... ``` or ``` ... ``` wrapper
  const codeBlockRegex = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/;
  const match = text.trim().match(codeBlockRegex);
  return match ? match[1].trim() : text.trim();
}

const CLASSIFICATION_PROMPT = `You are a tax document classifier for a CPA firm. Analyze the following document text and classify it into the appropriate category and subcategory.

Available categories and subcategories:
- income: W-2, 1099-INT, 1099-DIV, 1099-B, 1099-MISC, 1099-NEC, 1099-R, K-1, SSA-1099
- deductions: 1098, 1098-T, 1098-E, Medical receipts, Charitable donations, Property tax
- expenses: Business receipts, Home office, Vehicle logs, Travel expenses, Equipment
- banking: Bank statement, Investment statement, Brokerage statement
- property: Property tax bill, Purchase documents, Sale documents, Closing statement
- identity: Drivers license, Prior year return, Social security card
- other: Miscellaneous, Unclassified

For each document, provide:
1. The category (one of the main categories above)
2. The subcategory (one of the subcategories for that category)
3. Confidence score (0-100)
4. Tax year if identifiable
5. Key extracted fields relevant to tax preparation
6. A brief summary of the document

Respond ONLY with valid JSON in this exact format:
{
  "category": "string",
  "subcategory": "string",
  "confidence": number,
  "taxYear": number or null,
  "extractedFields": [
    {"fieldName": "string", "value": "string", "confidence": number}
  ],
  "summary": "string"
}

Document text to classify:
`;

export async function classifyDocument(ocrText: string): Promise<ClassificationResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Anthropic API key not configured');
  }

  // Truncate text if too long (Claude has context limits)
  const maxLength = 50000;
  const truncatedText = ocrText.length > maxLength
    ? ocrText.substring(0, maxLength) + '\n...[truncated]'
    : ocrText;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: CLASSIFICATION_PROMPT + truncatedText,
      },
    ],
  });

  // Extract the text response
  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  // Parse the JSON response (strip markdown code blocks if present)
  try {
    const cleanedText = stripMarkdownCodeBlocks(textBlock.text);
    const result = JSON.parse(cleanedText) as ClassificationResult;

    // Validate the category
    if (!Object.keys(DOCUMENT_CATEGORIES).includes(result.category)) {
      result.category = 'other';
      result.subcategory = 'Unclassified';
    }

    return result;
  } catch (error) {
    console.error('Failed to parse Claude response:', textBlock.text);
    throw new Error('Failed to parse classification result');
  }
}

// Check if AI classification is configured
export function isAIConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

// Extract specific tax form data using Claude
export async function extractTaxFormData(
  ocrText: string,
  formType: string
): Promise<Record<string, unknown>> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Anthropic API key not configured');
  }

  const extractionPrompt = `You are a tax document data extractor. Extract all relevant fields from this ${formType} form.

For ${formType}, extract fields like:
${getFormFieldsHint(formType)}

Return the extracted data as a JSON object with field names as keys and values as strings.
Include a "confidence" field (0-100) indicating overall extraction confidence.

Document text:
${ocrText}

Respond ONLY with valid JSON.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: extractionPrompt,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  try {
    const cleanedText = stripMarkdownCodeBlocks(textBlock.text);
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error('Failed to parse extraction response:', textBlock.text);
    return { error: 'Failed to extract data', rawText: ocrText.substring(0, 500) };
  }
}

function getFormFieldsHint(formType: string): string {
  const hints: Record<string, string> = {
    'W-2': `
      - Employer name and address (Box a-c)
      - Employee name, SSN, address (Box d-f)
      - Wages, tips, other compensation (Box 1)
      - Federal income tax withheld (Box 2)
      - Social security wages and tax (Box 3-4)
      - Medicare wages and tax (Box 5-6)
      - State wages and tax (Box 15-17)`,
    '1099-INT': `
      - Payer name and TIN
      - Recipient name, TIN, address
      - Interest income (Box 1)
      - Early withdrawal penalty (Box 2)
      - Interest on U.S. Savings Bonds (Box 3)
      - Federal income tax withheld (Box 4)`,
    '1099-DIV': `
      - Payer name and TIN
      - Recipient name, TIN, address
      - Total ordinary dividends (Box 1a)
      - Qualified dividends (Box 1b)
      - Total capital gain distributions (Box 2a)
      - Federal income tax withheld (Box 4)`,
    '1098': `
      - Lender name and address
      - Borrower name and SSN
      - Mortgage interest received (Box 1)
      - Points paid on purchase (Box 2)
      - Mortgage origination date (Box 3)
      - Property address`,
  };

  return hints[formType] || `- All relevant tax-related fields
    - Names, addresses, and identification numbers
    - Dollar amounts and dates
    - Any box numbers and their values`;
}
