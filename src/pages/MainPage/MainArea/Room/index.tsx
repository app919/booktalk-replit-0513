/**
 * Copyright 2025 BookTalk. All Rights Reserved.
 */

import AvatarCard from '@/components/AvatarCard';
import Conversation from './Conversation';
import ToolBar from './ToolBar';
import CameraArea from './CameraArea';
import AudioController from './AudioController';
import utils from '@/utils/utils';
import style from './index.module.less';
import FuguiAvatar from '../../../../assets/img/2-fugui.jpeg';

function Room() {
  return (
    <div className={`${style.wrapper} ${utils.isMobile() ? style.mobile : ''}`}>
      <AvatarCard avatar={FuguiAvatar} className={style.avatar} />
      {utils.isMobile() ? null : <CameraArea />}
      <Conversation className={style.conversation} />
      <ToolBar className={style.toolBar} />
      <AudioController className={style.controller} />
      <div className={style.declare}>AI生成内容由大模型生成，不能完全保障真实</div>
    </div>
  );
}

export default Room;
