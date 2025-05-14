import { EmotionResult } from './EmotionAnalyzer';

export class SSMLGenerator {
  // 记录上一个情感状态，用于情感过渡
  private static prevEmotion: { category: string; intensity: number } | null = null;

  static generate(text: string, emotionResult: EmotionResult): string {
    console.log('【SSMLGenerator】开始生成SSML ====');
    console.log('输入文本:', text);
    console.log('情感分析结果:', emotionResult);
    
    // 基本的SSML结构
    let ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis">`;
    
    // 根据全局情感设置整体语音风格
    const globalStyle = this.getGlobalStyle(emotionResult.globalEmotion);
    ssml += `<prosody rate="${globalStyle.rate}" pitch="${globalStyle.pitch}" volume="${globalStyle.volume}">`;
    
    // 处理每个句子
    emotionResult.sentences.forEach((sentence, index) => {
      console.log(`\n处理句子${index + 1}:`, sentence.text);
      
      // 添加情感过渡
      if (this.prevEmotion && sentence.emotion && 
          this.prevEmotion.category !== sentence.emotion.category) {
        const transition = this.calculateTransition(this.prevEmotion, sentence.emotion);
        console.log('情感过渡:', transition);
        ssml += `<prosody rate="${transition.rate}" pitch="${transition.pitch}">`;
      }
      
      // 添加句子级别的情感和停顿
      const sentenceStyle = this.getSentenceStyle(sentence.emotion);
      console.log('句子语音风格:', sentenceStyle);
      ssml += `<prosody rate="${sentenceStyle.rate}" pitch="${sentenceStyle.pitch}" volume="${sentenceStyle.volume}">`;
      
      // 处理每个短语
      const phrases = this.splitIntoPhrases(sentence.text);
      phrases.forEach((phrase, pIndex) => {
        const pauseInfo = this.getPauseInfo(phrase);
        console.log(`  短语${pIndex + 1} 停顿信息:`, {
          text: phrase.text,
          pauseInfo
        });
        
        if (pauseInfo.beforePause) {
          ssml += `<break time="${pauseInfo.beforePause}ms" strength="${pauseInfo.strength}"/>`;
        }
        ssml += phrase.text;
        if (pauseInfo.afterPause) {
          ssml += `<break time="${pauseInfo.afterPause}ms" strength="${pauseInfo.strength}"/>`;
        }
      });
      
      ssml += '</prosody>';
      
      // 更新上一个情感状态
      if (sentence.emotion) {
        this.prevEmotion = sentence.emotion;
      }
    });
    
    ssml += '</prosody></speak>';
    console.log('\n生成的SSML:', ssml);
    console.log('【SSMLGenerator】SSML生成结束 ====\n');
    return ssml;
  }

  private static calculateTransition(
    prevEmotion: { category: string; intensity: number },
    nextEmotion: { category: string; intensity: number }
  ): { rate: string; pitch: string } {
    // 计算过渡参数
    const rateChange = this.getTransitionRate(prevEmotion, nextEmotion);
    const pitchChange = this.getTransitionPitch(prevEmotion, nextEmotion);
    
    return {
      rate: `${rateChange}%`,
      pitch: `${pitchChange}%`
    };
  }

  private static getTransitionRate(prev: { category: string; intensity: number }, next: { category: string; intensity: number }): number {
    const baseRate = 100;
    const transitionFactor = 0.5; // 过渡因子
    
    if (prev.category === 'happy' && next.category === 'sad') {
      return baseRate - (next.intensity * 30 * transitionFactor);
    }
    
    if (prev.category === 'sad' && next.category === 'happy') {
      return baseRate + (next.intensity * 30 * transitionFactor);
    }
    
    return baseRate;
  }

  private static getTransitionPitch(prev: { category: string; intensity: number }, next: { category: string; intensity: number }): number {
    const basePitch = 0;
    const transitionFactor = 0.5; // 过渡因子
    
    if (prev.category === 'happy' && next.category === 'sad') {
      return basePitch - (next.intensity * 20 * transitionFactor);
    }
    
    if (prev.category === 'sad' && next.category === 'happy') {
      return basePitch + (next.intensity * 20 * transitionFactor);
    }
    
    return basePitch;
  }

  private static getGlobalStyle(emotion: { category: string; intensity: number }) {
    const baseRate = 100;
    const basePitch = 0;
    const baseVolume = 100;

    switch (emotion.category) {
      case 'happy':
        return {
          rate: baseRate + (emotion.intensity * 20), // 更快的语速
          pitch: basePitch + (emotion.intensity * 20), // 更高的音调
          volume: baseVolume + (emotion.intensity * 10)
        };
      case 'sad':
        return {
          rate: baseRate - (emotion.intensity * 30), // 更慢的语速
          pitch: basePitch - (emotion.intensity * 40), // 更低的音调
          volume: baseVolume - (emotion.intensity * 20) // 更低的音量
        };
      case 'angry':
        return {
          rate: baseRate + (emotion.intensity * 20), // 更快的语速
          pitch: basePitch + (emotion.intensity * 10), // 稍高的音调
          volume: baseVolume + (emotion.intensity * 30)
        };
      default:
        return {
          rate: baseRate,
          pitch: basePitch,
          volume: baseVolume
        };
    }
  }
  
  private static getSentenceStyle(emotion?: { category: string; intensity: number }): {
    rate: string;
    pitch: string;
    volume: string;
  } {
    if (!emotion) {
      return {
        rate: '100%',
        pitch: '0%',
        volume: '0dB'
      };
    }

    let rate = '100%';
    let pitch = '0%';
    let volume = '0dB';

    switch (emotion.category) {
      case 'happy':
        rate = `${110 + emotion.intensity * 30}%`;  // 更快的语速
        pitch = `+${15 + emotion.intensity * 25}%`; // 更高的音调
        volume = `+${5 + emotion.intensity * 15}dB`;
        break;
      case 'sad':
        rate = `${90 - emotion.intensity * 20}%`;   // 更慢的语速
        pitch = `-${15 + emotion.intensity * 15}%`; // 更低的音调
        volume = `-${5 + emotion.intensity * 10}dB`;
        break;
      case 'angry':
        rate = `${120 + emotion.intensity * 30}%`;  // 更快的语速
        pitch = `+${25 + emotion.intensity * 15}%`; // 更高的音调
        volume = `+${15 + emotion.intensity * 15}dB`;
        break;
      default:
        rate = '100%';
        pitch = '0%';
        volume = '0dB';
        break;
    }

    return { rate, pitch, volume };
  }

  private static splitIntoPhrases(text: string): Array<{ text: string }> {
    return text.split(/([，。！？；：、…])/g)
      .filter(s => s.trim())
      .map(s => ({ text: s.trim() }));
  }

  private static getPauseInfo(phrase: { text: string }): {
    beforePause: number;
    afterPause: number;
    strength: string;
  } {
    const pauseMap: { [key: string]: { duration: number; strength: string } } = {
      '，': { duration: 300, strength: 'weak' },     // 减少停顿时间
      '。': { duration: 600, strength: 'strong' },   // 减少停顿时间
      '！': { duration: 800, strength: 'x-strong' }, // 减少停顿时间
      '？': { duration: 600, strength: 'strong' },   // 减少停顿时间
      '；': { duration: 500, strength: 'medium' },   // 减少停顿时间
      '：': { duration: 500, strength: 'medium' },   // 减少停顿时间
      '、': { duration: 200, strength: 'weak' },     // 减少停顿时间
      '…': { duration: 1000, strength: 'x-strong' }  // 减少停顿时间
    };

    const char = phrase.text;
    if (char in pauseMap) {
      return {
        beforePause: 0,
        afterPause: pauseMap[char].duration,
        strength: pauseMap[char].strength
      };
    }

    return {
      beforePause: 0,
      afterPause: 0,
      strength: 'none'
    };
  }

  private static getPhraseStyle(emotion: { category: string; intensity: number }) {
    const baseRate = 100;
    const basePitch = 0;
    const baseVolume = 100;

    switch (emotion.category) {
      case 'happy':
        return {
          rate: baseRate + (emotion.intensity * 15),
          pitch: basePitch + (emotion.intensity * 15),
          volume: baseVolume + (emotion.intensity * 10)
        };
      case 'sad':
        return {
          rate: baseRate - (emotion.intensity * 35), // 更慢的语速
          pitch: basePitch - (emotion.intensity * 45), // 更低的音调
          volume: baseVolume - (emotion.intensity * 25) // 更低的音量
        };
      case 'angry':
        return {
          rate: baseRate + (emotion.intensity * 15),
          pitch: basePitch + (emotion.intensity * 10),
          volume: baseVolume + (emotion.intensity * 25)
        };
      default:
        return {
          rate: baseRate,
          pitch: basePitch,
          volume: baseVolume
        };
    }
  }
} 