export interface Settings {
  baseUrl: string;
  certFilePath: string;
  keyFilePath: string;
}

export function loadSettings(): Settings {
  return {
    baseUrl: readFromEnv("SERVER_BASE_URL"),
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
