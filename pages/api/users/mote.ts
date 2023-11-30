import db from "@db/index";
import { UserPermission } from "@prisma/client";
import { getServerlessSession } from "@utils/auth";
import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Pro- or De-motes user
 * @param {string} id user ID
 * @param {UserPermission} permission new permission
 */
export async function moteUser(
  id: string,
  permission: UserPermission,
): Promise<void> {
  // Collect existing user
  const user = await db.user.findUnique({ where: { id } });

  // Ensure can't change permission to existing
  if (user?.permission == permission) throw new Error("Permission unchanged");

  // If user permission is admin and this is a demotion
  if (user?.permission == UserPermission.ADMIN) {
    // Get number of admins
    const adminCount: number = await db.user.count({
      where: { permission: UserPermission.ADMIN },
    });

    // Ensure at least one other admin exists
    if (adminCount <= 1) throw new Error("Cannot demote only admin");
  }

  // Update user
  await db.user.update({ where: { id }, data: { permission } });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Get session
  const session = await getServerlessSession(req, res);
  // Check for authentication
  if (!session || session.user?.permission != UserPermission.ADMIN) {
    return res.status(401).json({ message: "Unauthorized user" });
  }

  // Collect modifying id and new permission
  const { id, permission }: { id: string; permission: UserPermission } =
    req.body;
  if (
    !id ||
    !permission ||
    !Object.values(UserPermission).includes(permission)
  ) {
    return res.status(400).json({ message: "Missing parameters" });
  }

  try {
    // Update user
    await moteUser(id, permission);
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
