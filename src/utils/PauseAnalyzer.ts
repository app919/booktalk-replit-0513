export interface PauseResult {
  // 停顿点列表
  pausePoints: Array<{
    position: number;      // 停顿位置（字符索引）
    duration: number;      // 停顿时长（毫秒）
    type: 'punctuation' | 'grammar' | 'emotion' | 'breath';  // 停顿类型
    strength?: 'none' | 'x-weak' | 'weak' | 'medium' | 'strong' | 'x-strong';  // 停顿强度
  }>;
}

export class PauseAnalyzer {
  // 标点符号停顿时长(毫秒) - 加强版
  private static readonly PUNCTUATION_PAUSE_DURATION: { [key: string]: number } = {
    '，': 400,   // 逗号
    '、': 400,   // 顿号
    '。': 800,   // 句号
    '！': 1000,  // 感叹号
    '？': 800,   // 问号
    '；': 600,   // 分号
    '：': 600,   // 冒号
    '…': 2000,  // 省略号 - 加长停顿
    '—': 800,   // 破折号
    '...': 2000, // 连续省略号 - 加长停顿
    '.': 300,    // 英文句点
    ',': 300,    // 英文逗号
  };

  // 停顿强度映射 - 加强版
  private static readonly STRENGTH_MAP: { [key: string]: PauseResult['pausePoints'][0]['strength'] } = {
    '，': 'weak',
    '、': 'weak',
    '。': 'strong',
    '！': 'x-strong',
    '？': 'strong',
    '；': 'medium',
    '：': 'medium',
    '…': 'x-strong',  // 省略号加强
    '—': 'strong',
    '...': 'x-strong', // 连续省略号加强
    '.': 'medium',
    ',': 'weak',
  };

  /**
   * 分析文本中的停顿点
   * @param text 要分析的文本
   * @returns 停顿点列表
   */
  static analyzePauses(text: string): PauseResult {
    console.log('【PauseAnalyzer】开始分析停顿:', text);
    const pausePoints: PauseResult['pausePoints'] = [];

    // 处理连续的省略号
    text = text.replace(/\.{3,}/g, '...');
    console.log('【PauseAnalyzer】处理省略号后的文本:', text);

    let position = 0;
    while (position < text.length) {
      let found = false;
      
      // 检查每个标点符号
      for (const [punct, duration] of Object.entries(this.PUNCTUATION_PAUSE_DURATION)) {
        if (text.startsWith(punct, position)) {
          console.log(`【PauseAnalyzer】在位置 ${position} 发现标点符号:`, {
            punctuation: punct,
            duration,
            strength: this.STRENGTH_MAP[punct]
          });

          // 对于省略号，增加额外的停顿
          const isEllipsis = punct === '...' || punct === '…';
          const actualDuration = isEllipsis ? duration * 1.5 : duration;

          pausePoints.push({
            position,
            duration: actualDuration,
            type: 'punctuation',
            strength: this.STRENGTH_MAP[punct]
          });
          
          position += punct.length;
          found = true;
          break;
        }
      }

      if (!found) {
        position++;
      }
    }

    // 添加语法和情感停顿
    this.addGrammarPauses(text, pausePoints);
    this.addEmotionPauses(text, pausePoints);
    this.addBreathPauses(text, pausePoints);

    // 按位置排序停顿点
    pausePoints.sort((a, b) => a.position - b.position);
    
    console.log('【PauseAnalyzer】最终停顿分析结果:', pausePoints);
    return { pausePoints };
  }

  /**
   * 添加语法结构停顿
   */
  private static addGrammarPauses(text: string, pausePoints: PauseResult['pausePoints']) {
    // 主谓之间的停顿
    const subjectPredicatePattern = /([^，。！？；：]+)([是|要|会|能|可以|应该])/g;
    let match;
    while ((match = subjectPredicatePattern.exec(text)) !== null) {
      pausePoints.push({
        position: match.index + match[1].length,
        duration: 300,
        type: 'grammar',
        strength: 'weak',
      });
    }
  }

  /**
   * 添加情感停顿
   */
  private static addEmotionPauses(text: string, pausePoints: PauseResult['pausePoints']) {
    // 情感词后的停顿
    const emotionWords = [
      '开心', '快乐', '高兴', '欢喜', '愉悦', '欢乐',
      '悲伤', '难过', '伤心', '痛苦', '忧愁', '哀伤',
      '生气', '愤怒', '恼火', '气愤', '暴怒', '发火'
    ];
    
    emotionWords.forEach(word => {
      let index = text.indexOf(word);
      while (index !== -1) {
        pausePoints.push({
          position: index + word.length,
          duration: 500, // 情感词后停顿加长
          type: 'emotion',
          strength: 'strong',
        });
        index = text.indexOf(word, index + 1);
      }
    });
  }

  /**
   * 添加呼吸停顿
   */
  private static addBreathPauses(text: string, pausePoints: PauseResult['pausePoints']) {
    // 每隔一定字数添加呼吸停顿
    const breathInterval = 10; // 每10个字符添加一个呼吸停顿
    for (let i = breathInterval; i < text.length; i += breathInterval) {
      // 检查当前位置是否已有其他停顿
      const hasExistingPause = pausePoints.some(p => 
        Math.abs(p.position - i) < 3 // 如果3个字符内已有停顿，则跳过
      );
      
      if (!hasExistingPause) {
        pausePoints.push({
          position: i,
          duration: 200,
          type: 'breath',
          strength: 'x-weak',
        });
      }
    }
  }
} 