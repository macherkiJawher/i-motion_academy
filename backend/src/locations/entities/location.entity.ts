import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Session } from '../../sessions/entities/session.entity';

export enum LocationType {
  PHYSICAL = 'PHYSICAL',
  ONLINE = 'ONLINE',
}

@Entity({ name: 'locations' })
export class Location {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 180 })
  name: string;

  @Column({ type: 'enum', enum: LocationType, enumName: 'location_type' })
  type: LocationType;

  @Column({ type: 'varchar', length: 120, default: '' })
  city: string;

  @Column({ type: 'varchar', length: 120, default: '' })
  country: string;

  @Column({ type: 'varchar', length: 300, default: '' })
  address: string;

  @Column({ type: 'double precision', nullable: true })
  latitude: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude: number | null;

  @Column({
    name: 'contact_name',
    type: 'varchar',
    length: 160,
    nullable: true,
  })
  contactName: string | null;

  @Column({
    name: 'contact_phone',
    type: 'varchar',
    length: 40,
    nullable: true,
  })
  contactPhone: string | null;

  @Column({
    name: 'contact_email',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  contactEmail: string | null;

  @Column({ type: 'text', default: '' })
  instructions: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @ManyToMany(() => Session, (session) => session.locations)
  sessions: Session[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
