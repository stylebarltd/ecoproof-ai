import Anthropic from "@anthropic-ai/sdk";
import { CATEGORIES, type LineItem } from "./impact";

export type Extraction = { merchant: string; receiptNumber: string; date: string; total: number; items: LineItem[] };

const schema = {
  type: "object",
  properties: {
    merchant: { type: "string" },
    receiptNumber: { type: "string" },
    date: { type: "string" },
    total: { type: "number" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          quantity: { type: "integer" },
          category: { type: "string", enum: [...CATEGORIES] },
          confidence: { type: "number" },
        },
        required: ["name", "quantity", "category", "confidence"],
        additionalProperties: false,
      },
    },
  },
  required: ["merchant", "receiptNumber", "date", "total", "items"],
  additionalProperties: false,
} as const;

const PROMPT = `Read this receipt/invoice/product photo. List every purchased line item with its quantity.
Classify each item into exactly one category. Use "not_sustainable" for ordinary items with no clear
plastic-avoidance, waste-reduction or low-carbon benefit. Only claim a sustainable category when the
item name clearly supports it. confidence is 0-1.
Also return receiptNumber (the printed receipt/bill/invoice number, or "" if none), date as ISO YYYY-MM-DD (receipts in Thailand are day-first DD/MM/YYYY; "" if unreadable) and total as a number (0 if unreadable).

Known products from the SuperBee catalogue:
- HexaWash (laundry pouch / laundry detergent replacement): plastic-free, one pouch lasts about 300 loads -> "plastic_free_laundry".
- Dentos toothpaste tabs: plastic-free toothpaste -> "solid_personal_care".
- Beeswax food wraps -> "beeswax_wrap".
- Reusable produce bags -> "reusable_bag".
- Reusable bamboo kitchen towels and cloth napkins that replace disposable paper -> "reusable_household_textile".`;

type MediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export async function extractReceipt(base64: string, mediaType: MediaType): Promise<Extraction> {
  if (!process.env.ANTHROPIC_API_KEY) return mockExtraction();
  const client = new Anthropic();
  const res = await client.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 4000,
    output_config: { effort: "low", format: { type: "json_schema", schema } },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: PROMPT },
        ],
      },
    ],
  });
  if (res.stop_reason === "refusal") throw new Error("Model declined this image");
  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("No extraction returned");
  return JSON.parse(block.text) as Extraction;
}

function mockExtraction(): Extraction {
  return {
    merchant: "Demo Eco Store (mock - set ANTHROPIC_API_KEY)",
    receiptNumber: "MOCK-" + Date.now(),
    date: new Date().toISOString().slice(0, 10),
    total: 100,
    items: [
      { name: "Stainless steel water bottle", quantity: 1, category: "reusable_bottle", confidence: 0.95 },
      { name: "Beeswax food wraps 3-pack", quantity: 1, category: "beeswax_wrap", confidence: 0.9 },
      { name: "Shampoo bar", quantity: 2, category: "solid_personal_care", confidence: 0.92 },
      { name: "Chocolate bar", quantity: 1, category: "not_sustainable", confidence: 0.8 },
    ],
  };
}

export type ReceiptCheck = { merchant: string; matchesPlace: boolean; receiptNumber: string; date: string; total: number };

const checkSchema = {
  type: "object",
  properties: {
    merchant: { type: "string" },
    matchesPlace: { type: "boolean" },
    receiptNumber: { type: "string" },
    date: { type: "string" },
    total: { type: "number" },
  },
  required: ["merchant", "matchesPlace", "receiptNumber", "date", "total"],
  additionalProperties: false,
} as const;

/** Reads only what is needed to tie a receipt to one place and one purchase. */
export async function checkReceiptForPlace(base64: string, mediaType: MediaType, placeName: string): Promise<ReceiptCheck> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { merchant: placeName, matchesPlace: true, receiptNumber: "MOCK-" + Date.now(), date: new Date().toISOString().slice(0, 10), total: 100 };
  }
  const client = new Anthropic();
  const res = await client.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 1000,
    output_config: { effort: "low", format: { type: "json_schema", schema: checkSchema } },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          {
            type: "text",
            text: `This should be a receipt from a place called "${placeName}" (names may be in English or Thai, or a branch name).
Return: merchant (name printed on the receipt), matchesPlace (true only if the receipt plausibly comes from that place; false if it is clearly from somewhere else or is not a receipt),
receiptNumber (printed receipt/bill/invoice number, or "" if none), date as ISO YYYY-MM-DD (receipts in Thailand use day-first DD/MM/YYYY; use "" if unreadable), total as a number (0 if unreadable).`,
          },
        ],
      },
    ],
  });
  if (res.stop_reason === "refusal") throw new Error("Model declined this image");
  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("No result returned");
  return JSON.parse(block.text) as ReceiptCheck;
}
