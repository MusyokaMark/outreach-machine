import { useState } from "react";

export function useToast() {
  const [toasts, setToasts] = useState([]);

  function showToast(message, type) {
    const kind = type || "success";
    const id = Date.now();
    setToasts(function (t) {
      return [...t, { id, message, type: kind }];
    });
    setTimeout(function () {
      setToasts(function (t) {
        return t.filter(function (x) {
          return x["id"] !== id;
        });
      });
    }, 3500);
  }

  return { toasts, showToast };
}
