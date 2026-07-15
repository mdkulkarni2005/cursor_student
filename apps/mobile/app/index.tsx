import { Redirect } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { ActivityIndicator, View } from "react-native";

/** Root entry — routes to the signed-in app or the sign-in screen based on Clerk's session state. */
export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Redirect href={isSignedIn ? "/(app)" : "/(auth)/sign-in"} />;
}
