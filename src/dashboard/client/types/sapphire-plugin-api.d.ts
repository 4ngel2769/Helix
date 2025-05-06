declare module '@sapphire/plugin-api' {
  export interface AuthData {
    id: string;
    token: string;
    expires: number;
  }

  export interface ApiRequest {
    auth?: AuthData | null;
  }
}