package com.aitravelplanner.Controller;

import com.aitravelplanner.Service.VoiceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * 语音识别控制器
 * 处理前端语音识别请求，调用科大讯飞语音识别服务
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class VoiceRecognitionController {
    
    @Autowired
    private VoiceService voiceService;
    
    /**
     * 语音识别API接口
     * 接收音频文件并返回识别结果
     */
    @PostMapping("/voice-recognition")
    public ResponseEntity<Map<String, Object>> recognizeVoice(
            @RequestParam("audio") MultipartFile audioFile) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            // 检查文件是否为空
            if (audioFile.isEmpty()) {
                response.put("success", false);
                response.put("error", "音频文件为空");
                return ResponseEntity.badRequest().body(response);
            }
            
            // 检查文件格式
            String contentType = audioFile.getContentType();
            if (contentType == null || !(contentType.equals("audio/webm") || 
                                        contentType.equals("audio/mpeg") ||
                                        contentType.equals("audio/wav") ||
                                        contentType.equals("audio/ogg"))) {
                response.put("success", false);
                response.put("error", "不支持的音频格式，支持格式：webm, mp3, wav, ogg");
                return ResponseEntity.badRequest().body(response);
            }
            
            // 检查文件大小（限制为10MB）
            if (audioFile.getSize() > 10 * 1024 * 1024) {
                response.put("success", false);
                response.put("error", "音频文件过大，最大支持10MB");
                return ResponseEntity.badRequest().body(response);
            }
            
            // 将音频数据转换为输入流
            ByteArrayInputStream audioStream = new ByteArrayInputStream(audioFile.getBytes());
            
            // 调用语音识别服务
            String recognitionResult = voiceService.realTimeVoiceTranscription(audioStream);
            
            // 关闭输入流
            audioStream.close();
            
            // 返回识别结果
            response.put("success", true);
            response.put("text", recognitionResult);
            response.put("audioSize", audioFile.getSize());
            response.put("audioType", contentType);
            
            return ResponseEntity.ok(response);
            
        } catch (IOException e) {
            response.put("success", false);
            response.put("error", "音频文件处理失败：" + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", "语音识别服务异常：" + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
    
    /**
     * 语音识别服务状态检查
     */
    @GetMapping("/voice-recognition/status")
    public ResponseEntity<Map<String, Object>> checkVoiceRecognitionStatus() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // 检查环境变量是否配置
            String apiKey = System.getenv("VOICE_API_KEY");
            String appId = System.getenv("VOICE_APP_ID");
            
            boolean apiConfigured = apiKey != null && !apiKey.trim().isEmpty();
            boolean appIdConfigured = appId != null && !appId.trim().isEmpty();
            
            response.put("serviceAvailable", apiConfigured && appIdConfigured);
            response.put("apiKeyConfigured", apiConfigured);
            response.put("appIdConfigured", appIdConfigured);
            response.put("message", "语音识别服务状态检查完成");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("serviceAvailable", false);
            response.put("error", "状态检查失败：" + e.getMessage());
            return ResponseEntity.ok(response);
        }
    }
}