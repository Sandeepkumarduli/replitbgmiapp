import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { handleError } from "./error-handler";

/**
 * Throws an error with a user-friendly message if the response is not OK
 * Uses the error handler to format errors consistently
 */
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText;
    try {
      // Clone the response before trying to read it as text
      const resClone = res.clone();
      const textData = await resClone.text();
      
      if (textData) {
        // Skip parse if it looks like HTML (contains <!DOCTYPE or <html)
        if (textData.includes('<!DOCTYPE') || textData.includes('<html')) {
          console.error("HTML response detected in API call:", res.url);
          errorMessage = 'Server returned an HTML response instead of JSON. Please try again.';
        } else {
          try {
            const jsonData = JSON.parse(textData);
            if (jsonData.message) {
              errorMessage = typeof jsonData.message === 'string' 
                ? jsonData.message 
                : JSON.stringify(jsonData.message);
            } else if (jsonData.error) {
              errorMessage = typeof jsonData.error === 'string'
                ? jsonData.error
                : JSON.stringify(jsonData.error);
            }
          } catch (parseError) {
            // If JSON parsing fails, use the text data as the error message
            // but only if it's not too long (might be HTML)
            if (textData.length < 100) {
              errorMessage = textData;
            } else {
              console.error("Response parsing failed:", parseError);
              errorMessage = "Failed to parse server response. Please try again.";
            }
          }
        }
      }
    } catch (e) {
      // If any error happens during text extraction, use the status text
      console.error("Error handling response:", e);
      errorMessage = res.statusText || "Unknown server error";
    }
    
    // Create and throw the error (but don't display it yet - that will be handled by React Query's onError)
    try {
      const error = new Error(errorMessage || "An unknown error occurred");
      // Add status code to the error for better debugging
      (error as any).statusCode = res.status;
      throw error;
    } catch (e) {
      // If there's an issue creating the error object, throw a generic error
      throw new Error("Failed to process request. Please try again.");
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Clone the response before checking its status/ok
  // so we can still return the original response after checks
  const resClone = res.clone();
  await throwIfResNotOk(resClone);
  
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    
    try {
      return await res.json();
    } catch (error) {
      console.error("Failed to parse JSON response:", error);
      throw new Error("Failed to parse server response. Please try again.");
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 15000, // 15 seconds - more frequent refresh for tournament data
      retry: 1,        // Try once more if it fails
    },
    mutations: {
      retry: false,
      onError: (error: Error) => {
        handleError(error.message || "An error occurred during the operation");
      },
    },
  },
});
