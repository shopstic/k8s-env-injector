export interface Settings {
  baseUrl: string;
  certFilePath: string;
  keyFilePath: string;
}

export function loadSettings(): Settings {
  return {
    baseUrl: Deno.env.get("SERVER_BASE_URL")!,
    certFilePath: Deno.env.get("CERT_FILE_PATH")!,
    keyFilePath: Deno.env.get("KEY_FILE_PATH")!,
  };
}
