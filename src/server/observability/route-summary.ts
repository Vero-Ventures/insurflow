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
  const parsedContentLength = contentLengthHeader
    ? Number.parseInt(contentLengthHeader, 10)
    : undefined;
  const contentLength =
    parsedContentLength !== undefined &&
    Number.isFinite(parsedContentLength) &&
    !Number.isNaN(parsedContentLength)
      ? parsedContentLength
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
  let responseKind: ResponseSummary["responseKind"] = "text";

  if (!contentType) {
    responseKind = "empty";
  } else if (isJson) {
    responseKind = "json";
  } else if (isStreamingText) {
    responseKind = "text";
  } else if (isBinary) {
    responseKind = "binary";
  }

  return {
    contentDisposition,
    contentLength,
    contentType,
    isDownload,
    isJson,
    isStream,
    responseKind,
  };
}
