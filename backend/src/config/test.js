//Variabilele locale:
//db=conexiunea cu baza de date din broswers
//public_key
//private_key

let db;
let public_key;
let  private_key;
//Cerem sa ne deschida baza de date din browser
const request = window.indexedDB.open("SafeSendDB",1);
request.onerror=(event)=>{
    console.error("Why didn't you allow my web app to use IndexedDB?!");
};
//Creaza un objectstore in baza de date numit keys, unde vom tine cheile
request.onupgradeneeded = (event) => {
  const db = event.target.result;

 const objectStore = db.createObjectStore("keys");
}
//Daca s-a deschis cu succes bazade date
request.onsuccess=(event)=>{
    //Facem o conexiune cu baza de date
    db=event.target.result;
    // Deschidem o transzactie de citire
    const transaction=db.transaction(["keys"],"readonly");
    const store=transaction.objectStore("keys");
//Facem request la private si public key sa vedem daca exista
    const get_request=store.get("my_private_key");
    const get_request2=store.get("my_public_key");
    //Dupa ce sa terminat tranzactia
    transaction.oncomplete=()=>{
        //Verificam daca exista keile 
        if(get_request.result && get_request2.result){
            console.log("Identitate recuperată integral din baza de date.");
            private_key = get_request.result;
            public_key = get_request2.result;
            Export_public_key(public_key);
        }
        // Daca nu generam key noi
        else {
            console.log("Identitate inexistentă. Generăm chei noi");
            generate_key();
        }
    };
};
//Transformam cheia publica din arraybuffer(biti) in string
function ab2str(buf){
    return String.fromCharCode.apply(null,new Uint8Array(buf));
}
//Trebuie sa modificam pentru baza de date:
//
//
//
//
async function getRecipientPublicKey(id) { //Functia de a primi recipient publickey
    console.log("Căutăm cheia pentru: " + id);

    const response = await fetch(`http://localhost:3000/keys/${id}`);
    if (!response.ok) {
        throw new Error("Nu am găsit cheia pentru: " + id);
    }

    const data = await response.json();
    const pemKey = data.publicKey;

    // Scoatem headerele PEM si spatiile albe
    const pemBody = pemKey
        .replace("-----BEGIN PUBLIC KEY-----", "")
        .replace("-----END PUBLIC KEY-----", "")
        .replaceAll("\n", "")
        .trim();

    // Convertim Base64 -> bytes
    const binaryKey = window.atob(pemBody);
    const keyBuffer = new Uint8Array(binaryKey.length);
    for (let i = 0; i < binaryKey.length; i++) {
        keyBuffer[i] = binaryKey.charCodeAt(i);
    }

    // Importam cheia ca obiect CryptoKey utilizabil la criptare
    const cryptoKey = await window.crypto.subtle.importKey(
        "spki",
        keyBuffer.buffer,
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["encrypt"]
    );

    return cryptoKey;
}
//Exportam cheia publica si o scriem in exporter key space
async function Export_public_key(key) {
    //Exportam keya in fortam SPKI
    const exported= await window.crypto.subtle.exportKey("spki",key);
    //Transformam keia din biti in string
    const exportedAsString=ab2str(exported);
    //Convertim stringul in BASE64(asemnator stringului)
    const exportedAsBase64= window.btoa(exportedAsString);
    //Scriem keya in PEM
  const pemExported = `-----BEGIN PUBLIC KEY-----\n${exportedAsBase64}\n-----END PUBLIC KEY-----`;
  //Scriem cheia in HTML  
  const exportedKeyOutput=document.querySelector(".exported-key");
    exportedKeyOutput.textContent = pemExported;
}

//Functia de generare a keylor
async function generate_key() {
    //Cream key in sine 
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
//Afisam ca sau creat keyile
    console.log("Obiectul KeyPair complet:", keyPair);
    console.log("Cheia Publică:", keyPair.publicKey);
    console.log("Cheia Privată:", keyPair.privateKey);
//Punem cheia privata in baza de date din browser 
const transaction=db.transaction(["keys"],"readwrite");
const store=transaction.objectStore("keys");

const save_request=store.put(keyPair.privateKey,"my_private_key");
save_request.onsuccess=()=>{
    console.log("Succes! Cheia privată a fost sigilată în IndexedDB.");
};
save_request.onerror = () => {
        console.error("Ceva a mers prost la salvare.");
    };
const save_request2=store.put(keyPair.publicKey, "my_public_key");
save_request2.onsuccess=()=>{
    console.log("Succes! Cheia privată a fost sigilată în IndexedDB.");
};
save_request2.onerror=()=>{
    console.error("Ceva a mers prost la salvare.");
}

    public_key=keyPair.publicKey;
    private_key=keyPair.privateKey;
//Exportam keya 
    await Export_public_key(public_key);
};

//Functia de creare fingerprint
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
//Functia care ne da un session id:
function check_session(){
    let data=sessionStorage.getItem("my_id");
    if(data===null){
        console.log("We are making a session id right now");
        let newid=self.crypto.randomUUID();//Genereaza un sesion id criptat
        sessionStorage.setItem("my_id",newid);
        return newid;
    }
    return data;
}


const fileInput = document.getElementById("fileInput");
const messageDisplay = document.getElementById("message");

document.getElementById("sendBtn").addEventListener("click", () => {
    if (!fileInput.files[0]) {
        showMessage("Selectează un fișier mai întâi!", "error");
        return;
    }
    if (!document.getElementById("recipientSelect").value) {
        showMessage("Selectează un destinatar!", "error");
        return;
    }
    handleFileSelection({ target: fileInput });
});

function handleFileSelection(event) {
    const file = event.target.files[0];
    document.getElementById("file-name-display").textContent = file?.name || "Niciun fișier selectat";
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
            showMessage("Succes! Fișierul a fost criptat și amprentat.", "success");

        } catch (err) {
            console.error(err);
            showMessage("Eroare la procesare!", "error");
        }
    }; // <--- Aici se închide reader.onload

    // DEFINIM ce se întâmplă în caz de eroare la citire
    reader.onerror = () => {
        showMessage("Error reading the file. Please try again.", "error");
    };

    // PORANIM citirea
    reader.readAsArrayBuffer(file);
} // <--- Aici se închide handleFileSelection


function showMessage(message, type) {
    messageDisplay.textContent = message;
    messageDisplay.style.color = type === "error" ? "red" : "green";
}

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

async function sendToBackend(payload) {
    console.log("📤 Se trimite pachetul către Colegul 2...");

    try {
        const response = await fetch("http://localhost:3000/upload", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
                // Aici Colegul 2 ar putea cere și un Token de autentificare:
                // "Authorization": "Bearer TOKEN_DE_LA_COLEGUL_2"
            },
            body: JSON.stringify(payload) 
        });

        if (response.ok) {
            const result = await response.json();
            console.log("✅ Serverul a primit fișierul:", result);
            showMessage("Fișierul a fost trimis cu succes la server!", "success");
        } else {
            throw new Error("Serverul a refuzat pachetul. Status: " + response.status);
        }
    } catch (error) {
        console.error("❌ Eroare la trimitere:", error);
        
        // MOMENTAN: Dacă nu ai serverul pornit, va da eroare. 
        // Putem simula un răspuns pozitiv pentru test:
        console.warn("⚠️ Notă: Nu am găsit serverul la localhost:3000. Verifică dacă Colegul 2 a pornit Backend-ul.");
        showMessage("Eroare de conexiune (Serverul Colegului 2 nu e pornit)", "error");
    }
}

// Funcție necesară pentru a transforma Base64 înapoi în biți
function base64ToArrayBuffer(base64) {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}
// SIMULARE
const mockReceivedFiles = [
    {
        name: "Raport_Financiar.pdf",
        sender: "Manager HR",
        risk: "green",
        reason: "Amprentă verificată: Dispozitiv cunoscut, locație obișnuită (Iași)."
    },
    {
        name: "Update_Salarii.xlsx",
        sender: "Contabilitate",
        risk: "yellow",
        reason: "Atenție: Fișier trimis din afara orelor de program (ora 23:15)."
    },
    {
        name: "Document_Secret.docx",
        sender: "Unknown",
        risk: "red",
        reason: "PERICOL: IP-ul de origine aparține unei rețele de tip VPN/Proxy."
    }
];

function renderDashboard() {
    const grid = document.getElementById("files-grid");
    grid.innerHTML = ""; // Curățăm grid-ul

    mockReceivedFiles.forEach(file => {
        const card = document.createElement("div");
        card.className = `file-card ${file.risk}`;
        
        card.innerHTML = `
            <h4>${file.name}</h4>
            <p><small>De la: ${file.sender}</small></p>
            <div class="risk-reason">
                <strong>Status AI:</strong> ${file.reason}
            </div>
            <button class="download-btn">Decriptează & Descarcă</button>
        `;
        grid.appendChild(card);
    });
}

// Apelăm funcția când se încarcă pagina
window.addEventListener('DOMContentLoaded', () => {
    renderDashboard();
    
    // Afișăm și Session ID în sidebar pentru design
    document.getElementById("my-id-display").textContent = check_session().substring(0, 13) + "...";
});


//
// Configurație pentru JWT
//
