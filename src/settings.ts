export interface Settings {
  baseUrl: string;
}

export function loadSettings(): Settings {
  return {
    baseUrl: Deno.env.get("SERVER_BASE_URL")!,
  };
}
