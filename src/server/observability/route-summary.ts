export interface ResponseSummary {
  contentDisposition?: string;
  contentLength?: number;
  contentType?: string;
  isDownload: boolean;
  isJson: boolean;
  isStream: boolean;
  responseKind: "binary" | "empty" | "json" | "text";
}

export function summarizeResponse(response: Response): ResponseSummary {
  const contentType = response.headers.get("content-type") ?? undefined;
  const contentDisposition =
    response.headers.get("content-disposition") ?? undefined;
  const contentLengthHeader = response.headers.get("content-length");
  const contentLength = contentLengthHeader
    ? Number.parseInt(contentLengthHeader, 10)
    : undefined;
  const isJson = Boolean(contentType?.includes("application/json"));
  const isStreamingText = Boolean(
    contentType?.includes("application/x-ndjson") ||
    contentType?.includes("text/event-stream"),
  );
  const isDownload = Boolean(contentDisposition?.includes("attachment"));
  const isBinary = Boolean(
    contentType &&
    !contentType.startsWith("text/") &&
    !contentType.includes("json") &&
    !contentType.includes("xml"),
  );
  const isStream = isDownload || isBinary || isStreamingText;

  return {
    contentDisposition,
    contentLength,
    contentType,
    isDownload,
    isJson,
    isStream,
    responseKind: !contentType
      ? "empty"
      : isJson
        ? "json"
        : isStreamingText
          ? "text"
          : isBinary
            ? "binary"
            : "text",
  };
}
