import { useAuth } from "@/hooks/useAuth";
import { useLoader } from "@/hooks/useLoader";
import {
  completeTask,
  deleteTask,
  getAllTask,
  getAllTaskByStatus,
} from "@/services/taskService";
import type { Task } from "@/types/task";
import { MaterialIcons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TabKey = "All" | "Completed" | "Pending";

const Tasks = () => {
  const router = useRouter();
  const { showLoader, hideLoader, isLoading } = useLoader();
  const { user } = useAuth();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();

  const displayName =
    user?.displayName ||
    (user?.email ? user.email.split("@")[0] : "") ||
    "User";
  const photoUrl = user?.photoURL || "";
  const initial = String(displayName).trim().charAt(0).toUpperCase() || "U";

  const [activeTab, setActiveTab] = useState<TabKey>("All");
  const [tasks, setTasks] = useState<Task[]>([]);

  const tabs = useMemo(() => ["All", "Completed", "Pending"] as const, []);

  const formatDate = (dateStr: string | number | Date) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const fetchTasks = useCallback(async () => {
    showLoader();
    try {
      const result =
        activeTab === "All"
          ? await getAllTask()
          : await getAllTaskByStatus(activeTab === "Completed");

      setTasks(result as Task[]);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to load tasks");
    } finally {
      hideLoader();
    }
  }, [activeTab, hideLoader, showLoader]);

  useFocusEffect(
    useCallback(() => {
      fetchTasks();
    }, [fetchTasks]),
  );

  const handleToggleComplete = useCallback(
    async (task: Task) => {
      if (isLoading) return;

      showLoader();
      try {
        await completeTask(task.id, !(task.isComplete ?? false));
        await fetchTasks();
      } catch (e: any) {
        Alert.alert("Error", e?.message || "Failed to update task");
      } finally {
        hideLoader();
      }
    },
    [fetchTasks, hideLoader, isLoading, showLoader],
  );

  const handleDelete = useCallback(
    (taskId: string) => {
      Alert.alert("Delete task", "Are you sure you want to delete this task?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (isLoading) return;
            showLoader();
            try {
              await deleteTask(taskId);
              await fetchTasks();
            } catch (e: any) {
              Alert.alert("Error", e?.message || "Failed to delete task");
            } finally {
              hideLoader();
            }
          },
        },
      ]);
    },
    [fetchTasks, hideLoader, isLoading, showLoader],
  );

  const handleEdit = useCallback(
    (taskId: string) => {
      router.push({ pathname: "/tasks/form", params: { taskId } } as any);
    },
    [router],
  );

  const handleAdd = useCallback(() => {
    router.push("/tasks/form");
  }, [router]);

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

      <View className="flex-row justify-around py-3 bg-white border-b border-gray-200">
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)}>
              <Text
                className={`text-lg font-semibold ${
                  isActive ? "text-blue-600" : "text-gray-500"
                }`}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: 24,
          paddingBottom: tabBarHeight + 24,
        }}
      >
        {tasks.length === 0 ? (
          <Text className="text-gray-600 text-center mt-10">
            No tasks found.
          </Text>
        ) : (
          tasks.map((task) => (
            <View
              key={task.id}
              className="bg-white p-4 rounded-2xl mb-4 border border-gray-300 shadow-md"
            >
              <TouchableOpacity
                onPress={() => handleEdit(task.id)}
                className="flex-row justify-between items-center mb-2"
              >
                <View className="flex-1 mr-2">
                  <Text className="text-gray-800 text-lg font-semibold mb-1">
                    {task.title}
                  </Text>
                  <Text className="text-gray-600 mb-2">
                    {(task.description || "").length > 60
                      ? `${(task.description || "").substring(0, 60)}...`
                      : task.description}
                  </Text>
                  <Text
                    className={`font-medium ${
                      task.isComplete ? "text-green-600" : "text-yellow-600"
                    }`}
                  >
                    {task.isComplete ? "Completed" : "Pending"}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => handleToggleComplete(task)}
                  className={`p-2 rounded-full ${
                    task.isComplete ? "bg-green-100" : "bg-gray-100"
                  }`}
                >
                  <MaterialIcons
                    name={
                      task.isComplete
                        ? "check-circle"
                        : "radio-button-unchecked"
                    }
                    size={28}
                    color={task.isComplete ? "#16A34A" : "#6B7280"}
                  />
                </TouchableOpacity>
              </TouchableOpacity>

              <View className="flex-row justify-between items-end">
                <Text className="text-gray-500 text-sm mb-1">
                  Created: {task.createdAt ? formatDate(task.createdAt) : "-"}
                </Text>

                <View className="flex-row justify-end mt-2">
                  <TouchableOpacity
                    onPress={() => handleEdit(task.id)}
                    className="p-2 rounded-full bg-yellow-500"
                  >
                    <MaterialIcons name="edit" size={28} color="#ffffff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(task.id)}
                    className="p-2 ms-2 rounded-full bg-red-500"
                  >
                    <MaterialIcons name="delete" size={28} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        className="bg-blue-600/80 rounded-full shadow-lg absolute right-0 m-6 p-2 z-50"
        style={{ bottom: tabBarHeight + 12 }}
        onPress={handleAdd}
      >
        <MaterialIcons name="add" size={40} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

export default Tasks;
