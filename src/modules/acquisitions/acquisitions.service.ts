import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PurchaseRequest, PurchaseRequestStatus } from './entities/purchase-request.entity';
import { PurchaseOrder, PurchaseOrderStatus } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { LibraryBudget } from './entities/library-budget.entity';
import { PurchaseRequestVote } from './entities/purchase-request-vote.entity';
import { Book } from '../books/entities/book.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePurchaseRequestDto } from './dto/create-purchase-request.dto';
import { UpdatePurchaseRequestDto } from './dto/update-purchase-request.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AcquisitionsService {
  constructor(
    @InjectRepository(PurchaseRequest)
    private readonly requestRepo: Repository<PurchaseRequest>,
    @InjectRepository(PurchaseOrder)
    private readonly orderRepo: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem)
    private readonly orderItemRepo: Repository<PurchaseOrderItem>,
    @InjectRepository(PurchaseRequestVote)
    private readonly voteRepo: Repository<PurchaseRequestVote>,
    @InjectRepository(Book)
    private readonly bookRepo: Repository<Book>,
    @Optional()
    @InjectRepository(LibraryBudget)
    private readonly budgetRepo?: Repository<LibraryBudget>,
    @Optional()
    private readonly notificationsService?: NotificationsService,
  ) {}

  async create(user: User, dto: CreatePurchaseRequestDto) {
    const request = this.requestRepo.create({
      ...dto,
      user,
      status: PurchaseRequestStatus.PENDING,
      votesCount: 1,
    });
    const saved = await this.requestRepo.save(request);

    // Tự động thêm 1 lượt vote ban đầu từ chính người đề xuất
    try {
      await this.voteRepo.save(
        this.voteRepo.create({
          request: saved,
          user,
        }),
      );
    } catch (_) {}

    return saved;
  }

  async toggleVote(requestId: number, user: User) {
    const request = await this.findOne(requestId);
    const existingVote = await this.voteRepo.findOne({
      where: {
        request: { id: requestId },
        user: { id: user.id },
      },
    });

    if (existingVote) {
      await this.voteRepo.remove(existingVote);
      request.votesCount = Math.max(0, (request.votesCount || 1) - 1);
      await this.requestRepo.save(request);
      return { voted: false, votesCount: request.votesCount };
    } else {
      await this.voteRepo.save(
        this.voteRepo.create({
          request,
          user,
        }),
      );
      request.votesCount = (request.votesCount || 0) + 1;
      await this.requestRepo.save(request);
      return { voted: true, votesCount: request.votesCount };
    }
  }

  async checkDuplicateBook(title: string, author?: string, isbn?: string) {
    if (isbn && isbn.trim()) {
      const byIsbn = await this.bookRepo.findOne({
        where: { isbn: isbn.trim() },
      });
      if (byIsbn) {
        return {
          isDuplicate: true,
          matchedBook: {
            id: byIsbn.id,
            title: byIsbn.title,
            author: byIsbn.author,
            availableCopies: byIsbn.availableCopies,
            totalCopies: byIsbn.totalCopies,
          },
        };
      }
    }

    if (title && title.trim()) {
      const cleanTitle = title.trim();
      const byTitle = await this.bookRepo
        .createQueryBuilder('b')
        .where('LOWER(b.title) = LOWER(:title)', { title: cleanTitle })
        .getOne();

      if (byTitle) {
        return {
          isDuplicate: true,
          matchedBook: {
            id: byTitle.id,
            title: byTitle.title,
            author: byTitle.author,
            availableCopies: byTitle.availableCopies,
            totalCopies: byTitle.totalCopies,
          },
        };
      }
    }

    return { isDuplicate: false };
  }

  async findAll(status?: string, search?: string, sortBy?: string, currentUserId?: number) {
    const qb = this.requestRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.user', 'u');

    if (status && status.trim()) {
      qb.andWhere('r.status = :status', { status: status.trim() });
    }
    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      qb.andWhere(
        'r.title LIKE :s OR r.author LIKE :s OR u.username LIKE :s OR u.fullName LIKE :s OR r.publisher LIKE :s',
        { s },
      );
    }

    if (sortBy === 'latest') {
      qb.orderBy('r.createdAt', 'DESC');
    } else {
      // Mặc định: bình chọn cao nhất lên đầu, tiếp đến ngày tạo mới nhất
      qb.orderBy('r.votesCount', 'DESC').addOrderBy('r.createdAt', 'DESC');
    }

    const requests = await qb.getMany();

    // Lấy tập hợp requestIds mà user hiện tại đã vote
    const userVotesSet = new Set<number>();
    if (currentUserId && requests.length) {
      const votes = await this.voteRepo
        .createQueryBuilder('v')
        .leftJoin('v.request', 'r')
        .where('v.userId = :userId', { userId: currentUserId })
        .select(['v.id', 'r.id'])
        .getMany();
      votes.forEach((v) => {
        if (v.request?.id) userVotesSet.add(v.request.id);
      });
    }

    return Promise.all(
      requests.map(async (req) => {
        const dup = await this.checkDuplicateBook(req.title, req.author, req.isbn);
        return {
          ...req,
          hasVoted: userVotesSet.has(req.id),
          duplicateCheck: dup,
        };
      }),
    );
  }

  async findMy(userId: number) {
    const requests = await this.requestRepo.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
    return Promise.all(
      requests.map(async (req) => {
        const dup = await this.checkDuplicateBook(req.title, req.author, req.isbn);
        return {
          ...req,
          hasVoted: true,
          duplicateCheck: dup,
        };
      }),
    );
  }

  async findOne(id: number) {
    const req = await this.requestRepo.findOne({
      where: { id },
      relations: { user: true },
    });
    if (!req) throw new NotFoundException('Không tìm thấy đề xuất mua sách');
    return req;
  }

  async update(id: number, dto: UpdatePurchaseRequestDto) {
    const req = await this.findOne(id);
    const previousStatus = req.status;
    if (dto.status !== undefined) req.status = dto.status;
    if (dto.adminNote !== undefined) req.adminNote = dto.adminNote;
    const saved = await this.requestRepo.save(req);

    if (dto.status && dto.status !== previousStatus && req.user) {
      await this.notifyReaderOnStatusChange(req, dto.status, dto.adminNote);
    }
    return saved;
  }

  private async notifyReaderOnStatusChange(
    req: PurchaseRequest,
    status: PurchaseRequestStatus,
    adminNote?: string,
  ) {
    if (!this.notificationsService || !req.user) return;
    try {
      let title = '';
      let message = '';
      if (status === PurchaseRequestStatus.APPROVED) {
        title = 'Đề xuất mua sách được phê duyệt';
        message = `Đề xuất cuốn sách "${req.title}" của bạn đã được Thư viện phê duyệt. Sách sẽ được đưa vào kế hoạch mua sắm đợt tới!`;
      } else if (status === PurchaseRequestStatus.ORDERED) {
        title = 'Sách đề xuất đang được đặt hàng';
        message = `Cuốn sách "${req.title}" đã được lập đơn mua hàng gửi tới Nhà cung cấp / NXB và đang trên đường chuyển về thư viện.`;
      } else if (status === PurchaseRequestStatus.RECEIVED) {
        title = 'Sách đề xuất đã về kho thư viện';
        message = `Tin vui! Cuốn sách "${req.title}" bạn đề xuất đã được nhập kho và gắn mã vạch. Bạn có thể đến thư viện hoặc đặt mượn trực tuyến ngay!`;
      } else if (status === PurchaseRequestStatus.REJECTED) {
        title = 'Thông báo về đề xuất mua sách';
        message = `Đề xuất cuốn sách "${req.title}" chưa được phê duyệt đợt này. ${adminNote ? `Lý do: ${adminNote}` : ''}`;
      }
      if (title) {
        await this.notificationsService.sendAcquisitionNotification(req.user, title, message);
      }
    } catch (_) {}
  }

  async advanceApprovalStage(id: number, performer: any, note?: string) {
    const req = await this.findOne(id);
    const now = new Date();
    const performerName = performer?.fullName || performer?.username || 'Cán bộ xét duyệt';

    if (!req.currentApprovalStage || req.currentApprovalStage === 'LIBRARIAN' || req.status === PurchaseRequestStatus.PENDING) {
      req.librarianApprovedBy = performerName;
      req.librarianApprovedAt = now;
      req.librarianNote = note || 'Thủ thư đã thẩm định đạt tiêu chuẩn bổ sung';
      req.currentApprovalStage = 'DEAN';
      req.status = PurchaseRequestStatus.PENDING_DEAN;

      if (this.notificationsService && req.user) {
        await this.notificationsService.sendAcquisitionNotification(
          req.user,
          'Đề xuất sách qua vòng thẩm định Thư viện',
          `Cuốn sách "${req.title}" đã được Thủ thư thẩm định và chuyển lên Trưởng khoa phê duyệt chuyên môn.`,
        );
      }
    } else if (req.currentApprovalStage === 'DEAN' || req.status === PurchaseRequestStatus.PENDING_DEAN) {
      req.deanApprovedBy = performerName;
      req.deanApprovedAt = now;
      req.deanNote = note || 'Trưởng khoa duyệt phù hợp chương trình đào tạo';
      req.currentApprovalStage = 'RECTOR';
      req.status = PurchaseRequestStatus.PENDING_RECTOR;

      if (this.notificationsService && req.user) {
        await this.notificationsService.sendAcquisitionNotification(
          req.user,
          'Đề xuất sách được Trưởng khoa phê duyệt',
          `Cuốn sách "${req.title}" đã được Trưởng khoa xét duyệt chuyên môn và trình lên Ban Giám hiệu cấp kinh phí.`,
        );
      }
    } else if (req.currentApprovalStage === 'RECTOR' || req.status === PurchaseRequestStatus.PENDING_RECTOR) {
      req.rectorApprovedBy = performerName;
      req.rectorApprovedAt = now;
      req.rectorNote = note || 'Ban Giám hiệu phê duyệt cấp kinh phí mua sắm';
      req.currentApprovalStage = 'COMPLETED';
      req.status = PurchaseRequestStatus.APPROVED;

      if (this.notificationsService && req.user) {
        await this.notificationsService.sendAcquisitionNotification(
          req.user,
          'Đề xuất sách được Ban Giám hiệu phê duyệt chính thức',
          `Tin vui! Cuốn sách "${req.title}" đã được Ban Giám hiệu phê duyệt toàn diện và đưa vào kế hoạch mua sắm PO.`,
        );
      }
    }

    return this.requestRepo.save(req);
  }

  async rejectRequest(id: number, performer: any, reason?: string) {
    const req = await this.findOne(id);
    req.status = PurchaseRequestStatus.REJECTED;
    req.rejectionReason = reason || 'Chưa phù hợp tiêu chí bổ sung đợt này';
    req.adminNote = req.rejectionReason;
    const saved = await this.requestRepo.save(req);

    if (this.notificationsService && req.user) {
      await this.notificationsService.sendAcquisitionNotification(
        req.user,
        'Thông báo về đề xuất mua sách',
        `Đề xuất cuốn sách "${req.title}" chưa được phê duyệt đợt này. Lý do: ${req.rejectionReason}`,
      );
    }
    return saved;
  }

  async getOpacFeed(currentUserId?: number) {
    const qb = this.requestRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.user', 'u')
      .where('r.status IN (:...statuses)', {
        statuses: [
          PurchaseRequestStatus.PENDING,
          PurchaseRequestStatus.PENDING_LIBRARIAN,
          PurchaseRequestStatus.PENDING_DEAN,
          PurchaseRequestStatus.PENDING_RECTOR,
          PurchaseRequestStatus.APPROVED,
        ],
      })
      .orderBy('r.votesCount', 'DESC')
      .addOrderBy('r.createdAt', 'DESC')
      .take(40);

    const requests = await qb.getMany();

    const userVotesSet = new Set<number>();
    if (currentUserId && requests.length) {
      const votes = await this.voteRepo
        .createQueryBuilder('v')
        .leftJoin('v.request', 'r')
        .where('v.userId = :userId', { userId: currentUserId })
        .select(['v.id', 'r.id'])
        .getMany();
      votes.forEach((v) => {
        if (v.request?.id) userVotesSet.add(v.request.id);
      });
    }

    return requests.map((req) => ({
      id: req.id,
      title: req.title,
      author: req.author,
      publisher: req.publisher,
      isbn: req.isbn,
      publicationYear: req.publicationYear,
      estimatedPrice: req.estimatedPrice,
      reason: req.reason,
      referenceUrl: req.referenceUrl,
      status: req.status,
      currentApprovalStage: req.currentApprovalStage || 'LIBRARIAN',
      votesCount: req.votesCount || 0,
      hasVoted: userVotesSet.has(req.id),
      user: {
        username: req.user?.username,
        fullName: req.user?.fullName,
      },
      createdAt: req.createdAt,
    }));
  }

  async remove(id: number) {
    const req = await this.findOne(id);
    await this.requestRepo.remove(req);
    return { message: 'Đã xóa đề xuất mua sách' };
  }

  async getApprovedGroups() {
    const approvedRequests = await this.requestRepo.find({
      where: { status: PurchaseRequestStatus.APPROVED },
      relations: { user: true },
      order: { publisher: 'ASC', createdAt: 'DESC' },
    });

    const groupMap = new Map<
      string,
      {
        publisher: string;
        requestCount: number;
        totalEstimatedPrice: number;
        requests: PurchaseRequest[];
      }
    >();

    for (const req of approvedRequests) {
      const pub = (req.publisher || '').trim() || 'Nhà xuất bản đối tác';
      if (!groupMap.has(pub)) {
        groupMap.set(pub, {
          publisher: pub,
          requestCount: 0,
          totalEstimatedPrice: 0,
          requests: [],
        });
      }
      const g = groupMap.get(pub)!;
      g.requestCount += 1;
      g.totalEstimatedPrice += Number(req.estimatedPrice) || 0;
      g.requests.push(req);
    }

    return Array.from(groupMap.values());
  }

  async getBudget(year: number) {
    const yr = Number(year) || new Date().getFullYear();
    let budget = this.budgetRepo ? await this.budgetRepo.findOneBy({ year: yr }) : null;
    if (!budget && this.budgetRepo) {
      budget = await this.budgetRepo.save(
        this.budgetRepo.create({
          year: yr,
          totalBudget: 200000000,
          q1Allocation: 50000000,
          q2Allocation: 50000000,
          q3Allocation: 50000000,
          q4Allocation: 50000000,
          notes: `Ngân sách thu mua năm ${yr}`,
        }),
      );
    }

    const orders = await this.orderRepo.find();
    let totalSpent = 0;
    const quarterlySpent = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };

    for (const po of orders) {
      const d = po.createdAt ? new Date(po.createdAt) : new Date();
      if (d.getFullYear() === yr && po.status !== PurchaseOrderStatus.CANCELLED) {
        const amt = Number(po.totalAmount) || 0;
        totalSpent += amt;
        const month = d.getMonth() + 1;
        if (month <= 3) quarterlySpent.Q1 += amt;
        else if (month <= 6) quarterlySpent.Q2 += amt;
        else if (month <= 9) quarterlySpent.Q3 += amt;
        else quarterlySpent.Q4 += amt;
      }
    }

    const total = budget ? Number(budget.totalBudget) : 200000000;
    const remaining = Math.max(0, total - totalSpent);

    const transactions = orders
      .filter((po) => {
        const d = po.createdAt ? new Date(po.createdAt) : new Date();
        return d.getFullYear() === yr;
      })
      .map((po) => {
        const d = po.createdAt ? new Date(po.createdAt) : new Date();
        const month = d.getMonth() + 1;
        let quarter = 'Q4';
        if (month <= 3) quarter = 'Q1';
        else if (month <= 6) quarter = 'Q2';
        else if (month <= 9) quarter = 'Q3';
        return {
          id: po.id,
          orderCode: po.orderCode,
          supplierName: po.supplierName,
          supplierPhone: po.supplierPhone,
          supplierEmail: po.supplierEmail,
          totalAmount: Number(po.totalAmount) || 0,
          status: po.status,
          createdAt: po.createdAt,
          quarter,
          createdByName: po.createdByName || 'Thủ thư kho sách',
          note: po.note || '',
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      year: yr,
      budget,
      totalBudget: total,
      totalSpent,
      remainingBudget: remaining,
      spentPercentage: total > 0 ? Math.round((totalSpent / total) * 100) : 0,
      quarterlySpent,
      transactions,
    };
  }

  async saveBudget(data: any) {
    if (!this.budgetRepo) return null;
    const yr = Number(data.year) || new Date().getFullYear();
    let budget = await this.budgetRepo.findOneBy({ year: yr });
    if (!budget) {
      budget = (this.budgetRepo.create({ ...data, year: yr }) as unknown) as LibraryBudget;
    } else {
      Object.assign(budget, data);
    }
    return this.budgetRepo.save(budget);
  }

  async createOrder(data: {
    orderCode?: string;
    supplierName: string;
    supplierPhone?: string;
    supplierEmail?: string;
    expectedDeliveryDate?: string;
    note?: string;
    createdByName?: string;
    totalAmount?: number;
    requestIds?: number[];
    items?: { bookTitle: string; author: string; quantity: number; unitPrice: number }[];
  }) {
    const orderCode = data.orderCode?.trim() || `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    let calculatedAmount = 0;
    const items = (data.items || []).map((it) => {
      const q = Math.max(1, Number(it.quantity) || 1);
      const p = Math.max(0, Number(it.unitPrice) || 0);
      const total = q * p;
      calculatedAmount += total;
      return this.orderItemRepo.create({
        bookTitle: it.bookTitle,
        author: it.author,
        quantity: q,
        unitPrice: p,
        totalPrice: total,
      });
    });

    const finalAmount = Number(data.totalAmount) > 0 ? Number(data.totalAmount) : calculatedAmount;

    const order = this.orderRepo.create({
      orderCode,
      supplierName: data.supplierName,
      supplierPhone: data.supplierPhone,
      supplierEmail: data.supplierEmail,
      note: data.note,
      createdByName: data.createdByName || 'Thủ thư',
      expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : undefined,
      status: PurchaseOrderStatus.DRAFT,
      totalAmount: finalAmount,
      items,
    });

    const savedOrder = await this.orderRepo.save(order);

    // Nếu tạo từ danh sách đề xuất, tự động cập nhật trạng thái các đề xuất sang ORDERED và gửi thông báo
    if (data.requestIds && data.requestIds.length) {
      for (const reqId of data.requestIds) {
        try {
          await this.update(reqId, {
            status: PurchaseRequestStatus.ORDERED,
            adminNote: `Đã lập đơn mua hàng ${orderCode}`,
          });
        } catch (_) {}
      }
    }

    return savedOrder;
  }

  async findAllOrders(status?: string) {
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.items', 'items')
      .orderBy('o.createdAt', 'DESC');

    if (status && status.trim()) {
      qb.andWhere('o.status = :status', { status: status.trim() });
    }
    return qb.getMany();
  }

  async findOrder(id: number) {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: { items: true },
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn mua hàng');
    return order;
  }

  async updateOrderStatus(id: number, status: PurchaseOrderStatus, note?: string) {
    const order = await this.findOrder(id);
    order.status = status;
    if (note !== undefined) order.note = note;
    return this.orderRepo.save(order);
  }

  async removeOrder(id: number) {
    const order = await this.findOrder(id);
    await this.orderRepo.remove(order);
    return { message: 'Đã xóa đơn đặt hàng' };
  }
}
