/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import VERTC, {
  MirrorType,
  StreamIndex,
  IRTCEngine,
  RoomProfileType,
  onUserJoinedEvent,
  onUserLeaveEvent,
  MediaType,
  LocalStreamStats,
  RemoteStreamStats,
  StreamRemoveReason,
  LocalAudioPropertiesInfo,
  RemoteAudioPropertiesInfo,
  AudioProfileType,
  DeviceInfo,
  AutoPlayFailedEvent,
  PlayerEvent,
  NetworkQuality,
  VideoRenderMode,
  ScreenEncoderConfig,
} from '@volcengine/rtc';
import RTCAIAnsExtension from '@volcengine/rtc/extension-ainr';
import { Message } from '@arco-design/web-react';
import openAPIs from '@/app/api';
import aigcConfig from '@/config';
import Utils from '@/utils/utils';
import { COMMAND, INTERRUPT_PRIORITY } from '@/utils/handler';

export interface IEventListener {
  handleError: (e: { errorCode: any }) => void;
  handleUserJoin: (e: onUserJoinedEvent) => void;
  handleUserLeave: (e: onUserLeaveEvent) => void;
  handleTrackEnded: (e: { kind: string; isScreen: boolean }) => void;
  handleUserPublishStream: (e: { userId: string; mediaType: MediaType }) => void;
  handleUserUnpublishStream: (e: {
    userId: string;
    mediaType: MediaType;
    reason: StreamRemoveReason;
  }) => void;
  handleRemoteStreamStats: (e: RemoteStreamStats) => void;
  handleLocalStreamStats: (e: LocalStreamStats) => void;
  handleLocalAudioPropertiesReport: (e: LocalAudioPropertiesInfo[]) => void;
  handleRemoteAudioPropertiesReport: (e: RemoteAudioPropertiesInfo[]) => void;
  handleAudioDeviceStateChanged: (e: DeviceInfo) => void;
  handleAutoPlayFail: (e: AutoPlayFailedEvent) => void;
  handlePlayerEvent: (e: PlayerEvent) => void;
  handleUserStartAudioCapture: (e: { userId: string }) => void;
  handleUserStopAudioCapture: (e: { userId: string }) => void;
  handleRoomBinaryMessageReceived: (e: { userId: string; message: ArrayBuffer }) => void;
  handleNetworkQuality: (
    uplinkNetworkQuality: NetworkQuality,
    downlinkNetworkQuality: NetworkQuality
  ) => void;
}

interface EngineOptions {
  appId: string;
  uid: string;
  roomId: string;
}

export interface BasicBody {
  room_id: string;
  user_id: string;
  login_token: string | null;
}

/**
 * @brief RTC Core Client
 * @notes Refer to official website documentation to get more information about the API.
 */
export class RTCClient {
  engine!: IRTCEngine;

  config!: EngineOptions;

  basicInfo!: BasicBody;

  private _audioCaptureDevice?: string;

  private _videoCaptureDevice?: string;

  audioBotEnabled = false;

  audioBotStartTime = 0;

  createEngine = async (props: EngineOptions) => {
    this.config = props;
    this.basicInfo = {
      room_id: props.roomId,
      user_id: props.uid,
      login_token: aigcConfig.BaseConfig.Token,
    };

    this.engine = VERTC.createEngine(this.config.appId);
    try {
      const AIAnsExtension = new RTCAIAnsExtension();
      await this.engine.registerExtension(AIAnsExtension);
      AIAnsExtension.enable();
    } catch (error) {
      console.warn(
        `当前环境不支持 AI 降噪, 此错误可忽略, 不影响实际使用, e: ${(error as any).message}`
      );
    }
  };

  addEventListeners = ({
    handleError,
    handleUserJoin,
    handleUserLeave,
    handleTrackEnded,
    handleUserPublishStream,
    handleUserUnpublishStream,
    handleRemoteStreamStats,
    handleLocalStreamStats,
    handleLocalAudioPropertiesReport,
    handleRemoteAudioPropertiesReport,
    handleAudioDeviceStateChanged,
    handleAutoPlayFail,
    handlePlayerEvent,
    handleUserStartAudioCapture,
    handleUserStopAudioCapture,
    handleRoomBinaryMessageReceived,
    handleNetworkQuality,
  }: IEventListener) => {
    this.engine.on(VERTC.events.onError, handleError);
    this.engine.on(VERTC.events.onUserJoined, handleUserJoin);
    this.engine.on(VERTC.events.onUserLeave, handleUserLeave);
    this.engine.on(VERTC.events.onTrackEnded, handleTrackEnded);
    this.engine.on(VERTC.events.onUserPublishStream, handleUserPublishStream);
    this.engine.on(VERTC.events.onUserUnpublishStream, handleUserUnpublishStream);
    this.engine.on(VERTC.events.onRemoteStreamStats, handleRemoteStreamStats);
    this.engine.on(VERTC.events.onLocalStreamStats, handleLocalStreamStats);
    this.engine.on(VERTC.events.onAudioDeviceStateChanged, handleAudioDeviceStateChanged);
    this.engine.on(VERTC.events.onLocalAudioPropertiesReport, handleLocalAudioPropertiesReport);
    this.engine.on(VERTC.events.onRemoteAudioPropertiesReport, handleRemoteAudioPropertiesReport);
    this.engine.on(VERTC.events.onAutoplayFailed, handleAutoPlayFail);
    this.engine.on(VERTC.events.onPlayerEvent, handlePlayerEvent);
    this.engine.on(VERTC.events.onUserStartAudioCapture, handleUserStartAudioCapture);
    this.engine.on(VERTC.events.onUserStopAudioCapture, handleUserStopAudioCapture);
    this.engine.on(VERTC.events.onRoomBinaryMessageReceived, handleRoomBinaryMessageReceived);
    this.engine.on(VERTC.events.onNetworkQuality, handleNetworkQuality);
  };

  joinRoom = (token: string | null, username: string): Promise<void> => {
    this.engine.enableAudioPropertiesReport({ interval: 1000 });
    return this.engine.joinRoom(
      token,
      `${this.config.roomId!}`,
      {
        userId: this.config.uid!,
        extraInfo: JSON.stringify({
          call_scene: 'RTC-AIGC',
          user_name: username,
          user_id: this.config.uid,
        }),
      },
      {
        isAutoPublish: true,
        isAutoSubscribeAudio: true,
        roomProfileType: RoomProfileType.chat,
      }
    );
  };

  leaveRoom = () => {
    this.stopAudioBot();
    this.audioBotEnabled = false;
    this.engine.leaveRoom();
    VERTC.destroyEngine(this.engine);
    this._audioCaptureDevice = undefined;
  };

  checkPermission(): Promise<{
    video: boolean;
    audio: boolean;
  }> {
    return VERTC.enableDevices({
      video: false,
      audio: true,
    });
  }

  /**
   * @brief get the devices
   * @returns
   */
  async getDevices(props?: { video?: boolean; audio?: boolean }): Promise<{
    audioInputs: MediaDeviceInfo[];
    audioOutputs: MediaDeviceInfo[];
    videoInputs: MediaDeviceInfo[];
  }> {
    const { video = false, audio = true } = props || {};
    let audioInputs: MediaDeviceInfo[] = [];
    let audioOutputs: MediaDeviceInfo[] = [];
    let videoInputs: MediaDeviceInfo[] = [];
    const { video: hasVideoPermission, audio: hasAudioPermission } = await VERTC.enableDevices({
      video,
      audio,
    });
    if (audio) {
      const inputs = await VERTC.enumerateAudioCaptureDevices();
      const outputs = await VERTC.enumerateAudioPlaybackDevices();
      audioInputs = inputs.filter((i) => i.deviceId && i.kind === 'audioinput');
      audioOutputs = outputs.filter((i) => i.deviceId && i.kind === 'audiooutput');
      this._audioCaptureDevice = audioInputs.filter((i) => i.deviceId)?.[0]?.deviceId;
      if (hasAudioPermission) {
        if (!audioInputs?.length) {
          Message.error('无麦克风设备, 请先确认设备情况。');
        }
        if (!audioOutputs?.length) {
          Message.error('无扬声器设备, 请先确认设备情况。');
        }
      } else {
        Message.error('暂无麦克风设备权限, 请先确认设备权限授予情况。');
      }
    }
    if (video) {
      videoInputs = await VERTC.enumerateVideoCaptureDevices();
      videoInputs = videoInputs.filter((i) => i.deviceId && i.kind === 'videoinput');
      this._videoCaptureDevice = videoInputs?.[0]?.deviceId;
      if (hasVideoPermission) {
        if (!videoInputs?.length) {
          Message.error('无摄像头设备, 请先确认设备情况。');
        }
      } else {
        Message.error('暂无摄像头设备权限, 请先确认设备权限授予情况。');
      }
    }

    return {
      audioInputs,
      audioOutputs,
      videoInputs,
    };
  }

  startVideoCapture = async (camera?: string) => {
    await this.engine.startVideoCapture(camera || this._videoCaptureDevice);
  };

  stopVideoCapture = async () => {
    this.engine.setLocalVideoMirrorType(MirrorType.MIRROR_TYPE_RENDER);
    await this.engine.stopVideoCapture();
  };

  startScreenCapture = async (enableAudio = false) => {
    await this.engine.startScreenCapture({
      enableAudio,
    });
  };

  stopScreenCapture = async () => {
    await this.engine.stopScreenCapture();
  };

  startAudioCapture = async (mic?: string) => {
    await this.engine.startAudioCapture(mic || this._audioCaptureDevice);
  };

  stopAudioCapture = async () => {
    await this.engine.stopAudioCapture();
  };

  publishStream = (mediaType: MediaType) => {
    this.engine.publishStream(mediaType);
  };

  unpublishStream = (mediaType: MediaType) => {
    this.engine.unpublishStream(mediaType);
  };

  publishScreenStream = async (mediaType: MediaType) => {
    await this.engine.publishScreen(mediaType);
  };

  unpublishScreenStream = async (mediaType: MediaType) => {
    await this.engine.unpublishScreen(mediaType);
  };

  setScreenEncoderConfig = async (description: ScreenEncoderConfig) => {
    await this.engine.setScreenEncoderConfig(description);
  };

  /**
   * @brief 设置业务标识参数
   * @param businessId
   */
  setBusinessId = (businessId: string) => {
    this.engine.setBusinessId(businessId);
  };

  setAudioVolume = (volume: number) => {
    this.engine.setCaptureVolume(StreamIndex.STREAM_INDEX_MAIN, volume);
    this.engine.setCaptureVolume(StreamIndex.STREAM_INDEX_SCREEN, volume);
  };

  /**
   * @brief 设置音质档位
   */
  setAudioProfile = (profile: AudioProfileType) => {
    this.engine.setAudioProfile(profile);
  };

  /**
   * @brief 切换设备
   */
  switchDevice = (deviceType: MediaType, deviceId: string) => {
    if (deviceType === MediaType.AUDIO) {
      this._audioCaptureDevice = deviceId;
      this.engine.setAudioCaptureDevice(deviceId);
    }
    if (deviceType === MediaType.VIDEO) {
      this._videoCaptureDevice = deviceId;
      this.engine.setVideoCaptureDevice(deviceId);
    }
    if (deviceType === MediaType.AUDIO_AND_VIDEO) {
      this._audioCaptureDevice = deviceId;
      this._videoCaptureDevice = deviceId;
      this.engine.setVideoCaptureDevice(deviceId);
      this.engine.setAudioCaptureDevice(deviceId);
    }
  };

  setLocalVideoMirrorType = (type: MirrorType) => {
    return this.engine.setLocalVideoMirrorType(type);
  };

  setLocalVideoPlayer = (
    userId: string,
    renderDom?: string | HTMLElement,
    isScreenShare = false
  ) => {
    return this.engine.setLocalVideoPlayer(
      isScreenShare ? StreamIndex.STREAM_INDEX_SCREEN : StreamIndex.STREAM_INDEX_MAIN,
      {
        renderDom,
        userId,
        renderMode: VideoRenderMode.RENDER_MODE_FILL,
      }
    );
  };

  /**
   * @brief 启用 AIGC
   */
  startAudioBot = async () => {
    const roomId = this.basicInfo.room_id;
    const userId = this.basicInfo.user_id;
    
    try {
      // 确保先停止现有的AudioBot
      if (this.audioBotEnabled || sessionStorage.getItem('audioBotEnabled')) {
        await this.stopAudioBot();
      }

      const agentConfig = aigcConfig.aigcConfig.AgentConfig;
      const options = {
        AppId: aigcConfig.BaseConfig.AppId,
        BusinessId: aigcConfig.BaseConfig.BusinessId,
        RoomId: roomId,
        TaskId: userId,
        AgentConfig: {
          ...agentConfig,
          TargetUserId: [userId],
        },
        Config: aigcConfig.aigcConfig.Config,
      };

      // 使用递归函数代替循环
      const tryStartVoiceChat = async (retriesLeft: number): Promise<void> => {
        try {
          await openAPIs.StartVoiceChat(options);
          this.audioBotEnabled = true;
          this.audioBotStartTime = Date.now();
          Utils.setSessionInfo({ audioBotEnabled: 'enable' });
        } catch (error: any) {
          if (error.message?.includes('task has been started')) {
            await this.stopAudioBot();
            if (retriesLeft > 0) {
              await new Promise<void>(resolve => {
                setTimeout(() => resolve(), 1000);
              });
              return tryStartVoiceChat(retriesLeft - 1);
            }
          }
            throw error;
        }
      };

      await tryStartVoiceChat(3);
    } catch (error: any) {
      console.error('Failed to start AudioBot:', error);
      this.audioBotEnabled = false;
      this.audioBotStartTime = 0;
      sessionStorage.removeItem('audioBotEnabled');
      throw error;
    }
  };

  /**
   * @brief 关闭 AIGC
   */
  stopAudioBot = async () => {
    const roomId = this.basicInfo.room_id;
    const userId = this.basicInfo.user_id;
    if (this.audioBotEnabled || sessionStorage.getItem('audioBotEnabled')) {
      await openAPIs.StopVoiceChat({
        AppId: aigcConfig.BaseConfig.AppId,
        BusinessId: aigcConfig.BaseConfig.BusinessId,
        RoomId: roomId,
        TaskId: userId,
      });
      this.audioBotStartTime = 0;
      sessionStorage.removeItem('audioBotEnabled');
    }
    this.audioBotEnabled = false;
  };

  /**
   * @brief 命令 AIGC
   */
  commandAudioBot = (command: COMMAND, interruptMode = INTERRUPT_PRIORITY.NONE, message = '') => {
    if (this.audioBotEnabled) {
      this.engine.sendUserBinaryMessage(
        aigcConfig.BotName,
        Utils.string2tlv(
          JSON.stringify({
            Command: command,
            InterruptMode: interruptMode,
            Message: message,
          }),
          'ctrl'
        )
      );
      return;
    }
    console.warn('Interrupt failed, bot not enabled.');
  };

  /**
   * @brief 更新 AIGC 配置
   */
  updateAudioBot = async () => {
    if (this.audioBotEnabled) {
      await this.stopAudioBot();
      await this.startAudioBot();
    } else {
      await this.startAudioBot();
    }
  };

  /**
   * @brief 获取当前 AI 是否启用
   */
  getAudioBotEnabled = () => {
    return this.audioBotEnabled;
  };
}

export default new RTCClient();
