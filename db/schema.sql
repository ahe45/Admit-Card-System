CREATE TABLE IF NOT EXISTS examinee (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  exam_date DATE NOT NULL,
  `time` VARCHAR(5) NOT NULL,
  track VARCHAR(100) NOT NULL,
  admission VARCHAR(100) NOT NULL,
  unit VARCHAR(100) NOT NULL,
  major VARCHAR(100) NOT NULL,
  building VARCHAR(100) NOT NULL,
  room VARCHAR(100) NOT NULL,
  `group` VARCHAR(30) NOT NULL DEFAULT '',
  examinee_no VARCHAR(30) NOT NULL,
  name VARCHAR(100) NOT NULL,
  birth_date DATE NOT NULL,
  photo_name VARCHAR(255) NULL,
  photo_mime VARCHAR(100) NULL,
  photo_blob MEDIUMBLOB NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_examinee_examinee_no (examinee_no),
  KEY idx_examinee_exam_date (exam_date)
);

CREATE TABLE IF NOT EXISTS print_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  examinee_no VARCHAR(30) NOT NULL,
  print_count INT NOT NULL,
  printed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_print_history_examinee_no (examinee_no),
  KEY idx_print_history_printed_at (printed_at),
  CONSTRAINT fk_print_history_examinee_no
    FOREIGN KEY (examinee_no) REFERENCES examinee (examinee_no)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS templates (
  id VARCHAR(64) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description VARCHAR(255) NOT NULL DEFAULT '',
  version_label VARCHAR(100) NOT NULL,
  status ENUM('used', 'unused') NOT NULL DEFAULT 'unused',
  content_html MEDIUMTEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS accounts (
  login_id VARCHAR(60) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  role ENUM('관리자', '운영자', '조회용') NOT NULL DEFAULT '조회용',
  password_value VARCHAR(255) NOT NULL DEFAULT '1111',
  password_temporary TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (login_id),
  KEY idx_accounts_role (role),
  KEY idx_accounts_last_login_at (last_login_at)
);

CREATE TABLE IF NOT EXISTS system_settings (
  setting_key VARCHAR(100) NOT NULL,
  setting_value VARCHAR(255) NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key)
);

INSERT IGNORE INTO system_settings (setting_key, setting_value)
VALUES
  ('initialPassword', '1111'),
  ('autoLogoutMinutes', '0');

ALTER TABLE templates
  ADD COLUMN IF NOT EXISTS description VARCHAR(255) NOT NULL DEFAULT '' AFTER name;

ALTER TABLE examinee
  ADD COLUMN IF NOT EXISTS `group` VARCHAR(30) NOT NULL DEFAULT '' AFTER room,
  ADD COLUMN IF NOT EXISTS photo_name VARCHAR(255) NULL AFTER birth_date,
  ADD COLUMN IF NOT EXISTS photo_mime VARCHAR(100) NULL AFTER photo_name,
  ADD COLUMN IF NOT EXISTS photo_blob MEDIUMBLOB NULL AFTER photo_mime;

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS display_name VARCHAR(100) NOT NULL DEFAULT '' AFTER login_id,
  ADD COLUMN IF NOT EXISTS role ENUM('관리자', '운영자', '조회용') NOT NULL DEFAULT '조회용' AFTER display_name,
  ADD COLUMN IF NOT EXISTS password_value VARCHAR(255) NOT NULL DEFAULT '1111' AFTER role,
  ADD COLUMN IF NOT EXISTS password_temporary TINYINT(1) NOT NULL DEFAULT 1 AFTER password_value,
  ADD COLUMN IF NOT EXISTS last_login_at DATETIME NULL AFTER password_temporary;
