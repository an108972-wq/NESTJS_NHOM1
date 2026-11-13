import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MultimediaItem, Thesis } from './entities/academic-resource.entity';
import { AcademicResourcesService } from './academic-resources.service';
import { AcademicResourcesController } from './academic-resources.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Thesis, MultimediaItem])],
  controllers: [AcademicResourcesController],
  providers: [AcademicResourcesService],
  exports: [AcademicResourcesService],
})
export class AcademicResourcesModule {}

