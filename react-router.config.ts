import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  allowedActionOrigins: [
    "*.myshopify.com",
    "**.myshopify.com",
  ],
} satisfies Config;
