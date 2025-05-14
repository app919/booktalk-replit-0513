/**
 * Copyright 2025 BookTalk. All Rights Reserved.
 */

import { Button, Divider } from '@arco-design/web-react';
import { IconSettings } from '@arco-design/web-react/icon';
import { useState } from 'react';
import NetworkIndicator from '@/components/NetworkIndicator';
import AISettings from '@/components/AISettings';
import Logo from '@/assets/img/Logo.svg';
import styles from './index.module.less';

interface HeaderProps {
  hide?: boolean;
}

function Header(props: HeaderProps) {
  const { hide } = props;
  const [open, setOpen] = useState(false);

  const handleOpenDrawer = () => setOpen(true);
  const handleCloseDrawer = () => setOpen(false);

  return (
    <div
      className={styles.header}
      style={{
        display: hide ? 'none' : 'flex',
      }}
    >
      <div className={styles['header-logo']}>
        <img src={Logo} alt="Logo" />
        <Divider type="vertical" />
        <span className={styles['header-logo-text']}>实时对话式 AI 体验馆</span>
      </div>
      <div className={styles['header-right']}>
        <NetworkIndicator />
        <Button
          className={styles['settings-button']}
          icon={<IconSettings />}
          onClick={handleOpenDrawer}
          type="text"
          size="small"
        />
      </div>
      <AISettings open={open} onOk={handleCloseDrawer} onCancel={handleCloseDrawer} />
    </div>
  );
}

export default Header;
