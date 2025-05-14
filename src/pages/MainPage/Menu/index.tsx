/**
 * Copyright 2025 BookTalk. All Rights Reserved.
 */

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Typography, Tooltip } from '@arco-design/web-react';
import { RootState } from '@/store';
import { setHistoryMsg, setInterruptMsg } from '@/store/slices/room';
import RTCClient from '@/lib/RtcClient';
import { useVisionMode } from '@/lib/useCommon';
import { COMMAND, INTERRUPT_PRIORITY } from '@/utils/handler';
import CameraArea from '../MainArea/Room/CameraArea';
import utils from '@/utils/utils';
import { Questions } from '@/config';
import styles from './index.module.less';

function Menu() {
  const dispatch = useDispatch();
  const [question, setQuestion] = useState('');
  const room = useSelector((state: RootState) => state.room);
  const scene = room.scene;
  const isJoined = room?.isJoined;
  const isVisionMode = useVisionMode();

  const handleQuestion = (que: string) => {
    RTCClient.commandAudioBot(COMMAND.EXTERNAL_TEXT_TO_LLM, INTERRUPT_PRIORITY.HIGH, que);
    setQuestion(que);
  };

  useEffect(() => {
    if (question && !room.isAITalking) {
      dispatch(setInterruptMsg());
      dispatch(
        setHistoryMsg({
          text: question,
          user: RTCClient.basicInfo.user_id,
          paragraph: true,
          definite: true,
        })
      );
      setQuestion('');
    }
  }, [question, room.isAITalking, dispatch]);

  return (
    <div className={styles.wrapper}>
      {isJoined && utils.isMobile() && isVisionMode ? (
        <div className={styles['mobile-camera-wrapper']}>
          <CameraArea className={styles['mobile-camera']} />
        </div>
      ) : null}
      <div className={`${styles.box} ${styles.info}`}>
        {isJoined ? (
          <div className={styles.gray}>
            房间ID{' '}
            <Tooltip content={room.roomId || '-'}>
              <Typography.Paragraph
                ellipsis={{
                  rows: 1,
                  expandable: false,
                }}
                className={styles.value}
              >
                {room.roomId || '-'}
              </Typography.Paragraph>
            </Tooltip>
          </div>
        ) : (
          ''
        )}
      </div>
      {isJoined ? (
        <div className={`${styles.box} ${styles.questions}`}>
          <div className={styles.title}>点击下述问题进行提问:</div>
          {Questions[scene].map((question) => (
            <div onClick={() => handleQuestion(question)} className={styles.line} key={question}>
              {question}
            </div>
          ))}
        </div>
      ) : (
        ''
      )}
    </div>
  );
}

export default Menu;
