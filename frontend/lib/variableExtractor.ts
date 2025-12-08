/**
 * Variable Extractor Utility
 *
 * Extracts and validates variable patterns from markdown text.
 * Variables are denoted by {variable_name} syntax.
 */

/**
 * Extracts all unique variable names from the given text.
 * Variables must be in the format {variable_name} where variable_name
 * contains only alphanumeric characters and underscores.
 *
 * @param text - The text to extract variables from
 * @returns Array of unique variable names (without braces)
 *
 * @example
 * extractVariables("Hello {name}, your score is {score}")
 * // Returns: ["name", "score"]
 */
export function extractVariables(text: string): string[] {
  if (!text) {
    return [];
  }

  // Regex to match {variable_name} where variable_name is alphanumeric + underscores
  // Pattern: { followed by word characters (a-z, A-Z, 0-9, _), followed by }
  const variablePattern = /\{([a-zA-Z0-9_]+)\}/g;

  const variables: string[] = [];
  let match;

  // Find all matches
  while ((match = variablePattern.exec(text)) !== null) {
    const variableName = match[1];

    // Validate variable name (must start with letter or underscore)
    if (isValidVariableName(variableName)) {
      variables.push(variableName);
    }
  }

  // Return unique variables only
  return Array.from(new Set(variables));
}

/**
 * Validates that a variable name follows proper naming conventions.
 * Must start with a letter or underscore, followed by letters, numbers, or underscores.
 *
 * @param name - The variable name to validate
 * @returns true if valid, false otherwise
 */
export function isValidVariableName(name: string): boolean {
  if (!name || name.length === 0) {
    return false;
  }

  // Variable must start with letter or underscore
  // Can contain letters, numbers, and underscores
  const validNamePattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

  return validNamePattern.test(name);
}

/**
 * Highlights variables in text by wrapping them with a custom marker.
 * Useful for syntax highlighting in preview.
 *
 * @param text - The text containing variables
 * @param wrapperStart - Opening wrapper (default: <span class="variable">)
 * @param wrapperEnd - Closing wrapper (default: </span>)
 * @returns Text with variables wrapped
 */
export function highlightVariables(
  text: string,
  wrapperStart: string = '<span class="variable">',
  wrapperEnd: string = '</span>'
): string {
  if (!text) {
    return '';
  }

  const variablePattern = /\{([a-zA-Z0-9_]+)\}/g;

  return text.replace(variablePattern, (match, variableName) => {
    if (isValidVariableName(variableName)) {
      return `${wrapperStart}${match}${wrapperEnd}`;
    }
    return match;
  });
}
