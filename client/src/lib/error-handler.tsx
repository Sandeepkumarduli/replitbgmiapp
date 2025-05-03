/**
 * Global error handling utility
 * Converts errors to user-friendly messages
 */
import { toast } from "@/hooks/use-toast";
import { ReactNode } from "react";

interface ErrorDisplayOptions {
  /** Custom title */
  title?: string;
  /** If true, will not show the toast */
  silent?: boolean;
  /** Default message if no specific error message is available */
  defaultMessage?: string;
}

/**
 * Handles errors globally, ensuring they're displayed in a user-friendly way
 * @param error - The error object to handle
 * @param options - Configuration options for the error display
 * @returns A user-friendly error message
 */
export function handleError(error: unknown, options: ErrorDisplayOptions = {}): string {
  const {
    title = "Error",
    silent = false,
    defaultMessage = "Something went wrong. Please try again."
  } = options;

  // Extract error message
  let errorMessage = defaultMessage;
  
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else if (typeof error === 'object' && error !== null) {
    // Handle API errors with message property
    if ('message' in error && typeof error.message === 'string') {
      errorMessage = error.message;
    }
    // Handle API errors with data.message property
    else if ('data' in error && typeof error.data === 'object' && error.data && 'message' in error.data) {
      errorMessage = error.data.message as string;
    }
  }

  // Show toast if not silent
  if (!silent) {
    toast({
      title,
      description: errorMessage,
      variant: "destructive",
    });
  }

  return errorMessage;
}

/**
 * Error boundary component to catch rendering errors
 */
export function ErrorFallback({ error }: { error: Error }): ReactNode {
  handleError(error);
  
  return (
    <div className="p-4 bg-dark-card rounded-md border border-red-500 text-white">
      <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
      <p className="text-sm text-gray-300">
        The application encountered an error. Please try refreshing the page.
      </p>
    </div>
  );
}