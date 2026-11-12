-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Máy chủ: 127.0.0.1
-- Thời gian đã tạo: Th10 12, 2026 lúc 01:07 AM
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
(3, 'STOCK_CHECK', 'INVENTORY', 'Thực hiện kiểm kê đối soát tự động toàn bộ kho sách.', NULL, 'admin', 'ADMIN', '127.0.0.1', '2026-11-05 10:43:57.814000', 'INFO');

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
  `pdfPermission` enum('PUBLIC','READER_ONLY','NO_DOWNLOAD') NOT NULL DEFAULT 'PUBLIC'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `books`
--

INSERT INTO `books` (`id`, `title`, `author`, `isbn`, `totalCopies`, `availableCopies`, `shelf`, `floor`, `aisle`, `categoryId`, `deletedAt`, `publisherId`, `description`, `coverImageUrl`, `publicationYear`, `pdfUrl`, `price`, `createdAt`, `updatedAt`, `digitalViews`, `digitalDownloads`, `pdfPermission`) VALUES
(1, 'Harry Potter và Hòn Đá Phù Thủy', 'J.K. Rowling', '978-0747532699', 5, 5, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 80000.00, '2026-11-06 18:47:00.111756', '2026-11-06 18:47:00.124986', 0, 0, 'PUBLIC'),
(2, 'Đắc Nhân Tâm', 'Dale Carnegie', '978-0671027032', 10, 8, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 80000.00, '2026-11-06 18:47:00.111756', '2026-11-06 18:47:00.124986', 0, 0, 'PUBLIC'),
(3, 'Nhà Giả Kim', 'Paulo Coelho', '978-0062315007', 3, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 80000.00, '2026-11-06 18:47:00.111756', '2026-11-06 18:47:00.124986', 0, 0, 'PUBLIC'),
(4, 'Thiện tâm', 'Nguyễn Thiện Tâm', '123456', 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 80000.00, '2026-11-06 18:47:00.111756', '2026-11-06 18:47:00.124986', 0, 0, 'PUBLIC'),
(5, 'd', 'a', '12', 12, 9, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 80000.00, '2026-11-06 18:47:00.111756', '2026-11-06 18:47:00.124986', 0, 0, 'PUBLIC'),
(6, 'w', 'q', '1', 2, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 80000.00, '2026-11-06 18:47:00.111756', '2026-11-06 18:47:00.124986', 0, 0, 'PUBLIC'),
(7, 'phù thủy thần tiên', 'Trần Văn An', '1', 1, 1, '2', '3', 'B', NULL, NULL, 1, '', '', 2002, NULL, 80000.00, '2026-11-06 18:47:00.111756', '2026-11-06 18:47:00.124986', 0, 0, 'PUBLIC'),
(8, 'Hà nội phố', 'Nguyễn Vĩnh Quang', '1', 1, 1, 'A2', '3', 'B', 1, NULL, 1, 'Rất cảm động', 'https://lh3.googleusercontent.com/grass-cs/AABkmLdc1LuRFsO92ZSTySkJgFDuZEgwA03pmQzmQMr1uEQ4kuNGBA-H0t6GkiQI5_QfJug8ZJaRA6Yl42ghlkTdCwmDfZKHsG271MEZP4v7cypoV4mumEYIOvucAzuCWCBdGO4D0u0tuT7bWKtp=w289-h312-n-k-no', 1966, NULL, 80000.00, '2026-11-06 18:47:00.111756', '2026-11-06 18:47:00.124986', 0, 0, 'PUBLIC');

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
(1, 'LEGACY-5-1', 'RESERVED', 5, NULL, NULL, NULL, NULL, '2026-11-06 18:46:44.902730', '2026-11-06 18:46:44.908349'),
(2, 'LEGACY-5-2', 'BORROWED', 5, NULL, NULL, NULL, NULL, '2026-11-06 18:46:44.902730', '2026-11-06 18:46:44.908349'),
(3, 'LEGACY-5-3', 'RESERVED', 5, NULL, NULL, NULL, NULL, '2026-11-06 18:46:44.902730', '2026-11-06 18:46:44.908349'),
(4, 'LEGACY-5-4', 'AVAILABLE', 5, NULL, NULL, NULL, NULL, '2026-11-06 18:46:44.902730', '2026-11-06 18:46:44.908349'),
(5, 'LEGACY-5-5', 'AVAILABLE', 5, NULL, NULL, NULL, NULL, '2026-11-06 18:46:44.902730', '2026-11-06 18:46:44.908349'),
(6, 'LEGACY-5-6', 'AVAILABLE', 5, NULL, NULL, NULL, NULL, '2026-11-06 18:46:44.902730', '2026-11-06 18:46:44.908349'),
(7, 'LEGACY-5-7', 'AVAILABLE', 5, NULL, NULL, NULL, NULL, '2026-11-06 18:46:44.902730', '2026-11-06 18:46:44.908349'),
(8, 'LEGACY-5-8', 'AVAILABLE', 5, NULL, NULL, NULL, NULL, '2026-11-06 18:46:44.902730', '2026-11-06 18:46:44.908349'),
(9, 'LEGACY-5-9', 'AVAILABLE', 5, NULL, NULL, NULL, NULL, '2026-11-06 18:46:44.902730', '2026-11-06 18:46:44.908349'),
(10, 'LEGACY-5-10', 'AVAILABLE', 5, NULL, NULL, NULL, NULL, '2026-11-06 18:46:44.902730', '2026-11-06 18:46:44.908349'),
(11, 'LEGACY-5-11', 'AVAILABLE', 5, NULL, NULL, NULL, NULL, '2026-11-06 18:46:44.902730', '2026-11-06 18:46:44.908349'),
(12, 'LEGACY-5-12', 'AVAILABLE', 5, NULL, NULL, NULL, NULL, '2026-11-06 18:46:44.902730', '2026-11-06 18:46:44.908349'),
(13, 'COPY-de0d39a6-b1b5-44a4-95d2-4976639e734f', 'AVAILABLE', 7, NULL, NULL, NULL, NULL, '2026-11-06 18:46:44.902730', '2026-11-06 18:46:44.908349'),
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
(33, 'COPY-526425bd-c423-44a4-b0c0-d538c364ee26', 'AVAILABLE', 4, NULL, NULL, NULL, NULL, '2026-11-06 18:46:44.902730', '2026-11-06 18:46:44.908349'),
(34, 'COPY-1b007269-883f-477a-97fa-1e13c02520e1', 'AVAILABLE', 6, NULL, NULL, NULL, NULL, '2026-11-06 18:46:44.902730', '2026-11-06 18:46:44.908349'),
(35, 'COPY-63818530-4d7e-4f53-8e0d-ea7e22905809', 'AVAILABLE', 6, NULL, NULL, NULL, NULL, '2026-11-06 18:46:44.902730', '2026-11-06 18:46:44.908349');

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
(1, '2026-11-01 09:12:10.437015', NULL, NULL, 0.00, 'NONE', 1, 5, NULL, 0, NULL, 1, 'PENDING', '2026-11-06 18:46:34.283799', '2026-11-06 18:46:34.293826'),
(2, '2026-11-01 10:42:22.242176', '2026-11-29 11:50:10', NULL, 0.00, 'NONE', 1, 5, '2026-11-01 11:50:10', 1, NULL, 2, 'BORROWED', '2026-11-06 18:46:34.283799', '2026-11-06 18:46:34.293826'),
(3, '2026-11-02 09:45:42.309211', NULL, NULL, 0.00, 'NONE', 3, 5, NULL, 0, NULL, 3, 'PENDING', '2026-11-06 18:46:34.283799', '2026-11-06 18:46:34.293826'),
(4, '2026-11-02 09:46:09.347972', '2026-11-16 09:51:11', NULL, 0.00, 'NONE', 3, 3, '2026-11-02 09:51:11', 0, NULL, 24, 'BORROWED', '2026-11-06 18:46:34.283799', '2026-11-06 18:46:34.293826');

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
(1, 'hài', NULL, NULL, NULL, '2026-11-06 18:47:24.576733', '2026-11-06 18:47:24.585491'),
(2, 'buồn', NULL, NULL, NULL, '2026-11-06 18:47:24.576733', '2026-11-06 18:47:24.585491');

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
(1, 2026, 200000000.00, 50000000.00, 50000000.00, 50000000.00, 50000000.00, 'Ngân sách thu mua năm 2026', '2026-11-06 16:14:16.343818', '2026-11-06 16:14:16.343818');

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
  `readerGroupQuotas` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`readerGroupQuotas`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `library_settings`
--

INSERT INTO `library_settings` (`id`, `maxActiveLoans`, `borrowDays`, `dailyFineRate`, `updatedAt`, `renewalDays`, `fineLockThreshold`, `autoLockOverdueDays`, `enableAutoLockOverdue`, `enableAutoEmailReminders`, `reminderDaysBeforeDue`, `vietqrBankId`, `vietqrAccountNo`, `vietqrAccountName`, `vnpayTmnCode`, `vnpayHashSecret`, `vnpayUrl`, `momoPartnerCode`, `momoAccessKey`, `momoSecretKey`, `cardRegistrationFee`, `cardReissueFee`, `autoBackupSchedule`, `lastBackupAt`, `backupRetentionDays`, `createdAt`, `smtpHost`, `smtpPort`, `smtpSecure`, `smtpUser`, `smtpPassword`, `smtpFrom`, `readerGroupQuotas`) VALUES
(1, 5, 14, 5000, '2026-11-01 13:15:08.735092', 14, 50000, 30, 1, 1, 2, 'MBBank', '0388888888', 'THU VIEN DAI HOC', '', '', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html', '', '', '', 20000, 50000, 'DAILY', NULL, 30, '2026-11-06 19:28:22.050969', 'smtp.gmail.com', 587, 0, '', '', 'thuvien@daihoc.edu.vn', NULL);

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
(2, 'Đại Đông', 'phak@gmail.com', '0744833222', '1528 Nhân Sự', NULL, NULL, NULL, 5, 'ON_TIME', 0.00, NULL, NULL, '2026-11-06 18:47:34.621776', '2026-11-06 18:47:34.626104');

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

--
-- Đang đổ dữ liệu cho bảng `reviews`
--

INSERT INTO `reviews` (`id`, `rating`, `comment`, `createdAt`, `updatedAt`, `userId`, `bookId`, `isVisible`) VALUES
(1, 1, NULL, '2026-11-01 10:42:29.547197', '2026-11-01 19:37:53.000000', 1, 5, 1),
(2, 1, NULL, '2026-11-02 09:45:50.010676', '2026-11-02 09:45:50.010676', 3, 5, 1);

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
(1, 'admin', '$2b$10$1Qp4LFp..AmWWCy0QHCncOXGvsYG5XgrDlztOp3/fRhxAfRf2Yvie', '$2b$10$vwxz7pXWZ/cyZxE/hpR7P.PiOmAr0uIEhp2cN4p3xErBxt8wmPY3u', '2026-10-30 15:14:38.589024', '2026-11-11 11:51:19.000000', NULL, 1, 'ADMIN', 5, NULL, NULL, NULL, NULL, NULL, 0, '249739', '2026-11-06 17:34:06', NULL, NULL, 0, NULL, NULL, 'STUDENT', NULL),
(2, 'he', '$2b$10$O2RbYv8CdMBL8Dr8Lzg3TOAZwxFjnP.qkxdgu/MLr9..UM9gqdDPy', NULL, '2026-11-01 13:06:32.277679', '2026-11-01 13:06:45.000000', NULL, 1, 'READER', 5, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 'STUDENT', NULL),
(3, 'an108972@donga.edu.vn', '$2b$10$zGiNjzn3VwYTPZW5OpKIVO3756fZAQn2YR.niBFgROWQ6dYtP6mhO', NULL, '2026-11-01 19:33:47.447069', '2026-11-02 09:46:23.000000', 'an108972@donga.edu.vn', 1, 'READER', 5, '2026-11-01', NULL, 'Phan Thanh An', '0354352106', '2026-11-01 19:39:32', 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 'STUDENT', NULL),
(4, 'phanthanhanlop9.2@gmail.com', '$2b$10$3cEwVX8Lh.35gZx22rf2pul885ranTwGcW1XBwObRZU6.OVt2C5yW', NULL, '2026-11-01 19:34:42.624268', '2026-11-02 07:29:44.000000', 'phanthanhanlop9.2@gmail.com', 1, 'READER', 5, '2026-11-02', NULL, 'Phan Thanh An_IT24C', '0354352106', '2026-11-02 07:29:44', 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 'STUDENT', NULL),
(5, 'anpt@gmal.com', '$2b$10$F1XBF8S/VEOyBrS.c8X8gOIHPjfwXzCi1ywANt4yT1sw6zmKni8eO', NULL, '2026-11-01 19:36:30.984788', '2026-11-02 07:29:40.000000', 'anpt@gmal.com', 1, 'READER', 5, '2026-11-02', NULL, 'An Phan', '0986161322', '2026-11-02 07:29:40', 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 'STUDENT', NULL),
(6, 'anh@gmail.com', '$2b$10$bYeYFtDoLUBPsUDaBupeTuQia/INl7h74HpsdcqgDe0Izzd/e/r8a', NULL, '2026-11-02 07:26:13.858876', '2026-11-02 07:29:42.000000', 'anh@gmail.com', 1, 'READER', 5, '2026-11-02', NULL, 'Võ Văn Tuấn Anh', '0111222333', '2026-11-02 07:29:42', 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 'STUDENT', NULL),
(7, 'ty', '$2b$10$T0qfCzR9jFV7sIZmKHfGQ.na79TVPTRSxCc9FdXRYMWtq5lh9xEc2', NULL, '2026-11-02 09:47:14.377891', '2026-11-02 09:47:14.377891', 'ty@gmail.com', 1, 'READER', 5, '2026-11-02', NULL, 'He', '0446746346', '2026-11-02 09:47:14', 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 'STUDENT', NULL),
(8, 'Phan Thanh An', '$2b$10$0K88tomRvn/obQv6nOzIDO0SsbDSBDkstlAmgiOV5AOZIMRXZUIfS', NULL, '2026-11-02 09:55:07.714758', '2026-11-02 09:55:07.714758', 'anpt@gmail.com', 1, 'INVENTORY_LIBRARIAN', 5, NULL, NULL, 'Phan Thanh An', '035435106', '2026-11-02 09:55:07', 0, NULL, NULL, NULL, NULL, 0, NULL, NULL, 'STUDENT', NULL);

--
-- Chỉ mục cho các bảng đã đổ
--

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
-- Chỉ mục cho bảng `library_budgets`
--
ALTER TABLE `library_budgets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `IDX_f004dee63ba9ec2c3f057ad59e` (`year`);

--
-- Chỉ mục cho bảng `library_settings`
--
ALTER TABLE `library_settings`
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
-- Chỉ mục cho bảng `study_rooms`
--
ALTER TABLE `study_rooms`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `IDX_fbf8ff231c9bb83528ae48f5b1` (`code`);

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
-- AUTO_INCREMENT cho bảng `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT cho bảng `books`
--
ALTER TABLE `books`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT cho bảng `book_copies`
--
ALTER TABLE `book_copies`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT cho bảng `borrow_records`
--
ALTER TABLE `borrow_records`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT cho bảng `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

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
-- AUTO_INCREMENT cho bảng `library_budgets`
--
ALTER TABLE `library_budgets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

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
-- AUTO_INCREMENT cho bảng `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `notification_templates`
--
ALTER TABLE `notification_templates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `publishers`
--
ALTER TABLE `publishers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

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
-- AUTO_INCREMENT cho bảng `study_rooms`
--
ALTER TABLE `study_rooms`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

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
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
