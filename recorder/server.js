const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

let server;
const sslPath = './ssl/';
const hasSsl = fs.existsSync(sslPath + 'fullchain.pem') && fs.existsSync(sslPath + 'privkey.pem');

if (hasSsl) {
    console.log('使用生产环境模式 (HTTPS)');
    const sslOptions = {
        cert: fs.readFileSync(sslPath + "fullchain.pem"),
        key: fs.readFileSync(sslPath + "privkey.pem"),
        ca: fs.existsSync(sslPath + "chain.pem") ? fs.readFileSync(sslPath + "chain.pem") : undefined
    };
    server = https.createServer(sslOptions, app);
} else {
    console.log('未检测到SSL证书，使用 HTTP 模式');
    server = http.createServer(app);
}

const { Server } = require("socket.io");
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});


// 托管静态文件 (使得直接访问 http://localhost:3000 也能打开应用)
app.use(express.static(path.join(__dirname, '.')));

// 房间状态存储
// 结构: { roomCode: { hostId: string, state: object, viewers: Set<string>, cleanupTimer: Timer } }
const rooms = {};

const CLEANUP_DELAY = 60 * 60 * 1000; // 1小时

// 生成6位数字房间码
function generateRoomCode() {
    let code = '';
    do {
        code = Math.floor(100000 + Math.random() * 900000).toString();
    } while (rooms[code]); // 确保唯一
    return code;
}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // 创建房间 (Host)
    socket.on('create_room', () => {
        const roomCode = generateRoomCode();
        rooms[roomCode] = {
            hostId: socket.id,
            state: null,
            viewers: new Set()
        };
        socket.join(roomCode);
        // 标记该 socket 为 host，方便断开连接时处理
        socket.data.roomCode = roomCode;
        socket.data.isHost = true;

        if (rooms[roomCode].cleanupTimer) {
            clearTimeout(rooms[roomCode].cleanupTimer);
            rooms[roomCode].cleanupTimer = null;
        }

        socket.emit('room_created', roomCode);
        console.log(`Room created: ${roomCode} by ${socket.id}`);
    });

    // 房主重连
    socket.on('host_reconnect', (roomCode) => {
        const room = rooms[roomCode];
        if (room) {
            // 取消清理倒计时
            if (room.cleanupTimer) {
                clearTimeout(room.cleanupTimer);
                room.cleanupTimer = null;
                console.log(`Room ${roomCode} cleanup cancelled (Host reconnected)`);
            }

            // 检查是否有旧的连接
            const oldHostId = room.hostId;
            if (oldHostId && oldHostId !== socket.id) {
                const oldSocket = io.sockets.sockets.get(oldHostId);
                if (oldSocket) {
                    // 标记旧连接不再是房主，防止其断开时触发清理
                    oldSocket.data.isHost = false;
                    oldSocket.data.roomCode = null; // 可选：解除绑定
                    oldSocket.emit('host_replaced');
                    console.log(`Host replaced: ${oldHostId} -> ${socket.id}`);
                }
            }

            // 更新 hostId
            room.hostId = socket.id;
            socket.join(roomCode);
            socket.data.roomCode = roomCode;
            socket.data.isHost = true;

            socket.emit('host_restored', roomCode);
            console.log(`Host reconnected to ${roomCode}`);
        } else {
            socket.emit('reconnect_failed');
        }
    });

    // 房主手动关闭房间
    socket.on('close_room', () => {
        const roomCode = socket.data.roomCode;
        if (roomCode && rooms[roomCode] && rooms[roomCode].hostId === socket.id) {
            if (rooms[roomCode].cleanupTimer) clearTimeout(rooms[roomCode].cleanupTimer);

            io.to(roomCode).emit('host_left'); // 通知观众房间关闭
            delete rooms[roomCode];
            console.log(`Room ${roomCode} closed manually by host`);

            socket.leave(roomCode);
            socket.data.roomCode = null;
            socket.data.isHost = false;
        }
    });

    // 加入房间 (Viewer)
    socket.on('join_room', (roomCode) => {
        const room = rooms[roomCode];
        if (room) {
            socket.join(roomCode);
            room.viewers.add(socket.id);
            socket.data.roomCode = roomCode;
            socket.data.isHost = false;

            // 告知客户端加入成功
            socket.emit('joined_room', roomCode);
            console.log(`User ${socket.id} joined room ${roomCode}`);

            // 如果房间已有状态，立即发送给新加入者
            if (room.state) {
                socket.emit('update_state', room.state);
            }
        } else {
            socket.emit('error_msg', '房间不存在或已关闭');
        }
    });

    // 房主同步状态
    socket.on('sync_state', (state) => {
        const roomCode = socket.data.roomCode;
        // 只有房主能更新状态
        if (roomCode && rooms[roomCode] && rooms[roomCode].hostId === socket.id) {
            rooms[roomCode].state = state;
            // 广播给房间里除了自己以外的所有人 (其实广播给所有也可以，前端判断是否应用)
            // 这里选择广播给所有人，除了发送者
            socket.to(roomCode).emit('update_state', state);
        }
    });

    // 断开连接
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        const roomCode = socket.data.roomCode;
        if (roomCode && rooms[roomCode]) {
            if (socket.data.isHost) {
                // 房主离开：暂不销毁，启动倒计时
                console.log(`Host left room ${roomCode}, starting cleanup timer (${CLEANUP_DELAY}ms)`);

                rooms[roomCode].cleanupTimer = setTimeout(() => {
                    if (rooms[roomCode]) {
                        io.to(roomCode).emit('host_left');
                        delete rooms[roomCode];
                        console.log(`Room ${roomCode} closed (Cleanup timeout)`);
                    }
                }, CLEANUP_DELAY);

            } else {
                // 观众离开
                rooms[roomCode].viewers.delete(socket.id);
            }
        }
    });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    const protocol = hasSsl ? 'https' : 'http';
    console.log(`Server running on ${protocol}://localhost:${PORT}`);
});
