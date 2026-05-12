-- 1. Tabelul Users (Stocăm identitatea utilizatorilor)
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    public_key TEXT NOT NULL, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabelul Files (Metadatele fișierelor criptate)
CREATE TABLE files (
    file_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id INT REFERENCES users(user_id),
    recipient_id INT REFERENCES users(user_id),
    file_path TEXT NOT NULL, 
    encrypted_file_key TEXT NOT NULL, 
    iv TEXT NOT NULL, -- Obligatoriu pentru decriptarea AES-GCM
    ai_label VARCHAR(10) DEFAULT 'Green', 
    ai_risk_score INT,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabelul User_logs (Sincronizat cu funcția getFingerPrint din JS)
CREATE TABLE user_logs (
    log_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    ip_address VARCHAR(45),
    isp VARCHAR(100),
    browser VARCHAR(50),
    os VARCHAR(50),
    screen_resolution VARCHAR(20),
    location_city VARCHAR(100),
    local_hour INT,
    session_id VARCHAR(100),
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);