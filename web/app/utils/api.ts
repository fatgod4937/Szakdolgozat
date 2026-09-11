const apiBaseUrl = import.meta.env.VITE_API_URL;

function getAccessToken() {
  return localStorage.getItem("floofs_access_token");
}

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

type RequestOptions = {
  method: string;
  body?: BodyInit | null;
  auth?: boolean;
  isFormData?: boolean;
};

async function request<TResponse>(
  path: string,
  options: RequestOptions,
): Promise<TResponse> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (options.auth) {
    const token = getAccessToken();

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  if (!options.isFormData && options.body) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method,
    headers,
    body: options.body,
  });

  const data = await readApiResponseBody(response);

  if (!response.ok) {
    throw new Error(
      getApiErrorMessage(response, data, "A kérés sikertelen volt."),
    );
  }

  return (data ?? {}) as TResponse;
}

export async function getJson<TResponse>(path: string, auth = true) {
  return request<TResponse>(path, {
    method: "GET",
    auth,
  });
}

export async function postJson<TResponse>(
  path: string,
  body: unknown,
  auth = false,
) {
  return request<TResponse>(path, {
    method: "POST",
    body: JSON.stringify(body),
    auth,
  });
}

export async function patchJson<TResponse>(
  path: string,
  body: unknown,
  auth = true,
) {
  return request<TResponse>(path, {
    method: "PATCH",
    body: JSON.stringify(body),
    auth,
  });
}

export async function deleteJson<TResponse>(path: string, auth = true) {
  return request<TResponse>(path, {
    method: "DELETE",
    auth,
  });
}

export async function postFormData<TResponse>(
  path: string,
  body: FormData,
  auth = true,
) {
  return request<TResponse>(path, {
    method: "POST",
    body,
    auth,
    isFormData: true,
  });
}

export async function patchFormData<TResponse>(
  path: string,
  body: FormData,
  auth = true,
) {
  return request<TResponse>(path, {
    method: "PATCH",
    body,
    auth,
    isFormData: true,
  });
}
