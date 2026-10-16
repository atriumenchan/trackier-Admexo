export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { bootGoogleClickRoutes } = await import("./lib/google-boot");
    await bootGoogleClickRoutes();
  }
}
