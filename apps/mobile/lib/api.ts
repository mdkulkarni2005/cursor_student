import { useMemo } from "react";
import { useAuth } from "@clerk/clerk-expo";
import { StudentOSClient } from "@studentos/api-types";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4173";

/** One client per signed-in session, talking to the same apps/web backend web itself calls. */
export function useApiClient(): StudentOSClient {
  const { getToken } = useAuth();
  return useMemo(() => new StudentOSClient(API_URL, () => getToken()), [getToken]);
}
