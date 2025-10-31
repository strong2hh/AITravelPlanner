package com.aitravelplanner;

import com.aitravelplanner.Model.AIAssistant;
import com.aitravelplanner.Model.Impl.AaLiAssistant;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class TravelPlanController {
    
    private final AIAssistant aiAssistant;
    
    public TravelPlanController() {
        this.aiAssistant = new AaLiAssistant();
    }
    
    /**
     * 生成旅行计划API
     * @param request 包含用户消息的请求体
     * @return AI生成的旅行计划
     */
    @PostMapping("/generate-travel-plan")
    public ResponseEntity<Map<String, String>> generateTravelPlan(@RequestBody Map<String, String> request) {
        try {
            // 获取用户消息
            String userMessage = request.get("message");
            if (userMessage == null || userMessage.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "消息内容不能为空"));
            }
            
            // 构建AI提示词
            String prompt = "请根据以下用户需求生成一个详细的旅行计划：" + userMessage + "请提供详细的行程安排、住宿建议、交通方案、餐饮推荐和预算分配。";
            
            // 调用AI助手生成旅行计划
            String aiResponse = aiAssistant.generateResponse(prompt);
            
            // 返回结果
            return ResponseEntity.ok(Map.of("travelPlan", aiResponse));
            
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "生成旅行计划失败: " + e.getMessage()));
        }
    }
}