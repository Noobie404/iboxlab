import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsDateString,
  Length,
  Matches,
} from 'class-validator';

export class PassengerDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'A12345678' })
  @IsString()
  @Length(6, 20)
  @Matches(/^[A-Z0-9]+$/, { message: 'Passport must be alphanumeric uppercase' })
  passport: string;

  @ApiProperty({ example: '1990-05-15' })
  @IsDateString()
  dateOfBirth: string;
}
