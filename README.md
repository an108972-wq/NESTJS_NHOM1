# Hệ thống Quản lý Thư viện

NestJS dùng MySQL, TypeORM và JWT; giao diện chạy trực tiếp từ `public/` và được NestJS phục vụ cùng API. `frontend/components/Navbar.tsx` là component Next.js độc lập cho các ứng dụng Next.js tích hợp riêng.

## Chạy ứng dụng

1. Cài dependencies: `npm install`
2. Tạo database MySQL `library_db` và cấu hình kết nối trong `src/app.module.ts`.
3. Với lần chạy đầu tiên trên database trống, đặt `ADMIN_USERNAME` và `ADMIN_PASSWORD` (ít nhất 12 ký tự) để tạo Admin ban đầu. Admin chỉ được bootstrap khi chưa có tài khoản nào.
4. Đặt `JWT_ACCESS_SECRET` và `JWT_REFRESH_SECRET` thành các giá trị bí mật riêng trong môi trường production. Ứng dụng không khởi động production nếu thiếu hai biến này.
5. Để bật nhắc hạn qua email, cấu hình cùng lúc `SMTP_HOST`, `SMTP_PORT` (mặc định 587), `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`. Không cấu hình SMTP thì thông báo in-app vẫn hoạt động và trạng thái email được lưu là chưa cấu hình. Trạng thái SMTP chỉ hiển thị cho Admin tại `/admin/settings`; thông tin SMTP nhạy cảm cần đặt trong môi trường triển khai, không lưu mật khẩu vào cơ sở dữ liệu.
6. Để bật thanh toán tiền phạt VNPay, cấu hình `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_RETURN_URL` (URL public HTTPS của `/payments/vnpay/return`), và tùy chọn `VNPAY_PAYMENT_URL` (mặc định VNPay sandbox) cùng `VNPAY_FRONTEND_URL` (mặc định `/`). Cấu hình IPN URL `https://<domain-api>/payments/vnpay/ipn` trong merchant portal VNPay; endpoint này phải được VNPay truy cập trực tiếp qua HTTPS. Không ghi secret vào mã nguồn hoặc frontend. Production từ chối URL thanh toán/return không dùng HTTPS.
7. Để tạo mã nhận tiền VietQR tại trang `/admin/fines`, cấu hình `VIETQR_BANK_ID`, `VIETQR_ACCOUNT_NO`, `VIETQR_ACCOUNT_NAME`. Ảnh QR được tải từ dịch vụ VietQR; URL ảnh chứa số tiền và mã giao dịch để điền sẵn nội dung chuyển khoản. Nhân viên chỉ xác nhận đã thu sau khi tự đối chiếu tiền thực nhận; VietQR không tự xác thực giao dịch.
8. Chạy `npm run start:dev`; Swagger tại `http://localhost:3000/api/docs`.

Đăng ký công khai tạo tài khoản `READER` với giới hạn mặc định 5 phiếu mượn đang chờ/đang mượn. Admin/Thủ thư được quản lý sách, danh mục, nhà xuất bản, bản sao và nghiệp vụ; API tài khoản chỉ dành cho nhân viên và chỉ Admin được cấp hoặc thay đổi quyền nhân viên. Giới hạn được cấu hình theo tài khoản từ 1 đến 50 đầu sách; hệ thống từ chối yêu cầu vượt giới hạn và không cho giảm giới hạn dưới số phiếu đang hoạt động.

## API chính

- `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`
- `GET /books/search?keyword=&categoryId=&status=available|unavailable&publicationYear=&page=&limit=` hỗ trợ tìm kiếm đa tiêu chí; `GET /books?search=&categoryId=&availability=available|unavailable&page=&limit=` vẫn tương thích
- `GET /books/barcode/:barcode` tra cứu bản sao theo mã barcode
- Nhân viên dùng `GET /books/:bookId/copies`, `POST /books/:bookId/copies` và `PATCH /books/:bookId/copies/:copyId` để quản lý mã barcode, tình trạng (sẵn sàng, đang mượn, bảo trì, hỏng, mất) và vị trí từng bản sao; `GET /books/:bookId/copies/labels` tạo barcode Code 128 để in nhãn hoặc lưu PDF từ trình duyệt
- Nhân viên nhập tối đa 500 đầu sách mỗi lần qua `POST /books/import` bằng tệp CSV hoặc XLSX; API báo kết quả và lỗi theo từng dòng
- `POST /borrow/:bookId` tạo yêu cầu chờ duyệt; nhân viên dùng `POST /borrow/:recordId/approve` hoặc `/reject`
- Có thể dùng `POST /borrow/barcode/:barcode` để tạo yêu cầu theo bản sao đã quét; nhân viên tạo phiếu chờ duyệt cho độc giả qua `POST /borrow/staff-barcode` với `{ "userId": 1, "barcode": "COPY-..." }` và trả nhanh qua `POST /borrow/return/barcode/:barcode`
- `POST /borrow/:recordId/extend` gia hạn tối đa một lần; nhân viên xác nhận trả tại `POST /borrow/return/:recordId` với `{ "condition": "NORMAL" | "DAMAGED" | "LOST" }`
- `GET /borrow/mine`, `POST /payments/fines/:recordId` tạo URL thanh toán VNPay cho chủ phiếu (hoặc nhân viên); trả sách quá hạn tạo khoản phạt theo cấu hình mỗi ngày và bản ghi `fine_payments`. Callback VNPay đã xác minh qua `GET /payments/vnpay/ipn` hoặc xác nhận thu trực tiếp qua `POST /borrow/pay-fine/:recordId` (chỉ nhân viên) mới ghi nhận tiền phạt đã thanh toán.
- `GET /borrow/fines` (nhân viên) trả danh sách quá hạn, hỏng/mất và lịch sử giao dịch tiền phạt. Khi trả sách hỏng/mất, nhân viên gửi thêm `damageFineAmount`; khoản này được cộng với tiền phạt trễ hạn nếu có.
- Nhân viên quầy có thể ghi nhận vi phạm trực tiếp qua `POST /borrow/fines/manual` với độc giả, loại vi phạm, mô tả, số tiền và barcode (bắt buộc nếu là sách hỏng/mất); thanh toán qua `POST /borrow/fines/manual/:fineId/pay` bằng `CASH` hoặc `VIETQR`; miễn/giảm bằng `POST /borrow/fines/manual/:fineId/waive` hoặc `/borrow/fines/borrow/:recordId/waive` với số tiền và lý do. Các khoản miễn giảm được lưu trong sổ điều chỉnh và khoản nợ còn lại vẫn được kiểm tra khi mượn/đặt giữ.
- `PATCH /books/:bookId/copies/:copyId` cho phép nhân viên cập nhật bản sao hỏng/bảo trì thành `AVAILABLE` khi sửa xong hoặc `DISPOSED` khi thanh lý/hủy; bản sao disposed không thể được mượn.
- `GET /users` (nhân viên), `POST /users`, `PATCH /users/:id`, `PATCH /users/:id/status`, `GET /users/:id/history`; hồ sơ độc giả lưu ngày cấp/hết hạn thẻ. Thẻ hết hạn chặn tạo phiếu mượn, duyệt mượn và đặt giữ cho đến khi nhân viên gia hạn.
- `GET/POST /categories`, `GET/POST /publishers`, `GET/POST /reviews/book/:bookId`; nhân viên kiểm duyệt danh sách qua `GET /reviews/admin/all` và gỡ đánh giá qua `DELETE /reviews/:reviewId`
- `POST /reservations/books/:bookId` xếp hàng khi sách hết; khi có bản sao trả về, hệ thống giữ sách cho người đầu hàng trong 48 giờ. Dùng `GET /reservations/mine`, `POST /reservations/:id/claim` hoặc `DELETE /reservations/:id`.
- `POST /borrow/:recordId/renew` gia hạn (tối đa một lần, trước ngày đến hạn); `/extend` vẫn được giữ tương thích.
- `GET /notifications/mine` trả về thông báo in-app và số chưa đọc; `PATCH /notifications/:id/read` đánh dấu đã đọc. Worker kiểm tra hạn trả mỗi ngày, gửi email nếu SMTP và email độc giả đã cấu hình.
- `GET /reports/dashboard` và `GET /admin/dashboard-stats` (Admin/Thủ thư)
- `GET /system/settings` (Admin/Thủ thư), `PATCH /system/settings` (Admin) quản lý giới hạn phiếu mượn toàn cục, số ngày mượn và tiền phạt/ngày; mặc định lần lượt là 5, 14 và 5.000 VNĐ. Gia hạn thêm 14 ngày.
- `GET /users/:id/profile` trả lịch sử mượn, số tiền phạt và sách đang giữ; độc giả chỉ xem hồ sơ của mình, nhân viên xem mọi hồ sơ.

Giao diện nhân viên sử dụng bố cục dashboard có sidebar thu gọn, tìm kiếm nhanh kèm gợi ý, bộ lọc sách theo thể loại/tồn kho/năm xuất bản và ô tìm trực tiếp phiếu mượn/độc giả. Endpoint dashboard chỉ cho phép Admin/Thủ thư và trả bốn chỉ số tổng quan cùng số liệu báo cáo. Mỗi đầu sách tạo bản sao có barcode riêng; giao diện quản lý trạng thái sẵn sàng/đang mượn/bảo trì/hỏng/mất, vị trí và in nhãn barcode để lưu PDF. Nhân viên có thể nhập CSV/XLSX theo mẫu, xuất danh sách sách CSV, kiểm duyệt đánh giá, quét barcode cùng chọn độc giả để tạo phiếu chờ duyệt, và quản lý ngày cấp/hết hạn thẻ. Chi tiết sách hiển thị mô tả, ảnh bìa từ URL, thể loại, nhà xuất bản và vị trí kệ/tầng/dãy. Access token hết hạn được làm mới tự động một lần cho các yêu cầu đồng thời bằng refresh token; refresh token xoay vòng theo cơ chế hiện có. Giao diện nhân viên quản lý độc giả và khóa/mở tài khoản, giới hạn mượn, duyệt mượn/trả và tiền phạt; Admin có giao diện thêm/sửa/ẩn sách và quản lý bản sao. Độc giả có thể thanh toán tiền phạt qua VNPay khi cấu hình merchant; giao dịch chỉ thành công sau chữ ký và số tiền IPN được xác minh. Dashboard có biểu đồ top sách, xuất Excel tương thích `.xls` và in/lưu PDF qua hộp thoại in trình duyệt. Email nhắc hạn/quá hạn chạy theo lịch mỗi ngày sau khi cấu hình SMTP.

Card sách hiển thị ảnh bìa từ URL an toàn với chữ cái thay thế nếu ảnh tải lỗi, thể loại, nhà xuất bản, tồn kho và vị trí lấy từ bản sao khi cần. Danh mục rỗng có hướng dẫn và thao tác xóa bộ lọc; tên sách và tác giả cần ít nhất hai ký tự sau khi trim ở cả form và API. Trang nhà xuất bản hỗ trợ tìm theo tên/email/điện thoại, xác nhận xóa qua hộp thoại và kiểm tra tên, email, số điện thoại ở form/API. Dashboard có lối tắt nghiệp vụ, danh sách duyệt phiếu chờ và biểu đồ xu hướng theo 8 tuần/12 tháng. Hồ sơ độc giả cho phép khóa/mở tài khoản, tạo phiếu mượn với độc giả được điền sẵn và gia hạn thẻ 6 tháng/1 năm. Trang độc giả có thao tác gia hạn thẻ bằng ngày hết hạn mới; trang mượn/trả có thể truy cập qua `/admin/borrow-return`, hỗ trợ tạo phiếu bằng barcode, quét trả sách và in nhãn barcode ra PDF. Phiếu mượn và phiếu thu phạt in theo khổ bill 80mm.

Các trang quản trị dùng URL riêng trong SPA: `/admin` chuyển đến `/admin/dashboard`; các trang gồm `/admin/books`, `/admin/borrow-return` (tương thích `/admin/borrow` và `/admin/loans`), `/admin/reservations`, `/admin/fines`, `/admin/users` (tương thích `/admin/readers`), `/admin/categories`, `/admin/publishers`, `/admin/reports` và `/admin/settings`. Hồ sơ cá nhân dùng `/admin/users/:id`; độc giả chỉ xem được hồ sơ của mình. Sidebar và nút Back/Forward của trình duyệt chuyển route mà không tải lại trang; mỗi route chỉ hiển thị khu vực nghiệp vụ tương ứng. Dashboard cảnh báo hạn trả và tồn kho thấp. Báo cáo Excel/PDF gồm danh sách phiếu, nợ/quá hạn, sách hỏng/mất và lịch sử thanh toán.

## Mô hình dữ liệu và DTO

- `Category` và `Publisher` là bảng cha chuẩn hóa; `Book` giữ khóa ngoại `categoryId`/`publisherId` thay vì lặp lại tên thể loại hoặc nhà xuất bản. Tạo/cập nhật sách nhận ID quan hệ trong DTO.
- `Reservation` liên kết độc giả, đầu sách và (khi sẵn sàng) bản sao cụ thể. `WAITING → READY → FULFILLED`; `CANCELLED`/`EXPIRED` là trạng thái kết thúc. Trả sách bình thường hoặc từ chối yêu cầu mượn sẽ cấp bản sao cho người chờ lâu nhất trong cùng transaction.
- `Notification` liên kết phiếu mượn và độc giả, lưu trạng thái đọc cùng kết quả gửi email. Job gửi một thông báo `DUE_SOON` trong 48 giờ trước hạn và một thông báo `OVERDUE`.
- Cấu hình thư viện gồm số phiếu mượn tối đa, ngày mượn, ngày gia hạn (7–14), và phí trễ hạn/ngày. Admin cấu hình qua `/admin/settings`; gia hạn áp dụng số ngày hiện được cấu hình.
- `FinePayment` ghi nhận mã tham chiếu duy nhất, số tiền, phương thức, trạng thái và mã giao dịch VNPay. Return URL chỉ hiển thị trạng thái đã ký; IPN đã kiểm tra HMAC-SHA512, mã merchant, số tiền và trạng thái hoặc nhân viên xác nhận thu trực tiếp mới chuyển tiền phạt sang `PAID`.
- DTO dùng `class-validator`; Controller áp dụng `JwtAuthGuard`/`RolesGuard`; Service chứa quy tắc nghiệp vụ và thao tác repository/transaction; Entity chỉ định nghĩa quan hệ và ràng buộc CSDL.

Giao diện tĩnh mặc định gọi API cùng origin. `frontend/components/Navbar.tsx` cần truyền `user`, `accessToken`, `refreshToken` và `onLogout`; truyền `onTokensRefreshed` để đồng bộ hai token đã xoay vòng về auth state của ứng dụng Next.js. Có thể đặt `NEXT_PUBLIC_API_URL` cho URL backend. Cài component cùng CSS module vào ứng dụng Next.js đang có và chỉnh các đường dẫn menu theo route thực tế của frontend.

## Kiểm tra

- Unit tests: `npm test`
- Build: `npm run build`
- Lint: `npm run lint`
