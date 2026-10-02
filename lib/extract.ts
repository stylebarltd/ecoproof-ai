import Anthropic from "@anthropic-ai/sdk";
import { CATEGORIES, type LineItem } from "./impact";

export type Extraction = { merchant: string; items: LineItem[] };

const schema = {
  type: "object",
  properties: {
    merchant: { type: "string" },
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
  required: ["merchant", "items"],
  additionalProperties: false,
} as const;

const PROMPT = `Read this receipt/invoice/product photo. List every purchased line item with its quantity.
Classify each item into exactly one category. Use "not_sustainable" for ordinary items with no clear
plastic-avoidance, waste-reduction or low-carbon benefit. Only claim a sustainable category when the
item name clearly supports it. confidence is 0-1.

Known products from the SuperBee catalogue:
- HexaWash (laundry pouch / laundry detergent replacement): plastic-free, one pouch lasts about 300 loads -> "plastic_free_laundry".
- Dentos toothpaste tabs: plastic-free toothpaste -> "solid_personal_care".
- Beeswax food wraps -> "beeswax_wrap".
- Reusable produce bags -> "reusable_bag".`;

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
    items: [
      { name: "Stainless steel water bottle", quantity: 1, category: "reusable_bottle", confidence: 0.95 },
      { name: "Beeswax food wraps 3-pack", quantity: 1, category: "beeswax_wrap", confidence: 0.9 },
      { name: "Shampoo bar", quantity: 2, category: "solid_personal_care", confidence: 0.92 },
      { name: "Chocolate bar", quantity: 1, category: "not_sustainable", confidence: 0.8 },
    ],
  };
}
