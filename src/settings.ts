export interface Settings {
  baseUrl: string;
  defaultConfigMapPrefix: string;
  certFilePath: string;
  keyFilePath: string;
}

export function loadSettings(): Settings {
  return {
    baseUrl: readFromEnv("SERVER_BASE_URL"),
    defaultConfigMapPrefix: readFromEnv("DEFAULT_CONFIG_MAP_PREFIX"),
    certFilePath: readFromEnv("CERT_FILE_PATH"),
    keyFilePath: readFromEnv("KEY_FILE_PATH"),
  };
}

function readFromEnv(envName: string): string {
  const result = Deno.env.get(envName);
  if (result === undefined) {
    throw new Error(`Enviroment variable ${envName} is required.`);
  }
  return result;
}
