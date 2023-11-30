import { UserPermission } from "@prisma/client";
import { getServerlessSession } from "@utils/auth";
import type { NextApiRequest, NextApiResponse } from "next";
import { type SupportedModel } from "@type/ml/model";
import { getModels } from "@utils/huggingface";

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
    // Collect and return models in alphabetical order
    const models = await getModels();
    return res.status(200).json({
      models: models.sort((a: SupportedModel, b: SupportedModel) => {
        return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
      }),
    });
  } catch (e: unknown) {
    // Catch errors
    if (e instanceof Error) {
      return res.status(500).json({ message: e.message });
    }

    // Return default error
    return res.status(500).json({ message: "Internal server error" });
  }
}
