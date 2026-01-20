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

def get_current_signals(etf_list, limit=20):
    """
    扫描当前有突破信号的ETF
    """
    from data_loader import get_etf_hist
    results = []
    
    # 为了演示，我们只扫描前 limit 个
    for index, row in etf_list.head(limit).iterrows():
        symbol = row['代码']
        name = row['名称']
        print(f"Scanning {symbol} {name}...")
        
        df = get_etf_hist(symbol)
        if df.empty or len(df) < 60:
            continue
            
        df = turtle_strategy(df)
        last_row = df.iloc[-1]
        
        signal = "无"
        if last_row['signal_long'] == 1:
            signal = "长期突破(55日)"
        elif last_row['signal_short'] == 1:
            signal = "短期突破(20日)"
        elif last_row['signal_long'] == -1:
            signal = "长期跌破(20日)"
        elif last_row['signal_short'] == -1:
            signal = "短期跌破(10日)"
            
        if signal != "无":
            results.append({
                'symbol': symbol,
                'name': name,
                'price': last_row['close'],
                'atr': last_row['atr'],
                'signal': signal,
                'date': last_row['date'].strftime('%Y-%m-%d')
            })
            
    return results
