import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export class Helpers {
  static generateApiKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static async hashApiKey(key: string): Promise<string> {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(key, salt);
  }

  static async verifyApiKey(key: string, hash: string): Promise<boolean> {
    return bcrypt.compare(key, hash);
  }

  static generateReference(): string {
    return `ref_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  }

  static chunkText(text: string, maxTokens = 400): string[] {
    const words = text.split(' ');
    const chunks: string[] = [];
    let currentChunk: string[] = [];
    let currentTokenCount = 0;

    for (const word of words) {
      const wordTokens = Math.ceil(word.length / 4);
      
      if (currentTokenCount + wordTokens > maxTokens && currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '));
        currentChunk = [word];
        currentTokenCount = wordTokens;
      } else {
        currentChunk.push(word);
        currentTokenCount += wordTokens;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
    }

    return chunks;
  }

  static calculateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}