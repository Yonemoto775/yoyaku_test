// グローバル変数
let calendar;
let selectedStartTime;
let busySlots = []; 
let appConfig = {};


// パフォーマンス最適化のための遅延読み込み
function initializeApp() {
    const calendarEl = document.getElementById('calendar');
    
    // Google Apps Script APIの利用可能性をチェック
    if (typeof google === 'undefined' || !google.script || !google.script.run) {
        console.warn('Google Apps Script API not available');
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
        alert('アプリケーションの読み込みに失敗しました: ' + error.message);
    }).getInitialData();
}

/**
 * サーバーから取得したメニュー項目でコース選択プルダウンを生成する
 * @param {Array} menuItems - メニュー項目の配列
 */
function populateCourseSelect(menuItems) {
    const courseSelect = document.getElementById('courseSelect');
    if (!courseSelect) {
        console.error('Course select element not found');
        return;
    }
    
    courseSelect.innerHTML = '';

    if (!menuItems || menuItems.length === 0) {
        courseSelect.innerHTML = '<option value="">コースがありません</option>';
        courseSelect.disabled = true;
        return;
    }

    // 元のコードで90分が選択されていたのを参考に、90分のコースをデフォルトで選択する
    let defaultSelectedIndex = menuItems.findIndex(item => item.duration == 90);
    if (defaultSelectedIndex === -1) defaultSelectedIndex = 0;

    menuItems.forEach((item, index) => {
        const option = document.createElement('option');
        option.value = item.duration;
        option.dataset.price = item.price;
        option.dataset.name = item.name;
        option.textContent = `${item.name} (${item.duration}分)`;
        if (index === defaultSelectedIndex) option.selected = true;
        courseSelect.appendChild(option);
    });

    // 長さ出しの本数選択プルダウンを生成
    const lengthExtensionCountSelect = document.getElementById('lengthExtensionCount');
    if (lengthExtensionCountSelect) {
        for (let i = 1; i <= 10; i++) {
            const option = document.createElement('option');
            option.value = i;
            let text = `${i}本`;
            if (i >= 4) {
                text += ' (+3,500円)';
            }
            option.textContent = text;
            lengthExtensionCountSelect.appendChild(option);
        }
    }

    // 長さ出しチェックボックスのイベントリスナー
    const lengthExtensionCheck = document.getElementById('lengthExtensionCheck');
    if (lengthExtensionCheck) {
        lengthExtensionCheck.addEventListener('change', () => {
            const lengthExtensionOptions = document.getElementById('lengthExtensionOptions');
            if (lengthExtensionOptions) {
                lengthExtensionOptions.style.display = lengthExtensionCheck.checked ? 'block' : 'none';
            }
        });
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
    const courseSelect = document.getElementById('courseSelect');
    if (!courseSelect) {
        console.error('Course select element not found');
        return;
    }
    
    let duration = parseInt(courseSelect.value, 10);
    const nailOffCheck = document.getElementById('nailOffCheck');
    if (nailOffCheck && nailOffCheck.checked) {
        duration += 30;
    }
    
    const lengthExtensionCheck = document.getElementById('lengthExtensionCheck');
    if (lengthExtensionCheck && lengthExtensionCheck.checked) {
        const lengthExtensionCount = document.getElementById('lengthExtensionCount');
        if (lengthExtensionCount) {
            const count = parseInt(lengthExtensionCount.value, 10);
            if (count >= 1 && count <= 3) {
                duration += count * 5;
            } else if (count >= 4 && count <= 10) {
                duration += 30;
            }
        }
    }

    const timeSlotsContainer = document.getElementById('timeSlotsContainer');
    if (!timeSlotsContainer) {
        console.error('Time slots container not found');
        return;
    }
    
    timeSlotsContainer.innerHTML = '';
    
    const availableTimes = [];
    const interval = 15;

    const dayStart = new Date(selectedDate);
    dayStart.setHours(appConfig.startHour || 10, 0, 0, 0);

    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(appConfig.endHour || 19, 0, 0, 0);

    for (let time = dayStart.getTime(); time < dayEnd.getTime(); time += interval * 60 * 1000) {
        const potentialStart = new Date(time);
        const potentialEnd = new Date(potentialStart.getTime() + duration * 60 * 1000);

        if (potentialEnd > dayEnd) continue;

        const isOverlapping = busySlots.some(slot => 
            (potentialStart < slot.end && potentialEnd > slot.start)
        );

        if (!isOverlapping) {
            availableTimes.push(potentialStart);
        }
    }

    if (availableTimes.length === 0) {
        timeSlotsContainer.innerHTML = '<p class="no-slots">この日は空き時間がありません。</p>';
    } else {
        availableTimes.forEach(time => {
            const button = document.createElement('button');
            button.textContent = time.toLocaleTimeString('ja-JP', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
            });
            button.className = 'time-slot-btn';
            button.addEventListener('click', () => {
                selectedStartTime = time;
                hideTimeSlotsModal();
                showReservationModal();
            });
            timeSlotsContainer.appendChild(button);
        });
    }

    const timeSlotsModal = document.getElementById('timeSlotsModal');
    const timeSlotsTitle = document.getElementById('timeSlotsTitle');
    if (timeSlotsModal && timeSlotsTitle) {
        timeSlotsTitle.textContent = selectedDate.toLocaleDateString('ja-JP', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            weekday: 'long'
        });
        timeSlotsModal.style.display = 'flex';
    }
}

function showReservationModal() {
    const reservationModal = document.getElementById('reservationModal');
    if (!reservationModal) {
        console.error('Reservation modal not found');
        return;
    }
    
    const selectedTimeElement = document.getElementById('selectedTime');
    if (selectedTimeElement && selectedStartTime) {
        selectedTimeElement.value = selectedStartTime.toLocaleString('ja-JP', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        });
    }

    const courseSelect = document.getElementById('courseSelect');
    const selectedOption = courseSelect ? courseSelect.options[courseSelect.selectedIndex] : null;
    if (!selectedOption) {
        console.error('No course selected');
        return;
    }
    
    const isNailOff = document.getElementById('nailOffCheck') ? document.getElementById('nailOffCheck').checked : false;
    const isLengthExtension = document.getElementById('lengthExtensionCheck') ? document.getElementById('lengthExtensionCheck').checked : false;

    let totalDuration = parseInt(selectedOption.value, 10);
    if (isNailOff) totalDuration += 30;

    let lengthExtensionCount = 0;
    let lengthExtensionPrice = 0;
    if (isLengthExtension) {
        const lengthExtensionCountElement = document.getElementById('lengthExtensionCount');
        if (lengthExtensionCountElement) {
            lengthExtensionCount = parseInt(lengthExtensionCountElement.value, 10);
            if (lengthExtensionCount >= 4) lengthExtensionPrice = 3500;
            if (lengthExtensionCount >= 1 && lengthExtensionCount <= 3) totalDuration += lengthExtensionCount * 5;
            else if (lengthExtensionCount >= 4) totalDuration += 30;
        }
    }

    const basePrice = parseInt(selectedOption.dataset.price, 10);
    
    const isStaffAssignment = document.querySelector('input[name="staff_assignment"]:checked') ? 
        document.querySelector('input[name="staff_assignment"]:checked').value === '指名あり' : false;
    const staffAssignmentPrice = isStaffAssignment ? 400 : 0;
    
    const totalPrice = basePrice + lengthExtensionPrice + staffAssignmentPrice;

    let summaryHtml = `<strong>コース:</strong> ${selectedOption.dataset.name}<br>`;
    summaryHtml += `<strong>基本価格:</strong> ${basePrice.toLocaleString()}円<br>`;
    
    let optionsHtml = '';
    if (isNailOff) optionsHtml += 'ジェルオフ<br>';
    if (lengthExtensionCount > 0) {
        optionsHtml += `長さ出し ${lengthExtensionCount}本`;
        if (lengthExtensionPrice > 0) optionsHtml += ` (+${lengthExtensionPrice.toLocaleString()}円)`;
        optionsHtml += '<br>';
    }
    if (isStaffAssignment) {
        optionsHtml += '担当者指名';
        if (staffAssignmentPrice > 0) optionsHtml += ` (+${staffAssignmentPrice.toLocaleString()}円)`;
        optionsHtml += '<br>';
    }
    if (optionsHtml) summaryHtml += `<strong>オプション:</strong><br><div style="padding-left:1em;">${optionsHtml}</div>`;
    summaryHtml += `<strong>合計時間:</strong> ${totalDuration}分<br>`;
    summaryHtml += `<strong>合計金額:</strong> ${totalPrice.toLocaleString()}円`;
    
    const reservationSummary = document.getElementById('reservationSummary');
    if (reservationSummary) {
        reservationSummary.innerHTML = summaryHtml;
    }

    reservationModal.style.display = 'flex';
}

function hideReservationModal() { 
    const reservationModal = document.getElementById('reservationModal');
    if (reservationModal) {
        reservationModal.style.display = 'none';
    }
}

function hideTimeSlotsModal() {
    const timeSlotsModal = document.getElementById('timeSlotsModal');
    if (timeSlotsModal) {
        timeSlotsModal.style.display = 'none';
    }
}

function sendReservationDataToServer(reservationData) {
    const submitButton = document.getElementById('submitButton');
    submitButton.disabled = true;
    submitButton.textContent = '処理中...';

    google.script.run
        .withSuccessHandler(function(result) {
            alert(result.message);
            if (result.success) {
                hideReservationModal();
                // フォームをリセット
                document.getElementById('name').value = '';
                document.getElementById('email').value = '';
                document.getElementById('phone').value = '';
                document.getElementById('designImage').value = '';
                document.querySelector('input[name="visit"][value="初回"]').checked = true;
                document.querySelector('input[name="staff_assignment"][value="指名なし"]').checked = true;
                document.getElementById('staffSelectionContainer').style.display = 'none';
                document.getElementById('staffSelect').value = '';
                calendar.refetchEvents(); 
            }
            submitButton.disabled = false;
            submitButton.textContent = '予約を確定する';
        })
        .withFailureHandler(function(error) {
            alert('エラーが発生しました: ' + error.message);
            submitButton.disabled = false;
            submitButton.textContent = '予約を確定する';
        })
        .createReservation(reservationData);
}

// イベントリスナーの設定
function setupEventListeners() {
    // 担当者指名のラジオボタンイベントリスナー
    const staffAssignmentRadios = document.querySelectorAll('input[name="staff_assignment"]');
    const staffSelectionContainer = document.getElementById('staffSelectionContainer');
    
    staffAssignmentRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === '指名あり') {
                staffSelectionContainer.style.display = 'block';
            } else {
                staffSelectionContainer.style.display = 'none';
                const staffSelect = document.getElementById('staffSelect');
                if (staffSelect) staffSelect.value = '';
            }
        });
    });

    const cancelButton = document.getElementById('cancelButton');
    if (cancelButton) {
        cancelButton.addEventListener('click', hideReservationModal);
    }

    const timeSlotsCancelButton = document.getElementById('timeSlotsCancelButton');
    if (timeSlotsCancelButton) {
        timeSlotsCancelButton.addEventListener('click', hideTimeSlotsModal);
    }

    const submitButton = document.getElementById('submitButton');
    if (submitButton) {
        submitButton.addEventListener('click', function() {
            const courseSelect = document.getElementById('courseSelect');
            const selectedOption = courseSelect ? courseSelect.options[courseSelect.selectedIndex] : null;
            if (!selectedOption) {
                alert('コースを選択してください。');
                return;
            }
            
            const isNailOff = document.getElementById('nailOffCheck') ? document.getElementById('nailOffCheck').checked : false;
            const isLengthExtension = document.getElementById('lengthExtensionCheck') ? document.getElementById('lengthExtensionCheck').checked : false;

            let finalDuration = parseInt(selectedOption.value, 10);
            if (isNailOff) finalDuration += 30;

            let lengthExtensionCount = 0;
            let lengthExtensionPrice = 0;
            if (isLengthExtension) {
                const lengthExtensionCountElement = document.getElementById('lengthExtensionCount');
                if (lengthExtensionCountElement) {
                    lengthExtensionCount = parseInt(lengthExtensionCountElement.value, 10);
                    if (lengthExtensionCount >= 4) lengthExtensionPrice = 3500;
                    if (lengthExtensionCount >= 1 && lengthExtensionCount <= 3) finalDuration += lengthExtensionCount * 5;
                    else if (lengthExtensionCount >= 4) finalDuration += 30;
                }
            }

            const isStaffAssignment = document.querySelector('input[name="staff_assignment"]:checked') ? 
                document.querySelector('input[name="staff_assignment"]:checked').value === '指名あり' : false;
            const selectedStaff = document.getElementById('staffSelect') ? document.getElementById('staffSelect').value : '';
            const staffAssignmentPrice = isStaffAssignment ? 400 : 0;

            const reservationData = {
                startTime: selectedStartTime ? selectedStartTime.toISOString() : null,
                courseDuration: finalDuration,
                courseNameOnly: selectedOption.dataset.name,
                coursePrice: selectedOption.dataset.price,
                isNailOff: isNailOff,
                lengthExtensionCount: lengthExtensionCount,
                lengthExtensionPrice: lengthExtensionPrice,
                isStaffAssignment: isStaffAssignment,
                selectedStaff: selectedStaff,
                staffAssignmentPrice: staffAssignmentPrice,
                name: document.getElementById('name') ? document.getElementById('name').value : '',
                email: document.getElementById('email') ? document.getElementById('email').value : '',
                phone: document.getElementById('phone') ? document.getElementById('phone').value : '',
                menuType: document.querySelector('input[name="menu_type"]:checked') ? document.querySelector('input[name="menu_type"]:checked').value : 'HAND',
                visitStatus: document.querySelector('input[name="visit"]:checked') ? document.querySelector('input[name="visit"]:checked').value : '初回',
            };

            if (!reservationData.name || !reservationData.email || !reservationData.phone) {
                alert('すべての必須項目を入力してください。');
                return;
            }

            const designImageInput = document.getElementById('designImage');
            const file = designImageInput ? designImageInput.files[0] : null;

            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const fileData = {
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
    }
}

// アプリ初期化
document.addEventListener('DOMContentLoaded', function() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
        initializeApp();
    }
    setupEventListeners();
});