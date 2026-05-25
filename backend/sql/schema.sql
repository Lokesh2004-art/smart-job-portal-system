-- Smart Job Portal System (MySQL)

CREATE DATABASE IF NOT EXISTS smart_job_portal;
USE smart_job_portal;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seeker_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNIQUE,
  full_name VARCHAR(120),
  phone VARCHAR(30),
  location VARCHAR(120),
  skills TEXT,
  expected_salary INT,
  summary TEXT,
  resume_filename VARCHAR(255),
  CONSTRAINT fk_seeker_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recruiter_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNIQUE,
  company_name VARCHAR(150),
  company_website VARCHAR(255),
  company_location VARCHAR(120),
  about TEXT,
  CONSTRAINT fk_recruiter_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recruiter_id INT NOT NULL,
  title VARCHAR(160) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(120),
  skills_required TEXT,
  salary_min INT,
  salary_max INT,
  job_type VARCHAR(50),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  CONSTRAINT fk_job_recruiter FOREIGN KEY (recruiter_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_id INT NOT NULL,
  seeker_id INT NOT NULL,
  cover_letter TEXT,
  resume_filename VARCHAR(255),
  status VARCHAR(30) NOT NULL DEFAULT 'applied',
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_app_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  CONSTRAINT fk_app_seeker FOREIGN KEY (seeker_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT uq_job_seeker UNIQUE (job_id, seeker_id)
);
