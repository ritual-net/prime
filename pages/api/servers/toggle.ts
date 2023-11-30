import db from "@db/index";
import { getServer } from "@api/servers/get";
import { UserPermission } from "@prisma/client";
import { getServerlessSession } from "@utils/auth";
import { ProviderTypeToInterface } from "@ml/index";
import type { NextApiRequest, NextApiResponse } from "next";
import {
  type Server,
  ServerAction,
  RunningStatus,
  StoppedStatus,
} from "@type/ml/server";

/**
 * Toggles a server via an action
 * @param {string} id server ID
 * @param {ServerAction} action performed action
 */
async function toggleServer(id: string, action: ServerAction) {
  // Get server
  const server: Server = await getServer(id);

  // Preliminary checks
  if (server.status in RunningStatus && action === ServerAction.Start) {
    throw new Error("Running server cannot be started");
  }
  if (server.status in StoppedStatus && action === ServerAction.Stop) {
    throw new Error("Stopped server cannot be stopped");
  }

  // Create provider instance
  const auth = await db.provider.findUnique({
    where: {
      type: server.provider,
    },
  });
  if (!auth) throw new Error("Provider does not exist");
  const provider = new ProviderTypeToInterface[server.provider](auth.key);

  // Run action
  if (action === ServerAction.Start) {
    await provider.startServer(id);
  } else if (action === ServerAction.Stop) {
    await provider.stopServer(id);
  }
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

  // Collect body parameters
  const { id, action }: { id: string; action: ServerAction } = req.body;
  // Check for valid request body
  if (!id || !["start", "stop"].includes(action)) {
    return res.status(400).json({ message: "Invalid parameters" });
  }

  try {
    // Toggle server
    await toggleServer(id, action);
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
