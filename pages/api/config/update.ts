import db from "@db/index";
import { getServerlessSession } from "@utils/auth";
import type { NextApiRequest, NextApiResponse } from "next";
import { RedactOption, UserPermission } from "@prisma/client";
import { REDACT_KEY_TO_NAME, REDACT_OPTION_SET } from "@utils/redact";

export async function updateConfig(config: Record<string, string>) {
  const options: string[] = Object.keys(REDACT_KEY_TO_NAME);
  const filtered: { key: string; value: RedactOption }[] = Object.entries(
    config,
  )
    .map(([key, value]) => ({ key, value: value as RedactOption }))
    // Filter config where value is type(RedactOption)
    .filter(({ value }) => REDACT_OPTION_SET.includes(value))
    // Filter config where key is in possible options
    .filter(({ key }) => options.includes(key));

  // Update config
  let txs = [];
  // Create update transactions
  for (const c of filtered) {
    txs.push(
      db.configuration.upsert({
        where: {
          key: c.key,
        },
        create: {
          value: c.value,
          key: c.key,
        },
        update: {
          value: c.value,
        },
      }),
    );
  }

  // Batch execute config update
  await db.$transaction(txs);
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

  // Collect new config values from request body
  const { config }: { config: Record<string, string> } = req.body;
  if (!config) return res.status(400).json({ message: "Missing config" });

  try {
    // Update config
    await updateConfig(config);
    return res.status(200).end();
  } catch (e: unknown) {
    // Catch errors
    if (e instanceof Error) {
      return res.status(500).json({ message: e.message });
    }

    // Return default error
    return res.status(500).json({ message: "Internal server error" });
  }
}
