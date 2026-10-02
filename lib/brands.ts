// Brands that can feed orders into the loop. Step 4 replaces this with a real brand profile + B Corp verification.
export const BRANDS: Record<string, { name: string; apiKeyEnv: string }> = {
  superbee: { name: "SuperBee", apiKeyEnv: "SUPERBEE_ORDER_KEY" },
};
