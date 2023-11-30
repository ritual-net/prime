import { RedactOption } from "@prisma/client";
import type { RedactConfig } from "@type/workers/redact";

/**
 * Redaction scores
 */
export const REDACT_SCORES: Record<string, number> = {
  Name: 25,
  Organization: 25,
  Email: 50,
  "Phone Number": 25,
  Location: 75,
};

/**
 * Redaction configuration options
 */
export const REDACT_OPTIONS = [
  { key: "redact_name", name: "Name", default: RedactOption.PASSTHROUGH },
  {
    key: "redact_organization",
    name: "Organization",
    default: RedactOption.PASSTHROUGH,
  },
  { key: "redact_email", name: "Email", default: RedactOption.PASSTHROUGH },
  {
    key: "phone_number",
    name: "Phone Number",
    default: RedactOption.PASSTHROUGH,
  },
  {
    key: "redact_location",
    name: "Location",
    default: RedactOption.PASSTHROUGH,
  },
];

/**
 * Generates python-compliant config
 * @param {Record<string, RedactOption>} baseConfig from database
 * @returns {RedactConfig} python-compliant config
 */
export function getWorkerConfig(
  baseConfig: Record<string, RedactOption>,
): RedactConfig {
  return Object.entries(baseConfig).reduce(
    (obj, [name, option]) => ({
      ...obj,
      [REDACT_KEY_TO_NAME[name]]: [
        REDACT_SCORES[REDACT_KEY_TO_NAME[name]] ?? 0,
        option.toLowerCase(),
      ],
    }),
    {},
  );
}

/**
 * Options keys => name helper
 */
export const REDACT_KEY_TO_NAME: Record<string, string> = REDACT_OPTIONS.reduce(
  (obj, v) => ({ ...obj, [v.key]: [v.name] }),
  {},
);

/**
 * OptionTypes => string[]
 */
export const REDACT_OPTION_SET: string[] = Object.values(RedactOption);
