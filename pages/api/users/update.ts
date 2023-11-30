import db from "@db/index";
import { UserPermission } from "@prisma/client";
import { getServerlessSession } from "@utils/auth";
import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Updates user details
 * @param {string} id user ID to update
 * @param {string} name name to update
 */
export async function updateUser(id: string, name: string): Promise<void> {
  // Ensure min and max lengths
  if (name && (name.length < 3 || name.length > 40)) {
    throw new Error("Name must be between 3-40 characters");
  }

  // Update user
  await db.user.update({ where: { id }, data: { name } });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Get session
  const session = await getServerlessSession(req, res);
  // Check for authentication
  if (!session || session.user?.permission == UserPermission.NONE) {
    return res.status(401).json({ message: "Unauthorized user" });
  }

  // Ensure at least one updateable parameter exists
  const { name }: { name: string } = req.body;
  if ([name].every((param) => param === "" || param === undefined)) {
    return res.status(400).json({ message: "Missing updateable parameters" });
  }

  // Update user
  try {
    await updateUser(session?.user?.id ?? "", name);
    return res.status(200).end();
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
}
