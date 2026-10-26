export class SpeechError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly statusCode = 503,
  ) {
    super(message);
  }
}
