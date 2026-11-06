import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateBookDto } from './create-book.dto';

describe('CreateBookDto', () => {
  const validBook = {
    title: 'Book title',
    author: 'Book author',
    isbn: '9780000000000',
  };

  it('trims title and author before validation', async () => {
    const dto = plainToInstance(CreateBookDto, {
      ...validBook,
      title: '  Book title  ',
      author: '  Book author  ',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.title).toBe('Book title');
    expect(dto.author).toBe('Book author');
  });

  it('rejects one-character or whitespace-only titles and authors', async () => {
    const dto = plainToInstance(CreateBookDto, {
      ...validBook,
      title: ' d ',
      author: ' ',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['title', 'author']),
    );
  });
});
