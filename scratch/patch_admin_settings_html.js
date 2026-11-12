const fs = require('fs');

const path = 'public/admin.html';
let html = fs.readFileSync(path, 'utf8');

const startIndex = html.indexOf('<section id="settings"');
if (startIndex === -1) {
  console.error('section id="settings" not found!');
  process.exit(1);
}

const endIndex = html.indexOf('</section>', startIndex);
if (endIndex === -1) {
  console.error('closing </section> not found!');
  process.exit(1);
}

const newSettingsHtml = `<section id="settings" class="content-section admin-only" data-admin-route="settings" hidden>
      <div class="section-heading">
        <div>
          <span class="eyebrow" style="color:#6f42c1;font-weight:700;">HỆ THỐNG & QUẢN TRỊ TOÀN DIỆN</span>
          <h2>Cấu hình hệ thống thông minh (System Settings)</h2>
          <p>Thiết lập quy tắc tự động hóa khóa thẻ, phân bổ hạn mức theo nhóm bạn đọc, cổng thanh toán trực tuyến & sao lưu cơ sở dữ liệu.</p>
        </div>
        <div class="button-row">
          <button id="triggerAutomationRulesBtn" class="button button-light" type="button" title="Quét ngay các bạn đọc quá hạn lâu ngày để tự động khóa tài khoản và gửi nhắc nhở">
            ⚡ Chạy quy tắc tự động hóa
          </button>
          <button id="downloadBackupSqlBtn" class="button button-light" type="button" title="Tải xuống toàn bộ cơ sở dữ liệu dưới dạng tệp tin SQL">
            📥 Tải bản sao lưu SQL (.sql)
          </button>
          <button id="saveAllSettingsTopBtn" class="button button-primary" type="button" style="background:#dc3545;border-color:#dc3545;">
            💾 Lưu cấu hình
          </button>
        </div>
      </div>

      <form id="settingsForm">
        <div style="display:flex;flex-direction:column;gap:24px;">

          <!-- KHỐI 1: TỰ ĐỘNG HÓA KHÓA TÀI KHOẢN & CẢNH BÁO QUÁ HẠN -->
          <div class="report-card" style="margin:0;border-top:4px solid #dc3545;">
            <div class="section-heading compact" style="margin-bottom:14px;">
              <div>
                <span class="eyebrow" style="color:#dc3545;">AUTOMATION RULES</span>
                <h3 style="margin-top:2px;">🤖 Quy tắc Tự động hóa Khóa tài khoản & Cảnh báo quá hạn</h3>
                <p>Bảo vệ tài sản thư viện bằng cách tự động ngắt quyền mượn sách đối với bạn đọc vi phạm kéo dài.</p>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:16px;">
              <div style="background:#fef2f2;border:1px solid #fecaca;padding:16px;border-radius:10px;display:flex;flex-direction:column;gap:12px;">
                <label style="font-weight:700;color:#991b1b;display:flex;align-items:center;gap:8px;cursor:pointer;">
                  <input id="settingEnableAutoLockOverdue" type="checkbox" checked style="width:18px;height:18px;">
                  <span>Tự động khóa tài khoản khi có sách quá hạn lâu ngày</span>
                </label>
                <div>
                  <span style="font-size:13px;color:#7f1d1d;">Số ngày quá hạn tối đa để kích hoạt khóa:</span>
                  <div style="display:flex;align-items:center;gap:8px;margin-top:6px;">
                    <input id="settingAutoLockOverdueDays" type="number" min="1" max="365" value="30" style="width:110px;height:38px;font-weight:700;font-size:15px;text-align:center;">
                    <span style="font-size:13px;color:#991b1b;font-weight:600;">ngày (Mặc định: 30 ngày)</span>
                  </div>
                </div>
                <small style="color:#b91c1c;font-size:11.5px;line-height:1.4;">
                  ℹ Khi kích hoạt, độc giả có sách mượn quá hạn trên số ngày này sẽ tự động bị khóa thẻ và thu hồi quyền đặt sách mới.
                </small>
              </div>

              <div style="background:#f5f3ff;border:1px solid #ddd6fe;padding:16px;border-radius:10px;display:flex;flex-direction:column;gap:12px;">
                <label style="font-weight:700;color:#5b21b6;display:flex;align-items:center;gap:8px;cursor:pointer;">
                  <input id="settingEnableAutoEmailReminders" type="checkbox" checked style="width:18px;height:18px;">
                  <span>Tự động gửi email cảnh báo nhắc hạn trả sách</span>
                </label>
                <div>
                  <span style="font-size:13px;color:#4c1d95;">Gửi thông báo nhắc trước ngày đến hạn:</span>
                  <div style="display:flex;align-items:center;gap:8px;margin-top:6px;">
                    <input id="settingReminderDaysBeforeDue" type="number" min="1" max="14" value="2" style="width:110px;height:38px;font-weight:700;font-size:15px;text-align:center;">
                    <span style="font-size:13px;color:#5b21b6;font-weight:600;">ngày (Mặc định: 2 ngày)</span>
                  </div>
                </div>
                <small style="color:#6d28d9;font-size:11.5px;line-height:1.4;">
                  ℹ Hệ thống quét các phiếu mượn sắp đến hạn để gửi thông báo chuông và email trực tiếp đến hộp thư của độc giả.
                </small>
              </div>

              <div style="background:#fffbeb;border:1px solid #fde68a;padding:16px;border-radius:10px;display:flex;flex-direction:column;gap:12px;">
                <span style="font-weight:700;color:#92400e;">Ngưỡng nợ phạt tối đa trước khi tạm khóa mượn:</span>
                <div style="display:flex;align-items:center;gap:8px;margin-top:2px;">
                  <input id="settingFineLockThreshold" type="number" min="0" max="10000000" step="5000" value="50000" style="width:140px;height:38px;font-weight:700;font-size:15px;text-align:center;">
                  <span style="font-size:13px;color:#b45309;font-weight:600;">VNĐ</span>
                </div>
                <small style="color:#b45309;font-size:11.5px;line-height:1.4;">
                  ℹ Nếu tiền phạt chưa nộp vượt quá mức này, độc giả không được phép mượn thêm sách cho đến khi thanh toán.
                </small>
              </div>
            </div>
          </div>

          <!-- KHỐI 2: PHÂN QUYỀN GIỚI HẠN MƯỢN THEO NHÓM ĐỘC GIẢ (ROLE-BASED QUOTAS) -->
          <div class="report-card" style="margin:0;border-top:4px solid #6f42c1;">
            <div class="section-heading compact" style="margin-bottom:14px;">
              <div>
                <span class="eyebrow" style="color:#6f42c1;">ROLE-BASED BORROWING QUOTAS</span>
                <h3 style="margin-top:2px;">👥 Quản lý Giới hạn Mượn theo Nhóm Độc giả</h3>
                <p>Cấu hình định mức số sách và thời hạn mượn riêng biệt theo từng đối tượng học tập / nghiên cứu.</p>
              </div>
            </div>

            <div class="table-wrap" style="margin-bottom:16px;">
              <table>
                <thead>
                  <tr style="background:#f8fafc;">
                    <th style="width:200px;">Đối tượng độc giả</th>
                    <th style="width:140px;">Mã nhóm</th>
                    <th>Số sách mượn tối đa</th>
                    <th>Thời hạn mượn (ngày)</th>
                    <th>Mô tả quyền lợi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>🎓 Sinh viên (Đại học/CĐ)</strong></td>
                    <td><code>STUDENT</code></td>
                    <td>
                      <input id="quotaStudentMax" type="number" min="1" max="50" value="5" style="width:90px;height:34px;text-align:center;font-weight:700;"> cuốn
                    </td>
                    <td>
                      <input id="quotaStudentDays" type="number" min="1" max="90" value="14" style="width:90px;height:34px;text-align:center;font-weight:700;"> ngày
                    </td>
                    <td><small style="color:#64748b;">Mức tiêu chuẩn cho sinh viên chính quy</small></td>
                  </tr>
                  <tr>
                    <td><strong>👨‍🏫 Giảng viên / Cán bộ trường</strong></td>
                    <td><code>LECTURER</code></td>
                    <td>
                      <input id="quotaLecturerMax" type="number" min="1" max="50" value="10" style="width:90px;height:34px;text-align:center;font-weight:700;"> cuốn
                    </td>
                    <td>
                      <input id="quotaLecturerDays" type="number" min="1" max="90" value="30" style="width:90px;height:34px;text-align:center;font-weight:700;"> ngày
                    </td>
                    <td><small style="color:#64748b;">Ưu tiên định mức cao phục vụ giảng dạy</small></td>
                  </tr>
                  <tr>
                    <td><strong>🔬 Học viên Cao học / NCS</strong></td>
                    <td><code>RESEARCHER</code></td>
                    <td>
                      <input id="quotaResearcherMax" type="number" min="1" max="50" value="15" style="width:90px;height:34px;text-align:center;font-weight:700;"> cuốn
                    </td>
                    <td>
                      <input id="quotaResearcherDays" type="number" min="1" max="90" value="45" style="width:90px;height:34px;text-align:center;font-weight:700;"> ngày
                    </td>
                    <td><small style="color:#64748b;">Thời gian mượn dài ngày phục vụ đề tài nghiên cứu</small></td>
                  </tr>
                  <tr>
                    <td><strong>🌐 Bạn đọc vãng lai / Khác</strong></td>
                    <td><code>OTHER</code></td>
                    <td>
                      <input id="quotaOtherMax" type="number" min="1" max="50" value="3" style="width:90px;height:34px;text-align:center;font-weight:700;"> cuốn
                    </td>
                    <td>
                      <input id="quotaOtherDays" type="number" min="1" max="90" value="7" style="width:90px;height:34px;text-align:center;font-weight:700;"> ngày
                    </td>
                    <td><small style="color:#64748b;">Hạn mức tối thiểu cho độc giả tự do</small></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:14px;border-radius:8px;">
              <div style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:10px;">⚙️ Tham số chung dự phòng (System Fallback Defaults):</div>
              <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;">
                <label style="font-size:12px;">
                  <span>Mặc định mượn tối đa:</span>
                  <input id="settingMaxLoans" type="number" min="1" max="50" value="5" required style="height:36px;">
                </label>
                <label style="font-size:12px;">
                  <span>Mặc định số ngày mượn:</span>
                  <input id="settingBorrowDays" type="number" min="1" max="60" value="14" required style="height:36px;">
                </label>
                <label style="font-size:12px;">
                  <span>Số ngày gia hạn mỗi lần:</span>
                  <input id="settingRenewalDays" type="number" min="7" max="14" value="14" required style="height:36px;">
                </label>
                <label style="font-size:12px;">
                  <span>Tiền phạt trễ hạn / ngày (VNĐ):</span>
                  <input id="settingDailyFine" type="number" min="0" max="1000000" step="1000" value="5000" required style="height:36px;">
                </label>
              </div>
            </div>
          </div>

          <!-- KHỐI 3: CỔNG THANH TOÁN TRỰC TUYẾN & BIỂU PHÍ DỊCH VỤ -->
          <div class="report-card" style="margin:0;border-top:4px solid #10b981;">
            <div class="section-heading compact" style="margin-bottom:14px;">
              <div>
                <span class="eyebrow" style="color:#059669;">ONLINE PAYMENT GATEWAYS</span>
                <h3 style="margin-top:2px;">💳 Cấu hình Cổng thanh toán trực tuyến & Phí dịch vụ</h3>
                <p>Kết nối VietQR, VNPay, MoMo để độc giả có thể nộp tiền phạt hoặc đóng phí làm thẻ trực tiếp ngay trên Cổng OPAC.</p>
              </div>
            </div>

            <!-- VietQR Integration -->
            <div style="margin-bottom:18px;background:#f0fdf4;border:1px solid #bbf7d0;padding:16px;border-radius:10px;">
              <div style="display:flex;align-items:center;gap:8px;font-weight:700;color:#166534;font-size:14px;margin-bottom:10px;">
                <span>⚡ Cấu hình VietQR Chuyển khoản tức thì (Miễn phí cổng, quét mã mọi App ngân hàng):</span>
              </div>
              <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;">
                <label style="font-size:12px;">
                  <span style="font-weight:600;color:#14532d;">Ngân hàng thụ hưởng (Bank ID / BIN):</span>
                  <input id="settingVietqrBankId" placeholder="Ví dụ: MBBank, VCB, BIDV..." value="MBBank" style="height:36px;">
                </label>
                <label style="font-size:12px;">
                  <span style="font-weight:600;color:#14532d;">Số tài khoản ngân hàng:</span>
                  <input id="settingVietqrAccountNo" placeholder="Ví dụ: 0388888888" value="0388888888" style="height:36px;font-family:monospace;font-weight:700;">
                </label>
                <label style="font-size:12px;">
                  <span style="font-weight:600;color:#14532d;">Tên chủ tài khoản (Viết hoa không dấu):</span>
                  <input id="settingVietqrAccountName" placeholder="THU VIEN DAI HOC" value="THU VIEN DAI HOC" style="height:36px;font-weight:700;">
                </label>
              </div>
            </div>

            <!-- VNPay & MoMo API Keys -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:16px;margin-bottom:16px;">
              <!-- VNPay -->
              <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:14px;border-radius:8px;">
                <div style="font-weight:700;color:#0284c7;font-size:13px;margin-bottom:8px;">🏦 Cổng VNPay Gateway:</div>
                <div style="display:flex;flex-direction:column;gap:8px;">
                  <label style="font-size:11px;"><span>TMN Code:</span><input id="settingVnpayTmnCode" placeholder="Mã website VNPay" style="height:34px;"></label>
                  <label style="font-size:11px;"><span>Hash Secret:</span><input id="settingVnpayHashSecret" type="password" placeholder="Khóa bảo mật VNPay" style="height:34px;"></label>
                  <label style="font-size:11px;"><span>URL cổng thanh toán:</span><input id="settingVnpayUrl" value="https://sandbox.vnpayment.vn/paymentv2/vpcpay.html" style="height:34px;"></label>
                </div>
              </div>
              <!-- MoMo -->
              <div style="background:#fdf2f8;border:1px solid #fbcfe8;padding:14px;border-radius:8px;">
                <div style="font-weight:700;color:#be185d;font-size:13px;margin-bottom:8px;">👛 Cổng Ví MoMo:</div>
                <div style="display:flex;flex-direction:column;gap:8px;">
                  <label style="font-size:11px;"><span>Partner Code:</span><input id="settingMomoPartnerCode" placeholder="Mã đối tác MoMo" style="height:34px;"></label>
                  <label style="font-size:11px;"><span>Access Key:</span><input id="settingMomoAccessKey" placeholder="Khóa truy cập MoMo" style="height:34px;"></label>
                  <label style="font-size:11px;"><span>Secret Key:</span><input id="settingMomoSecretKey" type="password" placeholder="Khóa bí mật MoMo" style="height:34px;"></label>
                </div>
              </div>
            </div>

            <!-- Biểu phí dịch vụ -->
            <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:14px;border-radius:8px;">
              <div style="font-weight:700;color:#334155;font-size:13px;margin-bottom:10px;">🏷️ Biểu phí dịch vụ độc giả:</div>
              <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:14px;">
                <label style="font-size:12px;">
                  <span>Phí cấp thẻ độc giả mới (VNĐ):</span>
                  <input id="settingCardRegistrationFee" type="number" min="0" step="5000" value="20000" style="height:36px;font-weight:700;">
                </label>
                <label style="font-size:12px;">
                  <span>Phí cấp lại thẻ mất / hỏng (VNĐ):</span>
                  <input id="settingCardReissueFee" type="number" min="0" step="5000" value="50000" style="height:36px;font-weight:700;">
                </label>
              </div>
            </div>
          </div>

          <!-- KHỐI 4: SAO LƯU & BẢO TRÌ CƠ SỞ DỮ LIỆU TỰ ĐỘNG -->
          <div class="report-card" style="margin:0;border-top:4px solid #f59e0b;">
            <div class="section-heading compact" style="margin-bottom:14px;">
              <div>
                <span class="eyebrow" style="color:#d97706;">DATABASE BACKUP & MAINTENANCE</span>
                <h3 style="margin-top:2px;">💾 Sao lưu & Phục hồi Cơ sở dữ liệu tự động (Auto Backup)</h3>
                <p>Thiết lập lịch trình sao lưu tự động và tải xuống tệp tin SQL dự phòng phòng ngừa sự cố.</p>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:16px;margin-bottom:16px;">
              <div style="background:#fffbeb;border:1px solid #fde68a;padding:16px;border-radius:10px;display:flex;flex-direction:column;gap:10px;">
                <label style="font-weight:700;color:#92400e;">Lập lịch sao lưu tự động:</label>
                <select id="settingAutoBackupSchedule" style="height:38px;font-size:14px;font-weight:600;">
                  <option value="DAILY">Hàng ngày (Daily - 00:00 đêm)</option>
                  <option value="WEEKLY">Hàng tuần (Weekly - Chủ nhật)</option>
                  <option value="OFF">Tắt sao lưu tự động</option>
                </select>
                <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
                  <span style="font-size:12px;color:#78350f;">Thời gian lưu trữ bản sao lưu:</span>
                  <input id="settingBackupRetentionDays" type="number" min="1" max="365" value="30" style="width:70px;height:32px;text-align:center;font-weight:700;">
                  <span style="font-size:12px;color:#78350f;">ngày</span>
                </div>
              </div>

              <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:16px;border-radius:10px;display:flex;flex-direction:column;justify-content:space-between;gap:12px;">
                <div>
                  <span style="font-size:12px;color:#64748b;font-weight:600;">Trạng thái bản sao lưu gần nhất:</span>
                  <div id="lastBackupStatusText" style="font-size:15px;font-weight:700;color:#1e293b;margin-top:4px;">
                    Chưa có lịch sử sao lưu
                  </div>
                  <small style="color:#64748b;font-size:11.5px;">Bản sao lưu chứa toàn bộ cấu trúc và dữ liệu của tất cả các bảng trong hệ thống.</small>
                </div>
                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                  <button id="triggerManualBackupBtn" class="button button-light button-small" type="button" style="color:#b45309;font-weight:600;">
                    🔄 Sao lưu dữ liệu ngay
                  </button>
                  <button id="downloadBackupSqlCardBtn" class="button button-primary button-small" type="button" style="background:#6f42c1;border-color:#6f42c1;">
                    📥 Tải xuống file .SQL
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- KHỐI 5: CẤU HÌNH EMAIL THÔNG BÁO (SMTP) -->
          <div class="report-card smtp-settings" style="margin:0;border-top:4px solid #64748b;">
            <div class="section-heading compact" style="margin-bottom:8px;">
              <div>
                <span class="eyebrow" style="color:#64748b;">MAIL SERVER STATUS</span>
                <h3 style="margin-top:2px;">✉️ Trạng thái máy chủ Email thông báo (SMTP)</h3>
              </div>
            </div>
            <p id="smtpConfigurationStatus" style="font-weight:600;color:#1e293b;">Đang kiểm tra cấu hình SMTP…</p>
            <p style="font-size:12px;color:#64748b;margin:0;">
              Để đảm bảo an toàn tuyệt đối và tránh lưu mật khẩu trong cơ sở dữ liệu, thông số email được cấu hình qua các biến môi trường:
              <code>SMTP_HOST</code>, <code>SMTP_PORT</code>, <code>SMTP_SECURE</code>, <code>SMTP_USER</code>, <code>SMTP_PASSWORD</code> và <code>SMTP_FROM</code>.
            </p>
          </div>

          <!-- NÚT LƯU CUỐI TRANG -->
          <div style="text-align:right;padding-top:10px;">
            <button class="button button-primary" type="submit" style="padding:10px 28px;font-size:15px;font-weight:700;background:#dc3545;border-color:#dc3545;">
              💾 Lưu toàn bộ cấu hình hệ thống
            </button>
          </div>
        </div>
      </form>
    </section>`;

const fullNewHtml = html.slice(0, startIndex) + newSettingsHtml + html.slice(endIndex + '</section>'.length);
fs.writeFileSync(path, fullNewHtml, 'utf8');
console.log('Successfully replaced settings section in public/admin.html!');

