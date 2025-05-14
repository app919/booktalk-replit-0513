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
const { AccessToken, privileges } = require('./Server/AccessToken');

const app = new Koa();

app.use(cors({
  origin: '*'
}));

// 检查必要的环境变量
const requiredEnvVars = ['VOLC_ACCESS_KEY_ID', 'VOLC_SECRET_KEY', 'VITE_VOLCENGINE_APP_ID', 'VITE_VOLCENGINE_TOKEN'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('错误: 缺少必要的环境变量:', missingEnvVars.join(', '));
  console.error('请确保在 Replit Secrets 中配置了所有必要的环境变量');
  process.exit(1);
}

const ACCOUNT_INFO = {
  accessKeyId: process.env.VOLC_ACCESS_KEY_ID,
  secretKey: process.env.VOLC_SECRET_KEY,
}

app.use(bodyParser());

const APP_ID = process.env.VITE_VOLCENGINE_APP_ID;
const APP_KEY = process.env.VITE_VOLCENGINE_TOKEN;

console.log('后端服务启动，环境变量检查：');
console.log('- VOLC_ACCESS_KEY_ID:', process.env.VOLC_ACCESS_KEY_ID ? '已设置' : '未设置');
console.log('- VOLC_SECRET_KEY:', process.env.VOLC_SECRET_KEY ? '已设置' : '未设置');
console.log('- VITE_VOLCENGINE_APP_ID:', process.env.VITE_VOLCENGINE_APP_ID ? '已设置' : '未设置');
console.log('- VITE_VOLCENGINE_TOKEN:', process.env.VITE_VOLCENGINE_TOKEN ? '已设置' : '未设置');

// ... 其余代码保持不变 ...
const generateRandomId = (prefix, length) => {
  const randomString = crypto.randomBytes(length).toString('hex').slice(0, length);
  return `${prefix}${randomString}`;
};

app.use(async (ctx, next) => {
  if (ctx.url.startsWith('/api/getToken') && ctx.method.toLowerCase() === 'post') {
    console.log('\n=== Token 生成请求 ===');
    console.log('请求体:', JSON.stringify(ctx.request.body, null, 2));
    console.log('查询参数:', ctx.query);
    
    let { AppId, RoomId, UserId } = ctx.request.body;
    
    if (!AppId) {
      AppId = APP_ID;
    }
    
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
      const token = new AccessToken(APP_ID, APP_KEY, RoomId, UserId);
      const expireTime = Math.floor(Date.now() / 1000) + 24 * 3600;
      
      console.log('添加权限...');
      token.addPrivilege(privileges.PrivPublishStream, expireTime);
      token.addPrivilege(privileges.PrivSubscribeStream, expireTime);
      token.expireTime(expireTime);
      
      const generatedToken = token.serialize();
      console.log('\n生成的 Token 详细信息:');
      console.log('- Room ID:', RoomId);
      console.log('- User ID:', UserId);
      console.log('- App ID:', APP_ID);
      console.log('- 过期时间:', new Date(expireTime * 1000).toLocaleString());
      console.log('- Token:', generatedToken);
      console.log('- Token 长度:', generatedToken.length);
      console.log('- Token 前缀:', generatedToken.substring(0, 27));
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
  if (ctx.url.startsWith('/proxyAIGCFetch') && ctx.method.toLowerCase() === 'post') {
    const { Action, Version } = ctx.query || {};
    const body = ctx.request.body;

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

const PORT = process.env.PORT || 3103;
app.listen(PORT, () => {
  console.log(`AIGC Server is running at http://localhost:${PORT}`);
}); 