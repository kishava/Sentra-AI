export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { ensurePlatformSecrets, schedulePlatformSecretsRefresh } = await import(
    "@/lib/secrets/platform-secrets"
  );
  await ensurePlatformSecrets(true);
  schedulePlatformSecretsRefresh();
}
