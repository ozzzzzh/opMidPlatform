import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateTicketDto } from './create-ticket.dto';

export class CreateStaffTicketDto extends CreateTicketDto {
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  assignToMe?: boolean;
}
