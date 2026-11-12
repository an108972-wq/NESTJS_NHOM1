import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ChatMessageDto {
  @IsString()
  role: 'user' | 'assistant';

  @IsString()
  content: string;
}

export class AiChatDto {
  @IsNotEmpty({ message: 'Nội dung câu hỏi không được để trống' })
  @IsString()
  message: string;

  @IsOptional()
  @IsArray()
  history?: ChatMessageDto[];
}

