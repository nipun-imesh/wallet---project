import { useLoader } from "../../../hooks/useLoader";
import { changeUserPassword } from "../../../services/authService";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColorScheme } from "nativewind";
import React, { useCallback, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ChangePassword = () => {
  const insets = useSafeAreaInsets();
  const { showLoader, hideLoader, isLoading } = useLoader();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const save = useCallback(async () => {
    if (isLoading) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Password", "Please fill all fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Password", "New passwords do not match.");
      return;
    }

    showLoader();
    try {
      await changeUserPassword(currentPassword, newPassword);
      Alert.alert("Password", "Password updated successfully.");
      router.back();
    } catch (e: any) {
      Alert.alert("Password", e?.message || "Failed to update password");
    } finally {
      hideLoader();
    }
  }, [confirmPassword, currentPassword, hideLoader, isLoading, newPassword, showLoader]);

  const inputClass =
    "bg-app-surface dark:bg-appDark-surface border border-app-border dark:border-appDark-border rounded-2xl px-4 py-4 text-app-text dark:text-appDark-text";

  return (
    <View className="flex-1 bg-app-bg dark:bg-appDark-bg">
      <View
        style={{ paddingTop: insets.top + 12 }}
        className="px-6 flex-row items-center justify-between mb-6"
      >
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full items-center justify-center bg-app-surface dark:bg-appDark-surface border border-app-border dark:border-appDark-border"
        >
          <MaterialIcons
            name="arrow-back"
            size={22}
            color={isDark ? "#FFFFFF" : "#111827"}
          />
        </Pressable>
        <Text className="text-lg font-bold text-app-text dark:text-appDark-text">
          Change Password
        </Text>
        <View className="w-10 h-10" />
      </View>

      <View className="px-6">
        <Text className="text-app-textMuted dark:text-appDark-textMuted text-sm mb-2">
          Current password
        </Text>
        <View className="relative">
          <TextInput
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry={!showCurrent}
            placeholder="••••••••"
            placeholderTextColor={isDark ? "rgba(255,255,255,0.45)" : "#9CA3AF"}
            className={inputClass}
          />
          <Pressable
            onPress={() => setShowCurrent((v) => !v)}
            className="absolute right-4 top-4"
          >
            <MaterialIcons
              name={showCurrent ? "visibility-off" : "visibility"}
              size={22}
              color={isDark ? "rgba(255,255,255,0.7)" : "#6B7280"}
            />
          </Pressable>
        </View>

        <Text className="text-app-textMuted dark:text-appDark-textMuted text-sm mt-4 mb-2">
          New password
        </Text>
        <View className="relative">
          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showNew}
            placeholder="At least 6 characters"
            placeholderTextColor={isDark ? "rgba(255,255,255,0.45)" : "#9CA3AF"}
            className={inputClass}
          />
          <Pressable
            onPress={() => setShowNew((v) => !v)}
            className="absolute right-4 top-4"
          >
            <MaterialIcons
              name={showNew ? "visibility-off" : "visibility"}
              size={22}
              color={isDark ? "rgba(255,255,255,0.7)" : "#6B7280"}
            />
          </Pressable>
        </View>

        <Text className="text-app-textMuted dark:text-appDark-textMuted text-sm mt-4 mb-2">
          Confirm new password
        </Text>
        <View className="relative">
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirm}
            placeholder="Repeat new password"
            placeholderTextColor={isDark ? "rgba(255,255,255,0.45)" : "#9CA3AF"}
            className={inputClass}
          />
          <Pressable
            onPress={() => setShowConfirm((v) => !v)}
            className="absolute right-4 top-4"
          >
            <MaterialIcons
              name={showConfirm ? "visibility-off" : "visibility"}
              size={22}
              color={isDark ? "rgba(255,255,255,0.7)" : "#6B7280"}
            />
          </Pressable>
        </View>

        <Pressable
          onPress={save}
          disabled={isLoading}
          className="mt-6 bg-app-primary dark:bg-appDark-primary rounded-2xl py-4 items-center justify-center"
        >
          <Text className="text-app-onPrimary dark:text-appDark-onPrimary font-semibold text-base">
            Save
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

export default ChangePassword;
