import { IsUUID, IsInt, Min, IsOptional } from 'class-validator';

export class SubmitAnswerDto {
  @IsUUID('4', { message: 'question_id harus berupa UUID valid.' })
  question_id: string;

  @IsOptional()
  @IsUUID('4', { message: 'selected_option_id harus berupa UUID valid.' })
  selected_option_id?: string | null;

  @IsInt({ message: 'time_spent_ms harus berupa bilangan bulat.' })
  @Min(500, { message: 'time_spent_ms minimal 500ms.' })
  time_spent_ms: number;
}
