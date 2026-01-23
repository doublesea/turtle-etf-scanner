import pandas as pd
import numpy as np

def calculate_atr(df, window=20):
    """计算 ATR (N值)"""
    high = df['high']
    low = df['low']
    close = df['close'].shift(1)
    
    tr = pd.concat([
        high - low,
        (high - close).abs(),
        (low - close).abs()
    ], axis=1).max(axis=1)
    
    df['atr'] = tr.rolling(window=window).mean()
    return df

def turtle_strategy(df, short_window=20, long_window=55, short_exit=10, long_exit=20):
    """
    海龟交易法则策略计算
    """
    if len(df) < long_window:
        return df

    # 计算 N 值 (ATR)
    df = calculate_atr(df)

    # 系统1: 短期策略 (20日突破)
    df['high_20'] = df['high'].shift(1).rolling(window=short_window).max()
    df['low_10'] = df['low'].shift(1).rolling(window=short_exit).min()
    
    # 系统2: 长期策略 (55日突破)
    df['high_55'] = df['high'].shift(1).rolling(window=long_window).max()
    df['low_20'] = df['low'].shift(1).rolling(window=long_exit).min()

    # 信号判断
    df['signal_short'] = 0
    df.loc[df['close'] > df['high_20'], 'signal_short'] = 1
    df.loc[df['close'] < df['low_10'], 'signal_short'] = -1

    df['signal_long'] = 0
    df.loc[df['close'] > df['high_55'], 'signal_long'] = 1
    df.loc[df['close'] < df['low_20'], 'signal_long'] = -1

    return df

def get_current_signals(etf_list, limit=20, check_stop_func=None, progress_callback=None):
    """
    扫描当前有突破信号(买入)和退出信号(卖出)的ETF
    """
    from data_loader import get_etf_hist
    results = []
    
    total_to_scan = min(len(etf_list), limit)
    
    # 为了演示，我们只扫描前 limit 个
    for i, (index, row) in enumerate(etf_list.head(limit).iterrows()):
        # 检查是否需要停止扫描
        if check_stop_func and check_stop_func():
            print("Scan stopped by user.")
            break
            
        symbol = row['代码']
        name = row['名称']
        
        # 更新进度
        if progress_callback:
            progress_callback(i + 1, name)
            
        df = get_etf_hist(symbol)
        if df.empty or len(df) < 60:
            continue
            
        df = turtle_strategy(df)
        last_row = df.iloc[-1]
        
        signal_name = "无"
        signal_type = "none"
        
        # 判断入场信号 (买入)
        if last_row['signal_long'] == 1:
            signal_name = "长期突破(55日)"
            signal_type = "buy"
        elif last_row['signal_short'] == 1:
            signal_name = "短期突破(20日)"
            signal_type = "buy"
        
        # 如果没有入场信号，判断离场信号 (卖出)
        if signal_type == "none":
            if last_row['signal_long'] == -1:
                signal_name = "长期离场(20日)"
                signal_type = "sell"
            elif last_row['signal_short'] == -1:
                signal_name = "短期离场(10日)"
                signal_type = "sell"
            
        if signal_type != "none":
            results.append({
                'symbol': symbol,
                'name': name,
                'price': last_row['close'],
                'atr': last_row['atr'],
                'signal': signal_name,
                'type': signal_type,
                'date': last_row['date'].strftime('%Y-%m-%d')
            })
            
    return results
