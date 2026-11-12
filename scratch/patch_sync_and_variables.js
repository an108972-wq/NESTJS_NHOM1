const fs = require('fs');

let code = fs.readFileSync('public/app.js', 'utf8');
const hadCrlf = code.includes('\r\n');
if (hadCrlf) {
  code = code.replace(/\r\n/g, '\n');
}

// 1. Move variable declarations to top
const topTarget = `  let borrowChartInstance = null;
  let dashboardTrendChartInstance = null;`;

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

if (!code.includes(topTarget)) {
  console.error("topTarget not found!");
  process.exit(1);
}
code = code.replace(topTarget, topReplacement);

// 2. Remove duplicate 'let' downstream
code = code.replace(`  let dashboardCategoryChartInstance = null;`, `  // dashboardCategoryChartInstance declared at top`);
code = code.replace(`  let shelvesData = [];`, `  // shelvesData declared at top`);
code = code.replace(`  let shelfSearchTimer;`, `  // shelfSearchTimer declared at top`);
code = code.replace(`  let auditLogsList = [];`, `  // auditLogsList declared at top`);
code = code.replace(`  let auditSearchTimer;`, `  // auditSearchTimer declared at top`);
code = code.replace(`  let devicesData = [];
  let deviceLoansData = [];
  let deviceMaintenancesData = [];`, `  // devicesData declared at top`);
code = code.replace(`  let studyRoomsData = [];
  let roomBookingsData = [];`, `  // studyRoomsData declared at top`);
code = code.replace(`  let lockersData = [];
  let overdueLockersData = [];`, `  // lockersData declared at top`);

// 3. Keep inventoryList & memberData synced in loadBooks & loadUsers
const booksSyncTarget = `      state.books = Array.isArray(result.data) ? result.data : [];
      state.page = result.page;`;
const booksSyncRepl = `      state.books = Array.isArray(result.data) ? result.data : [];
      inventoryList = state.books;
      state.page = result.page;`;
code = code.replace(booksSyncTarget, booksSyncRepl);

const usersSyncTarget = `      state.users = await api('/users');
      renderUsers();`;
const usersSyncRepl = `      state.users = await api('/users');
      memberData = state.users;
      renderUsers();`;
code = code.replace(usersSyncTarget, usersSyncRepl);

// 4. In saveBook: sync loadDashboard()
const saveBookTarget = `      notify(id ? 'Đã cập nhật đầu sách.' : 'Đã thêm đầu sách và tạo barcode cho các bản sao.');
      await loadBooks(state.page);`;
const saveBookRepl = `      notify(id ? 'Đã cập nhật đầu sách.' : 'Đã thêm đầu sách và tạo barcode cho các bản sao.');
      await Promise.all([loadBooks(state.page), loadDashboard()]);`;
code = code.replace(saveBookTarget, saveBookRepl);

// 5. In inventory-audit: trigger background sync of loadBooks & loadDashboard
const auditScanTarget = `      auditState.auditResult = res;
      renderAuditStats();`;
const auditScanRepl = `      auditState.auditResult = res;
      renderAuditStats();
      void loadBooks(state.page);
      void loadDashboard();`;
code = code.replace(auditScanTarget, auditScanRepl);

const auditRelocateTarget = `      notify(res.message);
      await refreshCurrentAudit();`;
const auditRelocateRepl = `      notify(res.message);
      await refreshCurrentAudit();
      await Promise.all([loadBooks(state.page), loadDashboard()]);`;
code = code.replace(auditRelocateTarget, auditRelocateRepl);

const auditBulkRelocateTarget = `      notify(resp.message);
      await refreshCurrentAudit();
    } catch (e) {
      notify(\`Lỗi khi chuyển vị trí hàng loạt: \${e.message}\`, true);`;
const auditBulkRelocateRepl = `      notify(resp.message);
      await refreshCurrentAudit();
      await Promise.all([loadBooks(state.page), loadDashboard()]);
    } catch (e) {
      notify(\`Lỗi khi chuyển vị trí hàng loạt: \${e.message}\`, true);`;
code = code.replace(auditBulkRelocateTarget, auditBulkRelocateRepl);

const auditBulkMissingTarget = `      notify(resp.message);
      $('auditBulkMissingDialog')?.close();
      await refreshCurrentAudit();`;
const auditBulkMissingRepl = `      notify(resp.message);
      $('auditBulkMissingDialog')?.close();
      await refreshCurrentAudit();
      await Promise.all([loadBooks(state.page), loadDashboard()]);`;
code = code.replace(auditBulkMissingTarget, auditBulkMissingRepl);

const auditSingleStatusTarget = `      notify(resp.message);
      await refreshCurrentAudit();
    } catch (e) {
      notify(\`Lỗi: \${e.message}\`, true);`;
const auditSingleStatusRepl = `      notify(resp.message);
      await refreshCurrentAudit();
      await Promise.all([loadBooks(state.page), loadDashboard()]);
    } catch (e) {
      notify(\`Lỗi: \${e.message}\`, true);`;
code = code.replace(auditSingleStatusTarget, auditSingleStatusRepl);

// 6. Add loadApprovedPublisherGroups, openCreatePoModal, checkPoBudgetAlert and event listeners
const poFunctionsCode = `
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
        const pubName = (g.publisher || 'Nhà xuất bản đối tác').replace(/'/g, "\\\\'");
        return \`
          <div style="background:#fff;border:1px solid #e2e8f0;border-left:4px solid #6f42c1;padding:12px 14px;border-radius:8px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex:1;min-width:280px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
            <div>
              <strong style="color:#1e293b;font-size:13px;">\${escapeHtml(g.publisher || 'NXB khác')}</strong>
              <div style="font-size:12px;color:#64748b;margin-top:2px;">
                <strong>\${g.count}</strong> đề xuất duyệt · Tổng ước tính: <strong style="color:#0f766e;">\${money(g.totalEstimatedPrice)}</strong>
              </div>
            </div>
            <button class="button button-primary button-small" type="button" onclick="openCreatePoFromPublisher('\${pubName}', \${g.totalEstimatedPrice || 0}, \${jsonIds}, \${jsonTitles})" style="white-space:nowrap;">
              ＋ Lập PO nhóm này
            </button>
          </div>
        \`;
      }).join('');
    } catch (e) {
      container.innerHTML = \`<span style="font-size:13px;color:#ef4444;">Lỗi tải nhóm NXB: \${escapeHtml(e.message)}</span>\`;
    }
  }

  window.openCreatePoFromPublisher = function(publisher, estimatedTotal, requestIds, titles) {
    openCreatePoModal();
    if ($('poSupplier')) $('poSupplier').value = publisher;
    if ($('poTotalAmount')) {
      $('poTotalAmount').value = estimatedTotal;
      checkPoBudgetAlert(estimatedTotal);
    }
    if ($('poNote')) {
      $('poNote').value = \`Đơn đặt hàng gom nhóm từ các đề xuất đã duyệt: \${Array.isArray(titles) ? titles.slice(0, 3).join(', ') + (titles.length > 3 ? '...' : '') : ''}\`;
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
      poCodeInput.value = \`PO-\${yr}-\${pad}\`;
    }

    try {
      const budgetData = await api(\`/acquisitions/budget?year=\${yr}\`);
      activePoBudgetInfo = budgetData;
      if ($('poBudgetYear')) $('poBudgetYear').textContent = budgetData.year || yr;
      if ($('poRemainingBudget')) $('poRemainingBudget').textContent = money(budgetData.remainingBudget || 0);
      if ($('poTotalBudget')) $('poTotalBudget').textContent = money(budgetData.totalBudget || 0);
      checkPoBudgetAlert(Number($('poTotalAmount')?.value || 0));
    } catch (_) {}

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
      msg.innerHTML = \`⚠️ <strong>CẢNH BÁO VƯỢT HẠN MỨC:</strong> Giá trị đơn hàng (\${money(amt)}) vượt quá ngân sách khả dụng còn lại (\${money(remaining)})!\`;
    } else {
      box.style.background = '#f0fdf4';
      box.style.borderColor = '#bbf7d0';
      box.style.color = '#166534';
      const surplus = remaining - amt;
      msg.innerHTML = \`✓ <strong>Hạn mức ngân sách an toàn.</strong> Ngân sách khả dụng còn lại sau đơn này: <strong>\${money(surplus)}</strong>\`;
    }
  }
`;

// Insert PO functions before loadPurchaseOrders
code = code.replace(`  async function loadPurchaseOrders() {`, poFunctionsCode + `\n  async function loadPurchaseOrders() {`);

// In updatePoStatus & deletePoOrder: also call loadBudgets()
code = code.replace(`      notify('Đã cập nhật trạng thái đơn mua hàng.');\n      loadPurchaseOrders();`, `      notify('Đã cập nhật trạng thái đơn mua hàng.');\n      await Promise.all([loadPurchaseOrders(), loadBudgets()]);`);
code = code.replace(`      notify('Đã xóa đơn mua hàng thành công.');\n      loadPurchaseOrders();`, `      notify('Đã xóa đơn mua hàng thành công.');\n      await Promise.all([loadPurchaseOrders(), loadBudgets()]);`);

// In updateAcquisitionStatus: also refresh loadApprovedPublisherGroups()
code = code.replace(`      notify('Đã cập nhật trạng thái đề xuất.');\n      loadAcquisitions();`, `      notify('Đã cập nhật trạng thái đề xuất.');\n      await Promise.all([loadAcquisitions(), loadApprovedPublisherGroups()]);`);

// In loadBudgets: show budget alert banner
const loadBudgetsTarget = `      if ($('cfgQ4')) $('cfgQ4').value = b.q4Allocation || 50000000;\n    } catch (e) {`;
const loadBudgetsRepl = `      if ($('cfgQ4')) $('cfgQ4').value = b.q4Allocation || 50000000;\n
      // Hiển thị cảnh báo vượt định mức chi tiêu trên giao diện Ngân sách
      const budgetSection = $('budgets');
      let banner = $('budgetAlertBanner');
      if (data.totalSpent > data.totalBudget || data.spentPercentage >= 100) {
        if (!banner && budgetSection) {
          banner = document.createElement('div');
          banner.id = 'budgetAlertBanner';
          banner.style.cssText = 'background:#fee2e2;border:2px solid #ef4444;color:#991b1b;padding:12px 16px;border-radius:8px;font-weight:700;margin-bottom:16px;display:flex;align-items:center;gap:10px;';
          budgetSection.insertBefore(banner, budgetSection.children[1] || budgetSection.firstChild);
        }
        if (banner) {
          banner.innerHTML = \`<span style="font-size:20px;">⚠️</span><div>CẢNH BÁO VƯỢT ĐỊNH MỨC CHI TIÊU NĂM HỌC: Tổng chi (\${money(data.totalSpent)}) đã vượt quá ngân sách phê duyệt (\${money(data.totalBudget)})!</div>\`;
          banner.hidden = false;
        }
      } else if (data.spentPercentage >= 85) {
        if (!banner && budgetSection) {
          banner = document.createElement('div');
          banner.id = 'budgetAlertBanner';
          banner.style.cssText = 'background:#fef3c7;border:2px solid #f59e0b;color:#92400e;padding:12px 16px;border-radius:8px;font-weight:700;margin-bottom:16px;display:flex;align-items:center;gap:10px;';
          budgetSection.insertBefore(banner, budgetSection.children[1] || budgetSection.firstChild);
        }
        if (banner) {
          banner.innerHTML = \`<span style="font-size:20px;">⚡</span><div>CẢNH BÁO NGÂN SÁCH: Đã chi \${data.spentPercentage}% hạn mức kế hoạch. Số dư còn lại: \${money(data.remainingBudget)}.</div>\`;
          banner.hidden = false;
        }
      } else if (banner) {
        banner.hidden = true;
      }
    } catch (e) {`;
code = code.replace(loadBudgetsTarget, loadBudgetsRepl);

// Add event listeners for PO creation, tabs and amount check
const poListenersCode = `
    // Quản lý PO & Gom nhóm NXB
    $('openCreatePoDialog')?.addEventListener('click', openCreatePoModal);
    $('refreshApprovedGroupsBtn')?.addEventListener('click', loadApprovedPublisherGroups);
    $('poTotalAmount')?.addEventListener('input', (e) => checkPoBudgetAlert(Number(e.target.value || 0)));

    $('createPurchaseOrderForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        orderCode: $('poCode')?.value.trim(),
        supplierName: $('poSupplier')?.value.trim(),
        supplierPhone: $('poSupplierPhone')?.value.trim() || undefined,
        supplierEmail: $('poSupplierEmail')?.value.trim() || undefined,
        expectedDeliveryDate: $('poExpectedDate')?.value || undefined,
        totalAmount: Number($('poTotalAmount')?.value || 0),
        note: $('poNote')?.value.trim() || undefined,
        requestIds: window._pendingPoRequestIds || [],
      };
      try {
        await api('/acquisitions/orders', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        $('createPurchaseOrderDialog')?.close();
        notify('✓ Đã lập đơn đặt hàng PO thành công và đồng bộ dòng tiền ngân sách!');
        await Promise.all([loadPurchaseOrders(), loadBudgets(), loadApprovedPublisherGroups()]);
      } catch (err) {
        notify(\`Lỗi tạo đơn đặt hàng: \${err.message}\`, true);
      }
    });

    $('acqTabRequests')?.addEventListener('click', () => {
      $('acqTabRequests')?.classList.add('active');
      $('acqTabOrders')?.classList.remove('active');
      if ($('acqRequestsPanel')) $('acqRequestsPanel').hidden = false;
      if ($('acqOrdersPanel')) $('acqOrdersPanel').hidden = true;
      void loadAcquisitions();
    });

    $('acqTabOrders')?.addEventListener('click', () => {
      $('acqTabOrders')?.classList.add('active');
      $('acqTabRequests')?.classList.remove('active');
      if ($('acqOrdersPanel')) $('acqOrdersPanel').hidden = false;
      if ($('acqRequestsPanel')) $('acqRequestsPanel').hidden = true;
      void loadPurchaseOrders();
      void loadApprovedPublisherGroups();
    });
`;

// Insert listeners into event binding area
const listenerTarget = `    $('refreshLoans')?.addEventListener('click', () => void loadBorrowRecords());`;
code = code.replace(listenerTarget, listenerTarget + '\n' + poListenersCode);

if (hadCrlf) {
  code = code.replace(/\n/g, '\r\n');
}

fs.writeFileSync('public/app.js', code, 'utf8');
console.log('Successfully patched public/app.js with CRLF preserved!');
