import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

export class LookupTicketDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @Length(5, 32, { message: '工单号格式不正确' })
  ticketNo!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/[\s-]/g, '').toUpperCase() : value,
  )
  @IsString()
  @Length(8, 16, { message: '查询码格式不正确' })
  accessCode!: string;
}
