import { VectorService } from '../vectorstore/vector.service';
import { GeminiClient } from './GeminiClient';

interface ProcessQueryResult {
  response: string;
  tokensUsed: number;
  confidence: number; 
}

export class AIService {
  constructor(
    private geminiClient: GeminiClient,
    private vectorService: VectorService
  ) {}

  async processQuery(tenantId: string, query: string, maxTokens: number): Promise<ProcessQueryResult> {
    const topChunks = await this.vectorService.search(tenantId, query, 5);

    let confidence = 0;
    if (topChunks.length > 0) {
      const scores = topChunks.map(c => c.score);
      confidence = Math.max(...scores);
    }

    const highScores = topChunks.filter(c => c.score >= 0.7).length;
    if (highScores > 1) {
      confidence = Math.min(confidence + 0.05, 1);
    }

    const context = topChunks.map(c => c.chunk_text).join('\n\n');

    const messages = [
      {
        role: 'system',
        content: 'Answer the user question using the provided context. Be concise and accurate.'
      },
      {
        role: 'user',
        content: `Context:\n${context}\n\nQuestion: ${query}`
      }
    ];

    const completion = await this.geminiClient.createChatCompletion(messages, maxTokens);

    return {
      response: completion.content,
      tokensUsed: completion.tokensUsed,
      confidence
    };
  }
}
