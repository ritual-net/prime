import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@generated/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@generated/select";
import {
  AlertDialog,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@generated/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@generated/table";
import { PERMISSIONS, withAuth } from "@utils/auth";
import { useRouter } from "next/router";
import { Input } from "@generated/input";
import { Label } from "@generated/label";
import type { User } from "@type/db/user";
import { Button } from "@generated/button";
import { useCallback, useState } from "react";
import axios, { type AxiosError } from "axios";
import { Edit2, RotateCw } from "lucide-react";
import { UserPermission } from "@prisma/client";
import { useToast } from "@generated/use-toast";
import Layout, { Sizer } from "@components/layout";
import { getAllUsers } from "@pages/api/users/all";
import { type GetServerSidePropsContext } from "next";
import { getSession, useSession } from "next-auth/react";

// Options for dialog modal
enum ModalOption {
  INVITE,
  MODIFY,
}

export default function Users({ users: initialUsers }: { users: User[] }) {
  // Router
  const { push } = useRouter();
  // Toast notifications
  const { toast } = useToast();
  // Session data
  const { data: session, update } = useSession();

  // State
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [modal, setModal] = useState<ModalOption | null>(null);
  const [loadingInvite, setLoadingInvite] = useState<boolean>(false);
  const [loadingModify, setLoadingModify] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [permission, setPermission] = useState<UserPermission>(
    UserPermission.READ,
  );
  const [modifying, setModifying] = useState<User | null>(null);

  const handleDelete = useCallback(async () => {
    try {
      // Toggle loading, close dialog
      setLoadingModify(modifying?.id ?? null);
      setModal(null);

      // Post deletion
      await axios.post("/api/users/delete", { id: modifying?.id });

      // Remove from users
      setUsers((prevUsers) => [
        ...prevUsers.filter((user) => user.id !== modifying?.id),
      ]);

      // Refresh session (if deleting self)
      if (modifying?.email === session?.user?.email) {
        await update();
      }

      // Prompt success
      toast({
        title: "Deletion successful",
        description: "The user has been deleted.",
      });
    } catch (e: unknown) {
      // Prompt error
      const err = e as AxiosError<Error>;

      toast({
        variant: "destructive",
        title: "Deletion unsuccessful",
        description: err.response?.data.message ?? "An unknown error occurred.",
      });
    } finally {
      // Toggle loading
      setLoadingModify(null);
    }
  }, [modifying?.id, modifying?.email, session?.user?.email, update, toast]);

  const handleModify = useCallback(async () => {
    try {
      // Toggle loading, close dialog
      setLoadingModify(modifying?.id ?? null);
      setModal(null);

      // Post modification
      await axios.post("/api/users/mote", {
        id: modifying?.id,
        permission: modifying?.permission,
      });

      // Update users
      setUsers((prevUsers) => [
        ...prevUsers.map((user) =>
          user.id === modifying?.id
            ? { ...user, permission: modifying?.permission }
            : user,
        ),
      ]);

      // Refresh session (if demoting self)
      if (modifying?.email === session?.user?.email) {
        await update();
        // Redirect to dashboard
        await push("/");
      }

      // Prompt success
      toast({
        title: "Modification successful",
        description: "The user has been modified.",
      });
    } catch (e: unknown) {
      // Prompt error
      const err = e as AxiosError<Error>;

      toast({
        variant: "destructive",
        title: "Modification unsuccessful",
        description: err.response?.data.message ?? "An unknown error occurred.",
      });
    } finally {
      // Toggle loading
      setLoadingModify(null);
    }
  }, [
    modifying?.id,
    modifying?.permission,
    modifying?.email,
    session?.user?.email,
    update,
    push,
    toast,
  ]);

  const handleInvite = useCallback(async () => {
    try {
      // Toggle loading, close dialog
      setLoadingInvite(true);
      setModal(null);

      // Post invite
      const {
        data: { user },
      }: {
        data: { user: Omit<User, "createdAt"> & { createdAt: string } };
      } = await axios.post("/api/users/invite", {
        email,
        permission,
      });

      // Append to users
      const { createdAt }: { createdAt: string } = user;
      setUsers((prevUsers) => [
        ...prevUsers,
        {
          ...user,
          createdAt: new Date(createdAt),
        },
      ]);

      // Clear inputs
      setEmail("");
      setPermission(UserPermission.READ);

      // Prompt success
      toast({
        title: "Invite successful",
        description: "The user has been invited.",
      });
    } catch (e: unknown) {
      // Prompt error
      const err = e as AxiosError<Error>;

      toast({
        variant: "destructive",
        title: "Invite unsuccessful",
        description: err.response?.data.message ?? "An unknown error occurred.",
      });
    } finally {
      // Toggle loading
      setLoadingInvite(false);
    }
  }, [toast, email, permission]);

  return (
    <Layout session={session}>
      <Sizer>
        <div className="flex flex-col gap-6">
          {/* User details */}
          <Card>
            <CardHeader>
              <CardTitle>All users</CardTitle>
              <CardDescription>Manage all active users</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="[&_th]:px-6 [&_td]:px-6 [&_td]:py-2">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Permission</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user, i) => (
                      <TableRow key={i}>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.permission}</TableCell>
                        <TableCell>{user.createdAt.toDateString()}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            className="text-sm font-light"
                            onClick={() => {
                              setModifying(user);
                              setModal(ModalOption.MODIFY);
                            }}
                            disabled={loadingModify === user.id}
                            variant="outline"
                          >
                            {loadingModify === user.id ? (
                              <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Edit2 className="w-3 h-3 mr-2" />
                            )}
                            <span>Modify</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Modify user dialog */}
          <AlertDialog open={modal == ModalOption.MODIFY}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Modify user</AlertDialogTitle>
                <AlertDialogDescription>
                  Configure permissions for {modifying?.name} or permanently
                  delete.
                </AlertDialogDescription>
                <div className="my-4">
                  <Label htmlFor="permissions">Permissions</Label>
                  <Select
                    value={modifying?.permission as string}
                    onValueChange={(value: string) => {
                      setModifying({
                        ...(modifying as User),
                        permission: value as UserPermission,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select permissions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Permissions</SelectLabel>
                        {[
                          UserPermission.READ,
                          UserPermission.READ_WRITE,
                          UserPermission.ADMIN,
                        ].map((permission: UserPermission) => (
                          <SelectItem
                            key={permission as string}
                            value={permission}
                          >
                            {permission}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={() => {
                    setModal(null);
                    setModifying(null);
                  }}
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  Delete
                </AlertDialogAction>
                <AlertDialogAction onClick={handleModify}>
                  Modify
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Invite users */}
          <Card>
            <CardHeader>
              <CardTitle>Invite user</CardTitle>
              <CardDescription>Invite a new user via email</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {/* Email */}
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    id="email"
                    type="email"
                    placeholder="john@doe.com"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && email !== "") {
                        handleInvite();
                      }
                    }}
                  />
                </div>

                {/* Permissions */}
                <div>
                  <Label htmlFor="permissions">Permissions</Label>
                  <Select
                    value={permission as string}
                    onValueChange={(value: string) =>
                      setPermission(value as UserPermission)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select permissions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Permissions</SelectLabel>
                        {[
                          UserPermission.READ,
                          UserPermission.READ_WRITE,
                          UserPermission.ADMIN,
                        ].map((permission: UserPermission) => (
                          <SelectItem
                            key={permission as string}
                            value={permission}
                          >
                            {permission}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="mt-2"
                  onClick={() => setModal(ModalOption.INVITE)}
                  disabled={
                    loadingInvite || modal == ModalOption.INVITE || email == ""
                  }
                >
                  {loadingInvite && (
                    <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {loadingInvite && "Inviting user..."}
                  {email == "" && "Enter an email to invite"}
                  {!loadingInvite && email != "" && "Invite user"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Invite users confirmation dialog */}
          <AlertDialog open={modal == ModalOption.INVITE}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  <span>
                    This action immediately grants the user with email {email}{" "}
                    {
                      {
                        [UserPermission.NONE]: "no access to the dashboard",
                        [UserPermission.READ]:
                          "read-only access to all servers",
                        [UserPermission.READ_WRITE]:
                          "read-write access to all servers and the ability to create new servers",
                        [UserPermission.ADMIN]:
                          "administrative access to all servers, access to add and remove users, and access to see and connect keys",
                      }[permission]
                    }
                    .
                  </span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setModal(null)}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction onClick={handleInvite}>
                  Continue
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Sizer>
    </Layout>
  );
}

export const getServerSideProps = withAuth(
  async (context: GetServerSidePropsContext) => {
    // Get session details
    const session = await getSession(context);

    // Collect all users
    const users = await getAllUsers();

    // Return session as prop
    return {
      props: {
        session,
        users,
      },
    };
  },
);
