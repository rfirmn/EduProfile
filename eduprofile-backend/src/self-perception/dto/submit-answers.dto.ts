import { IsArray, ValidateNested, IsString, IsUUID, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

class SelfPerceptionAnswerItem {
  @IsUUID('4', { message: 'question_id harus berupa UUID valid.' })
  question_id: string;

  @IsString()
  @MinLength(20, { message: 'Jawaban esai minimal 20 karakter.' })
  essay_text: string;
}

export class SubmitSelfPerceptionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelfPerceptionAnswerItem)
  answers: SelfPerceptionAnswerItem[];
}
