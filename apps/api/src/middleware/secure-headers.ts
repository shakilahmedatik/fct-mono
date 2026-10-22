import { secureHeaders } from "hono/secure-headers";

const isProd = process.env.NODE_ENV === "production";

export const secureHeadersMiddleware = secureHeaders({
  xFrameOptions: "DENY",
  xContentTypeOptions: "nosniff",
  referrerPolicy: "strict-origin-when-cross-origin",
  // HSTS is only meaningful (and only safe to assert) over TLS.
  strictTransportSecurity: isProd ? "max-age=31536000; includeSubDomains" : false,
  contentSecurityPolicy: {
    defaultSrc: ["'none'"],
    baseUri: ["'none'"],
    formAction: ["'none'"],
    frameAncestors: ["'none'"],
    objectSrc: ["'none'"],
    scriptSrc: ["'none'"],
    styleSrc: ["'none'"],
    imgSrc: ["'none'"],
    connectSrc: ["'none'"],
  },
});
