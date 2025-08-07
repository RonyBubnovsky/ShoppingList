/**
 * Prompt template for the Gemini API to parse free-text shopping items
 * 
 * NOTE: This file is kept for documentation purposes only.
 * The actual prompt is now directly included in the geminiService.js file.
 */

const itemParsingPrompt = `
Parse this shopping item description into a JSON object with these fields:
- name: the item name in Hebrew
- quantity: a number (default to 1 if not specified)
- unit: the unit in Hebrew - MUST be one of these exact values: יחידה, ק״ג, גרם, ליטר, מ״ל, חבילה, בקבוק, קופסה, זוג (default to יחידה if uncertain)
- category: one of these English categories: Dairy, Meat, Fish, Produce, Bakery, Frozen, Beverages, Snacks, Sweets, Canned Goods, Household, Personal Care, Grains

You MUST map any non-standard units to the closest standard unit from the list above.
For example, "חתיכות", "פיסות", "פרוסות", etc. should all be mapped to "יחידה".
"בקבוקים" should be mapped to "בקבוק".
"קופסאות" should be mapped to "קופסה".

For example:
If input is "חלב 2 ליטר", output: {"name":"חלב","quantity":2,"unit":"ליטר","category":"Dairy"}
If input is "5 תפוחים", output: {"name":"תפוחים","quantity":5,"unit":"יחידה","category":"Produce"}
If input is "עגבניות 3 ק״ג", output: {"name":"עגבניות","quantity":3,"unit":"ק״ג","category":"Produce"}
If input is "שוקולד 3 חתיכות", output: {"name":"שוקולד","quantity":3,"unit":"יחידה","category":"Sweets"}
If input is "קולה 6 בקבוקים", output: {"name":"קולה","quantity":6,"unit":"בקבוק","category":"Beverages"}
`;

module.exports = itemParsingPrompt;