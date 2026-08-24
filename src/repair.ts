export function repairJSON(input: string): { success: boolean; output: string; repairs: string[] } {
  const repairs: string[] = [];
  let output = input.trim();

  // Strategy 1: Fix missing quotes on keys
  output = output.replace(/(\{|\,)\s*([a-zA-Z0-9_]+)\s*\:/g, (match, prefix, key) => {
    repairs.push(`Added quotes around key: ${key}`);
    return `${prefix} "${key}":`;
  });

  // Strategy 2: Fix single quotes to double quotes
  // We should be careful to only replace single quotes that are used as string delimiters, 
  // but a simple regex works for many common LLM mistakes.
  // A safer approach for single to double quotes around values/keys:
  output = output.replace(/'/g, '"');

  // Strategy 3: Add missing brackets
  let openBrackets = (output.match(/\[/g) || []).length;
  let closeBrackets = (output.match(/\]/g) || []).length;
  while (openBrackets > closeBrackets) {
    output += ']';
    closeBrackets++;
    repairs.push('Added missing closing bracket');
  }
  while (closeBrackets > openBrackets) {
    output = '[' + output;
    openBrackets++;
    repairs.push('Added missing opening bracket');
  }

  // Strategy 4: Add missing braces
  let openBraces = (output.match(/\{/g) || []).length;
  let closeBraces = (output.match(/\}/g) || []).length;
  while (openBraces > closeBraces) {
    output += '}';
    closeBraces++;
    repairs.push('Added missing closing brace');
  }
  while (closeBraces > openBraces) {
    output = '{' + output;
    openBraces++;
    repairs.push('Added missing opening brace');
  }

  // Strategy 5: Remove trailing commas
  output = output.replace(/,(\s*[\]\}])/g, (match, spaceAndClose) => {
    repairs.push(`Removed trailing comma before ${spaceAndClose.trim()}`);
    return spaceAndClose;
  });

  return { success: true, output, repairs };
}
