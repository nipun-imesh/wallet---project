import { LoaderContext } from "@/context/LoaderContext";
import { useContext } from "react";

export const useLoader = () => {
  return useContext(LoaderContext);
};
