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

  const iconColor = isDark ? "#FFFFFF" : "#111827";

  const [name, setName] = useState("");
  const [photoBase64, setPhotoBase64] = useState<string>("");
  const [initialName, setInitialName] = useState("");
  const [initialPhoto, setInitialPhoto] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);

  const photoUri = useMemo(() => {
    const raw = String(photoBase64 || "").trim();
    if (!raw) return "";
    if (raw.startsWith("data:")) return raw;
    return `data:image/jpeg;base64,${raw}`;
  }, [photoBase64]);

  const displayInitial = useMemo(() => {
    const value = String(name || user?.displayName || user?.email || "U");
    return value.trim().slice(0, 1).toUpperCase() || "U";
  }, [name, user?.displayName, user?.email]);

  const email = useMemo(() => {
    return String(user?.email || "").trim();
  }, [user?.email]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.uid) return;
      showLoader();
      try {
        const p = await getUserProfile(user.uid);
        if (cancelled) return;
        const nextName = String(p?.name || user.displayName || "").trim();
        const nextPhoto = String(p?.photoBase64 || "");
        setName(nextName);
        setPhotoBase64(nextPhoto);
        setInitialName(nextName);
        setInitialPhoto(nextPhoto);
      } catch {
        if (cancelled) return;
        const nextName = String(user?.displayName || "").trim();
        setName(nextName);
        setPhotoBase64("");
        setInitialName(nextName);
        setInitialPhoto("");
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
    if (!isEditing) return;

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
  }, [isEditing, isLoading, user?.uid]);

  const startEdit = useCallback(() => {
    if (isLoading) return;
    setIsEditing(true);
  }, [isLoading]);

  const cancelEdit = useCallback(() => {
    if (isLoading) return;
    setName(initialName);
    setPhotoBase64(initialPhoto);
    setIsEditing(false);
  }, [initialName, initialPhoto, isLoading]);

  const save = useCallback(async () => {
    if (!user?.uid) {
      Alert.alert("Profile", "Please log in again.");
      return;
    }
    if (isLoading) return;
    if (!isEditing) return;

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
      setInitialName(trimmed);
      setInitialPhoto(photoBase64 || "");
      setIsEditing(false);
      Alert.alert("Profile", "Profile updated");
    } catch (e: any) {
      Alert.alert("Profile", e?.message || "Failed to update profile");
    } finally {
      hideLoader();
    }
  }, [hideLoader, isEditing, isLoading, name, photoBase64, showLoader, user?.uid]);

  return (
    <View className="flex-1 bg-app-bg dark:bg-appDark-bg">
      <View
        style={{ paddingTop: insets.top + 12 }}
        className="px-6 flex-row items-center justify-between mb-5"
      >
        <Pressable
          onPress={() => {
            if (isEditing) {
              cancelEdit();
              return;
            }
            router.back();
          }}
          className="w-10 h-10 rounded-full items-center justify-center bg-app-surface dark:bg-appDark-surface border border-app-border dark:border-appDark-border"
        >
          <MaterialIcons name="arrow-back" size={22} color={iconColor} />
        </Pressable>
        <Text className="text-lg font-bold text-app-text dark:text-appDark-text">
          My Profile
        </Text>

        <View className="w-10 h-10" />
      </View>

      <View className="px-6">
        <View className="bg-app-surface dark:bg-appDark-surface border border-app-border dark:border-appDark-border rounded-3xl px-5 py-5">
          <View className="flex-row items-center">
            <Pressable
              onPress={pickImage}
              disabled={!isEditing}
              className="w-20 h-20 rounded-full border border-app-border dark:border-appDark-border items-center justify-center bg-app-surface2 dark:bg-appDark-surface2 overflow-hidden relative"
            >
              {photoUri ? (
                <Image
                  source={{ uri: photoUri }}
                  style={{ width: 80, height: 80 }}
                  resizeMode="cover"
                />
              ) : (
                <Text className="text-app-primary dark:text-appDark-primary font-extrabold text-3xl">
                  {displayInitial}
                </Text>
              )}

              {isEditing ? (
                <View
                  className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full items-center justify-center border-2 ${
                    isDark
                      ? "bg-appDark-primary border-appDark-bg"
                      : "bg-app-primary border-app-surface"
                  }`}
                >
                  <MaterialIcons
                    name="photo-camera"
                    size={14}
                    color={isDark ? "#000000" : "#FFFFFF"}
                  />
                </View>
              ) : null}
            </Pressable>

            <View className="flex-1 ml-4">
              <Text className="text-app-text dark:text-appDark-text font-extrabold text-lg">
                {name || "User"}
              </Text>
              {!!email ? (
                <Text className="text-app-textMuted dark:text-appDark-textMuted text-sm mt-0.5">
                  {email}
                </Text>
              ) : null}

              {isEditing ? (
                <View className="flex-row items-center mt-3">
                  <Pressable
                    onPress={save}
                    disabled={isLoading}
                    className="px-4 py-2 rounded-2xl bg-app-primary dark:bg-appDark-primary"
                  >
                    <Text className="text-app-onPrimary dark:text-appDark-onPrimary font-semibold">
                      Save
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={cancelEdit}
                    disabled={isLoading}
                    className="ml-3 px-4 py-2 rounded-2xl border border-app-border dark:border-appDark-border"
                  >
                    <Text className="text-app-text dark:text-appDark-text font-semibold">
                      Cancel
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={startEdit}
                  className="mt-3 self-start px-4 py-2 rounded-2xl bg-app-primary dark:bg-appDark-primary"
                >
                  <Text className="text-app-onPrimary dark:text-appDark-onPrimary font-semibold">
                    Edit Profile
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>

        {isEditing ? (
          <>
            <Text className="text-app-textMuted dark:text-appDark-textMuted text-sm mt-5 mb-2">
              Your name
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={isDark ? "rgba(255,255,255,0.45)" : "#9CA3AF"}
              className="bg-app-surface dark:bg-appDark-surface border border-app-border dark:border-appDark-border rounded-2xl px-4 py-4 text-app-text dark:text-appDark-text"
            />
          </>
        ) : (
          <>
            <Text className="text-app-textMuted dark:text-appDark-textMuted text-sm mt-5">
              Tap “Edit Profile” to update your name and photo.
            </Text>
          </>
        )}
      </View>
    </View>
  );
};

export default ProfileSettings;
