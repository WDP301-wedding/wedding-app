import { z } from 'zod';

const localDevelopmentHosts = new Set(['localhost', '127.0.0.1', '[::1]', '10.0.2.2']);

function createPublicEnvSchema(runtimeEnvironment: string | undefined) {
  return z.strictObject({
    EXPO_PUBLIC_API_BASE_URL: z.url({ protocol: /^https?$/ }).refine(
      (value) => {
        const url = new URL(value);

        return (
          url.protocol === 'https:' ||
          (runtimeEnvironment !== 'production' && localDevelopmentHosts.has(url.hostname))
        );
      },
      {
        message: 'The public API URL must use HTTPS outside local development.',
      },
    ),
    EXPO_PUBLIC_EAS_PROJECT_ID: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.uuid().optional(),
    ),
  });
}

export type PublicEnv = Readonly<{
  EXPO_PUBLIC_API_BASE_URL: string;
  EXPO_PUBLIC_EAS_PROJECT_ID?: string | undefined;
}>;

export function parsePublicEnv(
  source: Readonly<Record<string, string | undefined>>,
  runtimeEnvironment: string | undefined = process.env.NODE_ENV,
): PublicEnv {
  return createPublicEnvSchema(runtimeEnvironment).parse({
    EXPO_PUBLIC_API_BASE_URL: source.EXPO_PUBLIC_API_BASE_URL,
    EXPO_PUBLIC_EAS_PROJECT_ID: source.EXPO_PUBLIC_EAS_PROJECT_ID,
  });
}

export function readPublicEnv(): PublicEnv {
  return parsePublicEnv({
    EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
    EXPO_PUBLIC_EAS_PROJECT_ID: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
  });
}
