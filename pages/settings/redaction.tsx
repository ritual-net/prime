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
import { withAuth } from "@utils/auth";
import { RotateCw } from "lucide-react";
import { Button } from "@generated/button";
import { getConfig } from "@api/config/all";
import { useCallback, useState } from "react";
import { RedactOption } from "@prisma/client";
import axios, { type AxiosError } from "axios";
import { useToast } from "@generated/use-toast";
import Layout, { Sizer } from "@components/layout";
import type { GetServerSidePropsContext } from "next";
import { getSession, useSession } from "next-auth/react";
import { REDACT_KEY_TO_NAME, REDACT_OPTION_SET } from "@utils/redact";

export default function Redaction({
  config: defaultConfig,
}: {
  config: Record<string, RedactOption>;
}) {
  const { toast } = useToast();
  const { data: session } = useSession();

  // Local state
  const [loading, setLoading] = useState<boolean>(false);
  const [config, setConfig] =
    useState<Record<string, RedactOption>>(defaultConfig);

  /**
   * Updates config with new values
   * @param {string} key config key
   * @param {RedactOption} value option
   */
  function handleKeyChange(key: string, value: RedactOption) {
    setConfig((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  const updateConfig = useCallback(async () => {
    try {
      // Toggle loading
      setLoading(true);

      // Post update
      await axios.post("/api/config/update", { config });

      // If successful, toast success
      toast({
        title: "Update successful",
        description: "Your redaction settings have been updated",
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
  }, [config, toast]);

  return (
    <Layout session={session}>
      <Sizer>
        <Card>
          <CardHeader>
            <CardTitle>PII Redaction</CardTitle>
            <CardDescription>
              Mask or remove sensitive content from inference requests.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="[&_th]:px-6 [&_td]:px-6 [&_td]:py-2 border-b">
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Sensitivity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(config).map(([key, value], i) => (
                    // For each config K/V pair
                    <TableRow key={i}>
                      <TableCell>{REDACT_KEY_TO_NAME[key]}</TableCell>
                      <TableCell>
                        <div className="flex gap-3">
                          {REDACT_OPTION_SET.map((option, i) => (
                            // For each possible redaction option
                            <Button
                              key={i}
                              onClick={() =>
                                handleKeyChange(key, option as RedactOption)
                              }
                              disabled={value === option}
                              className="text-sm font-light disabled:opacity-100 disabled:cursor-not-allowed disabled:pointer-events-auto"
                              variant={value === option ? "default" : "outline"}
                            >
                              {option}
                            </Button>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col px-6 pt-3 pb-5">
              <Button
                className="mt-2"
                onClick={updateConfig}
                disabled={loading}
              >
                {loading && <RotateCw className="mr-2 h-4 w-4 animate-spin" />}
                {!loading
                  ? "Update configuration"
                  : "Updating configuration..."}
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

    // Collect config k/v from DB
    const config = await getConfig();

    return {
      props: {
        session,
        config,
      },
    };
  },
);
