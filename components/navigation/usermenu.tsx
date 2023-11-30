import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@generated/dropdown-menu";
import { useCallback } from "react";
import { type Session } from "next-auth";
import { signOut } from "next-auth/react";
import { Button } from "@generated/button";
import { UserPermission } from "@prisma/client";
import { Users2, LogOut, User, Key, EyeOff } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@generated/avatar";

export default function UserMenu({
  session,
  permission,
  push,
}: {
  session: Session | null;
  permission: UserPermission;
  push: (path: string) => void;
}) {
  const handleSignOut = useCallback(async () => {
    await signOut();
  }, []);

  return (
    <DropdownMenu>
      {/* Avatar */}
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={session?.user?.image ?? ""}
              alt={`${session?.user?.name}'s avatar`}
            />
            <AvatarFallback>
              {(session?.user?.name ?? "")
                .match(/\b(\w)/g)
                ?.join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      {/* Menu */}
      <DropdownMenuContent className="min-w-30" align="end" forceMount>
        {/* User details */}
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {session?.user?.name}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {session?.user?.email}
            </p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup className="[&>*]:cursor-pointer">
          {/* Account */}
          {permission != UserPermission.NONE && (
            <>
              <DropdownMenuItem onClick={() => push("/settings/account")}>
                <User className="mr-2 h-4 w-4" />
                <span>Account</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {/* Admin settings */}
          {permission == UserPermission.ADMIN && (
            <>
              <DropdownMenuItem onClick={() => push("/settings/users")}>
                <Users2 className="mr-2 h-4 w-4" />
                <span>Manage users</span>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => push("/settings/redaction")}>
                <EyeOff className="mr-2 h-4 w-4" />
                <span>Redaction</span>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => push("/settings/keys")}>
                <Key className="mr-2 h-4 w-4" />
                <span>Connect Keys</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
            </>
          )}

          {/* Logout */}
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
