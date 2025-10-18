// 設定ファイル
// Google Apps Script Web APIのURLを設定してください
// 例: https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec

var CONFIG = {
    // Google Apps Script Web APIのURL
    GAS_API_URL: 'https://script.google.com/macros/s/AKfycbzrw_oTZ3disPUWp35ALnhWoy_aL383zSW_HIbseTBFGYYxRQEw7wXCpuvbI0_po0BS/exec', // ここにGoogle Apps Script Web APIのURLを入力してください
    
    // デフォルト設定（Google Apps Scriptに接続できない場合に使用）
    DEFAULT_CONFIG: {
        startHour: 10,
        endHour: 19,
        daysToShow: 90
    },
    
    // デフォルトメニュー（Google Apps Scriptに接続できない場合に使用）
    DEFAULT_MENU_ITEMS: [
        { name: 'ハンドケア', duration: 60, price: 5000 },
        { name: 'ジェルネイル', duration: 90, price: 8000 },
        { name: 'スカルプチュア', duration: 120, price: 12000 }
    ]
};

// 設定をグローバル変数に適用
var GAS_API_URL = CONFIG.GAS_API_URL;

// 設定が正しく読み込まれているかチェック
if (typeof console !== 'undefined' && console.log) {
    console.log('Config loaded. GAS_API_URL:', GAS_API_URL);
    console.log('CONFIG object:', CONFIG);
}
