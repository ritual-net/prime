import { PrismaClient, UserPermission } from "@prisma/client";

async function createAdmin(): Promise<void> {
  const prisma = new PrismaClient();

  // Get number of existing admins
  const numAdmins: number = await prisma.user.count({
    where: { permission: UserPermission.ADMIN },
  });
  console.log("Number of admins: ", numAdmins);

  // Create new admin if none exist
  if (numAdmins == 0) {
    await prisma.user.create({
      data: {
        name: "Ritual Admin",
        email: "admin@ritual.com",
        permission: UserPermission.ADMIN,
      },
    });
    console.log("Created admin at admin@ritual.com");
  }
}

(async () => {
  try {
    await createAdmin();
  } catch (e) {
    console.error(e);
  }
})();
