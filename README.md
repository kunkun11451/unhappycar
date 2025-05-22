# unhappycar
猿神锄地娱乐车角色和事件抽取器

## 介绍
让ai用happy-car.netlify.app/的源码添加了一些小功能和实现了多人房间同步\
此项目前端已部署在netlify，访问网址unhappycar.netlify.app； 服务端托管在glitch\
服务端托管使用的是免费计划，可能会有反应慢，宕机的情况\
修改代码全部由copilot完成，可能会有没发现的bug\
以下是一些自定义项目的修改教程

## 自定义任务事件
1.先下载所有文件到本地\
2.在mission.js / hardmission.js编辑个人/团队事件，注意格式\
3.改完了使用浏览器打开index.html，正常使用即可\
4.使用此本地文件打开网页。你主持的游戏抽到你事件将会是你刚才改好的。其他人仍可使用 unhappycar.netlify.app 加入你的房间，并使用你自定义的事件进行游戏

## 自己部署服务端
此项目使用glitch的免费计划托管，如出现点击主持游戏，加入房间无反应、检查控制台WebSocket的连接失败，可能是免费计划上限了\
如果你有兴趣，可以尝试自己部署\
服务端文件：server.js\
1.准备环境：安装node.js 、开放所需端口\
2.将代码文件（server.js）上传到目标服务器\
3.在服务器上，进入代码所在目录并运行以下命令安装依赖：npm install ；还有依赖库：npm install ws uuid\
4.运行以下命令启动 WebSocket 服务器：node server.js\
5.在multiplayer.js中，将   const ws = new WebSocket('wss://（这里改成你的服务器地址）');\
可以询问ai咨询详细步骤和报错

## ......

