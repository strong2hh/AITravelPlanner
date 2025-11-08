// Demand.js - AI旅行规划器前端交互逻辑

// 安全的Supabase客户端初始化函数
function initSupabase() {
    if (!window.SUPABASE_CONFIG) {
        console.error('Supabase配置未找到，请确保config.js已正确加载');
        throw new Error('Supabase配置缺失');
    }
    
    if (typeof window.supabase === 'undefined') {
        console.error('Supabase库未加载，请检查CDN连接');
        throw new Error('Supabase库未加载');
    }
    
    const SUPABASE_URL = window.SUPABASE_CONFIG.url;
    const SUPABASE_ANON_KEY = window.SUPABASE_CONFIG.anonKey;
    
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, window.SUPABASE_CONFIG.auth);
}

// 初始化Supabase客户端
let supabase;
function initSupabaseClient() {
    try {
        supabase = initSupabase();
        console.log('Supabase客户端初始化成功');
        return true;
    } catch (error) {
        console.error('Supabase初始化失败:', error);
        supabase = null;
        
        // 延迟重试（非阻塞）
        setTimeout(() => {
            try {
                supabase = initSupabase();
                console.log('Supabase客户端重试初始化成功');
            } catch (retryError) {
                console.error('Supabase重试初始化失败:', retryError);
            }
        }, 1000);
        
        return false;
    }
}

// 异步初始化，不阻塞其他功能
initSupabaseClient();

// 全局变量
let currentUser = null;
let demandData = null;
let currentChatHistory = [];

// 语音识别相关变量
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let recordingTimer = null;
let recordingStartTime = 0;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded - 开始初始化');
    
    // 首先检查语音识别支持
    if (!checkVoiceRecognitionSupport()) {
        console.warn('语音识别功能不可用，将隐藏语音按钮');
        const voiceBtn = document.getElementById('voice-btn');
        if (voiceBtn) {
            voiceBtn.style.display = 'none';
        }
    }
    
    // 延迟初始化，确保所有元素都加载完成
    setTimeout(() => {
        try {
            initAuth();
            bindEvents();
            loadDraft();
            console.log('初始化完成');
        } catch (error) {
            console.error('初始化失败:', error);
        }
    }, 100);
});

// 认证相关功能
async function initAuth() {
    if (!supabase) {
        console.warn('Supabase配置未找到，将使用本地模式');
        showUserMenu(null);
        return;
    }

    // 检查当前会话
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (session) {
        currentUser = session.user;
        showUserMenu(currentUser);
    } else {
        // 如果没有登录，重定向到登录页面
        window.location.href = '../login.html';
    }
}

// 显示用户菜单
function showUserMenu(user) {
    const userMenu = document.getElementById('user-menu');
    const userEmail = document.getElementById('user-email');
    
    if (user) {
        userEmail.textContent = user.email;
        userMenu.style.display = 'flex';
    } else {
        userMenu.style.display = 'none';
    }
}

// 绑定事件
function bindEvents() {
    console.log('开始绑定事件...');
    
    try {
        // 发送消息按钮
        const sendBtn = document.getElementById('send-message');
        if (sendBtn) {
            sendBtn.addEventListener('click', sendMessage);
            console.log('发送消息按钮绑定成功');
        }
        
        // 清空对话按钮
        const clearBtn = document.getElementById('clear-chat');
        if (clearBtn) {
            clearBtn.addEventListener('click', clearChat);
            console.log('清空对话按钮绑定成功');
        }
        
        // 保存草稿按钮
        const saveBtn = document.getElementById('save-draft');
        if (saveBtn) {
            saveBtn.addEventListener('click', saveDraft);
            console.log('保存草稿按钮绑定成功');
        }
        
        // 确认需求按钮
        const confirmBtn = document.getElementById('confirm-demand');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', confirmDemand);
        }
        
        // 修改需求按钮
        const editBtn = document.getElementById('edit-demand');
        if (editBtn) {
            editBtn.addEventListener('click', editDemand);
        }
        
        // 下载计划按钮
        const downloadBtn = document.getElementById('download-plan');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', downloadPlan);
        }
        
        // 新计划按钮
        const newBtn = document.getElementById('new-plan');
        if (newBtn) {
            newBtn.addEventListener('click', newPlan);
        }
        
        // 退出按钮
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
            console.log('退出按钮绑定成功');
        }
        
        // 模态框按钮
        const modalConfirm = document.getElementById('modal-confirm');
        if (modalConfirm) {
            modalConfirm.addEventListener('click', hideModal);
        }
        
        const modalCancel = document.getElementById('modal-cancel');
        if (modalCancel) {
            modalCancel.addEventListener('click', hideModal);
        }
        
        // 回车键发送消息
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
            console.log('输入框回车事件绑定成功');
        }
        
        // 语音识别按钮事件
        bindVoiceRecognitionEvents();
        
        console.log('所有事件绑定完成');
        
    } catch (error) {
        console.error('绑定事件时出错:', error);
    }
}

// 发送消息
async function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) {
        showModal('warning', '提示', '请输入消息内容');
        return;
    }
    
    // 添加用户消息到聊天记录
    addMessageToChat('user', message);
    
    // 清空输入框
    input.value = '';
    
    // 显示AI思考状态
    showTypingIndicator();
    
    try {
        // 调用后端API
        const response = await fetch('/api/process-demand', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                chatHistory: currentChatHistory
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP错误: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            // 添加AI回复到聊天记录
            addMessageToChat('bot', data.response);
            
            // 更新需求数据
            if (data.demandData) {
                demandData = data.demandData;
                
                // 如果需求已完整，显示确认界面
                if (data.isDemandComplete) {
                    showDemandConfirm(data.demandData);
                }
            }
            
        } else {
            throw new Error(data.error || '处理请求失败');
        }
        
    } catch (error) {
        console.error('发送消息失败:', error);
        addMessageToChat('bot', '抱歉，处理您的请求时出现了问题。请稍后重试。');
    } finally {
        hideTypingIndicator();
    }
}

// 添加消息到聊天界面
function addMessageToChat(type, content) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    
    messageDiv.className = `message ${type}-message`;
    messageDiv.innerHTML = `
        <div class="message-avatar">${type === 'bot' ? '🤖' : '👤'}</div>
        <div class="message-content">
            ${content}
            <div class="message-time">${new Date().toLocaleTimeString()}</div>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    
    // 滚动到底部
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // 添加到历史记录
    currentChatHistory.push({
        type: type,
        content: content,
        timestamp: new Date().toISOString()
    });
}

// 显示AI思考状态
function showTypingIndicator() {
    const typingIndicator = document.createElement('div');
    typingIndicator.id = 'typing-indicator';
    typingIndicator.className = 'typing-indicator visible';
    typingIndicator.innerHTML = `
        <div class="message bot-message">
            <div class="message-avatar">🤖</div>
            <div class="message-content">
                <div class="typing-dots">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('chat-messages').appendChild(typingIndicator);
    document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;
}

// 隐藏AI思考状态
function hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// 清空对话
function clearChat() {
    if (confirm('确定要清空当前对话吗？所有未保存的内容将丢失。')) {
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.innerHTML = `
            <div class="message bot-message">
                <div class="message-avatar">🤖</div>
                <div class="message-content">
                    <p>您好！我是AI旅行规划助手，请告诉我您的旅行需求，例如：</p>
                    <ul>
                        <li>想去哪里旅行？</li>
                        <li>什么时间出发和返回？</li>
                        <li>预算是多少？</li>
                        <li>几个人同行？</li>
                        <li>有什么特别的偏好或需求？</li>
                    </ul>
                    <p>您可以一次性告诉我所有信息，也可以分多次说明。</p>
                </div>
            </div>
        `;
        
        currentChatHistory = [];
        demandData = null;
        
        // 隐藏确认和结果区域
        document.getElementById('demand-confirm').style.display = 'none';
        document.getElementById('result').style.display = 'none';
        
        showSaveStatus('success', '对话已清空');
    }
}

// 保存草稿
function saveDraft() {
    const draft = {
        chatHistory: currentChatHistory,
        demandData: demandData,
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('travel-plan-draft', JSON.stringify(draft));
    showSaveStatus('success', '草稿已保存');
}

// 加载草稿
function loadDraft() {
    const draft = localStorage.getItem('travel-plan-draft');
    if (draft) {
        try {
            const parsedDraft = JSON.parse(draft);
            currentChatHistory = parsedDraft.chatHistory || [];
            demandData = parsedDraft.demandData || null;
            
            // 如果有聊天历史，重新渲染
            if (currentChatHistory.length > 0) {
                renderChatHistory();
                showSaveStatus('success', '草稿已加载');
            }
        } catch (error) {
            console.error('加载草稿失败:', error);
        }
    }
}

// 重新渲染聊天历史
function renderChatHistory() {
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = '';
    
    currentChatHistory.forEach(item => {
        addMessageToChat(item.type, item.content);
    });
}

// 显示需求确认界面
function showDemandConfirm(demandData) {
    const demandSummary = document.getElementById('demand-summary');
    
    let html = '<ul>';
    if (demandData.destination) html += `<li><strong>目的地：</strong>${demandData.destination}</li>`;
    if (demandData.startDate) html += `<li><strong>出发日期：</strong>${demandData.startDate}</li>`;
    if (demandData.endDate) html += `<li><strong>返回日期：</strong>${demandData.endDate}</li>`;
    if (demandData.budget) html += `<li><strong>预算：</strong>${demandData.budget}</li>`;
    if (demandData.people) html += `<li><strong>人数：</strong>${demandData.people}</li>`;
    if (demandData.preferences) html += `<li><strong>偏好：</strong>${demandData.preferences}</li>`;
    html += '</ul>';
    
    demandSummary.innerHTML = html;
    document.getElementById('demand-confirm').style.display = 'block';
}

// 确认需求并生成计划
async function confirmDemand() {
    if (!demandData) {
        showModal('error', '错误', '没有可确认的需求数据');
        return;
    }
    
    // 显示加载状态
    document.getElementById('loading').style.display = 'block';
    document.getElementById('demand-confirm').style.display = 'none';
    
    try {
        const response = await fetch('/api/generate-travel-plan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(demandData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP错误: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            // 显示结果
            showTravelPlanResult(data.travelPlan);
            
            // 保存到历史记录
            if (supabase && currentUser) {
                await saveTravelPlanToHistory(data.travelPlan);
            }
            
        } else {
            throw new Error(data.error || '生成计划失败');
        }
        
    } catch (error) {
        console.error('生成旅行计划失败:', error);
        showModal('error', '错误', '生成旅行计划失败，请稍后重试');
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

// 修改需求
function editDemand() {
    document.getElementById('demand-confirm').style.display = 'none';
    addMessageToChat('bot', '好的，请告诉我您要修改的需求细节。');
}

// 显示旅行计划结果
function showTravelPlanResult(travelPlan) {
    const travelPlanDiv = document.getElementById('travel-plan');
    travelPlanDiv.innerHTML = travelPlan;
    
    document.getElementById('result').style.display = 'block';
}

// 下载计划
function downloadPlan() {
    const travelPlan = document.getElementById('travel-plan').innerHTML;
    const blob = new Blob([travelPlan], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = `旅行计划_${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    
    URL.revokeObjectURL(url);
    showSaveStatus('success', '计划已下载');
}

// 创建新计划
function newPlan() {
    clearChat();
    document.getElementById('result').style.display = 'none';
}

// 保存旅行计划到历史记录
async function saveTravelPlanToHistory(travelPlan) {
    try {
        const { error } = await supabase
            .from('travel_plans')
            .insert({
                user_id: currentUser.id,
                plan_data: travelPlan,
                created_at: new Date().toISOString()
            });
        
        if (error) {
            console.error('保存计划到历史记录失败:', error);
        }
    } catch (error) {
        console.error('保存计划到历史记录失败:', error);
    }
}

// 退出登录
async function logout() {
    if (supabase) {
        await supabase.auth.signOut();
    }
    window.location.href = '/LogIn/index.html';
}

// 显示模态框
function showModal(type, title, content) {
    const modalOverlay = document.getElementById('modal-overlay');
    const modalIcon = document.getElementById('modal-icon');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    
    // 设置图标
    modalIcon.className = `modal-icon ${type}`;
    modalIcon.innerHTML = type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '❌';
    
    modalTitle.textContent = title;
    modalContent.innerHTML = `<p>${content}</p>`;
    
    modalOverlay.classList.add('active');
}

// 隐藏模态框
function hideModal() {
    document.getElementById('modal-overlay').classList.remove('active');
}

// 显示保存状态
function showSaveStatus(type, message) {
    const saveStatus = document.getElementById('save-status');
    const saveStatusIcon = document.getElementById('save-status-icon');
    const saveStatusText = document.getElementById('save-status-text');
    
    saveStatus.className = `save-status ${type}`;
    saveStatusIcon.innerHTML = type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '❌';
    saveStatusText.textContent = message;
    
    saveStatus.classList.add('show');
    
    setTimeout(() => {
        saveStatus.classList.remove('show');
    }, 3000);
}



// =============================
// 语音识别功能
// =============================

function bindVoiceRecognitionEvents() {
    console.log('开始绑定语音识别事件...');
    
    const voiceBtn = document.getElementById('voice-btn');
    
    if (!voiceBtn) {
        console.error('语音识别按钮未找到，检查HTML中是否存在id="voice-btn"的按钮');
        return;
    }
    
    console.log('找到语音识别按钮:', voiceBtn);
    
    // 确保指示器存在
    if (!document.getElementById('voice-recording-indicator')) {
        createVoiceRecordingIndicator();
    }
    
    // 清理之前的事件监听器（防止重复绑定）
    voiceBtn.replaceWith(voiceBtn.cloneNode(true));
    const newVoiceBtn = document.getElementById('voice-btn');
    
    // 重新绑定所有事件
    newVoiceBtn.addEventListener('mousedown', function(e) {
        console.log('鼠标按下 - 开始录音');
        e.preventDefault();
        startVoiceRecording();
    });
    
    newVoiceBtn.addEventListener('touchstart', function(e) {
        console.log('触摸开始 - 开始录音');
        e.preventDefault();
        startVoiceRecording();
    });
    
    newVoiceBtn.addEventListener('mouseup', function(e) {
        console.log('鼠标抬起 - 停止录音');
        e.preventDefault();
        stopVoiceRecording();
    });
    
    newVoiceBtn.addEventListener('touchend', function(e) {
        console.log('触摸结束 - 停止录音');
        e.preventDefault();
        stopVoiceRecording();
    });
    
    newVoiceBtn.addEventListener('mouseleave', function(e) {
        console.log('鼠标离开 - 停止录音');
        if (isRecording) {
            stopVoiceRecording();
        }
    });
    
    // 防止浏览器默认行为
    newVoiceBtn.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });
    
    // 添加点击事件进行调试
    newVoiceBtn.addEventListener('click', function(e) {
        console.log('语音按钮被点击，当前录音状态:', isRecording);
        e.preventDefault();
    });
    
    console.log('语音识别事件绑定完成，按钮可用');
}

function createVoiceRecordingIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'voice-recording-indicator';
    indicator.className = 'voice-recording-indicator';
    indicator.innerHTML = `
        <div class="recording-dot"></div>
        <span>正在录音中... 松开按钮结束录音</span>
    `;
    document.body.appendChild(indicator);
}

async function startVoiceRecording() {
    if (isRecording) return;
    
    console.log('开始请求麦克风权限...');
    
    try {
        // 首先检查协议是否安全（HTTPS）
        if (!window.isSecureContext) {
            showModal('error', '安全协议要求', '语音识别功能需要HTTPS协议。请使用HTTPS访问此页面。');
            return;
        }
        
        // 检查浏览器是否支持麦克风
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showModal('error', '浏览器不支持', '您的浏览器不支持语音录制功能，请使用Chrome、Firefox或Edge等现代浏览器。');
            return;
        }
        
        // 先检查麦克风权限状态（如果支持Permissions API）
        let permissionState = 'prompt';
        if (navigator.permissions && navigator.permissions.query) {
            try {
                const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
                permissionState = permissionStatus.state;
                console.log('当前麦克风权限状态:', permissionState);
                
                if (permissionState === 'denied') {
                    showModal('error', '麦克风权限', 
                        '麦克风权限已被拒绝。请点击浏览器地址栏左侧的锁形图标，在权限设置中重新允许麦克风访问。');
                    return;
                }
            } catch (error) {
                console.warn('无法查询麦克风权限状态:', error);
            }
        }
        
        // 显示提示信息，让用户准备说话
        showVoiceRecordingIndicator();
        updateVoiceButtonState(true);
        
        // 请求麦克风权限（使用最简单的配置）
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: true  // 使用最简单的配置
        });
        
        // 初始化媒体录制器
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus',
            audioBitsPerSecond: 16000
        });
        
        audioChunks = [];
        
        // 监听数据可用事件
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
        // 监听录制结束事件
        mediaRecorder.onstop = handleRecordingStopped;
        
        // 开始录制
        mediaRecorder.start(1000); // 每1秒收集一次数据
        isRecording = true;
        recordingStartTime = Date.now();
        
        // 更新UI状态
        updateVoiceButtonState(true);
        showVoiceRecordingIndicator();
        
        console.log('语音录制开始');
        
        // 设置超时限制（最多录制60秒）
        recordingTimer = setTimeout(() => {
            if (isRecording) {
                stopVoiceRecording();
                showModal('warning', '提示', '录音时间过长，已自动结束（最长60秒）');
            }
        }, 60000);
        
    } catch (error) {
        console.error('无法访问麦克风:', error);
        showModal('error', '麦克风权限', '无法访问麦克风，请检查浏览器权限设置');
    }
}

function stopVoiceRecording() {
    if (!isRecording || !mediaRecorder) return;
    
    try {
        // 停止录制
        mediaRecorder.stop();
        
        // 停止所有音轨
        if (mediaRecorder.stream) {
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
        
        // 清除计时器
        if (recordingTimer) {
            clearTimeout(recordingTimer);
            recordingTimer = null;
        }
        
        console.log('语音录制结束，总时长:', Date.now() - recordingStartTime, 'ms');
        
    } catch (error) {
        console.error('停止录音失败:', error);
    }
}

async function handleRecordingStopped() {
    isRecording = false;
    
    // 更新UI状态
    updateVoiceButtonState(false);
    hideVoiceRecordingIndicator();
    
    // 检查录音时长（至少1秒）
    const recordingDuration = Date.now() - recordingStartTime;
    if (recordingDuration < 1000) {
        showModal('warning', '录音过短', '录音时间太短，请长按按钮说话（至少1秒）');
        return;
    }
    
    console.log('录音时长:', recordingDuration, 'ms, 音频数据块数:', audioChunks.length);
    
    // 处理音频数据
    try {
        // 创建音频Blob
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
        console.log('音频Blob大小:', audioBlob.size, 'bytes');
        
        // 显示处理状态
        showSaveStatus('success', '正在处理语音识别...');
        
        // 发送到后端进行语音识别
        const recognitionResult = await sendAudioToBackend(audioBlob);
        
        console.log('语音识别结果:', recognitionResult);
        
        // 将识别结果添加到输入框
        if (recognitionResult && recognitionResult.trim()) {
            updateChatInput(recognitionResult);
            showSaveStatus('success', '语音识别完成');
        } else {
            showModal('warning', '语音识别', '未能识别到有效内容，请重试');
        }
        
    } catch (error) {
        console.error('语音识别处理失败:', error);
        showModal('error', '语音识别错误', '语音识别服务暂时不可用，请稍后重试');
    }
}

async function sendAudioToBackend(audioBlob) {
    try {
        // 创建FormData对象
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        
        // 发送到后端API
        const response = await fetch('/api/voice-recognition', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP错误: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.text) {
            return data.text;
        } else {
            throw new Error(data.error || '语音识别失败');
        }
        
    } catch (error) {
        console.error('发送音频数据失败:', error);
        throw error;
    }
}

function updateVoiceButtonState(recording) {
    const voiceBtn = document.getElementById('voice-btn');
    if (!voiceBtn) return;
    
    if (recording) {
        voiceBtn.classList.add('recording');
        voiceBtn.querySelector('.voice-text').textContent = '松开结束';
    } else {
        voiceBtn.classList.remove('recording');
        voiceBtn.querySelector('.voice-text').textContent = '按住说话';
    }
}

function showVoiceRecordingIndicator() {
    const indicator = document.getElementById('voice-recording-indicator');
    if (indicator) {
        indicator.classList.add('visible');
    }
}

function hideVoiceRecordingIndicator() {
    const indicator = document.getElementById('voice-recording-indicator');
    if (indicator) {
        indicator.classList.remove('visible');
    }
}

function updateChatInput(text) {
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        // 如果输入框已有内容，添加换行符
        const currentValue = chatInput.value.trim();
        if (currentValue) {
            chatInput.value = currentValue + '\n' + text;
        } else {
            chatInput.value = text;
        }
        
        // 自动聚焦到输入框
        chatInput.focus();
        
        // 滚动到输入框底部
        chatInput.scrollTop = chatInput.scrollHeight;
    }
}

// 检查浏览器是否支持语音识别
function checkVoiceRecognitionSupport() {
    // 首先检查是否在HTTPS环境下
    if (!window.isSecureContext) {
        console.warn('语音识别功能需要HTTPS环境');
        const voiceBtn = document.getElementById('voice-btn');
        if (voiceBtn) {
            voiceBtn.style.display = 'none';
        }
        return false;
    }
    
    // 检查麦克风支持
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('浏览器不支持语音录制功能');
        const voiceBtn = document.getElementById('voice-btn');
        if (voiceBtn) {
            voiceBtn.style.display = 'none';
        }
        return false;
    }
    
    // 检查MediaRecorder支持
    if (!window.MediaRecorder) {
        console.warn('浏览器不支持MediaRecorder API');
        const voiceBtn = document.getElementById('voice-btn');
        if (voiceBtn) {
            voiceBtn.style.display = 'none';
        }
        return false;
    }
    
    console.log('浏览器支持语音识别功能');
    return true;
}

// 页面加载时检查语音识别支持
document.addEventListener('DOMContentLoaded', function() {
    if (!checkVoiceRecognitionSupport()) {
        console.warn('当前浏览器不支持语音识别功能');
    }
});