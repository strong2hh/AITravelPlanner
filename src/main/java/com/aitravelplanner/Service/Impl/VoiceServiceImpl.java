package com.aitravelplanner.Service.Impl;

import com.aitravelplanner.Service.VoiceService;
import org.springframework.stereotype.Service;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * 科大讯飞语音服务实现类
 */
@Service
public class VoiceServiceImpl implements VoiceService {
    
    private static final String IFLYTEK_API_URL = "http://api.xfyun.cn/v1/service/v1/iat";
    

    
    /**
     * 实时语音转写方法
     * @param audioStream 音频输入流
     * @return 转写后的文本
     */
    @Override
    public String realTimeVoiceTranscription(InputStream audioStream) {
        String apiKey = getVoiceApiKeyFromEnv();
        String appId = getVoiceAppIdFromEnv();
        
        if (apiKey == null || apiKey.isEmpty()) {
            System.err.println("科大讯飞语音识别API Key未设置");
            return "语音识别服务未配置，请检查VOICE_API_KEY环境变量";
        }
        
        if (appId == null || appId.isEmpty()) {
            System.err.println("科大讯飞语音识别AppID未设置");
            return "语音识别服务未配置，请检查VOICE_APP_ID环境变量";
        }
        
        try {
            // 检查音频输入流是否有效
            if (audioStream == null) {
                System.err.println("音频输入流为空");
                return "音频输入无效";
            }
            
            System.out.println("使用科大讯飞语音识别API Key: " + apiKey.substring(0, Math.min(apiKey.length(), 10)) + "...");
            System.out.println("使用科大讯飞AppID: " + appId);
            
            // 使用HTTP API调用科大讯飞语音识别服务
            return callIflytekApi(apiKey, appId, audioStream);
            
        } catch (Exception e) {
            System.err.println("语音转写处理异常: " + e.getMessage());
            return "语音转写失败: " + e.getMessage();
        }
    }
    
    /**
     * 调用科大讯飞HTTP API进行语音识别
     * @param apiKey API密钥
     * @param appId 应用ID
     * @param audioStream 音频输入流
     * @return 识别结果文本
     */
    private String callIflytekApi(String apiKey, String appId, InputStream audioStream) {
        try {
            // 读取音频数据
            byte[] audioData = audioStream.readAllBytes();
            
            // 构建请求URL
            URL url = new URL(IFLYTEK_API_URL);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            
            // 设置请求头
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Content-Type", "audio/L16;rate=16000");
            connection.setRequestProperty("X-Appid", appId);
            
            // 生成认证头部
            String authHeader = generateAuthHeader(apiKey);
            connection.setRequestProperty("Authorization", authHeader);
            
            // 设置连接参数
            connection.setDoOutput(true);
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(30000);
            
            // 发送音频数据
            try (OutputStream os = connection.getOutputStream()) {
                os.write(audioData);
                os.flush();
            }
            
            // 获取响应
            int responseCode = connection.getResponseCode();
            if (responseCode == 200) {
                // 读取响应内容
                String response = new String(connection.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
                return parseResponse(response);
            } else {
                System.err.println("科大讯飞API调用失败，响应码: " + responseCode);
                return "语音识别服务调用失败，请检查网络连接和API配置";
            }
            
        } catch (Exception e) {
            throw new RuntimeException("科大讯飞API调用异常: " + e.getMessage(), e);
        }
    }
    
    /**
     * 生成科大讯飞API认证头部
     * @param apiKey API密钥
     * @return 认证头部字符串
     */
    private String generateAuthHeader(String apiKey) {
        try {
            // 生成当前时间戳（RFC1123格式）
            SimpleDateFormat dateFormat = new SimpleDateFormat("EEE, dd MMM yyyy HH:mm:ss z", Locale.US);
            String date = dateFormat.format(new Date());
            
            // 构建待签名字符串
            String signatureOrigin = String.format("host: api.xfyun.cn\ndate: %s\nGET /v1/service/v1/iat HTTP/1.1", date);
            
            // 计算HMAC-SHA256签名（需要使用apiKey作为密钥）
            String secretKey = apiKey;
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKeySpec);
            byte[] signature = mac.doFinal(signatureOrigin.getBytes(StandardCharsets.UTF_8));
            String signatureBase64 = Base64.getEncoder().encodeToString(signature);
            
            // 构建Authorization头部
            String authorization = String.format("api_key=\"%s\", algorithm=\"hmac-sha256\", headers=\"host date request-line\", signature=\"%s\"", 
                apiKey, signatureBase64);
            
            return authorization;
            
        } catch (Exception e) {
            throw new RuntimeException("生成认证头部失败: " + e.getMessage(), e);
        }
    }
    
    /**
     * 解析科大讯飞API响应
     * @param response JSON响应字符串
     * @return 识别结果文本
     */
    private String parseResponse(String response) {
        // 这里需要解析科大讯飞返回的JSON响应
        // 示例响应格式：{"code":0,"data":{"result":{"ws":[{"cw":[{"w":"你好"}]}]}},"desc":"success"}
        
        try {
            // 简化的JSON解析（实际使用时建议使用Jackson或Gson）
            if (response.contains("\"code\":0")) {
                // 提取识别结果
                int start = response.indexOf("\"w\":\"") + 5;
                int end = response.indexOf("\"", start);
                if (start > 4 && end > start) {
                    return response.substring(start, end);
                }
            }
            
            // 如果解析失败，返回原始响应用于调试
            return "识别结果解析失败，原始响应: " + response;
            
        } catch (Exception e) {
            return "响应解析异常: " + e.getMessage() + "，原始响应: " + response;
        }
    }
    
    /**
     * 从环境变量中获取科大讯飞语音识别API Key
     * @return 科大讯飞API Key，如果环境变量未设置则返回null
     */
    private String getVoiceApiKeyFromEnv() {
        return System.getenv("VOICE_API_KEY");
    }
    
    /**
     * 从环境变量中获取科大讯飞语音识别AppID
     * @return 科大讯飞AppID，如果环境变量未设置则返回null
     */
    private String getVoiceAppIdFromEnv() {
        return System.getenv("VOICE_APP_ID");
    }
}