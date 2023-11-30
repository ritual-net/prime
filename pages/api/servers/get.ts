import db from "@db/index";
import type { Server } from "@type/ml/server";
import { UserPermission } from "@prisma/client";
import { getServerlessSession } from "@utils/auth";
import { ProviderTypeToInterface } from "@ml/index";
import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Gets server from database and remote provider
 * @param {string} id server ID
 * @returns {Promise<Server>} server details
 */
export async function getServer(id: string): Promise<Server> {
  // Collect server from Database by ID
  const server = await db.server.findUnique({
    where: { id: id },
    include: {
      // Include provider details to use for interface setup
      provider: {
        select: {
          type: true,
          key: true,
        },
      },
    },
  });
  // If server not found in DB, throw error
  if (!server) throw new Error("Server does not exist");

  // Create provider instance
  const provider = new ProviderTypeToInterface[server.provider.type](
    server.provider.key,
  );

  // Collect server info
  const serverInfo = await provider.getServer(id);

  return {
    name: server.name,
    description: server.description ?? "",
    createdAt: server.createdAt,
    provider: server.provider.type,
    model: server.model ?? "",
    ...serverInfo,
  };
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

  // Collect query parameters
  let { id } = req.query;
  if (!id) return res.status(400).json({ message: "Missing server ID" });

  // Assign first ID (no bulk requests)
  if (Array.isArray(id)) id = id[0];

  try {
    // Collect and return server
    const server = await getServer(id);
    return res.status(200).json({ server });
  } catch (e: unknown) {
    // Catch errors
    if (e instanceof Error) {
      return res.status(500).json({ message: e.message });
    }

    // Return default error
    return res.status(500).json({ message: "Internal server error" });
  }
}
