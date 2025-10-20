import rateLimit from 'express-rate-limit';

// 速率限制中间件
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP每15分钟100次请求
  message: '请求过于频繁，请稍后再试'
});

// 请求验证函数
const validateRequest = (body) => {
  const { content } = body;
  
  if (!content || typeof content !== 'string') {
    throw new Error('缺少内容或内容格式不正确');
  }
  
  if (content.length > 5000) {
    throw new Error('内容过长，最多5000字符');
  }
};

// API处理函数
export default async function handler(req, res) {
  try {
    // 应用速率限制
    await new Promise((resolve, reject) => {
      apiLimiter(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // 只接受POST请求
    if (req.method !== 'POST') {
      return res.status(405).json({ error: '只支持POST请求' });
    }
    
    // 验证请求体
    validateRequest(req.body);
    
    // 记录请求日志
    console.log(`[API] 请求来自 ${req.ip}，内容长度: ${req.body.content.length}`);
    
    // 处理请求
    const result = await processContent(req.body.content);
    
    // 返回结果
    res.status(200).json({ result });
  } catch (error) {
    console.error('处理请求时出错:', error);
    res.status(400).json({ error: error.message });
  }
}

// 示例处理函数
async function processContent(content) {
  // 这里添加实际的内容处理逻辑
  return `分析结果: ${content.length}个字符`;
}
