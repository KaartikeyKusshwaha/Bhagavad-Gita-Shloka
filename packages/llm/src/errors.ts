export class AiServiceError extends Error {
  readonly statusCode = 503;
  constructor(
    readonly code = 'AI_UNAVAILABLE',
    message = 'The AI service could not complete this request. No AI assessment was produced. Please retry.',
  ) {
    super(message);
  }
}
