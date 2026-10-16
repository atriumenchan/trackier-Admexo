export function openApiDocument(origin: string) {
  return {
    openapi: "3.0.3",
    info: {
      title: "ADMEXO Track",
      version: "1.0.0",
      description: "Offers, clicks, and advertiser postbacks. Send Authorization: Bearer and the token from Settings.",
    },
    servers: [{ url: origin }],
    components: {
      securitySchemes: { bearer: { type: "http", scheme: "bearer" } },
    },
    security: [{ bearer: [] }],
    paths: {
      "/api/v1/offers": {
        get: {
          summary: "List offers the token can see",
          responses: { "200": { description: "Offer list" }, "401": { description: "Missing or unknown token" } },
        },
      },
      "/api/v1/clicks": {
        get: {
          summary: "List clicks, 50 per page",
          parameters: [{ name: "page", in: "query", schema: { type: "integer", default: 1 } }],
          responses: { "200": { description: "Click list" }, "401": { description: "Missing or unknown token" } },
        },
      },
      "/api/v1/postbacks": {
        post: {
          summary: "Record a conversion for the advertiser who owns the token",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["click_id"],
                  properties: {
                    click_id: { type: "string" },
                    txid: { type: "string" },
                    goal: { type: "string" },
                    status: { type: "string", enum: ["approved", "pending", "rejected"] },
                    payout: { type: "number" },
                    revenue: { type: "number" },
                    amount: { type: "number" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Recorded" }, "400": { description: "Rejected" }, "401": { description: "Advertiser token required" } },
        },
      },
    },
  };
}
