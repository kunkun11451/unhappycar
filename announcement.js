(function() {
    if (localStorage.getItem('unhappycar-announcement-acknowledged')) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'pt/HYWenHei-85W.css';
    document.head.appendChild(link);

    const modalHtml = `
    <div id="announcement-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10000; display: flex; align-items: center; justify-content: center; font-family: 'HYWenHei-85W', 'Microsoft YaHei', sans-serif;">
        <div style="background: white; padding: 30px; border-radius: 12px; max-width: 500px; width: 90%; box-shadow: 0 10px 25px rgba(0,0,0,0.3); text-align: center;">
            <h2 style="color: #e74c3c; margin-top: 0; font-size: 22px;">关于“守护纯净体验”的严正声明</h2>
            <div style="text-align: left; color: #34495e; line-height: 1.6; margin: 20px 0;">
                <p>我们意识到，如果盲目向现代花哨的同类项目看齐，贸然地堆砌新功能与花板子，会导致页面显得杂乱失去视觉焦点，也不够温暖和纯粹，破坏使用沉浸感。而且贸然大幅更新，往往意味着让习惯了最初版本的用户感到陌生。毕竟我们不能为了一厢情愿的技术追求，不顾大多数用户甚至放弃低端甚至中端配置的访问者的使用体验。为此，<strong>我们经过了多方面考虑与协商，决定保持现状</strong>。
                <br><br>为了不破坏这份不温不火的沉浸感，<strong>本项目将停止更新与维护</strong>。
                <br><br>为了进一步保存这份纯净，原 unhappycar.games 域名与部分项目的在线模式服务器将陆续“功成身退”停止续期，我们不能为了维护成本而罔顾大多数人的稳定体验。
                <br><br>当然，底层角色数据仍会由 Github Actions 默默进行自动更新。如仍希望体验原汁原味的离线工具，请使用 Netlify 提供的永久域名：<a href="https://unhappycar.netlify.app" style="color: #3498db; text-decoration: none; border-bottom: 1px dashed #3498db;">unhappycar.netlify.app</a> 访问该网站，享受不被打扰的宁静。</p>
            </div>
            <button id="close-announcement" style="background: #3498db; color: white; border: none; padding: 10px 25px; border-radius: 6px; cursor: pointer; font-size: 16px; transition: background 0.3s;">懂你意思！</button>
        </div>
    </div>
    `;

    const div = document.createElement('div');
    div.innerHTML = modalHtml;
    document.body.appendChild(div);

    const closeBtn = document.getElementById('close-announcement');
    let timeLeft = 15;
    closeBtn.disabled = true;
    closeBtn.style.opacity = '0.5';
    closeBtn.style.cursor = 'not-allowed';
    const originalText = closeBtn.innerText;
    closeBtn.innerText = `${originalText} (${timeLeft}s)`;

    const timer = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
            clearInterval(timer);
            closeBtn.disabled = false;
            closeBtn.style.opacity = '1';
            closeBtn.style.cursor = 'pointer';
            closeBtn.innerText = originalText;
        } else {
            closeBtn.innerText = `${originalText} (${timeLeft}s)`;
        }
    }, 1000);

    closeBtn.onclick = function() {
        document.getElementById('announcement-modal').remove();
        localStorage.setItem('unhappycar-announcement-acknowledged', 'true');
    };
})();
