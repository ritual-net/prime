import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@generated/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@generated/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogHeader,
} from "@generated/alert-dialog";
import {
  CalendarCheck2,
  Cpu,
  Hash,
  Lock,
  Power,
  PowerOff,
  RotateCw,
  Trash2,
} from "lucide-react";
import { withAuth } from "@utils/auth";
import { useRouter } from "next/router";
import { Button } from "@generated/button";
import { getServer } from "@api/servers/get";
import axios, { type AxiosError } from "axios";
import { useToast } from "@generated/use-toast";
import { UserPermission } from "@prisma/client";
import StatusIndicator from "@components/status";
import Layout, { Sizer } from "@components/layout";
import type { GetServerSidePropsContext } from "next";
import { getSession, useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import {
  type Server,
  ServerAction,
  StoppedStatus,
  RunningStatus,
} from "@type/ml/server";

/**
 * Possible server control panel loading states
 */
enum LoadingState {
  None, // No actions loading
  Start, // Toggle(start) loading
  Stop, // Toggle(stop) loading
  Delete, // Delete modal open
  DeleteFinal, // Deletion loading
}

/**
 * Renders time since last update, accounting for potential to take minutes to update
 * @dev Assumes that the backend update will fail much before a transition beyond 59m 59s
 * @param {number} timeSinceUpdate time since last update in seconds
 * @returns {string} time since last update
 */
export const renderTimeSinceUpdate = (timeSinceUpdate: number): string => {
  // If minutes not relevant, return seconds
  if (timeSinceUpdate < 60) return `${timeSinceUpdate}s`;
  // Else, get num. minutes first
  const seconds: number = timeSinceUpdate % 60;
  const minutes: number = (timeSinceUpdate - seconds) / 60;
  return `${minutes}m ${seconds}s`;
};

export default function Server({ server: defaultServer }: { server: Server }) {
  const { push } = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();

  // Local state
  const [modalOpen, setModalOpen] = useState<boolean>(false); // Deletion modal state
  const [server, setServer] = useState<Server>(defaultServer); // Server details
  const [timeSinceUpdate, setTimeSinceUpdate] = useState<number>(0); // Last checked status
  const [loading, setLoading] = useState<LoadingState>(LoadingState.None); // Loading states

  // Force update if defaultServer different than current server.
  // After first render, defaultServer is ignored otherwise.
  if (server.id != defaultServer.id) {
    setServer(defaultServer);
  }

  // Server configuration subset details (as rendered in table)
  const configuration: { name: string; value: string }[] = [
    { name: "IP", value: server.ip },
    { name: "Provider", value: server.provider },
    { name: "Core count", value: server.specs.cores.toString() },
    { name: "RAM", value: `${server.specs.ram} GB` },
    {
      name: "GPU",
      value: `${server.specs.gpu.count}x ${server.specs.gpu.model}`,
    },
    { name: "Model", value: server.model ?? "" },
  ];

  const reloadServerDetails = useCallback(
    /**
     * Reloads server details from backend, saves to local state
     */
    async () => {
      // Collect updated server details
      const {
        data: { server: updatedServer },
      }: { data: { server: Server } } = await axios.get(
        `/api/servers/get?id=${server.id}`,
      );

      // Ensure returned date is formatted as Date
      updatedServer.createdAt = new Date(updatedServer.createdAt);

      // Update local state
      setServer(updatedServer);
    },
    [server.id],
  );

  /**
   * Toggles server action
   * @param {ServerAction} action to execute
   */
  const toggleServer = useCallback(
    async (action: ServerAction) => {
      try {
        // Toggle loading
        setLoading(
          // If action is to start server
          action === ServerAction.Start
            ? // Set start loading state
              LoadingState.Start
            : // Else, set stop loading state
              LoadingState.Stop,
        );

        // Submit toggle request
        await axios.post("/api/servers/toggle", {
          id: server.id,
          action,
        });

        // Reload server details
        await reloadServerDetails();

        // If successful, toast success
        toast({
          title: `Server ${
            action === ServerAction.Start ? "started" : "stopped"
          }`,
          description: "Server state successfully changed.",
        });
      } catch (e) {
        // Prompt error
        const err = e as AxiosError<Error>;

        toast({
          variant: "destructive",
          title: `Error ${
            action === ServerAction.Start ? "starting" : "stopping"
          } server`,
          description: err.response?.data.message,
        });
      } finally {
        // Toggle loading
        setLoading(LoadingState.None);
      }
    },
    [server.id, toast, reloadServerDetails],
  );

  /**
   * Deletes server
   */
  const deleteServer = useCallback(async () => {
    try {
      // Toggle loading
      setLoading(LoadingState.DeleteFinal);

      // Submit deletion request
      await axios.post("/api/servers/delete", {
        id: server.id,
      });

      // If successful, toast success
      toast({
        title: "Server deleted",
        description: `${server.name} successfully deleted.`,
      });

      // At this point server does not exist, so redirect
      await push("/");
    } catch (e) {
      // Prompt error
      const err = e as AxiosError<Error>;

      toast({
        variant: "destructive",
        title: `Error deleting server`,
        description: err.response?.data.message,
      });
    } finally {
      // Toggle loading
      setLoading(LoadingState.None);
    }
  }, [push, server.id, server.name, toast]);

  /**
   * Update server details every 30 seconds
   */
  useEffect(() => {
    const interval = setInterval(async () => {
      // Collect renewed server details
      await reloadServerDetails();
      // Update time since last update
      setTimeSinceUpdate(0);
    }, 30 * 1000);

    // On unmount, remove interval
    return () => clearInterval(interval);
  }, [reloadServerDetails]);

  /**
   * Update time since last update every second
   */
  useEffect(() => {
    // Every second
    const interval = setInterval(() => {
      // Update time since last check
      setTimeSinceUpdate((previous) => previous + 1);
    }, 1 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Layout session={session}>
      <Sizer>
        {/* General server details */}
        <Card>
          <CardHeader className="flex-row justify-between items-start">
            <div className="pr-4">
              {/* Server name */}
              <CardTitle className="font-medium text-xl">
                {server.name}
              </CardTitle>

              {/* Server description (default = "No server description") */}
              <CardDescription className="text-sm font-light line-clamp-2">
                {server.description === "" || !server.description
                  ? "No server description."
                  : server.description}
              </CardDescription>
            </div>

            {/* Right icon */}
            <div>
              <Cpu className="h-10 w-10" />
            </div>
          </CardHeader>

          <CardContent className="flex flex-col md:flex-row gap-2 md:gap-8 py-3 px-6 text-sm font-light [&>div]:flex [&>div]:items-center break-all">
            {/* Status */}
            <div>
              <StatusIndicator
                status={server.status}
                displayText={true}
                className="mr-3"
              />
            </div>

            {/* ID */}
            <div>
              <Hash className="mr-1 h-4 w-4" />
              <span>{server.id}</span>
            </div>

            {/* Created at */}
            <div>
              <CalendarCheck2 className="mr-1 h-4 w-4" />
              <span>{server.createdAt.toDateString()}</span>
            </div>

            {/* Price */}
            {server.price.hourly && (
              <div>
                <span>
                  ${server.price.hourly} / hour
                  {server.price.monthly &&
                    ` + $${server.price.monthly} / month`}
                </span>
              </div>
            )}

            {/* Last checked time */}
            <div>
              <span>
                Last checked {renderTimeSinceUpdate(timeSinceUpdate)} ago
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Split component */}
        <div className="my-4 flex flex-col md:flex-row gap-4 [&>div]:flex-1">
          {/* Server configuration */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="font-medium text-xl">
                  Configuration
                </CardTitle>
                <CardDescription className="text-sm font-light">
                  Server details and specifications
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table className="[&_th]:px-6 [&_th]:h-10 [&_td]:px-6 [&_td]:py-2">
                <TableHeader>
                  <TableRow>
                    <TableHead>Parameter</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configuration.map(({ name, value }, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-normal">{name}</TableCell>
                      <TableCell className="font-light">{value}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Control panel */}
          <Card className="flex flex-col">
            <CardHeader>
              <div>
                <CardTitle className="font-medium text-xl">
                  Control Panel
                </CardTitle>
                <CardDescription className="text-sm font-light">
                  Manage and modify server state
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-4 flex flex-1">
              {session?.user?.permission === UserPermission.READ ? (
                // If not a READ_WRITE+ user, throw insufficient permissions
                <div className="py-8 flex flex-col w-full justify-center text-center border-2 border-dashed border-zinc-200 rounded-sm">
                  <Lock className="mx-auto mb-4 h-8 w-8" />
                  <h3 className="text-md font-light">
                    Insufficient permissions
                  </h3>
                  <p className="text-sm font-light text-muted-foreground">
                    Only privileged users can manage this server.
                  </p>
                </div>
              ) : (
                // Else, render action buttons
                <div className="flex flex-col gap-3 w-full">
                  <Button
                    // Toggle start
                    onClick={() => toggleServer(ServerAction.Start)}
                    disabled={
                      // Cannot start if server is not stopped
                      !StoppedStatus.has(server.status) ||
                      // Or, if processing any action
                      loading !== LoadingState.None
                    }
                  >
                    {loading === LoadingState.Start ? (
                      <>
                        <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                        <span>Starting server...</span>
                      </>
                    ) : (
                      <>
                        <Power className="mr-2 h-4 w-4" />
                        <span>Start server</span>
                      </>
                    )}
                  </Button>
                  <Button
                    // Toggle stop
                    onClick={() => toggleServer(ServerAction.Stop)}
                    disabled={
                      // Cannot stop if server is not running
                      !RunningStatus.has(server.status) ||
                      // Or, if processing any action
                      loading !== LoadingState.None
                    }
                  >
                    {loading === LoadingState.Stop ? (
                      <>
                        <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                        <span>Stopping server...</span>
                      </>
                    ) : (
                      <>
                        <PowerOff className="mr-2 h-4 w-4" />
                        <span>Stop server</span>
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      // Set loading state + open deletion modal
                      setLoading(LoadingState.Delete);
                      setModalOpen(true);
                    }}
                    variant="destructive"
                    // Disabled if processing any action (not dependent on current server state like others)
                    disabled={loading !== LoadingState.None}
                  >
                    {loading === LoadingState.Delete ||
                    // Keep disabled even if modal is open
                    loading === LoadingState.DeleteFinal ? (
                      <>
                        <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                        <span>Deleting server...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Delete server</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Server deletion modal */}
        <AlertDialog open={modalOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                server and interrupt any running requests. Historic logs will be
                preserved.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  // Close modal, default to no loading
                  setModalOpen(false);
                  setLoading(LoadingState.None);
                }}
                // Disabled if currently processing server deletion
                disabled={loading === LoadingState.DeleteFinal}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={deleteServer}
                // Disabled if currently processing server deletion
                disabled={loading === LoadingState.DeleteFinal}
              >
                {loading === LoadingState.DeleteFinal && (
                  <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                )}
                {loading === LoadingState.DeleteFinal
                  ? "Deleting..."
                  : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Sizer>
    </Layout>
  );
}

export const getServerSideProps = withAuth(
  async (context: GetServerSidePropsContext) => {
    // Collect server ID from URL
    let id: string | string[] | undefined = context.params?.id;

    try {
      // If no ID found, throw error (not caught, just to break control flow)
      if (!id) throw new Error();
      // If more than one ID found, use first
      if (Array.isArray(id)) id = id[0];

      // Collect session details
      const session = await getSession(context);
      // Collect server details by ID
      const server = await getServer(id);

      // Return details
      return {
        props: {
          session,
          server,
        },
      };
    } catch {
      // In case of any errors, redirect to dashboard
      return {
        redirect: {
          destination: "/",
          permanent: false,
        },
      };
    }
  },
);
