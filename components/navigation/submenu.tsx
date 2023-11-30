import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@generated/navigation-menu";
import { useRouter } from "next/router";
import { type Session } from "next-auth";
import { UserPermission } from "@prisma/client";

export default function SubMenu({ session }: { session: Session | null }) {
  const { asPath: pathname, push } = useRouter();

  // Permission level
  const permission: UserPermission = session?.user?.permission ?? "NONE";

  // Conditional rendering by pathname
  if (pathname.startsWith("/settings")) {
    return (
      <SubMenuGeneral
        links={[
          { name: "Account", path: "/settings/account", admin: false },
          {
            name: "Manage Users",
            path: "/settings/users",
            admin: true,
          },
          { name: "Redaction", path: "/settings/redaction", admin: true },
          { name: "Keys", path: "/settings/keys", admin: true },
        ]}
        currentPath={pathname}
        permission={permission}
        push={push}
      />
    );
  } else if (pathname.startsWith("/server")) {
    // Collect server ID
    // "" + (/) + server + (/) + ID + (/) + ...
    const id: string = pathname.split("/")[2];

    return (
      <SubMenuGeneral
        links={[
          { name: "Server", path: `/server/${id}`, admin: false },
          {
            name: "Playground",
            path: `/server/${id}/playground`,
            admin: false,
          },
          { name: "Usage", path: `/server/${id}/usage`, admin: false },
        ]}
        currentPath={pathname}
        permission={permission}
        push={push}
      />
    );
  }
  {
    return <></>;
  }
}

function SubMenuGeneral({
  links,
  currentPath,
  permission,
  push,
}: {
  links: { name: string; path: string; admin: boolean }[];
  currentPath: string;
  permission: UserPermission;
  push: (path: string) => void;
}) {
  return (
    <div className="border-b bg-zinc-900 w-full flex h-12 items-center px-4">
      <div className="mx-auto">
        <NavigationMenu>
          <NavigationMenuList className="grid gap-6 grid-flow-col">
            {links.map((link, i) => {
              // Hide admin links from non-admins
              if (link.admin && permission != UserPermission.ADMIN) {
                return <></>;
              }

              return (
                // Render link
                <NavigationMenuItem
                  key={i}
                  className="flex items-center cursor-pointer hover:opacity-70 transition-opacity"
                  onClick={() => push(link.path)}
                >
                  <span
                    className={
                      currentPath == link.path
                        ? "text-zinc-100"
                        : "text-zinc-500"
                    }
                  >
                    {link.name}
                  </span>
                </NavigationMenuItem>
              );
            })}
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </div>
  );
}
