import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Productafbeeldingen kunnen via het admin-formulier verwijzen naar een
    // Supabase Storage-URL (zie src/components/admin/ProductForm.tsx). next/image
    // vereist een expliciete allowlist voor externe hosts; hier bewust beperkt tot
    // *.supabase.co in plaats van alle hosts toe te staan.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
};

export default nextConfig;
