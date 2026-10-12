import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { TrainingsModule } from './trainings/trainings.module';
import { SessionsModule } from './sessions/sessions.module';
import { RegistrationsModule } from './registrations/registrations.module';
import { PaymentsModule } from './payments/payments.module';
import { CertificatesModule } from './certificates/certificates.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuditModule } from './audit/audit.module';
import { FeedbackModule } from './feedback/feedback.module';
import { ComplaintsModule } from './complaints/complaints.module';
import { LocationsModule } from './locations/locations.module';
import { TrainersModule } from './trainers/trainers.module';
import { ContactRequestsModule } from './contact-requests/contact-requests.module';
import { PublicAssistantModule } from './public-assistant/public-assistant.module';
import { AdminAssistantModule } from './admin-assistant/admin-assistant.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const host = config.get<string>('DB_HOST')?.trim();
        const portValue = config.get<string>('DB_PORT')?.trim();
        const username = config.get<string>('DB_USERNAME')?.trim();
        const password = config.get<string>('DB_PASSWORD')?.trim();
        const database = config.get<string>('DB_NAME')?.trim();

        const missing = Object.entries({
          DB_HOST: host,
          DB_PORT: portValue,
          DB_USERNAME: username,
          DB_PASSWORD: password,
          DB_NAME: database,
        })
          .filter(([, value]) => !value)
          .map(([name]) => name);

        if (missing.length > 0) {
          throw new Error(
            `Missing database environment variables: ${missing.join(', ')}`,
          );
        }

        const port = Number(portValue);
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
          throw new Error('DB_PORT must be a valid TCP port number');
        }

        return {
          type: 'postgres',
          host,
          port,
          username,
          password,
          database,
          autoLoadEntities: true,
          synchronize: false,
          migrations: [__dirname + '/../migrations/*.js'],
        } as any;
      },
    }),
    UsersModule,
    AuthModule,
    TrainingsModule,
    SessionsModule,
    RegistrationsModule,
    PaymentsModule,
    CertificatesModule,
    NotificationsModule,
    AnalyticsModule,
    AuditModule,
    FeedbackModule,
    ComplaintsModule,
    LocationsModule,
    TrainersModule,
    ContactRequestsModule,
    PublicAssistantModule,
    AdminAssistantModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
