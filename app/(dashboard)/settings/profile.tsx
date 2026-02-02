import { useAuth } from "@/hooks/useAuth";
import { useLoader } from "@/hooks/useLoader";
import { getUserProfile, updateUserProfile } from "@/services/authService";
import {
  suppressNextBiometricPrompt,
  suppressNextBiometricPromptForUser,
} from "@/services/biometricService";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useColorScheme } from "nativewind";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ProfileSettings = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showLoader, hideLoader, isLoading } = useLoader();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [name, setName] = useState("");
  const [photoBase64, setPhotoBase64] = useState<string>("");

  const displayInitial = useMemo(() => {
    const value = String(name || user?.displayName || user?.email || "U");
    return value.trim().slice(0, 1).toUpperCase() || "U";
  }, [name, user?.displayName, user?.email]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.uid) return;
      showLoader();
      try {
        const p = await getUserProfile(user.uid);
        if (cancelled) return;
        setName(String(p?.name || user.displayName || "").trim());
        setPhotoBase64(String(p?.photoBase64 || ""));
      } catch {
        if (cancelled) return;
        setName(String(user?.displayName || "").trim());
        setPhotoBase64("");
      } finally {
        hideLoader();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hideLoader, showLoader, user?.displayName, user?.uid]);

  const pickImage = useCallback(async () => {
    if (!user?.uid) return;
    if (isLoading) return;

    suppressNextBiometricPrompt();
    await suppressNextBiometricPromptForUser(user.uid);

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Photo", "Permission denied");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });

    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.base64) {
      Alert.alert("Photo", "Could not read image");
      return;
    }

    setPhotoBase64(asset.base64);
  }, [isLoading, user?.uid]);

  const save = useCallback(async () => {
    if (!user?.uid) {
      Alert.alert("Profile", "Please log in again.");
      return;
    }
    if (isLoading) return;

    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Profile", "Name cannot be empty");
      return;
    }

    showLoader();
    try {
      await updateUserProfile(user.uid, {
        name: trimmed,
        photoBase64: photoBase64 || "",
      });
      Alert.alert("Profile", "Profile updated");
      router.back();
    } catch (e: any) {
      Alert.alert("Profile", e?.message || "Failed to update profile");
    } finally {
      hideLoader();
    }
  }, [hideLoader, isLoading, name, photoBase64, showLoader, user?.uid]);

  return (
    <View className="flex-1 bg-app-bg dark:bg-black">
      <View
        style={{ paddingTop: insets.top + 12 }}
        className="px-6 flex-row items-center justify-between mb-6"
      >
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full items-center justify-center bg-white dark:bg-black border border-app-border dark:border-white/15"
        >
          <MaterialIcons
            name="arrow-back"
            size={22}
            color={isDark ? "#FFFFFF" : "#111827"}
          />
        </Pressable>
        <Text className="text-lg font-bold text-app-text dark:text-white">
          Profile
        </Text>
        <View className="w-10 h-10" />
      </View>

      <View className="px-6">
        <Pressable
          onPress={pickImage}
          className="self-center w-24 h-24 rounded-full border border-app-border dark:border-white/15 items-center justify-center bg-white dark:bg-black overflow-hidden"
        >
          {photoBase64 ? (
            <Image
              source={{ uri: `data:image/jpeg;base64,${photoBase64}` }}
              style={{ width: 96, height: 96 }}
              resizeMode="cover"
            />
          ) : (
            <Text className="text-app-primary dark:text-white font-extrabold text-2xl">
              {displayInitial}
            </Text>
          )}
        </Pressable>

        <Text className="text-app-textMuted dark:text-white/70 text-sm mt-6 mb-2">
          Name
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={isDark ? "rgba(255,255,255,0.45)" : "#9CA3AF"}
          className="bg-white dark:bg-black border border-app-border dark:border-white/15 rounded-2xl px-4 py-4 text-app-text dark:text-white"
        />

        <Pressable
          onPress={save}
          disabled={isLoading}
          className="mt-6 bg-app-primary dark:bg-white rounded-2xl py-4 items-center justify-center"
        >
          <Text className="text-white dark:text-black font-semibold text-base">
            Save
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

export default ProfileSettings;
