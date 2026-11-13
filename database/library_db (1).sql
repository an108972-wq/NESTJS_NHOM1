-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Máy chủ: 127.0.0.1
-- Thời gian đã tạo: Th10 13, 2026 lúc 06:35 AM
-- Phiên bản máy phục vụ: 10.4.32-MariaDB
-- Phiên bản PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Cơ sở dữ liệu: `library_db`
--

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `academic_seminars`
--

CREATE TABLE `academic_seminars` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `theme` varchar(255) DEFAULT NULL,
  `speakerNames` varchar(255) NOT NULL,
  `location` varchar(255) NOT NULL DEFAULT 'Hội trường Đa năng - Tầng 4 Thư viện',
  `eventDate` datetime NOT NULL,
  `durationMinutes` int(11) NOT NULL DEFAULT 90,
  `maxSeats` int(11) NOT NULL DEFAULT 100,
  `registeredSeats` int(11) NOT NULL DEFAULT 0,
  `status` varchar(255) NOT NULL DEFAULT 'UPCOMING',
  `description` text DEFAULT NULL,
  `attendanceListJson` text DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `academic_seminars`
--

INSERT INTO `academic_seminars` (`id`, `title`, `theme`, `speakerNames`, `location`, `eventDate`, `durationMinutes`, `maxSeats`, `registeredSeats`, `status`, `description`, `attendanceListJson`, `createdAt`, `updatedAt`) VALUES
(1, 'Tọa đàm Khoa học: Trí tuệ Nhân tạo Tạo sinh & Tương lai của Công bố Học thuật', 'Nghiên cứu khoa học & AI', 'GS. TS. Ngô Bảo Châu & TS. Lê Viết Quốc (Google DeepMind)', 'Hội trường Đa năng - Tầng 4 Thư viện Trung tâm', '2026-11-18 07:35:22', 120, 150, 142, 'UPCOMING', 'Thảo luận sâu về xu hướng tích hợp AI trong nghiên cứu liên ngành, liêm chính học thuật và bảo vệ bản quyền tri thức số.', '[{\"id\":\"REG-001\",\"name\":\"Nguyễn Văn Đạt\",\"email\":\"dat.nv@bk.edu.vn\",\"cardNumber\":\"SV2022-101\",\"checkedIn\":true,\"time\":\"08:15\"},{\"id\":\"REG-002\",\"name\":\"Lê Thu Trang\",\"email\":\"trang.lt@bk.edu.vn\",\"cardNumber\":\"SV2022-205\",\"checkedIn\":true,\"time\":\"08:22\"},{\"id\":\"REG-003\",\"name\":\"Trần Hoàng Long\",\"email\":\"long.th@bk.edu.vn\",\"cardNumber\":\"SV2021-340\",\"checkedIn\":false,\"time\":null}]', '2026-11-13 07:35:22.560676', '2026-11-13 07:35:22.560676'),
(2, 'Giới thiệu Bộ sách Chuyên khảo: Lịch sử Kỹ thuật & Công nghiệp Việt Nam Thế kỷ XX', 'Giới thiệu sách mới', 'Nhà nghiên cứu Nguyễn Đình Đầu & PGS. Trần Bá Đệ', 'Phòng Hội thảo Chuyên đề B - Tầng 2', '2026-11-25 07:35:22', 90, 80, 58, 'UPCOMING', 'Tác giả giao lưu trực tiếp với độc giả, ký tặng sách và trao tặng 50 bản sách đặc biệt cho kho tài liệu thư viện.', '[]', '2026-11-13 07:35:22.562321', '2026-11-13 07:35:22.562321'),
(3, 'Diễn đàn Sinh viên & Khởi nghiệp: Từ Ý tưởng Đồ án đến Sản phẩm Thương mại hóa', 'Tọa đàm khởi nghiệp', 'Shark Phạm Thanh Hưng & Cựu SV Founder Startup Unicorn', 'Sảnh Triển lãm Tầng 1 Thư viện', '2026-11-10 07:35:22', 150, 200, 195, 'ENDED', 'Chia sẻ kinh nghiệm khai thác bằng sáng chế và CSDL sở hữu trí tuệ trong thư viện để phát triển dự án kinh doanh.', '[{\"id\":\"REG-001\",\"name\":\"Nguyễn Văn Đạt\",\"email\":\"dat.nv@bk.edu.vn\",\"cardNumber\":\"SV2022-101\",\"checkedIn\":true,\"time\":\"08:15\"},{\"id\":\"REG-002\",\"name\":\"Lê Thu Trang\",\"email\":\"trang.lt@bk.edu.vn\",\"cardNumber\":\"SV2022-205\",\"checkedIn\":true,\"time\":\"08:22\"},{\"id\":\"REG-003\",\"name\":\"Trần Hoàng Long\",\"email\":\"long.th@bk.edu.vn\",\"cardNumber\":\"SV2021-340\",\"checkedIn\":false,\"time\":null}]', '2026-11-13 07:35:22.564398', '2026-11-13 07:35:22.564398');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL,
  `action` varchar(50) NOT NULL,
  `module` varchar(50) NOT NULL,
  `description` text NOT NULL,
  `performerId` int(11) DEFAULT NULL,
  `performerName` varchar(150) DEFAULT NULL,
  `performerRole` varchar(50) DEFAULT NULL,
  `ipAddress` varchar(50) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `level` varchar(20) NOT NULL DEFAULT 'INFO'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `action`, `module`, `description`, `performerId`, `performerName`, `performerRole`, `ipAddress`, `createdAt`, `level`) VALUES
(1, 'SYSTEM_INIT', 'SYSTEM', 'Hệ thống Quản lý Thư viện số khởi động thành công.', NULL, 'Hệ thống', 'SYSTEM', '127.0.0.1', '2026-11-03 15:43:57.814000', 'INFO'),
(2, 'LOGIN', 'AUTH', 'Quản trị viên đăng nhập vào hệ thống quản lý.', NULL, 'admin', 'ADMIN', '127.0.0.1', '2026-11-04 15:43:57.814000', 'INFO'),
(3, 'STOCK_CHECK', 'INVENTORY', 'Thực hiện kiểm kê đối soát tự động toàn bộ kho sách.', NULL, 'admin', 'ADMIN', '127.0.0.1', '2026-11-05 10:43:57.814000', 'INFO'),
(4, 'MERGE_CATEGORIES', 'CATEGORIES', 'Gộp 1 thể loại [buồn] vào \"hài\". Đã di chuyển 0 đầu sách. Đã xóa danh mục nguồn cũ.', 1, 'admin', 'ADMIN', NULL, '2026-11-12 16:42:54.440516', 'INFO'),
(5, 'UNLOCK_USER', 'USERS', 'Mở khóa tài khoản người dùng Võ Văn Tuấn Anh', NULL, NULL, NULL, NULL, '2026-11-13 12:09:00.205829', 'WARNING');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `books`
--

CREATE TABLE `books` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `author` varchar(255) NOT NULL,
  `isbn` varchar(255) NOT NULL,
  `totalCopies` int(11) NOT NULL DEFAULT 1,
  `availableCopies` int(11) NOT NULL DEFAULT 1,
  `shelf` varchar(255) DEFAULT NULL,
  `floor` varchar(255) DEFAULT NULL,
  `aisle` varchar(255) DEFAULT NULL,
  `categoryId` int(11) DEFAULT NULL,
  `deletedAt` datetime(6) DEFAULT NULL,
  `publisherId` int(11) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `coverImageUrl` varchar(2048) DEFAULT NULL,
  `publicationYear` int(11) DEFAULT NULL,
  `pdfUrl` varchar(2048) DEFAULT NULL,
  `price` decimal(10,2) DEFAULT 80000.00,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `digitalViews` int(11) NOT NULL DEFAULT 0,
  `digitalDownloads` int(11) NOT NULL DEFAULT 0,
  `pdfPermission` enum('PUBLIC','READER_ONLY','NO_DOWNLOAD') NOT NULL DEFAULT 'PUBLIC',
  `digitalFormat` varchar(10) NOT NULL DEFAULT 'PDF',
  `previewPages` int(11) NOT NULL DEFAULT 5
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `books`
--

INSERT INTO `books` (`id`, `title`, `author`, `isbn`, `totalCopies`, `availableCopies`, `shelf`, `floor`, `aisle`, `categoryId`, `deletedAt`, `publisherId`, `description`, `coverImageUrl`, `publicationYear`, `pdfUrl`, `price`, `createdAt`, `updatedAt`, `digitalViews`, `digitalDownloads`, `pdfPermission`, `digitalFormat`, `previewPages`) VALUES
(1, 'Harry Potter và Hòn Đá Phù Thủy', 'J.K. Rowling', '978-0747532699', 5, 5, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 80000.00, '2026-11-06 18:47:00.111756', '2026-11-06 18:47:00.124986', 0, 0, 'PUBLIC', 'PDF', 5),
(2, 'Đắc Nhân Tâm', 'Dale Carnegie', '978-0671027032', 10, 8, 'E1', '1', '1', 7, NULL, 6, 'Cuốn sách gối đầu giường về nghệ thuật lắng nghe, thấu hiểu, truyền cảm hứng và thiết lập các mối quan hệ xã hội tốt đẹp.', 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=400&q=80', NULL, NULL, 80000.00, '2026-11-06 18:47:00.111756', '2026-11-13 08:11:25.000000', 0, 0, 'PUBLIC', 'PDF', 5),
(3, 'Nhà Giả Kim', 'Paulo Coelho', '978-0062315007', 3, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 80000.00, '2026-11-06 18:47:00.111756', '2026-11-06 18:47:00.124986', 0, 0, 'PUBLIC', 'PDF', 5),
(8, 'Hà nội phố', 'Nguyễn Vĩnh Quang', '1', 1, 1, 'A2', '3', 'B', 1, NULL, 1, 'Rất cảm động', 'https://lh3.googleusercontent.com/grass-cs/AABkmLdc1LuRFsO92ZSTySkJgFDuZEgwA03pmQzmQMr1uEQ4kuNGBA-H0t6GkiQI5_QfJug8ZJaRA6Yl42ghlkTdCwmDfZKHsG271MEZP4v7cypoV4mumEYIOvucAzuCWCBdGO4D0u0tuT7bWKtp=w289-h312-n-k-no', 1966, NULL, 80000.00, '2026-11-06 18:47:00.111756', '2026-11-06 18:47:00.124986', 0, 0, 'PUBLIC', 'PDF', 5),
(9, 'Clean Code: Cẩm Nang Viết Mã Sạch', 'Robert C. Martin', '978-0132350884', 10, 8, 'A1', '2', '1', 3, NULL, 5, 'Cuốn cẩm nang kinh điển của Uncle Bob về nghệ thuật viết mã sạch, tối ưu cấu trúc phần mềm, nguyên lý SOLID và kỹ thuật tái cấu trúc mã nguồn (Refactoring).', 'https://images.unsplash.com/photo-1532012164546-f432f2e3777a?auto=format&fit=crop&w=400&q=80', 2021, NULL, 185000.00, '2026-11-13 08:11:24.696436', '2026-11-13 08:11:24.696436', 0, 0, 'PUBLIC', 'PDF', 5),
(10, 'Design Patterns: Mẫu Thiết Kế Hướng Đối Tượng', 'Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides (GoF)', '978-0201633610', 8, 6, 'A2', '2', '1', 3, NULL, 4, '23 mẫu thiết kế kinh điển giúp kỹ sư phần mềm giải quyết các bài toán kiến trúc hệ thống lặp lại, tối ưu hóa tính linh hoạt và khả năng tái sử dụng.', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80', 2020, NULL, 220000.00, '2026-11-13 08:11:24.727552', '2026-11-13 08:11:24.727552', 0, 0, 'PUBLIC', 'PDF', 5),
(11, 'Introduction to Algorithms (CLRS)', 'Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein', '978-0262033848', 12, 9, 'B1', '2', '2', NULL, NULL, 3, 'Giáo trình giải thuật chuẩn mực toàn cầu cho sinh viên chuyên ngành Khoa học máy tính, bao quát từ cấu trúc dữ liệu nâng cao, quy hoạch động đến đồ thị.', 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=400&q=80', 2022, NULL, 350000.00, '2026-11-13 08:11:24.759834', '2026-11-13 08:11:24.759834', 0, 0, 'PUBLIC', 'PDF', 5),
(12, 'Artificial Intelligence: Cách Tiếp Cận Hiện Đại', 'Stuart Russell, Peter Norvig', '978-0136042594', 10, 6, 'B2', '2', '2', NULL, NULL, 3, 'Tác phẩm gối đầu giường về AI, trình bày từ tác tử thông minh, học tăng cường, thị giác máy tính đến các mô hình học sâu thế hệ mới.', 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=400&q=80', 2023, NULL, 380000.00, '2026-11-13 08:11:24.797969', '2026-11-13 12:10:14.000000', 0, 0, 'PUBLIC', 'PDF', 5),
(13, 'Giáo trình Cơ Sở Dữ Liệu & Hệ Quản Trị CSDL', 'PGS.TS. Trần Đức Khánh, TS. Lê Thị Bích', '978-6046294821', 15, 12, 'A3', '2', '1', 3, NULL, 3, 'Giáo trình đại học chính quy về đại số quan hệ, chuẩn hóa dữ liệu dạng 3NF/BCNF, ngôn ngữ SQL nâng cao và an toàn giao dịch ACID.', 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=400&q=80', 2022, NULL, 120000.00, '2026-11-13 08:11:24.829232', '2026-11-13 08:11:24.829232', 0, 0, 'PUBLIC', 'PDF', 5),
(14, 'Lập Trình Hướng Đối Tượng Với Java', 'GS.TS. Nguyễn Thanh Thủy', '978-6049503487', 15, 11, 'A4', '2', '1', 3, NULL, 4, 'Trang bị tư duy lập trình hướng đối tượng, xử lý ngoại lệ, Java Collections Framework, kiến trúc đa luồng và thiết kế phần mềm doanh nghiệp.', 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80', 2022, NULL, 145000.00, '2026-11-13 08:11:24.888814', '2026-11-13 08:11:24.888814', 0, 0, 'PUBLIC', 'PDF', 5),
(15, 'Lược Sử Thời Gian (A Brief History of Time)', 'Stephen Hawking', '978-0553380163', 8, 6, 'C1', '3', '1', 6, NULL, 6, 'Khám phá các bí ẩn vĩ đại nhất của vũ trụ: hố đen, lý thuyết dây, thuyết tương đối rộng và nguồn gốc không - thời gian.', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80', 2021, NULL, 125000.00, '2026-11-13 08:11:24.939969', '2026-11-13 08:11:24.939969', 0, 0, 'PUBLIC', 'PDF', 5),
(16, 'Sapiens: Lược Sử Loài Người', 'Yuval Noah Harari', '978-0062316097', 10, 7, 'C2', '3', '1', 6, NULL, NULL, 'Tác phẩm nổi tiếng phân tích 3 cuộc cách mạng then chốt định hình vận mệnh loài người: Nhận thức, Nông nghiệp và Khoa học.', 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=400&q=80', 2022, NULL, 215000.00, '2026-11-13 08:11:24.962945', '2026-11-13 08:11:24.962945', 0, 0, 'PUBLIC', 'PDF', 5),
(17, 'Kinh Tế Học Vi Mô & Vĩ Mô Ứng Dụng', 'N. Gregory Mankiw', '978-1305585126', 10, 8, 'D1', '1', '2', 5, NULL, 3, 'Bộ sách chuẩn mực về quy luật cung cầu, cân bằng thị trường, chính sách tài khóa, lạm phát và tăng trưởng kinh tế bền vững.', 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=400&q=80', 2022, NULL, 280000.00, '2026-11-13 08:11:24.986992', '2026-11-13 08:11:24.986992', 0, 0, 'PUBLIC', 'PDF', 5),
(18, 'Khởi Nghiệp Tinh Gọn (The Lean Startup)', 'Eric Ries', '978-0307887894', 8, 6, 'D2', '1', '2', 5, NULL, 6, 'Phương pháp luận tinh gọn: Vòng lặp Xây dựng - Đo lường - Học hỏi giúp startup kiểm chứng ý tưởng kinh doanh với chi phí tối ưu nhất.', 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=400&q=80', 2021, NULL, 150000.00, '2026-11-13 08:11:25.012145', '2026-11-13 08:11:25.012145', 0, 0, 'PUBLIC', 'PDF', 5),
(19, 'Tôi Thấy Hoa Vàng Trên Cỏ Xanh', 'Nguyễn Nhật Ánh', '978-6041002241', 12, 9, 'F1', '3', '2', 8, NULL, 6, 'Câu chuyện tuổi thơ xúc động tại một làng quê nghèo miền Trung, chứa đựng tình anh em, tình bạn và những rung động đầu đời trong sáng.', 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?auto=format&fit=crop&w=400&q=80', 2021, NULL, 110000.00, '2026-11-13 08:11:25.040958', '2026-11-13 08:11:25.040958', 0, 0, 'PUBLIC', 'PDF', 5);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `book_copies`
--

CREATE TABLE `book_copies` (
  `id` int(11) NOT NULL,
  `barcode` varchar(255) NOT NULL,
  `status` enum('AVAILABLE','RESERVED','BORROWED','MAINTENANCE','DAMAGED','LOST','DISPOSED') NOT NULL DEFAULT 'AVAILABLE',
  `bookId` int(11) DEFAULT NULL,
  `shelf` varchar(100) DEFAULT NULL,
  `floor` varchar(50) DEFAULT NULL,
  `aisle` varchar(100) DEFAULT NULL,
  `lastAuditedAt` datetime DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `book_copies`
--

INSERT INTO `book_copies` (`id`, `barcode`, `status`, `bookId`, `shelf`, `floor`, `aisle`, `lastAuditedAt`, `createdAt`, `updatedAt`) VALUES
(14, 'COPY-8f38d448-55ee-4754-b863-663a3bdd62d2', 'AVAILABLE', 2, NULL, NULL, NULL, NULL, '2026-11-06 18:46:44.902730', '2026-11-06 18:46:44.908349'),
(15, 'COPY-9da3c8c9-f65c-4297-ae62-132449597c01', 'AVAILABLE', 2, NULL, NULL, NULL, NULL, '2026-11-06 18:46:44.902730', '2026-11-06 18:46:44.908349'),
(16, 'COPY-865a79ab-09e4-409b-b0e0-f6dba2cbdfff', 'AVAILABLE', 2, NULL, NULL, NULL, NULL, '2026-11-06 18:46:44.902730', '2026-11-06 18:46:44.908349'),
(17, 'COPY-b7f103fb-b38b-4d27-886e-3b43b80ce2d2', 'AVAILABLE', 2, NULL, NULL, NULL, NULL, '2026-11-06 18:46:44.902730', '2026-11-06 18:46:44.908349'),
(18, 'COPY-7216299e-3a18-4bba-a87f-654d59fdb2f8', 'AVAILABLE', 2, NULL, NULL, NULL, NULL, '2026-11-06 18:46:44.902730', '2026-11-06 18:46:44.908349'),
(19, 'COPY-da8ef5c2-b14d-4a67-90b3-25d96eb42952', 'AVAILABLE', 2, NULL, NULL, NULL, NULL, '2026-11-06 18:46:44.902730', '2026-11-06 18:46:44.908349'),
(20, 'COPY-48cd358f-1391-48a9-a178-3ea26053ab7c', 'AVAILABLE', 2, NULL, NULL, NULL, NULL, '2026-11-06 18:46:44.902730', '2026-11-06 18:46:44.908349'),
(21, 'COPY-b10c8604-4026-4161-b995-4aa1377284f5', 'AVAILABLE', 2, NULL, NULL, NULL, NULL, '2026-11-06 18:46:44.902730', '2026-11-06 18:46:44.908349'),
(22, 'COPY-47453f54-9c75-4f07-b96c-c13c96d0d93d', 'BORROWED', 2, NULL, NULL, NULL, NULL, '2026-11-06 18:46:44.902730', '2026-11-06 18:46:44.908349'),
(23, 'COPY-796bfa44-b726-4a41-97c1-10fcf852801e', 'BORROWED', 2, NULL, NULL, NULL, NULL, '2026-11-06 18:46:44.902730', '2026-11-06 18:46:44.908349'),
(24, 'LEGACY-3-1', 'BORROWED', 3, NULL, NULL, NULL, NULL, '2026-11-06 18:46:44.902730', '2026-11-06 18:46:44.908349'),
(25, 'LEGACY-3-2', 'AVAILABLE', 3, NULL, NULL, NULL, NULL, '2026-11-06 18:46:44.902730', '2026-11-06 18:46:44.908349'),
(26, 'LEGACY-3-3', 'BORROWED', 3, NULL, NULL, NULL, NULL, '2026-11-06 18:46:44.902730', '2026-11-06 18:46:44.908349'),
(27, 'COPY-7d434f80-fa2d-4021-966d-8552a5891cc3', 'AVAILABLE', 8, NULL, NULL, NULL, NULL, '2026-11-06 18:46:44.902730', '2026-11-06 18:46:44.908349'),
(28, 'COPY-3934b2ef-84cf-4611-9a50-4a2004b2d2e1', 'AVAILABLE', 1, NULL, NULL, NULL, NULL, '2026-11-06 18:46:44.902730', '2026-11-06 18:46:44.908349'),
(29, 'COPY-87782581-de42-4526-9ffb-8bd8aed8b06a', 'AVAILABLE', 1, NULL, NULL, NULL, NULL, '2026-11-06 18:46:44.902730', '2026-11-06 18:46:44.908349'),
(30, 'COPY-112db9b8-c149-46f7-96fc-5970208afcb4', 'AVAILABLE', 1, NULL, NULL, NULL, NULL, '2026-11-06 18:46:44.902730', '2026-11-06 18:46:44.908349'),
(31, 'COPY-baabbf21-049c-47da-8fee-7d88a825de9d', 'AVAILABLE', 1, NULL, NULL, NULL, NULL, '2026-11-06 18:46:44.902730', '2026-11-06 18:46:44.908349'),
(32, 'COPY-4c07e0ea-7460-49ec-a122-edf74b163334', 'AVAILABLE', 1, NULL, NULL, NULL, NULL, '2026-11-06 18:46:44.902730', '2026-11-06 18:46:44.908349'),
(36, 'BC-009-01', 'AVAILABLE', 9, 'A1', '2', '1', NULL, '2026-11-13 08:11:24.701056', '2026-11-13 08:11:24.701056'),
(37, 'BC-009-02', 'AVAILABLE', 9, 'A1', '2', '1', NULL, '2026-11-13 08:11:24.703450', '2026-11-13 08:11:24.703450'),
(38, 'BC-009-03', 'AVAILABLE', 9, 'A1', '2', '1', NULL, '2026-11-13 08:11:24.705656', '2026-11-13 08:11:24.705656'),
(39, 'BC-009-04', 'AVAILABLE', 9, 'A1', '2', '1', NULL, '2026-11-13 08:11:24.708178', '2026-11-13 08:11:24.708178'),
(40, 'BC-009-05', 'AVAILABLE', 9, 'A1', '2', '1', NULL, '2026-11-13 08:11:24.711315', '2026-11-13 08:11:24.711315'),
(41, 'BC-009-06', 'AVAILABLE', 9, 'A1', '2', '1', NULL, '2026-11-13 08:11:24.714009', '2026-11-13 08:11:24.714009'),
(42, 'BC-009-07', 'AVAILABLE', 9, 'A1', '2', '1', NULL, '2026-11-13 08:11:24.716643', '2026-11-13 08:11:24.716643'),
(43, 'BC-009-08', 'AVAILABLE', 9, 'A1', '2', '1', NULL, '2026-11-13 08:11:24.719152', '2026-11-13 08:11:24.719152'),
(44, 'BC-009-09', 'BORROWED', 9, 'A1', '2', '1', NULL, '2026-11-13 08:11:24.721402', '2026-11-13 08:11:24.721402'),
(45, 'BC-009-10', 'BORROWED', 9, 'A1', '2', '1', NULL, '2026-11-13 08:11:24.723526', '2026-11-13 08:11:24.723526'),
(46, 'BC-010-01', 'AVAILABLE', 10, 'A2', '2', '1', NULL, '2026-11-13 08:11:24.731362', '2026-11-13 08:11:24.731362'),
(47, 'BC-010-02', 'AVAILABLE', 10, 'A2', '2', '1', NULL, '2026-11-13 08:11:24.733847', '2026-11-13 08:11:24.733847'),
(48, 'BC-010-03', 'AVAILABLE', 10, 'A2', '2', '1', NULL, '2026-11-13 08:11:24.736151', '2026-11-13 08:11:24.736151'),
(49, 'BC-010-04', 'AVAILABLE', 10, 'A2', '2', '1', NULL, '2026-11-13 08:11:24.738669', '2026-11-13 08:11:24.738669'),
(50, 'BC-010-05', 'AVAILABLE', 10, 'A2', '2', '1', NULL, '2026-11-13 08:11:24.741314', '2026-11-13 08:11:24.741314'),
(51, 'BC-010-06', 'AVAILABLE', 10, 'A2', '2', '1', NULL, '2026-11-13 08:11:24.744164', '2026-11-13 08:11:24.744164'),
(52, 'BC-010-07', 'BORROWED', 10, 'A2', '2', '1', NULL, '2026-11-13 08:11:24.747411', '2026-11-13 08:11:24.747411'),
(53, 'BC-010-08', 'BORROWED', 10, 'A2', '2', '1', NULL, '2026-11-13 08:11:24.756010', '2026-11-13 08:11:24.756010'),
(54, 'BC-011-01', 'AVAILABLE', 11, 'B1', '2', '2', NULL, '2026-11-13 08:11:24.764188', '2026-11-13 08:11:24.764188'),
(55, 'BC-011-02', 'AVAILABLE', 11, 'B1', '2', '2', NULL, '2026-11-13 08:11:24.766667', '2026-11-13 08:11:24.766667'),
(56, 'BC-011-03', 'AVAILABLE', 11, 'B1', '2', '2', NULL, '2026-11-13 08:11:24.769047', '2026-11-13 08:11:24.769047'),
(57, 'BC-011-04', 'AVAILABLE', 11, 'B1', '2', '2', NULL, '2026-11-13 08:11:24.771885', '2026-11-13 08:11:24.771885'),
(58, 'BC-011-05', 'AVAILABLE', 11, 'B1', '2', '2', NULL, '2026-11-13 08:11:24.774903', '2026-11-13 08:11:24.774903'),
(59, 'BC-011-06', 'AVAILABLE', 11, 'B1', '2', '2', NULL, '2026-11-13 08:11:24.777763', '2026-11-13 08:11:24.777763'),
(60, 'BC-011-07', 'AVAILABLE', 11, 'B1', '2', '2', NULL, '2026-11-13 08:11:24.780591', '2026-11-13 08:11:24.780591'),
(61, 'BC-011-08', 'AVAILABLE', 11, 'B1', '2', '2', NULL, '2026-11-13 08:11:24.782981', '2026-11-13 08:11:24.782981'),
(62, 'BC-011-09', 'AVAILABLE', 11, 'B1', '2', '2', NULL, '2026-11-13 08:11:24.785666', '2026-11-13 08:11:24.785666'),
(63, 'BC-011-10', 'BORROWED', 11, 'B1', '2', '2', NULL, '2026-11-13 08:11:24.788557', '2026-11-13 08:11:24.788557'),
(64, 'BC-011-11', 'BORROWED', 11, 'B1', '2', '2', NULL, '2026-11-13 08:11:24.791545', '2026-11-13 08:11:24.791545'),
(65, 'BC-011-12', 'BORROWED', 11, 'B1', '2', '2', NULL, '2026-11-13 08:11:24.794449', '2026-11-13 08:11:24.794449'),
(66, 'BC-012-01', 'BORROWED', 12, 'B2', '2', '2', NULL, '2026-11-13 08:11:24.801789', '2026-11-13 12:16:47.000000'),
(67, 'BC-012-02', 'AVAILABLE', 12, 'B2', '2', '2', NULL, '2026-11-13 08:11:24.804393', '2026-11-13 08:11:24.804393'),
(68, 'BC-012-03', 'AVAILABLE', 12, 'B2', '2', '2', NULL, '2026-11-13 08:11:24.807068', '2026-11-13 08:11:24.807068'),
(69, 'BC-012-04', 'AVAILABLE', 12, 'B2', '2', '2', NULL, '2026-11-13 08:11:24.809572', '2026-11-13 08:11:24.809572'),
(70, 'BC-012-05', 'AVAILABLE', 12, 'B2', '2', '2', NULL, '2026-11-13 08:11:24.812263', '2026-11-13 08:11:24.812263'),
(71, 'BC-012-06', 'AVAILABLE', 12, 'B2', '2', '2', NULL, '2026-11-13 08:11:24.814728', '2026-11-13 08:11:24.814728'),
(72, 'BC-012-07', 'AVAILABLE', 12, 'B2', '2', '2', NULL, '2026-11-13 08:11:24.817468', '2026-11-13 08:11:24.817468'),
(73, 'BC-012-08', 'BORROWED', 12, 'B2', '2', '2', NULL, '2026-11-13 08:11:24.820283', '2026-11-13 08:11:24.820283'),
(74, 'BC-012-09', 'BORROWED', 12, 'B2', '2', '2', NULL, '2026-11-13 08:11:24.822927', '2026-11-13 08:11:24.822927'),
(75, 'BC-012-10', 'BORROWED', 12, 'B2', '2', '2', NULL, '2026-11-13 08:11:24.825825', '2026-11-13 08:11:24.825825'),
(76, 'BC-013-01', 'AVAILABLE', 13, 'A3', '2', '1', NULL, '2026-11-13 08:11:24.832771', '2026-11-13 08:11:24.832771'),
(77, 'BC-013-02', 'AVAILABLE', 13, 'A3', '2', '1', NULL, '2026-11-13 08:11:24.837070', '2026-11-13 08:11:24.837070'),
(78, 'BC-013-03', 'AVAILABLE', 13, 'A3', '2', '1', NULL, '2026-11-13 08:11:24.839735', '2026-11-13 08:11:24.839735'),
(79, 'BC-013-04', 'AVAILABLE', 13, 'A3', '2', '1', NULL, '2026-11-13 08:11:24.842242', '2026-11-13 08:11:24.842242'),
(80, 'BC-013-05', 'AVAILABLE', 13, 'A3', '2', '1', NULL, '2026-11-13 08:11:24.844882', '2026-11-13 08:11:24.844882'),
(81, 'BC-013-06', 'AVAILABLE', 13, 'A3', '2', '1', NULL, '2026-11-13 08:11:24.847359', '2026-11-13 08:11:24.847359'),
(82, 'BC-013-07', 'AVAILABLE', 13, 'A3', '2', '1', NULL, '2026-11-13 08:11:24.850127', '2026-11-13 08:11:24.850127'),
(83, 'BC-013-08', 'AVAILABLE', 13, 'A3', '2', '1', NULL, '2026-11-13 08:11:24.852585', '2026-11-13 08:11:24.852585'),
(84, 'BC-013-09', 'AVAILABLE', 13, 'A3', '2', '1', NULL, '2026-11-13 08:11:24.854993', '2026-11-13 08:11:24.854993'),
(85, 'BC-013-10', 'AVAILABLE', 13, 'A3', '2', '1', NULL, '2026-11-13 08:11:24.857459', '2026-11-13 08:11:24.857459'),
(86, 'BC-013-11', 'AVAILABLE', 13, 'A3', '2', '1', NULL, '2026-11-13 08:11:24.860096', '2026-11-13 08:11:24.860096'),
(87, 'BC-013-12', 'AVAILABLE', 13, 'A3', '2', '1', NULL, '2026-11-13 08:11:24.862589', '2026-11-13 08:11:24.862589'),
(88, 'BC-013-13', 'BORROWED', 13, 'A3', '2', '1', NULL, '2026-11-13 08:11:24.864912', '2026-11-13 08:11:24.864912'),
(89, 'BC-013-14', 'BORROWED', 13, 'A3', '2', '1', NULL, '2026-11-13 08:11:24.867119', '2026-11-13 08:11:24.867119'),
(90, 'BC-013-15', 'BORROWED', 13, 'A3', '2', '1', NULL, '2026-11-13 08:11:24.884856', '2026-11-13 08:11:24.884856'),
(91, 'BC-014-01', 'AVAILABLE', 14, 'A4', '2', '1', NULL, '2026-11-13 08:11:24.898129', '2026-11-13 08:11:24.898129'),
(92, 'BC-014-02', 'AVAILABLE', 14, 'A4', '2', '1', NULL, '2026-11-13 08:11:24.900615', '2026-11-13 08:11:24.900615'),
(93, 'BC-014-03', 'AVAILABLE', 14, 'A4', '2', '1', NULL, '2026-11-13 08:11:24.903348', '2026-11-13 08:11:24.903348'),
(94, 'BC-014-04', 'AVAILABLE', 14, 'A4', '2', '1', NULL, '2026-11-13 08:11:24.906014', '2026-11-13 08:11:24.906014'),
(95, 'BC-014-05', 'AVAILABLE', 14, 'A4', '2', '1', NULL, '2026-11-13 08:11:24.908864', '2026-11-13 08:11:24.908864'),
(96, 'BC-014-06', 'AVAILABLE', 14, 'A4', '2', '1', NULL, '2026-11-13 08:11:24.911751', '2026-11-13 08:11:24.911751'),
(97, 'BC-014-07', 'AVAILABLE', 14, 'A4', '2', '1', NULL, '2026-11-13 08:11:24.914401', '2026-11-13 08:11:24.914401'),
(98, 'BC-014-08', 'AVAILABLE', 14, 'A4', '2', '1', NULL, '2026-11-13 08:11:24.916870', '2026-11-13 08:11:24.916870'),
(99, 'BC-014-09', 'AVAILABLE', 14, 'A4', '2', '1', NULL, '2026-11-13 08:11:24.919700', '2026-11-13 08:11:24.919700'),
(100, 'BC-014-10', 'AVAILABLE', 14, 'A4', '2', '1', NULL, '2026-11-13 08:11:24.922447', '2026-11-13 08:11:24.922447'),
(101, 'BC-014-11', 'AVAILABLE', 14, 'A4', '2', '1', NULL, '2026-11-13 08:11:24.924830', '2026-11-13 08:11:24.924830'),
(102, 'BC-014-12', 'BORROWED', 14, 'A4', '2', '1', NULL, '2026-11-13 08:11:24.927715', '2026-11-13 08:11:24.927715'),
(103, 'BC-014-13', 'BORROWED', 14, 'A4', '2', '1', NULL, '2026-11-13 08:11:24.930768', '2026-11-13 08:11:24.930768'),
(104, 'BC-014-14', 'BORROWED', 14, 'A4', '2', '1', NULL, '2026-11-13 08:11:24.933467', '2026-11-13 08:11:24.933467'),
(105, 'BC-014-15', 'BORROWED', 14, 'A4', '2', '1', NULL, '2026-11-13 08:11:24.936478', '2026-11-13 08:11:24.936478'),
(106, 'BC-015-01', 'AVAILABLE', 15, 'C1', '3', '1', NULL, '2026-11-13 08:11:24.943881', '2026-11-13 08:11:24.943881'),
(107, 'BC-015-02', 'AVAILABLE', 15, 'C1', '3', '1', NULL, '2026-11-13 08:11:24.946044', '2026-11-13 08:11:24.946044'),
(108, 'BC-015-03', 'AVAILABLE', 15, 'C1', '3', '1', NULL, '2026-11-13 08:11:24.948345', '2026-11-13 08:11:24.948345'),
(109, 'BC-015-04', 'AVAILABLE', 15, 'C1', '3', '1', NULL, '2026-11-13 08:11:24.951057', '2026-11-13 08:11:24.951057'),
(110, 'BC-015-05', 'AVAILABLE', 15, 'C1', '3', '1', NULL, '2026-11-13 08:11:24.953317', '2026-11-13 08:11:24.953317'),
(111, 'BC-015-06', 'AVAILABLE', 15, 'C1', '3', '1', NULL, '2026-11-13 08:11:24.955265', '2026-11-13 08:11:24.955265'),
(112, 'BC-015-07', 'BORROWED', 15, 'C1', '3', '1', NULL, '2026-11-13 08:11:24.957555', '2026-11-13 08:11:24.957555'),
(113, 'BC-015-08', 'BORROWED', 15, 'C1', '3', '1', NULL, '2026-11-13 08:11:24.960188', '2026-11-13 08:11:24.960188'),
(114, 'BC-016-01', 'AVAILABLE', 16, 'C2', '3', '1', NULL, '2026-11-13 08:11:24.965876', '2026-11-13 08:11:24.965876'),
(115, 'BC-016-02', 'AVAILABLE', 16, 'C2', '3', '1', NULL, '2026-11-13 08:11:24.967959', '2026-11-13 08:11:24.967959'),
(116, 'BC-016-03', 'AVAILABLE', 16, 'C2', '3', '1', NULL, '2026-11-13 08:11:24.969774', '2026-11-13 08:11:24.969774'),
(117, 'BC-016-04', 'AVAILABLE', 16, 'C2', '3', '1', NULL, '2026-11-13 08:11:24.971855', '2026-11-13 08:11:24.971855'),
(118, 'BC-016-05', 'AVAILABLE', 16, 'C2', '3', '1', NULL, '2026-11-13 08:11:24.973740', '2026-11-13 08:11:24.973740'),
(119, 'BC-016-06', 'AVAILABLE', 16, 'C2', '3', '1', NULL, '2026-11-13 08:11:24.975942', '2026-11-13 08:11:24.975942'),
(120, 'BC-016-07', 'AVAILABLE', 16, 'C2', '3', '1', NULL, '2026-11-13 08:11:24.978278', '2026-11-13 08:11:24.978278'),
(121, 'BC-016-08', 'BORROWED', 16, 'C2', '3', '1', NULL, '2026-11-13 08:11:24.980184', '2026-11-13 08:11:24.980184'),
(122, 'BC-016-09', 'BORROWED', 16, 'C2', '3', '1', NULL, '2026-11-13 08:11:24.982101', '2026-11-13 08:11:24.982101'),
(123, 'BC-016-10', 'BORROWED', 16, 'C2', '3', '1', NULL, '2026-11-13 08:11:24.983987', '2026-11-13 08:11:24.983987'),
(124, 'BC-017-01', 'AVAILABLE', 17, 'D1', '1', '2', NULL, '2026-11-13 08:11:24.989887', '2026-11-13 08:11:24.989887'),
(125, 'BC-017-02', 'AVAILABLE', 17, 'D1', '1', '2', NULL, '2026-11-13 08:11:24.992345', '2026-11-13 08:11:24.992345'),
(126, 'BC-017-03', 'AVAILABLE', 17, 'D1', '1', '2', NULL, '2026-11-13 08:11:24.994486', '2026-11-13 08:11:24.994486'),
(127, 'BC-017-04', 'AVAILABLE', 17, 'D1', '1', '2', NULL, '2026-11-13 08:11:24.997028', '2026-11-13 08:11:24.997028'),
(128, 'BC-017-05', 'AVAILABLE', 17, 'D1', '1', '2', NULL, '2026-11-13 08:11:24.999180', '2026-11-13 08:11:24.999180'),
(129, 'BC-017-06', 'AVAILABLE', 17, 'D1', '1', '2', NULL, '2026-11-13 08:11:25.001143', '2026-11-13 08:11:25.001143'),
(130, 'BC-017-07', 'AVAILABLE', 17, 'D1', '1', '2', NULL, '2026-11-13 08:11:25.002906', '2026-11-13 08:11:25.002906'),
(131, 'BC-017-08', 'AVAILABLE', 17, 'D1', '1', '2', NULL, '2026-11-13 08:11:25.005032', '2026-11-13 08:11:25.005032'),
(132, 'BC-017-09', 'BORROWED', 17, 'D1', '1', '2', NULL, '2026-11-13 08:11:25.006966', '2026-11-13 08:11:25.006966'),
(133, 'BC-017-10', 'BORROWED', 17, 'D1', '1', '2', NULL, '2026-11-13 08:11:25.009424', '2026-11-13 08:11:25.009424'),
(134, 'BC-018-01', 'AVAILABLE', 18, 'D2', '1', '2', NULL, '2026-11-13 08:11:25.015175', '2026-11-13 08:11:25.015175'),
(135, 'BC-018-02', 'AVAILABLE', 18, 'D2', '1', '2', NULL, '2026-11-13 08:11:25.017080', '2026-11-13 08:11:25.017080'),
(136, 'BC-018-03', 'AVAILABLE', 18, 'D2', '1', '2', NULL, '2026-11-13 08:11:25.018881', '2026-11-13 08:11:25.018881'),
(137, 'BC-018-04', 'AVAILABLE', 18, 'D2', '1', '2', NULL, '2026-11-13 08:11:25.020609', '2026-11-13 08:11:25.020609'),
(138, 'BC-018-05', 'AVAILABLE', 18, 'D2', '1', '2', NULL, '2026-11-13 08:11:25.022746', '2026-11-13 08:11:25.022746'),
(139, 'BC-018-06', 'AVAILABLE', 18, 'D2', '1', '2', NULL, '2026-11-13 08:11:25.025304', '2026-11-13 08:11:25.025304'),
(140, 'BC-018-07', 'BORROWED', 18, 'D2', '1', '2', NULL, '2026-11-13 08:11:25.027910', '2026-11-13 08:11:25.027910'),
(141, 'BC-018-08', 'BORROWED', 18, 'D2', '1', '2', NULL, '2026-11-13 08:11:25.030671', '2026-11-13 08:11:25.030671'),
(142, 'BC-019-01', 'AVAILABLE', 19, 'F1', '3', '2', NULL, '2026-11-13 08:11:25.048105', '2026-11-13 08:11:25.048105'),
(143, 'BC-019-02', 'AVAILABLE', 19, 'F1', '3', '2', NULL, '2026-11-13 08:11:25.050892', '2026-11-13 08:11:25.050892'),
(144, 'BC-019-03', 'AVAILABLE', 19, 'F1', '3', '2', NULL, '2026-11-13 08:11:25.053694', '2026-11-13 08:11:25.053694'),
(145, 'BC-019-04', 'AVAILABLE', 19, 'F1', '3', '2', NULL, '2026-11-13 08:11:25.056369', '2026-11-13 08:11:25.056369'),
(146, 'BC-019-05', 'AVAILABLE', 19, 'F1', '3', '2', NULL, '2026-11-13 08:11:25.059323', '2026-11-13 08:11:25.059323'),
(147, 'BC-019-06', 'AVAILABLE', 19, 'F1', '3', '2', NULL, '2026-11-13 08:11:25.061991', '2026-11-13 08:11:25.061991'),
(148, 'BC-019-07', 'AVAILABLE', 19, 'F1', '3', '2', NULL, '2026-11-13 08:11:25.064220', '2026-11-13 08:11:25.064220'),
(149, 'BC-019-08', 'AVAILABLE', 19, 'F1', '3', '2', NULL, '2026-11-13 08:11:25.066254', '2026-11-13 08:11:25.066254'),
(150, 'BC-019-09', 'AVAILABLE', 19, 'F1', '3', '2', NULL, '2026-11-13 08:11:25.069423', '2026-11-13 08:11:25.069423'),
(151, 'BC-019-10', 'BORROWED', 19, 'F1', '3', '2', NULL, '2026-11-13 08:11:25.071973', '2026-11-13 08:11:25.071973'),
(152, 'BC-019-11', 'BORROWED', 19, 'F1', '3', '2', NULL, '2026-11-13 08:11:25.074675', '2026-11-13 08:11:25.074675'),
(153, 'BC-019-12', 'BORROWED', 19, 'F1', '3', '2', NULL, '2026-11-13 08:11:25.077017', '2026-11-13 08:11:25.077017');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `book_donations`
--

CREATE TABLE `book_donations` (
  `id` int(11) NOT NULL,
  `partnerId` int(11) NOT NULL,
  `partnerName` varchar(255) DEFAULT NULL,
  `donationType` varchar(255) NOT NULL DEFAULT 'BOOKS',
  `itemTitle` varchar(255) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `estimatedValue` decimal(15,2) NOT NULL DEFAULT 0.00,
  `receiptNumber` varchar(255) NOT NULL,
  `receivedByStaffName` varchar(255) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `donationDate` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `partner` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `book_donations`
--

INSERT INTO `book_donations` (`id`, `partnerId`, `partnerName`, `donationType`, `itemTitle`, `quantity`, `estimatedValue`, `receiptNumber`, `receivedByStaffName`, `note`, `donationDate`, `partner`) VALUES
(1, 1, 'Hội Cựu Sinh Viên Khóa 2015-2019', 'BOOKS', 'Bộ sưu tập 350 cuốn Sách Khởi nghiệp, Lãnh đạo & Đổi mới sáng tạo 2026', 350, 42000000.00, 'REC-2026-001', 'Thủ thư Nguyễn Văn Quản', 'Sách mới nguyên seal, có dán nhãn logo Hội Cựu SV.', '2026-10-28 21:20:06.819000', NULL),
(2, 1, 'Hội Cựu Sinh Viên Khóa 2015-2019', 'CASH', 'Kinh phí hỗ trợ số hóa tài liệu quý và mua bản quyền CSDL', 1, 50000000.00, 'REC-2026-002', 'Thủ thư Nguyễn Văn Quản', 'Đã chuyển vào tài khoản Quỹ phát triển Thư viện trường.', '2026-10-31 21:20:06.819000', NULL),
(3, 2, 'Nhà Xuất Bản Khoa Học & Kỹ Thuật', 'BOOKS', '520 cuốn Giáo trình Bách khoa & Công nghệ Thông tin thế hệ mới', 520, 78000000.00, 'REC-2026-003', 'Thủ thư Lê Thị Hồng', 'Được chuyển thẳng vào kho tài liệu tham khảo tầng 2.', '2026-11-05 21:20:06.819000', NULL),
(4, 3, 'Quỹ Giáo Dục & Phát Triển Văn Hóa Đọc Việt Nam', 'EQUIPMENT', '10 Máy tính bảng chuyên dụng tra cứu E-Library Kindle Paperwhite', 10, 45000000.00, 'REC-2026-004', 'Thủ thư Nguyễn Văn Quản', 'Bàn giao cho phòng Thư viện số E-Library khai thác.', '2026-11-09 21:20:06.819000', NULL);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `borrow_records`
--

CREATE TABLE `borrow_records` (
  `id` int(11) NOT NULL,
  `borrowedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `dueDate` datetime DEFAULT NULL,
  `returnedAt` datetime DEFAULT NULL,
  `fineAmount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `fineStatus` varchar(255) NOT NULL DEFAULT 'NONE',
  `userId` int(11) DEFAULT NULL,
  `bookId` int(11) DEFAULT NULL,
  `approvedAt` datetime DEFAULT NULL,
  `extensionCount` int(11) NOT NULL DEFAULT 0,
  `returnCondition` enum('NORMAL','DAMAGED','LIGHT_DAMAGE','SEVERE_DAMAGE','LOST') DEFAULT NULL,
  `copyId` int(11) DEFAULT NULL,
  `status` enum('PENDING','BORROWED','RETURNED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `borrow_records`
--

INSERT INTO `borrow_records` (`id`, `borrowedAt`, `dueDate`, `returnedAt`, `fineAmount`, `fineStatus`, `userId`, `bookId`, `approvedAt`, `extensionCount`, `returnCondition`, `copyId`, `status`, `createdAt`, `updatedAt`) VALUES
(4, '2026-11-02 09:46:09.347972', '2026-11-16 09:51:11', NULL, 0.00, 'NONE', 3, 3, '2026-11-02 09:51:11', 0, NULL, 24, 'BORROWED', '2026-11-06 18:46:34.283799', '2026-11-06 18:46:34.293826'),
(6, '2026-11-13 08:11:25.085000', NULL, NULL, 0.00, 'NONE', 2, 9, NULL, 0, NULL, 36, 'PENDING', '2026-11-13 08:11:25.089295', '2026-11-13 08:11:25.089295'),
(7, '2026-10-27 08:11:25.085000', '2026-11-10 08:11:25', NULL, 15000.00, 'UNPAID', 2, 10, '2026-10-27 08:11:25', 0, NULL, 37, 'BORROWED', '2026-11-13 08:11:25.092765', '2026-11-13 08:11:25.092765'),
(8, '2026-10-19 08:11:25.085000', '2026-11-02 08:11:25', '2026-11-01 08:11:25', 0.00, 'PAID', 2, 11, '2026-10-19 08:11:25', 0, '', 37, 'RETURNED', '2026-11-13 08:11:25.095697', '2026-11-13 08:11:25.095697'),
(9, '2026-11-13 12:10:14.757260', '2026-12-28 12:16:47', NULL, 0.00, 'NONE', 10, 12, '2026-11-13 12:16:47', 0, NULL, 66, 'BORROWED', '2026-11-13 12:10:14.757260', '2026-11-13 12:16:47.000000');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `categories`
--

CREATE TABLE `categories` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `ddcCode` varchar(50) DEFAULT NULL,
  `parentId` int(11) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `categories`
--

INSERT INTO `categories` (`id`, `name`, `description`, `ddcCode`, `parentId`, `createdAt`, `updatedAt`) VALUES
(1, 'Văn học hài hước & Châm biếm', 'Tuyển tập các tác phẩm văn học châm biếm, trào phúng và hài hước kinh điển', NULL, NULL, '2026-11-06 18:47:24.576733', '2026-11-13 12:13:56.990701'),
(3, 'Công nghệ thông tin', 'Khoa học máy tính, kỹ thuật phần mềm, cấu trúc dữ liệu và thuật toán', '004', NULL, '2026-11-13 08:11:24.655625', '2026-11-13 08:11:24.655625'),
(4, 'Trí tuệ nhân tạo & Khoa học dữ liệu', 'Machine Learning, Deep Learning, Big Data và AI hiện đại', '006', NULL, '2026-11-13 08:11:24.660391', '2026-11-13 08:11:24.660391'),
(5, 'Kinh tế & Quản trị kinh doanh', 'Kinh tế học vĩ mô, vi mô, khởi nghiệp đổi mới sáng tạo', '330', NULL, '2026-11-13 08:11:24.663340', '2026-11-13 08:11:24.663340'),
(6, 'Khoa học tự nhiên & Vũ trụ', 'Vật lý thiên văn, toán học, hóa học và sinh học', '500', NULL, '2026-11-13 08:11:24.666597', '2026-11-13 08:11:24.666597'),
(7, 'Kỹ năng sống & Phát triển bản thân', 'Tâm lý học ứng dụng, giao tiếp, lãnh đạo và tư duy tích cực', '158', NULL, '2026-11-13 08:11:24.669819', '2026-11-13 08:11:24.669819'),
(8, 'Văn học & Nghệ thuật', 'Tiểu thuyết kinh điển, văn học Việt Nam và thế giới', '800', NULL, '2026-11-13 08:11:24.672690', '2026-11-13 08:11:24.672690');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `devices`
--

CREATE TABLE `devices` (
  `id` int(11) NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `category` enum('LAPTOP','TABLET','VR_HEADSET','PROJECTOR','ACCESSORY','OTHER') NOT NULL DEFAULT 'LAPTOP',
  `serialNumber` varchar(100) DEFAULT NULL,
  `specs` text DEFAULT NULL,
  `status` enum('AVAILABLE','BORROWED','MAINTENANCE','DAMAGED') NOT NULL DEFAULT 'AVAILABLE',
  `accessories` varchar(255) DEFAULT NULL,
  `location` varchar(150) DEFAULT NULL,
  `hourlyFineRate` decimal(12,2) NOT NULL DEFAULT 0.00,
  `purchaseCost` decimal(12,2) NOT NULL DEFAULT 0.00,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `device_loans`
--

CREATE TABLE `device_loans` (
  `id` int(11) NOT NULL,
  `loanType` enum('HOURLY','DAILY') NOT NULL DEFAULT 'HOURLY',
  `borrowedAt` datetime NOT NULL,
  `expectedReturnAt` datetime NOT NULL,
  `returnedAt` datetime DEFAULT NULL,
  `preCondition` text DEFAULT NULL,
  `postCondition` text DEFAULT NULL,
  `accessoriesChecked` tinyint(4) NOT NULL DEFAULT 1,
  `status` enum('ACTIVE','RETURNED','OVERDUE','DAMAGED') NOT NULL DEFAULT 'ACTIVE',
  `fineAmount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `deviceId` int(11) DEFAULT NULL,
  `userId` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `device_maintenances`
--

CREATE TABLE `device_maintenances` (
  `id` int(11) NOT NULL,
  `title` varchar(150) NOT NULL,
  `maintenanceType` varchar(50) NOT NULL DEFAULT 'PERIODIC',
  `cost` decimal(12,2) NOT NULL DEFAULT 0.00,
  `scheduledDate` date NOT NULL,
  `completedDate` date DEFAULT NULL,
  `technician` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `deviceId` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `exchange_grants`
--

CREATE TABLE `exchange_grants` (
  `id` int(11) NOT NULL,
  `programType` varchar(255) NOT NULL DEFAULT 'BOOK_EXCHANGE',
  `title` varchar(255) NOT NULL,
  `partnerInstitution` varchar(255) NOT NULL,
  `country` varchar(255) DEFAULT NULL,
  `bookQuantity` int(11) NOT NULL DEFAULT 0,
  `grantAmount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `beneficiariesCount` int(11) NOT NULL DEFAULT 0,
  `status` varchar(255) NOT NULL DEFAULT 'ACTIVE',
  `note` text DEFAULT NULL,
  `startDate` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `endDate` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `exchange_grants`
--

INSERT INTO `exchange_grants` (`id`, `programType`, `title`, `partnerInstitution`, `country`, `bookQuantity`, `grantAmount`, `beneficiariesCount`, `status`, `note`, `startDate`, `endDate`) VALUES
(1, 'BOOK_EXCHANGE', 'Chương trình Trao đổi Học liệu & Sách Chuyên khảo Quốc tế NUS - HUST 2026', 'Đại học Quốc gia Singapore (National University of Singapore - NUS)', 'Singapore', 450, 85000000.00, 600, 'ACTIVE', 'Trao đổi song phương 450 đầu sách khoa học công nghệ tiếng Anh và giáo trình số giữa hai thư viện.', '2026-10-14 07:35:22.568000', '2027-05-12 07:35:22'),
(2, 'BOOK_EXCHANGE', 'Dự án Hợp tác Trao đổi Tài liệu Lưu chiểu Khối Thư viện Đại học Kỹ thuật Châu Á (AOTULE)', 'Viện Công nghệ Tokyo (Tokyo Tech, Nhật Bản)', 'Nhật Bản', 300, 60000000.00, 400, 'ACTIVE', 'Tiếp nhận các tạp chí khoa học quốc tế Scopus Q1 và tài liệu hội thảo chuyên ngành Cơ khí - Tự động hóa.', '2026-09-14 07:35:22.568000', '2027-03-13 07:35:22'),
(3, 'READING_GRANT', 'Quỹ Học bổng \"Thắp Sáng Tri Thức\" - Tài trợ Học liệu & Thiết bị Đọc cho Sinh viên Vượt khó', 'Tập đoàn Viễn thông Quân đội Viettel & Quỹ Khuyến học', 'Việt Nam', 120, 150000000.00, 50, 'ACTIVE', 'Trao tặng 50 suất học bổng tài liệu trị giá 3.000.000đ/suất cùng máy đọc sách Kindle Paperwhite cho sinh viên nghèo hiếu học.', '2026-10-29 07:35:22.568000', '2027-02-11 07:35:22');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `favorite_books`
--

CREATE TABLE `favorite_books` (
  `id` int(11) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `userId` int(11) NOT NULL,
  `bookId` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `fine_adjustments`
--

CREATE TABLE `fine_adjustments` (
  `id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `reason` varchar(255) NOT NULL,
  `createdById` int(11) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `borrowRecordId` int(11) DEFAULT NULL,
  `violationId` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `fine_payments`
--

CREATE TABLE `fine_payments` (
  `id` int(11) NOT NULL,
  `txnRef` varchar(64) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'INITIATED',
  `vnpayTransactionNo` varchar(32) DEFAULT NULL,
  `responseCode` varchar(4) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `paidAt` datetime DEFAULT NULL,
  `borrowRecordId` int(11) DEFAULT NULL,
  `paymentMethod` varchar(10) NOT NULL DEFAULT 'VNPAY',
  `violationId` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `fine_violations`
--

CREATE TABLE `fine_violations` (
  `id` int(11) NOT NULL,
  `type` enum('DAMAGED','LOST','OTHER') NOT NULL,
  `description` varchar(255) NOT NULL,
  `fineAmount` decimal(10,2) NOT NULL,
  `fineStatus` varchar(20) NOT NULL DEFAULT 'UNPAID',
  `createdById` int(11) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `userId` int(11) DEFAULT NULL,
  `copyId` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `iot_alerts`
--

CREATE TABLE `iot_alerts` (
  `id` int(11) NOT NULL,
  `deviceCode` varchar(255) NOT NULL,
  `deviceName` varchar(255) NOT NULL,
  `alertType` varchar(255) NOT NULL,
  `severity` varchar(255) NOT NULL DEFAULT 'WARNING',
  `message` text NOT NULL,
  `resolved` tinyint(4) NOT NULL DEFAULT 0,
  `resolvedAt` datetime DEFAULT NULL,
  `resolvedByStaffName` varchar(255) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `iot_alerts`
--

INSERT INTO `iot_alerts` (`id`, `deviceCode`, `deviceName`, `alertType`, `severity`, `message`, `resolved`, `resolvedAt`, `resolvedByStaffName`, `createdAt`, `updatedAt`) VALUES
(1, 'RFID-GATE-MAIN', 'Hệ Thống Cổng Từ An Ninh RFID Cửa Chính (Làn 1)', 'RFID_UNAUTHORIZED', 'CRITICAL', 'Phát hiện tài liệu chưa mượn mã [BK-CSDL-2026] đi qua cổng từ. Đã tự động kích hoạt chuông và chụp ảnh hiện trường.', 0, NULL, NULL, '2026-11-13 06:58:50.474000', '2026-11-13 07:23:50.479875'),
(2, 'ENV-SENSOR-ARCHIVE', 'Trạm Cảm Biến Môi Trường Kho Sách Quý & Luận Án', 'HIGH_HUMIDITY', 'WARNING', 'Độ ẩm kho sách quý phòng 305 tăng lên 66.8% RH (vượt ngưỡng an toàn bảo quản 60% RH). Máy hút ẩm trung tâm đã tự động khởi động.', 1, '2026-11-13 12:21:57', 'Thủ thư xử lý', '2026-11-13 06:03:50.474000', '2026-11-13 12:21:57.000000'),
(3, 'ENV-SENSOR-SERVER', 'Cảm Biến Nhiệt/Ẩm Phòng Máy Chủ & Hạ Tầng Số', 'OVER_TEMPERATURE', 'WARNING', 'Nhiệt độ cụm Rack 2 phòng máy chủ vượt 25.8°C. Quạt thông gió thứ cấp đã được tăng tốc.', 1, '2026-11-13 06:53:50', 'Thủ thư Quản trị mạng', '2026-11-13 04:53:50.474000', '2026-11-13 07:23:50.486875'),
(4, 'RFID-GATE-FLOOR2', 'Cổng Từ Giám Sát Lối Vào Phòng Sách Chuyên Khảo', 'DEVICE_OFFLINE', 'INFO', 'Mất tín hiệu kết nối mạng cục bộ LAN trong 3 phút. Đã tự động tái thiết lập kết nối IP tĩnh thành công.', 1, '2026-11-13 04:03:50', 'Hệ thống tự động', '2026-11-13 03:43:50.474000', '2026-11-13 07:23:50.488360');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `iot_devices`
--

CREATE TABLE `iot_devices` (
  `id` int(11) NOT NULL,
  `deviceCode` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL DEFAULT 'ENV_SENSOR',
  `location` varchar(255) NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'ONLINE',
  `ipAddress` varchar(255) DEFAULT NULL,
  `macAddress` varchar(255) DEFAULT NULL,
  `firmwareVersion` varchar(255) DEFAULT NULL,
  `temperature` decimal(5,2) DEFAULT NULL,
  `humidity` decimal(5,2) DEFAULT NULL,
  `rfidScansToday` int(11) NOT NULL DEFAULT 0,
  `rfidAlertsToday` int(11) NOT NULL DEFAULT 0,
  `powerState` tinyint(4) NOT NULL DEFAULT 1,
  `batteryLevel` int(11) NOT NULL DEFAULT 100,
  `lastPingAt` datetime DEFAULT NULL,
  `note` text DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `iot_devices`
--

INSERT INTO `iot_devices` (`id`, `deviceCode`, `name`, `type`, `location`, `status`, `ipAddress`, `macAddress`, `firmwareVersion`, `temperature`, `humidity`, `rfidScansToday`, `rfidAlertsToday`, `powerState`, `batteryLevel`, `lastPingAt`, `note`, `createdAt`, `updatedAt`) VALUES
(1, 'RFID-GATE-MAIN', 'Hệ Thống Cổng Từ An Ninh RFID Cửa Chính (Làn 1 & 2)', 'RFID_GATE', 'Sảnh chính Tầng 1 - Cửa ra vào trung tâm', 'ONLINE', '192.168.10.101', 'D8:3A:DD:4A:21:01', 'v3.4.2-RFID-PRO', NULL, NULL, 1485, 2, 1, 100, '2026-11-12 21:20:06', 'Độ nhạy 99.8%. Tự động chụp ảnh độc giả khi chuông báo động kích hoạt.', '2026-11-12 21:20:06.833010', '2026-11-12 21:20:06.833010'),
(2, 'RFID-GATE-FLOOR2', 'Cổng Từ Giám Sát Lối Vào Phòng Sách Chuyên Khảo', 'RFID_GATE', 'Lối vào Khu Tài liệu Ngoại văn - Tầng 2', 'ONLINE', '192.168.10.102', 'D8:3A:DD:4A:21:02', 'v3.4.2-RFID-PRO', NULL, NULL, 820, 0, 1, 100, '2026-11-12 21:20:06', 'Kết nối mạng nội bộ VLAN Thiết bị an ninh.', '2026-11-12 21:20:06.834590', '2026-11-12 21:20:06.834590'),
(3, 'ENV-SENSOR-ARCHIVE', 'Trạm Cảm Biến Môi Trường Kho Lưu Trữ Sách Quý & Luận Án', 'ENV_SENSOR', 'Kho Lưu Trữ Đặc Biệt - Phòng 305 (Tầng 3)', 'ONLINE', '192.168.10.120', 'B4:E6:2D:11:88:C4', 'v2.1.0-ENV', 20.80, 53.50, 0, 0, 1, 98, '2026-11-12 21:20:06', 'Tiêu chuẩn bảo quản sách quý: Nhiệt độ 18°C-22°C, Độ ẩm 50%-60% RH. Cảnh báo tự động nếu vượt ngưỡng.', '2026-11-12 21:20:06.836723', '2026-11-12 21:20:06.836723'),
(4, 'ENV-SENSOR-SERVER', 'Cảm Biến Nhiệt/Ẩm Phòng Máy Chủ & Hạ Tầng Số (Data Center)', 'ENV_SENSOR', 'Phòng Máy Chủ DC - Tầng B1', 'ONLINE', '192.168.10.121', 'B4:E6:2D:11:88:E2', 'v2.1.0-ENV', 19.50, 48.20, 0, 0, 1, 100, '2026-11-12 21:20:06', 'Theo dõi 24/7 nhiệt độ tủ Rack máy chủ ứng dụng thư viện.', '2026-11-12 21:20:06.838299', '2026-11-12 21:20:06.838299'),
(5, 'SMART-AC-ZONE-A', 'Hệ Thống Điều Hòa Trung Tâm VRV - Khu Đọc Tự Do (Zone A)', 'SMART_AC', 'Hội trường đọc tự do - Tầng 1', 'ONLINE', '192.168.10.140', '70:B3:D5:E1:90:3A', 'v1.8.9-HVAC-BACnet', 24.00, 58.00, 0, 0, 1, 100, '2026-11-12 21:20:06', 'Tự động điều chỉnh công suất theo mật độ người đọc qua cảm biến hồng ngoại.', '2026-11-12 21:20:06.840409', '2026-11-12 21:20:06.840409'),
(6, 'SMART-LIGHT-FLOOR2', 'Bộ Điều Khiển Chiếu Sáng Thông Minh DALI - Tầng 2', 'SMART_LIGHT', 'Hành lang & Dãy kệ sách Kho Mở - Tầng 2', 'ONLINE', '192.168.10.150', '70:B3:D5:E1:90:4B', 'v1.5.0-DALI', NULL, NULL, 0, 0, 1, 100, '2026-11-12 21:20:06', 'Tiết kiệm 45% điện năng nhờ tự động giảm sáng khi không có người trong dãy kệ.', '2026-11-12 21:20:06.841662', '2026-11-12 21:20:06.841662'),
(7, 'BOOK-DROP-247', 'Thùng Trả Sách Tự Động Thông Minh 24/7 Ngoài Cổng', 'BOOK_DROP_BOX', 'Mặt tiền Thư viện - Cổng phía Tây', 'ONLINE', '192.168.10.160', 'AC:67:B2:FF:10:99', 'v2.8.1-DROPBOX', NULL, NULL, 95, 0, 1, 100, '2026-11-12 21:20:06', 'Tích hợp đầu quét RFID nhận diện sách và băng tải tự động phân loại.', '2026-11-12 21:20:06.842793', '2026-11-12 21:20:06.842793'),
(8, 'Robot IC', 'cổng tầng ôzn', 'RFID_GATE', 'tầng 2', 'ONLINE', '192.168.12.5', NULL, '34', NULL, NULL, 0, 0, 1, 100, '2026-11-13 12:22:46', 'ok', '2026-11-13 12:22:46.430056', '2026-11-13 12:22:46.430056');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `library_budgets`
--

CREATE TABLE `library_budgets` (
  `id` int(11) NOT NULL,
  `year` int(11) NOT NULL,
  `totalBudget` decimal(14,2) NOT NULL DEFAULT 0.00,
  `q1Allocation` decimal(14,2) NOT NULL DEFAULT 0.00,
  `q2Allocation` decimal(14,2) NOT NULL DEFAULT 0.00,
  `q3Allocation` decimal(14,2) NOT NULL DEFAULT 0.00,
  `q4Allocation` decimal(14,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `library_budgets`
--

INSERT INTO `library_budgets` (`id`, `year`, `totalBudget`, `q1Allocation`, `q2Allocation`, `q3Allocation`, `q4Allocation`, `notes`, `createdAt`, `updatedAt`) VALUES
(1, 2026, 200000000.00, 50000000.00, 50000000.00, 50000000.00, 50000000.00, 'Ngân sách thu mua năm 2026', '2026-11-06 16:14:16.343818', '2026-11-12 16:43:06.000000');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `library_events`
--

CREATE TABLE `library_events` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `type` varchar(30) NOT NULL DEFAULT 'ANNOUNCEMENT',
  `content` text NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `startDate` datetime DEFAULT NULL,
  `endDate` datetime DEFAULT NULL,
  `bannerUrl` varchar(500) DEFAULT NULL,
  `isPinned` tinyint(4) NOT NULL DEFAULT 0,
  `targetAudience` varchar(30) NOT NULL DEFAULT 'ALL',
  `status` varchar(30) NOT NULL DEFAULT 'UPCOMING',
  `viewCount` int(11) NOT NULL DEFAULT 0,
  `createdByName` varchar(150) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `library_events`
--

INSERT INTO `library_events` (`id`, `title`, `type`, `content`, `location`, `startDate`, `endDate`, `bannerUrl`, `isPinned`, `targetAudience`, `status`, `viewCount`, `createdByName`, `createdAt`, `updatedAt`) VALUES
(1, 'Triển lãm & Ngày hội Sách mới Năm học 2026', 'EXHIBITION', 'Chào đón năm học mới, Thư viện tổ chức Tuần lễ Triển lãm Sách mới với hơn 500 đầu sách chuyên khảo, giáo trình đại học chuẩn quốc tế và ấn phẩm khoa học công nghệ vừa cập bến kho sách lưu chiểu.', 'Sảnh chính Tòa nhà Thư viện Trung tâm (Tầng 1)', '2026-11-12 21:03:00', '2026-11-19 21:03:00', 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80', 1, 'ALL', 'HAPPENING', 142, 'Thủ thư Ban quản lý', '2026-11-12 21:03:00.213397', '2026-11-12 21:03:00.213397'),
(2, 'Workshop: Kỹ năng Khai thác Cơ sở Dữ liệu & Tài nguyên Số Quốc tế', 'WORKSHOP', 'Khóa tập huấn chuyên sâu trang bị cho sinh viên năm cuối và nghiên cứu sinh phương pháp tìm kiếm tài liệu trên Scopus, IEEE Xplore, ScienceDirect và cách trích dẫn chuẩn IEEE / APA.', 'Phòng Hội thảo Đa phương tiện P.302', '2026-11-15 21:03:00', '2026-11-15 21:03:00', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80', 1, 'STUDENT', 'UPCOMING', 88, 'Thủ thư Huỳnh Thảo', '2026-11-12 21:03:00.220963', '2026-11-12 21:03:00.220963'),
(3, 'Thông báo: Tăng cường mở cửa phục vụ 24/7 trong Tuần lễ Thi học kỳ', 'ANNOUNCEMENT', 'Nhằm tạo điều kiện ôn tập tốt nhất cho toàn thể bạn đọc, từ ngày 15/11 đến hết 30/11, Thư viện mở cửa liên tục các phòng tự học Tầng 2 và Tầng 3 đến 23:00 mỗi ngày, có hỗ trợ nước uống và máy in tài liệu.', 'Toàn bộ không gian Thư viện', '2026-11-12 21:03:00', '2026-11-19 21:03:00', 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80', 0, 'ALL', 'HAPPENING', 215, 'Giám đốc Thư viện', '2026-11-12 21:03:00.225147', '2026-11-12 21:03:00.225147');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `library_partners`
--

CREATE TABLE `library_partners` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL DEFAULT 'ORGANIZATION',
  `contactPerson` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `totalDonatedBooks` int(11) NOT NULL DEFAULT 0,
  `totalDonatedCash` decimal(15,2) NOT NULL DEFAULT 0.00,
  `status` varchar(255) NOT NULL DEFAULT 'ACTIVE',
  `note` text DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `library_partners`
--

INSERT INTO `library_partners` (`id`, `name`, `type`, `contactPerson`, `email`, `phone`, `address`, `totalDonatedBooks`, `totalDonatedCash`, `status`, `note`, `createdAt`, `updatedAt`) VALUES
(1, 'Hội Cựu Sinh Viên Khóa 2015-2019', 'INDIVIDUAL_ALUMNI', 'ThS. Trần Quang Minh (Đại diện Ban liên lạc)', 'alumni.k15@university.edu.vn', '0912345678', 'Hà Nội, Việt Nam', 350, 50000000.00, 'ACTIVE', 'Tài trợ đợt kỷ niệm 10 năm ra trường nhằm xây dựng Tủ sách Khởi nghiệp & Kỹ năng mềm.', '2026-11-12 21:20:06.811387', '2026-11-12 21:20:06.811387'),
(2, 'Nhà Xuất Bản Khoa Học & Kỹ Thuật', 'PUBLISHER', 'Bà Nguyễn Thị Lan (Phó Giám đốc Đối ngoại)', 'contact@nxbkhkt.vn', '02438221234', '70 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội', 520, 0.00, 'ACTIVE', 'Đối tác chiến lược tài trợ sách giáo trình, sách chuyên khảo Kỹ thuật - Công nghệ hàng năm.', '2026-11-12 21:20:06.814144', '2026-11-12 21:20:06.814144'),
(3, 'Quỹ Giáo Dục & Phát Triển Văn Hóa Đọc Việt Nam', 'ORGANIZATION', 'TS. Phạm Thanh Tùng (Chủ tịch Quỹ)', 'support@readvietnam.org', '0988776655', 'Số 15 Lê Duẩn, Quận 1, TP. Hồ Chí Minh', 800, 120000000.00, 'ACTIVE', 'Tài trợ thiết bị đọc sách điện tử E-Reader và bản quyền giáo trình số Quốc tế.', '2026-11-12 21:20:06.816547', '2026-11-12 21:20:06.816547'),
(4, 'Tập Đoàn Công Nghệ FPT - Khối FPT Software', 'CORPORATION', 'Ông Lê Quốc Bảo (HR Talent Acquisition Manager)', 'baolq@fpt.com', '0905123987', 'Tòa nhà FPT Cầu Giấy, Duy Tân, Hà Nội', 210, 80000000.00, 'ACTIVE', 'Tài trợ chuyên mục sách Trí tuệ nhân tạo, Điện toán đám mây và Học bổng tra cứu số.', '2026-11-12 21:20:06.818043', '2026-11-12 21:20:06.818043');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `library_settings`
--

CREATE TABLE `library_settings` (
  `id` tinyint(4) NOT NULL DEFAULT 1,
  `maxActiveLoans` int(11) NOT NULL DEFAULT 5,
  `borrowDays` int(11) NOT NULL DEFAULT 14,
  `dailyFineRate` int(11) NOT NULL DEFAULT 5000,
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `renewalDays` int(11) NOT NULL DEFAULT 14,
  `fineLockThreshold` int(11) NOT NULL DEFAULT 50000,
  `autoLockOverdueDays` int(11) NOT NULL DEFAULT 30,
  `enableAutoLockOverdue` tinyint(4) NOT NULL DEFAULT 1,
  `enableAutoEmailReminders` tinyint(4) NOT NULL DEFAULT 1,
  `reminderDaysBeforeDue` int(11) NOT NULL DEFAULT 2,
  `vietqrBankId` varchar(50) NOT NULL DEFAULT 'MBBank',
  `vietqrAccountNo` varchar(50) NOT NULL DEFAULT '0388888888',
  `vietqrAccountName` varchar(150) NOT NULL DEFAULT 'THU VIEN DAI HOC',
  `vnpayTmnCode` varchar(50) NOT NULL DEFAULT '',
  `vnpayHashSecret` varchar(255) NOT NULL DEFAULT '',
  `vnpayUrl` varchar(255) NOT NULL DEFAULT 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  `momoPartnerCode` varchar(50) NOT NULL DEFAULT '',
  `momoAccessKey` varchar(255) NOT NULL DEFAULT '',
  `momoSecretKey` varchar(255) NOT NULL DEFAULT '',
  `cardRegistrationFee` int(11) NOT NULL DEFAULT 20000,
  `cardReissueFee` int(11) NOT NULL DEFAULT 50000,
  `autoBackupSchedule` varchar(20) NOT NULL DEFAULT 'DAILY',
  `lastBackupAt` datetime DEFAULT NULL,
  `backupRetentionDays` int(11) NOT NULL DEFAULT 30,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `smtpHost` varchar(150) NOT NULL DEFAULT 'smtp.gmail.com',
  `smtpPort` int(11) NOT NULL DEFAULT 587,
  `smtpSecure` tinyint(4) NOT NULL DEFAULT 0,
  `smtpUser` varchar(150) NOT NULL DEFAULT '',
  `smtpPassword` varchar(255) NOT NULL DEFAULT '',
  `smtpFrom` varchar(150) NOT NULL DEFAULT 'thuvien@daihoc.edu.vn',
  `smsProvider` varchar(50) NOT NULL DEFAULT 'ESMS',
  `smsApiKey` varchar(255) NOT NULL DEFAULT '',
  `smsApiSecret` varchar(255) NOT NULL DEFAULT '',
  `smsBrandName` varchar(100) NOT NULL DEFAULT 'THUVIEN_EDU',
  `smsEndpoint` varchar(255) NOT NULL DEFAULT 'https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_get/',
  `enableSmsOtp` tinyint(4) NOT NULL DEFAULT 0,
  `readerGroupQuotas` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`readerGroupQuotas`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `library_settings`
--

INSERT INTO `library_settings` (`id`, `maxActiveLoans`, `borrowDays`, `dailyFineRate`, `updatedAt`, `renewalDays`, `fineLockThreshold`, `autoLockOverdueDays`, `enableAutoLockOverdue`, `enableAutoEmailReminders`, `reminderDaysBeforeDue`, `vietqrBankId`, `vietqrAccountNo`, `vietqrAccountName`, `vnpayTmnCode`, `vnpayHashSecret`, `vnpayUrl`, `momoPartnerCode`, `momoAccessKey`, `momoSecretKey`, `cardRegistrationFee`, `cardReissueFee`, `autoBackupSchedule`, `lastBackupAt`, `backupRetentionDays`, `createdAt`, `smtpHost`, `smtpPort`, `smtpSecure`, `smtpUser`, `smtpPassword`, `smtpFrom`, `smsProvider`, `smsApiKey`, `smsApiSecret`, `smsBrandName`, `smsEndpoint`, `enableSmsOtp`, `readerGroupQuotas`) VALUES
(1, 5, 14, 5000, '2026-11-01 13:15:08.735092', 14, 50000, 30, 1, 1, 2, 'MBBank', '0388888888', 'THU VIEN DAI HOC', '', '', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html', '', '', '', 20000, 50000, 'DAILY', NULL, 30, '2026-11-06 19:28:22.050969', 'smtp.gmail.com', 587, 0, '', '', 'thuvien@daihoc.edu.vn', 'ESMS', '', '', 'THUVIEN_EDU', 'https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_get/', 0, NULL);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `library_tutorials`
--

CREATE TABLE `library_tutorials` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `category` varchar(30) NOT NULL DEFAULT 'SEARCH_GUIDE',
  `format` varchar(20) NOT NULL DEFAULT 'VIDEO',
  `description` text NOT NULL,
  `contentUrl` varchar(500) NOT NULL,
  `thumbnailUrl` varchar(500) DEFAULT NULL,
  `instructor` varchar(150) DEFAULT NULL,
  `durationMinutes` int(11) DEFAULT NULL,
  `eventDate` datetime DEFAULT NULL,
  `maxSeats` int(11) DEFAULT 50,
  `registeredCount` int(11) NOT NULL DEFAULT 0,
  `viewCount` int(11) NOT NULL DEFAULT 0,
  `isFeatured` tinyint(4) NOT NULL DEFAULT 0,
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `library_tutorials`
--

INSERT INTO `library_tutorials` (`id`, `title`, `category`, `format`, `description`, `contentUrl`, `thumbnailUrl`, `instructor`, `durationMinutes`, `eventDate`, `maxSeats`, `registeredCount`, `viewCount`, `isFeatured`, `status`, `createdAt`, `updatedAt`) VALUES
(1, 'Video Hướng dẫn: Khai thác Cổng tra cứu OPAC & Tìm kiếm Nâng cao', 'SEARCH_GUIDE', 'VIDEO', 'Khám phá cách tra cứu sách theo tiêu đề, tác giả, chỉ số phân loại DDC, và sử dụng các toán tử AND, OR, NOT để tìm chính xác tài liệu bạn cần trong 30 giây.', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80', 'ThS. Nguyễn Văn Toàn', 12, NULL, 50, 0, 320, 1, 'ACTIVE', '2026-11-12 21:03:00.244852', '2026-11-12 21:03:00.244852'),
(2, 'Cẩm nang & Quy định Mượn trả Sách in, Thiết bị và Tủ khóa', 'POLICY_RULES', 'PDF', 'Tài liệu hướng dẫn tổng hợp các quy định về hạn mức mượn sách, cách gia hạn online, biểu phí bồi thường hư hại và quy chế sử dụng phòng học nhóm.', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80', 'Ban Quản trị Thư viện', 8, NULL, 50, 0, 450, 1, 'ACTIVE', '2026-11-12 21:03:00.248770', '2026-11-12 21:03:00.248770'),
(3, 'Workshop: Kỹ năng Thông tin (Information Literacy) cho Sinh viên Khóa mới', 'WORKSHOP', 'WORKSHOP', 'Buổi tập huấn thực hành trực tiếp: Đánh giá độ tin cậy của nguồn tin học thuật, tránh đạo văn (Plagiarism) và sử dụng phần mềm quản lý trích dẫn Zotero/Mendeley.', 'https://thuvien.edu.vn/workshops/info-lit-2026', 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=600&q=80', 'TS. Phan Thanh Tùng & Nhóm Hướng dẫn', 90, '2026-11-17 21:03:00', 60, 38, 195, 1, 'UPCOMING', '2026-11-12 21:03:00.253540', '2026-11-12 21:03:00.253540'),
(4, 'Hướng dẫn Truy cập Cơ sở Dữ liệu Điện tử từ xa qua VPN Thư viện', 'DIGITAL_RESOURCES', 'ARTICLE', 'Từng bước cài đặt cấu hình VPN Proxy của Nhà trường để truy cập miễn phí toàn văn hàng triệu bài báo khoa học trên Springer, IEEE và ScienceDirect từ', 'https://thuvien.edu.vn/guides/vpn-remote-access', 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80', 'Phòng Công nghệ Thông tin', 10, NULL, 50, 0, 281, 0, 'ACTIVE', '2026-11-12 21:03:00.257258', '2026-11-12 21:16:41.000000');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `lockers`
--

CREATE TABLE `lockers` (
  `id` int(11) NOT NULL,
  `lockerNumber` varchar(50) NOT NULL,
  `zone` varchar(100) NOT NULL DEFAULT 'Khu A - Tầng 1',
  `cluster` varchar(50) NOT NULL DEFAULT 'Dãy A1',
  `status` enum('VACANT','IN_USE','DAMAGED','MAINTENANCE') NOT NULL DEFAULT 'VACANT',
  `currentPin` varchar(10) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `currentUserId` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `locker_assignments`
--

CREATE TABLE `locker_assignments` (
  `id` int(11) NOT NULL,
  `assignmentType` enum('DAILY','LONG_TERM') NOT NULL DEFAULT 'DAILY',
  `assignedAt` datetime NOT NULL,
  `expiresAt` datetime NOT NULL,
  `returnedAt` datetime DEFAULT NULL,
  `pinCode` varchar(10) DEFAULT NULL,
  `status` enum('ACTIVE','OVERDUE','RETURNED','FORCED_OPEN') NOT NULL DEFAULT 'ACTIVE',
  `fineAmount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `lockerId` int(11) DEFAULT NULL,
  `userId` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `multimedia_items`
--

CREATE TABLE `multimedia_items` (
  `id` int(11) NOT NULL,
  `code` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL DEFAULT 'CD_DVD',
  `location` varchar(255) DEFAULT NULL,
  `condition` varchar(255) NOT NULL DEFAULT 'GOOD',
  `quantity` int(11) NOT NULL DEFAULT 1,
  `onSiteLoanCount` int(11) NOT NULL DEFAULT 0,
  `description` text DEFAULT NULL,
  `digitalFileUrl` varchar(255) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `multimedia_items`
--

INSERT INTO `multimedia_items` (`id`, `code`, `title`, `type`, `location`, `condition`, `quantity`, `onSiteLoanCount`, `description`, `digitalFileUrl`, `createdAt`, `updatedAt`) VALUES
(1, 'MM-CD-2024-001', 'Đĩa DVD: Lễ Kỷ Niệm 70 Năm Thành Lập Trường và Lịch Sử Phát Triển Thư Viện', 'CD_DVD', 'Kệ Tư liệu Lịch sử A1 - Ngăn 3', 'GOOD', 5, 42, 'Tư liệu video độ phân giải cao 4K ghi lại các dấu mốc quan trọng và phỏng vấn các thế hệ Hiệu trưởng qua các thời kỳ.', 'https://archive.org/details/bk-history-70yrs', '2026-11-13 07:35:22.551178', '2026-11-13 07:35:22.551178'),
(2, 'MM-MAP-1975-004', 'Bản Đồ Địa Chính & Quy Hoạch Khuôn Viên Học Xá Đại Học Bách Khoa (Bản vẽ tay 1975)', 'MAP', 'Tủ Bản đồ & Bản vẽ Quy hoạch B3', 'NEED_DIGITIZATION', 2, 18, 'Bản đồ khổ lớn giấy can, mực in nguyên bản. Cần ưu tiên chụp số hóa độ phân giải cao để bảo tồn tài liệu gốc.', NULL, '2026-11-13 07:35:22.552954', '2026-11-13 07:35:22.552954'),
(3, 'MM-CAS-1988-002', 'Băng Cassette: Bài Giảng Đại Số Tuyến Tính của Cố GS. Lê Văn Thiêm', 'CASSETTE', 'Hộp Chống ẩm Tư liệu Âm thanh C1', 'NEED_DIGITIZATION', 1, 12, 'Băng từ analog ghi âm trực tiếp tại giảng đường năm 1988. Đã lên kế hoạch chuyển đổi sang định dạng số FLAC.', NULL, '2026-11-13 07:35:22.555286', '2026-11-13 07:35:22.555286'),
(4, 'MM-PHOTO-1960-010', 'Bộ Ảnh Tư Liệu Trắng Đen: Đoàn Chuyên Gia Liên Xô Hỗ Trợ Xây Dựng Thư Viện (1960-1965)', 'HISTORIC_PHOTO', 'Album Tư liệu Đặc biệt - Phòng Truyền thống', 'GOOD', 24, 65, 'Tập hợp 24 bức ảnh gốc kèm chú thích chữ Nga - Việt về các kỹ sư và chuyên gia thư viện học Liên Xô.', '/uploads/multimedia/soviet-experts-1960.zip', '2026-11-13 07:35:22.556180', '2026-11-13 07:35:22.556180');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `type` varchar(20) NOT NULL,
  `title` varchar(160) NOT NULL,
  `message` text NOT NULL,
  `emailStatus` varchar(20) NOT NULL DEFAULT 'NOT_CONFIGURED',
  `emailError` text DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `readAt` datetime DEFAULT NULL,
  `userId` int(11) DEFAULT NULL,
  `borrowRecordId` int(11) DEFAULT NULL,
  `reservationId` int(11) DEFAULT NULL,
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `notifications`
--

INSERT INTO `notifications` (`id`, `type`, `title`, `message`, `emailStatus`, `emailError`, `createdAt`, `readAt`, `userId`, `borrowRecordId`, `reservationId`, `updatedAt`) VALUES
(1, 'OVERDUE', 'Cảnh báo: Sách mượn đã quá hạn hoàn trả & Báo nộp phạt', 'Kính gửi he, cuốn sách \"Design Patterns: Mẫu Thiết Kế Hướng Đối Tượng\" đã quá hạn hoàn trả vào ngày 10/11/2026. Tiền phạt phát sinh hiện tại: 20.000 VNĐ. Đề nghị bạn hoàn trả ngay tại quầy hoặc thanh toán trực tuyến.', 'NOT_CONFIGURED', NULL, '2026-11-13 08:11:54.622747', NULL, 2, 7, NULL, '2026-11-13 08:11:54.622747');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `notification_templates`
--

CREATE TABLE `notification_templates` (
  `id` int(11) NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `channel` varchar(20) NOT NULL DEFAULT 'EMAIL',
  `subject` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `isActive` tinyint(4) NOT NULL DEFAULT 1,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `notification_templates`
--

INSERT INTO `notification_templates` (`id`, `code`, `name`, `channel`, `subject`, `content`, `isActive`, `createdAt`, `updatedAt`) VALUES
(1, 'DUE_REMINDER', 'Nhắc nhở sách sắp đến hạn trả', 'EMAIL', 'Thư viện: Sách mượn sắp đến hạn hoàn trả', 'Kính gửi {TEN_DOC_GIA}, đầu sách \"{TEN_SACH}\" của bạn sắp đến hạn trả vào ngày {NGAY_HET_HAN}. Vui lòng sắp xếp trả sách hoặc truy cập hệ thống thư viện để gia hạn trực tuyến.', 1, '2026-11-12 19:36:56.699483', '2026-11-12 19:36:56.699483'),
(2, 'OVERDUE_ALERT', 'Cảnh báo sách mượn quá hạn & Báo phạt', 'EMAIL', 'Cảnh báo: Sách mượn đã quá hạn hoàn trả & Báo nộp phạt', 'Kính gửi {TEN_DOC_GIA}, cuốn sách \"{TEN_SACH}\" đã quá hạn hoàn trả vào ngày {NGAY_HET_HAN}. Tiền phạt phát sinh hiện tại: {SO_TIEN_PHAT} VNĐ. Đề nghị bạn hoàn trả ngay tại quầy hoặc thanh toán trực tuyến.', 1, '2026-11-12 19:36:56.719367', '2026-11-12 19:36:56.719367'),
(3, 'FINE_NOTICE', 'Thông báo nộp phạt trễ hạn', 'EMAIL', 'Thông báo: Phát sinh phí phạt trễ hạn sách \"{TEN_SACH}\"', 'Kính gửi {TEN_DOC_GIA}, hệ thống ghi nhận khoản tiền phạt phát sinh cho cuốn sách \"{TEN_SACH}\" là {SO_TIEN_PHAT} VNĐ do quá hạn ngày {NGAY_HET_HAN}. Vui lòng quét mã QR thanh toán hoặc nộp phạt trực tiếp tại quầy thư viện.', 1, '2026-11-12 19:36:56.727922', '2026-11-12 19:36:56.727922'),
(4, 'HOLD_READY', 'Sách đặt trước đã có sẵn tại quầy (24h)', 'EMAIL', 'Xác nhận giữ chỗ: Cuốn sách \"{TEN_SACH}\" đã sẵn sàng tại quầy', 'Kính gửi {TEN_DOC_GIA}, cuốn sách \"{TEN_SACH}\" bạn đã đặt giữ chỗ hiện đã có bản sao sẵn sàng tại quầy thư viện. Hạn giữ sách đến hết {NGAY_HET_HAN_GIU} (trong vòng 24 giờ). Vui lòng mang thẻ thư viện {MA_THE} đến nhận sách.', 1, '2026-11-12 19:36:56.734581', '2026-11-12 19:36:56.734581'),
(5, 'RESERVATION_CONFIRM', 'Xác nhận đăng ký giữ chỗ sách', 'EMAIL', 'Xác nhận: Đã tiếp nhận đăng ký đặt giữ sách \"{TEN_SACH}\"', 'Kính gửi {TEN_DOC_GIA}, bạn đã đăng ký đặt giữ chỗ thành công cho cuốn sách \"{TEN_SACH}\". Hệ thống sẽ tự động gửi email thông báo ngay khi có sách hoàn trả vào kho.', 1, '2026-11-12 19:36:56.740243', '2026-11-12 19:36:56.740243'),
(6, 'ACQUISITION_APPROVED', 'Đề xuất mua sách được duyệt', 'EMAIL', 'Đề xuất mua sách của bạn đã được phê duyệt', 'Chào {TEN_DOC_GIA}, thư viện đã phê duyệt đề xuất bổ sung cuốn sách \"{TEN_SACH}\". Sách sẽ được nhập kho và thông báo tới bạn sớm nhất.', 1, '2026-11-12 19:36:56.745070', '2026-11-12 19:36:56.745070'),
(7, 'CARD_EXPIRE_REMINDER', 'Nhắc gia hạn thẻ thư viện', 'SMS', 'Thẻ thư viện sắp hết hạn', 'Kính gửi {TEN_DOC_GIA}, thẻ thư viện số {MA_THE} của bạn sẽ hết hiệu lực vào ngày {NGAY_HET_HAN}. Vui lòng liên hệ quầy hoặc gia hạn qua cổng cá nhân.', 1, '2026-11-12 19:36:56.750099', '2026-11-12 19:36:56.750099');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `publishers`
--

CREATE TABLE `publishers` (
  `id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `website` varchar(500) DEFAULT NULL,
  `contactPerson` varchar(100) DEFAULT NULL,
  `taxCode` varchar(50) DEFAULT NULL,
  `qualityRating` int(11) DEFAULT 5,
  `deliverySpeed` varchar(50) DEFAULT 'ON_TIME',
  `discountRate` decimal(5,2) DEFAULT 0.00,
  `reputationNotes` text DEFAULT NULL,
  `logoUrl` varchar(500) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `publishers`
--

INSERT INTO `publishers` (`id`, `name`, `email`, `phone`, `address`, `website`, `contactPerson`, `taxCode`, `qualityRating`, `deliverySpeed`, `discountRate`, `reputationNotes`, `logoUrl`, `createdAt`, `updatedAt`) VALUES
(1, 'Kim Đồng', 'an108972@donga.edu.vn', '0354352106', '158 Nhân Sự', NULL, NULL, NULL, 5, 'ON_TIME', 0.00, NULL, NULL, '2026-11-06 18:47:34.621776', '2026-11-06 18:47:34.626104'),
(2, 'Đại Đông', 'phak@gmail.com', '0744833222', '1528 Nhân Sự', NULL, NULL, NULL, 5, 'ON_TIME', 0.00, NULL, NULL, '2026-11-06 18:47:34.621776', '2026-11-06 18:47:34.626104'),
(3, 'NXB Đại học Quốc gia Hà Nội', 'dhqg@vnu.edu.vn', '02437547721', '144 Xuân Thủy, Cầu Giấy, Hà Nội', NULL, NULL, NULL, 5, 'ON_TIME', 0.00, NULL, NULL, '2026-11-13 08:11:24.677286', '2026-11-13 08:11:24.677286'),
(4, 'NXB Bách Khoa Hà Nội', 'nxbbk@hust.edu.vn', '02438684569', '1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội', NULL, NULL, NULL, 5, 'ON_TIME', 0.00, NULL, NULL, '2026-11-13 08:11:24.680603', '2026-11-13 08:11:24.680603'),
(5, 'NXB Thông tin & Truyền thông', 'nxb.tttt@mic.gov.vn', '02435772138', '115 Trần Duy Hưng, Cầu Giấy, Hà Nội', NULL, NULL, NULL, 5, 'ON_TIME', 0.00, NULL, NULL, '2026-11-13 08:11:24.683579', '2026-11-13 08:11:24.683579'),
(6, 'NXB Trẻ', 'hopthu@nxbtre.com.vn', '02839316289', '161B Lý Chính Thắng, Quận 3, TP.HCM', NULL, NULL, NULL, 5, 'ON_TIME', 0.00, NULL, NULL, '2026-11-13 08:11:24.686653', '2026-11-13 08:11:24.686653'),
(7, 'NXB Nhã Nam', 'contact@nhanam.vn', '02435146875', '59 Đỗ Quang, Cầu Giấy, Hà Nội', NULL, NULL, NULL, 5, 'ON_TIME', 0.00, NULL, NULL, '2026-11-13 08:11:24.689557', '2026-11-13 08:11:24.689557'),
(8, 'NXB Kim Đồng', 'cskh_online@nxbkimdong.com.vn', '02439434730', '55 Quang Trung, Hoàn Kiếm, Hà Nội', NULL, NULL, NULL, 5, 'ON_TIME', 0.00, NULL, NULL, '2026-11-13 08:11:24.692724', '2026-11-13 08:11:24.692724');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `purchase_orders`
--

CREATE TABLE `purchase_orders` (
  `id` int(11) NOT NULL,
  `orderCode` varchar(50) NOT NULL,
  `supplierName` varchar(150) NOT NULL,
  `supplierPhone` varchar(30) DEFAULT NULL,
  `supplierEmail` varchar(150) DEFAULT NULL,
  `totalAmount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` varchar(20) NOT NULL DEFAULT 'DRAFT',
  `expectedDeliveryDate` date DEFAULT NULL,
  `note` text DEFAULT NULL,
  `createdByName` varchar(255) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `purchase_orders`
--

INSERT INTO `purchase_orders` (`id`, `orderCode`, `supplierName`, `supplierPhone`, `supplierEmail`, `totalAmount`, `status`, `expectedDeliveryDate`, `note`, `createdByName`, `createdAt`, `updatedAt`) VALUES
(1, 'PO-2026-001', 'Nhà xuất bản Giáo Dục Việt Nam', '02438220801', 'kinhdoanh@nxbgd.vn', 42500000.00, 'COMPLETED', NULL, 'Nhập giáo trình Giải tích, Đại số tuyến tính và Vật lý đại cương cho sinh viên năm nhất', 'Nguyễn Văn Quản (Thủ thư trưởng)', '2026-02-15 09:30:00.000000', '2026-02-15 09:30:00.000000'),
(2, 'PO-2026-002', 'Công ty Cổ phần Phát hành Sách FAHASA', '1900636467', 'order@fahasa.com.vn', 18000000.00, 'COMPLETED', NULL, 'Nhập bổ sung sách luyện thi IELTS Academic và TOEIC 800+ chuẩn quốc tế', 'Trần Thị Thu (Thủ thư kho)', '2026-03-22 14:15:00.000000', '2026-03-22 14:15:00.000000'),
(3, 'PO-2026-003', 'Nhà xuất bản Thông tin và Truyền thông', '02435772143', 'nxb.tttt@mic.gov.vn', 48200000.00, 'COMPLETED', NULL, 'Nhập tài liệu chuyên ngành An toàn thông tin, Điện toán đám mây & AI Thực chiến', 'Nguyễn Văn Quản (Thủ thư trưởng)', '2026-04-18 10:00:00.000000', '2026-04-18 10:00:00.000000'),
(4, 'PO-2026-004', 'Nhà xuất bản Trẻ', '02839316289', 'hopthubandoc@nxbtre.com.vn', 22000000.00, 'COMPLETED', NULL, 'Nhập sách Khởi nghiệp đổi mới sáng tạo, Quản trị doanh nghiệp và Kỹ năng lãnh đạo', 'Lê Văn Thư (Thủ thư nghiệp vụ)', '2026-06-05 11:45:00.000000', '2026-06-05 11:45:00.000000'),
(5, 'PO-2026-005', 'Công ty Cổ phần Văn hóa & Truyền thông Nhã Nam', '02435146875', 'contact@nhanam.vn', 34800000.00, 'COMPLETED', NULL, 'Bổ sung danh mục tiểu thuyết kinh điển, lịch sử văn minh thế giới và tâm lý học hành vi', 'Trần Thị Thu (Thủ thư kho)', '2026-08-20 15:30:00.000000', '2026-08-20 15:30:00.000000'),
(6, 'PO-2026-006', 'Nhà xuất bản Khoa học & Kỹ thuật', '02438253168', 'nxbkhkt@hn.vnn.vn', 28500000.00, 'ORDERED', NULL, 'Đơn đặt hàng thiết kế vi mạch bán dẫn VLSI và Trí tuệ nhân tạo nâng cao cho kỳ mới', 'Nguyễn Văn Quản (Thủ thư trưởng)', '2026-09-12 16:20:00.000000', '2026-09-12 16:20:00.000000');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `purchase_order_items`
--

CREATE TABLE `purchase_order_items` (
  `id` int(11) NOT NULL,
  `bookTitle` varchar(255) NOT NULL,
  `author` varchar(255) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `unitPrice` decimal(12,2) NOT NULL DEFAULT 0.00,
  `totalPrice` decimal(12,2) NOT NULL DEFAULT 0.00,
  `orderId` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `purchase_requests`
--

CREATE TABLE `purchase_requests` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `author` varchar(255) NOT NULL,
  `publisher` varchar(150) DEFAULT NULL,
  `isbn` varchar(50) DEFAULT NULL,
  `publicationYear` int(11) DEFAULT NULL,
  `estimatedPrice` decimal(12,2) NOT NULL DEFAULT 0.00,
  `reason` text DEFAULT NULL,
  `referenceUrl` varchar(1024) DEFAULT NULL,
  `adminNote` text DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `userId` int(11) NOT NULL,
  `votesCount` int(11) NOT NULL DEFAULT 0,
  `currentApprovalStage` varchar(30) DEFAULT 'LIBRARIAN',
  `librarianApprovedBy` varchar(150) DEFAULT NULL,
  `librarianApprovedAt` datetime DEFAULT NULL,
  `librarianNote` text DEFAULT NULL,
  `deanApprovedBy` varchar(150) DEFAULT NULL,
  `deanApprovedAt` datetime DEFAULT NULL,
  `deanNote` text DEFAULT NULL,
  `rectorApprovedBy` varchar(150) DEFAULT NULL,
  `rectorApprovedAt` datetime DEFAULT NULL,
  `rectorNote` text DEFAULT NULL,
  `rejectionReason` text DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'PENDING'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `purchase_request_votes`
--

CREATE TABLE `purchase_request_votes` (
  `id` int(11) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `requestId` int(11) DEFAULT NULL,
  `userId` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `reader_feedback`
--

CREATE TABLE `reader_feedback` (
  `id` int(11) NOT NULL,
  `senderName` varchar(150) NOT NULL,
  `senderEmail` varchar(150) DEFAULT NULL,
  `senderPhone` varchar(30) DEFAULT NULL,
  `cardNumber` varchar(50) DEFAULT NULL,
  `category` varchar(30) NOT NULL DEFAULT 'SERVICE_QUALITY',
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `rating` int(11) NOT NULL DEFAULT 5,
  `status` varchar(30) NOT NULL DEFAULT 'PENDING',
  `response` text DEFAULT NULL,
  `respondedByName` varchar(150) DEFAULT NULL,
  `respondedAt` datetime DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `userId` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `reader_feedback`
--

INSERT INTO `reader_feedback` (`id`, `senderName`, `senderEmail`, `senderPhone`, `cardNumber`, `category`, `title`, `content`, `rating`, `status`, `response`, `respondedByName`, `respondedAt`, `createdAt`, `updatedAt`, `userId`) VALUES
(1, 'Trần Minh Đức', 'duc.tm22@student.edu.vn', '0912345678', 'TV-00102', 'FACILITIES', 'Đề xuất bổ sung thêm ổ cắm điện tại khu vực tự học Tầng 3', 'Em thấy khu vực bàn nhóm Tầng 3 rất thoáng mát và yên tĩnh, nhưng các dãy bàn giữa còn thiếu ổ cắm sạc cho laptop. Kính mong Thư viện trang bị thêm ổ cắm dây nối dài để chúng em làm đồ án thuận tiện hơn.', 4, 'RESOLVED', 'Cảm ơn phản hồi rất thực tế của bạn. Bộ phận kỹ thuật đã tiến hành lắp đặt thêm 4 hộp ổ cắm đa năng tại các dãy bàn Tầng 3 từ ngày 10/11.', 'Thủ thư Trực ban Nguyễn Long', '2026-11-12 21:03:00', '2026-11-12 21:03:00.231538', '2026-11-12 21:03:00.231538', NULL),
(2, 'TS. Lê Hoàng Nam', 'nam.lh@university.edu.vn', '0988776655', 'GV-00045', 'BOOK_REQUEST', 'Ý kiến bổ sung tạp chí và tài liệu chuyên sâu về Machine Learning & Big Data', 'Bộ môn Trí tuệ Nhân tạo đang hướng dẫn các đề tài tốt nghiệp khóa mới. Đề nghị Thư viện liên kết hoặc mua thêm bản quyền điện tử các chuyên san của Springer Nature và O\'Reilly 2025-2026.', 5, 'IN_PROGRESS', 'Ban Giám đốc Thư viện đã tiếp nhận ý kiến của Thầy và đưa vào danh mục thẩm định kinh phí bổ sung ngân sách Quý 4.', 'Thủ thư Huỳnh Thảo', '2026-11-12 21:03:00', '2026-11-12 21:03:00.235267', '2026-11-12 21:03:00.235267', NULL),
(3, 'Phạm Thị Thùy Linh', 'linh.ptt@student.edu.vn', '0903112233', 'TV-00389', 'SERVICE_QUALITY', 'Thái độ phục vụ của các cô thủ thư tại quầy mượn trả rất tận tình', 'Hôm qua em đến mượn giáo trình ôn tập muộn sát giờ đóng cửa nhưng các cô thủ thư vẫn kiên nhẫn hướng dẫn em quét mã vạch và lấy sách trên kệ. Em xin gửi lời cảm ơn chân thành tới ban quản trị thư viện!', 5, 'RESOLVED', 'Thư viện rất vui khi nhận được lời động viên của bạn. Đây là động lực lớn để toàn thể đội ngũ nâng cao hơn nữa chất lượng phục vụ độc giả.', 'Thủ thư Trưởng quầy', '2026-11-12 21:03:00', '2026-11-12 21:03:00.238668', '2026-11-12 21:03:00.238668', NULL);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `reservations`
--

CREATE TABLE `reservations` (
  `id` int(11) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'WAITING',
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `readyAt` datetime DEFAULT NULL,
  `expiresAt` datetime DEFAULT NULL,
  `userId` int(11) DEFAULT NULL,
  `bookId` int(11) DEFAULT NULL,
  `copyId` int(11) DEFAULT NULL,
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `reviews`
--

CREATE TABLE `reviews` (
  `id` int(11) NOT NULL,
  `rating` int(11) NOT NULL,
  `comment` text DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `userId` int(11) DEFAULT NULL,
  `bookId` int(11) DEFAULT NULL,
  `isVisible` tinyint(4) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `room_bookings`
--

CREATE TABLE `room_bookings` (
  `id` int(11) NOT NULL,
  `groupName` varchar(150) NOT NULL,
  `memberCount` int(11) NOT NULL DEFAULT 2,
  `purpose` text DEFAULT NULL,
  `date` date NOT NULL,
  `startTime` varchar(10) NOT NULL,
  `endTime` varchar(10) NOT NULL,
  `status` enum('PENDING','APPROVED','CHECKED_IN','CANCELLED','NO_SHOW','COMPLETED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `checkedInAt` datetime DEFAULT NULL,
  `rejectionReason` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `roomId` int(11) DEFAULT NULL,
  `userId` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `room_violations`
--

CREATE TABLE `room_violations` (
  `id` int(11) NOT NULL,
  `reason` varchar(255) NOT NULL,
  `isBlocked` tinyint(4) NOT NULL DEFAULT 1,
  `blockedUntil` date DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `userId` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `shift_schedules`
--

CREATE TABLE `shift_schedules` (
  `id` int(11) NOT NULL,
  `shiftDate` date NOT NULL,
  `shiftType` varchar(255) NOT NULL DEFAULT 'MORNING',
  `zone` varchar(255) NOT NULL DEFAULT 'CIRCULATION_DESK',
  `staffId` int(11) DEFAULT NULL,
  `staffName` varchar(255) NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'ASSIGNED',
  `swapWithStaffName` varchar(255) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `shift_schedules`
--

INSERT INTO `shift_schedules` (`id`, `shiftDate`, `shiftType`, `zone`, `staffId`, `staffName`, `status`, `swapWithStaffName`, `note`, `createdAt`, `updatedAt`) VALUES
(1, '2026-11-13', 'MORNING', 'CIRCULATION_DESK', 1, 'Thủ thư Nguyễn Văn Quản', 'ASSIGNED', NULL, 'Trực quầy chính & tiếp nhận thẻ tân sinh viên', '2026-11-13 07:35:22.577253', '2026-11-13 07:35:22.577253'),
(2, '2026-11-13', 'AFTERNOON', 'READING_ROOM', 2, 'Thủ thư Lê Thị Hồng', 'ASSIGNED', NULL, 'Kiểm soát trật tự phòng tự học tầng 2', '2026-11-13 07:35:22.578493', '2026-11-13 07:35:22.578493'),
(3, '2026-11-13', 'EVENING', 'STACKS_STORAGE', 3, 'Thủ thư Trần Đình Trọng', 'ASSIGNED', NULL, 'Sắp xếp sách hoàn trả về kệ chuẩn Dewey', '2026-11-13 07:35:22.580540', '2026-11-13 07:35:22.580540'),
(4, '2026-11-14', 'MORNING', 'MULTIMEDIA_ROOM', 4, 'Thủ thư Hoàng Thảo My', 'ASSIGNED', NULL, 'Hỗ trợ sinh viên sử dụng phòng máy tính & E-Library', '2026-11-13 07:35:22.581333', '2026-11-13 07:35:22.581333'),
(5, '2026-11-14', 'AFTERNOON', 'CIRCULATION_DESK', 1, 'Thủ thư Nguyễn Văn Quản', 'SWAPPED', 'Thủ thư Lê Thị Hồng', 'Đã đổi ca trực theo thỏa thuận nội bộ', '2026-11-13 07:35:22.582180', '2026-11-13 07:35:22.582180'),
(6, '2026-11-15', 'EVENING', 'READING_ROOM', 2, 'Thủ thư Lê Thị Hồng', 'LEAVE_REQUESTED', NULL, 'Báo nghỉ phép bận việc gia đình, nhờ đồng nghiệp trực thay', '2026-11-13 07:35:22.584058', '2026-11-13 07:35:22.584058');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `staff_kpis`
--

CREATE TABLE `staff_kpis` (
  `id` int(11) NOT NULL,
  `staffId` int(11) NOT NULL,
  `staffName` varchar(255) NOT NULL,
  `roleTitle` varchar(255) NOT NULL DEFAULT 'Thủ thư nghiệp vụ',
  `monthYear` varchar(255) NOT NULL DEFAULT '2026-11',
  `catalogedBooksCount` int(11) NOT NULL DEFAULT 0,
  `processedLoansCount` int(11) NOT NULL DEFAULT 0,
  `inventoryAuditsCount` int(11) NOT NULL DEFAULT 0,
  `satisfactionScore` decimal(3,2) NOT NULL DEFAULT 4.80,
  `totalKpiPoints` int(11) NOT NULL DEFAULT 85,
  `kpiRank` varchar(255) NOT NULL DEFAULT 'GOOD',
  `note` text DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `staff_kpis`
--

INSERT INTO `staff_kpis` (`id`, `staffId`, `staffName`, `roleTitle`, `monthYear`, `catalogedBooksCount`, `processedLoansCount`, `inventoryAuditsCount`, `satisfactionScore`, `totalKpiPoints`, `kpiRank`, `note`, `createdAt`, `updatedAt`) VALUES
(1, 1, 'Thủ thư Nguyễn Văn Quản', 'Thủ thư Quầy Lưu hành', '2026-11', 145, 680, 12, 4.90, 95, 'EXCELLENT', 'Hiệu suất phục vụ mượn trả vượt 125% chỉ tiêu tháng. Đạt 100% đánh giá 5 sao từ độc giả.', '2026-11-13 07:35:22.588337', '2026-11-13 07:35:22.588337'),
(2, 2, 'Thủ thư Lê Thị Hồng', 'Thủ thư Biên mục & Xử lý Kỹ thuật', '2026-11', 320, 210, 8, 4.80, 88, 'GOOD', 'Hoàn thành xuất sắc tiến độ nhập kho 3 đợt sách tài trợ mới và dán nhãn RFID nhanh chóng.', '2026-11-13 07:35:22.589976', '2026-11-13 07:35:22.589976'),
(3, 3, 'Thủ thư Trần Đình Trọng', 'Thủ thư Quản lý Kho & Bảo quản', '2026-11', 80, 390, 25, 4.60, 82, 'GOOD', 'Duy trì trật tự giá sách tầng 2-3 và phát hiện xử lý kịp thời 4 đầu sách hư hỏng gáy.', '2026-11-13 07:35:22.591721', '2026-11-13 07:35:22.591721'),
(4, 4, 'Thủ thư Hoàng Thảo My', 'Thủ thư Thư viện số & Hỗ trợ Bạn đọc', '2026-11', 65, 180, 5, 4.70, 78, 'GOOD', 'Tổ chức 2 buổi workshop Information Literacy thành công với hơn 200 sinh viên tham gia.', '2026-11-13 07:35:22.592652', '2026-11-13 07:35:22.592652');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `study_rooms`
--

CREATE TABLE `study_rooms` (
  `id` int(11) NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `capacity` int(11) NOT NULL DEFAULT 6,
  `equipment` text DEFAULT NULL,
  `status` enum('ACTIVE','MAINTENANCE','LOCKED') NOT NULL DEFAULT 'ACTIVE',
  `openingTime` varchar(10) NOT NULL DEFAULT '08:00',
  `closingTime` varchar(10) NOT NULL DEFAULT '21:00',
  `maxBookingHours` int(11) NOT NULL DEFAULT 2,
  `qrToken` varchar(100) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `theses`
--

CREATE TABLE `theses` (
  `id` int(11) NOT NULL,
  `code` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `authorName` varchar(255) NOT NULL,
  `studentId` varchar(255) DEFAULT NULL,
  `advisorName` varchar(255) NOT NULL,
  `major` varchar(255) NOT NULL,
  `defenseYear` int(11) NOT NULL DEFAULT 2025,
  `securityStatus` varchar(255) NOT NULL DEFAULT 'PUBLIC',
  `fileUrl` varchar(255) DEFAULT NULL,
  `abstract` text DEFAULT NULL,
  `viewCount` int(11) NOT NULL DEFAULT 0,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `theses`
--

INSERT INTO `theses` (`id`, `code`, `title`, `authorName`, `studentId`, `advisorName`, `major`, `defenseYear`, `securityStatus`, `fileUrl`, `abstract`, `viewCount`, `createdAt`, `updatedAt`) VALUES
(1, 'LV-2025-CNTT-001', 'Nghiên cứu ứng dụng Mô hình Ngôn ngữ Lớn (LLM) trong hệ thống Phân loại và Tra cứu Thư viện Số', 'Đặng Tuấn Anh', '20210089', 'PGS. TS. Nguyễn Đức Dũng', 'Công nghệ Thông tin', 2025, 'PUBLIC', '/uploads/theses/lv-2025-cntt-001.pdf', 'Đề tài tập trung xây dựng pipeline trích xuất tri thức từ tài liệu học thuật và tích hợp mô hình ngôn ngữ tiếng Việt vào cổng tra cứu OPAC thế hệ mới.', 385, '2026-11-13 07:35:22.539449', '2026-11-13 07:35:22.539449'),
(2, 'LV-2025-AI-002', 'Tối ưu hóa Thuật toán Gợi ý Học liệu cá nhân hóa dựa trên Đồ thị Tri thức (Knowledge Graph)', 'Lê Thảo My', '20210452', 'TS. Hoàng Văn Thư', 'Trí tuệ Nhân tạo & Khoa học Dữ liệu', 2025, 'PUBLIC', '/uploads/theses/lv-2025-ai-002.pdf', 'Đề xuất thuật toán hybrid recommendation kết hợp hành vi mượn sách, lịch sử tìm kiếm số và quan hệ liên ngành giữa các giáo trình đại học.', 290, '2026-11-13 07:35:22.541974', '2026-11-13 07:35:22.541974'),
(3, 'LV-2024-QTKD-015', 'Chiến lược Chuyển đổi số và Quản trị Trải nghiệm Người dùng trong các Thư viện Đại học tại Việt Nam', 'Phạm Minh Quang', '20205510', 'TS. Vũ Bích Ngọc', 'Quản trị Kinh doanh', 2024, 'INTERNAL', '/uploads/theses/lv-2024-qtkd-015.pdf', 'Khảo sát 1,500 sinh viên tại 5 trường đại học trọng điểm về mức độ sẵn sàng đón nhận dịch vụ thư viện thông minh (Smart Library).', 172, '2026-11-13 07:35:22.544507', '2026-11-13 07:35:22.544507'),
(4, 'LV-2024-DTVT-008', 'Thiết kế Mạng Cảm biến IoT LoRaWAN giám sát điều kiện bảo quản Sách Cổ và Tư liệu Hán Nôm', 'Nguyễn Văn Hùng', '20203342', 'PGS. TS. Trần Cao Quyền', 'Điện tử - Viễn thông', 2024, 'RESTRICTED', '/uploads/theses/lv-2024-dtvt-008.pdf', 'Xây dựng phần cứng cảm biến năng lượng thấp, truyền thông xuyên tường hầm kho lưu trữ để kiểm soát độ ẩm và vi nấm gây hại tài liệu quý.', 94, '2026-11-13 07:35:22.545571', '2026-11-13 07:35:22.545571');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `tutorial_registrations`
--

CREATE TABLE `tutorial_registrations` (
  `id` int(11) NOT NULL,
  `fullName` varchar(150) NOT NULL,
  `email` varchar(150) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `cardNumber` varchar(50) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'REGISTERED',
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `tutorialId` int(11) DEFAULT NULL,
  `userId` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(255) NOT NULL,
  `passwordHash` varchar(255) NOT NULL,
  `currentHashedRefreshToken` varchar(255) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6) ON UPDATE current_timestamp(6),
  `email` varchar(255) DEFAULT NULL,
  `isActive` tinyint(4) NOT NULL DEFAULT 1,
  `role` varchar(20) NOT NULL DEFAULT 'READER',
  `maxActiveLoans` int(11) NOT NULL DEFAULT 5,
  `libraryCardIssuedAt` date DEFAULT NULL,
  `libraryCardExpiresAt` date DEFAULT NULL,
  `fullName` varchar(150) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `approvedAt` datetime DEFAULT NULL,
  `isTwoFactorEnabled` tinyint(4) NOT NULL DEFAULT 0,
  `twoFactorTempCode` varchar(100) DEFAULT NULL,
  `twoFactorCodeExpiresAt` datetime DEFAULT NULL,
  `passwordResetToken` varchar(100) DEFAULT NULL,
  `passwordResetExpiresAt` datetime DEFAULT NULL,
  `failedLoginAttempts` int(11) NOT NULL DEFAULT 0,
  `lockoutUntil` datetime DEFAULT NULL,
  `cardNumber` varchar(50) DEFAULT NULL,
  `readerGroup` varchar(30) DEFAULT 'STUDENT',
  `customPermissions` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `users`
--

INSERT INTO `users` (`id`, `username`, `passwordHash`, `currentHashedRefreshToken`, `createdAt`, `updatedAt`, `email`, `isActive`, `role`, `maxActiveLoans`, `libraryCardIssuedAt`, `libraryCardExpiresAt`, `fullName`, `phone`, `approvedAt`, `isTwoFactorEnabled`, `twoFactorTempCode`, `twoFactorCodeExpiresAt`, `passwordResetToken`, `passwordResetExpiresAt`, `failedLoginAttempts`, `lockoutUntil`, `cardNumber`, `readerGroup`, `customPermissions`) VALUES
(1, 'admin', '$2b$10$1Qp4LFp..AmWWCy0QHCncOXGvsYG5XgrDlztOp3/fRhxAfRf2Yvie', '$2b$10$3rdHYy6BODEpPFktYUgQqO4A63Ui12qWtfskz2eEX.Z7E.qjpqlTS', '2026-10-30 15:14:38.589024', '2026-11-13 12:29:50.000000', NULL, 1, 'ADMIN', 5, NULL, NULL, NULL, NULL, NULL, 0, '249739', '2026-11-06 17:34:06', NULL, NULL, 0, NULL, NULL, 'STUDENT', NULL),
(2, 'he', '$2b$10$O2RbYv8CdMBL8Dr8Lzg3TOAZwxFjnP.qkxdgu/MLr9..UM9gqdDPy', NULL, '2026-11-01 13:06:32.277679', '2026-11-13 12:13:56.986668', NULL, 1, 'READER', 5, NULL, NULL, 'Nguyễn Văn Minh', NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 'STUDENT', NULL),
(3, 'an108972@donga.edu.vn', '$2b$10$zGiNjzn3VwYTPZW5OpKIVO3756fZAQn2YR.niBFgROWQ6dYtP6mhO', NULL, '2026-11-01 19:33:47.447069', '2026-11-02 09:46:23.000000', 'an108972@donga.edu.vn', 1, 'READER', 5, '2026-11-01', NULL, 'Phan Thanh An', '0354352106', '2026-11-01 19:39:32', 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 'STUDENT', NULL),
(4, 'phanthanhanlop9.2@gmail.com', '$2b$10$3cEwVX8Lh.35gZx22rf2pul885ranTwGcW1XBwObRZU6.OVt2C5yW', NULL, '2026-11-01 19:34:42.624268', '2026-11-02 07:29:44.000000', 'phanthanhanlop9.2@gmail.com', 1, 'READER', 5, '2026-11-02', NULL, 'Phan Thanh An_IT24C', '0354352106', '2026-11-02 07:29:44', 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 'STUDENT', NULL),
(5, 'anpt@gmal.com', '$2b$10$F1XBF8S/VEOyBrS.c8X8gOIHPjfwXzCi1ywANt4yT1sw6zmKni8eO', NULL, '2026-11-01 19:36:30.984788', '2026-11-02 07:29:40.000000', 'anpt@gmal.com', 1, 'READER', 5, '2026-11-02', NULL, 'An Phan', '0986161322', '2026-11-02 07:29:40', 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 'STUDENT', NULL),
(6, 'anh@gmail.com', '$2b$10$bYeYFtDoLUBPsUDaBupeTuQia/INl7h74HpsdcqgDe0Izzd/e/r8a', NULL, '2026-11-02 07:26:13.858876', '2026-11-13 12:07:50.000000', 'anh@gmail.com', 1, 'READER', 5, '2026-11-02', '2027-01-01', 'Võ Văn Tuấn Anh', '0111222333', '2026-11-02 07:29:42', 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 'STUDENT', NULL),
(7, 'ty', '$2b$10$T0qfCzR9jFV7sIZmKHfGQ.na79TVPTRSxCc9FdXRYMWtq5lh9xEc2', NULL, '2026-11-02 09:47:14.377891', '2026-11-13 12:13:56.986668', 'ty@gmail.com', 1, 'READER', 5, '2026-11-02', NULL, 'Nguyễn Văn Minh', '0446746346', '2026-11-02 09:47:14', 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 'STUDENT', NULL),
(8, 'Phan Thanh An', '$2b$10$0K88tomRvn/obQv6nOzIDO0SsbDSBDkstlAmgiOV5AOZIMRXZUIfS', NULL, '2026-11-02 09:55:07.714758', '2026-11-02 09:55:07.714758', 'anpt@gmail.com', 1, 'INVENTORY_LIBRARIAN', 5, NULL, NULL, 'Phan Thanh An', '035435106', '2026-11-02 09:55:07', 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 'STUDENT', NULL),
(9, 'dang.nguyen.sv2024@donga.edu.vn', '$2b$10$1Qp4LFp..AmWWCy0QHCncOXGvsYG5XgrDlztOp3/fRhxAfRf2Yvie', NULL, '2026-11-13 08:11:25.081459', '2026-11-13 08:11:25.081459', 'dang.nguyen.sv2024@donga.edu.vn', 0, 'READER', 5, NULL, NULL, 'Đặng Hoàng Nguyên (IT24B)', '0912345678', NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 'STUDENT', NULL),
(10, 'anh109200@donga.edu.vn', '$2b$10$bEp1B62mgrO29h27B6TbZuhFyulIITn.NnEdJVlVA5H8xHfTJQW/C', NULL, '2026-11-13 12:06:23.438382', '2026-11-13 12:10:47.000000', 'anh109200@donga.edu.vn', 1, 'READER', 10, '2026-11-13', '2027-11-13', 'Võ Văn Tuấn Anh', '0234234234', '2026-11-13 12:09:00', 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 'RESEARCHER', NULL);

--
-- Chỉ mục cho các bảng đã đổ
--

--
-- Chỉ mục cho bảng `academic_seminars`
--
ALTER TABLE `academic_seminars`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `books`
--
ALTER TABLE `books`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK_a0f13454de3df36e337e01dbd55` (`categoryId`),
  ADD KEY `FK_594ad92cc478a33e51fd0e31bf3` (`publisherId`);

--
-- Chỉ mục cho bảng `book_copies`
--
ALTER TABLE `book_copies`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `IDX_1898a8d374e5b83af172664568` (`barcode`),
  ADD KEY `FK_447efeb15b6c881052abd7605ec` (`bookId`);

--
-- Chỉ mục cho bảng `book_donations`
--
ALTER TABLE `book_donations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `IDX_bd046ffaecb61b67fc0dbe7b94` (`receiptNumber`);

--
-- Chỉ mục cho bảng `borrow_records`
--
ALTER TABLE `borrow_records`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK_9d017dbb09f6e3cd8f15002e354` (`userId`),
  ADD KEY `FK_c52344b2e6920513d0bdeeca111` (`bookId`),
  ADD KEY `FK_ced60aedd31cec6d954b7dc2ecb` (`copyId`);

--
-- Chỉ mục cho bảng `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `IDX_8b0be371d28245da6e4f4b6187` (`name`),
  ADD KEY `FK_9a6f051e66982b5f0318981bcaa` (`parentId`);

--
-- Chỉ mục cho bảng `devices`
--
ALTER TABLE `devices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `IDX_8e5789338ecd743536cf10ca99` (`code`);

--
-- Chỉ mục cho bảng `device_loans`
--
ALTER TABLE `device_loans`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK_8534f27a5c1bd96883bb57a8e7b` (`deviceId`),
  ADD KEY `FK_ba717542955bfd06e2f701e68f4` (`userId`);

--
-- Chỉ mục cho bảng `device_maintenances`
--
ALTER TABLE `device_maintenances`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK_7192bb622abc4c7cc09e4ec7c94` (`deviceId`);

--
-- Chỉ mục cho bảng `exchange_grants`
--
ALTER TABLE `exchange_grants`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `favorite_books`
--
ALTER TABLE `favorite_books`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `IDX_200bdd8327a16e988ad99b88cc` (`userId`,`bookId`),
  ADD KEY `FK_0d658cb6e69bde38a9e71dbb4d2` (`bookId`);

--
-- Chỉ mục cho bảng `fine_adjustments`
--
ALTER TABLE `fine_adjustments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK_06d9b0e3fcad89417ecc5315e6b` (`borrowRecordId`),
  ADD KEY `FK_4baf986fb8872da7a80b6130a4d` (`violationId`);

--
-- Chỉ mục cho bảng `fine_payments`
--
ALTER TABLE `fine_payments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `IDX_53547ab637e9c3590c2b212327` (`txnRef`),
  ADD KEY `FK_4d82537f5fa2b67318e1a46c5b9` (`borrowRecordId`),
  ADD KEY `FK_c06d3a00071aefa45a8a862632b` (`violationId`);

--
-- Chỉ mục cho bảng `fine_violations`
--
ALTER TABLE `fine_violations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK_277f259bf24f992b2c0c742577a` (`userId`),
  ADD KEY `FK_afea16d957b0f32d40da0c61066` (`copyId`);

--
-- Chỉ mục cho bảng `iot_alerts`
--
ALTER TABLE `iot_alerts`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `iot_devices`
--
ALTER TABLE `iot_devices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `IDX_bd5a17501314adac29933360cc` (`deviceCode`);

--
-- Chỉ mục cho bảng `library_budgets`
--
ALTER TABLE `library_budgets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `IDX_f004dee63ba9ec2c3f057ad59e` (`year`);

--
-- Chỉ mục cho bảng `library_events`
--
ALTER TABLE `library_events`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `library_partners`
--
ALTER TABLE `library_partners`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `library_settings`
--
ALTER TABLE `library_settings`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `library_tutorials`
--
ALTER TABLE `library_tutorials`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `lockers`
--
ALTER TABLE `lockers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `IDX_c8299f1859e56d038d4b395c69` (`lockerNumber`),
  ADD KEY `FK_02641fca4a830018f0acc943614` (`currentUserId`);

--
-- Chỉ mục cho bảng `locker_assignments`
--
ALTER TABLE `locker_assignments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK_ffb8ce792ccc0bd2bbcc42c11bb` (`lockerId`),
  ADD KEY `FK_2833fa41edb4a83f2fd7ad08f34` (`userId`);

--
-- Chỉ mục cho bảng `multimedia_items`
--
ALTER TABLE `multimedia_items`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `IDX_d882c4e0d8e56841b9ec8bce70` (`code`);

--
-- Chỉ mục cho bảng `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `IDX_230cf2fe656ae091e65cadec2b` (`userId`,`reservationId`,`type`),
  ADD UNIQUE KEY `IDX_5fadff2b5961520c71f03f600f` (`userId`,`borrowRecordId`,`type`),
  ADD KEY `FK_aaf0a5ef499e93fbdf8e831693c` (`borrowRecordId`),
  ADD KEY `FK_a284c88c5ed1e51681489b42bc0` (`reservationId`);

--
-- Chỉ mục cho bảng `notification_templates`
--
ALTER TABLE `notification_templates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `IDX_0f527489aa40b6ba96faf6b502` (`code`);

--
-- Chỉ mục cho bảng `publishers`
--
ALTER TABLE `publishers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `IDX_39082806f986a63cd7dcf1782a` (`name`);

--
-- Chỉ mục cho bảng `purchase_orders`
--
ALTER TABLE `purchase_orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `IDX_d8bab34a3d273655a2f97144db` (`orderCode`);

--
-- Chỉ mục cho bảng `purchase_order_items`
--
ALTER TABLE `purchase_order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK_54f091ac178a327155e9424a705` (`orderId`);

--
-- Chỉ mục cho bảng `purchase_requests`
--
ALTER TABLE `purchase_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK_2127e81086c2c99569f9272af51` (`userId`);

--
-- Chỉ mục cho bảng `purchase_request_votes`
--
ALTER TABLE `purchase_request_votes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `IDX_3dec5364e16901ed78237f0ff8` (`requestId`,`userId`),
  ADD KEY `FK_572707eb54810f41fba125e54c6` (`userId`);

--
-- Chỉ mục cho bảng `reader_feedback`
--
ALTER TABLE `reader_feedback`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK_6ecaf954ed12be97b8b2252d740` (`userId`);

--
-- Chỉ mục cho bảng `reservations`
--
ALTER TABLE `reservations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK_aa0e1cc2c4f54da32bf8282154c` (`userId`),
  ADD KEY `FK_5c5d6eea605e56c07709da87f18` (`bookId`),
  ADD KEY `FK_6100098d32c3c7df0bd8d11d23b` (`copyId`);

--
-- Chỉ mục cho bảng `reviews`
--
ALTER TABLE `reviews`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `IDX_38c643cf9c0ea57b5fbcba2298` (`userId`,`bookId`),
  ADD KEY `FK_cab4e55252a9c18a27e81415299` (`bookId`);

--
-- Chỉ mục cho bảng `room_bookings`
--
ALTER TABLE `room_bookings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK_e0937afcf037d7b392ff22c42c9` (`roomId`),
  ADD KEY `FK_6394937fbf6186ee034c9e8bea5` (`userId`);

--
-- Chỉ mục cho bảng `room_violations`
--
ALTER TABLE `room_violations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK_79fcda463dda7525c1cbfad6a9a` (`userId`);

--
-- Chỉ mục cho bảng `shift_schedules`
--
ALTER TABLE `shift_schedules`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `staff_kpis`
--
ALTER TABLE `staff_kpis`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `study_rooms`
--
ALTER TABLE `study_rooms`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `IDX_fbf8ff231c9bb83528ae48f5b1` (`code`);

--
-- Chỉ mục cho bảng `theses`
--
ALTER TABLE `theses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `IDX_62ded305ef300a705a2c81d453` (`code`);

--
-- Chỉ mục cho bảng `tutorial_registrations`
--
ALTER TABLE `tutorial_registrations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK_689b63ace389a1fa6ddaac5988f` (`tutorialId`),
  ADD KEY `FK_f5a9698f8a958210f3f35381cf1` (`userId`);

--
-- Chỉ mục cho bảng `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `IDX_fe0bb3f6520ee0469504521e71` (`username`),
  ADD UNIQUE KEY `IDX_97672ac88f789774dd47f7c8be` (`email`);

--
-- AUTO_INCREMENT cho các bảng đã đổ
--

--
-- AUTO_INCREMENT cho bảng `academic_seminars`
--
ALTER TABLE `academic_seminars`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT cho bảng `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT cho bảng `books`
--
ALTER TABLE `books`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT cho bảng `book_copies`
--
ALTER TABLE `book_copies`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=154;

--
-- AUTO_INCREMENT cho bảng `book_donations`
--
ALTER TABLE `book_donations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT cho bảng `borrow_records`
--
ALTER TABLE `borrow_records`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT cho bảng `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT cho bảng `devices`
--
ALTER TABLE `devices`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `device_loans`
--
ALTER TABLE `device_loans`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `device_maintenances`
--
ALTER TABLE `device_maintenances`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `exchange_grants`
--
ALTER TABLE `exchange_grants`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT cho bảng `favorite_books`
--
ALTER TABLE `favorite_books`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `fine_adjustments`
--
ALTER TABLE `fine_adjustments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `fine_payments`
--
ALTER TABLE `fine_payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `fine_violations`
--
ALTER TABLE `fine_violations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `iot_alerts`
--
ALTER TABLE `iot_alerts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT cho bảng `iot_devices`
--
ALTER TABLE `iot_devices`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT cho bảng `library_budgets`
--
ALTER TABLE `library_budgets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT cho bảng `library_events`
--
ALTER TABLE `library_events`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT cho bảng `library_partners`
--
ALTER TABLE `library_partners`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT cho bảng `library_tutorials`
--
ALTER TABLE `library_tutorials`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT cho bảng `lockers`
--
ALTER TABLE `lockers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `locker_assignments`
--
ALTER TABLE `locker_assignments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `multimedia_items`
--
ALTER TABLE `multimedia_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT cho bảng `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT cho bảng `notification_templates`
--
ALTER TABLE `notification_templates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT cho bảng `publishers`
--
ALTER TABLE `publishers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT cho bảng `purchase_orders`
--
ALTER TABLE `purchase_orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT cho bảng `purchase_order_items`
--
ALTER TABLE `purchase_order_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `purchase_requests`
--
ALTER TABLE `purchase_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `purchase_request_votes`
--
ALTER TABLE `purchase_request_votes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `reader_feedback`
--
ALTER TABLE `reader_feedback`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT cho bảng `reservations`
--
ALTER TABLE `reservations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `reviews`
--
ALTER TABLE `reviews`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT cho bảng `room_bookings`
--
ALTER TABLE `room_bookings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `room_violations`
--
ALTER TABLE `room_violations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `shift_schedules`
--
ALTER TABLE `shift_schedules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT cho bảng `staff_kpis`
--
ALTER TABLE `staff_kpis`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT cho bảng `study_rooms`
--
ALTER TABLE `study_rooms`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `theses`
--
ALTER TABLE `theses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT cho bảng `tutorial_registrations`
--
ALTER TABLE `tutorial_registrations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- Các ràng buộc cho các bảng đã đổ
--

--
-- Các ràng buộc cho bảng `books`
--
ALTER TABLE `books`
  ADD CONSTRAINT `FK_594ad92cc478a33e51fd0e31bf3` FOREIGN KEY (`publisherId`) REFERENCES `publishers` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION,
  ADD CONSTRAINT `FK_a0f13454de3df36e337e01dbd55` FOREIGN KEY (`categoryId`) REFERENCES `categories` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

--
-- Các ràng buộc cho bảng `book_copies`
--
ALTER TABLE `book_copies`
  ADD CONSTRAINT `FK_447efeb15b6c881052abd7605ec` FOREIGN KEY (`bookId`) REFERENCES `books` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

--
-- Các ràng buộc cho bảng `borrow_records`
--
ALTER TABLE `borrow_records`
  ADD CONSTRAINT `FK_9d017dbb09f6e3cd8f15002e354` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  ADD CONSTRAINT `FK_c52344b2e6920513d0bdeeca111` FOREIGN KEY (`bookId`) REFERENCES `books` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  ADD CONSTRAINT `FK_ced60aedd31cec6d954b7dc2ecb` FOREIGN KEY (`copyId`) REFERENCES `book_copies` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

--
-- Các ràng buộc cho bảng `categories`
--
ALTER TABLE `categories`
  ADD CONSTRAINT `FK_9a6f051e66982b5f0318981bcaa` FOREIGN KEY (`parentId`) REFERENCES `categories` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

--
-- Các ràng buộc cho bảng `device_loans`
--
ALTER TABLE `device_loans`
  ADD CONSTRAINT `FK_8534f27a5c1bd96883bb57a8e7b` FOREIGN KEY (`deviceId`) REFERENCES `devices` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  ADD CONSTRAINT `FK_ba717542955bfd06e2f701e68f4` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

--
-- Các ràng buộc cho bảng `device_maintenances`
--
ALTER TABLE `device_maintenances`
  ADD CONSTRAINT `FK_7192bb622abc4c7cc09e4ec7c94` FOREIGN KEY (`deviceId`) REFERENCES `devices` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

--
-- Các ràng buộc cho bảng `favorite_books`
--
ALTER TABLE `favorite_books`
  ADD CONSTRAINT `FK_0d658cb6e69bde38a9e71dbb4d2` FOREIGN KEY (`bookId`) REFERENCES `books` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  ADD CONSTRAINT `FK_a7447237ded0bbb85db7edf014a` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

--
-- Các ràng buộc cho bảng `fine_adjustments`
--
ALTER TABLE `fine_adjustments`
  ADD CONSTRAINT `FK_06d9b0e3fcad89417ecc5315e6b` FOREIGN KEY (`borrowRecordId`) REFERENCES `borrow_records` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  ADD CONSTRAINT `FK_4baf986fb8872da7a80b6130a4d` FOREIGN KEY (`violationId`) REFERENCES `fine_violations` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

--
-- Các ràng buộc cho bảng `fine_payments`
--
ALTER TABLE `fine_payments`
  ADD CONSTRAINT `FK_4d82537f5fa2b67318e1a46c5b9` FOREIGN KEY (`borrowRecordId`) REFERENCES `borrow_records` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  ADD CONSTRAINT `FK_c06d3a00071aefa45a8a862632b` FOREIGN KEY (`violationId`) REFERENCES `fine_violations` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

--
-- Các ràng buộc cho bảng `fine_violations`
--
ALTER TABLE `fine_violations`
  ADD CONSTRAINT `FK_277f259bf24f992b2c0c742577a` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  ADD CONSTRAINT `FK_afea16d957b0f32d40da0c61066` FOREIGN KEY (`copyId`) REFERENCES `book_copies` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

--
-- Các ràng buộc cho bảng `lockers`
--
ALTER TABLE `lockers`
  ADD CONSTRAINT `FK_02641fca4a830018f0acc943614` FOREIGN KEY (`currentUserId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

--
-- Các ràng buộc cho bảng `locker_assignments`
--
ALTER TABLE `locker_assignments`
  ADD CONSTRAINT `FK_2833fa41edb4a83f2fd7ad08f34` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  ADD CONSTRAINT `FK_ffb8ce792ccc0bd2bbcc42c11bb` FOREIGN KEY (`lockerId`) REFERENCES `lockers` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

--
-- Các ràng buộc cho bảng `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `FK_692a909ee0fa9383e7859f9b406` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  ADD CONSTRAINT `FK_a284c88c5ed1e51681489b42bc0` FOREIGN KEY (`reservationId`) REFERENCES `reservations` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  ADD CONSTRAINT `FK_aaf0a5ef499e93fbdf8e831693c` FOREIGN KEY (`borrowRecordId`) REFERENCES `borrow_records` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

--
-- Các ràng buộc cho bảng `purchase_order_items`
--
ALTER TABLE `purchase_order_items`
  ADD CONSTRAINT `FK_54f091ac178a327155e9424a705` FOREIGN KEY (`orderId`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

--
-- Các ràng buộc cho bảng `purchase_requests`
--
ALTER TABLE `purchase_requests`
  ADD CONSTRAINT `FK_2127e81086c2c99569f9272af51` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

--
-- Các ràng buộc cho bảng `purchase_request_votes`
--
ALTER TABLE `purchase_request_votes`
  ADD CONSTRAINT `FK_572707eb54810f41fba125e54c6` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  ADD CONSTRAINT `FK_b3839524d5c415c8efde6f47a3f` FOREIGN KEY (`requestId`) REFERENCES `purchase_requests` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

--
-- Các ràng buộc cho bảng `reader_feedback`
--
ALTER TABLE `reader_feedback`
  ADD CONSTRAINT `FK_6ecaf954ed12be97b8b2252d740` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

--
-- Các ràng buộc cho bảng `reservations`
--
ALTER TABLE `reservations`
  ADD CONSTRAINT `FK_5c5d6eea605e56c07709da87f18` FOREIGN KEY (`bookId`) REFERENCES `books` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  ADD CONSTRAINT `FK_6100098d32c3c7df0bd8d11d23b` FOREIGN KEY (`copyId`) REFERENCES `book_copies` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION,
  ADD CONSTRAINT `FK_aa0e1cc2c4f54da32bf8282154c` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

--
-- Các ràng buộc cho bảng `reviews`
--
ALTER TABLE `reviews`
  ADD CONSTRAINT `FK_7ed5659e7139fc8bc039198cc1f` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  ADD CONSTRAINT `FK_cab4e55252a9c18a27e81415299` FOREIGN KEY (`bookId`) REFERENCES `books` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

--
-- Các ràng buộc cho bảng `room_bookings`
--
ALTER TABLE `room_bookings`
  ADD CONSTRAINT `FK_6394937fbf6186ee034c9e8bea5` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  ADD CONSTRAINT `FK_e0937afcf037d7b392ff22c42c9` FOREIGN KEY (`roomId`) REFERENCES `study_rooms` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

--
-- Các ràng buộc cho bảng `room_violations`
--
ALTER TABLE `room_violations`
  ADD CONSTRAINT `FK_79fcda463dda7525c1cbfad6a9a` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

--
-- Các ràng buộc cho bảng `tutorial_registrations`
--
ALTER TABLE `tutorial_registrations`
  ADD CONSTRAINT `FK_689b63ace389a1fa6ddaac5988f` FOREIGN KEY (`tutorialId`) REFERENCES `library_tutorials` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  ADD CONSTRAINT `FK_f5a9698f8a958210f3f35381cf1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
