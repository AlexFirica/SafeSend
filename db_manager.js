import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const url  = "https://hhxuvjiksyooedjzaabd.supabase.co"
const anon = 'sb_publishable_ukmy9hfPGZHjHcfhfFG7jw_zJznT2Ji'
const supabase = createClient(url, anon)

// ─── Helpers ───────────────────────────────────────────────────────────────
const bufferToB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))

function base64ToArrayBuffer(base64) {
    const binary = window.atob(base64)
    const bytes  = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes.buffer
}

function check_session() {
    let data = sessionStorage.getItem("my_id")
    if (!data) {
        data = self.crypto.randomUUID()
        sessionStorage.setItem("my_id", data)
    }
    return data
}

async function getFingerPrint() {
    const agent = navigator.userAgent
    let myOS = "Linux", myBrowser = "undefined"

    if      (agent.includes("Windows")) myOS = "Windows"
    else if (agent.includes("Android")) myOS = "Android"
    else if (agent.includes("Mac"))     myOS = "Mac"

    if      (agent.includes("Edg"))     myBrowser = "Microsoft Edge"
    else if (agent.includes("Chrome"))  myBrowser = "Chrome"
    else if (agent.includes("Firefox")) myBrowser = "Firefox"
    else if (agent.includes("Safari"))  myBrowser = "Safari"

   let networkData = { query: "127.0.0.1", org: "N/A", city: "N/A", country: "Romania" };
try {
    const response = await fetch(`http://ip-api.com/json/`);
    if (response.ok) {
        networkData = await response.json();
    }
} catch (error) {
    console.warn("IP API location lookup timed out.");
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
        country: networkData.country || "Romania" // <-- Add this tracking line
    },
    session: {
        id: check_session(),
        hour: new Date().getHours(),
        timestamp: new Date().toISOString()
    }
};
}

// ─── AUTH ──────────────────────────────────────────────────────────────────
export async function generateProfile(email, password) {
    try {
        const keyPair = await window.crypto.subtle.generateKey(
            { name: "RSA-OAEP", modulusLength: 4096,
              publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
            true, ["encrypt", "decrypt"]
        )

        const pubBuffer  = await window.crypto.subtle.exportKey("spki",  keyPair.publicKey)
        const privBuffer = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey)
        const publicKeyString  = bufferToB64(pubBuffer)
        const privateKeyString = bufferToB64(privBuffer)

        // Store private key locally — never send it anywhere sensitive
        localStorage.setItem("private_key", privateKeyString)

        const { data, error } = await supabase
            .from('SafeSend_User')
            .insert([{ email, password, public_key: publicKeyString, private_key: privateKeyString }])
            .select()

        if (error) throw error

        const newUser = data[0]
        localStorage.setItem("id", newUser.id)  // int8 stored as string in localStorage

        await saveLog(newUser.id)
        console.log("Registration complete!")
        return { success: true }

    } catch (err) {
        console.error("Signup Error:", err)
        return { success: false, error: err.message }
    }
}

export async function login(email, password) {
    const { data, error } = await supabase
        .from('SafeSend_User')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .maybeSingle()

    if (error || !data) {
        console.log("Wrong credentials or DB error")
        return false
    }

    localStorage.setItem("id", data.id)
    localStorage.setItem("private_key", data.private_key)  // reload key on login
    await saveLog(data.id)
    console.log("Login successful")
    return true
}

async function saveLog(userId) {
    try {
        const fp = await getFingerPrint()
        await supabase.from('SafeSend_user_logs').insert([{
            user_id:           userId,
            ip_address:        fp.network.ip,
            isp:               fp.network.isp,
            browser:           fp.software.browser,
            os:                fp.software.os,
            screen_resolution: fp.hardware.resolution,
            location_city:     fp.network.city,
            local_hour:        fp.session.hour,
            session_id:        fp.session.id
        }])
    } catch (err) {
        console.error("Log error:", err.message)
    }
}

// ─── RECIPIENTS ────────────────────────────────────────────────────────────
// Populates the <select id="recipientSelect"> with real users from Supabase
export async function loadRecipients() {
    const myId = localStorage.getItem("id")

    const { data, error } = await supabase
        .from('SafeSend_User')
        .select('id, email')
        .neq('id', myId)

    if (error) { console.error("loadRecipients error:", error.message); return }

    const select = document.getElementById("recipientSelect")
    select.innerHTML = '<option value="" disabled selected>Selectează Destinatar</option>'

    data.forEach(user => {
        const opt = document.createElement("option")
        opt.value       = user.id       // int8 id
        opt.textContent = user.email
        select.appendChild(opt)
    })
}

// Fetches and imports a recipient's RSA public key from Supabase
export async function getRecipientPublicKey(recipientId) {
    const { data, error } = await supabase
        .from('SafeSend_User')
        .select('public_key')
        .eq('id', recipientId)
        .single()

    if (error || !data) throw new Error("Cheie negăsită pentru: " + recipientId)

    const keyBuffer = base64ToArrayBuffer(data.public_key)
    return await window.crypto.subtle.importKey(
        "spki", keyBuffer,
        { name: "RSA-OAEP", hash: "SHA-256" },
        true, ["encrypt"]
    )
}

// ─── FILE SEND ─────────────────────────────────────────────────────────────
// Matches your actual SafeSend_Files schema:
// file_id, sender_id, receiver_id, file_path, encrypted_file_key, iv,
// ai_label, ai_risk_score, upload_date
export async function sendToSupabase(payload) {
    const senderId = localStorage.getItem("id");

    const { error } = await supabase
        .from("SafeSend_Files")
        .insert([{
            sender_id:          Number(senderId),
            receiver_id:        Number(payload.recipient),
            encrypted_file:     payload.encryptedFile,    // base64 AES-GCM ciphertext
            encrypted_file_key: payload.encryptedKey,     // RSA-wrapped AES key
            iv:                 payload.iv,
        }]);

    if (error) throw new Error("DB insert failed: " + error.message);
    console.log("✅ Encrypted file saved to Supabase!");
}

// ─── FILE RECEIVE ──────────────────────────────────────────────────────────
export async function loadReceivedFiles() {
    const myId = localStorage.getItem("id")

    const { data, error } = await supabase
        .from('SafeSend_Files')
        .select('*')
        .eq('receiver_id', Number(myId))
        .order('upload_date', { ascending: false })

    if (error) { console.error("loadReceivedFiles error:", error.message); return [] }
    return data
}

export async function decryptAndDownload(fileRecord) {
    try {
        const privateKeyB64 = localStorage.getItem("private_key");
        if (!privateKeyB64) throw new Error("Cheia privată lipsește!");

        const privateKey = await window.crypto.subtle.importKey(
            "pkcs8",
            base64ToArrayBuffer(privateKeyB64),
            { name: "RSA-OAEP", hash: "SHA-256" },
            false, ["decrypt"]
        );

        // Decrypt the AES key
        const rawAesKey = await window.crypto.subtle.decrypt(
            { name: "RSA-OAEP" },
            privateKey,
            base64ToArrayBuffer(fileRecord.encrypted_file_key)
        );

        const aesKey = await window.crypto.subtle.importKey(
            "raw", rawAesKey, { name: "AES-GCM" }, false, ["decrypt"]
        );

        // Decrypt the file — read directly from the DB record, no Storage download
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: new Uint8Array(base64ToArrayBuffer(fileRecord.iv)) },
            aesKey,
            base64ToArrayBuffer(fileRecord.encrypted_file)  // ← was: Storage download
        );

        // Trigger browser download
        const url = URL.createObjectURL(new Blob([decryptedBuffer]));
        const a   = document.createElement("a");
        a.href     = url;
        a.download = fileRecord.file_name || "decrypted_file";
        a.click();
        URL.revokeObjectURL(url);

        console.log("✅ Decriptat cu succes!");
    } catch (err) {
        console.error("❌ Decrypt error:", err);
        alert("Eroare la decriptare: " + err.message);
    }
} 
