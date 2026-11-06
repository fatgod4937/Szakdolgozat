import { postJson } from "./api";

export function askPublicSupportQuestion(question: string, language: string) {
  return postJson<{ answer: string }>("/support/questions", {
    question,
    language,
  });
}
