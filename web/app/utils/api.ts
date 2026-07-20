const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export type ApiResponseBody = {
  accessToken?: string;
  user?: { email?: string };
  message?: string;
};

export async function readApiResponseBody(response: Response) {
  const responseText = await response.text();

  if (!responseText.trim()) {
    return null;
  }

  try {
    return JSON.parse(responseText) as ApiResponseBody;
  } catch {
    return { message: responseText };
  }
}

export function getApiErrorMessage(
  response: Response,
  data: ApiResponseBody | null,
  fallbackMessage: string,
) {
  if (data?.message) {
    return data.message;
  }

  if (!response.ok) {
    return `${fallbackMessage} (${response.status} ${response.statusText})`;
  }

  return fallbackMessage;
}

export async function postJson<TResponse>(
  path: string,
  body: unknown,
): Promise<TResponse> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await readApiResponseBody(response);

  if (!response.ok) {
    throw new Error(
      getApiErrorMessage(response, data, "A kérés sikertelen volt."),
    );
  }

  return (data ?? {}) as TResponse;
}
