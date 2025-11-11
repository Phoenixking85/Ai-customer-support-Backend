import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../../config/env";
import { logger } from "../../utils/logger";

export class GeminiClient {
  [x: string]: any;
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }

  async createEmbedding(text: string): Promise<number[]> {
    try {
      const model = this.genAI.getGenerativeModel({ model: config.gemini.embeddingModel });
      const response = await model.embedContent(text);

      return response.embedding.values;
    } catch (error) {
      logger.error("Gemini embedding error:", error);
      throw new Error("Failed to create embedding");
    }
  }

  async createChatCompletion(
    messages: Array<{ role: string; content: string }>,
    maxTokens: number
  ): Promise<{ content: string; tokensUsed: number; promptTokens: number }> {
    try {
      const model = this.genAI.getGenerativeModel({ model: config.gemini.model });

      const systemMessages = messages.filter(m => m.role === 'system');
      const chatMessages = messages.filter(m => m.role !== 'system');

      let systemContext = '';
      if (systemMessages.length > 0) {
        systemContext = systemMessages.map(m => m.content).join('\n\n') + '\n\n';
      }

      const history = chatMessages.slice(0, -1).map(m => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      }));

            const lastMessage = chatMessages[chatMessages.length - 1];
      const finalUserMessage = systemContext + lastMessage.content;

      let promptTokens = 0;
      try {
        const countResult = await model.countTokens({
          contents: [
            ...history,
            {
              role: "user",
              parts: [{ text: finalUserMessage }],
            }
          ]
        });
        promptTokens = countResult.totalTokens;
        logger.info(`Prompt tokens: ${promptTokens}`);
      } catch (error) {
        promptTokens = Math.ceil(finalUserMessage.length / 4);
        logger.warn("Token counting failed, using estimation", error);
      }

      const outputTokens = Math.max(100, maxTokens);

      const chat = model.startChat({
        history,
        generationConfig: {
          maxOutputTokens: outputTokens,
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
        },
      });

      logger.info(`Sending message with maxOutputTokens: ${outputTokens}`);
      const response = await chat.sendMessage(finalUserMessage);
      const content = response.response.text() || "";

      let completionTokens = 0;
      if (response.response.usageMetadata) {
        completionTokens = response.response.usageMetadata.candidatesTokenCount || 0;
        promptTokens = response.response.usageMetadata.promptTokenCount || promptTokens;
        
        logger.info(`Usage metadata - Prompt: ${promptTokens}, Completion: ${completionTokens}`);
      } else {
        completionTokens = Math.ceil(content.length / 4);
      }

      return { 
        content, 
        tokensUsed: completionTokens,
        promptTokens 
      };
    } catch (error: any) {
      logger.error("Gemini chat completion error:", error);

      if (error.message) {
        logger.error("Error message:", error.message);
      }
      if (error.status) {
        logger.error("Error status:", error.status);
      }
      
      throw new Error(`Failed to generate response: ${error.message || 'Unknown error'}`);
    }
  }
}

export const geminiClient = new GeminiClient();