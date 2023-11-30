import {
  UserPermission,
  type Server as PrismaServer,
  ProviderType,
} from "@prisma/client";
import db from "@db/index";
import { getServerlessSession } from "@utils/auth";
import { ProviderTypeToInterface } from "@ml/index";
import type { NextApiRequest, NextApiResponse } from "next";
import type { ProviderServer, Server } from "@type/ml/server";

/**
 * 1. Collects all remote servers
 * 2. Collects all local servers
 * 3. Filters out remote servers that don't exist locally
 * 4. Deletes local servers that don't exist remotely
 * 5. Returns servers with merged {remote, local}-info
 * @returns {Promise<Server[]>} list of servers
 */
export async function getAllServers(): Promise<Server[]> {
  // Collect all providers
  const p = await db.provider.findMany();

  // Create provider instances
  const providers = p.map((pv) => new ProviderTypeToInterface[pv.type](pv.key));

  // Collect all remote servers (id => server)
  let remoteServers: Record<
    string,
    ProviderServer & { provider: ProviderType }
  > = {};
  for (const provider of providers) {
    // Get type
    const type = provider.type();
    // Collect all servers from provider
    const servers = await provider.getAllServers();
    // Store remote servers
    for (const server of servers) {
      remoteServers[server.id] = {
        ...server,
        provider: type,
      };
    }
  }

  // Collect all local servers
  const s = await db.server.findMany({
    orderBy: {
      name: "asc",
    },
  });
  let localServers: Record<string, PrismaServer> = {};
  for (const server of s) {
    localServers[server.id] = server;
  }

  // Filter out remote servers that don't exist locally
  for (const id of Object.keys(remoteServers)) {
    if (!(id in localServers)) {
      delete remoteServers[id];
    }
  }

  // Delete local servers that don't exist remotely
  let deleteIds: string[] = [];
  for (const id of Object.keys(localServers)) {
    if (!(id in remoteServers)) {
      deleteIds.push(id);
      delete localServers[id];
    }
  }
  await db.server.deleteMany({ where: { id: { in: deleteIds } } });

  // Returns servers with merged {remote, local}-info
  let servers: Server[] = [];
  for (const [id, data] of Object.entries(localServers)) {
    // Selective destructure to avoid sensitive data
    const { name, description, createdAt } = data;

    servers.push({
      name,
      description,
      createdAt,
      ...remoteServers[id],
    });
  }

  return servers;
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
    const servers = await getAllServers();
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
