import { Injectable } from '@nestjs/common';

export interface BadWordCheckResult {
  hasBadWords: boolean;
  detectedWords: string[];
  sanitizedText: string;
}

@Injectable()
export class BadWordsService {
  // Comprehensive list of bad words and variations (French, English, common slang)
  // This can be extended or loaded from a database for easier management
  private readonly badWords = new Set([
    // French profanities
    'connard',
    'salaud',
    'putain',
    'merde',
    'con',
    'nul',
    'débile',
    'débile mental',
    'con de',
    'bordel',
    'sacré',
    'foutre',
    'chier',
    'pourri',
    'pourrie',
    'pourris',
    'salope',
    'pute',
    'puta',
    'hijo',
    'cabrón',

    // English profanities
    'shit',
    'damn',
    'hell',
    'crap',
    'ass',
    'bitch',
    'bastard',
    'asshole',
    'fuck',
    'fucking',
    'fucked',
    'piss',
    'dick',
    'cock',
    'pussy',
    'whore',
    'slut',
    'idiot',
    'retard',
    'nigger',
    'fag',
    'homo',

    // Discriminatory/hate speech
    'terrorist',
    'terrorists',
    'killing',
    'murder',
    'rape',
    'racist',
    'racism',
    'sexist',
    'sexism',
    'antisemite',
    'die',
    'kys',
    'kill yourself',
    'i hate',

    // Spam/Scam indicators
    'viagra',
    'cialis',
    'casino',
    'poker',
    'lottery',
    'winning',
    'won',
    'prize',
    'click here',
    'free money',
    'buy now',
    'click link',
    'crypto',
    'bitcoin',
    'nft',

    // Additional offensive terms
    'insulting',
    'insult',
    'stupid',
    'moron',
    'imbecile',
  ]);

  /**
   * Check if text contains bad words
   */
  checkBadWords(text: string): BadWordCheckResult {
    if (!text || text.trim().length === 0) {
      return {
        hasBadWords: false,
        detectedWords: [],
        sanitizedText: text,
      };
    }

    const lowerText = text.toLowerCase();
    const detectedWords: string[] = [];
    let sanitizedText = text;

    // Check each bad word
    for (const badWord of this.badWords) {
      // Create regex to match word boundaries
      const regex = new RegExp(`\\b${this.escapeRegex(badWord)}\\b`, 'gi');

      if (regex.test(lowerText)) {
        detectedWords.push(badWord);
        // Replace with asterisks
        sanitizedText = sanitizedText.replace(
          new RegExp(`\\b${this.escapeRegex(badWord)}\\b`, 'gi'),
          '*'.repeat(badWord.length),
        );
      }
    }

    return {
      hasBadWords: detectedWords.length > 0,
      detectedWords: [...new Set(detectedWords)], // Remove duplicates
      sanitizedText,
    };
  }

  /**
   * Get sanitized text (replace bad words with asterisks)
   */
  sanitizeText(text: string): string {
    return this.checkBadWords(text).sanitizedText;
  }

  /**
   * Check if comment is safe (optional threshold for severity)
   */
  isSafeComment(text: string, maxBadWordsAllowed: number = 0): boolean {
    const result = this.checkBadWords(text);
    return result.detectedWords.length <= maxBadWordsAllowed;
  }

  /**
   * Add custom bad word to the list (for admin)
   */
  addBadWord(word: string): void {
    this.badWords.add(word.toLowerCase());
  }

  /**
   * Remove bad word from the list
   */
  removeBadWord(word: string): void {
    this.badWords.delete(word.toLowerCase());
  }

  /**
   * Get list of all bad words (for admin)
   */
  getAllBadWords(): string[] {
    return Array.from(this.badWords).sort();
  }

  /**
   * Helper to escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
