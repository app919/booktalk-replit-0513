/**
 * Copyright 2025 Beijing Volcano Engine Technology Co., Ltd. All Rights Reserved.
 * SPDX-license-identifier: BSD-3-Clause
 */

require('dotenv').config();
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const cors = require('koa2-cors');
const { Signer } = require('@volcengine/openapi');
const fetch = require('node-fetch');
const crypto = require('crypto');
const { AccessToken, privileges } = require('./AccessToken');

const app = new Koa();

app.use(cors({
  origin: '*'
}));

// 检查必要的环境变量
const requiredEnvVars = ['ACCESS_KEY_ID', 'SECRET_KEY', 'APP_ID', 'APP_KEY'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('错误: 缺少必要的环境变量:', missingEnvVars.join(', '));
  console.error('请确保创建了 .env 文件并包含所有必要的环境变量');
  process.exit(1);
}

/**
 * @notes 在 https://console.volcengine.com/iam/keymanage/ 获取 AK/SK
 */
const ACCOUNT_INFO = {
  /**
   * @notes 必填, 在 https://console.volcengine.com/iam/keymanage/ 获取
   */
  accessKeyId: process.env.ACCESS_KEY_ID,
  /**
   * @notes 必填, 在 https://console.volcengine.com/iam/keymanage/ 获取
   */
  secretKey: process.env.SECRET_KEY,
}

app.use(bodyParser());

const APP_ID = process.env.APP_ID;
const APP_KEY = process.env.APP_KEY;

console.log('后端环境变量 APP_ID:', APP_ID);
console.log('后端环境变量 APP_KEY:', APP_KEY ? '已设置' : '未设置');

app.use(async (ctx, next) => {
  if (ctx.url.startsWith('/api/getToken') && ctx.method.toLowerCase() === 'post') {
    console.log('\n=== Token 生成请求 ===');
    console.log('请求体:', JSON.stringify(ctx.request.body, null, 2));
    console.log('查询参数:', ctx.query);
    
    let { AppId, RoomId, UserId } = ctx.request.body;
    
    // 如果没有提供 AppId，则使用默认的
    if (!AppId) {
      AppId = APP_ID;
    }
    
    // 确保 RoomId 和 UserId 格式正确
    if (!RoomId) {
      RoomId = generateRandomId('Room', 8);
    } else if (!RoomId.startsWith('Room')) {
      RoomId = `Room${RoomId}`;
    }
    
    if (!UserId) {
      UserId = generateRandomId('User', 8);
    } else if (!UserId.startsWith('User')) {
      UserId = `User${UserId}`;
    }

    console.log('配置信息:', {
      APP_ID,
      APP_KEY: APP_KEY.substring(0, 4) + '****',
      RoomId,
      UserId,
      timestamp: new Date().toISOString()
    });

    try {
      // 创建 AccessToken 实例
      const token = new AccessToken(APP_ID, APP_KEY, RoomId, UserId);
      // 设置过期时间为24小时后
      const expireTime = Math.floor(Date.now() / 1000) + 24 * 3600; 
      
      console.log('添加权限...');
      // 添加发布流权限
      token.addPrivilege(privileges.PrivPublishStream, expireTime);
      // 添加订阅流权限
      token.addPrivilege(privileges.PrivSubscribeStream, expireTime);
      // 设置过期时间
      token.expireTime(expireTime);
      
      const generatedToken = token.serialize();
      console.log('\n生成的 Token 详细信息:');
      console.log('- Room ID:', RoomId);
      console.log('- User ID:', UserId);
      console.log('- App ID:', APP_ID);
      console.log('- 过期时间:', new Date(expireTime * 1000).toLocaleString());
      console.log('- Token:', generatedToken);
      console.log('- Token 长度:', generatedToken.length);
      console.log('- Token 前缀:', generatedToken.substring(0, 27)); // 001 + AppID
      console.log('- Privileges:', JSON.stringify(Array.from(token.privileges.entries()), null, 2));
      
      ctx.body = { 
        token: generatedToken,
        roomId: RoomId,
        userId: UserId
      };
      console.log('\n=== Token 生成成功 ===\n');
    } catch (error) {
      console.error('Token 生成错误:', error);
      ctx.status = 500;
      ctx.body = { error: 'Token generation failed', details: error.message };
    }
    return;
  }
  await next();
});

app.use(async ctx => {
  /**
   * @brief 代理 AIGC 的 OpenAPI 请求
   */
  if (ctx.url.startsWith('/proxyAIGCFetch') && ctx.method.toLowerCase() === 'post') {
    const { Action, Version } = ctx.query || {};
    const body = ctx.request.body;

    /** 
     * 参考 https://github.com/volcengine/volc-sdk-nodejs 可获取更多 火山 TOP 网关 SDK 的使用方式
     */
    const openApiRequestData = {
      region: 'cn-north-1',
      method: 'POST',
      params: {
        Action,
        Version,
        AccountID: '2106785599'
      },
      headers: {
        Host: 'rtc.volcengineapi.com',
        'Content-type': 'application/json',
        'X-Account-ID': '2106785599'
      },
      body: JSON.stringify({
        ...body,
        AccountID: '2106785599'
      }),
    };
    const signer = new Signer(openApiRequestData, "rtc");
    signer.addAuthorization(ACCOUNT_INFO);
    
    /** 参考 https://www.volcengine.com/docs/6348/69828 可获取更多 OpenAPI 的信息 */
    const result = await fetch(`https://rtc.volcengineapi.com?Action=${Action}&Version=${Version}&AccountID=2106785599`, {
      method: 'POST',
      headers: {
        ...openApiRequestData.headers,
        Authorization: openApiRequestData.headers.Authorization,
      },
      body: openApiRequestData.body,
    });
    const volcResponse = await result.json();
    ctx.body = volcResponse;
  } else {
    ctx.body = '<h1>404 Not Found</h1>';
  }
});

app.listen(3103, () => {
  console.log('AIGC Server is running at http://localhost:3103');
});

