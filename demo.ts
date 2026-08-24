import { validateWithRepair, z } from './src/index.js';

// Define the schema we expect from the LLM
const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2),
  age: z.number().min(18),
  tags: z.array(z.string()),
  email: z.string().email(),
  isActive: z.boolean(),
});

// A realistically messy AI response with:
// 1. Markdown wrapper
// 2. Extra conversational text
// 3. Trailing commas
// 4. Missing a closing bracket on the array
// 5. Missing a closing brace on the object
// 6. Hallucinated types (age as string, boolean as string, extra fields)
const messyAIResponse = `
Here is the extracted JSON for the user you requested:

\`\`\`json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Jane Doe",
  "age": "28",
  "email": "jane@example.com",
  "isActive": "TRUE",
  "hallucinatedField": 42,
  "tags": ["developer", "ai", 
\`\`\`

Hope that helps! Let me know if you need anything else.
`;

console.log("==================================================");
console.log("Raw Messy AI Response:");
console.log(messyAIResponse);
console.log("==================================================");

// Validate and Repair
const result = validateWithRepair(userSchema, messyAIResponse, {
  extractFromText: true,
  fixMissingBrackets: true,
  fixTrailingCommas: true,
  coerceTypes: true,
});

if (result.success) {
  console.log("✅ Validation Successful!");
  console.log("\nParsed & Typed Data:");
  console.log(result.data);

  if (result.repairs && result.repairs.length > 0) {
    console.log("\n🔧 Repairs Applied by Agent Response Schema:");
    result.repairs.forEach(repair => console.log(`  - ${repair}`));
  }
} else {
  console.error("❌ Validation Failed:", result.errors);
}
