const mysql = require('mysql2/promise');

async function seed() {
  const config = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'library_db',
  };

  const conn = await mysql.createConnection(config);
  console.log('Connected to MySQL...');

  const [existing] = await conn.query('SELECT COUNT(*) as cnt FROM purchase_orders');
  if (existing[0].cnt > 0) {
    console.log('Purchase orders already exist:', existing[0].cnt);
    await conn.end();
    return;
  }

  const sampleOrders = [
    {
      orderCode: 'PO-2026-001',
      supplierName: 'Nhà xuất bản Giáo Dục Việt Nam',
      supplierPhone: '02438220801',
      supplierEmail: 'kinhdoanh@nxbgd.vn',
      totalAmount: 42500000,
      status: 'COMPLETED',
      createdByName: 'Nguyễn Văn Quản (Thủ thư trưởng)',
      note: 'Nhập giáo trình Giải tích, Đại số tuyến tính và Vật lý đại cương cho sinh viên năm nhất',
      createdAt: '2026-02-15 09:30:00',
    },
    {
      orderCode: 'PO-2026-002',
      supplierName: 'Công ty Cổ phần Phát hành Sách FAHASA',
      supplierPhone: '1900636467',
      supplierEmail: 'order@fahasa.com.vn',
      totalAmount: 18000000,
      status: 'COMPLETED',
      createdByName: 'Trần Thị Thu (Thủ thư kho)',
      note: 'Nhập bổ sung sách luyện thi IELTS Academic và TOEIC 800+ chuẩn quốc tế',
      createdAt: '2026-03-22 14:15:00',
    },
    {
      orderCode: 'PO-2026-003',
      supplierName: 'Nhà xuất bản Thông tin và Truyền thông',
      supplierPhone: '02435772143',
      supplierEmail: 'nxb.tttt@mic.gov.vn',
      totalAmount: 48200000,
      status: 'COMPLETED',
      createdByName: 'Nguyễn Văn Quản (Thủ thư trưởng)',
      note: 'Nhập tài liệu chuyên ngành An toàn thông tin, Điện toán đám mây & AI Thực chiến',
      createdAt: '2026-04-18 10:00:00',
    },
    {
      orderCode: 'PO-2026-004',
      supplierName: 'Nhà xuất bản Trẻ',
      supplierPhone: '02839316289',
      supplierEmail: 'hopthubandoc@nxbtre.com.vn',
      totalAmount: 22000000,
      status: 'COMPLETED',
      createdByName: 'Lê Văn Thư (Thủ thư nghiệp vụ)',
      note: 'Nhập sách Khởi nghiệp đổi mới sáng tạo, Quản trị doanh nghiệp và Kỹ năng lãnh đạo',
      createdAt: '2026-06-05 11:45:00',
    },
    {
      orderCode: 'PO-2026-005',
      supplierName: 'Công ty Cổ phần Văn hóa & Truyền thông Nhã Nam',
      supplierPhone: '02435146875',
      supplierEmail: 'contact@nhanam.vn',
      totalAmount: 34800000,
      status: 'COMPLETED',
      createdByName: 'Trần Thị Thu (Thủ thư kho)',
      note: 'Bổ sung danh mục tiểu thuyết kinh điển, lịch sử văn minh thế giới và tâm lý học hành vi',
      createdAt: '2026-08-20 15:30:00',
    },
    {
      orderCode: 'PO-2026-006',
      supplierName: 'Nhà xuất bản Khoa học & Kỹ thuật',
      supplierPhone: '02438253168',
      supplierEmail: 'nxbkhkt@hn.vnn.vn',
      totalAmount: 28500000,
      status: 'ORDERED',
      createdByName: 'Nguyễn Văn Quản (Thủ thư trưởng)',
      note: 'Đơn đặt hàng thiết kế vi mạch bán dẫn VLSI và Trí tuệ nhân tạo nâng cao cho kỳ mới',
      createdAt: '2026-09-12 16:20:00',
    },
  ];

  for (const po of sampleOrders) {
    await conn.query(
      `INSERT INTO purchase_orders (orderCode, supplierName, supplierPhone, supplierEmail, totalAmount, status, createdByName, note, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        po.orderCode,
        po.supplierName,
        po.supplierPhone,
        po.supplierEmail,
        po.totalAmount,
        po.status,
        po.createdByName,
        po.note,
        po.createdAt,
        po.createdAt,
      ]
    );
  }

  console.log('Successfully seeded 6 realistic purchase orders!');
  await conn.end();
}

seed().catch(console.error);

