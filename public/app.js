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
  });
  const state = {
    page: 1,
    lastPage: 1,
    categoryId: '',
    books: [],
    categories: [],
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
  };
  let borrowChartInstance = null;
  let dashboardTrendChartInstance = null;
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
      if (!decoded.sub || !decoded.username || !decoded.role) return null;
      return { id: Number(decoded.sub), username: decoded.username, role: decoded.role };
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
    if (['dashboard', 'reports'].includes(route)) return true;
    if (['books', 'categories', 'publishers'].includes(route)) return isInventoryStaff();
    if (['loans', 'readers', 'reservations', 'fines', 'reader-profile'].includes(route)) {
      return isCounterStaff();
    }
    return isAdmin() && ['settings', 'staffs'].includes(route);
  }

  function syncAdminRoute() {
    let path = window.location.pathname.replace(/\/+$/, '') || '/';
    const isAdminPath = path === '/admin' || path.startsWith('/admin/');
    const profileMatch = path.match(/^\/admin\/users\/(\d+)$/);
    const selfProfile = path === '/profile' && state.user?.role === 'READER';

    if (path === '/register' && state.user) {
      window.history.replaceState({}, '', isStaff() ? '/admin/dashboard' : '/search');
      path = isStaff() ? '/admin/dashboard' : '/search';
    } else if (isAdminPath && !isStaff()) {
      window.history.replaceState({}, '', '/');
      path = '/';
    } else if (isStaff() && !isAdminPath && path !== '/search') {
      window.history.replaceState({}, '', '/admin/dashboard');
      path = '/admin/dashboard';
    } else if (path === '/admin') {
      window.history.replaceState({}, '', '/admin/dashboard');
      path = '/admin/dashboard';
    }

    let route = profileMatch || selfProfile
      ? 'reader-profile'
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
          (route === 'reader-profile' ? isCounterStaff() || Boolean(selfProfile) : Boolean(isStaff()))
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

    if (route === 'reports' && state.stats) {
      window.requestAnimationFrame(() => drawBorrowChart(state.stats.topBooks));
    }
    if (route === 'dashboard' && isCounterStaff()) void loadDashboardBorrowRecords();
    if (route === 'loans' && isCounterStaff()) {
      if (!state.settings) void loadSettings(false);
      void loadBorrowRecords();
    }
    if (route === 'reservations' && isCounterStaff()) void loadReservations();
    if (route === 'fines' && isCounterStaff()) void loadFines();
    if (route === 'settings' && isAdmin() && !state.settings) void loadSettings();
    if (route === 'readers' && isCounterStaff() && !state.settings) void loadSettings(false);
    if (route === 'staffs' && isAdmin()) void loadStaffs();
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
    document.body.classList.toggle('admin-layout', Boolean(isStaff()));
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
    if (isStaff()) void loadDashboard();
    if (isCounterStaff()) {
      void loadUsers();
    }
    if (isInventoryStaff()) {
      void loadPublishers();
    }
    syncAdminRoute();
  }

  async function login(event) {
    event.preventDefault();
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: $('authUsername').value.trim(),
          password: $('authPassword').value,
        }),
      });
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      state.user = decodeUser(data.accessToken);
      if (!state.user) throw new Error('Không thể đọc thông tin vai trò từ access token');
      showSession();
      notify('Đăng nhập thành công.');
    } catch (error) {
      notify(error.message, true);
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

  async function loadCategories() {
    try {
      state.categories = await api('/categories');
      const options = state.categories.map((category) =>
        `<option value="${category.id}">${escapeHtml(category.name)}</option>`).join('');
      $('categoryFilter').innerHTML = '<option value="">Tất cả thể loại</option>' + options;
      $('bookCategory').innerHTML = '<option value="">Chưa phân loại</option>' + options;
      const currentYear = new Date().getFullYear();
      $('publicationYearFilter').innerHTML = '<option value="">Tất cả năm</option>' +
        Array.from({ length: currentYear - 1899 }, (_, index) => currentYear - index)
          .map((year) => `<option value="${year}">${year}</option>`).join('');
      $('categoryList').innerHTML = state.categories.length
        ? state.categories.map((category) => `<div class="category-row"><div><strong>${escapeHtml(category.name)}</strong><p>${escapeHtml(category.description || 'Chưa có mô tả')}</p></div><div class="button-row"><button class="button button-light button-small" data-edit-category="${category.id}" type="button">Sửa</button><button class="button button-danger button-small" data-delete-category="${category.id}" type="button">Xóa</button></div></div>`).join('')
        : '<p>Chưa có thể loại nào.</p>';
      document.querySelectorAll('[data-edit-category]').forEach((button) => {
        button.addEventListener('click', () => void editCategory(button.dataset.editCategory));
      });
      document.querySelectorAll('[data-delete-category]').forEach((button) => {
        button.addEventListener('click', () => void removeCategory(button.dataset.deleteCategory));
      });
    } catch (error) {
      notify(`Không tải được thể loại: ${error.message}`, true);
    }
  }

  async function loadPublishers() {
    try {
      state.publishers = await api('/publishers');
      $('publisherId').innerHTML = '<option value="">Chưa có nhà xuất bản</option>' +
        state.publishers.map((publisher) =>
          `<option value="${publisher.id}">${escapeHtml(publisher.name)}</option>`).join('');
      renderPublisherList();
    } catch (error) {
      notify(`Không tải được nhà xuất bản: ${error.message}`, true);
    }
  }

  function renderPublisherList() {
    const search = $('publisherSearch').value.trim().toLocaleLowerCase();
    const publishers = state.publishers.filter((publisher) =>
      !search || `${publisher.name} ${publisher.email || ''} ${publisher.phone || ''}`
        .toLocaleLowerCase().includes(search));
    $('publisherList').innerHTML = publishers.length
      ? publishers.map((publisher) => `<div class="category-row"><div><strong>${escapeHtml(publisher.name)}</strong><p>${escapeHtml([publisher.email, publisher.phone, publisher.address].filter(Boolean).join(' · ') || 'Chưa có thông tin liên hệ')}</p></div><div class="button-row"><button class="button button-light button-small" data-edit-publisher="${publisher.id}" type="button">Sửa</button><button class="button button-danger button-small" data-delete-publisher="${publisher.id}" type="button">Xóa</button></div></div>`).join('')
      : `<p>${state.publishers.length ? 'Không tìm thấy nhà xuất bản phù hợp.' : 'Chưa có nhà xuất bản nào.'}</p>`;
    document.querySelectorAll('[data-edit-publisher]').forEach((button) => {
      button.addEventListener('click', () => editPublisher(button.dataset.editPublisher));
    });
    document.querySelectorAll('[data-delete-publisher]').forEach((button) => {
      button.addEventListener('click', () => requestRemovePublisher(button.dataset.deletePublisher));
    });
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
      await api(id ? `/publishers/${id}` : '/publishers', {
        method: id ? 'PATCH' : 'POST',
        body: JSON.stringify({
          name: $('publisherName').value.trim(),
          email: $('publisherEmail').value.trim() || undefined,
          phone: phone || undefined,
          address: $('publisherAddress').value.trim() || undefined,
        }),
      });
      clearPublisherForm();
      notify(id ? 'Đã cập nhật nhà xuất bản.' : 'Đã thêm nhà xuất bản.');
      await Promise.all([loadPublishers(), loadBooks(state.page)]);
    } catch (error) {
      notify(error.message, true);
    }
  }

  function clearPublisherForm() {
    $('publisherForm').reset();
    $('publisherEditId').value = '';
    $('publisherSubmit').textContent = 'Thêm nhà xuất bản';
    $('cancelPublisherEdit').hidden = true;
    $('publisherName').setCustomValidity('');
    $('publisherPhone').setCustomValidity('');
  }

  function editPublisher(id) {
    const publisher = state.publishers.find((item) => item.id === Number(id));
    if (!publisher) return;
    $('publisherEditId').value = publisher.id;
    $('publisherName').value = publisher.name;
    $('publisherEmail').value = publisher.email || '';
    $('publisherPhone').value = publisher.phone || '';
    $('publisherAddress').value = publisher.address || '';
    $('publisherSubmit').textContent = 'Lưu thay đổi';
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
      renderUsers();
      renderQuickBorrowReaders();
    } catch (error) {
      $('userList').innerHTML = `<tr><td colspan="6">${escapeHtml(error.message)}</td></tr>`;
    }
  }

  async function loadStaffs() {
    if (!isAdmin()) return;
    try {
      state.users = await api('/users');
      renderStaffs();
    } catch (error) {
      $('staffList').innerHTML = `<tr><td colspan="5">${escapeHtml(error.message)}</td></tr>`;
    }
  }

  function renderStaffs() {
    const staff = state.users.filter((user) => user.role !== 'READER');
    $('staffList').innerHTML = staff.length
      ? staff.map((user) => `<tr><td><strong>${escapeHtml(user.username)}</strong></td><td>${escapeHtml(user.fullName || '—')}<br><small>${escapeHtml(user.email || '—')} · ${escapeHtml(user.phone || '—')}</small></td><td><div class="staff-role-editor"><span class="role-badge">${escapeHtml(roleTitle(user.role))}</span><select data-staff-role="${user.id}" aria-label="Vai trò của ${escapeHtml(user.username)}"><option value="ADMIN" ${user.role === 'ADMIN' ? 'selected' : ''}>Super Admin</option><option value="LIBRARIAN" ${user.role === 'LIBRARIAN' ? 'selected' : ''}>Thủ thư cũ</option><option value="COUNTER_LIBRARIAN" ${user.role === 'COUNTER_LIBRARIAN' ? 'selected' : ''}>Thủ thư quầy</option><option value="INVENTORY_LIBRARIAN" ${user.role === 'INVENTORY_LIBRARIAN' ? 'selected' : ''}>Thủ thư kho</option></select></div></td><td><span class="status ${user.isActive ? 'status-RETURNED' : 'status-REJECTED'}">${user.isActive ? 'Đang hoạt động' : 'Đã khóa'}</span></td><td><div class="book-actions"><button class="button button-primary button-small" data-save-staff-role="${user.id}" type="button">Lưu vai trò</button><button class="button ${user.isActive ? 'button-danger' : 'button-light'} button-small" data-toggle-user="${user.id}" type="button">${user.isActive ? 'Khóa' : 'Mở khóa'}</button></div></td></tr>`).join('')
      : '<tr><td colspan="5">Chưa có tài khoản nhân viên.</td></tr>';
    document.querySelectorAll('[data-save-staff-role]').forEach((button) => {
      button.addEventListener('click', () =>
        void updateStaffRole(button.dataset.saveStaffRole),
      );
    });
    document.querySelectorAll('#staffList [data-toggle-user]').forEach((button) => {
      button.addEventListener('click', () => void toggleUser(button.dataset.toggleUser));
    });
  }

  async function createStaff(event) {
    event.preventDefault();
    try {
      await api('/users', {
        method: 'POST',
        body: JSON.stringify({
          username: $('staffUsername').value.trim(),
          fullName: $('staffFullName').value.trim(),
          email: $('staffEmail').value.trim() || undefined,
          phone: $('staffPhone').value.trim() || undefined,
          password: $('staffPassword').value,
          role: $('staffRole').value,
        }),
      });
      $('staffForm').reset();
      notify('Đã tạo tài khoản thủ thư.');
      await loadStaffs();
    } catch (error) {
      notify(`Không tạo được tài khoản thủ thư: ${error.message}`, true);
    }
  }

  async function updateStaffRole(id) {
    const select = document.querySelector(`[data-staff-role="${CSS.escape(String(id))}"]`);
    if (!select) return;
    try {
      await api(`/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: select.value }),
      });
      notify('Đã cập nhật vai trò nhân viên.');
      await loadStaffs();
    } catch (error) {
      notify(`Không cập nhật được vai trò: ${error.message}`, true);
    }
  }

  function renderUsers() {
    const search = $('userSearch').value.trim().toLocaleLowerCase();
    const role = $('userRoleFilter').value;
    const status = $('userStatusFilter').value;
    const users = state.users.filter((user) =>
      (!search || `${user.username} ${user.fullName || ''} ${user.email || ''}`.toLocaleLowerCase().includes(search)) &&
      (!role || user.role === role) &&
      (!status || (status === 'active' ? user.isActive : !user.isActive)));
    $('userList').innerHTML = users.length ? users.map((user) =>
      `<tr><td><strong>${escapeHtml(user.username)}</strong><br><small>${escapeHtml(user.fullName || '—')}</small></td><td>${escapeHtml(user.email || '—')}<br><small>${escapeHtml(user.phone || '—')}</small></td><td><span class="role-badge">${escapeHtml(roleTitle(user.role))}</span></td><td>${escapeHtml(user.maxActiveLoans ?? 5)} phiếu</td><td>${user.role === 'READER' ? `Cấp ${date(user.libraryCardIssuedAt)}<br><small>${user.libraryCardExpiresAt ? `Hết hạn ${date(user.libraryCardExpiresAt)}` : 'Không thời hạn'}</small>` : '—'}</td><td><span class="status ${user.isActive ? 'status-RETURNED' : 'status-REJECTED'}">${user.isActive ? 'Đang hoạt động' : user.role === 'READER' && !user.approvedAt ? 'Chờ duyệt' : 'Đã khóa'}</span></td><td><div class="book-actions"><button class="button button-light button-small" data-user-profile="${user.id}" type="button">Hồ sơ</button>${user.role === 'READER' ? `<button class="button button-light button-small" data-renew-card="${user.id}" type="button">Gia hạn thẻ</button>` : ''}<button class="button button-light button-small" data-edit-user="${user.id}" type="button">Sửa</button><button class="button ${user.isActive ? 'button-danger' : 'button-primary'} button-small" data-toggle-user="${user.id}" type="button">${user.isActive ? 'Khóa' : user.role === 'READER' && !user.approvedAt ? 'Duyệt / mở khóa' : 'Mở khóa'}</button></div></td></tr>`).join('')
      : '<tr><td colspan="7">Không tìm thấy tài khoản phù hợp.</td></tr>';
    document.querySelectorAll('[data-edit-user]').forEach((button) => {
      button.addEventListener('click', () => editUser(button.dataset.editUser));
    });
    document.querySelectorAll('[data-toggle-user]').forEach((button) => {
      button.addEventListener('click', () => void toggleUser(button.dataset.toggleUser));
    });
    document.querySelectorAll('[data-user-profile]').forEach((button) => {
      button.addEventListener('click', () => navigateAdmin(`/admin/users/${button.dataset.userProfile}`));
    });
    document.querySelectorAll('[data-renew-card]').forEach((button) => {
      button.addEventListener('click', () => openCardRenewal(button.dataset.renewCard));
    });
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
      $('settingMaxLoans').value = state.settings.maxActiveLoans;
      $('settingBorrowDays').value = state.settings.borrowDays;
      $('settingRenewalDays').value = state.settings.renewalDays;
      $('settingDailyFine').value = state.settings.dailyFineRate;
      $('newUserLimit').max = String(state.settings.maxActiveLoans);
      if (!$('newUserLimit').value || Number($('newUserLimit').value) > state.settings.maxActiveLoans) {
        $('newUserLimit').value = String(state.settings.maxActiveLoans);
      }
      $('editUserLimit').max = String(state.settings.maxActiveLoans);
      updateBorrowDueSuggestion();
      if (isAdmin()) {
        const mailConfig = await api('/notifications/config');
        $('smtpConfigurationStatus').textContent = mailConfig.smtpConfigured
          ? 'SMTP đã được cấu hình. Hệ thống sẽ gửi email nhắc hạn theo lịch.'
          : 'SMTP chưa được cấu hình. Thông báo trong ứng dụng vẫn hoạt động.';
      }
    } catch (error) {
      if (showErrors) notify(`Không tải được cấu hình: ${error.message}`, true);
    }
  }

  async function saveSettings(event) {
    event.preventDefault();
    try {
      state.settings = await api('/system/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          maxActiveLoans: Number($('settingMaxLoans').value),
          borrowDays: Number($('settingBorrowDays').value),
          renewalDays: Number($('settingRenewalDays').value),
          dailyFineRate: Number($('settingDailyFine').value),
        }),
      });
      notify('Đã cập nhật cấu hình hệ thống.');
      await Promise.all([loadSettings(false), loadDashboard(), loadUsers()]);
    } catch (error) {
      notify(`Không lưu được cấu hình: ${error.message}`, true);
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
    } catch (error) {
      notify(`Không tải được hồ sơ độc giả: ${error.message}`, true);
    }
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
    try {
      await api(`/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: $('editUserFullName').value.trim() || undefined,
          email: $('editUserEmail').value.trim() || undefined,
          phone: $('editUserPhone').value.trim() || undefined,
          ...(isAdmin() ? { role: $('editUserRole').value } : {}),
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
    if (!window.confirm('Xóa thể loại này? Sách liên quan sẽ không còn thể loại.')) return;
    try {
      await api(`/categories/${id}`, { method: 'DELETE' });
      notify('Đã xóa thể loại.');
      await loadCategories();
      await loadBooks(1);
    } catch (error) {
      notify(error.message, true);
    }
  }

  async function editCategory(id) {
    const category = state.categories.find((item) => item.id === Number(id));
    if (!category) return;
    const name = window.prompt('Tên thể loại:', category.name);
    if (name === null) return;
    const description = window.prompt('Mô tả:', category.description || '');
    if (description === null) return;
    try {
      await api(`/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      });
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

  function renderBooks() {
    const books = state.books;
    $('bookList').innerHTML = books.length ? books.map((book) => {
      const coverUrl = safeCoverUrl(book.coverImageUrl);
      const locations = getBookLocations(book);
      const actions = [
        `<button class="button button-light button-small" data-book-detail="${book.id}" type="button">ⓘ Chi tiết</button>`,
        state.user && book.availableCopies > 0
          ? `<button class="button button-primary button-small" data-borrow="${book.id}" data-title="${escapeHtml(book.title)}" type="button">＋ Mượn</button>`
          : state.user && book.availableCopies <= 0
            ? `<button class="button button-light button-small" data-reserve="${book.id}" type="button">Đặt giữ</button>` : '',
        `<button class="button button-light button-small" data-review="${book.id}" data-title="${escapeHtml(book.title)}" type="button">Đánh giá</button>`,
        isInventoryStaff() ? `<button class="button button-light button-small" data-copies="${book.id}" type="button">Bản sao</button><button class="button button-light button-small" data-edit="${book.id}" type="button">Sửa</button>` : '',
        isAdmin() ? `<button class="button button-danger button-small" data-delete-book="${book.id}" type="button">Ẩn</button>` : '',
      ].join('');
      return `<article class="book-card"><div class="book-top"><div class="book-cover" aria-hidden="true"><span>${escapeHtml(book.title.slice(0, 1).toLocaleUpperCase('vi'))}</span>${coverUrl ? `<img src="${escapeHtml(coverUrl)}" alt="" loading="lazy">` : ''}</div><span class="inventory-badge ${book.availableCopies > 0 ? 'inventory-available' : 'inventory-unavailable'}">${book.availableCopies > 0 ? `Còn ${book.availableCopies} bản` : 'Hết hàng'}</span></div><h3>${escapeHtml(book.title)}</h3><p class="book-author">${escapeHtml(book.author)}</p><div class="book-meta"><span class="book-tag category-tag">${escapeHtml(book.category?.name || 'Chưa phân loại')}</span><span class="book-tag publisher-tag">${escapeHtml(book.publisher?.name || 'Chưa có nhà xuất bản')}</span><span class="book-location">${escapeHtml(locations.length ? locations.join(' · ') : 'Chưa có vị trí')}</span><span>ISBN ${escapeHtml(book.isbn)}</span>${book.publicationYear ? `<span>${escapeHtml(book.publicationYear)}</span>` : ''}</div><div class="book-actions">${actions}</div></article>`;
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
    document.querySelectorAll('[data-reserve]').forEach((button) => button.addEventListener('click', () => void reserveBook(button.dataset.reserve)));
    document.querySelectorAll('[data-review]').forEach((button) => button.addEventListener('click', () => void openReviews(button.dataset.review, button.dataset.title)));
    document.querySelectorAll('[data-edit]').forEach((button) => button.addEventListener('click', () => editBook(button.dataset.edit)));
    document.querySelectorAll('[data-delete-book]').forEach((button) => button.addEventListener('click', () => void removeBook(button.dataset.deleteBook)));
    document.querySelectorAll('[data-copies]').forEach((button) => button.addEventListener('click', () => void manageCopies(button.dataset.copies)));
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
            <div><dt>Tình trạng</dt><dd>${Number(book.availableCopies)} / ${Number(book.totalCopies)} bản có sẵn</dd></div>
          </dl>
        </div>`;
      $('bookDetailBody').querySelector('.detail-cover img')?.addEventListener('error', (event) => {
        event.currentTarget.remove();
      }, { once: true });
      $('detailReserveButton').hidden = Number(book.availableCopies) > 0;
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
    const id = $('bookId').value;
    const title = $('bookTitle').value.trim();
    const author = $('bookAuthor').value.trim();
    if (title.length < 2) {
      $('bookTitle').setCustomValidity('Tên sách phải có ít nhất 2 ký tự.');
      $('bookTitle').reportValidity();
      $('bookTitle').setCustomValidity('');
      return;
    }
    if (author.length < 2) {
      $('bookAuthor').setCustomValidity('Tên tác giả phải có ít nhất 2 ký tự.');
      $('bookAuthor').reportValidity();
      $('bookAuthor').setCustomValidity('');
      return;
    }
    const totalCopies = Number($('bookCopies').value);
    const categoryId = $('bookCategory').value;
    const publisherId = $('publisherId').value;
    const payload = {
      title,
      author,
      isbn: $('bookIsbn').value.trim(),
      publicationYear: Number($('bookPublicationYear').value) || undefined,
      totalCopies,
      ...(!id ? { availableCopies: totalCopies } : {}),
      ...(categoryId ? { categoryId: Number(categoryId) } : {}),
      ...(publisherId ? { publisherId: Number(publisherId) } : { publisherId: null }),
      shelf: $('bookShelf').value.trim() || undefined,
      floor: $('bookFloor').value.trim() || undefined,
      aisle: $('bookAisle').value.trim() || undefined,
      description: $('bookDescription').value.trim(),
      coverImageUrl: $('bookCoverImageUrl').value.trim(),
    };
    try {
      await api(id ? `/books/${id}` : '/books', {
        method: id ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });
      $('bookFormPanel').hidden = true;
      $('bookForm').reset();
      $('bookId').value = '';
      notify(id ? 'Đã cập nhật đầu sách.' : 'Đã thêm đầu sách và tạo barcode cho các bản sao.');
      await loadBooks(state.page);
    } catch (error) {
      notify(error.message, true);
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
      state.reservations = await api(isCounterStaff() ? '/reservations' : '/reservations/mine');
      renderReservations();
    } catch (error) {
      $('reservationList').innerHTML = `<tr><td colspan="6">${escapeHtml(error.message)}</td></tr>`;
    }
  }

  function renderReservations() {
    const labels = {
      WAITING: 'Đang chờ sách',
      READY: 'Chờ nhận sách',
      FULFILLED: 'Đã hoàn tất',
      CANCELLED: 'Đã hủy',
      EXPIRED: 'Đã hết hạn',
    };
    const reservations = state.reservations.filter((reservation) =>
      state.reservationFilter === 'all' ||
      (state.reservationFilter === 'CANCELLED'
        ? ['CANCELLED', 'EXPIRED'].includes(reservation.status)
        : reservation.status === state.reservationFilter));
    document.querySelectorAll('[data-reservation-filter]').forEach((button) => {
      const active = button.dataset.reservationFilter === state.reservationFilter;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    $('reservationList').innerHTML = reservations.length ? reservations.map((reservation) => {
        const status = escapeHtml(reservation.status);
        const actions = [];
        if (reservation.status === 'WAITING' && isCounterStaff()) {
          actions.push(`<button class="button button-primary button-small" data-ready-reservation="${reservation.id}" type="button">✓ Xác nhận có sách</button>`);
        }
        if (reservation.status === 'READY') {
          actions.push(`<button class="button button-primary button-small" data-claim-reservation="${reservation.id}" type="button">${isCounterStaff() ? 'Tạo phiếu mượn' : 'Lấy sách'}</button>`);
        }
        if (['WAITING', 'READY'].includes(reservation.status)) actions.push(`<button class="button button-danger button-small" data-cancel-reservation="${reservation.id}" type="button">Hủy</button>`);
        const readerName = reservation.user?.fullName || reservation.user?.username || 'Độc giả';
        const reader = isCounterStaff()
          ? `<button class="text-button" data-reservation-reader="${reservation.user?.id}" type="button">${escapeHtml(readerName)}</button><br><small>${escapeHtml(reservation.user?.phone || `Thẻ TV-${reservation.user?.id || ''}`)}</small>`
          : escapeHtml(state.user.username);
        const expiry = reservation.expiresAt
          ? `${date(reservation.expiresAt)}${reservation.status === 'READY' ? `<br><small class="reservation-countdown" data-expires-at="${escapeHtml(reservation.expiresAt)}">${formatReservationCountdown(reservation.expiresAt)}</small>` : ''}`
          : '—';
        return `<tr><td><strong>${escapeHtml(reservation.book?.title || 'Sách không còn tồn tại')}</strong>${reservation.copy?.barcode ? `<br><small>${escapeHtml(reservation.copy.barcode)}</small>` : ''}</td><td>${reader}</td><td>${reservation.queuePosition ? `<span class="queue-position">#${escapeHtml(reservation.queuePosition)}</span>` : '—'}</td><td><span class="status status-${status}">${escapeHtml(labels[reservation.status] || status)}</span></td><td>${expiry}</td><td><div class="book-actions">${actions.join(' ') || '—'}</div></td></tr>`;
      }).join('') : '<tr><td colspan="6">Không có yêu cầu giữ sách ở trạng thái này.</td></tr>';
    $('reservationDescription').textContent = isCounterStaff()
      ? 'Tạo yêu cầu tại quầy, xử lý lần lượt theo hàng chờ và giao sách trong 24 giờ sau khi xác nhận.'
      : 'Theo dõi vị trí hàng đợi, thời hạn nhận sách và lịch sử yêu cầu.';
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
    const seconds = Math.max(0, Math.floor((new Date(value).getTime() - Date.now()) / 1000));
    if (!seconds) return 'Đã hết hạn · đang giải phóng sách';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `Còn ${hours}g ${String(minutes).padStart(2, '0')}p ${String(remainingSeconds).padStart(2, '0')}s`;
  }

  function updateReservationCountdowns() {
    document.querySelectorAll('[data-expires-at]').forEach((element) => {
      element.textContent = formatReservationCountdown(element.dataset.expiresAt);
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
      const selected = $('reservationBookSelect').value;
      $('reservationBookSelect').innerHTML = '<option value="">Chọn sách đang hết bản sao</option>' +
        state.reservationBookResults.map((book) =>
          `<option value="${book.id}">${escapeHtml(book.title)} · ${escapeHtml(book.author)}</option>`,
        ).join('');
      $('reservationBookSelect').value = state.reservationBookResults.some((book) => String(book.id) === selected)
        ? selected
        : '';
      if (!state.reservationBookResults.length) {
        $('reservationBookSelect').innerHTML = '<option value="">Không tìm thấy sách đang hết bản sao</option>';
      }
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
      return `<tr><td>${escapeHtml(payment.txnRef)}</td><td>${escapeHtml(reference)}<br><small>${escapeHtml(payment.readerName || 'Độc giả')} · ${escapeHtml(payment.bookTitle || 'Không gắn đầu sách')}</small></td><td>${money(payment.amount)}</td><td>${escapeHtml(methodLabels[payment.paymentMethod] || payment.paymentMethod)}</td><td>${escapeHtml(payment.status)}</td><td>${date(payment.paidAt || payment.createdAt)} ${payment.status === 'PAID' ? `<button class="button button-light button-small" data-print-payment="${payment.id}" type="button">In phiếu thu</button>` : ''}</td></tr>`;
    }).join('') : '<tr><td colspan="6">Không có giao dịch trong khoảng ngày đã chọn.</td></tr>';
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
        ? 'Đã chuyển yêu cầu sang chờ nhận sách; hạn nhận là 24 giờ.'
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
      notify(collectFineAtCounter && record.fineStatus === 'PAID'
        ? `Đã ghi nhận trả sách và thu ${money(record.fineAmount)} tại quầy.`
        : `Đã ghi nhận trả sách. Tiền phạt: ${money(record.fineAmount)}.`);
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
    const configuration = state.fines?.vietQr;
    if ($('fineCollectionMethod').value !== 'VIETQR') {
      panel.hidden = true;
      panel.innerHTML = '';
      return;
    }
    if (!configuration || !state.pendingFineCollection) {
      panel.hidden = false;
      panel.innerHTML = '<p>Chưa cấu hình tài khoản nhận VietQR. Hãy cấu hình VIETQR_BANK_ID, VIETQR_ACCOUNT_NO và VIETQR_ACCOUNT_NAME.</p>';
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
    panel.hidden = false;
    panel.innerHTML = `<img src="${escapeHtml(imageUrl.toString())}" alt="Mã QR thanh toán VietQR" referrerpolicy="no-referrer"><div><strong>${escapeHtml(configuration.accountName)}</strong><p>${escapeHtml(configuration.accountNo)} · ${escapeHtml(configuration.bankId)}</p><p>Nội dung chuyển khoản: <strong>${escapeHtml(txnRef)}</strong></p><p>Số tiền: <strong>${money(amount)}</strong></p></div>`;
  }

  async function collectFine(event) {
    event.preventDefault();
    const type = $('fineCollectionType').value;
    const id = $('fineCollectionId').value;
    const paymentMethod = $('fineCollectionMethod').value;
    if (paymentMethod === 'VIETQR' &&
        !window.confirm('Bạn đã đối chiếu tài khoản và xác nhận đã nhận đủ tiền chuyển khoản?')) return;
    try {
      await api(type === 'MANUAL'
        ? `/borrow/fines/manual/${id}/pay`
        : `/borrow/pay-fine/${id}`, {
        method: 'POST',
        body: JSON.stringify({
          paymentMethod,
          txnRef: $('fineCollectionReference').value,
        }),
      });
      $('fineCollectionDialog').close();
      state.pendingFineCollection = null;
      notify('Đã xác nhận thu tiền phạt.');
      await Promise.all([loadBorrowRecords(), loadDashboard(), loadFines()]);
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
    try {
      await api('/categories', {
        method: 'POST',
        body: JSON.stringify({ name: $('categoryName').value.trim(), description: $('categoryDescription').value.trim() || undefined }),
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

  async function loadDashboard() {
    if (!isStaff()) return;
    try {
      state.stats = await api('/admin/dashboard-stats');
      const cards = [
        ['Tổng số đầu sách', state.stats.totalBooks, `${Number(state.stats.totalCopies).toLocaleString('vi-VN')} bản sao`],
        ['Sách đang mượn', state.stats.activeBorrows, `${state.stats.pendingRequests} yêu cầu chờ duyệt`],
        ['Phiếu trễ hạn', state.stats.overdueBooks, 'Cần nhắc trả'],
        ['Tổng số độc giả', state.stats.totalReaders, 'Tài khoản độc giả'],
      ];
      $('statsGrid').innerHTML = cards.map(([label, value, detail]) => `<article class="stats-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(detail)}</small></article>`).join('');
      $('dashboardFineSummary').textContent =
        `Tổng tiền phạt: ${money(state.stats.totalFines)} · Chưa thu: ${money(state.stats.totalUnpaidFines)}`;
      const alerts = state.stats.alerts || { dueSoon: [], overdue: [], lowStock: [], damagedLostCount: 0 };
      const alertItems = [
        ...alerts.overdue.map((item) => ({
          type: 'alert-danger',
          text: `${item.reader} chưa trả “${item.book}” · hạn ${date(item.dueDate)}`,
          route: '/admin/borrow',
        })),
        ...alerts.dueSoon.map((item) => ({
          type: 'alert-warning',
          text: `${item.reader} sắp đến hạn trả “${item.book}” · ${date(item.dueDate)}`,
          route: '/admin/borrow',
        })),
        ...alerts.lowStock.map((item) => ({
          type: 'alert-info',
          text: `“${item.title}” chỉ còn ${item.availableCopies} bản`,
          route: '/admin/books',
        })),
      ];
      if (alerts.damagedLostCount) {
        alertItems.push({
          type: 'alert-warning',
          text: `${alerts.damagedLostCount} phiếu ghi nhận sách hỏng/mất`,
          route: '/admin/fines',
        });
      }
      $('smartAlerts').innerHTML = alertItems.length
        ? alertItems.map((item) => `<button class="smart-alert ${item.type}" data-alert-route="${item.route}" type="button">${escapeHtml(item.text)}</button>`).join('')
        : '<p class="empty-note">Hiện không có cảnh báo cần xử lý.</p>';
      document.querySelectorAll('[data-alert-route]').forEach((button) => {
        button.addEventListener('click', () => navigateAdmin(button.dataset.alertRoute));
      });
      $('topBooks').innerHTML = state.stats.topBooks.length
        ? state.stats.topBooks.map((book) => `<tr><td><strong>${escapeHtml(book.title)}</strong></td><td>${escapeHtml(book.author)}</td><td>${escapeHtml(book.borrowCount)}</td></tr>`).join('')
        : '<tr><td colspan="3">Chưa có dữ liệu mượn.</td></tr>';
      if (window.location.pathname === '/admin/reports') {
        drawBorrowChart(state.stats.topBooks);
      }
    } catch (error) {
      notify(`Không tải được báo cáo: ${error.message}`, true);
    }
  }

  async function loadDashboardBorrowRecords() {
    try {
      state.dashboardRecords = await api('/borrow');
      renderDashboardPendingLoans();
      drawDashboardTrend();
    } catch (error) {
      $('dashboardPendingLoans').innerHTML =
        `<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`;
    }
  }

  function renderDashboardPendingLoans() {
    const pending = state.dashboardRecords.filter((record) => record.status === 'PENDING');
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
    const monthly = $('dashboardTrendPeriod').value === 'month';
    const now = new Date();
    let buckets;
    if (monthly) {
      buckets = Array.from({ length: 12 }, (_, index) => {
        const month = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);
        const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
        return { key, label: month.toLocaleDateString('vi-VN', { month: 'short', year: '2-digit' }), count: 0 };
      });
    } else {
      const currentMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dayOffset = (currentMonday.getDay() + 6) % 7;
      currentMonday.setDate(currentMonday.getDate() - dayOffset);
      buckets = Array.from({ length: 8 }, (_, index) => {
        const monday = new Date(currentMonday);
        monday.setDate(monday.getDate() - (7 * (7 - index)));
        const key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
        return { key, label: monday.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }), count: 0 };
      });
    }
    const counts = new Map(buckets.map((bucket) => [bucket.key, bucket]));
    for (const record of state.dashboardRecords) {
      if (!record.borrowedAt) continue;
      const borrowedAt = new Date(record.borrowedAt);
      if (Number.isNaN(borrowedAt.getTime())) continue;
      let key;
      if (monthly) {
        key = `${borrowedAt.getFullYear()}-${String(borrowedAt.getMonth() + 1).padStart(2, '0')}`;
      } else {
        const monday = new Date(borrowedAt.getFullYear(), borrowedAt.getMonth(), borrowedAt.getDate());
        monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
        key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
      }
      if (counts.has(key)) counts.get(key).count += 1;
    }
    if (!window.Chart) {
      canvas.setAttribute('aria-label', `Xu hướng mượn: ${buckets.map((bucket) => `${bucket.label}: ${bucket.count}`).join(', ')}`);
      return;
    }
    if (dashboardTrendChartInstance) dashboardTrendChartInstance.destroy();
    dashboardTrendChartInstance = new window.Chart(canvas, {
      type: 'line',
      data: {
        labels: buckets.map((bucket) => bucket.label),
        datasets: [{
          label: 'Phiếu mượn',
          data: buckets.map((bucket) => bucket.count),
          borderColor: '#176b54',
          backgroundColor: '#176b5422',
          fill: true,
          tension: 0.3,
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

  $('loginForm').addEventListener('submit', (event) => void login(event));
  $('registerButton').addEventListener('click', openRegisterDialog);
  $('registerForm').addEventListener('submit', (event) => void register(event));
  $('staffForm').addEventListener('submit', (event) => void createStaff(event));
  $('refreshStaffs').addEventListener('click', () => void loadStaffs());
  $('bookForm').addEventListener('submit', (event) => void saveBook(event));
  $('bookImportForm').addEventListener('submit', (event) => void importBooks(event));
  $('downloadBookTemplate').addEventListener('click', downloadBookTemplate);
  $('exportBooksButton').addEventListener('click', () => void exportBooksCsv());
  $('manageReviewsButton').addEventListener('click', () => void openReviewModeration());
  $('loanRequestForm').addEventListener('submit', (event) => {
    event.preventDefault();
    void borrowBook($('loanBookId').value);
  });
  $('detailReserveButton').addEventListener('click', () => {
    if (state.currentDetailBookId) void reserveBook(state.currentDetailBookId);
  });
  $('returnForm').addEventListener('submit', (event) => void returnLoan(event));
  $('returnCondition').addEventListener('change', () => {
    $('damageFineField').hidden = $('returnCondition').value === 'NORMAL';
    updateReturnFineEstimate();
  });
  $('damageFineAmount').addEventListener('input', updateReturnFineEstimate);
  $('loanReturnBarcode').addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const barcode = $('loanReturnBarcode').value.trim();
    if (!barcode) return;
    const record = state.borrowRecords.find((item) =>
      item.copy?.barcode?.toLocaleLowerCase() === barcode.toLocaleLowerCase() &&
      item.status === 'BORROWED');
    $('loanReturnBarcode').value = '';
    if (!record) {
      notify('Không tìm thấy phiếu đang mượn cho barcode này.', true);
      return;
    }
    openReturnDialog(record, barcode);
  });
  $('userForm').addEventListener('submit', (event) => void createUser(event));
  $('userEditForm').addEventListener('submit', (event) => void updateUser(event));
  $('cardRenewForm').addEventListener('submit', (event) => void renewLibraryCard(event));
  $('quickBorrowForm').addEventListener('submit', (event) => void createStaffBorrowRequest(event));
  $('openBorrowDialog').addEventListener('click', () => void openStaffBorrowDialog());
  $('quickBorrowReaderSearch').addEventListener('input', renderQuickBorrowReaders);
  $('quickBorrowBarcode').addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    addBorrowBarcode($('quickBorrowBarcode').value);
  });
  $('borrowBarcodeList').addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-borrow-barcode]');
    if (!button) return;
    state.staffBorrowBarcodes.splice(Number(button.dataset.removeBorrowBarcode), 1);
    renderBorrowBarcodeList();
  });
  $('settingsForm').addEventListener('submit', (event) => void saveSettings(event));
  $('dashboardAddBook').addEventListener('click', () => {
    navigateAdmin('/admin/books');
    window.requestAnimationFrame(() => $('newBookButton').click());
  });
  $('dashboardCreateLoan').addEventListener('click', () => {
    navigateAdmin('/admin/borrow-return');
    window.requestAnimationFrame(() => void openStaffBorrowDialog());
  });
  $('dashboardCreateReader').addEventListener('click', () => {
    navigateAdmin('/admin/users');
    window.requestAnimationFrame(() => {
      $('userForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
      $('newUsername').focus();
    });
  });
  $('dashboardViewLoans').addEventListener('click', () => navigateAdmin('/admin/borrow-return'));
  $('dashboardTrendPeriod').addEventListener('change', drawDashboardTrend);
  $('profileQuickBorrow').addEventListener('click', () => void createLoanForProfileReader());
  $('profileRenewCard').addEventListener('click', () => {
    if (state.readerProfileUser) openCardRenewalForUser(state.readerProfileUser);
  });
  $('profileToggleCard').addEventListener('click', () => void toggleProfileCard());
  $('renewCardPeriod').addEventListener('change', setRenewalDate);
  $('publisherForm').addEventListener('submit', (event) => void savePublisher(event));
  $('publisherSearch').addEventListener('input', renderPublisherList);
  $('publisherName').addEventListener('input', () => $('publisherName').setCustomValidity(''));
  $('publisherPhone').addEventListener('input', () => $('publisherPhone').setCustomValidity(''));
  $('cancelPublisherEdit').addEventListener('click', clearPublisherForm);
  $('confirmPublisherDelete').addEventListener('click', () => {
    if (state.pendingPublisherDeleteId !== null) {
      void removePublisher(state.pendingPublisherDeleteId);
    }
  });
  $('addCopyButton').addEventListener('click', () => void addCopyFromDialog());
  $('printCopyLabels').addEventListener('click', () => void printCopyLabels());
  $('openBatchLabels').addEventListener('click', openBatchLabels);
  $('printSelectedLabels').addEventListener('click', () => void printSelectedBookLabels());
  $('selectAllLabelBooks').addEventListener('change', () => {
    document.querySelectorAll('[data-label-book]').forEach((input) => {
      input.checked = $('selectAllLabelBooks').checked;
    });
    void loadBatchLabelPreview();
  });
  $('labelBookSelector').addEventListener('change', (event) => {
    if (event.target.matches('[data-label-book]')) void loadBatchLabelPreview();
  });
  $('newBookButton').addEventListener('click', () => {
    $('bookForm').reset();
    $('bookId').value = '';
    $('bookFormTitle').textContent = 'Thêm sách mới';
    $('bookFormPanel').hidden = false;
    $('bookFormPanel').scrollIntoView({ behavior: 'smooth' });
  });
  $('cancelBookEdit').addEventListener('click', () => { $('bookFormPanel').hidden = true; });
  $('categoryForm').addEventListener('submit', (event) => void addCategory(event));
  $('categoryFilter').addEventListener('change', () => {
    state.categoryId = $('categoryFilter').value;
    void loadBooks(1);
  });
  $('availabilityFilter').addEventListener('change', () => void loadBooks(1));
  $('publicationYearFilter').addEventListener('change', () => void loadBooks(1));
  ['shelfFilter', 'floorFilter', 'aisleFilter'].forEach((id) => {
    $(id).addEventListener('change', () => void loadBooks(1));
  });
  $('searchInput').addEventListener('input', () => {
    window.clearTimeout(state.searchTimer);
    state.searchTimer = window.setTimeout(() => {
      void loadBooks(1);
      void loadSearchSuggestions($('searchInput').value, 'searchInput', 'bookSuggestions');
    }, 250);
  });
  $('globalSearch').addEventListener('input', () => {
    window.clearTimeout(state.globalSearchTimer);
    state.globalSearchTimer = window.setTimeout(() =>
      void loadSearchSuggestions($('globalSearch').value, 'globalSearch', 'globalSuggestions'), 180);
  });
  $('globalSearch').addEventListener('keydown', (event) => {
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
  $('globalSuggestions').addEventListener('click', chooseSearchSuggestion);
  $('bookSuggestions').addEventListener('click', chooseSearchSuggestion);
  $('loanSearch').addEventListener('input', () => {
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
  $('previousLoanPage').addEventListener('click', () => {
    if (state.borrowPage > 1) {
      state.borrowPage -= 1;
      renderBorrowRecords();
    }
  });
  $('nextLoanPage').addEventListener('click', () => {
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
  $('sidebarToggle').addEventListener('click', () => {
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
  $('barcodeInput').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { event.preventDefault(); void scanBarcode(); }
  });
  $('previousPage').addEventListener('click', () => { if (state.page > 1) void loadBooks(state.page - 1); });
  $('nextPage').addEventListener('click', () => { if (state.page < state.lastPage) void loadBooks(state.page + 1); });
  $('refreshLoans').addEventListener('click', () => void loadBorrowRecords());
  $('refreshFines').addEventListener('click', () => void loadFines());
  $('openManualFineDialog').addEventListener('click', () => void openManualFineDialog());
  $('manualFineForm').addEventListener('submit', (event) => void createManualFine(event));
  $('manualFineReaderSearch').addEventListener('input', renderManualFineReaders);
  $('manualFineType').addEventListener('change', () => $('manualFineBarcode').setCustomValidity(''));
  $('fineCollectionForm').addEventListener('submit', (event) => void collectFine(event));
  $('fineCollectionMethod').addEventListener('change', renderFineVietQr);
  $('fineWaiveForm').addEventListener('submit', (event) => void waiveFine(event));
  $('finePaymentFrom').addEventListener('change', renderFinePayments);
  $('finePaymentTo').addEventListener('change', renderFinePayments);
  $('exportFinePayments').addEventListener('click', exportFinePayments);
  $('refreshReaderProfile').addEventListener('click', () => {
    const match = window.location.pathname.match(/^\/admin\/users\/(\d+)$/);
    if (match) void loadReaderProfile(Number(match[1]));
    else if (window.location.pathname === '/profile' && state.user) {
      void loadReaderProfile(state.user.id);
    }
  });
  $('refreshReservations').addEventListener('click', () => void loadReservations());
  $('openReservationDialog').addEventListener('click', () => void openStaffReservationDialog());
  $('staffReservationForm').addEventListener('submit', (event) => void createStaffReservation(event));
  $('reservationReaderSearch').addEventListener('input', renderReservationReaderOptions);
  $('reservationBookSearch').addEventListener('input', () => {
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
  $('refreshUsers').addEventListener('click', () => void loadUsers());
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
  $('notificationButton').addEventListener('click', () => {
    $('notificationPanel').hidden = !$('notificationPanel').hidden;
    if (!$('notificationPanel').hidden) $('notificationPanel').scrollIntoView({ behavior: 'smooth' });
  });
  $('registerDialog').addEventListener('close', () => {
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
  $('closeNotifications').addEventListener('click', () => { $('notificationPanel').hidden = true; });
  $('closeReviews').addEventListener('click', () => { $('reviewsPanel').hidden = true; });
  $('exportExcel').addEventListener('click', () => void exportExcel());
  $('exportPdf').addEventListener('click', () => void exportPdf());
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
})();
