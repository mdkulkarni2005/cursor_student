import { Redirect, Slot } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";

export default function AuthLayout() {
  const { isSignedIn } = useAuth();
  if (isSignedIn) return <Redirect href="/(app)" />;
  return <Slot />;
}
