export interface EmotionResult {
  // 整体情感
  globalEmotion: {
    category: string;  // 情感类别
    intensity: number; // 情感强度 0-1
  };
  // 句子级别的情感
  sentences: Array<{
    text: string;
    emotion?: {
      category: string;
      intensity: number;
    };
    style?: string;
    phrases: Array<{
      text: string;
      emotion?: {
        category: string;
        intensity: number;
      };
      emphasis?: 'none' | 'moderate' | 'strong';
    }>;
  }>;
  // 全局风格
  globalStyle?: string;
}

export class EmotionAnalyzer {
  // 情感词库 - 加强版
  private static readonly HAPPY_WORDS = [
    '开心', '快乐', '高兴', '欢喜', '愉快', '欢乐', '喜悦', '兴奋',
    '欣喜', '欢欣', '雀跃', '欢快', '愉悦', '欢畅', '欢腾', '欢欣鼓舞',
    '哈哈', '嘻嘻', '嘿嘿', '哈', '太棒了', '真好', '太好了', '好开心',
    '棒极了', '太赞了', '好开心啊', '好幸福', '好激动', '好兴奋',
    '好有趣', '好好玩', '真精彩', '太有意思了'
  ];

  private static readonly SAD_WORDS = [
    '悲伤', '难过', '伤心', '痛苦', '忧愁', '忧郁', '沮丧', '消沉',
    '哀伤', '凄凉', '悲痛', '悲哀', '悲凄', '哭泣', '泪', '呜呜',
    '呜', '哎', '唉', '可怜', '可悲', '遗憾', '惆怅', '凄惨',
    '好难过', '好伤心', '好痛苦', '好绝望', '好孤独', '好寂寞',
    '心碎', '心痛', '泪流满面', '痛不欲生'
  ];

  private static readonly ANGRY_WORDS = [
    '生气', '愤怒', '恼火', '发火', '火大', '气愤', '恼怒', '暴怒',
    '震怒', '大怒', '怒火', '怒气', '怒不可遏', '怒火中烧', '气死了',
    '气炸了', '可恶', '混蛋', '可恨', '该死', '可恶', '岂有此理',
    '太过分了', '忍无可忍', '气死我了', '气死人', '太气人了', '欺人太甚'
  ];

  /**
   * 分析文本的情感
   * @param text 要分析的文本
   * @returns 情感分析结果
   */
  static analyzeText(text: string): EmotionResult {
    console.log('【EmotionAnalyzer】情感分析开始 ====');
    console.log('输入文本:', text);
    
    // 分句
    const sentences = text.split(/[。！？!?]/).filter(s => s.trim());
    console.log('分句结果:', sentences);

    // 分析每个句子的情感
    const analyzedSentences = sentences.map((sentence, index) => {
      console.log(`\n分析句子${index + 1}:`, sentence);
      const result = this.analyzeSentenceEmotion(sentence);
      console.log('句子情感:', result.emotion);

      // 分析短语
      const phrases = sentence.split(/[，,、；;：:]/g).map((phrase, pIndex) => {
        const phraseResult = {
          text: phrase.trim(),
          emotion: EmotionAnalyzer.analyzePhraseEmotion(phrase),
          emphasis: EmotionAnalyzer.getEmphasisLevel(phrase) as 'none' | 'moderate' | 'strong'
        };
        console.log(`  短语${pIndex + 1}:`, {
          text: phraseResult.text,
          emotion: phraseResult.emotion,
          emphasis: phraseResult.emphasis
        });
        return phraseResult;
      });

      return {
        ...result,
        style: result.emotion?.category || 'neutral',
        phrases
      };
    });

    // 计算全局情感
    const globalEmotion = this.calculateGlobalEmotion(analyzedSentences);
    console.log('\n全局情感分析结果:', globalEmotion);
    console.log('【EmotionAnalyzer】情感分析结束 ====\n');

    return {
      globalEmotion,
      sentences: analyzedSentences,
      globalStyle: globalEmotion.category
    };
  }

  private static getEmphasisLevel(text: string): 'none' | 'moderate' | 'strong' {
    // 根据标点符号和关键词判断强调程度
    if (text.includes('！') || text.includes('!')) {
      return 'strong';
    } else if (text.includes('？') || text.includes('?')) {
      return 'moderate';
    }
    return 'none';
  }

  /**
   * 将复杂的情感分析结果转换为简单的参数
   */
  static toSimpleResult(emotionInput: EmotionResult): {
    speedRatio: number;
    volumeRatio: number;
    pitchRatio: number;
  } {
    const { globalEmotion } = emotionInput;
    console.log('【EmotionAnalyzer】开始转换情感参数:', globalEmotion);
    
    // 根据情感类别和强度调整参数 - 加强版
    let speedRatio = 1.0;
    let volumeRatio = 1.0;
    let pitchRatio = 1.0;
    
    switch (globalEmotion.category) {
      case 'happy':
        speedRatio = 1.4 + globalEmotion.intensity * 0.6;  // 更快的语速
        pitchRatio = 1.5 + globalEmotion.intensity * 0.5;  // 更高的音调
        volumeRatio = 1.4 + globalEmotion.intensity * 0.4; // 更大的音量
        break;
      case 'sad':
        speedRatio = 0.5 - globalEmotion.intensity * 0.3;  // 更慢的语速
        pitchRatio = 0.4 - globalEmotion.intensity * 0.3;  // 更低的音调
        volumeRatio = 0.6 - globalEmotion.intensity * 0.3; // 更小的音量
        break;
      case 'angry':
        speedRatio = 1.6 + globalEmotion.intensity * 0.6;  // 更快的语速
        pitchRatio = 1.4 + globalEmotion.intensity * 0.4;  // 更高的音调
        volumeRatio = 1.6 + globalEmotion.intensity * 0.4; // 更大的音量
        break;
      default:
        // 保持默认值
        break;
    }
    
    const outputParams = {
      speedRatio,
      volumeRatio,
      pitchRatio
    };
    
    console.log('【EmotionAnalyzer】转换后的参数:', outputParams);
    return outputParams;
  }
  
  static analyzeSentenceEmotion(sentence: string): {
    text: string;
    emotion?: {
      category: string;
      intensity: number;
    };
  } {
    console.log('【EmotionAnalyzer】开始分析句子情感:', sentence);

    // 计算各种情感词的出现次数
    const happyCount = this.HAPPY_WORDS.filter(word => sentence.includes(word)).length;
    const sadCount = this.SAD_WORDS.filter(word => sentence.includes(word)).length;
    const angryCount = this.ANGRY_WORDS.filter(word => sentence.includes(word)).length;

    console.log('【EmotionAnalyzer】情感词统计:', {
      happy: happyCount,
      sad: sadCount,
      angry: angryCount
    });

    let category = 'neutral';
    let intensity = 0;

    if (happyCount > sadCount && happyCount > angryCount) {
      category = 'happy';
      intensity = Math.min(1, happyCount * 0.3);
      return {
        text: sentence,
        emotion: { category, intensity }
      };
    }

    if (sadCount > happyCount && sadCount > angryCount) {
      category = 'sad';
      intensity = Math.min(1, sadCount * 0.5); // 增加悲伤情感的强度
      return {
        text: sentence,
        emotion: { category, intensity }
      };
    }

    if (angryCount > happyCount && angryCount > sadCount) {
      category = 'angry';
      intensity = Math.min(1, angryCount * 0.4);
      return {
        text: sentence,
        emotion: { category, intensity }
      };
    }

    // 如果没有明显情感，返回中性
    return {
      text: sentence,
      emotion: { category: 'neutral', intensity: 0 }
    };
  }

  static calculateGlobalEmotion(sentences: Array<{
    text: string;
    emotion?: {
      category: string;
      intensity: number;
    };
  }>): { category: string; intensity: number } {
    // 统计各种情感的出现次数和强度
    const emotionStats: { [key: string]: { count: number; totalIntensity: number } } = {};
    
    sentences.forEach(sentence => {
      if (sentence.emotion) {
        const { category, intensity } = sentence.emotion;
        if (!emotionStats[category]) {
          emotionStats[category] = { count: 0, totalIntensity: 0 };
        }
        emotionStats[category].count += 1;
        emotionStats[category].totalIntensity += intensity;
      }
    });
    
    // 找出出现次数最多的情感
    let maxCount = 0;
    let globalCategory = 'neutral';
    let globalIntensity = 0;
    Object.entries(emotionStats).forEach(([category, stats]) => {
      if (stats.count > maxCount) {
        maxCount = stats.count;
        globalCategory = category;
        globalIntensity = stats.totalIntensity / stats.count;
      }
    });
    
    return {
      category: globalCategory,
      intensity: Math.min(1, globalIntensity)  // 确保强度在0-1之间
    };
  }

  /**
   * 分析短语级别的情感
   * @param phrase 要分析的短语
   * @returns 情感分析结果
   */
  private static analyzePhraseEmotion(phrase: string): {
    category: string;
    intensity: number;
  } | undefined {
    console.log('【EmotionAnalyzer】开始分析短语情感:', phrase);

    // 计算各种情感词的出现次数
    const happyCount = this.HAPPY_WORDS.filter(word => phrase.includes(word)).length;
    const sadCount = this.SAD_WORDS.filter(word => phrase.includes(word)).length;
    const angryCount = this.ANGRY_WORDS.filter(word => phrase.includes(word)).length;

    console.log('【EmotionAnalyzer】短语情感词统计:', {
      happy: happyCount,
      sad: sadCount,
      angry: angryCount
    });

    // 确定主导情感
    let category = '';
    let intensity = 0;

    if (happyCount > sadCount && happyCount > angryCount) {
      category = 'happy';
      intensity = Math.min(1, happyCount * 0.4); // 短语级别情感强度略高
    } else if (sadCount > happyCount && sadCount > angryCount) {
      category = 'sad';
      intensity = Math.min(1, sadCount * 0.4);
    } else if (angryCount > 0) {
      category = 'angry';
      intensity = Math.min(1, angryCount * 0.4);
    }

    console.log('【EmotionAnalyzer】短语情感分析结果:', {
      category,
      intensity
    });

    return category ? { category, intensity } : undefined;
  }
} 