import { Entity, PrimaryGeneratedColumn, Unique, Column, CreateDateColumn, UpdateDateColumn,
DeleteDateColumn, 
OneToOne,
JoinColumn, BeforeInsert, BeforeUpdate} from 'typeorm';
import { MinLength, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';
import * as bcrypt from 'bcryptjs';

@Entity()
@Unique(['username'])
@Unique(['telefono'])
export class Users {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @MinLength(6)
  @IsEmail()
  @IsNotEmpty()
  username: string;

  @Column()
  name: string;

  @Column()
  apellido1: string;

  @Column()
  apellido2: string;

  @Column()
  apellidos: string;

  @Column()
  @MinLength(6)
  @IsNotEmpty()
  password: string;

  @Column()
  @IsNotEmpty()
  role: string;

  @Column()
  sexo: string;

  @Column()
  @IsNotEmpty()
  telefono: string;

  @Column()
  provincia: string;

  @Column()
  municipio: string;

  @Column()
  ccaa: string;

  @Column()
  codigo_postal: string;

  @Column()
  numero_hijos: string;

  @Column()
  ingresos_mensuales: string;

  @Column()
  condiciones_legales: boolean;

  @Column()
  is_valid: boolean;

  @CreateDateColumn({ name: 'fecha_nacimiento' }) 'fecha_nacimiento': Date;

  @Column({ name: 'fecha_nacimiento_hijo1', type: 'timestamp', nullable: true, default: () => null })
  @IsOptional()
  'fecha_nacimiento_hijo1': Date;

  @Column({ name: 'fecha_nacimiento_hijo2', type: 'timestamp', nullable: true, default: () => null })
  @IsOptional()
  'fecha_nacimiento_hijo2': Date;

  @Column({ name: 'fecha_nacimiento_hijo3', type: 'timestamp', nullable: true, default: () => null })
  @IsOptional()
  'fecha_nacimiento_hijo3': Date;

  @Column({ nullable: true })
  edad_usuario: number; // Edad del usuario

  @Column({ nullable: true })
  edad_hijo1: number; // Edad del hijo 1

  @Column({ nullable: true })
  edad_hijo2: number; // Edad del hijo 2

  @Column({ nullable: true })
  edad_hijo3: number; // Edad del hijo 3

  @Column({ nullable: true })
  tamano_municipio: string; // Tamaño del municipio o hábitat
  
  @CreateDateColumn({ name: 'created_at' }) 'created_at': Date;
  @UpdateDateColumn({ name: 'updated_at' }) 'updated_at': Date;
  @DeleteDateColumn({ name: 'deleted_at' }) 'deleted_at': Date;

  @Column({ default: '' })
  @IsOptional()
  resetToken: string;

  @Column({ default: '' })
  @IsOptional()
  verifyToken: string;

  @Column({ default: '' })
  @IsOptional()
  ocupacion: string;

  @Column({ default: '' })
  @IsOptional()
  vive_con: string;

  @Column({ default: '' })
  @IsOptional()
  nivel_estudios: string;

  @Column({ default: '' })
  @IsOptional()
  clase_social: string;

  @Column({ default: '' })
  @IsOptional()
  source: string;
  
  @Column({ default: '' })
  @IsOptional()
  region: string;

  @Column({ default: '' })
  @IsOptional()
  areas_nielsen: string;

  @Column({ default: '' })
  @IsOptional()
  zona_nielsen: string;

  @Column({ default: 0 })
  @IsOptional()
  poblacion_2021: number;

  @Column({ default: 0 })
  @IsOptional()
  hombres: number;

  @Column({ default: 0 })
  @IsOptional()
  mujeres: number;

  @Column({ default: 0 })
  @IsOptional()
  user_invite: number;

  @Column({ default: '' })
  @IsOptional()
  friend_register: string;

  hashPassword(): void {
    const salt = bcrypt.genSaltSync(10);
    this.password = bcrypt.hashSync(this.password, salt);
  }

  checkPassword(password: string): boolean {
    return bcrypt.compareSync(password, this.password);
  }

  // Función para calcular la edad del usuario y de los hijos
  calcularEdades() {
    const hoy = new Date();
    // Edad del usuario
    this.edad_usuario = hoy.getFullYear() - this.fecha_nacimiento.getFullYear();

    // Edad de los hijos (si las fechas de nacimiento están definidas)
    if (this.fecha_nacimiento_hijo1) {
      this.edad_hijo1 = hoy.getFullYear() - this.fecha_nacimiento_hijo1.getFullYear();
    } else {
      this.edad_hijo1 = null;
    }

    if (this.fecha_nacimiento_hijo2) {
      this.edad_hijo2 = hoy.getFullYear() - this.fecha_nacimiento_hijo2.getFullYear();
    } else {
      this.edad_hijo2 = null;
    }

    if (this.fecha_nacimiento_hijo3) {
      this.edad_hijo3 = hoy.getFullYear() - this.fecha_nacimiento_hijo3.getFullYear();
    } else {
      this.edad_hijo3 = null;
    }
  }

  // Función para calcular el tamaño del municipio
  calcularTamanoMunicipio() {
    const poblacion = parseInt(this.poblacion_2021.toString(), 10);
    if (poblacion < 10000) {
      this.tamano_municipio = 'Menos de 10.000 hab.';
    } else if (poblacion >= 10000 && poblacion < 50000) {
      this.tamano_municipio = 'De 10.000 a 50.000 hab.';
    } else if (poblacion >= 50000 && poblacion < 200000) {
      this.tamano_municipio = 'De 50.000 a 200.000 hab.';
    } else {
      this.tamano_municipio = 'Más de 200.000 hab.';
    }
  }

  @BeforeInsert()
  @BeforeUpdate()
  actualizarCamposDinamicos() {
    this.calcularEdades();
    this.calcularTamanoMunicipio();
  }
  
}

@Entity()
export class Pays {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  metodoPago: string;

  @Column('decimal', { precision: 10, scale: 2 })
  cantidad: number;

  @Column()
  IdEncuestado: number;

  @Column()
  NombreEncuesta : string;

  @CreateDateColumn({ name: 'FechaPago' }) 'FechaPago': Date;

  @Column()
  @MinLength(6)
  @IsEmail()
  @IsNotEmpty()
  Email: string;

  @OneToOne(() => Users)
  @JoinColumn()
  users: Users
}

@Entity()
export class Invitations {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @MinLength(6)
  @IsEmail()
  @IsNotEmpty()
  username: string;

  @Column()
  code: string;

  @Column()
  coments: string;

  @Column()
  sender_id: number;

  @Column()
  is_used: boolean;

  @CreateDateColumn({ name: 'created_at' }) 'created_at': Date;
}

@Entity()
export class DeleteUsers {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  username: string;

  @Column()
  name: string;

  @Column()
  apellido1: string;

  @Column()
  apellido2: string;

  @Column()
  apellidos: string;

  @Column()
  password: string;

  @Column()
  role: string;

  @Column()
  sexo: string;

  @Column()
  telefono: string;

  @Column()
  provincia: string;

  @Column()
  municipio: string;

  @Column()
  ccaa: string;

  @Column()
  codigo_postal: string;

  @Column()
  numero_hijos: string;

  @Column()
  ingresos_mensuales: string;

  @Column()
  condiciones_legales: boolean;

  @Column()
  is_valid: boolean;

  @DeleteDateColumn({ name: 'deleted_at' })
  deleted_at: Date;
  @CreateDateColumn({ name: 'created_at' }) 'created_at': Date;
  @UpdateDateColumn({ name: 'updated_at' }) 'updated_at': Date;

  @Column({ default: '' })
  resetToken: string;

  @Column({ default: '' })
  verifyToken: string;

  @Column({ default: '' })
  ocupacion: string;

  @Column({ default: '' })
  vive_con: string;

  @Column({ default: '' })
  nivel_estudios: string;

  @Column({ default: '' })
  clase_social: string;

  @Column({ default: '' })
  source: string;
  
  @Column({ default: '' })
  region: string;

  @Column({ default: '' })
  areas_nielsen: string;

  @Column({ default: '' })
  zona_nielsen: string;

  @Column({ default: 0 })
  poblacion_2021: number;

  @Column({ default: 0 })
  hombres: number;

  @Column({ default: 0 })
  mujeres: number;

  @Column({ default: 0 })
  user_invite: number;

  @Column({ default: '' })
  friend_register: string;

  @CreateDateColumn({ name: 'fecha_nacimiento' }) 'fecha_nacimiento': Date;

  @Column({ name: 'fecha_nacimiento_hijo1', type: 'timestamp', nullable: true, default: () => null })
  @IsOptional()
  'fecha_nacimiento_hijo1': Date;

  @Column({ name: 'fecha_nacimiento_hijo2', type: 'timestamp', nullable: true, default: () => null })
  @IsOptional()
  'fecha_nacimiento_hijo2': Date;

  @Column({ name: 'fecha_nacimiento_hijo3', type: 'timestamp', nullable: true, default: () => null })
  @IsOptional()
  'fecha_nacimiento_hijo3': Date;
}

@Entity()
export class NewUsers extends Users {
}


@Entity()
export class CodigosPostales {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  codigo_postal: number;

  @Column()
  poblacion: string;

  @Column()
  provincia: string;

  @Column()
  ccaa: string;

  @Column()
  region: string;

  @Column()
  areas_nielsen: string;

  @Column()
  zona_nielsen: string;

  @Column()
  madrid_metropolitano: number;

  @Column()
  barcelona_metropolitano: number;

  @Column()
  poblacion2021: number;

  @Column()
  hombres: number;

  @Column()
  mujeres: number;
  
}