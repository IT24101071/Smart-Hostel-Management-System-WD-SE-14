import { Redirect } from "expo-router";

export default function WardenIndexRedirect() {
  return <Redirect href="/warden/(tabs)/home" />;
}
