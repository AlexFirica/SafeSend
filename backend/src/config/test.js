// ====================================================================
// 1. GLOBAL VARIABLES & INITIALIZATION
// ====================================================================
let db; //test.js
let public_key;
let private_key;

// Initialize IndexedDB in the browser
const request = window.indexedDB.open("SafeSendDB", 1);

request.onerror = (event) => {
    console.error("IndexedDB initialization error:", event);
};

request.onupgradeneeded = (event) => {
    const dbInstance = event.target.result;
    dbInstance.createObjectStore("keys");
};

request.onsuccess = (event) => {
    db = event.target.result;
    
    // Check for existing keys inside a readonly transaction block
    const transaction = db.transaction(["keys"], "readonly");
    const store = transaction.objectStore("keys");
    const get_request = store.get("my_private_key");
    const get_request2 = store.get("my_public_key");

    transaction.oncomplete = () => {
        if (get_request.result && get_request2.result) {
            console.log("Identity retrieved successfully from the database.");
            private_key = get_request.result;
            public_key = get_request2.result;
            Export_public_key(public_key);
        } else {
            console.log("Non-existent identity. Generating new keys...");
            generate_key();
        }
    };
};

// ====================================================================
// 2. CRYPTOGRAPHIC UTILITIES & KEY RECOVERY
// ====================================================================
function ab2str(buf) {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
}

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    
    // Process the file in chunks of 64KB to completely avoid Call Stack Limits
    const chunkSize = 65536; 
    for (let i = 0; i < len; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
}

// Ensure your base64ToArrayBuffer function is also optimized:
function base64ToArrayBuffer(base64) {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}

async function generate_key() {
    let keyPair = await window.crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 4096,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
    );

    const transaction = db.transaction(["keys"], "readwrite");
    const store = transaction.objectStore("keys");

    store.put(keyPair.privateKey, "my_private_key");
    store.put(keyPair.publicKey, "my_public_key");

    public_key = keyPair.publicKey;
    private_key = keyPair.privateKey;

    await Export_public_key(public_key);
}

async function Export_public_key(key) {
    const exported = await window.crypto.subtle.exportKey("spki", key);
    const exportedAsBase64 = window.btoa(ab2str(exported));
    const pemExported = `-----BEGIN PUBLIC KEY-----\n${exportedAsBase64}\n-----END PUBLIC KEY-----`;
    
    const exportedKeyOutput = document.querySelector(".exported-key");
    if (exportedKeyOutput) exportedKeyOutput.textContent = pemExported;
}

async function getRecipientPublicKey(id) {
    console.log("Looking for public key into Supabase for recipient: " + id);
    
    // Fetch the recipient's public key metadata profile from your database API layer
    const response = await fetch(`http://localhost:8000/get-public-key/${id}`);
    if (!response.ok) {
        throw new Error("Error: Public key not found for the specified user.");
    }

    const data = await response.json();
    const pemKey = data.public_key || data.publicKey;

    const pemBody = pemKey
        .replace("-----BEGIN PUBLIC KEY-----", "")
        .replace("-----END PUBLIC KEY-----", "")
        .replaceAll("\n", "")
        .trim();

    const keyBuffer = base64ToArrayBuffer(pemBody);

    return await window.crypto.subtle.importKey(
        "spki",
        keyBuffer,
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["encrypt"]
    );
}

function getPublicKey() {
    return public_key;
}

// ====================================================================
// 3. DIGITAL SIGNATURE & FINGERPRINT COLLECTION
// ====================================================================
function check_session() {
    let data = sessionStorage.getItem("my_id");
    if (data === null) {
        let newid = self.crypto.randomUUID();
        sessionStorage.setItem("my_id", newid);
        return newid;
    }
    return data;
}

async function getFingerPrint() {
    const agent = navigator.userAgent;
    let myOS = "Linux";
    let myBrowser = "Chrome";

    if (agent.includes("Windows")) myOS = "Windows";
    else if (agent.includes("Android")) myOS = "Android";
    else if (agent.includes("Mac")) myOS = "Mac";

    if (agent.includes("Edg")) myBrowser = "Microsoft Edge";
    else if (agent.includes("Firefox")) myBrowser = "Firefox";
    else if (agent.includes("Safari") && !agent.includes("Chrome")) myBrowser = "Safari";

    let networkData = { query: "127.0.0.1", org: "Local Provider", city: "Bucuresti", country: "Romania" };
    try {
        const response = await fetch(`http://ip-api.com/json/`);
        if (response.ok) {
            networkData = await response.json();
        }
    } catch (error) {
        console.error("Error during IP API lookup:", error.message);
    }

    return {
        hardware: {
            resolution: `${screen.width}x${screen.height}`,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        software: { os: myOS, browser: myBrowser },
        network: {
            ip: networkData.query || "127.0.0.1",
            isp: networkData.org || "N/A",
            city: networkData.city || "N/A",
            country: networkData.country || "Romania"
        },
        session: {
            id: check_session(),
            hour: new Date().getHours(),
            timestamp: new Date().toISOString()
        }
    };
}

// ====================================================================
// 4. PIPELINE FILE MANIPULATION & TRANSMISSION
// ====================================================================
async function handleFileSelection(event) {
    const currentFile = event.target.files[0];
    if (!currentFile) return;

    // Handle flexible layout IDs across DOM templates safely
    const recipientSelect = document.getElementById("recipientSelect") || document.getElementById("recipient-select");
    const recipientValue = recipientSelect?.value;

    if (!recipientValue) {
        showMessage("Error: You must select a valid recipient.", "error");
        return;
    }

    console.log("Preparing transmission pipeline for:", currentFile.name);
    showMessage("Encrypting file...", "green");

    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            // A. Fetch Destination Encryption Keys
            const recipientCryptoPublicKey = await getRecipientPublicKey(recipientValue);

            // B. Generate Symmetric Engine AES Key Parameters
            const aesKey = await window.crypto.subtle.generateKey(
                { name: "AES-GCM", length: 256 },
                true,
                ["encrypt", "decrypt"]
            );
            const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);

            // C. Encrypt the Symmetric Key with the Destination Public RSA Key
            const encryptedKeyBuffer = await window.crypto.subtle.encrypt(
                { name: "RSA-OAEP" },
                recipientCryptoPublicKey,
                rawAesKey
            );

            // D. Encrypt Raw Binary Payload File
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            const encryptedFileBuffer = await window.crypto.subtle.encrypt(
                { name: "AES-GCM", iv: iv },
                aesKey,
                e.target.result
            );

            // E. Gather Behavioral Telemetry Fingerprint Data
            const currentFingerprint = await getFingerPrint();

            // F. Pack Transport Object Package
            const payloadToTransmit = {
                recipient: recipientValue,
                fileName: currentFile.name,
                encryptedFile: arrayBufferToBase64(encryptedFileBuffer),
                encryptedKey: arrayBufferToBase64(encryptedKeyBuffer),
                iv: arrayBufferToBase64(iv),
                fingerprint: currentFingerprint
            };

            await window.sendToSupabase(payloadToTransmit);

        } catch (err) {
            console.error("Encryption pipeline failure:", err);
            showMessage("Error during cryptographic processing: " + err.message, "error");
        }
    };

    reader.readAsArrayBuffer(currentFile);
}

window.sendToSupabase = async function(payload) {
    const senderId = localStorage.getItem("id") || "1"; 
    const sessionToken = localStorage.getItem("auth_token") || "valid_sample_token";

    if (!senderId || !payload.recipient) {
        showMessage("Error: Missing required IDs (Sender or Recipient).", "error");
        return;
    }

    const backendPayload = {
        sender_id: String(senderId),
        recipient_id: String(payload.recipient),
        file_name: String(payload.fileName || "unnamed_file.txt"), 
        encrypted_file: String(payload.encryptedFile),
        encrypted_key: String(payload.encryptedKey),
        iv: String(payload.iv),
        fingerprint: {
            employee_id: String(senderId),
            
            // FIX: Map the session id from the client-side telemetry object
            session_id: String(payload.fingerprint?.session?.id || "N/A"),
            
            ip: String(payload.fingerprint.network.ip || "127.0.0.1"),
            country: String(payload.fingerprint.network.country || "Romania"),
            city: String(payload.fingerprint.network.city || "Bucuresti"),
            isp: String(payload.fingerprint.network.isp || "RDS-RCS"),
            browser: String(payload.fingerprint.software.browser || "Chrome"),
            os: String(payload.fingerprint.software.os || "Windows"),
            timezone: String(payload.fingerprint.hardware.timezone || "Europe/Bucharest"),
            screen_resolution: String(payload.fingerprint.hardware.resolution || "1920x1080"),
            
            // Force Eastern Europe/Bucharest timezone formatting (YYYY-MM-DD HH:MM)
            login_time: (() => {
                const now = new Date();
                const options = {
                    timeZone: 'Europe/Bucharest',
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                    hour12: false
                };
                
                const formatter = new Intl.DateTimeFormat('en-US', options);
                const parts = formatter.formatToParts(now).reduce((acc, part) => {
                    acc[part.type] = part.value;
                    return acc;
                }, {});
                
                return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
            })()
        }
    };

    try {
        const response = await fetch("http://127.0.0.1:8000/upload-secure-file", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": String(sessionToken)
            },
            body: JSON.stringify(backendPayload)
        });

        const result = await response.json();
        if (!response.ok) {
            showMessage("Refused by API Gateway: " + JSON.stringify(result.detail), "error");
            return;
        }
        
        console.log("Upload Success:", result);
        const aiLabel = result.labeling || result.label || result.ai_label || "Evaluat";
        showMessage("File encrypted and uploaded successfully! AI Assessment: " + aiLabel, "success");
        return result;
    } catch (error) {
        console.error("Network Engine Error:", error);
        showMessage("Network error: Backend server is offline.", "error");
    }
};

// ====================================================================
// 5. UI INTERACTION & METADATA RENDERING
// ====================================================================
const fileInput = document.getElementById("fileInput") || document.getElementById("file-upload-input");
const messageDisplay = document.getElementById("message");
const sendBtn = document.getElementById("sendBtn");

// THE BUTTON IS THE SOLE TRIGGER ENGINE NOW
if (sendBtn) {
    sendBtn.addEventListener("click", () => {
        const targetInput = fileInput || document.getElementById("fileInput") || document.getElementById("file-upload-input");
        const recipientSelect = document.getElementById("recipientSelect") || document.getElementById("recipient-select");

        if (!targetInput?.files[0]) {
            showMessage("Select a file first!", "error");
            return;
        }
        if (!recipientSelect?.value) {
            showMessage("Select a recipient!", "error");
            return;
        }
        
        // Pass to process down the pipeline only when button execution fires
        handleFileSelection({ target: targetInput });
    });
}

// FIXED: Selection only updates name display parameters, it does NOT fire execution pipeline
if (fileInput) {
    fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        const nameDisplay = document.getElementById("file-name-display");
        const currentLang = localStorage.getItem("app_lang") || "en";
        
        if (nameDisplay) {
            nameDisplay.textContent = file ? file.name : (currentLang === "ro" ? "Niciun fișier selectat" : "No file selected");
        }
        console.log("File captured in staging memory. Awaiting manual send invocation click...");
    });
}

function showMessage(message, type) {
    if (!messageDisplay) return;
    messageDisplay.textContent = message;
    messageDisplay.style.color = type === "error" ? "#ff4d4d" : "#00ffcc";
}

// Simulated Dashboard Feed Dataset 
const mockReceivedFiles = [
    { name: "Financial_raport.pdf", sender: "HR Manager", risk: "green", reason: "Verified fingerprint: Known device, common location (Iași)." },
    { name: "Update_Salary.xlsx", sender: "Accountancy", risk: "yellow", reason: "Attention: Files sent outside office hours (time 23:15)." },
    { name: "Secret Document.docx", sender: "Unknown", risk: "red", reason: "Danger: The original IP belongs to a VPN/Proxy network." }
];

function renderDashboard() {
    const grid = document.getElementById("files-grid");
    if (!grid) return;
    grid.innerHTML = "";

    mockReceivedFiles.forEach(file => {
        const card = document.createElement("div");
        card.className = `file-card ${file.risk}`;
        card.innerHTML = `
            <h4>${file.name}</h4>
            <p><small>From: ${file.sender}</small></p>
            <div class="risk-reason"><strong>AI Status:</strong> ${file.reason}</div>
            <button class="download-btn">Decrypt & Download</button>
        `;
        grid.appendChild(card);
    });
}

window.addEventListener('DOMContentLoaded', () => {
    renderDashboard();
    
    // Display Session ID in your layout sidebar framework
    const displayElement = document.getElementById("my-id-display");
    if (displayElement) {
        displayElement.textContent = check_session().substring(0, 13) + "...";
    }

    const currentBucharestTime = new Date().toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" });
    console.log("Local application timestamp zone synchronization:", currentBucharestTime);
});