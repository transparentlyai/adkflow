import type * as Monaco from "monaco-editor";
import {
  logLanguageConfig,
  logLanguageDefinition,
} from "@/lib/monaco/logLanguage";
import { logLightTheme } from "@/lib/monaco/logTheme";

export const LOG_LANGUAGE_ID = "log";
export const LOG_THEME_ID = "log-light";

let isRegistered = false;

export function registerLogLanguage(monaco: typeof Monaco): void {
  if (isRegistered) return;

  // Register the language
  monaco.languages.register({ id: LOG_LANGUAGE_ID });

  // Set language configuration
  monaco.languages.setLanguageConfiguration(LOG_LANGUAGE_ID, logLanguageConfig);

  // Set the tokenizer
  monaco.languages.setMonarchTokensProvider(
    LOG_LANGUAGE_ID,
    logLanguageDefinition,
  );

  // Define the theme
  monaco.editor.defineTheme(LOG_THEME_ID, logLightTheme);

  isRegistered = true;
}
