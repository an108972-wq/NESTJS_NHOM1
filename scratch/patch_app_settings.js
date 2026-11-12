const fs = require('fs');

const path = 'public/app.js';
let code = fs.readFileSync(path, 'utf8');

const normalize = (s) => s.replace(/\r\n/g, '\n');

// 1. Locate loadSettings and saveSettings
const oldLoadSaveRegex = /async function loadSettings\(showErrors = true\)[\s\S]*?async function saveSettings\(event\)[\s\S]*?await Promise\.all\(\[loadSettings\(false\), loadDashboard\(\), loadUsers\(\)\]\);\s*\}\s*catch\s*\(error\)\s*\{\s*notify\(`Không lưu được cấu hình: \$\{error\.message\}`,\s*true\);\s*\}\s*\}/;

const newLoadSaveCode = `async function loadSettings(showErrors = true) {
    if (!isStaff()) return;
    try {
      state.settings = await api('/system/settings');
      const s = state.settings || {};

      // 1. Tham số chung & Cảnh báo
      if ($('settingMaxLoans')) $('settingMaxLoans').value = s.maxActiveLoans ?? 5;
      if ($('settingBorrowDays')) $('settingBorrowDays').value = s.borrowDays ?? 14;
      if ($('settingRenewalDays')) $('settingRenewalDays').value = s.renewalDays ?? 14;
      if ($('settingDailyFine')) $('settingDailyFine').value = s.dailyFineRate ?? 5000;
      if ($('settingFineLockThreshold')) $('settingFineLockThreshold').value = s.fineLockThreshold ?? 50000;

      if ($('settingEnableAutoLockOverdue')) $('settingEnableAutoLockOverdue').checked = Boolean(s.enableAutoLockOverdue);
      if ($('settingAutoLockOverdueDays')) $('settingAutoLockOverdueDays').value = s.autoLockOverdueDays ?? 30;
      if ($('settingEnableAutoEmailReminders')) $('settingEnableAutoEmailReminders').checked = Boolean(s.enableAutoEmailReminders);
      if ($('settingReminderDaysBeforeDue')) $('settingReminderDaysBeforeDue').value = s.reminderDaysBeforeDue ?? 2;

      // 2. Quotas theo nhóm
      const q = s.readerGroupQuotas || {};
      if ($('quotaStudentMax')) $('quotaStudentMax').value = q.STUDENT?.maxActiveLoans ?? 5;
      if ($('quotaStudentDays')) $('quotaStudentDays').value = q.STUDENT?.borrowDays ?? 14;
      if ($('quotaLecturerMax')) $('quotaLecturerMax').value = q.LECTURER?.maxActiveLoans ?? 10;
      if ($('quotaLecturerDays')) $('quotaLecturerDays').value = q.LECTURER?.borrowDays ?? 30;
      if ($('quotaResearcherMax')) $('quotaResearcherMax').value = q.RESEARCHER?.maxActiveLoans ?? 15;
      if ($('quotaResearcherDays')) $('quotaResearcherDays').value = q.RESEARCHER?.borrowDays ?? 45;
      if ($('quotaOtherMax')) $('quotaOtherMax').value = q.OTHER?.maxActiveLoans ?? 3;
      if ($('quotaOtherDays')) $('quotaOtherDays').value = q.OTHER?.borrowDays ?? 7;

      // 3. Cổng thanh toán & Biểu phí
      if ($('settingVietqrBankId')) $('settingVietqrBankId').value = s.vietqrBankId || 'MBBank';
      if ($('settingVietqrAccountNo')) $('settingVietqrAccountNo').value = s.vietqrAccountNo || '0388888888';
      if ($('settingVietqrAccountName')) $('settingVietqrAccountName').value = s.vietqrAccountName || 'THU VIEN DAI HOC';
      if ($('settingVnpayTmnCode')) $('settingVnpayTmnCode').value = s.vnpayTmnCode || '';
      if ($('settingVnpayHashSecret')) $('settingVnpayHashSecret').value = s.vnpayHashSecret || '';
      if ($('settingVnpayUrl')) $('settingVnpayUrl').value = s.vnpayUrl || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
      if ($('settingMomoPartnerCode')) $('settingMomoPartnerCode').value = s.momoPartnerCode || '';
      if ($('settingMomoAccessKey')) $('settingMomoAccessKey').value = s.momoAccessKey || '';
      if ($('settingMomoSecretKey')) $('settingMomoSecretKey').value = s.momoSecretKey || '';
      if ($('settingCardRegistrationFee')) $('settingCardRegistrationFee').value = s.cardRegistrationFee ?? 20000;
      if ($('settingCardReissueFee')) $('settingCardReissueFee').value = s.cardReissueFee ?? 50000;

      // 4. Lập lịch sao lưu & mốc sao lưu gần nhất
      if ($('settingAutoBackupSchedule')) $('settingAutoBackupSchedule').value = s.autoBackupSchedule || 'DAILY';
      if ($('settingBackupRetentionDays')) $('settingBackupRetentionDays').value = s.backupRetentionDays ?? 30;
      if ($('lastBackupStatusText')) {
        $('lastBackupStatusText').textContent = s.lastBackupAt
          ? \`✓ Bản sao lưu gần nhất: \${new Date(s.lastBackupAt).toLocaleString('vi-VN')}\`
          : 'Chưa có bản sao lưu nào được thực hiện.';
      }

      if ($('newUserLimit')) {
        $('newUserLimit').max = String(s.maxActiveLoans);
        if (!$('newUserLimit').value || Number($('newUserLimit').value) > s.maxActiveLoans) {
          $('newUserLimit').value = String(s.maxActiveLoans);
        }
      }
      if ($('editUserLimit')) $('editUserLimit').max = String(s.maxActiveLoans);
      updateBorrowDueSuggestion();

      if (isAdmin() && $('smtpConfigurationStatus')) {
        try {
          const mailConfig = await api('/notifications/config');
          $('smtpConfigurationStatus').textContent = mailConfig.smtpConfigured
            ? '✓ Máy chủ SMTP đang hoạt động bình thường. Email thông báo được gửi tự động theo lịch.'
            : '⚠ SMTP chưa được cấu hình qua biến môi trường. Hệ thống vẫn lưu trữ thông báo nội bộ trong ứng dụng.';
        } catch (_) {}
      }
    } catch (error) {
      if (showErrors) notify(\`Không tải được cấu hình: \${error.message}\`, true);
    }
  }

  async function saveSettings(event) {
    if (event) event.preventDefault();
    try {
      const payload = {
        maxActiveLoans: Number($('settingMaxLoans')?.value || 5),
        borrowDays: Number($('settingBorrowDays')?.value || 14),
        renewalDays: Number($('settingRenewalDays')?.value || 14),
        dailyFineRate: Number($('settingDailyFine')?.value || 5000),
        fineLockThreshold: Number($('settingFineLockThreshold')?.value || 50000),
        autoLockOverdueDays: Number($('settingAutoLockOverdueDays')?.value || 30),
        enableAutoLockOverdue: Boolean($('settingEnableAutoLockOverdue')?.checked),
        enableAutoEmailReminders: Boolean($('settingEnableAutoEmailReminders')?.checked),
        reminderDaysBeforeDue: Number($('settingReminderDaysBeforeDue')?.value || 2),
        readerGroupQuotas: {
          STUDENT: {
            name: 'Sinh viên',
            maxActiveLoans: Number($('quotaStudentMax')?.value || 5),
            borrowDays: Number($('quotaStudentDays')?.value || 14),
          },
          LECTURER: {
            name: 'Giảng viên',
            maxActiveLoans: Number($('quotaLecturerMax')?.value || 10),
            borrowDays: Number($('quotaLecturerDays')?.value || 30),
          },
          RESEARCHER: {
            name: 'Học viên Cao học / NCS',
            maxActiveLoans: Number($('quotaResearcherMax')?.value || 15),
            borrowDays: Number($('quotaResearcherDays')?.value || 45),
          },
          OTHER: {
            name: 'Bạn đọc vãng lai / Khác',
            maxActiveLoans: Number($('quotaOtherMax')?.value || 3),
            borrowDays: Number($('quotaOtherDays')?.value || 7),
          },
        },
        vietqrBankId: $('settingVietqrBankId')?.value?.trim() || 'MBBank',
        vietqrAccountNo: $('settingVietqrAccountNo')?.value?.trim() || '0388888888',
        vietqrAccountName: $('settingVietqrAccountName')?.value?.trim() || 'THU VIEN DAI HOC',
        vnpayTmnCode: $('settingVnpayTmnCode')?.value?.trim() || '',
        vnpayHashSecret: $('settingVnpayHashSecret')?.value?.trim() || '',
        vnpayUrl: $('settingVnpayUrl')?.value?.trim() || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
        momoPartnerCode: $('settingMomoPartnerCode')?.value?.trim() || '',
        momoAccessKey: $('settingMomoAccessKey')?.value?.trim() || '',
        momoSecretKey: $('settingMomoSecretKey')?.value?.trim() || '',
        cardRegistrationFee: Number($('settingCardRegistrationFee')?.value || 20000),
        cardReissueFee: Number($('settingCardReissueFee')?.value || 50000),
        autoBackupSchedule: $('settingAutoBackupSchedule')?.value || 'DAILY',
        backupRetentionDays: Number($('settingBackupRetentionDays')?.value || 30),
      };

      state.settings = await api('/system/settings', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      notify('✓ Đã lưu toàn bộ cấu hình hệ thống thành công.');
      await Promise.all([loadSettings(false), loadDashboard(), loadUsers()]);
    } catch (error) {
      notify(\`Không lưu được cấu hình: \${error.message}\`, true);
    }
  }

  async function triggerAutomationRules() {
    try {
      notify('Đang quét và thực thi các quy tắc tự động hóa...');
      const res = await api('/system/settings/trigger-automation', { method: 'POST' });
      notify(res.message || 'Đã thực thi quy tắc tự động hóa thành công.');
      await Promise.all([loadUsers(), loadDashboard()]);
    } catch (error) {
      notify(\`Lỗi thực thi tự động hóa: \${error.message}\`, true);
    }
  }

  async function downloadDatabaseBackup() {
    try {
      notify('Đang kết xuất bản sao lưu SQL...');
      const res = await fetch('/system/settings/backup/download', {
        headers: state.token ? { Authorization: \`Bearer \${state.token}\` } : {},
      });
      if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = res.headers.get('content-disposition');
      const filenameMatch = disposition && disposition.match(/filename="?([^"]+)"?/);
      a.download = filenameMatch ? filenameMatch[1] : \`library_backup_\${new Date().toISOString().slice(0, 10)}.sql\`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      notify('✓ Tải xuống bản sao lưu SQL thành công.');
      if ($('lastBackupStatusText')) {
        $('lastBackupStatusText').textContent = \`✓ Bản sao lưu gần nhất: \${new Date().toLocaleString('vi-VN')}\`;
      }
    } catch (error) {
      notify(\`Không thể tải bản sao lưu: \${error.message}\`, true);
    }
  }

  async function triggerManualBackup() {
    try {
      notify('Đang tạo bản sao lưu dữ liệu...');
      const res = await api('/system/settings/backup/manual', { method: 'POST' });
      notify(\`✓ Sao lưu thành công: \${res.tablesExported} bảng (\${res.totalRows} bản ghi).\`);
      if ($('lastBackupStatusText')) {
        $('lastBackupStatusText').textContent = \`✓ Bản sao lưu gần nhất: \${new Date().toLocaleString('vi-VN')} (\${res.tablesExported} bảng, \${res.totalRows} bản ghi)\`;
      }
    } catch (error) {
      notify(\`Lỗi sao lưu: \${error.message}\`, true);
    }
  }`;

let normCode = normalize(code);
if (!oldLoadSaveRegex.test(normCode)) {
  console.error('oldLoadSaveRegex did not match!');
  process.exit(1);
}

normCode = normCode.replace(oldLoadSaveRegex, newLoadSaveCode);

// 2. Attach additional event listeners for settings buttons
const oldListeners = `$('settingsForm')?.addEventListener('submit', (event) => void saveSettings(event));`;
const newListeners = `$('settingsForm')?.addEventListener('submit', (event) => void saveSettings(event));
  $('saveAllSettingsTopBtn')?.addEventListener('click', () => void saveSettings());
  $('triggerAutomationRulesBtn')?.addEventListener('click', () => void triggerAutomationRules());
  $('downloadBackupSqlBtn')?.addEventListener('click', () => void downloadDatabaseBackup());
  $('downloadBackupSqlCardBtn')?.addEventListener('click', () => void downloadDatabaseBackup());
  $('triggerManualBackupBtn')?.addEventListener('click', () => void triggerManualBackup());`;

if (!normCode.includes(oldListeners)) {
  console.error('oldListeners not found!');
  process.exit(1);
}

normCode = normCode.replace(oldListeners, newListeners);

fs.writeFileSync(path, normCode.replace(/\n/g, '\r\n'), 'utf8');
console.log('Successfully updated settings logic and listeners in public/app.js!');

