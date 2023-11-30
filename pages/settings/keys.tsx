import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@generated/card";
import { withAuth } from "@utils/auth";
import { RotateCw } from "lucide-react";
import axios, { AxiosError } from "axios";
import { Label } from "@generated/label";
import { Input } from "@generated/input";
import { Button } from "@generated/button";
import { ProviderType } from "@prisma/client";
import { getAllKeys } from "@pages/api/keys/all";
import Layout, { Sizer } from "@components/layout";
import { useToast } from "@generated/use-toast";
import { Separator } from "@generated/separator";
import { type GetServerSidePropsContext } from "next";
import { getSession, useSession } from "next-auth/react";
import { useCallback, useState, type KeyboardEvent } from "react";

export default function Keys({
  keys: initialKeys,
}: {
  keys: Record<string, { key: string; email: string; password: string }>;
}) {
  const { toast } = useToast();
  const { data: session } = useSession();

  // Local state
  const [loading, setLoading] = useState<boolean>(false);
  const [keys, setKeys] =
    useState<Record<string, { key: string; email: string; password: string }>>(
      initialKeys,
    );

  /**
   * State handler to update {key, email, password} for a provider
   * @param {string} provider name
   * @param {string} key key to modify
   * @param {string} value value at key to modify
   */
  function handleKeyChange(provider: string, key: string, value: string) {
    setKeys((keys) => ({
      ...keys,
      [provider]: {
        ...keys[provider],
        [key]: value,
      },
    }));
  }

  const updateKeys = useCallback(async () => {
    try {
      // Toggle loading
      setLoading(true);

      // Post update
      await axios.post("/api/keys/update", { keys });

      // If successful, toast success
      toast({
        title: "Update successful",
        description: "Your connected keys have been updated.",
      });
    } catch (e: unknown) {
      // Prompt error
      const err = e as AxiosError<Error>;

      toast({
        variant: "destructive",
        title: "Update unsuccessful",
        description: err.response?.data.message ?? "An unknown error occurred.",
      });
    } finally {
      // Toggle loading
      setLoading(false);
    }
  }, [keys, toast]);

  return (
    <Layout session={session}>
      <Sizer>
        <Card>
          <CardHeader>
            <CardTitle>Connect keys</CardTitle>
            <CardDescription>
              View and modify connected ML provider API keys.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid gap-3">
              {Object.keys(ProviderType).map((provider: string, i: number) => {
                const handleEnter = (e: KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === "Enter") updateKeys();
                };

                // Render input field for each supported provider
                return (
                  <div key={i}>
                    <h4>{provider}</h4>
                    <Separator className="my-2" />

                    {/* Auth inputs */}
                    <div className="flex gap-3 [&>*]:flex-1">
                      {/* Provider key */}
                      <div>
                        <Label htmlFor={`${provider}-key`}>Key</Label>
                        <Input
                          id={`${provider}-key`}
                          type="text"
                          value={keys[provider]?.key}
                          placeholder="API Key"
                          onChange={(e) =>
                            handleKeyChange(provider, "key", e.target.value)
                          }
                          onKeyDown={handleEnter}
                        />
                      </div>

                      {/* Provider email */}
                      <div>
                        <Label htmlFor={`${provider}-email`}>Email</Label>
                        <Input
                          id={`${provider}-email`}
                          type="text"
                          value={keys[provider]?.email ?? ""}
                          placeholder="Email"
                          onChange={(e) =>
                            handleKeyChange(provider, "email", e.target.value)
                          }
                          onKeyDown={handleEnter}
                        />
                      </div>

                      {/* Provider password */}
                      <div>
                        <Label htmlFor={`${provider}-password`}>Password</Label>
                        <Input
                          id={`${provider}-password`}
                          type="password"
                          value={keys[provider]?.password ?? ""}
                          placeholder="hidden"
                          onChange={(e) =>
                            handleKeyChange(
                              provider,
                              "password",
                              e.target.value,
                            )
                          }
                          onKeyDown={handleEnter}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              <Button className="mt-2" onClick={updateKeys} disabled={loading}>
                {loading && <RotateCw className="mr-2 h-4 w-4 animate-spin" />}
                {!loading ? "Update keys" : "Updating keys..."}
              </Button>
            </div>
          </CardContent>
        </Card>
      </Sizer>
    </Layout>
  );
}

export const getServerSideProps = withAuth(
  async (context: GetServerSidePropsContext) => {
    const session = await getSession(context);

    // Collect all provider keys from DB
    const keys = await getAllKeys();

    return {
      props: {
        session,
        keys,
      },
    };
  },
);
