import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { type Session } from "next-auth";
import { PlusCircle } from "lucide-react";
import { Button } from "@generated/button";
import { UserPermission } from "@prisma/client";
import UserMenu from "@components/navigation/usermenu";
import ServerList from "@components/navigation/serverlist";

export default function Navbar({ session }: { session: Session | null }) {
  // Navigation
  const { push } = useRouter();

  // Rendering logic
  const permission: UserPermission = session?.user?.permission ?? "NONE";

  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4 2xl:px-8 2xl:mx-auto 2xl:max-w-[1000px] ">
        {/* Logo */}
        <Link href="/" className="hover:opacity-70 transition-opacity">
          <Image
            src="/vector/logo.svg"
            alt="Ritual logo"
            width={60}
            height={60}
          />
        </Link>

        {/* Server switcher */}
        {permission != UserPermission.NONE && (
          <div className="mx-6 hidden sm:flex">
            <ServerList permission={permission} />
          </div>
        )}

        <div className="ml-auto flex items-center space-x-4">
          {/* Create server button */}
          {(permission == UserPermission.ADMIN ||
            permission == UserPermission.READ_WRITE) && (
            <Button onClick={() => push("/create")}>
              <PlusCircle className="mr-2 h-4 w-4" />
              <span>Create server</span>
            </Button>
          )}

          {/* User menu */}
          <UserMenu session={session} permission={permission} push={push} />
        </div>
      </div>
    </div>
  );
}
