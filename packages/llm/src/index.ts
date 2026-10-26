export interface EmbedProvider {
  model: string;
  dimensions: number;
  embed(texts: string[]): Promise<number[][]>;
}
export interface LlmProvider {
  name: string;
  explain(input: { claim: string; passages: string[]; lang: string }): Promise<string>;
}
export const groundedPrompt =
  'Using only the passages below, say in plain words how the claim relates to them. Quote only from the provided passages. Never write or complete scripture. Do not give a religious ruling, rank traditions or attack a faith. At most 120 words.';
// Providers are opt-in. Absence is a visible capability state, never simulated AI.
export function providerCapabilities() {
  return {
    embeddings: false,
    explanations: false,
    reason: 'No reviewed model provider configured',
  };
}
