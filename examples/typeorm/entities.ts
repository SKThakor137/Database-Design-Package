// Sample TypeORM Entities
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';

@Entity('organizations')
export class Organization {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 150 })
    name: string;

    @Column({ type: 'varchar', unique: true })
    domain: string;

    @OneToMany(() => Team, team => team.organization)
    teams: Team[];
}

@Entity('teams')
export class Team {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar' })
    title: string;

    @ManyToOne(() => Organization, organization => organization.teams)
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;
}

@Entity('members')
export class Member {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar' })
    fullName: string;

    @Column({ type: 'varchar', unique: true })
    email: string;

    @ManyToOne(() => Team)
    @JoinColumn({ name: 'team_id' })
    team: Team;
}
