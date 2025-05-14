/**
 * Copyright 2025 BookTalk. All Rights Reserved.
 */

import AvatarCard from '@/components/AvatarCard';
import { useJoin } from '@/lib/useCommon';
import Utils from '@/utils/utils';
import aigcConfig from '@/config';
import InvokeButton from '@/pages/MainPage/MainArea/Antechamber/InvokeButton';
import style from './index.module.less';
import FuguiAvatar from '../../../../assets/img/2-fugui.jpeg';

function Antechamber() {
  const [joining, dispatchJoin] = useJoin();

  const handleJoinRoom = async () => {
    // 动态生成RoomId、UserId
    aigcConfig.BaseConfig.RoomId = generateRandomId('room_');
    aigcConfig.BaseConfig.UserId = generateRandomId('user_');
    // 动态获取Token
    await aigcConfig.fetchToken();
    if (!joining) {
      dispatchJoin(
        {
          username: aigcConfig.BaseConfig.UserId,
          roomId: aigcConfig.BaseConfig.RoomId,
          publishAudio: true,
        },
        false
      );
    }
  };

  return (
    <div className={style.wrapper}>
      <AvatarCard 
        avatar={FuguiAvatar} 
        className={`${style.avatar} ${Utils.isMobile() ? style.mobile : ''}`} 
      />
      <div className={style.title}>AI 福贵</div>
      <InvokeButton onClick={handleJoinRoom} loading={joining} className={style['invoke-btn']} />
    </div>
  );
}

// 生成唯一ID方法
function generateRandomId(prefix: string) {
  // 生成格式如 room_1234567890，user_1234567890，纯数字，长度不超过20
  return prefix + Math.floor(Date.now() % 1e10) + Math.floor(Math.random() * 10000);
}

export default Antechamber;