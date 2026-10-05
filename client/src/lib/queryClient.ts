import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    if ((res.headers.get("content-type") || "").includes("application/json")) {
      let body: { message?: unknown } | undefined;
      try {
        body = JSON.parse(text);
      } catch {}
      if (typeof body?.message === "string") {
        throw new Error(`${res.status}: ${body.message}`);
      }
    }
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  method: string,
  data?: unknown | undefined,
): Promise<any> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  if (method === "GET" || method === "POST") {
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const responseText = await res.text();
      const message = responseText.trimStart().startsWith("<!DOCTYPE html") ||
        responseText.trimStart().startsWith("<html")
        ? "The server returned a web page instead of API data. Refresh the page and try again."
        : `Expected a JSON response but received ${contentType || "an unknown content type"}.`;
      throw new Error(message);
    }
    return await res.json();
  }
  
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const url = queryKey.join("/");
        const res = await fetch(url, {
          credentials: "include",
        });
        
        if (!res.ok) {
          const text = (await res.text()) || res.statusText;
          throw new Error(`${res.status}: ${text}`);
        }
        
        return await res.json();
      },
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
