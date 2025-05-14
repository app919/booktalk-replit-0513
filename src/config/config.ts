/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import { StreamIndex } from '@volcengine/rtc';
import {
  TTS_CLUSTER,
  ARK_V3_MODEL_ID,
  MODEL_MODE,
  SCENE,
  Prompt,
  Welcome,
  Model,
  Voice,
  AI_MODEL,
  AI_MODE_MAP,
  AI_MODEL_MODE,
  LLM_BOT_ID,
  isVisionMode,
} from '.';
import { EmotionAnalyzer, SSMLGenerator } from '../utils';

export const CONVERSATION_SIGNATURE = 'conversation';

/**
 * @brief RTC & AIGC 配置。
 * @notes 更多参数请参考
 *        https://www.volcengine.com/docs/6348/1404673?s=g
 */
export class ConfigFactory {
  BaseConfig = {
    /**
     * @note 必填, RTC AppId 可于 https://console.volcengine.com/rtc/listRTC?s=g 中获取。
     */
    AppId: '6814588b835c48039e87dad8',
    /**
     * @brief 非必填, 按需填充。
     */
    BusinessId: undefined,
    /**
     * @brief 必填, 房间 ID, 自定义即可，例如 "Room123"。
     * @note 建议使用有特定规则、不重复的房间号名称。
     */
    RoomId: 'Room123', // 硬编码简单的房间 ID
    /**
     * @brief 必填, 当前和 AI 对话的用户的 ID, 自定义即可，例如 "User123"。
     */
    UserId: 'User123', // 硬编码简单的用户 ID
    /**
     * @brief 必填, RTC Token, 由 AppId、RoomId、UserId、时间戳等等信息计算得出。
     */
    Token: '', // 启动时动态获取
    /**
     * @brief 必填, TTS(语音合成) AppId, 可于 https://console.volcengine.com/speech/app?s=g 中获取, 若无可先创建应用。
     * @note 创建应用时, 需要选择 "语音合成" 服务, 并选择对应的 App 进行绑定。
     */
    TTSAppId: '9343054868',
    /**
     * @brief 已开通需要的语音合成服务的token。
     *        使用火山引擎双向流式语音合成服务时 必填。
     */
    TTSToken: '7BXRebMdNuKZvCNI2bS2ArJqjw2o-qXT',
    /**
     * @brief 必填, ASR(语音识别) AppId, 可于 https://console.volcengine.com/speech/app?s=g 中获取, 若无可先创建应用。
     * @note 创建应用时, 需要按需根据语言选择 "流式语音识别" 服务, 并选择对应的 App 进行绑定。
     */
    ASRAppId: '9343054868',
    /**
     * @brief 已开通流式语音识别大模型服务 AppId 对应的 Access Token。
     * @note 使用流式语音识别 **大模型** 服务时必填, 可于 https://console.volcengine.com/speech/service/10011?AppID=6482372612&s=g 中查看。
     */
    ASRToken: '7BXRebMdNuKZvCNI2bS2ArJqjw2o-qXT',
  };

  Model: AI_MODEL = Model[SCENE.INTELLIGENT_ASSISTANT];

  /**
   * @note 必填, 音色 ID, 可具体看定义。
   *       音色 ID 获取方式可查看 VOICE_TYPE 定义
   *       此处已有默认值, 不影响跑通, 可按需修改。
   */
  VoiceType = Voice[SCENE.INTELLIGENT_ASSISTANT];

  /**
   * @note 大模型 System 角色预设指令, 可用于控制模型输出, 类似 Prompt 的概念。
   */
  Prompt = Prompt[SCENE.INTELLIGENT_ASSISTANT];

  /**
   * @note 智能体启动后的欢迎词。
   */
  WelcomeSpeech = Welcome[SCENE.INTELLIGENT_ASSISTANT];

  /**
   * @note 当前使用的模型来源, 具体可参考 MODEL_MODE 定义。
   *       通过 UI 修改, 无须手动配置。
   */
  ModeSourceType = MODEL_MODE.COZE;

  /**
   * @note 非必填, 第三方模型才需要使用, 用火山方舟模型时无需关注。
   */
  Url? = 'https://api.coze.cn';

  /**
   * @note 非必填, 第三方模型才需要使用, 用火山方舟模型时无需关注。
   */
  APIKey? = 'pat_DVjgUL1bGX6uAOZHKeb2vWWEIZDu81Iz5arZK6Dt8xl230SoqlCJJ0jZWbejE99x';

  /**
   * @brief AI Robot 名
   * @default RobotMan_
   */
  BotName = 'RobotMan_';

  /**
   * @note Coze 智能体 ID，可通过 UI 配置，也可以在此直接定义。
   */
  BotID = '7497544198133596175';

  /**
   * @brief 是否为打断模式
   */
  InterruptMode = true;

  /**
   * @brief 如果使用视觉模型，用的是哪种源，有摄像头采集流/屏幕流
   */
  VisionSourceType = StreamIndex.STREAM_INDEX_MAIN;

  get LLMConfig() {
    const params: Record<string, unknown> = {
      Mode: AI_MODE_MAP[this.Model || ''] || AI_MODEL_MODE.CUSTOM,
      /**
       * @note EndPointId 与 BotId 不可同时填写，若同时填写，则 EndPointId 生效。
       *       当前仅支持自定义推理接入点，不支持预置推理接入点。
       */
      EndPointId: ARK_V3_MODEL_ID[this.Model],
      BotId: LLM_BOT_ID[this.Model],
      MaxTokens: 1024,
      Temperature: 0.1,
      TopP: 0.3,
      SystemMessages: [this.Prompt as string],
      Prefill: true,
      ModelName: this.Model,
      ModelVersion: '1.0',
      WelcomeSpeech: this.WelcomeSpeech,
      APIKey: this.APIKey,
      Url: this.Url,
      Feature: JSON.stringify({ Http: true }),
    };
    if (LLM_BOT_ID[this.Model]) {
      /**
       * @note 如果您配置了方舟智能体, 并且开启了 Function Call 能力, 需要传入 Tools 字段, 描述函数相关信息。
       *       相关配置可查看 https://www.volcengine.com/docs/6348/1404673?s=g#llmconfig%EF%BC%88%E7%81%AB%E5%B1%B1%E6%96%B9%E8%88%9F%E5%B9%B3%E5%8F%B0%EF%BC%89
       *       对应的调用定义于 src/utils/handler.ts 文件中, 可参考对应逻辑。
       */
      params.Tools = [
        {
          type: 'function',
          function: {
            name: 'get_current_weather',
            description: '获取给定地点的天气',
            parameters: {
              type: 'object',
              properties: {
                location: {
                  type: 'string',
                  description: '地理位置，比如北京市',
                },
                unit: {
                  type: 'string',
                  description: '',
                  enum: ['摄氏度', '华氏度'],
                },
              },
              required: ['location'],
            },
          },
        },
      ];
    }
    if (isVisionMode(this.Model)) {
      params.VisionConfig = {
        Enable: true,
        SnapshotConfig: {
          StreamType: this.VisionSourceType,
          Height: 640,
          ImagesLimit: 1,
        },
      };
    }
    if (this.ModeSourceType === MODEL_MODE.COZE) {
      /**
       * @note Coze 智能体配置的相关参数, 可参考: https://www.volcengine.com/docs/6348/1404673?s=g#llmconfig%EF%BC%88coze%E5%B9%B3%E5%8F%B0%EF%BC%89
       */
      return {
        Mode: 'CozeBot',
        CozeBotConfig: {
          Url: 'https://api.coze.cn',
          BotID: this.BotID,
          APIKey: this.APIKey,
          UserId: this.BaseConfig.UserId,
          HistoryLength: 10,
          Prefill: false,
          EnableConversation: false,
        },
      };
    }
    return params;
  }

  get ASRConfig() {
    /**
     * @brief SmallModelASRConfigs 为小模型的配置
     * @note 本示例代码使用的是小模型语音识别, 如感觉 ASR 效果不佳，可尝试使用大模型进行语音识别。
     */
    const SmallModelASRConfigs = {
      Provider: 'volcano',
      ProviderParams: {
        Mode: 'smallmodel',
        AppId: this.BaseConfig.ASRAppId,
        /**
         * @note 具体流式语音识别服务对应的 Cluster ID，可在流式语音服务控制台开通对应服务后查询。
         *       具体链接为: https://console.volcengine.com/speech/service/16?s=g
         */
        Cluster: 'volcengine_streaming_common',
        EnableVAD: true,
        EnablePunctuation: true,
        EnableIntermediateResult: true,
        EnableSentenceDetection: true,
      },
      /**
       * @note 小模型情况下, 建议使用 VAD 及音量采集设置, 以优化识别效果。
       */
      VADConfig: {
        SilenceTime: 1000,        // 增加静音时间阈值
        SilenceThreshold: 100,    // 降低静音检测阈值
        MaxDuration: 60000,       // 最大录音时长(毫秒)
        AutoStart: true,          // 自动开始录音
        AutoRestart: true         // 自动重新开始
      },
      VolumeGain: 1.0,           // 增加音量增益
      EnableNoiseReduction: true, // 启用降噪
      EnableAudioDump: true      // 启用音频转储，方便调试
    };

    /**
     * @brief BigModelASRConfigs 为大模型的配置
     * @note 大模型的使用详情可参考 https://www.volcengine.com/docs/6348/1404673#volcanolmasrconfig?s=g
     */
    const BigModelASRConfigs = {
      Provider: 'volcano',
      ProviderParams: {
        Mode: 'bigmodel',
        AppId: this.BaseConfig.ASRAppId,
        AccessToken: this.BaseConfig.ASRToken,
        EnableVAD: true,
        EnablePunctuation: true,
        EnableIntermediateResult: true,
        EnableSentenceDetection: true,
      },
      VADConfig: {
        SilenceTime: 1000,
        SilenceThreshold: 100,
        MaxDuration: 60000,
        AutoStart: true,
        AutoRestart: true
      },
      VolumeGain: 1.0,
      EnableNoiseReduction: true,
      EnableAudioDump: true
    };
    return this.BaseConfig.ASRToken ? BigModelASRConfigs : SmallModelASRConfigs;
  }

  get TTSConfig() {
    const params: Record<string, any> = {
      Provider: 'volcano',
      ProviderParams: {
        app: {
          AppId: this.BaseConfig.TTSAppId,
          Cluster: TTS_CLUSTER.TTS,
        },
        audio: {
          voice_type: this.VoiceType,
          speed_ratio: 1.0,
        },
      },
      IgnoreBracketText: [1, 2, 3, 4, 5],
    };
    if (this.BaseConfig.TTSToken) {
      params.ProviderParams.app.Token = this.BaseConfig.TTSToken;
    }
    return params;
  }

  get aigcConfig() {
    return {
      Config: {
        LLMConfig: this.LLMConfig,
        TTSConfig: this.TTSConfig,
        ASRConfig: this.ASRConfig,
        InterruptMode: this.InterruptMode ? 0 : 1,
        SubtitleConfig: {
          SubtitleMode: 0,
        },
      },
      AgentConfig: {
        UserId: this.BotName,
        WelcomeMessage: this.WelcomeSpeech,
        EnableConversationStateCallback: true,
        ServerMessageSignatureForRTS: CONVERSATION_SIGNATURE,
        TargetUserId: [this.BaseConfig.UserId],
      },
    };
  }

  // 动态获取token方法
  async fetchToken() {
    try {
      // 在 Replit 环境中使用动态获取的域名
      const REPLIT_URL = typeof window !== 'undefined' ? window.location.origin : '';
      const response = await fetch(`${REPLIT_URL}/api/getToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          AppId: this.BaseConfig.AppId,
          RoomId: this.BaseConfig.RoomId,
          UserId: this.BaseConfig.UserId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.BaseConfig.Token = data.token;
      this.BaseConfig.RoomId = data.roomId;
      this.BaseConfig.UserId = data.userId;

      console.log('Token获取成功:', {
        token: this.BaseConfig.Token.substring(0, 10) + '...',
        roomId: this.BaseConfig.RoomId,
        userId: this.BaseConfig.UserId
      });

      return this.BaseConfig.Token;
    } catch (error) {
      console.error('获取Token失败:', error);
      throw error;
    }
  }

  processTextToSSML(text: string): Record<string, any> {
    console.log('【ConfigFactory】开始处理文本:', text);
    const params = this.TTSConfig;
    
    // 1. 分析文本的情感
    const emotionResult = EmotionAnalyzer.analyzeText(text);
    console.log('【ConfigFactory】情感分析结果:', emotionResult);
    
    // 2. 生成带有情感和停顿的SSML
    const ssml = SSMLGenerator.generate(text, emotionResult);
    console.log('【ConfigFactory】生成的SSML:', ssml);
    
    // 3. 设置SSML文本
    params.ProviderParams.ssml.text = ssml;
    
    // 4. 根据情感设置全局音频参数
    const simpleResult = EmotionAnalyzer.toSimpleResult(emotionResult);
    console.log('【ConfigFactory】转换后的音频参数:', simpleResult);
    
    params.ProviderParams.audio.speed_ratio = simpleResult.speedRatio;
    params.ProviderParams.audio.volume = simpleResult.volumeRatio;
    params.ProviderParams.audio.pitch_ratio = simpleResult.pitchRatio;
    
    console.log('【ConfigFactory】最终TTS配置:', params);
    return params;
  }
}
