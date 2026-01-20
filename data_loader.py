import akshare as ak
import pandas as pd
from datetime import datetime, timedelta

def get_etf_list():
    """获取所有A股ETF基金列表 (从东财获取更全的数据)"""
    try:
        # 使用 fund_etf_spot_em 获取实时行情列表，包含了绝大多数 A 股 ETF
        etf_list = ak.fund_etf_spot_em()
        # 统一列名
        return etf_list[['代码', '名称']]
    except Exception as e:
        print(f"Error fetching ETF list from EM: {e}")
        try:
            # 备用方案：新浪
            etf_list = ak.fund_etf_category_sina(symbol="ETF基金")
            return etf_list[['代码', '名称']]
        except Exception as backup_e:
            print(f"Error fetching ETF list from Sina: {backup_e}")
            return pd.DataFrame()

def get_etf_hist(symbol, start_date=None, end_date=None):
    """获取指定ETF的历史日线数据"""
    if not start_date:
        start_date = (datetime.now() - timedelta(days=365)).strftime("%Y%m%d")
    if not end_date:
        end_date = datetime.now().strftime("%Y%m%d")
    
    try:
        # 使用 akshare 获取东财日线数据
        df = ak.fund_etf_hist_em(symbol=symbol, period="daily", start_date=start_date, end_date=end_date, adjust="hfq")
        if df is not None and not df.empty:
            df.columns = ['date', 'open', 'close', 'high', 'low', 'volume', 'amount', 'amplitude', 'pct_chg', 'change', 'turnover']
            df['date'] = pd.to_datetime(df['date'])
            df = df.sort_values('date')
            return df
        return pd.DataFrame()
    except Exception as e:
        print(f"Error fetching historical data for {symbol}: {e}")
        return pd.DataFrame()

if __name__ == "__main__":
    # 测试代码
    print("Fetching ETF list...")
    etfs = get_etf_list()
    print(etfs.head())
    
    if not etfs.empty:
        symbol = etfs.iloc[0]['代码']
        print(f"Fetching history for {symbol}...")
        hist = get_etf_hist(symbol)
        print(hist.head())
