import db from "@db/index";
import { UserPermission } from "@prisma/client";
import { getServerlessSession } from "@utils/auth";
import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Get all provider keys
 * @returns {Record<string, { key: string }>} key type to key, email
 */
export async function getAllKeys(): Promise<
  Record<string, { key: string; email?: string }>
> {
  // Collect all keys
  const providers = await db.provider.findMany();
  let providerToKeys: Record<string, { key: string; email?: string }> = {};
  for (const provider of providers) {
    const { type, key, email } = provider;
    providerToKeys[type as string] = {
      key,
      email: email ?? "",
    };
  }
  return providerToKeys;
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
    // Get all keys
    const keys = await getAllKeys();
    return res.status(200).json({ keys });
  } catch (e: unknown) {
    // Catch errors
    if (e instanceof Error) {
      return res.status(500).json({ message: e.message });
    }

    // Return default error
    return res.status(500).json({ message: "Internal server error" });
  }
}
