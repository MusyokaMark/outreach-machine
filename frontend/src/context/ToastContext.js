import { createContext, useContext } from "react";

export const ToastContext = createContext(null)

export function useAppToast() {
    return useContext(ToastContext)
}