// グローバル変数
var calendar;
var selectedStartTime;
var busySlots = []; 
var appConfig = {};


// パフォーマンス最適化のための遅延読み込み
function initializeApp() {
    var calendarEl = document.getElementById('calendar');
    
    // Google Apps Script APIの利用可能性をチェック
    if (typeof google === 'undefined' || !google.script || !google.script.run) {
        if (typeof console !== 'undefined' && console.warn) {
            console.warn('Google Apps Script API not available');
        }
        return;
    }
    
    // 最初にアプリの初期データ（設定＋メニュー）を取得
    google.script.run.withSuccessHandler(function(initialData) {
        // 1. アプリ設定をグローバル変数に保存
        appConfig = initialData.config;
        
        // 2. コース選択のプルダウンを生成
        populateCourseSelect(initialData.menuItems);

        // 3. カレンダーを初期化
        initializeCalendar(calendarEl);
    }).withFailureHandler(function(error) {
        // サーバーからデータを取得できなかった場合のエラー表示
        var errorMessage = 'アプリケーションの読み込みに失敗しました';
        if (error && error.message) {
            errorMessage += ': ' + error.message;
        }
        alert(errorMessage);
    }).getInitialData();
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
            google.script.run
                .withSuccessHandler(function(slots) {
                    busySlots = slots.map(slot => ({
                        start: new Date(slot.start),
                        end: new Date(slot.end)
                    }));
                    successCallback(busySlots);
                })
                .getBusySlots();
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

    google.script.run
        .withSuccessHandler(function(result) {
            alert(result.message);
            if (result.success) {
                hideReservationModal();
                // フォームをリセット
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
                
                if (calendar && calendar.refetchEvents) {
                    calendar.refetchEvents();
                }
            }
            submitButton.disabled = false;
            submitButton.textContent = '予約を確定する';
        })
        .withFailureHandler(function(error) {
            var errorMessage = 'エラーが発生しました';
            if (error && error.message) {
                errorMessage += ': ' + error.message;
            }
            alert(errorMessage);
            submitButton.disabled = false;
            submitButton.textContent = '予約を確定する';
        })
        .createReservation(reservationData);
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
}

// アプリ初期化
function initApp() {
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