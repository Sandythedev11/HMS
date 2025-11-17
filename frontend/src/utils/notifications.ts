import { toast, type ToastT } from "sonner";
import { ReactNode } from "react";

interface NotificationOptions {
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
  id?: string;
}

// Default notification options
const defaultOptions: NotificationOptions = {
  duration: 5000, // 5 seconds
};

/**
 * Unified notification system for HMS
 */
export const notify = {
  /**
   * Show a success notification
   */
  success: (message: string, description?: string, options?: NotificationOptions) => {
    return toast.success(message, {
      description,
      duration: options?.duration || defaultOptions.duration,
      id: options?.id,
      action: options?.action,
    });
  },

  /**
   * Show an error notification
   */
  error: (message: string, description?: string, options?: NotificationOptions) => {
    return toast.error(message, {
      description,
      duration: options?.duration || defaultOptions.duration,
      id: options?.id,
      action: options?.action,
    });
  },

  /**
   * Show an info notification
   */
  info: (message: string, description?: string, options?: NotificationOptions) => {
    return toast(message, {
      description,
      duration: options?.duration || defaultOptions.duration,
      id: options?.id,
      action: options?.action,
    });
  },

  /**
   * Show a warning notification
   */
  warning: (message: string, description?: string, options?: NotificationOptions) => {
    return toast.warning(message, {
      description,
      duration: options?.duration || defaultOptions.duration,
      id: options?.id,
      action: options?.action,
    });
  },

  /**
   * Show a notification with undo action
   */
  withUndo: (message: string, description: string, undoAction: () => void, options?: NotificationOptions) => {
    return toast(message, {
      description,
      duration: options?.duration || 8000, // Longer duration for undo actions
      action: {
        label: "Undo",
        onClick: undoAction,
      },
    });
  },

  /**
   * Create a promise-based notification that shows loading, success, and error states
   */
  promise: <T>(
    promise: Promise<T>,
    {
      loading,
      success,
      error,
    }: {
      loading: string;
      success: (data: T) => ReactNode;
      error: (error: any) => ReactNode;
    },
    options?: NotificationOptions
  ) => {
    return toast.promise(promise, {
      loading,
      success,
      error,
      duration: options?.duration || defaultOptions.duration,
    });
  },

  /**
   * Dismiss a specific notification by ID
   */
  dismiss: (id: string) => {
    toast.dismiss(id);
  },

  /**
   * Dismiss all notifications
   */
  dismissAll: () => {
    toast.dismiss();
  },
}; 