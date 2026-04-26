import { Redirect } from "expo-router";

import { useAppStore } from "../src/store/app-store";

export default function IndexRoute() {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  return <Redirect href={isAuthenticated ? "/feed" : "/auth"} />;
}
