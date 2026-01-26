import {
  View,
  Text,
  TextInput,
  Pressable,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  Image
} from "react-native"
import React, { useState } from "react"
import { useRouter } from "expo-router"
import { useLoader } from "@/hooks/useLoader"
import { login, loginWithGoogleIdToken } from "@/services/authService"
import { Ionicons, MaterialIcons } from "@expo/vector-icons"
import * as WebBrowser from "expo-web-browser"
import * as Google from "expo-auth-session/providers/google"
import { makeRedirectUri } from "expo-auth-session"
import Constants from "expo-constants"

WebBrowser.maybeCompleteAuthSession()

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

const authErrorMessage = (err: any) => {
  const code = String(err?.code || "")
  switch (code) {
    case "auth/invalid-email":
      return "Invalid email address."
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Email or password is incorrect."
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later."
    default:
      return err?.message || "Login failed. Please try again."
  }
}

const Login = () => {
  const router = useRouter() // import { useRouter } from "expo-router"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const extra: any =
    (Constants.expoConfig?.extra as any) ||
    (Constants as any)?.expoGoConfig?.extra ||
    (Constants as any)?.manifest?.extra ||
    (Constants as any)?.manifest2?.extra ||
    {}

  const googleWebClientId = String(extra.googleWebClientId || "").trim()
  const googleAndroidClientId = String(extra.googleAndroidClientId || "").trim()
  const googleIosClientId = String(extra.googleIosClientId || "").trim()
  const expoClientId = googleWebClientId

  const redirectUri = makeRedirectUri({ scheme: "wallet", useProxy: true } as any)

  const [googleRequest, _googleResponse, googlePromptAsync] =
    Google.useAuthRequest({
      expoClientId,
      webClientId: googleWebClientId,
      androidClientId: googleAndroidClientId,
      iosClientId: googleIosClientId,
      redirectUri,
      responseType: "id_token",
      scopes: ["openid", "profile", "email"]
    } as any)

  const { showLoader, hideLoader, isLoading } = useLoader()

  const handleLogin = async () => {
    if (isLoading) return

    const cleanEmail = email.trim()
    if (!cleanEmail || !password) {
      Alert.alert("Error", "Please enter email and password")
      return
    }
    if (!isValidEmail(cleanEmail)) {
      Alert.alert("Error", "Please enter a valid email")
      return
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters")
      return
    }
    showLoader()
    try {
      await login(cleanEmail, password)
      router.replace("/home")
    } catch (e: any) {
      Alert.alert("Login failed", authErrorMessage(e))
    } finally {
      hideLoader()
    }
  }

  const handleGoogleLogin = async () => {
    if (isLoading) return
    if (!googleWebClientId && !googleAndroidClientId && !googleIosClientId) {
      Alert.alert(
        "Google Login",
        "Please set Google client IDs in app.json (expo.extra.googleWebClientId / googleAndroidClientId / googleIosClientId)."
      )
      return
    }

    showLoader()
    try {
      const result = await googlePromptAsync({ useProxy: true } as any)
      if (result.type !== "success") return

      // Expo returns tokens in different shapes depending on platform/flow.
      const idToken =
        (result.authentication as any)?.idToken ||
        (result.params as any)?.id_token ||
        ""

      if (!idToken) {
        Alert.alert(
          "Google Login",
          "Could not get Google id token. Check your OAuth client configuration."
        )
        return
      }

      await loginWithGoogleIdToken(idToken)
      router.replace("/home")
    } catch (e: any) {
      Alert.alert("Google Login failed", e?.message || "Please try again")
    } finally {
      hideLoader()
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View className="flex-1 bg-gray-100 px-6 justify-center">
        <View className="items-center mb-6">
          <View className="w-20 h-20 rounded-3xl bg-emerald-700 items-center justify-center">
            <Image
              source={require("../../assets/images/icon.png")}
              style={{ width: 52, height: 52 }}
              resizeMode="contain"
            />
          </View>
          <Text className="text-3xl font-bold text-gray-900 mt-4">Wallet</Text>
          <Text className="text-gray-600 mt-1">
            Login to manage your money
          </Text>
        </View>

        <View className="w-full bg-white rounded-3xl overflow-hidden shadow-lg">
          <View className="bg-emerald-700 px-7 py-5">
            <Text className="text-white text-xl font-semibold">Sign in</Text>
            <Text className="text-white/80 mt-1">Welcome back</Text>
          </View>

          <View className="p-7">

          <View className="mt-7">
            <Text className="text-gray-800 font-semibold mb-2">Email</Text>
            <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4">
              <MaterialIcons name="email" size={22} color="#6B7280" />
              <TextInput
                placeholder="you@example.com"
                placeholderTextColor="#9CA3AF"
                className="flex-1 py-4 px-3 text-gray-900"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
              />
            </View>

            <Text className="text-gray-800 font-semibold mb-2 mt-4">
              Password
            </Text>
            <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4">
              <MaterialIcons name="lock" size={22} color="#6B7280" />
              <TextInput
                placeholder="Your password"
                placeholderTextColor="#9CA3AF"
                className="flex-1 py-4 px-3 text-gray-900"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                className="py-2 pl-2"
              >
                <MaterialIcons
                  name={showPassword ? "visibility" : "visibility-off"}
                  size={22}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>
          </View>

          <Pressable
            className={`mt-7 py-4 rounded-2xl ${
              isLoading ? "bg-emerald-700/40" : "bg-emerald-700/80"
            }`}
            onPress={handleLogin}
          >
            <Text className="text-white text-lg text-center font-semibold">
              {isLoading ? "Please wait..." : "Login"}
            </Text>
          </Pressable>

          <View className="flex-row items-center my-5">
            <View className="flex-1 h-px bg-gray-200" />
            <Text className="mx-3 text-gray-500">OR</Text>
            <View className="flex-1 h-px bg-gray-200" />
          </View>

          <Pressable
            className={`py-4 rounded-2xl border border-gray-200 bg-white ${
              isLoading ? "opacity-60" : "opacity-100"
            }`}
            disabled={isLoading || !googleRequest}
            onPress={handleGoogleLogin}
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="logo-google" size={20} color="#111827" />
              <Text className="text-gray-900 text-lg font-semibold ml-2">
                Continue with Google
              </Text>
            </View>
          </Pressable>

          <View className="flex-row justify-center mt-5">
            <Text className="text-gray-600">Don’t have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/register")}>
              <Text className="text-emerald-700 font-semibold">Register</Text>
            </TouchableOpacity>
          </View>
          </View>
        </View>
      </View>
    </TouchableWithoutFeedback>
  )
}

export default Login
