import {writeFileSync} from "node:fs";
import {version} from "./package.json";
writeFileSync("public/version.json", JSON.stringify({version}));
import type { NextConfig } from "next";
const config: NextConfig = {
  env: {NEXT_PUBLIC_APP_VERSION: version},
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
};
export default config;
