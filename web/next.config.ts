import type { NextConfig } from "next";

// All pages in this app are client components (auth token lives in
// localStorage, data comes from the tagalong API at request time), so the
// experimental cache-components prerendering mode has nothing to gain here
// and only fights the dynamic [id]/[code] routes at build time.
const nextConfig: NextConfig = {};

export default nextConfig;
