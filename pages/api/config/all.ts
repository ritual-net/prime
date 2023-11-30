import db from "@db/index";
import { REDACT_OPTIONS } from "@utils/redact";
import { getServerlessSession } from "@utils/auth";
import type { NextApiRequest, NextApiResponse } from "next";
import { RedactOption, UserPermission } from "@prisma/client";

/**
 * Collects config options from database
 * @returns {Promise<Record<string, RedactOption>>} type: redact setting
 */
export async function getConfig(): Promise<Record<string, RedactOption>> {
  // Collect all config options
  const options: { key: string; value: RedactOption }[] =
    await db.configuration.findMany({
      select: {
        key: true,
        value: true,
      },
    });

  // Assign defaults
  // Spread assign because we may have different types of options in future
  const defaults = [...REDACT_OPTIONS];
  const optionKeys: string[] = options.map(({ key }) => key);
  for (const option of defaults) {
    // If option is not configured in database
    if (!optionKeys.includes(option.key)) {
      // Use default as value
      options.push({ key: option.key, value: option.default });
    }
  }

  // Reduce to object
  return options.reduce((obj, opt) => ({ ...obj, [opt.key]: opt.value }), {});
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Get session
  const session = await getServerlessSession(req, res);
  // Check for authentication
  if (!session || session.user?.permission != UserPermission.ADMIN) {
    return res.status(401).json({ message: "Unauthorized user" });
  }

  try {
    // Get all configuration options
    const config = await getConfig();
    return res.status(200).json({ config });
  } catch (e: unknown) {
    // Catch errors
    if (e instanceof Error) {
      return res.status(500).json({ message: e.message });
    }

    // Return default error
    return res.status(500).json({ message: "Internal server error" });
  }
}
