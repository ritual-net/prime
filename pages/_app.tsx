import "globals.css";
import type { AppProps } from "next/app";
import NextNProgress from "nextjs-progressbar";
import { Toaster } from "@generated/toaster";
import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider, useQuery } from "react-query";

const queryClient = new QueryClient();

export default function Prime({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps) {
  return (
    // Inject session
    <QueryClientProvider client={queryClient}>
      <SessionProvider session={session}>
        {/* Progress bar */}
        <NextNProgress color="#000" options={{ showSpinner: false }} />
        <Component {...pageProps} />

        {/* Inject toast notifications */}
        <Toaster />
      </SessionProvider>
    </QueryClientProvider>
  );
}
