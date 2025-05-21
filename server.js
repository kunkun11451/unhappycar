const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const wss = new WebSocket.Server({ port: 8080 });
const rooms = {}; // 存储房间信息

wss.on('connection', (ws) => {
    console.log('客户端已连接');

    ws.on('message', (message) => {
        console.log('收到消息:', message);
        const data = JSON.parse(message);

        switch (data.type) {
            case 'createRoom':
                console.log('创建房间请求');
                const roomId = uuidv4().slice(0, 6); // 生成6位房间ID
                rooms[roomId] = { host: ws, players: [], state: {} };
                ws.send(JSON.stringify({ type: 'roomCreated', roomId }));
                break;

            case 'joinRoom':
                console.log(`加入房间请求，房间ID: ${data.roomId}`);
                const room = rooms[data.roomId];
                if (room) {
                    if (room.players.length >= 6) { // 主持人 + 5 玩家 = 6 人
                        ws.send(JSON.stringify({ type: 'error', message: '房间已满，无法加入' }));
                        return;
                    }
                    room.players.push(ws);
                    ws.send(JSON.stringify({ type: 'roomJoined', roomId: data.roomId }));

                    // 广播当前房间人数
                    const currentPlayerCount = room.players.length + 1; // 包括主持人
                    const playerCountMessage = { type: 'playerCount', count: currentPlayerCount };
                    room.host.send(JSON.stringify(playerCountMessage));
                    room.players.forEach((player) => {
                        player.send(JSON.stringify(playerCountMessage));
                    });
                } else {
                    ws.send(JSON.stringify({ type: 'error', message: '房间不存在' }));
                }
                break;

            case 'updateState':
                console.log(`更新状态请求，房间ID: ${data.roomId}`);
                const updateRoom = rooms[data.roomId];
                if (updateRoom && updateRoom.host === ws) {
                    updateRoom.state = data.state;

                    // 广播最新状态，包括历史记录
                    console.log(`广播最新状态，房间ID: ${data.roomId}`);
                    updateRoom.players.forEach((player) => {
                        player.send(JSON.stringify({ type: 'stateUpdated', state: data.state, history: data.history }));
                    });
                } else {
                    console.log('更新状态失败：房间不存在或请求者不是主持人');
                }
                break;

            default:
                console.log('未知消息类型:', data.type);
        }
    });

    ws.on('close', () => {
        console.log('客户端断开连接');
        // 清理断开连接的房间或玩家
        for (const roomId in rooms) {
            const room = rooms[roomId];
            if (room.host === ws) {
                // 如果主持人断开连接，通知所有玩家并删除房间
                room.players.forEach((player) => {
                    player.send(JSON.stringify({ type: 'roomClosed' }));
                });
                delete rooms[roomId];
            } else {
                // 如果是玩家断开连接，从房间中移除
                room.players = room.players.filter((player) => player !== ws);

                // 广播更新后的房间人数
                const currentPlayerCount = room.players.length + 1; // 包括主持人
                const playerCountMessage = { type: 'playerCount', count: currentPlayerCount };
                room.host.send(JSON.stringify(playerCountMessage));
                room.players.forEach((player) => {
                    player.send(JSON.stringify(playerCountMessage));
                });
            }
        }
    });
});

console.log('WebSocket server is running on ws://localhost:8080');