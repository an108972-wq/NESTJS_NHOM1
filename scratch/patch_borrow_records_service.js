const fs = require('fs');

const path = 'src/modules/borrow-records/borrow-records.service.ts';
let code = fs.readFileSync(path, 'utf8');

// 1. In create()
const oldBlock1 = `      const activeLoanLimit = Math.min(
        user.maxActiveLoans ?? settings.maxActiveLoans,
        settings.maxActiveLoans,
      );`;

const newBlock1 = `      const groupQuota = user.readerGroup && settings.readerGroupQuotas?.[user.readerGroup];
      const maxForGroup = groupQuota?.maxActiveLoans ?? settings.maxActiveLoans;
      const activeLoanLimit = Math.min(
        user.maxActiveLoans ?? maxForGroup,
        Math.max(settings.maxActiveLoans, maxForGroup),
      );`;

// 2. In createStaffRecord()
const oldBlock2 = `      const activeLoanLimit = Math.min(
        user.maxActiveLoans ?? settings.maxActiveLoans,
        settings.maxActiveLoans,
      );`;

// 3. In approve()
const oldBlock3 = `      const settings = await this.settingsService.getSettings();
      const approvedAt = new Date();
      const dueDate = new Date(approvedAt);
      dueDate.setDate(dueDate.getDate() + settings.borrowDays);`;

const newBlock3 = `      const settings = await this.settingsService.getSettings();
      const approvedAt = new Date();
      const dueDate = new Date(approvedAt);
      const groupQuota = record.user?.readerGroup && settings.readerGroupQuotas?.[record.user.readerGroup];
      const borrowDuration = groupQuota?.borrowDays ?? settings.borrowDays;
      dueDate.setDate(dueDate.getDate() + borrowDuration);`;

// Replace with CRLF preservation
const normalize = (s) => s.replace(/\r\n/g, '\n');
let normCode = normalize(code);

if (!normCode.includes(normalize(oldBlock1))) {
  console.error('Block 1 not found!');
  process.exit(1);
}
normCode = normCode.replace(normalize(oldBlock1), normalize(newBlock1));

if (!normCode.includes(normalize(oldBlock2))) {
  console.error('Block 2 not found!');
  process.exit(1);
}
normCode = normCode.replace(normalize(oldBlock2), normalize(newBlock1));

if (!normCode.includes(normalize(oldBlock3))) {
  console.error('Block 3 not found!');
  process.exit(1);
}
normCode = normCode.replace(normalize(oldBlock3), normalize(newBlock3));

fs.writeFileSync(path, normCode.replace(/\n/g, '\r\n'), 'utf8');
console.log('Successfully patched borrow-records.service.ts with role-based quotas!');

