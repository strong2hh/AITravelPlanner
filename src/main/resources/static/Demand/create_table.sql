-- 创建旅行需求表
CREATE TABLE IF NOT EXISTS travel_demands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 旅行需求信息
    destination TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    budget INTEGER,
    travelers INTEGER,
    preferences TEXT,
    special_requirements TEXT,
    
    -- 状态管理
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'processing', 'completed', 'cancelled')),
    
    -- 时间戳
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- 约束条件
    CONSTRAINT valid_budget CHECK (budget IS NULL OR budget > 0),
    CONSTRAINT valid_travelers CHECK (travelers IS NULL OR travelers > 0),
    CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_travel_demands_user_id ON travel_demands(user_id);
CREATE INDEX IF NOT EXISTS idx_travel_demands_status ON travel_demands(status);
CREATE INDEX IF NOT EXISTS idx_travel_demands_created_at ON travel_demands(created_at);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_travel_demands_updated_at 
    BEFORE UPDATE ON travel_demands 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 启用行级安全策略
ALTER TABLE travel_demands ENABLE ROW LEVEL SECURITY;

-- 创建安全策略：用户只能访问自己的数据
CREATE POLICY "用户只能访问自己的旅行需求" ON travel_demands
    FOR ALL USING (auth.uid() = user_id);

-- 允许匿名用户插入数据（用于注册前的草稿保存）
CREATE POLICY "允许匿名用户插入草稿" ON travel_demands
    FOR INSERT WITH CHECK (true);

-- 注释
COMMENT ON TABLE travel_demands IS '用户旅行需求表';
COMMENT ON COLUMN travel_demands.destination IS '旅行目的地';
COMMENT ON COLUMN travel_demands.start_date IS '起始日期';
COMMENT ON COLUMN travel_demands.end_date IS '截止日期';
COMMENT ON COLUMN travel_demands.budget IS '预算金额（元）';
COMMENT ON COLUMN travel_demands.travelers IS '同行人数';
COMMENT ON COLUMN travel_demands.preferences IS '旅行偏好';
COMMENT ON COLUMN travel_demands.special_requirements IS '特殊需求';
COMMENT ON COLUMN travel_demands.status IS '需求状态：draft-草稿, submitted-已提交, processing-处理中, completed-已完成, cancelled-已取消';

-- 测试数据（可选）
-- INSERT INTO travel_demands (user_id, destination, start_date, end_date, budget, travelers, preferences, status) 
-- VALUES (
--     '00000000-0000-0000-0000-000000000000', -- 替换为实际用户ID
--     '北京',
--     '2024-12-01',
--     '2024-12-07',
--     5000,
--     2,
--     '喜欢历史文化，美食体验',
--     'draft'
-- );