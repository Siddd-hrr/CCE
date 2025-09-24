

-- Create DB (change name if you like)
CREATE DATABASE IF NOT EXISTS attendance_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE attendance_app;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(191) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('hod','teacher') NOT NULL DEFAULT 'teacher',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Students
CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  roll INT NOT NULL UNIQUE,
  name VARCHAR(191) NOT NULL,
  class VARCHAR(64),
  section VARCHAR(32),
  mobile VARCHAR(32),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Attendance (unique per student+date)
CREATE TABLE IF NOT EXISTS attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  date DATE NOT NULL,
  status ENUM('present','absent') NOT NULL,
  UNIQUE KEY uniq_student_date (student_id, date),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- (Optional) Make yourself HOD manually:
-- UPDATE users SET role='hod' WHERE username='your-hod-email@example.com';