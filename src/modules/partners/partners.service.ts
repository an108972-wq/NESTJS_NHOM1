import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import {
  BookDonation,
  DonationType,
  LibraryPartner,
  PartnerType,
} from './entities/partner.entity';
import {
  CreateDonationDto,
  CreatePartnerDto,
  UpdatePartnerDto,
} from './dto/partner.dto';

@Injectable()
export class PartnersService implements OnModuleInit {
  constructor(
    @InjectRepository(LibraryPartner)
    private readonly partnerRepo: Repository<LibraryPartner>,
    @InjectRepository(BookDonation)
    private readonly donationRepo: Repository<BookDonation>,
  ) {}

  async onModuleInit() {
    await this.seedPartnersIfEmpty();
  }

  private async seedPartnersIfEmpty() {
    const count = await this.partnerRepo.count();
    if (count > 0) return;

    const partners = [
      this.partnerRepo.create({
        name: 'Hội Cựu Sinh Viên Khóa 2015-2019',
        type: PartnerType.INDIVIDUAL_ALUMNI,
        contactPerson: 'ThS. Trần Quang Minh (Đại diện Ban liên lạc)',
        email: 'alumni.k15@university.edu.vn',
        phone: '0912345678',
        address: 'Hà Nội, Việt Nam',
        totalDonatedBooks: 350,
        totalDonatedCash: 50000000,
        status: 'ACTIVE',
        note: 'Tài trợ đợt kỷ niệm 10 năm ra trường nhằm xây dựng Tủ sách Khởi nghiệp & Kỹ năng mềm.',
      }),
      this.partnerRepo.create({
        name: 'Nhà Xuất Bản Khoa Học & Kỹ Thuật',
        type: PartnerType.PUBLISHER,
        contactPerson: 'Bà Nguyễn Thị Lan (Phó Giám đốc Đối ngoại)',
        email: 'contact@nxbkhkt.vn',
        phone: '02438221234',
        address: '70 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội',
        totalDonatedBooks: 520,
        totalDonatedCash: 0,
        status: 'ACTIVE',
        note: 'Đối tác chiến lược tài trợ sách giáo trình, sách chuyên khảo Kỹ thuật - Công nghệ hàng năm.',
      }),
      this.partnerRepo.create({
        name: 'Quỹ Giáo Dục & Phát Triển Văn Hóa Đọc Việt Nam',
        type: PartnerType.ORGANIZATION,
        contactPerson: 'TS. Phạm Thanh Tùng (Chủ tịch Quỹ)',
        email: 'support@readvietnam.org',
        phone: '0988776655',
        address: 'Số 15 Lê Duẩn, Quận 1, TP. Hồ Chí Minh',
        totalDonatedBooks: 800,
        totalDonatedCash: 120000000,
        status: 'ACTIVE',
        note: 'Tài trợ thiết bị đọc sách điện tử E-Reader và bản quyền giáo trình số Quốc tế.',
      }),
      this.partnerRepo.create({
        name: 'Tập Đoàn Công Nghệ FPT - Khối FPT Software',
        type: PartnerType.CORPORATION,
        contactPerson: 'Ông Lê Quốc Bảo (HR Talent Acquisition Manager)',
        email: 'baolq@fpt.com',
        phone: '0905123987',
        address: 'Tòa nhà FPT Cầu Giấy, Duy Tân, Hà Nội',
        totalDonatedBooks: 210,
        totalDonatedCash: 80000000,
        status: 'ACTIVE',
        note: 'Tài trợ chuyên mục sách Trí tuệ nhân tạo, Điện toán đám mây và Học bổng tra cứu số.',
      }),
    ];

    const savedPartners = await this.partnerRepo.save(partners);

    const donations = [
      this.donationRepo.create({
        partnerId: savedPartners[0].id,
        partnerName: savedPartners[0].name,
        donationType: DonationType.BOOKS,
        itemTitle: 'Bộ sưu tập 350 cuốn Sách Khởi nghiệp, Lãnh đạo & Đổi mới sáng tạo 2026',
        quantity: 350,
        estimatedValue: 42000000,
        receiptNumber: 'REC-2026-001',
        receivedByStaffName: 'Thủ thư Nguyễn Văn Quản',
        note: 'Sách mới nguyên seal, có dán nhãn logo Hội Cựu SV.',
        donationDate: new Date(Date.now() - 15 * 86400000),
      }),
      this.donationRepo.create({
        partnerId: savedPartners[0].id,
        partnerName: savedPartners[0].name,
        donationType: DonationType.CASH,
        itemTitle: 'Kinh phí hỗ trợ số hóa tài liệu quý và mua bản quyền CSDL',
        quantity: 1,
        estimatedValue: 50000000,
        receiptNumber: 'REC-2026-002',
        receivedByStaffName: 'Thủ thư Nguyễn Văn Quản',
        note: 'Đã chuyển vào tài khoản Quỹ phát triển Thư viện trường.',
        donationDate: new Date(Date.now() - 12 * 86400000),
      }),
      this.donationRepo.create({
        partnerId: savedPartners[1].id,
        partnerName: savedPartners[1].name,
        donationType: DonationType.BOOKS,
        itemTitle: '520 cuốn Giáo trình Bách khoa & Công nghệ Thông tin thế hệ mới',
        quantity: 520,
        estimatedValue: 78000000,
        receiptNumber: 'REC-2026-003',
        receivedByStaffName: 'Thủ thư Lê Thị Hồng',
        note: 'Được chuyển thẳng vào kho tài liệu tham khảo tầng 2.',
        donationDate: new Date(Date.now() - 7 * 86400000),
      }),
      this.donationRepo.create({
        partnerId: savedPartners[2].id,
        partnerName: savedPartners[2].name,
        donationType: DonationType.EQUIPMENT,
        itemTitle: '10 Máy tính bảng chuyên dụng tra cứu E-Library Kindle Paperwhite',
        quantity: 10,
        estimatedValue: 45000000,
        receiptNumber: 'REC-2026-004',
        receivedByStaffName: 'Thủ thư Nguyễn Văn Quản',
        note: 'Bàn giao cho phòng Thư viện số E-Library khai thác.',
        donationDate: new Date(Date.now() - 3 * 86400000),
      }),
    ];

    await this.donationRepo.save(donations);
  }

  async findAll(type?: string, status?: string, search?: string) {
    const qb = this.partnerRepo.createQueryBuilder('p');

    if (type) {
      qb.andWhere('p.type = :type', { type });
    }
    if (status) {
      qb.andWhere('p.status = :status', { status });
    }
    if (search) {
      qb.andWhere(
        '(LOWER(p.name) LIKE LOWER(:search) OR LOWER(p.contactPerson) LIKE LOWER(:search) OR LOWER(p.email) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('p.createdAt', 'DESC');
    return qb.getMany();
  }

  async getStats() {
    const totalPartners = await this.partnerRepo.count();
    const activePartners = await this.partnerRepo.count({ where: { status: 'ACTIVE' } });

    const partners = await this.partnerRepo.find();
    const totalDonatedBooks = partners.reduce((sum, p) => sum + (p.totalDonatedBooks || 0), 0);
    const totalDonatedCash = partners.reduce(
      (sum, p) => sum + (Number(p.totalDonatedCash) || 0),
      0,
    );

    const totalDonationEvents = await this.donationRepo.count();

    return {
      totalPartners,
      activePartners,
      totalDonatedBooks,
      totalDonatedCash,
      totalDonationEvents,
    };
  }

  async findOne(id: number) {
    const partner = await this.partnerRepo.findOne({ where: { id } });
    if (!partner) {
      throw new NotFoundException(`Không tìm thấy đối tác mã #${id}`);
    }
    return partner;
  }

  async create(dto: CreatePartnerDto) {
    const partner = this.partnerRepo.create(dto);
    return this.partnerRepo.save(partner);
  }

  async update(id: number, dto: UpdatePartnerDto) {
    const partner = await this.findOne(id);
    Object.assign(partner, dto);
    return this.partnerRepo.save(partner);
  }

  async remove(id: number) {
    const partner = await this.findOne(id);
    await this.donationRepo.delete({ partnerId: id });
    await this.partnerRepo.remove(partner);
    return { success: true, message: `Đã xóa đối tác #${id}` };
  }

  // Quản lý các đợt tiếp nhận (Donations)
  async findAllDonations(partnerId?: number, donationType?: string, search?: string) {
    const qb = this.donationRepo.createQueryBuilder('d');

    if (partnerId) {
      qb.andWhere('d.partnerId = :partnerId', { partnerId });
    }
    if (donationType) {
      qb.andWhere('d.donationType = :donationType', { donationType });
    }
    if (search) {
      qb.andWhere(
        '(LOWER(d.itemTitle) LIKE LOWER(:search) OR LOWER(d.partnerName) LIKE LOWER(:search) OR LOWER(d.receiptNumber) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('d.donationDate', 'DESC');
    return qb.getMany();
  }

  async createDonation(dto: CreateDonationDto, staffName = 'Thủ thư tiếp nhận') {
    const partner = await this.findOne(dto.partnerId);

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const receiptNumber = `REC-${new Date().getFullYear()}-${randomSuffix}`;

    const donation = this.donationRepo.create({
      partnerId: partner.id,
      partnerName: partner.name,
      donationType: dto.donationType || DonationType.BOOKS,
      itemTitle: dto.itemTitle,
      quantity: dto.quantity || 1,
      estimatedValue: dto.estimatedValue || 0,
      receiptNumber,
      receivedByStaffName: staffName,
      note: dto.note,
      donationDate: new Date(),
    });

    const savedDonation = await this.donationRepo.save(donation);

    // Cập nhật lũy kế cho đối tác
    if (donation.donationType === DonationType.BOOKS) {
      partner.totalDonatedBooks = (partner.totalDonatedBooks || 0) + (dto.quantity || 1);
    } else if (donation.donationType === DonationType.CASH) {
      partner.totalDonatedCash =
        Number(partner.totalDonatedCash || 0) + Number(dto.estimatedValue || 0);
    }
    await this.partnerRepo.save(partner);

    return savedDonation;
  }

  async getDonationReceipt(id: number) {
    const donation = await this.donationRepo.findOne({ where: { id } });
    if (!donation) {
      throw new NotFoundException(`Không tìm thấy biên bản tài trợ #${id}`);
    }

    const partner = await this.partnerRepo.findOne({ where: { id: donation.partnerId } });

    return {
      donation,
      partner,
      template: {
        organizationName: 'TRƯỜNG ĐẠI HỌC BÁCH KHOA - THƯ VIỆN TRUNG TÂM',
        documentTitle: 'THƯ CẢM ƠN & BIÊN BẢN TIẾP NHẬN TÀI TRỢ',
        issueDate: donation.donationDate,
        receiptCode: donation.receiptNumber,
        sponsorName: partner ? partner.name : donation.partnerName,
        contactPerson: partner?.contactPerson || 'Đại diện',
        sponsorAddress: partner?.address || 'Việt Nam',
        donationDetails: {
          item: donation.itemTitle,
          quantity: donation.quantity,
          type: donation.donationType,
          estimatedValue: donation.estimatedValue,
        },
        librarianSign: donation.receivedByStaffName || 'Thủ thư trưởng',
        libraryDirector: 'PGS. TS. Giám đốc Thư viện',
      },
    };
  }
}

