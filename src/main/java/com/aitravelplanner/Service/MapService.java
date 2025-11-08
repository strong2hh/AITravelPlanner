package com.aitravelplanner.Service;

import java.util.Map;

/**
 * 地图服务接口
 */
public interface MapService {

    /**
     * 将地址转换为地理坐标
     * @param address 地址字符串
     * @return 坐标信息字符串（格式：经度,纬度），转换失败返回null
     */
    public String geoCode(String address);

    /**
     * 步行路线规划服务接口
     * 定义步行路线规划的标准方法
     * 根据起点和终点经纬度进行步行路线规划
     * @param origin 起点经纬度字符串（格式：经度,纬度，如："118.781664,32.057561"）
     * @param destination 终点经纬度字符串（格式：经度,纬度，如："118.781664,32.057561"）
     * @return 结构化路线数据Map对象，规划失败返回null
     */
    public Map<String, Object> planWalkingRoute(String origin, String destination);
    
    /**
     * 获取高德地图API Key
     * 从环境变量MAP_API_KEY中获取API Key
     * @return 高德地图API Key，如果环境变量未设置则返回null
     */
    public String getMapApiKey();
    
}
