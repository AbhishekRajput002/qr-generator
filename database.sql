-- Create database and table
CREATE DATABASE IF NOT EXISTS computer_qr_db;
USE computer_qr_db;

CREATE TABLE computers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cpu VARCHAR(255) NOT NULL,
    ram VARCHAR(255) NOT NULL,
    storage VARCHAR(255) NOT NULL,
    gpu VARCHAR(255) NOT NULL,
    os VARCHAR(255) NOT NULL,
    serial_number VARCHAR(255) UNIQUE NOT NULL,
    computer_name VARCHAR(255),
    department VARCHAR(255),
    location VARCHAR(255),
    ip_address VARCHAR(45),
    mac_address VARCHAR(17),
    purchase_date DATE,
    warranty_expiry DATE,
    notes TEXT,
    qr_data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



