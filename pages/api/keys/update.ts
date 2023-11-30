import db from "@db/index";
import { getServerlessSession } from "@utils/auth";
import { ProviderTypeToInterface } from "@ml/index";
import type { NextApiRequest, NextApiResponse } from "next";
import { UserPermission, ProviderType } from "@prisma/client";

/**
 * Updates keys in database
 * @param {Record<string, { key: string }>} keys provider type to key, email, password
 */
export async function updateKeys(
  keys: Record<string, { key: string; email?: string; password?: string }>,
) {
  // Collect supported provider types
  const supportedProviderTypes: string[] = Object.values(ProviderType);

  // Collect all providers (w/ associated servers)
  const providers = await db.provider.findMany({
    include: { servers: true },
  });

  // Create mapping of provider type => { key, used, email, password }
  let dbKeys: Record<
    string,
    { key: string; used: boolean; email?: string; password?: string }
  > = {};
  for (const provider of providers) {
    dbKeys[provider.type as string] = {
      key: provider.key,
      email: provider.email ?? undefined,
      password: provider.password ?? undefined,
      used: provider.servers.length > 0,
    };
  }

  let txs = [];
  for (const [providerName, { key, email, password }] of Object.entries(keys)) {
    // Skip if {key, email, password} is not provided
    if (!key || !email || !password) continue;

    // Skip if {key, email, password} provided is not different from the one in DB
    if (
      dbKeys[providerName]?.key == key &&
      dbKeys[providerName]?.email == email &&
      dbKeys[providerName]?.password == password
    )
      continue;

    // Throw error if modifying key data for an unsupported provider
    if (!supportedProviderTypes.includes(providerName)) {
      throw new Error(`Unsupported provider: ${providerName}`);
    }

    // Throw error if modifying key data for a used provider
    if (dbKeys[providerName]?.used) {
      throw new Error(`Cannot modify key (${providerName}) currently in use`);
    }

    // Create new provider for each key type
    const provider = new ProviderTypeToInterface[providerName as ProviderType](
      key,
      email,
      password,
    );

    // Verify provided {key, email, password} data is correct
    const validKeys: boolean = await provider.isAuth();
    if (!validKeys) throw new Error(`Invalid credentials for ${providerName}`);

    // Upsert provider in DB
    txs.push(
      db.provider.upsert({
        where: { type: providerName as ProviderType },
        create: {
          type: providerName as ProviderType,
          key,
          email,
          password,
        },
        update: {
          key,
          email,
          password,
        },
      }),
    );
  }

  // Throw error if no work to be done
  if (txs.length == 0) throw new Error("No new key data provided");

  // Insert to DB
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

  // Collect keys from request body
  const { keys }: { keys: Record<string, { key: string }> } = req.body;
  if (!keys) return res.status(400).json({ message: "Missing keys" });

  try {
    // Update keys
    await updateKeys(keys);
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
