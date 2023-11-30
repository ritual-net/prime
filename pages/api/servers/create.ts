import db from "@db/index";
import { getServerlessSession } from "@utils/auth";
import { ProviderTypeToInterface } from "@ml/index";
import type { NextApiRequest, NextApiResponse } from "next";
import { UserPermission } from "@prisma/client";
import { validateRunConfig } from "@utils/tgi";
import { RunConfig, ServerConfig } from "@type/ml/server";

/**
 * Creates new server
 * @param {ServerConfig} serverConfig server configuration
 * @param {RunConfig} runConfig run configuration
 * @returns {Promise<string>} server ID
 */
export async function createServer(
  serverConfig: ServerConfig,
  runConfig: RunConfig,
): Promise<string> {
  const { description, name, provider: type } = serverConfig;

  // Check if provider is valid
  const auth = await db.provider.findUnique({
    where: { type },
  });
  if (!auth) throw new Error("Unsupported provider");

  // Instantiate provider
  const provider = new ProviderTypeToInterface[auth.type](auth.key);

  // Create server
  const id = await provider.createServer(serverConfig, runConfig);

  // Create server in database
  await db.server.create({
    data: {
      id,
      name,
      providerId: auth.id,
      description: description ?? "",
      model: runConfig.model_id as string,
    },
  });

  return id;
}

/**
 * Validate server config parameters
 * @param {ServerConfig} serverConfig Server configuration
 * @throws {Error} With specific error message
 */
function validateServerConfig(serverConfig: ServerConfig) {
  const { name, provider, instance, size, region, os } = serverConfig;

  // Throw error if required server configurations are undefined
  if (!name || !provider || !instance || !size || !region || !os) {
    throw new Error("Missing server parameters");
  }

  // Throw error if name is too long
  if (name.length > 30) {
    throw new Error("Name is too long");
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Get session
  const session = await getServerlessSession(req, res);
  // Check for authentication
  if (
    !session ||
    // Require r/w+ permissions
    session.user?.permission === UserPermission.NONE ||
    session.user?.permission === UserPermission.READ
  ) {
    return res.status(401).json({ message: "Unauthorized user" });
  }

  // Get params
  const {
    serverConfig,
    runConfig,
  }: {
    serverConfig: ServerConfig | undefined;
    runConfig: RunConfig | undefined;
  } = req.body;

  // Throw error if params are undefined
  if (!serverConfig || !runConfig) {
    return res.status(400).json({ message: "Missing required params." });
  }

  try {
    // Validate server and run configurations -- throw with specific errors
    validateServerConfig(serverConfig);
    validateRunConfig(runConfig);

    // Create server
    const id = await createServer(serverConfig, runConfig);
    return res.status(200).json({ id });
  } catch (e: unknown) {
    // Catch errors
    if (e instanceof Error) {
      return res.status(500).json({ message: e.message });
    }

    // Return default error
    return res.status(500).json({ message: "Internal server error" });
  }
}
