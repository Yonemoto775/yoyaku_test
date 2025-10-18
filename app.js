// グローバル変数
var calendar;
var selectedStartTime;
var busySlots = []; 
var appConfig = {};

// GAS_API_URLが設定されていない場合は空文字列を設定
if (typeof GAS_API_URL === 'undefined') {
    var GAS_API_URL = '';
}

// 設定の読み込み状況をデバッグ
if (typeof console !== 'undefined' && console.log) {
    console.log('App.js loaded. GAS_API_URL:', GAS_API_URL);
    console.log('GAS_API_URL type:', typeof GAS_API_URL);
}


// パフォーマンス最適化のための遅延読み込み
function initializeApp() {
    var calendarEl = document.getElementById('calendar');
    
    // 設定の読み込み状況をデバッグ
    if (typeof console !== 'undefined' && console.log) {
        console.log('GAS_API_URL value:', GAS_API_URL);
        console.log('GAS_API_URL type:', typeof GAS_API_URL);
    }
    
    // Google Apps Script Web APIの利用可能性をチェック
    if (!GAS_API_URL || GAS_API_URL === '' || GAS_API_URL === 'undefined') {
        if (typeof console !== 'undefined' && console.warn) {
            console.warn('Google Apps Script Web API URL not configured, using fallback data');
        }
        showConnectionStatus('Google Apps Script Web APIのURLが設定されていません。デフォルトメニューで動作します。', 'warning', 'config.jsファイルのGAS_API_URLが設定されていません');
        // ヘルプ情報を表示する
        var helpInfo = document.getElementById('helpInfo');
        if (helpInfo) {
            helpInfo.style.display = 'block';
        }
        initializeWithFallbackData(calendarEl);
        return;
    }
    
    // 設定が正しく読み込まれている場合
    if (typeof console !== 'undefined' && console.log) {
        console.log('GAS_API_URL is configured:', GAS_API_URL);
    }
    
    // 最初にアプリの初期データ（設定＋メニュー）を取得
    fetchInitialData(calendarEl);
}

// Google Apps Script Web APIから初期データを取得
function fetchInitialData(calendarEl) {
    var url = GAS_API_URL + '?action=getInitialData';
    
    if (typeof console !== 'undefined' && console.log) {
        console.log('Fetching data from:', url);
    }
    
    fetch(url)
        .then(function(response) {
            if (typeof console !== 'undefined' && console.log) {
                console.log('Response status:', response.status);
                console.log('Response headers:', response.headers);
            }
            
            if (!response.ok) {
                throw new Error('HTTP ' + response.status + ': ' + response.statusText);
            }
            return response.json();
        })
        .then(function(data) {
            if (typeof console !== 'undefined' && console.log) {
                console.log('Received data:', data);
            }
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            // 1. アプリ設定をグローバル変数に保存
            appConfig = data.config;
            
            // 2. コース選択のプルダウンを生成
            populateCourseSelect(data.menuItems);

            // 3. カレンダーを初期化
            initializeCalendar(calendarEl);
            
            // 接続成功を表示
            showConnectionStatus('Google Apps Script Web APIに正常に接続しました。', 'success');
            
            // ヘルプ情報は表示したままにする（デバッグ用）
            var helpInfo = document.getElementById('helpInfo');
            if (helpInfo) {
                helpInfo.style.display = 'block';
            }
        })
        .catch(function(error) {
            var errorMessage = 'Google Apps Script Web APIに接続できません。デフォルトメニューで動作します。';
            var errorDetails = error.message || error.toString();
            
            if (typeof console !== 'undefined' && console.error) {
                console.error('Failed to fetch initial data:', error);
            }
            
            showConnectionStatus(errorMessage, 'warning', errorDetails);
            
            // ヘルプ情報を表示する
            var helpInfo = document.getElementById('helpInfo');
            if (helpInfo) {
                helpInfo.style.display = 'block';
            }
            // エラー時もフォールバックデータで初期化
            initializeWithFallbackData(calendarEl);
        });
}

// フォールバック用の初期化関数
function initializeWithFallbackData(calendarEl) {
    // デフォルト設定
    appConfig = {
        startHour: 10,
        endHour: 19,
        daysToShow: 90
    };
    
    // デフォルトメニュー
    var defaultMenuItems = [
        { name: 'ハンドケア', duration: 60, price: 5000 },
        { name: 'ジェルネイル', duration: 90, price: 8000 },
        { name: 'スカルプチュア', duration: 120, price: 12000 }
    ];
    
    // 接続状況を表示
    showConnectionStatus('Google Apps Scriptに接続できません。デフォルトメニューで動作します。', 'warning');
    
    // ヘルプ情報を表示する
    var helpInfo = document.getElementById('helpInfo');
    if (helpInfo) {
        helpInfo.style.display = 'block';
    }
    
    // コース選択のプルダウンを生成
    populateCourseSelect(defaultMenuItems);
    
    // カレンダーを初期化（予約データは空で）
    initializeCalendar(calendarEl);
}

// 接続状況表示関数
function showConnectionStatus(message, type, errorDetails) {
    var statusDiv = document.getElementById('connectionStatus');
    var statusText = document.getElementById('statusText');
    var configUrl = document.getElementById('configUrl');
    var errorDetailsSpan = document.getElementById('errorDetails');
    
    if (statusDiv && statusText) {
        statusDiv.style.display = 'block';
        statusText.textContent = message;
        
        // 設定URLを表示
        if (configUrl) {
            configUrl.textContent = GAS_API_URL || '未設定';
            if (typeof console !== 'undefined' && console.log) {
                console.log('Setting configUrl to:', GAS_API_URL || '未設定');
            }
        }
        
        // エラー詳細を表示
        if (errorDetailsSpan && errorDetails) {
            errorDetailsSpan.textContent = errorDetails;
        }
        
        // タイプに応じてスタイルを変更
        if (type === 'success') {
            statusDiv.style.backgroundColor = '#d4edda';
            statusDiv.style.borderColor = '#c3e6cb';
            statusDiv.style.color = '#155724';
        } else if (type === 'warning') {
            statusDiv.style.backgroundColor = '#fff3cd';
            statusDiv.style.borderColor = '#ffeaa7';
            statusDiv.style.color = '#856404';
        } else if (type === 'error') {
            statusDiv.style.backgroundColor = '#f8d7da';
            statusDiv.style.borderColor = '#f5c6cb';
            statusDiv.style.color = '#721c24';
        }
    }
}

/**
 * サーバーから取得したメニュー項目でコース選択プルダウンを生成する
 * @param {Array} menuItems - メニュー項目の配列
 */
function populateCourseSelect(menuItems) {
    var courseSelect = document.getElementById('courseSelect');
    if (!courseSelect) {
        if (typeof console !== 'undefined' && console.error) {
            console.error('Course select element not found');
        }
        return;
    }
    
    courseSelect.innerHTML = '';

    if (!menuItems || menuItems.length === 0) {
        courseSelect.innerHTML = '<option value="">コースがありません</option>';
        courseSelect.disabled = true;
        return;
    }

    // 元のコードで90分が選択されていたのを参考に、90分のコースをデフォルトで選択する
    var defaultSelectedIndex = -1;
    for (var i = 0; i < menuItems.length; i++) {
        if (menuItems[i].duration == 90) {
            defaultSelectedIndex = i;
            break;
        }
    }
    if (defaultSelectedIndex === -1) defaultSelectedIndex = 0;

    for (var i = 0; i < menuItems.length; i++) {
        var item = menuItems[i];
        var option = document.createElement('option');
        option.value = item.duration;
        option.setAttribute('data-price', item.price);
        option.setAttribute('data-name', item.name);
        option.textContent = item.name + ' (' + item.duration + '分)';
        if (i === defaultSelectedIndex) option.selected = true;
        courseSelect.appendChild(option);
    }

    // 長さ出しの本数選択プルダウンを生成
    var lengthExtensionCountSelect = document.getElementById('lengthExtensionCount');
    if (lengthExtensionCountSelect) {
        for (var i = 1; i <= 10; i++) {
            var option = document.createElement('option');
            option.value = i;
            var text = i + '本';
            if (i >= 4) {
                text += ' (+3,500円)';
            }
            option.textContent = text;
            lengthExtensionCountSelect.appendChild(option);
        }
    }

    // 長さ出しチェックボックスのイベントリスナー
    var lengthExtensionCheck = document.getElementById('lengthExtensionCheck');
    if (lengthExtensionCheck) {
        if (lengthExtensionCheck.addEventListener) {
            lengthExtensionCheck.addEventListener('change', function() {
                var lengthExtensionOptions = document.getElementById('lengthExtensionOptions');
                if (lengthExtensionOptions) {
                    lengthExtensionOptions.style.display = lengthExtensionCheck.checked ? 'block' : 'none';
                }
            });
        } else if (lengthExtensionCheck.attachEvent) {
            lengthExtensionCheck.attachEvent('onchange', function() {
                var lengthExtensionOptions = document.getElementById('lengthExtensionOptions');
                if (lengthExtensionOptions) {
                    lengthExtensionOptions.style.display = lengthExtensionCheck.checked ? 'block' : 'none';
                }
            });
        }
    }
}

function initializeCalendar(calendarEl) {
    // Google Apps Scriptから取得した設定値を利用
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'ja',
        validRange: {
            start: new Date()
        },
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridDay'
        },
        buttonText: { today: '今日', month: '月', week: '週', day: '日' },
        allDaySlot: false,
        slotMinTime: `${appConfig.startHour}:00:00`,
        slotMaxTime: `${appConfig.endHour}:00:00`,
        events: function(fetchInfo, successCallback, failureCallback) {
            // Google Apps Script Web APIが利用可能かチェック
            if (GAS_API_URL) {
                fetchBusySlots(successCallback, failureCallback);
            } else {
                // Google Apps Script Web APIが利用できない場合は空の配列を返す
                busySlots = [];
                successCallback([]);
            }
        },
        eventDisplay: 'background',
        eventColor: '#e9ecef',
        dateClick: function(info) {
            if (info.view.type.includes('dayGrid')) {
                calculateAndShowAvailableTimes(info.date);
            } else {
                calculateAndShowAvailableTimes(info.date);
            }
        }
    });
    calendar.render();
}

function calculateAndShowAvailableTimes(selectedDate) {
    var courseSelect = document.getElementById('courseSelect');
    if (!courseSelect) {
        if (typeof console !== 'undefined' && console.error) {
            console.error('Course select element not found');
        }
        return;
    }
    
    var duration = parseInt(courseSelect.value, 10);
    var nailOffCheck = document.getElementById('nailOffCheck');
    if (nailOffCheck && nailOffCheck.checked) {
        duration += 30;
    }
    
    var lengthExtensionCheck = document.getElementById('lengthExtensionCheck');
    if (lengthExtensionCheck && lengthExtensionCheck.checked) {
        var lengthExtensionCount = document.getElementById('lengthExtensionCount');
        if (lengthExtensionCount) {
            var count = parseInt(lengthExtensionCount.value, 10);
            if (count >= 1 && count <= 3) {
                duration += count * 5;
            } else if (count >= 4 && count <= 10) {
                duration += 30;
            }
        }
    }

    var timeSlotsContainer = document.getElementById('timeSlotsContainer');
    if (!timeSlotsContainer) {
        if (typeof console !== 'undefined' && console.error) {
            console.error('Time slots container not found');
        }
        return;
    }
    
    timeSlotsContainer.innerHTML = '';
    
    var availableTimes = [];
    var interval = 15;

    var dayStart = new Date(selectedDate);
    dayStart.setHours(appConfig.startHour || 10, 0, 0, 0);

    var dayEnd = new Date(selectedDate);
    dayEnd.setHours(appConfig.endHour || 19, 0, 0, 0);

    for (var time = dayStart.getTime(); time < dayEnd.getTime(); time += interval * 60 * 1000) {
        var potentialStart = new Date(time);
        var potentialEnd = new Date(potentialStart.getTime() + duration * 60 * 1000);

        if (potentialEnd > dayEnd) continue;

        var isOverlapping = false;
        for (var i = 0; i < busySlots.length; i++) {
            var slot = busySlots[i];
            if (potentialStart < slot.end && potentialEnd > slot.start) {
                isOverlapping = true;
                break;
            }
        }

        if (!isOverlapping) {
            availableTimes.push(potentialStart);
        }
    }

    if (availableTimes.length === 0) {
        timeSlotsContainer.innerHTML = '<p class="no-slots">この日は空き時間がありません。</p>';
    } else {
        for (var i = 0; i < availableTimes.length; i++) {
            var time = availableTimes[i];
            var button = document.createElement('button');
            var timeString = time.getHours().toString().padStart(2, '0') + ':' + 
                           time.getMinutes().toString().padStart(2, '0');
            button.textContent = timeString;
            button.className = 'time-slot-btn';
            if (button.addEventListener) {
                button.addEventListener('click', function(selectedTime) {
                    return function() {
                        selectedStartTime = selectedTime;
                        hideTimeSlotsModal();
                        showReservationModal();
                    };
                }(time));
            } else if (button.attachEvent) {
                button.attachEvent('onclick', function(selectedTime) {
                    return function() {
                        selectedStartTime = selectedTime;
                        hideTimeSlotsModal();
                        showReservationModal();
                    };
                }(time));
            }
            timeSlotsContainer.appendChild(button);
        }
    }

    var timeSlotsModal = document.getElementById('timeSlotsModal');
    var timeSlotsTitle = document.getElementById('timeSlotsTitle');
    if (timeSlotsModal && timeSlotsTitle) {
        var dateString = selectedDate.getFullYear() + '/' + 
                        (selectedDate.getMonth() + 1).toString().padStart(2, '0') + '/' + 
                        selectedDate.getDate().toString().padStart(2, '0') + 
                        ' (' + ['日', '月', '火', '水', '木', '金', '土'][selectedDate.getDay()] + ')';
        timeSlotsTitle.textContent = dateString;
        timeSlotsModal.style.display = 'flex';
    }
}

function showReservationModal() {
    var reservationModal = document.getElementById('reservationModal');
    if (!reservationModal) {
        if (typeof console !== 'undefined' && console.error) {
            console.error('Reservation modal not found');
        }
        return;
    }
    
    var selectedTimeElement = document.getElementById('selectedTime');
    if (selectedTimeElement && selectedStartTime) {
        var timeString = selectedStartTime.getFullYear() + '/' + 
                        (selectedStartTime.getMonth() + 1).toString().padStart(2, '0') + '/' + 
                        selectedStartTime.getDate().toString().padStart(2, '0') + ' ' +
                        selectedStartTime.getHours().toString().padStart(2, '0') + ':' + 
                        selectedStartTime.getMinutes().toString().padStart(2, '0');
        selectedTimeElement.value = timeString;
    }

    var courseSelect = document.getElementById('courseSelect');
    var selectedOption = courseSelect ? courseSelect.options[courseSelect.selectedIndex] : null;
    if (!selectedOption) {
        if (typeof console !== 'undefined' && console.error) {
            console.error('No course selected');
        }
        return;
    }
    
    var isNailOff = document.getElementById('nailOffCheck') ? document.getElementById('nailOffCheck').checked : false;
    var isLengthExtension = document.getElementById('lengthExtensionCheck') ? document.getElementById('lengthExtensionCheck').checked : false;

    var totalDuration = parseInt(selectedOption.value, 10);
    if (isNailOff) totalDuration += 30;

    var lengthExtensionCount = 0;
    var lengthExtensionPrice = 0;
    if (isLengthExtension) {
        var lengthExtensionCountElement = document.getElementById('lengthExtensionCount');
        if (lengthExtensionCountElement) {
            lengthExtensionCount = parseInt(lengthExtensionCountElement.value, 10);
            if (lengthExtensionCount >= 4) lengthExtensionPrice = 3500;
            if (lengthExtensionCount >= 1 && lengthExtensionCount <= 3) totalDuration += lengthExtensionCount * 5;
            else if (lengthExtensionCount >= 4) totalDuration += 30;
        }
    }

    var basePrice = parseInt(selectedOption.getAttribute('data-price'), 10);
    
    var staffAssignmentRadios = document.querySelectorAll('input[name="staff_assignment"]');
    var isStaffAssignment = false;
    for (var i = 0; i < staffAssignmentRadios.length; i++) {
        if (staffAssignmentRadios[i].checked) {
            isStaffAssignment = staffAssignmentRadios[i].value === '指名あり';
            break;
        }
    }
    var staffAssignmentPrice = isStaffAssignment ? 400 : 0;
    
    var totalPrice = basePrice + lengthExtensionPrice + staffAssignmentPrice;

    var summaryHtml = '<strong>コース:</strong> ' + selectedOption.getAttribute('data-name') + '<br>';
    summaryHtml += '<strong>基本価格:</strong> ' + basePrice.toLocaleString() + '円<br>';
    
    var optionsHtml = '';
    if (isNailOff) optionsHtml += 'ジェルオフ<br>';
    if (lengthExtensionCount > 0) {
        optionsHtml += '長さ出し ' + lengthExtensionCount + '本';
        if (lengthExtensionPrice > 0) optionsHtml += ' (+' + lengthExtensionPrice.toLocaleString() + '円)';
        optionsHtml += '<br>';
    }
    if (isStaffAssignment) {
        optionsHtml += '担当者指名';
        if (staffAssignmentPrice > 0) optionsHtml += ' (+' + staffAssignmentPrice.toLocaleString() + '円)';
        optionsHtml += '<br>';
    }
    if (optionsHtml) summaryHtml += '<strong>オプション:</strong><br><div style="padding-left:1em;">' + optionsHtml + '</div>';
    summaryHtml += '<strong>合計時間:</strong> ' + totalDuration + '分<br>';
    summaryHtml += '<strong>合計金額:</strong> ' + totalPrice.toLocaleString() + '円';
    
    var reservationSummary = document.getElementById('reservationSummary');
    if (reservationSummary) {
        reservationSummary.innerHTML = summaryHtml;
    }

    reservationModal.style.display = 'flex';
}

function hideReservationModal() { 
    var reservationModal = document.getElementById('reservationModal');
    if (reservationModal) {
        reservationModal.style.display = 'none';
    }
}

function hideTimeSlotsModal() {
    var timeSlotsModal = document.getElementById('timeSlotsModal');
    if (timeSlotsModal) {
        timeSlotsModal.style.display = 'none';
    }
}

function sendReservationDataToServer(reservationData) {
    var submitButton = document.getElementById('submitButton');
    submitButton.disabled = true;
    submitButton.textContent = '処理中...';

    // Google Apps Script Web APIが利用可能かチェック
    if (GAS_API_URL) {
        fetchCreateReservation(reservationData, submitButton);
    } else {
        // Google Apps Script Web APIが利用できない場合
        alert('予約システムに接続できません。Google Apps Scriptの設定を確認してください。');
        submitButton.disabled = false;
        submitButton.textContent = '予約を確定する';
    }
}

// Google Apps Script Web APIから予約済み時間を取得
function fetchBusySlots(successCallback, failureCallback) {
    var url = GAS_API_URL + '?action=getBusySlots';
    
    fetch(url)
        .then(function(response) {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(function(slots) {
            if (slots.error) {
                throw new Error(slots.error);
            }
            
            if (slots && Array.isArray(slots)) {
                busySlots = slots.map(function(slot) {
                    return {
                        start: new Date(slot.start),
                        end: new Date(slot.end)
                    };
                });
            } else {
                busySlots = [];
            }
            successCallback(busySlots);
        })
        .catch(function(error) {
            if (typeof console !== 'undefined' && console.error) {
                console.error('Failed to fetch busy slots:', error);
            }
            busySlots = [];
            successCallback([]);
        });
}

// Google Apps Script Web APIに予約データを送信
function fetchCreateReservation(reservationData, submitButton) {
    var url = GAS_API_URL;
    
    if (typeof console !== 'undefined' && console.log) {
        console.log('Sending reservation data to:', url);
        console.log('Reservation data:', reservationData);
    }
    
    // fetch APIが利用可能かチェック
    if (typeof fetch === 'undefined') {
        alert('このブラウザでは予約機能が利用できません。最新のブラウザをご利用ください。');
        submitButton.disabled = false;
        submitButton.textContent = '予約を確定する';
        return;
    }
    
    fetch(url, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(reservationData)
    })
    .then(function(response) {
        if (typeof console !== 'undefined' && console.log) {
            console.log('Reservation response status:', response.status);
            console.log('Reservation response statusText:', response.statusText);
            console.log('Reservation response headers:', response.headers);
        }
        
        if (!response.ok) {
            throw new Error('HTTP ' + response.status + ': ' + response.statusText);
        }
        return response.text(); // まずテキストとして取得
    })
    .then(function(text) {
        if (typeof console !== 'undefined' && console.log) {
            console.log('Reservation response text:', text);
        }
        
        try {
            var result = JSON.parse(text);
            alert(result.message);
            if (result.success) {
                hideReservationModal();
                resetForm();
                if (calendar && calendar.refetchEvents) {
                    calendar.refetchEvents();
                }
            }
            submitButton.disabled = false;
            submitButton.textContent = '予約を確定する';
        } catch (parseError) {
            throw new Error('JSON解析エラー: ' + parseError.message + '\nレスポンス: ' + text.substring(0, 200));
        }
    })
    .catch(function(error) {
        if (typeof console !== 'undefined' && console.error) {
            console.error('Failed to create reservation:', error);
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
        }
        
        var errorMessage = 'エラーが発生しました';
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            errorMessage = 'ネットワークエラーまたはCORSエラーです。Google Apps Scriptの設定を確認してください。';
        } else if (error.message) {
            errorMessage += ': ' + error.message;
        }
        
        alert(errorMessage);
        submitButton.disabled = false;
        submitButton.textContent = '予約を確定する';
    });
}

// 直接アクセステスト関数
function testDirectAccess() {
    if (typeof console !== 'undefined' && console.log) {
        console.log('testDirectAccess called');
        console.log('GAS_API_URL:', GAS_API_URL);
    }
    
    if (!GAS_API_URL || GAS_API_URL === '' || GAS_API_URL === 'undefined') {
        alert('Google Apps Script Web APIのURLが設定されていません。');
        return;
    }
    
    var testUrl = GAS_API_URL + '?action=getInitialData';
    if (typeof console !== 'undefined' && console.log) {
        console.log('Opening URL:', testUrl);
    }
    
    // 新しいタブで直接アクセス
    try {
        window.open(testUrl, '_blank');
        if (typeof console !== 'undefined' && console.log) {
            console.log('Window.open executed successfully');
        }
    } catch (error) {
        if (typeof console !== 'undefined' && console.error) {
            console.error('Error opening window:', error);
        }
        alert('新しいタブを開けませんでした: ' + error.message);
    }
}

// 予約テスト関数
function testReservation() {
    if (typeof console !== 'undefined' && console.log) {
        console.log('testReservation called');
        console.log('GAS_API_URL:', GAS_API_URL);
    }
    
    if (!GAS_API_URL || GAS_API_URL === '' || GAS_API_URL === 'undefined') {
        alert('Google Apps Script Web APIのURLが設定されていません。');
        return;
    }
    
    // テスト用の予約データ
    var testReservationData = {
        name: 'テスト太郎',
        phone: '090-1234-5678',
        email: 'test@example.com',
        startTime: new Date().toISOString(),
        courseDuration: 90,
        courseNameOnly: 'ジェルネイル',
        coursePrice: 8000,
        menuType: 'ジェルネイル',
        visitStatus: '初回',
        isNailOff: false,
        lengthExtensionCount: 0,
        lengthExtensionPrice: 0,
        isStaffAssignment: false,
        selectedStaff: '',
        staffAssignmentPrice: 0,
        imageFile: null
    };
    
    if (typeof console !== 'undefined' && console.log) {
        console.log('Test reservation data:', testReservationData);
    }
    
    // テスト用のボタン要素を作成
    var testButton = document.createElement('button');
    testButton.textContent = 'テスト中...';
    testButton.disabled = true;
    
    // fetchCreateReservation関数を使用してテスト
    fetchCreateReservation(testReservationData, testButton);
}

// 予約テスト関数
function testReservation() {
    if (!GAS_API_URL || GAS_API_URL === '' || GAS_API_URL === 'undefined') {
        alert('Google Apps Script Web APIのURLが設定されていません。');
        return;
    }
    
    var testData = {
        name: 'テストユーザー',
        email: 'test@example.com',
        phone: '090-1234-5678',
        startTime: new Date().toISOString(),
        courseDuration: 60,
        courseNameOnly: 'テストコース',
        coursePrice: 5000,
        menuType: 'HAND',
        visitStatus: '初回',
        isNailOff: false,
        lengthExtensionCount: 0,
        lengthExtensionPrice: 0,
        isStaffAssignment: false,
        selectedStaff: '',
        staffAssignmentPrice: 0
    };
    
    if (typeof console !== 'undefined' && console.log) {
        console.log('Testing reservation with data:', testData);
    }
    
    fetchCreateReservation(testData, { disabled: false, textContent: 'テスト中...' });
}

// 接続テスト関数
function testConnection() {
    if (typeof console !== 'undefined' && console.log) {
        console.log('testConnection called');
        console.log('GAS_API_URL:', GAS_API_URL);
    }
    
    if (!GAS_API_URL || GAS_API_URL === '' || GAS_API_URL === 'undefined') {
        alert('Google Apps Script Web APIのURLが設定されていません。config.jsファイルを確認してください。\n現在の値: ' + GAS_API_URL);
        return;
    }
    
    var testUrl = GAS_API_URL + '?action=getInitialData';
    showConnectionStatus('接続テスト中...', 'warning', '');
    
    if (typeof console !== 'undefined' && console.log) {
        console.log('Testing connection to:', testUrl);
    }
    
    // fetch APIが利用可能かチェック
    if (typeof fetch === 'undefined') {
        showConnectionStatus('接続テスト失敗', 'error', 'fetch APIが利用できません。ブラウザが古すぎる可能性があります。');
        return;
    }
    
    fetch(testUrl, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
            'Content-Type': 'application/json',
        }
    })
        .then(function(response) {
            if (typeof console !== 'undefined' && console.log) {
                console.log('Test response status:', response.status);
                console.log('Test response statusText:', response.statusText);
                console.log('Test response headers:', response.headers);
                console.log('Test response type:', response.type);
            }
            
            if (!response.ok) {
                throw new Error('HTTP ' + response.status + ': ' + response.statusText);
            }
            return response.text(); // まずテキストとして取得
        })
        .then(function(text) {
            if (typeof console !== 'undefined' && console.log) {
                console.log('Test response text:', text);
            }
            
            try {
                var data = JSON.parse(text);
                if (data.error) {
                    throw new Error(data.error);
                }
                showConnectionStatus('接続テスト成功！', 'success', '');
            } catch (parseError) {
                throw new Error('JSON解析エラー: ' + parseError.message + '\nレスポンス: ' + text.substring(0, 200));
            }
        })
        .catch(function(error) {
            if (typeof console !== 'undefined' && console.error) {
                console.error('Connection test failed:', error);
                console.error('Error name:', error.name);
                console.error('Error message:', error.message);
                console.error('Error stack:', error.stack);
            }
            
            var errorMessage = error.message;
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                errorMessage = 'ネットワークエラーまたはCORSエラーです。Google Apps Scriptの設定を確認してください。';
            }
            
            showConnectionStatus('接続テスト失敗', 'error', errorMessage);
        });
}

// フォームリセット関数
function resetForm() {
    var nameField = document.getElementById('name');
    var emailField = document.getElementById('email');
    var phoneField = document.getElementById('phone');
    var designImageField = document.getElementById('designImage');
    var visitRadios = document.querySelectorAll('input[name="visit"]');
    var staffAssignmentRadios = document.querySelectorAll('input[name="staff_assignment"]');
    var staffSelectionContainer = document.getElementById('staffSelectionContainer');
    var staffSelect = document.getElementById('staffSelect');
    
    if (nameField) nameField.value = '';
    if (emailField) emailField.value = '';
    if (phoneField) phoneField.value = '';
    if (designImageField) designImageField.value = '';
    
    for (var i = 0; i < visitRadios.length; i++) {
        if (visitRadios[i].value === '初回') {
            visitRadios[i].checked = true;
        }
    }
    
    for (var i = 0; i < staffAssignmentRadios.length; i++) {
        if (staffAssignmentRadios[i].value === '指名なし') {
            staffAssignmentRadios[i].checked = true;
        }
    }
    
    if (staffSelectionContainer) staffSelectionContainer.style.display = 'none';
    if (staffSelect) staffSelect.value = '';
}

// イベントリスナーの設定
function setupEventListeners() {
    // 担当者指名のラジオボタンイベントリスナー
    var staffAssignmentRadios = document.querySelectorAll('input[name="staff_assignment"]');
    var staffSelectionContainer = document.getElementById('staffSelectionContainer');
    
    for (var i = 0; i < staffAssignmentRadios.length; i++) {
        var radio = staffAssignmentRadios[i];
        if (radio.addEventListener) {
            radio.addEventListener('change', function() {
                if (this.value === '指名あり') {
                    staffSelectionContainer.style.display = 'block';
                } else {
                    staffSelectionContainer.style.display = 'none';
                    var staffSelect = document.getElementById('staffSelect');
                    if (staffSelect) staffSelect.value = '';
                }
            });
        } else if (radio.attachEvent) {
            radio.attachEvent('onchange', function() {
                if (this.value === '指名あり') {
                    staffSelectionContainer.style.display = 'block';
                } else {
                    staffSelectionContainer.style.display = 'none';
                    var staffSelect = document.getElementById('staffSelect');
                    if (staffSelect) staffSelect.value = '';
                }
            });
        }
    }

    var cancelButton = document.getElementById('cancelButton');
    if (cancelButton) {
        if (cancelButton.addEventListener) {
            cancelButton.addEventListener('click', hideReservationModal);
        } else if (cancelButton.attachEvent) {
            cancelButton.attachEvent('onclick', hideReservationModal);
        }
    }

    var timeSlotsCancelButton = document.getElementById('timeSlotsCancelButton');
    if (timeSlotsCancelButton) {
        if (timeSlotsCancelButton.addEventListener) {
            timeSlotsCancelButton.addEventListener('click', hideTimeSlotsModal);
        } else if (timeSlotsCancelButton.attachEvent) {
            timeSlotsCancelButton.attachEvent('onclick', hideTimeSlotsModal);
        }
    }

    var submitButton = document.getElementById('submitButton');
    if (submitButton) {
        if (submitButton.addEventListener) {
            submitButton.addEventListener('click', function() {
            var courseSelect = document.getElementById('courseSelect');
            var selectedOption = courseSelect ? courseSelect.options[courseSelect.selectedIndex] : null;
            if (!selectedOption) {
                alert('コースを選択してください。');
                return;
            }
            
            var isNailOff = document.getElementById('nailOffCheck') ? document.getElementById('nailOffCheck').checked : false;
            var isLengthExtension = document.getElementById('lengthExtensionCheck') ? document.getElementById('lengthExtensionCheck').checked : false;

            var finalDuration = parseInt(selectedOption.value, 10);
            if (isNailOff) finalDuration += 30;

            var lengthExtensionCount = 0;
            var lengthExtensionPrice = 0;
            if (isLengthExtension) {
                var lengthExtensionCountElement = document.getElementById('lengthExtensionCount');
                if (lengthExtensionCountElement) {
                    lengthExtensionCount = parseInt(lengthExtensionCountElement.value, 10);
                    if (lengthExtensionCount >= 4) lengthExtensionPrice = 3500;
                    if (lengthExtensionCount >= 1 && lengthExtensionCount <= 3) finalDuration += lengthExtensionCount * 5;
                    else if (lengthExtensionCount >= 4) finalDuration += 30;
                }
            }

            var staffAssignmentRadios = document.querySelectorAll('input[name="staff_assignment"]');
            var isStaffAssignment = false;
            for (var i = 0; i < staffAssignmentRadios.length; i++) {
                if (staffAssignmentRadios[i].checked) {
                    isStaffAssignment = staffAssignmentRadios[i].value === '指名あり';
                    break;
                }
            }
            var selectedStaff = document.getElementById('staffSelect') ? document.getElementById('staffSelect').value : '';
            var staffAssignmentPrice = isStaffAssignment ? 400 : 0;

            var startTimeString = null;
            if (selectedStartTime) {
                startTimeString = selectedStartTime.toISOString();
            }
            
            var menuTypeRadios = document.querySelectorAll('input[name="menu_type"]');
            var menuType = 'HAND';
            for (var i = 0; i < menuTypeRadios.length; i++) {
                if (menuTypeRadios[i].checked) {
                    menuType = menuTypeRadios[i].value;
                    break;
                }
            }
            
            var visitRadios = document.querySelectorAll('input[name="visit"]');
            var visitStatus = '初回';
            for (var i = 0; i < visitRadios.length; i++) {
                if (visitRadios[i].checked) {
                    visitStatus = visitRadios[i].value;
                    break;
                }
            }

            var reservationData = {
                startTime: startTimeString,
                courseDuration: finalDuration,
                courseNameOnly: selectedOption.getAttribute('data-name'),
                coursePrice: selectedOption.getAttribute('data-price'),
                isNailOff: isNailOff,
                lengthExtensionCount: lengthExtensionCount,
                lengthExtensionPrice: lengthExtensionPrice,
                isStaffAssignment: isStaffAssignment,
                selectedStaff: selectedStaff,
                staffAssignmentPrice: staffAssignmentPrice,
                name: document.getElementById('name') ? document.getElementById('name').value : '',
                email: document.getElementById('email') ? document.getElementById('email').value : '',
                phone: document.getElementById('phone') ? document.getElementById('phone').value : '',
                menuType: menuType,
                visitStatus: visitStatus,
            };

            if (!reservationData.name || !reservationData.email || !reservationData.phone) {
                alert('すべての必須項目を入力してください。');
                return;
            }

            var designImageInput = document.getElementById('designImage');
            var file = designImageInput ? designImageInput.files[0] : null;

            if (file) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    var fileData = {
                        base64: e.target.result.split(',')[1],
                        mimeType: file.type,
                        fileName: file.name
                    };
                    reservationData.imageFile = fileData;
                    sendReservationDataToServer(reservationData);
                };
                reader.readAsDataURL(file);
            } else {
                reservationData.imageFile = null;
                sendReservationDataToServer(reservationData);
            }
        });
        } else if (submitButton.attachEvent) {
            submitButton.attachEvent('onclick', function() {
                // 同じ処理をここにも実装する必要がありますが、簡略化のため省略
            });
        }
    }
    
    // 直接アクセステストボタンのイベントリスナー
    var directTestBtn = document.getElementById('directTestBtn');
    if (directTestBtn) {
        if (typeof console !== 'undefined' && console.log) {
            console.log('Direct test button found, adding event listener');
        }
        
        if (directTestBtn.addEventListener) {
            directTestBtn.addEventListener('click', function(e) {
                e.preventDefault();
                if (typeof console !== 'undefined' && console.log) {
                    console.log('Direct test button clicked via addEventListener');
                }
                testDirectAccess();
            });
        } else if (directTestBtn.attachEvent) {
            directTestBtn.attachEvent('onclick', function(e) {
                e.preventDefault();
                if (typeof console !== 'undefined' && console.log) {
                    console.log('Direct test button clicked via attachEvent');
                }
                testDirectAccess();
            });
        }
    } else {
        if (typeof console !== 'undefined' && console.error) {
            console.error('Direct test button not found');
        }
    }
}

// アプリ初期化
function initApp() {
    // ヘルプ情報を強制的に表示
    var helpInfo = document.getElementById('helpInfo');
    if (helpInfo) {
        helpInfo.style.display = 'block';
        helpInfo.style.visibility = 'visible';
    }
    
    if (document.readyState === 'loading') {
        if (document.addEventListener) {
            document.addEventListener('DOMContentLoaded', initializeApp);
        } else if (document.attachEvent) {
            document.attachEvent('onreadystatechange', function() {
                if (document.readyState === 'complete') {
                    initializeApp();
                }
            });
        }
    } else {
        initializeApp();
    }
    setupEventListeners();
}

if (document.addEventListener) {
    document.addEventListener('DOMContentLoaded', initApp);
} else if (document.attachEvent) {
    document.attachEvent('onreadystatechange', function() {
        if (document.readyState === 'complete') {
            initApp();
        }
    });
} else {
    // 古いブラウザ用のフォールバック
    if (window.onload) {
        var oldOnload = window.onload;
        window.onload = function() {
            oldOnload();
            initApp();
        };
    } else {
        window.onload = initApp;
    }
}