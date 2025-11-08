package com.aitravelplanner.Service.Impl;

import com.aitravelplanner.Service.MapService;
import java.lang.System;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;
import java.io.BufferedReader;
import java.io.InputStreamReader;

/**
 * 高德地图服务实现类
 */
public class MapServiceImpl implements MapService {
    
    /**
     * 获取环境变量中名为MAP_API_KEY的高德地图API Key
     * @return 高德地图API Key，如果环境变量未设置则返回null
     */
    public String getMapApiKey() {
        return System.getenv("MAP_API_KEY");
    }
    
    /**
     * 实现地理编码服务，调用高德地图API将地址转换为坐标
     * @param address 地址字符串
     * @return 坐标信息字符串（格式：经度,纬度），转换失败返回null
     */
    @Override
    public String geoCode(String address) {
        String apiKey = getMapApiKey();
        if (apiKey == null || apiKey.isEmpty()) {
            System.err.println("高德地图API Key未设置");
            return null;
        }
        
        if (address == null || address.trim().isEmpty()) {
            System.err.println("地址不能为空");
            return null;
        }
        
        try {
            // 构建高德地理编码API请求URL
            String encodedAddress = java.net.URLEncoder.encode(address, "UTF-8");
            String urlString = "https://restapi.amap.com/v3/geocode/geo?key=" + apiKey + "&address=" + encodedAddress;
            
            URL url = new URL(urlString);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(5000);
            connection.setReadTimeout(5000);
            
            int responseCode = connection.getResponseCode();
            if (responseCode == 200) {
                BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(), "UTF-8"));
                StringBuilder response = new StringBuilder();
                String line;
                
                while ((line = reader.readLine()) != null) {
                    response.append(line);
                }
                reader.close();
                
                // 解析高德API返回的JSON数据
                return parseGeocodeResponse(response.toString());
            } else {
                System.err.println("高德地图API请求失败，响应码：" + responseCode);
                return null;
            }
        } catch (Exception e) {
            System.err.println("地理编码服务异常：" + e.getMessage());
            return null;
        }
    }
    
    /**
     * 解析高德地理编码API返回的JSON数据
     * @param response 高德API返回的JSON字符串
     * @return 坐标信息字符串（格式：经度,纬度）
     */
    private String parseGeocodeResponse(String response) {
        try {
            // 简单的JSON解析，提取location字段
            // 高德API返回格式示例：{"status":"1","info":"OK","geocodes":[{"location":"116.480881,39.989410"}]}
            if (response.contains("\"location\":")) {
                int startIndex = response.indexOf("\"location\":\"") + 12;
                int endIndex = response.indexOf("\"", startIndex);
                if (startIndex > 12 && endIndex > startIndex) {
                    return response.substring(startIndex, endIndex);
                }
            }
            return null;
        } catch (Exception e) {
            System.err.println("解析地理编码响应失败：" + e.getMessage());
            return null;
        }
    }

    /**
     * 实现步行路线规划服务，调用高德地图API进行步行路线规划
     * @param origin 起点经纬度字符串（格式：经度,纬度，如："118.781664,32.057561"）
     * @param destination 终点经纬度字符串（格式：经度,纬度，如："118.781664,32.057561"）
     * @return 结构化路线数据Map对象，规划失败返回null
     */
    @Override
    public Map<String, Object> planWalkingRoute(String origin, String destination) {
        String apiKey = getMapApiKey();
        if (apiKey == null || apiKey.isEmpty()) {
            System.err.println("高德地图API Key未设置");
            return null;
        }
        
        if (origin == null || origin.trim().isEmpty() || destination == null || destination.trim().isEmpty()) {
            System.err.println("坐标参数不能为空");
            return null;
        }
        
        // 验证经纬度格式
        if (!isValidCoordinate(origin) || !isValidCoordinate(destination)) {
            System.err.println("坐标格式不正确，应为\"经度,纬度\"格式，如：\"118.781664,32.057561\"");
            return null;
        }
        
        try {
            // 构建高德步行路线规划API请求URL
            String urlString = "https://restapi.amap.com/v3/direction/walking?key=" + apiKey + 
                             "&origin=" + origin + "&destination=" + destination;
            
            URL url = new URL(urlString);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(5000);
            connection.setReadTimeout(5000);
            
            int responseCode = connection.getResponseCode();
            if (responseCode == 200) {
                BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(), "UTF-8"));
                StringBuilder response = new StringBuilder();
                String line;
                
                while ((line = reader.readLine()) != null) {
                    response.append(line);
                }
                reader.close();
                
                System.out.println("步行路线规划响应：" + response.toString());
                System.out.println("分割线");
                // 解析高德API返回的JSON数据
                return parseWalkingRouteResponse(response.toString());
            } else {
                System.err.println("高德地图步行路线规划API请求失败，响应码：" + responseCode);
                return null;
            }
        } catch (Exception e) {
            System.err.println("步行路线规划服务异常：" + e.getMessage());
            return null;
        }
    }
    
    /**
     * 解析高德步行路线规划API返回的JSON数据
     * @param response 高德API返回的JSON字符串
     * @return 结构化路线数据Map对象
     */
    private Map<String, Object> parseWalkingRouteResponse(String response) {
        try {
            // 使用JSON库解析响应为结构化数据
            if (response == null || response.trim().isEmpty()) {
                System.err.println("步行路线规划响应为空");
                return null;
            }
            
            // 检查响应是否包含有效数据
            if (response.contains("\"status\":\"1\"") && response.contains("\"paths\":")) {
                // 使用Jackson或Gson解析JSON字符串为Map对象
                // 这里使用简单的JSON解析，实际项目中建议使用JSON库
                return parseJsonToMap(response);
            } else {
                System.err.println("步行路线规划响应格式不正确：" + response);
                return null;
            }
        } catch (Exception e) {
            System.err.println("解析步行路线规划响应失败：" + e.getMessage());
            return null;
        }
    }
    
    /**
     * 使用Jackson库解析JSON字符串为Map对象
     */
    private Map<String, Object> parseJsonToMap(String jsonString) {
        try {
            // 使用Jackson库解析JSON
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            
            // 解析整个JSON字符串
            Map<String, Object> fullResponse = mapper.readValue(jsonString, Map.class);
            
            // 检查status是否为1（成功）
            if (!"1".equals(fullResponse.get("status"))) {
                System.err.println("高德API返回失败状态：" + fullResponse.get("info"));
                return null;
            }
            
            // 提取route数据
            Map<String, Object> routeData = (Map<String, Object>) fullResponse.get("route");
            if (routeData == null) {
                System.err.println("路由数据为空");
                return null;
            }
            
            // 构建标准化的返回结果
            Map<String, Object> result = new java.util.HashMap<>();
            result.put("status", fullResponse.get("status"));
            result.put("info", fullResponse.get("info"));
            result.put("paths", routeData.get("paths"));
            
            return result;
        } catch (Exception e) {
            System.err.println("JSON解析失败：" + e.getMessage());
            return null;
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
