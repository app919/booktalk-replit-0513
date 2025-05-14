/**
 * Copyright 2025 BookTalk. All Rights Reserved.
 */

import style from './index.module.less';
import DouBaoAvatar from '@/assets/img/DoubaoAvatarGIF.webp';

interface IAvatarCardProps extends React.HTMLAttributes<HTMLDivElement> {
  avatar?: string;
}

function AvatarCard(props: IAvatarCardProps) {
  const { avatar, className, ...rest } = props;

  return (
    <div className={`${style.card} ${className}`} {...rest}>
      <div className={style.corner} />
      <div className={style.avatar}>
        <img
          id="avatar-card"
          src={avatar || DouBaoAvatar}
          className={style['doubao-gif']}
          alt="Avatar"
        />
      </div>
    </div>
  );
}

export default AvatarCard;
