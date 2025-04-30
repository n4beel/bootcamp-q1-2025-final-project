import { createCivicAuthPlugin } from "@civic/auth/nextjs"
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  }
};

const withCivicAuth = createCivicAuthPlugin({
  clientId: "2ae0fc36-b3cb-478c-9ae7-8b6720e67594"
});

export default withCivicAuth(nextConfig);
