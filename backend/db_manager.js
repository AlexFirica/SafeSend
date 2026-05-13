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
                public_key: publicKeyString
            }])
            .select();

        if (error) throw error;

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

// GET USER BY ID
export async function logById(id) {

    const { data, error } = await supabase
        .from('SafeSend_User')
        .select('*')
        .eq('id', id)
        .single()

    if (error) {
        console.error(error)
        return
    }

    console.log(data)
}

// GET ALL USERS
export async function logAll() {

    const { data, error } = await supabase
        .from('SafeSend_User')
        .select('*')

    if (error) {
        console.error(error)
        return
    }

    console.log(data)
}

// TOTAL USERS
export async function getTotalUsers() {

    const { count, error } = await supabase
        .from('SafeSend_User')
        .select('*', {
            count: 'exact',
            head: true
        })

    if (error) {
        console.error(error)
        return 0
    }

    return count ?? 0
}

// GET ALL DATA
export async function getData() {

    const { data, error } = await supabase
        .from('SafeSend_User')
        .select('*')

    if (error) {
        console.error(error)
        return []
    }

    return data
}

// GET DATA BY ID
export async function getDataById(id) {

    const { data, error } = await supabase
        .from('SafeSend_User')
        .select('*')
        .eq('id', id)
        .single()

    if (error) {
        console.error(error)
        return null
    }

    return data
}