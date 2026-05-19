import * as DB from "/db_manager.js";

document.getElementById("sendBtn").addEventListener("click", sendFile);

async function sendFile(e) {
    e.preventDefault();
    
    const senderId = localStorage.getItem("id");
    const fileName = "secret.txt"; // or grab from file input
    const encryptedData = "YOUR_ENCRYPTED_BASE64_STRING";

    try {
        // FIX: Call the function via the DB import
        await DB.uploadEncryptedFile(senderId, fileName, encryptedData);
        alert("File uploaded safely!");
    } catch (error) {
        console.error("Upload failed:", error);
    }
}


function handleFileSelection(event) {
    const file = event.target.files[0];
    document.getElementById("file-name-display").textContent = file?.name || "No file selected";
    // Resetăm display-ul
    messageDisplay.textContent = "";

    if (!file) {
        showMessage("No file selected. Please choose a file.", "error");
        return;
    }

    const reader = new FileReader();

    // DEFINIM ce se întâmplă când citirea e gata
    reader.onload = async () => {
        const filebuffer = reader.result;
try {
            // 1. Criptăm fișierul cu AES
            const AES_key = await window.crypto.subtle.generateKey(
                { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]
            );
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            const encryptedContent = await window.crypto.subtle.encrypt(
                { name: "AES-GCM", iv: iv }, AES_key, filebuffer
            );

            // 2. Pregătim cheia AES pentru a fi "încuiată"
            const rawAesKey = await window.crypto.subtle.exportKey("raw", AES_key);
        
            // 3. LOGICA DE DESTINATAR (Pasul 2)
            const recipientId = document.getElementById("recipientSelect").value;
            const recipientPubKey = await getRecipientPublicKey(recipientId);

            // 4. Încuiem cheia AES cu cheia RSA a destinatarului
            const encryptedAesKey = await window.crypto.subtle.encrypt(
                { name: "RSA-OAEP" }, recipientPubKey, rawAesKey
            );

            // 5. Luăm amprenta (Pasul 1)
            const userFingerprint = await getFingerPrint(); 

            // 6. CREĂM PACHETUL FINAL
            const finalPayload = {
                recipient: recipientId,
                fileName: file.name,
                encryptedFile: arrayBufferToBase64(encryptedContent),
                encryptedKey: arrayBufferToBase64(encryptedAesKey),
                iv: arrayBufferToBase64(iv),
                fingerprint: userFingerprint
            };

            console.log("🚀 TOTUL ESTE GATA:", finalPayload);
            await sendToBackend(finalPayload);
            showMessage("Success! The file has been encrypted and fingerprinted.", "success");

        } catch (err) {
            console.error(err);
            showMessage("Processing error!", "error");
        }
    }; // <--- Aici se închide reader.onload

    // DEFINIM ce se întâmplă în caz de eroare la citire
    reader.onerror = () => {
        showMessage("Error reading the file. Please try again.", "error");
    };

    // PORANIM citirea
    /*CHEIA PENTRU DECRIPTRARE*/ 
    fileKey=arrayBufferToBase64(encryptedAesKey);
    reader.readAsArrayBuffer(file);
} // <--- Aici se închide handleFileSelection

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

let fileKey; // Variabilă globală pentru a stoca cheia AES criptată

//const cryptoKey = await DB.getRecipientPublicKey(recipientId);