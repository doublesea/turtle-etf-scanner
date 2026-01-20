document.addEventListener('DOMContentLoaded', function() {
    const scanBtn = document.getElementById('scanBtn');
    const signalList = document.getElementById('signalList');
    const loading = document.getElementById('loading');
    const chartTitle = document.getElementById('chartTitle');
    const mainChart = echarts.init(document.getElementById('mainChart'));

    // 默认扫描
    scanSignals();

    scanBtn.addEventListener('click', scanSignals);

    function scanSignals() {
        loading.classList.remove('d-none');
        signalList.innerHTML = '';
        
        fetch('/api/scan?limit=100')
            .then(response => response.json())
            .then(data => {
                loading.classList.add('d-none');
                if (data.length === 0) {
                    signalList.innerHTML = '<div class="alert alert-info">今日暂无突破信号</div>';
                    return;
                }
                
                data.forEach(item => {
                    const btn = document.createElement('button');
                    btn.className = 'list-group-item list-group-item-action flex-column align-items-start';
                    const isBuy = item.signal.includes('突破');
                    const tagClass = isBuy ? 'signal-buy' : 'signal-sell';
                    
                    btn.innerHTML = `
                        <div class="d-flex w-100 justify-content-between">
                            <h6 class="mb-1">${item.name}</h6>
                            <small>${item.symbol}</small>
                        </div>
                        <p class="mb-1">价格: ${item.price} <span class="signal-tag ${tagClass}">${item.signal}</span></p>
                    `;
                    btn.onclick = () => loadChart(item.symbol, item.name);
                    signalList.appendChild(btn);
                });
                
                // 默认加载第一个
                if (data.length > 0) {
                    loadChart(data[0].symbol, data[0].name);
                }
            });
    }

    function loadChart(symbol, name) {
        chartTitle.innerText = `${name} (${symbol}) - 海龟交易法则分析`;
        
        fetch(`/api/etf_detail/${symbol}`)
            .then(response => response.json())
            .then(res => {
                renderChart(res.data);
            });
    }

    function renderChart(rawData) {
        const dates = rawData.map(item => item[0]);
        const data = rawData.map(item => [item[1], item[2], item[3], item[4]]); // open, close, low, high
        const atr = rawData.map(item => item[5]);
        const high20 = rawData.map(item => item[6]);
        const low10 = rawData.map(item => item[7]);
        const high55 = rawData.map(item => item[8]);
        const low20 = rawData.map(item => item[9]);

        const option = {
            title: { text: '日线 K 线图', left: 0 },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'cross' }
            },
            legend: {
                data: ['日K', '20日高', '10日低', '55日高', '20日低', 'ATR'],
                top: 10
            },
            grid: [
                { left: '10%', right: '10%', height: '60%' },
                { left: '10%', right: '10%', top: '75%', height: '15%' }
            ],
            xAxis: [
                { type: 'category', data: dates, boundaryGap: false, axisLine: { onZero: false }, splitLine: { show: false }, min: 'dataMin', max: 'dataMax' },
                { type: 'category', gridIndex: 1, data: dates, boundaryGap: false, axisLine: { onZero: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false }, min: 'dataMin', max: 'dataMax' }
            ],
            yAxis: [
                { scale: true, splitArea: { show: true } },
                { scale: true, gridIndex: 1, splitNumber: 2, axisLabel: { show: true }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: false } }
            ],
            dataZoom: [
                { type: 'inside', xAxisIndex: [0, 1], start: 50, end: 100 },
                { show: true, xAxisIndex: [0, 1], type: 'slider', top: '92%', start: 50, end: 100 }
            ],
            series: [
                {
                    name: '日K',
                    type: 'candlestick',
                    data: data,
                    itemStyle: { color: '#ef232a', color0: '#14b143', borderColor: '#ef232a', borderColor0: '#14b143' }
                },
                { name: '20日高', type: 'line', data: high20, smooth: true, lineStyle: { opacity: 0.5, color: '#ff4d4f' } },
                { name: '10日低', type: 'line', data: low10, smooth: true, lineStyle: { opacity: 0.5, color: '#52c41a' } },
                { name: '55日高', type: 'line', data: high55, smooth: true, lineStyle: { opacity: 0.8, color: '#722ed1', width: 2 } },
                { name: '20日低', type: 'line', data: low20, smooth: true, lineStyle: { opacity: 0.8, color: '#fa8c16', width: 2 } },
                { name: 'ATR', type: 'line', xAxisIndex: 1, yAxisIndex: 1, data: atr, lineStyle: { color: '#1890ff' } }
            ]
        };

        mainChart.setOption(option);
    }
});
