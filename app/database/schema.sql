-- ============================================================
--  CampusBookingDB — MySQL Schema (Amazon RDS MySQL 8.0)
--  Run once against your RDS instance.
-- ============================================================

CREATE DATABASE IF NOT EXISTS CampusBookingDB
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE CampusBookingDB;

-- Users -------------------------------------------------------
CREATE TABLE IF NOT EXISTS Users (
    id                INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    fullName          VARCHAR(100) NOT NULL,
    email             VARCHAR(150) NOT NULL,
    password          VARCHAR(255) NOT NULL,   -- SHA-512 hex hash
    role              ENUM('Faculty','Admin') NOT NULL DEFAULT 'Faculty',
    failedAttempts    INT          NOT NULL DEFAULT 0,
    lockedUntil       DATETIME     NULL,
    passwordChangedAt DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    createdAt         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_email UNIQUE (email)
) ENGINE=InnoDB;

-- Resources ---------------------------------------------------
CREATE TABLE IF NOT EXISTS Resources (
    id        INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name      VARCHAR(100) NOT NULL,
    category  VARCHAR(50)  NOT NULL,
    capacity  INT          NOT NULL CHECK (capacity >= 1),
    status    ENUM('Active','Maintenance') NOT NULL DEFAULT 'Active',
    icon      VARCHAR(10)  NOT NULL DEFAULT '📦',
    createdAt DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Bookings ----------------------------------------------------
CREATE TABLE IF NOT EXISTS Bookings (
    id         INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    userId     INT          NOT NULL,
    resourceId INT          NOT NULL,
    startTime  DATETIME     NOT NULL,
    endTime    DATETIME     NOT NULL,
    status     ENUM('Confirmed','Cancelled') NOT NULL DEFAULT 'Confirmed',
    purpose    VARCHAR(500),
    createdAt  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_booking_user     FOREIGN KEY (userId)     REFERENCES Users(id)     ON DELETE CASCADE,
    CONSTRAINT fk_booking_resource FOREIGN KEY (resourceId) REFERENCES Resources(id) ON DELETE CASCADE,
    CONSTRAINT chk_bk_times        CHECK (endTime > startTime)
) ENGINE=InnoDB;

-- AuditLog ----------------------------------------------------
CREATE TABLE IF NOT EXISTS AuditLog (
    id        INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email     VARCHAR(150) NOT NULL,
    action    VARCHAR(50)  NOT NULL,
    status    VARCHAR(100) NOT NULL,
    ipAddress VARCHAR(45)  NULL,
    createdAt DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Overlap prevention trigger ----------------------------------
DROP TRIGGER IF EXISTS trg_PreventOverlapBookings;

DELIMITER $$
CREATE TRIGGER trg_PreventOverlapBookings
BEFORE INSERT ON Bookings
FOR EACH ROW
BEGIN
    DECLARE overlap_count INT;
    SELECT COUNT(*) INTO overlap_count
    FROM Bookings
    WHERE resourceId = NEW.resourceId
      AND status     = 'Confirmed'
      AND startTime  < NEW.endTime
      AND endTime    > NEW.startTime;
    IF overlap_count > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Booking rejected: overlapping time slot exists for this resource.';
    END IF;
END$$
DELIMITER ;

-- Seed data ---------------------------------------------------
-- Passwords are SHA-512 of the plaintext (utf8)
-- Admin@123 → SHA-512
-- Faculty@123 → SHA-512

INSERT INTO Users (fullName, email, password, role) VALUES
('Administrator', 'admin@mmu.edu.my', '$2b$12$3FmSvjCjFZUYKZpJoxgVMuyFXkXHbGPxMRMseQLBEbr7dWy90y6Ku', 'Admin'),
('Faculty User', 'faculty@mmu.edu.my', '$2b$12$TtbILmnqjZFhy/KEp.AuhuKxMTLuFlFtvjyHB9M3Sr/9VnhQ8Vkrq', 'Faculty'),
('Dr. Nava Sharma', 'nava.sharma@mmu.edu.my', '$2b$12$1qCzUoea43rguk6Y8AbhYebGlZRglxJgs6B0fSEn7d05LVX2YaPwu', 'Faculty'),
('Dr. Lee Wei Kang', 'lee.weikang@mmu.edu.my', '$2b$12$Vcigi462EXTP3dYe/npSLOdaXNXz7u6cACLloxet8I03GsRJzGl5G', 'Faculty'),
('Boo Cornie', 'cornie@student.mmu.edu.my', '$2b$12$kIqpDJU4i1hSOCohu7q7HutXUiaTo8L4QP2eOT3G3gbHY0RjQqS5.', 'Faculty'),
('Koh Yue', 'kohyue@student.mmu.edu.my', '$2b$12$qlvM9uCiFak4LK..pJg8CeYmuLCne/JQpAa9sUkUZ2kmiH1lrvnWa', 'Faculty')
ON DUPLICATE KEY UPDATE password=VALUES(password);

INSERT IGNORE INTO Resources (name, category, capacity, status, icon)
VALUES
  ('Lecture Hall A',    'Lecture Hall', 120, 'Active',      '🎓'),
  ('Computer Lab 1',    'Lab',           30, 'Active',      '💻'),
  ('Meeting Room 101',  'Meeting Room',  10, 'Active',      '🤝'),
  ('Auditorium',        'Auditorium',   300, 'Active',      '🎭'),
  ('Sports Hall',       'Sports',       200, 'Maintenance', '⚽'),
  ('Meeting Room B', 'Meeting Room', 10, 'Active', '🗂️');
