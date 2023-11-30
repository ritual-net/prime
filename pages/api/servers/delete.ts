import db from "@db/index";
import type { BaseProvider } from "@ml/base";
import { getServer } from "@api/servers/get";
import type { Server } from "@type/ml/server";
import { UserPermission } from "@prisma/client";
import { getServerlessSession } from "@utils/auth";
import { ProviderTypeToInterface } from "@ml/index";
import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Deletes server from remote provider and database
 * @param {string} id server ID
 */
async function deleteServer(id: string): Promise<void> {
  // Collect server
  const server: Server = await getServer(id);

  // Collect provider auth details
  const auth = await db.provider.findUnique({
    where: {
      type: server.provider,
    },
  });
  if (!auth) throw new Error("Provider does not exist");

  // Create provider instance
  const provider: BaseProvider = new ProviderTypeToInterface[server.provider](
    auth.key,
  );

  // Delete server from provider
  await provider.deleteServer(id);

  // Delete server from database
  await db.server.delete({ where: { id: id } });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Get session
  const session = await getServerlessSession(req, res);
  // Check for authentication (accessible to all R/W+ users)
  if (
    !session ||
    session.user?.permission === UserPermission.NONE ||
    session.user?.permission === UserPermission.READ
  ) {
    return res.status(401).json({ message: "Unauthorized user" });
  }

  // Collect id from request body
  const { id }: { id: string } = req.body;
  if (!id) return res.status(400).json({ message: "Missing server ID" });

  try {
    // Delete server
    await deleteServer(id);
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
