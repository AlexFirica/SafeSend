import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Supabase connection
const url = "https://hhxuvjiksyooedjzaabd.supabase.co"

const anon =
'sb_publishable_ukmy9hfPGZHjHcfhfFG7jw_zJznT2Ji'

const supabase = createClient(url, anon)

// LocalStorage helper
const getID = () => localStorage.getItem("id")

// CREATE USER
let public_key_string = ""; // Temporary storage for the exported string

const bufferToB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));

export async function generateProfile(email, password) {
    try {
        // 1. Generate RSA-OAEP 4096-bit keys
        const keyPair = await window.crypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 4096,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: "SHA-256",
            },
            true,
            ["encrypt", "decrypt"]
        );

        // 2. Export keys to strings (Supabase needs strings, not objects)
        const pubBuffer = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
        const privBuffer = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
        
        const publicKeyString = bufferToB64(pubBuffer);
        const privateKeyString = bufferToB64(privBuffer);

        // 3. Save Private Key to LocalStorage (Simple & Reliable for now)
        localStorage.setItem("private_key", privateKeyString);

        // 4. Get Fingerprint
        const fingerprintData = await getFingerPrint();

        // 5. Insert into Supabase
        const { data, error } = await supabase
            .from('SafeSend_User')
            .insert([{ 
                email: email, 
                password: password, 
                public_key: publicKeyString,
                private_key: privateKeyString, // Store private key in DB (for backup, not recommended for production)
            }])
            .select();

        const { data2, error2} =await supabase
            .from('SafeSend_user_logs')
            .insert([{
                user_id: data[0].id,
                log_id: crypto.randomUUID(),
                ip_address: fingerprintData.network.ip,
                isp: fingerprintData.network.isp,
                browser: fingerprintData.software.browser,
                os: fingerprintData.software.os,
                screen_resolution: fingerprintData.hardware.resolution,
                location_city: fingerprintData.network.city,
                local_hour: fingerprintData.session.hour,
                session_id: fingerprintData.session.id,
                login_time: fingerprintData.session.timestamp,
            }])
            .select();
        
        if (error) throw error;
        if (error2) throw error2;

        localStorage.setItem("id", data[0].id);
        console.log("Registration complete!");
        return { success: true };

    } catch (err) {
        console.error("Critical Signup Error:", err);
        return { success: false, error: err.message };
    }
}

// LOGIN USER
export async function login(email, password) {

    const { data, error } = await supabase
        .from('SafeSend_User')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .maybeSingle()

    if (error) {
        console.error(error)
        return false
    }

    if (!data) {
        console.log("Wrong email or password")
        return false
    }

    localStorage.setItem("id", data.id)

    console.log("Login successful")

    return true
}

async function getFingerPrint(){
    //Language, resolution, timezone,
    let width=screen.width;
    let height=screen.height;
    const language =navigator.language;
    const timezone=Intl.DateTimeFormat().resolvedOptions();
    const agent=navigator.userAgent;
    let myOS;
    let myBrowser;
    const hour = new Date().getHours();

    //Verificam ce sistem de operare foloseste
    if(agent.includes("Windows")){
        myOS="Windows";
    }
    else if(agent.includes("Android")){
        myOS="Android";
    }
    else if(agent.includes("Mac")){
        myOS="Mac";
    }
    else myOS="Linux";

    //Verificam ce browser foloseste
    if(agent.includes("Edg")){
        myBrowser="Microsoft Edge";
    }
    else if(agent.includes("Chrome")){
        myBrowser="Chrome";
    }
    else if(agent.includes("Firefox")){
        myBrowser="Firefox";
    }
    else if(agent.includes("Safari")){
        myBrowser="Safari";
    }
    else myBrowser="undefined";
    //Luam IP; NETWORK SI Orasul
    let networkData = { ip: "N/A", org: "N/A", city: "N/A" };
    try {
        const response = await fetch(`http://ip-api.com/json/`);
        if(response.ok) {
            networkData = await response.json();
        }
    } catch(error) {
        console.error("Eroare la IP API:", error.message);
    }

    // Cream un session id
    const session_id=check_session();

    console.log("--- FINGERPRINT COMPLET ---");
    console.table({
        Ecran: `${width}x${height}`,
        Limba: language,
        OS: myOS,
        Browser: myBrowser,
        Ora: hour,
        IP: networkData.query,
        ISP: networkData.org,
        Locatie: networkData.city,
        SessionID: session_id
    });
    //Returnam fingerprint-ul

    const fingerprint = {
        hardware: {
            resolution: `${screen.width}x${screen.height}`,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        software: {
            os: myOS,
            browser: myBrowser,
            userAgent: navigator.userAgent
        },
        network: {
            ip: networkData.query || "N/A",
            isp: networkData.org || "N/A",
            city: networkData.city || "N/A"
        },
        session: {
            id: check_session(),
            hour: new Date().getHours(),
            timestamp: new Date().toISOString()
        }
    };

    return fingerprint;
}