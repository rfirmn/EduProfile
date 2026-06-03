import { IsArray, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

class ProfileTestAnswerItem {
  @IsUUID('4', { message: 'question_id harus berupa UUID valid.' })
  question_id: string;

  @IsUUID('4', { message: 'selected_option_id harus berupa UUID valid.' })
  selected_option_id: string;
}

export class SubmitProfileTestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProfileTestAnswerItem)
  answers: ProfileTestAnswerItem[];
}
