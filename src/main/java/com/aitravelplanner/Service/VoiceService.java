package com.aitravelplanner.Service;

import java.io.InputStream;

public interface VoiceService {
    
    /**
     * 实时语音转写方法
     * @param audioStream 音频输入流
     * @return 转写后的文本
     */
    String realTimeVoiceTranscription(InputStream audioStream);
}
