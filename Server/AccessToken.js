const crypto = require('crypto');

// 定义版本常量
const VERSION = '001';

// 权限枚举
const privileges = {
    PrivPublishStream: 0,
    PrivPublishAudioStream: 1, 
    PrivPublishVideoStream: 2,
    PrivPublishDataStream: 3,
    PrivSubscribeStream: 4
};

// BufferWriter 实现
class BufferWriter {
    constructor() {
        this.buffer = Buffer.alloc(1024);
        this.position = 0;
    }

    pack() {
        const out = Buffer.alloc(this.position);
        this.buffer.copy(out, 0, 0, out.length);
        return out;
    }

    putUint16(v) {
        this.buffer.writeUInt16LE(v, this.position);
        this.position += 2;
        return this;
    }

    putUint32(v) {
        this.buffer.writeUInt32LE(v, this.position);
        this.position += 4;
        return this;
    }

    putBytes(bytes) {
        this.putUint16(bytes.length);
        bytes.copy(this.buffer, this.position);
        this.position += bytes.length;
        return this;
    }

    putString(str) {
        return this.putBytes(Buffer.from(str));
    }

    putTreeMapUInt32(map) {
        this.putUint16(map.size);

        // 对键进行排序
        const sortedEntries = [...map.entries()].sort((a, b) => a[0] - b[0]);
        
        for (const [key, value] of sortedEntries) {
            this.putUint16(key);
            this.putUint32(value);
        }

        return this;
    }
}

// AccessToken 实现
class AccessToken {
    constructor(appID, appKey, roomID, userID) {
        this.appID = appID;
        this.appKey = appKey;
        this.roomID = roomID;
        this.userID = userID;
        this.issuedAt = Math.floor(Date.now() / 1000);
        this.nonce = Math.floor(Math.random() * 0xffffffff);
        this.expireAt = 0;
        this.privileges = new Map();
    }

    addPrivilege(privilege, expireTimestamp) {
        this.privileges.set(privilege, expireTimestamp);

        // 如果是发布流权限，同时添加音频、视频和数据流的权限
        if (privilege === privileges.PrivPublishStream) {
            this.privileges.set(privileges.PrivPublishAudioStream, expireTimestamp);
            this.privileges.set(privileges.PrivPublishVideoStream, expireTimestamp);
            this.privileges.set(privileges.PrivPublishDataStream, expireTimestamp);
        }
    }

    expireTime(expireTimestamp) {
        this.expireAt = expireTimestamp;
    }

    serialize() {
        const bytesM = this.packMsg();
        const signature = this.encodeHMac(this.appKey, bytesM);
        const content = new BufferWriter()
            .putBytes(bytesM)
            .putBytes(signature)
            .pack();

        return VERSION + this.appID + content.toString('base64');
    }

    packMsg() {
        const bufM = new BufferWriter();

        bufM.putUint32(this.nonce);
        bufM.putUint32(this.issuedAt);
        bufM.putUint32(this.expireAt);
        bufM.putString(this.roomID);
        bufM.putString(this.userID);
        bufM.putTreeMapUInt32(this.privileges);

        return bufM.pack();
    }

    encodeHMac(key, message) {
        return crypto.createHmac('sha256', key).update(message).digest();
    }
}

// 生成随机的 RoomId 和 UserId
function generateRandomId(prefix = '', length = 8) {
    const randomPart = Math.floor(Math.random() * Math.pow(10, length)).toString().padStart(length, '0');
    return `${prefix}${randomPart}`;
}

module.exports = {
    AccessToken,
    privileges,
    generateRandomId
}; 