const axios = require('axios');

async function swapTokens() {
    const url = 'http://localhost:3001/send-tokens';
    // const url = 'http://localhost:3010/swap-tokens';
    
    // 构建请求数据
    const requestData = {
        tokenA: 'DAI',
        tokenB: 'USDC',
        amount: 1000, // 假设交换1000单位的tokenA
    };

    try {
        // 发送 POST 请求
        const response = await axios.post(url, requestData);

        // 打印响应结果
        console.log('Response:', response.data);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// 执行请求
swapTokens();
