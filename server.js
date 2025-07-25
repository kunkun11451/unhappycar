const fs = require("fs");
const https = require("https");
const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");
const vm = require('vm');

const APPROVED_DIR = './approved_events';
if (!fs.existsSync(APPROVED_DIR)) {
  fs.mkdirSync(APPROVED_DIR);
}

const PORT = process.env.PORT || 3000

// 带时间戳的日志函数（北京时间）
function logWithTimestamp(message, ...args) {
  const now = new Date();
  const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000); // 北京时间 UTC+8
  const timestamp = beijingTime.toISOString().replace('T', ' ').replace('Z', '').substring(0, 19);
  console.log(`[${timestamp}]`, message, ...args);
}

// 检查是否为本地测试环境
const isLocalTest = process.env.NODE_ENV === 'development' || !fs.existsSync('/etc/letsencrypt/live/unhappycar.tech/fullchain.pem');

let server, wss;

if (isLocalTest) {
  // 本地测试用 HTTP 服务器
  logWithTimestamp('使用本地测试模式 (HTTP)');
  const http = require("http");
  server = http.createServer();
  wss = new WebSocket.Server({ server });
} else {
  // 生产环境用 HTTPS 服务器
  logWithTimestamp('使用生产环境模式 (HTTPS)');

const sslOptions = {
  cert: fs.readFileSync("/etc/letsencrypt/live/unhappycar.tech/fullchain.pem"),
  key: fs.readFileSync("/etc/letsencrypt/live/unhappycar.tech/privkey.pem"),
  ca: fs.readFileSync("/etc/letsencrypt/live/unhappycar.tech/chain.pem"),
};
  server = https.createServer(sslOptions);
  wss = new WebSocket.Server({ server });
}

const rooms = {}; // 存储房间信息

// 投票系统状态管理
class VotingManager {
  constructor(roomId) {
    this.roomId = roomId;
    this.isActive = false;
    this.missions = []; // 当前投票的困难事件列表
    this.votes = {}; // {playerId: missionIndex}
    this.voteResults = {}; // {missionIndex: voteCount}
    this.playerRoles = {}; // {playerId: 'host' | 'player'}
    this.expectedPlayers = 0;
    this.result = null; // 投票结果
    this.isNewRound = false; // 标识是否是新轮投票开始
  }
  // 开始新的投票
  startVoting(missions, expectedPlayers) {
    logWithTimestamp(`房间 ${this.roomId} 开始新投票:`, missions);
    this.isActive = true;
    this.missions = missions;
    this.votes = {};
    this.voteResults = { 0: 0, 1: 0, 2: 0 };
    this.expectedPlayers = expectedPlayers;
    this.result = null;
    this.isNewRound = true; // 标记为新轮开始
    return this.getVotingState();
  }
  // 设置玩家角色
  setPlayerRole(playerId, role) {
    this.playerRoles[playerId] = role;
    logWithTimestamp(`设置玩家 ${playerId} 角色为: ${role}`);
  }
  // 玩家投票
  vote(playerId, missionIndex) {
    if (!this.isActive) {
      throw new Error('当前不在投票阶段');
    }

    if (missionIndex < 0 || missionIndex >= this.missions.length) {
      throw new Error('无效的投票选项');
    }    logWithTimestamp(`玩家 ${playerId} 投票选择事件 ${missionIndex}`);

    // 取消之前的投票
    if (this.votes[playerId] !== undefined) {
      const prevIndex = this.votes[playerId];
      const prevWeight = this.getVoteWeight(playerId);
      this.voteResults[prevIndex] -= prevWeight;
      logWithTimestamp(`取消玩家 ${playerId} 之前的投票: 事件${prevIndex}, 权重${prevWeight}`);
    }

    // 添加新投票
    this.votes[playerId] = missionIndex;
    const voteWeight = this.getVoteWeight(playerId);
    this.voteResults[missionIndex] += voteWeight;

    logWithTimestamp(`玩家 ${playerId} 新投票: 事件${missionIndex}, 权重${voteWeight}, 总票数${this.voteResults[missionIndex]}`);

    // 在投票过程中，已经不是新轮开始了
    this.isNewRound = false;

    // 检查是否投票完成
    const completedVotes = Object.keys(this.votes).length;
    logWithTimestamp(`当前投票进度: ${completedVotes}/${this.expectedPlayers}`);

    if (completedVotes >= this.expectedPlayers) {
      this.finishVoting();
    }

    return this.getVotingState();
  }

  // 获取投票权重（主持人2票，普通玩家1票）
  getVoteWeight(playerId) {
    return this.playerRoles[playerId] === 'host' ? 2 : 1;
  }
  // 完成投票
  finishVoting() {
    logWithTimestamp(`房间 ${this.roomId} 投票完成，结果:`, this.voteResults);
    
    this.isActive = false;
    
    // 计算获胜事件
    const validVotes = Object.values(this.voteResults).filter(v => v > 0);
    if (validVotes.length === 0) {
      console.error('没有有效投票');
      return;
    }

    const maxVotes = Math.max(...validVotes);
    const winners = Object.keys(this.voteResults)
      .filter(index => this.voteResults[index] === maxVotes)
      .map(index => parseInt(index));

    let selectedIndex;
    if (winners.length === 1) {
      selectedIndex = winners[0];
    } else {
      // 平票时随机选择
      selectedIndex = winners[Math.floor(Math.random() * winners.length)];
      logWithTimestamp(`平票情况，随机选择: ${selectedIndex}`);
    }

    this.result = {
      selectedIndex,
      maxVotes,
      wasTie: winners.length > 1,
      selectedMission: this.missions[selectedIndex]
    };

    logWithTimestamp(`投票结果:`, this.result);
  }
  // 强制结算投票（主持人手动结算）
  forceFinishVoting() {
    if (!this.isActive) {
      throw new Error('当前没有进行中的投票');
    }
      logWithTimestamp(`房间 ${this.roomId} 强制结算投票，当前投票结果:`, this.voteResults);
    
    // 检查是否有任何投票
    const validVotes = Object.values(this.voteResults).filter(v => v > 0);
    if (validVotes.length === 0) {
      throw new Error('还没有任何投票，无法结算');
    }
    
    // 直接调用finishVoting进行结算
    this.finishVoting();
    
    logWithTimestamp(`房间 ${this.roomId} 强制结算完成，结果:`, this.result);
    return this.getVotingState();  }

  // 移除玩家投票（当玩家离开房间时调用）
  removePlayerVote(playerId) {
    if (this.votes[playerId] !== undefined) {
      const missionIndex = this.votes[playerId];
      const voteWeight = this.getVoteWeight(playerId);
      
      // 从投票结果中减去该玩家的票数
      this.voteResults[missionIndex] -= voteWeight;
      
      // 从投票记录中移除该玩家
      delete this.votes[playerId];
      
      // 从角色记录中移除该玩家
      delete this.playerRoles[playerId];
        logWithTimestamp(`移除玩家 ${playerId} 的投票: 事件${missionIndex}, 权重${voteWeight}`);
      logWithTimestamp(`当前投票状态:`, { votes: this.votes, voteResults: this.voteResults });
    }
  }
  // 更新期望玩家数量（当玩家加入或离开时调用）
  updateExpectedPlayers(newCount, room = null) {    if (this.isActive) {
      const oldCount = this.expectedPlayers;
      this.expectedPlayers = newCount;
      logWithTimestamp(`房间 ${this.roomId} 投票期间玩家数量变化: ${oldCount} -> ${newCount}`);
      
      // 检查是否已经达到新的投票完成条件
      const completedVotes = Object.keys(this.votes).length;
      logWithTimestamp(`当前投票进度: ${completedVotes}/${this.expectedPlayers}`);
      
      // 广播投票状态更新（无论是否完成）
      if (room) {
        const syncMessage = {
          type: "votingStateSync",
          votingState: this.getVotingState()
        };
        
        // 发送给主持人
        try {
          room.host.send(JSON.stringify(syncMessage));
        } catch (error) {
          console.error('发送投票状态给主持人失败:', error);
        }
        
        // 发送给所有玩家
        room.players.forEach((player) => {
          try {
            player.ws.send(JSON.stringify(syncMessage));
          } catch (error) {
            console.error(`发送投票状态给玩家 ${player.playerId} 失败:`, error);
          }
        });
          logWithTimestamp('投票状态已广播');
      }
      
      if (completedVotes >= this.expectedPlayers && completedVotes > 0) {
        logWithTimestamp('玩家数量变化导致投票自动完成');
        this.finishVoting();
        
        // 再次广播投票完成状态
        if (room) {
          const finalSyncMessage = {
            type: "votingStateSync",
            votingState: this.getVotingState()
          };
          
          // 发送给主持人
          try {
            room.host.send(JSON.stringify(finalSyncMessage));
          } catch (error) {
            console.error('发送投票完成状态给主持人失败:', error);
          }
          
          // 发送给所有玩家
          room.players.forEach((player) => {
            try {
              player.ws.send(JSON.stringify(finalSyncMessage));
            } catch (error) {
              console.error(`发送投票完成状态给玩家 ${player.playerId} 失败:`, error);
            }
          });
            logWithTimestamp('投票完成状态已广播');
        }
      }
    }
  }

  // 获取当前投票状态
  getVotingState() {
    return {
      isActive: this.isActive,
      missions: this.missions,
      votes: this.votes,
      voteResults: this.voteResults,
      playerRoles: this.playerRoles,
      expectedPlayers: this.expectedPlayers,
      result: this.result,
      isNewRound: this.isNewRound // 添加新轮标识
    };
  }
  // 重置投票状态
  reset() {
    this.isActive = false;
    this.missions = [];
    this.votes = {};
    this.voteResults = {};    this.result = null;
    this.isNewRound = false;
    logWithTimestamp(`房间 ${this.roomId} 投票状态已重置`);
  }
}

wss.on("connection", (ws) => {
  logWithTimestamp("客户端已连接");

  ws.on("message", (message) => {
    logWithTimestamp("收到消息:", message.toString());
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case "upload_event_library":
          try {
            const userLibrary = data.library;
            if (!userLibrary || !userLibrary.uploaderName || !userLibrary.uploaderPin) {
              throw new Error("无效的事件库格式，缺少必要信息。");
            }

            const uploaderName = userLibrary.uploaderName;
            const uploaderPin = userLibrary.uploaderPin;
            const fileName = `${uploaderName}.json`;
            const filePath = require('path').join(APPROVED_DIR, fileName);

            // Filter out default events
            const extractObject = (content, varName) => {
              try {
                const sandbox = {};
                vm.createContext(sandbox);
                const scriptContent = content.replace(new RegExp(`^\\s*const\\s+${varName}\\s*=`), `sandbox.${varName} =`).replace(new RegExp(`window\\.${varName}\\s*=\\s*${varName};?`), '');
                vm.runInContext(scriptContent, sandbox);
                return sandbox[varName] || {};
              } catch (e) {
                try { return JSON.parse(content); } catch (jsonError) { console.error(`解析 ${varName} 失败:`, e, jsonError); return {}; }
              }
            };
            let defaultMissions = {};
            let defaultHardMissions = {};
            if (fs.existsSync('./js/mission.js')) defaultMissions = extractObject(fs.readFileSync('./js/mission.js', 'utf-8'), 'mission');
            if (fs.existsSync('./js/hardmission.js')) defaultHardMissions = extractObject(fs.readFileSync('./js/hardmission.js', 'utf-8'), 'hardmission');

            const filterDefaultEvents = (events, defaultEvents) => {
                const filtered = {};
                for (const key in events) {
                    if (!defaultEvents[key] || JSON.stringify(events[key]) !== JSON.stringify(defaultEvents[key])) {
                        filtered[key] = events[key];
                    }
                }
                return filtered;
            };
            
            const finalLibrary = {
                uploaderName: uploaderName,
                uploaderPin: uploaderPin,
                uploaderAvatar: userLibrary.uploaderAvatar,
                personalEvents: filterDefaultEvents(userLibrary.personalEvents, defaultMissions),
                teamEvents: filterDefaultEvents(userLibrary.teamEvents, defaultHardMissions)
            };

            if (fs.existsSync(filePath)) {
              // Existing user, check PIN
              const existingData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
              if (existingData.uploaderPin === uploaderPin) {
                // PIN matches, merge and update library, ensuring no content duplicates within the user's library
                
                // Helper to create a signature for an event object (ignoring keys like uploaderName etc.)
                const createEventSignature = (event) => {
                    const coreEvent = {
                        内容: event.内容,
                        placeholders: event.placeholders
                    };
                    return JSON.stringify(coreEvent);
                };

                const mergeEvents = (existingEvents, newEvents) => {
                    const signatures = new Set(Object.values(existingEvents).map(createEventSignature));
                    for (const title in newEvents) {
                        const newEvent = newEvents[title];
                        const signature = createEventSignature(newEvent);
                        if (!signatures.has(signature)) {
                            // Add if signature is new. We use the original title.
                            // If title exists, it will be overwritten, which is fine for updates.
                            existingEvents[title] = newEvent;
                            signatures.add(signature);
                        }
                    }
                };
                
                if (!existingData.personalEvents) existingData.personalEvents = {};
                if (!existingData.teamEvents) existingData.teamEvents = {};

                mergeEvents(existingData.personalEvents, finalLibrary.personalEvents);
                mergeEvents(existingData.teamEvents, finalLibrary.teamEvents);

                existingData.lastUpdated = new Date().toISOString();
                existingData.uploaderAvatar = finalLibrary.uploaderAvatar; // Also update avatar

                fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
                logWithTimestamp(`更新了用户 ${uploaderName} 的事件库 (增量)`);
                ws.send(JSON.stringify({ type: "upload_success", message: "事件库更新成功！" }));
              } else {
                // PIN mismatch
                logWithTimestamp(`用户 ${uploaderName} 的识别码不匹配`);
                ws.send(JSON.stringify({ type: "pin_mismatch" }));
              }
            } else {
              // New user
              if (Object.keys(finalLibrary.personalEvents).length === 0 && Object.keys(finalLibrary.teamEvents).length === 0) {
                ws.send(JSON.stringify({ type: "upload_success", message: "您分享的事件均已存在于默认库中，无需重复上传。" }));
                return;
              }
              const timestamp = new Date().toISOString();
              finalLibrary.firstUploaded = timestamp;
              finalLibrary.lastUpdated = timestamp;
              fs.writeFileSync(filePath, JSON.stringify(finalLibrary, null, 2));
              logWithTimestamp(`为新用户 ${uploaderName} 创建了事件库`);
              ws.send(JSON.stringify({ type: "upload_success", message: "新的分享已成功创建！" }));
            }
          } catch (e) {
            logWithTimestamp("处理上传的事件库失败:", e);
            ws.send(JSON.stringify({ type: "error", message: `上传失败: ${e.message}` }));
          }
          break;

        case "get_shared_libraries":
          try {
            const allLibraries = fs.readdirSync(APPROVED_DIR)
              .filter(file => file.endsWith('.json'))
              .map(file => {
                try {
                  const content = fs.readFileSync(require('path').join(APPROVED_DIR, file), 'utf-8');
                  return JSON.parse(content);
                } catch (e) {
                  logWithTimestamp(`加载或解析文件 ${file} 失败:`, e);
                  return null;
                }
              })
              .filter(lib => lib !== null)
              .sort((a, b) => new Date(a.firstUploaded || 0) - new Date(b.firstUploaded || 0));

            const combinedLibraries = {
              personalEvents: {},
              teamEvents: {}
            };

            allLibraries.forEach(library => {
              const processEvents = (events, targetLibrary) => {
                  for (const title in events) {
                      if (Object.hasOwnProperty.call(events, title)) {
                          const eventWithUploader = {
                              ...events[title],
                              uploaderName: library.uploaderName,
                              uploaderAvatar: library.uploaderAvatar,
                              originalTitle: title // Keep track of the original title
                          };
                          
                          // Create a unique key to prevent overwrites from different users for the same event title
                          let uniqueKey = title;
                          let counter = 1;
                          while (targetLibrary[uniqueKey]) {
                              uniqueKey = `${title} (${counter++})`;
                          }
                          targetLibrary[uniqueKey] = eventWithUploader;
                      }
                  }
              };

              if (library.personalEvents) {
                  processEvents(library.personalEvents, combinedLibraries.personalEvents);
              }
              if (library.teamEvents) {
                  processEvents(library.teamEvents, combinedLibraries.teamEvents);
              }
            });

            ws.send(JSON.stringify({ type: "shared_libraries_data", libraries: combinedLibraries }));
            logWithTimestamp(`向客户端发送了 ${allLibraries.length} 个共享事件库的合并结果`);
          } catch (e) {
            logWithTimestamp("获取共享事件库失败:", e);
            ws.send(JSON.stringify({ type: "error", message: "获取共享事件库失败" }));
          }
          break;

        case "authenticate_sharer":
          try {
            const { uploaderName, uploaderPin } = data;
            const fileName = `${uploaderName}.json`;
            const filePath = require('path').join(APPROVED_DIR, fileName);

            if (fs.existsSync(filePath)) {
              const library = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
              if (library.uploaderPin === uploaderPin) {
                logWithTimestamp(`用户 ${uploaderName} 验证成功`);
                ws.send(JSON.stringify({ type: "authentication_success", library: library }));
              } else {
                logWithTimestamp(`用户 ${uploaderName} 验证失败: 识别码错误`);
                ws.send(JSON.stringify({ type: "authentication_failure" }));
              }
            } else {
              logWithTimestamp(`用户 ${uploaderName} 验证失败: 用户不存在`);
              ws.send(JSON.stringify({ type: "authentication_failure" }));
            }
          } catch (e) {
            logWithTimestamp("验证分享者失败:", e);
            ws.send(JSON.stringify({ type: "error", message: "验证失败" }));
          }
          break;

        case "delete_shared_event":
          try {
            const { uploaderName, uploaderPin, eventTitle, eventType } = data;
            const fileName = `${uploaderName}.json`;
            const filePath = require('path').join(APPROVED_DIR, fileName);

            if (fs.existsSync(filePath)) {
              const library = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
              if (library.uploaderPin === uploaderPin) {
                const targetLibrary = eventType === 'personal' ? library.personalEvents : library.teamEvents;
                if (targetLibrary && targetLibrary[eventTitle]) {
                  delete targetLibrary[eventTitle];
                  fs.writeFileSync(filePath, JSON.stringify(library, null, 2));
                  logWithTimestamp(`用户 ${uploaderName} 删除了事件: ${eventTitle}`);
                  ws.send(JSON.stringify({ type: "event_deleted_success" }));
                }
              } else {
                 ws.send(JSON.stringify({ type: "authentication_failure" }));
              }
            } else {
               ws.send(JSON.stringify({ type: "authentication_failure" }));
            }
          } catch (e) {
            logWithTimestamp("删除共享事件失败:", e);
            ws.send(JSON.stringify({ type: "error", message: "删除事件失败" }));
          }
          break;

        case "createRoom":
          let roomId;
          
          // 检查是否有自定义房间码
          if (data.customRoomId && typeof data.customRoomId === 'string') {
            const customId = data.customRoomId.trim();
            if (customId.length > 0 && customId.length <= 20) { // 限制长度在1-20个字符
              // 检查房间码是否已存在
              if (rooms[customId]) {
                ws.send(JSON.stringify({
                  type: "error",
                  message: "房间码已存在，请选择其他房间码"
                }));
                break;
              }
              roomId = customId;
              logWithTimestamp(`使用自定义房间码: ${roomId}`);
            } else {
              ws.send(JSON.stringify({
                type: "error",
                message: "房间码长度应为1-20个字符"
              }));
              break;
            }
          } else {
            // 生成随机房间码
            do {
              roomId = uuidv4().substring(0, 6).toUpperCase();
            } while (rooms[roomId]); // 确保房间码不重复
            logWithTimestamp(`生成随机房间码: ${roomId}`);
          }
          
          rooms[roomId] = {
            host: ws,
            players: [],
            state: {},
            history: [],
            votingManager: new VotingManager(roomId)
          };
          
          // 设置主持人角色
          if (data.hostId) {
            rooms[roomId].votingManager.setPlayerRole(data.hostId, 'host');
          }
          
          ws.send(JSON.stringify({
            type: "roomCreated",
            roomId: roomId
          }));          
          logWithTimestamp(`房间创建成功: ${roomId}`);
          break;

        case "joinRoom":
          const room = rooms[data.roomId];
          if (room && room.players.length < 6) {
            // 生成唯一的玩家ID
            const playerId = data.playerId || 'player_' + Math.random().toString(36).substr(2, 9);
            room.players.push({ ws, playerId });
            
            // 设置普通玩家角色
            room.votingManager.setPlayerRole(playerId, 'player');
            
            ws.send(JSON.stringify({
              type: "roomJoined",
              roomId: data.roomId,
              playerId: playerId
            }));
              // 如果房间有游戏状态，立即发送给新加入的玩家
            if (room.state && Object.keys(room.state).length > 0) {
              logWithTimestamp('发送当前游戏状态给新加入的玩家');
              ws.send(JSON.stringify({
                type: "stateUpdated", 
                state: room.state,
                history: room.history || []
              }));
            }
            
            // 如果有进行中的投票，发送当前状态
            const votingState = room.votingManager.getVotingState();
            if (votingState.isActive || votingState.result) {
              ws.send(JSON.stringify({
                type: "votingStateSync",
                votingState: votingState
              }));
            }            // 广播当前房间人数
            const currentPlayerCount = room.players.length + 1; // 包括主持人
            const playerCountMessage = {
              type: "playerCount",
              count: currentPlayerCount,
            };
            room.host.send(JSON.stringify(playerCountMessage));
            room.players.forEach((player) => {
              player.ws.send(JSON.stringify(playerCountMessage));            });
              // 更新投票系统的期望玩家数量
            room.votingManager.updateExpectedPlayers(currentPlayerCount, room);
            
            logWithTimestamp(`玩家 ${playerId} 加入房间 ${data.roomId}`);
          } else {
            ws.send(JSON.stringify({
              type: "error",
              message: room ? "房间已满，无法加入" : "房间不存在"
            }));
          }
          break;        case "startVoting":
          logWithTimestamp(`开始投票请求，房间ID: ${data.roomId}`);
          const votingRoom = rooms[data.roomId];
          if (votingRoom && votingRoom.host === ws) {
            try {
              // 计算期望玩家数（主持人 + 玩家）
              const expectedPlayers = 1 + votingRoom.players.length;
              
              // 设置主持人角色
              if (data.hostId) {
                votingRoom.votingManager.setPlayerRole(data.hostId, 'host');
              }
              
              // 开始投票
              const votingState = votingRoom.votingManager.startVoting(
                data.missions, 
                expectedPlayers
              );
              
              // 广播投票开始状态给所有玩家
              const startMessage = {
                type: "votingStateSync",
                votingState: votingState
              };
              
              // 发送给主持人
              try {
                votingRoom.host.send(JSON.stringify(startMessage));
              } catch (error) {
                console.error('发送投票状态给主持人失败:', error);
              }
              
              // 发送给所有玩家
              votingRoom.players.forEach((player) => {
                try {
                  player.ws.send(JSON.stringify(startMessage));
                } catch (error) {
                  console.error(`发送投票状态给玩家 ${player.playerId} 失败:`, error);
                }              });
              
              logWithTimestamp('投票状态已广播给所有玩家');
              
            } catch (error) {
              console.error('开始投票失败:', error);
              ws.send(JSON.stringify({
                type: "error", 
                message: error.message
              }));
            }
          } else {
            ws.send(JSON.stringify({
              type: "error",
              message: "房间不存在或您不是主持人"
            }));
          }
          break;        case "submitVote":
          logWithTimestamp(`收到投票，房间ID: ${data.roomId}, 玩家: ${data.playerId}, 选择: ${data.missionIndex}`);
          const voteRoom = rooms[data.roomId];
          if (voteRoom) {
            try {
              // 处理投票
              const votingState = voteRoom.votingManager.vote(data.playerId, data.missionIndex);
              
              // 实时广播投票状态给所有玩家
              const syncMessage = {
                type: "votingStateSync",
                votingState: votingState
              };
              
              // 发送给主持人
              try {
                voteRoom.host.send(JSON.stringify(syncMessage));
              } catch (error) {
                console.error('同步投票状态给主持人失败:', error);
              }
              
              // 发送给所有玩家
              voteRoom.players.forEach((player) => {
                try {
                  player.ws.send(JSON.stringify(syncMessage));
                } catch (error) {
                  console.error(`同步投票状态给玩家 ${player.playerId} 失败:`, error);
                }              });
              
              logWithTimestamp('投票状态已实时同步给所有玩家');
              
            } catch (error) {
              console.error('处理投票失败:', error);
              ws.send(JSON.stringify({
                type: "error",
                message: error.message
              }));
            }
          } else {
            ws.send(JSON.stringify({
              type: "error",
              message: "房间不存在"
            }));
          }
          break;

        case "redstone_tech_submission":
          // 处理赤石科技投稿
          logWithTimestamp("=== 赤石科技投稿 ===");
          logWithTimestamp(`投稿人: ${data.data.nickname}`);
          logWithTimestamp(`投稿时间: ${data.data.timestamp}`);
          logWithTimestamp(`投稿内容: ${data.data.thought}`);
          logWithTimestamp(`用户代理: ${data.data.userAgent}`);
          logWithTimestamp(`页面URL: ${data.data.url}`);
          logWithTimestamp("==================");
          
          // 回复确认消息给客户端
          ws.send(JSON.stringify({
            type: "submission_received",
            success: true,
            message: "投稿已收到并记录到服务器日志",
            timestamp: new Date().toISOString()
          }));
          break;

        case "updateState":
          logWithTimestamp(`更新状态请求，房间ID: ${data.roomId}`);
          const updateRoom = rooms[data.roomId];
          if (updateRoom && updateRoom.host === ws) {
            updateRoom.state = data.state;
            updateRoom.history = data.history || [];
            updateRoom.characterHistory = data.characterHistory || []; // 保存角色历史
            // 广播最新状态，包括历史记录
            logWithTimestamp(`广播最新状态，房间ID: ${data.roomId}`);
            updateRoom.players.forEach((player) => {
              player.ws.send(
                JSON.stringify({
                  type: "stateUpdated",
                  state: data.state,
                  history: data.history,
                  characterHistory: data.characterHistory,
                })
              );            });
          } else {
            logWithTimestamp("更新状态失败：房间不存在或请求者不是主持人");
          }
          break;        case "syncVote":
          logWithTimestamp(`同步投票状态，房间ID: ${data.roomId}`);
          const syncVoteRoom = rooms[data.roomId];
          if (syncVoteRoom) {
            // 保存投票状态到房间
            if (!syncVoteRoom.votingState) {
              syncVoteRoom.votingState = {};
            }
            syncVoteRoom.votingState = data.voteData;

            // 广播投票状态给房间内所有玩家（包括主持人和发送者）
            const voteMessage = {
              type: "syncVote",
              voteData: data.voteData,
              senderId: data.senderId            };

            logWithTimestamp('广播投票状态:', voteMessage);

            // 给主持人发送投票状态
            try {
              syncVoteRoom.host.send(JSON.stringify(voteMessage));
            } catch (error) {
              console.error('发送投票状态给主持人失败:', error);
            }

            // 给所有玩家发送投票状态
            syncVoteRoom.players.forEach((player) => {
              try {
                player.ws.send(JSON.stringify(voteMessage));
              } catch (error) {
                console.error('发送投票状态给玩家失败:', error);
              }            });
          } else {
            logWithTimestamp('投票状态同步失败：房间不存在');
          }
          break;        case "syncVotingResult":
          logWithTimestamp(`同步投票结果，房间ID: ${data.roomId}`);
          const resultRoom = rooms[data.roomId];
          if (resultRoom) {
            // 清理投票状态，为下一轮投票做准备
            resultRoom.votingState = null;

            // 广播投票结果给房间内所有玩家（包括主持人）
            const resultMessage = {
              type: "syncVotingResult",
              resultData: data.resultData            };

            logWithTimestamp('广播投票结果:', resultMessage);

            try {
              resultRoom.host.send(JSON.stringify(resultMessage));
            } catch (error) {
              console.error('发送投票结果给主持人失败:', error);
            }

            resultRoom.players.forEach((player) => {
              try {
                player.ws.send(JSON.stringify(resultMessage));
              } catch (error) {
                console.error('发送投票结果给玩家失败:', error);
              }            });
          } else {
            logWithTimestamp('投票结果同步失败：房间不存在');
          }break;

        case "heartbeat":          // 处理心跳包，简单返回确认消息
          logWithTimestamp(`收到心跳包 - 玩家ID: ${data.playerId}, 房间ID: ${data.roomId}, 时间: ${new Date(data.timestamp).toLocaleTimeString()}`);
          
          // 可选：返回心跳确认（通常心跳包不需要确认，只要连接正常即可）
          try {
            ws.send(JSON.stringify({
              type: "heartbeatAck",
              timestamp: Date.now(),
              originalTimestamp: data.timestamp
            }));
          } catch (error) {
            console.error('发送心跳确认失败:', error);
          }
          break;        case "manualSettleVoting":
          logWithTimestamp(`主持人手动结算投票请求，房间ID: ${data.roomId}`);
          const manualSettleRoom = rooms[data.roomId];
          if (manualSettleRoom && manualSettleRoom.host === ws) {
            try {
              // 执行强制结算
              const votingState = manualSettleRoom.votingManager.forceFinishVoting();
              
              // 广播最终投票状态给所有玩家
              const finalMessage = {
                type: "votingStateSync",
                votingState: votingState              };
              
              logWithTimestamp('广播手动结算结果:', finalMessage);
              
              // 发送给主持人
              try {
                manualSettleRoom.host.send(JSON.stringify(finalMessage));
              } catch (error) {
                console.error('发送手动结算结果给主持人失败:', error);
              }
              
              // 发送给所有玩家
              manualSettleRoom.players.forEach((player) => {
                try {
                  player.ws.send(JSON.stringify(finalMessage));
                } catch (error) {
                  console.error(`发送手动结算结果给玩家 ${player.playerId} 失败:`, error);
                }              });
              
              logWithTimestamp('手动结算投票完成');
              
            } catch (error) {
              console.error('手动结算投票失败:', error);
              ws.send(JSON.stringify({
                type: "error",
                message: error.message
              }));
            }
          } else {
            ws.send(JSON.stringify({
              type: "error",
              message: "房间不存在或您不是主持人"
            }));
          }
          break;        default:
          logWithTimestamp("未知消息类型:", data.type);
      }
    } catch (error) {
      console.error("处理消息时发生错误:", error);
      ws.send(JSON.stringify({
        type: "error",
        message: "服务器处理消息时发生错误"
      }));
    }
  });
  ws.on("close", () => {
    logWithTimestamp("客户端断开连接");
    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (room.host === ws) {
        room.players.forEach((player) => {
          player.ws.send(JSON.stringify({ type: "roomClosed" }));
        });
        delete rooms[roomId];      } else {
        // 找到离开的玩家ID，用于清理投票记录
        const leavingPlayer = room.players.find((player) => player.ws === ws);
        if (leavingPlayer) {
          // 从投票系统中移除该玩家的投票
          room.votingManager.removePlayerVote(leavingPlayer.playerId);
        }
        
        room.players = room.players.filter((player) => player.ws !== ws);

        const currentPlayerCount = room.players.length + 1; // 包括主持人
        const playerCountMessage = {
          type: "playerCount",
          count: currentPlayerCount,
        };
        room.host.send(JSON.stringify(playerCountMessage));
        room.players.forEach((player) => {
          player.ws.send(JSON.stringify(playerCountMessage));
        });
        
        // 更新投票系统的期望玩家数量
        room.votingManager.updateExpectedPlayers(currentPlayerCount, room);
      }
    }
  });

  ws.on("error", (error) => {
    console.error("WebSocket 错误:", error);
  });
});

// 启动 HTTP 服务器
server.listen(PORT, () => {
  logWithTimestamp(`服务器运行在端口 ${PORT}`);
});
