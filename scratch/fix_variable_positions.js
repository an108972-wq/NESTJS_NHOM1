const fs = require('fs');

let code = fs.readFileSync('public/app.js', 'utf8');

// 1. Set top declarations properly
const topTarget = `  let borrowChartInstance = null;
  let dashboardTrendChartInstance = null;
  // dashboardCategoryChartInstance declared at top
  // shelvesData declared at top
  let shelfSearchTimer = null;
  // auditLogsList declared at top
  let auditSearchTimer = null;
  // devicesData declared at top
  // studyRoomsData declared at top
  // lockersData declared at top
  let inventoryList = [];
  let memberData = [];
  let activePoBudgetInfo = null;`;

const topReplacement = `  let borrowChartInstance = null;
  let dashboardTrendChartInstance = null;
  let dashboardCategoryChartInstance = null;
  let shelvesData = [];
  let shelfSearchTimer = null;
  let auditLogsList = [];
  let auditSearchTimer = null;
  let devicesData = [];
  let deviceLoansData = [];
  let deviceMaintenancesData = [];
  let studyRoomsData = [];
  let roomBookingsData = [];
  let lockersData = [];
  let overdueLockersData = [];
  let inventoryList = [];
  let memberData = [];
  let activePoBudgetInfo = null;`;

code = code.replace(topTarget.replace(/\r?\n/g, '\r\n'), topReplacement.replace(/\r?\n/g, '\r\n'));
code = code.replace(topTarget.replace(/\r?\n/g, '\n'), topReplacement.replace(/\r?\n/g, '\n'));

// 2. Remove downstream declarations
// Remove downstream shelvesData
const shelvesDownstream = `  // ==========================================
  // TÍNH NĂNG: QUẢN LÝ SƠ ĐỒ KỆ SÁCH (SHELVES)
  // ==========================================
  let shelvesData = [];`;
const shelvesDownstreamRepl = `  // ==========================================
  // TÍNH NĂNG: QUẢN LÝ SƠ ĐỒ KỆ SÁCH (SHELVES)
  // ==========================================
  // shelvesData declared at top`;
code = code.replace(shelvesDownstream.replace(/\r?\n/g, '\r\n'), shelvesDownstreamRepl.replace(/\r?\n/g, '\r\n'));
code = code.replace(shelvesDownstream.replace(/\r?\n/g, '\n'), shelvesDownstreamRepl.replace(/\r?\n/g, '\n'));

// Remove downstream auditLogsList
const auditDownstream = `  // ==========================================
  // TÍNH NĂNG: NHẬT KÝ HỆ THỐNG (AUDIT LOGS)
  // ==========================================
  let auditLogsList = [];`;
const auditDownstreamRepl = `  // ==========================================
  // TÍNH NĂNG: NHẬT KÝ HỆ THỐNG (AUDIT LOGS)
  // ==========================================
  // auditLogsList declared at top`;
code = code.replace(auditDownstream.replace(/\r?\n/g, '\r\n'), auditDownstreamRepl.replace(/\r?\n/g, '\r\n'));
code = code.replace(auditDownstream.replace(/\r?\n/g, '\n'), auditDownstreamRepl.replace(/\r?\n/g, '\n'));

// Remove downstream devicesData
const devicesDownstream = `  // --- TRANG 1: QUẢN LÝ THIẾT BỊ (DEVICES) ---
  let devicesData = [];
  let deviceLoansData = [];
  let deviceMaintenancesData = [];`;
const devicesDownstreamRepl = `  // --- TRANG 1: QUẢN LÝ THIẾT BỊ (DEVICES) ---
  // devicesData, deviceLoansData, deviceMaintenancesData declared at top`;
code = code.replace(devicesDownstream.replace(/\r?\n/g, '\r\n'), devicesDownstreamRepl.replace(/\r?\n/g, '\r\n'));
code = code.replace(devicesDownstream.replace(/\r?\n/g, '\n'), devicesDownstreamRepl.replace(/\r?\n/g, '\n'));

// Remove downstream studyRoomsData
const studyDownstream = `  // --- TRANG 2: PHÒNG HỌC NHÓM (STUDY ROOMS) ---
  let studyRoomsData = [];
  let roomBookingsData = [];`;
const studyDownstreamRepl = `  // --- TRANG 2: PHÒNG HỌC NHÓM (STUDY ROOMS) ---
  // studyRoomsData, roomBookingsData declared at top`;
code = code.replace(studyDownstream.replace(/\r?\n/g, '\r\n'), studyDownstreamRepl.replace(/\r?\n/g, '\r\n'));
code = code.replace(studyDownstream.replace(/\r?\n/g, '\n'), studyDownstreamRepl.replace(/\r?\n/g, '\n'));

// Remove downstream lockersData
const lockersDownstream = `  // --- TRANG 3: TỦ KHÓA CÁ NHÂN (LOCKERS) ---
  let lockersData = [];
  let overdueLockersData = [];`;
const lockersDownstreamRepl = `  // --- TRANG 3: TỦ KHÓA CÁ NHÂN (LOCKERS) ---
  // lockersData, overdueLockersData declared at top`;
code = code.replace(lockersDownstream.replace(/\r?\n/g, '\r\n'), lockersDownstreamRepl.replace(/\r?\n/g, '\r\n'));
code = code.replace(lockersDownstream.replace(/\r?\n/g, '\n'), lockersDownstreamRepl.replace(/\r?\n/g, '\n'));

// Remove downstream dashboardCategoryChartInstance
code = code.replace(/let dashboardCategoryChartInstance = null;/, '// dashboardCategoryChartInstance declared at top');

fs.writeFileSync('public/app.js', code, 'utf8');
console.log('Fixed variable positions successfully!');

