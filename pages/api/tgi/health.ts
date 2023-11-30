import { UserPermission } from "@prisma/client";
import { getServerlessSession } from "@utils/auth";
import axios from "axios";
import type { NextApiRequest, NextApiResponse } from "next";

export const checkHealth = async (ip: string): Promise<boolean> => {
  try {
    await axios.get(`http://${ip}:8080/health`);
    return true;
  } catch {
    return false;
  }
};

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

  const { ip } = req.query;
  if (!ip || Array.isArray(ip))
    return res.status(401).json({ message: "No IP provided." });

  if (await checkHealth(ip)) {
    res.status(200).end();
  } else {
    res.status(500).send({ error: "Server not ready" });
  }
}
