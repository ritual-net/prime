import { UserPermission } from "@prisma/client";
import db from "@db/index";
import { getServerlessSession } from "@utils/auth";
import type { NextApiRequest, NextApiResponse } from "next";
import type { ServerMetadata } from "@type/ml/server";

/**
 * 1. Collects all local servers
 * 2. Returns names and associated IDs of local servers
 * @returns {Promise<ServerMetadata[]>} list of servers
 */
export async function getAllLocalServerNames(): Promise<ServerMetadata[]> {
  // Collect all local servers
  const localServers = await db.server.findMany({
    select: {
      id: true,
      name: true,
    },
  });
  return localServers;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Get session
  const session = await getServerlessSession(req, res);
  // Check for authentication (accessible to all approved users)
  if (!session || session.user?.permission === UserPermission.NONE) {
    return res.status(401).json({ message: "Unauthorized user" });
  }

  try {
    // Collect servers
    const servers = await getAllLocalServerNames();
    return res.status(200).json({ servers });
  } catch (e: unknown) {
    // Catch errors
    if (e instanceof Error) {
      return res.status(500).json({ message: e.message });
    }

    // Return default error
    return res.status(500).json({ message: "Internal server error" });
  }
}
