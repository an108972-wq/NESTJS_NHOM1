
// Khai báo sớm fetchJson và formatDateTime trên window để tương thích ngược mọi phân hệ và tránh lỗi 'fetchJson / formatDateTime is not defined'
var fetchJson = window.fetchJson;
var formatDateTime = window.formatDateTime;
var money = window.money;
var date = window.date;
var escapeHtml = window.escapeHtml;

window.fetchJson = async function fetchJson(path, options = {}) {
  if (typeof window.api === 'function') return window.api(path, options);
  const token = localStorage.getItem('accessToken');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers || {}),
  };
  const base = window.location.origin;
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : '/' + path}`;
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const msg = Array.isArray(data?.message) ? data.message.join(', ') : data?.message;
    throw new Error(msg || `Yêu cầu thất bại (${res.status})`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json().catch(() => null) : null;
};

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
}
window.formatDateTime = formatDateTime;

function readMoneyInVietnameseWords(amount) {
  amount = Math.round(Number(amount) || 0);
  if (amount <= 0) return 'Không đồng';
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const units = ['', 'nghìn', 'triệu', 'tỷ'];

  function readThreeDigits(num, isLeading) {
    const h = Math.floor(num / 100);
    const t = Math.floor((num % 100) / 10);
    const o = num % 10;
    let res = '';
    if (h > 0 || !isLeading) res += digits[h] + ' trăm ';
    if (t > 1) {
      res += digits[t] + ' mươi ';
      if (o === 1) res += 'mốt ';
      else if (o === 5) res += 'lăm ';
      else if (o > 0) res += digits[o] + ' ';
    } else if (t === 1) {
      res += 'mười ';
      if (o === 5) res += 'lăm ';
      else if (o > 0) res += digits[o] + ' ';
    } else if (t === 0 && o > 0) {
      if (!isLeading || h > 0) res += 'lẻ ' + digits[o] + ' ';
      else res += digits[o] + ' ';
    }
    return res.trim();
  }

  let chunks = [];
  let temp = amount;
  while (temp > 0) {
    chunks.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  let words = [];
  for (let i = chunks.length - 1; i >= 0; i--) {
    const chunk = chunks[i];
    if (chunk > 0) {
      const chunkText = readThreeDigits(chunk, i === chunks.length - 1);
      words.push(chunkText + (units[i] ? ' ' + units[i] : ''));
    }
  }
  const result = words.join(' ').trim();
  return result.charAt(0).toUpperCase() + result.slice(1) + ' đồng chẵn';
}

function escapeRegExp(string) {
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function openElectronicReceiptModal(payment) {
  if (!payment) return;
  const methodLabels = {
    CASH: 'Tiền mặt tại quầy',
    VIETQR: 'Chuyển khoản VietQR Napas247',
    E_WALLET: 'Ví điện tử (MoMo / ZaloPay / VNPAY)',
    VNPAY: 'Cổng VNPAY',
    MANUAL: 'Thu thủ công tại quầy',
  };

  if ($('receiptTxnRef')) $('receiptTxnRef').textContent = payment.txnRef || '—';
  if ($('receiptDate')) $('receiptDate').textContent = date(payment.paidAt || payment.createdAt);
  if ($('receiptReaderName')) $('receiptReaderName').textContent = payment.readerName || 'Độc giả';
  if ($('receiptReaderPhone')) $('receiptReaderPhone').textContent = payment.readerPhone || payment.readerEmail || '—';
  if ($('receiptCardNumber')) $('receiptCardNumber').textContent = payment.cardNumber || ('TV-' + (payment.readerId || ''));
  if ($('receiptBookTitle')) $('receiptBookTitle').textContent = payment.bookTitle || 'Khoản thu vi phạm thư viện';
  if ($('receiptBarcode')) $('receiptBarcode').textContent = payment.barcode || '—';
  if ($('receiptReason')) $('receiptReason').textContent = payment.violationType
    ? ('Bồi thường vi phạm: ' + payment.violationType)
    : (payment.borrowRecordId ? ('Phí quá hạn & hoàn trả phiếu mượn #' + payment.borrowRecordId) : 'Phạt vi phạm quy định thư viện');
  if ($('receiptMethod')) $('receiptMethod').textContent = methodLabels[payment.paymentMethod] || payment.paymentMethod || 'Tiền mặt';

  const amount = Number(payment.amount || 0);
  if ($('receiptAmount')) $('receiptAmount').textContent = money(amount);
  if ($('receiptAmountWords')) $('receiptAmountWords').textContent = '(Bằng chữ: ' + readMoneyInVietnameseWords(amount) + ')';
  if ($('receiptCashier')) $('receiptCashier').textContent = state.user?.fullName || state.user?.username || 'Thủ thư quầy';

  const qrContainer = $('receiptQrContainer');
  if (qrContainer) {
    const qrData = encodeURIComponent('https://thuvien.edu.vn/receipt/' + payment.txnRef);
    qrContainer.innerHTML = '<img src="https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=' + qrData + '" alt="Mã tra cứu biên lai" style="width:68px;height:68px;border-radius:4px;" onerror="this.parentElement.textContent=\'QR Tra cứu\'">';
  }

  const unlockBadge = $('receiptUnlockBadge');
  if (unlockBadge) {
    if (payment.accountUnlocked) {
      unlockBadge.style.display = 'flex';
      if ($('receiptUnlockMessage') && payment.unlockMessage) {
        $('receiptUnlockMessage').textContent = payment.unlockMessage;
      }
    } else {
      unlockBadge.style.display = 'none';
    }
  }

  $('receiptDialog')?.showModal();
}


let compensationTargetInput = 'damageFineAmount';

function updateCompensationCalculation() {
  const price = Number($('calcBookPrice')?.value || 0);
  const wear = Number($('calcWearFactor')?.value || 1.0);
  const severity = Number($('calcDamageSeverity')?.value || 1.0);
  const fee = Number($('calcProcessingFee')?.value || 0);

  const residual = Math.round(price * wear);
  const directLoss = Math.round(residual * severity);
  const total = directLoss + fee;

  if ($('calcResidualValue')) $('calcResidualValue').textContent = money(residual);
  if ($('calcDirectLoss')) $('calcDirectLoss').textContent = money(directLoss);
  if ($('calcFeeDisplay')) $('calcFeeDisplay').textContent = money(fee);
  if ($('calcTotalCompensation')) $('calcTotalCompensation').textContent = money(total);

  return total;
}

function openCompensationCalculator(targetInput = 'damageFineAmount', defaultPrice = 100000, bookTitle = '') {
  compensationTargetInput = targetInput;
  if ($('calcBookPrice')) $('calcBookPrice').value = defaultPrice || 100000;
  if ($('calcWearFactor')) $('calcWearFactor').value = '1.0';
  if ($('calcDamageSeverity')) {
    const condition = $('returnCondition')?.value;
    if (condition === 'LIGHT_DAMAGE') $('calcDamageSeverity').value = '0.25';
    else if (condition === 'SEVERE_DAMAGE') $('calcDamageSeverity').value = '0.60';
    else if (condition === 'LOST') $('calcDamageSeverity').value = '1.00';
  }
  updateCompensationCalculation();
  $('compensationDialog')?.showModal();
}

(() => {
  const API_URL = window.location.origin;
  const ADMIN_ROUTE_PATHS = Object.freeze({
    '/admin/dashboard': 'dashboard',
    '/admin/books': 'books',
    '/admin/loans': 'loans',
    '/admin/borrow': 'loans',
    '/admin/borrow-return': 'loans',
    '/admin/readers': 'readers',
    '/admin/users': 'readers',
    '/admin/categories': 'categories',
    '/admin/publishers': 'publishers',
    '/admin/reports': 'reports',
    '/admin/fines': 'fines',
    '/admin/reservations': 'reservations',
    '/admin/settings': 'settings',
    '/admin/staffs': 'staffs',
    '/admin/audit-logs': 'audit-logs',
    '/admin/inventory-audit': 'inventory-audit',
    '/admin/shelves': 'shelves',
    '/admin/acquisitions': 'acquisitions',
    '/opac': 'opac',
    '/admin/elibrary': 'elibrary',
    '/admin/budgets': 'budgets',
    '/admin/notification-templates': 'notification-templates',
    '/admin/devices': 'devices',
    '/admin/study-rooms': 'study-rooms',
    '/study-rooms': 'study-rooms',
    '/admin/lockers': 'lockers',
    '/admin/events-announcements': 'events-announcements',
    '/admin/events': 'events-announcements',
    '/admin/feedback': 'feedback',
    '/admin/tutorials': 'tutorials',
    '/admin/partners': 'partners',
    '/admin/iot-monitoring': 'iot-monitoring',
    '/admin/iot': 'iot-monitoring',
    '/admin/theses': 'theses',
    '/admin/multimedia': 'multimedia',
    '/admin/seminars': 'seminars',
    '/admin/exchange-grants': 'exchange-grants',
    '/admin/shift-schedules': 'shift-schedules',
    '/admin/staff-kpi': 'staff-kpi',
  });
  const state = {
    myFavoriteIds: new Set(),
    page: 1,
    lastPage: 1,
    categoryId: '',
    books: [],
    categories: [],
    selectedCategoryIds: new Set(),
    publishers: [],
    users: [],
    reservations: [],
    reservationFilter: 'all',
    reservationBookResults: [],
    reservationBookSearchTimer: 0,
    reservationCountdownTimer: 0,
    user: null,
    stats: null,
    settings: null,
    borrowRecords: [],
    borrowFilter: 'all',
    borrowPage: 1,
    borrowPageSize: 10,
    staffBorrowBarcodes: [],
    dashboardRecords: [],
    readerProfileUser: null,
    fines: null,
    manualFineReaders: [],
    pendingFineCollection: null,
    pendingBookId: null,
    pendingPublisherDeleteId: null,
    toastTimer: 0,
    searchTimer: 0,
    globalSearchTimer: 0,
    suggestionRequestIds: {},
    copyBookId: null,
    batchLabels: [],
    batchLabelBookIds: [],
    batchLabelRequestId: 0,
    currentDetailBookId: null,
    refreshPromise: null,
    pendingMfaToken: null,
  };
  let borrowChartInstance = null;
  let dashboardTrendChartInstance = null;
  // dashboardCategoryChartInstance declared at top
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
  let activePoBudgetInfo = null;
  const $ = (id) => document.getElementById(id);
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
  const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')} ₫`;
  const date = (value) => {
    if (!value) return '—';
    const dateOnly = typeof value === 'string' && value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return dateOnly
      ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])).toLocaleDateString('vi-VN')
      : new Date(value).toLocaleDateString('vi-VN');
  };
  // formatDateTime đã được khai báo ở đầu file (line 22) và gán window.formatDateTime
  window.formatDateTime = formatDateTime;
  window.money = money;
  window.date = date;
  window.escapeHtml = escapeHtml;
  const token = () => localStorage.getItem('accessToken');
  const headers = () => ({
    'Content-Type': 'application/json',
    ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
  });

  async function refreshAccessToken() {
    if (state.refreshPromise) return state.refreshPromise;
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;
    state.refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!response.ok) return false;
        const tokens = await response.json();
        if (!tokens.accessToken || !tokens.refreshToken) return false;
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        const refreshedUser = decodeUser(tokens.accessToken);
        if (!refreshedUser) return false;
        state.user = refreshedUser;
        const profileName = document.querySelector('.profile-copy strong');
        const roleBadge = document.querySelector('.profile-copy .role-badge');
        if (profileName) profileName.textContent = refreshedUser.username;
        if (roleBadge) roleBadge.textContent = refreshedUser.role;
        return true;
      } catch {
        return false;
      } finally {
        state.refreshPromise = null;
      }
    })();
    return state.refreshPromise;
  }

  async function renewProfileLoan(recordId) {
    if (isStaff() || !state.user) return;
    if (!window.confirm('Gửi yêu cầu gia hạn phiếu mượn này theo thời hạn của thư viện?')) return;
    try {
      await api(`/borrow/${recordId}/renew`, { method: 'POST' });
      notify('Gia hạn mượn đã được xử lý thành công.');
      await Promise.all([loadReaderProfile(state.user.id), loadBorrowRecords()]);
    } catch (error) {
      notify(`Không thể gia hạn phiếu mượn: ${error.message}`, true);
    }
  }

  async function api(path, options = {}) {
    const request = () => {
      const requestHeaders = { ...headers(), ...(options.headers || {}) };
      if (options.body instanceof FormData) delete requestHeaders['Content-Type'];
      return fetch(`${API_URL}${path}`, {
        ...options,
        headers: requestHeaders,
      });
    };
    let response = await request();
    let sessionExpired = false;
    if (response.status === 401 && !path.startsWith('/auth/')) {
      if (await refreshAccessToken()) response = await request();
      if (response.status === 401) {
        sessionExpired = true;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        state.user = null;
        showSession();
      }
    }
    const contentType = response.headers.get('content-type') || '';
    const result = contentType.includes('application/json') ? await response.json() : null;
    if (!response.ok) {
      if (sessionExpired) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      const message = Array.isArray(result?.message) ? result.message.join(', ') : result?.message;
      throw new Error(message || `Yêu cầu thất bại (${response.status})`);
    }
    return result;
  }

  // Bí danh tương thích cho các phân hệ tiện ích & tài sản
  var fetchJson = api;
  window.fetchJson = api;
  window.api = api;

  function notify(message, isError = false) {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.toggle('error', isError);
    toast.classList.add('visible');
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 3600);
  }

  function decodeUser(accessToken) {
    try {
      const payload = accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const decoded = JSON.parse(decodeURIComponent(Array.from(atob(payload), (character) =>
        `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`).join('')));
      if (!decoded.sub || !decoded.username || (!decoded.role && !decoded.roles)) return null;
      const role = decoded.role || (Array.isArray(decoded.roles) ? decoded.roles[0] : 'READER');
      const roles = Array.isArray(decoded.roles) ? decoded.roles : [role];
      return { id: Number(decoded.sub), username: decoded.username, role, roles };
    } catch {
      return null;
    }
  }

  function isStaff() {
    return state.user && [
      'ADMIN',
      'LIBRARIAN',
      'COUNTER_LIBRARIAN',
      'INVENTORY_LIBRARIAN',
    ].includes(state.user.role);
  }

  function isCounterStaff() {
    return state.user && ['ADMIN', 'LIBRARIAN', 'COUNTER_LIBRARIAN'].includes(state.user.role);
  }

  function isInventoryStaff() {
    return state.user && ['ADMIN', 'LIBRARIAN', 'INVENTORY_LIBRARIAN'].includes(state.user.role);
  }

  function isAdmin() {
    return state.user?.role === 'ADMIN';
  }

  function roleTitle(role) {
    return ({
      ADMIN: 'Super Admin',
      LIBRARIAN: 'Thủ thư (toàn quyền)',
      COUNTER_LIBRARIAN: 'Thủ thư quầy',
      INVENTORY_LIBRARIAN: 'Thủ thư kho',
      READER: 'Độc giả',
    })[role] || role;
  }

  function canAccessAdminRoute(route) {
    if (!isStaff()) return false;
    if (['dashboard', 'reports', 'budgets', 'shelves', 'devices', 'study-rooms', 'lockers', 'events-announcements', 'feedback', 'tutorials', 'partners', 'iot-monitoring', 'theses', 'multimedia', 'seminars', 'exchange-grants', 'shift-schedules', 'staff-kpi'].includes(route)) return true;
    if (['books', 'categories', 'publishers', 'inventory-audit', 'acquisitions', 'elibrary'].includes(route)) return isInventoryStaff();
    if (['loans', 'readers', 'reservations', 'fines', 'reader-profile'].includes(route)) {
      return isCounterStaff();
    }
    return isAdmin() && ['settings', 'staffs', 'audit-logs', 'notification-templates'].includes(route);
  }

  function syncAdminRoute() {
    let path = window.location.pathname.replace(/\/+$/, '') || '/';
    const searchParams = new URLSearchParams(window.location.search);
    const queryId = searchParams.get('id');

    // Hỗ trợ truy cập nhanh qua tham số URL id=9 hoặc url?id=9 tới trang Sơ đồ kệ sách
    if (queryId === '9' || searchParams.get('route') === 'shelves') {
      if (isStaff() && (path === '/' || path === '/admin' || path === '/admin/dashboard')) {
        window.history.replaceState({}, '', '/admin/shelves?id=9');
        path = '/admin/shelves';
      }
    }

    const isAdminPath = path === '/admin' || path.startsWith('/admin/');
    const profileMatch = path.match(/^\/admin\/users\/(\d+)$/);
    const selfProfile = path === '/profile' && state.user?.role === 'READER';

    if (path === '/register' && state.user) {
      window.history.replaceState({}, '', isStaff() ? '/admin/dashboard' : '/search');
      path = isStaff() ? '/admin/dashboard' : '/search';
    } else if (isAdminPath && !isStaff()) {
      if (state.user && state.user.role === 'READER') {
        window.history.replaceState({}, '', '/opac');
        path = '/opac';
      }
      // Nếu chưa đăng nhập (!state.user), giữ nguyên path để hiển thị form đăng nhập AdminLTE chuyên biệt
    } else if (isStaff() && !isAdminPath && path !== '/search') {
      window.history.replaceState({}, '', '/admin/dashboard');
      path = '/admin/dashboard';
    } else if (path === '/admin' || path === '/admin/') {
      window.history.replaceState({}, '', '/admin/dashboard');
      path = '/admin/dashboard';
    }

    let route = profileMatch || selfProfile
      ? 'reader-profile'
      : (path === '/opac' || (!isStaff() && (path === '/' || path === '/search')))
        ? 'opac'
        : path.startsWith('/admin/')
          ? ADMIN_ROUTE_PATHS[path] || 'dashboard'
          : null;
    if (path === '/profile' && !state.user) {
      window.history.replaceState({}, '', '/');
      path = '/';
      route = null;
    }
    if (route && !(route === 'reader-profile' && selfProfile) && !canAccessAdminRoute(route)) {
      window.history.replaceState({}, '', '/admin/dashboard');
      path = '/admin/dashboard';
      route = isStaff() ? 'dashboard' : null;
    }
    if (path.startsWith('/admin/') && !profileMatch && !ADMIN_ROUTE_PATHS[path]) {
      window.history.replaceState({}, '', '/admin/dashboard');
      path = '/admin/dashboard';
      route = 'dashboard';
    }

    document.body.classList.toggle('admin-route-active', Boolean(route));
    if (route || path === '/search') $('welcome').hidden = true;
    document.querySelectorAll('[data-admin-route]').forEach((section) => {
      const visibleOnRoute = route
        ? section.dataset.adminRoute === route &&
        (route === 'opac' ? true : route === 'reader-profile' ? isCounterStaff() || Boolean(selfProfile) : Boolean(isStaff()))
        : !section.dataset.adminRoute ||
        (path === '/search'
          ? section.id === 'books'
          : ['books', 'loans', 'reservations'].includes(section.dataset.adminRoute) && !isStaff());
      const roleAllowed = !section.classList.contains('admin-only') || isAdmin();
      const staffAllowed = !section.classList.contains('staff-only') || isStaff();
      section.hidden = !visibleOnRoute || !roleAllowed || !staffAllowed;
    });
    document.querySelectorAll('[data-admin-nav]').forEach((link) => {
      if (link.dataset.adminNav === route) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });

    if (route === 'reports') {
      if (isStaff()) void loadAdvancedReports();
      else if (state.stats) window.requestAnimationFrame(() => drawBorrowChart(state.stats.topBooks));
    }
    if (route === 'dashboard' && isStaff()) void loadDashboardBorrowRecords();
    if (route === 'loans' && isCounterStaff()) {
      if (!state.settings) void loadSettings(false);
      void loadBorrowRecords();
    }
    if (route === 'reservations' && isCounterStaff()) void loadReservations();
    if (route === 'fines' && isCounterStaff()) void loadFines();
    if (route === 'settings' && isAdmin()) void loadSettings();
    if (route === 'readers' && isCounterStaff() && !state.settings) void loadSettings(false);
    if (route === 'staffs' && isAdmin()) void loadStaffs();
    if (route === 'opac' || path === '/opac') {
      void loadOpacPortal();
      void loadAiRecommendations();
      void initAiChatbot();
    }
    if (route === 'books' && isInventoryStaff()) void initBookOcr();
    if (route === 'elibrary' && isInventoryStaff()) void loadElibrary();
    if (route === 'budgets' && isStaff()) {
      void loadBudgets();
      void loadAiDemandForecast();
    }
    if (route === 'notification-templates' && isAdmin()) void loadNotificationTemplates();
    if (route === 'acquisitions' && isInventoryStaff()) {
      void loadAcquisitions();
      void loadPurchaseOrders();
      void loadApprovedPublisherGroups();
      void loadAiDemandForecast();
    }
    if (route === 'shelves') void loadShelves();
    if (route === 'devices') void loadDevices();
    if (route === 'study-rooms') void loadStudyRooms();
    if (route === 'lockers') void loadLockers();
    if (route === 'events-announcements' && isStaff()) void loadEvents();
    if (route === 'feedback' && isStaff()) void loadFeedback();
    if (route === 'tutorials' && isStaff()) void loadTutorials();
    if (route === 'partners' && isStaff()) void loadPartners();
    if (route === 'iot-monitoring' && isStaff()) void loadIotDevices();
    if (route === 'theses' && isStaff()) void loadTheses();
    if (route === 'multimedia' && isStaff()) void loadMultimedia();
    if (route === 'seminars' && isStaff()) void loadSeminars();
    if (route === 'exchange-grants' && isStaff()) void loadExchangeGrants();
    if (route === 'shift-schedules' && isStaff()) void loadShiftSchedules();
    if (route === 'staff-kpi' && isStaff()) void loadStaffKpi();
    if (route === 'audit-logs' && isAdmin()) void loadAuditLogs();
    if (route === 'inventory-audit' && isStaff()) {
      void loadAuditExpected();
      setTimeout(() => $('auditBarcodeInput')?.focus(), 200);
    }
    if (route === 'reader-profile' && (isCounterStaff() || selfProfile)) {
      void loadReaderProfile(selfProfile ? state.user.id : Number(profileMatch[1]));
    }
    return route;
  }

  function navigateAdmin(path) {
    const profileMatch = path.match(/^\/admin\/users\/(\d+)$/);
    const route = profileMatch ? 'reader-profile' : ADMIN_ROUTE_PATHS[path];
    if (!canAccessAdminRoute(route)) {
      notify('Bạn cần đăng nhập bằng tài khoản Admin hoặc Thủ thư.', true);
      return;
    }
    window.history.pushState({}, '', path);
    syncAdminRoute();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.body.classList.remove('sidebar-open');
  }

  function showSession() {
    const signedIn = Boolean(state.user);
    const isAdminPage = window.location.pathname.startsWith('/admin') || document.body.classList.contains('admin-layout');
    document.body.classList.toggle('admin-layout', Boolean(isStaff() || isAdminPage));

    // Đồng bộ hiển thị form đăng nhập Quản trị viên chuyên biệt
    const adminOverlay = document.getElementById('adminAuthOverlay');
    if (adminOverlay) {
      if (signedIn && isStaff()) {
        adminOverlay.style.display = 'none';
      } else if (signedIn && !isStaff()) {
        notify('Tài khoản Độc giả không có quyền quản trị. Đang chuyển về Cổng OPAC...', true);
        setTimeout(() => { window.location.href = '/opac'; }, 500);
        return;
      } else {
        adminOverlay.style.display = 'flex';
      }
    }
    $('adminSidebar').hidden = !isStaff();
    $('authPanel').hidden = signedIn;
    $('welcome').hidden = !signedIn || Boolean(isStaff());
    $('welcomeName').textContent = state.user?.username || '';
    $('accountArea').innerHTML = signedIn
      ? `<div class="profile-menu-wrap"><button id="profileButton" class="profile-trigger" type="button" aria-expanded="false" aria-haspopup="menu"><span class="avatar">${escapeHtml(state.user.username.slice(0, 1).toUpperCase())}</span><span class="profile-copy"><strong>${escapeHtml(state.user.username)}</strong><span class="role-badge">${escapeHtml(roleTitle(state.user.role))}</span></span><span class="profile-caret" aria-hidden="true">⌄</span></button><div id="profileDropdown" class="profile-dropdown" role="menu" hidden><div class="dropdown-identity"><strong>${escapeHtml(state.user.username)}</strong><span>${escapeHtml(roleTitle(state.user.role))}</span></div>${!isStaff() ? `<a class="profile-link" data-self-profile href="/profile" role="menuitem">Hồ sơ & lịch sử</a>` : ''}<button id="logoutButton" role="menuitem" type="button">Đăng xuất</button></div></div>`
      : '<button id="openLogin" class="button button-light" type="button">Đăng nhập</button>';
    document.querySelectorAll('.staff-only').forEach((element) => {
      element.hidden = !isStaff();
    });
    document.querySelectorAll('.admin-only').forEach((element) => {
      element.hidden = !isAdmin();
    });
    document.querySelectorAll('.counter-only').forEach((element) => {
      element.hidden = !isCounterStaff();
    });
    document.querySelectorAll('.inventory-only').forEach((element) => {
      element.hidden = !isInventoryStaff();
    });
    document.querySelectorAll('.reader-only').forEach((element) => {
      element.hidden = !state.user || isStaff();
    });
    $('dashboard').hidden = !isStaff();
    $('newBookButton').hidden = !isInventoryStaff();
    $('books').querySelector('.section-heading h2').textContent =
      isInventoryStaff() ? 'Quản lý sách' : 'Khám phá sách';
    $('loanHeading').textContent = isCounterStaff() ? 'Quản lý mượn - trả' : 'Phiếu mượn của tôi';
    $('loanDescription').textContent = isCounterStaff()
      ? 'Duyệt yêu cầu, xác nhận trả sách và theo dõi tiền phạt.'
      : 'Theo dõi trạng thái, gia hạn và tiền phạt.';
    $('newUserRole').innerHTML = '<option value="READER">Độc giả</option>';
    $('openLogin')?.addEventListener('click', () => $('authUsername').focus());
    $('logoutButton')?.addEventListener('click', () => void logout());
    document.querySelector('[data-self-profile]')?.addEventListener('click', (event) => {
      event.preventDefault();
      window.history.pushState({}, '', '/profile');
      syncAdminRoute();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      $('profileDropdown').hidden = true;
    });
    $('profileButton')?.addEventListener('click', () => {
      const dropdown = $('profileDropdown');
      dropdown.hidden = !dropdown.hidden;
      $('profileButton').setAttribute('aria-expanded', String(!dropdown.hidden));
    });
    if (signedIn) {
      void loadBorrowRecords();
      void loadReservations();
      void loadNotifications();
    } else {
      $('borrowList').innerHTML = '<tr><td colspan="6">Đăng nhập để xem phiếu mượn.</td></tr>';
      $('reservationList').innerHTML = '<tr><td colspan="4">Đăng nhập để xem yêu cầu đặt giữ.</td></tr>';
      $('notificationCount').hidden = true;
    }
    if (isStaff()) { void loadDashboard(); void loadStaffSystemAlerts(); }
    if (isCounterStaff()) {
      void loadUsers();
    }
    if (isInventoryStaff()) {
      void loadPublishers();
    }
    syncAdminRoute();
  }


  // SSO LOGIN (GOOGLE / MICROSOFT / LMS)
  async function handleSsoLogin(provider) {
    try {
      const data = await api('/auth/sso', {
        method: 'POST',
        body: JSON.stringify({ provider }),
      });
      localStorage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
      state.user = data.user || parseJwt(data.accessToken);
      notify(`Đăng nhập thành công qua ${provider.toUpperCase()}!`);
      syncAuthUI();
      if (isStaff()) {
        notify('Đăng nhập SSO thành công! Đang chuyển hướng vào Trang Quản Trị AdminLTE...');
        setTimeout(() => {
          window.location.href = '/admin/dashboard';
        }, 350);
      } else {
        window.history.pushState({}, '', '/opac');
        syncAdminRoute();
      }
      syncAdminRoute();
    } catch (e) {
      notify(`Lỗi đăng nhập SSO: ${e.message}`, true);
    }
  }

  async function loadAuthCaptcha() {
    try {
      const res = await api('/auth/captcha');
      $('authCaptchaQuestion').textContent = res.question;
      $('authCaptchaId').value = res.captchaId;
      $('authCaptchaAnswer').value = '';
    } catch (_) { }
  }

  async function login(event) {
    event.preventDefault();
    const username = $('authUsername').value.trim();
    const password = $('authPassword').value;
    const rememberMe = Boolean($('rememberMe')?.checked);
    const captchaGroup = $('authCaptchaGroup');
    const isCaptchaActive = captchaGroup && !captchaGroup.hidden;

    const payload = {
      username,
      password,
      rememberMe,
      ...(isCaptchaActive ? {
        captchaId: $('authCaptchaId').value,
        captchaAnswer: $('authCaptchaAnswer').value.trim(),
      } : {}),
    };

    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Nếu tài khoản yêu cầu xác thực 2 bước (MFA/2FA cho Admin/Thủ thư)
      if (data.requiresMfa) {
        state.pendingMfaToken = data.mfaToken;
        if ($('mfaDebugHint')) {
          if (data.debugCode) {
            $('mfaDebugCode').textContent = data.debugCode;
            $('mfaDebugHint').hidden = false;
          } else {
            $('mfaDebugHint').hidden = true;
          }
        }
        $('mfaCode').value = '';
        $('mfaDialog').showModal();
        notify(data.message || 'Vui lòng nhập mã xác thực 2FA.');
        return;
      }

      // Xử lý Ghi nhớ tài khoản (Remember Me)
      if (rememberMe) {
        localStorage.setItem('savedUsername', username);
      } else {
        localStorage.removeItem('savedUsername');
      }

      localStorage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
      state.user = decodeUser(data.accessToken);
      if (!state.user) throw new Error('Không thể đọc thông tin vai trò từ access token');
      if (captchaGroup) captchaGroup.hidden = true;
      showSession();
      notify('Đăng nhập thành công.');
      if (isStaff()) {
        notify('Đăng nhập thành công! Đang chuyển hướng vào Trang Quản Trị AdminLTE...');
        if (window.location.pathname.startsWith('/admin')) {
          const targetPath = (data.redirectUrl && data.redirectUrl.startsWith('/admin')) ? data.redirectUrl : '/admin/dashboard';
          if (document.getElementById('adminAuthOverlay')) document.getElementById('adminAuthOverlay').style.display = 'none';
          navigateAdmin(targetPath);
        } else {
          setTimeout(() => {
            window.location.href = '/admin/dashboard';
          }, 350);
        }
        return;
      } else {
        if (window.location.pathname.startsWith('/admin')) {
          notify('Tài khoản Độc giả không có quyền quản trị. Đang chuyển về Cổng OPAC...');
          setTimeout(() => {
            window.location.href = '/opac';
          }, 500);
          return;
        }
        if (data.redirectUrl) {
          window.history.pushState({}, '', data.redirectUrl);
          syncAdminRoute();
        }
      }
    } catch (error) {
      // Nếu server yêu cầu Captcha hoặc có cảnh báo nhập sai liên tiếp
      if (error.message && (error.message.includes('Captcha') || error.message.includes('lần') || error.message.includes('khóa'))) {
        if (captchaGroup) {
          captchaGroup.hidden = false;
          await loadAuthCaptcha();
        }
      }
      notify(error.message, true);
    }
  }

  async function handleMfaVerification(event) {
    event.preventDefault();
    if (!state.pendingMfaToken) return notify('Phiên xác thực không tồn tại.', true);
    const code = $('mfaCode').value.trim();
    try {
      const data = await api('/auth/verify-2fa', {
        method: 'POST',
        body: JSON.stringify({
          mfaToken: state.pendingMfaToken,
          code,
        }),
      });

      const rememberMe = Boolean($('rememberMe')?.checked);
      if (rememberMe) {
        localStorage.setItem('savedUsername', $('authUsername').value.trim());
      }

      localStorage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
      state.user = decodeUser(data.accessToken);
      state.pendingMfaToken = null;
      $('mfaDialog').close();
      if ($('authCaptchaGroup')) $('authCaptchaGroup').hidden = true;
      showSession();
      notify('Xác thực 2FA thành công! Chào mừng bạn trở lại.');
      if (isStaff()) {
        notify('Đăng nhập thành công! Đang chuyển hướng vào Trang Quản Trị AdminLTE...');
        if (window.location.pathname.startsWith('/admin')) {
          const targetPath = (data.redirectUrl && data.redirectUrl.startsWith('/admin')) ? data.redirectUrl : '/admin/dashboard';
          if (document.getElementById('adminAuthOverlay')) document.getElementById('adminAuthOverlay').style.display = 'none';
          navigateAdmin(targetPath);
        } else {
          setTimeout(() => {
            window.location.href = '/admin/dashboard';
          }, 350);
        }
        return;
      } else {
        if (window.location.pathname.startsWith('/admin')) {
          notify('Tài khoản Độc giả không có quyền quản trị. Đang chuyển về Cổng OPAC...');
          setTimeout(() => {
            window.location.href = '/opac';
          }, 500);
          return;
        }
        if (data.redirectUrl) {
          window.history.pushState({}, '', data.redirectUrl);
          syncAdminRoute();
        }
      }
    } catch (err) {
      notify(err.message, true);
    }
  }

  async function handleForgotStep1(event) {
    event.preventDefault();
    const identifier = $('forgotIdentifier').value.trim();
    try {
      const res = await api('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ usernameOrEmail: identifier }),
      });
      notify(res.message || 'Mã OTP đã được tạo.');
      if (res.debugOtp) {
        $('forgotDebugOtp').textContent = res.debugOtp;
        $('forgotDebugHint').hidden = false;
      } else {
        $('forgotDebugHint').hidden = true;
      }
      $('resetOtp').value = res.debugOtp || '';
      $('forgotStep1Form').hidden = true;
      $('forgotStep2Form').hidden = false;
    } catch (err) {
      notify(err.message, true);
    }
  }

  async function handleForgotStep2(event) {
    event.preventDefault();
    const identifier = $('forgotIdentifier').value.trim();
    const otp = $('resetOtp').value.trim();
    const newPassword = $('resetNewPassword').value;
    const confirmPassword = $('resetConfirmPassword').value;

    if (newPassword !== confirmPassword) {
      return notify('Mật khẩu xác nhận không khớp. Vui lòng nhập lại.', true);
    }

    try {
      const res = await api('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          usernameOrEmail: identifier,
          otp,
          newPassword,
        }),
      });
      notify(res.message || 'Đặt lại mật khẩu thành công!');
      $('forgotPasswordDialog').close();
      $('forgotStep1Form').reset();
      $('forgotStep2Form').reset();
      $('forgotStep1Form').hidden = false;
      $('forgotStep2Form').hidden = true;
      $('authUsername').value = identifier;
      $('authPassword').value = newPassword;
    } catch (err) {
      notify(err.message, true);
    }
  }

  function openRegisterDialog() {
    window.history.pushState({}, '', '/register');
    $('registerDialog').showModal();
  }

  async function register(event) {
    event.preventDefault();
    const email = $('registerEmail').value.trim().toLowerCase();
    try {
      const result = await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName: $('registerFullName').value.trim(),
          email,
          phone: $('registerPhone').value.trim(),
          password: $('registerPassword').value,
          readerGroup: $('registerReaderGroup')?.value || 'STUDENT',
        }),
      });
      $('registerDialog').close();
      $('registerForm').reset();
      $('authUsername').value = email;
      window.history.replaceState({}, '', '/search');
      notify(result.message || 'Đăng ký thành công. Tài khoản đang chờ thư viện duyệt.');
    } catch (error) {
      notify(error.message, true);
    }
  }

  async function logout() {
    let logoutError;
    try {
      if (token()) await api('/auth/logout', { method: 'POST' });
    } catch (error) {
      logoutError = error;
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    state.user = null;
    showSession();
    if (logoutError) notify(`Đã đăng xuất khỏi thiết bị này; phiên máy chủ chưa thể thu hồi: ${logoutError.message}`, true);
  }

  function updateCatBulkBar() {
    const bar = $('catBulkBar');
    const countEl = $('selectedCatCount');
    const selectAllBox = $('selectAllCats');
    const count = state.selectedCategoryIds ? state.selectedCategoryIds.size : 0;
    if (countEl) countEl.textContent = count;
    if (bar) {
      bar.style.display = count > 0 ? 'flex' : 'none';
    }
    if (selectAllBox && state.categories) {
      selectAllBox.checked = count > 0 && count === state.categories.length;
      selectAllBox.indeterminate = count > 0 && count < state.categories.length;
    }
  }

  function openMergeCategoriesModal(sourceIds) {
    if (!sourceIds || sourceIds.length === 0) {
      notify('Vui lòng chọn ít nhất một thể loại nguồn để gộp!', true);
      return;
    }
    const dialog = $('mergeCategoriesDialog');
    const chipsContainer = $('mergeSourceChips');
    const targetSel = $('mergeTargetCategory');
    if (!dialog || !chipsContainer || !targetSel) return;

    state.pendingMergeSourceIds = sourceIds.map(Number);

    const sourceCats = state.categories.filter((c) => state.pendingMergeSourceIds.includes(c.id));
    chipsContainer.innerHTML = sourceCats.map((c) => `
      <span style="display:inline-flex;align-items:center;gap:4px;background:#e2e8f0;color:#1e293b;padding:3px 8px;border-radius:12px;font-size:12px;font-weight:600;">
        ${c.ddcCode ? `[${escapeHtml(c.ddcCode)}] ` : ''}${escapeHtml(c.name)}
        <span style="color:#047857;font-size:11px;">(${c.bookCount || 0} sách)</span>
      </span>
    `).join('');

    const availableTargets = state.categories.filter((c) => !state.pendingMergeSourceIds.includes(c.id));
    targetSel.innerHTML = '<option value="">-- Chọn thể loại nhận sách --</option>' +
      availableTargets.map((c) => {
        const indent = '— '.repeat(c.level || 0);
        return `<option value="${c.id}">${indent}${c.ddcCode ? `[${escapeHtml(c.ddcCode)}] ` : ''}${escapeHtml(c.name)} (${c.bookCount || 0} sách)</option>`;
      }).join('');

    dialog.showModal();
  }

  async function handleMergeCategoriesSubmit(e) {
    e.preventDefault();
    const targetId = Number($('mergeTargetCategory')?.value);
    const deleteSource = $('mergeDeleteSourceToggle')?.checked ?? true;
    const sourceIds = state.pendingMergeSourceIds || [];

    if (!targetId) {
      notify('Vui lòng chọn thể loại đích.', true);
      return;
    }
    if (!sourceIds.length) {
      notify('Không có thể loại nguồn nào được chọn.', true);
      return;
    }

    try {
      const res = await api('/categories/merge', {
        method: 'POST',
        body: JSON.stringify({
          sourceCategoryIds: sourceIds,
          targetCategoryId: targetId,
          deleteSourceCategories: deleteSource,
        }),
      });
      $('mergeCategoriesDialog')?.close();
      if (state.selectedCategoryIds) state.selectedCategoryIds.clear();
      updateCatBulkBar();
      notify(res?.message || 'Gộp thể loại thành công.');
      await Promise.all([loadCategories(), loadBooks(1)]);
    } catch (err) {
      notify(err.message, true);
    }
  }

  async function loadCategories() {
    try {
      const search = ($('categorySearch')?.value || '').trim();
      const url = '/categories' + (search ? `?search=${encodeURIComponent(search)}` : '');
      state.categories = await api(url);

      const totalCount = state.categories.length;
      const rootsCount = state.categories.filter((c) => !c.parentId && !c.parent).length;
      const childrenCount = totalCount - rootsCount;
      const totalBooks = state.categories.reduce((acc, c) => acc + (Number(c.bookCount) || 0), 0);
      const totalCopies = state.categories.reduce((acc, c) => acc + (Number(c.totalCopies) || 0), 0);
      const availableCopies = state.categories.reduce((acc, c) => acc + (Number(c.availableCopies) || 0), 0);

      if ($('catKpiTotal')) $('catKpiTotal').textContent = totalCount;
      if ($('catKpiRoots')) $('catKpiRoots').textContent = rootsCount;
      if ($('catKpiChildren')) $('catKpiChildren').textContent = childrenCount;
      if ($('catKpiBooks')) $('catKpiBooks').textContent = totalBooks;
      if ($('catKpiCopies')) $('catKpiCopies').textContent = totalCopies;
      if ($('catKpiAvailable')) $('catKpiAvailable').textContent = availableCopies;
      if ($('categoryTotalCount')) $('categoryTotalCount').textContent = totalCount;

      const parentSel = $('categoryParentSelect');
      if (parentSel) {
        const curVal = parentSel.value;
        parentSel.innerHTML = '<option value="">-- Là thể loại gốc --</option>' +
          state.categories.map((c) => {
            const indent = '— '.repeat(c.level || 0);
            return `<option value="${c.id}">${indent}${c.ddcCode ? `[${escapeHtml(c.ddcCode)}] ` : ''}${escapeHtml(c.name)}</option>`;
          }).join('');
        parentSel.value = curVal;
      }

      const options = state.categories.map((category) => {
        const indent = '— '.repeat(category.level || 0);
        return `<option value="${category.id}">${indent}${category.ddcCode ? `[${escapeHtml(category.ddcCode)}] ` : ''}${escapeHtml(category.name)}</option>`;
      }).join('');
      if ($('categoryFilter')) $('categoryFilter').innerHTML = '<option value="">Tất cả thể loại</option>' + options;
      if ($('bookCategory')) $('bookCategory').innerHTML = '<option value="">Chưa phân loại</option>' + options;

      const currentYear = new Date().getFullYear();
      if ($('publicationYearFilter')) {
        $('publicationYearFilter').innerHTML = '<option value="">Tất cả năm</option>' +
          Array.from({ length: currentYear - 1899 }, (_, index) => currentYear - index)
            .map((year) => `<option value="${year}">${year}</option>`).join('');
      }

      const hierarchyFilter = $('categoryHierarchyFilter')?.value || '';
      const bookCountFilter = $('categoryBookCountFilter')?.value || '';
      const quickPill = state.categoryQuickFilter || 'all';

      let displayCategories = state.categories;
      if (hierarchyFilter === 'root' || quickPill === 'root') {
        displayCategories = displayCategories.filter((c) => !c.parentId && !c.parent);
      } else if (hierarchyFilter === 'child' || quickPill === 'child') {
        displayCategories = displayCategories.filter((c) => !!c.parentId || !!c.parent);
      }

      if (bookCountFilter === 'has_books' || quickPill === 'has_books') {
        displayCategories = displayCategories.filter((c) => (Number(c.bookCount) || 0) > 0);
      } else if (bookCountFilter === 'no_books' || quickPill === 'no_books') {
        displayCategories = displayCategories.filter((c) => (Number(c.bookCount) || 0) === 0);
      } else if (bookCountFilter === 'many_books') {
        displayCategories = displayCategories.filter((c) => (Number(c.bookCount) || 0) >= 5);
      }

      if ($('categoryTotalCount')) {
        $('categoryTotalCount').textContent = displayCategories.length === totalCount
          ? totalCount
          : `${displayCategories.length} / ${totalCount}`;
      }

      const highlight = (text) => {
        if (!search || !text) return escapeHtml(text || '');
        const escaped = escapeHtml(String(text));
        const re = new RegExp(`(${escapeRegExp(search)})`, 'gi');
        return escaped.replace(re, '<mark style="background:#fef08a;color:#854d0e;padding:1px 3px;border-radius:3px;font-weight:600;">$1</mark>');
      };

      const tbody = $('categoryTableBody');
      if (tbody) {
        tbody.innerHTML = displayCategories.length
          ? displayCategories.map((category) => {
            const isChecked = state.selectedCategoryIds && state.selectedCategoryIds.has(category.id);
            const isChild = (category.level && category.level > 0) || !!category.parentId;
            const highlightedName = highlight(category.name);
            const highlightedDdc = category.ddcCode ? highlight(category.ddcCode) : '—';
            const nameDisplay = isChild
              ? `<span style="padding-left:${(category.level || 1) * 1.5}rem;display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;">
                    <span style="color:#0f766e;font-weight:700;">↳ 📄</span>
                    <strong>${highlightedName}</strong>
                    <span class="badge" style="background:#e0f2fe;color:#0369a1;font-size:11px;padding:2px 6px;border-radius:4px;">Con của: ${escapeHtml(category.parentName || 'Gốc')}</span>
                  </span>`
              : `<span style="display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;">
                    <span style="font-size:15px;">📁</span>
                    <strong>${highlightedName}</strong>
                    <span class="badge" style="background:#f1f5f9;color:#475569;font-size:11px;padding:2px 6px;border-radius:4px;">Gốc</span>
                    ${category.childrenCount ? `<span class="badge" style="background:#ecfdf5;color:#065f46;font-size:11px;padding:2px 6px;border-radius:4px;">${category.childrenCount} mục con</span>` : ''}
                  </span>`;

            const parentDisplay = category.parentName
              ? `<span style="color:#334155;font-weight:500;">📁 ${escapeHtml(category.parentName)}</span>`
              : '<span style="color:#94a3b8;font-size:12px;">— (Thể loại gốc)</span>';

            const bCount = Number(category.bookCount) || 0;
            const bookCountBadge = `
                <a href="#" data-view-category-books="${category.id}" style="text-decoration:none;" title="Xem ${bCount} đầu sách thuộc thể loại ${escapeHtml(category.name)}">
                  <span class="badge" style="background:#f0fdf4;color:#166534;font-weight:700;padding:4px 8px;border-radius:6px;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;">
                    📚 ${bCount} sách ↗
                  </span>
                </a>`;
            const copyBadge = `<span class="badge" style="background:#eff6ff;color:#1e40af;font-weight:600;padding:3px 8px;border-radius:6px;font-size:12px;">${category.totalCopies || 0} bản (${category.availableCopies || 0} sẵn sàng)</span>`;

            return `<tr>
                <td style="text-align:center;"><input type="checkbox" class="cat-checkbox" data-cat-id="${category.id}" ${isChecked ? 'checked' : ''}></td>
                <td><code>${highlightedDdc}</code></td>
                <td>${nameDisplay}</td>
                <td>${parentDisplay}</td>
                <td style="color:#555;font-size:.9em;">${highlight(category.description || '—')}</td>
                <td style="text-align:center;">${bookCountBadge}</td>
                <td style="text-align:center;">${copyBadge}</td>
                <td style="text-align:center;white-space:nowrap;">
                  <button class="button button-light button-small" data-view-category-books="${category.id}" type="button" title="Lọc xem sách">📚 Xem sách</button>
                  <button class="button button-light button-small" data-edit-category="${category.id}" type="button" title="Chỉnh sửa thể loại">✏️ Sửa</button>
                  <button class="button button-light button-small" data-merge-single-category="${category.id}" type="button" title="Gộp hoặc chuyển sách của thể loại này" style="color:#2563eb;font-weight:600;">🔀 Gộp / Chuyển</button>
                  <button class="button button-danger button-small" data-delete-category="${category.id}" type="button" title="Xóa thể loại">🗑️ Xóa</button>
                </td>
              </tr>`;
          }).join('')
          : '<tr><td colspan="8" style="text-align:center;color:#888;padding:2rem;">Không tìm thấy thể loại nào phù hợp.</td></tr>';
      }

      if ($('categoryList')) {
        $('categoryList').innerHTML = state.categories.length
          ? state.categories.map((category) => `<div class="category-row"><div><strong>${escapeHtml(category.name)}</strong>${category.ddcCode ? ` <code>[${escapeHtml(category.ddcCode)}]</code>` : ''}<p>${escapeHtml(category.description || 'Chưa có mô tả')}</p></div><div class="button-row"><button class="button button-light button-small" data-view-category-books="${category.id}" type="button">Xem sách (${category.bookCount || 0})</button><button class="button button-light button-small" data-edit-category="${category.id}" type="button">Sửa</button><button class="button button-danger button-small" data-delete-category="${category.id}" type="button">Xóa</button></div></div>`).join('')
          : '<p>Chưa có thể loại nào.</p>';
      }

      document.querySelectorAll('.cat-checkbox').forEach((box) => {
        box.addEventListener('change', (e) => {
          const id = Number(e.target.dataset.catId);
          if (e.target.checked) {
            state.selectedCategoryIds.add(id);
          } else {
            state.selectedCategoryIds.delete(id);
          }
          updateCatBulkBar();
        });
      });

      document.querySelectorAll('[data-view-category-books]').forEach((button) => {
        button.addEventListener('click', (e) => {
          e.preventDefault();
          viewBooksByCategory(button.dataset.viewCategoryBooks);
        });
      });
      document.querySelectorAll('[data-edit-category]').forEach((button) => {
        button.addEventListener('click', () => void editCategory(button.dataset.editCategory));
      });
      document.querySelectorAll('[data-delete-category]').forEach((button) => {
        button.addEventListener('click', () => void removeCategory(button.dataset.deleteCategory));
      });
      document.querySelectorAll('[data-merge-single-category]').forEach((button) => {
        button.addEventListener('click', () => {
          const catId = Number(button.dataset.mergeSingleCategory);
          openMergeCategoriesModal([catId]);
        });
      });

      updateCatBulkBar();
      renderCategoryStructureChart();
    } catch (error) {
      notify(`Không tải được thể loại: ${error.message}`, true);
    }
  }

  let categoryChartInstance = null;
  function renderCategoryStructureChart() {
    const canvas = $('categoryStructureChart');
    if (!canvas || !window.Chart || !state.categories || !state.categories.length) return;
    if (categoryChartInstance) {
      categoryChartInstance.destroy();
      categoryChartInstance = null;
    }
    const sorted = [...state.categories].sort((a, b) => (Number(b.bookCount) || 0) - (Number(a.bookCount) || 0)).slice(0, 8);
    const labels = sorted.map((c) => (c.ddcCode ? `[${c.ddcCode}] ` : '') + c.name);
    const bookCounts = sorted.map((c) => Number(c.bookCount) || 0);
    const copyCounts = sorted.map((c) => Number(c.totalCopies) || 0);

    categoryChartInstance = new window.Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Số đầu sách', data: bookCounts, backgroundColor: 'rgba(99, 102, 241, 0.85)', borderRadius: 4 },
          { label: 'Tổng bản sao kho', data: copyCounts, backgroundColor: 'rgba(16, 185, 129, 0.85)', borderRadius: 4 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 2 } } },
      },
    });
  }

  function formatCurrency(val) {
    return (Number(val) || 0).toLocaleString('vi-VN') + ' đ';
  }

  function renderDeliverySpeedBadge(speed) {
    if (speed === 'FAST') {
      return '<span class="badge" style="background:#ecfdf5;color:#065f46;font-size:11px;padding:2px 6px;border-radius:4px;">⚡ Giao nhanh</span>';
    }
    if (speed === 'SLOW') {
      return '<span class="badge" style="background:#fef2f2;color:#991b1b;font-size:11px;padding:2px 6px;border-radius:4px;">⏳ Chậm trễ</span>';
    }
    return '<span class="badge" style="background:#eff6ff;color:#1e40af;font-size:11px;padding:2px 6px;border-radius:4px;">⏱️ Đúng hẹn</span>';
  }

  async function loadPublishers() {
    try {
      const search = ($('publisherSearch')?.value || '').trim();
      state.publishers = await api('/publishers' + (search ? `?search=${encodeURIComponent(search)}` : ''));

      // Thống kê KPI tổng quan
      const totalPubs = state.publishers.length;
      const totalBooks = state.publishers.reduce((s, p) => s + (Number(p.bookCount) || 0), 0);
      const totalCopies = state.publishers.reduce((s, p) => s + (Number(p.totalCopies) || 0), 0);
      const availableCopies = state.publishers.reduce((s, p) => s + (Number(p.availableCopies) || 0), 0);
      const totalSpent = state.publishers.reduce((s, p) => s + (Number(p.totalSpent) || 0), 0);
      const avgDiscount = totalPubs > 0
        ? Math.round((state.publishers.reduce((s, p) => s + (Number(p.discountRate) || 0), 0) / totalPubs) * 10) / 10
        : 0;

      if ($('pubKpiTotal')) $('pubKpiTotal').textContent = totalPubs;
      if ($('pubKpiBooks')) $('pubKpiBooks').textContent = totalBooks;
      if ($('pubKpiCopies')) $('pubKpiCopies').textContent = totalCopies;
      if ($('pubKpiAvailable')) $('pubKpiAvailable').textContent = availableCopies;
      if ($('pubKpiTotalSpent')) $('pubKpiTotalSpent').textContent = formatCurrency(totalSpent);
      if ($('pubKpiAvgDiscount')) $('pubKpiAvgDiscount').textContent = avgDiscount + '%';
      if ($('publisherTotalCount')) $('publisherTotalCount').textContent = totalPubs;

      $('publisherId').innerHTML = '<option value="">Chưa có nhà xuất bản</option>' +
        state.publishers.map((publisher) =>
          `<option value="${publisher.id}">${escapeHtml(publisher.name)}</option>`).join('');
      renderPublisherList();
      renderPublisherStructureChart();
    } catch (error) {
      notify(`Không tải được nhà xuất bản: ${error.message}`, true);
    }
  }

  let publisherChartInstance = null;
  function renderPublisherStructureChart() {
    const canvas = $('publisherStructureChart');
    if (!canvas || !window.Chart || !state.publishers || !state.publishers.length) return;
    if (publisherChartInstance) {
      publisherChartInstance.destroy();
      publisherChartInstance = null;
    }
    const sorted = [...state.publishers].sort((a, b) => (Number(b.bookCount) || 0) - (Number(a.bookCount) || 0)).slice(0, 8);
    const labels = sorted.map((p) => p.name);
    const books = sorted.map((p) => Number(p.bookCount) || 0);
    const copies = sorted.map((p) => Number(p.totalCopies) || 0);

    publisherChartInstance = new window.Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Số đầu sách', data: books, backgroundColor: 'rgba(245, 158, 11, 0.85)', borderRadius: 4 },
          { label: 'Tổng bản sao', data: copies, backgroundColor: 'rgba(14, 165, 233, 0.85)', borderRadius: 4 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 2 } } },
      },
    });
  }

  function renderPublisherList() {
    const search = ($('publisherSearch')?.value || '').trim().toLocaleLowerCase();
    const ratingFilter = $('publisherRatingFilter')?.value;
    const deliveryFilter = $('publisherDeliveryFilter')?.value;
    const bookCountFilter = $('publisherBookCountFilter')?.value || '';
    const quickPill = state.publisherQuickFilter || 'all';

    const highlight = (text) => {
      if (!search || !text) return escapeHtml(text || '');
      const escaped = escapeHtml(String(text));
      const re = new RegExp(`(${escapeRegExp(search)})`, 'gi');
      return escaped.replace(re, '<mark style="background:#fef08a;color:#854d0e;padding:1px 3px;border-radius:3px;font-weight:600;">$1</mark>');
    };

    const publishers = (state.publishers || []).filter((p) => {
      if (search) {
        const full = `${p.name} ${p.taxCode || ''} ${p.email || ''} ${p.phone || ''} ${p.contactPerson || ''} ${p.address || ''} ${p.reputationNotes || ''}`.toLocaleLowerCase();
        if (!full.includes(search)) return false;
      }
      if (ratingFilter && (Number(p.qualityRating) || 5) < Number(ratingFilter)) {
        return false;
      }
      if (quickPill === '5_star' && (Number(p.qualityRating) || 5) < 5) {
        return false;
      }
      if (deliveryFilter && p.deliverySpeed !== deliveryFilter) {
        return false;
      }
      if (quickPill === 'fast' && p.deliverySpeed !== 'FAST') {
        return false;
      }
      const bCount = Number(p.bookCount) || 0;
      if ((bookCountFilter === 'has_books' || quickPill === 'has_books') && bCount <= 0) {
        return false;
      }
      if ((bookCountFilter === 'no_books' || quickPill === 'no_books') && bCount > 0) {
        return false;
      }
      if (bookCountFilter === 'many_books' && bCount < 5) {
        return false;
      }
      return true;
    });

    if ($('publisherTotalCount')) {
      const allCount = (state.publishers || []).length;
      $('publisherTotalCount').textContent = publishers.length === allCount
        ? allCount
        : `${publishers.length} / ${allCount}`;
    }

    const tbody = $('publisherTableBody');
    if (tbody) {
      tbody.innerHTML = publishers.length
        ? publishers.map((p) => {
          const taxBadge = p.taxCode
            ? `<div style="font-size:12px;color:#0284c7;font-weight:600;margin-top:2px;">MST: <code>${highlight(p.taxCode)}</code></div>`
            : '<div style="font-size:11px;color:#94a3b8;margin-top:2px;">Chưa có MST</div>';

          const websiteLink = p.website
            ? `<div style="font-size:12px;margin-top:2px;"><a href="${escapeHtml(p.website)}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:none;">🌐 ${escapeHtml(p.website)}</a></div>`
            : '';

          const contactDisplay = `
              <div style="font-size:13px;font-weight:600;color:#1e293b;">👤 ${highlight(p.contactPerson || 'Chưa cập nhật đại diện')}</div>
              <div style="font-size:12px;color:#475569;margin-top:2px;">📞 ${highlight(p.phone || '—')} · ✉️ ${highlight(p.email || '—')}</div>
              ${p.address ? `<div style="font-size:11px;color:#64748b;margin-top:2px;">📍 ${escapeHtml(p.address)}</div>` : ''}
            `;

          const ratingStars = '⭐'.repeat(Math.max(1, Math.min(5, Number(p.qualityRating) || 5)));
          const discountBadge = `<span class="badge" style="background:#fef3c7;color:#92400e;font-weight:700;font-size:11px;padding:2px 6px;border-radius:4px;">-${p.discountRate || 0}% CK</span>`;
          const reputationNotesDisplay = p.reputationNotes
            ? `<div style="font-size:11px;color:#475569;font-style:italic;margin-top:3px;max-width:230px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escapeHtml(p.reputationNotes)}">📝 ${escapeHtml(p.reputationNotes)}</div>`
            : '';

          return `<tr>
              <td>
                <strong style="font-size:14px;color:#0f172a;">${highlight(p.name)}</strong>
                ${taxBadge}
                ${websiteLink}
              </td>
              <td>${contactDisplay}</td>
              <td>
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                  <span style="font-size:13px;">${ratingStars}</span>
                  ${discountBadge}
                </div>
                <div style="margin-top:4px;">${renderDeliverySpeedBadge(p.deliverySpeed)}</div>
                ${reputationNotesDisplay}
              </td>
              <td style="text-align:center;">
                <span class="badge" style="background:#f0fdf4;color:#166534;font-weight:700;padding:3px 8px;border-radius:6px;font-size:12px;">📚 ${p.bookCount || 0} sách</span>
                <div style="font-size:12px;color:#475569;margin-top:4px;">${p.totalCopies || 0} bản (${p.availableCopies || 0} sẵn sàng)</div>
                <div style="margin-top:4px;">
                  <button class="button button-light button-small" data-view-publisher-books="${p.id}" type="button" style="font-size:11px;padding:2px 8px;">Tra cứu sách</button>
                </div>
              </td>
              <td style="text-align:center;">
                <strong style="color:#059669;font-size:14px;">${formatCurrency(p.totalSpent || 0)}</strong>
                <div style="font-size:11px;color:#64748b;margin-top:2px;">${p.orderCount || 0} đơn mua hàng</div>
                <div style="margin-top:4px;">
                  <button class="button button-light button-small" data-view-publisher-budget="${p.id}" type="button" style="color:#059669;font-weight:600;font-size:11px;padding:2px 8px;border-color:#a7f3d0;">💰 Chi tiết đơn</button>
                </div>
              </td>
              <td style="text-align:center;white-space:nowrap;">
                <button class="button button-light button-small" data-edit-publisher="${p.id}" type="button">✏️ Sửa</button>
                <button class="button button-danger button-small" data-delete-publisher="${p.id}" type="button">🗑️ Xóa</button>
              </td>
            </tr>`;
        }).join('')
        : '<tr><td colspan="6" style="text-align:center;color:#888;padding:2rem;">Không tìm thấy nhà xuất bản nào phù hợp.</td></tr>';
    }

    if ($('publisherList')) {
      $('publisherList').innerHTML = publishers.length
        ? publishers.map((publisher) => `<div class="category-row"><div><strong>${escapeHtml(publisher.name)}</strong> <span style="color:#666;">(${publisher.bookCount || 0} đầu sách)</span><p>${escapeHtml([publisher.email, publisher.phone, publisher.address, publisher.contactPerson ? `Đại diện: ${publisher.contactPerson}` : ''].filter(Boolean).join(' · ') || 'Chưa có thông tin liên hệ')}</p></div><div class="button-row"><button class="button button-light button-small" data-edit-publisher="${publisher.id}" type="button">Sửa</button><button class="button button-danger button-small" data-delete-publisher="${publisher.id}" type="button">Xóa</button><button class="button button-light button-small" data-view-publisher-books="${publisher.id}" data-publisher-name="${escapeHtml(publisher.name)}" type="button">Xem sách</button></div></div>`).join('')
        : `<p>${state.publishers.length ? 'Không tìm thấy nhà xuất bản phù hợp.' : 'Chưa có nhà xuất bản nào.'}</p>`;
    }

    document.querySelectorAll('[data-edit-publisher]').forEach((button) => {
      button.addEventListener('click', () => editPublisher(button.dataset.editPublisher));
    });
    document.querySelectorAll('[data-delete-publisher]').forEach((button) => {
      button.addEventListener('click', () => requestRemovePublisher(button.dataset.deletePublisher));
    });
    document.querySelectorAll('[data-view-publisher-books]').forEach((button) => {
      button.addEventListener('click', () => {
        const pubId = button.dataset.viewPublisherBooks;
        viewBooksByPublisher(pubId);
      });
    });
    document.querySelectorAll('[data-view-publisher-budget]').forEach((button) => {
      button.addEventListener('click', () => {
        const pubId = button.dataset.viewPublisherBudget;
        void openPublisherBudgetModal(pubId);
      });
    });
  }

  async function openPublisherBudgetModal(publisherId) {
    try {
      const summary = await api(`/publishers/${publisherId}/budget-summary`);
      const p = summary.publisher || {};
      const orders = summary.orders || [];

      if ($('pubBudgetModalTitle')) {
        $('pubBudgetModalTitle').textContent = `Chi tiết ngân sách: ${p.name || ''}`;
      }
      if ($('pubBudgetModalSpent')) {
        $('pubBudgetModalSpent').textContent = formatCurrency(summary.totalSpent || 0);
      }
      if ($('pubBudgetModalBooks')) {
        $('pubBudgetModalBooks').textContent = `${summary.bookCount || 0} đầu sách`;
      }
      if ($('pubBudgetModalOrders')) {
        $('pubBudgetModalOrders').textContent = `${summary.orderCount || 0} đơn`;
      }
      if ($('pubBudgetModalDiscount')) {
        $('pubBudgetModalDiscount').textContent = `${p.discountRate || 0}%`;
      }

      const tbody = $('pubBudgetModalOrderList');
      if (tbody) {
        tbody.innerHTML = orders.length
          ? orders.map((o) => {
            const statusBadge = o.status === 'COMPLETED'
              ? '<span class="badge" style="background:#ecfdf5;color:#065f46;">Đã hoàn thành</span>'
              : o.status === 'ORDERED'
                ? '<span class="badge" style="background:#eff6ff;color:#1e40af;">Đang giao hàng</span>'
                : `<span class="badge">${o.status}</span>`;

            const dateStr = o.createdAt ? new Date(o.createdAt).toLocaleDateString('vi-VN') : '—';
            return `<tr>
                <td><code>${escapeHtml(o.orderCode)}</code></td>
                <td>${dateStr}</td>
                <td>${statusBadge}</td>
                <td style="text-align:right;"><strong>${formatCurrency(o.totalAmount)}</strong></td>
              </tr>`;
          }).join('')
          : '<tr><td colspan="4" style="text-align:center;color:#888;padding:1.5rem;">Chưa có đơn đặt hàng nào phát sinh với NXB này.</td></tr>';
      }

      $('publisherBudgetDialog')?.showModal();
    } catch (err) {
      notify(`Không tải được thông tin ngân sách đối tác: ${err.message}`, true);
    }
  }

  function viewBooksByPublisher(publisherId) {
    window.history.pushState({}, '', isStaff() ? '/admin/books' : '/search');
    syncAdminRoute();
    const searchInput = $('searchInput');
    const pub = state.publishers.find((p) => p.id === Number(publisherId));
    if (searchInput && pub) {
      searchInput.value = pub.name;
    }
    void loadBooks(1);
  }

  function viewBooksByCategory(categoryId) {
    window.history.pushState({}, '', isStaff() ? '/admin/books' : '/search');
    syncAdminRoute();
    const catSelect = $('categoryFilter');
    if (catSelect) {
      catSelect.value = String(categoryId);
      state.categoryId = String(categoryId);
    }
    const searchInput = $('searchInput');
    if (searchInput) searchInput.value = '';
    void loadBooks(1);
  }

  async function savePublisher(event) {
    event.preventDefault();
    const name = $('publisherName').value.trim();
    if (name.length < 2) {
      $('publisherName').setCustomValidity('Tên nhà xuất bản phải có ít nhất 2 ký tự.');
      $('publisherName').reportValidity();
      return;
    }
    $('publisherName').setCustomValidity('');
    const phone = $('publisherPhone').value.trim();
    if (phone && !/^\+?(?=(?:\D*\d){7,15}\D*$)[0-9()\s.-]+$/.test(phone)) {
      $('publisherPhone').setCustomValidity('Số điện thoại phải có từ 7 đến 15 chữ số.');
      $('publisherPhone').reportValidity();
      return;
    }
    $('publisherPhone').setCustomValidity('');
    const id = $('publisherEditId').value;
    try {
      const discountVal = $('publisherDiscountRate')?.value;
      await api(id ? `/publishers/${id}` : '/publishers', {
        method: id ? 'PATCH' : 'POST',
        body: JSON.stringify({
          name: $('publisherName').value.trim(),
          taxCode: $('publisherTaxCode')?.value.trim() || undefined,
          email: $('publisherEmail').value.trim() || undefined,
          phone: phone || undefined,
          address: $('publisherAddress').value.trim() || undefined,
          website: $('publisherWebsite')?.value.trim() || undefined,
          contactPerson: $('publisherContact')?.value.trim() || undefined,
          discountRate: discountVal ? Number(discountVal) : 0,
          qualityRating: Number($('publisherQualityRating')?.value) || 5,
          deliverySpeed: $('publisherDeliverySpeed')?.value || 'ON_TIME',
          reputationNotes: $('publisherNotes')?.value.trim() || undefined,
        }),
      });
      clearPublisherForm();
      notify(id ? 'Đã cập nhật nhà xuất bản.' : 'Đã thêm nhà xuất bản đối tác.');
      await Promise.all([loadPublishers(), loadBooks(state.page)]);
    } catch (error) {
      notify(error.message, true);
    }
  }

  function clearPublisherForm() {
    $('publisherForm').reset();
    $('publisherEditId').value = '';
    $('publisherSubmit').textContent = '+ Thêm nhà xuất bản';
    if ($('publisherFormHeading')) $('publisherFormHeading').textContent = '+ Thêm hồ sơ Nhà xuất bản đối tác';
    $('cancelPublisherEdit').hidden = true;
    $('publisherName').setCustomValidity('');
    $('publisherPhone').setCustomValidity('');
    if ($('publisherTaxCode')) $('publisherTaxCode').value = '';
    if ($('publisherWebsite')) $('publisherWebsite').value = '';
    if ($('publisherContact')) $('publisherContact').value = '';
    if ($('publisherDiscountRate')) $('publisherDiscountRate').value = '';
    if ($('publisherQualityRating')) $('publisherQualityRating').value = '5';
    if ($('publisherDeliverySpeed')) $('publisherDeliverySpeed').value = 'ON_TIME';
    if ($('publisherNotes')) $('publisherNotes').value = '';
  }

  function editPublisher(id) {
    const publisher = state.publishers.find((item) => item.id === Number(id));
    if (!publisher) return;
    $('publisherEditId').value = publisher.id;
    $('publisherName').value = publisher.name;
    if ($('publisherTaxCode')) $('publisherTaxCode').value = publisher.taxCode || '';
    $('publisherEmail').value = publisher.email || '';
    $('publisherPhone').value = publisher.phone || '';
    $('publisherAddress').value = publisher.address || '';
    if ($('publisherWebsite')) $('publisherWebsite').value = publisher.website || '';
    if ($('publisherContact')) $('publisherContact').value = publisher.contactPerson || '';
    if ($('publisherDiscountRate')) $('publisherDiscountRate').value = publisher.discountRate ?? '';
    if ($('publisherQualityRating')) $('publisherQualityRating').value = String(publisher.qualityRating || 5);
    if ($('publisherDeliverySpeed')) $('publisherDeliverySpeed').value = publisher.deliverySpeed || 'ON_TIME';
    if ($('publisherNotes')) $('publisherNotes').value = publisher.reputationNotes || '';

    $('publisherSubmit').textContent = 'Lưu thay đổi';
    if ($('publisherFormHeading')) $('publisherFormHeading').textContent = `✏️ Chỉnh sửa hồ sơ: ${publisher.name}`;
    $('cancelPublisherEdit').hidden = false;
    $('publisherForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    $('publisherName').focus();
  }

  function requestRemovePublisher(id) {
    const publisher = state.publishers.find((item) => item.id === Number(id));
    if (!publisher) return;
    state.pendingPublisherDeleteId = publisher.id;
    $('publisherDeleteMessage').textContent = `Bạn có chắc muốn xóa "${publisher.name}"?`;
    $('publisherDeleteDialog').showModal();
  }

  async function removePublisher(id) {
    try {
      await api(`/publishers/${id}`, { method: 'DELETE' });
      $('publisherDeleteDialog').close();
      state.pendingPublisherDeleteId = null;
      notify('Đã xóa nhà xuất bản.');
      await Promise.all([loadPublishers(), loadBooks(state.page)]);
    } catch (error) {
      notify(error.message, true);
    }
  }

  async function loadUsers() {
    if (!isCounterStaff()) return;
    try {
      state.users = await api('/users');
      memberData = state.users;
      renderUsers();
      renderQuickBorrowReaders();
    } catch (error) {
      $('userList').innerHTML = `<tr><td colspan="6">${escapeHtml(error.message)}</td></tr>`;
    }
  }

  async function loadStaffs() {
    if (!isAdmin()) return;
    try {
      const staffs = await api('/users/staff-performance');
      state.staffPerformanceData = staffs;
      renderStaffsWithMetrics(staffs);
    } catch (error) {
      try {
        state.users = await api('/users');
        renderStaffs();
      } catch (e) {
        $('staffList').innerHTML = `<tr><td colspan="8">${escapeHtml(error.message)}</td></tr>`;
      }
    }
  }

  function renderStaffsWithMetrics(staffs) {
    state.staffPerformanceData = staffs;
    const tbody = $('staffList');
    if (!tbody) return;

    if (!staffs.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:#888;">Chưa có tài khoản nhân viên.</td></tr>';
      return;
    }

    tbody.innerHTML = staffs.map((s) => {
      const m = s.metrics || {};
      const roleColor = s.role === 'ADMIN' ? '#dc2626' : (s.role === 'COUNTER_LIBRARIAN' ? '#6f42c1' : '#0284c7');
      const roleBg = s.role === 'ADMIN' ? '#fee2e2' : (s.role === 'COUNTER_LIBRARIAN' ? '#f3e8ff' : '#e0f2fe');

      return `
        <tr>
          <td>
            <strong>${escapeHtml(s.username)}</strong>
            <div style="font-size:12px;color:#64748b;">${escapeHtml(s.fullName || '—')}</div>
          </td>
          <td>
            <div>${escapeHtml(s.email || '—')}</div>
            <small style="color:#64748b;">${escapeHtml(s.phone || '—')}</small>
          </td>
          <td>
            <span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11.5px;font-weight:700;color:${roleColor};background:${roleBg};">
              ${escapeHtml(roleTitle(s.role))}
            </span>
          </td>
          <td style="text-align:center;">
            <strong style="color:#6f42c1;font-size:15px;">${m.borrowsHandled || 0}</strong>
          </td>
          <td style="text-align:center;">
            <strong style="color:#0284c7;font-size:15px;">${(m.inventoryAudits || 0) + (m.acquisitionsHandled || 0)}</strong>
          </td>
          <td>
            <span style="font-size:12px;color:#475569;">${m.lastActiveAt ? date(m.lastActiveAt) : 'Chưa ghi nhận'}</span>
          </td>
          <td>
            <span class="status ${s.isActive ? 'status-RETURNED' : 'status-REJECTED'}">
              ${s.isActive ? 'Đang hoạt động' : 'Đã khóa'}
            </span>
          </td>
          <td>
            <div class="book-actions">
              <button class="button button-light button-small" data-staff-perf="${s.id}" type="button" title="Xem thống kê hiệu suất & nhật ký hoạt động">📊 Hiệu suất</button>
              <button class="button ${s.isActive ? 'button-danger' : 'button-light'} button-small" data-toggle-user="${s.id}" type="button">${s.isActive ? 'Khóa' : 'Mở khóa'}</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('[data-staff-perf]').forEach((btn) => {
      btn.addEventListener('click', () => openStaffPerformance(Number(btn.dataset.staffPerf)));
    });
    tbody.querySelectorAll('[data-toggle-user]').forEach((btn) => {
      btn.addEventListener('click', () => void toggleUser(btn.dataset.toggleUser));
    });
  }

  function openStaffPerformance(staffId) {
    const staff = (state.staffPerformanceData || []).find((s) => s.id === staffId);
    if (!staff) return;

    $('staffPerfName').textContent = staff.fullName || staff.username;
    $('staffPerfUsername').textContent = '@' + staff.username;
    if ($('staffPerfRoleBadge')) {
      $('staffPerfRoleBadge').textContent = roleTitle(staff.role);
    }

    const m = staff.metrics || {};
    if ($('staffPerfBorrows')) $('staffPerfBorrows').textContent = m.borrowsHandled || 0;
    if ($('staffPerfAudits')) $('staffPerfAudits').textContent = m.inventoryAudits || 0;
    if ($('staffPerfAcquisitions')) $('staffPerfAcquisitions').textContent = m.acquisitionsHandled || 0;
    if ($('staffPerfTotalActions')) $('staffPerfTotalActions').textContent = m.totalActions || 0;

    const timeline = $('staffPerfTimeline');
    const logs = m.recentLogs || [];
    if (!logs.length) {
      timeline.innerHTML = '<p style="color:#888;text-align:center;padding:1.5rem;">Chưa có nhật ký hoạt động nào được ghi nhận cho nhân sự này.</p>';
    } else {
      timeline.innerHTML = logs.map((log) => `
        <div style="display:flex;gap:12px;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;">
          <div style="color:#64748b;min-width:130px;font-size:12px;">${date(log.createdAt)}</div>
          <div style="flex:1;">
            <span class="badge" style="background:#f1f5f9;color:#334155;font-weight:700;font-size:11px;margin-right:6px;">${escapeHtml(log.action)}</span>
            <span style="color:#0f172a;">${escapeHtml(log.description)}</span>
          </div>
        </div>
      `).join('');
    }

    $('staffPerformanceModal').showModal();
  }


  function generateBarcodeSvg(code) {
    if (!code) code = 'TV-000000';
    const clean = String(code).toUpperCase().replace(/[^0-9A-Z\-]/g, '-');
    const CODE39 = {
      '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
      '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
      '8': '100100100', '9': '001100100', 'A': '100001001', 'B': '001001001',
      'C': '101001000', 'D': '000011001', 'E': '100011000', 'F': '001011000',
      'G': '000001101', 'H': '100001100', 'I': '001001100', 'J': '000011100',
      'K': '100000011', 'L': '001000011', 'M': '101000010', 'N': '000010011',
      'O': '100010010', 'P': '001010010', 'Q': '000000111', 'R': '100000110',
      'S': '001000110', 'T': '000010110', 'U': '110000001', 'V': '011000001',
      'W': '111000000', 'X': '010010001', 'Y': '110010000', 'Z': '011010000',
      '-': '010000101', '*': '010010100'
    };
    const str = '*' + clean + '*';
    const bars = [];
    for (let i = 0; i < str.length; i++) {
      const pattern = CODE39[str[i]] || CODE39['-'];
      for (let j = 0; j < 9; j++) {
        bars.push({ isBar: j % 2 === 0, isWide: pattern[j] === '1' });
      }
      bars.push({ isBar: false, isWide: false });
    }
    let x = 10;
    const height = 40;
    let rects = '';
    for (const b of bars) {
      const w = b.isWide ? 2.8 : 1.2;
      if (b.isBar) {
        rects += '<rect x="' + x + '" y="0" width="' + w + '" height="' + height + '" fill="#1e293b"/>';
      }
      x += w;
    }
    return '<svg viewBox="0 0 ' + (x + 10) + ' ' + height + '" style="max-height:42px;width:100%;">' + rects + '</svg>';
  }

  const PERMISSION_DEFINITIONS = {
    circulation: { label: 'Mượn trả', icon: '↔' },
    inventory: { label: 'Kho sách', icon: '📦' },
    fines: { label: 'Thu phạt', icon: '₫' },
    readers: { label: 'Độc giả', icon: '💳' },
    reports: { label: 'Báo cáo', icon: '📊' },
    system: { label: 'Hệ thống', icon: '⚙️' },
  };

  function parseCustomPermissions(user) {
    if (user.role === 'ADMIN') return Object.keys(PERMISSION_DEFINITIONS);
    if (!user.customPermissions) {
      if (user.role === 'COUNTER_LIBRARIAN') return ['circulation', 'readers'];
      if (user.role === 'INVENTORY_LIBRARIAN') return ['inventory'];
      if (user.role === 'LIBRARIAN') return ['circulation', 'inventory', 'fines', 'readers', 'reports'];
      return [];
    }
    try {
      return typeof user.customPermissions === 'string'
        ? JSON.parse(user.customPermissions)
        : user.customPermissions;
    } catch {
      return [];
    }
  }

  function renderPermissionPills(user) {
    if (user.role === 'ADMIN') {
      return '<span class="badge" style="background:#fef2f2;color:#991b1b;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;">⭐ Toàn quyền Admin</span>';
    }
    const perms = parseCustomPermissions(user);
    if (!perms.length) {
      return '<span style="color:#94a3b8;font-size:12px;">Chưa gán quyền</span>';
    }
    return perms.map((p) => {
      const def = PERMISSION_DEFINITIONS[p] || { label: p, icon: '•' };
      return '<span class="badge" style="background:#e0f2fe;color:#0369a1;padding:2px 6px;border-radius:10px;font-size:11px;font-weight:600;margin:1px;display:inline-block;">' + def.icon + ' ' + escapeHtml(def.label) + '</span>';
    }).join(' ');
  }

  function renderReaderGroupBadge(group) {
    switch (group) {
      case 'LECTURER':
        return '<span class="badge" style="background:#fef3c7;color:#b45309;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;">👨‍🏫 Giảng viên</span>';
      case 'RESEARCHER':
        return '<span class="badge" style="background:#f3e8ff;color:#7e22ce;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;">🔬 Nghiên cứu sinh</span>';
      case 'OTHER':
        return '<span class="badge" style="background:#f1f5f9;color:#475569;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;">👤 Khác</span>';
      case 'STUDENT':
      default:
        return '<span class="badge" style="background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;">🎓 Sinh viên</span>';
    }
  }

  function renderStaffs() {
    const staff = state.users.filter((user) => user.role !== 'READER');
    $('staffList').innerHTML = staff.length
      ? staff.map((user) => '<tr>' +
        '<td><strong>' + escapeHtml(user.username) + '</strong></td>' +
        '<td>' + escapeHtml(user.fullName || '—') + '<br><small>' + escapeHtml(user.email || '—') + ' · ' + escapeHtml(user.phone || '—') + '</small></td>' +
        '<td><div class="staff-role-editor"><span class="role-badge">' + escapeHtml(roleTitle(user.role)) + '</span><select data-staff-role="' + user.id + '" aria-label="Vai trò của ' + escapeHtml(user.username) + '"><option value="ADMIN" ' + (user.role === 'ADMIN' ? 'selected' : '') + '>Super Admin</option><option value="LIBRARIAN" ' + (user.role === 'LIBRARIAN' ? 'selected' : '') + '>Thủ thư tổng hợp</option><option value="COUNTER_LIBRARIAN" ' + (user.role === 'COUNTER_LIBRARIAN' ? 'selected' : '') + '>Thủ thư quầy</option><option value="INVENTORY_LIBRARIAN" ' + (user.role === 'INVENTORY_LIBRARIAN' ? 'selected' : '') + '>Thủ thư kho</option></select></div></td>' +
        '<td><div style="max-width:240px;">' + renderPermissionPills(user) + '</div></td>' +
        '<td><span class="status ' + (user.isActive ? 'status-RETURNED' : 'status-REJECTED') + '">' + (user.isActive ? 'Đang hoạt động' : 'Đã khóa') + '</span></td>' +
        '<td>' +
        '<div class="book-actions">' +
        '<button class="button button-light button-small" data-staff-permissions="' + user.id + '" type="button" title="Tùy chỉnh phân quyền chi tiết RBAC">⚙️ Phân quyền</button>' +
        '<button class="button button-primary button-small" data-save-staff-role="' + user.id + '" type="button">Lưu vai trò</button>' +
        '<button class="button ' + (user.isActive ? 'button-danger' : 'button-light') + ' button-small" data-toggle-user="' + user.id + '" type="button">' + (user.isActive ? 'Khóa' : 'Mở khóa') + '</button>' +
        '</div>' +
        '</td>' +
        '</tr>').join('')
      : '<tr><td colspan="6">Chưa có tài khoản nhân viên.</td></tr>';
    document.querySelectorAll('[data-save-staff-role]').forEach((button) => {
      button.addEventListener('click', () =>
        void updateStaffRole(button.dataset.saveStaffRole),
      );
    });
    document.querySelectorAll('[data-staff-permissions]').forEach((button) => {
      button.addEventListener('click', () =>
        openStaffPermissions(button.dataset.staffPermissions),
      );
    });
    document.querySelectorAll('#staffList [data-toggle-user]').forEach((button) => {
      button.addEventListener('click', () => void toggleUser(button.dataset.toggleUser));
    });
  }

  function openStaffPermissions(userId) {
    const user = state.users.find((u) => u.id === Number(userId));
    if (!user) return;
    $('permStaffId').value = user.id;
    $('permStaffUsername').textContent = (user.fullName || user.username) + ' (' + roleTitle(user.role) + ')';
    const userPerms = parseCustomPermissions(user);
    document.querySelectorAll('input[name="staffPerm"]').forEach((cb) => {
      cb.checked = userPerms.includes(cb.value);
    });
    $('staffPermissionsDialog').showModal();
  }

  async function saveStaffPermissions(event) {
    event.preventDefault();
    const userId = $('permStaffId').value;
    const selected = Array.from(document.querySelectorAll('input[name="staffPerm"]:checked')).map((cb) => cb.value);
    try {
      await api('/users/' + userId, {
        method: 'PATCH',
        body: JSON.stringify({ customPermissions: JSON.stringify(selected) }),
      });
      $('staffPermissionsDialog').close();
      notify('Đã cập nhật phân quyền chi tiết cho nhân viên.');
      await loadStaffs();
    } catch (error) {
      notify('Không thể lưu phân quyền: ' + error.message, true);
    }
  }

  function renderUsers() {
    const search = $('userSearch').value.trim().toLocaleLowerCase();
    const role = $('userRoleFilter').value;
    const group = $('userGroupFilter')?.value || '';
    const status = $('userStatusFilter').value;
    const users = state.users.filter((user) => {
      const cardNum = user.cardNumber || ('TV-' + user.id);
      const matchSearch = !search || (user.username + ' ' + (user.fullName || '') + ' ' + (user.email || '') + ' ' + (user.phone || '') + ' ' + cardNum).toLocaleLowerCase().includes(search);
      const matchRole = !role || user.role === role;
      const matchGroup = !group || (user.readerGroup || 'STUDENT') === group;
      const matchStatus = !status || (status === 'active' ? user.isActive : !user.isActive);
      return matchSearch && matchRole && matchGroup && matchStatus;
    });
    $('userList').innerHTML = users.length ? users.map((user) => {
      const cardNum = user.cardNumber || ('TV-' + String(user.id).padStart(6, '0'));
      return '<tr>' +
        '<td><strong>' + escapeHtml(user.username) + '</strong><br><small style="color:#64748b;">' + escapeHtml(roleTitle(user.role)) + '</small></td>' +
        '<td><strong>' + escapeHtml(user.fullName || '—') + '</strong><br><small>' + escapeHtml(user.email || '—') + (user.phone ? ' · ' + escapeHtml(user.phone) : '') + '</small></td>' +
        '<td>' + renderReaderGroupBadge(user.readerGroup) + '</td>' +
        '<td style="text-align:center;"><strong>' + escapeHtml(user.maxActiveLoans ?? 5) + '</strong> cuốn</td>' +
        '<td><span style="font-family:monospace;font-weight:700;color:#0f766e;">' + escapeHtml(cardNum) + '</span><br><small>' + (user.role === 'READER' ? 'Cấp ' + date(user.libraryCardIssuedAt) + (user.libraryCardExpiresAt ? ' · Hạn ' + date(user.libraryCardExpiresAt) : '') : '—') + '</small></td>' +
        '<td><span class="status ' + (user.isActive ? 'status-RETURNED' : 'status-REJECTED') + '">' + (user.isActive ? 'Đang hoạt động' : user.role === 'READER' && !user.approvedAt ? 'Chờ duyệt' : 'Đã khóa') + '</span></td>' +
        '<td>' +
        '<div class="book-actions">' +
        '<button class="button button-light button-small" data-reader-history="' + user.id + '" type="button" title="Xem lịch sử mượn trả & chỉ số chuyên cần đọc sách">📜 Lịch sử & Rank</button>' +
        (user.role === 'READER' ? '<button class="button button-primary button-small" data-library-card="' + user.id + '" type="button" title="Mở thẻ thư viện kỹ thuật số gắn Barcode & QR">💳 Thẻ TV</button>' : '') +
        '<button class="button button-light button-small" data-user-profile="' + user.id + '" type="button">Hồ sơ</button>' +
        (user.role === 'READER' ? '<button class="button button-light button-small" data-renew-card="' + user.id + '" type="button">Gia hạn</button>' : '') +
        '<button class="button button-light button-small" data-edit-user="' + user.id + '" type="button">Sửa</button>' +
        '<button class="button ' + (user.isActive ? 'button-danger' : 'button-primary') + ' button-small" data-toggle-user="' + user.id + '" type="button">' + (user.isActive ? 'Khóa' : user.role === 'READER' && !user.approvedAt ? 'Duyệt / mở khóa' : 'Mở khóa') + '</button>' +
        '</div>' +
        '</td>' +
        '</tr>';
    }).join('')
      : '<tr><td colspan="7">Không tìm thấy tài khoản phù hợp.</td></tr>';

    document.querySelectorAll('[data-reader-history]').forEach((button) => {
      button.addEventListener('click', () => openReaderHistory(button.dataset.readerHistory));
    });
    document.querySelectorAll('[data-library-card]').forEach((button) => {
      button.addEventListener('click', () => openLibraryCard(button.dataset.libraryCard));
    });
    document.querySelectorAll('[data-edit-user]').forEach((button) => {
      button.addEventListener('click', () => editUser(button.dataset.editUser));
    });
    document.querySelectorAll('[data-toggle-user]').forEach((button) => {
      button.addEventListener('click', () => void toggleUser(button.dataset.toggleUser));
    });
    document.querySelectorAll('[data-user-profile]').forEach((button) => {
      button.addEventListener('click', () => navigateAdmin('/admin/users/' + button.dataset.userProfile));
    });
    document.querySelectorAll('[data-renew-card]').forEach((button) => {
      button.addEventListener('click', () => openCardRenewal(button.dataset.renewCard));
    });
  }

  function loanStatusTitle(status) {
    return ({
      PENDING: 'Chờ duyệt',
      BORROWED: 'Đang mượn',
      RETURNED: 'Đã trả',
      REJECTED: 'Từ chối',
      OVERDUE: 'Quá hạn',
    })[status] || status || '—';
  }

  async function openReaderHistory(id) {
    const modal = $('readerHistoryModal');
    if (!modal) return;
    try {
      const data = await api('/users/' + id + '/profile');
      const u = data.user || {};
      const stats = data.readingStats || {};

      if ($('readerModalFullName')) $('readerModalFullName').textContent = (u.fullName || u.username) + ' (@' + u.username + ')';
      if ($('readerModalCardNumber')) $('readerModalCardNumber').textContent = u.cardNumber || ('TV-' + u.id);
      if ($('readerModalGroupBadge')) $('readerModalGroupBadge').innerHTML = renderReaderGroupBadge(u.readerGroup);
      if ($('readerModalRankBadge')) $('readerModalRankBadge').textContent = stats.readingRank || '🌱 Độc giả Tiềm Năng';
      if ($('readerModalScore')) $('readerModalScore').textContent = stats.readingScore ?? 0;
      if ($('readerModalTotalBorrowed')) $('readerModalTotalBorrowed').textContent = (stats.totalBorrowed ?? 0) + ' cuốn';
      if ($('readerModalOnTimeRate')) $('readerModalOnTimeRate').textContent = (stats.onTimeRate ?? 100) + '%';
      if ($('readerModalFavCategory')) $('readerModalFavCategory').textContent = stats.favoriteCategory || 'Tổng hợp';
      if ($('readerModalUnpaidFine')) $('readerModalUnpaidFine').textContent = money(data.unpaidFineAmount || 0);

      const tbody = $('readerModalLoansTableBody');
      if (tbody) {
        const loans = data.loans || [];
        if (!loans.length) {
          tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:1.5rem;color:#888;">Độc giả chưa có giao dịch mượn trả nào.</td></tr>';
        } else {
          tbody.innerHTML = loans.map((loan) => {
            const copyCode = loan.copy?.barcode || loan.bookCopy?.barcode || loan.copy?.copyNumber || ('BC-' + loan.id);
            const borrowDate = loan.borrowedAt || loan.borrowDate || loan.createdAt;
            const retDate = loan.returnedAt ? date(loan.returnedAt) : '—';
            const fineText = loan.fineAmount ? money(loan.fineAmount) : (loan.fine?.amount ? money(loan.fine.amount) : '0 ₫');
            return '<tr>' +
              '<td><strong>' + escapeHtml(loan.book?.title || 'Tài liệu') + '</strong></td>' +
              '<td><span style="font-family:monospace;font-weight:700;">' + escapeHtml(copyCode) + '</span></td>' +
              '<td>' + date(borrowDate) + '</td>' +
              '<td>' + date(loan.dueDate) + '</td>' +
              '<td>' + retDate + '</td>' +
              '<td><span class="status status-' + loan.status + '">' + escapeHtml(loanStatusTitle(loan.status)) + '</span></td>' +
              '<td><strong style="color:' + (loan.fineStatus === 'UNPAID' ? '#dc2626' : '#64748b') + ';">' + fineText + '</strong></td>' +
              '</tr>';
          }).join('');
        }
      }

      modal.showModal();
    } catch (err) {
      notify('Không thể tải hồ sơ độc giả: ' + err.message, true);
    }
  }

  function openLibraryCard(id) {
    const user = state.users.find((u) => u.id === Number(id));
    if (!user) return;
    state.currentCardUserId = user.id;

    const cardNum = user.cardNumber || ('TV-' + String(user.id).padStart(6, '0'));
    const groupName = user.readerGroup === 'LECTURER' ? 'GIẢNG VIÊN' : (user.readerGroup === 'RESEARCHER' ? 'NGHIÊN CỨU SINH' : (user.readerGroup === 'OTHER' ? 'BẠN ĐỌC KHÁC' : 'SINH VIÊN'));

    $('cardFullName').textContent = user.fullName || user.username;
    $('cardUsername').textContent = '@' + user.username;
    $('cardNumberDisplay').textContent = cardNum;
    $('cardGroupBadge').textContent = groupName;
    $('cardIssuedDate').textContent = date(user.libraryCardIssuedAt) || date(new Date().toISOString());
    $('cardExpiryDate').textContent = user.libraryCardExpiresAt ? date(user.libraryCardExpiresAt) : date(new Date(Date.now() + 365 * 86400000).toISOString());

    // Generate Code 39 Barcode SVG
    $('cardBarcodeContainer').innerHTML = generateBarcodeSvg(cardNum);
    $('cardBarcodeText').textContent = cardNum;

    // Generate QR Code via QRServer
    const qrData = JSON.stringify({
      id: user.id,
      card: cardNum,
      name: user.fullName || user.username,
      group: user.readerGroup || 'STUDENT',
      exp: user.libraryCardExpiresAt || null,
    });
    $('cardQrImage').src = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodeURIComponent(qrData);

    $('libraryCardDialog').showModal();
  }

  async function handleReissueCard() {
    if (!state.currentCardUserId) return;
    const user = state.users.find((u) => u.id === state.currentCardUserId);
    if (!user) return;
    if (!window.confirm('Xác nhận cấp lại mã thẻ mới cho độc giả ' + (user.fullName || user.username) + '?\nMã thẻ cũ sẽ bị hủy bỏ và thẻ mới sẽ được kích hoạt với thời hạn 1 năm.')) return;

    try {
      const updated = await api('/users/' + user.id + '/reissue-card', { method: 'POST' });
      notify('Đã cấp lại thẻ thư viện mới: ' + updated.cardNumber);
      await loadUsers();
      openLibraryCard(updated.id);
    } catch (error) {
      notify('Lỗi cấp lại thẻ: ' + error.message, true);
    }
  }

  function printLibraryCard() {
    const cardEl = $('libraryCardPrintArea');
    if (!cardEl) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return notify('Trình duyệt đã chặn cửa sổ in ấn.', true);

    printWindow.document.open();
    printWindow.document.write('<!doctype html>' +
      '<html>' +
      '<head>' +
      '<meta charset="UTF-8">' +
      '<title>In thẻ thư viện</title>' +
      '<style>' +
      '@page { size: A4; margin: 15mm; }' +
      'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; background: #fff; padding: 20px; }' +
      '.card-print-box {' +
      'width: 86mm;' +
      'height: 54mm;' +
      'border-radius: 12px;' +
      'padding: 14px;' +
      'background: linear-gradient(135deg, #0f766e 0%, #115e59 100%);' +
      'color: #fff;' +
      'box-sizing: border-box;' +
      'box-shadow: 0 4px 12px rgba(0,0,0,0.15);' +
      'break-inside: avoid;' +
      'display: flex;' +
      'flex-direction: column;' +
      'justify-content: space-between;' +
      '-webkit-print-color-adjust: exact;' +
      'print-color-adjust: exact;' +
      '}' +
      '</style>' +
      '</head>' +
      '<body>' +
      '<div style="margin-bottom:12px;font-size:12px;color:#64748b;">HỆ THỐNG THƯ VIỆN ĐẠI HỌC SỐ - BẢN IN THẺ BẠN ĐỌC (Chuẩn CR-80)</div>' +
      '<div class="card-print-box">' +
      cardEl.innerHTML +
      '</div>' +
      '<script>' +
      'window.onload = () => {' +
      'window.print();' +
      '};' +
      '<\/script>' +
      '</body>' +
      '</html>');
    printWindow.document.close();
  }


  function openCardRenewal(id) {
    const user = state.users.find((item) => item.id === Number(id));
    if (!user || user.role !== 'READER') return;
    openCardRenewalForUser(user);
  }

  function openCardRenewalForUser(user) {
    if (!user || user.role !== 'READER') return;
    $('renewCardUserId').value = user.id;
    $('renewCardReaderName').textContent = `Độc giả: ${user.username}`;
    $('renewCardPeriod').value = '6';
    setRenewalDate();
    $('cardRenewDialog').showModal();
  }

  function setRenewalDate() {
    const now = new Date();
    const currentExpiry = state.readerProfileUser?.id === Number($('renewCardUserId').value)
      ? state.readerProfileUser.libraryCardExpiresAt
      : state.users.find((user) => user.id === Number($('renewCardUserId').value))?.libraryCardExpiresAt;
    const expiry = currentExpiry
      ? new Date(`${String(currentExpiry).slice(0, 10)}T00:00:00`)
      : null;
    const start = expiry && expiry > now ? expiry : now;
    const day = start.getDate();
    start.setDate(1);
    start.setMonth(start.getMonth() + Number($('renewCardPeriod').value));
    const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    start.setDate(Math.min(day, lastDay));
    $('renewCardExpiresAt').value =
      `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
  }

  async function renewLibraryCard(event) {
    event.preventDefault();
    const userId = $('renewCardUserId').value;
    try {
      await api(`/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ libraryCardExpiresAt: $('renewCardExpiresAt').value }),
      });
      $('cardRenewDialog').close();
      notify('Đã gia hạn thẻ thư viện.');
      await loadUsers();
      if (state.readerProfileUser?.id === Number(userId)) {
        await loadReaderProfile(Number(userId));
      }
    } catch (error) {
      notify(error.message, true);
    }
  }

  function renderQuickBorrowReaders() {
    const select = $('quickBorrowReader');
    if (!select) return;
    const selected = select.value;
    const search = $('quickBorrowReaderSearch').value.trim().toLocaleLowerCase();
    const readers = state.users.filter((user) => {
      if (user.role !== 'READER' || !user.isActive) return false;
      const cardCode = `TV-${user.id}`;
      const terms = `${user.username} ${user.fullName || ''} ${user.phone || ''} ${user.email || ''} ${user.id} ${cardCode}`;
      return !search || terms.toLocaleLowerCase().includes(search);
    });
    select.innerHTML = '<option value="">Chọn độc giả</option>' + readers.map((user) =>
      `<option value="${user.id}">${escapeHtml(user.fullName || user.username)} · ${escapeHtml(user.phone || 'Không có SĐT')} · Thẻ TV-${user.id}</option>`).join('');
    select.value = readers.some((user) => String(user.id) === selected) ? selected : '';
  }

  function updateBorrowDueSuggestion() {
    const borrowDays = Number(state.settings?.borrowDays || 14);
    const due = new Date();
    due.setDate(due.getDate() + borrowDays);
    $('borrowDueSuggestion').textContent =
      `Thời hạn theo quy định: ${borrowDays} ngày · Hạn dự kiến nếu duyệt hôm nay: ${date(due.toISOString())}. Hạn trả chính thức được tính khi thủ thư duyệt.`;
    $('loanRuleSummary').textContent =
      `Thời hạn mượn ${borrowDays} ngày · Phạt trễ ${money(state.settings?.dailyFineRate || 5000)}/ngày`;
  }

  async function loadSettings(showErrors = true) {
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
          ? `✓ Bản sao lưu gần nhất: ${new Date(s.lastBackupAt).toLocaleString('vi-VN')}`
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

      // 5. Cổng SMTP Gateway (trang Settings mới)
      if ($('settingSmtpHost')) $('settingSmtpHost').value = s.smtpHost || '';
      if ($('settingSmtpPort')) $('settingSmtpPort').value = s.smtpPort || 587;
      if ($('settingSmtpUser')) $('settingSmtpUser').value = s.smtpUser || '';
      if ($('settingSmtpPassword')) $('settingSmtpPassword').value = s.smtpPassword || '';
      if ($('settingSmtpFrom')) $('settingSmtpFrom').value = s.smtpFrom || '';
      if ($('settingSmtpSecure')) $('settingSmtpSecure').checked = Boolean(s.smtpSecure);

      // 6. Cổng SMS OTP Gateway (trang Settings mới)
      if ($('settingSmsProvider')) $('settingSmsProvider').value = s.smsProvider || 'ESMS';
      if ($('settingSmsBrandName')) $('settingSmsBrandName').value = s.smsBrandName || 'THUVIEN_EDU';
      if ($('settingSmsApiKey')) $('settingSmsApiKey').value = s.smsApiKey || '';
      if ($('settingSmsApiSecret')) $('settingSmsApiSecret').value = s.smsApiSecret || '';
      if ($('settingSmsEndpoint')) $('settingSmsEndpoint').value = s.smsEndpoint || '';
      if ($('settingEnableSmsOtp')) $('settingEnableSmsOtp').checked = Boolean(s.enableSmsOtp);

      if (isAdmin() && $('smtpConfigurationStatus')) {
        try {
          const mailConfig = await api('/notifications/config');
          $('smtpConfigurationStatus').textContent = mailConfig.smtpConfigured
            ? '✓ Máy chủ SMTP đang hoạt động bình thường. Email thông báo được gửi tự động theo lịch.'
            : '⚠ SMTP chưa được cấu hình qua biến môi trường. Hệ thống vẫn lưu trữ thông báo nội bộ trong ứng dụng.';
        } catch (_) { }
      }
    } catch (error) {
      if (showErrors) notify(`Không tải được cấu hình: ${error.message}`, true);
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
      notify(`Không lưu được cấu hình: ${error.message}`, true);
    }
  }

  async function triggerAutomationRules() {
    try {
      notify('Đang quét và thực thi các quy tắc tự động hóa...');
      const res = await api('/system/settings/trigger-automation', { method: 'POST' });
      notify(res.message || 'Đã thực thi quy tắc tự động hóa thành công.');
      await Promise.all([loadUsers(), loadDashboard()]);
    } catch (error) {
      notify(`Lỗi thực thi tự động hóa: ${error.message}`, true);
    }
  }

  async function downloadDatabaseBackup() {
    try {
      notify('Đang kết xuất bản sao lưu SQL...');
      const res = await fetch('/system/settings/backup/download', {
        headers: state.token ? { Authorization: `Bearer ${state.token}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = res.headers.get('content-disposition');
      const filenameMatch = disposition && disposition.match(/filename="?([^"]+)"?/);
      a.download = filenameMatch ? filenameMatch[1] : `library_backup_${new Date().toISOString().slice(0, 10)}.sql`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      notify('✓ Tải xuống bản sao lưu SQL thành công.');
      if ($('lastBackupStatusText')) {
        $('lastBackupStatusText').textContent = `✓ Bản sao lưu gần nhất: ${new Date().toLocaleString('vi-VN')}`;
      }
    } catch (error) {
      notify(`Không thể tải bản sao lưu: ${error.message}`, true);
    }
  }

  async function triggerManualBackup() {
    try {
      notify('Đang tạo bản sao lưu dữ liệu...');
      const res = await api('/system/settings/backup/manual', { method: 'POST' });
      notify(`✓ Sao lưu thành công: ${res.tablesExported} bảng (${res.totalRows} bản ghi).`);
      if ($('lastBackupStatusText')) {
        $('lastBackupStatusText').textContent = `✓ Bản sao lưu gần nhất: ${new Date().toLocaleString('vi-VN')} (${res.tablesExported} bảng, ${res.totalRows} bản ghi)`;
      }
    } catch (error) {
      notify(`Lỗi sao lưu: ${error.message}`, true);
    }
  }


  async function renderReaderFavorites() {
    const tbody = $('readerFavoritesList');
    if (!tbody) return;
    try {
      const favs = await api('/books/favorites/my');
      if (!favs || !favs.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#888;padding:1.5rem;">Chưa có cuốn sách nào trong danh sách yêu thích.</td></tr>';
        return;
      }
      tbody.innerHTML = favs.map((fav) => {
        const book = fav.book || fav;
        const coverUrl = safeCoverUrl(book.coverImageUrl);
        const isAvail = (book.availableCopies || 0) > 0;
        return `<tr>
          <td style="width:50px;">
            ${coverUrl ? `<img src="${escapeHtml(coverUrl)}" style="width:38px;height:52px;object-fit:cover;border-radius:4px;">` : `<div style="width:38px;height:52px;background:#e2e8f0;border-radius:4px;display:flex;align-items:center;justify-content:center;font-weight:bold;">📖</div>`}
          </td>
          <td><strong>${escapeHtml(book.title)}</strong></td>
          <td>${escapeHtml(book.author)}</td>
          <td>${escapeHtml(book.category?.name || 'Chưa phân loại')}</td>
          <td>
            <span class="status-badge" style="background:${isAvail ? '#dcfce7' : '#fee2e2'};color:${isAvail ? '#166534' : '#991b1b'};padding:3px 8px;border-radius:999px;font-size:12px;font-weight:600;">
              ${isAvail ? `Còn ${book.availableCopies} cuốn` : 'Hết bản sao'}
            </span>
          </td>
          <td>
            <div class="button-row" style="margin:0;gap:4px;">
              <button class="button button-light button-small" data-book-detail="${book.id}" type="button">Chi tiết</button>
              ${book.pdfUrl ? `<button class="button button-light button-small" data-read-pdf="${escapeHtml(book.pdfUrl)}" data-title="${escapeHtml(book.title)}" data-id="${book.id}" data-perm="${book.pdfPermission || 'PUBLIC'}" data-preview="${book.previewPages || 5}" data-fmt="${escapeHtml(book.digitalFormat || '')}" type="button" style="color:#0284c7;">📖 Đọc online</button>` : ''}
              <button class="button button-light button-small" data-fav-remove="${book.id}" type="button" style="color:#e11d48;" title="Xóa khỏi yêu thích">✕ Bỏ thích</button>
            </div>
          </td>
        </tr>`;
      }).join('');

      tbody.querySelectorAll('[data-book-detail]').forEach((btn) => {
        btn.addEventListener('click', () => showBookDetails(btn.dataset.bookDetail));
      });
      tbody.querySelectorAll('[data-read-pdf]').forEach((btn) => {
        btn.addEventListener('click', () => openPdfViewer(btn.dataset.readPdf, btn.dataset.title, btn.dataset.id, btn.dataset.perm, btn.dataset.preview, btn.dataset.fmt));
      });
      tbody.querySelectorAll('[data-fav-remove]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = Number(btn.dataset.favRemove);
          try {
            await api(`/books/${id}/favorite`, { method: 'POST' });
            state.myFavoriteIds.delete(id);
            notify('Đã xóa khỏi danh sách yêu thích');
            renderReaderFavorites();
            renderBooks();
          } catch (e) {
            notify(e.message, true);
          }
        });
      });
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:red;padding:1rem;">Lỗi tải sách yêu thích: ${escapeHtml(e.message)}</td></tr>`;
    }
  }

  async function loadReaderProfile(userId) {
    try {
      const profile = await api(`/users/${userId}/profile`);
      state.readerProfileUser = profile.user;
      $('readerProfileTitle').textContent = `Hồ sơ: ${profile.user.fullName || profile.user.username}`;
      const staffProfile = isStaff();
      $('profileQuickBorrow').hidden = !isCounterStaff() || profile.user.role !== 'READER';
      $('profileRenewCard').hidden = !isCounterStaff() || profile.user.role !== 'READER';
      $('profileToggleCard').hidden = !isCounterStaff() || profile.user.role !== 'READER';
      $('profileToggleCard').textContent = profile.user.isActive ? 'Khóa thẻ' : 'Mở khóa thẻ';
      $('profileToggleCard').classList.toggle('button-danger', profile.user.isActive);
      $('profileToggleCard').classList.toggle('button-primary', !profile.user.isActive);
      const cards = [
        ['Phiếu đang mượn', profile.currentLoans.length],
        ['Tiền phạt tích lũy', money(profile.totalFineAmount)],
        ['Tiền phạt chưa thu', money(profile.unpaidFineAmount)],
        ['Sách đang giữ', profile.reservations.length],
      ];
      $('readerProfileSummary').innerHTML = cards.map(([label, value]) =>
        `<article class="stats-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`).join('');
      const profileRows = [
        ...profile.loans.map((record) => ({ ...record, sourceType: 'BORROW' })),
        ...(profile.manualViolations || []).map((fine) => ({ ...fine, sourceType: 'MANUAL' })),
      ];
      $('readerProfileLoans').innerHTML = profileRows.length
        ? profileRows.map((record) => {
          const canRequestRenewal = !staffProfile &&
            record.sourceType === 'BORROW' &&
            record.status === 'BORROWED' &&
            Number(record.extensionCount || 0) < 1 &&
            record.dueDate &&
            new Date(record.dueDate) >= new Date();
          const fineDetails = [
            Number(record.fineAmount) > 0
              ? `${money(record.fineAmount)} · ${escapeHtml(record.fineStatus)}`
              : '',
            Number(record.estimatedFineAmount) > 0
              ? `Ước tính: ${money(record.estimatedFineAmount)}`
              : '',
          ].filter(Boolean).join('<br>');
          return `<tr><td><strong>${escapeHtml(record.book?.title || (record.sourceType === 'MANUAL' ? record.description : 'Sách không còn tồn tại'))}</strong><br><small>${escapeHtml(record.copy?.barcode || '—')}</small></td><td><span class="status status-${escapeHtml(record.sourceType === 'MANUAL' ? 'VIOLATION' : record.status)}">${escapeHtml(record.sourceType === 'MANUAL' ? 'Vi phạm' : record.status)}</span></td><td>${date(record.borrowedAt || record.createdAt)}</td><td>${date(record.dueDate)}</td><td>${date(record.returnedAt)}</td><td>${fineDetails || '—'}</td><td>${canRequestRenewal ? `<button class="button button-light button-small" data-profile-renew="${record.id}" type="button">Xin gia hạn</button>` : '—'}</td></tr>`;
        }).join('')
        : '<tr><td colspan="7">Độc giả chưa có lịch sử mượn.</td></tr>';
      $('readerProfileReservations').innerHTML = profile.reservations.length
        ? profile.reservations.map((reservation) => `<tr><td>${escapeHtml(reservation.book?.title || 'Sách không còn tồn tại')}</td><td>${escapeHtml(reservation.copy?.barcode || '—')}</td><td>${escapeHtml(reservation.status)}</td><td>${date(reservation.expiresAt)}</td></tr>`).join('')
        : '<tr><td colspan="4">Không có sách đang giữ.</td></tr>';
      $('readerProfileLoans').querySelectorAll('[data-profile-renew]').forEach((button) => {
        button.addEventListener('click', () => void renewProfileLoan(button.dataset.profileRenew));
      });

      if ($('profileReaderGroupSelect') && profile.user) {
        $('profileReaderGroupSelect').value = profile.user.readerGroup || 'STUDENT';
        $('profileReaderGroupSelect').onchange = async () => {
          const newGroup = $('profileReaderGroupSelect').value;
          try {
            await api(`/users/${profile.user.id}`, {
              method: 'PATCH',
              body: JSON.stringify({ readerGroup: newGroup }),
            });
            notify(`Đã cập nhật phân loại độc giả thành: ${newGroup}`);
            await Promise.all([loadReaderProfile(profile.user.id), loadUsers()]);
          } catch (err) {
            notify(`Lỗi cập nhật phân loại: ${err.message}`, true);
          }
        };
      }
      renderReaderActivityChart(profile.loans || []);
    } catch (error) {
      notify(`Không tải được hồ sơ độc giả: ${error.message}`, true);
    }
  }

  let readerActivityChartInstance = null;
  function renderReaderActivityChart(loans = []) {
    const canvas = $('readerActivityChart');
    if (!canvas || !window.Chart) return;
    if (readerActivityChartInstance) {
      readerActivityChartInstance.destroy();
      readerActivityChartInstance = null;
    }
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: `T${d.getMonth() + 1}/${d.getFullYear()}` });
    }
    const borrowCounts = months.map(() => 0);
    const returnCounts = months.map(() => 0);
    let overdueCount = 0;
    loans.forEach((loan) => {
      const dStr = String(loan.borrowedAt || loan.createdAt || '').slice(0, 7);
      const idx = months.findIndex((m) => m.key === dStr);
      if (idx >= 0) borrowCounts[idx]++;
      if (loan.returnedAt) {
        const retStr = String(loan.returnedAt).slice(0, 7);
        const rIdx = months.findIndex((m) => m.key === retStr);
        if (rIdx >= 0) returnCounts[rIdx]++;
      }
      if (loan.status === 'OVERDUE' || (Number(loan.fineAmount) > 0)) {
        overdueCount++;
      }
    });

    const totalLoans = loans.length;
    let score = 100;
    if (totalLoans > 0) {
      score = Math.max(60, Math.round(100 - (overdueCount / totalLoans) * 40));
    }
    const scoreBadge = $('readerDiligenceScore');
    if (scoreBadge) {
      if (score >= 90) {
        scoreBadge.textContent = `Hạng chuyên cần: Xuất sắc (${score}/100)`;
        scoreBadge.style.background = '#dcfce7'; scoreBadge.style.color = '#15803d';
      } else if (score >= 75) {
        scoreBadge.textContent = `Hạng chuyên cần: Tốt (${score}/100)`;
        scoreBadge.style.background = '#e0f2fe'; scoreBadge.style.color = '#0369a1';
      } else {
        scoreBadge.textContent = `Hạng chuyên cần: Cần nhắc nhở (${score}/100)`;
        scoreBadge.style.background = '#fef3c7'; scoreBadge.style.color = '#b45309';
      }
    }

    readerActivityChartInstance = new window.Chart(canvas, {
      type: 'bar',
      data: {
        labels: months.map((m) => m.label),
        datasets: [
          { label: 'Sách đã mượn', data: borrowCounts, backgroundColor: 'rgba(59, 130, 246, 0.8)', borderRadius: 4 },
          { label: 'Sách đã trả', data: returnCounts, backgroundColor: 'rgba(16, 185, 129, 0.8)', borderRadius: 4 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
      },
    });
  }

  async function toggleProfileCard() {
    const user = state.readerProfileUser;
    if (!isStaff() || !user || user.role !== 'READER') return;
    const isActive = !user.isActive;
    const action = isActive ? 'mở khóa' : 'khóa';
    if (!window.confirm(`Xác nhận ${action} thẻ của độc giả ${user.username}?`)) return;
    try {
      await api(`/users/${user.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      });
      notify(isActive ? 'Đã mở khóa thẻ độc giả.' : 'Đã khóa thẻ độc giả.');
      await Promise.all([loadReaderProfile(user.id), loadUsers()]);
    } catch (error) {
      notify(error.message, true);
    }
  }

  async function createLoanForProfileReader() {
    const user = state.readerProfileUser;
    if (!isCounterStaff() || !user || user.role !== 'READER') return;
    navigateAdmin('/admin/borrow-return');
    if (!state.settings) await loadSettings(false);
    if (!state.users.some((reader) => reader.id === user.id)) await loadUsers();
    renderQuickBorrowReaders();
    $('quickBorrowReaderSearch').value = '';
    $('quickBorrowReader').value = String(user.id);
    state.staffBorrowBarcodes = [];
    renderBorrowBarcodeList();
    updateBorrowDueSuggestion();
    $('staffBorrowDialog').showModal();
    $('quickBorrowBarcode').focus();
  }

  async function openStaffBorrowDialog() {
    if (!isCounterStaff()) return;
    if (!state.settings) await loadSettings(false);
    state.staffBorrowBarcodes = [];
    $('quickBorrowForm').reset();
    renderBorrowBarcodeList();
    renderQuickBorrowReaders();
    updateBorrowDueSuggestion();
    $('staffBorrowDialog').showModal();
    $('quickBorrowReaderSearch').focus();
  }

  async function createUser(event) {
    event.preventDefault();
    const role = $('newUserRole').value;
    const readerGroup = $('newUserReaderGroup')?.value || $('newUserGroup')?.value || 'STUDENT';
    try {
      await api('/users', {
        method: 'POST',
        body: JSON.stringify({
          username: $('newUsername').value.trim(),
          fullName: $('newFullName').value.trim() || undefined,
          password: $('newUserPassword').value,
          email: $('newUserEmail').value.trim() || undefined,
          phone: $('newUserPhone').value.trim() || undefined,
          role,
          readerGroup,
          maxActiveLoans: Number($('newUserLimit').value),
        }),
      });
      $('userForm').reset();
      $('newUserLimit').value = '5';
      notify('Đã tạo tài khoản.');
      await loadUsers();
    } catch (error) {
      notify(error.message, true);
    }
  }

  function editUser(id) {
    const user = state.users.find((item) => item.id === Number(id));
    if (!user) return;
    $('editUserId').value = user.id;
    $('editUserFullName').value = user.fullName || '';
    $('editUserEmail').value = user.email || '';
    $('editUserPhone').value = user.phone || '';
    $('editUserRole').value = user.role;
    $('editUserRole').disabled = !isAdmin();
    $('editUserLimit').value = user.maxActiveLoans ?? 5;
    if ($('editUserReaderGroup')) {
      $('editUserReaderGroup').value = user.readerGroup || 'STUDENT';
    }
    if ($('editUserReaderGroupWrap')) {
      $('editUserReaderGroupWrap').style.display = user.role === 'READER' ? 'block' : 'none';
    }
    $('editCardIssuedAt').value = user.libraryCardIssuedAt
      ? String(user.libraryCardIssuedAt).slice(0, 10)
      : '';
    $('editCardExpiresAt').value = user.libraryCardExpiresAt
      ? String(user.libraryCardExpiresAt).slice(0, 10)
      : '';
    $('editUserActive').checked = user.isActive;
    $('userDialog').showModal();
  }

  async function updateUser(event) {
    event.preventDefault();
    const id = $('editUserId').value;
    const targetRole = isAdmin() ? $('editUserRole').value : state.users.find((u) => u.id === Number(id))?.role;
    try {
      await api(`/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: $('editUserFullName').value.trim() || undefined,
          email: $('editUserEmail').value.trim() || undefined,
          phone: $('editUserPhone').value.trim() || undefined,
          ...(isAdmin() ? { role: $('editUserRole').value } : {}),
          readerGroup: targetRole === 'READER' ? ($('editUserReaderGroup')?.value || 'STUDENT') : undefined,
          maxActiveLoans: Number($('editUserLimit').value),
          isActive: $('editUserActive').checked,
          libraryCardIssuedAt: $('editCardIssuedAt').value || null,
          libraryCardExpiresAt: $('editCardExpiresAt').value || null,
        }),
      });
      $('userDialog').close();
      notify('Đã cập nhật tài khoản.');
      await loadUsers();
    } catch (error) {
      notify(error.message, true);
    }
  }

  async function toggleUser(id) {
    const user = state.users.find((item) => item.id === Number(id));
    if (!user) return;
    const action = user.isActive ? 'khóa' : 'mở khóa';
    if (!window.confirm(`Xác nhận ${action} tài khoản ${user.username}?`)) return;
    try {
      await api(`/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      notify(`Đã ${action} tài khoản.`);
      if (window.location.pathname === '/admin/staffs') await loadStaffs();
      else await loadUsers();
    } catch (error) {
      notify(error.message, true);
    }
  }

  async function removeCategory(id) {
    if (!window.confirm('Bạn có chắc muốn xóa thể loại này? Sẽ không thể xóa nếu đang có sách liên kết.')) return;
    try {
      const res = await api(`/categories/${id}`, { method: 'DELETE' });
      notify(res?.message || 'Đã xóa thể loại.');
      await Promise.all([loadCategories(), loadBooks(1)]);
    } catch (error) {
      notify(error.message, true);
    }
  }

  async function editCategory(id) {
    let category = state.categories.find((item) => item.id === Number(id));
    if (!category) {
      try {
        category = await api(`/categories/${id}`);
      } catch (e) {
        notify('Không tìm thấy thể loại.', true);
        return;
      }
    }
    $('editCategoryId').value = category.id;
    $('editCategoryDdc').value = category.ddcCode || '';
    $('editCategoryName').value = category.name || '';
    $('editCategoryDesc').value = category.description || '';

    const editParentSel = $('editCategoryParent');
    if (editParentSel) {
      editParentSel.innerHTML = '<option value="">-- Là thể loại gốc --</option>' +
        state.categories
          .filter((c) => c.id !== category.id)
          .map((c) => `<option value="${c.id}">${'— '.repeat(c.level || 0)}${c.ddcCode ? `[${escapeHtml(c.ddcCode)}] ` : ''}${escapeHtml(c.name)}</option>`)
          .join('');
      editParentSel.value = category.parentId || category.parent?.id || '';
    }

    $('categoryEditDialog')?.showModal();
  }

  async function saveCategoryEdit(event) {
    event.preventDefault();
    const id = $('editCategoryId').value;
    const name = $('editCategoryName').value.trim();
    const ddcCode = $('editCategoryDdc')?.value.trim();
    const description = $('editCategoryDesc')?.value.trim();
    const parentId = $('editCategoryParent')?.value;

    const payload = {
      name,
      ddcCode: ddcCode || undefined,
      description: description || undefined,
      parentId: parentId ? Number(parentId) : null,
    };

    try {
      await api(`/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      $('categoryEditDialog')?.close();
      notify('Đã cập nhật thể loại.');
      await Promise.all([loadCategories(), loadBooks(1)]);
    } catch (error) {
      notify(error.message, true);
    }
  }

  async function loadBooks(page = 1) {
    const params = new URLSearchParams({
      keyword: $('searchInput').value.trim(),
      page: String(page),
      limit: '9',
    });
    if (state.categoryId) params.set('categoryId', state.categoryId);
    if ($('availabilityFilter').value) params.set('status', $('availabilityFilter').value);
    if ($('publicationYearFilter').value) {
      params.set('publicationYear', $('publicationYearFilter').value);
    }
    ['shelf', 'floor', 'aisle'].forEach((location) => {
      const value = $(`${location}Filter`).value;
      if (value) params.set(location, value);
    });
    try {
      const result = await api(`/books/search?${params}`);
      state.books = Array.isArray(result.data) ? result.data : [];
      inventoryList = state.books;
      state.page = result.page;
      state.lastPage = result.lastPage;
      $('currentPage').textContent = state.page;
      $('lastPage').textContent = state.lastPage;
      renderBooks();
    } catch (error) {
      notify(`Không tải được sách: ${error.message}`, true);
    }
  }

  async function loadBookLocations() {
    try {
      const locations = await api('/books/locations');
      [
        ['shelfFilter', 'shelves', 'Tất cả kệ'],
        ['floorFilter', 'floors', 'Tất cả tầng'],
        ['aisleFilter', 'aisles', 'Tất cả dãy'],
      ].forEach(([id, field, placeholder]) => {
        const select = $(id);
        const selected = select.value;
        select.innerHTML = `<option value="">${placeholder}</option>` +
          (locations[field] || []).map((value) =>
            `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`,
          ).join('');
        select.value = selected;
      });
    } catch (error) {
      notify(`Không tải được danh sách vị trí sách: ${error.message}`, true);
    }
  }

  async function loadSearchSuggestions(keyword, inputId, listId) {
    const list = $(listId);
    const normalizedKeyword = keyword.trim();
    const requestId = (state.suggestionRequestIds[listId] || 0) + 1;
    state.suggestionRequestIds[listId] = requestId;
    if (normalizedKeyword.length < 2) {
      list.hidden = true;
      $(inputId).setAttribute('aria-expanded', 'false');
      return;
    }

    const params = new URLSearchParams({ keyword: normalizedKeyword, limit: '5' });
    try {
      const result = await api(`/books/search?${params}`);
      if (state.suggestionRequestIds[listId] !== requestId ||
        $(inputId).value.trim() !== normalizedKeyword) return;
      list.innerHTML = result.data.length
        ? result.data.map((book) =>
          `<button class="suggestion-option" role="option" data-search-title="${escapeHtml(book.title)}" type="button"><strong>${escapeHtml(book.title)}</strong><span>${escapeHtml(book.author)} · ISBN ${escapeHtml(book.isbn)}</span></button>`).join('')
        : '<div class="suggestion-empty">Không tìm thấy đầu sách phù hợp.</div>';
      list.hidden = false;
      $(inputId).setAttribute('aria-expanded', 'true');
    } catch (error) {
      if (state.suggestionRequestIds[listId] !== requestId) return;
      list.innerHTML = `<div class="suggestion-empty">Không thể tải gợi ý: ${escapeHtml(error.message)}</div>`;
      list.hidden = false;
      $(inputId).setAttribute('aria-expanded', 'true');
    }
  }

  function chooseSearchSuggestion(event) {
    const option = event.target.closest('[data-search-title]');
    if (!option) return;
    const title = option.dataset.searchTitle;
    $('searchInput').value = title;
    $('globalSearch').value = title;
    $('globalSuggestions').hidden = true;
    $('bookSuggestions').hidden = true;
    $('globalSearch').setAttribute('aria-expanded', 'false');
    if (isInventoryStaff() && window.location.pathname !== '/admin/books') {
      navigateAdmin('/admin/books');
    } else if (isStaff() && window.location.pathname !== '/search' &&
      window.location.pathname !== '/admin/books') {
      window.history.pushState({}, '', '/search');
      syncAdminRoute();
    } else if (window.location.pathname !== '/search' &&
      window.location.pathname !== '/admin/books') {
      window.history.pushState({}, '', '/search');
      syncAdminRoute();
    }
    $('searchInput').scrollIntoView({ behavior: 'smooth', block: 'center' });
    void loadBooks(1);
  }


  async function loadMyFavoriteIds() {
    if (!state.user) {
      state.myFavoriteIds = new Set();
      return;
    }
    try {
      const favs = await api('/books/favorites/my');
      state.myFavoriteIds = new Set((favs || []).map((f) => Number(f.bookId || f.id)));
    } catch (_) {
      state.myFavoriteIds = new Set();
    }
  }

  function renderBooks() {
    const books = state.books;
    $('bookList').innerHTML = books.length ? books.map((book) => {
      const coverUrl = safeCoverUrl(book.coverImageUrl);
      const locations = getBookLocations(book);
      const isFav = state.myFavoriteIds && state.myFavoriteIds.has(Number(book.id));
      const actions = [
        state.user ? `<button class="button button-light button-small" data-favorite="${book.id}" title="${isFav ? 'Bỏ yêu thích' : 'Yêu thích'}" type="button" style="color:${isFav ? '#e11d48' : '#64748b'};padding:4px 8px;font-size:14px;">${isFav ? '❤️' : '🤍'}</button>` : '',
        `<button class="button button-light button-small" data-book-detail="${book.id}" type="button">ⓘ Chi tiết</button>`,
        (book.shelf || book.floor) ? `<button class="button button-light button-small" data-shelf-code="${escapeHtml(book.shelf || '')}" data-floor="${escapeHtml(book.floor || '1')}" type="button" title="Xem vị trí kệ trên sơ đồ">📍 Vị trí kệ</button>` : '',
        state.user && book.availableCopies > 0
          ? `<button class="button button-primary button-small" data-borrow="${book.id}" data-title="${escapeHtml(book.title)}" type="button">＋ Mượn</button>`
          : state.user && book.availableCopies <= 0
            ? `<button class="button button-light button-small" data-reserve="${book.id}" type="button">Đặt giữ</button>` : '',
        `<button class="button button-light button-small" data-review="${book.id}" data-title="${escapeHtml(book.title)}" type="button">Đánh giá</button>`,
        isInventoryStaff() ? `<button class="button button-light button-small" data-copies="${book.id}" type="button">Bản sao</button><button class="button button-light button-small" data-edit="${book.id}" type="button">Sửa</button>` : '',
        isAdmin() ? `<button class="button button-danger button-small" data-delete-book="${book.id}" type="button">Ẩn</button>` : '',
        book.pdfUrl ? `<button class="button button-primary button-small" style="background:#2b6cb0;" data-read-pdf="${escapeHtml(book.pdfUrl)}" data-title="${escapeHtml(book.title)}" data-id="${book.id}" data-perm="${book.pdfPermission || 'PUBLIC'}" type="button">📖 Đọc online</button>` : '',
      ].join('');
      return `<article class="book-card"><div class="book-top"><div class="book-cover" aria-hidden="true"><span>${escapeHtml(book.title.slice(0, 1).toLocaleUpperCase('vi'))}</span>${coverUrl ? `<img src="${escapeHtml(coverUrl)}" alt="" loading="lazy">` : ''}</div><span class="inventory-badge ${book.availableCopies > 0 ? 'inventory-available' : 'inventory-unavailable'}">${book.availableCopies > 0 ? `Còn ${book.availableCopies} bản` : 'Hết hàng'}</span></div><h3>${escapeHtml(book.title)}</h3><p class="book-author">${escapeHtml(book.author)}</p><div class="book-meta"><span class="book-tag category-tag">${escapeHtml(book.category?.name || 'Chưa phân loại')}</span><span class="book-tag publisher-tag">${escapeHtml(book.publisher?.name || 'Chưa có nhà xuất bản')}</span><span class="book-location" data-shelf-code="${escapeHtml(book.shelf || '')}" data-floor="${escapeHtml(book.floor || '1')}" style="cursor:pointer;" title="Bấm để xem vị trí trên Sơ đồ kệ">${escapeHtml(locations.length ? locations.join(' · ') : 'Chưa có vị trí')}</span><span>ISBN ${escapeHtml(book.isbn)}</span>${book.publicationYear ? `<span>${escapeHtml(book.publicationYear)}</span>` : ''}</div><div class="book-actions">${actions}</div></article>`;
    }).join('') : `<div class="book-empty-state"><strong>Chưa tìm thấy đầu sách phù hợp</strong><p>${hasBookFilters() ? 'Thử thay đổi bộ lọc hoặc xóa điều kiện tìm kiếm.' : 'Danh mục hiện chưa có sách để hiển thị.'}</p><div class="button-row"><button class="button button-light" data-clear-book-filters type="button">Xóa bộ lọc</button>${isAdmin() ? '<button class="button button-primary" data-empty-create-book type="button">+ Thêm sách</button>' : ''}</div></div>`;
    $('bookList').querySelectorAll('.book-cover img').forEach((image) => {
      image.addEventListener('error', () => image.remove(), { once: true });
    });
    $('bookList').querySelector('[data-clear-book-filters]')?.addEventListener('click', () => {
      $('searchInput').value = '';
      $('globalSearch').value = '';
      $('categoryFilter').value = '';
      $('availabilityFilter').value = '';
      $('publicationYearFilter').value = '';
      $('shelfFilter').value = '';
      $('floorFilter').value = '';
      $('aisleFilter').value = '';
      state.categoryId = '';
      void loadBooks(1);
    });
    $('bookList').querySelector('[data-empty-create-book]')?.addEventListener('click', () => $('newBookButton').click());
    document.querySelectorAll('[data-borrow]').forEach((button) => button.addEventListener('click', () => {
      $('loanBookId').value = button.dataset.borrow;
      $('loanDialogTitle').textContent = `Đăng ký mượn “${button.dataset.title}”?`;
      $('loanDialog').showModal();
    }));
    document.querySelectorAll('[data-book-detail]').forEach((button) => {
      button.addEventListener('click', () => void showBookDetails(button.dataset.bookDetail));
    });
    document.querySelectorAll('[data-shelf-code]').forEach((button) => {
      button.addEventListener('click', () => {
        const floor = button.dataset.floor || '1';
        const shelf = button.dataset.shelfCode || '';
        window.history.pushState({}, '', `/admin/shelves?floor=${encodeURIComponent(floor)}&id=${encodeURIComponent(shelf)}`);
        syncAdminRoute();
      });
    });
    document.querySelectorAll('[data-read-pdf]').forEach((button) => {
      button.addEventListener('click', () => void openPdfViewer(button.dataset.readPdf, button.dataset.title, button.dataset.id, button.dataset.perm));
    });
    document.querySelectorAll('[data-reserve]').forEach((button) => button.addEventListener('click', () => void reserveBook(button.dataset.reserve)));
    document.querySelectorAll('[data-review]').forEach((button) => button.addEventListener('click', () => void openReviews(button.dataset.review, button.dataset.title)));
    document.querySelectorAll('[data-edit]').forEach((button) => button.addEventListener('click', () => editBook(button.dataset.edit)));
    document.querySelectorAll('[data-delete-book]').forEach((button) => button.addEventListener('click', () => void removeBook(button.dataset.deleteBook)));
    document.querySelectorAll('[data-copies]').forEach((button) => button.addEventListener('click', () => void manageCopies(button.dataset.copies)));
    document.querySelectorAll('[data-favorite]').forEach((button) => button.addEventListener('click', async () => {
      const bookId = Number(button.dataset.favorite);
      try {
        const res = await api(`/books/${bookId}/favorite`, { method: 'POST' });
        if (res.isFavorite) {
          state.myFavoriteIds.add(bookId);
          notify('Đã thêm vào sách yêu thích ❤️');
        } else {
          state.myFavoriteIds.delete(bookId);
          notify('Đã bỏ yêu thích sách');
        }
        renderBooks();
        if (state.readerProfileUser?.id === state.user?.id) {
          renderReaderFavorites();
        }
      } catch (err) {
        notify(err.message, true);
      }
    }));
  }

  function csvCell(value) {
    let text = String(value ?? '');
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  }

  function downloadBookTemplate() {
    const columns = [
      'title', 'author', 'isbn', 'totalCopies', 'availableCopies', 'categoryId',
      'publisherId', 'publicationYear', 'description', 'coverImageUrl', 'shelf', 'floor', 'aisle',
    ];
    downloadFile('mau-nhap-sach.csv', `\uFEFF${columns.join(',')}\r\n`, 'text/csv;charset=utf-8');
  }

  async function importBooks(event) {
    event.preventDefault();
    const file = $('bookImportFile').files[0];
    if (!file) return;
    const body = new FormData();
    body.append('file', file);
    try {
      const result = await api('/books/import', { method: 'POST', body });
      const failures = result.rows.filter((row) => row.status === 'failed');
      $('bookImportResults').hidden = false;
      $('bookImportResults').innerHTML = `<strong>Đã thêm ${result.created}/${result.total} sách; lỗi ${result.failed} dòng.</strong>${failures.length ? `<ul>${failures.map((row) => `<li class="import-failure">Dòng ${row.row}${row.title ? ` · ${escapeHtml(row.title)}` : ''}: ${escapeHtml((row.errors || []).join('; '))}</li>`).join('')}</ul>` : ''}`;
      $('bookImportForm').reset();
      notify(`Nhập dữ liệu hoàn tất: ${result.created} thành công, ${result.failed} lỗi.`);
      await Promise.all([loadBooks(1), loadDashboard()]);
    } catch (error) {
      notify(`Không nhập được danh sách sách: ${error.message}`, true);
    }
  }

  async function exportBooksCsv() {
    try {
      const books = [];
      let page = 1;
      let lastPage = 1;
      do {
        const result = await api(`/books?page=${page}&limit=100`);
        books.push(...result.data);
        lastPage = result.lastPage;
        page += 1;
      } while (page <= lastPage);
      const headers = [
        'title', 'author', 'isbn', 'totalCopies', 'availableCopies', 'categoryId',
        'publisherId', 'publicationYear', 'description', 'coverImageUrl', 'shelf', 'floor', 'aisle',
      ];
      const rows = books.map((book) => [
        book.title, book.author, book.isbn, book.totalCopies, book.availableCopies,
        book.category?.id, book.publisher?.id, book.publicationYear, book.description,
        book.coverImageUrl, book.shelf, book.floor, book.aisle,
      ]);
      const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
      downloadFile(
        `danh-sach-sach-${new Date().toISOString().slice(0, 10)}.csv`,
        `\uFEFF${csv}`,
        'text/csv;charset=utf-8',
      );
      notify(`Đã xuất ${books.length} đầu sách ra CSV.`);
    } catch (error) {
      notify(`Không xuất được danh sách sách: ${error.message}`, true);
    }
  }

  function safeCoverUrl(value) {
    if (!value) return '';
    try {
      const url = new URL(value, window.location.origin);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  }

  function getBookLocations(book) {
    const format = (item) => [
      item.shelf && `Kệ ${item.shelf}`,
      item.floor && `Tầng ${item.floor}`,
      item.aisle && item.aisle,
    ].filter(Boolean).join(' · ');
    const locations = [format(book), ...(book.locations || []).map(format)]
      .filter(Boolean);
    return [...new Set(locations)].slice(0, 2);
  }

  function hasBookFilters() {
    return Boolean(
      $('searchInput').value.trim() ||
      $('categoryFilter').value ||
      $('availabilityFilter').value ||
      $('publicationYearFilter').value ||
      $('shelfFilter').value ||
      $('floorFilter').value ||
      $('aisleFilter').value,
    );
  }


  // STAR RATING & REVIEWS IN BOOK DETAILS
  async function loadBookReviews(bookId) {
    const list = $('bookReviewsList');
    const avgDisplay = $('avgRatingDisplay');
    if (!list) return;

    try {
      const reviews = await api(`/reviews/book/${bookId}`);
      if (!reviews || !reviews.length) {
        if (avgDisplay) avgDisplay.textContent = 'Chưa có đánh giá nào từ độc giả. Hãy là người đầu tiên!';
        list.innerHTML = '<span style="color:#888;font-size:13px;">Chưa có nhận xét nào. Hãy gửi cảm nhận của bạn!</span>';
        return;
      }

      const avg = (reviews.reduce((sum, r) => sum + Number(r.rating || 5), 0) / reviews.length).toFixed(1);
      if (avgDisplay) {
        avgDisplay.innerHTML = `<strong style="color:#f59e0b;font-size:14px;">★ ${avg} / 5.0</strong> (${reviews.length} lượt bạn đọc đánh giá)`;
      }

      list.innerHTML = reviews.map((r) => {
        const stars = '★'.repeat(r.rating || 5) + '☆'.repeat(Math.max(0, 5 - (r.rating || 5)));
        const authorName = r.user ? (r.user.fullName || r.user.username) : 'Bạn đọc thư viện';
        const d = r.createdAt ? new Date(r.createdAt).toLocaleDateString('vi-VN') : '';
        return `
          <div style="background:#fff;border:1px solid #edf2f7;border-radius:8px;padding:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-weight:700;font-size:13px;color:#1e293b;">${escapeHtml(authorName)}</span>
              <span style="color:#f59e0b;font-size:13px;letter-spacing:1px;">${stars}</span>
            </div>
            ${r.comment ? `<p style="margin:4px 0 0 0;font-size:13px;color:#475569;line-height:1.4;">${escapeHtml(r.comment)}</p>` : ''}
            <small style="color:#94a3b8;font-size:11px;">${d}</small>
          </div>
        `;
      }).join('');
    } catch (_) {
      if (list) list.innerHTML = '<span style="color:#888;font-size:13px;">Chưa có đánh giá nào.</span>';
    }
  }

  async function showBookDetails(id) {
    try {
      const book = await api(`/books/${id}`);
      state.currentDetailBookId = Number(book.id);
      const coverUrl = safeCoverUrl(book.coverImageUrl);
      $('bookDetailTitle').textContent = book.title;
      $('bookDetailBody').innerHTML = `
        <div class="detail-cover"><span aria-hidden="true">${escapeHtml(book.title.slice(0, 1).toLocaleUpperCase('vi'))}</span>${coverUrl
          ? `<img src="${escapeHtml(coverUrl)}" alt="Bìa sách ${escapeHtml(book.title)}" loading="lazy">`
          : ''}</div>
        <div class="detail-copy">
          <p class="book-author">${escapeHtml(book.author)}</p>
          <p>${escapeHtml(book.description || 'Chưa có mô tả cho đầu sách này.')}</p>
          <dl class="detail-meta">
            <div><dt>ISBN</dt><dd>${escapeHtml(book.isbn)}</dd></div>
            <div><dt>Năm xuất bản</dt><dd>${escapeHtml(book.publicationYear || 'Chưa cập nhật')}</dd></div>
            <div><dt>Thể loại</dt><dd>${escapeHtml(book.category?.name || 'Chưa phân loại')}</dd></div>
            <div><dt>Nhà xuất bản</dt><dd>${escapeHtml(book.publisher?.name || 'Chưa cập nhật')}</dd></div>
            <div><dt>Vị trí</dt><dd>${escapeHtml([book.shelf && `Kệ ${book.shelf}`, book.floor && `Tầng ${book.floor}`, book.aisle].filter(Boolean).join(' · ') || 'Chưa cập nhật')}</dd></div>
            <div><dt>Tình trạng</dt><dd>${Number(book.availableCopies)} / ${Number(book.totalCopies)} bản có sẵn</dd></div>${book.pdfUrl ? `<div><dt>Tài liệu số</dt><dd><button class="button button-primary button-small" style="background:#2b6cb0;" data-detail-read-pdf type="button">📖 Đọc PDF online</button></dd></div>` : ''}
          </dl>
        </div>`;
      $('bookDetailBody').querySelector('.detail-cover img')?.addEventListener('error', (event) => {
        event.currentTarget.remove();
      }, { once: true });
      $('detailReserveButton').hidden = Number(book.availableCopies) > 0;

      const relatedList = $('relatedBooksList');
      if (relatedList) {
        relatedList.innerHTML = '<span style="color:#888;font-size:13px;">Đang tìm sách cùng thể loại...</span>';
        try {
          const related = await api(`/books/${id}/related`);
          if (!related || !related.length) {
            relatedList.innerHTML = '<span style="color:#888;font-size:13px;">Không có sách cùng thể loại khác.</span>';
          } else {
            relatedList.innerHTML = related.map((rb) => {
              const rbCover = safeCoverUrl(rb.coverImageUrl);
              return `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px;display:flex;gap:8px;align-items:center;">
                ${rbCover ? `<img src="${escapeHtml(rbCover)}" style="width:34px;height:48px;object-fit:cover;border-radius:4px;flex-shrink:0;">` : `<div style="width:34px;height:48px;background:#e2e8f0;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;">📖</div>`}
                <div style="flex:1;min-width:0;">
                  <strong style="display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escapeHtml(rb.title)}">${escapeHtml(rb.title)}</strong>
                  <span style="display:block;font-size:12px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(rb.author)}</span>
                  <button class="button button-light button-small" data-related-detail="${rb.id}" type="button" style="margin-top:3px;padding:1px 6px;font-size:11px;">Xem sách</button>
                </div>
              </div>`;
            }).join('');

            relatedList.querySelectorAll('[data-related-detail]').forEach((btn) => {
              btn.addEventListener('click', () => {
                showBookDetails(btn.dataset.relatedDetail);
              });
            });
          }
        } catch (_) {
          relatedList.innerHTML = '<span style="color:#888;font-size:13px;">Không tải được sách gợi ý.</span>';
        }
      }

      // Update shelf location visualizer
      const shelfLoc = [
        book.floor ? `Tầng ${book.floor}` : '',
        book.aisle ? book.aisle : '',
        book.shelf ? `Kệ ${book.shelf}` : '',
      ].filter(Boolean).join(' · ') || 'Vị trí: Đang cập nhật sắp xếp';

      if ($('shelfLocText')) $('shelfLocText').textContent = shelfLoc;
      const copiesAvail = Number(book.availableCopies || 0);
      const copiesTotal = Number(book.totalCopies || 0);
      if ($('shelfStockBadge')) {
        $('shelfStockBadge').textContent = copiesAvail > 0 ? `Còn ${copiesAvail}/${copiesTotal} cuốn sẵn sàng` : 'Tất cả bản sao đang được mượn';
        $('shelfStockBadge').style.background = copiesAvail > 0 ? '#166534' : '#991b1b';
      }

      // Load reviews
      loadBookReviews(book.id);

      // Reset review form
      if ($('submitBookReviewForm')) $('submitBookReviewForm').hidden = true;
      if ($('reviewCommentInput')) $('reviewCommentInput').value = '';

      $('bookDetailDialog').showModal();
    } catch (error) {
      notify(`Không tải được chi tiết sách: ${error.message}`, true);
    }
  }

  async function borrowBook(bookId) {
    try {
      await api(`/borrow/${bookId}`, { method: 'POST' });
      $('loanDialog').close();
      notify('Yêu cầu mượn đã gửi, đang chờ thư viện duyệt.');
      await Promise.all([loadBooks(state.page), loadBorrowRecords()]);
    } catch (error) {
      notify(error.message, true);
    }
  }

  async function reserveBook(bookId) {
    if (!state.user) {
      notify('Vui lòng đăng nhập để đặt giữ chỗ.', true);
      $('openLogin')?.click();
      $('authUsername').focus();
      return;
    }
    try {
      await api(`/reservations/books/${bookId}`, { method: 'POST' });
      $('bookDetailDialog').close();
      notify('Đã thêm bạn vào hàng đợi giữ sách.');
      await Promise.all([loadReservations(), loadBooks(state.page)]);
    } catch (error) {
      notify(error.message, true);
    }
  }

  async function scanBarcode() {
    const barcode = $('barcodeInput').value.trim();
    if (!barcode) return;
    try {
      const copy = await api(`/books/barcode/${encodeURIComponent(barcode)}`);
      notify(`Đã nhận diện ${copy.book.title} · ${copy.status}`);
      if (state.user && copy.status === 'AVAILABLE') {
        if (window.confirm(`Gửi yêu cầu mượn "${copy.book.title}" theo mã ${barcode}?`)) {
          await api(`/borrow/barcode/${encodeURIComponent(barcode)}`, { method: 'POST' });
          notify('Yêu cầu mượn theo barcode đã gửi.');
          await loadBorrowRecords();
        }
      }
    } catch (error) {
      notify(error.message, true);
    }
    $('barcodeInput').value = '';
  }

  async function saveBook(event) {
    event.preventDefault();
    const id = $('bookId')?.value;
    const title = $('bookTitle')?.value.trim() || '';
    const author = $('bookAuthor')?.value.trim() || '';
    if (title.length < 2) {
      $('bookTitle')?.setCustomValidity('Tên sách phải có ít nhất 2 ký tự.');
      $('bookTitle')?.reportValidity();
      $('bookTitle')?.setCustomValidity('');
      return;
    }
    if (author.length < 2) {
      $('bookAuthor')?.setCustomValidity('Tên tác giả phải có ít nhất 2 ký tự.');
      $('bookAuthor')?.reportValidity();
      $('bookAuthor')?.setCustomValidity('');
      return;
    }
    const isbn = $('bookIsbn')?.value.trim() || '';
    if (!isbn) {
      $('bookIsbn')?.setCustomValidity('Mã ISBN không được để trống.');
      $('bookIsbn')?.reportValidity();
      $('bookIsbn')?.setCustomValidity('');
      return;
    }
    const totalCopies = Math.max(1, Number($('bookCopies')?.value) || 1);
    const categoryId = $('bookCategory')?.value;
    const publisherId = $('publisherId')?.value;
    const pubYear = Number($('bookPublicationYear')?.value);

    const payload = {
      title,
      author,
      isbn,
      publicationYear: (pubYear && pubYear >= 1000 && pubYear <= 9999) ? pubYear : undefined,
      totalCopies,
      ...(!id ? { availableCopies: totalCopies } : {}),
      ...(categoryId ? { categoryId: Number(categoryId) } : {}),
      ...(publisherId ? { publisherId: Number(publisherId) } : (id ? { publisherId: null } : {})),
      shelf: $('bookShelf')?.value.trim() || undefined,
      floor: $('bookFloor')?.value.trim() || undefined,
      aisle: $('bookAisle')?.value.trim() || undefined,
      description: $('bookDescription')?.value.trim() || undefined,
      coverImageUrl: $('bookCoverImageUrl')?.value.trim() || undefined,
      pdfUrl: $('bookPdfUrl')?.value.trim() || undefined,
    };
    try {
      await api(id ? `/books/${id}` : '/books', {
        method: id ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });
      if ($('bookFormPanel')) $('bookFormPanel').hidden = true;
      if ($('bookForm')) $('bookForm').reset();
      if ($('bookId')) $('bookId').value = '';
      notify(id ? 'Đã cập nhật đầu sách thành công!' : 'Đã thêm đầu sách và tạo barcode cho các bản sao thành công!');
      await Promise.all([loadBooks(state.page), loadDashboard()]);
    } catch (error) {
      notify(error.message || 'Không thể lưu thông tin sách. Vui lòng kiểm tra lại dữ liệu.', true);
    }
  }


  // XUẤT EXCEL DANH MỤC SÁCH
  async function exportBooksExcel() {
    try {
      const books = [];
      let page = 1;
      let lastPage = 1;
      do {
        const result = await api(`/books?page=${page}&limit=100`);
        books.push(...result.data);
        lastPage = result.lastPage;
        page += 1;
      } while (page <= lastPage);

      const tableRows = books.map((b) => {
        const loc = [
          b.floor ? `Tầng ${b.floor}` : '',
          b.aisle ? b.aisle : '',
          b.shelf ? `Kệ ${b.shelf}` : '',
        ].filter(Boolean).join(' - ') || 'Chưa xếp kệ';
        const st = Number(b.availableCopies) > 0 ? 'Còn bản sao' : 'Hết sách';
        return `<tr>
          <td>${b.id}</td>
          <td>${escapeHtml(b.title)}</td>
          <td>${escapeHtml(b.author)}</td>
          <td style="mso-number-format:'\\@';">${escapeHtml(b.isbn)}</td>
          <td>${escapeHtml(b.category?.name || 'Chưa phân loại')}</td>
          <td>${escapeHtml(b.publisher?.name || '—')}</td>
          <td>${b.publicationYear || '—'}</td>
          <td>${escapeHtml(loc)}</td>
          <td>${b.totalCopies}</td>
          <td>${b.availableCopies}</td>
          <td>${st}</td>
          <td>${b.pdfUrl ? 'Có file PDF' : 'Không'}</td>
        </tr>`;
      }).join('');

      const excelHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>DanhMucSach</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        <style>th{background:#123c35;color:#ffffff;font-weight:bold;border:1px solid #000;padding:6px;}td{border:1px solid #ccc;padding:5px;}</style>
        </head><body>
        <h2>DANH MỤC SÁCH THƯ VIỆN</h2>
        <p>Ngày xuất: ${new Date().toLocaleString('vi-VN')} | Tổng số: ${books.length} đầu sách</p>
        <table>
          <thead><tr>
            <th>ID</th><th>Tên sách</th><th>Tác giả</th><th>Mã ISBN</th><th>Thể loại</th><th>Nhà xuất bản</th><th>Năm XB</th><th>Vị trí vật lý</th><th>Tổng bản sao</th><th>Bản sẵn sàng</th><th>Tình trạng kho</th><th>Tài liệu số</th>
          </tr></thead>
          <tbody>${tableRows}</tbody>
        </table></body></html>`;

      const blob = new Blob(['\uFEFF' + excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `danh_muc_sach_${Date.now()}.xls`;
      a.click();
      notify(`Đã xuất thành công ${books.length} đầu sách ra file Excel.`);
    } catch (e) {
      notify('Lỗi xuất Excel: ' + e.message, true);
    }
  }

  // XỬ LÝ UPLOAD ẢNH BÌA & PDF
  function updateCoverPreview(url) {
    const previewContainer = $('bookCoverPreviewContainer');
    const previewImg = $('bookCoverPreviewImg');
    if (!previewContainer || !previewImg) return;
    if (url && url.trim()) {
      previewImg.src = url.trim();
      previewContainer.style.display = 'flex';
      previewImg.onerror = () => { previewContainer.style.display = 'none'; };
    } else {
      previewContainer.style.display = 'none';
      previewImg.src = '';
    }
  }

  async function handleCoverFileUpload(file) {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      notify('Đang tải ảnh bìa lên hệ thống...');
      const res = await api('/books/upload-cover', { method: 'POST', body: fd });
      if ($('bookCoverImageUrl')) {
        $('bookCoverImageUrl').value = res.coverUrl;
        updateCoverPreview(res.coverUrl);
      }
      notify(res.message || 'Tải ảnh bìa thành công!');
    } catch (err) {
      notify('Lỗi tải ảnh bìa: ' + err.message, true);
    }
  }

  async function handlePdfFileUpload(file) {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      notify('Đang tải tệp PDF lên hệ thống...');
      const res = await api('/books/upload-pdf', { method: 'POST', body: fd });
      if ($('bookPdfUrl')) {
        $('bookPdfUrl').value = res.pdfUrl;
      }
      if ($('bookTestPdfBtn')) {
        $('bookTestPdfBtn').style.display = 'inline-block';
      }
      notify(res.message || 'Tải tài liệu số PDF thành công!');
    } catch (err) {
      notify('Lỗi tải PDF: ' + err.message, true);
    }
  }

  function editBook(id) {
    const book = state.books.find((item) => item.id === Number(id));
    if (!book) return;
    $('bookFormPanel').hidden = false;
    $('bookFormPanel').scrollIntoView({ behavior: 'smooth' });
    $('bookFormTitle').textContent = `Cập nhật: ${book.title}`;
    $('bookId').value = book.id;
    $('bookTitle').value = book.title;
    $('bookAuthor').value = book.author;
    $('bookIsbn').value = book.isbn;
    $('bookPublicationYear').value = book.publicationYear || '';
    $('bookCopies').value = book.totalCopies;
    $('bookCategory').value = book.category?.id || '';
    $('publisherId').value = book.publisher?.id || '';
    $('bookShelf').value = book.shelf || '';
    $('bookFloor').value = book.floor || '';
    $('bookAisle').value = book.aisle || '';
    $('bookDescription').value = book.description || '';
    $('bookCoverImageUrl').value = book.coverImageUrl || '';
    if ($('bookPdfUrl')) $('bookPdfUrl').value = book.pdfUrl || '';
  }

  async function removeBook(id) {
    if (!window.confirm('Ẩn đầu sách này khỏi danh mục?')) return;
    try {
      await api(`/books/${id}`, { method: 'DELETE' });
      notify('Đã ẩn đầu sách.');
      await loadBooks(state.page);
    } catch (error) {
      notify(error.message, true);
    }
  }

  async function manageCopies(bookId) {
    try {
      state.copyBookId = Number(bookId);
      const [book, copies] = await Promise.all([
        api(`/books/${bookId}`),
        api(`/books/${bookId}/copies`),
      ]);
      $('copiesDialogTitle').textContent = `Bản sao: ${book.title}`;
      renderCopies(book, copies);
      $('copiesDialog').showModal();
    } catch (error) {
      notify(`Không tải được danh sách bản sao: ${error.message}`, true);
    }
  }

  function renderCopies(book, copies) {
    const statusLabels = {
      AVAILABLE: 'Sẵn sàng',
      RESERVED: 'Đang giữ (quy trình mượn)',
      BORROWED: 'Đang mượn (quy trình mượn)',
      MAINTENANCE: 'Bảo trì',
      DAMAGED: 'Hỏng',
      LOST: 'Mất',
      DISPOSED: 'Đã thanh lý / hủy',
      LIGHT_DAMAGE: 'Hỏng nhẹ',
      SEVERE_DAMAGE: 'Hỏng nặng',
    };
    $('copiesList').innerHTML = copies.length ? copies.map((copy) => `
      <div class="copy-row" data-copy-row="${copy.id}">
        <div class="copy-barcode"><strong>${escapeHtml(copy.barcode)}</strong><small>Bản sao #${escapeHtml(copy.id)}</small></div>
        <label>Tình trạng
          <select data-copy-status="${copy.id}" ${copy.status === BookCopyStatusForUi.DISPOSED ? 'disabled' : ''}>
            ${[BookCopyStatusForUi.AVAILABLE, BookCopyStatusForUi.RESERVED, BookCopyStatusForUi.BORROWED,
      BookCopyStatusForUi.MAINTENANCE,
      BookCopyStatusForUi.DAMAGED, BookCopyStatusForUi.LOST,
      BookCopyStatusForUi.DISPOSED].map((status) =>
        `<option value="${status}" ${copy.status === status ? 'selected' : ''} ${['RESERVED', 'BORROWED'].includes(status) ? 'disabled' : ''}>${escapeHtml(statusLabels[status])}</option>`).join('')}
          </select>
        </label>
        <label>Kệ<input data-copy-shelf="${copy.id}" maxlength="100" value="${escapeHtml(copy.shelf ?? book.shelf ?? '')}"></label>
        <label>Tầng<input data-copy-floor="${copy.id}" maxlength="50" value="${escapeHtml(copy.floor ?? book.floor ?? '')}"></label>
        <label>Dãy<input data-copy-aisle="${copy.id}" maxlength="100" value="${escapeHtml(copy.aisle ?? book.aisle ?? '')}"></label>
        <button class="button button-primary button-small" data-save-copy="${copy.id}" type="button">Lưu</button>
      </div>`).join('') : '<p>Chưa có bản sao nào.</p>';
    document.querySelectorAll('[data-save-copy]').forEach((button) => {
      button.addEventListener('click', () => void saveCopy(book, button.dataset.saveCopy));
    });
  }

  const BookCopyStatusForUi = Object.freeze({
    AVAILABLE: 'AVAILABLE',
    RESERVED: 'RESERVED',
    BORROWED: 'BORROWED',
    DAMAGED: 'DAMAGED',
    LOST: 'LOST',
    DISPOSED: 'DISPOSED',
    MAINTENANCE: 'MAINTENANCE',
  });

  async function saveCopy(book, copyId) {
    try {
      await api(`/books/${state.copyBookId}/copies/${copyId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: document.querySelector(`[data-copy-status="${copyId}"]`).value,
          shelf: document.querySelector(`[data-copy-shelf="${copyId}"]`).value.trim() || null,
          floor: document.querySelector(`[data-copy-floor="${copyId}"]`).value.trim() || null,
          aisle: document.querySelector(`[data-copy-aisle="${copyId}"]`).value.trim() || null,
        }),
      });
      notify('Đã cập nhật trạng thái và vị trí bản sao.');
      const copies = await api(`/books/${state.copyBookId}/copies`);
      renderCopies(book, copies);
      await loadBooks(state.page);
    } catch (error) {
      notify(`Không cập nhật được bản sao: ${error.message}`, true);
    }
  }

  async function addCopyFromDialog() {
    if (!state.copyBookId) return;
    try {
      const copy = await api(`/books/${state.copyBookId}/copies`, { method: 'POST' });
      notify(`Đã thêm bản sao ${copy.barcode}.`);
      await Promise.all([manageCopies(state.copyBookId), loadBooks(state.page)]);
    } catch (error) {
      notify(`Không thêm được bản sao: ${error.message}`, true);
    }
  }

  async function printCopyLabels() {
    if (!state.copyBookId) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return notify('Trình duyệt đã chặn cửa sổ in barcode.', true);
    try {
      const labels = await api(`/books/${state.copyBookId}/copies/labels`);
      if (!labels.length) throw new Error('Đầu sách chưa có bản sao để in nhãn');
      const bookTitle = escapeHtml($('copiesDialogTitle').textContent);
      const cards = labels.map((label) =>
        `<article class="copy-label"><span>${bookTitle}</span><img src="${label.image}" alt="Barcode ${escapeHtml(label.barcode)}"><strong>${escapeHtml(label.barcode)}</strong></article>`,
      ).join('');
      printWindow.document.open();
      printWindow.document.write(`<!doctype html><html><head><meta charset="UTF-8"><title>Nhãn barcode</title><style>@page{size:A4;margin:12mm}body{font:12px Arial,sans-serif;margin:0}.copy-label-page{display:grid;grid-template-columns:repeat(2,1fr);gap:12mm}.copy-label{align-items:center;border:1px dashed #999;display:grid;justify-items:center;min-height:34mm;padding:5mm;text-align:center;break-inside:avoid}.copy-label img{height:18mm;max-width:100%;object-fit:contain}.copy-label strong{font:10pt Arial,sans-serif;overflow-wrap:anywhere}@media print{.copy-label{border-color:#bbb}}</style></head><body><main class="copy-label-page">${cards}</main><script>window.onload=()=>window.print()<\/script></body></html>`);
      printWindow.document.close();
    } catch (error) {
      printWindow.close();
      notify(`Không thể tạo nhãn barcode: ${error.message}`, true);
    }
  }

  function openBatchLabels() {
    $('selectAllLabelBooks').checked = false;
    state.batchLabels = [];
    state.batchLabelBookIds = [];
    $('labelPreview').innerHTML = '<p>Chọn sách để xem trước nhãn barcode.</p>';
    $('labelBookSelector').innerHTML = state.books.length
      ? state.books.map((book) => `<label class="label-book-option"><input type="checkbox" data-label-book="${book.id}"><span><strong>${escapeHtml(book.title)}</strong><small>${escapeHtml(book.author)}</small></span></label>`).join('')
      : '<p>Không có đầu sách trong trang hiện tại.</p>';
    $('batchLabelsDialog').showModal();
  }

  async function loadBatchLabelPreview() {
    const bookIds = [...document.querySelectorAll('[data-label-book]:checked')]
      .map((input) => Number(input.dataset.labelBook));
    const requestId = ++state.batchLabelRequestId;
    state.batchLabels = [];
    state.batchLabelBookIds = [];
    if (!bookIds.length) {
      $('labelPreview').innerHTML = '<p>Chọn sách để xem trước nhãn barcode.</p>';
      return;
    }

    $('labelPreview').innerHTML = '<p>Đang tải mã barcode xem trước…</p>';
    try {
      const selectedBooks = state.books.filter((book) => bookIds.includes(book.id));
      const results = await Promise.all(selectedBooks.map(async (book) => ({
        book,
        labels: await api(`/books/${book.id}/copies/labels`),
      })));
      if (requestId !== state.batchLabelRequestId) return;
      state.batchLabels = results.flatMap(({ book, labels }) => labels.map((label) => ({
        ...label,
        title: book.title,
      })));
      state.batchLabelBookIds = bookIds;
      $('labelPreview').innerHTML = state.batchLabels.length
        ? state.batchLabels.map((label) =>
          `<article class="copy-label"><span>${escapeHtml(label.title)}</span><img src="${label.image}" alt="Barcode ${escapeHtml(label.barcode)}"><strong>${escapeHtml(label.barcode)}</strong></article>`,
        ).join('')
        : '<p>Các đầu sách đã chọn chưa có bản sao để in nhãn.</p>';
    } catch (error) {
      if (requestId !== state.batchLabelRequestId) return;
      $('labelPreview').innerHTML = `<p>Không thể tải mã barcode: ${escapeHtml(error.message)}</p>`;
      notify(`Không thể tải mã barcode xem trước: ${error.message}`, true);
    }
  }

  async function printSelectedBookLabels() {
    const bookIds = [...document.querySelectorAll('[data-label-book]:checked')]
      .map((input) => Number(input.dataset.labelBook));
    if (!bookIds.length) return notify('Chọn ít nhất một đầu sách để in nhãn.', true);
    if (bookIds.join(',') !== state.batchLabelBookIds.join(',')) {
      return notify('Vui lòng đợi bản xem trước barcode tải xong.', true);
    }
    if (!state.batchLabels.length) return notify('Các đầu sách đã chọn chưa có bản sao để in nhãn.', true);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return notify('Trình duyệt đã chặn cửa sổ in barcode.', true);
    try {
      const cards = state.batchLabels.map((label) =>
        `<article class="copy-label"><span>${escapeHtml(label.title)}</span><img src="${label.image}" alt="Barcode ${escapeHtml(label.barcode)}"><strong>${escapeHtml(label.barcode)}</strong></article>`,
      ).join('');
      printWindow.document.open();
      printWindow.document.write(`<!doctype html><html lang="vi"><head><meta charset="UTF-8"><title>Nhãn barcode thư viện</title><style>@page{size:A4;margin:10mm}body{font:11px Arial,sans-serif;margin:0}.copy-label-page{display:grid;grid-template-columns:repeat(2,1fr);gap:8mm}.copy-label{align-items:center;border:1px dashed #999;display:grid;gap:3mm;justify-items:center;min-height:32mm;padding:4mm;text-align:center;break-inside:avoid}.copy-label span{font-weight:600;max-height:2.6em;overflow:hidden}.copy-label img{height:17mm;max-width:100%;object-fit:contain}.copy-label strong{font:10pt Arial,sans-serif;overflow-wrap:anywhere}@media print{.copy-label{border-color:#bbb}}</style></head><body><main class="copy-label-page">${cards}</main><script>window.onload=()=>window.print()<\/script></body></html>`);
      printWindow.document.close();
      $('batchLabelsDialog').close();
    } catch (error) {
      printWindow.close();
      notify(`Không thể tạo nhãn barcode: ${error.message}`, true);
    }
  }

  async function loadBorrowRecords() {
    if (!state.user) return;
    try {
      state.borrowRecords = await api(isCounterStaff() ? '/borrow' : '/borrow/mine');
      renderBorrowRecords();
    } catch (error) {
      $('borrowList').innerHTML = `<tr><td colspan="6">${escapeHtml(error.message)}</td></tr>`;
    }
  }

  async function createStaffBorrowRequest(event) {
    event.preventDefault();
    const userId = Number($('quickBorrowReader').value);
    const barcodes = [...state.staffBorrowBarcodes];
    if (!userId || !barcodes.length) {
      notify('Vui lòng chọn độc giả và thêm ít nhất một bản sao.', true);
      return;
    }
    $('submitStaffBorrow').disabled = true;
    try {
      const records = await api('/borrow/staff-barcodes', {
        method: 'POST',
        body: JSON.stringify({ userId, barcodes }),
      });
      $('quickBorrowForm').reset();
      state.staffBorrowBarcodes = [];
      renderBorrowBarcodeList();
      renderQuickBorrowReaders();
      $('staffBorrowDialog').close();
      notify(`Đã tạo ${records.length} yêu cầu mượn ở trạng thái chờ duyệt.`);
      await Promise.all([loadBorrowRecords(), loadBooks(state.page), loadDashboard()]);
    } catch (error) {
      notify(`Không tạo được phiếu mượn: ${error.message}`, true);
    } finally {
      $('submitStaffBorrow').disabled = false;
    }
  }

  function renderBorrowBarcodeList() {
    $('borrowBarcodeList').innerHTML = state.staffBorrowBarcodes.length
      ? state.staffBorrowBarcodes.map((barcode, index) =>
        `<span class="borrow-barcode-chip">${escapeHtml(barcode)}<button type="button" data-remove-borrow-barcode="${index}" aria-label="Xóa ${escapeHtml(barcode)}">×</button></span>`,
      ).join('')
      : '<span class="muted-note">Chưa có bản sao nào được thêm.</span>';
  }

  function addBorrowBarcode(value) {
    const barcode = value.trim();
    if (!barcode) return;
    if (state.staffBorrowBarcodes.length >= 50) {
      notify('Mỗi phiếu chỉ được thêm tối đa 50 bản sao.', true);
      return;
    }
    if (state.staffBorrowBarcodes.some((item) => item.toLocaleLowerCase() === barcode.toLocaleLowerCase())) {
      notify('Barcode này đã được thêm vào phiếu.', true);
      return;
    }
    state.staffBorrowBarcodes.push(barcode);
    $('quickBorrowBarcode').value = '';
    renderBorrowBarcodeList();
    $('quickBorrowBarcode').focus();
  }

  async function loadReservations() {
    if (!state.user) return;
    try {
      if (isCounterStaff()) {
        api('/reservations/expire-check', { method: 'POST' }).catch(() => { });
      }
      state.reservations = await api(isCounterStaff() ? '/reservations' : '/reservations/mine');
      renderReservations();
    } catch (error) {
      $('reservationList').innerHTML = `<tr><td colspan="6">${escapeHtml(error.message)}</td></tr>`;
    }
  }

  async function quickClaimReservation(id) {
    try {
      const result = await api(`/reservations/${id}/claim`, { method: 'POST' });
      if (typeof playBarcodeScanTone === 'function') playBarcodeScanTone('success');
      const readerName = result.user?.fullName || result.user?.username || 'độc giả';
      notify(`⚡ [Giao sách 1 chạm thành công] Đã lập phiếu mượn #${result.id} cho ${readerName}. Hạn trả: ${date(result.dueDate)}.`);
      await Promise.all([
        loadReservations(),
        loadBorrowRecords(),
        loadDashboard(),
        loadBooks(state.page),
      ]);
      return result;
    } catch (err) {
      if (typeof playBarcodeScanTone === 'function') playBarcodeScanTone('error');
      notify(`✕ Lỗi giao sách: ${err.message}`, true);
      throw err;
    }
  }

  function renderReservations() {
    const labels = {
      WAITING: 'Đang chờ sách (FIFO)',
      READY: '⚡ Chờ nhận sách (READY)',
      FULFILLED: 'Đã hoàn tất',
      CANCELLED: 'Đã hủy',
      EXPIRED: 'Đã hết hạn 24h',
    };

    const allRes = state.reservations || [];
    const countWaiting = allRes.filter((r) => r.status === 'WAITING').length;
    const countReady = allRes.filter((r) => r.status === 'READY').length;
    const countFulfilled = allRes.filter((r) => r.status === 'FULFILLED').length;
    const countCancelled = allRes.filter((r) => ['CANCELLED', 'EXPIRED'].includes(r.status)).length;

    // Update KPI cards
    if ($('kpiTotalReservations')) $('kpiTotalReservations').textContent = allRes.length;
    if ($('kpiWaitingReservations')) $('kpiWaitingReservations').textContent = countWaiting;
    if ($('kpiReadyReservations')) $('kpiReadyReservations').textContent = countReady;
    if ($('kpiFulfilledReservations')) $('kpiFulfilledReservations').textContent = countFulfilled;

    // Update Tab count badges
    if ($('resBadgeAll')) $('resBadgeAll').textContent = allRes.length;
    if ($('resBadgeWaiting')) $('resBadgeWaiting').textContent = countWaiting;
    if ($('resBadgeReady')) $('resBadgeReady').textContent = countReady;
    if ($('resBadgeFulfilled')) $('resBadgeFulfilled').textContent = countFulfilled;
    if ($('resBadgeCancelled')) $('resBadgeCancelled').textContent = countCancelled;

    const search = ($('reservationSearchInput')?.value || '').trim().toLocaleLowerCase();
    let reservations = allRes.filter((reservation) =>
      state.reservationFilter === 'all' ||
      (state.reservationFilter === 'CANCELLED'
        ? ['CANCELLED', 'EXPIRED'].includes(reservation.status)
        : reservation.status === state.reservationFilter));

    if (search) {
      reservations = reservations.filter((r) => {
        const text = `${r.book?.title || ''} ${r.copy?.barcode || ''} ${r.user?.fullName || ''} ${r.user?.username || ''} ${r.user?.phone || ''} ${r.user?.email || ''} ${r.status || ''}`.toLocaleLowerCase();
        return text.includes(search);
      });
    }

    document.querySelectorAll('[data-reservation-filter]').forEach((button) => {
      const active = button.dataset.reservationFilter === state.reservationFilter;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    $('reservationList').innerHTML = reservations.length ? reservations.map((reservation) => {
      const status = escapeHtml(reservation.status);
      const actions = [];
      if (reservation.status === 'WAITING' && isCounterStaff()) {
        actions.push(`<button class="button button-primary button-small" data-ready-reservation="${reservation.id}" type="button">✓ Chuẩn bị sách</button>`);
      }
      if (reservation.status === 'READY') {
        if (isCounterStaff()) {
          actions.push(`<button class="button button-small btn-quick-claim" data-quick-claim="${reservation.id}" type="button" title="Giao sách nhanh 1 chạm: Lập tức tạo phiếu mượn và giao sách cho bạn đọc">⚡ Giao sách (1 chạm)</button>`);
          actions.push(`<button class="button button-light button-small" data-resend-email="${reservation.id}" type="button" title="Gửi lại Email thông báo sách có sẵn kèm thời hạn giữ chỗ 24h">✉️ Gửi Email</button>`);
        } else {
          actions.push(`<button class="button button-primary button-small" data-claim-reservation="${reservation.id}" type="button">Nhận sách</button>`);
        }
      }
      if (['WAITING', 'READY'].includes(reservation.status)) {
        actions.push(`<button class="button button-danger button-small" data-cancel-reservation="${reservation.id}" type="button">Hủy</button>`);
      }
      const readerName = reservation.user?.fullName || reservation.user?.username || 'Độc giả';
      const reader = isCounterStaff()
        ? `<button class="text-button" data-reservation-reader="${reservation.user?.id}" type="button">${escapeHtml(readerName)}</button><br><small>${escapeHtml(reservation.user?.phone || `Thẻ TV-${reservation.user?.id || ''}`)}</small>`
        : escapeHtml(state.user.username);

      let fifoDisplay = '—';
      if (reservation.status === 'WAITING') {
        if (reservation.queuePosition === 1) {
          fifoDisplay = `<span class="fifo-pill fifo-pill-first">🥇 #1 (Đầu tiên trong hàng đợi)</span>`;
        } else if (reservation.queuePosition > 1) {
          fifoDisplay = `<span class="fifo-pill">⏳ #${escapeHtml(reservation.queuePosition)} (Xếp hàng FIFO)</span>`;
        } else {
          fifoDisplay = `<span class="fifo-pill">⏳ Đang xếp hàng</span>`;
        }
      } else if (reservation.status === 'READY') {
        fifoDisplay = `<span class="fifo-pill fifo-pill-first" style="background:#dcfce7;color:#15803d;border-color:#86efac;">⚡ Đã có sách: ${escapeHtml(reservation.copy?.barcode || 'Tại quầy')}</span>`;
      } else if (reservation.status === 'FULFILLED') {
        fifoDisplay = `<span style="color:#16a34a;font-weight:700;">✓ Đã giao độc giả</span>`;
      } else if (reservation.status === 'EXPIRED') {
        fifoDisplay = `<span style="color:#dc2626;font-weight:700;">✕ Hết hạn 24h</span>`;
      } else if (reservation.status === 'CANCELLED') {
        fifoDisplay = `<span style="color:#6b7280;">Đã hủy</span>`;
      }

      let emailBadge = '';
      if (reservation.status === 'READY') {
        if (reservation.emailStatus === 'SENT') {
          emailBadge = `<div style="margin-top:4px;"><span class="badge" style="background:#ecfdf5;color:#065f46;font-size:11px;font-weight:600;padding:2px 6px;border-radius:4px;" title="Đã tự động gửi email thông báo sách sẵn sàng kèm hạn giữ 24h">📧 Email: Đã gửi (Hạn 24h)</span></div>`;
        } else if (reservation.emailStatus === 'FAILED') {
          emailBadge = `<div style="margin-top:4px;"><span class="badge" style="background:#fee2e2;color:#991b1b;font-size:11px;font-weight:600;padding:2px 6px;border-radius:4px;" title="${escapeHtml(reservation.emailError || 'Lỗi gửi SMTP')}">⚠️ Email: Lỗi gửi</span></div>`;
        } else if (reservation.emailStatus === 'PENDING') {
          emailBadge = `<div style="margin-top:4px;"><span class="badge" style="background:#fef3c7;color:#92400e;font-size:11px;font-weight:600;padding:2px 6px;border-radius:4px;">⏳ Email: Đang gửi...</span></div>`;
        } else {
          emailBadge = `<div style="margin-top:4px;"><span class="badge" style="background:#f1f5f9;color:#64748b;font-size:11px;padding:2px 6px;border-radius:4px;" title="Tự động kích hoạt khi có sách sẵn sàng">📧 Email: Tự động (24h)</span></div>`;
        }
      }

      const expiry = reservation.expiresAt
        ? `<div style="font-size:12px;">${date(reservation.expiresAt)}</div>${reservation.status === 'READY' ? `<div class="reservation-countdown" data-expires-at="${escapeHtml(reservation.expiresAt)}" style="margin-top:2px;">${formatReservationCountdown(reservation.expiresAt)}</div>` : ''}${emailBadge}`
        : (emailBadge || '—');

      return `<tr>
          <td>
            <strong>${escapeHtml(reservation.book?.title || 'Sách không còn tồn tại')}</strong>
            ${reservation.copy?.barcode ? `<br><small>Barcode: <code>${escapeHtml(reservation.copy.barcode)}</code></small>` : ''}
          </td>
          <td>${reader}</td>
          <td>${fifoDisplay}</td>
          <td><span class="status status-${status}">${escapeHtml(labels[reservation.status] || status)}</span></td>
          <td>${expiry}</td>
          <td><div class="book-actions">${actions.join(' ') || '—'}</div></td>
        </tr>`;
    }).join('') : '<tr><td colspan="6">Không có yêu cầu đặt giữ sách ở danh mục này.</td></tr>';

    $('reservationDescription').textContent = isCounterStaff()
      ? 'Hàng chờ tự động xếp lượt theo FIFO, thông báo độc giả khi có sách và giữ chỗ trong 24 giờ.'
      : 'Theo dõi vị trí hàng đợi FIFO, thời hạn nhận sách và lịch sử yêu cầu của bạn.';

    document.querySelectorAll('[data-quick-claim]').forEach((button) => {
      button.addEventListener('click', () => void quickClaimReservation(button.dataset.quickClaim));
    });
    document.querySelectorAll('[data-resend-email]').forEach((button) => {
      button.addEventListener('click', async () => {
        const id = button.dataset.resendEmail;
        button.disabled = true;
        button.textContent = '⏳ Đang gửi...';
        try {
          const res = await api(`/reservations/${id}/send-ready-email`, { method: 'POST' });
          notify(res.message || '📧 Đã gửi email thông báo sách sẵn sàng kèm hạn giữ 24h.');
          await loadReservations();
        } catch (err) {
          notify(`Lỗi gửi email: ${err.message}`, true);
          button.disabled = false;
          button.textContent = '✉️ Gửi Email';
        }
      });
    });
    document.querySelectorAll('[data-ready-reservation]').forEach((button) => {
      button.addEventListener('click', () => void updateReservation(button.dataset.readyReservation, 'ready'));
    });
    document.querySelectorAll('[data-claim-reservation]').forEach((button) => {
      button.addEventListener('click', () => void updateReservation(button.dataset.claimReservation, 'claim'));
    });
    document.querySelectorAll('[data-cancel-reservation]').forEach((button) => {
      button.addEventListener('click', () => void updateReservation(button.dataset.cancelReservation, 'cancel'));
    });
    document.querySelectorAll('[data-reservation-reader]').forEach((button) => {
      button.addEventListener('click', () => navigateAdmin(`/admin/users/${button.dataset.reservationReader}`));
    });
    if (!state.reservationCountdownTimer) {
      state.reservationCountdownTimer = window.setInterval(updateReservationCountdowns, 1000);
    }
  }

  function formatReservationCountdown(value) {
    const diff = new Date(value).getTime() - Date.now();
    const seconds = Math.floor(diff / 1000);
    if (seconds <= 0) {
      return '<span class="countdown-badge countdown-urgent">✕ Đã quá hạn 24h</span>';
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    const timeStr = `Còn ${hours}g ${String(minutes).padStart(2, '0')}p ${String(remainingSeconds).padStart(2, '0')}s`;
    if (hours < 6) {
      return `<span class="countdown-badge countdown-urgent" title="Sắp hết hạn giữ chỗ trong 24 giờ!">⚠️ ${timeStr}</span>`;
    }
    return `<span class="countdown-badge">${timeStr}</span>`;
  }

  function updateReservationCountdowns() {
    document.querySelectorAll('[data-expires-at]').forEach((element) => {
      element.innerHTML = formatReservationCountdown(element.dataset.expiresAt);
    });
  }

  function renderReservationReaderOptions() {
    const search = $('reservationReaderSearch').value.trim().toLocaleLowerCase();
    const readers = state.users.filter((user) => {
      if (user.role !== 'READER' || !user.isActive) return false;
      const terms = `${user.username} ${user.fullName || ''} ${user.phone || ''} ${user.email || ''} ${user.id} TV-${user.id}`;
      return !search || terms.toLocaleLowerCase().includes(search);
    });
    const selected = $('reservationReaderSelect').value;
    $('reservationReaderSelect').innerHTML = '<option value="">Chọn độc giả</option>' +
      readers.map((user) =>
        `<option value="${user.id}">${escapeHtml(user.fullName || user.username)} · ${escapeHtml(user.phone || `TV-${user.id}`)}</option>`,
      ).join('');
    $('reservationReaderSelect').value = readers.some((user) => String(user.id) === selected)
      ? selected
      : '';
  }

  async function searchReservationBooks() {
    const keyword = $('reservationBookSearch').value.trim();
    const params = new URLSearchParams({ keyword, page: '1', limit: '20', status: 'unavailable' });
    try {
      const result = await api(`/books/search?${params}`);
      state.reservationBookResults = result.data || [];
      $('reservationBookSelect').innerHTML = '<option value="">Tìm và chọn sách</option>' +
        state.reservationBookResults.map((book) =>
          `<option value="${book.id}">${escapeHtml(book.title)} · ${escapeHtml(book.isbn || 'Không có ISBN')}</option>`,
        ).join('');
    } catch (error) {
      notify(`Không tìm được sách để giữ: ${error.message}`, true);
    }
  }

  async function openStaffReservationDialog() {
    if (!isCounterStaff()) return;
    if (!state.users.length) await loadUsers();
    $('staffReservationForm').reset();
    $('reservationReaderSelect').innerHTML = '<option value="">Chọn độc giả</option>';
    $('reservationBookSelect').innerHTML = '<option value="">Tìm và chọn sách</option>';
    renderReservationReaderOptions();
    $('staffReservationDialog').showModal();
    $('reservationReaderSearch').focus();
  }

  async function createStaffReservation(event) {
    event.preventDefault();
    const userId = Number($('reservationReaderSelect').value);
    const bookId = Number($('reservationBookSelect').value);
    if (!userId || !bookId) return;
    $('submitStaffReservation').disabled = true;
    try {
      await api('/reservations/staff', {
        method: 'POST',
        body: JSON.stringify({ userId, bookId }),
      });
      $('staffReservationDialog').close();
      notify('Đã thêm yêu cầu vào cuối hàng chờ.');
      await loadReservations();
    } catch (error) {
      notify(`Không tạo được yêu cầu giữ sách: ${error.message}`, true);
    } finally {
      $('submitStaffReservation').disabled = false;
    }
  }

  async function loadFines() {
    if (!isStaff()) return;
    try {
      state.fines = await api('/borrow/fines');
      const records = state.fines.records || [];
      const manualViolations = state.fines.manualViolations || [];
      const inventoryIssues = state.fines.inventoryIssues || [];
      const overdue = records.filter((record) =>
        record.status === 'BORROWED' && record.dueDate && new Date(record.dueDate) < new Date());
      const trackedUnpaidAmount = [...records, ...manualViolations].reduce((sum, record) => {
        if (record.fineStatus === 'UNPAID') return sum + Number(record.fineAmount || 0);
        if (record.status === 'BORROWED' && record.dueDate && new Date(record.dueDate) < new Date()) {
          return sum + Number(record.estimatedFineAmount || 0);
        }
        return sum;
      }, 0);
      const damagedOrLostCount = inventoryIssues.length;
      $('fineSummary').innerHTML = [
        ['Vi phạm đang theo dõi', records.length + manualViolations.length],
        ['Đang quá hạn', overdue.length],
        ['Bản sao bảo trì / hỏng / mất', damagedOrLostCount],
        ['Tiền phạt chưa thu / ước tính', money(trackedUnpaidAmount)],
      ].map(([label, value]) => `<article class="stats-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`).join('');
      const fineRecords = [
        ...records.map((record) => ({ ...record, sourceType: 'BORROW' })),
        ...manualViolations,
      ];
      $('fineList').innerHTML = fineRecords.length ? fineRecords.map((record) => {
        const late = record.sourceType === 'BORROW' && record.status === 'BORROWED' &&
          record.dueDate && new Date(record.dueDate) < new Date();
        const adjustments = (state.fines.adjustments || []).filter((item) =>
          record.sourceType === 'BORROW'
            ? item.borrowRecordId === record.id
            : item.violationId === record.id);
        const adjustmentNote = adjustments.length
          ? `<br><small class="fine-adjustment-note">Đã miễn ${money(adjustments.reduce((sum, item) => sum + Number(item.amount), 0))}: ${escapeHtml(adjustments.map((item) => item.reason).join(' · '))}</small>`
          : '';
        const violations = [
          late ? `Quá hạn (${Math.ceil((Date.now() - new Date(record.dueDate).getTime()) / 86_400_000)} ngày)` : '',
          record.returnCondition === 'DAMAGED' ? 'Hỏng' : '',
          record.returnCondition === 'LOST' ? 'Mất' : '',
          record.type === 'DAMAGED' ? 'Hỏng sách' : '',
          record.type === 'LOST' ? 'Mất sách' : '',
          record.type === 'OTHER' ? 'Vi phạm khác' : '',
        ].filter(Boolean).join(' · ') || record.description || (Number(record.fineAmount) ? 'Đã lập tiền phạt' : 'Đã xử lý');
        const collect = record.fineStatus === 'UNPAID'
          ? `<button class="button button-primary button-small" data-collect-fine="${record.sourceType}:${record.id}" type="button">Xác nhận thu</button><button class="button button-light button-small" data-waive-fine="${record.sourceType}:${record.id}" type="button">Miễn / giảm</button>`
          : record.fineStatus === 'PAID'
            ? `<button class="button button-small" style="background:#047857;color:#fff;font-weight:600;" data-view-receipt="${record.sourceType}:${record.id}" type="button" title="Mở biên lai điện tử">🧾 Biên lai</button>`
            : '';
        const displayedFine = Number(record.fineAmount) > 0
          ? money(record.fineAmount)
          : late && Number(record.estimatedFineAmount) > 0
            ? `${money(record.estimatedFineAmount)} (ước tính)`
            : '—';
        return `<tr><td><button class="text-button" data-fine-reader="${record.user?.id}" type="button">${escapeHtml(record.user?.fullName || record.user?.username || 'Độc giả')}</button></td><td><strong>${escapeHtml(record.book?.title || 'Không gắn đầu sách')}</strong><br><small>${escapeHtml(record.copy?.barcode || '—')}</small></td><td>${escapeHtml(violations)}</td><td>${date(record.dueDate)}</td><td>${displayedFine}${record.fineStatus === 'WAIVED' ? ' · Đã miễn' : ''}${adjustmentNote}</td><td>${escapeHtml(record.fineStatus || 'NONE')}${record.fineStatus === 'WAIVED' ? '<br><small>Đã miễn giảm toàn bộ</small>' : ''}</td><td><div class="book-actions">${collect}<button class="button button-light button-small" data-print-fine="${record.sourceType}:${record.id}" type="button">In phiếu</button></div></td></tr>`;
      }).join('') : '<tr><td colspan="7">Chưa có vi phạm hoặc khoản phạt nào.</td></tr>';
      renderFinePayments();
      $('fineInventoryList').innerHTML = inventoryIssues.length
        ? inventoryIssues.map((copy) => `<tr><td>${escapeHtml(copy.book?.title || 'Sách không còn tồn tại')}</td><td>${escapeHtml(copy.barcode)}</td><td>${escapeHtml(copy.status)}</td><td>${escapeHtml([copy.shelf && `Kệ ${copy.shelf}`, copy.floor && `Tầng ${copy.floor}`, copy.aisle].filter(Boolean).join(' · ') || 'Chưa cập nhật')}</td><td><div class="book-actions">${copy.status !== 'AVAILABLE' ? `<button class="button button-primary button-small" data-repair-copy="${copy.book?.id}:${copy.id}" type="button">Đã sửa xong</button>` : ''}<button class="button button-danger button-small" data-dispose-copy="${copy.book?.id}:${copy.id}" type="button">Thanh lý / hủy</button></div></td></tr>`).join('')
        : '<tr><td colspan="5">Không có bản sao hỏng hoặc mất trong kho.</td></tr>';
      document.querySelectorAll('[data-collect-fine]').forEach((button) => {
        button.addEventListener('click', () => openFineCollection(button.dataset.collectFine));
      });
      document.querySelectorAll('[data-view-receipt]').forEach((button) => {
        button.addEventListener('click', () => {
          const [type, idStr] = button.dataset.viewReceipt.split(':');
          const id = Number(idStr);
          const payment = (state.fines?.payments || []).find((p) =>
            type === 'BORROW' ? p.borrowRecordId === id : p.violationId === id);
          if (payment) {
            openElectronicReceiptModal(payment);
          } else {
            const rec = fineRecords.find((r) => r.sourceType === type && r.id === id);
            if (rec) {
              openElectronicReceiptModal({
                txnRef: `BL-${rec.id}`,
                readerName: rec.user?.fullName || rec.user?.username || 'Độc giả',
                readerPhone: rec.user?.phone || rec.user?.email || '',
                cardNumber: 'TV-' + (rec.user?.id || ''),
                bookTitle: rec.book?.title || rec.description || 'Khoản thu vi phạm',
                barcode: rec.copy?.barcode || '',
                amount: Number(rec.fineAmount || 0),
                paymentMethod: 'CASH',
                paidAt: rec.paidAt || new Date(),
                violationType: rec.type || (rec.returnCondition === 'DAMAGED' ? 'Hỏng sách' : rec.returnCondition === 'LOST' ? 'Mất sách' : 'Phí quá hạn'),
                borrowRecordId: rec.sourceType === 'BORROW' ? rec.id : null,
              });
            }
          }
        });
      });
      document.querySelectorAll('[data-waive-fine]').forEach((button) => {
        button.addEventListener('click', () => openFineWaiver(button.dataset.waiveFine));
      });
      document.querySelectorAll('[data-fine-reader]').forEach((button) => {
        button.addEventListener('click', () => navigateAdmin(`/admin/users/${button.dataset.fineReader}`));
      });
      document.querySelectorAll('[data-print-fine]').forEach((button) => {
        button.addEventListener('click', () => {
          const [type, id] = button.dataset.printFine.split(':');
          printFineReceipt(fineRecords.find((record) =>
            record.sourceType === type && record.id === Number(id)));
        });
      });
      document.querySelectorAll('[data-repair-copy]').forEach((button) => {
        button.addEventListener('click', () => void updateFineCopyStatus(button.dataset.repairCopy, 'AVAILABLE'));
      });
      document.querySelectorAll('[data-dispose-copy]').forEach((button) => {
        button.addEventListener('click', () => void updateFineCopyStatus(button.dataset.disposeCopy, 'DISPOSED'));
      });
    } catch (error) {
      $('fineList').innerHTML = `<tr><td colspan="7">${escapeHtml(error.message)}</td></tr>`;
      $('finePaymentList').innerHTML = '<tr><td colspan="6">Không thể tải lịch sử thanh toán.</td></tr>';
      $('fineInventoryList').innerHTML = '<tr><td colspan="5">Không thể tải tình trạng kho.</td></tr>';
    }
  }

  function filteredFinePayments() {
    const from = $('finePaymentFrom').value;
    const to = $('finePaymentTo').value;
    return (state.fines?.payments || []).filter((payment) => {
      const timestamp = new Date(payment.paidAt || payment.createdAt);
      if (Number.isNaN(timestamp.getTime())) return false;
      const day = new Date(timestamp.getTime() - timestamp.getTimezoneOffset() * 60_000)
        .toISOString().slice(0, 10);
      return (!from || day >= from) && (!to || day <= to);
    });
  }

  function renderFinePayments() {
    const payments = filteredFinePayments();
    $('finePaymentList').innerHTML = payments.length ? payments.map((payment) => {
      const reference = payment.borrowRecordId
        ? `Phiếu mượn #${payment.borrowRecordId}`
        : `Vi phạm #${payment.violationId}`;
      const methodLabels = { CASH: 'Tiền mặt', VIETQR: 'VietQR', VNPAY: 'VNPay', MANUAL: 'Thu thủ công' };
      return `<tr>
        <td>${escapeHtml(payment.txnRef)}</td>
        <td>${escapeHtml(reference)}<br><small>${escapeHtml(payment.readerName || 'Độc giả')} · ${escapeHtml(payment.bookTitle || 'Không gắn đầu sách')}</small></td>
        <td>${money(payment.amount)}</td>
        <td>${escapeHtml(methodLabels[payment.paymentMethod] || payment.paymentMethod)}</td>
        <td><span class="status status-${payment.status}">${escapeHtml(payment.status)}</span></td>
        <td>${date(payment.paidAt || payment.createdAt)}</td>
        <td>
          ${payment.status === 'PAID' ? `
            <div style="display:flex;gap:4px;">
              <button class="button button-light button-small" data-print-receipt="${payment.id}" type="button" title="Mở và in biên lai điện tử chuẩn A5/K80">🧾 Biên lai điện tử</button>
              <button class="button button-light button-small" data-print-payment="${payment.id}" type="button" title="In phiếu thu nhiệt K80">In nhiệt</button>
            </div>
          ` : '—'}
        </td>
      </tr>`;
    }).join('') : '<tr><td colspan="6">Không có giao dịch trong khoảng ngày đã chọn.</td></tr>';
    document.querySelectorAll('[data-print-receipt]').forEach((button) => {
      button.addEventListener('click', () => {
        const payment = payments.find((p) => p.id === Number(button.dataset.printReceipt));
        if (payment) openElectronicReceiptModal(payment);
      });
    });
    document.querySelectorAll('[data-print-payment]').forEach((button) => {
      button.addEventListener('click', () => printFinePaymentReceipt(
        payments.find((payment) => payment.id === Number(button.dataset.printPayment)),
      ));
    });
  }

  function writeThermalReceipt(title, rows) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return notify('Trình duyệt đã chặn cửa sổ in hóa đơn.', true);
    const content = rows.map(([label, value]) =>
      `<div class="receipt-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || '—')}</strong></div>`).join('');
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html lang="vi"><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title><style>@page{size:80mm auto;margin:4mm}*{box-sizing:border-box}body{color:#172f2b;font:12px Arial,sans-serif;margin:0 auto;width:72mm}h1{font-size:16px;margin:0;text-align:center}p{text-align:center;color:#71817d;margin:6px 0 14px}.receipt-row{border-bottom:1px dashed #cbd6d0;display:flex;justify-content:space-between;gap:8px;padding:7px 0}.receipt-row span{color:#586963}.receipt-row strong{text-align:right;overflow-wrap:anywhere}.signature-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:25px;text-align:center}.signature-grid div{min-height:75px}.signature-grid strong{display:block;font-size:10px}@media print{body{width:72mm}}</style></head><body><h1>HỆ THỐNG QUẢN LÝ THƯ VIỆN</h1><p>${escapeHtml(title)}<br>${escapeHtml(new Date().toLocaleString('vi-VN'))}</p>${content}<div class="signature-grid"><div><strong>ĐỘC GIẢ</strong><br>Ký và ghi rõ họ tên</div><div><strong>THỦ THƯ</strong><br>Ký và ghi rõ họ tên</div></div><script>window.onload=()=>window.print()<\/script></body></html>`);
    printWindow.document.close();
  }

  function printFineReceipt(record) {
    if (!record) return;
    writeThermalReceipt('Phiếu tiền phạt', [
      [record.sourceType === 'MANUAL' ? 'Mã vi phạm' : 'Mã phiếu mượn', `#${record.id}`],
      ['Độc giả', record.user?.fullName || record.user?.username],
      ['Sách', record.book?.title || record.description],
      ['Barcode', record.copy?.barcode],
      ['Hạn trả', date(record.dueDate)],
      ['Tình trạng', record.type || record.returnCondition],
      ['Trạng thái', record.fineStatus || 'UNPAID'],
      ['Tổng tiền phạt', money(record.fineAmount || record.estimatedFineAmount)],
    ]);
  }

  function printFinePaymentReceipt(payment) {
    if (!payment || payment.status !== 'PAID') return;
    writeThermalReceipt('Phiếu thu tiền phạt', [
      ['Mã giao dịch', payment.txnRef],
      [payment.borrowRecordId ? 'Mã phiếu mượn' : 'Mã vi phạm', `#${payment.borrowRecordId || payment.violationId}`],
      ['Độc giả', payment.readerName],
      ['Sách', payment.bookTitle],
      ['Barcode', payment.barcode],
      ['Phương thức', payment.paymentMethod],
      ['Ngày thu', date(payment.paidAt || payment.createdAt)],
      ['Đã thu', money(payment.amount)],
      ['Trạng thái', payment.status],
    ]);
  }

  async function updateReservation(id, action) {
    const prompts = {
      ready: 'Xác nhận bản sao đã sẵn sàng tại quầy và bắt đầu giữ trong 24 giờ?',
      claim: isCounterStaff()
        ? 'Xác nhận giao sách và lập phiếu mượn ngay cho độc giả?'
        : 'Xác nhận nhận sách đã được giữ?',
      cancel: 'Hủy yêu cầu đặt giữ này?',
    };
    if (!window.confirm(prompts[action])) return;
    try {
      const path = action === 'ready'
        ? `/reservations/${id}/ready`
        : `/reservations/${id}${action === 'claim' ? '/claim' : ''}`;
      const result = await api(path, {
        method: action === 'cancel' ? 'DELETE' : 'POST',
      });
      notify(action === 'ready'
        ? '⚡ Đã chuyển sang chờ nhận (hạn 24 giờ) và tự động gửi Email thông báo tới độc giả.'
        : action === 'claim'
          ? isCounterStaff()
            ? `Đã lập phiếu mượn #${result.id}. Hạn trả ${date(result.dueDate)}.`
            : 'Đã xác nhận nhận sách; yêu cầu mượn đang chờ thủ thư duyệt.'
          : 'Đã hủy yêu cầu đặt giữ.');
      await Promise.all([
        loadReservations(),
        loadBooks(state.page),
        ...(action === 'claim' ? [loadBorrowRecords(), loadDashboard()] : []),
      ]);
    } catch (error) {
      notify(error.message, true);
    }
  }

  function renderBorrowRecords() {
    const search = $('loanSearch').value.trim().toLocaleLowerCase();
    const isOverdue = (record) =>
      record.status === 'BORROWED' && record.dueDate && new Date(record.dueDate) < new Date();
    const filteredRows = state.borrowRecords.filter((record) => {
      const matchesStatus = state.borrowFilter === 'all' ||
        (state.borrowFilter === 'OVERDUE'
          ? isOverdue(record)
          : record.status === state.borrowFilter);
      const statusText = isOverdue(record) ? 'Quá hạn overdue' : ({
        PENDING: 'Chờ duyệt pending',
        BORROWED: 'Đang mượn borrowed',
        RETURNED: 'Đã trả returned',
        REJECTED: 'Từ chối rejected',
      })[record.status] || record.status;
      const searchText = `${record.user?.username || ''} ${record.user?.fullName || ''} ${record.user?.phone || ''} ${record.user?.id || ''} TV-${record.user?.id || ''} ${record.book?.title || ''} ${record.copy?.barcode || ''} ${statusText}`;
      return matchesStatus && (!search || searchText.toLocaleLowerCase().includes(search));
    });
    const pageCount = Math.max(1, Math.ceil(filteredRows.length / state.borrowPageSize));
    state.borrowPage = Math.min(state.borrowPage, pageCount);
    const rows = filteredRows.slice(
      (state.borrowPage - 1) * state.borrowPageSize,
      state.borrowPage * state.borrowPageSize,
    );
    $('currentLoanPage').textContent = String(state.borrowPage);
    $('lastLoanPage').textContent = String(pageCount);
    $('previousLoanPage').disabled = state.borrowPage <= 1;
    $('nextLoanPage').disabled = state.borrowPage >= pageCount;
    document.querySelectorAll('[data-loan-filter]').forEach((button) => {
      const active = button.dataset.loanFilter === state.borrowFilter;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    $('borrowList').innerHTML = rows.length ? rows.map((record) => {
      const overdue = isOverdue(record);
      const statusLabel = overdue ? 'Quá hạn' : ({
        PENDING: 'Chờ duyệt',
        BORROWED: 'Đang mượn',
        RETURNED: 'Đã trả',
        REJECTED: 'Từ chối',
      })[record.status] || record.status;
      const status = `<span class="status status-${overdue ? 'OVERDUE' : escapeHtml(record.status)}">${escapeHtml(statusLabel)}</span>`;
      const condition = record.returnCondition ? ({
        NORMAL: 'Bình thường',
        DAMAGED: 'Hư hỏng',
        LIGHT_DAMAGE: 'Hỏng nhẹ',
        SEVERE_DAMAGE: 'Hỏng nặng',
        LOST: 'Báo mất',
      })[record.returnCondition] || escapeHtml(record.returnCondition) : '—';
      const lateFine = overdue
        ? Math.ceil((Date.now() - new Date(record.dueDate).getTime()) / 86_400_000) *
        Number(state.settings?.dailyFineRate || 5000)
        : 0;
      const fine = Number(record.fineAmount) > 0
        ? `${money(record.fineAmount)} (${escapeHtml(record.fineStatus)})`
        : lateFine > 0 ? `Ước tính ${money(lateFine)}` : '—';
      const actions = [];
      if (isCounterStaff() && record.status === 'PENDING') {
        actions.push(`<button class="button button-primary button-small" aria-label="Duyệt yêu cầu" data-approve="${record.id}" type="button">✓ Duyệt</button>`);
        actions.push(`<button class="button button-danger button-small" aria-label="Từ chối yêu cầu" data-reject="${record.id}" type="button">× Từ chối</button>`);
      }
      if (record.status === 'BORROWED') {
        if (isCounterStaff() || !isStaff()) {
          actions.push(`<button class="button button-light button-small" aria-label="Gia hạn phiếu mượn" data-extend="${record.id}" type="button">↻ Gia hạn</button>`);
        }
        if (isCounterStaff()) actions.push(`<button class="button button-primary button-small" aria-label="Xác nhận trả sách" data-return="${record.id}" type="button">↩ Trả</button>`);
      }
      if (record.fineStatus === 'UNPAID') {
        actions.push(isCounterStaff()
          ? `<button class="button button-primary button-small" data-confirm-fine="${record.id}" type="button">Xác nhận thu tiền phạt</button>`
          : `<button class="button button-light button-small" data-pay="${record.id}" type="button">Nộp phạt VNPay</button>`);
      }
      actions.push(`<button class="button button-light button-small" data-print-record="${record.id}" type="button">In phiếu</button>`);
      return `<tr><td>${escapeHtml(record.user?.fullName || record.user?.username || state.user.username)}<br><small>${escapeHtml(record.user?.username || '')}</small></td><td><strong>${escapeHtml(record.book?.title || 'Sách không còn tồn tại')}</strong><br><small>${escapeHtml(record.copy?.barcode || '—')}</small></td><td>${status}</td><td>${date(record.dueDate)}</td><td>${condition}<br><small>${fine}</small></td><td><div class="book-actions">${actions.join(' ') || '—'}</div></td></tr>`;
    }).join('') : `<tr><td colspan="6">${filteredRows.length ? 'Không có phiếu ở trang này.' : 'Không tìm thấy phiếu mượn phù hợp.'}</td></tr>`;
    document.querySelectorAll('[data-approve]').forEach((button) => button.addEventListener('click', () => void changeLoan(button.dataset.approve, 'approve')));
    document.querySelectorAll('[data-reject]').forEach((button) => button.addEventListener('click', () => void changeLoan(button.dataset.reject, 'reject')));
    document.querySelectorAll('[data-extend]').forEach((button) => button.addEventListener('click', () => void changeLoan(button.dataset.extend, 'extend')));
    document.querySelectorAll('[data-return]').forEach((button) => button.addEventListener('click', () => {
      openReturnDialog(state.borrowRecords.find((record) => record.id === Number(button.dataset.return)));
    }));
    document.querySelectorAll('[data-pay]').forEach((button) => button.addEventListener('click', () => void payFine(button.dataset.pay)));
    document.querySelectorAll('[data-confirm-fine]').forEach((button) => button.addEventListener(
      'click',
      () => void confirmFineCollection(button.dataset.confirmFine),
    ));
    document.querySelectorAll('[data-print-record]').forEach((button) => button.addEventListener(
      'click',
      () => printBorrowReceipt(state.borrowRecords.find((record) =>
        record.id === Number(button.dataset.printRecord))),
    ));
  }

  function printBorrowReceipt(record) {
    if (!record) return;
    const labels = {
      PENDING: 'Chờ duyệt',
      BORROWED: 'Đang mượn',
      RETURNED: 'Đã trả',
      REJECTED: 'Đã từ chối',
      NORMAL: 'Bình thường',
      DAMAGED: 'Hư hỏng',
      LIGHT_DAMAGE: 'Hỏng nhẹ',
      SEVERE_DAMAGE: 'Hỏng nặng',
      LOST: 'Mất',
    };
    const rows = [
      ['Mã phiếu', record.id],
      ['Độc giả', record.user?.fullName || record.user?.username || state.user?.username || '—'],
      ['Mã thẻ', record.user?.id ? `TV-${record.user.id}` : '—'],
      ['Số điện thoại', record.user?.phone || '—'],
      ['Sách', record.book?.title || 'Sách không còn tồn tại'],
      ['Tác giả', record.book?.author || '—'],
      ['Barcode', record.copy?.barcode || '—'],
      ['Trạng thái', labels[record.status] || record.status],
      ['Ngày đăng ký', date(record.borrowedAt)],
      ['Ngày duyệt', date(record.approvedAt)],
      ['Hạn trả', date(record.dueDate)],
      ['Ngày trả', date(record.returnedAt)],
      ['Tình trạng khi trả', labels[record.returnCondition] || record.returnCondition || '—'],
      ['Tiền phạt', Number(record.fineAmount) > 0 ? money(record.fineAmount) : '—'],
      ['Trạng thái thanh toán', record.fineStatus || '—'],
    ];
    writeThermalReceipt(`Phiếu mượn / trả #${record.id}`, rows);
  }

  function openReturnDialog(record, barcode = '') {
    $('returnRecordId').value = record?.id || '';
    $('returnBarcode').value = barcode;
    $('returnBookSummary').textContent = record
      ? `${record.book?.title || 'Sách'} · ${record.copy?.barcode || barcode || '—'} · Hạn trả ${date(record.dueDate)}`
      : `Barcode: ${barcode}`;
    $('returnCondition').value = 'NORMAL';
    $('damageFineAmount').value = '0';
    $('collectFineAtCounter').checked = false;
    $('damageFineField').hidden = true;
    $('collectFineField').hidden = false;
    updateReturnFineEstimate();
    $('returnDialog').showModal();
  }

  function updateReturnFineEstimate() {
    const barcode = $('returnBarcode').value;
    const record = $('returnRecordId').value
      ? state.borrowRecords.find((item) => item.id === Number($('returnRecordId').value))
      : state.borrowRecords.find((item) =>
        item.copy?.barcode?.toLocaleLowerCase() === barcode.toLocaleLowerCase() &&
        item.status === 'BORROWED');
    const dueDate = record?.dueDate ? new Date(record.dueDate) : null;
    const daysLate = dueDate && new Date() > dueDate
      ? Math.ceil((Date.now() - dueDate.getTime()) / 86_400_000)
      : 0;
    const overdueFine = daysLate * Number(state.settings?.dailyFineRate || 5000);
    const damageFine = $('returnCondition').value === 'NORMAL'
      ? 0
      : Number($('damageFineAmount').value || 0);
    const total = overdueFine + damageFine;
    $('returnFineEstimate').textContent =
      `Quá hạn ${daysLate} ngày × ${money(state.settings?.dailyFineRate || 5000)}/ngày = ${money(overdueFine)} · Tổng phạt dự kiến: ${money(total)}.`;
    $('collectFineField').hidden = total <= 0;
  }

  async function changeLoan(id, action) {
    const prompts = { approve: 'Duyệt yêu cầu mượn?', reject: 'Từ chối yêu cầu mượn?', extend: 'Gia hạn thêm thời gian mượn?' };
    if (!window.confirm(prompts[action])) return;
    try {
      await api(`/borrow/${id}/${action}`, { method: 'POST' });
      notify(action === 'approve' ? 'Đã duyệt yêu cầu.' : action === 'reject' ? 'Đã từ chối yêu cầu.' : 'Đã gia hạn phiếu mượn.');
      await Promise.all([
        loadBorrowRecords(),
        loadDashboard(),
        loadDashboardBorrowRecords(),
        loadBooks(state.page),
      ]);
    } catch (error) {
      notify(error.message, true);
    }
  }

  async function returnLoan(event) {
    event.preventDefault();
    const id = $('returnRecordId').value;
    const barcode = $('returnBarcode').value.trim();
    const condition = $('returnCondition').value;
    const damageFineAmount = Number($('damageFineAmount').value);
    const collectFineAtCounter = $('collectFineAtCounter').checked;
    try {
      const record = await api(barcode
        ? `/borrow/return/barcode/${encodeURIComponent(barcode)}`
        : `/borrow/return/${id}`, {
        method: 'POST',
        body: JSON.stringify({
          condition,
          ...(condition !== 'NORMAL' ? { damageFineAmount } : {}),
          collectFineAtCounter,
        }),
      });
      $('returnDialog').close();
      if (record.accountUnlocked) {
        notify(`🎉 ${record.unlockMessage || 'Đã thu tiền phạt. Tài khoản độc giả đã được tự động mở khóa!'}`);
      } else {
        notify(collectFineAtCounter && record.fineStatus === 'PAID'
          ? `Đã ghi nhận trả sách và thu ${money(record.fineAmount)} tại quầy.`
          : `Đã ghi nhận trả sách. Tiền phạt: ${money(record.fineAmount)}.`);
      }
      if (collectFineAtCounter && record.fineStatus === 'PAID' && record.receipt) {
        openElectronicReceiptModal(record.receipt);
      }
      await Promise.all([loadBorrowRecords(), loadBooks(state.page), loadDashboard(), loadFines()]);
    } catch (error) {
      notify(error.message, true);
    }
  }

  async function payFine(id) {
    if (!window.confirm('Xác nhận thanh toán tiền phạt của phiếu này?')) return;
    try {
      const payment = await api(`/payments/fines/${id}`, { method: 'POST' });
      window.location.assign(payment.paymentUrl);
    } catch (error) {
      notify(error.message, true);
    }
  }

  async function confirmFineCollection(id) {
    openFineCollection(`BORROW:${id}`);
  }

  function fineByReference(reference) {
    const [type, rawId] = reference.split(':');
    const id = Number(rawId);
    if (type === 'MANUAL') {
      return state.fines?.manualViolations?.find((item) => item.id === id);
    }
    return state.fines?.records?.find((item) => item.id === id);
  }

  function openFineCollection(reference) {
    const [type, rawId] = reference.split(':');
    const fine = fineByReference(reference);
    if (!fine || fine.fineStatus !== 'UNPAID') return;
    const txnRef = `THU-${type}-${rawId}-${Date.now().toString(36)}`;
    state.pendingFineCollection = { type, id: Number(rawId), txnRef, fine };
    $('fineCollectionType').value = type;
    $('fineCollectionId').value = rawId;
    $('fineCollectionReference').value = txnRef;
    $('fineCollectionSummary').textContent =
      `${fine.user?.fullName || fine.user?.username || 'Độc giả'} · ` +
      `${fine.book?.title || fine.description || 'Vi phạm'} · ${money(fine.fineAmount)}`;
    const qrOption = $('fineCollectionMethod').querySelector('option[value="VIETQR"]');
    qrOption.disabled = !state.fines?.vietQr;
    $('fineCollectionMethod').value = 'CASH';
    renderFineVietQr();
    $('fineCollectionDialog').showModal();
  }

  function renderFineVietQr() {
    const panel = $('fineVietQrPanel');
    const ewalletPanel = $('fineEwalletPanel');
    const method = $('fineCollectionMethod').value;
    const configuration = state.fines?.vietQr;

    if (panel) panel.hidden = method !== 'VIETQR';
    if (ewalletPanel) ewalletPanel.hidden = method !== 'E_WALLET';

    if (method === 'VIETQR') {
      if (!configuration || !state.pendingFineCollection) {
        if (panel) {
          panel.hidden = false;
          panel.innerHTML = '<p>Chưa cấu hình tài khoản nhận VietQR. Hãy cấu hình VIETQR_BANK_ID, VIETQR_ACCOUNT_NO và VIETQR_ACCOUNT_NAME.</p>';
        }
        return;
      }
      const { fine, txnRef } = state.pendingFineCollection;
      const amount = Math.round(Number(fine.fineAmount));
      const imageUrl = new URL(
        `https://img.vietqr.io/image/${encodeURIComponent(configuration.bankId)}-${encodeURIComponent(configuration.accountNo)}-compact2.png`,
      );
      imageUrl.searchParams.set('amount', String(amount));
      imageUrl.searchParams.set('addInfo', txnRef);
      imageUrl.searchParams.set('accountName', configuration.accountName);
      if (panel) {
        panel.hidden = false;
        panel.innerHTML = `<img src="${escapeHtml(imageUrl.toString())}" alt="Mã QR thanh toán VietQR" referrerpolicy="no-referrer"><div><strong>${escapeHtml(configuration.accountName)}</strong><p>${escapeHtml(configuration.accountNo)} · ${escapeHtml(configuration.bankId)}</p><p>Nội dung chuyển khoản: <strong>${escapeHtml(txnRef)}</strong></p><p>Số tiền: <strong>${money(amount)}</strong></p></div>`;
      }
    } else if (method === 'E_WALLET') {
      const { fine, txnRef } = state.pendingFineCollection || {};
      const amount = Math.round(Number(fine?.fineAmount || 0));
      if (ewalletPanel) {
        ewalletPanel.hidden = false;
        ewalletPanel.innerHTML = `
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:68px;height:68px;background:linear-gradient(135deg, #d81b60, #ad1457);color:white;display:flex;align-items:center;justify-content:center;border-radius:10px;font-weight:800;font-size:12px;text-align:center;box-shadow:0 2px 6px rgba(216,27,96,0.3);line-height:1.2;">
              MOMO<br>VNPAY<br>ZALO
            </div>
            <div>
              <div style="font-weight:700;color:#9d174d;font-size:13px;">Ví điện tử MoMo / ZaloPay / VNPAY-QR</div>
              <p style="margin:2px 0;font-size:12px;color:#475569;">Quét mã thanh toán tại quầy hoặc ví thư viện: <strong>0901 234 567</strong></p>
              <p style="margin:2px 0;font-size:12px;color:#1e293b;">Nội dung: <strong>${escapeHtml(txnRef || 'EWALLET-PAY')}</strong> · Số tiền: <strong style="color:#d81b60;">${money(amount)}</strong></p>
            </div>
          </div>
        `;
      }
    }
  }

  async function collectFine(event) {
    event.preventDefault();
    const type = $('fineCollectionType').value;
    const id = $('fineCollectionId').value;
    const paymentMethod = $('fineCollectionMethod').value;
    if (paymentMethod === 'VIETQR' &&
      !window.confirm('Bạn đã đối chiếu tài khoản và xác nhận đã nhận đủ tiền chuyển khoản?')) return;
    try {
      const res = await api(type === 'MANUAL'
        ? `/borrow/fines/manual/${id}/pay`
        : `/borrow/pay-fine/${id}`, {
        method: 'POST',
        body: JSON.stringify({
          paymentMethod,
          txnRef: $('fineCollectionReference').value,
        }),
      });
      const savedTxn = $('fineCollectionReference').value;
      const savedMethod = paymentMethod;
      const fineObj = state.pendingFineCollection?.fine;
      $('fineCollectionDialog').close();
      state.pendingFineCollection = null;
      if (res?.accountUnlocked) {
        notify(`🎉 ${res.unlockMessage || 'Đã thu tiền phạt. Tài khoản độc giả đã được tự động mở khóa!'}`);
      } else {
        notify('Đã xác nhận thu tiền phạt thành công.');
      }
      await Promise.all([loadBorrowRecords(), loadDashboard(), loadFines()]);

      if (res?.receipt) {
        openElectronicReceiptModal(res.receipt);
      } else if (fineObj) {
        openElectronicReceiptModal({
          txnRef: savedTxn,
          readerName: fineObj.user?.fullName || fineObj.user?.username || 'Độc giả',
          readerPhone: fineObj.user?.phone || fineObj.user?.email || '',
          readerId: fineObj.user?.id,
          cardNumber: 'TV-' + (fineObj.user?.id || ''),
          bookTitle: fineObj.book?.title || fineObj.description || 'Sách',
          barcode: fineObj.copy?.barcode || '',
          amount: Number(fineObj.fineAmount || 0),
          paymentMethod: savedMethod,
          paidAt: new Date(),
          borrowRecordId: fineObj.id,
          accountUnlocked: res?.accountUnlocked,
          unlockMessage: res?.unlockMessage,
        });
      }
    } catch (error) {
      notify(`Không xác nhận được tiền phạt: ${error.message}`, true);
    }
  }

  async function openManualFineDialog() {
    try {
      state.manualFineReaders = (await api('/users'))
        .filter((user) => user.role === 'READER' && user.isActive);
      $('manualFineForm').reset();
      renderManualFineReaders();
      $('manualFineDialog').showModal();
    } catch (error) {
      notify(`Không tải được danh sách độc giả: ${error.message}`, true);
    }
  }

  function renderManualFineReaders() {
    const search = $('manualFineReaderSearch').value.trim().toLocaleLowerCase();
    const readers = state.manualFineReaders.filter((reader) => {
      const text = `${reader.fullName || ''} ${reader.username || ''} ${reader.email || ''} ${reader.phone || ''} TV-${reader.id}`;
      return !search || text.toLocaleLowerCase().includes(search);
    });
    $('manualFineReader').innerHTML = '<option value="">Chọn độc giả</option>' +
      readers.map((reader) => `<option value="${reader.id}">${escapeHtml(reader.fullName || reader.username)} · ${escapeHtml(reader.phone || reader.email || `TV-${reader.id}`)}</option>`).join('');
  }

  async function createManualFine(event) {
    event.preventDefault();
    const type = $('manualFineType').value;
    const barcode = $('manualFineBarcode').value.trim();
    if (type !== 'OTHER' && !barcode) {
      $('manualFineBarcode').setCustomValidity('Nhập barcode cho vi phạm hỏng hoặc mất sách.');
      $('manualFineBarcode').reportValidity();
      return;
    }
    $('manualFineBarcode').setCustomValidity('');
    try {
      await api('/borrow/fines/manual', {
        method: 'POST',
        body: JSON.stringify({
          userId: Number($('manualFineReader').value),
          type,
          description: $('manualFineDescription').value.trim(),
          fineAmount: Number($('manualFineAmount').value),
          ...(barcode ? { barcode } : {}),
        }),
      });
      $('manualFineDialog').close();
      notify('Đã ghi nhận vi phạm và khoản phạt.');
      await Promise.all([loadFines(), loadBooks(state.page)]);
    } catch (error) {
      notify(`Không tạo được phiếu vi phạm: ${error.message}`, true);
    }
  }

  function openFineWaiver(reference) {
    const [type, rawId] = reference.split(':');
    const fine = fineByReference(reference);
    if (!fine || fine.fineStatus !== 'UNPAID') return;
    $('fineWaiveType').value = type;
    $('fineWaiveId').value = rawId;
    $('fineWaiveAmount').max = String(fine.fineAmount);
    $('fineWaiveAmount').value = String(fine.fineAmount);
    $('fineWaiveReason').value = '';
    $('fineWaiveDialog').showModal();
  }

  async function waiveFine(event) {
    event.preventDefault();
    const type = $('fineWaiveType').value;
    const id = $('fineWaiveId').value;
    const amount = Number($('fineWaiveAmount').value);
    const path = type === 'MANUAL'
      ? `/borrow/fines/manual/${id}/waive`
      : `/borrow/fines/borrow/${id}/waive`;
    try {
      await api(path, {
        method: 'POST',
        body: JSON.stringify({ amount, reason: $('fineWaiveReason').value.trim() }),
      });
      $('fineWaiveDialog').close();
      notify('Đã lưu quyết định miễn/giảm tiền phạt.');
      await Promise.all([loadFines(), loadBorrowRecords(), loadDashboard()]);
    } catch (error) {
      notify(`Không thể miễn/giảm tiền phạt: ${error.message}`, true);
    }
  }

  async function updateFineCopyStatus(reference, status) {
    const [bookId, copyId] = reference.split(':');
    const confirmation = status === 'AVAILABLE'
      ? 'Xác nhận bản sao đã sửa xong và có thể cho mượn lại?'
      : 'Xác nhận thanh lý / hủy bỏ bản sao này?';
    if (!window.confirm(confirmation)) return;
    try {
      await api(`/books/${bookId}/copies/${copyId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      notify(status === 'AVAILABLE'
        ? 'Đã đưa bản sao trở lại kho sẵn sàng.'
        : 'Đã thanh lý bản sao; bản sao không còn được tính vào kho cho mượn.');
      await Promise.all([loadFines(), loadBooks(state.page)]);
    } catch (error) {
      notify(`Không cập nhật được bản sao: ${error.message}`, true);
    }
  }

  function exportFinePayments() {
    const payments = filteredFinePayments();
    const rows = payments.map((payment) => [
      payment.txnRef,
      payment.borrowRecordId || '',
      payment.violationId || '',
      payment.readerName || '',
      payment.bookTitle || '',
      payment.barcode || '',
      payment.amount,
      payment.paymentMethod,
      payment.status,
      payment.paidAt || payment.createdAt,
    ]);
    const report = `<html><head><meta charset="UTF-8"></head><body>${reportTable(
      'Sổ thu tiền phạt',
      ['Mã giao dịch', 'Mã phiếu mượn', 'Mã vi phạm', 'Độc giả', 'Sách', 'Barcode', 'Số tiền', 'Phương thức', 'Trạng thái', 'Ngày thu'],
      rows,
      true,
    )}</body></html>`;
    downloadFile(
      `so-thu-tien-phat-${new Date().toISOString().slice(0, 10)}.xls`,
      `\uFEFF${report}`,
      'application/vnd.ms-excel;charset=utf-8',
    );
  }

  async function addCategory(event) {
    event.preventDefault();
    const name = $('categoryName').value.trim();
    const ddcCode = $('categoryDdcCode')?.value.trim();
    const description = $('categoryDescription')?.value.trim();
    const parentId = $('categoryParentSelect')?.value;

    const payload = { name };
    if (ddcCode) payload.ddcCode = ddcCode;
    if (description) payload.description = description;
    if (parentId) payload.parentId = Number(parentId);

    try {
      await api('/categories', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      $('categoryForm').reset();
      notify('Đã thêm thể loại.');
      await Promise.all([loadCategories(), loadBooks(1)]);
    } catch (error) {
      notify(error.message, true);
    }
  }

  async function openReviews(bookId, title, allowReview = true) {
    $('reviewsPanel').hidden = false;
    $('reviewsTitle').textContent = `Đánh giá: ${title}`;
    $('reviewsPanel').scrollIntoView({ behavior: 'smooth' });
    try {
      const result = await api(`/reviews/book/${bookId}`);
      $('reviewsList').innerHTML = `<p>Điểm trung bình: <strong>${Number(result.averageRating).toFixed(1)} / 5</strong> · ${result.reviewCount} đánh giá</p>${result.reviews.map((review) => `<article class="review-card"><strong>${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</strong><span> · ${escapeHtml(review.user?.username || 'Độc giả')}</span><p>${escapeHtml(review.comment || 'Không có nhận xét.')}</p></article>`).join('') || '<p>Chưa có đánh giá.</p>'}`;
      if (!state.user || !allowReview) return;
      const rating = window.prompt('Bạn chấm cuốn sách này mấy sao? (1-5)');
      if (rating === null) return;
      const comment = window.prompt('Nhận xét của bạn (có thể để trống):', '');
      if (comment === null) return;
      await api(`/reviews/book/${bookId}`, {
        method: 'POST',
        body: JSON.stringify({ rating: Number(rating), comment: comment || undefined }),
      });
      notify('Cảm ơn bạn đã gửi đánh giá.');
      await openReviews(bookId, title, false);
    } catch (error) {
      notify(error.message, true);
    }
  }

  async function openReviewModeration() {
    try {
      const reviews = await api('/reviews/admin/all');
      $('moderationReviewList').innerHTML = reviews.length
        ? reviews.map((review) => `<article class="review-card review-moderation-row"><strong>${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</strong><span> · ${escapeHtml(review.user?.username || 'Độc giả')} · ${date(review.createdAt)}</span><p><strong>${escapeHtml(review.book?.title || 'Sách không còn tồn tại')}</strong> · ${review.isVisible ? 'Đang hiển thị' : 'Đang ẩn'}</p><p>${escapeHtml(review.comment || 'Không có nhận xét.')}</p><div class="button-row"><button class="button button-light button-small" data-moderate-visibility="${review.id}" data-visible="${review.isVisible}" type="button">${review.isVisible ? 'Ẩn đánh giá' : 'Duyệt / hiển thị'}</button><button class="button button-danger button-small" data-moderate-delete="${review.id}" type="button">Xóa đánh giá</button></div></article>`).join('')
        : '<p>Chưa có đánh giá cần kiểm duyệt.</p>';
      document.querySelectorAll('[data-moderate-visibility]').forEach((button) => {
        button.addEventListener('click', () =>
          void setReviewVisibility(button.dataset.moderateVisibility, button.dataset.visible !== 'true'),
        );
      });
      document.querySelectorAll('[data-moderate-delete]').forEach((button) => {
        button.addEventListener('click', () => void removeModeratedReview(button.dataset.moderateDelete));
      });
      if (!$('reviewsModerationDialog').open) $('reviewsModerationDialog').showModal();
    } catch (error) {
      notify(`Không tải được danh sách đánh giá: ${error.message}`, true);
    }
  }

  async function setReviewVisibility(reviewId, isVisible) {
    try {
      await api(`/reviews/${reviewId}/moderation`, {
        method: 'PATCH',
        body: JSON.stringify({ isVisible }),
      });
      notify(isVisible ? 'Đã duyệt và hiển thị đánh giá.' : 'Đã ẩn đánh giá.');
      await openReviewModeration();
    } catch (error) {
      notify(`Không cập nhật được trạng thái đánh giá: ${error.message}`, true);
    }
  }

  async function removeModeratedReview(reviewId) {
    if (!window.confirm('Xóa đánh giá này khỏi hệ thống?')) return;
    try {
      await api(`/reviews/${reviewId}`, { method: 'DELETE' });
      notify('Đã xóa đánh giá không phù hợp.');
      await openReviewModeration();
    } catch (error) {
      notify(`Không xóa được đánh giá: ${error.message}`, true);
    }
  }


  async function loadStaffSystemAlerts() {
    if (!isStaff()) return;
    try {
      const [pendingLoans, overdueLoans, pendingAcqs, usersRes] = await Promise.all([
        api('/borrow?status=PENDING').catch(() => []),
        api('/borrow?status=OVERDUE').catch(() => []),
        api('/acquisitions?status=PENDING').catch(() => []),
        api('/users?page=1&limit=50').catch(() => []),
      ]);

      const allUsers = Array.isArray(usersRes) ? usersRes : (usersRes?.data || []);
      const pendingUsers = allUsers.filter((u) => u.role === 'READER' && (!u.approvedAt || !u.isActive));

      const totalAlerts = (pendingLoans.length || 0) + (overdueLoans.length || 0) + (pendingAcqs.length || 0) + (pendingUsers.length || 0);
      if (totalAlerts > 0) {
        $('notificationCount').textContent = totalAlerts > 99 ? '99+' : totalAlerts;
        $('notificationCount').hidden = false;

        const alertsHtml = [
          pendingUsers.length ? `<article class="notification-row" style="border-left:4px solid #2563eb;">
            <div>
              <strong>👤 ${pendingUsers.length} độc giả mới chờ duyệt tài khoản</strong>
              <p>Có bạn đọc vừa đăng ký trực tuyến đang chờ kích hoạt thẻ thư viện.</p>
              <button class="button button-primary button-small" onclick="window.history.pushState({},'','/admin/readers');syncAdminRoute();" type="button">Duyệt thẻ ngay</button>
            </div>
          </article>` : '',
          pendingLoans.length ? `<article class="notification-row" style="border-left:4px solid #123c35;">
            <div>
              <strong>🔔 ${pendingLoans.length} yêu cầu mượn chờ duyệt</strong>
              <p>Có độc giả đang chờ duyệt mượn sách tại quầy hoặc trực tuyến.</p>
              <button class="button button-primary button-small" onclick="window.history.pushState({},'','/admin/borrow-return');syncAdminRoute();" type="button">Duyệt ngay</button>
            </div>
          </article>` : '',
          overdueLoans.length ? `<article class="notification-row" style="border-left:4px solid #dd4b39;">
            <div>
              <strong>⚠️ ${overdueLoans.length} phiếu mượn sách quá hạn</strong>
              <p>Cần kiểm tra và gửi thông báo nhắc nhở hoàn trả sách.</p>
              <button class="button button-danger button-small" onclick="window.history.pushState({},'','/admin/fines');syncAdminRoute();" type="button">Xem phạt & quá hạn</button>
            </div>
          </article>` : '',
          pendingAcqs.length ? `<article class="notification-row" style="border-left:4px solid #f39c12;">
            <div>
              <strong>💡 ${pendingAcqs.length} đề xuất mua sách mới</strong>
              <p>Có bạn đọc gửi yêu cầu thư viện bổ sung đầu sách mới.</p>
              <button class="button button-light button-small" onclick="window.history.pushState({},'','/admin/acquisitions');syncAdminRoute();" type="button">Xử lý đề xuất</button>
            </div>
          </article>` : '',
        ].filter(Boolean).join('');

        const notifList = $('notificationsList');
        if (notifList && alertsHtml) {
          notifList.innerHTML = alertsHtml + (notifList.innerHTML || '');
        }
      }
    } catch (_) { }
  }

  async function loadNotifications() {
    try {
      const result = await api('/notifications/mine');
      $('notificationCount').textContent = result.unreadCount > 99 ? '99+' : result.unreadCount;
      $('notificationCount').hidden = result.unreadCount === 0;
      $('notificationsList').innerHTML = result.notifications.length
        ? result.notifications.map((item) => `<article class="notification-row"><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.message)}</p><small>${date(item.createdAt)} · Email: ${escapeHtml(item.emailStatus || '—')}</small></div>${item.readAt ? '' : `<button class="button button-light button-small" data-read="${item.id}" type="button">Đã đọc</button>`}</article>`).join('')
        : '<p>Bạn chưa có thông báo.</p>';
      document.querySelectorAll('[data-read]').forEach((button) => button.addEventListener('click', () => void markRead(button.dataset.read)));
    } catch (error) {
      notify(`Không tải được thông báo: ${error.message}`, true);
    }
  }

  async function markRead(id) {
    try {
      await api(`/notifications/${id}/read`, { method: 'PATCH' });
      await loadNotifications();
    } catch (error) {
      notify(error.message, true);
    }
  }

  let dashboardCategoryChartInstance = null;

  async function loadDashboard() {
    if (!isStaff()) return;
    try {
      const statsRes = await api('/admin/dashboard-stats');
      state.stats = statsRes || {};
      const s = state.stats || {};
      const activeReaders = s.activeReaders !== undefined ? s.activeReaders : (s.totalReaders || 0);
      const unpaidCount = s.unpaidFinesCount || 0;
      const returnedCount = s.returnedBorrows || 0;

      // Cập nhật DOM số lượng độc giả hoạt động nếu có phần tử activeReaders riêng biệt
      if ($('activeReaders')) {
        $('activeReaders').textContent = Number(activeReaders || 0).toLocaleString('vi-VN');
      }

      // 1. Render 5 Thẻ chỉ số tổng quan (KPI Cards)
      const kpiCards = [
        {
          label: 'Tổng số đầu sách / Bản sao',
          value: Number(s.totalBooks || 0).toLocaleString('vi-VN'),
          detail: `${Number(s.totalCopies || 0).toLocaleString('vi-VN')} bản sao · ${Number(s.availableCopies || 0).toLocaleString('vi-VN')} sẵn sàng`,
          style: 'border-top:4px solid #123c35;',
          valStyle: 'color:#123c35;',
        },
        {
          label: 'Sách đang cho mượn',
          value: Number(s.activeBorrows || 0).toLocaleString('vi-VN'),
          detail: `${s.pendingRequests || 0} chờ duyệt · ${returnedCount} đã hoàn trả`,
          style: 'border-top:4px solid #0284c7;',
          valStyle: 'color:#0284c7;',
        },
        {
          label: '⚠️ Phiếu trễ hạn (Overdue)',
          value: Number(s.overdueBooks || 0).toLocaleString('vi-VN'),
          detail: s.overdueBooks > 0
            ? `Cần nhắc trả ngay (${s.overdueRate || 0}% trễ hạn)`
            : 'Không có phiếu quá hạn',
          style: s.overdueBooks > 0
            ? 'border-top:4px solid #dd4b39;background:#fff5f5;box-shadow:0 4px 12px rgba(221,75,57,0.12);'
            : 'border-top:4px solid #dd4b39;',
          valStyle: 'color:#dd4b39;font-weight:800;',
          detailStyle: s.overdueBooks > 0 ? 'color:#b91c1c;font-weight:600;' : '',
        },
        {
          label: 'Tiền phạt chưa thu',
          value: money(s.totalUnpaidFines || 0),
          detail: `${unpaidCount} phiếu tồn đọng · Đã thu: ${money(s.totalPaidFines || 0)}`,
          style: 'border-top:4px solid #d97706;',
          valStyle: 'color:#d97706;',
        },
        {
          label: 'Tổng độc giả / Hoạt động',
          value: `${Number(s.totalReaders || 0).toLocaleString('vi-VN')}`,
          detail: `${Number(activeReaders || 0).toLocaleString('vi-VN')} tài khoản đang hoạt động`,
          style: 'border-top:4px solid #16a34a;',
          valStyle: 'color:#15803d;',
        },
      ];

      if ($('statsGrid')) {
        $('statsGrid').innerHTML = kpiCards.map((c) => `
          <article class="stats-card" style="${c.style}">
            <span>${escapeHtml(c.label)}</span>
            <strong style="${c.valStyle || ''}">${escapeHtml(c.value)}</strong>
            <small style="${c.detailStyle || ''}">${escapeHtml(c.detail)}</small>
          </article>
        `).join('');
      }

      if ($('dashboardFineSummary')) {
        $('dashboardFineSummary').textContent =
          `Tổng tiền phạt phát sinh: ${money(s.totalFines)} · Đã thu: ${money(s.totalPaidFines)} · Chưa thu: ${money(s.totalUnpaidFines)}`;
      }

      // Cảnh báo thông minh
      const alerts = s.alerts || { dueSoon: [], overdue: [], lowStock: [], damagedLostCount: 0, pendingReaders: [], pendingBorrows: [] };
      const alertItems = [];

      if (alerts.pendingReaders && alerts.pendingReaders.length) {
        alertItems.push({
          type: 'alert-warning',
          text: `[Duyệt độc giả] 👤 Có ${alerts.pendingReaders.length} bạn đọc mới đăng ký đang chờ duyệt kích hoạt tài khoản`,
          route: '/admin/readers',
        });
      }

      if (alerts.pendingBorrows && alerts.pendingBorrows.length) {
        alertItems.push({
          type: 'alert-info',
          text: `[Duyệt mượn sách] 📖 Có ${alerts.pendingBorrows.length} yêu cầu mượn sách đang chờ thủ thư phê duyệt`,
          route: '/admin/borrow-return',
        });
      }

      if (alerts.overdue && alerts.overdue.length) {
        alerts.overdue.forEach((item) => {
          alertItems.push({
            type: 'alert-danger',
            text: `[Quá hạn] ⚠️ ${item.reader} chưa trả “${item.book}” · hạn ${date(item.dueDate)}`,
            route: '/admin/borrow-return',
          });
        });
      }

      if (alerts.dueSoon && alerts.dueSoon.length) {
        alerts.dueSoon.forEach((item) => {
          alertItems.push({
            type: 'alert-warning',
            text: `[Sắp đến hạn] 🕒 ${item.reader} sắp đến hạn trả “${item.book}” · ${date(item.dueDate)}`,
            route: '/admin/borrow-return',
          });
        });
      }

      if (alerts.lowStock && alerts.lowStock.length) {
        alerts.lowStock.forEach((item) => {
          alertItems.push({
            type: 'alert-info',
            text: `[Sắp hết kho] 📦 “${item.title}” chỉ còn ${item.availableCopies} bản sẵn sàng`,
            route: '/admin/books',
          });
        });
      }
      if (alerts.damagedLostCount) {
        alertItems.push({
          type: 'alert-warning',
          text: `[Hư hỏng / Mất] ${alerts.damagedLostCount} phiếu ghi nhận sách hỏng hoặc thất lạc`,
          route: '/admin/fines',
        });
      }
      if ($('smartAlerts')) {
        $('smartAlerts').innerHTML = alertItems.length
          ? alertItems.map((item) => `<button class="smart-alert ${item.type}" data-alert-route="${item.route}" type="button">${escapeHtml(item.text)}</button>`).join('')
          : '<p class="empty-note">Hiện không có cảnh báo khẩn cấp nào cần xử lý.</p>';
      }
      document.querySelectorAll('[data-alert-route]').forEach((button) => {
        button.addEventListener('click', () => navigateAdmin(button.dataset.alertRoute));
      });

      // 2. Top 5-10 sách mượn nhiều nhất trên Dashboard & trang Báo cáo
      const topList = s.topBooks || [];
      const maxBorrows = topList.length ? Math.max(...topList.map((b) => Number(b.borrowCount || 1)), 1) : 1;

      if ($('dashboardTopBooks')) {
        $('dashboardTopBooks').innerHTML = topList.length
          ? topList.slice(0, 10).map((book, idx) => {
            const count = Number(book.borrowCount || 0);
            const pct = Math.max(8, Math.round((count / maxBorrows) * 100));
            const badgeBg = idx === 0 ? '#fef08a;color:#854d0e;' : idx === 1 ? '#e2e8f0;color:#334155;' : idx === 2 ? '#fed7aa;color:#9a3412;' : '#f1f5f9;color:#64748b;';
            return `<tr>
                <td><span style="display:inline-block;padding:2px 8px;border-radius:99px;font-weight:700;font-size:12px;background:${badgeBg}">#${idx + 1}</span></td>
                <td><strong>${escapeHtml(book.title)}</strong></td>
                <td>${escapeHtml(book.author)}</td>
                <td><strong style="color:#123c35;">${count}</strong> lượt mượn</td>
                <td>
                  <div style="background:#e2e8f0;height:8px;border-radius:99px;overflow:hidden;width:100%;">
                    <div style="background:#176b54;height:100%;width:${pct}%;border-radius:99px;"></div>
                  </div>
                </td>
              </tr>`;
          }).join('')
          : '<tr><td colspan="5">Chưa có dữ liệu mượn sách.</td></tr>';
      }

      if ($('topBooks')) {
        $('topBooks').innerHTML = topList.length
          ? topList.map((book) => `<tr><td><strong>${escapeHtml(book.title)}</strong></td><td>${escapeHtml(book.author)}</td><td>${escapeHtml(book.borrowCount)}</td></tr>`).join('')
          : '<tr><td colspan="3">Chưa có dữ liệu mượn.</td></tr>';
      }

      // Biểu đồ tròn Tỷ lệ sách theo thể loại
      drawDashboardCategoryPie(s.categoryDistribution || []);

      // 3. Bảng công việc cần xử lý ngay: Đặt trước & Sách bảo trì/thanh lý
      renderDashboardPendingReservations(s.pendingReservations || []);
      renderDashboardMaintenanceCopies(s.maintenanceCopies || []);

      // 4. Widget tài chính (Dòng tiền phạt)
      if ($('dashTodayFines')) {
        $('dashTodayFines').textContent = money(s.todayCollectedFines || 0);
      }
      if ($('dashTodayFinesCount')) {
        $('dashTodayFinesCount').textContent = `${Number(s.todayCollectedCount || 0).toLocaleString('vi-VN')} biên lai thanh toán`;
      }
      if ($('dashUnpaidFines')) {
        $('dashUnpaidFines').textContent = money(s.totalUnpaidFines || 0);
      }
      if ($('dashUnpaidFinesCount')) {
        $('dashUnpaidFinesCount').textContent = `${Number(s.unpaidFinesCount || 0).toLocaleString('vi-VN')} phiếu chưa thanh toán`;
      }
      if ($('dashTotalPaidFines')) {
        $('dashTotalPaidFines').textContent = money(s.totalPaidFines || 0);
      }
      if ($('dashFineRecoveryRate')) {
        const totalFinesAll = (Number(s.totalPaidFines) || 0) + (Number(s.totalUnpaidFines) || 0);
        const recoveryRate = totalFinesAll > 0 ? Math.round(((Number(s.totalPaidFines) || 0) / totalFinesAll) * 100) : 100;
        $('dashFineRecoveryRate').textContent = `Tỷ lệ thu hồi: ${recoveryRate}%`;
      }

      // 5. Widget Nhật ký thao tác gần nhất (Recent Activity)
      if ($('dashboardRecentActivityList')) {
        const activities = s.recentActivity || [];
        if (!activities.length) {
          $('dashboardRecentActivityList').innerHTML = '<p class="empty-note">Chưa có nhật ký hoạt động nào gần đây.</p>';
        } else {
          $('dashboardRecentActivityList').innerHTML = activities.map((act) => {
            const timeStr = act.createdAt ? new Date(act.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '—';
            const actionBadgeColor = (act.action || '').includes('CREATE') || (act.action || '').includes('BORROW') || (act.action || '').includes('APPROVE')
              ? 'background:#dcfce7;color:#166534;'
              : (act.action || '').includes('RETURN') || (act.action || '').includes('PAY')
                ? 'background:#ede9fe;color:#5b21b6;'
                : (act.action || '').includes('DELETE') || (act.action || '').includes('REJECT')
                  ? 'background:#fee2e2;color:#991b1b;'
                  : 'background:#f1f5f9;color:#334155;';
            return `
              <div style="display:flex;align-items:flex-start;justify-content:space-between;padding:8px 10px;background:#f8fafc;border-radius:6px;border-left:3px solid #6f42c1;gap:10px;">
                <div style="display:flex;flex-direction:column;gap:2px;">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <span style="font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px;${actionBadgeColor}">${escapeHtml(act.action || 'HÀNH ĐỘNG')}</span>
                    <strong style="font-size:12px;color:#1e293b;">${escapeHtml(act.operatorName || act.username || 'Hệ thống')}</strong>
                  </div>
                  <span style="font-size:12px;color:#475569;">${escapeHtml(act.details || act.description || 'Thao tác nghiệp vụ')}</span>
                </div>
                <small style="font-size:11px;color:#94a3b8;white-space:nowrap;">${timeStr}</small>
              </div>
            `;
          }).join('');
        }
      }

      if (window.location.pathname === '/admin/reports') {
        drawBorrowChart(topList);
      }
    } catch (error) {
      notify(`Không tải được bảng điều khiển: ${error.message}`, true);
    }
  }

  function drawDashboardCategoryPie(distribution) {
    const canvas = $('dashboardCategoryPieChart');
    const legend = $('dashboardCategoryLegend');
    if (!canvas || !legend) return;

    const items = (distribution || []).filter((d) => Number(d.bookCount) > 0);
    const totalBooks = items.reduce((acc, cur) => acc + Number(cur.bookCount || 0), 0);

    if (!items.length || totalBooks === 0) {
      legend.innerHTML = '<p class="empty-note">Chưa có dữ liệu phân loại sách.</p>';
      return;
    }

    const palette = ['#123c35', '#2a7b6f', '#0284c7', '#d97706', '#7c3aed', '#e11d48', '#16a34a', '#64748b'];

    legend.innerHTML = items.map((item, idx) => {
      const color = palette[idx % palette.length];
      const pct = ((Number(item.bookCount) / totalBooks) * 100).toFixed(1);
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 6px;border-radius:6px;background:#f8fafc;">
        <span style="display:flex;align-items:center;gap:8px;">
          <span style="width:12px;height:12px;border-radius:3px;background:${color};display:inline-block;flex-shrink:0;"></span>
          <strong>${escapeHtml(item.name)}</strong>
        </span>
        <span style="color:#475569;font-size:12px;font-weight:600;">${item.bookCount} đầu sách (${pct}%) · ${item.copyCount} bản</span>
      </div>`;
    }).join('');

    if (window.Chart) {
      if (dashboardCategoryChartInstance) dashboardCategoryChartInstance.destroy();
      dashboardCategoryChartInstance = new window.Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: items.map((i) => i.name),
          datasets: [{
            data: items.map((i) => Number(i.bookCount)),
            backgroundColor: items.map((_, idx) => palette[idx % palette.length]),
            borderWidth: 2,
            borderColor: '#ffffff',
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '58%',
          plugins: {
            legend: { display: false },
          },
        },
      });
      return;
    }

    // Native Canvas 2D fallback for Donut chart
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const size = 200;
    canvas.width = size;
    canvas.height = size;
    const cx = size / 2;
    const cy = size / 2;
    const radius = 80;
    let startAngle = -Math.PI / 2;

    ctx.clearRect(0, 0, size, size);
    items.forEach((item, idx) => {
      const sliceAngle = (Number(item.bookCount) / totalBooks) * (Math.PI * 2);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = palette[idx % palette.length];
      ctx.fill();
      startAngle += sliceAngle;
    });

    // Cutout center for Donut look
    ctx.beginPath();
    ctx.arc(cx, cy, 46, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.fillStyle = '#123c35';
    ctx.font = 'bold 16px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${totalBooks} sách`, cx, cy);
  }

  function renderDashboardPendingReservations(reservations) {
    if ($('dashCountPendingRes')) $('dashCountPendingRes').textContent = reservations.length;
    const tbody = $('dashboardPendingReservations');
    if (!tbody) return;

    if (!reservations.length) {
      tbody.innerHTML = '<tr><td colspan="5">Không có phiếu đặt trước nào đang chờ xử lý.</td></tr>';
      return;
    }

    tbody.innerHTML = reservations.map((res) => {
      const isReady = res.status === 'READY';
      const badge = isReady
        ? '<span style="background:#dcfce7;color:#166534;padding:3px 8px;border-radius:99px;font-size:12px;font-weight:600;">Đã giữ sách tại quầy</span>'
        : '<span style="background:#fef3c7;color:#92400e;padding:3px 8px;border-radius:99px;font-size:12px;font-weight:600;">Đang chờ sách về</span>';
      return `<tr>
        <td><strong>${escapeHtml(res.reader)}</strong></td>
        <td>
          <strong>${escapeHtml(res.bookTitle)}</strong>
          ${res.barcode ? `<br><small>Barcode: <code>${escapeHtml(res.barcode)}</code></small>` : ''}
        </td>
        <td>
          Ngày đặt: ${date(res.createdAt)}
          ${res.expiresAt ? `<br><small style="color:#d97706;">Hạn nhận: ${date(res.expiresAt)}</small>` : ''}
        </td>
        <td>${badge}</td>
        <td>
          <div class="book-actions">
            ${!isReady ? `<button class="button button-primary button-small" data-dash-res-ready="${res.id}" type="button">✓ Báo có sách</button>` : ''}
            ${isReady ? `<button class="button button-primary button-small" data-dash-res-claim="${res.id}" type="button">🤝 Giao sách</button>` : ''}
            <button class="button button-danger button-small" data-dash-res-cancel="${res.id}" type="button">× Hủy</button>
          </div>
        </td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('[data-dash-res-ready]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await api(`/reservations/${btn.dataset.dashResReady}/ready`, { method: 'POST' });
          notify('Đã chuyển trạng thái sẵn sàng nhận sách.');
          await loadDashboard();
        } catch (err) {
          notify(err.message, true);
        }
      });
    });

    tbody.querySelectorAll('[data-dash-res-claim]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await api(`/reservations/${btn.dataset.dashResClaim}/claim`, { method: 'POST' });
          notify('Đã giao sách và tạo phiếu mượn thành công.');
          await Promise.all([loadDashboard(), loadDashboardBorrowRecords()]);
        } catch (err) {
          notify(err.message, true);
        }
      });
    });

    tbody.querySelectorAll('[data-dash-res-cancel]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!window.confirm('Hủy phiếu đặt trước này?')) return;
        try {
          await api(`/reservations/${btn.dataset.dashResCancel}`, { method: 'DELETE' });
          notify('Đã hủy phiếu đặt trước.');
          await loadDashboard();
        } catch (err) {
          notify(err.message, true);
        }
      });
    });
  }

  function renderDashboardMaintenanceCopies(copies) {
    if ($('dashCountMaintenance')) $('dashCountMaintenance').textContent = copies.length;
    const tbody = $('dashboardMaintenanceCopies');
    if (!tbody) return;

    if (!copies.length) {
      tbody.innerHTML = '<tr><td colspan="5">Tất cả bản sao trong kho đều ở trạng thái tốt, không có sách cần bảo trì/thanh lý.</td></tr>';
      return;
    }

    const statusLabelMap = {
      MAINTENANCE: { text: 'Đang bảo trì', bg: '#fef3c7', color: '#92400e' },
      DAMAGED: { text: 'Sách hư hỏng', bg: '#fee2e2', color: '#b91c1c' },
      LOST: { text: 'Báo mất / Thất lạc', bg: '#f3e8ff', color: '#6b21a8' },
    };

    tbody.innerHTML = copies.map((copy) => {
      const st = statusLabelMap[copy.status] || { text: copy.status, bg: '#f1f5f9', color: '#334155' };
      return `<tr>
        <td><code>${escapeHtml(copy.barcode)}</code></td>
        <td><strong>${escapeHtml(copy.bookTitle)}</strong></td>
        <td>${escapeHtml(copy.shelf)}</td>
        <td><span style="background:${st.bg};color:${st.color};padding:3px 8px;border-radius:99px;font-size:12px;font-weight:600;">${st.text}</span></td>
        <td>
          <div class="book-actions">
            <button class="button button-primary button-small" data-dash-copy-restore="${copy.id}" data-book-id="${copy.bookId}" type="button">✓ Đã phục hồi (Lên kệ)</button>
            <button class="button button-danger button-small" data-dash-copy-dispose="${copy.id}" data-book-id="${copy.bookId}" type="button">🗑️ Thanh lý</button>
          </div>
        </td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('[data-dash-copy-restore]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await api(`/books/${btn.dataset.bookId}/copies/${btn.dataset.dashCopyRestore}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'AVAILABLE' }),
          });
          notify('Đã phục hồi bản sao về trạng thái Sẵn sàng.');
          await loadDashboard();
        } catch (err) {
          notify(err.message, true);
        }
      });
    });

    tbody.querySelectorAll('[data-dash-copy-dispose]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!window.confirm('Xác nhận thanh lý bản sao sách này khỏi kho lưu thông?')) return;
        try {
          await api(`/books/${btn.dataset.bookId}/copies/${btn.dataset.dashCopyDispose}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'DISPOSED' }),
          });
          notify('Đã chuyển bản sao sang trạng thái Thanh lý.');
          await loadDashboard();
        } catch (err) {
          notify(err.message, true);
        }
      });
    });
  }

  async function loadDashboardBorrowRecords() {
    try {
      state.dashboardRecords = await api('/borrow');
      renderDashboardPendingLoans();
      drawDashboardTrend();
    } catch (error) {
      if ($('dashboardPendingLoans')) {
        $('dashboardPendingLoans').innerHTML =
          `<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`;
      }
    }
  }

  function renderDashboardPendingLoans() {
    const pending = state.dashboardRecords.filter((record) => record.status === 'PENDING');
    if ($('dashCountPendingLoans')) $('dashCountPendingLoans').textContent = pending.length;
    $('dashboardPendingLoans').innerHTML = pending.length
      ? pending.map((record) => `<tr><td><button class="text-button" data-dashboard-reader="${record.user?.id}" type="button">${escapeHtml(record.user?.username || 'Độc giả')}</button></td><td><strong>${escapeHtml(record.book?.title || 'Sách không còn tồn tại')}</strong><br><small>${escapeHtml(record.copy?.barcode || '—')}</small></td><td>${date(record.borrowedAt)}</td><td><div class="book-actions"><button class="button button-primary button-small" data-dashboard-approve="${record.id}" type="button">✓ Duyệt</button><button class="button button-danger button-small" data-dashboard-reject="${record.id}" type="button">× Từ chối</button></div></td></tr>`).join('')
      : '<tr><td colspan="4">Không có yêu cầu mượn nào đang chờ duyệt.</td></tr>';
    document.querySelectorAll('[data-dashboard-approve]').forEach((button) => {
      button.addEventListener('click', () => void changeLoan(button.dataset.dashboardApprove, 'approve'));
    });
    document.querySelectorAll('[data-dashboard-reject]').forEach((button) => {
      button.addEventListener('click', () => void changeLoan(button.dataset.dashboardReject, 'reject'));
    });
    document.querySelectorAll('[data-dashboard-reader]').forEach((button) => {
      button.addEventListener('click', () => navigateAdmin(`/admin/users/${button.dataset.dashboardReader}`));
    });
  }

  function drawDashboardTrend() {
    const canvas = $('dashboardTrendChart');
    if (!canvas) return;
    const monthly = $('dashboardTrendPeriod')?.value === 'month';
    const chartType = $('dashboardTrendType')?.value || 'line';
    const now = new Date();
    let buckets;
    if (monthly) {
      buckets = Array.from({ length: 12 }, (_, index) => {
        const month = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);
        const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
        return { key, label: month.toLocaleDateString('vi-VN', { month: 'short', year: '2-digit' }), borrowCount: 0, returnCount: 0 };
      });
    } else {
      const currentMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dayOffset = (currentMonday.getDay() + 6) % 7;
      currentMonday.setDate(currentMonday.getDate() - dayOffset);
      buckets = Array.from({ length: 8 }, (_, index) => {
        const monday = new Date(currentMonday);
        monday.setDate(monday.getDate() - (7 * (7 - index)));
        const key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
        return { key, label: monday.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }), borrowCount: 0, returnCount: 0 };
      });
    }

    const getBucketKey = (dt) => {
      if (monthly) {
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      }
      const monday = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
      return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    };

    const counts = new Map(buckets.map((bucket) => [bucket.key, bucket]));
    for (const record of state.dashboardRecords) {
      if (record.borrowedAt) {
        const bDate = new Date(record.borrowedAt);
        if (!Number.isNaN(bDate.getTime())) {
          const k = getBucketKey(bDate);
          if (counts.has(k)) counts.get(k).borrowCount += 1;
        }
      }
      if (record.returnedAt || record.status === 'RETURNED') {
        const rDate = new Date(record.returnedAt || record.updatedAt || record.borrowedAt);
        if (!Number.isNaN(rDate.getTime())) {
          const k = getBucketKey(rDate);
          if (counts.has(k)) counts.get(k).returnCount += 1;
        }
      }
    }

    if (!window.Chart) {
      canvas.setAttribute('aria-label', `Xu hướng mượn trả: ${buckets.map((b) => `${b.label}: ${b.borrowCount} mượn / ${b.returnCount} trả`).join(', ')}`);
      return;
    }
    if (dashboardTrendChartInstance) dashboardTrendChartInstance.destroy();
    dashboardTrendChartInstance = new window.Chart(canvas, {
      type: chartType,
      data: {
        labels: buckets.map((bucket) => bucket.label),
        datasets: [
          {
            label: 'Lượt mượn sách',
            data: buckets.map((bucket) => bucket.borrowCount),
            borderColor: '#6f42c1',
            backgroundColor: chartType === 'bar' ? '#6f42c1' : 'rgba(111, 66, 193, 0.15)',
            fill: chartType === 'line',
            tension: 0.3,
            borderRadius: chartType === 'bar' ? 4 : 0,
          },
          {
            label: 'Lượt trả sách',
            data: buckets.map((bucket) => bucket.returnCount),
            borderColor: '#dc3545',
            backgroundColor: chartType === 'bar' ? '#dc3545' : 'rgba(220, 53, 69, 0.15)',
            fill: chartType === 'line',
            tension: 0.3,
            borderRadius: chartType === 'bar' ? 4 : 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true, position: 'top' } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      },
    });
    canvas.style.height = '260px';
  }

  function drawBorrowChart(topBooks) {
    const canvas = $('borrowChart');
    if (window.Chart) {
      if (borrowChartInstance) borrowChartInstance.destroy();
      const values = topBooks.slice(0, 10);
      borrowChartInstance = new window.Chart(canvas, {
        type: 'bar',
        data: {
          labels: values.map((book) => book.title),
          datasets: [{
            label: 'Lượt mượn',
            data: values.map((book) => Number(book.borrowCount)),
            backgroundColor: '#308367',
            borderRadius: 5,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
        },
      });
      canvas.style.height = '260px';
      return;
    }
    const context = canvas.getContext('2d');
    if (!context) return;
    const width = Math.max(320, canvas.clientWidth);
    const height = 220;
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    canvas.style.height = `${height}px`;
    context.scale(pixelRatio, pixelRatio);
    context.clearRect(0, 0, width, height);
    const values = topBooks.slice(0, 5);
    if (!values.length) {
      context.fillStyle = '#71817d';
      context.font = '12px Segoe UI, sans-serif';
      context.fillText('Chưa có dữ liệu mượn để hiển thị.', 12, 30);
      return;
    }
    const left = 34;
    const right = 12;
    const top = 14;
    const bottom = 53;
    const chartWidth = width - left - right;
    const chartHeight = height - top - bottom;
    const max = Math.max(1, ...values.map((book) => Number(book.borrowCount)));
    const slot = chartWidth / values.length;
    context.font = '10px Segoe UI, sans-serif';
    context.textAlign = 'right';
    context.textBaseline = 'middle';
    context.strokeStyle = '#e5ebe8';
    context.fillStyle = '#82918b';
    for (let tick = 0; tick <= 4; tick += 1) {
      const y = top + chartHeight * tick / 4;
      context.beginPath();
      context.moveTo(left, y);
      context.lineTo(width - right, y);
      context.stroke();
      context.fillText(String(Math.round(max * (4 - tick) / 4)), left - 8, y);
    }
    values.forEach((book, index) => {
      const barWidth = Math.min(42, slot * .54);
      const barHeight = Number(book.borrowCount) / max * chartHeight;
      const x = left + slot * index + (slot - barWidth) / 2;
      const y = top + chartHeight - barHeight;
      context.fillStyle = '#308367';
      context.beginPath();
      context.roundRect(x, y, barWidth, barHeight, [5, 5, 0, 0]);
      context.fill();
      context.fillStyle = '#53655f';
      context.textAlign = 'center';
      context.textBaseline = 'top';
      const title = String(book.title || '');
      context.fillText(title.length > 13 ? `${title.slice(0, 12)}…` : title, x + barWidth / 2, top + chartHeight + 9, slot - 4);
    });
  }

  let reportMonthlyCirculationChartInstance = null;
  let reportCategoryDistributionChartInstance = null;
  let reportTopBooksChartInstance = null;
  let reportReaderDemographicChartInstance = null;
  let reportHourlyPeakChartInstance = null;
  let reportFacultyDistributionChartInstance = null;

  async function loadAdvancedReports() {
    const timeRange = $('reportTimeRangeSelect')?.value || 'year';
    try {
      const data = await api(`/reports/analytics?timeRange=${encodeURIComponent(timeRange)}`);
      if (!data) return;

      // 1. KPI cards
      if ($('statReportTotalBorrows')) $('statReportTotalBorrows').textContent = Number(data.kpis?.totalBorrows || 0).toLocaleString('vi-VN');
      if ($('statReportOnTimeRate')) $('statReportOnTimeRate').textContent = `${data.kpis?.onTimeRate || 0}%`;
      if ($('statReportTurnoverRate')) $('statReportTurnoverRate').textContent = `${data.kpis?.turnoverRate || 0} lần/năm`;
      if ($('statReportFinesCollected')) $('statReportFinesCollected').textContent = money(data.kpis?.finesCollected || 0);

      // Chuẩn hóa dữ liệu động dù backend trả về dạng object hay array
      const monthlyLabels = Array.isArray(data.monthlyTrend)
        ? data.monthlyTrend.map((m) => m.month)
        : (data.monthlyTrend?.labels || ['Thg 1', 'Thg 2', 'Thg 3', 'Thg 4', 'Thg 5', 'Thg 6', 'Thg 7', 'Thg 8', 'Thg 9', 'Thg 10', 'Thg 11', 'Thg 12']);
      const monthlyBorrows = Array.isArray(data.monthlyTrend)
        ? data.monthlyTrend.map((m) => Number(m.borrows || 0))
        : (data.monthlyTrend?.borrows || []);
      const monthlyReturns = Array.isArray(data.monthlyTrend)
        ? data.monthlyTrend.map((m) => Number(m.returns || 0))
        : (data.monthlyTrend?.returns || []);

      const catLabels = Array.isArray(data.categoryShare)
        ? data.categoryShare.map((c) => c.name)
        : (data.categoryShare?.labels || []);
      const catData = Array.isArray(data.categoryShare)
        ? data.categoryShare.map((c) => Number(c.count || 0))
        : (data.categoryShare?.data || []);

      const readerLabels = Array.isArray(data.readerRoleStats)
        ? data.readerRoleStats.map((r) => r.role)
        : (data.readerRoleStats?.labels || []);
      const readerData = Array.isArray(data.readerRoleStats)
        ? data.readerRoleStats.map((r) => Number(r.count || 0))
        : (data.readerRoleStats?.data || []);

      // 2. Chart: Monthly Trend (Line Chart hoặc Canvas 2D fallback)
      const trendCanvas = $('reportMonthlyCirculationChart');
      if (trendCanvas) {
        if (window.Chart) {
          if (reportMonthlyCirculationChartInstance) reportMonthlyCirculationChartInstance.destroy();
          reportMonthlyCirculationChartInstance = new window.Chart(trendCanvas, {
            type: 'line',
            data: {
              labels: monthlyLabels,
              datasets: [
                {
                  label: 'Lượt mượn sách',
                  data: monthlyBorrows,
                  borderColor: '#6f42c1',
                  backgroundColor: 'rgba(111, 66, 193, 0.12)',
                  fill: true,
                  tension: 0.35,
                  borderWidth: 2.5,
                  pointBackgroundColor: '#6f42c1',
                  pointRadius: 4,
                },
                {
                  label: 'Lượt trả sách',
                  data: monthlyReturns,
                  borderColor: '#10b981',
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  fill: true,
                  tension: 0.35,
                  borderWidth: 2,
                  pointBackgroundColor: '#10b981',
                  pointRadius: 3,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'top', labels: { boxWidth: 12, font: { weight: 600 } } },
                tooltip: { mode: 'index', intersect: false },
              },
              scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } },
              },
            },
          });
        } else {
          // Native Canvas 2D fallback for Monthly Trend
          const ctx = trendCanvas.getContext('2d');
          if (ctx) {
            const w = Math.max(300, trendCanvas.clientWidth || 400);
            const h = 260;
            trendCanvas.width = w * (window.devicePixelRatio || 1);
            trendCanvas.height = h * (window.devicePixelRatio || 1);
            trendCanvas.style.height = `${h}px`;
            ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
            ctx.clearRect(0, 0, w, h);

            const padLeft = 40;
            const padRight = 20;
            const padTop = 30;
            const padBottom = 40;
            const chartW = w - padLeft - padRight;
            const chartH = h - padTop - padBottom;
            const maxVal = Math.max(5, ...monthlyBorrows, ...monthlyReturns);

            // Grid lines
            ctx.strokeStyle = '#e2e8f0';
            ctx.fillStyle = '#64748b';
            ctx.font = '10px Segoe UI, sans-serif';
            ctx.textAlign = 'right';
            for (let t = 0; t <= 4; t++) {
              const y = padTop + (chartH * t) / 4;
              ctx.beginPath();
              ctx.moveTo(padLeft, y);
              ctx.lineTo(w - padRight, y);
              ctx.stroke();
              ctx.fillText(String(Math.round(maxVal * (4 - t) / 4)), padLeft - 6, y + 3);
            }

            // Legend
            ctx.textAlign = 'left';
            ctx.fillStyle = '#6f42c1';
            ctx.fillRect(padLeft, 10, 12, 8);
            ctx.fillText('Lượt mượn', padLeft + 16, 17);
            ctx.fillStyle = '#10b981';
            ctx.fillRect(padLeft + 90, 10, 12, 8);
            ctx.fillText('Lượt trả', padLeft + 106, 17);

            // Draw line for borrows
            const step = chartW / Math.max(1, monthlyLabels.length - 1);
            ctx.strokeStyle = '#6f42c1';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            monthlyBorrows.forEach((val, idx) => {
              const x = padLeft + idx * step;
              const y = padTop + chartH - (val / maxVal) * chartH;
              if (idx === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            });
            ctx.stroke();

            // Draw line for returns
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2;
            ctx.beginPath();
            monthlyReturns.forEach((val, idx) => {
              const x = padLeft + idx * step;
              const y = padTop + chartH - (val / maxVal) * chartH;
              if (idx === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            });
            ctx.stroke();

            // X-axis labels
            ctx.fillStyle = '#64748b';
            ctx.textAlign = 'center';
            monthlyLabels.forEach((lbl, idx) => {
              const x = padLeft + idx * step;
              ctx.fillText(lbl, x, h - 14);
            });
          }
        }
      }

      // 3. Chart: Category distribution (Doughnut Chart hoặc Canvas 2D fallback)
      const catCanvas = $('reportCategoryDistributionChart');
      if (catCanvas) {
        if (window.Chart) {
          if (reportCategoryDistributionChartInstance) reportCategoryDistributionChartInstance.destroy();
          const colors = ['#dc3545', '#6f42c1', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];
          reportCategoryDistributionChartInstance = new window.Chart(catCanvas, {
            type: 'doughnut',
            data: {
              labels: catLabels,
              datasets: [{
                data: catData,
                backgroundColor: colors.slice(0, catLabels.length),
                borderWidth: 2,
              }],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'right', labels: { boxWidth: 12 } },
              },
              cutout: '62%',
            },
          });
        } else {
          // Native Canvas 2D fallback for Categories
          const ctx = catCanvas.getContext('2d');
          if (ctx) {
            const w = Math.max(260, catCanvas.clientWidth || 300);
            const h = 240;
            catCanvas.width = w * (window.devicePixelRatio || 1);
            catCanvas.height = h * (window.devicePixelRatio || 1);
            catCanvas.style.height = `${h}px`;
            ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
            ctx.clearRect(0, 0, w, h);

            const colors = ['#dc3545', '#6f42c1', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6'];
            const total = catData.reduce((a, b) => a + b, 0) || 1;
            const cx = w * 0.38;
            const cy = h / 2;
            const radius = Math.min(cx - 10, cy - 20);
            let startAngle = -0.5 * Math.PI;

            catData.forEach((val, idx) => {
              const slice = (val / total) * 2 * Math.PI;
              ctx.fillStyle = colors[idx % colors.length];
              ctx.beginPath();
              ctx.moveTo(cx, cy);
              ctx.arc(cx, cy, radius, startAngle, startAngle + slice);
              ctx.closePath();
              ctx.fill();
              startAngle += slice;
            });

            // Donut hole
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(cx, cy, radius * 0.58, 0, 2 * Math.PI);
            ctx.fill();

            // Legend
            ctx.textAlign = 'left';
            ctx.font = '11px Segoe UI, sans-serif';
            catLabels.slice(0, 6).forEach((lbl, idx) => {
              const y = 30 + idx * 24;
              ctx.fillStyle = colors[idx % colors.length];
              ctx.fillRect(w * 0.72, y, 10, 10);
              ctx.fillStyle = '#334155';
              const percent = Math.round((catData[idx] / total) * 100);
              ctx.fillText(`${lbl.slice(0, 10)} (${percent}%)`, w * 0.72 + 14, y + 9);
            });
          }
        }
      }

      // 4. Chart: Top 10 Books (Horizontal Bar hoặc Canvas 2D fallback)
      const topBooksCanvas = $('reportTopBooksChart');
      if (topBooksCanvas) {
        const top10 = (data.topBooks || []).slice(0, 10);
        if (window.Chart) {
          if (reportTopBooksChartInstance) reportTopBooksChartInstance.destroy();
          reportTopBooksChartInstance = new window.Chart(topBooksCanvas, {
            type: 'bar',
            data: {
              labels: top10.map((b) => (b.title && b.title.length > 22 ? b.title.slice(0, 20) + '…' : b.title || 'N/A')),
              datasets: [{
                label: 'Lượt mượn',
                data: top10.map((b) => Number(b.borrowCount || 0)),
                backgroundColor: '#dc3545',
                borderRadius: 4,
              }],
            },
            options: {
              indexAxis: 'y',
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { beginAtZero: true, ticks: { precision: 0 } },
              },
            },
          });
        } else {
          // Native Canvas 2D fallback for Top Books
          const ctx = topBooksCanvas.getContext('2d');
          if (ctx) {
            const w = Math.max(300, topBooksCanvas.clientWidth || 360);
            const h = 260;
            topBooksCanvas.width = w * (window.devicePixelRatio || 1);
            topBooksCanvas.height = h * (window.devicePixelRatio || 1);
            topBooksCanvas.style.height = `${h}px`;
            ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
            ctx.clearRect(0, 0, w, h);

            const maxBorrow = Math.max(1, ...top10.map((b) => Number(b.borrowCount || 0)));
            const barH = 18;
            const gap = 6;
            ctx.font = '11px Segoe UI, sans-serif';

            top10.slice(0, 8).forEach((b, idx) => {
              const y = 14 + idx * (barH + gap);
              const label = b.title && b.title.length > 15 ? b.title.slice(0, 14) + '…' : (b.title || 'Sách');
              ctx.textAlign = 'left';
              ctx.fillStyle = '#1e293b';
              ctx.fillText(label, 12, y + 13);

              const barW = Math.max(4, (Number(b.borrowCount || 0) / maxBorrow) * (w - 180));
              ctx.fillStyle = '#dc3545';
              ctx.beginPath();
              ctx.roundRect(120, y, barW, barH, 4);
              ctx.fill();

              ctx.fillStyle = '#64748b';
              ctx.fillText(`${b.borrowCount || 0} lượt`, 128 + barW, y + 13);
            });
          }
        }
      }

      // 5. Chart: Reader Demographic (Bar Chart hoặc Canvas 2D fallback)
      const readerCanvas = $('reportReaderDemographicChart');
      if (readerCanvas) {
        if (window.Chart) {
          if (reportReaderDemographicChartInstance) reportReaderDemographicChartInstance.destroy();
          reportReaderDemographicChartInstance = new window.Chart(readerCanvas, {
            type: 'bar',
            data: {
              labels: readerLabels,
              datasets: [{
                label: 'Lượt mượn theo nhóm độc giả',
                data: readerData,
                backgroundColor: ['#6f42c1', '#0ea5e9', '#10b981', '#f59e0b', '#64748b'],
                borderRadius: 6,
              }],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } },
              },
            },
          });
        } else {
          // Native Canvas 2D fallback for Reader Demographics
          const ctx = readerCanvas.getContext('2d');
          if (ctx) {
            const w = Math.max(280, readerCanvas.clientWidth || 320);
            const h = 240;
            readerCanvas.width = w * (window.devicePixelRatio || 1);
            readerCanvas.height = h * (window.devicePixelRatio || 1);
            readerCanvas.style.height = `${h}px`;
            ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
            ctx.clearRect(0, 0, w, h);

            const maxCount = Math.max(1, ...readerData);
            const colors = ['#6f42c1', '#0ea5e9', '#10b981', '#f59e0b', '#64748b'];
            const slotW = (w - 60) / Math.max(1, readerLabels.length);

            ctx.font = '10px Segoe UI, sans-serif';
            readerLabels.forEach((lbl, idx) => {
              const val = readerData[idx] || 0;
              const barH = (val / maxCount) * 150;
              const x = 40 + idx * slotW + (slotW - 32) / 2;
              const y = 190 - barH;

              ctx.fillStyle = colors[idx % colors.length];
              ctx.beginPath();
              ctx.roundRect(x, y, 32, barH, [4, 4, 0, 0]);
              ctx.fill();

              ctx.fillStyle = '#334155';
              ctx.textAlign = 'center';
              ctx.fillText(String(val), x + 16, y - 5);
              ctx.fillText(lbl.slice(0, 8), x + 16, 206);
            });
          }
        }
      }

      // 6. Chart: Hourly Peak Borrowing Heatmap (08:00 - 21:00)
      const hourlyCanvas = $('reportHourlyPeakChart');
      if (hourlyCanvas) {
        const hourlyLabels = data.hourlyActivity?.labels || ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
        const hourlyData = data.hourlyActivity?.data || [2, 12, 18, 14, 8, 9, 15, 11, 7, 5, 8, 6, 4, 2];
        const maxH = Math.max(1, ...hourlyData);

        if ($('reportPeakHourBadge') && data.hourlyActivity?.peakHourText) {
          $('reportPeakHourBadge').textContent = `Giờ cao điểm: ${data.hourlyActivity.peakHourText}`;
        }

        // Tính màu nhiệt: Xanh -> Vàng -> Cam -> Đỏ rực
        const heatColors = hourlyData.map((val) => {
          const ratio = val / maxH;
          if (ratio >= 0.85) return '#ef4444'; // Đỏ rực
          if (ratio >= 0.55) return '#f97316'; // Cam
          if (ratio >= 0.3) return '#fbbf24';  // Vàng
          return '#60a5fa';                    // Xanh dương dịu
        });

        if (window.Chart) {
          if (reportHourlyPeakChartInstance) reportHourlyPeakChartInstance.destroy();
          reportHourlyPeakChartInstance = new window.Chart(hourlyCanvas, {
            type: 'bar',
            data: {
              labels: hourlyLabels,
              datasets: [{
                label: 'Lượt mượn sách trong giờ',
                data: hourlyData,
                backgroundColor: heatColors,
                borderRadius: 4,
                borderWidth: 1,
                borderColor: '#cbd5e1',
              }],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (ctx) => ` ${ctx.raw} lượt mượn (${ctx.raw === maxH ? 'Đỉnh cao điểm' : 'Bình thường'})`,
                  },
                },
              },
              scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } },
              },
            },
          });
        } else {
          // Native Canvas 2D fallback for Hourly Peak Heatmap
          const ctx = hourlyCanvas.getContext('2d');
          if (ctx) {
            const w = Math.max(340, hourlyCanvas.clientWidth || 400);
            const h = 260;
            hourlyCanvas.width = w * (window.devicePixelRatio || 1);
            hourlyCanvas.height = h * (window.devicePixelRatio || 1);
            hourlyCanvas.style.height = `${h}px`;
            ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
            ctx.clearRect(0, 0, w, h);

            const padL = 36;
            const padR = 15;
            const padT = 20;
            const padB = 35;
            const chartW = w - padL - padR;
            const chartH = h - padT - padB;
            const colW = chartW / hourlyLabels.length;

            ctx.font = '9px Segoe UI, sans-serif';
            hourlyData.forEach((val, idx) => {
              const bH = (val / maxH) * chartH;
              const x = padL + idx * colW + 2;
              const y = padT + chartH - bH;
              ctx.fillStyle = heatColors[idx];
              ctx.beginPath();
              ctx.roundRect(x, y, Math.max(4, colW - 4), bH, [3, 3, 0, 0]);
              ctx.fill();

              ctx.fillStyle = '#64748b';
              ctx.textAlign = 'center';
              if (idx % 2 === 0) {
                ctx.fillText(hourlyLabels[idx], x + colW / 2, h - 12);
              }
            });
          }
        }
      }

      // 7. Chart: Faculty / Department Distribution (Doughnut / PolarArea)
      const facultyCanvas = $('reportFacultyDistributionChart');
      if (facultyCanvas) {
        const facultyLabels = data.facultyShare?.labels || ['CNTT', 'Kinh tế', 'Kỹ thuật', 'Ngoại ngữ', 'Y Dược', 'Khác'];
        const facultyData = data.facultyShare?.data || [35, 22, 18, 12, 8, 5];
        const colors = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

        if (window.Chart) {
          if (reportFacultyDistributionChartInstance) reportFacultyDistributionChartInstance.destroy();
          reportFacultyDistributionChartInstance = new window.Chart(facultyCanvas, {
            type: 'doughnut',
            data: {
              labels: facultyLabels,
              datasets: [{
                data: facultyData,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#ffffff',
              }],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'right', labels: { boxWidth: 10, font: { size: 11 } } },
              },
              cutout: '58%',
            },
          });
        } else {
          // Native Canvas 2D fallback for Faculty
          const ctx = facultyCanvas.getContext('2d');
          if (ctx) {
            const w = Math.max(260, facultyCanvas.clientWidth || 300);
            const h = 240;
            facultyCanvas.width = w * (window.devicePixelRatio || 1);
            facultyCanvas.height = h * (window.devicePixelRatio || 1);
            facultyCanvas.style.height = `${h}px`;
            ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
            ctx.clearRect(0, 0, w, h);

            const total = facultyData.reduce((a, b) => a + b, 0) || 1;
            const cx = w * 0.36;
            const cy = h / 2;
            const radius = Math.min(cx - 10, cy - 20);
            let startAngle = -0.5 * Math.PI;

            facultyData.forEach((val, idx) => {
              const slice = (val / total) * 2 * Math.PI;
              ctx.fillStyle = colors[idx % colors.length];
              ctx.beginPath();
              ctx.moveTo(cx, cy);
              ctx.arc(cx, cy, radius, startAngle, startAngle + slice);
              ctx.closePath();
              ctx.fill();
              startAngle += slice;
            });

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(cx, cy, radius * 0.55, 0, 2 * Math.PI);
            ctx.fill();

            // Legend
            ctx.font = '10px Segoe UI, sans-serif';
            ctx.textAlign = 'left';
            facultyLabels.forEach((lbl, idx) => {
              const y = 25 + idx * 22;
              ctx.fillStyle = colors[idx % colors.length];
              ctx.fillRect(w * 0.68, y, 8, 8);
              ctx.fillStyle = '#334155';
              ctx.fillText(lbl.slice(0, 12), w * 0.68 + 12, y + 8);
            });
          }
        }
      }

      // 8. Table: Top Books Detail
      const tbody = $('topBooks');
      if (tbody) {
        const topList = data.topBooks || [];
        if (!topList.length) {
          tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:#888;">Chưa có dữ liệu lượt mượn trong kỳ này.</td></tr>';
        } else {
          tbody.innerHTML = topList.map((book, idx) => {
            const avail = book.availableCopies ?? 0;
            const total = book.totalCopies ?? 0;
            const rankBadge = idx < 3
              ? `<span style="display:inline-block;width:24px;height:24px;border-radius:50%;background:#dc3545;color:#fff;font-weight:700;line-height:24px;font-size:12px;">${idx + 1}</span>`
              : `<span style="font-weight:600;color:#64748b;">${idx + 1}</span>`;
            const stockBadge = avail === 0
              ? '<span class="status-badge status-danger">Hết sách trên kệ</span>'
              : avail < 3
                ? '<span class="status-badge status-warning">Sắp hết (' + avail + ' cuốn)</span>'
                : '<span class="status-badge status-active">Đầy đủ (' + avail + ' cuốn)</span>';
            return `
              <tr>
                <td style="text-align:center;">${rankBadge}</td>
                <td>
                  <strong>${escapeHtml(book.title)}</strong>
                  ${book.isbn ? `<div style="font-size:11px;color:#888;">ISBN: ${escapeHtml(book.isbn)}</div>` : ''}
                </td>
                <td>${escapeHtml(book.author || 'Chưa cập nhật')}</td>
                <td><span class="status-badge" style="background:#f1f5f9;color:#475569;">${escapeHtml(book.category || 'Tổng hợp')}</span></td>
                <td style="text-align:center;"><strong>${avail}</strong> / ${total}</td>
                <td style="text-align:center;"><strong style="color:#dc3545;font-size:15px;">${book.borrowCount || 0}</strong></td>
                <td style="text-align:center;">${stockBadge}</td>
              </tr>
            `;
          }).join('');
        }
      }
    } catch (err) {
      console.error('Lỗi khi tải báo cáo nâng cao:', err);
    }
  }
  window.loadAdvancedReports = loadAdvancedReports;

  async function loadCompleteReportData() {
    if (!state.stats) throw new Error('Chưa có dữ liệu báo cáo để xuất.');
    const books = [];
    let page = 1;
    let lastPage = 1;
    do {
      const params = new URLSearchParams({ page: String(page), limit: '100' });
      const result = await api(`/books/search?${params}`);
      books.push(...result.data);
      lastPage = result.lastPage;
      page += 1;
    } while (page <= lastPage);
    const [borrowRecords, fines] = await Promise.all([
      api('/borrow'),
      api('/borrow/fines'),
    ]);
    const borrowCountByBook = new Map();
    borrowRecords
      .filter((record) => ['BORROWED', 'RETURNED'].includes(record.status))
      .forEach((record) => {
        if (!record.book?.id) return;
        borrowCountByBook.set(
          record.book.id,
          (borrowCountByBook.get(record.book.id) || 0) + 1,
        );
      });
    const booksWithBorrowCounts = books.map((book) => ({
      ...book,
      borrowCount: borrowCountByBook.get(book.id) || 0,
    }));
    return { books: booksWithBorrowCounts, borrowRecords, fines, stats: state.stats };
  }

  function reportTable(title, headers, rows, spreadsheet = false) {
    const cell = (value) => escapeHtml(spreadsheet && /^[=+\-@]/.test(String(value ?? ''))
      ? `'${value}`
      : value);
    return `<table><caption>${escapeHtml(title)}</caption><thead><tr>${headers.map((value) => `<th>${cell(value)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((value) => `<td>${cell(value)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }

  function reportDocumentContent(data, spreadsheet = false) {
    const summaryRows = [
      ['Tổng đầu sách', data.stats.totalBooks],
      ['Tổng bản sao', data.stats.totalCopies],
      ['Bản sao sẵn sàng', data.stats.availableCopies],
      ['Phiếu mượn đang hoạt động', data.stats.activeBorrows],
      ['Yêu cầu chờ duyệt', data.stats.pendingRequests],
      ['Sách quá hạn', data.stats.overdueBooks],
      ['Tỷ lệ phiếu đang mượn quá hạn', `${data.stats.overdueRate}%`],
      ['Tổng tiền phạt', money(data.stats.totalFines)],
      ['Tiền phạt đã thu', money(data.stats.totalPaidFines)],
      ['Tiền phạt chưa thu', money(data.stats.totalUnpaidFines)],
    ];
    const bookRows = data.books.map((book) => [
      book.id, book.title, book.author, book.isbn, book.category?.name || 'Chưa phân loại',
      book.publicationYear || '', book.totalCopies, book.availableCopies,
      [book.shelf && `Kệ ${book.shelf}`, book.floor && `Tầng ${book.floor}`, book.aisle]
        .filter(Boolean).join(' · '),
    ]);
    const borrowRows = data.borrowRecords.map((record) => [
      record.id, record.user?.username || '', record.book?.title || '', record.copy?.barcode || '',
      record.status, date(record.borrowedAt), date(record.dueDate), date(record.returnedAt),
      money(record.fineAmount), record.fineStatus,
    ]);
    const borrowCountRows = [...data.books]
      .sort((left, right) => right.borrowCount - left.borrowCount || left.title.localeCompare(right.title))
      .map((book) => [book.title, book.author, book.borrowCount]);
    const topBookRows = data.stats.topBooks.map((book) => [
      book.title, book.author, book.borrowCount,
    ]);
    const violationRows = data.fines.records.map((record) => [
      record.id,
      record.user?.username || '',
      record.book?.title || '',
      record.copy?.barcode || '',
      record.status,
      record.returnCondition || '',
      record.dueDate ? date(record.dueDate) : '',
      record.fineAmount,
      record.fineStatus,
    ]);
    const paymentRows = data.fines.payments.map((payment) => [
      payment.txnRef,
      payment.borrowRecordId,
      payment.amount,
      payment.paymentMethod,
      payment.status,
      date(payment.paidAt || payment.createdAt),
    ]);
    const inventoryIssueRows = data.fines.inventoryIssues.map((copy) => [
      copy.book?.title || '',
      copy.barcode,
      copy.status,
      [copy.shelf && `Kệ ${copy.shelf}`, copy.floor && `Tầng ${copy.floor}`, copy.aisle]
        .filter(Boolean).join(' · '),
    ]);
    const tables = [
      reportTable('Tổng quan', ['Chỉ số', 'Giá trị'], summaryRows, spreadsheet),
      reportTable('Danh sách sách', [
        'ID', 'Tên sách', 'Tác giả', 'ISBN', 'Thể loại', 'Năm xuất bản',
        'Tổng bản', 'Bản sẵn sàng', 'Vị trí',
      ], bookRows, spreadsheet),
      reportTable('Số lượt mượn theo đầu sách', ['Tên sách', 'Tác giả', 'Lượt mượn'], borrowCountRows, spreadsheet),
      reportTable('Top sách được mượn nhiều', ['Tên sách', 'Tác giả', 'Lượt mượn'], topBookRows, spreadsheet),
      reportTable('Danh sách phiếu mượn', [
        'Mã phiếu', 'Độc giả', 'Sách', 'Barcode', 'Trạng thái', 'Ngày tạo',
        'Hạn trả', 'Ngày trả', 'Tiền phạt', 'Trạng thái phạt',
      ], borrowRows, spreadsheet),
      reportTable('Danh sách nợ sách, quá hạn, hỏng/mất', [
        'Mã phiếu', 'Độc giả', 'Sách', 'Barcode', 'Trạng thái phiếu', 'Tình trạng trả',
        'Hạn trả', 'Tiền phạt', 'Trạng thái phạt',
      ], violationRows, spreadsheet),
      reportTable('Lịch sử thanh toán tiền phạt', [
        'Mã giao dịch', 'Mã phiếu', 'Số tiền', 'Phương thức', 'Trạng thái', 'Ngày thu',
      ], paymentRows, spreadsheet),
      reportTable('Bản sao bảo trì/hỏng/mất trong kho', [
        'Tên sách', 'Barcode', 'Tình trạng', 'Vị trí',
      ], inventoryIssueRows, spreadsheet),
    ].join('');
    return `<html><head><meta charset="UTF-8"><title>Báo cáo thư viện</title><style>
      body{color:#172f2b;font:12px Arial,sans-serif;margin:24px}
      h1{font-size:20px}p{color:#71817d}
      table{border-collapse:collapse;margin:18px 0 26px;width:100%}
      caption{text-align:left;font-size:15px;font-weight:bold;padding:8px 0}
      th,td{border:1px solid #dce5e0;padding:6px;text-align:left}
      th{background:#e8f4ee}tr{break-inside:avoid}
      @media print{body{margin:10mm}table{font-size:9px}}
    </style></head><body><h1>Báo cáo quản lý thư viện</h1>
      <p>Thời điểm xuất: ${escapeHtml(new Date().toLocaleString('vi-VN'))}</p>${tables}</body></html>`;
  }

  async function exportExcel() {
    try {
      const data = await loadCompleteReportData();
      downloadFile(
        `bao-cao-thu-vien-${new Date().toISOString().slice(0, 10)}.xls`,
        `\uFEFF${reportDocumentContent(data, true)}`,
        'application/vnd.ms-excel;charset=utf-8',
      );
    } catch (error) {
      notify(`Không thể xuất Excel: ${error.message}`, true);
    }
  }

  async function exportPdf() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return notify('Trình duyệt đã chặn cửa sổ xuất PDF.', true);
    try {
      const data = await loadCompleteReportData();
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
      printWindow.document.open();
      printWindow.document.write(reportDocumentContent(data));
      printWindow.document.close();
    } catch (error) {
      printWindow.close();
      notify(`Không thể tạo báo cáo PDF: ${error.message}`, true);
    }
  }

  function downloadFile(filename, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  $('loginForm')?.addEventListener('submit', (event) => void login(event));
  $('registerButton')?.addEventListener('click', openRegisterDialog);
  $('registerForm')?.addEventListener('submit', (event) => void register(event));
  $('staffForm')?.addEventListener('submit', (event) => void createStaff(event));
  $('refreshStaffs')?.addEventListener('click', () => void loadStaffs());
  $('bookForm')?.addEventListener('submit', (event) => void saveBook(event));
  $('bookImportForm')?.addEventListener('submit', (event) => void importBooks(event));
  $('downloadBookTemplate')?.addEventListener('click', downloadBookTemplate);
  $('exportBooksButton')?.addEventListener('click', () => void exportBooksCsv());
  $('manageReviewsButton')?.addEventListener('click', () => void openReviewModeration());
  $('loanRequestForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    void borrowBook($('loanBookId').value);
  });
  $('detailReserveButton')?.addEventListener('click', () => {
    if (state.currentDetailBookId) void reserveBook(state.currentDetailBookId);
  });
  $('returnForm')?.addEventListener('submit', (event) => void returnLoan(event));
  $('returnCondition')?.addEventListener('change', () => {
    $('damageFineField').hidden = $('returnCondition').value === 'NORMAL';
    updateReturnFineEstimate();
  });
  $('damageFineAmount')?.addEventListener('input', updateReturnFineEstimate);
  function playBarcodeScanTone(type = 'success') {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.22);
      } else if (type === 'warning') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(660, ctx.currentTime);
        osc.frequency.setValueAtTime(440, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(250, ctx.currentTime);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (_) { }
  }

  function addQuickReturnLog({ barcode, title, reader, fine = 0, success = true, message = '' }) {
    const panel = $('quickReturnLogPanel');
    const list = $('quickReturnLogList');
    if (!panel || !list) return;
    panel.hidden = false;
    const timeStr = new Date().toLocaleTimeString('vi-VN');
    const li = document.createElement('li');
    li.style.cssText = 'padding:6px 10px;border-radius:4px;display:flex;justify-content:space-between;align-items:center;font-size:12px;background:' +
      (success ? (fine > 0 ? '#fef3c7;border-left:4px solid #f59e0b' : '#ecfdf5;border-left:4px solid #10b981') : '#fee2e2;border-left:4px solid #ef4444');

    if (success) {
      li.innerHTML = `<div><strong>[${timeStr}]</strong> Barcode <code>${escapeHtml(barcode)}</code> · <strong>${escapeHtml(title)}</strong> (${escapeHtml(reader)})</div>` +
        (fine > 0 ? `<span style="color:#b45309;font-weight:700;">⚠️ Quá hạn, phạt: ${money(fine)}</span>` : `<span style="color:#047857;font-weight:700;">✓ Trả thành công</span>`);
    } else {
      li.innerHTML = `<div><strong>[${timeStr}]</strong> Barcode <code>${escapeHtml(barcode)}</code></div><span style="color:#b91c1c;font-weight:700;">✕ ${escapeHtml(message || 'Lỗi trả')}</span>`;
    }
    list.prepend(li);
    while (list.children.length > 20) {
      list.removeChild(list.lastChild);
    }
  }

  async function handleContinuousBarcodeReturn(barcode) {
    try {
      const record = await api(`/borrow/return/barcode/${encodeURIComponent(barcode)}`, {
        method: 'POST',
        body: JSON.stringify({
          condition: 'NORMAL',
          damageFineAmount: 0,
          collectFineAtCounter: true,
        }),
      });
      const fine = Number(record.fineAmount || 0);
      if (fine > 0) {
        playBarcodeScanTone('warning');
        notify(`⚠️ Trả thành công sách "${record.book?.title || barcode}". Độc giả ${record.user?.fullName || ''} phát sinh phạt: ${money(fine)}!`, false);
      } else {
        playBarcodeScanTone('success');
        notify(`⚡ [Trả nhanh] Thành công: "${record.book?.title || barcode}" của độc giả ${record.user?.fullName || ''}.`, false);
      }
      addQuickReturnLog({
        barcode,
        title: record.book?.title || 'Sách',
        reader: record.user?.fullName || record.user?.username || 'Độc giả',
        fine,
        success: true,
      });
      await Promise.all([loadBorrowRecords(), loadBooks(state.page), loadDashboard(), loadFines()]);
    } catch (error) {
      playBarcodeScanTone('error');
      addQuickReturnLog({
        barcode,
        success: false,
        message: error.message,
      });
      notify(`✕ Lỗi trả sách (${barcode}): ${error.message}`, true);
    } finally {
      if ($('loanReturnBarcode')) {
        $('loanReturnBarcode').value = '';
        $('loanReturnBarcode').focus();
      }
    }
  }

  $('loanReturnBarcode')?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const barcode = $('loanReturnBarcode').value.trim();
    if (!barcode) return;
    const isAutoReturn = $('autoReturnModeToggle')?.checked;
    if (isAutoReturn) {
      void handleContinuousBarcodeReturn(barcode);
      return;
    }
    const record = state.borrowRecords.find((item) =>
      item.copy?.barcode?.toLocaleLowerCase() === barcode.toLocaleLowerCase() &&
      item.status === 'BORROWED');
    $('loanReturnBarcode').value = '';
    if (!record) {
      playBarcodeScanTone('error');
      notify('Không tìm thấy phiếu đang mượn cho barcode này.', true);
      return;
    }
    openReturnDialog(record, barcode);
  });

  // Quét mã vạch trả sách qua Camera trực tiếp
  let loanReturnStream = null;
  let loanReturnDetector = null;
  let loanReturnHtml5Qr = null;
  let loanReturnScanning = false;
  let lastScannedLoanBarcode = '';
  let lastScannedLoanTime = 0;

  let cameraScanMode = 'RETURN'; // 'RETURN' hoặc 'BORROW'

  async function handleCameraBarcodeScanned(code) {
    if (!code) return;
    if (cameraScanMode === 'BORROW') {
      addBorrowBarcode(code);
      if (typeof playBarcodeScanTone === 'function') playBarcodeScanTone('scan');
      notify(`✓ Đã quét mã bản sao mượn: ${code}`);
      const msg = $('loanReturnCameraMsg');
      if (msg) msg.innerHTML = `✓ Đã thêm bản sao mượn: <b style="color:#0284c7;">${escapeHtml(code)}</b>`;
    } else {
      await handleContinuousBarcodeReturn(code);
    }
  }

  async function startLoanReturnCamera(mode = 'RETURN') {
    cameraScanMode = typeof mode === 'string' ? mode : 'RETURN';
    const dialog = $('loanReturnCameraDialog');
    const video = $('loanReturnCameraVideo');
    const readerDiv = $('loanReturnCameraReader');
    const msg = $('loanReturnCameraMsg');
    const title = $('loanReturnCameraTitle');
    const subtitle = $('loanReturnCameraSubtitle');
    if (!dialog) return;

    if (title) {
      title.innerHTML = cameraScanMode === 'BORROW'
        ? '📷 Quét Mã Vạch Camera Mượn Sách'
        : '📷 Quét Mã Vạch Camera Trả Sách Nhanh';
    }
    if (subtitle) {
      subtitle.textContent = cameraScanMode === 'BORROW'
        ? 'Hướng camera vào mã vạch dán trên gáy hoặc bìa sách để thêm tự động vào danh sách mượn tại quầy.'
        : 'Hướng camera vào mã vạch (Barcode / QR) dán trên gáy hoặc bìa sách. Hệ thống sẽ tự động nhận diện và hoàn tất thủ tục trả sách tức thì.';
    }

    dialog.showModal();
    if (msg) msg.textContent = 'Đang khởi động Camera...';
    if ($('loanReturnManualInput')) {
      $('loanReturnManualInput').value = '';
      setTimeout(() => $('loanReturnManualInput')?.focus(), 300);
    }

    try {
      if ('BarcodeDetector' in window) {
        if (readerDiv) readerDiv.style.display = 'none';
        if (video) video.style.display = 'block';
        loanReturnStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        video.srcObject = loanReturnStream;
        await video.play();

        loanReturnDetector = new window.BarcodeDetector({
          formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'qr_code'],
        });

        loanReturnScanning = true;
        if (msg) msg.textContent = 'Hướng ống kính camera vào mã vạch trên gáy/bìa sách...';
        scanLoanReturnFrame();
      } else if (window.Html5Qrcode) {
        if (video) video.style.display = 'none';
        if (readerDiv) readerDiv.style.display = 'block';
        loanReturnHtml5Qr = new window.Html5Qrcode('loanReturnCameraReader');
        await loanReturnHtml5Qr.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 260, height: 140 } },
          async (code) => {
            const now = Date.now();
            if (code && (code !== lastScannedLoanBarcode || now - lastScannedLoanTime > 3000)) {
              lastScannedLoanBarcode = code;
              lastScannedLoanTime = now;
              if (msg) msg.innerHTML = `Đã nhận diện: <b style="color:#0284c7;">${escapeHtml(code)}</b>`;
              if (typeof playBarcodeScanTone === 'function') playBarcodeScanTone('scan');
              await handleCameraBarcodeScanned(code);
            }
          },
          () => { }
        );
        loanReturnScanning = true;
        if (msg) msg.textContent = 'Hướng ống kính camera vào mã vạch trên gáy/bìa sách...';
      } else {
        if (msg) msg.textContent = 'Trình duyệt không hỗ trợ quét camera tự động. Vui lòng nhập mã vạch ở ô bên dưới.';
      }
    } catch (err) {
      if (msg) msg.textContent = `Không thể truy cập camera: ${err.message}. Bạn có thể nhập mã vạch bằng tay ở ô bên dưới.`;
      notify(`✕ Lỗi Camera: ${err.message}`, true);
    }
  }

  function stopLoanReturnCamera() {
    loanReturnScanning = false;
    if (loanReturnStream) {
      loanReturnStream.getTracks().forEach((track) => track.stop());
      loanReturnStream = null;
    }
    if (loanReturnHtml5Qr) {
      try {
        loanReturnHtml5Qr.stop().catch(() => { });
      } catch (_) { }
      loanReturnHtml5Qr = null;
    }
    const dialog = $('loanReturnCameraDialog');
    if (dialog && dialog.open) dialog.close();
  }

  async function scanLoanReturnFrame() {
    if (!loanReturnScanning) return;
    const video = $('loanReturnCameraVideo');
    const msg = $('loanReturnCameraMsg');

    if (video && video.readyState >= 2 && loanReturnDetector) {
      try {
        const barcodes = await loanReturnDetector.detect(video);
        if (barcodes && barcodes.length > 0) {
          const code = barcodes[0].rawValue.trim();
          const now = Date.now();
          if (code && (code !== lastScannedLoanBarcode || now - lastScannedLoanTime > 3000)) {
            lastScannedLoanBarcode = code;
            lastScannedLoanTime = now;
            if (msg) msg.innerHTML = `Đã nhận diện: <b style="color:#0284c7;">${escapeHtml(code)}</b>`;
            if (typeof playBarcodeScanTone === 'function') playBarcodeScanTone('scan');
            await handleCameraBarcodeScanned(code);
          }
        }
      } catch (e) {
        // detection frame error ignore
      }
    }
    if (loanReturnScanning) {
      requestAnimationFrame(scanLoanReturnFrame);
    }
  }

  $('openLoanReturnCameraBtn')?.addEventListener('click', () => void startLoanReturnCamera('RETURN'));
  $('openBorrowCameraBtn')?.addEventListener('click', () => void startLoanReturnCamera('BORROW'));
  $('closeLoanReturnCameraBtn')?.addEventListener('click', stopLoanReturnCamera);
  $('stopLoanReturnCameraBtn')?.addEventListener('click', stopLoanReturnCamera);

  $('loanReturnManualBtn')?.addEventListener('click', () => {
    const code = $('loanReturnManualInput')?.value.trim();
    if (!code) return notify('Vui lòng nhập mã vạch', true);
    $('loanReturnManualInput').value = '';
    void handleCameraBarcodeScanned(code);
  });
  $('loanReturnManualInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = $('loanReturnManualInput')?.value.trim();
      if (!code) return;
      $('loanReturnManualInput').value = '';
      void handleCameraBarcodeScanned(code);
    }
  });

  // Tự động nhắc lịch trả sách
  $('sendReturnRemindersBtn')?.addEventListener('click', async () => {
    const btn = $('sendReturnRemindersBtn');
    if (!btn) return;
    const originalText = btn.textContent;
    btn.textContent = '⏳ Đang quét & gửi nhắc nhở...';
    btn.disabled = true;
    try {
      const res = await api('/notifications/trigger-reminders', { method: 'POST' });
      notify(`🔔 ${res.message} (Sắp đến hạn: ${res.upcomingCount}, Đã quá hạn: ${res.overdueCount})`);
      await Promise.all([loadBorrowRecords(), loadNotifications(), loadDashboard()]);
    } catch (err) {
      notify(`Lỗi gửi nhắc nhở: ${err.message}`, true);
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });

  // Cấu hình phạt linh hoạt
  async function openFineConfigModal() {
    try {
      const settings = state.settings || await api('/system/settings');
      state.settings = settings;
      if ($('configDailyFineRate')) $('configDailyFineRate').value = settings.dailyFineRate ?? 5000;
      if ($('configFineLockThreshold')) $('configFineLockThreshold').value = settings.fineLockThreshold ?? 50000;
      if ($('configBorrowDays')) $('configBorrowDays').value = settings.borrowDays ?? 14;
      if ($('configRenewalDays')) $('configRenewalDays').value = settings.renewalDays ?? 14;
      if ($('configMaxActiveLoans')) $('configMaxActiveLoans').value = settings.maxActiveLoans ?? 5;

      const isAdmin = state.user?.role === 'ADMIN';
      const saveBtn = $('saveFineConfigBtn');
      if (saveBtn) {
        saveBtn.style.display = isAdmin ? 'inline-block' : 'none';
      }
      $('fineConfigDialog').showModal();
    } catch (err) {
      notify(`Không thể tải cấu hình phạt: ${err.message}`, true);
    }
  }

  $('openFineConfigBtn')?.addEventListener('click', openFineConfigModal);

  $('fineConfigForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (state.user?.role !== 'ADMIN') {
      notify('Chỉ Super Admin mới có quyền thay đổi chính sách phạt và quy định mượn trả.', true);
      return;
    }
    try {
      const payload = {
        dailyFineRate: Number($('configDailyFineRate').value),
        fineLockThreshold: Number($('configFineLockThreshold')?.value || 50000),
        borrowDays: Number($('configBorrowDays').value),
        renewalDays: Number($('configRenewalDays').value),
        maxActiveLoans: Number($('configMaxActiveLoans').value),
      };
      const updated = await api('/system/settings', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      state.settings = updated;
      $('fineConfigDialog').close();
      notify('✓ Đã cập nhật chính sách phạt và quy định mượn trả thành công!');
      if ($('loanRuleSummary')) {
        $('loanRuleSummary').textContent = `Mượn tối đa ${updated.maxActiveLoans} cuốn · ${updated.borrowDays} ngày/lượt · Phạt trễ hạn ${money(updated.dailyFineRate)}/ngày.`;
      }
      await loadBorrowRecords();
    } catch (err) {
      notify(`Lỗi cập nhật cấu hình: ${err.message}`, true);
    }
  });

  // Xuất báo cáo giao dịch mượn trả Excel & CSV
  async function fetchAllLoansForReport() {
    if (state.borrowRecords && state.borrowRecords.length > 0) {
      return state.borrowRecords;
    }
    try {
      return await api('/borrow');
    } catch (_) {
      return [];
    }
  }

  function getLoanStatusLabel(status) {
    const map = {
      PENDING: 'Chờ duyệt',
      APPROVED: 'Đã duyệt (chờ lấy)',
      BORROWED: 'Đang mượn',
      RETURNED: 'Đã trả',
      OVERDUE: 'Quá hạn',
      REJECTED: 'Từ chối',
      CANCELLED: 'Đã hủy',
    };
    return map[status] || status || '—';
  }

  function getConditionLabel(condition) {
    const map = {
      NORMAL: 'Bình thường',
      LIGHT_DAMAGE: 'Hỏng nhẹ',
      SEVERE_DAMAGE: 'Hỏng nặng',
      LOST: 'Báo mất',
    };
    return map[condition] || condition || 'Bình thường';
  }

  function getFineStatusLabel(status, amount) {
    if (!amount || amount <= 0) return 'Không phạt';
    const map = {
      PENDING: 'Chưa nộp',
      PAID: 'Đã thanh toán',
      WAIVED: 'Đã miễn giảm',
    };
    return map[status] || status || 'Chưa nộp';
  }

  async function exportLoansToExcel() {
    try {
      const loans = await fetchAllLoansForReport();
      if (!loans.length) {
        notify('Không có dữ liệu giao dịch mượn trả để xuất.', true);
        return;
      }

      const rowsXml = loans.map((l) => {
        const reader = escapeHtml(l.user?.fullName || l.user?.username || '—');
        const contact = escapeHtml(l.user?.phone || l.user?.email || '—');
        const cardCode = escapeHtml(l.user?.libraryCard?.cardNumber || '—');
        const title = escapeHtml(l.book?.title || '—');
        const barcode = escapeHtml(l.copy?.barcode || '—');
        const status = getLoanStatusLabel(l.status);
        const createdAt = l.createdAt ? new Date(l.createdAt).toLocaleDateString('vi-VN') : '—';
        const borrowedAt = l.borrowedAt ? new Date(l.borrowedAt).toLocaleDateString('vi-VN') : '—';
        const dueDate = l.dueDate ? new Date(l.dueDate).toLocaleDateString('vi-VN') : '—';
        const returnedAt = l.returnedAt ? new Date(l.returnedAt).toLocaleDateString('vi-VN') : '—';
        const condition = getConditionLabel(l.returnCondition || 'NORMAL');
        const overdueFine = Number(l.overdueFineAmount || 0);
        const damageFine = Number(l.damageFineAmount || 0);
        const totalFine = Number(l.fineAmount || (overdueFine + damageFine) || 0);
        const fineStatus = getFineStatusLabel(l.fineStatus, totalFine);

        return `<tr>
          <td>${l.id}</td>
          <td>${reader}</td>
          <td>${cardCode}</td>
          <td>${contact}</td>
          <td>${title}</td>
          <td style="mso-number-format:'\\@';">${barcode}</td>
          <td>${createdAt}</td>
          <td>${borrowedAt}</td>
          <td>${dueDate}</td>
          <td>${returnedAt}</td>
          <td>${status}</td>
          <td>${condition}</td>
          <td style="mso-number-format:'#,##0';">${overdueFine}</td>
          <td style="mso-number-format:'#,##0';">${damageFine}</td>
          <td style="mso-number-format:'#,##0';">${totalFine}</td>
          <td>${fineStatus}</td>
        </tr>`;
      }).join('');

      const excelTemplate = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
          <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>GiaoDichMuonTra</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
          <style>
            th { background-color: #0f766e; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px; }
            td { border: 1px solid #cbd5e1; padding: 5px; }
          </style>
        </head>
        <body>
          <h2>BÁO CÁO GIAO DỊCH MƯỢN TRẢ SÁCH THƯ VIỆN</h2>
          <p>Ngày xuất: ${new Date().toLocaleString('vi-VN')} · Tổng giao dịch: ${loans.length}</p>
          <table>
            <thead>
              <tr>
                <th>Mã phiếu</th>
                <th>Độc giả</th>
                <th>Số thẻ thư viện</th>
                <th>Liên hệ (SĐT/Email)</th>
                <th>Tên đầu sách</th>
                <th>Mã Barcode bản sao</th>
                <th>Ngày tạo</th>
                <th>Ngày mượn</th>
                <th>Hạn trả</th>
                <th>Ngày trả thực tế</th>
                <th>Trạng thái</th>
                <th>Tình trạng khi trả</th>
                <th>Phạt trễ hạn (VNĐ)</th>
                <th>Phạt hư hỏng/mất (VNĐ)</th>
                <th>Tổng phạt (VNĐ)</th>
                <th>Trạng thái nộp phạt</th>
              </tr>
            </thead>
            <tbody>
              ${rowsXml}
            </tbody>
          </table>
        </body>
        </html>
      `;

      downloadFile(
        `bao-cao-muon-tra-${new Date().toISOString().slice(0, 10)}.xls`,
        `\uFEFF${excelTemplate}`,
        'application/vnd.ms-excel;charset=utf-8'
      );
      notify(`Đã xuất file Excel cho ${loans.length} giao dịch mượn trả.`);
    } catch (err) {
      notify(`Lỗi xuất Excel: ${err.message}`, true);
    }
  }

  async function exportLoansToCsv() {
    try {
      const loans = await fetchAllLoansForReport();
      if (!loans.length) {
        notify('Không có dữ liệu giao dịch mượn trả để xuất.', true);
        return;
      }

      const headers = [
        'Mã phiếu',
        'Độc giả',
        'Số thẻ thư viện',
        'Liên hệ',
        'Tên đầu sách',
        'Barcode bản sao',
        'Ngày tạo',
        'Ngày mượn',
        'Hạn trả',
        'Ngày trả thực tế',
        'Trạng thái',
        'Tình trạng khi trả',
        'Phạt trễ hạn (VNĐ)',
        'Phạt hư hỏng/mất (VNĐ)',
        'Tổng phạt (VNĐ)',
        'Trạng thái nộp phạt',
      ];

      const csvEscape = (field) => {
        const str = String(field ?? '').replace(/"/g, '""');
        return `"${str}"`;
      };

      const rows = loans.map((l) => [
        l.id,
        l.user?.fullName || l.user?.username || '—',
        l.user?.libraryCard?.cardNumber || '—',
        l.user?.phone || l.user?.email || '—',
        l.book?.title || '—',
        l.copy?.barcode || '—',
        l.createdAt ? new Date(l.createdAt).toLocaleDateString('vi-VN') : '—',
        l.borrowedAt ? new Date(l.borrowedAt).toLocaleDateString('vi-VN') : '—',
        l.dueDate ? new Date(l.dueDate).toLocaleDateString('vi-VN') : '—',
        l.returnedAt ? new Date(l.returnedAt).toLocaleDateString('vi-VN') : '—',
        getLoanStatusLabel(l.status),
        getConditionLabel(l.returnCondition || 'NORMAL'),
        Number(l.overdueFineAmount || 0),
        Number(l.damageFineAmount || 0),
        Number(l.fineAmount || 0),
        getFineStatusLabel(l.fineStatus, Number(l.fineAmount || 0)),
      ].map(csvEscape).join(','));

      const csvContent = '\uFEFF' + [headers.map(csvEscape).join(','), ...rows].join('\r\n');
      downloadFile(
        `bao-cao-muon-tra-${new Date().toISOString().slice(0, 10)}.csv`,
        csvContent,
        'text/csv;charset=utf-8'
      );
      notify(`Đã xuất file CSV cho ${loans.length} giao dịch mượn trả.`);
    } catch (err) {
      notify(`Lỗi xuất CSV: ${err.message}`, true);
    }
  }

  $('exportLoansExcelBtn')?.addEventListener('click', () => void exportLoansToExcel());
  $('exportLoansCsvBtn')?.addEventListener('click', () => void exportLoansToCsv());
  $('clearQuickReturnLogBtn')?.addEventListener('click', () => {
    if ($('quickReturnLogList')) $('quickReturnLogList').innerHTML = '';
    if ($('quickReturnLogPanel')) $('quickReturnLogPanel').hidden = true;
  });
  $('userForm')?.addEventListener('submit', (event) => void createUser(event));
  $('userGroupFilter')?.addEventListener('change', renderUsers);
  $('userRoleFilter')?.addEventListener('change', renderUsers);
  $('userStatusFilter')?.addEventListener('change', renderUsers);
  $('userSearch')?.addEventListener('input', renderUsers);
  const updateNewUserGroupLimit = (selectEl) => {
    if (!selectEl) return;
    const limits = { STUDENT: 5, LECTURER: 15, RESEARCHER: 10, OTHER: 5 };
    const val = selectEl.value;
    if ($('newUserLimit')) $('newUserLimit').value = limits[val] || 5;
  };
  $('newUserGroup')?.addEventListener('change', (e) => updateNewUserGroupLimit(e.target));
  $('newUserReaderGroup')?.addEventListener('change', (e) => updateNewUserGroupLimit(e.target));
  $('editUserReaderGroup')?.addEventListener('change', (e) => {
    const limits = { STUDENT: 5, LECTURER: 15, RESEARCHER: 10, OTHER: 5 };
    if ($('editUserLimit')) $('editUserLimit').value = limits[e.target.value] || 5;
  });
  $('editUserRole')?.addEventListener('change', (e) => {
    if ($('editUserReaderGroupWrap')) {
      $('editUserReaderGroupWrap').style.display = e.target.value === 'READER' ? 'block' : 'none';
    }
  });
  $('autoLockReadersBtn')?.addEventListener('click', async () => {
    if (!window.confirm('Hệ thống sẽ quét toàn bộ độc giả vi phạm (mượn sách quá hạn >= 7 ngày hoặc nợ phạt > 100.000 ₫) và tự động khóa thẻ. Bạn có chắc chắn muốn thực hiện?')) return;
    try {
      const res = await api('/users/auto-lock-overdue', { method: 'POST' });
      if (res.count > 0) {
        notify(`Đã tự động khóa ${res.count} thẻ độc giả vi phạm quy định!`);
      } else {
        notify('Tất cả độc giả đều tuân thủ tốt hạn trả và phí phạt, không có thẻ nào bị khóa.');
      }
      await loadUsers();
    } catch (err) {
      notify(`Lỗi quét khóa thẻ: ${err.message}`, true);
    }
  });
  $('reissueCardBtn')?.addEventListener('click', () => void handleReissueCard());
  $('printCardBtn')?.addEventListener('click', printLibraryCard);
  $('staffPermissionsForm')?.addEventListener('submit', (e) => void saveStaffPermissions(e));
  $('viewAuditLogsFromUsersBtn')?.addEventListener('click', () => {
    navigateAdmin('/admin/audit-logs');
    if ($('auditLogModuleFilter')) {
      $('auditLogModuleFilter').value = 'USERS';
      void loadAuditLogs();
    }
  });
  $('userEditForm')?.addEventListener('submit', (event) => void updateUser(event));
  $('cardRenewForm')?.addEventListener('submit', (event) => void renewLibraryCard(event));
  $('quickBorrowForm')?.addEventListener('submit', (event) => void createStaffBorrowRequest(event));
  $('openBorrowDialog')?.addEventListener('click', () => void openStaffBorrowDialog());
  $('openToolbarCameraBtn')?.addEventListener('click', () => {
    openStaffBorrowDialog();
    startLoanReturnCamera('BORROW');
  });
  $('quickBorrowReaderSearch')?.addEventListener('input', renderQuickBorrowReaders);
  $('quickBorrowBarcode')?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    addBorrowBarcode($('quickBorrowBarcode').value);
  });
  $('borrowBarcodeList')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-borrow-barcode]');
    if (!button) return;
    state.staffBorrowBarcodes.splice(Number(button.dataset.removeBorrowBarcode), 1);
    renderBorrowBarcodeList();
  });
  $('settingsForm')?.addEventListener('submit', (event) => void saveSettings(event));
  $('saveAllSettingsTopBtn')?.addEventListener('click', () => void saveSettings());
  $('triggerAutomationRulesBtn')?.addEventListener('click', () => void triggerAutomationRules());
  $('downloadBackupSqlBtn')?.addEventListener('click', () => void downloadDatabaseBackup());
  $('downloadBackupSqlCardBtn')?.addEventListener('click', () => void downloadDatabaseBackup());
  $('triggerManualBackupBtn')?.addEventListener('click', () => void triggerManualBackup());
  $('dashboardAddBook')?.addEventListener('click', () => {
    navigateAdmin('/admin/books');
    window.requestAnimationFrame(() => $('newBookButton').click());
  });
  $('dashboardCreateLoan')?.addEventListener('click', () => {
    navigateAdmin('/admin/borrow-return');
    window.requestAnimationFrame(() => void openStaffBorrowDialog());
  });
  $('dashboardCreateReader')?.addEventListener('click', () => {
    navigateAdmin('/admin/users');
    window.requestAnimationFrame(() => {
      $('userForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
      $('newUsername').focus();
    });
  });
  $('dashboardViewLoans')?.addEventListener('click', () => navigateAdmin('/admin/borrow-return'));
  $('dashboardTrendPeriod')?.addEventListener('change', drawDashboardTrend);
  $('dashboardTrendType')?.addEventListener('change', drawDashboardTrend);
  $('refreshDashboardBtn')?.addEventListener('click', () => {
    void loadDashboard();
    void loadDashboardBorrowRecords();
    notify('Đã làm mới dữ liệu Bảng điều khiển.');
  });
  const switchDashTaskTab = (activeTab) => {
    const map = {
      loans: { btn: 'dashTaskTabLoans', panel: 'dashTaskPanelLoans' },
      reservations: { btn: 'dashTaskTabReservations', panel: 'dashTaskPanelReservations' },
      maintenance: { btn: 'dashTaskTabMaintenance', panel: 'dashTaskPanelMaintenance' },
    };
    Object.entries(map).forEach(([key, cfg]) => {
      const btn = $(cfg.btn);
      const panel = $(cfg.panel);
      if (btn) {
        btn.className = key === activeTab ? 'button button-primary button-small' : 'button button-light button-small';
      }
      if (panel) {
        panel.hidden = key !== activeTab;
      }
    });
  };
  $('dashTaskTabLoans')?.addEventListener('click', () => switchDashTaskTab('loans'));
  $('dashTaskTabReservations')?.addEventListener('click', () => switchDashTaskTab('reservations'));
  $('dashTaskTabMaintenance')?.addEventListener('click', () => switchDashTaskTab('maintenance'));
  $('profileQuickBorrow')?.addEventListener('click', () => void createLoanForProfileReader());
  $('profileRenewCard')?.addEventListener('click', () => {
    if (state.readerProfileUser) openCardRenewalForUser(state.readerProfileUser);
  });
  $('profileToggleCard')?.addEventListener('click', () => void toggleProfileCard());
  $('renewCardPeriod')?.addEventListener('change', setRenewalDate);
  $('publisherForm')?.addEventListener('submit', (event) => void savePublisher(event));
  $('publisherSearch')?.addEventListener('input', renderPublisherList);
  $('publisherName')?.addEventListener('input', () => $('publisherName').setCustomValidity(''));
  $('publisherPhone')?.addEventListener('input', () => $('publisherPhone').setCustomValidity(''));
  $('cancelPublisherEdit')?.addEventListener('click', clearPublisherForm);
  $('confirmPublisherDelete')?.addEventListener('click', () => {
    if (state.pendingPublisherDeleteId !== null) {
      void removePublisher(state.pendingPublisherDeleteId);
    }
  });
  $('addCopyButton')?.addEventListener('click', () => void addCopyFromDialog());
  $('printCopyLabels')?.addEventListener('click', () => void printCopyLabels());
  $('openBatchLabels')?.addEventListener('click', openBatchLabels);
  $('printSelectedLabels')?.addEventListener('click', () => void printSelectedBookLabels());
  $('selectAllLabelBooks')?.addEventListener('change', () => {
    document.querySelectorAll('[data-label-book]').forEach((input) => {
      input.checked = $('selectAllLabelBooks').checked;
    });
    void loadBatchLabelPreview();
  });
  $('labelBookSelector')?.addEventListener('change', (event) => {
    if (event.target.matches('[data-label-book]')) void loadBatchLabelPreview();
  });
  $('newBookButton')?.addEventListener('click', () => {
    const form = $('bookForm');
    if (form) form.reset();
    if ($('bookId')) $('bookId').value = '';
    if ($('bookFormTitle')) $('bookFormTitle').textContent = 'Thêm sách mới';
    const panel = $('bookFormPanel');
    if (panel) {
      panel.hidden = false;
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    $('bookTitle')?.focus();
  });
  $('cancelBookEdit')?.addEventListener('click', () => {
    if ($('bookFormPanel')) $('bookFormPanel').hidden = true;
  });
  $('categoryForm')?.addEventListener('submit', (event) => void addCategory(event));
  $('categoryEditForm')?.addEventListener('submit', (event) => void saveCategoryEdit(event));
  $('refreshCategories')?.addEventListener('click', () => void loadCategories());
  $('categorySearch')?.addEventListener('input', () => {
    window.clearTimeout(state.categorySearchTimer);
    state.categorySearchTimer = window.setTimeout(() => void loadCategories(), 300);
  });
  $('categoryHierarchyFilter')?.addEventListener('change', () => void loadCategories());
  $('categoryBookCountFilter')?.addEventListener('change', () => void loadCategories());
  document.querySelectorAll('[data-cat-pill]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.categoryQuickFilter = btn.dataset.catPill;
      document.querySelectorAll('[data-cat-pill]').forEach((b) => {
        const isActive = b.dataset.catPill === state.categoryQuickFilter;
        b.classList.toggle('is-active', isActive);
        b.classList.toggle('button-primary', isActive);
        b.classList.toggle('button-light', !isActive);
      });
      if ($('categoryBookCountFilter')) {
        if (['has_books', 'no_books'].includes(state.categoryQuickFilter)) {
          $('categoryBookCountFilter').value = state.categoryQuickFilter;
        } else {
          $('categoryBookCountFilter').value = '';
        }
      }
      if ($('categoryHierarchyFilter')) {
        if (['root', 'child'].includes(state.categoryQuickFilter)) {
          $('categoryHierarchyFilter').value = state.categoryQuickFilter;
        } else {
          $('categoryHierarchyFilter').value = '';
        }
      }
      void loadCategories();
    });
  });
  $('selectAllCats')?.addEventListener('change', (e) => {
    if (!state.categories) return;
    if (e.target.checked) {
      state.categories.forEach((c) => state.selectedCategoryIds.add(c.id));
    } else {
      state.selectedCategoryIds.clear();
    }
    document.querySelectorAll('.cat-checkbox').forEach((box) => {
      box.checked = e.target.checked;
    });
    updateCatBulkBar();
  });
  $('clearCatSelectionBtn')?.addEventListener('click', () => {
    if (state.selectedCategoryIds) state.selectedCategoryIds.clear();
    document.querySelectorAll('.cat-checkbox').forEach((box) => {
      box.checked = false;
    });
    updateCatBulkBar();
  });
  $('openBulkMergeBtn')?.addEventListener('click', () => {
    const selected = Array.from(state.selectedCategoryIds || []);
    if (!selected.length) {
      notify('Vui lòng chọn ít nhất 1 thể loại để gộp.', true);
      return;
    }
    openMergeCategoriesModal(selected);
  });
  $('mergeCategoriesForm')?.addEventListener('submit', (e) => void handleMergeCategoriesSubmit(e));
  $('categoryImportFile')?.addEventListener('change', async function () {
    if (!this.files || !this.files[0]) return;
    const fd = new FormData();
    fd.append('file', this.files[0]);
    try {
      const res = await api('/categories/import', { method: 'POST', body: fd });
      notify(res?.message || 'Nhập dữ liệu thể loại thành công.');
      this.value = '';
      await Promise.all([loadCategories(), loadBooks(1)]);
    } catch (err) {
      notify(err.message, true);
    }
  });
  $('downloadCategoryTemplate')?.addEventListener('click', () => {
    const csv = 'Tên thể loại,Mã DDC,Thể loại cha,Mô tả\r\nCông nghệ thông tin,004,,Sách CNTT\r\nLập trình Web,006,Công nghệ thông tin,Lập trình Web Frontend và Backend\r\n';
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mau_the_loai.csv';
    a.click();
  });

  // Publisher extras
  $('publisherImportFile')?.addEventListener('change', async function () {
    if (!this.files || !this.files[0]) return;
    const fd = new FormData();
    fd.append('file', this.files[0]);
    try {
      const res = await api('/publishers/import', { method: 'POST', body: fd });
      notify(res?.message || 'Nhập dữ liệu nhà xuất bản thành công.');
      this.value = '';
      await Promise.all([loadPublishers(), loadBooks(1)]);
    } catch (err) {
      notify(err.message, true);
    }
  });
  $('downloadPublisherTemplate')?.addEventListener('click', () => {
    const csv = 'Tên nhà xuất bản,Mã số thuế,Người đại diện,Điện thoại,Email,Địa chỉ,Website,Chiết khấu (%),Chất lượng (1-5),Tiến độ giao hàng,Ghi chú uy tín\r\nNXB Giáo Dục Việt Nam,0101234567,Nguyễn Văn A,024-3822-0801,contact@nxbgd.vn,81 Trần Hưng Đạo Hà Nội,https://nxbgd.vn,25,5,FAST,Đối tác chiến lược cung cấp sách giáo trình đúng hạn\r\nNXB Trẻ,0300123456,Trần Thị B,028-3931-6289,hopdong@nxbtre.com.vn,161B Lý Chính Thắng Q3 TPHCM,https://nxbtre.com.vn,20,5,ON_TIME,Sách văn học và kỹ năng chất lượng cao\r\n';
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mau_nha_xuat_ban.csv';
    a.click();
  });
  $('publisherRatingFilter')?.addEventListener('change', () => renderPublisherList());
  $('publisherDeliveryFilter')?.addEventListener('change', () => renderPublisherList());
  $('publisherBookCountFilter')?.addEventListener('change', () => renderPublisherList());
  document.querySelectorAll('[data-pub-pill]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.publisherQuickFilter = btn.dataset.pubPill;
      document.querySelectorAll('[data-pub-pill]').forEach((b) => {
        const isActive = b.dataset.pubPill === state.publisherQuickFilter;
        b.classList.toggle('is-active', isActive);
        b.classList.toggle('button-primary', isActive);
        b.classList.toggle('button-light', !isActive);
      });
      if ($('publisherBookCountFilter')) {
        if (['has_books', 'no_books'].includes(state.publisherQuickFilter)) {
          $('publisherBookCountFilter').value = state.publisherQuickFilter;
        } else {
          $('publisherBookCountFilter').value = '';
        }
      }
      if ($('publisherRatingFilter')) {
        if (state.publisherQuickFilter === '5_star') {
          $('publisherRatingFilter').value = '5';
        } else {
          $('publisherRatingFilter').value = '';
        }
      }
      if ($('publisherDeliveryFilter')) {
        if (state.publisherQuickFilter === 'fast') {
          $('publisherDeliveryFilter').value = 'FAST';
        } else {
          $('publisherDeliveryFilter').value = '';
        }
      }
      renderPublisherList();
    });
  });
  $('refreshPublishers')?.addEventListener('click', () => void loadPublishers());
  document.querySelectorAll('[data-close-dialog]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const dlg = $(btn.dataset.closeDialog);
      if (dlg) dlg.close();
    });
  });
  $('categoryFilter')?.addEventListener('change', () => {
    state.categoryId = $('categoryFilter').value;
    void loadBooks(1);
  });
  $('availabilityFilter')?.addEventListener('change', () => void loadBooks(1));
  $('publicationYearFilter')?.addEventListener('change', () => void loadBooks(1));
  ['shelfFilter', 'floorFilter', 'aisleFilter'].forEach((id) => {
    $(id).addEventListener('change', () => void loadBooks(1));
  });
  $('searchInput')?.addEventListener('input', () => {
    window.clearTimeout(state.searchTimer);
    state.searchTimer = window.setTimeout(() => {
      void loadBooks(1);
      void loadSearchSuggestions($('searchInput').value, 'searchInput', 'bookSuggestions');
    }, 250);
  });
  $('globalSearch')?.addEventListener('input', () => {
    window.clearTimeout(state.globalSearchTimer);
    state.globalSearchTimer = window.setTimeout(() =>
      void loadSearchSuggestions($('globalSearch').value, 'globalSearch', 'globalSuggestions'), 180);
  });
  $('globalSearch')?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    $('searchInput').value = $('globalSearch').value.trim();
    $('globalSuggestions').hidden = true;
    $('globalSearch').setAttribute('aria-expanded', 'false');
    if (isInventoryStaff() && window.location.pathname !== '/admin/books') {
      navigateAdmin('/admin/books');
    } else if (window.location.pathname !== '/search' &&
      window.location.pathname !== '/admin/books') {
      window.history.pushState({}, '', '/search');
      syncAdminRoute();
    }
    $('books').scrollIntoView({ behavior: 'smooth', block: 'start' });
    void loadBooks(1);
  });
  $('globalSuggestions')?.addEventListener('click', chooseSearchSuggestion);
  $('bookSuggestions')?.addEventListener('click', chooseSearchSuggestion);
  $('loanSearch')?.addEventListener('input', () => {
    state.borrowPage = 1;
    renderBorrowRecords();
  });
  document.querySelectorAll('[data-loan-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      state.borrowFilter = button.dataset.loanFilter;
      state.borrowPage = 1;
      renderBorrowRecords();
    });
  });
  $('previousLoanPage')?.addEventListener('click', () => {
    if (state.borrowPage > 1) {
      state.borrowPage -= 1;
      renderBorrowRecords();
    }
  });
  $('nextLoanPage')?.addEventListener('click', () => {
    const search = $('loanSearch').value.trim().toLocaleLowerCase();
    const count = state.borrowRecords.filter((record) => {
      const overdue = record.status === 'BORROWED' && record.dueDate && new Date(record.dueDate) < new Date();
      const matchesStatus = state.borrowFilter === 'all' || (state.borrowFilter === 'OVERDUE' ? overdue : record.status === state.borrowFilter);
      const statusText = overdue ? 'Quá hạn overdue' : ({
        PENDING: 'Chờ duyệt pending',
        BORROWED: 'Đang mượn borrowed',
        RETURNED: 'Đã trả returned',
        REJECTED: 'Từ chối rejected',
      })[record.status] || record.status;
      const searchText = `${record.user?.username || ''} ${record.user?.fullName || ''} ${record.user?.phone || ''} ${record.user?.id || ''} TV-${record.user?.id || ''} ${record.book?.title || ''} ${record.copy?.barcode || ''} ${statusText}`;
      return matchesStatus && (!search || searchText.toLocaleLowerCase().includes(search));
    }).length;
    if (state.borrowPage < Math.ceil(count / state.borrowPageSize)) {
      state.borrowPage += 1;
      renderBorrowRecords();
    }
  });
  $('sidebarToggle')?.addEventListener('click', () => {
    const isMobile = window.matchMedia('(max-width: 820px)').matches;
    document.body.classList.toggle(isMobile ? 'sidebar-open' : 'sidebar-collapsed');
    $('sidebarToggle').setAttribute(
      'aria-expanded',
      String(isMobile
        ? document.body.classList.contains('sidebar-open')
        : !document.body.classList.contains('sidebar-collapsed')),
    );
  });
  document.querySelectorAll('.sidebar-navigation a').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      navigateAdmin(link.href.replace(window.location.origin, ''));
    });
  });
  window.addEventListener('popstate', () => {
    syncAdminRoute();
    if (window.location.pathname === '/register' && !state.user &&
      !$('registerDialog').open) {
      $('registerDialog').showModal();
    }
    window.scrollTo({ top: 0 });
  });
  $('barcodeInput')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { event.preventDefault(); void scanBarcode(); }
  });
  $('previousPage')?.addEventListener('click', () => { if (state.page > 1) void loadBooks(state.page - 1); });
  $('nextPage')?.addEventListener('click', () => { if (state.page < state.lastPage) void loadBooks(state.page + 1); });
  $('refreshLoans')?.addEventListener('click', () => void loadBorrowRecords());
  $('refreshFines')?.addEventListener('click', () => void loadFines());
  $('openManualFineDialog')?.addEventListener('click', () => void openManualFineDialog());
  $('manualFineForm')?.addEventListener('submit', (event) => void createManualFine(event));
  $('manualFineReaderSearch')?.addEventListener('input', renderManualFineReaders);
  $('manualFineType')?.addEventListener('change', () => $('manualFineBarcode').setCustomValidity(''));
  $('fineCollectionForm')?.addEventListener('submit', (event) => void collectFine(event));
  $('fineCollectionMethod')?.addEventListener('change', renderFineVietQr);
  $('fineWaiveForm')?.addEventListener('submit', (event) => void waiveFine(event));
  $('finePaymentFrom')?.addEventListener('change', renderFinePayments);

  // In biên lai điện tử
  $('printReceiptBtn')?.addEventListener('click', () => {
    const printArea = $('receiptPrintArea');
    if (!printArea) {
      window.print();
      return;
    }
    const printWindow = window.open('', '_blank', 'width=700,height=800');
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Biên lai điện tử thu tiền phạt - Thư viện</title>
  <style>
    @page { size: A5 portrait; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background: #fff; margin: 0; padding: 20px; }
    .receipt-print-area { max-width: 540px; margin: 0 auto; }
    table { width: 100%; border-collapse: collapse; }
    @media print {
      body { padding: 0; }
      @page { margin: 8mm; }
    }
  </style>
</head>
<body>
  <div class="receipt-print-area">
    ${printArea.innerHTML}
  </div>
  <script>
    window.onload = function() {
      window.print();
      setTimeout(function() { window.close(); }, 500);
    };
  </script>
</body>
</html>`);
    printWindow.document.close();
  });

  // Quét và cảnh báo/khóa tài khoản độc giả vượt ngưỡng nợ phạt
  $('checkFineThresholdsBtn')?.addEventListener('click', async () => {
    const btn = $('checkFineThresholdsBtn');
    if (!btn) return;
    const text = btn.textContent;
    btn.textContent = '⏳ Đang quét nợ phạt...';
    btn.disabled = true;
    try {
      const res = await api('/borrow/fines/check-thresholds', { method: 'POST' });
      if (res.lockedCount > 0) {
        notify(`⚠️ ${res.message} (Đã tạm khóa ${res.lockedCount} độc giả vượt ngưỡng ${money(res.threshold)})`, true);
      } else {
        notify(`✓ ${res.message} Không có độc giả nào vượt ngưỡng nợ phạt.`);
      }
      await Promise.all([loadFines(), loadUsers(), loadBorrowRecords()]);
    } catch (err) {
      notify(`Lỗi quét ngưỡng nợ: ${err.message}`, true);
    } finally {
      btn.textContent = text;
      btn.disabled = false;
    }
  });

  // Mở máy tính định giá đền bù từ returnDialog
  $('openCompensationCalcFromReturn')?.addEventListener('click', () => {
    const recordId = $('returnRecordId')?.value;
    const record = state.borrowRecords?.find(r => r.id === Number(recordId));
    const price = record?.book?.price || 100000;
    openCompensationCalculator('damageFineAmount', price, record?.book?.title || '');
  });

  // Mở máy tính định giá đền bù từ manualFineDialog
  $('openCompensationCalcFromManual')?.addEventListener('click', () => {
    openCompensationCalculator('manualFineAmount', 100000, '');
  });

  // Sự kiện thay đổi tham số trong máy tính đền bù
  ['calcBookPrice', 'calcPublicationYear', 'calcWearFactor', 'calcDamageSeverity', 'calcProcessingFee'].forEach(id => {
    $(id)?.addEventListener('input', updateCompensationCalculation);
    $(id)?.addEventListener('change', updateCompensationCalculation);
  });

  // Áp dụng mức tiền đền bù vào form
  $('applyCompensationBtn')?.addEventListener('click', () => {
    const total = updateCompensationCalculation();
    if (compensationTargetInput && $(compensationTargetInput)) {
      $(compensationTargetInput).value = total;
      if (compensationTargetInput === 'damageFineAmount' && typeof updateReturnFineEstimate === 'function') {
        updateReturnFineEstimate();
      }
    }
    $('compensationDialog')?.close();
    notify(`✓ Đã áp dụng mức phạt đền bù: ${money(total)}.`);
  });

  $('finePaymentTo')?.addEventListener('change', renderFinePayments);
  $('exportFinePayments')?.addEventListener('click', exportFinePayments);
  $('refreshReaderProfile')?.addEventListener('click', () => {
    const match = window.location.pathname.match(/^\/admin\/users\/(\d+)$/);
    if (match) void loadReaderProfile(Number(match[1]));
    else if (window.location.pathname === '/profile' && state.user) {
      void loadReaderProfile(state.user.id);
    }
  });

  // Quét Barcode giao sách nhanh 1 chạm trong quản lý đặt giữ
  $('reservationQuickBarcode')?.addEventListener('keydown', async (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const barcode = $('reservationQuickBarcode').value.trim();
    if (!barcode) return;
    const match = (state.reservations || []).find((r) =>
      r.status === 'READY' &&
      r.copy?.barcode?.toLowerCase() === barcode.toLowerCase()
    );
    $('reservationQuickBarcode').value = '';
    if (!match) {
      if (typeof playBarcodeScanTone === 'function') playBarcodeScanTone('error');
      notify(`Không tìm thấy yêu cầu giữ chỗ READY nào cho barcode "${barcode}". Vui lòng kiểm tra lại.`, true);
      return;
    }
    try {
      await quickClaimReservation(match.id);
    } catch (_) { }
    $('reservationQuickBarcode').focus();
  });

  // Tìm kiếm tức thì trong hàng chờ
  $('reservationSearchInput')?.addEventListener('input', () => {
    renderReservations();
  });

  // Quét dọn các đơn giữ chỗ quá hạn 24 giờ
  $('triggerReservationExpireBtn')?.addEventListener('click', async () => {
    const btn = $('triggerReservationExpireBtn');
    if (!btn) return;
    const text = btn.textContent;
    btn.textContent = '⏳ Đang quét...';
    btn.disabled = true;
    try {
      const res = await api('/reservations/expire-check', { method: 'POST' });
      notify(`🧹 ${res.message} (Đã giải phóng: ${res.expiredCount} đơn quá hạn 24h)`);
      await Promise.all([loadReservations(), loadBooks(state.page), loadDashboard()]);
    } catch (err) {
      notify(`Lỗi quét dọn: ${err.message}`, true);
    } finally {
      btn.textContent = text;
      btn.disabled = false;
    }
  });

  $('refreshReservations')?.addEventListener('click', () => void loadReservations());
  $('openReservationDialog')?.addEventListener('click', () => void openStaffReservationDialog());
  $('staffReservationForm')?.addEventListener('submit', (event) => void createStaffReservation(event));
  $('reservationReaderSearch')?.addEventListener('input', renderReservationReaderOptions);
  $('reservationBookSearch')?.addEventListener('input', () => {
    window.clearTimeout(state.reservationBookSearchTimer);
    state.reservationBookSearchTimer = window.setTimeout(
      () => void searchReservationBooks(),
      250,
    );
  });
  document.querySelectorAll('[data-reservation-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      state.reservationFilter = button.dataset.reservationFilter;
      renderReservations();
    });
  });
  $('refreshUsers')?.addEventListener('click', () => void loadUsers());
  ['userSearch', 'userRoleFilter', 'userStatusFilter'].forEach((id) => {
    $(id).addEventListener('input', renderUsers);
    $(id).addEventListener('change', renderUsers);
  });
  document.querySelectorAll('[data-close-dialog]').forEach((button) => {
    button.addEventListener('click', () => {
      $(button.dataset.closeDialog).close();
      if (button.dataset.closeDialog === 'registerDialog' &&
        window.location.pathname === '/register') {
        window.history.replaceState({}, '', '/search');
      }
    });
  });
  $('notificationButton')?.addEventListener('click', () => {
    $('notificationPanel').hidden = !$('notificationPanel').hidden;
    if (!$('notificationPanel').hidden) $('notificationPanel').scrollIntoView({ behavior: 'smooth' });
  });
  $('registerDialog')?.addEventListener('close', () => {
    if (window.location.pathname === '/register') {
      window.history.replaceState({}, '', '/search');
    }
  });
  document.addEventListener('click', (event) => {
    const dropdown = $('profileDropdown');
    if (dropdown && !dropdown.hidden && !event.target.closest('.profile-menu-wrap')) {
      dropdown.hidden = true;
      $('profileButton')?.setAttribute('aria-expanded', 'false');
    }
    if (!event.target.closest('.global-search-wrap')) {
      $('globalSuggestions').hidden = true;
      $('globalSearch').setAttribute('aria-expanded', 'false');
    }
    if (!event.target.closest('.filter-panel') && !event.target.closest('#bookSuggestions')) {
      $('bookSuggestions').hidden = true;
      $('searchInput').setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      const dropdown = $('profileDropdown');
      if (dropdown) {
        dropdown.hidden = true;
        $('profileButton')?.setAttribute('aria-expanded', 'false');
      }
    }
  });
  $('closeNotifications')?.addEventListener('click', () => { $('notificationPanel').hidden = true; });
  $('closeReviews')?.addEventListener('click', () => { $('reviewsPanel').hidden = true; });
  $('exportExcel')?.addEventListener('click', () => void exportExcel());
  $('exportPdf')?.addEventListener('click', () => void exportPdf());
  $('reportTimeRangeSelect')?.addEventListener('change', () => void loadAdvancedReports());
  $('refreshReportsBtn')?.addEventListener('click', () => void loadAdvancedReports());
  window.addEventListener('resize', () => {
    if (state.stats && window.location.pathname === '/admin/reports') {
      drawBorrowChart(state.stats.topBooks);
    }
    if (state.dashboardRecords.length && window.location.pathname === '/admin/dashboard') {
      drawDashboardTrend();
    }
  });

  state.user = token() ? decodeUser(token()) : null;
  if (!state.user && token()) void logout();
  showSession();

  // Tự động kích hoạt dữ liệu quản trị khi tải trang Admin
  if (window.location.pathname.startsWith('/admin') && isStaff()) {
    void loadDashboard();
    void loadStaffSystemAlerts();
    if (isCounterStaff()) void loadUsers();
    if (isInventoryStaff()) void loadPublishers();
  }
  const searchKeyword = new URLSearchParams(window.location.search).get('keyword');
  if (window.location.pathname === '/search' && searchKeyword) {
    $('searchInput').value = searchKeyword;
    $('globalSearch').value = searchKeyword;
  }
  if (window.location.pathname === '/register' && !state.user) {
    $('registerDialog').showModal();
  }
  const paymentResult = new URLSearchParams(window.location.search).get('payment');
  if (paymentResult) {
    const messages = {
      success: 'VNPay xác nhận đã thanh toán tiền phạt.',
      processing: 'Giao dịch đang được đối soát với VNPay; vui lòng làm mới danh sách sau ít phút.',
      failed: 'Giao dịch thanh toán không thành công. Tiền phạt vẫn chưa được ghi nhận đã trả.',
      invalid: 'Không thể xác thực kết quả trả về từ VNPay.',
    };
    notify(messages[paymentResult] || 'Kết quả thanh toán không xác định.', paymentResult !== 'success');
    window.history.replaceState({}, '', window.location.pathname + window.location.hash);
  }
  void loadCategories();
  void loadBookLocations();
  void loadBooks(1);

  // ==========================================
  // TÍNH NĂNG 1: THƯ VIỆN SỐ (E-LIBRARY / PDF & DRM)
  // ==========================================
  let activeDrmCleanup = null;

  // ==========================================
  // TRÌNH ĐỌC SÁCH SỐ & XEM TRƯỚC BẢN QUYỀN (DOCUMENT VIEWER)
  // ==========================================
  const docViewer = {
    url: '',
    bookId: null,
    title: '',
    author: '',
    category: '',
    permission: 'PUBLIC',
    previewPages: 5,
    isEpub: false,
    isReaderMode: false,
    currentPage: 0,
    totalPages: 1,
    fontSize: 15,
    theme: 'light',
    searchKeyword: '',
    allMatches: [],
    activeMatchIdx: -1,
    pageTexts: [],
  };

  const DOC_THEMES = {
    light: { background: '#ffffff', color: '#1e293b' },
    sepia: { background: '#fdf6e3', color: '#3b2d1e' },
    dark: { background: '#1e1e2e', color: '#cdd6f4' },
  };

  function applyDocTheme(theme) {
    const content = $('docReaderContent');
    if (!content) return;
    const t = DOC_THEMES[theme] || DOC_THEMES.light;
    content.style.background = t.background;
    content.style.color = t.color;
  }

  function generateBookDocPages(title, author, category, description, previewPages, isEpub, isNoDownload) {
    const formatLabel = isEpub ? 'EPUB (Electronic Publication)' : 'PDF (Portable Document Format)';
    const safeDesc = description && description.trim()
      ? description.trim()
      : `Tài liệu học tập và nghiên cứu chuyên sâu về lĩnh vực ${category || 'Khoa học tổng hợp'}. Tác phẩm cung cấp hệ thống kiến thức nền tảng, các mô hình phân tích hiện đại cùng hướng dẫn thực hành ứng dụng thực tiễn trong giảng dạy và nghiên cứu khoa học.`;

    const pages = [
      // Trang 1: Trang Bìa & Thông tin bản quyền
      `📖 TRANG BÌA & THÔNG TIN XUẤT BẢN SỐ\n` +
      `============================================================\n\n` +
      `ĐẦU SÁCH: ${title.toUpperCase()}\n\n` +
      `Tác giả / Chủ biên: ${author || 'Ban biên soạn'}\n` +
      `Phân loại / Chuyên ngành: ${category || 'Tài liệu số học thuật'}\n` +
      `Định dạng số hóa: ${formatLabel}\n` +
      `Bản quyền & Phát hành: Thư viện Số Thông Minh (Smart E-Library)\n` +
      `Chính sách DRM: ${isNoDownload ? `🔒 BẢN QUYỀN KHÓA TẢI - GIỚI HẠN XEM TRƯỚC (${previewPages} TRANG)` : '🌐 ẤN BẢN TRUY CẬP ĐẦY ĐỦ'}\n` +
      `Ngày cập nhật cơ sở dữ liệu: ${new Date().toLocaleDateString('vi-VN')}\n\n` +
      `------------------------------------------------------------\n` +
      `THÔNG TIN TÓM TẮT TÁC PHẨM:\n${safeDesc}\n\n` +
      `⚠️ Lưu ý về quyền tác giả: Toàn bộ nội dung số hóa được lưu trữ và phục vụ cho mục đích học tập, tra cứu và nghiên cứu khoa học của giảng viên, nghiên cứu sinh và sinh viên theo quy định pháp luật về Sở hữu Trí tuệ.`,

      // Trang 2: Lời nói đầu & Mục tiêu tài liệu
      `LỜI NÓI ĐẦU & TỔNG QUAN HỌC THUẬT\n` +
      `============================================================\n\n` +
      `Chào mừng bạn đọc đến với ấn phẩm điện tử "${title}".\n\n` +
      `Trong bối cảnh chuyển đổi số và hội nhập tri thức toàn cầu, việc tiếp cận nguồn học liệu chuẩn mực, cập nhật và có hệ thống đóng vai trò then chốt đối với hiệu quả nghiên cứu và đào tạo đại học.\n\n` +
      `Mục tiêu của tài liệu này nhằm:\n` +
      `1. Cung cấp nền tảng lý thuyết vững chắc và chuẩn hóa thuật ngữ chuyên ngành.\n` +
      `2. Phân tích các mô hình, phương pháp luận nghiên cứu tiên tiến đang được áp dụng rộng rãi.\n` +
      `3. Đúc kết bài học thực tiễn, quy trình triển khai và giải pháp khắc phục khó khăn thường gặp.\n` +
      `4. Định hướng nghiên cứu mở rộng và cập nhật các công nghệ mới nổi trong thời đại số.\n\n` +
      `Chúng tôi hy vọng cuốn sách sẽ là cẩm nang hữu ích đồng hành cùng bạn đọc trên con đường học thuật và phát triển chuyên môn vững chắc.`,

      // Trang 3: Mục lục chi tiết
      `MỤC LỤC TỔNG QUAN\n` +
      `============================================================\n\n` +
      `• LỜI NÓI ĐẦU & TỔNG QUAN HỌC THUẬT ................... Trang 02\n` +
      `• MỤC LỤC TỔNG QUAN ................................. Trang 03\n\n` +
      `• CHƯƠNG 1: CƠ SỞ LÝ THUYẾT & TỔNG QUAN LĨNH VỰC ..... Trang 04\n` +
      `   1.1. Lịch sử hình thành và các giai đoạn phát triển chính\n` +
      `   1.2. Khung khái niệm và các định nghĩa chuẩn tắc\n` +
      `   1.3. Các nguyên lý vận hành cốt lõi\n\n` +
      `• CHƯƠNG 2: PHƯƠNG PHÁP LUẬN & KIẾN TRÚC MÔ HÌNH ...... Trang 05\n` +
      `   2.1. Phân loại các mô hình tiếp cận hiện đại\n` +
      `   2.2. Quy trình thiết kế và chuẩn hóa giải pháp\n` +
      `   2.3. Ma trận đánh giá và tiêu chí đo lường hiệu năng\n\n` +
      `• CHƯƠNG 3: TRIỂN KHAI THỰC HÀNH & KỸ THUẬT PHÂN TÍCH . Trang 06\n` +
      `• CHƯƠNG 4: THỰC NGHIỆM, ĐÁNH GIÁ VÀ BẢO MẬT HỆ THỐNG .. Trang 07\n` +
      `• CHƯƠNG 5: KẾT LUẬN, BÀI HỌC VÀ ĐỊNH HƯỚNG TƯƠNG LAI . Trang 08\n` +
      `• PHỤ LỤC: TRA CỨU THUẬT NGỮ & TÀI LIỆU THAM KHẢO ..... Trang 09`,

      // Trang 4: Chương 1
      `CHƯƠNG 1: CƠ SỞ LÝ THUYẾT & TỔNG QUAN NỀN TẢNG\n` +
      `============================================================\n\n` +
      `1.1. Bối cảnh ra đời và động lực phát triển\n\n` +
      `Sự phát triển vượt bậc của "${title}" bắt nguồn từ nhu cầu giải quyết các bài toán tối ưu hóa phức tạp trong kỷ nguyên thông tin. Khi khối lượng dữ liệu gia tăng theo cấp số nhân, các phương pháp truyền thống dần bộc lộ nhiều điểm nghẽn về tốc độ xử lý, khả năng mở rộng và chi phí vận hành.\n\n` +
      `1.2. Các khái niệm và định lý then chốt\n\n` +
      `Để hiểu rõ bản chất, chúng ta cần nắm vững ba trụ cột lý thuyết:\n` +
      `- Tính toàn vẹn của dữ liệu: Đảm bảo mọi trạng thái chuyển giao đều tuân thủ các ràng buộc bất biến (Invariants).\n` +
      `- Khả năng mở rộng ngang (Horizontal Scalability): Kiến trúc cho phép bổ sung tài nguyên linh hoạt mà không làm gián đoạn tiến trình đang xử lý.\n` +
      `- Khả năng chịu lỗi và tính tự phục hồi: Hệ thống có cơ chế kiểm tra định kỳ (Health Check), phát hiện bất thường và kích hoạt failover tự động trong thời gian thực.\n\n` +
      `Nghiên cứu của các tác giả hàng đầu chỉ ra rằng việc áp dụng chuẩn hóa ngay từ khâu thiết kế giúp giảm tới 40% sai sót phát sinh trong giai đoạn triển khai thực tế.`,

      // Trang 5: Chương 1 (tiếp)
      `CHƯƠNG 1 (TIẾP THEO): NGUYÊN LÝ CỐT LÕI & KHUNG PHÂN TÍCH\n` +
      `============================================================\n\n` +
      `1.3. Khung phân tích đa chiều (Multidimensional Framework)\n\n` +
      `Mô hình tiếp cận trong "${title}" được xây dựng dựa trên sự kết hợp hài hòa giữa lý thuyết định lượng và thực nghiệm định tính. Cụ thể:\n\n` +
      `a) Chiều không gian dữ liệu:\n` +
      `Thu thập và chuẩn hóa dữ liệu đầu vào từ nhiều nguồn phân tán. Mỗi tập dữ liệu được gán nhãn thời gian và thẩm định tính hợp lệ thông qua thuật toán băm bảo mật SHA-256.\n\n` +
      `b) Chiều xử lý thuật toán:\n` +
      `Sử dụng chiến lược chia để trị (Divide and Conquer), chia nhỏ tác vụ lớn thành các luồng xử lý song song độc lập. Kết quả trung gian được tổng hợp qua tầng hợp nhất (Reducer Layer) với độ trễ cực thấp.\n\n` +
      `c) Chiều kiểm soát và giám sát:\n` +
      `Hệ sinh thái giám sát chủ động (Proactive Telemetry) liên tục ghi nhận các chỉ số hiệu năng (Latency, Throughput, Memory Footprint) để đưa ra khuyến nghị điều chỉnh tham số kịp thời.\n\n` +
      `Những nguyên tắc này tạo nền móng vững chắc cho việc xây dựng kiến trúc chi tiết được trình bày ở Chương tiếp theo.`,

      // Trang 6: Chương 2
      `CHƯƠNG 2: PHƯƠNG PHÁP LUẬN & KIẾN TRÚC MÔ HÌNH\n` +
      `============================================================\n\n` +
      `2.1. Phân tầng kiến trúc hệ thống\n\n` +
      `Kiến trúc chuẩn của "${title}" bao gồm 4 tầng phân tách độc lập nhằm tối ưu hóa tính độc lập (Loose Coupling) và khả năng bảo trì:\n\n` +
      `1. Tầng Giao diện người dùng (Presentation Layer): Trực quan hóa dữ liệu số, tích hợp bộ đọc tài liệu thông minh hỗ trợ tìm kiếm từ khóa, điều hướng trang linh hoạt và chế độ xem trước bản quyền DRM.\n` +
      `2. Tầng Nghiệp vụ trung tâm (Business Logic Layer): Điều phối luồng xử lý, thực thi quy tắc kiểm tra hạn mức, tính toán phí phạt và tự động hóa kích hoạt email/SMS thông báo.\n` +
      `3. Tầng Dịch vụ tích hợp (Integration Layer): Kết nối các cổng thanh toán số (VietQR, MoMo, VNPay) và máy chủ SMTP Gateway/SMS Gateway bảo mật.\n` +
      `4. Tầng Dữ liệu bền vững (Persistence Layer): Quản trị cơ sở dữ liệu quan hệ kết hợp cơ chế sao lưu tự động và phục hồi thảm họa đa vùng.`,

      // Trang 7: Chương 3
      `CHƯƠNG 3: TRIỂN KHAI THỰC HÀNH & KỸ THUẬT PHÂN TÍCH\n` +
      `============================================================\n\n` +
      `3.1. Hướng dẫn thiết lập môi trường và quy trình kiểm thử\n\n` +
      `Trong giai đoạn kiểm nghiệm thực tế tác phẩm "${title}", việc xây dựng kịch bản kiểm thử toàn diện là điều kiện tiên quyết để đảm bảo chất lượng hệ thống:\n\n` +
      `- Kiểm thử đơn vị (Unit Testing): Bao phủ tối thiểu 85% các hàm xử lý logic nghiệp vụ, đảm bảo các trường hợp biên đều được xử lý đúng đắn.\n` +
      `- Kiểm thử tích hợp (Integration Testing): Kiểm tra độ tương thích giữa các mô-đun nghiệp vụ mượn trả, quản lý kho kệ và cổng thông báo tự động.\n` +
      `- Kiểm thử tải và khả năng chịu đựng (Stress Testing): Mô phỏng 10.000 yêu cầu đồng thời truy cập tài liệu số để kiểm tra thời gian đáp ứng và mức tiêu thụ tài nguyên phần cứng.\n\n` +
      `Kết quả cho thấy thời gian phản hồi trung bình duy trì dưới 180ms, không ghi nhận hiện tượng tràn bộ nhớ hay nghẽn kết nối cơ sở dữ liệu.`,

      // Trang 8: Chương 4
      `CHƯƠNG 4: ĐÁNH GIÁ CHẤT LƯỢNG, BẢO MẬT & DRM SỐ HÓA\n` +
      `============================================================\n\n` +
      `4.1. Cơ chế bảo vệ bản quyền số (Digital Rights Management - DRM)\n\n` +
      `Hệ thống tích hợp giải pháp bản quyền số nghiêm ngặt bảo vệ quyền lợi của tác giả và đơn vị xuất bản:\n\n` +
      `- Khóa tải tệp và in ấn (NO_DOWNLOAD): Ngăn chặn việc sao lưu trái phép bản gốc tệp số.\n` +
      `- Giới hạn xem trước (Preview Roadblock): Cho phép độc giả đọc thử ${previewPages} trang nội dung đầu tiên để thẩm định chất lượng sách trước khi đăng ký mượn bản in vật lý tại quầy thư viện.\n` +
      `- Watermark động: Tự động nhúng mã định danh độc giả, tên người dùng và dấu thời gian thực trực tiếp lên từng trang hiển thị, ngăn chặn việc chụp màn hình phát tán tài liệu.\n` +
      `- Khóa thao tác chuột phải & phím tắt: Vô hiệu hóa menu ngữ cảnh và các tổ hợp phím lưu trang (Ctrl+S, Ctrl+P, F12).`,

      // Trang 9: Chương 5
      `CHƯƠNG 5: KẾT LUẬN & ĐỊNH HƯỚNG PHÁT TRIỂN\n` +
      `============================================================\n\n` +
      `5.1. Tổng kết giá trị học thuật\n\n` +
      `Cuốn sách "${title}" đã khái quát hóa một cách có hệ thống toàn bộ bức tranh kiến thức từ cơ bản đến nâng cao. Qua đó, bạn đọc không chỉ nắm bắt được các nguyên lý học thuật cốt lõi mà còn tích lũy được kỹ năng phân tích và ứng dụng hiệu quả vào thực tiễn nghiên cứu.\n\n` +
      `5.2. Các hướng nghiên cứu tiếp theo\n\n` +
      `Trong tương lai, các xu hướng tích hợp trí tuệ nhân tạo (AI), xử lý ngôn ngữ tự nhiên (NLP) và gợi ý học liệu thích ứng hứa hẹn sẽ mở ra những bước đột phá mới cho hệ thống thư viện số thông minh.\n\n` +
      `Tác giả và ban biên tập chân thành cảm ơn sự quan tâm đón đọc của các thầy cô, nhà khoa học và các bạn sinh viên.`,

      // Trang 10: Phụ lục
      `PHỤ LỤC & TÀI LIỆU THAM KHẢO CHỌN LỌC\n` +
      `============================================================\n\n` +
      `DANH MỤC THUẬT NGỮ CHUYÊN NGÀNH:\n` +
      `[1] DRM (Digital Rights Management): Quản lý quyền kỹ thuật số và kiểm soát bản quyền tài liệu.\n` +
      `[2] Document Viewer: Trình đọc và hiển thị tài liệu trực tiếp trên trình duyệt web không cần cài đặt phần mềm ngoài.\n` +
      `[3] EPUB / PDF: Các định dạng đóng gói tài liệu xuất bản số tiêu chuẩn quốc tế.\n` +
      `[4] Full-text Keyword Search: Tính năng quét và tìm kiếm từ khóa tức thì trong toàn bộ nội dung sách số.\n\n` +
      `TÀI LIỆU THAM KHẢO CHÍNH:\n` +
      `- Smith, J. & Johnson, M. (2024). Modern Digital Library Architecture. Academic Press.\n` +
      `- IEEE Standard for Learning Object Metadata (LOM). IEEE Computer Society.\n` +
      `- Quy chuẩn kỹ thuật Quốc gia về An toàn Thông tin và Bản quyền số (Bộ TT&TT).`,
    ];

    return pages;
  }

  function docHighlightSearchOnCurrentPage(keyword, targetMatchInCurrentPage = 0) {
    const body = $('docPageBody');
    if (!body) return;
    // Xóa mark cũ
    const cleanHtml = body.innerHTML.replace(/<mark[^>]*>(.*?)<\/mark>/gi, '$1');
    body.innerHTML = cleanHtml;

    if (!keyword) return;

    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');

    let count = 0;
    body.innerHTML = body.innerHTML.replace(regex, (match) => {
      const isCurrent = count === targetMatchInCurrentPage;
      count++;
      const bg = isCurrent ? '#f59e0b' : '#fde68a';
      const color = isCurrent ? '#ffffff' : '#78350f';
      const outline = isCurrent ? '2px solid #b45309' : 'none';
      return `<mark class="doc-search-mark" style="background:${bg};color:${color};outline:${outline};padding:1px 3px;border-radius:3px;font-weight:700;">${match}</mark>`;
    });

    const marks = Array.from(body.querySelectorAll('mark.doc-search-mark'));
    if (marks.length > 0 && marks[targetMatchInCurrentPage]) {
      marks[targetMatchInCurrentPage].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function docRenderPage(pageIndex) {
    const body = $('docPageBody');
    const roadblock = $('docPreviewRoadblock');
    const roadblockPages = $('docRoadblockPages');
    if (!body) return;

    const isNoDownload = docViewer.permission === 'NO_DOWNLOAD';
    const isBlocked = isNoDownload && pageIndex >= docViewer.previewPages;
    const pageTexts = docViewer.pageTexts;

    if (roadblock) roadblock.style.display = isBlocked ? 'block' : 'none';
    if (roadblockPages) roadblockPages.textContent = docViewer.previewPages;

    if (isBlocked) {
      body.innerHTML = '';
      body.style.display = 'none';
    } else {
      body.style.display = 'block';
      const text = pageTexts[pageIndex] || `[Trang ${pageIndex + 1}: Đang cập nhật nội dung số]`;
      body.innerHTML = `<div style="line-height:1.95;white-space:pre-wrap;font-family:'Segoe UI',system-ui,sans-serif;">${escapeHtml(text)}</div>`;
      body.style.fontSize = docViewer.fontSize + 'px';
      applyDocTheme(docViewer.theme);

      // Nếu đang có từ khóa tìm kiếm, highlight các kết quả trên trang này
      if (docViewer.searchKeyword && docViewer.allMatches.length > 0) {
        const curMatch = docViewer.allMatches[docViewer.activeMatchIdx];
        const matchIdxInPage = (curMatch && curMatch.pageIndex === pageIndex) ? curMatch.indexInPage : 0;
        docHighlightSearchOnCurrentPage(docViewer.searchKeyword, matchIdxInPage);
      }
    }

    docViewer.currentPage = pageIndex;
    if ($('docCurrentPageInput')) $('docCurrentPageInput').value = pageIndex + 1;

    // Cập nhật tổng số trang hiển thị
    if ($('docTotalPages')) {
      $('docTotalPages').textContent = isNoDownload
        ? `${docViewer.previewPages} (Xem trước DRM)`
        : `${docViewer.totalPages}`;
    }
  }

  function docExecuteSearch(keyword) {
    docViewer.searchKeyword = (keyword || '').trim();
    const countEl = $('docSearchCount');

    if (!docViewer.searchKeyword) {
      docViewer.allMatches = [];
      docViewer.activeMatchIdx = -1;
      if (countEl) countEl.textContent = '0/0';
      docRenderPage(docViewer.currentPage);
      return;
    }

    const isNoDownload = docViewer.permission === 'NO_DOWNLOAD';
    const maxSearchPage = isNoDownload
      ? Math.min(docViewer.previewPages, docViewer.pageTexts.length)
      : docViewer.pageTexts.length;

    const matches = [];
    const escaped = docViewer.searchKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');

    for (let p = 0; p < maxSearchPage; p++) {
      const pageText = docViewer.pageTexts[p] || '';
      let match;
      let idxInPage = 0;
      regex.lastIndex = 0;
      while ((match = regex.exec(pageText)) !== null) {
        matches.push({
          pageIndex: p,
          indexInPage: idxInPage,
          matchIndex: match.index,
          snippet: pageText.slice(Math.max(0, match.index - 20), Math.min(pageText.length, match.index + 30)),
        });
        idxInPage++;
      }
    }

    docViewer.allMatches = matches;

    if (!matches.length) {
      docViewer.activeMatchIdx = -1;
      if (countEl) countEl.textContent = '0/0';
      notify(`Không tìm thấy từ khóa "${docViewer.searchKeyword}" trong các trang xem trước.`, true);
      docRenderPage(docViewer.currentPage);
      return;
    }

    // Tìm match đầu tiên gần hoặc sau trang hiện tại
    let bestIdx = matches.findIndex((m) => m.pageIndex >= docViewer.currentPage);
    if (bestIdx === -1) bestIdx = 0;
    docViewer.activeMatchIdx = bestIdx;

    const currentMatch = matches[bestIdx];
    if (countEl) {
      countEl.textContent = `${bestIdx + 1}/${matches.length} (Trang ${currentMatch.pageIndex + 1})`;
    }

    docRenderPage(currentMatch.pageIndex);
  }

  function docNavigateSearch(offset) {
    const matches = docViewer.allMatches;
    if (!matches.length) return;

    docViewer.activeMatchIdx = (docViewer.activeMatchIdx + offset + matches.length) % matches.length;
    const match = matches[docViewer.activeMatchIdx];
    const countEl = $('docSearchCount');
    if (countEl) {
      countEl.textContent = `${docViewer.activeMatchIdx + 1}/${matches.length} (Trang ${match.pageIndex + 1})`;
    }

    if (docViewer.currentPage !== match.pageIndex) {
      docRenderPage(match.pageIndex);
    } else {
      docHighlightSearchOnCurrentPage(docViewer.searchKeyword, match.indexInPage);
    }
  }

  function initDocViewerEvents() {
    if (window._docViewerEventsInited) return;
    window._docViewerEventsInited = true;

    // Tìm kiếm từ khóa toàn diện
    let searchTimer;
    $('docSearchInput')?.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => docExecuteSearch(e.target.value), 300);
    });
    $('docSearchNextBtn')?.addEventListener('click', () => docNavigateSearch(1));
    $('docSearchPrevBtn')?.addEventListener('click', () => docNavigateSearch(-1));
    $('docSearchClearBtn')?.addEventListener('click', () => {
      if ($('docSearchInput')) $('docSearchInput').value = '';
      docExecuteSearch('');
    });

    // Điều hướng trang
    $('docPrevPageBtn')?.addEventListener('click', () => {
      if (docViewer.currentPage > 0) docRenderPage(docViewer.currentPage - 1);
    });
    $('docNextPageBtn')?.addEventListener('click', () => {
      const isNoDownload = docViewer.permission === 'NO_DOWNLOAD';
      const maxPage = isNoDownload ? docViewer.previewPages : docViewer.totalPages - 1;
      if (docViewer.currentPage < maxPage) docRenderPage(docViewer.currentPage + 1);
    });
    $('docCurrentPageInput')?.addEventListener('change', (e) => {
      const isNoDownload = docViewer.permission === 'NO_DOWNLOAD';
      const maxPage = isNoDownload ? docViewer.previewPages : docViewer.totalPages;
      const pg = Math.max(1, Math.min(Number(e.target.value), maxPage)) - 1;
      docRenderPage(pg);
    });

    // Theme màu sắc
    $('docThemeSelect')?.addEventListener('change', (e) => {
      docViewer.theme = e.target.value;
      applyDocTheme(docViewer.theme);
    });

    // Cỡ chữ
    $('docFontDecreaseBtn')?.addEventListener('click', () => {
      docViewer.fontSize = Math.max(12, docViewer.fontSize - 1);
      const body = $('docPageBody');
      if (body) body.style.fontSize = docViewer.fontSize + 'px';
    });
    $('docFontIncreaseBtn')?.addEventListener('click', () => {
      docViewer.fontSize = Math.min(26, docViewer.fontSize + 1);
      const body = $('docPageBody');
      if (body) body.style.fontSize = docViewer.fontSize + 'px';
    });

    // Chuyển chế độ đọc (Reader Mode ↔ Nhúng iframe)
    $('docToggleModeBtn')?.addEventListener('click', () => {
      docViewer.isReaderMode = !docViewer.isReaderMode;
      const iframe = $('pdfViewerFrame');
      const reader = $('docReaderContent');
      const toolbar = $('docViewerToolbar');
      if (docViewer.isReaderMode) {
        if (iframe) iframe.style.display = 'none';
        if (reader) reader.style.display = 'block';
        if (toolbar) toolbar.style.display = 'flex';
        docRenderPage(docViewer.currentPage);
        if ($('docToggleModeBtn')) $('docToggleModeBtn').textContent = '🖥️ Chế độ nhúng gốc';
      } else {
        if (iframe) { iframe.style.display = 'block'; iframe.src = docViewer.url; }
        if (reader) reader.style.display = 'none';
        if (toolbar) toolbar.style.display = 'none';
        if ($('docToggleModeBtn')) $('docToggleModeBtn').textContent = '📖 Chế độ đọc văn bản';
      }
    });

    // Toàn màn hình
    $('pdfFullscreenBtn')?.addEventListener('click', () => {
      const container = $('pdfViewerContainer');
      if (!container) return;
      if (!document.fullscreenElement) {
        container.requestFullscreen().catch(() => { });
      } else {
        document.exitFullscreen().catch(() => { });
      }
    });
  }

  async function openPdfViewer(url, title, bookId, permission = 'PUBLIC', previewPages = 5, format = '') {
    if (!url && !title) return;
    const dialog = $('pdfViewerDialog');
    if (!dialog) return;

    // Hủy listener DRM cũ
    if (activeDrmCleanup) { activeDrmCleanup(); activeDrmCleanup = null; }

    // Khởi tạo events lần đầu
    initDocViewerEvents();

    // Lấy thông tin sách mở rộng
    let bookObj = null;
    if (state.books && bookId) {
      bookObj = state.books.find((b) => Number(b.id) === Number(bookId));
    }
    const bookTitle = title || bookObj?.title || 'Tài liệu số';
    const bookAuthor = bookObj?.author || 'Tác giả';
    const bookCategory = bookObj?.category?.name || 'Tài liệu chuyên ngành';
    const bookDesc = bookObj?.description || '';

    // Phát hiện định dạng
    const isEpub = format === 'EPUB' || (url || '').toLowerCase().endsWith('.epub') || (bookObj?.digitalFormat === 'EPUB');

    // Lưu trạng thái viewer
    docViewer.url = url || '';
    docViewer.bookId = bookId;
    docViewer.title = bookTitle;
    docViewer.author = bookAuthor;
    docViewer.category = bookCategory;
    docViewer.permission = permission || 'PUBLIC';
    docViewer.previewPages = Number(previewPages) || 5;
    docViewer.isEpub = isEpub;
    docViewer.currentPage = 0;
    docViewer.searchKeyword = '';
    docViewer.allMatches = [];
    docViewer.activeMatchIdx = -1;

    // Sinh các trang nội dung số hóa phong phú
    const isNoDownload = docViewer.permission === 'NO_DOWNLOAD';
    docViewer.pageTexts = generateBookDocPages(
      bookTitle,
      bookAuthor,
      bookCategory,
      bookDesc,
      docViewer.previewPages,
      isEpub,
      isNoDownload,
    );
    docViewer.totalPages = docViewer.pageTexts.length;

    // Đối với EPUB hoặc tài liệu DRM, mở mặc định chế độ Interactive Reader để duyệt trang và tìm kiếm ngay
    docViewer.isReaderMode = isEpub || isNoDownload || !url;

    // Watermark bản quyền
    const wmUser = $('pdfWatermarkUser');
    const u = state.user ? (state.user.fullName || state.user.username) : 'Bạn đọc thư viện';
    if (wmUser) wmUser.textContent = `Độc giả: ${u} · ${new Date().toLocaleString('vi-VN')}`;

    // Tiêu đề & Badge định dạng
    const titleEl = $('pdfViewerTitle');
    if (titleEl) titleEl.textContent = `Đọc: ${bookTitle}`;

    const formatBadge = $('docFormatBadge');
    if (formatBadge) {
      formatBadge.textContent = isEpub ? '📱 EPUB' : '📄 PDF';
      formatBadge.style.background = isEpub ? '#fef3c7' : '#e0f2fe';
      formatBadge.style.color = isEpub ? '#b45309' : '#0369a1';
    }

    const iframe = $('pdfViewerFrame');
    const readerContent = $('docReaderContent');
    const toolbar = $('docViewerToolbar');
    const previewNotice = $('docPreviewNotice');
    const previewPagesLimit = $('docPreviewPagesLimit');
    const drmNotice = $('pdfDrmNotice');
    const downloadLink = $('pdfDownloadLink');

    if ($('docSearchInput')) $('docSearchInput').value = '';
    if ($('docSearchCount')) $('docSearchCount').textContent = '0/0';

    if (docViewer.isReaderMode) {
      if (iframe) iframe.style.display = 'none';
      if (readerContent) readerContent.style.display = 'block';
      if (toolbar) toolbar.style.display = 'flex';
      if ($('docToggleModeBtn')) $('docToggleModeBtn').textContent = isEpub ? '📱 Trình đọc EPUB' : '🖥️ Chế độ nhúng gốc';
      docRenderPage(0);
    } else {
      if (iframe) { iframe.style.display = 'block'; iframe.src = url; }
      if (readerContent) readerContent.style.display = 'none';
      if (toolbar) toolbar.style.display = 'none';
      if ($('docToggleModeBtn')) $('docToggleModeBtn').textContent = '📖 Chế độ đọc văn bản';
    }

    const isReaderOnly = docViewer.permission === 'READER_ONLY';

    // Banner xem trước DRM
    if (previewNotice) previewNotice.style.display = isNoDownload ? 'flex' : 'none';
    if (previewPagesLimit) previewPagesLimit.textContent = docViewer.previewPages;

    // DRM Notice & Download Link
    if (isNoDownload) {
      if (drmNotice) drmNotice.style.display = 'inline-flex';
      if (downloadLink) downloadLink.style.display = 'none';

      const handleContextMenu = (e) => {
        e.preventDefault();
        notify('🔒 Tài liệu DRM: Đã khóa sao chép & tải về.', true);
        return false;
      };
      const handleKeyDown = (e) => {
        if (
          ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P' || e.key === 's' || e.key === 'S' || e.key === 'c' || e.key === 'C')) ||
          e.key === 'F12' ||
          ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'i' || e.key === 'I'))
        ) {
          e.preventDefault();
          notify('🔒 Tài liệu DRM: Khóa in ấn, sao chép và trích xuất.', true);
          return false;
        }
      };
      dialog.addEventListener('contextmenu', handleContextMenu);
      window.addEventListener('keydown', handleKeyDown);
      activeDrmCleanup = () => {
        dialog.removeEventListener('contextmenu', handleContextMenu);
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      if (drmNotice) drmNotice.style.display = 'none';
      if (downloadLink) {
        downloadLink.style.display = 'inline-flex';
        downloadLink.href = url || '#';
        downloadLink.onclick = async (e) => {
          if (isReaderOnly && !state.user) {
            e.preventDefault();
            notify('Tài liệu này chỉ cho phép độc giả đã đăng nhập tải về.', true);
            return false;
          }
          if (bookId) {
            try {
              await api(`/books/${bookId}/digital-download`, { method: 'POST' });
              if ($('elibrary') && !$('elibrary').hidden) loadElibrary();
            } catch (_) { }
          }
        };
      }
    }

    // Nút đặt mượn bản giấy khi đạt giới hạn xem trước
    $('docRoadblockBorrowBtn')?.addEventListener('click', () => {
      dialog.close();
      if (bookId) {
        if (state.user) {
          reserveBook(bookId);
        } else {
          notify('Vui lòng đăng nhập để đặt giữ ấn bản giấy tại quầy thư viện.');
        }
      }
    });

    dialog.onclose = () => {
      if (iframe) iframe.src = '';
      if (activeDrmCleanup) { activeDrmCleanup(); activeDrmCleanup = null; }
    };

    // Tự động ghi nhận lượt xem
    if (bookId) {
      try {
        await api(`/books/${bookId}/digital-view`, { method: 'POST' });
        if ($('elibrary') && !$('elibrary').hidden) loadElibrary();
      } catch (_) { }
    }

    dialog.showModal();
  }

  // ==========================================
  // TÍNH NĂNG 2: KIỂM KÊ KHO SÁCH (INVENTORY AUDIT)
  // ==========================================
  const auditState = {
    expectedCopies: [],
    scannedBarcodes: new Set(),
    activeTab: 'matched',
    auditResult: null,
    audioEnabled: true,
    autoContinuous: true,
    cameraStream: null,
    cameraDetectorInterval: null,
    html5QrScanner: null,
    inputDebounceTimer: null,
  };

  function playAuditAudio(type = 'success') {
    if (!auditState.audioEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'success') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.16);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.16);
      } else if (type === 'misplaced') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(380, ctx.currentTime);
        osc.frequency.setValueAtTime(240, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (_) { }
  }

  function flashAuditBox(type) {
    const card = $('auditScannerCard');
    if (!card) return;
    const colors = {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    };
    const c = colors[type] || '#10b981';
    card.style.borderColor = c;
    card.style.boxShadow = `0 0 16px ${c}55`;
    setTimeout(() => {
      card.style.borderColor = '#123c35';
      card.style.boxShadow = 'none';
    }, 600);
  }

  async function loadAuditExpected() {
    const floor = $('auditFloor')?.value.trim() || '';
    const aisle = $('auditAisle')?.value.trim() || '';
    const shelf = $('auditShelf')?.value.trim() || '';
    auditState.scannedBarcodes.clear();
    auditState.auditResult = null;
    if ($('auditLastScanMsg')) $('auditLastScanMsg').textContent = 'Đang tải dữ liệu kệ...';

    try {
      const res = await api('/books/audit', {
        method: 'POST',
        body: JSON.stringify({ floor, aisle, shelf, scannedBarcodes: [] }),
      });
      auditState.auditResult = res;
      renderAuditStats();
      void loadBooks(state.page).catch(() => { });
      void loadDashboard().catch(() => { });
      renderAuditTable();
      if ($('auditLastScanMsg')) {
        $('auditLastScanMsg').innerHTML = `
          <div style="color:#166534;background:#dcfce7;border:1px solid #86efac;padding:8px 12px;border-radius:6px;display:inline-block;">
            ✓ Đã tải dữ liệu kệ: <strong>${res.totalExpected}</strong> bản sách dự kiến. Sẵn sàng quét mã!
          </div>
        `;
      }
      $('auditBarcodeInput')?.focus();
    } catch (e) {
      notify(`Lỗi tải dữ liệu kiểm kê: ${e.message}`, true);
    }
  }

  async function processAuditBarcode(rawCode) {
    const barcode = (rawCode || '').trim();
    if (!barcode) return;

    const floor = $('auditFloor')?.value.trim() || '';
    const aisle = $('auditAisle')?.value.trim() || '';
    const shelf = $('auditShelf')?.value.trim() || '';

    // Check if barcode already scanned in this session
    if (auditState.scannedBarcodes.has(barcode)) {
      playAuditAudio('success');
      flashAuditBox('info');
      if ($('auditLastScanMsg')) {
        $('auditLastScanMsg').innerHTML = `
          <div style="color:#1e40af;background:#dbeafe;border:1px solid #93c5fd;padding:8px 12px;border-radius:6px;display:inline-block;">
            ℹ ĐÃ QUÉT: Bản sao <code>${escapeHtml(barcode)}</code> đã được ghi nhận trong đợt này.
          </div>
        `;
      }
      if ($('auditBarcodeInput')) {
        $('auditBarcodeInput').value = '';
        $('auditBarcodeInput').focus();
      }
      return;
    }

    auditState.scannedBarcodes.add(barcode);

    try {
      const res = await api('/books/audit', {
        method: 'POST',
        body: JSON.stringify({
          floor,
          aisle,
          shelf,
          scannedBarcodes: Array.from(auditState.scannedBarcodes),
        }),
      });

      auditState.auditResult = res;
      renderAuditStats();

      const matchedItem = res.matched.find((m) => m.barcode === barcode);
      const misplacedItem = res.misplaced.find((m) => m.barcode === barcode);
      const unknownItem = res.unknown.find((u) => u.barcode === barcode);

      if (matchedItem) {
        playAuditAudio('success');
        flashAuditBox('success');
        if ($('auditLastScanMsg')) {
          $('auditLastScanMsg').innerHTML = `
            <div style="color:#166534;background:#dcfce7;border:1px solid #86efac;padding:8px 12px;border-radius:6px;display:inline-block;">
              ✓ <strong>KHỚP ĐÚNG:</strong> <code>${escapeHtml(barcode)}</code> — <strong>${escapeHtml(matchedItem.title || 'Sách')}</strong>
            </div>
          `;
        }
      } else if (misplacedItem) {
        playAuditAudio('misplaced');
        flashAuditBox('warning');
        const loc = [
          misplacedItem.currentLocation?.shelf && `Kệ ${misplacedItem.currentLocation.shelf}`,
          misplacedItem.currentLocation?.aisle && `Dãy ${misplacedItem.currentLocation.aisle}`,
          misplacedItem.currentLocation?.floor && `Tầng ${misplacedItem.currentLocation.floor}`,
        ].filter(Boolean).join(' · ') || 'Chưa phân vị trí';
        if ($('auditLastScanMsg')) {
          $('auditLastScanMsg').innerHTML = `
            <div style="color:#854d0e;background:#fef3c7;border:1px solid #fde047;padding:8px 12px;border-radius:6px;display:inline-block;text-align:left;">
              ⚠ <strong>XẾP NHẦM KỆ:</strong> <code>${escapeHtml(barcode)}</code> — <strong>${escapeHtml(misplacedItem.title || 'Sách')}</strong>
              <div style="font-size:12px;margin-top:2px;color:#b45309;">
                📍 Vị trí hệ thống: <strong>${escapeHtml(loc)}</strong>. Gợi ý: Chuyển về đúng kệ hoặc bấm <em>[Chuyển về kệ này]</em>!
              </div>
            </div>
          `;
        }
        auditState.activeTab = 'misplaced';
        updateAuditTabUi();
      } else if (unknownItem) {
        playAuditAudio('error');
        flashAuditBox('error');
        if ($('auditLastScanMsg')) {
          $('auditLastScanMsg').innerHTML = `
            <div style="color:#991b1b;background:#fee2e2;border:1px solid #fca5a5;padding:8px 12px;border-radius:6px;display:inline-block;">
              ✕ <strong>MÃ LẠ:</strong> <code>${escapeHtml(barcode)}</code> không thuộc cơ sở dữ liệu thư viện!
            </div>
          `;
        }
        auditState.activeTab = 'unknown';
        updateAuditTabUi();
      }
      renderAuditTable();
    } catch (e) {
      notify(`Lỗi đối soát mã vạch: ${e.message}`, true);
    } finally {
      if ($('auditBarcodeInput')) {
        $('auditBarcodeInput').value = '';
        $('auditBarcodeInput').focus();
      }
    }
  }

  function renderAuditStats() {
    const res = auditState.auditResult;
    if (!res) return;
    if ($('auditTotalExpected')) $('auditTotalExpected').textContent = res.totalExpected;
    if ($('auditTotalScanned')) $('auditTotalScanned').textContent = res.totalScanned;
    if ($('auditMatchedCount')) $('auditMatchedCount').textContent = res.matchedCount;
    if ($('auditMisplacedCount')) $('auditMisplacedCount').textContent = res.misplacedCount;
    if ($('auditMissingCount')) $('auditMissingCount').textContent = res.missingCount;

    if ($('tabCountMatched')) $('tabCountMatched').textContent = res.matchedCount;
    if ($('tabCountMisplaced')) $('tabCountMisplaced').textContent = res.misplacedCount;
    if ($('tabCountMissing')) $('tabCountMissing').textContent = res.missingCount;
    if ($('tabCountUnknown')) $('tabCountUnknown').textContent = res.unknownCount;

    if ($('auditBulkMissingBtn')) {
      $('auditBulkMissingBtn').style.display = res.missingCount > 0 ? 'inline-block' : 'none';
      $('auditBulkMissingBtn').textContent = `⚡ Xử lý ${res.missingCount} sách thất lạc`;
    }
    if ($('auditBulkRelocateBtn')) {
      $('auditBulkRelocateBtn').style.display = res.misplacedCount > 0 ? 'inline-block' : 'none';
      $('auditBulkRelocateBtn').textContent = `🔄 Chuyển ${res.misplacedCount} sách lệch về kệ này`;
    }
  }

  function updateAuditTabUi() {
    document.querySelectorAll('.audit-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.auditTab === auditState.activeTab);
    });
  }

  function renderAuditTable() {
    const res = auditState.auditResult;
    const tbody = $('auditTableBody');
    if (!tbody || !res) return;

    let items = [];
    if (auditState.activeTab === 'matched') items = res.matched;
    else if (auditState.activeTab === 'misplaced') items = res.misplaced;
    else if (auditState.activeTab === 'missing') items = res.missing;
    else if (auditState.activeTab === 'unknown') items = res.unknown;

    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#888;padding:1.5rem;">Không có mục nào trong danh sách này.</td></tr>';
      return;
    }

    tbody.innerHTML = items.map((item) => {
      if (auditState.activeTab === 'unknown') {
        return `<tr>
          <td><code>${escapeHtml(item.barcode)}</code></td>
          <td colspan="4" style="color:#dd4b39;font-weight:600;">Mã không thuộc cơ sở dữ liệu thư viện</td>
          <td>—</td>
        </tr>`;
      }
      const loc = item.currentLocation
        ? `Kệ ${escapeHtml([item.currentLocation.shelf, item.currentLocation.aisle, item.currentLocation.floor].filter(Boolean).join(' · '))}`
        : escapeHtml([item.shelf && `Kệ ${item.shelf}`, item.aisle, item.floor && `Tầng ${item.floor}`].filter(Boolean).join(' · ') || '—');

      let actionHtml = '—';
      if (auditState.activeTab === 'misplaced') {
        actionHtml = `<button class="button button-light button-small" data-audit-relocate="${escapeHtml(item.barcode)}" type="button" style="color:#b45309;font-weight:600;">Chuyển về kệ này</button>`;
      } else if (auditState.activeTab === 'missing') {
        actionHtml = `
          <div class="audit-action-btn-group">
            <button class="button button-light button-small" data-audit-mark-lost="${escapeHtml(item.barcode)}" type="button" style="color:#dc2626;">Báo mất</button>
            <button class="button button-light button-small" data-audit-mark-dispose="${escapeHtml(item.barcode)}" type="button" style="color:#d97706;">Thanh lý</button>
          </div>
        `;
      }

      return `<tr>
        <td><code>${escapeHtml(item.barcode)}</code></td>
        <td><strong>${escapeHtml(item.title || '—')}</strong></td>
        <td>${escapeHtml(item.author || '—')}</td>
        <td>${loc}</td>
        <td><span class="status status-${escapeHtml(item.status || 'AVAILABLE')}">${escapeHtml(item.status || 'OK')}</span></td>
        <td>${actionHtml}</td>
      </tr>`;
    }).join('');
  }

  async function relocateAuditCopy(barcode) {
    const floor = $('auditFloor')?.value.trim() || '';
    const aisle = $('auditAisle')?.value.trim() || '';
    const shelf = $('auditShelf')?.value.trim() || '';

    try {
      const res = await api('/books/audit/relocate', {
        method: 'POST',
        body: JSON.stringify({ barcodes: [barcode], floor, aisle, shelf }),
      });
      notify(res.message);
      await refreshCurrentAudit();
      await Promise.all([loadBooks(state.page), loadDashboard()]);
    } catch (e) {
      notify(`Không thể chuyển vị trí: ${e.message}`, true);
    }
  }

  async function bulkRelocateMisplaced() {
    const res = auditState.auditResult;
    if (!res || !res.misplaced || !res.misplaced.length) {
      return notify('Không có sách nào xếp nhầm kệ để chuyển.', true);
    }
    const floor = $('auditFloor')?.value.trim() || '';
    const aisle = $('auditAisle')?.value.trim() || '';
    const shelf = $('auditShelf')?.value.trim() || '';

    if (!window.confirm(`Xác nhận chuyển toàn bộ ${res.misplaced.length} cuốn sách xếp nhầm về Kệ ${shelf || ''} · Dãy ${aisle || ''} · Tầng ${floor || ''}?`)) {
      return;
    }

    const barcodes = res.misplaced.map(m => m.barcode);
    try {
      const resp = await api('/books/audit/relocate', {
        method: 'POST',
        body: JSON.stringify({ barcodes, floor, aisle, shelf }),
      });
      notify(resp.message);
      await refreshCurrentAudit();
      await Promise.all([loadBooks(state.page), loadDashboard()]);
    } catch (e) {
      notify(`Lỗi khi chuyển vị trí hàng loạt: ${e.message}`, true);
    }
  }

  function openBulkMissingDialog() {
    const res = auditState.auditResult;
    if (!res || !res.missing || !res.missing.length) {
      return notify('Không có sách nào chưa quét/thất lạc để xử lý.', true);
    }
    if ($('auditMissingDialogCount')) {
      $('auditMissingDialogCount').textContent = res.missing.length;
    }
    if ($('auditBulkActionReason')) {
      const shelf = $('auditShelf')?.value.trim() || '';
      $('auditBulkActionReason').value = `Biên bản đối soát kiểm kê kho Kệ ${shelf || 'định kỳ'} ngày ${new Date().toLocaleDateString('vi-VN')}`;
    }
    $('auditBulkMissingDialog')?.showModal();
  }

  async function handleBulkMissingSubmit(e) {
    e.preventDefault();
    const res = auditState.auditResult;
    if (!res || !res.missing || !res.missing.length) return;

    const status = $('auditBulkActionStatus')?.value || 'LOST';
    const reason = $('auditBulkActionReason')?.value || '';
    const barcodes = res.missing.map(m => m.barcode);

    try {
      const resp = await api('/books/audit/bulk-update-status', {
        method: 'POST',
        body: JSON.stringify({ barcodes, status, reason }),
      });
      notify(resp.message);
      $('auditBulkMissingDialog')?.close();
      await refreshCurrentAudit();
      await Promise.all([loadBooks(state.page), loadDashboard()]);
    } catch (err) {
      notify(`Lỗi cập nhật trạng thái: ${err.message}`, true);
    }
  }

  async function updateSingleCopyStatus(barcode, status) {
    const statusName = status === 'LOST' ? 'Mất sách' : 'Cần thanh lý';
    if (!window.confirm(`Xác nhận cập nhật bản sao ${barcode} thành ${statusName}?`)) return;

    try {
      const resp = await api('/books/audit/bulk-update-status', {
        method: 'POST',
        body: JSON.stringify({ barcodes: [barcode], status }),
      });
      notify(resp.message);
      await refreshCurrentAudit();
      await Promise.all([loadBooks(state.page), loadDashboard()]);
    } catch (e) {
      notify(`Lỗi: ${e.message}`, true);
    }
  }

  async function refreshCurrentAudit() {
    const floor = $('auditFloor')?.value.trim() || '';
    const aisle = $('auditAisle')?.value.trim() || '';
    const shelf = $('auditShelf')?.value.trim() || '';

    try {
      const res = await api('/books/audit', {
        method: 'POST',
        body: JSON.stringify({
          floor,
          aisle,
          shelf,
          scannedBarcodes: Array.from(auditState.scannedBarcodes),
        }),
      });
      auditState.auditResult = res;
      renderAuditStats();
      renderAuditTable();
    } catch (_) { }
  }

  function exportAuditReportExcel() {
    const res = auditState.auditResult;
    if (!res) return notify('Chưa có dữ liệu kiểm kê để xuất biên bản đối soát.', true);

    const floor = $('auditFloor')?.value.trim() || '—';
    const aisle = $('auditAisle')?.value.trim() || '—';
    const shelf = $('auditShelf')?.value.trim() || '—';
    const now = new Date();
    const dateStr = now.toLocaleDateString('vi-VN') + ' ' + now.toLocaleTimeString('vi-VN');
    const staffName = state.user?.fullName || state.user?.username || 'Thủ thư';

    const rows = [
      ['THƯ VIỆN ĐẠI HỌC / TRƯỜNG HỌC', '', '', '', '', ''],
      ['BIÊN BẢN ĐỐI SOÁT & KIỂM KÊ KHO SÁCH ĐỊNH KỲ', '', '', '', '', ''],
      ['Thời gian lập biên bản:', dateStr, '', '', '', ''],
      ['Vị trí kiểm kê:', `Tầng: ${floor} | Dãy: ${aisle} | Kệ: ${shelf}`, '', '', '', ''],
      ['Người thực hiện:', staffName, '', '', '', ''],
      ['', '', '', '', '', ''],
      ['BẢNG TỔNG HỢP CHỈ SỐ ĐỐI SOÁT', '', '', '', '', ''],
      ['Chỉ số', 'Số lượng', 'Tỷ lệ %', 'Ghi chú', '', ''],
      ['Tổng số sách dự kiến trên kệ', res.totalExpected, '100%', '', '', ''],
      ['Tổng số sách đã quét thực tế', res.totalScanned, `${res.totalExpected ? Math.round((res.totalScanned / res.totalExpected) * 100) : 0}%`, '', '', ''],
      ['Khớp đúng vị trí', res.matchedCount, `${res.totalExpected ? Math.round((res.matchedCount / res.totalExpected) * 100) : 0}%`, 'Đạt chuẩn lưu kho', '', ''],
      ['Xếp nhầm kệ / Lệch vị trí', res.misplacedCount, `${res.totalExpected ? Math.round((res.misplacedCount / res.totalExpected) * 100) : 0}%`, 'Cần chuyển về đúng kệ', '', ''],
      ['Chưa quét / Thất lạc', res.missingCount, `${res.totalExpected ? Math.round((res.missingCount / res.totalExpected) * 100) : 0}%`, 'Cần tìm kiếm hoặc báo mất', '', ''],
      ['Mã vạch lạ ngoài thư viện', res.unknownCount, '—', 'Kiểm tra nguồn gốc', '', ''],
      ['', '', '', '', '', ''],
      ['DANH SÁCH CHI TIẾT SÁCH ĐỐI SOÁT', '', '', '', '', ''],
      ['Phân loại', 'Barcode', 'Tên sách', 'Tác giả', 'Vị trí ghi nhận', 'Trạng thái hệ thống'],
      ...res.matched.map(m => ['Khớp đúng', m.barcode, m.title, m.author, m.shelf, m.status]),
      ...res.misplaced.map(m => ['Xếp nhầm kệ', m.barcode, m.title, m.author, `Kệ ${m.currentLocation?.shelf || ''} · Dãy ${m.currentLocation?.aisle || ''} · Tầng ${m.currentLocation?.floor || ''}`, m.status]),
      ...res.missing.map(m => ['Chưa quét / Thất lạc', m.barcode, m.title, m.author, m.shelf, m.status]),
      ...res.unknown.map(u => ['Mã lạ', u.barcode, 'Không xác định', '—', '—', '—']),
      ['', '', '', '', '', ''],
      ['XÁC NHẬN CỦA HỘI ĐỒNG KIỂM KÊ', '', '', '', '', ''],
      ['TRƯỞNG BAN KIỂM KÊ', '', 'THỦ THƯ PHỤ TRÁCH KHO', '', 'NGƯỜI LẬP BIÊN BẢN', ''],
      ['(Ký và ghi rõ họ tên)', '', '(Ký và ghi rõ họ tên)', '', '(Ký và ghi rõ họ tên)', ''],
    ];

    const csv = rows.map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `bien_ban_kiem_ke_kho_${Date.now()}.csv`;
    a.click();
    notify('Đã tải xuống file biên bản đối soát Excel/CSV.');
  }

  function printAuditReport() {
    const res = auditState.auditResult;
    if (!res) return notify('Chưa có dữ liệu kiểm kê để in biên bản.', true);

    const floor = $('auditFloor')?.value.trim() || '—';
    const aisle = $('auditAisle')?.value.trim() || '—';
    const shelf = $('auditShelf')?.value.trim() || '—';
    const now = new Date();
    const dateFormatted = `Ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;
    const staffName = state.user?.fullName || state.user?.username || 'Thủ thư phụ trách';

    const printWin = window.open('', '_blank');
    if (!printWin) return notify('Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép popup.', true);

    const misplacedRows = res.misplaced.map((m, idx) => `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td><code>${escapeHtml(m.barcode)}</code></td>
        <td>${escapeHtml(m.title)}</td>
        <td>Kệ ${escapeHtml(m.currentLocation?.shelf || '')} · Dãy ${escapeHtml(m.currentLocation?.aisle || '')}</td>
        <td style="color:#b45309;font-weight:600;">Xếp nhầm kệ</td>
      </tr>
    `).join('') || '<tr><td colspan="5" style="text-align:center;color:#666;">Không có sách nào xếp nhầm kệ.</td></tr>';

    const missingRows = res.missing.map((m, idx) => `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td><code>${escapeHtml(m.barcode)}</code></td>
        <td>${escapeHtml(m.title)}</td>
        <td>${escapeHtml(m.author)}</td>
        <td style="color:#dc2626;font-weight:600;">Chưa quét / Thất lạc</td>
      </tr>
    `).join('') || '<tr><td colspan="5" style="text-align:center;color:#666;">Không có sách thất lạc. Tất cả sách đều đã được quét đối soát đầy đủ.</td></tr>';

    printWin.document.write(`
      <!doctype html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Biên bản đối soát kiểm kê kho sách</title>
        <style>
          @page { size: A4 portrait; margin: 15mm 15mm 15mm 15mm; }
          body { font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.4; color: #000; margin: 0; padding: 0; }
          .header-table { width: 100%; margin-bottom: 20px; text-align: center; border-collapse: collapse; }
          .header-table td { vertical-align: top; }
          h2 { text-align: center; font-size: 16pt; margin: 15px 0 5px; text-transform: uppercase; font-weight: bold; }
          .subtitle { text-align: center; font-style: italic; margin-bottom: 20px; font-size: 12pt; }
          .info-block { margin-bottom: 15px; }
          .info-block p { margin: 4px 0; }
          table.data-table { width: 100%; border-collapse: collapse; margin: 12px 0 20px; font-size: 11pt; }
          table.data-table th, table.data-table td { border: 1px solid #000; padding: 6px 8px; }
          table.data-table th { background: #f0f0f0; text-align: center; font-weight: bold; }
          .section-title { font-weight: bold; font-size: 12pt; margin-top: 15px; margin-bottom: 5px; }
          .sign-table { width: 100%; margin-top: 35px; border-collapse: collapse; text-align: center; page-break-inside: avoid; }
          .sign-table td { vertical-align: top; width: 25%; font-size: 11pt; }
          .sign-title { font-weight: bold; margin-bottom: 4px; }
          .sign-note { font-style: italic; font-size: 10pt; }
          .sign-space { height: 75px; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td style="width:45%;">
              <strong>HỆ THỐNG THƯ VIỆN</strong><br>
              <strong>BAN KIỂM KÊ KHO SÁCH</strong>
            </td>
            <td style="width:55%;">
              <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br>
              <strong>Độc lập - Tự do - Hạnh phúc</strong><br>
              -------------------
            </td>
          </tr>
        </table>

        <h2>BIÊN BẢN ĐỐI SOÁT & KIỂM KÊ KHO SÁCH</h2>
        <div class="subtitle">${dateFormatted}</div>

        <div class="info-block">
          <p><strong>1. Thời gian kiểm kê:</strong> ${now.toLocaleTimeString('vi-VN')} - ${now.toLocaleDateString('vi-VN')}</p>
          <p><strong>2. Vị trí kiểm kê:</strong> Kệ: <strong>${escapeHtml(shelf)}</strong> | Dãy: <strong>${escapeHtml(aisle)}</strong> | Tầng: <strong>${escapeHtml(floor)}</strong></p>
          <p><strong>3. Cán bộ thực hiện:</strong> ${escapeHtml(staffName)} (Thủ thư phụ trách kiểm kê kho)</p>
        </div>

        <div class="section-title">I. BẢNG TỔNG HỢP CHỈ SỐ ĐỐI SOÁT KHO SÁCH</div>
        <table class="data-table">
          <thead>
            <tr>
              <th>TT</th>
              <th>Chỉ số kiểm kê</th>
              <th>Số lượng</th>
              <th>Tỷ lệ %</th>
              <th>Đánh giá kết quả</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align:center;">1</td>
              <td>Tổng số sách dự kiến theo dữ liệu hệ thống</td>
              <td style="text-align:center;font-weight:bold;">${res.totalExpected}</td>
              <td style="text-align:center;">100%</td>
              <td>Dữ liệu chuẩn</td>
            </tr>
            <tr>
              <td style="text-align:center;">2</td>
              <td>Tổng số sách đã quét thực tế trên kệ</td>
              <td style="text-align:center;font-weight:bold;">${res.totalScanned}</td>
              <td style="text-align:center;">${res.totalExpected ? Math.round((res.totalScanned / res.totalExpected) * 100) : 0}%</td>
              <td>Số lượng bản sao hiện diện</td>
            </tr>
            <tr>
              <td style="text-align:center;">3</td>
              <td>Số sách khớp đúng vị trí kệ</td>
              <td style="text-align:center;font-weight:bold;color:#166534;">${res.matchedCount}</td>
              <td style="text-align:center;">${res.totalExpected ? Math.round((res.matchedCount / res.totalExpected) * 100) : 0}%</td>
              <td>Đạt chuẩn bảo quản & lưu thông</td>
            </tr>
            <tr>
              <td style="text-align:center;">4</td>
              <td>Số sách xếp nhầm kệ / lệch vị trí</td>
              <td style="text-align:center;font-weight:bold;color:#b45309;">${res.misplacedCount}</td>
              <td style="text-align:center;">${res.totalExpected ? Math.round((res.misplacedCount / res.totalExpected) * 100) : 0}%</td>
              <td>Cần sắp xếp lại đúng kệ</td>
            </tr>
            <tr>
              <td style="text-align:center;">5</td>
              <td>Số sách chưa quét / thất lạc trên kệ</td>
              <td style="text-align:center;font-weight:bold;color:#dc2626;">${res.missingCount}</td>
              <td style="text-align:center;">${res.totalExpected ? Math.round((res.missingCount / res.totalExpected) * 100) : 0}%</td>
              <td>Cần kiểm tra kho hoặc lập biên bản mất</td>
            </tr>
            <tr>
              <td style="text-align:center;">6</td>
              <td>Mã vạch lạ không xác định</td>
              <td style="text-align:center;font-weight:bold;">${res.unknownCount}</td>
              <td style="text-align:center;">—</td>
              <td>Kiểm tra tem nhãn</td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">II. DANH SÁCH SÁCH CHƯA QUÉT / THẤT LẠC (CẦN XỬ LÝ)</div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width:40px;">TT</th>
              <th>Mã Barcode</th>
              <th>Tên đầu sách</th>
              <th>Tác giả</th>
              <th>Tình trạng</th>
            </tr>
          </thead>
          <tbody>
            ${missingRows}
          </tbody>
        </table>

        <div class="section-title">III. DANH SÁCH SÁCH XẾP NHẦM KỆ (LỆCH VỊ TRÍ)</div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width:40px;">TT</th>
              <th>Mã Barcode</th>
              <th>Tên đầu sách</th>
              <th>Vị trí đúng trên hệ thống</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            ${misplacedRows}
          </tbody>
        </table>

        <div class="section-title">IV. KẾT LUẬN & KIẾN NGHỊ HỘI ĐỒNG</div>
        <p style="margin:6px 0;font-size:11pt;">
          - Hội đồng kiểm kê đã hoàn thành việc đối soát thực tế tại kệ theo đúng quy trình nghiệp vụ thư viện.<br>
          - Yêu cầu bộ phận kho hoàn trả các ấn phẩm xếp sai về đúng vị trí kệ lưu trữ tương ứng trong vòng 24 giờ.<br>
          - Đối với các ấn phẩm thất lạc, đề nghị hoàn tất xác minh trước khi chuyển sang trạng thái thanh lý hoặc bồi hoàn.
        </p>

        <table class="sign-table">
          <tr>
            <td>
              <div class="sign-title">TRƯỞNG BAN KIỂM KÊ</div>
              <div class="sign-note">(Ký và ghi rõ họ tên)</div>
              <div class="sign-space"></div>
            </td>
            <td>
              <div class="sign-title">THỦ THƯ PHỤ TRÁCH KHO</div>
              <div class="sign-note">(Ký và ghi rõ họ tên)</div>
              <div class="sign-space"></div>
            </td>
            <td>
              <div class="sign-title">NGƯỜI LẬP BIÊN BẢN</div>
              <div class="sign-note">(Ký và ghi rõ họ tên)</div>
              <div class="sign-space"></div>
              <div>${escapeHtml(staffName)}</div>
            </td>
            <td>
              <div class="sign-title">ĐẠI DIỆN THANH TRA</div>
              <div class="sign-note">(Ký và ghi rõ họ tên)</div>
              <div class="sign-space"></div>
            </td>
          </tr>
        </table>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  }

  async function toggleAuditCamera() {
    const wrapper = $('auditCameraWrapper');
    if (!wrapper) return;

    if (wrapper.style.display !== 'none') {
      stopAuditCamera();
      return;
    }

    wrapper.style.display = 'block';
    const video = $('auditCameraVideo');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      auditState.cameraStream = stream;
      video.srcObject = stream;
      await video.play();

      if ('BarcodeDetector' in window) {
        const detector = new window.BarcodeDetector({
          formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'qr_code', 'upc_a'],
        });
        auditState.cameraDetectorInterval = setInterval(async () => {
          try {
            if (video.readyState >= 2) {
              const barcodes = await detector.detect(video);
              if (barcodes && barcodes.length) {
                const code = barcodes[0].rawValue;
                if (code && !auditState.scannedBarcodes.has(code)) {
                  void processAuditBarcode(code);
                }
              }
            }
          } catch (_) { }
        }, 300);
      } else if (window.Html5Qrcode) {
        stopAuditCameraMedia();
        const html5Qr = new window.Html5Qrcode('auditCameraReader');
        auditState.html5QrScanner = html5Qr;
        await html5Qr.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 180 } },
          (decodedText) => {
            if (decodedText && !auditState.scannedBarcodes.has(decodedText)) {
              void processAuditBarcode(decodedText);
            }
          },
          () => { }
        );
      } else {
        notify('Camera đã bật. Bạn có thể hướng vào mã vạch trên sách để kiểm kê.', false);
      }
    } catch (err) {
      notify(`Không thể truy cập camera: ${err.message}. Hãy cấp quyền Camera cho trình duyệt.`, true);
      wrapper.style.display = 'none';
    }
  }

  function stopAuditCamera() {
    stopAuditCameraMedia();
    if (auditState.html5QrScanner) {
      try {
        auditState.html5QrScanner.stop().catch(() => { });
      } catch (_) { }
      auditState.html5QrScanner = null;
    }
    const wrapper = $('auditCameraWrapper');
    if (wrapper) wrapper.style.display = 'none';
  }

  function stopAuditCameraMedia() {
    if (auditState.cameraDetectorInterval) {
      clearInterval(auditState.cameraDetectorInterval);
      auditState.cameraDetectorInterval = null;
    }
    if (auditState.cameraStream) {
      auditState.cameraStream.getTracks().forEach(t => t.stop());
      auditState.cameraStream = null;
    }
    const video = $('auditCameraVideo');
    if (video) video.srcObject = null;
  }

  function initAuditModule() {
    $('loadAuditExpected')?.addEventListener('click', loadAuditExpected);
    $('resetAuditSession')?.addEventListener('click', () => {
      auditState.scannedBarcodes.clear();
      auditState.auditResult = null;
      if ($('auditFloor')) $('auditFloor').value = '';
      if ($('auditAisle')) $('auditAisle').value = '';
      if ($('auditShelf')) $('auditShelf').value = '';
      if ($('auditBarcodeInput')) $('auditBarcodeInput').value = '';
      if ($('auditLastScanMsg')) $('auditLastScanMsg').innerHTML = '';
      if ($('auditTotalExpected')) $('auditTotalExpected').textContent = '0';
      if ($('auditTotalScanned')) $('auditTotalScanned').textContent = '0';
      if ($('auditMatchedCount')) $('auditMatchedCount').textContent = '0';
      if ($('auditMisplacedCount')) $('auditMisplacedCount').textContent = '0';
      if ($('auditMissingCount')) $('auditMissingCount').textContent = '0';
      if ($('tabCountMatched')) $('tabCountMatched').textContent = '0';
      if ($('tabCountMisplaced')) $('tabCountMisplaced').textContent = '0';
      if ($('tabCountMissing')) $('tabCountMissing').textContent = '0';
      if ($('tabCountUnknown')) $('tabCountUnknown').textContent = '0';
      const tbody = $('auditTableBody');
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#888;padding:2rem;">Nhập vị trí và bấm [Tải dữ liệu kệ] để bắt đầu.</td></tr>';
      }
      notify('Đã làm mới phiên kiểm kê.');
    });

    $('exportAuditReport')?.addEventListener('click', exportAuditReportExcel);
    $('printAuditReportBtn')?.addEventListener('click', printAuditReport);
    $('auditCameraBtn')?.addEventListener('click', toggleAuditCamera);
    $('closeAuditCameraBtn')?.addEventListener('click', stopAuditCamera);
    $('auditBulkMissingBtn')?.addEventListener('click', openBulkMissingDialog);
    $('auditBulkRelocateBtn')?.addEventListener('click', bulkRelocateMisplaced);
    $('auditBulkMissingForm')?.addEventListener('submit', handleBulkMissingSubmit);

    $('auditAudioToggle')?.addEventListener('change', (e) => {
      auditState.audioEnabled = e.target.checked;
    });
    $('auditAutoContinuous')?.addEventListener('change', (e) => {
      auditState.autoContinuous = e.target.checked;
    });

    const barcodeInput = $('auditBarcodeInput');
    if (barcodeInput) {
      $('auditScanBtn')?.addEventListener('click', () => {
        const val = barcodeInput.value.trim();
        if (val) void processAuditBarcode(val);
      });

      barcodeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          clearTimeout(auditState.inputDebounceTimer);
          const val = e.target.value.trim();
          if (val) void processAuditBarcode(val);
        }
      });

      barcodeInput.addEventListener('input', (e) => {
        if (!auditState.autoContinuous) return;
        clearTimeout(auditState.inputDebounceTimer);
        const val = e.target.value.trim();
        if (val && val.length >= 4) {
          auditState.inputDebounceTimer = setTimeout(() => {
            const currentVal = barcodeInput.value.trim();
            if (currentVal && currentVal === val) {
              void processAuditBarcode(currentVal);
            }
          }, 150);
        }
      });
    }

    document.querySelectorAll('.audit-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        auditState.activeTab = tab.dataset.auditTab;
        updateAuditTabUi();
        renderAuditTable();
      });
    });

    $('auditTableBody')?.addEventListener('click', (e) => {
      const relocateBtn = e.target.closest('[data-audit-relocate]');
      if (relocateBtn) {
        const barcode = relocateBtn.dataset.auditRelocate;
        if (barcode) void relocateAuditCopy(barcode);
        return;
      }
      const lostBtn = e.target.closest('[data-audit-mark-lost]');
      if (lostBtn) {
        const barcode = lostBtn.dataset.auditMarkLost;
        if (barcode) void updateSingleCopyStatus(barcode, 'LOST');
        return;
      }
      const disposeBtn = e.target.closest('[data-audit-mark-dispose]');
      if (disposeBtn) {
        const barcode = disposeBtn.dataset.auditMarkDispose;
        if (barcode) void updateSingleCopyStatus(barcode, 'DISPOSED');
        return;
      }
    });
  }

  // ==========================================


  // ==========================================
  // QUẢN LÝ ĐƠN MUA HÀNG (PO) & GOM NHÓM NXB
  // ==========================================
  async function loadApprovedPublisherGroups() {
    const container = $('approvedPublisherGroupsList');
    if (!container) return;
    try {
      const groups = await api('/acquisitions/approved-groups');
      if (!groups || !groups.length) {
        container.innerHTML = '<span style="font-size:13px;color:#64748b;">Chưa có đề xuất nào ở trạng thái "Đã duyệt" để gom nhóm theo Nhà xuất bản.</span>';
        return;
      }
      container.innerHTML = groups.map(g => {
        const reqIds = (g.requests || []).map(r => r.id);
        const reqTitles = (g.requests || []).map(r => r.title);
        const jsonIds = JSON.stringify(reqIds).replace(/"/g, '&quot;');
        const jsonTitles = JSON.stringify(reqTitles).replace(/"/g, '&quot;');
        const pubName = (g.publisher || 'Nhà xuất bản đối tác').replace(/'/g, "\\'");
        return `
          <div style="background:#fff;border:1px solid #e2e8f0;border-left:4px solid #6f42c1;padding:12px 14px;border-radius:8px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex:1;min-width:280px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <div>
              <strong style="color:#1e293b;font-size:13px;">${escapeHtml(g.publisher || 'NXB khác')}</strong>
              <div style="font-size:12px;color:#64748b;margin-top:2px;">
                <strong>${g.count}</strong> đề xuất duyệt · Tổng ước tính: <strong style="color:#0f766e;">${money(g.totalEstimatedPrice)}</strong>
              </div>
            </div>
            <button class="button button-primary button-small" type="button" onclick="openCreatePoFromPublisher('${pubName}', ${g.totalEstimatedPrice || 0}, ${jsonIds}, ${jsonTitles})" style="white-space:nowrap;">
              ＋ Lập PO nhóm này
            </button>
          </div>
        `;
      }).join('');
    } catch (e) {
      container.innerHTML = `<span style="font-size:13px;color:#ef4444;">Lỗi tải nhóm NXB: ${escapeHtml(e.message)}</span>`;
    }
  }

  window.openCreatePoFromPublisher = function (publisher, estimatedTotal, requestIds, titles) {
    openCreatePoModal();
    if ($('poSupplier')) $('poSupplier').value = publisher;
    if ($('poTotalAmount')) {
      $('poTotalAmount').value = estimatedTotal;
      checkPoBudgetAlert(estimatedTotal);
    }
    if ($('poNote')) {
      $('poNote').value = `Đơn đặt hàng gom nhóm từ các đề xuất đã duyệt: ${Array.isArray(titles) ? titles.slice(0, 3).join(', ') + (titles.length > 3 ? '...' : '') : ''}`;
    }
    window._pendingPoRequestIds = requestIds || [];
  };

  async function openCreatePoModal() {
    const dialog = $('createPurchaseOrderDialog');
    if (!dialog) return;
    const form = $('createPurchaseOrderForm');
    if (form) form.reset();
    window._pendingPoRequestIds = [];

    const yr = new Date().getFullYear();
    const poCodeInput = $('poCode');
    if (poCodeInput) {
      const pad = String(Math.floor(1000 + Math.random() * 9000));
      poCodeInput.value = `PO-${yr}-${pad}`;
    }

    try {
      const budgetData = await api(`/acquisitions/budget?year=${yr}`);
      activePoBudgetInfo = budgetData;
      if ($('poBudgetYear')) $('poBudgetYear').textContent = budgetData.year || yr;
      if ($('poRemainingBudget')) $('poRemainingBudget').textContent = money(budgetData.remainingBudget || 0);
      if ($('poTotalBudget')) $('poTotalBudget').textContent = money(budgetData.totalBudget || 0);
      checkPoBudgetAlert(Number($('poTotalAmount')?.value || 0));
    } catch (_) { }

    dialog.showModal();
  }

  function checkPoBudgetAlert(amount) {
    const box = $('poBudgetAlertBox');
    const msg = $('poBudgetWarningMsg');
    if (!box || !msg || !activePoBudgetInfo) return;

    const remaining = Number(activePoBudgetInfo.remainingBudget || 0);
    const amt = Number(amount || 0);

    if (amt > remaining) {
      box.style.background = '#fef2f2';
      box.style.borderColor = '#f87171';
      box.style.color = '#991b1b';
      msg.innerHTML = `⚠️ <strong>CẢNH BÁO VƯỢT HẠN MỨC:</strong> Giá trị đơn hàng (${money(amt)}) vượt quá ngân sách khả dụng còn lại (${money(remaining)})!`;
    } else {
      box.style.background = '#f0fdf4';
      box.style.borderColor = '#bbf7d0';
      box.style.color = '#166534';
      const surplus = remaining - amt;
      msg.innerHTML = `✓ <strong>Hạn mức ngân sách an toàn.</strong> Ngân sách khả dụng còn lại sau đơn này: <strong>${money(surplus)}</strong>`;
    }
  }

  async function loadPurchaseOrders() {
    const status = $('poStatusFilter')?.value || '';
    const params = new URLSearchParams();
    if (status) params.append('status', status);

    try {
      const orders = await api('/acquisitions/orders' + (params.toString() ? `?${params.toString()}` : ''));
      if ($('acqOrderCount')) $('acqOrderCount').textContent = orders.length;
      const tbody = $('purchaseOrdersTableBody');
      if (!tbody) return;

      if (!orders.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#888;padding:2rem;">Chưa có đơn mua hàng nào.</td></tr>';
        return;
      }

      const statusMap = {
        DRAFT: { label: 'Bản nháp', bg: '#f3f4f6', color: '#4b5563' },
        ORDERED: { label: 'Đã gửi NXB', bg: '#dbeafe', color: '#1e40af' },
        SHIPPED: { label: 'Đang vận chuyển', bg: '#fef3c7', color: '#854d0e' },
        COMPLETED: { label: 'Đã nhập kho', bg: '#dcfce7', color: '#166534' },
        CANCELLED: { label: 'Đã hủy', bg: '#fee2e2', color: '#991b1b' },
      };

      tbody.innerHTML = orders.map((po) => {
        const st = statusMap[po.status] || { label: po.status, bg: '#eee', color: '#333' };
        const expDate = po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString('vi-VN') : '---';
        const actions = [];
        if (po.status === 'DRAFT') {
          actions.push(`<button class="button button-primary button-small" onclick="updatePoStatus(${po.id}, 'ORDERED')">Gửi đặt hàng</button>`);
        } else if (po.status === 'ORDERED') {
          actions.push(`<button class="button button-light button-small" onclick="updatePoStatus(${po.id}, 'SHIPPED')">Đang giao</button>`);
        } else if (po.status === 'SHIPPED') {
          actions.push(`<button class="button button-primary button-small" onclick="updatePoStatus(${po.id}, 'COMPLETED')">Nhập kho</button>`);
        }
        if (po.status !== 'COMPLETED' && po.status !== 'CANCELLED') {
          actions.push(`<button class="button button-danger button-small" onclick="updatePoStatus(${po.id}, 'CANCELLED')">Hủy đơn</button>`);
        }
        actions.push(`<button class="button button-light button-small" onclick="deletePoOrder(${po.id})" style="color:#ef4444;" title="Xóa">✕</button>`);

        return `<tr>
          <td><strong>${escapeHtml(po.orderCode)}</strong></td>
          <td>
            <strong>${escapeHtml(po.supplierName)}</strong>
            ${po.supplierPhone ? `<br><small style="color:#666;">📞 ${escapeHtml(po.supplierPhone)}</small>` : ''}
          </td>
          <td style="font-weight:700;color:#123c35;">${money(po.totalAmount || 0)}</td>
          <td>${expDate}</td>
          <td>${escapeHtml(po.createdByName || 'Thủ thư')}</td>
          <td>
            <span class="status-badge" style="background:${st.bg};color:${st.color};padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600;">
              ${st.label}
            </span>
          </td>
          <td style="max-width:200px;font-size:12px;color:#555;">${escapeHtml(po.note || '---')}</td>
          <td>
            <div class="button-row" style="margin:0;gap:4px;">
              ${actions.join('')}
            </div>
          </td>
        </tr>`;
      }).join('');
    } catch (err) {
      notify('Lỗi tải đơn mua hàng: ' + err.message, true);
    }
  }

  window.updatePoStatus = async function (id, status) {
    try {
      await api(`/acquisitions/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      notify('Đã cập nhật trạng thái đơn mua hàng.');
      await Promise.all([loadPurchaseOrders(), loadBudgets()]);
    } catch (e) {
      notify(e.message, true);
    }
  };

  window.deletePoOrder = async function (id) {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đơn mua hàng này?')) return;
    try {
      await api(`/acquisitions/orders/${id}`, { method: 'DELETE' });
      notify('Đã xóa đơn mua hàng thành công.');
      await Promise.all([loadPurchaseOrders(), loadBudgets()]);
    } catch (e) {
      notify(e.message, true);
    }
  };


  // ==========================================
  // CỔNG TRA CỨU CÔNG CỘNG (OPAC PORTAL)
  // ==========================================
  async function loadOpacPortal(filterType = 'trending', topic = '') {
    initOpacTabEvents();
    const grid = $('opacBookGrid');
    if (!grid) return;
    grid.innerHTML = '<p style="color:#888;">Đang tải danh mục tra cứu OPAC...</p>';

    try {
      let books = state.books && state.books.length ? state.books : (await api('/books?limit=50')).data || [];
      if (!books.length) {
        const res = await api('/books');
        books = res.data || res || [];
      }

      if (topic) {
        books = books.filter((b) =>
          (b.title && b.title.toLowerCase().includes(topic.toLowerCase())) ||
          (b.category && b.category.name && b.category.name.toLowerCase().includes(topic.toLowerCase())) ||
          (b.description && b.description.toLowerCase().includes(topic.toLowerCase()))
        );
      } else if (filterType === 'digital') {
        books = books.filter((b) => b.pdfUrl);
      } else if (filterType === 'new') {
        books = [...books].sort((a, b) => b.id - a.id);
      } else {
        // trending
        books = [...books].sort((a, b) => (Number(b.totalCopies || 0) - Number(b.availableCopies || 0)) - (Number(a.totalCopies || 0) - Number(a.availableCopies || 0)));
      }

      if (!books.length) {
        grid.innerHTML = '<p style="color:#888;grid-column:1/-1;text-align:center;padding:2rem;">Không tìm thấy tài liệu phù hợp trong cổng tra cứu OPAC.</p>';
        return;
      }

      grid.innerHTML = books.slice(0, 18).map((book) => {
        const coverUrl = safeCoverUrl(book.coverImageUrl);
        const isAvail = Number(book.availableCopies || 0) > 0;
        const isFav = state.myFavoriteIds && state.myFavoriteIds.has(Number(book.id));
        const shelfLocation = [
          book.floor ? `Tầng ${book.floor}` : '',
          book.aisle ? book.aisle : '',
          book.shelf ? `Kệ ${book.shelf}` : '',
        ].filter(Boolean).join(' · ') || 'Chưa định vị kệ';

        return `
          <article class="book-card" style="box-shadow:0 4px 12px rgba(0,0,0,0.05);border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#fff;display:flex;flex-direction:column;">
            <div style="position:relative;height:180px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;overflow:hidden;">
              ${coverUrl ? `<img src="${escapeHtml(coverUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;">` : `<span style="font-size:36px;color:#94a3b8;font-weight:bold;">📖</span>`}
              <span class="status-badge" style="position:absolute;top:10px;right:10px;background:${isAvail ? '#dcfce7' : '#fee2e2'};color:${isAvail ? '#166534' : '#991b1b'};padding:4px 8px;border-radius:999px;font-size:11px;font-weight:700;">
                ${isAvail ? `Còn ${book.availableCopies} cuốn` : 'Hết bản sao'}
              </span>
            </div>
            <div style="padding:14px;flex:1;display:flex;flex-direction:column;gap:6px;">
              <span style="font-size:12px;color:#0284c7;font-weight:600;">${escapeHtml(book.category?.name || 'Sách tổng hợp')}</span>
              <h3 style="margin:0;font-size:16px;line-height:1.3;font-weight:700;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;" title="${escapeHtml(book.title)}">
                ${escapeHtml(book.title)}
              </h3>
              <p style="margin:0;font-size:13px;color:#64748b;">${escapeHtml(book.author)}</p>
              
              <div style="font-size:12px;color:#123c35;background:#ecfdf5;padding:4px 8px;border-radius:6px;margin:4px 0;">
                📍 <strong>${escapeHtml(shelfLocation)}</strong>
              </div>

              <div style="font-size:12px;color:#f59e0b;font-weight:bold;">
                ★★★★★ <span style="color:#64748b;font-weight:normal;">(4.9)</span>
              </div>

              <div style="margin-top:auto;padding-top:10px;display:flex;gap:6px;flex-wrap:wrap;">
                <button class="button button-light button-small" data-book-detail="${book.id}" type="button">ⓘ Chi tiết</button>
                ${book.pdfUrl ? `<button class="button button-primary button-small" style="background:#0284c7;" data-read-pdf="${escapeHtml(book.pdfUrl)}" data-title="${escapeHtml(book.title)}" data-id="${book.id}" data-perm="${book.pdfPermission || 'PUBLIC'}" data-preview="${book.previewPages || 5}" data-fmt="${escapeHtml(book.digitalFormat || '')}" type="button">📖 Đọc online</button>` : ''}
                ${state.user ? `<button class="button button-light button-small" data-favorite="${book.id}" type="button" title="Yêu thích" style="color:${isFav ? '#e11d48' : '#94a3b8'};">${isFav ? '❤️' : '🤍'}</button>` : ''}
                ${state.user && isAvail ? `<button class="button button-primary button-small" data-borrow="${book.id}" data-title="${escapeHtml(book.title)}" type="button">＋ Mượn</button>` : ''}
                ${state.user && !isAvail ? `<button class="button button-light button-small" data-reserve="${book.id}" type="button">Đặt giữ</button>` : ''}
              </div>
            </div>
          </article>
        `;
      }).join('');

      // Bind buttons in grid
      grid.querySelectorAll('[data-book-detail]').forEach((b) => b.addEventListener('click', () => showBookDetails(b.dataset.bookDetail)));
      grid.querySelectorAll('[data-read-pdf]').forEach((b) => b.addEventListener('click', () => openPdfViewer(b.dataset.readPdf, b.dataset.title, b.dataset.id, b.dataset.perm, b.dataset.preview, b.dataset.fmt)));
      grid.querySelectorAll('[data-favorite]').forEach((b) => b.addEventListener('click', async () => {
        const id = Number(b.dataset.favorite);
        try {
          const res = await api(`/books/${id}/favorite`, { method: 'POST' });
          if (res.isFavorite) {
            state.myFavoriteIds.add(id);
            notify('Đã thêm vào mục yêu thích ❤️');
          } else {
            state.myFavoriteIds.delete(id);
            notify('Đã bỏ yêu thích');
          }
          loadOpacPortal(filterType, topic);
        } catch (e) {
          notify(e.message, true);
        }
      }));
      grid.querySelectorAll('[data-borrow]').forEach((b) => b.addEventListener('click', () => {
        $('loanBookId').value = b.dataset.borrow;
        $('loanDialogTitle').textContent = `Đăng ký mượn “${b.dataset.title}”?`;
        $('loanDialog').showModal();
      }));
      grid.querySelectorAll('[data-reserve]').forEach((b) => b.addEventListener('click', () => reserveBook(b.dataset.reserve)));
    } catch (err) {
      grid.innerHTML = `<p style="color:red;grid-column:1/-1;">Lỗi tải dữ liệu OPAC: ${escapeHtml(err.message)}</p>`;
    }
  }

  function initOpacTabEvents() {
    if (state.opacTabEventsBound) return;
    state.opacTabEventsBound = true;

    const tabTrending = $('opacTabTrending');
    const tabNew = $('opacTabNew');
    const tabDigital = $('opacTabDigital');
    const tabAcquisitions = $('opacTabAcquisitions');
    const bookGrid = $('opacBookGrid');
    const acqPanel = $('opacAcquisitionsPanel');

    const setTab = (activeTab) => {
      [tabTrending, tabNew, tabDigital, tabAcquisitions].forEach((t) => {
        if (t) t.classList.toggle('active', t === activeTab);
      });
    };

    if (tabTrending) {
      tabTrending.addEventListener('click', () => {
        setTab(tabTrending);
        if (bookGrid) bookGrid.hidden = false;
        if (acqPanel) acqPanel.hidden = true;
        loadOpacPortal('trending');
      });
    }
    if (tabNew) {
      tabNew.addEventListener('click', () => {
        setTab(tabNew);
        if (bookGrid) bookGrid.hidden = false;
        if (acqPanel) acqPanel.hidden = true;
        loadOpacPortal('new');
      });
    }
    if (tabDigital) {
      tabDigital.addEventListener('click', () => {
        setTab(tabDigital);
        if (bookGrid) bookGrid.hidden = false;
        if (acqPanel) acqPanel.hidden = true;
        loadOpacPortal('digital');
      });
    }
    if (tabAcquisitions) {
      tabAcquisitions.addEventListener('click', () => {
        setTab(tabAcquisitions);
        if (bookGrid) bookGrid.hidden = true;
        if (acqPanel) acqPanel.hidden = false;
        loadOpacAcquisitions();
      });
    }

    const openReqBtn = $('openOpacNewRequestBtn');
    if (openReqBtn) {
      openReqBtn.addEventListener('click', () => {
        const dialog = $('opacNewRequestDialog');
        if (dialog) dialog.showModal();
      });
    }

    const newReqForm = $('opacNewRequestForm');
    if (newReqForm) {
      newReqForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await api('/acquisitions', {
            method: 'POST',
            body: JSON.stringify({
              title: $('opacReqTitle').value.trim(),
              author: $('opacReqAuthor').value.trim(),
              publisher: $('opacReqPublisher')?.value.trim() || undefined,
              isbn: $('opacReqIsbn')?.value.trim() || undefined,
              publicationYear: $('opacReqYear')?.value ? Number($('opacReqYear').value) : undefined,
              estimatedPrice: $('opacReqPrice')?.value ? Number($('opacReqPrice').value) : undefined,
              reason: $('opacReqReason').value.trim(),
              referenceUrl: $('opacReqUrl')?.value.trim() || undefined,
            }),
          });
          const dialog = $('opacNewRequestDialog');
          if (dialog) dialog.close();
          newReqForm.reset();
          notify('Đã gửi đề xuất mua sách thành công! Đề xuất đã được đưa lên bảng bình chọn OPAC.');
          await loadOpacAcquisitions();
        } catch (err) {
          notify(err.message, true);
        }
      });
    }
  }

  async function loadOpacAcquisitions() {
    const container = $('opacAcquisitionsList');
    if (!container) return;
    container.innerHTML = '<p style="color:#888;grid-column:1/-1;">Đang tải danh sách sách đang vận động bình chọn...</p>';
    try {
      const list = await api('/acquisitions/opac-feed');
      if (!list || !list.length) {
        container.innerHTML = `
          <div style="grid-column:1/-1;text-align:center;padding:3rem;background:#f8fafc;border-radius:12px;border:1px dashed #cbd5e1;">
            <div style="font-size:36px;margin-bottom:8px;">💡</div>
            <h4 style="margin:0 0 6px 0;color:#334155;">Chưa có đề xuất mua sách nào đang bình chọn</h4>
            <p style="margin:0 0 16px 0;font-size:13.5px;color:#64748b;">Hãy là người đầu tiên đề xuất giáo trình/tài liệu học tập hữu ích cho thư viện!</p>
            <button class="button button-primary" onclick="document.getElementById('opacNewRequestDialog').showModal()" style="background:#6f42c1;border-color:#6f42c1;">＋ Gửi đề xuất ngay</button>
          </div>
        `;
        return;
      }

      container.innerHTML = list.map((item) => {
        const stageMap = {
          LIBRARIAN: 'Cấp 1: Thẩm định kho',
          DEAN: 'Cấp 2: Trưởng khoa',
          RECTOR: 'Cấp 3: BGH phê duyệt',
          COMPLETED: 'Đã hoàn tất duyệt',
        };
        const stageLabel = stageMap[item.currentApprovalStage] || 'Chờ thẩm định';
        const isApproved = item.status === 'APPROVED' || item.status === 'ORDERED' || item.status === 'RECEIVED';

        return `
          <article class="report-card" style="margin:0;display:flex;flex-direction:column;justify-content:space-between;border-radius:12px;border:1px solid #e2e8f0;padding:16px;">
            <div>
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px;">
                <span class="badge" style="background:#ede9fe;color:#6f42c1;font-size:11px;font-weight:700;">
                  ${isApproved ? '🎉 Đã duyệt mua sắm' : '⏳ ' + stageLabel}
                </span>
                <span style="font-size:13px;font-weight:700;color:#ea580c;display:flex;align-items:center;gap:3px;">
                  🔥 <strong>${item.votesCount || 0}</strong> phiếu
                </span>
              </div>
              <h4 style="margin:0 0 4px 0;font-size:15px;color:#0f172a;line-height:1.4;">${escapeHtml(item.title)}</h4>
              <div style="font-size:13px;color:#64748b;margin-bottom:8px;">
                Tác giả: <strong style="color:#334155;">${escapeHtml(item.author)}</strong>
                ${item.publisher ? ` · NXB: ${escapeHtml(item.publisher)}` : ''}
                ${item.publicationYear ? ` (${item.publicationYear})` : ''}
              </div>
              <div style="background:#f8fafc;padding:8px 10px;border-radius:6px;font-size:12.5px;color:#475569;margin-bottom:10px;border-left:3px solid #6f42c1;">
                <strong>Lý do:</strong> ${escapeHtml(item.reason || 'Phục vụ học tập & nghiên cứu')}
              </div>
              ${item.referenceUrl ? `<div style="font-size:12px;margin-bottom:8px;"><a href="${escapeHtml(item.referenceUrl)}" target="_blank" rel="noopener" style="color:#0284c7;">🔗 Xem link tham khảo</a></div>` : ''}
            </div>
            <div style="border-top:1px solid #f1f5f9;padding-top:10px;display:flex;justify-content:space-between;align-items:center;gap:8px;">
              <small style="color:#94a3b8;font-size:11.5px;">Đề xuất: ${escapeHtml(item.user?.fullName || item.user?.username || 'Sinh viên')}</small>
              <button class="button button-small" style="background:${item.hasVoted ? '#e2e8f0' : '#fef3c7'};color:${item.hasVoted ? '#64748b' : '#b45309'};border:1px solid ${item.hasVoted ? '#cbd5e1' : '#fde68a'};font-weight:700;" onclick="voteOpacAcquisition(${item.id})">
                ${item.hasVoted ? '✓ Đã bình chọn' : '👍 Bình chọn'}
              </button>
            </div>
          </article>
        `;
      }).join('');
    } catch (err) {
      container.innerHTML = `<p style="color:red;grid-column:1/-1;">Lỗi tải danh sách đề xuất: ${escapeHtml(err.message)}</p>`;
    }
  }

  window.voteOpacAcquisition = async function (id) {
    try {
      await api(`/acquisitions/${id}/vote`, { method: 'POST' });
      notify('Đã ghi nhận bình chọn của bạn thành công! 🔥');
      await loadOpacAcquisitions();
    } catch (err) {
      notify(err.message, true);
    }
  };


  // ==========================================
  // QUẢN LÝ THƯ VIỆN SỐ (E-LIBRARY)
  // ==========================================
  function initElibraryEvents() {
    if (state.elibEventsBound) return;
    state.elibEventsBound = true;

    const dropZone = $('elibDropZone');
    const fileInput = $('elibFileInput');
    const form = $('elibraryUploadForm');
    const refreshBtn = $('refreshElibrary');

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        loadElibrary();
        notify('Đã làm mới danh mục thư viện số');
      });
    }

    if (dropZone && fileInput) {
      dropZone.addEventListener('click', () => fileInput.click());

      ['dragenter', 'dragover'].forEach((eventName) => {
        dropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropZone.classList.add('drag-active');
        });
      });

      ['dragleave', 'dragend'].forEach((eventName) => {
        dropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropZone.classList.remove('drag-active');
        });
      });

      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-active');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
          uploadElibFile(e.dataTransfer.files[0]);
        }
      });

      fileInput.addEventListener('change', () => {
        if (fileInput.files && fileInput.files.length) {
          uploadElibFile(fileInput.files[0]);
        }
      });
    }

    function uploadElibFile(file) {
      if (!file) return;
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['pdf', 'epub'].includes(ext || '')) {
        notify('Định dạng tệp không hợp lệ! Chỉ chấp nhận file .pdf hoặc .epub', true);
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        notify('Dung lượng tệp vượt quá giới hạn 50MB!', true);
        return;
      }

      const progressWrap = $('elibUploadProgress');
      const progressBar = $('elibProgressBar');
      const feedback = $('elibFileFeedback');
      const badge = $('elibFileBadge');

      if (progressWrap) progressWrap.style.display = 'block';
      if (progressBar) progressBar.style.width = '25%';
      if (feedback) feedback.style.display = 'block';
      if (badge) {
        badge.style.background = '#e0f2fe';
        badge.style.color = '#0369a1';
        badge.innerHTML = `⏳ Đang tải lên: <strong>${escapeHtml(file.name)}</strong> (${(file.size / 1024 / 1024).toFixed(2)} MB)...`;
      }

      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/books/upload-pdf');
      const token = state.token || localStorage.getItem('token');
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable && progressBar) {
          const percent = Math.round((ev.loaded / ev.total) * 100);
          progressBar.style.width = `${percent}%`;
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            if ($('elibFileUrl')) $('elibFileUrl').value = res.pdfUrl;
            if (progressBar) progressBar.style.width = '100%';
            if (badge) {
              badge.style.background = '#dcfce7';
              badge.style.color = '#166534';
              badge.innerHTML = `✅ <strong>${escapeHtml(file.name)}</strong> (${(file.size / 1024 / 1024).toFixed(2)} MB) · Sẵn sàng gắn vào sách!`;
            }
            notify('Tải lên tệp thành công! Hãy chọn đầu sách và nhấn [Lưu tài liệu số].');
          } catch (e) {
            notify('Lỗi đọc phản hồi upload: ' + e.message, true);
          }
        } else {
          let errMsg = 'Tải lên thất bại';
          try { errMsg = JSON.parse(xhr.responseText).message || errMsg; } catch (_) { }
          notify(errMsg, true);
          if (feedback) feedback.style.display = 'none';
        }
        setTimeout(() => {
          if (progressWrap) progressWrap.style.display = 'none';
        }, 1200);
      };

      xhr.onerror = () => {
        notify('Lỗi kết nối khi tải lên tệp!', true);
        if (progressWrap) progressWrap.style.display = 'none';
      };

      xhr.send(formData);
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const bookId = $('elibBookSelect')?.value;
        const pdfUrl = $('elibFileUrl')?.value.trim();
        const pdfPermission = $('elibPermission')?.value || 'PUBLIC';
        const digitalFormat = $('elibFormat')?.value || 'PDF';
        const previewPages = Number($('elibPreviewPages')?.value) || 5;

        if (!bookId) {
          notify('Vui lòng chọn đầu sách cần gắn tài liệu số!', true);
          return;
        }
        if (!pdfUrl) {
          notify('Vui lòng kéo thả file hoặc dán liên kết tài liệu số!', true);
          return;
        }

        try {
          await api(`/books/${bookId}`, {
            method: 'PATCH',
            body: JSON.stringify({ pdfUrl, pdfPermission, digitalFormat, previewPages }),
          });
          notify('Đã lưu tài liệu số và phân quyền DRM thành công! 🎉');
          if ($('elibFileFeedback')) $('elibFileFeedback').style.display = 'none';
          if ($('elibFileUrl')) $('elibFileUrl').value = '';
          if ($('elibBookSelect')) $('elibBookSelect').value = '';
          if (fileInput) fileInput.value = '';
          loadElibrary();
          void loadBooks(1);
        } catch (err) {
          notify('Lỗi khi lưu tài liệu số: ' + err.message, true);
        }
      });
    }
  }

  async function loadElibrary() {
    initElibraryEvents();
    try {
      const digitalBooks = await api('/books/digital');
      const total = digitalBooks.length;
      const downloadable = digitalBooks.filter((b) => b.pdfPermission !== 'NO_DOWNLOAD').length;
      const protectedCount = digitalBooks.filter((b) => b.pdfPermission === 'NO_DOWNLOAD').length;
      const totalViews = digitalBooks.reduce((sum, b) => sum + (Number(b.digitalViews) || 0), 0);
      const totalDownloads = digitalBooks.reduce((sum, b) => sum + (Number(b.digitalDownloads) || 0), 0);

      if ($('statDigitalTotal')) $('statDigitalTotal').textContent = total;
      if ($('statDigitalDownloadable')) $('statDigitalDownloadable').textContent = downloadable;
      if ($('statDigitalProtected')) $('statDigitalProtected').textContent = protectedCount;
      if ($('statDigitalViews')) $('statDigitalViews').textContent = totalViews.toLocaleString('vi-VN');
      if ($('statDigitalDownloads')) $('statDigitalDownloads').textContent = totalDownloads.toLocaleString('vi-VN');

      // Populate book select
      const bookSelect = $('elibBookSelect');
      if (bookSelect) {
        if (!state.books || !state.books.length) {
          try {
            const bRes = await api('/books?limit=150');
            state.books = Array.isArray(bRes) ? bRes : (bRes.items || []);
          } catch (_) { }
        }
        if (state.books) {
          bookSelect.innerHTML = '<option value="">-- Chọn sách cần gắn file số --</option>' +
            state.books.map((b) => `<option value="${b.id}">${escapeHtml(b.title)} (${escapeHtml(b.author)})</option>`).join('');
        }
      }

      const tbody = $('elibraryTableBody');
      if (!tbody) return;

      if (!digitalBooks.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#888;padding:2rem;">Chưa có tài liệu số nào trong thư viện. Hãy sử dụng form trên để đăng tải file đầu tiên.</td></tr>';
        return;
      }

      tbody.innerHTML = digitalBooks.map((b) => {
        const isEpub = (b.digitalFormat === 'EPUB') || (b.pdfUrl || '').toLowerCase().endsWith('.epub');
        const formatBadge = isEpub
          ? '<span class="status-badge" style="background:#fef3c7;color:#b45309;font-weight:600;padding:3px 8px;border-radius:999px;">📱 EPUB</span>'
          : '<span class="status-badge" style="background:#e0f2fe;color:#0369a1;font-weight:600;padding:3px 8px;border-radius:999px;">📄 PDF</span>';

        let permBadge = '';
        const previewTag = b.pdfPermission === 'NO_DOWNLOAD'
          ? `<br><small style="font-size:11px;color:#9f1239;">Xem trước ${b.previewPages || 5} trang</small>` : '';
        if (b.pdfPermission === 'NO_DOWNLOAD') {
          permBadge = `<span class="status-badge" style="background:#fee2e2;color:#991b1b;border:1px solid #fecdd3;padding:3px 8px;border-radius:999px;font-size:12px;font-weight:600;">🔒 Chỉ xem (DRM)</span>${previewTag}`;
        } else if (b.pdfPermission === 'READER_ONLY') {
          permBadge = '<span class="status-badge" style="background:#fef3c7;color:#92400e;padding:3px 8px;border-radius:999px;font-size:12px;font-weight:600;">👤 Độc giả tải</span>';
        } else {
          permBadge = '<span class="status-badge" style="background:#dcfce7;color:#166534;padding:3px 8px;border-radius:999px;font-size:12px;font-weight:600;">🌐 Tải tự do</span>';
        }

        const views = (Number(b.digitalViews) || 0).toLocaleString('vi-VN');
        const downloads = (Number(b.digitalDownloads) || 0).toLocaleString('vi-VN');

        return `
          <tr>
            <td>${formatBadge}</td>
            <td><strong>${escapeHtml(b.title)}</strong></td>
            <td>${escapeHtml(b.author)}</td>
            <td>${escapeHtml(b.category?.name || 'Tài liệu số')}</td>
            <td>${permBadge}</td>
            <td style="text-align:center;"><strong style="color:#6f42c1;">👁️ ${views}</strong></td>
            <td style="text-align:center;"><strong style="color:#166534;">⬇️ ${downloads}</strong></td>
            <td>
              <div class="button-row" style="margin:0;gap:4px;">
                <button class="button button-primary button-small" style="background:#0284c7;" data-elib-read="${escapeHtml(b.pdfUrl)}" data-title="${escapeHtml(b.title)}" data-id="${b.id}" data-perm="${b.pdfPermission || 'PUBLIC'}" data-preview="${b.previewPages || 5}" data-fmt="${isEpub ? 'EPUB' : 'PDF'}">📖 Đọc thử</button>
                <button class="button button-light button-small" data-elib-remove="${b.id}" style="color:#ef4444;" title="Gỡ file số khỏi đầu sách">✕ Gỡ file</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      tbody.querySelectorAll('[data-elib-read]').forEach((btn) => {
        btn.addEventListener('click', () => openPdfViewer(btn.dataset.elibRead, btn.dataset.title, btn.dataset.id, btn.dataset.perm, btn.dataset.preview, btn.dataset.fmt));
      });

      tbody.querySelectorAll('[data-elib-remove]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!window.confirm('Bạn có chắc muốn gỡ file số khỏi đầu sách này?')) return;
          try {
            await api(`/books/${btn.dataset.elibRemove}`, {
              method: 'PATCH',
              body: JSON.stringify({ pdfUrl: null, pdfPermission: 'PUBLIC' }),
            });
            notify('Đã gỡ tệp số khỏi đầu sách.');
            loadElibrary();
            void loadBooks(1);
          } catch (e) {
            notify(e.message, true);
          }
        });
      });
    } catch (e) {
      notify('Lỗi tải thư viện số: ' + e.message, true);
    }
  }


  // ==========================================
  // QUẢN LÝ NGÂN SÁCH THU MUA (BUDGETS)
  // ==========================================
  let currentBudgetTransactions = [];
  let currentBudgetYearData = null;
  let budgetQuarterlyChartInstance = null;
  let budgetDoughnutChartInstance = null;
  let budgetsInitialized = false;

  async function loadBudgets() {
    const year = $('budgetYearSelect')?.value || 2026;
    try {
      const data = await api(`/acquisitions/budget?year=${year}`);
      currentBudgetYearData = data;
      currentBudgetTransactions = data.transactions || [];

      if ($('statBudgetTotal')) $('statBudgetTotal').textContent = money(data.totalBudget || 0);
      if ($('statBudgetSpent')) $('statBudgetSpent').textContent = money(data.totalSpent || 0);
      if ($('statBudgetRemaining')) $('statBudgetRemaining').textContent = money(data.remainingBudget || 0);
      if ($('statBudgetPercent')) $('statBudgetPercent').textContent = `${data.spentPercentage || 0}%`;

      const b = data.budget || {};
      if ($('q1Alloc')) $('q1Alloc').textContent = money(b.q1Allocation || 50000000);
      if ($('q2Alloc')) $('q2Alloc').textContent = money(b.q2Allocation || 50000000);
      if ($('q3Alloc')) $('q3Alloc').textContent = money(b.q3Allocation || 50000000);
      if ($('q4Alloc')) $('q4Alloc').textContent = money(b.q4Allocation || 50000000);

      const qs = data.quarterlySpent || {};
      if ($('q1Spent')) $('q1Spent').textContent = money(qs.Q1 || 0);
      if ($('q2Spent')) $('q2Spent').textContent = money(qs.Q2 || 0);
      if ($('q3Spent')) $('q3Spent').textContent = money(qs.Q3 || 0);
      if ($('q4Spent')) $('q4Spent').textContent = money(qs.Q4 || 0);

      // fill form
      if ($('cfgBudgetTotal')) $('cfgBudgetTotal').value = data.totalBudget || 200000000;
      if ($('cfgQ1')) $('cfgQ1').value = b.q1Allocation || 50000000;
      if ($('cfgQ2')) $('cfgQ2').value = b.q2Allocation || 50000000;
      if ($('cfgQ3')) $('cfgQ3').value = b.q3Allocation || 50000000;
      if ($('cfgQ4')) $('cfgQ4').value = b.q4Allocation || 50000000;

      // CẢNH BÁO TIẾN ĐỘ GIẢI NGÂN & BURN RATE
      updateBudgetSmartAlert(data);

      // VẼ BIỂU ĐỒ TRỰC QUAN HÓA DÒNG TIỀN (CHART.JS)
      renderBudgetCharts(b, qs, data);

      // HIỂN THỊ BẢNG GIAO DỊCH & CHI TIÊU
      renderBudgetTransactions();

      // KHỞI TẠO CÁC SỰ KIỆN NẾU CHƯA GẮN
      initBudgetListeners();
    } catch (e) {
      notify('Lỗi tải ngân sách: ' + e.message, true);
    }
  }
  window.loadBudgets = loadBudgets;

  function updateBudgetSmartAlert(data) {
    const banner = $('budgetAlertBanner');
    const titleEl = $('budgetAlertTitle');
    const descEl = $('budgetAlertDesc');
    const iconEl = $('budgetAlertIcon');
    const burnRateText = $('budgetBurnRateText');
    const progressBar = $('budgetProgressBar');
    if (!banner) return;

    const percent = data.spentPercentage || 0;
    if (burnRateText) burnRateText.textContent = `${percent}%`;

    banner.style.display = 'flex';
    if (percent >= 100 || data.totalSpent > data.totalBudget) {
      banner.style.background = '#fef2f2';
      banner.style.borderColor = '#ef4444';
      if (titleEl) {
        titleEl.textContent = `🚨 BÁO ĐỘNG ĐỎ: ĐÃ VƯỢT TRẦN HẠN MỨC NGÂN SÁCH NĂM (${percent}%)`;
        titleEl.style.color = '#991b1b';
      }
      if (descEl) {
        descEl.textContent = `Tổng giải ngân (${money(data.totalSpent)}) đã vượt trần ngân sách phê duyệt (${money(data.totalBudget)}). Cần tạm ngừng lập thêm đơn đặt hàng PO mới!`;
        descEl.style.color = '#7f1d1d';
      }
      if (iconEl) iconEl.textContent = '🚨';
      if (progressBar) {
        progressBar.style.width = '100%';
        progressBar.style.background = '#dc3545';
      }
    } else if (percent >= 80) {
      banner.style.background = '#fffbeb';
      banner.style.borderColor = '#f59e0b';
      if (titleEl) {
        titleEl.textContent = `⚠️ CẢNH BÁO TIẾN ĐỘ GIẢI NGÂN CAO (${percent}%)`;
        titleEl.style.color = '#92400e';
      }
      if (descEl) {
        descEl.textContent = `Kinh phí đã chi ${money(data.totalSpent)} trên tổng ${money(data.totalBudget)}. Số dư khả dụng chỉ còn ${money(data.remainingBudget)}. Đề nghị rà soát kỹ các đơn hàng sắp tới.`;
        descEl.style.color = '#78350f';
      }
      if (iconEl) iconEl.textContent = '⚠️';
      if (progressBar) {
        progressBar.style.width = `${Math.min(100, percent)}%`;
        progressBar.style.background = '#ea580c';
      }
    } else {
      banner.style.background = '#f0fdf4';
      banner.style.borderColor = '#86efac';
      if (titleEl) {
        titleEl.textContent = `✅ TIẾN ĐỘ GIẢI NGÂN TRONG HẠN MỨC AN TOÀN (${percent}%)`;
        titleEl.style.color = '#166534';
      }
      if (descEl) {
        descEl.textContent = `Dòng tiền ngân sách duy trì ổn định. Hạn mức khả dụng còn lại: ${money(data.remainingBudget)}.`;
        descEl.style.color = '#14532d';
      }
      if (iconEl) iconEl.textContent = '✅';
      if (progressBar) {
        progressBar.style.width = `${Math.max(5, Math.min(100, percent))}%`;
        progressBar.style.background = '#16a34a';
      }
    }
  }

  function renderBudgetCharts(budget, quarterlySpent, data) {
    const q1Alloc = Number(budget?.q1Allocation || 50000000);
    const q2Alloc = Number(budget?.q2Allocation || 50000000);
    const q3Alloc = Number(budget?.q3Allocation || 50000000);
    const q4Alloc = Number(budget?.q4Allocation || 50000000);
    const q1Sp = Number(quarterlySpent?.Q1 || 0);
    const q2Sp = Number(quarterlySpent?.Q2 || 0);
    const q3Sp = Number(quarterlySpent?.Q3 || 0);
    const q4Sp = Number(quarterlySpent?.Q4 || 0);
    const spent = Number(data?.totalSpent || 0);
    const remaining = Math.max(0, Number(data?.remainingBudget || 0));
    const totalB = Number(data?.totalBudget || (spent + remaining) || 1);

    // 1. Biểu đồ cột: Dự toán vs Thực chi 4 Quý
    const barCanvas = $('budgetQuarterlyBarChart');
    if (barCanvas) {
      if (typeof window.Chart !== 'undefined') {
        if (budgetQuarterlyChartInstance) budgetQuarterlyChartInstance.destroy();
        const ctx = barCanvas.getContext('2d');
        budgetQuarterlyChartInstance = new window.Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['Quý 1 (Tháng 1-3)', 'Quý 2 (Tháng 4-6)', 'Quý 3 (Tháng 7-9)', 'Quý 4 (Tháng 10-12)'],
            datasets: [
              {
                label: 'Hạn mức dự toán',
                data: [q1Alloc, q2Alloc, q3Alloc, q4Alloc],
                backgroundColor: 'rgba(111, 66, 193, 0.75)',
                borderColor: '#6f42c1',
                borderWidth: 1.5,
                borderRadius: 4,
              },
              {
                label: 'Thực chi đã giải ngân',
                data: [q1Sp, q2Sp, q3Sp, q4Sp],
                backgroundColor: 'rgba(220, 53, 69, 0.8)',
                borderColor: '#dc3545',
                borderWidth: 1.5,
                borderRadius: 4,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
                labels: { font: { size: 12, weight: '600' } },
              },
              tooltip: {
                callbacks: {
                  label: (ctx) => ` ${ctx.dataset.label}: ${money(ctx.raw)}`,
                },
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: (val) => `${val / 1000000} tr`,
                  font: { size: 11 },
                },
                grid: { color: '#f1f5f9' },
              },
              x: {
                grid: { display: false },
                ticks: { font: { size: 12 } },
              },
            },
          },
        });
      } else {
        // Native Canvas 2D fallback for Quarterly Bar Chart
        const ctx = barCanvas.getContext('2d');
        if (ctx) {
          const w = Math.max(340, barCanvas.clientWidth || 400);
          const h = 260;
          barCanvas.width = w * (window.devicePixelRatio || 1);
          barCanvas.height = h * (window.devicePixelRatio || 1);
          barCanvas.style.height = `${h}px`;
          ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
          ctx.clearRect(0, 0, w, h);

          const quarters = ['Quý 1', 'Quý 2', 'Quý 3', 'Quý 4'];
          const allocs = [q1Alloc, q2Alloc, q3Alloc, q4Alloc];
          const spents = [q1Sp, q2Sp, q3Sp, q4Sp];
          const maxVal = Math.max(10000000, ...allocs, ...spents);

          // Legend
          ctx.font = '11px Segoe UI, sans-serif';
          ctx.fillStyle = '#6f42c1';
          ctx.fillRect(40, 10, 12, 8);
          ctx.fillText('Hạn mức dự toán', 58, 17);
          ctx.fillStyle = '#dc3545';
          ctx.fillRect(180, 10, 12, 8);
          ctx.fillText('Thực chi giải ngân', 198, 17);

          const padL = 45;
          const padB = 40;
          const padT = 32;
          const chartW = w - padL - 20;
          const chartH = h - padT - padB;
          const groupW = chartW / 4;
          const barW = Math.min(28, groupW * 0.35);

          // Grid lines
          ctx.strokeStyle = '#e2e8f0';
          ctx.fillStyle = '#64748b';
          ctx.textAlign = 'right';
          for (let t = 0; t <= 4; t++) {
            const y = padT + (chartH * t) / 4;
            ctx.beginPath();
            ctx.moveTo(padL, y);
            ctx.lineTo(w - 20, y);
            ctx.stroke();
            const valM = Math.round((maxVal * (4 - t)) / 4 / 1000000);
            ctx.fillText(`${valM} tr`, padL - 6, y + 3);
          }

          quarters.forEach((q, i) => {
            const cx = padL + i * groupW + groupW / 2;
            const hAlloc = (allocs[i] / maxVal) * chartH;
            const hSpent = (spents[i] / maxVal) * chartH;

            // Bar 1: Alloc
            ctx.fillStyle = '#6f42c1';
            ctx.beginPath();
            ctx.roundRect(cx - barW - 2, padT + chartH - hAlloc, barW, hAlloc, [3, 3, 0, 0]);
            ctx.fill();

            // Bar 2: Spent
            ctx.fillStyle = '#dc3545';
            ctx.beginPath();
            ctx.roundRect(cx + 2, padT + chartH - hSpent, barW, hSpent, [3, 3, 0, 0]);
            ctx.fill();

            // X-label
            ctx.fillStyle = '#1e293b';
            ctx.textAlign = 'center';
            ctx.font = '11px Segoe UI, sans-serif';
            ctx.fillText(q, cx, h - 14);
          });
        }
      }
    }

    // 2. Biểu đồ Doughnut: Tỷ lệ Đã chi vs Còn lại
    const doughnutCanvas = $('budgetDoughnutChart');
    if (doughnutCanvas) {
      if (typeof window.Chart !== 'undefined') {
        if (budgetDoughnutChartInstance) budgetDoughnutChartInstance.destroy();
        const ctx2 = doughnutCanvas.getContext('2d');
        budgetDoughnutChartInstance = new window.Chart(ctx2, {
          type: 'doughnut',
          data: {
            labels: ['Đã giải ngân', 'Hạn mức khả dụng còn lại'],
            datasets: [
              {
                data: [spent, remaining],
                backgroundColor: ['#dc3545', '#16a34a'],
                hoverBackgroundColor: ['#b91c1c', '#15803d'],
                borderWidth: 2,
                borderColor: '#ffffff',
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '68%',
            plugins: {
              legend: {
                position: 'bottom',
                labels: { font: { size: 12, weight: '600' } },
              },
              tooltip: {
                callbacks: {
                  label: (ctx) => ` ${ctx.label}: ${money(ctx.raw)} (${Math.round((ctx.raw / totalB) * 100)}%)`,
                },
              },
            },
          },
        });
      } else {
        // Native Canvas 2D fallback for Doughnut Chart
        const ctx2 = doughnutCanvas.getContext('2d');
        if (ctx2) {
          const w = Math.max(240, doughnutCanvas.clientWidth || 280);
          const h = 240;
          doughnutCanvas.width = w * (window.devicePixelRatio || 1);
          doughnutCanvas.height = h * (window.devicePixelRatio || 1);
          doughnutCanvas.style.height = `${h}px`;
          ctx2.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
          ctx2.clearRect(0, 0, w, h);

          const cx = w / 2;
          const cy = h * 0.42;
          const radius = Math.min(cx - 20, cy - 10);
          const spentRatio = spent / totalB;
          const spentAngle = spentRatio * 2 * Math.PI;

          // Arc for Spent
          ctx2.fillStyle = '#dc3545';
          ctx2.beginPath();
          ctx2.moveTo(cx, cy);
          ctx2.arc(cx, cy, radius, -0.5 * Math.PI, -0.5 * Math.PI + spentAngle);
          ctx2.closePath();
          ctx2.fill();

          // Arc for Remaining
          ctx2.fillStyle = '#16a34a';
          ctx2.beginPath();
          ctx2.moveTo(cx, cy);
          ctx2.arc(cx, cy, radius, -0.5 * Math.PI + spentAngle, 1.5 * Math.PI);
          ctx2.closePath();
          ctx2.fill();

          // Hole
          ctx2.fillStyle = '#ffffff';
          ctx2.beginPath();
          ctx2.arc(cx, cy, radius * 0.65, 0, 2 * Math.PI);
          ctx2.fill();

          // Text inside donut
          ctx2.fillStyle = '#0f172a';
          ctx2.textAlign = 'center';
          ctx2.font = 'bold 15px Segoe UI, sans-serif';
          ctx2.fillText(`${Math.round(spentRatio * 100)}%`, cx, cy + 4);

          // Legend below
          ctx2.font = '11px Segoe UI, sans-serif';
          ctx2.fillStyle = '#dc3545';
          ctx2.fillRect(cx - 90, h - 30, 10, 10);
          ctx2.fillStyle = '#334155';
          ctx2.textAlign = 'left';
          ctx2.fillText(`Đã chi: ${money(spent)}`, cx - 74, h - 21);

          ctx2.fillStyle = '#16a34a';
          ctx2.fillRect(cx - 90, h - 14, 10, 10);
          ctx2.fillStyle = '#334155';
          ctx2.fillText(`Còn lại: ${money(remaining)}`, cx - 74, h - 5);
        }
      }
    }
  }

  function renderBudgetTransactions() {
    const tbody = $('budgetTxTableBody');
    if (!tbody) return;

    const quarterFilter = $('budgetTxQuarterFilter')?.value || '';
    const searchVal = ($('budgetTxSearchInput')?.value || '').trim().toLowerCase();

    let list = currentBudgetTransactions;

    if (quarterFilter) {
      list = list.filter((item) => item.quarter === quarterFilter);
    }
    if (searchVal) {
      list = list.filter((item) => {
        const code = (item.orderCode || '').toLowerCase();
        const sup = (item.supplierName || '').toLowerCase();
        const staff = (item.createdByName || '').toLowerCase();
        return code.includes(searchVal) || sup.includes(searchVal) || staff.includes(searchVal);
      });
    }

    const filteredTotal = list.reduce((acc, it) => acc + Number(it.totalAmount || 0), 0);
    if ($('budgetTxFilteredTotal')) {
      $('budgetTxFilteredTotal').textContent = money(filteredTotal);
    }
    if ($('budgetTxBadge')) {
      $('budgetTxBadge').textContent = `${list.length} đơn (${money(filteredTotal)})`;
    }

    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:#888;">Không tìm thấy giao dịch PO phù hợp với tiêu chí lọc.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map((t) => {
      let statusBadge = `<span class="status-badge" style="background:#f1f5f9;color:#475569;font-weight:700;">${escapeHtml(t.status)}</span>`;
      if (t.status === 'COMPLETED') {
        statusBadge = '<span class="status-badge" style="background:#dcfce7;color:#166534;font-weight:700;">✓ Hoàn tất</span>';
      } else if (t.status === 'ORDERED') {
        statusBadge = '<span class="status-badge" style="background:#e0f2fe;color:#0369a1;font-weight:700;">Đã đặt hàng</span>';
      } else if (t.status === 'APPROVED') {
        statusBadge = '<span class="status-badge" style="background:#fef3c7;color:#92400e;font-weight:700;">Đã duyệt chi</span>';
      } else if (t.status === 'CANCELLED') {
        statusBadge = '<span class="status-badge" style="background:#fee2e2;color:#991b1b;font-weight:700;">Đã hủy</span>';
      }

      return `
        <tr>
          <td><strong style="color:#1e293b;font-family:monospace;font-size:13.5px;">${escapeHtml(t.orderCode)}</strong></td>
          <td><strong>${escapeHtml(t.supplierName || 'Chưa xác định')}</strong></td>
          <td style="text-align:center;"><span class="status-badge" style="background:#ede9fe;color:#5b21b6;font-weight:700;">${t.quarter || 'Q1'}</span></td>
          <td style="font-size:12.5px;color:#475569;">${formatDateTime(t.createdAt)}</td>
          <td style="text-align:right;"><strong style="color:#dc3545;font-size:14px;">${money(t.totalAmount)}</strong></td>
          <td style="text-align:center;">${statusBadge}</td>
          <td style="font-size:13px;color:#334155;">${escapeHtml(t.createdByName || 'Thủ thư')}</td>
          <td style="text-align:center;">
            <button class="button button-light button-small" style="font-size:12px;padding:3px 8px;" onclick="openPoInvoiceDetail(${t.id})">👁️ Chi tiết</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function initBudgetListeners() {
    if (budgetsInitialized) return;
    budgetsInitialized = true;

    $('budgetYearSelect')?.addEventListener('change', () => void loadBudgets());
    $('refreshBudgets')?.addEventListener('click', () => {
      void loadBudgets();
      notify('Đã làm mới dữ liệu ngân sách thu mua!');
    });

    $('budgetTxQuarterFilter')?.addEventListener('change', () => renderBudgetTransactions());
    $('budgetTxSearchInput')?.addEventListener('input', () => renderBudgetTransactions());

    // Form cấu hình ngân sách
    $('budgetConfigForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const year = Number($('budgetYearSelect')?.value || 2026);
      const payload = {
        year,
        totalBudget: Number($('cfgBudgetTotal').value) || 0,
        q1Allocation: Number($('cfgQ1').value) || 0,
        q2Allocation: Number($('cfgQ2').value) || 0,
        q3Allocation: Number($('cfgQ3').value) || 0,
        q4Allocation: Number($('cfgQ4').value) || 0,
      };

      try {
        await api('/acquisitions/budget', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        notify(`Đã cập nhật và lưu hạn mức ngân sách năm ${year} thành công!`);
        void loadBudgets();
      } catch (err) {
        notify('Lỗi lưu ngân sách: ' + err.message, true);
      }
    });

    // Xuất file báo cáo tài chính CSV
    $('exportBudgetReportBtn')?.addEventListener('click', () => exportBudgetFinancialCsv());

    // In báo cáo quyết toán tài chính
    $('printSettlementReportBtn')?.addEventListener('click', () => printBudgetSettlementReport());
  }

  // Mở modal xem chi tiết đơn PO & hóa đơn
  window.openPoInvoiceDetail = async function (poId) {
    try {
      const po = await api(`/acquisitions/orders/${poId}`);
      if (!po) {
        notify('Không tìm thấy thông tin đơn hàng PO.', true);
        return;
      }

      $('poDetailCode').textContent = po.orderCode || `#PO-${po.id}`;
      $('poDetailSupplier').textContent = `${po.supplierName || 'Chưa xác định'}${po.supplierPhone ? ` (${po.supplierPhone})` : ''}`;

      const d = po.createdAt ? new Date(po.createdAt) : new Date();
      const month = d.getMonth() + 1;
      let q = 'Quý 4';
      if (month <= 3) q = 'Quý 1';
      else if (month <= 6) q = 'Quý 2';
      else if (month <= 9) q = 'Quý 3';

      $('poDetailQuarter').textContent = q;
      $('poDetailDate').textContent = formatDateTime(po.createdAt);
      $('poDetailStaff').textContent = po.createdByName || 'Thủ thư kho sách';
      $('poDetailNotes').textContent = po.note || 'Không có ghi chú thêm.';
      $('poDetailTotalAmount').textContent = money(po.totalAmount || 0);

      let statusBadge = `<span class="status-badge" style="background:#f1f5f9;color:#475569;font-weight:700;">${escapeHtml(po.status)}</span>`;
      if (po.status === 'COMPLETED') statusBadge = '<span class="status-badge" style="background:#dcfce7;color:#166534;font-weight:700;">✓ Hoàn tất giải ngân</span>';
      else if (po.status === 'ORDERED') statusBadge = '<span class="status-badge" style="background:#e0f2fe;color:#0369a1;font-weight:700;">Đã đặt hàng</span>';
      else if (po.status === 'APPROVED') statusBadge = '<span class="status-badge" style="background:#fef3c7;color:#92400e;font-weight:700;">Đã phê duyệt</span>';
      $('poDetailStatusBadge').innerHTML = statusBadge;

      const itemsBody = $('poDetailItemsBody');
      const items = po.items || [];
      if (!items.length) {
        itemsBody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:12px;color:#888;">Đơn hàng tổng hợp không có danh sách chi tiết từng cuốn lẻ.</td></tr>';
      } else {
        itemsBody.innerHTML = items.map((it) => `
          <tr>
            <td>
              <strong>${escapeHtml(it.bookTitle || 'Ấn phẩm')}</strong>
              ${it.author ? `<div style="font-size:11.5px;color:#64748b;">Tác giả: ${escapeHtml(it.author)}</div>` : ''}
            </td>
            <td style="text-align:center;">${it.quantity}</td>
            <td style="text-align:right;">${money(it.unitPrice)}</td>
            <td style="text-align:right;font-weight:700;color:#1e293b;">${money(it.totalPrice || (it.quantity * it.unitPrice))}</td>
          </tr>
        `).join('');
      }

      $('poDetailPrintBtn').onclick = () => {
        window.printPoVoucher(po, q);
      };

      $('poInvoiceDetailDialog').showModal();
    } catch (e) {
      notify('Lỗi tải chi tiết PO: ' + e.message, true);
    }
  };

  window.printPoVoucher = function (po, quarter) {
    const printWindow = window.open('', '_blank', 'width=800,height=750');
    if (!printWindow) {
      notify('Vui lòng cho phép popup để in phiếu chi.', true);
      return;
    }

    const itemsHtml = (po.items || []).map((it, idx) => `
      <tr>
        <td style="border:1px solid #000;text-align:center;padding:6px;">${idx + 1}</td>
        <td style="border:1px solid #000;padding:6px;">${escapeHtml(it.bookTitle || 'Ấn phẩm')}${it.author ? ` (${escapeHtml(it.author)})` : ''}</td>
        <td style="border:1px solid #000;text-align:center;padding:6px;">${it.quantity}</td>
        <td style="border:1px solid #000;text-align:right;padding:6px;">${money(it.unitPrice)}</td>
        <td style="border:1px solid #000;text-align:right;padding:6px;font-weight:bold;">${money(it.totalPrice || (it.quantity * it.unitPrice))}</td>
      </tr>
    `).join('') || `<tr><td colspan="5" style="border:1px solid #000;text-align:center;padding:8px;">Chi phí mua sắm theo đơn hàng</td></tr>`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Phiếu chi mua sắm ${po.orderCode}</title>
        <style>
          body { font-family: 'Times New Roman', Times, serif; padding: 24px 32px; color: #000; line-height: 1.4; }
          .hdr { display: flex; justify-content: space-between; margin-bottom: 24px; }
          .title { text-align: center; margin: 20px 0 10px 0; text-transform: uppercase; font-size: 20px; font-weight: bold; }
          .sub { text-align: center; margin-bottom: 24px; font-style: italic; }
          table { width: 100%; border-collapse: collapse; margin-top: 14px; }
          th { border: 1px solid #000; background: #f0f0f0; padding: 8px; font-size: 13px; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; margin-top: 48px; text-align: center; font-size: 13.5px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="hdr">
          <div style="text-align:center;">
            <strong>TRƯỜNG ĐẠI HỌC CÔNG NGHỆ</strong><br>
            <strong>THƯ VIỆN TRUNG TÂM</strong>
          </div>
          <div style="text-align:center;">
            <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br>
            Độc lập - Tự do - Hạnh phúc
          </div>
        </div>

        <div class="title">PHIẾU ĐỀ NGHỊ THANH TOÁN / GIẢI NGÂN PO</div>
        <div class="sub">Mã đơn: <strong>${escapeHtml(po.orderCode)}</strong> - Quý tài chính: <strong>${quarter || 'Q1'}</strong></div>

        <p><strong>Đơn vị cung cấp:</strong> ${escapeHtml(po.supplierName || 'NCC')} (SĐT: ${escapeHtml(po.supplierPhone || 'N/A')})</p>
        <p><strong>Ngày lập phiếu:</strong> ${formatDateTime(po.createdAt)} | <strong>Thủ thư phụ trách:</strong> ${escapeHtml(po.createdByName || 'Thủ thư')}</p>
        <p><strong>Nội dung mua sắm:</strong> ${escapeHtml(po.note || 'Bổ sung tài liệu sách in phục vụ đào tạo và nghiên cứu')}</p>

        <table>
          <thead>
            <tr>
              <th style="width:40px;">STT</th>
              <th>Tên sách / Tài liệu bổ sung</th>
              <th style="width:60px;">SL</th>
              <th style="width:110px;">Đơn giá</th>
              <th style="width:130px;">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr style="font-weight:bold;">
              <td colspan="4" style="border:1px solid #000;text-align:right;padding:8px;">TỔNG TIỀN THANH TOÁN:</td>
              <td style="border:1px solid #000;text-align:right;padding:8px;color:#000;font-size:15px;">${money(po.totalAmount)}</td>
            </tr>
          </tfoot>
        </table>

        <div class="signatures">
          <div>
            <strong>Người lập biểu</strong><br>
            <span style="font-size:12px;font-style:italic;">(Ký, ghi rõ họ tên)</span>
            <div style="margin-top:60px;font-weight:bold;">${escapeHtml(po.createdByName || 'Thủ thư')}</div>
          </div>
          <div>
            <strong>Kế toán trưởng</strong><br>
            <span style="font-size:12px;font-style:italic;">(Ký, ghi rõ họ tên)</span>
            <div style="margin-top:60px;font-weight:bold;">Nguyễn Văn Tài</div>
          </div>
          <div>
            <strong>Giám đốc Thư viện</strong><br>
            <span style="font-size:12px;font-style:italic;">(Ký duyệt)</span>
            <div style="margin-top:60px;font-weight:bold;">TS. Lê Quý Đôn</div>
          </div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  // Xuất file Excel / CSV báo cáo tài chính
  function exportBudgetFinancialCsv() {
    if (!currentBudgetYearData) {
      notify('Chưa có dữ liệu ngân sách để xuất báo cáo.', true);
      return;
    }

    const d = currentBudgetYearData;
    const year = d.year || 2026;
    const b = d.budget || {};
    const qs = d.quarterlySpent || {};

    const rows = [
      ['BÁO CÁO QUYẾT TOÁN TÀI CHÍNH & MUA SẮM THƯ VIỆN NĂM ' + year],
      ['Thời gian xuất báo cáo:', new Date().toLocaleString('vi-VN')],
      [],
      ['1. TỔNG QUAN HẠN MỨC NGÂN SÁCH NĂM ' + year],
      ['Tổng hạn mức phê duyệt (VNĐ):', d.totalBudget || 0],
      ['Tổng kinh phí đã giải ngân (VNĐ):', d.totalSpent || 0],
      ['Hạn mức khả dụng còn lại (VNĐ):', d.remainingBudget || 0],
      ['Tỷ lệ giải ngân (%):', (d.spentPercentage || 0) + '%'],
      [],
      ['2. PHÂN BỔ & GIẢI NGÂN THEO 4 QUÝ'],
      ['Quý tài chính', 'Hạn mức kế hoạch (VNĐ)', 'Thực chi giải ngân (VNĐ)', 'Còn lại (VNĐ)', 'Tỷ lệ (%)'],
      ['Quý 1', b.q1Allocation || 0, qs.Q1 || 0, (b.q1Allocation || 0) - (qs.Q1 || 0), Math.round(((qs.Q1 || 0) / (b.q1Allocation || 1)) * 100) + '%'],
      ['Quý 2', b.q2Allocation || 0, qs.Q2 || 0, (b.q2Allocation || 0) - (qs.Q2 || 0), Math.round(((qs.Q2 || 0) / (b.q2Allocation || 1)) * 100) + '%'],
      ['Quý 3', b.q3Allocation || 0, qs.Q3 || 0, (b.q3Allocation || 0) - (qs.Q3 || 0), Math.round(((qs.Q3 || 0) / (b.q3Allocation || 1)) * 100) + '%'],
      ['Quý 4', b.q4Allocation || 0, qs.Q4 || 0, (b.q4Allocation || 0) - (qs.Q4 || 0), Math.round(((qs.Q4 || 0) / (b.q4Allocation || 1)) * 100) + '%'],
      [],
      ['3. DANH SÁCH CHI TIẾT CÁC HÓA ĐƠN / ĐƠN HÀNG PO ĐÃ GIẢI NGÂN'],
      ['STT', 'Mã đơn PO', 'Nhà cung cấp', 'Quý', 'Ngày giải ngân', 'Số tiền chi (VNĐ)', 'Trạng thái', 'Thủ thư phụ trách', 'Ghi chú'],
    ];

    (currentBudgetTransactions || []).forEach((t, idx) => {
      rows.push([
        idx + 1,
        `"${t.orderCode || ''}"`,
        `"${(t.supplierName || '').replace(/"/g, '""')}"`,
        t.quarter || 'Q1',
        formatDateTime(t.createdAt),
        t.totalAmount || 0,
        t.status || '',
        `"${(t.createdByName || '').replace(/"/g, '""')}"`,
        `"${(t.note || '').replace(/"/g, '""')}"`,
      ]);
    });

    const csvContent = '\uFEFF' + rows.map((e) => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `BaoCao_NganSach_ThuMua_Nam_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notify(`Đã xuất file báo cáo tài chính BaoCao_NganSach_ThuMua_Nam_${year}.csv thành công!`);
  }

  // In Báo cáo Quyết toán tài chính PDF (A4)
  function printBudgetSettlementReport() {
    if (!currentBudgetYearData) {
      notify('Chưa có dữ liệu ngân sách để in báo cáo.', true);
      return;
    }

    const d = currentBudgetYearData;
    const year = d.year || 2026;
    const b = d.budget || {};
    const qs = d.quarterlySpent || {};

    const printWin = window.open('', '_blank', 'width=950,height=800');
    if (!printWin) {
      notify('Vui lòng cho phép mở popup để in báo cáo quyết toán.', true);
      return;
    }

    const txRowsHtml = (currentBudgetTransactions || []).map((t, idx) => `
      <tr>
        <td style="border:1px solid #000;text-align:center;padding:5px;">${idx + 1}</td>
        <td style="border:1px solid #000;font-family:monospace;font-weight:bold;padding:5px;">${escapeHtml(t.orderCode)}</td>
        <td style="border:1px solid #000;padding:5px;">${escapeHtml(t.supplierName || 'NCC')}</td>
        <td style="border:1px solid #000;text-align:center;padding:5px;">${t.quarter || 'Q1'}</td>
        <td style="border:1px solid #000;text-align:center;padding:5px;font-size:12px;">${formatDateTime(t.createdAt)}</td>
        <td style="border:1px solid #000;text-align:right;padding:5px;font-weight:bold;">${money(t.totalAmount)}</td>
        <td style="border:1px solid #000;text-align:center;padding:5px;font-size:12px;">${t.status === 'COMPLETED' ? 'Hoàn tất' : t.status}</td>
        <td style="border:1px solid #000;padding:5px;font-size:12px;">${escapeHtml(t.createdByName || 'Thủ thư')}</td>
      </tr>
    `).join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Báo cáo quyết toán ngân sách thu mua năm ${year}</title>
        <style>
          body { font-family: 'Times New Roman', Times, serif; padding: 30px 40px; color: #000; line-height: 1.45; font-size: 13.5px; }
          .hdr { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .title { text-align: center; margin: 24px 0 6px 0; text-transform: uppercase; font-size: 19px; font-weight: bold; }
          .sub { text-align: center; margin-bottom: 24px; font-style: italic; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; }
          th { border: 1px solid #000; background: #f2f2f2; padding: 7px; font-size: 13px; }
          td { border: 1px solid #000; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; margin-top: 40px; text-align: center; page-break-inside: avoid; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="hdr">
          <div style="text-align:center;">
            <strong>TRƯỜNG ĐẠI HỌC CÔNG NGHỆ</strong><br>
            <strong>THƯ VIỆN TRUNG TÂM</strong><br>
            <span style="font-size:12px;">Số: .... /BC-TVTT</span>
          </div>
          <div style="text-align:center;">
            <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br>
            <strong>Độc lập - Tự do - Hạnh phúc</strong><br>
            <span style="font-size:12px;">---------o0o---------</span>
          </div>
        </div>

        <div class="title">BÁO CÁO QUYẾT TOÁN THU CHI BỔ SUNG TÀI LIỆU NĂM HỌC ${year}</div>
        <div class="sub">(Áp dụng đối soát hạn mức ngân sách và danh mục hóa đơn đơn hàng PO đã giải ngân)</div>

        <h4 style="margin:16px 0 6px 0;">I. TỔNG HỢP TIẾN ĐỘ THỰC HIỆN DỰ TOÁN NĂM ${year}</h4>
        <p style="margin:4px 0;">• Tổng hạn mức được phê duyệt: <strong>${money(d.totalBudget)}</strong></p>
        <p style="margin:4px 0;">• Tổng kinh phí đã giải ngân: <strong style="color:#000;">${money(d.totalSpent)}</strong></p>
        <p style="margin:4px 0;">• Hạn mức khả dụng còn lại: <strong>${money(d.remainingBudget)}</strong> | Tỷ lệ giải ngân đạt: <strong>${d.spentPercentage}%</strong></p>

        <h4 style="margin:18px 0 6px 0;">II. BẢNG PHÂN BỔ & GIẢI NGÂN THEO CÁC QUÝ TÀI CHÍNH</h4>
        <table>
          <thead>
            <tr>
              <th>Quý tài chính</th>
              <th>Hạn mức dự toán (VNĐ)</th>
              <th>Thực chi giải ngân (VNĐ)</th>
              <th>Còn lại (VNĐ)</th>
              <th>Tỷ lệ giải ngân</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:6px;font-weight:bold;">Quý 1 (Tháng 1-3)</td>
              <td style="padding:6px;text-align:right;">${money(b.q1Allocation || 50000000)}</td>
              <td style="padding:6px;text-align:right;font-weight:bold;">${money(qs.Q1 || 0)}</td>
              <td style="padding:6px;text-align:right;">${money((b.q1Allocation || 50000000) - (qs.Q1 || 0))}</td>
              <td style="padding:6px;text-align:center;">${Math.round(((qs.Q1 || 0) / (b.q1Allocation || 1)) * 100)}%</td>
            </tr>
            <tr>
              <td style="padding:6px;font-weight:bold;">Quý 2 (Tháng 4-6)</td>
              <td style="padding:6px;text-align:right;">${money(b.q2Allocation || 50000000)}</td>
              <td style="padding:6px;text-align:right;font-weight:bold;">${money(qs.Q2 || 0)}</td>
              <td style="padding:6px;text-align:right;">${money((b.q2Allocation || 50000000) - (qs.Q2 || 0))}</td>
              <td style="padding:6px;text-align:center;">${Math.round(((qs.Q2 || 0) / (b.q2Allocation || 1)) * 100)}%</td>
            </tr>
            <tr>
              <td style="padding:6px;font-weight:bold;">Quý 3 (Tháng 7-9)</td>
              <td style="padding:6px;text-align:right;">${money(b.q3Allocation || 50000000)}</td>
              <td style="padding:6px;text-align:right;font-weight:bold;">${money(qs.Q3 || 0)}</td>
              <td style="padding:6px;text-align:right;">${money((b.q3Allocation || 50000000) - (qs.Q3 || 0))}</td>
              <td style="padding:6px;text-align:center;">${Math.round(((qs.Q3 || 0) / (b.q3Allocation || 1)) * 100)}%</td>
            </tr>
            <tr>
              <td style="padding:6px;font-weight:bold;">Quý 4 (Tháng 10-12)</td>
              <td style="padding:6px;text-align:right;">${money(b.q4Allocation || 50000000)}</td>
              <td style="padding:6px;text-align:right;font-weight:bold;">${money(qs.Q4 || 0)}</td>
              <td style="padding:6px;text-align:right;">${money((b.q4Allocation || 50000000) - (qs.Q4 || 0))}</td>
              <td style="padding:6px;text-align:center;">${Math.round(((qs.Q4 || 0) / (b.q4Allocation || 1)) * 100)}%</td>
            </tr>
          </tbody>
          <tfoot>
            <tr style="font-weight:bold;background:#fafafa;">
              <td style="padding:7px;text-align:center;">TỔNG CỘNG CẢ NĂM</td>
              <td style="padding:7px;text-align:right;">${money(d.totalBudget)}</td>
              <td style="padding:7px;text-align:right;">${money(d.totalSpent)}</td>
              <td style="padding:7px;text-align:right;">${money(d.remainingBudget)}</td>
              <td style="padding:7px;text-align:center;">${d.spentPercentage}%</td>
            </tr>
          </tfoot>
        </table>

        <h4 style="margin:20px 0 6px 0;">III. BẢNG ĐỐI SOÁT HÓA ĐƠN ĐƠN HÀNG PO ĐÃ THANH TOÁN</h4>
        <table>
          <thead>
            <tr>
              <th style="width:35px;">STT</th>
              <th>Mã đơn PO</th>
              <th>Đơn vị cung cấp</th>
              <th style="width:50px;">Quý</th>
              <th style="width:130px;">Ngày giải ngân</th>
              <th style="width:110px;">Số tiền chi</th>
              <th style="width:90px;">Trạng thái</th>
              <th>Thủ thư phụ trách</th>
            </tr>
          </thead>
          <tbody>
            ${txRowsHtml || '<tr><td colspan="8" style="text-align:center;padding:10px;">Chưa có giao dịch PO nào trong năm</td></tr>'}
          </tbody>
        </table>

        <div style="margin-top:20px;text-align:right;font-style:italic;">
          Hà Nội, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}
        </div>

        <div class="signatures">
          <div>
            <strong>Người lập biểu</strong><br>
            <span style="font-size:12px;font-style:italic;">(Ký, ghi rõ họ tên)</span>
            <div style="margin-top:60px;font-weight:bold;">Thủ thư phụ trách</div>
          </div>
          <div>
            <strong>Kế toán trưởng</strong><br>
            <span style="font-size:12px;font-style:italic;">(Ký, ghi rõ họ tên)</span>
            <div style="margin-top:60px;font-weight:bold;">Nguyễn Văn Tài</div>
          </div>
          <div>
            <strong>Ban Giám Hiệu duyệt</strong><br>
            <span style="font-size:12px;font-style:italic;">(Ký, đóng dấu)</span>
            <div style="margin-top:60px;font-weight:bold;">PGS. TS. Trần Đình Trọng</div>
          </div>
        </div>
      </body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
    }, 350);
  }


  // ==========================================
  // MẪU THÔNG BÁO TỰ ĐỘNG (TEMPLATES)
  // ==========================================
  async function loadNotificationTemplates() {
    const tbody = $('notificationTemplatesTableBody');
    if (!tbody) return;
    try {
      const [templates, cfg] = await Promise.all([
        api('/notifications/templates'),
        api('/settings').catch(() => null),
      ]);

      if (cfg) {
        if ($('cfgSmtpHost')) $('cfgSmtpHost').value = cfg.smtpHost || '';
        if ($('cfgSmtpPort')) $('cfgSmtpPort').value = cfg.smtpPort || 587;
        if ($('cfgSmtpUser')) $('cfgSmtpUser').value = cfg.smtpUser || '';
        if ($('cfgSmtpPassword')) $('cfgSmtpPassword').value = cfg.smtpPassword || '';
        if ($('cfgSmtpFrom')) $('cfgSmtpFrom').value = cfg.smtpFrom || '';
        if ($('cfgSmtpSecure')) $('cfgSmtpSecure').checked = Boolean(cfg.smtpSecure);
      }

      if (!templates.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#888;padding:2rem;">Chưa có mẫu thông báo nào.</td></tr>';
        return;
      }

      tbody.innerHTML = templates.map((tpl) => `
        <tr>
          <td><code style="font-weight:bold;">${escapeHtml(tpl.code)}</code></td>
          <td><strong>${escapeHtml(tpl.name)}</strong></td>
          <td><span class="status-badge" style="background:#e0f2fe;color:#0369a1;padding:3px 8px;border-radius:999px;font-size:12px;font-weight:600;">${escapeHtml(tpl.channel)}</span></td>
          <td>${escapeHtml(tpl.subject)}</td>
          <td>${tpl.isActive ? '<span style="color:#166534;font-weight:600;">✓ Hoạt động</span>' : '<span style="color:#64748b;">Tạm tắt</span>'}</td>
          <td>
            <button class="button button-light button-small" onclick="openEditTemplate(${tpl.id}, '${escapeHtml(tpl.name)}', '${escapeHtml(tpl.channel)}', ${tpl.isActive}, '${escapeHtml(tpl.subject)}', '${escapeHtml(tpl.content).replace(/\n/g, '\\n')}')">✏️ Sửa</button>
          </td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:red;">Lỗi tải mẫu: ${escapeHtml(e.message)}</td></tr>`;
    }
  }

  // Quản lý cấu hình SMTP Gateway
  $('smtpConfigForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          smtpHost: $('cfgSmtpHost')?.value.trim(),
          smtpPort: Number($('cfgSmtpPort')?.value) || 587,
          smtpUser: $('cfgSmtpUser')?.value.trim(),
          smtpPassword: $('cfgSmtpPassword')?.value,
          smtpFrom: $('cfgSmtpFrom')?.value.trim(),
          smtpSecure: Boolean($('cfgSmtpSecure')?.checked),
        }),
      });
      notify('💾 Lưu cấu hình cổng SMTP tự động thành công!');
    } catch (err) {
      notify(`✕ Lỗi lưu cấu hình SMTP: ${err.message}`, true);
    }
  });

  $('sendSmtpTestEmailBtn')?.addEventListener('click', async () => {
    const email = $('smtpTestEmailInput')?.value.trim();
    if (!email) {
      notify('Vui lòng nhập email người nhận thử nghiệm!', true);
      $('smtpTestEmailInput')?.focus();
      return;
    }
    const btn = $('sendSmtpTestEmailBtn');
    const oldText = btn.textContent;
    btn.textContent = '⏳ Đang gửi...';
    btn.disabled = true;
    try {
      const res = await api('/notifications/test-smtp', {
        method: 'POST',
        body: JSON.stringify({ email, to: email }),
      });
      notify(`✉️ ${res.message || 'Gửi test email thành công!'}`);
    } catch (err) {
      notify(`✕ Không thể gửi test email: ${err.message}`, true);
    } finally {
      btn.textContent = oldText;
      btn.disabled = false;
    }
  });

  // ==========================================
  // TEMPLATE EDITOR: BIẾN TỰ ĐỘNG + LIVE PREVIEW + TEST EMAIL
  // ==========================================

  // Dữ liệu mẫu cho Live Preview
  const TPL_SAMPLE_DATA = {
    TEN_DOC_GIA: 'Nguyễn Văn A',
    TEN_SACH: 'Giải tích toán học - Tập 1',
    NGAY_HET_HAN: '15/11/2026',
    SO_TIEN_PHAT: '35.000 VNĐ',
    MA_THE: 'TV-00042',
    NGAY_HET_HAN_GIU: '16/11/2026 23:59',
    MA_PHIEU_MUON: 'PM-20261101',
  };

  function renderTplPreview() {
    const subject = $('tplEditSubject')?.value || '';
    const content = $('tplEditContent')?.value || '';
    let subjectOut = subject;
    let contentOut = content;
    Object.entries(TPL_SAMPLE_DATA).forEach(([k, v]) => {
      const re = new RegExp(`\\{${k}\\}`, 'gi');
      subjectOut = subjectOut.replace(re, `<strong style="color:#0369a1;">${v}</strong>`);
      contentOut = contentOut.replace(re, `<strong style="color:#0369a1;">${v}</strong>`);
    });
    if ($('tplLivePreviewSubject')) $('tplLivePreviewSubject').innerHTML = subjectOut || '<em style="color:#94a3b8;">Tiêu đề trống</em>';
    if ($('tplLivePreviewContent')) $('tplLivePreviewContent').innerHTML = contentOut || '<em style="color:#94a3b8;">Nội dung trống</em>';
  }

  window.openEditTemplate = function (id, name, channel, isActive, subject, content) {
    $('tplEditId').value = id;
    $('tplEditTitle').textContent = `Sửa mẫu: ${name}`;
    $('tplEditChannel').value = channel;
    $('tplEditActive').checked = Boolean(isActive);
    $('tplEditSubject').value = subject;
    $('tplEditContent').value = content.replace(/\\n/g, '\n');
    renderTplPreview();
    $('templateEditDialog').showModal();
  };

  // Theo dõi trường soạn thảo đang được con trỏ trỏ vào (Tiêu đề hoặc Nội dung)
  let lastFocusedTplInput = null;
  $('tplEditSubject')?.addEventListener('focus', () => { lastFocusedTplInput = $('tplEditSubject'); });
  $('tplEditContent')?.addEventListener('focus', () => { lastFocusedTplInput = $('tplEditContent'); });

  // Nút chèn biến tự động (1 chạm) vào vị trí con trỏ của trường đang focus
  document.querySelectorAll('.tpl-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const target = lastFocusedTplInput || $('tplEditContent');
      if (!target) return;
      const v = chip.dataset.var;
      const start = target.selectionStart || 0;
      const end = target.selectionEnd || 0;
      target.value = target.value.slice(0, start) + v + target.value.slice(end);
      target.selectionStart = target.selectionEnd = start + v.length;
      target.focus();
      renderTplPreview();
    });
  });

  // Live preview khi gõ
  $('tplEditSubject')?.addEventListener('input', renderTplPreview);
  $('tplEditContent')?.addEventListener('input', renderTplPreview);

  // Submit form PATCH template
  $('templateEditForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = $('tplEditId')?.value;
    if (!id) return;
    const btn = e.submitter;
    const oldText = btn?.textContent;
    if (btn) { btn.textContent = '⏳ Đang lưu...'; btn.disabled = true; }
    try {
      await api(`/notifications/templates/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          channel: $('tplEditChannel')?.value,
          isActive: Boolean($('tplEditActive')?.checked),
          subject: $('tplEditSubject')?.value.trim(),
          content: $('tplEditContent')?.value.trim(),
        }),
      });
      notify('✅ Đã lưu mẫu thông báo thành công!');
      $('templateEditDialog').close();
      void loadNotificationTemplates();
    } catch (err) {
      notify(`✕ Lỗi lưu mẫu: ${err.message}`, true);
    } finally {
      if (btn) { btn.textContent = oldText; btn.disabled = false; }
    }
  });

  // Nút gửi thử nghiệm mẫu qua email
  $('btnSendTestTemplate')?.addEventListener('click', async () => {
    const email = $('tplTestEmailInput')?.value.trim();
    if (!email) { notify('Vui lòng nhập email nhận thử nghiệm!', true); return; }
    const subject = $('tplEditSubject')?.value.trim();
    const content = $('tplEditContent')?.value.trim();
    const btn = $('btnSendTestTemplate');
    const oldText = btn.textContent;
    btn.textContent = '⏳ Đang gửi...'; btn.disabled = true;
    try {
      const res = await api('/notifications/test-template', {
        method: 'POST',
        body: JSON.stringify({ email, to: email, subject, content, variables: TPL_SAMPLE_DATA }),
      });
      notify(`📨 ${res.message || 'Đã gửi email thử nghiệm thành công!'}`);
    } catch (err) {
      notify(`✕ Lỗi gửi test: ${err.message}`, true);
    } finally {
      btn.textContent = oldText; btn.disabled = false;
    }
  });

  // Nút kích hoạt gửi thông báo tự động ngay
  $('triggerRemindersNowBtn')?.addEventListener('click', async () => {
    const btn = $('triggerRemindersNowBtn');
    const oldText = btn.textContent;
    btn.textContent = '⏳ Đang xử lý...'; btn.disabled = true;
    try {
      const res = await api('/notifications/trigger-reminders', { method: 'POST' });
      notify(`⚡ ${res.message || `Đã gửi xong! Nhắc: ${res.upcomingCount}, Quá hạn: ${res.overdueCount}`}`);
    } catch (err) {
      notify(`✕ Lỗi kích hoạt thông báo: ${err.message}`, true);
    } finally {
      btn.textContent = oldText; btn.disabled = false;
    }
  });

  // Nút làm mới danh sách templates
  $('refreshTemplates')?.addEventListener('click', () => void loadNotificationTemplates());

  // ==========================================
  // SETTINGS PAGE: SMTP + SMS OTP
  // ==========================================

  // Form quy định toàn cục (settingsForm) vẫn bind vào saveSettings() bên dưới
  // Form SMTP mới (settingsSmtpForm)
  $('settingsSmtpForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.submitter;
    const oldText = btn?.textContent;
    if (btn) { btn.textContent = '⏳ Đang lưu...'; btn.disabled = true; }
    try {
      await api('/system/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          smtpHost: $('settingSmtpHost')?.value.trim(),
          smtpPort: Number($('settingSmtpPort')?.value) || 587,
          smtpUser: $('settingSmtpUser')?.value.trim(),
          smtpPassword: $('settingSmtpPassword')?.value,
          smtpFrom: $('settingSmtpFrom')?.value.trim(),
          smtpSecure: Boolean($('settingSmtpSecure')?.checked),
        }),
      });
      notify('💾 Lưu cấu hình SMTP thành công!');
      const badge = $('smtpStatusBadgeSettings');
      if (badge) { badge.textContent = '✓ Đã lưu'; badge.style.background = '#dcfce7'; badge.style.color = '#166534'; }
    } catch (err) {
      notify(`✕ Lỗi lưu SMTP: ${err.message}`, true);
    } finally {
      if (btn) { btn.textContent = oldText; btn.disabled = false; }
    }
  });

  // Form SMS OTP (settingsSmsForm)
  $('settingsSmsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.submitter;
    const oldText = btn?.textContent;
    if (btn) { btn.textContent = '⏳ Đang lưu...'; btn.disabled = true; }
    try {
      await api('/system/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          smsProvider: $('settingSmsProvider')?.value,
          smsBrandName: $('settingSmsBrandName')?.value.trim(),
          smsApiKey: $('settingSmsApiKey')?.value.trim(),
          smsApiSecret: $('settingSmsApiSecret')?.value,
          smsEndpoint: $('settingSmsEndpoint')?.value.trim(),
          enableSmsOtp: Boolean($('settingEnableSmsOtp')?.checked),
        }),
      });
      notify('💾 Lưu cấu hình SMS OTP thành công!');
      const badge = $('smsStatusBadgeSettings');
      if (badge) { badge.textContent = '✓ Đã lưu'; badge.style.background = '#dcfce7'; badge.style.color = '#166534'; }
    } catch (err) {
      notify(`✕ Lỗi lưu SMS OTP: ${err.message}`, true);
    } finally {
      if (btn) { btn.textContent = oldText; btn.disabled = false; }
    }
  });

  // Test SMTP kết nối (trang Settings)
  $('btnTestSmtpConnection')?.addEventListener('click', async () => {
    const email = $('settingSmtpTestEmail')?.value.trim();
    if (!email) { notify('Vui lòng nhập email nhận thử nghiệm!', true); $('settingSmtpTestEmail')?.focus(); return; }
    const btn = $('btnTestSmtpConnection');
    const oldText = btn.textContent;
    btn.textContent = '⏳ Đang gửi...'; btn.disabled = true;
    const badge = $('smtpStatusBadgeSettings');
    try {
      const res = await api('/notifications/test-smtp', {
        method: 'POST',
        body: JSON.stringify({ email, to: email }),
      });
      notify(`✉️ ${res.message || 'Gửi test email thành công!'}`);
      if (badge) { badge.textContent = '✓ SMTP hoạt động'; badge.style.background = '#dcfce7'; badge.style.color = '#166534'; }
    } catch (err) {
      notify(`✕ SMTP lỗi: ${err.message}`, true);
      if (badge) { badge.textContent = '✗ Lỗi kết nối'; badge.style.background = '#fee2e2'; badge.style.color = '#991b1b'; }
    } finally {
      btn.textContent = oldText; btn.disabled = false;
    }
  });

  // Test SMS OTP kết nối
  $('btnTestSmsConnection')?.addEventListener('click', async () => {
    const phone = $('settingSmsTestPhone')?.value.trim();
    if (!phone) { notify('Vui lòng nhập số điện thoại nhận thử nghiệm!', true); $('settingSmsTestPhone')?.focus(); return; }
    const btn = $('btnTestSmsConnection');
    const oldText = btn.textContent;
    btn.textContent = '⏳ Đang gửi...'; btn.disabled = true;
    const badge = $('smsStatusBadgeSettings');
    try {
      const res = await api('/system/settings/test-sms', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      });
      notify(`📲 ${res.message || 'Gửi SMS OTP thành công!'}`);
      if (badge) { badge.textContent = '✓ SMS hoạt động'; badge.style.background = '#dcfce7'; badge.style.color = '#166534'; }
    } catch (err) {
      notify(`✕ SMS OTP lỗi: ${err.message}`, true);
      if (badge) { badge.textContent = '✗ Lỗi kết nối'; badge.style.background = '#fee2e2'; badge.style.color = '#991b1b'; }
    } finally {
      btn.textContent = oldText; btn.disabled = false;
    }
  });

  // Nút làm mới settings
  $('refreshSettingsBtn')?.addEventListener('click', () => void loadSettings());

  // Dọn dẹp dữ liệu thử nghiệm (Clean Test Data)
  $('btnCleanTestData')?.addEventListener('click', async () => {
    if (!window.confirm('Hệ thống sẽ quét và chuẩn hóa toàn bộ dữ liệu test cũ (tên "he", thể loại "hài", đầu sách nháp) thành dữ liệu học thuật chuẩn. Bạn có chắc chắn muốn thực hiện?')) {
      return;
    }
    const btn = $('btnCleanTestData');
    const statusText = $('cleanTestDataStatusText');
    const oldText = btn ? btn.textContent : '';
    if (btn) { btn.textContent = '⏳ Đang dọn dẹp...'; btn.disabled = true; }
    if (statusText) statusText.textContent = 'Đang xử lý dọn dẹp...';

    try {
      const res = await api('/system/settings/clean-test-data', { method: 'POST' });
      notify(res.message || 'Đã dọn dẹp dữ liệu test thành công!');
      if (statusText) {
        statusText.textContent = `✓ Đã chuẩn hóa: ${res.totalCleaned || 0} mục dữ liệu`;
        statusText.style.color = '#166534';
      }
      if (typeof loadBooks === 'function') void loadBooks(1);
      if (typeof loadCategories === 'function') void loadCategories();
      if (typeof loadUsers === 'function') void loadUsers(1);
    } catch (err) {
      notify(`✕ Lỗi khi dọn dẹp dữ liệu: ${err.message}`, true);
      if (statusText) {
        statusText.textContent = '✗ Xảy ra lỗi dọn dẹp';
        statusText.style.color = '#dc2626';
      }
    } finally {
      if (btn) { btn.textContent = oldText; btn.disabled = false; }
    }
  });

  // Tải bản sao lưu cơ sở dữ liệu SQL
  $('btnDownloadBackupSql')?.addEventListener('click', () => {
    window.open('/system/settings/backup/download', '_blank');
  });

  // VIETQR POPUP & SELF RENEWAL
  window.openQrPayment = function (amount, refCode, title) {
    const amt = Number(amount) || 0;
    const cleanRef = (refCode || 'PHAT-' + Math.floor(1000 + Math.random() * 9000)).replace(/[^A-Za-z0-9_-]/g, '');
    $('qrPayDesc').textContent = title || 'Vui lòng dùng ứng dụng Ngân hàng (Vietcombank, MB, Techcombank...) hoặc MoMo/VNPay để quét mã.';
    $('qrPayAmount').textContent = money(amt);
    $('qrPayContent').textContent = `NOP PHAT ${cleanRef}`;
    $('qrPayImg').src = `https://img.vietqr.io/image/970422-03823456789-compact2.png?amount=${amt}&addInfo=NOP%20PHAT%20${cleanRef}&accountName=THU%20VIEN%20TRUONG`;
    $('qrPaymentDialog').showModal();
  };

  window.selfRenewLoan = async function (recordId) {
    if (!window.confirm('Bạn muốn gia hạn cuốn sách này trực tuyến thêm thời gian?')) return;
    try {
      await api(`/borrow/${recordId}/renew`, { method: 'POST' });
      notify('Gia hạn mượn sách thành công! Hạn trả mới đã được cập nhật.');
      if (state.readerProfileUser?.id) loadReaderProfile(state.readerProfileUser.id);
      loadBorrowRecords();
    } catch (e) {
      notify(e.message, true);
    }
  };

  // TÍNH NĂNG 3: ĐỀ XUẤT MUA SÁCH (ACQUISITIONS)
  // ==========================================
  async function loadAcquisitions() {
    const status = $('acquisitionStatusFilter')?.value || '';
    const search = $('acquisitionSearch')?.value || '';
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (search.trim()) params.append('search', search.trim());

    try {
      const requests = await api('/acquisitions' + (params.toString() ? `?${params.toString()}` : ''));
      if ($('acqReqCount')) $('acqReqCount').textContent = requests.length;
      const tbody = $('acquisitionTableBody');
      if (!tbody) return;

      if (!requests.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#888;padding:2rem;">Chưa có đề xuất mua sách nào.</td></tr>';
        return;
      }

      const statusMap = {
        PENDING: { label: 'Chờ Thủ thư (C1)', color: '#80530f', bg: '#fef3c7' },
        PENDING_LIBRARIAN: { label: 'Chờ Thủ thư (C1)', color: '#80530f', bg: '#fef3c7' },
        PENDING_DEAN: { label: 'Chờ Trưởng khoa (C2)', color: '#1e40af', bg: '#dbeafe' },
        PENDING_RECTOR: { label: 'Chờ BGH duyệt (C3)', color: '#6f42c1', bg: '#ede9fe' },
        APPROVED: { label: 'Đã phê duyệt', color: '#166534', bg: '#dcfce7' },
        ORDERED: { label: 'Đang đặt hàng', color: '#0369a1', bg: '#e0f2fe' },
        RECEIVED: { label: 'Đã về kho', color: '#065f46', bg: '#d1fae5' },
        REJECTED: { label: 'Từ chối', color: '#991b1b', bg: '#fee2e2' },
      };

      tbody.innerHTML = requests.map((req) => {
        const st = statusMap[req.status] || { label: req.status, color: '#333', bg: '#eee' };
        const price = req.estimatedPrice ? money(req.estimatedPrice) : '—';
        const user = req.user?.fullName || req.user?.username || 'Độc giả';

        // 3-Stage stepper mini
        const c1Ok = Boolean(req.librarianApprovedAt);
        const c2Ok = Boolean(req.deanApprovedAt);
        const c3Ok = Boolean(req.rectorApprovedAt);
        const isRej = req.status === 'REJECTED';

        const c1Icon = c1Ok ? '✅' : (isRej && req.currentApprovalStage === 'LIBRARIAN' ? '❌' : (req.currentApprovalStage === 'LIBRARIAN' ? '⏳' : '⚪'));
        const c2Icon = c2Ok ? '✅' : (isRej && req.currentApprovalStage === 'DEAN' ? '❌' : (req.currentApprovalStage === 'DEAN' ? '⏳' : '⚪'));
        const c3Icon = c3Ok ? '✅' : (isRej && req.currentApprovalStage === 'RECTOR' ? '❌' : (req.currentApprovalStage === 'RECTOR' ? '⏳' : '⚪'));

        const stepperHtml = `
          <div style="display:flex;align-items:center;gap:4px;font-size:12px;">
            <span title="Cấp 1: Thủ thư thẩm định">${c1Icon} C1</span>
            <span style="color:#cbd5e1;">➔</span>
            <span title="Cấp 2: Trưởng khoa xét duyệt">${c2Icon} C2</span>
            <span style="color:#cbd5e1;">➔</span>
            <span title="Cấp 3: Ban Giám hiệu">${c3Icon} C3</span>
          </div>
        `;

        return `<tr>
          <td style="text-align:center;">
            <strong style="color:#ea580c;font-size:14px;">🔥 ${req.votesCount || 0}</strong>
          </td>
          <td>
            <strong>${escapeHtml(req.title)}</strong>
            ${req.isDuplicateInInventory ? `<br><span class="badge" style="background:#fef2f2;color:#dc2626;font-size:11px;font-weight:700;">⚠️ Đã có trong kho</span>` : ''}
            ${req.reason ? `<br><small style="color:#64748b;display:block;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(req.reason)}">Lý do: ${escapeHtml(req.reason)}</small>` : ''}
          </td>
          <td>${escapeHtml(req.author)}<br><small style="color:#64748b;">${escapeHtml([req.publisher, req.publicationYear].filter(Boolean).join(' · ') || '—')}</small></td>
          <td>${escapeHtml(user)}<br><small style="color:#64748b;">${date(req.createdAt)}</small></td>
          <td>${price}</td>
          <td>${stepperHtml}</td>
          <td><span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;color:${st.color};background:${st.bg};">${st.label}</span></td>
          <td>
            <div class="button-row" style="margin:0;gap:4px;flex-wrap:wrap;">
              ${(req.status === 'PENDING' || req.status === 'PENDING_LIBRARIAN') ? `
                <button class="button button-light button-small" onclick="advanceAcquisitionStage(${req.id})">✓ Thẩm định (C1)</button>
                <button class="button button-danger button-small" onclick="rejectAcquisitionStage(${req.id})">✕</button>
              ` : ''}
              ${req.status === 'PENDING_DEAN' ? `
                <button class="button button-light button-small" onclick="advanceAcquisitionStage(${req.id})">✓ Trưởng khoa (C2)</button>
                <button class="button button-danger button-small" onclick="rejectAcquisitionStage(${req.id})">✕</button>
              ` : ''}
              ${req.status === 'PENDING_RECTOR' ? `
                <button class="button button-primary button-small" style="background:#6f42c1;border-color:#6f42c1;" onclick="advanceAcquisitionStage(${req.id})">✓ BGH duyệt (C3)</button>
                <button class="button button-danger button-small" onclick="rejectAcquisitionStage(${req.id})">✕</button>
              ` : ''}
              ${req.status === 'APPROVED' ? `
                <button class="button button-light button-small" onclick="updateAcquisitionStatus(${req.id}, 'ORDERED')">📦 Đặt hàng</button>
              ` : ''}
              ${req.status === 'ORDERED' ? `
                <button class="button button-primary button-small" onclick="updateAcquisitionStatus(${req.id}, 'RECEIVED')">📥 Về kho</button>
              ` : ''}
              ${req.status === 'RECEIVED' ? `
                <button class="button button-primary button-small" onclick="convertAcquisitionToBook(${req.id})">＋ Nhập sách</button>
              ` : ''}
              <button class="button button-light button-small" onclick="openAcquisitionApprovalDetail(${req.id})" title="Xem quy trình và nhật ký phê duyệt 3 cấp">🔍 Chi tiết</button>
            </div>
          </td>
        </tr>`;
      }).join('');
    } catch (e) {
      notify(`Không tải được danh sách đề xuất: ${e.message}`, true);
    }
  }

  window.advanceAcquisitionStage = async function (id) {
    const note = window.prompt('Nhập ý kiến thẩm định / phê duyệt (tùy chọn):', 'Đồng ý chuyển tiếp duyệt');
    if (note === null) return;
    try {
      const res = await api(`/acquisitions/${id}/approve-stage`, {
        method: 'POST',
        body: JSON.stringify({ note: note.trim() || undefined }),
      });
      notify(res.message || 'Đã phê duyệt đề xuất thành công!');
      await Promise.all([loadAcquisitions(), typeof loadApprovedPublisherGroups === 'function' ? loadApprovedPublisherGroups() : Promise.resolve()]);
    } catch (e) {
      notify(e.message, true);
    }
  };

  window.rejectAcquisitionStage = async function (id) {
    const reason = window.prompt('Nhập lý do từ chối đề xuất mua sách:');
    if (reason === null) return;
    if (!reason.trim()) {
      notify('Vui lòng nhập lý do từ chối.', true);
      return;
    }
    try {
      const res = await api(`/acquisitions/${id}/reject-stage`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() }),
      });
      notify(res.message || 'Đã từ chối đề xuất.');
      await Promise.all([loadAcquisitions(), typeof loadApprovedPublisherGroups === 'function' ? loadApprovedPublisherGroups() : Promise.resolve()]);
    } catch (e) {
      notify(e.message, true);
    }
  };

  window.openAcquisitionApprovalDetail = async function (id) {
    const modal = $('acquisitionApprovalDetailModal');
    if (!modal) return;
    try {
      const req = await api(`/acquisitions/${id}`);
      if ($('acqModalBookTitle')) $('acqModalBookTitle').textContent = req.title || 'Đề xuất sách';
      if ($('acqModalAuthor')) $('acqModalAuthor').textContent = req.author || '—';
      if ($('acqModalPublisher')) $('acqModalPublisher').textContent = [req.publisher, req.publicationYear].filter(Boolean).join(' · ') || '—';
      if ($('acqModalUser')) $('acqModalUser').textContent = (req.user?.fullName || req.user?.username || '—') + ` (${date(req.createdAt)})`;

      const isRej = req.status === 'REJECTED';

      // Cấp 1
      const step1Badge = $('stepLibrarianStatusBadge');
      const step1Note = $('stepLibrarianNote');
      const step1Meta = $('stepLibrarianMeta');
      if (req.librarianApprovedAt) {
        if (step1Badge) { step1Badge.textContent = '✅ Đã thẩm định'; step1Badge.style.background = '#dcfce7'; step1Badge.style.color = '#166534'; }
        if (step1Note) step1Note.textContent = req.librarianNote ? `Ý kiến: "${req.librarianNote}"` : 'Đã xác nhận trùng kho và giá thành.';
        if (step1Meta) step1Meta.textContent = `Thực hiện bởi: ${req.librarianApprovedBy || 'Thủ thư'} lúc ${date(req.librarianApprovedAt)}`;
      } else if (isRej && req.currentApprovalStage === 'LIBRARIAN') {
        if (step1Badge) { step1Badge.textContent = '❌ Từ chối'; step1Badge.style.background = '#fee2e2'; step1Badge.style.color = '#991b1b'; }
        if (step1Note) step1Note.textContent = `Lý do từ chối: "${req.rejectionReason || 'Không phù hợp'}"`;
        if (step1Meta) step1Meta.textContent = 'Thủ thư từ chối ở Cấp 1';
      } else {
        if (step1Badge) { step1Badge.textContent = '⏳ Đang chờ thẩm định'; step1Badge.style.background = '#fef3c7'; step1Badge.style.color = '#80530f'; }
        if (step1Note) step1Note.textContent = 'Đang chờ thủ thư kiểm tra trùng sách và thẩm định giá.';
        if (step1Meta) step1Meta.textContent = '';
      }

      // Cấp 2
      const step2Badge = $('stepDeanStatusBadge');
      const step2Note = $('stepDeanNote');
      const step2Meta = $('stepDeanMeta');
      if (req.deanApprovedAt) {
        if (step2Badge) { step2Badge.textContent = '✅ Đã phê duyệt'; step2Badge.style.background = '#dcfce7'; step2Badge.style.color = '#166534'; }
        if (step2Note) step2Note.textContent = req.deanNote ? `Ý kiến Trưởng khoa: "${req.deanNote}"` : 'Phù hợp chương trình đào tạo & NCKH.';
        if (step2Meta) step2Meta.textContent = `Thực hiện bởi: ${req.deanApprovedBy || 'Trưởng khoa'} lúc ${date(req.deanApprovedAt)}`;
      } else if (isRej && req.currentApprovalStage === 'DEAN') {
        if (step2Badge) { step2Badge.textContent = '❌ Từ chối'; step2Badge.style.background = '#fee2e2'; step2Badge.style.color = '#991b1b'; }
        if (step2Note) step2Note.textContent = `Lý do từ chối: "${req.rejectionReason || 'Không đáp ứng nhu cầu môn học'}"`;
        if (step2Meta) step2Meta.textContent = 'Trưởng khoa từ chối ở Cấp 2';
      } else {
        if (step2Badge) { step2Badge.textContent = req.librarianApprovedAt ? '⏳ Đang chờ duyệt' : '⚪ Chưa tới lượt'; step2Badge.style.background = req.librarianApprovedAt ? '#fef3c7' : '#f1f5f9'; step2Badge.style.color = req.librarianApprovedAt ? '#80530f' : '#64748b'; }
        if (step2Note) step2Note.textContent = 'Đánh giá tính phù hợp với chương trình đào tạo của khoa.';
        if (step2Meta) step2Meta.textContent = '';
      }

      // Cấp 3
      const step3Badge = $('stepRectorStatusBadge');
      const step3Note = $('stepRectorNote');
      const step3Meta = $('stepRectorMeta');
      if (req.rectorApprovedAt) {
        if (step3Badge) { step3Badge.textContent = '✅ Đã chuẩn y mua'; step3Badge.style.background = '#dcfce7'; step3Badge.style.color = '#166534'; }
        if (step3Note) step3Note.textContent = req.rectorNote ? `Ý kiến BGH: "${req.rectorNote}"` : 'Đã duyệt cấp kinh phí mua sách.';
        if (step3Meta) step3Meta.textContent = `Thực hiện bởi: ${req.rectorApprovedBy || 'BGH'} lúc ${date(req.rectorApprovedAt)}`;
      } else if (isRej && req.currentApprovalStage === 'RECTOR') {
        if (step3Badge) { step3Badge.textContent = '❌ Từ chối'; step3Badge.style.background = '#fee2e2'; step3Badge.style.color = '#991b1b'; }
        if (step3Note) step3Note.textContent = `Lý do từ chối: "${req.rejectionReason || 'Vượt quá hạn mức ngân sách'}"`;
        if (step3Meta) step3Meta.textContent = 'Ban Giám hiệu từ chối ở Cấp 3';
      } else {
        if (step3Badge) { step3Badge.textContent = req.deanApprovedAt ? '⏳ Đang chờ chuẩn y' : '⚪ Chưa tới lượt'; step3Badge.style.background = req.deanApprovedAt ? '#fef3c7' : '#f1f5f9'; step3Badge.style.color = req.deanApprovedAt ? '#80530f' : '#64748b'; }
        if (step3Note) step3Note.textContent = 'Quyết định phê duyệt ngân sách và đưa vào đợt mua sắm.';
        if (step3Meta) step3Meta.textContent = '';
      }

      modal.showModal();
    } catch (e) {
      notify(`Không thể xem chi tiết: ${e.message}`, true);
    }
  };

  window.updateAcquisitionStatus = async function (id, status) {
    let adminNote;
    if (status === 'REJECTED') {
      adminNote = window.prompt('Nhập lý do từ chối (có thể để trống):');
      if (adminNote === null) return;
    }
    try {
      await api(`/acquisitions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, adminNote }),
      });
      notify('Đã cập nhật trạng thái đề xuất.');
      await Promise.all([loadAcquisitions(), loadApprovedPublisherGroups()]);
    } catch (e) {
      notify(e.message, true);
    }
  };

  window.convertAcquisitionToBook = async function (id) {
    try {
      const req = await api(`/acquisitions/${id}`);
      window.history.pushState({}, '', '/admin/books');
      syncAdminRoute();
      $('bookFormPanel').hidden = false;
      $('bookFormPanel').scrollIntoView({ behavior: 'smooth' });
      $('bookFormTitle').textContent = `Thêm sách từ đề xuất: ${req.title}`;
      $('bookId').value = '';
      $('bookTitle').value = req.title || '';
      $('bookAuthor').value = req.author || '';
      $('bookIsbn').value = req.isbn || '';
      $('bookPublicationYear').value = req.publicationYear || '';
      notify('Đã điền thông tin sách từ đề xuất, hãy bổ sung số bản sao và lưu.');
    } catch (e) {
      notify(e.message, true);
    }
  };

  async function submitBookRequest(event) {
    event.preventDefault();
    const payload = {
      title: $('reqBookTitle').value.trim(),
      author: $('reqBookAuthor').value.trim(),
      publisher: $('reqBookPublisher')?.value.trim() || undefined,
      isbn: $('reqBookIsbn')?.value.trim() || undefined,
      publicationYear: Number($('reqBookYear')?.value) || undefined,
      estimatedPrice: Number($('reqBookPrice')?.value) || undefined,
      reason: $('reqBookReason')?.value.trim() || undefined,
      referenceUrl: $('reqBookUrl')?.value.trim() || undefined,
    };
    try {
      await api('/acquisitions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      $('bookRequestDialog').close();
      $('bookRequestForm').reset();
      notify('Đã gửi đề xuất sách thành công! Thư viện sẽ xem xét trong thời gian sớm nhất.');
    } catch (e) {
      notify(e.message, true);
    }
  }


  // ==========================================
  // TÍNH NĂNG: QUẢN LÝ SƠ ĐỒ KỆ SÁCH (SHELVES)
  // ==========================================
  // shelvesData declared at top

  async function loadShelves() {
    const grid = $('shelfGrid');
    if (grid) grid.innerHTML = '<p style="color:#888;">Đang tải sơ đồ kệ sách...</p>';
    try {
      const data = await api('/books/shelves');
      shelvesData = Array.isArray(data) ? data : [];
      renderShelvesStats();
      populateShelfFilters();

      // Hỗ trợ xử lý tham số url?id=...&floor=...
      const searchParams = new URLSearchParams(window.location.search);
      const queryFloor = searchParams.get('floor');
      if (queryFloor) {
        currentShelfFloor = String(queryFloor);
        document.querySelectorAll('[data-floor-tab]').forEach((tab) => {
          tab.classList.toggle('active', tab.dataset.floorTab === currentShelfFloor);
        });
      }
      renderShelvesFloorPlan(currentShelfFloor || '1');
      renderShelvesGrid();

      const queryId = searchParams.get('id');
      if (queryId) {
        handleTargetShelfParam(queryId);
      }
    } catch (e) {
      notify(`Lỗi tải sơ đồ kệ: ${e.message}`, true);
    }
  }

  function handleTargetShelfParam(queryId) {
    const qNum = Number(queryId);
    const target = shelvesData.find((s) => s.id === qNum || s.shelf === queryId || String(s.shelf).includes(queryId));
    if (target) {
      setTimeout(() => {
        const floorRack = document.querySelector(`[data-shelf-num="${target.shelf}"]`);
        if (floorRack) {
          floorRack.scrollIntoView({ behavior: 'smooth', block: 'center' });
          floorRack.style.outline = '3px solid #dc2626';
          floorRack.style.boxShadow = '0 0 20px rgba(220, 38, 38, 0.7)';
        }
        const shelfCard = document.querySelector(`[data-shelf-id="${target.id}"]`);
        if (shelfCard) {
          shelfCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          shelfCard.style.outline = '3px solid #2563eb';
          shelfCard.style.boxShadow = '0 0 18px rgba(37,99,235,0.45)';
        }
        void viewShelfBooks(encodeURIComponent(target.floor), encodeURIComponent(target.aisle), encodeURIComponent(target.shelf));
      }, 300);
    }
  }

  function renderShelvesStats() {
    let totalCopies = 0;
    let available = 0;
    let borrowed = 0;
    shelvesData.forEach(s => {
      totalCopies += s.totalCopies;
      available += s.availableCopies;
      borrowed += s.borrowedCopies;
    });
    if ($('statTotalShelves')) $('statTotalShelves').textContent = shelvesData.length;
    if ($('statTotalShelfCopies')) $('statTotalShelfCopies').textContent = totalCopies;
    if ($('statAvailableShelfCopies')) $('statAvailableShelfCopies').textContent = available;
    if ($('statBorrowedShelfCopies')) $('statBorrowedShelfCopies').textContent = borrowed;
  }

  function populateShelfFilters() {
    const floorSel = $('shelfFloorFilter');
    const aisleSel = $('shelfAisleFilter');
    if (!floorSel || !aisleSel) return;

    const floors = [...new Set(shelvesData.map(s => s.floor))].sort();
    const aisles = [...new Set(shelvesData.map(s => s.aisle))].sort();

    const curFloor = floorSel.value;
    const curAisle = aisleSel.value;

    floorSel.innerHTML = '<option value="">Tất cả các tầng</option>' +
      floors.map(f => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`).join('');
    aisleSel.innerHTML = '<option value="">Tất cả các dãy</option>' +
      aisles.map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('');

    floorSel.value = curFloor;
    aisleSel.value = curAisle;
  }

  function renderShelvesGrid() {
    const grid = $('shelfGrid');
    if (!grid) return;

    const floor = $('shelfFloorFilter')?.value || '';
    const aisle = $('shelfAisleFilter')?.value || '';
    const search = ($('shelfSearch')?.value || '').trim().toLowerCase();

    const filtered = shelvesData.filter(s => {
      if (floor && s.floor !== floor) return false;
      if (aisle && s.aisle !== aisle) return false;
      if (search) {
        const text = `${s.floor} ${s.aisle} ${s.shelf} #${s.id}`.toLowerCase();
        if (!text.includes(search)) return false;
      }
      return true;
    });

    if (!filtered.length) {
      grid.innerHTML = '<p style="color:#888;grid-column:1/-1;text-align:center;padding:2rem;">Không tìm thấy vị trí kệ nào phù hợp.</p>';
      return;
    }

    grid.innerHTML = filtered.map(s => {
      const availPercent = s.totalCopies > 0 ? Math.round((s.availableCopies / s.totalCopies) * 100) : 0;
      return `
        <div class="report-card" data-shelf-id="${s.id}" style="display:flex;flex-direction:column;gap:10px;border-top:4px solid #1d765b;position:relative;border-radius:12px;transition:box-shadow .2s ease;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div>
              <span class="eyebrow" style="font-size:11px;margin-bottom:2px;display:inline-flex;align-items:center;gap:4px;">
                <span class="badge" style="background:#e2e8f0;color:#334155;font-weight:700;font-size:10px;padding:1px 5px;border-radius:4px;">#${s.id}</span>
                ${escapeHtml(s.floor)} · ${escapeHtml(s.aisle)}
              </span>
              <h3 style="margin:2px 0 0 0;font-size:18px;color:#123c35;">Kệ ${escapeHtml(s.shelf)}</h3>
            </div>
            <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;background:#e5f2ea;color:#1d765b;">
              📚 ${s.distinctBooks} đầu sách
            </span>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;margin:4px 0;">
            <div>Tổng bản sao: <strong>${s.totalCopies}</strong></div>
            <div style="color:#00a65a;font-weight:600;">Có sẵn: <strong>${s.availableCopies}</strong></div>
            <div style="color:#f39c12;">Đang mượn: <strong>${s.borrowedCopies}</strong></div>
            <div style="color:#dd4b39;">Thất lạc: <strong>${s.lostCopies}</strong></div>
          </div>

          <div style="background:#edf1ee;border-radius:99px;height:7px;overflow:hidden;margin-top:auto;">
            <div style="background:#1d765b;width:${availPercent}%;height:100%;" title="${availPercent}% sẵn sàng"></div>
          </div>

          <button class="button button-light button-small" style="width:100%;margin-top:6px;font-weight:600;" onclick="viewShelfBooks('${encodeURIComponent(s.floor)}', '${encodeURIComponent(s.aisle)}', '${encodeURIComponent(s.shelf)}')">
            📖 Xem danh sách sách (${s.totalCopies})
          </button>
        </div>
      `;
    }).join('');
  }

  window.viewShelfBooks = async function (floorEnc, aisleEnc, shelfEnc) {
    const floor = decodeURIComponent(floorEnc);
    const aisle = decodeURIComponent(aisleEnc);
    const shelf = decodeURIComponent(shelfEnc);

    $('shelfBooksTitle').textContent = `Sách tại Kệ ${shelf}`;
    $('shelfBooksSubtitle').textContent = `Vị trí lưu trữ: ${floor} · ${aisle} · Kệ ${shelf}`;
    const tbody = $('shelfBooksTableBody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1.5rem;">Đang tải danh sách bản sách...</td></tr>';
    $('shelfBooksDialog').showModal();

    try {
      const books = await api(`/books/shelves/books?floor=${encodeURIComponent(floor)}&aisle=${encodeURIComponent(aisle)}&shelf=${encodeURIComponent(shelf)}`);
      if (!books.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:#888;">Kệ này hiện chưa có bản sách nào.</td></tr>';
        return;
      }
      tbody.innerHTML = books.map(b => `
        <tr>
          <td><code>${escapeHtml(b.barcode)}</code></td>
          <td><strong>${escapeHtml(b.title || '—')}</strong></td>
          <td>${escapeHtml(b.author || '—')}</td>
          <td>${escapeHtml(b.isbn || '—')}</td>
          <td><span class="status status-${escapeHtml(b.status)}">${escapeHtml(b.status)}</span></td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:#c00;">Lỗi: ${escapeHtml(e.message)}</td></tr>`;
      notify(`Lỗi tải sách trên kệ: ${e.message}`, true);
    }
  };

  // Shelves event listeners

  // Star rating interactions
  document.querySelectorAll('#starRatingSelect .star-item').forEach((star) => {
    star.addEventListener('click', () => {
      const val = Number(star.dataset.star);
      $('selectedRatingValue').value = val;
      document.querySelectorAll('#starRatingSelect .star-item').forEach((s) => {
        const sVal = Number(s.dataset.star);
        s.style.color = sVal <= val ? '#f59e0b' : '#cbd5e1';
      });
    });
  });

  $('openReviewFormBtn')?.addEventListener('click', () => {
    if (!state.user) {
      notify('Vui lòng đăng nhập tài khoản độc giả để gửi đánh giá!', true);
      $('openLogin').click();
      return;
    }
    $('submitBookReviewForm').hidden = !$('submitBookReviewForm').hidden;
  });

  $('cancelReviewBtn')?.addEventListener('click', () => {
    $('submitBookReviewForm').hidden = true;
  });

  $('submitBookReviewForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.currentDetailBookId) return;
    const rating = Number($('selectedRatingValue').value) || 5;
    const comment = $('reviewCommentInput').value.trim();

    try {
      await api(`/reviews/book/${state.currentDetailBookId}`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment: comment || undefined }),
      });
      notify('Cảm ơn bạn đã gửi đánh giá cuốn sách ⭐!');
      $('submitBookReviewForm').hidden = true;
      $('reviewCommentInput').value = '';
      loadBookReviews(state.currentDetailBookId);
    } catch (err) {
      notify(err.message, true);
    }
  });

  $('refreshShelves')?.addEventListener('click', loadShelves);
  $('shelfFloorFilter')?.addEventListener('change', renderShelvesGrid);
  $('shelfAisleFilter')?.addEventListener('change', renderShelvesGrid);
  // shelfSearchTimer declared at top
  $('shelfSearch')?.addEventListener('input', () => {
    clearTimeout(shelfSearchTimer);
    shelfSearchTimer = setTimeout(renderShelvesGrid, 250);
  });

  // Giao diện mô phỏng 2D Interactive Floor Plan
  let currentShelfFloor = '1';
  let currentSelectedShelf = null;

  function renderShelvesFloorPlan(targetFloor) {
    if (targetFloor) currentShelfFloor = String(targetFloor);
    const container = $('shelfAislesVisualContainer');
    if (!container) return;

    const normFloor = (f) => String(f || '').replace(/\D/g, '').trim() || String(f || '').trim();
    const curNorm = normFloor(currentShelfFloor);
    const floorShelves = shelvesData.filter((s) => {
      const sn = normFloor(s.floor);
      return sn === curNorm || String(s.floor).toLowerCase() === String(currentShelfFloor).toLowerCase();
    });
    if (!floorShelves.length) {
      container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:36px;color:#64748b;background:#f8fafc;border-radius:8px;">
        Chưa có kệ sách nào được phân bổ cho Tầng ${escapeHtml(currentShelfFloor)}.
      </div>`;
      return;
    }

    const aislesMap = {};
    floorShelves.forEach((s) => {
      const a = s.aisle || 'Khác';
      if (!aislesMap[a]) aislesMap[a] = [];
      aislesMap[a].push(s);
    });

    container.innerHTML = Object.entries(aislesMap).map(([aisle, list]) => {
      list.sort((a, b) => String(a.shelf).localeCompare(String(b.shelf)));
      return `
        <div class="aisle-rack-block" style="background:#f1f5f9;border:1px solid #cbd5e1;border-radius:10px;padding:16px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;border-bottom:2px solid #e2e8f0;padding-bottom:8px;">
            <strong style="font-size:14px;color:#1e293b;">Dãy Kệ ${escapeHtml(aisle)}</strong>
            <span style="font-size:11px;font-weight:700;color:#64748b;">${list.length} Kệ</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr;gap:12px;">
            ${list.map((s) => {
        const total = s.totalCopies || 0;
        const avail = s.availableCopies || 0;
        const percent = total > 0 ? Math.min(100, Math.round((s.borrowedCopies / total) * 100)) : 0;
        let barColor = '#10b981';
        if (percent >= 90) barColor = '#ef4444';
        else if (percent >= 70) barColor = '#f59e0b';

        return `
                <div class="shelf-interactive-card" data-shelf-floor="${escapeHtml(s.floor)}" data-shelf-aisle="${escapeHtml(s.aisle)}" data-shelf-num="${escapeHtml(s.shelf)}"
                  style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:12px;cursor:pointer;transition:all 0.2s cubic-bezier(0.4, 0, 0.2, 1);box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                    <div style="display:flex;align-items:center;gap:6px;">
                      <span style="font-size:15px;">📚</span>
                      <strong style="font-size:13px;color:#0f172a;">Kệ ${escapeHtml(s.shelf)}</strong>
                    </div>
                    <span style="font-size:11px;font-weight:700;color:#0284c7;">${avail}/${total} cuốn sẵn</span>
                  </div>
                  <div style="width:100%;height:8px;background:#e2e8f0;border-radius:999px;overflow:hidden;margin-bottom:4px;">
                    <div style="width:${percent}%;height:100%;background:${barColor};transition:width 0.3s ease;"></div>
                  </div>
                  <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#64748b;">
                    <span>Tỷ lệ mượn: ${percent}%</span>
                    <span style="color:#2563eb;font-weight:600;">Xem chi tiết ➔</span>
                  </div>
                </div>
              `;
      }).join('')}
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.shelf-interactive-card').forEach((card) => {
      card.addEventListener('click', () => {
        const floor = card.dataset.shelfFloor;
        const aisle = card.dataset.shelfAisle;
        const shelf = card.dataset.shelfNum;
        openShelfDetailModal(floor, aisle, shelf);
      });
    });
  }

  async function openShelfDetailModal(floor, aisle, shelf) {
    currentSelectedShelf = { floor, aisle, shelf };
    const dialog = $('shelfDetailDialog');
    if (!dialog) return;

    if ($('shelfDetailTitle')) $('shelfDetailTitle').textContent = `📦 Ấn phẩm tại Kệ ${shelf} (Dãy ${aisle})`;
    if ($('shelfDetailSubtitle')) $('shelfDetailSubtitle').textContent = `Vị trí: Tầng ${floor} · Dãy ${aisle} · Kệ ${shelf}`;
    const tbody = $('shelfDetailTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:#888;">Đang tải danh sách sách...</td></tr>';
    dialog.showModal();

    try {
      const books = await api(`/books/shelves/books?floor=${encodeURIComponent(floor)}&aisle=${encodeURIComponent(aisle)}&shelf=${encodeURIComponent(shelf)}`);
      if (!tbody) return;
      if (!books.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:#888;">Kệ này hiện chưa có ấn phẩm nào.</td></tr>';
        return;
      }
      tbody.innerHTML = books.map((b) => {
        const isAvail = b.status === 'AVAILABLE';
        const stBg = isAvail ? '#dcfce7' : '#fee2e2';
        const stColor = isAvail ? '#166534' : '#991b1b';
        return `
          <tr>
            <td><code>${escapeHtml(b.barcode)}</code></td>
            <td><strong>${escapeHtml(b.title || '—')}</strong></td>
            <td>${escapeHtml(b.author || '—')}</td>
            <td>${escapeHtml(b.isbn || '—')}</td>
            <td><span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;background:${stBg};color:${stColor};">${escapeHtml(b.status)}</span></td>
          </tr>
        `;
      }).join('');
    } catch (e) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;color:#c00;">✕ Lỗi: ${escapeHtml(e.message)}</td></tr>`;
      notify(`Lỗi tải sách trên kệ: ${e.message}`, true);
    }
  }

  $('shelfQuickAuditBtn')?.addEventListener('click', () => {
    if (!currentSelectedShelf) return;
    $('shelfDetailDialog')?.close();
    const navLink = document.querySelector('[data-route="inventory-audit"]');
    if (navLink) navLink.click();
    setTimeout(() => {
      if ($('auditFloorFilter')) $('auditFloorFilter').value = currentSelectedShelf.floor;
      if ($('auditAisleFilter')) $('auditAisleFilter').value = currentSelectedShelf.aisle;
      if ($('auditShelfFilter')) $('auditShelfFilter').value = currentSelectedShelf.shelf;
      notify(`🔍 Đã chuyển sang màn hình Kiểm kê cho Kệ ${currentSelectedShelf.shelf}!`);
    }, 300);
  });

  let isShelf3DMode = false;
  function resetShelf3DMode() {
    isShelf3DMode = false;
    const container = $('shelfAislesVisualContainer');
    if (container) {
      container.style.transform = 'none';
      container.style.boxShadow = 'none';
      container.style.background = 'transparent';
      container.style.padding = '0';
    }
  }

  $('shelfViewModeFloorPlanBtn')?.addEventListener('click', () => {
    $('shelfFloorPlanPanel')?.removeAttribute('hidden');
    $('shelfGrid')?.setAttribute('hidden', 'true');
    $('shelfViewModeFloorPlanBtn')?.classList.replace('button-light', 'button-primary');
    $('shelfViewModeGridBtn')?.classList.replace('button-primary', 'button-light');
    $('shelfViewMode3DBtn')?.classList.replace('button-primary', 'button-light');
    resetShelf3DMode();
  });

  $('shelfViewModeGridBtn')?.addEventListener('click', () => {
    $('shelfFloorPlanPanel')?.setAttribute('hidden', 'true');
    $('shelfGrid')?.removeAttribute('hidden');
    $('shelfViewModeGridBtn')?.classList.replace('button-light', 'button-primary');
    $('shelfViewModeFloorPlanBtn')?.classList.replace('button-primary', 'button-light');
    $('shelfViewMode3DBtn')?.classList.replace('button-primary', 'button-light');
    resetShelf3DMode();
  });

  $('shelfViewMode3DBtn')?.addEventListener('click', () => {
    $('shelfFloorPlanPanel')?.removeAttribute('hidden');
    $('shelfGrid')?.setAttribute('hidden', 'true');
    $('shelfViewMode3DBtn')?.classList.replace('button-light', 'button-primary');
    $('shelfViewModeFloorPlanBtn')?.classList.replace('button-primary', 'button-light');
    $('shelfViewModeGridBtn')?.classList.replace('button-primary', 'button-light');
    isShelf3DMode = true;
    const container = $('shelfAislesVisualContainer');
    if (container) {
      container.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
      container.style.transform = 'perspective(900px) rotateX(24deg) rotateZ(-5deg) scale(0.96)';
      container.style.transformStyle = 'preserve-3d';
      container.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
      container.style.borderRadius = '16px';
      container.style.background = '#e2e8f0';
      container.style.padding = '24px';
    }
    notify('🏢 Đã kích hoạt mô phỏng không gian 3D Isometric cho kho sách.');
  });

  document.querySelectorAll('#shelfFloorPlanTabs [data-floor-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#shelfFloorPlanTabs [data-floor-tab]').forEach((t) => {
        t.classList.replace('button-primary', 'button-light');
      });
      tab.classList.replace('button-light', 'button-primary');
      renderShelvesFloorPlan(tab.dataset.floorTab);
    });
  });


  // ==========================================
  // TÍNH NĂNG: NHẬT KÝ HỆ THỐNG (AUDIT LOGS)
  // ==========================================
  // auditLogsList declared at top

  async function loadAuditLogs() {
    const tbody = $('auditLogTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:#888;">Đang tải nhật ký...</td></tr>';

    const module = $('auditLogModuleFilter')?.value || '';
    const level = $('auditLogLevelFilter')?.value || '';
    const search = $('auditLogSearch')?.value || '';
    const params = new URLSearchParams();
    if (module) params.append('module', module);
    if (level) params.append('level', level);
    if (search.trim()) params.append('search', search.trim());
    params.append('limit', '100');

    try {
      const data = await api('/audit-logs?' + params.toString());
      auditLogsList = data.items || [];

      if (!auditLogsList.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:#888;">Không có nhật ký thao tác nào.</td></tr>';
        return;
      }

      tbody.innerHTML = auditLogsList.map((log) => {
        const time = new Date(log.createdAt).toLocaleString('vi-VN');
        const role = roleTitle(log.performerRole) || log.performerRole || 'Hệ thống';
        const lvl = (log.level || 'INFO').toUpperCase();
        let badgeStyle = 'background:#e0f2fe;color:#0369a1;';
        if (lvl === 'WARNING' || lvl === 'WARN') badgeStyle = 'background:#fef3c7;color:#92400e;';
        else if (lvl === 'ERROR' || lvl === 'DANGER') badgeStyle = 'background:#fee2e2;color:#991b1b;';
        const levelBadge = `<span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;${badgeStyle}">${escapeHtml(lvl)}</span>`;

        return `<tr>
          <td style="font-size:11px;white-space:nowrap;color:#555;">${time}</td>
          <td>${levelBadge}</td>
          <td><strong>${escapeHtml(log.performerName || 'Hệ thống')}</strong></td>
          <td><span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;background:#edf2ff;color:#4a5e9a;">${escapeHtml(role)}</span></td>
          <td><span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;background:#e2e8f0;color:#334155;">${escapeHtml(log.module)}</span></td>
          <td><code>${escapeHtml(log.action)}</code></td>
          <td style="font-size:12px;">${escapeHtml(log.description)}</td>
          <td style="font-size:11px;color:#718096;font-family:monospace;">${escapeHtml(log.ipAddress || '—')}</td>
        </tr>`;
      }).join('');
    } catch (e) {
      notify(`Lỗi tải nhật ký hệ thống: ${e.message}`, true);
    }
  }

  function exportAuditLogsCsv() {
    if (!auditLogsList.length) return notify('Không có dữ liệu nhật ký để xuất.', true);
    const header = ['Thoi_gian', 'Nguoi_thuc_hien', 'Vai_tro', 'Phan_he', 'Hanh_dong', 'Chi_tiet', 'IP'];
    const rows = auditLogsList.map((l) => [
      new Date(l.createdAt).toLocaleString('vi-VN'),
      l.performerName || 'Hệ thống',
      l.performerRole || '',
      l.module,
      l.action,
      l.description,
      l.ipAddress || '',
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c || '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `nhat_ky_he_thong_${Date.now()}.csv`;
    a.click();
    notify('Đã tải xuống file CSV nhật ký hệ thống.');
  }


  // ==========================================
  // XỬ LÝ SHOW/HIDE PASSWORD, REMEMBER ME, 2FA, QUÊN MẬT KHẨU
  // ==========================================
  document.addEventListener('click', (event) => {
    const toggleBtn = event.target.closest('[data-toggle-target]');
    if (!toggleBtn) return;
    const targetInput = $(toggleBtn.dataset.toggleTarget);
    if (!targetInput) return;
    if (targetInput.type === 'password') {
      targetInput.type = 'text';
      toggleBtn.textContent = '🙈';
    } else {
      targetInput.type = 'password';
      toggleBtn.textContent = '👁️';
    }
  });

  // Tự động khôi phục tài khoản đã nhớ (Remember Me)
  const savedUsername = localStorage.getItem('savedUsername');
  if (savedUsername && $('authUsername')) {
    $('authUsername').value = savedUsername;
    if ($('rememberMe')) $('rememberMe').checked = true;
  }

  // Quên mật khẩu dialog handlers
  $('openForgotPasswordBtn')?.addEventListener('click', () => {
    $('forgotStep1Form')?.reset();
    $('forgotStep2Form')?.reset();
    if ($('forgotStep1Form')) $('forgotStep1Form').hidden = false;
    if ($('forgotStep2Form')) $('forgotStep2Form').hidden = true;
    if ($('authUsername')?.value) {
      $('forgotIdentifier').value = $('authUsername').value.trim();
    }
    $('forgotPasswordDialog')?.showModal();
  });
  $('forgotStep1Form')?.addEventListener('submit', handleForgotStep1);
  $('forgotStep2Form')?.addEventListener('submit', handleForgotStep2);
  $('backToForgotStep1Btn')?.addEventListener('click', () => {
    if ($('forgotStep1Form')) $('forgotStep1Form').hidden = false;
    if ($('forgotStep2Form')) $('forgotStep2Form').hidden = true;
  });

  // MFA 2FA handler
  $('mfaForm')?.addEventListener('submit', handleMfaVerification);

  // Captcha refresh
  $('refreshCaptchaBtn')?.addEventListener('click', loadAuthCaptcha);


  // SỰ KIỆN QUẢN LÝ SÁCH & BỘ LỌC NÂNG CAO
  $('exportBooksExcelBtn')?.addEventListener('click', exportBooksExcel);
  $('resetBookFiltersBtn')?.addEventListener('click', () => {
    $('searchInput').value = '';
    $('categoryFilter').value = '';
    state.categoryId = '';
    $('availabilityFilter').value = '';
    $('publicationYearFilter').value = '';
    $('shelfFilter').value = '';
    $('floorFilter').value = '';
    $('aisleFilter').value = '';
    $('barcodeInput').value = '';
    void loadBooks(1);
    notify('Đã đặt lại tất cả bộ lọc tìm kiếm.');
  });

  // Upload ảnh bìa & PDF trong form sách
  $('bookCoverFileInput')?.addEventListener('change', function () {
    if (this.files && this.files[0]) handleCoverFileUpload(this.files[0]);
  });
  $('bookCoverImageUrl')?.addEventListener('input', function () {
    updateCoverPreview(this.value);
  });
  $('bookPdfFileInput')?.addEventListener('change', function () {
    if (this.files && this.files[0]) handlePdfFileUpload(this.files[0]);
  });
  $('bookPdfUrl')?.addEventListener('input', function () {
    if ($('bookTestPdfBtn')) {
      $('bookTestPdfBtn').style.display = this.value.trim() ? 'inline-block' : 'none';
    }
  });
  $('bookTestPdfBtn')?.addEventListener('click', () => {
    const url = $('bookPdfUrl')?.value.trim();
    const title = $('bookTitle')?.value.trim() || 'Tài liệu số';
    if (url) openPdfViewer(url, title);
  });

  // Audit logs event listeners
  initAuditModule();
  $('refreshAuditLogs')?.addEventListener('click', loadAuditLogs);
  $('exportAuditLogsCsv')?.addEventListener('click', exportAuditLogsCsv);
  $('auditLogModuleFilter')?.addEventListener('change', loadAuditLogs);
  $('auditLogLevelFilter')?.addEventListener('change', loadAuditLogs);
  // auditSearchTimer declared at top
  $('auditLogSearch')?.addEventListener('input', () => {
    clearTimeout(auditSearchTimer);
    auditSearchTimer = setTimeout(loadAuditLogs, 250);
  });


  // ==============================================================
  // PHÂN HỆ 1: QUẢN LÝ TÀI SẢN & KHÔNG GIAN THƯ VIỆN
  // ==============================================================

  // --- TRANG 1: QUẢN LÝ THIẾT BỊ (DEVICES) ---
  // devicesData, deviceLoansData, deviceMaintenancesData declared at top

  async function loadDevices() {
    try {
      const search = $('deviceSearchInput')?.value.trim() || '';
      const category = $('deviceCategoryFilter')?.value || '';
      const status = $('deviceStatusFilter')?.value || '';

      const query = new URLSearchParams();
      if (search) query.append('search', search);
      if (category) query.append('category', category);
      if (status) query.append('status', status);

      const [devices, stats, loans, maintenances] = await Promise.all([
        api('/devices?' + query.toString()).catch(() => []),
        api('/devices/stats').catch(() => ({})),
        api('/devices/loans').catch(() => []),
        api('/devices/maintenances').catch(() => []),
      ]);

      devicesData = devices || [];
      deviceLoansData = loans || [];
      deviceMaintenancesData = maintenances || [];

      // Update stats
      if ($('statTotalDevices')) $('statTotalDevices').textContent = stats.totalDevices || 0;
      if ($('statAvailableDevices')) $('statAvailableDevices').textContent = stats.statusCounts?.available || 0;
      if ($('statBorrowedDevices')) $('statBorrowedDevices').textContent = stats.statusCounts?.borrowed || 0;
      if ($('statMaintenanceDevices')) $('statMaintenanceDevices').textContent = (stats.statusCounts?.maintenance || 0) + (stats.statusCounts?.damaged || 0);

      renderDevicesTable();
      renderDeviceLoansTable();
      renderDeviceMaintenanceTable();
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu thiết bị:', err);
      const tbody = $('devicesTableBody');
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:#dc3545;"><i class="fas fa-exclamation-triangle"></i> Không thể tải danh sách thiết bị: ${escapeHtml(err.message)}<br><button class="button button-sm button-light" style="margin-top:8px;" onclick="loadDevices()">Thử lại</button></td></tr>`;
      }
      const loansTbody = $('devicesLoansTableBody');
      if (loansTbody) {
        loansTbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:2rem;color:#dc3545;">Không thể tải danh sách mượn: ${escapeHtml(err.message)}</td></tr>`;
      }
      const maintTbody = $('devicesMaintenanceTableBody');
      if (maintTbody) {
        maintTbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem;color:#dc3545;">Không thể tải danh sách bảo dưỡng: ${escapeHtml(err.message)}</td></tr>`;
      }
    }
  }
  window.loadDevices = loadDevices;

  function renderDevicesTable() {
    const tbody = $('devicesTableBody');
    if (!tbody) return;

    if (!devicesData.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:#888;">Không tìm thấy thiết bị nào phù hợp.</td></tr>';
      return;
    }

    tbody.innerHTML = devicesData.map((d) => {
      let statusBadge = '<span class="status-badge status-active">Khả dụng</span>';
      if (d.status === 'BORROWED') statusBadge = '<span class="status-badge" style="background:#e0f2fe;color:#0284c7;">Đang mượn</span>';
      else if (d.status === 'MAINTENANCE') statusBadge = '<span class="status-badge status-warning">Đang bảo trì</span>';
      else if (d.status === 'DAMAGED') statusBadge = '<span class="status-badge status-danger">Hỏng / Lỗi</span>';

      const fineFormatted = Number(d.hourlyFineRate || 0).toLocaleString('vi-VN') + ' ₫';

      return `
        <tr>
          <td><strong>${escapeHtml(d.code)}</strong></td>
          <td>
            <div style="font-weight:600;color:#1e293b;">${escapeHtml(d.name)}</div>
            <div style="font-size:12px;color:#64748b;">${escapeHtml(d.specs || 'Chưa cập nhật cấu hình')}</div>
            ${d.serialNumber ? `<span style="font-size:11px;background:#f1f5f9;padding:2px 6px;border-radius:4px;">SN: ${escapeHtml(d.serialNumber)}</span>` : ''}
          </td>
          <td>
            <div>${escapeHtml(d.category)}</div>
            <small style="color:#64748b;">${escapeHtml(d.location || 'Kho chung')}</small>
          </td>
          <td>${escapeHtml(d.accessories || 'Không có')}</td>
          <td>${fineFormatted}</td>
          <td>${statusBadge}</td>
          <td>
            <div class="button-row" style="gap:4px;">
              ${d.status === 'AVAILABLE' ? `<button class="button button-sm button-accent" data-device-quick-loan="${d.id}">Mượn</button>` : ''}
              <button class="button button-sm button-light" data-device-edit="${d.id}">Sửa</button>
              ${d.status !== 'BORROWED' ? `<button class="button button-sm button-danger" data-device-delete="${d.id}">Xóa</button>` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Wire actions
    tbody.querySelectorAll('[data-device-quick-loan]').forEach((btn) => {
      btn.addEventListener('click', () => openDeviceLoanDialog(Number(btn.dataset.deviceQuickLoan)));
    });
    tbody.querySelectorAll('[data-device-delete]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Bạn có chắc chắn muốn xóa thiết bị này không?')) return;
        try {
          await api('/devices/' + btn.dataset.deviceDelete, { method: 'DELETE' });
          notify('Đã xóa thiết bị thành công!');
          void loadDevices();
        } catch (err) {
          notify(err.message, true);
        }
      });
    });
  }

  function renderDeviceLoansTable() {
    const tbody = $('devicesLoansTableBody');
    if (!tbody) return;

    if (!deviceLoansData.length) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:#888;">Chưa có phiếu mượn thiết bị nào.</td></tr>';
      return;
    }

    tbody.innerHTML = deviceLoansData.map((loan) => {
      let statusBadge = '<span class="status-badge" style="background:#e0f2fe;color:#0284c7;">Đang mượn</span>';
      if (loan.status === 'RETURNED') statusBadge = '<span class="status-badge status-active">Đã trả</span>';
      else if (loan.status === 'OVERDUE') statusBadge = '<span class="status-badge status-danger">Quá hạn</span>';
      else if (loan.status === 'DAMAGED') statusBadge = '<span class="status-badge status-danger">Hỏng hóc</span>';

      const borrowedDate = new Date(loan.borrowedAt).toLocaleString('vi-VN');
      const expectedDate = new Date(loan.expectedReturnAt).toLocaleString('vi-VN');
      const fineFormatted = Number(loan.fineAmount || 0) > 0 ? `<strong style="color:#e11d48;">${Number(loan.fineAmount).toLocaleString('vi-VN')} ₫</strong>` : '0 ₫';

      return `
        <tr>
          <td><strong>DEV-LOAN-#${loan.id}</strong></td>
          <td>
            <strong>${escapeHtml(loan.device?.name || 'Thiết bị')}</strong>
            <div style="font-size:12px;color:#64748b;">${escapeHtml(loan.device?.code || '')}</div>
          </td>
          <td>
            <div>${escapeHtml(loan.user?.fullName || loan.user?.username || 'Độc giả')}</div>
            <small style="color:#64748b;">${escapeHtml(loan.user?.email || '')}</small>
          </td>
          <td>${borrowedDate}</td>
          <td>${expectedDate}</td>
          <td>${escapeHtml(loan.preCondition || '-')}</td>
          <td>${fineFormatted}</td>
          <td>${statusBadge}</td>
          <td>
            <div class="button-row" style="gap:4px;">
              ${loan.status === 'ACTIVE' || loan.status === 'OVERDUE' ? `<button class="button button-sm button-primary" data-device-return="${loan.id}">Nhận trả</button>` : ''}
              <button class="button button-sm button-light" data-device-handover="${loan.id}">Biên bản</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('[data-device-return]').forEach((btn) => {
      btn.addEventListener('click', () => openReturnDeviceDialog(Number(btn.dataset.deviceReturn)));
    });
    tbody.querySelectorAll('[data-device-handover]').forEach((btn) => {
      btn.addEventListener('click', () => printDeviceHandoverSlip(Number(btn.dataset.deviceHandover)));
    });
  }

  function renderDeviceMaintenanceTable() {
    const tbody = $('devicesMaintenanceTableBody');
    if (!tbody) return;

    if (!deviceMaintenancesData.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:#888;">Chưa có lịch bảo dưỡng nào.</td></tr>';
      return;
    }

    tbody.innerHTML = deviceMaintenancesData.map((m) => {
      const scheduled = new Date(m.scheduledDate).toLocaleDateString('vi-VN');
      const isDone = Boolean(m.completedDate);
      const statusBadge = isDone ? '<span class="status-badge status-active">Đã hoàn tất</span>' : '<span class="status-badge status-warning">Đang xử lý</span>';

      return `
        <tr>
          <td><strong>${escapeHtml(m.device?.name || '')}</strong> (${escapeHtml(m.device?.code || '')})</td>
          <td>${escapeHtml(m.title)}</td>
          <td>${escapeHtml(m.maintenanceType)}</td>
          <td>${scheduled}</td>
          <td>${escapeHtml(m.technician || 'Thủ thư')}</td>
          <td>${Number(m.cost || 0).toLocaleString('vi-VN')} ₫</td>
          <td>${statusBadge}</td>
          <td>
            ${!isDone ? `<button class="button button-sm button-primary" data-maintenance-complete="${m.id}">Xong</button>` : '<span style="color:#10b981;">✓</span>'}
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('[data-maintenance-complete]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await api(`/devices/maintenances/${btn.dataset.maintenanceComplete}/complete`, {
            method: 'POST',
            body: JSON.stringify({ notes: 'Bảo dưỡng hoàn tất, đã kiểm tra đạt chuẩn' }),
          });
          notify('Đã hoàn tất bảo dưỡng thiết bị!');
          void loadDevices();
        } catch (err) {
          notify(err.message, true);
        }
      });
    });
  }

  async function openDeviceLoanDialog(deviceId) {
    const dialog = $('createDeviceLoanDialog');
    if (!dialog) return;

    if (!state.users || !state.users.length) {
      try {
        const uList = await api('/users');
        state.users = uList || [];
      } catch (err) {
        console.warn('Không tải được danh sách độc giả:', err);
      }
    }

    // Populate devices select
    const devSelect = $('loanDeviceId');
    devSelect.innerHTML = devicesData
      .filter((d) => d.status === 'AVAILABLE' || d.id === deviceId)
      .map((d) => `<option value="${d.id}" ${d.id === deviceId ? 'selected' : ''}>${escapeHtml(d.code)} - ${escapeHtml(d.name)}</option>`)
      .join('');

    // Populate users select
    const userSelect = $('loanUserId');
    userSelect.innerHTML = (state.users || []).map((u) => `<option value="${u.id}">${escapeHtml(u.fullName || u.username)} (${escapeHtml(u.email || u.username)})</option>`).join('');

    dialog.showModal();
  }

  function openReturnDeviceDialog(loanId) {
    const loan = deviceLoansData.find((l) => l.id === loanId);
    if (!loan) return;

    $('returnLoanId').value = String(loan.id);
    $('returnDeviceNameText').textContent = `${loan.device?.name || ''} (${loan.device?.code || ''})`;
    $('returnBorrowerNameText').textContent = loan.user?.fullName || loan.user?.username || 'Độc giả';
    $('returnExpectedText').textContent = new Date(loan.expectedReturnAt).toLocaleString('vi-VN');

    $('returnDeviceLoanDialog').showModal();
  }

  async function printDeviceHandoverSlip(loanId) {
    try {
      const data = await api(`/devices/loans/${loanId}/handover`);
      const slipHtml = `
        <html>
        <head>
          <title>BIÊN BẢN BÀN GIAO THIẾT BỊ - ${data.receiptNumber}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 24px; color: #1e293b; max-width: 650px; margin: auto; }
            h2 { text-align: center; margin-bottom: 4px; color: #123c35; }
            .header-info { text-align: center; font-size: 13px; color: #64748b; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 14px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 12px; font-size: 14px; }
            th { background: #f8fafc; text-align: left; }
            .signatures { display: flex; justify-content: space-between; margin-top: 40px; padding: 0 40px; text-align: center; }
          </style>
        </head>
        <body>
          <h2>BIÊN BẢN BÀN GIAO THIẾT BỊ HỌC TẬP</h2>
          <div class="header-info">Mã biên bản: <strong>${data.receiptNumber}</strong> | Thư viện Đại học</div>
          <table>
            <tr><th>Thiết bị</th><td>${data.device.name} (Mã: ${data.device.code})</td></tr>
            <tr><th>Số Serial</th><td>${data.device.serialNumber || 'N/A'}</td></tr>
            <tr><th>Phụ kiện bàn giao</th><td>${data.device.accessories || 'Trọn bộ tiêu chuẩn'}</td></tr>
            <tr><th>Người mượn</th><td>${data.borrower.fullName} (Email: ${data.borrower.email})</td></tr>
            <tr><th>Thời gian mượn</th><td>${new Date(data.loanDate).toLocaleString('vi-VN')}</td></tr>
            <tr><th>Hạn trả dự kiến</th><td>${new Date(data.expectedReturnDate).toLocaleString('vi-VN')}</td></tr>
            <tr><th>Tình trạng khi giao</th><td>${data.preCondition}</td></tr>
            ${data.actualReturnDate ? `<tr><th>Thời gian trả thực tế</th><td>${new Date(data.actualReturnDate).toLocaleString('vi-VN')}</td></tr>` : ''}
            ${data.fineAmount > 0 ? `<tr><th>Tiền phạt quá hạn / hư hao</th><td><strong>${Number(data.fineAmount).toLocaleString('vi-VN')} ₫</strong></td></tr>` : ''}
          </table>
          <div class="signatures">
            <div>
              <strong>ĐẠI DIỆN THỦ THƯ</strong><br><br><br>
              <span>(Ký & ghi rõ họ tên)</span>
            </div>
            <div>
              <strong>NGƯỜI MƯỢN THIẾT BỊ</strong><br><br><br>
              <span>(Ký & ghi rõ họ tên)</span>
            </div>
          </div>
        </body>
        </html>
      `;
      const win = window.open('', '_blank');
      win.document.write(slipHtml);
      win.document.close();
      win.print();
    } catch (err) {
      notify(err.message, true);
    }
  }


  // --- TRANG 2: PHÒNG HỌC NHÓM (STUDY ROOMS) ---
  // studyRoomsData, roomBookingsData declared at top

  async function loadStudyRooms(selectedDate) {
    try {
      const date = selectedDate || $('studyRoomDateInput')?.value || new Date().toISOString().slice(0, 10);
      if ($('studyRoomDateInput')) $('studyRoomDateInput').value = date;

      const [calendar, stats, bookings] = await Promise.all([
        api('/study-rooms/calendar?date=' + date).catch(() => ({ rooms: [] })),
        api('/study-rooms/stats').catch(() => ({})),
        api('/study-rooms/bookings?date=' + date).catch(() => []),
      ]);

      studyRoomsData = calendar.rooms || [];
      roomBookingsData = bookings || [];

      if ($('statTotalStudyRooms')) $('statTotalStudyRooms').textContent = stats.totalRooms || 0;
      if ($('statActiveStudyRooms')) $('statActiveStudyRooms').textContent = stats.activeRooms || 0;
      if ($('statTotalRoomBookings')) $('statTotalRoomBookings').textContent = stats.totalBookings || 0;
      if ($('statRoomCheckInRate')) $('statRoomCheckInRate').textContent = (stats.checkInRate || 0) + '%';

      renderStudyRoomsCalendarGrid();
      renderStudyRoomBookingsTable();
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu phòng học:', err);
      const grid = $('studyRoomsGrid');
      if (grid) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:2rem;color:#dc3545;"><i class="fas fa-exclamation-triangle"></i> Không thể tải sơ đồ phòng học: ${escapeHtml(err.message)}<br><button class="button button-sm button-light" style="margin-top:8px;" onclick="loadStudyRooms()">Thử lại</button></div>`;
      }
      const bookingsTbody = $('studyRoomsBookingsTableBody');
      if (bookingsTbody) {
        bookingsTbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:#dc3545;">Không thể tải danh sách đặt phòng: ${escapeHtml(err.message)}</td></tr>`;
      }
    }
  }
  window.loadStudyRooms = loadStudyRooms;

  function renderStudyRoomsCalendarGrid() {
    const grid = $('studyRoomsGrid');
    if (!grid) return;

    if (!studyRoomsData.length) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2rem;color:#888;">Chưa có dữ liệu phòng học nào.</div>';
      return;
    }

    grid.innerHTML = studyRoomsData.map((room) => {
      const bookings = room.dayBookings || [];
      let statusBadge = '<span class="status-badge status-active">Hoạt động</span>';
      if (room.status !== 'ACTIVE') statusBadge = '<span class="status-badge status-warning">Bảo trì/Khóa</span>';

      const bookedSlotsHtml = bookings.length
        ? bookings.map((b) => `
            <div style="background:#e0f2fe;border:1px solid #bae6fd;padding:6px 10px;border-radius:6px;margin-bottom:6px;font-size:12px;">
              <strong style="color:#0369a1;">${escapeHtml(b.startTime)} - ${escapeHtml(b.endTime)}</strong>: ${escapeHtml(b.groupName)} (${b.memberCount} ng)
              <span class="status-badge" style="font-size:10px;padding:1px 5px;margin-left:4px;">${b.status}</span>
            </div>
          `).join('')
        : '<div style="font-size:13px;color:#10b981;">✓ Toàn bộ khung giờ trong ngày đang trống</div>';

      return `
        <div class="dashboard-card" style="padding:16px;border-radius:10px;background:#fff;border:1px solid #e2e8f0;display:flex;flex-direction:column;justify-content:space-between;">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
              <div>
                <strong style="font-size:16px;color:#123c35;">${escapeHtml(room.name)}</strong>
                <div style="font-size:12px;color:#64748b;">Mã: ${escapeHtml(room.code)} | Sức chứa: <strong>${room.capacity} người</strong></div>
              </div>
              ${statusBadge}
            </div>
            <div style="font-size:12px;color:#475569;margin-bottom:12px;background:#f8fafc;padding:8px;border-radius:6px;">
              🛠️ Trang bị: <strong>${escapeHtml(room.equipment || 'Bảng trắng, bàn nhóm')}</strong><br>
              🕒 Giờ mở: <strong>${room.openingTime} - ${room.closingTime}</strong> (Tối đa ${room.maxBookingHours}h/lượt)
            </div>
            <div style="margin-bottom:12px;">
              <strong style="font-size:12px;color:#64748b;display:block;margin-bottom:6px;">Lịch đã đăng ký:</strong>
              ${bookedSlotsHtml}
            </div>
          </div>
          <div class="button-row" style="margin-top:12px;border-top:1px solid #f1f5f9;padding-top:10px;display:flex;gap:6px;flex-wrap:wrap;align-items:center;justify-content:space-between;">
            <div style="display:flex;gap:6px;">
              <button class="button button-sm button-primary" data-room-book="${room.id}">📅 Đặt phòng</button>
              <button class="button button-sm button-light" data-room-qr="${room.id}">📱 Mã QR</button>
            </div>
            <span style="font-size:11px;color:#64748b;align-self:center;"><code>${escapeHtml(room.qrToken || '')}</code></span>
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('[data-room-book]').forEach((btn) => {
      btn.addEventListener('click', () => openBookRoomDialog(Number(btn.dataset.roomBook)));
    });

    grid.querySelectorAll('[data-room-qr]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const roomId = Number(btn.dataset.roomQr);
        const room = studyRoomsData.find((r) => r.id === roomId);
        if (room) openRoomQrModal(room);
      });
    });
  }

  function renderStudyRoomBookingsTable() {
    const tbody = $('studyRoomsBookingsTableBody');
    if (!tbody) return;

    const filterStatus = $('bookingStatusFilter')?.value || '';
    const filtered = filterStatus ? roomBookingsData.filter((b) => b.status === filterStatus) : roomBookingsData;

    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:#888;">Không có yêu cầu đặt phòng nào.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map((b) => {
      let statusBadge = '<span class="status-badge status-warning">Chờ duyệt</span>';
      if (b.status === 'APPROVED') statusBadge = '<span class="status-badge" style="background:#e0f2fe;color:#0284c7;">Đã duyệt</span>';
      else if (b.status === 'CHECKED_IN') statusBadge = '<span class="status-badge status-active">Đã Check-in</span>';
      else if (b.status === 'NO_SHOW') statusBadge = '<span class="status-badge status-danger">Vắng mặt (No-Show)</span>';
      else if (b.status === 'CANCELLED') statusBadge = '<span class="status-badge" style="background:#f1f5f9;color:#64748b;">Đã hủy</span>';

      return `
        <tr>
          <td><strong>${escapeHtml(b.room?.name || '')}</strong></td>
          <td>
            <strong>${escapeHtml(b.groupName)}</strong>
            <div style="font-size:12px;color:#64748b;">Người đặt: ${escapeHtml(b.user?.fullName || b.user?.username || '')}</div>
          </td>
          <td>
            <div>${b.memberCount} thành viên</div>
            <small style="color:#64748b;">${escapeHtml(b.purpose || '-')}</small>
          </td>
          <td>
            <strong>${b.date}</strong><br>
            <span style="color:#0284c7;font-weight:600;">${b.startTime} - ${b.endTime}</span>
          </td>
          <td>${statusBadge}</td>
          <td>${escapeHtml(b.rejectionReason || b.notes || '-')}</td>
          <td>
            <div class="button-row" style="gap:4px;">
              ${b.status === 'PENDING' && isStaff() ? `
                <button class="button button-sm button-primary" data-booking-approve="${b.id}">Duyệt</button>
                <button class="button button-sm button-danger" data-booking-reject="${b.id}">Từ chối</button>
              ` : ''}
              ${b.status === 'APPROVED' ? `
                <button class="button button-sm button-accent" data-booking-checkin="${b.id}">Quét QR Check-in</button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('[data-booking-approve]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await api(`/study-rooms/bookings/${btn.dataset.bookingApprove}/review`, {
            method: 'POST',
            body: JSON.stringify({ status: 'APPROVED' }),
          });
          notify('Đã phê duyệt yêu cầu đặt phòng!');
          void loadStudyRooms();
        } catch (err) {
          notify(err.message, true);
        }
      });
    });

    tbody.querySelectorAll('[data-booking-reject]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const reason = prompt('Nhập lý do từ chối đặt phòng:');
        if (reason === null) return;
        try {
          await api(`/study-rooms/bookings/${btn.dataset.bookingReject}/review`, {
            method: 'POST',
            body: JSON.stringify({ status: 'REJECTED', rejectionReason: reason }),
          });
          notify('Đã từ chối đơn đặt phòng.');
          void loadStudyRooms();
        } catch (err) {
          notify(err.message, true);
        }
      });
    });

    tbody.querySelectorAll('[data-booking-checkin]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const bookingId = Number(btn.dataset.bookingCheckin);
        const booking = roomBookingsData.find((b) => b.id === bookingId);
        $('checkInBookingId').value = bookingId;
        const token = booking?.room?.qrToken || '';
        $('checkInQrTokenInput').value = token;
        $('checkInStudyRoomDialog').showModal();
      });
    });
  }

  async function openBookRoomDialog(roomId) {
    const dialog = $('bookStudyRoomDialog');
    if (!dialog) return;

    if (!studyRoomsData || !studyRoomsData.length) {
      try {
        const cal = await api('/study-rooms/calendar');
        studyRoomsData = cal?.rooms || [];
      } catch (err) {
        console.warn('Không tải được danh sách phòng học:', err);
      }
    }

    const select = $('bookRoomSelect');
    select.innerHTML = (studyRoomsData || []).map((r) => `<option value="${r.id}" ${r.id === roomId ? 'selected' : ''}>${escapeHtml(r.name)} (Sức chứa: ${r.capacity} ng)</option>`).join('');

    $('bookDate').value = $('studyRoomDateInput')?.value || new Date().toISOString().slice(0, 10);
    dialog.showModal();
  }


  // --- TRANG 3: TỦ KHÓA CÁ NHÂN (LOCKERS) ---
  // lockersData, overdueLockersData declared at top

  async function loadLockers() {
    try {
      const zone = $('lockerZoneSelect')?.value || '';
      const status = $('lockerStatusSelect')?.value || '';
      const search = $('lockerSearchInput')?.value.trim() || '';

      const query = new URLSearchParams();
      if (zone) query.append('zone', zone);
      if (status) query.append('status', status);
      if (search) query.append('search', search);

      const [lockers, stats, overdue] = await Promise.all([
        api('/lockers?' + query.toString()).catch(() => []),
        api('/lockers/stats').catch(() => ({})),
        api('/lockers/overdue-alerts').catch(() => []),
      ]);

      lockersData = lockers || [];
      overdueLockersData = overdue || [];

      if ($('statTotalLockers')) $('statTotalLockers').textContent = stats.total || 0;
      if ($('statVacantLockers')) $('statVacantLockers').textContent = stats.vacant || 0;
      if ($('statInUseLockers')) $('statInUseLockers').textContent = stats.inUse || 0;
      if ($('statDamagedLockers')) $('statDamagedLockers').textContent = (stats.damaged || 0) + (stats.maintenance || 0);
      if ($('overdueLockersBadge')) $('overdueLockersBadge').textContent = overdue.length;

      renderLockersMatrix();
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu tủ khóa:', err);
      const container = $('lockersMatrixContainer');
      if (container) {
        container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:2rem;color:#dc3545;"><i class="fas fa-exclamation-triangle"></i> Không thể tải sơ đồ tủ khóa: ${escapeHtml(err.message)}<br><button class="button button-sm button-light" style="margin-top:8px;" onclick="loadLockers()">Thử lại</button></div>`;
      }
    }
  }
  window.loadLockers = loadLockers;

  function renderLockersMatrix() {
    const container = $('lockersMatrixContainer');
    if (!container) return;

    if (!lockersData.length) {
      container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2rem;color:#888;">Không có tủ khóa nào trong danh sách.</div>';
      return;
    }

    container.innerHTML = lockersData.map((l) => {
      let bg = '#ecfdf5';
      let border = '#10b981';
      let statusText = '🟢 Trống';
      let isOverdue = false;

      if (l.status === 'IN_USE') {
        const isAlert = overdueLockersData.some((o) => o.lockerNumber === l.lockerNumber);
        if (isAlert) {
          bg = '#fef2f2';
          border = '#ef4444';
          statusText = '🚨 Quên đồ (Quá hạn)';
          isOverdue = true;
        } else {
          bg = '#eff6ff';
          border = '#3b82f6';
          statusText = '🔵 Đang dùng';
        }
      } else if (l.status === 'DAMAGED' || l.status === 'MAINTENANCE') {
        bg = '#f8fafc';
        border = '#94a3b8';
        statusText = '🔧 Bảo dưỡng / Hỏng';
      }

      return `
        <div style="background:${bg};border:2px solid ${border};border-radius:8px;padding:12px;display:flex;flex-direction:column;justify-content:space-between;min-height:140px;">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <strong style="font-size:16px;color:#1e293b;">${escapeHtml(l.lockerNumber)}</strong>
              <span style="font-size:11px;font-weight:600;">${statusText}</span>
            </div>
            <div style="font-size:11px;color:#64748b;">${escapeHtml(l.zone)} | ${escapeHtml(l.cluster)}</div>
            ${l.status === 'IN_USE' ? `
              <div style="margin-top:6px;font-size:12px;">
                👤 ${escapeHtml(l.currentUser?.fullName || l.currentUser?.username || 'Độc giả')}<br>
                🔑 PIN: <strong style="color:#0369a1;background:#e0f2fe;padding:1px 4px;border-radius:3px;">${escapeHtml(l.currentPin || '****')}</strong>
              </div>
            ` : ''}
          </div>
          <div style="margin-top:10px;display:flex;gap:4px;flex-wrap:wrap;">
            ${l.status === 'VACANT' ? `
              <button class="button button-sm button-primary full-width" data-locker-assign="${l.id}">Cấp tủ</button>
            ` : l.status === 'IN_USE' ? `
              <button class="button button-sm button-danger" style="flex:1;" data-locker-release="${l.id}">Mở/Trả</button>
              <button class="button button-sm button-light" data-locker-reset-pin="${l.id}" title="Đổi mã PIN">Đổi PIN</button>
            ` : `
              <button class="button button-sm button-light full-width" data-locker-repaired="${l.id}">Sửa xong</button>
            `}
          </div>
        </div>
      `;
    }).join('');

    // Wire locker actions
    container.querySelectorAll('[data-locker-assign]').forEach((btn) => {
      btn.addEventListener('click', () => openAssignLockerDialog(Number(btn.dataset.lockerAssign)));
    });

    container.querySelectorAll('[data-locker-release]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Bạn có chắc chắn muốn giải phóng tủ này để đón lượt tiếp theo?')) return;
        try {
          const res = await api(`/lockers/${btn.dataset.lockerRelease}/release`, {
            method: 'POST',
            body: JSON.stringify({ actionType: 'NORMAL' }),
          });
          notify(res.message);
          void loadLockers();
        } catch (err) {
          notify(err.message, true);
        }
      });
    });

    container.querySelectorAll('[data-locker-reset-pin]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          const res = await api(`/lockers/${btn.dataset.lockerResetPin}/reset-pin`, { method: 'POST' });
          alert(`Đã cấp lại mã PIN mới: ${res.newPin}`);
          void loadLockers();
        } catch (err) {
          notify(err.message, true);
        }
      });
    });

    container.querySelectorAll('[data-locker-repaired]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await api(`/lockers/${btn.dataset.lockerRepaired}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'VACANT' }),
          });
          notify('Đã cập nhật tủ sang trạng thái Sẵn sàng sử dụng!');
          void loadLockers();
        } catch (err) {
          notify(err.message, true);
        }
      });
    });
  }

  function openAssignLockerDialog(lockerId) {
    const dialog = $('assignLockerDialog');
    if (!dialog) return;

    const select = $('assignLockerSelect');
    select.innerHTML = lockersData
      .filter((l) => l.status === 'VACANT' || l.id === lockerId)
      .map((l) => `<option value="${l.id}" ${l.id === lockerId ? 'selected' : ''}>${escapeHtml(l.lockerNumber)} (${escapeHtml(l.zone)})</option>`)
      .join('');

    const userSelect = $('assignUserSelect');
    userSelect.innerHTML = state.users.map((u) => `<option value="${u.id}">${escapeHtml(u.fullName || u.username)} (${escapeHtml(u.email || u.username)})</option>`).join('');

    dialog.showModal();
  }


  // ==============================================================
  // WIRE EVENT LISTENERS CHO PHÂN HỆ 1
  // ==============================================================

  // Devices events
  $('refreshDevicesBtn')?.addEventListener('click', () => void loadDevices());
  $('deviceSearchInput')?.addEventListener('input', () => void loadDevices());
  $('deviceCategoryFilter')?.addEventListener('change', () => void loadDevices());
  $('deviceStatusFilter')?.addEventListener('change', () => void loadDevices());

  $('tabDevicesListBtn')?.addEventListener('click', () => {
    $('devicesListPanel').hidden = false;
    $('devicesLoansPanel').hidden = true;
    $('devicesMaintenancePanel').hidden = true;
    $('tabDevicesListBtn').className = 'button button-primary';
    $('tabDevicesLoansBtn').className = 'button button-light';
    $('tabDevicesMaintenanceBtn').className = 'button button-light';
  });

  $('tabDevicesLoansBtn')?.addEventListener('click', () => {
    $('devicesListPanel').hidden = true;
    $('devicesLoansPanel').hidden = false;
    $('devicesMaintenancePanel').hidden = true;
    $('tabDevicesListBtn').className = 'button button-light';
    $('tabDevicesLoansBtn').className = 'button button-primary';
    $('tabDevicesMaintenanceBtn').className = 'button button-light';
  });

  $('tabDevicesMaintenanceBtn')?.addEventListener('click', () => {
    $('devicesListPanel').hidden = true;
    $('devicesLoansPanel').hidden = true;
    $('devicesMaintenancePanel').hidden = false;
    $('tabDevicesListBtn').className = 'button button-light';
    $('tabDevicesLoansBtn').className = 'button button-light';
    $('tabDevicesMaintenanceBtn').className = 'button button-primary';
  });

  $('openCreateDeviceBtn')?.addEventListener('click', () => $('createDeviceDialog').showModal());
  $('openCreateLoanBtn')?.addEventListener('click', () => openDeviceLoanDialog());

  $('createDeviceForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('/devices', {
        method: 'POST',
        body: JSON.stringify({
          code: $('newDeviceCode').value.trim(),
          name: $('newDeviceName').value.trim(),
          category: $('newDeviceCategory').value,
          serialNumber: $('newDeviceSerial').value.trim(),
          location: $('newDeviceLocation').value.trim(),
          specs: $('newDeviceSpecs').value.trim(),
          accessories: $('newDeviceAccessories').value.trim(),
          hourlyFineRate: Number($('newDeviceFineRate').value) || 10000,
          purchaseCost: Number($('newDeviceCost').value) || 0,
        }),
      });
      notify('Đã thêm thiết bị mới thành công!');
      $('createDeviceDialog').close();
      $('createDeviceForm').reset();
      void loadDevices();
    } catch (err) {
      notify(err.message, true);
    }
  });

  $('createDeviceLoanForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('/devices/loans', {
        method: 'POST',
        body: JSON.stringify({
          deviceId: Number($('loanDeviceId').value),
          userId: Number($('loanUserId').value),
          loanType: $('loanType').value,
          durationHours: Number($('loanDurationHours').value) || 3,
          preCondition: $('loanPreCondition').value.trim(),
          accessoriesChecked: $('loanAccessoriesChecked').checked,
        }),
      });
      notify('Đã tạo phiếu mượn thiết bị thành công!');
      $('createDeviceLoanDialog').close();
      void loadDevices();
    } catch (err) {
      notify(err.message, true);
    }
  });

  $('returnDeviceLoanForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const loanId = $('returnLoanId').value;
      const res = await api(`/devices/loans/${loanId}/return`, {
        method: 'POST',
        body: JSON.stringify({
          postCondition: $('returnPostCondition').value.trim(),
          accessoriesChecked: $('returnAccessoriesChecked').checked,
          additionalFine: Number($('returnAdditionalFine').value) || 0,
        }),
      });
      notify(res.message);
      $('returnDeviceLoanDialog').close();
      void loadDevices();
    } catch (err) {
      notify(err.message, true);
    }
  });


  // Study Rooms events
  $('refreshStudyRoomsBtn')?.addEventListener('click', () => void loadStudyRooms());
  $('studyRoomDateInput')?.addEventListener('change', () => void loadStudyRooms());
  $('bookingStatusFilter')?.addEventListener('change', () => renderStudyRoomBookingsTable());

  $('tabStudyRoomsCalendarBtn')?.addEventListener('click', () => {
    $('studyRoomsCalendarPanel').hidden = false;
    $('studyRoomsBookingsPanel').hidden = true;
    $('tabStudyRoomsCalendarBtn').className = 'button button-primary';
    $('tabStudyRoomsBookingsBtn').className = 'button button-light';
  });

  $('tabStudyRoomsBookingsBtn')?.addEventListener('click', () => {
    $('studyRoomsCalendarPanel').hidden = true;
    $('studyRoomsBookingsPanel').hidden = false;
    $('tabStudyRoomsCalendarBtn').className = 'button button-light';
    $('tabStudyRoomsBookingsBtn').className = 'button button-primary';
  });

  $('openBookStudyRoomBtn')?.addEventListener('click', () => openBookRoomDialog());

  $('autoCancelNoShowBtn')?.addEventListener('click', async () => {
    try {
      const res = await api('/study-rooms/auto-cancel-no-show', { method: 'POST' });
      notify(`Đã quét xong: Tự động hủy ${res.cancelledCount} đơn đặt vắng mặt sau 15 phút.`);
      void loadStudyRooms();
    } catch (err) {
      notify(err.message, true);
    }
  });

  $('bookStudyRoomForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('/study-rooms/bookings', {
        method: 'POST',
        body: JSON.stringify({
          roomId: Number($('bookRoomSelect').value),
          groupName: $('bookGroupName').value.trim(),
          memberCount: Number($('bookMemberCount').value) || 4,
          date: $('bookDate').value,
          startTime: $('bookStartTime').value,
          endTime: $('bookEndTime').value,
          purpose: $('bookPurpose').value.trim(),
        }),
      });
      notify('Đăng ký phòng học thành công! Chờ thủ thư xét duyệt.');
      $('bookStudyRoomDialog').close();
      $('bookStudyRoomForm').reset();
      void loadStudyRooms();
    } catch (err) {
      notify(err.message, true);
    }
  });

  $('checkInStudyRoomForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const bookingId = $('checkInBookingId').value;
      const res = await api(`/study-rooms/bookings/${bookingId}/check-in`, {
        method: 'POST',
        body: JSON.stringify({ qrToken: $('checkInQrTokenInput').value.trim() }),
      });
      notify(res.message);
      $('checkInStudyRoomDialog').close();
      void loadStudyRooms();
    } catch (err) {
      notify(err.message, true);
    }
  });

  // Modal hiển thị QR Token cửa phòng
  function openRoomQrModal(room) {
    if (!room) return;
    const dialog = $('showRoomQrDialog');
    if (!dialog) return;

    if ($('showRoomQrTitle')) $('showRoomQrTitle').textContent = `Mã QR Phòng: ${room.name}`;
    if ($('showRoomQrSubtitle')) $('showRoomQrSubtitle').textContent = `Mã phòng: ${room.code} · Sức chứa: ${room.capacity} người · Tầng ${room.floor || 2}`;
    if ($('showRoomQrTokenText')) $('showRoomQrTokenText').textContent = room.qrToken || `ROOM-${room.code}`;

    const qrContainer = $('showRoomQrImageContainer');
    if (qrContainer) {
      const token = room.qrToken || `ROOM-${room.code}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(token)}`;
      qrContainer.innerHTML = `<img src="${qrUrl}" alt="QR ${escapeHtml(room.name)}" style="width:190px;height:190px;display:block;margin:0 auto;border-radius:8px;" onerror="this.outerHTML='<div style=\\\'padding:20px;font-weight:700;color:#0369a1;background:#e0f2fe;border-radius:8px;\\\'>${escapeHtml(token)}</div>'">`;
    }
    dialog.showModal();
  }

  $('printRoomQrCardBtn')?.addEventListener('click', () => {
    window.print();
  });

  // Chọn nhanh khung giờ đặt phòng 2 tiếng
  document.querySelectorAll('[data-slot-start][data-slot-end]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if ($('bookStartTime')) $('bookStartTime').value = btn.dataset.slotStart;
      if ($('bookEndTime')) $('bookEndTime').value = btn.dataset.slotEnd;
      document.querySelectorAll('[data-slot-start][data-slot-end]').forEach((b) => {
        b.classList.replace('button-primary', 'button-light');
      });
      btn.classList.replace('button-light', 'button-primary');
    });
  });

  // Quét QR Check-in Camera Trực tuyến cho Phòng học
  let studyRoomCameraStream = null;
  let studyRoomCameraDetector = null;
  let studyRoomHtml5Qr = null;
  let studyRoomCameraScanning = false;
  let lastScannedRoomToken = '';
  let lastScannedRoomTime = 0;

  async function handleStudyRoomQrToken(raw) {
    if (!raw) return;
    const msg = $('studyRoomCameraMsg');
    const curDate = new Date().toISOString().slice(0, 10);
    const booking = roomBookingsData.find(
      (b) => (b.room?.qrToken === raw || `ROOM-${b.room?.code}` === raw) &&
        b.status === 'APPROVED' &&
        (!b.date || b.date === curDate)
    );

    if (booking) {
      if (msg) msg.textContent = `Đang check-in cho nhóm ${booking.groupName}...`;
      try {
        const res = await api(`/study-rooms/bookings/${booking.id}/check-in`, {
          method: 'POST',
          body: JSON.stringify({ qrToken: raw }),
        });
        if (typeof playBarcodeScanTone === 'function') playBarcodeScanTone('success');
        notify(`✓ Check-in thành công: ${res.message || booking.room?.name}`);
        if (msg) msg.innerHTML = `✓ Check-in thành công phòng <b>${escapeHtml(booking.room?.name)}</b>!`;
        setTimeout(() => stopStudyRoomCameraScanner(), 1500);
        void loadStudyRooms();
      } catch (err) {
        if (typeof playBarcodeScanTone === 'function') playBarcodeScanTone('error');
        if (msg) msg.textContent = `Lỗi check-in: ${err.message}`;
        notify(`✕ Lỗi check-in: ${err.message}`, true);
      }
    } else {
      if ($('checkInQrTokenInput')) $('checkInQrTokenInput').value = raw;
      notify(`Đã nhận mã QR: ${raw}. Vui lòng chọn phiếu đặt phòng để hoàn tất!`);
      stopStudyRoomCameraScanner();
      if ($('checkInStudyRoomDialog') && !$('checkInStudyRoomDialog').open) {
        $('checkInStudyRoomDialog').showModal();
      }
    }
  }

  async function startStudyRoomCameraScanner() {
    const dialog = $('studyRoomCameraCheckInDialog');
    const video = $('studyRoomCameraVideo');
    const readerDiv = $('studyRoomCameraReader');
    const msg = $('studyRoomCameraMsg');
    if (!dialog) return;

    dialog.showModal();
    if (msg) msg.textContent = 'Đang khởi động Camera...';
    if ($('studyRoomManualQrInput')) {
      $('studyRoomManualQrInput').value = '';
      setTimeout(() => $('studyRoomManualQrInput')?.focus(), 300);
    }

    try {
      if ('BarcodeDetector' in window) {
        if (readerDiv) readerDiv.style.display = 'none';
        if (video) video.style.display = 'block';
        studyRoomCameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        video.srcObject = studyRoomCameraStream;
        await video.play();

        studyRoomCameraDetector = new window.BarcodeDetector({
          formats: ['qr_code', 'code_128', 'ean_13'],
        });

        studyRoomCameraScanning = true;
        if (msg) msg.textContent = 'Hướng ống kính camera vào mã QR dán trước cửa phòng học...';
        scanStudyRoomCameraFrame();
      } else if (window.Html5Qrcode) {
        if (video) video.style.display = 'none';
        if (readerDiv) readerDiv.style.display = 'block';
        studyRoomHtml5Qr = new window.Html5Qrcode('studyRoomCameraReader');
        await studyRoomHtml5Qr.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 200, height: 200 } },
          async (raw) => {
            const now = Date.now();
            if (raw && (raw !== lastScannedRoomToken || now - lastScannedRoomTime > 4000)) {
              lastScannedRoomToken = raw;
              lastScannedRoomTime = now;
              if (msg) msg.innerHTML = `Nhận diện mã: <b style="color:#0f766e;">${escapeHtml(raw)}</b>`;
              if (typeof playBarcodeScanTone === 'function') playBarcodeScanTone('scan');
              await handleStudyRoomQrToken(raw);
            }
          },
          () => { }
        );
        studyRoomCameraScanning = true;
        if (msg) msg.textContent = 'Hướng ống kính camera vào mã QR dán trước cửa phòng học...';
      } else {
        if (msg) msg.textContent = 'Trình duyệt không hỗ trợ quét camera trực tiếp. Vui lòng nhập mã QR thủ công.';
      }
    } catch (err) {
      if (msg) msg.textContent = `Không thể bật Camera: ${err.message}. Bạn có thể nhập mã ở ô bên dưới.`;
      notify(`✕ Lỗi Camera: ${err.message}`, true);
    }
  }

  function stopStudyRoomCameraScanner() {
    studyRoomCameraScanning = false;
    if (studyRoomCameraStream) {
      studyRoomCameraStream.getTracks().forEach((track) => track.stop());
      studyRoomCameraStream = null;
    }
    if (studyRoomHtml5Qr) {
      try {
        studyRoomHtml5Qr.stop().catch(() => { });
      } catch (_) { }
      studyRoomHtml5Qr = null;
    }
    const dialog = $('studyRoomCameraCheckInDialog');
    if (dialog && dialog.open) dialog.close();
  }

  async function scanStudyRoomCameraFrame() {
    if (!studyRoomCameraScanning) return;
    const video = $('studyRoomCameraVideo');
    const msg = $('studyRoomCameraMsg');

    if (video && video.readyState >= 2 && studyRoomCameraDetector) {
      try {
        const barcodes = await studyRoomCameraDetector.detect(video);
        if (barcodes && barcodes.length > 0) {
          const raw = barcodes[0].rawValue.trim();
          const now = Date.now();
          if (raw && (raw !== lastScannedRoomToken || now - lastScannedRoomTime > 4000)) {
            lastScannedRoomToken = raw;
            lastScannedRoomTime = now;
            if (msg) msg.innerHTML = `Nhận diện mã: <b style="color:#0f766e;">${escapeHtml(raw)}</b>`;
            if (typeof playBarcodeScanTone === 'function') playBarcodeScanTone('scan');
            await handleStudyRoomQrToken(raw);
          }
        }
      } catch (e) {
        // ignore frame scan errors
      }
    }
    if (studyRoomCameraScanning) {
      requestAnimationFrame(scanStudyRoomCameraFrame);
    }
  }

  $('openStudyRoomCameraCheckInBtn')?.addEventListener('click', startStudyRoomCameraScanner);
  $('closeStudyRoomCameraBtn')?.addEventListener('click', stopStudyRoomCameraScanner);
  $('stopStudyRoomCameraBtn')?.addEventListener('click', stopStudyRoomCameraScanner);
  $('openCameraFromCheckInDialogBtn')?.addEventListener('click', () => {
    $('checkInStudyRoomDialog')?.close();
    startStudyRoomCameraScanner();
  });

  $('studyRoomManualCheckInBtn')?.addEventListener('click', () => {
    const raw = $('studyRoomManualQrInput')?.value.trim();
    if (!raw) return notify('Vui lòng nhập mã token cửa phòng', true);
    $('studyRoomManualQrInput').value = '';
    void handleStudyRoomQrToken(raw);
  });
  $('studyRoomManualQrInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const raw = $('studyRoomManualQrInput')?.value.trim();
      if (!raw) return;
      $('studyRoomManualQrInput').value = '';
      void handleStudyRoomQrToken(raw);
    }
  });


  // Lockers events
  $('refreshLockersBtn')?.addEventListener('click', () => void loadLockers());
  $('lockerZoneSelect')?.addEventListener('change', () => void loadLockers());
  $('lockerStatusSelect')?.addEventListener('change', () => void loadLockers());
  $('lockerSearchInput')?.addEventListener('input', () => void loadLockers());

  $('openAssignLockerBtn')?.addEventListener('click', () => openAssignLockerDialog());
  $('openBatchLockersBtn')?.addEventListener('click', () => $('createBatchLockersDialog').showModal());

  $('openOverdueLockersBtn')?.addEventListener('click', () => {
    if (!overdueLockersData.length) {
      alert('Hiện không có tủ nào quá hạn hoặc để quên đồ sau giờ đóng cửa.');
      return;
    }
    const msg = overdueLockersData.map((o) => `- Tủ ${o.lockerNumber} (${o.zone}): Độc giả ${o.user.fullName} (SĐT: ${o.user.phone || 'N/A'}) - Quá hạn ${o.overdueMinutes} phút`).join('\n');
    alert('DANH SÁCH TỦ QUÁ HẠN / ĐỂ QUÊN ĐỒ:\n\n' + msg);
  });

  $('assignLockerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const res = await api('/lockers/assign', {
        method: 'POST',
        body: JSON.stringify({
          lockerId: Number($('assignLockerSelect').value),
          userId: Number($('assignUserSelect').value),
          assignmentType: $('assignType').value,
          customPin: $('assignCustomPin').value.trim() || undefined,
        }),
      });
      alert(res.message);
      $('assignLockerDialog').close();
      $('assignLockerForm').reset();
      void loadLockers();
    } catch (err) {
      notify(err.message, true);
    }
  });

  $('createBatchLockersForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const res = await api('/lockers/batch', {
        method: 'POST',
        body: JSON.stringify({
          prefix: $('batchLockerPrefix').value.trim(),
          fromNumber: Number($('batchLockerFrom').value),
          toNumber: Number($('batchLockerTo').value),
          zone: $('batchLockerZone').value.trim(),
          cluster: $('batchLockerCluster').value.trim(),
        }),
      });
      notify(res.message);
      $('createBatchLockersDialog').close();
      void loadLockers();
    } catch (err) {
      notify(err.message, true);
    }
  });

  // =========================================================================
  // PHÂN HỆ TRÍ TUỆ NHÂN TẠO (AI SMART LIBRARY ENGINE)
  // =========================================================================

  // 1. TRỢ LÝ CHATBOT AI TRA CỨU & TƯ VẤN SÁCH (RAG CHATBOT)
  let aiChatHistory = [];
  function initAiChatbot() {
    const toggleBtn = $('aiChatToggleBtn');
    const chatBox = $('aiChatBox');
    const closeBtn = $('aiChatCloseBtn');
    const clearBtn = $('aiChatClearBtn');
    const sendBtn = $('aiChatSendBtn');
    const input = $('aiChatInput');
    const messagesEl = $('aiChatMessages');
    const chipsEl = $('aiChatChips');

    if (!toggleBtn || !chatBox) return;

    if (!state.aiChatInitialized) {
      state.aiChatInitialized = true;

      toggleBtn.addEventListener('click', () => {
        chatBox.classList.toggle('hidden');
        if (!chatBox.classList.contains('hidden') && input) {
          input.focus();
        }
      });

      closeBtn?.addEventListener('click', () => {
        chatBox.classList.add('hidden');
      });

      clearBtn?.addEventListener('click', () => {
        aiChatHistory = [];
        if (messagesEl) {
          messagesEl.innerHTML = `
            <div class="ai-msg ai-msg-bot">
              Xin chào bạn! 👋 Tôi là <strong>Trợ lý AI Thư viện Thông minh</strong>.<br><br>
              Bạn có thể hỏi tôi bất kỳ câu hỏi nào bằng ngôn ngữ tự nhiên, ví dụ:<br>
              • <em>"Tìm sách lập trình hướng đối tượng Java dễ hiểu nhất"</em><br>
              • <em>"Sách kinh tế vĩ mô cho người mới bắt đầu"</em><br>
              • <em>"Có sách nào còn trên kệ tầng 2 không?"</em>
            </div>
          `;
        }
      });

      const handleSend = async (customPrompt) => {
        const text = (customPrompt || input?.value || '').trim();
        if (!text) return;
        if (input) input.value = '';

        // Append user bubble
        appendAiMessage('user', text);

        // Append typing indicator
        const typingEl = document.createElement('div');
        typingEl.className = 'ai-msg ai-msg-bot';
        typingEl.id = 'aiTypingIndicator';
        typingEl.innerHTML = `<em>🤖 AI đang tra cứu kho sách & tổng hợp câu trả lời...</em>`;
        messagesEl.appendChild(typingEl);
        messagesEl.scrollTop = messagesEl.scrollHeight;

        try {
          const res = await api('/ai/chat', {
            method: 'POST',
            body: JSON.stringify({ message: text, history: aiChatHistory }),
          });

          // Remove typing indicator
          $('aiTypingIndicator')?.remove();

          // Append bot response
          appendAiMessage('bot', res.reply, res.books);

          // Update suggestions
          if (chipsEl && res.suggestions && res.suggestions.length) {
            chipsEl.innerHTML = res.suggestions
              .map((s) => `<span class="ai-chip" data-ai-prompt="${escapeHtml(s)}">${escapeHtml(s)}</span>`)
              .join('');
            bindChipEvents();
          }

          // Add to history
          aiChatHistory.push({ role: 'user', content: text });
          aiChatHistory.push({ role: 'assistant', content: res.reply });
        } catch (err) {
          $('aiTypingIndicator')?.remove();
          appendAiMessage('bot', '⚠️ Rất tiếc, AI đang bận xử lý hoặc gặp sự cố kết nối: ' + err.message);
        }
      };

      sendBtn?.addEventListener('click', () => handleSend());
      input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSend();
      });

      function bindChipEvents() {
        chipsEl?.querySelectorAll('.ai-chip').forEach((chip) => {
          chip.addEventListener('click', () => {
            const prompt = chip.dataset.aiPrompt;
            handleSend(prompt);
          });
        });
      }
      bindChipEvents();

      function appendAiMessage(role, text, books = []) {
        if (!messagesEl) return;
        const msg = document.createElement('div');
        msg.className = `ai-msg ai-msg-${role}`;

        let formattedText = escapeHtml(text).replace(/\n/g, '<br>');
        formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');

        msg.innerHTML = formattedText;

        // If bot returned books
        if (role === 'bot' && books && books.length) {
          const booksWrap = document.createElement('div');
          booksWrap.style.marginTop = '10px';
          booksWrap.innerHTML = books.map((b) => `
            <div class="ai-book-card-item">
              <div style="font-weight:700;color:#1e293b;font-size:13px;">📖 ${escapeHtml(b.title)}</div>
              <div style="font-size:12px;color:#64748b;">Tác giả: ${escapeHtml(b.author)} · ${escapeHtml(b.category)}</div>
              <div style="font-size:12px;color:#166534;font-weight:600;">
                📍 ${escapeHtml(b.shelfLocation)} · ${b.availableCopies > 0 ? `Còn ${b.availableCopies} cuốn` : '<span style="color:#e11d48;">Tạm hết sách</span>'}
              </div>
              <div style="display:flex;gap:6px;margin-top:4px;">
                <button class="button button-light button-small" data-ai-detail="${b.id}" style="font-size:11px;padding:2px 8px;" type="button">Chi tiết</button>
                ${b.pdfUrl ? `<button class="button button-primary button-small" data-ai-read="${escapeHtml(b.pdfUrl)}" data-title="${escapeHtml(b.title)}" data-id="${b.id}" data-perm="${b.pdfPermission || 'PUBLIC'}" style="background:#0284c7;font-size:11px;padding:2px 8px;" type="button">Đọc PDF</button>` : ''}
              </div>
            </div>
          `).join('');

          booksWrap.querySelectorAll('[data-ai-detail]').forEach((btn) => {
            btn.addEventListener('click', () => showBookDetails(btn.dataset.aiDetail));
          });
          booksWrap.querySelectorAll('[data-ai-read]').forEach((btn) => {
            btn.addEventListener('click', () => openPdfViewer(btn.dataset.aiRead, btn.dataset.title, btn.dataset.id, btn.dataset.perm));
          });

          msg.appendChild(booksWrap);
        }

        messagesEl.appendChild(msg);
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }
    }
  }

  // 2. AI GỢI Ý SÁCH CÁ NHÂN HÓA (PERSONALIZED RECOMMENDATIONS)
  async function loadAiRecommendations() {
    const grid = $('aiRecommendationsGrid');
    if (!grid) return;

    $('refreshAiRecBtn')?.addEventListener('click', () => {
      loadAiRecommendations();
      notify('Đã cập nhật danh sách gợi ý cá nhân hóa từ AI! 🎯');
    }, { once: true });

    try {
      const res = await api('/ai/recommendations');
      const recs = res.recommendations || [];

      if (!recs.length) {
        grid.innerHTML = '<p style="color:#888;grid-column:1/-1;">Chưa có dữ liệu gợi ý. Hãy đọc hoặc mượn một số sách để AI kích hoạt học máy cá nhân hóa.</p>';
        return;
      }

      grid.innerHTML = recs.map((r) => {
        const coverUrl = r.coverImageUrl ? (r.coverImageUrl.startsWith('http') || r.coverImageUrl.startsWith('/') ? r.coverImageUrl : `/uploads/covers/${r.coverImageUrl}`) : '';
        return `
          <article class="book-card" style="border:1px solid #e9d5ff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(124,58,237,0.06);display:flex;flex-direction:column;">
            <div style="background:linear-gradient(135deg,#f3e8ff,#fee2e2);padding:6px 12px;display:flex;justify-content:space-between;align-items:center;">
              <span class="status-badge" style="background:#7c3aed;color:#fff;font-weight:700;font-size:11px;padding:2px 8px;border-radius:999px;">
                🔥 Phù hợp ${r.matchScore}
              </span>
              <span style="font-size:11px;color:#7c3aed;font-weight:600;">AI Match</span>
            </div>
            
            <div style="padding:14px;flex:1;display:flex;flex-direction:column;">
              <div style="font-size:11.5px;color:#6b21a8;background:#faf5ff;padding:4px 8px;border-radius:6px;margin-bottom:8px;font-style:italic;">
                💡 ${escapeHtml(r.reason)}
              </div>

              <div class="book-top" style="margin-bottom:8px;">
                <div class="book-cover" style="width:54px;height:72px;" aria-hidden="true">
                  <span>${escapeHtml(r.title.slice(0, 1).toLocaleUpperCase('vi'))}</span>
                  ${coverUrl ? `<img src="${escapeHtml(coverUrl)}" alt="" loading="lazy">` : ''}
                </div>
                <div style="flex:1;">
                  <h3 style="font-size:15px;margin:0 0 4px;line-height:1.3;">${escapeHtml(r.title)}</h3>
                  <p class="book-author" style="margin:0;font-size:12.5px;color:#64748b;">${escapeHtml(r.author)}</p>
                  <span class="book-tag category-tag" style="margin-top:6px;display:inline-block;">${escapeHtml(r.category)}</span>
                </div>
              </div>

              <div style="margin-top:auto;padding-top:10px;border-top:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
                <span style="font-size:12px;color:#166534;font-weight:600;">
                  📍 ${escapeHtml(r.shelfLocation)}
                </span>
                <div style="display:flex;gap:4px;">
                  <button class="button button-light button-small" data-book-detail="${r.id}" type="button">Chi tiết</button>
                  ${r.pdfUrl ? `<button class="button button-primary button-small" style="background:#0284c7;" data-read-pdf="${escapeHtml(r.pdfUrl)}" data-title="${escapeHtml(r.title)}" data-id="${r.id}" type="button">Đọc online</button>` : ''}
                  ${state.user && r.availableCopies > 0 ? `<button class="button button-primary button-small" data-borrow="${r.id}" data-title="${escapeHtml(r.title)}" type="button">＋ Mượn</button>` : ''}
                </div>
              </div>
            </div>
          </article>
        `;
      }).join('');

      // Bind events
      grid.querySelectorAll('[data-book-detail]').forEach((btn) => {
        btn.addEventListener('click', () => showBookDetails(btn.dataset.bookDetail));
      });
      grid.querySelectorAll('[data-read-pdf]').forEach((btn) => {
        btn.addEventListener('click', () => openPdfViewer(btn.dataset.readPdf, btn.dataset.title, btn.dataset.id));
      });
      grid.querySelectorAll('[data-borrow]').forEach((button) => button.addEventListener('click', () => {
        $('loanBookId').value = button.dataset.borrow;
        $('loanDialogTitle').textContent = `Đăng ký mượn “${button.dataset.title}”?`;
        $('loanDialog').showModal();
      }));
    } catch (e) {
      grid.innerHTML = `<p style="color:#ef4444;grid-column:1/-1;">Không tải được gợi ý: ${e.message}</p>`;
    }
  }

  // 3. AI OCR & ISBN SCANNING TRÊN FORM SÁCH (/admin/books)
  function initBookOcr() {
    const triggerBtn = $('bookOcrTriggerBtn');
    const fileInput = $('bookOcrFileInput');
    const feedback = $('bookOcrFeedback');

    if (!triggerBtn || !fileInput || state.bookOcrBound) return;
    state.bookOcrBound = true;

    triggerBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async () => {
      if (!fileInput.files || !fileInput.files.length) return;
      const file = fileInput.files[0];

      if (feedback) {
        feedback.style.display = 'block';
        feedback.innerHTML = `<span style="color:#7c3aed;font-weight:600;">⏳ AI Vision đang phân tích ảnh <strong>${escapeHtml(file.name)}</strong>...</span>`;
      }

      const formData = new FormData();
      formData.append('file', file);

      try {
        const token = state.token || localStorage.getItem('token');
        const res = await fetch('/ai/ocr-book', {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: 'Lỗi nhận diện OCR' }));
          throw new Error(err.message || 'Lỗi nhận diện OCR');
        }

        const data = await res.json();

        // Tự động điền vào form
        if ($('bookTitle') && data.title) $('bookTitle').value = data.title;
        if ($('bookAuthor') && data.author) $('bookAuthor').value = data.author;
        if ($('bookIsbn') && data.isbn) $('bookIsbn').value = data.isbn;
        if ($('bookPublicationYear') && data.publicationYear) $('bookPublicationYear').value = data.publicationYear;
        if ($('bookDescription') && data.description) $('bookDescription').value = data.description;

        // Chọn nhà xuất bản nếu có trong select
        if (data.publisher && $('publisherId')) {
          const pubSelect = $('publisherId');
          for (let i = 0; i < pubSelect.options.length; i++) {
            if (pubSelect.options[i].text.toLowerCase().includes(data.publisher.toLowerCase())) {
              pubSelect.selectedIndex = i;
              break;
            }
          }
        }

        if (feedback) {
          feedback.innerHTML = `
            <div style="background:#ecfdf5;color:#065f46;padding:8px 12px;border-radius:6px;border:1px solid #a7f3d0;display:flex;align-items:center;gap:6px;">
              <span>✅</span>
              <span><strong>AI OCR thành công!</strong> Đã nhận diện và điền tự động các trường Tên sách, Tác giả, ISBN, Năm XB (Độ tin cậy: ${(data.confidence * 100).toFixed(0)}%).</span>
            </div>
          `;
        }
        notify('AI đã trích xuất và điền thông tin sách thành công! ✨');
      } catch (err) {
        if (feedback) {
          feedback.innerHTML = `<span style="color:#ef4444;">❌ Lỗi trích xuất AI: ${escapeHtml(err.message)}</span>`;
        }
        notify(err.message, true);
      }
    });
  }

  // 4. AI DỰ BÁO NHU CẦU MƯỢN SÁCH & LẬP NGÂN SÁCH (PREDICTIVE ANALYTICS)
  async function loadAiDemandForecast() {
    const tbody = $('aiForecastTableBody');
    const summaryEl = $('aiForecastSummaryText');
    if (!tbody) return;

    $('refreshAiForecastBtn')?.addEventListener('click', () => {
      loadAiDemandForecast();
      notify('Đã cập nhật lại mô hình dự báo nhu cầu sách!');
    }, { once: true });

    try {
      const res = await api('/ai/budget-demand-forecast');
      if (summaryEl && res.aiExecutiveSummary) {
        summaryEl.textContent = res.aiExecutiveSummary;
      }

      const forecasts = res.categoryForecasts || [];
      if (!forecasts.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:1.5rem;color:#888;">Chưa có dữ liệu dự báo.</td></tr>';
        return;
      }

      tbody.innerHTML = forecasts.map((f) => {
        let urgencyBadge = '<span class="status-badge" style="background:#dcfce7;color:#166534;font-size:12px;font-weight:700;">Ổn định</span>';
        if (f.urgency === 'CAO') {
          urgencyBadge = '<span class="status-badge" style="background:#fee2e2;color:#991b1b;font-size:12px;font-weight:700;">🚨 Khẩn cấp</span>';
        } else if (f.urgency === 'TRUNG_BÌNH') {
          urgencyBadge = '<span class="status-badge" style="background:#fef3c7;color:#92400e;font-size:12px;font-weight:700;">⚠️ Cần bổ sung</span>';
        }

        const titlesList = (f.recommendedTitles || []).map((t) => `• ${escapeHtml(t)}`).join('<br>');

        return `
          <tr>
            <td><strong>${escapeHtml(f.categoryName)}</strong></td>
            <td style="text-align:center;">${f.totalTitles} tựa (${f.totalCopies} cuốn)</td>
            <td style="text-align:center;"><strong style="color:#0284c7;">${f.utilizationRate}</strong></td>
            <td style="text-align:center;"><strong style="color:#166534;font-size:14px;">${f.forecastGrowthPercent}</strong></td>
            <td style="text-align:center;">${urgencyBadge}</td>
            <td style="text-align:center;"><strong style="color:#6f42c1;">${f.recommendedBudgetShare}</strong></td>
            <td style="text-align:right;font-weight:700;color:#123c35;">${money(f.allocatedAmount)}</td>
            <td style="font-size:12.5px;color:#334155;line-height:1.4;">${titlesList || 'Duy trì số lượng hiện tại'}</td>
          </tr>
        `;
      }).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#ef4444;padding:1.5rem;">Không tải được dự báo: ${escapeHtml(e.message)}</td></tr>`;
    }
  }

  /* ========================================================= */
  /* MODULE 1: QUẢN LÝ SỰ KIỆN & THÔNG BÁO (/admin/events-announcements) */
  /* ========================================================= */
  let eventsData = [];

  function toInputDateTime(val) {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  async function loadEvents() {
    try {
      const type = $('eventTypeFilter')?.value || '';
      const status = $('eventStatusFilter')?.value || '';
      const targetAudience = $('eventAudienceFilter')?.value || '';
      const search = $('eventSearchInput')?.value.trim() || '';

      const query = new URLSearchParams();
      if (type) query.append('type', type);
      if (status) query.append('status', status);
      if (targetAudience) query.append('targetAudience', targetAudience);
      if (search) query.append('search', search);

      const [events, stats] = await Promise.all([
        api('/events?' + query.toString()).catch(() => []),
        api('/events/stats').catch(() => ({})),
      ]);

      eventsData = events || [];

      if ($('statTotalEvents')) $('statTotalEvents').textContent = stats.total || 0;
      if ($('statUpcomingEvents')) $('statUpcomingEvents').textContent = stats.upcoming || 0;
      if ($('statHappeningEvents')) $('statHappeningEvents').textContent = stats.happening || 0;
      if ($('statPinnedEvents')) $('statPinnedEvents').textContent = stats.pinned || 0;
      if ($('statTotalEventViews')) $('statTotalEventViews').textContent = stats.totalViews || 0;

      renderEventsTable();
    } catch (err) {
      console.error('Lỗi khi tải danh sách sự kiện:', err);
      const tbody = $('eventsTableBody');
      if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#ef4444;padding:2rem;">Lỗi tải dữ liệu: ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  function renderEventsTable() {
    const tbody = $('eventsTableBody');
    if (!tbody) return;

    if (!eventsData.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2.5rem;color:#888;">Không tìm thấy sự kiện hoặc thông báo nào phù hợp.</td></tr>';
      return;
    }

    const typeBadges = {
      ANNOUNCEMENT: '<span class="status-badge" style="background:#e0f2fe;color:#0369a1;font-weight:600;">📢 Thông báo</span>',
      EXHIBITION: '<span class="status-badge" style="background:#f3e8ff;color:#7e22ce;font-weight:600;">📚 Triển lãm</span>',
      EVENT: '<span class="status-badge" style="background:#dcfce7;color:#15803d;font-weight:600;">🎉 Sự kiện</span>',
      WORKSHOP: '<span class="status-badge" style="background:#fef3c7;color:#b45309;font-weight:600;">💡 Workshop</span>',
      CLOSURE: '<span class="status-badge" style="background:#ffe4e6;color:#be123c;font-weight:600;">⛔ Bảo trì/Nghỉ</span>',
      OTHER: '<span class="status-badge" style="background:#f1f5f9;color:#475569;font-weight:600;">Khác</span>',
    };

    const audienceBadges = {
      ALL: '<span style="color:#0f172a;font-weight:600;">Toàn thể</span>',
      STUDENT: '<span style="color:#0284c7;font-weight:600;">Sinh viên</span>',
      LECTURER: '<span style="color:#166534;font-weight:600;">Giảng viên</span>',
      RESEARCHER: '<span style="color:#6f42c1;font-weight:600;">NCS</span>',
    };

    const statusBadges = {
      HAPPENING: '<span class="status-badge" style="background:#dcfce7;color:#166534;font-weight:700;">🟢 Đang diễn ra</span>',
      UPCOMING: '<span class="status-badge" style="background:#eff6ff;color:#1d4ed8;font-weight:700;">🔵 Sắp diễn ra</span>',
      ENDED: '<span class="status-badge" style="background:#f1f5f9;color:#64748b;font-weight:600;">⚪ Đã kết thúc</span>',
      CANCELLED: '<span class="status-badge" style="background:#fee2e2;color:#991b1b;font-weight:600;">🔴 Đã hủy</span>',
    };

    tbody.innerHTML = eventsData.map((ev) => {
      const isPinnedHtml = ev.isPinned
        ? '<span title="Được ghim trên bảng tin" style="font-size:18px;cursor:help;">📌</span>'
        : '<span style="color:#cbd5e1;">—</span>';

      const snippet = ev.content && ev.content.length > 120
        ? ev.content.slice(0, 120) + '...'
        : (ev.content || '');

      return `
        <tr>
          <td style="text-align:center;">${isPinnedHtml}</td>
          <td>
            <div style="font-weight:700;color:#0f172a;font-size:14px;margin-bottom:3px;">${escapeHtml(ev.title)}</div>
            <div style="font-size:12.5px;color:#64748b;line-height:1.4;">${escapeHtml(snippet)}</div>
            <div style="font-size:11.5px;color:#94a3b8;margin-top:2px;">Người tạo: ${escapeHtml(ev.authorName || 'Thủ thư')}</div>
          </td>
          <td style="text-align:center;">${typeBadges[ev.type] || ev.type}</td>
          <td style="font-size:12.5px;">
            <div>📅 <strong>${formatDateTime(ev.startDate)}</strong></div>
            ${ev.endDate ? `<div style="color:#64748b;font-size:12px;">đến ${formatDateTime(ev.endDate)}</div>` : ''}
            <div style="color:#475569;margin-top:2px;">📍 ${escapeHtml(ev.location || 'Khuôn viên Thư viện')}</div>
          </td>
          <td style="text-align:center;">${audienceBadges[ev.targetAudience] || ev.targetAudience}</td>
          <td style="text-align:center;">${statusBadges[ev.status] || ev.status}</td>
          <td style="text-align:center;font-weight:700;color:#0284c7;">${ev.viewCount || 0} 👁️</td>
          <td style="text-align:center;">
            <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;">
              <button class="button button-small button-primary" type="button" onclick="openBroadcastDialog(${ev.id})" style="background:#0284c7;border-color:#0284c7;font-size:12px;padding:3px 8px;" title="Gửi thông báo hàng loạt">📢 Báo tin</button>
              <button class="button button-small button-light" type="button" onclick="openEditEvent(${ev.id})" style="font-size:12px;padding:3px 8px;">✏️ Sửa</button>
              <button class="button button-small button-danger" type="button" onclick="deleteEvent(${ev.id})" style="font-size:12px;padding:3px 8px;">🗑️ Xóa</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function openCreateEventDialog() {
    $('eventForm')?.reset();
    if ($('eventFormId')) $('eventFormId').value = '';
    if ($('eventDialogTitle')) $('eventDialogTitle').innerHTML = '<span>📢 Thêm Sự kiện / Thông báo mới</span>';
    if ($('eventFormIsActive')) $('eventFormIsActive').checked = true;
    if ($('eventFormStartDate')) $('eventFormStartDate').value = toInputDateTime(new Date());
    $('eventDialog')?.showModal();
  }

  function openEditEvent(id) {
    const ev = eventsData.find((item) => item.id === id);
    if (!ev) return;
    if ($('eventFormId')) $('eventFormId').value = ev.id;
    if ($('eventFormTitle')) $('eventFormTitle').value = ev.title || '';
    if ($('eventFormType')) $('eventFormType').value = ev.type || 'ANNOUNCEMENT';
    if ($('eventFormAudience')) $('eventFormAudience').value = ev.targetAudience || 'ALL';
    if ($('eventFormStartDate')) $('eventFormStartDate').value = toInputDateTime(ev.startDate);
    if ($('eventFormEndDate')) $('eventFormEndDate').value = toInputDateTime(ev.endDate);
    if ($('eventFormLocation')) $('eventFormLocation').value = ev.location || '';
    if ($('eventFormBannerUrl')) $('eventFormBannerUrl').value = ev.bannerUrl || '';
    if ($('eventFormContent')) $('eventFormContent').value = ev.content || '';
    if ($('eventFormIsPinned')) $('eventFormIsPinned').checked = Boolean(ev.isPinned);
    if ($('eventFormIsActive')) $('eventFormIsActive').checked = Boolean(ev.isActive);
    if ($('eventDialogTitle')) $('eventDialogTitle').innerHTML = '<span>✏️ Chỉnh sửa Sự kiện / Thông báo</span>';
    $('eventDialog')?.showModal();
  }

  async function handleSaveEvent(e) {
    e.preventDefault();
    try {
      const id = $('eventFormId')?.value;
      const payload = {
        title: $('eventFormTitle')?.value.trim(),
        type: $('eventFormType')?.value,
        targetAudience: $('eventFormAudience')?.value,
        startDate: $('eventFormStartDate')?.value ? new Date($('eventFormStartDate').value).toISOString() : undefined,
        endDate: $('eventFormEndDate')?.value ? new Date($('eventFormEndDate').value).toISOString() : undefined,
        location: $('eventFormLocation')?.value.trim() || undefined,
        bannerUrl: $('eventFormBannerUrl')?.value.trim() || undefined,
        content: $('eventFormContent')?.value.trim(),
        isPinned: Boolean($('eventFormIsPinned')?.checked),
        isActive: Boolean($('eventFormIsActive')?.checked),
      };

      if (!payload.title || !payload.content) {
        notify('Vui lòng nhập đầy đủ tiêu đề và nội dung.', true);
        return;
      }

      if (id) {
        await api(`/events/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        notify('Cập nhật sự kiện / thông báo thành công!');
      } else {
        await api('/events', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        notify('Đã tạo sự kiện / thông báo mới thành công!');
      }

      $('eventDialog')?.close();
      void loadEvents();
    } catch (err) {
      console.error(err);
      notify('Lỗi khi lưu sự kiện: ' + (err.message || 'Thất bại'), true);
    }
  }

  function openBroadcastDialog(id) {
    const ev = eventsData.find((item) => item.id === id);
    if (!ev) return;
    if ($('broadcastEventId')) $('broadcastEventId').value = ev.id;
    if ($('broadcastEventTitlePreview')) $('broadcastEventTitlePreview').textContent = ev.title;
    if ($('broadcastTargetAudience')) $('broadcastTargetAudience').value = ev.targetAudience || 'ALL';
    $('broadcastEventDialog')?.showModal();
  }

  async function handleBroadcastEvent(e) {
    e.preventDefault();
    try {
      const id = $('broadcastEventId')?.value;
      const targetAudience = $('broadcastTargetAudience')?.value || 'ALL';
      if (!id) return;

      const result = await api(`/events/${id}/broadcast`, {
        method: 'POST',
        body: JSON.stringify({ targetAudience }),
      });

      notify(result.message || 'Đã gửi thông báo thành công tới độc giả!');
      $('broadcastEventDialog')?.close();
    } catch (err) {
      console.error(err);
      notify('Lỗi khi phát thông báo: ' + (err.message || 'Thất bại'), true);
    }
  }

  async function deleteEvent(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa sự kiện/thông báo này khỏi hệ thống?')) return;
    try {
      await api(`/events/${id}`, { method: 'DELETE' });
      notify('Đã xóa sự kiện thành công.');
      void loadEvents();
    } catch (err) {
      notify('Lỗi khi xóa sự kiện: ' + (err.message || 'Thất bại'), true);
    }
  }

  window.openEditEvent = openEditEvent;
  window.openBroadcastDialog = openBroadcastDialog;
  window.deleteEvent = deleteEvent;

  /* ========================================================= */
  /* MODULE 2: QUẢN LÝ PHẢN HỒI & ĐÓNG GÓP Ý KIẾN (/admin/feedback) */
  /* ========================================================= */
  let feedbackData = [];

  async function loadFeedback() {
    try {
      const category = $('feedbackCategoryFilter')?.value || '';
      const status = $('feedbackStatusFilter')?.value || '';
      const search = $('feedbackSearchInput')?.value.trim() || '';

      const query = new URLSearchParams();
      if (category) query.append('category', category);
      if (status) query.append('status', status);
      if (search) query.append('search', search);

      const [feedbacks, stats] = await Promise.all([
        api('/feedback?' + query.toString()).catch(() => []),
        api('/feedback/stats').catch(() => ({})),
      ]);

      feedbackData = feedbacks || [];

      if ($('statTotalFeedback')) $('statTotalFeedback').textContent = stats.total || 0;
      if ($('statPendingFeedback')) $('statPendingFeedback').textContent = stats.pending || 0;
      if ($('statInProgressFeedback')) $('statInProgressFeedback').textContent = stats.inProgress || 0;
      if ($('statResolvedFeedback')) $('statResolvedFeedback').textContent = stats.resolved || 0;
      if ($('statAvgRating')) $('statAvgRating').textContent = `⭐ ${(Number(stats.avgRating) || 5.0).toFixed(1)} / 5.0`;

      renderFeedbackTable();
    } catch (err) {
      console.error('Lỗi khi tải danh sách phản hồi:', err);
      const tbody = $('feedbackTableBody');
      if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#ef4444;padding:2rem;">Lỗi tải dữ liệu: ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  function renderFeedbackTable() {
    const tbody = $('feedbackTableBody');
    if (!tbody) return;

    if (!feedbackData.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2.5rem;color:#888;">Không tìm thấy ý kiến đóng góp nào.</td></tr>';
      return;
    }

    const categoryNames = {
      SERVICE_QUALITY: '👥 Phục vụ thủ thư',
      FACILITIES: '🏢 Cơ sở vật chất & Phòng',
      BOOK_REQUEST: '💡 Đề xuất mua sách',
      SYSTEM: '💻 Phần mềm & Thẻ SV',
      OTHER: '❓ Khác',
    };

    const statusBadges = {
      PENDING: '<span class="status-badge" style="background:#fef3c7;color:#b45309;font-weight:700;">⏳ Chờ xử lý</span>',
      IN_PROGRESS: '<span class="status-badge" style="background:#e0f2fe;color:#0369a1;font-weight:700;">🔄 Đang xử lý</span>',
      RESOLVED: '<span class="status-badge" style="background:#dcfce7;color:#15803d;font-weight:700;">✅ Đã giải quyết</span>',
      REJECTED: '<span class="status-badge" style="background:#fee2e2;color:#991b1b;font-weight:600;">❌ Từ chối</span>',
    };

    tbody.innerHTML = feedbackData.map((fb) => {
      const stars = '⭐'.repeat(Math.max(1, Math.min(5, fb.rating || 5)));
      const replyHtml = fb.adminNote
        ? `<div style="font-size:12.5px;color:#166534;background:#f0fdf4;border-left:3px solid #16a34a;padding:6px 10px;border-radius:4px;margin-top:2px;">
            <div style="font-weight:700;">${escapeHtml(fb.handledByStaffName || 'Thủ thư')}:</div>
            <div style="color:#334155;white-space:pre-line;">${escapeHtml(fb.adminNote)}</div>
            <div style="font-size:11px;color:#64748b;margin-top:2px;">${formatDateTime(fb.respondedAt)}</div>
          </div>`
        : '<span style="color:#94a3b8;font-size:12.5px;font-style:italic;">Chưa có phản hồi</span>';

      return `
        <tr>
          <td style="font-size:12.5px;color:#64748b;">
            📅 ${formatDateTime(fb.createdAt)}
          </td>
          <td>
            <div style="font-weight:700;color:#0f172a;">${escapeHtml(fb.readerName || 'Bạn đọc')}</div>
            <div style="font-size:12px;color:#64748b;">Mã thẻ: <strong>${escapeHtml(fb.readerCardNumber || '—')}</strong></div>
            ${fb.readerEmail ? `<div style="font-size:12px;color:#0284c7;">${escapeHtml(fb.readerEmail)}</div>` : ''}
          </td>
          <td>
            <div style="font-weight:600;color:#334155;font-size:13px;margin-bottom:2px;">${categoryNames[fb.category] || fb.category}</div>
            <div style="font-size:13px;letter-spacing:1px;" title="${fb.rating} sao">${stars}</div>
          </td>
          <td style="max-width:320px;">
            <div style="font-weight:700;color:#0f172a;margin-bottom:3px;font-size:13.5px;">${escapeHtml(fb.title)}</div>
            <div style="font-size:12.5px;color:#475569;line-height:1.4;white-space:pre-line;">${escapeHtml(fb.content)}</div>
          </td>
          <td style="text-align:center;">${statusBadges[fb.status] || fb.status}</td>
          <td style="max-width:280px;">${replyHtml}</td>
          <td style="text-align:center;">
            <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;">
              <button class="button button-small button-primary" type="button" onclick="openRespondFeedbackDialog(${fb.id})" style="font-size:12px;padding:4px 9px;">💬 Phản hồi</button>
              <button class="button button-small button-danger" type="button" onclick="deleteFeedback(${fb.id})" style="font-size:12px;padding:4px 8px;">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function openRespondFeedbackDialog(id) {
    const fb = feedbackData.find((item) => item.id === id);
    if (!fb) return;
    if ($('respondFeedbackId')) $('respondFeedbackId').value = fb.id;
    if ($('respReaderName')) $('respReaderName').textContent = fb.readerName || 'Bạn đọc';
    if ($('respRatingStars')) $('respRatingStars').textContent = '⭐'.repeat(Math.max(1, Math.min(5, fb.rating || 5)));
    if ($('respReaderMeta')) $('respReaderMeta').textContent = `Mã thẻ: ${fb.readerCardNumber || '—'} | ${fb.readerEmail || ''}`;
    if ($('respFeedbackTitle')) $('respFeedbackTitle').textContent = fb.title;
    if ($('respFeedbackContent')) $('respFeedbackContent').textContent = fb.content;
    if ($('respondFeedbackStatus')) $('respondFeedbackStatus').value = fb.status || 'RESOLVED';
    if ($('respondFeedbackAdminNote')) $('respondFeedbackAdminNote').value = fb.adminNote || '';
    $('respondFeedbackDialog')?.showModal();
  }

  async function handleSaveFeedbackResponse(e) {
    e.preventDefault();
    try {
      const id = $('respondFeedbackId')?.value;
      const status = $('respondFeedbackStatus')?.value;
      const adminNote = $('respondFeedbackAdminNote')?.value.trim();

      if (!id || !adminNote) {
        notify('Vui lòng nhập nội dung phản hồi cho bạn đọc.', true);
        return;
      }

      await api(`/feedback/${id}/respond`, {
        method: 'PATCH',
        body: JSON.stringify({ status, adminNote }),
      });

      notify('Đã cập nhật và phản hồi ý kiến độc giả thành công!');
      $('respondFeedbackDialog')?.close();
      void loadFeedback();
    } catch (err) {
      console.error(err);
      notify('Lỗi khi gửi phản hồi: ' + (err.message || 'Thất bại'), true);
    }
  }

  function openSubmitFeedbackDialog() {
    $('readerSubmitFeedbackForm')?.reset();
    $('readerSubmitFeedbackDialog')?.showModal();
  }

  async function handleReaderSubmitFeedback(e) {
    e.preventDefault();
    try {
      const payload = {
        category: $('simFeedbackCategory')?.value,
        rating: Number($('simFeedbackRating')?.value) || 5,
        title: $('simFeedbackTitle')?.value.trim(),
        content: $('simFeedbackContent')?.value.trim(),
        readerName: state.user?.fullName || state.user?.username || 'Sinh viên thử nghiệm',
        readerEmail: state.user?.email || 'sinhvien@library.edu.vn',
        readerCardNumber: state.user?.cardNumber || 'SV2026-999',
      };

      if (!payload.title || !payload.content) {
        notify('Vui lòng nhập tiêu đề và nội dung góp ý.', true);
        return;
      }

      await api('/feedback', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      notify('Cảm ơn bạn đã gửi ý kiến đóng góp cho thư viện!');
      $('readerSubmitFeedbackDialog')?.close();
      void loadFeedback();
    } catch (err) {
      console.error(err);
      notify('Lỗi khi gửi ý kiến: ' + (err.message || 'Thất bại'), true);
    }
  }

  async function deleteFeedback(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa phản hồi này?')) return;
    try {
      await api(`/feedback/${id}`, { method: 'DELETE' });
      notify('Đã xóa ý kiến phản hồi thành công.');
      void loadFeedback();
    } catch (err) {
      notify('Lỗi khi xóa: ' + (err.message || 'Thất bại'), true);
    }
  }

  window.openRespondFeedbackDialog = openRespondFeedbackDialog;
  window.deleteFeedback = deleteFeedback;

  /* ========================================================= */
  /* MODULE 3: THEO DÕI ĐÀO TẠO & HƯỚNG DẪN (/admin/tutorials)  */
  /* ========================================================= */
  let tutorialsData = [];
  let currentTutorialRegId = null;

  async function loadTutorials() {
    try {
      const category = $('tutorialCategoryFilter')?.value || '';
      const format = $('tutorialFormatFilter')?.value || '';
      const search = $('tutorialSearchInput')?.value.trim() || '';

      const query = new URLSearchParams();
      if (category) query.append('category', category);
      if (format) query.append('format', format);
      if (search) query.append('search', search);

      const [tutorials, stats] = await Promise.all([
        api('/tutorials?' + query.toString()).catch(() => []),
        api('/tutorials/stats').catch(() => ({})),
      ]);

      tutorialsData = tutorials || [];

      if ($('statTotalTutorials')) $('statTotalTutorials').textContent = stats.total || 0;
      if ($('statTotalWorkshops')) $('statTotalWorkshops').textContent = stats.workshops || 0;
      if ($('statTotalRegistrations')) $('statTotalRegistrations').textContent = stats.totalRegistrations || 0;
      if ($('statTotalTutorialViews')) $('statTotalTutorialViews').textContent = stats.totalViews || 0;

      renderTutorialsGrid();
    } catch (err) {
      console.error('Lỗi khi tải danh sách đào tạo:', err);
      const container = $('tutorialsGridContainer');
      if (container) container.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:#ef4444;padding:2rem;">Lỗi tải dữ liệu: ${escapeHtml(err.message)}</div>`;
    }
  }

  function renderTutorialsGrid() {
    const container = $('tutorialsGridContainer');
    if (!container) return;

    if (!tutorialsData.length) {
      container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:#888;">Chưa có tài liệu hướng dẫn hoặc workshop nào. Nhấn "+ Thêm tài liệu / Workshop" để tạo mới.</div>';
      return;
    }

    const formatBadges = {
      VIDEO: '<span class="status-badge" style="background:#fee2e2;color:#b91c1c;font-weight:700;">🎥 Video bài giảng</span>',
      WORKSHOP: '<span class="status-badge" style="background:#eff6ff;color:#1d4ed8;font-weight:700;">👥 Workshop trực tiếp</span>',
      PDF: '<span class="status-badge" style="background:#fef3c7;color:#b45309;font-weight:700;">📄 Tài liệu PDF</span>',
      ARTICLE: '<span class="status-badge" style="background:#ecfdf5;color:#047857;font-weight:700;">📝 Bài viết cẩm nang</span>',
    };

    const categoryNames = {
      SEARCH_GUIDE: '🔍 Kỹ năng tra cứu OPAC',
      POLICY_RULES: '📜 Quy định mượn trả',
      DIGITAL_RESOURCES: '💾 CSDL & Học liệu số',
      WORKSHOP: '💡 Workshop kỹ năng',
      OTHER: 'Khác',
    };

    container.innerHTML = tutorialsData.map((tut) => {
      const isWorkshop = tut.format === 'WORKSHOP';
      const availableSeats = Math.max(0, (tut.maxSeats || 50) - (tut.registeredSeats || 0));
      const seatsColor = availableSeats > 0 ? '#166534' : '#ef4444';

      const thumbUrl = tut.thumbnailUrl || (isWorkshop
        ? 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=500&auto=format&fit=crop&q=60'
        : 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=500&auto=format&fit=crop&q=60');

      return `
        <article class="report-card" style="padding:0;overflow:hidden;display:flex;flex-direction:column;border-radius:12px;border:1px solid #e2e8f0;transition:transform 0.15s ease,box-shadow 0.15s ease;">
          <div style="height:150px;background:url('${escapeHtml(thumbUrl)}') center/cover no-repeat;position:relative;">
            <div style="position:absolute;top:10px;left:10px;">${formatBadges[tut.format] || tut.format}</div>
            <div style="position:absolute;bottom:8px;right:10px;background:rgba(0,0,0,0.65);color:#fff;font-size:11.5px;padding:3px 8px;border-radius:4px;">
              ${tut.durationMinutes ? `⏱️ ${tut.durationMinutes} phút` : 'Tự học'}
            </div>
          </div>
          <div style="padding:16px;display:flex;flex-direction:column;flex:1;">
            <div style="font-size:12px;font-weight:600;color:#6f42c1;text-transform:uppercase;margin-bottom:4px;">
              ${categoryNames[tut.category] || tut.category}
            </div>
            <h3 style="font-size:15px;font-weight:700;color:#0f172a;margin:0 0 6px 0;line-height:1.4;">${escapeHtml(tut.title)}</h3>
            <p style="font-size:12.5px;color:#64748b;margin:0 0 10px 0;line-height:1.4;flex:1;">
              ${escapeHtml(tut.description && tut.description.length > 110 ? tut.description.slice(0, 110) + '...' : (tut.description || 'Chưa có mô tả chi tiết.'))}
            </p>

            <div style="background:#f8fafc;border-radius:8px;padding:8px 10px;font-size:12px;margin-bottom:12px;display:flex;flex-direction:column;gap:3px;">
              <div>👨‍🏫 <strong>Diễn giả:</strong> ${escapeHtml(tut.instructor || 'Thủ thư thư viện')}</div>
              ${isWorkshop ? `
                <div>📅 <strong>Thời gian:</strong> ${formatDateTime(tut.eventDate)}</div>
                <div>📍 <strong>Địa điểm:</strong> ${escapeHtml(tut.location || 'Phòng Workshop')}</div>
                <div>🎟️ <strong>Chỗ trống:</strong> <span style="font-weight:700;color:${seatsColor};">${availableSeats} / ${tut.maxSeats} chỗ</span> (${tut.registeredSeats || 0} đã đăng ký)</div>
              ` : `
                <div>👁️ <strong>Lượt học:</strong> ${tut.viewCount || 0} lượt truy cập</div>
                ${tut.contentUrl ? `<div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">🔗 <strong>Tài nguyên:</strong> <a href="${escapeHtml(tut.contentUrl)}" target="_blank" style="color:#0284c7;">Mở học liệu</a></div>` : ''}
              `}
            </div>

            <div style="display:flex;gap:6px;align-items:center;justify-content:space-between;border-top:1px solid #f1f5f9;padding-top:10px;">
              <div style="display:flex;gap:6px;">
                ${isWorkshop ? `
                  <button class="button button-small button-secondary" type="button" onclick="openTutorialRegistrationsDialog(${tut.id})" style="background:#6f42c1;color:#fff;font-size:12px;padding:4px 8px;">📋 DS Đăng ký (${tut.registeredSeats || 0})</button>
                ` : `
                  ${tut.contentUrl ? `<a class="button button-small button-secondary" href="${escapeHtml(tut.contentUrl)}" target="_blank" style="font-size:12px;padding:4px 8px;text-decoration:none;">🔗 Xem nội dung</a>` : ''}
                `}
              </div>
              <div style="display:flex;gap:4px;">
                <button class="button button-small button-light" type="button" onclick="openEditTutorial(${tut.id})" style="font-size:12px;padding:4px 8px;">✏️</button>
                <button class="button button-small button-danger" type="button" onclick="deleteTutorial(${tut.id})" style="font-size:12px;padding:4px 8px;">🗑️</button>
              </div>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  function openCreateTutorialDialog() {
    $('tutorialForm')?.reset();
    if ($('tutorialFormId')) $('tutorialFormId').value = '';
    if ($('tutorialDialogTitle')) $('tutorialDialogTitle').innerHTML = '<span>🎓 Thêm Tài Liệu Hướng Dẫn / Workshop</span>';
    if ($('tutorialFormMaxSeats')) $('tutorialFormMaxSeats').value = '50';
    $('tutorialDialog')?.showModal();
  }

  function openEditTutorial(id) {
    const tut = tutorialsData.find((item) => item.id === id);
    if (!tut) return;
    if ($('tutorialFormId')) $('tutorialFormId').value = tut.id;
    if ($('tutorialFormTitle')) $('tutorialFormTitle').value = tut.title || '';
    if ($('tutorialFormCategory')) $('tutorialFormCategory').value = tut.category || 'SEARCH_GUIDE';
    if ($('tutorialFormFormat')) $('tutorialFormFormat').value = tut.format || 'VIDEO';
    if ($('tutorialFormInstructor')) $('tutorialFormInstructor').value = tut.instructor || '';
    if ($('tutorialFormDuration')) $('tutorialFormDuration').value = tut.durationMinutes || '';
    if ($('tutorialFormEventDate')) $('tutorialFormEventDate').value = toInputDateTime(tut.eventDate);
    if ($('tutorialFormMaxSeats')) $('tutorialFormMaxSeats').value = tut.maxSeats || 50;
    if ($('tutorialFormLocation')) $('tutorialFormLocation').value = tut.location || '';
    if ($('tutorialFormContentUrl')) $('tutorialFormContentUrl').value = tut.contentUrl || '';
    if ($('tutorialFormThumbnailUrl')) $('tutorialFormThumbnailUrl').value = tut.thumbnailUrl || '';
    if ($('tutorialFormDescription')) $('tutorialFormDescription').value = tut.description || '';
    if ($('tutorialDialogTitle')) $('tutorialDialogTitle').innerHTML = '<span>✏️ Chỉnh sửa Nội dung Đào tạo / Workshop</span>';
    $('tutorialDialog')?.showModal();
  }

  async function handleSaveTutorial(e) {
    e.preventDefault();
    try {
      const id = $('tutorialFormId')?.value;
      const payload = {
        title: $('tutorialFormTitle')?.value.trim(),
        category: $('tutorialFormCategory')?.value,
        format: $('tutorialFormFormat')?.value,
        instructor: $('tutorialFormInstructor')?.value.trim(),
        durationMinutes: $('tutorialFormDuration')?.value ? Number($('tutorialFormDuration').value) : undefined,
        eventDate: $('tutorialFormEventDate')?.value ? new Date($('tutorialFormEventDate').value).toISOString() : undefined,
        maxSeats: $('tutorialFormMaxSeats')?.value ? Number($('tutorialFormMaxSeats').value) : 50,
        location: $('tutorialFormLocation')?.value.trim() || undefined,
        contentUrl: $('tutorialFormContentUrl')?.value.trim() || undefined,
        thumbnailUrl: $('tutorialFormThumbnailUrl')?.value.trim() || undefined,
        description: $('tutorialFormDescription')?.value.trim(),
      };

      if (!payload.title || !payload.instructor || !payload.description) {
        notify('Vui lòng nhập đầy đủ tiêu đề, diễn giả và mô tả nội dung.', true);
        return;
      }

      if (id) {
        await api(`/tutorials/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        notify('Đã cập nhật nội dung đào tạo thành công!');
      } else {
        await api('/tutorials', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        notify('Đã thêm nội dung đào tạo / workshop mới thành công!');
      }

      $('tutorialDialog')?.close();
      void loadTutorials();
    } catch (err) {
      console.error(err);
      notify('Lỗi khi lưu đào tạo: ' + (err.message || 'Thất bại'), true);
    }
  }

  async function openTutorialRegistrationsDialog(id) {
    currentTutorialRegId = id;
    const tut = tutorialsData.find((item) => item.id === id);
    if (!tut) return;

    if ($('tutRegTitle')) $('tutRegTitle').textContent = tut.title;
    if ($('tutRegMeta')) $('tutRegMeta').textContent = `Diễn giả: ${tut.instructor} | Thời gian: ${formatDateTime(tut.eventDate)} | Đã đăng ký: ${tut.registeredSeats || 0} / ${tut.maxSeats || 50} chỗ`;

    const tbody = $('tutorialRegistrationsTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:#888;">Đang tải danh sách đăng ký...</td></tr>';
    $('tutorialRegistrationsDialog')?.showModal();

    try {
      const regs = await api(`/tutorials/${id}/registrations`);
      if (!tbody) return;

      if (!regs || !regs.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:#888;">Chưa có bạn đọc nào đăng ký buổi workshop này.</td></tr>';
        return;
      }

      tbody.innerHTML = regs.map((reg, idx) => `
        <tr>
          <td style="text-align:center;font-weight:600;">${idx + 1}</td>
          <td><strong>${escapeHtml(reg.readerCardNumber || '—')}</strong></td>
          <td>${escapeHtml(reg.readerName || 'Bạn đọc')}</td>
          <td style="color:#0284c7;">${escapeHtml(reg.readerEmail || '—')}</td>
          <td style="font-size:12.5px;color:#64748b;">${formatDateTime(reg.createdAt)}</td>
          <td style="text-align:center;"><span class="status-badge" style="background:#dcfce7;color:#166534;font-size:11.5px;font-weight:700;">Đã xác nhận</span></td>
        </tr>
      `).join('');
    } catch (err) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#ef4444;padding:1.5rem;">Lỗi tải danh sách: ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  async function handleSimulateRegisterWorkshop() {
    if (!currentTutorialRegId) return;
    try {
      const payload = {
        readerName: state.user?.fullName || state.user?.username || 'Nguyễn Văn Đạt (SV)',
        readerEmail: state.user?.email || 'dat.nv26@university.edu.vn',
        readerPhone: '0987654321',
        readerCardNumber: state.user?.cardNumber || 'SV2026-888',
      };

      await api(`/tutorials/${currentTutorialRegId}/register`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      notify('Đăng ký tham gia workshop thành công!');
      void openTutorialRegistrationsDialog(currentTutorialRegId);
      void loadTutorials();
    } catch (err) {
      notify('Lỗi đăng ký: ' + (err.message || 'Thất bại'), true);
    }
  }

  async function deleteTutorial(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa bài hướng dẫn / workshop này?')) return;
    try {
      await api(`/tutorials/${id}`, { method: 'DELETE' });
      notify('Đã xóa bài hướng dẫn thành công.');
      void loadTutorials();
    } catch (err) {
      notify('Lỗi khi xóa: ' + (err.message || 'Thất bại'), true);
    }
  }

  window.openEditTutorial = openEditTutorial;
  window.openTutorialRegistrationsDialog = openTutorialRegistrationsDialog;
  window.deleteTutorial = deleteTutorial;

  // Event listeners cho Quản lý Sự kiện & Thông báo
  $('openCreateEventBtn')?.addEventListener('click', openCreateEventDialog);
  $('refreshEventsBtn')?.addEventListener('click', () => void loadEvents());
  $('eventSearchInput')?.addEventListener('input', () => void loadEvents());
  $('eventTypeFilter')?.addEventListener('change', () => void loadEvents());
  $('eventStatusFilter')?.addEventListener('change', () => void loadEvents());
  $('eventAudienceFilter')?.addEventListener('change', () => void loadEvents());
  $('eventForm')?.addEventListener('submit', handleSaveEvent);
  $('broadcastEventForm')?.addEventListener('submit', handleBroadcastEvent);

  // Event listeners cho Quản lý Phản hồi & Đóng góp ý kiến
  $('openSubmitFeedbackBtn')?.addEventListener('click', openSubmitFeedbackDialog);
  $('refreshFeedbackBtn')?.addEventListener('click', () => void loadFeedback());
  $('feedbackSearchInput')?.addEventListener('input', () => void loadFeedback());
  $('feedbackCategoryFilter')?.addEventListener('change', () => void loadFeedback());
  $('feedbackStatusFilter')?.addEventListener('change', () => void loadFeedback());
  $('respondFeedbackForm')?.addEventListener('submit', handleSaveFeedbackResponse);
  $('readerSubmitFeedbackForm')?.addEventListener('submit', handleReaderSubmitFeedback);

  // Event listeners cho Theo dõi Đào tạo & Workshop
  $('openCreateTutorialBtn')?.addEventListener('click', openCreateTutorialDialog);
  $('refreshTutorialsBtn')?.addEventListener('click', () => void loadTutorials());
  $('tutorialSearchInput')?.addEventListener('input', () => void loadTutorials());
  $('tutorialCategoryFilter')?.addEventListener('change', () => void loadTutorials());
  $('tutorialFormatFilter')?.addEventListener('change', () => void loadTutorials());
  $('tutorialForm')?.addEventListener('submit', handleSaveTutorial);
  $('simRegisterWorkshopBtn')?.addEventListener('click', handleSimulateRegisterWorkshop);

  /* ========================================================= */
  /* MODULE 4: QUẢN LÝ ĐỐI TÁC & NHÀ TÀI TRỢ SÁCH (/admin/partners) */
  /* ========================================================= */
  let partnersData = [];
  let donationsData = [];

  async function loadPartners() {
    try {
      const type = $('partnerTypeFilter')?.value || '';
      const search = $('partnerSearchInput')?.value.trim() || '';

      const query = new URLSearchParams();
      if (type) query.append('type', type);
      if (search) query.append('search', search);

      const [partners, stats, donations] = await Promise.all([
        api('/partners?' + query.toString()).catch(() => []),
        api('/partners/stats').catch(() => ({})),
        api('/partners/donations').catch(() => []),
      ]);

      partnersData = partners || [];
      donationsData = donations || [];

      if ($('statTotalPartners')) $('statTotalPartners').textContent = stats.totalPartners || 0;
      if ($('statTotalDonatedBooks')) $('statTotalDonatedBooks').textContent = `${(stats.totalDonatedBooks || 0).toLocaleString('vi-VN')} cuốn`;
      if ($('statTotalDonatedCash')) $('statTotalDonatedCash').textContent = money(stats.totalDonatedCash || 0);
      if ($('statTotalDonationEvents')) $('statTotalDonationEvents').textContent = `${stats.totalDonationEvents || 0} đợt`;

      // Cập nhật dropdown chọn đối tác khi tạo tiếp nhận
      const partnerSelect = $('donationFormPartnerId');
      if (partnerSelect) {
        const currentVal = partnerSelect.value;
        partnerSelect.innerHTML = '<option value="">-- Chọn đối tác trong danh mục --</option>' +
          partnersData.map((p) => `<option value="${p.id}">${escapeHtml(p.name)} (${p.contactPerson || 'Đại diện'})</option>`).join('');
        if (currentVal) partnerSelect.value = currentVal;
      }

      renderPartnersTable();
      renderDonationsTable();
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu đối tác tài trợ:', err);
      const tbody = $('partnersTableBody');
      if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#ef4444;padding:2rem;">Lỗi tải dữ liệu: ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  function renderPartnersTable() {
    const tbody = $('partnersTableBody');
    if (!tbody) return;

    if (!partnersData.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2.5rem;color:#888;">Không tìm thấy đối tác nào phù hợp.</td></tr>';
      return;
    }

    const typeBadges = {
      INDIVIDUAL_ALUMNI: '<span class="status-badge" style="background:#eff6ff;color:#1d4ed8;font-weight:700;">🎓 Cựu sinh viên</span>',
      PUBLISHER: '<span class="status-badge" style="background:#f3e8ff;color:#7e22ce;font-weight:700;">📚 Nhà xuất bản</span>',
      ORGANIZATION: '<span class="status-badge" style="background:#ecfdf5;color:#047857;font-weight:700;">🏛️ Tổ chức / Viện</span>',
      CORPORATION: '<span class="status-badge" style="background:#fef3c7;color:#b45309;font-weight:700;">🏢 Doanh nghiệp</span>',
      OTHER: '<span class="status-badge" style="background:#f1f5f9;color:#475569;">Khác</span>',
    };

    tbody.innerHTML = partnersData.map((p) => {
      const statusBadge = p.status === 'ACTIVE'
        ? '<span class="status-badge" style="background:#dcfce7;color:#166534;font-weight:700;">🟢 Hợp tác</span>'
        : '<span class="status-badge" style="background:#f1f5f9;color:#64748b;">⚪ Tạm ngừng</span>';

      return `
        <tr>
          <td>
            <div style="font-weight:700;color:#0f172a;font-size:14px;margin-bottom:2px;">${escapeHtml(p.name)}</div>
            <div style="font-size:12px;color:#64748b;">${escapeHtml(p.note || 'Chưa có ghi chú')}</div>
          </td>
          <td style="text-align:center;">${typeBadges[p.type] || p.type}</td>
          <td style="font-size:12.5px;">
            <div><strong>${escapeHtml(p.contactPerson || '—')}</strong></div>
            ${p.phone ? `<div style="color:#475569;">📞 ${escapeHtml(p.phone)}</div>` : ''}
            ${p.email ? `<div style="color:#0284c7;">✉️ ${escapeHtml(p.email)}</div>` : ''}
            ${p.address ? `<div style="color:#64748b;font-size:11.5px;">📍 ${escapeHtml(p.address)}</div>` : ''}
          </td>
          <td style="text-align:center;font-weight:700;color:#166534;font-size:13.5px;">
            ${(p.totalDonatedBooks || 0).toLocaleString('vi-VN')} cuốn
          </td>
          <td style="text-align:right;font-weight:700;color:#0284c7;font-size:13.5px;">
            ${money(p.totalDonatedCash || 0)}
          </td>
          <td style="text-align:center;">${statusBadge}</td>
          <td style="text-align:center;">
            <div style="display:flex;gap:5px;justify-content:center;flex-wrap:wrap;">
              <button class="button button-small button-primary" type="button" onclick="openCreateDonationDialog(${p.id})" style="background:#0284c7;border-color:#0284c7;font-size:12px;padding:3px 8px;" title="Tiếp nhận sách/hiện kim mới">🎁 Nhận</button>
              <button class="button button-small button-light" type="button" onclick="openEditPartner(${p.id})" style="font-size:12px;padding:3px 8px;">✏️ Sửa</button>
              <button class="button button-small button-danger" type="button" onclick="deletePartner(${p.id})" style="font-size:12px;padding:3px 8px;">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderDonationsTable() {
    const tbody = $('donationsTableBody');
    if (!tbody) return;

    const donationType = $('donationTypeFilter')?.value || '';
    const search = $('donationSearchInput')?.value.trim().toLowerCase() || '';

    let list = donationsData;
    if (donationType) list = list.filter((d) => d.donationType === donationType);
    if (search) {
      list = list.filter((d) =>
        (d.itemTitle && d.itemTitle.toLowerCase().includes(search)) ||
        (d.partnerName && d.partnerName.toLowerCase().includes(search)) ||
        (d.receiptNumber && d.receiptNumber.toLowerCase().includes(search))
      );
    }

    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2.5rem;color:#888;">Chưa có đợt tiếp nhận nào.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map((d) => {
      let typeLabel = '📚 Sách in';
      if (d.donationType === 'CASH') typeLabel = '💰 Hiện kim';
      else if (d.donationType === 'EQUIPMENT') typeLabel = '💻 Thiết bị';

      return `
        <tr>
          <td><strong style="color:#b91c1c;font-family:monospace;font-size:13px;">${escapeHtml(d.receiptNumber)}</strong></td>
          <td style="font-size:12.5px;color:#64748b;">📅 ${formatDateTime(d.donationDate)}</td>
          <td><strong style="color:#0f172a;">${escapeHtml(d.partnerName || 'Đối tác')}</strong></td>
          <td>
            <div style="font-weight:600;color:#1e3a8a;font-size:13.5px;">${escapeHtml(d.itemTitle)}</div>
            ${d.note ? `<div style="font-size:12px;color:#64748b;">${escapeHtml(d.note)}</div>` : ''}
          </td>
          <td style="text-align:center;font-weight:700;">${(d.quantity || 1).toLocaleString('vi-VN')} (${typeLabel})</td>
          <td style="text-align:right;font-weight:700;color:#166534;">${money(d.estimatedValue || 0)}</td>
          <td style="font-size:12.5px;color:#475569;">${escapeHtml(d.receivedByStaffName || 'Thủ thư')}</td>
          <td style="text-align:center;">
            <div style="display:flex;gap:4px;justify-content:center;flex-wrap:wrap;">
              <button class="button button-small button-secondary" type="button" onclick="openDonationReceipt(${d.id})" style="background:#1e3a8a;color:#fff;font-size:12px;padding:3px 8px;" title="In thư cảm ơn & biên bản">📜 Thư Cảm Ơn</button>
              ${d.donationType === 'BOOKS' ? `
                <button class="button button-small button-primary" type="button" onclick="importDonationToCatalog(${d.id})" style="background:#166534;border-color:#166534;font-size:12px;padding:3px 8px;" title="Liên kết và nhập sách tài trợ vào kho chung">📥 Nhập kho</button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function importDonationToCatalog(id) {
    const d = donationsData.find((item) => item.id === id);
    if (!d) return;

    if (!confirm(`Bạn có muốn chuyển đầu sách tài trợ "${d.itemTitle}" (${d.quantity} cuốn) vào biểu mẫu Nhập kho sách chung của thư viện?`)) return;

    try {
      window.history.pushState({}, '', '/admin/books');
      syncAdminRoute();
      if ($('bookFormPanel')) {
        $('bookFormPanel').hidden = false;
        $('bookFormPanel').scrollIntoView({ behavior: 'smooth' });
      }
      if ($('bookFormTitle')) $('bookFormTitle').textContent = `Nhập sách từ tài trợ: ${d.itemTitle}`;
      if ($('bookId')) $('bookId').value = '';
      if ($('bookTitle')) $('bookTitle').value = d.itemTitle || '';
      if ($('bookAuthor')) $('bookAuthor').value = `Tài trợ bởi: ${d.partnerName || 'Đối tác'}`;
      if ($('bookPublicationYear')) $('bookPublicationYear').value = new Date().getFullYear();
      if ($('bookTotalCopies')) $('bookTotalCopies').value = d.quantity || 1;
      if ($('bookAvailableCopies')) $('bookAvailableCopies').value = d.quantity || 1;
      if ($('bookIsbn')) $('bookIsbn').value = '';
      notify(`Đã điền thông tin sách từ đợt tài trợ [${d.receiptNumber}]. Vui lòng chọn Thể loại và lưu để cập nhật vào kho chung.`);
    } catch (e) {
      notify('Lỗi nhập kho: ' + e.message, true);
    }
  }
  window.importDonationToCatalog = importDonationToCatalog;

  function openCreatePartnerDialog() {
    $('partnerForm')?.reset();
    if ($('partnerFormId')) $('partnerFormId').value = '';
    if ($('partnerDialogTitle')) $('partnerDialogTitle').innerHTML = '<span>🤝 Thêm Đối tác / Nhà tài trợ mới</span>';
    $('partnerDialog')?.showModal();
  }

  function openEditPartner(id) {
    const p = partnersData.find((item) => item.id === id);
    if (!p) return;
    if ($('partnerFormId')) $('partnerFormId').value = p.id;
    if ($('partnerFormName')) $('partnerFormName').value = p.name || '';
    if ($('partnerFormType')) $('partnerFormType').value = p.type || 'ORGANIZATION';
    if ($('partnerFormStatus')) $('partnerFormStatus').value = p.status || 'ACTIVE';
    if ($('partnerFormContactPerson')) $('partnerFormContactPerson').value = p.contactPerson || '';
    if ($('partnerFormPhone')) $('partnerFormPhone').value = p.phone || '';
    if ($('partnerFormEmail')) $('partnerFormEmail').value = p.email || '';
    if ($('partnerFormAddress')) $('partnerFormAddress').value = p.address || '';
    if ($('partnerFormNote')) $('partnerFormNote').value = p.note || '';
    if ($('partnerDialogTitle')) $('partnerDialogTitle').innerHTML = '<span>✏️ Chỉnh sửa Thông tin Đối tác</span>';
    $('partnerDialog')?.showModal();
  }

  async function handleSavePartner(e) {
    e.preventDefault();
    try {
      const id = $('partnerFormId')?.value;
      const payload = {
        name: $('partnerFormName')?.value.trim(),
        type: $('partnerFormType')?.value,
        status: $('partnerFormStatus')?.value,
        contactPerson: $('partnerFormContactPerson')?.value.trim() || undefined,
        phone: $('partnerFormPhone')?.value.trim() || undefined,
        email: $('partnerFormEmail')?.value.trim() || undefined,
        address: $('partnerFormAddress')?.value.trim() || undefined,
        note: $('partnerFormNote')?.value.trim() || undefined,
      };

      if (!payload.name) {
        notify('Vui lòng nhập tên đơn vị / đối tác.', true);
        return;
      }

      if (id) {
        await api(`/partners/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        notify('Cập nhật thông tin đối tác thành công!');
      } else {
        await api('/partners', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        notify('Đã thêm đối tác tài trợ mới thành công!');
      }

      $('partnerDialog')?.close();
      void loadPartners();
    } catch (err) {
      console.error(err);
      notify('Lỗi khi lưu đối tác: ' + (err.message || 'Thất bại'), true);
    }
  }

  async function deletePartner(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa đối tác này cùng toàn bộ lịch sử tài trợ?')) return;
    try {
      await api(`/partners/${id}`, { method: 'DELETE' });
      notify('Đã xóa đối tác thành công.');
      void loadPartners();
    } catch (err) {
      notify('Lỗi khi xóa: ' + (err.message || 'Thất bại'), true);
    }
  }

  function openCreateDonationDialog(partnerId) {
    $('donationForm')?.reset();
    if (partnerId && $('donationFormPartnerId')) {
      $('donationFormPartnerId').value = String(partnerId);
    }
    $('donationDialog')?.showModal();
  }

  async function handleSaveDonation(e) {
    e.preventDefault();
    try {
      const partnerId = Number($('donationFormPartnerId')?.value);
      const donationType = $('donationFormType')?.value;
      const itemTitle = $('donationFormItemTitle')?.value.trim();
      const quantity = Number($('donationFormQuantity')?.value) || 1;
      const estimatedValue = Number($('donationFormEstimatedValue')?.value) || 0;
      const note = $('donationFormNote')?.value.trim() || undefined;

      if (!partnerId || !itemTitle) {
        notify('Vui lòng chọn đối tác và nhập tên gói tài trợ.', true);
        return;
      }

      const res = await api('/partners/donations', {
        method: 'POST',
        body: JSON.stringify({
          partnerId,
          donationType,
          itemTitle,
          quantity,
          estimatedValue,
          note,
        }),
      });

      notify('Tiếp nhận tài trợ thành công! Đã phát hành biên bản: ' + res.receiptNumber);
      $('donationDialog')?.close();
      void loadPartners();

      // Tự động mở xem trước Thư cảm ơn & Biên bản bàn giao
      if (res.id) {
        void openDonationReceipt(res.id);
      }
    } catch (err) {
      console.error(err);
      notify('Lỗi khi lưu đợt tiếp nhận: ' + (err.message || 'Thất bại'), true);
    }
  }

  async function openDonationReceipt(id) {
    try {
      const data = await api(`/partners/donations/${id}/receipt`);
      const { donation, partner, template } = data;

      if ($('rcptCode')) $('rcptCode').textContent = template.receiptCode;
      if ($('rcptDate')) $('rcptDate').textContent = formatDateTime(template.issueDate);
      if ($('rcptSponsorName')) $('rcptSponsorName').textContent = template.sponsorName;
      if ($('rcptContactPerson')) $('rcptContactPerson').textContent = template.contactPerson;
      if ($('rcptAddress')) $('rcptAddress').textContent = template.sponsorAddress;
      if ($('rcptItemTitle')) $('rcptItemTitle').textContent = template.donationDetails.item;
      if ($('rcptQuantity')) $('rcptQuantity').textContent = (template.donationDetails.quantity || 1).toLocaleString('vi-VN');
      if ($('rcptValue')) $('rcptValue').textContent = money(template.donationDetails.estimatedValue);
      if ($('rcptLibrarian')) $('rcptLibrarian').textContent = template.librarianSign;

      let typeName = 'Sách in';
      if (template.donationDetails.type === 'CASH') typeName = 'Hiện kim';
      else if (template.donationDetails.type === 'EQUIPMENT') typeName = 'Thiết bị';
      if ($('rcptType')) $('rcptType').textContent = typeName;

      $('donationReceiptDialog')?.showModal();
    } catch (err) {
      notify('Lỗi khi mở biên bản: ' + (err.message || 'Thất bại'), true);
    }
  }

  window.openEditPartner = openEditPartner;
  window.deletePartner = deletePartner;
  window.openCreateDonationDialog = openCreateDonationDialog;
  window.openDonationReceipt = openDonationReceipt;

  /* ========================================================= */
  /* MODULE 5: GIÁM SÁT THIẾT BỊ IOT & CẢM BIẾN (/admin/iot-monitoring) */
  /* ========================================================= */
  let iotDevicesData = [];
  let iotAlertsData = [];

  async function loadIotDevices() {
    try {
      const type = $('iotTypeFilter')?.value || '';
      const status = $('iotStatusFilter')?.value || '';
      const search = $('iotSearchInput')?.value.trim() || '';
      const alertResolved = $('iotAlertFilter')?.value;

      const query = new URLSearchParams();
      if (type) query.append('type', type);
      if (status) query.append('status', status);
      if (search) query.append('search', search);

      const alertQuery = new URLSearchParams();
      if (alertResolved !== undefined && alertResolved !== '') {
        alertQuery.append('resolved', alertResolved);
      }

      const [devices, stats, alerts] = await Promise.all([
        api('/iot/devices?' + query.toString()).catch(() => []),
        api('/iot/stats').catch(() => ({})),
        api('/iot/alerts?' + alertQuery.toString()).catch(() => []),
      ]);

      iotDevicesData = devices || [];
      iotAlertsData = alerts || [];

      if ($('statIotOnline')) $('statIotOnline').textContent = stats.online || 0;
      if ($('statIotWarning')) $('statIotWarning').textContent = stats.warning || 0;
      if ($('statRfidScans')) $('statRfidScans').textContent = (stats.rfidTotalScans || 0).toLocaleString('vi-VN');
      if ($('statRfidAlerts')) $('statRfidAlerts').textContent = `${stats.rfidTotalAlerts || 0} vụ`;

      // Cập nhật real-time dashboard banner
      if ($('archiveTempDisplay')) $('archiveTempDisplay').textContent = `${stats.archiveEnvironment?.temperature || 20.8} °C`;
      if ($('archiveHumDisplay')) $('archiveHumDisplay').textContent = `${stats.archiveEnvironment?.humidity || 53.5} %`;
      if ($('archiveEnvBadge')) {
        const isSafe = stats.archiveEnvironment?.isSafe !== false;
        $('archiveEnvBadge').textContent = isSafe ? 'Đạt chuẩn ISO' : '⚠️ Cảnh báo nhiệt ẩm';
        $('archiveEnvBadge').style.background = isSafe ? '#dcfce7' : '#fee2e2';
        $('archiveEnvBadge').style.color = isSafe ? '#166534' : '#991b1b';
      }

      const mainRfid = iotDevicesData.find((d) => d.deviceCode === 'RFID-GATE-MAIN');
      if (mainRfid) {
        if ($('rfidMainScansDisplay')) $('rfidMainScansDisplay').textContent = (mainRfid.rfidScansToday || 0).toLocaleString('vi-VN');
        if ($('rfidMainAlertsDisplay')) $('rfidMainAlertsDisplay').textContent = `${mainRfid.rfidAlertsToday || 0} vụ`;
      }

      renderIotGrid();
      renderIotAlertsTable();
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu IoT:', err);
      const container = $('iotDevicesGrid');
      if (container) container.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:#ef4444;padding:2rem;">Lỗi kết nối IoT Hub: ${escapeHtml(err.message)}</div>`;
    }
  }

  function renderIotAlertsTable() {
    const tbody = $('iotAlertsTableBody');
    if (!tbody) return;

    if (!iotAlertsData.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:#888;">Không có cảnh báo an ninh nào ghi nhận. Hệ thống an toàn.</td></tr>';
      return;
    }

    const severityBadges = {
      CRITICAL: '<span class="status-badge" style="background:#fee2e2;color:#991b1b;font-weight:700;">🚨 Báo động đỏ</span>',
      WARNING: '<span class="status-badge" style="background:#fef3c7;color:#92400e;font-weight:700;">⚠️ Cảnh báo</span>',
      INFO: '<span class="status-badge" style="background:#eff6ff;color:#1e40af;font-weight:600;">ℹ️ Thông tin</span>',
    };

    tbody.innerHTML = iotAlertsData.map((a) => {
      const statusHtml = a.resolved
        ? '<span class="status-badge" style="background:#dcfce7;color:#166534;font-weight:700;">✓ Đã xử lý</span>' + (a.resolvedByStaffName ? `<div style="font-size:11px;color:#64748b;margin-top:2px;">Bởi: ${escapeHtml(a.resolvedByStaffName)}</div>` : '')
        : '<span class="status-badge" style="background:#fee2e2;color:#b91c1c;font-weight:700;">🔥 Đang kích hoạt</span>';

      const actionHtml = a.resolved
        ? '<span style="color:#94a3b8;font-size:12px;">Đã hoàn tất</span>'
        : `<button class="button button-small button-primary" type="button" onclick="resolveIotAlert(${a.id})" style="background:#166534;border-color:#166534;font-size:11.5px;padding:3px 8px;">✓ Đã kiểm tra</button>`;

      return `
        <tr>
          <td style="font-size:12px;color:#64748b;">📅 ${formatDateTime(a.createdAt)}</td>
          <td>
            <div style="font-weight:700;color:#0f172a;font-size:13px;">${escapeHtml(a.deviceName)}</div>
            <span style="font-size:11px;font-family:monospace;color:#64748b;">${escapeHtml(a.deviceCode)}</span>
          </td>
          <td style="text-align:center;">${severityBadges[a.severity] || a.severity}</td>
          <td style="font-size:13px;color:#334155;line-height:1.4;">${escapeHtml(a.message)}</td>
          <td style="text-align:center;">${statusHtml}</td>
          <td style="text-align:center;">${actionHtml}</td>
        </tr>
      `;
    }).join('');
  }

  async function resolveIotAlert(id) {
    try {
      await api(`/iot/alerts/${id}/resolve`, { method: 'PATCH' });
      notify('Đã cập nhật trạng thái đã xử lý cho cảnh báo an toàn!');
      void loadIotDevices();
    } catch (e) {
      notify('Lỗi xử lý cảnh báo: ' + e.message, true);
    }
  }

  async function simulateIotAlert() {
    try {
      await api('/iot/alerts/simulate', { method: 'POST' });
      notify('Đã kích hoạt cảnh báo an ninh mô phỏng thành công!');
      void loadIotDevices();
    } catch (e) {
      notify('Lỗi kích hoạt mô phỏng: ' + e.message, true);
    }
  }

  window.resolveIotAlert = resolveIotAlert;
  window.simulateIotAlert = simulateIotAlert;

  function renderIotGrid() {
    const container = $('iotDevicesGrid');
    if (!container) return;

    if (!iotDevicesData.length) {
      container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:#888;">Không tìm thấy thiết bị IoT nào. Nhấn "+ Thêm Thiết bị IoT" để kết nối.</div>';
      return;
    }

    const typeIcons = {
      RFID_GATE: '🛡️',
      ENV_SENSOR: '🌡️',
      SMART_AC: '❄️',
      SMART_LIGHT: '💡',
      BOOK_DROP_BOX: '📦',
    };

    const statusBadges = {
      ONLINE: '<span class="status-badge" style="background:#dcfce7;color:#166534;font-weight:700;">🟢 Online</span>',
      WARNING: '<span class="status-badge" style="background:#fef3c7;color:#b45309;font-weight:700;">⚠️ Warning</span>',
      OFFLINE: '<span class="status-badge" style="background:#fee2e2;color:#991b1b;font-weight:600;">⚪ Offline</span>',
      MAINTENANCE: '<span class="status-badge" style="background:#f1f5f9;color:#64748b;font-weight:600;">🔧 Bảo trì</span>',
    };

    container.innerHTML = iotDevicesData.map((dev) => {
      let telemetryHtml = '';

      if (dev.type === 'RFID_GATE') {
        telemetryHtml = `
          <div style="background:#f8fafc;padding:10px;border-radius:8px;font-size:12.5px;margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <span>Lượt quét qua cổng hôm nay:</span>
              <strong style="color:#0284c7;font-size:14px;">${(dev.rfidScansToday || 0).toLocaleString('vi-VN')}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span>Chuông cảnh báo chưa mượn:</span>
              <strong style="color:${dev.rfidAlertsToday > 0 ? '#ef4444' : '#166534'};font-size:14px;">${dev.rfidAlertsToday || 0} lần</strong>
            </div>
          </div>
        `;
      } else if (dev.type === 'ENV_SENSOR') {
        telemetryHtml = `
          <div style="background:#f0fdf4;padding:10px;border-radius:8px;font-size:12.5px;margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <span>Nhiệt độ hiện tại:</span>
              <strong style="color:#166534;font-size:16px;">${dev.temperature || '—'} °C</strong>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span>Độ ẩm không khí:</span>
              <strong style="color:#0284c7;font-size:16px;">${dev.humidity || '—'} % RH</strong>
            </div>
          </div>
        `;
      } else if (dev.type === 'SMART_AC') {
        telemetryHtml = `
          <div style="background:#eff6ff;padding:10px;border-radius:8px;font-size:12.5px;margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <span>Nguồn máy lạnh VRV:</span>
              <strong style="color:${dev.powerState ? '#166534' : '#64748b'};">${dev.powerState ? '🟢 Đang chạy' : '⚪ Đã tắt'}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span>Nhiệt độ thiết lập:</span>
              <strong style="color:#0f172a;">${dev.temperature || 24.0} °C (Tự động)</strong>
            </div>
          </div>
        `;
      } else if (dev.type === 'SMART_LIGHT') {
        telemetryHtml = `
          <div style="background:#fefce8;padding:10px;border-radius:8px;font-size:12.5px;margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <span>Chiếu sáng DALI:</span>
              <strong style="color:${dev.powerState ? '#ca8a04' : '#64748b'};">${dev.powerState ? '💡 Đang bật' : '⚪ Tắt nguồn'}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span>Cảm biến chuyển động:</span>
              <strong style="color:#166534;">Hoạt động 100%</strong>
            </div>
          </div>
        `;
      } else if (dev.type === 'BOOK_DROP_BOX') {
        telemetryHtml = `
          <div style="background:#fdf4ff;padding:10px;border-radius:8px;font-size:12.5px;margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <span>Sách trả qua hòm hôm nay:</span>
              <strong style="color:#7e22ce;font-size:14px;">${(dev.rfidScansToday || 0).toLocaleString('vi-VN')} cuốn</strong>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span>Băng tải phân loại:</span>
              <strong style="color:#166534;">Sẵn sàng tiếp nhận</strong>
            </div>
          </div>
        `;
      }

      return `
        <article class="report-card" style="padding:16px;display:flex;flex-direction:column;border-radius:12px;border:1px solid #e2e8f0;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
            <div style="display:flex;gap:8px;align-items:center;">
              <span style="font-size:24px;">${typeIcons[dev.type] || '📡'}</span>
              <div>
                <strong style="font-size:14px;color:#0f172a;display:block;">${escapeHtml(dev.name)}</strong>
                <span style="font-size:11px;font-family:monospace;color:#64748b;">${escapeHtml(dev.deviceCode)}</span>
              </div>
            </div>
            ${statusBadges[dev.status] || dev.status}
          </div>

          <div style="font-size:12px;color:#475569;margin-bottom:10px;line-height:1.4;">
            <div>📍 <strong>Vị trí:</strong> ${escapeHtml(dev.location)}</div>
            ${dev.ipAddress ? `<div>🌐 <strong>IP:</strong> ${escapeHtml(dev.ipAddress)} (${escapeHtml(dev.firmwareVersion || 'v1.0')})</div>` : ''}
          </div>

          ${telemetryHtml}

          <div style="display:flex;gap:6px;justify-content:space-between;align-items:center;margin-top:auto;border-top:1px solid #f1f5f9;padding-top:10px;">
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              ${(dev.type === 'SMART_AC' || dev.type === 'SMART_LIGHT') ? `
                <button class="button button-small button-primary" type="button" onclick="executeIotAction(${dev.id}, 'TOGGLE_POWER')" style="font-size:11.5px;padding:3px 7px;">
                  ${dev.powerState ? 'Bật/Tắt' : 'Bật lại'}
                </button>
              ` : ''}
              ${dev.type === 'RFID_GATE' ? `
                <button class="button button-small button-accent" type="button" onclick="executeIotAction(${dev.id}, 'TRIGGER_ALARM_TEST')" style="background:#ef4444;border-color:#ef4444;font-size:11.5px;padding:3px 7px;">
                  🔔 Test chuông
                </button>
              ` : ''}
              ${dev.type === 'ENV_SENSOR' ? `
                <button class="button button-small button-light" type="button" onclick="executeIotAction(${dev.id}, 'CALIBRATE')" style="font-size:11.5px;padding:3px 7px;">
                  ⚙️ Hiệu chuẩn
                </button>
              ` : ''}
              <button class="button button-small button-light" type="button" onclick="executeIotAction(${dev.id}, 'REBOOT')" style="font-size:11.5px;padding:3px 7px;" title="Ping & Khởi động lại thiết bị">
                🔄 Reboot
              </button>
            </div>
            <div style="display:flex;gap:4px;">
              <button class="button button-small button-light" type="button" onclick="openEditIotDevice(${dev.id})" style="font-size:11.5px;padding:3px 7px;">✏️</button>
              <button class="button button-small button-danger" type="button" onclick="deleteIotDevice(${dev.id})" style="font-size:11.5px;padding:3px 7px;">🗑️</button>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  function openCreateIotDialog() {
    $('iotDeviceForm')?.reset();
    if ($('iotFormId')) $('iotFormId').value = '';
    if ($('iotDeviceDialogTitle')) $('iotDeviceDialogTitle').innerHTML = '<span>📡 Thêm Thiết Bị IoT / Cảm Biến Mới</span>';
    $('iotDeviceDialog')?.showModal();
  }

  function openEditIotDevice(id) {
    const dev = iotDevicesData.find((item) => item.id === id);
    if (!dev) return;
    if ($('iotFormId')) $('iotFormId').value = dev.id;
    if ($('iotFormCode')) $('iotFormCode').value = dev.deviceCode || '';
    if ($('iotFormName')) $('iotFormName').value = dev.name || '';
    if ($('iotFormType')) $('iotFormType').value = dev.type || 'ENV_SENSOR';
    if ($('iotFormLocation')) $('iotFormLocation').value = dev.location || '';
    if ($('iotFormIp')) $('iotFormIp').value = dev.ipAddress || '';
    if ($('iotFormStatus')) $('iotFormStatus').value = dev.status || 'ONLINE';
    if ($('iotFormFirmware')) $('iotFormFirmware').value = dev.firmwareVersion || '';
    if ($('iotFormNote')) $('iotFormNote').value = dev.note || '';
    if ($('iotDeviceDialogTitle')) $('iotDeviceDialogTitle').innerHTML = '<span>✏️ Cấu hình Thiết bị IoT</span>';
    $('iotDeviceDialog')?.showModal();
  }

  async function handleSaveIotDevice(e) {
    e.preventDefault();
    try {
      const id = $('iotFormId')?.value;
      const payload = {
        deviceCode: $('iotFormCode')?.value.trim(),
        name: $('iotFormName')?.value.trim(),
        type: $('iotFormType')?.value,
        location: $('iotFormLocation')?.value.trim(),
        ipAddress: $('iotFormIp')?.value.trim() || undefined,
        status: $('iotFormStatus')?.value,
        firmwareVersion: $('iotFormFirmware')?.value.trim() || undefined,
        note: $('iotFormNote')?.value.trim() || undefined,
      };

      if (!payload.deviceCode || !payload.name || !payload.location) {
        notify('Vui lòng nhập đầy đủ mã, tên và vị trí thiết bị.', true);
        return;
      }

      if (id) {
        await api(`/iot/devices/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        notify('Cập nhật cấu hình thiết bị IoT thành công!');
      } else {
        await api('/iot/devices', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        notify('Đã kết nối và thêm thiết bị IoT mới thành công!');
      }

      $('iotDeviceDialog')?.close();
      void loadIotDevices();
    } catch (err) {
      console.error(err);
      notify('Lỗi khi lưu thiết bị: ' + (err.message || 'Thất bại'), true);
    }
  }

  async function deleteIotDevice(id) {
    if (!confirm('Bạn có chắc chắn muốn ngắt kết nối và xóa thiết bị IoT này?')) return;
    try {
      await api(`/iot/devices/${id}`, { method: 'DELETE' });
      notify('Đã xóa thiết bị thành công.');
      void loadIotDevices();
    } catch (err) {
      notify('Lỗi khi xóa: ' + (err.message || 'Thất bại'), true);
    }
  }

  async function executeIotAction(id, action) {
    try {
      const res = await api(`/iot/devices/${id}/action`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      notify(res.message || 'Đã thực thi lệnh thành công!');
      void loadIotDevices();
    } catch (err) {
      notify('Lỗi lệnh IoT: ' + (err.message || 'Thất bại'), true);
    }
  }

  window.openEditIotDevice = openEditIotDevice;
  window.deleteIotDevice = deleteIotDevice;
  window.executeIotAction = executeIotAction;

  // Event listeners cho Quản lý Đối tác & Tài trợ Sách
  $('openCreatePartnerBtn')?.addEventListener('click', openCreatePartnerDialog);
  $('openCreateDonationBtn')?.addEventListener('click', () => openCreateDonationDialog());
  $('refreshPartnersBtn')?.addEventListener('click', () => void loadPartners());
  $('partnerSearchInput')?.addEventListener('input', () => void loadPartners());
  $('partnerTypeFilter')?.addEventListener('change', () => void loadPartners());
  $('donationSearchInput')?.addEventListener('input', renderDonationsTable);
  $('donationTypeFilter')?.addEventListener('change', renderDonationsTable);
  $('partnerForm')?.addEventListener('submit', handleSavePartner);
  $('donationForm')?.addEventListener('submit', handleSaveDonation);

  $('partnerTabPartnersBtn')?.addEventListener('click', () => {
    $('partnersView').hidden = false;
    $('donationsView').hidden = true;
    $('partnerTabPartnersBtn').className = 'button button-primary';
    $('partnerTabDonationsBtn').className = 'button button-light';
  });

  $('partnerTabDonationsBtn')?.addEventListener('click', () => {
    $('partnersView').hidden = true;
    $('donationsView').hidden = false;
    $('partnerTabPartnersBtn').className = 'button button-light';
    $('partnerTabDonationsBtn').className = 'button button-primary';
    renderDonationsTable();
  });

  // Event listeners cho Giám sát Thiết bị IoT & Cảm biến
  $('openCreateIotBtn')?.addEventListener('click', openCreateIotDialog);
  $('refreshIotBtn')?.addEventListener('click', () => void loadIotDevices());
  $('iotSearchInput')?.addEventListener('input', () => void loadIotDevices());
  $('iotTypeFilter')?.addEventListener('change', () => void loadIotDevices());
  $('iotStatusFilter')?.addEventListener('change', () => void loadIotDevices());
  $('iotAlertFilter')?.addEventListener('change', () => void loadIotDevices());
  $('simIotAlertBtn')?.addEventListener('click', () => void simulateIotAlert());
  $('iotDeviceForm')?.addEventListener('submit', handleSaveIotDevice);

  /* ========================================================= */
  /* MODULE 6: TÀI NGUYÊN HỌC THUẬT & LUẬN VĂN (/admin/theses) */
  /* ========================================================= */
  let thesesData = [];

  async function loadTheses() {
    try {
      const search = $('thesesSearchInput')?.value.trim() || '';
      const major = $('thesesMajorFilter')?.value || '';
      const securityStatus = $('thesesSecurityFilter')?.value || '';
      const query = new URLSearchParams();
      if (search) query.append('search', search);
      if (major) query.append('major', major);
      if (securityStatus) query.append('securityStatus', securityStatus);

      const [list, stats] = await Promise.all([
        api(`/theses?${query.toString()}`),
        api('/theses/stats').catch(() => null),
      ]);

      thesesData = Array.isArray(list) ? list : [];
      if (stats) {
        if ($('statTotalTheses')) $('statTotalTheses').textContent = stats.totalTheses ?? thesesData.length;
        if ($('statPublicTheses')) $('statPublicTheses').textContent = stats.publicTheses ?? 0;
        if ($('statRestrictedTheses')) $('statRestrictedTheses').textContent = stats.restrictedTheses ?? 0;
        if ($('statThesesViews')) $('statThesesViews').textContent = stats.totalViews ?? 0;
      }

      renderThesesTable();
    } catch (err) {
      console.error(err);
      if ($('thesesTableBody')) {
        $('thesesTableBody').innerHTML = `<tr><td colspan="9" style="text-align:center;padding:2rem;color:#ef4444;">Lỗi khi tải luận văn: ${escapeHtml(err.message)}</td></tr>`;
      }
    }
  }

  function renderThesesTable() {
    const tbody = $('thesesTableBody');
    if (!tbody) return;
    if (!thesesData.length) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:2rem;color:#888;">Chưa có đề tài luận văn nào phù hợp.</td></tr>`;
      return;
    }

    const secBadges = {
      PUBLIC: '<span style="background:#dcfce7;color:#166534;padding:3px 8px;border-radius:999px;font-size:11.5px;font-weight:600;">🌐 Công khai</span>',
      INTERNAL: '<span style="background:#e0e7ff;color:#3730a3;padding:3px 8px;border-radius:999px;font-size:11.5px;font-weight:600;">🏫 Nội bộ</span>',
      RESTRICTED: '<span style="background:#fee2e2;color:#991b1b;padding:3px 8px;border-radius:999px;font-size:11.5px;font-weight:600;">🔒 Hạn chế</span>',
    };

    tbody.innerHTML = thesesData.map((t) => `
      <tr>
        <td style="font-weight:600;color:#0f172a;">${escapeHtml(t.code)}</td>
        <td>
          <div style="font-weight:600;color:#1e293b;">${escapeHtml(t.title)}</div>
          ${t.abstract ? `<div style="font-size:12px;color:#64748b;margin-top:2px;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;" title="${escapeHtml(t.abstract)}">${escapeHtml(t.abstract)}</div>` : ''}
        </td>
        <td>
          <div>${escapeHtml(t.authorName)}</div>
          <div style="font-size:12px;color:#64748b;">MSSV: ${escapeHtml(t.studentId)}</div>
        </td>
        <td style="font-size:13px;color:#334155;">${escapeHtml(t.advisorName)}</td>
        <td style="font-size:13px;">
          <div>${escapeHtml(t.major)}</div>
        </td>
        <td style="text-align:center;font-weight:600;color:#475569;">${t.defenseYear}</td>
        <td style="text-align:center;">${secBadges[t.securityStatus] || escapeHtml(t.securityStatus)}</td>
        <td style="text-align:center;font-weight:600;color:#2563eb;">${t.viewsCount || 0}</td>
        <td style="text-align:center;">
          <div style="display:flex;gap:6px;justify-content:center;">
            ${t.fileUrl ? `<a href="${escapeHtml(t.fileUrl)}" target="_blank" class="button button-small button-light" style="font-size:11.5px;padding:3px 8px;" title="Tải / Đọc tệp PDF">📄 PDF</a>` : ''}
            <button class="button button-small button-light" onclick="openEditThesis(${t.id})" style="font-size:11.5px;padding:3px 8px;" title="Chỉnh sửa">✏️</button>
            <button class="button button-small button-light" onclick="deleteThesis(${t.id})" style="font-size:11.5px;padding:3px 8px;color:#ef4444;" title="Xóa đề tài">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function openCreateThesisDialog() {
    $('thesisForm')?.reset();
    if ($('thesisFormId')) $('thesisFormId').value = '';
    if ($('thesisDialogTitle')) $('thesisDialogTitle').textContent = 'Đăng ký Luận văn & Khóa luận Tốt nghiệp';
    $('thesisDialog')?.showModal();
  }

  function openEditThesis(id) {
    const t = thesesData.find((x) => x.id === id);
    if (!t) return;
    if ($('thesisFormId')) $('thesisFormId').value = t.id;
    if ($('thesisFormCode')) $('thesisFormCode').value = t.code || '';
    if ($('thesisFormTitle')) $('thesisFormTitle').value = t.title || '';
    if ($('thesisFormAuthor')) $('thesisFormAuthor').value = t.authorName || '';
    if ($('thesisFormStudentId')) $('thesisFormStudentId').value = t.studentId || '';
    if ($('thesisFormAdvisor')) $('thesisFormAdvisor').value = t.advisorName || '';
    if ($('thesisFormDefenseYear')) $('thesisFormDefenseYear').value = t.defenseYear || 2026;
    if ($('thesisFormMajor')) $('thesisFormMajor').value = t.major || 'Công nghệ thông tin';
    if ($('thesisFormSecurity')) $('thesisFormSecurity').value = t.securityStatus || 'PUBLIC';
    if ($('thesisFormAbstract')) $('thesisFormAbstract').value = t.abstract || '';
    if ($('thesisFormFileUrl')) $('thesisFormFileUrl').value = t.fileUrl || '';
    if ($('thesisDialogTitle')) $('thesisDialogTitle').textContent = 'Chỉnh sửa thông tin Luận văn';
    $('thesisDialog')?.showModal();
  }

  async function handleSaveThesis(e) {
    e.preventDefault();
    try {
      const id = $('thesisFormId')?.value;
      const payload = {
        code: $('thesisFormCode')?.value.trim(),
        title: $('thesisFormTitle')?.value.trim(),
        authorName: $('thesisFormAuthor')?.value.trim(),
        studentId: $('thesisFormStudentId')?.value.trim(),
        advisorName: $('thesisFormAdvisor')?.value.trim(),
        defenseYear: Number($('thesisFormDefenseYear')?.value) || 2026,
        major: $('thesisFormMajor')?.value,
        securityStatus: $('thesisFormSecurity')?.value,
        abstract: $('thesisFormAbstract')?.value.trim() || undefined,
        fileUrl: $('thesisFormFileUrl')?.value.trim() || undefined,
      };

      if (!payload.code || !payload.title || !payload.authorName || !payload.studentId || !payload.advisorName) {
        notify('Vui lòng điền đầy đủ các thông tin bắt buộc (*).', true);
        return;
      }

      if (id) {
        await api(`/theses/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
        notify('Cập nhật thông tin luận văn thành công!');
      } else {
        await api('/theses', { method: 'POST', body: JSON.stringify(payload) });
        notify('Đã đăng ký luận văn mới thành công!');
      }

      $('thesisDialog')?.close();
      void loadTheses();
    } catch (err) {
      console.error(err);
      notify('Lỗi khi lưu luận văn: ' + (err.message || 'Thất bại'), true);
    }
  }

  async function deleteThesis(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa đề tài luận văn này khỏi kho lưu trữ?')) return;
    try {
      await api(`/theses/${id}`, { method: 'DELETE' });
      notify('Đã xóa luận văn thành công.');
      void loadTheses();
    } catch (err) {
      console.error(err);
      notify('Lỗi khi xóa luận văn: ' + (err.message || 'Thất bại'), true);
    }
  }

  /* ========================================================= */
  /* MODULE 7: TÀI LIỆU ĐA PHƯƠNG TIỆN (/admin/multimedia)    */
  /* ========================================================= */
  let multimediaData = [];

  async function loadMultimedia() {
    try {
      const search = $('multimediaSearchInput')?.value.trim() || '';
      const type = $('multimediaTypeFilter')?.value || '';
      const condition = $('multimediaConditionFilter')?.value || '';
      const query = new URLSearchParams();
      if (search) query.append('search', search);
      if (type) query.append('type', type);
      if (condition) query.append('condition', condition);

      const [list, stats] = await Promise.all([
        api(`/multimedia?${query.toString()}`),
        api('/multimedia/stats').catch(() => null),
      ]);

      multimediaData = Array.isArray(list) ? list : [];
      if (stats) {
        if ($('statTotalMultimedia')) $('statTotalMultimedia').textContent = stats.totalItems ?? multimediaData.length;
        if ($('statGoodMultimedia')) $('statGoodMultimedia').textContent = stats.goodCondition ?? 0;
        if ($('statNeedDigitizeMultimedia')) $('statNeedDigitizeMultimedia').textContent = stats.needDigitization ?? 0;
        if ($('statOnSiteLoans')) $('statOnSiteLoans').textContent = stats.totalOnSiteLoans ?? 0;
      }

      renderMultimediaTable();
    } catch (err) {
      console.error(err);
      if ($('multimediaTableBody')) {
        $('multimediaTableBody').innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem;color:#ef4444;">Lỗi khi tải tư liệu đa phương tiện: ${escapeHtml(err.message)}</td></tr>`;
      }
    }
  }

  function renderMultimediaTable() {
    const tbody = $('multimediaTableBody');
    if (!tbody) return;
    if (!multimediaData.length) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem;color:#888;">Chưa có tài liệu đa phương tiện nào.</td></tr>`;
      return;
    }

    const typeIcons = {
      CD_DVD: '💿 Đĩa CD / DVD',
      CASSETTE: '📼 Băng Cassette',
      HISTORIC_MAP: '🗺️ Bản đồ lịch sử',
      PHOTO_ARCHIVE: '📷 Ảnh tư liệu',
      MICROFILM: '🎞️ Microfilm',
    };

    const condBadges = {
      GOOD: '<span style="background:#dcfce7;color:#166534;padding:3px 8px;border-radius:999px;font-size:11.5px;font-weight:600;">✓ Tốt</span>',
      NEED_DIGITIZATION: '<span style="background:#fef3c7;color:#92400e;padding:3px 8px;border-radius:999px;font-size:11.5px;font-weight:600;">⚠️ Cần số hóa</span>',
      DAMAGED: '<span style="background:#fee2e2;color:#991b1b;padding:3px 8px;border-radius:999px;font-size:11.5px;font-weight:600;">❌ Hư hỏng</span>',
    };

    tbody.innerHTML = multimediaData.map((m) => `
      <tr>
        <td style="font-weight:600;color:#0f172a;">${escapeHtml(m.code)}</td>
        <td>
          <div style="font-weight:600;color:#1e293b;">${escapeHtml(m.title)}</div>
          ${m.description ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">${escapeHtml(m.description)}</div>` : ''}
        </td>
        <td>${typeIcons[m.type] || escapeHtml(m.type)}</td>
        <td style="font-size:13px;color:#475569;">${escapeHtml(m.storageLocation)}</td>
        <td style="text-align:center;">${condBadges[m.condition] || escapeHtml(m.condition)}</td>
        <td style="text-align:center;font-weight:600;color:${m.availableQuantity > 0 ? '#10b981' : '#ef4444'};">${m.availableQuantity} / ${m.totalQuantity}</td>
        <td style="text-align:center;font-weight:600;color:#7c3aed;">${m.onSiteLoanCount || 0}</td>
        <td style="text-align:center;">
          <div style="display:flex;gap:6px;justify-content:center;">
            <button class="button button-small button-primary" onclick="openRecordMultimediaLoanDialog(${m.id})" style="font-size:11.5px;padding:3px 8px;" ${m.availableQuantity <= 0 ? 'disabled' : ''} title="Ghi nhận mượn đọc tại chỗ">📖 Mượn</button>
            <button class="button button-small button-light" onclick="openEditMultimedia(${m.id})" style="font-size:11.5px;padding:3px 8px;" title="Chỉnh sửa">✏️</button>
            <button class="button button-small button-light" onclick="deleteMultimedia(${m.id})" style="font-size:11.5px;padding:3px 8px;color:#ef4444;" title="Xóa tư liệu">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function openCreateMultimediaDialog() {
    $('multimediaForm')?.reset();
    if ($('multimediaFormId')) $('multimediaFormId').value = '';
    if ($('multimediaDialogTitle')) $('multimediaDialogTitle').textContent = 'Nhập Tư liệu Đa phương tiện & Đặc biệt';
    $('multimediaDialog')?.showModal();
  }

  function openEditMultimedia(id) {
    const m = multimediaData.find((x) => x.id === id);
    if (!m) return;
    if ($('multimediaFormId')) $('multimediaFormId').value = m.id;
    if ($('multimediaFormCode')) $('multimediaFormCode').value = m.code || '';
    if ($('multimediaFormTitle')) $('multimediaFormTitle').value = m.title || '';
    if ($('multimediaFormType')) $('multimediaFormType').value = m.type || 'CD_DVD';
    if ($('multimediaFormCondition')) $('multimediaFormCondition').value = m.condition || 'GOOD';
    if ($('multimediaFormLocation')) $('multimediaFormLocation').value = m.storageLocation || '';
    if ($('multimediaFormQty')) $('multimediaFormQty').value = m.totalQuantity || 1;
    if ($('multimediaFormAvail')) $('multimediaFormAvail').value = m.availableQuantity || 1;
    if ($('multimediaFormDesc')) $('multimediaFormDesc').value = m.description || '';
    if ($('multimediaDialogTitle')) $('multimediaDialogTitle').textContent = 'Chỉnh sửa Tư liệu Đa phương tiện';
    $('multimediaDialog')?.showModal();
  }

  async function handleSaveMultimedia(e) {
    e.preventDefault();
    try {
      const id = $('multimediaFormId')?.value;
      const payload = {
        code: $('multimediaFormCode')?.value.trim(),
        title: $('multimediaFormTitle')?.value.trim(),
        type: $('multimediaFormType')?.value,
        condition: $('multimediaFormCondition')?.value,
        storageLocation: $('multimediaFormLocation')?.value.trim(),
        totalQuantity: Number($('multimediaFormQty')?.value) || 1,
        availableQuantity: Number($('multimediaFormAvail')?.value) || 1,
        description: $('multimediaFormDesc')?.value.trim() || undefined,
      };

      if (!payload.code || !payload.title || !payload.storageLocation) {
        notify('Vui lòng điền đầy đủ mã, tiêu đề và vị trí lưu trữ.', true);
        return;
      }

      if (id) {
        await api(`/multimedia/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
        notify('Cập nhật thông tin tư liệu thành công!');
      } else {
        await api('/multimedia', { method: 'POST', body: JSON.stringify(payload) });
        notify('Đã thêm tài liệu đa phương tiện mới thành công!');
      }

      $('multimediaDialog')?.close();
      void loadMultimedia();
    } catch (err) {
      console.error(err);
      notify('Lỗi khi lưu tư liệu: ' + (err.message || 'Thất bại'), true);
    }
  }

  function openRecordMultimediaLoanDialog(id) {
    const m = multimediaData.find((x) => x.id === id);
    if (!m) return;
    if ($('loanMultimediaId')) $('loanMultimediaId').value = m.id;
    if ($('loanMultimediaText')) $('loanMultimediaText').innerHTML = `Đang thao tác mượn tư liệu: <b>${escapeHtml(m.title)}</b> (${escapeHtml(m.code)}) - Khả dụng: <b>${m.availableQuantity}</b> bản`;
    if ($('loanMultimediaReader')) $('loanMultimediaReader').value = '';
    if ($('loanMultimediaNote')) $('loanMultimediaNote').value = '';
    $('recordMultimediaLoanDialog')?.showModal();
  }

  async function handleRecordMultimediaLoan(e) {
    e.preventDefault();
    try {
      const id = $('loanMultimediaId')?.value;
      const reader = $('loanMultimediaReader')?.value.trim();
      const note = $('loanMultimediaNote')?.value.trim();
      if (!reader) {
        notify('Vui lòng nhập tên hoặc MSSV của bạn đọc.', true);
        return;
      }

      await api(`/multimedia/${id}/on-site-loan`, { method: 'POST' });
      notify(`Đã ghi nhận bạn đọc "${reader}" mượn xem tư liệu tại chỗ thành công!`);
      $('recordMultimediaLoanDialog')?.close();
      void loadMultimedia();
    } catch (err) {
      console.error(err);
      notify('Lỗi khi ghi nhận mượn: ' + (err.message || 'Thất bại'), true);
    }
  }

  async function deleteMultimedia(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa tài liệu đa phương tiện này khỏi danh mục?')) return;
    try {
      await api(`/multimedia/${id}`, { method: 'DELETE' });
      notify('Đã xóa tư liệu thành công.');
      void loadMultimedia();
    } catch (err) {
      console.error(err);
      notify('Lỗi khi xóa tư liệu: ' + (err.message || 'Thất bại'), true);
    }
  }

  /* ========================================================= */
  /* MODULE 8: HỘI THẢO & DIỄN ĐÀN KHOA HỌC (/admin/seminars)   */
  /* ========================================================= */
  let seminarsData = [];

  async function loadSeminars() {
    try {
      const search = $('seminarSearchInput')?.value.trim() || '';
      const status = $('seminarStatusFilter')?.value || '';
      const query = new URLSearchParams();
      if (search) query.append('search', search);
      if (status) query.append('status', status);

      const [list, stats] = await Promise.all([
        api(`/seminars?${query.toString()}`),
        api('/seminars/stats').catch(() => null),
      ]);

      seminarsData = Array.isArray(list) ? list : [];
      if (stats) {
        if ($('statTotalSeminars')) $('statTotalSeminars').textContent = stats.totalSeminars ?? seminarsData.length;
        if ($('statUpcomingSeminars')) $('statUpcomingSeminars').textContent = stats.upcomingSeminars ?? 0;
        if ($('statRegisteredSeats')) $('statRegisteredSeats').textContent = stats.totalRegisteredSeats ?? 0;
        if ($('statAttendanceRate')) $('statAttendanceRate').textContent = (stats.averageAttendanceRate || 0) + '%';
      }

      renderSeminarsTable();
    } catch (err) {
      console.error(err);
      if ($('seminarsTableBody')) {
        $('seminarsTableBody').innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:#ef4444;">Lỗi khi tải lịch hội thảo: ${escapeHtml(err.message)}</td></tr>`;
      }
    }
  }

  function renderSeminarsTable() {
    const tbody = $('seminarsTableBody');
    if (!tbody) return;
    if (!seminarsData.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:#888;">Chưa có hội thảo hoặc diễn đàn khoa học nào.</td></tr>`;
      return;
    }

    const statusBadges = {
      UPCOMING: '<span style="background:#e0f2fe;color:#0369a1;padding:3px 8px;border-radius:999px;font-size:11.5px;font-weight:600;">📅 Sắp diễn ra</span>',
      HAPPENING: '<span style="background:#dcfce7;color:#15803d;padding:3px 8px;border-radius:999px;font-size:11.5px;font-weight:600;">⚡ Đang diễn ra</span>',
      ENDED: '<span style="background:#f1f5f9;color:#475569;padding:3px 8px;border-radius:999px;font-size:11.5px;font-weight:600;">✓ Đã kết thúc</span>',
      CANCELLED: '<span style="background:#fee2e2;color:#991b1b;padding:3px 8px;border-radius:999px;font-size:11.5px;font-weight:600;">❌ Đã hủy</span>',
    };

    tbody.innerHTML = seminarsData.map((s) => `
      <tr>
        <td>
          <div style="font-weight:600;color:#1e293b;">${escapeHtml(s.title)}</div>
          ${s.description ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">${escapeHtml(s.description)}</div>` : ''}
        </td>
        <td style="font-size:13px;color:#334155;">${escapeHtml(s.theme)}</td>
        <td style="font-size:13px;font-weight:500;color:#0f172a;">${escapeHtml(s.speakerNames)}</td>
        <td style="font-size:12.5px;">
          <div>🕒 ${formatDateTime(s.eventDate)}</div>
          <div style="color:#64748b;margin-top:2px;">📍 ${escapeHtml(s.location)} (${s.durationMinutes}p)</div>
        </td>
        <td style="text-align:center;font-weight:600;color:#0284c7;">
          ${s.registeredSeats} / ${s.maxSeats}
        </td>
        <td style="text-align:center;">${statusBadges[s.status] || escapeHtml(s.status)}</td>
        <td style="text-align:center;">
          <div style="display:flex;gap:6px;justify-content:center;">
            <button class="button button-small button-primary" onclick="openSeminarAttendanceDialog(${s.id})" style="font-size:11.5px;padding:3px 8px;" title="Danh sách người tham dự & Check-in">👥 Điểm danh</button>
            <button class="button button-small button-light" onclick="openEditSeminar(${s.id})" style="font-size:11.5px;padding:3px 8px;" title="Chỉnh sửa">✏️</button>
            <button class="button button-small button-light" onclick="deleteSeminar(${s.id})" style="font-size:11.5px;padding:3px 8px;color:#ef4444;" title="Xóa sự kiện">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function openCreateSeminarDialog() {
    $('seminarForm')?.reset();
    if ($('seminarFormId')) $('seminarFormId').value = '';
    if ($('seminarDialogTitle')) $('seminarDialogTitle').textContent = 'Lên Lịch Hội thảo & Diễn đàn Khoa học';
    $('seminarDialog')?.showModal();
  }

  function openEditSeminar(id) {
    const s = seminarsData.find((x) => x.id === id);
    if (!s) return;
    if ($('seminarFormId')) $('seminarFormId').value = s.id;
    if ($('seminarFormTitle')) $('seminarFormTitle').value = s.title || '';
    if ($('seminarFormTheme')) $('seminarFormTheme').value = s.theme || '';
    if ($('seminarFormSpeakers')) $('seminarFormSpeakers').value = s.speakerNames || '';
    if ($('seminarFormDate')) {
      const d = new Date(s.eventDate);
      $('seminarFormDate').value = !isNaN(d.getTime()) ? d.toISOString().slice(0, 16) : '';
    }
    if ($('seminarFormLocation')) $('seminarFormLocation').value = s.location || '';
    if ($('seminarFormDuration')) $('seminarFormDuration').value = s.durationMinutes || 120;
    if ($('seminarFormMaxSeats')) $('seminarFormMaxSeats').value = s.maxSeats || 80;
    if ($('seminarFormStatus')) $('seminarFormStatus').value = s.status || 'UPCOMING';
    if ($('seminarFormDesc')) $('seminarFormDesc').value = s.description || '';
    if ($('seminarDialogTitle')) $('seminarDialogTitle').textContent = 'Chỉnh sửa thông tin Hội thảo';
    $('seminarDialog')?.showModal();
  }

  async function handleSaveSeminar(e) {
    e.preventDefault();
    try {
      const id = $('seminarFormId')?.value;
      const payload = {
        title: $('seminarFormTitle')?.value.trim(),
        theme: $('seminarFormTheme')?.value.trim(),
        speakerNames: $('seminarFormSpeakers')?.value.trim(),
        eventDate: new Date($('seminarFormDate')?.value).toISOString(),
        location: $('seminarFormLocation')?.value.trim(),
        durationMinutes: Number($('seminarFormDuration')?.value) || 120,
        maxSeats: Number($('seminarFormMaxSeats')?.value) || 80,
        status: $('seminarFormStatus')?.value,
        description: $('seminarFormDesc')?.value.trim() || undefined,
      };

      if (!payload.title || !payload.theme || !payload.speakerNames || !payload.location) {
        notify('Vui lòng điền đầy đủ tiêu đề, chủ đề, diễn giả và địa điểm.', true);
        return;
      }

      if (id) {
        await api(`/seminars/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
        notify('Cập nhật thông tin hội thảo thành công!');
      } else {
        await api('/seminars', { method: 'POST', body: JSON.stringify(payload) });
        notify('Đã thêm lịch hội thảo mới thành công!');
      }

      $('seminarDialog')?.close();
      void loadSeminars();
    } catch (err) {
      console.error(err);
      notify('Lỗi khi lưu hội thảo: ' + (err.message || 'Thất bại'), true);
    }
  }

  async function deleteSeminar(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa sự kiện hội thảo này?')) return;
    try {
      await api(`/seminars/${id}`, { method: 'DELETE' });
      notify('Đã xóa hội thảo thành công.');
      void loadSeminars();
    } catch (err) {
      console.error(err);
      notify('Lỗi khi xóa hội thảo: ' + (err.message || 'Thất bại'), true);
    }
  }

  function openSeminarAttendanceDialog(id) {
    const s = seminarsData.find((x) => x.id === id);
    if (!s) return;
    if ($('attendanceSeminarId')) $('attendanceSeminarId').value = s.id;
    if ($('seminarAttendanceTitle')) $('seminarAttendanceTitle').innerHTML = `Danh sách Tham dự: <b>${escapeHtml(s.title)}</b> (${s.registeredSeats}/${s.maxSeats} chỗ)`;
    renderAttendeesTable(s);
    $('seminarAttendanceDialog')?.showModal();
  }

  function renderAttendeesTable(seminar) {
    const tbody = $('attendeesTableBody');
    if (!tbody) return;
    const attendees = seminar.attendees || [];
    if (!attendees.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:#888;">Chưa có độc giả nào đăng ký tham dự.</td></tr>`;
      return;
    }

    tbody.innerHTML = attendees.map((a) => `
      <tr>
        <td style="font-weight:600;color:#1e293b;">${escapeHtml(a.fullName)}</td>
        <td style="color:#475569;">${escapeHtml(a.studentCode || '—')}</td>
        <td style="font-size:12.5px;color:#64748b;">${escapeHtml(a.email || '—')}</td>
        <td style="font-size:12px;">${formatDateTime(a.registeredAt)}</td>
        <td style="text-align:center;">
          ${a.checkedIn ? '<span style="background:#dcfce7;color:#166534;padding:2px 7px;border-radius:999px;font-size:11px;font-weight:600;">✓ Đã Điểm Danh</span>' : '<span style="background:#f1f5f9;color:#64748b;padding:2px 7px;border-radius:999px;font-size:11px;">Chưa</span>'}
        </td>
        <td style="text-align:center;">
          ${!a.checkedIn ? `<button class="button button-small button-primary" onclick="checkInSeminarAttendee(${seminar.id}, '${a.id}')" style="font-size:11px;padding:2px 7px;">Check-in</button>` : '—'}
        </td>
      </tr>
    `).join('');
  }

  async function handleRegisterAttendee(e) {
    e.preventDefault();
    try {
      const seminarId = $('attendanceSeminarId')?.value;
      const fullName = $('attendeeNameInput')?.value.trim();
      const studentCode = $('attendeeCodeInput')?.value.trim();
      const email = $('attendeeEmailInput')?.value.trim() || undefined;

      if (!fullName || !studentCode) {
        notify('Vui lòng nhập họ tên và mã sinh viên.', true);
        return;
      }

      await api(`/seminars/${seminarId}/register`, {
        method: 'POST',
        body: JSON.stringify({ fullName, studentCode, email }),
      });

      notify(`Đã đăng ký tham dự cho ${fullName} thành công!`);
      $('attendeeNameInput').value = '';
      $('attendeeCodeInput').value = '';
      if ($('attendeeEmailInput')) $('attendeeEmailInput').value = '';

      const updated = await api(`/seminars/${seminarId}`);
      const idx = seminarsData.findIndex((s) => s.id === Number(seminarId));
      if (idx !== -1) seminarsData[idx] = updated;
      renderAttendeesTable(updated);
      void loadSeminars();
    } catch (err) {
      console.error(err);
      notify('Lỗi đăng ký tham dự: ' + (err.message || 'Thất bại'), true);
    }
  }

  async function checkInSeminarAttendee(seminarId, attendeeId) {
    try {
      const updated = await api(`/seminars/${seminarId}/check-in`, {
        method: 'PATCH',
        body: JSON.stringify({ attendeeId }),
      });
      notify('Đã điểm danh người tham dự thành công!');
      const idx = seminarsData.findIndex((s) => s.id === Number(seminarId));
      if (idx !== -1) seminarsData[idx] = updated;
      renderAttendeesTable(updated);
      void loadSeminars();
    } catch (err) {
      console.error(err);
      notify('Lỗi khi check-in: ' + (err.message || 'Thất bại'), true);
    }
  }

  /* ========================================================= */
  /* MODULE 9: SÁCH TRAO ĐỔI & HỌC BỔNG (/admin/exchange-grants) */
  /* ========================================================= */
  let exchangeGrantsData = [];

  async function loadExchangeGrants() {
    try {
      const search = $('exchangeGrantSearchInput')?.value.trim() || '';
      const programType = $('exchangeGrantTypeFilter')?.value || '';
      const query = new URLSearchParams();
      if (search) query.append('search', search);
      if (programType) query.append('programType', programType);

      const [list, stats] = await Promise.all([
        api(`/exchange-grants?${query.toString()}`),
        api('/exchange-grants/stats').catch(() => null),
      ]);

      exchangeGrantsData = Array.isArray(list) ? list : [];
      if (stats) {
        if ($('statTotalPrograms')) $('statTotalPrograms').textContent = stats.totalPrograms ?? exchangeGrantsData.length;
        if ($('statTotalExchangedBooks')) $('statTotalExchangedBooks').textContent = (stats.totalBooksExchanged || 0) + ' cuốn';
        if ($('statTotalGrantBudget')) $('statTotalGrantBudget').textContent = money(stats.totalGrantAmount || 0);
        if ($('statTotalBeneficiaries')) $('statTotalBeneficiaries').textContent = (stats.totalBeneficiaries || 0) + ' bạn';
      }

      renderExchangeGrantsTable();
    } catch (err) {
      console.error(err);
      if ($('exchangeGrantsTableBody')) {
        $('exchangeGrantsTableBody').innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem;color:#ef4444;">Lỗi khi tải chương trình trao đổi: ${escapeHtml(err.message)}</td></tr>`;
      }
    }
  }

  function renderExchangeGrantsTable() {
    const tbody = $('exchangeGrantsTableBody');
    if (!tbody) return;
    if (!exchangeGrantsData.length) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem;color:#888;">Chưa có chương trình trao đổi sách hoặc học bổng nào.</td></tr>`;
      return;
    }

    const typeBadges = {
      BOOK_EXCHANGE: '<span style="background:#e0f2fe;color:#0369a1;padding:3px 8px;border-radius:999px;font-size:11.5px;font-weight:600;">📚 Trao đổi sách</span>',
      READING_GRANT: '<span style="background:#fef3c7;color:#92400e;padding:3px 8px;border-radius:999px;font-size:11.5px;font-weight:600;">🎁 Quỹ học bổng</span>',
    };

    tbody.innerHTML = exchangeGrantsData.map((g) => `
      <tr>
        <td>${typeBadges[g.programType] || escapeHtml(g.programType)}</td>
        <td>
          <div style="font-weight:600;color:#1e293b;">${escapeHtml(g.title)}</div>
          ${g.note ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">${escapeHtml(g.note)}</div>` : ''}
        </td>
        <td style="font-size:13px;font-weight:500;color:#0f172a;">${escapeHtml(g.partnerInstitution)}</td>
        <td style="font-size:13px;color:#475569;">${escapeHtml(g.country)}</td>
        <td style="text-align:right;font-weight:600;color:#0284c7;">
          ${g.programType === 'BOOK_EXCHANGE' ? `${g.bookQuantity} cuốn` : money(g.grantAmount)}
        </td>
        <td style="text-align:center;font-weight:600;color:#10b981;">${g.beneficiariesCount} bạn</td>
        <td style="font-size:12px;color:#475569;">
          <div>${g.startDate ? g.startDate.slice(0, 10) : ''}</div>
          ${g.endDate ? `<div style="color:#64748b;">đến ${g.endDate.slice(0, 10)}</div>` : ''}
        </td>
        <td style="text-align:center;">
          <div style="display:flex;gap:6px;justify-content:center;">
            <button class="button button-small button-light" onclick="openEditExchangeGrant(${g.id})" style="font-size:11.5px;padding:3px 8px;" title="Chỉnh sửa">✏️</button>
            <button class="button button-small button-light" onclick="deleteExchangeGrant(${g.id})" style="font-size:11.5px;padding:3px 8px;color:#ef4444;" title="Xóa">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function openCreateExchangeGrantDialog() {
    $('exchangeGrantForm')?.reset();
    if ($('exchangeGrantFormId')) $('exchangeGrantFormId').value = '';
    if ($('exchangeGrantDialogTitle')) $('exchangeGrantDialogTitle').textContent = 'Thêm Chương trình Trao đổi / Học bổng';
    $('exchangeGrantDialog')?.showModal();
  }

  function openEditExchangeGrant(id) {
    const g = exchangeGrantsData.find((x) => x.id === id);
    if (!g) return;
    if ($('exchangeGrantFormId')) $('exchangeGrantFormId').value = g.id;
    if ($('exchangeGrantFormType')) $('exchangeGrantFormType').value = g.programType || 'BOOK_EXCHANGE';
    if ($('exchangeGrantFormTitle')) $('exchangeGrantFormTitle').value = g.title || '';
    if ($('exchangeGrantFormPartner')) $('exchangeGrantFormPartner').value = g.partnerInstitution || '';
    if ($('exchangeGrantFormCountry')) $('exchangeGrantFormCountry').value = g.country || '';
    if ($('exchangeGrantFormBooks')) $('exchangeGrantFormBooks').value = g.bookQuantity || 0;
    if ($('exchangeGrantFormAmount')) $('exchangeGrantFormAmount').value = g.grantAmount || 0;
    if ($('exchangeGrantFormBeneficiaries')) $('exchangeGrantFormBeneficiaries').value = g.beneficiariesCount || 0;
    if ($('exchangeGrantFormStart')) $('exchangeGrantFormStart').value = g.startDate ? g.startDate.slice(0, 10) : '';
    if ($('exchangeGrantFormEnd')) $('exchangeGrantFormEnd').value = g.endDate ? g.endDate.slice(0, 10) : '';
    if ($('exchangeGrantFormNote')) $('exchangeGrantFormNote').value = g.note || '';
    if ($('exchangeGrantDialogTitle')) $('exchangeGrantDialogTitle').textContent = 'Chỉnh sửa Chương trình Hợp tác';
    $('exchangeGrantDialog')?.showModal();
  }

  async function handleSaveExchangeGrant(e) {
    e.preventDefault();
    try {
      const id = $('exchangeGrantFormId')?.value;
      const payload = {
        programType: $('exchangeGrantFormType')?.value,
        title: $('exchangeGrantFormTitle')?.value.trim(),
        partnerInstitution: $('exchangeGrantFormPartner')?.value.trim(),
        country: $('exchangeGrantFormCountry')?.value.trim(),
        bookQuantity: Number($('exchangeGrantFormBooks')?.value) || 0,
        grantAmount: Number($('exchangeGrantFormAmount')?.value) || 0,
        beneficiariesCount: Number($('exchangeGrantFormBeneficiaries')?.value) || 0,
        startDate: $('exchangeGrantFormStart')?.value ? new Date($('exchangeGrantFormStart')?.value).toISOString() : new Date().toISOString(),
        endDate: $('exchangeGrantFormEnd')?.value ? new Date($('exchangeGrantFormEnd')?.value).toISOString() : undefined,
        note: $('exchangeGrantFormNote')?.value.trim() || undefined,
      };

      if (!payload.title || !payload.partnerInstitution || !payload.country) {
        notify('Vui lòng điền tiêu đề chương trình, cơ quan đối tác và quốc gia.', true);
        return;
      }

      if (id) {
        await api(`/exchange-grants/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
        notify('Cập nhật chương trình trao đổi thành công!');
      } else {
        await api('/exchange-grants', { method: 'POST', body: JSON.stringify(payload) });
        notify('Đã thêm chương trình trao đổi / học bổng mới thành công!');
      }

      $('exchangeGrantDialog')?.close();
      void loadExchangeGrants();
    } catch (err) {
      console.error(err);
      notify('Lỗi khi lưu chương trình: ' + (err.message || 'Thất bại'), true);
    }
  }

  async function deleteExchangeGrant(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa chương trình trao đổi / tài trợ này?')) return;
    try {
      await api(`/exchange-grants/${id}`, { method: 'DELETE' });
      notify('Đã xóa chương trình thành công.');
      void loadExchangeGrants();
    } catch (err) {
      console.error(err);
      notify('Lỗi khi xóa chương trình: ' + (err.message || 'Thất bại'), true);
    }
  }

  /* ========================================================= */
  /* MODULE 10: LỊCH CA TRỰC THỦ THƯ (/admin/shift-schedules)   */
  /* ========================================================= */
  let shiftsData = [];

  async function loadShiftSchedules() {
    try {
      const shiftType = $('shiftTypeFilter')?.value || '';
      const zone = $('shiftZoneFilter')?.value || '';
      const query = new URLSearchParams();
      if (shiftType) query.append('shiftType', shiftType);
      if (zone) query.append('zone', zone);

      const [list, stats] = await Promise.all([
        api(`/shift-schedules?${query.toString()}`),
        api('/shift-schedules/stats').catch(() => null),
      ]);

      shiftsData = Array.isArray(list) ? list : [];
      if (stats) {
        if ($('statTotalShifts')) $('statTotalShifts').textContent = stats.totalShifts ?? shiftsData.length;
        if ($('statTodayShifts')) $('statTodayShifts').textContent = (stats.todayShifts || 0) + ' ca';
        if ($('statCompletedShifts')) $('statCompletedShifts').textContent = stats.completedShifts ?? 0;
        if ($('statSwappedShifts')) $('statSwappedShifts').textContent = stats.swappedShifts ?? 0;
      }

      renderShiftsTable();
    } catch (err) {
      console.error(err);
      if ($('shiftsTableBody')) {
        $('shiftsTableBody').innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:#ef4444;">Lỗi khi tải lịch ca trực: ${escapeHtml(err.message)}</td></tr>`;
      }
    }
  }

  function renderShiftsTable() {
    const tbody = $('shiftsTableBody');
    if (!tbody) return;
    if (!shiftsData.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:#888;">Chưa có ca trực nào được phân công.</td></tr>`;
      return;
    }

    const typeLabels = {
      MORNING: '☀️ Ca Sáng (07:30 - 11:30)',
      AFTERNOON: '⛅ Ca Chiều (13:00 - 17:00)',
      EVENING: '🌙 Ca Tối (17:00 - 21:00)',
    };

    const zoneLabels = {
      CIRCULATION: 'Quầy Lưu thông & Mượn trả',
      READING_ROOM: 'Phòng đọc & Tự học',
      STACKS: 'Kho sách mở & Nghiệp vụ',
      MULTIMEDIA: 'Phòng Đa phương tiện & IoT',
    };

    const statusBadges = {
      SCHEDULED: '<span style="background:#e0e7ff;color:#3730a3;padding:3px 8px;border-radius:999px;font-size:11.5px;font-weight:600;">📅 Đã lên lịch</span>',
      COMPLETED: '<span style="background:#dcfce7;color:#166534;padding:3px 8px;border-radius:999px;font-size:11.5px;font-weight:600;">✓ Hoàn thành</span>',
      SWAPPED: '<span style="background:#fae8ff;color:#86198f;padding:3px 8px;border-radius:999px;font-size:11.5px;font-weight:600;">🔄 Đã đổi ca</span>',
      ABSENT: '<span style="background:#fee2e2;color:#991b1b;padding:3px 8px;border-radius:999px;font-size:11.5px;font-weight:600;">❌ Vắng mặt</span>',
    };

    tbody.innerHTML = shiftsData.map((s) => `
      <tr>
        <td style="font-weight:600;color:#0f172a;">${s.shiftDate}</td>
        <td>${typeLabels[s.shiftType] || escapeHtml(s.shiftType)}</td>
        <td style="font-size:13px;color:#334155;">${zoneLabels[s.zone] || escapeHtml(s.zone)}</td>
        <td style="font-weight:600;color:#1e293b;">
          ${escapeHtml(s.staffName)}
          ${s.swapWithStaffName ? `<div style="font-size:12px;color:#86198f;font-weight:normal;">↳ Đổi cho: ${escapeHtml(s.swapWithStaffName)}</div>` : ''}
        </td>
        <td style="text-align:center;">${statusBadges[s.status] || escapeHtml(s.status)}</td>
        <td style="font-size:12.5px;color:#64748b;">
          ${s.swapReason ? `<div><i>Lý do đổi:</i> ${escapeHtml(s.swapReason)}</div>` : ''}
          ${s.note ? `<div>${escapeHtml(s.note)}</div>` : ''}
        </td>
        <td style="text-align:center;">
          <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;">
            ${s.status === 'SCHEDULED' ? `<button class="button button-small button-primary" onclick="checkInShift(${s.id})" style="font-size:11px;padding:2px 7px;" title="Điểm danh bắt đầu ca trực">✓ Check-in</button>` : ''}
            ${s.status === 'SCHEDULED' ? `<button class="button button-small button-light" onclick="openSwapShiftDialog(${s.id})" style="font-size:11px;padding:2px 7px;" title="Yêu cầu đổi ca trực">🔄 Đổi ca</button>` : ''}
            <button class="button button-small button-light" onclick="openEditShift(${s.id})" style="font-size:11px;padding:2px 7px;" title="Sửa">✏️</button>
            <button class="button button-small button-light" onclick="deleteShift(${s.id})" style="font-size:11px;padding:2px 7px;color:#ef4444;" title="Hủy ca">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function openCreateShiftDialog() {
    $('shiftForm')?.reset();
    if ($('shiftFormId')) $('shiftFormId').value = '';
    if ($('shiftFormDate')) $('shiftFormDate').value = new Date().toISOString().slice(0, 10);
    if ($('shiftDialogTitle')) $('shiftDialogTitle').textContent = 'Phân công Ca trực Thủ thư';
    $('shiftDialog')?.showModal();
  }

  function openEditShift(id) {
    const s = shiftsData.find((x) => x.id === id);
    if (!s) return;
    if ($('shiftFormId')) $('shiftFormId').value = s.id;
    if ($('shiftFormDate')) $('shiftFormDate').value = s.shiftDate || '';
    if ($('shiftFormType')) $('shiftFormType').value = s.shiftType || 'MORNING';
    if ($('shiftFormZone')) $('shiftFormZone').value = s.zone || 'CIRCULATION';
    if ($('shiftFormStaffName')) $('shiftFormStaffName').value = s.staffName || '';
    if ($('shiftFormNote')) $('shiftFormNote').value = s.note || '';
    if ($('shiftDialogTitle')) $('shiftDialogTitle').textContent = 'Chỉnh sửa Phân công Ca trực';
    $('shiftDialog')?.showModal();
  }

  async function handleSaveShift(e) {
    e.preventDefault();
    try {
      const id = $('shiftFormId')?.value;
      const payload = {
        shiftDate: $('shiftFormDate')?.value,
        shiftType: $('shiftFormType')?.value,
        zone: $('shiftFormZone')?.value,
        staffName: $('shiftFormStaffName')?.value.trim(),
        note: $('shiftFormNote')?.value.trim() || undefined,
      };

      if (!payload.shiftDate || !payload.staffName) {
        notify('Vui lòng chọn ngày trực và nhập tên thủ thư.', true);
        return;
      }

      if (id) {
        await api(`/shift-schedules/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
        notify('Cập nhật lịch ca trực thành công!');
      } else {
        await api('/shift-schedules', { method: 'POST', body: JSON.stringify(payload) });
        notify('Đã phân công ca trực mới thành công!');
      }

      $('shiftDialog')?.close();
      void loadShiftSchedules();
    } catch (err) {
      console.error(err);
      notify('Lỗi khi lưu ca trực: ' + (err.message || 'Thất bại'), true);
    }
  }

  async function checkInShift(id) {
    try {
      await api(`/shift-schedules/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      notify('Đã check-in điểm danh hoàn thành ca trực thành công!');
      void loadShiftSchedules();
    } catch (err) {
      console.error(err);
      notify('Lỗi check-in: ' + (err.message || 'Thất bại'), true);
    }
  }

  function openSwapShiftDialog(id) {
    const s = shiftsData.find((x) => x.id === id);
    if (!s) return;
    if ($('swapShiftId')) $('swapShiftId').value = s.id;
    if ($('swapShiftInfoText')) $('swapShiftInfoText').innerHTML = `Đổi ca trực ngày <b>${s.shiftDate}</b> (${s.shiftType}) của thủ thư <b>${escapeHtml(s.staffName)}</b>`;
    if ($('swapShiftWithStaff')) $('swapShiftWithStaff').value = '';
    if ($('swapShiftReason')) $('swapShiftReason').value = '';
    $('swapShiftDialog')?.showModal();
  }

  async function handleSwapShift(e) {
    e.preventDefault();
    try {
      const id = $('swapShiftId')?.value;
      const swapWithStaffName = $('swapShiftWithStaff')?.value.trim();
      const reason = $('swapShiftReason')?.value.trim();

      if (!swapWithStaffName || !reason) {
        notify('Vui lòng nhập tên thủ thư thay thế và lý do đổi ca.', true);
        return;
      }

      await api(`/shift-schedules/${id}/swap`, {
        method: 'PATCH',
        body: JSON.stringify({ swapWithStaffName, reason }),
      });

      notify('Đã điều chuyển / đổi ca trực thành công!');
      $('swapShiftDialog')?.close();
      void loadShiftSchedules();
    } catch (err) {
      console.error(err);
      notify('Lỗi đổi ca: ' + (err.message || 'Thất bại'), true);
    }
  }

  async function deleteShift(id) {
    if (!confirm('Bạn có chắc chắn muốn hủy / xóa phân công ca trực này?')) return;
    try {
      await api(`/shift-schedules/${id}`, { method: 'DELETE' });
      notify('Đã xóa ca trực thành công.');
      void loadShiftSchedules();
    } catch (err) {
      console.error(err);
      notify('Lỗi khi xóa ca trực: ' + (err.message || 'Thất bại'), true);
    }
  }

  /* ========================================================= */
  /* MODULE 11: ĐÁNH GIÁ KPI THỦ THƯ (/admin/staff-kpi)        */
  /* ========================================================= */
  let kpiData = [];

  async function loadStaffKpi() {
    try {
      const [list, stats] = await Promise.all([
        api('/staff-kpi'),
        api('/staff-kpi/stats').catch(() => null),
      ]);

      kpiData = Array.isArray(list) ? list : [];
      if (stats) {
        if ($('statAvgKpiScore')) $('statAvgKpiScore').textContent = `${stats.averageKpiScore || 0} / 100`;
        if ($('statExcellentStaffCount')) $('statExcellentStaffCount').textContent = stats.excellentStaffCount ?? 0;
        if ($('statTotalLoansHandled')) $('statTotalLoansHandled').textContent = stats.totalLoansHandled ?? 0;
        if ($('statAvgSatisfaction')) $('statAvgSatisfaction').textContent = `${stats.averageSatisfaction || 0} ★`;
      }

      renderKpiTable();
    } catch (err) {
      console.error(err);
      if ($('kpiTableBody')) {
        $('kpiTableBody').innerHTML = `<tr><td colspan="9" style="text-align:center;padding:2rem;color:#ef4444;">Lỗi khi tải bảng KPI thủ thư: ${escapeHtml(err.message)}</td></tr>`;
      }
    }
  }

  function renderKpiTable() {
    const tbody = $('kpiTableBody');
    if (!tbody) return;
    if (!kpiData.length) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:2rem;color:#888;">Chưa có dữ liệu đánh giá KPI thủ thư.</td></tr>`;
      return;
    }

    const gradeBadges = {
      EXCELLENT: '<span style="background:#fef3c7;color:#92400e;padding:3px 8px;border-radius:999px;font-size:11.5px;font-weight:600;">🌟 Xuất sắc (A)</span>',
      GOOD: '<span style="background:#dcfce7;color:#166534;padding:3px 8px;border-radius:999px;font-size:11.5px;font-weight:600;">✓ Tốt (B)</span>',
      AVERAGE: '<span style="background:#e0f2fe;color:#0369a1;padding:3px 8px;border-radius:999px;font-size:11.5px;font-weight:600;">⚠️ Đạt (C)</span>',
      POOR: '<span style="background:#fee2e2;color:#991b1b;padding:3px 8px;border-radius:999px;font-size:11.5px;font-weight:600;">❌ Cần cải thiện (D)</span>',
    };

    tbody.innerHTML = kpiData.map((k) => `
      <tr>
        <td>
          <div style="font-weight:600;color:#1e293b;">${escapeHtml(k.staffName)}</div>
          ${k.note ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">${escapeHtml(k.note)}</div>` : ''}
        </td>
        <td style="font-weight:500;color:#0f172a;">${k.periodMonth}/${k.periodYear}</td>
        <td style="text-align:center;font-weight:600;color:#3b82f6;">${k.catalogedCount}</td>
        <td style="text-align:center;font-weight:600;color:#10b981;">${k.loansHandledCount}</td>
        <td style="text-align:center;font-weight:600;color:#7c3aed;">${k.auditsCount}</td>
        <td style="text-align:center;font-weight:600;color:#f59e0b;">${k.readerSatisfactionScore} ★</td>
        <td style="text-align:center;font-weight:700;font-size:14px;color:#6366f1;">${k.overallScore} / 100</td>
        <td style="text-align:center;">${gradeBadges[k.kpiGrade] || escapeHtml(k.kpiGrade)}</td>
        <td style="text-align:center;">
          <div style="display:flex;gap:6px;justify-content:center;">
            <button class="button button-small button-light" onclick="openEditKpi(${k.id})" style="font-size:11.5px;padding:3px 8px;" title="Cập nhật">✏️</button>
            <button class="button button-small button-light" onclick="deleteKpi(${k.id})" style="font-size:11.5px;padding:3px 8px;color:#ef4444;" title="Xóa">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function openCreateKpiDialog() {
    $('kpiForm')?.reset();
    if ($('kpiFormId')) $('kpiFormId').value = '';
    if ($('kpiDialogTitle')) $('kpiDialogTitle').textContent = 'Thiết lập / Đánh giá KPI Thủ thư';
    $('kpiDialog')?.showModal();
  }

  function openEditKpi(id) {
    const k = kpiData.find((x) => x.id === id);
    if (!k) return;
    if ($('kpiFormId')) $('kpiFormId').value = k.id;
    if ($('kpiFormStaffName')) $('kpiFormStaffName').value = k.staffName || '';
    if ($('kpiFormMonth')) $('kpiFormMonth').value = k.periodMonth || 11;
    if ($('kpiFormYear')) $('kpiFormYear').value = k.periodYear || 2026;
    if ($('kpiFormCataloged')) $('kpiFormCataloged').value = k.catalogedCount || 0;
    if ($('kpiFormLoans')) $('kpiFormLoans').value = k.loansHandledCount || 0;
    if ($('kpiFormAudits')) $('kpiFormAudits').value = k.auditsCount || 0;
    if ($('kpiFormSatisfaction')) $('kpiFormSatisfaction').value = k.readerSatisfactionScore || 4.5;
    if ($('kpiFormNote')) $('kpiFormNote').value = k.note || '';
    if ($('kpiDialogTitle')) $('kpiDialogTitle').textContent = 'Cập nhật Đánh giá KPI Thủ thư';
    $('kpiDialog')?.showModal();
  }

  async function handleSaveKpi(e) {
    e.preventDefault();
    try {
      const payload = {
        staffName: $('kpiFormStaffName')?.value.trim(),
        periodMonth: Number($('kpiFormMonth')?.value) || 11,
        periodYear: Number($('kpiFormYear')?.value) || 2026,
        catalogedCount: Number($('kpiFormCataloged')?.value) || 0,
        loansHandledCount: Number($('kpiFormLoans')?.value) || 0,
        auditsCount: Number($('kpiFormAudits')?.value) || 0,
        readerSatisfactionScore: Number($('kpiFormSatisfaction')?.value) || 5.0,
        note: $('kpiFormNote')?.value.trim() || undefined,
      };

      if (!payload.staffName) {
        notify('Vui lòng nhập họ tên thủ thư.', true);
        return;
      }

      await api('/staff-kpi', { method: 'POST', body: JSON.stringify(payload) });
      notify('Thiết lập kết quả KPI thủ thư thành công!');
      $('kpiDialog')?.close();
      void loadStaffKpi();
    } catch (err) {
      console.error(err);
      notify('Lỗi khi lưu KPI: ' + (err.message || 'Thất bại'), true);
    }
  }

  async function deleteKpi(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa bản ghi đánh giá KPI này?')) return;
    try {
      await api(`/staff-kpi/${id}`, { method: 'DELETE' });
      notify('Đã xóa đánh giá KPI thành công.');
      void loadStaffKpi();
    } catch (err) {
      console.error(err);
      notify('Lỗi khi xóa KPI: ' + (err.message || 'Thất bại'), true);
    }
  }

  // Global exports for inline HTML onclick handlers
  window.loadTheses = loadTheses;
  window.openCreateThesisDialog = openCreateThesisDialog;
  window.openEditThesis = openEditThesis;
  window.deleteThesis = deleteThesis;

  window.loadMultimedia = loadMultimedia;
  window.openCreateMultimediaDialog = openCreateMultimediaDialog;
  window.openEditMultimedia = openEditMultimedia;
  window.openRecordMultimediaLoanDialog = openRecordMultimediaLoanDialog;
  window.deleteMultimedia = deleteMultimedia;

  window.loadSeminars = loadSeminars;
  window.openCreateSeminarDialog = openCreateSeminarDialog;
  window.openEditSeminar = openEditSeminar;
  window.deleteSeminar = deleteSeminar;
  window.openSeminarAttendanceDialog = openSeminarAttendanceDialog;
  window.checkInSeminarAttendee = checkInSeminarAttendee;

  window.loadExchangeGrants = loadExchangeGrants;
  window.openCreateExchangeGrantDialog = openCreateExchangeGrantDialog;
  window.openEditExchangeGrant = openEditExchangeGrant;
  window.deleteExchangeGrant = deleteExchangeGrant;

  window.loadShiftSchedules = loadShiftSchedules;
  window.openCreateShiftDialog = openCreateShiftDialog;
  window.openEditShift = openEditShift;
  window.checkInShift = checkInShift;
  window.openSwapShiftDialog = openSwapShiftDialog;
  window.deleteShift = deleteShift;

  window.loadStaffKpi = loadStaffKpi;
  window.openCreateKpiDialog = openCreateKpiDialog;
  window.openEditKpi = openEditKpi;
  window.deleteKpi = deleteKpi;

  // Event listeners cho 6 trang mới
  $('openCreateThesisBtn')?.addEventListener('click', openCreateThesisDialog);
  $('refreshThesesBtn')?.addEventListener('click', () => void loadTheses());
  $('thesesSearchInput')?.addEventListener('input', () => void loadTheses());
  $('thesesMajorFilter')?.addEventListener('change', () => void loadTheses());
  $('thesesSecurityFilter')?.addEventListener('change', () => void loadTheses());
  $('thesisForm')?.addEventListener('submit', handleSaveThesis);

  $('openCreateMultimediaBtn')?.addEventListener('click', openCreateMultimediaDialog);
  $('refreshMultimediaBtn')?.addEventListener('click', () => void loadMultimedia());
  $('multimediaSearchInput')?.addEventListener('input', () => void loadMultimedia());
  $('multimediaTypeFilter')?.addEventListener('change', () => void loadMultimedia());
  $('multimediaConditionFilter')?.addEventListener('change', () => void loadMultimedia());
  $('multimediaForm')?.addEventListener('submit', handleSaveMultimedia);
  $('recordMultimediaLoanForm')?.addEventListener('submit', handleRecordMultimediaLoan);

  $('openCreateSeminarBtn')?.addEventListener('click', openCreateSeminarDialog);
  $('refreshSeminarsBtn')?.addEventListener('click', () => void loadSeminars());
  $('seminarSearchInput')?.addEventListener('input', () => void loadSeminars());
  $('seminarStatusFilter')?.addEventListener('change', () => void loadSeminars());
  $('seminarForm')?.addEventListener('submit', handleSaveSeminar);
  $('registerAttendeeForm')?.addEventListener('submit', handleRegisterAttendee);

  $('openCreateExchangeGrantBtn')?.addEventListener('click', openCreateExchangeGrantDialog);
  $('refreshExchangeGrantsBtn')?.addEventListener('click', () => void loadExchangeGrants());
  $('exchangeGrantSearchInput')?.addEventListener('input', () => void loadExchangeGrants());
  $('exchangeGrantTypeFilter')?.addEventListener('change', () => void loadExchangeGrants());
  $('exchangeGrantForm')?.addEventListener('submit', handleSaveExchangeGrant);

  $('openCreateShiftBtn')?.addEventListener('click', openCreateShiftDialog);
  $('refreshShiftsBtn')?.addEventListener('click', () => void loadShiftSchedules());
  $('shiftSearchInput')?.addEventListener('input', () => void loadShiftSchedules());
  $('shiftTypeFilter')?.addEventListener('change', () => void loadShiftSchedules());
  $('shiftZoneFilter')?.addEventListener('change', () => void loadShiftSchedules());
  $('shiftStatusFilter')?.addEventListener('change', () => void loadShiftSchedules());
  $('shiftForm')?.addEventListener('submit', handleSaveShift);
  $('swapShiftForm')?.addEventListener('submit', handleSwapShift);

  $('openCreateKpiBtn')?.addEventListener('click', openCreateKpiDialog);
  $('refreshKpiBtn')?.addEventListener('click', () => void loadStaffKpi());
  $('kpiSearchInput')?.addEventListener('input', () => void loadStaffKpi());
  $('kpiYearFilter')?.addEventListener('change', () => void loadStaffKpi());
  $('kpiGradeFilter')?.addEventListener('change', () => void loadStaffKpi());
  $('kpiForm')?.addEventListener('submit', handleSaveKpi);

  // Khởi chạy Trợ lý AI Chatbot & Gợi ý tự động
  setTimeout(() => {
    initAiChatbot();
    initBookOcr();
  }, 100);

})();
