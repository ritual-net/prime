import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@generated/card";
import { RotateCw } from "lucide-react";
import { Input } from "@generated/input";
import { Label } from "@generated/label";
import { useSession } from "next-auth/react";
import { Button } from "@generated/button";
import { useCallback, useState } from "react";
import axios, { type AxiosError } from "axios";
import { useToast } from "@generated/use-toast";
import Layout, { Sizer } from "@components/layout";
import { withAuthOnlySessionReturned } from "@utils/auth";

export default function Account() {
  const { toast } = useToast();
  const { data: session, update } = useSession();
  const [name, setName] = useState<string>(session?.user?.name ?? "");
  const [email, _] = useState<string>(session?.user?.email ?? "");
  const [loading, setLoading] = useState<boolean>(false);

  /**
   * Posts the updated account details to the server
   */
  const updateAccountDetails = useCallback(async () => {
    try {
      // Toggle loading
      setLoading(true);

      // Post new details
      await axios.post("/api/users/update", {
        name,
      });

      // Await session update
      await update();

      toast({
        title: "Update successful",
        description: "Your account details have been updated.",
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
  }, [name, toast, update]);

  return (
    <Layout session={session}>
      <Sizer>
        {/* Account details */}
        <Card>
          <CardHeader>
            <CardTitle>Account details</CardTitle>
            <CardDescription>
              View and modify your account details
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid gap-3">
              {/* Name */}
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  type="text"
                  placeholder="John Doe"
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && name !== "")
                      updateAccountDetails();
                  }}
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  placeholder="john@doe.com"
                  disabled
                />
              </div>

              <Button
                className="mt-2"
                onClick={updateAccountDetails}
                disabled={loading || name === ""}
              >
                {loading && <RotateCw className="mr-2 h-4 w-4 animate-spin" />}
                {loading
                  ? "Updating details..."
                  : name === ""
                  ? "Enter name"
                  : "Update details"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </Sizer>
    </Layout>
  );
}

export const getServerSideProps = withAuthOnlySessionReturned();
