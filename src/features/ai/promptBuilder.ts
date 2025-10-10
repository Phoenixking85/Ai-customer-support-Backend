export class PromptBuilder {
  static buildSystemPrompt(): string {
    return `You are a helpful AI customer support assistant. 
Your goal is to provide accurate, helpful, and professional responses to customer inquiries.

Guidelines:
- Be polite and professional
- Provide clear and concise answers
- If you don't know something, say so honestly
- Use the provided context to answer questions when available
- Stay focused on customer support topics
- Don't make promises about features or policies you're not certain about`;
  }

  static buildUserPrompt(query: string, context: string[]): Array<{ role: string; content: string }> {
    const messages = [
      {
        role: 'system',
        content: this.buildSystemPrompt(),
      },
    ];

    if (context.length > 0) {
      messages.push({
        role: 'system',
        content: `Here is some relevant context from the knowledge base:\n\n${context.join('\n\n')}`,
      });
    }

    messages.push({
      role: 'user',
      content: query,
    });

    return messages;
  }
}