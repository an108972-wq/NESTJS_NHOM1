import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LibraryTutorial } from './entities/tutorial.entity';
import { TutorialRegistration } from './entities/tutorial-registration.entity';
import { TutorialsService } from './tutorials.service';
import { TutorialsController } from './tutorials.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LibraryTutorial, TutorialRegistration])],
  controllers: [TutorialsController],
  providers: [TutorialsService],
  exports: [TutorialsService],
})
export class TutorialsModule {}

