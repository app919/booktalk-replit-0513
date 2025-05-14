/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

import { ConfigFactory } from './config';

export * from './common';

// 在 Replit 环境中使用动态获取的域名和端口
const REPLIT_URL = typeof window !== 'undefined' ? window.location.origin : '';
export const AIGC_PROXY_HOST = `${REPLIT_URL}/proxyAIGCFetch`;

export const Config = ConfigFactory;
export default new ConfigFactory();
