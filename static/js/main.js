document.addEventListener('DOMContentLoaded', function() {
    const scanBtn = document.getElementById('scanBtn');
    const stopBtn = document.getElementById('stopBtn');
    const limitInput = document.getElementById('limitInput');
    const totalCount = document.getElementById('totalCount');
    const signalList = document.getElementById('signalList');
    const loading = document.getElementById('loading');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const chartTitle = document.getElementById('chartTitle');
    const mainChart = echarts.init(document.getElementById('mainChart'));

    let progressInterval = null;

    // 默认扫描
    scanSignals();

    scanBtn.addEventListener('click', scanSignals);
    stopBtn.addEventListener('click', stopScan);

    function scanSignals() {
        loading.classList.remove('d-none');
        scanBtn.classList.add('d-none');
        stopBtn.classList.remove('d-none');
        
        const buyList = document.getElementById('buyList');
        const sellList = document.getElementById('sellList');
        buyList.innerHTML = '';
        sellList.innerHTML = '';
        
        if (progressBar) progressBar.style.width = '0%';
        if (progressText) progressText.innerText = '正在获取列表...';

        const limit = limitInput.value || 100;
        
        // 开启进度轮询
        startProgressPolling();

        fetch(`/api/scan?limit=${limit}`)
            .then(response => {
                if (!response.ok) throw new Error('Scan failed');
                return response.json();
            })
            .then(data => {
                finishScanning();
                
                const buys = data.filter(item => item.type === 'buy');
                const sells = data.filter(item => item.type === 'sell');
                
                totalCount.innerText = `买入: ${buys.length} | 卖出: ${sells.length}`;
                
                renderList(buys, buyList);
                renderList(sells, sellList);
                
                // 默认加载第一个
                if (data.length > 0) {
                    loadChart(data[0].symbol, data[0].name);
                } else {
                    buyList.innerHTML = '<div class="alert alert-info mt-2">今日暂无信号</div>';
                }
            })
            .catch(err => {
                console.error(err);
                finishScanning();
            });
    }

    function startProgressPolling() {
        if (progressInterval) clearInterval(progressInterval);
        progressInterval = setInterval(() => {
            fetch('/api/scan_status')
                .then(res => res.json())
                .then(status => {
                    if (status.is_running) {
                        if (progressBar) progressBar.style.width = `${status.percent}%`;
                        if (progressText) progressText.innerText = `正在扫描: ${status.name} (${status.current}/${status.total})`;
                    } else {
                        clearInterval(progressInterval);
                    }
                });
        }, 800);
    }

    function stopScan() {
        fetch('/api/stop_scan', { method: 'POST' })
            .then(() => {
                stopBtn.innerText = '停止中...';
            });
    }

    function finishScanning() {
        if (progressInterval) clearInterval(progressInterval);
        loading.classList.add('d-none');
        scanBtn.classList.remove('d-none');
        stopBtn.classList.add('d-none');
        stopBtn.innerText = '停止';
    }

    function renderList(items, container) {
        if (items.length === 0) {
            container.innerHTML = '<div class="text-center text-muted mt-3">暂无信号</div>';
            return;
        }
        
        const listGroup = document.createElement('div');
        listGroup.className = 'list-group list-group-flush';
        
        items.forEach(item => {
            const btn = document.createElement('button');
            btn.className = 'list-group-item list-group-item-action flex-column align-items-start px-2';
            const tagClass = item.type === 'buy' ? 'signal-buy' : 'signal-sell';
            
            btn.innerHTML = `
                <div class="d-flex w-100 justify-content-between">
                    <h6 class="mb-1" style="font-size: 0.9rem;">${item.name}</h6>
                    <small style="font-size: 0.75rem;">${item.symbol}</small>
                </div>
                <p class="mb-1" style="font-size: 0.8rem;">价格: ${item.price} <span class="signal-tag ${tagClass}">${item.signal}</span></p>
            `;
            btn.onclick = () => loadChart(item.symbol, item.name);
            listGroup.appendChild(btn);
        });
        container.appendChild(listGroup);
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
