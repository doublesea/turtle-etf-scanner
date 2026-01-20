from flask import Flask, jsonify, render_template, request
from flask_cors import CORS
import data_loader
import strategy
import pandas as pd

app = Flask(__name__)
CORS(app)

# 用于控制扫描停止的全局变量
scanning_state = {
    "stop": False,
    "is_running": False
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/etf_list')
def get_etf_list():
    df = data_loader.get_etf_list()
    return jsonify(df.to_dict(orient='records'))

@app.route('/api/scan')
def scan_etfs():
    if scanning_state["is_running"]:
        return jsonify({"error": "Scan already in progress"}), 400
    
    limit = request.args.get('limit', default=50, type=int)
    etf_list = data_loader.get_etf_list()
    
    scanning_state["stop"] = False
    scanning_state["is_running"] = True
    
    try:
        # 定义一个检查停止信号的函数
        def check_stop():
            return scanning_state["stop"]
            
        signals = strategy.get_current_signals(etf_list, limit=limit, check_stop_func=check_stop)
    finally:
        scanning_state["is_running"] = False
        
    return jsonify(signals)

@app.route('/api/stop_scan', methods=['POST'])
def stop_scan():
    scanning_state["stop"] = True
    return jsonify({"status": "Stopping..."})

@app.route('/api/etf_detail/<symbol>')
def get_etf_detail(symbol):
    df = data_loader.get_etf_hist(symbol)
    if df.empty:
        return jsonify({"error": "No data found"}), 404
    
    df = strategy.turtle_strategy(df)
    
    # 格式化数据给 ECharts
    # [date, open, close, low, high, atr, high20, low10, high55, low20]
    chart_data = []
    for _, row in df.iterrows():
        chart_data.append([
            row['date'].strftime('%Y-%m-%d'),
            row['open'],
            row['close'],
            row['low'],
            row['high'],
            round(row['atr'], 4) if not pd.isna(row['atr']) else None,
            round(row['high_20'], 4) if not pd.isna(row['high_20']) else None,
            round(row['low_10'], 4) if not pd.isna(row['low_10']) else None,
            round(row['high_55'], 4) if not pd.isna(row['high_55']) else None,
            round(row['low_20'], 4) if not pd.isna(row['low_20']) else None,
        ])
    
    return jsonify({
        "symbol": symbol,
        "data": chart_data
    })

if __name__ == '__main__':
    app.run(debug=False, port=5000)
