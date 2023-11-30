/**
 * Blocked prompt response
 */
export const BLOCKED_PROMPT: string = "REDACT_BLOCKED";

/**
 * Redaction config format
 * Entity name => [entity score, entity redaction setting]
 */
export type RedactConfig = Record<string, [number, string]>;

/**
 * Supported NER Detectors
 */
export enum NERDetector {
  Nltk = "Nltk",
  Spacy = "Spacy",
}

/**
 * Redact worker input
 */
export type RedactWorkerInput = {
  // Selected NER detector
  ner: NERDetector;
  // Unredacted prompt
  prompt: string;
  // Entity name => [entity score, entity redaction setting]
  config: RedactConfig;
};

/**
 * Redact worker output
 */
export type RedactWorkerOutput = {
  // Overall input risk score
  risk_score: number;
  // Entity type => entity value
  entity_map: [string, string];
  // New prompt with redaction
  new_prompt: string;
  // Mapping of UUID entity type => actual value
  redact_map: Record<string, string>;
};
