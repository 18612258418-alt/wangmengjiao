/**
 * ApiConfigContext — previously held client-side API keys.
 * Keys have been moved to server-side Vercel Edge functions (api/doubao.ts, api/deepseek.ts).
 * This context is kept as a lightweight shell in case future non-sensitive config is needed.
 */
import { createContext, useContext, type ReactNode } from "react";

export interface ApiConfig {
  // Reserved for future non-sensitive client config
  _placeholder?: never;
}

const ApiConfigContext = createContext<ApiConfig>({});

export function ApiConfigProvider({ children }: { children?: ReactNode }) {
  return <ApiConfigContext.Provider value={{}}>{children}</ApiConfigContext.Provider>;
}

export function useApiConfig(): ApiConfig {
  return useContext(ApiConfigContext);
}
