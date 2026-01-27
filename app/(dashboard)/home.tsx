import { useAuth } from "@/hooks/useAuth";
import React from "react";
import { Image, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Home = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const displayName =
    user?.displayName ||
    (user?.email ? user.email.split("@")[0] : "") ||
    "User";
  const photoUrl = user?.photoURL || "";
  const initial = String(displayName).trim().charAt(0).toUpperCase() || "U";

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      <View className="bg-white px-6 py-4 flex-row items-center justify-between border-b border-gray-200">
        <View className="flex-row items-center">
          {photoUrl ? (
            <Image
              source={{ uri: photoUrl }}
              className="w-11 h-11 rounded-full bg-gray-200"
            />
          ) : (
            <View className="w-11 h-11 rounded-full bg-gray-200 items-center justify-center">
              <Text className="text-gray-700 font-bold">{initial}</Text>
            </View>
          )}

          <View className="ml-3">
            <Text className="text-xs text-gray-500">Welcome</Text>
            <Text className="text-lg font-semibold text-gray-900">
              {displayName}
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-1 justify-center items-center">
        <Text className="text-2xl text-center">Home</Text>
      </View>
    </View>
  );
};

export default Home;
