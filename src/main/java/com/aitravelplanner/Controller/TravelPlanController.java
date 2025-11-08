package com.aitravelplanner.Controller;

import com.aitravelplanner.Service.AaLIBigModelService;
import com.aitravelplanner.Service.Impl.AaLIBigModelServiceImpl;
import com.aitravelplanner.Service.MapService;
import com.aitravelplanner.Service.Impl.MapServiceImpl;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class TravelPlanController {
    
    private final AaLIBigModelService aiAssistant;
    private final MapService mapService;
    
    public TravelPlanController() {
        this.aiAssistant = new AaLIBigModelServiceImpl();
        this.mapService = new MapServiceImpl();
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
            String prompt = "请根据以下用户需求生成一个详细的旅行计划：" + userMessage + "请提供详细的行程安排、住宿建议、交通方案、餐饮推荐和预算分配。" + "地点信息请用【具体的地点】包裹，时间信息请用$具体的时间$包裹,其他地方不要使用'【','】'和'$'这三个字符";
            
            // 调用AI助手生成旅行计划
            String aiResponse = aiAssistant.generateResponse(prompt);
            
            // 返回结果
            return ResponseEntity.ok(Map.of("travelPlan", aiResponse));
            
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "生成旅行计划失败: " + e.getMessage()));
        }
    }
    
    /**
     * 地理编码API
     * @param request 包含地址名称的请求体
     * @return 地理编码结果（经纬度坐标）
     */
    @PostMapping("/geocode")
    public ResponseEntity<Map<String, Object>> geocode(@RequestBody Map<String, String> request) {
        try {
            // 获取地址名称
            String address = request.get("address");
            
            if (address == null || address.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "地址名称不能为空"));
            }
            
            // 调用地图服务进行地理编码
            String coordinate = mapService.geoCode(address);
            
            if (coordinate == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "地理编码失败，请检查地址名称是否正确"));
            }
            
            // 返回结果
            return ResponseEntity.ok(Map.of("success", true, "coordinate", coordinate));
            
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "地理编码失败: " + e.getMessage()));
        }
    }

    /**
     * 步行路线规划API（支持地点名称和坐标）
     * @param request 包含起点和终点坐标或地点名称的请求体
     * @return 步行路线规划结果
     */
    @PostMapping("/plan-walking-route")
    public ResponseEntity<Map<String, Object>> planWalkingRoute(@RequestBody Map<String, String> request) {
        try {
            // 获取起点和终点坐标或地点名称
            String origin = request.get("origin");
            String destination = request.get("destination");
            
            if (origin == null || origin.trim().isEmpty() || destination == null || destination.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "起点和终点不能为空"));
            }
            
            // 如果输入的是地点名称而不是坐标，先进行地理编码
            String originCoord = origin;
            String destCoord = destination;
            
            // 检查是否是坐标格式（经度,纬度），如果不是则进行地理编码
            if (!isValidCoordinate(origin)) {
                String originCoordResult = mapService.geoCode(origin);
                if (originCoordResult == null) {
                    return ResponseEntity.badRequest()
                            .body(Map.of("error", "起点地址编码失败: " + origin));
                }
                originCoord = originCoordResult;
            }
            
            if (!isValidCoordinate(destination)) {
                String destCoordResult = mapService.geoCode(destination);
                if (destCoordResult == null) {
                    return ResponseEntity.badRequest()
                            .body(Map.of("error", "终点地址编码失败: " + destination));
                }
                destCoord = destCoordResult;
            }
            
            // 调用地图服务进行步行路线规划
            Map<String, Object> routeResult = mapService.planWalkingRoute(originCoord, destCoord);
            
            if (routeResult == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "路线规划失败，请检查输入是否正确"));
            }
            
            System.out.println("routeResult: " + routeResult);

            // 返回完整的路线数据，让前端直接使用
            return ResponseEntity.ok(Map.of(
                "success", true, 
                "routeData", routeResult,
                "originCoordinate", originCoord,
                "destinationCoordinate", destCoord,
                "message", "路线规划成功"
            ));
            
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "路线规划失败: " + e.getMessage()));
        }
    }
    
    /**
     * 获取高德地图API Key
     * 前端可以通过此接口获取环境变量中的高德地图API Key
     * @return API Key信息
     */
    @GetMapping("/map-api-key")
    public ResponseEntity<Map<String, String>> getMapApiKey() {
        try {
            // 调用地图服务获取API Key
            String apiKey = mapService.getMapApiKey();
            
            if (apiKey == null || apiKey.trim().isEmpty()) {
                return ResponseEntity.ok(Map.of("error", "高德地图API Key未设置"));
            }
            
            return ResponseEntity.ok(Map.of(
                "success", "true",
                "apiKey", apiKey,
                "message", "API Key已正确配置"
            ));
            
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "获取API Key失败: " + e.getMessage()));
        }
    }
    
    /**
     * 验证经纬度坐标格式
     * @param coordinate 经纬度字符串（格式：经度,纬度）
     * @return 格式正确返回true，否则返回false
     */
    private boolean isValidCoordinate(String coordinate) {
        if (coordinate == null || coordinate.trim().isEmpty()) {
            return false;
        }
        
        String[] parts = coordinate.split(",");
        if (parts.length != 2) {
            return false;
        }
        
        try {
            double longitude = Double.parseDouble(parts[0].trim());
            double latitude = Double.parseDouble(parts[1].trim());
            
            // 验证经度范围（-180到180）
            if (longitude < -180 || longitude > 180) {
                return false;
            }
            
            // 验证纬度范围（-90到90）
            if (latitude < -90 || latitude > 90) {
                return false;
            }
            
            return true;
        } catch (NumberFormatException e) {
            return false;
        }
    }
}