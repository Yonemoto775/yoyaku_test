// Google Apps Script用のWeb API版コード
// このファイルをGoogle Apps Scriptにコピーして使用してください

// =========================================================
// 設定項目
// =========================================================
const CALENDAR_ID = 'k.yonemoto@white-bloom.com';
const START_HOUR = 10;
const END_HOUR = 19;
const DAYS_TO_SHOW = 90;
const SALON_NOTIFICATION_EMAIL = 'k.yonemoto@white-bloom.com';
const NOTIFICATION_EMAILS = ['k.yonemoto@white-bloom.com'];

// CORS対応のためのレスポンス作成
function createCorsResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// OPTIONSリクエストの処理（CORSプリフライト）
function doOptions() {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

// GETリクエストの処理（初期データ取得）
function doGet(e) {
  try {
    const action = e.parameter ? e.parameter.action : null;
    
    if (action === 'getInitialData') {
      const result = getInitialData();
      return createCorsResponse(result);
    } else if (action === 'getBusySlots') {
      const result = getBusySlots();
      return createCorsResponse(result);
    } else {
      return createCorsResponse({ error: 'Invalid action' });
    }
  } catch (error) {
    return createCorsResponse({ error: error.toString() });
  }
}

// POSTリクエストの処理（予約作成）
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const result = createReservation(data);
    return createCorsResponse(result);
  } catch (error) {
    return createCorsResponse({ error: error.toString() });
  }
}

// 既存の関数（getBusySlots, createReservation, getMenuItems, getInitialData, sendSalonNotification）
// ここに元のcode.jsの関数をコピーしてください

/**
 * 指定された期間中の「予約で埋まっている時間帯（Busy Slot）」のリストを返す関数
 */
function getBusySlots() {
  try {
    const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
    if (!calendar) throw new Error("カレンダーが見つかりません。");

    const now = new Date();
    const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + DAYS_TO_SHOW);

    const events = calendar.getEvents(startTime, endTime);

    const busySlots = events.filter(e => !e.isAllDayEvent()).map(event => ({
      start: event.getStartTime().toISOString(),
      end: event.getEndTime().toISOString()
    }));

    return busySlots;
  } catch (e) {
    return { error: e.toString() };
  }
}

/**
 * 新規予約を作成する関数
 */
function createReservation(data) {
  try {
    const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
    if (!calendar) throw new Error("カレンダーが見つかりません。");

    // 画像アップロード処理
    let imageFileUrl = '';
    if (data.imageFile && data.imageFile.base64) {
      try {
        const folderName = '予約デザイン画像';
        let folders = DriveApp.getFoldersByName(folderName);
        const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
        
        const decoded = Utilities.base64Decode(data.imageFile.base64);
        const blob = Utilities.newBlob(decoded, data.imageFile.mimeType, `予約_${data.name}_${new Date().toISOString()}_${data.imageFile.fileName}`);
        
        const imageFile = folder.createFile(blob);
        imageFileUrl = imageFile.getUrl();
      } catch (e) {
        console.error("画像のアップロードに失敗しました: " + e.toString());
        imageFileUrl = "画像のアップロードに失敗しました。";
      }
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('予約台帳') || SpreadsheetApp.getActiveSpreadsheet().insertSheet('予約台帳');

    const startTime = new Date(data.startTime);
    const endTime = new Date(startTime.getTime() + data.courseDuration * 60 * 1000);

    // ダブルブッキングの最終チェック
    const overlappingEvents = calendar.getEvents(startTime, endTime);
    if (overlappingEvents.filter(e => !e.isAllDayEvent()).length > 0) {
      return { success: false, message: '申し訳ありません、その時間は直前に予約が埋まってしまいました。' };
    }

    // Googleカレンダーに予定を作成
    const visitInfo = data.visitStatus === '初回' ? '【初回】' : '';
    let optionInfoForTitle = [];
    if (data.isNailOff) optionInfoForTitle.push('オフ');
    if (data.lengthExtensionCount > 0) optionInfoForTitle.push(`長さ出し${data.lengthExtensionCount}本`);
    const optionTitle = optionInfoForTitle.length > 0 ? ` (+${optionInfoForTitle.join('/')})` : '';

    const eventTitle = `[予約] ${visitInfo}${data.name}様 (${data.menuType}${optionTitle})`;
    
    let eventDescription = `コース: ${data.courseNameOnly} (${data.courseDuration}分)\n`;
    eventDescription += `オフ: ${data.isNailOff ? 'あり' : 'なし'}\n`;
    if (data.lengthExtensionCount > 0) eventDescription += `長さ出し: ${data.lengthExtensionCount}本\n`;
    if (data.isStaffAssignment) eventDescription += `担当者指名: ${data.selectedStaff}\n`;
    eventDescription += `価格: ${data.coursePrice}円\n`;
    if (data.lengthExtensionPrice > 0) eventDescription += `追加料金(長さ出し): ${data.lengthExtensionPrice}円\n`;
    if (data.staffAssignmentPrice > 0) eventDescription += `追加料金(担当者指名): ${data.staffAssignmentPrice}円\n`;
    eventDescription += `電話番号: ${data.phone}\nメールアドレス: ${data.email}\n顧客区分: ${data.visitStatus}`;
    if (imageFileUrl) {
      eventDescription += `\n\n添付されたデザイン画像:\n${imageFileUrl}`;
    }
    calendar.createEvent(eventTitle, startTime, endTime, { description: eventDescription });

    // Googleスプレッドシートに予約情報を記録
    const header = ['予約日時', '終了日時', 'お名前', 'コース名', 'オフ有無', '長さ出し本数', '価格', '追加料金', '担当者指名', '指名担当者', 'MENU種別', '電話番号', 'メールアドレス', '顧客区分', '登録日時', 'デザイン画像URL'];
    if (sheet.getLastRow() < 1 || sheet.getRange(1, 1, 1, header.length).getValues()[0].join('') !== header.join('')) {
      sheet.getRange(1, 1, 1, header.length).setValues([header]);
    }
    const offStatus = data.isNailOff ? 'あり' : 'なし';
    const staffAssignmentStatus = data.isStaffAssignment ? 'あり' : 'なし';
    const selectedStaff = data.isStaffAssignment ? data.selectedStaff : '';
    sheet.appendRow([startTime, endTime, data.name, data.courseNameOnly, offStatus, data.lengthExtensionCount, data.coursePrice, data.lengthExtensionPrice, staffAssignmentStatus, selectedStaff, data.menuType, data.phone, data.email, data.visitStatus, new Date(), imageFileUrl]);

    // 自動返信メール機能
    const recipient = data.email;
    const subject = '【CARAT】ご予約ありがとうございます';
    const formattedStartTime = Utilities.formatDate(startTime, 'JST', 'yyyy年MM月dd日（E）HH:mm');
    const basePrice = Number(data.coursePrice);
    const extensionPrice = Number(data.lengthExtensionPrice);
    const staffAssignmentPrice = Number(data.staffAssignmentPrice || 0);
    const totalPrice = basePrice + extensionPrice + staffAssignmentPrice;

    const courseLine = `コース名：${data.courseNameOnly}　${basePrice.toLocaleString()}円`;

    let optionItems = [];
    if (data.isNailOff) {
      optionItems.push('ジェルオフ');
    }
    if (data.lengthExtensionCount > 0) {
      let lengthText = `長さ出し ${data.lengthExtensionCount}本`;
      if (extensionPrice > 0) lengthText += `　${extensionPrice.toLocaleString()}円`;
      optionItems.push(lengthText);
    }
    if (data.isStaffAssignment) {
      let staffText = `担当者指名 (${data.selectedStaff})`;
      if (staffAssignmentPrice > 0) staffText += `　${staffAssignmentPrice.toLocaleString()}円`;
      optionItems.push(staffText);
    }
    const optionLine = optionItems.length > 0 ? `オプション：${optionItems.join('\n           ')}` : 'オプション：なし';
    const totalLine = `合計金額：${totalPrice.toLocaleString()}円`;

    const body = `${data.name} 様

この度は、数あるネイルサロンの中から CARAT をお選びいただき誠にありがとうございます。
下記の通り、ご予約を確定させていただきましたのでご確認ください。

────────────────────
【ご予約内容】
ご予約日時：${formattedStartTime}〜
MENU：${data.menuType}
${courseLine}
${optionLine}
${totalLine}
────────────────────

【ご予約に関する注意事項】
 • 当サイトからは日時変更ができません。変更やキャンセルをご希望の場合は、
　公式LINE または Instagram（@carat._.oshinail）のDMまでご連絡ください。

【キャンセルポリシー】
 • 当日キャンセル／無断キャンセル：ご予約料金全額
 • 前日までのキャンセル：ご予約料金の半額
 • 当日の日程変更：＋2,000円

※15分以上ご連絡なく遅れられた場合は、無断キャンセル扱いとなります。
※遅刻される場合は、メッセージまたはお電話（070-3868-2000）までご連絡ください。

────────────────────

【ご来店について】
 • 完全プライベートサロンのため待合室はございません。
　10分以上早く到着される場合は、事前にメッセージでお知らせください。

【住所】
〒553-0001
大阪府大阪市福島区海老江8-2-32
グランデフィオーレ 803号室

【アクセス】
 • JR東西線「海老江駅」2番出口より徒歩7分
 • 大阪メトロ千日前線「野田阪神駅」より徒歩10分
 • 阪神本線「野田駅」より徒歩15分

────────────────────

当日のご来店を心よりお待ちしております。

――――――――――――――――
CARAT
Instagram：carat._.oshinail
TEL：070-3868-2000
――――――――――――――――`;
    
    MailApp.sendEmail(recipient, subject, body);

    // サロン側への通知メール送信
    sendSalonNotification(data, formattedStartTime, basePrice, extensionPrice, staffAssignmentPrice, totalPrice, imageFileUrl);

    return { success: true, message: '予約が完了しました。確認メールを送信しましたので、ご確認ください。' };
  } catch (e) {
    console.error("予約作成中にエラーが発生しました: " + e.toString());
    return { success: false, message: `エラーが発生しました: ${e.toString()}` };
  }
}

/**
 * スプレッドシートの 'メニュー' シートからコース一覧を取得する
 */
function getMenuItems() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('メニュー');
    if (!sheet || sheet.getLastRow() < 2) {
      console.log("シート 'メニュー' が見つからないか、データがありません。デフォルトのメニューを使用します。");
      return [
        { name: 'ハンドケア', duration: 60, price: 5000 },
        { name: 'ジェルネイル', duration: 90, price: 8000 },
        { name: 'スカルプチュア', duration: 120, price: 12000 }
      ];
    }

    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3);
    const values = dataRange.getValues();

    const menuItems = values.map(row => {
      if (row[0] && typeof row[1] === 'number' && row[1] > 0 && typeof row[2] === 'number' && row[2] >= 0) {
        return {
          name: row[0].toString().trim(),
          duration: parseInt(row[1], 10),
          price: parseInt(row[2], 10)
        };
      }
      return null;
    }).filter(item => item !== null);

    return menuItems;
  } catch (e) {
    console.error("getMenuItemsでエラーが発生しました: " + e.toString());
    return [
      { name: 'ハンドケア', duration: 60, price: 5000 },
      { name: 'ジェルネイル', duration: 90, price: 8000 },
      { name: 'スカルプチュア', duration: 120, price: 12000 }
    ];
  }
}

/**
 * アプリケーションの初期設定値を返す
 */
function getInitialData() {
  return {
    config: {
      startHour: START_HOUR,
      endHour: END_HOUR,
      daysToShow: DAYS_TO_SHOW
    },
    menuItems: getMenuItems()
  };
}

/**
 * サロン側への予約通知メールを送信する関数
 */
function sendSalonNotification(data, formattedStartTime, basePrice, extensionPrice, staffAssignmentPrice, totalPrice, imageFileUrl) {
  const notificationEmails = [];
  
  if (SALON_NOTIFICATION_EMAIL && SALON_NOTIFICATION_EMAIL !== 'メールアドレスを入力') {
    notificationEmails.push(SALON_NOTIFICATION_EMAIL);
  }
  
  if (Array.isArray(NOTIFICATION_EMAILS)) {
    NOTIFICATION_EMAILS.forEach(email => {
      if (email && email.trim() !== '') {
        notificationEmails.push(email.trim());
      }
    });
  }
  
  if (notificationEmails.length === 0) {
    console.log("通知対象のメールアドレスが設定されていません。");
    return;
  }
  
  try {
    const salonSubject = `【新規予約】${data.name}様 - ${formattedStartTime}`;
    
    let staffInfo = '';
    if (data.isStaffAssignment) {
      staffInfo = `担当者指名: ${data.selectedStaff}\n`;
    }
    
    let optionInfo = '';
    if (data.isNailOff) {
      optionInfo += '・ジェルオフ\n';
    }
    if (data.lengthExtensionCount > 0) {
      optionInfo += `・長さ出し ${data.lengthExtensionCount}本`;
      if (data.lengthExtensionPrice > 0) {
        optionInfo += ` (+${data.lengthExtensionPrice.toLocaleString()}円)`;
      }
      optionInfo += '\n';
    }
    if (data.isStaffAssignment) {
      optionInfo += `・担当者指名 (+${data.staffAssignmentPrice.toLocaleString()}円)\n`;
    }
    if (!optionInfo) {
      optionInfo = 'なし\n';
    }

    const salonBody = `新しい予約が入りました。

────────────────────
【予約者情報】
お名前: ${data.name}
電話番号: ${data.phone}
メールアドレス: ${data.email}
顧客区分: ${data.visitStatus}

【予約内容】
予約日時: ${formattedStartTime}〜
MENU: ${data.menuType}
コース: ${data.courseNameOnly} (${data.courseDuration}分)
基本価格: ${basePrice.toLocaleString()}円

【オプション】
${optionInfo}
${staffInfo}
【料金内訳】
基本料金: ${basePrice.toLocaleString()}円
${extensionPrice > 0 ? `長さ出し追加料金: ${extensionPrice.toLocaleString()}円\n` : ''}${staffAssignmentPrice > 0 ? `担当者指名料金: ${staffAssignmentPrice.toLocaleString()}円\n` : ''}合計金額: ${totalPrice.toLocaleString()}円

【その他】
${imageFileUrl ? `デザイン画像: ${imageFileUrl}\n` : ''}────────────────────

このメールは自動送信されています。`;

    notificationEmails.forEach(email => {
      try {
        MailApp.sendEmail(email, salonSubject, salonBody);
        console.log(`通知メールを送信しました: ${email}`);
      } catch (e) {
        console.error(`通知メールの送信に失敗しました (${email}): ${e.toString()}`);
      }
    });
    
  } catch (e) {
    console.error("サロン側への通知メール送信に失敗しました: " + e.toString());
  }
}