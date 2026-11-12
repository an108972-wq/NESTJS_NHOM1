import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AiService } from './ai.service';
import { Book } from '../books/entities/book.entity';
import { Category } from '../categories/entities/category.entity';
import { BorrowRecord } from '../borrow-records/entities/borrow-record.entity';
import { FavoriteBook } from '../books/entities/favorite-book.entity';
import { User } from '../users/entities/user.entity';
import { PurchaseRequest } from '../acquisitions/entities/purchase-request.entity';

describe('AiService', () => {
  let service: AiService;
  let bookRepo: any;
  let categoryRepo: any;
  let borrowRepo: any;
  let favoriteRepo: any;
  let userRepo: any;
  let purchaseRequestRepo: any;

  const mockBooks = [
    {
      id: 1,
      title: 'Lập trình hướng đối tượng với Java',
      author: 'Đoàn Văn Ban',
      isbn: '9786049132456',
      availableCopies: 3,
      totalCopies: 5,
      shelf: 'A-12',
      floor: 'Tầng 2',
      description: 'Giáo trình OOP và các mẫu thiết kế Java',
      category: { id: 10, name: 'Công nghệ thông tin' },
    },
    {
      id: 2,
      title: 'Kinh tế học vĩ mô',
      author: 'N. Gregory Mankiw',
      isbn: '9786045982121',
      availableCopies: 0,
      totalCopies: 2,
      shelf: 'B-04',
      floor: 'Tầng 1',
      description: 'Giáo trình kinh tế học vĩ mô',
      category: { id: 20, name: 'Kinh tế' },
    },
  ];

  beforeEach(() => {
    bookRepo = {
      find: vi.fn().mockResolvedValue(mockBooks),
      findOne: vi.fn().mockResolvedValue(null),
    };
    categoryRepo = {
      find: vi.fn().mockResolvedValue([
        { id: 10, name: 'Công nghệ thông tin', books: [mockBooks[0]] },
        { id: 20, name: 'Kinh tế', books: [mockBooks[1]] },
      ]),
    };
    borrowRepo = {
      find: vi.fn().mockResolvedValue([]),
    };
    favoriteRepo = {
      find: vi.fn().mockResolvedValue([]),
    };
    userRepo = {
      findOne: vi.fn().mockResolvedValue({ id: 1, fullName: 'Sinh Vien Test' }),
    };
    purchaseRequestRepo = {
      find: vi.fn().mockResolvedValue([]),
    };

    service = new AiService(
      bookRepo,
      categoryRepo,
      borrowRepo,
      favoriteRepo,
      userRepo,
      purchaseRequestRepo,
    );
  });

  it('1. Chatbot RAG: should find relevant books and return synthesized reply', async () => {
    const res = await service.chat({ message: 'Tìm sách lập trình Java hướng đối tượng' });
    expect(res).toBeDefined();
    expect(res.reply).toContain('Lập trình hướng đối tượng với Java');
    expect(res.books.length).toBeGreaterThan(0);
    expect(res.suggestions.length).toBeGreaterThan(0);
  });

  it('2. Personalized Recommendations: should generate recommendations with match score', async () => {
    const res = await service.getPersonalizedRecommendations(1);
    expect(res.recommendations).toBeDefined();
    expect(res.recommendations.length).toBeGreaterThan(0);
    expect(res.recommendations[0].matchScore).toBeDefined();
    expect(res.recommendations[0].reason).toBeDefined();
  });

  it('3. OCR Book Extraction: should extract title, author, and ISBN from image text', async () => {
    const fakeFile = {
      originalname: 'clean_code_cover.jpg',
      buffer: Buffer.from('Clean Code Robert C. Martin 9780132350884'),
    };
    const res = await service.ocrExtractBook(fakeFile);
    expect(res.success).toBe(true);
    expect(res.title).toContain('Clean Code');
    expect(res.author).toBe('Robert C. Martin');
    expect(res.confidence).toBeGreaterThan(0.9);
  });

  it('4. Budget Demand Forecast: should calculate category growth rates and recommendations', async () => {
    const res = await service.getBudgetDemandForecast(2026);
    expect(res.forecastYear).toBe(2026);
    expect(res.categoryForecasts.length).toBe(2);
    expect(res.categoryForecasts[0].forecastGrowthPercent).toBeDefined();
    expect(res.aiExecutiveSummary).toBeDefined();
  });
});

