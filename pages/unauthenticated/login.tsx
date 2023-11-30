import Link from "next/link";
import Image from "next/image";
import { RotateCw } from "lucide-react";
import { signIn } from "next-auth/react";
import { Input } from "@generated/input";
import { Button } from "@generated/button";
import { useState, useCallback } from "react";
import { ToastAction } from "@generated/toast";
import { useToast } from "@generated/use-toast";
import { withAuthOnlySessionReturned } from "@utils/auth";

export default function Login() {
  const { toast } = useToast();
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  /**
   * Handles the login flow
   */
  const handleLogin = useCallback(async () => {
    try {
      // Toggle loading
      setLoading(true);

      // Execute sign in flow
      const res = await signIn("email", {
        email,
        redirect: false,
        callbackUrl: "/",
      });
      if (!res || !res.ok) throw new Error("Failed to sign in");

      // Show success toast
      toast({
        title: "Please check your email",
        description: "We've sent you a link to sign in.",
      });
    } catch (error) {
      // Show error toast
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong",
        description: "There was a problem trying to log you in.",
        action: <ToastAction altText="Try again">Try Again</ToastAction>,
      });
    } finally {
      setLoading(false);
    }
  }, [toast, email]);

  return (
    <div className="flex flex-row h-screen">
      {/* Right image feature */}
      <div className="hidden lg:flex flex-col justify-end w-1/2 relative">
        <div className="flex text-right justify-end z-10 font-medium p-6">
          <div className="max-w-[600px]">
            <p className="mb-2 text-zinc-200">
              Rendered by a machine learning model.
            </p>
            <p className="text-zinc-400">
              Detailed isometric server farm, pixel art, unreal engine voxel
              render, video games, very cozy, nostalgia, man working on server
              rack, tilt-shift, c4d render.
            </p>
          </div>
        </div>

        <div>
          <Image
            fill={true}
            style={{ objectFit: "cover" }}
            src="/splash/servers.jpg"
            alt="Stable Diffusion servers"
          />
        </div>
      </div>

      {/* Left authentication section */}
      <div className="w-full lg:w-1/2">
        <div className="flex flex-col justify-center items-center h-full">
          {/* Logo */}
          <div>
            <Link
              href="/unauthenticated/login"
              className="hover:opacity-70 transition-opacity"
            >
              <Image
                src="/vector/logo.svg"
                alt="Ritual logo"
                className="mx-auto mb-8"
                width={125}
                height={35}
              />
            </Link>
          </div>

          {/* Auth card */}
          <div className="text-center max-w-[400px]">
            <h1 className="font-semibold mb-2">Authentication Required</h1>
            <p className="font-light text-zinc-400">
              Enter your email below to access your account.
            </p>
            <div className="grid gap-3 my-6">
              <Input
                id="email"
                type="email"
                placeholder="john@doe.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && email !== "") handleLogin();
                }}
              />
              <Button onClick={handleLogin} disabled={loading || email === ""}>
                {loading && <RotateCw className="mr-2 h-4 w-4 animate-spin" />}
                {loading
                  ? "Sending invite..."
                  : email === ""
                  ? "Enter email"
                  : "Login with email"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps = withAuthOnlySessionReturned();
