import db from "@db/index";
import type { BaseProvider } from "@ml/base";
import { UserPermission } from "@prisma/client";
import { getServerlessSession } from "@utils/auth";
import { ProviderTypeToInterface } from "@ml/index";
import type { NextApiRequest, NextApiResponse } from "next";
import type { Configuration } from "@type/ml/configuration";

/**
 * Gets all configurations from all providers
 * @returns {Record<string, Configuration[]>} provider => configurations
 */
export async function getConfigurations(): Promise<
  Record<string, Configuration[]>
> {
  // Collect all providers
  const providers = await db.provider.findMany();

  // Generate provider instances
  let providerToInstance: Record<string, BaseProvider> = {};
  for (const provider of providers) {
    providerToInstance[provider.type] = new ProviderTypeToInterface[
      provider.type
    ](provider.key);
  }

  // Aggregate plans for each provider instance
  let providerToPlans: Record<string, Configuration[]> = {};
  for (const [type, instance] of Object.entries(providerToInstance)) {
    providerToPlans[type] = await instance.getConfigurations();
  }
  return providerToPlans;
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
    // Accessible to all R/W+ users
    session.user?.permission == UserPermission.NONE ||
    session.user?.permission == UserPermission.READ
  ) {
    return res.status(401).json({ message: "Unauthorized user" });
  }

  try {
    const configurations = await getConfigurations();
    return res.status(200).json({ configurations });
  } catch (e: unknown) {
    // Catch errors
    if (e instanceof Error) {
      return res.status(500).json({ message: e.message });
    }

    // Return default error
    return res.status(500).json({ message: "Internal server error" });
  }
}
